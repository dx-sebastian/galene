/* ═══════════════════════════════════════════════════════════════════
   rutas/api.js — LA SUPERFICIE. Doce rutas y ninguna sorpresa.

   Las rutas son finas a propósito: leen, validan lo que es de la
   petición (¿hay sesión?, ¿cabe en el cubo?) y llaman al dominio. Toda
   regla que se pueda contar sin hablar de HTTP vive en `dominio/`, para
   que se pueda probar sin levantar un servidor.

   ── LA SESIÓN SE PIDE UNA VEZ ─────────────────────────────────────
   `GET /api/estado` devuelve todo lo que hace falta para pintar la
   portada —la calma, la bandada, las perillas del gesto— y de paso
   entrega un token si no lo había. Es una sola petición al cargar.

   Ese token NO es una cuenta y NO va en una cookie: lo guarda el
   navegador donde quiera (el sitio lo pone en `sessionStorage`, que
   muere al cerrar la pestaña) y viaja en la cabecera `X-Galene-Sesion`.
   Al ir en una cabecera que escribe el JavaScript del sitio, un
   formulario de otra página no lo puede mandar: el CSRF clásico no
   existe aquí por construcción, no por un token anti-CSRF.
   ═══════════════════════════════════════════════════════════════════ */

import { config } from '../config.js';
import { responder, leerCuerpo } from '../nucleo/http.js';
import { Alto, alto, color, entero, unaLinea } from '../nucleo/validar.js';
import { nuevoToken, esToken, hashSesion, huella } from '../nucleo/identidad.js';
import { permitir, mirar, cobrar } from '../nucleo/limites.js';

export function montarApi(r, { mar, garzas, foro, canal, version }) {
  /* ── Ayudas de petición ────────────────────────────────────────── */

  /* Devuelve el HASH de la sesión, nunca el token. Con `exigir`, una
     petición sin sesión no pasa: escribir en la comunidad sin haber
     pedido estado es o un cliente mal hecho o un script. */
  function sesionDe(req, exigir = false) {
    const t = req.headers['x-galene-sesion'];
    if (esToken(t)) return hashSesion(t);
    if (exigir) alto(401, 'Hace falta una sesión. Pide primero GET /api/estado.');
    return '';
  }

  /* El 429 lleva `Retry-After`: reintentar a ciegas es exactamente lo
     que hace que un cliente honesto se convierta en el problema. */
  const demasiado = (espera) => {
    const e = new Alto(429, `Vas demasiado rápido. Prueba dentro de ${espera} s.`);
    e.espera = espera;
    throw e;
  };

  function cubo(tipo, sesion, req) {
    const paso = permitir(tipo, sesion || 'anon', huella(req));
    if (!paso.ok) demasiado(paso.espera);
  }

  /* Para escribir: se cobra el INTENTO al entrar y se comprueba —sin
     cobrar— el cubo de publicación. Lo que devuelve es la función que
     cobra ese segundo cubo, y solo se llama si de verdad se publicó.
     Así una errata no gasta el turno de escribir. */
  function reservar(tipo, sesion, req) {
    const h = huella(req);
    const quien = sesion || 'anon';
    const intento = permitir('intento', quien, h);
    if (!intento.ok) demasiado(intento.espera);
    const paso = mirar(tipo, quien, h);
    if (!paso.ok) demasiado(paso.espera);
    return () => cobrar(tipo, quien, h);
  }

  const q = (req) => new URL(req.url, 'http://galene').searchParams;

  /* ═══ SALUD ═══════════════════════════════════════════════════════
     Para el supervisor del hosting. No dice nada de nadie. */
  r.get('/api/salud', (req, res) => responder(res, 200, {
    ok: true, version, ahora: Date.now(),
  }));

  /* ═══ ESTADO: LA PRIMERA PETICIÓN DE LA PORTADA ══════════════════ */
  r.get('/api/estado', (req, res) => {
    cubo('lectura', sesionDe(req), req);
    const dado = req.headers['x-galene-sesion'];
    const token = esToken(dado) ? dado : nuevoToken();
    const sesion = hashSesion(token);

    responder(res, 200, {
      version,
      sesion: token,                 // el mismo si ya lo traía
      calma: mar.calma(),
      sintonia: mar.sintonia(),
      restante: mar.restanteDe(sesion),
      garzas: garzas.vivas(),
      mia: garzas.mia(sesion),
      etiquetas: foro.etiquetas(),
      limites: {
        titulo: [config.foro.tituloMin, config.foro.tituloMax],
        cuerpo: [config.foro.cuerpoMin, config.foro.cuerpoMax],
        comentario: [config.foro.comentarioMin, config.foro.comentarioMax],
        nombre: config.foro.nombreMax,
      },
      garzasMax: config.garzas.max,
      perchas: config.garzas.perchas,
      picoAjeno: config.garzas.picoAjeno,
    }, { 'X-Galene-Sesion': token });
  });

  /* ═══ LA BANDADA ═════════════════════════════════════════════════ */
  r.get('/api/garzas', (req, res) => {
    cubo('lectura', sesionDe(req), req);
    responder(res, 200, { garzas: garzas.vivas(), max: config.garzas.max });
  });

  /* Dejar la garza. Idempotente: volver a llamar con el mismo token
     devuelve la misma garza, no otra. */
  r.post('/api/garzas', async (req, res) => {
    const sesion = sesionDe(req, true);
    /* Se cobra solo si de verdad nace una garza. Recargar la página
       treinta veces devuelve treinta veces la misma, y no puede costar
       treinta fichas: es la misma visita. */
    const cobrarGarza = reservar('garza', sesion, req);
    const rr = garzas.dejar(sesion);
    if (rr.nueva) cobrarGarza();
    if (!rr.garza && rr.seFue) {
      /* Su garza ya voló: llegaron diez después. No se le da otra —eso
         desalojaría a alguien y las dos pestañas se echarían la una a
         la otra sin parar— y se dice tal cual, que es la regla que se
         pidió vista desde el otro lado. */
      return responder(res, 200, { garza: null, seFue: true, garzas: garzas.vivas() });
    }
    responder(res, rr.nueva ? 201 : 200, {
      garza: rr.garza, nueva: !!rr.nueva, desalojada: rr.desalojada, garzas: garzas.vivas(),
    });
  });

  /* Tocar una garza y pintarle el pico. */
  r.patch('/api/garzas/:id/pico', async (req, res) => {
    const sesion = sesionDe(req, true);
    const cobrarPico = reservar('pico', sesion, req);
    const cuerpo = await leerCuerpo(req);
    const c = color(cuerpo.pico ?? cuerpo.color, 'pico');
    const garza = garzas.pintar(req.params.id, c, sesion);
    cobrarPico();
    responder(res, 200, { garza });
  });

  /* ═══ EL MAR ═════════════════════════════════════════════════════
     El WebSocket es el camino normal. Estas dos rutas son el respaldo
     para cuando no hay: proxys corporativos que cortan el `upgrade`,
     navegadores viejos, o un `prefers-reduced-motion` que apagó la
     escena entera. El mar es un enhancement; su servidor también. */
  r.get('/api/mar', (req, res) => {
    const sesion = sesionDe(req);
    cubo('lectura', sesion, req);
    responder(res, 200, {
      calma: mar.calma(),
      sintonia: mar.sintonia(),
      restante: sesion ? mar.restanteDe(sesion) : config.mar.topeSesion,
    });
  });

  r.post('/api/mar/gesto', async (req, res) => {
    const sesion = sesionDe(req, true);
    cubo('lectura', sesion, req);
    const cuerpo = await leerCuerpo(req);
    /* Techo de 30 s por llamada: sin él, un `POST {segundos: 999999}`
       satura las raíces de todo el sitio de una sentada. El tope por
       sesión ya está en el dominio; esto es la puerta. */
    const seg = Math.max(0, Math.min(30, Number(cuerpo.segundos) || 0));
    const rr = mar.acreditar(sesion, seg);
    responder(res, 200, { calma: mar.calma(), acreditados: rr.acreditados, restante: rr.restante });
  });

  /* ═══ LA COMUNIDAD ═══════════════════════════════════════════════ */
  r.get('/api/etiquetas', (req, res) => responder(res, 200, { etiquetas: foro.etiquetas() }));

  /* OJO AL ORDEN: `/api/hilos/nuevos` se declara ANTES que
     `/api/hilos/:id`, o el enrutador entiende que «nuevos» es un id. */
  r.get('/api/hilos/nuevos', (req, res) => {
    const p = q(req);
    cubo('lectura', sesionDe(req), req);
    responder(res, 200, {
      nuevos: foro.nuevosDesde(p.get('instantanea'), p.get('etiqueta') || ''),
    });
  });

  r.get('/api/hilos', (req, res) => {
    const sesion = sesionDe(req);
    cubo('lectura', sesion, req);
    const p = q(req);
    responder(res, 200, foro.listar({
      orden: p.get('orden') || 'recientes',
      etiqueta: p.get('etiqueta') || '',
      cursor: p.get('cursor') || '',
      limite: p.get('limite'),
      instantanea: p.get('instantanea'),
      conComentarios: entero(p.get('comentarios'), 0, 10, 0),
      sesion,
    }));
  });

  r.get('/api/hilos/:id', (req, res) => {
    const sesion = sesionDe(req);
    cubo('lectura', sesion, req);
    responder(res, 200, { hilo: foro.hilo(req.params.id, sesion) });
  });

  r.get('/api/hilos/:id/comentarios', (req, res) => {
    const sesion = sesionDe(req);
    cubo('lectura', sesion, req);
    const p = q(req);
    responder(res, 200, foro.comentarios(req.params.id, {
      cursor: p.get('cursor') || '', limite: p.get('limite'), sesion,
    }));
  });

  r.post('/api/hilos', async (req, res) => {
    const sesion = sesionDe(req, true);
    const cobrarHilo = reservar('hilo', sesion, req);
    const c = await leerCuerpo(req);
    const rr = foro.crearHilo({
      sesion, titulo: c.titulo, cuerpo: c.cuerpo, etiqueta: c.etiqueta,
      nombre: c.nombre, anonima: c.anonima,
    });
    cobrarHilo();
    responder(res, 201, {
      id: rr.id,
      estado: rr.estado,
      razones: rr.razones,
      /* La llave se enseña UNA VEZ. Es lo que permite borrar mañana lo
         que se escribió esta madrugada, cuando la pestaña ya se cerró y
         con ella el token de la sesión. */
      llave: rr.llave,
      hilo: rr.estado === 'visible' ? foro.hilo(rr.id, sesion) : null,
    });
  });

  r.post('/api/hilos/:id/comentarios', async (req, res) => {
    const sesion = sesionDe(req, true);
    const cobrarComentario = reservar('comentario', sesion, req);
    const c = await leerCuerpo(req);
    const rr = foro.crearComentario({
      sesion, hilo: req.params.id, padre: c.padre,
      texto: c.texto, nombre: c.nombre, anonima: c.anonima,
    });
    cobrarComentario();
    responder(res, 201, rr);
  });

  r.post('/api/votos/:objeto/:cosa', async (req, res) => {
    const sesion = sesionDe(req, true);
    cubo('voto', sesion, req);
    const c = await leerCuerpo(req);
    responder(res, 200, foro.votar(req.params.objeto, req.params.cosa, c.dir, sesion));
  });

  r.post('/api/reportes/:objeto/:cosa', async (req, res) => {
    const sesion = sesionDe(req, true);
    cubo('reporte', sesion, req);
    const c = await leerCuerpo(req);
    responder(res, 200, foro.reportar(req.params.objeto, req.params.cosa, c.motivo, sesion));
  });

  /* Borrar lo propio. Con la sesión o con la llave — la cabecera
     `X-Galene-Borrado` la lleva porque una llave en la URL acabaría en
     el historial del navegador y en el registro de cualquier proxy. */
  const borrar = (objeto) => async (req, res) => {
    const sesion = sesionDe(req);
    const llave = unaLinea(req.headers['x-galene-borrado'] || '', 40, 'llave');
    if (!sesion && !llave) alto(401, 'Hace falta la sesión o la llave de borrado.');
    responder(res, 200, foro.borrar(objeto, req.params.id, sesion, llave));
  };
  r.borrar('/api/hilos/:id', borrar('hilo'));
  r.borrar('/api/comentarios/:id', borrar('comentario'));

  /* ═══ MODERACIÓN ═════════════════════════════════════════════════
     Sin llave configurada, estas rutas NO EXISTEN: responden 404 como
     cualquier camino inventado, en vez de 401 —que confirmaría que hay
     una puerta ahí. */
  const conLlave = (mano) => (req, res) => {
    const llave = config.llaveModeracion;
    if (!llave || req.headers['x-galene-llave'] !== llave) alto(404, 'Aquí no hay nada.');
    return mano(req, res);
  };

  r.get('/api/moderacion/cola', conLlave((req, res) => {
    responder(res, 200, { ...foro.cola(entero(q(req).get('limite'), 1, 200, 50)), conectados: canal?.cuantos?.() ?? 0 });
  }));

  r.post('/api/moderacion/:objeto/:cosa', conLlave(async (req, res) => {
    const c = await leerCuerpo(req);
    responder(res, 200, foro.moderar(req.params.objeto, req.params.cosa, c.estado));
  }));
}
