/* ═══════════════════════════════════════════════════════════════════
   supabase-config.js — SI HAY BASE, Y NADA MÁS.

   Tres líneas en su propio archivo, y el motivo es el peso de la
   portada.

   `@supabase/supabase-js` son 215 kB sin comprimir. La portada los
   necesita para la bandada del manglar y para la calma del mar — dos
   enhancements, dos cosas que pueden llegar tarde y que si no llegan
   dejan el sitio entero en pie. Pero un `import` estático no sabe eso:
   mete la biblioteca dentro del paquete de `main.js` y la pone en el
   camino crítico de la página que alguien abre a las cuatro de la
   mañana con datos móviles.

   Así que `bandada-cliente.js` importa ESTO —que no arrastra nada— y
   pide `supabase-cliente.js` con un `import()` dinámico solo cuando de
   verdad va a hablar con la base. Si no hay variables configuradas, la
   biblioteca no se descarga nunca.

   MEDIDO: con las variables puestas, `dist/_astro` pasa de 576 kB a
   792 kB, y esos 215 kB son un trozo aparte que la portada ya no
   bloquea. `/comunidad` sí lo importa estático, porque ahí el foro NO
   es un enhancement: es la página.

   Astro sustituye estas dos expresiones por literales al compilar (ver
   docs/DESPLIEGUE-COMUNIDAD.md), así que sin variables `listo` es una
   constante `false` y el empaquetador puede tirar todo lo que cuelgue
   de ella. Ese es el segundo motivo para que estén aquí solas.
   ═══════════════════════════════════════════════════════════════════ */
export const URL_SUPABASE = import.meta.env.PUBLIC_SUPABASE_URL;
export const LLAVE_ANON = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const listo = typeof URL_SUPABASE === 'string' && typeof LLAVE_ANON === 'string'
  && URL_SUPABASE.length > 0 && LLAVE_ANON.length > 0;
