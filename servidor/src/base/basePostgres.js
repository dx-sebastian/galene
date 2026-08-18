/* ═══════════════════════════════════════════════════════════════════
   basePostgres.js — CONEXIÓN DE MANTENIMIENTO AL FORO, EN SUPABASE.

   El foro vive en Postgres (Supabase), pero NO se sirve desde aquí: el
   navegador le habla directo a Supabase (RLS + Auth anónima decide qué
   puede hacer cada quien — ver esquema-foro.sql). Este fichero es la
   conexión de un cliente CON TODOS LOS PERMISOS, así que solo lo usan
   las herramientas de mantenimiento que corren a mano en esta máquina
   —`herramientas/sembrar.js`, `herramientas/purgar.js`— nunca un
   proceso que atienda peticiones de fuera. `servidor.js` no lo importa.

   El acceso es ASÍNCRONO a propósito, al revés que en base.js: una
   consulta ya no es un fichero local, es una vuelta por la red hasta
   Supabase, y fingir que eso es instantáneo con una API síncrona
   bloquearía el proceso entero mientras dura el viaje.
   ═══════════════════════════════════════════════════════════════════ */

import pg from 'pg';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';

const AQUI = dirname(fileURLToPath(import.meta.url));

/* BIGINT (OID 20) vuelve de `pg` como STRING por defecto, para no
   perder precisión más allá de 2^53. Aquí un bigint es siempre un
   epoch en milisegundos, que cabe de sobra en un number de JS hasta el
   año 287396 — así que se prefiere el número. Sin esto, un string se
   cuela en el cursor de paginación (aCursor → JSON.stringify) y una
   comparación que esperaba un number falla en silencio, no con error. */
pg.types.setTypeParser(20, (v) => parseInt(v, 10));

export async function abrirBaseForo(cadena = config.pgUrl) {
  if (!cadena) {
    throw new Error(
      'Falta GALENE_PG_URL. El foro vive en Postgres (Supabase) y necesita ' +
      'la cadena de conexión: Project Settings → Database → Connection ' +
      'string en supabase.com, copiada a servidor/.env.');
  }
  const pool = new pg.Pool({
    connectionString: cadena,
    /* Supabase exige TLS para conexiones externas. `rejectUnauthorized:
       false` sigue cifrando la conexión; solo no valida la cadena de
       certificados — es lo que recomienda la propia Supabase para
       conectar con `pg` sin empaquetar su CA. */
    ssl: { rejectUnauthorized: false },
  });

  /* Igual que abrirBase(): el esquema se crea solo, con IF NOT EXISTS,
     así que no hace falta pegar SQL a mano en el panel de Supabase. */
  await pool.query(readFileSync(resolve(AQUI, 'esquema-foro.sql'), 'utf8'));

  return pool;
}

/* `?` posicionales, como en el resto del proyecto — Postgres los quiere
   como `$1, $2, …`. Se traduce aquí, una vez, para no reescribir las
   ~30 consultas de dominio/foro.js con dos sintaxis a mano. */
function aDolares(sqlConInterrogantes) {
  let i = 0;
  return sqlConInterrogantes.replace(/\?/g, () => `$${++i}`);
}

/* `quien` es cualquier cosa con `.query(texto, params)`: el pool para
   consultas sueltas, o un cliente reservado para una transacción. */
function envolver(quien) {
  return {
    uno: async (texto, ...params) => (await quien.query(aDolares(texto), params)).rows[0],
    todos: async (texto, ...params) => (await quien.query(aDolares(texto), params)).rows,
    /* `.changes` en vez de `.rowCount`: así dominio/foro.js y las
       herramientas de sembrar/purgar no necesitan saber si están
       hablando con SQLite o con Postgres. */
    correr: async (texto, ...params) => {
      const r = await quien.query(aDolares(texto), params);
      return { changes: r.rowCount, rows: r.rows };
    },
  };
}

export function crearAccesoForo(pool) {
  return {
    pool,
    ...envolver(pool),

    /* Transacción de verdad: UN cliente reservado para todo `fn`, no el
       pool suelto. Si cada consulta tomara una conexión cualquiera del
       pool, el BEGIN quedaría en una conexión y el INSERT en otra — el
       INSERT se confirmaría solo, en el acto, y el ROLLBACK de un fallo
       a mitad no protegería nada. `fn` recibe el acceso ya atado a ese
       cliente como primer argumento. */
    tx(fn) {
      return async (...args) => {
        const client = await pool.connect();
        const txAcceso = envolver(client);
        try {
          await client.query('BEGIN');
          const r = await fn(txAcceso, ...args);
          await client.query('COMMIT');
          return r;
        } catch (e) {
          try { await client.query('ROLLBACK'); } catch { /* ya estaba deshecha */ }
          throw e;
        } finally {
          client.release();
        }
      };
    },
  };
}
