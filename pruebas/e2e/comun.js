/* Lo que comparten las pruebas. Nada de lógica: solo los asideros que
   ya existen en el sitio y las esperas que hacen falta porque esto es
   una pintura que tarda en montarse.

   TODO LO QUE SE ESPERA AQUÍ ES UN ESTADO DEL SITIO, no un `waitFor` a
   ojo. Una prueba que duerme dos segundos y confía pasa el día que la
   máquina va rápida y falla el día que va lenta, que es justo el día en
   que uno no está mirando. */

/** El hero con el shader de verdad. Sin `auditar-mar` este entorno cae
    al respaldo CSS —lo decide mar.js— y no hay garzas que mirar. */
export const CON_MAR = '?auditar-mar=1';

/** Apaga la presencia: para las pruebas que tienen que ver el sitio
    como lo ve alguien que está solo. */
export const SIN_PRESENCIA = 'presencia=off';

/** Espera a que el módulo de las garzas exista, o sea a que el mar haya
    arrancado. Es lo MÍNIMO, y basta para todo lo que sea el panel:
    elegir un pico o una frase no necesita que el ave haya terminado de
    caer.

    El plazo es largo porque en este entorno el WebGL es por software:
    compilar el shader y subir nueve láminas cuesta lo suyo. En una
    máquina con GPU son dos segundos. */
export async function esperarGarzas(page) {
  await page.waitForFunction(() => window.__garzas && window.__garzas.mia() !== null,
    null, { timeout: 60_000 });
}

/** Y esto además espera a que la visitante esté POSADA. Cuesta cuatro
    segundos y medio de reloj —cae despacio, a propósito— así que solo lo
    piden las pruebas que necesitan su caja en pantalla: el globo y el
    toque sobre el ave. */
export async function esperarHero(page) {
  await esperarGarzas(page);
  /* CUALQUIERA de sus catorce láminas, no la primera: en cada cuadro se
     ve UNA (o dos cruzándose) y las demás están a cero. Mirar solo la
     primera —que es `l01`, el primer cuadro de la caída— es esperar un
     instante que ya pasó. */
  await page.waitForFunction(() =>
    [...document.querySelectorAll('.vuelo--visita')]
      .some((el) => parseFloat(el.style.opacity || '0') > 0),
  null, { timeout: 60_000 });
}

/** La caja en pantalla de la garza de quien mira, ya posada. */
export async function cajaDeMiGarza(page) {
  return page.evaluate(() => {
    const capas = [...document.querySelectorAll('.vuelo--visita')]
      .filter((el) => parseFloat(el.style.opacity || '0') > 0.5);
    if (!capas.length) return null;
    const r = capas[0].getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  });
}

/** Abre el panel de «tu garza» y devuelve su caja. */
export async function abrirPanelGarza(page) {
  const panel = page.locator('.garza-yo__panel');
  if (!(await panel.isVisible())) await page.locator('.garza-yo__abrir').click();
  await panel.waitFor({ state: 'visible' });
  return panel;
}

/** Espera a que esta pestaña vea N sesiones ajenas. */
export function esperarVivas(page, n) {
  return page.waitForFunction((n) => window.__presencia.vivas().length === n, n,
    { timeout: 25_000 });
}
