/* Espejo de producción: sirve en localhost:5179 exactamente los bytes
   que responde dx-sebastian.github.io, pedidos con curl (que sí sale
   por el proxy del entorno). Con esto el navegador local renderiza EL
   SITIO DESPLEGADO, no una copia compilada aquí.

   ── LAS REDIRECCIONES SE PASAN, NO SE SIGUEN ───────────────────────
   Y esa es la parte delicada. GitHub Pages responde 301 a cualquier
   dirección de página sin barra final —`/galene/comunidad` manda a
   `/galene/comunidad/`—, y un espejo que siguiera el salto por dentro
   con `curl -L` devolvería un 200 limpio: el navegador vería la página
   y nadie se enteraría de que hubo un rodeo. Eso es exactamente lo que
   este archivo no puede hacer, porque hay pruebas que comprueban que
   el sitemap NO redirige, y saldrían verdes por ceguera.

   Así que el 301 se pasa tal cual, con su `Location` reescrita al
   espejo. El navegador salta —igual que en producción— y quien mire el
   código de respuesta ve el 301 que hubo de verdad. */
import { createServer } from 'node:http';
import { gzipSync } from 'node:zlib';
import { execFile } from 'node:child_process';

const ORIGEN = 'https://dx-sebastian.github.io';
const cache = new Map();

createServer((req, res) => {
  const ruta = req.url.split('#')[0];
  if (cache.has(ruta)) {
    const { codigo, cabeceras, cuerpo } = cache.get(ruta);
    res.writeHead(codigo, cabeceras);
    return res.end(cuerpo);
  }
  execFile('curl', ['-sS', '--compressed',
    '-w', '\n%{content_type}|%{http_code}|%{redirect_url}',
    ORIGEN + ruta], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 },
    (err, stdout) => {
      if (err) { res.writeHead(502); return res.end('espejo: ' + err.message); }
      const nl = stdout.lastIndexOf(0x0A);
      const meta = stdout.subarray(nl + 1).toString();
      const [tipo, texto, saltoA] = meta.split('|');
      const codigo = +texto || 502;
      const cuerpo = stdout.subarray(0, nl);

      /* El salto, con su destino traído al espejo: si se dejara
         apuntando a dx-sebastian.github.io, el navegador se iría a
         internet y la medición dejaría de pasar por aquí. */
      if (codigo >= 300 && codigo < 400 && saltoA) {
        const cabeceras = { location: saltoA.replace(ORIGEN, '') };
        cache.set(ruta, { codigo, cabeceras, cuerpo });
        res.writeHead(codigo, cabeceras);
        return res.end(cuerpo);
      }

      if (codigo !== 200) { res.writeHead(codigo); return res.end(cuerpo); }

      /* ── SE VUELVE A COMPRIMIR LO QUE VINO COMPRIMIDO ──────────────
         `curl --compressed` descomprime al recibir, así que aquí llega
         el fichero en crudo. Si se sirviera así, `peso.spec.js` —que
         mide `transferSize`, o sea lo que viaja por el cable— contaría
         el JavaScript inflado, y el espejo diría que la portada pesa
         un 12 % más de lo que de verdad le llega a nadie.

         MEDIDO: el paquete de main.js son 200 203 B en disco y GitHub
         Pages lo entrega en 71 367 B con `content-encoding: gzip`.
         Volver a comprimir aquí no reproduce byte a byte lo de allá
         —el nivel de gzip puede diferir— pero sí reproduce el orden de
         magnitud, que es lo que un presupuesto mide. Y deja el espejo
         y `pruebas/servidor.mjs` contando lo mismo, que es la
         condición para que sus dos baterías se puedan comparar. */
      const comprimible = /^(text\/|application\/(javascript|json|xml)|image\/svg)/.test(tipo || '');
      const acepta = /\bgzip\b/.test(String(req.headers['accept-encoding'] || ''));
      const salida = comprimible && acepta ? gzipSync(cuerpo) : cuerpo;
      const cabeceras = { 'content-type': tipo };
      if (salida !== cuerpo) { cabeceras['content-encoding'] = 'gzip'; cabeceras.vary = 'Accept-Encoding'; }
      cache.set(ruta, { codigo, cabeceras, cuerpo: salida });
      res.writeHead(codigo, cabeceras);
      res.end(salida);
    });
}).listen(5179, () => console.log('espejo de prod en :5179'));
