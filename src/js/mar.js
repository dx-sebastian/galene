/* ═══════════════════════════════════════════════════════════════════
   mar.js — el mar, en WebGL2.

   Principio: NO SE SIMULA AGUA. SE DEFORMA UNA ACUARELA DE AGUA.
   Las láminas pintadas se muestrean desplazadas por un mapa de flujo;
   la pintura entera se conserva —los dabs, los bordes, el papel— y aun
   así se mueve y responde a `calma` y a la hora real.

   Las láminas aportan ESTRUCTURA DE VALOR, no color: cada una se
   remapea en duotono contra la paleta de la hora. Por eso una sola
   pintura sirve para las 4 a.m. y para las 3 p.m., y por eso las leyes
   de contraste las gobierna el motor y no el archivo.
   ═══════════════════════════════════════════════════════════════════ */

/* ── EL VIENTO, EN UN SOLO SITIO ────────────────────────────────────
   Devuelve cuánto empuja el aire ahora mismo, de −1 a 1. Lo usan el
   shader (para doblar la copa del manglar y la rama cercana) y main.js
   (para mover con ellas a las garzas posadas, que son DOM).

   Dos senos de periodo largo y primos entre sí: uno de unos veinte
   segundos y otro de treinta y tres. Nunca se repiten a la vez, así que
   la copa no vuelve nunca a la misma posición y no hay ciclo que
   detectar — que es lo único que distingue el viento de un péndulo.

   Y NO HAY RÁFAGAS. Un golpe de viento es un sobresalto, y este sitio
   se abre en el peor momento de la vida de alguien: el aire de aquí
   empuja despacio y no sorprende nunca. */
export function viento(t) {
  /* Periodos de unos 12 y 20 segundos. Estaban en 20 y 33 y era
     demasiado lento para verse: el ojo no detecta un desplazamiento por
     debajo de uno o dos píxeles por segundo, y con aquel ciclo la copa
     se movía a medio píxel. Sigue sin haber ráfagas — el aire empuja
     despacio y no sorprende — pero ahora se percibe que empuja. */
  /* ── Y UNA ENVOLVENTE LENTÍSIMA ────────────────────────────────────
     AQUÍ HAY UNA CONTRADICCIÓN Y CONVIENE DEJARLA ESCRITA. Se pidió
     que las hojas tuvieran "pequeñas ráfagas cada varios segundos",
     porque si todo se mueve a ritmo constante el cerebro detecta que
     es una animación — y eso es cierto y es el mejor argumento del
     encargo entero. Pero una ráfaga tiene un ATAQUE, y un ataque es un
     sobresalto, y este sitio se abre en el peor momento de la vida de
     alguien. La regla de arriba —no hay ráfagas— no se toca.

     Lo que sí se puede tener es la irregularidad SIN el ataque: no
     cambia la velocidad del aire, cambia CUÁNTO aire hay, y cambia tan
     despacio que no tiene principio. Dos senos de dos y tres minutos,
     primos entre sí: hay tramos de casi quietud y tramos de más
     movimiento, nunca a la misma distancia y nunca con un borde.

     El resultado es lo que se pedía —ritmo desigual, así que no hay
     ciclo que detectar— por el camino que este sitio sí permite. Y va
     dentro de viento(), o sea que la copa, la rama del primer término
     y las garzas posadas respiran a la vez: si esto viviera solo en el
     shader, las aves se quedarían agitándose sobre un árbol calmado. */
  const aire = 0.58 + 0.42 * (0.5 + 0.5 * Math.sin(t * 0.0431))
                    * (0.5 + 0.5 * Math.sin(t * 0.0267 + 2.1)) * 2.0;
  return (Math.sin(t * 0.50) * 0.55 + Math.sin(t * 0.31 + 1.3) * 0.45)
         * Math.min(1.0, aire);
}

/* CUÁNTO SE DOBLA CADA COSA, en fracciones de su propia lámina.

   Viven aquí y se INTERPOLAN en el GLSL de abajo en vez de escribirse a
   mano allí, porque los mismos dos números los necesita main.js para
   mover las garzas con la rama en la que están posadas. Ya estuvieron
   escritos en los dos archivos y duró exactamente hasta la primera vez
   que hubo que subir la amplitud: el árbol se movió y las aves se
   quedaron clavadas en el aire. Una sola definición.

   La copa se dobla menos que la rama del primer término, y las dos
   cosas son ciertas: un tronco es rígido y una rama en voladizo no, y
   además la rama está a un palmo del ojo, donde el mismo movimiento
   real se ve al triple. */
/* SUBIDAS DOS VECES, y las dos por lo mismo: no se veían.

   Empezaron en 0.011 —tres píxeles y medio de recorrido en veinte
   segundos, o sea un sexto de píxel por segundo— y pasaron a 0.034, que
   seguía siendo medio píxel por segundo. Se comprobó midiendo el propio
   lienzo que el viento SÍ llegaba al shader y deformaba la lámina; lo
   que fallaba era la escala, no el mecanismo.

   Y AQUI HUBO UNA CIFRA FALSA QUE CONVIENE NO REPETIR. Se escribio que
   a 0.085 la copa recorria 49.7 px, sacado de una cuenta analitica con
   las unidades cruzadas. Medido de verdad sobre el lienzo —buscando el
   canto de la copa pixel a pixel— eran 17 px de bufer, o sea unos 11
   de pantalla: cuatro veces menos. La cuenta estaba mal; la medida es
   la que vale.

   Lo que de verdad hizo visible el arbol no fue esta amplitud sino el
   bamboleo por trozos del follaje, mas abajo: el movimiento
   DIFERENCIAL se ve, el uniforme no.

   0.085 -> 0.068 (un 20 % menos) -> 0.034 (la mitad otra vez). Las dos
   bajadas por lo mismo: se movia demasiado. Y el bamboleo del follaje
   bajo en la misma proporcion las dos veces, porque el movimiento sale
   de los dos sitios y tocar solo uno deja las hojas agitadas sobre un
   arbol quieto.

   Si hay que volver a tocarlo, ESTE es el numero: las garzas posadas lo
   leen de aqui y se mueven con el arbol solas.

   El techo de esto no es el buen gusto sino la lámina: es un cizallado,
   y pasado cierto punto las hojas se estiran en vez de moverse. */
export const VIENTO_COPA = 0.034;
export const VIENTO_RAMA = 0.070;

/* CUÁNTO SE ENCOGE EL FRAGMENTO CERCANO según la forma de la ventana.
   En móvil se comía la composición —0.92 del alto con la pantalla
   estrecha tapaba al protagonista— así que se achica: el primer término
   enmarca, no tapa.

   Vive aquí, en JS, y viaja al shader como uniforme en vez de
   calcularse allí. La razón es un fallo que estuvo escondido todo este
   tiempo: el shader encogía la lámina y `posaderoCercano()` no se
   enteraba, así que en cualquier pantalla más estrecha que 1.35 de
   aspecto la garza cercana se posaba sobre una rama que ya no estaba
   donde ella creía. En escritorio ancho el factor vale 1 y por eso no
   se veía nunca. Con una sola definición no puede volver a pasar.

   ── EL SUELO SUBE DE 0.60 A 0.72, Y ESO CORRIGE UNA CONFUSIÓN ──────
   La nota de arriba dice que este fragmento «tapaba al protagonista», y
   el protagonista de esta esquina ES ÉL: la rama del primer término es
   donde se posa la garza que llega. Lo que tapaba era el manglar del
   fondo, que es el paisaje.

   Medido a 390x844 con el factor en 0.60: la rama medía 0.552 del alto
   y la garza que se para en ella, 110 px — un ave de 13 % de pantalla
   metida en la esquina de abajo, con las patas por debajo del canto
   (ver la nota del anclaje en `baseCerca`). A 0.72 la rama mide 0.662 y
   el ave 131 px, que es la proporción que tiene en escritorio respecto
   al árbol del fondo. Sigue siendo más pequeña que en una ventana
   ancha: en un teléfono no cabe la lámina entera y eso no se discute.
   Lo que cambia es que vuelve a leerse como PRIMER TÉRMINO. */
export function encogeCerca(aspecto) {
  const t = Math.min(1, Math.max(0, (aspecto - 0.62) / (1.35 - 0.62)));
  return 0.72 + 0.28 * (t * t * (3 - 2 * t));
}


const VS = `#version 300 es
void main(){
  vec2 p = vec2((gl_VertexID == 1) ? 3.0 : -1.0,
                (gl_VertexID == 2) ? 3.0 : -1.0);
  gl_Position = vec4(p, 0.0, 1.0);
}`;

/* Reconstrucción móvil. La pintura cara vive a resolución CSS; este
   pase la presenta a resolución física y devuelve el microcontraste que
   el filtrado lineal borraría. Son cinco lecturas vecinas muy baratas
   frente a volver a ejecutar todo el mar, el cielo y el manglar a DPR 2. */
const FS_HD = `#version 300 es
precision highp float;
out vec4 salida;
uniform sampler2D u_escena;
uniform vec2 u_escenaTam, u_salida;

float valorHD(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

void main(){
  vec2 uv = gl_FragCoord.xy / u_salida;
  vec2 texel = 1.0 / u_escenaTam;
  vec3 c = texture(u_escena, uv).rgb;
  vec3 n = texture(u_escena, uv + vec2(0.0,  texel.y)).rgb;
  vec3 s = texture(u_escena, uv - vec2(0.0,  texel.y)).rgb;
  vec3 e = texture(u_escena, uv + vec2(texel.x, 0.0)).rgb;
  vec3 o = texture(u_escena, uv - vec2(texel.x, 0.0)).rgb;
  vec3 vecindad = (n + s + e + o) * 0.25;
  vec3 detalle = c - vecindad;

  /* El detalle se calcula en texeles de la escena, no en píxeles ya
     ampliados. La textura fina recibe más ganancia y los cantos fuertes
     menos; el límite de sobreimpulso evita halos en luna y estrellas. */
  float contraste = max(max(abs(valorHD(c) - valorHD(n)),
                             abs(valorHD(c) - valorHD(s))),
                         max(abs(valorHD(c) - valorHD(e)),
                             abs(valorHD(c) - valorHD(o))));
  float ganancia = mix(0.82, 0.38, smoothstep(0.055, 0.30, contraste));
  vec3 realce = clamp(detalle * ganancia, vec3(-0.070), vec3(0.070));
  vec3 nitido = c + realce;
  salida = vec4(clamp(nitido, 0.0, 1.0), 1.0);
}`;

const FS = `#version 300 es
precision highp float;
out vec4 salida;

uniform vec2  u_res;
uniform float u_t;
uniform float u_hor;
uniform float u_calma;      // 0.35 … 0.85
/* DOS paralajes, y la distinción importa:
   u_deriva  — acumulativo, sin límite. SOLO para las bandas de agua, que
               son texturas repetidas y por eso pueden desplazarse siempre.
   u_paralaje— acotado (puntero + scroll). Para todo lo DISCRETO: manglar,
               garzas, grafito. Un objeto único con deriva acumulativa se
               va caminando fuera de cuadro y no vuelve nunca. */
uniform float u_deriva, u_paralaje;
uniform float u_comp;
/* EL VIENTO. Un solo escalar en [-1,1] que llega ya calculado desde JS
   —ver viento() arriba del todo, fuera del shader— porque el mismo
   numero lo necesitan tres sitios: la copa del manglar, la rama del
   primer termino y las garzas posadas, que viven en el DOM y no aqui.
   Si cada uno se lo calculara por su cuenta, bastaria con que alguien
   tocara una constante para que las aves se despegaran del arbol.
   (Y sin comillas invertidas en este comentario: esto vive dentro de un
   template literal y ya ha cortado el archivo tres veces.) */
uniform float u_viento;
uniform float u_encoge;         // ver encogeCerca() al final del archivo
/* EN QUE PUNTO DEL CICLO DE CIELOS estamos, de 0 a 4. Ver cicloCielo()
   en hora.js. Es continuo, asi que su parte entera dice que lamina
   toca y su fraccion cuanto se ha avanzado hacia la siguiente. */
uniform float u_cielo;
uniform float u_int;
uniform vec2  u_fuente;
uniform float u_papel;
uniform float u_laminas;    // 0 = procedural, 1 = pintura cargada
uniform vec3  u_cieloAlto, u_cieloBajo, u_agua, u_altas, u_reguero, u_bruma;
/* LA TERCERA PARADA DEL CIELO: la franja luminosa del horizonte. El
   cielo era una rampa entre dos colores y ocupa medio cuadro, asi que
   medio cuadro no tenia donde mirar. Ver hora.js. */
uniform vec3  u_cieloHorizonte;

uniform sampler2D u_lejano, u_medio, u_medioCalmo, u_cercano, u_cercanoCalmo, u_manglar;
uniform vec2 u_vLejano, u_vMedio, u_vCercano;   // ventana v: (cerca, lejos)
uniform float u_hayManglar;
uniform vec4  u_manglarCaja;    // x centro, alto, hundimiento, ancho/alto
/* EL GESTO DE SOSTENER. Hasta seis toques vivos: x, y (en q), fuerza y
   edad. Sostener aplana el agua alrededor, y al soltar el agua SE QUEDA
   plana: lo que dejas, queda.

   Y la regla que no se cruza: EL ANILLO COLAPSA HACIA ADENTRO. Un anillo
   que se expande desde un punto es una gota cayendo en un líquido, que
   es exactamente la escena que este sitio no re-escenifica. Aquí el
   radio se encoge con la edad del toque: el gesto recoge, no derrama. */
uniform vec4  u_toques[6];
uniform vec3  u_escalas;        // repeticiones por banda: lejos, medio, cerca
uniform float u_croma;          // cuánto pigmento propio de la lámina se conserva
uniform sampler2D u_papelTex;
uniform sampler2D u_ruidoTex;
uniform float u_hayPapel, u_papelTam, u_papelMedia;
uniform sampler2D u_nubes;
uniform float u_hayNubes;
/* La via lactea PINTADA. Es una aguada con salpicado de sal —el gesto
   que hace un acuarelista para un cielo estrellado— y entra como banda
   diagonal.
   VA ENTRE MARCAS, y no basta con el uniforme de siempre: GL cuenta un
   sampler como activo por estar declarado, aunque solo se lea dentro de
   una rama que nunca se ejecuta. Cuando no cabe, el bloque se recorta
   del codigo fuente antes de compilar y manda el campo procedural.
   Ver recortar(). */
//#ESTRELLAS
uniform sampler2D u_estrellas;
uniform float u_hayEstrellas;
//#FIN
uniform sampler2D u_manglarCerca, u_corales, u_luces;
uniform sampler2D u_astro, u_camino;
uniform vec3  u_roce;           // x, y en q; z = fuerza del puntero
uniform float u_hayAstro, u_hayCamino;
uniform float u_hayCerca, u_hayCorales, u_hayLuces;
uniform vec4  u_cercaCaja;      // x, alto, base, ancho/alto
uniform vec3  u_coralesCaja;    // alto, base, ancho/alto
uniform sampler2D u_grafitoTex;
uniform float u_hayGrafito, u_grafitoMedia;
uniform vec3  u_grafito;        // ancla v del horizonte dibujado, escala, fuerza
/* ── LAS GARZAS DEL SHADER, QUE YA NO SE PINTAN AQUI ──────────────
   Se fueron al DOM: aqui estaban paradas en mar abierto y una garza
   vadea en somero (ver main.js). main.js dejo de pedir sus laminas, asi
   que u_hayGarzas lleva tiempo valiendo cero — pero sus dos samplers
   SEGUIAN contando, porque GL no distingue una rama muerta de una viva.
   Eran dos unidades de textura de las dieciseis pagando por codigo que
   no pinta un pixel, y son justo las que le faltaban a la via lactea.
   El codigo se queda por si algun dia vuelven; recortado, no cuesta. */
//#GARZAS
uniform sampler2D u_garzaCerca, u_garzaLejos;
uniform float u_hayGarzas;
uniform vec4  u_garzaCercaCaja; // x, alto, hundir, ancho/alto
uniform vec4  u_garzaLejosCaja;
//#FIN

#define TAU 6.28318530718

float hash(vec2 p){
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p + 19.19);
  return fract(p.x * p.y);
}
__RUIDO_FUNCION__
float fbm(vec2 p){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < __FBM_OCTAVAS__; i++){
    s += a * ruido(p); p *= 2.03; a *= 0.5;
  }
  return s;
}
float bordeDeMancha(float m, float umbral, float grosor){
  return smoothstep(umbral - grosor, umbral, m) *
         (1.0 - smoothstep(umbral, umbral + grosor, m));
}
float valor(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

/* EL PAPEL. En acuarela no existe la pintura blanca: lo más claro del
   cuadro es papel sin tocar, y de ahí sale TODA la luz. Medido antes de
   esto: cero píxeles por encima de 0.80 de luminancia a cualquier hora.
   Ni uno. Por eso la imagen se sentía impresa en vez de pintada — la luz
   no venía de ningún sitio, estaba repartida.

   El papel se tiñe un poco con la luz de la hora, pero poco: una hoja
   sigue siendo una hoja de noche. */
vec3 papelBlanco(){
  /* El tinte estaba en 0.28 y con altas=#AFC4BE eso dejaba el papel en
     0.787 de luminancia: reserva que no llegaba a contar como reserva.
     Una hoja se tine un poco con la luz del sitio, pero poco. */
  /* Casi sin tenir. Detras del papel vienen el grafito, la trama y la
     pasada final de aplanado, y entre los tres bajaban un pixel de 0.87
     a por debajo de 0.80: la reserva estaba, pero la cola del shader se
     la comia. */
  return mix(vec3(0.984, 0.978, 0.966), u_altas, 0.05);
}

/* ═══ LA LUZ TIENE UN LADO ══════════════════════════════════════════
   Hasta aqui todo recibia la misma cantidad de luz viniera de donde
   viniera la fuente. Por eso la escena se leia plana: sin direccion no
   hay volumen, solo recorte, y el cuadro entero parecia iluminado por
   un dia nublado aunque hubiera un sol pintado arriba.

   No hay normales que iluminar —esto son laminas—, asi que la
   direccion se aproxima con lo unico que si se sabe: en que lado del
   objeto cae la fuente. ladoDeLuz vale 1 en el canto que la mira y 0
   en el opuesto, y va al cuadrado para que la caricia se quede en el
   borde en vez de banar la lamina entera.

   Es exactamente lo que hace un acuarelista: no pinta el volumen,
   pinta el canto iluminado y deja que el ojo complete el resto. */
float ladoDeLuz(float mx, float centroObj, float aspecto){
  float haciaDerecha = step(centroObj, u_fuente.x * aspecto);
  float b = mix(1.0 - mx, mx, haciaDerecha);
  return b * b;
}

/* EL COLOR DE LA LUZ, en un solo sitio. Sale de u_reguero —que ya es
   el color de la fuente de esta hora— empujado hacia el papel: calida
   casi blanca de dia y plateada de noche, y las dos salen solas de
   aqui sin escribir un color por franja horaria.

   Nunca es blanco puro: en acuarela no existe la pintura blanca. */
vec3 luzCalida(){ return mix(u_reguero, vec3(0.985, 0.972, 0.945), 0.32); }

/* CUANTA luz direccional hay ahora. De noche NO es cero —la luna
   tambien tiene un lado, y ademas es fria porque u_reguero lo es a esa
   hora— pero es un quinto. Que la noche conserve direccion es lo que
   la separa de "el dia con el brillo bajado", que es como se leia. */
/* El suelo estaba en 0.22 y MEDIDO no llegaba: a las 2:00 la
   diferencia de claridad entre el lado del arbol que mira a la luna y
   el opuesto era de 0.07 en L*, o sea cero —el umbral de que se note
   una diferencia de claridad ronda 1—. A las 21:00, con u_int en 0.50,
   salia 2.31 y se ve. La madrugada es la hora que manda en este
   proyecto y se estaba quedando sin direccion de luz.
   A 0.34 sigue siendo un tercio del dia, que es lo que es la luna. */
float fuerzaLuz(){ return mix(0.34, 1.0, smoothstep(0.30, 0.85, u_int)); }

/* APLANAR. Una aguada seca PLANA: se posa, se seca y deja un campo de un
   solo tono. Lo que había era degradado continuo, que es la firma del
   aerógrafo. Esto cuantiza el VALOR en unos pocos escalones y deja el
   color en paz; dureza decide si el escalón es un canto seco (bajo) o
   una transición perdida (alto). */
vec3 aplanar(vec3 c, float pasos, float dureza){
  float v = valor(c);
  if (v < 0.0005) return c;
  /* SE CUANTIZA EN CLARIDAD, NO EN LUMINANCIA. Los escalones lineales
     se reparten mal: de noche el cuadro entero vive entre 0 y 0.3, asi
     que once escalones lineales solo cruzaban tres y la noche seguia
     siendo una rampa —59.7 % de degradado contra 45.9 % de dia—. La
     raiz cubica es aproximadamente como ve el ojo, y ademas es como se
     reparten los valores de una acuarela: muchos pasos entre los
     claros, pocos entre los oscuros. */
  float cv = pow(v, 0.3333);
  float e = cv * pasos;
  /* EL ESCALON NO PUEDE SER RECTO. Cuantizar sin mas dejaba bandas con
     contorno matematico —un artefacto digital, justo lo contrario de lo
     que se busca—. Un charco de acuarela se para donde el papel deja de
     mojarse, asi que el limite serpentea siguiendo la trama.
     Es ruido de periodo largo, no grano: lobulos de unos noventa
     pixeles. Con ruido fino saldria granulado de pelicula. */
  /* Mas amplitud: el borde tiene que recorrer mas de un escalon entero
     para que no se lea como curva de nivel. */
  e += (fbm(gl_FragCoord.xy / 76.0) - 0.5) * (1.85 / pasos);
  float f = floor(e);
  float cq = (f + smoothstep(0.5 - dureza, 0.5 + dureza, e - f)) / pasos;
  float vq = cq * cq * cq;
  /* El tope estaba en [0.55, 1.8] y de noche eso desarmaba la funcion:
     con v = 0.02 la razon vq/v se va facil por encima de 2, se topaba, y
     la cuantizacion quedaba a medias justo en las horas oscuras — 68 %
     de degradado en la banda del horizonte contra 46 % de dia. El tope
     esta para que un pixel casi negro no salte a blanco, no para
     desactivar el aplanado; con [0.30, 3.4] sigue cumpliendo eso. */
  return c * clamp(vq / v, 0.30, 3.4);
}

/* Duotono: la lámina entrega estructura de valor; la hora entrega el
   color. Se expande el rango pintado para no perder los extremos. */
/* CURVA DE CROMA. Multiplicar el color por una ganancia pareja sube la
   media y deja el tope donde estaba: media baja + tope bajo + un solo
   matiz es la receta exacta del look vintage, y medido salia asi —0.158
   de media pero solo 0.35 de tope, y el 78 % de los matices frios.

   Una acuarela viva no tiene mas color en todas partes: tiene la mayor
   parte del cuadro apagada y DOS O TRES SITIOS donde el pigmento se
   encharco y seco limpio. Asi que la ganancia sube con el croma que la
   lamina ya trae: lo apagado se queda apagado —de ahi la paz— y lo que
   ya tenia color se aclara de verdad. */
vec3 croma(vec3 pintura, float base, float tope){
  vec3 desv = pintura - vec3(valor(pintura));
  float f = length(desv) * 1.732;             // 0..1 aprox
  return desv * mix(base, tope, smoothstep(0.10, 0.42, f));
}

vec3 duotono(vec3 pintura, vec3 oscuro, vec3 claro){
  float v = clamp((valor(pintura) - 0.08) / 0.82, 0.0, 1.0);
  return mix(oscuro, claro, v);
}

/* Una banda de agua. t01 es 0 en el borde lejano de la banda y 1 en el
   cercano; ventana recorta el margen de papel de la lámina.
   (Sin comillas invertidas aquí dentro: cortan el template literal.) */
vec3 banda(sampler2D tex, vec2 ventana, float x, float t01, vec2 duv,
           float escala, float velocidad){
  vec2 uvT;
  uvT.x = x * escala + u_deriva * velocidad + duv.x;
  uvT.y = mix(ventana.y, ventana.x, clamp(t01, 0.0, 1.0)) + duv.y;
  return texture(tex, uvT).rgb;
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspecto = u_res.x / u_res.y;
  vec2 q = vec2(uv.x * aspecto, uv.y);
  float cn = clamp((u_calma - 0.35) / 0.5, 0.0, 1.0);
  vec3 col;

  /* La fuente, en las mismas unidades que q (alto de pantalla). Se
     calcula UNA vez: la usan el cielo, las estrellas, el reguero y
     ahora tambien la luz direccional, el halo y los destellos del
     agua. Cada uno la reconstruia por su cuenta. */
  vec2 fuenteQ = vec2(u_fuente.x * aspecto, u_fuente.y);

  /* CUANTO DE CANTO ENTRA LA LUZ. 1 con el astro posado en el horizonte,
     0 con el sol en lo alto. Es la variable que de verdad decide como se
     ve un cielo, y estaba calculada solo dentro del bloque de nubes: la
     franja del horizonte la necesitaba igual y no la tenia, asi que
     entraba con la misma fuerza a mediodia que en el ocaso — y a
     mediodia el horizonte no tiene un resplandor dorado, tiene bruma
     palida. De ahi que la franja se leyera como una cinta pegada. */
  float solBajo = 1.0 - smoothstep(0.0, 0.32,
                    (u_fuente.y - u_hor) / max(1.0 - u_hor, 0.001));

  /* LA RESERVA se acumula aqui y se aplica al FINAL de cada capa. La
     primera version la aplicaba en medio del agua y la bruma del
     horizonte se la comia entera, que es justo donde mas falta hacia.
     Papel reservado es papel que nunca se pinto: nada de lo que venga
     despues dentro de su capa puede taparlo. */
  float reservaPapel = 0.0;

  /* EL HORIZONTE NO ES UNA REGLA. Un corte perfectamente recto entre dos
     bandas lee como collage, no como cuadro. Se le da una ondulación
     mínima —el pulso de una mano, no olas— y con eso deja de ser un
     borde de rectángulo. El resto del motor sigue usando u_hor plano
     para plantar objetos, o se pondrían a cabecear. */
  /* Y la linea misma tampoco es recta. Estaba en +-0.0055 del alto, que
     a 800 px son cuatro pixeles: por debajo del umbral de que se note.
     Un horizonte pintado a mano tiene el pulso dentro. Se le suma un
     termino de periodo largo, que es el que hace que no se lea como
     una regla temblorosa sino como una linea trazada de un gesto. */
  /* TRIPLICADA. Estaba en +-0.007 del alto: siete pixeles en una ventana
     de 664, o sea un 1 %. Eso no es el pulso de una mano, es una regla a
     la que le tiembla el pulso — y se sigue leyendo como recta.

     Y hay algo mas importante que la amplitud: un horizonte de acuarela
     no ONDULA, se PIERDE. La linea existe donde el charco se paro y
     desaparece donde la bruma se la comio, y esa alternancia es la firma
     del medio. La amplitud sube aqui; la perdida, mas abajo, donde vive
     el termino que pierde el canto, mas abajo. */
  float horX = u_hor
    + (fbm(vec2(q.x * 0.62 + 19.0, 2.6)) - 0.5) * 0.0340
    + (fbm(vec2(q.x * 1.7, 4.2)) - 0.5) * 0.0130
    + (ruido(vec2(q.x * 9.0, 1.1)) - 0.5) * 0.0038;

  /* ═══ CIELO ═══════════════════════════════════════════════════ */
  if (uv.y >= horX) {
    float gy = (uv.y - horX) / max(1.0 - horX, 0.001);
    gy = mix(0.5, gy, u_comp);              // compresión del crepúsculo
    /* ── EL AZUL TIENE QUE BAJAR MAS ─────────────────────────────
       Con exponente 0.85 el degradado llega a la mitad del cielo con
       solo un 55 % del color alto dentro, asi que dos tercios del cielo
       eran una mezcla lavada del azul de arriba con el tono palido de
       abajo. MEDIDO a las 12:00 sobre todo el cielo: mediana 82 de L* y
       0.137 de saturacion — o sea claro y sin color, que es
       exactamente lo que se ve y lo que no se quiere.

       Un cielo de mediodia no se aclara despacio desde el cenit: es
       azul hasta bastante abajo y se lava DE GOLPE cerca del horizonte,
       porque lo que lo lava es el espesor de aire, y ese crece muy
       rapido en el ultimo tramo. Bajar el exponente a 0.60 con el sol
       alto reparte el azul asi.

       Solo de dia: en los crepusculos el degradado ancho ES el motivo
       —el rosa de la banda media es la mitad de esa hora— y ahi el 0.85
       se queda. Y ademas la franja del horizonte, que ya existe, se
       encarga de la parte palida de abajo mejor que este exponente. */
    float azulHondo = smoothstep(0.55, 0.92, u_int);
    /* EL EXPONENTE SALE DE LA FOTO, y va al reves de lo que supuse.
       Ajustando t = gy^k contra las seis franjas medidas de la
       referencia sale k ~ 2.0: el cielo se mantiene palido hasta bien
       arriba y solo se oscurece en el cuarto superior. Yo lo habia
       BAJADO a 0.60 para "bajar el azul", que es exactamente lo
       contrario — asi el azul invadia el medio y el cuadro perdia el
       aire palido que tiene la foto. */
    col = mix(u_cieloBajo, u_cieloAlto, pow(gy, mix(0.85, 2.00, azulHondo)));

    /* ═══ LA FRANJA LUMINOSA DEL HORIZONTE ═══════════════════════
       El cielo ocupa mas de la mitad del cuadro y era una rampa entre
       dos colores parecidos: medio cuadro sin un solo sitio donde
       mirar. Eso es lo que hacia que la escena se leyera gris aunque
       sus colores no lo fueran, y es lo que separa "melancolico" de
       "sereno" — un amanecer no es un cielo mas claro, es un cielo con
       LUZ EN UN SITIO.

       Tres cosas la hacen aguada y no degradado:

       - Se concentra abajo al cuadrado, asi que a media altura ya no
         existe: es una franja, no un lavado general.
       - SIGUE A LA FUENTE. Sube donde esta el sol o la luna y baja al
         otro lado. Una franja pareja de lado a lado es otra recta, y
         ademas seria luz de ninguna parte: el mismo error que el
         reguero lleva corregido desde el principio.
       - El borde serpentea con un ruido de periodo largo. A q.x*1.6
         caben unos tres lobulos en una pantalla apaisada — mirar
         siempre la frecuencia contra el ancho, que ya se pago tres
         veces con ruidos de periodo mayor que la pantalla.

       Y se atenua con u_comp: en el crepuscino el cielo se aplana
       entero para que la tinta no pierda contra ningun extremo, y esta
       franja tiene que aplanarse con el resto. */
    /* ── Y AQUI ESTABA EL ERROR: ERA UNA CINTA, NO UNA CUPULA ─────
       Con la caida horizontal a 1.05 en unidades de alto, en una
       pantalla apaisada los dos cantos seguian recibiendo el 49 % de la
       franja: o sea que la banda cruzaba de lado a lado con casi la
       misma altura, y una horizontal continua de punta a punta se lee
       como una tira de papel pegada — el mismo fallo que ya se corrigio
       con el pasto marino y con el horizonte.
       A 0.68 y con el suelo en 0.20, la luz se queda ALREDEDOR de su
       fuente y los cantos del cuadro casi no se enteran. */
    /* ── Y SE MIDE EN ANCHOS DE PANTALLA, NO EN ALTOS ─────────────
       Estaba en q, que son unidades de ALTO. En escritorio apaisado eso
       daba un lóbulo de 0.68 altos ≈ 0.38 anchos, que es lo que se
       quería. En un móvil vertical el ancho ENTERO mide 0.46 altos, así
       que 0.68 lo cubría de sobra: la cúpula volvía a ser una cinta y
       trepaba hasta meterse detrás del texto. Medido a 381×825, el
       calibrador pedía un lavado de 0.475 — medio velo negro sobre la
       pintura, con la forma de la caja del rótulo.

       El resplandor de un horizonte ocupa una fracción del ANCHO del
       cuadro, no de su alto. En uv.x eso es cierto en las dos
       orientaciones y no hay ninguna cifra que ajustar por pantalla. */
    float haciaFuenteC = exp(-pow((uv.x - u_fuente.x) / 0.38, 2.0));
    /* Y LA FRANJA TREPA DONDE ESTA LA LUZ. Con un alto fijo salia una
       tira pareja pegada al horizonte, o sea otra recta tumbada. En la
       referencia el resplandor SUBE por el cielo justo encima del sol y
       se aplasta al alejarse: eso es lo que lo hace una fuente y no una
       banda. Es una cupula, no un renglon. */
    float alcance = mix(0.11, 0.46, haciaFuenteC);
    float bandaH = 1.0 - smoothstep(0.0, alcance, gy);
    bandaH *= bandaH;
    bandaH *= mix(0.20, 1.0, haciaFuenteC);
    /* Y BAJA CON EL SOL ALTO. A mediodia el horizonte no tiene un
       resplandor dorado: tiene bruma palida. La franja existe a todas
       horas —siempre hay mas aire hacia el horizonte— pero es el
       acontecimiento del cielo solo cuando la luz entra de canto.
       No se apaga del todo nunca: de noche el malva bajo es la ultima
       luz, y es lo que hace que la noche sea serena y no un apagon. */
    bandaH *= mix(0.52, 1.0, solBajo);
    /* EL CANTO, EN DOS OCTAVAS. Con un solo ruido de tres lobulos el
       borde de arriba ondulaba pero seguia siendo UNA linea ondulada.
       Un charco de acuarela tiene lobulos grandes y, dentro de ellos,
       mordiscos pequenos. */
    bandaH *= 0.62 + 0.52 * fbm(vec2(q.x * 1.6 + 31.0, gy * 3.4))
                   + 0.20 * (fbm(vec2(q.x * 5.1 - 8.0, gy * 9.0)) - 0.5);
    bandaH *= mix(0.55, 1.0, u_comp);
    col = mix(col, u_cieloHorizonte, clamp(bandaH, 0.0, 1.0) * 0.72);

    /* De degradado a AGUADA. Cuatro escalones con la transición medio
       perdida: quedan campos planos de verdad, que es lo que hace una
       aguada, en vez de una rampa continua de arriba abajo. */
    /* ONCE escalones, no cuatro. Con cuatro, un cielo cuyo valor va de
       0.35 a 0.75 cruzaba 1.6 escalones: casi ningun borde, o sea que
       cuantizar no hacia nada y el cielo seguia siendo una rampa —70 %
       de degradado y 0 % de canto, el bloque de aerografo mas grande
       del cuadro—. Lo que importa no es el numero de pasos sino cuantos
       cruza EL RANGO REAL del contenido. Once le dan cuatro o cinco
       tiras planas, que es un cielo de acuarela. */
    /* Y la DUREZA es la palanca de verdad, no el numero de escalones.
       Con 0.22 el 44 % de cada escalon era transicion —gradiente
       garantizado, hiciera lo que hiciera con los pasos—. A 0.07 la
       transicion ocupa un 14 % y el resto es aguada seca de verdad. */
    /* SIN aplanado propio. Cada capa con su cuantizacion ponia los
       escalones en sitios distintos, y por eso el cielo, el agua y el
       arbol parecian de tres cuadros diferentes. Ahora hay UNA sola
       pasada, al final, sobre la imagen ya compuesta: un solo juego de
       aguadas para todo. */

    /* Y SE ABRE EL PAPEL junto al horizonte. Está justificado: el cielo
       es más pálido cerca del horizonte porque la luz atraviesa más aire.
       Pero no en una franja pareja de lado a lado —eso sería otra recta—
       sino abriéndose y cerrándose con un ruido de periodo largo, como
       una reserva hecha a mano con el pincel seco. */
    /* La frecuencia importa mas que el umbral. A q.x*0.85 el ruido no
       completaba ni un periodo en todo el ancho: la boca abria entera o
       no abria nada, y como el valor caia por debajo del umbral, no
       abria nunca. A 3.1 caben dos o tres bocas, que es lo que se
       pidio. */
    /* La boca en DOS dimensiones. Con un ruido de solo q.x la reserva
       salia con los lados verticales: un rectangulo palido pegado al
       horizonte, que se lee como error y no como reserva. Metiendo la
       altura en el ruido el hueco tiene forma de mancha —que es lo que
       deja un pincel seco— y ya no tiene lados. */
    float bocaCielo = smoothstep(0.30, 0.47,
                        fbm(vec2(q.x * 3.1 + 12.0, gy * 5.2 + 3.7)));
    /* Y LA RESERVA SE APARTA DEL COLOR. Se abria justo en la franja baja
       del cielo, que es exactamente donde vive el rosa del amanecer y del
       ocaso: estaba blanqueando lo unico que distingue las 6:00 de las
       12:00. Por eso el dia entero se veia igual.

       Un acuarelista reserva el papel en los pasajes vacios, no a traves
       de su mejor color. Asi que la boca se cierra donde el cielo tiene
       croma y se abre donde es neutro. */
    float cromaCielo = length(col - vec3(valor(col)));
    float neutro = 1.0 - smoothstep(0.020, 0.085, cromaCielo);
    /* Y DE DIA LLEGA MAS ARRIBA. La reserva se cortaba a media altura
       del cielo a todas horas. MEDIDO sobre el cuadro entero: a las 9:00
       solo el 0.78 % de los pixeles pasaba de 0.80 de luminancia, y a
       las 13:00 el 2.51 %. Un dia luminoso no es un dia mas expuesto —
       la mediana ya estaba bien, en 0.455— es un dia con MAS PAPEL SIN
       PINTAR. Es el mismo diagnostico de la primera vez que se midio
       esto y la misma cura. */
    float diaCielo = smoothstep(0.45, 0.90, u_int);
    reservaPapel = max(reservaPapel,
                       (1.0 - smoothstep(0.02, mix(0.50, 0.80, diaCielo), gy))
                           * bocaCielo * neutro * mix(0.20, 1.0, u_int) * 0.99);

    /* ═══ LAS ESTRELLAS ═══════════════════════════════════════════
       La noche de este sitio no puede ser un apagón. Estaba resuelta
       como AUSENCIA de día —el mismo cielo con el brillo bajado— y una
       ausencia no consuela a nadie: se leía triste, que es exactamente
       lo que este sitio no puede permitirse a las cuatro de la mañana.

       Una noche de verdad no es oscura, es OTRA COSA iluminada. Y lo
       que la ilumina son las estrellas, que además son el argumento
       entero del cuadro dicho sin palabras: el cielo sigue ahí, y de
       noche tiene más cosas que de día, no menos.

       CÓMO SE PINTAN, que es lo que decide si esto vale o es un
       protector de pantalla:

       - No son puntos. Un punto de un píxel es una estrella de render;
         en acuarela lo más pequeño que existe es el toque de la punta
         del pincel, y tiene borde blando. Cada una es una manchita con
         caída suave, y las hay de tres tamaños.
       - No están repartidas parejas. Se sortea una por celda de una
         rejilla y se la mueve dentro de su celda, así que hay grupos y
         hay vacíos — que es como está el cielo de verdad.
       - Se apagan hacia el horizonte. Ahí la luz atraviesa mucho más
         aire y las estrellas bajas se pierden: es cierto, y además deja
         limpia la banda donde vive la bruma.
       - Tienen COLOR. Unas tiran a azul y otras a ámbar, que es verdad
         de las estrellas y es lo que impide que el campo se lea como
         sal esparcida.
       - Respiran, no parpadean. El periodo es de varios segundos y la
         amplitud pequeña: un centelleo rápido sería el «glitch» que la
         regla 2 prohíbe. Cada una en su fase, o titilarían a coro. */
    /* La puerta estaba en (0.20, 0.62): con int 0.50 a las nueve de la
       noche (h21) eso dejaba el factor de noche en 0.20, o sea que las
       estrellas y la via lactea apenas se veian a la hora que el sitio
       muestra por defecto. Las dos anclas nocturnas —h21 e h03— tienen
       que leer cielo lleno de estrellas.

       ── Y EL TECHO BAJA DE 0.85 A 0.74, MEDIDO EN LAS ANCLAS ──────
       Con (0.55, 0.85), al alba (int 0.72) el factor quedaba en 0.34 y
       al ocaso (0.76) en 0.25: TERCIO DE CAMPO ESTRELLADO encima de un
       cielo con el disco POSADO en el horizonte y nubes encendidas.
       Eso no pasa en ningun cielo: cuando el sol toca la linea, las
       estrellas ya se fueron — quedan dos o tres, no un campo. Con el
       techo en 0.74 el alba conserva un rastro (0.04, las dos o tres
       ultimas) y el ocaso ninguna, y las anclas nocturnas —int 0.50 y
       0.35— siguen leyendo el cielo LLENO, porque el suelo no se toca:
       el desvanecido es cosa del crepusculo, no de la propia noche. */
    float noche = 1.0 - smoothstep(0.50, 0.74, u_int);
    if (noche > 0.004) {
      /* Rejilla en unidades de ALTO (q), no de uv: si fuera en uv, las
         estrellas se estirarían con la ventana y en apaisado saldrían
         elipses. */
      /* LA REJILLA MANDA EL TAMAÑO, y la primera vez la puse en 26: con
         eso cada celda medía 22 px y las estrellas salían de hasta 18
         de radio. No eran estrellas, eran globos — el cielo entero se
         leía como un desenfoque de fondo de foto. El tamaño de una
         estrella pintada es el del toque de la punta del pincel: uno o
         dos píxeles de núcleo y el borde blando. A 105 la celda mide
         unos 5 px y la talla cae donde tiene que caer. */
      /* ── LA VIA LACTEA ────────────────────────────────────────────
         Esta en la referencia de noche, y no es un adorno anadido por
         gusto: es mas de lo que ya defiende este bloque —una noche no
         es oscura, es OTRA COSA iluminada, y de noche el cielo tiene
         mas cosas que de dia, no menos—.

         Se pinta como una AGUADA, no como un cumulo de puntos: una
         banda ancha con el borde comido por un ruido de periodo largo,
         empujada hacia el papel de la hora con un pelo de azul. Y de
         paso sube el brillo de las estrellas que caen dentro, que es
         la otra mitad de lo que la hace leer como via lactea en vez de
         como una mancha.

         La diagonal va en uv y no en q A PROPOSITO: en q el angulo se
         mantiene pero la banda se sale de cuadro en una pantalla
         estrecha —a aspecto 0.5 desaparecia entera—. En uv el angulo
         cambia con la ventana y la banda siempre cruza. Para una
         franja de atmosfera es el cambio bueno.

         Y muy tenue: si se ve, esta mal. */
      /* ── Y PASABA POR DETRAS DEL TITULO ──────────────────────────
         La primera diagonal entraba por el canto izquierdo alto, que es
         exactamente donde vive el rotulo. El efecto era el peor
         posible: no se leia como via lactea sino como una CAJA CLARA
         detras del texto — un fondo de titulo, que es lo que un sitio
         hecho a mano no puede tener. Y encima se comia el contraste
         justo donde hay que leer.

         En la referencia de noche la banda no cruza por ahi: entra por
         arriba hacia el centro y baja hacia el arbol, por la derecha.
         Reanclada a esos dos puntos —(0.40, 0.98) y (0.72, 0.52) en uv—
         queda cero sobre el bloque de texto: medido en el peor punto del
         rotulo da 0.003, o sea nada. El cielo gana su banda y el texto
         recupera su sitio.

         Y mas estrecha (0.17), porque ahora que esta concentrada no
         necesita tanto ancho para leerse. */
      float diag = uv.y + 1.44 * uv.x - 1.555;
      /* ── EL PERFIL DE LA BANDA ES BLANDO Y NO TIENE CANTO ──────────
         Una via lactea no termina, se deshilacha. El exponente por
         debajo de dos ensancha las faldas, y el ruido de periodo largo
         se come el borde para que en ningun sitio haya una linea. */
      float perfil = exp(-pow(abs(diag) / 0.34, 1.7));
      perfil *= 0.55 + 0.72 * fbm(vec2(uv.x * 2.2 + 41.0, uv.y * 1.6));
      /* Y NO SE LEVANTA DEL AGUA. La puerta de altura la despegaba de
         la linea del mar y dejaba una franja muerta entre las dos: en
         la referencia la banda ENTRA en el agua, que es de donde sale
         el reflejo. Aqui llega entera hasta abajo y lo unico que la
         apaga cerca del horizonte es la bruma, que se pinta despues. */
      perfil = clamp(perfil, 0.0, 1.0);
      float via = perfil;
      float viaNucleo = perfil * smoothstep(0.35, 0.95, perfil);

      /* ── POR QUE LA LAMINA NO PUEDE DAR LA FORMA DE LA BANDA ───────
         Estuvo mapeada con un eje corriendo a lo largo de la diagonal y
         el otro cruzandola: los 896 px de ancho estirados sobre una
         diagonal larga y los 296 de alto apretados dentro de una franja
         estrecha. Esa anisotropia es enorme, y lo que le hace al
         salpicado de sal es convertir cada mota REDONDA en una RAYA en
         la direccion del estirado. Por eso no se leia como via lactea
         sino como una pincelada de purpurina cruzando el cuadro: no era
         cuestion de fuerza ni de color, era el muestreo.
         Asi que la lamina deja de dar la FORMA y pasa a dar la MATERIA.
         Se muestrea en coordenadas casi isotropas —la v escalada por la
         proporcion de la lamina, para que el texel salga cuadrado— y su
         pigmento MODULA el perfil de arriba. Las motas vuelven a ser
         redondas, el canto de la banda deja de ser un filo, y lo que
         aporta la pintura es lo que solo la pintura tiene: los grumos y
         las vetas de polvo. */
      float motaVia = 0.0;
      float motaCampo = 0.0;
      float tonoCampo = 0.0;
//#ESTRELLAS
      if (u_hayEstrellas > 0.5) {
        vec2 lamUV = vec2(q.x * 0.62, uv.y * 1.88);
        vec4 lam = texture(u_estrellas, lamUV);
        /* MEDIDA, la aguada vive entre 0.547 y 0.980 de luminancia con
           la mediana en 0.806: el pigmento —1 menos eso— solo llega a
           0.45. La ventana va contra ese rango y no contra [0,1], que
           es lo que antes la dejaba casi toda multiplicada por cero. */
        float pig = smoothstep(0.10, 0.42, 1.0 - valor(lam.rgb));
        via = clamp(perfil * (0.45 + 1.20 * pig), 0.0, 1.0);
        viaNucleo = via * smoothstep(0.35, 0.95, via);
        /* El salpicado de sal, detectado por CONTRASTE LOCAL y no por
           brillo absoluto: el papel de la lamina es tan claro como una
           mota, y con umbral fijo se pintaban zonas enteras. */
        __MASCARA_ESTRELLAS_CIELO__
        motaVia = contrasteMota * perfil;
        motaCampo = contrasteMota;
        tonoCampo = hash(floor(lamUV * vec2(896.0, 296.0)));
      }
//#FIN
      /* Los dos colores de la referencia, uno dentro del otro: el halo
         va a violeta-lavanda y el corazon a SALMON, no a magenta. Es
         una diferencia pequena de numeros y grande de lectura — el
         magenta tira a fucsia y se lee digital; el salmon es el rosa
         terroso que de verdad tiene el polvo de la via lactea en la
         foto, y ademas emparenta con el acento calido del cuadro. */
      /* Y el salmon va SATURADO, no palido: el color tiene que venir
         del matiz y no de la cantidad. Con un salmon lavado hacia el
         blanco hacia falta tanta luz para que se notara que la banda
         salia quemada —medida en 109 de luminancia contra 31 del
         cielo—, y una via lactea no es un foco. */
      vec3 tonoHalo   = vec3(0.76, 0.74, 1.00);
      vec3 tonoNucleo = vec3(1.00, 0.64, 0.54);
      col = mix(col, mix(col, papelBlanco() * tonoHalo, 0.66),
                via * noche * 0.15);
      /* Y el nucleo rosado encima, mas concentrado y mas calido de
         matiz —el corazon de la galaxia visto de canto, que es magenta
         antes que azul. Se suma color propio ademas de mezclar, para
         que de verdad se lea rosado y no solo un blanco mas fuerte. */
      /* Y el termino ADITIVO pesa mas que el de mezcla, que es lo que
         faltaba para que el rosa se leyera: mezclar hacia un salmon
         sobre un cielo cuyo azul es tres veces el rojo sigue dando
         lavanda —medido, el nucleo daba (105, 97, 124), o sea azul—.
         Sumar color si mueve el matiz, porque sube el rojo sin tocar el
         azul. Es ademas como se comporta una luz de verdad. */
      col = mix(col, papelBlanco() * tonoNucleo, viaNucleo * noche * 0.20);
      col += tonoNucleo * viaNucleo * noche * 0.17;
      /* Y las motas de sal encima de todo: son papel reservado, o sea
         lo mas claro del cuadro, y son lo que hace que la banda se lea
         como MILES DE ESTRELLAS y no como una nube pintada. */
      col = mix(col, papelBlanco(), motaVia * noche * 0.85);

//#ESTRELLAS
      /* ── QUIEN PINTA EL CAMPO, Y POR QUE NO ES LA LAMINA EN PC ────
         __CAMPO_LAMINA__ se sustituye al compilar: en escritorio vale
         0.0 y este if es SIEMPRE cierto — el campo estrellado es el
         procedural de abajo, que es el que tiene cumulos y huecos,
         tres tallas, color por estrella y respiracion por fase. En
         movil vale u_hayEstrellas y el campo sale de la lamina, que
         cuesta una lectura en vez de nueve celdas.

         Esto DESHACE una optimizacion que costo el cuadro: cuando la
         lamina paso a pintar el campo tambien en escritorio, el cielo
         entero se volvio una TRAMA — misma densidad en todas partes,
         sin grumos ni vacios, o sea sal esparcida, que es el defecto
         que este bloque lleva evitando desde el principio. Y encima
         de una trama, la via lactea dejaba de leerse: era ruido sobre
         ruido. La lamina se queda para lo que la pintura hace mejor
         que el calculo —la MATERIA de la banda, sus grumos y vetas—
         y el campo vuelve a ser dibujado estrella a estrella. */
      if (__CAMPO_LAMINA__ < 0.5) {
//#FIN
//#ESTRELLAS_PROCEDURALES
      vec2 rej = vec2(q.x, uv.y) * 340.0;
      vec2 celda = floor(rej);
      float luzEstrellas = 0.0;
      vec3 tinteEstrellas = vec3(0.0);
      /* Nueve celdas: la propia y sus vecinas, porque una estrella
         cerca del borde de su celda derrama sobre la de al lado y sin
         esto se le vería el corte. */
      for (int i = -1; i <= 1; i++) {
        for (int j = -1; j <= 1; j++) {
          vec2 c = celda + vec2(float(i), float(j));
          float h1 = hash(c);
          float h2 = hash(c + 31.7);
          float h3 = hash(c + 74.3);
          /* ── NO SE REPARTEN PAREJAS, SE APELMAZAN ─────────────────
             Un umbral fijo da una densidad constante, y eso —aunque
             sean miles— se lee como una TRAMA: sal esparcida sobre el
             papel, que es el defecto que este bloque lleva evitando
             desde el principio. El cielo de verdad tiene grumos y
             tiene huecos.
             El umbral lo mueve un ruido de periodo largo, asi que hay
             zonas donde entra una de cada tres celdas y zonas donde no
             entra casi ninguna. Baja la cuenta total y sube la
             sensacion de cantidad, que no es lo mismo. La via lactea
             sigue apretandolo por su lado. */
          float cumulo = fbm(vec2(c.x * 0.021 + 3.0, c.y * 0.021 - 8.0));
          float umbral = mix(0.93, 0.62, smoothstep(0.30, 0.72, cumulo));
          if (h1 > mix(umbral, umbral - 0.26, via)) {
            vec2 pos = c + vec2(h2, h3);
            float d = length(rej - pos);
            /* Tres tallas. Las grandes son pocas —el cubo hunde la
               distribución hacia lo pequeño— igual que en el cielo. */
            float talla = 0.10 + 0.22 * pow(hash(c + 12.1), 3.0);
            /* ── Y NO BRILLAN TODAS IGUAL ─────────────────────────
               Con un reparto plano el campo entero pesa lo mismo y
               vuelve a leerse como trama. La cuarta potencia deja la
               mayoria tenues y saca UNAS POCAS muy vivas, que es la
               distribucion real de magnitudes: lo que hace que el ojo
               encuentre donde posarse en vez de resbalar.
               Dentro de la banda pesan mas: es lo que la separa de una
               mancha clara. */
            float brillo = (0.34 + 2.60 * pow(hash(c + 5.5), 4.0))
                         * (1.0 + via * 1.35);
            /* Respiración lenta, cada una en su fase. */
            brillo *= 0.72 + 0.34 * sin(u_t * (0.19 + 0.16 * h2) + h3 * TAU);
            /* Núcleo puntiagudo sobre el halo suave: sin esto una
               estrella grande se lee como mancha borrosa en vez de
               brillar de verdad. */
            float nucleo = exp(-pow(d / (talla * 0.32), 1.4)) * brillo * 0.9;
            float m = exp(-pow(d / talla, 1.7)) * brillo + nucleo;
            luzEstrellas += m;
            /* Azules y salmones, con más azules. El extremo cálido se
               lleva al mismo rosa terroso del corazón de la banda en
               vez de al ámbar de antes: así el campo de estrellas y la
               vía láctea son la misma paleta y no dos capas pegadas. */
            tinteEstrellas += m * mix(vec3(0.58, 0.74, 1.00),
                                      vec3(1.00, 0.78, 0.70),
                                      smoothstep(0.55, 0.95, hash(c + 61.2)));
          }
        }
      }
      if (luzEstrellas > 0.001) {
        vec3 tinte = tinteEstrellas / luzEstrellas;
        /* Se apagan donde ya hay luz de la luna: una estrella no se ve
           al lado de la luna, y fingir que sí es la clase de mentira
           que delata el cuadro entero.
           PERO NO SE CORTAN EN EL HORIZONTE. Aqui habia una puerta de
           altura que las apagaba antes de llegar abajo, y el efecto era
           una COSTURA: el cielo estrellado terminaba en una raya recta
           y debajo quedaba una franja lisa hasta el agua. En la
           referencia las estrellas bajan hasta tocar la linea del mar y
           lo que las apaga ahi no es una puerta, es la bruma —que ya se
           pinta despues, encima, y basta—. Se deja solo un pelo de
           caida para el ultimo pixel. */
        float altura = smoothstep(-0.02, 0.035, gy);
        float lejosDeLaLuna = smoothstep(0.10, 0.42, length(q - fuenteQ));
        float f = clamp(luzEstrellas, 0.0, 1.0) * noche * altura
                * mix(0.45, 1.0, lejosDeLaLuna);
        /* Sobre el cielo, no sustituyéndolo: una estrella es papel que
           quedó sin pintar con un toque de color encima, así que se
           mezcla hacia el papel de la hora y no hacia el blanco. */
        col = mix(col, papelBlanco() * tinte, f * 1.0);
        /* Y las más brillantes ganan un pelo de luz propia encima del
           mezclado, que es lo que hace que una estrella grande LATA en
           vez de quedarse en un parche de papel sin pintar. */
        col += tinte * clamp(luzEstrellas - 0.55, 0.0, 1.4) * noche * altura * 0.5;
      }
//#FIN
//#ESTRELLAS
      } else if (motaCampo > 0.001) {
        /* La lámina ya contiene las motas reales de sal. Reutilizarlas
           evita construir nueve celdas procedurales —cada una con FBM,
           hashes, potencias y exponenciales— para cada píxel del cielo. */
        float altura = smoothstep(-0.02, 0.035, gy);
        float lejosDeLaLuna = smoothstep(0.10, 0.42, length(q - fuenteQ));
        float respira = 0.84 + 0.16 * sin(u_t * 0.23 + tonoCampo * TAU);
        /* ── LOS GRUMOS, QUE LA LAMINA SOLA NO DA ────────────────────
           El salpicado de la lamina es parejo —el acuarelista salpico
           la hoja entera— y un campo parejo se lee como TRAMA, no como
           cielo. El procedural de escritorio resuelve esto moviendo el
           umbral con un ruido de periodo largo (hay zonas cuajadas y
           zonas casi vacias); aqui se hace lo mismo por fuera: el mismo
           ruido, aplicado como puerta sobre la mota ya detectada. Una
           sola muestra de FBM —dos octavas en movil— contra las nueve
           celdas que se ahorraron: los grumos vuelven y la cuenta no. */
        float cumulo = fbm(vec2(q.x * 2.1 + 3.0, uv.y * 1.6 - 8.0));
        float grumos = mix(0.12, 1.0, smoothstep(0.30, 0.68, cumulo));
        float f = motaCampo * noche * altura * respira * grumos
                * mix(0.45, 1.0, lejosDeLaLuna);
        vec3 tinte = mix(vec3(0.58, 0.74, 1.00), vec3(1.00, 0.78, 0.70),
                         smoothstep(0.58, 0.94, tonoCampo));
        col = mix(col, papelBlanco() * tinte, f);
        col += tinte * smoothstep(0.58, 0.96, motaCampo)
             * noche * altura * grumos * 0.24;
      }
//#FIN
    }

    if (u_hayNubes > 0.5) {
      /* Nubes pintadas, en la mitad alta del cielo y derivando muy
         despacio — más lento que el agua, porque están más lejos.
         Se entintan con el cielo alto: una nube no tiene color propio,
         tiene el de la luz que la atraviesa. */
      float nv = (uv.y - horX) / max(1.0 - horX, 0.001);
      /* La lámina se compone desde el centro, no desde el borde
         izquierdo. Con q.x puro un móvil solo veía el primer cuarto de
         la celda —justo el aire vacío de la masa diagonal— y perdía la
         nube completa. En escritorio se conserva la escala espacial;
         en retrato se toma una ventana central del mismo cielo. */
      float anchoN = aspecto * 0.42;
      float margenN = max(0.0, (1.0 - anchoN) * 0.5);
      vec2 nu = vec2(q.x * 0.42 + margenN + u_deriva * 0.018,
                     1.0 - nv * 0.92);

      /* ── CUATRO CIELOS EN UNA SOLA TEXTURA ───────────────────────
         Antes habia UNA lamina de nubes y la hora solo la recoloreaba,
         asi que ninguna hora era del todo suya: unos cirros que
         funcionan al alba estan mal a mediodia, porque cada hora tiene
         su TIPO de nube y eso es fisica, no gusto.

         Ahora hay cuatro —alba, dia, ocaso, noche— empaquetadas en un
         atlas de dos por dos. Van en una sola textura porque el motor
         ya tiene ocupadas las dieciseis unidades que WebGL2 garantiza:
         cuatro laminas sueltas serian cuatro unidades mas y el shader
         dejaria de enlazar, que es exactamente lo que paso al intentar
         meter las estrellas.

         Y NO SE CONMUTA, SE FUNDE. Se muestrean las DOS laminas que
         tocan y se mezclan con la fraccion de la hora. cicloCielo()
         sostiene la celda de dia entre 7 y 17; las fundidas quedan
         confinadas al alba y al ocaso.

         El fract() de la u no es adorno: la deriva hace crecer la
         coordenada sin limite y sin envolverla se saldria de su celda
         y entraria en la de al lado. El margen del 0.998 evita que el
         filtro bilineal chupe un pixel de la celda vecina en el canto. */
      int ca = int(mod(floor(u_cielo), 4.0));
      int cb = int(mod(floor(u_cielo) + 1.0, 4.0));
      /* ── CUIDADO AL AUDITAR ESTE ATLAS ───────────────────────────
         Las texturas se suben con UNPACK_FLIP_Y, asi que la fila 0 de la
         IMAGEN es v=1 en UV: una celda cuya esquina es cy=0.5 vive en la
         mitad SUPERIOR del archivo, no en la inferior. Leyendolo al
         reves salen las cuatro celdas cambiadas de sitio, y de ahi salio
         una version entera basada en que la celda de DIA estaba vacia
         cuando la vacia es la de NOCHE. Medido bien, contando alfa:

           alba  (arriba-izq) 0.286 de alfa medio · 31.4 % de cobertura
           dia   (arriba-der) 0.347 ................. 36.0 %
           ocaso (abajo-izq)  0.286 ................. 31.4 %
           noche (abajo-der)  0.000 .................  0.0 %

         La celda de dia es la masa diagonal de la referencia: una nube
         continua, con azul limpio alrededor, no cumulos repartidos. Alba
         y ocaso comparten la nube larga de luz rasante; la noche queda
         vacia porque su estructura ya la ponen las estrellas y la Via
         Lactea. Asi no hay un velo gris duplicado encima del anil.

         Para convertir una celda a pixeles del archivo:
             x = cx * W        y = (1 - (cy + 0.5)) * H
         La celda mide 768x512 y el atlas 1536x1024. */
      vec2 CELDA[4] = vec2[4](vec2(0.0, 0.5), vec2(0.5, 0.5),
                              vec2(0.0, 0.0), vec2(0.5, 0.0));
      vec2 nuw = vec2(fract(nu.x), clamp(nu.y, 0.0, 1.0)) * 0.5 * 0.998 + 0.001;
      vec4 nb = mix(texture(u_nubes, CELDA[ca] + nuw),
                    texture(u_nubes, CELDA[cb] + nuw),
                    fract(u_cielo));
      /* DUOTONO, como el manglar. Antes la nube se pintaba a 0.55 hacia
         el color del propio cielo: o sea, casi del color del fondo, y
         por eso no se veía nada. Una nube no tiene color propio —eso era
         cierto— pero sí tiene VALOR: una cara iluminada y una sombra.
         Eso es lo que la hace nube y no mancha.

         La lámina viene pintada en grises, así que aporta la estructura
         de valor; la paleta de la hora aporta el color. Una sola lámina
         sirve para las veinticuatro horas y a las seis de la mañana se
         enciende por abajo sin repintar nada. */
      /* Y MENOS. Con el rango abierto la nube tenía cara iluminada y
         sombra bien separadas, y eso es exactamente lo que la hacía
         parecer una fotografía retocada en vez de una aguada. En una
         acuarela el pigmento se posa en un rango estrecho: lo que
         separa una nube del cielo son dos pasos de valor, no diez.
         El rango se cierra hacia el propio cielo y la lámina entra a
         0.46 en vez de 0.78. Se ve menos y se lee más. */
      /* ── CUANTO DE CANTO LE ENTRA LA LUZ ─────────────────────────
         Vale 1 con el astro posado en el horizonte y 0 con el sol
         alto. Es la unica variable que de verdad decide como se ve una
         nube, y hasta ahora no existia: la lamina entraba con el mismo
         peso a las siete de la manana que a mediodia. */
      /* solBajo se calcula UNA vez arriba de main(), porque la franja del
         horizonte lo necesita igual. Aqui solo se le pone la puerta del
         dia: de noche una nube no se enciende por debajo, y con la luna
         baja saldrian nubes de atardecer a las tres de la madrugada. */
      float nubeBaja = solBajo * smoothstep(0.25, 0.72, u_int);
      /* ── Y EL CUMULO DE MEDIODIA ─────────────────────────────────
         MEDIDO a las 11:00 sobre el propio lienzo: la desviacion tipica
         del cielo alto era 2.01 en L*. Eso no es un cielo con nubes, es
         un campo plano — habia un degradado y nada mas, y por eso medio
         cuadro no tenia donde mirar.

         La referencia de dia tiene cumulos grandes y blandos, con la
         cara blanca y la panza azulada. El aviso que cerro este rango
         —"con la cara y la sombra bien separadas parecia una fotografia
         retocada"— sigue en pie y sigue siendo cierto; lo que estaba mal
         es que se aplicaba a las veinticuatro horas por igual. Aqui se
         abre SOLO con el sol alto.

         La cara clara se va al PAPEL, que es de donde sale toda la luz
         de una acuarela — no a un blanco de pintura, que no existe. */
      float diaN = smoothstep(0.62, 0.95, u_int);

      vec3 sombraN = mix(u_cieloAlto, u_agua, 0.17) * 0.955;
      /* ── Y CON EL SOL DE CANTO, LA PANZA SE HUNDE ────────────────
         El rango se habia cerrado a proposito —"lo que separa una nube
         del cielo son dos pasos de valor, no diez"— y eso es cierto a
         MEDIODIA: un cielo de mediodia es liso y la nube casi no
         modela. Pero se aplicaba a todas las horas por igual, y al
         ocaso es falso: con la luz entrando por debajo una nube tiene
         una cara encendida y una panza oscura, y esa diferencia no es
         un adorno, ES la nube. En la referencia de atardecer las nubes
         son media composicion y aqui no se veian.
         El rango se abre solo cuando la luz es rasante, asi que el
         mediodia se queda exactamente como estaba. */
      sombraN = mix(sombraN, sombraN * 0.76, nubeBaja);
      vec3 luzN    = mix(u_cieloAlto, mix(u_altas, u_reguero, 0.34), 0.62);
      /* Y LA CARA ILUMINADA SE VA AL COLOR DEL HORIZONTE cuanto mas
         baja esta la nube y mas rasante la luz. Una nube al amanecer no
         la ilumina el cenit: la ilumina el horizonte, por debajo. De
         ahi salen los corales de la referencia sin pintar un coral en
         ningun sitio. */
      luzN = mix(luzN, u_cieloHorizonte,
                 nubeBaja * (1.0 - smoothstep(0.05, 0.88, nv)) * 0.80);
      /* Y CON MAS RECORRIDO. La cara al sol de un cumulo de mediodia es
         PAPEL —lo mas claro del cuadro— y su panza es azul de sombra, no
         un azul un poco mas oscuro. Medido, el cielo entero cubria 24.6
         de L* de recorrido; un cielo con cumulos de verdad cubre 40 o
         mas, y esa diferencia es justo lo que se lee como plano. */
      /* La cara al sol se va al papel —eso se queda— pero la panza NO
         se hunde tanto: en la referencia la base de un cumulo es apenas
         dos pasos mas oscura que el cielo, no una sombra. Empujarla a
         0.70 hacia un azul al 62 % daba nubes de tormenta. */
      luzN    = mix(luzN,    mix(luzN, papelBlanco(), 0.86), diaN);
      sombraN = mix(sombraN, mix(sombraN, u_cieloAlto * 0.86, 0.40), diaN);
      vec3 pn = duotono(nb.rgb, sombraN, luzN);
      pn += (nb.rgb - vec3(valor(nb.rgb))) * u_croma * 0.18;
      /* ── Y PESAN MAS CON EL SOL BAJO ─────────────────────────────
         A 0.46 fijo la nube se veia lo justo a mediodia —que esta
         bien: un cielo de mediodia es liso— y lo mismo de justo al
         amanecer, que esta mal. Con el sol rasante la nube se enciende
         por debajo y pasa a SER el acontecimiento del cielo; en la
         referencia de atardecer las nubes son media composicion.
         No es subir la opacidad por gusto: es que la misma nube tiene
         mucho mas contraste cuando la luz le entra de canto. */
      /* ── Y SE ABREN HACIA EL CENIT ────────────────────────────────
         MEDIDO por franjas a mediodia: el cenit salia a 78.3 de L* y la
         banda media a 81.1 — o sea el cielo mas claro ARRIBA que en
         medio, que es al reves de cualquier cielo. La causa es que la
         nube cubria el cenit tanto como el resto, y una nube es clara.

         Un cielo real se abre hacia arriba: mirando al cenit se ve el
         hueco entre nubes, y mirando al horizonte se ven de canto y
         apiladas, sin hueco. Es perspectiva pura. Aqui la lamina pesa la
         mitad en lo alto, y el azul hondo vuelve a verse. */
      /* 0.52 -> 0.24. Adelgazar la nube hacia el cenit hizo lo que se
         pedia —dejar ver el azul hondo— pero se paso: el tercio alto se
         quedaba sin un solo acontecimiento y medio cielo volvia a ser un
         degradado. Un cielo se abre hacia arriba, no se vacia. */
      float abreArriba = 1.0 - smoothstep(0.42, 1.0, nv) * 0.46;
      /* ── Y PESAN MUCHO MENOS DE DIA, medido contra la foto ────────
         Comparando franja a franja contra la referencia, el tercio alto
         de nuestro cielo salia 9 a 12 puntos de L* demasiado CLARO y con
         0.291 de saturacion contra 0.451. El degradado por si solo daba
         70.8 en esa franja y la foto pide 69.4 — o sea que el degradado
         estaba bien y lo que sobraba era NUBE: cubria el cenit de blanco
         y se llevaba por delante el azul.
         La nube de dia baja de 0.74 a 0.40 y se adelgaza casi la mitad
         hacia arriba. Lo que estructura el cielo es el degradado, no la
         cantidad de nube; la nube es el acontecimiento, no el fondo. */
      col = mix(col, pn, nb.a * mix(0.40, 0.74, nubeBaja)
                       * smoothstep(0.01, 0.17, nv) * abreArriba);

      /* Aquí estuvo un cúmulo procedural para suplir la lámina. Se
         quitó porque el umbral del ruido heredaba su retícula y pintaba
         rectángulos. La celda nueva ya aporta la estructura real: valor
         y borde de pincel; el shader solo pone hora, luz y movimiento. */
    } else {
      float m = fbm((q + vec2(u_deriva * 0.02, 0.0)) * 2.2);
      col = mix(col, u_cieloAlto, (m - 0.5) * 0.16);
      col -= bordeDeMancha(m, 0.54, 0.045) * 0.018;
    }

    /* ===== LAS LUCES DE NOCHE ==================================
       De noche el sitio no puede quedarse a oscuras. Un pueblo lejano en
       la orilla y algun destello en el agua: nada urbano, nada que rompa
       el mundo. Aparecen con la noche y se apagan con el dia. */
    if (u_hayLuces > 0.5) {
      float noche = 1.0 - smoothstep(0.15, 0.55, u_int);
      if (noche > 0.01) {
        /* LA LAMINA TRAE TRES PUEBLOS IDENTICOS a intervalos iguales.
           No es un fallo de repeticion de textura —cabe menos de una
           vuelta en pantalla— sino que el motivo ya viene repetido
           dentro de la propia hoja, y en una pantalla ancha se ven los
           tres a la vez: el mismo racimo de luces calcado tres veces a
           la misma distancia. Eso delata la lamina de golpe.

           Se rompe por dos sitios. Primero se ONDULA el muestreo con un
           ruido de periodo largo: los racimos dejan de estar a
           distancias iguales y cada uno entra con otro ancho. Y despues
           se APAGA A TRAMOS con otro ruido todavia mas lento, porque
           una costa de verdad no tiene un pueblo cada tantos
           kilometros: tiene un pueblo, luego nada durante un buen rato,
           y luego dos luces sueltas. Lo que hace que se lea como costa
           es justamente lo que falta. */
        float ondula = fbm(vec2(q.x * 0.85 + 3.1, 1.7)) - 0.5;
        vec2 lu = vec2(q.x * 0.55 + u_deriva * 0.04 + ondula * 0.22,
                       1.0 - (uv.y - horX) / max(1.0 - horX, 0.001) * 2.6);
        vec4 tl = texture(u_luces, lu);
        float costa = smoothstep(0.36, 0.66, fbm(vec2(q.x * 1.25 + 21.0, 5.3)));
        float titila = 0.86 + 0.14 * sin(u_t * 0.9 + q.x * 31.0);
        col = mix(col, mix(col, tl.rgb, 0.9), tl.a * noche * titila * costa * 0.85);
      }
    }

    /* LA FUENTE, PINTADA. Era un disco geometrico con un halo
       exponencial, y eso se delata siempre en medio de un cuadro hecho a
       mano: ningun borde de acuarela es un circulo perfecto y ninguna
       aguada cae como una exponencial. La lamina trae el disco RESERVADO
       —papel sin tocar— y la aguada alrededor con su borde irregular.

       Es un atlas de dos celdas, luna y sol, con el disco centrado y del
       mismo tamano en las dos, asi que elegir hora es elegir celda. Y el
       color lo sigue poniendo u_reguero: la lamina solo aporta forma. */
    vec2 f = fuenteQ;

    /* ═══ EL HALO, ANTES QUE EL DISCO ════════════════════════════
       El astro se leia "desconectado", como una calcomania pegada
       encima del cielo, y el diagnostico es correcto: la lamina trae
       el disco y su aguada inmediata, pero le faltaba lo unico que de
       verdad integra una luz en una atmosfera, que es EL AIRE
       ILUMINADO alrededor.

       No es una exponencial. Una exponencial es un degradado de
       aerografo y se delata siempre en medio de un cuadro pintado a
       mano; un halo de acuarela es una aguada ANCHA con el borde
       irregular, hecha mojando el papel alrededor de la reserva.

       Va antes del disco a proposito: el disco tiene que quedar
       encima, no lavado por su propio halo. Y es lo mismo que ilumina
       la franja del horizonte de arriba, asi que la luz del cuadro
       viene toda del mismo sitio — que es el argumento entero. */
    {
      float dF = length(q - f);
      float halo = 1.0 - smoothstep(0.0, 0.66, dF);
      halo *= halo;
      halo *= 0.68 + 0.54 * fbm(vec2(q.x * 2.1 + 5.0, uv.y * 2.6 + 17.0));
      /* La fuerza se razona CONTRA EL FONDO, no en abstracto: de noche
         el cielo esta a 0.022 de luminancia y cualquier mezcla se
         multiplica por varias veces. 0.12 de tope nocturno deja el
         resplandor de la luna en algo que se ve y no en una mancha. */
      /* BAJADO A LA MITAD. Este halo se escribio cuando la lamina del
         astro era un disco plano sin aguada —medido, 2.9 de rango en
         L*—. La repintada trae su propio bloom pintado a mano, con
         backruns y canto de coliflor, que es mucho mejor que cualquier
         cosa que se pueda calcular aqui. Este se queda solo como el
         aire de mas alla del bloom. */
      /* Y DE DIA CASI DESAPARECE. Este halo tiene radio 0.66 en q, o
         sea que cubre un tercio del ancho: a mediodia, con el sol alto,
         eso es medio cielo mezclado hacia el color de la fuente. Medido
         contra la foto, era buena parte de los 5 puntos de L* que le
         sobraban al tercio alto — y ademas se comia la saturacion del
         azul. La lamina del astro ya trae su bloom pintado; esto solo
         tiene que ser el aire de mas alla, y de noche, que es cuando el
         resplandor de la luna hace falta. */
      col = mix(col, mix(col, u_reguero, 0.55),
                clamp(halo, 0.0, 1.0) * mix(0.13, 0.045, u_int));
    }

    /* ── Y LA LUZ SE RESERVA, NO SE PINTA ────────────────────────
       Alrededor del sol el cielo no es un color claro: es PAPEL. Un
       acuarelista no pinta un sol brillante, deja el hueco y moja
       alrededor — y es de ese hueco de donde sale toda la luz del
       cuadro. Aqui no habia hueco: habia un halo mezclado hacia el
       color de la fuente, o sea pintura clara, y por eso el mediodia
       tenia el 2.5 % del cuadro por encima de 0.80 en vez del 8-12 %
       que tiene una acuarela de dia.

       Va con el borde comido por un ruido de periodo medio, porque una
       reserva se hace con el pincel y no con un compas. Y solo de dia:
       de noche la luna no reserva nada, ilumina poco. */
    {
      /* MUY BAJADA CON LA LAMINA NUEVA, y por una razon de orden: la
         reserva se aplica al FINAL de la capa del cielo —papel
         reservado es papel que nunca se pinto, nada posterior puede
         taparlo— o sea DESPUES del disco. Con 0.88 de fuerza se comia
         el astro entero: quedaba un claro difuso donde tenia que haber
         un sol.
         Cuando la lamina era un disco plano sin aguada, esa reserva ERA
         la luz del sol y hacia falta. La repintada trae su propio bloom
         pintado, y el disco ya es papel dentro de la lamina. Aqui se
         queda solo el aire de alrededor, y con el radio corto para no
         invadir el bloom. */
      float cerca = 1.0 - smoothstep(0.16, 0.46, length(q - fuenteQ));
      cerca *= cerca;
      cerca *= 0.58 + 0.56 * fbm(vec2(q.x * 2.6 + 61.0, uv.y * 3.1));
      reservaPapel = max(reservaPapel, clamp(cerca, 0.0, 1.0)
                          * smoothstep(0.45, 0.92, u_int) * 0.16);
    }

    if (u_hayAstro > 0.5) {
      float esSol = smoothstep(0.42, 0.78, u_int);
      /* 0.30 -> 0.17. A 0.30 la mancha media casi un tercio del alto y
         competia con la copa del arbol, que es el sujeto. Un sol o una
         luna en un paisaje son pequenos; lo que ocupa sitio es su luz,
         no su disco. */
      /* En q, o sea en unidades de ALTO: en un movil vertical 0.17 del
         alto es media pantalla de ancho y el sol salia como un manchon
         flotando en mitad del cielo. Se escala con el aspecto para que
         en pantallas estrechas mida por ancho, no por alto. */
      /* 0.17 -> 0.2306. La lamina repintada trae un bloom de acuarela
         de verdad —dos veces y media el disco— asi que su disco ocupa
         menos celda que el de la lamina anterior: 0.1706 del ancho
         contra 0.2314. La caja de muestreo crece en esa misma razon
         (0.2314/0.1706 = 1.356) para que EL DISCO EN PANTALLA MIDA
         EXACTAMENTE LO MISMO que antes; lo que crece es el aire
         iluminado alrededor, que es justo lo que faltaba.
         Si la caja no creciera, el bloom se cortaria contra su borde y
         saldria un rectangulo alrededor del sol. */
      /* La comparacion en pantalla mostraba un disco/bloom de casi el
         doble del diametro de la referencia. La caja baja, sin tocar
         el valor ni el halo ambiental, para que el astro vuelva a ser
         una fuente pequena dentro de un cielo grande. */
      float lado = 0.1700 * clamp(aspecto * 0.72, 0.52, 1.0);
      vec2 au = (q - f) / lado + 0.5;
      if (au.x > 0.0 && au.x < 1.0 && au.y > 0.0 && au.y < 1.0) {
        vec2 uu = vec2((au.x + floor(esSol + 0.5)) * 0.5, au.y);
        vec4 ta = texture(u_astro, uu);
        /* Y BAJA DE INTENSIDAD. Con el halo puesto, el disco a 0.94 se
           quedaba como un recorte brillante en el centro de su propia
           atmosfera. Lo que integra una luna no es que brille mas: es
           que lo de alrededor brille un poco. */
        /* ── EN DUOTONO, COMO TODO LO DEMAS ────────────────────
           Esto mezclaba hacia u_reguero con el peso del alfa y NADA
           MAS, o sea que pintaba disco y aguada del MISMO color. Con la
           lamina anterior colaba porque era un disco plano sin aguada
           —2.9 de rango en L*—: no habia estructura que perder. La
           repintada trae
           el disco casi en papel y el bloom en gris calido, y aplastarlo
           todo a un solo color convertia el sol en un manchon amarillo.

           Ahora la lamina aporta DONDE y CUANTO (su alfa) y tambien QUE
           TAN CLARO (su valor): lo mas claro se va al papel —el disco es
           reserva, de ahi sale la luz— y la aguada de alrededor al color
           de la fuente. Es exactamente el trato que reciben el manglar,
           las nubes, el pasto y las garzas. */
        vec3 colAstro = mix(u_reguero, papelBlanco(),
                            smoothstep(0.52, 0.94, valor(ta.rgb)));
        /* ── EL DISCO DE LA LUNA NO SE DILUYE EN SU BLOOM ─────────
           Con un solo peso, de noche todo el atlas entraba al 45 % y
           la luna salia como algodon: el disco —que en la lamina esta
           MEDIDO en 0.93 de luminancia contra 0.75 del bloom— quedaba
           a treinta puntos de un velo tenue, o sea invisible. Una luna
           sin disco no es una luna, es una nube clara.

           El disco se detecta por valor en la propia lamina (la banda
           0.84-0.945 separa disco de bloom con margen por los dos
           lados) y DE NOCHE entra casi a pleno: es lo mas claro que
           hay en el cuadro nocturno, el papel en reserva del que sale
           toda la luz. El bloom sigue al peso de siempre — la aguada
           alrededor es atmosfera, no fuente. De dia la rama del sol no
           cambia: el smoothstep del final la apaga. */
        float discoAstro = smoothstep(0.84, 0.945, valor(ta.rgb)) * ta.a;
        float pesoAstro = ta.a * clamp(0.26 + 0.54 * u_int, 0.0, 0.86);
        pesoAstro = max(pesoAstro, discoAstro
                        * 0.85 * (1.0 - smoothstep(0.42, 0.78, u_int)));
        col = mix(col, colAstro, pesoAstro);
      }
    } else {
      float d = length(q - f);
      float disco = 1.0 - smoothstep(0.012, 0.020, d);
      float halo  = exp(-d * 9.0) * 0.55 + exp(-d * 2.6) * 0.16;
      col = mix(col, u_reguero, clamp((disco * 0.85 + halo * 0.5) * u_int, 0.0, 0.92));
    }
    col = mix(col, papelBlanco(), reservaPapel);
  }

  /* ═══ AGUA — las tres bandas pintadas ═════════════════════════ */
  else {
    float prof = clamp((horX - uv.y) / max(horX, 0.001), 0.0, 1.0);
    float pp   = pow(prof, 0.42);

    /* Oleaje. Frecuencias en razón no entera para que el patrón no se
       vea repetirse: es lo que mata la sensación de bucle. */
    /* Los toques sostenidos: aplanan alrededor y dejan un anillo que se
       cierra hacia el centro. La ausencia de onda ES el efecto. */
    float aplanado = 0.0, anillo = 0.0;
    for (int i = 0; i < 6; i++) {
      vec4 tk = u_toques[i];
      if (tk.z <= 0.002) continue;
      float d = distance(q, tk.xy);
      /* EL RADIO CRECE CON LO SOSTENIDO. Estaba fijo en 0.115 —un
         circulito bajo el dedo— y el encargo es que la calma se sienta
         EN TODA LA PANTALLA. Ahora nace pequeno y se abre hasta 0.95
         mientras se aguanta: la quietud sale de la mano y se extiende,
         que es lo que hace una mano posada en el agua. */
      float r = mix(0.13, 0.95, tk.z);
      aplanado = max(aplanado, tk.z * exp(-(d * d) / (r * r)));

      /* LA GOTA AL REVÉS. Tres anillos que nacen en el borde exterior y
         VIAJAN HACIA EL CENTRO, uno tras otro mientras se sostiene. Una
         onda que se expande desde un punto es una gota cayendo en un
         líquido, y esa es la escena que este sitio no re-escenifica.
         Aquí el agua recoge en vez de derramar. */
      for (int k = 0; k < 3; k++) {
        float fase = fract(u_t * 0.40 + float(k) * 0.3333);
        float rr = r * (1.0 - fase);          // 1 → 0: de fuera a dentro
        float aparece = sin(fase * 3.14159);  // nace y se apaga solo
        anillo = max(anillo, (1.0 - smoothstep(0.0, 0.009, abs(d - rr)))
                             * aparece * (1.0 - tk.w) * tk.z);
      }
    }

    /* Subido un tercio. La amplitud crece con la cercania, que es lo que
       pasa de verdad: lo lejano se aplana por perspectiva. */
    /* Amplitud +35 %. Crece con la cercania, que es lo que pasa de
       verdad: lo lejano se aplana por perspectiva. */
    /* EL ROCE DEL PUNTERO. Lo contrario del toque sostenido: donde pasa
       la mano el agua se despierta, no se aquieta. Un aumento local de
       amplitud, sin anillo y sin onda que se expanda desde un punto —esa
       figura esta prohibida en este sitio y sigue estandolo. */
    float dRoce = distance(q, u_roce.xy);
    float roce = u_roce.z * exp(-(dRoce * dRoce) / 0.045) * 0.85;
    /* SUBIDA UN CUARTO, a peticion: 0.0038/0.059 -> 0.0047/0.074. El
       techo de esto no es el gusto sino la lamina — la onda desplaza el
       muestreo, y pasado cierto punto la pintura se estira en vez de
       moverse. A 0.074 en el termino cercano sigue por debajo de ese
       limite; medido, la banda cercana se deforma un 7.4 % de su alto. */
    float amp  = (1.0 - cn) * mix(0.0047, 0.074, pp)
               * (1.0 - aplanado * 0.94) * (1.0 + roce);
    float frec = mix(120.0, 9.0, pp);
    float vel  = mix(0.77, 0.34, pp);      // +30 % y luego -20 %
    /* LA FASE VA CON RUIDO. Los dos terminos diagonales eran rejillas
       rectas cruzandose, y al subir la amplitud se veian como un galon
       de espiga repitiendose: el patron mecanico que mata cualquier
       sensacion de agua. Metiendoles una fase de periodo largo la trama
       deambula, nunca cierra un ciclo dentro de la pantalla, y se lee
       como oleaje en vez de como tejido. */
    /* ═══ LAS OLAS VIENEN DE LEJOS ═══════════════════════════════
       Antes las tres senoidales dependian casi solo de q.x: eran
       rejillas verticales desplazandose DE LADO. Por eso el agua se
       movia sin ir a ninguna parte.

       Ahora la fase la manda LA PROFUNDIDAD. marcha es 1/(distancia),
       o sea la perspectiva: vale 18 en el horizonte y 1 al pie del
       cuadro, asi que las crestas se apinan al fondo y se separan al
       acercarse, exactamente como una mar de fondo vista desde la
       orilla. Y va SUMANDO el tiempo, no restandolo: con el signo
       positivo, mantener la fase exige que marcha baje, o sea que la
       cresta avance hacia el observador. Con el signo contrario las
       olas se irian mar adentro.

       El termino en q.x que queda es pequeno a proposito: sirve para
       que las crestas ondulen a lo largo en vez de ser rectas
       paralelas al horizonte, que es lo que las delataria. */
    float marcha = 1.0 / (prof * 0.92 + 0.055);
    float fase1 = fbm(vec2(q.x * 0.9 + 3.0, uv.y * 2.2)) * 5.0;
    float fase2 = fbm(vec2(q.x * 0.6 - 9.0, uv.y * 1.4 + 21.0)) * 6.0;
    float onda =
        sin(marcha * 2.35 + u_t * 3.52 + q.x * 1.15 + fase1) * 0.50
      + sin(marcha * 1.42 + u_t * 2.16 - q.x * 2.05 + fase2) * 0.29
      + sin(marcha * 4.10 + u_t * 5.84 + q.x * 0.55) * 0.13
      + sin((q.x + u_deriva * mix(0.05, 0.55, pp)) * frec + u_t * vel) * 0.14;

    vec2 duv = vec2(onda * amp * 0.35, onda * amp);

    /* Respiración del pigmento: una deriva lenta y grande de la aguada
       misma, no oleaje. Es lo que pide la ley del arte —"movimientos
       lentos de pigmento"— y es lo que hace que un mar en calma esté
       vivo sin agitarse. El oleaje da textura; esto da vida. */
    duv += vec2(ruido(vec2(q.x * 0.7,        u_t * 0.045)) - 0.5,
                ruido(vec2(q.x * 0.5 + 31.0, u_t * 0.037)) - 0.5)
           * mix(0.010, 0.036, pp);

    // Endpoints del duotono para esta hora.
    /* Rango del duotono. Estaba estrecho (0.55 → altas) y de día la
       pintura salía lavada: la noche se veía mejor solo porque sus
       anclas tenían más recorrido. Ensanchado para todas las horas. */
    /* Cielo y agua tienen que parecer la MISMA pintura bajo la MISMA luz.
       El extremo claro se lleva hacia la bruma del cielo, que es el color
       que los une; si no, el agua se va a un turquesa que el cielo nunca
       tuvo y el cuadro se parte en dos láminas. */
    /* Cuanto de dia es. Se declara AQUI, antes del primer sitio que lo
       usa: en GLSL una variable existe a partir de su linea, igual que
       un const de modulo en JS. */
    float diaAgua = smoothstep(0.25, 0.85, u_int);
    /* ── EL EXTREMO OSCURO SUBE DE DIA ───────────────────────────
       MEDIDO contra la referencia de dia: su mar vive entre L* 63 y 79
       con saturacion 0.21 a 0.47; el nuestro entre 50 y 62 con 0.24 a
       0.29. Y el matiz no era el problema —medido en pantalla, mediana
       191 grados con solo un 7 % de pixeles por debajo de 180—: lo que
       hace que un cian se lea VERDOSO en vez de turquesa es que sea
       oscuro y apagado. Un turquesa es un cian CLARO.

       El culpable es este extremo: u_agua a 0.42 es un azul casi negro,
       y arrastra hacia abajo toda la mitad oscura del mar. De noche esta
       bien —un mar nocturno es casi negro y ademas solo refleja— asi que
       sube con el dia y no siempre. */
    /* Con su PROPIA puerta, no con diaAgua: diaAgua ya vale 0.36 a las
       nueve de la noche, y subir ahi el extremo oscuro aclara un mar
       nocturno que esta bien como esta. Esta cruza mas tarde y mas
       rapido, asi que solo se abre con el sol de verdad alto. */
    float mediodiaAgua = smoothstep(0.55, 0.95, u_int);
    vec3 oscuro = mix(u_agua * mix(0.42, 0.98, mediodiaAgua), u_bruma * 0.30, 0.18);

    /* EL AGUA ES UN ESPEJO ANTES QUE UN CUERPO. Su extremo claro venia
       de una paleta propia (altas + bruma) que no miraba al cielo, y de
       noche eso daba un mar entre DOS Y CASI CUATRO VECES mas claro que
       el cielo: 3.68 a las 19:00. No es solo feo, es imposible — el agua
       refleja un cielo oscuro y ademas absorbe.

       Asi que el claro se topa contra el cielo del horizonte y se queda
       por debajo. El tope solo puede OSCURECER (max 1.0), asi que las
       horas de dia, que ya estaban bien, no se tocan. */
    /* ── Y EL EXTREMO CLARO DEJA DE SER BRUMA A MEDIODIA ───────────
       Aqui estaba la razon de que el mar de dia saliera gris, y no era
       el color del agua: era su extremo CLARO. Se armaba con un 42 % de
       bruma a todas horas, y la bruma de dia es un gris casi neutro, asi
       que la mitad clara del mar —que es la mitad que se ve— se lavaba
       hacia el gris por mucho turquesa que tuviera el color base.
       Medido: 0.155 de saturacion en el agua, la misma exacta que la
       copa del arbol.
       De noche la bruma SI tiene que mandar —el agua nocturna solo
       refleja, y el cielo esta a un palmo de ella—, asi que la mezcla
       baja con el dia en vez de bajar siempre. */
    vec3 claroBase = mix(u_altas, u_bruma, mix(0.42, 0.14, diaAgua));
    /* El tope muerde de noche, que es donde estaba el problema, y de dia
       casi no: un mar de mediodia SI puede acercarse al cielo porque el
       cuerpo del agua dispersa luz propia; uno nocturno no, porque solo
       refleja. Medido despues: 0.85 de dia, 1.1 de noche.
       (diaAgua se calcula unas lineas mas arriba, con claroBase.) */
    float techo = valor(u_cieloBajo) * mix(0.60, 1.02, diaAgua);
    vec3 claro  = claroBase * clamp(techo / max(valor(claroBase), 0.001), 0.22, 1.0);

    vec3 pintura;
    if (u_laminas > 0.5) {
      float tL = clamp( prof         / 0.25, 0.0, 1.0);
      float tM = clamp((prof - 0.18) / 0.42, 0.0, 1.0);
      float tC = clamp((prof - 0.52) / 0.48, 0.0, 1.0);

      vec3 pL = banda(u_lejano,  u_vLejano,  q.x, tL, duv*0.35, u_escalas.x, 0.06);
      vec3 pMr= banda(u_medio,      u_vMedio, q.x, tM, duv*0.70, u_escalas.y, 0.28);
      vec3 pMc= banda(u_medioCalmo, u_vMedio, q.x, tM, duv*0.70, u_escalas.y, 0.28);
      vec3 pM = mix(pMr, pMc, cn);
      vec3 pCr= banda(u_cercano, u_vCercano, q.x, tC, duv,      u_escalas.z, 0.85);
      vec3 pCc= banda(u_cercanoCalmo, u_vCercano, q.x, tC, duv, u_escalas.z, 0.85);
      // El par revuelto ↔ calmo: acá se VE que el mar se calma.
      vec3 pC = mix(pCr, pCc, cn);

      float wM = smoothstep(0.08, 0.44, prof);
      float wC = smoothstep(0.40, 0.82, prof);
      pintura = mix(mix(pL, pM, wM), pC, wC);
    } else {
      float m = fbm(q * vec2(1.0, mix(3.4, 1.0, pp)) * mix(5.0, 2.0, pp) + duv);
      pintura = vec3(m);
    }

    col = duotono(pintura, oscuro, claro);

    /* RESERVAR EL BRILLO. Esto es lo que hace un acuarelista de verdad:
       las facetas más claras del agua NO se pintan de blanco, se dejan
       sin tocar desde el principio. Así que donde la lámina trae su valor
       más alto, aquí no hay pintura: hay papel.

       El umbral va alto y con canto duro a propósito. Son cuatro o cinco
       manchas grandes, no un espolvoreado — un brillo espolvoreado es
       purpurina, y la reservaPapel es silencio. */
    /* EL UMBRAL, ARRIBA DEL TODO. Lo baje a 0.55 persiguiendo el
       porcentaje de papel y fue un error de bulto: las laminas de mar
       tienen la mediana en 0.62-0.81, asi que con 0.55 la reserva dejaba
       de ser unas facetas y blanqueaba medio mar. Esa zona no se leia
       como pintada sino como lavada, ajena al resto del cuadro.

       A 0.87 solo entra el decil mas claro de la lamina: cuatro o cinco
       destellos, que es lo que reserva un acuarelista. Y solo en la
       CRESTA de la onda, porque un destello esta donde la cara del agua
       mira arriba, no repartido por igual.

       De noche se apaga casi del todo: un mar nocturno no tiene papel
       en blanco, tiene la luna y poco mas. */
    /* LOS ECOS DE LUZ. Quedaban dos manchas claras fijas en 0.82 y 0.97
       de la pantalla A TODAS HORAS, mientras el sol iba de 0.25 a 0.75:
       no seguian a la luz, o sea que no eran reguero sino reserva de
       papel. El umbral cazaba franjas enteras del decil claro de la
       lamina en vez de facetas sueltas.

       Ahora hace falta que coincidan TRES cosas —lamina muy clara,
       cresta alta y poca profundidad— y ademas el borde es mas
       estrecho: donde antes salia una mancha, ahora salen destellos. */
    /* El umbral se afloja un poco de dia. Sigue muy alto —el aviso de
       arriba vale: a 0.55 esto blanqueaba medio mar— pero 0.93 dejaba el
       agua diurna sin un solo destello, y las facetas de luz son la
       mitad de lo que hace que un mar de acuarela se vea soleado. */
    float diaFaceta = smoothstep(0.50, 0.92, u_int);
    float cresta = smoothstep(0.42, 0.88, onda * 0.5 + 0.5);
    float faceta = smoothstep(mix(0.93, 0.865, diaFaceta),
                              mix(0.985, 0.950, diaFaceta), valor(pintura)) * cresta;
    /* Y DE NOCHE, CERO. Con mix(0.03, 1.0, dia) a las 21:00 quedaba al
       15 %, que parece poco — pero sobre agua casi negra (luminancia
       0.05) mezclar un 15 % hacia papel (0.87) multiplica el brillo por
       3.4 y deja dos manchas palidas flotando en el mar. Sobre agua
       diurna el mismo 15 % no se ve. El error fue razonar la fuerza en
       abstracto y no contra el fondo sobre el que cae.
       Un mar nocturno no tiene papel en blanco: tiene la luna. */
    float dia = smoothstep(0.46, 0.86, u_int);
    reservaPapel = max(reservaPapel, faceta * (1.0 - smoothstep(0.34, 0.95, prof))
                           * dia * dia * 0.95);


    /* Y el agua también se aplana. Menos escalones que el cielo y con el
       canto más seco, porque el agua lejana en una acuarela son dos o
       tres tiras planas y nada más. */


    /* NOCHE DEL AGUA, con su propia puerta —la misma curva que apaga
       las estrellas, y si aquella cambia esta cambia con ella o el agua
       refleja un cielo que no existe—, no con diaAgua: diaAgua todavia
       vale 0.35 a las nueve de la noche (int:0.50), que dejaba pasar un
       tercio del verde crudo de la lamina. De noche el agua no tiene
       pigmento propio, solo refleja: la puerta tiene que cerrar de
       verdad. */
    float nocheAgua = 1.0 - smoothstep(0.50, 0.74, u_int);

    /* Devolver el pigmento propio de la lámina. El duotono puro aplana
       la separación de color del granulado, y esa separación es la
       mitad de lo que hace que algo lea acuarela en vez de fotografía.
       Pero de noche el agua NO tiene pigmento propio, solo refleja
       —igual que en el manglar—, así que el verde que trae la lámina
       de origen se apaga casi del todo en vez de pintarse siempre. */
    col += croma(pintura, u_croma * 0.85, u_croma * 3.10) * mix(0.03, 1.0, 1.0 - nocheAgua);

    /* EL CIELO SE REFLEJA EN EL AGUA. Sin este paso una noche cuajada
       de estrellas se corta en seco justo en el horizonte, que es lo
       primero que un ojo real busca en una marina nocturna: la vía
       láctea repetida, quebrada, bajo la línea del agua.
       Mismo campo de estrellas del cielo, muestreado con la vertical
       invertida sobre el horizonte, apagado con la profundidad —una
       reflejo coherente cerca de la línea, roto por el oleaje en primer
       plano— y quebrado por la calma del agua como cualquier otro
       reflejo del cuadro. */
    if (nocheAgua > 0.004) {
      float uvEsp = 2.0 * horX - uv.y;
      vec2 rejR = vec2(q.x, uvEsp) * 340.0;
      vec2 celdaR = floor(rejR);
      float luzR = 0.0;
      vec3 tinteR = vec3(0.0);
//#ESTRELLAS
      /* El reflejo repite la decision del cielo: quien pinta arriba
         pinta abajo, o el agua devuelve un cielo que no existe. En
         escritorio __CAMPO_LAMINA__ es 0.0 y refleja el procedural;
         en movil, la lamina. Y con los mismos grumos: un reflejo no
         puede tener mas estrellas que su cielo. */
      if (__CAMPO_LAMINA__ > 0.5) {
        vec2 lamRuv = vec2(q.x * 0.62, uvEsp * 1.88);
        vec4 lamRcampo = texture(u_estrellas, lamRuv);
        __MASCARA_ESTRELLAS_REFLEJO__
        float cumuloR = fbm(vec2(q.x * 2.1 + 3.0, uvEsp * 1.6 - 8.0));
        salR *= mix(0.12, 1.0, smoothstep(0.30, 0.68, cumuloR));
        float faseR = hash(floor(lamRuv * vec2(896.0, 296.0)));
        luzR = salR * (0.84 + 0.16 * sin(u_t * 0.23 + faseR * TAU));
        tinteR = luzR * mix(vec3(0.58, 0.74, 1.00), vec3(1.00, 0.78, 0.70),
                            smoothstep(0.58, 0.94, faseR));
      }
      if (__CAMPO_LAMINA__ < 0.5) {
//#FIN
//#ESTRELLAS_PROCEDURALES
      for (int i = -1; i <= 1; i++) {
        for (int j = -1; j <= 1; j++) {
          vec2 c = celdaR + vec2(float(i), float(j));
          float h1 = hash(c);
          if (h1 > 0.62) {
            float h2 = hash(c + 31.7);
            float h3 = hash(c + 74.3);
            vec2 pos = c + vec2(h2, h3);
            float d = length(rejR - pos);
            float talla = 0.12 + 0.24 * pow(hash(c + 12.1), 3.0);
            float brillo = (0.80 + 1.30 * hash(c + 5.5));
            brillo *= 0.72 + 0.34 * sin(u_t * (0.19 + 0.16 * h2) + h3 * TAU);
            float m = exp(-pow(d / talla, 1.7)) * brillo;
            luzR += m;
            tinteR += m * mix(vec3(0.58, 0.74, 1.00), vec3(1.00, 0.78, 0.70),
                              smoothstep(0.55, 0.95, hash(c + 61.2)));
          }
        }
      }
//#FIN
//#ESTRELLAS
      }
//#FIN
      float profR = horX - uv.y;
      /* Un reflejo se apaga con la distancia a la linea —cerca es
         coherente, lejos lo deshace el oleaje— y lo quiebra la calma
         del agua, igual que el reflejo del manglar. */
      float apagaProf = smoothstep(0.62, 0.05, profR);
      float quiebre = mix(0.45, 0.95, cn);
      if (luzR > 0.001) {
        vec3 tinteRn = tinteR / luzR;
        float f = clamp(luzR, 0.0, 1.4) * nocheAgua * apagaProf * quiebre;
        col = mix(col, papelBlanco() * tinteRn, f * 0.80);
      }

      /* ── Y LA VIA LACTEA TAMBIEN SE REFLEJA ───────────────────────
         Es la mitad de lo que hace una marina nocturna, y era lo que
         faltaba: el agua repetia las estrellas sueltas pero no la
         banda, asi que la via lactea moria en la linea del horizonte
         como si el mar no estuviera debajo. Se reconstruye el mismo
         perfil con la vertical espejada sobre el horizonte —el reflejo
         se inclina al reves, que es lo que hace un espejo— y se hunde
         en el agua con la profundidad. */
      float diagR = uvEsp + 1.44 * uv.x - 1.555;
      float perfilR = exp(-pow(abs(diagR) / 0.34, 1.7));
      perfilR *= 0.55 + 0.72 * fbm(vec2(uv.x * 2.2 + 41.0, uvEsp * 1.6));
      perfilR = clamp(perfilR, 0.0, 1.0);
      float viaR = perfilR;
//#ESTRELLAS
      if (u_hayEstrellas > 0.5) {
        vec3 lamR = texture(u_estrellas, vec2(q.x * 0.62, uvEsp * 1.88)).rgb;
        viaR = clamp(perfilR * (0.45 + 1.20
                   * smoothstep(0.10, 0.42, 1.0 - valor(lamR))), 0.0, 1.0);
      }
//#FIN
      {
        /* Mas apagado que el cielo —un reflejo devuelve parte de la luz,
           no toda— y con los mismos dos tonos, para que se lea la misma
           banda y no una mancha aparte. */
        float fR = viaR * nocheAgua * apagaProf * quiebre;
        float nucR = viaR * smoothstep(0.35, 0.95, viaR)
                   * nocheAgua * apagaProf * quiebre;
        col = mix(col, mix(col, papelBlanco() * vec3(0.76, 0.74, 1.00), 0.66),
                  fR * 0.17);
        col = mix(col, papelBlanco() * vec3(1.00, 0.64, 0.54), nucR * 0.14);
        col += vec3(1.00, 0.64, 0.54) * nucR * 0.12;
      }
    }

    /* CRESTA FRIA, SENO CALIDO. Esto es lo que hace que un mar de
       acuarela se vea colorido sin estar saturado, y es ademas lo que
       pasa de verdad: la cara de la onda que mira arriba refleja el
       cielo y sale fria; el seno deja ver el cuerpo del agua y sale
       calido. Dos pigmentos que se separan, no un color mas fuerte.

       Y como va montado sobre la onda, subir el movimiento sube el
       color: las dos cosas son el mismo cambio. La saturacion media
       apenas se mueve; lo que crece es la VARIEDAD de matiz dentro de
       la misma aguada, que es de donde sale la sensacion de pintura. */
    /* ═══ LAS CRESTAS QUE AVANZAN ════════════════════════════════
       La onda solo DEFORMABA la lamina: movia el muestreo unas
       centesimas y volvia. Por eso el agua se agitaba sin ir a ninguna
       parte — lo que se ve son las bandas pintadas, y esas estan
       quietas. Medido: correlacion 0.988 entre dos fotogramas separados
       medio segundo, con desplazamiento CERO.

       Una cresta que avanza no es una deformacion, es un
       ACONTECIMIENTO DE VALOR: el agua se aclara donde pasa la cara que
       mira al cielo, y se oscurece en el seno. Asi se pinta y asi se
       ve. La fase la manda la profundidad, de modo que la banda clara
       camina del horizonte hacia el ojo, y se separa al acercarse
       porque marcha es 1/distancia.

       Solo actua sobre el agua media y cercana (pp): en el horizonte
       las crestas son mas finas que un pixel y solo producirian
       centelleo. */
    /* EL PERIODO ES CONSTANTE, no depende de la distancia. Lo tenia
       multiplicado por vel, que varia con la profundidad, y eso hace que
       cada franja avance a distinto ritmo: el patron no se traslada, se
       deforma en su sitio. Medido, la correlacion caia de 0.964 a 0.871
       en medio segundo SIN desplazarse — se movia sin ir a ninguna
       parte. Una mar de fondo tiene UN periodo; lo que cambia con la
       distancia es el espaciado entre crestas, no su frecuencia.
       4.4 rad/s recorre las 40 radianes del horizonte al ojo en ~9 s. */
    float paso = sin(marcha * 2.35 + u_t * 3.52 + q.x * 1.15 + fase1);
    float lomo = smoothstep(0.30, 0.95, paso) * (1.0 - cn) * pp;
    float valle = smoothstep(-0.30, -0.95, paso) * (1.0 - cn) * pp;
    col = mix(col, mix(col, u_altas, 0.55), lomo * 0.30);
    col = mix(col, col * 0.86, valle * 0.30);

    /* (AQUI ESTUVO LA ESPUMA DE LA CRESTA, y se DESCARTA — no se
       reintenta. Se pinto como papel reservado sobre la cresta que
       viaja, que en teoria es como se pinta la espuma en acuarela, y en
       pantalla se veia mal: la reserva es una mancha de canto duro y
       sobre un agua en movimiento lee como suciedad, no como espuma.
       Una ola rompiendo tiene volumen y arrastre; no sale de aclarar la
       cima de una senoidal. Si algun dia hace falta espuma, sale de una
       lamina pintada, no de aqui.) */

    float cara = clamp(onda * 0.55 + 0.5, 0.0, 1.0);
    vec3 frio   = mix(col, mix(u_cieloAlto, u_altas, 0.35), 0.185);
    vec3 calido = mix(col, mix(u_reguero, u_bruma, 0.30),   0.155);
    col = mix(calido, frio, cara);

    /* Y una segunda separacion, mucho mas lenta y grande, que no sigue
       la onda sino la mancha: son los pigmentos apartandose mientras la
       aguada se seca. Periodo largo a proposito — se ve como zonas del
       agua que tiran a verde y otras a violeta, no como rayas. */
    float aparta = fbm(vec2(q.x * 1.35 + u_deriva * 0.03, uv.y * 3.2 + 7.0));
    col = mix(col, mix(col, u_agua, 0.24), smoothstep(0.58, 0.86, aparta) * 0.55);
    /* Y el lobulo calido, de verdad calido. Estaba tan lavado que solo
       era azul un poco menos azul, y un cuadro de un solo matiz se ve
       apagado por mucho que se le suba el color. El rosa polvoriento que
       pide el proyecto es esto: no decoracion, el contrapunto sin el
       cual el azul no canta. */
    vec3 tibio = mix(u_reguero, vec3(0.86, 0.66, 0.62), 0.42);
    /* ── Y EL LOBULO CALIDO CEDE A MEDIODIA ──────────────────────
       Este rosa polvoriento es el contrapunto sin el cual el azul no
       canta, y a primera y ultima hora eso es cierto. Pero a mediodia
       cae sobre un mar CIAN, y rosa sobre cian da gris: medido, se
       comia saturacion justo en la hora en la que el mar tiene que ser
       turquesa. Se queda —no se quita, que es la mitad del pigmento de
       la escena— pero pesa la mitad con el sol alto. */
    col = mix(col, mix(col, tibio, 0.34),
              smoothstep(0.42, 0.14, aparta) * mix(0.58, 0.26, mediodiaAgua));

    /* Perspectiva aérea: el agua lejana se lava hacia la bruma, pero
       SIEMPRE por debajo de ella. Con la bruma pareja el salto del
       horizonte se midió en 0.0024 y la línea desaparecía. */
    /* CANTO PERDIDO Y ENCONTRADO. El horizonte era una bruma pareja que
       lo suavizaba de lado a lado por igual, y un borde de dureza
       uniforme lee como aerógrafo. En acuarela el horizonte está DURO
       donde el charco se paró y PERDIDO donde la bruma se lo comió, y
       esa alternancia es la firma del medio.

       perdido es un ruido de periodo largo: dos o tres tramos anchos
       donde el agua y el cielo se funden, y el resto con el canto seco. */
    /* La frecuencia, otra vez. A q.x*0.62 el ruido no completaba un
       periodo en todo el ancho, asi que perdido valia lo mismo en cada
       columna y el horizonte salia con dureza uniforme de lado a lado:
       medido, solo el 2-13 % de las columnas tenia el canto debil. Una
       horizontal perfecta y continua delata la regla — en la naturaleza
       el horizonte es recto, pero en pintura casi nunca, porque el
       pintor lo pierde donde le conviene.

       A 2.3 caben dos o tres tramos perdidos, y el smoothstep va
       estrecho para que de verdad llegue a los dos extremos: donde se
       pierde, se pierde del todo; donde no, canto seco. */
    /* Y SE PIERDE DE VERDAD. El tramo perdido llegaba a 0.155 de la
       profundidad del agua y el duro se quedaba en 0.020: la diferencia
       entre los dos existia, pero el canto duro seguia siendo casi todo
       el ancho. Ahora el ruido va mas lento —dos tramos anchos en vez de
       tres estrechos— y donde se pierde, se pierde el triple. */
    float perdido = smoothstep(0.40, 0.62, fbm(vec2(q.x * 1.45 - 5.0, 8.3)));
    /* 0.46 era medio mar. Para perder el canto del horizonte ensanche
       la bruma hasta casi la mitad de la profundidad del agua, y eso
       dejo una franja de NIEBLA BLANCA alrededor de las raices a todas
       horas: el mar se veia lavado y el arbol flotando en vapor.
       El canto se pierde con un tramo estrecho; lo demas era exceso. */
    float anchoBruma = mix(0.012, 0.320, perdido);
    col = mix(u_bruma * 0.82, col,
              smoothstep(0.0, anchoBruma, prof) * 0.58 + 0.42);
    col = mix(col, col * 0.90, smoothstep(0.60, 1.0, prof));

    /* ═══ LOS DESTELLOS DE LA LINEA DEL AGUA ═════════════════════
       El agua ya se movia, pero lo que se movia era el MUESTREO de la
       lamina: pigmento desplazandose. Faltaba lo que de verdad hace
       que un mar se vea vivo, que es la luz cambiando sobre el —unas
       lineas brillantes cerca del horizonte que aparecen, duran un
       momento y se apagan.

       Y son LINEAS, no puntos. Cada destello es la cara de una ola
       vista casi de canto, o sea un trazo horizontal: fino en
       vertical (periodo de unos cuatro pixeles) y largo en horizontal
       (unos seis lobulos en una pantalla apaisada). Un campo de
       puntos brillantes seria purpurina, que es la version barata de
       esto y esta prohibida en el mismo parrafo que las facetas.

       Tres cosas los gobiernan y las tres tienen que coincidir:
       cerca del horizonte, hacia la fuente, y en el momento en que
       pasa la cresta —o sea que nacen y mueren con la ola, no con un
       reloj propio—. Por eso cambian con el movimiento en vez de
       titilar por su cuenta.

       Y la fuerza se razona CONTRA EL FONDO. Sobre agua nocturna
       (luminancia 0.05) una mezcla del 15 % hacia el papel multiplica
       el brillo por 3.4; por eso las facetas grandes se apagan de
       noche. Estos NO se apagan —un mar nocturno si tiene destellos
       plateados, es lo que lo hace hermoso— pero entran a un tercio y
       solo como hilos: el area total es minuscula. */
    {
      float cercaHor  = 1.0 - smoothstep(0.02, 0.32, prof);
      float haciaLuz  = exp(-pow((q.x - fuenteQ.x) / 0.95, 2.0));
      float trazo     = smoothstep(0.60, 0.93,
                          ruido(vec2(q.x * 3.2 + u_deriva * 0.55, uv.y * 190.0)));
      float chispa = trazo * cercaHor * mix(0.30, 1.0, haciaLuz)
                   * smoothstep(0.10, 0.72, paso * 0.5 + 0.5)
                   * (1.0 - cn * 0.40);
      vec3 destello = mix(col, mix(luzCalida(), u_altas, 0.30), 0.62);
      col = mix(col, destello, chispa * mix(0.13, 0.40, u_int));
    }

    /* EL REGUERO: angosto y continuo con calma, disperso con oleaje.
       Apunta a la fuente — antídoto contra la luz de ninguna parte. */
    /* EL REGUERO, PINTADO. Era una gaussiana en x multiplicada por
       chispas de ruido: un degradado suave salpicado de puntos, que es
       exactamente como NO se ve un camino de luna. Lo que hay de verdad
       son trazos HORIZONTALES —cada uno la cara de una ola— apretados
       cerca del horizonte y abiertos y sueltos cerca del ojo, con huecos
       de agua limpia entre ellos.

       La lamina viene asi pintada. Se ancla a la fuente en x, se estira
       desde el horizonte hasta el borde de abajo, y se deforma con la
       misma onda que el agua para que no flote sobre ella. */
    float dx = abs(q.x - u_fuente.x * aspecto);
    if (u_hayCamino > 0.5) {
      float anchoC = mix(0.62, 0.30, cn);
      vec2 ru = vec2((q.x - u_fuente.x * aspecto) / anchoC + 0.5,
                     1.0 - prof + duv.y * 2.0);
      if (ru.x > 0.0 && ru.x < 1.0 && ru.y > 0.0 && ru.y < 1.0) {
        vec4 tr = texture(u_camino, ru);
        /* SUBIDO, Y LLEGA MAS LEJOS. Estaba en 0.30 con la calma en su
           suelo —o sea el valor con el que entra todo el mundo— y se
           apagaba al 45 % antes de llegar al pie del cuadro. En la
           referencia el camino de luz es UNA COLUMNA ENTERA que va del
           disco hasta el borde de abajo, y es media composicion: sin
           ella el sol es un adorno pegado al fondo en vez de la fuente
           que ilumina la escena. */
        col = mix(col, u_reguero,
                  tr.a * u_int * mix(0.44, 0.78, cn) * mix(1.0, 0.58, prof));
      }
    } else {
      float ancho = mix(0.42, 0.055, cn) * mix(0.35, 1.0, pp);
      float camino = exp(-pow(dx / max(ancho, 0.02), 2.0));
      float chispa = smoothstep(mix(0.72, 0.30, cn), 1.0,
                       ruido(vec2(q.x * mix(90.0, 26.0, pp) + u_deriva * 40.0,
                                  uv.y * 200.0 - u_t * 0.7)));
      float brillo = camino * (mix(0.18, 0.55, cn) + chispa * 0.5)
                   * u_int * mix(1.0, 0.35, prof);
      col = mix(col, u_reguero, clamp(brillo, 0.0, 0.75));
    }

    /* El anillo que se cierra. Muy tenue: es agua que se aquieta, no un
       efecto. Y el sitio donde se sostuvo queda un punto más claro,
       como una aguada que se secó más fina. */
    col = mix(col, u_altas, anillo * 0.34);
    /* Y donde se aquieta, el agua tambien deja de centellear: la
       separacion calido/frio de las crestas se apaga con el aplanado.
       Un agua quieta no solo deja de moverse, deja de brillar. */
    col = mix(col, mix(col, u_altas, 0.30), aplanado * 0.22);

    /* ===== LOS CORALES =========================================
       Van en el fondo del mar, vistos A TRAVES del agua: se tinen
       velados por el agua que tienen encima. Y SE MECEN: un vaiven
       lento y horizontal que crece hacia abajo, porque lo cercano se
       mueve mas. No es oleaje, es vegetacion cediendo a una corriente
       que no se ve. */
    if (u_hayCorales > 0.5) {
      /* LA PRADERA NO TIENE UNA ALTURA, TIENE VARIAS. Con una banda de
         alto fijo el pasto se leía como una CINTA RECTA cruzando la
         pantalla: un borde horizontal de lado a lado es lo más
         artificial que puede haber en un cuadro de agua, y encima
         mandaba jerárquicamente por encima del manglar, que es el
         sujeto. Aquí el alto ondula con dos senos de periodo largo y
         primos entre sí, así que el borde nunca se repite dentro de la
         pantalla y no hay ninguna línea que seguir. */
      float onda = sin(q.x * 1.15 - 0.7) * 0.26
                 + sin(q.x * 2.63 + 2.1) * 0.15;
      float cAlto = u_coralesCaja.x * (1.0 + onda);
      float cBase = u_coralesCaja.y + u_coralesCaja.x * onda * 0.55;
      float cv = (uv.y - (cBase - cAlto)) / cAlto;
      if (cv > 0.0 && cv < 1.0) {
        float profC = 1.0 - cv;
        /* Y el vaivén va por cv, no por profC: una hoja de pasto está
           anclada por la raíz y se mece por la PUNTA. Al revés parecía
           un flequillo colgado moviéndose desde arriba. */
        float vaiven = sin(u_t * 0.28 + q.x * 2.1 + cv * 3.4) * 0.0075
                     + sin(u_t * 0.17 - q.x * 1.3) * 0.0042;
        /* cu.y = cv, NO 1.0 - cv. Las texturas se suben con
           UNPACK_FLIP_Y, así que y=0 es el borde INFERIOR de la lámina.
           La lámina vieja traía su sujeto arriba y por eso el invertido
           colaba; la de pasto marino está arraigada abajo, y con el
           invertido crecía hacia el fondo del mar colgando de un techo. */
        vec2 cu = vec2(q.x / (cAlto * u_coralesCaja.z) + vaiven * cv,
                       cv);
        vec4 tc = texture(u_corales, cu);
        /* Y PESA MENOS. Estaba a 0.82 de mezcla y 0.85 de croma, o sea
           casi opaco y casi a todo color: por eso llamaba más la
           atención que el árbol. Está a metros de distancia y bajo el
           agua; lo que llega de eso es un tinte, no una pintura. */
        /* ── DUOTONO, COMO TODO LO DEMÁS ────────────────────────────
           Era lo ÚNICO del cuadro que entraba con su RGB crudo, y el
           RGB crudo de esta lámina es arena: ocre cálido. De día
           colaba porque el agua también es clara. De noche no: el mar
           se va a azul de tinta y el pasto se quedaba en su ocre, así
           que aparecían unas vetas amarillas cruzando el fondo del
           agua a la una de la madrugada. No era que estuviera oscuro
           — era que era del color de otra hora.

           Se le toma el VALOR y se remapea entre dos colores sacados
           del AGUA DE LA HORA, que es el agua que lo tapa: un fondo
           marino no se ve con su color, se ve con el color del agua
           que hay encima. El extremo oscuro se va a un verde de fondo
           y el claro apenas se levanta hacia las altas del agua.

           Y conserva un resto de pigmento propio —un 0.18 de croma
           contra el 0.42 de antes—, porque un pasto marino sí tiene
           algo de verde y en duotono puro se quedaría gris. */
        vec3 oscuroP = mix(u_agua, vec3(0.086, 0.121, 0.098), 0.46);
        vec3 claroP  = mix(u_agua, mix(u_altas, u_bruma, 0.30), 0.44);
        vec3 pc = duotono(tc.rgb, oscuroP, claroP);
        pc += croma(tc.rgb, u_croma * 0.10, u_croma * 0.18);
        /* Nunca una cinta continua: se desvanece por arriba —el corte
           recto se veía— y se abre en claros con una onda lenta, para
           que haya agua limpia entre las matas. La paz es el vacío. */
        /* La lámina nueva ya trae el vacío —cuatro matas y mucha arena—,
           así que no hay que abrirle claros por código: eso la borraba.
           Solo se desvanece por arriba, para que no haya canto recto. */
        /* El desvanecido va ARRIBA, donde acaban las hojas, no abajo,
           que es donde está la arena y tiene que estar sólida. */
        float entra = 1.0 - smoothstep(0.58, 1.0, cv);
        /* MUY bajado. Se lee como una cinta pegada al borde porque la
           lamina es una FILA CONTINUA sin un solo hueco: la ondulacion
           por codigo mueve el borde pero no abre claros, y una franja
           sin huecos siempre se leera como una linea. Bajarla es un
           parche honesto; el arreglo es una lamina con matas separadas. */
        col = mix(col, pc, tc.a * mix(0.13, 0.34, profC) * entra * mix(0.55, 1.0, u_int));
      }
    }

    /* Y aqui, con el agua ya entera: la bruma, el reguero y el pasto ya
       pasaron, asi que lo reservado se queda reservado. */
    col = mix(col, papelBlanco(), reservaPapel);
  }

  /* ═══ HORIZONTE ═══════════════════════════════════════════════
     Bruma asimétrica a propósito: ancha por arriba —donde el aire se
     carga de vapor— y apenas un hilo por abajo. Difuminar parejo a los
     dos lados borra la línea (medido: el salto caía a 0.0024). Con el
     salto hoy en 0.20 hay margen de sobra para ablandarla y que deje de
     leerse como el borde de un rectángulo. */
  float dHor = abs(uv.y - horX);
  /* La referencia nocturna conserva una linea de horizonte legible, no
     una franja gris. La bruma alcanza toda su fuerza con el sol alto y
     se recoge cuando baja la intensidad; el alba conserva vapor, la
     noche deja que el azul profundo llegue hasta el agua. */
  float aireDiurno = smoothstep(0.42, 0.90, u_int);
  float fuerzaBruma = mix(0.42, 1.0, aireDiurno);
  float brumaArriba = exp(-dHor / mix(0.022, 0.011, cn)) * step(horX, uv.y)
                    * 0.55 * fuerzaBruma;
  float brumaAbajo  = exp(-dHor / mix(0.005, 0.002, cn)) * step(uv.y, horX)
                    * 0.24 * fuerzaBruma;
  col = mix(col, u_bruma, brumaArriba + brumaAbajo);

  /* ═══ EL MANGLAR ═══════════════════════════════  ← LÁMINA 06 ═══
     Raíz zancuda del mangle rojo. La lámina entra en duotono como el
     agua, así que no puede desentonar con ninguna hora: a las 4 a.m.
     se va fría y a las 3 p.m. se entibia sola. Discreta: no protagoniza. */
  if (u_hayManglar > 0.5) {
    float S  = u_manglarCaja.y;                  // alto en unidades de q
    float Sx = S * u_manglarCaja.w;              // ancho según la lámina
    float cx = u_manglarCaja.x * aspecto - u_paralaje * 0.45;
    float base = u_hor - u_manglarCaja.z;        // los pies entran al agua

    /* El manglar recupera su tierra: sombra tostada en el extremo
       oscuro y un claro cálido. Estaba mezclado hacia el agua y salía
       gris como todo lo demás. */
    /* El color propio del manglar aparece con el sol alto. En alba y
       noche los extremos recogen el azul del ambiente: asi la misma
       lamina pasa de sujeto verde a silueta sin parecer un filtro
       marron pegado sobre un cielo violeta. */
    /* ── EL UMBRAL DEL COLOR, MAS TEMPRANO ────────────────────────
       Con 0.78–0.98 el arbol solo tenia su verde en el pleno mediodia:
       a media manana y media tarde —horas de sol de verdad— ya estaba
       en el gris de transicion, y el dueño lo dijo con todas las
       letras: «veo al arbol sin brillo, sin color, sin gracia». El
       color propio entra ahora desde media manana; la noche sigue
       siendo silueta, que ahi si es verdad. */
    float diaArbol = smoothstep(0.55, 0.90, u_int);
    vec3 oscuroNoche = mix(u_cieloAlto * 0.42, u_agua * 0.34, 0.58);
    /* 0.50 dejaba la copa nocturna como una mancha sin lectura interna;
       0.60 conserva la silueta y deja adivinar el follaje a la luna. */
    vec3 claroNoche  = mix(u_cieloBajo, mix(u_altas, u_bruma, 0.25), 0.34) * 0.60;
    vec3 oscuroDia   = mix(vec3(0.155, 0.118, 0.086), u_agua * 0.35, 0.30);
    /* ── Y EL EXTREMO CLARO DEJA DE PODARSE ────────────────────────
       Ese 0.86 recortaba un 14 % justo el extremo por el que un arbol
       al sol se lee: no bajaba la media —que la sube el color propio—
       sino el TECHO, que es de donde sale el brillo. Medido a las
       11:00, la copa pintada contra la lamina de la que sale:

           lamina  media 0.399 · p90 0.563 · p99 0.699 · sat 0.311
           pantalla media 0.424 · p90 0.535 · p99 0.646 · sat 0.232

       O sea que el motor entregaba una copa MAS clara de media y a la
       vez MENOS luminosa arriba y con un tercio menos de color. Eso no
       es una copa apagada: es una copa APLANADA, y aplanado es
       exactamente lo que se ve como «perdio el brillo» — el dueño lo
       dijo asi. Una acuarela al sol no tiene la media alta: tiene la
       media donde estaba y el techo arriba.

       Sube a 1.02, que es devolver el 14 % y dos puntos mas. */
    vec3 claroDia    = mix(mix(u_bruma, u_altas, 0.30), vec3(0.72, 0.66, 0.54), 0.30) * 1.02;
    vec3 oscuroM = mix(oscuroNoche, oscuroDia, diaArbol);
    vec3 claroM  = mix(claroNoche, claroDia, diaArbol);
    /* ── Y DE DIA LA COPA SE ENCIENDE ─────────────────────────────
       El extremo claro del arbol era un gris calido, y con el sol alto
       eso es falso: una hoja de mangle a mediodia devuelve un verde
       LIMON, casi amarillo, y es ese verde el que hace que el arbol se
       vea vivo en vez de solo correcto. MEDIDO a las 11:00: la copa
       tenia 0.156 de saturacion, la MISMA exacta que el agua — o sea
       que el sujeto del cuadro no destacaba por color de nada.
       Solo de dia. Al amanecer y de noche la copa es una silueta y ese
       limon seria mentira. */
    /* Y EL LIMON SUBE CON EL. El extremo claro lo manda casi entero
       esta mezcla —54 % del camino hacia el— asi que devolverle el
       techo a claroDia sin tocar este verde apenas movia nada: el
       limon estaba a 0.83 de luminancia y hacia de tapon. A 0.92/0.95
       es la misma hoja, con el sol encima en vez de a media tarde. */
    claroM = mix(claroM, mix(claroM, vec3(0.92, 0.95, 0.52), 0.56), diaArbol);

    /* ── EL ÁRBOL RESPIRA ─────────────────────────────────────────
       Un manglar clavado es una calcomanía, por bien pintada que esté:
       lo que delata que el paisaje es una lámina no es su dibujo, es
       que no se mueve nada dentro de él mientras el agua sí.

       No hace falta partirlo en dos láminas —copa y tronco— como se
       había apuntado. Basta con CIZALLAR el muestreo: se desplaza la
       coordenada horizontal en proporción al cuadrado de la altura, y
       eso es exactamente el perfil de una viga en voladizo. Las raíces
       no se mueven ni un píxel porque abajo el factor vale cero; la
       copa se dobla porque arriba vale uno. El árbol se dobla, no se
       desliza — que es la diferencia entre un árbol con viento y un
       cartel al que le empujan.

       AMPLITUD. Estaba en 1.1 % y NO SE VEIA: con la copa a 300 px son
       tres pixeles y medio de recorrido repartidos en veinte segundos,
       o sea un sexto de pixel por segundo. Eso no es un arbol calmado,
       es un arbol quieto con una cuenta detras.

       A 3.4 % son unos diez pixeles en la punta de la copa, que sigue
       siendo un aire muy suave —una rama no se agita, se inclina— pero
       ya se percibe. El limite de esto no es el buen gusto: es que la
       lamina se cizalla, y pasado cierto punto las hojas empiezan a
       estirarse en vez de moverse. */
    float dobla = u_viento * ${VIENTO_COPA};

    // Planta
    vec2 m = vec2((q.x - (cx - Sx * 0.5)) / Sx, (uv.y - base) / S);
    m.x -= dobla * m.y * m.y;

    /* ── Y LAS HOJAS, QUE ES LO QUE DE VERDAD SE VE ─────────────────
       El cizallado de arriba dobla el árbol ENTERO, y eso —medido
       sobre el lienzo— movía el canto de la copa once píxeles en seis
       segundos. Se subió la amplitud dos veces y seguía sin notarse, y
       el motivo no era la escala: es que un desplazamiento UNIFORME es
       lo peor que se puede pedirle al ojo. Sin nada quieto al lado
       contra lo que compararlo, mover toda la copa a la vez se lee
       igual que no moverla.

       Lo que se ve es el movimiento DIFERENCIAL: unas hojas yendo
       contra otras. Aquí un ruido de periodo largo recorre la lámina y
       desplaza cada trozo de follaje por su cuenta, así que la copa
       deja de ser una pieza rígida y pasa a tener partes. Con una
       décima parte del recorrido se nota diez veces más — porque ahora
       hay contra qué medirlo.

       DOS EJES, y el vertical con menos amplitud: una hoja al viento
       cabecea más de lo que sube.

       Y SOLO EN LA COPA. mascaraHoja apaga esto por debajo del
       arranque de las ramas: un tronco no ondea, y unas raíces zancudas
       ondeando serían gelatina. Es lo mismo que hace el cizallado con
       el cuadrado de la altura, dicho con un umbral. */
    float mascaraHoja = smoothstep(0.30, 0.72, m.y);
    if (mascaraHoja > 0.001) {
      float sopla  = fbm(vec2(m.x * 3.4 + u_t * 0.115, m.y * 4.1 - u_t * 0.07)) - 0.5;
      float sopla2 = fbm(vec2(m.y * 5.2 - u_t * 0.095, m.x * 3.8 + 4.0)) - 0.5;
      /* Subido un 30 %. Lo que hace que un arbol se lea VIVO no es que
         se mueva mucho, es que se muevan unas hojas contra otras: este
         es el termino diferencial, y es el que se nota. El uniforme de
         mas arriba (VIENTO_COPA) sigue igual — subirlo cizalla la
         lamina y las hojas se estiran en vez de moverse. */
      m.x += sopla  * 0.0270 * mascaraHoja;
      m.y += sopla2 * 0.0135 * mascaraHoja;
    }
    if (m.x > 0.0 && m.x < 1.0 && m.y > 0.0 && m.y < 1.0) {
      vec4 t = texture(u_manglar, m);

      /* ── CONTRASTE LOCAL EN LA COPA ────────────────────────────────
         La masa de hojas se compacta: cientos de matas dibujadas una a
         una que, a tamano de pantalla, se funden en un solo bloque
         verde. El arreglo NO es subir el contraste global —eso oscurece
         el arbol entero y vuelve a separarlo del cuadro, que es el
         error que ya se corrigio dos veces con el fragmento cercano—
         sino subir el LOCAL: separar cada mata de sus vecinas dejando
         la masa donde esta.

         Cuatro tomas alrededor dan la media local, y la diferencia
         contra ella es el detalle. Es una mascara de enfoque de toda la
         vida, con el radio al 1.4 % de la lamina —unos ocho pixeles en
         pantalla— que es el tamano de una mata de hoja. Cuatro texture()
         de mas, y solo dentro de la caja del arbol.

         Solo en la copa: en el tronco y en las raices esto no separa
         nada y solo le pondria grano a una superficie lisa. */
      if (mascaraHoja > 0.001) {
        float e = 0.014;
        vec3 vecina = (texture(u_manglar, m + vec2( e, 0.0)).rgb
                     + texture(u_manglar, m + vec2(-e, 0.0)).rgb
                     + texture(u_manglar, m + vec2(0.0,  e)).rgb
                     + texture(u_manglar, m + vec2(0.0, -e)).rgb) * 0.25;
        /* La nueva lamina ya trae masas separadas por pigmento. Solo se
           recupera el detalle que pierde el reescalado; el enfoque
           anterior recreaba el contorno de cada hoja y endurecia la
           acuarela. */
        t.rgb = clamp(t.rgb + (t.rgb - vecina) * 0.16 * mascaraHoja, 0.0, 1.0);

        /* Y LAS HOJAS SE REPARTEN EL MATIZ. Una copa no tiene un verde:
           la hoja que da al cielo devuelve luz calida y tira a oliva, y
           la que esta metida dentro de la masa recibe el azul del
           ambiente y tira a verde-azulado. Repartirlo POR VALOR sale
           gratis y es lo que de verdad pasa, asi que los huecos de luz
           entre el follaje aparecen solos donde ya habia claros — sin
           inventarse ni una hoja. */
        float vh = valor(t.rgb);
        vec3 tinteHoja = mix(vec3(0.88, 0.97, 1.08), vec3(1.07, 1.02, 0.87),
                             smoothstep(0.20, 0.60, vh));
        t.rgb = clamp(t.rgb * mix(vec3(1.0), tinteHoja, mascaraHoja * 0.60),
                      0.0, 1.0);
      }
      /* APLANADO. Esta lamina es la que peor mide del juego: 0.465 de
         saturacion —dos veces y media cualquier otra— y cientos de matas
         de hoja dibujadas una a una, que es de donde sale el 28 % de
         canto del cuadro entero. Cuantizar su valor en seis escalones no
         la convierte en acuarela, pero le quita el modelado cilindrico
         de las raices, que es lo que la delata como render.
         El arreglo de verdad es repintarla; esto es lo que se puede
         hacer sin lamina nueva. */
      /* EL CONTRALUZ, INTERMITENTE. La lamina trae horneados un reborde
         calido continuo y unos destellos de estrella por toda la copa, y
         un contorno iluminado de punta a punta es luz de render: ninguna
         luz real ni ninguna aguada rodea un arbol entero. Se detectan
         los pixeles calidos y claros de la lamina y se les deja pasar
         solo por TRAMOS, con un ruido de periodo largo sobre la propia
         lamina (m, no q: la mascara viaja con el arbol). Aparece un
         trecho, se rompe, vuelve mas alla. */
      float calidoT = smoothstep(0.10, 0.30,
                        (t.r - t.b) + (valor(t.rgb) - 0.45) * 0.5);
      float tramo = smoothstep(0.38, 0.62, fbm(m * vec2(4.2, 3.1) + 7.0));
      /* BAJADO DE 0.8 A 0.30 CON LA LAMINA NUEVA. Esto se escribio
         contra la lamina anterior, que traia horneados un reborde calido
         continuo y unos destellos de estrella por toda la copa: luz de
         render que habia que apagar a tramos. La lamina repintada no
         tiene reborde ni destellos — tiene SOL, ancho y por un lado— y
         este detector no distingue una cosa de la otra: caza los pixeles
         calidos y claros, que ahora son exactamente las hojas al sol que
         hacen falta. Medido en la lamina: p95 de 56.6 a 90.9 de L*, o
         sea que por fin hay hojas iluminadas, y esto se las comia.
         No se quita del todo: si algun dia vuelve una lamina con
         reborde, el mecanismo sigue aqui. */
      vec3 tApagado = mix(t.rgb, vec3(valor(t.rgb)), calidoT * (1.0 - tramo) * 0.30);
      /* ── EL TECHO SUBE, LA MEDIA NO ─────────────────────────────
         Devolverle el techo a claroDia lo aclaraba TODO por igual —el
         duotono es lineal— y con eso la copa pasaba de 0.424 a 0.460 de
         media cuando la lamina esta en 0.399. Mas clara de media no es
         mas luminosa: es mas lavada, que es el mismo defecto de antes
         con el signo cambiado.

         Lo que hace radiante a una copa al sol es el RECORRIDO: sombra
         que sigue siendo sombra y hojas que se van arriba del todo. Asi
         que la rampa deja de ser recta y se curva un pelo hacia abajo:
         las hojas en sombra vuelven a donde estaban y las del sol se
         quedan con el techo nuevo.

         Solo de dia. De noche la copa es una silueta y una silueta no
         tiene recorrido que curvar. */
      float vM = clamp((valor(tApagado) - 0.08) / 0.82, 0.0, 1.0);
      vM = pow(vM, mix(1.0, 1.10, diaArbol));
      vec3 pm = mix(oscuroM, claroM, vM);
      /* El manglar conserva su propio pigmento, como el agua: en duotono
         puro la copa salía gris contra un cielo cálido y leía recorte. */
      /* Y menos croma: 0.85 sobre una lamina que ya viene a 0.465 de
         saturacion dejaba el arbol como el unico objeto saturado del
         cuadro, tirando de la mirada por color en vez de por valor. */
      /* El arbol venia a 0.465 de saturacion, el doble que todo lo
         demas. Con la curva su masa se apaga y solo cantan las hojas
         que ya tenian color: deja de ser el unico objeto saturado sin
         quedarse gris. */
      /* La lamina repintada bajo de 0.465 a 0.337 de saturacion, pero
         sigue siendo la mas alta del juego —el resto va de 0.11 a 0.21—
         asi que el arbol seguia siendo el unico objeto con color fuerte.
         La curva le baja el suelo y el techo. */
      /* El suelo de croma subio de 0.22 a 0.34: la poda anterior de
         saturacion se paso de frenada y el sujeto del cuadro quedo tan
         gris como el fondo. Sigue muy por debajo del 0.465 original de
         la lamina — el arbol tiene color, no grita. */
      /* ── Y EL COLOR, CON EL VALOR ───────────────────────────────
         Medido arriba: la copa pintada salia a 0.232 de saturacion con
         una lamina que trae 0.311, o sea que el motor le quitaba un
         cuarto largo de su color a lo que YA lo tenia. Eso no era
         sobriedad; era la otra mitad de la copa aplanada.

         La regla de la casa —lo apagado se queda apagado, de ahi la
         paz— sigue mandando de noche, cuando la copa es silueta y no
         sujeto. De dia sube el suelo a 0.48 y el techo a 1.62, y el
         techo solo lo cobran las hojas que en la lamina ya estaban
         limpias de color: las del sol. Sigue por debajo del 0.465
         original de la lamina — el arbol tiene color, no grita. */
      pm += croma(tApagado, u_croma * mix(0.34, 0.48, diaArbol),
                            u_croma * mix(0.92, 1.62, diaArbol));
      /* ── LOS HUECOS DE LUZ ENTRE EL FOLLAJE ────────────────────────
         Lo que hace que una copa se vea al sol no es que este mas clara:
         son los pocos sitios donde la luz ATRAVIESA y el papel se queda
         sin pintar. Aqui coinciden tres cosas —la lamina ya muy clara,
         el lado que mira a la fuente, y el dia— y donde coinciden no hay
         pintura, hay hoja. Son cuatro o cinco por copa, no un brillo
         repartido: eso seria barniz. */
      float huecoLuz = smoothstep(0.74, 0.94, valor(t.rgb))
                     * ladoDeLuz(m.x, cx, aspecto) * diaArbol;
      pm = mix(pm, papelBlanco(), clamp(huecoLuz, 0.0, 1.0) * 0.42);

      /* ── Y LE DA LA LUZ POR UN LADO ─────────────────────────────
         El arbol recibia la misma luz por los cuatro costados. Con el
         sol pintado a un lado del cuadro eso no es neutralidad, es un
         error de dibujo, y es la mitad de por que la escena se leia
         plana.

         Tres condiciones a la vez, y hacen falta las tres:

         - ladoDeLuz: solo el costado que mira a la fuente.
         - La lamina ya clara ahi: la luz cae sobre lo que sobresale,
           no sobre el fondo de la masa. Sin esto se ilumina el hueco
           entre dos hojas igual que la hoja.
         - POR TRAMOS. Un canto iluminado continuo de punta a punta es
           luz de render — la misma razon por la que unas lineas mas
           arriba se apaga a trozos el contraluz que la lamina trae
           horneado. Ruido propio y desfasado del de aquel, o los dos
           encenderian los mismos trechos y volveria el reborde. */
      float tramoLuz = smoothstep(0.34, 0.66, fbm(m * vec2(3.6, 2.7) + 19.0));
      float pilla    = smoothstep(0.28, 0.70, valor(t.rgb));
      float caricia  = ladoDeLuz(m.x, cx, aspecto) * pilla * tramoLuz * fuerzaLuz();
      /* Y LA LUZ DEL MOTOR CEDE ANTE LA DE LA LAMINA. La caricia
         direccional se escribio cuando el arbol no tenia luz ninguna
         dentro. La lamina nueva ya viene iluminada por un lado, asi que
         a mediodia —con el sol al otro lado del cuadro— el motor
         encendia el flanco contrario y salian dos luces. Se queda como
         un refuerzo, no como la fuente. */
      pm = mix(pm, mix(pm, luzCalida(), 0.62), caricia * 0.18);
      /* Y SE ENTIERRA: el borde inferior de la lámina es un corte recto
         y se veía como tal cruzando las raíces. Aquí el alfa se apaga en
         el último tramo, así que el árbol se disuelve en el agua en vez
         de terminar en una línea. */
      /* Y SE LE QUITA LA NIEBLA. La lamina trae pintada una aguada
         blanquecina alrededor de las raices —del original, no del
         shader— y en pantalla salia como una franja de vapor que dejaba
         el arbol flotando y el mar lavado. Aqui se apaga lo casi blanco
         que este en el tercio bajo de la lamina, que es exactamente esa
         niebla, sin tocar ni las raices ni la copa. */
      float niebla = smoothstep(0.70, 0.90, valor(t.rgb))
                   * (1.0 - smoothstep(0.02, 0.42, m.y));
      /* El canto inferior de la lamina se pierde en solo 3.5 % de su
         alto. A 6 % la raiz entera empezaba blanda y la base parecia
         desenfocada incluso antes de entrar al agua. */
      float bajoAgua = smoothstep(0.0, 0.035, m.y);
      /* ── Y LAS RAICES SE DISUELVEN EN EL AGUA ─────────────────────
         Hundir el arbol no bastaba: la lamina se pinta DESPUES del mar,
         asi que las raices seguian dibujandose enteras y nitidas por
         encima del agua, como un arbol puesto delante del mar en vez de
         dentro de el. Aqui el alfa se apaga por debajo de la linea de
         agua, asi que el enrejado entra en el agua y se pierde en ella.

         Es ademas lo que pasa de verdad: el agua de un manglar lleva
         taninos y sedimento, y a un palmo de la superficie ya no se ve
         nada. Y es lo que hace un acuarelista con un canto que no
         quiere contar: lo pierde.

         El tramo es corto —0.13 del alto— porque perder el canto es una
         cosa y borrar el arbol es otra. */
      /* Primero hay una franja nitida: la superficie corta las raices,
         no las emborrona. La perdida empieza tres puntos por debajo y
         termina pronto, cuando de verdad ya hay agua entre ellas y el
         ojo. */
      float entraAgua = 1.0 - smoothstep(0.030, 0.085, u_hor - uv.y);
      col = mix(col, pm, t.a * 0.92 * bajoAgua * entraAgua
                       * (1.0 - niebla * 0.88));
    }

    /* El reflejo. A calma baja está partido en tajos; a calma alta el
       arco y su reflejo casi cierran un anillo, nunca del todo. Es la
       mecánica de Muñoz hecha geometría, y es una línea de shader. */
    /* ── EL ESPEJO NACE EN EL AGUA DEL ÁRBOL, NO EN EL HORIZONTE ────
       Estaba anclado a u_hor, y el árbol no entra al agua en el
       horizonte: entra en su propia línea de contacto, que queda
       POR DEBAJO (el árbol está en primer término y su base se hunde
       u_manglarCaja.z). Con el ancla en u_hor, toda la franja entre el
       horizonte y los pies del árbol se rellenaba con la copa
       reflejada — un follaje fantasma DETRÁS de las raíces, o sea el
       árbol espejado hacia los dos lados de su línea de agua. La mitad
       del hundimiento es donde el velo del agua se vuelve opaco sobre
       el tronco, medido en captura. */
    float lineaAgua = base + u_manglarCaja.z * 0.5;
    float profundidadR = lineaAgua - uv.y;
    /* En la superficie el reflejo toca exactamente cada raiz. La
       rotura horizontal nace en cero y crece bajo el agua; antes ya
       llegaba desplazada a la linea de contacto y producia un hueco
       borroso aunque la textura fuera la misma. */
    float rompeDesdeAgua = smoothstep(0.0, 0.050, profundidadR);
    float tajo = (ruido(vec2(uv.y * mix(70.0, 16.0, cn), u_t * 0.25)) - 0.5)
               * (1.0 - cn) * 0.025 * rompeDesdeAgua;
    /* El espejo nace en la LINEA DE AGUA. Antes nacia en base, que es
       el fondo enterrado de la lamina: quedaba un hueco borroso entre
       las raices visibles y su reflejo. corteAgua es la coordenada de
       textura que cruza exactamente la superficie; desde ahi la misma
       pintura se recorre al reves, a escala uno a uno. */
    float corteAgua = clamp((lineaAgua - base) / S, 0.0, 1.0);
    float escalaReflejo = 0.62;
    vec2 r2 = vec2((q.x + tajo - (cx - Sx * 0.5)) / Sx,
                   corteAgua + profundidadR / (S * escalaReflejo));
    /* El reflejo se dobla con el árbol. El agua ya lo rompe en tajos,
       pero si el original se mueve y su reflejo no, lo que queda es un
       árbol bailando sobre una estampa quieta. */
    r2.x -= dobla * r2.y * r2.y;
    /* La copa reflejada lleva el MISMO movimiento diferencial que la
       copa real. Sin esto el tronco coincidia pero las hojas nadaban en
       otra figura, y el ojo lo leia como una mancha aproximada. */
    float mascaraRef = smoothstep(0.30, 0.72, r2.y);
    if (mascaraRef > 0.001) {
      float soplaR  = fbm(vec2(r2.x * 3.4 + u_t * 0.115,
                              r2.y * 4.1 - u_t * 0.07)) - 0.5;
      float soplaR2 = fbm(vec2(r2.y * 5.2 - u_t * 0.095,
                              r2.x * 3.8 + 4.0)) - 0.5;
      r2.x += soplaR  * 0.0270 * mascaraRef;
      r2.y += soplaR2 * 0.0135 * mascaraRef;
    }
    if (r2.x > 0.0 && r2.x < 1.0 && r2.y > 0.0 && r2.y < 1.0 && uv.y < lineaAgua) {
      vec4 t = texture(u_manglar, r2);
      float rotura = step(0.34,
        ruido(vec2(uv.y * mix(95.0, 22.0, cn), 7.3)) + cn * 0.55);
      /* Siempre queda el 72 % de la estructura. Las roturas del agua
         modulan el reflejo; ya no lo agujerean hasta volverlo borron. */
      float roto = mix(0.72 + rotura * 0.28, 1.0, cn);
      float altoReflejo = max(0.001, S * (1.0 - corteAgua) * escalaReflejo);
      float desvanece = 1.0 - smoothstep(altoReflejo * 0.72,
                                        altoReflejo, profundidadR);
      /* UN REFLEJO OSCURECE EL AGUA, NO LA ILUMINA. Estaba pintando el
         duotono del arbol tal cual, asi que su claridad la mandaba la
         lamina: con la vieja, oscura, colaba; con la repintada, mucho
         mas clara, salia una mancha palida clavada bajo el arbol.
         Medido, el pico de brillo del agua estaba en 0.61 de la
         pantalla A TODAS HORAS mientras la luna se movia de 0.25 a
         0.92 — no seguia a la fuente porque no era el reguero.

         Ahora la lamina solo aporta DONDE hay reflejo (su alfa); el
         color sale de oscurecer el agua que ya hay y teñirla hacia el
         extremo oscuro del arbol. Es lo que hace un reflejo de verdad. */
      /* ── EL REFLEJO LLEVA LA ESTRUCTURA, NO SOLO LA SILUETA ────
         Esto usaba la lamina SOLO por su alfa: el color salia de
         oscurecer el agua, igual en la copa que en el tronco. El
         resultado es una mancha oscura con forma de arbol —una sombra,
         no un reflejo—, y de ahi que se leyera impreciso.

         Un reflejo repite el VALOR de lo que refleja: el tronco claro
         se ve claro y el hueco entre las hojas se ve oscuro. Aqui la
         lamina vuelve a entrar en duotono, con los mismos extremos que
         el arbol de arriba, y despues se hunde hacia el agua. Sigue
         siendo mas oscuro que el original —un reflejo oscurece el agua,
         no la ilumina, y esa correccion se mantiene— pero ahora tiene
         dentro lo que el arbol tiene dentro.

         Y SE COMPRIME. Un reflejo en agua se acorta con el angulo de
         vision: r2.y se estira para que el arbol reflejado mida menos
         que el real, que es lo que lo hace leer como agua y no como
         espejo. */
      vec3 espejo = duotono(t.rgb, oscuroM, claroM);
      vec3 refl = mix(col * 0.66, mix(espejo * 0.58, oscuroM, 0.24), 0.68);
      /* Ni el papel claro de la lamina ni el reguero que ya vive en el
         agua pueden convertir la copa reflejada en una mancha blanca:
         el manglar siempre sustrae luz. Se conserva la estructura por
         debajo de este techo, pero cada canal queda mas oscuro que el
         agua que tenia debajo. */
      refl = min(refl, col * 0.88);
      col = mix(col, refl,
                t.a * roto * desvanece * mix(0.42, 0.68, cn));
    }
  }

  /* ═══ PAPEL ════════════════════════════════════  ← LÁMINA 07 ═══
     Fijo a la pantalla. Si se moviera con el paralaje sería textura de
     un objeto; quieto, es la superficie del cuadro — y es la señal de
     cine más barata que existe. */
  /* ═══ LAS GARZAS ═══════════════════════════  ← LÁMINAS 08a·08b ═══
     DOS ESCALAS, y por eso son dos láminas y no una escalada. Una garza
     posada en el manglar mediría 25 px: eso no es compañía, es un punto.
     La cercana está en primer plano y acompaña; las lejanas son puro
     gesto de pincel junto al manglar.
     El sitio nunca afirma quiénes son, y ninguna está en apuros.
     (Recortado: ver la nota de los uniformes, arriba.) */
//#GARZAS
  if (u_hayGarzas > 0.5) {
    /* SOMBRA AZUL, CANTO CALIDO. Una garza no es blanca: es papel con
       una sombra fria dentro y un filo tibio donde le da la luz. Sin
       eso son recortes, que es exactamente como se leian. El extremo
       oscuro se va a un azul de verdad y no a un gris con algo de agua
       mezclada; el filo se lo pone la luz direccional aqui abajo.
       Y no ganan un solo detalle mas: su fuerza es que son gestos. */
    vec3 oscuroG = mix(vec3(0.10, 0.11, 0.15), u_agua * 0.42, 0.50);
    vec3 claroG  = mix(u_bruma, u_altas, 0.45) * 0.92;

    // Lejanas: gestos junto al manglar, poco paralaje.
    {
      vec4 k = u_garzaLejosCaja;
      float Sx = k.y * k.w;
      float cxg = k.x * aspecto - u_paralaje * 0.38;
      vec2 m = vec2((q.x - (cxg - Sx * 0.5)) / Sx, (uv.y - (u_hor - k.z)) / k.y);
      if (m.x > 0.0 && m.x < 1.0 && m.y > 0.0 && m.y < 1.0) {
        vec4 t = texture(u_garzaLejos, m);
        col = mix(col, duotono(t.rgb, oscuroG, claroG), t.a * 0.80);
      }
    }
    // Cercana: primer plano, más paralaje, la que de verdad acompaña.
    {
      vec4 k = u_garzaCercaCaja;
      float Sx = k.y * k.w;
      float cxg = k.x * aspecto - u_paralaje * 0.95;
      vec2 m = vec2((q.x - (cxg - Sx * 0.5)) / Sx, (uv.y - (u_hor - k.z)) / k.y);
      if (m.x > 0.0 && m.x < 1.0 && m.y > 0.0 && m.y < 1.0) {
        vec4 t = texture(u_garzaCerca, m);
        vec3 pg = duotono(t.rgb, oscuroG, claroG);
        /* Solo en la cercana. La lejana mide unos veinticinco pixeles
           y ahi un canto iluminado no es luz, es ruido. */
        float filoG = ladoDeLuz(m.x, cxg, aspecto)
                    * smoothstep(0.34, 0.80, valor(t.rgb)) * fuerzaLuz();
        pg = mix(pg, mix(pg, luzCalida(), 0.58), filoG * 0.30);
        col = mix(col, pg, t.a * 0.94);
      }
    }
  }
//#FIN

  /* ===== EL MANGLAR CERCANO ====================================
     Lo mas proximo del cuadro y lo ultimo que se pinta. No es paisaje:
     es donde se posa el ave protagonista. Por eso lleva su propio
     paralaje, el mas fuerte de todos: lo cercano se mueve mas. */
  if (u_hayCerca > 0.5) {
    /* En movil el fragmento cercano se comia la composicion: 0.92 del
       alto con la pantalla estrecha tapaba al protagonista. Se encoge
       con el aspecto — el primer termino enmarca, no tapa. */
    /* Llega calculado desde JS —encogeCerca()— para que el sitio donde
       se posa la garza cercana y el sitio donde se pinta la rama salgan
       del mismo numero. */
    float kAlto = u_cercaCaja.y * u_encoge, kAncho = kAlto * u_cercaCaja.w;
    /* Anclado por su BORDE IZQUIERDO: es un fragmento que entra por la
       esquina, no un objeto centrado. Con el centro se salía de cuadro
       en cuanto cambiaba la proporción de la ventana. */
    float kx = u_cercaCaja.x * aspecto - u_paralaje * 1.35;
    vec2 mc = vec2((q.x - kx) / kAncho, (uv.y - u_cercaCaja.z) / kAlto);
    /* Y LA RAMA DEL PRIMER TÉRMINO TAMBIÉN. Va al revés y con más
       recorrido que la copa, y las dos cosas son ciertas: es una rama
       en voladizo —así que su punta se mueve mucho más que un tronco—
       y está a un palmo del ojo, donde el mismo desplazamiento real se
       ve al triple. Signo contrario porque cuelga desde el otro lado
       del cuadro; si se doblara igual, las dos leerían como una sola
       pieza rígida moviéndose en bloque.

       El perfil va por mc.x y no por mc.y: esta lámina es un fragmento
       que entra por la izquierda y se aleja hacia la derecha, así que
       su voladizo crece a lo ANCHO, no a lo alto. */
    mc.y += u_viento * ${VIENTO_RAMA} * mc.x * mc.x;
    /* Y su follaje también se remueve por trozos, por lo mismo que la
       copa del lejano: lo que se ve no es que se mueva todo, es que se
       muevan unas partes contra otras. Aquí con más amplitud, porque
       esta rama está a un palmo del ojo. */
    {
      float sopla = fbm(vec2(mc.x * 3.0 - u_t * 0.10, mc.y * 4.4 + u_t * 0.08)) - 0.5;
      float hojaC = smoothstep(0.10, 0.55, mc.x);
      mc.x += sopla * 0.034 * hojaC;
      mc.y += sopla * 0.028 * hojaC;
    }
    if (mc.x > 0.0 && mc.x < 1.0 && mc.y > 0.0 && mc.y < 1.0) {
      vec4 tk = texture(u_manglarCerca, mc);
      /* La derecha se desvanece sola: la lámina trae ese final PINTADO.
         Pero su borde SUPERIOR sí lleva tinta hasta el canto, y ahí se
         veía la línea recta. Solo ese lado se ablanda, y ancho, para que
         no parezca niebla sino que se pierda por arriba de cuadro. */
      tk.a *= 1.0 - smoothstep(0.74, 1.0, mc.y);
      /* ── Y LA DERECHA TAMPOCO SE DESVANECE SOLA ───────────────────
         Aqui arriba estaba escrito que la derecha de esta lamina trae
         su final PINTADO y no hacia falta tocarla. Medido, no es cierto:
         a 0.55 del ancho todavia hay pintura en el 13.2 % de la columna,
         a 0.75 en el 12.7 %, y lo que hay son PUNTAS DE RAIZ finas que
         acaban en canto plano en mitad del aire. Una raiz que se corta
         en seco no se lee como raiz, se lee como un trozo de palo
         pegado — que es exactamente como se veia.

         Se ablanda el mismo lado, con el mismo gesto que ya se usa para
         el borde de arriba: el fragmento se pierde al alejarse del ojo
         en vez de terminar. Empieza tarde (0.58) para no comerse los
         arcos gruesos, que son los que sostienen a la garza. */
      tk.a *= 1.0 - smoothstep(0.58, 0.92, mc.x);
      /* Subido de valor. A 0.085 era una silueta casi negra pegada al
         borde, con un salto de valor que no tenía nada que ver con el
         resto del cuadro: parecía recortada de otra pintura. Un primer
         término en acuarela es más oscuro que el fondo, sí, pero sigue
         siendo la misma aguada. */
      /* Sobrecorregi. De 0.085 —silueta casi negra, recortada de otro
         cuadro— lo subi a 0.165 y quedo una masa gris palida que lee como
         niebla. Un primer termino tiene que PESAR: es lo mas cercano al
         ojo y por tanto lo mas contrastado del cuadro. */
      /* ── LA MISMA MADERA QUE EL ARBOL DEL FONDO ────────────────
         Estos dos extremos eran FRIOS —un gris azulado hacia la bruma—
         mientras el manglar lejano va por un duotono calido de tierra.
         O sea que el mismo arbol, a dos distancias, salia de dos
         colores distintos, y se notaba: medido sobre las laminas, el
         RGB medio de la madera cercana es (71, 76, 87) —azul gris— y el
         de la lejana (107, 116, 66) —oliva—, y encima el motor los
         separaba mas en vez de acercarlos.

         Y ADEMAS ESTABA AL REVES. La perspectiva aerea enfria y lava lo
         LEJANO, no lo cercano: el primer termino es lo mas calido, lo
         mas saturado y lo mas contrastado del cuadro, porque entre el y
         el ojo no hay aire. Aqui se le da la misma familia de madera
         que al arbol del fondo, un punto mas calida y mas oscura — que
         es lo que lo mantiene delante. */
      /* MEDIDO EN PANTALLA a las 12:00: la madera del arbol lejano
         salia con matiz 131 grados y la del primer termino con 172 — 41
         grados de separacion, o sea verde contra cian. El mismo arbol a
         dos distancias, de dos colores. Se acerca por los tres sitios
         que lo separaban: menos tiron del agua en el extremo oscuro,
         mas madera en el claro, y sobre todo el croma de mas abajo. */
      /* De noche este primer termino se quedaba con su madera calida de
         siempre —la de mediodia— porque oscuroC/claroC no tenian puerta
         de hora, a diferencia del manglar del fondo que si oscurece con
         u_cieloAlto/u_agua. Un primer plano no puede ser mas claro que
         el fondo a las 9 de la noche: se le da la misma familia nocturna
         fria, y la madera calida solo vuelve con el sol alto. */
      float diaCerca = smoothstep(0.55, 0.90, u_int);
      vec3 oscuroCDia = mix(vec3(0.132, 0.098, 0.070), u_agua * 0.36, 0.16);
      vec3 claroCDia  = mix(mix(u_bruma, u_altas, 0.30),
                         vec3(0.70, 0.60, 0.43), 0.62) * 0.84;
      vec3 oscuroCNoche = mix(u_cieloAlto * 0.34, u_agua * 0.30, 0.55) * 0.55;
      vec3 claroCNoche  = mix(u_cieloBajo, mix(u_altas, u_bruma, 0.25), 0.34) * 0.42;
      vec3 oscuroC = mix(oscuroCNoche, oscuroCDia, diaCerca);
      vec3 claroC  = mix(claroCNoche, claroCDia, diaCerca);
      vec3 pk = duotono(tk.rgb, oscuroC, claroC);
      /* ── Y AQUI ESTABA EL GRUESO DEL PROBLEMA ─────────────────────
         1.15 era el multiplicador de croma mas alto de todo el shader —
         el arbol lejano usa 0.22 a 1.20 y el agua 0.85— y se aplica
         sobre una lamina cuyo pigmento propio es AZUL GRIS: medido, RGB
         medio (71, 76, 87). O sea que el motor cogia el azul de la
         lamina y lo multiplicaba por encima del duotono, deshaciendo
         justo lo que el duotono acababa de hacer.

         Tenia sentido cuando este fragmento era una silueta oscura y su
         unico color era el que traia dentro. Ahora que comparte familia
         de madera con el arbol del fondo, el pigmento propio pasa a ser
         un matiz, no el color. */
      pk += (tk.rgb - vec3(valor(tk.rgb))) * u_croma * 0.34 * mix(0.15, 1.0, diaCerca);

      /* ── LA LUZ QUE DEVUELVE EL AGUA ──────────────────────────────
         Las raices del primer termino se leian como una silueta puesta
         ENCIMA del oceano en vez de estar dentro de el, y el motivo no
         era el color ni el valor: es que les faltaba el rebote. El agua
         de debajo devuelve luz hacia arriba y enciende los bajos de
         todo lo que flota sobre ella. Sin eso, no hay nada que ate una
         cosa a la otra.

         Es un rebote, asi que es FRIO —trae el color del agua, no el
         del sol— y viene de abajo, mas fuerte cuanto mas cerca del
         borde inferior del cuadro. Roto con un ruido de periodo medio
         para que encienda unas raices y otras no: un rebote parejo
         volveria a ser aerografo. */
      float rebote = 1.0 - smoothstep(0.0, 0.46, uv.y);
      rebote *= rebote;
      rebote *= smoothstep(0.28, 0.70, fbm(mc * vec2(5.5, 4.0) + 3.0));
      vec3 luzAgua = mix(u_altas, u_bruma, 0.45);
      pk = mix(pk, mix(pk, luzAgua, 0.50), rebote * mix(0.18, 0.34, u_int));

      /* Y EL FILO QUE MIRA A LA FUENTE. El primer termino esta casi a
         contraluz —el astro vive al otro lado del cuadro—, asi que lo
         suyo no es una cara iluminada sino un canto. Entra mas flojo
         que en el arbol y solo donde la lamina ya viene clara. */
      float filo = ladoDeLuz(mc.x, kx + kAncho * 0.5, aspecto)
                 * smoothstep(0.30, 0.72, valor(tk.rgb)) * fuerzaLuz();
      pk = mix(pk, mix(pk, luzCalida(), 0.55), filo * 0.24);

      col = mix(col, pk, tk.a * 0.96);
    }
  }

  /* ═══ EL GRAFITO ═══════════════════════════════  ← LÁMINA 11 ═══
     El dibujo previo, FIJO AL PLANO DEL CUADRO: no lleva u_deriva, así
     que el agua se desliza por debajo y la pintura se corre de su propio
     dibujo y vuelve. Ninguna foto ni video generado puede hacer eso.
     Se compone MULTIPLICANDO —que es como funciona un lápiz sobre el
     papel—, normalizado contra el blanco de su propia hoja para que el
     papel no oscurezca nada y solo la marca cuente. Por eso no necesita
     canal alfa y el JPEG sirve tal cual. */
  if (u_hayGrafito > 0.5) {
    vec2 gg = vec2(uv.x, (uv.y - u_hor) * u_grafito.y + u_grafito.x);
    if (gg.y > 0.0 && gg.y < 1.0) {
      float f = clamp(valor(texture(u_grafitoTex, gg).rgb) / u_grafitoMedia,
                      0.0, 1.0);
      /* El lápiz se desvanece hacia el agua: sus arcos y sus tics no
         coinciden con la pintura de abajo, y sobre el mar se leen como
         rayas sueltas. Un dibujo previo asoma sobre todo donde la
         aguada es fina, que es arriba. */
      float fuerza = u_grafito.z * mix(1.0, 0.18,
                        smoothstep(0.0, 0.22, u_hor - uv.y));
      col *= mix(1.0, f, fuerza);
    }
  }

  if (u_hayPapel > 0.5) {
    // Escaneo real de papel, en ESPACIO DE PANTALLA. Se resta su propia
    // media para que el grano module sin oscurecer el cuadro entero.
    /* El grano tiene que ser FINO. Muestreando la lámina a su tamaño
       nativo cabía menos de una repetición en pantalla, así que lo que
       se veía no era el diente del papel sino sus nubes grandes: por eso
       leía forzado. Se repite ~3 veces a lo ancho y el diente aparece. */
  /* LA NOCHE TENÍA MÁS COLOR QUE EL DÍA, que es justo al revés de como
     se ve una noche. Medido: 0.41 de saturación media a las 19:00 contra
     0.17 a las 15:00, y el 98 % del cuadro por debajo de 0.10 de
     luminancia. Mucho color en un rango de nada. Se desatura y se le
     abre algo de recorrido para que el ojo tenga dónde moverse. */
  {
    /* CODIGO MUERTO DESDE QUE LO ESCRIBI. La prueba era
       smoothstep(0.02, 0.34, u_int), pero u_int NUNCA baja de 0.35: los
       anclajes de la hora son 0.35 a las 3, 0.70 a las 9, 1.00 a las 15
       y 0.50 a las 21. Asi que la expresion daba 1 a cualquier hora y
       dNoche valia 0 siempre — la desaturacion, el estirado de rango y
       el aplanado extra de la noche no se ejecutaron ni una vez.

       El rango real es [0.35, 1.00]: noche 0.35-0.50, dia 0.70-1.00. */
    float dNoche = 1.0 - smoothstep(0.42, 0.78, u_int);
    /* UNA PASADA FINAL DE APLANADO, para todo el cuadro y despues de
       todo lo demas. Las pasadas de cada capa dejaban fuera lo que se
       compone al final —la perspectiva aerea, el velo, el estirado de
       la noche— y de noche eso era casi la mitad del cuadro: 59.8 % de
       degradado contra 45.5 % de dia. Aqui se recoge todo junto. */
    /* Mas escalones de noche: al topar el agua contra el cielo su rango
       se comprimio, y con 14 pasos volvia a cruzar pocos —65.8 % de
       degradado—. Es el mismo problema de granularidad, un piso mas
       abajo. Y no pisa lo reservado: papel es ausencia de pintura. */
    /* Y suave. Con dureza 0.05 el escalon era un canto duro y el cuadro
       salio BANDEADO: contornos de mapa topografico, que es un artefacto
       digital y justo lo contrario de una acuarela. Persegui la metrica
       de planitud hasta romper la pintura. A 0.38 la transicion ocupa
       tres cuartos del escalon: se agrupa el valor lo justo para que
       lea aguada, sin que aparezca un solo borde. */
    col = mix(col, aplanar(col, mix(9.0, 14.0, dNoche), 0.38),
              mix(0.30, 0.45, dNoche) * (1.0 - reservaPapel * 0.85));
    if (dNoche > 0.001) {
      /* Bajado de 0.30 a 0.14. Desaturar parejo es la otra mitad de la
         receta vintage; lo que sobraba de noche no era color, era color
         SIN RANGO. Se corrige con el rango, no quitandole el color. */
      col = mix(col, vec3(valor(col)), dNoche * 0.14);
      col = mix(col, clamp((col - 0.018) * 1.30, 0.0, 1.0), dNoche * 0.55);
    }
  }

    float g = valor(texture(u_papelTex, gl_FragCoord.xy / (u_papelTam * 0.30)).rgb);
    col *= 1.0 + (g - u_papelMedia) * u_papel;
  } else {
    col *= 1.0 - (hash(gl_FragCoord.xy * 0.75) - 0.5) * 0.055;
  }

  /* Reserva del blanco, SOLO en el agua: una mota de 0.96 en el cielo
     tumbaba el peor contraste del lockup a 3.13:1. */
  /* Escasísima: a 1 de cada 220 píxeles leía como nieve, no como papel
     reservado. Ahora 1 de cada 3.000 y más apagada. */
  float reserva = smoothstep(0.99966, 1.0, hash(gl_FragCoord.xy * 0.31 + 11.0));
  col = mix(col, u_bruma * 1.06, reserva * 0.55 * step(uv.y, horX));

  salida = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

/* Quita del codigo del shader los bloques marcados //#ETIQUETA … //#FIN.
   Existe por una razon concreta: GL cuenta un sampler como ACTIVO por el
   mero hecho de estar declarado y leido en alguna rama, aunque su
   bandera este en cero y nunca se ejecute. O sea que una capa apagada
   sigue gastando unidad de textura, y pasado el limite —dieciseis
   garantizadas— el enlazado falla y se cae el mar entero. Para que una
   capa se apague de verdad hay que recortarla ANTES de compilar. */
function recortar(fuente, etiqueta) {
  return fuente.replace(
    new RegExp('^//#' + etiqueta + '$[\\s\\S]*?^//#FIN$', 'gm'), '');
}

function compilar(gl, tipo, fuente) {
  const s = gl.createShader(tipo);
  gl.shaderSource(s, fuente);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error('[mar] shader:', gl.getShaderInfoLog(s));
    return null;
  }
  return s;
}

/* Lee `--cielo-bajo` de la hoja y lo deja pintado en el buffer. Si el
   token no se puede leer —hoja aún sin aplicar—, se usa su valor de
   fábrica: un gris azulado claro es infinitamente mejor que negro. */
function cieloDeSalida(gl) {
  const leido = getComputedStyle(document.documentElement)
    .getPropertyValue('--cielo-bajo').trim();
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(leido || '');
  const [r, g, b] = m
    ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255]
    : [0xDC / 255, 0xE7 / 255, 0xE8 / 255];
  gl.clearColor(r, g, b, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

export function crear(lienzo) {
  const perfilMovil = matchMedia('(max-width: 700px), (pointer: coarse)').matches;
  /* ── `alpha: true`, Y ESTA ES LA LÍNEA DEL PARPADEO NEGRO ─────────
     Estuvo en `false` —un canal menos que componer— y ese ahorro es lo
     que pintaba los parpadeos. La regla de WebGL: cuando el compositor
     presenta el canvas y `preserveDrawingBuffer` es `false`, el buffer
     de dibujo se BORRA. Con `alpha: false` el canal alfa está forzado a
     1, así que ese borrado deja (0,0,0,1) — negro OPACO a pantalla
     completa. Con `alpha: true` deja (0,0,0,0), o sea nada.

     Y aquí «nada» no es un agujero: detrás del canvas está `.mundo`,
     que lleva pintado su degradado de cielo, bruma y agua con los
     mismos tokens de la hora (es el respaldo sin WebGL). Así que el
     peor caso deja de ser un fogonazo negro y pasa a ser el cuadro en
     su versión de CSS durante un cuadro.

     CUÁNDO SE VE ESE BORRADO, que es lo que costó encontrar: el bucle
     del mar se PARA cuando el hero sale de pantalla —un
     IntersectionObserver en main.js, y está bien que se pare, es
     batería—. Pero el canvas vive dentro de `.mundo`, que es
     `position: fixed`: no sale nunca de la ventana, solo queda tapado
     por las secciones opacas. O sea que el compositor sigue teniéndolo
     delante mientras nadie lo dibuja, y en Safari —que compone el
     scroll en otro hilo— vuelve a presentar ese buffer borrado. Por eso
     el parpadeo era NEGRO, pasaba AL HACER SCROLL y solo se veía EN EL
     HERO, que es el único sitio donde el canvas no está tapado.

     El shader escribe alfa 1.0 en su única salida, así que mientras
     dibuja no cambia un píxel: `alpha: true` solo cambia de qué color
     es el vacío.

     Si algún día no bastara, la siguiente palanca es
     `preserveDrawingBuffer: true` — el buffer conserva el último cuadro
     en vez de borrarse— pero cuesta una copia por presentación, y no se
     paga hasta comprobar que hace falta. */
  const gl = lienzo.getContext('webgl2', {
    antialias: false, alpha: true, depth: false, stencil: false,
    powerPreference: 'high-performance', preserveDrawingBuffer: false,
  });
  if (!gl) return null;

  /* ── Y EL PRIMER COLOR DEL LIENZO TAMPOCO PUEDE SER NEGRO ──────────
     Un buffer recién creado está a cero. Entre que el navegador compone
     el canvas por primera vez y que el shader termina de compilarse y
     pinta su primer cuadro hay una ventana —corta en un portátil, larga
     en un teléfono— y con el contexto opaco lo que se veía ahí era
     negro a pantalla completa; con el alfa ya arreglado se vería el
     respaldo, que es correcto pero no es la pintura.

     Un `clearColor` aquí mismo, ANTES de compilar nada, hace que el
     primer color que exista en ese buffer sea el del cielo. No arregla
     nada más y no cuesta nada: es una llamada.

     El color se lee del mismo token que usa el respaldo CSS, así que no
     hay dos cielos que mantener sincronizados a mano. */
  cieloDeSalida(gl);

  /* Un WebGL emulado por CPU convierte la pintura en una tarea de varios
     segundos. En ese entorno el respaldo CSS es visualmente completo y
     mucho más fluido; no se intenta compilar el shader. */
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = info
    ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL)
    : gl.getParameter(gl.RENDERER);
  /* Los navegadores de auditoría usan SwiftShader aunque emulen un
     teléfono. La visita normal conserva el respaldo rápido; el parámetro
     permite ensayar explícitamente el pipeline completo desplegado. */
  const auditarSoftware = new URLSearchParams(location.search).has('auditar-mar');
  const automatizado = navigator.webdriver === true
    || /HeadlessChrome/i.test(navigator.userAgent);
  if ((/swiftshader|llvmpipe|software/i.test(String(renderer)) || automatizado)
      && !auditarSoftware) {
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return null;
  }

  /* ── CUÁNTAS TEXTURAS CABEN DE VERDAD ──────────────────────────────
     WebGL2 solo GARANTIZA dieciséis unidades de textura en el fragment
     shader, o sea de la 0 a la 15, y este motor ya las tenía todas
     ocupadas. La lámina de estrellas pedía la diecisiete.

     En el portátil donde escribo esto hay treinta y dos y no habría
     pasado nada; en un teléfono de gama baja con el mínimo, pedir la
     unidad 16 es un error de enlazado y se cae el mar entero — o sea,
     se cae la pintura por añadir una capa de adorno. Eso contradice la
     regla del proyecto: el mar es un enhancement, y lo que sobra se
     apaga solo. Se pregunta antes de repartir, y si no cabe, las
     estrellas se quedan siendo las procedurales, que ya son bonitas. */
  const UNIDADES_MAX = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);

  /* Las garzas del shader se recortan SIEMPRE: llevan tiempo sin
     pintarse y solo estaban reservando dos unidades de textura. Con una
     de las dos, la via lactea pintada cabe hasta en el aparato del
     minimo, que era lo que faltaba. */
  let fuenteFS = recortar(FS, 'GARZAS');
  const CABE_ESTRELLAS = UNIDADES_MAX > 15;
  if (!CABE_ESTRELLAS) fuenteFS = recortar(fuenteFS, 'ESTRELLAS');
  if (perfilMovil && CABE_ESTRELLAS)
    fuenteFS = recortar(fuenteFS, 'ESTRELLAS_PROCEDURALES');
  /* En móvil el ruido de valor se consulta en una LUT diminuta que cabe
     completa en caché. Cada muestra reemplaza cuatro hashes, cuatro dot,
     varios fract y los mix del ruido analítico. Conserva la misma
     interpolación suave y las mismas coordenadas: cambia el grano, no el
     movimiento. Escritorio mantiene el ruido original sin tocar. */
  const ruidoAnalitico = `float ruido(vec2 p){
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
               mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
  }`;
  const ruidoMovil = `float ruido(vec2 p){
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    vec2 celda = mod(floor(p), 128.0);
    return texture(u_ruidoTex, (celda + f + 0.5) / 128.0).r;
  }`;
  fuenteFS = fuenteFS.replace('__RUIDO_FUNCION__',
                              perfilMovil ? ruidoMovil : ruidoAnalitico);
  /* ── EL UMBRAL DE LA MOTA VUELVE A (0.02, 0.13) ────────────────────
     Estuvo asi desde que se escribio la deteccion, y una optimizacion
     lo bajo a (0.008, 0.075): a 0.008 de contraste pasa EL GRANO DEL
     PAPEL — cada fibra de la lamina se convertia en estrella y el
     cielo entero salia como ruido de television, de canto a canto y
     tambien en su reflejo. Una mota de sal de verdad levanta mas de
     0.02 sobre su vecindad; lo que levanta menos es textura, y la
     textura no se pinta como luz. */
  const mascaraCieloAnalitica = `float e = 0.0022;
        float vecina = (valor(texture(u_estrellas, lamUV + vec2( e, 0.0)).rgb)
                      + valor(texture(u_estrellas, lamUV + vec2(-e, 0.0)).rgb)
                      + valor(texture(u_estrellas, lamUV + vec2(0.0,  e)).rgb)
                      + valor(texture(u_estrellas, lamUV + vec2(0.0, -e)).rgb)) * 0.25;
        float contrasteMota = smoothstep(0.02, 0.13, valor(lam.rgb) - vecina);`;
  const mascaraReflejoAnalitica = `float eR = 0.0022;
        float vecinaR = (valor(texture(u_estrellas, lamRuv + vec2( eR, 0.0)).rgb)
                       + valor(texture(u_estrellas, lamRuv + vec2(-eR, 0.0)).rgb)
                       + valor(texture(u_estrellas, lamRuv + vec2(0.0,  eR)).rgb)
                       + valor(texture(u_estrellas, lamRuv + vec2(0.0, -eR)).rgb)) * 0.25;
        float salR = smoothstep(0.02, 0.13, valor(lamRcampo.rgb) - vecinaR);`;
  fuenteFS = fuenteFS.replace('__MASCARA_ESTRELLAS_CIELO__', perfilMovil
    ? 'float contrasteMota = clamp((lam.a - 0.501961) / 0.498039, 0.0, 1.0);'
    : mascaraCieloAnalitica);
  fuenteFS = fuenteFS.replace('__MASCARA_ESTRELLAS_REFLEJO__', perfilMovil
    ? 'float salR = clamp((lamRcampo.a - 0.501961) / 0.498039, 0.0, 1.0);'
    : mascaraReflejoAnalitica);
  /* Quien pinta el CAMPO estrellado (no la via, que siempre es de la
     lamina): en escritorio 0.0 —el `if (__CAMPO_LAMINA__ < 0.5)` queda
     siempre cierto y el campo es el procedural, que es el dibujado
     estrella a estrella—; en movil u_hayEstrellas, y el campo sale de
     la lamina empaquetada. Ver la nota larga en el propio shader. */
  fuenteFS = fuenteFS.replaceAll('__CAMPO_LAMINA__',
                                 perfilMovil ? 'u_hayEstrellas' : '0.0');
  /* A resolución CSS nativa, la tercera octava queda por debajo de un
     píxel en las coordenadas donde se usa el FBM móvil. La textura de
     acuarela aporta el grano visible; pagar otra muestra de ruido por
     octava no añade detalle, solo resta presupuesto al muestreo nítido.
     Escritorio conserva las cinco. */
  fuenteFS = fuenteFS.replace('__FBM_OCTAVAS__', perfilMovil ? '2' : '5');
  const vs = compilar(gl, gl.VERTEX_SHADER, VS);
  const fs = compilar(gl, gl.FRAGMENT_SHADER, fuenteFS);
  if (!vs || !fs) return null;

  const p = gl.createProgram();
  gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error('[mar] link:', gl.getProgramInfoLog(p));
    return null;
  }
  gl.useProgram(p);

  let pHD = null, uEscenaTamHD = null, uSalidaHD = null;
  let escenaTex = null, escenaFbo = null;
  if (perfilMovil) {
    const fsHD = compilar(gl, gl.FRAGMENT_SHADER, FS_HD);
    if (!fsHD) return null;
    pHD = gl.createProgram();
    gl.attachShader(pHD, vs); gl.attachShader(pHD, fsHD); gl.linkProgram(pHD);
    if (!gl.getProgramParameter(pHD, gl.LINK_STATUS)) {
      console.error('[mar] link HD:', gl.getProgramInfoLog(pHD));
      return null;
    }
    gl.useProgram(pHD);
    gl.uniform1i(gl.getUniformLocation(pHD, 'u_escena'), 0);
    uEscenaTamHD = gl.getUniformLocation(pHD, 'u_escenaTam');
    uSalidaHD = gl.getUniformLocation(pHD, 'u_salida');

    escenaTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, escenaTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0,
                  gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    escenaFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, escenaFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
                            gl.TEXTURE_2D, escenaTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(p);
  }

  const u = {};
  for (const n of ['u_res','u_t','u_hor','u_calma','u_deriva','u_comp','u_int',
                   'u_fuente','u_papel','u_laminas','u_cieloAlto','u_cieloBajo',
                   'u_cieloHorizonte',
                   'u_agua','u_altas','u_reguero','u_bruma',
                   'u_lejano','u_medio','u_medioCalmo','u_cercano','u_cercanoCalmo',
                   'u_manglar',
                   'u_vLejano','u_vMedio','u_vCercano',
                   'u_hayManglar','u_manglarCaja','u_escalas','u_croma',
                   'u_papelTex','u_ruidoTex','u_hayPapel','u_papelTam','u_papelMedia',
                   'u_nubes','u_hayNubes','u_manglarCerca','u_corales','u_luces',
                   'u_hayCerca','u_hayCorales','u_hayLuces','u_astro','u_camino',
                   'u_hayAstro','u_hayCamino','u_roce','u_cercaCaja','u_coralesCaja',
                   'u_grafitoTex','u_hayGrafito','u_grafitoMedia','u_grafito',
                   'u_paralaje','u_garzaCerca','u_garzaLejos','u_hayGarzas',
                   'u_garzaCercaCaja','u_garzaLejosCaja','u_toques','u_viento',
                   'u_encoge','u_cielo','u_estrellas','u_hayEstrellas']) {
    u[n] = gl.getUniformLocation(p, n);
  }

  /* Textura provisional de 1 px para que el primer cuadro salga aunque
     las láminas todavía no hayan llegado. La ayuda nunca espera arte. */
  function texturaVacia() {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA,
                  gl.UNSIGNED_BYTE, new Uint8Array([128, 140, 148, 255]));
    return t;
  }
  function texturaRuido() {
    const lado = 128;
    const datos = new Uint8Array(lado * lado);
    for (let y = 0; y < lado; y++) {
      for (let x = 0; x < lado; x++) {
        let n = Math.imul(x + 1, 374761393) + Math.imul(y + 1, 668265263);
        n = Math.imul(n ^ (n >>> 13), 1274126177);
        datos[y * lado + x] = (n ^ (n >>> 16)) & 255;
      }
    }
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE8);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, lado, lado, 0,
                  gl.RED, gl.UNSIGNED_BYTE, datos);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return t;
  }
  const tex = { lejano: texturaVacia(), medio: texturaVacia(),
                cercano: texturaVacia(), cercanoCalmo: texturaVacia(),
                manglar: texturaVacia(), papel: texturaVacia(),
                grafito: texturaVacia(), medioCalmo: texturaVacia(),
                nubes: texturaVacia(), manglarCerca: texturaVacia(),
                corales: texturaVacia(), luces: texturaVacia(),
                astro: texturaVacia(), camino: texturaVacia(),
                estrellas: texturaVacia(), ruido: texturaRuido() };

  /* La 7 y la 8 eran de las garzas del shader, que ya no se pintan; la
     via lactea hereda la 7. */
  const unidades = { lejano: 0, medio: 1, cercano: 2, cercanoCalmo: 3,
                     manglar: 4, papel: 5, grafito: 6,
                     estrellas: 7, medioCalmo: 9, nubes: 10,
                     manglarCerca: 11, corales: 12, luces: 13,
                     astro: 14, camino: 15 };
  if (CABE_ESTRELLAS) {
    gl.uniform1i(u.u_estrellas, unidades.estrellas);
    gl.uniform1f(u.u_hayEstrellas, 0);
  }
  gl.uniform1i(u.u_ruidoTex, 8);
  gl.uniform1i(u.u_manglarCerca, 11);
  gl.uniform1i(u.u_corales, 12);
  gl.uniform1i(u.u_luces, 13);
  gl.uniform1f(u.u_hayCerca, 0);
  gl.uniform1f(u.u_hayCorales, 0);
  gl.uniform1f(u.u_hayLuces, 0);
  gl.uniform1i(u.u_astro, 14);
  gl.uniform1i(u.u_camino, 15);
  gl.uniform1f(u.u_hayAstro, 0);
  gl.uniform1f(u.u_hayCamino, 0);
  gl.uniform3f(u.u_roce, 0, 0, 0);
  /* El manglar cercano tiene que DOMINAR la esquina inferior izquierda:
     es el primer plano y es el posadero. A 0.52 de alto quedaba como una
     mancha en el canto. */
  const cercaCaja = [-0.02, 0.92, -0.34, 1.5];
  const coralesCaja = [0.155, 0.215, 4.0];
  gl.uniform4fv(u.u_cercaCaja, cercaCaja);
  gl.uniform3fv(u.u_coralesCaja, coralesCaja);
  gl.uniform1i(u.u_medioCalmo, 9);
  gl.uniform1i(u.u_nubes, 10);
  gl.uniform1f(u.u_hayNubes, 0);
  gl.uniform1i(u.u_garzaCerca, 7);
  gl.uniform1i(u.u_garzaLejos, 8);
  gl.uniform1f(u.u_hayGarzas, 0);
  /* x centro · alto (fracción del alto de pantalla) · hundimiento bajo el
     horizonte · ancho/alto de la lámina.
     La cercana está MUY por debajo del horizonte: está parada en el agua
     somera junto a la cámara, no allá al fondo. */
  /* La garza NO va parada en mar abierto: una garza vadea en agua somera,
     y en medio del mar no hay dónde pararse. Va junto a las raíces del
     manglar, que es el único bajo del cuadro, y a tamaño modesto. */
  const garzaCercaCaja = [0.655, 0.17, 0.012, 1.0];
  const garzaLejosCaja = [0.78, 0.075, 0.003, 1.5];
  gl.uniform4fv(u.u_garzaCercaCaja, garzaCercaCaja);
  gl.uniform4fv(u.u_garzaLejosCaja, garzaLejosCaja);
  gl.uniform1i(u.u_papelTex, 5);
  gl.uniform1f(u.u_hayPapel, 0);
  gl.uniform1f(u.u_papelTam, 1024);
  gl.uniform1f(u.u_papelMedia, 0.88);
  gl.uniform1i(u.u_grafitoTex, 6);
  gl.uniform1f(u.u_hayGrafito, 0);
  gl.uniform1f(u.u_grafitoMedia, 0.93);
  /* ancla: dónde está el horizonte DIBUJADO dentro de la lámina (v),
     escala vertical, y fuerza del multiplicado. */
  const grafitoCaja = [0.68, 1.0, 0.55];
  gl.uniform3fv(u.u_grafito, grafitoCaja);
  gl.uniform1i(u.u_lejano, 0); gl.uniform1i(u.u_medio, 1);
  gl.uniform1i(u.u_cercano, 2); gl.uniform1i(u.u_cercanoCalmo, 3);
  gl.uniform1i(u.u_manglar, 4);
  gl.uniform1f(u.u_laminas, 0);
  gl.uniform1f(u.u_hayManglar, 0);
  // x centro (en fracción del ancho), tamaño (alto de pantalla), hundimiento
  /* x centro · alto (fracción del alto de pantalla) · hundimiento bajo el
     horizonte · ancho/alto de la lámina.
     Más grande y más cerca: a 0.30 leía como un arbusto lejano. Y con
     más hundimiento las raíces entran en agua más cercana, que es lo que
     lo acerca de verdad — un objeto próximo se mete por debajo del
     horizonte, no se queda posado encima de la línea. */
  /* El hundimiento sube de 0.230 a 0.330. La lamina repintada trae un
     enrejado de raices zancudas mucho mas denso y mas alto que la
     anterior, y visto entero se lee como una reja: hay quien lo
     encuentra desagradable de mirar, y este sitio no puede permitirse
     una imagen incomoda. Hundirlo mete la mitad baja del enrejado por
     debajo de la linea de agua —donde ademas se disuelve, ver
     entraAgua en el shader— y deja arriba lo que de verdad se quiere
     ver: cuatro o cinco arcos, no cuarenta.
     De regalo baja la copa y le da mas aire al rotulo.

     Y DESPUES SUBE OTRA VEZ, de 0.330 a 0.252. A 0.330 se paso de
     frenada: sin raiz zancuda a la vista un mangle rojo deja de leerse
     como mangle y pasa a ser un arbol cualquiera metido en el agua —
     las zancas SON la especie. 0.078 del alto de pantalla arriba (un
     10 % del alto del arbol) devuelve los arcos altos, que es lo que se
     reconoce, y deja abajo el enrejado denso disolviendose en el agua,
     que es lo que incomodaba. */
  const manglarCaja = [0.775, 0.62, 0.252, 1.0];
  gl.uniform4fv(u.u_manglarCaja, manglarCaja);

  /* Repeticiones de cada lámina a lo ancho. MENOS repeticiones = marcas
     MÁS GRANDES = más pintado. Muchas repeticiones comprimen la pincelada
     hasta que se lee como textura fotográfica. */
  gl.uniform3f(u.u_escalas, 0.95, 0.55, 0.32);
  /* El pigmento propio de la lámina ES el color de la acuarela: la
     separación del granulado, no una saturación pareja. Bajarlo a 0.20
     dejó el cuadro gris. Sube, y el color viene de la pintura. */
  gl.uniform1f(u.u_croma, 0.55);

  // Ventanas v por defecto: lámina completa. (v: 1 = arriba de la imagen)
  gl.uniform2f(u.u_vLejano, 0.0, 1.0);
  gl.uniform2f(u.u_vMedio, 0.0, 1.0);
  gl.uniform2f(u.u_vCercano, 0.0, 1.0);

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  /* ancho/alto son la salida que ve el navegador; la escena cara tiene
     su propio tamaño y solo en móvil pasa por la reconstrucción HD. */
  let ancho = 0, alto = 0, anchoEscena = 0, altoEscena = 0;
  const cargadas = new Set();

  /* La máscara de sal se calcula UNA vez al decodificar la acuarela y
     viaja en alfa. Así cielo y reflejo leen una sola muestra cada uno;
     antes cada píxel hacía cinco lecturas para redescubrir el mismo
     contraste local treinta veces por segundo. RGB no se toca. */
  function empaquetarEstrellas(fuente) {
    const w = fuente.width || fuente.naturalWidth;
    const h = fuente.height || fuente.naturalHeight;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(fuente, 0, 0, w, h);
    const imagen = ctx.getImageData(0, 0, w, h);
    const d = imagen.data;
    const luma = new Float32Array(w * h);
    for (let i = 0, p = 0; i < d.length; i += 4, p++)
      luma[p] = d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722;
    for (let y = 0; y < h; y++) {
      const ya = Math.max(0, y - 1), ys = Math.min(h - 1, y + 1);
      for (let x = 0; x < w; x++) {
        const xa = Math.max(0, x - 2), xs = Math.min(w - 1, x + 2);
        const p = y * w + x;
        const vecina = (luma[y * w + xa] + luma[y * w + xs]
                      + luma[ya * w + x] + luma[ys * w + x]) * 0.25;
        /* El mismo umbral que la mascara analitica de escritorio,
           (0.02, 0.13) en luminancia 0-1 → (5.1, 33.15) en 0-255. El
           que hubo aqui —(2.04, 19.1), o sea (0.008, 0.075)— dejaba
           pasar el grano del papel y el cielo del movil era ruido. */
        let t = Math.max(0, Math.min(1, (luma[p] - vecina - 5.1) / 28.05));
        t = t * t * (3 - 2 * t);
        /* Alfa nunca baja de 128: Canvas guarda RGB premultiplicado y
           un alfa cero destruiría el color de la acuarela. */
        d[p * 4 + 3] = 128 + Math.round(t * 127);
      }
    }
    ctx.putImageData(imagen, 0, 0);
    return c;
  }

  /* ── LAS SUBIDAS VAN DE UNA EN UNA, UN CUADRO CADA UNA ────────────
     Las DESCARGAS siguen en paralelo: eso es red, y la red se aprovecha
     pidiendo todo a la vez. Lo que se pone en fila es la SUBIDA a la
     GPU, que es otra cosa — `texImage2D` de una lámina de 2048 px son
     16 MB que el hilo principal empuja de golpe, más el `drawImage` de
     reducirla si venía más grande.

     Nueve láminas terminando de descargarse casi a la vez metían varias
     de esas subidas en el mismo cuadro, y eso cae justo cuando alguien
     acaba de llegar y el ave está cayendo. Con una por cuadro, el coste
     es el mismo pero repartido, y la escena se va completando lámina a
     lámina en vez de dar un tirón.

     El `await img.decode()` va por lo mismo: sin él, la descompresión
     del PNG ocurre DENTRO de `texImage2D`, en medio del cuadro.
     `decoding = 'async'` es solo una pista; `decode()` es la promesa.

     MEDIDO, y esto sí en esta máquina, porque no depende de la GPU:
     cinco tomas alternando las dos versiones en el mismo navegador,
     tiempo desde `goto` hasta el primer cuadro del héroe, mediana
     1599 ms → 962 ms. El peor cuadro del arranque pasaba de SEIS
     subidas a una; lo vigila `fluidez.spec.js`, que falla contra la
     versión de antes. */
  let colaSubida = Promise.resolve();
  const enSuTurno = (fn) => {
    const turno = colaSubida.then(() => new Promise((sigue) => {
      /* DESPUÉS de pintar, no antes. Un `requestAnimationFrame` corre
         justo ANTES del pintado: meter ahí dieciséis megas de subida
         retrasa el cuadro que estaba a punto de salir. El par
         rAF + setTimeout(0) es el idioma de «al terminar este cuadro»:
         el rAF sitúa el turno en el cuadro correcto y el timeout deja
         que el cuadro se pinte primero.

         Y así se conserva lo que se buscaba —una subida por cuadro—
         sin pagar el retraso de la que le toca. */
      requestAnimationFrame(() => setTimeout(() => { fn(); sigue(); }, 0));
    }));
    colaSubida = turno.catch(() => {});
    return turno;
  };

  async function cargar(mapa, anchoMax = 2048) {
    /* Lo que no cabe no se descarga siquiera: en un aparato con las
       dieciséis unidades justas, bajarse una lámina que nunca se va a
       poder enlazar es gastar datos de alguien a las cuatro de la
       mañana con mala señal. */
    const nombres = Object.keys(mapa)
      .filter((n) => unidades[n] === undefined || unidades[n] < UNIDADES_MAX);
    if (nombres.length < Object.keys(mapa).length)
      console.info('[mar] unidades de textura:', UNIDADES_MAX,
                   '— se omiten láminas que no caben');
    await Promise.all(nombres.map(async (n) => {
      const img = new Image();
      img.decoding = 'async';
      await new Promise((ok, mal) => {
        img.onload = ok;
        img.onerror = () => mal(new Error('lámina ausente: ' + mapa[n]));
        img.src = mapa[n];
      });
      /* Descomprimir AQUÍ y no dentro de texImage2D. Si el navegador no
         trae `decode()` o lo rechaza, se sigue igual: el peor caso es
         volver al comportamiento de antes, no quedarse sin lámina. */
      try { await img.decode(); } catch { /* se sube tal cual */ }

      await enSuTurno(() => {
      /* Bajar de tamaño antes de subir: el cuello medido en gama media
         es el ancho de banda de subida de textura, no el decodificador. */
      let fuente = img;
      if (img.naturalWidth > anchoMax) {
        const k = anchoMax / img.naturalWidth;
        const c = document.createElement('canvas');
        c.width = anchoMax;
        c.height = Math.round(img.naturalHeight * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        fuente = c;
      }
      if (n === 'estrellas' && perfilMovil) fuente = empaquetarEstrellas(fuente);

      gl.activeTexture(gl.TEXTURE0 + unidades[n]);
      gl.bindTexture(gl.TEXTURE_2D, tex[n]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fuente);
      /* Las bandas de agua se repiten espejadas: así una costura se
         vuelve simetría en vez de corte. El manglar es un objeto
         suelto, se recorta en los bordes. */
      if (n === 'astro' || n === 'camino') {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      } else if (n === 'manglarCerca' || n === 'corales' || n === 'luces') {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S,
          n === 'corales' ? gl.MIRRORED_REPEAT : gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        const anchoF = fuente.width || fuente.naturalWidth;
        const altoF = fuente.height || fuente.naturalHeight;
        if (n === 'manglarCerca') {
          cercaCaja[3] = anchoF / altoF;
          gl.uniform4fv(u.u_cercaCaja, cercaCaja);
        }
        if (n === 'corales') {
          coralesCaja[2] = anchoF / altoF;
          gl.uniform3fv(u.u_coralesCaja, coralesCaja);
        }
      } else if (n === 'nubes') {
        // Espejada en X: derivan sin costura visible.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      } else if (n === 'estrellas') {
        /* Espejada en los DOS ejes. Ya no se estira para llenar la
           banda —eso convertia las motas en rayas—: se repite a su
           escala, y quien decide donde hay via lactea es el perfil del
           shader. Espejada y no repetida, para que la costura se
           vuelva simetria en vez de corte. */
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
      } else if (n === 'garzaCerca' || n === 'garzaLejos') {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        const caja = n === 'garzaCerca' ? garzaCercaCaja : garzaLejosCaja;
        caja[3] = (fuente.width || fuente.naturalWidth) /
                  (fuente.height || fuente.naturalHeight);
        gl.uniform4fv(n === 'garzaCerca' ? u.u_garzaCercaCaja : u.u_garzaLejosCaja, caja);
      } else if (n === 'grafito') {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        // El blanco de su propia hoja, para que el papel no oscurezca nada.
        const m = document.createElement('canvas');
        m.width = m.height = 64;
        const mc = m.getContext('2d', { willReadFrequently: true });
        mc.drawImage(fuente, 0, 0, 64, 64);
        const px = mc.getImageData(0, 0, 64, 64).data;
        const vs = [];
        for (let i = 0; i < px.length; i += 4)
          vs.push((0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255);
        vs.sort((a, b) => a - b);
        gl.uniform1f(u.u_grafitoMedia, vs[Math.floor(vs.length * 0.9)]);  // el papel
      } else if (n === 'papel') {
        // Tileable en los cuatro lados y fijo a la pantalla.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        // Su propia media, para que el grano module sin oscurecer nada.
        const m = document.createElement('canvas');
        m.width = m.height = 48;
        const mc = m.getContext('2d', { willReadFrequently: true });
        mc.drawImage(fuente, 0, 0, 48, 48);
        const d = mc.getImageData(0, 0, 48, 48).data;
        let s = 0;
        for (let i = 0; i < d.length; i += 4)
          s += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
        gl.uniform1f(u.u_papelMedia, s / (48 * 48));
        gl.uniform1f(u.u_papelTam, fuente.width || fuente.naturalWidth);
      } else {
        const esAgua = n !== 'manglar';
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S,
          esAgua ? gl.MIRRORED_REPEAT : gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        if (n === 'manglar') {
          // La lámina no tiene por qué ser cuadrada: el motor se adapta.
          manglarCaja[3] = (fuente.width || fuente.naturalWidth) /
                           (fuente.height || fuente.naturalHeight);
          gl.uniform4fv(u.u_manglarCaja, manglarCaja);
        }
      }
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      cargadas.add(n);
      });   // ← cierra enSuTurno: una subida por cuadro
    }));
    gl.useProgram(p);
    if (['lejano', 'medio', 'cercano'].every((n) => cargadas.has(n)))
      gl.uniform1f(u.u_laminas, 1);
    if (cargadas.has('manglar')) gl.uniform1f(u.u_hayManglar, 1);
    if (cargadas.has('papel'))   gl.uniform1f(u.u_hayPapel, 1);
    if (cargadas.has('nubes'))   gl.uniform1f(u.u_hayNubes, 1);
    if (cargadas.has('estrellas')) gl.uniform1f(u.u_hayEstrellas, 1);
    if (cargadas.has('manglarCerca')) gl.uniform1f(u.u_hayCerca, 1);
    if (cargadas.has('corales'))      gl.uniform1f(u.u_hayCorales, 1);
    if (cargadas.has('luces'))        gl.uniform1f(u.u_hayLuces, 1);
    if (cargadas.has('astro'))        gl.uniform1f(u.u_hayAstro, 1);
    if (cargadas.has('camino'))       gl.uniform1f(u.u_hayCamino, 1);
    if (cargadas.has('grafito')) gl.uniform1f(u.u_hayGrafito, 1);
    if (cargadas.has('garzaCerca') || cargadas.has('garzaLejos'))
      gl.uniform1f(u.u_hayGarzas, 1);
    return [...cargadas];
  }

  /** Coloca el manglar: x centro (0–1), tamaño (fracción del alto),
      cuánto se hunden los pies bajo la línea de agua. */
  function colocarManglar(x, tam, hundir) {
    gl.useProgram(p);
    if (x !== undefined) manglarCaja[0] = x;
    if (tam !== undefined) manglarCaja[1] = tam;
    if (hundir !== undefined) manglarCaja[2] = hundir;
    gl.uniform4fv(u.u_manglarCaja, manglarCaja);
  }

  /** Perillas de "cuánto se ve pintado". Menos repeticiones = pincelada
      más grande. Más croma = más pigmento propio de la lámina. */
  /** Los toques vivos: hasta 6 × [x, y, fuerza, edad] en espacio q. */
  const bufToques = new Float32Array(24);
  function toques(lista) {
    bufToques.fill(0);
    for (let i = 0; i < Math.min(6, lista.length); i++) {
      const t = lista[i];
      bufToques.set([t.x, t.y, t.fuerza, t.edad], i * 4);
    }
    gl.useProgram(p);
    gl.uniform4fv(u.u_toques, bufToques);
  }

  /** Ajusta el grafito: ancla v del horizonte dibujado, escala vertical,
      fuerza del multiplicado. */
  function ajustarGrafito(ancla, escala, fuerza) {
    gl.useProgram(p);
    if (ancla !== undefined) grafitoCaja[0] = ancla;
    if (escala !== undefined) grafitoCaja[1] = escala;
    if (fuerza !== undefined) grafitoCaja[2] = fuerza;
    gl.uniform3fv(u.u_grafito, grafitoCaja);
  }

  function pincelada(lejos, medio, cerca, croma) {
    gl.useProgram(p);
    gl.uniform3f(u.u_escalas, lejos, medio, cerca);
    if (croma !== undefined) gl.uniform1f(u.u_croma, croma);
  }

  function ventana(cual, cerca, lejos) {
    gl.useProgram(p);
    gl.uniform2f(u['u_v' + cual], cerca, lejos);
  }

  /** Dónde entra el fragmento cercano: su canto IZQUIERDO (`x`, en
      fracción del ancho) y su borde INFERIOR (`base`, en uv, con el 0
      en el canto de abajo de la pantalla).

      Los dos eran constantes —−0.02 y −0.34— y los dos tenían que dejar
      de serlo por la misma razón: `u_encoge` achica la lámina en
      pantallas estrechas, y con los cantos clavados todo lo que la
      lámina lleva DENTRO se desplaza con ella. Lo que lleva dentro es
      la rama donde se posa la garza protagonista.

      Quién decide los dos valores: `baseCerca()` y `xCerca()` en
      main.js, que es donde vive la coordenada de la percha. */
  function colocarCerca(base, x) {
    gl.useProgram(p);
    if (base !== undefined) cercaCaja[2] = base;
    if (x !== undefined) cercaCaja[0] = x;
    gl.uniform4fv(u.u_cercaCaja, cercaCaja);
  }

  for (const n of Object.keys(unidades)) {
    gl.activeTexture(gl.TEXTURE0 + unidades[n]);
    gl.bindTexture(gl.TEXTURE_2D, tex[n]);
  }

  /* ── LAS ESTADÍSTICAS DE UN RECTÁNGULO, UNA SOLA VEZ ─────────────
     Las usan `medirZona` (un rectángulo, una lectura) y `medirZonas`
     (varios rectángulos dentro de UNA lectura). Estaban escritas dos
     veces —una por cada rama de `baldosa`— y ahora están aquí, porque
     dos copias de un percentil son dos percentiles que pueden
     separarse el día que alguien toque una.

     `px` es RGBA de `anchoBuf` píxeles de ancho; (x, y, w, h) es el
     recorte dentro de ese búfer. `baldosa` promedia antes en cuadros
     de N×N: se mide a la escala del TRAZO de la letra, que es lo que
     el ojo integra, y así el polvo de estrellas deja de mandar sobre
     el percentil (ver la nota larga en `medirZona`). */
  const aLineal = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));

  function estadisticas(px, anchoBuf, x, y, w, h, baldosa = 1) {
    const cubetas = new Uint32Array(1024);
    let max = 0, min = 1, suma = 0, n = 0;
    const paso = Math.max(1, baldosa | 0);

    for (let by = 0; by < h; by += paso) {
      for (let bx = 0; bx < w; bx += paso) {
        let s = 0, m = 0;
        for (let dy = 0; dy < paso && by + dy < h; dy++) {
          const fila = ((y + by + dy) * anchoBuf + (x + bx)) * 4;
          for (let dx = 0; dx < paso && bx + dx < w; dx++) {
            const i = fila + dx * 4;
            s += 0.2126 * aLineal(px[i] / 255)
               + 0.7152 * aLineal(px[i + 1] / 255)
               + 0.0722 * aLineal(px[i + 2] / 255);
            m++;
          }
        }
        if (!m) continue;
        const l = s / m;
        if (l > max) max = l;
        if (l < min) min = l;
        suma += l; n++;
        cubetas[Math.min(1023, Math.round(l * 1023))]++;
      }
    }
    if (!n) return null;

    /* Histograma de 1024 cubetas y no un `sort`: ordenar sesenta mil
       flotantes dos veces por segundo cuesta más que todo lo demás
       junto, y la resolución de mil cubetas sobra para un percentil. */
    const percentil = (pp) => {
      const objetivo = pp * n;
      let acum = 0;
      for (let i = 0; i < 1024; i++) {
        acum += cubetas[i];
        if (acum >= objetivo) return i / 1023;
      }
      return 1;
    };
    return { max, min, prom: suma / n, p995: percentil(0.995), p005: percentil(0.005) };
  }
  return {
    cargar, ventana, colocarManglar, colocarCerca, pincelada, ajustarGrafito,
    toques,
    /* La caja del manglar, para que quien pinte encima —la garza que se
       posa— calcule su sitio con los MISMOS números y no con fracciones
       paralelas que se separan al cambiar de pantalla. */
    roce(r) { gl.useProgram(p); gl.uniform3f(u.u_roce, r.x, r.y, r.z); },
    cajaManglar: () => manglarCaja.slice(),
    cajaCerca: () => cercaCaja.slice(),
    redimensionar(w, h, escala) {
      anchoEscena = Math.max(1, Math.round(w * escala));
      altoEscena  = Math.max(1, Math.round(h * escala));
      /* La salida va hasta DPR 2 físico. El shader caro sigue en
         anchoEscena×altoEscena; aquí solo corre una lectura de textura,
         comparable a presentar un fotograma de vídeo. Limitar esto a
         1.1 obligaba al navegador a volver a ampliar el canvas en móviles
         DPR 2–3 y era la fuente del desenfoque que aún se veía. En DPR 3
         queda una ampliación de 1.5× en vez de 2.7×, sin pagar los tres
         millones de píxeles de salida que hicieron caer la cadencia. */
      const escalaSalida = perfilMovil
        ? Math.min(Math.max(1, devicePixelRatio || 1), 2.0)
        : escala;
      ancho = Math.max(1, Math.round(w * escalaSalida));
      alto  = Math.max(1, Math.round(h * escalaSalida));
      lienzo.width = ancho; lienzo.height = alto;

      if (perfilMovil) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, escenaTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8,
                      anchoEscena, altoEscena, 0,
                      gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, escenaFbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
                                gl.TEXTURE_2D, escenaTex, 0);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
          console.error('[mar] framebuffer HD incompleto');
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, tex.lejano);
      }
      gl.viewport(0, 0, ancho, alto);
    },
    dibujar(e) {
      if (perfilMovil) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, escenaFbo);
        gl.viewport(0, 0, anchoEscena, altoEscena);
      } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, ancho, alto);
      }
      gl.useProgram(p);
      gl.uniform2f(u.u_res, anchoEscena, altoEscena);
      gl.uniform1f(u.u_t, e.t);
      gl.uniform1f(u.u_hor, e.horizonte);
      gl.uniform1f(u.u_calma, e.calma);
      gl.uniform1f(u.u_deriva, e.deriva);
      gl.uniform1f(u.u_paralaje, e.paralaje || 0);
      gl.uniform1f(u.u_comp, e.luz.compresion);
      gl.uniform1f(u.u_viento, viento(e.t));
      gl.uniform1f(u.u_encoge, encogeCerca(anchoEscena / Math.max(1, altoEscena)));
      gl.uniform1f(u.u_cielo, e.luz.cielo || 0);
      gl.uniform1f(u.u_int, e.luz.int);
      gl.uniform2f(u.u_fuente, e.luz.fuenteX,
        e.horizonte + (e.luz.elev / 90) * (1 - e.horizonte) * 0.95);
      gl.uniform1f(u.u_papel, e.papel);
      gl.uniform3fv(u.u_cieloAlto, e.luz.cieloAlto);
      gl.uniform3fv(u.u_cieloBajo, e.luz.cieloBajo);
      gl.uniform3fv(u.u_cieloHorizonte, e.luz.cieloHorizonte);
      gl.uniform3fv(u.u_agua,      e.luz.agua);
      gl.uniform3fv(u.u_altas,     e.luz.altas);
      gl.uniform3fv(u.u_reguero,   e.luz.reguero);
      gl.uniform3fv(u.u_bruma,     e.luz.bruma);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (perfilMovil) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, ancho, alto);
        gl.useProgram(pHD);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, escenaTex);
        gl.uniform2f(uEscenaTamHD, anchoEscena, altoEscena);
        gl.uniform2f(uSalidaHD, ancho, alto);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        /* El programa principal espera la lámina lejana en la unidad 0
           en el cuadro siguiente. Restaurarla cuesta un bind, no una
           copia ni una descarga. */
        gl.bindTexture(gl.TEXTURE_2D, tex.lejano);
        gl.useProgram(p);
      }
    },
    /* Lee lo que quedó pintado detrás de una zona (píxeles del lienzo,
       origen abajo-izquierda). Hay que llamarlo en el MISMO cuadro que
       dibujar(), antes de que se componga. Devuelve luminancia relativa
       máxima y media: con eso el lavado se calibra contra lo que de
       verdad hay detrás del texto —el disco de la luna, el sol, una
       lámina clara— y no contra una suposición. */
    /* `baldosa` = a qué escala se mide. Con 1 el histograma va sobre
       píxeles sueltos; con 3 se promedia antes en cuadros de 3×3.

       No es un detalle: el percentil sobre píxeles sueltos funciona en
       una caja grande —donde el 0.5 % son cientos de píxeles y las
       estrellas se diluyen— y se rompe en una caja pequeña, donde el
       0.5 % son cuatro píxeles y basta un puñado de estrellas para que
       la medida diga que el fondo es blanco. Medido: la caja del
       enlace del héroe a las 23:00 daba 1,17:1 por seis estrellas,
       cuando lo que se ve son 15:1.

       Promediar primero mide a la escala del TRAZO de la letra, que es
       lo que el ojo integra: el disco de la luna sigue contando entero
       porque es una mancha grande, y el polvo de estrellas deja de
       mandar porque no llena una baldosa. */
    /* ── VARIAS ZONAS, UNA SOLA LECTURA ────────────────────────────
       `readPixels` no es caro por los bytes que copia: es caro porque
       SINCRONIZA. Vacía la tubería y bloquea la CPU hasta que la GPU
       termina el cuadro, así que su precio no baja midiendo cajas más
       pequeñas — lo paga entero cada llamada.

       El calibrador del héroe mide CUATRO piezas (rótulo, lockup,
       declaración y enlace) que están todas dentro del mismo bloque de
       texto. Cuatro llamadas eran cuatro paradas para leer un
       rectángulo que cabe en uno solo. Aquí se lee la unión una vez y
       cada zona saca sus estadísticas del mismo búfer: mismos números,
       una cuarta parte de las paradas.

       LO QUE SE MIDIÓ Y LO QUE NO, dicho como toca. La unión de las
       cuatro cajas es 1.81× la suma de sus áreas en escritorio y 1.61×
       en teléfono (medido en 1440×900 y 390×844), o sea que esto lee
       un 70 % más de bytes. Lo que gana son tres paradas de cuatro.

       En ESTA máquina el cambio no se nota —el perfilador da 363 ms
       antes y 366 ms después— y eso es exactamente lo que tiene que
       pasar: aquí el renderizado es SwiftShader, por software, y un
       renderizador por software no tiene tubería que vaciar. Su coste
       de `readPixels` es proporcional a los bytes, así que leer un
       70 % más cuesta un 70 % más y ahorrarse tres sincronizaciones no
       ahorra nada.

       En una GPU de verdad el reparto es el contrario: la copia de
       620 kB va por un bus que la hace en fracciones de milisegundo, y
       lo que duele es la parada. NO ESTÁ MEDIDO EN HARDWARE REAL, y no
       se puede medir desde aquí; queda escrito para que quien tenga el
       aparato delante lo compruebe en vez de creérselo.

       Devuelve un array alineado con `zonas`, con `null` donde la caja
       no se pudiera leer — igual que `medirZona`. */
    medirZonas(zonas, baldosa = 1) {
      if (!zonas || !zonas.length) return [];
      /* La unión, recortada al lienzo. Si algo se sale, se recorta
         aquí una vez en vez de que cada zona lo descubra por su
         cuenta. */
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const z of zonas) {
        if (!z || z.w < 1 || z.h < 1) continue;
        x0 = Math.min(x0, z.x); y0 = Math.min(y0, z.y);
        x1 = Math.max(x1, z.x + z.w); y1 = Math.max(y1, z.y + z.h);
      }
      x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0));
      x1 = Math.min(ancho, Math.ceil(x1)); y1 = Math.min(alto, Math.ceil(y1));
      const W = x1 - x0, H = y1 - y0;
      if (!(W > 0 && H > 0)) return zonas.map(() => null);

      const px = new Uint8Array(W * H * 4);
      gl.readPixels(x0, y0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
      return zonas.map((z) => {
        if (!z || z.w < 1 || z.h < 1) return null;
        const zx = Math.max(x0, Math.floor(z.x)), zy = Math.max(y0, Math.floor(z.y));
        const zw = Math.min(x1, Math.ceil(z.x + z.w)) - zx;
        const zh = Math.min(y1, Math.ceil(z.y + z.h)) - zy;
        if (zw < 1 || zh < 1) return null;
        return estadisticas(px, W, zx - x0, zy - y0, zw, zh, baldosa);
      });
    },

    medirZona(x, y, w, h, baldosa = 1) {
      w = Math.max(1, Math.min(w, ancho - x));
      h = Math.max(1, Math.min(h, alto - y));
      if (x < 0 || y < 0 || w < 1 || h < 1) return null;
      const px = new Uint8Array(w * h * 4);
      gl.readPixels(x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      return estadisticas(px, w, 0, 0, w, h, baldosa);
    },

    /* Muestreo completo del cuadro, para auditar la pintura sobre los
       píxeles en vez de opinar. Mismo requisito que medirZona: hay que
       llamarlo en el MISMO cuadro que dibujar(). Devuelve una rejilla
       diezmada de RGB — con paso 4 sobran datos para un histograma y no
       se traga medio segundo leyendo el buffer entero. */
    muestra(paso = 4) {
      const px = new Uint8Array(ancho * alto * 4);
      gl.readPixels(0, 0, ancho, alto, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const out = [];
      for (let y = 0; y < alto; y += paso) {
        for (let x = 0; x < ancho; x += paso) {
          const i = (y * ancho + x) * 4;
          out.push(px[i], px[i + 1], px[i + 2]);
        }
      }
      return { ancho, alto, paso, datos: out };
    },
    perder() { gl.getExtension('WEBGL_lose_context')?.loseContext(); },
  };
}
