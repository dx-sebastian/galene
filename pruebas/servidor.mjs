/* ═══════════════════════════════════════════════════════════════════
   Un servidor de ficheros para `dist/`, y solo para las pruebas.

   ── POR QUÉ NO `astro preview` ────────────────────────────────────
   Porque en esta versión arranca un demonio y el proceso de la orden
   TERMINA enseguida. Playwright levanta su `webServer` y ve un proceso
   que se murió a los dos segundos, así que aborta la suite entera con
   «exited early». No es un fallo de Astro —un demonio es cómodo para
   trabajar— pero no sirve para un runner que necesita un proceso vivo
   al que matar al acabar.

   ── Y POR QUÉ NO UNA DEPENDENCIA ──────────────────────────────────
   Porque lo que hace falta cabe aquí: servir ficheros de una carpeta
   bajo el prefijo `/galene/`, con los tipos MIME que este sitio usa y
   con `index.html` para las rutas de directorio. Eso es exactamente lo
   que hace GitHub Pages, que es donde esto se publica — así que las
   pruebas corren contra la misma forma de servir que la de verdad.

   Cero dependencias nuevas para poder probar es un buen trato en un
   proyecto cuyo `package.json` tiene una sola.
   ═══════════════════════════════════════════════════════════════════ */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const RAIZ = resolve(process.argv[3] || 'dist');
const PUERTO = Number(process.argv[2] || 5178);
const BASE = '/galene';

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.webp': 'image/webp',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.woff2':'font/woff2',
  '.txt':  'text/plain; charset=utf-8',
  '.md':   'text/markdown; charset=utf-8',
  /* El sitemap. Sin esta línea salía como `application/octet-stream` y
     la prueba que comprueba su tipo fallaba contra un servidor que no
     se parece al de verdad: GitHub Pages lo sirve como XML. Un servidor
     de pruebas que miente sobre las cabeceras hace medir otra cosa. */
  '.xml':  'application/xml; charset=utf-8',
};

createServer(async (pet, res) => {
  try {
    let ruta = decodeURIComponent(new URL(pet.url, 'http://x').pathname);
    if (ruta.startsWith(BASE)) ruta = ruta.slice(BASE.length) || '/';

    /* Que nadie salga de `dist/` con un `..`: es un servidor de pruebas,
       pero un servidor de pruebas con un escape de directorio sigue
       siendo un escape de directorio. */
    const dentro = resolve(join(RAIZ, normalize(ruta)));
    if (!dentro.startsWith(RAIZ)) { res.writeHead(403).end(); return; }

    let archivo = dentro;
    try {
      if ((await stat(archivo)).isDirectory()) {
        /* ── EL SALTO A LA BARRA FINAL, COMO EL DE VERDAD ──────────
           GitHub Pages responde 301 a una carpeta pedida sin barra
           final: `/galene/comunidad` manda a `/galene/comunidad/`.
           Este servidor servía las dos igual, y esa comodidad costó
           cara — once pruebas del foro pedían `comunidad` sin barra y
           salían verdes durante meses; solo se vieron el día que la
           batería miró a producción, donde eso es un rodeo.

           Un servidor de pruebas que es más permisivo que el de verdad
           no es más cómodo: es un sitio donde se esconden fallos. */
        if (!ruta.endsWith('/')) {
          const consulta = new URL(pet.url, 'http://x').search;
          res.writeHead(301, { Location: `${BASE}${ruta}/${consulta}` });
          res.end();
          return;
        }
        archivo = join(archivo, 'index.html');
      }
    } catch {
      /* Sin extensión y sin carpeta que valga: se prueba con index.html
         dentro, que es lo que hace `format: 'directory'`. */
      if (!extname(archivo)) archivo = join(archivo, 'index.html');
    }

    const cuerpo = await readFile(archivo);
    res.writeHead(200, {
      'Content-Type': TIPOS[extname(archivo)] || 'application/octet-stream',
      /* Sin caché: una prueba que reutiliza el servidor entre ejecuciones
         no puede quedarse con el `dist/` de la compilación anterior. */
      'Cache-Control': 'no-store',
    });
    res.end(cuerpo);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('No está.');
  }
}).listen(PUERTO, () => {
  console.log(`[pruebas] ${RAIZ} en http://localhost:${PUERTO}${BASE}/`);
});
