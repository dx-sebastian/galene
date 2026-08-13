/* ═══════════════════════════════════════════════════════════════════
   palabras.js — el glosario se abre.

   Dos gestos, y ninguno inventa contenido:

     1 · ABRIR una ficha. Cerrada enseña la frase; abierta, el matiz.
     2 · LLEGAR. Los términos subrayados de la definición y cualquier
         enlace `#t-loquesea` abren su ficha y la traen a la vista.

   (Hubo un tercero, BUSCAR, con su campo, su índice sin tildes y sus
   alias —«no me acuerdo», «bebí demasiado»—. Se retiró con el buscador:
   ocho fichas plegadas a una frase se saltan con el ojo, y un campo de
   texto por encima de la lista es una decisión más en una página que
   intenta que no haya ninguna. Está en el historial.)

   ── LA LEY DE ESTE MÓDULO ───────────────────────────────────────────
   TODO EL TEXTO ESTÁ EN EL HTML, en orden y completo, y este módulo no
   escribe ni una palabra de contenido: solo cambia qué se ve. Es la
   misma ley que lleva escrita Decidir.astro y vale por tres razones —
   un lector de pantalla lo recorre entero, un buscador lo indexa entero,
   y si este fichero no llega no falta nada.

   ── EL ESTADO CERRADO LO PONE EL CSS, NO EL JS ──────────────────────
   Igual que la barra flotante, y por lo mismo: puesto desde aquí habría
   un cuadro con las ocho fichas abiertas antes de que el módulo corriera,
   y la sección daría un salto de media pantalla al cargar. El CSS las
   cierra, este módulo las abre, y el <noscript> de index.astro las deja
   todas abiertas cuando no hay scripting. Lo que sí se escribe aquí es
   `aria-expanded`, porque un atributo ARIA que no se mueve es peor que
   ninguno.
   ═══════════════════════════════════════════════════════════════════ */

const seccion = document.getElementById('palabras');

if (seccion) {
  const lista  = document.getElementById('glosario');
  const fichas = [...lista.querySelectorAll('.glosario__ficha')];
  const porId  = new Map(fichas.map((f) => [f.dataset.termino, f]));

  /* ── 1 · ABRIR ─────────────────────────────────────────────────────
     SIN ACORDEÓN EXCLUSIVO, y es una decisión, no una omisión. Cerrar
     la ficha que alguien acaba de leer para abrir la siguiente le quita
     la posibilidad de comparar dos —«consentimiento» y «anulación de la
     voluntad» se entienden una al lado de la otra— y además mueve el
     texto de sitio mientras lo está mirando. Un acordeón exclusivo es
     cómodo para quien diseña la lista y molesto para quien la usa. */
  function abrir(ficha, si) {
    const boton = ficha.querySelector('.glosario__boton');
    if (!boton) return;
    /* Sin matiz no hay nada que abrir: el botón se queda como rótulo y
       se le quita el papel de mando, en vez de abrir una caja vacía. */
    if (!ficha.querySelector('.glosario__pliegue')) return;
    boton.setAttribute('aria-expanded', si ? 'true' : 'false');
    ficha.classList.toggle('glosario__ficha--abierta', si);
  }

  for (const ficha of fichas) {
    const boton = ficha.querySelector('.glosario__boton');
    if (!ficha.querySelector('.glosario__pliegue')) {
      /* Una ficha que no se abre no puede anunciarse como abrible. Se
         le quita el estado y los atributos de mando y queda un botón
         inerte — que es lo que ya era. */
      boton.removeAttribute('aria-expanded');
      boton.removeAttribute('aria-controls');
      boton.disabled = true;
      ficha.classList.add('glosario__ficha--llana');
      continue;
    }
    boton.addEventListener('click', () => {
      abrir(ficha, boton.getAttribute('aria-expanded') !== 'true');
    });
  }

  /* ── 2 · LLEGAR ────────────────────────────────────────────────────
     Un enlace a `#t-oportunista` tiene que dejar la ficha ABIERTA y a la
     vista, no solo saltar a ella: aterrizar sobre una caja cerrada que
     enseña la misma frase que ya estaba en el párrafo es aterrizar en
     ningún sitio. */
  function irA(id) {
    const ficha = porId.get(id);
    if (!ficha) return false;
    abrir(ficha, true);
    /* `smooth` solo si nadie pidió calma. Con `prefers-reduced-motion`
       el salto es instantáneo, que es exactamente lo que esa preferencia
       significa. */
    const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
    ficha.scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'center' });
    /* El foco va a la ficha y no al botón: leído en voz alta, lo que
       hace falta oír es la definición entera, no «Sumisión oportunista,
       botón, expandido». `tabindex="-1"` la hace enfocable sin meterla
       en el recorrido del tabulador. */
    ficha.setAttribute('tabindex', '-1');
    ficha.focus({ preventScroll: true });
    return true;
  }

  /* Se engancha en el documento y no en cada término: los enlaces a
     `#t-*` pueden estar en cualquier parte de la página —hoy están en la
     definición, mañana en el reloj— y una delegación no hay que ir
     conectándola cada vez. */
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[href^="#t-"]');
    if (!a) return;
    if (irA(a.getAttribute('href').slice(3))) e.preventDefault();
  });

  /* Y si alguien LLEGA con el ancla puesta —un enlace compartido por
     WhatsApp a `…#t-consentimiento`, o el `url` de cada término en los
     datos estructurados de index.astro— la ficha tiene que estar
     abierta antes de que mire. */
  const porElAncla = () => {
    if (location.hash.startsWith('#t-')) irA(location.hash.slice(3));
  };
  porElAncla();

  /* Y otra vez cada vez que cambie el ancla sin recargar. El clic sobre
     un término ya está atendido por la delegación de arriba, pero hay
     dos caminos más que no pasan por ningún clic nuestro: el botón ATRÁS
     después de haber pulsado un término, y pegar otro `#t-` en la barra
     de direcciones. Sin esto, volver atrás deja la ficha abierta que no
     toca y la que toca cerrada — el estado de la página y su URL
     diciendo cosas distintas. */
  addEventListener('hashchange', porElAncla);

  if (import.meta.env.DEV) {
    window.__glo = {
      irA,
      estado: () => fichas.map((f) => ({
        id: f.dataset.termino,
        abierta: f.classList.contains('glosario__ficha--abierta'),
      })),
    };
  }
}
