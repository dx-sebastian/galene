/* ═══════════════════════════════════════════════════════════════════
   purgar.js — LA RETENCIÓN, A MANO.

   El foro vive en Postgres y el resto en el SQLite local, así que esto
   corre la purga de los dos sitios. Nadie más la corre sola: sin
   `servidor/` sirviendo el foro, no hay proceso que la dispare al
   arrancar ni una vez al día — este comando es, por ahora, la única
   forma de que la retención sea de verdad y no una frase en un README.

       npm run purgar
   ═══════════════════════════════════════════════════════════════════ */

import { config } from '../src/config.js';
import { abrirBase, crearAcceso } from '../src/base/base.js';
import { abrirBaseForo, crearAccesoForo } from '../src/base/basePostgres.js';
import { purgarLocal, purgarForo } from '../src/base/purga.js';

const db = abrirBase(config.base);
const acceso = crearAcceso(db);
const poolForo = await abrirBaseForo();
const accesoForo = crearAccesoForo(poolForo);

const antes = {
  garzas: acceso.uno('SELECT COUNT(*) AS n FROM garzas').n,
  gestos: acceso.uno('SELECT COUNT(*) AS n FROM gestos').n,
  hilos: (await accesoForo.uno('SELECT COUNT(*) AS n FROM hilos')).n,
  comentarios: (await accesoForo.uno('SELECT COUNT(*) AS n FROM comentarios')).n,
};

const fueraLocal = purgarLocal(acceso);
const fueraForo = await purgarForo(accesoForo, config.foro.diasRetencion);

/* VACUUM solo aplica al SQLite local: Postgres recupera el espacio de
   lo borrado él solo, en segundo plano (autovacuum). */
db.exec('VACUUM');

console.log('\n  Purga · local (SQLite):');
for (const [k, v] of Object.entries(fueraLocal)) console.log(`   · ${k}: ${v} fuera`);
console.log('\n  Purga · foro (Supabase):');
for (const [k, v] of Object.entries(fueraForo)) console.log(`   · ${k}: ${v} fuera`);

console.log('\n  Queda:');
console.log(`   · garzas: ${antes.garzas} → ${acceso.uno('SELECT COUNT(*) AS n FROM garzas').n}`);
console.log(`   · gestos: ${antes.gestos} → ${acceso.uno('SELECT COUNT(*) AS n FROM gestos').n}`);
console.log(`   · hilos: ${antes.hilos} → ${(await accesoForo.uno('SELECT COUNT(*) AS n FROM hilos')).n}`);
console.log(`   · comentarios: ${antes.comentarios} → ${(await accesoForo.uno('SELECT COUNT(*) AS n FROM comentarios')).n}`);

console.log(`\n  Retención configurada: ${config.foro.diasRetencion} días.\n`);
db.close();
await poolForo.end();
