/* ═══════════════════════════════════════════════════════════════════
   LAS GARZAS — la propia, las de quien más esté, y el globo.

   Estas pruebas piden el mar de verdad con `?auditar-mar=1`: sin él,
   mar.js detecta que el WebGL de este entorno es por software y se cae
   al respaldo CSS a propósito (ver `crear()`), y en el respaldo no hay
   garzas que mirar. Ese parámetro no es un truco de las pruebas — es el
   asidero que ese código ya tenía para poder auditarse.
   ═══════════════════════════════════════════════════════════════════ */
import { test, expect } from '@playwright/test';
import { CON_MAR, SIN_PRESENCIA, esperarGarzas, esperarHero, cajaDeMiGarza, abrirPanelGarza, esperarVivas } from './comun.js';

const SOLA = `.${CON_MAR}&${SIN_PRESENCIA}`;

test.describe('personalizar tu garza', () => {
  test('el panel nace cerrado y no estorba a quien no lo quiera', async ({ page }) => {
    await page.goto(SOLA);
    await esperarGarzas(page);

    /* Cerrado es una palabra subrayada. Lo de dentro no está en
       pantalla hasta que alguien lo abre: eso es lo que significa que
       sea opt-in. */
    await expect(page.locator('.garza-yo__abrir')).toBeVisible();
    await expect(page.locator('.garza-yo__panel')).toBeHidden();

    /* Y sin tocarlo, la garza no lleva nada: ni pico teñido ni frase. */
    const mia = await page.evaluate(() => window.__garzas.mia());
    expect(mia).toEqual({ pico: null, frase: null });
  });

  test('elige un pico, lo marca y tiñe la garza', async ({ page }) => {
    await page.goto(SOLA);
    await esperarGarzas(page);
    const panel = await abrirPanelGarza(page);

    await expect(panel.locator('.pico')).toHaveCount(6);
    const verde = panel.locator('.pico').nth(1);
    await verde.click();

    await expect(verde).toHaveAttribute('aria-pressed', 'true');
    expect((await page.evaluate(() => window.__garzas.mia())).pico).toBe('#2F6B4F');
    /* El tinte es un elemento de verdad, con la máscara de la lámina
       puesta: si no existiera, el pico seguiría siendo ocre y la prueba
       de arriba pasaría igual mirando solo el estado. */
    await expect(page.locator('.pico-tinte').first()).toHaveCSS('opacity', '1');

    /* Pulsar el que ya está puesto lo quita: un control de dos estados
       que no se puede deshacer es una trampa. */
    await verde.click();
    await expect(verde).toHaveAttribute('aria-pressed', 'false');
    expect((await page.evaluate(() => window.__garzas.mia())).pico).toBe(null);
  });

  test('elige una de las diez frases y la dice en palabras', async ({ page }) => {
    await page.goto(SOLA);
    await esperarGarzas(page);
    const panel = await abrirPanelGarza(page);

    await expect(panel.locator('.garza-yo__frase')).toHaveCount(10);
    await panel.locator('.garza-yo__frase', { hasText: 'No estás sola.' }).click();

    expect((await page.evaluate(() => window.__garzas.mia())).frase).toBe('No estás sola.');
    /* El aviso hablado existe porque lo que se elige pasa a treinta
       píxeles de aquí, dentro de un cuadro que un lector de pantalla no
       puede describir. */
    await expect(panel.locator('[data-garza-parte]')).toContainText('No estás sola.');
  });

  test('la elección sobrevive a ir a la comunidad y volver', async ({ page }) => {
    await page.goto(SOLA);
    await esperarGarzas(page);
    const panel = await abrirPanelGarza(page);
    await panel.locator('.pico').nth(2).click();
    await panel.locator('.garza-yo__frase').nth(4).click();

    await page.goto(`comunidad?${SIN_PRESENCIA}`);
    await page.goto(SOLA);
    await esperarGarzas(page);

    const mia = await page.evaluate(() => window.__garzas.mia());
    expect(mia.pico).toBe('#3E6E8E');
    expect(mia.frase).toBe('Nada de esto fue culpa tuya.');
  });

  test('«dejarla como estaba» la devuelve al ocre y sin frase', async ({ page }) => {
    await page.goto(SOLA);
    await esperarGarzas(page);
    const panel = await abrirPanelGarza(page);
    await panel.locator('.pico').nth(3).click();
    await panel.locator('.garza-yo__frase').nth(0).click();
    await expect(panel.locator('[data-garza-olvidar]')).toBeVisible();

    await panel.locator('[data-garza-olvidar]').click();
    expect(await page.evaluate(() => window.__garzas.mia())).toEqual({ pico: null, frase: null });
    await expect(panel.locator('[data-garza-olvidar]')).toBeHidden();
  });
});

test.describe('el globo de la frase', () => {
  test('aparece al pasar el ratón por encima y se va al salir', async ({ page }) => {
    await page.goto(SOLA);
    await esperarHero(page);
    const panel = await abrirPanelGarza(page);
    await panel.locator('.garza-yo__frase', { hasText: 'Te creo.' }).click();
    /* Se cierra el panel: si se queda abierto, tapa media pantalla y el
       ratón no llega a la garza. */
    await page.locator('.garza-yo__abrir').click();

    const globo = page.locator('.globo-garza');
    await expect(globo).toHaveAttribute('data-visible', '0');

    const caja = await cajaDeMiGarza(page);
    expect(caja).not.toBeNull();
    await page.mouse.move(caja.x, caja.y);
    await expect(globo).toHaveAttribute('data-visible', '1');
    await expect(globo).toHaveText('Te creo.');

    /* Lejos de cualquier garza: a la esquina de arriba, donde solo hay
       cielo. */
    await page.mouse.move(5, 5);
    await expect(globo).toHaveAttribute('data-visible', '0');
  });

  test('sin frase elegida no hay globo, por mucho que se pase por encima', async ({ page }) => {
    await page.goto(SOLA);
    await esperarHero(page);
    const caja = await cajaDeMiGarza(page);
    await page.mouse.move(caja.x, caja.y);
    await page.waitForTimeout(500);
    await expect(page.locator('.globo-garza')).toHaveAttribute('data-visible', '0');
  });
});

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

  test('el gesto no empieza sobre un control ni sobre una garza', async ({ page }) => {
    await page.goto(`.${CON_MAR}&${SIN_PRESENCIA}&dev=1`);
    await esperarHero(page);
    const panel = await abrirPanelGarza(page);
    await panel.locator('.garza-yo__frase').first().click();
    await page.locator('.garza-yo__abrir').click();

    const antes = await page.evaluate(() => window.__hero.estado().sostenido);

    /* Un toque sobre la garza enseña su frase y NO abre un anillo: un
       gesto que hiciera las dos cosas a la vez no se puede entender. */
    const caja = await cajaDeMiGarza(page);
    await page.mouse.move(caja.x, caja.y);
    await page.mouse.down();
    await page.waitForTimeout(900);
    await page.mouse.up();
    expect(await page.evaluate(() => window.__hero.estado().sostenido)).toBe(antes);
    await expect(page.locator('.globo-garza')).toHaveAttribute('data-visible', '1');
  });
});
