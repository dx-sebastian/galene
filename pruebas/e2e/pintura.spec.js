/* ═══════════════════════════════════════════════════════════════════
   Galene — que ninguna página se quede sin pintura.

   ── LO QUE ENCONTRÓ LA AUDITORÍA, Y POR QUÉ NO ERA LO QUE PARECÍA ──
   Medido sobre la edición publicada, contando lo que se pinta de
   verdad —imágenes, lienzos y fondos con `url(...)`, no degradados de
   un color—:

       portada    22 piezas · mayor sequía 0,7 pantallas
       productos   5 piezas · 0,7
       acerca      0 piezas · 1,9 pantallas seguidas sin nada
       comunidad   0 piezas · 4,7
       expertos    0 piezas · 5,1

   La primera lectura fue «faltan ilustraciones». La segunda, mirando
   el código, fue otra: `--arte-papel`, `--arte-aguadas` y los filetes
   valen `none` hasta que `:root` recibe la clase `lectura-cerca`, y
   esa clase la pone `entrada.js` cuando la boca del hero se acerca al
   viewport. `entrada.js` solo se carga en la portada.

   O sea que no faltaba arte: había una compuerta de rendimiento
   pensada para proteger el hero, y en las páginas que no tienen hero
   no la abría nadie. Tres páginas enteras renderizando `none`.

   ── QUÉ EXIGE ESTA PRUEBA ──────────────────────────────────────────
   Que toda página tenga al menos una pieza pintada, y que no haya
   tramos largos de nada. No dice que sean bonitas — eso no lo puede
   decir una prueba. Dice que la página pertenece al mismo sitio que la
   portada, que es lo que un jurado comprueba en cuarenta segundos y lo
   que aquí no se cumplía en tres de cinco.
   ═══════════════════════════════════════════════════════════════════ */
import { test, expect } from '@playwright/test';

const PAGINAS = [
  ['portada', ''],
  ['expertos', 'expertos/'],
  ['comunidad', 'comunidad/'],
  ['productos', 'productos/'],
  ['ficha', 'productos/funda-coletero/'],
  ['acerca', 'acerca/'],
];

/* Cuántas pantallas seguidas puede recorrer alguien sin encontrarse
   nada pintado. Una y media es aire, tres es un documento. */
const SEQUIA = 1.5;

/* Y qué parte de la página, que es la misma pregunta hecha de la otra
   forma. Hacen falta las dos: en una página de nueve pantallas, una y
   media es un respiro; en una de dos, es la página entera. */
const PARTE = 0.55;

test.describe('pintura', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });

  for (const [nombre, ruta] of PAGINAS) {
    test(`pintura · ${nombre} pertenece al mismo cuaderno`, async ({ page }) => {
      await page.goto(ruta, { waitUntil: 'load', timeout: 90_000 });
      await page.waitForTimeout(1200);
      /* Recorrer la página entera: las escenas revelan al bajar y las
         láminas diferidas no se piden hasta que hacen falta. */
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 400) {
          window.scrollTo(0, y);
          await new Promise((r) => requestAnimationFrame(r));
        }
        window.scrollTo(0, 0);
        await new Promise((r) => setTimeout(r, 600));
      });

      const r = await page.evaluate(() => {
        const visible = (el) => {
          if (!el.getClientRects().length) return false;
          const cs = getComputedStyle(el);
          return cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.05;
        };
        const piezas = [];
        const anota = (el, cual) => {
          const c = el.getBoundingClientRect();
          /* Un icono de 24 px no es pintura. Se pide una mancha que se
             vea desde el otro lado de la habitación. */
          if (c.height < 60 || c.width < 160) return;
          piezas.push({
            y: Math.round(c.top + scrollY), alto: Math.round(c.height),
            ancho: Math.round(c.width), cual,
          });
        };
        for (const el of document.querySelectorAll('img, canvas, svg, picture')) {
          if (visible(el)) anota(el, el.tagName.toLowerCase());
        }
        /* ── CADA PSEUDOELEMENTO SE MIDE POR SU CUENTA ──────────────
           La primera versión paraba en el primer fondo con `url()` que
           encontraba y anotaba la caja DEL ELEMENTO. En /acerca eso
           bastaba para equivocarse entero: `::before` es el grano a
           sangre y `::after` es la aguada que entra por el margen, y
           las dos quedaban reducidas a una sola entrada con la caja de
           la sección — o sea, clasificadas como fondo. La página salía
           «desnuda» cuando ya tenía su aguada puesta.

           Un pseudoelemento no tiene `getBoundingClientRect`, pero sí
           tiene ancho, alto y desplazamiento calculados, que es
           justo lo que hace falta para distinguir una mancha de medio
           ancho de un papel a sangre. */
        const numero = (v, respaldo) => {
          const x = parseFloat(v);
          return Number.isFinite(x) ? x : respaldo;
        };
        for (const el of document.querySelectorAll('body *')) {
          if (!visible(el)) continue;
          const caja = el.getBoundingClientRect();
          for (const ps of ['', '::before', '::after']) {
            const cs = getComputedStyle(el, ps || undefined);
            if (ps && cs.content === 'none') continue;
            /* `url(...)` y no un degradado: un degradado de dos tintas
               es color, no pintura. Y esa distinción es justo la que
               separa «la página tiene fondo» de «la página tiene un
               cuadro». */
            if (!/url\(/.test(cs.backgroundImage)) continue;
            if (!ps) { anota(el, 'css'); continue; }
            const alto = numero(cs.height, caja.height);
            const ancho = numero(cs.width, caja.width);
            if (alto < 60 || ancho < 160) continue;
            piezas.push({
              y: Math.round(caja.top + scrollY + numero(cs.top, 0)),
              alto: Math.round(alto), ancho: Math.round(ancho), cual: 'css' + ps,
            });
          }
        }
        piezas.sort((a, b) => a.y - b.y);
        const total = document.body.scrollHeight;
        /* ── FONDO ES LO QUE VA A SANGRE, no lo que es alto ──────────
           La primera versión llamaba «fondo» a todo lo que midiera más
           del 70 % del alto de la página, y en /acerca —donde una sola
           sección ES la página— eso se tragaba la aguada, que mide un
           70 % de su sección. La prueba decía que la página seguía
           desnuda cuando ya no lo estaba.

           Una aguada que entra por el margen ocupa medio ancho; el
           papel de fondo ocupa la hoja entera. Esa es la diferencia
           que importa, y es de ANCHO, no de alto. */
        const esFondo = (p) => p.alto >= total * 0.7 && p.ancho >= innerWidth * 0.95;
        const fondo = piezas.filter(esFondo).length;
        const utiles = piezas.filter((p) => !esFondo(p));

        const H = innerHeight;
        let mayor = 0, tramo = null, cursor = 0;
        for (const p of [...utiles, { y: total, alto: 0 }]) {
          if (p.y - cursor > mayor) { mayor = p.y - cursor; tramo = [cursor, p.y]; }
          cursor = Math.max(cursor, p.y + p.alto);
        }
        return {
          total, fondo, piezas: utiles.length,
          sequia: +(mayor / H).toFixed(1),
          parte: +(mayor / total).toFixed(2), tramo,
          muestra: utiles.slice(0, 6).map((p) => `${p.y}+${p.alto} ${p.cual}`),
        };
      });

      console.log(`  ${nombre}: ${r.piezas} piezas · ${r.fondo} de fondo`
        + ` · mayor sequía ${r.sequia} pantallas = ${Math.round(r.parte * 100)} % de la página`
        + (r.tramo ? ` (${r.tramo[0]}→${r.tramo[1]} px de ${r.total})` : ''));
      if (r.muestra.length) console.log(`      ${r.muestra.join(' | ')}`);

      expect(r.piezas + r.fondo,
        `${nombre} no tiene una sola pieza pintada: no parece del mismo sitio`)
        .toBeGreaterThan(0);
      expect(r.sequia,
        `${nombre} tiene ${r.sequia} pantallas seguidas sin nada pintado`)
        .toBeLessThanOrEqual(SEQUIA);
      /* Y en proporción, porque «pantalla y media» no significa lo
         mismo en una página de nueve que en una de dos: /acerca mide
         1,9 pantallas enteras, así que el límite absoluto la aprobaría
         estando desnuda de arriba abajo. */
      expect(r.parte,
        `${nombre} pasa el ${Math.round(r.parte * 100)} % de su altura sin nada pintado`)
        .toBeLessThanOrEqual(PARTE);
    });
  }
});
