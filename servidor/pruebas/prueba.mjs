/* ═══════════════════════════════════════════════════════════════════
   pruebas/prueba.mjs — SE COMPRUEBA, NO SE OPINA.

   Levanta el servidor entero contra una base en memoria y lo usa como
   lo usaría el navegador: por HTTP y por WebSocket. Nada de dobles ni
   de simulacros — lo que aquí pasa es lo que va a pasar.

   Cada bloque comprueba una de las tres cosas que se pidieron, y
   además las que se rompen solas: la paginación que se salta un hilo,
   el gesto que se puede farmear reconectando, el pico que se le pinta a
   una garza que ya voló.

       npm run prueba
   ═══════════════════════════════════════════════════════════════════ */

import { WebSocket } from 'ws';
import { crearServidor } from '../src/servidor.js';
import { olvidarCubos } from '../src/nucleo/limites.js';
import { config, calmaDeRaices } from '../src/config.js';

let ok = 0, mal = 0;
const fallos = [];
function comprobar(nombre, condicion, detalle) {
  if (condicion) { ok++; return true; }
  mal++;
  fallos.push(nombre + (detalle !== undefined ? `  →  ${JSON.stringify(detalle)}` : ''));
  console.log(`  ✗ ${nombre}`, detalle !== undefined ? detalle : '');
  return false;
}
const igual = (nombre, a, b) => comprobar(nombre, Object.is(a, b) || JSON.stringify(a) === JSON.stringify(b), { esperado: b, salio: a });
const bloque = (t) => console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 58 - t.length))}`);
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const app = crearServidor({ base: ':memory:', registrar: false });
const dir = await app.escuchar(0, '127.0.0.1');
const URL_BASE = `http://127.0.0.1:${dir.port}`;
const URL_WS = `ws://127.0.0.1:${dir.port}/ws`;

/* Un cliente HTTP mínimo que arrastra la sesión, como haría el sitio. */
function cliente(token = null) {
  const c = {
    token,
    async pedir(metodo, camino, cuerpo, cabeceras = {}) {
      const h = { ...cabeceras };
      if (c.token) h['X-Galene-Sesion'] = c.token;
      if (cuerpo !== undefined) h['Content-Type'] = 'application/json';
      const r = await fetch(URL_BASE + camino, {
        method: metodo, headers: h,
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      });
      let datos = null;
      try { datos = await r.json(); } catch { /* 204 */ }
      return { estado: r.status, datos, cabeceras: r.headers };
    },
    get: (p, h) => c.pedir('GET', p, undefined, h),
    post: (p, b, h) => c.pedir('POST', p, b ?? {}, h),
    patch: (p, b, h) => c.pedir('PATCH', p, b ?? {}, h),
    borrar: (p, h) => c.pedir('DELETE', p, undefined, h),
    async entrar() {
      const r = await c.get('/api/estado');
      c.token = r.datos.sesion;
      return r.datos;
    },
  };
  return c;
}

/* Un cliente de WebSocket que guarda lo que le llega. */
function socket(token) {
  const ws = new WebSocket(URL_WS, { origin: config.origenes[0] });
  const recibido = [];
  const espera = new Map();
  ws.on('message', (crudo) => {
    const m = JSON.parse(String(crudo));
    recibido.push(m);
    const f = espera.get(m.t);
    if (f) { espera.delete(m.t); f(m); }
  });
  const listo = new Promise((r, x) => { ws.on('open', r); ws.on('error', x); });
  return {
    ws, recibido,
    async abrir() { await listo; ws.send(JSON.stringify({ t: 'hola', sesion: token })); return this.esperar('hola'); },
    enviar: (m) => ws.send(JSON.stringify(m)),
    esperar(tipo, ms = 3000) {
      const ya = recibido.find((m) => m.t === tipo);
      if (ya && tipo !== 'toques') return Promise.resolve(ya);
      return new Promise((r, x) => {
        espera.set(tipo, r);
        setTimeout(() => { if (espera.has(tipo)) { espera.delete(tipo); x(new Error('sin ' + tipo)); } }, ms);
      });
    },
    ultimo: (tipo) => [...recibido].reverse().find((m) => m.t === tipo),
    cerrar: () => ws.close(),
  };
}

try {
  /* ═══════════════════════════════════════════════════════════════
     0 · LO BÁSICO
     ═══════════════════════════════════════════════════════════════ */
  bloque('base');
  {
    const c = cliente();
    const salud = await c.get('/api/salud');
    igual('salud responde 200', salud.estado, 200);

    const est = await c.entrar();
    comprobar('estado entrega token de 32 hex', /^[0-9a-f]{32}$/.test(est.sesion), est.sesion);
    igual('calma de partida es la del README', est.calma, 0.35);
    igual('vienen las cinco etiquetas', est.etiquetas.length, 5);

    const otra = await c.get('/api/estado');
    igual('el token que se trae se conserva', otra.datos.sesion, c.token);

    const nada = await c.get('/api/inventado');
    igual('camino que no existe → 404', nada.estado, 404);
    const metodo = await c.borrar('/api/estado');
    igual('método que no toca → 405', metodo.estado, 405);

    const sinCabecera = await fetch(URL_BASE + '/api/estado');
    igual('nada se cachea', sinCabecera.headers.get('cache-control')?.includes('no-store'), true);
    comprobar('no se ponen cookies', !sinCabecera.headers.get('set-cookie'));
  }

  /* ═══════════════════════════════════════════════════════════════
     1 · LA BANDADA
     ═══════════════════════════════════════════════════════════════ */
  bloque('garzas · dejar, tocar y desalojar');
  olvidarCubos();
  {
    const a = cliente(); await a.entrar();
    const r1 = await a.post('/api/garzas');
    igual('la primera garza se crea', r1.estado, 201);
    comprobar('trae percha, pose, mira y escala',
      Number.isInteger(r1.datos.garza.percha) && typeof r1.datos.garza.pose === 'string' &&
      Math.abs(r1.datos.garza.mira) === 1 && r1.datos.garza.escala >= 0.86);
    igual('nace sin pico', r1.datos.garza.pico, null);

    const r2 = await a.post('/api/garzas');
    igual('volver a entrar NO deja otra', r2.estado, 200);
    igual('…y devuelve la misma', r2.datos.garza.id, r1.datos.garza.id);
    igual('el árbol tiene una', r2.datos.garzas.length, 1);

    /* El pico. Se toca y se pinta. */
    const p1 = await a.patch(`/api/garzas/${r1.datos.garza.id}/pico`, { pico: '#C4553F' });
    igual('el pico se pinta', p1.datos.garza.pico, '#c4553f');
    const p2 = await a.patch(`/api/garzas/${r1.datos.garza.id}/pico`, { pico: 'rojo' });
    igual('un color que no es #rrggbb → 422', p2.estado, 422);
    const p3 = await a.patch('/api/garzas/noexiste/pico', { pico: '#000000' });
    igual('pintar una garza que no está → 404', p3.estado, 404);

    /* El de otra persona: por defecto se puede, y es una decisión. */
    const b = cliente(); await b.entrar();
    const p4 = await b.patch(`/api/garzas/${r1.datos.garza.id}/pico`, { pico: '#2F6B4F' });
    igual('cualquiera puede pintarle el pico a cualquiera', p4.estado, 200);
  }

  bloque('garzas · el tope de diez y la undécima');
  olvidarCubos();
  {
    /* Doce visitantes, por el dominio: doce POST seguidos desde la misma
       IP los para el cubo, y el cubo ya se prueba aparte. */
    const app2 = crearServidor({ base: ':memory:', registrar: false });
    const ids = [];
    for (let i = 0; i < 12; i++) {
      const r = app2.garzas.dejar('sesion-de-prueba-' + i);
      if (r.garza) ids.push(r.garza.id);
      await dormir(2);                     // llegadas distintas: el desalojo es por antigüedad
    }
    const vivas = app2.garzas.vivas();
    igual('nunca hay más de diez', vivas.length, config.garzas.max);
    comprobar('la primera fue desalojada', !vivas.some((g) => g.id === ids[0]));
    comprobar('la última está', vivas.some((g) => g.id === ids[11]));

    const perchas = new Set(vivas.map((g) => g.percha));
    igual('ninguna comparte rama', perchas.size, vivas.length);
    comprobar('todas las ramas existen en el manglar',
      vivas.every((g) => g.percha >= 0 && g.percha < config.garzas.perchas));

    /* Quien fue desalojada no vuelve a dejar otra: si volviera,
       desalojaría a alguien y dos pestañas se echarían en bucle. */
    const vuelve = app2.garzas.dejar('sesion-de-prueba-0');
    igual('la desalojada no deja otra', vuelve.garza, null);
    igual('…y se le dice', vuelve.seFue, true);
    igual('el árbol sigue con diez', app2.garzas.vivas().length, 10);

    /* Orden de llegada: las vivas salen de la más antigua a la más nueva. */
    const llegadas = app2.garzas.vivas().map((g) => g.llegada);
    comprobar('salen en orden de llegada', llegadas.every((t, i) => i === 0 || t >= llegadas[i - 1]));
    await app2.cerrar();
  }

  /* ═══════════════════════════════════════════════════════════════
     2 · EL MAR
     ═══════════════════════════════════════════════════════════════ */
  bloque('mar · la calma sube, no baja, y tiene techo');
  olvidarCubos();
  {
    const app3 = crearServidor({ base: ':memory:', registrar: false });
    const antes = app3.mar.calma();
    app3.mar.acreditar('mano-1', 10);
    const despues = app3.mar.calma();
    comprobar('diez segundos de mano mueven la calma', despues > antes, { antes, despues });

    /* El tope por sesión, y que sobrevive a la reconexión: se acredita
       en dos tandas y la segunda ya no entra. */
    const r1 = app3.mar.acreditar('mano-1', 1000);
    igual('el tope corta lo que sobra', Math.round(r1.acreditados), config.mar.topeSesion - 10);
    const r2 = app3.mar.acreditar('mano-1', 50);
    igual('volver a intentarlo no acredita nada', r2.acreditados, 0);
    igual('y el restante es cero', app3.mar.restanteDe('mano-1'), 0);

    /* Otra mano sí suma: es la comunidad, no una persona. */
    const c1 = app3.mar.calma();
    app3.mar.acreditar('mano-2', 100);
    comprobar('otra persona sí mueve el mar', app3.mar.calma() > c1);

    /* El techo: por muchas raíces que haya, la comunidad no vuelve el
       agua un espejo. Si lo hiciera, quien entre después no vería nada
       al poner la mano — y eso mata el gesto. */
    for (let i = 0; i < 200; i++) app3.mar.acreditar('mano-' + i, 240);
    const saturada = app3.mar.calma();
    const techo = 0.35 + 0.50 * config.mar.techoRaices;
    comprobar('la calma de la comunidad tiene techo', Math.abs(saturada - techo) < 1e-9, { saturada, techo });
    comprobar('y deja sitio a una mano sola', saturada < 0.85);

    /* Monótona: nunca baja. «Lo que dejas, queda». */
    let previa = 0;
    const app4 = crearServidor({ base: ':memory:', registrar: false });
    let baja = false;
    for (let i = 0; i < 60; i++) {
      app4.mar.acreditar('m' + i, 20);
      const c = app4.mar.calma();
      if (c < previa) baja = true;
      previa = c;
    }
    comprobar('la calma nunca baja', !baja);
    igual('la fórmula coincide con la del README', app4.mar.calma(), calmaDeRaices(app4.mar.raices()));
    await app3.cerrar(); await app4.cerrar();
  }

  bloque('mar · dos manos a la vez por WebSocket');
  olvidarCubos();
  {
    const a = cliente(); await a.entrar();
    const b = cliente(); await b.entrar();
    const sa = socket(a.token); const sb = socket(b.token);
    const holaA = await sa.abrir(); const holaB = await sb.abrir();

    comprobar('el saludo trae la sintonía', typeof holaA.sintonia?.radioMax === 'number');
    comprobar('cada conexión tiene su número', holaA.yo !== holaB.yo, [holaA.yo, holaB.yo]);
    igual('el saludo trae la calma', typeof holaA.calma, 'number');

    /* Las dos manos, y además dos dedos de la primera: multitáctil de
       Android en la misma conexión. */
    sa.enviar({ t: 'toque', p: 0, x: 0.30, y: 0.20 });
    sa.enviar({ t: 'toque', p: 1, x: 0.55, y: 0.12 });
    sb.enviar({ t: 'toque', p: 0, x: 1.10, y: 0.28 });
    await dormir(400);

    const marco = sb.ultimo('toques');
    comprobar('llegan los tres toques', marco?.v.length === 3, marco?.v);
    const deA = marco.v.filter((t) => t[0] === holaA.yo);
    igual('dos dedos de la misma mano llegan como dos', deA.length, 2);
    comprobar('el toque propio también viene (el cliente filtra el suyo)',
      marco.v.some((t) => t[0] === holaB.yo));
    comprobar('la fuerza sube mientras se sostiene', marco.v.every((t) => t[4] > 0), marco.v);
    comprobar('la edad es cero mientras se sostiene', marco.v.every((t) => t[5] === 0));

    /* Un dedo de más de los que se permiten: se ignora. */
    sa.enviar({ t: 'toque', p: 9, x: 0.5, y: 0.5 });
    await dormir(200);
    igual('un puntero fuera de rango no entra', sb.ultimo('toques').v.length, 3);

    /* Coordenadas imposibles: no son un toque. */
    sa.enviar({ t: 'toque', p: 2, x: 99, y: 0.5 });
    await dormir(200);
    igual('coordenadas fuera del agua no entran', sb.ultimo('toques').v.length, 3);

    /* Soltar: el anillo se cierra (la edad corre) y luego desaparece. */
    sa.enviar({ t: 'suelto', p: 0 });
    sa.enviar({ t: 'suelto', p: 1 });
    await dormir(500);
    const tras = sb.ultimo('toques').v.filter((t) => t[0] === holaA.yo);
    comprobar('al soltar, la edad empieza a correr', tras.every((t) => t[5] > 0), tras);
    await dormir(2200);
    const luego = sb.ultimo('toques').v.filter((t) => t[0] === holaA.yo);
    igual('el anillo termina de cerrarse y se va', luego.length, 0);

    /* El gesto sostenido se acredita al mar de todos. */
    const calmaAntes = app.mar.calma();
    sb.enviar({ t: 'toque', p: 0, x: 0.4, y: 0.2 });
    await dormir(1600);
    comprobar('sostener sube la calma compartida', app.mar.calma() > calmaAntes,
      { antes: calmaAntes, ahora: app.mar.calma() });
    sb.enviar({ t: 'suelto', p: 0 });

    /* Y el toque caduca solo si la pestaña deja de dar señales: aquí se
       comprueba la mecánica con el reloj del servidor. */
    sa.cerrar(); sb.cerrar();
    await dormir(200);
  }

  bloque('mar · el respaldo sin WebSocket');
  olvidarCubos();
  {
    const c = cliente(); await c.entrar();
    const antes = (await c.get('/api/mar')).datos.calma;
    const r = await c.post('/api/mar/gesto', { segundos: 12 });
    igual('el gesto por HTTP se acredita', r.datos.acreditados, 12);
    comprobar('y mueve la calma', r.datos.calma > antes);
    const abuso = await c.post('/api/mar/gesto', { segundos: 999999 });
    comprobar('un número absurdo se corta en 30', abuso.datos.acreditados <= 30, abuso.datos);
  }

  /* ═══════════════════════════════════════════════════════════════
     3 · LA COMUNIDAD
     ═══════════════════════════════════════════════════════════════ */
  bloque('foro · escribir, leer y validar');
  olvidarCubos();
  {
    const c = cliente(); await c.entrar();

    const sinSesion = await cliente().post('/api/hilos', { titulo: 'x', cuerpo: 'y', etiqueta: 'ruta' });
    igual('escribir sin sesión → 401', sinSesion.estado, 401);

    const corto = await c.post('/api/hilos', { titulo: 'hola', cuerpo: 'algo', etiqueta: 'ruta' });
    igual('título demasiado corto → 422', corto.estado, 422);

    const etiquetaMala = await c.post('/api/hilos', {
      titulo: 'Un título que sí tiene largo', cuerpo: 'algo', etiqueta: 'inventada' });
    igual('etiqueta que no existe → 422', etiquetaMala.estado, 422);

    const r = await c.post('/api/hilos', {
      titulo: 'Cómo pedí el día sin contar nada',
      cuerpo: 'Primer párrafo de lo que pasó después.\n\nSegundo párrafo, con lo que sirvió.',
      etiqueta: 'despues',
    });
    igual('un hilo bien formado se publica', r.estado, 201);
    igual('sale visible', r.datos.estado, 'visible');
    comprobar('devuelve la llave de borrado, una vez', /^[a-z0-9-]{14}$/.test(r.datos.llave), r.datos.llave);
    igual('el cuerpo se parte en párrafos', r.datos.hilo.cuerpo.length, 2);
    igual('sin nombre, es Anónima', r.datos.hilo.autora.nombre, 'Anónima');
    comprobar('trae sello de garza', config.garzas.poses.includes(r.datos.hilo.autora.pose));
    igual('y sabe que es tuyo', r.datos.hilo.autora.esMia, true);

    /* La lista NO devuelve un resumen: devuelve el cuerpo entero, que es
       lo que permite leer sin tarjetas. */
    const lista = await c.get('/api/hilos');
    igual('el hilo está en la lista', lista.datos.hilos.length, 1);
    igual('con el cuerpo COMPLETO, no un extracto', lista.datos.hilos[0].cuerpo.length, 2);
    comprobar('con instantánea para paginar', typeof lista.datos.instantanea === 'number');
    comprobar('y con el tiempo dicho de dos formas',
      typeof lista.datos.hilos[0].creado === 'number' && typeof lista.datos.hilos[0].cuando === 'string');

    /* Comentarios y los dos niveles. */
    const c1 = await c.post(`/api/hilos/${r.datos.id}/comentarios`, { texto: 'Un comentario de raíz.' });
    igual('el comentario se publica', c1.estado, 201);
    const c2 = await c.post(`/api/hilos/${r.datos.id}/comentarios`, { texto: 'Respuesta al comentario.', padre: c1.datos.id });
    igual('la respuesta cuelga del comentario', c2.datos.padre, c1.datos.id);
    const c3 = await c.post(`/api/hilos/${r.datos.id}/comentarios`, { texto: 'Respuesta a la respuesta.', padre: c2.datos.id });
    igual('el tercer nivel se aplana al segundo', c3.datos.padre, c1.datos.id);

    const hebra = await c.get(`/api/hilos/${r.datos.id}/comentarios`);
    igual('una sola raíz', hebra.datos.comentarios.length, 1);
    igual('con sus dos respuestas', hebra.datos.comentarios[0].respuestas.length, 2);

    const hilo = await c.get(`/api/hilos/${r.datos.id}`);
    igual('la cuenta de respuestas es tres', hilo.datos.hilo.respuestas, 3);

    /* Con `comentarios=N`, la lista trae los primeros: una columna que
       se lee de arriba abajo sin pedir nada más. */
    const conPrimeros = await c.get('/api/hilos?comentarios=3');
    igual('la lista puede traer los primeros comentarios', conPrimeros.datos.hilos[0].primeros.length, 1);
  }

  bloque('foro · el voto');
  olvidarCubos();
  {
    const autora = cliente(); await autora.entrar();
    const h = await autora.post('/api/hilos', {
      titulo: 'Un hilo para votar sin prisa', cuerpo: 'Cuerpo.', etiqueta: 'preguntas' });
    const id = h.datos.id;
    const lector = cliente(); await lector.entrar();

    const v1 = await lector.post(`/api/votos/hilo/${id}`, { dir: 1 });
    igual('subir suma uno', v1.datos.votos, 1);
    const v2 = await lector.post(`/api/votos/hilo/${id}`, { dir: 1 });
    igual('volver a subir no suma dos', v2.datos.votos, 1);
    const v3 = await lector.post(`/api/votos/hilo/${id}`, { dir: -1 });
    igual('saltar de arriba a abajo son dos puntos', v3.datos.votos, -1);
    const v4 = await lector.post(`/api/votos/hilo/${id}`, { dir: 0 });
    igual('quitar el voto lo devuelve a cero', v4.datos.votos, 0);

    const otra = cliente(); await otra.entrar();
    await otra.post(`/api/votos/hilo/${id}`, { dir: 1 });
    await lector.post(`/api/votos/hilo/${id}`, { dir: 1 });
    const visto = await lector.get(`/api/hilos/${id}`);
    igual('dos personas suman dos', visto.datos.hilo.votos, 2);
    igual('y cada quien ve el suyo', visto.datos.hilo.miVoto, 1);
    const anon = await cliente().get(`/api/hilos/${id}`);
    igual('quien no ha votado ve cero', anon.datos.hilo.miVoto, 0);
  }

  bloque('foro · scroll infinito sin saltos ni repeticiones');
  olvidarCubos();
  {
    const app5 = crearServidor({ base: ':memory:', registrar: false });
    const N = 25;
    for (let i = 0; i < N; i++) {
      app5.foro.crearHilo({
        sesion: 'autora-' + (i % 4),
        titulo: `Hilo número ${String(i).padStart(2, '0')} del manglar`,
        cuerpo: 'Cuerpo del hilo ' + i,
        etiqueta: config.foro.etiquetas[i % 5].id,
      });
      await dormir(2);
    }

    for (const orden of ['recientes', 'votados', 'solas']) {
      const vistos = [];
      let cursor = '', instantanea = 0, vueltas = 0;
      do {
        const p = app5.foro.listar({ orden, cursor, limite: 7, instantanea });
        instantanea = p.instantanea;
        cursor = p.cursor;
        vistos.push(...p.hilos.map((h) => h.id));
        vueltas++;
      } while (cursor && vueltas < 20);

      igual(`«${orden}»: salen los ${N} hilos`, vistos.length, N);
      igual(`«${orden}»: ninguno repetido`, new Set(vistos).size, N);
    }

    /* Y lo que llega MIENTRAS se lee no descoloca la lista: se queda
       fuera de la instantánea y se anuncia aparte. */
    const p1 = app5.foro.listar({ limite: 7 });
    /* La espera no es adorno: la instantánea es un instante en
       milisegundos, y lo que nace EN ese mismo milisegundo pertenece a
       la instantánea —sale en la lista y no se anuncia como nuevo—. Sin
       la espera, la prueba mide una carrera y no una regla. */
    await dormir(3);
    app5.foro.crearHilo({ sesion: 'nueva', titulo: 'Llega uno mientras lees el sitio', cuerpo: 'x', etiqueta: 'ruta' });
    const p2 = app5.foro.listar({ limite: 7, cursor: p1.cursor, instantanea: p1.instantanea });
    comprobar('el hilo nuevo no se cuela en la página siguiente',
      !p2.hilos.some((h) => h.titulo.startsWith('Llega uno')));
    igual('…y se anuncia aparte', app5.foro.nuevosDesde(p1.instantanea), 1);

    /* Filtro por etiqueta, que es el otro camino de la lista. */
    const soloRuta = app5.foro.listar({ etiqueta: 'ruta', limite: 50 });
    comprobar('el filtro por etiqueta solo trae la suya',
      soloRuta.hilos.every((h) => h.etiqueta === 'ruta') && soloRuta.hilos.length > 0);

    /* Orden por votos: el más votado, primero. */
    const todos = app5.foro.listar({ limite: 50 }).hilos;
    app5.foro.votar('hilo', todos[10].id, 1, 'alguien');
    app5.foro.votar('hilo', todos[10].id, 1, 'otra');
    const votados = app5.foro.listar({ orden: 'votados', limite: 5 }).hilos;
    igual('el más votado va primero', votados[0].id, todos[10].id);

    /* «Sin responder» saca arriba a quien nadie contestó. */
    app5.foro.crearComentario({ sesion: 'x', hilo: todos[0].id, texto: 'Te leo.' });
    const solas = app5.foro.listar({ orden: 'solas', limite: 50 }).hilos;
    igual('el contestado se va al final', solas[solas.length - 1].id, todos[0].id);
    await app5.cerrar();
  }

  bloque('foro · moderación, reportes y borrado');
  olvidarCubos();
  {
    const app6 = crearServidor({ base: ':memory:', registrar: false });

    /* Las señales del proyecto: un plazo médico inventado no se publica
       de golpe, va a revisión. */
    const conPlazo = app6.foro.crearHilo({
      sesion: 'a', titulo: 'Lo que me dijeron en la ventanilla',
      cuerpo: 'Me dijeron que tienes 72 horas para todo y ya está.', etiqueta: 'ruta' });
    igual('un plazo médico sin fuente va a revisión', conPlazo.estado, 'revision');
    comprobar('y se dice por qué', conPlazo.razones.includes('plazo'));

    const conTelefono = app6.foro.crearComentario({
      sesion: 'a', hilo: conPlazo.id, texto: 'Llama al 320 456 7890 que ahí atienden.' });
    igual('un teléfono sin verificar va a revisión', conTelefono.estado, 'revision');

    /* Quien lo escribió LO SIGUE VIENDO. Es la diferencia entre moderar
       y hacer sentir a alguien que se le calló. */
    const suyo = app6.foro.listar({ sesion: 'a', limite: 10 }).hilos;
    comprobar('quien lo escribió ve su hilo en revisión', suyo.some((h) => h.id === conPlazo.id));
    const ajeno = app6.foro.listar({ sesion: 'b', limite: 10 }).hilos;
    comprobar('los demás no lo ven', !ajeno.some((h) => h.id === conPlazo.id));

    /* Reportes: al tercero, se esconde. */
    const limpio = app6.foro.crearHilo({
      sesion: 'c', titulo: 'Un hilo que va a ser reportado', cuerpo: 'Texto.', etiqueta: 'cuidados' });
    igual('nace visible', limpio.estado, 'visible');
    app6.foro.reportar('hilo', limpio.id, 'no va', 'r1');
    app6.foro.reportar('hilo', limpio.id, 'no va', 'r1');    // el mismo, otra vez
    igual('el mismo reporte dos veces no cuenta dos',
      app6.acceso.uno('SELECT reportes FROM hilos WHERE id = ?', limpio.id).reportes, 1);
    app6.foro.reportar('hilo', limpio.id, 'no va', 'r2');
    const tercero = app6.foro.reportar('hilo', limpio.id, 'no va', 'r3');
    igual('al tercer reporte se esconde', tercero.oculto, true);
    comprobar('y sale de la lista', !app6.foro.listar({ limite: 50 }).hilos.some((h) => h.id === limpio.id));

    /* La moderación lo devuelve. */
    const cola = app6.foro.cola();
    comprobar('está en la cola', cola.hilos.some((h) => h.id === limpio.id));
    app6.foro.moderar('hilo', limpio.id, 'visible');
    comprobar('moderar lo devuelve a la lista',
      app6.foro.listar({ limite: 50 }).hilos.some((h) => h.id === limpio.id));

    /* Borrar lo propio: con la sesión y con la llave. */
    const mio = app6.foro.crearHilo({ sesion: 'd', titulo: 'Esto lo voy a borrar luego', cuerpo: 'Texto.', etiqueta: 'ruta' });
    let salio = null;
    try { app6.foro.borrar('hilo', mio.id, 'otra-persona', ''); } catch (e) { salio = e.codigo; }
    igual('otra persona no puede borrarlo', salio, 403);
    app6.foro.borrar('hilo', mio.id, 'd', '');
    comprobar('quien lo escribió sí', !app6.foro.listar({ limite: 50 }).hilos.some((h) => h.id === mio.id));
    igual('y el texto se vacía en el acto',
      app6.acceso.uno('SELECT cuerpo FROM hilos WHERE id = ?', mio.id).cuerpo, '');

    const conLlave = app6.foro.crearHilo({ sesion: 'e', titulo: 'Este se borra con la llave', cuerpo: 'Texto.', etiqueta: 'ruta' });
    let malaLlave = null;
    try { app6.foro.borrar('hilo', conLlave.id, '', 'k7m2-p4q9-r3t8'); } catch (e) { malaLlave = e.codigo; }
    igual('una llave que no es, no borra', malaLlave, 403);
    app6.foro.borrar('hilo', conLlave.id, '', conLlave.llave);
    comprobar('la llave correcta borra sin sesión',
      !app6.foro.listar({ limite: 50 }).hilos.some((h) => h.id === conLlave.id));

    /* Borrar un comentario descuenta la respuesta del hilo. */
    const hh = app6.foro.crearHilo({ sesion: 'f', titulo: 'Un hilo con una respuesta sola', cuerpo: 'T.', etiqueta: 'ruta' });
    const cc = app6.foro.crearComentario({ sesion: 'g', hilo: hh.id, texto: 'Aquí estoy.' });
    igual('la respuesta cuenta', app6.foro.hilo(hh.id).respuestas, 1);
    app6.foro.borrar('comentario', cc.id, 'g', '');
    igual('al borrarla, deja de contar', app6.foro.hilo(hh.id).respuestas, 0);
    await app6.cerrar();
  }

  bloque('foro · la moderación por HTTP necesita llave');
  olvidarCubos();
  {
    const c = cliente(); await c.entrar();
    const sinLlave = await c.get('/api/moderacion/cola');
    igual('sin llave, la puerta ni existe', sinLlave.estado, 404);
  }

  bloque('límites · el cubo');
  olvidarCubos();
  {
    const c = cliente(); await c.entrar();
    const cuerpo = { titulo: 'Un título suficientemente largo', cuerpo: 'Texto.', etiqueta: 'ruta' };
    const r1 = await c.post('/api/hilos', cuerpo);
    const r2 = await c.post('/api/hilos', cuerpo);
    const r3 = await c.post('/api/hilos', cuerpo);
    igual('los dos primeros pasan', [r1.estado, r2.estado].join(), '201,201');
    igual('el tercero seguido → 429', r3.estado, 429);
    comprobar('y dice cuánto esperar', Number(r3.cabeceras.get('retry-after')) > 0,
      r3.cabeceras.get('retry-after'));
  }

  bloque('seguridad · lo que no puede pasar');
  olvidarCubos();
  {
    const c = cliente(); await c.entrar();

    /* El texto se guarda tal cual y se devuelve tal cual: ni escapado ni
       interpretado. La frontera es el cliente, y está documentada. */
    const bicho = '<img src=x onerror=alert(1)> & "comillas"';
    const r = await c.post('/api/hilos', {
      titulo: 'Un hilo con caracteres raros dentro', cuerpo: bicho, etiqueta: 'ruta' });
    igual('el texto vuelve intacto, sin escapar dos veces', r.datos.hilo.cuerpo[0], bicho);

    /* Caracteres invisibles fuera. */
    const raro = await c.post('/api/hilos', {
      titulo: 'Titulo con basura invisible dentro' + String.fromCharCode(0x202E),
      cuerpo: 'Cuerpo' + String.fromCharCode(0x200B) + 'limpio', etiqueta: 'ruta' });
    comprobar('las marcas de dirección se quitan',
      !raro.datos.hilo?.titulo.includes(String.fromCharCode(0x202E)));

    /* Un cuerpo enorme no entra. Con sesión nueva: la anterior ya gastó
       su turno de publicar con los dos hilos de arriba, y lo que se
       quiere medir aquí es la validación, no el cubo. */
    const d = cliente(); await d.entrar();
    const grande = await d.post('/api/hilos', {
      titulo: 'Un hilo demasiado largo para caber', cuerpo: 'x'.repeat(5000), etiqueta: 'ruta' });
    igual('el cuerpo tiene techo', grande.estado, 422);

    /* Un JSON roto no tumba nada. */
    const roto = await fetch(URL_BASE + '/api/hilos', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Galene-Sesion': d.token },
      body: '{esto no es json',
    });
    igual('JSON roto → 400', roto.status, 400);

    /* CORS: un origen que no está en la lista no recibe permiso. */
    const fuera = await fetch(URL_BASE + '/api/estado', { headers: { Origin: 'https://sitio-cualquiera.example' } });
    igual('un origen ajeno no recibe permiso CORS', fuera.headers.get('access-control-allow-origin'), null);
    const dentro = await fetch(URL_BASE + '/api/estado', { headers: { Origin: config.origenes[0] } });
    igual('el origen del sitio sí', dentro.headers.get('access-control-allow-origin'), config.origenes[0]);

    /* Y un WebSocket desde un origen ajeno tampoco entra: el socket no
       tiene CORS, así que si esto no se comprueba, no lo comprueba nadie. */
    const wsMalo = new WebSocket(URL_WS, { origin: 'https://sitio-cualquiera.example' });
    const resultado = await new Promise((r) => {
      wsMalo.on('open', () => r('abierto'));
      wsMalo.on('error', () => r('rechazado'));
    });
    igual('WebSocket desde otro origen → rechazado', resultado, 'rechazado');
  }
} catch (e) {
  mal++;
  fallos.push('EXCEPCIÓN: ' + (e?.stack || e));
  console.error('\n  ✗ excepción durante las pruebas:\n', e);
} finally {
  await app.cerrar();
}

console.log(`\n${'═'.repeat(62)}`);
console.log(`  ${ok} bien · ${mal} mal`);
if (mal) {
  console.log('\n  Lo que falló:');
  for (const f of fallos) console.log('   · ' + f);
}
console.log('');
process.exit(mal ? 1 : 0);
