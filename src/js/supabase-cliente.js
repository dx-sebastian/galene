/* ═══════════════════════════════════════════════════════════════════
   supabase-cliente.js — TODO LO QUE EL FORO NECESITA DE LA RED.

   Habla directo con Supabase: sin `servidor/` en medio para el foro
   (ver LEEME.md ahí para el porqué). Lo que decide qué puede hacer
   cada quien vive en `servidor/src/base/esquema-foro.sql` — RLS,
   triggers, dos vistas y una función — así que este módulo es solo el
   mensajero: junta los datos, los manda con el formato que espera la
   base, y traduce lo que vuelve al formato que ya esperan los
   componentes (`Sello.astro`, `Nodo.astro`, `Votos.astro`).

   ── LA SESIÓN, SIN CUENTA ─────────────────────────────────────────
   `signInAnonymously()` de Supabase Auth hace lo que antes hacía
   `GET /api/estado`: da un identificador opaco sin correo ni
   contraseña. La diferencia que importa es DÓNDE se guarda esa sesión.
   Por defecto el SDK usa `localStorage`, que sobrevive a cerrar la
   pestaña — y eso es exactamente lo que este sitio no puede hacer: qué
   hilos sobre sumisión química miró alguien es un dato sensible. Se
   fuerza `sessionStorage` explícitamente más abajo. Ver
   `nucleo/identidad.js` en el servidor viejo, que es donde se escribió
   esta regla la primera vez.

   ── LO QUE ESTE MÓDULO NUNCA HACE ─────────────────────────────────
   Nada por `innerHTML` — eso es cosa de quien lo llama, pero de aquí
   solo salen cadenas y objetos, nunca marcado. Y nada de leer las
   tablas `hilos`/`comentarios` en crudo: siempre las vistas
   `hilos_publico`/`comentarios_publico`, que son las únicas que no
   filtran la columna `sesion` de otra persona.
   ═══════════════════════════════════════════════════════════════════ */
import { createClient } from '@supabase/supabase-js';

const URL_SUPABASE = import.meta.env.PUBLIC_SUPABASE_URL;
const LLAVE_ANON = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const listo = typeof URL_SUPABASE === 'string' && typeof LLAVE_ANON === 'string'
  && URL_SUPABASE.length > 0 && LLAVE_ANON.length > 0;

export const supabase = listo ? createClient(URL_SUPABASE, LLAVE_ANON, {
  auth: {
    storage: typeof sessionStorage === 'undefined' ? undefined : sessionStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
}) : null;

/* Los mismos límites que tenía `config.js` en el servidor viejo. No hay
   de dónde pedirlos en tiempo real —no hay `/api/estado`—, así que
   viven aquí. Si un día cambian, cambian en los dos sitios: aquí y en
   los CHECK de `esquema-foro.sql`. */
export const limites = {
  titulo: [8, 140],
  cuerpo: [1, 4000],
  comentario: [1, 2000],
  nombre: 24,
};

/* ── «ES MÍO» SIN LEER `sesion` ────────────────────────────────────
   Las vistas públicas no exponen `sesion` (ver esquema-foro.sql: ni
   siquiera para compararla, con `security_invoker` eso exige poder
   leerla). Así que «esto lo escribí yo» no lo dice la base — lo sabe
   el propio navegador, porque el `id` lo generó él mismo al publicar.
   Vive en `sessionStorage`: muere con la pestaña, igual que el resto
   de la identidad efímera de este sitio. */
const CLAVE_MIOS = 'galene-mios';
function misIds() {
  try { return new Set(JSON.parse(sessionStorage.getItem(CLAVE_MIOS) || '[]')); }
  catch { return new Set(); }
}
function recordarMio(id) {
  const s = misIds();
  s.add(id);
  try { sessionStorage.setItem(CLAVE_MIOS, JSON.stringify([...s])); } catch { /* modo privado sin storage: solo se pierde el «borrar» */ }
}
const esMio = (id) => misIds().has(id);

let sesionLista = null;
export async function entrar() {
  if (!supabase) throw new Error('Supabase no está configurado (faltan las variables PUBLIC_SUPABASE_*).');
  if (sesionLista) return sesionLista;
  const { data: { session } } = await supabase.auth.getSession();
  if (session) { sesionLista = session; return session; }
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  sesionLista = data.session;
  return sesionLista;
}

/* ── Utilidades de bajo nivel ──────────────────────────────────────── */
function nuevoId() {
  const b = new Uint8Array(9);
  crypto.getRandomValues(b);
  let s = btoa(String.fromCharCode(...b));
  return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/* Alfabeto sin 0/O ni 1/l/I, igual que `nucleo/identidad.js`: se copia
   a mano de una pantalla a un papel sin ambigüedad. */
const ALFABETO_LLAVE = '23456789abcdefghjkmnpqrstuvwxyz';
function nuevaLlave() {
  const b = new Uint8Array(12);
  crypto.getRandomValues(b);
  let s = '';
  for (let i = 0; i < 12; i++) {
    if (i === 4 || i === 8) s += '-';
    s += ALFABETO_LLAVE[b[i] % ALFABETO_LLAVE.length];
  }
  return s;
}

/* SHA-256 con Web Crypto. Sin sal de servidor —aquí no hay ninguna que
   guardar—, y no hace falta: doce caracteres de un alfabeto de 32 son
   60 bits, muy por encima de lo que un hash sin sal necesita para
   resistir fuerza bruta. Ver la nota larga en esquema-foro.sql. */
async function hashLlave(llave) {
  const bytes = new TextEncoder().encode(llave.trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* Igual que `limpiar()`/`largo()` en `nucleo/validar.js`, pero para dar
   una respuesta rápida en el formulario — la validación de verdad la
   hacen los CHECK de la base y no se puede saltar desde aquí. */
function limpiar(v) {
  if (typeof v !== 'string') return '';
  return v.normalize('NFC').replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
export const largo = (s) => [...s].length;

const parrafos = (s) => s.split('\n\n').map((p) => p.trim()).filter(Boolean);

export function cuandoTexto(ms, ahora = Date.now()) {
  const s = Math.max(0, Math.round((ahora - ms) / 1000));
  if (s < 90) return 'hace un momento';
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return h === 1 ? 'hace 1 h' : `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return 'ayer';
  if (d < 7) return `hace ${d} días`;
  const sem = Math.round(d / 7);
  return sem === 1 ? 'hace una semana' : `hace ${sem} semanas`;
}

/* De fila de vista a lo que ya esperan los componentes de Astro:
   `Sello.astro` lee `autora.mirar` (no `mira`), `Nodo.astro` lee
   `autora.esAutora`. Se traduce aquí, una vez, en vez de tocar esos
   componentes. */
function hiloAFuera(f, ahora = Date.now()) {
  return {
    id: f.id, etiqueta: f.etiqueta,
    titulo: f.estado === 'borrado' ? '' : f.titulo,
    cuerpo: f.estado === 'borrado' ? [] : parrafos(f.cuerpo),
    autora: { nombre: f.autora, anonima: !!f.anonima, pose: f.pose, mirar: f.mira, esMia: esMio(f.id) },
    creado: f.creado, cuando: cuandoTexto(f.creado, ahora),
    minutos: Math.round((ahora - f.creado) / 60000),
    votos: f.votos, miVoto: f.miVoto || 0, respuestas: f.respuestas, estado: f.estado, ejemplo: !!f.ejemplo,
  };
}
function comentarioAFuera(f, ahora = Date.now()) {
  return {
    id: f.id, hilo: f.hilo, padre: f.padre || null,
    texto: f.estado === 'borrado' ? '' : f.texto,
    autora: { nombre: f.autora, anonima: !!f.anonima, pose: f.pose, mirar: f.mira, esMia: esMio(f.id), esAutora: !!f.es_autora },
    creado: f.creado, cuando: cuandoTexto(f.creado, ahora),
    votos: f.votos, miVoto: f.miVoto || 0, estado: f.estado, ejemplo: !!f.ejemplo, respuestas: [],
  };
}

/* ═══ LISTAR, POR CLAVE Y NO POR OFFSET ═══════════════════════════════
   Mismo esquema que tenía `dominio/foro.js`: `instantanea` fija un
   instante en la primera página, y las siguientes solo miran hilos
   anteriores a él, así que un hilo nuevo no desplaza la lista bajo el
   dedo de quien está leyendo. El cursor codifica la última clave vista
   para no repetir ni saltarse una fila empatada. */
const aCursor = (partes) => btoa(JSON.stringify(partes));
const deCursor = (s) => { try { return s ? JSON.parse(atob(s)) : null; } catch { return null; } };

/* El propio voto no viene en `hilos_publico`/`comentarios_publico` —la
   tabla `votos` no tiene el problema de `sesion` de las otras (RLS ya
   la deja en solo tus propias filas), así que se pide aparte y se
   combina aquí. Sin esto, recargar la página no perdía el voto —el
   contador ya sale bien, lo mantiene el trigger— pero sí perdía la
   flecha pulsada. */
async function conMisVotos(objeto, filas, idDe) {
  if (!filas.length) return filas;
  const { data } = await supabase.from('votos').select('cosa, dir')
    .eq('objeto', objeto).in('cosa', filas.map(idDe));
  const propios = new Map((data || []).map((v) => [v.cosa, v.dir]));
  for (const f of filas) f.miVoto = propios.get(idDe(f)) || 0;
  return filas;
}

export async function listar({ orden = 'recientes', etiqueta = '', cursor = '', instantanea, limite = 12 } = {}) {
  await entrar();
  const inst = instantanea || Date.now();
  const c = deCursor(cursor);

  let q = supabase.from('hilos_publico').select('*').lte('creado', inst);
  if (etiqueta) q = q.eq('etiqueta', etiqueta);

  if (orden === 'votados') {
    q = q.order('votos', { ascending: false }).order('creado', { ascending: false }).order('id', { ascending: false });
    if (c) q = q.or(`votos.lt.${c[0]},and(votos.eq.${c[0]},creado.lt.${c[1]}),and(votos.eq.${c[0]},creado.eq.${c[1]},id.lt.${c[2]})`);
  } else if (orden === 'solas') {
    q = q.order('respuestas', { ascending: true }).order('creado', { ascending: false }).order('id', { ascending: false });
    if (c) q = q.or(`respuestas.gt.${c[0]},and(respuestas.eq.${c[0]},creado.lt.${c[1]}),and(respuestas.eq.${c[0]},creado.eq.${c[1]},id.lt.${c[2]})`);
  } else {
    orden = 'recientes';
    q = q.order('creado', { ascending: false }).order('id', { ascending: false });
    if (c) q = q.or(`creado.lt.${c[0]},and(creado.eq.${c[0]},id.lt.${c[1]})`);
  }

  const { data, error } = await q.limit(limite + 1);
  if (error) throw error;

  const ahora = Date.now();
  const hay = data.length > limite;
  await conMisVotos('hilo', data.slice(0, limite), (f) => f.id);
  const pagina = data.slice(0, limite).map((f) => hiloAFuera(f, ahora));

  let siguiente = null;
  if (hay && pagina.length) {
    const u = data[limite - 1];
    siguiente = aCursor(orden === 'recientes' ? [u.creado, u.id]
      : orden === 'votados' ? [u.votos, u.creado, u.id] : [u.respuestas, u.creado, u.id]);
  }
  return { hilos: pagina, cursor: siguiente, instantanea: inst, orden, etiqueta: etiqueta || null };
}

export async function nuevosDesde(instantanea, etiqueta = '') {
  if (!instantanea) return 0;
  await entrar();
  let q = supabase.from('hilos_publico').select('id', { count: 'exact', head: true }).gt('creado', instantanea);
  if (etiqueta) q = q.eq('etiqueta', etiqueta);
  const { count, error } = await q;
  if (error) throw error;
  return count || 0;
}

export async function comentarios(hiloId, { cursor = '', limite = 20 } = {}) {
  await entrar();
  const c = deCursor(cursor);
  let q = supabase.from('comentarios_publico').select('*')
    .eq('hilo', hiloId).is('padre', null)
    .order('creado', { ascending: true }).order('id', { ascending: true });
  if (c) q = q.or(`creado.gt.${c[0]},and(creado.eq.${c[0]},id.gt.${c[1]})`);

  const { data: raices, error } = await q.limit(limite + 1);
  if (error) throw error;

  const ahora = Date.now();
  const hay = raices.length > limite;
  const filasRaiz = raices.slice(0, limite);
  await conMisVotos('comentario', filasRaiz, (f) => f.id);
  const pagina = filasRaiz.map((f) => comentarioAFuera(f, ahora));
  const siguiente = hay && pagina.length ? aCursor([raices[limite - 1].creado, raices[limite - 1].id]) : null;

  if (pagina.length) {
    const { data: hijas, error: e2 } = await supabase.from('comentarios_publico').select('*')
      .in('padre', pagina.map((r) => r.id)).order('creado', { ascending: true }).order('id', { ascending: true });
    if (e2) throw e2;
    await conMisVotos('comentario', hijas || [], (f) => f.id);
    const porPadre = new Map(pagina.map((r) => [r.id, r]));
    for (const h of hijas || []) porPadre.get(h.padre)?.respuestas.push(comentarioAFuera(h, ahora));
  }
  return { comentarios: pagina, cursor: siguiente };
}

/* ═══ ESCRIBIR ═════════════════════════════════════════════════════ */
function autorDatos(nombre, anonima) {
  const anon = anonima === undefined ? !nombre : !!anonima;
  const quien = anon ? 'Anónima' : (limpiar(nombre || '').slice(0, limites.nombre) || 'Anónima');
  return { autora: quien, anonima: anon ? 1 : 0 };
}

export async function crearHilo({ titulo, cuerpo, etiqueta, nombre, anonima }) {
  const sesion = await entrar();
  const id = nuevoId();
  const llave = nuevaLlave();
  const { autora, anonima: anon } = autorDatos(nombre, anonima);

  const { error } = await supabase.from('hilos').insert({
    id, etiqueta, titulo: limpiar(titulo), cuerpo: limpiar(cuerpo),
    autora, anonima: anon, sesion: sesion.user.id,
    borrado: await hashLlave(llave),
  });
  if (error) throw error;
  recordarMio(id);

  const { data, error: e2 } = await supabase.from('hilos_publico').select('*').eq('id', id).single();
  if (e2) throw e2;
  return { id, estado: data.estado, llave, hilo: data.estado === 'visible' ? hiloAFuera(data) : null };
}

export async function crearComentario({ hilo, padre, texto, nombre, anonima }) {
  const sesion = await entrar();
  const id = nuevoId();
  const llave = nuevaLlave();
  const { autora, anonima: anon } = autorDatos(nombre, anonima);

  const { error } = await supabase.from('comentarios').insert({
    id, hilo, padre: padre || null, texto: limpiar(texto),
    autora, anonima: anon, sesion: sesion.user.id,
    borrado: await hashLlave(llave),
  });
  if (error) throw error;
  recordarMio(id);

  const { data, error: e2 } = await supabase.from('comentarios_publico').select('*').eq('id', id).single();
  if (e2) throw e2;
  return { id, estado: data.estado, llave, padre: data.padre };
}

/* ═══ VOTAR ════════════════════════════════════════════════════════
   El 0 no se guarda —lo dice el CHECK de la tabla—: quitar el voto es
   borrar la fila, no escribir un cero. */
export async function votar(objeto, cosa, dir) {
  const sesion = await entrar();
  if (dir === 0) {
    const { error } = await supabase.from('votos').delete()
      .match({ objeto, cosa, sesion: sesion.user.id });
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from('votos')
    .upsert({ objeto, cosa, dir, sesion: sesion.user.id, cuando: Date.now() }, { onConflict: 'objeto,cosa,sesion' });
  if (error) throw error;
}

export async function reportar(objeto, cosa, motivo) {
  const sesion = await entrar();
  const { error } = await supabase.from('reportes').insert({
    objeto, cosa, motivo: limpiar(motivo || 'sin motivo').slice(0, 200), sesion: sesion.user.id, cuando: Date.now(),
  });
  if (error) throw error;
}

/* ═══ BORRAR ═══════════════════════════════════════════════════════
   Los dos van por RPC, no por UPDATE directo. `borrarPropio` podría
   parecer un UPDATE normal —es tu fila, RLS debería dejarlo—, pero no:
   la política necesitaría LEER `sesion` para comparar, y esa columna
   no concede SELECT a propósito (ver esquema-foro.sql). Una función
   SECURITY DEFINER no tropieza con eso — tiene acceso completo por
   dentro y decide con código, no con una política, si la sesión
   coincide. */
export async function borrarPropio(objeto, id) {
  const { data, error } = await supabase.rpc('borrar_propio', { p_objeto: objeto, p_id: id });
  if (error) throw error;
  return !!data;
}

/* La llave nunca viaja en texto plano, tampoco aquí: se manda el hash,
   igual que al publicar. `borrar_con_llave` compara hash contra hash
   dentro de la base — ver esquema-foro.sql. */
export async function borrarConLlave(objeto, id, llave) {
  const hash = await hashLlave(llave);
  const { data, error } = await supabase.rpc('borrar_con_llave', { p_objeto: objeto, p_id: id, p_hash: hash });
  if (error) throw error;
  return !!data;
}
