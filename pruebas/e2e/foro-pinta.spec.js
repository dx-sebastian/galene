/* ═══════════════════════════════════════════════════════════════════
   EL FORO PINTA LO QUE LE LLEGA

   Esta prueba existe por la peor avería de todo el proyecto, y por lo
   bien escondida que estuvo.

   El rediseño de la comunidad quitó el sello del ave de las dos
   plantillas de Comunidad.astro. `comunidad.js` se quedó haciendo:

     nodo.querySelector('.sello__ave').src = …

   `querySelector` de una clase que ya no existe devuelve `null`, y eso
   lanza en la PRIMERA tarjeta. Resultado: la lista se pedía bien, la
   base contestaba bien, se empezaba a recorrer, reventaba en el primer
   hilo, y el `catch` de fuera enseñaba «no se pudo llegar a la
   comunidad ahora mismo». Un mensaje de RED para un fallo de DOM.

   Se buscó en Supabase, en las llaves anónimas, en las variables del
   despliegue y en las políticas de la base. Todo eso estaba bien. El
   fallo estaba tres capas más acá, y ninguna prueba podía verlo:
   `foro.spec.js` se salta el grupo «contra la base» cuando no hay
   credenciales alcanzables, y este entorno no alcanza ningún HTTPS
   externo.

   ── LA IDEA: NO HACE FALTA LA BASE PARA PROBAR EL PINTOR ──────────
   Lo que aquí se prueba no es Supabase: es que UNAS FILAS SE
   CONVIERTAN EN TARJETAS. Así que se interceptan las peticiones en el
   navegador y se contestan desde aquí. Playwright las cumple sin salir
   a la red, o sea que esto corre igual en una máquina sin internet, que
   es justo el sitio donde la avería vivió sin que nadie la viera.

   Y se corre contra `dist/` —o contra el espejo de producción con
   `test:prod`—, o sea contra el JavaScript empaquetado de verdad.
   ═══════════════════════════════════════════════════════════════════ */
import { test, expect } from '@playwright/test';

const AHORA = 1755500000000;

/* Dos filas con la forma EXACTA que devuelve `hilos_publico`. Si la
   vista cambia de columnas, esto tiene que cambiar con ella — y que haya
   que tocarlo es la señal, no la molestia. */
const FILAS = [
  {
    id: 'unoUnoUnoUno', etiqueta: 'acompanar', titulo: 'Un hilo con etiqueta',
    cuerpo: 'Primer párrafo.\n\nSegundo párrafo.', autora: 'Anónima', anonima: 1,
    pose: 'reposo', mira: 1, creado: AHORA - 60000, ultima: AHORA - 60000,
    votos: 2, respuestas: 0, reportes: 0, estado: 'visible', ejemplo: 0,
  },
  {
    /* SIN ETIQUETA. La categoría dejó de ser obligatoria, y el camino
       sin etiqueta tiene su propia rama en `pintarHilo` —quita el
       elemento de la etiqueta y no pone pigmento—. Si esa rama se
       rompe, se rompe justo para quien no quiso clasificar su mensaje. */
    id: 'dosDosDosDos', etiqueta: '', titulo: 'Un hilo sin etiqueta ninguna',
    cuerpo: 'Solo un párrafo.', autora: 'Marina', anonima: 0,
    pose: 'alerta', mira: -1, creado: AHORA - 120000, ultima: AHORA - 120000,
    votos: 0, respuestas: 0, reportes: 0, estado: 'visible', ejemplo: 0,
  },
];

async function conBaseFingida(page) {
  const json = (datos) => ({
    status: 200,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(datos),
  });

  /* La sesión anónima. `supabase-js` pide esto antes de nada. */
  await page.route('**/auth/v1/**', (ruta) => ruta.fulfill(json({
    access_token: 'fingido', token_type: 'bearer', expires_in: 3600,
    refresh_token: 'fingido', user: { id: '00000000-0000-4000-8000-000000000001' },
  })));

  await page.route('**/rest/v1/**', (ruta) => {
    const u = ruta.request().url();
    if (u.includes('hilos_publico')) return ruta.fulfill(json(FILAS));
    /* Votos propios, comentarios, cualquier otra cosa: vacío. */
    return ruta.fulfill(json([]));
  });
}

test('foro · convierte las filas de la base en tarjetas', async ({ page }) => {
  const reventones = [];
  page.on('pageerror', (e) => reventones.push(String(e.message)));

  await conBaseFingida(page);
  await page.goto('comunidad/', { waitUntil: 'load' });

  const tarjetas = page.locator('#hilos .hilos__item');
  await expect(tarjetas).toHaveCount(2, { timeout: 20_000 });

  /* Que no solo existan: que lleven dentro lo que se les dio. */
  await expect(tarjetas.nth(0).locator('[data-titulo]')).toHaveText('Un hilo con etiqueta');
  await expect(tarjetas.nth(1).locator('[data-titulo]')).toHaveText('Un hilo sin etiqueta ninguna');
  await expect(tarjetas.nth(1).locator('[data-autora]')).toHaveText('Marina');

  /* Y que el aviso de error NO esté: durante la avería la lista salía
     vacía y este aviso salía puesto, que es el par exacto que había que
     poder distinguir. */
  await expect(page.locator('[data-error]')).toBeHidden();

  expect(reventones, 'pintar una tarjeta no puede lanzar nada').toEqual([]);
});

test('foro · el hilo sin etiqueta no enseña una etiqueta vacía', async ({ page }) => {
  await conBaseFingida(page);
  await page.goto('comunidad/', { waitUntil: 'load' });
  const sinEtiqueta = page.locator('#hilos .hilos__item').nth(1);
  await expect(sinEtiqueta).toBeVisible({ timeout: 20_000 });
  await expect(sinEtiqueta.locator('[data-etiqueta-nombre]')).toHaveCount(0);
});
