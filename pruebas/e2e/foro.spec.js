/* ═══════════════════════════════════════════════════════════════════
   EL FORO — escribir, contestar, votar, ordenar, filtrar y borrar.

   Se prueba contra el sitio compilado y en el navegador, que es donde
   este foro existe: no hay servidor al que hacerle peticiones ni una
   base de datos que inspeccionar. Lo que se comprueba es lo mismo que
   ve quien lo usa.
   ═══════════════════════════════════════════════════════════════════ */
import { test, expect } from '@playwright/test';
import { SIN_PRESENCIA } from './comun.js';

/* CON BARRA FINAL, y no es cosmético. Sin ella GitHub Pages responde
   301 hacia la versión con barra, y estas once pruebas se pasaron meses
   pidiendo una dirección que en producción es un rodeo: contra el
   servidor local daba igual y salían verdes. Lo descubrió `npm run
   test:prod`, que es exactamente para lo que existe. Todos los enlaces
   del sitio ya terminaban en barra —lo vigila semantica.spec.js—; la
   única que no lo hacía era esta prueba. */
const FORO = `comunidad/?${SIN_PRESENCIA}`;

/* Cada prueba estrena pestaña, y `sessionStorage` es por pestaña, así
   que el almacén empieza vacío sin tener que limpiar nada. Lo que sí
   hace falta es que no queden hilos de la prueba anterior viajando por
   el canal: por eso el runner va con un solo trabajador (ver
   playwright.config.js) y aquí se vacía al entrar. */
test.beforeEach(async ({ page }) => {
  await page.goto(FORO);
  await page.waitForFunction(() => Boolean(window.__com));
  await page.evaluate(() => { window.__foro.vaciar(); window.__com.sincronizar(); });
});

test('la página sale con los diez hilos de ejemplo y el compositor listo', async ({ page }) => {
  await expect(page.locator('.hilos__item')).toHaveCount(10);
  /* El botón nace apagado en el HTML —sin JavaScript no hay dónde
     publicar— y este módulo lo enciende. Que esté encendido es la
     prueba de que el módulo llegó. */
  await expect(page.locator('#escribir-form button[type="submit"]')).toBeEnabled();
});

test('no publica un hilo sin título ni sin cuerpo, y lo dice en su voz', async ({ page }) => {
  await page.locator('.escribir__senuelo').click();
  await page.locator('#escribir-form button[type="submit"]').click();

  const aviso = page.locator('[data-escribir-parte]');
  await expect(aviso).toContainText('título');
  await expect(page.locator('.hilos__item')).toHaveCount(10);

  /* Con título pero sin cuerpo, el motivo cambia: son dos fallos
     distintos y no pueden dar el mismo mensaje. */
  await page.fill('[name="titulo"]', 'Una pregunta corta');
  await page.locator('#escribir-form button[type="submit"]').click();
  await expect(aviso).toContainText('Escribe un poco más');
  await expect(page.locator('.hilos__item')).toHaveCount(10);
});

test('publica un hilo, lo pone el primero y lo pinta como los demás', async ({ page }) => {
  await page.locator('.escribir__senuelo').click();
  await page.fill('[name="titulo"]', 'Volver al trabajo la semana siguiente');
  await page.fill('[name="cuerpo"]',
    'No sé si pedir unos días o si es peor quedarme en casa.\n\n¿A alguna le funcionó algo?');
  await page.locator('.chip--radio').nth(3).click();      // «Cuidados»
  await page.locator('#escribir-form button[type="submit"]').click();

  await expect(page.locator('[data-escribir-parte]')).toContainText('Se queda en este aparato');
  await expect(page.locator('.hilos__item')).toHaveCount(11);

  const primero = page.locator('.hilos__item').first();
  await expect(primero.locator('.hilo__titulo')).toHaveText('Volver al trabajo la semana siguiente');
  /* Los dos párrafos se separan por línea en blanco, como los de
     ejemplo: es una lista de párrafos, no un bloque con saltos. */
  await expect(primero.locator('.hilo__cuerpo p')).toHaveCount(2);
  /* Sin nombre por defecto: la casilla viene marcada y esa es la
     declaración de la casa. */
  await expect(primero.locator('.hilo__autora')).toHaveText('Anónima');
  await expect(primero.locator('.etiqueta')).toHaveText('Cuidados');
  await expect(primero.locator('.hilo__cuando')).toHaveText('ahora mismo');
  /* Y trae las mismas piezas que una tarjeta del HTML: sus flechas y su
     marcador a cero. (La garza de autoría ya no está en ninguna de las
     dos: las fotos de perfil se quitaron del foro entero.) */
  await expect(primero.locator('[data-marcador]')).toHaveText('0');
  await expect(page.locator('.sello')).toHaveCount(0);
});

test('se puede publicar con uno de los nombres de agua', async ({ page }) => {
  await page.locator('.escribir__senuelo').click();
  await page.uncheck('[name="anonima"]');
  await expect(page.locator('[data-escribir-nombre]')).toBeVisible();
  await page.selectOption('[name="nombre"]', 'Bruma');
  await page.fill('[name="titulo"]', 'Cómo se lo cuento a mi hermana');
  await page.fill('[name="cuerpo"]', 'Llevo tres días buscando la forma de decirlo sin que se derrumbe.');
  await page.locator('#escribir-form button[type="submit"]').click();

  await expect(page.locator('.hilos__item').first().locator('.hilo__autora')).toHaveText('Bruma');
});

test('contesta un hilo propio y la respuesta queda dentro de su hebra', async ({ page }) => {
  await page.evaluate(() => window.__foro.publicar({
    titulo: 'Un hilo para contestar', cuerpo: 'A ver si alguien contesta esto.', etiqueta: 'acompanar',
  }));
  await page.evaluate(() => window.__com.sincronizar());

  const hilo = page.locator('.hilos__item').first();
  await expect(hilo.locator('.hilo__sola')).toBeVisible();

  await hilo.locator('[data-responder]').click();
  await page.fill('.responder textarea', 'Yo pedí tres días y no expliqué nada. Nadie preguntó.');
  await page.locator('.responder button[type="submit"]').click();

  /* El contador aparece y la frase de «nadie ha respondido» se va: no
     pueden estar los dos. */
  await expect(hilo.locator('.hebra__cuenta')).toHaveText('1');
  await expect(hilo.locator('.hilo__sola')).toBeHidden();

  await hilo.locator('.hebra__abrir').click();
  await expect(hilo.locator('.nodo__texto')).toHaveText('Yo pedí tres días y no expliqué nada. Nadie preguntó.');
});

test('no envía una respuesta vacía', async ({ page }) => {
  await page.evaluate(() => window.__foro.publicar({
    titulo: 'Otro hilo cualquiera', cuerpo: 'Con cuerpo suficiente para que pase.', etiqueta: 'ruta',
  }));
  await page.evaluate(() => window.__com.sincronizar());

  const hilo = page.locator('.hilos__item').first();
  await hilo.locator('[data-responder]').click();
  await page.locator('.responder button[type="submit"]').click();
  await expect(page.locator('.responder__parte')).toContainText('Escribe algo');
  await expect(hilo.locator('.hebra__cuenta')).toBeHidden();
});

test('el voto se suma, se cambia de lado y se quita', async ({ page }) => {
  const votos = page.locator('.hilos__item').first().locator('.votos').first();
  const marcador = votos.locator('[data-marcador]');
  const base = Number(await votos.getAttribute('data-base'));

  await votos.locator('.voto--sube').click();
  await expect(marcador).toHaveText(String(base + 1));
  await expect(votos.locator('.voto--sube')).toHaveAttribute('aria-pressed', 'true');

  /* De +1 a −1 en un gesto, y la flecha de arriba se apaga en el mismo:
     dos flechas puestas a la vez serían dos votos para un lector de
     pantalla. */
  await votos.locator('.voto--baja').click();
  await expect(marcador).toHaveText(String(base - 1));
  await expect(votos.locator('.voto--sube')).toHaveAttribute('aria-pressed', 'false');
  await expect(votos.locator('.voto--baja')).toHaveAttribute('aria-pressed', 'true');

  await votos.locator('.voto--baja').click();
  await expect(marcador).toHaveText(String(base));
  await expect(votos.locator('.voto--baja')).toHaveAttribute('aria-pressed', 'false');
});

test('ordenar y filtrar cuentan también los hilos escritos aquí', async ({ page }) => {
  await page.evaluate(() => window.__foro.publicar({
    titulo: 'Hilo recién escrito', cuerpo: 'Tiene que salir el primero en Nuevos.', etiqueta: 'preguntas',
  }));
  await page.evaluate(() => window.__com.sincronizar());

  /* El mando vive plegado dentro de un <details>: primero se abre, que
     es lo que hace cualquiera que quiera ordenar. */
  await page.locator('.mando__boton').click();
  await expect(page.locator('.mando__panel')).toBeVisible();

  await page.locator('.mando [data-orden="recientes"]').click();
  await expect(page.locator('.hilos__item').first().locator('.hilo__titulo'))
    .toHaveText('Hilo recién escrito');

  /* «Sin responder» saca arriba lo que nadie ha contestado, y un hilo
     recién escrito no lo ha contestado nadie. */
  await page.locator('.mando [data-orden="solas"]').click();
  await expect(page.locator('.hilos__item').first().locator('.hilo__titulo'))
    .toHaveText('Hilo recién escrito');

  /* Y el filtro por etiqueta lo cuenta: el hilo nuevo va en
     «Preguntas», así que tiene que aparecer al filtrar por ella. */
  const antes = await page.evaluate(() => window.__com.estado().visibles);
  await page.locator('.mando [data-etiqueta="preguntas"]').click();
  const despues = await page.evaluate(() => window.__com.estado().visibles);
  expect(despues).toBeLessThan(antes);
  /* Y el botón cerrado dice qué hay puesto, sin abrirlo. */
  await expect(page.locator('[data-mando-estado]'))
    .toHaveText('Sin responder · Preguntas');
  await expect(page.locator('.hilos__item:not([hidden])').first().locator('.hilo__titulo'))
    .toHaveText('Hilo recién escrito');
});

test('borra lo propio, y el botón solo está en lo propio', async ({ page }) => {
  await page.evaluate(() => window.__foro.publicar({
    titulo: 'Esto lo voy a borrar', cuerpo: 'Un hilo con cuerpo suficiente.', etiqueta: 'despues',
  }));
  await page.evaluate(() => window.__com.sincronizar());

  const mio = page.locator('.hilos__item').first();
  await expect(mio.locator('[data-borrar]')).toBeVisible();
  /* Los diez de ejemplo no son de nadie de esta sesión: no se borran. */
  await expect(page.locator('.hilos__item').nth(1).locator('[data-borrar]')).toHaveCount(0);

  await mio.locator('[data-borrar]').click();
  await expect(page.locator('.hilos__item')).toHaveCount(10);
  await expect(page.locator('.hilo__titulo', { hasText: 'Esto lo voy a borrar' })).toHaveCount(0);
});

test('«borrar lo que escribí» aparece solo cuando hay algo, y lo tira todo', async ({ page }) => {
  await expect(page.locator('.comunidad__vaciar')).toHaveCount(0);

  await page.evaluate(() => {
    window.__foro.publicar({ titulo: 'Uno de dos', cuerpo: 'Cuerpo suficientemente largo.', etiqueta: 'ruta' });
    window.__foro.publicar({ titulo: 'Dos de dos', cuerpo: 'Cuerpo suficientemente largo.', etiqueta: 'ruta' });
    window.__com.sincronizar();
  });
  const vaciar = page.locator('.comunidad__vaciar');
  await expect(vaciar).toBeVisible();
  await expect(vaciar).toContainText('2');

  await vaciar.click();
  await expect(page.locator('.hilos__item')).toHaveCount(10);
  await expect(page.locator('.comunidad__vaciar')).toHaveCount(0);
});

test('lo escrito sobrevive a una recarga y no a cerrar la pestaña', async ({ page, context }) => {
  await page.evaluate(() => window.__foro.publicar({
    titulo: 'Sobrevive a la recarga', cuerpo: 'Guardado en la sesión de esta pestaña.', etiqueta: 'ruta',
  }));
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__com));
  await expect(page.locator('.hilo__titulo', { hasText: 'Sobrevive a la recarga' })).toHaveCount(1);

  /* Otra pestaña, sin nadie que se lo cuente: `sessionStorage` es de la
     pestaña, así que empieza vacía. Aquí el saludo del canal no lo
     rescata porque la difusión va apagada para esta prueba… así que se
     comprueba lo contrario: que el almacén NO es del navegador entero. */
  const otra = await context.newPage();
  await otra.goto(`comunidad?${SIN_PRESENCIA}`);
  await otra.waitForFunction(() => Boolean(window.__com));
  const suyos = await otra.evaluate(() => window.__foro.hilos().filter((h) => h.mio).length);
  expect(suyos).toBe(0);
  await otra.close();
});
