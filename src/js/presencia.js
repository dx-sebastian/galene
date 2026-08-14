/* ═══════════════════════════════════════════════════════════════════
   presencia.js — QUIÉN MÁS ESTÁ, AHORA MISMO.

   ── LO PRIMERO, PORQUE CAMBIA CÓMO SE LEE TODO LO DEMÁS ────────────
   Este módulo NO habla con ningún servidor, y no es una fase: es la
   misma decisión que sostiene el resto del sitio (README → Privacidad,
   y la cabecera de js/marcas.js, que explica por qué un mapa
   colaborativo de verdad sería exactamente el archivo que no queremos
   que exista).

   Lo que sí puede saberse sin servidor y sin mentir: **cuántas
   pestañas de este mismo navegador tienen Galene abierto ahora**. Eso
   es `BroadcastChannel`, y tiene tres propiedades que lo hacen
   admisible aquí:

     1 · Es del MISMO ORIGEN y del mismo navegador. Nada sale del
         aparato. No hay red, no hay petición, no hay nada que
         interceptar.
     2 · Es EFÍMERO. No toca el disco. Al cerrar la última pestaña no
         queda rastro de que hubo presencia — el botón de salir sigue
         siendo real.
     3 · Es CIERTO. Lo que se pinta corresponde a sesiones que existen
         de verdad. La regla 3 del proyecto —«no fabricar personas»— no
         se cumple escondiendo que son pocas: se cumple no inventando
         ninguna. Aquí no hay ni una garza de relleno.

   Lo que esto NO es, y conviene tenerlo escrito para quien lo lea
   dentro de un año: no es «cuánta gente ha pasado por Galene». Para eso
   hace falta un servidor que cuente visitas, y contar visitas a un
   sitio sobre sumisión química es construir el registro que la regla 9
   prohíbe. Cuando exista un relevo que no guarde nada —un simple relé
   sin base de datos— entra por `fuente()`, que es la única función que
   habría que tocar: todo lo de arriba ya funciona con lo que le llegue.

   ── LO QUE VIAJA POR EL CANAL, Y NADA MÁS ─────────────────────────
   Un identificador aleatorio que se inventa al cargar y muere con la
   pestaña; si quien mira ha personalizado su garza, el color de pico y
   el índice de una frase de una lista cerrada (nunca texto libre); si
   está sosteniendo el dedo en el agua, y en qué punto del lienzo. Ni
   una palabra escrita por nadie, ni una ubicación, ni una hora, ni nada
   que sobreviva a cerrar.

   Los hilos del foro viajan por otro canal y con sus propias reglas:
   ver js/foro.js.
   ═══════════════════════════════════════════════════════════════════ */

const CANAL = 'galene:presencia';

/* CADA CUÁNTO SE DICE «SIGO AQUÍ» Y CUÁNDO SE DA POR IDA A UNA PESTAÑA.

   El latido es de 2 s y el olvido de 6.5, o sea tres latidos. Con dos
   no basta: el navegador estrangula los temporizadores de una pestaña
   en segundo plano y un solo latido perdido dejaría desaparecer a
   alguien que sigue ahí. Con tres, una garza solo se va cuando de
   verdad se fue — y aun así hay un `adios` explícito en `pagehide`,
   que es lo que hace que la salida sea inmediata en el caso normal. */
const LATIDO = 2000;
const OLVIDO = 6500;

/* `?presencia=off` apaga el módulo entero. Existe para las pruebas —una
   prueba de una sola pestaña no quiere garzas de otras— y para poder
   descartar este módulo si algún día algo se comporta raro. */
const APAGADO = new URLSearchParams(location.search).get('presencia') === 'off';

const nuevoId = () =>
  (crypto.randomUUID?.() ||
   'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8));

/* El identificador NO se guarda en ningún sitio. Se inventa en cada
   carga: dos visitas de la misma persona son dos desconocidas, que es
   justo lo que hay que ser aquí. */
export const YO = nuevoId();

/* Estado propio y de las demás. `otras` es un Map id → ficha. */
const otras = new Map();
let mio = { id: YO, pico: null, frase: null, sostiene: null };
let canal = null;
const oyentes = new Set();

/* ── EL SANEADO, QUE NO ES PARANOIA ────────────────────────────────
   Por el canal solo puede escribir código de este mismo origen, así que
   no hay un atacante remoto al otro lado. Pero sí puede haber una
   pestaña con OTRA VERSIÓN del sitio —alguien que dejó Galene abierto
   antes de un despliegue— mandando un mensaje con la forma de ayer.
   Todo lo que entra se recorta a lo que se sabe pintar: un color de una
   lista cerrada, un índice de frase dentro de rango, un punto dentro
   del lienzo. Lo que no encaje se cae, y la garza sale con su pico de
   siempre en vez de romper el cuadro. */
const limpiarPico = (v) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : null);
const limpiarFrase = (v) => (Number.isInteger(v) && v >= 0 && v < 32 ? v : null);
const limpiarPunto = (v) => {
  if (!v || typeof v !== 'object') return null;
  const x = Number(v.x), y = Number(v.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  /* `q` es alto de pantalla: x llega hasta el aspecto de la ventana, que
     en un monitor ultrapanorámico pasa de 3. Se acota generoso y ya. */
  if (x < -1 || x > 6 || y < 0 || y > 1) return null;
  return { x, y };
};

const fichaLimpia = (m) => ({
  id: String(m.id).slice(0, 64),
  pico: limpiarPico(m.pico),
  frase: limpiarFrase(m.frase),
  sostiene: limpiarPunto(m.sostiene),
  visto: Date.now(),
});

const avisar = () => { for (const fn of oyentes) fn(vivas()); };

/** Las fichas de las OTRAS sesiones vivas, ordenadas por antigüedad de
    llegada para que su reparto de perchas sea estable entre cuadros. */
export function vivas() {
  const corte = Date.now() - OLVIDO;
  const fuera = [];
  for (const [id, f] of otras) if (f.visto < corte) fuera.push(id);
  for (const id of fuera) otras.delete(id);
  return [...otras.values()].sort((a, b) => (a.orden || 0) - (b.orden || 0));
}

/** Cuántas manos AJENAS hay puestas en el agua ahora mismo. */
export function manosAjenas() {
  let n = 0;
  for (const f of vivas()) if (f.sostiene) n++;
  return n;
}

/** Cuántas manos hay puestas en el agua ahora mismo, la propia incluida. */
export const manos = () => manosAjenas() + (mio.sostiene ? 1 : 0);

/** Los toques ajenos, en coordenadas del lienzo (q). Los propios los
    lleva main.js por su cuenta: llevan anillo y edad, y estos no. */
export function toquesAjenos() {
  return vivas().filter((f) => f.sostiene)
    .map((f) => ({ x: f.sostiene.x, y: f.sostiene.y, id: f.id }));
}

function emitir(tipo) {
  if (!canal) return;
  try { canal.postMessage({ t: tipo, ...mio }); } catch { /* canal cerrado */ }
}

/** Publica cómo está esta sesión. Se llama al personalizar la garza y
    al empezar o soltar el gesto de calma; el latido repite lo último. */
export function anunciar(parcial) {
  const antes = JSON.stringify(mio);
  mio = { ...mio, ...parcial, id: YO };
  if (JSON.stringify(mio) !== antes) emitir('late');
}

/** Se llama cuando cambia quién está. Devuelve la baja. */
export function alCambiar(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

/* ── LA FUENTE ─────────────────────────────────────────────────────
   Hoy, un `BroadcastChannel`. Si un día hay relevo sin base de datos,
   se cambia SOLO esta función: todo lo de arriba trabaja con fichas y
   no sabe de dónde vienen.

   Si el navegador no trae `BroadcastChannel` —y hay quien lo tiene
   apagado— el módulo se queda quieto y el sitio se comporta como antes
   de existir: una garza, la de quien mira. Nada se rompe y nada se
   inventa. */
let orden = 0;
function fuente() {
  if (APAGADO || typeof BroadcastChannel === 'undefined') return;
  try { canal = new BroadcastChannel(CANAL); } catch { return; }

  canal.onmessage = (e) => {
    const m = e.data;
    if (!m || typeof m !== 'object' || typeof m.id !== 'string') return;
    if (m.id === YO) return;                       // el eco de una misma

    if (m.t === 'adios') {
      if (otras.delete(m.id)) avisar();
      return;
    }
    if (m.t !== 'hola' && m.t !== 'late') return;

    const previa = otras.get(m.id);
    const ficha = fichaLimpia(m);
    ficha.orden = previa ? previa.orden : ++orden;
    otras.set(m.id, ficha);

    /* A quien acaba de llegar se le contesta enseguida: si no, tardaría
       un latido entero en enterarse de que estamos aquí, y la garza de
       quien ya estaba aparecería con dos segundos de retraso. */
    if (m.t === 'hola') emitir('late');

    /* Sale un aviso siempre que la ficha cambie de forma visible. Un
       latido idéntico no repinta nada. */
    if (!previa || previa.pico !== ficha.pico || previa.frase !== ficha.frase
        || Boolean(previa.sostiene) !== Boolean(ficha.sostiene)
        || (ficha.sostiene && previa.sostiene
            && (previa.sostiene.x !== ficha.sostiene.x
             || previa.sostiene.y !== ficha.sostiene.y))) avisar();
  };

  emitir('hola');
  setInterval(() => { emitir('late'); avisar(); }, LATIDO);

  /* `pagehide` y no `unload`: es el único que dispara de verdad en iOS,
     y además funciona con la caché de atrás-adelante. Al volver a la
     página se vuelve a saludar. */
  addEventListener('pagehide', () => emitir('adios'));
  addEventListener('pageshow', () => emitir('hola'));
}

fuente();

/* Asidero de verificación y de pruebas, con el mismo patrón que el
   resto del sitio. Va SIEMPRE, no solo en desarrollo: las pruebas E2E
   corren contra el sitio compilado y necesitan poder preguntar cuántas
   sesiones ve esta pestaña sin depender de contar garzas en pantalla. */
window.__presencia = { YO, vivas, manos, manosAjenas, toquesAjenos, anunciar, apagado: APAGADO };
