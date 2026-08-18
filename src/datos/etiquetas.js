/* ═══════════════════════════════════════════════════════════════════
   etiquetas.js — LAS CINCO PUERTAS DEL FORO.

   No es dato inventado —a diferencia de lo que había en datos/comunidad.js,
   que se borró entero—: son las secciones reales del foro, con el pigmento
   que ya usa el resto del sitio. Viven en un fichero aparte, no dentro de
   `supabase-cliente.js`, porque se usan en tiempo de compilación para
   pintar los chips del filtro (`Comunidad.astro`) y no hace falta esperar
   a ninguna red para tenerlas.

   La lista de ids TIENE que coincidir con el CHECK de `etiqueta` en
   `servidor/src/base/esquema-foro.sql`. Si un día se añade una etiqueta,
   se cambia en los dos sitios.
   ═══════════════════════════════════════════════════════════════════ */
export const ETIQUETAS = [
  { id: 'acompanar', nombre: 'Acompañar',   pigmento: '#2F6B4F',
    pie: 'Estar con alguien, o pedir que estén contigo.' },
  { id: 'ruta',      nombre: 'Ruta médica', pigmento: '#3E6E8E',
    pie: 'Cómo es ir, qué se dice, qué se pregunta.' },
  { id: 'despues',   nombre: 'Después',     pigmento: '#4A3A63',
    pie: 'Los días y las semanas que siguen.' },
  { id: 'cuidados',  nombre: 'Cuidados',    pigmento: '#5B93AC',
    pie: 'Lo práctico: salir, volver, dormir, comer.' },
  { id: 'preguntas', nombre: 'Preguntas',   pigmento: '#C4553F',
    pie: 'Dudas sobre el sitio y sobre lo que sigue.' },
];

/* DEVUELVE `null` CUANDO NO HAY ETIQUETA, y eso importa.

   Antes caía a `ETIQUETAS[0]`, o sea que un hilo sin etiqueta —o con
   una que no está en la lista— salía en pantalla marcado como
   «Acompañar». Un valor por defecto silencioso en un sitio donde la
   etiqueta la elige quien escribe es ponerle a alguien una palabra que
   no dijo. Desde que etiquetar es opcional, «ninguna» es una respuesta
   posible y hay que poder pintarla: no pintando nada. */
export const deEtiqueta = (id) => ETIQUETAS.find((e) => e.id === id) || null;
