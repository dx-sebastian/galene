/* ═══════════════════════════════════════════════════════════════════
   comunidad.js — LOS DATOS DE EJEMPLO DEL FORO.

   ⚠ TODO LO DE ESTE ARCHIVO ES INVENTADO.

   La regla 3 del proyecto dice: «No fabricar personas, ni testimonios,
   ni cifras sin fuente.» Un foro con diez hilos de prueba es, por
   definición, personas y testimonios fabricados — así que la regla no se
   cumple escondiendo el hecho, sino acotando qué se inventa:

     1 · NI UNA CIFRA MÉDICA, NI UN PLAZO, NI UN NOMBRE DE ENTIDAD. Esto
         es lo que de verdad podía hacer daño: un comentario inventado
         que dijera «tienes N horas para X» sería un dato clínico sin
         fuente con la tipografía del sitio detrás. Cuando un hilo
         necesita hablar de tiempo, manda al reloj de la portada; cuando
         necesita hablar de sitios, manda al mapa. El dato vive donde
         está su fuente, y aquí no está.

     2 · NO SE RE-ESCENIFICA EL HECHO (regla 1) y NO SE PREGUNTA QUÉ PASÓ
         (regla 4). Ninguno de estos hilos cuenta la noche. Hablan de lo
         de después: cómo se dice en una ventanilla, qué se le contesta a
         alguien que acaba de contártelo, qué se mete en una mochila. Es
         lo que un foro de verdad tendría que ser aquí — y de paso es lo
         único que se puede inventar sin inventarle el dolor a nadie.

     3 · LOS NOMBRES SON DE AGUA, NO DE PERSONA. «Marea baja», «Raíz»,
         «Bruma». Nadie los va a confundir con una cuenta real, y las que
         van sin nombre van como «Anónima», que es lo que sería el valor
         por defecto si esto existiera.

   `EJEMPLO` viaja con los datos para que cualquier cosa que los consuma
   pueda saberlo. No se pinta ninguna banda en pantalla: se pidió que no,
   y la página entera es una demo.

   El tiempo va escrito a mano («hace 3 h») y además en `minutos`, que es
   lo que ordena. Sin `Date`: el sitio es estático y una fecha real se
   pudriría sola en el HTML generado.
   ═══════════════════════════════════════════════════════════════════ */

export const EJEMPLO = true;

/* ── LAS ETIQUETAS ──────────────────────────────────────────────────
   Los «flairs» de Reddit, y salen de las secciones que el sitio YA
   tiene: quien baja por la portada reconoce las mismas puertas. Cada una
   lleva su pigmento, y los pigmentos son los que ya usa la sección de
   herramientas — el azul y el rojo del ente, el verde de «ventana
   abierta», el morado del modo sombra del mapa. Ni un color nuevo. */
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

/* ── EL VOTO ────────────────────────────────────────────────────────
   Flecha arriba y flecha abajo, la mecánica de Reddit tal cual, y `votos`
   es el marcador: la suma, no dos cuentas separadas. Es lo que se pidió,
   y sustituye a un «acompañar» que solo sumaba.

   Queda dicho de dónde viene el reparo, para quien lea esto dentro de un
   año: la regla 8 del proyecto dice que nadie es castigado por su
   contexto, y una flecha hacia abajo sobre lo que alguien escribió a las
   cuatro de la mañana es la única cosa de esta página que puede hacer
   eso. Se implementa porque se pidió.

   LOS COLORES DE LAS FLECHAS NO ESTÁN AQUÍ, y estuvieron. Vivían en este
   archivo con el argumento de declarar el pigmento una sola vez, y de
   aquí salían a un `style=` en línea del componente — donde ninguna regla
   de la hoja los puede pisar, así que la variante de noche no llegaba
   nunca y la flecha votada medía 1.88:1 contra el vidrio oscuro. Ahora
   viven en `.votos` (estilos/comunidad.css) con su variante nocturna. Un
   color que necesita cambiar con la luz no puede vivir en los datos. */

/* ── LAS GARZAS COMO SELLO DE AUTORÍA ───────────────────────────────
   No hay avatares y no se van a fabricar: una foto de perfil en este
   sitio sería una cara inventada. Cada quien lleva UNA DE LAS SEIS
   POSADAS ya pintadas (`public/arte/posada/`), las mismas láminas que se
   posan en el manglar del hero. Así la comunidad es literalmente la
   bandada del árbol: el argumento del sitio dicho sin decirlo. */
export const POSES = ['reposo', 'alerta', 'encogida', 'una-pata', 'mira-abajo', 'alas'];

/* ═══════════════════════════════════════════════════════════════════
   LOS HILOS

   `minutos` es lo único que ordena «Nuevos» — la cadena de `cuando` es
   para leer, no para calcular.
   `votos` es el marcador de partida. Lo que el navegador le suma o le
   resta al pulsar vive en la memoria de la pestaña y se va al recargar:
   no hay servidor y no se guarda nada (ver js/comunidad.js).
   ═══════════════════════════════════════════════════════════════════ */
export const HILOS = [
  {
    id: 'ventanilla',
    etiqueta: 'ruta',
    autora: { nombre: 'Marea baja', pose: 'alerta', mirar: 1 },
    cuando: 'hace 40 min',
    minutos: 40,
    votos: 34,
    titulo: '¿Qué se dice en la ventanilla? Me trabo antes de llegar',
    cuerpo: [
      'Tengo que ir y llevo dos días ensayando la frase. No es que no quiera ir: es que me imagino a la persona de la ventanilla preguntando y me quedo en blanco.',
      'Si alguna ya pasó por ahí, ¿qué dijeron? No busco lo correcto, busco algo corto que quepa en una boca seca.',
    ],
    comentarios: [
      {
        autora: { nombre: 'Raíz', pose: 'reposo', mirar: -1 },
        cuando: 'hace 32 min',
        votos: 29,
        texto: 'Yo llevé la frase escrita en el papelito de la farmacia y la dejé sobre el mostrador. No tuve que decir nada en voz alta y funcionó igual.',
        respuestas: [
          {
            autora: { nombre: 'Marea baja', pose: 'alerta', mirar: 1, esAutora: true },
            cuando: 'hace 28 min',
            votos: 12,
            texto: 'Escrita. No se me había ocurrido y es exactamente lo que necesitaba. Gracias.',
          },
          {
            autora: { nombre: 'Anónima', pose: 'encogida', mirar: 1, anonima: true },
            cuando: 'hace 19 min',
            votos: 17,
            texto: 'Lo mismo, pero en las notas del teléfono. Y le puse arriba el nombre de mi hermana y su número, por si me tocaba sentarme a esperar mucho rato.',
          },
        ],
      },
      {
        autora: { nombre: 'Bruma', pose: 'mira-abajo', mirar: 1 },
        cuando: 'hace 25 min',
        votos: 39,
        texto: 'A mí me sirvió no explicar nada en la ventanilla. Pedí hablar con alguien de salud y lo demás lo conté una sola vez, adentro, sentada.',
        respuestas: [
          {
            autora: { nombre: 'Sal', pose: 'una-pata', mirar: -1 },
            cuando: 'hace 21 min',
            votos: 20,
            texto: 'Esto. Contarlo una sola vez es la diferencia entre salir de ahí de pie o no volver más.',
          },
        ],
      },
      {
        autora: { nombre: 'Lluvia de las cuatro', pose: 'alas', mirar: 1 },
        cuando: 'hace 12 min',
        votos: 34,
        texto: 'Y si puedes, que alguien vaya contigo aunque se quede en la sala. No hace falta que sepa nada; hace falta que esté cuando salgas.',
        respuestas: [],
      },
    ],
  },

  {
    id: 'presionan',
    etiqueta: 'acompanar',
    autora: { nombre: 'Anónima', pose: 'encogida', mirar: -1, anonima: true },
    cuando: 'hace 3 h',
    minutos: 180,
    votos: 58,
    titulo: 'A mi amiga la están presionando para denunciar y ella no quiere',
    cuerpo: [
      'Su familia lleva todo el día diciéndole que si no denuncia es como si no hubiera pasado. Ella solo quiere dormir.',
      'Yo no sé qué es lo mejor y tampoco creo que me toque decidirlo. ¿Cómo se sostiene a alguien en el medio de eso sin empujarla para ningún lado?',
    ],
    comentarios: [
      {
        autora: { nombre: 'Manglar', pose: 'reposo', mirar: 1 },
        cuando: 'hace 2 h',
        votos: 52,
        texto: 'En este sitio lo dice la sección de acompañar y a mí me sirvió leerlo: denunciar no es requisito para que la atiendan en salud. Son dos decisiones separadas y no van juntas.',
        respuestas: [
          {
            autora: { nombre: 'Anónima', pose: 'encogida', mirar: -1, anonima: true, esAutora: true },
            cuando: 'hace 2 h',
            votos: 38,
            texto: 'Se lo leí en voz alta a su mamá. Fue lo primero que bajó el volumen en la casa.',
          },
          {
            autora: { nombre: 'Cormorán', pose: 'alerta', mirar: -1 },
            cuando: 'hace 96 min',
            votos: 28,
            texto: 'Y si más adelante cambia de opinión, no se le cierra la puerta por haber esperado. La decisión sigue siendo suya la semana que viene.',
          },
        ],
      },
      {
        autora: { nombre: 'Papel mojado', pose: 'mira-abajo', mirar: -1 },
        cuando: 'hace 100 min',
        votos: 58,
        texto: 'Ofrécele cosas concretas en vez de preguntas abiertas. «¿Te llevo el desayuno?» se puede contestar con la cabeza; «¿qué necesitas?» hay que resolverlo, y ahora mismo no tiene con qué.',
        respuestas: [],
      },
    ],
  },

  {
    id: 'hermana',
    etiqueta: 'acompanar',
    autora: { nombre: 'Anónima', pose: 'una-pata', mirar: 1, anonima: true },
    cuando: 'hace 5 h',
    minutos: 300,
    votos: 41,
    titulo: 'Llevo dos días acompañando a mi hermana y no sé si lo hago bien',
    cuerpo: [
      'No pregunto nada, cocino, la dejo dormir. Pero a veces me quedo callada tanto rato que no sé si parece que no me importa.',
      'No necesito que nadie me diga que lo estoy haciendo bien. Solo quiero saber si a alguien más le pasó esto de no saber dónde ponerse.',
    ],
    comentarios: [],
  },

  {
    id: 'que-le-digo',
    etiqueta: 'acompanar',
    autora: { nombre: 'Cormorán', pose: 'alerta', mirar: -1 },
    cuando: 'ayer',
    minutos: 1140,
    votos: 96,
    titulo: 'Alguien acaba de contarme algo y me quedé sin palabras',
    cuerpo: [
      'Me lo contó anoche y lo único que se me salió fue «qué horrible». Después estuve dos horas dándole vueltas a que quizá eso la hizo sentir peor.',
      '¿Qué dijeron ustedes? Sobre todo: ¿qué no dijeron?',
    ],
    comentarios: [
      {
        autora: { nombre: 'Sal', pose: 'una-pata', mirar: 1 },
        cuando: 'ayer',
        votos: 88,
        texto: '«Te creo.» Dos palabras y no hay que adornarlas. Todo lo demás puede esperar a mañana.',
        respuestas: [
          {
            autora: { nombre: 'Bruma', pose: 'mira-abajo', mirar: 1 },
            cuando: 'ayer',
            votos: 74,
            texto: 'Y «no fue tu culpa», aunque ella diga que sí. No hay que discutirlo: se dice y se deja ahí puesto.',
          },
          {
            autora: { nombre: 'Anónima', pose: 'reposo', mirar: -1, anonima: true },
            cuando: 'hace 20 h',
            votos: 92,
            texto: 'A mí lo que más me pesó fueron las preguntas. No las malintencionadas: las normales. Qué tomaste, con quién ibas, por qué no llamaste. Cada una me sonaba a que faltaba algo por mi parte.',
          },
        ],
      },
      {
        autora: { nombre: 'Manglar', pose: 'reposo', mirar: 1 },
        cuando: 'hace 22 h',
        votos: 79,
        texto: '«Qué horrible» no rompió nada. Es lo que dice alguien que se está enterando de algo horrible. Lo que hace daño es el silencio de después, y tú viniste aquí a buscar cómo no dejarlo.',
        respuestas: [
          {
            autora: { nombre: 'Cormorán', pose: 'alerta', mirar: -1, esAutora: true },
            cuando: 'hace 21 h',
            votos: 60,
            texto: 'Necesitaba leer esto. Le escribí esta mañana para preguntarle si quería que le llevara el almuerzo y me dijo que sí.',
          },
        ],
      },
      {
        autora: { nombre: 'Raíz', pose: 'reposo', mirar: -1 },
        cuando: 'hace 14 h',
        votos: 42,
        texto: 'Yo aprendí a no ofrecer soluciones el primer día. Ella no estaba decidiendo nada todavía; estaba tratando de que le pasara el temblor de las manos.',
        respuestas: [],
      },
    ],
  },

  {
    id: 'el-reloj',
    etiqueta: 'preguntas',
    autora: { nombre: 'Papel mojado', pose: 'mira-abajo', mirar: -1 },
    cuando: 'hace 2 días',
    minutos: 2880,
    votos: 73,
    titulo: 'El reloj de la portada me quitó el pánico (y no esperaba eso)',
    cuerpo: [
      'Entré convencida de que ya era tarde para todo. Giré la aguja hasta donde me acordaba, que era poco, y resultó que había cosas que seguían abiertas.',
      'Lo que me sirvió no fue la lista: fue ver de un golpe que no todo se cerraba a la vez. Dejo el dato por si alguien está en la misma cuenta mental.',
    ],
    comentarios: [
      {
        autora: { nombre: 'Lluvia de las cuatro', pose: 'alas', mirar: -1 },
        cuando: 'hace 2 días',
        votos: 49,
        texto: 'A mí me tranquilizó el botón de «no sé». Pensaba que si no daba una hora exacta no me iba a servir de nada.',
        respuestas: [
          {
            autora: { nombre: 'Papel mojado', pose: 'mira-abajo', mirar: -1, esAutora: true },
            cuando: 'hace 2 días',
            votos: 26,
            texto: 'Igual. «No sé» era mi respuesta real y no me quitó ninguna opción.',
          },
        ],
      },
      {
        autora: { nombre: 'Anónima', pose: 'encogida', mirar: 1, anonima: true },
        cuando: 'hace 44 h',
        votos: 55,
        texto: 'Ojo con una cosa: los anillos que se apagan no son un cierre de la ayuda. Abajo lo dice, pero yo cerré la página antes de leerlo y me quedé un día entero creyendo que había perdido el turno.',
        respuestas: [],
      },
    ],
  },

  {
    id: 'mochila',
    etiqueta: 'cuidados',
    autora: { nombre: 'Sal', pose: 'una-pata', mirar: -1 },
    cuando: 'hace 3 días',
    minutos: 4320,
    votos: 112,
    titulo: 'La mochila del día siguiente: lo que sí sirvió',
    cuerpo: [
      'Nadie me dijo esto y lo aprendí a las malas, esperando de pie. Va la lista, sin nada de más:',
      'Cambio de ropa cómoda. Cargador y cable, que el teléfono es la mitad del asunto. Agua y algo de comer que no haya que masticar mucho. El nombre y el número de una persona apuntados en papel, no solo en el teléfono. Audífonos. Un saco, aunque haga calor: se espera mucho rato y se enfría.',
    ],
    comentarios: [
      {
        autora: { nombre: 'Bruma', pose: 'mira-abajo', mirar: 1 },
        cuando: 'hace 3 días',
        votos: 51,
        texto: 'El saco. Nadie te dice lo del frío y es lo que más recuerdo de esa noche.',
        respuestas: [
          {
            autora: { nombre: 'Raíz', pose: 'reposo', mirar: 1 },
            cuando: 'hace 3 días',
            votos: 46,
            texto: 'Y algo para hacer con las manos. Un libro, lana, lo que sea. Las salas de espera son largas y la cabeza se va sola.',
          },
        ],
      },
      {
        autora: { nombre: 'Manglar', pose: 'reposo', mirar: -1 },
        cuando: 'hace 68 h',
        votos: 57,
        texto: 'Sumo: si alguien te acompaña, que lleve batería externa. La mía se quedó sin teléfono a media tarde y ahí me quedé sin la única persona que sabía dónde estaba.',
        respuestas: [],
      },
      {
        autora: { nombre: 'Anónima', pose: 'alas', mirar: 1, anonima: true },
        cuando: 'hace 2 días',
        votos: 36,
        texto: 'Guardé esta lista en las notas. Espero no usarla nunca y aun así me da calma tenerla.',
        respuestas: [],
      },
    ],
  },

  {
    id: 'explicar-antes',
    etiqueta: 'ruta',
    autora: { nombre: 'Raíz', pose: 'reposo', mirar: 1 },
    cuando: 'hace 4 días',
    minutos: 5760,
    votos: 64,
    titulo: 'Pedí que me explicaran cada cosa antes de hacerla, y sí lo hicieron',
    cuerpo: [
      'Lo que más miedo me daba no era el examen: era no saber qué venía después de cada puerta.',
      'Dije que necesitaba que me contaran qué iban a hacer antes de hacerlo. Me lo contaron. No sé si en todas partes es igual, pero preguntar no me costó nada y me cambió el día entero.',
    ],
    comentarios: [
      {
        autora: { nombre: 'Marea baja', pose: 'alerta', mirar: -1 },
        cuando: 'hace 4 días',
        votos: 55,
        texto: 'Y se puede pedir una pausa en el medio. Yo no sabía que eso se podía decir en voz alta.',
        respuestas: [
          {
            autora: { nombre: 'Anónima', pose: 'una-pata', mirar: -1, anonima: true },
            cuando: 'hace 4 días',
            votos: 67,
            texto: 'Yo pedí que fuera una mujer quien me atendiera. Tardó un rato más y valió la pena esperar sentada.',
          },
        ],
      },
      {
        autora: { nombre: 'Cormorán', pose: 'alerta', mirar: 1 },
        cuando: 'hace 3 días',
        votos: 43,
        texto: 'Anoto la frase para llevarla: «cuénteme qué va a hacer antes de hacerlo». Cabe en la boca aunque estés temblando.',
        respuestas: [],
      },
    ],
  },

  {
    id: 'guardado',
    etiqueta: 'despues',
    autora: { nombre: 'Bruma', pose: 'mira-abajo', mirar: 1 },
    cuando: 'hace 5 días',
    minutos: 7200,
    votos: 87,
    titulo: 'Guardé lo que recordaba en el teléfono y hoy lo volví a leer',
    cuerpo: [
      'Lo escribí esa madrugada con el formulario del sitio, sin ninguna intención de usarlo. Hoy lo abrí y estaba lleno de huecos y de faltas de ortografía.',
      'Pensé que me iba a hundir y pasó lo contrario: era la prueba de que aquella noche hice algo. No lo cambié. Los huecos son parte de lo que pasó.',
    ],
    comentarios: [
      {
        autora: { nombre: 'Lluvia de las cuatro', pose: 'alas', mirar: 1 },
        cuando: 'hace 5 días',
        votos: 64,
        texto: 'No lo corrijas nunca. Lo escrito de primera mano vale por lo que es, no por lo bien contado que esté.',
        respuestas: [
          {
            autora: { nombre: 'Sal', pose: 'una-pata', mirar: 1 },
            cuando: 'hace 5 días',
            votos: 59,
            texto: 'A mí me dijeron lo mismo y añado: si te acuerdas de algo nuevo después, escríbelo aparte con la fecha de hoy. No lo metas dentro del primero.',
          },
        ],
      },
      {
        autora: { nombre: 'Anónima', pose: 'reposo', mirar: 1, anonima: true },
        cuando: 'hace 4 días',
        votos: 77,
        texto: 'Yo no he podido abrir el mío todavía. Me sirve saber que se puede leer un día y que no se cae el mundo.',
        respuestas: [],
      },
    ],
  },

  {
    id: 'el-dia-libre',
    etiqueta: 'despues',
    autora: { nombre: 'Manglar', pose: 'reposo', mirar: -1 },
    cuando: 'hace una semana',
    minutos: 10080,
    votos: 52,
    titulo: 'Cómo pedí el día en el trabajo sin tener que contar nada',
    cuerpo: [
      'Mi jefe pregunta todo. Escribí «tengo una cita médica y voy a estar no disponible el jueves» y no añadí ni una palabra más.',
      'No hubo que dar explicaciones. Lo dejo aquí porque yo estuve dos días bloqueada pensando qué inventar, y resultó que no había que inventar nada.',
    ],
    comentarios: [
      {
        autora: { nombre: 'Papel mojado', pose: 'mira-abajo', mirar: 1 },
        cuando: 'hace 6 días',
        votos: 36,
        texto: 'Una cita médica es una cita médica. No es una excusa y no hay que adornarla.',
        respuestas: [],
      },
      {
        autora: { nombre: 'Anónima', pose: 'encogida', mirar: -1, anonima: true },
        cuando: 'hace 6 días',
        votos: 54,
        texto: 'Yo pedí dos días en vez de uno y me alegro. El siguiente lo pasé dormida entera.',
        respuestas: [],
      },
    ],
  },

  {
    id: 'volver-a-salir',
    etiqueta: 'cuidados',
    autora: { nombre: 'Anónima', pose: 'alas', mirar: -1, anonima: true },
    cuando: 'hace una semana',
    minutos: 11520,
    votos: 45,
    titulo: 'Volver a salir. ¿Cómo fue la primera vez?',
    cuerpo: [
      'Me invitaron a un cumpleaños el sábado y llevo toda la semana con la respuesta a medio escribir.',
      'No busco que me digan que vaya. Quiero saber cómo fue para ustedes: si se quedaron media hora y se fueron, si avisaron a alguien, si sirvió de algo llevar un plan de salida.',
    ],
    comentarios: [],
  },
];

/* ── Cuenta derivada ────────────────────────────────────────────────
   Se calcula aquí y no en la plantilla porque el orden «Sin responder»
   la necesita, y una cuenta que se calcula en dos sitios son dos cuentas
   que un día no coinciden. */
export const respuestasDe = (hilo) =>
  hilo.comentarios.reduce((n, c) => n + 1 + (c.respuestas?.length || 0), 0);
