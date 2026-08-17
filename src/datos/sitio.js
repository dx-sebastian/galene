/* ═══════════════════════════════════════════════════════════════════
   Galene — el interruptor, y la lista de lo que existe.

   ── POR QUÉ ESTO ES UN ARCHIVO ─────────────────────────────────────
   La decisión de no ser encontrable estaba tomada SEIS VECES: una
   etiqueta `noindex` escrita a mano en cada página. Seis copias de una
   decisión no son una decisión, son seis oportunidades de que un día
   quede a medias — y el día que llegue la verificación clínica, quitar
   cinco líneas y olvidar la sexta deja el sitio medio publicado sin que
   nadie se entere, porque una etiqueta que falta no se ve mirando la
   página.

   Aquí es una palabra. Cambiarla mueve las seis páginas, el
   `robots.txt` y el `sitemap.xml` a la vez, y hay una prueba que
   compila las dos versiones y lo comprueba
   (`scripts/comprobar-interruptor.mjs`).
   ═══════════════════════════════════════════════════════════════════ */

/* ── EL FRENO ───────────────────────────────────────────────────────
   `false` mientras los plazos clínicos, las rutas de atención y las
   líneas de ayuda no estén revisados y firmados por un profesional de
   salud o de medicina forense en Colombia.

   NO es una tarea de mantenimiento pendiente: es la razón por la que
   este sitio todavía no debe aparecer en un buscador. Alguien que llega
   a las cuatro de la mañana buscando «qué hago» merece que lo que lea
   lo haya leído antes alguien que sabe. Todo el trabajo de
   encontrabilidad —los títulos, las descripciones, el glosario en
   JSON-LD, el sitemap— ya está hecho y esperando detrás de esta
   palabra, para que el día que la firma exista no haya que hacer nada
   más que cambiarla.

   Qué hace falta para ponerla en `true`:
     1. La revisión firmada, guardada en `docs/verificacion/`.
     2. Volver a compilar y comprobar que `noindex` desaparece de las
        seis páginas y que `robots.txt` deja de prohibir el paso.
     3. Enviar el sitemap. */
export const VERIFICADO = false;

/* ── LAS PÁGINAS PÚBLICAS ───────────────────────────────────────────
   La lista que va al sitemap. El 404 no está y no debe estar: una
   página de error no es contenido.

   `cambia` y `peso` son las señales que entiende el protocolo de
   sitemaps. No son promesas: son una pista de con qué frecuencia mirar.
   La portada manda porque es donde está lo que alguien busca de verdad;
   la comunidad cambia sola cuando la gente escribe. */
export const PAGINAS = [
  { ruta: '', cambia: 'weekly', peso: '1.0' },
  { ruta: 'expertos/', cambia: 'monthly', peso: '0.8' },
  { ruta: 'comunidad/', cambia: 'daily', peso: '0.7' },
  { ruta: 'productos/', cambia: 'monthly', peso: '0.5' },
  { ruta: 'acerca/', cambia: 'yearly', peso: '0.4' },
];

/* Las fichas de producto se añaden desde donde vive su lista, para no
   repetir aquí cinco identificadores que ya están escritos en
   datos/productos.js. */
export const rutasDeProductos = (productos) =>
  productos.map((p) => ({ ruta: `productos/${p.id}/`, cambia: 'monthly', peso: '0.4' }));

/* ── LAS URL, COMPUESTAS Y NO ESCRITAS A MANO ───────────────────────
   `sitio` es `Astro.site` (de astro.config.mjs) y `base` el prefijo de
   GitHub Pages. Una dirección escrita a mano se queda apuntando a
   localhost el día que alguien pruebe en local y copie. */
export const absoluta = (base, sitio, ruta = '') =>
  new URL(String(base).replace(/\/?$/, '/') + ruta, sitio).href;
