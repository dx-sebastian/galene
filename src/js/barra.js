/* ═══════════════════════════════════════════════════════════════════
   barra.js — la barra baja cuando la hoja tiene la pantalla.

   QUÉ HACE, Y ES TODO LO QUE HACE. Escribe `data-barra` en el <header>
   de la portada: `visible` cuando el canto de `#herramientas` llegó
   arriba del todo, `oculta` cuando se vuelve por encima de él. El
   movimiento entero —de dónde baja, cuánto tarda, con qué tinta llega—
   vive en `.barra--flotante`, en estilos.css. Aquí solo se decide
   CUÁNDO.

   POR QUÉ NO ESTÁ EN EL HERO. La portada es una pintura y el rótulo es
   lo único que se le pone encima. Una fila de enlaces ahí arriba compite
   con el rótulo por el mismo cielo y obliga a lavar dos zonas más para
   que se lea (lo hacía: ver el historial de `calibrarLavado()` en
   main.js). Fuera del cuadro no hay nada que lavar, y la navegación
   aparece cuando empieza a haber sitio al que navegar.

   ── EL UMBRAL ES LA HOJA, Y NO UNA FRACCIÓN DEL HERO ─────────────────

   Esto midió un rato «el 55 % del hero», que suena razonable y estaba
   mal por dos sitios seguidos:

   1 · A ese 55 % todavía queda medio mar en pantalla, así que la barra
       bajaba ENCIMA DE LA PINTURA — que es exactamente el sitio del que
       se la quitó, y además con la tinta del papel, que sobre el agua
       no se lee.

   2 · Aunque se hubiera esperado al 100 %, tampoco valdría: entre el
       hero y la hoja está LA BOCA, y con script son 220 vh de escena
       sticky donde lo que se ve arriba sigue siendo mar hasta que el
       papel termina de avanzar (ver Boca.astro y `.boca` en
       estilos.css).

   La pregunta buena no es cuánto se ha ido el cuadro: es si detrás de la
   barra hay HOJA, porque la barra no lleva fondo ninguno y la tinta que
   usa es la del papel. Así que el umbral es el canto de `#herramientas`
   —opaca desde su primer píxel, por eso la boca vive fuera de ella— y no
   un número. Sin escenas.js la boca se queda en una franja corta y ese
   canto llega antes; el umbral se mueve solo con él, que es la ventaja
   de medir la cosa en vez de estimarla.

   ── CON `offsetTop` Y NO CON `getBoundingClientRect` ────────────────
   La misma razón que está escrita en desplazamiento.js y en paralaje.js:
   el rectángulo incluye las transformaciones, y por esta página hay dos
   módulos escribiendo `translate` sobre lo que se cruzan. `offsetTop` es
   geometría de MAQUETA y no se entera de ninguna — así que solo hay que
   volver a leerlo cuando la maqueta cambia, no cada cuadro.

   ── LA HISTÉRESIS ───────────────────────────────────────────────────
   Con un solo umbral, quien se para justo encima ve la barra entrar y
   salir a cada temblor del dedo. Se va cuando el canto de la hoja baja
   un 12 % de pantalla, o sea que hay que desandar de verdad para
   deshacer el gesto.

   ── SI ESTE MÓDULO NO LLEGA ─────────────────────────────────────────
   La barra se queda arriba, fuera de cuadro, y la portada pierde su
   navegación. Es lo único de este sitio que se rompería en silencio, y
   por eso el fallback no se deja al azar: el <noscript> de index.astro
   la deja puesta y quieta cuando no hay scripting, y `:focus-within` la
   baja en cuanto alguien la enfoca con el teclado. Lo que este módulo
   añade es la comodidad de que baje sola, no el acceso a la ayuda.
   ═══════════════════════════════════════════════════════════════════ */

import { viewportHeight } from './viewport.js';

const barra = document.querySelector('.barra--flotante');
/* LA HOJA es quien manda el umbral. Si algún día esta barra se usa en
   una página sin hoja, el sustituto honesto es la primera pantalla: el
   gesto es «cuando se haya ido lo de arriba». */
const hoja = document.getElementById('herramientas');

if (barra) {
  /* Cuánto hay que volver a subir para que se vaya, en alturas de
     pantalla. Ver la histéresis, arriba. */
  const SUELTA = 0.12;

  let canto = 0;
  let visible = false;
  let pedido = false;

  /* La posición de un elemento en el documento, inmune a cualquier
     transformación. Se suma hacia arriba porque `offsetTop` es relativo
     al `offsetParent`, no al documento. */
  function topDocumento(el) {
    let y = 0;
    for (let n = el; n; n = n.offsetParent) y += n.offsetTop;
    return y;
  }

  const medir = () => { canto = hoja ? topDocumento(hoja) : viewportHeight(); };

  function pintar() {
    pedido = false;
    /* A qué altura de la pantalla está el canto de la hoja. Cero es
       arriba del todo; positivo es que todavía queda cuadro encima. */
    const y = canto - scrollY;
    const ahora = visible ? y <= viewportHeight() * SUELTA : y <= 0;
    if (ahora === visible) return;
    visible = ahora;
    barra.dataset.barra = ahora ? 'visible' : 'oculta';
  }

  /* rAF por evento, no bucle: el mismo patrón que desplazamiento.js y
     decidir.js. Mientras nadie se mueva, este módulo no gasta un cuadro.
     Y sin comprobar `prefers-reduced-motion` —a diferencia de aquellos—
     porque esto no es una animación de entrada: es si la navegación está
     o no está. Quien pidió calma no pidió quedarse sin barra; lo que se
     le quita es la transición, y eso ya lo hace el CSS. */
  const marcar = () => {
    if (pedido) return;
    pedido = true;
    requestAnimationFrame(pintar);
  };

  medir();
  pintar();

  /* LA MAQUETA DE ARRIBA CAMBIA DE ALTO SOLA y con ella el canto: la
     boca pasa de una franja corta a 220 vh en cuanto escenas.js la
     enciende, y eso ocurre después de que este módulo haya medido. Sin
     volver a medir, la barra bajaría con el mar todavía en pantalla —
     que es justo el fallo que este umbral existe para no tener. */
  if ('ResizeObserver' in window && hoja) {
    new ResizeObserver(() => { medir(); marcar(); }).observe(document.body);
  }

  addEventListener('scroll', marcar, { passive: true });
  addEventListener('resize', () => { medir(); marcar(); }, { passive: true });
  addEventListener('galene:viewportresize', () => { medir(); marcar(); }, { passive: true });
  /* Las láminas y la tipografía llegan después del primer cuadro y
     mueven la maqueta hacia abajo. */
  addEventListener('load', () => { medir(); marcar(); });
}
