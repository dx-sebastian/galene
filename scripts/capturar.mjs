/* ═══════════════════════════════════════════════════════════════════
   capturar.mjs — VER LA PÁGINA SIN DEPENDER DE QUE ALGUIEN LA MIRE.

   El panel del navegador deja de componer a ratos, y sin capturas no se
   puede decidir nada de lo que se ve. Esto conduce un Chrome sin
   ventana por el protocolo de DevTools y devuelve PNG de verdad: la
   página entera o el trozo que se le pida.

   No usa Puppeteer ni añade dependencias al sitio: habla CDP a pelo, y
   el WebSocket lo toma prestado del servidor, que ya lo tiene.

     node scripts/capturar.mjs --url "http://localhost:5177/galene/?hora=23" \
       --salida tmp/vistas/noche.png --ancho 1400 --alto 1200 \
       [--sel "#expertos"] [--completa] [--espera 1200]

   `--sel` centra ese elemento antes de disparar; `--completa` captura
   la página entera aunque mida veinte pantallas.
   ═══════════════════════════════════════════════════════════════════ */

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import ws from '../servidor/node_modules/ws/index.js';

const WebSocket = ws.WebSocket || ws;

const arg = (nombre, porDefecto) => {
  const i = process.argv.indexOf('--' + nombre);
  if (i < 0) return porDefecto;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : true;
};

const NAVEGADORES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
];

const url = arg('url', 'http://localhost:5177/galene/');
const salida = resolve(arg('salida', 'tmp/vistas/captura.png'));
const ancho = Number(arg('ancho', 1400));
const alto = Number(arg('alto', 1200));
const sel = arg('sel', null);
const completa = !!arg('completa', false);
const espera = Number(arg('espera', 1400));
const puerto = Number(arg('puerto', 9333));

const exe = NAVEGADORES.find((p) => existsSync(p));
if (!exe) { console.error('No encontré Chrome ni Edge.'); process.exit(1); }

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const navegador = spawn(exe, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars',
  '--force-device-scale-factor=1',
  `--remote-debugging-port=${puerto}`,
  `--user-data-dir=${resolve('tmp/chrome-capturas')}`,
  '--no-first-run', '--no-default-browser-check',
  `--window-size=${ancho},${alto}`,
  'about:blank',
], { stdio: 'ignore' });

/* El puerto tarda en abrir. Se sondea en vez de dormir a ciegas. */
let objetivo = null;
for (let i = 0; i < 60 && !objetivo; i++) {
  await dormir(250);
  try {
    const lista = await (await fetch(`http://127.0.0.1:${puerto}/json/list`)).json();
    objetivo = lista.find((t) => t.type === 'page');
  } catch { /* todavía no */ }
}
if (!objetivo) { navegador.kill(); console.error('El navegador no abrió el puerto.'); process.exit(1); }

const cable = new WebSocket(objetivo.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 });
await new Promise((ok, mal) => { cable.on('open', ok); cable.on('error', mal); });

let siguiente = 1;
const pendientes = new Map();
const sucesos = new Map();
cable.on('message', (crudo) => {
  const m = JSON.parse(String(crudo));
  if (m.id && pendientes.has(m.id)) {
    const { ok, mal } = pendientes.get(m.id);
    pendientes.delete(m.id);
    m.error ? mal(new Error(m.error.message)) : ok(m.result);
  } else if (m.method && sucesos.has(m.method)) {
    sucesos.get(m.method)();
    sucesos.delete(m.method);
  }
});
const cdp = (method, params = {}) => new Promise((ok, mal) => {
  const id = siguiente++;
  pendientes.set(id, { ok, mal });
  cable.send(JSON.stringify({ id, method, params }));
});
const alSuceso = (method) => new Promise((ok) => sucesos.set(method, ok));

await cdp('Page.enable');
await cdp('Runtime.enable');
await cdp('Emulation.setDeviceMetricsOverride',
  { width: ancho, height: alto, deviceScaleFactor: 1, mobile: false });

const cargada = alSuceso('Page.loadEventFired');
await cdp('Page.navigate', { url });
await Promise.race([cargada, dormir(15000)]);
await dormir(espera);

/* Las imágenes perezosas no cargan si nadie baja. Se recorre la página
   entera de un tirón para despertarlas y se vuelve arriba. */
await cdp('Runtime.evaluate', {
  expression: `(async () => {
    const paso = innerHeight * 0.8;
    for (let y = 0; y < document.body.scrollHeight; y += paso) {
      scrollTo(0, y);
      await new Promise(r => setTimeout(r, 60));
    }
    scrollTo(0, 0);
    document.querySelectorAll('img[loading="lazy"]').forEach(i => i.loading = 'eager');
    await Promise.all([...document.images]
      .filter(i => !i.complete)
      .map(i => new Promise(r => { i.onload = i.onerror = r; })));
  })()`,
  awaitPromise: true,
});
await dormir(500);

if (sel) {
  await cdp('Runtime.evaluate', {
    expression: `document.querySelector(${JSON.stringify(sel)})
      ?.scrollIntoView({ block: 'start', behavior: 'instant' })`,
  });
  await dormir(600);
}

/* ── ESPERAR AL PAPEL ──────────────────────────────────────────────
   Las láminas de lectura (`--arte-papel`, `--arte-aguadas`…) valen
   `none` hasta que <html> recibe `.lectura-cerca`: no se piden durante
   el hero. Disparar antes de eso captura la página SIN papel, y eso
   costó cuatro medidas seguidas que no se podían comparar entre sí —
   unas tenían grano y otras no, y el número se movía por eso y no por
   lo que yo estaba cambiando. */
const { result: conPapel } = await cdp('Runtime.evaluate', {
  expression: `(async () => {
    for (let i = 0; i < 40; i++) {
      if (document.documentElement.classList.contains('lectura-cerca')) return true;
      await new Promise(r => setTimeout(r, 100));
    }
    return false;
  })()`,
  awaitPromise: true, returnByValue: true,
});
if (!conPapel.value) console.warn('  ⚠ sin .lectura-cerca: la captura va SIN papel');
await dormir(700);

let tiro = { format: 'png' };
if (completa) {
  const { result } = await cdp('Runtime.evaluate', {
    expression: '[document.documentElement.scrollWidth, document.documentElement.scrollHeight]',
    returnByValue: true,
  });
  const [w, h] = result.value;
  tiro.captureBeyondViewport = true;
  tiro.clip = { x: 0, y: 0, width: w, height: Math.min(h, 30000), scale: 1 };
}

const { data } = await cdp('Page.captureScreenshot', tiro);
mkdirSync(dirname(salida), { recursive: true });
writeFileSync(salida, Buffer.from(data, 'base64'));
console.log(`${salida}  ${(Buffer.from(data, 'base64').length / 1024).toFixed(0)} KB`);

cable.close();
navegador.kill();
process.exit(0);
