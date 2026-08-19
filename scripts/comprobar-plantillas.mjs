/* ═══════════════════════════════════════════════════════════════════
   ¿EL JAVASCRIPT PINTA COSAS QUE YA NO ESTÁN EN EL MARCADO?

   Esta comprobación existe por una avería que costó una tarde entera.
   El rediseño de la comunidad quitó el sello del ave de las dos
   plantillas de Comunidad.astro. `comunidad.js` se quedó haciendo:

     nodo.querySelector('.sello__ave').src = …

   `querySelector` de una clase que ya no existe devuelve `null`, y eso
   revienta en la PRIMERA tarjeta. La comunidad dejó de pintar un solo
   hilo, el `catch` de fuera decía «no se pudo llegar a la comunidad», y
   esa frase mandó a buscar la avería a la red, a las llaves y a
   Supabase — donde no estaba.

   Nada de lo que había podía verlo. No es una excepción de carga —pasa
   dentro de un `try`—, no es contraste, no es peso, no es semántica. Es
   MARCADO Y CÓDIGO QUE SE SEPARARON, y eso solo se ve comparándolos.

   Lo que hace: busca en cada módulo los `querySelector('.clase')` y
   `querySelectorAll('.clase')` y comprueba que esa clase aparezca en
   alguna parte del marcado de su página. No entiende de plantillas ni
   de ámbitos, y no hace falta: una clase que el JavaScript busca y que
   no está escrita en ningún sitio es un fallo, siempre.
   ═══════════════════════════════════════════════════════════════════ */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/* Qué módulo pinta sobre qué marcado. Las clases pueden vivir en el
   componente o en cualquier página que lo monte, así que se busca en
   todo el marcado del sitio: el objetivo es cazar clases que NO EXISTEN
   en ninguna parte, no vigilar en cuál. */
const MODULOS = ['src/js/comunidad.js', 'src/js/main.js', 'src/js/aguada.js', 'src/js/pico.js'];

function todoElMarcado() {
  const trozos = [];
  const andar = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const ruta = join(dir, e.name);
      if (e.isDirectory()) andar(ruta);
      else if (/\.(astro|html)$/.test(e.name)) trozos.push(readFileSync(ruta, 'utf8'));
    }
  };
  andar('src/componentes');
  andar('src/pages');
  /* El JavaScript también CREA elementos con `className = '…'`, y esos
     son marcado igual de válido aunque no estén en un .astro. */
  for (const m of MODULOS) trozos.push(readFileSync(m, 'utf8'));
  return trozos.join('\n');
}

const marcado = todoElMarcado();
const fallos = [];

for (const modulo of MODULOS) {
  const fuente = readFileSync(modulo, 'utf8');
  /* Solo clases simples: `.algo`. Los selectores de atributo
     (`[data-…]`) ya se ven en el marcado a simple vista y los
     compuestos dan más ruido que señal. */
  const encontradas = new Set();
  for (const m of fuente.matchAll(/querySelectorAll?\(\s*'\.([A-Za-z0-9_-]+)'\s*\)/g)) {
    encontradas.add(m[1]);
  }
  for (const clase of encontradas) {
    /* Se acepta escrita como clase HTML, como parte de una lista de
       clases, o creada desde JavaScript. */
    const escrita = new RegExp(`(class(Name)?\\s*=\\s*["'\`][^"'\`]*\\b${clase}\\b`
                             + `|classList\\.(add|toggle|remove)\\(\\s*'${clase}'`
                             + `|["'\`]${clase}["'\`]\\s*[,)])`);
    if (!escrita.test(marcado)) fallos.push(`${modulo}: busca .${clase} y no existe en ningún marcado`);
  }
}

if (fallos.length) {
  console.error('\nMARCADO Y CÓDIGO SEPARADOS:\n');
  for (const f of fallos) console.error('  · ' + f);
  console.error('');
  process.exit(1);
}
console.log('plantillas · el JavaScript no busca ninguna clase que no exista');
