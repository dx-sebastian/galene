/* ═══════════════════════════════════════════════════════════════════
   navegacion.js — los enlaces de la barra, UNA vez.

   Se pintan en CINCO sitios: la fila de escritorio y el menú del
   teléfono, en tres páginas. Cinco copias a mano son cinco listas que
   un día divergen — y la que miente en silencio es la de la página en
   la que uno no está trabajando. La regla es la misma que la del
   glosario y los expertos: si un dato vive en dos plantillas, vive
   mal; se declara aquí y las plantillas lo leen.

   `enlaces(base)` recibe el prefijo de la página que lo llama porque
   `import.meta.env.BASE_URL` se resuelve en el .astro, no aquí.

   ── Y ACABAN EN BARRA ──────────────────────────────────────────────
   `productos` sin barra final existe: GitHub Pages responde con un 301
   hacia `productos/`. Funciona, y cuesta un viaje de red completo en
   cada navegación —peticion, respuesta, segunda peticion— por no
   escribir un carácter. Con el sitio indexado además reparte la
   autoridad entre dos direcciones para la misma página.
   `pruebas/e2e/semantica.spec.js` lo vigila en las cinco páginas. */
export const enlaces = (base) => [
  ['Información', base + '#herramientas'],
  ['Productos', base + 'productos/'],
  ['Recursos', base + '#sin-hablar'],
  ['Comunidad', base + 'comunidad/'],
  ['Panel de expertos', base + 'expertos/'],
];
