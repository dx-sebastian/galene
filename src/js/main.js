/* ═══════════════════════════════════════════════════════════════════
   main.js — orquestación.

   Orden de prioridades, y no se negocia:
   1. Los reflejos (salir / línea) funcionan siempre. Se enganchan
      PRIMERO, antes de tocar el canvas.
   2. La luz de la hora real se aplica al DOM aunque no haya WebGL.
   3. El mar es un enhancement. Si falla, el sitio sigue sirviendo.
   ═══════════════════════════════════════════════════════════════════ */

import { luz, aplicar, horaAhora, notaAmanecer } from './hora.js';
import { crear } from './mar.js';

/* La barra de reflejos —salida rápida y línea de atención— salió del
   sitio: la urgencia se traslada a una app móvil, y aquí volverá más
   adelante de una forma menos literal. */

/* ── 2 · LA HORA ──────────────────────────────────────────────────── */

/* Ganchos de verificación. `?hora=4.5` fuerza la hora para poder medir
   sobre los píxeles en varias luces; `?dev` expone el estado. Nada de
   esto altera el sitio sin los parámetros. */
const PARAMS = new URLSearchParams(location.search);
const HORA_FORZADA = PARAMS.has('hora') ? parseFloat(PARAMS.get('hora')) : null;
const reloj = () => (HORA_FORZADA !== null && !Number.isNaN(HORA_FORZADA))
  ? HORA_FORZADA : horaAhora();

let L = luz(reloj());
let lavadoAdaptativo = false;   // lo enciende arrancar() si hay lienzo
aplicar(L);

const nota = document.getElementById('nota-hora');
function refrescarHora() {
  const h = reloj();
  L = luz(h);
  aplicar(L, !lavadoAdaptativo);
  if (nota) nota.textContent = notaAmanecer(h);
}
refrescarHora();
setInterval(refrescarHora, 30_000);

/* ── LÁMINAS SEGÚN LA PANTALLA ─────────────────────────────────────
   Dos juegos: 2048 px y 1024 px. En un teléfono el lienzo mide unos
   400×800, así que bajarse láminas de 2048 es pagar el doble de bytes
   y el doble de memoria de textura para nada. Medido: 4.8 MB contra
   2.2 MB, y 49 MB de textura contra ~13 MB.

   El 67.5 % del tráfico en Colombia es móvil, y esto se abre a las
   cuatro de la mañana con mala señal y el 3 % de batería. */
const ANCHO_REAL = Math.min(2048, innerWidth * Math.min(devicePixelRatio || 1, 2));
const LAMINAS_CHICAS = ANCHO_REAL <= 1100;
/* BASE_URL lo resuelve Vite en compilación: '/' en local y '/galene/'
   en producción. Nunca se escribe la ruta a mano. */
const BASE = import.meta.env.BASE_URL.replace(/\/?$/, '/');
const ARTE = BASE + (LAMINAS_CHICAS ? 'arte/1024/' : 'arte/');
const ANCHO_MAX = LAMINAS_CHICAS ? 1024 : 2048;

/* ── 3 · EL MAR ───────────────────────────────────────────────────── */

const hero   = document.getElementById('mar');
const lienzo = document.getElementById('lienzo');
const contenedorGarzas = document.getElementById('garzas');
const quieto = matchMedia('(prefers-reduced-motion: reduce)');

/* calma ∈ [0.35, 0.85] · 0.35 = revuelto (no picado: nadie es el
   capítulo uno de nadie) · 0.85 = casi espejo, nunca espejo.
   calma = 0.35 + 0.50·(1 − e^(−n/τ)), n = raíces, τ ≈ 500.
   Sin servidor todavía: se fija en el arranque de la curva.  */
const raices = 0;
const TAU_CALMA = 500;
const calma = 0.35 + 0.50 * (1 - Math.exp(-raices / TAU_CALMA));
/* Cursor: sobre el agua se puede sostener, y hay que verlo. */
document.getElementById('mar')?.style.setProperty('cursor', 'grab');

function arrancar(mar) {
  let escala = Math.min(devicePixelRatio || 1, 1.5);
  let horizonte = 0.44;
  let deriva = 0, punteroX = 0, punteroObjetivo = 0;
  let visible = true, corriendo = false;
  let ultimo = 0, ultimoCuadro = 0, ultimoAve = 0;
  const CUADRO = 1000 / 30;        // compuerta a 30 fps — SOLO el mar

  const estado = { t: 0, horizonte, calma, deriva: 0, papel: 0.055, luz: L };

  function medidas() {
    const caja = hero.getBoundingClientRect();
    const w = innerWidth, h = caja.height || innerHeight;
    const aspecto = w / h;

    /* SI EL BLOQUE DE TEXTO CRECE, EL PAISAJE SE AGACHA — nunca al revés.
       Una fracción fija de horizonte no sirve: en ventanas bajas o
       apaisadas el texto se sale del cielo y aterriza sobre el agua,
       donde el contraste medido es 1.98:1. Se midió: a 882×415 el
       lockup cruzaba el horizonte por 3 px y el peor contraste caía a
       3.47:1. El horizonte lo manda el texto, no el diseño. */
    const base = aspecto < 0.8 ? 0.58 : aspecto > 1.6 ? 0.52 : 0.55;
    const texto = document.querySelector('.hero__texto');
    const fondoTexto = texto ? (texto.getBoundingClientRect().bottom - caja.top) : 0;
    const respiro = Math.max(24, h * 0.05);
    const exigido = (fondoTexto + respiro) / h;
    const desdeArriba = Math.min(0.80, Math.max(base, exigido));

    horizonte = 1 - desdeArriba;
    document.documentElement.style.setProperty('--horizonte', (desdeArriba * 100).toFixed(1) + '%');
    mar.redimensionar(w, h, escala);
    estado.horizonte = horizonte;

    /* EL MANGLAR SE CENTRA EN VERTICAL. En móvil no hay sitio para una
       composición descentrada: el árbol mide un 60 % del ancho y a 0.705
       se salía por la derecha. En pantallas anchas vuelve a su sitio,
       que deja el flanco izquierdo libre para el texto. */
    const xManglar = aspecto < 0.85 ? 0.50
                   : aspecto > 1.50 ? 0.705
                   : 0.50 + ((aspecto - 0.85) / 0.65) * 0.205;

    /* Y NO PUEDE OCUPAR TODA LA PANTALLA. El manglar se mide en unidades
       de ALTO, así que en un móvil vertical su ancho —alto x aspecto de
       la lámina— se salía por los dos lados: a 0.62 de alto con una
       lámina 3:2 daba 0.93 del alto de ancho, casi el doble del ancho de
       un teléfono. Aquí se le pone techo por ANCHO. */
    const aspLam = mar.cajaManglar()[3] || 1.5;
    const altoManglar = Math.min(0.62, (0.74 * w) / (aspLam * h));
    mar.colocarManglar(xManglar, altoManglar);

    // Después del manglar: el posadero se calcula a partir de su caja.
    colocarGarzas(w, h, desdeArriba);
  }

  /* Sonda real de rendimiento. `hardwareConcurrency >= 8` no sirve:
     Helio G85 y Unisoc T606 son octa-core y se arrastran. Se dibuja
     de verdad y se mide con reloj de pared. */
  function sondear() {
    mar.redimensionar(64, 64, 1);
    const t0 = performance.now();
    for (let i = 0; i < 30; i++) { estado.t = i * 0.033; mar.dibujar(estado); }
    const ms = (performance.now() - t0) / 30;
    if (ms > 4.0)      escala = 0.6;
    else if (ms > 1.6) escala = Math.min(devicePixelRatio || 1, 1.0);
    console.info(`[mar] sonda: ${ms.toFixed(2)} ms/cuadro → escala ${escala}`);
  }

  sondear();
  medidas();
  addEventListener('resize', medidas, { passive: true });

  /* Paralaje de puntero: solo en escritorio, solo con puntero fino. */
  if (matchMedia('(min-width: 700px) and (pointer: fine)').matches) {
    addEventListener('pointermove', (e) => {
      punteroObjetivo = (e.clientX / innerWidth - 0.5) * 0.06;
    }, { passive: true });
  }

  /* ── EL GESTO DE SOSTENER ────────────────────────────────────────
     Se mantiene el dedo (o el ratón, o la barra espaciadora) sobre el
     agua: el oleaje se aplana alrededor y, al soltar, EL AGUA SE QUEDA
     PLANA. Lo que dejas, queda.

     Es el camino de esfuerzo cero. La mujer de las 4 a.m. no puede
     redactar: sostener le permite dejar huella sin elegir un color, sin
     escribir y sin nombrarse. El propágulo con frase es para quien tiene
     resto; esto es para quien no.

     Tope por sesión para que nadie infle el mar dejando el dedo puesto. */
  const TOQUES = [];
  const TOPE_SESION = 240;          // 4 minutos, como el resto del sistema
  let sostenido = 0, sosteniendo = null;

  const enQ = (cx, cy) => {
    const c = lienzo.getBoundingClientRect();
    return { x: ((cx - c.left) / c.width) * (c.width / c.height),
             y: 1 - (cy - c.top) / c.height };
  };

  function empezarToque(cx, cy) {
    const q = enQ(cx, cy);
    if (q.y >= estado.horizonte) return;      // solo sobre el agua
    if (sostenido >= TOPE_SESION) return;
    sosteniendo = { x: q.x, y: q.y, fuerza: 0, edad: 0 };
    TOQUES.push(sosteniendo);
    while (TOQUES.length > 6) TOQUES.shift();
  }
  const soltarToque = () => { sosteniendo = null; };

  hero.addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button, input, textarea, label')) return;
    empezarToque(e.clientX, e.clientY);
  });
  addEventListener('pointerup', soltarToque);
  addEventListener('pointercancel', soltarToque);
  hero.addEventListener('pointermove', (e) => {
    if (!sosteniendo || !e.buttons) return;
    const q = enQ(e.clientX, e.clientY);
    if (q.y < estado.horizonte) { sosteniendo.x = q.x; sosteniendo.y = q.y; }
  });
  addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || sosteniendo || e.target !== document.body) return;
    e.preventDefault();
    empezarToque(innerWidth * 0.5, innerHeight * (1 - estado.horizonte * 0.5));
  });
  addEventListener('keyup', (e) => { if (e.code === 'Space') soltarToque(); });

  function avanzarToques(dt) {
    if (sosteniendo && sostenido < TOPE_SESION) {
      sostenido += dt;
      sosteniendo.fuerza = Math.min(1, sosteniendo.fuerza + dt * 1.6);
    }
    for (const t of TOQUES) {
      // La edad solo corre cuando NO se está sosteniendo: el anillo se
      // cierra al soltar, no mientras se aguanta.
      if (t !== sosteniendo) t.edad = Math.min(1, t.edad + dt * 0.85);
    }
    /* La calma global sube con lo sostenido, nunca baja, y nunca llega
       al espejo: la curva es la misma del README. */
    const n = raices + sostenido * 1.5;
    estado.calma = 0.35 + 0.50 * (1 - Math.exp(-n / TAU_CALMA));
    mar.toques(TOQUES);
  }

  /* Pausar cuando el mar sale de pantalla: batería real en gama media. */
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !quieto.matches) bucle();
  }, { threshold: 0.02 }).observe(hero);

  function cuadro(ms, dtAve) {
    // dtAve viene del bucle y es el del AVE. Si no viene (arranque o
    // pruebas), se calcula desde el último cuadro del mar.
    const dt = dtAve !== undefined ? dtAve
             : (ultimoCuadro ? (ms - ultimoCuadro) / 1000 : 1 / 60);
    ultimoCuadro = ms;
    estado.t = ms / 1000;
    punteroX += (punteroObjetivo - punteroX) * 0.06;
    /* Deriva autónoma: el mundo vive solo, nadie tiene que arrastrarlo.
       Con un componente sinusoidal lento encima, para que se sienta
       barco y no scroll. Nada avanza lineal. */
    deriva += 0.00040 * (1 + 0.38 * Math.sin(estado.t * 0.11));
    estado.deriva = deriva + punteroX;
    /* Paralaje ACOTADO para lo discreto. El manglar y las garzas son
       objetos únicos: con la deriva acumulativa se iban caminando fuera
       de cuadro y no volvían. Aquí solo entra puntero y scroll. */
    /* SOLO el puntero. El scroll movía el manglar y el ave con la
       página, y un objeto que se desplaza al bajar delata que es una
       calcomanía sobre un fondo. El mundo está fijo al viewport: las
       herramientas pasan por encima y el paisaje se queda donde está. */
    estado.paralaje = punteroX;

    /* PARALAJE. El mundo está fijo al viewport, así que las herramientas
       ya se deslizan por encima del mar. Encima de eso, el mar se hunde
       un poco al bajar —18 % del scroll— y se apaga hacia el fondo: no
       desaparece, se queda respirando debajo del instrumento. */
    const s = Math.min(1, scrollY / innerHeight);
    lienzo.style.transform = `translate3d(0, ${(s * innerHeight * 0.18).toFixed(1)}px, 0)`;
    if (contenedorGarzas) contenedorGarzas.style.transform = lienzo.style.transform;
    // El paralaje vertical entra al salir del hero.
    const salida = Math.min(1, Math.max(0, scrollY / innerHeight));
    estado.horizonte = horizonte + salida * 0.06;
    estado.luz = L;
    avanzarToques(dt);
    mar.dibujar(estado);
    calibrarLavado();
    /* estado.paralaje, NO la deriva: la deriva es el acumulador infinito
       del agua y arrastraba al ave fuera de cuadro igual que hacía con
       el manglar. El ave tiene que moverse con el ÁRBOL, no con el mar. */
    animarGarzas(estado.t, estado.paralaje, dt);
  }

  /* ── EL LAVADO ADAPTATIVO ────────────────────────────────────────
     La fuente de luz viaja por el cielo, así que tarde o temprano el
     disco del sol o de la luna pasa por detrás del título. Se midió: a
     las 4:12 la luna caía dentro del lockup y el peor contraste bajaba
     a 3.43:1.

     No se arregla moviendo el texto ni fijando la luna —sería mentir
     sobre dónde está—. Se arregla midiendo cada tanto lo que realmente
     quedó pintado detrás del texto y lavando encima lo justo para
     llegar al umbral. Un lavado es un gesto de acuarela, no un parche.  */
  /* Margen sobre el 4.5:1 exigido. Con papel de verdad el grano añade
     motas claras que se comen el margen: medido, con objetivo 4.8 el
     peor píxel quedaba en 4.51 — pasa, pero por un pelo. */
  const OBJETIVO = 5.4;
  let lavadoActual = 0, contadorLavado = 14, primeraCalibracion = true;
  lavadoAdaptativo = true;

  const linz = (v) => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  const lumRel = (c) => 0.2126 * linz(c[0]) + 0.7152 * linz(c[1]) + 0.0722 * linz(c[2]);
  const hexArr = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);

  function calibrarLavado() {
    if (++contadorLavado % 15 !== 0) return;         // ~2 Hz a 30 fps
    const texto = document.querySelector('.hero__texto');
    if (!texto) return;
    const caja = hero.getBoundingClientRect();
    const r = texto.getBoundingClientRect();
    const k = lienzo.width / Math.max(1, caja.width);
    // readPixels tiene el origen abajo-izquierda.
    const zona = mar.medirZona(
      Math.round(r.left * k),
      Math.round(lienzo.height - (r.bottom - caja.top) * k),
      Math.round(r.width * k),
      Math.round(r.height * k));
    if (!zona) return;

    const tintaClara = document.documentElement.dataset.tinta === 'clara';
    const lt     = lumRel(hexArr(tintaClara ? '#E8EEF2' : '#1C2A30'));
    const lavCol = hexArr(tintaClara ? '#0B141A' : '#F6F9FA');

    /* El peor píxel es el que manda, y cuál es el peor depende de la
       tinta: con tinta clara, el fondo más CLARO; con tinta oscura, el
       más OSCURO. */
    const peor = tintaClara ? zona.max : zona.min;
    const gFondo = peor <= 0.0031308 ? peor * 12.92
                 : 1.055 * Math.pow(peor, 1 / 2.4) - 0.055;

    // Alfa mínimo que alcanza el objetivo. Se mezcla en sRGB, que es
    // como lo va a componer el navegador.
    let necesario = 0.62;
    for (let a = 0; a <= 0.62; a += 0.02) {
      const lf = lumRel(lavCol.map((c) => gFondo * (1 - a) + c * a));
      const [hi, lo] = [lt, lf].sort((p, q) => q - p);
      if ((hi + 0.05) / (lo + 0.05) >= OBJETIVO) { necesario = a; break; }
    }
    /* La primera vez se fija de golpe. Con movimiento apagado se dibuja
       UN solo cuadro, y con suavizado el lavado se quedaría a un cuarto
       de camino para siempre — justo en el modo de quien pidió calma. */
    if (primeraCalibracion) { lavadoActual = necesario; primeraCalibracion = false; }
    else lavadoActual += (necesario - lavadoActual) * 0.25;
    document.documentElement.style.setProperty('--lavado', lavadoActual.toFixed(3));
    document.documentElement.style.setProperty('--lavado-color',
      tintaClara ? '#0B141A' : '#F6F9FA');
  }

  function bucle() {
    if (corriendo) return;
    corriendo = true;
    const paso = (ms) => {
      if (!visible || quieto.matches) { corriendo = false; return; }
      /* El MAR va a 30 fps porque cada cuadro es un render WebGL de
         pantalla completa. El AVE va a la tasa del monitor: son cinco
         transforms de CSS, no cuesta nada, y es justo lo que hace que
         el vuelo se sienta fluido. Dos relojes, dos costos. */
      /* dt del AVE = tiempo desde el último cuadro DEL AVE, siempre.
         Antes, en los cuadros donde también se dibujaba el mar, se le
         pasaba el dt del mar (33 ms) aunque ya se hubiera avanzado en
         los cuadros intermedios: 1470 ms de animación por cada segundo
         real. Todo el vuelo iba 1.47× rápido —aleteo, avance y física—
         y por eso se veía irreal. */
      const dtAve = ultimoAve ? (ms - ultimoAve) / 1000 : 1 / 60;
      ultimoAve = ms;
      if (ms - ultimo >= CUADRO) { ultimo = ms; cuadro(ms, dtAve); }
      else animarGarzas(ms / 1000, estado.paralaje, dtAve);
      requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }

  // Un cuadro siempre, incluso con movimiento apagado: el mar quieto
  // tiene que ser bonito por sí solo. Es también la versión gama baja.
  cuadro(performance.now());
  hero.setAttribute('data-mar', 'listo');
  if (PARAMS.has('dev'))
    window.__galene = { estado, cuadro, mar, luz: () => L, calcularPosadero, vuelo: () => vuelo };

  /* Las láminas llegan después del primer cuadro. La ayuda nunca espera
     al arte: si no cargan, el mar sigue siendo procedural y el sitio
     entero sigue funcionando. */
  mar.ventana('Lejano', 0.10, 0.86);   // recorta el margen de papel
  mar.cargar({
    lejano:       ARTE + 'mar-lejano.webp',
    medio:        ARTE + 'mar-medio.webp',
    medioCalmo:   ARTE + 'mar-medio-calmo.webp',
    cercano:      ARTE + 'mar-cercano.webp',
    cercanoCalmo: ARTE + 'mar-cercano-calmo.webp',
    manglar:      ARTE + 'manglar-lejos.webp',
    manglarCerca: ARTE + 'manglar-cerca.webp',
    corales:      ARTE + 'corales.webp',
    luces:        ARTE + 'luces.webp',
    papel:        ARTE + 'papel.webp',
    grafito:      ARTE + 'grafito.webp',
    nubes:        ARTE + 'cielo-nubes.webp',
    /* Las garzas ya NO se pintan en el shader: allí estaban paradas en
       mar abierto, y una garza vadea en somero. Ahora hay una sola, en
       el DOM, que llega volando y se posa sobre la copa del manglar. */
  }, ANCHO_MAX).then((n) => {
    console.info('[mar] láminas conectadas:', n.join(', '));
    /* Con papel de verdad el grano se modula contra su propia media.
       0.55, no 1.15: a fuerza alta el papel deja de ser soporte y pasa
       a ser un filtro de textura encima de todo. */
    if (n.includes('papel')) estado.papel = 0.55;
    cuadro(performance.now());
  }).catch((e) => console.warn('[mar] sin láminas:', e.message));
  if (!quieto.matches) bucle();
  quieto.addEventListener('change', () => { if (!quieto.matches) bucle(); else cuadro(performance.now()); });
}

/* ── GARZAS ────────────────────────────────────────────────────────
   Andamiaje: siluetas en el DOM, máximo 15, para reemplazar por
   láminas PNG por pose (arte/laminas.md · lámina 08).

   Reglas: nunca en apuros, nunca una sola en cuadro, y el sitio nunca
   afirma quiénes son. Ave calmada: se para, se acicala, duerme. Sin
   clavados — un picotazo que sale con un pez es depredación.        */

/* Las tres láminas de vuelo NO vienen registradas: distintos aspectos y
   centroides en 0.463, 0.565 y 0.565. Intercaladas tal cual, el pájaro
   pega un salto en cada cuadro.

   Se alinean por CENTROIDE de la tinta —que sigue al cuerpo, porque el
   cuerpo, el cuello y las patas concentran la masa— y se normaliza la
   ENVERGADURA, para que tampoco pulse de tamaño al abrir las alas.
   Medidos con el arnés; si se regeneran las láminas, hay que remedirlos. */
/* Todas las láminas del ave, por NOMBRE. Los índices numéricos ya se me
   desplazaron dos veces al insertar poses; con claves eso no puede pasar.
   cx/cy = centroide de la tinta · ancho = envergadura relativa.
   Todo medido con pruebas/lamina.html: si se regenera una lámina, hay
   que volver a medirla o el ave pega un salto en ese cuadro. */
const VUELO = {
  /* Once cuadros del MISMO batido, generados como ediciones sobre una
     maestra: por eso comparten aspecto (1.499) y ancho de tinta (0.82–0.86)
     y el cuerpo no salta al intercalarlos.

     El centroide vertical traza el batido y lo confirma:
       01 0.431 · 02 0.437 · 03 0.429 · 04 0.453 · 05 0.481 · 06 0.533
       07 0.482 · 08 0.513 · 09 0.515 · 11 0.451
     Baja hasta el 06, que es el fondo del golpe, y vuelve a subir.
     (La 10 salió idéntica a la 09 y no se usa.)

     Vinieron sobre fondo opaco —blanco unas, papel crema otras— y se
     recortaron por relleno desde el borde, no por clave de luminancia:
     la clave le habría hecho agujeros a la panza clara del ave, que es
     igual de clara pero está encerrada. */
  f01: { src: ARTE + 'aves/ave01.webp', cx: 0.522, cy: 0.431, ancho: 0.828, aspecto: 1.499 },
  f02: { src: ARTE + 'aves/ave02.webp', cx: 0.536, cy: 0.437, ancho: 0.828, aspecto: 1.499 },
  f03: { src: ARTE + 'aves/ave03.webp', cx: 0.541, cy: 0.429, ancho: 0.828, aspecto: 1.499 },
  f04: { src: ARTE + 'aves/ave04.webp', cx: 0.523, cy: 0.453, ancho: 0.861, aspecto: 1.499 },
  f05: { src: ARTE + 'aves/ave05.webp', cx: 0.517, cy: 0.481, ancho: 0.853, aspecto: 1.499 },
  f06: { src: ARTE + 'aves/ave06.webp', cx: 0.490, cy: 0.667, ancho: 0.826, aspecto: 1.500 },
  f07: { src: ARTE + 'aves/ave07.webp', cx: 0.490, cy: 0.482, ancho: 0.853, aspecto: 1.499 },
  f08: { src: ARTE + 'aves/ave08.webp', cx: 0.512, cy: 0.513, ancho: 0.824, aspecto: 1.499 },
  f09: { src: ARTE + 'aves/ave09.webp', cx: 0.539, cy: 0.515, ancho: 0.824, aspecto: 1.499 },
  f11: { src: ARTE + 'aves/ave11.webp', cx: 0.527, cy: 0.451, ancho: 0.824, aspecto: 1.499 },
  frena: { src: ARTE + 'garza-llegando.webp', cx: 0.528, cy: 0.418, ancho: 0.934,
           aspecto: 0.667, altoTinta: 0.971, factor: 1.7 },
  /* LAS SEIS POSADAS. Vinieron en una sola rejilla 3×2, así que comparten
     papel, pigmento y tamaño de ave: por eso se pueden intercambiar sin
     que cambie de garza. La lámina traía halo blanco y motas rojas y
     cianes de la codificación; se corrigieron desaturando todo píxel con
     saturación > 0.40 —el ave es casi monocroma, cualquier color saturado
     es basura— y apagando el alfa parcial de lo casi blanco.

     `factor` es lo que hace que NO se normalicen todas al mismo alto: la
     alerta estira el cuello y mide más, la encogida se hunde y mide menos.
     Es la altura de tinta de cada una dividida por la de reposo (562 px).
     Sin esto, cambiar de pose sería cambiar de talla de ave. */
  posada:   { src: ARTE + 'posada/reposo.webp',     cx: 0.609, cy: 0.467,
              aspecto: 0.692, pies: [0.596, 0.988], altoTinta: 0.979, factor: 1.000 },
  pAlerta:  { src: ARTE + 'posada/alerta.webp',     cx: 0.572, cy: 0.480,
              aspecto: 0.682, pies: [0.553, 0.989], altoTinta: 0.980, factor: 1.069 },
  pEncoge:  { src: ARTE + 'posada/encogida.webp',   cx: 0.568, cy: 0.412,
              aspecto: 0.881, pies: [0.548, 0.984], altoTinta: 0.973, factor: 0.774 },
  pUnaPata: { src: ARTE + 'posada/una-pata.webp',   cx: 0.590, cy: 0.388,
              aspecto: 0.726, pies: [0.578, 0.987], altoTinta: 0.978, factor: 0.952 },
  pMira:    { src: ARTE + 'posada/mira-abajo.webp', cx: 0.471, cy: 0.416,
              aspecto: 0.687, pies: [0.448, 0.988], altoTinta: 0.979, factor: 0.984 },
  pAlas:    { src: ARTE + 'posada/alas.webp',       cx: 0.480, cy: 0.438,
              aspecto: 0.716, pies: [0.513, 0.987], altoTinta: 0.979, factor: 0.973 },
};

/* ── LA VIDA EN REPOSO ──────────────────────────────────────────────
   El ave pasa casi todo el tiempo posada. Balancearse no basta: se lee
   como un adorno que oscila. Lo que la hace parecer viva es que HAGA
   COSAS, y sobre todo que las haga a destiempo.

   Por eso las esperas son largas y desiguales (7–19 s) y nunca se repite
   la pose anterior. Un patrón regular se detecta en dos ciclos y vuelve
   a leerse como máquina; uno irregular no se detecta nunca.

   Los pesos importan: encogerse y recoger una pata son posturas de
   descanso y duran; mirar abajo y abrir las alas son gestos y pasan. */
const GESTOS = [
  { clave: 'pEncoge',  peso: 3, dura: [4.0, 9.0] },
  { clave: 'pUnaPata', peso: 3, dura: [5.0, 12.0] },
  { clave: 'pAlerta',  peso: 2, dura: [2.0, 5.0] },
  { clave: 'pMira',    peso: 2, dura: [1.6, 3.4] },
  { clave: 'pAlas',    peso: 1, dura: [1.1, 2.2] },
];
const PESO_TOTAL = GESTOS.reduce((s, g) => s + g.peso, 0);
const DISUELVE = 0.42;          // segundos de disolvencia entre poses
const entre = (a, b) => a + Math.random() * (b - a);
const reposo = { actual: 'posada', previa: 'posada', desde: 0, hasta: 9 };

/* Devuelve [claveAnterior, claveActual, mezcla]. La mezcla es una
   disolvencia de acuarela, no un corte: dos aguadas superpuestas es un
   gesto que el medio admite; un salto de cuadro, no. */
function gestoPosado(t) {
  const g = reposo;
  /* Al aterrizar se queda quieta un rato. Sin esto el primer gesto salta
     en el mismo instante en que toca la rama —el reloj lleva 39 s
     corriendo— y el aterrizaje pierde su reposo. */
  if (!g.arrancado) {
    g.arrancado = true; g.desde = t; g.hasta = t + entre(3.0, 6.5);
  }
  if (t >= g.hasta) {
    g.previa = g.actual;
    if (g.actual !== 'posada') {                    // vuelve a la calma
      g.actual = 'posada';
      g.hasta = t + entre(7.0, 19.0);
    } else {
      let r = Math.random() * PESO_TOTAL, elegido = GESTOS[0];
      for (const c of GESTOS) { r -= c.peso; if (r <= 0) { elegido = c; break; } }
      g.actual = elegido.clave;
      g.hasta = t + entre(elegido.dura[0], elegido.dura[1]);
    }
    g.desde = t;
  }
  const m = Math.min(1, (t - g.desde) / DISUELVE);
  return [g.previa, g.actual, m * m * (3 - 2 * m)];
}

/* La travesía completa, en segundos. Rara y lenta a propósito: el mundo
   no está poblado de pájaros, pasa uno de vez en cuando y se queda un
   buen rato. Siempre vuela HACIA LA IZQUIERDA —que es hacia donde miran
   las láminas— así que nunca hay que espejarla y nunca vuela de espaldas. */
/* LLEGA Y SE QUEDA. No hay ciclo: el ave entra una vez, se posa y no se
   va nunca. Compañía que no se marcha — que es lo que el sitio promete
   sin decirlo. Los tiempos se cuentan desde que se carga la página. */
const FASES = [
  ['crucero',   26.0],   // entra por la derecha, alto, cruzando
  ['aproxima',  11.0],   // baja en arco hacia el manglar, aleteo más lento
  ['frena',      2.4],   // alas abiertas, se endereza, se posa
];
const HASTA_POSADA = FASES.reduce((s, f) => s + f[1], 0);
/* Ciclo a → b → c → b: la garza es un ave de aleteo lento, ~1.5 por
   segundo. Animado a dos, que es como se anima a mano y por eso se
   siente hecho por una persona en vez de interpolado. */
/* El batido completo, diez pasos con siete poses. El orden salió de
   MEDIR el centroide de la tinta dentro de la familia que comparte
   aspecto 3:2 —el peso baja a medida que el ala baja—:
       d 0.411 · g 0.504 · b 0.511 · f 0.520 · e 0.565
   Con 'a' arriba del todo. Bajada y subida usan las mismas láminas, que
   es lo que pasa de verdad: el ala cruza dos veces cada posición. */
/* ave06 regenerada: ahora tiene exactamente dos alas —la cercana abajo
   y la lejana oculta tras el cuerpo— y su centroide baja a 0.667, el más
   bajo de las diez. Es el fondo del batido y vuelve al ciclo. */
const CICLO = ['f01','f02','f03','f04','f05','f06','f07','f08','f09','f11'];
const MS_CUADRO = 150;  // 10 pasos x 150 ms = 0.67 batidos/s

const contenedor = document.getElementById('garzas');
let vuelo = null;

if (contenedor) {
  contenedor.innerHTML = '';
  const capas = {};
  for (const [clave, v] of Object.entries(VUELO)) {
    const img = new Image();
    img.src = v.src;
    img.alt = '';
    img.className = 'vuelo';
    img.decoding = 'async';
    // La posada gira sobre sus PIES; las de vuelo, sobre su centro.
    img.style.transformOrigin = v.pies
      ? `${(v.pies[0] * 100).toFixed(1)}% ${(v.pies[1] * 100).toFixed(1)}%`
      : '50% 50%';
    contenedor.appendChild(img);
    capas[clave] = img;
  }
  vuelo = { capas, w: 0, h: 0, envergadura: 0, px: 0, py: 0, vx: 0, vy: 0, arrancado: false };
}

/* DOS POSADEROS, y por ahora solo se usa uno.

   El ave que LLEGA se posa en la copa del manglar principal: esa
   trayectoria —crucero, descenso en arco, frenado— es el acontecimiento
   de la portada y no se toca.

   La rama del manglar CERCANO queda reservada para el ave protagonista,
   la que representa a quien visita. Entra cuando existan las láminas del
   ave en reposo, junto con la bandada del árbol grande.

   Coordenadas medidas: en el manglar lejano, 42 % a lo ancho y 16 % desde
   arriba, o sea sobre la copa. En el cercano, (0.27, 0.455), que es el
   tramo sólido de la rama —más a la derecha la pintura ya se desvanece y
   el ave parecía flotar sobre nada. */
const POSADERO = [0.42, 0.16];
const POSADERO_CERCA = [0.27, 0.455];
const GROSOR_RAMA = 0.076;

export function calcularPosadero(caja, w, h, lineaPx) {
  const [cxRel, altoRel, hundir, aspLam] = caja;
  const altoPx  = altoRel * h;
  const anchoPx = altoPx * aspLam;
  const abajo   = lineaPx + hundir * h;
  return {
    x: cxRel * w + (POSADERO[0] - 0.5) * anchoPx,
    y: abajo - (1 - POSADERO[1]) * altoPx,
    altoManglar: altoPx,
  };
}

/* Para la bandada, cuando llegue: un punto sobre la rama del fragmento
   cercano, en la misma geometría que usa el shader. */
export function posaderoCercano(caja, w, h) {
  const [xRel, alto, , aspLam] = caja;
  const anchoQ = alto * aspLam;
  return {
    x: xRel * w + POSADERO_CERCA[0] * anchoQ * h,
    y: (1 - (caja[2] + (1 - POSADERO_CERCA[1]) * alto)) * h,
    grosorRama: GROSOR_RAMA * alto * h,
  };
}

function colocarGarzas(w, h, horDesdeArriba) {
  if (!vuelo) return;
  vuelo.w = w; vuelo.h = h;
  vuelo.linea = h * horDesdeArriba;

  const p = calcularPosadero(mar.cajaManglar(), w, h, vuelo.linea);
  /* Tamaños proporcionales al MANGLAR, no a la ventana: así el ave
     guarda su escala frente al árbol en cualquier pantalla.
     Bajados: a 0.34 y 0.44 el ave competía con el árbol. Una garza
     posada mide como un quinto del manglar, no como un tercio. */
  /* Tamaños proporcionales al GROSOR DE LA RAMA en la que se posa: es
     la única referencia honesta de escala que hay en el cuadro. */
  vuelo.altoPosada  = p.altoManglar * 0.135;
  vuelo.envergadura = p.altoManglar * 0.20;

  /* UN SOLO PUNTO DE REFERENCIA para todo el recorrido: el centroide.
     Antes el vuelo se anclaba por el centroide y la posada por los pies,
     así que al aterrizar el cuerpo pegaba un brinco hacia arriba del
     tamaño de las patas. Aquí se calcula dónde debe ir el CENTROIDE
     para que los PIES caigan exactamente sobre la rama. */
  const pos = VUELO.posada;
  const altoPx = vuelo.altoPosada / pos.altoTinta;
  vuelo.posX = p.x - (pos.pies[0] - pos.cx) * (altoPx * pos.aspecto);
  vuelo.posY = p.y - (pos.pies[1] - pos.cy) * altoPx;

  /* Altitud de crucero, RELATIVA AL POSADERO — y calculada DESPUÉS de
     él, o sale NaN. Con una fracción fija del alto y el manglar al 46 %
     de pantalla, la copa quedaba casi al nivel del crucero y el ave
     subía antes de aterrizar en vez de bajar. Así siempre vuela por
     encima de la rama y el descenso es monótono. */
  vuelo.alto = Math.max(h * 0.05, vuelo.posY - h * 0.155);

  // El frenado empieza donde termina la aproximación. Exactamente, y a
  // media altura entre el crucero y la rama.
  vuelo.frenaX = vuelo.posX + w * 0.055;
  vuelo.frenaY = vuelo.posY - (vuelo.posY - vuelo.alto) * 0.42;
}

const suave3 = (p) => p * p * (3 - 2 * p);
const salida3 = (p) => 1 - Math.pow(1 - p, 3);

function animarGarzas(t, paralaje, dt) {
  if (!vuelo || !vuelo.envergadura) return;
  const { w, h, posX, posY, alto } = vuelo;
  const K = vuelo.envergadura;
  // Paso de integración acotado: una pestaña en segundo plano o un
  // salto del reloj no pueden lanzar al ave al infinito.
  dt = Math.min(0.05, Math.max(0.001, dt || 1 / 60));

  // ¿En qué fase vamos? Sin módulo: pasado el frenado, se queda posada.
  let tt = t, fase = 'posada', p = 1;
  if (tt < HASTA_POSADA) {
    for (const [nombre, dur] of FASES) {
      if (tt < dur) { fase = nombre; p = tt / dur; break; }
      tt -= dur;
    }
  }

  /* ── FÍSICA ────────────────────────────────────────────────────
     El recorrido ya no son interpolaciones guionadas sino una
     integración: el ave tiene posición y VELOCIDAD, y persigue un
     objetivo con un muelle amortiguado. Por eso la aproximación no se
     siente forzada — no hay una curva dibujada a mano, hay un cuerpo
     que se deja caer y frena. Y la inclinación sale del vector de
     velocidad, que es lo que hace un pájaro de verdad: el cuerpo se
     alinea con la trayectoria.                                     */
  // Entra justo por el borde y se queda cerca del manglar: recorre poco.
  const xEntra = w * 1.08, xEspera = vuelo.posX + w * 0.14;
  let plato = null, mezcla = 0, escala = 1;
  let poseA = 'posada', poseB = 'posada', poseM = 1;
  let ritmo = MS_CUADRO / 1000;           // segundos por paso de aleteo

  if (!vuelo.arrancado) {
    vuelo.px = xEntra; vuelo.py = alto;
    vuelo.vx = -w * 0.028; vuelo.vy = 0;
    vuelo.arrancado = true;
  }

  let objX, objY, k, amort;
  if (fase === 'crucero') {
    /* El crucero se rige por VELOCIDAD, no por un punto de destino. Con
       un muelle posicional el ave llegaba a su objetivo y se quedaba
       colgada en el aire —medido: vx bajaba a 3 px/s—, que es lo que
       hace un globo, no un pájaro. Un ave en crucero mantiene rumbo. */
    // 0.024 del ancho por segundo: cruza la pantalla en ~40 s. A 0.052
    // se sentía disparada; una garza planea, no corre.
    const vDeseada = -w * 0.012;
    vuelo.vx += (vDeseada - vuelo.vx) * Math.min(1, dt * 0.5);
    vuelo.vy += ((alto - vuelo.py) * 0.9 - vuelo.vy) * Math.min(1, dt * 1.6);
    vuelo.px += vuelo.vx * dt;
    vuelo.py += vuelo.vy * dt;
    objX = null;
  } else if (fase === 'aproxima') {
    objX = vuelo.frenaX; objY = vuelo.frenaY;
    k = 0.45 + 1.1 * p; amort = 2.9;
    ritmo = MS_CUADRO / 1000 + p * 0.09;  // el aleteo se abre al descender
  } else if (fase === 'frena') {
    plato = 'frena';
    objX = posX; objY = posY;
    // Alas abiertas: mucha resistencia. Frena de verdad, no interpola.
    k = 11; amort = 6.4;
    escala = 1.06 - 0.06 * salida3(p);
    mezcla = p > 0.70 ? (p - 0.70) / 0.30 : 0;
  } else {
    plato = 'posada';
    objX = posX; objY = posY;
    k = 90; amort = 18;                   // clavada en la rama
    [poseA, poseB, poseM] = gestoPosado(t);
  }

  // Integración semiimplícita: estable con pasos grandes.
  if (objX !== null) {
    const ax = (objX - vuelo.px) * k - vuelo.vx * amort;
    const ay = (objY - vuelo.py) * k - vuelo.vy * amort;
    vuelo.vx += ax * dt; vuelo.vy += ay * dt;
    vuelo.px += vuelo.vx * dt; vuelo.py += vuelo.vy * dt;
  }

  let x = vuelo.px, y = vuelo.py;

  /* Actitud desde la trayectoria: si baja, morro abajo; si frena, se
     endereza. Suavizada, porque un cuerpo con inercia no cambia de
     ángulo de golpe. */
  const avance = Math.max(60, Math.abs(vuelo.vx));
  const objGiro = plato === 'posada' ? 0
    : Math.max(-26, Math.min(14, -(Math.atan2(vuelo.vy, avance) * 180 / Math.PI) * 0.85));
  vuelo.giro = (vuelo.giro || 0) + (objGiro - (vuelo.giro || 0)) * Math.min(1, dt * 4.5);
  let giro = vuelo.giro;

  if (plato === 'posada') {
    // Vida en reposo: balanceo lentísimo, nunca quieta del todo.
    giro = Math.sin(t * 0.31) * 0.55 + Math.sin(t * 0.13) * 0.35;
  }

  /* Aleteo. Se cruza SOLO el último tramo de cada paso: el salto duro
     desaparece pero el escalón se conserva, que es lo que hace que se
     lea animado a mano y no interpolado. Y una disolvencia entre dos
     aguadas es un gesto de acuarela, no un efecto. */
  const enVuelo = plato === null;
  vuelo.fase = (vuelo.fase || 0) + dt / ritmo;      // avanza con el reloj real
  const pos = vuelo.fase % CICLO.length;
  const iA = Math.floor(pos), frac = pos - iA;
  const iB = (iA + 1) % CICLO.length;
  /* Se cruza solo el último tramo de cada paso: el salto duro
     desaparece pero el escalón se conserva, que es lo que lo mantiene
     animado a mano. Con diez pasos el tramo puede ser más corto. */
  const cruce = frac < 0.70 ? 0 : (frac - 0.70) / 0.30;
  /* El cuerpo sube en la BAJADA del ala, no en fase con ella: el empuje
     va medio ciclo por delante de la posición. Ese desfase es lo que
     distingue un pájaro de un muñeco que sube y baja. */
  const bat = Math.sin((pos / CICLO.length) * Math.PI * 2 - Math.PI * 0.5);
  /* Cabeceo mínimo. Un ave grande en vuelo de crucero casi no sube ni
     baja: la sustentación se reparte y el cuerpo va estable. Lo que se
     mueve son las alas. A 0.042 el cuerpo daba tumbos. */
  if (enVuelo) { y += bat * K * 0.011; giro += bat * 0.45; }

  /* EL MISMO PARALAJE QUE EL MANGLAR, exactamente. El shader mueve el
     árbol 0.45·paralaje en unidades de q —que son alto de pantalla— y
     yo movía el ave 130 px: al mover el puntero se separaban y el ave
     se resbalaba de la rama. Es el mismo error que tenía el árbol con
     la deriva del agua, un piso más abajo. */
  x -= paralaje * 0.45 * h;

  const visibles = enVuelo
    ? (cruce > 0 && CICLO[iA] !== CICLO[iB]
        ? [[CICLO[iA], 1 - cruce], [CICLO[iB], cruce]]
        : [[CICLO[iA], 1]])
    : mezcla > 0 ? [['frena', 1 - mezcla], ['posada', mezcla]]
    : plato === 'posada'
      ? (poseM < 1 && poseA !== poseB
          ? [[poseA, 1 - poseM], [poseB, poseM]]
          : [[poseB, 1]])
    : [[plato, 1]];

  /* EL PUNTO FIJO DE LAS POSES SON LOS PIES, NO EL CENTROIDE. En vuelo
     el centroide es lo correcto —el ave gira alrededor de su masa—, pero
     una garza que se encoge o levanta una pata mueve su centro de masa y
     deja los pies donde están. Si anclara por centroide, al cambiar de
     postura el ave se deslizaría por la rama. Así que traduzco la
     posición del centroide de reposo al punto donde están los pies, y
     desde ahí coloco cada pose por los suyos. */
  const ref = VUELO.posada;
  const refAlto = (vuelo.altoPosada / ref.altoTinta) * escala;
  const pieX = x + (ref.pies[0] - ref.cx) * (refAlto * ref.aspecto);
  const pieY = y + (ref.pies[1] - ref.cy) * refAlto;

  for (const [clave, el] of Object.entries(vuelo.capas)) {
    const enc = visibles.find(([c]) => c === clave);
    if (!enc) { if (el.style.opacity !== '0') el.style.opacity = '0'; continue; }
    const v = VUELO[clave];
    const altoPx = v.altoTinta
      ? (vuelo.altoPosada * (v.factor || 1) / v.altoTinta) * escala   // posada / frenado
      : (K / v.ancho) * escala / v.aspecto;                          // vuelo
    const anchoPx = altoPx * v.aspecto;
    const porPies = plato === 'posada' && v.pies;
    const izq = porPies ? pieX - v.pies[0] * anchoPx : x - v.cx * anchoPx;
    const arr = porPies ? pieY - v.pies[1] * altoPx : y - v.cy * altoPx;
    el.style.opacity = enc[1].toFixed(3);
    el.style.width = anchoPx.toFixed(1) + 'px';
    el.style.transform =
      `translate3d(${izq.toFixed(1)}px, ${arr.toFixed(1)}px, 0) rotate(${giro.toFixed(2)}deg)`;
  }
}

/* ── ARRANQUE ──────────────────────────────────────────────────────
   Al final: el mar es lo último que se enciende, después de que los
   reflejos, la hora y las garzas ya existen. */
const mar = crear(lienzo);
if (!mar) {
  lienzo.remove();                 // el respaldo CSS ya es un mar
  hero?.setAttribute('data-mar', 'sin-webgl');
} else {
  arrancar(mar);
}
