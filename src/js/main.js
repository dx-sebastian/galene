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
/* ── DE DÓNDE SALE «LOS DEMÁS», Y POR QUÉ SON DOS SITIOS ───────────
   La migración a Supabase se llevó la BANDADA y la CALMA DEL MAR: las
   garzas del manglar ya no son paisaje aleatorio, son sesiones reales,
   y lo sostenido por todo el mundo se suma en la base. Eso entra por
   `bandada-cliente.js`.

   Lo que NO se llevó, porque en la base no existe: las MANOS en el
   agua ahora mismo y el pico teñido de quien mira. Un gesto en curso
   no es un dato acumulado —dura tres segundos y desaparece— y meterlo
   en Postgres sería escribir en disco el rastro de que alguien estuvo
   tocando el mar a las 4 a.m. Así que esas dos cosas siguen donde
   estaban: `presencia.js`, BroadcastChannel, las otras pestañas de
   ESTE navegador, sin red por medio. Ver su cabecera y README →
   Privacidad.

   La costura entre las dos: si Supabase está configurado, la bandada
   ya muestra las sesiones vivas y `sincronizarPresencia` NO pone
   además una garza por pestaña — sería la misma persona dos veces, y
   eso es fabricar gente (regla 3). Las manos entran igual por los dos
   caminos, porque una mano no es una garza. */
import { dejarGarza, garzasVivas, suscribirManglar, calmaActual, acreditarGesto,
         despedirse, POSE_A_CAPA, listo as bandadaEnRed } from './bandada-cliente.js';
import * as presencia from './presencia.js';
/* Solo `perfil`: el panel de personalizar (montarPanel) quedó fuera
   del MVP junto con su disparador en index.astro. Sin panel, `perfil()`
   devuelve siempre el ave sin elegir y `sena` queda vacía — el circuito
   sigue entero para cuando vuelva. */
import { perfil as miPerfil, alCambiar as alCambiarGarza } from './garza.js';
import { colorDePico, fraseDe } from '../datos/garza.js';
import * as pico from './pico.js';

/* La barra de reflejos —salida rápida y línea de atención— salió del
   sitio: la urgencia se traslada a una app móvil, y aquí volverá más
   adelante de una forma menos literal. */

/* ── 2 · LA HORA ──────────────────────────────────────────────────── */

/* Ganchos de verificación. `?hora=4.5` fuerza la hora para poder medir
   sobre los píxeles en varias luces; `?dev` expone el estado. Nada de
   esto altera el sitio sin los parámetros. */
const PARAMS = new URLSearchParams(location.search);
const HORA_FORZADA = PARAMS.has('hora') ? parseFloat(PARAMS.get('hora')) : null;
/* Ver la nota dentro de `paisajeSegunScroll`: apaga el hundido del
   mundo para poder descartarlo como causa del parpadeo de Safari.
   YA DESCARTADO: con `hundido=off` el parpadeo seguía igual. Se queda
   el asidero, que no cuesta nada y ya demostró servir. */
const SIN_HUNDIDO = PARAMS.get('hundido') === 'off';
/* `?mar=diag` cuenta en la nota del hero cómo acabó el mar: pintando o
   caído al respaldo, y por qué. Ver `caerAlRespaldo` y `arrancar`. */
const DIAG_MAR = PARAMS.get('mar') === 'diag';

/* ── EL SIGUIENTE SOSPECHOSO, CON SU PROPIO INTERRUPTOR ────────────
   Lo que el dueño ve es que el lienzo NO SE COMPONE —debajo asoma el
   degradado de CSS de `.mundo`, que él describe como «un background que
   parece css sin más»— mientras las garzas, que son DOM, siguen ahí. Y
   pasa con el hundido apagado, o sea sin que nadie toque el lienzo.

   Queda entonces la forma en que el lienzo está montado: es un hijo
   `absolute` DENTRO de un `.mundo` que es `position: fixed`. WebKit
   compone el scroll en otro hilo y las capas de hardware que cuelgan de
   un ancestro fijo tienen que re-emparentarse en el árbol de capas
   fijas; cuando no puede, la capa no se dibuja — y lo que se ve es
   justo lo que hay detrás.

   `?lienzo=suelto` hace que el lienzo sea ÉL el elemento fijo, sin
   ancestro fijo por encima: misma caja, mismo sitio en el apilado
   —`.mundo` ya es contexto propio por su z-index—, una anidación menos.
   Si con eso deja de parpadear, la causa está encontrada y el cambio se
   hace permanente; si no, este sospechoso queda descartado como el
   anterior. Va como interruptor y no por defecto porque tocar el
   montaje del hero a ciegas es exactamente lo que ya costó tres
   rondas. */
if (PARAMS.get('lienzo') === 'suelto')
  document.documentElement.classList.add('lienzo-suelto');
const reloj = () => (HORA_FORZADA !== null && !Number.isNaN(HORA_FORZADA))
  ? HORA_FORZADA : horaAhora();

let L = luz(reloj());
let lavadoAdaptativo = false;   // lo enciende arrancar() si hay lienzo
/* La calibración del lavado mide cada 10 s, y eso es el SUELO: cuando
   la luz cambia de verdad —cada 30 s, o de golpe con `?hora=`— esta
   bandera pide una medida para el cuadro siguiente sin esperar turno.
   Así medir menos no cuesta contraste. Ver `calibrarTinta`. */
let luzCambio = true;
aplicar(L);

const nota = document.getElementById('nota-hora');
function refrescarHora() {
  const h = reloj();
  L = luz(h);
  luzCambio = true;
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
/* ── EL ESCRITORIO TAMBIÉN BAJA LÁMINAS DE 1024 ────────────────────
   El corte estaba en 1280, así que cualquier portátil normal —1440,
   1600, 1920— se traía el juego de 2048: medido, 6,47 MB de láminas
   contra 2,13 MB en un teléfono. Con una conexión colombiana media son
   unos seis segundos de descarga antes de ver el mar, en el aparato que
   menos lo necesita.

   Y no hacía falta. El mar se calcula a resolución de CSS, no de
   lámina: las láminas son AGUADAS —manchas de baja frecuencia— y el
   grano fino lo pone el shader aparte. Medido con las dos versiones
   pintadas y comparadas píxel a píxel, el cambio se pierde dentro del
   propio vaivén de la ola: `pruebas/e2e/peso.spec.js` lo comprueba a
   1440 y a 1920 contra el ruido de la escena, y no lo da por bueno con
   un umbral inventado.

   Por encima de 1920 sigue el juego grande: ahí el lienzo estira la
   lámina más del doble y la cuenta cambia. */
const LAMINAS_CHICAS = PERFIL_AHORRO || ANCHO_REAL <= 1920;
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
    for (const [img, src] of IMAGENES_DIFERIDAS) {
      /* LA PRIORIDAD BAJA ERA PARA LA COLA, NO PARA LA DESCARGA. Se
         marcan `low` al crearlas para que no le disputen el ancho de
         banda a las láminas del primer cuadro. Pero al llegar aquí ese
         momento ya pasó: el contenido está listo y estas imágenes son
         lo siguiente que hay que ver — el ave que se posa. Dejarlas en
         `low` las manda al final de una cola que en Safari de iOS,
         con el mar compilando, tarda en vaciarse. Es parte de «tarda
         el ave en aparecer». */
      img.fetchPriority = 'auto';
      img.decoding = 'async';
      img.src = src;
    }
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
  if (!bandadaEnRed) return;   // sin variables de entorno no hay a quién preguntar
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

/* Se levanta si el navegador se lleva el contexto WebGL. Vive aquí
   arriba porque lo leen dos sitios que no se ven entre sí: el bucle de
   dibujo, para pararse, y el arranque del final, que es quien lo
   levanta. Ver `caerAlRespaldo`. */
let marPerdido = false;

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

  /* El tamaño con el que se pidió el búfer la última vez. Ver la nota
     del margen táctil dentro de `medidas()`. */
  const TACTIL = matchMedia('(pointer: coarse)').matches;
  const bufer = { w: 0, h: 0 };

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
    /* ── Y EN VERTICAL BAJA A 0.74, QUE ES LO QUE LE DA SUELO AL ÁRBOL
       En un teléfono el texto ocupa el ancho entero, así que el manglar
       no puede ponerse a su lado: tiene que caber DEBAJO, entre el
       renglón más bajo y la línea de agua. Con el horizonte en 0.68 esa
       franja medía 0.209 del alto de pantalla, y en 0.209 no cabe un
       árbol con sus raíces fuera del agua: o se encoge hasta dejar de
       ser el sujeto, o se hunde. Se hundía — ver `SUMERGIDO`.

       Cada punto que baja el horizonte es un punto de franja. A 0.74
       son 0.269, que es justo lo que hace falta para que el árbol
       conserve su tamaño Y sus zancas. Lo que se paga es mar: la banda
       de agua pasa de 32 % a 26 % del alto, y en vertical eso sobraba
       —era agua vacía— porque el primer término ya ocupa esa esquina.

       En apaisado NO se toca: allí el árbol se pone al lado del texto y
       la franja no es el límite de nada. */
    const base = aspecto < 0.8 ? 0.74 : 0.66;
    const texto = document.querySelector('.hero__texto');
    const fondoTexto = texto ? (texto.getBoundingClientRect().bottom - caja.top) : 0;
    const respiro = Math.max(24, h * 0.05);
    const exigido = (fondoTexto + respiro) / h;
    const desdeArriba = Math.min(0.80, Math.max(base, exigido));

    horizonte = 1 - desdeArriba;
    document.documentElement.style.setProperty('--horizonte', (desdeArriba * 100).toFixed(1) + '%');
    /* ── EL BÚFER SE MIDE CONTRA EL LIENZO, NO CONTRA EL VIEWPORT ───
       Aquí se pasaba `w`/`h`, que salen de `viewportWidth/Height` y esos
       leen `visualViewport` — el viewport VISUAL, el que EXCLUYE las
       barras del navegador. Pero el lienzo vive dentro de `.mundo`, que
       es `position: fixed; inset: 0`, o sea el viewport de MAQUETACIÓN,
       que las incluye. Dos medidas distintas para la misma caja.

       Se vio en el diagnóstico del iPhone del dueño: búfer 780×1326 con
       una ventana de 390×844 y DPR tope 2. 1326/2 son 663 px, que es su
       viewport visual CON la barra de Safari puesta; el lienzo medía
       844. O sea que el cuadro se estaba estirando un 27 % en vertical
       todo el rato — y, mucho peor, que cada vez que la barra se encoge
       al hacer scroll el viewport visual cambia, salta
       `galene:viewportresize`, y el búfer se reasignaba. Un búfer
       reasignado nace en blanco: eso es el parpadeo, y explica por qué
       pasaba solo al hacer scroll y solo en el hero.

       `clientWidth`/`clientHeight` del propio lienzo son su caja de
       maquetación —sin la escala del hundido, que es una transformación
       y no cambia el tamaño de la caja—, así que el búfer mide
       exactamente lo que se ve y deja de moverse cuando la barra se
       mueve. Con la puerta que ahora tiene `redimensionar`, esos
       `resize` pasan a no costar nada.

       El resto de `medidas()` sigue con `w`/`h`: el horizonte lo manda
       el texto del hero, y ese sí vive en el viewport visual. */
    /* ── Y EN TÁCTIL, UN MARGEN POR SI LA CAJA TAMBIÉN SE MUEVE ─────
       Lo de arriba basta si la caja del lienzo no cambia cuando la
       barra del navegador se encoge, que es lo que dice el diagnóstico
       del aparato del dueño —búfer medido con 663 px de viewport visual
       mientras la caja iba por 844—. Pero eso depende de la versión de
       iOS y aquí no hay forma de comprobarlo en todas.

       Así que en táctil, y SOLO en táctil, un cambio de alto de menos
       del 28 % con el ancho quieto no reasigna nada. El número está
       medido contra el caso peor: en un iPhone de 844 px la barra deja
       663, o sea que se lleva el 21,4 %; con el umbral en 20 todavía se
       colaba —comprobado, cuatro reasignaciones de seis— y con 28 cabe
       entera y sobra margen. Girar el aparato cambia el ancho y sí
       pasa. El precio es que el búfer puede quedar hasta un 28 % desajustado
       respecto a la caja mientras la barra está a medio camino, y eso
       es un estiramiento que no se ve; un lienzo en blanco sí se ve.

       En escritorio no se aplica: allí no hay barra que se encoja, las
       ventanas se redimensionan de verdad, y un búfer que no sigue a su
       caja sería un cuadro deformado sin motivo. */
    const bw = lienzo.clientWidth || w, bh = lienzo.clientHeight || h;
    if (!TACTIL || bw !== bufer.w || Math.abs(bh - bufer.h) > bufer.h * 0.28) {
      bufer.w = bw; bufer.h = bh;
    }
    mar.redimensionar(bufer.w, bufer.h, escala);
    estado.horizonte = horizonte;

    /* EL MANGLAR NO SE CENTRA NI EN VERTICAL. Estuvo en 0.50 con el
       argumento de que en un teléfono no hay sitio para descentrar, y
       el resultado lo desmentía: un sujeto clavado en el eje parte la
       pantalla en dos mitades iguales y el cuadro pierde dirección —el
       mismo argumento del horizonte, que tampoco va al medio—. La
       composición de la referencia ancla el árbol a la DERECHA y deja
       el aire a la izquierda, que es además donde vive el texto.

       0.62 y no más: el árbol mide ~0.8 del ancho, así que a 0.62 su
       canto derecho queda en 1.02 — roza el borde sin perder copa. En
       pantallas anchas sigue en 0.775, y la rampa une los dos. */
    const xManglar = aspecto < 0.85 ? 0.62
                   : aspecto > 1.50 ? 0.775
                   : 0.62 + ((aspecto - 0.85) / 0.65) * 0.155;

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
    /* Hasta dónde puede subir la copa. `null` mientras no haya un techo
       —el caso de escritorio, donde el árbol va AL LADO del texto y por
       encima solo tiene cielo—. */
    let limiteCopa = null;
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
        const textoAbajo = (caja.bottom - rt.bottom) / h;
        limiteCopa = textoAbajo - 0.025;
        /* La copa está en `horizonte − hundir + alto`, y `hundir` ya no
           es una constante sino `alto · SUMERGIDO`, así que despejar el
           alto máximo pide dividir por lo que queda FUERA del agua. Con
           el hundimiento fijo esto era una resta; ahora es una regla de
           tres, y esa es toda la diferencia. */
        const techoCopa = (limiteCopa - horizonte) / (1 - SUMERGIDO);
        altoManglar = Math.max(altoManglar * 0.68,
                               Math.min(altoManglar, techoCopa));
      }
    }

    /* ── CUÁNTO SE HUNDE, Y POR QUÉ YA NO ES UN NÚMERO SUELTO ────────
       Era 0.252 del ALTO DE PANTALLA, fijo, y el árbol no lo es: mide
       0.82 de pantalla en escritorio y 0.38 en un teléfono. La misma
       resta aplicada a dos árboles de distinto tamaño no hunde lo
       mismo — hunde una fracción distinta de cada uno.

       MEDIDO, y es el bug entero: en 1440×900 quedaba bajo el agua el
       30.7 % de la lámina, en 390×844 el 57.8 % y en 768×1024 el 64.3 %.
       En escritorio se ven los arcos de raíz zancuda enteros; en el
       teléfono el agua cortaba por encima de ellos y lo que quedaba era
       un tronco recto entrando en el mar. Un mangle sin zancas deja de
       leerse como mangle —está escrito en la nota de `manglarCaja`, «las
       zancas SON la especie»— y de ahí la sensación de que el árbol se
       hunde en móvil.

       Ahora se hunde una fracción de SÍ MISMO, y la fracción es la que
       ya estaba calibrada en escritorio (0.252 / 0.82). El árbol se
       mete en el agua hasta la misma altura de su propio tronco en
       cualquier pantalla. */
    let hundir = altoManglar * SUMERGIDO;

    /* Y SI AUN ASÍ LA COPA TOCA EL TEXTO, SE HUNDE MÁS — pero solo
       entonces. Pasa cuando el suelo de tamaño (el 0.68 de arriba) gana
       a la regla de tres: en una ventana muy baja el árbol no puede
       encoger más, así que lo único que queda es meterlo un poco más en
       el agua. Es una degradación, no el comportamiento normal, y por
       eso lleva tope: pasado el 46 % sumergido volveríamos al problema
       que esto viene a arreglar, y a partir de ahí es mejor que la copa
       roce el texto —de lo que ya se encarga el lavado calibrado— que
       perder las raíces. */
    if (limiteCopa !== null) {
      const copa = horizonte - hundir + altoManglar;
      if (copa > limiteCopa) {
        hundir = Math.min(altoManglar * 0.46, hundir + (copa - limiteCopa));
      }
    }
    mar.colocarManglar(x, altoManglar, hundir);

    /* El primer término se coloca DESPUÉS del horizonte y antes que las
       garzas: `baseCerca` lo necesita, y `posaderoCercano` necesita el
       resultado. El orden de estas tres líneas es la cadena entera. */
    const cajaCerca = mar.cajaCerca();
    const altoCerca = cajaCerca[1] * encogeCerca(aspecto);
    mar.colocarCerca(baseCerca(altoCerca, horizonte),
                     xCerca(altoCerca, cajaCerca[3], aspecto));

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
  /* Al cambiar de tamaño, las cuatro cajas del texto se mueven y lo que
     hay pintado detrás es otro. Con la calibración cada 10 s eso serían
     hasta diez segundos con el lavado de la anchura anterior — antes no
     se notaba porque medía dos veces por segundo. Se pide una medida
     para el cuadro siguiente, igual que hace un cambio de luz. */
  addEventListener('resize', () => { luzCambio = true; }, { passive: true });
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
    /* Y se dice. Lo que viaja es un punto del lienzo y nada más — ver
       presencia.js. En las otras pestañas abre su propio anillo, así
       que el gesto se ve donde está la otra mano y no en un contador. */
    presencia.anunciar({ sostiene: { x: q.x, y: q.y } });
  }
  const soltarToque = () => {
    sosteniendo = null;
    presencia.anunciar({ sostiene: null });
  };

  hero.addEventListener('pointerdown', (e) => {
    /* `summary` y el panel de la garza entran en la lista: abrirlo es un
       clic, y un clic dentro de un control no puede además calmar el
       mar. Sin esto, elegir una frase abriría un anillo en el agua. */
    if (e.target.closest('a, button, input, textarea, label, summary, [data-garza-panel]')) return;

    /* ── UN TOQUE SOBRE UNA GARZA ENSEÑA SU FRASE Y NO CALMA ────────
       En un teléfono no hay «pasar por encima», así que el globo tiene
       que poder abrirse tocando. Y tiene que ser lo uno O lo otro: un
       gesto que enseñe una frase Y calme el mar a la vez no se puede
       deshacer ni entender. Manda la garza, que es lo más pequeño y por
       tanto lo que hay que apuntar a propósito. */
    const sobre = pico.aveEn(e.clientX, e.clientY);
    if (sobre) { pico.fijar(sobre); return; }

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

  /* ── LO QUE SOSTIENEN LAS OTRAS MANOS ────────────────────────────
     `sostenido` es el tiempo de ESTA mano. `ajeno` es el de las demás
     sumado, y se acumula igual: sube mientras alguien aguanta y no baja
     nunca. Dos manos durante diez segundos calman lo mismo que una
     durante veinte — que es lo que significa que la calma es de la
     gente y no de nadie en particular.

     Va con su propio tope por sesión, y por el mismo motivo que el
     otro: para que nadie deje la pestaña sujeta y suba el mar entero.

     Las tres declaraciones van ANTES de la función que las usa, y no es
     por gusto: este archivo ya pagó una vez el fallo de declarar un
     `const` de módulo por debajo de quien lo lee (ver la nota de
     `despegue`, arriba del todo). Un `const` existe a partir de su
     línea, no desde el principio del ámbito. */
  let ajeno = 0;
  const ajenos = new Map();
  const ajenosVivos = [];

  function avanzarToques(dt) {
    if (sosteniendo && sostenido < TOPE_SESION) {
      sostenido += dt;
      sosteniendo.fuerza = Math.min(1, sosteniendo.fuerza + dt * 1.6);
    }

    /* ── LOS ANILLOS DE LAS OTRAS ──────────────────────────────────
       Se pintan en el MISMO array que los propios, así que salen del
       mismo shader y con el mismo pigmento: no hay un anillo «de otro»
       dibujado de otra manera. Lo que los distingue no es el estilo, es
       que aparecen donde no está tu dedo — y eso es exactamente lo que
       se quería que se notara.

       Se reconstruyen cada cuadro a partir de la última noticia de cada
       sesión, en vez de guardarlos: una pestaña que se cierra deja de
       latir y su anillo se cierra solo, sin nada que limpiar. */
    const fuera = presencia.toquesAjenos();
    ajenosVivos.length = 0;
    for (const t of fuera) {
      let a = ajenos.get(t.id);
      if (!a) { a = { x: t.x, y: t.y, fuerza: 0, edad: 0 }; ajenos.set(t.id, a); }
      a.x = t.x; a.y = t.y;
      a.fuerza = Math.min(1, a.fuerza + dt * 1.6);
      a.edad = 0;
      ajenosVivos.push(a);
    }
    for (const [id, a] of ajenos) {
      if (fuera.some((t) => t.id === id)) continue;
      /* Soltó: su anillo se cierra con el mismo ritmo que los propios y
         después se olvida. */
      a.edad = Math.min(1, a.edad + dt * 0.45);
      if (a.edad >= 1) ajenos.delete(id); else ajenosVivos.push(a);
    }
    if (fuera.length && ajeno < TOPE_SESION) ajeno += dt * fuera.length;

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
    /* ── Y LAS OTRAS MANOS, QUE NO PUEDEN ESPERAR SEIS SEGUNDOS ─────
       `calmaComunidad` ya trae lo que sostiene el mundo, pero llega por
       la red y se refresca cada seis segundos: una mano que se pone al
       lado AHORA no se nota ahí hasta el siguiente sondeo, si es que se
       nota. Y sin Supabase configurado no llega nunca.

       Así que la mano ajena entra también por la curva de esta sesión,
       con menos peso que la propia. MEDIDO con dos pestañas antes de
       que existiera la base: tres segundos de mano ajena solo por las
       raíces movían la calma de 0.3500 a 0.3506 —o sea nada—, y el
       encargo era justamente que se notara. Con 0.6, dos manos calman
       visiblemente más rápido que una y la propia sigue mandando: tu
       gesto se ve como tuyo, y el de al lado se ve como ayuda. Que es
       lo que es. Lo vigila garzas.spec.js. */
    const cSesion = TECHO_SESION * (1 - Math.exp(-(sostenido + ajeno * 0.6) / TAU_SESION));
    estado.calma = 0.35 + 0.50 * (1 - (1 - cRaices) * (1 - cSesion));

    /* Lo sostenido se reporta a la comunidad cada pocos segundos, no
       cuadro a cuadro — cuadro a cuadro serían decenas de llamadas por
       segundo por cada mano en la pantalla, y esto no necesita esa
       precisión: es una acumulación de minutos, no un dato en vivo. */
    if (bandadaEnRed && sostenido > reportadoHasta && estado.t - ultimoReporte >= 3) {
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
    /* Seis es el tope del shader (`u_toques`), así que hay que elegir.
       LAS MANOS PUESTAS AHORA VAN PRIMERO —la propia y las ajenas—, y
       después los anillos que se están cerrando. Al revés, seis toques
       viejos míos apagándose podían tapar la mano de otra persona, que
       es justo lo único que este cambio existe para que se vea. */
    const cerrando = TOQUES.filter((t) => t !== sosteniendo);
    mar.toques([
      ...(sosteniendo ? [sosteniendo] : []),
      ...ajenosVivos.filter((a) => a.edad === 0),
      ...cerrando,
      ...ajenosVivos.filter((a) => a.edad > 0),
    ].slice(0, 6));

    refrescarManos();
  }

  /* Pausar cuando el mar sale de pantalla: batería real en gama media. */
  /* ── Y AL VOLVER, UN CUADRO EN LA MISMA TAREA ─────────────────────
     `bucle()` no dibuja: pide un `requestAnimationFrame`. Entre que
     este observador dispara —con el 2 % del hero asomando— y que ese
     cuadro llega, el compositor puede presentar el canvas una o más
     veces con lo que hubiera dentro, que es un buffer BORRADO: el mar
     dejó de dibujarse hace rato y el lienzo, al vivir en un `.mundo`
     fijo, nunca dejó de estar delante. En Safari, que compone el scroll
     en otro hilo, ese hueco se ve — y es la mitad del parpadeo que el
     dueño reporta al subir hacia el hero (la otra mitad, de qué color
     es un buffer borrado, está arreglada en mar.js con `alpha: true`).

     Un `cuadro()` síncrono aquí cierra el hueco: cuando el hero asoma,
     el buffer ya tiene pintura. Cuesta un render de pantalla completa
     en el mismo gesto en el que el usuario está volviendo a la
     portada, que es exactamente cuando hace falta. */
  new IntersectionObserver(([e]) => {
    const asomaAhora = e.isIntersecting && !visible;
    visible = e.isIntersecting;
    if (!visible) return;
    if (asomaAhora) cuadro(performance.now());
    if (!quieto.matches) bucle();
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

  /* ── Y LA ESCALA TAMBIÉN SE PONE UNA VEZ ─────────────────────────
     Esto es el arreglo del «desaparece el agua y los árboles al hacer
     scroll, y las aves permanecen» de Safari, y es el cuarto intento:
     los tres anteriores fueron por el buffer del lienzo —el color del
     vacío, y luego conservarlo entre presentaciones— y ninguno lo
     movió. Que `preserveDrawingBuffer` no cambiara nada DESCARTA el
     buffer: si el problema fuera que se compone vacío, conservarlo lo
     habría cerrado. Lo que se compone entonces no es un lienzo vacío:
     es que el lienzo NO SE COMPONE, y por eso se ve lo que hay detrás
     —el degradado de CSS de `.mundo`, que no tiene ni olas ni árbol—
     mientras las garzas, que son DOM y viven fuera, siguen ahí.

     Y solo queda una cosa en toda la página que toque el lienzo
     ÚNICAMENTE mientras se hace scroll: esta escala. Iba dentro de la
     cadena de `transform` que se reescribe cuadro a cuadro, así que la
     escala del lienzo CAMBIABA en cada cuadro del desplazamiento. Un
     `translate` lo resuelve el compositor moviendo una capa que ya
     tiene; un `scale` distinto en cada cuadro le pide REMUESTREAR la
     superficie, y la de aquí es un canvas de WebGL a pantalla completa
     dentro de un ancestro `position: fixed`, con el scroll compuesto en
     otro hilo. Cuando esa superficie no está lista a tiempo, lo que se
     compone es nada.

     Así que la escala deja de moverse: se pone entera desde el primer
     cuadro, en la propiedad `scale` —que es independiente de
     `transform`— y el cuadro solo escribe un `translate3d`. El
     compositor vuelve a tener una capa estática que solo se desplaza.

     LO QUE CAMBIA A LA VISTA: el mundo nace ya un 2 % más grande en vez
     de crecer ese 2 % a lo largo de una pantalla de scroll. Es el mismo
     número que el comentario de arriba llama invisible —dos centésimas
     de la copa—, solo que ahora está desde el principio; el margen que
     abre por arriba, que es para lo que existe, es el mismo y se
     consume igual. Las dos cajas lo llevan idéntico, así que el ave y
     el árbol siguen sin poder separarse ni un píxel. */
  const ESCALA_FIJA = String(1 + SALIDA_ESCALA);
  lienzo.style.scale = ESCALA_FIJA;
  if (contenedorGarzas) contenedorGarzas.style.scale = ESCALA_FIJA;

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

    /* Solo el hundido, y en píxeles enteros. El sub-píxel no se ve —el
       recorrido entero son trece píxeles— y en cambio hacía que la
       cadena cambiara en CADA cuadro aunque el movimiento no llegara a
       medio píxel: trece escrituras de estilo en vez de sesenta por
       segundo, y trece momentos en que el compositor tiene algo nuevo
       que hacer en vez de todos. */
    const hundido = Math.round(
      SALIDA_ESCALA * salida * viewportHeight() * SALIDA_HUNDE);
    /* ── UN INTERRUPTOR PARA MIRAR, NO PARA USAR ────────────────────
       `?hundido=off` deja de escribir la transformación del lienzo, y
       nada más. Existe porque el parpadeo de Safari solo se ve en el
       aparato del dueño y este es el sospechoso: si con esto puesto
       sigue pasando, el hundido queda descartado en un solo mensaje en
       vez de en otra ronda entera. Es el mismo tipo de asidero que
       `?hora=` o `?auditar-mar`, y como ellos no cambia nada sin él. */
    if (SIN_HUNDIDO) return salida;
    const tr = `translate3d(0, ${hundido}px, 0)`;
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
    /* CUÁNTO CUESTA UN CUADRO DE MAR, medido en el aparato de quien
       mira y no supuesto por su user-agent. Es lo único honesto para
       decidir a qué resolución se puede pintar: dos teléfonos con la
       misma pantalla pueden ir cuatro veces distintos. Media móvil
       para que un cuadro suelto no decida nada. */
    const t0Mar = performance.now();
    mar.dibujar(estado);
    /* `finish()` no se pide a propósito: bloquear la GPU para medirla
       cuesta más que el error de medida. Lo que se lee aquí es el
       trabajo de CPU de emitir el cuadro más lo que el driver haga
       síncrono, y sube y baja con la carga real. */
    msMar = msMar ? msMar * 0.9 + (performance.now() - t0Mar) * 0.1
                  : performance.now() - t0Mar;
    calibrarTinta();
    /* estado.paralaje, NO la deriva: la deriva es el acumulador infinito
       del agua y arrastraba al ave fuera de cuadro igual que hacía con
       el manglar. El ave tiene que moverse con el ÁRBOL, no con el mar. */
    animarGarzas(estado.t, estado.paralaje, dt);
    animarVisita(estado.t, estado.paralaje);
    animarBandada(estado.t, estado.paralaje);
    /* Las de quien más esté van con el mismo reloj que la visitante: es
       el mismo suceso —alguien llegó— pintado en el otro plano. */
    for (const ave of presentes.values()) {
      animarCaida(ave, estado.t, estado.paralaje);
    }
    /* El globo sigue al ave, no solo al ratón: si el puntero está
       quieto encima de una garza que se remueve, la frase tiene que
       seguirla. */
    pico.refrescar();
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
  /* ── EL OBJETIVO, CON MARGEN ─────────────────────────────────────
     4.5:1 es el umbral WCAG para el cuerpo pequeño del bloque, y
     apuntar exactamente al umbral es quedarse en el umbral: cualquier
     diferencia entre lo que mide el shader y lo que acaba componiendo
     el navegador —el grano del papel, el suavizado de las letras, el
     desvanecido del propio velo— cae del lado malo.

     Un objetivo de 5.4 llegó a estar puesto y se bajó a 4.5 porque
     obligaba al día claro a cargar con una nube oscura mucho mayor que
     el texto. Ese motivo ya no existe: de día la tinta es oscura y el
     velo vale cero, así que este número solo gobierna la noche, donde
     una veladura tenue no le quita nada a la pintura.

     Y hay una razón concreta para pedir de más: el calibrador lee el
     BÚFER DEL SHADER, y encima de ese búfer el navegador todavía
     compone la capa de las garzas. Un ave pálida cruzando por detrás
     del texto aclara lo que se ve y el calibrador no la ha visto.
     No hay forma barata de medir el compuesto desde dentro de la
     página, así que se compensa con holgura.

     8.0 es lo que hace falta para que la medida sobre los píxeles ya
     compuestos —`pruebas/e2e/contraste.spec.js`, que exige el umbral
     más un 10 %— salga en verde a las catorce horas medidas. */
  const OBJETIVO = 8.0;
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
  /* ── Y SE MIDEN LAS CUATRO PIEZAS, NO EL BLOQUE ───────────────────
     Medir la caja entera del bloque tapaba un fallo local: a las 23:00
     el bloque completo es cielo oscuro y sale de sobra, pero la banda
     de la Vía Láctea cruzaba justo por el subtítulo y ahí el contraste
     bajaba a 3,27:1. El promedio de una caja grande no ve un problema
     que solo ocupa una franja de ella.

     Cada pieza se mide aparte y el lavado —que es uno solo, el óvalo
     de detrás del bloque— se calcula con el peor de los cuatro. Es
     medio milisegundo más de `readPixels` cada diez segundos. */
  const ZONAS = [
    { sel: '.titulo' }, { sel: '.lockup' },
    { sel: '.hero__declaracion' }, { sel: '.hero__enlace' },
  ];
  let alfaLavado = 0;
  /* ── CADA CUÁNTO SE MIDE, Y POR QUÉ ESTABA MAL EN ESCRITORIO ──────
     `readPixels` sincroniza CPU y GPU: vacía la tubería y bloquea hasta
     que la GPU termina el cuadro. Dos lecturas por segundo eran un
     microtirón periódico, y eso ya estaba escrito aquí — pero el
     arreglo se aplicó SOLO al teléfono. `MOVIL ? 300 : 15` a 30 fps son
     10 s en móvil y MEDIO SEGUNDO en escritorio: exactamente las dos
     lecturas por segundo que el comentario decía haber quitado, ×4
     piezas, o sea ocho paradas de tubería por segundo.

     Ahora se cuenta en TIEMPO y no en cuadros —un contador de cuadros
     dice cosas distintas según a qué cadencia vaya el mar, que es justo
     lo que se adapta solo— y es el mismo número en los dos sitios: la
     luz se recalcula cada 30 s (`setInterval(refrescarHora, 30_000)`),
     así que medir cada 10 cubre cualquier cambio con dos veces de
     margen.

     Y NO SE PIERDE NADA por medir menos: si la luz cambió de verdad,
     `refrescarHora` pide una calibración para el cuadro siguiente. La
     cadencia es el suelo, no el techo. */
  const MS_LAVADO = 10_000;
  let proximoLavado = 0, primeraCalibracion = true;
  /* ── Y UNA TANDA DE ARRANQUE, QUE FALTABA ────────────────────────
     La primera calibración caía en el primer cuadro, cuando aún no han
     llegado todas las láminas: se medía un cielo liso y se daba por
     bueno. Con el movimiento encendido daba igual —diez segundos
     después se vuelve a medir—, pero con `prefers-reduced-motion` la
     escena dibuja un puñado de cuadros (uno por lámina que llega) y
     luego se queda quieta para siempre: la medida del cielo vacío se
     quedaba clavada.

     Medido a las 23:00 en un teléfono: el calibrador veía 0,337 de
     fondo donde la pintura terminada tiene 0,53 —la banda de la Vía
     Láctea cruzando por detrás del subtítulo— y no lavaba nada. El
     subtítulo se quedaba en 3,27:1.

     Se recalibra en los dibujos 1, 2, 4, 8… hasta el 64: seis lecturas
     repartidas por el primer medio segundo, que no se notan, y que
     cubren la llegada de las láminas venga cuando venga. Y le importa
     justo a quien pidió que nada se mueva. */
  let dibujos = 0;
  const enArranque = () => {
    /* Con el movimiento apagado la escena no dibuja en bucle: dibuja
       una vez por lámina que llega, cuatro o cinco cuadros contados y
       en instantes que dependen de lo cargada que esté la máquina. La
       escalera de potencias de dos se los pierde —si la última lámina
       entra en el dibujo 5, no hay recalibración— y el velo se queda
       con la medida de un cielo a medio pintar.

       Se vio como una prueba que unas veces pasaba y otras no: el
       enlace del héroe a las 23:00 daba 5,75 corriendo solo y 4,86 con
       la batería entera por delante. No era la prueba: era el sitio,
       en el modo de quien pidió que nada se mueva.

       Aquí se recalibra en CADA cuadro. Son cinco lecturas pequeñas en
       toda la visita. */
    if (quieto.matches) return true;
    return dibujos <= 64 && (dibujos & (dibujos - 1)) === 0;
  };
  lavadoAdaptativo = true;

  const linz = (v) => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  const lumRel = (c) => 0.2126 * linz(c[0]) + 0.7152 * linz(c[1]) + 0.0722 * linz(c[2]);
  const hexArr = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);

  /* ── LAS DOS TINTAS ────────────────────────────────────────────────
     Clara y oscura, con su sombra corta de acompañamiento. La oscura no
     es negra: es la misma tinta con la que está escrita la página de
     lectura (`--letra` en :root), para que el héroe y el papel hablen
     con la misma voz cuando la hora los pone del mismo lado. */
  const TINTAS = {
    clara: {
      color: '#FFFFFF',
      suave: 'rgb(255 255 255 / 78%)',
      halo: '0 1px 3px rgb(18 35 48 / 30%)',
      lavado: '#0B141A',           // hacia dónde se lava si no llega
    },
    oscura: {
      color: '#16222E',
      suave: 'rgb(22 34 46 / 76%)',
      halo: '0 1px 3px rgb(255 255 255 / 38%)',
      lavado: '#F4EFE6',
    },
  };
  let tintaPuesta = 'clara';

  function calibrarTinta() {
    dibujos++;
    const arranque = enArranque();
    const ahora = performance.now();
    if (ahora < proximoLavado && !arranque && !luzCambio) return;
    proximoLavado = ahora + MS_LAVADO;
    luzCambio = false;
    /* ── SE MIDE CONTRA EL LIENZO, NO CONTRA EL HERO ────────────────
       Aquí se leía `hero.getBoundingClientRect()` y se convertían las
       cajas del texto a píxeles de búfer restando `caja.top`. Eso vale
       con la página arriba del todo y deja de valer en cuanto se hace
       scroll: el hero SUBE con la página —su `top` se vuelve negativo—
       pero el lienzo está pegado al viewport y no se mueve. Restar el
       `top` del hero mete el scroll en la cuenta, así que la zona
       leída se iba desplazando hacia abajo dentro del búfer: a media
       pantalla de scroll ya no se estaba midiendo el fondo del rótulo
       sino el agua de más abajo, y a una pantalla entera, nada.

       Lo que se lee decide el color de la tinta, la carga del halo y el
       alfa del velo. Medir mal es teñir mal, y hacia el lado que toque:
       el velo de la tinta clara es `#0B141A` —casi negro— y el de la
       oscura `#F4EFE6` —casi blanco—.

       El origen bueno es el del propio lienzo, que además ya incluye su
       escala y su hundido porque `getBoundingClientRect` devuelve la
       caja transformada. Con esto la medida es la misma con la página
       arriba, a media pantalla o a punto de salir. */
    const caja = lienzo.getBoundingClientRect();
    const k = lienzo.width / Math.max(1, caja.width);

    const aGamma = (v) => (v <= 0.0031308 ? v * 12.92
                                          : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
    const razon = (a, b) => {
      const [hi, lo] = a > b ? [a, b] : [b, a];
      return (hi + 0.05) / (lo + 0.05);
    };
    /* Al tamaño del trazo, no del píxel: ver `medirZona()` en mar.js. */
    const baldosa = Math.max(2, Math.round(3 * k));

    /* ── EL PEOR FONDO DE CADA LADO, ENTRE LAS CUATRO PIEZAS ─────────
       Para tinta clara el enemigo es el fondo más CLARO; para tinta
       oscura, el más OSCURO. Se miran los dos, y de cada uno se guarda
       el peor caso de todas las piezas: la tinta es una sola y el
       lavado también, así que los dos los decide la pieza peor parada.

       Por percentil y no por extremo, que es lo que el código de aquí
       ya había aprendido: con el máximo absoluto, una sola ESTRELLA
       detrás del rótulo tumbaba el contraste nominal de 13.4:1 a
       2.12:1 y el lavado se iba a 0.48 — medio velo negro sobre la
       pintura por el 0.372 % de los píxeles. */
    let fondoClaro = 0, fondoOscuro = 1, alguna = false;
    /* ── UNA SOLA PARADA PARA LAS CUATRO PIEZAS ──────────────────────
       Las cuatro cajas están dentro del mismo bloque de texto, así que
       su unión cabe en una lectura. Antes eran cuatro `readPixels`, y
       el precio de esa llamada no está en los bytes que copia sino en
       que SINCRONIZA: cuatro cajas pequeñas costaban cuatro paradas de
       tubería, no una cuarta parte de una. Ver `medirZonas` en mar.js.

       Las cajas se calculan todas ANTES de leer nada, y por eso van en
       dos bucles y no en uno: `getBoundingClientRect` es una lectura de
       maquetación, y entremezclarlas con las medidas del lienzo mete
       trabajo de layout en medio de una espera de GPU. */
    const cajas = ZONAS.map((z) => {
      const el = document.querySelector(z.sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return null;
      // readPixels tiene el origen abajo-izquierda.
      return {
        x: Math.round((r.left - caja.left) * k),
        y: Math.round(lienzo.height - (r.bottom - caja.top) * k),
        w: Math.round(r.width * k),
        h: Math.round(r.height * k),
      };
    });
    for (const zona of mar.medirZonas(cajas.filter(Boolean), baldosa)) {
      if (!zona) continue;
      alguna = true;
      fondoClaro = Math.max(fondoClaro, aGamma(zona.p995));
      fondoOscuro = Math.min(fondoOscuro, aGamma(zona.p005));
    }
    if (!alguna) return;

    const conTinta = (t, fondo) =>
      razon(lumRel(hexArr(TINTAS[t].color)), lumRel([fondo, fondo, fondo]));
    const rClara = conTinta('clara', fondoClaro);
    const rOscura = conTinta('oscura', fondoOscuro);

    /* ── QUÉ TINTA, CON HISTÉRESIS ──────────────────────────────────
       La que más contraste da, pero la que ya está puesta no cede
       hasta que la otra la supera con holgura: en el crepúsculo las dos
       se cruzan despacio y sin este freno el rótulo parpadearía de
       blanco a negro cada pocos segundos, que es peor que cualquier
       problema de contraste. */
    const candidata = rOscura > rClara ? 'oscura' : 'clara';
    const mejor = Math.max(rClara, rOscura);
    const actual = tintaPuesta === 'clara' ? rClara : rOscura;
    if (candidata !== tintaPuesta && mejor > actual * 1.35) tintaPuesta = candidata;

    const T = TINTAS[tintaPuesta];
    hero.style.setProperty('--tinta', T.color);
    hero.style.setProperty('--tinta-suave', T.suave);
    hero.style.setProperty('--halo', T.halo);

    /* ── Y SI AÚN NO LLEGA, ENGORDA EL HALO ─────────────────────────
       Esto sacaba un óvalo desenfocado detrás de las letras. Hacía su
       trabajo y se veía: el dueño lo pidió fuera —«esa sombra del
       fondo», a todas las horas—, y con razón, porque una mancha oscura
       sobre un cielo estrellado ensucia el cielo justo donde está lo
       primero que se mira.

       El cálculo se queda igual: se busca el alfa mínimo que llevaría
       el contraste al objetivo. Lo que cambia es dónde se gasta. En vez
       de pintar el FONDO, se engorda el BORDE DE LA LETRA — un
       `text-shadow` corto, pegado al glifo, que sube la razón medida
       sobre píxeles sin tener superficie propia que se pueda ver como
       forma.

       Dos sombras y no una: la corta despega la letra del grano, y la
       segunda, más abierta y más floja, es la que hace el trabajo de
       contraste cuando la Vía Láctea pasa por detrás. Las dos crecen
       con lo que falte y valen su mínimo de siempre cuando no falta
       nada, que es casi todo el día. */
    const fondoPeor = tintaPuesta === 'clara' ? fondoClaro : fondoOscuro;
    const lavCol = hexArr(T.lavado);
    const lt = lumRel(hexArr(T.color));
    let necesario = 0.62;
    for (let a = 0; a <= 0.62; a += 0.02) {
      const lf = lumRel(lavCol.map((c) => fondoPeor * (1 - a) + c * a));
      if (razon(lt, lf) >= OBJETIVO) { necesario = a; break; }
    }
    /* Durante el arranque se fija de golpe. Con movimiento apagado se
       dibujan cuatro cuadros contados, y con suavizado el lavado se
       quedaría a un cuarto de camino para siempre — justo en el modo de
       quien pidió calma. Después ya se acompaña con suavizado. */
    if (primeraCalibracion || arranque) alfaLavado = necesario;
    else alfaLavado += (necesario - alfaLavado) * 0.25;

    /* `necesario` va de 0 a 0.62. El halo base es el de la tinta; a eso
       se le suma hasta un 34 % más de carga en la sombra corta y hasta
       un 46 % en la abierta. Con `necesario` en 0 —el caso normal— sale
       exactamente el halo de siempre y no hay ningún cambio. */
    /* EL VELO SIGUE EXISTIENDO, PERO SOLO PARA LAS DOS LÍNEAS PEQUEÑAS.
       Estas dos escrituras se habían perdido al pasar el trabajo al
       halo, y el resultado fue silencioso y perfecto en su maldad: el
       velo ceñido que se devolvió a `.lockup` y `.hero__declaracion`
       estaba puesto en la hoja, con su forma y su desenfoque, y a
       opacidad CERO. La medida no se movió, y por un momento pareció
       que el velo tampoco servía. Servía; no estaba encendido.

       Quién lo usa lo decide la hoja: el rótulo grande ya no lo lleva,
       que es lo que el dueño pidió quitar. */
    document.documentElement.style.setProperty('--lavado', alfaLavado.toFixed(3));
    document.documentElement.style.setProperty('--lavado-color', T.lavado);

    const carga = Math.min(1, alfaLavado / 0.62);
    const tono = tintaPuesta === 'clara' ? '18 35 48' : '255 255 255';
    const base = tintaPuesta === 'clara' ? 30 : 38;
    hero.style.setProperty('--halo',
      `0 1px 3px rgb(${tono} / ${(base + carga * 34).toFixed(0)}%),`
      + ` 0 0 9px rgb(${tono} / ${(carga * 46).toFixed(0)}%)`);

    /* ── Y EL LOCKUP PIDE MÁS, PORQUE ES EL MÁS PEQUEÑO ─────────────
       Medido con `contraste.spec.js` después de quitar el velo: el
       rótulo grande aguanta de sobra —es tipografía grande y su umbral
       es más bajo—, pero el lockup se quedaba corto justo de noche:

         móvil 19:00   4.13:1 · pide 4.95    escritorio 19:00  4.02:1
         móvil 23:00   4.20:1 · pide 4.95    escritorio 23:00  4.10:1
                                             escritorio 05:00  4.44:1

       O sea: a las horas en que este sitio de verdad se abre. Trece
       píxeles en versalitas con 0.30em de tracking, blancos, sobre la
       Vía Láctea — es la pieza peor parada del cuadro y por eso el
       velo existía.

       Su halo va aparte y va más cargado: MÁS CERRADO, no más grande.
       Tres píxeles de desenfoque pegados al glifo se leen como que la
       letra está bien recortada; nueve píxeles con la misma carga se
       leerían como la mancha que el dueño acaba de echar. La densidad
       sube donde no se ve —contra el borde— en vez de extenderse por el
       cielo. */
    hero.style.setProperty('--halo-fino',
      `0 0 3px rgb(${tono} / ${(58 + carga * 34).toFixed(0)}%),`
      + ` 0 1px 2px rgb(${tono} / ${(52 + carga * 30).toFixed(0)}%),`
      + ` 0 0 7px rgb(${tono} / ${(28 + carga * 34).toFixed(0)}%)`);

    primeraCalibracion = false;
  }

  /* ═══ LA RESOLUCIÓN SUBE SI EL APARATO LA AGUANTA ═══════════════════
     El perfil móvil elige un buen punto de partida, pero el dato que al
     final importa es lo que la persona recibe. Tras el arranque se
     observa rAF en ventanas de tres segundos, y hay dos direcciones.

     HACIA ABAJO, como siempre: si el navegador no sostiene 48
     actualizaciones se reduce la FRECUENCIA del mar, nunca su
     resolución — las garzas y el scroll siguen ligados al refresco de
     la pantalla y la acuarela conserva su detalle.

     Y HACIA ARRIBA, que es lo nuevo. La pintura se calculaba SIEMPRE a
     1× CSS en todo teléfono, y de ahí sale a DPR 2 con el pase de
     reconstrucción: en un móvil de 3× eso son 329 000 píxeles pintados
     para 3 millones de píxeles de pantalla. Un teléfono de gama alta
     tiene de sobra para pintar el doble y no se le pedía nunca. Ahora,
     si sostiene la cadencia Y el cuadro de mar le cuesta poco —los dos,
     medidos en el aparato—, la escena sube un escalón: 1.0 → 1.30 →
     1.60, con techo en el propio DPR, porque pintar más píxeles de los
     que tiene la pantalla no se ve.

     Las tres cautelas que hacen que esto no sea una apuesta:

     · SE EMPIEZA ABAJO. El primer cuadro y la primera pantalla son
       exactamente los de antes; subir es una decisión posterior y
       tomada con datos.
     · SE BAJA ANTES QUE SUBIR. Si una ventana cae de 48 Hz se deshace
       el último escalón en el acto, antes de tocar la frecuencia.
     · NO SUBE EN PERFIL DE AHORRO. Con `saveData`, red 2G/3G o poca
       memoria, esto no existe: quien pidió ahorrar no pidió nitidez.

     Y no cuesta un byte de descarga: es el mismo shader sobre más
     píxeles, decidido en el aparato. */
  let muestraCadencia = 0, cuadrosCadencia = 0, ajustesCadencia = 0;
  let msMar = 0;
  const cadenciaDesde = performance.now() + 4000;
  /* Los escalones y el presupuesto. 1.30 y 1.60 y no 2.0: el pase de
     reconstrucción presenta a DPR 2 como mucho, así que a 1.60 el
     estirado que queda es de 1.25× —prácticamente nada— y el salto a
     2.0 costaría un 56 % más de píxeles para ganar ese resto.

     `MS_SUBIR` es el techo de coste por cuadro para atreverse a subir.
     A 30 fps el presupuesto entero son 33 ms; con 6 se sube solo si el
     cuadro cuesta menos de una quinta parte, o sea si sobra sitio para
     que al subir un escalón —un 69 % más de píxeles— siga sobrando. */
  const ESCALONES = [1.0, 1.30, 1.60];
  const MS_SUBIR = 6.0;
  let escalonActual = 0;

  function ponerEscala(nueva, motivo) {
    if (Math.abs(nueva - escala) < 0.01) return;
    escala = nueva;
    medidas();                     // reconstruye el lienzo y la escena
    console.info(`[mar] escala → ${escala} (${motivo}, ${msMar.toFixed(1)} ms/cuadro)`);
  }

  function adaptarCadencia(ms) {
    if (!MOVIL || ms < cadenciaDesde) return;
    if (!muestraCadencia) { muestraCadencia = ms; cuadrosCadencia = 0; return; }
    cuadrosCadencia++;
    const lapso = ms - muestraCadencia;
    if (lapso < 3000) return;
    const hz = cuadrosCadencia * 1000 / lapso;
    muestraCadencia = ms;
    cuadrosCadencia = 0;

    /* ── VA JUSTO: primero se deshace la nitidez, después la fluidez ── */
    if (hz < 48) {
      if (escalonActual > 0) {
        escalonActual--;
        ponerEscala(ESCALONES[escalonActual], `${hz.toFixed(0)} Hz, se baja`);
        return;                    // se le da una ventana para respirar
      }
      if (ajustesCadencia >= 3) return;
      const fpsAnterior = fpsMar;
      fpsMar = Math.min(fpsMar, hz < 34 ? 20 : 24);
      intervaloMar = 1000 / fpsMar;
      ajustesCadencia++;
      console.info(`[mar] cadencia ${hz.toFixed(1)} Hz: ${fpsAnterior} → ${fpsMar} fps, escala ${escala}`);
      return;
    }

    /* ── VA SOBRADO: se le pide más pintura ── */
    if (PERFIL_AHORRO || ajustesCadencia > 0) return;
    if (escalonActual >= ESCALONES.length - 1) return;
    if (msMar > MS_SUBIR) return;
    const siguiente = ESCALONES[escalonActual + 1];
    /* Techo en el DPR real: más píxeles de los que tiene la pantalla no
       se ven, y el pase de reconstrucción ya presenta a DPR 2. */
    if (siguiente > Math.min(devicePixelRatio || 1, 2.0) + 0.001) return;
    escalonActual++;
    ponerEscala(siguiente, `${hz.toFixed(0)} Hz de sobra`);
  }

  /* Lo escribe el bloque de `?mar=diag`; sin el parámetro se queda en
     nulo y el bucle no lo llama nunca. */
  let diagVivo = null;

  function bucle() {
    if (corriendo) return;
    corriendo = true;
    const paso = (ms) => {
      /* Si el navegador se llevó el contexto, este bucle ya no pinta
         nada: sigue llamando a un WebGL muerto, que no lanza errores
         —falla en silencio— y gasta un cuadro por fotograma para
         siempre. Ver `caerAlRespaldo` al final del archivo. */
      if (marPerdido) { corriendo = false; return; }
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
        /* Las de presencia también, y por la misma razón que la
           visitante: mientras CAEN es un vuelo, y un vuelo a 30 fps se
           ve a tirones. Ya posadas el gasto es el mismo que el de la
           bandada, que es casi ninguno. */
        for (const ave of presentes.values()) animarCaida(ave, ms / 1000, estado.paralaje);
        /* Y el ave que despega, por lo mismo: es un vuelo, y un vuelo a
           30 fps se ve a tirones. Solo ella —el resto de la bandada se
           balancea medio grado y no merece el gasto. */
        if (despegue.ave) animarDespegue(despegue.ave, ms / 1000, estado.paralaje);
      }
      if (diagVivo) diagVivo(ms);
      requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }

  // Un cuadro siempre, incluso con movimiento apagado: el mar quieto
  // tiene que ser bonito por sí solo. Es también la versión gama baja.
  cuadro(performance.now());
  hero.setAttribute('data-mar', 'listo');

  /* ── EL DIAGNÓSTICO, EN VIVO ───────────────────────────────────────
     `?mar=diag` ya decía si el mar pintaba o se había caído al
     respaldo, y con eso el dueño pudo descartar la pérdida de contexto
     en un solo mensaje. Pero «pintando» no basta: el parpadeo sigue y
     hay que ver QUÉ VALOR se descuadra en el instante en que ocurre.

     Esta línea se reescribe con cada cuadro y trae lo poco que puede
     explicar un hero lavado: el alfa del velo y qué tinta está puesta
     —los dos salen de una medida sobre los píxeles del lienzo, y una
     medida mala tiñe la pantalla entera—, el escalón de resolución
     —por si el motor se está achicando bajo presión—, el tamaño real
     del búfer, el scroll y la cadencia.

     Se lee de una foto del teléfono, que es el único instrumento que
     hay a este lado. No existe sin el parámetro y no cuesta nada sin
     él: la escritura entera está dentro de la puerta. */
  if (DIAG_MAR && nota) {
    nota.style.fontVariantNumeric = 'tabular-nums';
    let ultimoDiag = 0;
    diagVivo = (ms) => {
      if (ms - ultimoDiag < 120) return;
      const fps = ultimoDiag ? Math.round(1000 / (ms - ultimoDiag)) : 0;
      ultimoDiag = ms;
      nota.textContent =
        `webgl · lav ${alfaLavado.toFixed(2)} · ${tintaPuesta}`
        + ` · esc ${escalonActual} ${lienzo.width}×${lienzo.height}`
        + ` · sY ${Math.round(scrollY)} · ${fps}fps`
        + ` · eco ${document.documentElement.classList.contains('con-eco') ? 'sí' : 'no'}`;
    };
  }

  /* ── EL ECO DEL MAR ────────────────────────────────────────────────
     Una FOTO del propio lienzo, reducida, puesta como fondo de `.mundo`
     —o sea justo detrás del lienzo—. Es el arreglo del parpadeo de
     Safari, y no arregla la causa: la causa está en el compositor de
     WebKit y desde aquí no se alcanza. Cinco hipótesis se probaron y
     cayeron —el color del vacío, conservar el buffer, la escala del
     hundido, la anidación del lienzo dentro de un elemento fijo, los
     filtros SVG— y de todas ellas solo quedó firme el síntoma: al hacer
     scroll, WebKit deja de componer la capa del lienzo y se ve lo que
     hay detrás. Con esto, lo que hay detrás deja de ser un degradado
     plano y pasa a ser el mismo cuadro, quieto un instante. El fallo
     sigue ocurriendo; deja de verse.

     POR QUÉ UNA FOTO Y NO LAS LÁMINAS. La otra salida era pintar detrás
     la composición estática que el sitio ya tiene (agua y manglar en
     CSS). Habría que hacerla coincidir a mano con lo que calcula el
     shader —la caja del árbol, la línea de agua, la hora— y esa
     coincidencia se rompería en cada ventana y a cada hora. Una foto
     del lienzo coincide por construcción, siempre, sin un solo número
     que mantener.

     Y ES BARATA PORQUE YA SE PAGÓ EL BILLETE: leer un lienzo de WebGL
     exige `preserveDrawingBuffer`, que este motor ya lleva puesto desde
     que se persiguió el parpadeo por ahí. Se reduce a 720 px de ancho
     —detrás de un lienzo opaco, y solo visible en un parpadeo, no hace
     falta la resolución entera— y se codifica en WebP: unas pocas
     decenas de kilobytes en memoria. Medida la diferencia entre el
     lienzo vivo y su eco, sobre la portada entera: 33 de 765 en Blink y
     40 en WebKit, o sea un 5 %, casi todo blandura del reescalado.

     CADA CUÁNTO. Una al asentarse la escena y otra cada veinte
     segundos, y solo mientras el hero se ve. La pintura cambia con la
     hora, que se mueve despacio: veinte segundos de desfase no se
     distinguen ni mirándolo. Al cambiar de tamaño la ventana se rehace
     enseguida, porque ahí sí cambia todo. */
  const mundo = document.querySelector('.mundo');
  let ecoPedido = 0;
  function ecoDelMar() {
    if (!mundo || !visible || marPerdido || !lienzo.width) return;
    try {
      const ancho = 720;
      const alto = Math.max(1, Math.round(ancho * lienzo.height / lienzo.width));
      const c = document.createElement('canvas');
      c.width = ancho; c.height = alto;
      c.getContext('2d').drawImage(lienzo, 0, 0, ancho, alto);
      mundo.style.setProperty('--eco-mar', `url("${c.toDataURL('image/webp', 0.7)}")`);
      /* Que exista un eco cambia lo que tiene que hacer el respaldo si
         el contexto se pierde: ver `caerAlRespaldo` y la nota de
         `.con-eco` en estilos.css. */
      document.documentElement.classList.add('con-eco');
    } catch { /* un lienzo que no se deja leer no rompe la portada */ }
  }
  /* Al asentarse: 2 s después del primer cuadro es tiempo de sobra para
     que las catorce láminas estén subidas y el mar haya llegado a su
     estado, y sigue siendo antes de que nadie haya bajado del hero. */
  const pedirEco = () => {
    clearTimeout(ecoPedido);
    ecoPedido = setTimeout(ecoDelMar, 2000);
  };
  pedirEco();
  setInterval(ecoDelMar, 20_000);
  addEventListener('resize', pedirEco, { passive: true });

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

  /* ── Y UNA LECTURA DEL ESTADO QUE SÍ VIAJA AL SITIO PUBLICADO ─────
     `__mar` es una herramienta de auditoría: vuelve a dibujar el cuadro
     y lee el búfer entero, así que se queda en desarrollo. Esto otro es
     solo LEER cuatro números que ya están pintados en pantalla — cuánta
     calma tiene el agua, cuánto se ha sostenido y cuántas manos hay— y
     va siempre, porque las pruebas de extremo a extremo corren contra el
     sitio compilado y ahí es donde hay que comprobar que el gesto de
     calma funciona. No permite hacer nada que no se pueda hacer con el
     dedo. */
  window.__hero = {
    estado: () => ({
      t: estado.t,
      calma: estado.calma,
      sostenido,
      ajeno,
      manos: presencia.manos(),
      manosAjenas: presencia.manosAjenas(),
    }),
  };
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

  /* ── LA QUE AGARRA LA RAMA ────────────────────────────────────────
     La séptima, y la única que no vino en la rejilla de seis: se pidió
     aparte porque las otras están pintadas con los dedos EXTENDIDOS EN
     HORIZONTAL —como quien se posa en un suelo plano— y la raíz de la
     visitante baja 28 grados. Aquí los dedos se curvan hacia abajo,
     que es lo que hace que un pie agarre en vez de apoyarse.

     Es la pose de reposo SOLO de la visitante: la bandada se queda con
     `posada`, que a 35 px de alto no enseña un dedo.

     Los seis números NO están escritos a ojo: salen de contar los
     píxeles del archivo (centroide ponderado por alfa, caja de tinta y
     punto más bajo). Y es la misma garza que el juego —medido: la
     esbeltez, que es ancho máximo entre alto de tinta, difiere un
     2.5 % de `posada`—, así que `factor` se queda en 1 y cambiar de
     pose no le cambia la talla. */
  /* `pies` NO es el píxel más bajo, y esta es la única pose donde eso
     importa: en las otras seis el punto más bajo es la planta, aquí es
     la punta de la garra, que baja por DETRÁS de la rama. Anclando por
     ahí el ave quedaba flotando un dedo por encima de la madera —visto
     en el compilado—. El punto bueno es donde la rama cruza entre los
     dos pies: media entre las dos plantas (0.941 y 0.839, contadas
     desde las garras menos el 60 % del rizo de los dedos) y el centro
     entre las dos patas, que los componentes conexos dan en 0.455 y
     0.652.

     Y la lámina trae su propia pendiente: el pie de delante cae 0.102
     de alto por debajo del otro con 0.136 de separación, o sea 0.75
     —espejada, bajando a la derecha en pantalla, como la raíz de
     verdad, que va a 0.54—. Los cinco grados de diferencia se los come
     el rizo del dedo. */
  agarre:   { src: ARTE + 'posada/agarre.webp',     cx: 0.588, cy: 0.404,
              aspecto: 0.689, pies: [0.554, 0.890], altoTinta: 0.972, factor: 1.000 },
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
/* `base` es la pose a la que vuelve el ave entre gesto y gesto. Era
   siempre 'posada'; desde que la visitante tiene su propia lámina con
   los dedos agarrando, cada ave dice cuál es la suya. */
function nuevoReposo(calma, calma0, pesos, base) {
  const quieta = base || 'posada';
  return { actual: quieta, previa: quieta, desde: 0, hasta: 0, base: quieta,
           arrancado: false, calma, calma0, pesos: pesos || null };
}
const reposo = nuevoReposo([7.0, 19.0], [3.0, 6.5]);

/* ── LA DISOLVENCIA NO PUEDE VOLVER TRANSPARENTE AL AVE ────────────
   Dos láminas cruzándose a alfa `1-m` y `m` son dos capas
   independientes, así que en el solape el ave queda a `1-(1-m)·m` — a
   mitad de gesto, un 75 % de opacidad, y por debajo de ella se ve el
   agua. Medido en el compilado: a las 10.5 había SIEMPRE dos láminas a
   media opacidad en pantalla. Es exactamente el aspecto de una
   calcomanía mal pegada, y es de las cosas que se ven sin saber qué se
   está viendo.

   La disolvencia se queda —es acuarela, no cine— pero la que SALE se
   sostiene: `1 − m³` la deja casi entera hasta el final del cruce y la
   suelta al terminar. Con eso el solape nunca baja del 90 % y el ave
   no se transparenta. Lo que se pierde es un pelo de la mezcla, y lo
   que se gana es que el cuadro no se vea a través del pájaro. */
const saleFundido = (m) => 1 - m * m * m;

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
    if (g.actual !== g.base) {                      // vuelve a la calma
      g.actual = g.base;
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
      ? [[g.previa, saleFundido(m)], [clave, m]]
      : (cruce > 0 && sig !== clave)
        ? [[clave, saleFundido(cruce)], [sig, cruce]]
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
      ? [[g.previa, saleFundido(m)], [g.actual, m]]
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
/* Las láminas que necesita un ave que cae y luego se queda: los ocho
   cuadros del aterrizaje y las seis poses de reposo. Vive aquí arriba
   porque ahora la usan dos sitios —la visitante y las de presencia— y
   dos listas iguales en dos sitios son dos listas el día que alguien
   toque una. */
const LAMINAS_CAIDA = [...CAIDA, 'posada', 'agarre', 'pAlerta', 'pEncoge',
                       'pUnaPata', 'pMira', 'pAlas'];
const crearTinteAve = () =>
  contenedor ? pico.crearTinte(contenedor, (k) => VUELO[k].src) : null;
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
  for (const clave of LAMINAS_CAIDA) {
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
  /* EL CHARCO — la sombra que la posa. Mirando el sitio desplegado de
     día quedó claro qué la delataba como recorte: todo lo del cuadro
     proyecta algo —el manglar entero tiene su reflejo— y ella no
     tocaba la rama con nada. Los drop-shadow del CSS solo asoman
     donde la silueta desplazada sobresale del alfa; un cuerpo posado
     necesita además su MANCHA debajo, la elipse que un acuarelista
     deja caer bajo el ave antes de pintarla. Va ANTES de las láminas
     en el DOM para pintarse debajo de ellas, y animarVisita la mueve
     con los pies. */
  const charco = document.createElement('div');
  charco.className = 'vuelo-charco';
  charco.style.opacity = '0';
  contenedor.insertBefore(charco, contenedor.firstChild);
  /* UNA. La visitante es una y solo una, y no es una restricción de
     dibujo sino de sentido: representa a quien acaba de abrir el sitio,
     y quien abre el sitio es una persona. La rama cercana no admite
     bandada — si hubiera dos, ya no sería ella.

     Y ESO SIGUE SIENDO CIERTO CON LA PRESENCIA. Las garzas de quien más
     esté no vienen aquí: se posan en la copa del manglar del fondo, con
     la bandada. La rama de delante es de quien mira, y por eso es la
     única que se puede personalizar desde el panel. */
  visita = { capas, charco, px: 0, py: 0, vx: 0, vy: 0, arrancado: false,
             id: 'yo', plano: 1.35, espeja: true,
             tinte: crearTinteAve(),
             sena: { pico: null, frase: null },
             reposo: nuevoReposo([8.0, 21.0], [4.0, 8.0], null, 'agarre') };
}

/* ═══ LAS GARZAS DE QUIEN MÁS ESTÁ ════════════════════════════════
   Una por cada OTRA sesión con Galene abierto. Entran cayendo, igual
   que la de quien mira, y se posan en la copa del manglar del fondo.
   Cuando esa pestaña se cierra, su garza se va.

   ── QUÉ SIGNIFICAN EXACTAMENTE, PORQUE IMPORTA ────────────────────
   Significan «hay alguien más ahora». NO significan «han pasado por
   aquí N personas»: eso necesitaría un servidor que cuente visitas a un
   sitio sobre sumisión química, que es el registro que la regla 9
   prohíbe construir. Lo que se pinta es lo único que se puede saber sin
   guardar nada de nadie, y se pinta sin inventar ni una — ver la
   cabecera de presencia.js.

   ── POR QUÉ NO SE MEZCLAN CON LA BANDADA ─────────────────────────
   La bandada es paisaje: son las garzas del manglar, y llevan ahí desde
   antes. Estas son personas, y por eso son las únicas —con la de quien
   mira— que pueden llevar pico de color y frase. Se reparten las mismas
   PERCHAS para que no se solapen con ella, pero son otra lista y otra
   vida.

   ── EL TOPE ──────────────────────────────────────────────────────
   Seis. No por pantalla sino por sentido: pasadas seis, más garzas
   dejan de leerse como personas y pasan a ser una mancha, que es
   justamente lo contrario de lo que esto cuenta. Si un día hay más
   sesiones que perchas, las que no caben simplemente no se pintan y el
   aviso de abajo sigue diciendo la verdad. */
const PRESENTES_MAX = 6;
const presentes = new Map();          // id de sesión → ave

/* ── EL AVISO DE LAS MANOS ─────────────────────────────────────────
   Que se note cuando varios están calmando el mar a la vez. Lo que de
   verdad lo dice son los ANILLOS —aparece uno donde no está tu dedo— y
   esto es la línea que lo pone en palabras: para quien no ve el cuadro,
   y para quien lo ve pero no sabe qué está mirando.

   NO ES UN CONTADOR DE VISITAS, y por eso no dice nada cuando nadie
   sostiene. Solo aparece mientras hay manos puestas, y cuenta MANOS EN
   EL AGUA, no personas mirando. La diferencia no es de redacción:
   contar a quien está en el sitio sería el recuento que la regla 9
   prohíbe; describir cuántas manos hay en un gesto que está ocurriendo
   en pantalla es contar lo que se ve.

   Aparece con la primera mano AJENA, no con la propia: quien sostiene
   ya sabe que sostiene, y decírselo sería un cartel. */
const avisoManos = document.querySelector('.manos');
let manosEscritas = -1;
function refrescarManos() {
  if (!avisoManos) return;
  const ajenas = presencia.manosAjenas();
  const n = presencia.manos();
  if (n === manosEscritas) return;
  manosEscritas = n;
  if (ajenas <= 0) { avisoManos.dataset.visible = '0'; return; }
  /* Se cuenta lo que hay en el agua, la propia incluida. Con una sola
     —la de otra persona, porque si fuera la tuya no habría aviso— se
     dice en palabras y no con un número: «hay 1 manos» no lo dice
     nadie, y «hay 1 mano» sigue siendo un contador donde lo que hace
     falta es una frase. */
  avisoManos.textContent = n === 1
    ? 'Alguien más está calmando el mar.'
    : `Hay ${n} manos en el agua.`;
  avisoManos.dataset.visible = '1';
}

function crearAvePresencia(id) {
  if (!contenedor) return null;
  const capas = {};
  for (const clave of LAMINAS_CAIDA) {
    const v = VUELO[clave];
    const img = new Image();
    /* SIN `diferirImagen`: estas aves nacen tarde, cuando alguien abre
       otra pestaña, y para entonces el diferidor ya vació su cola. Se
       piden directamente y con prioridad baja — son adorno, y el mar ya
       está pintado. */
    img.src = v.src;
    img.fetchPriority = 'low';
    img.alt = '';
    img.className = 'vuelo vuelo--presencia';
    img.decoding = 'async';
    const ox = v.cx + (v.pies[0] - v.cx);
    const oy = v.cy + (v.pies[1] - v.cy);
    img.style.transformOrigin = (ox * 100).toFixed(1) + '% ' + (oy * 100).toFixed(1) + '%';
    img.style.opacity = '0';
    contenedor.appendChild(img);
    capas[clave] = img;
  }
  return {
    capas, id,
    /* En la copa del fondo, con la bandada: mismo plano, mismo paralaje
       y sin espejar. */
    plano: 0.45, espeja: false,
    tinte: crearTinteAve(),
    sena: { pico: null, frase: null },
    /* Su reloj empieza AHORA: acaba de llegar. `t0` es tiempo del bucle
       del mar, el mismo que usa `inicioContenido`. */
    t0: performance.now() / 1000,
    reposo: nuevoReposo([7.0, 19.0], [3.0, 6.5]),
    alto: 0, pieX: 0, pieY: 0, entraX: 0, entraY: 0, vela: 0, h0: 0,
  };
}

function quitarAvePresencia(ave) {
  for (const el of Object.values(ave.capas)) el.remove();
  ave.tinte?.quitar();
  pico.registrar(ave.id, null);
  presentes.delete(ave.id);
}

/* Se llama cada vez que cambia quién está. Crea las que faltan, quita
   las que se fueron y les copia su pico y su frase. NO recoloca: de eso
   se encarga `colocarGarzas`, que es quien sabe dónde está el árbol. */
function sincronizarPresencia() {
  if (!contenedor) return;
  /* Con Supabase configurado la bandada YA son las sesiones vivas —una
     fila por pestaña abierta en el mundo, esta incluida—, así que poner
     encima una garza por cada pestaña de este navegador sería pintar a
     la misma persona dos veces. Las manos siguen entrando: ver la
     cabecera de los imports. */
  const vivas = bandadaEnRed ? [] : presencia.vivas().slice(0, PRESENTES_MAX);
  const ids = new Set(vivas.map((f) => f.id));

  for (const ave of [...presentes.values()]) {
    if (!ids.has(ave.id)) quitarAvePresencia(ave);
  }
  for (const f of vivas) {
    let ave = presentes.get(f.id);
    if (!ave) {
      ave = crearAvePresencia(f.id);
      if (!ave) return;
      presentes.set(f.id, ave);
    }
    /* El pico llega como color y la frase como ÍNDICE: lo que viaja por
       el canal es un número, no un texto. Ver datos/garza.js. */
    ave.sena = { pico: f.pico ? colorDePico(f.pico) : null, frase: fraseDe(f.frase) };
  }
  colocarPresentes();
  refrescarManos();
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
  const lista = reales.filter(perchaPintable).slice(0, tope);
  lista.forEach((g, n) => bandada.push(garzaDesdeFila(g, n, lista.length)));
  repartirGestos();
}

/* Una garza más, en vivo, sin re-sortear las que ya estaban quietas —
   ver la nota en `repartirGestos`. Reutiliza `dispatchEvent(resize)`
   para que `colocarGarzas` —que ya sabe recorrer TODA la bandada y
   encontrarle sitio a cada una— la coloque, en vez de duplicar esa
   lógica aquí. Mismo patrón que ya usa este repo para el foro. */
/* UNA FILA SOLO SE PINTA SI TIENE DÓNDE POSARSE.

   `PERCHAS` son ocho columnas medidas sobre la lámina del manglar, y
   la base reparte índices dentro de ese mismo rango (ver la nota de
   las ocho en esquema-bandada.sql). Si los dos números se separan
   alguna vez —una migración a medias, un despliegue viejo hablándole a
   una base nueva—, esto es la diferencia entre no ver una garza y que
   la portada entera se caiga con un TypeError en `PERCHAS[idx][0]`. */
const perchaPintable = (g) => Number.isInteger(g?.percha)
  && g.percha >= 0 && g.percha < PERCHAS.length;

function agregarGarzaEnVivo(fila) {
  if (!contenedor || !perchaPintable(fila) || bandada.some((a) => a.id === fila.id)) return;
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

/* ── EL DORMIDERO CUANDO NO HAY RED ────────────────────────────────
   Sin Supabase configurado —o con la red caída— el árbol NO se queda
   vacío, y esto no es una concesión: el manglar tiene garzas porque es
   un manglar, no porque haya alguien más mirando la página. Son
   paisaje, exactamente lo que fueron desde el primer día, y el
   proyecto lleva tres pasadas de trabajo en que dejen de leerse como
   PNG pegados. Vaciarlo por falta de una variable de entorno sería
   apagar la pintura, no apagar un servicio.

   La regla 3 —«no fabricar personas»— sigue intacta: estas garzas no
   dicen ser nadie. Las que SÍ significan «hay alguien más» son otras
   dos cosas, y las dos son ciertas o no aparecen: las filas reales de
   `garzas_publico` cuando hay red, y las manos de `presencia.js`, que
   son pestañas que existen de verdad.

   Se emiten con la MISMA FORMA que una fila de la base y entran por el
   mismo camino (`poblarBandada` → `garzaDesdeFila`), para que no haya
   dos maneras de nacer que puedan divergir. */
const POSES_PAISAJE = ['reposo', 'reposo', 'alerta', 'encogida', 'una-pata', 'mira-abajo'];
function filasDePaisaje() {
  const chica = viewportWidth() < 700;
  /* NUNCA llena el árbol: dos perchas quedan libres siempre, que es
     donde se posan las garzas de presencia cuando no hay red — y sin
     red es justo cuando las hay. */
  const techo = Math.max(2, PERCHAS.length - 2);
  const cuantas = Math.min(techo, chica ? 3 + Math.floor(Math.random() * 2)
                                        : 4 + Math.floor(Math.random() * 3));
  const orden = PERCHAS.map((_, i) => i);
  for (let i = orden.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [orden[i], orden[j]] = [orden[j], orden[i]];
  }
  return Array.from({ length: cuantas }, (_, n) => ({
    id: 'paisaje-' + n,
    percha: orden[n],
    pose: POSES_PAISAJE[Math.floor(Math.random() * POSES_PAISAJE.length)],
    escala: 0.86 + Math.random() * 0.24,
    /* Las láminas están pintadas mirando a la izquierda: -1 es como
       vinieron, 1 las voltea. Menos de la mitad volteadas, para que el
       dosel no se lea simétrico. */
    mira: Math.random() < 0.45 ? -1 : 1,
  }));
}

/* El punto de entrada real: pide la propia garza (deja constancia de
   esta visita) y luego la bandada entera —la propia incluida, ya no
   hay que distinguirla— y recién ahí puebla el árbol. Si Supabase no
   está configurado o la red falla, cae al dormidero de paisaje de
   arriba: el sitio sigue pintado, solo que sin nadie más dentro. */
async function poblarBandadaReal() {
  if (!contenedor) return;
  try {
    if (!bandadaEnRed) throw new Error('Supabase no está configurado');
    await dejarGarza();
    const reales = await garzasVivas();
    poblarBandada(reales);
    dispatchEvent(new Event('resize'));
  } catch (e) {
    if (bandadaEnRed) console.warn('No se pudo conectar con la bandada compartida:', e);
    poblarBandada(filasDePaisaje());
    dispatchEvent(new Event('resize'));
    return;
  }
  suscribirManglar({
    onLlega: (fila) => agregarGarzaEnVivo(fila),
    onVuela: ({ id }) => quitarGarzaEnVivo(id),
  });

  /* Y AL CERRAR, LA GARZA SE VA. Sin esto se quedaba en el árbol para
     siempre —lo único que la sacaba era el desalojo de la más
     antigua—, y el manglar acababa lleno de sesiones muertas. Ver
     `despedirse()` en bandada-cliente.js y `volar_garza()` en
     esquema-bandada.sql.

     `pagehide` y no `unload`, igual que en presencia.js: es el único
     que dispara de verdad en iOS y el único compatible con la caché de
     atrás-adelante. Y por eso mismo hay `pageshow`: quien vuelve por
     el botón de atrás no llega con una página nueva, llega con la
     misma, y sin volver a dejar garza se quedaría fuera del árbol
     mirando a los demás. */
  addEventListener('pagehide', () => { despedirse(); });
  addEventListener('pageshow', (e) => {
    if (!e.persisted) return;              // carga normal: ya la dejó el arranque
    dejarGarza().catch(() => { /* sin red: el árbol se queda como está */ });
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
/* ── DÓNDE PISA LA VISITANTE, MEDIDO SOBRE LA LÁMINA ───────────────
   Estuvo en [0.277, 0.400], puesto a ojo, y el dueño lo cazó mirando
   la portada: «al posarse sus patas parecen salirse de la rama». Lo
   son. Medido en los píxeles de `manglar-cerca.webp`, en esa columna:

     · la raíz solo da 1.5 % del ancho de lámina de apoyo a CADA LADO
       del pie —es el tramo más estrecho y más inclinado de toda la
       raíz— y los dedos, que miden más que eso, sobresalen al agua;
     · y el pie caía 7.9 % de lámina POR DEBAJO del canto de la
       madera, o sea clavado dentro de la raíz. Un ave metida en su
       rama no se lee como posada: se lee como pegada por delante.

   El nuevo punto sale de recorrer la lámina columna por columna
   buscando canto ancho y poco inclinado. El mejor de todos está en
   x≈0.47, con un 8 % de apoyo a cada lado y prácticamente plano —pero
   cae 208 px por debajo del canto inferior de la pantalla, así que no
   sirve—. El mejor de los que SÍ caben es este: 2.7 % de apoyo a cada
   lado (casi el doble que antes) y el pie a ras del canto, hundido
   solo un 1.5 % para que la pata no flote sobre el filo.

   `GROSOR_RAMA` NO se remide con él. Es la referencia de tamaño del
   ave, no una medida de la madera: bajarlo al grosor exacto de esta
   columna la encogería un 14 %, y la visitante ya estuvo demasiado
   pequeña una vez (ver «no tiene protagonismo» en la nota del
   posadero). Queda como está, y queda dicho por qué. */
/* ── Y SE MUDA OTRA VEZ, AHORA POR LA PENDIENTE ────────────────────
   La lámina de agarre viene pintada con los dos pies a distinta
   altura, o sea con una pendiente propia: 0.102 de alto de diferencia
   sobre 0.136 de separación, que son 0.75 en pantalla. En la percha
   anterior (x 0.244) la raíz baja a 0.54, y esos veinte puntos de
   diferencia dejaban el pie de delante colgando por fuera del canto:
   se ve en el compilado, con la garra sobre el agua.

   No se fuerza la lámina —ni se rota el ave, que un cuerpo inclinado
   nueve grados se lee como que se cae—: se la lleva al tramo de raíz
   que TIENE esa pendiente. Medido columna por columna, x 0.204 baja a
   0.76 en pantalla, que es la de la lámina con dos centésimas de
   diferencia, y da 1.6 % de apoyo a cada lado — menos que el 2.7 % de
   antes, pero de sobra para unos pies que miden 0.027 de pantalla.

   El hundimiento baja de 0.015 a 0.005: aquel margen existía para que
   la planta plana no flotara sobre el filo, y una garra que se curva
   por detrás de la rama no lo necesita. */
const POSADERO_CERCA = [0.204, 0.256];
const GROSOR_RAMA = 0.076;

/* ── CÓMO CAE LA RAMA BAJO EL PIE ──────────────────────────────────
   Medido con el canto de la madera de dos columnas vecinas, en la
   percha donde está posada: 1.14 en unidades de LÁMINA. La lámina es
   1.5 veces más ancha que alta, así que en pantalla son 1.14 / 1.5 =
   0.76, o sea unos 37 grados bajando hacia la derecha.

   Cambió con la percha: el tramo anterior (x 0.244) bajaba a 0.54, y
   el ave se mudó a este porque es el que tiene la inclinación con la
   que está pintada la lámina de agarre. El recorte del pie de las
   otras seis poses tiene que seguir a la rama, no quedarse en la
   pendiente vieja.

   Lo usa `mascaraPie`. */
const PENDIENTE_RAMA = 0.76;

/* ── EL PIE SE MUERDE CON LA RAMA ──────────────────────────────────
   El dueño lo dijo después de arreglar la percha: los dedos siguen
   pareciendo de otra pieza. Y lo son — la lámina está pintada con los
   dedos EXTENDIDOS EN HORIZONTAL, como quien se posa en un suelo
   plano, y esta raíz baja 28 grados. Por eso el dedo de la izquierda
   queda enterrado en la madera y el de la derecha colgando sobre el
   agua: no hay ninguna posición en la que una línea horizontal apoye
   entera sobre una diagonal.

   Sin lámina nueva, lo que sí se puede es DEJAR DE PINTAR lo que la
   rama taparía. Es exactamente el recurso que ya usa la bandada para
   meterse en la copa (ver `ave.asoma`), y aquí va inclinado: el corte
   sigue la pendiente de la raíz, así que se come el dedo que se hunde
   en la madera y deja el que apoya. Lo que queda es una pata que
   entra en la rama en vez de una suela apoyada encima.

   Y va con un degradado corto, no con un corte: en esta pintura no
   hay un solo borde duro, y un pie rebanado por una recta se vería
   peor que el problema que viene a arreglar.

   El ángulo se escribe en el espacio de la LÁMINA, que para esta ave
   está espejado (`scaleX(-1)`): por eso la pendiente entra con el
   signo cambiado cuando mira a la derecha. La posición del corte a lo
   largo del degradado se proyecta a mano — CSS mide sus paradas sobre
   la línea del degradado, no sobre el alto de la caja. */
function mascaraPie(v, anchoPx, altoPx, espejada, alzaPx) {
  const s = espejada ? -PENDIENTE_RAMA : PENDIENTE_RAMA;
  const ang = 180 + Math.atan(s) * 180 / Math.PI;    // grados CSS
  const rad = ang * Math.PI / 180;
  const dx = Math.sin(rad), dy = -Math.cos(rad);     // dirección, y hacia abajo
  const L = Math.abs(anchoPx * dx) + Math.abs(altoPx * dy);
  /* Dónde cae el pie a lo largo de esa línea, en tanto por uno. */
  const px = v.pies[0] * anchoPx, py = v.pies[1] * altoPx;
  /* Y SIGUE A LA RAMA CUANDO EL AVE SE LEVANTA. En el amago el ave se
     alza hasta un 26 % de su alto sobre la rama; con el corte quieto
     se quedaría sin pies EN EL AIRE, que es peor que el problema de
     partida. La rama no se mueve, así que en el espacio de la lámina
     el corte baja exactamente lo que el ave sube. */
  const tPie = 0.5 + ((px - anchoPx / 2) * dx + (py - altoPx / 2) * dy) / L
             + (alzaPx * dy) / L;
  /* El corte pasa un pelo POR ENCIMA del punto de apoyo —los dedos
     empiezan ahí— y termina justo debajo. Dos números y nada más:
     `sube` es cuánto del dedo se come y `banda` lo suave que entra. */
  const sube = (0.020 * altoPx) / L;
  const banda = (0.030 * altoPx) / L;
  const dentro = Math.max(0, Math.min(1, tPie - sube));
  const fuera = Math.max(dentro + 0.001, Math.min(1, dentro + banda));
  return `linear-gradient(${ang.toFixed(1)}deg, #000 ${(dentro * 100).toFixed(1)}%,`
       + ` transparent ${(fuera * 100).toFixed(1)}%)`;
}

/* ── CUÁNTO DEL ÁRBOL QUEDA BAJO EL AGUA ────────────────────────────
   Una fracción del PROPIO ÁRBOL, no del alto de pantalla. El valor sale
   de la composición que ya estaba calibrada en escritorio —0.252 de
   pantalla sobre un árbol de 0.82— y va escrito como esa división para
   que se vea de dónde viene: no es un número nuevo, es el mismo de
   antes dicho en las unidades correctas.

   Lo consume `medidas()`. El porqué, largo, está allí. */
const SUMERGIDO = 0.252 / 0.82;

/* ── DÓNDE APOYA LA LÁMINA CERCANA ──────────────────────────────────
   `cercaCaja[2]` es su borde INFERIOR en uv (0 abajo de la pantalla).
   Estaba fijo en −0.34 y `encogeCerca()` no lo tocaba, así que al
   achicarse la lámina en una pantalla estrecha se quedaba clavada por
   el pie y todo lo que lleva encima bajaba con ella: la rama, y con la
   rama la garza protagonista.

   MEDIDO a 390×844: la percha caía en uv −0.0088, o sea 7 px POR DEBAJO
   del canto inferior de la pantalla. El ave salía cortada por el borde
   y encima del rótulo «Desliza». Eso es lo que en el encargo se llamó
   «la grulla del manglar cercano no tiene protagonismo»: no era que
   fuera pequeña — es que estaba medio fuera de cuadro.

   Se invierte el razonamiento, igual que ya se hizo con el horizonte
   («lo fija el texto, no el diseño»): no se fija dónde apoya la lámina
   y se mira dónde cae la percha, se fija DÓNDE TIENE QUE CAER LA PERCHA
   y de ahí sale dónde apoya la lámina.

   La percha quiere dos cosas:
   — Caer donde cae en escritorio (uv 0.212), que es el sitio medido y
     el que deja aire entre el ave y el canto de abajo.
   — Quedar claramente POR DEBAJO del horizonte, o el primer término
     deja de leerse como primer término. En escritorio son 0.128 del
     alto; aquí se le exige un mínimo de 0.105.
   En una ventana alta el horizonte sube y manda la segunda.

   `1 − POSADERO_CERCA[1]` es la distancia de la percha al pie de la
   lámina —la coordenada está medida DESDE ARRIBA— y se lee de la misma
   constante que usa `posaderoCercano()`, para que no puedan discrepar. */
function baseCerca(alto, horizonte) {
  const percha = Math.min(0.212, horizonte - 0.105);
  return percha - (1 - POSADERO_CERCA[1]) * alto;
}

/* ── Y POR DÓNDE ENTRA, POR LA MISMA RAZÓN ──────────────────────────
   `cercaCaja[0]` es el canto izquierdo de la lámina en fracción del
   ancho, y estaba fijo en −0.02 mientras la lámina se encogía. La
   percha se iba con ella: en escritorio caía en el 22 % del ancho y en
   un teléfono en el 57 %, o sea encima del manglar del fondo. Dos
   sujetos apilados en la misma vertical y la garza cercana recortada
   contra las raíces del árbol lejano, que es lo peor que le puede pasar
   a una silueta.

   EL −0.02 NO ERA UN NÚMERO ARBITRARIO Y ESTO LO DEMUESTRA: sustituyendo
   la ventana de escritorio en la fórmula de abajo sale −0.019. Era «la
   percha en el 22 % del ancho» escrito para una sola forma de ventana.
   Aquí se dice lo que quería decir, y entonces vale para todas.

   El 22 % es el sitio medido: deja el ave sobre agua abierta, con el
   flanco izquierdo del cuadro por delante y el árbol del fondo lejos
   por la derecha, que es la separación que hace que se lean como dos
   planos y no como un montón. */
const PERCHA_ANCHO = 0.22;
function xCerca(alto, aspLam, aspecto) {
  /* CON TECHO EN CERO, Y ESE TECHO NO ES UN DETALLE. Esta lámina es un
     fragmento que ENTRA POR LA ESQUINA: su canto izquierdo es un corte
     recto, no un final pintado, y el único sitio donde un corte recto
     no se ve es fuera de pantalla. En una ventana muy apaisada la
     fórmula lo empujaba a la derecha del cero —a 1920×1080 daba +0.005,
     o sea diez píxeles de agua vacía y luego el canto— así que se le
     pone tope. Cuando el tope manda, la percha se corre a la derecha de
     su 22 %, que es lo que ya pasaba antes y no molesta: en una ventana
     ancha sobra sitio entre los dos árboles. */
  return Math.min(-0.015,
                  PERCHA_ANCHO - (POSADERO_CERCA[0] * alto * aspLam) / aspecto);
}

/* ── LAS PERCHAS DE LA BANDADA ──────────────────────────────────────
   Sitios MEDIDOS sobre la lámina, no elegidos a ojo.

   ── Y REMEDIDAS, PORQUE EL ÁRBOL YA NO ERA EL MISMO ───────────────
   Esta tabla se midió sobre `manglar-lejos.webp`. Ese archivo LLEVA
   TIEMPO SIN PINTARSE: el manglar del fondo es `manglar-v2.webp` desde
   que se repintó la copa —lo dice la nota de `POSADERO`, que sí se
   remidió entonces— y ni siquiera se publica ya (`prune-dist` no lo
   copia a `dist/`, porque nadie lo pide).

   O sea que las aves se posaban sobre el perfil de un árbol que no
   estaba delante. Medido columna a columna sobre la lámina que hoy se
   pinta, el desvío de la tabla vieja:

     x 0.111 → la copa está 0.182 MÁS ABAJO   ← el ave, en el cielo
     x 0.261 → 0.093 más abajo
     x 0.339 → 0.061 más abajo
     x 0.516 → 0.032 más arriba (el ave, dentro de la hoja)
     el resto, por debajo de 0.03

   Un ave a 0.182 de la lámina por encima de su rama es un ave de pie
   sobre el aire, y en la portada se veía así: la de la izquierda del
   árbol flotaba en el cielo con las patas colgando. No hay pintura ni
   veladura que arregle eso — un ave que no toca nada se lee como una
   calcomanía por mucho grano de papel que se le ponga encima.

   La copa nueva además es más estrecha y su flanco izquierdo cae a
   pico: entre x 0.10 y 0.21 la silueta baja medio alto de lámina en un
   3 % de ancho y la masa de debajo no llega a 0.5 de solidez. Ahí no
   hay percha, y por eso la bandada perdió las dos de la izquierda y
   pasó de once sitios a ocho. Menos aves y todas posadas es mejor
   trato que once con dos en el aire.

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
   entre perchas. De 260 columnas pasaron 112, y repartidas quedan estas
   ocho. La cima de la copa está en y = 0.038, x = 0.405.

   Los huecos —entre 0.34 y 0.47, y entre 0.56 y 0.67— no son olvidos:
   en el primero está reservada la percha del ave que llega, y en el
   segundo la copa cae a pico y ninguna columna pasó la prueba de
   pendiente. */
const PERCHAS = [
  [0.259, 0.191],   // solidez 0.90 · pendiente 0.024
  [0.336, 0.093],   // solidez 0.82 · pendiente 0.040
  [0.467, 0.058],   // solidez 1.00 · pendiente 0.012 — junto a la cima
  [0.556, 0.081],   // solidez 0.92 · pendiente 0.036
  [0.668, 0.169],   // solidez 0.99 · pendiente 0.026
  [0.741, 0.156],   // solidez 0.78 · pendiente 0.034
  [0.830, 0.257],   // solidez 0.99 · pendiente 0.008
  [0.896, 0.269],   // solidez 0.77 · pendiente 0.040
];
/* Las perchas a menos de 5.8 % de x = 0.40 salieron de la medición y NO
   están en la lista: ahí se posa la garza que llega (`POSADERO`), y dos
   aves en el mismo sitio se solapan. El acontecimiento de la portada
   tiene preferencia sobre la bandada. */

/* CUÁNTAS CABEN, Y POR QUÉ NO ES UN DIEZ REDONDO.

   Se deriva de las perchas medidas, y son dos números según de qué
   esté hecha la bandada.

   SIN RED la bandada es paisaje y DEJA DOS PERCHAS LIBRES: en esas se
   posan las garzas de presencia —ver `colocarPresentes`—, y con ocho
   perchas una bandada de ocho dejaba a la primera persona que llegara
   sin rama, o sea invisible. El paisaje cede sitio a la gente.

   CON RED no hay nada que reservar: las garzas de presencia no se
   ponen (serían la misma persona dos veces) y la bandada YA es la
   gente. Reservar dos ramas ahí sería dejar fuera a dos sesiones que
   existen de verdad, que es el error contrario y peor. La base
   reparte exactamente estas ocho — ver esquema-bandada.sql.

   Va DEBAJO de `PERCHAS` a propósito: un `const` existe a partir de su
   línea, no desde el principio del ámbito, y este archivo ya pagó ese
   fallo una vez (ver la nota de `despegue`). */
const BANDADA_MAX = bandadaEnRed ? PERCHAS.length : Math.max(2, PERCHAS.length - 2);

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
    /* Entra por arriba y algo a la IZQUIERDA: cae en diagonal corta, no
       en vertical. Una caida perfectamente vertical lee como un objeto
       soltado, no como un ave que se posa.

       ── Y ES LA IZQUIERDA, NO LA DERECHA, Y ESO NO ES UN CAPRICHO ──
       Entraba por la derecha, o sea volando hacia la izquierda, y se
       quedaba posada mirando a la derecha —al manglar y al mar, que es
       donde el cuadro la quiere—. Entre esas dos cosas hay un volteo, y
       el volteo estaba escondido dentro del cruce de laminas del
       aterrizaje con la idea de que se leyera como el ave
       acomodandose. No se lee asi: el dueno lo vio a la primera y lo
       dijo con la palabra exacta — «aterriza al reves».

       Un ave que se posa no se da la vuelta al tocar la rama. Llega
       mirando a donde iba y se queda como llego. Asi que el arreglo no
       esta en disimular mejor el volteo: esta en que no haya volteo. Se
       entra por el lado que hace que la direccion del vuelo y la
       postura de la posada sean LA MISMA — el izquierdo, porque la
       percha esta en el 22 % del ancho y el cuadro (manglar, agua,
       horizonte) queda a su derecha.

       El sentido lo sigue sacando `animarCaida` del propio recorrido,
       de `entraX` a `pieX`: aqui no se declara ningun espejo, solo por
       donde entra. Si algun dia la percha se muda al otro lado del
       cuadro, basta cambiar este signo y todo lo demas se entera solo. */
    visita.entraX = c.x - w * 0.085;
    visita.entraY = -h * 0.14;
    visita.h0 = h;
  }

  /* Y las de presencia, sobre las perchas que le quedaron libres a la
     bandada. Va aquí dentro y no en su propio oyente porque necesita
     `usadas`: si se colocaran por su cuenta se posarían encima de una
     garza del manglar, y dos aves en la misma rama se leen como una
     lámina duplicada. */
  colocarPresentes(usadas);
}

/* Coloca las garzas de presencia. Se llama desde `colocarGarzas` con el
   reparto de perchas ya hecho, y también sola cuando alguien entra o
   sale sin que cambie nada más — ahí se recalcula el reparto entero,
   que es barato y evita tener dos caminos que puedan discrepar. */
function colocarPresentes(usadasFuera) {
  if (!vuelo || !vuelo.w || !presentes.size) return;
  const w = vuelo.w, h = vuelo.h;
  const cajaM = mar.cajaManglar();
  const FACTOR_MAX = 1.285;
  const AIRE = 8;

  const usadas = usadasFuera || new Set(
    bandada.filter((a) => !a.oculta && !a.ida).map((a) => a.perchaIdx));

  /* Se reparten en orden de llegada, y siempre el mismo orden: quien
     lleva más rato conserva su rama cuando entra alguien nuevo. Una
     bandada que se recoloca entera cada vez que llega alguien no se lee
     como gente llegando, se lee como un fallo. */
  for (const ave of presentes.values()) {
    let puesta = false;
    /* Si ya tenía percha y sigue libre, se queda con ella. */
    const orden = ave.perchaIdx !== undefined
      ? [ave.perchaIdx, ...PERCHAS.map((_, i) => i)]
      : PERCHAS.map((_, i) => i);

    for (const idx of orden) {
      if (usadas.has(idx) && idx !== ave.perchaIdx) continue;
      const q = calcularPosadero(cajaM, w, h, vuelo.linea,
                                 [PERCHAS[idx][0], PERCHAS[idx][1]]);
      /* Del tamaño de una de la bandada: están en el mismo árbol y a la
         misma distancia, así que miden lo mismo. Que sean personas no
         las hace más grandes — eso lo dice el pico, no la escala. */
      const alto = q.altoManglar * 0.105;
      if (q.y - alto * FACTOR_MAX / VUELO.posada.altoTinta < AIRE) continue;
      usadas.add(idx);
      ave.perchaIdx = idx;
      ave.pieX = q.x;
      ave.pieY = q.y;
      ave.alto = alto;
      const altura = 1 - PERCHAS[idx][1];
      ave.vela = VIENTO_COPA * altura * altura * q.altoManglar * cajaM[3];
      /* Entra desde arriba y desde el lado por el que hay cielo: si
         cayera en vertical sobre su percha parecería soltada. */
      ave.entraX = q.x + w * 0.10;
      ave.entraY = -h * 0.16;
      ave.h0 = h;
      puesta = true;
      break;
    }
    /* Sin percha libre en esta ventana no se pinta. Se apaga entera en
       vez de aparecer flotando en el aire. */
    if (!puesta) {
      ave.alto = 0;
      for (const el of Object.values(ave.capas)) el.style.opacity = '0';
      ave.tinte?.apagar();
      pico.registrar(ave.id, null);
    }
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
      ? (entra < 1 ? [[CICLO[iA], saleFundido(entra)], [aterA, entra]]
         : mezcla > 0 ? [[aterA, saleFundido(mezcla)], ['posada', mezcla]]
         : aterM > 0 && aterA !== aterB
           ? [[aterA, saleFundido(aterM)], [aterB, aterM]]
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
/* ── Y SIRVE PARA LAS DOS CLASES DE AVE CON NOMBRE ────────────────
   Era `animarVisita(t, paralaje)` y leía la `visita` del módulo. Ahora
   recibe el ave, porque hay más de una que cae: la de quien mira, que
   se posa en la rama de delante, y una por cada OTRA SESIÓN que tenga
   Galene abierto, que se posan en el manglar del fondo (ver
   `sincronizarPresencia`).

   Lo que cambia entre ellas son cuatro datos que vienen en el propio
   ave y no en esta función: cuándo entra (`t0`), si mira a la derecha
   (`espeja`), cuánto paralaje le toca según su plano (`plano`), y qué
   pico y qué frase lleva (`sena`). El gesto es el mismo para todas —
   una caída y luego estar— porque es el mismo suceso: alguien llegó. */
function animarCaida(ave, t, paralaje) {
  const visita = ave;
  if (!visita || !visita.alto || visita.t0 === null || visita.t0 === undefined) return;
  t -= visita.t0;
  const p0 = CAIDA_ESPERA, p1 = CAIDA_ESPERA + CAIDA_DURA;

  if (t < p0) {                                   // todavia no ha entrado
    for (const el of Object.values(visita.capas))
      if (el.style.opacity !== '0') el.style.opacity = '0';
    if (visita.charco && visita.charco.style.opacity !== '0')
      visita.charco.style.opacity = '0';
    visita.tinte?.apagar();
    pico.registrar(visita.id, null);
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
    if (i === CAIDA.length - 1) {
      siguiente = visita.reposo?.base || 'posada';
      mezcla = suave3(Math.min(1, dentro / 0.8));
    }
  } else {
    ({ visibles: posadas, alza } = vidaEnReposo(visita.reposo, t));
    y -= alza * visita.alto;
  }

  /* El mismo paralaje que el plano en el que está posada. La de la rama
     de delante va con el fragmento cercano del shader (1.35, el triple
     que el manglar lejano); las que se posan en la copa del fondo van
     con el manglar (0.45), que es el factor que ya usa la bandada. Con
     cualquier otro se resbalan de su rama al mover el puntero, que es
     el error que este archivo ya pagó dos veces. */
  x -= paralaje * (visita.plano ?? 1.35) * visita.h0;
  /* Y la mece su rama. Solo cuando ya está posada: durante la caída
     manda la caída. Sumar en `y` la baja en pantalla, que es a donde se
     va la lámina cuando el shader le suma a su coordenada vertical. */
  if (t >= p1) y += viento(t) * visita.vela;

  const visibles = posadas
    || ((mezcla > 0 && siguiente && siguiente !== clave)
      ? [[clave, saleFundido(mezcla)], [siguiente, mezcla]] : [[clave, 1]]);

  /* ── MIRA HACIA DONDE VUELA, Y NO CAMBIA NUNCA ──────────────────
     Las láminas están pintadas mirando a la izquierda, así que
     `scaleX(-1)` es «mira a la derecha». Aquí estuvo fijo —el ave
     miraba a la derecha aunque cruzara la pantalla hacia la izquierda,
     «vuela con dirección adelante pero con movimiento hacia atrás»— y
     después estuvo PARTIDO: el recorrido mandaba en el aire y el cuadro
     mandaba en la posada, con el volteo escondido dentro del cruce de
     láminas del aterrizaje. Lo segundo tampoco se lee como el ave
     acomodándose; el dueño lo dijo con la palabra exacta: «aterriza al
     revés».

     Ahora el sentido sale del propio recorrido —de `entraX` a `pieX`—
     y se calcula UNA vez para toda la animación, porque el recorrido no
     cambia de signo a mitad: ni parpadeo en el cruce, ni volteo seco al
     posarse, ni una postura final que contradiga el vuelo que se acaba
     de ver. El ave llega mirando a donde iba y se queda como llegó.

     Que además acabe mirando al manglar y al mar —que es lo que el
     cuadro quiere— no lo arregla esta línea: lo arregla POR DÓNDE
     ENTRA, y eso se decide en `colocarGarzas`, donde está la percha y
     se sabe qué lado del cuadro es el de dentro.

     El origen de transformación ya está en los PIES, de modo que el
     espejo gira alrededor de ellos y el ave no se mueve de la rama: si
     girase sobre su centro, saltaría media envergadura al voltearse.

     Las de presencia NO se espejan nunca: están en la copa del fondo,
     con la bandada, y ahí todas miran al mismo lado. Una sola vuelta
     del revés en mitad del dormidero se ve como un error de montaje. */
  const haciaLaDerecha = (visita.pieX - visita.entraX) >= 0;
  const espejo = visita.espeja === false ? ''
    : (haciaLaDerecha ? ' scaleX(-1)' : '');

  /* Lo que hace falta para el pico teñido y para el globo: cuál es la
     lámina que de verdad se está viendo y dónde cayó en pantalla. Se
     queda con la de más peso del cruce. */
  let dom = null;

  for (const [k, el] of Object.entries(visita.capas)) {
    const enc = visibles.find(([c]) => c === k);
    if (!enc) { if (el.style.opacity !== '0') el.style.opacity = '0'; continue; }
    const v = VUELO[k];
    const altoPx = visita.alto * (v.factor || 1) / v.altoTinta;
    const anchoPx = altoPx * v.aspecto;
    const izq = x - v.pies[0] * anchoPx;
    const arr = y - v.pies[1] * altoPx;
    el.style.opacity = enc[1].toFixed(3);
    el.style.width = anchoPx.toFixed(1) + 'px';
    el.style.transform =
      `translate3d(${izq.toFixed(1)}px, ${arr.toFixed(1)}px, 0)${espejo}`;
    /* El pie se muerde con la rama SOLO cuando ya está posada: en el
       aire no hay rama que la tape. La cadena se guarda por lámina
       porque no cambia mientras no cambie de tamaño, y escribir una
       máscara en cada cuadro es repintar el filtro en cada cuadro. */
    if (visita.plano == null || visita.plano === 1.35) {
      /* El alza se redondea a píxel entero: durante el amago cambia en
         cada cuadro, y reescribir la máscara sesenta veces por segundo
         es repintar el filtro sesenta veces por segundo. */
      /* La lámina de agarre no se muerde: sus dedos ya están pintados
         curvándose sobre la rama, y recortarlos sería borrar justo lo
         que se encargó. El corte se queda para las otras seis, que
         siguen teniendo el pie plano. */
      const m = t >= p1 && k !== 'agarre'
        ? mascaraPie(v, anchoPx, altoPx, espejo !== '',
                     Math.round(alza * visita.alto))
        : 'none';
      if (visita.mascaras?.[k] !== m) {
        el.style.maskImage = m;
        el.style.webkitMaskImage = m;
        (visita.mascaras ||= {})[k] = m;
      }
    }
    if (!dom || enc[1] > dom.peso) {
      dom = { clave: k, peso: enc[1], anchoPx, altoPx, izq, arr,
              origen: el.style.transformOrigin };
    }
  }

  /* ── EL CHARCO SIGUE A LOS PIES ─────────────────────────────────
     Solo existe posada: cae con ella a cero durante el vuelo y se
     derrama en un segundo al aterrizar, como se asienta una aguada.
     `x`/`y` son exactamente los pies, que es donde un cuerpo toca. */
  if (visita.charco) {
    const anchoCharco = visita.alto * 1.02;
    const altoCharco = anchoCharco * 0.20;
    const opCharco = t < p1 ? 0 : Math.min(0.8, (t - p1) / 1.4);
    visita.charco.style.width = anchoCharco.toFixed(1) + 'px';
    visita.charco.style.height = altoCharco.toFixed(1) + 'px';
    visita.charco.style.transform =
      `translate3d(${(x - anchoCharco / 2).toFixed(1)}px, ${(y - altoCharco * 0.42).toFixed(1)}px, 0)`;
    visita.charco.style.opacity = opCharco.toFixed(3);
  }

  /* ── LA SEÑA: EL PICO Y LA FRASE ────────────────────────────────
     Solo la llevan las aves con identidad, y solo si quien las trae
     eligió algo. Sin elección no hay tinte y no hay globo: la garza es
     exactamente la que era antes de que existiera este módulo. */
  if (dom && visita.tinte) {
    visita.tinte.poner(dom.clave, visita.sena?.pico || null,
                       dom.anchoPx, dom.altoPx, dom.izq, dom.arr,
                       espejo, dom.origen);
  }
  if (dom) {
    pico.registrar(visita.id, visita.sena?.frase
      ? { x: dom.izq, y: dom.arr, w: dom.anchoPx, h: dom.altoPx,
          frase: visita.sena.frase }
      : null);
  }
}

/* La de quien mira. Su reloj es el del contenido: entra cuando la
   página se ha asentado, no cuando llega el shader. */
function animarVisita(t, paralaje) {
  if (!visita || inicioContenido === null) return;
  visita.t0 = inicioContenido;
  animarCaida(visita, t, paralaje);
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

/* ═══ LA GARZA DE QUIEN MIRA, Y LAS DE QUIEN MÁS ESTÉ ═════════════
   Tres enchufes y ninguna lógica: el panel se monta sobre el marcado
   que ya existe, el globo se crea una vez, y cuando cambia cualquiera
   de las dos cosas —tu elección o quién está— se repinta.

   Va aquí abajo, después de que existan `visita` y `presentes`, y
   ANTES de arrancar el mar: así el primer cuadro ya sale con el pico
   puesto en vez de teñirlo un instante después. */
function repintarSena() {
  const p = miPerfil();
  /* Solo se tiñe si se eligió algo. Sin panel tocado, `sena` va vacía y
     el ave es exactamente la de antes de que existiera este módulo. */
  if (visita) visita.sena = p.elegido ? { pico: p.pico, frase: p.frase } : { pico: null, frase: null };
}

if (contenedor) {
  pico.montarGlobo();
  alCambiarGarza(repintarSena);
  repintarSena();
  presencia.alCambiar(sincronizarPresencia);
  sincronizarPresencia();
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

/* Y este NO es de desarrollo: las pruebas E2E corren contra el sitio
   compilado y necesitan poder preguntar cuántas garzas de presencia hay
   posadas sin contar píxeles. No expone nada que no esté ya en
   pantalla. */
window.__garzas = {
  presentes: () => [...presentes.values()].map((a) => ({
    id: a.id, puesta: a.alto > 0, pico: a.sena?.pico || null, frase: a.sena?.frase || null,
  })),
  mia: () => (visita ? { pico: visita.sena?.pico || null, frase: visita.sena?.frase || null } : null),
  /* De dónde salen las garzas del árbol. Con `enRed` cierto la bandada
     son filas de Supabase y las de `presencia.js` NO se ponen —serían
     la misma persona dos veces—, así que las pruebas que miden el
     camino de BroadcastChannel tienen que saber cuál de los dos mundos
     están mirando en vez de fallar sin explicar por qué. */
  enRed: bandadaEnRed,
};

/* ── ARRANQUE ──────────────────────────────────────────────────────
   Al final: el mar es lo último que se enciende, después de que los
   reflejos, la hora y las garzas ya existen. */
/* La escena es la misma en escritorio y móvil. El perfil de arriba
   reduce resolución, láminas y cadencia cuando hace falta, pero nunca
   sustituye el cielo, el agua o las garzas por otra composición. */
/* ── LA CAÍDA AL RESPALDO ──────────────────────────────────────────
   Una sola puerta para las dos formas de quedarse sin shader, y esa
   unidad es el punto: el respaldo CSS es una pintura completa —cielo
   de la hora, agua, horizonte al 74 %, medido en portada.spec.js— y
   tiene que verse igual se llegue por donde se llegue.

   Quitar el lienzo no es un detalle de limpieza: es lo que descubre el
   respaldo, que está debajo. Mientras el <canvas> siga en el DOM, tapa
   la pintura de CSS con lo que tenga dentro — y lo que tiene dentro un
   contexto perdido es NEGRO. */
function caerAlRespaldo(motivo) {
  lienzo.remove();                 // el respaldo CSS ya es un mar
  hero?.setAttribute('data-mar', 'sin-webgl');
  hero?.setAttribute('data-mar-motivo', motivo);
  document.documentElement.classList.add('hero-estatico');
  dispatchEvent(new CustomEvent('galene:hero-listo', { detail: { modo: 'css', motivo } }));
  /* ── Y SE DICE EN VOZ ALTA SI ALGUIEN LO PIDIÓ ──────────────────
     `?mar=diag` escribe el motivo en la nota del hero. No hay consola
     en un teléfono ajeno, y toda la ronda anterior se fue en no poder
     distinguir «el remedio no sirve» de «el remedio no se encendió».
     Esto contesta la pregunta en un vistazo y no existe sin el
     parámetro. */
  if (DIAG_MAR && nota) nota.textContent = `mar: sin webgl · motivo: ${motivo}`;
}

/* ── ARRANQUE ──────────────────────────────────────────────────────
   Al final: el mar es lo último que se enciende, después de que los
   reflejos, la hora y las garzas ya existen. */
/* La escena es la misma en escritorio y móvil. El perfil de arriba
   reduce resolución, láminas y cadencia cuando hace falta, pero nunca
   sustituye el cielo, el agua o las garzas por otra composición. */
const mar = crear(lienzo);
if (!mar) {
  caerAlRespaldo('sin-webgl');
} else {
  /* ── Y SI EL CONTEXTO SE PIERDE A MITAD ─────────────────────────
     Esto pasa de verdad y se vio en producción: la pestaña se queda en
     segundo plano un rato, el navegador recupera memoria de vídeo, y
     al volver el lienzo está EN NEGRO. Las garzas seguían encima
     —viven en el DOM, no en el shader—, así que quedaban tres aves
     flotando en un vacío negro a los lados de la página. Peor que no
     tener pintura: una pintura rota se lee como una avería.

     `preventDefault` es obligatorio o el navegador da el contexto por
     muerto sin apelación. Aun así no se espera a que vuelva: se cae al
     respaldo AHORA. Recuperar un contexto pide recompilar el shader y
     volver a subir catorce láminas, y hacerlo mientras alguien mira es
     un parpadeo largo en la mitad de la página; el respaldo CSS ya es
     un cuadro y aparece en el mismo fotograma.

     `once` porque después del primero ya no hay lienzo al que
     escuchar. */
  lienzo.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    marPerdido = true;
    console.info('[mar] contexto WebGL perdido: se cae al respaldo CSS');
    caerAlRespaldo('contexto-perdido');
  }, { once: true });
  arrancar(mar);
}
