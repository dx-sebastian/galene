/* ═══════════════════════════════════════════════════════════════════
   Galene — que una pantalla más ancha no dé un texto más estrecho.

   ── DE DÓNDE SALE ESTA PRUEBA ──────────────────────────────────────
   De un fallo que estuvo publicado y que ninguna de las noventa y ocho
   pruebas anteriores podía ver, porque todas miraban a 1440 px o menos.

   Una coma mal puesta en la hoja de estilos metió `.comunidad-panel`
   dentro de una regla que no era suya. Se llevó un `max-width: 62rem`
   mientras seguía calculando su relleno lateral con
   `(100% − 72rem) / 2` — y ese `100%` no es el suyo, es el del padre,
   que sí ocupa la ventana entera. Los dos juntos comen la caja desde
   los lados a razón de medio píxel por píxel de pantalla:

       1280 px  →  columna 864 px, el titular en 2 líneas
       1440 px  →  columna 704 px, en 3
       1680 px  →  columna 464 px, en 7
       1920 px  →  columna   0 px, en 31: «resolverse» partida letra
                   a letra en vertical
       2560 px  →  la rejilla entera a cero

   Es un fallo bonito de entender y feísimo de ver, y tiene una forma
   reconocible: **cuanto más grande la pantalla, más estrecho el
   texto**. Eso es lo que se mide aquí, y se mide como invariante y no
   como número — no hay un ancho correcto para cada bloque, pero
   ninguno puede encogerse cuando la ventana crece.

   ── POR QUÉ HASTA 2560 ─────────────────────────────────────────────
   Porque ahí es donde el fallo es total, y porque un portátil de 16"
   con la ventana maximizada ya está en 1728. La franja 1680–2560 no la
   miraba nadie.

   ── LO QUE NO PRUEBA ───────────────────────────────────────────────
   No dice si algo es bonito a 2560. Dice que no se ha roto. Son cosas
   distintas y esta solo sabe hacer la segunda.
   ═══════════════════════════════════════════════════════════════════ */
import { test, expect } from '@playwright/test';

const ANCHOS = [1280, 1440, 1680, 1920, 2560];

const PAGINAS = [
  ['portada', ''],
  ['comunidad', 'comunidad/'],
  ['expertos', 'expertos/'],
  ['productos', 'productos/'],
  ['acerca', 'acerca/'],
];

/* Un bloque de texto cuenta si lo lee alguien: visible, con letra
   dentro y con suficiente para que su ancho signifique algo. Menos de
   veinticinco caracteres cabe en cualquier sitio y no dice nada. */
const MINIMO_CARACTERES = 25;

/* El suelo absoluto. A 180 px no cabe una palabra larga de titular
   —«resolverse» a 60 px de cuerpo mide 280—, así que por debajo de
   eso ya hay algo roto pase lo que pase. */
const SUELO = 180;

/* Cuánto se le permite encoger a un bloque al ensanchar la ventana.
   Cero sería mentira: hay columnas que se reparten de otra forma al
   cambiar la disposición —una rejilla de dos columnas que a 1680
   estrecha la primera para que quepa mejor la segunda es una decisión,
   no un fallo—. Un 12 % deja sitio a esos reajustes y no al derrumbe,
   que empieza en el 20 % y termina en el 100 %. */
const MARGEN = 0.88;

/** Mide, para cada bloque de texto de `main`, su ancho y en cuántas
    líneas cae. La clave es el principio de su texto: sobrevive a un
    cambio de ventana, que es lo que hace falta para comparar la misma
    frase a cinco anchos distintos. */
function medirBloques() {
  return [...document.querySelectorAll('main :is(h1, h2, h3, p, li)')]
    .map((el) => {
      const texto = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (texto.length < 25) return null;
      /* Se descarta lo que NO SE PINTA, y ancho cero no es eso: un
         bloque de cuarenta caracteres con ancho cero y alto de treinta
         líneas es exactamente el derrumbe que esta prueba busca. Si se
         filtrara por ancho, el peor caso —el de 1920 px— se escaparía
         por ser demasiado malo. */
      if (!el.getClientRects().length) return null;
      const caja = el.getBoundingClientRect();
      if (!caja.height) return null;
      /* Lo que está apagado no se mide: el reloj de rescate tiene cinco
         fichas montadas y solo una encendida, y las otras cuatro están
         a opacidad cero con el tamaño que les toque. */
      for (let n = el; n; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.display === 'none' || cs.visibility === 'hidden'
            || parseFloat(cs.opacity) === 0) return null;
      }
      const rango = document.createRange();
      rango.selectNodeContents(el);
      return {
        clave: texto.slice(0, 40),
        ancho: Math.round(caja.width),
        lineas: rango.getClientRects().length,
      };
    })
    .filter(Boolean);
}

for (const [nombre, ruta] of PAGINAS) {
  test(`anchos · ${nombre} no se estrecha al ensanchar la ventana`, async ({ browser }) => {
    /* Un contexto por ancho, y no `setViewportSize`, porque hay
       decisiones que se toman al cargar —`isMobile`, las variantes de
       lámina— y cambiar el tamaño después las deja como estaban. */
    const porAncho = new Map();
    for (const ancho of ANCHOS) {
      const ctx = await browser.newContext({
        viewport: { width: ancho, height: 1000 },
        deviceScaleFactor: 1,
        reducedMotion: 'reduce',
      });
      const page = await ctx.newPage();
      await page.goto(ruta, { waitUntil: 'load', timeout: 90_000 });
      /* Las escenas revelan al bajar; sin esto media página estaría a
         opacidad cero y se descartaría entera. */
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 700) {
          window.scrollTo(0, y);
          await new Promise((r) => requestAnimationFrame(r));
        }
        window.scrollTo(0, 0);
        await new Promise((r) => setTimeout(r, 400));
      });
      porAncho.set(ancho, await page.evaluate(medirBloques));
      await ctx.close();
    }

    const referencia = new Map(porAncho.get(ANCHOS[0]).map((b) => [b.clave, b]));
    const males = [];

    for (const ancho of ANCHOS) {
      for (const b of porAncho.get(ancho)) {
        if (b.ancho < SUELO) {
          males.push(`${ancho}px · «${b.clave}» mide ${b.ancho}px`
            + ` en ${b.lineas} línea(s) — por debajo del suelo de ${SUELO}px`);
          continue;
        }
        const antes = referencia.get(b.clave);
        if (!antes) continue;   // apareció al ensanchar: no hay con qué comparar
        if (b.ancho < antes.ancho * MARGEN) {
          males.push(`${ancho}px · «${b.clave}» encogió de ${antes.ancho}px`
            + ` a ${b.ancho}px (${Math.round((1 - b.ancho / antes.ancho) * 100)} %)`
            + ` y pasó de ${antes.lineas} a ${b.lineas} línea(s)`);
        }
      }
    }

    const resumen = ANCHOS.map((a) => {
      const bs = porAncho.get(a);
      const estrecho = bs.reduce((m, b) => Math.min(m, b.ancho), Infinity);
      return `${a}:${bs.length}bloques/min${estrecho}px`;
    }).join(' · ');
    console.log(`  ${nombre} — ${resumen}`);

    expect(males.join('\n'),
      'Bloques que se estrechan cuando la pantalla crece').toBe('');
  });
}
