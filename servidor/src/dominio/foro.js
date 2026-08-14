/* ═══════════════════════════════════════════════════════════════════
   dominio/foro.js — LA COMUNIDAD, YA SIN DATOS QUEMADOS.

   Sustituye entero a `src/datos/comunidad.js`, que llevaba escrito en su
   propia cabecera que TODO lo suyo era inventado. Lo que sale de aquí lo
   escribió alguien.

   ── PAGINACIÓN POR CLAVE, NO POR OFFSET ───────────────────────────
   El scroll infinito con `LIMIT 12 OFFSET 24` tiene un fallo que no se
   ve hasta que hay gente: si mientras alguien lee llega un hilo nuevo,
   TODO se corre una posición, y la página siguiente empieza por el
   último hilo de la anterior. Se lee un hilo dos veces y otro no se lee
   nunca. Con clave —«dame lo que va después de ESTE»— eso no puede
   pasar, y además no cuesta más caro cuanto más abajo se baja: la
   consulta entra por el índice, no cuenta filas para saltárselas.

   Y encima va una INSTANTÁNEA: la primera página fija un instante y las
   siguientes solo miran hilos anteriores a él. Lo que llegue mientras se
   lee no se cuela en mitad de la lista; se anuncia aparte, y quien
   quiera lo pide. Una lista que se reordena sola debajo del dedo se lee
   como un fallo del sitio.

   ── SIN TARJETAS DE RESUMEN ───────────────────────────────────────
   Se pidió que se lea cómodo, sin resúmenes. Eso empieza aquí: la
   lista NO devuelve un extracto, devuelve el CUERPO ENTERO en párrafos,
   y opcionalmente los primeros comentarios. El frontend no tiene que ir
   a buscar nada para pintar una columna que se lee de arriba abajo.
   Por eso la página trae doce hilos y no cuarenta.
   ═══════════════════════════════════════════════════════════════════ */

import { randomBytes } from 'node:crypto';
import { config } from '../config.js';
import { alto, texto, unaLinea, deLista, entero, estadoInicial } from '../nucleo/validar.js';
import { selloDe, nuevaLlave, hashLlave, llaveCoincide } from '../nucleo/identidad.js';

const nuevoId = () => randomBytes(9).toString('base64url');
const OBJETOS = ['hilo', 'comentario'];

/* ── El cursor ─────────────────────────────────────────────────────
   Opaco a propósito: es un detalle de implementación y nadie de fuera
   debería construir uno a mano. Si mañana el orden lleva cuatro claves
   en vez de tres, ningún cliente se entera. */
const aCursor = (partes) => Buffer.from(JSON.stringify(partes), 'utf8').toString('base64url');
function deCursor(s) {
  if (!s) return null;
  try {
    const v = JSON.parse(Buffer.from(String(s), 'base64url').toString('utf8'));
    return Array.isArray(v) ? v : null;
  } catch { return null; }
}

/* ── El tiempo, dicho en voz alta ──────────────────────────────────
   Va el instante EXACTO (epoch ms) y además la frase hecha. El instante
   es lo que ordena y lo que el navegador puede volver a formatear en la
   zona horaria de quien mira; la frase es para que un render sin
   JavaScript —o un cliente tonto— tenga algo que enseñar. Los datos de
   ejemplo tenían solo la frase, y por eso no se podían ordenar. */
export function cuandoTexto(ms, ahora = Date.now()) {
  const s = Math.max(0, Math.round((ahora - ms) / 1000));
  if (s < 90) return 'hace un momento';
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return h === 1 ? 'hace 1 h' : `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return 'ayer';
  if (d < 7) return `hace ${d} días`;
  const sem = Math.round(d / 7);
  return sem === 1 ? 'hace una semana' : `hace ${sem} semanas`;
}

export function crearForo(acceso, avisar = () => {}) {
  const etiquetas = config.foro.etiquetas;
  const idsEtiqueta = etiquetas.map((e) => e.id);

  /* ── QUÉ SE VE ──────────────────────────────────────────────────
     Lo visible, más lo propio que está esperando revisión. Esto último
     no es un detalle: alguien que escribe a las cuatro de la mañana y
     ve su mensaje desaparecer sin explicación entiende que se le calló.
     Lo ve, con su aviso, y sabe que está en camino. */
  const filtroVisible = (alias, sesion) =>
    sesion
      ? `(${alias}.estado = 'visible' OR (${alias}.estado = 'revision' AND ${alias}.sesion = ?))`
      : `${alias}.estado = 'visible'`;
  const parametroVisible = (sesion) => (sesion ? [sesion] : []);

  const parrafos = (s) => s.split('\n\n').map((p) => p.trim()).filter(Boolean);

  function autorDe(fila, sesion) {
    return {
      nombre: fila.autora,
      anonima: !!fila.anonima,
      pose: fila.pose,
      mira: fila.mira,
      esMia: !!sesion && fila.sesion === sesion,
    };
  }

  function hiloAFuera(f, sesion, ahora) {
    return {
      id: f.id,
      etiqueta: f.etiqueta,
      titulo: f.estado === 'borrado' ? '' : f.titulo,
      cuerpo: f.estado === 'borrado' ? [] : parrafos(f.cuerpo),
      autora: autorDe(f, sesion),
      creado: f.creado,
      cuando: cuandoTexto(f.creado, ahora),
      minutos: Math.round((ahora - f.creado) / 60000),
      votos: f.votos,
      respuestas: f.respuestas,
      miVoto: f.miVoto ?? 0,
      estado: f.estado,
      ejemplo: !!f.ejemplo,
    };
  }

  function comentarioAFuera(f, sesion, ahora) {
    return {
      id: f.id,
      hilo: f.hilo,
      padre: f.padre || null,
      texto: f.estado === 'borrado' ? '' : f.texto,
      autora: autorDe(f, sesion),
      creado: f.creado,
      cuando: cuandoTexto(f.creado, ahora),
      votos: f.votos,
      miVoto: f.miVoto ?? 0,
      estado: f.estado,
      ejemplo: !!f.ejemplo,
      respuestas: [],
    };
  }

  /* El voto propio se trae con un LEFT JOIN y no con una segunda vuelta
     por cada fila: doce hilos serían doce consultas más, y en la página
     de un hilo con sus comentarios, cincuenta. */
  const selectHilo = (sesion) => sesion
    ? `SELECT h.*, v.dir AS miVoto FROM hilos h
       LEFT JOIN votos v ON v.objeto = 'hilo' AND v.cosa = h.id AND v.sesion = ?`
    : 'SELECT h.*, 0 AS miVoto FROM hilos h';

  /* ═══ LISTAR ══════════════════════════════════════════════════════ */
  function listar({ orden = 'recientes', etiqueta = '', cursor = '', limite, instantanea, sesion = '', conComentarios = 0 } = {}) {
    orden = ['recientes', 'votados', 'solas'].includes(orden) ? orden : 'recientes';
    const n = entero(limite, 1, config.foro.limitePaginaMax, config.foro.limitePagina);
    const ahora = Date.now();
    const inst = entero(instantanea, 0, 8.64e15, 0) || ahora;

    const donde = [];
    const params = [];
    if (sesion) params.push(sesion);              // el del LEFT JOIN, va primero

    donde.push(filtroVisible('h', sesion));
    params.push(...parametroVisible(sesion));

    donde.push('h.creado <= ?');
    params.push(inst);

    if (etiqueta) {
      deLista(etiqueta, idsEtiqueta, 'etiqueta');
      donde.push('h.etiqueta = ?');
      params.push(etiqueta);
    }

    const c = deCursor(cursor);
    let ordenSql;
    if (orden === 'recientes') {
      ordenSql = 'h.creado DESC, h.id DESC';
      if (c) {
        donde.push('(h.creado < ? OR (h.creado = ? AND h.id < ?))');
        params.push(c[0], c[0], c[1]);
      }
    } else if (orden === 'votados') {
      ordenSql = 'h.votos DESC, h.creado DESC, h.id DESC';
      if (c) {
        donde.push('(h.votos < ? OR (h.votos = ? AND (h.creado < ? OR (h.creado = ? AND h.id < ?))))');
        params.push(c[0], c[0], c[1], c[1], c[2]);
      }
    } else {
      /* «Sin responder» primero, y entre las que empatan, la que lleva
         menos rato esperando: entre dos hilos que nadie ha contestado,
         al que todavía se alcanza es al de hace veinte minutos. */
      ordenSql = 'h.respuestas ASC, h.creado DESC, h.id DESC';
      if (c) {
        donde.push('(h.respuestas > ? OR (h.respuestas = ? AND (h.creado < ? OR (h.creado = ? AND h.id < ?))))');
        params.push(c[0], c[0], c[1], c[1], c[2]);
      }
    }

    /* Se piden n+1 para saber si hay más SIN hacer un COUNT aparte. */
    const filas = acceso.todos(
      `${selectHilo(sesion)} WHERE ${donde.join(' AND ')} ORDER BY ${ordenSql} LIMIT ?`,
      ...params, n + 1);

    const hay = filas.length > n;
    const pagina = filas.slice(0, n).map((f) => hiloAFuera(f, sesion, ahora));

    let siguiente = null;
    if (hay && pagina.length) {
      const u = filas[n - 1];
      siguiente = aCursor(orden === 'recientes' ? [u.creado, u.id]
        : orden === 'votados' ? [u.votos, u.creado, u.id]
          : [u.respuestas, u.creado, u.id]);
    }

    if (conComentarios > 0 && pagina.length) {
      const cuantos = entero(conComentarios, 1, 10, 3);
      for (const h of pagina) {
        h.primeros = comentarios(h.id, { limite: cuantos, sesion, conRespuestas: false }).comentarios;
      }
    }

    return { hilos: pagina, cursor: siguiente, instantanea: inst, orden, etiqueta: etiqueta || null };
  }

  /* Cuántos han llegado por encima de la instantánea. Es lo que permite
     la pastilla de «2 hilos nuevos» sin reordenar nada bajo el dedo. */
  function nuevosDesde(instantanea, etiqueta = '') {
    const inst = entero(instantanea, 0, 8.64e15, 0);
    if (!inst) return 0;
    const cond = etiqueta ? ' AND etiqueta = ?' : '';
    const p = etiqueta ? [inst, etiqueta] : [inst];
    return acceso.uno(
      `SELECT COUNT(*) AS n FROM hilos WHERE estado = 'visible' AND creado > ?${cond}`, ...p).n;
  }

  /* ═══ UN HILO ═════════════════════════════════════════════════════ */
  function hilo(id, sesion = '') {
    const params = sesion ? [sesion, id, sesion] : [id];
    const f = acceso.uno(
      `${selectHilo(sesion)} WHERE h.id = ? AND ${filtroVisible('h', sesion)}`, ...params);
    if (!f) alto(404, 'Ese hilo ya no está.');
    return hiloAFuera(f, sesion, Date.now());
  }

  /* ═══ COMENTARIOS ═════════════════════════════════════════════════
     Dos niveles y se acaba, como en el sitio. Se traen las raíces
     paginadas y luego TODAS las respuestas de esas raíces en UNA sola
     consulta —no una por comentario, que es el problema N+1 clásico y
     en un hilo con treinta comentarios son treinta viajes. */
  function comentarios(hiloId, { cursor = '', limite, sesion = '', conRespuestas = true } = {}) {
    const n = entero(limite, 1, 60, 20);
    const ahora = Date.now();

    const params = [];
    if (sesion) params.push(sesion);
    const donde = ['c.hilo = ?', 'c.padre IS NULL', filtroVisible('c', sesion)];
    params.push(hiloId, ...parametroVisible(sesion));

    const c = deCursor(cursor);
    if (c) { donde.push('(c.creado > ? OR (c.creado = ? AND c.id > ?))'); params.push(c[0], c[0], c[1]); }

    const sel = sesion
      ? `SELECT c.*, v.dir AS miVoto FROM comentarios c
         LEFT JOIN votos v ON v.objeto = 'comentario' AND v.cosa = c.id AND v.sesion = ?`
      : 'SELECT c.*, 0 AS miVoto FROM comentarios c';

    const filas = acceso.todos(
      `${sel} WHERE ${donde.join(' AND ')} ORDER BY c.creado ASC, c.id ASC LIMIT ?`,
      ...params, n + 1);

    const hay = filas.length > n;
    const raices = filas.slice(0, n).map((f) => comentarioAFuera(f, sesion, ahora));
    const siguiente = hay && raices.length ? aCursor([filas[n - 1].creado, filas[n - 1].id]) : null;

    if (conRespuestas && raices.length) {
      const huecos = raices.map(() => '?').join(',');
      const p2 = [];
      if (sesion) p2.push(sesion);
      p2.push(...raices.map((r) => r.id), ...parametroVisible(sesion));
      const hijas = acceso.todos(
        `${sel} WHERE c.padre IN (${huecos}) AND ${filtroVisible('c', sesion)}
         ORDER BY c.creado ASC, c.id ASC`, ...p2);
      const porPadre = new Map(raices.map((r) => [r.id, r]));
      for (const h of hijas) porPadre.get(h.padre)?.respuestas.push(comentarioAFuera(h, sesion, ahora));
    }

    return { comentarios: raices, cursor: siguiente };
  }

  /* ═══ ESCRIBIR ════════════════════════════════════════════════════ */
  const crearHilo = acceso.tx(({ sesion, titulo, cuerpo, etiqueta, nombre, anonima }) => {
    const t = unaLinea(titulo, config.foro.tituloMax, 'título');
    if ([...t].length < config.foro.tituloMin) {
      alto(422, `El título necesita al menos ${config.foro.tituloMin} caracteres.`, 'titulo');
    }
    const cu = texto(cuerpo, config.foro.cuerpoMin, config.foro.cuerpoMax, 'cuerpo');
    const et = deLista(etiqueta, idsEtiqueta, 'etiqueta');

    /* «Anónima» es el valor por defecto, y el nombre es OPCIONAL y de
       agua, no de persona: lo dice la casa en la propia página. No se
       comprueba que sea único —no hay cuentas, así que no hay nada que
       usurpar— y no se guarda ninguna relación entre el nombre y quien
       lo escribió más allá del hash de la sesión. */
    const anon = anonima === undefined ? !nombre : !!anonima;
    const quien = anon ? 'Anónima' : (unaLinea(nombre, config.foro.nombreMax, 'nombre') || 'Anónima');

    const { estado, razones } = estadoInicial(t + '\n' + cu);
    const sello = selloDe(sesion);
    const id = nuevoId();
    const llave = nuevaLlave();
    const ahora = Date.now();

    acceso.correr(
      `INSERT INTO hilos(id, etiqueta, titulo, cuerpo, autora, anonima, pose, mira,
        sesion, borrado, creado, ultima, estado)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      id, et, t, cu, quien, anon ? 1 : 0, sello.pose, sello.mira,
      sesion, hashLlave(llave), ahora, ahora, estado);

    return { id, estado, razones, llave };
  });

  const crearComentario = acceso.tx(({ sesion, hilo: hiloId, padre, texto: cuerpo, nombre, anonima }) => {
    const h = acceso.uno('SELECT id, estado FROM hilos WHERE id = ?', hiloId);
    if (!h || h.estado === 'borrado' || h.estado === 'oculto') alto(404, 'Ese hilo ya no está.');

    let padreId = null;
    if (padre) {
      const p = acceso.uno('SELECT id, hilo, padre FROM comentarios WHERE id = ?', padre);
      if (!p || p.hilo !== hiloId) alto(404, 'No existe el comentario al que respondes.');
      /* DOS NIVELES Y SE ACABA. Responder a una respuesta cuelga del
         MISMO padre, no de un tercer nivel: en un móvil, tres sangrías
         dejan una columna de seis palabras. Se conserva la conversación
         y se pierde la escalera. */
      padreId = p.padre || p.id;
    }

    const txt = texto(cuerpo, config.foro.comentarioMin, config.foro.comentarioMax, 'texto');
    const anon = anonima === undefined ? !nombre : !!anonima;
    const quien = anon ? 'Anónima' : (unaLinea(nombre, config.foro.nombreMax, 'nombre') || 'Anónima');
    const { estado, razones } = estadoInicial(txt);
    const sello = selloDe(sesion);
    const id = nuevoId();
    const llave = nuevaLlave();
    const ahora = Date.now();

    acceso.correr(
      `INSERT INTO comentarios(id, hilo, padre, texto, autora, anonima, pose, mira,
        sesion, borrado, creado, estado)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
      id, hiloId, padreId, txt, quien, anon ? 1 : 0, sello.pose, sello.mira,
      sesion, hashLlave(llave), ahora, estado);

    /* La cuenta de respuestas solo sube con lo que se VE. Un comentario
       en revisión que ya contara haría que «sin responder» dejara de
       sacar arriba un hilo al que, de hecho, nadie ha contestado. */
    if (estado === 'visible') {
      acceso.correr('UPDATE hilos SET respuestas = respuestas + 1, ultima = ? WHERE id = ?', ahora, hiloId);
    }
    return { id, estado, razones, llave, padre: padreId };
  });

  /* ═══ VOTAR ═══════════════════════════════════════════════════════
     La aritmética de Reddit, la misma que ya hacía el navegador solo:
     pulsar lo puesto lo quita, y saltar de arriba a abajo son dos
     puntos. La diferencia es que ahora el marcador es de verdad.

     La clave primaria (objeto, cosa, sesión) ES la regla de «un voto por
     persona»: no hay que comprobarla, la base no deja otra cosa. */
  const votar = acceso.tx((objeto, cosa, dir, sesion) => {
    deLista(objeto, OBJETOS, 'objeto');
    const d = entero(dir, -1, 1, 0);
    const tabla = objeto === 'hilo' ? 'hilos' : 'comentarios';
    const fila = acceso.uno(`SELECT id, votos, estado FROM ${tabla} WHERE id = ?`, cosa);
    if (!fila || fila.estado === 'borrado') alto(404, 'Eso ya no está.');

    const previo = acceso.uno(
      'SELECT dir FROM votos WHERE objeto = ? AND cosa = ? AND sesion = ?', objeto, cosa, sesion)?.dir ?? 0;
    const delta = d - previo;

    if (delta !== 0) {
      if (d === 0) {
        acceso.correr('DELETE FROM votos WHERE objeto = ? AND cosa = ? AND sesion = ?', objeto, cosa, sesion);
      } else {
        acceso.correr(
          'INSERT INTO votos(objeto, cosa, sesion, dir, cuando) VALUES(?,?,?,?,?) ' +
          'ON CONFLICT(objeto, cosa, sesion) DO UPDATE SET dir = excluded.dir, cuando = excluded.cuando',
          objeto, cosa, sesion, d, Date.now());
      }
      acceso.correr(`UPDATE ${tabla} SET votos = votos + ? WHERE id = ?`, delta, cosa);
    }
    return { votos: fila.votos + delta, miVoto: d };
  });

  /* ═══ REPORTAR ════════════════════════════════════════════════════ */
  const reportar = acceso.tx((objeto, cosa, motivo, sesion) => {
    deLista(objeto, OBJETOS, 'objeto');
    const tabla = objeto === 'hilo' ? 'hilos' : 'comentarios';
    const fila = acceso.uno(`SELECT id, estado, reportes FROM ${tabla} WHERE id = ?`, cosa);
    if (!fila) alto(404, 'Eso ya no está.');

    const m = unaLinea(motivo || 'sin motivo', 200, 'motivo');
    const r = acceso.correr(
      'INSERT OR IGNORE INTO reportes(objeto, cosa, sesion, motivo, cuando) VALUES(?,?,?,?,?)',
      objeto, cosa, sesion, m, Date.now());
    if (!r.changes) return { ok: true, repetido: true };

    const cuantos = fila.reportes + 1;
    acceso.correr(`UPDATE ${tabla} SET reportes = ? WHERE id = ?`, cuantos, cosa);

    /* Al llegar al umbral se ESCONDE, no se borra, y entra en la cola.
       Esconder por acumulación es una herramienta que se puede abusar
       —tres cuentas coordinadas callan a cualquiera—, así que lo que
       hace no es definitivo: lo deshace la moderación de un clic. */
    if (cuantos >= config.foro.reportesOcultar && fila.estado === 'visible') {
      acceso.correr(`UPDATE ${tabla} SET estado = 'revision' WHERE id = ?`, cosa);
      if (objeto === 'comentario') {
        acceso.correr(
          'UPDATE hilos SET respuestas = MAX(0, respuestas - 1) WHERE id = (SELECT hilo FROM comentarios WHERE id = ?)', cosa);
      }
      return { ok: true, oculto: true };
    }
    return { ok: true };
  });

  /* ═══ BORRAR ══════════════════════════════════════════════════════
     Quien lo escribió puede quitarlo, y en un sitio como este eso no es
     una comodidad: es parte del trato. Se puede con la sesión —mientras
     dure la pestaña— o con la LLAVE que se devolvió al publicar, que es
     lo que permite deshacer mañana lo que se escribió esta madrugada.

     El texto se vacía EN EL ACTO. La fila se queda un tiempo con su
     estado para que el hilo no se descosa (una respuesta que apunta a un
     comentario que ya no existe), y la purga se la lleva a los N días. */
  const borrar = acceso.tx((objeto, cosa, sesion, llave) => {
    deLista(objeto, OBJETOS, 'objeto');
    const tabla = objeto === 'hilo' ? 'hilos' : 'comentarios';
    const fila = acceso.uno(`SELECT * FROM ${tabla} WHERE id = ?`, cosa);
    if (!fila || fila.estado === 'borrado') alto(404, 'Eso ya no está.');

    const suyo = !!sesion && fila.sesion === sesion;
    if (!suyo && !llaveCoincide(llave || '', fila.borrado)) {
      alto(403, 'Para borrar esto hace falta la llave que se dio al publicarlo.');
    }

    if (objeto === 'hilo') {
      acceso.correr(
        `UPDATE hilos SET estado = 'borrado', titulo = '', cuerpo = '', autora = 'Anónima', borrado = NULL
         WHERE id = ?`, cosa);
    } else {
      acceso.correr(
        `UPDATE comentarios SET estado = 'borrado', texto = '', autora = 'Anónima', borrado = NULL
         WHERE id = ?`, cosa);
      if (fila.estado === 'visible') {
        acceso.correr('UPDATE hilos SET respuestas = MAX(0, respuestas - 1) WHERE id = ?', fila.hilo);
      }
    }
    return { ok: true };
  });

  /* ═══ MODERACIÓN ══════════════════════════════════════════════════ */
  function cola(limite = 50) {
    const n = entero(limite, 1, 200, 50);
    const hilos = acceso.todos(
      `SELECT id, titulo, cuerpo, creado, reportes, estado FROM hilos
       WHERE estado IN ('revision','oculto') ORDER BY creado DESC LIMIT ?`, n);
    const coments = acceso.todos(
      `SELECT id, hilo, texto, creado, reportes, estado FROM comentarios
       WHERE estado IN ('revision','oculto') ORDER BY creado DESC LIMIT ?`, n);
    return { hilos, comentarios: coments };
  }

  const moderar = acceso.tx((objeto, cosa, estado) => {
    deLista(objeto, OBJETOS, 'objeto');
    deLista(estado, ['visible', 'revision', 'oculto'], 'estado');
    const tabla = objeto === 'hilo' ? 'hilos' : 'comentarios';
    const fila = acceso.uno(`SELECT * FROM ${tabla} WHERE id = ?`, cosa);
    if (!fila) alto(404, 'Eso ya no está.');
    if (fila.estado === 'borrado') alto(409, 'Eso lo borró quien lo escribió.');

    acceso.correr(`UPDATE ${tabla} SET estado = ? WHERE id = ?`, estado, cosa);

    /* La cuenta de respuestas sigue al estado: si un comentario vuelve a
       ser visible, el hilo vuelve a tener una respuesta más. Se ajusta
       solo cuando CRUZA la frontera de visible, no en cada cambio. */
    if (objeto === 'comentario') {
      const era = fila.estado === 'visible', es = estado === 'visible';
      if (era !== es) {
        acceso.correr(
          `UPDATE hilos SET respuestas = MAX(0, respuestas + ?) WHERE id = ?`, es ? 1 : -1, fila.hilo);
      }
    }
    return { ok: true, estado };
  });

  return {
    etiquetas: () => etiquetas,
    listar, nuevosDesde, hilo, comentarios,
    crearHilo(datos) {
      const r = crearHilo(datos);
      if (r.estado === 'visible') avisar({ t: 'hilo-nuevo', id: r.id });
      return r;
    },
    crearComentario(datos) {
      const r = crearComentario(datos);
      if (r.estado === 'visible') avisar({ t: 'comentario-nuevo', hilo: datos.hilo, id: r.id });
      return r;
    },
    votar, reportar, borrar, cola, moderar,
  };
}
