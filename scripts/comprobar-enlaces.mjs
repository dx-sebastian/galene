/* ═══════════════════════════════════════════════════════════════════
   Galene — que los enlaces de fuera sigan llevando a alguna parte.

   ── POR QUÉ EXISTE ─────────────────────────────────────────────────
   Porque uno se rompió y lo encontró el dueño, no una prueba. Apuntaba
   a la denuncia virtual de la Fiscalía por una ruta de seis segmentos,
   y esa ruta desapareció cuando el servicio se unificó en otro portal.

   En este sitio eso no es un enlace roto cualquiera. Los de aquí van a
   líneas de ayuda, a rutas de denuncia y a los trabajos que sostienen
   cada afirmación clínica: un 404 en «A Denunciar» le pasa a alguien
   que acaba de decidir denunciar, que es la peor hora para encontrarse
   una pared.

   ── POR QUÉ NO ESTÁ EN LA BATERÍA ──────────────────────────────────
   Dos razones, y las dos son de honestidad y no de comodidad:

   1 · Depende de internet y de que veinte servidores ajenos estén de
       humor. Una prueba que se pone roja porque una universidad hace
       mantenimiento no dice nada sobre este sitio, y una prueba que
       miente se acaba ignorando.
   2 · Este entorno NO ALCANZA los dominios .gov.co colombianos:
       fiscalia.gov.co cierra la conexión sin más. Meterlo en la batería
       aquí sería declarar roto lo que solo está lejos.

   Así que se lanza a mano, y conviene lanzarlo DESDE COLOMBIA:

       npm run enlaces

   ── LO QUE DISTINGUE, Y ES LA PARTE QUE IMPORTA ────────────────────
   Tres resultados, no dos:

       ✓ responde            el enlace está vivo
       ✘ 404 / 500           el enlace está roto: hay que arreglarlo
       ? no se pudo llegar   ni una cosa ni la otra — puede ser el sitio
                             o puede ser esta máquina, y decir cuál
                             sería inventárselo

   Solo el segundo grupo devuelve error. Un comprobador que cuenta los
   «no sé» como fallos entrena a la gente a ignorarlo.

   ── Y EL 403 ES UN «NO SÉ», NO UN ROTO ─────────────────────────────
   La primera ejecución declaró seis enlaces rotos y cinco eran falsos:
   Wiley, JAMA y SAGE responden 403 a cualquier cosa que no parezca un
   navegador con persona detrás. Esos enlaces funcionan perfectamente
   —son las fuentes del panel de expertos— y llamarlos rotos habría
   hecho exactamente el daño que este archivo dice evitar: seis rojos
   de los que cinco no lo son, y a la tercera vez nadie lo mira.

   Un servidor que se niega a hablar con un robot no está diciendo que
   la página no exista. Está diciendo que no habla con robots.
   ═══════════════════════════════════════════════════════════════════ */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = 'dist';
const AGENTE = 'Mozilla/5.0 (compatible; galene-comprobador/1.0)';
const PLAZO = 20_000;

function paginas(dir) {
  const salida = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, e.name);
    if (e.isDirectory()) salida.push(...paginas(ruta));
    else if (e.name.endsWith('.html')) salida.push(ruta);
  }
  return salida;
}

try { statSync(RAIZ); } catch {
  console.error(`No hay ${RAIZ}/. Compila primero: npm run build`);
  process.exit(1);
}

/* Dónde aparece cada dirección, para no tener que buscarla después. */
const donde = new Map();
for (const p of paginas(RAIZ)) {
  const html = readFileSync(p, 'utf8');
  for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
    const url = m[1];
    /* El propio sitio no se comprueba aquí: de eso ya se encarga
       indexacion.spec.js, que además lo hace sin salir a internet. */
    if (url.startsWith('https://dx-sebastian.github.io')) continue;
    if (!donde.has(url)) donde.set(url, new Set());
    donde.get(url).add(p.replace(`${RAIZ}/`, '').replace('/index.html', '') || '(portada)');
  }
}

const direcciones = [...donde.keys()].sort();
console.log(`${direcciones.length} direcciones de fuera en ${paginas(RAIZ).length} páginas\n`);

async function mirar(url) {
  const corte = AbortSignal.timeout(PLAZO);
  try {
    /* GET y no HEAD: hay servidores públicos que responden 405 a HEAD y
       200 a GET, y un 405 aquí se leería como un enlace roto que no lo
       está. */
    const r = await fetch(url, {
      redirect: 'follow', signal: corte,
      headers: { 'user-agent': AGENTE, accept: 'text/html,*/*' },
    });
    return { codigo: r.status, final: r.url };
  } catch (e) {
    return { codigo: 0, error: e.cause?.code || e.name || String(e).slice(0, 40) };
  }
}

const rotos = [], dudosos = [], vivos = [];
/* De cuatro en cuatro: ni tan despacio que tarde una tarde ni tan
   deprisa que a alguien le parezca un escáner. */
for (let i = 0; i < direcciones.length; i += 4) {
  const lote = direcciones.slice(i, i + 4);
  const r = await Promise.all(lote.map(mirar));
  lote.forEach((url, j) => {
    const { codigo, final, error } = r[j];
    const paginas = [...donde.get(url)].join(', ');
    if (codigo >= 200 && codigo < 400) {
      vivos.push(url);
      const mudo = final && final !== url ? `  → ${final}` : '';
      console.log(`  ✓ ${codigo}  ${url}${mudo}`);
    } else if (codigo === 0) {
      dudosos.push({ url, error, paginas });
      console.log(`  ? ––   ${url}  (${error})`);
    } else if (codigo === 401 || codigo === 403 || codigo === 429) {
      /* «No hablo con robots» no es «esta página no existe». */
      dudosos.push({ url, error: `${codigo}, rechaza al comprobador`, paginas });
      console.log(`  ? ${codigo}  ${url}  (rechaza al comprobador)`);
    } else {
      rotos.push({ url, codigo, paginas });
      console.log(`  ✘ ${codigo}  ${url}   [${paginas}]`);
    }
  });
}

console.log(`\n${vivos.length} responden · ${rotos.length} rotos`
  + ` · ${dudosos.length} sin poder comprobar`);
if (dudosos.length) {
  console.log('\nSin comprobar (puede ser el sitio o puede ser esta máquina):');
  for (const d of dudosos) console.log(`  ${d.url}  — ${d.error}  [${d.paginas}]`);
}
if (rotos.length) {
  console.log('\nROTOS, y hay que arreglarlos:');
  for (const r of rotos) console.log(`  ${r.codigo}  ${r.url}  [${r.paginas}]`);
}
process.exit(rotos.length ? 1 : 0);
