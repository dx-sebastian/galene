/* ═══════════════════════════════════════════════════════════════════
   Galene — que el freno esté echado, y que esté echado de una pieza.

   La auditoría de la edición 0ef0013 encontró la decisión de no ser
   encontrable tomada SEIS VECES —una etiqueta escrita a mano en cada
   página— y ni `robots.txt` ni `sitemap.xml` por ninguna parte. Seis
   copias de una decisión no son una decisión: son seis oportunidades de
   que un día quede a medias, y una etiqueta que falta no se ve mirando
   la página.

   ── LO QUE VIGILA ESTE ARCHIVO Y LO QUE NO ─────────────────────────
   Aquí se comprueba la COHERENCIA de un compilado: que las páginas y el
   robots.txt digan lo mismo, que el sitemap prometa solo direcciones que
   existen, y que ninguna página se haya vuelto a escribir su propia
   etiqueta por su cuenta.

   Lo que NO se puede comprobar aquí es que cambiar el interruptor mueva
   de verdad las dos versiones, porque eso pide compilar dos veces. Eso
   vive en `scripts/comprobar-interruptor.mjs`, se lanza con
   `npm run interruptor`, y tarda un minuto: por eso está fuera de la
   batería normal y no dentro.
   ═══════════════════════════════════════════════════════════════════ */
import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PAGINAS = ['', 'comunidad/', 'expertos/', 'productos/',
  'productos/funda-coletero/', 'acerca/'];

test('indexación · las páginas y el robots.txt dicen lo mismo', async ({ page, request }) => {
  const conNoindex = [];
  for (const ruta of PAGINAS) {
    await page.goto(ruta, { waitUntil: 'domcontentloaded' });
    const bloqueada = await page.evaluate(() =>
      /noindex/i.test(document.querySelector('meta[name="robots"]')?.content || ''));
    if (bloqueada) conNoindex.push(ruta || '(portada)');
  }

  const res = await request.get('robots.txt');
  expect(res.status(), 'robots.txt tiene que existir').toBe(200);
  const robots = await res.text();
  const prohibe = /^Disallow: \/$/m.test(robots);

  console.log(`  noindex en ${conNoindex.length}/${PAGINAS.length} páginas · `
    + `robots.txt ${prohibe ? 'prohíbe' : 'deja pasar'}`);

  /* Ni a medias ni contradiciéndose: o el sitio entero está cerrado o
     está abierto, y el robots.txt dice lo mismo que las etiquetas. Un
     robots.txt que deja pasar sobre páginas con `noindex` no rompe
     nada, pero es una contradicción escrita, y ante una contradicción
     cada buscador hace lo que le parece. */
  expect(conNoindex.length === 0 || conNoindex.length === PAGINAS.length,
    `El freno está a medias: puesto solo en ${conNoindex.join(', ')}`).toBe(true);
  expect(prohibe, 'robots.txt tiene que decir lo mismo que las etiquetas')
    .toBe(conNoindex.length === PAGINAS.length);
});

test('indexación · el sitemap solo promete páginas que existen', async ({ request }) => {
  const res = await request.get('sitemap.xml');
  expect(res.status(), 'sitemap.xml tiene que existir').toBe(200);
  expect(res.headers()['content-type'] || '').toMatch(/xml/);

  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  console.log(`  el sitemap lista ${urls.length} direcciones`);
  expect(urls.length, 'el sitemap no puede estar vacío').toBeGreaterThan(5);

  const malas = [];
  for (const u of urls) {
    if (!u.startsWith('https://dx-sebastian.github.io/galene/')) {
      malas.push(`${u} — no es una dirección absoluta del sitio`);
      continue;
    }
    /* Con barra final: sin ella GitHub Pages responde 301, y un sitemap
       lleno de redirecciones reparte la autoridad de cada página entre
       dos direcciones. */
    if (!u.endsWith('/')) malas.push(`${u} — sin barra final`);

    const local = u.replace('https://dx-sebastian.github.io/galene/', '');
    const r = await request.get(local, { maxRedirects: 0 });
    if (r.status() !== 200) malas.push(`${u} — responde ${r.status()}`);
  }
  expect(malas.join('\n'), 'Direcciones del sitemap que no sirven').toBe('');
});

/* ── Y QUE NADIE SE ESCRIBA SU PROPIA ETIQUETA ─────────────────────
   Esta mira el CÓDIGO, no el compilado, y es la que impide que la
   próxima página nazca con su `noindex` a mano y vuelva a partir la
   decisión en trozos. La única excepción declarada es el 404: una
   página de error no es contenido ni con el sitio abierto. */
test('indexación · la decisión vive en un solo sitio', async () => {
  const paginas = 'src/pages';
  const sueltos = [];
  const recorrer = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const ruta = join(dir, e.name);
      if (e.isDirectory()) { recorrer(ruta); continue; }
      if (!/\.(astro|js)$/.test(e.name)) continue;
      if (e.name === '404.astro' || e.name === 'robots.txt.js') continue;
      const codigo = readFileSync(ruta, 'utf8');
      /* Solo cuenta la etiqueta de verdad, no las notas que la
         explican: se busca el atributo, no la palabra. */
      const literal = /content=["'][^"']*noindex/i.test(codigo);
      const conInterruptor = /VERIFICADO/.test(codigo);
      if (literal && !conInterruptor) sueltos.push(ruta);
    }
  };
  recorrer(paginas);
  expect(sueltos.join(', '),
    'Páginas que se escriben su propio noindex sin pasar por VERIFICADO').toBe('');
});
