/* ═══════════════════════════════════════════════════════════════════
   Galene — que el sitio esté escrito en español.

   POR QUÉ EXISTE ESTA PRUEBA. En la auditoría de la edición 0ef0013 se
   contaron 70 apariciones de palabras sin tilde en el HTML desplegado:
   41 en /expertos, 25 en la portada y 4 en la comunidad. La ironía era
   exacta —la página peor escrita era la que se titula «Lo que la
   evidencia permite decir»— y el daño no es cosmético: alguien que
   llega a decidir si puede fiarse de lo que lee, lee «sintesis
   editoriales» y ya tiene una respuesta que no queríamos darle.

   POR QUÉ UNA LISTA CERRADA Y NO UN CORRECTOR. Un diccionario completo
   marcaría «mas», «tomo», «practica» o «publica», que son palabras
   legítimas del español según qué digan alrededor, y una prueba que
   grita en falso se acaba desactivando. Aquí solo entran formas que NO
   EXISTEN sin tilde: no hay contexto en el que «sumision» o «estan»
   sean correctas. Si un día hace falta cazar una ambigua, se corrige el
   texto y se deja fuera de la lista: esta prueba protege el suelo, no
   el techo.

   ── SE MIDE SOBRE EL HTML COMPILADO, SIN LOS <script> ──────────────
   Sin quitarlos, el JSON-LD del glosario —que sí lleva tildes— y los
   módulos empaquetados entrarían en la cuenta y taparían el defecto de
   verdad, que está en el texto que se lee.
   ═══════════════════════════════════════════════════════════════════ */
import { test, expect } from '@playwright/test';

/* Las cinco páginas públicas. La ficha entra porque su texto sale de
   datos/productos.js, que es otro archivo donde puede colarse. */
const PAGINAS = [
  ['portada', ''],
  ['comunidad', 'comunidad/'],
  ['expertos', 'expertos/'],
  ['productos', 'productos/'],
  ['ficha', 'productos/funda-coletero/'],
  ['acerca', 'acerca/'],
];

/* Formas que no existen sin tilde en español. Ordenadas por familia
   para que añadir una sea obvio. */
const SIN_TILDE = [
  // el tema del sitio
  'sumision', 'quimica', 'quimico', 'quimicas', 'quimicos',
  'anulacion', 'toxicologia', 'toxicologico', 'toxicologica',
  // clínica y academia
  'sintoma', 'sintomas', 'paralisis', 'diagnostico', 'postraumatico',
  'estres', 'depresion', 'disociacion', 'psicotraumatologia',
  'ginecologia', 'psiquiatria', 'psicologia', 'enfermeria',
  'epidemiologia', 'metaanalisis', 'sintesis', 'tonica', 'juridica',
  'clinica', 'clinico', 'clinicas', 'clinicos', 'medica', 'medicas',
  // lo que pasa y lo que se hace
  'agresion', 'reaccion', 'excepcion', 'eleccion', 'decision',
  'deteccion', 'recuperacion', 'reparacion', 'prevencion', 'proteccion',
  'afiliacion', 'evaluacion', 'investigacion', 'revision', 'atencion',
  'informacion', 'definicion', 'precision', 'confusion', 'condicion',
  'resolucion', 'organizacion', 'direccion', 'seccion', 'mision',
  'vision', 'version', 'presion', 'region', 'victima', 'victimas',
  // gramática corriente
  'tambien', 'despues', 'deberia', 'podria', 'seria', 'habia',
  'estan', 'asi', 'aqui', 'alli', 'dias', 'vacios', 'judia',
  'compañia', 'mayoria',
];

/* ── QUÉ SE MIRA: LO QUE ALGUIEN LEE O ESCUCHA ─────────────────────
   La primera versión de esto filtraba atributos técnicos del HTML con
   una expresión regular y se le colaban dos: `data-seccion-hoja`, que
   no lleva valor entrecomillado, y `value="despues"` de un radio, que
   es un identificador de formulario. Las dos daban falso positivo.

   Filtrar identificadores de un documento HTML a base de listas es una
   carrera que se pierde. Lo que no falla es recorrer el documento ya
   montado y quedarse con lo que de verdad llega a una persona: los
   nodos de texto, los nombres accesibles y las etiquetas que lee un
   buscador o un lector de pantalla. Un `id` no es ninguna de esas
   cosas y desaparece solo, sin lista que mantener.

   Se recorren TODOS los nodos de texto, también los de un <details>
   cerrado: que una etiqueta esté plegada no la exime — se despliega en
   cuanto alguien toca el botón. */
function textoLegible() {
  const trozos = [];
  const doc = document;

  const t = doc.querySelector('title');
  if (t) trozos.push(t.textContent);
  for (const m of doc.querySelectorAll('meta[name="description"], meta[property^="og:"], meta[name^="twitter:"]')) {
    const c = m.getAttribute('content') || '';
    /* Las URL de og:image y compañía no son prosa. */
    if (!/^https?:|^\//.test(c)) trozos.push(c);
  }

  const paso = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = paso.nextNode(); n; n = paso.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) {
      const p = n.parentElement?.tagName;
      if (p === 'SCRIPT' || p === 'STYLE') continue;
      trozos.push(n.nodeValue);
    } else {
      for (const a of ['alt', 'aria-label', 'title', 'placeholder']) {
        const v = n.getAttribute?.(a);
        if (v) trozos.push(v);
      }
    }
  }
  return trozos.join('\n');
}

for (const [nombre, ruta] of PAGINAS) {
  test(`ortografía · ${nombre} se escribe con tildes`, async ({ page }) => {
    const res = await page.goto(ruta, { waitUntil: 'domcontentloaded' });
    expect(res.status(), `${ruta} tiene que responder 200`).toBe(200);
    const prosa = await page.evaluate(textoLegible);

    const hallazgos = [];
    for (const palabra of SIN_TILDE) {
      /* Los límites de palabra de JavaScript no entienden la ñ ni las
         vocales acentuadas, así que «reaccion» encontraría el trozo
         final de una palabra mayor. Se exige que a los lados no haya
         ninguna letra, acentuadas incluidas. */
      const re = new RegExp(`(?<![\\wáéíóúüñÁÉÍÓÚÜÑ])${palabra}(?![\\wáéíóúüñÁÉÍÓÚÜÑ])`, 'gi');
      const n = (prosa.match(re) || []).length;
      if (n) hallazgos.push(`${palabra}×${n}`);
    }

    expect(hallazgos.join(', '),
      `Palabras sin tilde en /${ruta}`).toBe('');
  });
}
