/* ═══════════════════════════════════════════════════════════════════
   decidir.js — el tiempo de la sección «¿Pudiste decidir?».

   Escribe UN número, `--avance`, de 0 a 1: cuánto se ha recorrido la
   sección. Todo lo demás lo hace el CSS.

   POR QUÉ ASÍ Y NO CON UNA LIBRERÍA DE SCROLL: porque este módulo no
   puede ser necesario. No escribe texto, no lo revela y no lo oculta —
   el contenido está entero en el HTML y se lee sin JavaScript. Aquí
   solo se cuenta el tiempo. Si esto no carga, la sección se ve entera y
   quieta, que es exactamente lo que ya hace con `prefers-reduced-motion`.

   Y NO SECUESTRA EL SCROLL. Nada de `scroll-jacking`, ni de capturar la
   rueda, ni de desplazamientos forzados: la página baja a la velocidad
   a la que la baje quien lee. Una persona en crisis intentando llegar a
   un teléfono no puede encontrarse con una sección que decide por ella
   cuánto tarda en pasar.
   ═══════════════════════════════════════════════════════════════════ */

const seccion = document.getElementById('pudiste-decidir');
const quieto = matchMedia('(prefers-reduced-motion: reduce)');

if (seccion) {
  let pedido = false;

  function medir() {
    pedido = false;
    const r = seccion.getBoundingClientRect();
    /* El recorrido útil: desde que la sección llega arriba del todo
       hasta que se acaba. La escena está pegada durante todo ese tramo,
       así que `avance` es exactamente qué parte de la escena toca. */
    const recorrido = Math.max(1, r.height - innerHeight);
    const p = Math.min(1, Math.max(0, -r.top / recorrido));
    seccion.style.setProperty('--avance', p.toFixed(4));
  }

  /* rAF por evento, no bucle continuo: mientras nadie se mueva, este
     módulo no gasta un solo cuadro. */
  const marcar = () => {
    if (pedido) return;
    pedido = true;
    requestAnimationFrame(medir);
  };

  /* LA CLASE LA PONE EL SCRIPT, y esa es la garantía de que el
     respaldo funcione. Toda la animación del CSS cuelga de
     `.decidir--vivo`; sin ella, la sección es un bloque normal con las
     cuatro frases a la vista.

     Estuvo resuelto con el valor por defecto de `--avance`, y estaba
     mal: al medirlo, sin JavaScript el «SÍ» quedaba invisible —porque
     el final de la secuencia es justamente que se rompe— y la pregunta
     a media tinta. O sea que quien entrara sin JavaScript leía una
     sección incompleta. Un respaldo que hay que calcular no es un
     respaldo; este no se calcula, se apaga. */
  if (!quieto.matches) {
    seccion.classList.add('decidir--vivo');
    addEventListener('scroll', marcar, { passive: true });
    addEventListener('resize', marcar, { passive: true });
    medir();
  }

  /* Movimiento apagado: se quita la variable y el CSS vuelve a su
     estado por defecto, que es todo visible. */
  quieto.addEventListener('change', () => {
    if (quieto.matches) {
      seccion.classList.remove('decidir--vivo');
      seccion.style.removeProperty('--avance');
    } else {
      seccion.classList.add('decidir--vivo');
      medir();
    }
  });
}
