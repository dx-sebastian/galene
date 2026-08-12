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
  let s = 0;

  /* ── Entradas ──────────────────────────────────────────────────── */
  if (matchMedia('(min-width: 700px) and (pointer: fine)').matches) {
    addEventListener('pointermove', (e) => {
      objX = (e.clientX / innerWidth  - 0.5) * 2;
      objY = (e.clientY / innerHeight - 0.5) * 2;
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
    }, { passive: true });
  }

  addEventListener('scroll', () => { if (!corriendo) bucle(); }, { passive: true });

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !quieto.matches) bucle();
  }, { threshold: 0 }).observe(hero);

  /* ── Escritura perezosa: al DOM solo si cambió. ─────────────────── */
  const previo = new Map();
  function poner(el, prop, valor) {
    if (!el) return;
    const clave = prop + '@' + (el.className || el.id);
    if (previo.get(clave) === valor) return;
    previo.set(clave, valor);
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

    /* La nota de la hora es el plano más cercano: se va la primera. */
    poner(nota, 'translate', `0px ${(s * innerHeight * 0.22).toFixed(1)}px`);
    poner(nota, 'opacity', (1 - Math.min(1, s * 2.4)).toFixed(3));

    /* ¿Hay algo que seguir animando? Con el hero fuera, el scroll ya
       lo dejó todo puesto y el muelle en reposo: se suelta el rAF. */
    const enReposo = Math.abs(velX) + Math.abs(velY) < 0.001 &&
                     Math.abs(objX - curX) + Math.abs(objY - curY) < 0.002;
    return visible || !enReposo;
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

  /* Movimiento apagado: el hero vuelve a ser el documento plano. */
  function apagar() {
    for (const el of [texto, cta, nota]) {
      if (!el) continue;
      el.style.translate = '';
      el.style.opacity = '';
      el.style.filter = '';
    }
    previo.clear();
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
