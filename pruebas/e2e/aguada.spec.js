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

/* Diferencia media por canal entre dos recortes, decodificando los PNG
   dentro de la propia página: no hace falta traerse un decodificador. */
async function diferencia(page, a, b) {
  return page.evaluate(async ([x, y]) => {
    const carga = (b64) => new Promise((ok) => {
      const i = new Image(); i.onload = () => ok(i); i.src = 'data:image/png;base64,' + b64;
    });
    const [ia, ib] = await Promise.all([carga(x), carga(y)]);
    const cv = document.createElement('canvas');
    cv.width = ia.width; cv.height = ia.height;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(ia, 0, 0);
    const da = cx.getImageData(0, 0, cv.width, cv.height).data;
    cx.clearRect(0, 0, cv.width, cv.height);
    cx.drawImage(ib, 0, 0);
    const db = cx.getImageData(0, 0, cv.width, cv.height).data;
    let suma = 0, n = 0;
    for (let i = 0; i < da.length; i += 4) {
      for (let k = 0; k < 3; k++) { suma += Math.abs(da[i + k] - db[i + k]); n++; }
    }
    return +(suma / n).toFixed(2);
  }, [a.toString('base64'), b.toString('base64')]);
}

test('aguada · la luz sigue al ratón, y no tiene bordes', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(PORTADA, { waitUntil: 'load' });
  await page.waitForTimeout(2400);

  /* Un sitio de papel liso y quieto: dentro del bloque de la ayuda,
     en su margen izquierdo, lejos de los dos botones —el charco de
     esos es otro gesto y contaminaría la medida. */
  const caja = await page.locator('.ayuda').first().boundingBox();
  expect(caja, 'la portada tiene bloque de ayuda').toBeTruthy();
  const px = Math.round(caja.x + 77);
  const py = Math.round(caja.y + Math.min(caja.height, 700) * 0.5);

  const nucleo = { x: px - 40, y: py - 40, width: 80, height: 80 };
  /* 17 rem son 272 px con la raíz a 16: justo el borde de la caja de la
     luz. Se mira 12 px MÁS ALLÁ, donde la mezcla ya tiene que ser la
     identidad, pero aún dentro de la sección para que el fondo sea el
     mismo papel en las dos fotos. */
  const borde = { x: px + 232, y: py - 30, width: 60, height: 60 };

  await page.mouse.move(4, 4);
  await page.waitForTimeout(1200);
  const lejos1 = await page.screenshot({ clip: nucleo });
  const lejos1b = await page.screenshot({ clip: borde });
  await page.waitForTimeout(1300);
  const lejos2 = await page.screenshot({ clip: nucleo });
  const lejos2b = await page.screenshot({ clip: borde });

  await page.mouse.move(px, py);
  await page.waitForTimeout(1500);
  const cerca = await page.screenshot({ clip: nucleo });
  const cercaB = await page.screenshot({ clip: borde });

  const suelo = await diferencia(page, lejos1, lejos2);
  const enPuntero = await diferencia(page, lejos2, cerca);
  const sueloBorde = await diferencia(page, lejos1b, lejos2b);
  const enBorde = await diferencia(page, lejos2b, cercaB);

  console.log(`  luz · en el puntero ${(enPuntero - suelo).toFixed(2)} / 255 `
            + `· a 34 rem ${(enBorde - sueloBorde).toFixed(2)} / 255`);

  expect(enPuntero - suelo,
    'la luz tiene que verse donde está el ratón').toBeGreaterThan(2);
  expect(enBorde - sueloBorde,
    'a la distancia del borde de la caja no puede quedar nada: si queda, la mezcla no está actuando').toBeLessThan(1.5);
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
