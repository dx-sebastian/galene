/* ═══════════════════════════════════════════════════════════════════
   purga.js — LO QUE SE TIRA, Y CUÁNDO.

   Guardar para siempre es una decisión, no el estado natural de las
   cosas. En un sitio sobre sumisión química hay que poder decir qué se
   borra y en cuánto tiempo, y que sea verdad.

   Se corre al arrancar y una vez al día. No hace falta más.
   ═══════════════════════════════════════════════════════════════════ */

import { config } from '../config.js';

export function purgar(acceso) {
  const ahora = Date.now();
  const dia = 24 * 60 * 60 * 1000;
  const viejo = ahora - config.foro.diasRetencion * dia;
  const cuenta = {};

  /* Lo borrado por quien lo escribió: el texto se vació en el acto; la
     fila se queda unos días para que el hilo no se descosa —una
     respuesta apuntando a un padre que ya no existe— y luego se va. */
  cuenta.comentarios = acceso.correr(
    "DELETE FROM comentarios WHERE estado = 'borrado' AND creado < ?", viejo).changes;
  cuenta.hilos = acceso.correr(
    "DELETE FROM hilos WHERE estado = 'borrado' AND creado < ?", viejo).changes;

  /* Los votos y los reportes de lo que ya no existe. La clave foránea
     se lleva los comentarios de un hilo, pero los votos no tienen
     foránea (apuntan a dos tablas distintas), así que se limpian aquí. */
  cuenta.votos = acceso.correr(
    `DELETE FROM votos WHERE (objeto = 'hilo' AND cosa NOT IN (SELECT id FROM hilos))
        OR (objeto = 'comentario' AND cosa NOT IN (SELECT id FROM comentarios))`).changes;
  cuenta.reportes = acceso.correr(
    'DELETE FROM reportes WHERE cuando < ?', ahora - 90 * dia).changes;

  /* Las garzas que ya volaron. La fila muerta existe para que su sesión
     no vuelva a dejar otra; pasada una semana, esa sesión no va a
     volver y la fila solo ocupa. */
  cuenta.garzas = acceso.correr(
    'DELETE FROM garzas WHERE viva = 0 AND partida < ?', ahora - 7 * dia).changes;

  /* El gasto de gesto de sesiones que no han vuelto. Es lo único que
     ata un hash de sesión a un número, y a los treinta días no protege
     de nada: la pestaña que lo tenía se cerró hace un mes. */
  cuenta.gestos = acceso.correr(
    'DELETE FROM gestos WHERE ultima < ?', viejo).changes;

  return cuenta;
}
