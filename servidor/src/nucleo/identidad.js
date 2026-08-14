/* ═══════════════════════════════════════════════════════════════════
   identidad.js — QUIÉN ERES AQUÍ, QUE ES CASI NADIE.

   No hay cuentas. No hay cookies. No hay correo. Lo único que ata dos
   cosas a la misma persona es un token opaco que EL NAVEGADOR GUARDA
   DONDE QUIERA — y el sitio lo guarda en `sessionStorage`, que muere al
   cerrar la pestaña. Esa decisión es del frontend, no de aquí, y el
   servidor está escrito para que sea posible: nada de lo que hace exige
   que el token sobreviva a la visita.

   Del token, el servidor NO GUARDA EL TOKEN. Guarda
   sha256(token + secreto), que sirve para reconocer («esta garza es la
   tuya», «este voto ya lo pusiste») y no sirve para suplantar: con la
   base delante no se puede fabricar el token que produce un hash.

   ── LA IP ──────────────────────────────────────────────────────────
   Hace falta para limitar: sin ella, pedir otro token es gratis y el
   límite por sesión no limita nada. Y NO SE GUARDA. Se convierte en
   sha256(ip + sal_del_día), la sal se sortea al arrancar y se cambia
   cada 24 h, y el resultado vive SOLO EN MEMORIA, en los cubos. No hay
   tabla, no hay registro, no hay fichero. Al día siguiente la huella de
   ayer no se puede recalcular ni teniendo la IP.
   ═══════════════════════════════════════════════════════════════════ */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { SECRETO, config } from '../config.js';

const sha = (txt) => createHash('sha256').update(txt).digest('hex');

/* ── EL TOKEN DE SESIÓN ────────────────────────────────────────────
   128 bits. No lleva dentro ninguna información —ni cuándo se creó, ni
   de dónde—: es un número al azar y punto. Un JWT aquí sería peor por
   dos motivos: dice cuándo nació (o sea, correlaciona), y hay que
   revocarlo. Esto no se revoca porque no abre nada. */
export const nuevoToken = () => randomBytes(16).toString('hex');
export const esToken = (t) => typeof t === 'string' && /^[0-9a-f]{32}$/.test(t);
export const hashSesion = (token) => sha(token + '·sesion·' + SECRETO).slice(0, 32);

/* ── LA LLAVE DE BORRADO ───────────────────────────────────────────
   Se devuelve UNA VEZ, al publicar, y no se vuelve a poder leer. Es lo
   que permite borrar mañana lo que se escribió esta madrugada aunque la
   pestaña se haya cerrado —y en un sitio como este, poder deshacer lo
   dicho no es una comodidad, es parte del trato.

   Alfabeto sin 0/O ni 1/l/I: se copia a mano de una pantalla a un papel
   y de un papel a un teclado. */
const ALFABETO = '23456789abcdefghjkmnpqrstuvwxyz';
export function nuevaLlave() {
  const b = randomBytes(12);
  let s = '';
  for (let i = 0; i < 12; i++) {
    if (i === 4 || i === 8) s += '-';
    s += ALFABETO[b[i] % ALFABETO.length];
  }
  return s;                                   // p. ej. 'k7m2-p4q9-r3t8'
}
export const hashLlave = (llave) => sha(llave.trim().toLowerCase() + '·llave·' + SECRETO);

/* Comparación en tiempo constante. Sobre un hash hexadecimal de la
   misma longitud siempre, así que el largo no filtra nada. */
export function llaveCoincide(llave, guardado) {
  if (!guardado || typeof llave !== 'string') return false;
  const a = Buffer.from(hashLlave(llave), 'utf8');
  const b = Buffer.from(guardado, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

/* ── LA HUELLA DE LA IP ────────────────────────────────────────────
   La sal se rota sola. `rotada` se comprueba al leer y no con un
   temporizador: un `setInterval` de 24 h mantiene vivo el proceso y
   además no se entera de que la máquina estuvo suspendida. */
let sal = randomBytes(16).toString('hex');
let rotada = Date.now();
const DIA = 24 * 60 * 60 * 1000;

export function huella(req) {
  if (Date.now() - rotada > DIA) { sal = randomBytes(16).toString('hex'); rotada = Date.now(); }
  return sha(ipDe(req) + sal).slice(0, 24);
}

export function ipDe(req) {
  if (config.confiarProxy) {
    /* El PRIMERO de X-Forwarded-For es el cliente; los siguientes son
       los proxys. Sin proxy delante esta cabecera la escribe cualquiera,
       y por eso solo se lee cuando se ha dicho que hay uno. */
    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string' && xff.length) return xff.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '0.0.0.0';
}

/* ── EL SELLO ──────────────────────────────────────────────────────
   La garza que acompaña a quien escribe. Sale del hash de la sesión y
   no de un aleatorio, por lo mismo que en Sello.astro el giro sale del
   nombre: la misma persona tiene que llevar la misma garza en todos sus
   mensajes, o el hilo parece escrito por doce desconocidas.

   Y no identifica: seis poses y dos espejados son doce combinaciones
   para toda la comunidad. No distingue a nadie de nadie. */
export function selloDe(clave) {
  /* Se vuelve a pasar por el hash en vez de leer el principio de la
     cadena como hexadecimal. Costó un fallo: `parseInt('nueva', 16)` es
     NaN, `poses[NaN % 6]` es undefined, y lo que llegaba a la base era
     una columna NOT NULL sin valor. Así funciona con cualquier cadena,
     venga de donde venga. */
  const n = parseInt(sha(clave + '·sello·' + SECRETO).slice(0, 8), 16);
  const poses = config.garzas.poses;
  return { pose: poses[n % poses.length], mira: ((n >> 8) & 1) ? 1 : -1 };
}

/* Un número 0..1 estable a partir de cualquier cadena. Se usa para
   repartir poses y tamaños de forma reproducible: la misma garza sale
   igual aunque el servidor se reinicie. */
export function azarDe(cadena, ronda = 0) {
  const h = sha(cadena + '·' + ronda);
  return parseInt(h.slice(0, 13), 16) / 2 ** 52;
}
