/* ═══════════════════════════════════════════════════════════════════
   comunidad.js — EL COMPORTAMIENTO DEL FORO, CONTRA SUPABASE.

   Desde el 17 ago 2026 esto ya no es sort/filter/voto de mentira sobre
   datos quemados: lee y escribe de verdad, a través de
   `js/supabase-cliente.js`. Lo que se queda igual es la regla de fondo
   del proyecto — el foro es un enhancement, como el mar: si Supabase no
   está configurado o la red falla, el resto del sitio sigue en pie, y
   aquí se dice con un estado de error, no con una página rota.

   NADA POR innerHTML. Todo lo que puede llevar texto de quien escribe
   se pinta con `textContent`. Las tarjetas nacen de los `<template>` de
   Comunidad.astro —marcado fijo, sin datos dentro— y aquí solo se
   clonan y se rellenan.
   ═══════════════════════════════════════════════════════════════════ */
import {
  listo, listar, comentarios as pedirComentarios, crearHilo, crearComentario,
  votar, reportar, borrarPropio, nuevosDesde, limites, largo,
} from './supabase-cliente.js';
import { ETIQUETAS, deEtiqueta } from '../datos/etiquetas.js';

const seccion = document.getElementById('comunidad');
if (seccion) arrancar();

async function arrancar() {
  const quieto = matchMedia('(prefers-reduced-motion: reduce)');
  const base = document.querySelector('html')?.dataset.base || '';

  const lista = document.getElementById('hilos');
  const mando = document.getElementById('mando');
  const escribir = document.getElementById('escribir');
  const form = document.getElementById('form-escribir');
  const carga = seccion.querySelector('[data-carga]');
  const errorEl = seccion.querySelector('[data-error]');
  const vacio = seccion.querySelector('[data-vacio]');
  const paginacion = seccion.querySelector('[data-paginacion]');
  const botonMas = seccion.querySelector('[data-cargar-mas]');
  const finEl = seccion.querySelector('[data-fin]');
  const centinela = seccion.querySelector('[data-centinela]');
  const pillNuevos = seccion.querySelector('[data-hilos-nuevos]');
  const plantillaHilo = seccion.querySelector('[data-plantilla-hilo]');
  const plantillaComentario = seccion.querySelector('[data-plantilla-comentario]');

  /* ═══ SI SUPABASE NO ESTÁ CONFIGURADO, SE DICE Y SE PARA AHÍ ═══════
     El resto del sitio —hero, ayuda, mapa— no depende de esto. */
  if (!listo) {
    carga.hidden = true;
    errorEl.hidden = false;
    errorEl.querySelector('[data-reintentar]')?.remove();
    return;
  }

  /* ── AQUÍ VIVÍA EL SELLO, Y AHÍ ESTABA LA AVERÍA ────────────────────
     Cada tarjeta llevaba un ave posada de sello, con su pose y su
     mirada. El rediseño de la comunidad —«sin fotos de perfil»— la quitó
     del marcado, de las dos plantillas, y este archivo se quedó
     pintándola:

       const ave = nodo.querySelector('.sello__ave');
       ave.src = rutaAve(h.autora.pose);

     `querySelector` de una clase que ya no existe devuelve `null`, y
     asignarle `.src` lanza. En la PRIMERA tarjeta. O sea que desde ese
     rediseño la comunidad no pintaba ni un hilo: cargaba la lista, la
     recorría, reventaba en la primera y el `catch` de fuera enseñaba «no
     se pudo llegar a la comunidad». Esa frase mandó a buscar la avería a
     la red, a las llaves y a Supabase durante horas — y la base contestó
     siempre bien, porque el fallo estaba tres capas más acá.

     Lo que lo destapó fue el mensaje de error nuevo, la primera vez que
     alguien vio el texto de verdad: «Cannot set properties of null
     (setting 'src')». Un aviso honesto encontró en un minuto lo que un
     aviso amable había escondido.

     `autora.pose` y `autora.mirar` siguen llegando de la base y no
     estorban: los lee la portada para las garzas del manglar. Aquí ya no
     se usan. */

  let estado = { orden: 'recientes', etiqueta: '' };
  let cursor = '', instantanea = null, hayMas = true, cargando = false;
  let objetivo = null;   // { hilo, padre } cuando se responde a algo; null = hilo nuevo

  mando.hidden = false;
  escribir.hidden = false;

  const aviso = document.createElement('p');
  aviso.className = 'mando__parte';
  aviso.setAttribute('role', 'status');
  aviso.setAttribute('aria-live', 'polite');
  mando.append(aviso);

  /* ═══ 1 · PINTAR UN HILO ═════════════════════════════════════════ */
  function pintarHilo(h) {
    const nodo = plantillaHilo.content.firstElementChild.cloneNode(true);
    const et = deEtiqueta(h.etiqueta);
    nodo.dataset.id = h.id;
    /* Sin etiqueta, el hilo se queda con la tinta de la casa: el
       pigmento es de la etiqueta, y si no hay etiqueta no hay pigmento
       que poner. */
    if (et) nodo.querySelector('.hilo').style.setProperty('--pigmento', et.pigmento);

    const autoraEl = nodo.querySelector('[data-autora]');
    autoraEl.textContent = h.autora.nombre;
    autoraEl.classList.toggle('hilo__autora--anonima', h.autora.anonima);
    nodo.querySelector('[data-cuando]').textContent = h.cuando;
    const etiquetaEl = nodo.querySelector('[data-etiqueta-nombre]');
    if (et) etiquetaEl.textContent = et.nombre;
    else etiquetaEl.remove();   // sin etiqueta no se enseña una vacía
    nodo.querySelector('[data-titulo]').textContent = h.titulo;

    const cuerpo = nodo.querySelector('[data-cuerpo]');
    for (const p of h.cuerpo) {
      const parrafo = document.createElement('p');
      parrafo.textContent = p;
      cuerpo.append(parrafo);
    }

    montarVotos(nodo.querySelector('[data-votos]'), 'hilo', h.id, h.votos, h.miVoto);

    if (h.respuestas > 0) {
      nodo.querySelector('[data-cuenta]').textContent = String(h.respuestas);
      nodo.querySelector('[data-palabra]').textContent = h.respuestas === 1 ? 'respuesta' : 'respuestas';
      nodo.querySelector('[data-sola]').hidden = true;
    } else {
      nodo.querySelector('[data-sola]').hidden = false;
    }
    nodo.querySelector('[data-hebra]').hidden = false;

    if (h.estado === 'revision') nodo.querySelector('[data-revision]').hidden = false;

    if (h.autora.esMia) {
      const b = nodo.querySelector('[data-borrar]');
      b.hidden = false;
      b.addEventListener('click', () => borrarPropioClic('hilo', h.id, nodo));
    }
    nodo.querySelector('[data-reportar]').addEventListener('click', (e) => reportarClic(e, 'hilo', h.id));

    for (const a of nodo.querySelectorAll('[href="#escribir"]')) {
      a.addEventListener('click', (e) => { e.preventDefault(); prepararRespuesta(h.id, null); });
    }

    lista.append(nodo);
  }

  /* ═══ 2 · LOS PRIMEROS COMENTARIOS, EN LÍNEA ══════════════════════
     No hace falta abrir nada: se piden los tres primeros junto con la
     página de hilos, en paralelo —doce hilos en serie serían doce
     viajes de red; en paralelo, uno. El resto queda detrás de «ver las
     otras N respuestas». */
  async function cargarComentariosDe(hilos) {
    await Promise.all(hilos.filter((h) => h.respuestas > 0).map(async (h) => {
      const nodoHilo = lista.querySelector(`.hilos__item[data-id="${cssEscapar(h.id)}"]`);
      if (!nodoHilo) return;
      try {
        const r = await pedirComentarios(h.id, { limite: 3 });
        const listaHebra = nodoHilo.querySelector('[data-hebra-lista]');
        for (const c of r.comentarios) pintarComentario(listaHebra, c, h.id);

        const restantes = h.respuestas - r.comentarios.length;
        const botonResto = nodoHilo.querySelector('[data-cargar-comentarios]');
        if (restantes > 0 && r.cursor) {
          botonResto.hidden = false;
          botonResto.textContent = `Ver las otras ${restantes} respuestas`;
          botonResto.addEventListener('click', () => cargarRestoComentarios(h.id, nodoHilo, r.cursor, botonResto), { once: true });
        }
        dispatchEvent(new Event('resize'));
      } catch (e) { console.error('No se pudieron cargar los comentarios de', h.id, e); }
    }));
  }

  async function cargarRestoComentarios(hiloId, nodoHilo, cursorComentarios, boton) {
    boton.disabled = true;
    try {
      const r = await pedirComentarios(hiloId, { cursor: cursorComentarios, limite: 60 });
      const listaHebra = nodoHilo.querySelector('[data-hebra-lista]');
      for (const c of r.comentarios) pintarComentario(listaHebra, c, hiloId);
      boton.hidden = true;
      dispatchEvent(new Event('resize'));
    } catch (e) {
      boton.disabled = false;
      boton.textContent = 'No se pudo cargar. Reintentar.';
    }
  }

  function cssEscapar(s) { return window.CSS?.escape ? CSS.escape(s) : s.replace(/["\\]/g, '\\$&'); }

  function pintarComentario(listaHebra, c, hiloId) {
    const nodo = plantillaComentario.content.firstElementChild.cloneNode(true);
    nodo.dataset.id = c.id;


    const autoraEl = nodo.querySelector('[data-autora]');
    autoraEl.textContent = c.autora.nombre;
    autoraEl.classList.toggle('nodo__autora--anonima', c.autora.anonima);
    if (c.autora.esAutora) nodo.querySelector('[data-insignia]').hidden = false;
    nodo.querySelector('[data-cuando]').textContent = c.cuando;
    nodo.querySelector('[data-texto]').textContent = c.texto;

    montarVotos(nodo.querySelector('[data-votos]'), 'comentario', c.id, c.votos, c.miVoto);

    nodo.querySelector('[data-responder]').addEventListener('click', (e) => {
      e.preventDefault(); prepararRespuesta(hiloId, c.padre || c.id);
    });
    if (c.autora.esMia) {
      const b = nodo.querySelector('[data-borrar]');
      b.hidden = false;
      b.addEventListener('click', () => borrarPropioClic('comentario', c.id, nodo));
    }
    nodo.querySelector('[data-reportar]').addEventListener('click', (e) => reportarClic(e, 'comentario', c.id));

    listaHebra.append(nodo);
  }

  /* ═══ 3 · VOTAR ═══════════════════════════════════════════════════
     La misma aritmética de siempre para el gesto optimista —se pinta al
     instante—, y por debajo la llamada de verdad. Si falla, se deshace
     y no se explica: un fallo de red no necesita una disculpa por hilo. */
  function montarVotos(caja, objeto, cosa, base, miVoto = 0) {
    caja.dataset.base = String(base);
    caja.querySelector('[data-marcador]').textContent = String(base);

    /* `base` YA incluye mi voto si lo puse —lo mantiene el trigger de
       la base—, así que aquí solo se enciende la flecha y el color: a
       diferencia del clic, no hay que volver a sumarlo al marcador. */
    if (miVoto) {
      caja.dataset.voto = String(miVoto);
      for (const b of caja.querySelectorAll('.voto')) {
        b.setAttribute('aria-pressed', String((parseInt(b.dataset.dir, 10) || 0) === miVoto));
      }
      caja.dataset.tenido = miVoto === 1 ? 'sube' : 'baja';
    }

    caja.addEventListener('click', async (e) => {
      const boton = e.target.closest('.voto');
      if (!boton) return;
      const dir = parseInt(boton.dataset.dir, 10) || 0;
      const previo = parseInt(caja.dataset.voto, 10) || 0;
      const ahora = previo === dir ? 0 : dir;

      pintarVoto(caja, ahora);
      try {
        await votar(objeto, cosa, ahora);
      } catch (err) {
        pintarVoto(caja, previo);
      }
    });
  }
  function pintarVoto(caja, ahora) {
    caja.dataset.voto = String(ahora);
    caja.querySelector('[data-marcador]').textContent = String((parseInt(caja.dataset.base, 10) || 0) + ahora);
    for (const b of caja.querySelectorAll('.voto')) {
      b.setAttribute('aria-pressed', String((parseInt(b.dataset.dir, 10) || 0) === ahora && ahora !== 0));
    }
    caja.dataset.tenido = ahora === 1 ? 'sube' : ahora === -1 ? 'baja' : '';
  }

  /* ═══ 4 · REPORTAR ════════════════════════════════════════════════
     Discreto: el botón se convierte en un campo corto y un enviar. Sin
     ventana ni confirmación de terror — es lo que se pidió. */
  function reportarClic(e, objeto, cosa) {
    const boton = e.currentTarget;
    if (boton.dataset.abierto) return;
    boton.dataset.abierto = '1';

    const campo = document.createElement('input');
    campo.type = 'text'; campo.maxLength = 200;
    campo.placeholder = 'Motivo (opcional)';
    campo.className = 'hilo__accion-campo';

    const enviar = document.createElement('button');
    enviar.type = 'button'; enviar.className = 'hilo__accion';
    enviar.textContent = 'Enviar';

    boton.replaceWith(campo);
    campo.after(enviar);
    campo.focus();

    enviar.addEventListener('click', async () => {
      enviar.disabled = true;
      try {
        await reportar(objeto, cosa, campo.value);
        const gracias = document.createElement('span');
        gracias.className = 'hilo__accion-gracias';
        gracias.textContent = 'Gracias.';
        campo.replaceWith(gracias);
        enviar.remove();
      } catch (err) {
        enviar.disabled = false;
        enviar.textContent = 'No se pudo. Reintentar.';
      }
    });
  }

  /* ═══ 5 · BORRAR LO PROPIO ═══════════════════════════════════════ */
  async function borrarPropioClic(objeto, id, nodo) {
    if (!confirm('¿Borrar esto? No se puede deshacer desde aquí.')) return;
    try {
      await borrarPropio(objeto, id);
      const titulo = nodo.querySelector('[data-titulo], [data-texto]');
      const cuerpo = nodo.querySelector('[data-cuerpo]');
      const autoraEl = nodo.querySelector('[data-autora]');
      if (titulo) titulo.textContent = '';
      if (cuerpo) cuerpo.replaceChildren();
      if (autoraEl) autoraEl.textContent = 'Anónima';
      nodo.querySelector('[data-borrar]')?.remove();
      nodo.querySelector('[data-reportar]')?.remove();
    } catch (err) {
      alert('No se pudo borrar. Intenta de nuevo en un momento.');
    }
  }

  /* ═══ 6 · ESCRIBIR ════════════════════════════════════════════════ */
  const campoTitulo = form.querySelector('[name="titulo"]');
  const campoEtiqueta = form.querySelector('[name="etiqueta"]');
  const campoCuerpo = form.querySelector('[name="cuerpo"]');
  const campoAnonima = form.querySelector('[name="anonima"]');
  const campoNombre = form.querySelector('[name="nombre"]');
  const contador = form.querySelector('[data-contador]');
  const ayudaTitulo = form.querySelector('[data-ayuda-titulo]');
  const fichas = form.querySelector('[data-fichas]');
  const estadoEl = form.querySelector('[data-estado]');
  const llaveBox = form.querySelector('[data-llave]');
  const llaveTexto = llaveBox.querySelector('[data-llave-texto]');

  /* ═══ LA ETIQUETA, EN FICHAS Y SIN OBLIGAR ═══════════════════════
     Un `<input type="hidden">` guarda la elección para que el resto
     del formulario siga leyendo `[name="etiqueta"]` como antes. Vacío
     significa «ninguna», y eso ahora se puede publicar.

     Volver a pulsar la que ya está puesta la QUITA. Sin eso, elegir
     una por error sería irreversible sin recargar — y en un panel que
     acaba de dejar de obligar a etiquetar, no poder desetiquetar sería
     el mismo problema con otra forma. */
  fichas?.addEventListener('click', (e) => {
    const boton = e.target.closest('[data-etiqueta-elegir]');
    if (!boton) return;
    const id = boton.dataset.etiquetaElegir;
    const yaEstaba = campoEtiqueta.value === id;
    campoEtiqueta.value = yaEstaba ? '' : id;
    for (const b of fichas.querySelectorAll('[data-etiqueta-elegir]')) {
      b.setAttribute('aria-pressed', String(b.dataset.etiquetaElegir === campoEtiqueta.value));
    }
  });

  /* ═══ LO QUE NO CABE, DICHO ANTES DE ENVIAR ══════════════════════
     Esto faltaba, y se notaba: escribir «Hola» de título y pulsar
     Publicar devolvía «Eso no cabe en el tamaño permitido — revisa el
     título o el texto», que llegaba DESPUÉS de un viaje a la base, no
     decía cuál de los dos campos era, y no decía cuánto faltaba. El
     mínimo de ocho caracteres solo vivía en un CHECK de Postgres y en
     un marcador de posición que desaparece justo al empezar a escribir.

     Ahora lo dice el propio campo, mientras se teclea, con el número
     que falta. La base sigue siendo la que manda —esto es cortesía,
     no seguridad: quien quiera saltárselo lo hace con la consola y se
     encuentra el CHECK igual— pero nadie debería enterarse de un
     mínimo estrellándose contra él. */
  const problemaDe = (campo) => {
    const [min, max] = campo === 'titulo' ? limites.titulo
                     : objetivo ? limites.comentario : limites.cuerpo;
    const valor = campo === 'titulo' ? campoTitulo.value : campoCuerpo.value;
    const n = largo(valor.trim());
    if (n === 0) return { corto: true, falta: min, texto: `Entre ${min} y ${max} caracteres.` };
    if (n < min) {
      const falta = min - n;
      return { corto: true, falta,
        texto: falta === 1 ? 'Falta un carácter.' : `Faltan ${falta} caracteres.` };
    }
    if (n > max) return { largo: true, texto: `Sobran ${n - max} caracteres.` };
    return null;
  };

  function pintarAyudaTitulo() {
    if (!ayudaTitulo) return;
    const p = problemaDe('titulo');
    const tocado = campoTitulo.value.length > 0;
    ayudaTitulo.textContent = p ? p.texto : '';
    /* El aviso solo se pone en rojo cuando ya se escribió algo: teñir
       un campo vacío que nadie ha tocado todavía es regañar por
       adelantado. */
    ayudaTitulo.dataset.mal = String(Boolean(p) && tocado);
    campoTitulo.setAttribute('aria-invalid', String(Boolean(p) && tocado));
  }
  /* Y al corregir, el aviso de arriba se va. Sin esto, «El título:
     faltan 4 caracteres» se quedaba en pantalla después de haber puesto
     un título bueno: un mensaje de error que sobrevive a su causa
     enseña a no leer los mensajes de error. */
  const limpiarEstado = () => {
    if (!estadoEl.hidden && !problemaDe('titulo') && !problemaDe('cuerpo')) {
      estadoEl.hidden = true;
      estadoEl.textContent = '';
    }
  };
  campoTitulo.addEventListener('input', () => { pintarAyudaTitulo(); limpiarEstado(); });
  campoCuerpo.addEventListener('input', limpiarEstado);
  pintarAyudaTitulo();

  campoAnonima.addEventListener('change', () => { campoNombre.disabled = campoAnonima.checked; });

  /* Al contestar se esconden el título y las etiquetas: una respuesta
     no lleva ni lo uno ni lo otro. Se esconde el CAMPO ENTERO y no solo
     el `input`, porque ahora los rótulos se ven — dejar «Título» a la
     vista sobre un hueco sería peor que antes, cuando el rótulo estaba
     oculto y bastaba con quitar la caja. */
  const bloqueTitulo = () => campoTitulo.closest('.campo') || campoTitulo;
  const bloqueEtiqueta = () => form.querySelector('.campo--fichas');

  function prepararRespuesta(hiloId, padreId) {
    objetivo = { hilo: hiloId, padre: padreId };
    bloqueTitulo().hidden = true; campoTitulo.required = false;
    const et = bloqueEtiqueta();
    if (et) et.hidden = true;
    campoEtiqueta.value = '';
    campoCuerpo.placeholder = 'Tu respuesta.';
    escribir.open = true;
    escribir.scrollIntoView({ block: 'start', behavior: quieto.matches ? 'auto' : 'smooth' });
    campoCuerpo.focus();
  }
  function volverAHiloNuevo() {
    objetivo = null;
    bloqueTitulo().hidden = false; campoTitulo.required = true;
    const et = bloqueEtiqueta();
    if (et) et.hidden = false;
    campoCuerpo.placeholder = 'Lo que quieras contar.';
  }

  function actualizarContador() {
    const [min, max] = objetivo ? limites.comentario : limites.cuerpo;
    const n = largo(campoCuerpo.value);
    contador.textContent = n === 0 ? `Entre ${min} y ${max} caracteres.` : `${n} / ${max}`;
    contador.classList.toggle('escribir__contador--cerca', n > max * 0.85);
    contador.dataset.mal = String(n > max);
  }
  campoCuerpo.addEventListener('input', actualizarContador);
  actualizarContador();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    estadoEl.hidden = true;
    llaveBox.hidden = true;

    /* ── SE COMPRUEBA AQUÍ, NO EN LA BASE ─────────────────────────
       Un mínimo que solo vive en un CHECK de Postgres se descubre
       chocándose con él, después de esperar a la red, con un mensaje
       que no dice cuál de los dos campos era. Se para antes, se dice
       cuál y cuánto falta, y se lleva el cursor allí — que es la
       diferencia entre un aviso y una ayuda. */
    const malTitulo = objetivo ? null : problemaDe('titulo');
    const malCuerpo = problemaDe('cuerpo');
    if (malTitulo || malCuerpo) {
      pintarAyudaTitulo();
      actualizarContador();
      const campo = malTitulo ? campoTitulo : campoCuerpo;
      const cual = malTitulo ? 'El título' : 'El texto';
      estadoEl.hidden = false;
      estadoEl.textContent = `${cual}: ${(malTitulo || malCuerpo).texto.toLowerCase()}`;
      campo.focus();
      return;
    }

    const boton = form.querySelector('button[type="submit"]');
    boton.disabled = true;
    try {
      /* El plazo de escribir es más largo y su aviso dice otra cosa:
         al leer, que no conteste significa que no hay nada; al
         escribir, puede que el mensaje SÍ haya llegado y solo se haya
         perdido la respuesta. Decir «no se pudo» ahí sería la mentira
         que hace que alguien lo escriba dos veces. */
      let r;
      if (objetivo) {
        r = await conPlazo(crearComentario({
          hilo: objetivo.hilo, padre: objetivo.padre,
          texto: campoCuerpo.value, nombre: campoNombre.value, anonima: campoAnonima.checked,
        }), PLAZO_ESCRIBIR, 'La comunidad no contestó a tiempo al enviarlo.');
      } else {
        r = await conPlazo(crearHilo({
          titulo: campoTitulo.value, cuerpo: campoCuerpo.value, etiqueta: campoEtiqueta.value,
          nombre: campoNombre.value, anonima: campoAnonima.checked,
        }), PLAZO_ESCRIBIR, 'La comunidad no contestó a tiempo al enviarlo.');
      }

      llaveTexto.textContent = r.llave;
      llaveBox.hidden = false;

      estadoEl.hidden = false;
      estadoEl.textContent = r.estado === 'revision'
        ? 'Se está revisando antes de publicarse. Lo puedes ver tú.'
        : 'Publicado.';

      /* Si lo que se acaba de publicar entra en la vista actual (orden
         reciente, sin etiqueta, o con la etiqueta que toca), se pinta al
         instante en vez de esperar a la próxima carga. */
      if (r.hilo && estado.orden === 'recientes' && (!estado.etiqueta || estado.etiqueta === r.hilo.etiqueta)) {
        const primero = plantillaHilo.content.firstElementChild;
        pintarHilo(r.hilo);
        lista.prepend(lista.lastElementChild);
        dispatchEvent(new Event('resize'));
      } else if (!objetivo) {
        /* Si no se pudo pintar en el sitio —porque la relectura falló,
           o porque la vista está en otro orden o en otra etiqueta—, se
           recarga la lista. Publicar y no ver nada aparecer es lo que
           hace pensar que no se publicó, y ya pasó una vez. */
        cargarPagina(true);
      }

      campoCuerpo.value = '';
      if (!objetivo) { campoTitulo.value = ''; }
      actualizarContador();
    } catch (err) {
      estadoEl.hidden = false;
      estadoEl.textContent = mensajeDeError(err);
    } finally {
      boton.disabled = false;
    }
  });

  const cancelarRespuesta = document.createElement('button');
  cancelarRespuesta.type = 'button';
  cancelarRespuesta.hidden = true;
  cancelarRespuesta.className = 'boton boton--fantasma';
  cancelarRespuesta.textContent = 'Escribir un hilo nuevo en su lugar';
  cancelarRespuesta.addEventListener('click', () => { volverAHiloNuevo(); cancelarRespuesta.hidden = true; });
  form.append(cancelarRespuesta);
  const prepararRespuestaOriginal = prepararRespuesta;

  /* ═══ CUANDO ALGO FALLA, SE DICE QUÉ ═════════════════════════════
     Esto acababa en «No se pudo publicar. El texto sigue aquí — puedes
     reintentar» para TODO lo que no reconocía, y esa frase no ayuda a
     nadie: no dice si hay que esperar, cambiar lo escrito, revisar la
     conexión o volver mañana. Quien está escribiendo aquí no está para
     adivinar.

     Y hacia dentro era peor: el error real se perdía, así que ni quien
     escribe ni quien mantiene el sitio podían ver la causa. Ahora cada
     familia tiene su frase, y lo que no encaje en ninguna sale con su
     mensaje literal detrás — feo, sí, pero cierto. Un mensaje feo que
     dice la verdad se arregla; uno bonito que no dice nada, no.

     El objeto entero va además a la consola: es lo único que permite
     mirar desde fuera qué contestó la base. */
  function mensajeDeError(err, verbo = 'publicar') {
    const msg = String(err?.message || '');
    const codigo = err?.code || err?.status || '';
    console.error(`[comunidad] no se pudo ${verbo}`, { codigo, mensaje: msg, err });

    /* Lo que la propia casa decide, y ya viene redactado. */
    if (/demasiado rápido|no se puede publicar aquí/i.test(msg)) return msg;

    /* Lo que no cabe. */
    if (/char_length\(titulo\)|titulos?_check/i.test(msg))
      return `El título tiene que medir entre ${limites.titulo[0]} y ${limites.titulo[1]} caracteres.`;
    if (/violates check constraint|char_length/i.test(msg))
      return 'Eso no cabe en el tamaño permitido — revisa el título o el texto.';
    if (/hilo ya no está/i.test(msg)) return 'Ese hilo ya no está disponible.';

    /* El plazo se agotó: la petición ni volvió ni falló. */
    if (/no contestó a tiempo al enviarlo/i.test(msg))
      return 'La comunidad no contestó a tiempo. Puede que sí se haya enviado: '
           + 'recarga la página y míralo antes de volver a escribirlo.';
    if (/no contestó a tiempo/i.test(msg))
      return 'La comunidad no contestó a tiempo. Puede ser tu conexión o la base; '
           + 'vuelve a intentarlo.';

    /* No hay red, o la hay y no llega. `Failed to fetch` es lo que dice
       el navegador cuando la petición ni sale ni vuelve. */
    if (/failed to fetch|networkerror|load failed|fetch/i.test(msg))
      return verbo === 'publicar'
        ? 'No hay conexión con la comunidad. Lo que escribiste sigue aquí; inténtalo otra vez en un momento.'
        : 'No hay conexión con la comunidad. Inténtalo otra vez en un momento.';

    /* La sesión anónima. Supabase limita cuántas se pueden abrir por
       hora desde una misma conexión, y cuando se pasa lo dice así. */
    if (/anonymous|sign.?in|refresh token|jwt|401|unauthorized/i.test(msg))
      return 'No se pudo abrir una sesión anónima para publicar. '
           + 'Si acabas de recargar muchas veces, espera unos minutos. '
           + `(${msg})`;
    if (/429|rate limit|too many/i.test(msg))
      return 'La comunidad está recibiendo demasiadas peticiones ahora mismo. '
           + 'Espera un momento y vuelve a intentarlo.';

    /* Permisos: es lo que sale si una política o un GRANT no está donde
       tiene que estar. Le pasó a este proyecto con `garzas_publico`. */
    if (/permission denied|row-level security|violates row/i.test(msg))
      return `La base rechazó el mensaje por permisos. Esto es un fallo del sitio, no tuyo. (${msg})`;

    /* Y lo que no sea nada de lo anterior, con su texto detrás. */
    if (msg) return `No se pudo ${verbo}: ${msg}`;
    return verbo === 'publicar'
      ? 'No se pudo publicar. El texto sigue aquí — puedes reintentar.'
      : 'No se pudo cargar la comunidad.';
  }

  /* ═══ 7 · ORDENAR Y FILTRAR ═══════════════════════════════════════
     Ahora ordena Supabase, no el DOM: cambiar de criterio o de etiqueta
     reinicia cursor e instantánea y vuelve a pedir desde el principio. */
  const nota = mando.querySelector('[data-nota-orden]');

  /* ═══ UN PLAZO, PORQUE UNA PROMESA PUEDE NO VOLVER NUNCA ══════════
     No basta con capturar el error: una petición que ni sale ni vuelve
     no lanza nada, se queda. Y `supabase-js`, cuando la sesión se le
     ha caído por red, reintenta por dentro con espera creciente — o
     sea que la promesa de leer puede tardar minutos en decidirse.

     Medido, con la salida a internet cortada, que es lo que ve alguien
     sin cobertura:

       · antes de tocar nada ....... 13.08 s hasta enseñar el error
       · al dejar de exigir sesión .. NO TERMINABA — más de 60 s en
         «Cargando lo que se ha escrito…», sin error y sin lista
       · con este plazo ............ 12.18 s, y diciendo qué pasó

     La segunda línea es el fallo que este plazo repara, y lo introduje
     yo al hacer que la lectura no dependiera de entrar: la excepción
     dejó de llegar, pero la espera se quedó.

     Un plazo convierte «no vuelve» en «no contestó», que es una frase
     que sí se puede enseñar. */
  const PLAZO_LEER = 12_000;
  const PLAZO_ESCRIBIR = 25_000;
  function conPlazo(promesa, ms, aviso) {
    let reloj;
    return Promise.race([
      Promise.resolve(promesa).finally(() => clearTimeout(reloj)),
      new Promise((_, rechazar) => { reloj = setTimeout(() => rechazar(new Error(aviso)), ms); }),
    ]);
  }

  async function cargarPagina(reiniciar) {
    if (cargando) return;
    cargando = true;
    if (reiniciar) {
      lista.replaceChildren();
      cursor = ''; instantanea = null; hayMas = true;
      pillNuevos.hidden = true;
      vacio.hidden = true;
      errorEl.hidden = true;
      carga.hidden = false;
      if (!quieto.matches) {
        lista.classList.remove('hilos--mojada'); void lista.offsetWidth; lista.classList.add('hilos--mojada');
      }
    }
    botonMas.disabled = true;
    try {
      const r = await conPlazo(
        listar({ orden: estado.orden, etiqueta: estado.etiqueta, cursor, instantanea }),
        PLAZO_LEER, 'La comunidad no contestó a tiempo.');
      instantanea = r.instantanea; cursor = r.cursor; hayMas = !!r.cursor;
      for (const h of r.hilos) pintarHilo(h);
      await cargarComentariosDe(r.hilos);

      carga.hidden = true;
      vacio.hidden = lista.children.length > 0;
      if (lista.children.length === 0) {
        vacio.textContent = estado.etiqueta
          ? 'Todavía no hay hilos con esta etiqueta. Puedes abrir el primero.'
          : 'Todavía no ha escrito nadie. Puedes abrir el primer hilo.';
      }
      paginacion.hidden = lista.children.length === 0;
      botonMas.hidden = !hayMas;
      finEl.hidden = hayMas;
      dispatchEvent(new Event('resize'));
    } catch (err) {
      carga.hidden = true;
      /* El aviso decía «No se pudo llegar a la comunidad ahora mismo» y
         nada más, viniera de donde viniera. Ahora dice de qué murió:
         sin eso, ni quien mira sabe si esperar o recargar, ni quien
         mantiene el sitio puede saber qué preguntar. */
      if (lista.children.length === 0) {
        errorEl.hidden = false;
        const detalle = errorEl.querySelector('[data-detalle]')
          || Object.assign(document.createElement('span'), { className: 'hilos__error-detalle' });
        detalle.dataset.detalle = '';
        detalle.textContent = ' ' + mensajeDeError(err, 'cargar');
        /* Detrás de la frase de siempre y DELANTE del botón: así se lee
           «no se pudo llegar · por esto · reintentar», en ese orden. */
        const boton = errorEl.querySelector('[data-reintentar]');
        if (boton) errorEl.insertBefore(detalle, boton); else errorEl.append(detalle);
      }
    } finally {
      cargando = false;
      botonMas.disabled = false;
    }
  }

  mando.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || !mando.contains(b)) return;
    if (b.dataset.orden !== undefined) {
      estado.orden = b.dataset.orden;
      for (const x of mando.querySelectorAll('[data-orden]')) x.setAttribute('aria-pressed', String(x === b));
      if (nota) nota.hidden = estado.orden !== 'solas';
      aviso.textContent = estado.orden === 'solas' ? 'Primero los hilos que nadie ha respondido.'
        : estado.orden === 'votados' ? 'Primero los hilos más votados.' : 'Primero los hilos más recientes.';
      cargarPagina(true);
    } else if (b.dataset.etiqueta !== undefined) {
      estado.etiqueta = b.dataset.etiqueta;
      for (const x of mando.querySelectorAll('[data-etiqueta]')) x.setAttribute('aria-pressed', String((x.dataset.etiqueta || '') === estado.etiqueta));
      cargarPagina(true);
    }
  });

  botonMas.addEventListener('click', () => cargarPagina(false));
  seccion.querySelector('[data-reintentar]')?.addEventListener('click', () => cargarPagina(true));

  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entradas) => {
      if (entradas.some((en) => en.isIntersecting) && hayMas && !cargando) cargarPagina(false);
    }, { rootMargin: '100% 0px' });
    obs.observe(centinela);
  }

  /* ═══ 8 · «N HILOS NUEVOS» ════════════════════════════════════════
     Sin WebSocket propio para el foro (ver LEEME.md), esto es un
     sondeo, no un empuje en vivo: cada 45 s, mientras la pestaña está
     visible, se pregunta cuántos han llegado desde la instantánea. */
  async function sondear() {
    if (document.hidden || !instantanea || cargando) return;
    try {
      const n = await nuevosDesde(instantanea, estado.etiqueta);
      if (n > 0) {
        pillNuevos.hidden = false;
        pillNuevos.textContent = n === 1 ? '1 hilo nuevo' : `${n} hilos nuevos`;
      }
    } catch { /* un sondeo que falla no necesita avisar de nada */ }
  }
  pillNuevos.addEventListener('click', () => { pillNuevos.hidden = true; cargarPagina(true); });
  const relojSondeo = setInterval(sondear, 45_000);

  /* ═══ 9 · COPIAR LA LLAVE ═════════════════════════════════════════ */
  llaveBox.querySelector('[data-llave-copiar]')?.addEventListener('click', async (e) => {
    try {
      await navigator.clipboard.writeText(llaveTexto.textContent || '');
      e.currentTarget.textContent = 'Copiada';
      setTimeout(() => { e.currentTarget.textContent = 'Copiar'; }, 2000);
    } catch { /* portapapeles sin permiso: la llave sigue visible para copiar a mano */ }
  });

  await cargarPagina(true);

  /* Asidero de medición, y NO va detrás de `import.meta.env.DEV` — la
     misma regla que `window.__garzas` en main.js: las pruebas de
     extremo a extremo corren contra el sitio COMPILADO, así que un
     asidero que solo existe en desarrollo es un asidero que no se
     puede usar para medir lo que se publica. Es de LECTURA de cosas
     que ya están en pantalla —qué orden hay puesto, cuántos hilos se
     pintaron— y `recargar()` no hace nada que no haga el botón de
     «Traer más».

     Y que EXISTA significa algo por sí solo: se define en la última
     línea de `arrancar()`, o sea que si está, el módulo llegó entero
     hasta el final. Lo comprueba foro.spec.js. */
  window.__com = {
    estado: () => ({ orden: estado.orden, etiqueta: estado.etiqueta, hilos: lista.children.length, hayMas }),
    recargar: () => cargarPagina(true),

    /* ── UN DIAGNÓSTICO QUE SE PUEDE PEGAR ────────────────────────
       Recorre la cadena entera —entrar, leer, escribir, borrar— y
       devuelve qué paso falló y con qué mensaje. Existe porque un
       fallo del foro solo se ve desde el navegador de quien lo sufre:
       desde fuera, y desde Node, todo contesta bien.

       Escribe y borra un hilo de prueba con su propia llave. Si algo
       revienta a mitad, lo dice en vez de dejar basura en silencio. */
    async diagnostico() {
      const pasos = [];
      const anota = (paso, err, extra) => {
        pasos.push({ paso, ok: !err, error: err ? String(err.message || err) : null, ...extra });
        return !err;
      };
      const m = await import('./supabase-cliente.js');
      try {
        const sesion = await m.entrar();
        anota('entrar sin cuenta', null, { uid: sesion?.user?.id?.slice(0, 8) + '…' });
      } catch (e) { anota('entrar sin cuenta', e); return pasos; }

      try {
        const r = await m.listar({ limite: 3 });
        anota('leer los hilos', null, { hilos: r.hilos.length });
      } catch (e) { anota('leer los hilos', e); }

      let creado = null;
      try {
        creado = await m.crearHilo({
          titulo: 'Diagnóstico automático del foro',
          cuerpo: 'Escrito por window.__com.diagnostico(). Se borra solo.',
          etiqueta: '', nombre: '', anonima: true,
        });
        anota('publicar', null, { estado: creado.estado });
      } catch (e) { anota('publicar', e); }

      if (creado) {
        try { anota('borrar lo escrito', null, { borrado: await m.borrarConLlave('hilo', creado.id, creado.llave) }); }
        catch (e) { anota('borrar lo escrito', e, { id: creado.id, llave: creado.llave }); }
      }
      console.table(pasos);
      return pasos;
    },
  };
}
