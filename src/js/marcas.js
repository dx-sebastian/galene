/* ═══════════════════════════════════════════════════════════════════
   marcas.js — los puntos que pone quien usa el sitio.

   ESTO ES LO PRIMERO QUE HAY QUE ENTENDER: aquí no hay servidor. No lo
   hay en ninguna parte de Galene y no es una limitación técnica, es la
   decisión que sostiene el resto (ver README → Privacidad). Un mapa
   colaborativo de verdad —donde alguien en Cali ve el punto de alguien
   en Cali— necesita una base de datos con ubicaciones de personas que
   acaban de sufrir una agresión sexual. Eso es exactamente el archivo
   que no queremos que exista, ni nuestro ni de nadie, porque se filtra,
   se subpoena o se compra.

   Así que las marcas viven en el aparato de quien las pone:

     · MAPA DE LUZ — «dónde voy a estar hoy». Se guarda en este
       teléfono y se COMPARTE A MANO con quien ella elija: el botón de
       compartir arma un enlace que lleva los puntos dentro, y quien lo
       abre los ve en su mapa. Ese enlace va por WhatsApp, por Signal o
       por donde ella quiera; no pasa por aquí.

     · MAPA DE SOMBRA — «aquí pasó algo». Igual, y con más razón: un
       registro público de sitios señalados, con fecha y hora, es una
       pista para quien quiera saber quién lo escribió.

   Lo que se gana con esto es lo único que importa: si mañana alguien
   —una fiscalía, un agresor con dinero, un servidor comprometido— va a
   buscar este dato, no hay dato que buscar.

   CADUCIDAD, y por eso existe: un punto de luz que sigue puesto tres
   semanas después no dice «estoy aquí», dice «suelo estar aquí», que es
   justo lo que no se le cuenta a nadie. Los de luz mueren al final del
   día; los de sombra duran, pero también mueren.
   ═══════════════════════════════════════════════════════════════════ */

const CLAVE = 'galene:marcas';
const VERSION = 1;

/* Cuánto vive una marca si quien la pone no dice otra cosa. La de luz
   se mide en horas porque su unidad natural es «esta noche». */
export const HORAS_LUZ = [
  { id: 2,  nombre: '2 horas' },
  { id: 6,  nombre: '6 horas' },
  { id: 12, nombre: 'Hasta mañana' },
];
export const DIAS_SOMBRA = 90;

const HORA = 3600e3;

/* localStorage no siempre está. En navegación privada de algunos
   navegadores lanza al escribir, y hay quien lo tiene bloqueado
   entero. Eso NO puede romper el mapa: sin almacenamiento, el sitio
   sigue funcionando y las marcas duran lo que dure la pestaña. */
let deMemoria = [];
export const persiste = (() => {
  try {
    const t = '__galene__';
    localStorage.setItem(t, '1');
    localStorage.removeItem(t);
    return true;
  } catch { return false; }
})();

const ahora = () => Date.now();

const leer = () => {
  if (!persiste) return deMemoria;
  try {
    const cru = JSON.parse(localStorage.getItem(CLAVE) || '{}');
    return Array.isArray(cru.marcas) ? cru.marcas : [];
  } catch { return []; }
};

const escribir = (marcas) => {
  if (!persiste) { deMemoria = marcas; return; }
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ v: VERSION, marcas }));
  } catch { /* cuota llena o bloqueado: la sesión sigue en memoria */ }
};

/** Tira lo caducado. Se llama en cada lectura: nadie tiene que acordarse. */
export function purgar() {
  const t = ahora();
  const vivas = leer().filter((m) => !m.caduca || m.caduca > t);
  escribir(vivas);
  return vivas;
}

export const todas = () => purgar();
export const listar = (modo) => purgar().filter((m) => m.modo === modo);

const id = () =>
  (crypto.randomUUID?.() || `m${ahora().toString(36)}${Math.random().toString(36).slice(2, 8)}`);

/** Fin del día local, que es lo que significa «hasta mañana». */
export function finDelDia() {
  const d = new Date();
  d.setHours(23, 59, 0, 0);
  return d.getTime();
}

export function guardar({ modo, tipo, ll, nota = '', ciudad = null, horas = null }) {
  const caduca = modo === 'sombra'
    ? ahora() + DIAS_SOMBRA * 24 * HORA
    : (horas === 12 ? finDelDia() : ahora() + (horas || 6) * HORA);

  const marca = {
    id: id(), modo, tipo, ciudad,
    /* Cinco decimales ≈ un metro. Más precisión no ayuda a nadie a
       encontrar una puerta y sí ayuda a señalar una cama. */
    ll: [Number(ll[0].toFixed(5)), Number(ll[1].toFixed(5))],
    nota: String(nota || '').slice(0, 140).trim(),
    creado: ahora(),
    caduca,
  };
  escribir([...purgar(), marca]);
  return marca;
}

export function borrar(idMarca) {
  escribir(purgar().filter((m) => m.id !== idMarca));
}

export function limpiar(modo = null) {
  escribir(modo ? purgar().filter((m) => m.modo !== modo) : []);
}

/* Guarda una marca que llegó de fuera sin duplicar la que ya estaba.
   Dos personas compartiendo el mismo enlace dos veces no tienen por
   qué acabar con el mapa doblado. */
export function adoptar(marcas) {
  const vivas = purgar();
  const clave = (m) => `${m.modo}|${m.tipo}|${m.ll[0]}|${m.ll[1]}|${m.nota}`;
  const vistas = new Set(vivas.map(clave));
  const nuevas = marcas
    .filter((m) => !vistas.has(clave(m)))
    .map((m) => ({ ...m, id: id(), ajena: true }));
  escribir([...vivas, ...nuevas]);
  return nuevas.length;
}

/* ── EL ENLACE ─────────────────────────────────────────────────────
   Los puntos viajan DENTRO del enlace, en el fragmento (#), que es la
   única parte de una URL que el navegador no manda al servidor. Aunque
   este sitio se sirva desde GitHub Pages, GitHub no ve lo que hay
   detrás de la almohadilla. Se comparte por donde ella decida.

   Formato compacto —una lista de listas, no objetos con nombres— para
   que el enlace quepa en un mensaje y no dé miedo al pegarlo. */
const aB64 = (s) => {
  const b = new TextEncoder().encode(s);
  let bin = '';
  for (const x of b) bin += String.fromCharCode(x);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const deB64 = (s) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - b64.length % 4) % 4));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export function aTexto(marcas) {
  const compacto = marcas.map((m) =>
    [m.modo === 'sombra' ? 's' : 'l', m.tipo, m.ll[0], m.ll[1], m.nota || '', Math.round(m.caduca / 60000)]);
  return aB64(JSON.stringify(compacto));
}

export function deTexto(texto) {
  try {
    const crudo = JSON.parse(deB64(texto));
    if (!Array.isArray(crudo)) return [];
    const t = ahora();
    return crudo
      .map(([mo, tipo, lat, lng, nota, caduca]) => ({
        modo: mo === 's' ? 'sombra' : 'luz',
        tipo: String(tipo || ''),
        ll: [Number(lat), Number(lng)],
        nota: String(nota || '').slice(0, 140),
        creado: t,
        caduca: Number(caduca) * 60000,
      }))
      /* Nada que no sea un punto en la Tierra y nada ya vencido: un
         enlace viejo reenviado por error no revive puntos muertos. */
      .filter((m) => Number.isFinite(m.ll[0]) && Number.isFinite(m.ll[1])
        && Math.abs(m.ll[0]) <= 90 && Math.abs(m.ll[1]) <= 180
        && m.caduca > t);
  } catch { return []; }
}

/** Los puntos que trae la URL con la que se abrió la página, si trae. */
export function delEnlace() {
  const m = /[#&]marcas=([A-Za-z0-9\-_]+)/.exec(location.hash);
  return m ? deTexto(m[1]) : [];
}

/** Quita el fragmento sin recargar ni dejar entrada nueva en el historial. */
export function olvidarEnlace() {
  if (!/marcas=/.test(location.hash)) return;
  history.replaceState(null, '', location.pathname + location.search + '#mapa');
}

export function enlaceCon(marcas) {
  const base = location.origin + location.pathname;
  return `${base}#mapa&marcas=${aTexto(marcas)}`;
}
