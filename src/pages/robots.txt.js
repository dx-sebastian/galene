/* ═══════════════════════════════════════════════════════════════════
   Galene — robots.txt, generado del mismo interruptor que las páginas.

   No existía. Un sitio sin robots.txt no está roto —los buscadores
   asumen que pueden pasar— pero deja la decisión contada en un solo
   sitio, la etiqueta `noindex` de cada página, y esa etiqueta solo se
   lee DESPUÉS de descargar la página. El robots.txt lo dice antes.

   ── LOS DOS ESTADOS, Y POR QUÉ SON COHERENTES ──────────────────────
   Mientras `VERIFICADO` sea falso: `Disallow: /`, y sin sitemap. Decir
   «no pases» y a la vez ofrecer un mapa de todo lo que hay dentro es
   contradecirse, y ante la contradicción cada buscador hace lo que le
   parece.

   Cuando sea cierto: paso libre y el sitemap anunciado. Un solo cambio
   mueve los dos archivos y las seis páginas — ver datos/sitio.js.
   ═══════════════════════════════════════════════════════════════════ */
import { VERIFICADO, absoluta } from '../datos/sitio.js';

export function GET({ site }) {
  const base = import.meta.env.BASE_URL;
  const cuerpo = VERIFICADO
    ? [
        '# Galene — información sobre sumisión química en Colombia.',
        '',
        'User-agent: *',
        'Allow: /',
        '',
        'Sitemap: ' + absoluta(base, site, 'sitemap.xml'),
        '',
      ].join('\n')
    : [
        '# Galene está en revisión: sus plazos clínicos y sus rutas de',
        '# atención todavía no los ha firmado un profesional de salud.',
        '# Hasta que eso ocurra, este sitio no debe aparecer en',
        '# resultados de búsqueda. Ver `VERIFICADO` en datos/sitio.js.',
        '',
        'User-agent: *',
        'Disallow: /',
        '',
      ].join('\n');

  return new Response(cuerpo, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
