/* ═══════════════════════════════════════════════════════════════════
   purgar.js — LA RETENCIÓN, A MANO.

   El servidor la corre solo al arrancar y una vez al día. Esto es para
   correrla cuando se quiera y VER lo que se llevó, que es la única
   manera de comprobar que la promesa de retención es verdad y no una
   frase en un README.

       npm run purgar
   ═══════════════════════════════════════════════════════════════════ */

import { config } from '../src/config.js';
import { abrirBase, crearAcceso } from '../src/base/base.js';
import { purgar } from '../src/base/purga.js';

const db = abrirBase(config.base);
const acceso = crearAcceso(db);

const antes = {
  hilos: acceso.uno('SELECT COUNT(*) AS n FROM hilos').n,
  comentarios: acceso.uno('SELECT COUNT(*) AS n FROM comentarios').n,
  garzas: acceso.uno('SELECT COUNT(*) AS n FROM garzas').n,
  gestos: acceso.uno('SELECT COUNT(*) AS n FROM gestos').n,
};

const fuera = purgar(acceso);

/* VACUUM devuelve al sistema el espacio de lo borrado. Sin él, el
   fichero conserva su tamaño y los datos borrados siguen ahí dentro,
   en páginas libres, hasta que algo los pise. En una base con lo que
   hay en esta, eso no es un detalle de disco: es la diferencia entre
   borrado y «marcado como borrado». */
db.exec('VACUUM');

console.log('\n  Purga:');
for (const [k, v] of Object.entries(fuera)) console.log(`   · ${k}: ${v} fuera`);
console.log('\n  Queda:');
for (const [k, v] of Object.entries(antes)) {
  console.log(`   · ${k}: ${v} → ${acceso.uno(`SELECT COUNT(*) AS n FROM ${k}`).n}`);
}
console.log(`\n  Retención configurada: ${config.foro.diasRetencion} días.\n`);
db.close();
