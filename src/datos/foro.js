/* ═══════════════════════════════════════════════════════════════════
   foro.js (datos) — LOS LÍMITES Y LOS NOMBRES.

   Vive aparte de js/foro.js por una razón concreta y no por orden: el
   componente de Astro lo importa desde su FRONTMATTER, o sea que este
   archivo se ejecuta en Node al compilar. js/foro.js abre un
   `BroadcastChannel` y toca `sessionStorage` al evaluarse — en Node eso
   revienta la compilación. Aquí no hay nada que no sean valores.

   Y se importa desde los dos sitios a propósito: el `maxlength` del
   campo y el corte al guardar tienen que ser EL MISMO NÚMERO. Con dos
   copias, el navegador deja escribir hasta un límite y el almacén
   recorta en otro, sin decírselo a nadie.
   ═══════════════════════════════════════════════════════════════════ */

/* No son límites de base de datos —no hay— sino de conversación: un
   título que no cabe en una línea deja de ser un título, y un cuerpo de
   diez mil caracteres en un foro de acompañar es un texto que nadie va
   a contestar. */
export const LIMITES = {
  titulo:    { min: 6,  max: 110 },
  cuerpo:    { min: 12, max: 2400 },
  respuesta: { min: 2,  max: 1200 },
};

/* ── LOS NOMBRES SON DE AGUA ────────────────────────────────────────
   La misma regla que los datos de ejemplo (ver su cabecera): nadie
   escribe aquí con un nombre que pueda confundirse con una cuenta real.
   Quien no quiera nombre va como «Anónima», que es el valor por
   defecto; quien quiera uno, elige de esta lista.

   NO ES UN CAMPO DE TEXTO LIBRE, y por lo mismo que las frases de la
   garza (ver datos/garza.js): un nombre escrito a mano en un sitio
   sobre sumisión química es una forma de identificarse, y aquí nadie
   tiene por qué. */
export const NOMBRES = [
  'Marea baja', 'Raíz', 'Bruma', 'Manglar', 'Resaca', 'Duna',
  'Corriente', 'Orilla', 'Salitre', 'Rompiente', 'Bajamar',
];

export const ANONIMA = 'Anónima';
