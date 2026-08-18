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
import { listo } from './supabase-config.js';

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
