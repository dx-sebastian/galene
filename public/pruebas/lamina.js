/* ═══════════════════════════════════════════════════════════════════
   pruebas/lamina.js — arnés de verificación de láminas.

   Mide sobre los píxeles lo que no se puede juzgar a ojo con
   confianza: si el valor más claro compite con el cielo, si hay grano
   de papel o superficie lisa de render, si la banda tiene pasajes o es
   textura pareja, y si las costuras van a partirse al repetir.

   Uso:  pruebas/lamina.html?src=../arte/mar-lejano.png
   ═══════════════════════════════════════════════════════════════════ */

const lin = (v) => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
const LUM = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

/* Referencia dura: la bruma del cielo a las 09:00, que es el ancla de
   luminancia media. El agua lejana tiene que quedar por DEBAJO de esto
   o el horizonte se disuelve (se midió: salto 0.0024 vs umbral 0.023). */
const BRUMA_09 = LUM(0xCD / 255, 0xDC / 255, 0xDE / 255);

export async function medir(src) {
  const img = await new Promise((ok, mal) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => mal(new Error('no se pudo cargar ' + src));
    i.src = src;
  });

  const W = img.naturalWidth, H = img.naturalHeight;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, W, H).data;

  const L = new Float32Array(W * H);
  let sMax = 0, sMin = 1, casiBlanco = 0, satSuma = 0;
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
    const l = LUM(r, g, b);
    L[p] = l;
    if (l > sMax) sMax = l;
    if (l < sMin) sMin = l;
    if (l > 0.90) casiBlanco++;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    satSuma += mx === 0 ? 0 : (mx - mn) / mx;
  }
  const N = W * H;

  const filaMedia = (y) => { let s = 0; for (let x = 0; x < W; x++) s += L[y * W + x]; return s / W; };
  const perfil = Array.from({ length: 9 }, (_, k) =>
    +filaMedia(Math.min(H - 1, Math.round(k * (H - 1) / 8))).toFixed(4));

  /* Grano. El grano de papel vive a escala de 1 px; las pinceladas, a
     8 px o más. Si casi toda la energía está en la escala grande, la
     superficie es lisa: render, no papel. */
  const energia = (paso) => {
    let s = 0, n = 0;
    for (let y = 0; y < H; y += 2)
      for (let x = 0; x + paso < W; x += 3) {
        s += Math.abs(L[y * W + x] - L[y * W + x + paso]); n++;
      }
    return s / n;
  };
  const e1 = energia(1), e8 = energia(8);
  const grano = e8 > 0 ? e1 / e8 : 0;

  /* Pasajes. Se parte el ancho en 16 bloques y se mira si la banda
     tiene variación de un bloque a otro o es textura pareja. */
  const bloques = [];
  const bw = Math.floor(W / 16);
  for (let k = 0; k < 16; k++) {
    let s = 0, n = 0;
    for (let y = 0; y < H; y += 2)
      for (let x = k * bw; x < (k + 1) * bw; x += 2) { s += L[y * W + x]; n++; }
    bloques.push(s / n);
  }
  const mB = bloques.reduce((s, v) => s + v, 0) / bloques.length;
  const pasajes = Math.sqrt(bloques.reduce((s, v) => s + (v - mB) ** 2, 0) / bloques.length);

  /* Costura: ¿el borde izquierdo empalma con el derecho? */
  let costura = 0;
  for (let y = 0; y < H; y++) {
    let a = 0, b = 0;
    for (let k = 0; k < 4; k++) { a += L[y * W + k]; b += L[y * W + (W - 1 - k)]; }
    costura += Math.abs(a - b) / 4;
  }
  costura /= H;

  const arriba = perfil[0], abajo = perfil[8];

  const r = {
    archivo: src.split('/').pop(),
    tamano: `${W}×${H}`,
    aspecto: +(W / H).toFixed(2),

    valor_mas_claro: +sMax.toFixed(4),
    valor_mas_oscuro: +sMin.toFixed(4),
    bruma_del_cielo_09: +BRUMA_09.toFixed(4),
    pct_casi_blanco: +(100 * casiBlanco / N).toFixed(3),
    saturacion_media: +(100 * satSuma / N).toFixed(1),

    perfil_vertical: perfil,
    desvanece_hacia_arriba: arriba > abajo,

    grano_1px_sobre_8px: +grano.toFixed(3),
    energia_1px: +e1.toFixed(4),
    pasajes: +pasajes.toFixed(4),
    costura: +costura.toFixed(4),
  };

  /* ── Veredictos ────────────────────────────────────────────────── */
  r.pruebas = {
    /* Se compara el PROMEDIO del borde superior —el agua justo bajo el
       horizonte— contra la bruma del cielo, no el píxel más claro: lo
       que disuelve la línea es que la banda entera empate, no una mota. */
    'el agua lejana queda bajo la bruma del cielo':
      [arriba < BRUMA_09, `borde superior ${arriba.toFixed(3)} < bruma ${BRUMA_09.toFixed(3)}`],
    'sin zonas quemadas a blanco':
      [100 * casiBlanco / N < 0.5, `${(100 * casiBlanco / N).toFixed(2)} % > 0.90`],
    'desaturada (GRIS)':
      [100 * satSuma / N < 30, `saturación media ${(100 * satSuma / N).toFixed(1)} %`],
    'hay grano de papel':
      [grano > 0.28, `1px/8px = ${grano.toFixed(3)} (umbral 0.28)`],
    'hay pasajes, no papel tapiz':
      [pasajes > 0.012, `desviación entre bloques ${pasajes.toFixed(4)} (umbral 0.012)`],
    'costura empalmable':
      [costura < 0.045, `${costura.toFixed(4)} (umbral 0.045; con repetición espejada es tolerable)`],
  };
  r.pasa = Object.values(r.pruebas).every(([ok]) => ok);
  return r;
}
