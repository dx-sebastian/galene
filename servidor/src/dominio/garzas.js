/* ═══════════════════════════════════════════════════════════════════
   dominio/garzas.js — LA BANDADA COMPARTIDA.

   Lo que se pidió, en una frase: cada quien que entra deja una garza en
   el manglar; caben diez; al tocarla se le pinta el pico del color que
   se quiera; la undécima desaloja a la más antigua.

   ── POR QUÉ LO REPARTE EL SERVIDOR Y NO EL NAVEGADOR ──────────────
   Hoy la bandada la sortea cada pestaña: pose, percha, tamaño y hacia
   dónde mira salen de `Math.random()` en `poblarBandada()`. Eso está
   bien para un adorno, y deja de estarlo en el momento en que las
   garzas son PERSONAS: si el sorteo es local, dos visitantes mirando el
   mismo árbol ven dos árboles distintos, y el argumento entero del
   sitio —«esas garzas son de otras que entraron antes»— es mentira.

   Así que la geometría la manda el servidor. El navegador ya no sortea:
   pinta lo que le dicen. Lo que sigue siendo suyo es el TIEMPO —el
   balanceo, los gestos, quién se remueve y cuándo—, que es lo que hace
   que un dormidero parezca vivo y no necesita que nadie se ponga de
   acuerdo.

   ── LA PERCHA ES ÚNICA, Y LO GARANTIZA LA BASE ────────────────────
   Once perchas medidas sobre la lámina del manglar y diez garzas como
   mucho: siempre sobra sitio. Aun así, el índice único parcial existe
   porque dos peticiones simultáneas pueden elegir la misma rama libre
   entre el SELECT y el INSERT. La base dice que no; el código reintenta.

   El número de ramas vive en `config.garzas.perchas` y TIENE que
   coincidir con `PERCHAS.length` de `src/js/main.js`. Ver la nota de
   config.js: el comentario del sitio dice doce y el array tiene once.
   ═══════════════════════════════════════════════════════════════════ */

import { randomBytes } from 'node:crypto';
import { config } from '../config.js';
import { azarDe } from '../nucleo/identidad.js';
import { alto } from '../nucleo/validar.js';

const nuevoId = () => randomBytes(8).toString('hex');

/* La pose sale de un sorteo PONDERADO con los pesos del dormidero de
   verdad: muchas ahuecadas y a la pata coja, alguna alerta, y casi
   ninguna con las alas abiertas —una pose de gesto congelada para
   siempre delata que debajo hay una lámina. Los mismos pesos que ya usa
   `QUIETAS` en main.js, para que el árbol siga leyéndose igual. */
function poseDe(semilla) {
  const { poses, pesosPose } = config.garzas;
  const total = pesosPose.reduce((s, p) => s + p, 0);
  let r = azarDe(semilla, 7) * total;
  for (let i = 0; i < poses.length; i++) {
    r -= pesosPose[i];
    if (r <= 0) return poses[i];
  }
  return poses[0];
}

export function crearGarzas(acceso, avisar = () => {}) {
  const aFuera = (g) => ({
    id: g.id,
    percha: g.percha,
    pose: g.pose,
    mira: g.mira,
    escala: Number(g.escala.toFixed(3)),
    pico: g.pico || null,
    llegada: g.llegada,
    tocada: g.tocada || null,
  });

  const vivas = () =>
    acceso.todos('SELECT * FROM garzas WHERE viva = 1 ORDER BY llegada ASC').map(aFuera);

  /* Deja la garza de esta sesión. Es IDEMPOTENTE: entrar dos veces con
     el mismo token no puebla el árbol de clones, devuelve la que ya
     había. Eso importa más de lo que parece — un `useEffect` que corre
     dos veces en desarrollo es la forma más común de llenar una tabla
     de duplicados. */
  const dejar = acceso.tx((sesion) => {
    const previa = acceso.uno('SELECT * FROM garzas WHERE sesion = ?', sesion);
    if (previa) {
      /* Ya voló. No se le da otra: si se le diera, desalojaría a la más
         antigua, esa persona pediría la suya, y dos pestañas abiertas se
         echarían la una a la otra sin parar. */
      if (!previa.viva) return { garza: null, seFue: true, desalojada: null };
      return { garza: aFuera(previa), nueva: false, desalojada: null };
    }

    /* ¿Sobra sitio? Si no, vuela la más antigua. `<=` y no `<` porque la
       que vamos a meter cuenta: con diez vivas y máximo diez, hay que
       sacar una ANTES de entrar. */
    let desalojada = null;
    const cuantas = acceso.uno('SELECT COUNT(*) AS n FROM garzas WHERE viva = 1').n;
    if (cuantas >= config.garzas.max) {
      const antigua = acceso.uno(
        'SELECT * FROM garzas WHERE viva = 1 ORDER BY llegada ASC, id ASC LIMIT 1');
      if (antigua) {
        acceso.correr('UPDATE garzas SET viva = 0, partida = ? WHERE id = ?', Date.now(), antigua.id);
        desalojada = antigua.id;
      }
    }

    /* Una rama libre, al azar entre las libres. Al azar y no «la
       primera»: si siempre entrara por la de más a la izquierda, el
       árbol se llenaría en orden y se notaría que hay una cola. */
    const ocupadas = new Set(acceso.todos('SELECT percha FROM garzas WHERE viva = 1').map((f) => f.percha));
    const libres = [];
    for (let i = 0; i < config.garzas.perchas; i++) if (!ocupadas.has(i)) libres.push(i);
    if (!libres.length) alto(503, 'El manglar está lleno ahora mismo. Vuelve en un momento.');
    const percha = libres[Math.floor(Math.random() * libres.length)];

    const id = nuevoId();
    const g = {
      id,
      percha,
      pose: poseDe(id),
      mira: azarDe(id, 2) < 0.45 ? -1 : 1,
      escala: config.garzas.escalaMin +
              azarDe(id, 3) * (config.garzas.escalaMax - config.garzas.escalaMin),
      pico: null,
      sesion,
      llegada: Date.now(),
      tocada: null,
      quien: null,
    };
    acceso.correr(
      'INSERT INTO garzas(id, percha, pose, mira, escala, pico, sesion, llegada, viva) ' +
      'VALUES(?, ?, ?, ?, ?, NULL, ?, ?, 1)',
      g.id, g.percha, g.pose, g.mira, g.escala, g.sesion, g.llegada);

    return { garza: aFuera(g), nueva: true, desalojada };
  });

  return {
    vivas,
    cuantas: () => acceso.uno('SELECT COUNT(*) AS n FROM garzas WHERE viva = 1').n,

    dejar(sesion) {
      let r;
      try {
        r = dejar(sesion);
      } catch (e) {
        /* Dos personas eligiendo la misma rama libre en el mismo
           milisegundo. La base lo impide; aquí se reintenta una vez, que
           es todo lo que hace falta con doce ramas y diez garzas. */
        if (String(e.message || '').includes('UNIQUE')) r = dejar(sesion);
        else throw e;
      }
      if (r.desalojada) avisar({ t: 'garza-vuela', id: r.desalojada });
      if (r.nueva && r.garza) avisar({ t: 'garza-llega', garza: r.garza });
      return r;
    },

    /* ── EL PICO ────────────────────────────────────────────────────
       Se toca una garza y se le pinta el pico. Por defecto CUALQUIERA
       puede pintarle el pico a CUALQUIERA (`GALENE_PICO_AJENO=1`), y esa
       es una decisión, no un descuido: la bandada es de todos, tocar la
       garza de otra persona es la única cosa de este sitio en la que dos
       desconocidas se dejan algo la una a la otra, y no hay nada que
       robar —lo peor que puede pasar es un pico de un color feo, y se
       vuelve a tocar.

       Quien prefiera lo contrario pone la perilla a 0 y solo se pinta la
       propia. */
    pintar(id, color, sesion) {
      const g = acceso.uno('SELECT * FROM garzas WHERE id = ?', id);
      if (!g || !g.viva) alto(404, 'Esa garza ya no está en el árbol.');
      if (!config.garzas.picoAjeno && g.sesion !== sesion) {
        alto(403, 'Solo puedes pintarle el pico a la tuya.');
      }
      const ahora = Date.now();
      acceso.correr('UPDATE garzas SET pico = ?, tocada = ?, quien = ? WHERE id = ?',
        color, ahora, sesion, id);
      const salida = { ...aFuera(g), pico: color, tocada: ahora };
      avisar({ t: 'pico', id, pico: color });
      return salida;
    },

    mia: (sesion) => {
      const g = acceso.uno('SELECT * FROM garzas WHERE sesion = ? AND viva = 1', sesion);
      return g ? aFuera(g) : null;
    },
  };
}
