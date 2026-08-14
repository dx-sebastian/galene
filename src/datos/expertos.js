/* ═══════════════════════════════════════════════════════════════════
   Galene — el panel de expertos, en datos.

   ESTO ERA UN ARRAY DENTRO DE UN COMPONENTE, y dejó de poder serlo el
   día que la misma lista tuvo que pintarse en dos sitios: seis en la
   portada y todas en /expertos. Una lista copiada en dos plantillas es
   una lista que un día diverge, y aquí divergir significa que una
   página cita una fuente que la otra ya corrigió.

   QUÉ ES CADA ENTRADA, y qué NO es:

   `texto` es una SÍNTESIS EDITORIAL de lo que sostiene el trabajo
   citado. No es una cita textual, no es un testimonio dado a Galene y
   no es un aval de sus autores. La regla 3 del README —no fabricar
   personas, ni testimonios, ni cifras sin fuente— se cumple aquí
   escribiendo en nuestra voz sobre trabajo ajeno y enlazando siempre
   al original, no poniendo comillas alrededor de algo que nadie dijo.

   `fuente` se verificó consultándola antes de escribirla. Un enlace
   roto en una página de ayuda no es un detalle de mantenimiento: es
   una promesa de rigor que se cae justo cuando alguien va a comprobar
   si puede fiarse de lo demás.

   EL ORDEN NO ES CASUAL. Las primeras entradas responden a lo que
   alguien se pregunta en la primera hora —¿por qué no me defendí?,
   ¿por qué no recuerdo?— y las institucionales van después. La portada
   corta por `LIMITE_PORTADA`, así que lo que se decida poner en las
   seis primeras posiciones es lo único que verá la mayoría.
   ═══════════════════════════════════════════════════════════════════ */

/* Cuántas se pintan en la portada. El resto vive en /expertos, detrás
   del enlace «Ver todo el panel». */
export const LIMITE_PORTADA = 6;

export const EXPERTOS = [
  {
    name: 'Laurie Fields y equipo',
    role: 'Investigacion clinica en psicotraumatologia',
    text: 'La memoria incompleta no impide que aparezcan sintomas intensos. El cuidado no debe exigir reconstruir el episodio para reconocer lo que dejo.',
    source: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9090424/',
    sourceLabel: 'Estudio clinico, 2022',
  },
  {
    name: 'Anna Moller, Hans Peter Sondergaard y Lotti Helstrom',
    role: 'Ginecologia y psiquiatria, Instituto Karolinska',
    text: 'La paralisis involuntaria durante una agresion fue la reaccion mas frecuente en su cohorte, no la excepcion. No haberse defendido no dice nada sobre si hubo consentimiento.',
    source: 'https://obgyn.onlinelibrary.wiley.com/doi/10.1111/aogs.13174',
    sourceLabel: 'Acta Obstetricia et Gynecologica Scandinavica, 2017',
  },
  {
    name: 'James Hopper y David Lisak',
    role: 'Psicologia, Facultad de Medicina de Harvard',
    text: 'Un relato fragmentado y sin orden no es un relato poco fiable. El cerebro bajo amenaza graba fragmentos sensoriales intensos antes que una secuencia ordenada.',
    source: 'https://hms.harvard.edu/news/why-rape-trauma-survivors-have-fragmented-incomplete-memories',
    sourceLabel: 'Harvard Medical School, 2014',
  },
  {
    name: 'Srikala Subramanian, MD, y Jennifer Green, RN',
    role: 'Atencion medica y enfermeria forense',
    text: 'Una respuesta estabilizadora y compasiva devuelve margen de eleccion: explicar cada paso, pedir permiso y permitir detenerlo tambien son parte del cuidado.',
    source: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6170132/',
    sourceLabel: 'Revision clinica',
  },
  {
    name: 'Sarah E. Ullman y Mark Relyea',
    role: 'Investigacion sobre apoyo social y violencia sexual',
    text: 'Lo que responde el entorno cambia el curso de la recuperacion. Culpar o tomar el control en nombre de quien conto se asocia a peores resultados que simplemente escuchar.',
    source: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4349407/',
    sourceLabel: 'Psychology of Women Quarterly, 2015',
  },
  {
    name: 'Ministerio de Salud y Proteccion Social de Colombia',
    role: 'Resolucion 459 de 2012',
    text: 'En Colombia la atencion a victimas de violencia sexual es una urgencia medica de obligatorio cumplimiento: no puede condicionarse a una denuncia previa ni negarse por afiliacion.',
    source: 'https://www.icbf.gov.co/cargues/avance/compilacion/docs/resolucion_minsaludps_0459_2012.htm',
    sourceLabel: 'Protocolo nacional, Colombia',
  },

  /* ── A partir de aquí, solo en /expertos ────────────────────────── */

  {
    name: 'Marc A. LeBeau y M. A. Montgomery',
    role: 'Toxicologia forense',
    text: 'La deteccion depende del tiempo, el metabolismo, la muestra y la capacidad del laboratorio. Un resultado toxicologico no puede reconstruir por si solo lo ocurrido.',
    source: 'https://pubmed.ncbi.nlm.nih.gov/26242451/',
    sourceLabel: 'Revision forense',
  },
  {
    name: 'Rebecca Campbell',
    role: 'Psicologia comunitaria, Universidad Estatal de Michigan',
    text: 'Buscar ayuda despues de una agresion puede volverse una segunda herida cuando las instituciones responden con sospecha, demoras o preguntas que culpan.',
    source: 'https://eric.ed.gov/?id=EJ824547',
    sourceLabel: 'American Psychologist, 2008',
  },
  {
    name: 'Emily R. Dworkin y equipo',
    role: 'Psicologia clinica, revision y metaanalisis',
    text: 'El impacto no se limita al estres postraumatico: aparece en depresion, ansiedad, consumo de sustancias y riesgo suicida. Reducirlo a un solo diagnostico deja gente sin atencion.',
    source: 'https://pubmed.ncbi.nlm.nih.gov/28689071/',
    sourceLabel: 'Clinical Psychology Review, 2017',
  },
  {
    name: 'Organizacion Mundial de la Salud',
    role: 'Directrices clinicas y de politica publica',
    text: 'La primera linea de atencion no es interrogar ni denunciar por la persona: es escuchar, no presionar, validar y ofrecer informacion para que decida sobre los pasos siguientes.',
    source: 'https://www.who.int/publications/i/item/9789241548595',
    sourceLabel: 'Directrices OMS, 2013',
  },
  {
    name: 'Organizacion Mundial de la Salud',
    role: 'Estimaciones globales de prevalencia',
    text: 'Alrededor de una de cada tres mujeres en el mundo ha vivido violencia fisica o sexual. Lo que se cuenta en privado no es un caso aislado ni una rareza estadistica.',
    source: 'https://www.who.int/publications/i/item/9789240022256',
    sourceLabel: 'Estimaciones de prevalencia 2018, publicadas en 2021',
  },
  {
    name: 'SAMHSA, Departamento de Salud de EE. UU.',
    role: 'Protocolo de atencion informada por trauma',
    text: 'Una atencion informada por trauma parte de no volver a dañar: reconocer el impacto, dar control sobre el proceso y evitar que el entorno repita la dinamica de la agresion.',
    source: 'https://library.samhsa.gov/product/tip-57-trauma-informed-care-behavioral-health-services/sma14-4816',
    sourceLabel: 'TIP 57, SAMHSA',
  },
  {
    name: 'Instituto Nacional de Medicina Legal y Ciencias Forenses',
    role: 'Reglamento tecnico forense, Colombia',
    text: 'El examen forense tiene tiempos y procedimientos definidos, y requiere consentimiento informado en cada paso. Conocerlos de antemano permite decidir sin quedar a merced del momento.',
    source: 'https://repository.iom.int/handle/20.500.11788/707',
    sourceLabel: 'Reglamento tecnico, delito sexual',
  },

  /* ── Las diez nuevas ────────────────────────────────────────────── */

  {
    name: 'Adam R. Winstock y equipo, revision toxicologica global',
    role: 'Epidemiologia de la sumision quimica',
    text: 'La sustancia mas encontrada en los casos analizados es el alcohol, sola o combinada. La imagen de la gota furtiva existe, pero deja fuera a la mayoria de las personas afectadas.',
    source: 'https://pubmed.ncbi.nlm.nih.gov/28284121/',
    sourceLabel: 'Revision sistematica global, 2017',
  },
  {
    name: 'Dean G. Kilpatrick y equipo',
    role: 'Centro Nacional de Victimas del Crimen, EE. UU.',
    text: 'Las agresiones facilitadas por sustancias se denuncian aun menos que las forzadas. La duda sobre la propia memoria es, en la practica, una barrera de acceso a la justicia.',
    source: 'https://www.ojp.gov/ncjrs/virtual-library/abstracts/drug-facilitated-incapacitated-and-forcible-rape-national-study',
    sourceLabel: 'Estudio nacional, Departamento de Justicia de EE. UU.',
  },
  {
    name: 'Jesus de la Torre Laso',
    role: 'Psicologia juridica, Universidad de Salamanca',
    text: 'La inmovilidad tonica sigue siendo malinterpretada en salas de audiencia como falta de resistencia. Nombrarla con precision es lo que permite que deje de usarse en contra de quien la vivio.',
    source: 'https://journals.sagepub.com/doi/abs/10.1177/15248380231191232',
    sourceLabel: 'Trauma, Violence & Abuse, 2024',
  },
  {
    name: 'Edna B. Foa y equipo',
    role: 'Psiquiatria, Universidad de Pensilvania',
    text: 'Existen tratamientos con eficacia demostrada en ensayos controlados para el estres postraumatico tras una agresion sexual. El dano no es permanente por definicion, y pedir ayuda tarde sigue sirviendo.',
    source: 'https://jamanetwork.com/journals/jama/fullarticle/1793800',
    sourceLabel: 'JAMA, 2013',
  },
  {
    name: 'Rebecca Campbell, Debra Patterson y equipo',
    role: 'Evaluacion de programas de enfermeria forense',
    text: 'Donde existen equipos de enfermeria forense especializada mejora la calidad de la evidencia y el trato recibido. Quien atiende no es un detalle administrativo del proceso.',
    source: 'https://pubmed.ncbi.nlm.nih.gov/24875379/',
    sourceLabel: 'Journal of Interpersonal Violence, 2014',
  },
  {
    name: 'Ann L. Coker y equipo',
    role: 'Salud publica, Universidad de Kentucky',
    text: 'Los programas que entrenan a testigos para intervenir reducen la violencia medida en los entornos donde se aplican. Prevenir no es tarea de quien podria ser agredido, sino de quien esta alrededor.',
    source: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6422968/',
    sourceLabel: 'American Journal of Preventive Medicine, 2017',
  },
  {
    name: 'Ministerio de Salud y Proteccion Social de Colombia',
    role: 'Instructivo de profilaxis posexposicion',
    text: 'La profilaxis frente al VIH tiene una ventana corta y perderla no se recupera. Conocer el plazo antes de necesitarlo es la diferencia entre una decision y una noticia dada demasiado tarde.',
    source: 'https://www.minsalud.gov.co/sites/rid/Lists/BibliotecaDigital/RIDE/VS/PP/Instructivo-profilaxis-2014.pdf',
    sourceLabel: 'Instructivo kit PEP, Colombia',
  },
  {
    name: 'Rikke Faldborg y equipo',
    role: 'Toxicologia analitica',
    text: 'Sustancias como el GHB desaparecen del cuerpo en horas y la investigacion trabaja en marcadores que amplien esa ventana. Un examen negativo puede significar solo que se llego tarde al laboratorio.',
    source: 'https://analyticalsciencejournals.onlinelibrary.wiley.com/doi/10.1002/dta.3956',
    sourceLabel: 'Drug Testing and Analysis, 2025',
  },
  {
    name: 'Kathryn J. Holland y equipo',
    role: 'Investigacion sobre revelacion y respuesta institucional',
    text: 'Muchas personas cuentan primero a alguien cercano y no a una institucion. La calidad de esa primera respuesta informal pesa mas en la recuperacion que cualquier formulario posterior.',
    source: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4593716/',
    sourceLabel: 'Estudio sobre busqueda de ayuda',
  },
  {
    name: 'Grupo de estudio de inmovilidad tonica y disociacion',
    role: 'Psiquiatria clinica, seguimiento longitudinal',
    text: 'La disociacion durante el hecho predice la severidad de los sintomas posteriores. Sentirse ausente o fuera del propio cuerpo no es una exageracion del relato: es un dato clinico.',
    source: 'https://onlinelibrary.wiley.com/doi/10.1002/jts.23182',
    sourceLabel: 'Journal of Traumatic Stress, 2025',
  },
];
