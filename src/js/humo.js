/* ═══════════════════════════════════════════════════════════════════
   humo.js — el ente.

   QUÉ ES. Pigmento azul y rojo que vive dentro de la página y se coloca
   donde hace falta. No es un fondo animado: tiene DOS trabajos, y en
   los dos está haciendo de tinta, no de adorno.

     1 · EL REALCE de «no hay consentimiento». Ahí donde antes había una
         aguada roja pintada con CSS —quieta, siempre igual— ahora está
         el ente. Es la misma mancha y dice lo mismo, pero respira. Esa
         frase es el criterio con el que se lee la página entera y es lo
         único de la sección que se mueve: por eso se mira.

     2 · EL AVE, junto al reloj de rescate. Ahí abajo el ente se recoge
         y toma forma de pájaro pequeño —un petirrojo, redondo y
         compacto— y se queda al lado del instrumento mientras se lee.

   NO EN EL HERO. El hero es una pintura terminada y no le falta nada.
   Se recorta con clip() contra la sección, así que por encima de su
   canto no se dibuja ni un píxel.

   NADA SUELTO. Las manchas que no tienen sitio en la figura no vagan
   por ahí: no existen. Un puñado de esferas dando vueltas alrededor de
   la forma no la acompaña, la ensucia — y este sitio no puede
   permitirse ruido visual alrededor de una frase que alguien está
   leyendo en el peor momento de su vida.

   YA HECHO AL LLEGAR. La primera vez que una figura entra en pantalla,
   las manchas se colocan de golpe en su sitio. Nadie tiene que esperar
   a que se forme: cuando bajas, ya está.

   POR DEBAJO DEL TEXTO, siempre. El lienzo va después de </main> con
   z-index 0, cosido entre el fondo de la sección y la letra. Ninguna
   palabra pierde contraste por esto.

   Es un enhancement. Si no carga, no falta nada.
   ═══════════════════════════════════════════════════════════════════ */

const lienzo = document.getElementById('humo');
const cercano = document.getElementById('humo-cerca');
const quieto = matchMedia('(prefers-reduced-motion: reduce)');

/* ── LA PALETA ──────────────────────────────────────────────────────
   Los azules y los rojos de la marca. No se mezclan hasta el morado:
   cada mancha es de un lado o del otro, y lo que se ve donde se cruzan
   lo pone la transparencia, no una media de los dos colores.

   El rojo es EL MISMO tinte que tenía la aguada del realce, porque
   hereda su trabajo: es el color del daño en este sitio y está
   reservado para las frases que describen uno. */
const AZULES = ['#2C4E74', '#3E6E8E', '#5B93AC'];
const ROJOS  = ['#C4553F', '#CC5F4A', '#B8556A'];

/* ── LA FIGURA DEL AVE: UN PETIRROJO ────────────────────────────────
   Una lista de manchas colocadas a mano, no una polilínea. Repartir
   pigmento a lo largo de un contorno da un ave de alambre: todo se va
   al borde y el centro queda hueco, que es lo contrario de un pájaro
   pequeño — un petirrojo ES una masa.

   EL COLOR SALE DE LA ANATOMÍA. Su pecho es rosa y su dorso apagado,
   así que las manchas del pecho son las rojas y las del dorso, cabeza,
   ala y cola son las azules. El azul y el rojo de la marca dejan de ser
   una paleta impuesta y pasan a ser el pájaro.

   Mira a la derecha. Coordenadas normalizadas de su caja, y = hacia
   abajo, `r` en fracciones del ancho. `orden` manda: en un teléfono
   entran menos manchas y se toman las primeras, así que la lista va de
   más importante a menos — con las primeras once sale un petirrojo sin
   patas ni pico, que sigue siendo un petirrojo. */
const AVE = [
  { x: 0.50, y: 0.47, r: 0.150, tono: 'azul' },   // el grueso del dorso
  { x: 0.62, y: 0.43, r: 0.140, tono: 'rojo' },   // el pecho, lo que lo nombra
  { x: 0.60, y: 0.20, r: 0.105, tono: 'azul' },   // la cabeza, redonda y pegada
  { x: 0.65, y: 0.56, r: 0.120, tono: 'rojo' },   // el pecho baja al vientre
  { x: 0.39, y: 0.38, r: 0.125, tono: 'azul' },   // el ala plegada
  { x: 0.52, y: 0.63, r: 0.115, tono: 'rojo' },   // el vientre
  { x: 0.68, y: 0.31, r: 0.100, tono: 'rojo' },   // la garganta
  { x: 0.36, y: 0.52, r: 0.105, tono: 'azul' },   // el flanco del ala
  { x: 0.50, y: 0.31, r: 0.100, tono: 'azul' },   // la nuca
  { x: 0.24, y: 0.58, r: 0.085, tono: 'azul' },   // arranque de la cola
  { x: 0.41, y: 0.62, r: 0.090, tono: 'azul' },   // el bajo vientre
  { x: 0.13, y: 0.66, r: 0.062, tono: 'azul' },   // la cola
  { x: 0.70, y: 0.14, r: 0.055, tono: 'azul' },   // la frente
  { x: 0.55, y: 0.74, r: 0.045, tono: 'azul' },   // el muslo
  { x: 0.80, y: 0.18, r: 0.032, tono: 'azul' },   // el pico
  { x: 0.58, y: 0.84, r: 0.028, tono: 'azul' },   // una pata
  { x: 0.66, y: 0.82, r: 0.026, tono: 'azul' },   // la otra
  { x: 0.60, y: 0.93, r: 0.024, tono: 'azul' },   // el pie
];
/* La caja del petirrojo es casi cuadrada: sus manchas van de 0.13 a
   0.80 a lo ancho y de 0.14 a 0.93 a lo alto. */
const AVE_PROPORCION = 0.95;

/* ── LAS DOS FIGURAS ────────────────────────────────────────────────
   GANA LA QUE ESTÉ MÁS CENTRADA EN PANTALLA, no la primera de una
   lista. Al principio era por orden fijo y funcionaba porque las dos
   anclas estaban lejísimos: la frase arriba del todo y el reloj al
   final de la página.

   Al subir el reloj a segundo bloque —justo debajo de la definición—
   ese orden fijo dejó de valer: las dos anclas caben en la misma
   pantalla, así que la de abajo ganaba siempre y el realce de «no hay
   consentimiento» se apagaba en cuanto asomaba el disco del reloj,
   mientras la frase seguía a la vista.

   Con la distancia al centro del viewport el relevo lo decide dónde
   está mirando quien lee, que es lo único que importa aquí. Y sale
   gratis un gesto que no había pedido nadie y que es exactamente lo
   que este ente debería hacer: al bajar de la frase al reloj, el
   pigmento SE VA de la una y se recoge en el otro. Se ve viajar. */
/* Las ESTACIONES del viaje, de arriba abajo. El ente recorre la
   sección entera pasando por ellas: se subraya la frase, baja, se
   recoge en pájaro junto al reloj, y sigue bajando deshecho en agua
   hasta el final de la página. Las que no existan se saltan solas. */
const ESTACIONES = [
  { tipo: 'banda',  anclaje: '[data-humo-realce]' },
  /* EL SÍ. El ente se cierra sobre la palabra JUSTO ANTES de que se
     rompa, y esa es toda la intención: que no parezca que el SÍ se cae
     solo, sino que algo vino a por él. Un ente que te protege no te
     consuela después — llega antes. */
  { tipo: 'banda',  anclaje: '[data-humo-si]' },
  { tipo: 'ave',    anclaje: '#estas-aqui .rr__esfera' },
  { tipo: 'deriva', anclaje: '#reloj' },
  { tipo: 'deriva', anclaje: '#mapa' },
  { tipo: 'deriva', anclaje: '#acompanar' },
];

/* Cuántas manchas hay en total. Es el número de sitios del ave, ni una
   más: las que sobrarían no tendrían dónde ir y acabarían dando vueltas
   alrededor, que es exactamente el ruido que no queremos. */
const CUANTAS = innerWidth < 700 ? 11 : AVE.length;
const BORRON = innerWidth < 700 ? 9 : 11;
/* El desenfoque con la figura cuajada. Bajado de 4 a 2.4: cuatro
   píxeles sobre manchas de treinta se comían el canto y el pájaro se
   quedaba en insinuación. A 2.4 se le ve la cabeza, el pico y las
   patas, y sigue sin tener un solo borde duro. */
const NITIDO = innerWidth < 700 ? 2.2 : 2.4;

let manchas = [];
let ctx = null, ctxC = null;
let w = 0, h = 0, dpr = 1;
let corriendo = false;
let figura = null;
let colocado = false;      // ¿ya se plantaron de golpe la primera vez?
let cuaje = 0;

/* La mano. `z` sube al tocar y baja sola. */
const mano = { x: 0, y: 0, z: 0 };

function medir() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  w = innerWidth;
  h = innerHeight;
  for (const [c, x] of [[lienzo, ctx], [cercano, ctxC]]) {
    if (!c || !x) continue;
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    c.style.width = w + 'px';
    c.style.height = h + 'px';
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
}

function nacer() {
  manchas = [];
  const rojas = AVE.slice(0, CUANTAS).filter((p) => p.tono === 'rojo').length;
  for (let i = 0; i < CUANTAS; i++) {
    const azul = i >= rojas;
    const gama = azul ? AZULES : ROJOS;
    manchas.push({
      tono: azul ? 'azul' : 'rojo',
      /* Una de cada tres va en el plano cercano. Se fija al nacer:
         si una mancha cambiara de plano a mitad del viaje, el ojo
         vería el salto y se acabó la ilusión. */
      cerca: i % 3 === 1,
      color: gama[i % gama.length],
      x: w * 0.5, y: h * 0.5, ox: 0, oy: 0,
      r: 30, rActual: 30,
      /* Cada una deriva por su cuenta: dos senos de periodo largo con
         frecuencias que no son múltiplos, así que la figura nunca se
         cuaja del todo. Una forma perfectamente quieta es un logotipo,
         no un ser. */
      d: [0.05 + Math.random() * 0.06, Math.random() * 100,
          0.03 + Math.random() * 0.05, Math.random() * 100],
    });
  }
}

/* ── DÓNDE VAN LAS MANCHAS ──────────────────────────────────────────
   Devuelve, para cada mancha, su sitio {x, y, r} o null. El emparejado
   es POR COLOR y, dentro del color, por cercanía: una mancha azul acaba
   en el dorso y una roja en el pecho, y además cada una viaja lo mínimo,
   así que la nube se recoge en vez de cruzarse consigo misma. */
function repartir(sitios) {
  const libres = manchas.map((_, i) => i);
  const destino = new Array(manchas.length).fill(null);
  for (const s of sitios) {
    let mejor = -1, mejorD = Infinity, tonoOk = false;
    for (const i of libres) {
      const m = manchas[i];
      const coincide = m.tono === s.tono;
      const d = Math.hypot(m.x - s.x, m.y - s.y);
      if (coincide && !tonoOk) { mejor = i; mejorD = d; tonoOk = true; continue; }
      if (coincide === tonoOk && d < mejorD) { mejor = i; mejorD = d; }
    }
    if (mejor < 0) break;
    destino[mejor] = s;
    libres.splice(libres.indexOf(mejor), 1);
  }
  return destino;
}

function sitiosAve(r) {
  /* Al LADO del reloj, no encima: se planta a la derecha del disco y
     alineado con su mitad alta. El reloj es el instrumento y el ave lo
     acompaña — si se le pusiera encima, taparía lo único de ese bloque
     que hay que poder leer de un vistazo. */
  /* MÁS GRANDE. Estaba en 0.62 del disco y salía un pájaro de 120 px
     que no llegaba a leerse como pájaro. Agrandar es la palanca
     correcta para definir: con manchas mayores la silueta se distingue
     igual de bien con la MISMA densidad, así que no se paga en
     contraste — al revés de lo que pasa al cargar el pigmento. */
  const aw = Math.min(r.width * 0.88, w * 0.34);
  const ah = aw * AVE_PROPORCION;
  const x0 = r.right - aw * 0.30;
  const y0 = r.top + r.height * 0.10;
  return AVE.slice(0, CUANTAS).map((p) => ({
    x: x0 + p.x * aw, y: y0 + p.y * ah, r: p.r * aw, ex: 1, tono: p.tono,
  }));
}

/* LA DERIVA. Entre una figura y la siguiente el ente no desaparece ni
   se queda esperando: se deshace en agua y cruza el bloque. Son manchas
   muy anchas, muy diluidas y repartidas en diagonal por el flanco, sin
   dibujar nada — lo contrario de una figura, y por eso descansa.

   Van al FLANCO y no al centro: por debajo de una columna de texto no
   puede pasar pigmento, y aquí la lectura manda sobre todo lo demás. */
function sitiosDeriva(r) {
  const lado = r.width * 0.30;
  const x0 = r.right - lado * 0.55;
  const sitios = [];
  for (let i = 0; i < CUANTAS; i++) {
    const t = i / (CUANTAS - 1);
    sitios.push({
      x: x0 + Math.sin(t * 3.1 + 0.6) * lado * 0.55,
      y: r.top + r.height * (0.10 + t * 0.80),
      r: lado * (0.16 + 0.10 * Math.sin(t * Math.PI)),
      ex: 1.8,
      tono: i % 3 === 0 ? 'rojo' : 'azul',
    });
  }
  return sitios;
}

function sitiosRealce(el) {
  /* POR RENGLÓN, no por la caja entera. `getBoundingClientRect()` de un
     texto que se parte en dos líneas devuelve el rectángulo que las
     envuelve a las dos —y el hueco de en medio—, así que la mancha
     salía del alto de DOS renglones: un nubarrón centrado entre las
     líneas, que es justo el «sobrecargado» que no queremos.

     `getClientRects()` devuelve un rectángulo POR LÍNEA. Con eso la
     aguada se reparte sobre cada renglón con su propio alto, y sigue al
     texto aunque cambie de tamaño, de idioma o de número de líneas. */
  const lineas = [...el.getClientRects()].filter((r) => r.width > 4);
  if (!lineas.length) return [];
  const total = lineas.reduce((s, r) => s + r.width, 0);
  const sitios = [];
  for (const r of lineas) {
    /* Tres o cuatro por renglón, no nueve. Estiradas ya se tocan. */
    const cuota = Math.max(2, Math.min(4, Math.round(5 * (r.width / total))));
    sitios.push(...sitiosDeLinea(r, cuota));
  }
  return sitios;
}

function sitiosDeLinea(r, n) {
  /* EL RADIO SE TOPA CONTRA LA PANTALLA, no solo contra el renglón.
     La banda se dimensiona con el alto de la línea, y eso vale para un
     párrafo —donde el renglón mide veinte píxeles— pero no para el SÍ,
     que está en cuerpo de nueve rem: allí salían manchas de setenta
     píxeles de radio y el ente dejaba de ser una aguada sobre una
     palabra para ser un nubarrón debajo de ella.

     Con el tope, la mancha sigue creciendo con el texto —tiene que
     hacerlo, o sobre un titular no se vería— pero deja de crecer
     cuando ya es lo bastante grande para subrayarlo. */
  const alto = Math.min(r.height, h * 0.075);
  const sitios = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    sitios.push({
      x: r.left - alto * 0.20 + (r.width + alto * 0.40) * t,
      y: r.top + r.height * 0.60,
      r: alto * (0.40 + 0.10 * Math.sin(t * Math.PI)),
      /* ESTIRADAS A LO ANCHO, y esto es lo que las saca de ser
         burbujas. Una fila de manchas REDONDAS nunca forma una banda:
         para que se toquen, el radio tiene que ser mayor que la
         separación, y en una frase ancha y baja eso pide veinte
         círculos — o sea veinte burbujas. Estirando cada una tres
         veces a lo ancho, tres manchas ya se solapan y lo que queda es
         un trazo continuo de pincel, que es lo que era.

         El estirado va en la forma, no en la posición: sigue siendo
         una sola aguada con su borde irregular, solo que ovalada, que
         es exactamente la huella que deja un pincel plano al pasar. */
      ex: 3.0,
      tono: (i === 0 || i === n - 1) ? 'azul' : 'rojo',
    });
  }
  return sitios;
}

/* ── EL VIAJE ───────────────────────────────────────────────────────
   Una sola masa que baja por la página pasando por sus estaciones. En
   cada una toma una forma —la banda sobre la frase, el pájaro junto al
   reloj, agua suelta entre medias— y entre dos estaciones se
   interpola, así que nunca hay un cambio: hay un recorrido.

   Lo gobierna el SCROLL y nada más. Avanza exactamente lo que avanza
   quien lee: no hay nada que esperar ni nada que se adelante. */
function figuraDeAhora() {
  const paradas = [];
  for (const e of ESTACIONES) {
    const el = document.querySelector(e.anclaje);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    paradas.push({ tipo: e.tipo, el, r, cy: r.top + r.height / 2 });
  }
  if (!paradas.length) return null;

  const sitiosDe = (q) => q.tipo === 'ave' ? sitiosAve(q.r)
                        : q.tipo === 'banda' ? sitiosRealce(q.el)
                        : sitiosDeriva(q.r);

  /* En qué tramo del recorrido estamos. Las paradas van en orden de
     página, así que sus centros están ordenados en pantalla. */
  /* LLEGA ANTES QUE LA MIRADA. El recorrido se medía contra el centro
     exacto de la pantalla, así que el ente terminaba de formarse en el
     mismo instante en que su sitio quedaba centrado — o sea, llegaba a
     la vez que tú. Midiendo contra un punto más BAJO, el pigmento
     completa su viaje mientras el destino todavía sube, y cuando llegas
     ya está puesto. Es la diferencia entre acompañar y seguir. */
  const vc = h * 0.60;
  let a = paradas[0], b = paradas[0], p = 0;
  if (vc >= paradas[paradas.length - 1].cy) {
    a = b = paradas[paradas.length - 1]; p = 0;
  } else if (vc > paradas[0].cy) {
    for (let k = 0; k < paradas.length - 1; k++) {
      if (vc >= paradas[k].cy && vc <= paradas[k + 1].cy) {
        a = paradas[k]; b = paradas[k + 1];
        const tramo = b.cy - a.cy;
        p = tramo < 1 ? 1 : (vc - a.cy) / tramo;
        break;
      }
    }
  }
  /* Suavizado en los dos extremos del tramo: sale despacio de una
     figura y llega despacio a la siguiente. Es lo que hace que el
     recorrido se sienta fluido y no lineal. */
  p = p * p * (3 - 2 * p);

  const sa = sitiosDe(a);
  const sb = a === b ? sa : sitiosDe(b);
  if (!sa.length && !sb.length) return null;

  const n = Math.max(sa.length, sb.length);
  const sitios = [];
  for (let i = 0; i < n; i++) {
    const u = sa.length ? sa[i % sa.length] : null;
    const v = sb.length ? sb[i % sb.length] : null;
    if (!u) { sitios.push(v); continue; }
    if (!v) { sitios.push(u); continue; }
    sitios.push({
      x: u.x + (v.x - u.x) * p,
      y: u.y + (v.y - u.y) * p,
      r: u.r + (v.r - u.r) * p,
      ex: (u.ex || 1) + ((v.ex || 1) - (u.ex || 1)) * p,
      tono: p < 0.5 ? u.tono : v.tono,
    });
  }

  /* CUÁNTO PESA: se mide sobre DÓNDE ESTÁ LA MASA, no sobre el ancla.
     Mirando la visibilidad del anclaje quedaba un agujero en mitad del
     viaje —la parada de arriba ya se ha ido y la de abajo no ha
     entrado— y el ente se apagaba justo mientras viajaba. El ente es
     una cosa con posición: está a la vista cuando lo está él. */
  const cy = sitios.reduce((s2, q) => s2 + q.y, 0) / sitios.length;
  const margen = h * 0.24;
  const fuerza = Math.min(1, Math.max(0,
    Math.min(cy + margen, h + margen - cy) / margen));
  if (fuerza <= 0.004) return null;

  const tipo = p < 0.5 ? a.tipo : b.tipo;
  return { tipo, fuerza, sitios, viaje: p, cuajada: tipo !== 'deriva' };
}

function paso(ms) {
  if (!corriendo) return;
  const t = ms / 1000;

  const sec = document.getElementById('herramientas');
  const rs = sec ? sec.getBoundingClientRect() : null;
  const arriba = rs ? Math.max(0, rs.top) : 0;
  const abajo = rs ? Math.min(h, rs.bottom) : 0;

  figura = (rs && abajo - arriba > 1) ? figuraDeAhora() : null;

  if (!figura) {
    if (lienzo.style.opacity !== '0') {
      lienzo.style.opacity = '0';
      ctx.clearRect(0, 0, w, h);
      if (ctxC) { cercano.style.opacity = '0'; ctxC.clearRect(0, 0, w, h); }
    }
    mano.z = Math.max(0, mano.z - 0.012);
    requestAnimationFrame(paso);
    return;
  }

  const destinos = repartir(figura.sitios);

  /* SE PLANTAN DE GOLPE LA PRIMERA VEZ. Nadie tiene que ver cómo se
     monta: al bajar, el pájaro ya está hecho. Después de esto todo va
     con muelle, que es lo que le da peso al cambiar de una figura a la
     otra. */
  if (!colocado) {
    for (let i = 0; i < manchas.length; i++) {
      const s = destinos[i];
      if (!s) continue;
      manchas[i].x = s.x; manchas[i].y = s.y;
      manchas[i].ox = 0; manchas[i].oy = 0;
      manchas[i].rActual = s.r; manchas[i].r = s.r;
    }
    cuaje = 1;
    colocado = true;
  }

  cuaje += (figura.fuerza - cuaje) * 0.05;
  lienzo.style.opacity = (figura.fuerza * OPACIDAD).toFixed(3);
  const desenf = BORRON - cuaje * (BORRON - NITIDO);
  lienzo.style.filter = 'blur(' + desenf.toFixed(1)
                      + 'px) saturate(' + (1.04 + cuaje * 0.10).toFixed(3) + ')';
  if (ctxC) {
    /* Más flojo y MÁS desenfocado que el lejano: lo que está cerca del
       ojo cae fuera del plano de foco. Es al revés que la perspectiva
       aérea del paisaje, y es lo que hace que se lea como cercano en
       vez de como una segunda copia. */
    cercano.style.opacity = (figura.fuerza * OPACIDAD * 0.30).toFixed(3);
    cercano.style.filter = 'blur(' + (desenf * 2.1).toFixed(1) + 'px) saturate(1.02)';
  }

  const capas = ctxC ? [ctx, ctxC] : [ctx];
  for (const x of capas) {
    x.clearRect(0, 0, w, h);
    x.save();
    /* Nada por encima del canto de la sección: el hero no se toca. */
    x.beginPath();
    x.rect(0, arriba, w, abajo - arriba);
    x.clip();
    x.globalCompositeOperation = 'source-over';
  }
  for (let i = 0; i < manchas.length; i++) {
    const m = manchas[i];
    const s = destinos[i];
    /* Sin sitio, no existe. Ni vaga, ni se desvanece por ahí. */
    if (!s) continue;

    const [f1, p1, f2, p2] = m.d;
    /* LA DERIVA PROPIA, A LA MITAD. Estaba en ±10 px y era lo que
       desdibujaba el pájaro: dieciocho manchas moviéndose cada una por
       su lado no respiran, tiemblan. A ±4 sigue sin cuajar del todo
       —una forma perfectamente quieta es un logotipo— pero la silueta
       aguanta. */
    const derX = Math.sin(t * f1 + p1) * 2.8 + Math.sin(t * f2 * 1.7 + p2) * 1.4;
    const derY = Math.cos(t * f2 + p2) * 2.4 + Math.sin(t * f1 * 1.3 + p1) * 1.2;

    /* ── SIN REBOTE AL DESPLAZARSE ──────────────────────────────────
       Aquí había un muelle: la mancha PERSEGUÍA su destino con
       velocidad y rozamiento. Con la página quieta se sentía bien —masa
       que arranca y frena— pero al hacer scroll el destino se mueve
       cientos de píxeles de golpe, la mancha se quedaba atrás, cogía
       velocidad para alcanzarlo y se pasaba de largo. Eso es el rebote:
       no era un adorno, era el muelle haciendo su trabajo con una
       entrada para la que no estaba pensado.

       El modelo nuevo le da la vuelta: la mancha NO persigue su sitio,
       ESTÁ en él, y lo que se guarda es un DESVÍO que se deshace solo.
       Cuando el scroll mueve el destino, la mancha va con él exactamente
       —sin retraso, así que no hay nada que recuperar y nada de lo que
       pasarse—. El desvío solo lo mete la mano, y decae en exponencial,
       que nunca oscila: puede acercarse a cero, jamás cruzarlo.

       Lo que se pierde es la inercia; lo que se gana es que bajar por la
       página se sienta como agua siguiendo la corriente y no como un
       muelle sacudiéndose. Era la condición. */
    if (mano.z > 0.01) {
      const dx = mano.x - (s.x + m.ox), dy = mano.y - (s.y + m.oy);
      const d = Math.hypot(dx, dy);
      /* MÁS CORTO Y MÁS FLOJO. El alcance era de un cuarto de pantalla
         y la atracción de 0.06 por cuadro: pasar el ratón por encima
         arrancaba media figura y el ave se descomponía. Un ente que te
         protege no reacciona como si le hubieras dado un golpe.

         Ahora el alcance es de un sexto de pantalla y el tirón un
         tercio del que era: se nota que el pigmento te sigue, y no
         mucho más que eso. */
      const alcance = Math.max(w, h) * 0.17;
      if (d < alcance && d > 0.001) {
        const g = (1 - d / alcance) * mano.z;
        m.ox += dx * g * 0.020;
        m.oy += dy * g * 0.020;
      }
    }
    /* Y CON TOPE, que es lo que garantiza que la forma aguante. Por
       mucho que insistas, ninguna mancha se aparta de su sitio más de
       media vez su propio radio: el ave se mece bajo la mano pero no
       se deshace. Sin este tope el límite lo ponía la insistencia de
       quien pasa el ratón, que no es un límite. */
    const tope = m.rActual * 0.5;
    const dist = Math.hypot(m.ox, m.oy);
    if (dist > tope) { const k = tope / dist; m.ox *= k; m.oy *= k; }
    /* El desvío se va solo, y despacio: el agua vuelve a su sitio. */
    m.ox *= 0.955;
    m.oy *= 0.955;
    m.x = s.x + derX + m.ox;
    m.y = s.y + derY + m.oy;

    /* El radio sí sigue suavizado —cambiar de talla de golpe se ve—
       pero más rápido que antes, para que la forma no vaya por detrás
       de su posición al recorrer el viaje. */
    m.rActual += (s.r - m.rActual) * 0.16;
    const r = m.rActual * (0.94 + 0.06 * Math.sin(t * f1 * 2.1 + p1));

    /* ── LO QUE LA HACE ACUARELA ────────────────────────────────────
       1 · El borde no es un círculo. Un arc() con degradado radial es
           la definición de aerógrafo y se reconoce al instante. El
           contorno se dibuja punto a punto con el radio modulado por
           tres senos, y los senos van con el tiempo: el agua sigue viva
           mientras no se seca.
       2 · El pigmento se acumula en el CANTO. Al secarse, el agua
           arrastra el pigmento hacia el borde y deja el centro más
           claro que la orilla. Por eso la parada del 0.86 va más
           cargada que la del centro.
       3 · Dos capas, porque una aguada son dos pasadas: el agua sucia
           que se extiende y el pigmento que se queda. */
    const ex = s.ex || 1;
    const contorno = (g2, radio) => {
      g2.beginPath();
      const N = 30;
      for (let k = 0; k <= N; k++) {
        const a = (k / N) * Math.PI * 2;
        const on = 1
          + 0.115 * Math.sin(a * 3 + p1 + t * 0.21)
          + 0.075 * Math.sin(a * 5 - p2 + t * 0.13)
          + 0.045 * Math.sin(a * 8 + p1 * 0.5 - t * 0.09);
        const px = m.x + Math.cos(a) * radio * on * ex;
        const py = m.y + Math.sin(a) * radio * on;
        if (k === 0) g2.moveTo(px, py); else g2.lineTo(px, py);
      }
      g2.closePath();
    };

    /* El degradado se estira con la silueta: su radio va multiplicado
       por `ex`, igual que el contorno. Si no, el color saldría redondo
       dentro de una forma ovalada y se vería el desajuste en los dos
       extremos. */
    const g = (m.cerca && ctxC) ? ctxC : ctx;
    const halo = g.createRadialGradient(m.x, m.y, 0, m.x, m.y, r * ex);
    halo.addColorStop(0, m.color + '22');
    halo.addColorStop(0.62, m.color + '1c');
    halo.addColorStop(0.86, m.color + '2c');
    halo.addColorStop(1, m.color + '00');
    g.fillStyle = halo;
    contorno(g, r);
    g.fill();

    const cuerpo = g.createRadialGradient(m.x, m.y, 0, m.x, m.y, r * 0.62 * ex);
    /* Se probó a cargar más el núcleo para definir, y el peor píxel
       bajó de 6.85:1 a 5.27:1 — por encima del 4.5 exigido pero por
       debajo del 5.4 que este sitio se pone. Se devolvió: la
       definición la da el DESENFOQUE, no la densidad, y esa no
       cuesta contraste. */
    cuerpo.addColorStop(0, m.color + '30');
    cuerpo.addColorStop(0.72, m.color + '2e');
    cuerpo.addColorStop(0.88, m.color + '42');
    cuerpo.addColorStop(1, m.color + '00');
    g.fillStyle = cuerpo;
    contorno(g, r * 0.62);
    g.fill();
  }

  for (const x of capas) x.restore();
  mano.z = Math.max(0, mano.z - 0.012);
  requestAnimationFrame(paso);
}

/* LA DENSIDAD GLOBAL, y por qué bajó al afilar el borde.

   Definir la figura costó desenfoque —de 4 px a 2.4— y eso tiene un
   precio que no era obvio: menos desenfoque es pigmento más
   CONCENTRADO, así que el píxel más oscuro se oscurece aunque no se
   haya añadido ni una gota de color. Medido, el peor caso de contraste
   se fue de 6.85:1 a 5.01:1.

   La salida no es renunciar a la nitidez: es bajar la densidad. La
   opacidad reparte por igual y no toca el canto, así que la forma
   sigue definida y el texto recupera su margen. Definición y contraste
   no son el mismo mando. */
const OPACIDAD = innerWidth < 700 ? 0.60 : 0.70;

function arrancar() {
  if (!lienzo) return;
  ctx = lienzo.getContext('2d');
  if (!ctx) return;
  ctxC = cercano ? cercano.getContext('2d') : null;
  medir();
  nacer();
  addEventListener('resize', () => { medir(); colocado = false; }, { passive: true });

  /* Ratón y dedo con el mismo código. El `pointer-events: none` del CSS
     deja que la página siga desplazándose: tocar el humo no puede
     secuestrarle el scroll a alguien que intenta llegar a un teléfono. */
  addEventListener('pointermove', (e) => {
    mano.x = e.clientX; mano.y = e.clientY;
    mano.z = Math.min(1, mano.z + 0.10);
  }, { passive: true });
  addEventListener('pointerdown', (e) => {
    mano.x = e.clientX; mano.y = e.clientY;
    mano.z = 1;
  }, { passive: true });

  if (quieto.matches) {
    /* Quieto no es lento: un cuadro y ahí se queda. Y tiene que ser
       bonito así, porque para mucha gente esa es la única versión que
       van a ver. */
    corriendo = true; paso(0); corriendo = false;
    return;
  }
  corriendo = true;
  requestAnimationFrame(paso);
}

if (import.meta.env.DEV) {
  window.__humo = {
    paso: (ms) => { const a = corriendo; corriendo = true; paso(ms); corriendo = a; },
    figura: () => figura && { tipo: figura.tipo, fuerza: figura.fuerza,
                              viaje: figura.viaje },
    manchas: () => manchas.map((m) => ({ x: Math.round(m.x), y: Math.round(m.y),
                                         r: Math.round(m.rActual), tono: m.tono })),
  };
}

quieto.addEventListener('change', () => {
  if (quieto.matches) corriendo = false;
  else if (!corriendo) { corriendo = true; requestAnimationFrame(paso); }
});

arrancar();
