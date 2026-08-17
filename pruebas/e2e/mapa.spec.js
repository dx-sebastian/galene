/* ═══════════════════════════════════════════════════════════════════
   Galene — lo que queda en pantalla cuando el mapa no puede cargar.

   La arquitectura de respaldo está bien pensada: dos fuentes de datos,
   reintento automático, salida a Waze y a Maps, y el 123 por encima de
   todo. Lo que falla es lo que se ve cuando se dispara. Medido en la
   edición 0ef0013, todo junto y a la vez:

       «El dibujo del mapa venía fallando: se cambió al mapa base de
        OpenStreetMap.»
       «No se pudo traer el listado de tu zona: cancelado.»
       «El 123 funciona igual, y en cualquier urgencia de un hospital
        tienen que atenderte sin denuncia y sin cita.»
       [Buscar hospitales en Waze] [Buscarlos en Maps] [Volver a intentarlo]

   Cinco mensajes y tres botones para alguien que puede estar en crisis.
   Y el aviso se desbordaba de su caja: la última palabra quedaba
   cortada por la barra de atribución de Leaflet.

   ── CÓMO SE PROVOCA EL FALLO ───────────────────────────────────────
   Abortando en el navegador todo lo que sale a la red: las teselas de
   CARTO y de OpenStreetMap, Overpass y Nominatim. Así el camino de
   error se recorre entero y en orden, sin depender de que hoy haya o no
   haya internet — que es justo lo que no se puede dejar al azar en una
   prueba de lo que pasa cuando no hay internet.
   ═══════════════════════════════════════════════════════════════════ */
import { test, expect } from '@playwright/test';
import { BASE } from '../../playwright.config.js';

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  geolocation: { latitude: 4.6533, longitude: -74.0836 },   // Bogotá
  permissions: ['geolocation'],
  locale: 'es-CO',
});

/* Todo lo que el mapa pide fuera de casa. */
const AFUERA = ['**://*.basemaps.cartocdn.com/**', '**://*.tile.openstreetmap.org/**',
  '**://tile.openstreetmap.org/**', '**://*.overpass-api.de/**', '**://overpass*/**',
  '**://*.openstreetmap.jp/**', '**://nominatim.openstreetmap.org/**',
  '**://*.kumi.systems/**', '**://*.private.coffee/**'];

async function sinRed(page) {
  for (const patron of AFUERA) await page.route(patron, (r) => r.abort());
}

test('mapa · cuando falla, dice una cosa y ofrece dos', async ({ page }) => {
  await sinRed(page);
  await page.goto('#mapa', { waitUntil: 'load' });
  await page.waitForFunction(() => !document.querySelector('.cargador'),
    null, { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(3000);

  const boton = page.locator('#mapa button').filter({ hasText: /^Dónde estoy$/i }).first();
  if (await boton.count() && await boton.isVisible()) await boton.click();
  /* El camino completo: reintento, cambio de fuente y relevo. */
  await page.waitForTimeout(20_000);

  const estado = await page.evaluate(() => {
    const zona = document.getElementById('mapa');
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden'
        && Number(cs.opacity) > 0.05;
    };
    /* Los avisos de fallo, con los nombres que de verdad usa el mapa:
       `.mapa__vacio` es el párrafo del panel y `.mapa__estado` el
       rótulo de arriba. Buscar por «aviso» o «error» no encontraba
       ninguno de los dos y la prueba daba por bueno un muro de texto. */
    const bloques = [...zona.querySelectorAll('.mapa__vacio, .mapa__estado')]
      .filter(visible)
      .filter((el) => (el.innerText || '').trim());
    const parrafos = [];
    for (const b of bloques) {
      const t = (b.innerText || '').replace(/\s+/g, ' ').trim();
      if (t) parrafos.push(t);
    }
    /* Las salidas que ofrece el bloque de fallo. NO se cuentan aquí el
       123 —que va por encima del mapa y es la razón de ser de esta
       pantalla— ni los controles del propio mapa: lo que había que
       adelgazar es la fila de botones del error. */
    const acciones = [...zona.querySelectorAll('.mapa__salidas a, .mapa__salidas button')]
      .filter(visible)
      .map((b) => (b.innerText || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    /* Desbordamiento: cualquier texto del bloque de aviso que salga de
       su propia caja. Es lo que cortaba la última palabra. */
    let desborde = 0;
    for (const b of bloques) {
      desborde = Math.max(desborde,
        b.scrollHeight - b.clientHeight, b.scrollWidth - b.clientWidth);
    }

    /* Y el 123 sigue donde tiene que estar: por encima del mapa. */
    const linea = zona.querySelector('a[href="tel:123"]');
    const lienzo = zona.querySelector('.leaflet-container');
    return {
      parrafos, acciones, desborde,
      cientoVeintitres: linea && lienzo
        ? linea.getBoundingClientRect().top < lienzo.getBoundingClientRect().top
        : null,
    };
  });

  console.log('  avisos:', JSON.stringify(estado.parrafos));
  console.log('  acciones:', JSON.stringify(estado.acciones));
  console.log('  desbordamiento:', estado.desborde, 'px');

  expect(estado.parrafos.length,
    `Un solo mensaje. Salieron ${estado.parrafos.length}:\n` + estado.parrafos.join('\n'))
    .toBeLessThanOrEqual(1);
  expect(estado.acciones.length,
    `Dos salidas como mucho. Quedaron ${estado.acciones.length}: ` + estado.acciones.join(' · '))
    .toBeLessThanOrEqual(2);
  expect(estado.desborde, 'el aviso se sale de su caja y le corta la última palabra')
    .toBeLessThanOrEqual(1);
  expect(estado.cientoVeintitres, 'el 123 va por encima del mapa, pase lo que pase')
    .toBe(true);
});

test('mapa · con la ubicación denegada dice lo mismo', async ({ browser }) => {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true, locale: 'es-CO',
    permissions: [],   // sin geolocalización: el navegador la deniega
  });
  const page = await ctx.newPage();
  await sinRed(page);
  /* Este contexto se crea a mano —hace falta para denegar el permiso—
     y por eso no hereda el `baseURL` del proyecto. La dirección sale de
     la configuración y no escrita aquí: con `GALENE_PROD=1` apunta al
     espejo de producción, y una dirección a mano dejaría esta prueba
     midiendo el compilado local mientras las otras miden lo publicado. */
  await page.goto(new URL('#mapa', BASE).href, { waitUntil: 'load' });
  await page.waitForFunction(() => !document.querySelector('.cargador'),
    null, { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(2500);

  const boton = page.locator('#mapa button').filter({ hasText: /^Dónde estoy$/i }).first();
  if (await boton.count() && await boton.isVisible()) await boton.click();
  await page.waitForTimeout(12_000);

  const r = await page.evaluate(() => {
    const zona = document.getElementById('mapa');
    const visible = (el) => {
      const b = el.getBoundingClientRect();
      return b.width > 0 && b.height > 0;
    };
    const bloques = [...zona.querySelectorAll('.mapa__vacio, .mapa__estado')]
      .filter(visible);
    return {
      mensajes: bloques.map((b) => (b.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean),
      /* Y la ciudad a mano sigue disponible: negar la ubicación no
         puede dejar a nadie sin mapa. */
      aMano: !!zona.querySelector('button, summary')
        && /ciudad/i.test(zona.innerText),
    };
  });
  console.log('  sin permiso · mensajes:', JSON.stringify(r.mensajes));
  expect(r.mensajes.length, 'un solo mensaje también sin permiso').toBeLessThanOrEqual(1);
  expect(r.aMano, 'sin ubicación, la ciudad se elige a mano').toBe(true);
  await ctx.close();
});
