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

import { TRAMOS, abierto, sinFuente } from './reloj.js';

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

function montarReloj() {
  const seccion = $('#reloj');
  if (!seccion) return;
  const caja = $('#resultado', seccion);

  $('.disco', seccion).innerHTML = TRAMOS.map((t) => `
    <button type="button" class="disco__opcion${t.id === 'nose' ? ' disco__opcion--nose' : ''}"
            data-horas="${t.horas === null ? '' : t.horas}">
      ${t.etiqueta}
    </button>`).join('');

  seccion.addEventListener('click', (e) => {
    const b = e.target.closest('.disco__opcion');
    if (!b) return;
    for (const o of seccion.querySelectorAll('.disco__opcion'))
      o.setAttribute('aria-pressed', String(o === b));
    pintarResultado(caja, b.dataset.horas === '' ? null : Number(b.dataset.horas));
  });
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
