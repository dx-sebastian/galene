/* ═══════════════════════════════════════════════════════════════════
   LAS GARZAS — la propia, las de quien más esté, y el globo.

   Estas pruebas piden el mar de verdad con `?auditar-mar=1`: sin él,
   mar.js detecta que el WebGL de este entorno es por software y se cae
   al respaldo CSS a propósito (ver `crear()`), y en el respaldo no hay
   garzas que mirar. Ese parámetro no es un truco de las pruebas — es el
   asidero que ese código ya tenía para poder auditarse.
   ═══════════════════════════════════════════════════════════════════ */
import { test, expect } from '@playwright/test';
import { CON_MAR, SIN_PRESENCIA, esperarGarzas, esperarHero, cajaDeMiGarza, esperarVivas } from './comun.js';

const SOLA = `.${CON_MAR}&${SIN_PRESENCIA}`;

/* ── LO QUE NO SE PRUEBA, Y POR QUÉ ────────────────────────────────
   La personalización (pico de color, frase elegida, su panel y el
   globo al pasar el ratón) quedó FUERA DEL MVP: el disparador «Tu
   garza» ya no se monta en la portada, así que aquí no hay panel que
   abrir. Sus pruebas se retiraron con él — el circuito de presencia,
   que no depende del panel, conserva las suyas. */

test.describe('quién más está', () => {
  test('sin nadie más no hay ninguna garza de presencia', async ({ page }) => {
    await page.goto(SOLA);
    await esperarGarzas(page);
    expect(await page.evaluate(() => window.__garzas.presentes())).toEqual([]);
    /* Y el aviso de manos está callado: solo habla cuando hay una mano
       ajena en el agua. */
    await expect(page.locator('.manos')).toHaveAttribute('data-visible', '0');
  });

  test('otra pestaña añade una garza, con su pico y su frase, y se la lleva al cerrarse',
    async ({ page, context }) => {
      await page.goto(`.${CON_MAR}`);
      await esperarGarzas(page);
      expect(await page.evaluate(() => window.__garzas.presentes())).toEqual([]);

      /* La segunda pestaña va SIN el mar: solo tiene que existir y
         anunciarse. Montar dos escenas WebGL por software en el mismo
         navegador multiplica el tiempo de la prueba por cinco sin
         comprobar nada más. */
      const otra = await context.newPage();
      await otra.goto('.');
      await otra.waitForFunction(() => Boolean(window.__presencia));
      await otra.evaluate(() => window.__presencia.anunciar({ pico: '#C4553F', frase: 2 }));

      await esperarVivas(page, 1);
      await page.waitForFunction(() => window.__garzas.presentes().length === 1);

      const [garza] = await page.evaluate(() => window.__garzas.presentes());
      expect(garza.pico).toBe('#C4553F');
      expect(garza.frase).toBe('Te creo.');
      /* Y está posada de verdad, con percha propia: si no cupiera en
         esta ventana se apagaría en vez de flotar. */
      expect(garza.puesta).toBe(true);

      await otra.close();
      await esperarVivas(page, 0);
      await page.waitForFunction(() => window.__garzas.presentes().length === 0);
    });

  test('una frase que no existe en la lista no pinta nada', async ({ page, context }) => {
    await page.goto(`.${CON_MAR}`);
    await esperarGarzas(page);

    const otra = await context.newPage();
    await otra.goto('.');
    await otra.waitForFunction(() => Boolean(window.__presencia));
    /* Una pestaña con OTRA VERSIÓN del sitio podría mandar un índice que
       aquí no significa nada. Se cae y la garza sale con su pico de
       siempre en vez de romper el cuadro. */
    await otra.evaluate(() => window.__presencia.anunciar({ pico: 'no-es-un-color', frase: 999 }));

    await page.waitForFunction(() => window.__garzas.presentes().length === 1);
    const [garza] = await page.evaluate(() => window.__garzas.presentes());
    expect(garza.pico).toBe(null);
    expect(garza.frase).toBe(null);
    await otra.close();
  });
});

test.describe('el mar en calma', () => {
  test('sostener el dedo calma el agua, y al soltar no vuelve atrás', async ({ page }) => {
    await page.goto(`.${CON_MAR}&${SIN_PRESENCIA}&dev=1`);
    await esperarGarzas(page);

    const calma = () => page.evaluate(() => window.__hero.estado().calma);
    const antes = await calma();

    /* Sobre el agua, o sea por debajo del horizonte. El gesto solo
       cuenta ahí: en el cielo no hay nada que aquietar. */
    const p = await page.evaluate(() => {
      const c = document.getElementById('mar').getBoundingClientRect();
      return { x: Math.round(c.width * 0.3), y: Math.round(c.height * 0.88) };
    });
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.waitForFunction((antes) => window.__hero.estado().calma > antes + 0.01, antes,
      { timeout: 20_000 });
    const sosteniendo = await calma();
    await page.mouse.up();

    /* «Lo que dejas, queda»: al soltar, lo calmado se queda calmado. La
       curva es monótona por diseño — ver `avanzarToques` en main.js. */
    await page.waitForTimeout(1200);
    expect(await calma()).toBeGreaterThanOrEqual(sosteniendo);
    expect(await calma()).toBeGreaterThan(antes);
  });

  test('se nota cuando alguien más sostiene: lo dice y calma más deprisa',
    async ({ page, context }) => {
      await page.goto(`.${CON_MAR}&dev=1`);
      await esperarGarzas(page);

      const otra = await context.newPage();
      await otra.goto('.');
      await otra.waitForFunction(() => Boolean(window.__presencia));
      await esperarVivas(page, 1);

      const aviso = page.locator('.manos');
      await expect(aviso).toHaveAttribute('data-visible', '0');

      const antes = await page.evaluate(() => window.__hero.estado().calma);
      /* La otra pestaña anuncia su mano igual que lo hace su
         `pointerdown`. Se hace así y no con un clic real porque para
         que la mano de al lado CUENTE hay que dejar esta pestaña
         delante: en segundo plano el navegador estrangula su bucle y no
         habría con qué medir. */
      await otra.evaluate(() => window.__presencia.anunciar({ sostiene: { x: 0.5, y: 0.2 } }));

      await expect(aviso).toHaveAttribute('data-visible', '1');
      await expect(aviso).toContainText('Alguien más está calmando el mar');
      expect(await page.evaluate(() => window.__presencia.manosAjenas())).toBe(1);

      /* Y el agua responde: la mano ajena entra en la calma, con menos
         peso que la propia pero con peso. */
      await page.waitForFunction((antes) => window.__hero.estado().calma > antes + 0.005, antes,
        { timeout: 20_000 });

      await otra.evaluate(() => window.__presencia.anunciar({ sostiene: null }));
      await expect(aviso).toHaveAttribute('data-visible', '0');
      await otra.close();
    });

  /* «El gesto no empieza sobre una garza» se fue con la
     personalización: esa exclusión existía para que un toque no
     significara dos cosas —enseñar la frase Y abrir el anillo—, y sin
     frase elegible ya solo significa una. Los controles (enlaces,
     botones, summary) siguen excluidos en el propio manejador. */
});
