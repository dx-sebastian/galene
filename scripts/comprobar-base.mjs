/* ═══════════════════════════════════════════════════════════════════
   comprobar-base.mjs — ¿la base desplegada se comporta como el SQL?

       npm run base

   ── POR QUÉ EXISTE, SI YA HAY foro.spec.js ────────────────────────
   Porque `foro.spec.js` prueba EL FORO POR EL DOM, y para eso hace
   falta un navegador que alcance Supabase. Hay entornos donde no lo
   alcanza —el de estas pruebas, sin ir más lejos: `example.com` da
   `ERR_CONNECTION_RESET` desde la página y 200 desde `curl`—, y ahí
   aquellas seis pruebas se saltan.

   Esto corre en Node, que sí sale, y comprueba la otra mitad: que el
   esquema QUE ESTÁ PUESTO se comporta como el que hay escrito en
   `servidor/src/base/`. Leer el .sql del repo no dice nada sobre lo
   que alguien pegó en el editor de Supabase hace tres semanas, y esa
   diferencia ya costó un hallazgo: la base repartía perchas del 0 al
   10 cuando el manglar tiene ocho ramas.

   Verifica, además de que las cosas funcionan, que las que NO deben
   poder hacerse siguen sin poder hacerse: editar un hilo ajeno por
   UPDATE, leer la columna `sesion`.

   LIMPIA LO QUE ESCRIBE. Cada hilo y cada comentario nacen con su
   llave de borrado y se van al terminar. Si algo queda, sale por
   pantalla.

   Necesita `.env` con PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY
   — ver docs/DESPLIEGUE-COMUNIDAD.md.
   ═══════════════════════════════════════════════════════════════════ */
import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'node:crypto';

import { readFileSync, existsSync } from 'node:fs';

/* Node 22 lee `.env` con --env-file, pero eso obliga a acordarse de la
   bandera. Aquí se lee solo, y las variables del entorno mandan sobre
   el fichero por si alguien quiere apuntar a otra base sin editarlo. */
if (existsSync('.env')) {
  for (const linea of readFileSync('.env', 'utf8').split('\n')) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
const U = process.env.PUBLIC_SUPABASE_URL, K = process.env.PUBLIC_SUPABASE_ANON_KEY;
if (!U || !K) {
  console.error('Faltan PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY.\n'
    + 'Cópialas de .env.example a .env — ver docs/DESPLIEGUE-COMUNIDAD.md.');
  process.exit(2);
}
const base = createClient(U, K, { auth: { persistSession: false } });
const hash = (l) => createHash('sha256').update(l.trim().toLowerCase()).digest('hex');
const id9 = () => randomBytes(9).toString('base64url');
const ALF = '23456789abcdefghjkmnpqrstuvwxyz';
const llaveNueva = () => [...randomBytes(12)].map((b,i)=>(i===4||i===8?'-':'')+ALF[b%32]).join('');

const ok = (t) => console.log('  ok  ' + t);
const no = (t, e) => { console.log('  NO  ' + t + (e ? ' → ' + (e.message||e) : '')); fallos++; };
let fallos = 0;

const { data: sesion, error: eAuth } = await base.auth.signInAnonymously();
if (eAuth) { no('entrar sin cuenta', eAuth); process.exit(1); }
ok(`entrar sin cuenta (uid ${sesion.user.id.slice(0,8)}…)`);

/* ── 1 · publicar ─────────────────────────────────────────────────── */
const hid = id9(), llave = llaveNueva();
const marca = 'Sonda de integración ' + Date.now().toString(36);
let e = (await base.from('hilos').insert({
  id: hid, etiqueta: 'acompanar', titulo: marca,
  cuerpo: 'Escrito por una comprobación automática. Se borra al terminar.',
  autora: 'Anónima', anonima: 1, sesion: sesion.user.id, borrado: hash(llave),
})).error;
if (e) { no('publicar un hilo', e); } else ok('publicar un hilo');

const { data: fila } = await base.from('hilos_publico').select('*').eq('id', hid).maybeSingle();
if (!fila) no('el hilo aparece en hilos_publico');
else {
  ok(`el hilo sale en la vista pública · estado «${fila.estado}» · pose ${fila.pose}`);
  if (fila.sesion !== undefined) no('¡la vista expone la columna `sesion`!'); else ok('la vista NO expone `sesion`');
}

/* ── 2 · comentar ─────────────────────────────────────────────────── */
const cid = id9(), llaveC = llaveNueva();
e = (await base.from('comentarios').insert({
  id: cid, hilo: hid, padre: null, texto: 'Respuesta de la sonda.',
  autora: 'Anónima', anonima: 1, sesion: sesion.user.id, borrado: hash(llaveC),
})).error;
e ? no('contestar', e) : ok('contestar');

/* ── 3 · votar, cambiar de lado y quitar ──────────────────────────── */
const votar = (dir) => dir === 0
  ? base.from('votos').delete().match({ objeto: 'hilo', cosa: hid, sesion: sesion.user.id })
  : base.from('votos').upsert({ objeto: 'hilo', cosa: hid, dir, sesion: sesion.user.id, cuando: Date.now() },
      { onConflict: 'objeto,cosa,sesion' });
const cuenta = async () => (await base.from('hilos_publico').select('votos').eq('id', hid).maybeSingle()).data?.votos;
await votar(1);  const v1 = await cuenta();
await votar(-1); const v2 = await cuenta();
await votar(0);  const v3 = await cuenta();
(v1 === 1 && v2 === -1 && v3 === 0) ? ok(`votar suma, cambia y quita (${v1} → ${v2} → ${v3})`)
                                    : no(`votar da ${v1} → ${v2} → ${v3}, se esperaba 1 → -1 → 0`);

/* ── 4 · lo que NO se puede hacer ─────────────────────────────────── */
const { error: eUpd } = await base.from('hilos').update({ titulo: 'secuestrado' }).eq('id', hid);
const { data: dUpd } = await base.from('hilos_publico').select('titulo').eq('id', hid).maybeSingle();
(dUpd?.titulo === marca) ? ok('nadie puede editar un hilo por UPDATE directo')
                         : no('¡se pudo cambiar el título con un UPDATE!');
void eUpd;
const { data: ajeno } = await base.from('hilos').select('sesion').limit(1);
(ajeno === null || !ajeno?.length || ajeno[0].sesion === undefined)
  ? ok('la tabla `hilos` no concede leer `sesion`') : no('¡`sesion` es legible en la tabla cruda!');

/* ── 5 · la bandada, y sobre todo QUÉ PERCHA reparte ──────────────── */
const { data: g, error: eG } = await base.rpc('dejar_garza');
if (eG) no('dejar_garza()', eG);
else {
  const fila = g?.[0];
  ok(`dejar_garza() → percha ${fila?.percha}, pose ${fila?.pose}`);
  if (fila && fila.percha > 7) no(`percha ${fila.percha}: la base sigue repartiendo 0..10 y el manglar tiene 8 ramas — falta volver a pasar esquema-bandada.sql`);
  else ok('la percha cae dentro de las ocho ramas pintadas');
}
/* ── ¿ESTÁ PUESTO EL ESQUEMA DE HOY? ──────────────────────────────
   Una sola llamada a `dejar_garza()` no prueba el rango de perchas: si
   la base reparte 0..10 y toca la 4, sale verde y miente. Lo que sí es
   determinista es si existe `volar_garza()`, que se añadió en la misma
   pasada que el arreglo de las ocho ramas: si falta, la base es la de
   antes y le faltan las dos cosas.

   PostgREST contesta PGRST202 —«no encuentro la función»— cuando el
   nombre no existe. Cualquier otro error significa que existe y que
   falló por otra cosa, que ya es información distinta. */
const { error: eV } = await base.rpc('volar_garza');
if (eV && /PGRST202|Could not find the function/i.test(eV.message || '')) {
  no('falta volar_garza(): la base es anterior al 18 ago 2026 — vuelve a pasar servidor/src/base/esquema-bandada.sql');
} else if (eV) {
  no('volar_garza()', eV);
} else {
  ok('volar_garza() existe: el esquema de la bandada está al día');
}

/* Y el rango de verdad, mirando lo que hay puesto ahora mismo. Con el
   esquema viejo aparecen perchas 8, 9 o 10, que no tienen rama donde
   posarse y por eso no se pintan. */
/* Y AQUÍ SE MIRA EL ERROR, que la primera versión no miraba: se
   quedaba con `data` y trataba un fallo como «cero filas», o sea que
   daba verde cuando la vista devolvía «permission denied». Así se
   coló, verde, una vista que dejaba el manglar vacío para todo el
   mundo. Un cero y un error no son lo mismo y no se pueden leer
   igual. */
const { data: arbol, error: eArbol } = await base.from('garzas_publico').select('percha');
if (eArbol) {
  no(`leer garzas_publico`, eArbol);
} else {
  const altas = (arbol || []).map((g) => g.percha).filter((p) => p > 7);
  altas.length
    ? no(`hay garzas en perchas ${[...new Set(altas)].sort().join(', ')} y el manglar tiene ocho ramas (0..7)`)
    : ok(`las ${arbol.length} garzas del árbol están dentro de las ocho ramas`);
}

const { data: calma, error: eC } = await base.rpc('calma_actual');
eC ? no('calma_actual()', eC) : ok(`calma_actual() → ${typeof calma === 'number' ? calma.toFixed(4) : calma}`);

/* ── 6 · borrar con la llave, que es lo que limpia ────────────────── */
for (const [obj, i, l] of [['comentario', cid, llaveC], ['hilo', hid, llave]]) {
  const { data, error } = await base.rpc('borrar_con_llave', { p_objeto: obj, p_id: i, p_hash: hash(l) });
  (!error && data) ? ok(`borrar_con_llave(${obj}) — limpio`) : no(`borrar_con_llave(${obj})`, error || 'la base dijo que no');
}
console.log(fallos ? `\n  ${fallos} comprobaciones en rojo` : '\n  todo verde contra la base real');
process.exit(fallos ? 1 : 0);
