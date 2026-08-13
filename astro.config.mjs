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

  /* ── EL COMPRESOR SE COMÍA LOS ESPACIOS ────────────────────────────
     Astro trae `compressHTML: true` por defecto, y no solo colapsa
     espacios: BORRA el salto de línea que hay entre un texto y la
     etiqueta que le sigue. En una plantilla escrita así, que es como
     está escrita toda esta página:

         Pasa en bares, en taxis y entre gente conocida.
         <strong>Que no lo recuerdes…</strong>

     el resultado publicado era «conocida.Que no lo recuerdes». Diez
     veces en la portada, incluidas cuatro dentro de la ayuda: «segura.
     «No sé» es…», «pero todavía sin verificar», «después.Tu ubicación».

     Se veía en pantalla y no lo veía ninguna medida, porque el texto
     era correcto en el fuente y el fallo aparecía al compilar.

     Se apaga. Lo que se paga son unos kilobytes de espacios en blanco
     —que además comprimen a casi nada al servirse con gzip— y lo que se
     compra es que el texto publicado diga lo que dice el fuente. En un
     sitio donde lo que se lee ES la ayuda, esa no es una compensación
     que haya que pensar mucho.

     La alternativa era ir poniendo `{' '}` a mano en cada sitio. No es
     un arreglo: es una trampa esperando a la próxima persona que
     escriba un párrafo. */
  compressHTML: false,
  vite: {
    build: {
      // El mar es un shader: no hay nada que partir en trozos.
      assetsInlineLimit: 0,
    },
  },
});
