/* ═══════════════════════════════════════════════════════════════════
   bandada-cliente.js — LA BANDADA Y EL MAR, HABLÁNDOLE A SUPABASE.

   Mismo patrón que supabase-cliente.js (el foro): sin servidor propio
   delante, RLS y funciones SECURITY DEFINER deciden qué puede hacer
   cada quien — ver servidor/src/base/esquema-bandada.sql. Este módulo
   es solo el mensajero.

   Lo que NO hace: no toca «la visita» (la garza que aterrija cerca al
   abrir el sitio). Esa se queda simbólica y sin red, a propósito —
   ver la conversación que decidió eso. Solo la bandada de fondo y el
   mar hablan con Supabase.
   ═══════════════════════════════════════════════════════════════════ */
/* ── LA BIBLIOTECA NO ENTRA EN LA PORTADA ──────────────────────────
   Solo `listo` es estático, y viene de `supabase-config.js`, que son
   tres líneas y no arrastra nada. El cliente de verdad —215 kB de
   `@supabase/supabase-js`— se pide con `import()` y solo cuando hay
   con quién hablar.

   El motivo no es la elegancia: la bandada y la calma son
   enhancements, y esta es la página que alguien abre a las cuatro de
   la mañana con datos móviles. Ver la cabecera de `supabase-config.js`
   para la medida. */
import { listo, URL_SUPABASE, LLAVE_ANON } from './supabase-config.js';

export { listo };

/* Una sola promesa, compartida: diez llamadas seguidas al arrancar no
   pueden ser diez descargas. `import()` ya cachea el módulo, pero
   guardar la promesa además evita diez `entrar()` en paralelo. */
let cliente = null;
async function base() {
  if (!listo) throw new Error('Supabase no está configurado (faltan las variables PUBLIC_SUPABASE_*).');
  if (!cliente) {
    cliente = import('./supabase-cliente.js').then(async (m) => {
      await m.entrar();
      return m.supabase;
    }).catch((e) => { cliente = null; throw e; });
  }
  return cliente;
}

/* Los nombres de pose del servidor (`config.garzas.poses`, iguales
   desde el servidor viejo) no son los nombres de las CAPAS de imagen
   que ya carga main.js (`posada, pAlerta, pEncoge, pUnaPata, pMira,
   pAlas`). Se traduce una vez, aquí, para que el resto del código no
   tenga que saber que hay dos vocabularios. */
export const POSE_A_CAPA = {
  'reposo': 'posada',
  'alerta': 'pAlerta',
  'encogida': 'pEncoge',
  'una-pata': 'pUnaPata',
  'mira-abajo': 'pMira',
  'alas': 'pAlas',
};

export async function dejarGarza() {
  const supabase = await base();
  const { data, error } = await supabase.rpc('dejar_garza');
  if (error) throw error;
  return data?.[0] || null;
}

/* ── DESPEDIRSE AL CERRAR ──────────────────────────────────────────
   Sin esto, una garza se queda en el árbol para siempre: lo único que
   la sacaba era el desalojo de la más antigua, o sea que el manglar
   enseñaba las últimas diez sesiones que hubo alguna vez y no quién
   está. MEDIDO contra la base en vivo: once sesiones seguidas dejaron
   once garzas y ninguna se fue sola. La regla 3 dice que no se fabrica
   a nadie, y una garza de alguien que cerró hace horas es exactamente
   eso.

   Va en `pagehide` y NO en `unload`: `unload` no dispara en iOS y
   además rompe la caché de atrás-adelante. Y va por `fetch` a pelo con
   `keepalive` en vez de por el SDK, porque en una pestaña que se está
   cerrando el navegador cancela cualquier petición que no lo lleve.
   `keepalive` es la promesa de que sale igual.

   Si no sale —sin batería, proceso matado por el sistema—, el respaldo
   es la ventana de dos horas de `garzas_publico`. Ver la nota en
   esquema-bandada.sql. */
export async function despedirse() {
  if (!listo || !cliente) return false;      // ni configurado ni conectado: nada que retirar
  try {
    const m = await import('./supabase-cliente.js');
    const { data: { session } } = await m.supabase.auth.getSession();
    if (!session) return false;
    return navigator.sendBeacon
      ? enviarConBeacon(session.access_token)
      : enviarConFetch(session.access_token);
  } catch { return false; }
}

/* `sendBeacon` es lo que de verdad sobrevive al cierre, pero no deja
   poner cabeceras: la `apikey` y el token tienen que viajar en la
   consulta. PostgREST los acepta ahí — es el mismo mecanismo que usan
   los enlaces firmados de Storage. */
function enviarConBeacon(token) {
  const url = `${URL_SUPABASE}/rest/v1/rpc/volar_garza?apikey=${encodeURIComponent(LLAVE_ANON)}`;
  return navigator.sendBeacon(url, new Blob([JSON.stringify({})],
    { type: 'application/json' })) || enviarConFetch(token);
}

function enviarConFetch(token) {
  fetch(`${URL_SUPABASE}/rest/v1/rpc/volar_garza`, {
    method: 'POST', keepalive: true,
    headers: { apikey: LLAVE_ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}',
  }).catch(() => { /* se cerró antes: queda la ventana de dos horas */ });
  return true;
}

export async function garzasVivas() {
  const supabase = await base();
  const { data, error } = await supabase.from('garzas_publico').select('*').order('llegada', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function pintarPico(id, color) {
  const supabase = await base();
  const { data, error } = await supabase.rpc('pintar_pico', { p_id: id, p_color: color });
  if (error) throw error;
  return data?.[0] || null;
}

export async function acreditarGesto(segundos) {
  const supabase = await base();
  const { data, error } = await supabase.rpc('acreditar_gesto', { p_segundos: segundos });
  if (error) throw error;
  return data?.[0] || null;
}

export async function calmaActual() {
  const supabase = await base();
  const { data, error } = await supabase.rpc('calma_actual');
  if (error) throw error;
  return typeof data === 'number' ? data : 0.35;
}

/* Un solo canal, 'manglar', para los tres avisos — igual que el
   WebSocket único de antes. Privado (ver la política en
   esquema-bandada.sql): todo el mundo aquí ya entró con Auth Anónima,
   así que no hay motivo para dejarlo abierto a quien no ha entrado
   nunca. */
let canal = null;
export async function suscribirManglar({ onLlega, onVuela, onPico } = {}) {
  if (!listo || canal) return canal;
  const supabase = await base();
  /* Dos llamadas a la vez podrían llegar aquí las dos con `canal` en
     null y abrir dos canales al mismo nombre; se vuelve a mirar
     después del `await`, que es donde se pierde la atomicidad. */
  if (canal) return canal;
  canal = supabase.channel('manglar')
    .on('broadcast', { event: 'garza-llega' }, ({ payload }) => onLlega?.(payload))
    .on('broadcast', { event: 'garza-vuela' }, ({ payload }) => onVuela?.(payload))
    .on('broadcast', { event: 'pico' }, ({ payload }) => onPico?.(payload))
    .subscribe();
  return canal;
}
