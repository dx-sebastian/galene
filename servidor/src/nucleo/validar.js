/* ═══════════════════════════════════════════════════════════════════
   validar.js — LO QUE ENTRA, Y CÓMO SE MIRA.

   Dos trabajos distintos y no hay que confundirlos:

   1 · VALIDAR es decir que no. Longitudes, formatos, valores de una
       lista cerrada. Lo que no pasa, no entra, y se contesta por qué.

   2 · SANEAR es limpiar lo que sí entra: espacios de más, saltos de
       línea de más, caracteres de control, marcas de dirección de texto.
       Lo que NO se hace aquí es escapar HTML. El servidor guarda TEXTO
       PLANO y devuelve TEXTO PLANO; escaparlo al guardar produce
       «&amp;amp;» en cuanto alguien escribe «&», y encima convierte la
       base en algo que solo se puede leer desde un navegador.

       LA FRONTERA ESTÁ EN EL CLIENTE: lo que devuelve esta API va a
       `textContent`, o a una plantilla de Astro (que escapa sola), o a
       React. NUNCA a `innerHTML`. Está escrito aquí y está escrito en el
       prompt del frontend, porque es la única línea de este sistema
       cuyo incumplimiento es una inyección de scripts.
   ═══════════════════════════════════════════════════════════════════ */

import { config } from '../config.js';

export class Alto extends Error {
  constructor(codigo, mensaje, campo) {
    super(mensaje);
    this.codigo = codigo;          // 400, 403, 404, 409, 413, 422, 429
    this.campo = campo;
    this.publico = true;           // se le puede enseñar a quien llamó
  }
}
export const alto = (codigo, mensaje, campo) => { throw new Alto(codigo, mensaje, campo); };

/* Caracteres de control y marcas de dirección de texto. Las segundas no
   son una manía: U+202E le da la vuelta a lo que se lee después, así que
   un título puede parecer una cosa y ser otra.

   Los rangos van en DECIMAL y la clase se compone al cargar, en vez de
   escribir los caracteres dentro de la expresión: un fichero fuente con
   caracteres invisibles dentro es un fichero que cualquier editor,
   formateador o copia-pega puede romper sin que se vea el cambio en el
   diff. Aquí lo que se lee es la lista de rangos. */
const RANGOS_BASURA = [
  [0, 8], [11, 12], [14, 31],        // control C0 — sobreviven tab (9) y salto (10)
  [127, 159],                        // DEL y control C1
  [8203, 8207],                      // ancho cero y marcas de direccion
  [8234, 8238], [8294, 8297],        // anulacion y aislamiento bidi
  [65279, 65279],                    // BOM en mitad del texto
];
const BASURA = new RegExp(
  "[" + RANGOS_BASURA.map(([a, b]) =>
    String.fromCodePoint(a) + (b > a ? "-" + String.fromCodePoint(b) : "")).join("") + "]", "g");

export function limpiar(v) {
  if (typeof v !== 'string') return '';
  return v
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(BASURA, '')
    .replace(/[ \t]+\n/g, '\n')        // espacios colgando del final de línea
    .replace(/\n{3,}/g, '\n\n')        // tres saltos son dos: un párrafo es un párrafo
    .trim();
}

/* La longitud se mide en PUNTOS DE CÓDIGO, no en unidades UTF-16: un
   emoji cuenta uno, no dos, y con `.length` un texto de emojis se
   rechazaría a la mitad de lo que se ve en pantalla. */
export const largo = (s) => [...s].length;

export function texto(v, min, max, campo) {
  const s = limpiar(v);
  const n = largo(s);
  if (n < min) alto(422, min === 1 ? `«${campo}» no puede ir vacío.` : `«${campo}» necesita al menos ${min} caracteres.`, campo);
  if (n > max) alto(422, `«${campo}» no puede pasar de ${max} caracteres (van ${n}).`, campo);
  return s;
}

export function unaLinea(v, max, campo) {
  const s = limpiar(v).replace(/\s+/g, ' ');
  if (largo(s) > max) alto(422, `«${campo}» no puede pasar de ${max} caracteres.`, campo);
  return s;
}

export function deLista(v, lista, campo) {
  if (!lista.includes(v)) alto(422, `«${campo}» tiene que ser una de: ${lista.join(', ')}.`, campo);
  return v;
}

export function entero(v, min, max, porDefecto) {
  const n = Number(v);
  if (!Number.isFinite(n)) return porDefecto;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

/* El color del pico. `#rrggbb` y nada más: ni `rgb()`, ni nombres, ni
   `hsl()`, ni cuatro dígitos con alfa. Un pico translúcido no se pinta,
   se pierde, y un color que el servidor no sabe leer no se puede medir
   contra el fondo el día que haya que medirlo. */
export function color(v, campo = 'color') {
  if (typeof v !== 'string') alto(422, 'El color va como «#rrggbb».', campo);
  const s = v.trim().toLowerCase();
  const corto = /^#([0-9a-f]{3})$/.exec(s);
  if (corto) return '#' + [...corto[1]].map((c) => c + c).join('');
  if (!/^#[0-9a-f]{6}$/.test(s)) alto(422, 'El color va como «#rrggbb».', campo);
  return s;
}

/* ═══════════════════════════════════════════════════════════════════
   LAS SEÑALES DE REVISIÓN

   No son un filtro de spam genérico: son LAS REGLAS DEL PROYECTO
   escritas como código. Lo que aquí puede hacer daño no es un anuncio
   de zapatillas, es un dato clínico inventado con la tipografía del
   sitio detrás.

   Nada de esto BORRA. Manda a la cola, y quien lo escribió lo sigue
   viendo con su aviso —«esperando revisión», no «desaparecido»—, que es
   la diferencia entre moderar y hacer sentir a alguien que se le calló.
   ═══════════════════════════════════════════════════════════════════ */

const ENLACE = /\bhttps?:\/\/|\bwww\.[a-z]/gi;

/* Siete u ocho dígitos seguidos, con o sin separadores, es un teléfono
   en Colombia. Un número de línea de atención escrito de memoria en un
   comentario es exactamente el fallo que el sitio lleva un mes evitando
   en su propia portada: un teléfono sin verificar en el peor momento. */
const TELEFONO = /(?:\+?\d[\s.-]?){7,}/;

/* «tienes 72 horas», «hasta 5 días para», «el plazo es de…». El aviso
   del propio repo lo dice: un plazo médico sin fuente, dicho por
   cualquiera, es la cosa más peligrosa que se puede publicar aquí. */
const PLAZO = /\b(?:tienes?|hay|quedan|dispones?|plazo|máximo|maximo|antes de)\b[^.\n]{0,24}\b\d{1,3}\s*(?:h|hs|horas?|d[íi]as?|semanas?)\b/i;

export function señales(texto) {
  const s = texto.toLowerCase();
  const razones = [];
  const enlaces = (texto.match(ENLACE) || []).length;
  if (enlaces > 2) razones.push('enlaces');
  if (TELEFONO.test(texto)) razones.push('telefono');
  if (PLAZO.test(texto)) razones.push('plazo');
  /* Gritar. Solo cuenta si hay texto suficiente: «NO» en un comentario
     de tres palabras no es gritar, es decir que no. */
  const letras = texto.replace(/[^\p{L}]/gu, '');
  if (largo(letras) > 40) {
    const mayus = [...letras].filter((c) => c === c.toUpperCase() && c !== c.toLowerCase()).length;
    if (mayus / largo(letras) > 0.7) razones.push('mayusculas');
  }
  /* Una línea repetida veinte veces. */
  if (/(.{12,})\1{3,}/s.test(s)) razones.push('repeticion');
  return razones;
}

export function estadoInicial(txt) {
  if (config.foro.moderacion === 'previa') return { estado: 'revision', razones: ['moderacion-previa'] };
  const razones = señales(txt);
  return { estado: razones.length ? 'revision' : 'visible', razones };
}
