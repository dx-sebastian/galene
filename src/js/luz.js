/* ═══════════════════════════════════════════════════════════════════
   luz.js — LA HORA, PARA LAS PÁGINAS QUE NO LLEVAN MAR.

   En la portada la luz la aplica main.js, porque allí va atada al
   shader: mide los píxeles que de verdad quedaron pintados detrás del
   texto y calibra el lavado contra ellos. Esta página no tiene lienzo
   que medir, así que lo único que hace falta es la mitad honesta de ese
   trabajo: pedirle a hora.js la luz del momento y escribirla en el DOM.

   Son quince líneas y NO se duplica ni un color ni una curva: el modelo
   de luz sigue viviendo en un solo sitio (hora.js) y aquí solo se le
   pregunta. Si mañana la noche cambia de añil, cambia en las dos
   páginas a la vez.

   Lo que esto pone en marcha en una hoja de papel:
   — `data-tinta` en <html>, o sea el modo claro/oscuro de todo el
     sitio. El papel se va al morado azulado profundo cuando la tinta se
     aclara, y eso ya está resuelto en estilos.css.
   — Los tokens de cielo, agua, bruma y acento, que aquí no pintan
     paisaje pero sí tiñen las aguadas del fondo.
   — `--vuelo-*`, la perspectiva aérea de las garzas. Los sellos de
     autoría son las mismas láminas de las garzas posadas, así que se
     van con la luz de la hora igual que las del manglar.

   `?hora=4.5` fuerza la hora, exactamente como en main.js: es el mismo
   asidero de verificación y tiene que comportarse igual en las dos
   páginas, o medir en una no dice nada de la otra.
   ═══════════════════════════════════════════════════════════════════ */

import { luz, aplicar, horaAhora } from './hora.js';

const PARAMS = new URLSearchParams(location.search);
const HORA_FORZADA = PARAMS.has('hora') ? parseFloat(PARAMS.get('hora')) : null;
const reloj = () => (HORA_FORZADA !== null && !Number.isNaN(HORA_FORZADA))
  ? HORA_FORZADA : horaAhora();

/* `true` sin discusión: sin lienzo no hay nada que medir, así que el
   lavado por compresión de hora.js es el valor bueno y no un respaldo.
   (En esta página además casi no se usa: la barra va sobre papel y no
   necesita velo — ver `.barra--papel` en estilos.css.) */
const escribir = () => aplicar(luz(reloj()), true);

escribir();

/* Cada 30 s, como en la portada. El crepúsculo cruza en hora y media y
   el modo de tinta puede voltear en medio de una lectura larga: quien
   entró a las 18:40 y sigue leyendo a las 19:10 tiene que ver la hoja
   irse a la noche con ella, no encontrarse un salto al recargar. */
setInterval(escribir, 30_000);
