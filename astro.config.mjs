import { defineConfig } from 'astro/config';

/* Galene se publica en GitHub Pages bajo /galene, así que todo lo que
   viva en public/ se sirve con ese prefijo. En el código nunca se
   escribe la ruta a mano: se compone con import.meta.env.BASE_URL, y
   así el sitio funciona igual en local (donde la base es /) que en
   producción. */
export default defineConfig({
  site: 'https://dx-sebastian.github.io',
  base: '/galene',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  vite: {
    build: {
      // El mar es un shader: no hay nada que partir en trozos.
      assetsInlineLimit: 0,
    },
  },
});
