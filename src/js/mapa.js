/* ═══════════════════════════════════════════════════════════════════
   mapa.js — cartografía real: se arrastra, hace zoom y admite puntero.

   Leaflet + OpenStreetMap, cargados en DIFERIDO y solo cuando el mapa
   entra en pantalla. Nada de esto puede retrasar la ayuda: si la red se
   cae o el CDN no responde, la sección se degrada a una lista y el resto
   del sitio ni se entera.

   PRIVACIDAD: las teselas las sirve openstreetmap.org, así que ese
   servidor ve una petición desde su IP. No se le manda su ubicación ni
   ningún dato del caso. La geolocalización solo ocurre si ella pulsa
   «dónde estoy», se usa para centrar el mapa y no se guarda ni se envía.
   ═══════════════════════════════════════════════════════════════════ */

import { CIUDADES, CAPAS, porCiudad, verificados } from './lugares.js';

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

const cargar = (() => {
  let promesa = null;
  return () => promesa || (promesa = new Promise((ok, mal) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = LEAFLET_CSS;
    css.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    css.crossOrigin = '';
    document.head.appendChild(css);
    const js = document.createElement('script');
    js.src = LEAFLET_JS;
    js.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    js.crossOrigin = '';
    js.onload = () => ok(window.L);
    js.onerror = () => mal(new Error('sin red'));
    document.head.appendChild(js);
  }));
})();

export function montarMapa(host) {
  if (!host) return;
  const lienzo = host.querySelector('.mapa__lienzo');
  const selector = host.querySelector('.mapa__ciudades');
  const filtros = host.querySelector('.mapa__capas');
  const listado = host.querySelector('.mapa__listado');
  const aviso = host.querySelector('.mapa__aviso');

  selector.innerHTML = CIUDADES.map((c, i) =>
    `<button type="button" class="ficha" data-id="${c.id}"
       aria-pressed="${i === 0}">${c.nombre}</button>`).join('');
  filtros.innerHTML = CAPAS.map((c) =>
    `<label class="capa"><input type="checkbox" checked data-capa="${c.id}">
       <span>${c.nombre}</span></label>`).join('');

  let mapa = null, L = null, grupo = null;
  let ciudad = CIUDADES[0];
  const activas = new Set(CAPAS.map((c) => c.id));

  function pintarListado() {
    const lista = porCiudad(ciudad.id).filter((l) => activas.has(l.capa));
    if (!lista.length) {
      listado.innerHTML = `<p class="mapa__vacio">
        Todavía no hay lugares verificados en ${ciudad.nombre}.
        <strong>No inventamos direcciones:</strong> una puerta equivocada a
        las cuatro de la mañana es peor que no tener mapa. Cuando estén
        comprobadas —dirección, horario y qué atienden de verdad— aparecen aquí.
      </p>`;
      return;
    }
    listado.innerHTML = `<ul class="enlaces">${lista.map((l) => `
      <li><strong>${l.nombre}</strong>
        <span>${l.direccion} · ${l.horario}</span>
        ${l.telefono ? `<span><a href="tel:${l.telefono}">${l.telefono}</a></span>` : ''}
        <span class="mapa__fuente">Verificado ${l.verificado}</span></li>`).join('')}</ul>`;
  }

  function pintarPuntos() {
    if (!mapa) return;
    grupo.clearLayers();
    for (const l of verificados()) {
      if (!activas.has(l.capa)) continue;
      L.marker(l.ll).addTo(grupo).bindPopup(
        `<strong>${l.nombre}</strong><br>${l.direccion}<br>${l.horario}`);
    }
  }

  async function arrancar() {
    try {
      L = await cargar();
    } catch {
      lienzo.remove();
      aviso.textContent = 'El mapa necesita conexión. La lista de abajo funciona igual.';
      aviso.hidden = false;
      return;
    }
    mapa = L.map(lienzo, { scrollWheelZoom: false, attributionControl: true })
            .setView(ciudad.ll, ciudad.zoom);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© colaboradores de OpenStreetMap',
    }).addTo(mapa);
    grupo = L.layerGroup().addTo(mapa);
    // El scroll de la página no debe quedarse atrapado en el mapa.
    mapa.on('focus', () => mapa.scrollWheelZoom.enable());
    mapa.on('blur',  () => mapa.scrollWheelZoom.disable());
    pintarPuntos();
  }

  selector.addEventListener('click', (e) => {
    const b = e.target.closest('.ficha');
    if (!b) return;
    ciudad = CIUDADES.find((c) => c.id === b.dataset.id);
    for (const o of selector.querySelectorAll('.ficha'))
      o.setAttribute('aria-pressed', String(o === b));
    if (mapa) mapa.flyTo(ciudad.ll, ciudad.zoom, { duration: 0.9 });
    pintarListado();
  });

  filtros.addEventListener('change', (e) => {
    const c = e.target.dataset.capa;
    if (!c) return;
    e.target.checked ? activas.add(c) : activas.delete(c);
    pintarPuntos(); pintarListado();
  });

  host.querySelector('.mapa__aqui')?.addEventListener('click', async (e) => {
    const b = e.currentTarget;
    b.disabled = true;
    try {
      const p = await new Promise((ok, mal) =>
        navigator.geolocation.getCurrentPosition(ok, mal, { timeout: 12000 }));
      /* Se usa para centrar y se descarta. No se guarda ni se envía. */
      if (mapa) mapa.flyTo([p.coords.latitude, p.coords.longitude], 14, { duration: 0.9 });
    } catch { /* sin permiso, el mapa sigue donde estaba */ }
    b.disabled = false;
  });

  pintarListado();
  // Carga diferida: el mapa no existe hasta que se acerca a la pantalla.
  new IntersectionObserver((ent, obs) => {
    if (!ent[0].isIntersecting) return;
    obs.disconnect();
    arrancar();
  }, { rootMargin: '300px' }).observe(host);
}
