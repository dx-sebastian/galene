/* ═══════════════════════════════════════════════════════════════════
   Galene — que el interruptor de verdad mueva las seis páginas.

   POR QUÉ NO ES UNA PRUEBA DE PLAYWRIGHT. Las de `pruebas/e2e/` corren
   contra UN compilado, el que sirve el servidor de pruebas. Lo que hay
   que comprobar aquí es que dos compilados distintos —uno con el freno
   puesto y otro sin él— salen coherentes, y eso pide compilar dos
   veces. Vive aparte para que la batería normal no tarde un minuto más
   cada vez, y se ejecuta cuando se toca la maquinaria de indexación:

       npm run interruptor

   LO QUE COMPRUEBA, y por qué cada cosa:

   · Con `VERIFICADO = false`  →  `noindex` en las 6 páginas, y
     robots.txt con `Disallow: /`. Que una sola página se escape es
     exactamente el fallo que este archivo existe para impedir.

   · Con `VERIFICADO = true`   →  `noindex` en 0 de 6 —salvo el 404,
     que nunca es contenido—, robots.txt con paso libre y el sitemap
     anunciado.

   · En los dos casos, el sitemap lista las mismas diez direcciones,
     todas absolutas, todas con barra final y todas existentes en el
     compilado. Un sitemap que promete una página que no está es peor
     que no tener sitemap.

   ── CÓMO SE COMPILA LA OTRA VERSIÓN SIN TOCAR EL ARCHIVO BUENO ─────
   Se copia el árbol de `src` a un directorio temporal, se cambia la
   palabra en la copia y se compila desde ahí. El `src` del repositorio
   no se toca en ningún momento: si esto se cayera a la mitad, no deja
   el interruptor cambiado.
   ═══════════════════════════════════════════════════════════════════ */
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SITIO = 'https://dx-sebastian.github.io/galene/';
const PAGINAS = ['index.html', 'comunidad/index.html', 'expertos/index.html',
  'productos/index.html', 'productos/funda-coletero/index.html'];

let fallos = 0;
const comprobar = (bien, texto) => {
  console.log(`  ${bien ? '✓' : '✘'} ${texto}`);
  if (!bien) fallos++;
};

function compilar(verificado) {
  const raiz = mkdtempSync(join(tmpdir(), 'galene-interruptor-'));
  for (const que of ['src', 'public', 'scripts', 'astro.config.mjs', 'package.json']) {
    cpSync(que, join(raiz, que), { recursive: true });
  }
  /* node_modules por enlace: copiarlo son cientos de megas y varios
     minutos, y lo único que hace falta es que Astro esté ahí. */
  execFileSync('ln', ['-s', join(process.cwd(), 'node_modules'), join(raiz, 'node_modules')]);

  const archivo = join(raiz, 'src/datos/sitio.js');
  const antes = readFileSync(archivo, 'utf8');
  const despues = antes.replace(/export const VERIFICADO = (true|false);/,
                                `export const VERIFICADO = ${verificado};`);
  if (antes === despues && !antes.includes(`VERIFICADO = ${verificado};`)) {
    throw new Error('no se encontró la declaración de VERIFICADO en datos/sitio.js');
  }
  writeFileSync(archivo, despues);

  const salida = join(raiz, 'dist');
  execFileSync('npx', ['astro', 'build', '--outDir', salida], {
    cwd: raiz, stdio: 'pipe',
    env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
  });
  return { raiz, salida };
}

function revisar(verificado) {
  console.log(`\nVERIFICADO = ${verificado}`);
  const { raiz, salida } = compilar(verificado);
  try {
    let conNoindex = 0;
    for (const p of PAGINAS) {
      const html = readFileSync(join(salida, p), 'utf8');
      if (/<meta[^>]+name="robots"[^>]+noindex/.test(html)) conNoindex++;
    }
    comprobar(conNoindex === (verificado ? 0 : PAGINAS.length),
      `noindex en ${conNoindex} de ${PAGINAS.length} páginas`
      + ` (se esperaban ${verificado ? 0 : PAGINAS.length})`);

    const err404 = readFileSync(join(salida, '404.html'), 'utf8');
    comprobar(/name="robots"[^>]+noindex/.test(err404),
      'el 404 lleva noindex pase lo que pase');

    const robots = readFileSync(join(salida, 'robots.txt'), 'utf8');
    comprobar(verificado ? /^Allow: \/$/m.test(robots) : /^Disallow: \/$/m.test(robots),
      `robots.txt dice ${verificado ? 'Allow' : 'Disallow'}`);
    comprobar(verificado === /^Sitemap: /m.test(robots),
      `robots.txt ${verificado ? 'anuncia' : 'no anuncia'} el sitemap`);

    const mapa = readFileSync(join(salida, 'sitemap.xml'), 'utf8');
    const locs = [...mapa.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    comprobar(locs.length === 9, `el sitemap lista ${locs.length} direcciones (se esperaban 9)`);
    comprobar(locs.every((u) => u.startsWith(SITIO)), 'todas absolutas y del sitio bueno');
    comprobar(locs.every((u) => u.endsWith('/')),
      'todas con barra final (sin ella GitHub Pages responde 301)');
    const ausentes = locs
      .map((u) => u.replace(SITIO, ''))
      .filter((r) => !existsSync(join(salida, r, 'index.html')));
    comprobar(ausentes.length === 0,
      ausentes.length ? `prometen páginas que no existen: ${ausentes.join(', ')}`
                      : 'todas existen en el compilado');
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
}

console.log('Compilando las dos versiones del sitio…');
revisar(false);
revisar(true);
console.log(fallos ? `\n${fallos} comprobación(es) en rojo.` : '\nEl interruptor mueve todo lo que tiene que mover.');
process.exit(fallos ? 1 : 0);
