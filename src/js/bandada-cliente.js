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
import { supabase, entrar, listo } from './supabase-cliente.js';

export { listo };

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
  await entrar();
  const { data, error } = await supabase.rpc('dejar_garza');
  if (error) throw error;
  return data?.[0] || null;
}

export async function garzasVivas() {
  await entrar();
  const { data, error } = await supabase.from('garzas_publico').select('*').order('llegada', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function pintarPico(id, color) {
  await entrar();
  const { data, error } = await supabase.rpc('pintar_pico', { p_id: id, p_color: color });
  if (error) throw error;
  return data?.[0] || null;
}

export async function acreditarGesto(segundos) {
  await entrar();
  const { data, error } = await supabase.rpc('acreditar_gesto', { p_segundos: segundos });
  if (error) throw error;
  return data?.[0] || null;
}

export async function calmaActual() {
  await entrar();
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
export function suscribirManglar({ onLlega, onVuela, onPico } = {}) {
  if (!listo || canal || !supabase) return canal;
  canal = supabase.channel('manglar')
    .on('broadcast', { event: 'garza-llega' }, ({ payload }) => onLlega?.(payload))
    .on('broadcast', { event: 'garza-vuela' }, ({ payload }) => onVuela?.(payload))
    .on('broadcast', { event: 'pico' }, ({ payload }) => onPico?.(payload))
    .subscribe();
  return canal;
}
