/* ═══════════════════════════════════════════════════════════════════
   hora.js — un solo modelo de luz continuo, manejado por el reloj
   local de quien entra. No hay "cuatro habitaciones": hay una hora,
   la de ella.

   El modelo NO interpola linealmente entre las cuatro anclas: el día
   real no cambia parejo. La noche es casi constante durante horas y
   el amanecer pasa en hora y media. Por eso hay un factor `dia` que
   cruza rápido en los crepúsculos, y dos mezclas separadas —una de
   noche, una de día— que se cruzan con él.

   Importa porque el caso que manda es las 4 a.m.: a esa hora el mundo
   tiene que ser noche, no un amanecer adelantado.
   ═══════════════════════════════════════════════════════════════════ */

const A = {
  /* La noche no es negra: es azul de tinta con una insinuación malva
     abajo. Lo que la hace fría es el valor, no la falta de color. */
  /* LA NOCHE NO ES LA AUSENCIA DEL DÍA. Estaba resuelta como un día
     con el brillo bajado —azul de tinta y poco más— y por eso se leía
     triste. Una noche de verdad tiene MÁS color que un mediodía, no
     menos: el cenit se va a un añil profundo, la banda media a violeta
     y abajo queda el rescoldo cálido de la luz que se fue y de las
     luces de la orilla.

     Lo que NO se toca es la luminancia, y está medido: `cieloAlto` va
     de 0.0221 a 0.0226 y `cieloBajo` de 0.0510 a 0.0508 — cuatro
     diezmilésimas arriba y dos abajo. La luminancia de la banda del
     texto pasa de 0.0308 a 0.0310, o sea que sigue igual de lejos del
     cruce de tinta (0.175) y la tinta sigue siendo clara.

     El color sube, el valor se queda. Así la noche se vuelve hermosa
     sin que nadie pierda legibilidad a las cuatro de la mañana, que es
     la hora que manda en este proyecto. */
  /* ── Y LA TERCERA PARADA: LA FRANJA DEL HORIZONTE ────────────────
     El cielo era una rampa de DOS colores, alto y bajo, y por eso
     ocupaba media pantalla con un valor casi uniforme: una rampa
     continua entre dos tonos parecidos no tiene ningún sitio donde
     mirar. El diagnóstico —"el cielo es el principal culpable, se
     siente más gris de lo que realmente es"— es exacto, y no se
     arregla cambiando los dos colores: se arregla metiendo un TERCER
     color abajo, más luminoso que los otros dos.

     Está justificado físicamente y no es un truco: cerca del horizonte
     la luz atraviesa mucho más aire, se dispersa y sube de valor. Es
     lo que hace que un amanecer suave sea sereno y no melancólico.

     Y vive en su propio canal, aparte de `cieloBajo`, POR UNA RAZÓN
     MEDIDA: `lumTexto` —de la que sale si la tinta va clara u oscura—
     pesa cieloAlto al 70 % y cieloBajo al 30 %. Si la luz nueva
     entrara por cieloBajo, subiría lumTexto y podría cruzar el umbral
     de tinta a horas donde hoy no cruza. Por este canal no pasa: la
     franja vive pegada al horizonte, el texto vive arriba, y el
     calibrador del lavado mide de todos modos lo que de verdad quedó
     pintado detrás. */
  /* Y AHORA CONTRA UNA REFERENCIA, no contra una descripción. La lámina
     de noche que pide el proyecto es añil profundo con la vía láctea
     cruzando y una banda malva levantándose hacia la luna. El azul de
     tinta anterior era más verdoso —tiraba a petróleo— y por eso la
     noche se leía fría en vez de honda.

     LA LUMINANCIA SIGUE SIN MOVERSE, que es la ley de esta hora:
     medido, cieloAlto 0.0226 → 0.0251 y cieloBajo 0.0509 → 0.0487, y la
     banda del texto 0.0310 → 0.0322. El cruce de tinta está en 0.175:
     seguimos a un orden de magnitud, la tinta sigue siendo clara y el
     texto blanco sigue por encima de 12:1. El color cambia, el valor
     no. */
  h03: { cieloAlto:'#080E24', cieloBajo:'#141A3C', cieloHorizonte:'#3C3352',
         agua:'#10122E', altas:'#323C74',
         reguero:'#DCE4F4', bruma:'#221E42', acento:'#B06A4A', elev:12, int:0.35 },
  /* ── EL AMANECER Y EL OCASO SON SU PROPIA HORA ────────────────────
     Esto es lo que faltaba de verdad, y no era un color: era un ANCLA.

     La rampa diurna iba de h09 a h15 y se sostenía en los extremos, así
     que las 6:30 de la mañana pintaban EXACTAMENTE lo mismo que las
     9:00, y las 17:45 lo mismo que las 15:00. O sea que el amanecer y
     el atardecer —las dos horas que la referencia resuelve como
     lavanda, rosa y crema— no existían como momento: eran el día con
     algo de noche mezclada por encima.

     Con h06 y h18 la rampa tiene cuatro nodos y cada franja es suya.
     Son casi el mismo cielo el uno del otro a propósito: la referencia
     de amanecer y la de atardecer son la misma imagen, y es cierto —lo
     que separa un alba de un ocaso es de qué lado sale el sol, y de eso
     ya se encarga `fuenteX`. El ocaso lleva algo más de coral y algo
     menos de azul porque el aire de la tarde tiene más polvo.

     Y `elev` a 5, no a 16. En la referencia el sol está POSADO sobre el
     horizonte y el reguero baja de él hasta el pie del cuadro en una
     sola columna de luz: esa columna es media composición, y solo
     existe si el disco toca la línea. A 16 el sol flotaba a un 16 % de
     la altura del cielo y el camino salía corto y descolgado. */
  h06: { cieloAlto:'#7C83A8', cieloBajo:'#D6A6AC', cieloHorizonte:'#F7DEBE',
         agua:'#5A7594', altas:'#A9BACE',
         reguero:'#FBE3C2', bruma:'#C9C2CE', acento:'#C4703F', elev:5, int:0.72 },
  /* Los anclas de día llevaban el agua a un turquesa que el cielo nunca
     tenía: medido, 23.6 % de saturación contra 8.6 % del cielo, y el
     cuadro se partía en dos láminas distintas. Agrisados hacia el mismo
     pigmento mineral. El cian sigue ahí; ya no grita. */
  /* El color entra por el CIELO y por el pigmento de las láminas, no
     subiendo la saturación del agua: eso volvía a partir el cuadro en
     dos. El cielo gana azul arriba y calor abajo —que es lo que hace un
     cielo de verdad— y el agua se queda mineral. */
  /* Azul cielo de verdad arriba y un rosa polvoriento abajo. El rosa
     está JUSTIFICADO: cerca del horizonte la luz atraviesa más aire y
     se enrojece. Por eso puede ser color sin volverse decoración. */
  /* LA MANANA Y LA TARDE TIENEN QUE SER DISTINTAS, o el mediodia —que es
     su punto medio— no puede ser nada. Estaban a #9CC6E4 contra #7FBAD8
     arriba y #F0DFDC contra #F2DCCE abajo: practicamente el mismo color,
     y por eso las 6, las 9 y las 12 se veian iguales.

     Ahora la manana es FRIA y limpia —el aire de la manana tiene menos
     polvo, el azul llega mas puro y el rosa bajo es todavia el del
     amanecer que se apaga— y la tarde es CALIDA y con mas bruma: la luz
     ha atravesado mas atmosfera y el bajo se va a arena. El mediodia
     queda entre las dos, que es exactamente lo que es.

     Y el rosa bajo sube de croma: a 0.08 de saturacion no se leia como
     rosa, se leia como blanco sucio, y ese rosa es lo unico que separa
     una hora de otra. */
  /* LA MAÑANA, LAVANDA. El azul de arriba estaba limpio pero era solo
     azul, y la mañana que pide este sitio es "lavanda-azulado → rosado
     muy pálido → crema luminoso en el horizonte". El malva del cenit no
     es licencia: a primera hora la banda de Venus todavía no se ha ido
     del todo y el azul alto tira a violeta. Y es lo que separa esta
     hora de la tarde por algo que no sea el brillo. */
  /* Y CON EL AMANECER YA APARTE, la mañana puede ser lo que la
     referencia de día pide: azul limpio arriba, azul pálido a media
     altura y crema blanquecino en el horizonte. El lavanda se fue a
     h06, que es donde vive de verdad.

     EL AGUA SUBE DE CROMA, y esto contradice una corrección anterior
     —se agrisó el agua porque a 23.6 % de saturación contra 8.6 % del
     cielo el cuadro se partía en dos láminas—. La corrección era buena
     y el motivo sigue en pie, pero se pasó de frenada: la referencia de
     día es un mar TURQUESA, y sin ese turquesa el día no es el día.
     De 0.38 a 0.45 de saturación, no a 0.60: el cian vuelve sin
     gritar. */
  /* EL MAR DEL DIA, MAS TURQUESA — y esto es la segunda vez que se
     mueve este numero, asi que conviene dejar el historial entero.
     Primero se agriso porque a 23.6 % de saturacion contra 8.6 % del
     cielo el cuadro se partia en dos laminas. Luego se subio a 0.45
     contra la referencia de dia. Y medido sobre los pixeles seguia sin
     llegar: 0.155 de saturacion en el agua, EXACTAMENTE la misma que la
     copa del arbol — o sea que ni el mar era turquesa ni el arbol
     destacaba por color de nada.
     El agua y sus altas suben juntas. Suben las DOS porque el extremo
     claro del duotono del agua sale de `altas`, y con unas altas grises
     el mar se lava por arriba por muy turquesa que sea su color base. */
  /* ── EL DIA ES UNA SOLA ATMOSFERA ────────────────────────────────
     Los tres anclajes diurnos llevan LA MISMA paleta: la medida de la
     foto de referencia. Antes la manana era mas fria y la tarde se iba
     a arena (#F2DCC2 abajo a las 15:00), asi que solo el mediodia se
     parecia a la referencia y a las 9 o a las 15 ya era otro cielo.
     La peticion es la contraria: el dia entero se ve asi de hermoso e
     IGUAL; el color cambia en el alba y el ocaso, que para eso tienen
     ancla propia. Lo unico que recorre el dia es el SOL (elev y
     fuenteX), que es fisica y no paleta. */
  h09: { cieloAlto:'#77A3D8', cieloBajo:'#B4C8E2', cieloHorizonte:'#CCD7E5',
         agua:'#6796B4', altas:'#A0C4D7',
         reguero:'#FFF8EE', bruma:'#DCE6EA', acento:'#C4703F', elev:42, int:0.95 },
  /* ── Y AHORA MEDIDO CONTRA LA FOTO, NO MIRANDOLA ─────────────────
     La referencia de dia, muestreada franja a franja evitando el arbol y
     el sol (x 0.04..0.52), da esto:

       cenit       #77a3d8  L* 65.9  sat 0.451  matiz 213
       alto        #87acdc     69.4      0.384        214
       medio-alto  #9fbbdf     74.9      0.286        214
       medio       #b8cae4     80.7      0.192        216
       horizonte   #bfcfe2     82.5      0.155        212

     Tres cosas que solo se ven midiendo:
     1. El matiz es CONSTANTE en 212-216 grados de arriba abajo. No hay
        deriva de color: lo unico que cambia es cuanto azul queda.
     2. La saturacion cae de 0.451 a 0.155 — el cenit es MUY azul y el
        horizonte casi gris. Nuestro cenit estaba en 0.36.
     3. El horizonte de mediodia es FRIO y palido, no crema. La franja
        calida es cosa del alba y del ocaso.

     Los tres colores de aqui son literalmente los de la foto. */
  /* ── Y AQUI ME PASE, Y CONVIENE QUE QUEDE ESCRITO ─────────────────
     Al oir «el cielo se ve palido» oscureci el cenit de L* 66.6 a 60.1.
     Era la lectura equivocada: la referencia de dia NO tiene un cielo
     oscuro — tiene un cielo CLARO con una masa de nube grande cruzandolo.
     Lo que se leia como plano no era falta de azul, era falta de nube en
     los dos tercios altos. Oscurecerlo alejo el cielo de la referencia
     en vez de acercarlo.
     Vuelto a un periwinkle claro, que es lo que la lamina de referencia
     tiene arriba. La estructura la tienen que poner las nubes. */
  /* NOTA SOBRE `altas` DE DIA, que se movio cuatro veces en una sesion.
     Es el extremo CLARO del duotono del agua, o sea la mitad del mar que
     de verdad se ve, y arrastra tambien las altas de la garza y del
     manglar. Aclararlo sube el mar pero lo DESATURA —en sRGB, a matiz
     fijo, mas claro es menos cromatico— y por ahi el mar se vuelve
     lechoso en vez de turquesa.
     Medido sobre candidatos: #B4E1EC da L* 86.8 con 0.237 de saturacion
     y #8FD8EE da 82.4 con 0.399. Cuatro puntos menos de claridad por un
     68 % mas de croma: ese es el cambio bueno. Turquesa es un cian CLARO
     Y CROMATICO; solo claro es lechoso. */
  /* ── EL AGUA ESTABA VERDE Y EL CENIT PALIDO ───────────────────────
     MEDIDO en pantalla a mediodia, por franjas: el agua salia con matiz
     172-177 grados —verde-cian; el cian empieza en 190— y el cielo con
     matiz 209, que esta bien, pero a 78-81 de L* en las TRES franjas.
     O sea: al cielo no le faltaba azul, le faltaba HONDURA, y estaba
     tan plano que el cenit media mas claro que la banda media.

     El agua no se corrige por `agua`, que ya estaba en 188 grados, sino
     por `altas`: es el extremo CLARO del duotono, o sea la mitad del mar
     que de verdad se ve, y estaba en 176 —verde-cian—. Suben las dos
     juntas hacia el azul.

     Y `cieloAlto` baja de L* 66.6 a 60.1 en el mediodia. La tinta sigue
     siendo oscura por un orden de magnitud: la banda del texto queda en
     0.41 de luminancia contra un cruce de 0.175. */
  /* ── Y EL MEDIODIA TAMBIEN ES SU PROPIA HORA ──────────────────────
     Este archivo ya lo tenia escrito arriba, sobre la manana y la tarde:
     «o el mediodia —que es su punto medio— no puede ser nada». Era
     literal y se cumplio. El cielo bajo de la manana es azul palido
     (#C8DCEC) y el de la tarde durazno (#F1DCC3); interpolar entre un
     frio y un calido PASA POR EL GRIS, y a las 12:00 salia #D8DCDC, o
     sea 0.020 de saturacion. MEDIDO sobre el lienzo: 0.137 de saturacion
     en todo el cielo y mediana 82 de L* — un cielo claro y sin color.

     No se arregla con exponentes ni con reservas: mientras el mediodia
     sea el punto medio de dos horas de temperatura opuesta, sera gris.
     Se arregla dandole ancla propia, que es exactamente lo que se hizo
     con el alba y con el ocaso.

     Su cielo bajo es AZUL PALIDO, no crema: la parte blanca del
     horizonte ya la pone `cieloHorizonte`, que para eso existe. Y es el
     sol mas alto del dia (elev 66) y la luz mas intensa. */
  h12: { cieloAlto:'#77A3D8', cieloBajo:'#B4C8E2', cieloHorizonte:'#CCD7E5',
         agua:'#6796B4', altas:'#A0C4D7',
         reguero:'#FFF8EE', bruma:'#DCE6EA', acento:'#C4703F', elev:66, int:1.00 },
  /* LA TARDE, DORADA — pero dorada de acuarela, no de postal. El
     horizonte se va a un dorado tenue y no a un naranja: un atardecer
     exagerado es la forma más rápida de que esto deje de ser una
     acuarela y pase a ser un filtro. El durazno de `cieloBajo` ya
     estaba bien; lo que faltaba era la luz DEBAJO del durazno. */
  /* La tarde YA NO es arena: esa calidez vive ahora solo en h18. Ver
     la nota del bloque de arriba — misma paleta que h09 y h12. */
  h15: { cieloAlto:'#77A3D8', cieloBajo:'#B4C8E2', cieloHorizonte:'#CCD7E5',
         agua:'#6796B4', altas:'#A0C4D7',
         reguero:'#FFF8EE', bruma:'#DCE6EA', acento:'#B4552E', elev:52, int:0.95 },
  /* EL OCASO. Mismo cielo que el alba con el polvo de la tarde dentro:
     el violeta de arriba se entibia, el rosa baja a coral y el agua se
     va a azul acero —de tarde el mar ya no devuelve el turquesa del
     mediodía, devuelve el cielo—. Es la hora que la referencia resuelve
     como la más impresionante, y lo es porque tiene las tres cosas a la
     vez: violeta arriba, coral en medio y oro en el horizonte. */
  h18: { cieloAlto:'#8A7FA8', cieloBajo:'#DFA9A2', cieloHorizonte:'#F9DDB2',
         agua:'#4E6B8C', altas:'#9EB2C8',
         reguero:'#F5CE94', bruma:'#CDBEC0', acento:'#B4552E', elev:5, int:0.76 },
  /* Y LA LUNA BAJA DE 60 A 26. Con el sol del ocaso posado en el
     horizonte (elev 5), un astro nocturno a 60 hacía que entre las
     18:00 y las 19:00 el disco TREPARA medio cielo en una hora: se veía
     deslizarse, y un astro que se mueve a ojo delata el motor. A 26 la
     luna cae a un cuarto de la altura del cielo, que además es donde
     está en la referencia de noche, y la subida deja de leerse.
     Medido: el mayor cambio de color en un minuto queda en el
     crepúsculo, que es donde tiene que estar. */
  /* La primera noche, la de las nueve, conserva rescoldo del ocaso: su
     banda baja tira a ciruela cálida y no al malva frío de las tres.
     Que las dos noches sean distintas es la misma ley que obligó a
     separar la mañana de la tarde — si no, todas las horas oscuras son
     la misma imagen. */
  /* La franja del horizonte se levanta y se entibia. En la referencia
     de noche el cielo no muere en el mar: hay un resplandor bajo —luz
     de orilla, aire cargado— que separa el agua del cielo y da a la
     via lactea contra que recortarse. Y entra por ESTE canal, que es
     el que no pesa en lumTexto (ver la nota de arriba), asi que la
     tinta del rotulo no se entera. */
  h21: { cieloAlto:'#0A1230', cieloBajo:'#1A1F48', cieloHorizonte:'#4E3A5E',
         agua:'#12142E', altas:'#383F7C',
         reguero:'#E0D4F0', bruma:'#241E44', acento:'#A8664C', elev:26, int:0.50 },
};

/* PENDIENTE (sección 14): sustituir por cálculo real por latitud antes
   de mostrar la hora en pantalla. Si el sitio dice una hora, tiene que
   ser cierta. Estos valores son el promedio colombiano aproximado. */
/* El rosa vive en los crepúsculos, y por eso hay dos anclas más: sin
   ellas la transición pasaba de noche azul a día azul sin rosa por el
   medio, que es justo donde el cielo se pone rosa de verdad. */
export const AMANECER  = 5.9;
export const ATARDECER = 18.1;

/* El cruce de tinta está en luminancia relativa 0.175: ahí clara y
   oscura empatan (~4.0:1). Cruzar exactamente ahí hace que el peor
   instante del crepúsculo sea el mejor posible. */
export const CRUCE_TINTA = 0.175;

const CANALES = ['cieloAlto','cieloBajo','cieloHorizonte',
                 'agua','altas','reguero','bruma','acento'];

const hex = (s) => [
  parseInt(s.slice(1, 3), 16) / 255,
  parseInt(s.slice(3, 5), 16) / 255,
  parseInt(s.slice(5, 7), 16) / 255,
];
/* Mezcla en sRGB, no en luz lineal. Son colores PINTADOS, no sumas de
   luz: mezclar en lineal hacía que un 10 % de avance hacia la mañana
   se viera como un 28 %, y adelantaba el amanecer. */
const mezcla = (a, b, t) => a.map((v, i) => v * (1 - t) + b[i] * t);
const aCss = (c) => '#' + c.map(v =>
  Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('');

const aLineal = (c) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
/** Luminancia relativa WCAG. Esta sí va en luz lineal: es una medida. */
export const luminancia = (c) =>
  0.2126 * aLineal(c[0]) + 0.7152 * aLineal(c[1]) + 0.0722 * aLineal(c[2]);

const suave  = (t) => t * t * (3 - 2 * t);
const limita = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const rampa  = (v, a, b) => suave(limita((v - a) / (b - a)));

function paleta(a, b, t) {
  const o = {};
  for (const c of CANALES) o[c] = mezcla(hex(a[c]), hex(b[c]), t);
  o.elev = a.elev * (1 - t) + b.elev * t;
  o.int  = a.int  * (1 - t) + b.int  * t;
  return o;
}

/* ── LA RAMPA DIURNA, POR TRAMOS ────────────────────────────────────
   Era un solo tramo de h09 a h15 sostenido en los extremos, y por eso
   el amanecer no existía: a las 6:30 el `dia` ya vale 1 y la paleta
   diurna devolvía h09 tal cual, o sea el cielo de las nueve.

   Ahora son cuatro nodos —alba, mañana, tarde, ocaso— y el que toca se
   busca por tramos. Cada segmento entra y sale con `rampa`, que es un
   smoothstep, así que el cielo no cambia de golpe en ningún nodo: va
   cambiando toda la mañana y toda la tarde, que es lo que hace de
   verdad y lo que separa esto de cuatro habitaciones.

   Fuera del primer y el último nodo se sostiene el extremo. No es
   pereza: a esas horas manda `dia`, que ya está cruzando hacia la
   noche, y sostener el ocaso mientras se apaga es exactamente lo que
   pasa entre las 18:00 y las 19:00. */
/* EL NODO DE LA TARDE SE VA DE LAS 14:00 A LAS 15:30, y no es un ajuste
   de gusto: con el nodo en 14, a las 12:00 la paleta ya iba un 59 % hacia
   la tarde, o sea que a mediodia el cielo bajo ya era durazno. MEDIDO
   sobre el lienzo: 0.137 de saturacion en todo el cielo y mediana 82 de
   L* — claro y sin color, que es justo lo que se veia.
   Un cielo no se entibia a la una: se entibia cuando el sol empieza a
   bajar. Con el nodo en 15.5 el mediodia se queda en un 39 % de tarde y
   el azul limpio dura lo que tiene que durar. */
const DIURNAS = [[6.0, 'h06'], [9.5, 'h09'], [12.3, 'h12'], [15.8, 'h15'], [17.8, 'h18']];

function paletaDiurna(h) {
  const primera = A[DIURNAS[0][1]];
  const ultima  = A[DIURNAS[DIURNAS.length - 1][1]];
  if (h <= DIURNAS[0][0]) return paleta(primera, primera, 0);
  for (let i = 0; i < DIURNAS.length - 1; i++) {
    const [h0, k0] = DIURNAS[i], [h1, k1] = DIURNAS[i + 1];
    if (h <= h1) return paleta(A[k0], A[k1], rampa(h, h0, h1));
  }
  return paleta(ultima, ultima, 0);
}

/** En qué punto del ciclo de cielos cae una hora, de 0 a 4.

    0 = alba · 1 = día · 2 = ocaso · 3 = noche · 4 ≡ 0 otra vez.

    Devuelve un número CONTINUO a propósito, pero el 1 se SOSTIENE de
    7:00 a 17:00: el día entero usa la misma lámina, igual que usa la
    misma paleta. Antes el atlas seguía girando aunque el color ya no:
    a las 9 aún era medio alba y a las 15 ya era medio ocaso. Era otra
    forma del mismo error.

    Las fundidas viven solo donde hay un cambio físico de atmósfera:
    noche→alba→día entre 5:00 y 7:00, y día→ocaso→noche entre
    17:00 y 19:12. Dentro del día se mueve el sol, no el cielo. */
export function cicloCielo(h) {
  const hh = ((h % 24) + 24) % 24;
  const nodos = [
    [AMANECER, 0], [7.0, 1], [17.0, 1], [ATARDECER, 2], [19.2, 3],
    [AMANECER - 0.9 + 24, 3], [AMANECER + 24, 4],
  ];
  const t = hh < AMANECER ? hh + 24 : hh;
  for (let i = 0; i < nodos.length - 1; i++) {
    const [h0, v0] = nodos[i], [h1, v1] = nodos[i + 1];
    if (t >= h0 && t <= h1) return v0 + ((t - h0) / (h1 - h0)) * (v1 - v0);
  }
  return 0;
}

/** Estado de luz para una hora decimal (0–24). */
export function luz(horaDecimal) {
  const h = ((horaDecimal % 24) + 24) % 24;

  /* Factor día/noche. Cruza en ~1.4 h alrededor de cada crepúsculo:
     rápido, como el de verdad. Fuera de esa ventana es 0 o 1 exacto. */
  const ANCHO = 0.7;
  const dia = (h < 12)
    ? rampa(h, AMANECER - ANCHO, AMANECER + ANCHO)
    : 1 - rampa(h, ATARDECER - ANCHO, ATARDECER + ANCHO);

  // Mezcla diurna: alba → mañana → tarde → ocaso. Ver paletaDiurna().
  const deDia = paletaDiurna(h);

  /* Mezcla nocturna: recorre el arco del atardecer al amanecer.
     21:00 cae en 0.25 del arco y 03:00 en 0.75. */
  const largoNoche = (ATARDECER > AMANECER) ? (24 - ATARDECER + AMANECER) : 0;
  let pn = (((h - ATARDECER) + 24) % 24) / largoNoche;
  /* ── UN CORTE QUE LLEVABA AHÍ DESDE SIEMPRE ──────────────────────
     De día `pn` se sale de su arco: a las 12:00 vale 1.7, a las 18:00
     vale 2.03. Como `rampa` lo recorta a 1, la mezcla nocturna se
     quedaba clavada en h03 —la madrugada que YA PASÓ— durante todo el
     día, y a las 18:06 en punto el módulo daba la vuelta y `pn` saltaba
     de 2.03 a 0, o sea de h03 a h21 de un fotograma al siguiente.

     Y no era invisible, precisamente porque cae en el ocaso: ahí `dia`
     vale 0.5, así que el salto entraba al cuadro a media fuerza.
     MEDIDO barriendo las 24 h minuto a minuto: 10.1 niveles de 255 en
     un minuto sobre la franja del horizonte — el mayor cambio de color
     del día entero, y el único que no era una transición sino un corte.
     Todo lo demás se movía por debajo de 4.

     Se arregla haciendo que `pn` VUELVA despacio a lo largo del día en
     vez de dar la vuelta de golpe. Da exactamente igual lo que valga
     mientras hay sol —la mezcla nocturna pesa (1 − dia), o sea cero—,
     pero así llega a 0 justo en el ocaso y a 1 justo en el amanecer, y
     los dos empalmes quedan continuos. Comprobado en los dos extremos:
     en 5.90 y en 18.10 las dos ramas dan el mismo número. */
  if (pn > 1) pn = 1 - limita((h - AMANECER) / (ATARDECER - AMANECER));
  const deNoche = paleta(A.h21, A.h03, rampa(pn, 0.25, 0.75));

  const L = {};
  for (const c of CANALES) L[c] = mezcla(deNoche[c], deDia[c], dia);
  L.elev = deNoche.elev * (1 - dia) + deDia.elev * dia;
  L.int  = deNoche.int  * (1 - dia) + deDia.int  * dia;
  L.dia  = dia;
  L.cielo = cicloCielo(h);

  /* La banda donde vive el texto es la parte alta del cielo. */
  const lumTexto = luminancia(L.cieloAlto) * 0.7 + luminancia(L.cieloBajo) * 0.3;
  L.lumTexto = lumTexto;
  L.tinta = lumTexto > CRUCE_TINTA ? 'oscura' : 'clara';

  /* Cerca del cruce, comprimir el degradado del cielo: el cielo real
     se aplana con luz difusa, y así ninguna tinta pierde contra los
     dos extremos del degradado. 1 = sin comprimir, 0 = plano. */
  L.compresion = rampa(Math.abs(lumTexto - CRUCE_TINTA), 0, 0.12);

  /* Posición de la luminaria. Sale por un lado y se pone por el otro.
     TODO: en el cruce exacto de dia=0.5 el disco salta de un horizonte
     al otro. Es un instante, con el disco casi tapado por la bruma.
     Se arregla dibujando sol y luna a la vez, pesados por `dia`. */
  L.diurno = dia >= 0.5;
  L.fuenteX = L.diurno
    ? limita((h - AMANECER) / (ATARDECER - AMANECER))
    : 1 - limita(pn);

  return L;
}

/** Escribe los tokens en :root y la tinta en <html>.
    Dos correcciones que se miden, no se opinan:

    1. El degradado del cielo se comprime hacia su punto medio cuando
       la luminancia se acerca al cruce. El shader ya lo hace; el
       respaldo CSS tiene que hacer lo mismo o sin WebGL el crepúsculo
       queda ilegible.
    2. Aun comprimido, en el cruce ambas tintas empatan en ~4.0:1 —
       suficiente para el título (texto grande, umbral 3:1) pero no
       para el lockup (umbral 4.5:1). Por eso sale un LAVADO detrás
       del texto, del lado contrario a la tinta, con alfa = 1−compresión.
       En acuarela un lavado es un gesto nativo, no un parche. */
export function aplicar(L, escribirLavado = true) {
  const r = document.documentElement;

  const medio = mezcla(L.cieloAlto, L.cieloBajo, 0.5);
  const k = 1 - L.compresion;
  const alto = mezcla(L.cieloAlto, medio, k);
  const bajo = mezcla(L.cieloBajo, medio, k);

  /* Cuando hay lienzo, el lavado lo calibra main.js midiendo lo que de
     verdad quedó pintado detrás del texto (la luna se pasea por ahí).
     Este valor por compresión es solo el respaldo sin WebGL. */
  if (escribirLavado) {
    r.style.setProperty('--lavado', (k * 0.30).toFixed(3));
    /* La tinta del hero ya es blanca de forma estable. Incluso en el
       respaldo sin WebGL, el lavado que la sostiene tiene que ser oscuro;
       un lavado claro debajo de letra blanca borraria las dos cosas. */
    r.style.setProperty('--lavado-color', '#0B141A');
  }
  r.style.setProperty('--cielo-alto', aCss(alto));
  r.style.setProperty('--cielo-bajo', aCss(bajo));
  /* La franja del horizonte también se comprime hacia el medio cerca
     del cruce de tinta, por lo mismo que las otras dos: sin WebGL el
     respaldo CSS tiene que hacer exactamente lo que hace el shader o
     el crepúsculo queda ilegible en el único caso en que la pintura
     no está para salvarlo. */
  r.style.setProperty('--cielo-horizonte',
                      aCss(mezcla(L.cieloHorizonte, medio, k * 0.7)));
  r.style.setProperty('--agua',       aCss(L.agua));
  r.style.setProperty('--agua-altas', aCss(L.altas));
  r.style.setProperty('--reguero',    aCss(L.reguero));
  r.style.setProperty('--bruma',      aCss(L.bruma));
  r.style.setProperty('--acento',     aCss(L.acento));
  /* La garza en vuelo vive en el DOM: se lleva a la luz de la hora
     con brillo, no con color — la lámina ya es casi monocroma.

     LA PENDIENTE SE EMPINÓ, medida contra el árbol. De noche (int 0.35)
     la fórmula vieja daba 0.73 y el manglar es una silueta casi negra:
     ocho garzas blancas encendidas sobre una copa apagada, cada una un
     agujero en la noche. Un ave dormida en un árbol a oscuras es un
     bulto apenas más claro que la hoja, no una lámpara. Con 0.42 de
     suelo, a mediodía queda igual (1.02 antes, 1.05 ahora) y de noche
     baja a 0.64 — todavía se ven, que es lo que pide la presencia,
     pero ya son cuerpos EN el árbol y no encima de él. */
  /* Y SE EMPINÓ OTRA VEZ, con el mismo criterio y más lejos: a 0.64 el
     ave nocturna seguía leyéndose como lámina propia. 0.32 de suelo la
     deja en 0.54 de madrugada —un bulto en el árbol, apenas más claro
     que la hoja— y a mediodía en 1.05, igual que estaba. */
  r.style.setProperty('--vuelo-brillo', (0.32 + 0.73 * L.int).toFixed(3));
  /* Cuanta más luz, más aire entre el ave y quien mira: de día se lava
     más que de noche, igual que el agua lejana. El suelo del velo sube
     a 0.26: la bruma nocturna es añil y velar con añil también hunde
     al ave en la noche, no solo en el aire. */
  r.style.setProperty('--vuelo-sat', (0.34 - 0.12 * L.int).toFixed(3));
  r.style.setProperty('--vuelo-contraste', (0.80 - 0.16 * L.int).toFixed(3));
  r.style.setProperty('--vuelo-velo', (0.26 + 0.10 * L.int).toFixed(3));
  /* La visitante está a un palmo: se apaga con la noche como todo lo
     demás —era la única sin acople a la hora, y por eso cantaba— pero
     nunca se lava: techo 1.0 y suelo más alto que el de las lejanas,
     porque lo cercano recibe la primera luz. */
  r.style.setProperty('--vuelo-brillo-cerca',
                      Math.min(1.0, 0.50 + 0.62 * L.int).toFixed(3));
  r.dataset.tinta = L.tinta;
}

export const horaAhora = () => {
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
};

/** El dato, plano, sin imperativo. El mundo no arenga: "el sol sale a
    las 5:54" es un hecho sobre el mundo, no una exigencia sobre ella.
    Y el amanecer no se actúa: si se queda, le llega de verdad. */
export function notaAmanecer(h) {
  const faltan = ((AMANECER - h) + 24) % 24;
  if (faltan > 7 || faltan < 0.02) return '';
  const hh = Math.floor(AMANECER);
  const mm = Math.round((AMANECER - hh) * 60);
  return `El sol sale a las ${hh}:${String(mm).padStart(2, '0')}.`;
}
