/* ═══════════════════════════════════════════════════════════════════
   La configuración de las pruebas de extremo a extremo.

   ── CONTRA EL SITIO COMPILADO, NO CONTRA EL SERVIDOR DE DESARROLLO ─
   `npm run preview` sirve `dist/`, o sea exactamente lo que se publica:
   con el `base` de GitHub Pages puesto, con los módulos empaquetados y
   sin el HMR de Vite en medio. Es donde de verdad hay que comprobar que
   el foro publica y que las garzas se ven — un fallo que solo aparece
   al compilar es el que nadie descubre hasta que está en producción.

   ── UN SOLO NAVEGADOR, Y NO ES PEREZA ─────────────────────────────
   Este entorno trae un Chromium instalado y ninguno más. Correr las
   mismas pruebas en tres motores sin tenerlos sería declarar una
   cobertura que no existe.

   ── UN SOLO TRABAJADOR ────────────────────────────────────────────
   Las pruebas de presencia y de foro hablan por `BroadcastChannel`, que
   es de ORIGEN, no de pestaña: dos pruebas en paralelo se oirían entre
   sí y la de «solo hay una garza» vería la de «hay dos». En serie, cada
   una tiene el canal para ella.
   ═══════════════════════════════════════════════════════════════════ */
import { defineConfig, devices } from '@playwright/test';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/* ── CONTRA EL COMPILADO DE AQUÍ, O CONTRA LO QUE HAY PUBLICADO ────
   `npm test` mide `dist/`: lo que acaba de salir del horno, antes de
   que nadie lo vea. `npm run test:prod` mide LOS BYTES QUE RESPONDE
   dx-sebastian.github.io, servidos por el espejo de `prod-espejo.mjs`.

   La diferencia importa y no es teórica. Entre las dos hay un `git
   push`, un flujo de trabajo de GitHub, un empaquetado y una CDN, y
   cada una de esas cosas ha roto algo alguna vez: una ruta que en
   local resuelve y publicada no, un archivo que la poda de `dist` se
   llevó, una edición que no llegó a desplegarse y deja mirando a la
   anterior sin avisar. Una prueba en verde contra el compilado local
   no dice nada sobre lo que le llega a quien entra a las cuatro de la
   mañana; esta batería, apuntada al espejo, sí.

   Con el espejo NO se compila: se mide lo que hay publicado, tal cual,
   y si eso no es lo que se acaba de escribir, esa diferencia es
   precisamente el hallazgo.                                            */
const ESPEJO = process.env.GALENE_PROD === '1';
const PUERTO = ESPEJO ? 5179 : 5178;
export const BASE = `http://localhost:${PUERTO}/galene/`;

/* ── QUÉ CHROMIUM SE USA ───────────────────────────────────────────
   En una máquina normal, el que Playwright se descarga con
   `npx playwright install`, y entonces esto devuelve `undefined` y
   decide él.

   En un entorno que ya trae uno instalado —`PLAYWRIGHT_BROWSERS_PATH`
   apuntando a una carpeta con `chromium-<rev>/`— hay que decírselo a
   mano: las revisiones que espera cada versión de Playwright son
   distintas, y si no coinciden aborta pidiendo que se descargue otro
   navegador. Se busca el que HAY en vez de exigir uno concreto. */
function chromiumDelEntorno() {
  const raiz = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!raiz || !existsSync(raiz)) return undefined;
  const carpeta = readdirSync(raiz)
    .filter((n) => /^chromium-\d+$/.test(n))
    .sort()
    .pop();
  if (!carpeta) return undefined;
  const bin = join(raiz, carpeta, 'chrome-linux', 'chrome');
  return existsSync(bin) ? bin : undefined;
}
const CHROMIUM = chromiumDelEntorno();

export default defineConfig({
  testDir: './pruebas/e2e',
  /* El hero tarda, y en un entorno sin GPU tarda mucho: compilar el
     shader y subir nueve láminas por software es del orden de decenas de
     segundos, y encima la garza cae en 4.5 s de reloj a propósito. 90 s
     por prueba da margen para eso sin dejar que una colgada bloquee la
     suite. En una máquina con GPU ninguna llega a diez. */
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: BASE,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        /* Sin `channel`: el preset de escritorio pide el «headless
           shell», que es otro binario y otra revisión. Aquí se lanza el
           Chromium completo, que es el que hay. */
        channel: undefined,
        launchOptions: {
          ...(CHROMIUM ? { executablePath: CHROMIUM } : {}),
          args: [
            /* El mar es WebGL2 y aquí solo hay renderizado por software.
               mar.js detecta SwiftShader y se cae al respaldo CSS a
               propósito (ver `crear()`); las pruebas que necesitan la
               escena de verdad piden `?auditar-mar=1`, que es el asidero
               que ese mismo código ya tenía para poder auditarse. */
            '--enable-unsafe-swiftshader',
          ],
        },
      },
    },
  ],

  /* `astro preview` arranca un demonio y su proceso termina enseguida:
     Playwright lo ve morir y aborta la suite con «exited early». Se
     sirve `dist/` con el servidor de pruebas/servidor.mjs, que es un
     proceso vivo y sirve igual que GitHub Pages.

     ── CUIDADO CON `reuseExistingServer` ─────────────────────────────
     Si ya hay algo escuchando en el puerto, Playwright NO ejecuta este
     `command` — o sea que TAMPOCO COMPILA, y la suite corre contra el
     `dist/` que hubiera. Costó una prueba en rojo que no tenía nada
     malo: el asidero que buscaba se había añadido después de la última
     compilación.

     Se deja así porque en el uso normal —`npm run test:e2e` sin nada
     levantado— compila siempre, y reaprovechar el servidor entre
     ejecuciones ahorra minutos mientras se escribe una prueba. Si has
     dejado un servidor a mano en este puerto: bájalo o compila tú. */
  webServer: ESPEJO
    /* El espejo pide cada archivo a dx-sebastian.github.io con curl y
       lo sirve tal cual. NO compila nada: si compilara, dejaría de ser
       una medición de producción y volvería a ser una de `dist/`. */
    ? {
      command: 'node prod-espejo.mjs',
      url: BASE,
      reuseExistingServer: true,
      timeout: 60_000,
      stdout: 'ignore',
      stderr: 'pipe',
    }
    : {
      command: `npm run build && node pruebas/servidor.mjs ${PUERTO}`,
      url: BASE,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
});
