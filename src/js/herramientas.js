/* ═══════════════════════════════════════════════════════════════════
   herramientas.js — el desvío de emergencia y el reloj, en el DOM.

   Regla de arquitectura: la imperfección vive en el mundo, el
   instrumento es exacto. Aquí no hay acuarela, no hay animación y no
   hay nada que espere. Todo funciona sin JavaScript salvo lo que
   necesita el navegador (ubicación, compartir), y eso se degrada a un
   enlace normal.

   Y una regla de privacidad que no se negocia: NADA SALE DE ESTE
   TELÉFONO. No hay servidor, no hay analítica, no hay almacenamiento
   remoto. La ubicación se pide solo en el momento de usarla y no se
   guarda. Lo que ella escriba se queda en su dispositivo.
   ═══════════════════════════════════════════════════════════════════ */

import { VENTANAS, abierto, sinFuente } from './reloj.js';

const $ = (s, raiz = document) => raiz.querySelector(s);

/* ── 1 · EL RELOJ ─────────────────────────────────────────────────── */

function pintarResultado(caja, horas) {
  const lista = abierto(horas);
  const noSe = horas === null;

  caja.innerHTML = `
    ${noSe ? `<p class="reloj__nota">No saber la hora no quita opciones.
       Esto es todo lo que <strong>podría</strong> seguir abierto.</p>` : ''}
    <ul class="ventanas">
      ${lista.map((v) => `
        <li class="ventana ventana--${v.estado}">
          <p class="ventana__titulo">${v.titulo}</p>
          <p class="ventana__texto">${v.estado === 'cerrada' && v.cerrado
              ? v.cerrado : v.resumen}</p>
          ${v.estado !== 'cerrada' ? `<p class="ventana__detalle">${v.detalle}</p>` : ''}
          ${v.quedan !== null && v.estado === 'abierta'
              ? `<p class="ventana__plazo">Quedan unas ${Math.round(v.quedan)} horas.</p>`
              : ''}
          ${!v.fuente ? `<p class="ventana__sinfuente">Sin verificar —
              este dato no puede publicarse hasta contrastarlo con fuente
              primaria.</p>` : ''}
        </li>`).join('')}
    </ul>
    <p class="reloj__pie">La atención médica no exige denunciar. Nadie
      va a pedirte que expliques lo que pasó para atenderte.</p>`;
  caja.hidden = false;
}

/* ── EL RELOJ, QUE ES UN RELOJ ──────────────────────────────────────
   Una esfera de 72 horas. Cada ventana es un arco que va desde ahora
   hasta que se cierra; la aguja se arrastra y los arcos se apagan a su
   paso. Las que no caducan son un anillo completo: dan la vuelta entera.

   No es un formulario. Nadie rellena nada: se gira una aguja y se mira
   qué sigue encendido.                                                */

const R = 150, CENTRO = 160, VUELTA = 72;   // 72 horas = una vuelta

const punto = (h, r) => {
  const a = (h / VUELTA) * Math.PI * 2 - Math.PI / 2;
  return [CENTRO + Math.cos(a) * r, CENTRO + Math.sin(a) * r];
};
const arco = (h0, h1, r) => {
  const [x0, y0] = punto(h0, r), [x1, y1] = punto(Math.min(h1, VUELTA - 0.001), r);
  const grande = (h1 - h0) / VUELTA > 0.5 ? 1 : 0;
  return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 ${grande} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
};

function montarReloj() {
  const seccion = $('#reloj');
  if (!seccion) return;
  const caja = $('#resultado', seccion);
  const host = $('.esfera', seccion);
  if (!host) return;

  const conArco = VENTANAS.filter((v) => v.cierra !== Infinity)
                          .sort((a, b) => a.cierra - b.cierra);
  const eternas = VENTANAS.filter((v) => v.cierra === Infinity);

  const marcas = [];
  for (let h = 0; h <= VUELTA; h += 6) {
    const mayor = h % 24 === 0;
    const [xa, ya] = punto(h, R + 6), [xb, yb] = punto(h, R + (mayor ? 18 : 12));
    marcas.push(`<line x1="${xa.toFixed(1)}" y1="${ya.toFixed(1)}"
      x2="${xb.toFixed(1)}" y2="${yb.toFixed(1)}" class="esfera__marca${mayor ? ' esfera__marca--mayor' : ''}"/>`);
    if (mayor && h < VUELTA) {
      const [xt, yt] = punto(h, R + 34);
      marcas.push(`<text x="${xt.toFixed(1)}" y="${yt.toFixed(1)}" class="esfera__hora">${h}h</text>`);
    }
  }

  host.innerHTML = `
    <svg viewBox="0 0 320 360" role="img"
         aria-label="Reloj de 72 horas. Gira la aguja para ver qué sigue abierto.">
      <g class="esfera__marcas">${marcas.join('')}</g>
      ${eternas.map((v, i) => `<circle class="pista pista--eterna" data-id="${v.id}"
          cx="${CENTRO}" cy="${CENTRO}" r="${R - 8 - i * 15}" fill="none"/>`).join('')}
      ${conArco.map((v, i) => `<path class="pista" data-id="${v.id}"
          d="${arco(0, v.cierra, R - 8 - (eternas.length + i) * 15)}" fill="none"/>`).join('')}
      <line class="aguja" x1="${CENTRO}" y1="${CENTRO}" x2="${CENTRO}" y2="${CENTRO - R - 4}"/>
      <circle class="aguja__eje" cx="${CENTRO}" cy="${CENTRO}" r="5"/>
      <text class="esfera__lectura" x="${CENTRO}" y="${CENTRO + 62}">ahora</text>
    </svg>
    <button type="button" class="esfera__nose" id="nose">No sé cuándo fue</button>`;

  const svg = $('svg', host);
  const aguja = $('.aguja', svg);
  const lectura = $('.esfera__lectura', svg);
  let horas = 0, noSe = false;

  function pintar() {
    const [x, y] = punto(noSe ? 0 : horas, R + 4);
    aguja.setAttribute('x2', x.toFixed(1));
    aguja.setAttribute('y2', y.toFixed(1));
    aguja.classList.toggle('aguja--oculta', noSe);
    lectura.textContent = noSe ? 'no sé'
      : horas < 1 ? 'ahora mismo'
      : horas === 1 ? 'hace 1 hora'
      : `hace ${Math.round(horas)} horas`;
    for (const p of svg.querySelectorAll('.pista')) {
      const v = VENTANAS.find((w) => w.id === p.dataset.id);
      const estado = noSe ? 'quizas'
        : (horas < v.cierra ? 'abierta' : 'cerrada');
      p.setAttribute('class', `pista${p.classList.contains('pista--eterna')
        ? ' pista--eterna' : ''} pista--${estado}`);
    }
    pintarResultado(caja, noSe ? null : horas);
  }

  /* Arrastrar la aguja. También flechas del teclado, porque un control
     que solo funciona con el dedo no es un instrumento. */
  const desdeEvento = (e) => {
    const c = svg.getBoundingClientRect();
    const px = ((e.clientX - c.left) / c.width) * 320 - CENTRO;
    const py = ((e.clientY - c.top) / c.height) * 360 - CENTRO;
    let a = Math.atan2(py, px) + Math.PI / 2;
    if (a < 0) a += Math.PI * 2;
    return Math.round((a / (Math.PI * 2)) * VUELTA);
  };
  let arrastrando = false;
  const mover = (e) => {
    if (!arrastrando) return;
    noSe = false; horas = Math.max(0, Math.min(VUELTA, desdeEvento(e)));
    $('#nose', host).setAttribute('aria-pressed', 'false');
    pintar();
  };
  svg.addEventListener('pointerdown', (e) => {
    arrastrando = true; svg.setPointerCapture(e.pointerId); mover(e);
  });
  svg.addEventListener('pointermove', mover);
  svg.addEventListener('pointerup', () => { arrastrando = false; });
  svg.setAttribute('tabindex', '0');
  svg.addEventListener('keydown', (e) => {
    const paso = e.shiftKey ? 6 : 1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') horas = Math.min(VUELTA, horas + paso);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') horas = Math.max(0, horas - paso);
    else return;
    e.preventDefault(); noSe = false; pintar();
  });

  $('#nose', host).addEventListener('click', (e) => {
    noSe = true;
    e.currentTarget.setAttribute('aria-pressed', 'true');
    pintar();
  });

  pintar();
}

/* ── 2 · QUE ALGUIEN VENGA POR MÍ ─────────────────────────────────── */

const MENSAJE = (donde) =>
  `Necesito que vengas por mí. No puedo hablar por teléfono ahora; ` +
  `si puedes, escríbeme en vez de llamar.` +
  (donde ? `\n\nEstoy aquí: ${donde}` : '') +
  `\n\nEnviado desde Galene.`;

function montarVengan() {
  const btn = $('#vengan');
  const salida = $('#vengan-salida');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'Buscando dónde estás…';
    let donde = null;
    try {
      /* La ubicación se pide SOLO en este momento, se usa y se descarta.
         No se guarda, no se envía a ningún servidor, no queda registro. */
      const pos = await new Promise((ok, mal) =>
        navigator.geolocation.getCurrentPosition(ok, mal,
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }));
      const { latitude: la, longitude: lo } = pos.coords;
      donde = `https://maps.google.com/?q=${la.toFixed(6)},${lo.toFixed(6)}`;
    } catch { /* sin ubicación el mensaje sigue sirviendo */ }

    const texto = MENSAJE(donde);
    btn.disabled = false;
    btn.textContent = 'Que alguien venga por mí';

    if (navigator.share) {
      try { await navigator.share({ text: texto }); return; } catch { /* canceló */ }
    }
    // Respaldo: se muestra para copiar y se ofrece WhatsApp y SMS.
    salida.hidden = false;
    $('#vengan-texto', salida).value = texto;
    $('#vengan-wa', salida).href = 'https://wa.me/?text=' + encodeURIComponent(texto);
    $('#vengan-sms', salida).href = 'sms:?&body=' + encodeURIComponent(texto);
  });

  $('#vengan-copiar')?.addEventListener('click', async () => {
    await navigator.clipboard?.writeText($('#vengan-texto').value);
    $('#vengan-copiar').textContent = 'Copiado';
  });
}

/* ── 3 · GUARDAR LO QUE RECUERDO ──────────────────────────────────── */

function montarRecuerdo() {
  const form = $('#recuerdo');
  if (!form) return;

  const texto = () => [...form.querySelectorAll('label')]
    .map((l) => {
      const campo = l.querySelector('textarea, input');
      return campo && campo.value.trim()
        ? `${l.querySelector('span').textContent}\n${campo.value.trim()}` : null;
    })
    .filter(Boolean).join('\n\n');

  $('#recuerdo-guardar').addEventListener('click', () => {
    const cuerpo = texto();
    if (!cuerpo) return;
    /* Se descarga al dispositivo. NO se sube a ningún sitio: información
       sobre salud o vida sexual es dato sensible, y guardarla en un
       servidor convertiría este proyecto en otra cosa. */
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([cuerpo], { type: 'text/plain' }));
    a.download = 'notas.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $('#recuerdo-compartir').addEventListener('click', async () => {
    const cuerpo = texto();
    if (!cuerpo) return;
    if (navigator.share) { try { await navigator.share({ text: cuerpo }); } catch {} }
    else { await navigator.clipboard?.writeText(cuerpo); }
  });
}

/* ── 4 · AVISO DE BORRADOR ────────────────────────────────────────── */

function montarAviso() {
  const n = sinFuente();
  const aviso = $('#aviso-borrador');
  if (!aviso) return;
  if (n === 0) { aviso.hidden = true; return; }
  $('#aviso-cuantos').textContent = n;
}

montarReloj();
montarVengan();
montarRecuerdo();
montarAviso();

/* El mapa se carga aparte y en diferido: si Leaflet no llega, nada de lo
   anterior se entera. La ayuda nunca depende de un CDN. */
import('./mapa.js')
  .then((m) => m.montarMapa($('#mapa-host')))
  .catch((e) => console.warn('[mapa] no disponible:', e.message));
