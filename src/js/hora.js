/* ═══════════════════════════════════════════════════════════════════
   hora.js — un solo modelo de luz continuo, manejado por el reloj
   local de quien entra. No hay "cuatro habitaciones": hay una hora,
   la de ella.

   El modelo NO interpola linealmente entre las cuatro anclas: el día
   real no cambia parejo. La noche es casi constante durante horas y
   el amanecer pasa en hora y media. Por eso hay un factor `dia` que
   cruza rápido en los crepúsculos, y dos mezclas separadas —una de
   noche, una de día— que se cruzan con él.

   Importa porque el caso que manda es las 4 a.m.: a esa hora el mundo
   tiene que ser noche, no un amanecer adelantado.
   ═══════════════════════════════════════════════════════════════════ */

const A = {
  /* La noche no es negra: es azul de tinta con una insinuación malva
     abajo. Lo que la hace fría es el valor, no la falta de color. */
  h03: { cieloAlto:'#1B2942', cieloBajo:'#453A5E', agua:'#17252F', altas:'#2F5060',
         reguero:'#CBD5E6', bruma:'#28354A', acento:'#B06A4A', elev:12, int:0.35 },
  /* Los anclas de día llevaban el agua a un turquesa que el cielo nunca
     tenía: medido, 23.6 % de saturación contra 8.6 % del cielo, y el
     cuadro se partía en dos láminas distintas. Agrisados hacia el mismo
     pigmento mineral. El cian sigue ahí; ya no grita. */
  /* El color entra por el CIELO y por el pigmento de las láminas, no
     subiendo la saturación del agua: eso volvía a partir el cuadro en
     dos. El cielo gana azul arriba y calor abajo —que es lo que hace un
     cielo de verdad— y el agua se queda mineral. */
  /* Azul cielo de verdad arriba y un rosa polvoriento abajo. El rosa
     está JUSTIFICADO: cerca del horizonte la luz atraviesa más aire y
     se enrojece. Por eso puede ser color sin volverse decoración. */
  /* LA MANANA Y LA TARDE TIENEN QUE SER DISTINTAS, o el mediodia —que es
     su punto medio— no puede ser nada. Estaban a #9CC6E4 contra #7FBAD8
     arriba y #F0DFDC contra #F2DCCE abajo: practicamente el mismo color,
     y por eso las 6, las 9 y las 12 se veian iguales.

     Ahora la manana es FRIA y limpia —el aire de la manana tiene menos
     polvo, el azul llega mas puro y el rosa bajo es todavia el del
     amanecer que se apaga— y la tarde es CALIDA y con mas bruma: la luz
     ha atravesado mas atmosfera y el bajo se va a arena. El mediodia
     queda entre las dos, que es exactamente lo que es.

     Y el rosa bajo sube de croma: a 0.08 de saturacion no se leia como
     rosa, se leia como blanco sucio, y ese rosa es lo unico que separa
     una hora de otra. */
  h09: { cieloAlto:'#8FC6EC', cieloBajo:'#F2D6CC', agua:'#5E8B98', altas:'#A8C4C8',
         reguero:'#FFF4E2', bruma:'#DEDFE2', acento:'#C4703F', elev:38, int:0.70 },
  h15: { cieloAlto:'#79B2D2', cieloBajo:'#F6D6B6', agua:'#4E7F86', altas:'#B6C2B4',
         reguero:'#E8B96A', bruma:'#E2D6C4', acento:'#B4552E', elev:52, int:1.00 },
  h21: { cieloAlto:'#161F35', cieloBajo:'#4A3A5C', agua:'#142631', altas:'#3E5F70',
         reguero:'#D3CBE8', bruma:'#2A3350', acento:'#A8664C', elev:60, int:0.50 },
};

/* PENDIENTE (sección 14): sustituir por cálculo real por latitud antes
   de mostrar la hora en pantalla. Si el sitio dice una hora, tiene que
   ser cierta. Estos valores son el promedio colombiano aproximado. */
/* El rosa vive en los crepúsculos, y por eso hay dos anclas más: sin
   ellas la transición pasaba de noche azul a día azul sin rosa por el
   medio, que es justo donde el cielo se pone rosa de verdad. */
export const AMANECER  = 5.9;
export const ATARDECER = 18.1;

/* El cruce de tinta está en luminancia relativa 0.175: ahí clara y
   oscura empatan (~4.0:1). Cruzar exactamente ahí hace que el peor
   instante del crepúsculo sea el mejor posible. */
export const CRUCE_TINTA = 0.175;

const CANALES = ['cieloAlto','cieloBajo','agua','altas','reguero','bruma','acento'];

const hex = (s) => [
  parseInt(s.slice(1, 3), 16) / 255,
  parseInt(s.slice(3, 5), 16) / 255,
  parseInt(s.slice(5, 7), 16) / 255,
];
/* Mezcla en sRGB, no en luz lineal. Son colores PINTADOS, no sumas de
   luz: mezclar en lineal hacía que un 10 % de avance hacia la mañana
   se viera como un 28 %, y adelantaba el amanecer. */
const mezcla = (a, b, t) => a.map((v, i) => v * (1 - t) + b[i] * t);
const aCss = (c) => '#' + c.map(v =>
  Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('');

const aLineal = (c) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
/** Luminancia relativa WCAG. Esta sí va en luz lineal: es una medida. */
export const luminancia = (c) =>
  0.2126 * aLineal(c[0]) + 0.7152 * aLineal(c[1]) + 0.0722 * aLineal(c[2]);

const suave  = (t) => t * t * (3 - 2 * t);
const limita = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const rampa  = (v, a, b) => suave(limita((v - a) / (b - a)));

function paleta(a, b, t) {
  const o = {};
  for (const c of CANALES) o[c] = mezcla(hex(a[c]), hex(b[c]), t);
  o.elev = a.elev * (1 - t) + b.elev * t;
  o.int  = a.int  * (1 - t) + b.int  * t;
  return o;
}

/** Estado de luz para una hora decimal (0–24). */
export function luz(horaDecimal) {
  const h = ((horaDecimal % 24) + 24) % 24;

  /* Factor día/noche. Cruza en ~1.4 h alrededor de cada crepúsculo:
     rápido, como el de verdad. Fuera de esa ventana es 0 o 1 exacto. */
  const ANCHO = 0.7;
  const dia = (h < 12)
    ? rampa(h, AMANECER - ANCHO, AMANECER + ANCHO)
    : 1 - rampa(h, ATARDECER - ANCHO, ATARDECER + ANCHO);

  // Mezcla diurna: 09:00 → 15:00, sostenida en los extremos.
  const deDia = paleta(A.h09, A.h15, rampa(h, 9, 15));

  /* Mezcla nocturna: recorre el arco del atardecer al amanecer.
     21:00 cae en 0.25 del arco y 03:00 en 0.75. */
  const largoNoche = (ATARDECER > AMANECER) ? (24 - ATARDECER + AMANECER) : 0;
  const pn = (((h - ATARDECER) + 24) % 24) / largoNoche;
  const deNoche = paleta(A.h21, A.h03, rampa(pn, 0.25, 0.75));

  const L = {};
  for (const c of CANALES) L[c] = mezcla(deNoche[c], deDia[c], dia);
  L.elev = deNoche.elev * (1 - dia) + deDia.elev * dia;
  L.int  = deNoche.int  * (1 - dia) + deDia.int  * dia;
  L.dia  = dia;

  /* La banda donde vive el texto es la parte alta del cielo. */
  const lumTexto = luminancia(L.cieloAlto) * 0.7 + luminancia(L.cieloBajo) * 0.3;
  L.lumTexto = lumTexto;
  L.tinta = lumTexto > CRUCE_TINTA ? 'oscura' : 'clara';

  /* Cerca del cruce, comprimir el degradado del cielo: el cielo real
     se aplana con luz difusa, y así ninguna tinta pierde contra los
     dos extremos del degradado. 1 = sin comprimir, 0 = plano. */
  L.compresion = rampa(Math.abs(lumTexto - CRUCE_TINTA), 0, 0.12);

  /* Posición de la luminaria. Sale por un lado y se pone por el otro.
     TODO: en el cruce exacto de dia=0.5 el disco salta de un horizonte
     al otro. Es un instante, con el disco casi tapado por la bruma.
     Se arregla dibujando sol y luna a la vez, pesados por `dia`. */
  L.diurno = dia >= 0.5;
  L.fuenteX = L.diurno
    ? limita((h - AMANECER) / (ATARDECER - AMANECER))
    : 1 - limita(pn);

  return L;
}

/** Escribe los tokens en :root y la tinta en <html>.
    Dos correcciones que se miden, no se opinan:

    1. El degradado del cielo se comprime hacia su punto medio cuando
       la luminancia se acerca al cruce. El shader ya lo hace; el
       respaldo CSS tiene que hacer lo mismo o sin WebGL el crepúsculo
       queda ilegible.
    2. Aun comprimido, en el cruce ambas tintas empatan en ~4.0:1 —
       suficiente para el título (texto grande, umbral 3:1) pero no
       para el lockup (umbral 4.5:1). Por eso sale un LAVADO detrás
       del texto, del lado contrario a la tinta, con alfa = 1−compresión.
       En acuarela un lavado es un gesto nativo, no un parche. */
export function aplicar(L, escribirLavado = true) {
  const r = document.documentElement;

  const medio = mezcla(L.cieloAlto, L.cieloBajo, 0.5);
  const k = 1 - L.compresion;
  const alto = mezcla(L.cieloAlto, medio, k);
  const bajo = mezcla(L.cieloBajo, medio, k);

  /* Cuando hay lienzo, el lavado lo calibra main.js midiendo lo que de
     verdad quedó pintado detrás del texto (la luna se pasea por ahí).
     Este valor por compresión es solo el respaldo sin WebGL. */
  if (escribirLavado) {
    r.style.setProperty('--lavado', (k * 0.30).toFixed(3));
    r.style.setProperty('--lavado-color', L.tinta === 'clara' ? '#0B141A' : '#F6F9FA');
  }
  r.style.setProperty('--cielo-alto', aCss(alto));
  r.style.setProperty('--cielo-bajo', aCss(bajo));
  r.style.setProperty('--agua',       aCss(L.agua));
  r.style.setProperty('--agua-altas', aCss(L.altas));
  r.style.setProperty('--reguero',    aCss(L.reguero));
  r.style.setProperty('--bruma',      aCss(L.bruma));
  r.style.setProperty('--acento',     aCss(L.acento));
  // La garza en vuelo vive en el DOM: se lleva a la luz de la hora
  // con brillo, no con color — la lámina ya es casi monocroma.
  r.style.setProperty('--vuelo-brillo', (0.55 + 0.5 * L.int).toFixed(3));
  /* Cuanta más luz, más aire entre el ave y quien mira: de día se lava
     más que de noche, igual que el agua lejana. */
  r.style.setProperty('--vuelo-sat', (0.34 - 0.12 * L.int).toFixed(3));
  r.style.setProperty('--vuelo-contraste', (0.80 - 0.16 * L.int).toFixed(3));
  r.style.setProperty('--vuelo-velo', (0.20 + 0.16 * L.int).toFixed(3));
  r.dataset.tinta = L.tinta;
}

export const horaAhora = () => {
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
};

/** El dato, plano, sin imperativo. El mundo no arenga: "el sol sale a
    las 5:54" es un hecho sobre el mundo, no una exigencia sobre ella.
    Y el amanecer no se actúa: si se queda, le llega de verdad. */
export function notaAmanecer(h) {
  const faltan = ((AMANECER - h) + 24) % 24;
  if (faltan > 7 || faltan < 0.02) return '';
  const hh = Math.floor(AMANECER);
  const mm = Math.round((AMANECER - hh) * 60);
  return `El sol sale a las ${hh}:${String(mm).padStart(2, '0')}.`;
}
