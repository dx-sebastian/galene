/* Espejo de producción: sirve en localhost:5179 exactamente los bytes
   que responde dx-sebastian.github.io, pedidos con curl (que sí sale
   por el proxy del entorno). Con esto el navegador local renderiza EL
   SITIO DESPLEGADO, no una copia compilada aquí. */
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';

const ORIGEN = 'https://dx-sebastian.github.io';
const cache = new Map();

createServer((req, res) => {
  const ruta = req.url.split('#')[0];
  if (cache.has(ruta)) {
    const { tipo, cuerpo } = cache.get(ruta);
    res.writeHead(200, { 'content-type': tipo });
    return res.end(cuerpo);
  }
  execFile('curl', ['-sS', '--compressed', '-w', '\n%{content_type}|%{http_code}',
    ORIGEN + ruta], { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 },
    (err, stdout) => {
      if (err) { res.writeHead(502); return res.end('espejo: ' + err.message); }
      const nl = stdout.lastIndexOf(0x0A);
      const meta = stdout.subarray(nl + 1).toString();
      const [tipo, codigo] = meta.split('|');
      const cuerpo = stdout.subarray(0, nl);
      if (codigo !== '200') { res.writeHead(+codigo || 502); return res.end(cuerpo); }
      cache.set(ruta, { tipo, cuerpo });
      res.writeHead(200, { 'content-type': tipo });
      res.end(cuerpo);
    });
}).listen(5179, () => console.log('espejo de prod en :5179'));
