/* ═══════════════════════════════════════════════════════════════════
   dominio/mar.js — LA CALMA, QUE POR FIN TIENE DÓNDE ACUMULARSE.

   El README lo dice desde el principio:

       calma = 0.35 + 0.50 · (1 − e^(−n/τ)),  n = raíces,  τ ≈ 500

   …y `n` valía CERO, porque no había servidor. Las dos láminas de agua
   calma pintadas a mano llevaban ahí desde el primer día sin llegar a
   verse nunca. Este módulo es la mitad que faltaba.

   ── LA CALMA QUE SE SATURA (el reparo, escrito donde se arregla) ───
   «Lo que dejas, queda» + monótona + sin techo = el mar se vuelve
   espejo en unas semanas y NO VUELVE. Y el día que eso pase, la persona
   que entre y ponga la mano encima no verá absolutamente nada: el agua
   ya estaba quieta antes de que ella llegara. El gesto se muere de
   éxito, y con él la única cosa que este sitio le pide a quien entra.

   Por eso la comunidad tiene TECHO: `techoRaices` (0.55 por defecto)
   dice cuánto del rango puede llegar a poner la gente. Con las raíces
   saturadas, el mar de bienvenida está en 0.625 —visiblemente más
   sereno que el 0.35 de un sitio vacío— y una mano sola lo lleva hasta
   0.82. La comunidad calma el mar; no lo termina.

   No baja nunca, que es lo que se prometió. Simplemente no se lo come
   todo.
   ═══════════════════════════════════════════════════════════════════ */

import { config, calmaDeRaices } from '../config.js';

export function crearMar(acceso) {
  /* Las raíces viven en memoria y se vuelcan a disco cada pocos
     segundos. Escribir en SQLite una vez por cada segundo sostenido de
     cada persona conectada es un fsync por dedo y por segundo, y no
     compra nada: si el proceso se cae, lo que se pierde son los últimos
     cinco segundos de calma de todo el mundo. */
  let raices = acceso.valor('raices');
  let sucio = false;

  const volcar = () => {
    if (!sucio) return;
    acceso.ponerValor('raices', raices);
    sucio = false;
  };
  const reloj = setInterval(volcar, 5000);
  reloj.unref?.();

  /* Lo que ya se le acreditó a cada sesión, en memoria y en la tabla.
     La tabla es la que impide el bucle de «cierro la pestaña y vuelvo»:
     sin ella, el tope de 240 s se renueva en cada reconexión y una
     persona sola puede inflar el mar de todos. */
  const gastado = new Map();

  function yaGastado(sesion) {
    if (gastado.has(sesion)) return gastado.get(sesion);
    const fila = acceso.uno('SELECT segundos FROM gestos WHERE sesion = ?', sesion);
    const s = fila?.segundos ?? 0;
    gastado.set(sesion, s);
    return s;
  }

  return {
    calma: () => calmaDeRaices(raices),
    /* Las raíces en crudo NO salen a la API pública, y es a propósito.
       Un número grande en pantalla —«3.482 personas han pasado por
       aquí»— en un sitio sobre sumisión química se lee como un recuento
       de víctimas, y la regla 9 dice que el sitio nunca cuenta víctimas.
       Lo que sale es el agua más quieta. El número es del servidor. */
    raices: () => raices,

    /* Acredita segundos sostenidos. Devuelve lo que de verdad entró:
       quien ya gastó su tope sigue viendo su propio gesto en pantalla
       —eso lo pinta el navegador— pero deja de mover el mar de todos. */
    acreditar(sesion, segundos) {
      if (!(segundos > 0)) return { acreditados: 0, restante: 0 };
      const previo = yaGastado(sesion);
      const restante = Math.max(0, config.mar.topeSesion - previo);
      const entran = Math.min(segundos, restante);
      if (entran <= 0) return { acreditados: 0, restante: 0 };

      const total = previo + entran;
      gastado.set(sesion, total);
      acceso.correr(
        'INSERT INTO gestos(sesion, segundos, ultima) VALUES(?, ?, ?) ' +
        'ON CONFLICT(sesion) DO UPDATE SET segundos = excluded.segundos, ultima = excluded.ultima',
        sesion, total, Date.now());

      raices += entran * config.mar.gananciaRaiz;
      sucio = true;
      return { acreditados: entran, restante: restante - entran };
    },

    restanteDe: (sesion) => Math.max(0, config.mar.topeSesion - yaGastado(sesion)),

    /* Lo que el navegador necesita para pintar el gesto. Va del servidor
       y no de una constante en el shader para poder subirle la fuerza
       sin volver a construir el sitio — que es justo lo que hace falta
       cuando lo que se está ajustando se decide MIRANDO la pantalla. */
    sintonia: () => ({
      ...config.mar.sintonia,
      topeSesion: config.mar.topeSesion,
      maxPunteros: config.mar.maxPunteros,
      maxToques: config.mar.maxDifundidos,
      hzDifusion: config.mar.hzDifusion,
      caducaToque: config.mar.caducaToque,
    }),

    volcar,
    cerrar() { clearInterval(reloj); volcar(); },
  };
}
