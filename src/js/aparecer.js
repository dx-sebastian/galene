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
    /* ── Y LO QUE SE PINTA, QUE ES OTRA COSA ──────────────────────
       Los dos de abajo no LLEGAN: se DIBUJAN. El dueño lo pidió con
       estas palabras —«los manchones de acuarela me gustaría ver cómo
       se pintan»— y tiene razón en que no es lo mismo: un bloque que
       aparece es una hoja que se pone encima, y un trazo que se dibuja
       de izquierda a derecha es una mano.

       Se les da un `clip-path` que se abre en lugar de opacidad, así
       que la tinta entra por donde entraría un pincel. Está en la hoja,
       aquí solo se apuntan. */
    '.trazo',
    '.seccion-rotulo',
  ].join(', ');

  const piezas = [...document.querySelectorAll(SELECTOR)]
    /* Fuera el héroe y fuera la ayuda (regla 2). */
    .filter((el) => !el.closest('.hero, #ayuda'))
    /* FUERA LO QUE NO TIENE CAJA. Los bloques de dentro de las escenas
       del mapa viven en paneles con display:none hasta que alguien los
       abre: un observador no puede verlos intersecar NUNCA, así que
       apuntarlos es condenarlos a quedarse invisibles dentro de su
       panel. Encontrado por la batería: cuatro piezas a 0×0 clavadas en
       `por-llegar` tras recorrer la página entera. Al no apuntarse,
       aparecen normales cuando su panel se abre, que es lo correcto:
       la llegada es un gesto del scroll, no de abrir un cajón. */
    .filter((el) => el.getClientRects().length > 0)
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
        /* Abajo, un poco antes de asomar: el bloque tiene que estar
           entero cuando llega el ojo, no empezar a aparecer cuando ya
           se lee.

           ARRIBA, PRÁCTICAMENTE INFINITO, y esto es una avería pagada:
           con 0px arriba, alguien que scrollea RÁPIDO salta bloques
           enteros entre dos cuadros — el observador nunca los ve
           intersecar y se quedan invisibles para siempre. Lo cazó la
           batería contra producción: 9 de 28 bloques sin llegar
           después de recorrer la página entera. La red vieja de dos
           segundos tapaba esto (revelándolo TODO, que era su propio
           defecto); al quitarla, el agujero quedó al aire.

           Con 10000px arriba, todo lo que quede POR ENCIMA del
           viewport cuenta como visto: lo que se saltó de un tirón se
           revela solo, y al volver a subir está ahí. Lo de abajo sigue
           esperando su turno. */
        rootMargin: '10000px 0px -12% 0px',
        threshold: 0.01,
      });
      for (const el of piezas) ojo.observe(el);
    } else {
      /* Sin observador no hay llegada posible: se enseña todo y ya. */
      todo();
    }

    /* ═══ LA RED, Y POR QUÉ ESTABA MAL TENDIDA ══════════════════════
       Aquí ponía `setTimeout(todo, 2000)`: a los dos segundos se
       revelaba TODA la página, estuviera donde estuviera. La intención
       era buena —que nada se quede invisible— pero el efecto es que la
       llegada no existía: dos segundos después de cargar, cada bloque de
       la página ya había hecho su transición a solas, con nadie
       mirando, y quien bajaba después encontraba todo puesto. El dueño
       lo dijo sin saber la causa: «quiero ver el sitio vivo mientras
       scrolleo».

       La red se queda, pero atada a lo que de verdad puede fallar:

         · SIN observador, no hay nada que espere: se revela todo, como
           antes. Ese caso sí es una emergencia.

         · CON observador, lo único que puede quedarse colgado es algo
           que YA ESTÁ EN PANTALLA y a lo que el observador no llegó —
           una pestaña restaurada a mitad de página, un `scroll` que el
           navegador restaura antes de que el módulo corra—. Así que a
           los seis segundos se barre, pero solo lo que se está viendo.
           Lo que hay más abajo sigue esperando su turno, que es
           exactamente lo que tiene que hacer.

       Nada de esto puede dejar contenido invisible: lo de abajo no se
       lee hasta que se baja, y bajar dispara el observador. Y si el
       observador estuviera roto, no habría entrado en esta rama. */
    /* ═══ EL BARRIDO DEL SCROLL — LA GARANTÍA, NO EL GESTO ══════════
       El observador es quien hace bonito el gesto; esto es quien
       garantiza el resultado. En cada scroll (coalescido a un cuadro)
       se revela todo lo que haya quedado POR ENCIMA del borde inferior
       del viewport: si pasaste por encima de algo —despacio, rápido,
       de un salto de teclado o restaurando sesión—, está revelado.

       Existe porque el observador solo, medido, dejaba cinco piezas
       con caja sin llegar tras recorrer la página. Con este barrido el
       peor caso posible es que una pieza haga su transición un cuadro
       tarde; sin él, el peor caso era contenido que no aparece. Entre
       un fallo estético y uno de contenido, este sitio elige siempre
       pagar el estético. */
    let barriendo = false;
    addEventListener('scroll', () => {
      if (barriendo) return;
      barriendo = true;
      requestAnimationFrame(() => {
        barriendo = false;
        for (const el of piezas) {
          if (el.classList.contains('llegado')) continue;
          const r = el.getBoundingClientRect();
          /* Sin caja también se revela. Las escenas del mapa TIENEN
             caja al cargar y su panel se cierra después: la pieza se
             apuntó legítimamente y luego se quedó sin geometría, donde
             ni el observador ni la comparación de arriba la alcanzan.
             Dentro de un panel cerrado no hay gesto que proteger:
             revelarla solo garantiza que esté ahí cuando el panel se
             abra. */
          if (r.top < innerHeight || (!r.width && !r.height)) revelar(el);
        }
      });
    }, { passive: true });

    const barrerLoVisible = () => {
      for (const el of piezas) {
        if (!el.isConnected || el.classList.contains('llegado')) continue;
        const r = el.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) revelar(el);
      }
    };
    setTimeout(barrerLoVisible, 6000);
  }
}
