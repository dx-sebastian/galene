/* ═══════════════════════════════════════════════════════════════════
   aparecer.js — que los bloques LLEGUEN, en vez de estar puestos.

   El héroe entra con su coreografía y el mar y el anillo se dibujan al
   bajar, pero de la mitad de la página para abajo todo estaba ya ahí:
   se desplazaba y aparecía contenido colocado, no contenido que llega.
   Es la diferencia entre pasar una página y encender una luz.

   Lo que hace este módulo es una sola cosa: marcar `.llegado` cuando un
   bloque entra en pantalla. Todo lo demás —qué se mueve y cuánto— vive
   en la hoja de estilos, con la única curva del sitio.

   ═══ LAS CUATRO REGLAS QUE NO SE NEGOCIAN ═══════════════════════════

   1 · SI NO HAY JAVASCRIPT, TODO SE VE. La clase que habilita el efecto
       la pone este archivo en <html>. Sin él, la hoja no esconde nada:
       el sitio es exactamente el de antes. Un fallo de carga no puede
       dejar invisible una ruta de atención — es la misma ley que hace
       que el teléfono y la salida rápida estén en HTML plano.

   2 · LA AYUDA NO SE ESCONDE NUNCA. `#ayuda` está a una pantalla del
       héroe y es el sitio al que apunta la barra: entra en pantalla en
       cuanto alguien empieza a bajar, o sea justo cuando un observador
       podría no haber llegado a dispararse todavía. No entra en la
       lista, y no por prudencia genérica: son el 155, SALVIA y el 123.

   3 · CERO MOVIMIENTO DE MAQUETA. Solo `opacity` y `translate`, que no
       reflujan nada. El desplazamiento acumulado tiene que seguir
       siendo cero, y hay una prueba que lo mide.

   4 · CON MOVIMIENTO REDUCIDO NO OCURRE. No se atenúa: no ocurre. Ni
       se pone la clase, ni se observa nada, ni se esconde un píxel.

   ═══ Y UNA RED, POR SI EL OBSERVADOR NO LLEGA ═══════════════════════
   Un navegador sin IntersectionObserver, o una pestaña restaurada en
   mitad de la página, podrían dejar bloques escondidos. A los dos
   segundos se revela todo pase lo que pase. El efecto es un adorno; el
   contenido no.
   ═══════════════════════════════════════════════════════════════════ */

const quieto = matchMedia('(prefers-reduced-motion: reduce)');
if (!quieto.matches) {
  const raiz = document.documentElement;

  /* QUÉ LLEGA. Bloques de lectura y tarjetas, no piezas sueltas: un
     sitio donde parpadea cada párrafo por separado no se lee, se sufre.
     Y nada de dentro del héroe, que ya tiene su propia entrada. */
  const SELECTOR = [
    '.bloque',
    '.resonancia',
    '.experto',
    '.producto',
    '.acerca__cabecera',
    '.acerca__principios article',
    '.expertos__cabecera',
    '.comunidad-panel__entrada',
    '.glosario__ficha',
    '.emblema',
  ].join(', ');

  const piezas = [...document.querySelectorAll(SELECTOR)]
    /* Fuera el héroe y fuera la ayuda (regla 2). */
    .filter((el) => !el.closest('.hero, #ayuda'))
    /* Y fuera lo que ya está en pantalla al cargar: esconder algo que
       la persona ya está mirando para enseñárselo un instante después
       es el efecto peor de todos. */
    .filter((el) => el.getBoundingClientRect().top > innerHeight * 0.9);

  if (piezas.length) {
    raiz.classList.add('con-llegada');
    for (const el of piezas) el.classList.add('por-llegar');

    const revelar = (el) => {
      el.classList.add('llegado');
      el.classList.remove('por-llegar');
    };
    const todo = () => piezas.forEach(revelar);

    if ('IntersectionObserver' in window) {
      const ojo = new IntersectionObserver((entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          revelar(e.target);
          ojo.unobserve(e.target);
        }
      }, {
        /* Un poco antes de asomar: el bloque tiene que estar entero
           cuando llega el ojo, no empezar a aparecer cuando ya se lee. */
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.01,
      });
      for (const el of piezas) ojo.observe(el);
    } else {
      todo();
    }

    /* La red. Dos segundos es más que cualquier llegada legítima. */
    setTimeout(todo, 2000);
  }
}
