/* ═══════════════════════════════════════════════════════════════════
   entrada.js — la pintura llega y abre el contenido.

   El HTML nace cubierto por una lámina de carga. Se abre únicamente
   cuando la fuente y el núcleo visual del hero están listos. Hay un
   límite de seguridad: una textura ausente o WebGL roto no puede dejar
   la información encerrada detrás de un cargador eterno.

   No espera a las capas decorativas, a las poses de las aves ni a las
   imágenes de la sección de lectura. En móvil, el núcleo listo es la
   composición estática; en escritorio, las cuatro texturas que forman
   agua y manglar. Con movimiento reducido el loader no anima.

   Sin JavaScript, el bloque `noscript` del documento abre el contenido.
   Con JavaScript incompleto, el límite de ocho segundos hace lo mismo.
   ═══════════════════════════════════════════════════════════════════ */

const raiz = document.documentElement;
const cargador = document.getElementById('cargador');
const quieto = matchMedia('(prefers-reduced-motion: reduce)');
const inicio = performance.now();
const MINIMO = quieto.matches ? 0 : 520;
const MAXIMO = 8000;

let resolverHero;
const heroListo = new Promise((resolver) => { resolverHero = resolver; });
addEventListener('galene:hero-listo', resolverHero, { once: true });

const fuentesListas = document.fonts?.ready?.catch?.(() => undefined)
  || Promise.resolve();
const limite = new Promise((resolver) => setTimeout(resolver, MAXIMO));

let cerrado = false;
function secarPintura() {
  if (quieto.matches) return;
  raiz.classList.add('entrando');
  let terminado = false;
  const eventos = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'];
  const terminarSecado = () => {
    if (terminado) return;
    terminado = true;
    raiz.classList.remove('entrando');
    for (const evento of eventos) removeEventListener(evento, terminarSecado);
  };
  for (const evento of eventos)
    addEventListener(evento, terminarSecado, { passive: true, once: true });
  setTimeout(terminarSecado, 2000);
}

async function terminar() {
  if (cerrado) return;
  cerrado = true;
  const falta = Math.max(0, MINIMO - (performance.now() - inicio));
  if (falta) await new Promise((resolver) => setTimeout(resolver, falta));
  raiz.classList.add('contenido-listo');
  raiz.classList.remove('cargando');
  raiz.classList.add('entrada-hecha');
  secarPintura();
  cargador?.setAttribute('aria-hidden', 'true');
  dispatchEvent(new CustomEvent('galene:contenido-listo'));
  setTimeout(() => cargador?.remove(), quieto.matches ? 0 : 620);
}

Promise.race([
  Promise.all([fuentesListas, heroListo]),
  limite,
]).then(terminar);

/* Las texturas de papel pertenecen a la lectura, no a la portada. Su
   descarga empieza al primer avance real hacia la boca. */
const boca = document.querySelector('.boca');
const activarLectura = () => raiz.classList.add('lectura-cerca');
if (boca && 'IntersectionObserver' in window) {
  const observador = new IntersectionObserver((entradas) => {
    if (!entradas.some((e) => e.isIntersecting)) return;
    activarLectura();
    observador.disconnect();
  }, { rootMargin: '0px 0px -32px 0px' });
  observador.observe(boca);
} else {
  activarLectura();
}
