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
      /* ── SE MIRA DESDE DENTRO, Y NO ASOMÁNDOSE ────────────────────
         Esto era un `waitForFunction` que esperaba a ver la clase
         `entrando` y después preguntaba, desde fuera, qué animación
         tenía cada pieza. Y era una carrera perdida a medias: la clase
         solo vive dos segundos —`entrada.js` la quita por tiempo o al
         primer gesto— y entre que el sondeo la ve y llega la siguiente
         orden hay un viaje de ida y vuelta. Con el mar por software un
         fotograma puede tardar medio segundo, así que la ventana se
         cerraba: dos de cada tres ejecuciones en escritorio decían que
         la pintura no entraba, y entraba.

         Ahora el testigo se instala ANTES de cargar y anota las
         animaciones en el mismo turno en que la clase aparece. No hay
         ventana que perder: si la entrada ocurrió, quedó escrita. */
      await page.addInitScript((piezas) => {
        window.__entrada = null;
        const nombre = (sel) => {
          const el = document.querySelector(sel);
          return el ? getComputedStyle(el).animationName : '(no existe)';
        };
        const mira = new MutationObserver(() => {
          if (!document.documentElement.classList.contains('entrando')) return;
          window.__entrada = {
            mundo: nombre('.mundo'),
            piezas: Object.fromEntries(piezas.map((s) => [s, nombre(s)])),
          };
          mira.disconnect();
        });
        /* Se vigila `document` con `subtree`, NO `document.documentElement`:
           este guion corre antes que cualquier otro de la página, y ahí
           `<html>` puede no existir todavía. Observar null lanza, el
           testigo nunca se instalaba y la espera se iba a los 60 s. */
        mira.observe(document,
          { attributes: true, attributeFilter: ['class'], subtree: true });
      }, PIEZAS);

      await page.goto('?auditar-mar=1', { waitUntil: 'commit' });
      await page.waitForFunction(() => window.__entrada !== null,
        null, { timeout: 60_000 });
      const puestas = await page.evaluate(() => window.__entrada);

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

/* ═══════════════════════════════════════════════════════════════════
   LA LLEGADA DE LOS BLOQUES, y las cuatro cosas que no puede costar.

   De la mitad de la página para abajo todo estaba ya puesto. Ahora los
   bloques llegan al entrar en pantalla — y un efecto de aparición en un
   sitio con rutas de atención es exactamente donde hay que ser
   quisquilloso, porque el modo de fallar es dejar contenido invisible.

   1 · La ayuda NO se apunta. `#ayuda` lleva el 155, SALVIA y el 123, y
       está a una pantalla del héroe: entra en escena justo cuando un
       observador podría no haberse disparado. Se comprueba que sus
       enlaces son visibles sin haber bajado.
   2 · Nada se esconde sin JavaScript. La clase que habilita el efecto
       la pone el guion; sin él la hoja no oculta un píxel.
   3 · Cero desplazamiento de maqueta.
   4 · Con movimiento reducido no ocurre: ni clase, ni opacidades.
   ═══════════════════════════════════════════════════════════════════ */
test.describe('llegada', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('llegada · los bloques de abajo llegan, y los de arriba ya están', async ({ page }) => {
    await page.goto('./', { waitUntil: 'load', timeout: 90_000 });
    await page.waitForTimeout(1200);

    const antes = await page.evaluate(() => ({
      clase: document.documentElement.classList.contains('con-llegada'),
      porLlegar: document.querySelectorAll('.por-llegar').length,
      llegados: document.querySelectorAll('.llegado').length,
      /* La ayuda, sin bajar: sus dos canales tienen que estar visibles. */
      ayudaOculta: [...document.querySelectorAll('#ayuda a')]
        .filter((a) => parseFloat(getComputedStyle(a).opacity) < 0.9).length,
    }));
    console.log(`  al cargar: con-llegada=${antes.clase}`
      + ` · por llegar ${antes.porLlegar} · ayuda oculta ${antes.ayudaOculta}`);

    expect(antes.clase, 'el guion tiene que habilitar el efecto').toBe(true);
    expect(antes.porLlegar, 'algo tiene que quedar por llegar').toBeGreaterThan(3);
    expect(antes.ayudaOculta,
      'la ayuda no puede estar escondida esperando a un observador').toBe(0);

    /* Y al bajar, llegan. */
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) {
        window.scrollTo(0, y);
        await new Promise((r) => requestAnimationFrame(r));
      }
    });
    await page.waitForTimeout(1200);
    const despues = await page.evaluate(() => ({
      porLlegar: document.querySelectorAll('.por-llegar').length,
      llegados: document.querySelectorAll('.llegado').length,
    }));
    console.log(`  tras bajar: llegados ${despues.llegados}`
      + ` · siguen por llegar ${despues.porLlegar}`);
    expect(despues.llegados, 'nada llegó').toBeGreaterThan(3);
    expect(despues.porLlegar, 'algo se quedó sin llegar después de recorrer la página').toBe(0);
  });

  test('llegada · con movimiento reducido no ocurre', async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce',
    });
    const page = await ctx.newPage();
    await page.goto('./', { waitUntil: 'load', timeout: 90_000 });
    await page.waitForTimeout(1000);
    const r = await page.evaluate(() => ({
      clase: document.documentElement.classList.contains('con-llegada'),
      porLlegar: document.querySelectorAll('.por-llegar').length,
      /* Y ni un bloque a media opacidad. */
      atenuados: [...document.querySelectorAll('.bloque, .experto, .resonancia')]
        .filter((el) => el.getClientRects().length
          && parseFloat(getComputedStyle(el).opacity) < 0.99).length,
    }));
    console.log(`  reducido: con-llegada=${r.clase} · por llegar ${r.porLlegar}`
      + ` · atenuados ${r.atenuados}`);
    expect(r.clase, 'con movimiento reducido el efecto no se habilita').toBe(false);
    expect(r.porLlegar).toBe(0);
    expect(r.atenuados, 'con movimiento reducido no puede quedar nada a medias').toBe(0);
    await ctx.close();
  });

  test('llegada · sin JavaScript no se esconde nada', async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 }, javaScriptEnabled: false,
    });
    const page = await ctx.newPage();
    await page.goto('./', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForTimeout(600);
    const invisibles = await page.evaluate(() =>
      [...document.querySelectorAll('.bloque, .experto, .resonancia, #ayuda a')]
        .filter((el) => el.getClientRects().length
          && parseFloat(getComputedStyle(el).opacity) < 0.99).length);
    console.log(`  sin JS: elementos por debajo de opacidad 1 → ${invisibles}`);
    expect(invisibles,
      'sin JavaScript la hoja no puede esconder contenido').toBe(0);
    await ctx.close();
  });
});
