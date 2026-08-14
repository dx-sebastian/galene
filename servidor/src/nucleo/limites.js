/* ═══════════════════════════════════════════════════════════════════
   limites.js — CUBOS DE FICHAS.

   Un cubo por (tipo, quien). Nace lleno, cada acción gasta una ficha y
   el cubo se rellena a ritmo constante. Eso permite lo que hace una
   persona —votar cuatro cosas seguidas mientras lee— y no permite lo
   que hace un script: el ritmo sostenido es la recarga, no el tamaño.

   Todo en memoria y a propósito: un límite es una defensa contra el
   ruido de ahora mismo, no un dato que valga la pena escribir en un
   disco. Al reiniciar se olvidan, y está bien.

   Se limita por SESIÓN y por HUELLA DE IP, y hacen falta las dos: solo
   por sesión no limita nada (pedir otro token es gratis) y solo por IP
   castiga a toda una universidad detrás del mismo NAT.
   ═══════════════════════════════════════════════════════════════════ */

import { config } from '../config.js';

const cubos = new Map();
const MINUTO = 60_000;

function gastar(clave, [capacidad, recarga], cuantas = 1) {
  const ahora = Date.now();
  let c = cubos.get(clave);
  if (!c) { c = { fichas: capacidad, ultimo: ahora }; cubos.set(clave, c); }

  c.fichas = Math.min(capacidad, c.fichas + ((ahora - c.ultimo) / 1000) * recarga);
  c.ultimo = ahora;

  if (c.fichas < cuantas) {
    /* Cuánto falta para la siguiente ficha, para poder decirlo en la
       respuesta: un 429 sin `Retry-After` obliga a reintentar a ciegas,
       y reintentar a ciegas es exactamente lo que no queremos. */
    return { ok: false, espera: Math.ceil((cuantas - c.fichas) / recarga) };
  }
  c.fichas -= cuantas;
  return { ok: true, espera: 0 };
}

/* ── LA IP NO ES UNA PERSONA ───────────────────────────────────────
   El cubo de la sesión y el de la IP no pueden ser igual de estrechos.
   «Dos hilos cada noventa segundos» está bien para una persona y es un
   desastre para una IP: en una casa, en un colegio o en un café hay
   veinte personas detrás del mismo NAT, y con el mismo cubo la primera
   que escribe deja fuera a las demás. En Colombia, además, el CG-NAT de
   los operadores móviles pone a barrios enteros detrás de una IP.

   Así que el cubo de la huella va multiplicado: la sesión es la que
   sujeta a una persona, y la IP solo está para que pedir tokens nuevos
   no salga gratis. */
const FACTOR_IP = 6;
const escalar = ([capacidad, recarga]) => [capacidad * FACTOR_IP, recarga * FACTOR_IP];

const clavesDe = (tipo, sesion, huella) => [
  [`${tipo}:s:${sesion}`, false],
  [`${tipo}:h:${huella}`, true],
];

/* MIRAR NO ES COBRAR, y separarlos arregla algo que se vio en las
   pruebas: si el cubo se cobra ANTES de validar, dos erratas seguidas
   —un título corto, una etiqueta mal escrita— gastan el presupuesto de
   escritura, y la persona que por fin escribió bien su mensaje se
   encuentra con «vas demasiado rápido» y noventa segundos de espera.
   En este sitio, esa persona no vuelve.

   Así que los intentos se cobran de un cubo generoso y la PUBLICACIÓN
   se cobra del cubo estrecho, y solo cuando de verdad se publicó. */
export function mirar(tipo, sesion, huella, cuantas = 1) {
  const regla = config.limites[tipo];
  if (!regla) return { ok: true, espera: 0 };
  const ahora = Date.now();

  for (const [clave, esIp] of clavesDe(tipo, sesion, huella)) {
    const [capacidad, recarga] = esIp ? escalar(regla) : regla;
    const c = cubos.get(clave);
    const fichas = c ? Math.min(capacidad, c.fichas + ((ahora - c.ultimo) / 1000) * recarga) : capacidad;
    if (fichas < cuantas) return { ok: false, espera: Math.max(1, Math.ceil((cuantas - fichas) / recarga)) };
  }
  return { ok: true, espera: 0 };
}

export function cobrar(tipo, sesion, huella, cuantas = 1) {
  const regla = config.limites[tipo];
  if (!regla) return;
  for (const [clave, esIp] of clavesDe(tipo, sesion, huella)) {
    gastar(clave, esIp ? escalar(regla) : regla, cuantas);
  }
}

/* Las dos cuentas —sesión e IP— se gastan JUNTAS o no se gasta ninguna:
   si la de IP pasa y la de sesión no, gastar la de IP castiga a la
   persona por un intento que ni siquiera se ejecutó. */
export function permitir(tipo, sesion, huella, cuantas = 1) {
  const paso = mirar(tipo, sesion, huella, cuantas);
  if (paso.ok) cobrar(tipo, sesion, huella, cuantas);
  return paso;
}

/* Barrido: un cubo que lleva diez minutos lleno es un cubo que no dice
   nada. Sin esto, el Map crece con cada visitante que pasó una vez.
   `unref` para que este temporizador no impida que el proceso termine. */
const barrido = setInterval(() => {
  const limite = Date.now() - 10 * MINUTO;
  for (const [clave, c] of cubos) if (c.ultimo < limite) cubos.delete(clave);
}, 5 * MINUTO);
barrido.unref?.();

export const cuantosCubos = () => cubos.size;
export const olvidarCubos = () => cubos.clear();   // solo para las pruebas
