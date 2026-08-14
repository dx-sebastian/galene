/* ═══════════════════════════════════════════════════════════════════
   foro.js — LO QUE SE ESCRIBE EN LA COMUNIDAD.

   ── LO QUE ESTE ARCHIVO CAMBIA, Y LO QUE NO ───────────────────────
   Hasta ahora el compositor estaba APAGADO y lo decía: «no hay
   servidor, así que no hay dónde guardar un mensaje». Era verdad y
   sigue siéndolo. Lo que cambia es que ya no es una razón para que el
   botón no haga nada: un hilo puede existir de verdad sin salir del
   aparato de quien lo escribe.

   Así que aquí un hilo se publica, se responde, se vota y se borra. Lo
   que NO hace —y hay que leerlo antes de tocar nada— es viajar:

     · Se guarda en `sessionStorage`, o sea que MUERE AL CERRAR LA
       PESTAÑA. No en `localStorage`. Lo que alguien escribe sobre lo
       que le pasó después de una agresión es dato sensible aunque
       hable de una ventanilla, y el README lo dice sin matices: este
       proyecto eligió no guardarlo. Sobrevivir a una recarga y a ir y
       volver de la portada es todo lo que hace falta para que un foro
       se use; sobrevivir a cerrar es empezar un archivo.

     · Se difunde por `BroadcastChannel`, o sea a LAS OTRAS PESTAÑAS DE
       ESTE MISMO NAVEGADOR y a ninguna parte más. No hay red. Lo que se
       escribe aparece en la otra ventana porque las dos son el mismo
       aparato, no porque haya un servidor en medio.

   Eso es lo que el panel de escribir dice en pantalla, con esas
   palabras. Un foro que promete alcance y no lo tiene sería peor que el
   botón apagado que había antes.

   ── Y LO QUE SIGUE SIN GUARDARSE: LOS VOTOS ───────────────────────
   Están en memoria y se van al recargar, exactamente como estaban. La
   razón está escrita en js/comunidad.js y no ha cambiado con esto: qué
   hilos sobre sumisión química votó alguien es un dato más delicado que
   el propio texto, porque es un mapa de intereses sin necesidad de
   leer nada. Escribir es un acto; votar es un rastro.
   ═══════════════════════════════════════════════════════════════════ */

import { ETIQUETAS, POSES } from '../datos/comunidad.js';
/* Los límites y los nombres viven en `datos/` y no aquí: el componente
   de Astro los importa desde su frontmatter, o sea desde Node al
   compilar, y este archivo abre un canal y toca `sessionStorage` al
   evaluarse. Ver la cabecera de datos/foro.js. */
import { LIMITES, NOMBRES, ANONIMA } from '../datos/foro.js';
export { LIMITES, NOMBRES };

const CLAVE = 'galene:foro';
const CANAL = 'galene:foro';
const VERSION = 1;

let deMemoria = { hilos: [] };
const guarda = (() => {
  try {
    const t = '__galene__';
    sessionStorage.setItem(t, '1');
    sessionStorage.removeItem(t);
    return true;
  } catch { return false; }
})();

function leer() {
  if (!guarda) return deMemoria;
  try {
    const c = JSON.parse(sessionStorage.getItem(CLAVE) || 'null');
    return c && Array.isArray(c.hilos) ? c : { hilos: [] };
  } catch { return { hilos: [] }; }
}

function escribir(estado) {
  deMemoria = estado;
  if (!guarda) return;
  try { sessionStorage.setItem(CLAVE, JSON.stringify({ v: VERSION, ...estado })); }
  catch { /* cuota o bloqueo: la sesión sigue en memoria */ }
}

const id = () =>
  (crypto.randomUUID?.() || 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8));

/* ── EL RELOJ ──────────────────────────────────────────────────────
   Los hilos de ejemplo llevan su tiempo escrito a mano («hace 3 h»)
   porque el sitio es estático y una fecha real se pudriría en el HTML
   generado. Los que se escriben AHORA sí tienen un instante, así que su
   «cuando» se calcula — y se recalcula al pintar, para que un hilo de
   hace un minuto no siga diciendo «ahora mismo» media hora después. */
export function cuandoDe(creado) {
  const min = Math.max(0, Math.round((Date.now() - creado) / 60000));
  if (min < 1) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`;
}
export const minutosDe = (creado) => Math.max(0, Math.round((Date.now() - creado) / 60000));

/* La pose de la garza que hace de sello, determinista a partir del
   nombre igual que en Sello.astro: la misma persona lleva siempre la
   misma garza dentro de una sesión. */
const poseDe = (nombre) => {
  const s = [...(nombre || 'Anónima')].reduce((n, ch) => n + ch.codePointAt(0), 0);
  return POSES[s % POSES.length];
};

const recorta = (s, max) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/** Valida sin publicar. Devuelve `null` si está bien, o el motivo. */
export function revisarHilo({ titulo, cuerpo }) {
  const t = recorta(titulo, LIMITES.titulo.max + 1);
  const c = String(cuerpo ?? '').trim();
  if (t.length < LIMITES.titulo.min) return 'Al hilo le falta un título. Con unas pocas palabras basta.';
  if (c.length < LIMITES.cuerpo.min) return 'Escribe un poco más para que alguien pueda contestarte.';
  if (c.length > LIMITES.cuerpo.max) return `Son ${c.length} caracteres y caben ${LIMITES.cuerpo.max}.`;
  return null;
}

export function revisarRespuesta(texto) {
  const t = String(texto ?? '').trim();
  if (t.length < LIMITES.respuesta.min) return 'Escribe algo antes de enviarlo.';
  if (t.length > LIMITES.respuesta.max) return `Son ${t.length} caracteres y caben ${LIMITES.respuesta.max}.`;
  return null;
}

const autoraDe = (anonima, nombre) => {
  const n = anonima ? ANONIMA : (NOMBRES.includes(nombre) ? nombre : NOMBRES[0]);
  return { nombre: n, anonima: Boolean(anonima), pose: poseDe(n), mirar: 1 };
};

/** Todos los hilos escritos en esta sesión, el más nuevo primero. */
export const hilos = () => leer().hilos;

/** Un hilo por su id, o `null`. */
export const hiloDe = (idHilo) => leer().hilos.find((h) => h.id === idHilo) || null;

export function publicar({ titulo, cuerpo, etiqueta, anonima = true, nombre = null }) {
  const motivo = revisarHilo({ titulo, cuerpo });
  if (motivo) return { error: motivo };

  const hilo = {
    id: id(),
    /* `mio` es lo que permite borrar sin cuentas ni sesión: en este
       aparato, lo escrito aquí es de quien lo escribió. Los hilos que
       llegan de otra pestaña llegan con `mio: false` y por eso no
       enseñan el botón de borrar. */
    mio: true,
    etiqueta: ETIQUETAS.some((e) => e.id === etiqueta) ? etiqueta : ETIQUETAS[0].id,
    autora: autoraDe(anonima, nombre),
    creado: Date.now(),
    votos: 0,
    titulo: recorta(titulo, LIMITES.titulo.max),
    /* El cuerpo se parte en párrafos por línea en blanco, como los de
       ejemplo: es una lista de párrafos, no un bloque con saltos. */
    cuerpo: String(cuerpo).trim().split(/\n\s*\n/).map((p) => recorta(p, LIMITES.cuerpo.max)).filter(Boolean),
    comentarios: [],
  };

  const estado = leer();
  estado.hilos = [hilo, ...estado.hilos];
  escribir(estado);
  difundir({ t: 'hilo', hilo: { ...hilo, mio: false } });
  avisar();
  return { hilo };
}

export function responder(idHilo, { texto, anonima = true, nombre = null }) {
  const motivo = revisarRespuesta(texto);
  if (motivo) return { error: motivo };

  const estado = leer();
  const hilo = estado.hilos.find((h) => h.id === idHilo);
  if (!hilo) return { error: 'Ese hilo ya no está.' };

  const c = {
    id: id(), mio: true,
    autora: autoraDe(anonima, nombre),
    creado: Date.now(),
    votos: 0,
    texto: recorta(texto, LIMITES.respuesta.max),
    respuestas: [],
  };
  /* Quien abrió el hilo lleva su única insignia cuando vuelve a hablar
     dentro de él. Es información, no premio — ver Nodo.astro. */
  if (!c.autora.anonima && c.autora.nombre === hilo.autora.nombre) c.autora.esAutora = true;

  hilo.comentarios = [...(hilo.comentarios || []), c];
  escribir(estado);
  difundir({ t: 'respuesta', idHilo, c: { ...c, mio: false } });
  avisar();
  return { comentario: c, hilo };
}

export function borrar(idHilo) {
  const estado = leer();
  const hilo = estado.hilos.find((h) => h.id === idHilo);
  /* Solo lo propio, y no por permisos —aquí no hay cuentas— sino porque
     un hilo que llegó de otra pestaña no es de esta: borrarlo desde
     aquí no lo borraría allí y las dos ventanas dejarían de contar lo
     mismo. */
  if (!hilo || !hilo.mio) return false;
  estado.hilos = estado.hilos.filter((h) => h.id !== idHilo);
  escribir(estado);
  difundir({ t: 'borrado', idHilo });
  avisar();
  return true;
}

/** Tira todo lo escrito en esta sesión. El control está en la página. */
export function vaciar() {
  const estado = leer();
  const mios = estado.hilos.filter((h) => h.mio).map((h) => h.id);
  estado.hilos = estado.hilos.filter((h) => !h.mio);
  escribir(estado);
  for (const idHilo of mios) difundir({ t: 'borrado', idHilo });
  avisar();
  return mios.length;
}

/* ── LA DIFUSIÓN ───────────────────────────────────────────────────
   El mismo mecanismo que la presencia de las garzas y con la misma
   frontera: mismo origen, mismo navegador, nada en disco. Lo que llega
   de otra pestaña se guarda con `mio: false`, así que se lee y se
   contesta pero no se borra desde aquí. */
let canal = null;
const oyentes = new Set();
export function alCambiar(fn) { oyentes.add(fn); return () => oyentes.delete(fn); }
const avisar = () => { for (const fn of oyentes) fn(hilos()); };

function difundir(m) {
  if (!canal) return;
  try { canal.postMessage(m); } catch { /* canal cerrado */ }
}

/* ── EL SALUDO, QUE NO ES UN ADORNO ────────────────────────────────
   `sessionStorage` es POR PESTAÑA: una ventana recién abierta empieza
   con el almacén vacío, y los mensajes que se difundieron antes de que
   existiera no los oyó nadie. Sin esto, abrir Galene en una segunda
   ventana enseñaba los diez hilos de ejemplo y ni uno de los escritos —
   que es exactamente el fallo que hace que alguien piense que lo suyo
   no se publicó.

   Al arrancar se pregunta, y quien tenga hilos contesta con los suyos.
   Es una sincronización de dos mensajes, sin servidor y sin estado
   compartido: cada pestaña sigue siendo dueña de su copia. */
function saludar() {
  difundir({ t: 'hola' });
}

function adoptar(lista) {
  if (!Array.isArray(lista) || !lista.length) return false;
  const estado = leer();
  const vistos = new Set(estado.hilos.map((h) => h.id));
  const nuevos = lista
    .filter((h) => h && typeof h.id === 'string' && !vistos.has(h.id))
    .map((h) => ({ ...h, mio: false }));
  if (!nuevos.length) return false;
  /* Los de fuera van DESPUÉS de los propios: el orden de la lista es
     «lo mío primero» solo hasta que alguien ordene, y `data-minutos`
     manda a partir de ahí. */
  estado.hilos = [...estado.hilos, ...nuevos];
  escribir(estado);
  return true;
}

try {
  if (typeof BroadcastChannel !== 'undefined') {
    canal = new BroadcastChannel(CANAL);
    canal.onmessage = (e) => {
      const m = e.data;
      if (!m || typeof m !== 'object') return;
      const estado = leer();

      if (m.t === 'hola') {
        /* Contesta solo quien tenga algo que contar, y manda TODO lo que
           ve —lo propio y lo que adoptó— para que una tercera ventana no
           dependa de que siga abierta la que lo escribió. */
        if (estado.hilos.length) {
          difundir({ t: 'estado', hilos: estado.hilos.map((h) => ({ ...h, mio: false })) });
        }
        return;
      }
      if (m.t === 'estado') {
        if (adoptar(m.hilos)) avisar();
        return;
      }

      if (m.t === 'hilo' && m.hilo && typeof m.hilo.id === 'string') {
        if (estado.hilos.some((h) => h.id === m.hilo.id)) return;
        estado.hilos = [{ ...m.hilo, mio: false }, ...estado.hilos];
      } else if (m.t === 'respuesta' && m.c) {
        const h = estado.hilos.find((x) => x.id === m.idHilo);
        if (!h || (h.comentarios || []).some((c) => c.id === m.c.id)) return;
        h.comentarios = [...(h.comentarios || []), { ...m.c, mio: false }];
      } else if (m.t === 'borrado') {
        if (!estado.hilos.some((h) => h.id === m.idHilo)) return;
        estado.hilos = estado.hilos.filter((h) => h.id !== m.idHilo);
      } else return;

      escribir(estado);
      avisar();
    };
    saludar();
  }
} catch { /* sin canal, el foro funciona igual dentro de su pestaña */ }

/* Asidero para las pruebas E2E, que corren contra el sitio compilado.
   No expone nada que no esté ya en pantalla. */
window.__foro = { hilos, publicar, responder, borrar, vaciar, revisarHilo, cuandoDe, saludar };
