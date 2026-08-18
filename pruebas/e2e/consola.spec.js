/* ═══════════════════════════════════════════════════════════════════
   NINGUNA PÁGINA LANZA UNA EXCEPCIÓN. Ni una.

   Esta prueba existe por un fallo concreto y para que no vuelva. Al
   traer la migración del foro y la bandada a Supabase, el `main.js`
   que llegaba venía de una rama cincuenta y seis commits atrás: la
   fusión se llevó los `import` de `presencia.js`, `garza.js` y
   `pico.js` y dejó dentro las doce llamadas que los usaban. Compilaba
   perfecto —Rollup no puede saber que `presencia` no es un global— y
   se caía en el primer cuadro con un `ReferenceError`, o sea que la
   portada entera se quedaba sin mar, sin garzas y sin reloj.

   Ninguna de las ciento treinta y seis pruebas de entonces lo veía.
   Todas miraban lo que HAY en pantalla, y ninguna miraba lo que la
   consola estaba gritando. Un `ReferenceError` en el arranque de un
   módulo no borra el HTML: la página sigue ahí, con su h1 y su
   teléfono, y las pruebas de estructura siguen verdes mientras la
   mitad del sitio no existe.

   ── QUÉ CUENTA COMO FALLO ─────────────────────────────────────────
   Solo lo que el navegador considera un error del programa:
   `pageerror` (excepción no capturada) y `console.error`. Un `warn`
   no cuenta —el sitio usa varios a propósito para decir que algo
   opcional no está—, y tampoco cuentan los fallos de red de recursos
   que este entorno no puede traer.

   No se filtra NADA por texto. Una lista de excepciones toleradas es
   una lista que crece, y la primera línea que se le añade es la que
   tapa el siguiente ReferenceError.
   ═══════════════════════════════════════════════════════════════════ */
import { test, expect } from '@playwright/test';
import { CON_MAR, SIN_PRESENCIA } from './comun.js';

/* La portada va CON el shader de verdad: casi todo `main.js` —las
   garzas, los toques, la calma— solo se ejecuta si el mar arrancó, y
   sin `auditar-mar` este entorno cae al respaldo CSS y nunca entra en
   ese código. Que es exactamente donde estaba el fallo que motivó
   esto. */
const PAGINAS = [
  ['portada', `?${SIN_PRESENCIA}&auditar-mar=1`],
  ['comunidad', `comunidad/?${SIN_PRESENCIA}`],
  ['expertos', 'expertos/'],
  ['productos', 'productos/'],
  ['ficha', 'productos/funda-coletero/'],
  ['acerca', 'acerca/'],
];

for (const [nombre, ruta] of PAGINAS) {
  test(`consola · ${nombre} no lanza ninguna excepción`, async ({ page }) => {
    const gritos = [];
    page.on('pageerror', (e) => gritos.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') gritos.push(`console.error: ${m.text()}`);
    });

    await page.goto(ruta);
    /* Se espera al menos un cuadro pintado, no a `load`: los módulos de
       este sitio se montan después, y el fallo que motivó la prueba
       ocurría en el primer `requestAnimationFrame`. */
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.waitForTimeout(2500);

    expect(gritos, `la consola de /${ruta}`).toEqual([]);
  });
}

/* ── Y LO QUE DE VERDAD SE MONTÓ ────────────────────────────────────
   Una página sin excepciones puede seguir estando muerta si el módulo
   nunca llegó a correr. Los asideros del sitio son la prueba de vida
   más barata que hay: si `window.__hero` existe, `main.js` llegó
   entero hasta el final de su arranque. */
test('consola · la portada monta sus módulos hasta el final', async ({ page }) => {
  await page.goto(`?${SIN_PRESENCIA}&auditar-mar=1`);
  await page.waitForFunction(() => Boolean(window.__hero && window.__garzas && window.__presencia),
    null, { timeout: 60_000 });
  /* Y el mar avanza de verdad: `estado().t` es el reloj del bucle, y un
     bucle que se cayó lo deja clavado. */
  const t0 = await page.evaluate(() => window.__hero.estado().t);
  await page.waitForFunction((t0) => window.__hero.estado().t > t0 + 0.5, t0, { timeout: 20_000 });
});
