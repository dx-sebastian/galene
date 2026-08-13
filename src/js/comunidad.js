/* ═══════════════════════════════════════════════════════════════════
   comunidad.js — EL COMPORTAMIENTO DEL FORO.

   Cuatro cosas: ordenar, filtrar, votar y plegar las hebras. Ninguna es
   imprescindible para leer la página, y eso es la regla del sitio
   aplicada aquí: el mar es un enhancement, y esto también.

   Sin este archivo, la página sale con los hilos en orden de llegada y
   con TODOS los comentarios a la vista. Es más larga y se lee entera. Lo
   que no pasa nunca es que quede un control en pantalla que no haga
   nada — por eso la fila de etiquetas nace con `hidden` y la pliega
   este módulo, y por eso las hebras nacen ABIERTAS con
   `aria-expanded="true"` y es este módulo el que las cierra.

   ── NADA SE GUARDA, Y ES A PROPÓSITO ──────────────────────────────
   Los votos viven en la memoria de la pestaña y se van al recargar. Es
   lo primero que uno querría meter en `localStorage` —«que recuerde lo
   que voté»— y es exactamente lo que este sitio no puede hacer: qué
   hilos sobre sumisión química votó alguien es un dato sensible, y
   guardarlo en el aparato deja un rastro que sobrevive al botón de
   salir. El README lo dice sin matices: ni analítica, ni cookies, ni
   base de datos. Un voto que se olvida al cerrar es el precio, y es un
   precio correcto.

   Y no hay número que suba de verdad: son datos de ejemplo y no hay
   servidor. Lo que se mueve al pulsar es el marcador EN PANTALLA, para
   que se vea el gesto. Que no llegue a ningún sitio lo dice el
   compositor, no un mensaje de error por cada clic.
   ═══════════════════════════════════════════════════════════════════ */

const lista = document.getElementById('hilos');
const mando = document.querySelector('.mando');
if (lista) arrancar();

function arrancar() {
  const quieto = matchMedia('(prefers-reduced-motion: reduce)');
  const items = [...lista.children];
  const num = (el, k) => parseInt(el.dataset[k], 10) || 0;

  /* ═══ 1 · EL VOTO ═════════════════════════════════════════════════
     La aritmética de Reddit, y toda la gracia está en guardar DOS
     números en vez de uno: `data-base` es el marcador del dato y no se
     toca nunca; `data-voto` es lo que ha puesto quien mira (−1, 0, +1).
     Lo que se pinta es la suma.

     Con un solo número habría que deducir el estado del propio
     marcador, y eso se descuadra en cuanto alguien pulsa dos veces:
     +1 y −1 sobre una base desconocida no se pueden deshacer. Así,
     quitar el voto es poner `data-voto` a cero y volver a sumar.

     Tres reglas, las de siempre:
     — pulsar la flecha que ya está puesta, la quita;
     — pulsar la contraria salta de +1 a −1 de una vez (dos puntos);
     — no se puede votar dos veces en el mismo sentido.

     UN SOLO OYENTE para toda la lista, no doscientos: en esta página hay
     dos flechas por hilo y dos por comentario, y colgar un oyente de
     cada botón son cerca de doscientos cierres vivos en un teléfono que
     ya va apretado. */
  lista.addEventListener('click', (e) => {
    const boton = e.target.closest('.voto');
    if (!boton) return;
    const caja = boton.closest('.votos');
    if (!caja) return;

    const dir = parseInt(boton.dataset.dir, 10) || 0;
    const previo = parseInt(caja.dataset.voto, 10) || 0;
    const ahora = previo === dir ? 0 : dir;      // pulsar lo puesto, lo quita

    caja.dataset.voto = String(ahora);

    const marcador = caja.querySelector('[data-marcador]');
    if (marcador) {
      marcador.textContent = String((parseInt(caja.dataset.base, 10) || 0) + ahora);
    }

    /* El estado va en las DOS flechas, no solo en la pulsada: si estaba
       abajo y se vota arriba, la de abajo tiene que apagarse en el mismo
       gesto. Un lector de pantalla lee `aria-pressed`, así que si se
       quedara puesta anunciaría dos votos a la vez. */
    for (const b of caja.querySelectorAll('.voto')) {
      b.setAttribute('aria-pressed',
        String((parseInt(b.dataset.dir, 10) || 0) === ahora && ahora !== 0));
    }
    /* Y el color del marcador sale del voto puesto, que es lo que hace
       Reddit: el número se tiñe del lado al que se empujó. */
    caja.dataset.tenido = ahora === 1 ? 'sube' : ahora === -1 ? 'baja' : '';
  });

  /* ═══ 2 · LAS HEBRAS ══════════════════════════════════════════════
     Nacen abiertas en el HTML y se cierran aquí, al cargar. Diez hilos
     con sus comentarios desplegados son cuatro pantallas de scroll antes
     del segundo tema; pero un botón que no plegara nada sin JavaScript
     sería peor que una página larga. */
  const hebras = new Map();          // botón → panel
  for (const boton of lista.querySelectorAll('.hebra__abrir')) {
    const panel = document.getElementById(boton.getAttribute('aria-controls'));
    if (!panel) continue;
    hebras.set(boton, panel);
    boton.setAttribute('aria-expanded', 'false');
    panel.hidden = true;
  }

  lista.addEventListener('click', (e) => {
    const boton = e.target.closest('.hebra__abrir');
    if (!boton || !hebras.has(boton)) return;
    const panel = hebras.get(boton);
    const abierto = boton.getAttribute('aria-expanded') === 'true';

    boton.setAttribute('aria-expanded', String(!abierto));
    panel.hidden = abierto;

    /* ABRIR NO PUEDE LLEVARSE LA PÁGINA. Desplegar seis respuestas
       empuja hacia abajo todo lo que había debajo, y si la tarjeta estaba
       a media pantalla el título que se estaba leyendo se va por arriba.
       Solo se trae el hilo si su cabecera YA se salió — sin robar el
       scroll cuando no hace falta, que es lo que hace insoportable un
       `scrollIntoView` puesto a la ligera. */
    if (!abierto) {
      const hilo = boton.closest('.hilo');
      if (hilo && hilo.getBoundingClientRect().top < 0) {
        hilo.scrollIntoView({ block: 'start', behavior: quieto.matches ? 'auto' : 'smooth' });
      }
    }

    /* Y la maqueta cambió de alto: `desplazamiento.js` mide una vez el
       sitio de cada hilo y hay que decirle que vuelva a medir. Su
       `ResizeObserver` sobre la sección lo caza solo, pero el aviso es
       barato y no depende de que ese observador exista. */
    dispatchEvent(new Event('resize'));
  });

  /* ═══ 3 · ORDENAR ═════════════════════════════════════════════════
     Tres criterios, y los tres con desempate por orden de llegada: sin
     él, dos hilos con la misma cuenta se cruzarían de sitio cada vez que
     se pulsa, y una lista que baila sola se lee como un fallo.

     «solas» ordena por MENOS respuestas primero y, dentro de las que
     tienen las mismas, por más recientes: entre dos hilos sin contestar,
     el que lleva menos rato esperando es el que todavía se alcanza. */
  const CRITERIOS = {
    recientes: (a, b) => num(a, 'minutos') - num(b, 'minutos'),
    votados:   (a, b) => num(b, 'votos') - num(a, 'votos'),
    solas:     (a, b) => (num(a, 'respuestas') - num(b, 'respuestas')) ||
                         (num(a, 'minutos') - num(b, 'minutos')),
  };

  if (!mando) return;

  /* La nota que explica «Sin responder». Vive en el HTML pero nace
     oculta: sin JavaScript no hay orden que elegir, así que tampoco hay
     nada que explicar. */
  const nota = mando.querySelector('[data-nota-orden]');

  /* AVISO PARA QUIEN NO VE LA LISTA. Reordenar diez tarjetas es un
     cambio enorme y silencioso para un lector de pantalla: sin esto,
     pulsar «Sin responder» no anuncia absolutamente nada. Se crea desde
     aquí porque es un estado que solo existe con JavaScript. */
  const parte = document.createElement('p');
  parte.className = 'mando__parte';
  parte.setAttribute('role', 'status');
  parte.setAttribute('aria-live', 'polite');
  mando.append(parte);

  let ordenActual = 'recientes';

  function ordenar(clave, avisar) {
    const cmp = CRITERIOS[clave];
    if (!cmp) return;
    ordenActual = clave;

    /* Un `sort` sobre la copia y un solo `append` por elemento: mover un
       nodo que ya está en el documento lo REUBICA, no lo duplica, y el
       navegador recompone una vez. */
    for (const el of [...items].sort(cmp)) lista.append(el);

    for (const b of mando.querySelectorAll('[data-orden]')) {
      b.setAttribute('aria-pressed', String(b.dataset.orden === clave));
    }
    if (nota) nota.hidden = clave !== 'solas';

    /* REORDENAR ES UN CAMBIO DE MAQUETA Y HAY QUE DECIRLO.
       `desplazamiento.js` mide una vez el `offsetTop` de cada hilo y vela
       los que todavía no han entrado; si se reordenan sin avisar, sigue
       creyendo que la tarjeta que ahora está arriba está abajo, y la deja
       mojada en mitad de la zona de lectura. Su `ResizeObserver` no lo
       caza porque la sección no cambia de alto: las mismas diez
       tarjetas, en otro orden. Un `resize` sintético es la señal que ese
       módulo ya escucha, así que no hace falta inventar ningún acuerdo
       nuevo entre los dos — y si no está cargado, esto no hace nada. */
    dispatchEvent(new Event('resize'));

    if (avisar) {
      parte.textContent = clave === 'solas'
        ? 'Primero los hilos que nadie ha respondido.'
        : clave === 'votados'
          ? 'Primero los hilos más votados.'
          : 'Primero los hilos más recientes.';
      /* Y la hoja se moja: la lista se va un instante y vuelve. Un
         reordenamiento instantáneo se lee como un parpadeo de error;
         medio segundo de velo se lee como una hoja que se cambia. Con
         movimiento apagado no pasa nada de esto. */
      if (!quieto.matches) {
        lista.classList.remove('hilos--mojada');
        void lista.offsetWidth;            // reinicia la animación ya
        lista.classList.add('hilos--mojada');
      }
    }
  }

  /* ═══ 4 · FILTRAR POR ETIQUETA ════════════════════════════════════
     La fila nace con `hidden` puesto en el HTML y se enciende aquí: un
     chip que no filtra porque el script no llegó es un control muerto, y
     este proyecto no deja controles muertos en pantalla. */
  const fila = mando.querySelector('.mando__etiquetas');
  if (fila) fila.hidden = false;

  /* El vacío solo puede existir con JavaScript —sin él la lista sale
     entera—, así que su mensaje lo pone JavaScript. */
  const vacio = document.createElement('p');
  vacio.className = 'hilos__vacio';
  vacio.hidden = true;
  vacio.textContent = 'Todavía no hay hilos con esta etiqueta. Puedes abrir el primero.';
  lista.after(vacio);

  function filtrar(id) {
    let quedan = 0;
    for (const el of items) {
      const cabe = !id || el.dataset.etiqueta === id;
      el.hidden = !cabe;
      if (cabe) quedan++;
    }
    for (const b of mando.querySelectorAll('[data-etiqueta]')) {
      b.setAttribute('aria-pressed', String((b.dataset.etiqueta || '') === id));
    }
    vacio.hidden = quedan > 0;
    parte.textContent = quedan === 1 ? 'Un hilo.' : `${quedan} hilos.`;
    dispatchEvent(new Event('resize'));
  }

  mando.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || !mando.contains(b)) return;
    if (b.dataset.orden) ordenar(b.dataset.orden, true);
    else if (b.dataset.etiqueta !== undefined) filtrar(b.dataset.etiqueta);
  });

  /* Asidero de verificación, solo en desarrollo — el mismo patrón que
     __mar, __plx y __scr: se pisa el estado a mano y se mira el
     resultado, porque el panel del navegador deja de componer a ratos y
     sin esto no hay capturas. */
  if (import.meta.env.DEV) {
    window.__com = {
      ordenar, filtrar,
      estado: () => ({
        orden: ordenActual,
        visibles: items.filter((el) => !el.hidden).length,
        primero: lista.firstElementChild?.querySelector('.hilo__titulo')?.textContent.trim(),
        hebrasAbiertas: [...hebras.keys()]
          .filter((b) => b.getAttribute('aria-expanded') === 'true').length,
        votosPuestos: [...lista.querySelectorAll('.votos')]
          .filter((c) => c.dataset.voto !== '0').length,
      }),
    };
  }
}
