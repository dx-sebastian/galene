/* ═══════════════════════════════════════════════════════════════════
   http.js — EL ENRUTADOR, Y LAS CABECERAS QUE NO SON DECORACIÓN.

   Sin framework. `node:http` con un enrutador de treinta líneas hace
   exactamente lo que hacen falta aquí —doce rutas— y no arrastra
   doscientos paquetes que hay que auditar en un proyecto cuya promesa
   es que lo que se escribe no viaja a ninguna parte.

   ── `Cache-Control: no-store` EN TODO ─────────────────────────────
   No es una micro-optimización al revés: es la regla 6 del proyecto.
   El botón de salir usa `location.replace` «para no dejar rastro», y
   una respuesta cacheada deja exactamente eso — los hilos de la
   comunidad, en el disco del aparato, esperando a que alguien abra el
   navegador. Todo lo que sale de esta API es `no-store`.
   ═══════════════════════════════════════════════════════════════════ */

import { config } from '../config.js';
import { Alto } from './validar.js';

const CUERPO_MAX = 64 * 1024;

export function crearEnrutador() {
  const rutas = [];

  /* Las rutas se declaran con `:parametro` y se compilan a expresión
     regular UNA VEZ, al declararlas, no en cada petición. */
  const anadir = (metodo, patron, mano) => {
    const nombres = [];
    const re = new RegExp('^' + patron.replace(/\/:([a-zA-Z]+)/g, (_, n) => {
      nombres.push(n);
      return '/([^/]+)';
    }) + '/?$');
    rutas.push({ metodo, re, nombres, mano });
  };

  return {
    get:    (p, m) => anadir('GET', p, m),
    post:   (p, m) => anadir('POST', p, m),
    patch:  (p, m) => anadir('PATCH', p, m),
    borrar: (p, m) => anadir('DELETE', p, m),
    buscar(metodo, camino) {
      let existeCamino = false;
      for (const r of rutas) {
        const m = r.re.exec(camino);
        if (!m) continue;
        existeCamino = true;
        if (r.metodo !== metodo) continue;
        const params = {};
        r.nombres.forEach((n, i) => { params[n] = decodeURIComponent(m[i + 1]); });
        return { mano: r.mano, params };
      }
      /* Distinguir 404 de 405 no es pedantería: dice si la ruta está mal
         escrita o si el método es el que no toca. */
      return existeCamino ? { metodo: 405 } : null;
    },
  };
}

/* ── CORS ──────────────────────────────────────────────────────────
   Lista blanca y `Vary: Origin`, sin el cual una caché intermedia
   puede servirle a un origen la respuesta que se le dio a otro.
   Sin `credentials`: esta API no usa cookies, así que no hay sesión de
   navegador que un tercero pueda montar. El token va en una cabecera
   que el propio JavaScript del sitio pone, y eso lo hace inmune al
   CSRF clásico por construcción. */
export function ponerCors(req, res) {
  const origen = req.headers.origin;
  if (origen && config.origenes.includes(origen)) {
    res.setHeader('Access-Control-Allow-Origin', origen);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Galene-Sesion, X-Galene-Llave, X-Galene-Borrado');
  res.setHeader('Access-Control-Expose-Headers', 'X-Galene-Sesion, Retry-After');
  res.setHeader('Access-Control-Max-Age', '600');
}

export function responder(res, codigo, cuerpo, cabeceras = {}) {
  const texto = JSON.stringify(cuerpo ?? null);
  res.writeHead(codigo, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(texto),
    /* Nada de esto se guarda, ni en el disco ni en un proxy. */
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    /* La API no devuelve HTML nunca. Si alguien consigue que devuelva
       algo que un navegador quiera interpretar, que no lo interprete. */
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    ...cabeceras,
  });
  res.end(texto);
}

export function fallo(res, e) {
  if (e instanceof Alto) {
    const cab = e.codigo === 429 && e.espera ? { 'Retry-After': String(e.espera) } : {};
    return responder(res, e.codigo, { error: { codigo: e.codigo, mensaje: e.message, campo: e.campo } }, cab);
  }
  /* Un fallo no previsto NO se cuenta hacia fuera: el mensaje de una
     excepción de SQLite puede llevar dentro el texto que la provocó. Va
     al registro del servidor y al cliente le llega que algo se rompió. */
  console.error('[galene] fallo no previsto:', e);
  return responder(res, 500, { error: { codigo: 500, mensaje: 'Algo se rompió por aquí dentro.' } });
}

/* Lee el cuerpo con TECHO. Sin él, una petición que no termina nunca es
   memoria que crece hasta que el proceso muere; y el techo se comprueba
   mientras llega, no al final, porque comprobarlo al final significa
   haberlo aceptado entero. */
export function leerCuerpo(req) {
  return new Promise((listo, mal) => {
    const declarado = Number(req.headers['content-length'] || 0);
    if (declarado > CUERPO_MAX) return mal(new Alto(413, 'El mensaje es demasiado largo.'));

    const trozos = [];
    let total = 0;
    req.on('data', (t) => {
      total += t.length;
      if (total > CUERPO_MAX) {
        req.destroy();
        return mal(new Alto(413, 'El mensaje es demasiado largo.'));
      }
      trozos.push(t);
    });
    req.on('error', mal);
    req.on('end', () => {
      const crudo = Buffer.concat(trozos).toString('utf8');
      if (!crudo.trim()) return listo({});
      const tipo = String(req.headers['content-type'] || '');
      if (!tipo.includes('application/json')) {
        return mal(new Alto(415, 'Esta API solo entiende application/json.'));
      }
      try { listo(JSON.parse(crudo)); }
      catch { mal(new Alto(400, 'El JSON no se pudo leer.')); }
    });
  });
}
