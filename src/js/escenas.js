/* ═══════════════════════════════════════════════════════════════════
   escenas.js — EL TIEMPO DEL DESCENSO.

   Una escena no es un bloque con un efecto: es un sitio de la página
   donde OCURRE algo, con principio y final, y donde el scroll hace de
   reloj. La diferencia con lo que había —cada bloque con una opacidad
   atada a su posición— es la que hay entre un ESTADO y una ESCENA. Un
   estado está; una escena pasa.

   El sitio ya tenía una, y es lo mejor que hay en la página:
   `#pudiste-decidir`. `decidir.js` la recorre pegada durante 300 vh
   escribiendo un solo número, `--avance`, de 0 a 1, y con ese número el
   CSS hace aparecer el «SÍ», lo enciende y lo rompe en jirones. Este
   módulo es esa misma máquina, generalizada: busca `[data-escena]`,
   mide cuánto se ha recorrido y escribe `--avance`. Nada más.

   (decidir.js NO se toca ni se absorbe. Es la escena que ya funciona y
   la que más pesa de la página; reescribirla para ahorrar cuarenta
   líneas sería cambiar riesgo por elegancia. Lo que sí hay que evitar
   es que las dos cuenten el tiempo de forma distinta — por eso la
   fórmula de la escena PEGADA de aquí abajo es literalmente la suya.)

   ── DOS MODOS, Y LA RAZÓN DE QUE HAGAN FALTA LOS DOS ────────────────

   PEGADA (`data-pegada`): la sección mide varias pantallas, la escena
   se queda clavada arriba y el fondo pasa por detrás. Es lo que permite
   que algo dure. Solo se puede usar donde NO hay nada que pulsar: una
   escena pegada con un control dentro es una trampa — quien quiere
   tocarlo lo tiene quieto delante mientras la página sigue bajando.

   AL PASO (por defecto): la sección no se pega, y `--avance` cuenta
   cuánto ha cruzado la pantalla. El gesto ocurre mientras el bloque
   sube, sin robarle a nadie el control del scroll. Es el modo del
   reloj de rescate, que tiene cinco fichas que se pulsan.

   ── LAS DOS GARANTÍAS ───────────────────────────────────────────────

   1 · SIN JAVASCRIPT NO SE ESCRIBE NADA, y el CSS de cada escena lee
       `var(--avance, 1)`: sin este módulo todas las escenas se ven en
       su estado FINAL —el anillo entero, la hoja puesta, los rieles
       llenos— quietas y completas. No es un modo degradado; es la misma
       página sin el tiempo. La clase `escena--viva` solo la ponen las
       pegadas, porque su alto de varias pantallas no puede existir si
       no hay quien lo recorra.

   2 · NO SECUESTRA EL SCROLL. Ni rueda capturada, ni desplazamiento
       forzado, ni duración impuesta. La página baja a la velocidad a la
       que la baje quien lee. Es la misma ley que lleva escrita
       decidir.js y vale el doble aquí: alguien intentando llegar a un
       teléfono no puede encontrarse una sección que decide por ella
       cuánto tarda en pasar.
   ═══════════════════════════════════════════════════════════════════ */

const quieto = matchMedia('(prefers-reduced-motion: reduce)');
const escenas = [...document.querySelectorAll('[data-escena]')].map((el) => ({
  el,
  pegada: el.hasAttribute('data-pegada'),
  /* Cuánto de pantalla tarda una escena AL PASO en completarse, contado
     desde que su canto superior toca el borde inferior. 0.62 de pantalla:
     para cuando el bloque está centrado, la escena ya terminó. Ese es el
     punto — lo que se lee tiene que estar completo antes de leerse. */
  recorrido: 0.62,
  ultimo: -1,
}));

if (escenas.length) arrancar();

function arrancar() {
  let pedido = false;

  /* LA CLASE LA PONE EL SCRIPT, y esa es la garantía del respaldo. El
     alto de varias pantallas de una escena pegada cuelga de
     `escena--viva`: sin script, la sección mide lo que mide su
     contenido y no hay pantallas vacías que recorrer. Estuvo resuelto
     con un valor por defecto en el CSS y estaba mal por lo mismo que
     ya se documentó en decidir.js: un respaldo que hay que calcular no
     es un respaldo. Este no se calcula, se apaga. */
  function encender() {
    for (const e of escenas) if (e.pegada) e.el.classList.add('escena--viva');
  }
  function apagar() {
    for (const e of escenas) {
      e.el.classList.remove('escena--viva');
      e.el.style.removeProperty('--avance');
      e.ultimo = -1;
    }
  }

  function medir() {
    pedido = false;
    for (const e of escenas) {
      const r = e.el.getBoundingClientRect();
      let p;
      if (e.pegada) {
        /* La fórmula de decidir.js, palabra por palabra: la escena está
           clavada durante todo el tramo que sobra por encima de una
           pantalla, así que `avance` es exactamente qué parte de la
           escena toca. */
        p = -r.top / Math.max(1, r.height - innerHeight);
      } else {
        /* Al paso: de 0 cuando el canto toca el borde inferior a 1
           cuando ha subido `recorrido` pantallas. */
        p = (innerHeight - r.top) / Math.max(1, innerHeight * e.recorrido);
      }
      p = p < 0 ? 0 : p > 1 ? 1 : p;
      /* Al DOM solo si cambió el valor que se va a escribir. Cuatro
        decimales es lo que se escribe, así que es lo que se compara. */
      const v = p.toFixed(4);
      if (v === e.ultimo) continue;
      e.ultimo = v;
      e.el.style.setProperty('--avance', v);
    }
  }

  /* rAF por evento, no bucle continuo: mientras nadie se mueva, este
     módulo no gasta un solo cuadro. */
  const marcar = () => {
    if (pedido || quieto.matches) return;
    pedido = true;
    requestAnimationFrame(medir);
  };

  if (!quieto.matches) {
    encender();
    addEventListener('scroll', marcar, { passive: true });
    addEventListener('resize', marcar, { passive: true });
    /* Las láminas mueven la maqueta al cargar; sin esto la primera
       medida se toma contra una página que todavía va a crecer. */
    addEventListener('load', marcar);
    medir();
  }

  quieto.addEventListener('change', () => {
    if (quieto.matches) apagar();
    else { encender(); medir(); }
  });

  if (import.meta.env.DEV) {
    window.__esc = {
      medir, apagar, encender,
      /* Pisar el reloj a mano: el panel de verificación corre con la
         pestaña oculta y los rAF congelados, así que la única forma de
         auditar una escena es ponerla en un punto y medir el DOM. */
      pisar: (nombre, v) => {
        const e = escenas.find((x) => x.el.dataset.escena === nombre);
        if (e) { e.el.style.setProperty('--avance', String(v)); e.ultimo = String(v); }
        return !!e;
      },
      estado: () => escenas.map((e) => ({
        nombre: e.el.dataset.escena, pegada: e.pegada, avance: e.ultimo,
      })),
    };
  }
}
