/* ═══════════════════════════════════════════════════════════════════
   Galene — sitemap.xml, con las direcciones que existen de verdad.

   Tampoco existía. Se escribe ahora, con el freno todavía puesto, por
   la misma razón que se escribieron los canonical y las og:image
   estando el sitio en `noindex`: el trabajo de encontrabilidad se hace
   ANTES de levantar el freno, para que levantarlo sea una palabra y no
   una tarde.

   ── LAS DIRECCIONES SALEN DE UNA SOLA LISTA ────────────────────────
   `PAGINAS` en datos/sitio.js, más las fichas de producto tomadas de
   donde vive su lista. Escribir aquí las diez a mano sería la décima
   copia de algo que ya está escrito, y la copia que un día se queda
   con una pieza que ya no existe — un sitemap que promete una página
   404 es peor que no tener sitemap.

   Todas acaban en barra porque así es como responde GitHub Pages: sin
   ella contesta un 301, y un sitemap lleno de redirecciones reparte la
   autoridad de cada página entre dos direcciones.
   ═══════════════════════════════════════════════════════════════════ */
import { PAGINAS, rutasDeProductos, absoluta } from '../datos/sitio.js';
import { PRODUCTOS } from '../datos/productos.js';

export function GET({ site }) {
  const base = import.meta.env.BASE_URL;
  const todas = [...PAGINAS, ...rutasDeProductos(PRODUCTOS)];

  const cuerpo = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${todas.map(({ ruta, cambia, peso }) => `  <url>
    <loc>${absoluta(base, site, ruta)}</loc>
    <changefreq>${cambia}</changefreq>
    <priority>${peso}</priority>
  </url>`).join('\n')}
</urlset>
`;

  return new Response(cuerpo, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
