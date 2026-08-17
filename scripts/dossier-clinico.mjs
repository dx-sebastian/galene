/* ═══════════════════════════════════════════════════════════════════
   Galene — el dossier que hay que firmar, escrito por el propio sitio.

   ── EL PROBLEMA QUE RESUELVE ───────────────────────────────────────
   `docs/verificacion/LEEME.md` dice QUÉ hay que verificar en cuatro
   viñetas: los plazos, las rutas, las líneas y las tarjetas. Está bien
   como declaración y es inútil como encargo. Nadie firma cuatro
   viñetas: un profesional que acepta poner su nombre necesita la lista
   exacta de afirmaciones, cada una con el número que se publica, el
   documento del que sale y la cita literal, para poder decir sí, no o
   matizar EN CADA UNA. Pedirle que audite un sitio web entero es
   pedirle una tarde; pedirle que marque treinta y cuatro casillas con
   la cita delante es pedirle una hora.

   Y hay una razón más fuerte para que esto no sea un documento
   escrito a mano: un dossier a mano se desincroniza. El día que
   alguien corrija una ventana en `js/reloj.js` —ya pasó una vez, la
   toxicológica estuvo en 12 horas cuando el protocolo dice 96— la
   firma dejaría de cubrir lo que el sitio dice de verdad, y nadie se
   enteraría. Aquí el dossier LO ESCRIBE EL SITIO: sale de
   `src/js/reloj.js`, de `src/datos/expertos.js` y del componente de
   ayuda, y lleva una huella de lo que enumeró.

       npm run dossier                 escribe docs/verificacion/DOSSIER.md
       npm run dossier -- --comprobar  falla si el escrito ya no
                                       describe lo que el sitio dice

   La segunda forma es la que corre en la batería de pruebas. Si algún
   día se pone en rojo, el mensaje es exactamente este: el documento
   que alguien firmó ya no habla del sitio que hay.
   ═══════════════════════════════════════════════════════════════════ */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO = join(RAIZ, 'docs/verificacion/DOSSIER.md');

const { VENTANAS, CONSEJOS, FUENTES } = await import(
  join(RAIZ, 'src/js/reloj.js'));
const { EXPERTOS } = await import(join(RAIZ, 'src/datos/expertos.js'));

/* ── LAS LÍNEAS ────────────────────────────────────────────────────
   Estas tres no viven en un archivo de datos: están escritas en
   `src/componentes/Ayuda.astro`, que es donde tienen que estar —son
   dos enlaces y una nota, no una estructura—. Para que el dossier no
   pueda prometer una línea que el sitio ya no publica, se declaran
   aquí con el asidero por el que se comprueban, y más abajo se busca
   ese asidero en el componente de verdad. */
const AYUDA = readFileSync(join(RAIZ, 'src/componentes/Ayuda.astro'), 'utf8');
const LINEAS = [
  {
    nombre: 'Línea 155',
    asidero: 'href="tel:155"',
    dice: 'Orientación a víctimas de violencia. Nacional y gratuita desde '
        + 'cualquier teléfono en Colombia; marca al tocar.',
    preguntas: [
      '¿Sigue activa y sigue siendo gratuita desde fijo y desde móvil?',
      '¿Atiende de verdad orientación en violencia sexual, o deriva?',
      '¿Tiene horario, o es 24 horas? El sitio no dice horario: '
      + 'si lo tiene, hay que escribirlo.',
    ],
  },
  {
    nombre: 'SALVIA (Ministerio de Igualdad y Equidad)',
    asidero: 'salvia.minigualdadyequidad.gov.co',
    dice: 'Del Ministerio de Igualdad y Equidad. Orienta y activa rutas de '
        + 'atención sin exigir una llamada.',
    preguntas: [
      '¿La dirección sigue siendo esa y el servicio sigue en pie?',
      '¿«Activa rutas de atención» describe lo que hace, o promete de más?',
    ],
  },
  {
    nombre: 'Línea 123',
    asidero: 'href="tel:123"',
    dice: 'La línea de emergencias, para cuando hay riesgo ahora mismo. '
        + 'Junto a ella: «La atención en salud nunca exige denunciar».',
    preguntas: [
      '¿123 es la línea correcta en todo el país, o cambia por ciudad?',
      '¿La frase sobre no exigir denuncia está bien dicha para cualquier '
      + 'institución de salud, sea del régimen que sea?',
    ],
  },
];

/* ── LOS APARTADOS ─────────────────────────────────────────────────
   Cada afirmación sale con: lo que el sitio publica, el número, el
   documento y la cita. La casilla de la derecha la rellena quien
   firma. Eso es todo el formato: una tabla sería más compacta y no
   cabría una cita de cuatro renglones, que es justo lo que hace que
   revisar esto cueste una hora y no una tarde. */
const horas = (v) => (v === Infinity ? 'sin plazo' : `${v} h`);
const casilla = '\n> **Veredicto:** ☐ correcto  ☐ incorrecto  ☐ con matices\n>\n'
              + '> _Corrección o matiz:_\n';

function apartadoVentanas() {
  const lineas = ['## 1. Los plazos', '',
    'Son los números con los que alguien decide a qué hora sale de su casa.',
    'El sitio los dibuja a escala en el bloque «Estás aquí» de la portada,',
    'y cada uno enciende o apaga una fila según el momento que se elija.', ''];
  VENTANAS.forEach((v, i) => {
    lineas.push(`### 1.${i + 1} ${v.corto ?? v.titulo} — **${horas(v.cierra)}**`, '');
    lineas.push(`*El sitio dice:* «${v.resumen}»`, '');
    if (v.detalle) lineas.push(`*Y añade:* «${v.detalle}»`, '');
    if (v.cerrado) lineas.push(`*Cuando el plazo pasó dice:* «${v.cerrado}»`, '');
    lineas.push(`*Sale de:* ${v.fuente.titulo} — ${v.fuente.entidad}.`, '');
    lineas.push(`*Cita:* ${v.cita}`, '');
    lineas.push(casilla, '');
  });
  return lineas.join('\n');
}

function apartadoConsejos() {
  const lineas = ['## 2. Lo que se pide hacer en las primeras horas', '',
    'No son plazos: son instrucciones sobre el cuerpo y la ropa que',
    'afectan a lo que después se pueda encontrar. Cada una lleva su «y si',
    'ya lo hiciste» a propósito —una lista de consejos sin esa línea es',
    'una lista de reproches—, y esa línea también es una afirmación:',
    'dice que haber hecho algo no cancela el examen.', ''];
  CONSEJOS.forEach((c, i) => {
    lineas.push(`### 2.${i + 1} ${c.titulo}`, '');
    lineas.push(`*Por qué, según el sitio:* «${c.porque}»`, '');
    lineas.push(`*Y si ya lo hizo:* «${c.yaLoHice}»`, '');
    lineas.push(`*Sale de:* ${c.fuente.titulo} — ${c.fuente.entidad}.`, '');
    lineas.push(casilla, '');
  });
  return lineas.join('\n');
}

function apartadoLineas() {
  const lineas = ['## 3. Las líneas', '',
    'Un número que no contesta a las tres de la mañana es peor que no dar',
    'ninguno: quien llama ya hizo el gasto de decidirse.', ''];
  LINEAS.forEach((l, i) => {
    lineas.push(`### 3.${i + 1} ${l.nombre}`, '');
    lineas.push(`*El sitio dice:* «${l.dice}»`, '');
    lineas.push('*Qué hay que comprobar:*', '');
    l.preguntas.forEach((p) => lineas.push(`- ${p}`));
    lineas.push('', casilla, '');
  });
  return lineas.join('\n');
}

function apartadoExpertos() {
  const lineas = ['## 4. Las tarjetas del panel', '',
    `Son ${EXPERTOS.length}. Cada una es una síntesis en dos frases de un`,
    'trabajo publicado, con enlace al trabajo. Lo que hay que comprobar no',
    'es si el trabajo es bueno: es si **la síntesis dice lo que dice el',
    'trabajo**, y si no le añade una certeza que el original no tiene.',
    '',
    'Se pueden revisar por encima y marcar solo las que chirríen: una',
    'sola mal resumida es la que hace daño.', ''];
  EXPERTOS.forEach((e, i) => {
    lineas.push(`### 4.${i + 1} ${e.name} — ${e.role}`, '');
    lineas.push(`*Síntesis publicada:* «${e.text}»`, '');
    lineas.push(`*Fuente:* ${e.sourceLabel} — ${e.source}`, '');
    lineas.push(casilla, '');
  });
  return lineas.join('\n');
}

/* ── LA HUELLA ─────────────────────────────────────────────────────
   Un resumen de TODO lo enumerado. Si cambia una hora, una frase o un
   enlace, cambia la huella — y entonces el documento firmado, que
   lleva la huella vieja escrita, ya no describe el sitio que hay. Es
   la única forma de que una firma tenga fecha de caducidad
   automática. */
function huella() {
  const materia = JSON.stringify([
    VENTANAS.map((v) => [v.id, String(v.cierra), v.resumen, v.detalle, v.cerrado, v.cita]),
    CONSEJOS.map((c) => [c.id, c.titulo, c.porque, c.yaLoHice]),
    LINEAS.map((l) => [l.nombre, l.dice]),
    EXPERTOS.map((e) => [e.name, e.text, e.source]),
  ]);
  return createHash('sha256').update(materia).digest('hex').slice(0, 12);
}

function documento() {
  const total = VENTANAS.length + CONSEJOS.length + LINEAS.length + EXPERTOS.length;
  return `# Lo que hay que firmar

> **Este archivo no se edita a mano.** Lo escribe \`npm run dossier\` a
> partir de \`src/js/reloj.js\`, \`src/datos/expertos.js\` y
> \`src/componentes/Ayuda.astro\`, que es de donde el sitio saca lo que
> publica. Editarlo aquí haría que dijera una cosa y el sitio otra.

**Huella de este contenido: \`${huella()}\`** — ${total} afirmaciones
enumeradas, más una última al final que las cruza todas.

Quien firme, que anote esta huella junto a su nombre. Si algún día no
coincide con la que devuelve \`npm run dossier\`, es que el sitio cambió
después de la firma y la firma ya no lo cubre.

---

## Qué se pide, exactamente

Que una persona con criterio clínico o forense **en Colombia** lea las
afirmaciones de abajo y diga, en cada una, si es correcta, incorrecta o
necesita un matiz. No se pide auditar el sitio, ni revisar el diseño, ni
responsabilizarse de nada más: se pide leer una lista con la cita
delante.

Lo que se necesita de vuelta es un documento —o un correo— con:

- nombre, cargo y registro profesional;
- la fecha;
- la huella de arriba;
- y las correcciones, si las hay.

Eso se guarda en este mismo directorio y es lo que permite poner
\`VERIFICADO = true\` en \`src/datos/sitio.js\`. Hasta entonces el sitio
lleva \`noindex\` en todas sus páginas y el \`robots.txt\` prohíbe el
paso: no aparece en ningún buscador, a propósito.

## Las dos fuentes que ya se usaron

Los números de abajo no salen de la nada: se contrastaron contra estos
dos documentos. Lo que falta es que alguien confirme que **siguen
vigentes** y que la lectura es la correcta.

${FUENTES.map((f) => `- **${f.titulo}** — ${f.entidad}.`
  + (f.nota ? ` ${f.nota}` : '') + `\n  ${f.url}`).join('\n')}

Hay una duda concreta y anotada en el código: el protocolo de salud que
se usó es la actualización que deroga la Resolución 459 de 2012, y falta
comprobar bajo qué número quedó publicada.

---

${apartadoVentanas()}
---

${apartadoConsejos()}
---

${apartadoLineas()}
---

${apartadoExpertos()}---

## Y una última, que no es un dato

El sitio afirma en varios sitios que **la atención en salud no exige
denunciar** y que **no se puede condicionar a nada**. Es la frase que
más peso carga de todo el proyecto: si es inexacta, manda a alguien a
una urgencia con una expectativa que no se cumple.

${casilla}
`;
}

/* ── LA COMPROBACIÓN DE QUE LAS LÍNEAS SIGUEN PUBLICADAS ───────────
   Sin esto, el dossier podría pedir que alguien firme una línea que el
   sitio ya no enseña —o peor, callar una que sí—. */
const perdidas = LINEAS.filter((l) => !AYUDA.includes(l.asidero));
if (perdidas.length) {
  console.error('Estas líneas están en el dossier y ya no en Ayuda.astro:');
  for (const l of perdidas) console.error(`  · ${l.nombre} (${l.asidero})`);
  process.exit(1);
}

const texto = documento();

if (process.argv.includes('--comprobar')) {
  let actual = null;
  try { actual = readFileSync(DESTINO, 'utf8'); } catch { /* no existe */ }
  if (actual === texto) {
    console.log(`El dossier está al día · huella ${huella()}`);
    process.exit(0);
  }
  console.error(actual === null
    ? 'No existe docs/verificacion/DOSSIER.md. Genéralo con: npm run dossier'
    : 'El sitio cambió y el dossier ya no lo describe.\n'
      + 'Vuelve a generarlo con `npm run dossier` — y si ya estaba firmado,\n'
      + 'la firma cubre la versión anterior: hay que decírselo a quien firmó.');
  process.exit(1);
}

mkdirSync(dirname(DESTINO), { recursive: true });
writeFileSync(DESTINO, texto);
console.log(`Escrito docs/verificacion/DOSSIER.md · huella ${huella()}`);
