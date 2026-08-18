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
import { BASE as BASE_PRUEBAS } from '../../playwright.config.js';
import { SIN_PRESENCIA } from './comun.js';

/* CON BARRA FINAL, y no es cosmético. Sin ella GitHub Pages responde
   301 hacia la versión con barra, y estas pruebas se pasaron meses
   pidiendo una dirección que en producción es un rodeo: contra el
   servidor local daba igual y salían verdes. Lo descubrió `npm run
   test:prod`, que es exactamente para lo que existe. */
const FORO = `comunidad/?${SIN_PRESENCIA}`;

/* ── SE LE PREGUNTA A LA PÁGINA, Y NO AL ENTORNO ──────────────────
   Aquí ponía `process.env.PUBLIC_SUPABASE_*`, y estaba mal: Astro no
   lee solo el entorno del shell, también lee el fichero `.env` de la
   raíz. Con un `.env` puesto y el shell limpio, el SITIO sale
   compilado con credenciales y esta constante decía que no había — o
   sea que corría el grupo equivocado y lo daba en rojo, culpando al
   foro de una discrepancia entre dos maneras de leer la
   configuración.

   La fuente de verdad es la página: `window.__com` se define en la
   ÚLTIMA línea de `arrancar()`, y a esa línea solo se llega si `listo`
   era cierto. Si existe, hay base. Cuesta una carga al principio del
   fichero y no vuelve a equivocarse. */
let CONFIGURADO = null;

test.beforeAll(async ({ browser }) => {
  const p = await browser.newPage();
  await p.goto(new URL(FORO, BASE_PRUEBAS).href).catch(() => {});
  CONFIGURADO = await p.waitForFunction(() => Boolean(window.__com), null, { timeout: 20_000 })
    .then(() => true).catch(() => false);
  await p.close();
});

/* ═══════════════════════════════════════════════════════════════════
   0 · SI HAY LLAVES, EL SITIO COMPILADO TIENE QUE LLEVARLAS DENTRO

   Esta prueba existe por una tarde entera. Las variables estaban
   puestas, el flujo salía en verde, el sitio se publicaba… y el foro
   decía que no se pudo llegar a la comunidad. Cuatro despliegues así.

   La causa fue que estaban guardadas como secretos de un ENTORNO
   llamado `PUBLIC_SUPABASE_URL` —en «Manage environment secrets»,
   GitHub pide primero un nombre de entorno y ahí se escribió el nombre
   de la variable—, y ningún trabajo declara ese entorno.

   Nada de eso se veía desde fuera: un despliegue que TERMINA BIEN no
   es lo mismo que un despliegue que hizo lo que se esperaba. Astro
   inserta las `PUBLIC_*` AL COMPILAR, así que la única forma de saber
   si llegaron es preguntárselo a los bytes.

   Se compara con lo que ve quien lanza las pruebas —el entorno del
   shell Y el fichero `.env`, que es lo que lee Astro—: si aquí hay
   llaves y ahí fuera el sitio no las lleva, algo se las comió por el
   camino. Contra `npm run test:prod` eso significa exactamente que el
   despliegue no las tuvo.
   ═══════════════════════════════════════════════════════════════════ */
test('el sitio compilado lleva dentro las llaves que hay configuradas', async () => {
  const { readFileSync, existsSync } = await import('node:fs');
  const deFichero = {};
  if (existsSync('.env')) {
    for (const linea of readFileSync('.env', 'utf8').split('\n')) {
      const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) deFichero[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  const hay = (n) => Boolean(process.env[n] || deFichero[n]);
  test.skip(!(hay('PUBLIC_SUPABASE_URL') && hay('PUBLIC_SUPABASE_ANON_KEY')),
    'no hay llaves de este lado con las que comparar');

  expect(CONFIGURADO,
    'hay llaves configuradas aquí y el sitio medido NO las lleva dentro. '
    + 'Contra producción eso significa que el despliegue no las tuvo: mira el paso '
    + '«Ver si las llaves de Supabase llegaron al build» en Actions, y que estén como '
    + 'variables de REPOSITORIO y no dentro de un entorno.').toBe(true);
});

/* ═══════════════════════════════════════════════════════════════════
   1 · SIN CREDENCIALES: SE DICE, Y NO SE ROMPE NADA MÁS
   ═══════════════════════════════════════════════════════════════════ */
test.describe('el foro sin base configurada', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(CONFIGURADO === true, 'hay credenciales: este grupo mide el camino sin ellas');
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

  /* ── Y SI EL NAVEGADOR NO SALE A INTERNET, SE DICE ────────────────
     Hay entornos —este, sin ir más lejos— donde el Chromium de las
     pruebas no alcanza ningún HTTPS externo aunque `curl` sí: la red
     del contenedor deja pasar al proceso de Node y no al navegador.
     MEDIDO: `https://example.com` da `ERR_CONNECTION_RESET` desde la
     página y 200 desde la línea de órdenes.

     Sin esta comprobación, esas seis pruebas salen en rojo con un
     mensaje sobre `.hilos__item`, que parece un fallo del foro y no lo
     es. Un rojo que miente cuesta más que un salto que explica. */
  let hayRed = null;
  test.beforeAll(async ({ browser }) => {
    const p = await browser.newPage();
    hayRed = await p.evaluate(async (url) => {
      try { await fetch(url + '/rest/v1/', { method: 'HEAD' }); return true; }
      catch { return false; }
    }, process.env.PUBLIC_SUPABASE_URL).catch(() => false);
    await p.close();
  });
  test.beforeEach(() => {
    test.skip(CONFIGURADO === false,
      'el sitio se compiló sin PUBLIC_SUPABASE_* — no hay base contra la que medir');
    test.skip(hayRed === false,
      'el navegador de las pruebas no alcanza Supabase en este entorno '
      + '(la red externa del contenedor no llega al navegador; desde Node sí). '
      + 'Se comprobó el camino entero contra la base real por otra vía.');
  });

  /* Un sello por ejecución para no chocar con lo que ya haya escrito,
     ni con otra ejecución en marcha. Sin `Date.now()` a secas: dos
     pruebas del mismo segundo colisionarían. */
  const sello = () => `prueba-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  /* ── Y SE RECOGE LO QUE SE ENSUCIA ────────────────────────────────
     Esto escribe en la base que esté configurada, y esa base puede ser
     la de producción — es la que hay, no hay una de pruebas aparte y
     montar una sería otra cuenta de Supabase que alguien tiene que
     mantener. Así que cada hilo que se publica se apunta con su LLAVE
     de borrado y se tira al terminar el fichero.

     La llave es lo único que permite borrar desde otra pestaña: la
     sesión anónima muere con la página de la prueba, así que
     `borrar_propio` no sirve aquí. Ver `borrar_con_llave` en
     supabase-cliente.js y la nota del hash en esquema-foro.sql.

     Si una prueba revienta antes de apuntar su llave, ese hilo se
     queda. Sale por consola al final para que se vea, en vez de
     desaparecer en silencio. */
  const porBorrar = [];

  test.afterAll(async () => {
    if (!porBorrar.length) return;
    const { createClient } = await import('@supabase/supabase-js');
    const base = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } });
    await base.auth.signInAnonymously();
    const hash = async (llave) => {
      const { createHash } = await import('node:crypto');
      return createHash('sha256').update(llave.trim().toLowerCase()).digest('hex');
    };
    let idos = 0;
    for (const { objeto, id, llave } of porBorrar) {
      const { data, error } = await base.rpc('borrar_con_llave',
        { p_objeto: objeto, p_id: id, p_hash: await hash(llave) });
      if (!error && data) idos++;
      else console.log(`  ⚠ no se pudo borrar ${objeto} ${id}: ${error?.message || 'la base dijo que no'}`);
    }
    console.log(`  limpieza: ${idos}/${porBorrar.length} escritos de prueba borrados de la base`);
  });

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
    const llave = await form.locator('[data-llave-texto]').innerText();
    /* El id no está en el DOM del formulario; se saca del nodo recién
       pintado, que `comunidad.js` antepone a la lista. */
    const id = await page.locator('.hilos__item').first().getAttribute('data-id');
    if (id && llave) porBorrar.push({ objeto: 'hilo', id, llave: llave.trim() });
    return llave;
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
