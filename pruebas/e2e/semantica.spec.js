/* ═══════════════════════════════════════════════════════════════════
   Galene — la estructura que sostiene a quien no ve la pintura.

   Cuatro cosas que la auditoría de la edición 0ef0013 encontró rotas y
   que no se ven mirando el sitio: /productos sin h1, ninguna página con
   salto al contenido, el enlace al 123 con un área de 22×19 px, y ocho
   enlaces internos sin barra final que en GitHub Pages se resuelven con
   un 301.

   Ninguna de las cuatro afea nada. Las cuatro le pasan factura a quien
   navega con teclado, con lector de pantalla, con el pulgar torpe por
   los nervios, o a un buscador el día que se levante el noindex.
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

/* ── UN h1 POR PÁGINA ───────────────────────────────────────────────
   Ni cero ni dos. Cero deja la página sin nombre para un lector de
   pantalla y para un buscador; dos le dan dos nombres, que es lo mismo
   que ninguno. */
for (const [nombre, ruta] of PAGINAS) {
  test(`semántica · ${nombre} tiene exactamente un h1`, async ({ page }) => {
    await page.goto(ruta, { waitUntil: 'domcontentloaded' });
    const h1 = await page.evaluate(() =>
      [...document.querySelectorAll('h1')].map((h) => h.textContent.trim().slice(0, 60)));
    expect(h1, `los h1 de /${ruta}`).toHaveLength(1);
    expect(h1[0].length, 'el h1 no puede estar vacío').toBeGreaterThan(2);
  });
}

/* ── EL SALTO AL CONTENIDO ──────────────────────────────────────────
   Con teclado, la primera parada tiene que ser la salida de la barra.
   Sin él hay que pasar por la marca y los cinco enlaces de navegación
   en cada página, cada vez.

   Se comprueba que existe, que al enfocarlo SE VE —un salto invisible
   es peor que ninguno: se pulsa sin querer y la página salta sin que
   nadie sepa por qué— y que apunta a algo que existe. */
for (const [nombre, ruta] of PAGINAS) {
  test(`semántica · ${nombre} deja saltar al contenido`, async ({ page }) => {
    await page.goto(ruta, { waitUntil: 'domcontentloaded' });
    await page.keyboard.press('Tab');
    /* El salto entra deslizándose: leer su caja en el mismo tick la
       pilla a medio camino y todavía fuera de la pantalla. */
    await page.waitForTimeout(400);
    const salto = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body || el.tagName !== 'A') return null;
      const r = el.getBoundingClientRect();
      return {
        texto: (el.textContent || '').trim(),
        destino: el.getAttribute('href') || '',
        ancho: Math.round(r.width), alto: Math.round(r.height),
        dentroDePantalla: r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight,
        opacidad: Number(getComputedStyle(el).opacity),
      };
    });
    expect(salto, `el primer Tab de /${ruta} tiene que enfocar un enlace`).not.toBeNull();
    expect(salto.destino, 'tiene que apuntar a un ancla de la propia página').toMatch(/^#.+/);
    expect(salto.ancho * salto.alto, 'al recibir el foco tiene que verse').toBeGreaterThan(400);
    expect(salto.dentroDePantalla, 'y verse DENTRO de la pantalla').toBe(true);
    expect(salto.opacidad).toBeGreaterThan(0.9);

    /* ── Y TIENE QUE LLEVAR AL CONTENIDO, NO A CUALQUIER ANCLA ──────
       Calibrando la prueba contra el sitio SIN el arreglo, la portada
       la pasaba: su primera parada es el logotipo, que apunta a `#mar`
       —un ancla de la propia página, visible y bien grande—. Cumplía
       la letra y no servía de nada: seguía sin haber forma de saltarse
       la navegación.

       Lo que hace que un salto sea un salto es su DESTINO. Se exige que
       sea el <main>, que es donde empieza lo que la persona vino a
       leer. */
    const destino = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el ? { esMain: el.tagName === 'MAIN', enfocable: el.tabIndex >= -1 } : null;
    }, salto.destino);
    expect(destino, `${salto.destino} no existe en /${ruta}`).not.toBeNull();
    expect(destino.esMain,
      `${salto.destino} tiene que ser el <main>, no un ancla cualquiera`).toBe(true);
  });
}

/* ── EL CAMINO DE EMERGENCIA SE TOCA CON EL PULGAR ──────────────────
   La regla es una y no admite excepción: cualquier enlace que MARQUE
   UN TELÉFONO mide 44×44 como mínimo. Son los cuatro enlaces más
   importantes del sitio y el 123 era el objetivo más pequeño de todos,
   con 22×19 px en un teléfono.

   44 es el tamaño que recomiendan tanto Apple como el criterio 2.5.5
   de WCAG en su nivel AAA. Aquí no es un lujo: quien lo va a tocar
   puede estar temblando.

   Al resto del sitio se le exige 24×24, que es el mínimo del criterio
   2.5.8 en nivel AA. Los enlaces dentro de un párrafo están exentos por
   el propio criterio —no se puede engordar una palabra sin romper la
   línea— y aquí se detectan porque su padre es prosa. */
const PROSA = new Set(['P', 'LI', 'DD', 'SPAN', 'EM', 'STRONG', 'BLOCKQUOTE',
                       'FIGCAPTION', 'DFN', 'ABBR', 'CITE', 'SMALL', 'TIME']);

for (const vista of [
  { nombre: 'móvil', viewport: { width: 390, height: 844 } },
  { nombre: 'escritorio', viewport: { width: 1440, height: 900 } },
]) {
  for (const [nombre, ruta] of PAGINAS) {
    test(`táctil · ${nombre} en ${vista.nombre}`, async ({ page }) => {
      await page.setViewportSize(vista.viewport);
      await page.goto(ruta, { waitUntil: 'domcontentloaded' });
      /* ── EL SITIO, ABIERTO Y CON LA BARRA PUESTA ─────────────────
         Un control dentro de un <details> cerrado tiene caja pero no
         recibe toques: medirlo así lo declara «tapado» y no es verdad,
         solo está a un toque de distancia. Se abren todos.

         Y en la portada la barra no baja hasta que la pintura se va, o
         sea que a scroll 0 sus enlaces tampoco son tocables todavía.
         Se baja una pantalla para medirla en el estado en que existe.

         Se hace por el DOM y no con clics: el cargador tapa la barra
         los primeros segundos y Playwright espera a que el botón sea
         «accionable» hasta agotar los 90 s del plazo. Lo que hace falta
         aquí es el estado, no la ceremonia. */
      /* El cargador de la portada es una capa a pantalla completa y
         hasta que se retira —milisegundo y medio— TODO sale «tapado».
         No es un fallo del sitio; es que hay que medir cuando la página
         ya está en manos de quien la usa. */
      await page.waitForFunction(() => !document.querySelector('.cargador'),
        null, { timeout: 30_000 }).catch(() => {});

      /* ── DOS PASADAS, PORQUE EL MENÚ TAPA LA PÁGINA ──────────────
         Abrir TODOS los <details> a la vez despliega también el menú de
         navegación, que es un panel sobre el contenido: medido así, la
         mitad del sitio salía «tapado» por culpa de la propia prueba.

         Pasada 1: todo abierto MENOS el menú → se mide la página.
         Pasada 2: solo el menú abierto → se miden sus enlaces.
         Cada control se mide una vez, en el estado en el que existe. */
      const medir = async (conMenu) => {
        await page.evaluate((conMenu) => {
          for (const d of document.querySelectorAll('details')) {
            d.open = d.classList.contains('menu') ? conMenu : !conMenu;
          }
          /* Dos pantallas y pico: en la portada la barra no baja hasta
             que la pintura se ha ido del todo, y a una pantalla justa
             sigue con opacidad 0 —o sea que no es un objetivo aún—. */
          window.scrollTo({ top: window.innerHeight * 2.4, behavior: 'instant' });
        }, conMenu);
        await page.waitForTimeout(900);
        return page.evaluate(([prosaArr, conMenu]) => {
        const PROSA = new Set(prosaArr);
        const malos = [];

        /* ── SE MIDE EL ÁREA QUE SE TOCA, NO LA QUE SE VE ────────────
           La primera versión medía `getBoundingClientRect()`. Está
           mal: el criterio 2.5.8 habla del objetivo, y un objetivo se
           puede agrandar con un pseudoelemento transparente sin mover
           una sola letra —que es justo como hay que agrandar el «123»
           dentro de una frase, porque subirle la caja a 44 px
           separaría el renglón del párrafo entero—.

           Así que se sondea de verdad: desde el centro, se busca por
           bisección hasta dónde llega el punto que sigue devolviendo
           este elemento (o algo suyo) en `elementFromPoint`. Eso es
           exactamente lo que el dedo va a encontrar. */
        /* Un enlace en línea que parte en dos renglones tiene UNA caja
           envolvente que abarca los dos y un hueco en medio: su centro
           geométrico cae fuera del texto, sobre el padre. Se sondea
           desde el renglón más grande, que además es lo que dice el
           criterio 2.5.8 — cada caja de línea es su propio objetivo. */
        const cajaMayor = (el) => {
          const cajas = [...el.getClientRects()];
          if (cajas.length < 2) return el.getBoundingClientRect();
          return cajas.reduce((a, b) => (b.width * b.height > a.width * a.height ? b : a));
        };

        function areaReal(el, tope) {
          /* `elementFromPoint` solo entiende de coordenadas DENTRO de la
             ventana: un elemento a 4000 px de scroll devolvía siempre
             «tapado». Hay que traerlo a la pantalla antes de sondear. */
          const r0 = el.getBoundingClientRect();
          if (r0.top < tope || r0.bottom > innerHeight - tope) {
            el.scrollIntoView({ block: 'center', behavior: 'instant' });
          }
          const r = cajaMayor(el);
          if (r.bottom < 0 || r.top > innerHeight) return 'fuera';
          const cx = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1);
          const cy = Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 1);
          const suyo = (x, y) => {
            if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return false;
            const t = document.elementFromPoint(x, y);
            return !!t && (t === el || el.contains(t));
          };
          if (!suyo(cx, cy)) return null;            // tapado por otra cosa
          /* Bisección en las cuatro direcciones. `tope` acota la
             búsqueda: no hace falta saber si un botón mide 300 px, solo
             si llega al mínimo. */
          const alcance = (dx, dy) => {
            let bajo = 0, alto = tope;
            for (let i = 0; i < 7; i++) {
              const m = (bajo + alto) / 2;
              if (suyo(cx + dx * m, cy + dy * m)) bajo = m; else alto = m;
            }
            return bajo;
          };
          return {
            ancho: alcance(-1, 0) + alcance(1, 0),
            alto: alcance(0, -1) + alcance(0, 1),
          };
        }

        const sel = 'a[href], button, input:not([type="hidden"]), select, summary, [role="button"]';
        for (const el of document.querySelectorAll(sel)) {
          /* Cada pasada mide su mitad: lo de dentro del menú cuando el
             menú está abierto, lo demás cuando está cerrado. */
          const enMenu = !!el.closest('.menu');
          if (enMenu !== conMenu) continue;
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') continue;
          /* Un elemento dentro de una capa a opacidad 0 no se ve y no
             se toca: no es un objetivo pequeño, es un objetivo que
             todavía no existe. */
          let opaco = true;
          for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
            if (Number(getComputedStyle(n).opacity) < 0.05) { opaco = false; break; }
          }
          if (!opaco) continue;
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          /* Los controles ocultos a propósito detrás de una etiqueta
             —los radio de 1×1 con `visualmente-oculto`— no son el
             objetivo: el objetivo es su <label>. */
          if (el.matches('.visualmente-oculto, .visualmente-oculto *')) continue;
          /* El salto al contenido vive fuera de la pantalla hasta que
             recibe el foco: tiene su propia prueba, y sondearlo aquí
             mide el sitio donde se esconde. */
          if (el.classList.contains('salto')) continue;
          /* Un control de formulario con etiqueta NO es el objetivo: el
             objetivo es su <label>, que es lo que se toca y lo que se
             mide. Los radio de los filtros están tapados por su etiqueta
             a propósito, y eso es la forma correcta de hacerlo. */
          if (el.tagName === 'INPUT') {
            const etiqueta = el.closest('label')
              || (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`));
            if (etiqueta) continue;
          }

          const telefono = el.tagName === 'A' && (el.getAttribute('href') || '').startsWith('tel:');
          const enProsa = !telefono && PROSA.has(el.parentElement?.tagName || '');
          const minimo = telefono ? 44 : (enProsa ? 0 : 24);
          if (!minimo) continue;

          const area = areaReal(el, minimo);
          const nombre = `${telefono ? '☎ ' : ''}${el.tagName}.${String(el.className).slice(0, 24)} `
            + `«${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 22)}»`;
          if (area === 'fuera') continue;
          if (!area) { malos.push(`${nombre} — tapado por otro elemento`); continue; }
          if (area.ancho < minimo - 0.6 || area.alto < minimo - 0.6) {
            malos.push(`${nombre} ${area.ancho.toFixed(0)}×${area.alto.toFixed(0)} (mín ${minimo})`);
          }
        }
        return malos;
        }, [[...PROSA], conMenu]);
      };

      const chicos = [...await medir(false), ...await medir(true)];

      expect(chicos.join('\n'), `Objetivos táctiles pequeños en /${ruta}`).toBe('');
    });
  }
}

/* ── LAS ANCLAS NO QUEDAN DEBAJO DE LA BARRA ────────────────────────
   La barra es pegajosa y translúcida: al saltar a #herramientas, el
   título se quedaba medio escondido tras el cristal. Se arregla con
   `scroll-margin-top`, y aquí se comprueba saltando de verdad. */
test('semántica · ningún título se esconde tras la barra al saltar a su ancla', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('', { waitUntil: 'domcontentloaded' });

  const anclas = await page.evaluate(() =>
    [...document.querySelectorAll('main section[id]')].map((s) => s.id));
  expect(anclas.length, 'la portada tiene secciones con id').toBeGreaterThan(5);

  const tapados = [];
  for (const id of anclas) {
    await page.evaluate((id) => { location.hash = ''; location.hash = id; }, id);
    await page.waitForTimeout(120);
    const r = await page.evaluate((id) => {
      const s = document.getElementById(id);
      const barra = document.querySelector('.barra--papel, .barra--flotante, .barra');
      const bb = barra?.getBoundingClientRect();
      const alturaBarra = bb && getComputedStyle(barra).position !== 'static'
        && bb.top <= 1 ? bb.height : 0;
      /* El primer encabezado de la sección es lo que hay que poder
         leer entero: si su borde superior está por encima del canto
         inferior de la barra, está tapado. */
      const h = s?.querySelector('h1,h2,h3');
      if (!h) return null;
      return { arriba: h.getBoundingClientRect().top, barra: alturaBarra,
               titulo: h.textContent.trim().slice(0, 34) };
    }, id);
    if (r && r.barra > 0 && r.arriba < r.barra - 1) {
      tapados.push(`#${id} «${r.titulo}» a ${Math.round(r.arriba)}px, barra de ${Math.round(r.barra)}px`);
    }
  }
  expect(tapados.join('\n'), 'Títulos tapados por la barra').toBe('');
});

/* ── LOS ENLACES INTERNOS NO REBOTAN ────────────────────────────────
   GitHub Pages sirve /galene/productos con un 301 hacia
   /galene/productos/. Ocho enlaces del sitio pedían la forma sin barra,
   o sea un salto de red extra en cada navegación.

   Se mira el href y no la respuesta, porque el servidor de pruebas no
   redirige como GitHub Pages: lo que hay que arreglar está en el HTML,
   y ahí sí se ve igual en los dos sitios. */
for (const [nombre, ruta] of PAGINAS) {
  test(`semántica · ${nombre} enlaza sin rebote`, async ({ page }) => {
    await page.goto(ruta, { waitUntil: 'domcontentloaded' });
    const sinBarra = await page.evaluate(() => {
      const malos = [];
      for (const a of document.querySelectorAll('a[href]')) {
        const h = a.getAttribute('href');
        if (!h.startsWith('/galene/')) continue;
        const camino = h.split(/[?#]/)[0];
        /* Un archivo tiene extensión; un directorio no, y entonces
           tiene que acabar en barra. */
        if (/\.\w{2,5}$/.test(camino)) continue;
        if (!camino.endsWith('/')) malos.push(h);
      }
      return [...new Set(malos)];
    });
    expect(sinBarra.join(', '), `Enlaces internos sin barra final en /${ruta}`).toBe('');
  });
}
