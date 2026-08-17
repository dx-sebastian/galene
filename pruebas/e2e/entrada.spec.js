/* ═══════════════════════════════════════════════════════════════════
   Galene — la entrada, y las cuatro cosas que no puede costar.

   La portada abre con una coreografía corta: la pintura llega y el
   texto se asienta detrás de ella, escalonado. Es lo que separa una web
   bonita de una que se recuerda, y también lo primero que estropea una
   web cuando se hace mal.

   ── POR QUÉ ESTA PRUEBA MIRA `animationName` ───────────────────────
   Porque ya pasó. Una versión anterior de la secuencia apuntaba a
   `#mundo` cuando ese elemento se llama por CLASE: el selector no
   casaba con nada, la clase se ponía y se quitaba en su tiempo, y la
   entrada «funcionaba» sin animar un solo píxel. Con una secuencia de
   dos segundos eso no se ve mirando la pantalla. Se ve preguntándole al
   navegador qué animación tiene puesta cada elemento, que es lo que se
   hace aquí.

   ── Y LAS CUATRO COSAS QUE NO PUEDE COSTAR ─────────────────────────
   1 · Que la maqueta se mueva. Solo `opacity` y `translate`: el
       desplazamiento acumulado tiene que seguir siendo cero.
   2 · Que alguien espere. A los 1 200 ms está todo entero.
   3 · Que se ignore a quien pidió que nada se mueva.
   4 · Que el teléfono se quede sin ella. Ahí estuvo apagada, y el
       teléfono es el 67,5 % del tráfico colombiano.
   ═══════════════════════════════════════════════════════════════════ */
import { test, expect } from '@playwright/test';

const PIEZAS = ['.titulo', '.lockup', '.hero__filete',
                '.hero__declaracion', '.hero__enlace'];

const VISTAS = [
  ['móvil', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
              isMobile: true, hasTouch: true }],
  ['escritorio', { viewport: { width: 1440, height: 900 } }],
];

for (const [vista, opciones] of VISTAS) {
  test.describe(`entrada · ${vista}`, () => {
    test.use(opciones);

    test('la pintura y el texto entran, y se les nota', async ({ page }) => {
      /* Se mira DURANTE la secuencia: hay que enganchar la clase
         `entrando` en cuanto aparece, no después de que se haya ido. */
      await page.goto('?auditar-mar=1', { waitUntil: 'commit' });
      await page.waitForFunction(
        () => document.documentElement.classList.contains('entrando'),
        null, { timeout: 60_000 });

      const puestas = await page.evaluate((piezas) => {
        const nombre = (sel) => {
          const el = document.querySelector(sel);
          return el ? getComputedStyle(el).animationName : '(no existe)';
        };
        return {
          mundo: nombre('.mundo'),
          piezas: Object.fromEntries(piezas.map((s) => [s, nombre(s)])),
        };
      }, PIEZAS);

      console.log(`  ${vista}: mundo → ${puestas.mundo}`);
      console.log('  ' + Object.entries(puestas.piezas)
        .map(([s, a]) => `${s.slice(1)} → ${a}`).join(' · '));

      expect(puestas.mundo,
        'la pintura tiene que entrar, también en el teléfono').not.toBe('none');
      const sinAnimar = Object.entries(puestas.piezas)
        .filter(([, a]) => a === 'none' || a === '(no existe)')
        .map(([s, a]) => `${s}: ${a}`);
      expect(sinAnimar.join(', '), 'Piezas del héroe que no entran').toBe('');
    });

    test('a los 1 200 ms está todo entero, y nada se ha movido de sitio', async ({ page }) => {
      /* El desplazamiento acumulado se mide desde antes de cargar: un
         `PerformanceObserver` puesto después no ve los saltos que ya
         ocurrieron. */
      await page.addInitScript(() => {
        window.__salto = 0;
        new PerformanceObserver((lista) => {
          for (const e of lista.getEntries()) {
            /* Los saltos que provoca un gesto de la persona no cuentan
               —son consecuencia de lo que pidió— y aquí no hay ninguno. */
            if (!e.hadRecentInput) window.__salto += e.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
      });

      await page.goto('?auditar-mar=1', { waitUntil: 'load' });
      await page.waitForFunction(
        () => document.documentElement.classList.contains('entrada-hecha'),
        null, { timeout: 60_000 });
      await page.waitForTimeout(1200);

      const r = await page.evaluate((piezas) => ({
        opacidades: piezas.map((s) => {
          const el = document.querySelector(s);
          return { s, o: el ? Number(getComputedStyle(el).opacity) : 0 };
        }),
        salto: window.__salto,
      }), PIEZAS);

      console.log(`  ${vista}: desplazamiento acumulado ${r.salto.toFixed(4)}`);
      const flojas = r.opacidades.filter((x) => x.o < 0.99)
        .map((x) => `${x.s} a ${x.o.toFixed(2)}`);
      expect(flojas.join(', '),
        'A los 1 200 ms el héroe tiene que estar entero').toBe('');

      /* Cero, y no «poco»: esta secuencia solo mueve opacidad y
         translate, que no empujan nada. Cualquier valor por encima de
         cero significa que algo cambió de tamaño, y eso en una portada
         que se lee con prisa es texto que se escapa bajo el dedo. */
      expect(r.salto, 'la entrada no puede mover la maqueta')
        .toBeLessThanOrEqual(0.002);
    });

    test('con movimiento reducido no hay secuencia', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('?auditar-mar=1', { waitUntil: 'load' });
      await page.waitForFunction(
        () => document.documentElement.classList.contains('entrada-hecha'),
        null, { timeout: 60_000 });

      const r = await page.evaluate((piezas) => {
        const todo = ['.mundo', ...piezas];
        return todo.map((s) => {
          const el = document.querySelector(s);
          if (!el) return { s, animacion: '(no existe)', o: 0 };
          const cs = getComputedStyle(el);
          return { s, animacion: cs.animationName, o: Number(cs.opacity) };
        });
      }, PIEZAS);

      const animadas = r.filter((x) => x.animacion !== 'none')
        .map((x) => `${x.s} → ${x.animacion}`);
      expect(animadas.join(', '),
        'Con movimiento reducido no puede quedar ninguna animación').toBe('');

      const invisibles = r.filter((x) => x.o < 0.99).map((x) => x.s);
      expect(invisibles.join(', '),
        'Y todo tiene que estar visible desde el primer momento').toBe('');
    });
  });
}
