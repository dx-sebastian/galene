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

   ── Y SE ESCRIBE CON TILDES ────────────────────────────────────────
   Esta lista estuvo entera sin ellas. En una página que se titula «Lo
   que la evidencia permite decir», la ortografía no es una cuestión de
   estilo: es la primera prueba que hace alguien que está decidiendo si
   puede fiarse de lo que lee. `pruebas/e2e/ortografia.spec.js` recorre
   el HTML compilado y tumba el despliegue si vuelven a caerse.
   ═══════════════════════════════════════════════════════════════════ */

/* ── CUÁNTAS SE PINTAN EN LA PORTADA ────────────────────────────────
   Eran seis, y ocupaban 2 717 px: un 23 % de una portada que medía 12,7
   pantallas en un teléfono. El argumento de las seis era bueno —«están
   para leerse, no para ojearse»— y sigue valiendo; lo que no valía era
   el número. Nadie lee seis síntesis clínicas seguidas en mitad de una
   página: se leen dos, se ojean cuatro y se baja.

   Tres se leen. Y las tres primeras son a propósito las que contestan
   lo que alguien se pregunta en la primera hora —por qué no me defendí,
   por qué no recuerdo— que es el orden en que está escrita esta lista.
   Las veinte restantes viven en /expertos, a un toque y con la cuenta
   escrita en el enlace. */
export const LIMITE_PORTADA = 3;

export const EXPERTOS = [
  {
    name: 'Laurie Fields y equipo',
    role: 'Investigación clínica en psicotraumatología',
    text: 'La memoria incompleta no impide que aparezcan síntomas intensos. El cuidado no debe exigir reconstruir el episodio para reconocer lo que dejó.',
    source: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9090424/',
    sourceLabel: 'Estudio clínico, 2022',
  },
  {
    name: 'Anna Moller, Hans Peter Sondergaard y Lotti Helstrom',
    role: 'Ginecología y psiquiatría, Instituto Karolinska',
    text: 'La parálisis involuntaria durante una agresión fue la reacción más frecuente en su cohorte, no la excepción. No haberse defendido no dice nada sobre si hubo consentimiento.',
    source: 'https://obgyn.onlinelibrary.wiley.com/doi/10.1111/aogs.13174',
    sourceLabel: 'Acta Obstetricia et Gynecologica Scandinavica, 2017',
  },
  {
    name: 'James Hopper y David Lisak',
    role: 'Psicología, Facultad de Medicina de Harvard',
    text: 'Un relato fragmentado y sin orden no es un relato poco fiable. El cerebro bajo amenaza graba fragmentos sensoriales intensos antes que una secuencia ordenada.',
    source: 'https://hms.harvard.edu/news/why-rape-trauma-survivors-have-fragmented-incomplete-memories',
    sourceLabel: 'Harvard Medical School, 2014',
  },
  {
    name: 'Srikala Subramanian, MD, y Jennifer Green, RN',
    role: 'Atención médica y enfermería forense',
    text: 'Una respuesta estabilizadora y compasiva devuelve margen de elección: explicar cada paso, pedir permiso y permitir detenerlo también son parte del cuidado.',
    source: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6170132/',
    sourceLabel: 'Revisión clínica',
  },
  {
    name: 'Sarah E. Ullman y Mark Relyea',
    role: 'Investigación sobre apoyo social y violencia sexual',
    text: 'Lo que responde el entorno cambia el curso de la recuperación. Culpar o tomar el control en nombre de quien contó se asocia a peores resultados que simplemente escuchar.',
    source: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4349407/',
    sourceLabel: 'Psychology of Women Quarterly, 2015',
  },
  {
    name: 'Ministerio de Salud y Protección Social de Colombia',
    role: 'Resolución 459 de 2012',
    text: 'En Colombia la atención a víctimas de violencia sexual es una urgencia médica de obligatorio cumplimiento: no puede condicionarse a una denuncia previa ni negarse por afiliación.',
    source: 'https://www.icbf.gov.co/cargues/avance/compilacion/docs/resolucion_minsaludps_0459_2012.htm',
    sourceLabel: 'Protocolo nacional, Colombia',
  },

  /* ── A partir de aquí, solo en /expertos ────────────────────────── */

  {
    name: 'Marc A. LeBeau y M. A. Montgomery',
    role: 'Toxicología forense',
    text: 'La detección depende del tiempo, el metabolismo, la muestra y la capacidad del laboratorio. Un resultado toxicológico no puede reconstruir por sí solo lo ocurrido.',
    source: 'https://pubmed.ncbi.nlm.nih.gov/26242451/',
    sourceLabel: 'Revisión forense',
  },
  {
    name: 'Rebecca Campbell',
    role: 'Psicología comunitaria, Universidad Estatal de Michigan',
    text: 'Buscar ayuda después de una agresión puede volverse una segunda herida cuando las instituciones responden con sospecha, demoras o preguntas que culpan.',
    source: 'https://eric.ed.gov/?id=EJ824547',
    sourceLabel: 'American Psychologist, 2008',
  },
  {
    name: 'Emily R. Dworkin y equipo',
    role: 'Psicología clínica, revisión y metaanálisis',
    text: 'El impacto no se limita al estrés postraumático: aparece en depresión, ansiedad, consumo de sustancias y riesgo suicida. Reducirlo a un solo diagnóstico deja gente sin atención.',
    source: 'https://pubmed.ncbi.nlm.nih.gov/28689071/',
    sourceLabel: 'Clinical Psychology Review, 2017',
  },
  {
    name: 'Organización Mundial de la Salud',
    role: 'Directrices clínicas y de política pública',
    text: 'La primera línea de atención no es interrogar ni denunciar por la persona: es escuchar, no presionar, validar y ofrecer información para que decida sobre los pasos siguientes.',
    source: 'https://www.who.int/publications/i/item/9789241548595',
    sourceLabel: 'Directrices OMS, 2013',
  },
  {
    name: 'Organización Mundial de la Salud',
    role: 'Estimaciones globales de prevalencia',
    text: 'Alrededor de una de cada tres mujeres en el mundo ha vivido violencia física o sexual. Lo que se cuenta en privado no es un caso aislado ni una rareza estadística.',
    source: 'https://www.who.int/publications/i/item/9789240022256',
    sourceLabel: 'Estimaciones de prevalencia 2018, publicadas en 2021',
  },
  {
    name: 'SAMHSA, Departamento de Salud de EE. UU.',
    role: 'Protocolo de atención informada por trauma',
    text: 'Una atención informada por trauma parte de no volver a dañar: reconocer el impacto, dar control sobre el proceso y evitar que el entorno repita la dinámica de la agresión.',
    source: 'https://library.samhsa.gov/product/tip-57-trauma-informed-care-behavioral-health-services/sma14-4816',
    sourceLabel: 'TIP 57, SAMHSA',
  },
  {
    name: 'Instituto Nacional de Medicina Legal y Ciencias Forenses',
    role: 'Reglamento técnico forense, Colombia',
    text: 'El examen forense tiene tiempos y procedimientos definidos, y requiere consentimiento informado en cada paso. Conocerlos de antemano permite decidir sin quedar a merced del momento.',
    source: 'https://repository.iom.int/handle/20.500.11788/707',
    sourceLabel: 'Reglamento técnico, delito sexual',
  },

  /* ── Las diez nuevas ────────────────────────────────────────────── */

  {
    name: 'Adam R. Winstock y equipo, revisión toxicológica global',
    role: 'Epidemiología de la sumisión química',
    text: 'La sustancia más encontrada en los casos analizados es el alcohol, sola o combinada. La imagen de la gota furtiva existe, pero deja fuera a la mayoría de las personas afectadas.',
    source: 'https://pubmed.ncbi.nlm.nih.gov/28284121/',
    sourceLabel: 'Revisión sistemática global, 2017',
  },
  {
    name: 'Dean G. Kilpatrick y equipo',
    role: 'Centro Nacional de Víctimas del Crimen, EE. UU.',
    text: 'Las agresiones facilitadas por sustancias se denuncian aún menos que las forzadas. La duda sobre la propia memoria es, en la práctica, una barrera de acceso a la justicia.',
    source: 'https://www.ojp.gov/ncjrs/virtual-library/abstracts/drug-facilitated-incapacitated-and-forcible-rape-national-study',
    sourceLabel: 'Estudio nacional, Departamento de Justicia de EE. UU.',
  },
  {
    name: 'Jesús de la Torre Laso',
    role: 'Psicología jurídica, Universidad de Salamanca',
    text: 'La inmovilidad tónica sigue siendo malinterpretada en salas de audiencia como falta de resistencia. Nombrarla con precisión es lo que permite que deje de usarse en contra de quien la vivió.',
    source: 'https://journals.sagepub.com/doi/abs/10.1177/15248380231191232',
    sourceLabel: 'Trauma, Violence & Abuse, 2024',
  },
  {
    name: 'Edna B. Foa y equipo',
    role: 'Psiquiatría, Universidad de Pensilvania',
    text: 'Existen tratamientos con eficacia demostrada en ensayos controlados para el estrés postraumático tras una agresión sexual. El daño no es permanente por definición, y pedir ayuda tarde sigue sirviendo.',
    source: 'https://jamanetwork.com/journals/jama/fullarticle/1793800',
    sourceLabel: 'JAMA, 2013',
  },
  {
    name: 'Rebecca Campbell, Debra Patterson y equipo',
    role: 'Evaluación de programas de enfermería forense',
    text: 'Donde existen equipos de enfermería forense especializada mejora la calidad de la evidencia y el trato recibido. Quien atiende no es un detalle administrativo del proceso.',
    source: 'https://pubmed.ncbi.nlm.nih.gov/24875379/',
    sourceLabel: 'Journal of Interpersonal Violence, 2014',
  },
  {
    name: 'Ann L. Coker y equipo',
    role: 'Salud pública, Universidad de Kentucky',
    text: 'Los programas que entrenan a testigos para intervenir reducen la violencia medida en los entornos donde se aplican. Prevenir no es tarea de quien podría ser agredido, sino de quien está alrededor.',
    source: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6422968/',
    sourceLabel: 'American Journal of Preventive Medicine, 2017',
  },
  {
    name: 'Ministerio de Salud y Protección Social de Colombia',
    role: 'Instructivo de profilaxis posexposición',
    text: 'La profilaxis frente al VIH tiene una ventana corta y perderla no se recupera. Conocer el plazo antes de necesitarlo es la diferencia entre una decisión y una noticia dada demasiado tarde.',
    source: 'https://www.minsalud.gov.co/sites/rid/Lists/BibliotecaDigital/RIDE/VS/PP/Instructivo-profilaxis-2014.pdf',
    sourceLabel: 'Instructivo kit PEP, Colombia',
  },
  {
    name: 'Rikke Faldborg y equipo',
    role: 'Toxicología analítica',
    text: 'Sustancias como el GHB desaparecen del cuerpo en horas y la investigación trabaja en marcadores que amplíen esa ventana. Un examen negativo puede significar solo que se llegó tarde al laboratorio.',
    source: 'https://analyticalsciencejournals.onlinelibrary.wiley.com/doi/10.1002/dta.3956',
    sourceLabel: 'Drug Testing and Analysis, 2025',
  },
  {
    name: 'Kathryn J. Holland y equipo',
    role: 'Investigación sobre revelación y respuesta institucional',
    text: 'Muchas personas cuentan primero a alguien cercano y no a una institución. La calidad de esa primera respuesta informal pesa más en la recuperación que cualquier formulario posterior.',
    source: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4593716/',
    sourceLabel: 'Estudio sobre búsqueda de ayuda',
  },
  {
    name: 'Grupo de estudio de inmovilidad tónica y disociación',
    role: 'Psiquiatría clínica, seguimiento longitudinal',
    text: 'La disociación durante el hecho predice la severidad de los síntomas posteriores. Sentirse ausente o fuera del propio cuerpo no es una exageración del relato: es un dato clínico.',
    source: 'https://onlinelibrary.wiley.com/doi/10.1002/jts.23182',
    sourceLabel: 'Journal of Traumatic Stress, 2025',
  },
];
