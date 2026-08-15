/* ═══════════════════════════════════════════════════════════════════
   lugares.js — la cartografía.

   REGLA QUE MANDA SOBRE ESTE ARCHIVO: aquí no se inventa un solo punto.
   Una dirección equivocada en un mapa de emergencias manda a alguien a
   una puerta cerrada a las 4 de la mañana. Es peor que no tener mapa.

   Lo que sí puede vivir aquí son COORDENADAS DE CIUDAD: el centro
   aproximado de un municipio, que solo sirve para encuadrar el mapa y
   que cualquiera puede contrastar contra OpenStreetMap en diez
   segundos. Ninguna de ellas se presenta nunca como una dirección.

   Los LUGARES —hospitales, centros de atención— siguen VACÍOS hasta
   que cada uno tenga dirección comprobada, horario real y fecha de
   verificación por una persona de este proyecto. Lo que el mapa de
   emergencia pinta mientras tanto NO sale de aquí: sale de
   OpenStreetMap en vivo (ver js/ayuda.js) y va marcado como lo que es,
   un dato de terceros sin verificar.

   Para añadir un lugar hacen falta los seis campos. Sin los seis, la
   interfaz lo pinta como no verificado y lo dice en la cara.
   ═══════════════════════════════════════════════════════════════════ */

/* ── LOS TRES MAPAS ────────────────────────────────────────────────
   No son tres capas del mismo mapa: son tres mapas, con tres
   propósitos que no se mezclan, y por eso cada uno tiene su color,
   su cartografía y su forma de hablar.

   El orden importa y no es alfabético. EMERGENCIA VA PRIMERO porque
   es el único que sirve cuando algo está pasando ahora mismo; los
   otros dos son de antes y de después. Si alguien abre esta sección
   con las manos temblando, lo primero que tiene delante es dónde hay
   una puerta abierta.

   `pigmento` es el color del punto en el mapa, y son los tres colores
   que el sitio ya usa: verde de tinta (abierto), añil (compañía) y
   rojo apagado (cuidado). Ninguno es rojo de alarma puro — la regla 2
   prohíbe el terror, y un mapa lleno de banderas rojas es terror. */
/* ── QUÉ MAPAS SE VEN HOY ──────────────────────────────────────────
   `oculto` deja un mapa fuera de la interfaz sin borrar su código: por
   orden del dueño, luz y sombra se guardan «por ahora». El aparato que
   los pinta sigue entero —marcas.js, los tipos, los globos— y vuelven
   quitando una línea. Lo que NO se hace es dejar tres pestañas de las
   que dos no llevan a ninguna parte. */
export const MODOS = [
  {
    id: 'emergencia',
    nombre: 'Emergencia',
    lema: 'Dónde hay una puerta abierta',
    pie: 'Hospitales, urgencias y centros de atención de la ciudad que elijas. ' +
         'Los trae OpenStreetMap en el momento: llama antes de ir si puedes.',
    pigmento: '#A33B2A',
    fuente: 'osm',
  },
  {
    id: 'luz',
    oculto: true,
    nombre: 'Luz',
    lema: 'Dónde estaré hoy',
    pie: 'Dejas dicho dónde vas a estar y hasta qué hora, para que quien te ' +
         'quiere sepa dónde mirar. Se borra solo al final del día.',
    pigmento: '#2F6B4F',
    fuente: 'marcas',
  },
  {
    id: 'sombra',
    oculto: true,
    nombre: 'Sombra',
    lema: 'Dónde no ir',
    pie: 'Sitios donde pasó algo, o donde no quieres que vaya nadie. ' +
         'Se marca el lugar, nunca a una persona.',
    pigmento: '#4A3A63',
    fuente: 'marcas',
  },
];

export const MODOS_VISIBLES = MODOS.filter((m) => !m.oculto);
export const modoPor = (id) => MODOS.find((m) => m.id === id) || MODOS[0];

/* ── LAS CIUDADES QUE SE VEN DE ENTRADA ────────────────────────────
   Ocho fichas, no treinta y dos. Una fila de botones que hay que leer
   entera es una decisión más encima de alguien que ya no puede tomar
   ninguna. Estas ocho son las de más población del país; el resto
   está a un toque, detrás de «Otra».

   Las coordenadas son el centro urbano aproximado y solo sirven para
   encuadrar. `zoom` lo pone cada ciudad porque un encuadre de Bogotá
   y uno de Manizales no pueden ser el mismo número. */
export const CIUDADES = [
  { id: 'bogota',       nombre: 'Bogotá',        ll: [4.7110, -74.0721], zoom: 12 },
  { id: 'medellin',     nombre: 'Medellín',      ll: [6.2442, -75.5812], zoom: 12 },
  { id: 'cali',         nombre: 'Cali',          ll: [3.4516, -76.5320], zoom: 12 },
  { id: 'barranquilla', nombre: 'Barranquilla',  ll: [10.9685, -74.7813], zoom: 12 },
  { id: 'cartagena',    nombre: 'Cartagena',     ll: [10.3910, -75.4794], zoom: 12 },
  { id: 'bucaramanga',  nombre: 'Bucaramanga',   ll: [7.1193, -73.1227], zoom: 12 },
  { id: 'pereira',      nombre: 'Pereira',       ll: [4.8133, -75.6961], zoom: 13 },
  { id: 'manizales',    nombre: 'Manizales',     ll: [5.0703, -75.5138], zoom: 13 },
];

/* ── LAS OTRAS ─────────────────────────────────────────────────────
   Las capitales de departamento que faltan, más las ciudades grandes
   que no son capital. Están todas porque un mapa de emergencia que
   solo cubre ocho ciudades le dice al resto del país «esto no es para
   ti», y eso es exactamente lo contrario de lo que hace este sitio.

   Incluidos Leticia, Mitú, Inírida y Puerto Carreño, que casi nunca
   aparecen en los listados de nadie. Ahí también pasa. */
export const MAS_CIUDADES = [
  { id: 'apartado',        nombre: 'Apartadó',          ll: [7.8828, -76.6256], zoom: 14 },
  { id: 'arauca',          nombre: 'Arauca',            ll: [7.0844, -70.7591], zoom: 14 },
  { id: 'armenia',         nombre: 'Armenia',           ll: [4.5339, -75.6811], zoom: 13 },
  { id: 'barrancabermeja', nombre: 'Barrancabermeja',   ll: [7.0653, -73.8547], zoom: 13 },
  { id: 'bello',           nombre: 'Bello',             ll: [6.3373, -75.5544], zoom: 13 },
  { id: 'buenaventura',    nombre: 'Buenaventura',      ll: [3.8801, -77.0312], zoom: 13 },
  { id: 'cucuta',          nombre: 'Cúcuta',            ll: [7.8939, -72.5078], zoom: 12 },
  { id: 'dosquebradas',    nombre: 'Dosquebradas',      ll: [4.8339, -75.6747], zoom: 14 },
  { id: 'envigado',        nombre: 'Envigado',          ll: [6.1667, -75.5833], zoom: 14 },
  { id: 'florencia',       nombre: 'Florencia',         ll: [1.6144, -75.6062], zoom: 13 },
  { id: 'girardot',        nombre: 'Girardot',          ll: [4.3049, -74.8014], zoom: 14 },
  { id: 'ibague',          nombre: 'Ibagué',            ll: [4.4389, -75.2322], zoom: 13 },
  { id: 'inirida',         nombre: 'Inírida',           ll: [3.8653, -67.9239], zoom: 14 },
  { id: 'itagui',          nombre: 'Itagüí',            ll: [6.1719, -75.6113], zoom: 14 },
  { id: 'leticia',         nombre: 'Leticia',           ll: [-4.2153, -69.9406], zoom: 14 },
  { id: 'maicao',          nombre: 'Maicao',            ll: [11.3776, -72.2394], zoom: 14 },
  { id: 'mitu',            nombre: 'Mitú',              ll: [1.2528, -70.2340], zoom: 14 },
  { id: 'mocoa',           nombre: 'Mocoa',             ll: [1.1519, -76.6470], zoom: 14 },
  { id: 'monteria',        nombre: 'Montería',          ll: [8.7479, -75.8814], zoom: 13 },
  { id: 'neiva',           nombre: 'Neiva',             ll: [2.9273, -75.2819], zoom: 13 },
  { id: 'palmira',         nombre: 'Palmira',           ll: [3.5394, -76.3036], zoom: 13 },
  { id: 'pasto',           nombre: 'Pasto',             ll: [1.2136, -77.2811], zoom: 13 },
  { id: 'popayan',         nombre: 'Popayán',           ll: [2.4448, -76.6147], zoom: 13 },
  { id: 'pto-carreno',     nombre: 'Puerto Carreño',    ll: [6.1890, -67.4859], zoom: 14 },
  { id: 'quibdo',          nombre: 'Quibdó',            ll: [5.6947, -76.6611], zoom: 14 },
  { id: 'riohacha',        nombre: 'Riohacha',          ll: [11.5444, -72.9072], zoom: 13 },
  { id: 'san-andres',      nombre: 'San Andrés',        ll: [12.5847, -81.7006], zoom: 14 },
  { id: 'san-jose-gua',    nombre: 'San José del Guaviare', ll: [2.5729, -72.6459], zoom: 14 },
  { id: 'santa-marta',     nombre: 'Santa Marta',       ll: [11.2408, -74.1990], zoom: 13 },
  { id: 'sincelejo',       nombre: 'Sincelejo',         ll: [9.3047, -75.3978], zoom: 13 },
  { id: 'soacha',          nombre: 'Soacha',            ll: [4.5794, -74.2168], zoom: 13 },
  { id: 'soledad',         nombre: 'Soledad',           ll: [10.9178, -74.7646], zoom: 13 },
  { id: 'tulua',           nombre: 'Tuluá',             ll: [4.0847, -76.1954], zoom: 14 },
  { id: 'tunja',           nombre: 'Tunja',             ll: [5.5353, -73.3678], zoom: 13 },
  { id: 'valledupar',      nombre: 'Valledupar',        ll: [10.4631, -73.2532], zoom: 13 },
  { id: 'villavicencio',   nombre: 'Villavicencio',     ll: [4.1420, -73.6266], zoom: 13 },
  { id: 'yopal',           nombre: 'Yopal',             ll: [5.3378, -72.3959], zoom: 13 },
];

export const TODAS_CIUDADES = [...CIUDADES, ...MAS_CIUDADES];

export const ciudadPor = (id) => TODAS_CIUDADES.find((c) => c.id === id);

/* ── DONDE ESTÁ ELLA ───────────────────────────────────────────────
   Cuando concede la ubicación, el centro del mapa deja de ser una
   ciudad y pasa a ser ella. Se comporta como una ciudad más —tiene ll
   y zoom, y el buscador de sitios la trata igual— pero lleva
   `propia: true`, que es la marca que impide que nada de esto se
   escriba en ninguna caché. Ver js/ayuda.js. */
export const ciudadDeAqui = (ll) => ({
  id: 'aqui', nombre: 'donde estás', ll, zoom: 14, propia: true,
});

/* Sin tildes y sin mayúsculas: quien escribe «bogota» con el teclado a
   medio ver tiene que encontrar Bogotá igual. */
const plano = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/gu, '').toLowerCase().trim();

export function buscarCiudades(texto) {
  const q = plano(texto || '');
  if (!q) return MAS_CIUDADES;
  return TODAS_CIUDADES.filter((c) => plano(c.nombre).includes(q));
}

/* ── LAS CAPAS DEL MAPA DE EMERGENCIA ──────────────────────────────
   Qué se puede encender y apagar. Los nombres son los de la calle, no
   los de la nomenclatura sanitaria: «urgencias» y no «servicio de
   atención de urgencias de mediana complejidad».

   `osm` son las etiquetas de OpenStreetMap que caen en esta capa. Vive
   aquí y no en ayuda.js para que quien quiera revisar QUÉ se está
   pintando lo tenga junto al nombre que ve en pantalla. */
export const CAPAS = [
  { id: 'urgencias', nombre: 'Urgencias', pigmento: '#A33B2A',
    pie: 'Hospitales y clínicas con urgencias. La atención en salud nunca exige denuncia.',
    osm: ['amenity=hospital', 'healthcare=hospital'] },
  { id: 'salud', nombre: 'Centros de salud', pigmento: '#2F6B4F',
    pie: 'Centros y consultorios. Muchos no abren de noche: llama antes.',
    osm: ['amenity=clinic', 'amenity=doctors', 'healthcare=clinic', 'healthcare=centre'] },
  { id: 'apoyo', nombre: 'Acompañamiento', pigmento: '#4A6274',
    pie: 'Atención psicosocial, casas de acogida y servicios sociales.',
    osm: ['amenity=social_facility'] },
  { id: 'denuncia', nombre: 'Policía y fiscalía', pigmento: '#6B5B3E',
    pie: 'Solo si decides denunciar. No es requisito para que te atiendan.',
    osm: ['amenity=police', 'amenity=prosecutor'] },
];

export const capaPor = (id) => CAPAS.find((c) => c.id === id);

/* ── LOS TIPOS DE MARCA ────────────────────────────────────────────
   Lo que alguien puede dejar puesto en los mapas de luz y de sombra.
   Cerrado a propósito: una lista de opciones se responde con el pulgar
   y sin pensar, un campo de texto libre obliga a redactar. El texto
   libre existe, pero es opcional y va después.

   En sombra NO hay ninguna opción que nombre o describa a una persona.
   Se marca el sitio. Eso no es timidez: un mapa público de acusaciones
   es un problema legal para quien lo escribe y un arma para quien lo
   lee al revés. */
export const TIPOS_LUZ = [
  { id: 'estare',   nombre: 'Aquí voy a estar' },
  { id: 'vuelvo',   nombre: 'Paso por aquí y sigo' },
  { id: 'espero',   nombre: 'Aquí espero a alguien' },
  { id: 'seguro',   nombre: 'Sitio seguro si hay que ir' },
];

export const TIPOS_SOMBRA = [
  { id: 'paso',     nombre: 'Aquí pasó algo' },
  { id: 'evitar',   nombre: 'Mejor no venir' },
  { id: 'sola',     nombre: 'No venir sola' },
  { id: 'oscuro',   nombre: 'Sin luz, sin gente' },
];

export const tiposDe = (modo) => (modo === 'sombra' ? TIPOS_SOMBRA : TIPOS_LUZ);
export const tipoPor = (modo, id) =>
  tiposDe(modo).find((t) => t.id === id) || tiposDe(modo)[0];

/* ── LUGARES VERIFICADOS POR NOSOTROS ──────────────────────────────
   Cada entrada necesita LOS SEIS: capa, nombre, ll, ciudad, fuente y
   verificado (fecha ISO). Ejemplo de la forma esperada:

   { capa: 'urgencias', ciudad: 'medellin', nombre: '…',
     ll: [6.24, -75.58], direccion: '…', horario: '24 horas',
     telefono: '…', canal: 'presencial',
     fuente: 'https://…', verificado: '2026-08-09' }

   Vacío a propósito. Ver README → «Antes de publicar».

   Estos, cuando existan, se pintan SIEMPRE encima de los de
   OpenStreetMap y con otra marca: son los únicos que este proyecto
   sostiene con su nombre.                                          */
export const LUGARES = [];

export const verificados = () => LUGARES.filter((l) => l.fuente && l.verificado);
export const porCiudad = (ciudad) => verificados().filter((l) => l.ciudad === ciudad);
