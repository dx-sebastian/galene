/* ═══════════════════════════════════════════════════════════════════
   desplazamiento.js — EL DESCENSO.

   Este módulo es del scroll de ABAJO. No conoce el hero, no lee el
   mar y no toca una sola propiedad de `#mar`: si mañana la portada se
   reescribe entera, aquí no se entera nadie. Lo que gobierna es lo que
   pasa desde que la hoja empieza —el canto de papel— hasta el final de
   la página.

   Un solo gesto, y es este: CADA COSA LLEGA MOJADA Y SE SECA.

   La página de arriba es una acuarela y la de abajo era un documento.
   El vocabulario que las cose ya lo eligió el sitio en `entrada.js`: el
   mundo no aparece con un fundido —un `opacity` de 0 a 1 es una
   cortina y se lee como carga—, aparece DESENFOCADO Y LAVADO y se va
   asentando, que es lo que hace una aguada al secarse. Aquí se aplica
   lo mismo a cada bloque que entra: llega sin filo y a media tinta, y
   para cuando se puede leer ya tiene canto.

   ── LAS TRES CONDICIONES QUE LO HACEN SEGURO ────────────────────────

   1 · SIN JAVASCRIPT NO SE ESCRIBE NADA, y por tanto todo se ve. No
       hay clase que poner ni estado inicial que deshacer: este módulo
       solo escribe estilos en línea sobre los elementos que están
       dentro de su ventana de llegada, y si no corre nunca, ninguno los
       tiene. Es la misma garantía que `decidir.js` consigue con
       `.decidir--vivo`, pero sin necesitar la clase — aquí el estado
       por defecto del CSS ya es el bueno.

   2 · EL SECADO TERMINA ANTES DE LA ZONA DE LECTURA. La ventana va
       desde que el canto superior del bloque toca el borde inferior de
       la pantalla hasta que ha subido hasta el 82 % de la altura: o
       sea, todo ocurre en la franja baja donde nadie lee. Un bloque
       nunca se queda a medio secar delante de los ojos de alguien que
       se paró a leerlo, ni aunque baje muy despacio. Esa es la razón
       del 0.82 y no un ajuste de gusto: es el único número que impide
       que este efecto le cueste una palabra a nadie.

   3 · ATADO AL SCROLL, NO A UN RELOJ, así que se DESHACE al subir.
       Quien vuelve arriba encuentra la página como la dejó, no una
       animación ya gastada. Y al llegar a 1 se BORRAN las tres
       propiedades en vez de escribir los valores neutros: un `filter`
       encendido —aunque valga `blur(0)`— obliga al navegador a
       componer ese bloque aparte para siempre, y aquí hay diez.

   ── CÓMO SE MIDE, QUE ES LO QUE YA FALLÓ UNA VEZ EN ESTE REPO ───────

   Con `offsetTop`, subiendo por la cadena de `offsetParent`, y NO con
   `getBoundingClientRect`. La razón está escrita en `paralaje.js`: el
   rectángulo incluye la transformación propia del elemento, así que
   medir un bloque al que este mismo módulo le acaba de poner 20 px es
   medirse a sí mismo — la entrada se alimenta de su propia salida.
   Allí se resolvió restando lo aplicado; aquí no hace falta ningún lazo
   porque `offsetTop` es geometría de MAQUETA y las transformaciones no
   existen para él.

   El regalo de propina es que la medida solo hay que tomarla cuando la
   maqueta cambia, no cada cuadro: al cargar, al cambiar el tamaño de la
   ventana, y cuando la sección cambia de alto sola —el mapa que carga
   en diferido, el reloj que escribe su resultado, un `<details>` que se
   abre—. De eso se encarga un `ResizeObserver`, que es el instrumento
   exacto para esa pregunta. Cero lecturas de maqueta por cuadro.
   ═══════════════════════════════════════════════════════════════════ */

import { viewportHeight } from './viewport.js';

const quieto  = matchMedia('(prefers-reduced-motion: reduce)');

/* DOS NOMBRES PARA LA MISMA COSA: `#herramientas` es la hoja de la
   portada, y `[data-seccion-hoja]` es el ancla genérica de las páginas
   que llevan hoja pero no llevan hero —la comunidad—. Es el MISMO
   atributo que busca `paralaje.js`, a propósito: son dos gestos sobre la
   misma hoja, y con un atributo para cada uno acabaría habiendo una
   página con el descuelgue de las aguadas y sin el secado, sin que
   nadie lo hubiera decidido. */
const seccion = document.getElementById('herramientas') ||
                document.querySelector('[data-seccion-hoja]');

/* QUIÉN SE SECA. Solo hijos directos de la sección, más las cuatro
   puertas, que son hermanas dentro de su rejilla y llegan a alturas
   distintas en móvil.

   `.decidir` NO está, y no es un olvido: esa sección tiene su propio
   tiempo —`decidir.js` la recorre pegada durante 300 vh— y meterle un
   velo de entrada por encima sería contarle el mismo momento dos veces
   con dos relojes distintos, que es exactamente la trampa que este
   proyecto ya se tragó con el ave.

   Y NO HAY ESCALONADO POR ÍNDICE. Dos puertas que están a la misma
   altura entran a la vez, porque están a la misma altura; escalonarlas
   por su orden en el DOM es el gesto de plantilla más reconocible que
   existe. Cada elemento entra por DÓNDE ESTÁ, y nada más. */
/* Y LOS DE LA COMUNIDAD. Van en la misma lista y no en un módulo
   aparte porque el gesto es idéntico —lo que entra, entra mojado— y
   duplicarlo sería tener dos secados que hay que mantener a la par. Los
   selectores de una página no casan nada en la otra: `:scope` los ata a
   la sección, y cada página solo tiene la suya.

   Los hilos entran UNO A UNO (`.hilos__item`) y no la lista de golpe:
   son diez tarjetas repartidas por doce mil píxeles de página, y velar
   el bloque entero dejaría el último hilo secándose cuando el primero
   ya se leyó hace rato. Cada uno entra por dónde está, que es la regla
   de este módulo. */
const SUJETOS = ':scope > .cabecera, :scope > .hoja, ' +
                ':scope > .bloque, :scope > .mapa-herramientas, ' +
                ':scope > .puertas > .puerta, ' +
                ':scope > .comunidad__cabecera, :scope > .mando, ' +
                ':scope > .escribir, :scope > .hilos > .hilos__item, ' +
                ':scope > .comunidad__pie';

/* ── Los cinco números, todos juntos y todos explicados ─────────────
   ENTRA / FIN son la ventana, en alturas de pantalla: de 1.00 (el canto
   toca el borde de abajo) a 0.82 (subió un 18 %). Ver la condición 2.
   ALZA es cuánto sube al entrar. Veinte píxeles, y el techo está
   argumentado en paralaje.js para la sección entera: pasados los 40 el
   texto se lee subiendo, y un texto que se lee subiendo es una
   plantilla. Aquí baja aún más porque son diez bloques, no uno.
   VELO es la tinta de partida: 0.45, la misma zona que el 0.55 del
   secado del mundo en `entrada.js`.
   FILO es el desenfoque de partida. 1.1 px sobre un cuerpo de 18 px es
   un 6 % de la altura de x: se lee como aguada sin filo, no como texto
   borroso — y de todas formas se ha ido antes de que se pueda leer. */
const ENTRA = 1.00;
const FIN   = 0.82;
const ALZA  = 20;
const VELO  = 0.45;
const FILO  = 1.1;

if (seccion) arrancar();

function arrancar() {
  /* Cada sujeto guarda su sitio en el documento (`y`) y lo último que
     se le escribió (`p`), para no tocar el DOM cuando no cambió nada. */
  let sujetos = [];
  let pedido = false;

  /* La posición de un elemento en el documento, inmune a cualquier
     transformación puesta por este módulo o por paralaje.js. Se suma
     hacia arriba porque `offsetTop` es relativo al `offsetParent`, no
     al documento. (Ignora los bordes de los ancestros posicionados;
     aquí no hay ninguno con borde, y si algún día lo hubiera el error
     sería de píxeles, no de comportamiento.) */
  function topDocumento(el) {
    let y = 0;
    for (let n = el; n; n = n.offsetParent) y += n.offsetTop;
    return y;
  }

  function recoger() {
    sujetos = [...seccion.querySelectorAll(SUJETOS)]
      .map((el) => ({ el, y: topDocumento(el), p: -1 }));
  }

  function remedir() {
    for (const s of sujetos) s.y = topDocumento(s.el);
  }

  const suave3 = (p) => p * p * (3 - 2 * p);

  function escribir(el, p) {
    /* Seco del todo: se borra la huella entera. Ver condición 3. */
    if (p >= 1) {
      el.style.translate = '';
      el.style.opacity   = '';
      el.style.filter    = '';
      return;
    }
    const q = suave3(p);
    el.style.translate = `0px ${((1 - q) * ALZA).toFixed(1)}px`;
    el.style.opacity   = (VELO + q * (1 - VELO)).toFixed(3);
    el.style.filter    = `blur(${((1 - q) * FILO).toFixed(2)}px)`;
  }

  /* ── UN SALTO NO ES UN SCROLL ─────────────────────────────────────
     Los anclajes de la barra («Información», «Recursos») aterrizan en
     seco a miles de píxeles, y ahí las medidas tomadas al cargar pueden
     venir de una sección que `content-visibility: auto` tenía sin
     desplegar: el bloque bajo el dedo se quedaba MOJADO —0.45 de velo y
     su desenfoque— sin que ningún scroll posterior lo curara, porque la
     altura de la sección no cambia y el ResizeObserver no tiene nada
     que observar. Visto en el teléfono, en el botón que pide que
     alguien venga por ti: el peor sitio posible para un velo.

     La cura cuesta una resta: si entre un cuadro y el siguiente el
     scroll se movió más de una pantalla, eso no fue un pulgar — fue un
     salto, y después de un salto no se pinta con medidas viejas. Se
     remide y ya. En scroll normal la rama no entra nunca. */
  let scrollPrevio = scrollY;

  function pintar() {
    pedido = false;
    if (Math.abs(scrollY - scrollPrevio) > viewportHeight()) remedir();
    scrollPrevio = scrollY;
    const alto   = viewportHeight();
    const inicio = alto * ENTRA;
    const largo  = Math.max(1, alto * (ENTRA - FIN));
    for (const s of sujetos) {
      const y = s.y - scrollY;              // altura en pantalla
      let p = (inicio - y) / largo;
      p = p < 0 ? 0 : p > 1 ? 1 : p;
      /* Escritura perezosa. El redondeo a tres decimales es el mismo
         que se escribe: si el valor escrito no va a cambiar, no se
         toca el DOM. */
      if (Math.abs(p - s.p) < 0.001 && !(p >= 1 && s.p < 1)) continue;
      s.p = p;
      escribir(s.el, p);
    }
  }

  /* rAF por evento, no bucle continuo — el mismo patrón que decidir.js:
     mientras nadie se mueva, este módulo no gasta un solo cuadro. */
  const marcar = () => {
    if (pedido || quieto.matches) return;
    pedido = true;
    requestAnimationFrame(pintar);
  };

  function apagar() {
    for (const s of sujetos) {
      s.el.style.translate = '';
      s.el.style.opacity   = '';
      s.el.style.filter    = '';
      s.p = -1;
    }
  }

  /* LA SECCIÓN CAMBIA DE ALTO SOLA y hay que volver a medir cuando lo
     hace: el mapa carga en diferido, el reloj escribe su resultado, las
     fuentes se despliegan. Sin esto, todo lo que hay debajo de un
     bloque que creció se seca en el sitio equivocado. */
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => { remedir(); marcar(); }).observe(seccion);
  }

  addEventListener('scroll', marcar, { passive: true });
  addEventListener('resize', () => { remedir(); marcar(); }, { passive: true });
  addEventListener('galene:viewportresize', () => { remedir(); marcar(); }, { passive: true });
  /* Las láminas de fondo y la tipografía llegan después del primer
     cuadro y mueven la maqueta hacia abajo. */
  addEventListener('load', () => { remedir(); marcar(); });

  quieto.addEventListener('change', () => {
    if (quieto.matches) apagar();
    else { remedir(); marcar(); }
  });

  recoger();
  if (!quieto.matches) pintar();

  /* Asidero de auditoría, solo en desarrollo — el mismo patrón que
     __mar y __plx. `estado()` devuelve el avance de cada sujeto para
     poder comprobar que ninguno se queda a medias dentro de la zona de
     lectura, que es la única propiedad que este módulo promete. */
  if (import.meta.env.DEV) {
    window.__scr = {
      pintar, apagar, remedir,
      estado: () => sujetos.map((s) => ({
        id: s.el.id || s.el.className, y: s.y, p: +s.p.toFixed(3),
        enPantalla: +((s.y - scrollY) / viewportHeight()).toFixed(3),
      })),
    };
  }
}
