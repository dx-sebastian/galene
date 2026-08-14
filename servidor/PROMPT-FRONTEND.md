# Prompt para el frontend de Galene

> Copia todo lo que hay por debajo de la línea y pégalo en una sesión
> nueva de Claude Code, en la raíz del repo. Es autónomo: no hace falta
> nada de la conversación en la que se escribió el servidor.

---

Estás trabajando en **Galene**, un sitio colombiano sobre **sumisión
química** (agresión facilitada por drogas). Es a la vez una obra en
acuarela con aspiración Awwwards y un conjunto de herramientas
prácticas, y esa tensión es el proyecto. El repo es Astro 7 estático con
`base: '/galene'`; el hero es un fragment shader WebGL2 que compone
láminas de acuarela pintadas a mano.

**Acabo de escribir el servidor. Existe, funciona y tiene 121 pruebas en
verde. Está en `servidor/` y no hay que tocarlo.** Tu trabajo es el
frontend: conectar el sitio a lo que ya está hecho.

---

## 0 · Las reglas que no se negocian

Están en el README del repo y valen para todo lo que escribas:

1. **No re-escenificar el hecho.** Ni la copa, ni el bar, ni la gota
   cayendo. En concreto: **una onda que se expande desde un punto es una
   gota cayendo en un líquido**, y eso es justo lo que este sitio no
   representa. Los anillos del gesto van **de fuera hacia dentro**. Esta
   regla ya descartó una idea de vídeo entera; que no la descarte otra
   vez contigo.
2. **No terror.** Ni glitch, ni caos visual, ni sonido inquietante.
3. **No fabricar personas, ni testimonios, ni cifras sin fuente.**
4. **No revictimizar. No se pregunta qué pasó.**
5. **La ayuda está a cero clics.** El teléfono y el botón de salir
   existen desde el primer milisegundo, en HTML, sin depender de
   JavaScript. Nada de lo que hagas puede meterse por delante de eso.
6. **Salida rápida real**, con `location.replace` para no dejar rastro.
7. **`prefers-reduced-motion` APAGA. No reduce.**
8. **Nadie es castigado por su contexto.** A las 4 a.m. el mundo no está
   más vacío que a las 3 p.m.
9. **El sitio nunca cuenta víctimas.** Y por extensión: **no pongas
   ningún contador de personas en pantalla.** Ni «12 conectadas», ni
   «3.482 han pasado por aquí», ni «47 garzas esta semana». El servidor
   no te da esos números a propósito. Si se te ocurre uno, no.
10. **El ave es siempre una garza.** No se cambia de especie.
11. **El mar es un enhancement**: los módulos van en `<script>` separados
    para que si la pintura no compila, la ayuda siga sirviendo. Lo mismo
    vale para todo lo que añadas: si el servidor está caído, el sitio
    tiene que seguir en pie.
12. **Lo que dejas, queda**: la calma acumulada nunca baja.

Y dos leyes de estilo del proyecto:

- **La imperfección vive en el mundo. El instrumento es exacto.** El mar
  puede tener grafito sin borrar y bordes desiguales; el reloj, el
  teléfono y el botón de salir van con tipografía plana y alineación
  exacta.
- **No se opina sobre la imagen: se mide.** Hay un asidero de desarrollo
  (`window.__mar.medir(hora, paso, t, calma)`, `window.__galene`,
  `window.__com`, bajo `import.meta.env.DEV`) que permite pisar hora,
  reloj y calma, y leer el fotograma con `readPixels`. Si vas a decir que
  algo «se ve mejor», mídelo primero.

---

## 1 · El servidor que ya existe

```bash
cd servidor
npm install
cp .env.ejemplo .env      # pon GALENE_SECRETO con `openssl rand -hex 32`
npm start                 # http://localhost:5178  ·  ws://localhost:5178/ws
npm run prueba            # 121 comprobaciones, por si dudas de algo
npm run sembrar           # opcional: mete 10 hilos de ejemplo marcados
```

Lee `servidor/LEEME.md` antes de empezar. Resumen de lo que hay:

- **Cero cookies, cero cuentas, cero correo.** La sesión es un token
  opaco de 32 hex que viaja en la cabecera `X-Galene-Sesion`.
- **Ninguna IP se guarda.** Solo un hash con sal que rota cada 24 h, en
  memoria.
- Todo responde `Cache-Control: no-store` — es la regla 6 aplicada a la
  red: una respuesta cacheada es exactamente el rastro que el botón de
  salir promete no dejar.
- La API devuelve **texto plano**, nunca HTML.

### Dónde vive la API

El estático y la API están en orígenes distintos. Añade a la raíz del
repo un `.env` con:

```
PUBLIC_GALENE_API=http://localhost:5178
```

…y léelo con `import.meta.env.PUBLIC_GALENE_API` (Astro expone las
`PUBLIC_*` al navegador). **Nunca escribas la URL a mano en el código**,
igual que las rutas del sitio nunca se escriben a mano y salen de
`import.meta.env.BASE_URL`. Si la variable no está, el sitio tiene que
seguir funcionando sin servidor: bandada local, calma sin acumular, y la
comunidad diciendo la verdad.

---

## 2 · El contrato, con respuestas de verdad

Todas las muestras de aquí abajo salieron del servidor corriendo. No
están inventadas.

### `GET /api/estado` — la primera y única petición de la portada

Devuelve un token si no lo llevabas (y lo repite en la cabecera
`X-Galene-Sesion`). **Guárdalo en `sessionStorage`, NO en
`localStorage`.** La razón está escrita en `src/js/comunidad.js`: qué
hilos sobre sumisión química miró alguien es un dato sensible, y
`localStorage` sobrevive al botón de salir. `sessionStorage` muere al
cerrar la pestaña, que es exactamente lo que este sitio necesita.

```jsonc
{
  "version": "0.1.0",
  "sesion": "66030afa4f26e32193ff71bef7551e76",
  "calma": 0.35,
  "sintonia": {
    "base": 0.35, "rango": 0.5,
    "tauSesion": 6, "techoSesion": 0.92,
    "radioMin": 0.16, "radioMax": 1.3,
    "anillos": 3, "anilloVel": 0.4,
    "subeFuerza": 1.6, "ganancia": 1,
    "hzEnvio": 15, "topeSesion": 240,
    "maxPunteros": 3, "maxToques": 8,
    "hzDifusion": 12, "caducaToque": 2500
  },
  "restante": 240,
  "garzas": [
    { "id": "12fe257df52d002a", "percha": 3, "pose": "reposo",
      "mira": 1, "escala": 0.931, "pico": null,
      "llegada": 1786676331722, "tocada": null }
  ],
  "mia": null,
  "etiquetas": [
    { "id": "acompanar", "nombre": "Acompañar", "pigmento": "#2F6B4F",
      "pie": "Estar con alguien, o pedir que estén contigo." },
    { "id": "ruta", "nombre": "Ruta médica", "pigmento": "#3E6E8E",
      "pie": "Cómo es ir, qué se dice, qué se pregunta." },
    { "id": "despues", "nombre": "Después", "pigmento": "#4A3A63",
      "pie": "Los días y las semanas que siguen." },
    { "id": "cuidados", "nombre": "Cuidados", "pigmento": "#5B93AC",
      "pie": "Lo práctico: salir, volver, dormir, comer." },
    { "id": "preguntas", "nombre": "Preguntas", "pigmento": "#C4553F",
      "pie": "Dudas sobre el sitio y sobre lo que sigue." }
  ],
  "limites": { "titulo": [8,140], "cuerpo": [1,4000],
               "comentario": [1,2000], "nombre": 24 },
  "garzasMax": 10, "perchas": 11, "picoAjeno": true
}
```

### La bandada

| Ruta | |
| --- | --- |
| `GET /api/garzas` | `{garzas: [...], max: 10}` |
| `POST /api/garzas` | Deja la tuya. **Idempotente** |
| `PATCH /api/garzas/:id/pico` | `{"pico": "#c4553f"}` |

```jsonc
// POST /api/garzas
{ "garza": { "id": "12fe257df52d002a", "percha": 3, "pose": "reposo",
             "mira": 1, "escala": 0.931, "pico": null,
             "llegada": 1786676331722, "tocada": null },
  "nueva": true, "desalojada": null, "garzas": [ … ] }
```

- `desalojada` es el `id` de la que voló para hacerle sitio, o `null`.
- Si tu garza ya voló, responde `{ "garza": null, "seFue": true }`. **No
  se te da otra**, y eso es a propósito: si se diera, desalojaría a
  alguien, esa persona pediría la suya, y dos pestañas abiertas se
  echarían la una a la otra en bucle. Cuando pase, no insistas: enseña el
  árbol con las garzas de las demás y ya está.
- `pose` es una de `reposo · alerta · encogida · una-pata · mira-abajo ·
  alas`, que son exactamente las seis láminas de `public/arte/posada/`.
- `percha` es un índice de `PERCHAS` en `src/js/main.js`.
- El color va normalizado a minúsculas y solo `#rrggbb` (acepta `#abc`).

### La comunidad

| Ruta | |
| --- | --- |
| `GET /api/hilos?orden=&etiqueta=&cursor=&limite=&instantanea=&comentarios=` | La lista |
| `GET /api/hilos/nuevos?instantanea=&etiqueta=` | `{nuevos: 2}` |
| `GET /api/hilos/:id` | `{hilo: {...}}` |
| `GET /api/hilos/:id/comentarios?cursor=&limite=` | La hebra |
| `POST /api/hilos` | `{titulo, cuerpo, etiqueta, nombre?, anonima?}` |
| `POST /api/hilos/:id/comentarios` | `{texto, padre?, nombre?, anonima?}` |
| `POST /api/votos/hilo\|comentario/:id` | `{dir: -1\|0\|1}` |
| `POST /api/reportes/hilo\|comentario/:id` | `{motivo}` |
| `DELETE /api/hilos/:id` · `DELETE /api/comentarios/:id` | Sesión o `X-Galene-Borrado` |

```jsonc
// GET /api/hilos?comentarios=2
{
  "hilos": [{
    "id": "3JUHkr9DriUL",
    "etiqueta": "despues",
    "titulo": "Cómo pedí el día en el trabajo sin contar nada",
    "cuerpo": [
      "Mi jefe pregunta todo. Escribí que tenía una cita médica y no añadí una palabra más.",
      "No hubo que dar explicaciones. Lo dejo aquí porque yo estuve dos días pensando qué inventar."
    ],
    "autora": { "nombre": "Anónima", "anonima": true,
                "pose": "reposo", "mira": 1, "esMia": true },
    "creado": 1786676331731,
    "cuando": "hace un momento",
    "minutos": 0,
    "votos": 0, "respuestas": 1, "miVoto": 0,
    "estado": "visible", "ejemplo": false,
    "primeros": [ /* comentarios, misma forma que abajo */ ]
  }],
  "cursor": null,
  "instantanea": 1786676331737,
  "orden": "recientes",
  "etiqueta": null
}
```

```jsonc
// GET /api/hilos/:id/comentarios
{
  "comentarios": [{
    "id": "SrQF31DQTJvb", "hilo": "3JUHkr9DriUL", "padre": null,
    "texto": "Una cita médica es una cita médica. No hay que adornarla.",
    "autora": { "nombre": "Anónima", "anonima": true,
                "pose": "reposo", "mira": 1, "esMia": true },
    "creado": 1786676331735, "cuando": "hace un momento",
    "votos": 0, "miVoto": 0, "estado": "visible", "ejemplo": false,
    "respuestas": []          // el segundo nivel, en línea
  }],
  "cursor": null
}
```

```jsonc
// POST /api/hilos
{ "id": "3JUHkr9DriUL", "estado": "visible", "razones": [],
  "llave": "jgtv-ba87-8wfk", "hilo": { … } }
```

```jsonc
// POST /api/votos/hilo/:id  →  el marcador de verdad
{ "votos": 1, "miVoto": 1 }
```

**Cosas del contrato que tienes que respetar:**

- **`cursor` es opaco.** No lo interpretes, no lo construyas. Devuélvelo
  tal cual para pedir la página siguiente. `cursor: null` = se acabó.
- **`instantanea` hay que devolverla en cada página siguiente.** Es lo
  que impide que un hilo que llega mientras alguien lee desplace la lista
  y le haga saltarse uno o leer dos veces el mismo. Lo que llega después
  se cuenta aparte con `/api/hilos/nuevos`.
- **La lista ya trae el cuerpo ENTERO en párrafos.** No pidas el hilo
  otra vez para pintarlo, y no lo recortes.
- `estado` puede ser `visible` o `revision`. **`revision` solo te llega
  si es tuyo**: el servidor se lo enseña a quien lo escribió para que
  sepa que está esperando y no que se le calló. Píntalo con un aviso en
  voz baja, nunca como un error.
- `ejemplo: true` marca los hilos sembrados, que son inventados. Si
  decides enseñarlos, dilo en pantalla.
- **Nada de esto va por `innerHTML`.** El servidor devuelve texto plano
  sin escapar, a propósito. Todo a `textContent`, o a una plantilla de
  Astro, que escapa sola. Es la única línea de este sistema cuyo
  incumplimiento es una inyección de scripts.

**Códigos:** `401` sin sesión · `403` no es tuyo · `404` no está · `413`
demasiado largo · `422` no pasa la validación (viene con `campo`) · `429`
demasiado rápido (viene con `Retry-After` en segundos). El cuerpo del
error es siempre `{error: {codigo, mensaje, campo?}}` y **`mensaje` está
escrito en español y para leerse**: enséñalo tal cual en vez de inventar
otro.

---

## 3 · El WebSocket

`ws://…/ws`. **Uno por pestaña, y por él va todo**: los toques del mar,
la calma, las garzas y los avisos de la comunidad. Nada de encuestas
periódicas: un `setInterval` preguntando «¿hay novedades?» cada dos
segundos es, en un móvil, la radio encendida toda la visita.

**Lo que mandas:**

```jsonc
{"t":"hola","sesion":"<el token de 32 hex>"}   // PRIMERO, o te cierra en 5 s
{"t":"toque","p":0,"x":0.42,"y":0.18}          // p = dedo (0, 1 o 2)
{"t":"suelto","p":0}
```

`x` e `y` van en **espacio q**, que es el que ya usa `enQ()` en
`main.js`: `x` en anchos de alto (`0 … ancho/alto`), `y` de 0 abajo a 1
arriba. No lo cambies; el shader piensa en ese espacio.

**Lo que recibes:**

```jsonc
{"t":"hola","yo":7,"calma":0.51,"restante":240,"sintonia":{…}}
{"t":"toques","v":[[7,0,0.42,0.18,0.63,0], [9,0,1.10,0.28,1,0.4]]}
{"t":"calma","c":0.53}
{"t":"garza-llega","garza":{…}}
{"t":"garza-vuela","id":"12fe257df52d002a"}
{"t":"pico","id":"12fe257df52d002a","pico":"#c4553f"}
{"t":"hilo-nuevo","id":"3JUHkr9DriUL"}
{"t":"comentario-nuevo","hilo":"3JUHkr9DriUL","id":"SrQF31DQTJvb"}
```

Cada toque es `[conexión, dedo, x, y, fuerza, edad]`.

**Tres cosas que no son obvias:**

1. **El paquete lleva TODOS los toques, incluido el tuyo.** Se serializa
   una vez para todo el mundo en vez de un mensaje distinto por conexión.
   **Filtra los que traen tu `yo`** y pinta los tuyos con tu propio
   estado local: tu mano no puede ir con retraso de red.
2. **La edad del anillo la cuenta el servidor.** No la recalcules para
   los ajenos: si cada cliente la contara, el mismo anillo estaría en un
   sitio distinto en cada pantalla, y lo que se está compartiendo es
   justamente que sea la misma agua.
3. **Reconexión con espera creciente** (1 s, 2 s, 4 s… hasta 30 s) y sin
   ruido en pantalla. Que el socket se caiga no es un error que haya que
   contarle a nadie: el mar sigue pintándose con la última calma
   conocida.

---

## 4 · Trabajo 1 · La bandada compartida

**Lo que se pide:** cada quien que entra deja una garza en el manglar;
caben diez; **al tocarla se le pinta el pico del color que se quiera**; y
la undécima desaloja a la más antigua.

### 4.1 · Quitarle el sorteo al navegador

Hoy `poblarBandada()` (`src/js/main.js`, hacia la línea 1333) sortea
**todo** con `Math.random()`: cuántas garzas, en qué percha, con qué
pose, de qué tamaño y hacia dónde miran. Eso está bien para un adorno y
deja de estarlo en el momento en que las garzas son personas: si el
sorteo es local, dos visitantes mirando el mismo árbol ven dos árboles
distintos, y el argumento entero del sitio —«esas garzas son de otras que
entraron antes»— es mentira.

- **La geometría la manda el servidor**: `percha`, `pose`, `mira`,
  `escala` y `pico` salen de `/api/estado`.
- **El tiempo sigue siendo del navegador**: el balanceo, los gestos,
  cuáles se remueven (`viva`) y con qué ritmo. Eso es lo que hace que un
  dormidero parezca vivo y no necesita que nadie se ponga de acuerdo.
- `percha` indexa `PERCHAS`, que **tiene once entradas** aunque su
  comentario diga «Doce sitios MEDIDOS» (se cayó una y el comentario se
  quedó). El servidor está configurado a once. Si algún día se miden más
  ramas, hay que cambiar `GALENE_PERCHAS` **y** el array.
- La que se asoma entre las hojas (`asoma`/`hunde`) puede seguir siendo
  decisión local, o pasar a depender de la percha. Lo que no puede es
  cambiar en cada recarga si la garza es la misma.

### 4.2 · El pico

**Esto necesita medir, no ajustar a ojo.** Las seis posadas son láminas
rasterizadas: no se le puede cambiar el color a una zona de un WebP.

Lo que sí se puede, y conserva el borde de acuarela:

1. Medir, para **cada una de las seis** láminas de
   `public/arte/1024/posada/*.webp`, **la caja del pico** en coordenadas
   normalizadas de la lámina. Escribe un script al lado de
   `herramientas-recortar.py` que lo haga por color/geometría y **escupa
   los números**, y déjalos como constantes comentadas con lo que midió
   —igual que están `cx`, `cy` y `pies` en `VUELO`. Nada de números
   puestos a ojo: en este proyecto los umbrales salen de las láminas.
2. Encima de cada garza, un elemento con `background-color: var(--pico)`
   y `mask-image: url(<la misma lámina>)` con `mask-position` y
   `mask-size` puestos para que la máscara **sea la lámina completa** y
   el elemento esté recortado a la caja del pico. Así el color toma la
   silueta pintada exacta del pico, con su borde desigual, en vez de un
   triángulo de vector encima de una acuarela.
3. Sin `--pico`, ese elemento no existe: una garza sin pintar se ve
   exactamente como hoy.

**El gesto.** Tocar la garza abre la elección de color:

- `<input type="color">` nativo. Funciona en Android y en escritorio, y
  es literalmente «el color que quiera».
- Al lado, los cinco pigmentos de las etiquetas como atajo — son los
  colores que el sitio ya usa.
- La zona sensible tiene que ser **de dedo**: mínimo 44×44 px alrededor
  de la garza, aunque la lámina sea más pequeña.
- Es un control, así que va con teclado: `tabindex`, `aria-label` («Pintarle
  el pico a una garza del manglar»), `Enter`/`Espacio` lo abren.
- Al elegir: `PATCH /api/garzas/:id/pico`. Pinta **optimista** y
  deshaz si el servidor dice que no.
- El cambio llega a todo el mundo por `{"t":"pico"}`. Que se vea
  **entrando como una aguada**, no con un cambio instantáneo de color:
  una transición corta sobre la opacidad de la capa del pico.

**Cuidado con una cosa**: el pico se pinta contra el cielo, y el cielo
cambia con la hora. Un pico amarillo claro a mediodía puede quedar en
1,3:1 contra la bruma. No le quites el color a nadie —se pidió «el que
quiera»— pero mide el contraste del pico contra el cielo de las cuatro
horas ancla y, si hace falta, **dale al pico un filete propio**
(un `drop-shadow` finísimo del tono del grafito del sitio), que es como
se resolvería en una acuarela de verdad: con la línea, no cambiando el
pigmento.

### 4.3 · Llegar y volar

- `garza-llega` → **entra volando y se posa**. Reutiliza la secuencia que
  ya existe para la protagonista (`CAIDA`, `FASES`, `HASTA_POSADA`), que
  es crucero, descenso en arco y frenado.
- `garza-vuela` → **se va volando**, no se desvanece. Una garza que
  desaparece es un fallo de carga; una garza que levanta el vuelo es lo
  que pasa en un dormidero cuando llega otra.
- Con `prefers-reduced-motion`, las dos cosas son un cambio de estado sin
  trayectoria. Regla 7: apaga, no reduce.
- **Nada de esto puede empujar la maqueta.** Las garzas viven en
  `#garzas`, encima del lienzo, en posición absoluta.

---

## 5 · Trabajo 2 · La calma, más potente y con muchas manos

**Lo que se pide:** que el efecto de calma del agua sea **más potente**, y
que **varias personas puedan tocarlo a la vez**, en Android y en PC.

### 5.1 · Lo que hoy lo impide

En `src/js/main.js`, hacia la línea 356:

- `sosteniendo` es **una sola variable**: el segundo dedo pisa al primero.
- `TOQUES` guarda como mucho 6 y se comparte con los anillos que se
  cierran.
- `const raices = 0` (línea 107) con `TAU_CALMA = 500`: la curva de la
  comunidad **valía cero**, así que las dos láminas de agua calma
  pintadas a mano llevaban ahí desde el primer día sin llegar a verse
  nunca. **Eso lo arregla el servidor**, que por fin acumula.

En `src/js/mar.js`:

- `uniform vec4 u_toques[6];` (hacia la 182) y `for (int i = 0; i < 6; i++)`
  (hacia la 1094).
- El radio está clavado: `float r = mix(0.13, 0.95, tk.z);` (hacia la 1103).
- `const bufToques = new Float32Array(24);` y `Math.min(6, lista.length)`
  (hacia la 2603).

### 5.2 · Qué cambiar

**En el shader** (`mar.js`), subir de 6 a 8 ranuras: el uniforme, el
bucle, el `Float32Array(32)` y el `Math.min(8, …)`. Y sacar el radio y la
velocidad del anillo a un uniforme nuevo (`u_sintonia`, un `vec4` con
`radioMin`, `radioMax`, `anilloVel`, `ganancia`) alimentado desde la
`sintonia` que manda el servidor, para poder subir la fuerza **sin volver
a construir el sitio** — que es justo lo que hace falta cuando lo que se
está ajustando se decide mirando la pantalla.

> ⚠ **El GLSL vive dentro de un template literal de JavaScript.** Una
> comilla invertida en un comentario del shader lo corta y sale un
> `SyntaxError` con el nombre de una variable GLSL. Ha pasado dos veces.
> Hay un `comprobar-glsl.py` en la raíz: pásalo.

**Los anillos siguen yendo de fuera hacia dentro.** El bloque de
`mar.js` que los dibuja lo explica: una onda que se expande desde un
punto es una gota cayendo, y esa es la escena que este sitio no
re-escenifica. Puedes subir la fuerza, el radio, el número de anillos o
el contraste. **La dirección no se toca.**

**Multitáctil de verdad** (`main.js`): sustituye `sosteniendo` por un
`Map` de `pointerId → toque`, con tope `sintonia.maxPunteros` (3). Cada
`pointerdown` que caiga sobre el agua (`q.y < estado.horizonte`) abre
uno; `pointermove` mueve el suyo; `pointerup`/`pointercancel` sueltan el
suyo. Usa `setPointerCapture` para no perder el dedo al salir del
elemento.

> **Y AQUÍ EL DETALLE QUE MÁS IMPORTA EN ANDROID.** Si pones
> `touch-action: none` en el hero para poder sostener, **te cargas el
> scroll de la portada**: alguien entra al sitio y no puede bajar. Deja
> `touch-action: pan-y` y arbitra como se arbitra un long-press: al
> `pointerdown` arranca un plazo de ~120 ms; si el dedo no se ha movido
> más de ~10 px, **reclama** el gesto (`setPointerCapture` y
> `preventDefault` en el `pointermove` siguiente) y es un toque; si se
> movió en vertical primero, no era un toque, era alguien bajando.
> Compruébalo en un teléfono de verdad: que se pueda calmar el agua y que
> se pueda bajar la página.

**Mandar y recibir:**

- Manda `{"t":"toque"}` a `sintonia.hzEnvio` (15/s) **y solo si se movió**,
  con un `suelto` al levantar.
- Recibe `{"t":"toques"}`, **descarta los de tu `yo`** y quédate con
  los ajenos.
- Lo que entra al shader es la mezcla: **los tuyos con tu estado local**
  (inmediatos) **más los ajenos del servidor**, ordenados por fuerza y
  cortados a 8.

**La calma compuesta.** El servidor te da `calma`, que ya lleva dentro lo
que ha puesto la comunidad y su techo. La de tu mano se compone encima
como se componen dos aguadas, que es lo que ya hace `avanzarToques()`:

```js
const s = sintonia;                                  // la del servidor
const cComunidad = (calmaDelServidor - s.base) / s.rango;
const cSesion    = s.techoSesion * (1 - Math.exp(-sostenido / s.tauSesion));
estado.calma     = s.base + s.rango * (1 - (1 - cComunidad) * (1 - cSesion));
```

`sostenido` son los segundos con al menos una mano puesta —**por mano, no
por dedo**: tres dedos no calman tres veces más rápido— y se corta en
`restante`, que te dice el servidor. Cuando `restante` llega a cero, tu
gesto **se sigue viendo en tu pantalla** (lo pinta el navegador) pero deja
de mover el mar de todos. No hace falta decírselo a nadie.

**Y la calma nunca baja.** Ni al soltar, ni al reconectar, ni al cambiar
de hora. Si escribes una línea que la reste, está mal.

### 5.3 · Sin WebSocket

Proxys corporativos que cortan el `upgrade`, redes raras, navegadores
viejos. Si el socket no abre a los ~4 s:

- La calma sale de `GET /api/estado` y se refresca con `GET /api/mar`
  cada 30 s (solo mientras el hero esté visible: hay un
  `IntersectionObserver` en `main.js` que ya lo sabe).
- El gesto propio se acumula local y se manda con
  `POST /api/mar/gesto {segundos}` al soltar, o cada 15 s si se aguanta.
- No hay toques ajenos. El gesto propio funciona igual. **Ni un mensaje
  de error en pantalla**: el mar es un enhancement.

### 5.4 · Y con el movimiento apagado

`prefers-reduced-motion: reduce` **apaga** el gesto entero: ni toques, ni
anillos, ni socket para el mar. Lo que sí se pinta es la calma que ya
tiene el agua, que es un estado, no un movimiento.

---

## 6 · Trabajo 3 · La comunidad, sin datos quemados y cómoda de leer

**Lo que se pide:** el foro completo contra el servidor, **fuera los
datos quemados**, **sin tarjetas de resumen**, cómodo de leer en Android
y en PC, con **carga perezosa / scroll infinito**.

> **El repo se mueve mientras tanto.** Hay más de una sesión trabajando
> sobre él, así que puede haber ficheros nuevos o cambiados desde que se
> escribió esto (`ComunidadExpertos.astro`, `Resonancias.astro`,
> `Acerca.astro`, `src/datos/glosario.js`…). **Mira qué hay antes de dar
> por buena cualquier ruta de aquí abajo.** `ComunidadExpertos.astro` es
> otra cosa —citas de especialistas con fuente— y no la toca este trabajo.

### 6.1 · Fuera `src/datos/comunidad.js`

Ese fichero lleva escrito en su propia cabecera que **todo lo suyo es
inventado**. `Comunidad.astro` lo importa y pinta los diez hilos en el
HTML al construir. Eso se va entero:

- `Comunidad.astro` deja de importar `HILOS` y `respuestasDe`.
- Las etiquetas **también** salen del servidor (`/api/estado`), así que
  tampoco hace falta `ETIQUETAS`.
- Borra `src/datos/comunidad.js`. Si quieres ver la página con contenido
  mientras trabajas: `cd servidor && npm run sembrar` mete esos mismos
  hilos en la base marcados `ejemplo: true`, y
  `npm run sembrar -- --vaciar` los saca.

**La página pasa a pintarse en el cliente**, porque el sitio es estático
y la comunidad ya no lo es. Eso obliga a tres cosas:

1. Un `<noscript>` que **diga la verdad**: que la comunidad necesita
   JavaScript y que la ayuda no. Con los tres enlaces de siempre
   (`#reloj`, `#mapa`, `#salir`) **en HTML**, porque la regla 5 no
   admite excepciones.
2. Un estado de carga que no sea un esqueleto gris parpadeando. Este
   sitio es acuarela: que sea la misma **hoja mojada** que ya usa
   `.hilos--mojada` en `estilos/comunidad.css`.
3. Un estado de error honesto: «no se pudo llegar al servidor», con un
   botón de reintentar y los enlaces de ayuda debajo. Sin dramatismo y
   sin rojo — el rojo del sitio está reservado al daño.

### 6.2 · Sin tarjetas de resumen

Hoy cada hilo es una tarjeta con título, cuerpo y un pie con votos y
respuestas plegadas. Lo que se pide es **una columna que se lee de arriba
abajo**:

- **El cuerpo entero, siempre.** Ya viene en párrafos desde el servidor.
  Nada de recortar a tres líneas ni de «leer más».
- **Los primeros comentarios en línea**, sin tener que abrir nada: pide
  `GET /api/hilos?comentarios=3`. El resto, con un
  «ver las otras N respuestas» que llama a
  `GET /api/hilos/:id/comentarios`. Un botón que carga es distinto de un
  botón que despliega lo que ya estaba: no cargues las 40 respuestas de
  todos los hilos por si acaso.
- **Medida de lectura**: la columna de texto entre **60 y 75 caracteres**
  por línea. Mídelo, no lo estimes: pon una cadena de prueba y cuenta.
  En móvil eso son los márgenes que ya tiene el sitio; en escritorio hay
  que ponerle techo al ancho.
- **Separación por aire, no por caja.** Entre hilos, aire y a lo sumo el
  filete pintado que ya existe. Cuantas menos cajas, más se parece a
  leer y menos a un tablero.
- La jerarquía que queda: etiqueta y autora en voz baja, título grande,
  cuerpo, y el pie con los votos y las respuestas. Igual que ahora, pero
  sin el borde de tarjeta.

### 6.3 · Scroll infinito

- Un centinela al final con `IntersectionObserver` (`rootMargin` de un
  viewport, para que cargue antes de llegar).
- **Y un botón de «traer más» de verdad**, visible, en el mismo sitio. No
  es redundante: con teclado, con lector de pantalla o si el observador
  no dispara, el scroll infinito es un callejón sin salida. Este proyecto
  no deja controles muertos, y tampoco deja finales muertos.
- Pasa `cursor` **y `instantanea`** en cada página. Si no pasas la
  instantánea, un hilo que llegue mientras alguien lee desplaza la lista
  y esa persona se salta uno o lee dos veces el mismo.
- `cursor: null` → se acabó. Dilo con una frase, no con un vacío.
- Cambiar de orden o de etiqueta **reinicia** cursor e instantánea y
  vuelve a pedir. Ahora ordena el servidor, no el DOM: `js/comunidad.js`
  pierde sus bloques 3 y 4, y `data-minutos` / `data-votos` /
  `data-respuestas` dejan de tener sentido.
- «N hilos nuevos» va en una pastilla fija arriba, alimentada por
  `hilo-nuevo` del socket y confirmada con `GET /api/hilos/nuevos`. Al
  pulsarla, recarga desde arriba con instantánea nueva. **Nunca insertes
  un hilo nuevo bajo el dedo de quien está leyendo.**
- **Anuncia lo que cambia** en el `role="status"` que `comunidad.js` ya
  crea: «12 hilos más», «primero los que nadie ha respondido». Reordenar
  o añadir sin decirlo es un cambio enorme y silencioso para quien no ve
  la lista.

### 6.4 · Escribir

El panel de `Comunidad.astro` dice hoy que «no hay servidor» y tiene el
botón apagado. **Ahora sí hay.** El texto entero hay que reescribirlo
(ver §7).

- `POST /api/hilos`. Respeta `limites` de `/api/estado` y **enseña la
  cuenta que queda** cerca del final, no un error después de escribir
  4.000 caracteres.
- «Publicar sin nombre» sigue marcado por defecto. Sin nombre → `Anónima`.
- **La llave de borrado se enseña UNA VEZ**, al publicar, y hay que
  contarla bien: *«Guarda esto si quieres poder borrarlo más adelante.
  No se vuelve a mostrar y no la tenemos.»* Con un botón de copiar. En
  un sitio como este, poder deshacer lo que se dijo a las cuatro de la
  mañana no es una comodidad: es parte del trato.
- Si el hilo sale en `revision`, dilo en voz baja y sin alarma: *«Se está
  revisando antes de publicarse. Lo puedes ver tú.»* Y **no lo escondas**:
  el servidor te lo devuelve porque es tuyo.
- Los errores `422` traen `campo`: márcalo en el formulario y **no
  borres lo escrito**, nunca.
- Comentar y responder, igual. El tercer nivel **el servidor lo aplana al
  segundo** (te devuelve `padre` distinto del que mandaste): pinta lo que
  te devuelve, no lo que pediste.

### 6.5 · Votar, reportar, borrar

- El voto llama a `POST /api/votos/…` y pinta lo que devuelve
  (`{votos, miVoto}`). La aritmética de Reddit que ya está en
  `comunidad.js` sigue valiendo para el estado optimista: pulsar lo
  puesto lo quita, saltar de un lado a otro son dos puntos. **Al fallar,
  deshaz y no expliques.** El `aria-pressed` va en **las dos** flechas.
- **Reportar** es nuevo y hace falta: un foro anónimo sobre violencia
  sexual sin forma de avisar es un problema, no una función que falta.
  Discreto, en el pie, con un motivo corto. Al enviarlo, dar las gracias
  y ya.
- **Borrar lo propio**: aparece cuando `autora.esMia`. Confirmación de
  una línea, sin ventana modal de terror.

### 6.6 · Lo que ya funciona y no hay que romper

`data-seccion-hoja` engancha `js/paralaje.js` (las aguadas se descuelgan
al bajar) y `js/desplazamiento.js` (cada hilo llega mojado y se seca
antes de entrar en la zona de lectura). Los dos **miden posiciones una
vez** y escuchan `resize`.

**Cada vez que insertes hilos, despacha `dispatchEvent(new Event('resize'))`.**
`comunidad.js` ya lo hace al ordenar y al filtrar, y explica por qué: sin
eso, `desplazamiento.js` sigue creyendo que la tarjeta que ahora está
arriba está abajo, y la deja mojada en mitad de la zona de lectura.

---

## 7 · Trabajo 4 · Los textos que a partir de ahora mienten

Esto no es opcional. En una página sobre violencia sexual, una promesa de
privacidad que ha dejado de ser cierta es la peor cosa que se puede
publicar.

**`README.md`** dice hoy:

> **No hay servidor.** Ni analítica, ni cookies, ni base de datos.

Sustitúyelo por lo que de verdad pasa (esta redacción está comprobada
contra el código de `servidor/`):

> **Privacidad.** Hay un servidor, y guarda tres cosas: la bandada del
> manglar, la calma acumulada del mar y lo que se escribe en la
> comunidad. No guarda quién. Sin cuentas, sin cookies, sin correo, sin
> IP y sin analítica: lo único que ata dos mensajes a la misma persona es
> un token que vive en la pestaña y se va al cerrarla. Lo que se escribe
> se puede borrar, con la llave que se entrega al publicarlo.

Y en la lista de «Antes de publicar», añade: **verificar que la
retención (`GALENE_DIAS_RETENCION`) y lo que dice el README coinciden**.

**`Comunidad.astro`**, panel de escribir, dice hoy:

> **Esto es una maqueta.** Galene no tiene servidor, ni cuentas, ni base
> de datos, y eso es una decisión…

Reescríbelo. Lo que hay que decir ahora, con la misma voz: que se publica
de verdad, que no hace falta nombre, que no se guarda quién eres, que se
puede borrar con la llave, y que hay moderación. Sin letra pequeña.

**`src/js/comunidad.js`**, cabecera: el bloque «NADA SE GUARDA, Y ES A
PROPÓSITO» explica que los votos se van al recargar porque no hay
servidor. Ya no es cierto para los votos —sí lo sigue siendo para el
aparato: **el token va en `sessionStorage` y ahí muere**. Cuéntalo así.

---

## 8 · Cómo se comprueba

Este proyecto no acepta «se ve bien». Antes de decir que algo está hecho:

**La bandada.** Abre el sitio en dos navegadores a la vez. Las diez
garzas tienen que estar **en la misma rama, con la misma pose y el mismo
tamaño** en los dos. Píntale el pico a una en uno y mira el otro: tiene
que cambiar sin recargar. Abre once pestañas: la primera garza levanta el
vuelo.

**El pico.** Mide el contraste del pico contra el cielo a las cuatro
horas ancla (`?dev=1&hora=…`) con los colores extremos que permite el
selector: blanco puro y negro puro. Di el número.

**La calma.** `window.__mar.medir(hora, paso, t, calma)` pisa el estado y
lee el fotograma. Compara el agua a `calma = 0.35` y a `calma = 0.82` y
di **cuánto cambia de verdad** — si la diferencia medida es de dos
niveles de 255, el efecto no existe por muy potente que suene el número.
Recuerda la trampa que ya costó tres rondas en este repo: **un ruido de
periodo más largo que la pantalla no es variación, es una constante.** Si
algo «no se nota», mira la frecuencia antes que la amplitud.

**Las manos a la vez.** Dos aparatos (o dos navegadores) tocando el agua
al mismo tiempo: los dos anillos tienen que verse en las dos pantallas.
En Android, con dos dedos, dos anillos. Y **que se pueda bajar la
página** con el dedo sin que el hero se lo trague.

**La comunidad.** Con `npm run sembrar`, baja hasta el final con
`limite=5` y comprueba que **no se repite ni se salta ningún hilo** —
compara los `id`. Publica algo desde otra pestaña mientras bajas: no
puede colarse en medio, tiene que aparecer en la pastilla de arriba.
Mide la línea de texto: 60–75 caracteres.

**Lo que no se puede romper.** Con JavaScript desactivado, la portada
sigue enseñando el teléfono y el botón de salir. Con el servidor apagado
(`Ctrl+C`), la portada carga, el hero pinta y la ayuda funciona.

Deja los asideros de desarrollo, bajo `import.meta.env.DEV`, como los que
ya hay: un `window.__red` con el estado del socket, la última calma
recibida, los toques ajenos vivos y la última respuesta de la API. El
panel del navegador deja de componer a ratos y sin esos asideros no hay
capturas.

---

## 9 · Lo que NO se hace

- **Ningún contador de personas.** Regla 9. El servidor no te da esos
  números a propósito.
- **Ninguna onda que se expanda desde un punto.** Regla 1.
- **Nada por `innerHTML`.**
- **Nada en `localStorage`.** El token va en `sessionStorage`.
- **Ninguna cookie.**
- **Ningún servicio de terceros**: ni fuentes de Google, ni CDN, ni
  analítica, ni un sitio de imágenes. Todo se sirve del propio repo.
- **Ningún avatar que sea una cara.** Cada quien lleva una de las seis
  garzas posadas, que es el argumento del sitio dicho sin decirlo.
- **Ningún «compartir».** De una página sobre sumisión química no se
  reenvía a nadie a ninguna parte.
- **Ningún control que no haga nada.** Si un botón depende de JavaScript,
  nace oculto y lo enciende el módulo que lo hace funcionar. Es el patrón
  que ya siguen la fila de etiquetas y el plegado de las hebras.
- **No toques `servidor/`.** Si te falta algo de la API, dilo y lo
  añadimos ahí; no lo parchees desde el navegador.

---

## 10 · Cómo quiero que trabajes

- **Llévame la contraria.** Si algo de lo que pido choca con una regla
  que yo mismo puse, dilo antes de hacerlo. Estar de acuerdo por defecto
  no me sirve.
- **Una cosa a la vez.** Si necesitas que decida algo, pregúntamelo de
  uno en uno, no en lote.
- **Di siempre qué mediste y qué salió**, y separa lo verificado de lo
  que solo crees. No leo código: necesito que me traduzcas en qué se nota
  cada número.
- **Comenta el porqué, no el qué**, en español y con el tono de los
  ficheros que ya están. Cuando descartes algo, deja escrito por qué
  —ese comentario es lo que impide que dentro de un año alguien lo
  vuelva a intentar.
- Hay cambios sin commitear que pueden no ser míos: **mira `git status` y
  pregunta** antes de arrastrar algo a un commit.
- **No despliegues nada** sin que yo lo pida. El sitio sigue con
  `noindex` y aviso de borrador porque seis ventanas médicas y dos líneas
  telefónicas **no tienen fuente verificada**.

Empieza por leer `servidor/LEEME.md`, levantar el servidor y hacerle una
petición a `GET /api/estado`. Cuando lo tengas, dime por cuál de los tres
trabajos quieres empezar y por qué.
