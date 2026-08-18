# Galene

Sitio colombiano sobre **sumisión química**: qué se puede hacer después, y
hasta cuándo.

> ## ⚠ Esto es un borrador. No lo compartas todavía.
>
> Las ventanas de tiempo médicas y las líneas de atención **no están
> verificadas contra fuente primaria**. Hasta que lo estén, el sitio lleva
> `noindex` y un aviso visible, para que nadie que lo necesite de verdad
> se encuentre con un dato equivocado en el peor momento.
>
> Ver [Antes de publicar](#antes-de-publicar).

---

> Este README dice **qué hay**. Para **por qué está hecho así** —las
> leyes, las reglas, el método de medición, el estado real y las
> deudas— está la [**Guía de Galene**](GUIA.md). Y la urgencia que
> salió del sitio se especifica en
> [la propuesta de la app](propuestas/app-rescate.md).
>
> Para **encender el foro y la bandada** —dos variables, un SQL y un
> interruptor de Supabase— está
> [Encender la comunidad](docs/DESPLIEGUE-COMUNIDAD.md).

## Qué es

Una experiencia en acuarela que además es un conjunto de herramientas
prácticas. Las dos cosas a la vez, y esa tensión es el proyecto.

**Galene** (γαλήνη) es el mar en calma, y una Nereida — de las que aparecen
en la tormenta para que los barcos pasen.

## La ley del arte

> No queremos una ilustración en acuarela. Queremos una obra digital que
> se comporta como acuarela.

Y su corolario de ingeniería:

> **La imperfección vive en el mundo. El instrumento es exacto.**

El mar puede tener grafito sin borrar, charcos y bordes desiguales. El
reloj, el teléfono y el botón de salir van con tipografía plana y
alineación exacta.

## Cómo funciona el mar

No se simula agua: **se deforma una acuarela de agua**. Nueve láminas
pintadas se muestrean desplazadas por un mapa de flujo, se remapean en
duotono contra la paleta de la hora local de quien entra, y se les
multiplica encima un escaneo real de papel de algodón fijo a la pantalla.

- `js/mar.js` — el shader: cielo, agua en tres bandas, manglar, grafito, papel
- `js/hora.js` — un modelo de luz continuo, cuatro horas ancla
- `js/main.js` — orquestación, física del ave, calibración del lavado
- `js/bandada-cliente.js` — la bandada y la calma, contra Supabase
- `js/presencia.js` — las manos en el agua, sin red, y bandada de repuesto
- `js/reloj.js` — las ventanas de las 72 horas
- `js/herramientas.js` — el desvío de emergencia
- `arte/laminas.md` — la dirección de arte y los prompts
- `pruebas/lamina.html` — medidor de láminas

## Privacidad

Hay dos piezas con servidor —el foro y la bandada— y desde agosto de
2026 las dos viven en el mismo sitio: **Postgres gestionado por
Supabase**, en su capa gratuita. Es el único servicio de terceros del
proyecto, y es una decisión consciente, no un descuido: el `servidor/`
propio de Node con SQLite que había antes exigía una máquina
encendida, y una máquina encendida es una máquina con registros.

Sin cuentas y sin correo (Auth Anónima da un identificador opaco), y
la sesión se guarda en `sessionStorage` **a propósito** —el SDK usa
`localStorage` por defecto, que sobrevive a cerrar la pestaña, y qué
hilos sobre sumisión química miró alguien no puede sobrevivir a nada—.

- **El foro** (`Comunidad`): no se guarda quién escribió qué más allá
  de ese identificador, y hay una llave de borrado que solo su dueño
  puede usar. Las políticas de fila nunca dejan leer la columna
  `sesion` de otra persona, ni siquiera para compararla. El
  razonamiento completo está en `servidor/src/base/esquema-foro.sql`.
- **La bandada del manglar y la calma del mar**: una fila por pestaña
  abierta, que se va con ella, y una suma de segundos sostenidos de la
  que solo sale una curva, nunca el número. Ver
  `servidor/src/base/esquema-bandada.sql`.

Nada de esto hace falta para usar la ayuda: sin Supabase configurado
el hero sigue en pie, el manglar sigue con sus garzas, y el reloj, el
mapa y «guardar lo que recuerdo» funcionan igual — son enhancements,
no la base del sitio. Lo único que se queda sin arrancar es el foro, y
lo dice en voz alta en vez de fingir que carga.

- La ubicación se pide solo al pulsar «que alguien venga por mí», se usa
  para armar un mensaje y se descarta. No se envía a ningún sitio.
- Lo que se escribe en «guardar lo que recuerdo» se queda en el
  dispositivo: se descarga como archivo o se comparte con quien la usuaria
  elija.
- Información sobre salud o vida sexual es dato sensible. Fuera del foro,
  este proyecto no la almacena, y esa decisión sigue siendo deliberada.

### Hasta dónde llega «los demás»

Hay tres cosas en el sitio que dicen «no estás sola», y las tres son
ciertas o no aparecen. Vienen de sitios distintos, y la diferencia no
es un detalle de implementación: es dónde queda escrito qué.

**La bandada del manglar** son sesiones reales, y viven en Supabase
(`garzas_publico`). Una fila por pestaña abierta, con su percha, su
escala y hacia dónde mira. Es lo único de «los demás» que cruza la
red, y no guarda quién es nadie.

> Esta línea decía «se va cuando la pestaña se va» y era falsa. Nada
> marcaba una garza como ida al cerrar: lo único que la sacaba del
> árbol era el desalojo de la más antigua, así que el manglar enseñaba
> *las últimas diez sesiones que hubo alguna vez*. MEDIDO contra la
> base en vivo el 18 ago 2026: once sesiones seguidas dejaron once
> garzas y ninguna se fue sola. Una garza de alguien que cerró hace
> horas es una persona inventada, que es justo lo que la regla 3
> prohíbe. Ahora hay `volar_garza()` en `pagehide` y una ventana de
> dos horas en la vista pública para las que no lleguen a despedirse
> — y **eso pide volver a pasar `esquema-bandada.sql`**; hasta
> entonces la base sigue siendo la de antes. Lo dice `npm run base`.

**La calma del mar** también: lo que sostiene todo el mundo se suma en
la base y vuelve como `calma_actual()`, la curva YA aplicada. El
número crudo no sale de ahí a propósito — la regla 9 dice que el sitio
no cuenta, y una curva no es un censo.

**Las manos puestas en el agua ahora mismo** NO cruzan la red, y eso
es deliberado. Un gesto de tres segundos no es un dato acumulado, y
meterlo en Postgres sería escribir en disco que alguien estuvo tocando
el mar a las 4 a.m. Eso sigue siendo `BroadcastChannel`: **las otras
pestañas de este mismo navegador**, en el mismo aparato, sin red por
medio. Cada mano ajena abre su anillo en tu mar y calma más deprisa —
medido, y lo vigila `garzas.spec.js`.

Nunca se inventa a nadie. Si estás sola, no hay ninguna garza de más y
el aviso de manos no dice nada — la regla 3 no se cumple escondiendo
que son pocas, se cumple no fabricando ninguna.

#### Y cuando no hay red

Sin `PUBLIC_SUPABASE_*` configurado, o con la red caída, el árbol **no
se queda vacío**: la bandada cae a un dormidero de paisaje, que es lo
que fue desde el primer día. Esas garzas no dicen ser nadie — un
manglar tiene garzas porque es un manglar. Y las de presencia vuelven
a aparecer, una por pestaña, sobre las dos perchas que la bandada deja
libres siempre.

Con Supabase configurado esas garzas de presencia **no** se ponen: la
bandada ya son las sesiones vivas, y pintar además una por pestaña
sería la misma persona dos veces. La costura está en
`sincronizarPresencia`, en `js/main.js`.

Lo que **sí** se personaliza —el color del pico de tu garza, o una de
diez frases— vive en `sessionStorage` y se va al cerrar. Nunca es texto
libre: por el canal viaja un índice, no una palabra (ver
`datos/garza.js`).

## Reglas que no se negocian

1. No re-escenificar el hecho. Ni la copa, ni el bar, ni la gota cayendo.
2. No terror. Ni glitch, ni caos visual, ni sonido inquietante.
3. No fabricar personas, ni testimonios, ni cifras sin fuente.
4. No revictimizar. No se pregunta qué pasó.
5. **La ayuda está a cero clics.** El teléfono y el botón de salir existen
   desde el primer milisegundo, en HTML, sin depender de JavaScript.
6. Salida rápida real, con `location.replace` para no dejar rastro.
7. `prefers-reduced-motion` **apaga**. No reduce.
8. Nadie es castigado por su contexto. A las 4 a.m. el mundo no está más
   vacío que a las 3 p.m.
9. El sitio nunca cuenta víctimas.

## Cómo se prueba

Verificación por píxeles, no por opinión:

```bash
python -m http.server 5177
```

- `?dev=1&hora=4.2` — fuerza la hora para medir cualquier luz
- `pruebas/lamina.html?src=../arte/mar-cercano.png` — mide una lámina

### De extremo a extremo

```bash
npm run test:e2e
```

Playwright, **contra el sitio compilado** —`npm run build` y un servidor
de ficheros de veinte líneas (`pruebas/servidor.mjs`), que es como sirve
GitHub Pages—, no contra el servidor de desarrollo. Un fallo que solo
aparece al compilar es el que nadie descubre hasta que está publicado.

Lo que vigila, por archivo:

- `npm run base` — no es Playwright y por eso está aparte: comprueba
  que la base DESPLEGADA se comporta como el `.sql` del repo. Leer el
  esquema del repositorio no dice nada sobre lo que alguien pegó en el
  editor de Supabase hace tres semanas, y esa diferencia ya costó dos
  hallazgos. Verifica también lo que NO debe poderse: editar un hilo
  por UPDATE, leer la columna `sesion`. Limpia lo que escribe.
- `fluidez.spec.js` — las dos invariantes del pase de rendimiento del
  héroe, contadas y no cronometradas (un techo en milisegundos no vale
  nada en una máquina sin GPU): como mucho **una lectura de píxeles por
  cuadro** —el calibrador del lavado medía cuatro piezas con cuatro
  `readPixels`, y esa llamada es cara porque sincroniza, no por los
  bytes— y como mucho **una subida de textura por cuadro**. Falla
  contra la edición anterior, que es como se sabe que mide algo.
- `consola.spec.js` — que ninguna página lance una excepción, y que la
  portada monte sus módulos hasta el final. Existe por un fallo
  concreto: una fusión se llevó tres `import` de `main.js` y dejó las
  llamadas dentro. Compilaba, y se caía en el primer cuadro. Las ciento
  treinta y seis pruebas de entonces miraban lo que hay en pantalla y
  ninguna miraba lo que la consola gritaba.
- `foro.spec.js` — dos grupos. **Sin credenciales** (corre siempre):
  que `/comunidad` diga que no se pudo llegar, no ofrezca reintentar lo
  imposible, no enseñe un compositor que no puede publicar, y que el
  resto de la página siga en pie. **Con credenciales** (se salta sola
  si no las hay): publicar, validar, contestar, votar, ordenar y borrar
  lo propio, contra la base de verdad.
- `garzas.spec.js` — el pico teñido, el globo al pasar el ratón, la
  garza que aparece cuando se abre otra pestaña y desaparece al
  cerrarla, y el gesto de calma con una mano y con dos.
- `contraste.spec.js` — las cuatro piezas del héroe, a siete horas y en
  dos pantallas, midiendo **los píxeles pintados**: el fondo lo hace un
  shader y no hay hoja de estilos a la que preguntarle.
- `semantica.spec.js` — un solo `h1` por página, el salto al contenido,
  y los objetivos táctiles medidos por **impacto real**
  (`elementFromPoint`), no por su caja.
- `ortografia.spec.js`, `metadatos.spec.js`, `indexacion.spec.js`,
  `peso.spec.js`, `portada.spec.js`, `catalogo.spec.js`, `mapa.spec.js`,
  `entrada.spec.js`.

### Contra lo que hay publicado

```bash
npm run test:prod
```

La misma batería, apuntada al **espejo de producción**
(`prod-espejo.mjs`, que pide cada archivo a `dx-sebastian.github.io` con
curl y lo sirve tal cual). No compila nada: mide los bytes que le llegan
a quien entra. Entre `dist/` y eso hay un push, un flujo de trabajo, un
empaquetado y una CDN, y cada uno de ellos ha roto algo alguna vez.

### La maquinaria del freno

```bash
npm run interruptor    # compila las dos versiones y las compara
npm run dossier        # reescribe docs/verificacion/DOSSIER.md
```

Unos asideros hacen falta para esto y viajan al sitio publicado a
propósito: `window.__hero.estado()`, `window.__garzas`,
`window.__presencia` y `window.__com`. Son de LECTURA de cosas que ya
están en pantalla
—cuánta calma tiene el agua, qué garzas hay posadas— y no permiten hacer
nada que no se pueda hacer con el dedo. El asidero pesado de auditoría
(`window.__mar`, que vuelve a dibujar y lee el búfer) sigue siendo solo
de desarrollo.

`?presencia=off` apaga la presencia, y `?auditar-mar=1` fuerza el shader
completo donde el WebGL es por software.

Leyes medidas que el motor mantiene: el agua siempre más oscura que la
bruma del cielo (si empatan, el horizonte desaparece), texto siempre sobre
el cielo con 4.5:1 en el peor píxel a cualquier hora, y cero bandas planas.

## Antes de publicar

La maquinaria ya está hecha: **`VERIFICADO` en `src/datos/sitio.js` es
una palabra que mueve las seis páginas, el `robots.txt` y el
`sitemap.xml` a la vez**, y `npm run interruptor` lo comprueba
compilando las dos versiones. Lo que falta no es código.

- [ ] **La firma.** Que un profesional de salud o de medicina forense en
      Colombia revise las 37 afirmaciones clínicas del sitio. La lista
      está enumerada, con su cita, en `docs/verificacion/DOSSIER.md`; la
      carta para pedirla, en `docs/verificacion/SOLICITUD.md`.
- [ ] Confirmar bajo qué número quedó publicada la actualización que
      deroga la Resolución 459 de 2012.
- [ ] Verificar cada línea telefónica llamando: número, horario,
      cobertura y qué atiende realmente.
- [ ] El mapa en un teléfono de verdad, con datos móviles, con el
      permiso de ubicación concedido y denegado.
- [ ] Sustituir el amanecer fijo (5:54) por cálculo real por latitud.
- [ ] Cero organizaciones nombradas como aliadas sin acuerdo por escrito.
- [ ] `VERIFICADO = true` — **solo cuando la firma esté guardada en
      `docs/verificacion/`**.
