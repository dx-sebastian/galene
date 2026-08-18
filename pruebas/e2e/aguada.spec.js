/* ═══════════════════════════════════════════════════════════════════
   LA LUZ DEL AGUA — QUE SE VEA, Y QUE NO SEA UN CUADRADO.

   Esta prueba existe por un fallo concreto, y por el modo en que se
   escapó. La luz que acompaña al puntero se escribió primero como un
   envoltorio con `z-index` y dos hijos con `mix-blend-mode` dentro.
   Compilaba, no lanzaba nada, la consola quedaba limpia, y en pantalla
   salía UN CUADRADO BLANCO OPACO de 34 rem tapando media portada.

   La razón es de manual: `mix-blend-mode` mezcla con el fondo DENTRO
   DEL MISMO CONTEXTO DE APILADO, y el envoltorio creaba uno. Los hijos
   se mezclaban con el vacío del envoltorio en vez de con la página.
   Ninguna prueba de las que había podía verlo: no es una excepción, no
   es un contraste de texto, no es peso, no es semántica. Solo se ve
   MIRANDO.

   Así que se mira, con números. Dos afirmaciones, y las dos hacen
   falta —cada una sola se puede satisfacer haciendo trampa:

     1 · EN EL PUNTERO SE VE. Si no, la luz no está encendida, que es
         exactamente el estado en el que el dueño la pidió dos veces.

     2 · EN EL BORDE DE LA CAJA NO SE VE NADA. Los dos degradados
         terminan en blanco puro —que multiplicado no hace nada— y en
         negro puro —que en `screen` tampoco—, así que a esa distancia
         el píxel tiene que quedarse EXACTAMENTE como estaba. Un
         cuadrado opaco, un borde duro o una caja sin mezclar rompen
         esto de inmediato.

   ── POR QUÉ SE MIDE UNA MEDIA DE CONTROL PRIMERO ──────────────────
   La portada se mueve sola: el mar, las aves, los lavados. Una
   diferencia entre dos fotos NO es la luz — es la luz más lo que se
   movió entretanto. Se toman dos fotos seguidas con el ratón quieto y
   lejos, y esa diferencia es el suelo que hay que descontar.
   ═══════════════════════════════════════════════════════════════════ */
import { test, expect } from '@playwright/test';
import { SIN_PRESENCIA } from './comun.js';

const PORTADA = `?${SIN_PRESENCIA}&auditar-mar=1`;

/* UNA SOLA FOTO ANCHA, DOS ZONAS DENTRO. Se recorta una banda que
   contiene el núcleo del charco Y un trozo al borde de la caja de la
   luz, y se comparan las dos zonas de la MISMA imagen. Dos motivos:
   cuesta la mitad de capturas —y aquí cada captura pasa por un héroe
   pintado por software—, y sobre todo las dos zonas quedan medidas en
   el mismo instante, así que lo que se mueva solo afecta a las dos por
   igual en vez de meterse en la resta. */
async function zonas(page, seca, mojada, corte) {
  return page.evaluate(async ([a, b, corte]) => {
    const carga = (b64) => new Promise((ok) => {
      const i = new Image(); i.onload = () => ok(i); i.src = 'data:image/png;base64,' + b64;
    });
    const [ia, ib] = await Promise.all([carga(a), carga(b)]);
    const cv = document.createElement('canvas');
    cv.width = ia.width; cv.height = ia.height;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(ia, 0, 0);
    const da = cx.getImageData(0, 0, cv.width, cv.height).data;
    cx.clearRect(0, 0, cv.width, cv.height);
    cx.drawImage(ib, 0, 0);
    const db = cx.getImageData(0, 0, cv.width, cv.height).data;

    const media = (x0, x1) => {
      let suma = 0, n = 0;
      for (let y = 0; y < cv.height; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * cv.width + x) * 4;
          for (let k = 0; k < 3; k++) { suma += Math.abs(da[i + k] - db[i + k]); n++; }
        }
      }
      return +(suma / n).toFixed(2);
    };
    /* El puntero está en el extremo DERECHO de la banda: el núcleo es
       la cola de la imagen, y el canto de la caja de la luz, la cabeza. */
    return { nucleo: media(cv.width - corte, cv.width), borde: media(0, corte) };
  }, [seca.toString('base64'), mojada.toString('base64'), corte]);
}

test('aguada · la luz sigue al ratón, y no tiene bordes', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(PORTADA, { waitUntil: 'load' });
  await page.waitForTimeout(2400);

  /* UN SITIO DE PAPEL LISO Y QUIETO, y encontrarlo costó una medida
     equivocada: el primer punto que elegí —el margen izquierdo, a media
     altura del bloque— caía DENTRO del botón LLAMAR, así que lo que
     salía era su propio charco (29.67 donde tenía que haber 0) y no la
     luz. Se comprobó con `elementFromPoint` en vez de a ojo.

     Este está arriba a la derecha: por encima de los dos botones, a la
     derecha de todo el texto. `elementFromPoint` ahí devuelve `.ayuda`
     pelado. */
  const ayuda = page.locator('.ayuda').first();
  await ayuda.scrollIntoViewIfNeeded();
  /* La caja se mide DESPUÉS de que el desplazamiento pare, o el recorte
     cae fuera de la ventana y la foto no existe. */
  await page.waitForTimeout(900);
  const caja = await ayuda.boundingBox();
  expect(caja, 'la portada tiene bloque de ayuda').toBeTruthy();
  const px = Math.round(caja.x + Math.min(caja.width - 240, 1000));
  const py = Math.round(caja.y + 90);
  expect(await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.className,
    [px, py]), 'el punto de medida es papel pelado, no una pieza').toBe('ayuda');

  /* La banda va hacia la IZQUIERDA del puntero, que es donde queda
     sitio: 40 px pasado el puntero por la derecha, y 296 px por la
     izquierda. Los últimos 80 son el núcleo del charco; los primeros
     80 están entre 216 y 296 px del puntero.

     Los dos degradados llegan a blanco puro —y a negro puro— al 78 %
     de `closest-side`, o sea a 212 px del centro con la caja de 34 rem
     y la raíz a 16 px. De 216 en adelante la mezcla es la identidad y
     no puede quedar absolutamente nada. */
  const CORTE = 80;
  const banda = { x: px - 296, y: py - 30, width: 336, height: 60 };

  await page.mouse.move(4, 4);
  await page.waitForTimeout(1100);
  const seca1 = await page.screenshot({ clip: banda });
  await page.waitForTimeout(1200);
  const seca2 = await page.screenshot({ clip: banda });
  await page.mouse.move(px, py);
  await page.waitForTimeout(1500);
  const mojada = await page.screenshot({ clip: banda });

  /* La portada se mueve sola —el mar, las aves, los lavados—. Dos fotos
     seguidas con el ratón quieto y lejos dan el suelo que hay que
     descontar: sin eso no se estaría midiendo la luz, sino la luz más
     lo que se movió entretanto. */
  const suelo = await zonas(page, seca1, seca2, CORTE);
  const conLuz = await zonas(page, seca2, mojada, CORTE);
  const enPuntero = +(conLuz.nucleo - suelo.nucleo).toFixed(2);
  const enBorde = +(conLuz.borde - suelo.borde).toFixed(2);

  console.log(`  luz · en el puntero ${enPuntero} / 255 · a 17 rem ${enBorde} / 255`);

  expect(enPuntero,
    'la luz tiene que verse donde está el ratón').toBeGreaterThan(2);
  expect(enBorde,
    'al canto de su caja no puede quedar nada: si queda, la mezcla no está actuando y lo que hay es un rectángulo').toBeLessThan(1.5);
});

test('aguada · con «reducir movimiento» no se enciende', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(PORTADA, { waitUntil: 'load' });
  await page.waitForTimeout(1800);
  await page.mouse.move(640, 500);
  await page.waitForTimeout(800);

  /* Regla 7: apaga, no reduce. Ni el módulo la crea ni la hoja la
     mostraría si alguien la creara. */
  const cuantas = await page.locator('.aguada-luz').count();
  const visible = await page.evaluate(() =>
    [...document.querySelectorAll('.aguada-luz')].some((e) => getComputedStyle(e).display !== 'none'));
  expect(cuantas === 0 || !visible, 'con movimiento reducido no hay luz').toBeTruthy();
});
