/* ═══════════════════════════════════════════════════════════════════
   ayuda.js — de dónde salen los puntos del mapa de emergencia.

   POR QUÉ NO ESTÁN ESCRITOS A MANO. La regla de lugares.js es que aquí
   nadie inventa una dirección, y escribir a mano los hospitales de
   treinta y dos ciudades es inventarlas: nadie de este proyecto ha
   llamado a esos números ni ha ido a esas puertas, y en seis meses la
   mitad estarían mal sin que nos enteráramos. Un mapa de emergencia
   desactualizado es peor que ninguno.

   Así que se consultan EN VIVO a OpenStreetMap, por Overpass, y se
   dicen las dos cosas que hay que decir: de dónde salen y que nadie de
   aquí los ha comprobado. Un dato de terceros con su nombre encima es
   honesto; el mismo dato copiado a un array y presentado como propio,
   no.

   PRIVACIDAD. La consulta lleva el centro de la CIUDAD que ella eligió
   con un botón, nunca su ubicación: aunque pulse «dónde estoy», eso no
   sale del navegador. El servidor de Overpass ve una petición desde su
   IP pidiendo hospitales de, pongamos, Medellín — lo mismo que ve el
   servidor de teselas por tener el mapa abierto, y menos que cualquier
   buscador.

   SI NO HAY RED, no pasa nada raro: la sección lo dice y deja a la
   vista el 123 y los lugares que sí estén verificados.
   ═══════════════════════════════════════════════════════════════════ */

import { CAPAS } from './lugares.js';

/* Tres espejos. Overpass es gratis y ENCOLA: la consulta se ejecuta en
   milisegundos, pero la respuesta puede tardar medio minuto en llegar
   si el servidor está lleno —medido, no supuesto—. Tener a quién
   preguntar cuando el primero está a rebosar es la diferencia entre
   ocho segundos y treinta. */
const ESPEJOS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

/* 40 → 25. El presupuesto largo era para la consulta con TODAS las
   capas; ahora que la consulta pide solo lo que está encendido, 25 s
   cubre la peor ciudad con margen, y quien espera delante de la
   pantalla espera quince segundos menos antes de enterarse de que no
   hay red. */
const SEGUNDOS = 25;
const TOPE = 600;

/* Radio de búsqueda alrededor del centro. Sale del zoom con el que se
   encuadra cada ciudad, que ya lleva codificado su tamaño: Bogotá se
   mira desde 12 y pide 11 km; Mitú se mira desde 14 y con 5 km sobra.
   Pedir 11 km alrededor de Mitú no trae más hospitales, trae selva.

   Los 14 km de Bogotá se bajaron a 11 porque esa consulta se pasaba de
   los veinticinco segundos y se caía entera: más radio no sirve de nada
   si la respuesta no llega.

   Cuando el centro es ELLA y no una ciudad, el radio baja a seis
   kilómetros: lo que hace falta es lo que tiene cerca, no el censo
   sanitario del área metropolitana. */
const radioDe = (ciudad) =>
  ciudad.propia ? 6000 : ({ 12: 11000, 13: 8000, 14: 5000 }[ciudad.zoom] || 8000);

/* Las etiquetas que se piden, agrupadas por clave para que la consulta
   sea corta. Se derivan de CAPAS: si mañana alguien añade una capa en
   lugares.js con su etiqueta OSM, la consulta la incluye sola. */
/* ── LA CONSULTA PIDE LO QUE SE VE, NO EL CENSO ────────────────────
   Pedía las cuatro capas siempre, y la de centros de salud es la
   gorda: en una capital, consultorios y clínicas son varios miles de
   elementos, y esa consulta era la que moría por tiempo. La ayuda que
   no llega porque venía acompañada de todo lo demás no es ayuda.
   Ahora la consulta se arma solo con las capas ENCENDIDAS; encender
   una que falta dispara otra consulta, que llega sola porque pide
   poco. */
function consulta(ciudad, capas = CAPAS) {
  const porClave = new Map();
  for (const capa of capas) {
    for (const par of capa.osm) {
      const [k, v] = par.split('=');
      if (!porClave.has(k)) porClave.set(k, new Set());
      porClave.get(k).add(v);
    }
  }
  const [lat, lon] = ciudad.ll;
  const r = radioDe(ciudad);
  const partes = [...porClave].map(([k, vs]) =>
    `nwr["${k}"~"^(${[...vs].join('|')})$"](around:${r},${lat},${lon});`).join('\n  ');
  /* `out center` da un punto también para los que en OSM son polígonos
     —un hospital suele serlo—, así que todo llega como coordenada.

     EL TOPE ESTÁ MEDIDO. Con 400, Bogotá lo llenaba entero y se cortaba
     por donde Overpass quisiera: como la lista se ordena DESPUÉS por
     distancia, un hospital del sur podía quedar fuera mientras entraban
     doscientos consultorios del centro. Con 1000 cabe una ciudad
     grande, y si aun así se llena se dice en pantalla en vez de fingir
     que eso es todo lo que hay. */
  return `[out:json][timeout:${SEGUNDOS}];\n(\n  ${partes}\n);\nout center ${TOPE};`;
}

/* ── CLASIFICACIÓN ─────────────────────────────────────────────────
   Un elemento cae en la primera capa que reclama alguna de sus
   etiquetas, y CAPAS está ordenada por urgencia: si algo es hospital y
   además centro de salud, manda hospital. */
function capaDe(tags) {
  for (const capa of CAPAS) {
    for (const par of capa.osm) {
      const [k, v] = par.split('=');
      if (tags[k] === v) return capa.id;
    }
  }
  return null;
}

const direccionDe = (t) => [
  [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' '),
  t['addr:suburb'] || t['addr:neighbourhood'],
].filter(Boolean).join(', ');

/* «24/7» es sintaxis de OSM, no castellano. Lo demás se deja tal cual
   viene: traducir un horario a ojo es inventarlo. */
const horarioDe = (t) => {
  const h = t.opening_hours || t['service_times'] || '';
  if (/^24\/7$/.test(h.trim())) return 'Abierto 24 horas';
  return h;
};

const RADIO_TIERRA = 6371000;
const rad = (g) => g * Math.PI / 180;
export function distancia(a, b) {
  const dLat = rad(b[0] - a[0]);
  const dLon = rad(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * RADIO_TIERRA * Math.asin(Math.sqrt(s)));
}

function normalizar(elementos, ciudad) {
  const salida = [];
  for (const e of elementos) {
    const t = e.tags || {};
    const capa = capaDe(t);
    if (!capa) continue;
    const lat = e.lat ?? e.center?.lat;
    const lon = e.lon ?? e.center?.lon;
    if (lat == null || lon == null) continue;
    salida.push({
      id: `${e.type}/${e.id}`,
      capa,
      /* Sin nombre en OSM sigue siendo un punto útil —una urgencia sin
         etiquetar es una urgencia—, pero se dice que no lo tiene en vez
         de ponerle uno. */
      nombre: t.name || t['name:es'] || 'Sin nombre en el mapa',
      anonimo: !t.name && !t['name:es'],
      ll: [lat, lon],
      direccion: direccionDe(t),
      horario: horarioDe(t),
      telefono: t.phone || t['contact:phone'] || t['emergency:phone'] || '',
      urgencias: t.emergency === 'yes' || t.amenity === 'hospital',
      distancia: distancia(ciudad.ll, [lat, lon]),
      osm: `https://www.openstreetmap.org/${e.type}/${e.id}`,
    });
  }
  /* Con nombre primero y de cerca a lejos: quien mira la lista con
     prisa tiene arriba lo que puede buscar en un taxi. */
  salida.sort((a, b) => (a.anonimo - b.anonimo) || (a.distancia - b.distancia));
  return salida;
}

/* ── CACHÉ DE SESIÓN ───────────────────────────────────────────────
   Cambiar de ciudad y volver no vuelve a preguntar. Vive en
   sessionStorage —muere al cerrar la pestaña— porque una lista de
   hospitales consultados no tiene por qué sobrevivir a la visita:
   quien cierra esta página no quiere encontrársela mañana.

   LA BÚSQUEDA ALREDEDOR DE ELLA NO SE GUARDA. La clave llevaría sus
   coordenadas y eso es escribir su ubicación en el disco, aunque sea
   por diez minutos y aunque sea suyo. Se vuelve a preguntar y ya. */
/* La clave lleva las capas pedidas: la respuesta de «urgencias y
   policía» no es la de «todo», y servirla como si lo fuera dejaría
   los centros de salud invisibles para siempre en esa ciudad. */
const clave = (ciudad, firma) => `galene:ayuda:${ciudad.id}:${firma}`;

const guardado = (ciudad, firma) => {
  if (ciudad.propia) return null;
  try {
    const c = JSON.parse(sessionStorage.getItem(clave(ciudad, firma)) || 'null');
    return Array.isArray(c?.lugares) ? c.lugares : null;
  } catch { return null; }
};

const guardar = (ciudad, firma, lugares) => {
  if (ciudad.propia) return;
  try {
    sessionStorage.setItem(clave(ciudad, firma), JSON.stringify({ lugares }));
  } catch { /* sin sessionStorage se pregunta otra vez y ya está */ }
};

/**
 * Trae los puntos de atención alrededor de una ciudad.
 * @returns {Promise<{lugares: array, deCache: boolean}>}
 * @throws  {Error} si ningún espejo responde. Quien llama lo cuenta.
 */
export async function buscarAyuda(ciudad, { signal, capas } = {}) {
  const pedidas = (capas?.length ? CAPAS.filter((c) => capas.includes(c.id)) : CAPAS);
  const firma = pedidas.map((c) => c.id).sort().join('+');
  const cache = guardado(ciudad, firma);
  if (cache) return { lugares: cache, deCache: true };

  const cuerpo = 'data=' + encodeURIComponent(consulta(ciudad, pedidas));
  const cortes = [];

  const pedir = (espejo) => {
    const corte = new AbortController();
    cortes.push(corte);
    signal?.addEventListener('abort', () => corte.abort());
    const alarma = setTimeout(() => corte.abort(), SEGUNDOS * 1000);
    return fetch(espejo, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: cuerpo,
      signal: corte.signal,
      referrerPolicy: 'no-referrer',
    }).then((r) => {
      if (!r.ok) throw new Error(`Overpass ${r.status}`);
      return r.json();
    }).finally(() => clearTimeout(alarma));
  };

  /* PETICIÓN ESCALONADA, y viene de una medición: una consulta de 200 ms
     tardó veintidós segundos reales porque estaba haciendo cola. Veintidós
     segundos mirando «buscando…» a las cuatro de la mañana es una
     eternidad.

     Preguntar a los tres a la vez lo arreglaría, pero triplica la carga
     sobre un servicio que otros pagan por nosotros. Así que se pregunta
     al primero y solo se suma otro CUANDO EL ANTERIOR SE ESTÁ DEMORANDO:
     a los 2,5 s el segundo, a los 5 s el tercero. Gana el que llegue
     antes. Cuando el primero va bien —que es casi siempre— los otros ni
     se enteran, y cuando va mal no se pagan treinta segundos por ello. */
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const carrera = ESPEJOS.map((espejo, i) => (i === 0
    ? pedir(espejo)
    : espera(i * 2500).then(() => (signal?.aborted ? Promise.reject() : pedir(espejo)))));

  let datos;
  try {
    datos = await Promise.any(carrera);
  } catch (e) {
    /* Promise.any junta todos los fallos en uno. Se devuelve el primero
       con motivo, que es el que se puede contar. */
    const causa = e?.errors?.find((x) => x?.message);
    throw new Error(causa?.message || 'sin respuesta');
  } finally {
    for (const c of cortes) c.abort();   // el que perdió, que se calle
  }

  const lugares = normalizar(datos.elements || [], ciudad);
  guardar(ciudad, firma, lugares);
  /* `truncado` = Overpass devolvió justo el tope, así que casi seguro
     hay más de los que caben. Se dice en pantalla. */
  return { lugares, deCache: false, truncado: (datos.elements || []).length >= TOPE };
}
