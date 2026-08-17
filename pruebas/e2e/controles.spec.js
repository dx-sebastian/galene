/* ═══════════════════════════════════════════════════════════════════
   Galene — que todo lo que se toca hable el mismo idioma.

   ── DE DÓNDE SALE ──────────────────────────────────────────────────
   De un inventario de la edición 4964bbb, contando sobre los píxeles
   lo que de verdad había:

       portada    6 radios distintos en controles · 1 familia de sombra
       comunidad  4 radios · 7 familias de sombra · 47 píldoras
       expertos   1 radio  · 1 sombra
       productos  2 radios · 1 sombra

   Seis radios no son un lenguaje: eran 2px, 6px, 6.4px, 10px, 14px y
   999px —cinco de ellos a menos de ocho píxeles unos de otros, o sea
   indistinguibles— cada uno puesto un día distinto. Y siete sombras en
   el foro es lo que delata que esa página se diseñó aparte.

   El problema no es la variedad por la variedad. Es que un sitio cuya
   tesis es que todo está pintado tiene sus botones, sus fichas y sus
   barras dibujados con las piezas por defecto de una herramienta de
   interfaz — y el jurado de diseño no puntúa el fondo, puntúa lo que
   pasa cuando mueve el ratón.

   ── LO QUE MIDE Y LO QUE NO ────────────────────────────────────────
   Cuenta FORMAS distintas, no si son bonitas. Que un botón sea bello
   no lo puede decir una prueba; que en la misma página haya siete
   maneras distintas de redondear una esquina, sí — y eso basta para
   impedir que la próxima pieza llegue con la suya.

   Las formas orgánicas —`34px 14px 26px 30px / 22px 32px 18px 28px` y
   compañía— NO son ruido: son el lenguaje. Van contadas como una sola
   entrada, porque son el mismo gesto, no siete decisiones.
   ═══════════════════════════════════════════════════════════════════ */
import { test, expect } from '@playwright/test';

const PAGINAS = [
  ['portada', ''],
  ['comunidad', 'comunidad/'],
  ['expertos', 'expertos/'],
  ['productos', 'productos/'],
  ['ficha', 'productos/funda-coletero/'],
  ['acerca', 'acerca/'],
];

/* Cuántas formas geométricas distintas se toleran en los controles de
   una página. Dos —el canto de tinta y la píldora— más las orgánicas
   contadas como una. Tres es el techo, no el objetivo. */
const RADIOS = 3;

/* Y cuántas familias de sombra en toda la página. Una. La acuarela no
   proyecta sombras de caja: lo que separa una pieza del papel es que
   está pintada encima, no que flote sobre él. La excepción declarada
   es la barra fija, que sí se despega de verdad al desplazarse. */
const SOMBRAS = 2;

/* ── LA DEUDA, ESCRITA Y NO ESCONDIDA ──────────────────────────────
   El foro no cumple, y no por descuido: se diseñó aparte y tiene su
   propio sistema —cristal, sombras suaves, esquinas de 26 px—. Traerlo
   al cuaderno no es cambiar tres declaraciones, es rehacer la
   identidad de la página, y eso es la fase 4.

   Bajar el listón general para que pase sería mentir; excluirlo del
   inventario, también. Así que aquí está su número de hoy, con fecha,
   y la prueba exige que NO EMPEORE. El día que la fase 4 lo repinte,
   estas dos líneas se borran y el foro entra por la puerta normal. */
const DEUDA = {
  comunidad: { radios: 4, sombras: 7, paga: 'fase 4 · el foro vuelve al cuaderno' },
};

/** Una forma orgánica es la que tiene más de dos valores por eje: son
    las esquinas dibujadas a mano de las aguadas. Todas cuentan como
    una sola entrada del vocabulario. */
const esOrganico = (r) => r.split('/').some((lado) => lado.trim().split(/\s+/).length > 2);

async function inventario(page) {
  return page.evaluate(() => {
    const visible = (el) => {
      if (!el.getClientRects().length) return false;
      const cs = getComputedStyle(el);
      return cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.02;
    };
    const radios = new Map(), sombras = new Map();
    const CONTROL = 'a, button, summary, label, input, select, textarea';
    for (const el of document.querySelectorAll(CONTROL)) {
      if (!visible(el)) continue;
      const r = getComputedStyle(el).borderRadius;
      if (r === '0px' || !r) continue;
      if (!radios.has(r)) radios.set(r, []);
      radios.get(r).push(el.className?.toString?.().slice(0, 46) || el.tagName);
    }
    for (const el of document.querySelectorAll('body *')) {
      if (!visible(el)) continue;
      const s = getComputedStyle(el).boxShadow;
      if (!s || s === 'none') continue;
      if (!sombras.has(s)) sombras.set(s, []);
      sombras.get(s).push(el.className?.toString?.().slice(0, 46) || el.tagName);
    }
    const salida = (m) => [...m.entries()].map(([k, v]) => [k, v.length, v[0]]);
    return { radios: salida(radios), sombras: salida(sombras) };
  });
}

for (const [nombre, ruta] of PAGINAS) {
  test(`controles · ${nombre} habla un solo idioma de formas`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(ruta, { waitUntil: 'load', timeout: 90_000 });
    /* Las escenas revelan al bajar: sin recorrer la página, media
       interfaz está a opacidad cero y no se inventaría. */
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        window.scrollTo(0, y);
        await new Promise((r) => requestAnimationFrame(r));
      }
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 400));
    });
    /* Y con el menú abierto: sus enlaces son controles como los demás
       y en móvil son los únicos que hay. */
    await page.locator('.barra__menu, .menu__abrir').first().click({ timeout: 2000 })
      .catch(() => { /* en escritorio no existe */ });
    await page.waitForTimeout(300);

    const inv = await inventario(page);

    /* Las orgánicas, a una sola entrada. */
    const geometricos = inv.radios.filter(([r]) => !esOrganico(r));
    const organicos = inv.radios.filter(([r]) => esOrganico(r));
    const vocabulario = geometricos.length + (organicos.length ? 1 : 0);

    console.log(`  ${nombre} — ${vocabulario} formas`
      + ` (${geometricos.length} geométricas + ${organicos.length} orgánicas)`
      + ` · ${inv.sombras.length} sombras`);
    for (const [r, n, quien] of geometricos) console.log(`      radio ${r} ×${n} — ${quien}`);
    if (organicos.length) console.log(`      orgánicas ×${organicos.length} — ${organicos[0][2]}`);
    for (const [s, n, quien] of inv.sombras) console.log(`      sombra ×${n} ${quien} — ${s.slice(0, 60)}`);

    const debe = DEUDA[nombre];
    if (debe) {
      console.log(`      · deuda declarada: ${debe.radios} radios / ${debe.sombras} sombras`
        + ` — la paga la ${debe.paga}`);
    }
    expect(vocabulario,
      `${nombre} redondea sus controles de ${vocabulario} maneras distintas`)
      .toBeLessThanOrEqual(debe ? debe.radios : RADIOS);
    expect(inv.sombras.length,
      `${nombre} tiene ${inv.sombras.length} familias de sombra`)
      .toBeLessThanOrEqual(debe ? debe.sombras : SOMBRAS);
  });
}

/* ═══════════════════════════════════════════════════════════════════
   Y QUE REPINTARLO NO SE HAYA COMIDO LA LEGIBILIDAD.

   El botón del reloj perdió su borde de 2 px y su relleno plano: ahora
   es una mancha con canto mojado, poso abajo y dos mordiscos en el
   contorno. Todo eso mueve el color que hay DEBAJO DEL RÓTULO, y el
   rótulo es blanco.

   Se mide como el héroe —sobre los píxeles pintados, no sobre lo que
   diga la hoja de estilos— porque aquí el fondo del texto no lo pone
   una declaración: lo ponen dos pseudoelementos, un degradado radial,
   uno lineal, el grano del papel y un modo de fusión.

   Y se toma el píxel MÁS CLARO de la zona del rótulo (p99), no la
   media: el texto es blanco, así que el peor caso es el punto donde el
   pigmento adelgaza más. Una media aprobaría un botón con una calva.

   ── POR QUÉ NO HAY UNA VERSIÓN NOCTURNA ────────────────────────────
   Se escribió, midió 7.04:1 igual que la diurna y se retiró, porque no
   estaba midiendo nada: en este sitio LA HOJA NO ANOCHECE. Lo dice
   js/hora.js sin ambigüedad — la pintura vive con la hora, la página
   es siempre papel, y `data-tinta` se escribe fijo en 'oscura'. Medido
   a las 13, a las 21 y a las 2, el papel es el mismo #F8F5F0.

   O sea que las reglas `[data-tinta="clara"]` de este botón están
   dormidas a propósito, y una prueba «de noche» habría sido una
   garantía falsa: verde siempre, comprobando cero.
   ═══════════════════════════════════════════════════════════════════ */
{
  test('controles · el rótulo del botón pintado se lee', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('?hora=13&presencia=off', { waitUntil: 'load', timeout: 90_000 });
    const boton = page.locator('.rr__ficha--nose .acuarela').first();
    await boton.evaluate((n) => n.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(600);

    const caja = await boton.boundingBox();
    expect(caja, 'no se encontró el botón del reloj').toBeTruthy();

    const tinta = await boton.evaluate((n) => getComputedStyle(n).color);
    await page.addStyleTag({ content:
      `.acuarela, .acuarela * { color: transparent !important;
       -webkit-text-fill-color: transparent !important; }` });
    await page.waitForTimeout(300);
    const captura = (await page.screenshot()).toString('base64');

    const r = await page.evaluate(async ({ caja, captura, tinta }) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + captura;
      await img.decode();
      const l = document.createElement('canvas');
      l.width = img.width; l.height = img.height;
      const cx = l.getContext('2d');
      cx.drawImage(img, 0, 0);
      const k = img.width / window.innerWidth;

      /* Solo la banda donde de verdad hay letras: el rótulo está
         centrado y no llega a los cantos, que es donde la mancha
         adelgaza a propósito. */
      const x = Math.round((caja.x + caja.width * 0.18) * k);
      const y = Math.round((caja.y + caja.height * 0.3) * k);
      const w = Math.round(caja.width * 0.64 * k);
      const h = Math.round(caja.height * 0.4 * k);
      const d = cx.getImageData(x, y, w, h).data;

      const linz = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
      const lum = (rr, gg, bb) =>
        0.2126 * linz(rr / 255) + 0.7152 * linz(gg / 255) + 0.0722 * linz(bb / 255);

      const luces = [];
      for (let i = 0; i < d.length; i += 4) luces.push(lum(d[i], d[i + 1], d[i + 2]));
      luces.sort((a, b) => a - b);
      const fondo = luces[Math.floor(luces.length * 0.99)];

      const m = tinta.match(/[\d.]+/g).map(Number);
      const texto = lum(m[0], m[1], m[2]);
      const contraste = (Math.max(fondo, texto) + 0.05) / (Math.min(fondo, texto) + 0.05);
      return { contraste: +contraste.toFixed(2), pixeles: luces.length };
    }, { caja, captura, tinta });

    console.log(`  botón: ${r.contraste}:1 en el peor punto`
      + ` (${r.pixeles} píxeles medidos)`);
    /* 4.5:1 es el mínimo de la norma para texto normal. Este rótulo va
       en 600 y a --t-md, o sea que no llega a «texto grande»: se le
       exige el 4.5 entero. */
    expect(r.contraste, 'el rótulo del botón se cae').toBeGreaterThanOrEqual(4.5);
  });
}

/* ═══════════════════════════════════════════════════════════════════
   Y CÓMO SE MUEVE LO QUE SE TOCA.

   Medido con el movimiento encendido sobre la edición publicada:
   103 elementos con transición y **238 curvas `linear`** — el valor por
   defecto del navegador— contra 17 que usaban la curva pensada que este
   sitio ya tenía escrita.

   `linear` es velocidad constante, arranque instantáneo y parada seca.
   Es como se mueve una máquina, no como se mueve nada que tenga peso, y
   es lo que hace que una interfaz se sienta de plantilla aunque cada
   pieza esté bien dibujada. Un jurado de diseño no lo ve: lo nota con
   el ratón.

   Esta prueba no juzga la curva —eso es una decisión, y está tomada en
   `--paso`—. Lo que impide es que vuelva a colarse el valor por
   defecto, que es como llegaron las 238.
   ═══════════════════════════════════════════════════════════════════ */
for (const [nombre, ruta] of [['portada', ''], ['comunidad', 'comunidad/'],
  ['expertos', 'expertos/']]) {
  test(`controles · ${nombre} no se mueve en línea recta`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    /* Sin `reducedMotion: reduce`: con el movimiento apagado el sitio
       pone las transiciones a 0.001 s y esta medición no mediría nada
       —ese error ya se cometió una vez en esta misma auditoría—. */
    await page.goto(ruta, { waitUntil: 'load', timeout: 90_000 });
    await page.waitForTimeout(1500);
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        window.scrollTo(0, y);
        await new Promise((r) => requestAnimationFrame(r));
      }
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 400));
    });

    const r = await page.evaluate(() => {
      const curvas = new Map();
      const rectas = [];
      for (const el of document.querySelectorAll('body *')) {
        const cs = getComputedStyle(el);
        if (cs.transitionDuration === '0s' || cs.transitionProperty === 'none') continue;
        const duraciones = cs.transitionDuration.split(',').map((s) => s.trim());
        /* Una curva por propiedad, y se emparejan por orden. Una
           transición de 0 s no cuenta: no hay movimiento que curvar. */
        cs.transitionTimingFunction.split(/,(?![^(]*\))/).map((s) => s.trim())
          .forEach((c, i) => {
            const dur = duraciones[i % duraciones.length];
            if (dur === '0s') return;
            curvas.set(c, (curvas.get(c) || 0) + 1);
            if (c === 'linear' && rectas.length < 6) {
              rectas.push(`${el.className?.toString?.().slice(0, 30) || el.tagName}`
                + ` (${cs.transitionProperty.split(',')[i] || '?'})`);
            }
          });
      }
      return {
        curvas: [...curvas.entries()].sort((a, b) => b[1] - a[1]),
        rectas: [...new Set(rectas)],
      };
    });

    console.log(`  ${nombre}: ${r.curvas.map(([c, n]) => `${c.slice(0, 28)}×${n}`).join(' · ')}`);
    const linear = r.curvas.find(([c]) => c === 'linear');
    expect(linear ? `${linear[1]} transiciones en línea recta — ${r.rectas.join(', ')}` : '',
      'Movimiento sin curva').toBe('');
  });
}
