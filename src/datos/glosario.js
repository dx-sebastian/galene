/* ═══════════════════════════════════════════════════════════════════
   glosario.js — las palabras, en un solo sitio.

   POR QUÉ ES UN FICHERO DE DATOS Y NO OCHO BLOQUES DE HTML.

   Estas ocho palabras se usan en DOS sitios: las fichas de la página y
   el `DefinedTermSet` de datos estructurados en index.astro. Escritas a
   mano en los dos, la primera vez que alguien corrija una coma quedan
   dos versiones que dicen cosas distintas — y la que se desincroniza en
   silencio es siempre la que no se ve, que aquí es justo la que leen los
   buscadores.

   Escritas una vez, las dos salen de aquí y no hay nada que sincronizar.

   (Hubo un tercer consumidor: el índice del buscador de la sección, con
   alias por los que encontrar cada ficha —«no me acuerdo», «bebí
   demasiado»—. Se fue con el buscador. Está en el historial.)

   ── QUÉ PUEDE ENTRAR AQUÍ, Y ES LA MISMA REGLA DURA DE LA SECCIÓN ────
   Solo qué SIGNIFICAN las palabras. Nada de qué hace una sustancia en un
   cuerpo, cuánto dura ni en qué plazo se detecta: eso son afirmaciones
   médicas, viven en el reloj de rescate y van con su fuente al lado (ver
   FUENTES en js/reloj.js). La definición de esta sección es
   deliberadamente NO clínica y el glosario la hereda entera.

   ── LOS DOS CAMPOS DE TEXTO ─────────────────────────────────────────
   `corta` es lo que se ve siempre, y tiene que caber en una línea y
   media: es lo que permite descartar una ficha de un vistazo.
   `larga` es lo que aparece al abrirla — el matiz, el ejemplo, la
   frase que hace trabajo de verdad. Puede faltar; entonces la ficha no
   se abre y no finge que tiene fondo.
   ═══════════════════════════════════════════════════════════════════ */

export const TERMINOS = [
  {
    id: 'sumision-quimica',
    palabra: 'Sumisión química',
    corta: 'Usar una sustancia para que otra persona no pueda decidir ni defenderse.',
    larga: 'El daño no es la sustancia: es lo que se hace con ella. Por eso es la misma palabra tanto si te la dieron a escondidas como si alguien esperó a que la que tomaste tú hiciera efecto.',
  },
  {
    id: 'proactiva',
    palabra: 'Sumisión proactiva',
    corta: 'Alguien pone algo en lo que estabas tomando, sin que lo sepas.',
    larga: 'Es la única forma que aparece en las películas, y por eso mucha gente cree que es la única que existe.',
  },
  {
    id: 'oportunista',
    palabra: 'Sumisión oportunista',
    corta: 'Nadie puso nada: alguien se aprovechó de lo que habías tomado tú.',
    larga: 'Es la forma que más se calla, porque quien la vive suele contársela a sí misma como «bebí demasiado». Beber es tuyo; aprovecharse de que bebiste es de quien lo hizo.',
  },
  {
    id: 'consentimiento',
    palabra: 'Consentimiento',
    corta: 'Decir que sí pudiendo decir que no. No es la ausencia de un «no».',
    larga: 'Hace falta poder entender qué está pasando y poder negarse. Quien no está en condiciones de decidir no está consintiendo, aunque no se resista, aunque hable y aunque parezca de acuerdo.',
  },
  {
    id: 'anulacion-voluntad',
    palabra: 'Anulación de la voluntad',
    corta: 'Estar despierta, hablar y caminar, y aun así no estar decidiendo nada de eso.',
    larga: 'Es lo que hace que, vista desde fuera, la escena no parezca lo que fue: en las cámaras y en la memoria de quien miraba, alguien que camina parece alguien que decide.',
  },
  {
    id: 'laguna',
    palabra: 'Laguna de memoria',
    corta: 'Recordar a trozos, o no recordar nada. No recordar no es haber consentido.',
    larga: 'Suele venir a saltos: una imagen suelta, un trayecto, una voz, y entre medias nada. Que la memoria vuelva desordenada, o que no vuelva, no significa que estés inventando ni exagerando.',
  },
  {
    id: 'ventana',
    palabra: 'Ventana de tiempo',
    corta: 'El plazo en el que algo todavía se puede hacer.',
    larga: 'Hay cosas que dependen de las horas que pasaron y otras que no caducan nunca.',
  },
  {
    id: 'examen',
    palabra: 'Examen médico-legal',
    corta: 'La atención en salud que además guarda lo que pueda servir después.',
    larga: 'Puedes pedir la atención sin decidir nada más: denunciar nunca es requisito para que te atiendan.',
    enlace: { href: '#mapa', texto: 'Dónde se hace' },
  },
];
