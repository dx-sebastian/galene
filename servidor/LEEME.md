# Galene · servidor

La bandada compartida y la calma del mar que se acumula de verdad. El
foro **ya no vive aquí** — desde el 17 ago 2026 vive en Postgres
(Supabase) y el navegador le habla directo. Ver
`src/base/esquema-foro.sql` para las reglas del foro, y más abajo para
el porqué del cambio.

Un proceso de Node, un fichero SQLite al lado, una dependencia real
(`ws`; `pg` la usan solo las herramientas de mantenimiento, no el
servidor). Se levanta con `npm start`, se copia con `cp` y se apaga con
Ctrl+C sin perder la calma acumulada.

---

## Privacidad

Sin cuentas, sin cookies, sin correo. La bandada y el mar guardan lo de
siempre — ninguna IP, ningún registro con datos personales, todo
`Cache-Control: no-store` — en el disco de esta máquina, y eso no ha
cambiado.

El foro se mudó a Postgres gestionado por Supabase, en su capa
gratuita: es el único servicio de terceros que tiene el proyecto, y es
una decisión consciente, no un descuido — ver la cabecera de
`esquema-foro.sql` para el razonamiento completo. Lo que sigue siendo
cierto ahí: sin cuentas ni contraseñas (Auth Anónima da un
identificador opaco, no un login), sin guardar quién escribió qué más
allá de ese identificador, con llave de borrado que solo su dueño
puede usar. Lo que cambió: esos mensajes ya no se quedan en el disco de
esta máquina — viven en la infraestructura de Supabase, sujeta a su
propia política de privacidad, y el límite de envíos por IP (que
dependía de tener un servidor propio en medio) no tiene equivalente por
ahora.

Sigue con `noindex` y banner de borrador porque 6 ventanas médicas y
2 líneas telefónicas no tienen fuente verificada.

---

## Levantarlo

```bash
cd servidor
npm install
cp .env.ejemplo .env      # y poner GALENE_SECRETO
npm start
```

| Comando | Qué hace |
| --- | --- |
| `npm start` | Levanta HTTP + WebSocket en el puerto 5178 — bandada y mar, no el foro |
| `npm run dev` | Igual, recargando al guardar |
| `npm run prueba` | Comprobaciones contra el servidor de verdad (bandada y mar) |
| `npm run sembrar` | Mete los diez hilos de ejemplo en el foro (Supabase), marcados `ejemplo: true` |
| `npm run sembrar -- --vaciar` | Los quita |
| `npm run sembrar -- --todo` | Vacía el foro entero |
| `npm run purgar` | Corre la retención —local y del foro— y enseña qué se llevó |

**`GALENE_SECRETO` es obligatorio en producción.** Sin él se usa uno
aleatorio por arranque, y al reiniciar caducan todas las sesiones de la
bandada. El servidor lo avisa al arrancar.

**`GALENE_PG_URL` hace falta para `sembrar`/`purgar`.** Es la cadena de
conexión directa a Postgres (Project Settings → Database, en
supabase.com) — con la contraseña de la base, no con la llave `anon`.
El servidor HTTP (`npm start`) no la necesita: no toca el foro.

El sitio estático necesita SU PROPIO `.env`, en la raíz del repo, no
aquí — ver `.env.example` ahí: `PUBLIC_SUPABASE_URL` y
`PUBLIC_SUPABASE_ANON_KEY`, las dos de Project Settings → API.

---

## La API

Todo bajo `/api`, todo JSON, todo `Cache-Control: no-store` — que no es
una manía: la regla 6 del proyecto dice que el botón de salir no deja
rastro, y una respuesta cacheada es exactamente un rastro.

La sesión va en la cabecera **`X-Galene-Sesion`**. Se pide una vez con
`GET /api/estado` y se guarda en `sessionStorage`.

### Portada

| Ruta | Qué devuelve |
| --- | --- |
| `GET /api/estado` | Token, calma, sintonía del gesto, la bandada, tu garza y los límites de la bandada |
| `GET /api/salud` | Para el supervisor del hosting |

### La bandada

| Ruta | |
| --- | --- |
| `GET /api/garzas` | Las vivas, de la más antigua a la más nueva |
| `POST /api/garzas` | Deja la tuya. **Idempotente**: volver a llamar devuelve la misma, no otra |
| `PATCH /api/garzas/:id/pico` | `{ "pico": "#c4553f" }` |

Una garza trae `{id, percha, pose, mira, escala, pico, llegada, tocada}`.
La geometría la reparte el servidor —no el navegador— porque si la
sorteara cada pestaña, dos personas verían dos árboles distintos y el
argumento del sitio se cae.

`POST /api/garzas` puede devolver `{garza: null, seFue: true}`: llegaron
diez después de la tuya y voló. No se da otra a propósito (ver
`dominio/garzas.js`).

### El mar

| Ruta | |
| --- | --- |
| `GET /api/mar` | Calma y sintonía |
| `POST /api/mar/gesto` | `{ "segundos": 12 }` — respaldo para cuando no hay WebSocket |

### Códigos

`401` sin sesión · `404` no está (o no existe la puerta) · `413`
demasiado largo · `415` no es JSON · `422` no pasa la validación, con
`campo` · `429` cubo vacío, con `Retry-After`.

**El foro tiene su propia superficie**, la de Supabase (PostgREST +
Auth), no esta. Ver `src/base/esquema-foro.sql` y
`src/js/supabase-cliente.js` en la raíz del repo.

---

## El WebSocket

`ws://…/ws`. Uno por pestaña, y por él van los toques, la calma y las
garzas — ya no los avisos de hilo o comentario nuevo, que eran del
foro.

**Del navegador:**

```jsonc
{"t":"hola","sesion":"<token de 32 hex>"}   // primero, o se cierra en 5 s
{"t":"toque","p":0,"x":0.42,"y":0.18}       // p = dedo (0..2)
{"t":"suelto","p":0}
```

**Del servidor:**

```jsonc
{"t":"hola","yo":7,"calma":0.51,"restante":240,"sintonia":{…}}
{"t":"toques","v":[[conexión, dedo, x, y, fuerza, edad], …]}
{"t":"calma","c":0.53}
{"t":"garza-llega","garza":{…}}   {"t":"garza-vuela","id":"…"}   {"t":"pico","id":"…","pico":"#…"}
```

Tres cosas que no son obvias y están así por una razón:

1. **El paquete de toques lleva TODOS los toques, incluido el tuyo.** Se
   serializa una sola vez para todo el mundo en vez de un mensaje
   personalizado por conexión. Tu navegador descarta los que traen tu
   `yo`: tu propia mano se pinta al instante, sin esperar a la red.
2. **La edad del anillo la cuenta el servidor.** Si la contara cada
   cliente, el mismo anillo estaría en un sitio distinto en cada
   pantalla, y lo que se comparte es justamente que sea la misma agua.
3. **Un toque sin noticias en 2,5 s se suelta solo.** Si un móvil se
   bloquea con el dedo puesto, su toque no puede dejar el agua de todo el
   mundo aplanada para siempre.

El origen se comprueba en el `upgrade`: **un WebSocket no tiene CORS**, y
si no se mira ahí, no lo mira nadie.

---

## Decisiones que conviene conocer antes de tocar nada

**La calma tiene techo, y no es un descuido.** «Lo que dejas, queda» +
monótona + sin techo = el mar se vuelve espejo en unas semanas y no
vuelve. El día que eso pase, quien entre y ponga la mano no verá nada: el
agua ya estaba quieta antes de que llegara. `GALENE_TECHO_RAICES` (0.55)
dice cuánto del rango puede poner la comunidad. Saturada, el mar de
bienvenida está en 0.625 —visiblemente más sereno que el 0.35 de un sitio
vacío— y una mano sola lo lleva a 0.82. La comunidad calma el mar; no lo
termina. **Nunca baja.**

**No se difunde cuánta gente hay.** Ni presencia, ni contador de
visitas, ni el número de raíces en crudo. Un número de personas en un
sitio sobre sumisión química se lee como un recuento, y la regla 9 dice
que el sitio nunca cuenta. Lo que se ve es el árbol con sus garzas y el
agua más quieta.

**Cualquiera puede pintarle el pico a cualquier garza** (`GALENE_PICO_AJENO=1`).
Es una decisión: la bandada es de todos y no hay nada que robar. A 0,
solo la propia.

**Las decisiones del foro** —señales de moderación, límite de envíos,
umbral de reportes— ya no viven en este README: viven comentadas junto
al código que las aplica, en `src/base/esquema-foro.sql`.

---

## Desplegarlo

Esto —bandada y mar— cualquier sitio que corra Node 22.5+ y tenga un
disco persistente: Fly.io, Railway, un VPS con systemd.

- `GALENE_ORIGENES` con el dominio del estático (GitHub Pages incluido).
- `GALENE_CONFIAR_PROXY=1` si hay un proxy delante, o todas las peticiones
  compartirán la huella del proxy y el cubo por IP no limitará nada.
- Copia de seguridad = copiar `datos/galene.db` (con el `.db-wal` al
  lado, o parando el proceso un segundo).
- El WebSocket necesita que el proxy pase el `upgrade` sin cortarlo.

El foro no se despliega: ya está en Supabase. Lo único que hace falta en
el hosting del sitio estático son las dos variables `PUBLIC_SUPABASE_*`
en tiempo de build.

---

## Los ficheros

```
src/
  config.js                todas las perillas de la bandada y el mar
  base/esquema.sql          lo que se guarda LOCAL: bandada y mar
  base/esquema-foro.sql     lo que se guarda en Supabase: el foro, con RLS
  base/base.js               SQLite, transacciones, caché de sentencias
  base/basePostgres.js       conexión de MANTENIMIENTO a Supabase (sembrar/purgar, no el servidor)
  base/purga.js              retención: purgarLocal + purgarForo
  nucleo/identidad.js        tokens, hashes, huella de IP rotatoria, sellos (bandada/mar)
  nucleo/limites.js          cubos de fichas (bandada/mar)
  nucleo/validar.js          validar, sanear
  nucleo/http.js             enrutador, CORS, cabeceras, cuerpo con techo
  dominio/mar.js              la calma y su techo
  dominio/garzas.js           la bandada, las perchas, el desalojo
  dominio/foro.js             YA NO SE USA en el servidor — se queda por si algún día hace
                               falta un camino con servidor delante otra vez. No lo borra este cambio.
  tiempo-real/canal.js        el WebSocket
  rutas/api.js                la superficie: solo bandada y mar
  servidor.js                 donde se ata todo
pruebas/prueba.mjs           comprobaciones contra el servidor (bandada y mar)
herramientas/sembrar.js      siembra el foro de Supabase con hilos de ejemplo
herramientas/purgar.js       retención a mano, local y de Supabase
```
