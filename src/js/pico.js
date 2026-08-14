/* ═══════════════════════════════════════════════════════════════════
   pico.js — EL PICO DE COLOR Y EL GLOBO DE LA FRASE.

   Dos cosas que solo tienen las garzas CON IDENTIDAD —la de quien mira
   y las de quien más esté— y ninguna de las del manglar. Es la
   distinción que hace que el cuadro siga siendo un cuadro: la bandada
   es paisaje y no se personaliza; estas dos son personas.

   ── CÓMO SE TIÑE UN PICO PINTADO A LA ACUARELA ────────────────────
   No se dibuja un pico nuevo encima. Se usa LA PROPIA LÁMINA COMO
   MÁSCARA: un rectángulo del color elegido, enmascarado con el PNG del
   ave y recortado a la caja del pico. Lo que sale coloreado es
   exactamente la tinta que el ave ya tenía ahí, con sus bordes mojados
   y su granulado — no un triángulo de vector encima de una acuarela,
   que es lo que se vería como una pegatina.

   ── LAS CAJAS SON MEDIDAS, NO A OJO ───────────────────────────────
   Se midieron sobre las seis láminas de posada buscando la punta del
   pico (la columna de tinta más adelantada del tercio superior) y
   siguiendo el trazo hacia la cabeza hasta que la columna se dispara,
   que es donde empieza el cráneo. Cinco salieron limpias a la primera y
   se comprobaron pintando la caja en rojo sobre cada lámina.

   `pMira` va a `null`, y eso también es una medida: en esa pose el ave
   se está acicalando, tiene la cabeza metida entre las plumas y EL PICO
   NO SE VE. No se puede teñir lo que no está pintado, así que en esa
   pose —dos segundos de un ciclo de gestos— el pico no se tiñe. Antes
   que inventarle un pico a un ave que la escondió.
   ═══════════════════════════════════════════════════════════════════ */

/* [x0, y0, x1, y1] en fracciones de la lámina. */
export const PICO_CAJA = {
  posada:   [0.013, 0.141, 0.252, 0.192],
  pAlerta:  [0.000, 0.021, 0.258, 0.090],
  pEncoge:  [0.000, 0.094, 0.185, 0.166],
  pUnaPata: [0.013, 0.069, 0.232, 0.121],
  pAlas:    [0.010, 0.040, 0.250, 0.125],
  pMira:    null,
};

/* ── EL TINTE DE UN AVE ────────────────────────────────────────────
   UNO por ave, no uno por lámina. El ave tiene seis poses y en cada
   cuadro se ve una (o dos cruzándose); el tinte se pone la máscara de
   la DOMINANTE y copia su caja. Durante el cruce de dos poses hay una
   fracción de segundo en que la máscara es la de la que se va, y no se
   nota: las dos tienen el pico en el mismo sitio del cuadro porque las
   dos se anclan por los pies. */
export function crearTinte(contenedor, fuenteDe) {
  const el = document.createElement('div');
  el.className = 'pico-tinte';
  el.setAttribute('aria-hidden', 'true');
  el.style.opacity = '0';
  contenedor.appendChild(el);

  let ultimaClave = null;

  return {
    el,
    /** Copia la colocación de la lámina dominante y se tiñe. */
    poner(clave, color, anchoPx, altoPx, izq, arr, resto, origen) {
      const caja = PICO_CAJA[clave];
      if (!color || !caja) { this.apagar(); return; }

      if (clave !== ultimaClave) {
        const url = fuenteDe(clave);
        el.style.webkitMaskImage = `url("${url}")`;
        el.style.maskImage = `url("${url}")`;
        el.style.clipPath = `inset(${(caja[1] * 100).toFixed(2)}% ` +
          `${((1 - caja[2]) * 100).toFixed(2)}% ` +
          `${((1 - caja[3]) * 100).toFixed(2)}% ` +
          `${(caja[0] * 100).toFixed(2)}%)`;
        ultimaClave = clave;
      }
      el.style.background = color;
      el.style.width = anchoPx.toFixed(1) + 'px';
      el.style.height = altoPx.toFixed(1) + 'px';
      el.style.transformOrigin = origen || '50% 50%';
      el.style.transform =
        `translate3d(${izq.toFixed(1)}px, ${arr.toFixed(1)}px, 0)${resto || ''}`;
      el.style.opacity = '1';
    },
    apagar() { if (el.style.opacity !== '0') el.style.opacity = '0'; },
    quitar() { el.remove(); },
  };
}

/* ═══ EL GLOBO ════════════════════════════════════════════════════
   Aparece al pasar el ratón por encima de una garza que lleve frase.

   ── POR QUÉ NO SE CUELGA DE UN `mouseover` EN LA LÁMINA ───────────
   Porque las láminas están dentro de `#garzas`, que es `pointer-events:
   none`, y quitarle eso rompería el gesto de sostener el agua: el dedo
   dejaría de llegar al lienzo cada vez que pasara por encima de un ave.
   Así que el acierto se calcula: cada ave con identidad publica su caja
   en pantalla cuadro a cuadro (`registrar`) y aquí se mira si el
   puntero cae dentro. Nada captura el puntero y el mar sigue siendo
   tocable en toda su superficie.

   La caja se agranda un poco (`HOLGURA`) porque la silueta de una garza
   es estrecha y su caja envolvente está casi vacía: pedir puntería de
   dos píxeles sobre un cuello sería un control que solo funciona con
   ratón y con pulso firme.

   ── Y EN TÁCTIL ───────────────────────────────────────────────────
   No hay «pasar por encima», así que un toque sobre el ave enseña su
   frase y NO empieza el gesto de calma. Es lo que hace `tocaAve()`, que
   consulta main.js antes de abrir un anillo en el agua. Sin esto,
   tocar a la garza calmaría el mar sin decir nada, que es exactamente
   la clase de gesto ambiguo que este sitio no quiere. */
const HOLGURA = 10;
const zonas = new Map();          // id → {x, y, w, h, frase}
let globo = null, puntero = null, fijado = null;

export function registrar(id, caja) {
  if (caja) zonas.set(id, caja); else zonas.delete(id);
}

const dentro = (z, x, y) =>
  x >= z.x - HOLGURA && x <= z.x + z.w + HOLGURA &&
  y >= z.y - HOLGURA && y <= z.y + z.h + HOLGURA;

/** ¿El punto cae sobre una garza con frase? Devuelve su id o null. */
export function aveEn(x, y) {
  for (const [id, z] of zonas) if (z.frase && dentro(z, x, y)) return id;
  return null;
}

export function montarGlobo() {
  if (globo) return globo;
  globo = document.createElement('p');
  globo.className = 'globo-garza';
  globo.setAttribute('role', 'status');
  globo.setAttribute('aria-live', 'polite');
  document.body.appendChild(globo);

  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    puntero = { x: e.clientX, y: e.clientY };
    refrescar();
  }, { passive: true });

  /* Al salir de la ventana el globo se va: si no, se queda colgado en el
     último sitio donde estuvo el ratón. */
  addEventListener('pointerleave', () => { puntero = null; refrescar(); });
  addEventListener('scroll', () => { fijado = null; refrescar(); }, { passive: true });

  return globo;
}

/** Enseña la frase de un ave sin puntero: es lo que usa el táctil. */
export function fijar(id) {
  fijado = id;
  refrescar();
  clearTimeout(fijar.reloj);
  fijar.reloj = setTimeout(() => { fijado = null; refrescar(); }, 3200);
}

export function refrescar() {
  if (!globo) return;
  const id = fijado || (puntero ? aveEn(puntero.x, puntero.y) : null);
  const z = id ? zonas.get(id) : null;
  if (!z || !z.frase) { globo.dataset.visible = '0'; return; }

  globo.textContent = z.frase;
  globo.dataset.visible = '1';

  /* Encima del ave y centrado en ella, y metido a la fuerza dentro de
     la ventana: una frase que se sale por la derecha no se lee. Se mide
     DESPUÉS de escribir el texto porque el ancho depende de él. */
  const caja = globo.getBoundingClientRect();
  const x = Math.min(Math.max(8, z.x + z.w / 2 - caja.width / 2),
                     innerWidth - caja.width - 8);
  /* Si arriba no cabe, baja: en el canto superior de la pantalla el
     globo se saldría, y una garza puede estar posada en la copa. */
  const arriba = z.y - caja.height - 10;
  const y = arriba > 8 ? arriba : z.y + z.h + 10;
  globo.style.translate = `${Math.round(x)}px ${Math.round(y)}px`;
}
