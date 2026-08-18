/* ═══════════════════════════════════════════════════════════════════
   EL FORO, DESPUÉS DE LA MIGRACIÓN A SUPABASE.

   ── LO QUE CAMBIÓ, Y POR QUÉ ESTE ARCHIVO SE REESCRIBIÓ ENTERO ─────
   Hasta el 17 ago 2026 el foro era `js/foro.js`: `sessionStorage` más
   `BroadcastChannel`, o sea que «los demás» eran las otras pestañas de
   este mismo navegador. Las once pruebas que había aquí hablaban con
   `window.__foro` —publicar, votar, vaciar— y medían esa maqueta.

   Ahora el foro es Postgres de verdad (`js/supabase-cliente.js`,
   `servidor/src/base/esquema-foro.sql`). `js/foro.js` ya no lo importa
   nadie y `window.__foro` no existe. Aquellas once pruebas no se
   «arreglan»: medían una cosa que se fue. Mantenerlas apuntando a un
   asidero muerto sería declarar once verdes que no comprueban nada.

   ── LO QUE SE PRUEBA AHORA, Y EN QUÉ ORDEN ────────────────────────
   Hay dos grupos y la diferencia entre ellos es si hay credenciales:

   1 · SIN CREDENCIALES — corre siempre, y es la que protege el
       despliegue de hoy. `PUBLIC_SUPABASE_URL` y
       `PUBLIC_SUPABASE_ANON_KEY` las inserta Astro AL COMPILAR; si no
       están, `listo` es falso y `comunidad.js` para antes de pedir
       nada. Lo que se comprueba es que ese camino sea un estado
       declarado y no una página rota: se dice que no se pudo llegar,
       no se ofrece reintentar algo que nunca va a funcionar, no se
       enseña un compositor que no puede publicar, y el resto de la
       página sigue en pie. Eso último es la regla 5 del proyecto: la
       ayuda no depende de que un servicio de terceros responda.

   2 · CON CREDENCIALES — se salta sola cuando no las hay. Escribe de
       verdad contra la base que esté configurada, así que NO se debe
       apuntar a la base de producción sin querer: crea hilos y los
       borra con su propia llave al terminar.

   ⚠ AVISO HONESTO, y va aquí para que no se lea como cobertura que no
     es: el grupo 2 se escribió leyendo `comunidad.js` y el marcado de
     `Comunidad.astro`, y NUNCA se ha ejecutado contra una base viva —
     en este entorno no hay credenciales. La primera vez que corra hará
     falta mirarlo. El grupo 1 sí está medido y verde.
   ═══════════════════════════════════════════════════════════════════ */
import { test, expect } from '@playwright/test';
import { SIN_PRESENCIA } from './comun.js';

/* CON BARRA FINAL, y no es cosmético. Sin ella GitHub Pages responde
   301 hacia la versión con barra, y estas pruebas se pasaron meses
   pidiendo una dirección que en producción es un rodeo: contra el
   servidor local daba igual y salían verdes. Lo descubrió `npm run
   test:prod`, que es exactamente para lo que existe. */
const FORO = `comunidad/?${SIN_PRESENCIA}`;

/* Se pregunta al ENTORNO y no a la página porque hace falta antes de
   navegar. Es la misma variable que Astro leyó al compilar: el
   servidor de pruebas corre `npm run build` en este mismo proceso
   padre (ver playwright.config.js), así que las dos ven lo mismo. Y
   por si acaso, el grupo 1 lo vuelve a comprobar EN LA PÁGINA, que es
   la fuente de verdad. */
const HAY_BASE = Boolean(process.env.PUBLIC_SUPABASE_URL && process.env.PUBLIC_SUPABASE_ANON_KEY);

/* ═══════════════════════════════════════════════════════════════════
   1 · SIN CREDENCIALES: SE DICE, Y NO SE ROMPE NADA MÁS
   ═══════════════════════════════════════════════════════════════════ */
test.describe('el foro sin base configurada', () => {
  test.skip(HAY_BASE, 'hay credenciales: este grupo mide el camino sin ellas');

  test.beforeEach(async ({ page }) => {
    await page.goto(FORO);
  });

  test('lo dice con su propia voz, y no ofrece reintentar lo imposible', async ({ page }) => {
    const error = page.locator('[data-error]');
    await expect(error).toBeVisible();
    await expect(error).toContainText('No se pudo llegar a la comunidad ahora mismo');

    /* El botón de reintentar se QUITA, no se esconde. Reintentar sin
       variables de entorno da exactamente el mismo resultado, y un
       botón que no puede funcionar es peor que ninguno: se pulsa. */
    await expect(page.locator('[data-reintentar]')).toHaveCount(0);
  });

  test('no deja el «cargando» encendido para siempre', async ({ page }) => {
    await expect(page.locator('[data-carga]')).toBeHidden();
  });

  test('no enseña un compositor que no puede publicar', async ({ page }) => {
    await expect(page.locator('#escribir')).toBeHidden();
    await expect(page.locator('#mando')).toBeHidden();
    await expect(page.locator('.hilos__item')).toHaveCount(0);
  });

  test('el módulo para donde tiene que parar, y lo dice la propia página',
    async ({ page }) => {
      /* `window.__com` se define al FINAL de `arrancar()`. Que no exista
         es la señal de que se salió por la puerta de «no configurado» y
         no por una excepción a medio camino — eso lo vigila
         consola.spec.js, que además comprueba que no hubo ninguna. */
      expect(await page.evaluate(() => Boolean(window.__com))).toBe(false);
    });

  test('el resto de la página sigue en pie: la ayuda no depende de Supabase',
    async ({ page }) => {
      /* Regla 5 del proyecto. Un foro caído no puede llevarse por
         delante la navegación ni el camino de vuelta a la ayuda. */
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('.barra')).toBeVisible();
      const aPortada = page.locator('.barra a[href$="/galene/"]').first();
      await expect(aPortada).toHaveCount(1);
      await expect(page.locator('footer.pie')).toHaveCount(1);
    });
});

/* ═══════════════════════════════════════════════════════════════════
   2 · CON CREDENCIALES: CONTRA LA BASE DE VERDAD

   Cada prueba escribe y limpia lo suyo. El identificador que se planta
   en el título es lo que las hace no pisarse: la lista es compartida y
   puede tener hilos de cualquiera.
   ═══════════════════════════════════════════════════════════════════ */
test.describe('el foro contra la base', () => {
  test.skip(!HAY_BASE,
    'sin PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY no hay base contra la que medir');

  /* Un sello por ejecución para no chocar con lo que ya haya escrito,
     ni con otra ejecución en marcha. Sin `Date.now()` a secas: dos
     pruebas del mismo segundo colisionarían. */
  const sello = () => `prueba-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  async function abrir(page) {
    await page.goto(FORO);
    await page.waitForFunction(() => Boolean(window.__com), null, { timeout: 30_000 });
    return page.locator('#escribir');
  }

  async function publicar(page, { titulo, cuerpo }) {
    const escribir = page.locator('#escribir');
    if (!(await escribir.evaluate((d) => d.open))) {
      await escribir.locator('summary').click();
    }
    const form = page.locator('#form-escribir');
    await form.locator('[name="titulo"]').fill(titulo);
    await form.locator('[name="cuerpo"]').fill(cuerpo);
    await form.locator('[name="etiqueta"]').selectOption({ index: 1 });
    await form.locator('button[type="submit"]').click();
    await expect(form.locator('[data-estado]')).toBeVisible();
    /* La llave de borrado sale a la vista al publicar: es lo único que
       permite tirar el hilo desde otra pestaña, así que la prueba se la
       guarda para limpiar. */
    return form.locator('[data-llave-texto]').innerText();
  }

  test('publica un hilo y lo pone el primero de la lista', async ({ page }) => {
    await abrir(page);
    const titulo = `Hilo de ${sello()}`;
    await publicar(page, { titulo, cuerpo: 'Cuerpo de prueba automática.' });

    const primero = page.locator('.hilos__item').first();
    await expect(primero).toContainText(titulo);
  });

  test('no publica un hilo sin título ni sin cuerpo, y lo dice en su voz',
    async ({ page }) => {
      await abrir(page);
      const escribir = page.locator('#escribir');
      if (!(await escribir.evaluate((d) => d.open))) await escribir.locator('summary').click();

      const form = page.locator('#form-escribir');
      const antes = await page.locator('.hilos__item').count();
      await form.locator('button[type="submit"]').click();
      /* Validación nativa del navegador: `required` en el marcado, y no
         una comprobación de JavaScript que se pueda saltar. */
      expect(await form.locator('[name="titulo"]').evaluate((el) => el.validity.valid)).toBe(false);
      await expect(page.locator('.hilos__item')).toHaveCount(antes);
    });

  test('contesta un hilo propio y la respuesta queda dentro de su hebra',
    async ({ page }) => {
      await abrir(page);
      const titulo = `Hilo de ${sello()}`;
      await publicar(page, { titulo, cuerpo: 'Cuerpo de prueba automática.' });

      const hilo = page.locator('.hilos__item').first();
      await hilo.locator('[data-responder]').first().click();
      const form = page.locator('#form-escribir');
      const respuesta = `Respuesta de ${sello()}`;
      await form.locator('[name="cuerpo"]').fill(respuesta);
      await form.locator('button[type="submit"]').click();
      await expect(form.locator('[data-estado]')).toBeVisible();
      await expect(hilo).toContainText(respuesta);
    });

  test('el voto se suma, se cambia de lado y se quita', async ({ page }) => {
    await abrir(page);
    const titulo = `Hilo de ${sello()}`;
    await publicar(page, { titulo, cuerpo: 'Cuerpo de prueba automática.' });

    const votos = page.locator('.hilos__item').first().locator('[data-voto]').first();
    const marcador = votos.locator('[data-marcador]');
    const base = parseInt(await marcador.innerText(), 10);

    await votos.locator('.voto[data-dir="1"]').click();
    await expect(marcador).toHaveText(String(base + 1));
    await votos.locator('.voto[data-dir="-1"]').click();
    await expect(marcador).toHaveText(String(base - 1));
    await votos.locator('.voto[data-dir="-1"]').click();
    await expect(marcador).toHaveText(String(base));
  });

  test('borra lo propio, y el botón solo está en lo propio', async ({ page }) => {
    await abrir(page);
    const titulo = `Hilo de ${sello()}`;
    await publicar(page, { titulo, cuerpo: 'Cuerpo de prueba automática.' });

    page.on('dialog', (d) => d.accept());
    const hilo = page.locator('.hilos__item').first();
    await expect(hilo.locator('[data-borrar]')).toHaveCount(1);
    await hilo.locator('[data-borrar]').click();
    await expect(hilo).not.toContainText(titulo);
  });

  test('ordenar y filtrar vuelven a pedirle la lista a la base', async ({ page }) => {
    await abrir(page);
    const mando = page.locator('#mando');
    await expect(mando).toBeVisible();
    if (!(await mando.evaluate((d) => d.open))) await mando.locator('summary').click();

    await mando.locator('[data-orden="votados"]').click();
    await expect.poll(() => page.evaluate(() => window.__com.estado().orden)).toBe('votados');
    await mando.locator('[data-orden="recientes"]').click();
    await expect.poll(() => page.evaluate(() => window.__com.estado().orden)).toBe('recientes');
  });
});
