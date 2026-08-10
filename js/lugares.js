/* ═══════════════════════════════════════════════════════════════════
   lugares.js — la cartografía.

   REGLA QUE MANDA SOBRE ESTE ARCHIVO: aquí no se inventa un solo punto.
   Una dirección equivocada en un mapa de emergencias manda a alguien a
   una puerta cerrada a las 4 de la mañana. Es peor que no tener mapa.

   Las CIUDADES son coordenadas geográficas, verificables y neutras: van
   con datos reales. Los LUGARES —hospitales, centros de atención— van
   vacíos hasta que cada uno tenga dirección comprobada, horario real y
   fecha de verificación. El mapa funciona igual: se puede mover, hacer
   zoom y poner el puntero. Lo que no hace es mentir.

   Para añadir un lugar hacen falta los seis campos. Sin los seis, la
   interfaz lo pinta como no verificado y lo dice en la cara.
   ═══════════════════════════════════════════════════════════════════ */

export const CIUDADES = [
  { id: 'bogota',       nombre: 'Bogotá',        ll: [4.7110, -74.0721], zoom: 11 },
  { id: 'medellin',     nombre: 'Medellín',      ll: [6.2442, -75.5812], zoom: 12 },
  { id: 'cali',         nombre: 'Cali',          ll: [3.4516, -76.5320], zoom: 12 },
  { id: 'barranquilla', nombre: 'Barranquilla',  ll: [10.9685, -74.7813], zoom: 12 },
  { id: 'cartagena',    nombre: 'Cartagena',     ll: [10.3910, -75.4794], zoom: 12 },
  { id: 'bucaramanga',  nombre: 'Bucaramanga',   ll: [7.1193, -73.1227], zoom: 12 },
  { id: 'pereira',      nombre: 'Pereira',       ll: [4.8133, -75.6961], zoom: 13 },
  { id: 'manizales',    nombre: 'Manizales',     ll: [5.0703, -75.5138], zoom: 13 },
];

export const CAPAS = [
  { id: 'urgencias', nombre: 'Urgencias',
    pie: 'Atienden violencia sexual como urgencia médica. No exigen denuncia.' },
  { id: 'acompanamiento', nombre: 'Acompañamiento',
    pie: 'Atención psicosocial y jurídica. Algunas acompañan en territorio.' },
  { id: 'forense', nombre: 'Examen médico-legal',
    pie: 'Recolección de evidencia con cadena de custodia.' },
];

/* Cada entrada necesita LOS SEIS: capa, nombre, ll, ciudad, fuente y
   verificado (fecha ISO). Ejemplo de la forma esperada:

   { capa: 'urgencias', ciudad: 'medellin', nombre: '…',
     ll: [6.24, -75.58], direccion: '…', horario: '24 horas',
     telefono: '…', canal: 'presencial',
     fuente: 'https://…', verificado: '2026-08-09' }

   Vacío a propósito. Ver README → «Antes de publicar».            */
export const LUGARES = [];

export const verificados = () => LUGARES.filter((l) => l.fuente && l.verificado);
export const porCiudad = (ciudad) => verificados().filter((l) => l.ciudad === ciudad);
