/* ═══════════════════════════════════════════════════════════════════
   purga.js — LO QUE SE TIRA, Y CUÁNDO.

   Guardar para siempre es una decisión, no el estado natural de las
   cosas. En un sitio sobre sumisión química hay que poder decir qué se
   borra y en cuánto tiempo, y que sea verdad.

   Dos funciones, no una, desde que el foro vive en Postgres y el resto
   sigue en el SQLite local: `purgarLocal` corre contra la base de
   siempre (síncrona) y `purgarForo` contra el pool de Supabase
   (asíncrona). `servidor.js` ya no las corre —el foro no se sirve desde
   ahí—; las llama `herramientas/purgar.js`, a mano.
   ═══════════════════════════════════════════════════════════════════ */

const DIA = 24 * 60 * 60 * 1000;

export function purgarLocal(acceso) {
  const ahora = Date.now();
  const cuenta = {};

  /* Las garzas que ya volaron. La fila muerta existe para que su sesión
     no vuelva a dejar otra; pasada una semana, esa sesión no va a
     volver y la fila solo ocupa. */
  cuenta.garzas = acceso.correr(
    'DELETE FROM garzas WHERE viva = 0 AND partida < ?', ahora - 7 * DIA).changes;

  /* El gasto de gesto de sesiones que no han vuelto. A los treinta días
     no protege de nada: la pestaña que lo tenía se cerró hace un mes. */
  cuenta.gestos = acceso.correr(
    'DELETE FROM gestos WHERE ultima < ?', ahora - 30 * DIA).changes;

  return cuenta;
}

export async function purgarForo(accesoForo, diasRetencion = 30) {
  const ahora = Date.now();
  const viejo = ahora - diasRetencion * DIA;
  const cuenta = {};

  /* Lo borrado por quien lo escribió: el texto se vació en el acto; la
     fila se queda unos días para que el hilo no se descosa —una
     respuesta apuntando a un padre que ya no existe— y luego se va. */
  cuenta.comentarios = (await accesoForo.correr(
    "DELETE FROM comentarios WHERE estado = 'borrado' AND creado < ?", viejo)).changes;
  cuenta.hilos = (await accesoForo.correr(
    "DELETE FROM hilos WHERE estado = 'borrado' AND creado < ?", viejo)).changes;

  /* Los votos y los reportes de lo que ya no existe. La clave foránea
     se lleva los comentarios de un hilo, pero los votos no tienen
     foránea (apuntan a dos tablas distintas), así que se limpian aquí. */
  cuenta.votos = (await accesoForo.correr(
    `DELETE FROM votos WHERE (objeto = 'hilo' AND cosa NOT IN (SELECT id FROM hilos))
        OR (objeto = 'comentario' AND cosa NOT IN (SELECT id FROM comentarios))`)).changes;
  cuenta.reportes = (await accesoForo.correr(
    'DELETE FROM reportes WHERE cuando < ?', ahora - 90 * DIA)).changes;

  /* Cubos de fichas de sesiones que no han vuelto en un día: a partir
     de ahí no protegen de nada y solo ocupan una fila en `limites`. */
  cuenta.limites = (await accesoForo.correr(
    'DELETE FROM limites WHERE ultimo < ?', ahora - DIA)).changes;

  return cuenta;
}
