/* ═══════════════════════════════════════════════════════════════════
   Galene — sacar las piezas del fondo de estudio y traerlas al papel.

   POR QUÉ. El catálogo trae las fotos del fabricante y son fotos de
   e-commerce: fondo blanco puro, luz de estudio, saturación alta. Sobre
   el papel de algodón del resto del sitio no se leen como piezas
   fotografiadas: se leen como cinco recuadros blancos pegados encima.
   Medido, entre el 55 % y el 79 % de cada imagen es blanco absoluto.

   QUÉ HACE, en este orden y por este motivo:

   1. RECORTE DEL COLLAGE. Alguna lámina no es una foto sino un montaje
      —la pieza a la derecha y cuatro círculos con manos a la izquierda,
      que es lenguaje de ficha de Amazon—. Se queda la pieza.

   2. FONDO FUERA, POR INUNDACIÓN DESDE EL BORDE. No por umbral global:
      un umbral se come también los blancos de DENTRO —la etiqueta, el
      hielo del vaso, un reflejo— y deja la pieza agujereada. Se inunda
      desde los cuatro cantos, así que solo cae el blanco que de verdad
      está conectado con el fondo.

   3. EL CANTO, SIN ORLA. Los píxeles del borde ya vienen mezclados con
      el blanco del estudio: si se les pone alfa parcial sin más, queda
      un halo claro alrededor de la pieza — el aspecto de recorte mal
      hecho. Se deshace la mezcla (`C = (C_visto − (1−a)·blanco) / a`),
      que es la operación inversa exacta de lo que hizo la cámara.

   4. LA PIEZA SE APAGA UN POCO. Menos saturación y los negros levantados
      hacia la tinta del sitio, que es el mismo tratamiento que llevan
      las garzas. En acuarela no hay negro absoluto ni rojo de catálogo;
      una foto que los conserva no pertenece a la lámina aunque esté
      bien recortada.

   Se ejecuta a mano cuando cambian las fotos:  node scripts/recortar-productos.mjs
   El resultado se versiona, para que compilar no dependa de esto.
   ═══════════════════════════════════════════════════════════════════ */
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

/* Las fotos del fabricante, tal como llegaron. Viven FUERA de
   `public/` a propósito: todo lo que hay ahí dentro se copia al
   compilado, y estas ya se copiaban —249 kB de originales viajando a
   producción para que nadie los mire—. Son material de trabajo, no del
   sitio. */
const ORIGEN = 'fuente/productos';
const DESTINO = 'public/productos';

/* Qué parte de cada lámina es la pieza. `null` = la lámina entera.
   Las fracciones van del ancho y el alto originales. */
const ENCUADRE = {
  /* El collage: cuatro círculos con manos a la izquierda y el vaso a la
     derecha. Se queda el vaso. */
  'funda-coletero': { izq: 0.30, arr: 0.00, der: 1.00, aba: 1.00 },
};

/* Un píxel es «fondo de estudio» si está casi en blanco y sin tinte.
   240 deja fuera el papel del sitio (#FBF7F0, con el azul en 240) y
   recoge el blanco de cámara, que nunca sale exactamente en 255. */
const SEMILLA = 240;   // para empezar a inundar
const BORDE = 216;     // hasta dónde se sigue considerando canto mezclado

function inundar(datos, w, h, canales) {
  /* 0 = pieza, 1 = fondo seguro, 2 = canto mezclado. */
  const marca = new Uint8Array(w * h);
  const cola = new Int32Array(w * h);
  let fin = 0;

  const claro = (i, umbral) => {
    const p = i * canales;
    const r = datos[p], g = datos[p + 1], b = datos[p + 2];
    const min = Math.min(r, g, b), max = Math.max(r, g, b);
    /* Sin tinte: un fondo de estudio es neutro. Así una pieza blanca
       pero cálida —el papel de una etiqueta— no se confunde con él. */
    return min >= umbral && max - min <= 14;
  };

  for (let x = 0; x < w; x++) {
    for (const y of [0, h - 1]) {
      const i = y * w + x;
      if (!marca[i] && claro(i, SEMILLA)) { marca[i] = 1; cola[fin++] = i; }
    }
  }
  for (let y = 0; y < h; y++) {
    for (const x of [0, w - 1]) {
      const i = y * w + x;
      if (!marca[i] && claro(i, SEMILLA)) { marca[i] = 1; cola[fin++] = i; }
    }
  }

  for (let cab = 0; cab < fin; cab++) {
    const i = cola[cab];
    const x = i % w, y = (i / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx;
      if (marca[j]) continue;
      if (claro(j, SEMILLA)) { marca[j] = 1; cola[fin++] = j; }
      else if (claro(j, BORDE)) { marca[j] = 2; }   // canto: se para aquí
    }
  }
  return marca;
}

async function una(id) {
  const entrada = join(ORIGEN, id + '.webp');
  const meta = await sharp(entrada).metadata();

  let img = sharp(entrada);
  const e = ENCUADRE[id];
  if (e) {
    img = img.extract({
      left: Math.round(meta.width * e.izq),
      top: Math.round(meta.height * e.arr),
      width: Math.round(meta.width * (e.der - e.izq)),
      height: Math.round(meta.height * (e.aba - e.arr)),
    });
  }

  const { data, info } = await img.ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  const marca = inundar(data, w, h, c);

  /* El alfa, y con él la mezcla deshecha. */
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let i = 0; i < w * h; i++) {
    const p = i * c;
    let a = 255;
    if (marca[i] === 1) {
      a = 0;
    } else if (marca[i] === 2) {
      /* Cuánto de este píxel es pieza: se estima por lo que le falta
         para ser blanco. Un canto a 230 sobre blanco 255 es un cuarto
         de pieza. */
      const min = Math.min(data[p], data[p + 1], data[p + 2]);
      a = Math.max(0, Math.min(255, Math.round((255 - min) * (255 / (255 - BORDE)))));
    }
    data[p + 3] = a;

    if (a > 8) {
      const x = i % w, y = (i / w) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (a < 250) {
        /* Deshacer la mezcla con el blanco. Sin esto queda una orla
           clara alrededor de toda la pieza. */
        const f = a / 255;
        for (let k = 0; k < 3; k++) {
          data[p + k] = Math.max(0, Math.min(255,
            Math.round((data[p + k] - 255 * (1 - f)) / f)));
        }
      }
    }
  }

  const margen = Math.round(Math.max(w, h) * 0.03);
  const izq = Math.max(0, x0 - margen);
  const arr = Math.max(0, y0 - margen);
  const der = Math.min(w - 1, x1 + margen);
  const aba = Math.min(h - 1, y1 + margen);
  const caja = { left: izq, top: arr, width: der - izq + 1, height: aba - arr + 1 };

  /* ── TODAS AL MISMO LIENZO Y A LA MISMA LÍNEA DE APOYO ───────────
     Recortada a su caja, cada pieza queda con la proporción que tenga:
     el tapón sale apaisado 864×411 y el sombrero vertical 551×674. En
     una retícula de fichas eso se ve como piezas de tamaños ópticos
     distintos, unas enormes y otras diminutas, y descuadra las
     tarjetas.

     Se montan sobre un cuadrado, ocupando la misma fracción de él y
     APOYADAS ABAJO, no centradas: en un mostrador las cosas se posan
     sobre la misma repisa. Así la sombra de aguada del CSS —que está
     a una altura fija— cae siempre donde la pieza toca. */
  const LADO = 900;
  const HUECO = 0.86;            // cuánto del cuadrado ocupa la pieza
  const SUELO = 0.06;            // aire por debajo, donde va la sombra
  const escala = Math.min(
    (LADO * HUECO) / caja.width,
    (LADO * (HUECO - SUELO)) / caja.height);
  const anchoP = Math.max(1, Math.round(caja.width * escala));
  const altoP = Math.max(1, Math.round(caja.height * escala));

  const pieza = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .extract(caja)
    /* La pieza se apaga hacia el papel: menos croma y los negros
       levantados a tinta, igual que las garzas. */
    .modulate({ saturation: 0.68 })
    .linear(0.93, 14)
    .resize(anchoP, altoP)
    .png()
    .toBuffer();

  const salida = join(DESTINO, id + '.webp');
  const info2 = await sharp({
    create: { width: LADO, height: LADO, channels: 4,
              background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{
      input: pieza,
      left: Math.round((LADO - anchoP) / 2),
      top: Math.round(LADO * (1 - SUELO)) - altoP,
    }])
    .webp({ quality: 82, alphaQuality: 90, effort: 6 })
    .toFile(salida);

  const blanco = await proporcionBlanca(salida);
  console.log(`  ${id.padEnd(16)} ${caja.width}×${caja.height} → `
    + `${info2.width}×${info2.height}  ${(info2.size / 1024).toFixed(0)} kB  `
    + `blanco puro ${blanco}%`);
}

/* La misma medida que hace la prueba, para no descubrirlo después. */
async function proporcionBlanca(archivo) {
  const { data, info } = await sharp(archivo).ensureAlpha()
    .resize(200, 200, { fit: 'inside' }).raw().toBuffer({ resolveWithObject: true });
  let blancos = 0, total = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i + 3] < 8) continue;
    total++;
    if (data[i] >= 246 && data[i + 1] >= 246 && data[i + 2] >= 246) blancos++;
  }
  return total ? Math.round((blancos / total) * 100) : 0;
}

const ids = readdirSync(ORIGEN).filter((f) => f.endsWith('.webp'))
  .map((f) => f.replace(/\.webp$/, ''));
console.log(`Recortando ${ids.length} piezas del fondo de estudio:`);
for (const id of ids) await una(id);
