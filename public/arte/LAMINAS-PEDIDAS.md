# Láminas pedidas — sesión del 12 de agosto de 2026

Documento **independiente y autónomo**: no hace falta leer `TAREAS.md`
ni `laminas.md` antes. Cada prompt trae su propia dirección visual
incorporada y se pega tal cual.

Guardar en `public/arte/` con el **nombre exacto** que dice cada bloque,
en **PNG con transparencia** donde se indique. Yo convierto a WebP y
genero el juego de 1024.

**El ave sigue siendo la garza.** No cambiamos de especie.

---

## La ley que llevan todos incorporada

> No queremos una ilustración en acuarela. Queremos una obra digital que
> se comporta como acuarela.

Editorial, no ilustrativa. Pigmento mineral, no caja de colores. Gesto,
nunca personaje. Nada terminado. Mucho vacío.

**Y la imperfección no se pide por lista.** Nada de «añade salpicaduras,
grafito visible, backruns»: eso es lo más impuesto que existe, el modelo
coloca accidentes como quien coloca adornos. Lo que se pide es
**velocidad, economía y no corregir**. La imperfección aparece sola, como
consecuencia de pintar rápido y parar antes de tiempo. Es la diferencia
entre un cuadro que *tiene* accidentes y uno que *los sufrió*.

**El color sube por granulado, no por saturación.** Pigmentos que se
separan sobre el papel —cerúleo, rosa de potasio, siena— dejados caer en
mojado para que se aparten y se vea el grano de cada uno. Un cuadro vivo
con pigmentos apagados, no un cuadro saturado.

**Y la luz es SIEMPRE papel sin pintar**, nunca pintura blanca. En
acuarela no existe el blanco: lo más claro del cuadro es el papel que
nadie tocó. Esto no es una preferencia de estilo — el motor mide que
haya píxeles por encima de 0.80 de luminancia, y si la lámina no los
trae, no los hay.

---

## Por qué hace falta cada una

El código de esta sesión ya está hecho. La noche tiene estrellas, el
cielo se lleva dos tercios del encuadre, el manglar se dobla con el
viento, hay hasta diez garzas en la copa y un ente de humo que recorre
la página y toma forma. Lo que sigue es lo que el código **no puede
resolver solo**.

| | Lámina | Estado |
|---|---|---|
| **L1** | `luna.png` | ✅ **Entregada e implementada.** |
| **L2** | `estrellas.png` | ⚠️ Entregada, **no se puede conectar** — ver abajo. |
| ~~L3~~ | ~~`amago-01..04.png`~~ | ❌ **Descartada.** No se va a pintar. |
| ~~L4~~ | ~~`arbol-seccion2.png`~~ | ❌ **Sin destino.** Existía para que se posara el ente, y el ente se retiró (12 ago 2026). No la generes. |
| **L5** | `pasto-matas.png` | ✅ **Entregada e implementada.** |
| **L6** | `papel-barbas.png` | 🆕 Pedida — cose la pintura con el documento. |
| **L7** | `aguadas-seccion2.png` | 🆕 Pedida — el fondo de las herramientas, pintado. |
| **L8** | `filetes-tinta.png` | 🆕 Pedida — sustituye los bordes de 1 px. |

Todo lo entregado está procesado por `arte-preparar.py`, que deja
la lámina en `arte/` y su gemela de la mitad en `arte/1024/`.

---

# L1 · `luna.png` — la luna, que hoy parece un pompón

**Prioridad máxima.**

La noche pasó a ser lo mejor del sitio y su peor pieza es justo la
fuente de luz. La lámina actual sale en pantalla como una bola de
algodón malva con el borde grumoso: no se lee como una luna, se lee como
una nube pequeña que alguien pegó ahí. El sol de la misma hoja sale como
una mancha amarilla de sticker.

Es un atlas de **dos celdas** —luna a la izquierda, sol a la derecha—
con el disco centrado y **exactamente del mismo tamaño en las dos**,
porque el motor elige celda según la hora y cualquier diferencia de
tamaño se vería como un salto en el amanecer.

**Lo que hay que arreglar de verdad:** el disco tiene que ser **papel
reservado**, no pintura clara. Ahora está pintado, y por eso pesa como
una mancha en vez de brillar como un hueco. La luz de este cuadro sale
del papel sin tocar; la luna es el sitio donde eso es más literal.

```
VISUAL DIRECTION — read this first and obey it over any habit:
A flatbed scan of an original watercolour study on rough cold-press COTTON
paper. Traditional media only. Editorial, not illustrative. Painted fast,
wet-in-wet, and stopped early. Visible paper tooth throughout.
THE CRITICAL RULE: the disc itself is BARE UNPAINTED PAPER, masked out and
left completely untouched. It is NOT painted white, cream, yellow or grey.
All the light in this image is the absence of pigment. If the disc has any
paint on it at all, the image is wrong.
Palette: mineral, granulating, desaturated. Pigments that separate on the
paper so the grain shows. This is not a paint box, and there is no glow.
Nothing here is cute, decorative or storybook. No lens flare, no rays, no
starburst, no halo ring, no bloom, no vignette.

SUBJECT — one sheet, TWO CELLS side by side, equal in every measurement:
LEFT CELL, the moon. A perfect circle of bare paper. Around it, a loose
wash of granulating blue-grey pigment laid wet so it blooms outward and
dies away unevenly — thicker and darker where it meets the disc on one
side, almost nothing on the other. The edge where wash meets disc is a
real drying line in places and dissolves completely in others. NO ring,
NO symmetry, NO gradient rendered evenly around the circle. Two or three
faint backruns in the wash are welcome; do not place them deliberately.
RIGHT CELL, the sun. THE SAME CIRCLE, same diameter, same centre, also
bare paper. The wash around it is warm — raw sienna and a trace of potash
rose — and lighter, thinner and further from the disc than the moon's.
BOTH CELLS: the disc sits dead centre of its cell. Same diameter to the
pixel. The washes may differ completely; the discs may not.

FORMAT: transparent background outside the washes. Landscape 2:1, the two
cells exactly half each. No horizon, no landscape, no clouds, no stars, no
birds, no water. No text, signature, border or frame.

NEGATIVE: painted white disc, cream disc, yellow disc, glow, bloom, halo,
concentric ring, lens flare, rays, starburst, cartoon moon, crescent,
craters, face, symmetrical gradient, airbrush, soft focus, vector, 3D
render, photorealistic, saturated, finished, polished, cotton ball, fluffy.
```

---

# L2 · `estrellas.png` — el cielo de noche, en pigmento

Las estrellas de ahora son **procedurales**: manchitas calculadas en el
shader. Funcionan —la noche dejó de ser un apagón— pero son lo único del
cuadro que no salió de un pincel, y eso ocurre justo en la capa que
acaba de pasar a ser la protagonista.

La lámina se multiplicará **encima** del campo procedural, no en su
lugar: el procedural pone la respiración y el reparto, la lámina pone el
grano y las salpicaduras que ningún hash sabe fingir.

Va **repetible en horizontal** (seamless): el cielo deriva muy despacio.

### ⚠️ No se pudo conectar, y la razón importa

La lámina está bien y está procesada, pero **no cabe**. WebGL2 solo
garantiza dieciséis unidades de textura en el fragment shader —de la 0 a
la 15— y este motor ya las tenía las dieciséis ocupadas. Al añadir el
sampler número diecisiete el shader deja de enlazar, y no falla la capa
de estrellas: falla **el mar entero**. Se probó y pasó exactamente eso;
la máquina donde se está desarrollando reporta 16 justas.

Añadir un adorno no puede tumbar la pintura, así que se revirtió y las
estrellas siguen siendo las procedurales, que ya funcionan.

**Dónde sí cabe esta lámina, sin gastar una unidad nueva:** dentro de
`cielo-noche.png`, la lámina de nubes nocturnas que ya está prompteada en
`TAREAS.md` (sección A0). Ese cielo usa un sampler que YA existe. Si al
generarla se pinta el velo de nubes **sobre este mismo campo de motas**,
entran las dos cosas por el precio de una. Es la vía recomendada.

```
VISUAL DIRECTION — read this first and obey it over any habit:
A flatbed scan of an original watercolour study on rough cold-press COTTON
paper. Traditional media only. Editorial, not illustrative. Painted in
under two minutes and left alone. Visible paper tooth everywhere.
The light is UNPAINTED PAPER, never white paint — every star is a speck of
bare paper or a fleck of lifted pigment, never a dot of white gouache.
Palette: a single granulating blue-grey wash, very dilute, letting the
pigment separate and settle into the tooth of the paper.
No glow, no rays, no twinkle marks, no constellations, no Milky Way band,
no galaxy, no nebula. This is a NIGHT WASH WITH SPECKS, not a space poster.

SUBJECT:
An almost empty sheet. A pale, uneven wash of dilute granulating blue-grey
covering it, thinner at the bottom edge and denser at the top — the sky is
always paler near the horizon.
Scattered through it, a few hundred TINY specks of bare paper, made by
lifting pigment with a dry brush and by flicking clean water into the damp
wash so it pushes the pigment aside. The specks are UNEVEN: clusters in
some places, wide empty areas in others, and every one a different size —
most of them barely more than a grain of the paper, a handful noticeably
larger. Never a regular scatter, never the same size twice.
A very small number of specks — five or six in the whole sheet — carry a
faint warm tint of raw sienna instead of being pure paper. Do not make
them brighter, only warmer.
The bottom quarter of the sheet fades almost to nothing.

FORMAT: SEAMLESS TILING LEFT AND RIGHT — the left edge must continue
perfectly into the right edge. Not seamless top to bottom. Opaque, no
transparency. Landscape 3:1. No horizon, no landscape, no moon, no clouds,
no birds. No text, signature, border or frame.

NEGATIVE: white gouache dots, star shapes, four-pointed stars, sparkles,
twinkle, glow, bloom, constellations, milky way, nebula, galaxy, space,
regular scatter, evenly sized dots, airbrush, vector, 3D render, digital
noise, saturated, navy blue, black sky, finished, polished.
```

---

# ~~L4 · `arbol-seccion2.png` — el árbol donde se posa el ente~~

> ## ❌ DESCARTADA — no la generes
>
> **El 12 de agosto de 2026 se suprimió la idea del humo.** `js/humo.js`
> y sus dos lienzos salieron de la página, y con ellos el ave que se
> recogía al entrar en las herramientas. Esta lámina solo existía para
> darle dónde posarse: sin ente no hay nada que aterrice, y un árbol
> suelto en el margen de la sección de lectura sería justo lo que este
> documento prohíbe en la ficha de abajo —un dibujo que compite con el
> manglar del hero sin contar nada.
>
> El prompt se conserva íntegro por si algún día vuelve un actor a esa
> sección. Hasta entonces, no hay que pintarla.

El humo azul y rojo ya recorre la página y ya se recoge en forma de ave
al entrar en la sección de herramientas, pero **se posa en el aire**: el
árbol de esa sección no existe todavía.

El código ya lo está esperando: busca un elemento con
`data-humo-posadero` y, si lo encuentra, planta el ave encima de su
copa; si no, la deja flotando en la franja alta. Con la lámina puesta y
ese atributo en su contenedor, el ente aterriza solo.

Este árbol **no es el manglar**. El manglar es del mundo de arriba, del
agua y de la hora. Este vive en el papel de las herramientas, que es
blanco y quieto, y tiene que leerse como un dibujo al margen: más seco,
más vacío, casi solo gesto. Si compite con el manglar, sobra.

```
VISUAL DIRECTION — read this first and obey it over any habit:
A flatbed scan of an original watercolour study on rough cold-press COTTON
paper. Traditional media only. Editorial, not illustrative. Painted in
about ninety seconds with a large brush and abandoned. MOSTLY EMPTY PAPER.
Palette: almost monochrome — Payne's grey with a trace of olive and raw
umber. Ashen and dry. Far less pigment than any other sheet in this
project: this one is a marginal note, not a painting.
Lighting: flat, even, diffuse. No sun, no light source, no cast shadow, no
glow, no vignette.
Nothing here is cute, decorative or storybook.

SUBJECT:
A single small bare-ish tree in strict side view, seen from a distance.
A short trunk of two or three loaded strokes leaning very slightly, and a
crown made of FOUR OR FIVE broad dry-brush marks — the kind a wide brush
leaves when it is almost out of water, broken and full of gaps.
THE CROWN IS OPEN, not a mass: you can see paper through it everywhere,
and its top edge is a ragged horizontal band, not a dome. It has to be
possible for something to stand on that top edge.
No individual leaves. No branch drawn twice. No roots, no ground line, no
grass, no horizon. The trunk simply stops at the bottom edge.
One or two thin hairline branches escaping the crown and going nowhere.
The pigment pools dark where the crown meets the trunk and dies to bare
paper at the outer edges.

FORMAT: transparent background. The tree fills about 70% of the frame
height and sits centred. Portrait 3:4. No birds, no water, no sky, no
other trees. No text, signature, border or frame.

NEGATIVE: mangrove, prop roots, stilt roots, lush, full crown, dense
foliage, individual leaves, green, saturated, autumn colours, blossom,
landscape, ground, grass, horizon, shadow, cute, cartoon, storybook,
decorative, outlined, vector, 3D render, photorealistic, finished,
polished, symmetrical.
```

---

# L5 · `pasto-matas.png` — el pasto marino, por fin con huecos

Ya estaba anotado y sigue sin llegar, y esta sesión lo ha vuelto a
topar. La lámina actual es una **fila continua sin un solo hueco**: se
puede ondular su borde por código —y se hace— pero ondular un borde no
abre claros, así que en pantalla se lee siempre como una cinta pegada al
canto inferior. El parche es tenerla al 13–34 % de opacidad, que es una
forma elegante de decir que estorba.

De noche además estaba peor por otra razón, y esa **ya se arregló en
código**: entraba con su RGB crudo —arena ocre— sobre agua azul de
madrugada, y dejaba vetas amarillas cruzando el fondo del mar. Ahora
pasa por duotono como el resto del cuadro. Lo que sigue pendiente es el
hueco.

```
VISUAL DIRECTION — read this first and obey it over any habit:
A flatbed scan of an original watercolour study on rough cold-press COTTON
paper. Traditional media only. Editorial, not illustrative. Painted fast
with a small brush, wet-in-wet at the base and dry at the tips, and left
unfinished. Visible paper tooth. MUCH MORE EMPTY PAPER THAN PAINT.
Palette: muted mineral olive and blue-grey, dull and desaturated, seen
through water. No bright green, no turquoise, no tropical colour.
Lighting: flat and even. No sun, no caustics, no light shafts, no glow.

SUBJECT:
FOUR OR FIVE SEPARATE CLUMPS of seagrass rooted along the bottom edge,
with WIDE EMPTY GAPS OF BARE SAND BETWEEN THEM. The gaps are the subject
as much as the clumps: at least half the width of this sheet must be empty
paper. This is the entire reason the sheet is being repainted — the
previous one was a continuous unbroken row and it read as a printed ribbon.
Each clump is different: one tall and thin with six or seven blades, one
low and wide, one almost bare with two blades leaning hard to one side,
one barely more than a smudge. They lean at DIFFERENT angles, as if a slow
current pushed them, never all the same way.
Each blade is ONE stroke, tapering, pigment pooled dark at the root and
running out to bare paper at the tip. No blade drawn twice, no outlines.
Along the bottom edge, a thin broken wash of sand — irregular, interrupted,
never a straight line.

FORMAT: SEAMLESS TILING LEFT AND RIGHT — the left edge must continue
perfectly into the right edge, and a clump may be cut by that seam.
Transparent above the grass. Landscape 4:1. No fish, no coral, no rocks,
no bubbles, no surface, no horizon. No text, signature, border or frame.

NEGATIVE: continuous row, unbroken band, hedge, lawn, dense, uniform
spacing, evenly spaced, bright green, turquoise, tropical, coral, reef,
fish, bubbles, caustics, light rays, outlined, vector, 3D render,
photorealistic, saturated, finished, polished.
```


---
---

# Tanda 2 — hacia una pieza premiable

Estas dos salen de una revisión de DISEÑO, no de un fallo. El
diagnóstico fue este: el hero es una pintura y la sección de abajo es un
documento con tarjetas de borde gris. Las dos mitades no parecen el
mismo objeto, y ese salto es lo que más lejos deja el sitio de estar
terminado — no le falta espectáculo abajo, le falta **el mismo
material**.

Las dos láminas existen para eso: bajar la acuarela como SOPORTE, no
como adorno.

---

# L6 · `papel-barbas.png` — el canto de la hoja

Ahora mismo las secciones se separan con líneas rectas de 1 px al 12 %
de tinta. Es la solución de un documento, y este sitio no es un
documento: es una hoja pintada. Un papel de acuarela de verdad no tiene
el canto recto — tiene **barbas**, el borde deshilachado que deja la
horma al fabricarlo.

Cambiar esas líneas por un canto de papel real es el gesto que más
transforma la página por menos trabajo: cada sección deja de ser un
bloque y pasa a ser una hoja puesta encima de otra.

Se usará repetida en horizontal y espejada, así que **no puede tener un
motivo reconocible**: es una textura, no un dibujo.

```
VISUAL DIRECTION — read this first and obey it over any habit:
A flatbed scan of the TORN EDGE of a sheet of rough cold-press COTTON
watercolour paper. This is a scan of PAPER, not a painting of paper.
No pigment, no wash, no colour beyond the paper's own warm white.
The subject is the EDGE ITSELF: the soft irregular deckle where the sheet
was formed, with loose fibres, thin spots where light passes through, and
a slightly thicker ridge just inside the edge.

SUBJECT:
A single horizontal strip. The top two thirds are transparent — nothing.
The bottom third is the paper, entering from below, and the line where
the two meet is the deckle: uneven, soft, wandering up and down by a few
millimetres, never straight, never a repeating wave.
Along that edge, occasional stray fibres and one or two places where the
sheet is so thin it is almost translucent.
The paper surface itself shows its tooth — the cold-press grain — but is
otherwise EMPTY. Nothing is painted on it.

FORMAT: PNG with real alpha: transparent above the edge, opaque paper
below. SEAMLESS TILING LEFT AND RIGHT — the left edge must continue
perfectly into the right. Landscape 8:1, at least 2400 px wide. No text,
signature, border or frame. No shadow under the edge.

NEGATIVE: painted edge, drawn line, ink outline, torn paper illustration,
ripped notebook, burnt edge, scalloped border, decorative deckle, regular
wave, repeating pattern, drop shadow, colour, wash, stain, watercolour
painting, vector, 3D render, photorealistic paper texture stock photo.
```

---

# L7 · `aguadas-seccion2.png` — el fondo de las herramientas, pintado

El fondo de la sección de lectura son ahora dos charcos hechos con
`radial-gradient` de CSS. Funcionan —se les quitó el anillo que los
hacía parecer pompas— pero son degradados, y un degradado nunca va a
tener lo que tiene una aguada: el pigmento acumulado en el canto, el
grano separándose, la mancha que se secó torcida.

Esta lámina los sustituye. Va **muy diluida**: el texto va encima y la
legibilidad manda sobre todo lo demás. Si la lámina llega cargada, se
usará al 20 % y habrá dado igual pintarla.

Los pigmentos son los del ente: azul y rojo, y el rojo poco y abajo.

```
VISUAL DIRECTION — read this first and obey it over any habit:
A flatbed scan of an original watercolour on rough cold-press COTTON
paper. Traditional media only. This is not an illustration of anything:
it is three or four LOOSE WASHES laid on wet paper and left alone.
Painted in under a minute. MOSTLY BARE PAPER — at least 60% untouched.
The washes must be VERY DILUTE: this sits behind body text that has to
stay readable. Think of the palest wash you can lay and still see it.

SUBJECT:
Two or three large, soft, overlapping washes in granulating blue-grey,
each one bigger than a third of the sheet, with irregular wandering
edges. Where two overlap the colour is a little denser — that is the only
"detail" wanted.
Low and to one side, ONE much smaller warm wash in muted terracotta rose,
no more than a fifth of the sheet, well away from the centre.
The pigment must GRANULATE: let it separate and settle into the tooth so
the grain shows. Two or three drying edges where a puddle stopped, and
one backrun that bloomed on its own. Do not place the accidents.
NO subject, NO horizon, NO landscape, NO shape that reads as an object.
If anything in it looks like a cloud, a mountain or a face, it is wrong.

FORMAT: opaque, no transparency. Landscape 3:2, at least 2400 px wide.
Seamless is NOT needed. No text, signature, border or frame.

NEGATIVE: saturated, bright, dark, heavy, opaque wash, navy, teal,
turquoise, purple, landscape, horizon, cloud, mountain, figure, object,
symmetrical, centred composition, evenly spaced, airbrush, smooth
gradient, digital painting, vector, 3D render, photorealistic, finished,
polished, decorative, pattern.
```


---

# L8 · `filetes-tinta.png` — las líneas, hechas con un pincel

La tercera de la tanda, y la que se me había olvidado al planificar. Sin
ella las otras dos no terminan el trabajo: se puede poner papel de
verdad debajo y aguadas de verdad detrás, pero si las tarjetas siguen
teniendo un rectángulo gris de 1 px alrededor, siguen siendo tarjetas.

Un borde de 1 px al 12 % de tinta es la línea que dibuja un ordenador:
grosor constante, principio y final exactos, esquinas perfectas. Un
filete hecho con un pincel no tiene nada de eso — **arranca seco, carga
en el medio y se levanta al final**, y el grosor cambia porque cambia la
presión de la mano.

Se usará de tres formas, y por eso la hoja trae varios:
- como separador entre bloques (horizontal, largo),
- como filete al canto izquierdo de una tarjeta (el trozo grueso),
- y como subrayado de un dato (corto).

Se recorta por bandas, así que **cada trazo va bien separado del de
arriba y del de abajo**, con espacio limpio entre ellos.

```
VISUAL DIRECTION — read this first and obey it over any habit:
A flatbed scan of RULED INK LINES drawn by hand with a round watercolour
brush on rough cold-press COTTON paper. Traditional media only.
This is a specimen sheet of MARKS, not a drawing of anything.
Each stroke was made in ONE pass, left to right, without lifting or going
back over it. No ruler was used and it must show.
Ink: a single desaturated blue-grey, well diluted. Never black.

SUBJECT — SIX horizontal strokes stacked down the sheet, well apart, with
clean empty paper between them. All six span almost the full width.
They differ from each other, and this is the whole point of the sheet:
1. A LONG THIN one: the brush nearly dry, the line broken in places where
   it skipped over the paper tooth, fading out at both ends.
2. A THICKER one that starts dry on the left, LOADS in the middle where
   the brush pressed down, and lifts off thin on the right.
3. A SHORT one, about a third of the width, denser and more even, with a
   small pool of pigment where the brush stopped and stood.
4. A very thin, almost transparent one, barely there.
5. One that WOBBLES: the same pressure throughout but the path wanders a
   millimetre or two up and down, as a hand does.
6. A thick short one, heavily loaded, with granulation visible inside the
   stroke and one soft bloom where the ink spread into damp paper.
NONE of them has a straight edge, a squared end or a constant width.
No arrowheads, no flourishes, no calligraphy, no lettering.

FORMAT: PNG with real alpha — everything that is not ink is transparent,
including the paper between strokes. Do NOT include the paper as a
background. Landscape 3:2, at least 2400 px wide. No text, signature,
border or frame.

NEGATIVE: ruler, straight line, vector line, constant width, sharp ends,
squared ends, rounded caps, geometric, underline, arrow, flourish,
calligraphy, lettering, brush lettering, black ink, saturated, opaque,
marker pen, felt tip, paper background, drop shadow, 3D render,
photorealistic, digital brush stroke, Photoshop brush, pattern, repeated.
```
