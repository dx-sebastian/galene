/* ═══════════════════════════════════════════════════════════════════
   EL PEDIDO — el botón de compra, en el mostrador y en la ficha.

   Vivía dentro del componente del catálogo hasta que cada producto
   ganó su propia página: dos sitios con el mismo botón no pueden
   tener dos copias de la misma cuenta, o un día una dirá «En tu
   pedido» y la otra «Comprar» para la misma pieza.

   NADA SALE DEL APARATO. El interés vive en sessionStorage, como toda
   elección de este sitio, y muere al cerrar la pestaña: no hay caja
   de pago que fingir mientras la importación se esté cerrando.
   ═══════════════════════════════════════════════════════════════════ */

const CLAVE = 'galene:pedido';

const leer = () => {
  try { return JSON.parse(sessionStorage.getItem(CLAVE) || '[]'); }
  catch { return []; }
};

const pintar = (boton, dentro) => {
  const texto = boton.querySelector('.acuarela__texto') || boton;
  texto.textContent = dentro ? 'En tu pedido ✓' : 'Comprar';
  boton.classList.toggle('producto__comprar--dentro', dentro);
};

for (const boton of document.querySelectorAll('.producto__comprar')) {
  const nombre = boton.dataset.nombre;
  pintar(boton, leer().includes(nombre));
  boton.addEventListener('click', () => {
    const pedido = leer();
    const i = pedido.indexOf(nombre);
    if (i >= 0) pedido.splice(i, 1); else pedido.push(nombre);
    try { sessionStorage.setItem(CLAVE, JSON.stringify(pedido)); } catch {}
    pintar(boton, i < 0);
  });
}
