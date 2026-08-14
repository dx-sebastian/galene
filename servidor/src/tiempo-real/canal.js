/* ═══════════════════════════════════════════════════════════════════
   tiempo-real/canal.js — MUCHAS MANOS SOBRE LA MISMA AGUA.

   Lo que se pidió: que el gesto de calmar el mar lo puedan hacer VARIAS
   PERSONAS A LA VEZ, en Android y en escritorio, y que se note.

   ── UN SOLO SOCKET PARA TODO ──────────────────────────────────────
   Por aquí van los toques, la calma, las garzas que llegan, las que
   vuelan, los picos que alguien pinta y el aviso de hilo nuevo. Una
   conexión por pestaña y ninguna encuesta periódica: un `setInterval`
   preguntando «¿hay novedades?» cada dos segundos es, en un móvil, la
   radio encendida toda la visita.

   ── EL MISMO PAQUETE PARA TODOS ───────────────────────────────────
   La tentación es mandarle a cada quien «los toques de los demás», y
   eso obliga a serializar un mensaje distinto por conexión: con
   cincuenta personas son cincuenta JSON por cuadro. Se manda UNO solo,
   con todos los toques y de quién es cada uno, y cada navegador
   descarta el suyo —que ya lo está pintando sin esperar a nadie, porque
   su propia mano no puede ir con retraso de red.

   ── EL TIEMPO DEL ANILLO LO LLEVA EL SERVIDOR ─────────────────────
   Cuando alguien suelta, su anillo sigue cerrándose hacia dentro. Esa
   edad la cuenta el servidor y no cada cliente: si la contara cada uno,
   el mismo anillo estaría en un sitio distinto en cada pantalla, y lo
   que se está compartiendo es precisamente que sea EL MISMO agua.

   ── LO QUE NO SE HACE ─────────────────────────────────────────────
   No se difunde cuánta gente hay. Un número de personas presentes en un
   sitio sobre sumisión química se lee como un recuento, y la regla 9
   dice que el sitio nunca cuenta. Lo que se ve es el árbol con sus
   garzas y el agua más quieta: eso ya dice «no estás sola» sin ponerle
   una cifra.
   ═══════════════════════════════════════════════════════════════════ */

import { WebSocketServer } from 'ws';
import { config } from '../config.js';
import { esToken, hashSesion, huella } from '../nucleo/identidad.js';
import { permitir } from '../nucleo/limites.js';

const ESPERA_HOLA = 5000;      // sin presentarse en 5 s, fuera
const LATIDO = 30_000;         // ping cada 30 s; sin pong, se corta

export function crearCanal({ servidor, mar }) {
  const wss = new WebSocketServer({ noServer: true });
  const conexiones = new Set();
  let siguienteId = 1;

  /* ── EL APRETÓN DE MANOS ────────────────────────────────────────
     Un WebSocket NO tiene CORS: cualquier página del mundo puede abrir
     uno contra este servidor y el navegador ni pregunta. La única
     defensa es mirar el `Origin` aquí, y por eso está aquí. */
  servidor.on('upgrade', (req, socket, cabeza) => {
    const url = new URL(req.url, 'http://galene');
    if (url.pathname !== '/ws') return socket.destroy();

    const origen = req.headers.origin;
    if (origen && !config.origenes.includes(origen)) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      return socket.destroy();
    }
    /* Un cubo por huella: abrir y cerrar sockets en bucle es la forma
       más barata de gastarle la memoria a un servidor. */
    const h = huella(req);
    if (!permitir('conexion', h, h).ok) {
      socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
      return socket.destroy();
    }

    wss.handleUpgrade(req, socket, cabeza, (ws) => entra(ws, h));
  });

  function entra(ws, huellaIp) {
    const c = {
      ws,
      id: siguienteId++,
      sesion: null,
      huella: huellaIp,
      punteros: new Map(),        // p → {x, y, f, e, viva, ultimo}
      sostenido: 0,               // segundos con la mano puesta, sin acreditar
      vivo: true,
      mensajes: 0,
      ventana: Date.now(),
    };
    conexiones.add(c);

    /* Sin presentarse, no hay conexión. Evita sockets abiertos que no
       dicen quiénes son ocupando sitio para siempre. */
    const plazo = setTimeout(() => { if (!c.sesion) ws.close(1008, 'sin sesion'); }, ESPERA_HOLA);

    ws.on('message', (crudo) => {
      /* Techo de caudal. Un cliente honesto manda 15 mensajes por
         segundo y por dedo; a partir de 120 en un segundo es otra cosa. */
      const ahora = Date.now();
      if (ahora - c.ventana > 1000) { c.ventana = ahora; c.mensajes = 0; }
      if (++c.mensajes > 120) return ws.close(1008, 'demasiado');

      let m;
      try { m = JSON.parse(String(crudo)); } catch { return; }
      if (!m || typeof m !== 'object') return;

      if (m.t === 'hola') {
        if (c.sesion) return;
        if (!esToken(m.sesion)) return ws.close(1008, 'sesion mal formada');
        c.sesion = hashSesion(m.sesion);
        clearTimeout(plazo);
        enviar(c, {
          t: 'hola',
          yo: c.id,
          calma: redondear(mar.calma(), 4),
          restante: mar.restanteDe(c.sesion),
          sintonia: mar.sintonia(),
        });
        return;
      }
      if (!c.sesion) return;                       // nada antes de presentarse

      if (m.t === 'toque') {
        const p = Math.trunc(Number(m.p) || 0);
        if (p < 0 || p >= config.mar.maxPunteros) return;
        const x = Number(m.x), y = Number(m.y);
        /* q es «x en anchos de alto, y de 0 abajo a 1 arriba». Fuera de
           ese rango no es un toque, es ruido — o alguien probando. */
        if (!Number.isFinite(x) || !Number.isFinite(y) || x < -0.2 || x > 4 || y < 0 || y > 1) return;

        const t = c.punteros.get(p);
        if (t) { t.x = x; t.y = y; t.viva = true; t.ultimo = ahora; }
        else c.punteros.set(p, { x, y, f: 0, e: 0, viva: true, ultimo: ahora });
        return;
      }

      if (m.t === 'suelto') {
        const p = Math.trunc(Number(m.p) || 0);
        const t = c.punteros.get(p);
        if (t) { t.viva = false; t.ultimo = ahora; }
        return;
      }

      if (m.t === 'pulso') { enviar(c, { t: 'pulso' }); }
    });

    ws.on('pong', () => { c.vivo = true; });
    ws.on('close', () => { conexiones.delete(c); clearTimeout(plazo); acreditar(c); });
    ws.on('error', () => { conexiones.delete(c); clearTimeout(plazo); });
  }

  const enviar = (c, obj) => {
    if (c.ws.readyState === 1) { try { c.ws.send(JSON.stringify(obj)); } catch { /* se cae sola */ } }
  };

  /* Difundir a todos. Se serializa UNA vez. */
  function difundir(obj) {
    const txt = JSON.stringify(obj);
    for (const c of conexiones) {
      if (c.ws.readyState === 1 && c.sesion) { try { c.ws.send(txt); } catch { /* nada */ } }
    }
  }

  function acreditar(c) {
    if (!c.sesion || c.sostenido < 0.25) return;
    mar.acreditar(c.sesion, c.sostenido);
    c.sostenido = 0;
  }

  /* ── EL CUADRO ──────────────────────────────────────────────────
     Un solo reloj para todo el servidor, no uno por conexión. */
  const PASO = 1000 / config.mar.hzDifusion;
  let anterior = Date.now();
  let calmaEnviada = mar.calma();
  let vacioEnviado = false;
  let desdeAcredito = 0;

  const reloj = setInterval(() => {
    const ahora = Date.now();
    const dt = Math.min(0.5, (ahora - anterior) / 1000);
    anterior = ahora;
    desdeAcredito += dt;

    const vivos = [];
    for (const c of conexiones) {
      if (!c.sesion) continue;
      let manoPuesta = false;

      for (const [p, t] of c.punteros) {
        /* CADUCIDAD. Si un móvil se bloquea con el dedo puesto, su toque
           dejaría el agua de todo el mundo aplanada para siempre. Sin
           noticias en `caducaToque`, se suelta solo. */
        if (t.viva && ahora - t.ultimo > config.mar.caducaToque) t.viva = false;

        if (t.viva) {
          manoPuesta = true;
          t.f = Math.min(1, t.f + dt * config.mar.sintonia.subeFuerza);
          t.e = 0;
        } else {
          /* La edad solo corre al soltar: el anillo se cierra cuando se
             levanta la mano, no mientras se aguanta. 0.45/s es el mismo
             ritmo que ya tenía el gesto local. */
          t.e = Math.min(1, t.e + dt * 0.45);
          if (t.e >= 1) { c.punteros.delete(p); continue; }
        }
        vivos.push([c.id, p, redondear(t.x, 3), redondear(t.y, 3), redondear(t.f, 2), redondear(t.e, 2)]);
      }

      /* El tiempo se cuenta POR MANO, no por dedo: tres dedos de la
         misma persona no calman el mar tres veces más rápido. */
      if (manoPuesta) c.sostenido += dt;
    }

    /* Solo los más fuertes, y con techo: el shader tiene seis ranuras y
       mandar cuarenta toques a un teléfono es gastar red para nada. */
    if (vivos.length > config.mar.maxDifundidos) {
      vivos.sort((a, b) => b[4] - a[4]);
      vivos.length = config.mar.maxDifundidos;
    }

    if (vivos.length) {
      difundir({ t: 'toques', v: vivos });
      vacioEnviado = false;
    } else if (!vacioEnviado) {
      /* Un solo mensaje vacío al quedarse el agua sola, y después
         silencio: el canal no habla si no pasa nada. */
      difundir({ t: 'toques', v: [] });
      vacioEnviado = true;
    }

    if (desdeAcredito >= 1) {
      desdeAcredito = 0;
      for (const c of conexiones) acreditar(c);
      const c = mar.calma();
      /* Dos milésimas es el umbral por debajo del cual el agua no cambia
         de color de forma visible. Sin él, esto manda un mensaje por
         segundo a todo el mundo para nada. */
      if (Math.abs(c - calmaEnviada) > 0.002) {
        calmaEnviada = c;
        difundir({ t: 'calma', c: redondear(c, 4) });
      }
    }
  }, PASO);
  reloj.unref?.();

  /* Latido. Un socket muerto en un móvil que se metió en un túnel no
     avisa: se queda abierto hasta que el sistema operativo se aburre. */
  const latido = setInterval(() => {
    for (const c of conexiones) {
      if (!c.vivo) { c.ws.terminate(); conexiones.delete(c); continue; }
      c.vivo = false;
      try { c.ws.ping(); } catch { /* se cae sola */ }
    }
  }, LATIDO);
  latido.unref?.();

  return {
    difundir,
    /* Solo para operación y para las pruebas. No sale por la API. */
    cuantos: () => conexiones.size,
    cerrar() {
      clearInterval(reloj); clearInterval(latido);
      for (const c of conexiones) { acreditar(c); try { c.ws.close(1001, 'adios'); } catch { /* nada */ } }
      conexiones.clear();
      wss.close();
    },
  };
}

const redondear = (n, d) => Math.round(n * 10 ** d) / 10 ** d;
