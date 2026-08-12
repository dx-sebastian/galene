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
  return mix(vec3(0.972, 0.966, 0.952), u_altas, 0.12);
}

/* APLANAR. Una aguada seca PLANA: se posa, se seca y deja un campo de un
   solo tono. Lo que había era degradado continuo, que es la firma del
   aerógrafo. Esto cuantiza el VALOR en unos pocos escalones y deja el
   color en paz; dureza decide si el escalón es un canto seco (bajo) o
   una transición perdida (alto). */
vec3 aplanar(vec3 c, float pasos, float dureza){
  float v = valor(c);
  if (v < 0.0005) return c;
  float e = v * pasos;
  /* EL ESCALON NO PUEDE SER RECTO. Cuantizar sin mas dejaba bandas con
     contorno matematico —un artefacto digital, justo lo contrario de lo
     que se busca—. Un charco de acuarela se para donde el papel deja de
     mojarse, asi que el limite serpentea siguiendo la trama.
     Es ruido de periodo largo, no grano: lobulos de unos noventa
     pixeles. Con ruido fino saldria granulado de pelicula. */
  e += (fbm(gl_FragCoord.xy / 88.0) - 0.5) * (1.25 / pasos);
  float f = floor(e);
  float vq = (f + smoothstep(0.5 - dureza, 0.5 + dureza, e - f)) / pasos;
  return c * clamp(vq / v, 0.55, 1.8);
}

/* Duotono: la lámina entrega estructura de valor; la hora entrega el
   color. Se expande el rango pintado para no perder los extremos. */
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
  float horX = u_hor
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
    col = mix(col, aplanar(col, 4.0, 0.28), 0.94);

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
    float bocaCielo = smoothstep(0.40, 0.53,
                        fbm(vec2(q.x * 3.1 + 12.0, 3.7)));
    reservaPapel = max(reservaPapel, (1.0 - smoothstep(0.02, 0.30, gy))
                           * bocaCielo * mix(0.30, 1.0, u_int) * 0.97);

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

    // La luz tiene fuente: disco con halo apretado, jamás resplandor.
    vec2 f = vec2(u_fuente.x * aspecto, u_fuente.y);
    float d = length(q - f);
    float disco = 1.0 - smoothstep(0.012, 0.020, d);
    float halo  = exp(-d * 9.0) * 0.55 + exp(-d * 2.6) * 0.16;
    col = mix(col, u_reguero, clamp((disco * 0.85 + halo * 0.5) * u_int, 0.0, 0.92));
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
    vec3 claro  = mix(u_altas, u_bruma, 0.42);

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
    float faceta = smoothstep(0.62, 0.80, valor(pintura));
    reservaPapel = max(reservaPapel, faceta * (1.0 - smoothstep(0.34, 0.95, prof))
                           * mix(0.22, 1.0, u_int) * 0.95);

    /* Y el agua también se aplana. Menos escalones que el cielo y con el
       canto más seco, porque el agua lejana en una acuarela son dos o
       tres tiras planas y nada más. */
    col = mix(col, aplanar(col, 5.0, 0.16), mix(0.90, 0.48, pp));

    /* Devolver el pigmento propio de la lámina. El duotono puro aplana
       la separación de color del granulado, y esa separación es la
       mitad de lo que hace que algo lea acuarela en vez de fotografía. */
    col += (pintura - vec3(valor(pintura))) * u_croma * 1.45;

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
    col = mix(col, mix(col, u_reguero, 0.20), smoothstep(0.42, 0.16, aparta) * 0.42);

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
    float perdido = smoothstep(0.42, 0.78, fbm(vec2(q.x * 0.62 - 5.0, 8.3)));
    float anchoBruma = mix(0.035, 0.30, perdido);
    col = mix(u_bruma * 0.82, col,
              smoothstep(0.0, anchoBruma, prof) * 0.75 + 0.25);
    col = mix(col, col * 0.90, smoothstep(0.60, 1.0, prof));

    /* EL REGUERO: angosto y continuo con calma, disperso con oleaje.
       Apunta a la fuente — antídoto contra la luz de ninguna parte. */
    float dx = abs(q.x - u_fuente.x * aspecto);
    float ancho = mix(0.42, 0.055, cn) * mix(0.35, 1.0, pp);
    float camino = exp(-pow(dx / max(ancho, 0.02), 2.0));
    float chispa = smoothstep(mix(0.72, 0.30, cn), 1.0,
                     ruido(vec2(q.x * mix(90.0, 26.0, pp) + u_deriva * 40.0,
                                uv.y * 200.0 - u_t * 0.7)));
    float brillo = camino * (mix(0.18, 0.55, cn) + chispa * 0.5)
                 * u_int * mix(1.0, 0.35, prof);
    col = mix(col, u_reguero, clamp(brillo, 0.0, 0.75));

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
        col = mix(col, pc, tc.a * mix(0.34, 0.78, profC) * entra);
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
      vec3 pm = aplanar(duotono(t.rgb, oscuroM, claroM), 6.0, 0.14);
      /* El manglar conserva su propio pigmento, como el agua: en duotono
         puro la copa salía gris contra un cielo cálido y leía recorte. */
      /* Y menos croma: 0.85 sobre una lamina que ya viene a 0.465 de
         saturacion dejaba el arbol como el unico objeto saturado del
         cuadro, tirando de la mirada por color en vez de por valor. */
      pm += (t.rgb - vec3(valor(t.rgb))) * u_croma * 0.52;
      /* Y SE ENTIERRA: el borde inferior de la lámina es un corte recto
         y se veía como tal cruzando las raíces. Aquí el alfa se apaga en
         el último tramo, así que el árbol se disuelve en el agua en vez
         de terminar en una línea. */
      float bajoAgua = smoothstep(0.0, 0.06, m.y);
      col = mix(col, pm, t.a * 0.92 * bajoAgua);
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
      col = mix(col, duotono(t.rgb, oscuroM, claroM),
                t.a * roto * desvanece * mix(0.34, 0.66, cn));
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
    float kAlto = u_cercaCaja.y, kAncho = kAlto * u_cercaCaja.w;
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
      vec3 oscuroC = mix(vec3(0.165, 0.160, 0.178), u_agua * 0.42, 0.35);
      vec3 claroC  = mix(u_bruma, u_altas, 0.30) * 0.78;
      vec3 pk = aplanar(duotono(tk.rgb, oscuroC, claroC), 6.0, 0.30);
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
    float dNoche = 1.0 - smoothstep(0.02, 0.34, u_int);
    if (dNoche > 0.001) {
      col = mix(col, vec3(valor(col)), dNoche * 0.30);
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
                   'u_hayCerca','u_hayCorales','u_hayLuces','u_cercaCaja','u_coralesCaja',
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
                corales: texturaVacia(), luces: texturaVacia() };

  const unidades = { lejano: 0, medio: 1, cercano: 2, cercanoCalmo: 3,
                     manglar: 4, papel: 5, grafito: 6,
                     garzaCerca: 7, garzaLejos: 8, medioCalmo: 9, nubes: 10,
                     manglarCerca: 11, corales: 12, luces: 13 };
  gl.uniform1i(u.u_manglarCerca, 11);
  gl.uniform1i(u.u_corales, 12);
  gl.uniform1i(u.u_luces, 13);
  gl.uniform1f(u.u_hayCerca, 0);
  gl.uniform1f(u.u_hayCorales, 0);
  gl.uniform1f(u.u_hayLuces, 0);
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
      if (n === 'manglarCerca' || n === 'corales' || n === 'luces') {
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
