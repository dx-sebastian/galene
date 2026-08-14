/* Incrusta las fuentes y las láminas del propio repositorio en la
   plantilla. Nada se copia a mano: si una lámina cambia, la página
   cambia con ella. Uso: node presentacion/construir.mjs [salida.html] */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const b64 = (r) => readFileSync(resolve(raiz, r)).toString('base64');

const PIEZAS = {
  __FUENTE_REG__:  'public/fuentes/Atkinson-Hyperlegible-Regular.woff2',
  __FUENTE_BOLD__: 'public/fuentes/Atkinson-Hyperlegible-Bold.woff2',
  __PAPEL__:       'public/arte/768/papel.webp',
  __MANGLAR__:     'public/arte/768/manglar-cerca.webp',
  __MAR__:         'public/arte/768/mar-medio.webp',
  __GARZA__:       'public/arte/768/posada/reposo.webp',
  __FILETE__:      'public/arte/filete-4.webp',
};

let html = readFileSync(resolve(raiz, 'presentacion/plantilla.html'), 'utf8');
for (const [marca, ruta] of Object.entries(PIEZAS)) {
  const dato = b64(ruta);
  if (!html.includes(marca)) throw new Error(`sobra la pieza ${marca}`);
  html = html.replaceAll(marca, dato);
}
const resto = html.match(/__[A-Z_]+__/g);
if (resto) throw new Error(`marcador sin sustituir: ${resto.join(', ')}`);

const salida = process.argv[2] || resolve(raiz, 'presentacion/galene.html');
writeFileSync(salida, html);
console.log(`${salida} — ${(html.length / 1024 / 1024).toFixed(2)} MB`);
