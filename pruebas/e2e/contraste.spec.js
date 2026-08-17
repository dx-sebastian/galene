/* ═══════════════════════════════════════════════════════════════════
   Galene — que el héroe se lea a todas horas.

   LO QUE ENCONTRÓ LA AUDITORÍA de la edición 0ef0013, midiendo los
   píxeles de verdad en un teléfono a las 13:00:

       GALENE (.titulo)      blanco sobre rgb(175,197,222)   1,77:1
       .hero__declaracion    blanco sobre rgb(196,212,230)   1,51:1
       .hero__enlace (CTA)   blanco sobre rgb(169,191,218)   1,88:1

   El umbral de la AA es 4,5:1, y 3:1 para el texto grande. O sea que
   la primera pantalla —la marca, la frase y el único botón— estaba por
   debajo del suelo a plena luz del día. De noche subía a 16:1, que es
   exactamente por qué nadie lo había visto: el sitio se mira de noche.

   ── POR QUÉ NINGUNA HERRAMIENTA AUTOMÁTICA LO VE ───────────────────
   Porque el fondo del héroe no está en ninguna hoja de estilos: lo
   pinta un shader. Un auditor que lea `background-color` encuentra
   `transparent` y da el visto bueno. La única medida honesta es mirar
   la lámina.

   ── CÓMO SE MIDE AQUÍ ──────────────────────────────────────────────
   1. Se fija la hora con `?hora=N` y se fuerza el shader con
      `?auditar-mar=1` (sin eso, un navegador automatizado cae al
      respaldo estático y mediríamos otra cosa).
   2. Se apaga el movimiento, para que la escena dibuje UN cuadro
      quieto y las dos capturas del punto siguiente coincidan.
   3. Se vuelve la tinta transparente y se captura: eso deja a la vista
      el fondo exacto que hay detrás de cada letra, con el lavado
      puesto. Nada de suponerlo por una banda de al lado.
   4. Contra ese fondo se calcula el contraste del color que la tinta
      tenía antes, con el umbral que le toca a su tamaño.

   Se exige un 10 % por encima del umbral: sin margen, un retoque de
   paleta vuelve a tumbarlo y nadie se entera hasta la siguiente
   auditoría.
   ═══════════════════════════════════════════════════════════════════ */
import { test, expect } from '@playwright/test';

/* Siete horas repartidas por el día: el amanecer y el atardecer son los
   momentos difíciles —cielo claro y tinta clara— y la noche es el caso
   fácil, que también hay que vigilar por si el arreglo del día se pasa
   de frenada y oscurece de más. */
const HORAS = [5, 7, 9, 13, 17, 19, 23];

/* Con su densidad de píxeles de verdad. Medir el «móvil» a dpr 1 no
   es medir un teléfono: el shader elige otra resolución de salida, las
   estrellas caen sobre otra rejilla y el resultado difiere casi un
   punto de contraste. */
const VISTAS = [
  ['móvil', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
              isMobile: true, hasTouch: true }],
  ['escritorio', { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }],
];

/* Lo que se lee sobre la pintura. La marca y el subtítulo son UNA
   unidad visual pero tienen tamaños muy distintos, así que se miden por
   separado: a cada uno su umbral. */
const PIEZAS = ['.titulo', '.lockup', '.hero__declaracion', '.hero__enlace'];

const MARGEN = 1.1;

for (const [vista, opciones] of VISTAS) {
  test.describe(`contraste · ${vista}`, () => {
    /* Movimiento apagado: la escena dibuja un cuadro y se queda quieta,
       así la captura con tinta y la captura sin tinta son el mismo
       instante. El calibrador del sitio ya contempla este modo (ver
       `enArranque()` en js/main.js). */
    test.use({ ...opciones, reducedMotion: 'reduce' });

  for (const hora of HORAS) {
    test(`a las ${String(hora).padStart(2, '0')}:00`, async ({ page }) => {
      await page.goto(`?auditar-mar=1&hora=${hora}`, { waitUntil: 'load' });
      await page.waitForFunction(() => !document.querySelector('.cargador'),
        null, { timeout: 60_000 }).catch(() => {});
      await page.waitForTimeout(2500);

      /* La tinta y la caja de cada pieza, ANTES de volverla invisible. */
      const piezas = await page.evaluate((sels) => sels.map((sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (r.width < 2 || r.height < 2) return null;
        const px = parseFloat(cs.fontSize);
        const negrita = Number(cs.fontWeight) >= 700;
        return {
          sel, x: r.x, y: r.y, w: r.width, h: r.height,
          color: cs.color, px,
          /* Los umbrales de la AA: 3:1 para el texto grande —24 px, o
             18,66 px en negrita— y 4,5:1 para todo lo demás. */
          umbral: (px >= 24 || (px >= 18.66 && negrita)) ? 3 : 4.5,
        };
      }), PIEZAS);

      const vivas = piezas.filter(Boolean);
      expect(vivas.length, 'las cuatro piezas del héroe tienen que existir')
        .toBe(PIEZAS.length);

      /* La tinta se vuelve transparente y con ella su sombra. El lavado
         —que es un pseudoelemento de `.hero__texto`— se queda, porque
         forma parte del fondo que hay que medir. */
      await page.addStyleTag({ content: `
        .hero__texto, .hero__texto *, .hero__deslizar, .hero__deslizar * {
          color: transparent !important;
          text-shadow: none !important;
          -webkit-text-fill-color: transparent !important;
        }` });
      await page.waitForTimeout(500);
      const captura = (await page.screenshot()).toString('base64');

      const medidas = await page.evaluate(async ({ piezas, captura }) => {
        const img = new Image();
        img.src = 'data:image/png;base64,' + captura;
        await img.decode();
        const lienzo = document.createElement('canvas');
        lienzo.width = img.width; lienzo.height = img.height;
        lienzo.getContext('2d').drawImage(img, 0, 0);
        const k = img.width / window.innerWidth;   // la captura va en píxeles físicos

        const linz = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
        const lum = (r, g, b) =>
          0.2126 * linz(r / 255) + 0.7152 * linz(g / 255) + 0.0722 * linz(b / 255);

        return piezas.map((p) => {
          const x = Math.max(0, Math.round(p.x * k));
          const y = Math.max(0, Math.round(p.y * k));
          const w = Math.min(Math.round(p.w * k), lienzo.width - x);
          const h = Math.min(Math.round(p.h * k), lienzo.height - y);
          const datos = lienzo.getContext('2d').getImageData(x, y, w, h).data;

          /* ── SE MIDE A LA ESCALA DEL TRAZO, NO DEL PÍXEL ───────────
             De noche el cielo es un campo de estrellas, y una estrella
             mide uno o dos píxeles. Tomando el percentil sobre píxeles
             sueltos, media docena de estrellas dentro de la caja de un
             enlace lo tumbaban de 15:1 a 1,17:1 — y eso no es lo que ve
             nadie: el trazo de una letra es más ancho que una estrella
             y el ojo integra a lo largo del trazo.

             Así que primero se promedia en baldosas del ancho de un
             trazo y después se saca el percentil. El disco de la luna
             —que es una mancha grande— sigue contando entero; el polvo
             de estrellas deja de mandar. Es el mismo razonamiento que
             ya está escrito en `medirZona()` de js/mar.js, llevado al
             tamaño de caja que se mide aquí. */
          const baldosa = Math.max(2, Math.round(3 * k));
          const ls = [];
          for (let by = 0; by < h; by += baldosa) {
            for (let bx = 0; bx < w; bx += baldosa) {
              let suma = 0, n = 0;
              for (let dy = 0; dy < baldosa && by + dy < h; dy++) {
                for (let dx = 0; dx < baldosa && bx + dx < w; dx++) {
                  const i = ((by + dy) * w + (bx + dx)) * 4;
                  suma += lum(datos[i], datos[i + 1], datos[i + 2]); n++;
                }
              }
              if (n) ls.push(suma / n);
            }
          }
          ls.sort((a, b) => a - b);
          const pct = (q) => ls[Math.min(ls.length - 1, Math.floor(q * ls.length))];

          const [tr, tg, tb] = p.color.match(/[\d.]+/g).map(Number);
          const lt = lum(tr, tg, tb);
          /* El peor píxel manda, pero por percentil y no por extremo:
             con el máximo absoluto, UNA estrella detrás del rótulo
             tumbaba la medida. Es el mismo criterio que usa el
             calibrador del sitio (ver `p995` en js/mar.js).
             Tinta clara → el peor fondo es el más claro, y al revés. */
          const peor = lt > 0.35 ? pct(0.995) : pct(0.005);
          const [hi, lo] = lt > peor ? [lt, peor] : [peor, lt];
          const medio = ls.reduce((a, b) => a + b, 0) / ls.length;
          return {
            sel: p.sel, px: p.px, umbral: p.umbral, color: p.color,
            razon: (hi + 0.05) / (lo + 0.05),
            fondoMedio: medio,
          };
        });
      }, { piezas: vivas, captura });

      const fallos = medidas
        .filter((m) => m.razon < m.umbral * 1.1)
        .map((m) => `${m.sel} (${Math.round(m.px)}px, tinta ${m.color}) `
          + `${m.razon.toFixed(2)}:1 · pide ${(m.umbral * 1.1).toFixed(2)}:1`);

      /* El detalle sale siempre, no solo al fallar: el número medido es
         la evidencia de la fase 1 del plan de cierre. */
      console.log(`  ${vista} ${String(hora).padStart(2, '0')}:00  `
        + medidas.map((m) => `${m.sel.replace(/^\./, '')} ${m.razon.toFixed(2)}`).join('  '));

      expect(fallos.join('\n'),
        `Contraste insuficiente en el héroe (${vista}, ${hora}:00)`).toBe('');
    });
  }
  });
}
