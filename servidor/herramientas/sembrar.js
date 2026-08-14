/* ═══════════════════════════════════════════════════════════════════
   sembrar.js — PASAR LOS DATOS QUEMADOS A LA BASE, O QUITARLOS.

   `src/datos/comunidad.js` lleva escrito en su propia cabecera que TODO
   lo suyo es inventado. Ahora que hay servidor, esos diez hilos pueden
   estar en dos sitios y solo uno es correcto:

     · NO SEMBRAR (lo que hay por defecto) — la comunidad arranca vacía.
       Es lo más honesto y es lo que pide la regla 3 del proyecto: no
       fabricar personas ni testimonios. Una comunidad vacía dice la
       verdad: todavía no ha escrito nadie.

     · SEMBRAR — mete los diez hilos en la base MARCADOS con
       `ejemplo = 1`, que viaja en la API como `ejemplo: true`. Sirve
       para ver la maqueta con contenido y para probar el scroll. La
       marca existe para que el frontend pueda decirlo en pantalla y
       para que `--vaciar` los pueda quitar todos sin tocar lo demás.

   Y una vez sembrados, `src/datos/comunidad.js` deja de tener función:
   la lista sale del servidor. Lo único que hay que dejar en el sitio es
   `ETIQUETAS`… y ni eso, porque también viajan en `/api/estado`.

       npm run sembrar              — mete los ejemplos
       npm run sembrar -- --vaciar  — los quita (solo los ejemplos)
       npm run sembrar -- --todo    — vacía la comunidad ENTERA
   ═══════════════════════════════════════════════════════════════════ */

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { config, RAIZ } from '../src/config.js';
import { abrirBase, crearAcceso } from '../src/base/base.js';
import { hashSesion } from '../src/nucleo/identidad.js';

const args = process.argv.slice(2);
const vaciar = args.includes('--vaciar');
const todo = args.includes('--todo');

const db = abrirBase(config.base);
const acceso = crearAcceso(db);

if (todo) {
  const h = acceso.correr('DELETE FROM hilos').changes;
  acceso.correr('DELETE FROM comentarios');
  acceso.correr('DELETE FROM votos');
  acceso.correr('DELETE FROM reportes');
  console.log(`  Comunidad vaciada: ${h} hilos fuera.`);
  db.close();
  process.exit(0);
}

if (vaciar) {
  /* Se cuenta ANTES de borrar: `changes` no incluye lo que se lleva la
     cascada de las claves foráneas, así que borrar 19 comentarios de
     raíz que arrastran 12 respuestas informaba de 19 y no de 31. */
  const c = acceso.uno('SELECT COUNT(*) AS n FROM comentarios WHERE ejemplo = 1').n;
  const h = acceso.uno('SELECT COUNT(*) AS n FROM hilos WHERE ejemplo = 1').n;
  acceso.correr('DELETE FROM comentarios WHERE ejemplo = 1');
  acceso.correr('DELETE FROM hilos WHERE ejemplo = 1');
  console.log(`  Ejemplos fuera: ${h} hilos y ${c} comentarios.`);
  db.close();
  process.exit(0);
}

/* ── Traer los datos del sitio ─────────────────────────────────────
   Se importan del propio repo para no tener una segunda copia que un
   día diga otra cosa. Si el fichero ya no está —que es adonde va
   esto—, se dice y no se rompe nada. */
const ruta = resolve(RAIZ, '..', 'src', 'datos', 'comunidad.js');
let HILOS;
try {
  ({ HILOS } = await import(pathToFileURL(ruta).href));
} catch {
  console.error(`  No se encontró ${ruta}.`);
  console.error('  Si ya se quitaron los datos quemados del sitio, esto ya no hace falta.');
  process.exit(1);
}

/* Cada nombre de agua es una «sesión» estable, y así el mismo nombre
   lleva el mismo sello en todos sus mensajes y la insignia de «abrió el
   hilo» sale sola al comparar autoras. */
const sesionDe = (nombre) => hashSesion(
  Buffer.from('ejemplo·' + nombre).toString('hex').padEnd(32, '0').slice(0, 32));

const ahora = Date.now();
const cuando = (minutos) => ahora - (minutos || 0) * 60_000;
let nHilos = 0, nComentarios = 0;

const sembrar = acceso.tx(() => {
  for (const h of HILOS) {
    const creado = cuando(h.minutos);
    acceso.correr(
      `INSERT OR REPLACE INTO hilos(id, etiqueta, titulo, cuerpo, autora, anonima, pose, mira,
         sesion, borrado, creado, ultima, votos, respuestas, estado, ejemplo)
       VALUES(?,?,?,?,?,?,?,?,?,NULL,?,?,?,?, 'visible', 1)`,
      'ej-' + h.id, h.etiqueta, h.titulo, h.cuerpo.join('\n\n'),
      h.autora.nombre, h.autora.anonima ? 1 : 0, h.autora.pose, h.autora.mirar || 1,
      sesionDe(h.autora.nombre), creado, creado, h.votos || 0,
      h.comentarios.reduce((n, c) => n + 1 + (c.respuestas?.length || 0), 0));
    nHilos++;

    h.comentarios.forEach((c, i) => {
      const idc = `ej-${h.id}-c${i}`;
      acceso.correr(
        `INSERT OR REPLACE INTO comentarios(id, hilo, padre, texto, autora, anonima, pose, mira,
           sesion, borrado, creado, votos, estado, ejemplo)
         VALUES(?,?,NULL,?,?,?,?,?,?,NULL,?,?, 'visible', 1)`,
        idc, 'ej-' + h.id, c.texto, c.autora.nombre, c.autora.anonima ? 1 : 0,
        c.autora.pose, c.autora.mirar || 1, sesionDe(c.autora.nombre),
        creado + (i + 1) * 60_000, c.votos || 0);
      nComentarios++;

      (c.respuestas || []).forEach((r, j) => {
        acceso.correr(
          `INSERT OR REPLACE INTO comentarios(id, hilo, padre, texto, autora, anonima, pose, mira,
             sesion, borrado, creado, votos, estado, ejemplo)
           VALUES(?,?,?,?,?,?,?,?,?,NULL,?,?, 'visible', 1)`,
          `${idc}-r${j}`, 'ej-' + h.id, idc, r.texto, r.autora.nombre, r.autora.anonima ? 1 : 0,
          r.autora.pose, r.autora.mirar || 1, sesionDe(r.autora.nombre),
          creado + (i + 1) * 60_000 + (j + 1) * 20_000, r.votos || 0);
        nComentarios++;
      });
    });
  }
});

sembrar();
db.close();

console.log(`\n  Sembrados ${nHilos} hilos y ${nComentarios} comentarios, marcados como ejemplo.`);
console.log('  ⚠ Son inventados. Viajan con `ejemplo: true` para que se pueda decir en pantalla.');
console.log('  Para quitarlos:  npm run sembrar -- --vaciar\n');
