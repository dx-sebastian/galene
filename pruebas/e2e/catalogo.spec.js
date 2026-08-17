/* ═══════════════════════════════════════════════════════════════════
   Galene — que el catálogo pertenezca al mismo cuaderno.

   El diagnóstico de la auditoría, sin rodeos: /productos parece de otro
   sitio. Se construyó un mundo entero de papel de algodón, aguadas y
   tinta aguada, y el catálogo trae cinco fotos de estudio del
   fabricante —fondo blanco puro, luz dura, saturación de e-commerce—.
   Al lado de la portada el salto no es estilístico: parece un iframe.

   ── CÓMO SE MIDE UNA DIRECCIÓN DE ARTE ─────────────────────────────
   No se puede medir «pertenece al mismo cuaderno». Sí se puede medir lo
   que rompe la pertenencia, que aquí es concreto y cuantificable: el
   RECTÁNGULO DE BLANCO PURO detrás de cada pieza. Un fondo de estudio
   llena de blanco absoluto un tercio largo de la imagen; una pieza
   recortada sobre papel no llega al 5 %, porque el papel de este sitio
   no es blanco (#FBF7F0) y su grano nunca da dos píxeles iguales.

   El otro rompimiento sí es de jerarquía: cinco botones verdes macizos
   a ancho completo, repetidos, en un sitio cuyo primer mensaje es que
   no viene a venderte nada. El mostrador presenta; la ficha vende. Se
   comprueba que la lámina de acuarela maciza —`.acuarela`, la del
   botón de compra— vive en la ficha y no repetida en el catálogo.
   ═══════════════════════════════════════════════════════════════════ */
import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 900 } });

test('catálogo · las piezas no vienen sobre fondo de estudio', async ({ page }) => {
  await page.goto('productos/', { waitUntil: 'load' });
  await page.waitForTimeout(1200);

  const medidas = await page.evaluate(async () => {
    const fuera = [];
    for (const img of document.querySelectorAll('.producto img, .producto__foto img, .producto picture img')) {
      if (!img.complete) await img.decode().catch(() => {});
      const w = img.naturalWidth, h = img.naturalHeight;
      if (!w || !h) continue;
      const c = document.createElement('canvas');
      /* Se muestrea a 200 px de ancho: sobra para un histograma y evita
         leer cinco millones de píxeles cinco veces. */
      const k = Math.min(1, 200 / w);
      c.width = Math.max(1, Math.round(w * k));
      c.height = Math.max(1, Math.round(h * k));
      const cx = c.getContext('2d', { willReadFrequently: true });
      cx.drawImage(img, 0, 0, c.width, c.height);
      const d = cx.getImageData(0, 0, c.width, c.height).data;
      let blancos = 0, total = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 8) continue;          // transparente: ya está recortada
        total++;
        /* «Blanco de estudio» es blanco de verdad: los tres canales por
           encima de 246 y sin tinte. El papel del sitio es #FBF7F0, o
           sea 240 en el azul: queda fuera por catorce puntos. */
        if (d[i] >= 246 && d[i + 1] >= 246 && d[i + 2] >= 246) blancos++;
      }
      fuera.push({
        archivo: img.currentSrc.split('/').pop(),
        blanco: total ? Math.round((blancos / total) * 100) : 0,
      });
    }
    return fuera;
  });

  expect(medidas.length, 'el catálogo pinta cinco piezas').toBe(5);
  for (const m of medidas) console.log(`  ${m.archivo.padEnd(26)} ${m.blanco}% de blanco puro`);

  const malas = medidas.filter((m) => m.blanco > 5)
    .map((m) => `${m.archivo}: ${m.blanco}% de blanco puro (máx 5 %)`);
  expect(malas.join('\n'), 'Piezas todavía sobre fondo de estudio').toBe('');
});

test('catálogo · el mostrador presenta y la ficha vende', async ({ page }) => {
  await page.goto('productos/', { waitUntil: 'domcontentloaded' });
  const enMostrador = await page.evaluate(() => ({
    acuarelas: document.querySelectorAll('.productos .acuarela').length,
    tarjetas: document.querySelectorAll('.producto').length,
    /* Cada tarjeta sigue siendo un enlace entero a su ficha: quitarle
       peso al botón no puede costar el camino. */
    enlaces: document.querySelectorAll('.producto__enlace').length,
  }));
  console.log(`  mostrador: ${enMostrador.tarjetas} tarjetas, `
    + `${enMostrador.enlaces} enlaces a ficha, ${enMostrador.acuarelas} botones macizos`);
  expect(enMostrador.enlaces, 'cada tarjeta lleva a su ficha').toBe(enMostrador.tarjetas);
  expect(enMostrador.acuarelas,
    'la lámina de acuarela maciza es de la ficha, no de las cinco tarjetas del mostrador')
    .toBe(0);

  await page.goto('productos/funda-coletero/', { waitUntil: 'domcontentloaded' });
  const enFicha = await page.evaluate(() =>
    document.querySelectorAll('.ficha .acuarela, .ficha__comprar').length);
  expect(enFicha, 'la ficha sí tiene su botón de compra').toBeGreaterThan(0);
});
