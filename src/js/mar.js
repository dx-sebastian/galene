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

const VS = `#version 300 es
void main(){
  vec2 p = vec2((gl_VertexID == 1) ? 3.0 : -1.0,
                (gl_VertexID == 2) ? 3.0 : -1.0);
  gl_Position = vec4(p, 0.0, 1.0);
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
uniform float u_int;
uniform vec2  u_fuente;
uniform float u_papel;
uniform float u_laminas;    // 0 = procedural, 1 = pintura cargada
uniform vec3  u_cieloAlto, u_cieloBajo, u_agua, u_altas, u_reguero, u_bruma;

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
uniform float u_hayPapel, u_papelTam, u_papelMedia;
uniform sampler2D u_nubes;
uniform float u_hayNubes;
uniform sampler2D u_manglarCerca, u_corales, u_luces;
uniform sampler2D u_astro, u_camino;
uniform float u_hayAstro, u_hayCamino;
uniform float u_hayCerca, u_hayCorales, u_hayLuces;
uniform vec4  u_cercaCaja;      // x, alto, base, ancho/alto
uniform vec3  u_coralesCaja;    // alto, base, ancho/alto
uniform sampler2D u_grafitoTex;
uniform float u_hayGrafito, u_grafitoMedia;
uniform vec3  u_grafito;        // ancla v del horizonte dibujado, escala, fuerza
uniform sampler2D u_garzaCerca, u_garzaLejos;
uniform float u_hayGarzas;
uniform vec4  u_garzaCercaCaja; // x, alto, hundir, ancho/alto
uniform vec4  u_garzaLejosCaja;

#define TAU 6.28318530718

float hash(vec2 p){
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p + 19.19);
  return fract(p.x * p.y);
}
float ruido(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
             mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
}
float fbm(vec2 p){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++){ s += a * ruido(p); p *= 2.03; a *= 0.5; }
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
  float horX = u_hor
    + (fbm(vec2(q.x * 0.75 + 19.0, 2.6)) - 0.5) * 0.0135
    + (fbm(vec2(q.x * 1.7, 4.2)) - 0.5) * 0.0055
    + (ruido(vec2(q.x * 9.0, 1.1)) - 0.5) * 0.0016;

  /* ═══ CIELO ═══════════════════════════════════════════════════ */
  if (uv.y >= horX) {
    float gy = (uv.y - horX) / max(1.0 - horX, 0.001);
    gy = mix(0.5, gy, u_comp);              // compresión del crepúsculo
    col = mix(u_cieloBajo, u_cieloAlto, pow(gy, 0.85));

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
    reservaPapel = max(reservaPapel, (1.0 - smoothstep(0.02, 0.50, gy))
                           * bocaCielo * neutro * mix(0.20, 1.0, u_int) * 0.99);

    if (u_hayNubes > 0.5) {
      /* Nubes pintadas, en la mitad alta del cielo y derivando muy
         despacio — más lento que el agua, porque están más lejos.
         Se entintan con el cielo alto: una nube no tiene color propio,
         tiene el de la luz que la atraviesa. */
      float nv = (uv.y - horX) / max(1.0 - horX, 0.001);
      vec2 nu = vec2(q.x * 0.42 + u_deriva * 0.018, 1.0 - nv * 0.92);
      vec4 nb = texture(u_nubes, nu);
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
      vec3 sombraN = mix(u_cieloAlto, u_agua, 0.17) * 0.955;
      vec3 luzN    = mix(u_cieloAlto, mix(u_altas, u_reguero, 0.34), 0.62);
      vec3 pn = duotono(nb.rgb, sombraN, luzN);
      pn += (nb.rgb - vec3(valor(nb.rgb))) * u_croma * 0.18;
      col = mix(col, pn, nb.a * 0.46 * smoothstep(0.02, 0.30, nv));
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
        vec2 lu = vec2(q.x * 0.55 + u_deriva * 0.04,
                       1.0 - (uv.y - horX) / max(1.0 - horX, 0.001) * 2.6);
        vec4 tl = texture(u_luces, lu);
        float titila = 0.86 + 0.14 * sin(u_t * 0.9 + q.x * 31.0);
        col = mix(col, mix(col, tl.rgb, 0.9), tl.a * noche * titila * 0.85);
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
    vec2 f = vec2(u_fuente.x * aspecto, u_fuente.y);
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
      float lado = 0.17 * clamp(aspecto * 0.72, 0.52, 1.0);
      vec2 au = (q - f) / lado + 0.5;
      if (au.x > 0.0 && au.x < 1.0 && au.y > 0.0 && au.y < 1.0) {
        vec2 uu = vec2((au.x + floor(esSol + 0.5)) * 0.5, au.y);
        vec4 ta = texture(u_astro, uu);
        col = mix(col, u_reguero, ta.a * clamp(0.30 + 0.62 * u_int, 0.0, 0.94));
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
      float r = 0.115;
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
    float amp  = (1.0 - cn) * mix(0.0035, 0.055, pp) * (1.0 - aplanado * 0.92);
    float frec = mix(120.0, 9.0, pp);
    float vel  = mix(0.74, 0.33, pp);
    /* LA FASE VA CON RUIDO. Los dos terminos diagonales eran rejillas
       rectas cruzandose, y al subir la amplitud se veian como un galon
       de espiga repitiendose: el patron mecanico que mata cualquier
       sensacion de agua. Metiendoles una fase de periodo largo la trama
       deambula, nunca cierra un ciclo dentro de la pantalla, y se lee
       como oleaje en vez de como tejido. */
    float fase1 = fbm(vec2(q.x * 0.9 + 3.0, uv.y * 2.2)) * 7.0;
    float fase2 = fbm(vec2(q.x * 0.6 - 9.0, uv.y * 1.4 + 21.0)) * 9.0;
    float onda =
        sin((q.x + u_deriva * mix(0.05, 0.55, pp)) * frec        + u_t * vel) * 0.52
      + sin((q.x * 1.618 - uv.y * 13.0) * frec * 0.311 - u_t * vel * 1.37
            + fase1) * 0.31
      + sin((q.x * 0.734 + uv.y *  7.0) * frec * 0.157 + u_t * vel * 0.61
            + fase2) * 0.17;

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
    vec3 oscuro = mix(u_agua * 0.42, u_bruma * 0.30, 0.18);

    /* EL AGUA ES UN ESPEJO ANTES QUE UN CUERPO. Su extremo claro venia
       de una paleta propia (altas + bruma) que no miraba al cielo, y de
       noche eso daba un mar entre DOS Y CASI CUATRO VECES mas claro que
       el cielo: 3.68 a las 19:00. No es solo feo, es imposible — el agua
       refleja un cielo oscuro y ademas absorbe.

       Asi que el claro se topa contra el cielo del horizonte y se queda
       por debajo. El tope solo puede OSCURECER (max 1.0), asi que las
       horas de dia, que ya estaban bien, no se tocan. */
    vec3 claroBase = mix(u_altas, u_bruma, 0.42);
    /* El tope muerde de noche, que es donde estaba el problema, y de dia
       casi no: un mar de mediodia SI puede acercarse al cielo porque el
       cuerpo del agua dispersa luz propia; uno nocturno no, porque solo
       refleja. Medido despues: 0.85 de dia, 1.1 de noche. */
    float diaAgua = smoothstep(0.25, 0.85, u_int);
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
    float cresta = smoothstep(0.15, 0.75, onda * 0.5 + 0.5);
    float faceta = smoothstep(0.87, 0.965, valor(pintura)) * cresta;
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


    /* Devolver el pigmento propio de la lámina. El duotono puro aplana
       la separación de color del granulado, y esa separación es la
       mitad de lo que hace que algo lea acuarela en vez de fotografía. */
    col += croma(pintura, u_croma * 0.85, u_croma * 3.10);

    /* CRESTA FRIA, SENO CALIDO. Esto es lo que hace que un mar de
       acuarela se vea colorido sin estar saturado, y es ademas lo que
       pasa de verdad: la cara de la onda que mira arriba refleja el
       cielo y sale fria; el seno deja ver el cuerpo del agua y sale
       calido. Dos pigmentos que se separan, no un color mas fuerte.

       Y como va montado sobre la onda, subir el movimiento sube el
       color: las dos cosas son el mismo cambio. La saturacion media
       apenas se mueve; lo que crece es la VARIEDAD de matiz dentro de
       la misma aguada, que es de donde sale la sensacion de pintura. */
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
    col = mix(col, mix(col, tibio, 0.34), smoothstep(0.42, 0.14, aparta) * 0.58);

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
    float perdido = smoothstep(0.44, 0.58, fbm(vec2(q.x * 2.3 - 5.0, 8.3)));
    /* 0.46 era medio mar. Para perder el canto del horizonte ensanche
       la bruma hasta casi la mitad de la profundidad del agua, y eso
       dejo una franja de NIEBLA BLANCA alrededor de las raices a todas
       horas: el mar se veia lavado y el arbol flotando en vapor.
       El canto se pierde con un tramo estrecho; lo demas era exceso. */
    float anchoBruma = mix(0.020, 0.155, perdido);
    col = mix(u_bruma * 0.82, col,
              smoothstep(0.0, anchoBruma, prof) * 0.58 + 0.42);
    col = mix(col, col * 0.90, smoothstep(0.60, 1.0, prof));

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
        col = mix(col, u_reguero,
                  tr.a * u_int * mix(0.30, 0.72, cn) * mix(1.0, 0.45, prof));
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
    col = mix(col, mix(col, u_altas, 0.35), aplanado * 0.16);

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
        vec3 pc = mix(col, tc.rgb, 0.54);
        pc += (tc.rgb - vec3(valor(tc.rgb))) * u_croma * 0.42;
        /* Nunca una cinta continua: se desvanece por arriba —el corte
           recto se veía— y se abre en claros con una onda lenta, para
           que haya agua limpia entre las matas. La paz es el vacío. */
        /* La lámina nueva ya trae el vacío —cuatro matas y mucha arena—,
           así que no hay que abrirle claros por código: eso la borraba.
           Solo se desvanece por arriba, para que no haya canto recto. */
        /* El desvanecido va ARRIBA, donde acaban las hojas, no abajo,
           que es donde está la arena y tiene que estar sólida. */
        float entra = 1.0 - smoothstep(0.58, 1.0, cv);
        col = mix(col, pc, tc.a * mix(0.26, 0.62, profC) * entra * mix(0.62, 1.0, u_int));
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
  float brumaArriba = exp(-dHor / mix(0.022, 0.011, cn)) * step(horX, uv.y) * 0.55;
  float brumaAbajo  = exp(-dHor / mix(0.005, 0.002, cn)) * step(uv.y, horX) * 0.24;
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
    vec3 oscuroM = mix(vec3(0.155, 0.118, 0.086), u_agua * 0.35, 0.30);
    vec3 claroM  = mix(mix(u_bruma, u_altas, 0.30), vec3(0.72, 0.66, 0.54), 0.30) * 0.86;

    // Planta
    vec2 m = vec2((q.x - (cx - Sx * 0.5)) / Sx, (uv.y - base) / S);
    if (m.x > 0.0 && m.x < 1.0 && m.y > 0.0 && m.y < 1.0) {
      vec4 t = texture(u_manglar, m);
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
      vec3 tApagado = mix(t.rgb, vec3(valor(t.rgb)), calidoT * (1.0 - tramo) * 0.8);
      vec3 pm = duotono(tApagado, oscuroM, claroM);
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
      pm += croma(tApagado, u_croma * 0.22, u_croma * 0.78);
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
      float bajoAgua = smoothstep(0.0, 0.06, m.y);
      col = mix(col, pm, t.a * 0.92 * bajoAgua * (1.0 - niebla * 0.88));
    }

    /* El reflejo. A calma baja está partido en tajos; a calma alta el
       arco y su reflejo casi cierran un anillo, nunca del todo. Es la
       mecánica de Muñoz hecha geometría, y es una línea de shader. */
    float tajo = (ruido(vec2(uv.y * mix(70.0, 16.0, cn), u_t * 0.25)) - 0.5)
               * (1.0 - cn) * 0.07;
    vec2 r2 = vec2((q.x + tajo - (cx - Sx * 0.5)) / Sx, (base - uv.y) / S);
    if (r2.x > 0.0 && r2.x < 1.0 && r2.y > 0.0 && r2.y < 1.0 && uv.y < base) {
      vec4 t = texture(u_manglar, r2);
      float roto = step(0.34, ruido(vec2(uv.y * mix(95.0, 22.0, cn), 7.3)) + cn * 0.55);
      float desvanece = 1.0 - smoothstep(0.0, S * 1.25, base - uv.y);
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
      vec3 refl = mix(col * 0.66, oscuroM, 0.30);
      col = mix(col, refl,
                t.a * roto * desvanece * mix(0.30, 0.58, cn));
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
     El sitio nunca afirma quiénes son, y ninguna está en apuros. */
  if (u_hayGarzas > 0.5) {
    vec3 oscuroG = mix(vec3(0.11, 0.10, 0.10), u_agua * 0.40, 0.45);
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
        col = mix(col, duotono(t.rgb, oscuroG, claroG), t.a * 0.94);
      }
    }
  }

  /* ===== EL MANGLAR CERCANO ====================================
     Lo mas proximo del cuadro y lo ultimo que se pinta. No es paisaje:
     es donde se posa el ave protagonista. Por eso lleva su propio
     paralaje, el mas fuerte de todos: lo cercano se mueve mas. */
  if (u_hayCerca > 0.5) {
    /* En movil el fragmento cercano se comia la composicion: 0.92 del
       alto con la pantalla estrecha tapaba al protagonista. Se encoge
       con el aspecto — el primer termino enmarca, no tapa. */
    float encoge = mix(0.60, 1.0, smoothstep(0.62, 1.35, aspecto));
    float kAlto = u_cercaCaja.y * encoge, kAncho = kAlto * u_cercaCaja.w;
    /* Anclado por su BORDE IZQUIERDO: es un fragmento que entra por la
       esquina, no un objeto centrado. Con el centro se salía de cuadro
       en cuanto cambiaba la proporción de la ventana. */
    float kx = u_cercaCaja.x * aspecto - u_paralaje * 1.35;
    vec2 mc = vec2((q.x - kx) / kAncho, (uv.y - u_cercaCaja.z) / kAlto);
    if (mc.x > 0.0 && mc.x < 1.0 && mc.y > 0.0 && mc.y < 1.0) {
      vec4 tk = texture(u_manglarCerca, mc);
      /* La derecha se desvanece sola: la lámina trae ese final PINTADO.
         Pero su borde SUPERIOR sí lleva tinta hasta el canto, y ahí se
         veía la línea recta. Solo ese lado se ablanda, y ancho, para que
         no parezca niebla sino que se pierda por arriba de cuadro. */
      tk.a *= 1.0 - smoothstep(0.74, 1.0, mc.y);
      /* Subido de valor. A 0.085 era una silueta casi negra pegada al
         borde, con un salto de valor que no tenía nada que ver con el
         resto del cuadro: parecía recortada de otra pintura. Un primer
         término en acuarela es más oscuro que el fondo, sí, pero sigue
         siendo la misma aguada. */
      /* Sobrecorregi. De 0.085 —silueta casi negra, recortada de otro
         cuadro— lo subi a 0.165 y quedo una masa gris palida que lee como
         niebla. Un primer termino tiene que PESAR: es lo mas cercano al
         ojo y por tanto lo mas contrastado del cuadro. */
      vec3 oscuroC = mix(vec3(0.112, 0.106, 0.124), u_agua * 0.38, 0.35);
      vec3 claroC  = mix(u_bruma, u_altas, 0.30) * 0.88;
      vec3 pk = duotono(tk.rgb, oscuroC, claroC);
      pk += (tk.rgb - vec3(valor(tk.rgb))) * u_croma * 1.15;
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

export function crear(lienzo) {
  const gl = lienzo.getContext('webgl2', {
    antialias: false, alpha: false, depth: false, stencil: false,
    powerPreference: 'low-power', preserveDrawingBuffer: false,
  });
  if (!gl) return null;

  const vs = compilar(gl, gl.VERTEX_SHADER, VS);
  const fs = compilar(gl, gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return null;

  const p = gl.createProgram();
  gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error('[mar] link:', gl.getProgramInfoLog(p));
    return null;
  }
  gl.useProgram(p);

  const u = {};
  for (const n of ['u_res','u_t','u_hor','u_calma','u_deriva','u_comp','u_int',
                   'u_fuente','u_papel','u_laminas','u_cieloAlto','u_cieloBajo',
                   'u_agua','u_altas','u_reguero','u_bruma',
                   'u_lejano','u_medio','u_medioCalmo','u_cercano','u_cercanoCalmo',
                   'u_manglar',
                   'u_vLejano','u_vMedio','u_vCercano',
                   'u_hayManglar','u_manglarCaja','u_escalas','u_croma',
                   'u_papelTex','u_hayPapel','u_papelTam','u_papelMedia',
                   'u_nubes','u_hayNubes','u_manglarCerca','u_corales','u_luces',
                   'u_hayCerca','u_hayCorales','u_hayLuces','u_astro','u_camino',
                   'u_hayAstro','u_hayCamino','u_cercaCaja','u_coralesCaja',
                   'u_grafitoTex','u_hayGrafito','u_grafitoMedia','u_grafito',
                   'u_paralaje','u_garzaCerca','u_garzaLejos','u_hayGarzas',
                   'u_garzaCercaCaja','u_garzaLejosCaja','u_toques']) {
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
  const tex = { lejano: texturaVacia(), medio: texturaVacia(),
                cercano: texturaVacia(), cercanoCalmo: texturaVacia(),
                manglar: texturaVacia(), papel: texturaVacia(),
                grafito: texturaVacia(), garzaCerca: texturaVacia(),
                garzaLejos: texturaVacia(), medioCalmo: texturaVacia(),
                nubes: texturaVacia(), manglarCerca: texturaVacia(),
                corales: texturaVacia(), luces: texturaVacia(),
                astro: texturaVacia(), camino: texturaVacia() };

  const unidades = { lejano: 0, medio: 1, cercano: 2, cercanoCalmo: 3,
                     manglar: 4, papel: 5, grafito: 6,
                     garzaCerca: 7, garzaLejos: 8, medioCalmo: 9, nubes: 10,
                     manglarCerca: 11, corales: 12, luces: 13,
                     astro: 14, camino: 15 };
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
  const manglarCaja = [0.705, 0.62, 0.230, 1.0];
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

  let ancho = 0, alto = 0;
  const cargadas = new Set();

  async function cargar(mapa, anchoMax = 2048) {
    const nombres = Object.keys(mapa);
    await Promise.all(nombres.map(async (n) => {
      const img = new Image();
      img.decoding = 'async';
      await new Promise((ok, mal) => {
        img.onload = ok;
        img.onerror = () => mal(new Error('lámina ausente: ' + mapa[n]));
        img.src = mapa[n];
      });

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
          n === 'corales' ? gl.REPEAT : gl.CLAMP_TO_EDGE);
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
    }));
    gl.useProgram(p);
    if (['lejano', 'medio', 'cercano'].every((n) => cargadas.has(n)))
      gl.uniform1f(u.u_laminas, 1);
    if (cargadas.has('manglar')) gl.uniform1f(u.u_hayManglar, 1);
    if (cargadas.has('papel'))   gl.uniform1f(u.u_hayPapel, 1);
    if (cargadas.has('nubes'))   gl.uniform1f(u.u_hayNubes, 1);
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

  for (const n of Object.keys(unidades)) {
    gl.activeTexture(gl.TEXTURE0 + unidades[n]);
    gl.bindTexture(gl.TEXTURE_2D, tex[n]);
  }

  return {
    cargar, ventana, colocarManglar, pincelada, ajustarGrafito, toques,
    /* La caja del manglar, para que quien pinte encima —la garza que se
       posa— calcule su sitio con los MISMOS números y no con fracciones
       paralelas que se separan al cambiar de pantalla. */
    cajaManglar: () => manglarCaja.slice(),
    cajaCerca: () => cercaCaja.slice(),
    redimensionar(w, h, escala) {
      ancho = Math.max(1, Math.round(w * escala));
      alto  = Math.max(1, Math.round(h * escala));
      lienzo.width = ancho; lienzo.height = alto;
      gl.viewport(0, 0, ancho, alto);
    },
    dibujar(e) {
      gl.uniform2f(u.u_res, ancho, alto);
      gl.uniform1f(u.u_t, e.t);
      gl.uniform1f(u.u_hor, e.horizonte);
      gl.uniform1f(u.u_calma, e.calma);
      gl.uniform1f(u.u_deriva, e.deriva);
      gl.uniform1f(u.u_paralaje, e.paralaje || 0);
      gl.uniform1f(u.u_comp, e.luz.compresion);
      gl.uniform1f(u.u_int, e.luz.int);
      gl.uniform2f(u.u_fuente, e.luz.fuenteX,
        e.horizonte + (e.luz.elev / 90) * (1 - e.horizonte) * 0.95);
      gl.uniform1f(u.u_papel, e.papel);
      gl.uniform3fv(u.u_cieloAlto, e.luz.cieloAlto);
      gl.uniform3fv(u.u_cieloBajo, e.luz.cieloBajo);
      gl.uniform3fv(u.u_agua,      e.luz.agua);
      gl.uniform3fv(u.u_altas,     e.luz.altas);
      gl.uniform3fv(u.u_reguero,   e.luz.reguero);
      gl.uniform3fv(u.u_bruma,     e.luz.bruma);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    /* Lee lo que quedó pintado detrás de una zona (píxeles del lienzo,
       origen abajo-izquierda). Hay que llamarlo en el MISMO cuadro que
       dibujar(), antes de que se componga. Devuelve luminancia relativa
       máxima y media: con eso el lavado se calibra contra lo que de
       verdad hay detrás del texto —el disco de la luna, el sol, una
       lámina clara— y no contra una suposición. */
    medirZona(x, y, w, h) {
      w = Math.max(1, Math.min(w, ancho - x));
      h = Math.max(1, Math.min(h, alto - y));
      if (x < 0 || y < 0 || w < 1 || h < 1) return null;
      const px = new Uint8Array(w * h * 4);
      gl.readPixels(x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const linz = (v) => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      let max = 0, min = 1, suma = 0, n = 0;
      for (let i = 0; i < px.length; i += 4) {
        const l = 0.2126 * linz(px[i] / 255)
                + 0.7152 * linz(px[i + 1] / 255)
                + 0.0722 * linz(px[i + 2] / 255);
        if (l > max) max = l;
        if (l < min) min = l;
        suma += l; n++;
      }
      return { max, min, prom: suma / n };
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
