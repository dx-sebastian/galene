/* ═══════════════════════════════════════════════════════════════════
   reloj.js — el reloj de las 72 horas y el desvío de emergencia.

   DOS LEYES QUE MANDAN SOBRE TODO LO DEMÁS:

   1. "NO SÉ" ES LA RESPUESTA PRINCIPAL, no una opción de cortesía. El
      mecanismo del daño es la amnesia: una herramienta que exija saber
      la hora excluye exactamente a la persona para la que existe. Por
      eso "no sé" devuelve MÁS opciones, nunca menos.

   2. NINGÚN DATO SE MUESTRA COMO CIERTO SIN FUENTE. Cada ventana lleva
      `fuente` y `verificado`. Si faltan, la interfaz lo dice en la cara.
      En una versión anterior de este proyecto se publicó un panel de
      expertos inventado; esto es para que no vuelva a pasar.
   ═══════════════════════════════════════════════════════════════════ */

/* ── Las ventanas de tiempo ────────────────────────────────────────
   PENDIENTE: todas están SIN VERIFICAR. Antes de publicar hay que
   contrastar cada una contra fuente primaria —protocolo vigente del
   Ministerio de Salud, resolución citada— y rellenar `fuente` y
   `verificado`. La interfaz marca en rojo todo lo que no lo tenga.  */
export const VENTANAS = [
  {
    id: 'toxicologia',
    cierra: 12,
    titulo: 'Tomar una muestra para análisis toxicológico',
    resumen: 'Muchas de las sustancias que se usan se eliminan rápido. ' +
             'Cuanto antes se tome la muestra, más se puede detectar.',
    detalle: 'La orina detecta durante más tiempo que la sangre. ' +
             'Pasadas varias semanas, el cabello todavía puede analizarse.',
    cerrado: 'La ventana de sangre y orina es corta y probablemente ya pasó. ' +
             'El análisis capilar sigue siendo posible más adelante.',
    fuente: null, verificado: null,
  },
  {
    id: 'pep',
    cierra: 72,
    titulo: 'Empezar la profilaxis post-exposición al VIH (PEP)',
    resumen: 'Se inicia dentro de las 72 horas. Cuanto antes, mejor: ' +
             'las primeras horas cuentan.',
    detalle: 'Se pide en urgencias. No hace falta denunciar para recibirla.',
    /* REDACCIÓN CRÍTICA: no decir nunca que "funciona mejor en las
       primeras 72 horas". Eso sugiere que después sirve algo, y no. */
    cerrado: 'Pasadas las 72 horas la PEP ya no está indicada. ' +
             'Sí siguen abiertas las pruebas y el tratamiento si hicieran falta.',
    fuente: null, verificado: null,
  },
  {
    id: 'anticoncepcion',
    cierra: 120,
    titulo: 'Anticoncepción de emergencia',
    resumen: 'La ventana depende del método. Algunos llegan hasta cinco días.',
    detalle: 'En urgencias o en farmacia. La eficacia baja con las horas.',
    cerrado: 'La ventana de la anticoncepción de emergencia ya pasó.',
    fuente: null, verificado: null,
  },
  {
    id: 'forense',
    cierra: 72,
    titulo: 'Examen médico-legal con cadena de custodia',
    resumen: 'Recoge evidencia física. Conviene no ducharse ni cambiarse ' +
             'de ropa antes, pero si ya lo hiciste, sigue valiendo la pena ir.',
    detalle: 'Lo hace Medicina Legal o la institución de salud habilitada.',
    cerrado: 'La recolección de evidencia física es menos probable a estas ' +
             'alturas, pero el examen médico sigue teniendo sentido.',
    fuente: null, verificado: null,
  },
  {
    id: 'atencion',
    cierra: Infinity,
    titulo: 'Atención médica',
    resumen: 'No caduca. La atención por violencia sexual es urgencia médica ' +
             'y no exige denunciar ni explicar lo que pasó.',
    detalle: 'Cualquier institución de salud está obligada a atender.',
    cerrado: null,
    fuente: null, verificado: null,
  },
  {
    id: 'denuncia',
    cierra: Infinity,
    titulo: 'Denunciar, si quieres',
    resumen: 'No tiene plazo y no es obligatorio. Se puede hacer por internet.',
    detalle: 'La atención médica nunca depende de que denuncies.',
    cerrado: null,
    fuente: null, verificado: null,
  },
];

/* Los tramos del disco. Gruesos a propósito: no se pregunta una hora
   exacta porque nadie la tiene, y pedirla es un interrogatorio. */
export const TRAMOS = [
  { id: 'horas',  etiqueta: 'hace unas horas',  horas: 4 },
  { id: 'anoche', etiqueta: 'anoche',           horas: 10 },
  { id: 'ayer',   etiqueta: 'ayer',             horas: 26 },
  { id: 'dias',   etiqueta: 'hace unos días',   horas: 60 },
  { id: 'nose',   etiqueta: 'no sé',            horas: null },
];

/** Qué sigue abierto. `horas === null` es "no sé": devuelve TODO lo que
    podría seguir abierto, ordenado por lo que se cierra primero. */
export function abierto(horas) {
  const noSe = horas === null;
  const orden = (v) => (v.cierra === Infinity ? 1e9 : v.cierra);
  const lista = VENTANAS.slice().sort((a, b) => orden(a) - orden(b));
  return lista.map((v) => ({
    ...v,
    estado: noSe ? 'quizas' : (horas < v.cierra ? 'abierta' : 'cerrada'),
    quedan: noSe || v.cierra === Infinity ? null : Math.max(0, v.cierra - horas),
  }));
}

/** Cuántas ventanas no tienen fuente. Se muestra en la interfaz: si es
    mayor que cero, el sitio no está listo para publicarse. */
export const sinFuente = () => VENTANAS.filter((v) => !v.fuente).length;
