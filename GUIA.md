# Guía de Galene

Todo el proyecto en un documento: qué es, por qué está hecho así, qué
se decidió y qué queda por decidir.

El `README.md` dice qué hay. Esto dice **por qué**. Si alguna vez los
dos se contradicen, gana el código — y hay que arreglar los dos.

> **Aviso, y va primero porque manda sobre todo lo demás.** Galene es
> un borrador. Sus plazos médicos están contrastados contra documento
> pero **no verificados por nadie con criterio clínico**, y por eso el
> sitio lleva `noindex` y un aviso visible. Ver [Lo que falta antes de
> publicar](#12--lo-que-falta-antes-de-publicar).

---

## 1 · En una frase

Un sitio colombiano sobre **sumisión química** que dice qué se puede
hacer después y hasta cuándo, y que además es una obra en acuarela.

Las dos cosas a la vez. Esa tensión no es un adorno: es el proyecto.

**Galene** (γαλήνη) es el mar en calma, y una Nereida — de las que
aparecen en la tormenta para que los barcos pasen.

---

## 2 · El problema, dicho sin rodeos

La sumisión química es el uso de una sustancia para anular la
capacidad de decidir de alguien. Lo que la hace distinta de casi
cualquier otra cosa que un sitio de ayuda tenga que abordar es su
mecanismo:

> **El daño incluye borrar el recuerdo del daño.**

De ahí salen tres consecuencias, y las tres están escritas en el
código:

1. **Quien más necesita la herramienta es quien menos puede usarla.**
   No sabe qué hora era, no sabe qué pasó, no está segura de que pasara
   nada. Cualquier interfaz que exija saber excluye exactamente a su
   destinataria. Por eso «no sé» es la respuesta principal del reloj de
   rescate, no una opción de cortesía, y por eso devuelve **más**
   opciones y nunca menos.

2. **El tiempo corre y casi nadie lo sabe.** Hay ventanas médicas que
   se cierran en horas y en días, y la mayoría de la gente no sabe que
   existen. Peor: la propia duda —«¿y si me lo estoy imaginando?»— es lo
   que consume las horas.

3. **Llegar tarde no anula nada.** Casi todo sigue abierto después. Un
   sitio que solo hable de las primeras horas le está diciendo a la
   mayoría que ya es tarde, y eso es falso.

La regla que sale de aquí y que gobierna la redacción entera: **nunca
convencer a nadie de que ya no vale la pena.**

---

## 3 · Quién llega, y en qué estado

No se diseña para «un usuario». Se diseña para cuatro momentos, porque
son cuatro personas distintas:

| Momento | Qué necesita | Dónde está en el sitio |
| --- | --- | --- |
| **Está pasando ahora** | Un teléfono y una puerta abierta, a cero clics | El 123 y el mapa de emergencia · *(y la app: ver §13)* |
| **Fue hace unas horas** | Qué hacer ya, y en qué orden | El reloj de rescate y «lo que ayuda» |
| **Fue hace días, o no lo sé** | Que le digan que no llegó tarde | Las ventanas que no caducan, y `CONSEJOS_SIEMPRE` |
| **Está entendiendo qué le pasó** | Palabras, y que otras estén ahí | El glosario, «¿Pudiste decidir?», la comunidad |

Y una condición de entorno que decide muchas cosas de ingeniería: esto
se abre **a las cuatro de la mañana, en un teléfono, con mala señal y
poca batería**. El repositorio anota que el 67,5 % del tráfico en
Colombia es móvil, y de ahí salen los tres juegos de láminas por tamaño
de pantalla (2048 / 1024 / 768 px: 2,2 MB en vez de 4,8 MB, y 13 MB de
textura en vez de 49 MB).

---

## 4 · Las dos leyes

### La ley del arte

> No queremos una ilustración en acuarela. Queremos una obra digital
> que **se comporta** como acuarela.

### Su corolario de ingeniería

> **La imperfección vive en el mundo. El instrumento es exacto.**

El mar puede tener grafito sin borrar, charcos y bordes desiguales. El
reloj, el teléfono y el botón de salir van con tipografía plana y
alineación exacta. Cuando algo tiene que funcionar bajo presión, deja
de ser pintura.

Esta ley es la que resuelve casi todas las discusiones de diseño del
proyecto. Si no sabes de qué lado cae un elemento, pregunta: **¿alguien
lo va a usar con las manos temblando?** Si sí, es instrumento.

---

## 5 · Las nueve reglas que no se negocian

Están en el `README`. Aquí va lo que cada una defiende, que es lo que
permite aplicarlas a casos nuevos.

1. **No re-escenificar el hecho.** Ni la copa, ni el bar, ni la gota
   cayendo. — *Consecuencia medida:* una onda que se expande desde un
   punto **es** una gota cayendo en un líquido. Por eso los anillos del
   mar van de fuera hacia dentro, y por eso se descartó un vídeo de
   tinta floreciendo.
2. **No terror.** Ni glitch, ni caos visual, ni sonido inquietante. —
   Un mapa lleno de banderas rojas es terror: por eso los tres mapas
   usan verde de tinta, añil y rojo apagado, y ninguno rojo de alarma.
3. **No fabricar personas, ni testimonios, ni cifras sin fuente.** — La
   más incumplida en la industria y la que más caro sale. En una versión
   anterior de este proyecto **se publicó un panel de expertos
   inventado**; todo el aparato de fuentes y verificación existe para
   que no vuelva a pasar.
4. **No revictimizar.** No se pregunta qué pasó.
5. **La ayuda está a cero clics.** El teléfono y el botón de salir
   existen desde el primer milisegundo, en HTML, sin depender de
   JavaScript. — *Hoy no se cumple: ver §12.*
6. **Salida rápida real**, con `location.replace` para no dejar rastro.
   — *Hoy no se cumple: ver §12.*
7. **`prefers-reduced-motion` apaga. No reduce.**
8. **Nadie es castigado por su contexto.** A las 4 a.m. el mundo no
   está más vacío que a las 3 p.m. — El modelo de luz cambia el color,
   nunca la cantidad de ayuda.
9. **El sitio nunca cuenta víctimas.** — Ni analítica, ni contador de
   visitas, ni «cuántas personas han pasado por aquí». Contar visitas a
   un sitio sobre sumisión química **es** construir un registro de
   víctimas, aunque sea anónimo y aunque no se quiera.

### Y las dos leyes del dato

Viven en la cabecera de `src/js/reloj.js` y mandan sobre el contenido:

> 1. **«No sé» es la respuesta principal**, no una opción de cortesía.
> 2. **Ningún dato se muestra como cierto sin fuente.** Cada ventana
>    lleva `fuente` y `verificado`. Si faltan, la interfaz lo dice en
>    la cara.

La distinción que sostiene el proyecto entero, y que es fácil de
confundir:

- **Tener fuente** = el número sale de un documento. Lo puede hacer
  quien escribe el código.
- **Estar verificado** = alguien con criterio clínico comprobó que el
  documento sigue vigente y que la lectura es correcta. **Eso no lo
  puede hacer quien escribe el código.**

Hoy: seis ventanas con fuente, **cero verificadas**.

Y para que eso deje de ser una frase: `docs/verificacion/DOSSIER.md`
enumera las **37 afirmaciones** que el sitio publica —las seis ventanas,
los cinco consejos con fuente, las tres líneas y las veintitrés tarjetas
del panel—, cada una con su cita y una casilla de veredicto. No está
escrito a mano: lo genera `npm run dossier` desde `js/reloj.js`,
`datos/expertos.js` y `componentes/Ayuda.astro`, y lleva una huella. Si
alguien corrige una hora, la huella cambia y la firma que hubiera deja
de cubrir el texto — `npm run dossier -- --comprobar` lo vigila dentro
de la batería de pruebas.

La carta para pedir esa firma, y a qué puerta tocar primero, está en
`docs/verificacion/SOLICITUD.md`.

---

## 6 · Cómo está hecho

### El sitio

**Astro 7**, cero JavaScript por defecto en las páginas de contenido, y
el mar entra como isla. Tres páginas: `index`, `comunidad`, `expertos`.

Orden de prioridades de `main.js`, y no se negocia:

1. **Los reflejos funcionan siempre** (salida rápida y línea). Se
   enganchan primero, antes de tocar el lienzo.
2. **La luz de la hora real** se aplica al DOM aunque no haya WebGL.
3. **El mar es un *enhancement*.** Si falla, el sitio sigue sirviendo.

Los tres módulos van en `<script>` separados a propósito: si la pintura
no compila, la ayuda sigue en pie.

### El mar

No se simula agua: **se deforma una acuarela de agua**. Nueve láminas
pintadas se muestrean desplazadas por un mapa de flujo, se remapean en
duotono contra la paleta de la hora local de quien entra, y se les
multiplica encima un escaneo real de papel de algodón fijo a la
pantalla.

| Fichero | Qué es |
| --- | --- |
| `js/mar.js` | El shader: cielo, agua en tres bandas, manglar, grafito, papel |
| `js/hora.js` | Un modelo de luz continuo, cuatro horas ancla |
| `js/main.js` | Orquestación, física del ave, calibración del lavado |
| `js/reloj.js` | Las ventanas de las 72 horas |
| `js/lugares.js` · `js/ayuda.js` · `js/mapa.js` | Los tres mapas |
| `js/presencia.js` · `js/garza.js` | Quién más está |

### El servidor (opcional, y contradice al README)

Un proceso de Node 22.5+, un fichero SQLite al lado, dos dependencias.
Guarda **tres cosas**: la bandada del manglar, la calma acumulada del
mar y lo que se escribe en la comunidad. Ver `servidor/LEEME.md`.

**No guarda quién.** Sin cuentas, sin cookies, sin correo, sin IP y sin
analítica. La huella de IP para limitar es `sha256(ip + sal_del_día)`
con la sal sorteada al arrancar y rotada cada 24 h, viviendo solo en
memoria: al día siguiente la huella de ayer **no se puede recalcular ni
teniendo la IP delante**.

Decisiones que conviene conocer:

- **La calma tiene techo** (`GALENE_TECHO_RAICES` = 0.55). Sin techo,
  «lo que dejas, queda» + monótona = el mar se vuelve espejo en unas
  semanas y quien llegue después no verá nada al poner la mano. Con
  techo: 0,35 vacío → 0,625 saturado → 0,82 con una mano encima.
- **No se difunde cuánta gente hay.** Se ve el árbol con sus garzas y
  el agua más quieta. Nunca un número. Regla 9.
- **Las señales de moderación son las reglas del proyecto**, no un
  filtro de spam. Lo que hace daño aquí no es un anuncio: es un plazo
  médico inventado o un teléfono escrito de memoria.
- **Quien escribe algo que va a revisión lo sigue viendo**, con su
  aviso. Ver desaparecer tu mensaje sin explicación es que se te calle.

---

## 7 · El recorrido de la portada

1. **El hero** — el mar, la hora, las garzas. Es la pintura.
2. **La boca** — la costura entre la pintura y el papel.
3. **Las herramientas** (`#herramientas`) — el instrumento:
   - **Qué es** y el glosario de ocho palabras (deliberadamente **no
     clínico**: qué significan las palabras, nunca qué hace una
     sustancia en un cuerpo — eso vive en el reloj, con su fuente).
   - **¿Pudiste decidir?** — la sección que dice que sin capacidad de
     decidir no hay consentimiento.
   - **El reloj de rescate** — §8.
   - **El mapa** — tres mapas que no se mezclan: emergencia, compañía,
     cuidado. Emergencia va primero porque es el único que sirve
     mientras algo está pasando.
   - **Guardar lo que recuerdo** (`#recordar`) — un formulario que no
     envía nada: se descarga como archivo o se comparte con quien ella
     elija.
4. **La comunidad** y **el panel de expertos** — síntesis editorial de
   trabajo ajeno, siempre enlazando al original. Nunca comillas
   alrededor de algo que nadie dijo.

---

## 8 · El reloj de las 72 horas

El corazón útil del sitio. Seis ventanas, cada una con su documento y
su cita literal, en `src/js/reloj.js`.

| Ventana | Cierra | Fuente |
| --- | --- | --- |
| Muestra toxicológica | **96 h** (orina) · 6 h (sangre) | MinSalud, Tabla 10 |
| Examen médico-legal | 72 h *como urgencia* | INMLCF, R.T. INML-CF-01 |
| Profilaxis del VIH (PEP) | 72 h | MinSalud |
| Anticoncepción de emergencia | 120 h | MinSalud |
| Que te atiendan | **No caduca** | MinSalud |
| Denunciar, si quieres | **No caduca** | MinSalud |

### La corrección que justifica todo el aparato de fuentes

La ventana toxicológica **estuvo en 12 horas**. El protocolo separa dos
muestras que estaban confundidas en una sola: sangre a las 6 h, orina a
las **96**. O sea que el sitio le decía a alguien que su ventana había
pasado cuando le quedaban **tres días**.

> No informaba de menos. **Convencía a alguien de que ya no valía la
> pena ir.** Ese es el peor error que esta página puede cometer, y por
> eso ningún número entra sin su cita.

### El tramo, y por qué es grueso

Cinco tramos: *hace unas horas · anoche · ayer · hace unos días · no
sé*. No se pregunta una hora exacta **porque nadie la tiene, y pedirla
es un interrogatorio**.

### «Lo que ayuda» y su mitad que faltaba

Cinco consejos para las primeras horas (no te duches, guarda la ropa en
bolsa de papel, guarda la primera orina, no te cepilles, no laves
nada), y **cada uno lleva su «y si ya lo hiciste»**.

Eso no es amabilidad: es lo único que separa una lista de consejos de
una lista de reproches. Quien lee esto ya se duchó, casi siempre.

Y hay una segunda lista, `CONSEJOS_SIEMPRE`, que existe porque a la
primera **le faltaba la mitad de la gente**: los cinco de arriba son la
misma cosa dicha cinco veces —preservar señales para el examen— y todos
en negativo. Quien gira la aguja a «no sé» —que es la respuesta
principal— se encontraba cinco cosas que ya no le sirven y ninguna que
sí.

Los seis de la segunda lista no caducan y **no llevan fuente a
propósito**: no afirman nada comprobable. Dicen qué puede hacer ella con
su teléfono, su memoria y quien tenga cerca. La regla escrita para el
futuro: si alguna vez se añade ahí algo que empiece por «tienes derecho
a», «te tienen que» o «funciona hasta las N horas», **ese consejo no va
en esa lista**. Va arriba, con su documento, o no va.

---

## 9 · Privacidad, pieza por pieza

| Pieza | Qué guarda | Dónde | Cuánto dura |
| --- | --- | --- | --- |
| Ubicación («que alguien venga por mí») | Nada | — | Se usa y se descarta |
| «Guardar lo que recuerdo» | Nada | El aparato | Lo que ella decida |
| Mapa de emergencia | Lista de lugares por ciudad | `sessionStorage` | Muere al cerrar la pestaña |
| Mapa **alrededor de ella** | **Nada, nunca** | — | Se vuelve a preguntar |
| Tu garza (pico, frase) | Un índice, no una palabra | `sessionStorage` | Muere al cerrar la pestaña |
| Comunidad (sin servidor) | El hilo | `sessionStorage` | Muere al cerrar la pestaña |
| Comunidad (con servidor) | El hilo, sin quién | SQLite | Retención, y llave de borrado |

Dos detalles que valen más de lo que parecen:

- **La búsqueda alrededor de ella no se cachea.** La clave llevaría sus
  coordenadas, y eso es escribir su ubicación en el disco aunque sea
  por diez minutos y aunque el disco sea suyo.
- **Los lugares del mapa no están escritos a mano.** Se consultan en
  vivo a OpenStreetMap y se dice de dónde salen y que nadie de aquí los
  ha comprobado. Escribir a mano los hospitales de treinta y dos
  ciudades **es inventarlos**: en seis meses la mitad estarían mal sin
  que nos enteráramos, y un mapa de emergencia desactualizado es peor
  que ninguno.

Información sobre salud o vida sexual es **dato sensible** en la ley
colombiana. Este proyecto no la almacena, y esa decisión es deliberada.

---

## 10 · El método: medir, no opinar

Es la parte del proyecto que más se puede robar para otros proyectos.
Está documentada en `notas/BITACORA-2026-08-11.md`.

Todo se decide **sobre los píxeles**: hay un asidero de desarrollo
(`window.__mar`) que redibuja y lee el búfer con `readPixels`, permite
pisar la hora y medir contraste contra el fondo real.

### El instrumento se equivocó cuatro veces

Y esto es lo más importante de toda la bitácora:

1. **Grano a 3×3** — medía la textura del papel, no la aguada.
2. **Grano a 7×7** — la lectura se estabiliza en ~34 %. *El instrumento
   bueno es aquel cuya lectura deja de moverse.*
3. **Raíz cúbica cerca del negro** — su derivada se dispara; cualquier
   temblor contaba como degradado en una imagen oscura. Se cambió a L\*
   del CIE, que tiene tramo lineal en las sombras.
4. **Sin normalizar al rango propio** — día y noche no eran
   comparables.

> **Un auditor que no audita su propio instrumento mide sus
> prejuicios.** Se quemaron dos rondas persiguiendo un número falso.

### Los umbrales salen de las láminas, no de la cabeza

Se inventaron dos umbrales de degradado y ninguno salía de ningún
sitio. Midiendo las láminas pintadas a mano del propio proyecto: el
rango real de una acuarela es **plano 19–42 % y degradado 44–76 %**.

### Tres avisos que se ganaron a pulso

- **Si algo «no se nota», mira la frecuencia.** Tres veces se puso un
  ruido de periodo más largo que la pantalla. Eso no es variación: es
  una constante, y el efecto simplemente no existía.
- **No persigas la métrica hasta romper el cuadro.** Con `dureza` 0,05
  la cuantización dejó bandas de contorno matemático por todo el cielo.
  Estaba escrito que *plano está bien cuando es una aguada, no cuando es
  una banda*, y aun así se subió la palanca porque el número premiaba
  planitud.
- **Razona la fuerza contra el fondo sobre el que cae.** Un 15 % de
  reserva de papel «parece poco», pero sobre agua nocturna de
  luminancia 0,05 **multiplica el brillo por 3,4**.

### Cómo se prueba

```bash
python -m http.server 5177          # o: npm run dev
npm run build && npm run test:e2e   # Playwright, CONTRA EL SITIO COMPILADO
```

Las pruebas corren **contra el sitio compilado**, no contra el servidor
de desarrollo, porque es como sirve GitHub Pages: *un fallo que solo
aparece al compilar es el que nadie descubre hasta que está publicado.*

Ganchos: `?dev=1&hora=4.2` fuerza la hora · `?presencia=off` ·
`?auditar-mar=1` fuerza el shader completo donde el WebGL es por
software.

**Leyes medidas que el motor mantiene:** el agua siempre más oscura que
la bruma del cielo (si empatan, el horizonte desaparece), texto siempre
sobre el cielo con 4.5:1 en el peor píxel **a cualquier hora**, y cero
bandas planas.

---

## 11 · Estado real, hoy

Lo que funciona: el mar y su modelo de luz, las garzas y la presencia,
el reloj de rescate con sus seis ventanas y sus dos fuentes, los tres
mapas con datos en vivo de OpenStreetMap, el glosario, «¿Pudiste
decidir?», «guardar lo que recuerdo», la comunidad (con y sin
servidor), y dos suites de Playwright contra el sitio compilado.

### Tres cosas que hay que mirar de frente

**1 · Las reglas 5 y 6 no se cumplen ahora mismo.** La barra de
urgencia —salida rápida y línea de atención— **salió del sitio**: la
decisión está anotada en `src/js/main.js:23` y en la cabecera de
`src/pages/index.astro`, y era para trasladarla a una app móvil. El
resultado es que hoy el 123 vive dentro del mapa (`Mapa.astro`), o sea
a varios scrolls, y la salida rápida no existe en ninguna parte.

Eso es exactamente lo que las reglas 5 y 6 prohíben. **Mientras la app
no exista, el sitio debería recuperar la barra**, aunque sea en la
forma más sosa posible.

Y hay un rastro que lo confirma: en `estilos.css:4918` sigue puesto el
comentario *«Ni el botón ni la salida rápida aparecen aquí. Están desde
el principio, y esa es la única línea de esta hoja que no se
negocia»* — describiendo algo que ya no es verdad. Un comentario que
afirma una regla que el código dejó de cumplir es la forma más silenciosa
de perder una regla.

**2 · `#salir` es un enlace muerto.** El reloj de rescate ofrece «Que
alguien venga por mí» apuntando a `#salir` en tres sitios
(`RelojRescate.astro`), y **no hay ningún elemento con ese `id`** en el
proyecto. Es la acción más urgente de la herramienta más urgente, y no
lleva a ningún lado.

**3 · El README miente sobre el servidor.** Dice «No hay servidor. Ni
analítica, ni cookies, ni base de datos», y `servidor/` existe. La
frase de reemplazo ya está redactada en `servidor/LEEME.md` y hay que
usarla **antes** de desplegar: mentir sobre privacidad en una página
sobre violencia sexual es la peor forma posible de mentir.

---

## 12 · Lo que falta antes de publicar

- [ ] **La firma.** Las 37 afirmaciones están enumeradas con su cita en
      `docs/verificacion/DOSSIER.md` y la carta para pedirla en
      `docs/verificacion/SOLICITUD.md`. Es lo único que queda entre este
      sitio y estar publicado: la maquinaria —`VERIFICADO`, el
      `robots.txt`, el `sitemap.xml`— ya está hecha y comprobada con
      `npm run interruptor`.
- [ ] Verificar cada ventana de tiempo contra el protocolo vigente del
      Ministerio de Salud. Anotar fuente y fecha en `js/reloj.js`.
      **Pendiente: comprobar bajo qué número quedó publicada la
      actualización que deroga la Resolución 459 de 2012.**
- [ ] Verificar cada línea telefónica **llamando**: número, horario,
      cobertura y qué atiende realmente.
- [ ] Recuperar la salida rápida y el teléfono a cero clics (§11).
- [ ] Arreglar `#salir` (§11).
- [ ] Reescribir la frase de privacidad del README y la sección
      «Escribir» de `Comunidad.astro` (§11).
- [ ] Sustituir el amanecer fijo (5:54) por cálculo real por latitud.
- [ ] Cero organizaciones nombradas como aliadas sin acuerdo por
      escrito.
- [ ] Revisión por una organización que atienda violencia sexual.
- [ ] Quitar `noindex` y el aviso de borrador — **solo cuando todo lo
      anterior esté hecho.**

### Deuda técnica conocida

- El historial pesa **103 MB** en objetos por las láminas fuente. El
  `.gitignore` ya está corregido, pero los *blobs* siguen en el
  historial: limpiarlo exige reescribir historia.
- Faltan dos posadas de las nueve del ave: *rascarse* y *sacudirse*.
- Los cuatro cielos por hora están prompteados y sin generar.
- Las garzas son DOM sobre el lienzo, así que **no reciben el grano de
  papel global**. Única excepción al principio de papel único.

---

## 13 · Hacia dónde va: la app

La urgencia salió del sitio para convertirse en una app móvil. La
propuesta completa —qué hace, qué sensores usa, qué se niega a hacer y
por qué no puede ser una página web— está en:

**→ [`propuestas/app-rescate.md`](propuestas/app-rescate.md)**

En una línea: **el botón lo pulsa ella; los sensores no deciden nada,
solo recuerdan.**

---

## 14 · Reglas de trabajo

- **No desplegar sin orden explícita.**
- **Prohibido usar comillas invertidas dentro del GLSL** — vive en un
  *template literal*. Se rompió dos veces.
- **Lo que dejas, queda.** La calma nunca baja.
- **Si un dato se copia en dos sitios, un día divergen**, y el que
  miente en silencio es siempre el que no se ve. Por eso el glosario,
  los expertos y las ventanas viven en `src/datos/` y en `js/reloj.js`,
  y todo lo demás lee de ahí.
- **Ningún fichero de datos entra sin explicar en su cabecera qué puede
  y qué no puede vivir dentro.**
