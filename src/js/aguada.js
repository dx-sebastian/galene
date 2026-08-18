/* ═══════════════════════════════════════════════════════════════════
   aguada.js — LA MANCHA QUE SIGUE AL RATÓN.

   ── QUÉ ES, Y QUÉ NO ES ───────────────────────────────────────────
   NO es un foco. Un foco es una luz que se mueve con el cursor a la
   misma velocidad que el cursor, y eso pertenece a otra clase de
   sitio: dice «esto es una interfaz» justo cuando este proyecto está
   intentando decir «esto es una acuarela».

   Lo que hace esto es lo que hace el agua sobre papel: la pigmentación
   se acumula donde se apoya el pincel, se EXTIENDE con retraso, y no
   llega nunca a tener un borde limpio. Tres propiedades, y las tres
   son medibles en el resultado:

     1 · LLEGA TARDE. El charco persigue al puntero con unos 400 ms de
         retraso. No es pereza: un charco que va exactamente donde va
         el cursor se lee como un cursor, y uno que llega después se
         lee como algo mojado.
     2 · NO TIENE BORDE. Son dos degradados radiales de radios
         distintos y ligeramente descentrados, con el grano del papel
         encima. Un solo radial con caída suave sigue siendo un
         círculo.
     3 · ES PIGMENTO, NO LUZ. Sobre papel claro, una mancha de
         acuarela OSCURECE. Un brillo blanco sobre papel casi blanco
         no se ve, y si se le sube la opacidad hasta que se vea, ya no
         parece acuarela: parece un reflejo de plástico. Sobre las
         piezas de tinta maciza se invierte, porque ahí el pigmento
         sería invisible y lo que aclara es el agua.

   ── POR QUÉ EN JAVASCRIPT, SI ES CSS ──────────────────────────────
   Porque CSS no sabe dónde está el puntero. Lo único que hace este
   módulo es escribir dos números —`--ax` y `--ay`— en el elemento por
   encima del que está el ratón. Todo lo demás, incluido el retraso,
   lo hace la hoja de estilos: los dos números están registrados con
   `@property`, así que el navegador puede INTERPOLARLOS, y el charco
   se arrastra solo sin que aquí haya una animación escrita.

   ── LO QUE CUESTA ─────────────────────────────────────────────────
   Un `pointermove` en el documento, en fase de captura pasiva, que no
   hace nada salvo guardar la última posición. La escritura va en un
   `requestAnimationFrame`, o sea como mucho una por cuadro, y solo
   ocurre cuando el puntero está encima de una superficie de la lista.
   Fuera de ellas el bucle ni se enciende.

   ── DÓNDE NO SE ENCIENDE ──────────────────────────────────────────
   · `prefers-reduced-motion`. Regla 7 del proyecto: APAGA, no reduce.
   · Sin ratón fino (`hover: hover` y `pointer: fine`). En un teléfono
     no hay puntero que seguir, y el estado :hover se queda pegado
     después de tocar.
   ═══════════════════════════════════════════════════════════════════ */

/* Las superficies que reciben la mancha: las que tienen SITIO para que
   se lea como un charco. En una ficha de 2.4 rem de alto, un charco es
   un relleno de color y ya no es acuarela — por eso las píldoras y las
   fichas de etiqueta se quedan fuera, con su cambio de relleno de
   siempre. */
const SUPERFICIES = [
  '.hilo',            // una tarjeta de hilo del foro
  '.producto',        // una tarjeta de producto
  '.ayuda__canal',    // los dos botones de la ayuda
  '.escribir',        // el panel de escribir, cerrado o abierto
  '.rr__chip',        // los tramos del reloj de las 72 horas
].join(',');
/* `.experto` NO está, y no es olvido: tiene los dos pseudoelementos
   con dueño —el ::after es la comilla de apertura de la cita, el
   ::before es el grano de papel del bloque nocturno— y no queda hueco
   donde pintar el charco sin desalojar a uno de los dos. Ya tiene su
   propio gesto al pasar por encima. Ver la nota en estilos.css. */

const quieto = matchMedia('(prefers-reduced-motion: reduce)');
const conRaton = matchMedia('(hover: hover) and (pointer: fine)');

if (!quieto.matches && conRaton.matches) arrancar();

function arrancar() {
  let encima = null;      // la superficie bajo el puntero, o null
  let x = 0, y = 0;       // en porcentaje de su propia caja
  let pedido = false;

  /* La caja se mide en el momento del movimiento y no se guarda: una
     tarjeta puede haber cambiado de sitio por un scroll, por abrirse
     una hebra o por un cambio de tamaño, y un rectángulo guardado se
     vuelve mentira sin avisar. `getBoundingClientRect` en un
     `pointermove` ya coalescido a un cuadro no es un problema de
     rendimiento; un charco desplazado sí es un problema visual. */
  const escribir = () => {
    pedido = false;
    if (!encima) return;
    encima.style.setProperty('--ax', x.toFixed(1) + '%');
    encima.style.setProperty('--ay', y.toFixed(1) + '%');
  };

  addEventListener('pointermove', (e) => {
    /* Solo ratón. Un lápiz o un dedo generan `pointermove` también, y
       ahí el charco aparecería sin que nadie esté señalando nada. */
    if (e.pointerType !== 'mouse') return;

    const destino = e.target instanceof Element ? e.target.closest(SUPERFICIES) : null;
    if (destino !== encima) {
      /* Al salir se quita la clase pero NO las coordenadas: si se
         borraran, el charco volvería al centro mientras se desvanece, y
         se vería irse por su cuenta. Se queda donde estaba y se seca
         ahí, que es lo que hace una mancha. */
      encima?.classList.remove('mojado');
      encima = destino;
      encima?.classList.add('mojado');
    }
    if (!encima) return;

    const r = encima.getBoundingClientRect();
    if (!r.width || !r.height) return;
    x = ((e.clientX - r.left) / r.width) * 100;
    y = ((e.clientY - r.top) / r.height) * 100;
    if (!pedido) { pedido = true; requestAnimationFrame(escribir); }
  }, { passive: true, capture: true });

  /* Si el puntero se va de la ventana entera no llega ningún
     `pointermove` de salida, y la última superficie se quedaría mojada
     para siempre. */
  addEventListener('pointerleave', () => {
    encima?.classList.remove('mojado');
    encima = null;
  });

  /* Y si alguien enciende «reducir movimiento» con la página abierta,
     se apaga en el sitio: la regla 7 no dice «al recargar». */
  quieto.addEventListener('change', (e) => {
    if (!e.matches) return;
    encima?.classList.remove('mojado');
    encima = null;
  });
}
