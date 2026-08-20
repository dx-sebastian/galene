# Láminas premium — sesión del 20 de agosto de 2026

Documento **independiente y autónomo**: cada prompt trae su dirección
visual incorporada y se pega tal cual en el generador. Guardar en
`public/arte/` con el **nombre exacto** de cada bloque, en **PNG** (con
transparencia donde se indique). Después `arte-preparar.py` convierte a
WebP y genera el juego de 1024.

**Regla de presupuesto que manda sobre todo:** las dieciséis unidades de
textura que WebGL2 garantiza están ocupadas. Por eso aquí **no hay
láminas nuevas: hay reemplazos y atlas**. Cada encargo o sustituye una
lámina existente en su misma unidad, o se empaqueta dentro de una hoja
que ya existe, o vive en el DOM (que no gasta unidad). Si un encargo
tienta a «una hoja más», la respuesta es no.

---

## La ley que llevan todos incorporada

> No queremos una ilustración en acuarela. Queremos una obra digital que
> se comporta como acuarela.

Editorial, no ilustrativa. Pigmento mineral, no caja de colores. Gesto,
nunca personaje. Nada terminado. Mucho vacío.

**La imperfección no se pide por lista.** Nada de «añade salpicaduras y
backruns»: se pide velocidad, economía y no corregir, y los accidentes
aparecen solos.

**La luz es SIEMPRE papel sin pintar.** El motor mide los píxeles por
encima de 0.80 de luminancia; si la lámina no los trae, el cuadro no
tiene luz.

**El color sube por granulado, no por saturación.** Y en las láminas que
entran en duotono (manglar, nubes, mar) el color casi no importa: lo que
el motor conserva es la ESTRUCTURA DE VALOR. Una lámina de valor pobre
sale pobre a las veinticuatro horas.

**Lo que NO se encarga, y quedó decidido:** ni costa lejana (rechazada
por el dueño el 20 ago 2026), ni anillos que se expanden en el agua (una
onda que se expande desde un punto es una gota cayendo — regla 1), ni
ninguna figura humana, vaso o interior.

---

## El juego completo

| | Lámina | Sustituye a | Unidad |
|---|---|---|---|
| **P1** | `manglar-v3.png` | `manglar-v2.webp` | 4 |
| **P2** | `cielo-atlas-v4.png` | `cielo-atlas-v3.webp` | 10 |
| **P3** | `mar-cercano-v2.png` | `mar-cercano.webp` | 2 |
| **P3b** | `mar-cercano-v2-calmo.png` | `mar-cercano-calmo.webp` | 3 |
| **P4** | `mar-medio-v2.png` | `mar-medio.webp` | 1 |
| **P4b** | `mar-medio-v2-calmo.png` | `mar-medio-calmo.webp` | 9 |
| **P5** | `reguero-espuma-atlas.png` | `reguero.webp` | 15 |
| **P6** | `garza-bandada.png` | — (DOM, sin unidad) | — |

El orden es la prioridad. P1 y P2 son la mitad del salto premium; P5
necesita además trabajo de motor (leer la celda de espuma), que se hace
después de tener la hoja.

---

# P1 · `manglar-v3.png` — el protagonista, con cuerpo y con luz

**Por qué.** El árbol actual es correcto y se lee solo y pobre: una copa
de una sola masa, sin huecos de cielo, sin raíces colgantes, con el
rango de valor corto. El motor ya le pone luz direccional, huecos de
papel y viento — pero no puede inventar la estructura que la lámina no
trae. El dueño lo dijo exacto: «el árbol parece estar solo y triste».

**La condición dura:** MISMA silueta general, mismo encuadre y misma
ocupación del lienzo que `manglar-v2.webp` (adjuntarla como imagen de
entrada). Las perchas de las garzas y la línea de agua de las raíces
están ancladas en coordenadas de la lámina: si la copa cambia de sitio,
las aves flotan. Lo que cambia es lo que hay DENTRO de la silueta.

```
Use case: precise-object-edit
Asset type: hero-subject repaint for the animated Galene website; the
engine recolors it by hour (duotone), bends it in the wind and mirrors
it in the water. Image 1 (attached) is the authoritative composition.

Primary request: repaint the red mangrove tree from Image 1 keeping its
EXACT silhouette envelope, canvas occupation, trunk position and the
waterline of the prop roots — birds are anchored to this geometry — but
give the painting what the current one lacks:

· CANOPY IN CLUMPS, NOT ONE MASS. Four to six distinct foliage masses
  with real SKY HOLES between them where bare paper shows through. The
  holes are the tree's light; without them it is a green blob.
· FULL VALUE RANGE. The shadowed underside of each clump goes genuinely
  dark (deep blue-green, near 20% luminance); the sunlit tops of TWO OR
  THREE clumps only are almost bare paper with a thin wash. One side of
  the tree carries more light than the other — pick the right side and
  commit to it; the engine knows which side its sun is on.
· HANGING PROP ROOTS. From the two lowest branches, three or four thin
  aerial roots drop toward the water and stop short of it, drawn as
  single confident dark strokes with dry-brush breaks. They are what
  makes a red mangrove read as a mangrove.
· THE ROOT ARCH stays exactly where it is, but each root gains a lit
  edge on one side (thin bare-paper rim) and a dark waterline where it
  meets the bottom edge.

Style/medium: a flatbed scan of an original watercolour on rough
cold-press COTTON paper. Traditional media only. Painted fast in layered
washes, stopped early. Granulating mineral pigment — the greens lean
olive and grey, never emerald; the wood is raw umber over grey. Visible
paper tooth. All light is UNPAINTED PAPER, never white paint.

Composition/framing: portrait 2:3 (deliver 1024x1536 or larger), same
crop as Image 1. The tree touches neither the left, right nor top edge;
the roots reach the bottom edge exactly as in Image 1.

FORMAT: transparent background. No water, no reflection, no sky, no
birds, no horizon, no shadow cast on anything. No text, signature,
border or frame.

NEGATIVE: emerald green, saturated foliage, airbrush gradients, one
uniform green mass, symmetrical canopy, cartoon tree, broccoli tree,
outlined leaves, vector, 3D render, photorealism, glow, vignette,
finished, polished, moved or resized silhouette.
```

---

# P2 · `cielo-atlas-v4.png` — cuatro cielos con acontecimientos

**Por qué.** El atlas actual da UNA masa diagonal por celda y el motor
ya la muestrea dos veces para fingir cúmulos menores. Con celdas que
traigan de verdad masa grande + cúmulos sueltos, el cielo deja de estar
vacío sin fingir nada.

**La condición dura:** atlas de **2×2 celdas exactas** (1536×1024, cada
celda 768×512). Arriba-izquierda ALBA, arriba-derecha DÍA,
abajo-izquierda OCASO, abajo-derecha NOCHE **completamente vacía** (la
noche la ponen las estrellas; una nube gris duplicada encima del añil ya
se pagó una vez). Todo en **placa de valor gris** sobre negro puro: el
color lo pone la hora en el motor.

```
Use case: precise-object-edit
Asset type: grayscale value-plate cloud ATLAS for the animated Galene
website hero, recolored by a WebGL shader per hour of day.

Layout — FOUR EQUAL CELLS on one 3:2 sheet (each cell 3:2 landscape),
hard grid, nothing crossing cell borders, generous margin inside each:
· TOP-LEFT (dawn): one long, low, horizontal cloud bank lit from below
  — dark upper body, thin bare-paper rim along its BOTTOM edge — plus
  two small torn fragments floating separate above it. Mostly empty
  cell: dawn is one event, not a crowded sky.
· TOP-RIGHT (day): one majestic cumulus mass rising diagonally from
  lower-left toward an upper-right tower, white paper-reserve faces and
  blue-grey undersides — AND, new versus the previous atlas, THREE TO
  FIVE SMALL SEPARATE CUMULI scattered in the open air around it at
  clearly different sizes, never in a row, never evenly spaced. The
  clean open blue areas must survive: the small clouds fill the air,
  they do not cover it.
· BOTTOM-LEFT (dusk): TWO OR THREE distinct horizontal cloud masses at
  different heights, each with a bright under-lit lower edge (bare
  paper) and a heavy upper body; between them, clean sky. One mass
  large, the others smaller and farther. This cell reads as the richest
  of the four — dusk clouds are half the composition of that hour.
· BOTTOM-RIGHT (night): COMPLETELY EMPTY. Pure flat black, nothing
  painted, not one mark.

Style/medium: real loose watercolour study on rough cold-press cotton
paper, one-pass brushwork, granulating pigment, broken dry edges, soft
lost edges. Strictly neutral grayscale: white paper-reserve faces, cool
middle greys, deep blue-grey shadows. No chroma anywhere.

Scene/backdrop: perfectly flat solid pure black (#000000) in all four
cells, used as a luminance matte — uniform edge to edge, no vignette,
no glow, no gradient, no horizon, no landscape.

Constraints: no sun, no moon, no stars, no birds, no water, no text,
signature, border or watermark. No cloud touches a cell border.

Avoid: background glow, gray haze, soft-focus halo, photorealism, CGI,
cotton-wool clouds, airbrush gradients, crisp digital outlines, colored
pixels, symmetry, clouds in rows.

Post-processing (ours, for the record): black matte → alpha with a
0–32 luminance ramp; RGB forced to neutral luminance; saved as the four
cells of cielo-atlas-v4.webp with UNPACK_FLIP_Y in mind (top row of the
file is v=1).
```

---

# P3 · `mar-cercano-v2.png` — el agua que se toca, con materia

**Por qué.** La banda cercana actual mide 2048×246 y a pantalla completa
se le acaba la materia: granulado corto, facetas tímidas. El motor
reserva como papel su decil más claro (los destellos bajo el sol) y
cuantiza su valor — cuanto más traiga la lámina, más da el agua.

**Condiciones duras:** formato apaisado ~8:1 (entregar 4096×492),
**repetible en horizontal sin costura** (el agua deriva siempre), sin
cielo, sin horizonte, sin objetos. El decil claro debe existir: vetas
finas de papel intacto en las crestas, no repartidas parejas.

```
VISUAL DIRECTION — read this first and obey it over any habit:
A flatbed scan of an original watercolour study on rough cold-press
COTTON paper. Traditional media only. Editorial, not illustrative.
Painted fast, wet-in-wet with a few dry-brush passes on top, stopped
early. Visible paper tooth throughout. All light is UNPAINTED PAPER.
Palette: granulating mineral pigment — cerulean and cobalt that separate
on the paper, a trace of viridian in the troughs, one whisper of potash
rose in two or three warm passages. Desaturated overall; the life comes
from pigments SEPARATING, not from saturation.

SUBJECT: open NEAR water seen from a low shore, no sky, no horizon —
water fills the entire sheet edge to edge.
· Long overlapping horizontal swells, larger and looser toward the
  bottom edge (nearer the eye), tighter toward the top.
· On the top face of some swells, THIN SLIVERS OF BARE PAPER — the
  facets that catch the sun. They cluster in two or three zones and are
  absent elsewhere; never sprinkled evenly (that would be glitter).
· The troughs pool darker, with granulation clearly visible where the
  pigment settled into the paper valleys.
· Two or three hard drying rims run almost the full width; most other
  edges are lost, wet-in-wet.
· A few dry-brush drags across the bottom third leave broken texture —
  the paper tooth doing the sparkle.

FORMAT: the painting must TILE SEAMLESSLY LEFT-TO-RIGHT: the left and
right edges continue each other exactly (paint past the edges or plan
the wrap). Landscape, very wide, about 8:1 — deliver 4096x492. Opaque,
full-bleed paint (no transparency). No sky, horizon, boats, birds, fish,
rocks, foam caps, text, signature, border or frame.

NEGATIVE: glitter, even sprinkle of highlights, white paint highlights,
photorealistic waves, 3D render, airbrush gradient, teal saturation,
storybook, visible seam, vignette, finished, polished.
```

## P3b · `mar-cercano-v2-calmo.png` — edición, no generación

**Sube `mar-cercano-v2.png` como imagen de entrada.** Generar la calma
aparte rompe el registro y el cross-fade del gesto de sostener se ve
como una disolvencia.

```
Keep this exact painting: same sheet, same paper grain, same pigments,
same composition, same framing, same value structure, same dark and
light regions in the same places, same seamless left-right tiling.

Change only the state of the water: the wind has dropped.
· Flatten every swell. No peaks, no crests, no breaking edges.
· Replace the wave shapes with long, low, horizontal bands of wash that
  run almost the full width, overlapping softly.
· Remove nearly all the bare-paper slivers. Keep only two or three very
  thin horizontal ones.
· Soften most hard drying edges into wet-in-wet transitions, but keep
  two or three crisp horizontal rims so it still reads as watercolour.
· Slightly lighter overall: calm water mirrors more sky.

Do not change: paper texture, palette, crop, aspect ratio, tiling, or
the position of the darker passages. No sky, no horizon, no objects.
```

---

# P4 · `mar-medio-v2.png` — la banda media, misma receta

Mismo prompt que P3 con TRES cambios, y su gemela calma con el mismo
prompt de edición de P3b:

```
· The swells are TIGHTER and FLATTER: this is the middle distance, seen
  more edge-on. Bands, not bellies.
· The bare-paper facets are finer and even scarcer — two zones at most.
· The value range is slightly narrower: distance flattens contrast.
Deliver 4096x492, seamless left-to-right, same visual direction,
same negatives.
```

---

# P5 · `reguero-espuma-atlas.png` — el camino del sol y la espuma, en una hoja

**Por qué.** El reguero actual (1024×1536) funciona; lo que no existe en
ninguna hoja es la ESPUMA: se intentó procedural y se descartó con razón
(«si algún día hace falta espuma, sale de una lámina pintada, no de
aquí»). No hay unidad de textura libre, así que espuma y reguero
comparten hoja: **atlas de 2 celdas verticales lado a lado** (entregar
2048×1536; celda izquierda = reguero, celda derecha = espuma). El motor
hoy lee solo la mitad izquierda; conectar la derecha es trabajo de
código posterior.

```
VISUAL DIRECTION — read this first and obey it over any habit:
A flatbed scan of an original watercolour study on rough cold-press
COTTON paper. Traditional media only. Editorial, not illustrative.
Painted fast and stopped early. All light is UNPAINTED PAPER — this
entire sheet is ABOUT reserved paper. Palette: almost no pigment at all;
what little there is, is a pale warm grey (raw sienna + Payne's grey).

SUBJECT — one sheet, TWO EQUAL VERTICAL CELLS side by side:

LEFT CELL — the sun's path on water, seen head-on, a vertical column:
· A column of BROKEN HORIZONTAL STROKES of bare paper on a barely-washed
  ground: each stroke is one wave face catching the light.
· At the TOP of the cell the strokes are tiny, dense and almost fused —
  near the horizon the path is a solid ribbon.
· Going DOWN the cell they grow longer, fewer and farther apart, with
  real gaps of clean water between them; the lowest three or four are
  single confident dry-brush drags.
· The column narrows slightly toward the top (perspective) and its
  edges are ragged — strokes stray outside the column line, never a
  clean border.

RIGHT CELL — foam gestures, a sprite sheet of five or six SEPARATE
marks scattered with generous space between them, different sizes:
· Each mark is the foam of one small spilling crest seen from the
  shore: a short horizontal dry-brush skip of bare paper with a soft
  grey shadow directly under its leading edge, trailing off to one side
  in a few broken dots.
· NO mark is a circle, a ring, an arc or a splash. Foam slides along a
  crest; it does not radiate from a point.
· One or two marks are barely there — three dots and a drag.

FORMAT: transparent background in BOTH cells — only the washes and
strokes carry pixels. Landscape 4:3 total (deliver 2048x1536), the two
cells exactly half each, nothing crossing the center line. No sun disc,
no sky, no horizon, no water body, no fish, no text, signature, border
or frame.

NEGATIVE: rings, ripples, radial splash, droplets, starburst, glitter,
even sprinkle, white paint, glow, lens flare, hard column edges,
symmetry, photorealism, 3D render, finished, polished.
```

---

# P6 · `garza-bandada.png` — las que pasan de largo (DOM, sin unidad)

**Por qué.** En la referencia del dueño hay aves diminutas cruzando el
cielo. Viven en el DOM como las demás garzas —cero unidades de
textura— y el motor las hace derivar con el paralaje del fondo.

```
VISUAL DIRECTION — read this first and obey it over any habit:
A flatbed scan of an original watercolour study on rough cold-press
COTTON paper. Traditional media only. Editorial, not illustrative.
Painted in seconds. Mostly EMPTY PAPER — the void is the subject.
Palette: one pale Payne's grey, almost nothing. Flat diffuse light.

SUBJECT: THREE herons in flight, far away, crossing the sheet loosely
from lower-left to upper-right — never in formation, never evenly
spaced, one clearly lagging. Each bird is TWO STROKES: a shallow
double-curve for the wings and a hair of a line for the trailing legs.
At this distance there is no head detail, no eye, no feathers — marks
that happen to read as distant birds. The three differ in size (the
farthest is barely four millimetres of paint) and in wingbeat phase.

FORMAT: transparent background. Wide landscape 3:1. No clouds, sky
wash, ground, water or horizon. No text, signature, border or frame.

NEGATIVE: V formation, evenly spaced, silhouette stamps, repeated
identical birds, cute, cartoon, eyes, feather detail, outlines, black
ink birds, seagull "m" shapes, vector, finished, polished.
```

---

## Entrega y conexión

1. Guardar cada PNG en `public/arte/` con su nombre exacto.
2. `python3 arte-preparar.py` genera WebP + juego de 1024/768.
3. P1–P4 entran solas (mismo nombre de unidad, el motor no cambia).
   P5 y P6 avisan: la celda de espuma y la bandada DOM necesitan su
   conexión de código, que se hace cuando la hoja exista.
