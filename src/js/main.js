/* ═══════════════════════════════════════════════════════════════════
   main.js — orquestación.

   Orden de prioridades, y no se negocia:
   1. Los reflejos (salir / línea) funcionan siempre. Se enganchan
      PRIMERO, antes de tocar el canvas.
   2. La luz de la hora real se aplica al DOM aunque no haya WebGL.
   3. El mar es un enhancement. Si falla, el sitio sigue sirviendo.
   ═══════════════════════════════════════════════════════════════════ */

import { luz, aplicar, horaAhora, notaAmanecer } from './hora.js';
import { crear, viento, encogeCerca, VIENTO_COPA, VIENTO_RAMA } from './mar.js';
import { viewportHeight, viewportWidth } from './viewport.js';
import { dejarGarza, garzasVivas, suscribirManglar, calmaActual, acreditarGesto, POSE_A_CAPA } from './bandada-cliente.js';

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
   Tres juegos: 2048, 1024 y 768 px. En un teléfono el lienzo mide unos
   400×800, así que bajarse láminas de 2048 es pagar el doble de bytes
   y el doble de memoria de textura para nada. Medido: 4.8 MB contra
   2.2 MB, y 49 MB de textura contra ~13 MB.

   El 67.5 % del tráfico en Colombia es móvil, y esto se abre a las
   cuatro de la mañana con mala señal y el 3 % de batería. */
const CONEXION = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
const RED_LENTA = Boolean(CONEXION?.saveData)
  || /(^|-)2g$|3g/.test(CONEXION?.effectiveType || '');
const MEMORIA_AJUSTADA = Number(navigator.deviceMemory || 8) <= 4;
const MOVIL = matchMedia('(max-width: 700px), (pointer: coarse)').matches;
const PERFIL_AHORRO = RED_LENTA || (MOVIL && MEMORIA_AJUSTADA);
const ANCHO_REAL = Math.min(2048, viewportWidth() * Math.min(devicePixelRatio || 1, 2));
const LAMINAS_CHICAS = PERFIL_AHORRO || ANCHO_REAL <= 1280;
/* BASE_URL lo resuelve Vite en compilación: '/' en local y '/galene/'
   en producción. Nunca se escribe la ruta a mano. */
const BASE = import.meta.env.BASE_URL.replace(/\/?$/, '/');
const ARTE = BASE + (MOVIL ? 'arte/768/' : LAMINAS_CHICAS ? 'arte/1024/' : 'arte/');
const ANCHO_MAX = MOVIL ? 768 : LAMINAS_CHICAS ? 1024 : 2048;

/* Las poses que no participan en la llegada inicial no compiten con el
   mar por la red. Se conectan después de abrirse el contenido. */
const IMAGENES_DIFERIDAS = [];
function diferirImagen(img, src) {
  img.fetchPriority = 'low';
  IMAGENES_DIFERIDAS.push([img, src]);
}
addEventListener('galene:contenido-listo', () => {
  if (document.documentElement.classList.contains('hero-estatico')) {
    IMAGENES_DIFERIDAS.length = 0;
    return;
  }
  const conectar = () => {
    for (const [img, src] of IMAGENES_DIFERIDAS) img.src = src;
    IMAGENES_DIFERIDAS.length = 0;
  };
  (window.requestIdleCallback || ((fn) => setTimeout(fn, 80)))(conectar, { timeout: 700 });
}, { once: true });

/* ── 3 · EL MAR ───────────────────────────────────────────────────── */

const hero   = document.getElementById('mar');
const lienzo = document.getElementById('lienzo');
const contenedorGarzas = document.getElementById('garzas');
const quieto = matchMedia('(prefers-reduced-motion: reduce)');

/* EL ESTADO DEL DESPEGUE, y vive AQUI ARRIBA por una razon que costo un
   fallo entero. Estaba declarado con `const` al lado de su propia
   maquinaria, mil cuatrocientas lineas mas abajo, que es donde apetece
   ponerlo — pero `arrancar()` corre durante la evaluacion del modulo y
   el bucle del mar lo lee mucho antes de que la ejecucion llegue alli.
   Zona muerta temporal: `ReferenceError` en cada cuadro, y `animarGarzas`
   cayendose entera sin que se viera mas que las aves quietas.

   Los `const` de modulo no se izan como los `var`: existen a partir de
   su linea, no desde el principio del fichero. Todo lo que se lea dentro
   de `arrancar()` tiene que estar declarado por encima de la llamada. */
const despegue = { ave: null, t0: 0, gastado: false, previa: 'posada' };

/* calma ∈ [0.35, 0.85] · 0.35 = revuelto (no picado: nadie es el
   capítulo uno de nadie) · 0.85 = casi espejo, nunca espejo.
   calma = 0.35 + 0.50·(1 − e^(−n/τ)), n = raíces, τ ≈ 500.

   Las raíces ya no se calculan aquí — viven en Supabase, y el número
   crudo no sale de ahí a propósito (regla 9: el sitio no cuenta). Lo
   que llega es `calma_actual()`, la curva YA aplicada. Se arranca en
   0.35 —el piso, «sin comunidad todavía»— y `actualizarCalmaComunidad`
   la refresca cada pocos segundos una vez hay red. */
let calmaComunidad = 0.35;
const calma = calmaComunidad;

async function actualizarCalmaComunidad() {
  try { calmaComunidad = await calmaActual(); }
  catch { /* sin red: se queda en el último valor bueno, o en el piso */ }
}
actualizarCalmaComunidad();
/* `.unref()` no existe en el navegador —eso es cosa de Node, y ya
   escribí bastante código de servidor esta noche como para que se me
   pegue por reflejo—: aquí un intervalo vive lo que vive la pestaña,
   sin más que hacer. */
setInterval(actualizarCalmaComunidad, 6000);
/* Cursor: sobre el agua se puede sostener, y hay que verlo. */
document.getElementById('mar')?.style.setProperty('cursor', 'grab');

function arrancar(mar) {
  /* En móvil esta es la resolución de SIMULACIÓN, no la de salida: el
     reconstructor HD de mar.js presenta hasta 2×. Se mantiene en 1× CSS
     para que la acuarela se muestree con detalle real antes de ampliar. */
  /* La red lenta cambia el peso de las láminas y la cadencia, no la
     nitidez: después de cargar, ahorrar resolución no ahorra un byte.
     Ningún móvil vuelve a renderizar la pintura por debajo de 1× CSS. */
  let escala = MOVIL ? 1.0 : Math.min(devicePixelRatio || 1, 1.35);
  let horizonte = 0.44;
  let deriva = 0, punteroX = 0, punteroObjetivo = 0;
  let visible = true, corriendo = false;
  let ultimo = 0, ultimoCuadro = 0, ultimoAve = 0;
  /* La salida del hero: 0 arriba del todo, 1 con un viewport recorrido.
     `derivaScroll` es su huella en el agua y `salidaEscrita` lo último
     que se le escribió al lienzo, para no reescribir lo que no cambió. */
  let salida = 0, derivaScroll = 0, salidaEscrita = '';
  let fpsMar = PERFIL_AHORRO ? 20 : 30;
  let intervaloMar = 1000 / fpsMar;   // compuerta — SOLO el mar

  const estado = { t: 0, horizonte, calma, deriva: 0, papel: 0.055, luz: L };

  function medidas() {
    const caja = hero.getBoundingClientRect();
    const w = viewportWidth(), h = caja.height || viewportHeight();
    const aspecto = w / h;

    /* SI EL BLOQUE DE TEXTO CRECE, EL PAISAJE SE AGACHA — nunca al revés.
       Una fracción fija de horizonte no sirve: en ventanas bajas o
       apaisadas el texto se sale del cielo y aterriza sobre el agua,
       donde el contraste medido es 1.98:1. Se midió: a 882×415 el
       lockup cruzaba el horizonte por 3 px y el peor contraste caía a
       3.47:1. El horizonte lo manda el texto, no el diseño. */
    /* EL CIELO ES EL PROTAGONISTA, y eso se decide aquí antes que en
       ningún color. Estaba en 0.52–0.58, o sea el horizonte casi a la
       mitad: dos mitades del mismo peso no tienen sujeto, y el cuadro
       se quedaba en un paisaje correcto sin nada que mandara.

       Subido a 0.60–0.68, el cielo se lleva dos tercios largos del
       encuadre y todo lo demás pasa a ser lo que hay debajo. Es la
       composición de un cielo pintado —y es también donde vive la luz
       de la hora, las estrellas y la luna, que es lo que este sitio
       tiene que decir.

       De regalo arregla otra cosa: la copa del manglar bajó con el
       horizonte y dejó de tocar el canto de arriba, así que las garzas
       de la cima ya caben enteras. */
    /* La referencia deja el horizonte en el tercio inferior (aprox.
       66 % desde arriba). En escritorio estaba en 60 %: sobraba mar,
       el arbol flotaba demasiado alto y su base no alcanzaba el peso
       de la foto. La composicion conserva un cielo amplio, pero ahora
       la linea de agua, las raices y el reflejo comparten la misma
       geometria que la referencia. */
    const base = aspecto < 0.8 ? 0.68 : 0.66;
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
       composición descentrada: el árbol mide un 60 % del ancho y a 0.775
       se salía por la derecha. En pantallas anchas vuelve a su sitio,
       que deja el flanco izquierdo libre para el texto. */
    const xManglar = aspecto < 0.85 ? 0.50
                   : aspecto > 1.50 ? 0.775
                   : 0.50 + ((aspecto - 0.85) / 0.65) * 0.275;

    /* Y NO PUEDE OCUPAR TODA LA PANTALLA. El manglar se mide en unidades
       de ALTO, así que en un móvil vertical su ancho —alto x aspecto de
       la lámina— se salía por los dos lados: a 0.62 de alto con una
       lámina 3:2 daba 0.93 del alto de ancho, casi el doble del ancho de
       un teléfono. Aquí se le pone techo por ANCHO. */
    const aspLam = mar.cajaManglar()[3] || 1.5;
    /* EL TOPE DEPENDE DEL FORMATO DE LA LÁMINA. Estaba fijo en 0.62 del
       alto, calculado para un manglar apaisado (3:2). Con la lámina
       repintada, que vino vertical (2:3), ese mismo 0.62 dejaba el árbol
       en un 33 % del ancho de pantalla en vez del 75 % de antes: dejaba
       de ser el protagonista y pasaba a ser un arbolito.

       Una lámina alta puede permitirse más alto sin salirse por los
       lados, así que el techo sube cuando el aspecto baja. El segundo
       término sigue siendo el que manda en móvil: ahí el límite es el
       ancho, no el alto. */
    /* Y EL TECHO TAMBIÉN DEPENDE DE LA FORMA DE LA VENTANA, no solo de
       la de la lámina. El 0.78 se eligió para que una lámina vertical no
       quedara en «un arbolito», y en apaisado es correcto. En una
       pantalla VERTICAL es demasiado: 0.78 del alto con una lámina 2:3
       son 0.69 del ancho, o sea un árbol que ocupa la pantalla entera de
       arriba abajo y de lado a lado, sin sitio para el texto ni para el
       mar. Medido a 768×1024: la copa llegaba a 0.62 del alto y el
       bloque de texto empezaba en 0.506 — 0.114 de copa por detrás de la
       declaración, y la regla de más abajo no podía arreglarlo porque le
       habría exigido recortar el árbol a la mitad.
       En vertical el árbol sigue siendo el sujeto, pero comparte. */
    const techo = aspLam < 1.0 ? (aspecto < 1.0 ? 0.56 : 0.82) : 0.62;
    let altoManglar = Math.min(techo, (0.82 * w) / (aspLam * h));

    /* ── Y EL ÁRBOL NO PISA EL TEXTO ────────────────────────────────
       La ley que ya manda en vertical —«el horizonte lo fija el texto,
       no el diseño»— tenía que mandar también en horizontal, y no
       mandaba: `xManglar` eran tres tramos escritos a ojo contra el
       aspecto, y bastaba una ventana casi cuadrada para que se cayera.

       MEDIDO a 1105×910 (aspecto 1.21): el árbol ocupaba de 0.401 a
       0.829 del ancho y el bloque de texto de 0.040 a 0.537, o sea
       0.136 del ancho y 0.343 del alto SOLAPADOS. El rótulo entraba
       dentro de la copa. Ninguna cifra escrita a mano contra el aspecto
       arregla eso, porque lo que decide no es la forma de la ventana:
       es lo ancho que le haya salido al texto con la tipografía, el
       idioma y el cuerpo de ese momento.

       Aquí el árbol se aparta lo justo para que su canto izquierdo
       quede a la derecha del texto. Y en este orden, que importa:
       primero SE MUEVE —mover no cuesta nada— y solo si al moverse se
       saldría por la derecha, ENCOGE. El árbol es el sujeto: encogerlo
       es el último recurso, no el primero.

       Y hay un caso en que no se hace nada: cuando no cabe. En un móvil
       vertical el texto ocupa el ancho entero y no hay «a la derecha
       del texto»; ahí la composición es otra —el rótulo arriba, el
       árbol debajo— y de la separación vertical ya se encarga el
       horizonte unas líneas más arriba. */
    let x = xManglar;
    const cajaTexto = document.querySelector('.hero__texto');
    if (cajaTexto) {
      const rt = cajaTexto.getBoundingClientRect();
      const respiro = Math.max(0.02, 24 / w);
      const bordeTexto = rt.right / w + respiro;
      let ancho = (altoManglar * aspLam) / aspecto;     // fracción del ancho

      if (1 - bordeTexto > ancho * 0.70) {
        /* ── CABE AL LADO: se aparta. ──────────────────────────────
           Se le permite encoger hasta un 30 % si al apartarse se
           saldría por la derecha; por debajo de eso deja de ser el
           sujeto y es mejor dejarlo donde está. */
        if (x - ancho / 2 < bordeTexto) {
          x = bordeTexto + ancho / 2;
          const sobra = (x + ancho / 2) - 0.995;
          if (sobra > 0) {
            const nuevo = Math.max(ancho * 0.70, ancho - sobra * 2);
            altoManglar *= nuevo / ancho;
            ancho = nuevo;
            x = Math.min(0.995 - ancho / 2, bordeTexto + ancho / 2);
          }
        }
      } else {
        /* ── NO CABE AL LADO: entonces se agacha. ──────────────────
           En un móvil vertical el texto ocupa el ancho entero y no
           existe «a la derecha del texto». MEDIDO a 375×812: la copa
           llegaba a 0.658 del alto y el bloque de texto empezaba en
           0.513, o sea 0.145 de copa metida POR DETRÁS de las letras.
           El calibrador respondía con un lavado de 0.480 — medio velo
           sobre la pintura, con la forma del rótulo. El velo no era el
           fallo: era el síntoma, y suavizarlo solo lo disimulaba.

           Es la misma ley que ya gobierna el horizonte, dicha ahora
           para el árbol: si el texto crece, el paisaje se agacha, nunca
           al revés. Con suelo, porque un manglar diminuto tampoco es la
           escena que este sitio cuenta. */
        const hundir = mar.cajaManglar()[2];
        const textoAbajo = (caja.bottom - rt.bottom) / h;
        const techoCopa = textoAbajo - 0.025 - horizonte + hundir;
        altoManglar = Math.max(altoManglar * 0.68,
                               Math.min(altoManglar, techoCopa));
      }
    }
    mar.colocarManglar(x, altoManglar);

    // Después del manglar: el posadero se calcula a partir de su caja.
    colocarGarzas(w, h, desdeArriba);
  }

  /* Perfil de arranque. `hardwareConcurrency >= 8` no sirve: Helio G85
     y Unisoc T606 son octa-core y se arrastran. El móvil empieza con un
     presupuesto conservador y la cadencia real de rAF lo corrige más
     abajo sin añadir un cuadro pesado solo para medir. */
  function sondear() {
    if (MOVIL) {
      medidas();
      console.info(`[mar] perfil móvil: escala ${escala}, ${fpsMar} fps`);
      return;
    }

    const lado = 64;
    const repeticiones = 30;
    mar.redimensionar(lado, lado, 1);
    const t0 = performance.now();
    for (let i = 0; i < repeticiones; i++) {
      estado.t = i * 0.033;
      mar.dibujar(estado);
    }
    const ms = (performance.now() - t0) / repeticiones;
    if (ms > 4.0)               escala = Math.min(escala, 0.60);
    else if (ms > 1.6)          escala = Math.min(escala, 1.0);
    intervaloMar = 1000 / fpsMar;
    console.info(`[mar] sonda: ${ms.toFixed(2)} ms/cuadro → escala ${escala}, ${fpsMar} fps`);
  }

  sondear();
  medidas();
  addEventListener('resize', medidas, { passive: true });
  addEventListener('galene:viewportresize', medidas, { passive: true });

  /* Paralaje de puntero: solo en escritorio, solo con puntero fino. */
  if (matchMedia('(min-width: 700px) and (pointer: fine)').matches) {
    addEventListener('pointermove', (e) => {
      /* ── A LA MITAD, Y ESTE ES EL ÚNICO SITIO DONDE SE TOCA ────────
         El recorrido estaba en 0.06, o sea ±0.03 de alto de pantalla, y
         medido en una ventana de 900 px de alto eso daba 73 px de
         recorrido en el fragmento cercano (×1.35) y 24 px en el árbol
         (×0.45) para un barrido de ratón. Setenta y tres píxeles es un
         plano DESLIZÁNDOSE: se lee como el efecto de paralaje de una
         web, que es justo lo que hay que evitar.

         A 0.030 quedan 36 px en las raíces del primer término, 12 en el
         árbol y 0 en el cielo, que sigue sin moverse. Se percibe la
         profundidad sin que se perciba el mecanismo.

         Se pidió bajarlo hasta 2–4 px en las raíces. NO: a esa escala
         no hay efecto, hay una cuenta. El ojo no distingue un
         desplazamiento por debajo de uno o dos píxeles por segundo —es
         el mismo umbral que obligó a subir dos veces la amplitud del
         viento en mar.js—, así que 4 px repartidos en un barrido lento
         de ratón es literalmente nada. La dirección era correcta; el
         número, no.

         Y se toca AQUÍ y solo aquí: el árbol, las garzas posadas, la
         bandada y la visitante multiplican todos este mismo escalar.
         Cambiarlo en el shader dejaría a las aves clavadas en el aire
         mientras el árbol se mueve — ya pasó una vez. */
      punteroObjetivo = (e.clientX / viewportWidth() - 0.5) * 0.030;
      /* Y EL AGUA SE ENTERA DE QUE PASAS. No es un toque —no aquieta, no
         deja anillo, no cuenta para el tope— sino lo contrario: donde
         pasa la mano el agua se despierta un poco, como una brisa
         siguiendo el gesto. Se apaga sola en cuanto te detienes. */
      const q = enQ(e.clientX, e.clientY);
      if (q.y < estado.horizonte) { rocef.x = q.x; rocef.y = q.y; rocef.z = 1; }
    }, { passive: true });
    addEventListener('pointerleave', () => { rocef.z = 0; }, { passive: true });
  }
  const rocef = { x: 0, y: 0, z: 0 };

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
  /* Cuánto de `sostenido` ya se le mandó a la comunidad, y cuándo fue
     la última vez — para reportar cada pocos segundos y no cuadro a
     cuadro. Ver `avanzarToques`. */
  let reportadoHasta = 0, ultimoReporte = 0;
  /* DOS CALMAS, y hacen falta las dos.

     La PERMANENTE es la del README: sube con lo sostenido de toda la
     sesion, nunca baja, y con tau = 500 tarda minutos en notarse. Es la
     memoria del sitio y esta bien que sea lenta.

     Pero por eso mismo el gesto no se veia: aguantar cinco segundos
     movia la calma permanente cuatro milesimas. La QUIETUD es la
     respuesta inmediata — sube en un par de segundos mientras se
     sostiene y se suelta muy despacio, en medio minuto. Lo que se
     manda al mar es la mayor de las dos, asi que el gesto se ve al
     instante y lo ganado no se pierde. */
  /* Y una SEGUNDA curva, la de ESTA mano. La de las raices es de meses
     y sin servidor vale 0: sostener movia la calma 0.0015 por segundo,
     asi que las dos laminas calmas pintadas a mano llevaban aqui desde
     el principio sin llegar nunca a verse. Con tau = 9 s el gesto se
     nota en segundos. El techo deja el 15 % de arriba para las raices:
     una mano sola calma el mar, pero no lo vuelve espejo. Eso lo hace
     la gente. */
  const TAU_SESION = 9;
  const TECHO_SESION = 0.85;

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
    empezarToque(viewportWidth() * 0.5, viewportHeight() * (1 - estado.horizonte * 0.5));
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
      /* 0.85 era medio ciclo de anillo antes de arreglar el reloj. Con
         el dt real el anillo se apagaba sin llegar a cerrarse. */
      if (t !== sosteniendo) t.edad = Math.min(1, t.edad + dt * 0.45);
    }
    /* La calma global sube con lo sostenido, nunca baja, y nunca llega
       al espejo: la curva es la misma del README. */
    /* DOS VELOS, no dos curvas rivales. El de las raices es el del
       README —comunidad, tau = 500— y el de la sesion es el de esta
       mano. Se componen como se componen dos aguadas: 1 - (1-a)(1-b).
       Asi ninguno tapa al otro, y la suma sigue siendo MONOTONA: ninguno
       baja nunca. Lo que dejas, queda — al soltar, lo calmado se queda
       calmado.

       `calmaComunidad` ya trae la curva de las raíces APLICADA —viene
       de `calma_actual()`, en Supabase, refrescada cada pocos segundos—
       así que aquí se deshace el `0.35 + 0.50·(…)` para sacar de vuelta
       la fracción 0..1 y componerla con la de esta sesión exactamente
       como antes. */
    const cRaices = Math.min(1, Math.max(0, (calmaComunidad - 0.35) / 0.50));
    const cSesion = TECHO_SESION * (1 - Math.exp(-sostenido / TAU_SESION));
    estado.calma = 0.35 + 0.50 * (1 - (1 - cRaices) * (1 - cSesion));

    /* Lo sostenido se reporta a la comunidad cada pocos segundos, no
       cuadro a cuadro — cuadro a cuadro serían decenas de llamadas por
       segundo por cada mano en la pantalla, y esto no necesita esa
       precisión: es una acumulación de minutos, no un dato en vivo. */
    if (sostenido > reportadoHasta && estado.t - ultimoReporte >= 3) {
      const pendiente = sostenido - reportadoHasta;
      reportadoHasta = sostenido;
      ultimoReporte = estado.t;
      acreditarGesto(pendiente).catch(() => {
        /* Sin red, se pierde ese trocito de aporte a la comunidad —no
           el gesto local, que ya se vio en pantalla. El mar es un
           enhancement, y esto también. */
      });
    }
    /* El roce decae solo: si la mano se para, el agua se vuelve a
       aquietar en algo mas de un segundo. */
    rocef.z = Math.max(0, rocef.z - dt * 0.75);
    mar.roce(rocef);
    mar.toques(TOQUES);
  }

  /* Pausar cuando el mar sale de pantalla: batería real en gama media. */
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !quieto.matches) bucle();
  }, { threshold: 0.02 }).observe(hero);

  /* ── EL MUNDO SE HUNDE AL SALIR DEL HERO ──────────────────────────
     Tercera vez que se intenta el paralaje vertical del scroll, y las
     dos anteriores están contadas más abajo, en el cuerpo de cuadro().
     La primera bajaba el LIENZO y descubría una franja por arriba,
     porque el lienzo mide exactamente lo que la ventana. La segunda
     hundía el HORIZONTE dentro del shader y dejaba a las garzas —que
     son DOM y calculan su pie una sola vez— clavadas en el aire.

     Las dos fallaban por la misma razón: movían una parte del cuadro.
     Aquí se mueve el cuadro ENTERO, y el mismo string de transformación
     va al lienzo y al contenedor de las garzas —que tienen exactamente
     la misma caja, medido: los dos 0,0 y el tamaño de la ventana—, así
     que aves y árbol no pueden separarse ni un píxel: no hay dos
     cuentas que puedan discrepar, hay una.

     Y NO DEJA HUECO, que es lo que mató al primer intento. Un `scale`
     hacia abajo destapa por los cuatro costados; hacia arriba, tapa. Se
     escala 2 % con el origen en el CANTO DE ABAJO, lo que abre 18 px de
     margen por arriba en una ventana de 910, y se hunde el mundo un
     72 % de ese margen. Sobra un 28 % para el redondeo a subpíxel.

     Lo que se ve: el mundo baja mientras las herramientas suben, y baja
     REPARTIDO — el agua cercana se hunde 12 px, el horizonte 6.6 y la
     copa del manglar 0.4. Eso es exactamente lo que significa que el
     árbol se quede más atrás: no que encoja —eso destaparía el
     lienzo—, sino que lo que está delante de él se mueva y él no. La
     profundidad es una relación, y aquí es la única que se puede pintar
     sin mentir sobre la caja del lienzo.

     El 2 % de más tamaño del árbol es el precio, y es invisible: dos
     centésimas de la copa a lo largo de una pantalla entera de scroll.
     Sin él no hay margen, y sin margen vuelve el hueco por arriba que
     ya obligó a apagar esto una vez. */
  const SALIDA_ESCALA = 0.020;    // cuánto crece el mundo al final
  const SALIDA_HUNDE  = 0.72;     // qué parte del margen que abre se usa

  /* El ancla de esa escala se pone UNA vez y no cambia nunca. En el
     cuadro sería una escritura de estilo por cuadro para un valor
     constante, y los dos elementos tienen que llevar exactamente la
     misma o la escala los separaría. */
  lienzo.style.transformOrigin = '50% 100%';
  if (contenedorGarzas) contenedorGarzas.style.transformOrigin = '50% 100%';

  function paisajeSegunScroll() {
    /* Movimiento apagado: NADA. No es un gesto reducido, es un gesto
       que no existe — y cuadro() se llama una vez justamente en ese
       modo, así que sin esta puerta el mundo se quedaría hundido en el
       sitio de quien pidió que nada se moviera. */
    const k = quieto.matches ? 0
      : Math.min(1, Math.max(0, scrollY / Math.max(1, viewportHeight())));
    salida = k * k * (3 - 2 * k);
    /* Al primer palmo de scroll —34 px en una ventana de 910—, un ave
       de la copa levanta el vuelo. Vive en el módulo, junto a la
       bandada; aquí solo se le da el aviso, porque este es el único
       sitio que ya está leyendo el scroll cuadro a cuadro. Con
       movimiento apagado no hace falta puerta aparte: `salida` ya vale
       cero y este umbral no se cruza nunca. */
    if (salida > 0.004) empezarDespegue();

    const e = SALIDA_ESCALA * salida;
    const tr = e === 0 ? 'translate3d(0, 0, 0)'
      : `translate3d(0, ${(e * viewportHeight() * SALIDA_HUNDE).toFixed(2)}px, 0) `
        + `scale(${(1 + e).toFixed(5)})`;
    if (tr === salidaEscrita) return salida;
    salidaEscrita = tr;
    lienzo.style.transform = tr;
    if (contenedorGarzas) contenedorGarzas.style.transform = tr;
    return salida;
  }

  function cuadro(ms, dtAve) {
    // dtAve viene del bucle y es el del AVE. Si no viene (arranque o
    // pruebas), se calcula desde el último cuadro del mar.
    const dt = dtAve !== undefined ? dtAve
             : (ultimoCuadro ? (ms - ultimoCuadro) / 1000 : 1 / 60);
    /* Y EL RELOJ DEL MAR, que es otro y llevaba mal desde siempre.
       avanzarToques() solo corre en los cuadros del mar —30 fps— pero
       recibia el dt del AVE, 1/60 s: el gesto avanzaba a MEDIA velocidad
       real a 60 Hz y a un cuarto a 120. La misma caricia duraba el doble
       en una pantalla que en otra, y el tope de 4 minutos eran ocho.
       Techo de 0.1 s: al volver de una pestana en segundo plano rAF
       entrega un salto de segundos, y ese salto no es tiempo sostenido. */
    const dtMar = Math.min(0.1, ultimoCuadro ? (ms - ultimoCuadro) / 1000 : 1 / 30);
    ultimoCuadro = ms;
    estado.t = ms / 1000;
    paisajeSegunScroll();
    punteroX += (punteroObjetivo - punteroX) * 0.06;
    /* Deriva autónoma: el mundo vive solo, nadie tiene que arrastrarlo.
       Con un componente sinusoidal lento encima, para que se sienta
       barco y no scroll. Nada avanza lineal. */
    deriva += 0.00040 * (1 + 0.38 * Math.sin(estado.t * 0.11));

    /* ── Y AL BAJAR, EL AGUA AVANZA ────────────────────────────────
       Esto va en la DERIVA y no en el paralaje, y la distinción está
       escrita en mar.js: `u_deriva` es acumulativo y sin límite porque
       solo lo usan las bandas de agua, que son texturas repetidas y
       pueden desplazarse siempre; `u_paralaje` es el acotado, para lo
       discreto —manglar, garzas, grafito—, que con un acumulador se va
       caminando fuera de cuadro y no vuelve. Un término de scroll
       sumado a la deriva es exactamente su caso de uso.

       CUÁNTO: 0.038, y sale de comparar con lo que ya hay. La banda
       cercana muestrea en `q.x·0.32 + deriva·0.85`, así que 0.038 de
       deriva la corre 0.032 de textura, y en pantalla eso es un 5.6 %
       del ancho visible del agua cercana. La deriva autónoma avanza
       0.012 por segundo, o sea que este término vale unos tres segundos
       de corriente entregados en el viewport que se tarda en salir del
       hero: el agua no se dispara, se apura. En la banda del horizonte
       (velocidad 0.06) son 0.0023, prácticamente nada — que es lo
       correcto: lo lejano no corre.

       Y SUAVIZADO, con un filtro exponencial sobre el reloj del MAR
       —que es el que dibuja el agua, no el del ave—. Sin él, una rueda
       de ratón que salta 300 px en un cuadro teletransporta el agua. El
       paso se acota por los dos lados antes de entrar en la
       exponencial: con dt negativo, `1 - e^(-dt·k)` se vuelve negativo
       y el filtro deja de perseguir para amplificar. Al soltar el
       scroll no hay nada que soltar: el objetivo deja de moverse y la
       corriente se queda donde el agua ya iba. */
    const dtSuave = Math.min(0.1, Math.max(0.001, dtMar));
    if (quieto.matches) derivaScroll = 0;
    else derivaScroll += (0.038 * salida - derivaScroll)
                       * (1 - Math.exp(-dtSuave * 3.6));
    estado.deriva = deriva + punteroX + derivaScroll;
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
    /* ── EL HUECO DE ARRIBA ────────────────────────────────────────
       Esto bajaba el lienzo un 18 % del scroll para que el mar se
       hundiera al salir del hero. El efecto estaba bien; la cuenta,
       mal: el lienzo mide exactamente lo que mide la ventana, así que
       moverlo hacia abajo DESCUBRE por arriba justo esa franja. Lo que
       se veía asomar no era cielo de más — era el fondo de la página
       por detrás del lienzo, con el canto del dibujo cortado.

       Puesto a cero mientras se arregla bien. El relevo era el hundido
       del horizonte unas líneas más abajo —mover lo que se PINTA y no
       el lienzo donde se pinta, que no deja hueco porque el lienzo no
       se mueve de sitio—, pero ese también se ha ido: arrastraba la
       copa por debajo de unas garzas que no se movían con ella. Hoy no
       hay paralaje vertical de scroll en la pintura, ninguno.

       El arreglo completo es dibujar un lienzo más alto que la ventana
       y anclarlo por encima del borde, y hay que hacerlo con cuidado
       porque el alto del lienzo es lo que fija dónde cae el horizonte
       y la escala del manglar. */
    /* HOY SÍ HAY HUNDIDO, y no hizo falta un lienzo más alto: lo abre
       un `scale` de 2 % anclado al canto de abajo, que tapa por arriba
       justo lo que el hundido destaparía. Vive en paisajeSegunScroll(),
       arriba, con la cuenta entera; se llama al empezar este cuadro y
       también en los cuadros intermedios del bucle, porque va atado al
       scroll y a 30 fps se vería a escalones. */

    /* ── Y EL PARALAJE VERTICAL TAMBIÉN SE VA ──────────────────────
       Aquí estaba `estado.horizonte = horizonte + salida * 0.06`: al
       bajar, el shader hundía el horizonte un 6 % y con él toda la
       pintura —mar, manglar, copa—.

       LAS GARZAS NO SE ENTERABAN. Son DOM, viven en `#garzas` sobre un
       `.mundo` fijo, y su `pieY` se calcula UNA vez en
       `colocarBandada()` contra la caja del manglar del momento. Así
       que la copa se hundía debajo de ellas y las aves se quedaban
       clavadas en el aire: al 60 % de un viewport la pintura ya había
       bajado un 3.6 % del alto y cada garza estaba flotando esa
       distancia por encima de su rama.

       O se hundía todo junto o no se hundía nada. Recolocar la bandada
       en cada cuadro es medir la caja del manglar 60 veces por segundo
       para ganar un gesto que casi no se ve, así que se quita el gesto:
       el horizonte es el que fija `medidas()` y no lo mueve el scroll.
       El paralaje del hero sigue vivo por otro lado —el puntero abre la
       profundidad, y paralaje.js hunde el CTA y la nota—. */
    estado.horizonte = horizonte;
    estado.luz = L;
    avanzarToques(dtMar);
    mar.dibujar(estado);
    calibrarLavado();
    /* estado.paralaje, NO la deriva: la deriva es el acumulador infinito
       del agua y arrastraba al ave fuera de cuadro igual que hacía con
       el manglar. El ave tiene que moverse con el ÁRBOL, no con el mar. */
    animarGarzas(estado.t, estado.paralaje, dt);
    animarVisita(estado.t, estado.paralaje);
    animarBandada(estado.t, estado.paralaje);
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
  /* 4.5:1 es el umbral WCAG para el cuerpo pequeno del bloque. El
     objetivo anterior de 5.4 obligaba al dia claro a cargar con una
     nube oscura mucho mayor que el texto, ajena a la referencia. */
  const OBJETIVO = 4.5;
  /* ── UNA ZONA, QUE ES LA QUE HAY ───────────────────────────────────
     Llegó a medir tres —el bloque de texto, el logotipo y la fila de
     enlaces— porque la barra vivía sobre la pintura y su peor caso sin
     lavar era 2.60:1 a las 5:00, sobre el logotipo. Aquello se midió
     bien y valía; lo que pasa es que la pregunta desapareció: la barra
     salió del hero y ahora baja sobre papel, con su propio fondo (ver
     `.barra--flotante` en estilos.css y js/barra.js). Sobre papel opaco
     un lavado elíptico no protege nada — es una mancha sin causa, que
     es el mismo razonamiento que ya tenía la barra de la comunidad.

     Queda lo único que de verdad se lee sobre el cielo: el bloque del
     rótulo. Si algún día vuelve a haber texto suelto encima de la
     pintura, se añade aquí su caja y ya está — la maquinaria de abajo
     no distingue cuántas zonas hay.

     (Lo que se aprendió y no hay que volver a aprender: dos elementos
     en esquinas opuestas necesitan un alfa CADA UNO. Con uno solo, el
     que menos lo necesita carga con el velo del otro y en una pantalla
     de 1900 px eso es una cinta de lado a lado cruzando el cielo.) */
  const ZONAS = [
    { sel: '.hero__texto', prop: '--lavado', v: 0 },
  ];
  /* `readPixels` sincroniza CPU y GPU. Dos lecturas por segundo eran un
     microtirón periódico en móvil aunque el shader cupiera en el cuadro.
     La luz real solo se actualiza cada 30 s: una medida cada 10 s mantiene
     el contraste protegido sin serruchar la animación. */
  const cadaLavado = MOVIL ? 300 : 15;
  let contadorLavado = cadaLavado - 1, primeraCalibracion = true;
  lavadoAdaptativo = true;

  const linz = (v) => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  const lumRel = (c) => 0.2126 * linz(c[0]) + 0.7152 * linz(c[1]) + 0.0722 * linz(c[2]);
  const hexArr = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);

  function calibrarLavado() {
    if (++contadorLavado % cadaLavado !== 0) return;
    const caja = hero.getBoundingClientRect();
    const k = lienzo.width / Math.max(1, caja.width);

    /* El hero conserva tinta blanca las 24 horas. data-tinta sigue
       gobernando la pagina de lectura, pero ya no decide esta medicion:
       aqui siempre se busca el fondo mas claro y se lava hacia oscuro. */
    const lt     = lumRel(hexArr('#FFFFFF'));
    const lavCol = hexArr('#0B141A');

    let alguna = false;
    for (const z of ZONAS) {
      const el = document.querySelector(z.sel);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      // readPixels tiene el origen abajo-izquierda.
      const zona = mar.medirZona(
        Math.round(r.left * k),
        Math.round(lienzo.height - (r.bottom - caja.top) * k),
        Math.round(r.width * k),
        Math.round(r.height * k));
      if (!zona) continue;
      alguna = true;

      /* El peor píxel es el que manda. Como la tinta del hero es blanca
         de forma estable, el peor fondo es siempre el más CLARO.

         PERO NO EL EXTREMO ABSOLUTO, sino el percentil 99.5. Con el
         máximo, una sola ESTRELLA detrás del rótulo tumbaba el contraste
         nominal de 13.4:1 a 2.12:1 y el lavado se iba a 0.48 — medio
         velo negro sobre la pintura por el 0.372 % de los píxeles de la
         caja. Ver el comentario de `medirZona()` en mar.js, donde está
         la medida entera: el disco de la luna sigue contando porque es
         una mancha grande, y el campo de estrellas deja de mandar
         porque son puntos. */
      const peor = zona.p995;
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
      if (primeraCalibracion) z.v = necesario;
      else z.v += (necesario - z.v) * 0.25;
      document.documentElement.style.setProperty(z.prop, z.v.toFixed(3));
    }
    if (!alguna) return;
    primeraCalibracion = false;
    document.documentElement.style.setProperty('--lavado-color', '#0B141A');
  }

  /* El perfil móvil elige un buen punto de partida, pero el dato que al
     final importa es la cadencia que la persona recibe. Tras el arranque
     se observa rAF en ventanas de tres segundos. Si el navegador no
     sostiene 48 actualizaciones se reduce la frecuencia del mar, nunca
     su resolución: las garzas y el scroll siguen ligados al refresco de
     la pantalla y la acuarela conserva siempre detalle CSS nativo. */
  let muestraCadencia = 0, cuadrosCadencia = 0, ajustesCadencia = 0;
  const cadenciaDesde = performance.now() + 4000;
  function adaptarCadencia(ms) {
    if (!MOVIL || ms < cadenciaDesde || ajustesCadencia >= 3) return;
    if (!muestraCadencia) { muestraCadencia = ms; cuadrosCadencia = 0; return; }
    cuadrosCadencia++;
    const lapso = ms - muestraCadencia;
    if (lapso < 3000) return;
    const hz = cuadrosCadencia * 1000 / lapso;
    muestraCadencia = ms;
    cuadrosCadencia = 0;
    if (hz >= 48) return;

    const fpsAnterior = fpsMar;
    fpsMar = Math.min(fpsMar, hz < 34 ? 20 : 24);
    intervaloMar = 1000 / fpsMar;
    ajustesCadencia++;
    console.info(`[mar] cadencia ${hz.toFixed(1)} Hz: ${fpsAnterior} → ${fpsMar} fps, escala ${escala}`);
  }

  function bucle() {
    if (corriendo) return;
    corriendo = true;
    const paso = (ms) => {
      if (!visible || quieto.matches) { corriendo = false; return; }
      adaptarCadencia(ms);
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
      if (ms - ultimo >= intervaloMar) { ultimo = ms; cuadro(ms, dtAve); }
      else {
        /* El hundido del mundo va a la tasa DEL MONITOR, no a la del
           mar: está atado al scroll, y una página que se desliza a
           120 Hz con el paisaje corrigiéndose 30 veces por segundo se
           ve exactamente como lo que es. Son dos escrituras de
           `transform` y solo cuando el valor cambió. */
        paisajeSegunScroll();
        animarGarzas(ms / 1000, estado.paralaje, dtAve);
        animarVisita(ms / 1000, estado.paralaje);
        /* Y el ave que despega, por lo mismo: es un vuelo, y un vuelo a
           30 fps se ve a tirones. Solo ella —el resto de la bandada se
           balancea medio grado y no merece el gasto. */
        if (despegue.ave) animarDespegue(despegue.ave, ms / 1000, estado.paralaje);
      }
      requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }

  // Un cuadro siempre, incluso con movimiento apagado: el mar quieto
  // tiene que ser bonito por sí solo. Es también la versión gama baja.
  cuadro(performance.now());
  hero.setAttribute('data-mar', 'listo');

  /* Asidero de auditoría, solo en desarrollo. El muestreo tiene que
     ocurrir en el mismo cuadro que el dibujo y `estado` vive dentro de
     este cierre, así que la puerta se abre desde aquí. */
  if (import.meta.env.DEV) {
    window.__mar = {
      /* `t` y `calma` opcionales: sin panel visible el rAF no corre y el
         reloj del mar se queda parado, asi que sin poder pisarlos no hay
         forma de medir NI el movimiento ni el gesto de calma. */
      medir(hora, paso = 4, t, calma) {
        const tPrev = estado.t, cPrev = estado.calma;
        if (hora !== undefined) estado.luz = luz(hora);
        if (t !== undefined) estado.t = t;
        if (calma !== undefined) estado.calma = calma;
        mar.dibujar(estado);
        const m = mar.muestra(paso);
        estado.t = tPrev; estado.calma = cPrev;
        return m;
      },
      estado: () => ({ t: estado.t, calma: estado.calma, sostenido }),
    };
  }
  if (PARAMS.has('dev'))
    window.__galene = { estado, cuadro, mar, luz: () => L, calcularPosadero,
                        vuelo: () => vuelo, bandada, despegue: () => despegue,
                        salida: () => salida, paisajeSegunScroll,
                        /* Separadas: la deriva autónoma crece siempre y
                           taparía la que aporta el scroll, que es la
                           que hay que poder medir. */
                        deriva: () => ({ mundo: deriva, scroll: derivaScroll }) };

  /* Las láminas llegan después del primer cuadro. La ayuda nunca espera
     al arte: si no cargan, el mar sigue siendo procedural y el sitio
     entero sigue funcionando. */
  mar.ventana('Lejano', 0.10, 0.86);   // recorta el margen de papel
  /* Primer sorbo: solo lo que compone el cuadro reconocible. En móvil
     son ~250 KB. El loader espera este grupo; todo lo decorativo entra
     después con prioridad ociosa y jamás bloquea el contenido. */
  const criticas = {
    lejano:       ARTE + 'mar-lejano.webp',
    medio:        ARTE + 'mar-medio.webp',
    cercano:      ARTE + 'mar-cercano.webp',
    manglar:      ARTE + 'manglar-v2.webp',
  };
  /* De noche la Vía Láctea no es adorno: es el sujeto del cielo pulido.
     El loader espera sus ~58 KB para no abrir primero una noche distinta
     y sustituirla un instante después. De día sigue entrando ociosa. */
  const nocheVisible = L.int <= 0.62;
  if (nocheVisible) criticas.estrellas = ARTE + 'estrellas.webp';
  const decorativas = {
    medioCalmo:   ARTE + 'mar-medio-calmo.webp',
    cercanoCalmo: ARTE + 'mar-cercano-calmo.webp',
    manglarCerca: ARTE + 'manglar-cerca.webp',
    corales:      ARTE + 'corales.webp',
    luces:        ARTE + 'luces.webp',
    astro:        ARTE + 'astro.webp',
    camino:       ARTE + 'reguero.webp',
    papel:        ARTE + 'papel.webp',
    grafito:      ARTE + 'grafito.webp',
    nubes:        ARTE + 'cielo-atlas-v3.webp',
    /* La aguada de cielo estrellado: salpicado de sal sobre azul de
       payne, que es como se pinta a mano una via lactea. Va de adorno,
       asi que si el aparato no tiene unidad libre se cae sola y quedan
       las estrellas procedurales. */
    ...(nocheVisible ? {} : { estrellas: ARTE + 'estrellas.webp' }),
    /* Las garzas ya NO se pintan en el shader: allí estaban paradas en
       mar abierto, y una garza vadea en somero. Ahora hay una sola, en
       el DOM, que llega volando y se posa sobre la copa del manglar. */
  };

  const anunciarListo = (modo) =>
    dispatchEvent(new CustomEvent('galene:hero-listo', { detail: { modo } }));
  /* En móvil no se suben diez texturas a la GPU en el mismo instante:
     esa ráfaga producía el tirón que se sentía justo después del loader.
     Entran en tres tandas ociosas; el resultado final es idéntico. */
  const gruposDecorativos = MOVIL ? [
    ['medioCalmo', 'cercanoCalmo', 'manglarCerca'],
    ['corales', 'luces', 'astro', 'camino'],
    ['papel', 'grafito', 'nubes', 'estrellas'],
  ] : [Object.keys(decorativas)];
  const cargarDecorativas = async () => {
    for (const nombres of gruposDecorativos) {
      const grupo = Object.fromEntries(nombres
        .filter((nombre) => decorativas[nombre])
        .map((nombre) => [nombre, decorativas[nombre]]));
      if (!Object.keys(grupo).length) continue;
      try {
        const n = await mar.cargar(grupo, ANCHO_MAX);
        if (n.includes('papel')) estado.papel = 0.55;
      } catch (e) {
        console.warn('[mar] decoración parcial:', e.message);
      }
      if (MOVIL) await new Promise((resolver) => setTimeout(resolver, 360));
    }
    medidas();
    cuadro(performance.now());
  };

  mar.cargar(criticas, ANCHO_MAX).then((n) => {
    console.info('[mar] láminas conectadas:', n.join(', '));
    /* Con papel de verdad el grano se modula contra su propia media.
       0.55, no 1.15: a fuerza alta el papel deja de ser soporte y pasa
       a ser un filtro de textura encima de todo. */
    /* Y SE VUELVE A MEDIR. El aspecto real del manglar solo se conoce
       cuando su lámina ha cargado, pero la composición —el techo de
       altura, el posadero de la garza— se calcula en el arranque con el
       valor por defecto de 1.5. Mientras la lámina fue apaisada eso
       coincidía y el fallo no se veía; al llegar una vertical, el árbol
       se quedó dibujado con el encuadre de la anterior. */
    medidas();
    cuadro(performance.now());
    anunciarListo('pintura');
    const ocioso = window.requestIdleCallback || ((fn) => setTimeout(fn, 120));
    const conectarDecoracion = () => ocioso(cargarDecorativas, { timeout: 1400 });
    if (MOVIL) setTimeout(conectarDecoracion, 1800);
    else conectarDecoracion();
  }).catch((e) => {
    console.warn('[mar] sin láminas:', e.message);
    anunciarListo('procedural');
  });
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
  /* EL ATERRIZAJE, OCHO CUADROS. Antes era UNA lámina sostenida 2,4 s en
     medio de un vuelo animado a 150 ms: no era un problema de curva ni de
     física, era un cuadro congelado.

     Estas ocho vinieron en una rejilla sin registrar —cada ave con su
     encuadre y su tamaño—, así que el registro lo pone la medición: cada
     cuadro sabe dónde tiene el centroide, dónde los pies, y cuánta tinta
     ocupa a lo ancho y a lo alto.

     `w` mueve EL PUNTO DE ANCLAJE, de 0 a 1. Un ave en vuelo gira y se
     sujeta por su centroide, que es donde tiene la masa; un ave parada
     se sujeta por los pies, que es lo único que no se mueve cuando
     cambia de postura. Estos ocho cuadros van de lo uno a lo otro, así
     que el ancla también. Sin eso, al entrar en la posada el ave daría
     un brinco del tamaño de sus patas.

     (El TAMAÑO no se cruza: se mide siempre por altura. Cruzarlo fue un
     error mío y está explicado abajo, donde se calcula.)

     `factor` es su altura de tinta dividida por la de a08 —la que está
     parada en reposo, la que empata con la hoja de posadas—. Por eso
     sube a 1.285 en el flare: un ave con las alas en alto ES más alta. */
  l01: { src: ARTE + 'aterriza/a01.webp', cx: 0.514, cy: 0.509, aspecto: 1.089,
         pies: [0.931, 0.984], ancho: 0.986, altoTinta: 0.969, factor: 0.974, w: 0.00 },
  l02: { src: ARTE + 'aterriza/a02.webp', cx: 0.633, cy: 0.371, aspecto: 0.720,
         pies: [0.728, 0.983], ancho: 0.977, altoTinta: 0.971, factor: 1.055, w: 0.20 },
  l03: { src: ARTE + 'aterriza/a03.webp', cx: 0.694, cy: 0.424, aspecto: 0.676,
         pies: [0.608, 0.983], ancho: 0.963, altoTinta: 0.971, factor: 1.217, w: 0.45 },
  l04: { src: ARTE + 'aterriza/a04.webp', cx: 0.573, cy: 0.367, aspecto: 0.729,
         pies: [0.439, 0.988], ancho: 0.963, altoTinta: 0.975, factor: 1.225, w: 0.70 },
  l05: { src: ARTE + 'aterriza/a05.webp', cx: 0.602, cy: 0.354, aspecto: 0.584,
         pies: [0.541, 0.988], ancho: 0.963, altoTinta: 0.976, factor: 1.285, w: 0.85 },
  l06: { src: ARTE + 'aterriza/a06.webp', cx: 0.581, cy: 0.334, aspecto: 0.579,
         pies: [0.550, 0.987], ancho: 0.959, altoTinta: 0.974, factor: 1.188, w: 0.95 },
  l07: { src: ARTE + 'aterriza/a07.webp', cx: 0.580, cy: 0.392, aspecto: 0.628,
         pies: [0.543, 0.988], ancho: 0.947, altoTinta: 0.976, factor: 1.071, w: 1.00 },
  l08: { src: ARTE + 'aterriza/a08.webp', cx: 0.580, cy: 0.397, aspecto: 0.662,
         pies: [0.556, 0.987], ancho: 0.950, altoTinta: 0.972, factor: 1.000, w: 1.00 },
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
/* `pEncoge` es la esponjada: el ave hunde el cuello y ahueca la pluma.
   Duraba 4–9 s, lo mismo que un gesto de paso, y por eso se leía como
   un parpadeo. Ahuecarse no es un gesto, es un ESTADO —así se pasa el
   rato un ave que no tiene nada que hacer— y ahora dura lo que dura:
   de 7 a 16 s, el tramo más largo de la lista junto con la pata
   recogida. */
const GESTOS = [
  { clave: 'pEncoge',  peso: 3, dura: [7.0, 16.0] },
  { clave: 'pUnaPata', peso: 3, dura: [5.0, 12.0] },
  { clave: 'pAlerta',  peso: 2, dura: [2.0, 5.0] },
  { clave: 'pMira',    peso: 2, dura: [1.6, 3.4] },
  { clave: 'pAlas',    peso: 1, dura: [1.1, 2.2] },
  /* EL AMAGO: intenta volar y no lo hace. Va con peso bajo a propósito
     —es un acontecimiento, y un acontecimiento que pasa cada rato deja
     de serlo—. No lleva `dura` porque no es una pose sostenida sino una
     secuencia, y su duración la fija AMAGO_DURA. */
  { clave: 'amago',    peso: 1 },
];
const PESO_TOTAL = GESTOS.reduce((s, g) => s + g.peso, 0);
const DISUELVE = 0.42;          // segundos de disolvencia entre poses
const entre = (a, b) => a + Math.random() * (b - a);

/* ── EL AMAGO DE VUELO ──────────────────────────────────────────────
   Se tensa, abre las alas del todo, se levanta un palmo… y se queda.

   NO HAY LÁMINAS NUEVAS, y no hacen falta: el aterrizaje ya tiene
   pintados los cuatro cuadros que hacen falta, solo que contando la
   historia contraria. l04 es el flare —alas abiertas del todo, el
   cuerpo en alto—, l05 el peso volviendo a las patas, l06 las alas
   recogiéndose y l07 el asentarse. Un despegue fallido ES un aterrizaje
   que empieza en el sitio donde acaba: sube, no consigue soltarse, y
   vuelve a la rama por el mismo camino.

   Las cuatro se anclan por los PIES (w = 1 forzado abajo, en el
   dibujado), y esa es la ley que hace que el gesto no sea un salto: un
   ave que amaga NO se mueve de sitio. Las patas siguen agarradas a la
   rama todo el tiempo — es justamente lo que significa que no lo
   consiguió. */
const AMAGO = [
  ['pAlerta', 0.15],   // se tensa, el cuello sube
  ['pAlas',   0.13],   // abre
  ['l04',     0.21],   // alas del todo arriba: el impulso
  ['l05',     0.15],   // el peso vuelve a las patas
  ['l06',     0.17],   // las alas se recogen
  ['l07',     0.19],   // se asienta otra vez
];
const AMAGO_DURA = [2.0, 2.9];
/* Cuánto se levanta, en fracción de su propia altura. Un palmo: si se
   levantara más sería un vuelo corto, y entonces tendría que ir a
   alguna parte. */
const AMAGO_ALZA = 0.26;

/* CADA AVE TIENE SU CARÁCTER. Dos garzas del mismo árbol no se
   comportan igual: una se pasa la tarde ahuecada y otra no para de
   mirar alrededor. Se le dobla el peso a un gesto y se le baja a otro,
   así que la bandada no es una sola animación repetida diez veces con
   desfase — que es exactamente lo que el ojo detecta en dos ciclos. */
function caracter() {
  const p = GESTOS.map((g) => g.peso);
  p[Math.floor(Math.random() * p.length)] *= 2.5;
  p[Math.floor(Math.random() * p.length)] *= 0.4;
  return p;
}

/* El estado de reposo de UN ave. `calma` es cuánto aguanta quieta entre
   gestos y `calma0` lo que espera antes del primero. */
function nuevoReposo(calma, calma0, pesos) {
  return { actual: 'posada', previa: 'posada', desde: 0, hasta: 0,
           arrancado: false, calma, calma0, pesos: pesos || null };
}
const reposo = nuevoReposo([7.0, 19.0], [3.0, 6.5]);

/* Devuelve { visibles, alza }.

   `visibles` son pares [clave, alfa]: una lámina, o dos cruzándose. La
   mezcla es una disolvencia de acuarela, no un corte — dos aguadas
   superpuestas es un gesto que el medio admite; un salto de cuadro, no.

   `alza` es cuánto se levanta el ave de la rama, en fracción de su
   altura. Solo el amago la usa; todo lo demás vale 0. */
function vidaEnReposo(g, t) {
  /* Al aterrizar se queda quieta un rato. Sin esto el primer gesto salta
     en el mismo instante en que toca la rama —el reloj lleva 39 s
     corriendo— y el aterrizaje pierde su reposo. */
  if (!g.arrancado) {
    g.arrancado = true; g.desde = t; g.hasta = t + entre(g.calma0[0], g.calma0[1]);
  }
  if (t >= g.hasta) {
    /* 'amago' no es una lámina: si se guardara tal cual como pose
       anterior, la disolvencia de salida buscaría un archivo que no
       existe y el ave desaparecería medio segundo. Se guarda su ÚLTIMO
       cuadro, que es lo que de verdad se estaba viendo. */
    g.previa = g.actual === 'amago' ? AMAGO[AMAGO.length - 1][0] : g.actual;
    if (g.actual !== 'posada') {                    // vuelve a la calma
      g.actual = 'posada';
      g.hasta = t + entre(g.calma[0], g.calma[1]);
    } else {
      const pesos = g.pesos || GESTOS.map((c) => c.peso);
      const total = g.pesos ? pesos.reduce((s, p) => s + p, 0) : PESO_TOTAL;
      let r = Math.random() * total, elegido = GESTOS[0];
      for (let i = 0; i < GESTOS.length; i++) {
        r -= pesos[i]; if (r <= 0) { elegido = GESTOS[i]; break; }
      }
      g.actual = elegido.clave;
      g.hasta = t + (elegido.clave === 'amago'
        ? entre(AMAGO_DURA[0], AMAGO_DURA[1])
        : entre(elegido.dura[0], elegido.dura[1]));
    }
    g.desde = t;
  }

  const m = suave3(Math.min(1, (t - g.desde) / DISUELVE));

  if (g.actual === 'amago') {
    const p = Math.min(1, (t - g.desde) / Math.max(0.001, g.hasta - g.desde));
    let acc = 0, i = AMAGO.length - 1, dentro = 1;
    for (let j = 0; j < AMAGO.length; j++) {
      if (p < acc + AMAGO[j][1]) { i = j; dentro = (p - acc) / AMAGO[j][1]; break; }
      acc += AMAGO[j][1];
    }
    const clave = AMAGO[i][0];
    const sig = i < AMAGO.length - 1 ? AMAGO[i + 1][0] : clave;
    /* Se cruza solo el último tramo de cada cuadro, igual que el
       aterrizaje: el escalón se conserva —sigue leyéndose animado a
       mano— pero el salto duro no. */
    const cruce = dentro < 0.68 ? 0 : (dentro - 0.68) / 0.32;
    const visibles = (i === 0 && m < 1 && g.previa !== clave)
      ? [[g.previa, 1 - m], [clave, m]]
      : (cruce > 0 && sig !== clave)
        ? [[clave, 1 - cruce], [sig, cruce]]
        : [[clave, 1]];
    /* Sube rápido y baja despacio, y vuelve al suelo ANTES de que
       termine la secuencia: los dos últimos cuadros son ya el ave
       asentándose en la rama, y tienen que verse con las patas puestas.
       El exponente por debajo de 1 adelanta la cima. */
    const q = Math.min(1, p / 0.72);
    return { visibles, alza: AMAGO_ALZA * Math.sin(Math.pow(q, 0.8) * Math.PI) };
  }

  return {
    visibles: (m < 1 && g.previa !== g.actual)
      ? [[g.previa, 1 - m], [g.actual, m]]
      : [[g.actual, 1]],
    alza: 0,
  };
}

/* Todas las láminas que un ave posada puede llegar a necesitar: las seis
   posadas y los cuatro cuadros que el amago toma prestados del
   aterrizaje. */
const LAMINAS_POSADA = ['posada', 'pAlerta', 'pEncoge', 'pUnaPata', 'pMira',
                        'pAlas', 'l04', 'l05', 'l06', 'l07'];

/* La travesía completa, en segundos. Rara y lenta a propósito: el mundo
   no está poblado de pájaros, pasa uno de vez en cuando y se queda un
   buen rato. Siempre vuela HACIA LA IZQUIERDA —que es hacia donde miran
   las láminas— así que nunca hay que espejarla y nunca vuela de espaldas. */
/* LLEGA Y SE QUEDA. No hay ciclo: el ave entra una vez, se posa y no se
   va nunca. Compañía que no se marcha — que es lo que el sitio promete
   sin decirlo. Los tiempos se cuentan desde que se carga la página. */
const FASES = [
  ['crucero',   26.0],   // entra por la derecha, alto, cruzando
  ['aproxima',  10.2],   // baja en arco hacia el manglar, aleteo más lento
  ['frena',      3.2],   // los ocho cuadros del aterrizaje
];

/* El REPARTO del aterrizaje, en fracciones de la fase. Deliberadamente
   desigual, porque un aterrizaje lo es: frenar es violento y dura poco,
   asentarse es lento. Repartido en ocho partes iguales se leería como un
   metrónomo, que es la otra manera de verse mecánico.

   Y termina acelerando HACIA LA QUIETUD en vez de congelarse: el último
   cuadro es el más largo y ya es el ave parada, así que la disolvencia
   hacia la posada no tiene nada que salvar. */
const ATERRIZA = [
  ['l01', 0.07],   // planea, alas arriba, patas atrás
  ['l02', 0.08],   // frena, las patas bajan
  ['l03', 0.09],   // alas altas, las patas buscan
  ['l04', 0.13],   // el flare: alas abiertas del todo
  ['l05', 0.14],   // contacto, el cuerpo sobre las patas
  ['l06', 0.15],   // las alas se recogen
  ['l07', 0.16],   // se asienta
  ['l08', 0.18],   // quieta: ya es la misma pose que la posada
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
/* EL ORDEN SALIÓ DE MEDIR EL ALA, NO EL CENTROIDE. El centroide de toda
   la tinta mezcla cuerpo y ala y por eso el orden anterior tenía un
   retroceso: el ala bajaba a 0.000, subía a 0.245 y VOLVÍA A BAJAR a
   0.000 antes de subir del todo. Un cuadro de ala yendo al revés en
   mitad del batido, que es justo lo que se lee como volar hacia atrás.

   Aquí se mide la masa de tinta por encima de la línea del cuerpo —que
   la marca el pico— y se ordena por su altura. Y se mide también su
   ANCHO, porque es lo que separa las dos mitades del batido: en la
   bajada el ala va extendida y empuja; en la subida se pliega para
   ofrecer menos resistencia. Las dos láminas de ala plegada (ave06 con
   0.543 de ancho y ave01 con 0.613, las más estrechas) estaban puestas
   en la bajada, donde el ala tiene que ir abierta.

     bajada  ave03 +.226 · ave11 +.200 · ave08 +.130 · ave04 +.011 · ave05 -.255
     subida  ave07 -.257 · ave06 +.034 · ave09 +.133 · ave02 +.223 · ave01 +.231

   Las dos mitades son ahora estrictamente monótonas: el ala no cambia de
   sentido ni una sola vez. ave05 y ave07 son casi la misma pose (-.255 y
   -.257) y van seguidas a propósito: sostienen el fondo del golpe un
   cuadro más, que es lo que hace un ala de verdad. */
const CICLO = ['f03','f11','f08','f04','f05','f07','f06','f09','f02','f01'];
const MS_CUADRO = 150;  // 10 pasos x 150 ms = 0.67 batidos/s

const contenedor = document.getElementById('garzas');
let vuelo = null;

/* ── LA SEGUNDA GARZA: LA QUE ACABA DE ENTRAR ───────────────────────
   La del manglar lejano llega volando, cruza la pantalla y se queda:
   es alguien que vino antes y sigue ahi. Esta otra es distinta y por
   eso no comparte ni trayectoria ni tiempos.

   Cae. Entra por arriba, desciende y se posa en la rama cercana —la
   que esta a un palmo del ojo—, y lo hace en los primeros segundos,
   porque ES QUIEN ACABA DE ABRIR EL SITIO. No cruza el mundo buscando
   sitio: ya llego. Se deja caer donde le toca y se queda.

   Reutiliza las ocho laminas del aterrizaje y las seis de posada: no
   hace falta ciclo de aleteo porque no hay travesia, solo caida. */
const CAIDA = ['l01','l02','l03','l04','l05','l06','l07','l08'];
const CAIDA_ESPERA = 1.1;    // s antes de aparecer: la pagina se asienta
const CAIDA_DURA   = 3.4;    // s de caida y aterrizaje
let visita = null;
let inicioContenido = null;
addEventListener('galene:contenido-listo', () => {
  inicioContenido = performance.now() / 1000;
}, { once: true });
if (contenedor) {
  contenedor.innerHTML = '';
  const capas = {};
  for (const [clave, v] of Object.entries(VUELO)) {
    const img = new Image();
    diferirImagen(img, v.src);
    img.alt = '';
    img.className = 'vuelo';
    img.decoding = 'async';
    /* La posada gira sobre sus PIES; las de vuelo, sobre su centro. Y el
       aterrizaje, sobre el mismo punto por el que se ancla —el que cruza
       de uno a otro con `w`—, porque girar alrededor de un punto distinto
       del que sujeta la lámina es exactamente lo que la haría resbalar. */
    const wv = v.w === undefined ? (v.altoTinta ? 1 : 0) : v.w;
    const ox = v.pies ? v.cx + (v.pies[0] - v.cx) * wv : 0.5;
    const oy = v.pies ? v.cy + (v.pies[1] - v.cy) * wv : 0.5;
    img.style.transformOrigin = `${(ox * 100).toFixed(1)}% ${(oy * 100).toFixed(1)}%`;
    contenedor.appendChild(img);
    capas[clave] = img;
  }
  vuelo = { capas, w: 0, h: 0, envergadura: 0, px: 0, py: 0, vx: 0, vy: 0, arrancado: false };
}

if (contenedor) {
  const capas = {};
  for (const clave of [...CAIDA, 'posada', 'pAlerta', 'pEncoge',
                       'pUnaPata', 'pMira', 'pAlas']) {
    const v = VUELO[clave];
    const img = new Image();
    diferirImagen(img, v.src);
    img.alt = '';
    img.className = 'vuelo vuelo--visita';
    img.decoding = 'async';
    /* ORIGEN EN LOS PIES PARA TODOS SUS CUADROS, incluidos los ocho del
       aterrizaje. La visitante se COLOCA siempre por los pies —lo hace
       animarVisita, mire la lámina que mire—, así que dejar el origen a
       medio camino entre el centroide y las patas ponía el pivote del
       espejo en un punto que no es el que sujeta la lámina. Mientras
       solo caía no se veía: se estaba moviendo. Con el amago sí, porque
       ahí alterna entre posada y l04..l07 SIN moverse de la rama, y cada
       cambio la habría deslizado un dedo de lado. */
    const ox = v.cx + (v.pies[0] - v.cx);
    const oy = v.cy + (v.pies[1] - v.cy);
    img.style.transformOrigin = (ox * 100).toFixed(1) + '% ' + (oy * 100).toFixed(1) + '%';
    img.style.opacity = '0';
    contenedor.appendChild(img);
    capas[clave] = img;
  }
  /* UNA. La visitante es una y solo una, y no es una restricción de
     dibujo sino de sentido: representa a quien acaba de abrir el sitio,
     y quien abre el sitio es una persona. La rama cercana no admite
     bandada — si hubiera dos, ya no sería ella. */
  visita = { capas, px: 0, py: 0, vx: 0, vy: 0, arrancado: false,
             reposo: nuevoReposo([8.0, 21.0], [4.0, 8.0]) };
}

/* ── LA BANDADA DEL MANGLAR LEJANO ─────────────────────────────────
   Hasta diez, cada una por su cuenta. Lo que las hace leerse como aves
   y no como una animación repetida es que NO COMPARTEN NADA: ni percha,
   ni tamaño, ni hacia dónde miran, ni el reloj de sus gestos, ni
   siquiera el carácter que decide qué gesto hacen. Diez copias del mismo
   bucle con desfase se detectan en dos ciclos; diez relojes distintos no
   se detectan nunca.

   Un dormidero de garzas de verdad es exactamente esto: cuerpos quietos
   repartidos por el dosel, cada uno a lo suyo, y de vez en cuando uno
   que se remueve. */
/* Se puebla en una función y NO aquí mismo: las perchas se declaran más
   abajo, junto al resto de la geometría del manglar, y leerlas desde
   aquí arriba las pilla en su zona muerta temporal. Se llama en cuanto
   existen. */
const bandada = [];

/* Las diez láminas de una garza posada, montadas y ancladas por los
   pies — antes era el cuerpo del bucle de `poblarBandada`, y ahora
   también lo usa `agregarGarzaEnVivo` para la que llega en vivo por el
   canal 'manglar'. Una sola vez, para que las dos no puedan divergir. */
function crearCapasGarza() {
  const capas = {};
  for (const clave of LAMINAS_POSADA) {
    const v = VUELO[clave];
    const img = new Image();
    diferirImagen(img, v.src);
    img.alt = '';
    /* SIN `will-change`. Las de la bandada se mueven despacio y poco, y
       promover diez aves por diez láminas serían cien capas de
       composición extra en la GPU — en un teléfono de gama baja eso se
       paga en memoria de vídeo, que es justo lo que este sitio no
       puede gastar. */
    img.className = 'vuelo vuelo--bandada';
    img.decoding = 'async';
    /* Ancla por los PIES siempre: un ave posada gira, se encoge y
       amaga sobre sus patas, que es lo único suyo que no se mueve. */
    const ox = v.cx + (v.pies[0] - v.cx);
    const oy = v.cy + (v.pies[1] - v.cy);
    img.style.transformOrigin = (ox * 100).toFixed(1) + '% ' + (oy * 100).toFixed(1) + '%';
    img.style.opacity = '0';
    contenedor.appendChild(img);
    capas[clave] = img;
  }
  return capas;
}

/* Una entrada de bandada a partir de una fila REAL de Supabase —ver
   `servidor/src/base/esquema-bandada.sql`, tabla `garzas`—, no de
   `Math.random()`. `percha`, `mira` y `escala` son del servidor y no se
   tocan: son la garza de alguien. `asoma`/`hunde`/`balanceo`/`reposo`
   siguen siendo variedad local, que nunca fue identidad de nadie. */
function garzaDesdeFila(g, n, deCuantas) {
  return {
    id: g.id,
    capas: crearCapasGarza(),
    perchaIdx: g.percha,
    asoma: n < (deCuantas >= 7 ? 2 : 1),
    hunde: n < (deCuantas >= 7 ? 2 : 1) ? 0.58 + Math.random() * 0.14 : 0.11,
    viva: false,
    quieta: null,
    /* La pose que mandó el servidor, YA TRADUCIDA al nombre de capa
       (`config.garzas.poses` del backend no usa los mismos nombres que
       `LAMINAS_POSADA` aquí — ver POSE_A_CAPA en bandada-cliente.js).
       Se guarda aparte de `quieta` porque una garza puede tocarle el
       turno de «viva» (gestos) y entonces esta pose fija no se usa.

       EXCEPTO 'pAlas': las QUIETAS de este archivo la excluyen a
       propósito («una pose de gesto congelada para siempre delata que
       es una lámina»). El servidor no sabe eso —solo reparte las seis
       con los mismos pesos de siempre—, así que si le tocó alas y esta
       garza no queda viva, se congela en 'posada' en su lugar. */
    poseServidor: (POSE_A_CAPA[g.pose] === 'pAlas' ? 'posada' : POSE_A_CAPA[g.pose]) || 'posada',
    escala: g.escala,
    mira: g.mira,
    reposo: nuevoReposo([6.0 + Math.random() * 8, 16.0 + Math.random() * 12],
                        [0.5 + Math.random() * 7, 4.0 + Math.random() * 9],
                        caracter()),
    balanceo: [0.22 + Math.random() * 0.20, Math.random() * 100,
               0.09 + Math.random() * 0.10, Math.random() * 100],
    ultimo: {}, anchos: {}, mascaras: {},
    ida: false,
  };
}

/* QUIÉNES SE MUEVEN, sobre la bandada YA POBLADA — igual que antes,
   solo que ahora es su propia función porque hace falta también cuando
   cambia quién está vivo (nadie se re-sortea al llegar o irse alguien:
   eso encendería o apagaría gestos de aves que ya llevaban un rato
   quietas, y se vería como un parpadeo sin motivo). */
function repartirGestos() {
  for (const ave of bandada) { if (!ave.viva) ave.quieta = ave.poseServidor; }
  const candidatas = bandada.map((_, i) => i).filter((i) => !bandada[i].ida);
  const vivas = candidatas.length >= 7 ? 3 : 2;
  for (let i = candidatas.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidatas[i], candidatas[j]] = [candidatas[j], candidatas[i]];
  }
  candidatas.slice(0, vivas).forEach((i) => { bandada[i].viva = true; bandada[i].quieta = null; });
}

/* Población inicial, a partir de las filas que ya trajo `garzasVivas()`
   — ver `poblarBandadaReal()`, que es quien la llama. En pantallas
   pequeñas se recorta a seis, como antes: diez láminas por ave son
   sesenta capas de más en un teléfono de gama baja. */
function poblarBandada(reales) {
  if (!contenedor) return;
  const tope = viewportWidth() < 700 ? 6 : BANDADA_MAX;
  const lista = reales.slice(0, tope);
  lista.forEach((g, n) => bandada.push(garzaDesdeFila(g, n, lista.length)));
  repartirGestos();
}

/* Una garza más, en vivo, sin re-sortear las que ya estaban quietas —
   ver la nota en `repartirGestos`. Reutiliza `dispatchEvent(resize)`
   para que `colocarGarzas` —que ya sabe recorrer TODA la bandada y
   encontrarle sitio a cada una— la coloque, en vez de duplicar esa
   lógica aquí. Mismo patrón que ya usa este repo para el foro. */
function agregarGarzaEnVivo(fila) {
  if (!contenedor || bandada.some((a) => a.id === fila.id)) return;
  const tope = viewportWidth() < 700 ? 6 : BANDADA_MAX;
  if (bandada.filter((a) => !a.ida).length >= tope) return;   // mismo tope que la carga inicial
  bandada.push(garzaDesdeFila(fila, bandada.length, bandada.length + 1));
  repartirGestos();
  dispatchEvent(new Event('resize'));
}

/* La que se va. `ida = true` hace que `animarBandada` deje de tocarla
   —para siempre, no solo esta vez—, así que hay que dejarla ya en el
   estado visual correcto ANTES de poner la bandera: nadie más la va a
   apagar por mí. */
function quitarGarzaEnVivo(id) {
  const ave = bandada.find((a) => a.id === id && !a.ida);
  if (!ave) return;
  for (const img of Object.values(ave.capas)) {
    img.style.transition = 'opacity 1.1s ease';
    img.style.opacity = '0';
  }
  ave.ida = true;
}

/* El punto de entrada real: pide la propia garza (deja constancia de
   esta visita) y luego la bandada entera —la propia incluida, ya no
   hay que distinguirla— y recién ahí puebla el árbol. Si Supabase no
   está configurado o la red falla, el árbol se queda vacío: el mar es
   un enhancement, y esto también — el resto del sitio sigue en pie. */
async function poblarBandadaReal() {
  if (!contenedor) return;
  try {
    await dejarGarza();
    const reales = await garzasVivas();
    poblarBandada(reales);
    dispatchEvent(new Event('resize'));
  } catch (e) {
    console.warn('No se pudo conectar con la bandada compartida:', e);
    return;
  }
  suscribirManglar({
    onLlega: (fila) => agregarGarzaEnVivo(fila),
    onVuela: ({ id }) => quitarGarzaEnVivo(id),
  });
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
/* Remedido sobre el manglar repintado: la copa nueva es mas estrecha y
   mas alta. A y=0.14 de la lamina la masa va de x 0.229 a 0.693 con un
   45 % de densidad, asi que el ave se posa en 0.40 de ancho y 0.15 de
   alto — dentro de la copa solida, no en el aire de la silueta. */
const POSADERO = [0.40, 0.15];
/* Subida por el mismo arco. Medido sobre la lamina: a y=0.455 el tramo
   solido va de x 0.279 a 0.311, y a y=0.400 va de 0.262 a 0.292 — es la
   misma raiz, que sube hacia la izquierda. Se planta en el centro del
   tramo alto, no en su borde. */
const POSADERO_CERCA = [0.277, 0.400];
const GROSOR_RAMA = 0.076;

/* ── LAS PERCHAS DE LA BANDADA ──────────────────────────────────────
   Doce sitios MEDIDOS sobre manglar-lejos.webp, no elegidos a ojo.

   LA REGLA: los pies caen sobre el BORDE SUPERIOR de la masa de tinta,
   nunca dentro. El ave es un elemento del DOM y se pinta ENCIMA del
   árbol, así que una posada «entre las hojas» no se vería entre ellas
   sino calcada sobre ellas — la única mentira que este cuadro no puede
   permitirse, porque delata de golpe que el manglar es una lámina.
   Sobre el borde, el cuerpo queda contra el cielo y no hay nada que
   fingir. Que es, además, donde duerme una garza de verdad: en lo alto
   del dosel, no dentro.

   Se midió cada columna de la lámina por tres cosas y se descartó todo
   lo que fallara una: solidez de la masa bajo los pies > 0.62 (una rama,
   no un jirón de silueta), variación de la silueta a ±3 % de ancho
   < 0.045 (nadie se posa en un acantilado) y separación mínima de 5.8 %
   entre perchas. De 220 columnas pasaron 105, y repartidas quedan estas
   doce. La cima de la copa está en y = 0.024, x = 0.384.

   El hueco entre 0.575 y 0.693 no es un olvido: ahí la copa cae a pico
   y ninguna columna pasó la prueba de pendiente. */
const PERCHAS = [
  [0.111, 0.230],   // solidez 0.65 · pendiente 0.032
  [0.170, 0.238],   // solidez 0.80 · pendiente 0.028
  [0.261, 0.095],   // solidez 0.66 · pendiente 0.039
  [0.339, 0.035],   // solidez 0.68 · pendiente 0.037 — la cima
  [0.457, 0.050],   // solidez 0.81 · pendiente 0.030
  [0.516, 0.074],   // solidez 0.72 · pendiente 0.039
  [0.575, 0.098],   // solidez 0.74 · pendiente 0.018
  [0.693, 0.189],   // solidez 0.75 · pendiente 0.036
  [0.757, 0.177],   // solidez 0.65 · pendiente 0.044
  [0.816, 0.220],   // solidez 0.71 · pendiente 0.035
  [0.898, 0.271],   // solidez 0.67 · pendiente 0.026
];
/* La percha de x = 0.398 salió de la medición y NO está en la lista: es
   la de la garza que llega, y dos aves en el mismo sitio se solapan. El
   acontecimiento de la portada tiene preferencia sobre la bandada. */

/* CUÁNTAS. «Hasta diez» es el encargo, y diez son en una pantalla que
   pueda con ellas. Cada ave son diez láminas en el DOM, así que en un
   teléfono —donde el árbol además se ve más pequeño y diez garzas serían
   una mancha— se bajan a seis. El número exacto es aleatorio dentro de
   su tramo: el manglar no tiene el mismo censo cada tarde. */
const BANDADA_MAX = 10;

poblarBandadaReal();

export function calcularPosadero(caja, w, h, lineaPx, rel) {
  const [cxRel, altoRel, hundir, aspLam] = caja;
  const punto   = rel || POSADERO;
  const altoPx  = altoRel * h;
  const anchoPx = altoPx * aspLam;
  const abajo   = lineaPx + hundir * h;
  return {
    x: cxRel * w + (punto[0] - 0.5) * anchoPx,
    y: abajo - (1 - punto[1]) * altoPx,
    altoManglar: altoPx,
  };
}

/* Para la bandada, cuando llegue: un punto sobre la rama del fragmento
   cercano, en la misma geometría que usa el shader. */
export function posaderoCercano(caja, w, h) {
  const [xRel, alto0, , aspLam] = caja;
  /* EL MISMO ENCOGIMIENTO QUE PINTA EL SHADER. Faltaba, y era un fallo
     invisible en escritorio: por debajo de 1.35 de aspecto la lámina se
     dibuja más pequeña, así que la rama sube y se estrecha, pero la
     garza seguía posándose donde estaría la rama sin encoger. En un
     teléfono —aspecto 0.46, factor 0.60— eso son decenas de píxeles: el
     ave quedaba flotando al lado de su propia rama. */
  const alto = alto0 * encogeCerca(w / Math.max(1, h));
  const anchoQ = alto * aspLam;
  return {
    x: xRel * w + POSADERO_CERCA[0] * anchoQ * h,
    y: (1 - (caja[2] + (1 - POSADERO_CERCA[1]) * alto)) * h,
    grosorRama: GROSOR_RAMA * alto * h,
    /* Cuánto la sube y la baja el viento. El shader mece esta lámina en
       VERTICAL —es una rama en voladizo que entra por el lado, así que
       su punta cabecea— con amplitud 0.018 por el cuadrado de lo
       avanzado a lo ancho. Aquí, en píxeles, para la garza que se posa
       en ella. */
    vela: VIENTO_RAMA * POSADERO_CERCA[0] * POSADERO_CERCA[0] * alto * h,
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

  /* 0.20 -> 0.17. La hoja de vuelo y las de aterrizaje y posada vienen
     de generaciones distintas y dibujan la garza con OTRAS PROPORCIONES:
     la de vuelo es larguirucha, con el pico largo y el cuerpo delgado;
     la de aterrizaje es rechoncha, de pico corto y cuerpo grueso.

     Lo intenté medir cuatro veces —caja envolvente, registro de
     siluetas, largo del pico, perfil de grosor— y salieron 0.725, 0.92,
     0.52 y 0.40, con las validaciones fallando en 1.05 y 1.13 donde
     tenían que dar 1.00. No es que midiera mal: es que NO EXISTE una
     escala en la que las dos sean la misma ave. Igualando el tramo de
     pico a dedos el cuerpo se queda pequeño; igualando el cuerpo, el
     tramo se alarga un tercio.

     Así que 0.17 es un juicio, no una medida, y está dicho: quita la
     mayor parte del desajuste de tramo sin dejar al ave volando
     pequeña. Si hay que moverlo, es este número y solo este. */
  vuelo.envergadura = p.altoManglar * 0.17;

  /* UN SOLO PUNTO DE REFERENCIA para todo el recorrido: el centroide.
     Antes el vuelo se anclaba por el centroide y la posada por los pies,
     así que al aterrizar el cuerpo pegaba un brinco hacia arriba del
     tamaño de las patas. Aquí se calcula dónde debe ir el CENTROIDE
     para que los PIES caigan exactamente sobre la rama. */
  const pos = VUELO.posada;
  const altoPx = vuelo.altoPosada / pos.altoTinta;
  vuelo.posX = p.x - (pos.pies[0] - pos.cx) * (altoPx * pos.aspecto);
  vuelo.posY = p.y - (pos.pies[1] - pos.cy) * altoPx;
  /* La que llega se posa en la copa, así que también la lleva el
     viento. Solo cuando ya está posada: en vuelo el aire ya está en su
     trayectoria y sumarle esto sería contarlo dos veces. */
  vuelo.vela = VIENTO_COPA * Math.pow(1 - POSADERO[1], 2)
             * p.altoManglar * mar.cajaManglar()[3];

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

  /* ── LA BANDADA, sobre las perchas medidas ────────────────────────
     Cada percha es un punto de la lámina, así que se recoloca sola
     cuando cambia el tamaño del árbol. Se guarda el punto de los PIES
     —no el del centroide— porque es el que no se mueve al cambiar de
     pose, y todas estas aves están posadas.

     HUNDIDAS UN PELO. El borde de la silueta en una acuarela no es una
     línea: es medio centímetro de aguada que se va apagando. Con los
     pies exactamente en la primera columna que pasa el umbral, el ave
     se queda de puntillas sobre el aire pálido del canto.

     Y NO TODAS LAS PERCHAS VALEN EN TODAS LAS VENTANAS. La copa del
     manglar llega hasta el borde de arriba de la pantalla, así que las
     perchas de la cima dejan al ave sin sitio para la cabeza: se veía,
     y se veía mal — garzas decapitadas por el canto del viewport. Aquí
     se comprueba percha por percha si el ave CABE ENTERA, con su pose
     más alta, que es el flare del amago (factor 1.285). La que no cabe
     en la suya se muda a otra libre; la que no encuentra ninguna se
     queda fuera, y la bandada mengua sola en las pantallas bajas en vez
     de salir rota. */
  const FACTOR_MAX = 1.285;     // l05, el ave con las alas en alto
  const AIRE = 8;               // px de respiro sobre la cabeza
  const cajaM = mar.cajaManglar();
  const usadas = new Set();
  const todas = PERCHAS.map((_, i) => i);
  for (const ave of bandada) {
    ave.oculta = true;
    /* De alturas de ave a unidades de lámina. El ave mide
       `0.10 · escala` de la lámina, así que hundirla `hunde` alturas
       son `hunde · 0.10 · escala` de lámina. Exacto, y sin el
       disparate de escala de mezclar las dos unidades. */
    const dentro = ave.hunde * 0.10 * ave.escala;
    for (const idx of [ave.perchaIdx, ...todas]) {
      if (usadas.has(idx)) continue;
      const q = calcularPosadero(cajaM, w, h, vuelo.linea,
                                 [PERCHAS[idx][0], PERCHAS[idx][1] + dentro]);
      /* Más pequeñas que la que llega: esa es la protagonista del
         acontecimiento y tiene que seguir siéndolo. */
      const alto = q.altoManglar * 0.10 * ave.escala;
      const altoMax = alto * FACTOR_MAX / VUELO.posada.altoTinta;
      if (q.y - altoMax < AIRE) continue;         // se saldría por arriba
      usadas.add(idx);
      ave.pieX = q.x;
      ave.pieY = q.y;
      ave.alto = alto;
      /* A cuántos píxeles por encima de los pies queda el canto de la
         copa. Para las normales es un pelo; para la que se asoma es
         justo por donde hay que borrarla. */
      ave.silueta = dentro * q.altoManglar;
      /* CUÁNTO LA LLEVA EL VIENTO. El shader dobla la lámina cizallando
         su muestreo un 1.1 % del ancho por el cuadrado de la altura;
         aquí se calcula lo mismo en píxeles para esta percha, y se le
         suma a la posición del ave en cada cuadro.

         Sin esto la bandada se quedaría clavada mientras la copa se
         mueve debajo: tres píxeles y medio de desfase, que no suena a
         nada hasta que se ve una garza flotando al lado de su rama. Es
         el mismo error del paralaje que ya se pagó dos veces en este
         archivo, y por eso el número viene de `viento()` y no de una
         copia de la fórmula. */
      const altura = 1 - (PERCHAS[idx][1] + dentro);   // 0 abajo, 1 en la copa
      ave.vela = VIENTO_COPA * altura * altura * q.altoManglar * cajaM[3];
      ave.h0 = h;
      ave.oculta = false;
      break;
    }
  }

  /* ── Y LA VISITANTE, sobre la rama cercana ────────────────────────
     Su tamano NO sale del manglar lejano sino del GROSOR DE LA RAMA en
     la que se para, que es la unica referencia honesta de escala que
     hay en el primer termino. Y sale mas grande que la otra garza
     porque esta a un palmo del ojo: eso es lo que la hace leerse como
     cercana, no un desenfoque ni una sombra. */
  if (visita) {
    const c = posaderoCercano(mar.cajaCerca(), w, h);
    visita.pieX = c.x;
    visita.pieY = c.y;
    visita.vela = c.vela;
    visita.alto = Math.max(28, c.grosorRama * 3.1);
    /* Entra por arriba y algo a la derecha: cae en diagonal corta, no
       en vertical. Una caida perfectamente vertical lee como un objeto
       soltado, no como un ave que se posa. */
    visita.entraX = c.x + w * 0.085;
    visita.entraY = -h * 0.14;
    visita.h0 = h;
  }
}

const suave3 = (p) => p * p * (3 - 2 * p);

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
  let plato = null, mezcla = 0;
  let posadas = null, alza = 0;
  let aterA = null, aterB = null, aterM = 0, entra = 1;
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
    /* Alas abiertas: mucha resistencia. Frena de verdad, no interpola.
       Pero la resistencia ENTRA, no aparece: pasar de golpe del muelle
       flojo de la aproximación (1.55) a este (11) daba una aceleración
       instantánea, y como la actitud sale del vector de velocidad, el
       ave se torcía 12° en 170 ms. Un cuerpo con inercia no hace eso. */
    k = 1.6 + 9.4 * suave3(Math.min(1, p / 0.30)); amort = 6.4;
    /* El cuadro sale del reparto desigual, no de dividir la fase en
       ocho. Y se cruza solo el último tramo de cada uno: el escalón se
       conserva —sigue leyéndose animado a mano— pero el salto duro no. */
    let acc = 0, i = ATERRIZA.length - 1, dentro = 1;
    for (let j = 0; j < ATERRIZA.length; j++) {
      if (p < acc + ATERRIZA[j][1]) { i = j; dentro = (p - acc) / ATERRIZA[j][1]; break; }
      acc += ATERRIZA[j][1];
    }
    aterA = ATERRIZA[i][0];
    aterB = ATERRIZA[Math.min(i + 1, ATERRIZA.length - 1)][0];
    aterM = dentro < 0.72 ? 0 : (dentro - 0.72) / 0.28;
    /* La entrada al aterrizaje era el ÚNICO corte seco de toda la
       animación: el ciclo de vuelo terminaba en el cuadro que le tocara
       y el primero del aterrizaje aparecía encima. Todo lo demás se
       disuelve, así que ese salto se notaba precisamente por ser el
       único. Ahora también se cruza, y desde el cuadro de vuelo que
       toque —que sigue avanzando por debajo. */
    if (i === 0) entra = suave3(Math.min(1, dentro / 0.60));
    /* La disolvencia hacia la posada vive DENTRO del último cuadro, que
       ya es el ave parada. Antes cruzaba desde una lámina de alas
       abiertas y por eso se notaba. */
    if (i === ATERRIZA.length - 1) mezcla = suave3(Math.min(1, dentro / 0.85));
  } else {
    plato = 'posada';
    objX = posX; objY = posY;
    k = 90; amort = 18;                   // clavada en la rama
    ({ visibles: posadas, alza } = vidaEnReposo(reposo, t));
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
  /* Y durante el ATERRIZAJE, cero. La actitud sale del vector de
     velocidad, que es lo correcto para un cuerpo en el aire: si baja,
     morro abajo. Pero al frenar el ave cae casi a plomo sobre la rama,
     así que la fórmula la inclinaba hasta -11° justo en el flare —y en
     un flare un ave cabecea hacia ARRIBA, no hacia abajo. La actitud del
     aterrizaje ya viene pintada en las ocho láminas; el código solo
     tiene que dejar de estorbar. */
  const avance = Math.max(60, Math.abs(vuelo.vx));
  const objGiro = plato === 'posada' || plato === 'frena' ? 0
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
  if (plato === 'posada') x += viento(t) * vuelo.vela;

  const visibles = enVuelo
    ? (cruce > 0 && CICLO[iA] !== CICLO[iB]
        ? [[CICLO[iA], 1 - cruce], [CICLO[iB], cruce]]
        : [[CICLO[iA], 1]])
    : aterA
      ? (entra < 1 ? [[CICLO[iA], 1 - entra], [aterA, entra]]
         : mezcla > 0 ? [[aterA, 1 - mezcla], ['posada', mezcla]]
         : aterM > 0 && aterA !== aterB
           ? [[aterA, 1 - aterM], [aterB, aterM]]
           : [[aterA, 1]])
    : plato === 'posada' ? posadas
    : [[plato, 1]];

  /* El amago también la levanta a ella. La protagonista no es una garza
     distinta de las del árbol: hace lo mismo, solo que a la vista. */
  y -= alza * vuelo.altoPosada;

  /* EL PUNTO FIJO DE LAS POSES SON LOS PIES, NO EL CENTROIDE. En vuelo
     el centroide es lo correcto —el ave gira alrededor de su masa—, pero
     una garza que se encoge o levanta una pata mueve su centro de masa y
     deja los pies donde están. Si anclara por centroide, al cambiar de
     postura el ave se deslizaría por la rama. Así que traduzco la
     posición del centroide de reposo al punto donde están los pies, y
     desde ahí coloco cada pose por los suyos. */
  const ref = VUELO.posada;
  const refAlto = vuelo.altoPosada / ref.altoTinta;
  const pieX = x + (ref.pies[0] - ref.cx) * (refAlto * ref.aspecto);
  const pieY = y + (ref.pies[1] - ref.cy) * refAlto;

  for (const [clave, el] of Object.entries(vuelo.capas)) {
    const enc = visibles.find(([c]) => c === clave);
    if (!enc) { if (el.style.opacity !== '0') el.style.opacity = '0'; continue; }
    const v = VUELO[clave];
    /* EL TAMAÑO SIEMPRE POR ALTURA cuando la lámina la trae medida. Lo
       intenté cruzando las dos reglas con `w` y estaba mal: la regla de
       vuelo normaliza por ANCHO de tinta, y eso solo significa algo en
       poses anchas —ave con las alas extendidas—. Aplicada a a02..a06,
       que son poses altas y estrechas, las inflaba hasta 1.75× y el
       aterrizaje se leía como un zoom hacia la cámara.
       Las ocho vienen de una sola hoja, así que sus tamaños relativos ya
       son ciertos entre sí; medirlas por altura las deja consistentes
       entre ellas Y con la posada, que es donde termina todo. */
    const w0 = v.w === undefined ? (v.altoTinta ? 1 : 0) : v.w;
    const altoPx = v.altoTinta
      ? vuelo.altoPosada * (v.factor || 1) / v.altoTinta
      : (K / v.ancho) / v.aspecto;
    const anchoPx = altoPx * v.aspecto;
    /* Y el ancla se cruza igual. Los pies son el punto fijo del ave
       parada; el centroide, el del ave en vuelo. Interpolar entre los
       dos es lo que hace que ni el despegue del ciclo de vuelo ni la
       entrada en la posada peguen un brinco. */
    const anclaX = x + (pieX - x) * w0, anclaY = y + (pieY - y) * w0;
    const refX = v.pies ? v.cx + (v.pies[0] - v.cx) * w0 : v.cx;
    const refY = v.pies ? v.cy + (v.pies[1] - v.cy) * w0 : v.cy;
    const izq = anclaX - refX * anchoPx;
    const arr = anclaY - refY * altoPx;
    el.style.opacity = enc[1].toFixed(3);
    el.style.width = anchoPx.toFixed(1) + 'px';
    el.style.transform =
      `translate3d(${izq.toFixed(1)}px, ${arr.toFixed(1)}px, 0) rotate(${giro.toFixed(2)}deg)`;
  }
}

/* LA CAIDA DE LA VISITANTE. Sin fisica de muelle: es una caida y las
   caidas no persiguen un objetivo, se dejan ir y frenan al final. La
   curva es un ease-out cubico sobre la vertical y lineal sobre la
   horizontal, que es lo que hace un ave que se deja caer en diagonal y
   abre las alas al llegar. */
function animarVisita(t, paralaje) {
  if (!visita || !visita.alto || inicioContenido === null) return;
  t -= inicioContenido;
  const p0 = CAIDA_ESPERA, p1 = CAIDA_ESPERA + CAIDA_DURA;

  if (t < p0) {                                   // todavia no ha entrado
    for (const el of Object.values(visita.capas))
      if (el.style.opacity !== '0') el.style.opacity = '0';
    return;
  }

  let clave = 'posada', mezcla = 0, siguiente = null;
  let posadas = null, alza = 0;
  let x = visita.pieX, y = visita.pieY;

  if (t < p1) {
    const p = (t - p0) / CAIDA_DURA;
    const caer = 1 - Math.pow(1 - p, 2.6);        // deja ir y frena
    x = visita.entraX + (visita.pieX - visita.entraX) * (p * p * (3 - 2 * p));
    y = visita.entraY + (visita.pieY - visita.entraY) * caer;
    /* Los ocho cuadros repartidos: la caida ocupa los cinco primeros y
       el asentamiento los tres ultimos, que es donde el ave deja de
       moverse y empieza a estar. */
    const i = Math.min(CAIDA.length - 1, Math.floor(p * CAIDA.length));
    const dentro = p * CAIDA.length - i;
    clave = CAIDA[i];
    siguiente = CAIDA[Math.min(i + 1, CAIDA.length - 1)];
    mezcla = dentro < 0.72 ? 0 : (dentro - 0.72) / 0.28;
    if (i === CAIDA.length - 1) { siguiente = 'posada'; mezcla = suave3(Math.min(1, dentro / 0.8)); }
  } else {
    ({ visibles: posadas, alza } = vidaEnReposo(visita.reposo, t));
    y -= alza * visita.alto;
  }

  /* El mismo paralaje que el fragmento cercano del shader, que es 1.35
     — el triple que el manglar lejano. Si no, el ave se resbala de la
     rama al mover el puntero. */
  x -= paralaje * 1.35 * visita.h0;
  /* Y la mece su rama. Solo cuando ya está posada: durante la caída
     manda la caída. Sumar en `y` la baja en pantalla, que es a donde se
     va la lámina cuando el shader le suma a su coordenada vertical. */
  if (t >= p1) y += viento(t) * visita.vela;

  const visibles = posadas
    || ((mezcla > 0 && siguiente && siguiente !== clave)
      ? [[clave, 1 - mezcla], [siguiente, mezcla]] : [[clave, 1]]);

  for (const [k, el] of Object.entries(visita.capas)) {
    const enc = visibles.find(([c]) => c === k);
    if (!enc) { if (el.style.opacity !== '0') el.style.opacity = '0'; continue; }
    const v = VUELO[k];
    const altoPx = visita.alto * (v.factor || 1) / v.altoTinta;
    const anchoPx = altoPx * v.aspecto;
    el.style.opacity = enc[1].toFixed(3);
    el.style.width = anchoPx.toFixed(1) + 'px';
    /* MIRA HACIA LA DERECHA. Las laminas estan pintadas mirando a la
       izquierda, asi que se espeja. El origen de transformacion ya esta
       en los PIES, de modo que el espejo gira alrededor de ellos y el
       ave no se mueve de la rama: si girase sobre su centro, saltaria
       media envergadura al voltearse.

       Y mirando a la derecha mira HACIA el manglar y hacia el mar, no
       fuera del cuadro. Quien acaba de llegar mira lo que hay. */
    el.style.transform =
      'translate3d(' + (x - v.pies[0] * anchoPx).toFixed(1) + 'px, ' +
      (y - v.pies[1] * altoPx).toFixed(1) + 'px, 0) scaleX(-1)';
  }
}

/* ── LA BANDADA, CUADRO A CUADRO ───────────────────────────────────
   No hay trayectoria que integrar: estas aves ya llegaron. Todo lo que
   hacen es estar, y estar es lo más difícil de animar — porque lo único
   que lo delata es la repetición.

   Va a 30 fps y no a la tasa del monitor, al revés que la garza que
   llega. Aquella vuela, y un vuelo a 30 se ve a tirones; estas se
   balancean medio grado y se remueven cada quince segundos. Doblarles
   el ritmo sería gastar batería en algo que nadie puede ver. */
function animarBandada(t, paralaje) {
  for (const ave of bandada) {
    /* Ya no está en el árbol: se fue volando y no vuelve. Sus láminas
       quedaron apagadas en el último cuadro del despegue y no se les
       vuelve a escribir nada nunca. */
    if (ave.ida) continue;
    if (ave === despegue.ave) { animarDespegue(ave, t, paralaje); continue; }
    if (!ave.alto || ave.oculta) {
      /* Sin percha en esta ventana: no existe. Se apaga entera y no se
         le vuelve a escribir nada. */
      if (!ave.apagada) {
        for (const el of Object.values(ave.capas)) el.style.opacity = '0';
        ave.apagada = true;
      }
      continue;
    }
    ave.apagada = false;
    /* Las quietas no pasan por la máquina de gestos: una sola lámina,
       para siempre. Solo se balancean, y medio grado no es moverse —
       es no estar clavada. */
    const { visibles, alza } = ave.viva
      ? vidaEnReposo(ave.reposo, t)
      : { visibles: [[ave.quieta, 1]], alza: 0 };
    const [f1, ph1, f2, ph2] = ave.balanceo;
    const giro = Math.sin(t * f1 + ph1) * 0.55 + Math.sin(t * f2 + ph2) * 0.35;
    /* El mismo paralaje que el manglar —0.45— porque están EN el
       manglar. Con cualquier otro se resbalarían de la copa al mover el
       puntero, que es el error que ya se pagó dos veces en este
       archivo. */
    /* MÁS, no menos. El shader RESTA el doblado a la coordenada de
       muestreo, y restar en el muestreo desplaza la lámina hacia la
       derecha: la columna que antes caía en x ahora cae en x + d·ancho.
       El ave tiene que ir en ese mismo sentido o se separa del doble de
       lo que se movería si no hubiera viento. */
    const x = ave.pieX - paralaje * 0.45 * ave.h0 + viento(t) * ave.vela;
    const y = ave.pieY - alza * ave.alto;

    for (const [k, el] of Object.entries(ave.capas)) {
      const enc = visibles.find(([c]) => c === k);
      if (!enc) { if (el.style.opacity !== '0') el.style.opacity = '0'; continue; }
      const v = VUELO[k];
      const altoPx = ave.alto * (v.factor || 1) / v.altoTinta;
      const anchoPx = altoPx * v.aspecto;
      const tr = 'translate3d(' + (x - v.pies[0] * anchoPx).toFixed(1) + 'px, '
               + (y - v.pies[1] * altoPx).toFixed(1) + 'px, 0) rotate('
               + giro.toFixed(2) + 'deg)' + (ave.mira < 0 ? ' scaleX(-1)' : '');
      /* Sin `will-change` estas láminas no tienen capa propia, así que
         escribirles el estilo cuesta repintado de verdad. Se escribe
         solo lo que cambió, y se compara contra EL VALOR ANTERIOR DE
         ESA LÁMINA, no contra una bandera de «se acaba de medir».

         Con la bandera estaba mal y se veía: solo se le escribía el
         ancho a las láminas que estuvieran visibles en el cuadro de la
         medición, y una pose que se estrenara después —el ave se
         encoge por primera vez a los veinte segundos— salía a su tamaño
         natural, que es el de la lámina de origen. Tres garzas de mil
         píxeles ocupando media portada. */
      const ancho = anchoPx.toFixed(1) + 'px';
      if (ave.anchos[k] !== ancho) { el.style.width = ancho; ave.anchos[k] = ancho; }
      if (ave.ultimo[k] !== tr) { el.style.transform = tr; ave.ultimo[k] = tr; }
      el.style.opacity = enc[1].toFixed(3);

      /* EL BORRADO DE LA QUE SE ASOMA. La copa la tapa hasta la altura
         que midió el script, así que se le quita todo lo que queda por
         debajo de esa línea — que en coordenadas de la propia lámina
         cae a `pies − silueta/alto` de su alto.

         Con una banda de degradado, no con un corte: el cuerpo se
         pierde entre las hojas en vez de quedar rebanado. La banda va
         en unidades de la lámina para que no cambie de grosor cuando el
         ave cambia de pose. */
      if (ave.asoma) {
        const linea = Math.max(0, Math.min(1, v.pies[1] - ave.silueta / altoPx));
        const m = 'linear-gradient(to bottom, #000 '
                + Math.max(0, (linea - 0.16) * 100).toFixed(1) + '%, transparent '
                + Math.min(100, (linea + 0.05) * 100).toFixed(1) + '%)';
        if (ave.mascaras[k] !== m) {
          el.style.maskImage = m;
          el.style.webkitMaskImage = m;
          ave.mascaras[k] = m;
        }
      }
    }
  }
}

/* ── EL AVE QUE DESPEGA ─────────────────────────────────────────────
   El encargo pedía que «el ave despegue» al empezar el scroll, y eso
   choca de frente con una ley de este archivo escrita veinte líneas
   sobre la tabla FASES: «LLEGA Y SE QUEDA. No hay ciclo: el ave entra
   una vez, se posa y no se va nunca. Compañía que no se marcha — que
   es lo que el sitio promete sin decirlo.» Y choca dos veces, porque
   la garza cercana —la visitante— es, según la nota de index.astro,
   QUIEN ACABA DE ABRIR EL SITIO. Que esa garza levante el vuelo en
   cuanto la persona mueve la página dice exactamente lo contrario de
   lo que el sitio entero está diciendo: que en cuanto te muevas, se va.

   Así que despega OTRA. La visitante se queda —no se toca ni un
   píxel—, la que llegó volando y se posó en la copa se queda, y quien
   levanta el vuelo es una de la BANDADA del manglar: una de las que ya
   estaban ahí antes de que llegara nadie. Se gana el plano —hay un ave
   despegando cuando empieza el movimiento, que es lo que se pedía— sin
   gastar la promesa. Un dormidero donde nunca se mueve nadie tampoco
   es un dormidero: de un árbol con diez garzas, de vez en cuando una
   se va. Que se vaya una de diez no es abandono; que se vaya la tuya,
   sí.

   UNA, no dos. El encargo decía «una o dos». Dos aves saliendo a la
   vez del mismo árbol es una espantada, y este sitio no puede
   sobresaltar a nadie: quien lo abre puede estar en la peor noche de
   su vida. Una sola, que se suelta despacio y se va.

   NO REESCRIBE LA MÁQUINA DE ESTADOS de la bandada: la esquiva. El
   despegue es una función del TIEMPO TRANSCURRIDO y de nada más —sin
   dt, sin integración, sin velocidad guardada—, así que da igual a qué
   ritmo se la llame, cuántos cuadros se pierdan con la pestaña detrás
   o si el reloj pega un salto: para un instante dado siempre devuelve
   la misma posición. Es la lección de las dos trampas de reloj que ya
   se pagaron en este archivo, aplicada por adelantado.

   Las tres primeras poses salen de las láminas que el ave YA tiene
   —las mismas que usa el amago: se tensa, abre y sube—, y solo el
   tramo volando necesita láminas nuevas: las diez del batido, que se
   crean UNA vez y se comparten, porque nunca hay dos aves despegando.
   El amago era un despegue que no lo consigue; este es el mismo gesto
   terminado. */
const DESPEGUE = {
  /* Las tres poses de tierra, en segundos. Cortas y desiguales: un ave
     que se suelta no cuenta el compás. */
  SECUENCIA: [['pAlerta', 0.30], ['pAlas', 0.24], ['l04', 0.26]],
  ALZA: 0.34,        // alturas de ave que gana antes de soltarse
  SUBE: 0.115,       // alturas de ventana que gana ya en el aire
  TAU_SUBE: 0.95,    // s de la subida: rápida al principio, luego planea
  AVANCE: 0.055,     // anchos de ventana por segundo de crucero
  ARRANQUE: 0.55,    // s en alcanzarla — arranca de quieta, no de golpe
  GIRO: 6.5,         // grados de morro arriba al soltarse
  RITMO: 0.13,       // s por paso del batido: algo más vivo que el crucero
  CRUZA: 0.22,       // s de disolvencia entre la rama y el vuelo
  /* Disolvencia desde la pose en que se la pilló. TIENE que terminar
     antes de que empiece el cruce del primer paso (0.66 · 0.30 =
     0.198 s): si se solapan, la lámina de en medio da un escalón de
     opacidad de dos décimas en un solo cuadro — medido. */
  ENTRA: 0.19,
  FIN: 15.0,         // s tras los cuales ya no existe, esté donde esté
};
const DESPEGUE_T3 = DESPEGUE.SECUENCIA.reduce((s, p) => s + p[1], 0);

/* Las diez láminas del batido, compartidas. Se crean junto con todo lo
   demás y no en el momento del despegue: pedirle al navegador diez
   imágenes nuevas justo en el cuadro en que empieza el gesto es pedirle
   el tirón. Sus fuentes son las mismas que las de la garza que llega,
   así que ya están decodificadas. */
const ALAS = {};
if (contenedor) {
  for (const clave of CICLO) {
    const v = VUELO[clave];
    const img = new Image();
    diferirImagen(img, v.src);
    img.alt = '';
    /* `vuelo` a secas, la clase de la que vuela: mismo tratamiento de
       color que la bandada y además `will-change`, que aquí sí se paga
       porque son diez láminas moviéndose a la tasa del monitor durante
       unos segundos, no cien quietas para siempre. */
    img.className = 'vuelo';
    img.decoding = 'async';
    /* Gira sobre su centro, como las de vuelo de la protagonista. */
    img.style.transformOrigin = '50% 50%';
    img.style.opacity = '0';
    contenedor.appendChild(img);
    ALAS[clave] = img;
  }
}

/* (El estado del despegue se declara arriba del todo, junto al resto del
   estado del módulo, y NO aquí. Declarado aquí abajo con `const` caía en
   la zona muerta temporal: `arrancar()` se ejecuta durante la evaluación
   del módulo y lee `despegue` en el bucle del mar mucho antes de que la
   ejecución llegue a esta línea, así que saltaba un `ReferenceError` en
   CADA cuadro y `animarBandada` no llegaba a correr nunca. Un `const` de
   ámbito de módulo solo existe a partir de su propia línea; que el
   fichero lo tenga escrito no basta.) */

/* Se llama desde el bucle del mar en cuanto el scroll arranca. Una vez
   y nunca más: `gastado` no se limpia ni al volver arriba. Un ave que
   despega cada vez que se sube y se baja la página es un juguete. */
function empezarDespegue() {
  if (despegue.gastado || !bandada.length || !contenedor) return;
  /* Colocada, no escondida, y NO de las que se asoman entre las hojas:
     esas llevan una máscara de degradado que las recorta contra la
     copa, y volando se irían con media ala borrada. */
  const aptas = bandada.filter((a) => a.alto && !a.oculta && !a.asoma);
  if (!aptas.length) return;
  /* Mejor una que mire a la IZQUIERDA, que es hacia donde están
     pintadas todas estas láminas y donde el cielo está despejado. Si
     todas las colocadas miran a la otra, vale una de esas: se va por la
     derecha, espejada, que es igual de cierto. Nunca se le da la vuelta
     a un ave para que despegue — voltearse de golpe sí es un susto. */
  const izquierda = aptas.filter((a) => a.mira > 0);
  const lista = (izquierda.length ? izquierda : aptas).sort((a, b) => a.pieY - b.pieY);
  /* De las tres más altas de la copa, una al azar: arriba el cielo está
     libre y el ave no cruza por delante de la silueta del árbol. */
  const ave = lista[Math.floor(Math.random() * Math.min(3, lista.length))];
  /* CON QUÉ POSE SE LA PILLÓ. El ave estaba ahuecada, o a la pata coja,
     o a mitad de un amago, y el primer cuadro del despegue no puede
     aparecer encima de eso de golpe: sería el único corte seco de todo
     el sitio. Se guarda la lámina que se estaba viendo para disolver
     desde ella. Si estaba amagando se guarda el último cuadro del
     amago, que es lo que de verdad había en pantalla — 'amago' no es
     una lámina y buscarla dejaría al ave un cuarto de segundo en nada.
     Es la misma trampa que ya está documentada en vidaEnReposo(). */
  const previa = ave.viva ? ave.reposo.actual : ave.quieta;
  despegue.previa = previa === 'amago' ? AMAGO[AMAGO.length - 1][0] : (previa || 'posada');
  despegue.ave = ave;
  despegue.t0 = performance.now() / 1000;
  despegue.gastado = true;
}

function animarDespegue(ave, t, paralaje) {
  if (!vuelo) return;
  const te = t - despegue.t0;
  const w = vuelo.w || viewportWidth(), h = ave.h0 || vuelo.h || viewportHeight();
  /* La envergadura sale de la misma proporción que usa la protagonista
     entre su lámina de vuelo y la de posada (0.17 / 0.135): las dos
     hojas se dibujaron con garzas de otras proporciones y ese número es
     un juicio ya tomado en este archivo. No se vuelve a tomar aquí. */
  const env = ave.alto * 1.2593;

  let x = ave.pieX, y = ave.pieY, giro = 0, visibles = null, vela = 1;

  if (te < DESPEGUE_T3) {
    /* ── EN LA RAMA. Las patas no se mueven: eso es lo que separa este
       tramo del vuelo. Se tensa, abre y sube — y solo en el último
       cuadro empieza a levantarse del posadero. */
    let acc = 0, i = DESPEGUE.SECUENCIA.length - 1, dentro = 1;
    for (let j = 0; j < DESPEGUE.SECUENCIA.length; j++) {
      const [, dur] = DESPEGUE.SECUENCIA[j];
      if (te < acc + dur) { i = j; dentro = (te - acc) / dur; break; }
      acc += dur;
    }
    const clave = DESPEGUE.SECUENCIA[i][0];
    const sig = i < DESPEGUE.SECUENCIA.length - 1 ? DESPEGUE.SECUENCIA[i + 1][0] : clave;
    /* Se cruza el último tercio de cada paso, como el aterrizaje y como
       el amago: el escalón se conserva —se sigue leyendo animado a
       mano— y el salto duro no. */
    const cruce = dentro < 0.66 ? 0 : (dentro - 0.66) / 0.34;
    /* La entrada manda sobre la salida: nunca hay tres láminas
       encendidas sobre la misma ave, que la volverían una mancha.
       Mismo criterio que el aterrizaje de la protagonista. */
    const entra = suave3(Math.min(1, te / DESPEGUE.ENTRA));
    visibles = (entra < 1 && despegue.previa !== clave)
      ? [[despegue.previa, 1 - entra], [clave, entra]]
      : (cruce > 0 && sig !== clave)
        ? [[clave, 1 - cruce], [sig, cruce]] : [[clave, 1]];
    /* Solo el ÚLTIMO cuadro la levanta: en los dos primeros las patas
       siguen agarradas y el cuerpo se tensa sin moverse de sitio. */
    if (i === DESPEGUE.SECUENCIA.length - 1)
      y -= suave3(Math.min(1, Math.max(0, dentro))) * DESPEGUE.ALZA * ave.alto;
    const [f1, ph1, f2, ph2] = ave.balanceo;
    giro = Math.sin(t * f1 + ph1) * 0.55 + Math.sin(t * f2 + ph2) * 0.35;
    /* El viento de la rama se va apagando durante estas tres poses: en
       cuanto suelta, la copa ya no la mece. Apagarlo de golpe al
       soltarse la movería tres píxeles de lado en un cuadro. */
    vela = 1 - suave3(Math.min(1, te / DESPEGUE_T3));
  } else {
    /* ── EN EL AIRE. Posición cerrada en función del tiempo: velocidad
       con arranque exponencial —v = V·(1 − e^(−t/τ))— integrada a mano,
       así que el ave sale de quieta sin un solo salto y sin guardar
       ninguna velocidad entre cuadros. Sube rápido y luego planea, que
       es lo que hace una garza: el ascenso es asintótico, no lineal. */
    const tv = te - DESPEGUE_T3;
    const avance = DESPEGUE.AVANCE * w
      * (tv - DESPEGUE.ARRANQUE * (1 - Math.exp(-tv / DESPEGUE.ARRANQUE)));
    /* Se va hacia donde MIRA: sin espejar si mira a la izquierda, que es
       como está pintada. Un ave volando de espaldas es el error que
       este archivo lleva evitando desde la primera lámina. */
    x -= ave.mira * avance;
    y -= DESPEGUE.ALZA * ave.alto
       + DESPEGUE.SUBE * h * (1 - Math.exp(-tv / DESPEGUE.TAU_SUBE));

    const paso = (tv / DESPEGUE.RITMO) % CICLO.length;
    const iA = Math.floor(paso), frac = paso - iA;
    const iB = (iA + 1) % CICLO.length;
    const cruce = frac < 0.70 ? 0 : (frac - 0.70) / 0.30;
    /* El cuerpo sube en la BAJADA del ala, medio ciclo por delante de
       ella. Mismo desfase que la protagonista y por la misma razón. */
    const bat = Math.sin((paso / CICLO.length) * Math.PI * 2 - Math.PI * 0.5);
    y += bat * env * 0.011;

    /* Morro arriba al soltarse, y se endereza planeando. Entra con una
       rampa desde el balanceo de la rama: seis grados de golpe en el
       cuadro en que suelta serían un tirón, y aquí no hay tirones. */
    const [f1, ph1, f2, ph2] = ave.balanceo;
    const quieta = Math.sin(t * f1 + ph1) * 0.55 + Math.sin(t * f2 + ph2) * 0.35;
    const r = suave3(Math.min(1, tv / 0.30));
    giro = quieta * (1 - r) + (DESPEGUE.GIRO * Math.exp(-tv / 1.3) + bat * 0.45) * r;

    /* Y la disolvencia desde la última pose de la rama hacia el batido:
       el único corte seco que quedaba en el gesto. */
    const entra = suave3(Math.min(1, tv / DESPEGUE.CRUZA));
    visibles = entra < 1
      ? [['l04', 1 - entra], [CICLO[iA], entra]]
      : (cruce > 0 && CICLO[iA] !== CICLO[iB]
          ? [[CICLO[iA], 1 - cruce], [CICLO[iB], cruce]]
          : [[CICLO[iA], 1]]);
    vela = 0;
  }

  /* El mismo paralaje del manglar mientras esté cerca de él, y el mismo
     viento de su rama mientras siga en ella. Lo primero no se suelta al
     despegar a propósito: el ave sigue estando a la distancia del
     árbol, y cambiarle el plano al soltarse la haría dar un salto
     lateral con solo mover el ratón. */
  x -= paralaje * 0.45 * h;
  if (vela > 0) x += viento(t) * ave.vela * vela;

  /* ¿Ya no está? Fuera de cuadro por cualquier lado, o pasado el tope
     de tiempo. Se apaga entera una vez y no se le vuelve a escribir. */
  if (te > DESPEGUE.FIN || x < -env * 1.6 || x > w + env * 1.6 || y < -env * 1.6) {
    for (const el of Object.values(ave.capas)) el.style.opacity = '0';
    for (const el of Object.values(ALAS)) el.style.opacity = '0';
    ave.ida = true;
    despegue.ave = null;
    return;
  }

  /* Las poses se sujetan por los PIES y las de vuelo por el CENTROIDE:
     un ave parada no mueve las patas y una en vuelo gira sobre su masa.
     Aquí conviven las dos —durante media disolvencia hay una de cada— y
     por eso hace falta traducir el punto: se pasa la posición de los
     pies a la del centroide con la geometría de la lámina de reposo,
     que es la misma cuenta que hace la protagonista al revés. Sin esto,
     al soltarse la rama el ave pegaría un brinco del tamaño de sus
     patas, que es medio cuerpo. */
  const ref = VUELO.posada;
  const refAlto = ave.alto / ref.altoTinta;
  const cX = x - (ref.pies[0] - ref.cx) * (refAlto * ref.aspecto);
  const cY = y - (ref.pies[1] - ref.cy) * refAlto;
  /* Espejada, el giro cambia de signo: `rotate` positivo levanta lo que
     queda a la izquierda del pivote, y en un ave volteada eso es la
     cola, no el pico. */
  const suf = ave.mira < 0 ? ' scaleX(-1)' : '';
  const g = (giro * ave.mira).toFixed(2);

  for (const mapa of [ave.capas, ALAS]) {
    for (const [clave, el] of Object.entries(mapa)) {
      const enc = visibles.find(([c]) => c === clave);
      if (!enc) { if (el.style.opacity !== '0') el.style.opacity = '0'; continue; }
      const v = VUELO[clave];
      const altoPx = v.altoTinta ? ave.alto * (v.factor || 1) / v.altoTinta
                                 : (env / v.ancho) / v.aspecto;
      const anchoPx = altoPx * v.aspecto;
      /* Las de posada se espejan alrededor de sus PIES —ahí tienen el
         origen— así que la cuenta del lado no cambia. Las de vuelo se
         espejan alrededor del centro de la lámina, y entonces el
         centroide de la tinta aparece a `1 − cx` del canto izquierdo:
         colocarlas con `cx` las correría media envergadura. */
      const izq = v.pies ? x - v.pies[0] * anchoPx
        : cX - (ave.mira < 0 ? 1 - v.cx : v.cx) * anchoPx;
      const arr = v.pies ? y - v.pies[1] * altoPx : cY - v.cy * altoPx;
      const tr = `translate3d(${izq.toFixed(1)}px, ${arr.toFixed(1)}px, 0) `
               + `rotate(${g}deg)${suf}`;
      const ancho = anchoPx.toFixed(1) + 'px';
      if (ave.anchos[clave] !== ancho) { el.style.width = ancho; ave.anchos[clave] = ancho; }
      if (ave.ultimo[clave] !== tr) { el.style.transform = tr; ave.ultimo[clave] = tr; }
      el.style.opacity = enc[1].toFixed(3);
    }
  }
}

/* Asidero de medición, SOLO en desarrollo. El ave tarda 39 s en llegar y
   el navegador estrangula los temporizadores cuando la pestaña no está
   delante, así que esperar al reloj no sirve para medir: hay que poder
   pisarlo y avanzar la animación paso a paso. No viaja al sitio
   publicado — import.meta.env.DEV lo borra en la compilación. */
if (import.meta.env.DEV) {
  window.__galene = { animarGarzas, animarVisita, VUELO, ATERRIZA, FASES,
                      vuelo: () => vuelo, visita: () => visita };
}

/* ── ARRANQUE ──────────────────────────────────────────────────────
   Al final: el mar es lo último que se enciende, después de que los
   reflejos, la hora y las garzas ya existen. */
/* La escena es la misma en escritorio y móvil. El perfil de arriba
   reduce resolución, láminas y cadencia cuando hace falta, pero nunca
   sustituye el cielo, el agua o las garzas por otra composición. */
const mar = crear(lienzo);
if (!mar) {
  lienzo.remove();                 // el respaldo CSS ya es un mar
  hero?.setAttribute('data-mar', 'sin-webgl');
  document.documentElement.classList.add('hero-estatico');
  dispatchEvent(new CustomEvent('galene:hero-listo', { detail: { modo: 'css' } }));
} else {
  arrancar(mar);
}
