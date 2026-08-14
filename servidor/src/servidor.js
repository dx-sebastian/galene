/* ═══════════════════════════════════════════════════════════════════
   servidor.js — DONDE SE ATA TODO.

   Un proceso: HTTP y WebSocket en el mismo puerto, SQLite en un fichero
   al lado. Se levanta con `npm start`, se copia con `cp` y se apaga con
   Ctrl+C sin perder la calma acumulada.

   `crearServidor()` devuelve las piezas sin escuchar en ningún puerto,
   que es lo que permite que las pruebas levanten uno entero contra una
   base de usar y tirar. Un servidor que solo se puede arrancar de una
   forma es un servidor que no se puede probar.
   ═══════════════════════════════════════════════════════════════════ */

import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { config, SECRETO_EFIMERO } from './config.js';
import { abrirBase, crearAcceso } from './base/base.js';
import { purgar } from './base/purga.js';
import { crearEnrutador, ponerCors, responder, fallo } from './nucleo/http.js';
import { crearMar } from './dominio/mar.js';
import { crearGarzas } from './dominio/garzas.js';
import { crearForo } from './dominio/foro.js';
import { crearCanal } from './tiempo-real/canal.js';
import { montarApi } from './rutas/api.js';

export const VERSION = '0.1.0';

export function crearServidor({ base = config.base, registrar = true } = {}) {
  const db = abrirBase(base);
  const acceso = crearAcceso(db);

  const mar = crearMar(acceso);

  /* El canal necesita el servidor HTTP (se engancha al `upgrade`) y el
     dominio necesita al canal (para avisar). Se rompe el círculo con una
     función que lo busca cuando hace falta, no cuando se construye. */
  let canal = null;
  const avisar = (m) => canal?.difundir(m);

  const garzas = crearGarzas(acceso, avisar);
  const foro = crearForo(acceso, avisar);

  const r = crearEnrutador();
  montarApi(r, {
    mar, garzas, foro, version: VERSION,
    canal: { cuantos: () => canal?.cuantos() ?? 0 },
  });

  const servidor = http.createServer(async (req, res) => {
    const t0 = process.hrtime.bigint();
    let camino = '/';
    try {
      camino = new URL(req.url, 'http://galene').pathname;
      ponerCors(req, res);

      /* La comprobación previa del navegador. Va antes que nada: no
         tiene cuerpo, no tiene sesión y no debe gastar ninguna ficha. */
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
      }

      const encontrada = r.buscar(req.method, camino);
      if (!encontrada) return responder(res, 404, { error: { codigo: 404, mensaje: 'Aquí no hay nada.' } });
      if (encontrada.metodo === 405) {
        return responder(res, 405, { error: { codigo: 405, mensaje: 'Ese camino no atiende ese método.' } });
      }

      req.params = encontrada.params;
      await encontrada.mano(req, res);
    } catch (e) {
      fallo(res, e);
    } finally {
      if (registrar) {
        const ms = Number(process.hrtime.bigint() - t0) / 1e6;
        /* SIN IP, SIN AGENTE Y SIN CONSULTA. El registro dice qué se
           pidió y cuánto tardó. Quién lo pidió no es asunto de este
           fichero, y un registro con IPs es exactamente la base de datos
           que este proyecto prometió no tener — solo que en texto plano
           y rotando en el disco de otra empresa. */
        console.log(`${req.method} ${camino} ${res.statusCode} ${ms.toFixed(1)}ms`);
      }
    }
  });

  canal = crearCanal({ servidor, mar });

  /* Retención: al arrancar y una vez al día. */
  purgar(acceso);
  const relojPurga = setInterval(() => purgar(acceso), 24 * 60 * 60 * 1000);
  relojPurga.unref?.();

  let cerrando = false;
  async function cerrar() {
    if (cerrando) return;
    cerrando = true;
    clearInterval(relojPurga);
    canal.cerrar();
    mar.cerrar();                       // vuelca las raíces antes de nada
    await new Promise((listo) => servidor.close(listo));
    db.close();
  }

  const escuchar = (puerto = config.puerto, host = config.host) =>
    new Promise((listo) => servidor.listen(puerto, host, () => listo(servidor.address())));

  return { servidor, acceso, mar, garzas, foro, canal: () => canal, escuchar, cerrar };
}

/* ── Arranque directo ──────────────────────────────────────────────
   Solo cuando este fichero ES el programa. Importado desde una prueba,
   no levanta nada. */
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const app = crearServidor();
  const dir = await app.escuchar();

  console.log(`\n  Galene · servidor ${VERSION}`);
  console.log(`  escuchando en http://${dir.address}:${dir.port}  ·  ws://${dir.address}:${dir.port}/ws`);
  console.log(`  base: ${config.base}`);
  console.log(`  orígenes: ${config.origenes.join(', ')}`);
  if (SECRETO_EFIMERO) {
    console.warn('\n  ⚠ GALENE_SECRETO sin poner: se usó uno aleatorio de este arranque.');
    console.warn('    Al reiniciar caducan todas las sesiones y todas las llaves de borrado.');
  }
  if (!config.llaveModeracion) {
    console.warn('  ⚠ GALENE_LLAVE_MODERACION sin poner: la cola de moderación no existe.');
  }
  console.log('');

  for (const señal of ['SIGINT', 'SIGTERM']) {
    process.on(señal, async () => {
      console.log('\n  cerrando…');
      await app.cerrar();
      process.exit(0);
    });
  }
}
