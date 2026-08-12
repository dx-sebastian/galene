/* ═══════════════════════════════════════════════════════════════════
   paralaje.js — LA INMERSIÓN.

   El mundo ya tiene su paralaje: está fijo al viewport, la página se
   desliza por encima, el shader mueve el manglar con el puntero y
   main.js hunde el lienzo un 18 % al bajar. Este módulo es el OTRO
   lado de la ventana: el plano del texto.

   Tres gestos, y solo tres:

   1. AL BAJAR, EL TEXTO NO SE VA CON LA PÁGINA — se queda con el
      cielo. Se desplaza a menos de la mitad de la velocidad del
      scroll, y a medida que la superficie lo alcanza se vela y se
      desenfoca apenas: no lo tapan las herramientas, se sumerge.

   2. LA LÁMINA FLOTA. El CTA es una lámina sobre el agua y se
      comporta como tal: su propio factor de scroll y una boya
      sinusoidal lentísima, de amplitud de un par de píxeles. Se
      nota sin verse, que es como flota lo que flota.

   3. EL PUNTERO ABRE PROFUNDIDAD. El manglar ya sigue al puntero
      dentro del shader; aquí el texto se mueve unos pocos píxeles en
      sentido CONTRARIO, con un muelle amortiguado. Dos planos que se
      separan al mover la cabeza: eso es una ventana, no un fondo.
      En móvil, el mismo gesto sale del giroscopio si existe.

   Reglas de convivencia, que son las del sitio:
   — mar.js no se toca. Este módulo no conoce el mar.
   — Se escribe `translate`, NUNCA `transform`: el asentamiento del
     CTA y su hover viven en `transform` y componen por debajo.
   — prefers-reduced-motion APAGA, no reduce. Y con esto apagado el
     hero sigue siendo exactamente el que era.
   — El bucle solo corre con el hero en pantalla, y solo escribe al
     DOM cuando el valor cambió de verdad.
   ═══════════════════════════════════════════════════════════════════ */

const quieto = matchMedia('(prefers-reduced-motion: reduce)');

const hero  = document.getElementById('mar');
const texto = document.querySelector('.hero__texto');
const cta   = document.querySelector('.cta');
const nota  = document.querySelector('.hero__nota');

/* La sección 2 y sus aguadas. Van aparte del hero: si un día el hero
   cambia o desaparece, el fondo de las herramientas sigue vivo. */
const seccion = document.getElementById('herramientas');
const capas = [...document.querySelectorAll('.fondo__capa')]
  .map((el) => ({ el, hondo: parseFloat(el.dataset.hondo) || 0.8 }));

if (hero && texto) arrancar();

function arrancar() {
  /* ── Estado. Todo lo animado tiene valor actual y objetivo: nada
     salta, todo persigue. ─────────────────────────────────────────── */
  let visible = true, corriendo = false, ultimo = 0;

  // Puntero / giroscopio, en [-1, 1].
  let objX = 0, objY = 0;     // a dónde quiere ir
  let curX = 0, curY = 0;     // dónde va
  let velX = 0, velY = 0;     // muelle: con velocidad, no con lerp seco

  // Scroll, ya leído (el listener solo marca; se lee en el cuadro).
  let s = 0, ultimoScrollY = -1;

  /* ── Entradas ──────────────────────────────────────────────────────
     TODA entrada del usuario despierta el bucle. Esto es lo que hace
     que el paralaje siga SIEMPRE a quien mira: da igual dónde esté la
     página o cuánto lleve quieta, en cuanto se mueve el ratón (o el
     teléfono, o el scroll) el mundo vuelve a responder en el cuadro
     siguiente. Antes solo despertaba con el scroll, así que si el
     bucle se había dormido, mover el ratón no hacía nada.

     Y se escucha en TODA la página, no solo sobre el hero: el puntero
     mueve las aguadas de la sección 2 igual que mueve el texto de
     arriba. El paralaje no es del hero, es del sitio. */
  const despertar = () => { if (!corriendo) bucle(); };

  if (matchMedia('(min-width: 700px) and (pointer: fine)').matches) {
    addEventListener('pointermove', (e) => {
      objX = (e.clientX / innerWidth  - 0.5) * 2;
      objY = (e.clientY / innerHeight - 0.5) * 2;
      despertar();
    }, { passive: true });
  } else if ('DeviceOrientationEvent' in window &&
             typeof DeviceOrientationEvent.requestPermission !== 'function') {
    /* Android y navegadores que no piden permiso: el giroscopio entra
       solo. En iOS pedirlo exige un gesto y un diálogo — un sitio que
       se abre a las 4 a.m. no le pide permisos a nadie para un adorno. */
    addEventListener('deviceorientation', (e) => {
      if (e.gamma === null) return;
      objX = Math.max(-1, Math.min(1, e.gamma / 28));
      objY = Math.max(-1, Math.min(1, (e.beta - 40) / 32));
      despertar();
    }, { passive: true });
  }

  addEventListener('scroll', despertar, { passive: true });
  addEventListener('resize', despertar, { passive: true });

  /* DOS zonas vigiladas, no una. El bucle tiene que seguir corriendo
     cuando el hero ya salió por arriba pero la sección 2 está en
     pantalla — que es justo cuando sus aguadas hacen su trabajo. */
  let heroDentro = true, seccionDentro = false;
  const ojo = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      if (e.target === hero) heroDentro = e.isIntersecting;
      else seccionDentro = e.isIntersecting;
    }
    visible = heroDentro || seccionDentro;
    if (visible && !quieto.matches) bucle();
  }, { threshold: 0 });
  ojo.observe(hero);
  if (seccion) ojo.observe(seccion);

  /* ── Escritura perezosa: al DOM solo si cambió. ───────────────────
     Indexada POR ELEMENTO. Antes la clave se armaba con el className,
     y dos elementos con la misma clase —las capas del fondo, sin ir
     más lejos— se habrían pisado el valor entre ellos: la primera
     escribía, la segunda se creía ya escrita y se quedaba quieta. */
  let previo = new WeakMap();
  function poner(el, prop, valor) {
    if (!el) return;
    let props = previo.get(el);
    if (!props) previo.set(el, (props = new Map()));
    if (props.get(prop) === valor) return;
    props.set(prop, valor);
    el.style[prop] = valor;
  }

  const suave3 = (p) => p * p * (3 - 2 * p);

  /* ── El cuadro ─────────────────────────────────────────────────── */
  function cuadro(ms) {
    /* Paso acotado POR LOS DOS LADOS, como el del ave: una pestaña en
       segundo plano no puede dar un paso gigante, y un reloj que se
       pisa hacia atrás (pruebas, throttling) no puede dar uno negativo
       — con dt < 0 el amortiguador se vuelve amplificador y el muelle
       revienta. Medido: pisando el reloj se fue a 3468. */
    const dt = Math.min(0.05, Math.max(0.001, ultimo ? (ms - ultimo) / 1000 : 1 / 60));
    ultimo = ms;
    const t = ms / 1000;

    /* Muelle subamortiguado hacia el puntero. La constante baja (28) y
       el amortiguado alto hacen que el texto LLEGUE con un resto de
       inercia mínimo — se siente colgado en el aire, no pegado al
       cursor. Un lerp seco se siente digital; un muelle, físico. */
    const K = 28, AMORT = 9.5;
    velX += ((objX - curX) * K - velX * AMORT) * dt;
    velY += ((objY - curY) * K - velY * AMORT) * dt;
    curX += velX * dt;
    curY += velY * dt;

    /* La inmersión: 0 arriba del todo, 1 con un viewport recorrido. */
    s = Math.min(1, Math.max(0, scrollY / innerHeight));
    const hundido = suave3(s);

    /* 1 · EL TEXTO SE QUEDA CON EL CIELO.
       El lienzo baja 0.18·s (main.js); el texto baja 0.45·s. Queda
       entre el mar y la página: tres velocidades, tres planos.
       El puntero lo mueve al CONTRARIO del manglar — poco: la
       profundidad se construye con milímetros, no con vaivenes. */
    const txX = -curX * 10;
    const txY = s * innerHeight * 0.45 - curY * 6;
    poner(texto, 'translate', `${txX.toFixed(1)}px ${txY.toFixed(1)}px`);

    /* Y se sumerge: se vela y pierde el filo. El desenfoque tiene
       techo bajo (2.5px) y solo existe saliendo del hero — quieto
       arriba, el texto es EXACTAMENTE el de siempre, nítido, y el
       calibrador del lavado sigue midiendo lo que es. */
    poner(texto, 'opacity', (1 - hundido * 0.85).toFixed(3));
    poner(texto, 'filter', hundido < 0.01 ? 'none'
      : `blur(${(hundido * 2.5).toFixed(2)}px)`);

    /* 2 · LA LÁMINA FLOTA. Factor propio (0.30: entre el mar y el
       texto) y la boya: dos senos inconmensurables para que nunca
       repita, amplitud total ~3px. Una lámina sobre agua CALMA. */
    const boya = quieto.matches ? 0
      : Math.sin(t * 0.55) * 1.7 + Math.sin(t * 0.23 + 1.3) * 1.1;
    const ctaY = s * innerHeight * 0.30 + boya - curY * 3;
    poner(cta, 'translate', `${(-curX * 5).toFixed(1)}px ${ctaY.toFixed(1)}px`);
    poner(cta, 'opacity', (1 - hundido).toFixed(3));

    /* (Aquí movía el <img> del manglar de raíces desnudas como plano
       cercano. La lámina salió del hero —el árbol ya lo pinta el
       shader, con su paralaje y su luz—, así que este plano se fue
       con ella.) */

    /* La nota de la hora es el plano más cercano: se va la primera. */
    poner(nota, 'translate', `0px ${(s * innerHeight * 0.22).toFixed(1)}px`);
    poner(nota, 'opacity', (1 - Math.min(1, s * 2.4)).toFixed(3));

    /* ── 3 · LAS AGUADAS DE LA SECCIÓN 2 ─────────────────────────────
       El modelo es el mismo que el del mundo del hero: `hondo` es
       cuánto se clava la capa al viewport. 1 = fija a la pantalla
       (infinitamente lejos), 0 = pegada a la página (a ras). Las
       nubes van a 0.94 y el manglar a 0.66, así que al bajar el
       manglar se descuelga por debajo de las nubes — que es lo que
       hace un paisaje visto desde un tren.

       Se mide con getBoundingClientRect en vez de scrollY para que la
       cuenta no dependa de dónde empieza la sección: funciona igual
       si mañana se le pone algo encima. */
    /* Sin puerta de visibilidad: un getBoundingClientRect por cuadro
       es barato, y condicionarlo dejaba las capas con el valor viejo
       justo en el cuadro en que la sección vuelve a entrar — un salto
       al reaparecer. Se calcula siempre; el que no pinta es el
       navegador, que para eso la sección está fuera de pantalla. */
    if (seccion && capas.length) {
      const r = seccion.getBoundingClientRect();
      const dentro = Math.max(0, -r.top);      // px de sección recorridos
      for (const { el, hondo } of capas) {
        /* Deriva lateral con el puntero, proporcional a la CERCANÍA:
           lo lejano casi no se mueve, lo cercano sí. Es el mismo
           reparto que separa el texto del manglar en el hero, y es lo
           que hace que el fondo respire con el ratón en toda la
           página, no solo en la portada. */
        const lado = curX * (1 - hondo) * 90;
        const vert = curY * (1 - hondo) * 34;
        poner(el, 'translate',
          `${lado.toFixed(1)}px ${(dentro * hondo + vert).toFixed(1)}px`);
      }
    }

    /* ── ¿Seguir? ────────────────────────────────────────────────────
       Dos motivos distintos para mantener el rAF vivo, y conviene no
       confundirlos:

       AMBIENTE — el hero está en pantalla y la lámina hace su boya.
       Eso se anima solo, sin nadie delante, así que mientras se vea
       hay que seguir dibujando.

       SEGUIMIENTO — el muelle del puntero todavía persigue su
       objetivo, o el scroll cambió en este cuadro. Es el usuario
       moviéndose, y es lo que no puede fallar nunca.

       Cuando no hay ninguno de los dos se suelta el rAF y la página
       no gasta nada. Y despierta al instante, porque TODA entrada
       llama a despertar(): mover el ratón revive el bucle en el
       cuadro siguiente. Dormirse sin poder despertar era el fallo que
       hacía que a veces el paralaje no siguiera al ratón. */
    const persiguiendo = Math.abs(velX) + Math.abs(velY) > 0.001 ||
                         Math.abs(objX - curX) + Math.abs(objY - curY) > 0.002;
    const scrolleando = scrollY !== ultimoScrollY;
    ultimoScrollY = scrollY;
    return heroDentro || persiguiendo || scrolleando;
  }

  function bucle() {
    if (corriendo || quieto.matches) return;
    corriendo = true;
    ultimo = 0;
    const paso = (ms) => {
      if (quieto.matches) { corriendo = false; apagar(); return; }
      if (cuadro(ms)) requestAnimationFrame(paso);
      else corriendo = false;
    };
    requestAnimationFrame(paso);
  }

  /* Movimiento apagado: el hero vuelve a ser el documento plano y las
     aguadas se quedan donde las dejó el CSS. Sigue siendo un cuadro. */
  function apagar() {
    for (const el of [texto, cta, nota, ...capas.map((c) => c.el)]) {
      if (!el) continue;
      el.style.translate = '';
      el.style.opacity = '';
      el.style.filter = '';
    }
    /* WeakMap no tiene clear(): se cambia por uno nuevo y el viejo se
       recoge solo. Sin esto, apagar() reventaba con un TypeError. */
    previo = new WeakMap();
  }

  quieto.addEventListener('change', () => {
    if (quieto.matches) apagar();
    else if (visible) bucle();
  });

  if (!quieto.matches) bucle();

  /* Asidero de auditoría, solo en desarrollo — el mismo patrón que
     __mar: el panel de verificación corre con la pestaña oculta y el
     navegador congela los rAF, así que el reloj se pisa a mano. */
  if (import.meta.env.DEV) window.__plx = { cuadro, apagar, estado: () => ({ curX, curY, s }) };
}
