/* ═══════════════════════════════════════════════════════════════════
   LA FLUIDEZ DEL HÉROE, MEDIDA POR ESTRUCTURA Y NO POR RELOJ.

   Un presupuesto de milisegundos aquí no valdría nada: este entorno
   pinta el shader por software (SwiftShader) y va a ocho cuadros por
   segundo, así que cualquier techo temporal sería o inalcanzable o tan
   holgado que no detecta nada. Y en la máquina de quien programa
   dependería de qué más tenga abierto.

   Lo que sí es igual en toda máquina son las DOS INVARIANTES que este
   pase de rendimiento estableció. Las dos se cuentan, no se
   cronometran:

     1 · Como mucho UN `readPixels` por cuadro. El calibrador del
         lavado mide cuatro piezas del héroe (rótulo, lockup,
         declaración, enlace) y antes hacía una lectura por pieza.
         `readPixels` no es caro por los bytes: es caro porque
         SINCRONIZA CPU y GPU, vacía la tubería y bloquea. Cuatro cajas
         pequeñas costaban cuatro paradas. `medirZonas` (mar.js) lee la
         unión una vez y reparte.

     2 · Como mucho UNA subida de textura por cuadro. Nueve láminas
         terminando de descargarse casi a la vez metían varios
         `texImage2D` de dieciséis megas en el mismo cuadro, justo
         cuando alguien acaba de llegar y el ave está cayendo.

   ── CÓMO SE CUENTA UN «CUADRO» ────────────────────────────────────
   Un contador que sube en cada callback de `requestAnimationFrame`.
   Las subidas de textura ocurren en un `setTimeout(0)` DESPUÉS de
   pintar (ver `enSuTurno` en mar.js), y eso sigue siendo el mismo
   cuadro para lo que aquí importa: lo que se quiere prohibir es que
   dos subidas caigan en el mismo hueco entre pintados.
   ═══════════════════════════════════════════════════════════════════ */
import { test, expect } from '@playwright/test';
import { SIN_PRESENCIA } from './comun.js';

const PORTADA = `?${SIN_PRESENCIA}&auditar-mar=1`;

async function instrumentar(page) {
  await page.addInitScript(() => {
    window.__gl = { cuadro: 0, lecturas: [], subidas: [], dibujos: 0 };
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (fn) => raf((ms) => { window.__gl.cuadro++; return fn(ms); });

    /* WebGL2 y WebGL1: el sitio pide 2 y cae a 1, así que se envuelven
       los dos prototipos si existen. */
    for (const P of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
      if (!P) continue;
      const rp = P.prototype.readPixels;
      P.prototype.readPixels = function (...a) {
        window.__gl.lecturas.push(window.__gl.cuadro);
        return rp.apply(this, a);
      };
      const ti = P.prototype.texImage2D;
      P.prototype.texImage2D = function (...a) {
        /* Las de 1×1 son los marcadores de posición que se crean al
           construir el contexto, antes del primer cuadro: no son
           subidas de lámina y no cuentan. Se distinguen por el número
           de argumentos —la forma larga lleva ancho y alto— o por
           haber ocurrido en el cuadro 0. */
        const grande = !(a.length > 6 && a[3] <= 4 && a[4] <= 4);
        if (grande && window.__gl.cuadro > 0) window.__gl.subidas.push(window.__gl.cuadro);
        return ti.apply(this, a);
      };
      const da = P.prototype.drawArrays;
      P.prototype.drawArrays = function (...a) {
        window.__gl.dibujos++;
        return da.apply(this, a);
      };
    }
  });
}

const masDeUnaPorCuadro = (cuadros) => {
  const n = new Map();
  for (const c of cuadros) n.set(c, (n.get(c) || 0) + 1);
  return [...n.entries()].filter(([, v]) => v > 1);
};

test('fluidez · como mucho una lectura de píxeles por cuadro', async ({ page }) => {
  await instrumentar(page);
  await page.goto(PORTADA);
  await page.waitForFunction(() => window.__hero && window.__hero.estado().t > 0,
    null, { timeout: 90_000 });
  /* Lo bastante para cubrir la escalera de arranque entera —el
     calibrador vuelve a medir en los dibujos 1, 2, 4… 64— más la
     primera medida periódica. */
  await page.waitForTimeout(12_000);

  const g = await page.evaluate(() => window.__gl);
  const repetidas = masDeUnaPorCuadro(g.lecturas);
  console.log(`  lecturas ${g.lecturas.length} · cuadros ${g.cuadro} · dibujos ${g.dibujos}`);
  expect(repetidas, `cuadros con más de un readPixels: ${JSON.stringify(repetidas)}`).toEqual([]);
  expect(g.lecturas.length, 'hubo alguna lectura, o el calibrador no corrió').toBeGreaterThan(0);
});

test('fluidez · como mucho una subida de textura por cuadro', async ({ page }) => {
  await instrumentar(page);
  await page.goto(PORTADA);
  await page.waitForFunction(() => window.__hero && window.__hero.estado().t > 0,
    null, { timeout: 90_000 });
  await page.waitForTimeout(12_000);

  const g = await page.evaluate(() => window.__gl);
  const repetidas = masDeUnaPorCuadro(g.subidas);
  console.log(`  subidas ${g.subidas.length} en ${g.cuadro} cuadros`);
  expect(repetidas, `cuadros con más de una subida: ${JSON.stringify(repetidas)}`).toEqual([]);
  expect(g.subidas.length, 'no se subió ninguna lámina').toBeGreaterThan(3);
});

/* ── Y LA CADENCIA, QUE ERA VEINTE VECES MÁS RÁPIDA EN ESCRITORIO ───
   `MOVIL ? 300 : 15` contaba CUADROS: a 30 fps eran 10 s en teléfono y
   medio segundo en escritorio, o sea las dos lecturas por segundo que
   el propio comentario de al lado decía haber quitado. Ahora se cuenta
   en tiempo y es la misma en los dos sitios.

   Se mide DESPUÉS de la escalera de arranque, contando dibujos: la
   escalera termina en el dibujo 64 y aquí se espera al 90 para no
   pillarla por el borde. */
test('fluidez · pasado el arranque, el calibrador no mide cada cuadro', async ({ page }) => {
  await instrumentar(page);
  await page.goto(PORTADA);
  await page.waitForFunction(() => window.__gl.dibujos > 90, null, { timeout: 120_000 });

  const antes = await page.evaluate(() => ({ ...window.__gl, lecturas: window.__gl.lecturas.length }));
  await page.waitForTimeout(8000);
  const luego = await page.evaluate(() => ({ ...window.__gl, lecturas: window.__gl.lecturas.length }));

  const lecturas = luego.lecturas - antes.lecturas;
  const dibujos = luego.dibujos - antes.dibujos;
  console.log(`  ${lecturas} lecturas en ${dibujos} dibujos y 8 s`);
  /* Con la cadencia de 10 s, en ocho segundos caben una o ninguna. Se
     deja en dos por si el reloj cae justo en el borde. Con la cadencia
     vieja de escritorio habrían sido dieciséis. */
  expect(lecturas, 'el lavado se está recalibrando demasiado seguido').toBeLessThanOrEqual(2);
});
