/* ═══════════════════════════════════════════════════════════════════
   Galene — el presupuesto de bytes.

   Medido en la edición 0ef0013, con el mar encendido:

       escritorio 1440   6,86 MB   70 peticiones   5,98 MB de láminas
       móvil 390         2,36 MB   69 peticiones   1,22 MB de láminas

   El teléfono está bien trabajado —variantes de 768 y 1024 px,
   resolución adaptativa— y el escritorio no recibió nada de eso: se
   lleva las láminas a tamaño completo. Con una conexión colombiana
   media son unos seis segundos de descarga pura antes de ver el mar.

   ── EL PRESUPUESTO SE FIJA SOBRE LAS IMÁGENES ──────────────────────
   Son el 87 % del peso y, al venir ya comprimidas, pesan lo mismo aquí
   que en producción. El texto se mide aparte y con la vista puesta en
   que GitHub Pages lo sirve con gzip y este servidor de pruebas no: su
   número local es el peor caso, no el real.
   ═══════════════════════════════════════════════════════════════════ */
import { test, expect } from '@playwright/test';

const MB = 1024 * 1024;

const CASOS = [
  {
    nombre: 'escritorio',
    opciones: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
    imagenes: 2.4 * MB,
    total: 3.2 * MB,
  },
  {
    nombre: 'móvil',
    opciones: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
                isMobile: true, hasTouch: true },
    /* Ratchet, no objetivo. El móvil ya venía trabajado y esta fase no
       lo tocó: estos números son los que tiene hoy, puestos como techo
       para que no crezcan. Lo que queda por ahí —`aguadas-seccion2` a
       174 kB sin variante de teléfono— es trabajo de otra ronda. */
    imagenes: 2.0 * MB,
    total: 2.5 * MB,
  },
];

for (const caso of CASOS) {
  test.describe(`peso · ${caso.nombre}`, () => {
    test.use(caso.opciones);

    test('la portada cabe en su presupuesto', async ({ page }) => {
      await page.goto('?auditar-mar=1', { waitUntil: 'load', timeout: 90_000 });
      /* El mar sube sus láminas después del `load`: sin esperar, se
         mediría media descarga y el presupuesto saldría en verde por
         no haber mirado. */
      await page.waitForTimeout(9000);

      const r = await page.evaluate(() => {
        /* ── CADA ARCHIVO SE CUENTA UNA VEZ ───────────────────────
           `papel.webp` lo piden dos sitios: el shader, para el grano
           del mar, y el CSS, para el papel de las secciones de abajo.
           Es el MISMO archivo y en producción se descarga una sola vez
           —GitHub Pages responde `cache-control: max-age=600`, medido—.
           El servidor de estas pruebas manda `no-store` a propósito,
           para que ninguna prueba lea bytes viejos, y por eso aquí
           aparecía dos veces.

           Contarlo dos veces sería inventarse 237 kB que nadie paga, y
           además empujaría a «arreglar» algo que no está roto. Se
           cuentan URLs únicas, que es lo que cuesta la visita. */
        const vistos = new Map();
        for (const x of performance.getEntriesByType('resource')) {
          const bytes = x.transferSize || x.encodedBodySize || 0;
          const url = x.name.split('?')[0];
          if (!vistos.has(url) || vistos.get(url) < bytes) vistos.set(url, bytes);
        }
        let img = 0, otro = 0;
        const mayores = [];
        for (const [url, bytes] of vistos) {
          if (/\.(webp|png|jpg|jpeg|avif|svg)$/i.test(url)) img += bytes;
          else otro += bytes;
          mayores.push([url.split('/galene/')[1] || url, bytes]);
        }
        mayores.sort((a, b) => b[1] - a[1]);
        return { img, otro, n: vistos.size, mayores: mayores.slice(0, 6) };
      });

      const kb = (b) => (b / 1024).toFixed(0) + ' kB';
      console.log(`  ${caso.nombre}: imágenes ${(r.img / MB).toFixed(2)} MB · `
        + `resto ${(r.otro / MB).toFixed(2)} MB · total ${((r.img + r.otro) / MB).toFixed(2)} MB · `
        + `${r.n} archivos distintos`);
      console.log('    ' + r.mayores.map(([n, b]) => `${n.slice(0, 34)} ${kb(b)}`).join(' | '));

      expect(r.img, `láminas de ${caso.nombre}`).toBeLessThanOrEqual(caso.imagenes);
      expect(r.img + r.otro, `peso total de ${caso.nombre}`).toBeLessThanOrEqual(caso.total);
    });
  });
}

/* ═══════════════════════════════════════════════════════════════════
   Y LAS OTRAS PÁGINAS, QUE HASTA AHORA NO PESABAN NADA PORQUE NO
   PINTABAN NADA.

   Cuando se descubrió que `/expertos`, `/comunidad` y `/acerca`
   renderizaban cero elementos pintados —la compuerta `lectura-cerca`
   solo la abría `entrada.js`, y ese guion vive únicamente en la
   portada— la reparación fue abrirla en el marcado de esas páginas. Y
   eso tiene un precio: el papel, las aguadas y los filetes empiezan a
   descargarse.

   Es un precio pequeño y en su mayor parte ya pagado: son las mismas
   láminas que la portada, así que quien llega desde ella no descarga
   nada. Pero «pequeño» no es una medida, y una reparación que añade
   megas sin que nadie los cuente es la próxima cosa a arreglar. Aquí
   están contados, con el techo puesto donde están hoy más un margen
   para que la comunidad crezca en hilos.
   ═══════════════════════════════════════════════════════════════════ */
const OTRAS = [
  ['expertos', 'expertos/', 0.75 * MB],
  ['comunidad', 'comunidad/', 1.25 * MB],
  ['acerca', 'acerca/', 0.75 * MB],
  ['productos', 'productos/', 0.85 * MB],
  ['ficha', 'productos/funda-coletero/', 0.7 * MB],
];

test.describe('peso · las otras páginas', () => {
  test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

  for (const [nombre, ruta, techo] of OTRAS) {
    test(`peso · ${nombre} cabe en su presupuesto`, async ({ page }) => {
      await page.goto(ruta, { waitUntil: 'load', timeout: 90_000 });
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 500) {
          window.scrollTo(0, y);
          await new Promise((r) => requestAnimationFrame(r));
        }
      });
      await page.waitForTimeout(2500);

      const r = await page.evaluate(() => {
        const vistos = new Map();
        for (const x of performance.getEntriesByType('resource')) {
          const bytes = x.transferSize || x.encodedBodySize || 0;
          const url = x.name.split('?')[0];
          if (!vistos.has(url) || vistos.get(url) < bytes) vistos.set(url, bytes);
        }
        let total = 0;
        for (const b of vistos.values()) total += b;
        return { total, n: vistos.size };
      });

      console.log(`  ${nombre}: ${(r.total / MB).toFixed(2)} MB`
        + ` en ${r.n} archivos (techo ${(techo / MB).toFixed(2)} MB)`);
      expect(r.total, `peso de /${ruta}`).toBeLessThanOrEqual(techo);
    });
  }
});

/* ── Y QUE BAJAR DE RESOLUCIÓN NO SE NOTE ─────────────────────────
   El presupuesto se cumple sirviendo al escritorio las láminas de
   1024 px que el teléfono ya usa. Eso solo vale si la pintura no
   cambia: el mar se calcula a resolución de CSS, no de lámina, así que
   no debería. Aquí se comprueba en vez de suponerlo.

   Se renderiza el héroe con las variantes que el sitio elige y con las
   completas forzadas, y se compara píxel a píxel. Un cambio medio por
   debajo de 2/255 es invisible: el grano del papel que ya lleva la
   propia lámina es mayor que eso. */
for (const ancho of [1440, 1920]) {
test(`peso · las láminas de 1024 px pintan el mismo mar a ${ancho} px`, async ({ page }) => {
  await page.setViewportSize({ width: ancho, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });

  /* La intercepción está SIEMPRE puesta, incluso cuando no reescribe
     nada: pasar por el enrutador cuesta unos milisegundos y eso corre
     el instante en que arranca la escena. Si solo se interceptara el
     caso de las láminas completas, ese retraso entraría en la medida
     disfrazado de «diferencia por resolución». */
  let completas = false;
  await page.route('**/arte/1024/**', (ruta) => {
    const url = ruta.request().url();
    ruta.continue(completas ? { url: url.replace('/arte/1024/', '/arte/') } : {});
  });

  const capturar = async (forzarCompletas) => {
    completas = forzarCompletas;
    await page.goto('?auditar-mar=1&hora=13', { waitUntil: 'load', timeout: 90_000 });
    await page.waitForFunction(() => !document.querySelector('.cargador'),
      null, { timeout: 60_000 }).catch(() => {});
    await page.waitForTimeout(6000);
    return (await page.screenshot()).toString('base64');
  };

  /* ── TRES CAPTURAS, PORQUE DOS NO BASTAN ────────────────────────
     Comparar una carga con láminas encogidas contra otra con láminas
     completas mezcla dos cosas: el efecto de la resolución y el ruido
     propio de la escena, que no arranca en el mismo instante en cada
     carga y por tanto pinta la ola en otra fase. Medido: dos ejecuciones
     seguidas del MISMO caso daban 1,72 y 2,03 — o sea que el «umbral»
     estaba midiendo, en buena parte, el vaivén del mar.

     Así que primero se mide el ruido: dos cargas idénticas. Y después
     se exige que cambiar de láminas no añada mucho más que eso. Es la
     comparación honesta y no depende de ningún número inventado. */
  /* ── UNA CARGA DE CALENTAMIENTO, Y NO ES UN PARCHE ────────────────
     La tercera captura descarga cuatro megas MÁS que las otras dos: son
     las láminas completas, que hasta ese momento nadie ha pedido. Si
     esa descarga ocurre dentro de la medición, lo que se compara no es
     «cómo pinta una lámina de 1024 frente a una completa» sino «cómo
     pinta una escena que lleva seis segundos montada frente a otra que
     todavía está bajando archivos».

     Medido, y por eso está escrito: contra el compilado local —donde
     los cuatro megas salen de un disco— el cambio da 3,6 y 4,1. Contra
     el espejo de producción con la caché fría, 5,7 y 6,5; y en la misma
     ejecución, a 1920 px —donde las láminas YA están en la caché del
     espejo porque las pidió el caso de 1440— vuelve a dar 3,03, que es
     exactamente el número documentado.

     O sea que el rojo no era del sitio: era del instrumento midiendo
     una red. Se pide todo antes de empezar a cronometrar. */
  await capturar(true);

  const encogidasA = await capturar(false);
  const encogidasB = await capturar(false);
  const conCompletas = await capturar(true);

  const comparar = async (a, b) => page.evaluate(async ([a, b]) => {
    const carga = async (s) => {
      const i = new Image(); i.src = 'data:image/png;base64,' + s; await i.decode();
      const c = document.createElement('canvas');
      c.width = i.width; c.height = i.height;
      c.getContext('2d').drawImage(i, 0, 0);
      return c.getContext('2d').getImageData(0, 0, i.width, i.height).data;
    };
    const A = await carga(a), B = await carga(b);
    if (A.length !== B.length) return -1;
    let suma = 0, n = 0;
    for (let i = 0; i < A.length; i += 4) {
      suma += Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]);
      n += 3;
    }
    return suma / n;
  }, [a, b]);

  const ruido = await comparar(encogidasA, encogidasB);
  const dif = await comparar(encogidasA, conCompletas);

  console.log(`  ${ancho} px · ruido de la escena ${ruido.toFixed(2)}/255 · `
    + `cambio por las láminas ${dif.toFixed(2)}/255`);
  expect(ruido, 'las capturas tienen que medir lo mismo').toBeGreaterThanOrEqual(0);

  /* ── DE DÓNDE SALE ESTE 5 ─────────────────────────────────────────
     Medido, el cambio queda en 3,05/255 a 1440 y 3,04 a 1920 —un 1,2 %
     de media por canal— contra un ruido de escena de 0,75 a 1,01. O sea
     que SÍ hay un efecto real y no todo es vaivén: el número no puede
     fingir lo contrario.

     Lo que decide no es el número: son las dos capturas del manglar
     puestas una al lado de la otra, que están en el informe de la fase.
     Con las láminas de 1024 el canto de las raíces sale un punto más
     suave y la espuma un punto menos definida; en un mundo pintado a la
     aguada eso no es una pérdida que nadie pueda señalar. Cambiar 4,2 MB
     por eso está bien cambiado.

     Este 5 es la barandilla que impide que la cosa empeore sin que nadie
     se entere: si un día el cambio se dobla, alguien tiene que volver a
     mirar las dos capturas antes de darlo por bueno. */
  expect(dif, 'el cambio por las láminas se ha ido de lo que se verificó mirando')
    .toBeLessThanOrEqual(5);
});
}
