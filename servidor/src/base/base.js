/* ═══════════════════════════════════════════════════════════════════
   base.js — LA BASE, Y POR QUÉ ES SQLITE.

   Galene no tiene tráfico de red social: tiene una portada, un árbol con
   diez garzas y una comunidad que se lee. Un fichero SQLite en el disco
   del propio servidor sirve eso de sobra, se copia con `cp`, se lee con
   cualquier cosa y no añade UN SOLO SERVICIO DE TERCEROS a un proyecto
   cuya promesa es que lo que se escribe aquí no viaja a ninguna parte.
   Poner Postgres gestionado o Firebase detrás de este sitio sería
   mandarle los mensajes de la comunidad a una empresa que nadie eligió.

   `node:sqlite` viene DENTRO de Node desde la 22.5: sin binario nativo,
   sin compilar nada en Windows, sin dependencia que se pudra.

   El acceso es SÍNCRONO, y está bien: una consulta a un fichero local
   son microsegundos, y el bucle de eventos se pierde menos tiempo ahí
   que en el `await` que costaría evitarlo. Lo único que no puede pasar
   es meter trabajo largo en una transacción, y no lo hay.
   ═══════════════════════════════════════════════════════════════════ */

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';

const AQUI = dirname(fileURLToPath(import.meta.url));

export function abrirBase(ruta = config.base) {
  if (ruta !== ':memory:') mkdirSync(dirname(ruta), { recursive: true });
  const db = new DatabaseSync(ruta);

  /* WAL: los lectores no esperan al que escribe. Con un solo proceso
     escribiendo importa poco, pero permite abrir la base con otra
     herramienta mientras el servidor corre — que es como se mira lo que
     hay dentro sin pararlo.
     `synchronous=NORMAL` con WAL es la combinación de siempre: se puede
     perder la última transacción en un corte de luz, no la base. */
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
  `);

  db.exec(readFileSync(resolve(AQUI, 'esquema.sql'), 'utf8'));

  /* El contador de raíces tiene que EXISTIR desde el primer arranque:
     todo lo demás lo lee, y un `undefined` en mitad de la curva de calma
     sale por pantalla como un `NaN` en el color del agua. */
  db.prepare('INSERT OR IGNORE INTO contadores(clave, valor) VALUES(?, 0)').run('raices');

  return db;
}

/* ── Ayudas ────────────────────────────────────────────────────────
   `sentencias` cachea los `prepare`: preparar una consulta cuesta más
   que ejecutarla, y aquí las mismas veinte se repiten todo el rato. */
export function crearAcceso(db) {
  const cache = new Map();
  const sql = (texto) => {
    let s = cache.get(texto);
    if (!s) { s = db.prepare(texto); cache.set(texto, s); }
    return s;
  };

  /* Transacción de verdad, con ROLLBACK si algo revienta. Todas las
     escrituras del foro tocan dos tablas —la fila y su contador
     desnormalizado— y si solo cuaja una, la lista miente para siempre. */
  const tx = (fn) => (...args) => {
    db.exec('BEGIN IMMEDIATE');
    try {
      const r = fn(...args);
      db.exec('COMMIT');
      return r;
    } catch (e) {
      try { db.exec('ROLLBACK'); } catch { /* ya estaba deshecha */ }
      throw e;
    }
  };

  return {
    db, sql, tx,
    uno: (texto, ...p) => sql(texto).get(...p),
    todos: (texto, ...p) => sql(texto).all(...p),
    correr: (texto, ...p) => sql(texto).run(...p),
    valor: (clave) => sql('SELECT valor FROM contadores WHERE clave = ?').get(clave)?.valor ?? 0,
    ponerValor: (clave, v) =>
      sql('INSERT INTO contadores(clave, valor) VALUES(?, ?) ' +
          'ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor').run(clave, v),
  };
}
