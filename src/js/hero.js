/* En móvil no se descarga ni se evalúa el motor WebGL. Este archivo es
   la bifurcación: composición estática lista y decodificada, o escena
   completa importada bajo demanda en escritorio. */
import { luz, aplicar, horaAhora, notaAmanecer } from './hora.js';

const conexion = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
const redLenta = Boolean(conexion?.saveData)
  || /(^|-)2g$|3g/.test(conexion?.effectiveType || '');
const movil = matchMedia('(max-width: 700px), (pointer: coarse)').matches;
const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');

function pintarHora() {
  const L = luz(horaAhora());
  aplicar(L);
  const nota = document.getElementById('nota-hora');
  if (nota) nota.textContent = notaAmanecer(horaAhora());
}

async function heroEstatico(modo = 'movil') {
  const raiz = document.documentElement;
  raiz.classList.add('hero-estatico');
  document.getElementById('lienzo')?.remove();
  document.getElementById('mar')?.setAttribute('data-mar', 'sin-webgl');
  pintarHora();
  setInterval(pintarHora, 30_000);

  /* La clase arranca la misma petición desde CSS. Esta imagen paralela
     sirve para esperar load/decode sin meter un elemento duplicado en
     el DOM; la caché de red comparte los bytes. */
  const poster = new Image();
  poster.decoding = 'async';
  poster.fetchPriority = 'high';
  const lista = new Promise((resolver) => {
    poster.onload = resolver;
    poster.onerror = resolver;
  });
  poster.src = base + 'arte/mobile/manglar-v2.webp';
  if (poster.complete) poster.onload?.();
  await Promise.race([
    lista.then(() => poster.decode?.().catch(() => undefined)),
    new Promise((resolver) => setTimeout(resolver, 7000)),
  ]);
  dispatchEvent(new CustomEvent('galene:hero-listo', { detail: { modo } }));
}

if (movil || redLenta) {
  heroEstatico(redLenta ? 'ahorro-datos' : 'movil');
} else {
  import('./main.js').catch((error) => {
    console.warn('[hero] escena animada no disponible:', error);
    heroEstatico('respaldo');
  });
}
