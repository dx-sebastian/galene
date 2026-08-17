/* ═══════════════════════════════════════════════════════════════════
   Galene — las etiquetas que nadie ve y que deciden cómo se comparte.

   La auditoría de la edición 0ef0013 encontró el trabajo hecho a medias
   y solo en la portada: canonical 1 de 5, og:url 1 de 5, twitter 1 de 5,
   y la `og:image` de las fichas de producto escrita como ruta relativa,
   que en Open Graph no resuelve — un enlace pegado en WhatsApp sale sin
   imagen y con el título del sitio en vez del de la pieza.

   ── ESTO NO ES SEO PARA MAÑANA ─────────────────────────────────────
   El `noindex` sigue puesto y este archivo no lo discute: mientras la
   revisión clínica no exista, el sitio no debe ser encontrable. Pero
   compartir un enlace por mensaje NO pasa por ningún buscador, y hoy
   ese enlace sale roto en cuatro de las cinco páginas. Eso pasa ahora,
   con el noindex puesto y con la gente que ya usa el sitio.
   ═══════════════════════════════════════════════════════════════════ */
import { test, expect } from '@playwright/test';

const PAGINAS = [
  ['portada', ''],
  ['comunidad', 'comunidad/'],
  ['expertos', 'expertos/'],
  ['productos', 'productos/'],
  ['ficha', 'productos/funda-coletero/'],
  ['acerca', 'acerca/'],
];

/* El sitio de verdad, el que se publica. Sale de astro.config.mjs y es
   contra el que tienen que apuntar todas las URLs absolutas: una
   `og:image` que diga `localhost` es la clase de fallo que dura meses
   porque no se ve mirando la página. */
const SITIO = 'https://dx-sebastian.github.io/galene/';

for (const [nombre, ruta] of PAGINAS) {
  test(`metadatos · ${nombre} se comparte entero`, async ({ page }) => {
    await page.goto(ruta, { waitUntil: 'domcontentloaded' });

    const m = await page.evaluate(() => {
      const et = (sel, attr = 'content') =>
        document.querySelector(sel)?.getAttribute(attr) || null;
      return {
        titulo: document.title,
        descripcion: et('meta[name="description"]'),
        canonical: et('link[rel="canonical"]', 'href'),
        ogTitulo: et('meta[property="og:title"]'),
        ogDescripcion: et('meta[property="og:description"]'),
        ogUrl: et('meta[property="og:url"]'),
        ogImagen: et('meta[property="og:image"]'),
        ogImagenAlt: et('meta[property="og:image:alt"]'),
        ogSitio: et('meta[property="og:site_name"]'),
        ogTipo: et('meta[property="og:type"]'),
        twitter: et('meta[name="twitter:card"]'),
        lang: document.documentElement.lang,
      };
    });

    const faltan = Object.entries(m).filter(([, v]) => !v).map(([k]) => k);
    expect(faltan.join(', '), `Etiquetas ausentes en /${ruta}`).toBe('');

    /* Absolutas, y del sitio bueno. Una ruta relativa en `og:image` o en
       `og:url` no la resuelve ningún cliente de mensajería. */
    for (const clave of ['canonical', 'ogUrl', 'ogImagen']) {
      expect(m[clave], `${clave} de /${ruta} tiene que ser una URL absoluta del sitio`)
        .toMatch(/^https:\/\/dx-sebastian\.github\.io\/galene\//);
    }

    /* Y cada página con su propio nombre: cuatro páginas compartiendo
       título es un enlace que no dice a dónde lleva. */
    expect(m.titulo.length, 'el título tiene que decir algo').toBeGreaterThan(8);
    expect(m.descripcion.length, 'la descripción también').toBeGreaterThan(40);
    /* El og:title puede llevar la marca colgada al final donde el
       <title> ya la trae de otra forma; lo que no puede es hablar de
       otra página. Se pide que compartan el arranque. */
    expect(m.ogTitulo.slice(0, 24), 'og:title y title tienen que ser la misma página')
      .toBe(m.titulo.slice(0, 24));
    expect(m.ogDescripcion).toBe(m.descripcion);
    expect(m.lang).toBe('es');
  });
}

test('metadatos · cada página tiene título y canonical propios', async ({ page }) => {
  const vistos = new Map();
  for (const [nombre, ruta] of PAGINAS) {
    await page.goto(ruta, { waitUntil: 'domcontentloaded' });
    const { t, c } = await page.evaluate(() => ({
      t: document.title,
      c: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    }));
    for (const [clave, valor] of [['título', t], ['canonical', c]]) {
      const k = clave + '::' + valor;
      expect(vistos.has(k), `${nombre} repite el ${clave} de ${vistos.get(k)}: «${valor}»`)
        .toBe(false);
      vistos.set(k, nombre);
    }
  }
});

test('metadatos · las imágenes que se comparten existen', async ({ page, request }) => {
  for (const [nombre, ruta] of PAGINAS) {
    await page.goto(ruta, { waitUntil: 'domcontentloaded' });
    const img = await page.evaluate(() =>
      document.querySelector('meta[property="og:image"]')?.getAttribute('content'));
    /* Se pide contra el servidor de pruebas, no contra el sitio real:
       lo que hay que comprobar es que el archivo está en `dist`, y una
       petición a internet metería la red en medio de la prueba. */
    const local = img.replace(SITIO, '');
    const res = await request.get(local);
    expect(res.status(), `la og:image de ${nombre} (${img}) no está en el compilado`)
      .toBe(200);
  }
});
