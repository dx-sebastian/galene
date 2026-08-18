/* ═══════════════════════════════════════════════════════════════════
   sembrar.js — PASAR LOS DATOS QUEMADOS A LA BASE, O QUITARLOS.

   `src/datos/comunidad.js` lleva escrito en su propia cabecera que TODO
   lo suyo es inventado. El foro vive en Postgres (Supabase) desde el 17
   ago 2026 — este script sigue haciendo lo mismo que hacía contra el
   SQLite local, solo que contra la base de verdad.

     · NO SEMBRAR (lo que hay por defecto) — la comunidad arranca vacía.
       Es lo más honesto y es lo que pide la regla 3 del proyecto: no
       fabricar personas ni testimonios. Una comunidad vacía dice la
       verdad: todavía no ha escrito nadie.

     · SEMBRAR — mete los diez hilos en la base MARCADOS con
       `ejemplo = 1`, que viaja como `ejemplo: true` en las vistas
       públicas. Sirve para ver la maqueta con contenido y para probar
       el scroll. La marca existe para que el frontend pueda decirlo en
       pantalla y para que `--vaciar` los pueda quitar sin tocar lo
       demás.

   ── LOS TRIGGERS SE APAGAN MIENTRAS SIEMBRA ───────────────────────
   `hilos_antes_insertar`/`comentarios_antes_insertar` calculan el sello
   y las señales de moderación a partir de la sesión y el texto — esto
   siembra DATOS YA DECIDIDOS (pose, `estado: 'visible'`, la cuenta de
   respuestas), igual que hacía la versión de SQLite, y dejar los
   triggers puestos: (a) haría pasar los diez hilos por el límite de
   envíos por sesión sin necesidad, y (b) contaría las respuestas dos
   veces —la cuenta ya viene calculada en el INSERT de `hilos`, y el
   trigger de después las volvería a sumar una por una—. Se apagan por
   tabla (`ALTER TABLE ... DISABLE TRIGGER`, permiso de dueño, no de
   superusuario) y se reencienden al final pase lo que pase.

       npm run sembrar              — mete los ejemplos
       npm run sembrar -- --vaciar  — los quita (solo los ejemplos)
       npm run sembrar -- --todo    — vacía la comunidad ENTERA
   ═══════════════════════════════════════════════════════════════════ */

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { RAIZ } from '../src/config.js';
import { abrirBaseForo, crearAccesoForo } from '../src/base/basePostgres.js';

const args = process.argv.slice(2);
const vaciar = args.includes('--vaciar');
const todo = args.includes('--todo');

const pool = await abrirBaseForo();
const acceso = crearAccesoForo(pool);

if (todo) {
  const h = (await acceso.correr('DELETE FROM hilos')).changes;
  await acceso.correr('DELETE FROM comentarios');
  await acceso.correr('DELETE FROM votos');
  await acceso.correr('DELETE FROM reportes');
  console.log(`  Comunidad vaciada: ${h} hilos fuera.`);
  await pool.end();
  process.exit(0);
}

if (vaciar) {
  const c = (await acceso.uno("SELECT COUNT(*) AS n FROM comentarios WHERE ejemplo = 1")).n;
  const h = (await acceso.uno("SELECT COUNT(*) AS n FROM hilos WHERE ejemplo = 1")).n;
  await acceso.correr('DELETE FROM comentarios WHERE ejemplo = 1');
  await acceso.correr('DELETE FROM hilos WHERE ejemplo = 1');
  console.log(`  Ejemplos fuera: ${h} hilos y ${c} comentarios.`);
  await pool.end();
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
  await pool.end();
  process.exit(1);
}

/* Un UUID por nombre de agua, no por fila: así el mismo nombre lleva el
   mismo `sesion` en todos sus mensajes dentro de esta siembra, y la
   insignia de «abrió el hilo» sale sola al comparar autoras. No hace
   falta que sea estable ENTRE ejecuciones —la clave de reemplazo es el
   `id`, no la sesión—, así que un UUID nuevo cada vez es correcto. */
const sesiones = new Map();
const sesionDe = (nombre) => {
  if (!sesiones.has(nombre)) sesiones.set(nombre, randomUUID());
  return sesiones.get(nombre);
};

const ahora = Date.now();
const cuando = (minutos) => ahora - (minutos || 0) * 60_000;
let nHilos = 0, nComentarios = 0;

await acceso.correr('ALTER TABLE hilos DISABLE TRIGGER hilos_antes_insertar');
await acceso.correr('ALTER TABLE comentarios DISABLE TRIGGER comentarios_antes_insertar');
await acceso.correr('ALTER TABLE comentarios DISABLE TRIGGER comentarios_ajustar_respuestas');

try {
  const sembrar = acceso.tx(async (tx) => {
    for (const h of HILOS) {
      const creado = cuando(h.minutos);
      await tx.correr(
        `INSERT INTO hilos(id, etiqueta, titulo, cuerpo, autora, anonima, pose, mira,
           sesion, borrado, creado, ultima, votos, respuestas, estado, ejemplo)
         VALUES(?,?,?,?,?,?,?,?,?,NULL,?,?,?,?, 'visible', 1)
         ON CONFLICT(id) DO UPDATE SET
           etiqueta=EXCLUDED.etiqueta, titulo=EXCLUDED.titulo, cuerpo=EXCLUDED.cuerpo,
           autora=EXCLUDED.autora, anonima=EXCLUDED.anonima, pose=EXCLUDED.pose, mira=EXCLUDED.mira,
           sesion=EXCLUDED.sesion, creado=EXCLUDED.creado, ultima=EXCLUDED.ultima,
           votos=EXCLUDED.votos, respuestas=EXCLUDED.respuestas`,
        'ej-' + h.id, h.etiqueta, h.titulo, h.cuerpo.join('\n\n'),
        h.autora.nombre, h.autora.anonima ? 1 : 0, h.autora.pose, h.autora.mirar || 1,
        sesionDe(h.autora.nombre), creado, creado, h.votos || 0,
        h.comentarios.reduce((n, c) => n + 1 + (c.respuestas?.length || 0), 0));
      nHilos++;

      for (const [i, c] of h.comentarios.entries()) {
        const idc = `ej-${h.id}-c${i}`;
        await tx.correr(
          `INSERT INTO comentarios(id, hilo, padre, texto, autora, anonima, pose, mira,
             sesion, borrado, creado, votos, estado, ejemplo)
           VALUES(?,?,NULL,?,?,?,?,?,?,NULL,?,?, 'visible', 1)
           ON CONFLICT(id) DO UPDATE SET
             texto=EXCLUDED.texto, autora=EXCLUDED.autora, anonima=EXCLUDED.anonima,
             pose=EXCLUDED.pose, mira=EXCLUDED.mira, sesion=EXCLUDED.sesion,
             creado=EXCLUDED.creado, votos=EXCLUDED.votos`,
          idc, 'ej-' + h.id, c.texto, c.autora.nombre, c.autora.anonima ? 1 : 0,
          c.autora.pose, c.autora.mirar || 1, sesionDe(c.autora.nombre),
          creado + (i + 1) * 60_000, c.votos || 0);
        nComentarios++;

        for (const [j, r] of (c.respuestas || []).entries()) {
          await tx.correr(
            `INSERT INTO comentarios(id, hilo, padre, texto, autora, anonima, pose, mira,
               sesion, borrado, creado, votos, estado, ejemplo)
             VALUES(?,?,?,?,?,?,?,?,?,NULL,?,?, 'visible', 1)
             ON CONFLICT(id) DO UPDATE SET
               texto=EXCLUDED.texto, autora=EXCLUDED.autora, anonima=EXCLUDED.anonima,
               pose=EXCLUDED.pose, mira=EXCLUDED.mira, sesion=EXCLUDED.sesion,
               creado=EXCLUDED.creado, votos=EXCLUDED.votos`,
            `${idc}-r${j}`, 'ej-' + h.id, idc, r.texto, r.autora.nombre, r.autora.anonima ? 1 : 0,
            r.autora.pose, r.autora.mirar || 1, sesionDe(r.autora.nombre),
            creado + (i + 1) * 60_000 + (j + 1) * 20_000, r.votos || 0);
          nComentarios++;
        }
      }
    }
  });

  await sembrar();
} finally {
  /* Se reencienden pase lo que pase, incluso si la siembra falló a
     mitad: dejar los triggers apagados sería dejar el foro de verdad
     sin límite de envíos ni señales de moderación. */
  await acceso.correr('ALTER TABLE hilos ENABLE TRIGGER hilos_antes_insertar');
  await acceso.correr('ALTER TABLE comentarios ENABLE TRIGGER comentarios_antes_insertar');
  await acceso.correr('ALTER TABLE comentarios ENABLE TRIGGER comentarios_ajustar_respuestas');
}

console.log(`\n  Sembrados ${nHilos} hilos y ${nComentarios} comentarios, marcados como ejemplo.`);
console.log('  ⚠ Son inventados. Viajan con `ejemplo: true` para que se pueda decir en pantalla.');
console.log('  Para quitarlos:  npm run sembrar -- --vaciar\n');
await pool.end();
