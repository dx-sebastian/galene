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

/* ── LAS FUENTES ───────────────────────────────────────────────────
   Dos documentos, y cada ventana dice de cuál sale. Se citan enteros
   una vez aquí para que ninguna ventana lleve una referencia suelta
   que nadie pueda rastrear.

   Un aviso que hay que leer antes de tocar nada de esto: los datos de
   abajo se contrastaron contra el texto de estos dos documentos, pero
   `verificado` sigue en `false` a propósito. Que un dato coincida con
   una fuente no es lo mismo que estar verificado: falta que una
   persona con criterio clínico confirme que el documento citado SIGUE
   VIGENTE y que la lectura es la correcta. El protocolo de salud que
   se usó aquí es la actualización que deroga la Resolución 459 de
   2012, y hay que comprobar bajo qué número quedó publicada. Hasta
   entonces la interfaz lo sigue marcando, y el sitio sigue con
   `noindex`. */
const SALUD = {
  id: 'minsalud',
  titulo: 'Protocolo de Atención en salud para Víctimas de Violencia Sexual',
  entidad: 'Ministerio de Salud y Protección Social de Colombia',
  nota: 'Actualización del protocolo adoptado por la Resolución 459 de 2012.',
  url: 'https://consultorsalud.com/wp-content/uploads/2020/12/Actualizacion-Protocolo-de-Atencion-en-salud-para-Victimas-de-Violencia-Sexual.pdf',
};
const FORENSE = {
  id: 'inmlcf',
  titulo: 'Reglamento Técnico para el Abordaje Forense Integral de la Víctima ' +
          'en la Investigación del Delito Sexual',
  entidad: 'Instituto Nacional de Medicina Legal y Ciencias Forenses',
  nota: 'R.T. INML-CF-01.',
  url: 'https://repository.iom.int/handle/20.500.11788/707',
};
export const FUENTES = [SALUD, FORENSE];

/* ── Las ventanas de tiempo ────────────────────────────────────────
   Cada una lleva `fuente` y la CITA de la que sale su número, para que
   se pueda comprobar sin leerse ochenta páginas. */
/* `corto` es el mismo dato con nombre de etiqueta: lo pide la vista de
   horizontes del bloque «Estás aquí», donde cada ventana es una barra y
   no cabe un título de dos renglones. No es un texto nuevo ni una
   afirmación nueva — es el mismo `titulo` dicho en tres palabras. */
export const VENTANAS = [
  {
    id: 'toxicologia',
    /* ── LA CORRECCIÓN MÁS IMPORTANTE DE TODO EL ARCHIVO ────────────
       Esta ventana estaba en 12 horas. El protocolo dice otra cosa, y
       la diferencia no es de matiz: son 96.

       El texto (Tabla 10, pruebas diagnósticas) separa dos muestras que
       aquí estaban confundidas en una sola:
         · sangre — «si los hechos ocurrieron en las 6 horas previas»
         · orina  — «si los hechos ocurrieron en las 96 horas previas»

       O sea que a las 12 horas el sitio le decía a alguien que su
       ventana había pasado cuando le quedaban TRES DÍAS. Es el peor
       error que puede cometer esta página: no informa de menos —
       convence a alguien de que ya no vale la pena ir. */
    cierra: 96,
    corto: 'Muestra toxicológica',
    titulo: 'Tomar una muestra para saber qué te dieron',
    resumen: 'La de orina sirve hasta cuatro días después. Cuanto antes, ' +
             'mejor: las sustancias se van con las horas.',
    detalle: 'Son dos muestras distintas. La de sangre solo sirve en las ' +
             'primeras seis horas; la de orina llega hasta las noventa y ' +
             'seis, que son cuatro días.',
    cerrado: 'La ventana de orina —cuatro días— probablemente ya pasó. ' +
             'Cuéntalo igual: queda registrado, y todo lo demás de esta ' +
             'lista sigue abierto.',
    fuente: SALUD,
    cita: 'Tabla 10: «Cuantitativas en sangre (alcohol y otras sustancias ' +
          'depresoras si los hechos ocurrieron en las 6 horas previas). ' +
          'Cualitativas en orina (otras sustancias depresoras si los hechos ' +
          'ocurrieron en las 96 horas previas)».',
    verificado: false,
  },
  {
    id: 'forense',
    cierra: 72,
    corto: 'Examen médico-legal',
    titulo: 'Examen médico-legal',
    resumen: 'Recoge señales que después ya no están. Dentro de las ' +
             'primeras 72 horas cuenta como urgencia: no te pueden hacer ' +
             'esperar turno.',
    detalle: 'Lo hace Medicina Legal o el hospital habilitado. No hace ' +
             'falta haber denunciado para que te lo hagan.',
    cerrado: 'Pasadas las 72 horas ya no es una urgencia médico-legal, ' +
             'pero el examen se sigue haciendo y sigue sirviendo.',
    fuente: FORENSE,
    cita: '«Durante las primeras 72 horas desde el momento de la ocurrencia ' +
          'de los hechos, el abordaje integral forense de la víctima en la ' +
          'investigación del delito sexual constituye una urgencia ' +
          'medicolegal y por tanto debe ser atendida como tal».',
    verificado: false,
  },
  {
    id: 'pep',
    cierra: 72,
    corto: 'Profilaxis del VIH (PEP)',
    titulo: 'Las pastillas que evitan el VIH',
    resumen: 'Se empiezan dentro de las 72 horas. Cuanto antes, mejor: ' +
             'las primeras horas cuentan.',
    detalle: 'Se piden en urgencias. No hace falta denunciar para que te ' +
             'las den.',
    /* REDACCIÓN CRÍTICA: no decir nunca que «funciona mejor en las
       primeras 72 horas». Eso sugiere que después sirve algo, y no. */
    cerrado: 'Pasadas las 72 horas estas pastillas ya no se indican. Sí ' +
             'siguen abiertas las pruebas y el tratamiento si hicieran falta.',
    fuente: SALUD,
    cita: '«la profilaxis para VIH en todos los casos de violencia sexual ' +
          '(...) dentro de las primeras 72 horas después de la agresión».',
    verificado: false,
  },
  {
    id: 'anticoncepcion',
    cierra: 120,
    corto: 'Anticoncepción de emergencia',
    titulo: 'La pastilla del día después',
    resumen: 'Hasta cinco días. Cuanto antes se tome, mejor funciona.',
    detalle: 'En urgencias o en farmacia. Hay más de una opción y no todas ' +
             'duran lo mismo; en urgencias te dicen cuál te sirve.',
    cerrado: 'Pasados los cinco días esta ventana se cerró. Si te preocupa ' +
             'un embarazo, en urgencias pueden hacer una prueba y contarte ' +
             'qué opciones hay.',
    fuente: SALUD,
    cita: '«Opciones de anticoncepción de emergencia para administrar hasta ' +
          'las 120 horas de ocurrida la violencia sexual». Para el tramo ' +
          'final: «Si los hechos ocurrieron entre las 72 horas y los 5 días ' +
          'anteriores iniciar anticoncepción de emergencia con Levonorgestrel».',
    verificado: false,
  },
  {
    id: 'atencion',
    cierra: Infinity,
    corto: 'Atención médica',
    titulo: 'Que te atiendan',
    resumen: 'No caduca. Es una urgencia y no te pueden pedir que ' +
             'denuncies ni que expliques lo que pasó.',
    detalle: 'Cualquier institución de salud está obligada a atenderte, ' +
             'sea del régimen que sea.',
    cerrado: null,
    fuente: SALUD,
    cita: 'El protocolo es de obligatorio cumplimiento para las entidades ' +
          'promotoras de salud y las instituciones prestadoras de servicios ' +
          'de salud en la atención de víctimas de violencia sexual.',
    verificado: false,
  },
  {
    id: 'denuncia',
    cierra: Infinity,
    corto: 'Denunciar, si quieres',
    titulo: 'Denunciar, si quieres',
    resumen: 'No tiene plazo y no es obligatorio. Se puede hacer por internet.',
    detalle: 'Que te atiendan en salud no depende nunca de que denuncies.',
    cerrado: null,
    fuente: SALUD,
    cita: 'La atención en salud es independiente del proceso judicial: el ' +
          'protocolo la define como urgencia y no la condiciona a la denuncia.',
    verificado: false,
  },
];

/* ── LO QUE AYUDA, SI TODAVÍA ESTÁS A TIEMPO ───────────────────────
   Consejos prácticos. Hay que entender POR QUÉ están escritos así, o
   hacen daño en vez de ayudar.

   CADA UNO LLEVA SU «Y SI YA LO HICISTE», y eso no es amabilidad: es
   lo único que separa una lista de consejos de una lista de reproches.
   Quien lee esto ya se duchó, casi siempre — ducharse es lo primero
   que hace cualquiera. Una lista que solo diga «no te duches» le está
   diciendo que ya lo estropeó todo, y esa es una de las razones por
   las que la gente no va al hospital.

   El dato que lo desmonta está en el propio reglamento forense,
   hablando del cepillado de dientes: «El cepillado dental previo al
   examen, NO DESCARTA su presencia en un hecho reciente». Si eso vale
   para la boca, la idea general es la misma: haber hecho algo no
   cancela nada.

   Y NINGUNO ES UNA CONDICIÓN. Ir a urgencias no depende de haber hecho
   ni una sola de estas cosas. Por eso el bloque se llama «lo que
   ayuda» y no «lo que debes hacer».

   El orden es por lo que más se pierde y menos cuesta guardar. */
export const CONSEJOS = [
  {
    id: 'ducha',
    titulo: 'Si puedes, no te duches todavía',
    porque: 'El agua se lleva las señales que el examen busca.',
    yaLoHice: 'Si ya te duchaste, ve igual. Lo anotan y sigue adelante: el ' +
              'examen no se cancela por eso.',
    fuente: FORENSE,
  },
  {
    id: 'ropa',
    titulo: 'Guarda la ropa que llevabas en una bolsa de papel',
    porque: 'De papel, no de plástico: el plástico retiene la humedad y ' +
            'echa a perder lo que hay en la tela. Si está mojada, déjala ' +
            'secar al aire antes de guardarla, y no la sacudas.',
    yaLoHice: 'Si ya la lavaste o la tiraste, no pasa nada. Lleva lo que ' +
              'tengas, aunque sea otra prenda.',
    /* El kit oficial de toma de muestras lleva bolsas de papel bond, y
       el reglamento manda secar al aire las prendas húmedas antes de
       embalarlas y no sacudirlas. Esas dos cosas juntas son la razón
       del papel, dicha sin tecnicismos. */
    fuente: FORENSE,
  },
  {
    id: 'orina',
    titulo: 'Si aguantas las ganas de orinar, guarda la primera',
    porque: 'La prueba de orina es la que más dura —hasta cuatro días— y ' +
            'la primera es la que más dice.',
    yaLoHice: 'Si ya orinaste, la ventana sigue abierta igual: son cuatro ' +
              'días, no una sola oportunidad.',
    fuente: SALUD,
  },
  {
    id: 'boca',
    titulo: 'Si hubo contacto con la boca, no te cepilles los dientes',
    porque: 'Ni enjuague bucal, ni comer, ni beber, si puedes evitarlo.',
    yaLoHice: 'Y si ya te cepillaste, sigue valiendo la pena: el reglamento ' +
              'dice que cepillarse no descarta encontrar nada en un hecho ' +
              'reciente.',
    fuente: FORENSE,
  },
  {
    id: 'objetos',
    titulo: 'No laves ni tires nada de lo que había alrededor',
    porque: 'Sábanas, toallas, el vaso, el preservativo. Cualquier cosa ' +
            'puede servir.',
    yaLoHice: 'Si ya se limpió, sigue habiendo mucho que hacer. Esto no es ' +
              'una condición para nada.',
    fuente: FORENSE,
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

/** Cuántas ventanas no tienen fuente. Ahora la tienen todas, así que
    esto vale cero — se deja porque es la red que avisaría si alguien
    añade una ventana nueva y se olvida de citarla. */
export const sinFuente = () => VENTANAS.filter((v) => !v.fuente).length;

/** Cuántas están contrastadas contra fuente pero SIN VERIFICAR por una
    persona con criterio clínico.

    La diferencia entre las dos cuentas de arriba es la que decide si
    este sitio se puede publicar, y conviene no confundirlas: tener
    fuente significa que el número sale de un documento; estar
    verificado significa que alguien comprobó que ese documento sigue
    vigente y que la lectura es correcta. Lo primero lo puede hacer
    quien escribe el código. Lo segundo, no. */
export const sinVerificar = () => VENTANAS.filter((v) => !v.verificado).length;
