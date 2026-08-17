/* ═══════════════════════════════════════════════════════════════════
   Galene — que el anillo diga las horas que dice.

   ── POR QUÉ ESTA PRUEBA EXISTE, Y POR QUÉ AHORA ────────────────────
   El bloque «Estás aquí» dibuja las primeras 72 horas a escala real:
   0–6 h son 30° porque son el 8,3 % de 72, y 24–72 h son 240° porque
   son el 66,7 %. El primer tramo —el más importante— sale pequeño, y
   la tentación permanente de cualquier pase de diseño es agrandarlo
   «para que se vea». Hacerlo sería falsear la escala de un dato
   médico: es exactamente lo que este componente existe para no hacer.

   Hasta hoy nada lo vigilaba. Se escribe justo ANTES de repintar el
   anillo, y ese orden no es casual: primero se fija lo que no puede
   cambiar, y después se cambia todo lo demás.

   ── CÓMO SE MIDE ───────────────────────────────────────────────────
   No leyendo el CSS ni el `d` del trazado, sino preguntándole al
   navegador dónde ha puesto de verdad los extremos de cada arco
   (`getPointAtLength`) y convirtiendo esas coordenadas a horas. Si
   alguien cambia la geometría, el radio, el centro o el hueco entre
   tramos, esto lo ve.
   ═══════════════════════════════════════════════════════════════════ */
import { test, expect } from '@playwright/test';

/* Los mismos números que el componente, escritos aparte a propósito:
   una prueba que importa las constantes del código que vigila no
   vigila nada. Si RelojRescate.astro cambia un tramo, aquí hay que
   venir a cambiarlo a mano — que es justo el momento de preguntarse
   por qué se está cambiando. */
const VUELTA = 72;
const HUECO = 0.7;
const TRAMOS = [
  { id: 'a', h0: 0, h1: 6 },
  { id: 'b', h0: 6, h1: 24 },
  { id: 'c', h0: 24, h1: 72 },
];

/* Media hora de tolerancia sobre 72: el redondeo del dibujo corta las
   coordenadas a una décima de píxel y el radio son 126 px, así que un
   píxel es 0.09 h. Media hora deja sitio al redondeo y no a un error. */
const HOLGURA = 0.5;

test('reloj · el anillo dibuja las horas que dice, a escala', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('?hora=13&presencia=off', { waitUntil: 'load', timeout: 90_000 });
  await page.locator('#estas-aqui').scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);

  const medido = await page.evaluate(({ VUELTA, TRAMOS }) => {
    const svg = document.querySelector('.rr__esfera svg');
    if (!svg) return null;
    /* El centro sale del propio dibujo, no de una constante: si alguien
       mueve el reloj, se mueve con él. Es el centro del recuadro de la
       circunferencia que forman los tres arcos. */
    const arcos = TRAMOS.map((t) => svg.querySelector(`.rr__arco--${t.id}`));
    if (arcos.some((a) => !a)) return null;
    const cajas = arcos.map((a) => a.getBBox());
    const x0 = Math.min(...cajas.map((c) => c.x));
    const x1 = Math.max(...cajas.map((c) => c.x + c.width));
    const y0 = Math.min(...cajas.map((c) => c.y));
    const y1 = Math.max(...cajas.map((c) => c.y + c.height));
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;

    /* De coordenada a hora: el reloj arranca arriba (−90°) y avanza en
       el sentido de las agujas. */
    const aHora = (p) => {
      let a = Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI + 90;
      if (a < 0) a += 360;
      return (a / 360) * VUELTA;
    };
    return TRAMOS.map((t, i) => {
      const el = arcos[i];
      const L = el.getTotalLength();
      return {
        id: t.id,
        desde: aHora(el.getPointAtLength(0)),
        hasta: aHora(el.getPointAtLength(L)),
        largo: L,
      };
    });
  }, { VUELTA, TRAMOS });

  expect(medido, 'no se encontró el anillo').toBeTruthy();

  const males = [];
  for (const [i, t] of TRAMOS.entries()) {
    const m = medido[i];
    const esperaDesde = t.h0 + HUECO;
    /* El último arco cierra en 72, que es la misma coordenada que 0:
       ahí la hora medida vuelve a cero y hay que leerla como 72. */
    let hasta = m.hasta;
    if (t.h1 === VUELTA && hasta < VUELTA / 2) hasta += VUELTA;
    const esperaHasta = t.h1 - HUECO;
    console.log(`  ${t.id}: ${m.desde.toFixed(2)}→${hasta.toFixed(2)} h`
      + ` (se esperaba ${esperaDesde}→${esperaHasta})`);
    if (Math.abs(m.desde - esperaDesde) > HOLGURA) {
      males.push(`${t.id} empieza en ${m.desde.toFixed(2)} h y no en ${esperaDesde}`);
    }
    if (Math.abs(hasta - esperaHasta) > HOLGURA) {
      males.push(`${t.id} termina en ${hasta.toFixed(2)} h y no en ${esperaHasta}`);
    }
  }

  /* Y la comprobación que de verdad importa: que los tres arcos guarden
     entre sí la proporción de sus horas. Un tramo agrandado «para que
     se vea» rompe esto aunque los extremos parezcan estar bien. */
  const duracion = (t) => t.h1 - t.h0 - 2 * HUECO;
  const base = medido[0].largo / duracion(TRAMOS[0]);
  for (const [i, t] of TRAMOS.entries()) {
    const porHora = medido[i].largo / duracion(t);
    const desvio = Math.abs(porHora / base - 1);
    console.log(`  ${t.id}: ${(medido[i].largo).toFixed(1)} px`
      + ` para ${duracion(t)} h → ${porHora.toFixed(2)} px/h`);
    if (desvio > 0.02) {
      males.push(`${t.id} dibuja ${porHora.toFixed(2)} px por hora`
        + ` y el primero dibuja ${base.toFixed(2)}: la escala está falseada`);
    }
  }

  expect(males.join('\n'), 'El anillo no está a escala').toBe('');
});

/* ── Y QUE LOS SEIS HORIZONTES MIDAN SUS PLAZOS ────────────────────
   La otra mitad del mismo argumento. Las barras se repintaron como
   pinceladas en la fase 2 y sus anchos siguen saliendo de
   `cierra / TOPE` en el componente; esto lo comprueba sobre el ancho
   RENDERIZADO, que es lo que se ve.

   El tope son 132 h y no 120 a propósito: si la barra más larga con
   plazo llegara al borde, se leería igual que las que no caducan. */
test('reloj · los horizontes miden sus plazos', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('?hora=13&presencia=off', { waitUntil: 'load', timeout: 90_000 });
  await page.locator('.rr__horizontes').scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);

  const filas = await page.evaluate(() =>
    [...document.querySelectorAll('.rr__horizonte')].map((li) => ({
      nombre: li.querySelector('.rr__horizonte__nombre')?.textContent?.trim() || '?',
      cierra: li.dataset.cierra,
      riel: li.querySelector('.rr__riel').getBoundingClientRect().width,
      pigmento: li.querySelector('.rr__riel__pigmento').getBoundingClientRect().width,
    })));

  expect(filas.length, 'tienen que ser las seis ventanas').toBe(6);

  const TOPE = 132;
  const males = [];
  for (const f of filas) {
    const fraccion = f.pigmento / f.riel;
    if (f.cierra === 'inf') {
      console.log(`  ${f.nombre}: sin plazo · ${(fraccion * 100).toFixed(0)} % del riel`);
      /* Las eternas se desvanecen y salen: tienen que llegar casi al
         final, o dejarían de leerse como «no caduca». */
      if (fraccion < 0.85) males.push(`${f.nombre} no caduca y solo cubre el ${(fraccion * 100).toFixed(0)} %`);
      continue;
    }
    const espera = Number(f.cierra) / TOPE;
    console.log(`  ${f.nombre}: ${f.cierra} h → ${(fraccion * 100).toFixed(1)} %`
      + ` (se esperaba ${(espera * 100).toFixed(1)} %)`);
    /* Dos puntos porcentuales: el ancho se redondea a un entero de
       píxel y el riel mide unos 700, así que un píxel es 0,14 %. */
    if (Math.abs(fraccion - espera) > 0.02) {
      males.push(`${f.nombre} dibuja ${(fraccion * 100).toFixed(1)} %`
        + ` para ${f.cierra} h, y le tocan ${(espera * 100).toFixed(1)} %`);
    }
  }
  expect(males.join('\n'), 'Un plazo dibujado no mide lo que dice').toBe('');
});
