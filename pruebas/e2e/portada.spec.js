/* ═══════════════════════════════════════════════════════════════════
   Galene — que la portada no haga perder el tiempo.

   Dos cosas medidas en la edición 0ef0013:

   LAS TARJETAS DE HERRAMIENTAS SON AIRE. Tres cajas con borde, fondo y
   sombra que contienen un icono, un título y cuatro palabras, y luego
   nada:

       escritorio   391 px de caja   131 px de texto   67 % vacío
       móvil        276 px de caja   108 px de texto   61 % vacío

   El aire es una herramienta y en este sitio está bien usado en muchos
   sitios. Pero una caja cerrada con dos tercios de nada dentro no se
   lee como aire: se lee como contenido que no cargó.

   Y LA PORTADA MIDE 15,7 PANTALLAS en un teléfono (13 215 px). Es mucho
   para una web donde alguien puede llegar con prisa, y la mitad de ese
   scroll son estos huecos.

   ── Y EL RESPALDO SIN WEBGL ────────────────────────────────────────
   Quien tiene la aceleración bloqueada no ve el mar: ve el manglar
   flotando sobre un degradado plano, sin agua y con las raíces
   colgando en el vacío. Aquí se comprueba que ese respaldo tiene
   horizonte, que es lo que separa un cuadro de un recorte.
   ═══════════════════════════════════════════════════════════════════ */
import { test, expect } from '@playwright/test';

/* ── EL LÍMITE DE ALTURA ES UN TRINQUETE, NO EL OBJETIVO ───────────
   La portada mide 12,7 pantallas en un teléfono y eso sigue siendo
   mucho. Bajarla de diez pide mudar secciones enteras a páginas
   propias, que es trabajo de otra fase y además le da al sitio las URL
   indexables que hoy no tiene.

   Lo que hace este número hoy es impedir que CREZCA: cada cosa que se
   añada a la portada tendrá que pagar su sitio quitando otra. Cuando la
   fase de recorte llegue, este número baja con ella. */
const VISTAS = [
  ['móvil', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
              isMobile: true, hasTouch: true }, 13_400],
  ['escritorio', { viewport: { width: 1440, height: 900 } }, 10_200],
];

for (const [nombre, opciones, altoMaximo] of VISTAS) {
  test.describe(`portada · ${nombre}`, () => {
    test.use(opciones);

    test('las tarjetas de herramientas miden lo que tienen dentro', async ({ page }) => {
      await page.goto('', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => !document.querySelector('.cargador'),
        null, { timeout: 30_000 }).catch(() => {});
      await page.waitForTimeout(800);

      /* ── QUÉ SE MIDE, Y POR QUÉ NO ES «CUÁNTO AIRE HAY» ──────────
         La primera versión medía el porcentaje de caja sin contenido y
         suspendía a una tarjeta bien hecha: el respiro de un recuadro
         —el relleno de arriba y abajo— también es caja sin contenido, y
         quitarlo no arregla nada, lo estropea.

         El defecto de la auditoría no era que hubiera aire: era que el
         aire estaba TODO DEBAJO. El contenido se apelotonaba arriba y
         quedaban 260 px de nada hasta el borde inferior, que es lo que
         se lee como una caja a medio cargar. O sea que lo que hay que
         medir es la ASIMETRÍA: cuánto hueco queda debajo comparado con
         el de arriba. Una tarjeta con su contenido centrado está bien
         aunque respire; una con el doble de hueco abajo que arriba,
         no. */
      const tarjetas = await page.evaluate(() =>
        [...document.querySelectorAll('.mapa-herramientas__abrir')].map((t) => {
          const caja = t.getBoundingClientRect();
          const rango = document.createRange();
          rango.selectNodeContents(t);
          const dentro = rango.getBoundingClientRect();
          const arriba = Math.max(0, dentro.top - caja.top);
          const abajo = Math.max(0, caja.bottom - dentro.bottom);
          return {
            texto: (t.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 30),
            alto: Math.round(caja.height),
            contenido: Math.round(dentro.height),
            arriba: Math.round(arriba),
            abajo: Math.round(abajo),
            /* Cuántas veces cabe el hueco de arriba en el de abajo. */
            sesgo: +(abajo / Math.max(1, arriba)).toFixed(2),
          };
        }));

      expect(tarjetas.length, 'la portada tiene tres herramientas').toBe(3);
      for (const t of tarjetas) {
        console.log(`  ${nombre}: «${t.texto}» ${t.alto}px caja · ${t.contenido}px texto `
          + `· ${t.arriba}px arriba / ${t.abajo}px abajo · sesgo ${t.sesgo}`);
      }
      const gordas = tarjetas
        .filter((t) => t.sesgo > 1.6 && t.abajo - t.arriba > 24)
        .map((t) => `«${t.texto}»: ${t.abajo}px de hueco debajo contra ${t.arriba}px arriba`
          + ` (sesgo ${t.sesgo}) — el contenido se queda arriba y la caja sigue`);
      expect(gordas.join('\n'), 'Tarjetas con el contenido apelotonado arriba').toBe('');
    });

    test('la portada no se hace interminable', async ({ page }) => {
      await page.goto('', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => !document.querySelector('.cargador'),
        null, { timeout: 30_000 }).catch(() => {});
      await page.waitForTimeout(800);
      const m = await page.evaluate(() => ({
        alto: document.documentElement.scrollHeight,
        pantallas: +(document.documentElement.scrollHeight / innerHeight).toFixed(1),
      }));
      console.log(`  ${nombre}: ${m.alto} px = ${m.pantallas} pantallas`);
      expect(m.alto, `la portada en ${nombre} mide ${m.pantallas} pantallas`)
        .toBeLessThanOrEqual(altoMaximo);
    });
  });
}

/* ── EL RESPALDO SIN WEBGL ──────────────────────────────────────────
   Sin `?auditar-mar=1`, `crear()` detecta el navegador automatizado y
   devuelve null: es exactamente el camino de quien no tiene WebGL. */
test('portada · el respaldo sin WebGL es un cuadro, no un recorte', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('?hora=13', { waitUntil: 'load' });
  await page.waitForFunction(() => !document.querySelector('.cargador'),
    null, { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const r = await page.evaluate(() => {
    const html = document.documentElement;
    if (!html.classList.contains('hero-estatico')) return { respaldo: false };
    const mundo = document.querySelector('.mundo');
    const agua = getComputedStyle(mundo, '::after');
    const cielo = getComputedStyle(mundo, '::before');
    const alto = (cs) => {
      const h = parseFloat(cs.height);
      return Number.isFinite(h) ? h : 0;
    };
    return {
      respaldo: true,
      horizonte: getComputedStyle(html).getPropertyValue('--horizonte').trim(),
      aguaVisible: agua.content !== 'none' && Number(agua.opacity) > 0.05 && alto(agua) > 20,
      cieloVisible: cielo.content !== 'none' && Number(cielo.opacity) > 0.05 && alto(cielo) > 20,
    };
  });

  expect(r.respaldo, 'esta prueba solo tiene sentido en el camino sin WebGL').toBe(true);
  console.log(`  respaldo: horizonte=${r.horizonte} agua=${r.aguaVisible} cielo=${r.cieloVisible}`);
  expect(r.horizonte, 'el respaldo reparte cielo y agua con el mismo horizonte que la escena')
    .toMatch(/^\d+%$/);
  expect(r.aguaVisible, 'sin agua, el manglar flota en el vacío').toBe(true);
});
