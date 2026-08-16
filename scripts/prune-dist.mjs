import { readFile, readdir, rm, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const distUrl = new URL('../dist/', import.meta.url);
const arteUrl = new URL('./arte/', distUrl);
const dist = fileURLToPath(distUrl);
const arte = fileURLToPath(arteUrl);

const texturasHero = [
  'mar-lejano.webp', 'mar-medio.webp', 'mar-medio-calmo.webp',
  'mar-cercano.webp', 'mar-cercano-calmo.webp', 'manglar-v2.webp',
  'manglar-cerca.webp', 'corales.webp', 'luces.webp', 'astro.webp',
  'reguero.webp', 'papel.webp', 'grafito.webp', 'cielo-atlas-v3.webp',
  'estrellas.webp',
];
const aves = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11]
  .map((n) => `aves/ave${String(n).padStart(2, '0')}.webp`);
const aterriza = Array.from({ length: 8 }, (_, i) =>
  `aterriza/a${String(i + 1).padStart(2, '0')}.webp`);
/* `agarre` es la séptima: la pose con los dedos curvados sobre la rama,
   solo para la visitante. Va en esta lista y no la caza el rastreo
   automático porque su ruta se arma en JavaScript por trozos —`ARTE +
   'posada/agarre.webp'`— y en el compilado no queda ninguna cadena que
   contenga «arte/». Sin esta línea el podador se la lleva y el ave
   aparece sin lámina de reposo: comprobado. */
const posada = ['reposo', 'alerta', 'encogida', 'una-pata', 'mira-abajo',
                'alas', 'agarre']
  .map((nombre) => `posada/${nombre}.webp`);
const dinamicas = [...texturasHero, ...aves, ...aterriza, ...posada];
const conservar = new Set([
  ...dinamicas,
  ...dinamicas.map((ruta) => `1024/${ruta}`),
  ...dinamicas.map((ruta) => `768/${ruta}`),
  'aguadas-seccion2.webp', 'filete-2-v.webp', 'filete-4-v.webp',
  'papel-barbas.webp', '1024/papel-barbas.webp', '1024/filete-5.webp',
  '1024/manglar-enterrado-a.webp', 'mobile/manglar-v2.webp',
]);

/* Las secciones pulidas cambian con frecuencia. En vez de mantener una
   segunda lista manual que puede borrar arte válido, se registran todas
   las láminas realmente enlazadas por el HTML, CSS y JS compilados. La
   lista explícita de arriba queda solo para las rutas dinámicas del mar. */
async function registrarReferencias(dir) {
  for (const entrada of await readdir(dir, { withFileTypes: true })) {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) {
      if (ruta !== arte) await registrarReferencias(ruta);
      continue;
    }
    if (!/\.(?:html|css|m?js)$/i.test(entrada.name)) continue;
    const fuente = await readFile(ruta, 'utf8');
    for (const coincidencia of fuente.matchAll(/(?:\/galene\/|\/)?arte\/([^"'`)\\\s?#]+\.webp)/g))
      conservar.add(decodeURIComponent(coincidencia[1]));
  }
}
await registrarReferencias(dist);

/* Material de trabajo que debe vivir junto al proyecto, no en la web. */
for (const ruta of ['fuente', 'prompts-cielo']) {
  await rm(join(arte, ruta), { recursive: true, force: true });
}
for (const ruta of ['pruebas', 'tipografia']) {
  await rm(join(dist, ruta), { recursive: true, force: true });
}

/* El sitio nunca enlaza estos formatos ni los cuadernos de producción. */
async function podar(dir) {
  for (const entrada of await readdir(dir, { withFileTypes: true })) {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) await podar(ruta);
    else {
      const rel = relative(arte, ruta).split(sep).join('/');
      if (/\.(?:png|jpe?g|md|txt|py|pyc|ttf)$/i.test(entrada.name)
          || (/\.webp$/i.test(entrada.name) && !conservar.has(rel)))
        await rm(ruta, { force: true });
    }
  }
}
await podar(arte);

async function resumen(dir) {
  let archivos = 0, bytes = 0;
  async function andar(actual) {
    for (const entrada of await readdir(actual, { withFileTypes: true })) {
      const ruta = join(actual, entrada.name);
      if (entrada.isDirectory()) await andar(ruta);
      else { archivos++; bytes += (await stat(ruta)).size; }
    }
  }
  await andar(dir);
  return { archivos, bytes };
}
const total = await resumen(dist);
console.log(`[dist] ${total.archivos} archivos · ${(total.bytes / 1024 / 1024).toFixed(2)} MB`);
