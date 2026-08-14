# Galene · servidor

La mitad que faltaba: la bandada compartida, la calma que se acumula de
verdad y la comunidad sin datos inventados.

Un proceso de Node, un fichero SQLite al lado, dos dependencias en total
(`ws`, y `node:sqlite` que ya viene dentro de Node). Se levanta con
`npm start`, se copia con `cp` y se apaga con Ctrl+C sin perder la calma
acumulada.

---

## ⚠ Esto contradice una frase del README del sitio

El README dice, hoy:

> **No hay servidor.** Ni analítica, ni cookies, ni base de datos.

A partir del momento en que esto se despliegue, esa frase es **falsa**, y
la sección «Escribir» de `Comunidad.astro` —que dice que no hay dónde
guardar un mensaje— también. **Las dos hay que reescribirlas antes de
publicar**, o el sitio estará mintiendo sobre privacidad en una página
sobre violencia sexual, que es la peor forma posible de mentir.

Lo que sí sigue siendo verdad, y conviene que la frase nueva lo diga:

- **Cero cookies.** Ninguna. La sesión es un token opaco que el navegador
  guarda donde quiera (el sitio: `sessionStorage`, que muere al cerrar la
  pestaña) y que viaja en una cabecera.
- **Cero cuentas, cero correos, cero contraseñas.**
- **Ninguna IP se guarda.** Se usa para limitar y se convierte en
  `sha256(ip + sal_del_día)`; la sal se sortea al arrancar, se cambia
  cada 24 h y el resultado vive solo en memoria. Al día siguiente, la
  huella de ayer no se puede recalcular ni teniendo la IP delante.
- **Ningún registro con datos personales.** El log dice método, camino,
  código y milisegundos. No dice quién.
- **Nada de terceros.** No hay analítica, ni CDN, ni servicio gestionado.
  Los mensajes de la comunidad no salen de la máquina donde corre esto.
- **Lo que se guarda es anónimo**: con la base entera delante no se puede
  saber quién escribió qué, ni suplantar a nadie. Sigue siendo un dato
  delicado —lo escrito es lo escrito— pero no identifica.
- **Se puede borrar.** Quien escribe recibe una llave de borrado que se
  enseña una vez. Con ella se borra mañana lo que se escribió esta
  madrugada, aunque la pestaña ya se haya cerrado.

Propuesta de frase para el README, para que la decisión quede escrita:

> **Privacidad.** Hay un servidor, y guarda tres cosas: la bandada del
> manglar, la calma acumulada del mar y lo que se escribe en la
> comunidad. No guarda quién. Sin cuentas, sin cookies, sin correo, sin
> IP y sin analítica: lo único que ata dos mensajes a la misma persona es
> un token que vive en la pestaña y se va al cerrarla. Lo que se escribe
> se puede borrar, con la llave que se entrega al publicarlo.

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
| `npm start` | Levanta HTTP + WebSocket en el puerto 5178 |
| `npm run dev` | Igual, recargando al guardar |
| `npm run prueba` | 121 comprobaciones contra el servidor de verdad |
| `npm run sembrar` | Mete los diez hilos de ejemplo, marcados `ejemplo: true` |
| `npm run sembrar -- --vaciar` | Los quita |
| `npm run sembrar -- --todo` | Vacía la comunidad entera |
| `npm run purgar` | Corre la retención y enseña qué se llevó |

**`GALENE_SECRETO` es obligatorio en producción.** Sin él se usa uno
aleatorio por arranque, y al reiniciar caducan todas las sesiones y todas
las llaves de borrado. El servidor lo avisa al arrancar.

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
| `GET /api/estado` | Todo lo de la portada en una petición: token, calma, sintonía del gesto, la bandada, tu garza, las etiquetas y los límites de texto |
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

### La comunidad

| Ruta | |
| --- | --- |
| `GET /api/hilos?orden=&etiqueta=&cursor=&limite=&instantanea=&comentarios=` | La lista |
| `GET /api/hilos/nuevos?instantanea=` | Cuántos llegaron mientras leías |
| `GET /api/hilos/:id` | Uno |
| `GET /api/hilos/:id/comentarios?cursor=&limite=` | Su hebra, dos niveles |
| `POST /api/hilos` | `{titulo, cuerpo, etiqueta, nombre?, anonima?}` |
| `POST /api/hilos/:id/comentarios` | `{texto, padre?, nombre?, anonima?}` |
| `POST /api/votos/:objeto/:id` | `{dir: -1 \| 0 \| 1}` |
| `POST /api/reportes/:objeto/:id` | `{motivo}` |
| `DELETE /api/hilos/:id` · `DELETE /api/comentarios/:id` | Con la sesión o con `X-Galene-Borrado` |
| `GET /api/moderacion/cola` · `POST /api/moderacion/:objeto/:id` | Con `X-Galene-Llave` |

**Órdenes**: `recientes`, `votados`, `solas`.
**Paginación por clave, no por offset.** El cursor es opaco. Cada
respuesta trae `instantanea`; devolverla en la siguiente página es lo que
impide que un hilo nuevo desplace la lista bajo el dedo y se salte o
repita uno. Lo que llega mientras se lee se cuenta aparte con
`/api/hilos/nuevos`.

**La lista devuelve el cuerpo ENTERO**, en párrafos, no un extracto: es
lo que permite leer sin tarjetas de resumen. Con `?comentarios=3` trae
además los primeros comentarios de cada hilo.

### Códigos

`401` sin sesión · `403` no es tuyo · `404` no está (o no existe la
puerta) · `413` demasiado largo · `415` no es JSON · `422` no pasa la
validación, con `campo` · `429` cubo vacío, con `Retry-After`.

---

## El WebSocket

`ws://…/ws`. Uno por pestaña, y por él va todo: los toques, la calma, las
garzas y el aviso de hilo nuevo.

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
{"t":"hilo-nuevo","id":"…"}       {"t":"comentario-nuevo","hilo":"…","id":"…"}
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

**Las señales de moderación son las reglas del proyecto, no un filtro de
spam.** Lo que aquí puede hacer daño no es un anuncio: es un plazo médico
inventado o un teléfono escrito de memoria. `validar.js` manda a revisión
lo que huele a eso — y **quien lo escribió lo sigue viendo**, con su
aviso, porque ver desaparecer tu mensaje sin explicación es que se te
calle.

**El límite por IP es seis veces más ancho que el de la sesión.** En una
casa, un colegio o el CG-NAT de un operador móvil hay barrios enteros
detrás de la misma IP: con el mismo cubo, la primera persona que escribe
deja fuera a las demás.

**El cubo de escritura se cobra al publicar, no al intentar.** Dos
erratas seguidas no pueden gastarte el turno; en este sitio, esa persona
no vuelve.

---

## Desplegarlo

Cualquier sitio que corra Node 22.5+ y tenga un disco persistente:
Fly.io, Railway, un VPS con systemd. **Hace falta disco de verdad**: el
fichero SQLite es la calma acumulada y la comunidad entera.

- `GALENE_ORIGENES` con el dominio del estático (GitHub Pages incluido).
- `GALENE_CONFIAR_PROXY=1` si hay un proxy delante, o todas las peticiones
  compartirán la huella del proxy y el cubo por IP no limitará nada.
- Copia de seguridad = copiar `datos/galene.db` (con el `.db-wal` al
  lado, o parando el proceso un segundo).
- El WebSocket necesita que el proxy pase el `upgrade` sin cortarlo.

---

## Los ficheros

```
src/
  config.js              todas las perillas, en un sitio
  base/esquema.sql       lo que se guarda, con el porqué de cada tabla
  base/base.js           SQLite, transacciones, caché de sentencias
  base/purga.js          la retención
  nucleo/identidad.js    tokens, hashes, huella de IP rotatoria, sellos
  nucleo/limites.js      cubos de fichas
  nucleo/validar.js      validar, sanear y las señales de revisión
  nucleo/http.js         enrutador, CORS, cabeceras, cuerpo con techo
  dominio/mar.js         la calma y su techo
  dominio/garzas.js      la bandada, las perchas, el desalojo
  dominio/foro.js        hilos, hebras, votos, paginación por clave
  tiempo-real/canal.js   el WebSocket
  rutas/api.js           la superficie
  servidor.js            donde se ata todo
pruebas/prueba.mjs       121 comprobaciones, sin dobles ni simulacros
```
