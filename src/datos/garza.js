/* ═══════════════════════════════════════════════════════════════════
   garza.js — LO ÚNICO QUE SE PUEDE PERSONALIZAR, Y POR QUÉ ES TAN POCO.

   Quien entra tiene una garza en el cuadro: la del primer término, la
   que se posa en la rama cercana (ver POSADERO_CERCA en js/main.js). Se
   le puede cambiar el color del pico, o darle una frase — una de estas
   diez, no un campo de texto.

   ── POR QUÉ NO HAY CAMPO DE TEXTO, Y ESTO NO ES PEREZA ────────────
   Un campo libre en un sitio sobre sumisión química, visible para
   quien más esté, es tres cosas a la vez: una vía para que alguien
   escriba lo que le pasó donde no hay nadie cuidando (regla 4: no se
   pregunta qué pasó), una vía para que alguien escriba algo cruel a
   quien acaba de llegar, y un dato sensible viajando. Una lista cerrada
   de diez no tiene ninguno de los tres problemas y dice lo mismo que
   hace falta decir.

   Y por eso lo que viaja por el canal de presencia es el ÍNDICE, no la
   frase: aunque alguien manipulara el mensaje, lo peor que puede
   conseguir es enseñar otra de estas diez.

   ── LAS DIEZ ──────────────────────────────────────────────────────
   Todas cumplen las reglas de la casa: ninguna re-escenifica el hecho,
   ninguna promete un plazo ni una mejoría, ninguna pregunta nada, y
   ninguna cuenta a nadie. Están escritas de quien ya estuvo a quien
   acaba de llegar, que es lo único que una garza en una rama puede
   decir.
   ═══════════════════════════════════════════════════════════════════ */

export const FRASES = [
  'Aquí estuve.',
  'No estás sola.',
  'Te creo.',
  'No tienes que explicar nada.',
  'Nada de esto fue culpa tuya.',
  'Respira. Solo eso, por ahora.',
  'Yo también llegué de madrugada.',
  'Hoy no tienes que estar bien.',
  'Pide lo que necesites.',
  'Sigo aquí.',
];

/* ── LOS PICOS ─────────────────────────────────────────────────────
   NI UN COLOR NUEVO. Los seis salen de sitios donde este sitio ya los
   usa: el oro de la marca (la ola del bocadillo, la aguja norte de la
   rosa), y los cinco pigmentos de las etiquetas del foro. Un color
   inventado para esto sería un color que hay que defender aparte cada
   vez que cambie la luz de la hora; estos ya están defendidos.

   `nombre` no es decoración: es lo que anuncia un lector de pantalla al
   recorrer la fila, y «#B98E4F» no es un color para nadie.

   El primero es el de fábrica —el ocre del pico de una garza real— y
   por eso va sin `id`: elegirlo es no haber elegido. */
export const PICOS = [
  { id: '',        color: '#B98E4F', nombre: 'Ocre, el de siempre' },
  { id: 'verde',   color: '#2F6B4F', nombre: 'Verde manglar' },
  { id: 'azul',    color: '#3E6E8E', nombre: 'Azul de ruta' },
  { id: 'morado',  color: '#4A3A63', nombre: 'Morado de después' },
  { id: 'celeste', color: '#5B93AC', nombre: 'Celeste de cuidados' },
  { id: 'rojo',    color: '#C4553F', nombre: 'Rojo de preguntas' },
];

export const PICO_POR_DEFECTO = PICOS[0].color;

/** El color a partir de lo que viaja por el canal, con red de seguridad:
    un valor de otra versión del sitio devuelve el de siempre. */
export function colorDePico(valor) {
  if (!valor) return PICO_POR_DEFECTO;
  return PICOS.some((p) => p.color === valor) ? valor : PICO_POR_DEFECTO;
}

/** La frase a partir de su índice. Fuera de rango, ninguna. */
export function fraseDe(indice) {
  return Number.isInteger(indice) && indice >= 0 && indice < FRASES.length
    ? FRASES[indice] : null;
}
