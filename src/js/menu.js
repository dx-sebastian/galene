/* ═══════════════════════════════════════════════════════════════════
   menu.js — el desplegable de la barra se cierra como se espera.

   El menú es un <details> y eso NO cambia: abre y cierra sin
   JavaScript, con su estado accesible puesto por el navegador. Lo que
   un <details> no trae de fábrica son las dos maneras en que todo el
   mundo espera salir de un menú:

   · TOCAR FUERA. En un teléfono es EL gesto de cerrar — no hay Escape
     y nadie busca la equis. Sin esto, el panel se quedaba abierto
     tapando la esquina hasta que se volvía a acertar al botón.
   · ESCAPE, con el foco devuelto al botón: quien navega con teclado
     cierra desde dentro del panel y no puede quedarse con el foco
     colgando en un enlace que ya no se ve.

   `pointerdown` y no `click`, a propósito: un arrastre para hacer
   scroll también debe cerrar, y el `click` no llega si el dedo se
   movió. Y se escucha en el documento UNA vez para todos los menús
   que haya (hoy, uno por página).

   Si este módulo no llega, el menú sigue abriendo y cerrando con su
   botón: esto es cortesía, no soporte vital — por eso vive fuera de
   la regla 5. */

function cerrar(menu, { devolverFoco = false } = {}) {
  menu.removeAttribute('open');
  if (devolverFoco) menu.querySelector('summary')?.focus();
}

document.addEventListener('pointerdown', (e) => {
  for (const menu of document.querySelectorAll('details.menu[open]')) {
    if (!menu.contains(e.target)) cerrar(menu);
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  for (const menu of document.querySelectorAll('details.menu[open]')) {
    cerrar(menu, { devolverFoco: menu.contains(document.activeElement) });
  }
});

/* Elegir un destino también cierra: el panel es un medio, no un sitio
   donde quedarse. Sin esto, volver de un ancla de la misma página
   dejaba el menú abierto encima de lo recién navegado. */
document.addEventListener('click', (e) => {
  const enlace = e.target.closest('details.menu[open] a');
  if (enlace) cerrar(enlace.closest('details.menu'));
});
