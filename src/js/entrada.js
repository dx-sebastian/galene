/* ═══════════════════════════════════════════════════════════════════
   entrada.js — la pintura llega.

   QUÉ HACE. Durante los primeros segundos el mundo se pinta: el papel
   primero, la aguada después, el filo al final. No es un cargador ni
   una cortina — es la misma imagen apareciendo como aparece una
   acuarela cuando se seca.

   ── LO QUE LA SECUENCIA NO TOCA, Y ESO ES TODO EL DISEÑO ────────────

   La secuencia escenifica LA PINTURA. Nunca la ayuda.

   El título, la frase y el botón «qué puedo hacer ahora» están a plena
   tinta desde el milisegundo cero y no participan de nada de esto. Se
   puede pulsar el botón mientras el mar todavía está apareciendo, y
   funciona.

   No es una concesión: es la regla 5 del proyecto —la ayuda está a
   cero clics— aplicada a un sitio que ahora quiere ser también una
   obra. Una portada de premio suele pedir cuatro segundos antes de
   dejarte hacer nada; aquí esos cuatro segundos los pagaría entera la
   persona que abrió esto a las cuatro de la mañana buscando un
   teléfono. Así que el espectáculo va en el arte y la ayuda no espera.

   Y SE SALTA SOLA. Al primer toque, tecla o rueda, la secuencia
   termina de golpe. Quien tiene prisa no tiene que verla: basta con
   que haga lo que iba a hacer de todos modos.

   Con `prefers-reduced-motion` no se arranca siquiera. La clase no se
   pone y el CSS deja el mundo tal cual.

   Es un enhancement: si este módulo no carga, no falta nada.
   ═══════════════════════════════════════════════════════════════════ */

const raiz = document.documentElement;
const quieto = matchMedia('(prefers-reduced-motion: reduce)');

/* Cuánto dura. Dos segundos justos: por debajo no se percibe como un
   gesto y por encima empieza a ser una espera. */
const DURA = 2000;

if (!quieto.matches && !raiz.classList.contains('entrando')) {
  raiz.classList.add('entrando');

  let cerrado = false;
  const terminar = () => {
    if (cerrado) return;
    cerrado = true;
    raiz.classList.remove('entrando');
    /* Se marca que ya pasó: el CSS lo usa para no volver a animar nada
       si algo fuerza un recálculo. */
    raiz.classList.add('entrada-hecha');
    for (const ev of EVENTOS) removeEventListener(ev, terminar);
  };

  /* CUALQUIER señal de que hay alguien ahí corta la secuencia. Incluye
     el scroll y las teclas, no solo el toque: quien navega con teclado
     también tiene prisa. */
  const EVENTOS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'];
  for (const ev of EVENTOS) addEventListener(ev, terminar, { passive: true, once: true });

  setTimeout(terminar, DURA);

  /* Si la pestaña arranca en segundo plano, la secuencia se habría
     "gastado" sin que nadie la viera y al volver el sitio aparecería
     ya montado. Da igual: lo que no se puede es que se quede a medias,
     y el temporizador se encarga. */
  quieto.addEventListener('change', () => { if (quieto.matches) terminar(); });
}
