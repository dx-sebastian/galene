/* ═══════════════════════════════════════════════════════════════════
   mapa.js — tres mapas, no uno con tres capas.

   Emergencia (dónde hay una puerta abierta), Luz (dónde estaré hoy) y
   Sombra (dónde no ir). Cada uno tiene su cartografía, su color y su
   forma de hablar, y se cambia entre ellos con una pestaña. El de
   emergencia es el que sale primero y es el único que no depende de
   que nadie haya escrito nada antes.

   ── LA CARTOGRAFÍA, Y POR QUÉ NO LLEVA NOMBRES ───────────────────
   Las teselas son las de CARTO sin etiquetas: calles, manzanas, agua y
   verde, sin un solo topónimo. Tres razones, en este orden:

     1. El nombre de la calle en un mapa de emergencia es ruido. Quien
        lo abre no está leyendo, está buscando un punto de color y una
        dirección que copiar. Lo que hace falta leer va en la ficha de
        abajo, en la tipografía del sitio, a tamaño de lectura y con
        contraste medido — no en una etiqueta gris de 9 px encima de
        una carretera.

     2. Un mapa de sombra CON nombres es otra cosa. «Aquí pasó algo»
        sobre un letrero con el nombre del bar convierte una nota
        privada en una acusación publicable. Sin topónimos, el punto
        dice dónde, no a quién.

     3. Sin nombres, el mapa puede teñirse. Toda la sección está
        pintada a dos tintas sobre papel, y una capa de etiquetas de
        Google-gris dentro rompe eso más que cualquier otra cosa. Lo
        que se ve es una carta dibujada, no una captura de pantalla.

   El teñido se hace con `filter` sobre el panel de teselas y una
   aguada encima (ver estilos.css → CARTOGRAFÍA). Los puntos van por
   encima de la aguada, sin filtro: la ley de la casa —la imperfección
   vive en el mundo, el instrumento es exacto— también aplica aquí. El
   papel puede estar teñido; el punto que dice dónde hay urgencias,
   no.

   ── LO QUE NO PUEDE PASAR ────────────────────────────────────────
   Nada de esto puede retrasar la ayuda. Leaflet se carga en diferido y
   solo cuando el mapa se acerca a la pantalla; si el CDN no responde,
   la sección se degrada a una lista con el 123 arriba y el resto del
   sitio ni se entera.

   ── PRIVACIDAD ───────────────────────────────────────────────────
   · Las teselas las sirve CARTO y los puntos de emergencia los sirve
     Overpass: esos dos servidores ven una petición desde su IP. No se
     les manda su ubicación ni nada del caso.
   · «Dónde estoy» pide geolocalización, la usa para centrar y la
     descarta. No se guarda y no se envía.
   · Sus marcas se quedan en su aparato (ver js/marcas.js). Este sitio
     no tiene servidor donde ponerlas.
   ═══════════════════════════════════════════════════════════════════ */

import {
  MODOS, modoPor, CIUDADES, ciudadPor, ciudadDeAqui, buscarCiudades,
  TODAS_CIUDADES, CAPAS, capaPor, tiposDe, tipoPor, porCiudad,
} from './lugares.js';
import * as marcas from './marcas.js';
import { buscarAyuda, distancia } from './ayuda.js';

/* ── LEAFLET VIVE AQUÍ DENTRO, NO EN UN CDN ────────────────────────
   Se cargaba de unpkg.com con su hash de integridad, y el argumento
   era el de siempre: un CDN va más rápido y lo tiene todo el mundo en
   caché. En una página de emergencia ese argumento no vale — medido en
   este mismo proyecto, unpkg tumbado deja la sección sin mapa aunque
   la red vaya bien, y la única señal es «el mapa necesita conexión».

   Servido desde el propio sitio no hay tercero que pueda caerse: si
   cargó la página, cargó el mapa. Son 150 kB que ya están en el mismo
   dominio y con la misma caché. Copia exacta de leaflet 1.9.4, en
   public/vendor/leaflet (se actualiza con `npm i leaflet@…` y el
   copiado de dist/). */
const BASE = (import.meta.env?.BASE_URL || '/').replace(/\/?$/, '/');
const LEAFLET_CSS = `${BASE}vendor/leaflet/leaflet.css`;
const LEAFLET_JS  = `${BASE}vendor/leaflet/leaflet.js`;

/* Teselas SIN ETIQUETAS. Dos juegos, uno por tinta: con papel claro va
   el mapa claro y con papel oscuro el oscuro, porque el mapa es papel
   —tiene que invertirse con la página, como todo lo demás—. La hora
   local cambia `data-tinta` sola a lo largo del día y el mapa la
   sigue (ver el observador del final).

   `{r}` lo resuelve Leaflet con detectRetina: en pantallas densas pide
   la tesela @2x y el trazo no se ve pastoso. */
const TESELAS = {
  oscura: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
  clara:  'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
};
const CREDITO = '© OpenStreetMap · © CARTO';

/* SI CARTO NO RESPONDE, EL MAPA NO SE QUEDA EN BLANCO. Las teselas de
   CARTO son las que van con la estética del sitio —sin topónimos, para
   que el papel mande— pero son de un tercero y un tercero se cae. El
   respaldo es el mapa estándar de OpenStreetMap: más cargado, menos
   bonito, y con los nombres de las calles encima. En una emergencia
   eso último no es un defecto. */
const RESPALDO = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const CREDITO_RESPALDO = '© OpenStreetMap';

const quieto = matchMedia('(prefers-reduced-motion: reduce)');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const cerca = (m) => m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`;

/* ── CÓMO LLEGAR ───────────────────────────────────────────────────
   WAZE PRIMERO, por pedido del dueño y porque en Colombia es lo que
   lleva el taxi. `navigate=yes` arranca la ruta al abrir en el móvil
   y en escritorio cae a la web de Waze; si no está instalada la app,
   el sistema abre la web y no se pierde nadie.

   Google Maps se queda al lado como segunda puerta: es la que entiende
   cualquiera y la que funciona sin app ninguna.

   Las dos son enlaces que ella pulsa, se abren fuera, van sin referente
   y lo único que viaja es la coordenada de un hospital. */
const aWaze = (ll) => `https://www.waze.com/ul?ll=${ll[0]}%2C${ll[1]}&navigate=yes&zoom=17`;
const aMaps = (ll) => `https://www.google.com/maps/dir/?api=1&destination=${ll[0]},${ll[1]}`;

const enHoras = (t) => {
  const min = Math.round((t - Date.now()) / 60000);
  if (min <= 0) return 'ya pasó';
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  return h < 36 ? `${h} h` : `${Math.round(h / 24)} días`;
};

/* ── CARGA DIFERIDA DE LEAFLET ───────────────────────────────────── */
const cargar = (() => {
  let promesa = null;
  return () => promesa || (promesa = new Promise((ok, mal) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = LEAFLET_CSS;
    document.head.appendChild(css);
    const js = document.createElement('script');
    js.src = LEAFLET_JS;
    /* Sin `integrity` ni `crossOrigin`: el fichero es del propio sitio,
       y un hash a mano sobre un fichero propio solo sirve para romper
       el mapa el día que se actualice la librería y nadie lo recuerde. */
    js.onload = () => ok(window.L);
    js.onerror = () => mal(new Error('sin red'));
    document.head.appendChild(js);
  }));
})();

export function montarMapa(host) {
  if (!host) return;

  const $ = (s) => host.querySelector(s);
  const lienzo    = $('.mapa__lienzo');
  /* Los dos pueden NO existir: con un solo mapa visible no se pintan
     las pestañas ni el pie que las explica (ver Mapa.astro). */
  const pestanas  = $('.mapa__modos');
  const pie       = $('.mapa__pie');
  const vCiudad   = $('[data-ciudad-actual]');
  const vCapas    = $('[data-capas-cuenta]');
  const urgente   = $('.mapa__urgente');
  const fichas    = $('.mapa__ciudades');
  const otras     = $('.mapa__otras');
  const otrasLista= $('.mapa__otras-lista');
  const buscador  = $('.mapa__buscar input');
  const capasCaja = $('.mapa__capas');
  const listado   = $('.mapa__listado');
  const aviso     = $('.mapa__aviso');
  const estado    = $('.mapa__estado');
  const nueva     = $('.mapa__nueva');
  const bMarcar   = $('.mapa__marcar');
  const bCompartir= $('.mapa__compartir');
  const bAqui     = $('.mapa__aqui');
  const permiso   = $('.mapa__permiso');

  let L = null, mapa = null, capaTeselas = null, grupo = null;
  let marcaAqui = null;                // el punto de «estás aquí», si lo hay
  let peticion = null;                 // aborta la consulta de Overpass en curso

  const est = {
    modo: host.dataset.modo || MODOS[0].id,
    ciudad: ciudadPor(host.dataset.ciudad) || CIUDADES[0],
    /* «Centros de salud» APAGADA de entrada, y es una decisión de
       urgencia, no de diseño: es la capa gorda —consultorios y
       clínicas, miles de elementos en una capital— y era la que
       mataba la consulta por tiempo. Lo que se necesita YA es
       urgencias, acompañamiento y denuncia; los consultorios, que
       casi nunca abren de noche, se encienden con su casilla y
       llegan solos porque su consulta viaja ligera. */
    capas: new Set(CAPAS.map((c) => c.id).filter((id) => id !== 'salud')),
    capasTraidas: '',                  // qué firma de capas trajo Overpass
    osm: [],                           // lo último que trajo Overpass
    truncado: false,                   // ¿se llenó el tope de la consulta?
    fallo: null,
    cargando: false,
    marcando: false,
    punto: null,                       // dónde va a caer la marca nueva
    /* Dónde está ella, si lo concedió. Vive en esta variable y en
       ningún sitio más: ni localStorage, ni sessionStorage, ni una
       petición. Muere con la pestaña. */
    aqui: null,
    /* Hasta que la sección no se acerca a la pantalla no se pide NADA
       a la red: ni Leaflet, ni teselas, ni Overpass. Alguien que entra
       y no baja hasta aquí no genera una sola petición de mapa. */
    despierto: false,
  };

  /* ── MOVER EL MAPA ───────────────────────────────────────────────
     prefers-reduced-motion APAGA el vuelo, no lo acorta: quien lo pide
     no quiere un viaje más corto, quiere no viajar. */
  const ir = (ll, zoom) => {
    if (!mapa) return;
    if (quieto.matches) mapa.setView(ll, zoom);
    else mapa.flyTo(ll, zoom, { duration: 0.9 });
  };

  const decir = (texto, malo = false) => {
    estado.textContent = texto || '';
    estado.hidden = !texto;
    estado.classList.toggle('mapa__estado--malo', !!malo);
  };

  /* ═══ 1 · LOS PUNTOS ═══════════════════════════════════════════ */

  /* Un punto es una aguada con un aro de tinta encima: la mancha da el
     color de la capa y el aro le devuelve el borde exacto, que es lo
     que lo hace legible sobre cualquier tesela. El pigmento entra por
     variable para que el CSS no repita cuatro veces la misma regla. */
  const icono = (pigmento, clase = '') => L.divIcon({
    className: `punto ${clase}`,
    html: `<span class="punto__gota" style="--pigmento:${pigmento}"></span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -12],
  });

  function globoAyuda(l) {
    const capa = capaPor(l.capa);
    return `<div class="globo">
      <p class="globo__que" style="--pigmento:${capa.pigmento}">${esc(capa.nombre)}</p>
      <p class="globo__nombre">${esc(l.nombre)}</p>
      ${l.direccion ? `<p class="globo__dato">${esc(l.direccion)}</p>` : ''}
      ${l.horario ? `<p class="globo__dato">${esc(l.horario)}</p>` : ''}
      ${l.telefono ? `<p class="globo__dato"><a href="tel:${esc(l.telefono.replace(/\s/g, ''))}">${esc(l.telefono)}</a></p>` : ''}
      <p class="globo__ir">
        <a class="lugar__waze" href="${aWaze(l.ll)}" rel="noopener noreferrer" target="_blank">Ir con Waze</a>
        <a href="${aMaps(l.ll)}" rel="noopener noreferrer" target="_blank">Maps</a>
      </p>
      <p class="globo__fuente">${l.verificado
        ? `Verificado por Galene el ${esc(l.verificado)}`
        : 'Dato de OpenStreetMap. Nadie de Galene lo ha comprobado.'}</p>
    </div>`;
  }

  function globoMarca(m) {
    const modo = modoPor(m.modo);
    return `<div class="globo">
      <p class="globo__que" style="--pigmento:${modo.pigmento}">${esc(tipoPor(m.modo, m.tipo).nombre)}</p>
      ${m.nota ? `<p class="globo__nombre">${esc(m.nota)}</p>` : ''}
      <p class="globo__dato">${m.ajena ? 'Te lo compartieron' : 'Tuyo'} · se borra en ${esc(enHoras(m.caduca))}</p>
      <p class="globo__fuente"><button type="button" class="globo__borrar" data-borrar="${esc(m.id)}">Borrar este punto</button></p>
    </div>`;
  }

  /* CUÁNTOS PUNTOS CABEN EN UN MAPA ANTES DE QUE DEJE DE SER UN MAPA.
     Bogotá devuelve más de quinientos sitios en once kilómetros, y
     pintados todos a la vez el resultado es una mancha: no se distingue
     un hospital de un consultorio y no se ve la calle por debajo. Se
     dibujan los CIEN MÁS CERCANOS al centro de la búsqueda —que ya
     vienen ordenados así— y se dice en el listado cuántos hay en total.
     Quien quiera ver otros mueve el mapa y cambia el centro. */
  const TOPE_PUNTOS = 100;

  function puntosEmergencia() {
    /* Los verificados por nosotros van SIEMPRE, aunque su capa esté
       apagada nunca se esconden por error: se filtran igual que el
       resto, pero se dibujan encima y con otra marca. */
    const propios = porCiudad(est.ciudad.id).filter((l) => est.capas.has(l.capa));
    const ajenos  = est.osm.filter((l) => est.capas.has(l.capa)).slice(0, TOPE_PUNTOS);
    for (const l of ajenos) {
      L.marker(l.ll, { icon: icono(capaPor(l.capa).pigmento), keyboard: true,
        alt: `${capaPor(l.capa).nombre}: ${l.nombre}` })
        .addTo(grupo).bindPopup(globoAyuda(l));
    }
    for (const l of propios) {
      L.marker(l.ll, { icon: icono(capaPor(l.capa).pigmento, 'punto--firme'),
        alt: `${capaPor(l.capa).nombre}: ${l.nombre}` })
        .addTo(grupo).bindPopup(globoAyuda(l));
    }
  }

  function puntosMarcas() {
    const modo = modoPor(est.modo);
    for (const m of marcas.listar(est.modo)) {
      L.marker(m.ll, { icon: icono(modo.pigmento, m.ajena ? 'punto--ajeno' : ''),
        alt: tipoPor(m.modo, m.tipo).nombre })
        .addTo(grupo).bindPopup(globoMarca(m));
    }
  }

  function pintarPuntos() {
    if (!mapa) return;
    grupo.clearLayers();
    if (est.modo === 'emergencia') puntosEmergencia();
    else puntosMarcas();
  }

  /* ═══ 2 · LA LISTA DE ABAJO ════════════════════════════════════
     El mapa dice DÓNDE; la lista dice QUÉ, y es la que se puede leer
     sin ver, copiar y marcar por teléfono. Todo lo que está en el
     mapa está aquí: si algo solo existiera como punto de color, el
     sitio sería inservible con lector de pantalla. */

  /* Cómo se nombra el centro de la búsqueda. Cuando es ella, el mapa
     habla de «tu zona» y las distancias son «de ti»: la diferencia
     entre «a 400 m del centro» y «a 400 m de ti» es la diferencia
     entre un dato y una indicación. */
  const donde = () => (est.ciudad.propia ? 'tu zona' : est.ciudad.nombre);
  const desde = () => (est.ciudad.propia ? 'de ti' : 'del centro');

  function listaEmergencia() {
    const propios = porCiudad(est.ciudad.id).filter((l) => est.capas.has(l.capa));
    /* LA CUENTA SE HACE SOBRE LO ENCENDIDO, no sobre todo lo que trajo
       Overpass. Decía «los 3 más cercanos, de 4» cuando el cuarto no
       estaba escondido por lejano sino por tener su capa apagada: dos
       cosas distintas contadas como una, y la frase mandaba a buscar un
       sitio que no iba a aparecer moviendo el mapa. */
    const enCapas = est.osm.filter((l) => est.capas.has(l.capa));
    const ajenos  = enCapas.slice(0, 40);

    /* Antes de que la sección despierte no se ha preguntado nada, así
       que no se puede decir «no hay nada»: se diría de un sitio donde
       ni se ha mirado, y en esta página una frase así se lee como una
       puerta cerrada. */
    if (!est.despierto && !propios.length) {
      return `<p class="mapa__vacio">Los sitios de atención aparecen aquí en
        cuanto el mapa cargue. <strong>El 123 de arriba no necesita esperar
        a nada.</strong></p>`;
    }
    if (est.cargando) {
      return `<p class="mapa__vacio">Preguntando a OpenStreetMap qué hay en
        ${esc(donde())}… <strong>puede tardar unos segundos.</strong>
        El 123 de arriba funciona ya.</p>`;
    }
    if (est.fallo && !propios.length) {
      /* CUANDO OVERPASS NO CONTESTA, ESTO NO PUEDE SER UN CALLEJÓN.
         Antes había un botón de reintentar y nada más, y eso deja a
         alguien mirando una pantalla que no le dice a dónde ir. Ahora
         el fallo sale con tres salidas de verdad: el 123, y los dos
         buscadores de hospitales cercanos —Waze y Maps— que funcionan
         aunque OpenStreetMap esté caído, porque son otros servidores.
         El reintento se queda, pero ya no es lo único. */
      const centro = est.aqui || est.ciudad.ll;
      return `<p class="mapa__vacio mapa__vacio--malo">
        No se pudo traer el listado de ${esc(donde())}: ${esc(est.fallo)}.
        <strong>El 123 funciona igual</strong>, y en cualquier urgencia de un
        hospital tienen que atenderte sin denuncia y sin cita.</p>
        <p class="lugar__ir mapa__salidas">
          <a class="lugar__waze" href="https://www.waze.com/ul?ll=${centro[0]}%2C${centro[1]}&zoom=15&q=hospital"
             rel="noopener noreferrer" target="_blank">Buscar hospitales en Waze</a>
          <a href="https://www.google.com/maps/search/hospital+urgencias/@${centro[0]},${centro[1]},14z"
             rel="noopener noreferrer" target="_blank">Buscarlos en Maps</a>
          <button type="button" class="enlace-boton" data-reintentar="1">Volver a intentarlo</button>
        </p>`;
    }
    if (!propios.length && !ajenos.length) {
      return `<p class="mapa__vacio">No aparece nada en ${esc(donde())}
        con las capas encendidas. Prueba a encender todas, o mueve el mapa:
        <strong>que OpenStreetMap no lo tenga no significa que no exista.</strong></p>`;
    }

    /* Cada sitio con sus dos puertas de navegación: Waze —la que
       arranca la ruta y la que lleva el taxi— y Maps. Ver `aWaze`. */
    const ficha = (l, verificado) => `
      <li class="lugar${verificado ? ' lugar--firme' : ''}" style="--pigmento:${capaPor(l.capa).pigmento}">
        <p class="lugar__capa">${esc(capaPor(l.capa).nombre)}</p>
        <p class="lugar__nombre">${esc(l.nombre)}</p>
        ${l.direccion ? `<p class="lugar__dato">${esc(l.direccion)}</p>` : ''}
        ${l.horario ? `<p class="lugar__dato">${esc(l.horario)}</p>` : ''}
        ${l.distancia != null ? `<p class="lugar__dato">A ${esc(cerca(l.distancia))} ${desde()}</p>` : ''}
        <p class="lugar__ir">
          <a class="lugar__waze" href="${aWaze(l.ll)}"
             rel="noopener noreferrer" target="_blank">Ir con Waze</a>
          <a href="${aMaps(l.ll)}" rel="noopener noreferrer" target="_blank">Maps</a>
          ${l.telefono ? `<a href="tel:${esc(l.telefono.replace(/\s/g, ''))}">Llamar</a>` : ''}
        </p>
        ${/* Para la demo la coletilla «sin verificar» se pliega a la
              atribución sola; la marca completa vuelve antes de
              publicar de verdad (deuda en GUIA.md). */''}
        <p class="lugar__fuente">${verificado
          ? `Verificado por Galene el ${esc(l.verificado)}`
          : est.deRespaldo ? 'Buscador de OpenStreetMap' : 'Datos de OpenStreetMap'}</p>
      </li>`;

    return `
      <p class="mapa__cuenta">${enCapas.length > ajenos.length
          ? `Los ${ajenos.length} sitios más cercanos ${est.ciudad.propia ? 'a ti' : 'al centro'}, de ${enCapas.length} en ${esc(donde())}`
          : `${propios.length + ajenos.length} sitios en ${esc(donde())}`}.
        <strong>Llama antes de ir si puedes</strong>: los horarios de
        OpenStreetMap los pone gente voluntaria y pueden estar viejos.
        ${est.truncado ? 'Y puede faltar alguno: la zona tiene más de los que caben en una consulta.' : ''}</p>
      <ul class="lugares">
        ${propios.map((l) => ficha(l, true)).join('')}
        ${ajenos.map((l) => ficha(l, false)).join('')}
      </ul>`;
  }

  function listaMarcas() {
    const modo = modoPor(est.modo);
    const mias = marcas.listar(est.modo);
    if (!mias.length) {
      return `<p class="mapa__vacio">
        ${est.modo === 'luz'
          ? `Todavía no has dejado ningún punto. <strong>Deja uno donde vayas a
             estar</strong> y comparte el enlace con quien quieras que lo sepa:
             se borra solo al final del día.`
          : `Todavía no has marcado ningún sitio. <strong>Marca el lugar, no a
             la persona</strong> — sin nombres y sin apodos.`}
      </p>`;
    }
    return `<ul class="lugares">${mias.map((m) => `
      <li class="lugar lugar--marca" style="--pigmento:${modo.pigmento}">
        <p class="lugar__capa">${esc(tipoPor(m.modo, m.tipo).nombre)}</p>
        ${m.nota ? `<p class="lugar__nombre">${esc(m.nota)}</p>` : ''}
        <p class="lugar__dato">${m.ajena ? 'Te lo compartieron' : 'Tuyo'} ·
          se borra en ${esc(enHoras(m.caduca))}</p>
        <p class="lugar__dato">
          <button type="button" class="enlace-boton" data-ver="${esc(m.id)}">Verlo en el mapa</button> ·
          <button type="button" class="enlace-boton" data-borrar="${esc(m.id)}">Borrar</button>
        </p>
      </li>`).join('')}</ul>
      <p class="mapa__cuenta">${mias.length} punto${mias.length > 1 ? 's' : ''} en este
        aparato. <button type="button" class="enlace-boton" data-limpiar="1">Borrarlos todos</button></p>`;
  }

  function pintarListado() {
    listado.innerHTML = est.modo === 'emergencia' ? listaEmergencia() : listaMarcas();
  }

  /* ═══ 3 · CAPAS Y LEYENDA ══════════════════════════════════════
     En emergencia son interruptores —encender y apagar tipos de sitio—
     y a la vez la leyenda del color. En luz y sombra no hay nada que
     filtrar, así que la fila explica qué significa cada punto. */
  /* LOS PLIEGUES DICEN LO QUE ESCONDEN. Ciudad y capas viven plegadas
     para que el mapa se lleve la pantalla; un pliegue cerrado que no
     dice qué tiene puesto obliga a abrirlo para saberlo, y eso es
     scroll disfrazado de orden. */
  function rotularPliegues() {
    if (vCiudad) vCiudad.textContent = est.ciudad.propia ? 'Donde estás' : est.ciudad.nombre;
    if (vCapas) {
      const n = est.capas.size;
      vCapas.textContent = n === CAPAS.length ? 'Todo' : `${n} de ${CAPAS.length}`;
    }
  }

  function pintarCapas() {
    if (est.modo === 'emergencia') {
      capasCaja.innerHTML = CAPAS.map((c) => `
        <label class="capa" title="${esc(c.pie)}">
          <input type="checkbox" ${est.capas.has(c.id) ? 'checked' : ''} data-capa="${c.id}">
          <span class="capa__gota" style="--pigmento:${c.pigmento}"></span>
          <span>${esc(c.nombre)}</span>
        </label>`).join('');
    } else {
      const modo = modoPor(est.modo);
      capasCaja.innerHTML = `
        <span class="capa capa--leyenda">
          <span class="capa__gota" style="--pigmento:${modo.pigmento}"></span>
          <span>Tuyos</span></span>
        <span class="capa capa--leyenda">
          <span class="capa__gota capa__gota--ajena" style="--pigmento:${modo.pigmento}"></span>
          <span>Compartidos contigo</span></span>`;
    }
  }

  /* ═══ 4 · CAMBIAR DE MAPA ══════════════════════════════════════ */
  function aplicarModo(id) {
    est.modo = id;
    host.dataset.modo = id;
    const modo = modoPor(id);

    for (const b of pestanas?.querySelectorAll('[data-modo]') || []) {
      const activa = b.dataset.modo === id;
      b.setAttribute('aria-selected', String(activa));
      b.tabIndex = activa ? 0 : -1;
    }
    if (pie) pie.textContent = modo.pie;
    lienzo.setAttribute('aria-label', `Mapa de ${modo.nombre.toLowerCase()}: ${modo.lema}`);

    urgente.hidden = id !== 'emergencia';
    bMarcar.hidden = id === 'emergencia';
    bCompartir.hidden = id === 'emergencia';
    bMarcar.textContent = id === 'luz' ? 'Dejar dónde estaré' : 'Marcar un sitio';
    cancelarMarca();

    pintarCapas();
    rotularPliegues();
    pintarPuntos();
    pintarListado();
    if (id === 'emergencia') traerAyuda();
  }

  /* ═══ 5 · EMERGENCIA: TRAER LOS SITIOS ═════════════════════════
     UN REINTENTO AUTOMÁTICO ANTES DE RENDIRSE, y viene de un fallo
     real: el día que el dueño lo probó, el espejo de turno devolvía
     504 y la sección enseñaba «volver a intentarlo» — un botón que
     pide a alguien con las manos temblando que insista. Overpass es
     gratis y encola, así que el segundo intento casi siempre acierta
     porque cae en otro espejo. Se intenta solo, una vez, y solo
     entonces se cuenta el fallo. El botón se queda para el segundo. */
  async function traerAyuda({ reintento = false } = {}) {
    if (est.modo !== 'emergencia' || !est.despierto) return;
    peticion?.abort();
    peticion = new AbortController();
    est.cargando = true; est.fallo = null;
    decir(`Buscando sitios de atención en ${donde()}…`);
    pintarListado();
    try {
      const pedidas = [...est.capas];
      const { lugares, truncado, deRespaldo } = await buscarAyuda(est.ciudad,
        { signal: peticion.signal, capas: pedidas });
      est.osm = lugares;
      est.capasTraidas = pedidas.sort().join('+');
      est.truncado = truncado;
      est.deRespaldo = !!deRespaldo;
      est.cargando = false;
      /* Cuando la lista viene del buscador de OpenStreetMap y no de
         Overpass se dice: trae menos campos —sin horario y sin
         teléfono— y quien mire una ficha incompleta tiene derecho a
         saber que no es que el sitio no los tenga. */
      decir(deRespaldo
        ? 'Overpass no respondió: la lista viene del buscador de OpenStreetMap, con menos datos.'
        : '');
    } catch (e) {
      if (peticion.signal.aborted) return;      // cambió de ciudad, no es un fallo
      if (!reintento) {
        decir('El servicio de mapas está lento. Probando otra vez…');
        await new Promise((r) => setTimeout(r, 900));
        if (peticion.signal.aborted) return;
        return traerAyuda({ reintento: true });
      }
      est.osm = [];
      est.cargando = false;
      /* EL MOTIVO EXACTO, EN PANTALLA. Decía siempre «el servicio no
         respondió», y con esa frase no hay forma de distinguir un
         teléfono sin datos de Overpass a rebosar — ni de contárselo a
         nadie. Ahora se dice lo que dijo la red. */
      est.fallo = e.message === 'sin red' ? 'no hay conexión'
        : /^(Overpass|Nominatim) \d+$/.test(e.message) ? e.message
        : e.message === 'sin respuesta' ? 'ningún servidor de mapas respondió'
        : e.message || 'el servicio no respondió';
      decir('No se pudo traer el listado. Abajo queda lo que sí tenemos.', true);
    }
    pintarPuntos();
    pintarListado();
  }

  /* ═══ 5 bis · DÓNDE ESTÁ ELLA ═════════════════════════════════
     El mapa de emergencia solo sirve si está centrado donde ella está:
     los hospitales de la capital de al lado no son ayuda. Por eso se
     pide la ubicación de entrada, con la razón por delante y con la
     salida al lado.

     Lo que se hace con el dato, entero: se centra el mapa, se pide a
     Overpass qué hay en seis kilómetros a la redonda y se pinta un
     punto para que sepa dónde está mirando. No se guarda en el
     aparato, no se mete en ninguna caché y no se envía a este sitio,
     que no tiene servidor. Al cerrar la pestaña no queda nada. */

  const cerrarPermiso = () => { permiso.hidden = true; };

  function ubicar() {
    return new Promise((ok, mal) => {
      if (!navigator.geolocation) { mal(new Error('sin geolocalización')); return; }
      navigator.geolocation.getCurrentPosition(
        (p) => ok([p.coords.latitude, p.coords.longitude]),
        mal,
        { timeout: 12000, maximumAge: 60000, enableHighAccuracy: false });
    });
  }

  /* El punto de «estás aquí» va FUERA del grupo de puntos: ese grupo se
     vacía cada vez que se repinta, y su sitio en el mapa no es un dato
     más que se borra al cambiar de pestaña. */
  function pintarAqui(ll) {
    if (!mapa) return;
    marcaAqui?.remove();
    marcaAqui = L.marker(ll, {
      icon: L.divIcon({ className: 'punto punto--aqui', html: '<span class="punto__gota"></span>',
        iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -12] }),
      alt: 'Donde estás', keyboard: false, zIndexOffset: -100,
    }).addTo(mapa).bindPopup(
      '<div class="globo"><p class="globo__nombre">Estás por aquí</p>' +
      '<p class="globo__fuente">Solo lo sabe este navegador. No se guarda ni se envía.</p></div>');
  }

  /* Centra, busca alrededor y deja de mandar la ciudad: a partir de
     aquí el centro es ella. Las fichas de ciudad se quedan sin marcar
     porque ninguna es la respuesta correcta. */
  function usarUbicacion(ll, { buscar = true } = {}) {
    est.aqui = ll;
    pintarAqui(ll);
    ir(ll, 15);
    if (!buscar) return;
    est.ciudad = ciudadDeAqui(ll);
    host.dataset.ciudad = 'aqui';
    /* ── Y SU CIUDAD QUEDA SEÑALADA ─────────────────────────────────
       El centro de búsqueda es ELLA (seis kilómetros a la redonda),
       pero la ficha de su ciudad se marca igual: es la respuesta a
       «¿dónde estoy mirando?» sin tener que reconocer el plano, y es
       el botón al que volver si arrastra el mapa lejos. A más de 60 km
       de toda ciudad conocida no se marca ninguna — señalar la capital
       de al lado sería mentirle. */
    const cercana = TODAS_CIUDADES
      .map((c) => ({ c, d: distancia(ll, c.ll) }))
      .sort((a, b) => a.d - b.d)[0];
    const marcada = cercana && cercana.d < 60000 ? cercana.c.id : null;
    for (const b of host.querySelectorAll('.ficha[data-id]'))
      b.setAttribute('aria-pressed', String(b.dataset.id === marcada));
    rotularPliegues();
    if (est.modo === 'emergencia') { est.osm = []; pintarPuntos(); traerAyuda(); }
    else pintarListado();
  }

  async function pedirUbicacion({ desdePermiso = false } = {}) {
    decir('Buscando dónde estás…');
    try {
      const ll = await ubicar();
      cerrarPermiso();
      usarUbicacion(ll);
      decir('');
      return ll;
    } catch (e) {
      /* Que diga que no es una respuesta válida y no puede dejarla en
         peor sitio que antes: se cierra el panel y quedan las ciudades,
         que llevan al mismo mapa. */
      cerrarPermiso();
      decir(e.code === 1
        ? 'Sin ubicación no pasa nada: elige tu ciudad ahí arriba.'
        : 'No se pudo saber dónde estás. Elige tu ciudad ahí arriba.', !desdePermiso);
      return null;
    }
  }

  /* Si ya lo había concedido en otra visita, no se le vuelve a
     preguntar: se centra y ya. Preguntar dos veces lo mismo, en esta
     página, se lee como que el sitio no la escuchó. */
  async function tantearPermiso() {
    try {
      const p = await navigator.permissions?.query({ name: 'geolocation' });
      if (p?.state === 'granted') { cerrarPermiso(); await pedirUbicacion(); }
      else if (p?.state === 'denied') cerrarPermiso();
    } catch { /* sin Permissions API se queda el panel, que es lo suyo */ }
  }

  /* ═══ 6 · CIUDADES ═════════════════════════════════════════════ */
  function irACiudad(ciudad) {
    est.ciudad = ciudad;
    host.dataset.ciudad = ciudad.id;
    cerrarPermiso();      // eligió a mano: ya respondió a la pregunta
    for (const b of host.querySelectorAll('.ficha[data-id]'))
      b.setAttribute('aria-pressed', String(b.dataset.id === ciudad.id));
    ir(ciudad.ll, ciudad.zoom);
    /* Los puntos de la ciudad anterior se van SIEMPRE, aunque ahora
       mismo se esté mirando otro mapa: si no, al volver a emergencia
       aparecían los hospitales de Bogotá encima de Pasto. */
    est.osm = []; est.truncado = false;
    rotularPliegues();
    pintarPuntos();
    if (est.modo === 'emergencia') traerAyuda();
    else pintarListado();
  }

  /* «Otra» despliega el resto del país con un buscador. No es una lista
     escondida por vergüenza: es que treinta y ocho botones de entrada
     son treinta y ocho decisiones, y ocho ya son bastantes. */
  function pintarOtras(filtro = '') {
    const lista = buscarCiudades(filtro);
    otrasLista.innerHTML = lista.length
      ? lista.map((c) => `<button type="button" class="ficha" data-id="${c.id}"
           aria-pressed="${c.id === est.ciudad.id}">${esc(c.nombre)}</button>`).join('')
      : `<p class="mapa__vacio">No está en la lista. <strong>El mapa se mueve
          igual</strong>: arrástralo hasta donde estés y los puntos aparecen.</p>`;
  }

  /* ═══ 7 · DEJAR UN PUNTO ═══════════════════════════════════════
     Dos caminos hasta el mismo sitio, porque no todo el mundo puede
     apuntar con precisión a un mapa: tocar el mapa, o usar el centro
     del encuadre (que se maneja con las flechas del teclado). */
  function empezarMarca() {
    est.marcando = true;
    est.punto = null;
    host.classList.add('mapa--marcando');
    decir('Toca el mapa donde quieras dejar el punto, o usa el centro del encuadre.');
    nueva.hidden = true;
    bMarcar.setAttribute('aria-expanded', 'true');
  }

  function cancelarMarca() {
    est.marcando = false;
    est.punto = null;
    host.classList.remove('mapa--marcando');
    nueva.hidden = true;
    nueva.innerHTML = '';
    bMarcar.setAttribute('aria-expanded', 'false');
    decir('');
  }

  function pintarFormulario() {
    const modo = modoPor(est.modo);
    const [lat, lng] = est.punto;
    nueva.innerHTML = `
      <p class="nueva__donde">Punto en <b>${lat.toFixed(5)}, ${lng.toFixed(5)}</b>
        · <button type="button" class="enlace-boton" data-mover="1">cambiar de sitio</button></p>

      <fieldset class="nueva__tipos">
        <legend>${est.modo === 'luz' ? '¿Qué es este sitio?' : '¿Qué pasa aquí?'}</legend>
        ${tiposDe(est.modo).map((t, i) => `
          <label class="nueva__tipo">
            <input type="radio" name="tipo" value="${t.id}" ${i === 0 ? 'checked' : ''}>
            <span>${esc(t.nombre)}</span></label>`).join('')}
      </fieldset>

      ${est.modo === 'luz' ? `
      <fieldset class="nueva__tipos">
        <legend>¿Hasta cuándo?</legend>
        ${marcas.HORAS_LUZ.map((h, i) => `
          <label class="nueva__tipo">
            <input type="radio" name="horas" value="${h.id}" ${i === 1 ? 'checked' : ''}>
            <span>${esc(h.nombre)}</span></label>`).join('')}
      </fieldset>` : ''}

      <label class="nueva__nota">
        <span>Una nota, si quieres (opcional)</span>
        <input type="text" name="nota" maxlength="140" autocomplete="off"
          placeholder="${est.modo === 'luz' ? 'Estoy en el segundo piso' : 'Sin luz desde la esquina'}">
      </label>

      <p class="nueva__cuidado">${est.modo === 'sombra'
        ? '<strong>No escribas nombres, ni apodos, ni matrículas.</strong> Marca el sitio. Un nombre en una nota compartida deja de ser tuyo en cuanto la reenvían.'
        : '<strong>Esto se queda en tu teléfono.</strong> Solo lo ve quien tú decidas, cuando le pases el enlace de compartir.'}</p>

      <div class="salida__acciones">
        <button type="submit" class="boton boton--firme" style="--pigmento:${modo.pigmento}">
          ${est.modo === 'luz' ? 'Dejar el punto' : 'Marcar el sitio'}</button>
        <button type="button" class="boton" data-cancelar="1">Cancelar</button>
      </div>`;
    nueva.hidden = false;
    nueva.querySelector('input')?.focus();
  }

  function ponerPunto(ll) {
    est.punto = [ll.lat ?? ll[0], ll.lng ?? ll[1]];
    decir('');
    pintarFormulario();
    /* Una gota fantasma mientras se rellena: hay que ver dónde va a
       caer antes de decidir qué es. */
    if (mapa) {
      const viejas = [];
      grupo.eachLayer((c) => { if (c._fantasma) viejas.push(c); });
      for (const c of viejas) grupo.removeLayer(c);
      const f = L.marker(est.punto, { icon: icono(modoPor(est.modo).pigmento, 'punto--fantasma') });
      f._fantasma = true;
      f.addTo(grupo);
    }
  }

  /* ═══ 8 · COMPARTIR ════════════════════════════════════════════ */
  async function compartir() {
    const mias = marcas.listar(est.modo).filter((m) => !m.ajena);
    if (!mias.length) { decir('No hay puntos tuyos que compartir todavía.', true); return; }
    const enlace = marcas.enlaceCon(mias);
    const texto = est.modo === 'luz'
      ? `Voy a estar aquí. El enlace abre un mapa con mis puntos y se borra solo:\n${enlace}`
      : `Sitios que mejor evitar. El enlace abre un mapa con los puntos:\n${enlace}`;
    try {
      if (navigator.share) await navigator.share({ text: texto });
      else { await navigator.clipboard.writeText(texto); decir('Enlace copiado. Pégalo donde quieras.'); }
    } catch { /* canceló el diálogo de compartir: no hay nada que decir */ }
  }

  /* Si la página se abrió con un enlace de alguien, NO se importa solo.
     Un enlace no puede escribir en el aparato de nadie sin que se vea
     lo que trae y sin que se diga que sí. */
  function ofrecerImportar() {
    const traidas = marcas.delEnlace();
    if (!traidas.length) return;
    const modo = traidas[0].modo;
    aviso.innerHTML = `Alguien te compartió <strong>${traidas.length}
      punto${traidas.length > 1 ? 's' : ''}</strong> en el mapa de
      ${esc(modoPor(modo).nombre.toLowerCase())}.
      <button type="button" class="boton" data-importar="1">Ponerlos en mi mapa</button>
      <button type="button" class="enlace-boton" data-descartar="1">No, gracias</button>`;
    aviso.hidden = false;
    aviso.dataset.pendiente = '1';
    aviso._traidas = traidas;
  }

  /* ═══ 9 · ARRANQUE DEL MAPA ════════════════════════════════════ */
  function teselasDe() {
    const tinta = document.documentElement.dataset.tinta === 'clara' ? 'clara' : 'oscura';
    return TESELAS[tinta];
  }

  async function arrancar() {
    est.despierto = true;
    try {
      L = await cargar();
    } catch {
      /* Sin Leaflet no hay mapa, y no pasa nada: la lista de abajo es
         la que lleva la información, y sigue entera. */
      lienzo.remove();
      aviso.textContent = 'El mapa necesita conexión. Todo lo de abajo funciona igual.';
      aviso.hidden = false;
      if (est.modo === 'emergencia') traerAyuda();
      return;
    }

    mapa = L.map(lienzo, {
      scrollWheelZoom: false,      // la página no se queda atrapada al bajar
      zoomControl: true,
      attributionControl: true,
      /* EN EL TELÉFONO EL MAPA NO SECUESTRA EL DEDO. Con un dedo se
         desplaza la PÁGINA —que es lo que hace el pulgar el 90 % del
         tiempo— y el mapa se arrastra con dos, como en cualquier mapa
         embebido. Sin esto, bajar por la sección con el dedo encima del
         mapa dejaba la página clavada y el encuadre a la deriva: el
         fallo más reportado de un mapa dentro de un artículo. */
      dragging: !matchMedia('(pointer: coarse)').matches,
      tap: false,
      touchZoom: true,
      bounceAtZoomLimits: false,
      /* Colombia entera cabe entre estos límites con margen. Evita que
         un arrastre despistado acabe en mitad del Pacífico sin saber
         cómo volver. */
      maxBounds: [[-6, -84], [15, -63]],
      maxBoundsViscosity: 0.6,
    }).setView(est.ciudad.ll, est.ciudad.zoom);

    capaTeselas = L.tileLayer(teselasDe(), {
      maxZoom: 19, minZoom: 5, detectRetina: true,
      subdomains: 'abcd', attribution: CREDITO, crossOrigin: true,
    }).addTo(mapa);

    /* EL DIBUJO TAMBIÉN SE CAE. Si CARTO empieza a fallar teselas —red
       mala, servicio caído, un bloqueo por el medio— el mapa se queda
       en un cuadro vacío con puntos flotando, que es peor que no tener
       mapa: parece que no hay nada cerca. Al tercer fallo se cambia al
       mapa estándar de OpenStreetMap y se dice. Una vez y no más: si
       el respaldo también falla, no hay red y eso ya se cuenta solo. */
    let teselasMalas = 0, respaldoPuesto = false;
    capaTeselas.on('tileerror', () => {
      if (respaldoPuesto || ++teselasMalas < 3) return;
      respaldoPuesto = true;
      capaTeselas.setUrl(RESPALDO);
      capaTeselas.options.subdomains = 'abc';
      mapa.attributionControl.addAttribution(CREDITO_RESPALDO);
      decir('El dibujo del mapa venía fallando: se cambió al mapa base de OpenStreetMap.');
    });

    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(mapa);
    grupo = L.layerGroup().addTo(mapa);

    /* LEAFLET MIDE UNA VEZ Y NO VUELVE A MIRAR. Si el contenedor cambia
       de tamaño después —y aquí cambia: el mapa nace en diferido, con la
       sección a medio componer y con un ancho que todavía depende de la
       tipografía que está cargando— se queda pidiendo las teselas del
       tamaño viejo y deja media caja en blanco. Pasó, y se veía como un
       mapa roto. Se le avisa cada vez que la caja cambia. */
    let remedir = null;
    new ResizeObserver(() => {
      clearTimeout(remedir);
      remedir = setTimeout(() => mapa.invalidateSize({ animate: false }), 120);
    }).observe(lienzo);

    mapa.on('focus', () => mapa.scrollWheelZoom.enable());
    mapa.on('blur',  () => mapa.scrollWheelZoom.disable());

    /* Con el dedo, el arrastre se enciende en cuanto hay dos dedos en
       el cristal y se apaga al levantarlos: así el mapa se mueve cuando
       ella quiere moverlo y la página cuando quiere leer. */
    if (matchMedia('(pointer: coarse)').matches) {
      lienzo.addEventListener('touchstart', (e) => {
        if (e.touches.length > 1) mapa.dragging.enable();
      }, { passive: true });
      lienzo.addEventListener('touchend', () => {
        if (!mapa.dragging._draggable?._moving) mapa.dragging.disable();
      }, { passive: true });
    }
    mapa.on('click', (e) => { if (est.marcando) ponerPunto(e.latlng); });

    /* El globo trae un botón de borrar dentro; Leaflet lo mete en su
       propio panel, así que el clic se escucha en el panel. */
    mapa.on('popupopen', (e) => {
      e.popup.getElement()?.addEventListener('click', (ev) => {
        const id = ev.target.closest('[data-borrar]')?.dataset.borrar;
        if (!id) return;
        marcas.borrar(id);
        mapa.closePopup();
        pintarPuntos(); pintarListado();
      });
    });

    /* La tinta cambia sola con la hora local. El mapa es papel: se
       invierte con la página, sin recargar y sin parpadeo. */
    new MutationObserver(() => {
      /* Con el respaldo puesto no se vuelve a las de CARTO: la tinta no
         es razón para devolver el mapa al servidor que acaba de fallar. */
      if (respaldoPuesto) return;
      const url = teselasDe();
      if (capaTeselas && capaTeselas._url !== url) capaTeselas.setUrl(url);
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-tinta'] });

    pintarPuntos();
    await tantearPermiso();
    /* Mientras el panel del permiso sigue abierto no se pregunta nada a
       Overpass: si va a decir que sí, la consulta buena es la de su
       zona, y lanzar antes la de Bogotá es gastar veinte segundos de
       cola ajena en una respuesta que nadie va a mirar. */
    if (est.modo === 'emergencia' && !est.aqui && permiso.hidden) traerAyuda();
  }

  /* ═══ 10 · ESCUCHAS ════════════════════════════════════════════ */

  pestanas?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-modo]');
    if (b) aplicarModo(b.dataset.modo);
  });

  /* Pestañas de verdad: flechas para moverse entre ellas, como manda
     el patrón de tablist. Quien navega con teclado no tiene por qué
     tabular cuatro veces para ver el tercer mapa. */
  pestanas?.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const bs = [...pestanas.querySelectorAll('[data-modo]')];
    const i = bs.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const j = e.key === 'Home' ? 0 : e.key === 'End' ? bs.length - 1
      : (i + (e.key === 'ArrowRight' ? 1 : -1) + bs.length) % bs.length;
    bs[j].focus();
    aplicarModo(bs[j].dataset.modo);
  });

  host.addEventListener('click', (e) => {
    const ficha = e.target.closest('.ficha[data-id]');
    if (ficha) {
      irACiudad(ciudadPor(ficha.dataset.id));
      if (otras.contains(ficha)) cerrarOtras();
      return;
    }
    const otra = e.target.closest('.ficha--otra');
    if (otra) { otras.hidden ? abrirOtras() : cerrarOtras(); return; }

    const ver = e.target.closest('[data-ver]')?.dataset.ver;
    if (ver) {
      const m = marcas.listar(est.modo).find((x) => x.id === ver);
      if (m) ir(m.ll, 16);
      return;
    }
    const borrar = e.target.closest('[data-borrar]')?.dataset.borrar;
    if (borrar && !e.target.closest('.leaflet-popup')) {
      marcas.borrar(borrar); pintarPuntos(); pintarListado(); return;
    }
    if (e.target.closest('[data-limpiar]')) {
      marcas.limpiar(est.modo); pintarPuntos(); pintarListado(); return;
    }
    if (e.target.closest('[data-reintentar]')) { traerAyuda({ reintento: true }); return; }
    if (e.target.closest('[data-mover]')) { empezarMarca(); return; }
    if (e.target.closest('[data-cancelar]')) { cancelarMarca(); pintarPuntos(); return; }
    if (e.target.closest('[data-importar]')) {
      const n = marcas.adoptar(aviso._traidas || []);
      marcas.olvidarEnlace();
      aviso.hidden = true; aviso.textContent = '';
      aplicarModo((aviso._traidas || [])[0]?.modo || est.modo);
      decir(`${n} punto${n === 1 ? '' : 's'} añadido${n === 1 ? '' : 's'} a tu mapa.`);
      return;
    }
    if (e.target.closest('[data-descartar]')) {
      marcas.olvidarEnlace();
      aviso.hidden = true; aviso.textContent = '';
    }
  });

  function abrirOtras() {
    pintarOtras(buscador.value);
    otras.hidden = false;
    host.querySelector('.ficha--otra').setAttribute('aria-expanded', 'true');
    buscador.focus();
  }
  function cerrarOtras() {
    otras.hidden = true;
    host.querySelector('.ficha--otra').setAttribute('aria-expanded', 'false');
  }

  buscador.addEventListener('input', () => pintarOtras(buscador.value));
  buscador.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { cerrarOtras(); host.querySelector('.ficha--otra').focus(); }
    if (e.key === 'Enter') {
      e.preventDefault();
      const primera = otrasLista.querySelector('.ficha');
      if (primera) { irACiudad(ciudadPor(primera.dataset.id)); cerrarOtras(); }
    }
  });

  capasCaja.addEventListener('change', (e) => {
    const c = e.target.dataset?.capa;
    if (!c) return;
    e.target.checked ? est.capas.add(c) : est.capas.delete(c);
    rotularPliegues();
    /* Encender una capa que Overpass aún no trajo dispara su consulta:
       la de emergencia pide solo lo encendido (ver ayuda.js), así que
       lo apagado no existe todavía en est.osm. Apagar nunca pregunta. */
    const faltan = e.target.checked && est.modo === 'emergencia'
      && !est.capasTraidas.includes(c);
    if (faltan) { traerAyuda(); return; }
    pintarPuntos(); pintarListado();
  });

  bMarcar.addEventListener('click', () => {
    if (est.marcando || !nueva.hidden) { cancelarMarca(); pintarPuntos(); return; }
    if (!mapa) { decir('El mapa todavía no ha cargado.', true); return; }
    empezarMarca();
    /* Sin ratón fino y sin ganas de apuntar: el centro del encuadre
       vale, y se coloca con las flechas. Se ofrece de entrada. */
    setTimeout(() => { if (est.marcando && !est.punto) ponerPunto(mapa.getCenter()); }, 0);
  });

  bCompartir.addEventListener('click', compartir);

  nueva.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!est.punto) return;
    const datos = new FormData(nueva);
    marcas.guardar({
      modo: est.modo,
      tipo: datos.get('tipo'),
      ll: est.punto,
      nota: datos.get('nota'),
      ciudad: est.ciudad.id,
      horas: Number(datos.get('horas')) || null,
    });
    cancelarMarca();
    pintarPuntos(); pintarListado();
    decir('Punto guardado en este aparato.');
  });

  bAqui.addEventListener('click', async () => {
    bAqui.disabled = true;
    /* Si está poniendo una marca, la ubicación es PARA la marca y no
       para cambiar de encuadre: quien está diciendo «voy a estar aquí»
       no quiere que el mapa se le vaya a buscar hospitales. */
    if (est.marcando) {
      decir('Buscando dónde estás…');
      const ll = await ubicar().catch(() => null);
      if (ll) { usarUbicacion(ll, { buscar: false }); ponerPunto(ll); }
      else decir('No se pudo saber dónde estás. Toca el mapa a mano.', true);
    } else {
      await pedirUbicacion();
    }
    bAqui.disabled = false;
  });

  permiso.querySelector('.permiso__si').addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    await pedirUbicacion({ desdePermiso: true });
    e.currentTarget.disabled = false;
  });
  permiso.querySelector('.permiso__no').addEventListener('click', () => {
    cerrarPermiso();
    traerAyuda();          // con la ciudad de entrada, para que haya algo
    host.querySelector('.mapa__ciudades .ficha')?.focus();
  });

  /* ═══ 11 · PRIMER PINTADO ══════════════════════════════════════ */
  marcas.purgar();
  pintarCapas();
  pintarListado();
  pintarOtras('');
  ofrecerImportar();
  aplicarModo(est.modo);

  /* El mapa no existe hasta que se acerca a la pantalla: en un móvil
     lento, cargar Leaflet arriba del todo retrasa lo que sí importa. */
  new IntersectionObserver((ent, obs) => {
    if (!ent[0].isIntersecting) return;
    obs.disconnect();
    arrancar();
  }, { rootMargin: '300px' }).observe(host);
}
