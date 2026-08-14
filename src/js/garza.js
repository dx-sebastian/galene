/* ═══════════════════════════════════════════════════════════════════
   garza.js — TU GARZA: EL PICO Y LA FRASE.

   El panel es OPT-IN y por eso va dentro de un <details> cerrado: quien
   no quiera personalizar nada no tiene que cerrar ningún cartel, y
   quien llegue a las cuatro de la mañana buscando un teléfono no se
   encuentra una pregunta más. Abrir y cerrar lo hace el navegador; este
   módulo solo se ocupa de lo que hay dentro.

   ── DÓNDE SE GUARDA, Y POR QUÉ AHÍ ────────────────────────────────
   En `sessionStorage`, que muere al cerrar la pestaña. No en
   `localStorage`.

   La diferencia importa y es la regla 6: la salida rápida existe para
   que no quede rastro. Un color de pico no es un dato de salud —no
   dice nada de nadie— pero sí sobreviviría a cerrar, y «el sitio se
   acordó de mí» es exactamente la sensación que este proyecto no puede
   permitirse en el aparato de quien a lo mejor lo comparte. Lo que se
   gana con `sessionStorage` es lo justo: navegar de la portada a la
   comunidad y volver sin perder la elección.

   El mismo patrón guardado que js/marcas.js: si el almacenamiento está
   bloqueado —navegación privada de algunos navegadores, o apagado a
   mano— no se rompe nada, la elección vive en memoria y dura lo que
   dure la página.
   ═══════════════════════════════════════════════════════════════════ */

import { FRASES, PICOS, PICO_POR_DEFECTO, colorDePico, fraseDe } from '../datos/garza.js';
import { anunciar } from './presencia.js';

const CLAVE = 'galene:garza';

let deMemoria = null;
const guarda = (() => {
  try {
    const t = '__galene__';
    sessionStorage.setItem(t, '1');
    sessionStorage.removeItem(t);
    return true;
  } catch { return false; }
})();

const leer = () => {
  if (!guarda) return deMemoria;
  try { return JSON.parse(sessionStorage.getItem(CLAVE) || 'null'); }
  catch { return null; }
};

const escribir = (v) => {
  deMemoria = v;
  if (!guarda) return;
  try {
    if (v) sessionStorage.setItem(CLAVE, JSON.stringify(v));
    else sessionStorage.removeItem(CLAVE);
  } catch { /* cuota o bloqueo: se queda en memoria y ya está */ }
};

/* El perfil saneado. Lo lee main.js para pintar el pico y el globo, y
   presencia.js para anunciarlo. Nunca devuelve `null`: sin elegir nada,
   el pico es el ocre de siempre y no hay frase. */
export function perfil() {
  const c = leer() || {};
  return {
    pico: colorDePico(c.pico),
    frase: fraseDe(c.frase),
    fraseIdx: Number.isInteger(c.frase) ? c.frase : null,
    /* «Tocó algo» no es lo mismo que «tiene el pico ocre»: el ocre es
       también el valor de fábrica. Lo distingue la presencia del objeto
       guardado, no el color, y de ello dependen el botón de olvidar y
       el aviso hablado. */
    elegido: Boolean(leer()),
  };
}

const oyentes = new Set();
/** Avisa cuando cambia el perfil propio. Lo usa main.js para repintar. */
export function alCambiar(fn) { oyentes.add(fn); return () => oyentes.delete(fn); }

function aplicar(cambio) {
  const c = { ...(leer() || {}), ...cambio };
  /* Se limpia lo que quedó a `null` para no guardar claves vacías: un
     objeto con `{pico: null}` y uno sin `pico` tienen que ser el mismo
     estado, o el panel enseña una marca donde no hay elección. */
  for (const k of Object.keys(c)) if (c[k] === null || c[k] === undefined) delete c[k];
  escribir(Object.keys(c).length ? c : null);

  const p = perfil();
  /* A las otras pestañas solo se les cuenta lo ELEGIDO. Si nadie ha
     tocado nada, se manda `null` y su garza sale con el pico de
     siempre: no hay diferencia entre «no personalizó» y «no está». */
  anunciar({ pico: leer()?.pico || null, frase: p.fraseIdx });
  for (const fn of oyentes) fn(p);
  return p;
}

export const ponerPico  = (color) => aplicar({ pico: color || null });
export const ponerFrase = (idx)   => aplicar({ frase: Number.isInteger(idx) ? idx : null });
export const olvidar    = ()      => { escribir(null); return aplicar({}); };

/* ═══ EL PANEL ════════════════════════════════════════════════════
   Se monta sobre el marcado que ya viene en el HTML (Garza.astro): este
   módulo no crea ni un botón. La razón es la de siempre en este
   proyecto — si el script no llega, lo que queda en pantalla tiene que
   ser algo honesto, y un <details> con seis colores y diez frases que
   no hacen nada no lo es. Por eso el panel nace con `hidden` puesto en
   el HTML y lo enciende esta función: sin JavaScript no hay panel, y
   sin panel no hay control muerto.                                  */
export function montarPanel(raiz = document) {
  const caja = raiz.querySelector('[data-garza-panel]');
  if (!caja) return null;

  caja.hidden = false;

  const picos  = caja.querySelector('[data-garza-picos]');
  const frases = caja.querySelector('[data-garza-frases]');
  const parte  = caja.querySelector('[data-garza-parte]');
  const quitar = caja.querySelector('[data-garza-olvidar]');

  const nombreDe = (color) =>
    (PICOS.find((x) => x.color === color) || PICOS[0]).nombre.toLowerCase();

  function pintar(p) {
    for (const b of picos?.querySelectorAll('[data-pico]') || []) {
      b.setAttribute('aria-pressed', String(b.dataset.pico === (leer()?.pico || '')));
    }
    for (const b of frases?.querySelectorAll('[data-frase]') || []) {
      b.setAttribute('aria-pressed',
        String(Number(b.dataset.frase) === (p.fraseIdx ?? -1)));
    }
    if (quitar) quitar.hidden = !p.elegido;
    if (parte) {
      /* El aviso es para quien no ve el cuadro: cambiar el pico de una
         garza que está a treinta píxeles de aquí no lo anuncia nadie.
         Se dice lo que quedó puesto, no lo que se pulsó. */
      parte.textContent = !p.elegido
        ? ''
        : p.frase
          ? `Tu garza lleva el pico ${nombreDe(p.pico)} y dice «${p.frase}».`
          : `Tu garza lleva el pico ${nombreDe(p.pico)}.`;
    }
  }

  caja.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || !caja.contains(b)) return;

    if (b.hasAttribute('data-garza-olvidar')) { pintar(olvidar()); return; }

    if (b.dataset.pico !== undefined) {
      /* Pulsar el que ya está puesto lo quita, como las flechas del
         foro: un control de dos estados que no se puede deshacer es una
         trampa, y aquí deshacer significa volver a no haber elegido. */
      const puesto = leer()?.pico || '';
      pintar(ponerPico(b.dataset.pico === puesto ? null : b.dataset.pico));
      return;
    }
    if (b.dataset.frase !== undefined) {
      const idx = Number(b.dataset.frase);
      pintar(ponerFrase(perfil().fraseIdx === idx ? null : idx));
    }
  });

  pintar(perfil());
  /* Y se anuncia de salida lo que ya hubiera guardado de antes: al
     volver de /comunidad la pestaña arranca con su elección puesta y
     las demás tienen que enterarse sin esperar a que se toque nada. */
  const p = perfil();
  anunciar({ pico: leer()?.pico || null, frase: p.fraseIdx });
  return { pintar };
}

export { FRASES, PICOS };
