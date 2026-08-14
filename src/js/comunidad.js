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

   Y en los HILOS DE EJEMPLO no hay número que suba de verdad: son datos
   inventados y no hay a quién sumárselo. Lo que se mueve al pulsar es el
   marcador EN PANTALLA, para que se vea el gesto.

   ── Y AHORA TAMBIÉN SE ESCRIBE ────────────────────────────────────
   El compositor dejó de estar apagado. Publicar un hilo, contestarlo y
   borrar lo propio son cosas que pasan de verdad — dentro de este
   aparato, que es hasta donde llega este sitio. El almacén, la difusión
   a las otras pestañas y el porqué de cada frontera están en
   js/foro.js; aquí solo está lo que se ve y se toca.

   Lo que NO cambia con eso: sin JavaScript la página sigue saliendo
   entera y legible, con los diez hilos de ejemplo abiertos y el
   formulario sin enviar a ninguna parte. Lo escrito en esta sesión no
   aparece —no hay quien lo pinte— y eso es correcto: nunca se pierde
   nada que estuviera en el HTML.
   ═══════════════════════════════════════════════════════════════════ */

import {
  hilos as hilosGuardados, publicar, responder, borrar, vaciar,
  cuandoDe, minutosDe, alCambiar,
} from './foro.js';
import { ETIQUETAS } from '../datos/comunidad.js';

const lista = document.getElementById('hilos');
const mando = document.querySelector('.mando');
if (lista) arrancar();

function arrancar() {
  const quieto = matchMedia('(prefers-reduced-motion: reduce)');
  /* ── LA LISTA YA NO ES FIJA ────────────────────────────────────────
     Era `const items = [...lista.children]`, capturada una vez al
     cargar, y con eso bastaba mientras los diez hilos fueran los del
     HTML. Ahora entran y salen tarjetas —las que se escriben aquí y las
     que llegan de otra ventana— así que ordenar y filtrar tienen que
     mirar lo que hay AHORA. Una copia congelada dejaría los hilos
     nuevos fuera del orden y fuera del filtro, que es la clase de fallo
     que solo se ve cuando ya hay contenido. */
  const items = () => [...lista.children].filter((el) => el.matches('.hilos__item'));
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
  /* ── SE RESUELVE AL PULSAR, NO SE GUARDA EN UN MAPA ───────────────
     Había un `Map` de botón → panel construido al cargar. Con diez
     hilos de HTML bastaba; con tarjetas que entran y salen, un mapa
     construido una vez deja los botones nuevos sin panel — y peor:
     retiene en memoria los de las tarjetas borradas. El panel se busca
     en el momento, que además es lo que ya dice el marcado con
     `aria-controls`. */
  const panelDe = (boton) => {
    const id = boton.getAttribute('aria-controls');
    return (id && document.getElementById(id))
      || boton.closest('.hilo__col')?.querySelector('.hebra')
      || null;
  };
  for (const boton of lista.querySelectorAll('.hebra__abrir')) {
    const panel = panelDe(boton);
    if (!panel) continue;
    boton.setAttribute('aria-expanded', 'false');
    panel.hidden = true;
  }

  lista.addEventListener('click', (e) => {
    const boton = e.target.closest('.hebra__abrir');
    if (!boton) return;
    const panel = panelDe(boton);
    if (!panel) return;
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
    for (const el of items().sort(cmp)) lista.append(el);

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

  /* Qué etiqueta hay puesta ahora. Lo necesita `sincronizar()`: un hilo
     que llega mientras hay un filtro activo no puede aparecer dentro de
     un filtro que lo excluye. `null` = sin filtrar todavía. */
  let etiquetaActual = null;

  function filtrar(id) {
    etiquetaActual = id;
    let quedan = 0;
    for (const el of items()) {
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

  /* ═══ 5 · ESCRIBIR ════════════════════════════════════════════════
     Publicar un hilo, contestarlo y borrar lo propio. Todo lo que
     decide QUÉ pasa con lo escrito está en js/foro.js —dónde se guarda,
     hasta dónde llega, cuándo muere—; aquí solo está el DOM.

     ── DE DÓNDE SALE EL MARCADO ────────────────────────────────────
     De dos <template> que Astro rellena con LOS MISMOS COMPONENTES que
     pintan los hilos de ejemplo. No hay una segunda versión de la
     tarjeta escrita a mano en JavaScript, que es lo que haría que un
     día las dos dejaran de parecerse. Ver la nota de los moldes en
     Comunidad.astro. */
  const molde = (nombre) => document.querySelector(`[data-molde-${nombre}]`);
  const moldeHilo = molde('hilo');
  const moldeNodo = molde('nodo');
  const moldeRespuesta = molde('respuesta');
  const forma = document.getElementById('escribir-form');
  const cajaEscribir = document.getElementById('escribir');

  /* Sin moldes no hay nada que pintar: la página se queda como estaba,
     con sus diez hilos y el compositor apagado. */
  if (!moldeHilo || !moldeNodo || !forma) return asidero();

  const base = document.documentElement.dataset.base
    || (document.querySelector('.marca')?.getAttribute('href') || '/');
  const pigmentoDe = (id) => (ETIQUETAS.find((e) => e.id === id) || ETIQUETAS[0]);
  let indiceNuevo = 0;
  /* El compositor de respuestas, uno solo y prestado. Se declara AQUÍ
     ARRIBA y no junto a su maquinaria porque `sincronizar()` lo lee, y
     un `let` no existe hasta su línea: este proyecto ya pagó ese fallo
     dos veces (ver la nota de `despegue` en main.js). */
  let formaRespuesta = null;

  /* El sello de autoría: la misma lámina y la misma regla determinista
     que Sello.astro —el giro sale de las letras del nombre— para que la
     garza de «Raíz» esté inclinada igual en un hilo escrito ahora que
     en uno del HTML. */
  function vestirSello(sello, autora) {
    const semilla = [...(autora.nombre || '')].reduce((n, ch) => n + ch.codePointAt(0), 0);
    sello.style.setProperty('--giro', (((semilla % 9) - 4) * 0.9).toFixed(1) + 'deg');
    sello.style.setProperty('--mirar', String(autora.mirar || 1));
    const img = sello.querySelector('.sello__ave');
    if (img) img.src = `${base}arte/1024/posada/${autora.pose}.webp`;
  }

  function pintarNodo(c, hilo) {
    const li = moldeNodo.content.firstElementChild.cloneNode(true);
    li.dataset.id = c.id;
    vestirSello(li.querySelector('.sello'), c.autora);
    const autora = li.querySelector('.nodo__autora');
    autora.textContent = c.autora.nombre;
    autora.classList.toggle('nodo__autora--anonima', Boolean(c.autora.anonima));
    li.querySelector('.nodo__insignia').hidden = !c.autora.esAutora;
    li.querySelector('.nodo__cuando').textContent = cuandoDe(c.creado);
    li.querySelector('.nodo__texto').textContent = c.texto;
    li.querySelector('.votos').dataset.base = String(c.votos || 0);
    li.querySelector('[data-marcador]').textContent = String(c.votos || 0);
    return li;
  }

  function pintarHilo(h) {
    const li = moldeHilo.content.firstElementChild.cloneNode(true);
    const et = pigmentoDe(h.etiqueta);
    const n = (h.comentarios || []).length;

    li.dataset.id = h.id;
    li.dataset.etiqueta = h.etiqueta;
    li.dataset.minutos = String(minutosDe(h.creado));
    li.dataset.votos = String(h.votos || 0);
    li.dataset.respuestas = String(n);
    /* `data-indice` es el orden de llegada de los diez del HTML, que
       empiezan en 0. Los escritos aquí van en negativo y cada vez más
       abajo, así que entre dos hilos de los mismos minutos gana el más
       nuevo — que es lo que significa «Nuevos». */
    li.dataset.indice = String(--indiceNuevo);

    const art = li.querySelector('.hilo');
    art.id = `hilo-${h.id}`;
    art.style.setProperty('--pigmento', et.pigmento);

    vestirSello(li.querySelector('.sello'), h.autora);
    const autora = li.querySelector('.hilo__autora');
    autora.textContent = h.autora.nombre;
    autora.classList.toggle('hilo__autora--anonima', Boolean(h.autora.anonima));
    li.querySelector('.hilo__cuando').textContent = cuandoDe(h.creado);
    li.querySelector('.etiqueta').textContent = et.nombre;
    li.querySelector('.hilo__titulo').textContent = h.titulo;

    const cuerpo = li.querySelector('.hilo__cuerpo');
    for (const p of h.cuerpo) {
      const el = document.createElement('p');
      el.textContent = p;
      cuerpo.append(el);
    }

    li.querySelector('.votos').dataset.base = String(h.votos || 0);
    li.querySelector('[data-marcador]').textContent = String(h.votos || 0);

    const hebra = li.querySelector('.hebra');
    hebra.id = `hebra-${h.id}`;
    const abrir = li.querySelector('.hebra__abrir');
    abrir.setAttribute('aria-controls', hebra.id);
    const lst = hebra.querySelector('.hebra__lista');
    for (const c of h.comentarios || []) lst.append(pintarNodo(c, h));

    /* Con respuestas se enseña el botón de plegarlas; sin ellas, la
       frase en voz baja. Nunca los dos. */
    abrir.hidden = n === 0;
    li.querySelector('.hilo__sola').hidden = n > 0;
    if (n > 0) {
      abrir.querySelector('.hebra__cuenta').textContent = String(n);
      abrir.lastElementChild.textContent = n === 1 ? 'respuesta' : 'respuestas';
    }
    li.querySelector('[data-borrar]').hidden = !h.mio;
    return li;
  }

  /* ── LA RECONCILIACIÓN ──────────────────────────────────────────
     Se repinta lo que cambió y NO la lista entera: reconstruir las diez
     tarjetas cada vez que llega una respuesta de otra pestaña tiraría
     el orden elegido, cerraría las hebras abiertas y borraría los votos
     puestos, que viven en el DOM. Se comparan ids. */
  function sincronizar() {
    const guardados = hilosGuardados();
    const enPantalla = new Map(
      items().filter((el) => el.dataset.id).map((el) => [el.dataset.id, el]));

    for (const [id, el] of enPantalla) {
      if (!guardados.some((h) => h.id === id)) el.remove();
    }
    for (const h of [...guardados].reverse()) {
      const viejo = enPantalla.get(h.id);
      const nuevo = pintarHilo(h);
      if (viejo) {
        /* Se conserva lo que es de quien mira y no del dato: su voto y
           si tenía la hebra abierta. */
        const votos = viejo.querySelector('.votos');
        const cajaN = nuevo.querySelector('.votos');
        if (votos && cajaN && votos.dataset.voto !== '0') {
          cajaN.dataset.voto = votos.dataset.voto;
          cajaN.dataset.tenido = votos.dataset.tenido || '';
          cajaN.querySelector('[data-marcador]').textContent =
            String((parseInt(cajaN.dataset.base, 10) || 0) + parseInt(votos.dataset.voto, 10));
          for (const b of cajaN.querySelectorAll('.voto')) {
            b.setAttribute('aria-pressed',
              String(b.dataset.dir === votos.dataset.voto));
          }
        }
        const abierta = viejo.querySelector('.hebra__abrir')?.getAttribute('aria-expanded') === 'true';
        if (abierta) {
          nuevo.querySelector('.hebra__abrir')?.setAttribute('aria-expanded', 'true');
          nuevo.querySelector('.hebra').hidden = false;
        } else {
          nuevo.querySelector('.hebra').hidden = true;
        }
        /* Y LO QUE ALGUIEN ESTÉ ESCRIBIENDO NO SE TIRA. Si el
           compositor de respuestas está abierto en este hilo, se muda a
           la tarjeta nueva con lo escrito dentro. Sin esto, una
           respuesta que llegara de otra ventana mientras se teclea
           borraría el texto a medias — y no hay forma de recuperarlo. */
        if (formaRespuesta && formaRespuesta.dataset.hilo === h.id) {
          nuevo.querySelector('.hilo__col').append(formaRespuesta);
        }
        viejo.replaceWith(nuevo);
      } else {
        nuevo.querySelector('.hebra').hidden = true;
        lista.prepend(nuevo);
      }
    }
    /* Se vuelve a aplicar el filtro puesto: un hilo nuevo con otra
       etiqueta no puede aparecer dentro de un filtro que lo excluye. */
    if (etiquetaActual !== null) filtrar(etiquetaActual);
    dispatchEvent(new Event('resize'));
  }

  /* ── PUBLICAR ──────────────────────────────────────────────────── */
  const parteEscribir = forma.querySelector('[data-escribir-parte]');
  const cajaNombre = forma.querySelector('[data-escribir-nombre]');
  const anonima = forma.querySelector('[name="anonima"]');
  const botonPublicar = forma.querySelector('button[type="submit"]');

  /* El botón nace apagado en el HTML y se enciende aquí: sin este
     módulo no hay dónde publicar, y un botón que no publica es un
     control muerto. */
  botonPublicar.disabled = false;
  botonPublicar.removeAttribute('title');

  const verNombre = () => { cajaNombre.hidden = anonima.checked; };
  anonima.addEventListener('change', verNombre);
  verNombre();

  forma.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new FormData(forma);
    const r = publicar({
      titulo: d.get('titulo'),
      cuerpo: d.get('cuerpo'),
      etiqueta: d.get('etiqueta'),
      anonima: anonima.checked,
      nombre: d.get('nombre'),
    });
    if (r.error) {
      parteEscribir.textContent = r.error;
      parteEscribir.dataset.mal = '1';
      /* Al campo que falta, no al principio del formulario: quien
         escribe con teclado tiene que aterrizar donde está el trabajo. */
      forma.querySelector(/título/i.test(r.error) || /titulo/i.test(r.error)
        ? '[name="titulo"]' : '[name="cuerpo"]')?.focus();
      return;
    }
    parteEscribir.dataset.mal = '';
    parteEscribir.textContent = 'Publicado. Se queda en este aparato.';
    forma.reset();
    verNombre();
    sincronizar();
    if (cajaEscribir) cajaEscribir.open = false;

    /* Se lleva el foco al hilo recién publicado. Es lo único que dice
       «está ahí» a quien no ve la lista moverse. */
    const nuevo = lista.querySelector(`[data-id="${r.hilo.id}"] .hilo__titulo`);
    if (nuevo) {
      nuevo.setAttribute('tabindex', '-1');
      nuevo.focus({ preventScroll: true });
      nuevo.scrollIntoView({ block: 'center', behavior: quieto.matches ? 'auto' : 'smooth' });
    }
  });

  /* ── CONTESTAR Y BORRAR ─────────────────────────────────────────
     Un solo compositor de respuestas prestado, que se muda al hilo que
     lo pida: dos formularios abiertos a la vez son dos sitios donde se
     puede estar escribiendo, y al enviar uno no se sabe cuál era.
     (Se declara arriba, con el resto del estado de esta sección.) */

  function cerrarRespuesta() {
    formaRespuesta?.remove();
    formaRespuesta = null;
  }

  lista.addEventListener('click', (e) => {
    const item = e.target.closest('.hilos__item');

    if (e.target.closest('[data-borrar]') && item?.dataset.id) {
      if (borrar(item.dataset.id)) sincronizar();
      return;
    }

    if (e.target.closest('[data-responder]') && item?.dataset.id && moldeRespuesta) {
      const abierta = formaRespuesta?.dataset.hilo === item.dataset.id;
      cerrarRespuesta();
      if (abierta) return;              // pulsar otra vez, la cierra

      formaRespuesta = moldeRespuesta.content.firstElementChild.cloneNode(true);
      formaRespuesta.dataset.hilo = item.dataset.id;
      item.querySelector('.hilo__col').append(formaRespuesta);
      formaRespuesta.querySelector('textarea').focus();
      dispatchEvent(new Event('resize'));
      return;
    }

    if (e.target.closest('[data-cerrar]')) { cerrarRespuesta(); dispatchEvent(new Event('resize')); }
  });

  lista.addEventListener('submit', (e) => {
    const f = e.target.closest('.responder');
    if (!f) return;
    e.preventDefault();
    const aviso = f.querySelector('.responder__parte');
    const r = responder(f.dataset.hilo, {
      texto: f.querySelector('textarea').value,
      anonima: anonima.checked,
      nombre: forma.querySelector('[name="nombre"]')?.value,
    });
    if (r.error) { aviso.textContent = r.error; return; }
    cerrarRespuesta();
    sincronizar();
  });

  /* ── BORRAR TODO LO MÍO ─────────────────────────────────────────
     Vive en el pie, con los enlaces de salida, y aparece solo cuando
     hay algo que borrar. Es la contrapartida honesta de que lo escrito
     sobreviva a una recarga: si sobrevive, tiene que poder irse antes
     de tiempo y sin cerrar la pestaña. */
  const pie = document.querySelector('.comunidad__pie');
  let botonVaciar = null;
  function verVaciar() {
    const mios = hilosGuardados().filter((h) => h.mio).length;
    if (!mios) { botonVaciar?.remove(); botonVaciar = null; return; }
    if (!botonVaciar && pie) {
      botonVaciar = document.createElement('button');
      botonVaciar.type = 'button';
      botonVaciar.className = 'comunidad__vaciar';
      botonVaciar.addEventListener('click', () => { vaciar(); sincronizar(); });
      pie.prepend(botonVaciar);
    }
    if (botonVaciar) {
      botonVaciar.textContent = mios === 1
        ? 'Borrar el hilo que escribí' : `Borrar los ${mios} hilos que escribí`;
    }
  }

  /* Lo que llegue de otra pestaña repinta esta. Y lo que se guardó antes
     de recargar se pinta al arrancar. */
  alCambiar(() => { sincronizar(); verVaciar(); });
  sincronizar();
  verVaciar();

  return asidero();

  /* Asidero de verificación — el mismo patrón que __mar, __plx y __scr:
     se pisa el estado a mano y se mira el resultado, porque el panel del
     navegador deja de componer a ratos y sin esto no hay capturas.

     YA NO VA DETRÁS DE `import.meta.env.DEV`, y el motivo es que ahora
     hay pruebas E2E: corren contra el sitio COMPILADO —que es donde de
     verdad hay que comprobar que el foro publica— y sin este objeto
     tendrían que deducir el orden y el filtro contando tarjetas. No
     expone nada que no esté ya en pantalla ni permite hacer nada que no
     se pueda hacer pulsando. */
  function asidero() {
    window.__com = {
      ordenar, filtrar, sincronizar,
      estado: () => ({
        orden: ordenActual,
        etiqueta: etiquetaActual,
        visibles: items().filter((el) => !el.hidden).length,
        primero: lista.firstElementChild?.querySelector('.hilo__titulo')?.textContent.trim(),
        hebrasAbiertas: [...lista.querySelectorAll('.hebra__abrir')]
          .filter((b) => b.getAttribute('aria-expanded') === 'true').length,
        votosPuestos: [...lista.querySelectorAll('.votos')]
          .filter((c) => c.dataset.voto !== '0').length,
        escritos: items().filter((el) => el.dataset.id).length,
      }),
    };
    return window.__com;
  }
}
