/* ═══════════════════════════════════════════════════════════════════
   config.js — TODAS LAS PERILLAS, EN UN SITIO.

   Ninguna constante de comportamiento vive dentro de su módulo: si un
   número decide algo que se ve o algo que se guarda, vive aquí y llega
   desde el entorno. La razón es la misma que la del sitio: lo que se
   ajusta a ojo hay que poder ajustarlo sin volver a desplegar, y lo que
   se mide hay que poder pisarlo para medirlo.

   `.env` se lee con `process.loadEnvFile`, que trae Node. Sin fichero,
   se sigue: los valores por defecto son los de desarrollo.
   ═══════════════════════════════════════════════════════════════════ */

import { randomBytes } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

try { process.loadEnvFile(resolve(RAIZ, '.env')); } catch { /* sin .env, valores por defecto */ }

const txt = (clave, porDefecto) => {
  const v = process.env[clave];
  return v === undefined || v === '' ? porDefecto : v;
};
const num = (clave, porDefecto) => {
  const v = Number(process.env[clave]);
  return Number.isFinite(v) ? v : porDefecto;
};
const bool = (clave, porDefecto) => {
  const v = txt(clave, null);
  return v === null ? porDefecto : v === '1' || v === 'true' || v === 'si';
};

/* EL SECRETO. Si no se pone, se inventa uno por arranque y se avisa: el
   servidor funciona, pero al reiniciar caducan todas las sesiones y
   todas las llaves de borrado, porque las dos cosas son hashes con esta
   sal. En desarrollo da igual; en producción es un fallo de datos. */
const secretoDado = txt('GALENE_SECRETO', '');
export const SECRETO_EFIMERO = secretoDado === '';
export const SECRETO = secretoDado || randomBytes(32).toString('hex');

export const config = {
  puerto: num('GALENE_PUERTO', 5178),
  host: txt('GALENE_HOST', '0.0.0.0'),

  /* Sin comodín y sin credenciales. La API no usa cookies —ninguna—, así
     que no hay nada que un origen tercero pueda robar por sesión; pero
     un `*` dejaría que cualquier página escribiera en la comunidad en
     nombre de quien la esté visitando, y eso sí importa. */
  origenes: txt('GALENE_ORIGENES', 'http://localhost:5177,http://127.0.0.1:5177')
    .split(',').map((o) => o.trim()).filter(Boolean),
  confiarProxy: bool('GALENE_CONFIAR_PROXY', false),

  base: resolve(RAIZ, txt('GALENE_BASE', './datos/galene.db')),
  llaveModeracion: txt('GALENE_LLAVE_MODERACION', ''),

  /* ── LA BANDADA ─────────────────────────────────────────────────
     Diez vivas y once perchas: siempre sobra sitio, así que dos garzas
     nunca caen en la misma rama.

     ⚠ ONCE, NO DOCE. `PERCHAS` en `src/js/main.js` lleva escrito encima
     «Doce sitios MEDIDOS» y el array tiene ONCE entradas — en algún
     momento se cayó una y el comentario se quedó. Este número TIENE que
     coincidir con `PERCHAS.length`: si el servidor reparte una percha
     12, el navegador se va a buscar `PERCHAS[11]`, que es `undefined`, y
     la garza aparece sin coordenadas. Si algún día se repinta el manglar
     y se miden más ramas, se cambian los dos sitios. */
  garzas: {
    max: num('GALENE_GARZAS_MAX', 10),
    perchas: num('GALENE_PERCHAS', 11),
    picoAjeno: bool('GALENE_PICO_AJENO', true),
    /* Las seis láminas posadas que ya existen en public/arte/posada/.
       El servidor reparte poses porque el árbol tiene que salir IGUAL
       para todo el mundo: si la pose la sorteara cada navegador, dos
       personas mirando la misma bandada verían dos árboles. */
    poses: ['reposo', 'alerta', 'encogida', 'una-pata', 'mira-abajo', 'alas'],
    /* Pesos de la mezcla de un dormidero de verdad: muchas ahuecadas y
       a la pata coja, alguna alerta, casi ninguna con las alas abiertas
       —una pose de gesto congelada para siempre delata la lámina. */
    pesosPose: [3, 1, 4, 4, 1, 0.4],
    escalaMin: 0.86,
    escalaMax: 1.10,
  },

  /* ── EL MAR ─────────────────────────────────────────────────────
     La curva es la del README: calma = base + rango·(1 − e^(−n/τ)).
     Lo que el servidor añade es que `n` por fin existe.

     `sintonia` viaja al navegador en el saludo. Son las perillas del
     gesto, y están aquí y no en el shader para poder subirlas sin
     volver a construir el sitio.

     ⚠ LOS NÚMEROS DE `sintonia` NO ESTÁN MEDIDOS. Son la propuesta de
     «más potente» que se pidió, escrita contra los valores que tenía el
     código (radio 0.13→0.95, τ 9 s, techo 0.85). Hay que pasarlos por
     `window.__mar.medir(hora, paso, t, calma)` antes de darlos por
     buenos, que es como se decide todo lo que se ve en este proyecto. */
  mar: {
    topeSesion: num('GALENE_TOPE_SESION', 240),
    tauRaices: num('GALENE_TAU_RAICES', 500),
    techoRaices: num('GALENE_TECHO_RAICES', 0.55),
    /* Cada segundo sostenido cuenta por 1.5 raíces, como en main.js. */
    gananciaRaiz: num('GALENE_GANANCIA_RAIZ', 1.5),
    hzDifusion: num('GALENE_HZ_DIFUSION', 12),
    maxPunteros: num('GALENE_MAX_PUNTEROS', 3),
    maxDifundidos: num('GALENE_MAX_DIFUNDIDOS', 8),
    /* Un toque que deja de recibir noticias se suelta solo: si un móvil
       se bloquea con el dedo puesto, su toque no se queda clavado en el
       agua de todos los demás. */
    caducaToque: num('GALENE_CADUCA_TOQUE', 2500),
    sintonia: {
      base: 0.35,
      rango: 0.50,
      tauSesion: num('GALENE_TAU_SESION', 6),
      techoSesion: num('GALENE_TECHO_SESION', 0.92),
      radioMin: num('GALENE_RADIO_MIN', 0.16),
      radioMax: num('GALENE_RADIO_MAX', 1.30),
      anillos: 3,
      anilloVel: num('GALENE_ANILLO_VEL', 0.40),
      subeFuerza: num('GALENE_SUBE_FUERZA', 1.6),
      ganancia: num('GALENE_GANANCIA', 1.0),
      hzEnvio: num('GALENE_HZ_ENVIO', 15),
    },
  },

  /* ── LA COMUNIDAD ───────────────────────────────────────────────
     Las etiquetas son las mismas cinco de siempre, con sus pigmentos.
     Viven en el servidor porque ahora es él quien manda los hilos, y un
     hilo con una etiqueta que el sitio no conoce no se puede pintar. */
  foro: {
    moderacion: txt('GALENE_MODERACION', 'posterior'),
    reportesOcultar: num('GALENE_REPORTES_OCULTAR', 3),
    diasRetencion: num('GALENE_DIAS_RETENCION', 30),
    limitePagina: num('GALENE_LIMITE_PAGINA', 12),
    limitePaginaMax: num('GALENE_LIMITE_PAGINA_MAX', 30),
    etiquetas: [
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
    ],
    /* Medidas del texto. El título corto obliga a decir una cosa; el
       cuerpo largo permite contarla entera. */
    tituloMin: 8, tituloMax: 140,
    cuerpoMin: 1, cuerpoMax: 4000,
    comentarioMin: 1, comentarioMax: 2000,
    nombreMax: 24,
  },

  /* ── LOS CUBOS ──────────────────────────────────────────────────
     [fichas, recarga por segundo]. Un cubo se vacía de golpe y se llena
     despacio: permite el gesto natural (votar tres cosas seguidas) y no
     permite el automático.

     Se limita por sesión Y por huella de IP. Solo por sesión no limita
     nada —basta pedir otro token—; solo por IP castiga a media
     universidad detrás del mismo NAT. */
  limites: {
    /* El cubo de INTENTOS es ancho: recoge las erratas, los reenvíos y
       el doble clic. El de publicación es estrecho y solo se cobra
       cuando algo se publicó de verdad. Ver limites.js. */
    intento:    [20, 1 / 3],
    hilo:       [2, 1 / 90],
    comentario: [4, 1 / 20],
    voto:       [12, 1 / 2],
    pico:       [10, 1 / 3],
    garza:      [4, 1 / 300],
    reporte:    [4, 1 / 60],
    lectura:    [90, 3],
    conexion:   [10, 1 / 6],
  },
};

/* La curva de calma, en un solo sitio: la usan el mar, el saludo y las
   pruebas, y tres copias de una fórmula son tres fórmulas el día que
   alguien toque una. */
export function calmaDeRaices(raices) {
  const { base, rango } = config.mar.sintonia;
  const bruto = 1 - Math.exp(-raices / config.mar.tauRaices);
  return base + rango * Math.min(bruto, config.mar.techoRaices);
}
