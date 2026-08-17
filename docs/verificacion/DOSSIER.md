# Lo que hay que firmar

> **Este archivo no se edita a mano.** Lo escribe `npm run dossier` a
> partir de `src/js/reloj.js`, `src/datos/expertos.js` y
> `src/componentes/Ayuda.astro`, que es de donde el sitio saca lo que
> publica. Editarlo aquí haría que dijera una cosa y el sitio otra.

**Huella de este contenido: `b0bb7db776d6`** — 37 afirmaciones
enumeradas, más una última al final que las cruza todas.

Quien firme, que anote esta huella junto a su nombre. Si algún día no
coincide con la que devuelve `npm run dossier`, es que el sitio cambió
después de la firma y la firma ya no lo cubre.

---

## Qué se pide, exactamente

Que una persona con criterio clínico o forense **en Colombia** lea las
afirmaciones de abajo y diga, en cada una, si es correcta, incorrecta o
necesita un matiz. No se pide auditar el sitio, ni revisar el diseño, ni
responsabilizarse de nada más: se pide leer una lista con la cita
delante.

Lo que se necesita de vuelta es un documento —o un correo— con:

- nombre, cargo y registro profesional;
- la fecha;
- la huella de arriba;
- y las correcciones, si las hay.

Eso se guarda en este mismo directorio y es lo que permite poner
`VERIFICADO = true` en `src/datos/sitio.js`. Hasta entonces el sitio
lleva `noindex` en todas sus páginas y el `robots.txt` prohíbe el
paso: no aparece en ningún buscador, a propósito.

## Las dos fuentes que ya se usaron

Los números de abajo no salen de la nada: se contrastaron contra estos
dos documentos. Lo que falta es que alguien confirme que **siguen
vigentes** y que la lectura es la correcta.

- **Protocolo de Atención en salud para Víctimas de Violencia Sexual** — Ministerio de Salud y Protección Social de Colombia. Actualización del protocolo adoptado por la Resolución 459 de 2012.
  https://consultorsalud.com/wp-content/uploads/2020/12/Actualizacion-Protocolo-de-Atencion-en-salud-para-Victimas-de-Violencia-Sexual.pdf
- **Reglamento Técnico para el Abordaje Forense Integral de la Víctima en la Investigación del Delito Sexual** — Instituto Nacional de Medicina Legal y Ciencias Forenses. R.T. INML-CF-01.
  https://repository.iom.int/handle/20.500.11788/707

Hay una duda concreta y anotada en el código: el protocolo de salud que
se usó es la actualización que deroga la Resolución 459 de 2012, y falta
comprobar bajo qué número quedó publicada.

---

## 1. Los plazos

Son los números con los que alguien decide a qué hora sale de su casa.
El sitio los dibuja a escala en el bloque «Estás aquí» de la portada,
y cada uno enciende o apaga una fila según el momento que se elija.

### 1.1 Muestra toxicológica — **96 h**

*El sitio dice:* «La de orina sirve hasta cuatro días después. Cuanto antes, mejor: las sustancias se van con las horas.»

*Y añade:* «Son dos muestras distintas. La de sangre solo sirve en las primeras seis horas; la de orina llega hasta las noventa y seis, que son cuatro días.»

*Cuando el plazo pasó dice:* «La ventana de orina —cuatro días— probablemente ya pasó. Cuéntalo igual: queda registrado, y todo lo demás de esta lista sigue abierto.»

*Sale de:* Protocolo de Atención en salud para Víctimas de Violencia Sexual — Ministerio de Salud y Protección Social de Colombia.

*Cita:* Tabla 10: «Cuantitativas en sangre (alcohol y otras sustancias depresoras si los hechos ocurrieron en las 6 horas previas). Cualitativas en orina (otras sustancias depresoras si los hechos ocurrieron en las 96 horas previas)».


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


### 1.2 Examen médico-legal — **72 h**

*El sitio dice:* «Recoge señales que después ya no están. Dentro de las primeras 72 horas cuenta como urgencia: no te pueden hacer esperar turno.»

*Y añade:* «Lo hace Medicina Legal o el hospital habilitado. No hace falta haber denunciado para que te lo hagan.»

*Cuando el plazo pasó dice:* «Pasadas las 72 horas ya no es una urgencia médico-legal, pero el examen se sigue haciendo y sigue sirviendo.»

*Sale de:* Reglamento Técnico para el Abordaje Forense Integral de la Víctima en la Investigación del Delito Sexual — Instituto Nacional de Medicina Legal y Ciencias Forenses.

*Cita:* «Durante las primeras 72 horas desde el momento de la ocurrencia de los hechos, el abordaje integral forense de la víctima en la investigación del delito sexual constituye una urgencia medicolegal y por tanto debe ser atendida como tal».


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


### 1.3 Profilaxis del VIH (PEP) — **72 h**

*El sitio dice:* «Se empiezan dentro de las 72 horas. Cuanto antes, mejor: las primeras horas cuentan.»

*Y añade:* «Se piden en urgencias. No hace falta denunciar para que te las den.»

*Cuando el plazo pasó dice:* «Pasadas las 72 horas estas pastillas ya no se indican. Sí siguen abiertas las pruebas y el tratamiento si hicieran falta.»

*Sale de:* Protocolo de Atención en salud para Víctimas de Violencia Sexual — Ministerio de Salud y Protección Social de Colombia.

*Cita:* «la profilaxis para VIH en todos los casos de violencia sexual (...) dentro de las primeras 72 horas después de la agresión».


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


### 1.4 Anticoncepción de emergencia — **120 h**

*El sitio dice:* «Hasta cinco días. Cuanto antes se tome, mejor funciona.»

*Y añade:* «En urgencias o en farmacia. Hay más de una opción y no todas duran lo mismo; en urgencias te dicen cuál te sirve.»

*Cuando el plazo pasó dice:* «Pasados los cinco días esta ventana se cerró. Si te preocupa un embarazo, en urgencias pueden hacer una prueba y contarte qué opciones hay.»

*Sale de:* Protocolo de Atención en salud para Víctimas de Violencia Sexual — Ministerio de Salud y Protección Social de Colombia.

*Cita:* «Opciones de anticoncepción de emergencia para administrar hasta las 120 horas de ocurrida la violencia sexual». Para el tramo final: «Si los hechos ocurrieron entre las 72 horas y los 5 días anteriores iniciar anticoncepción de emergencia con Levonorgestrel».


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


### 1.5 Atención médica — **sin plazo**

*El sitio dice:* «No caduca. Es una urgencia y no te pueden pedir que denuncies ni que expliques lo que pasó.»

*Y añade:* «Cualquier institución de salud está obligada a atenderte, sea del régimen que sea.»

*Sale de:* Protocolo de Atención en salud para Víctimas de Violencia Sexual — Ministerio de Salud y Protección Social de Colombia.

*Cita:* El protocolo es de obligatorio cumplimiento para las entidades promotoras de salud y las instituciones prestadoras de servicios de salud en la atención de víctimas de violencia sexual.


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


### 1.6 Denunciar, si quieres — **sin plazo**

*El sitio dice:* «No tiene plazo y no es obligatorio. Se puede hacer por internet.»

*Y añade:* «Que te atiendan en salud no depende nunca de que denuncies.»

*Sale de:* Protocolo de Atención en salud para Víctimas de Violencia Sexual — Ministerio de Salud y Protección Social de Colombia.

*Cita:* La atención en salud es independiente del proceso judicial: el protocolo la define como urgencia y no la condiciona a la denuncia.


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


---

## 2. Lo que se pide hacer en las primeras horas

No son plazos: son instrucciones sobre el cuerpo y la ropa que
afectan a lo que después se pueda encontrar. Cada una lleva su «y si
ya lo hiciste» a propósito —una lista de consejos sin esa línea es
una lista de reproches—, y esa línea también es una afirmación:
dice que haber hecho algo no cancela el examen.

### 2.1 Si puedes, no te duches todavía

*Por qué, según el sitio:* «El agua se lleva las señales que el examen busca.»

*Y si ya lo hizo:* «Si ya te duchaste, ve igual. Lo anotan y sigue adelante: el examen no se cancela por eso.»

*Sale de:* Reglamento Técnico para el Abordaje Forense Integral de la Víctima en la Investigación del Delito Sexual — Instituto Nacional de Medicina Legal y Ciencias Forenses.


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


### 2.2 Guarda la ropa que llevabas en una bolsa de papel

*Por qué, según el sitio:* «De papel, no de plástico: el plástico retiene la humedad y echa a perder lo que hay en la tela. Si está mojada, déjala secar al aire antes de guardarla, y no la sacudas.»

*Y si ya lo hizo:* «Si ya la lavaste o la tiraste, no pasa nada. Lleva lo que tengas, aunque sea otra prenda.»

*Sale de:* Reglamento Técnico para el Abordaje Forense Integral de la Víctima en la Investigación del Delito Sexual — Instituto Nacional de Medicina Legal y Ciencias Forenses.


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


### 2.3 Si aguantas las ganas de orinar, guarda la primera

*Por qué, según el sitio:* «La prueba de orina es la que más dura —hasta cuatro días— y la primera es la que más dice.»

*Y si ya lo hizo:* «Si ya orinaste, la ventana sigue abierta igual: son cuatro días, no una sola oportunidad.»

*Sale de:* Protocolo de Atención en salud para Víctimas de Violencia Sexual — Ministerio de Salud y Protección Social de Colombia.


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


### 2.4 Si hubo contacto con la boca, no te cepilles los dientes

*Por qué, según el sitio:* «Ni enjuague bucal, ni comer, ni beber, si puedes evitarlo.»

*Y si ya lo hizo:* «Y si ya te cepillaste, sigue valiendo la pena: el reglamento dice que cepillarse no descarta encontrar nada en un hecho reciente.»

*Sale de:* Reglamento Técnico para el Abordaje Forense Integral de la Víctima en la Investigación del Delito Sexual — Instituto Nacional de Medicina Legal y Ciencias Forenses.


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


### 2.5 No laves ni tires nada de lo que había alrededor

*Por qué, según el sitio:* «Sábanas, toallas, el vaso, el preservativo. Cualquier cosa puede servir.»

*Y si ya lo hizo:* «Si ya se limpió, sigue habiendo mucho que hacer. Esto no es una condición para nada.»

*Sale de:* Reglamento Técnico para el Abordaje Forense Integral de la Víctima en la Investigación del Delito Sexual — Instituto Nacional de Medicina Legal y Ciencias Forenses.


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


---

## 3. Las líneas

Un número que no contesta a las tres de la mañana es peor que no dar
ninguno: quien llama ya hizo el gasto de decidirse.

### 3.1 Línea 155

*El sitio dice:* «Orientación a víctimas de violencia. Nacional y gratuita desde cualquier teléfono en Colombia; marca al tocar.»

*Qué hay que comprobar:*

- ¿Sigue activa y sigue siendo gratuita desde fijo y desde móvil?
- ¿Atiende de verdad orientación en violencia sexual, o deriva?
- ¿Tiene horario, o es 24 horas? El sitio no dice horario: si lo tiene, hay que escribirlo.


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


### 3.2 SALVIA (Ministerio de Igualdad y Equidad)

*El sitio dice:* «Del Ministerio de Igualdad y Equidad. Orienta y activa rutas de atención sin exigir una llamada.»

*Qué hay que comprobar:*

- ¿La dirección sigue siendo esa y el servicio sigue en pie?
- ¿«Activa rutas de atención» describe lo que hace, o promete de más?


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


### 3.3 Línea 123

*El sitio dice:* «La línea de emergencias, para cuando hay riesgo ahora mismo. Junto a ella: «La atención en salud nunca exige denunciar».»

*Qué hay que comprobar:*

- ¿123 es la línea correcta en todo el país, o cambia por ciudad?
- ¿La frase sobre no exigir denuncia está bien dicha para cualquier institución de salud, sea del régimen que sea?


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


---

## 4. Las tarjetas del panel

Son 23. Cada una es una síntesis en dos frases de un
trabajo publicado, con enlace al trabajo. Lo que hay que comprobar no
es si el trabajo es bueno: es si **la síntesis dice lo que dice el
trabajo**, y si no le añade una certeza que el original no tiene.

Se pueden revisar por encima y marcar solo las que chirríen: una
sola mal resumida es la que hace daño.

### 4.1 Laurie Fields y equipo — Investigación clínica en psicotraumatología

*Síntesis publicada:* «La memoria incompleta no impide que aparezcan síntomas intensos. El cuidado no debe exigir reconstruir el episodio para reconocer lo que dejó.»

*Fuente:* Estudio clínico, 2022 — https://pmc.ncbi.nlm.nih.gov/articles/PMC9090424/


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


### 4.2 Anna Moller, Hans Peter Sondergaard y Lotti Helstrom — Ginecología y psiquiatría, Instituto Karolinska

*Síntesis publicada:* «La parálisis involuntaria durante una agresión fue la reacción más frecuente en su cohorte, no la excepción. No haberse defendido no dice nada sobre si hubo consentimiento.»

*Fuente:* Acta Obstetricia et Gynecologica Scandinavica, 2017 — https://obgyn.onlinelibrary.wiley.com/doi/10.1111/aogs.13174


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


### 4.3 James Hopper y David Lisak — Psicología, Facultad de Medicina de Harvard

*Síntesis publicada:* «Un relato fragmentado y sin orden no es un relato poco fiable. El cerebro bajo amenaza graba fragmentos sensoriales intensos antes que una secuencia ordenada.»

*Fuente:* Harvard Medical School, 2014 — https://hms.harvard.edu/news/why-rape-trauma-survivors-have-fragmented-incomplete-memories


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


### 4.4 Srikala Subramanian, MD, y Jennifer Green, RN — Atención médica y enfermería forense

*Síntesis publicada:* «Una respuesta estabilizadora y compasiva devuelve margen de elección: explicar cada paso, pedir permiso y permitir detenerlo también son parte del cuidado.»

*Fuente:* Revisión clínica — https://pmc.ncbi.nlm.nih.gov/articles/PMC6170132/


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


### 4.5 Sarah E. Ullman y Mark Relyea — Investigación sobre apoyo social y violencia sexual

*Síntesis publicada:* «Lo que responde el entorno cambia el curso de la recuperación. Culpar o tomar el control en nombre de quien contó se asocia a peores resultados que simplemente escuchar.»

*Fuente:* Psychology of Women Quarterly, 2015 — https://pmc.ncbi.nlm.nih.gov/articles/PMC4349407/


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


### 4.6 Ministerio de Salud y Protección Social de Colombia — Resolución 459 de 2012

*Síntesis publicada:* «En Colombia la atención a víctimas de violencia sexual es una urgencia médica de obligatorio cumplimiento: no puede condicionarse a una denuncia previa ni negarse por afiliación.»

*Fuente:* Protocolo nacional, Colombia — https://www.icbf.gov.co/cargues/avance/compilacion/docs/resolucion_minsaludps_0459_2012.htm


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


### 4.7 Marc A. LeBeau y M. A. Montgomery — Toxicología forense

*Síntesis publicada:* «La detección depende del tiempo, el metabolismo, la muestra y la capacidad del laboratorio. Un resultado toxicológico no puede reconstruir por sí solo lo ocurrido.»

*Fuente:* Revisión forense — https://pubmed.ncbi.nlm.nih.gov/26242451/


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


### 4.8 Rebecca Campbell — Psicología comunitaria, Universidad Estatal de Michigan

*Síntesis publicada:* «Buscar ayuda después de una agresión puede volverse una segunda herida cuando las instituciones responden con sospecha, demoras o preguntas que culpan.»

*Fuente:* American Psychologist, 2008 — https://eric.ed.gov/?id=EJ824547


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


### 4.9 Emily R. Dworkin y equipo — Psicología clínica, revisión y metaanálisis

*Síntesis publicada:* «El impacto no se limita al estrés postraumático: aparece en depresión, ansiedad, consumo de sustancias y riesgo suicida. Reducirlo a un solo diagnóstico deja gente sin atención.»

*Fuente:* Clinical Psychology Review, 2017 — https://pubmed.ncbi.nlm.nih.gov/28689071/


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


### 4.10 Organización Mundial de la Salud — Directrices clínicas y de política pública

*Síntesis publicada:* «La primera línea de atención no es interrogar ni denunciar por la persona: es escuchar, no presionar, validar y ofrecer información para que decida sobre los pasos siguientes.»

*Fuente:* Directrices OMS, 2013 — https://www.who.int/publications/i/item/9789241548595


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


### 4.11 Organización Mundial de la Salud — Estimaciones globales de prevalencia

*Síntesis publicada:* «Alrededor de una de cada tres mujeres en el mundo ha vivido violencia física o sexual. Lo que se cuenta en privado no es un caso aislado ni una rareza estadística.»

*Fuente:* Estimaciones de prevalencia 2018, publicadas en 2021 — https://www.who.int/publications/i/item/9789240022256


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


### 4.12 SAMHSA, Departamento de Salud de EE. UU. — Protocolo de atención informada por trauma

*Síntesis publicada:* «Una atención informada por trauma parte de no volver a dañar: reconocer el impacto, dar control sobre el proceso y evitar que el entorno repita la dinámica de la agresión.»

*Fuente:* TIP 57, SAMHSA — https://library.samhsa.gov/product/tip-57-trauma-informed-care-behavioral-health-services/sma14-4816


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


### 4.13 Instituto Nacional de Medicina Legal y Ciencias Forenses — Reglamento técnico forense, Colombia

*Síntesis publicada:* «El examen forense tiene tiempos y procedimientos definidos, y requiere consentimiento informado en cada paso. Conocerlos de antemano permite decidir sin quedar a merced del momento.»

*Fuente:* Reglamento técnico, delito sexual — https://repository.iom.int/handle/20.500.11788/707


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


### 4.14 Adam R. Winstock y equipo, revisión toxicológica global — Epidemiología de la sumisión química

*Síntesis publicada:* «La sustancia más encontrada en los casos analizados es el alcohol, sola o combinada. La imagen de la gota furtiva existe, pero deja fuera a la mayoría de las personas afectadas.»

*Fuente:* Revisión sistemática global, 2017 — https://pubmed.ncbi.nlm.nih.gov/28284121/


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


### 4.15 Dean G. Kilpatrick y equipo — Centro Nacional de Víctimas del Crimen, EE. UU.

*Síntesis publicada:* «Las agresiones facilitadas por sustancias se denuncian aún menos que las forzadas. La duda sobre la propia memoria es, en la práctica, una barrera de acceso a la justicia.»

*Fuente:* Estudio nacional, Departamento de Justicia de EE. UU. — https://www.ojp.gov/ncjrs/virtual-library/abstracts/drug-facilitated-incapacitated-and-forcible-rape-national-study


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


### 4.16 Jesús de la Torre Laso — Psicología jurídica, Universidad de Salamanca

*Síntesis publicada:* «La inmovilidad tónica sigue siendo malinterpretada en salas de audiencia como falta de resistencia. Nombrarla con precisión es lo que permite que deje de usarse en contra de quien la vivió.»

*Fuente:* Trauma, Violence & Abuse, 2024 — https://journals.sagepub.com/doi/abs/10.1177/15248380231191232


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


### 4.17 Edna B. Foa y equipo — Psiquiatría, Universidad de Pensilvania

*Síntesis publicada:* «Existen tratamientos con eficacia demostrada en ensayos controlados para el estrés postraumático tras una agresión sexual. El daño no es permanente por definición, y pedir ayuda tarde sigue sirviendo.»

*Fuente:* JAMA, 2013 — https://jamanetwork.com/journals/jama/fullarticle/1793800


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


### 4.18 Rebecca Campbell, Debra Patterson y equipo — Evaluación de programas de enfermería forense

*Síntesis publicada:* «Donde existen equipos de enfermería forense especializada mejora la calidad de la evidencia y el trato recibido. Quien atiende no es un detalle administrativo del proceso.»

*Fuente:* Journal of Interpersonal Violence, 2014 — https://pubmed.ncbi.nlm.nih.gov/24875379/


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


### 4.19 Ann L. Coker y equipo — Salud pública, Universidad de Kentucky

*Síntesis publicada:* «Los programas que entrenan a testigos para intervenir reducen la violencia medida en los entornos donde se aplican. Prevenir no es tarea de quien podría ser agredido, sino de quien está alrededor.»

*Fuente:* American Journal of Preventive Medicine, 2017 — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6422968/


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


### 4.20 Ministerio de Salud y Protección Social de Colombia — Instructivo de profilaxis posexposición

*Síntesis publicada:* «La profilaxis frente al VIH tiene una ventana corta y perderla no se recupera. Conocer el plazo antes de necesitarlo es la diferencia entre una decisión y una noticia dada demasiado tarde.»

*Fuente:* Instructivo kit PEP, Colombia — https://www.minsalud.gov.co/sites/rid/Lists/BibliotecaDigital/RIDE/VS/PP/Instructivo-profilaxis-2014.pdf


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


### 4.21 Rikke Faldborg y equipo — Toxicología analítica

*Síntesis publicada:* «Sustancias como el GHB desaparecen del cuerpo en horas y la investigación trabaja en marcadores que amplíen esa ventana. Un examen negativo puede significar solo que se llegó tarde al laboratorio.»

*Fuente:* Drug Testing and Analysis, 2025 — https://analyticalsciencejournals.onlinelibrary.wiley.com/doi/10.1002/dta.3956


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


### 4.22 Kathryn J. Holland y equipo — Investigación sobre revelación y respuesta institucional

*Síntesis publicada:* «Muchas personas cuentan primero a alguien cercano y no a una institución. La calidad de esa primera respuesta informal pesa más en la recuperación que cualquier formulario posterior.»

*Fuente:* Estudio sobre búsqueda de ayuda — https://pmc.ncbi.nlm.nih.gov/articles/PMC4593716/


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_


### 4.23 Grupo de estudio de inmovilidad tónica y disociación — Psiquiatría clínica, seguimiento longitudinal

*Síntesis publicada:* «La disociación durante el hecho predice la severidad de los síntomas posteriores. Sentirse ausente o fuera del propio cuerpo no es una exageración del relato: es un dato clínico.»

*Fuente:* Journal of Traumatic Stress, 2025 — https://onlinelibrary.wiley.com/doi/10.1002/jts.23182


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_

---

## Y una última, que no es un dato

El sitio afirma en varios sitios que **la atención en salud no exige
denunciar** y que **no se puede condicionar a nada**. Es la frase que
más peso carga de todo el proyecto: si es inexacta, manda a alguien a
una urgencia con una expectativa que no se cumple.


> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices
>
> _Corrección o matiz:_

