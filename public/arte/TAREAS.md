# Tareas de arte — Galene

Marca la casilla cuando la tengas. Guárdala en `public/arte/` con el
nombre exacto, en **PNG con transparencia**. Yo convierto a WebP y genero
el juego de 1024.

**El ave sigue siendo la garza.** No cambiamos de especie.

---

## El contrato — va dentro de cada prompt, no hay que pegarlo aparte

Antes yo pedía la imperfección **por lista**: grafito visible, backruns,
salpicaduras. Eso es lo más impuesto que existe — el modelo coloca
accidentes como quien coloca adornos.

El contrato nuevo pide **velocidad, economía y no corregir**. La
imperfección aparece sola, como consecuencia de pintar rápido y parar
antes de tiempo. Es la diferencia entre un cuadro que *tiene* accidentes
y uno que *los sufrió*.

## Y el color

Queremos **azul cielo y rosa**, y que siga siendo paz. La forma de que
un rosa no se vuelva dulce es que **esté justificado por la hora**: el
cielo se pone rosa al amanecer y al atardecer porque la luz atraviesa
más aire, no porque quede bonito. Así el color entra como acontecimiento
y no como decoración.

Y sube por **granulado**, no por saturación: pigmentos que se separan
sobre el papel —cerúleo, rosa de potasio, siena— dejados caer en mojado
para que se aparten y se vean los granos de cada uno. Un cuadro vivo con
pigmentos apagados, no un cuadro saturado.

---

# A0 · El cielo, cuatro láminas · **lo que más cambia la pantalla**

Hay UNA sola lámina de nubes y la hora solo la recolorea. Por eso ninguna
hora es del todo hermosa: unas nubes que funcionan al alba están mal a
mediodía, porque **cada hora tiene su tipo de nube**, y eso es física.

- **Alba** — cirros altísimos. El sol aún no ha salido pero ya les llega,
  así que se encienden solos sobre un cielo todavía apagado. Es el único
  momento del día en que la luz viene **de abajo**.
- **Día** — casi nada. Cúmulos pequeños y bajos, junto al horizonte.
- **Ocaso** — altocúmulos en capas. Cada borreguito recibe la luz por
  separado y el cielo se vuelve un mosaico.
- **Noche** — un velo finísimo, para que la luna tenga dónde apoyarse.

Cada prompt va **completo y autónomo**, y se repiten enteros a propósito:
un prompt que dice "igual que el anterior" se pega mal y sale mal.

- [ ] ### `cielo-alba.png` — El alba — cirros que se encienden por abajo

```
You are painting ONE plate for a hand-painted watercolour scene. Read
every rule before you start. The rules are not style suggestions: the
plate is composited by a shader and a plate that breaks them is thrown
away.

=== 1 - WHAT TO PAINT ===
SUBJECT >>> CIRRUS, the highest clouds there are. Four or five long horizontal
filaments swept across the UPPER THIRD of the sheet only, each one a
single dragged stroke, feathered and broken at both ends, thin enough
to see through. Below them nothing at all: the lower two thirds is
bare paper. 78% of the sheet untouched.

=== 2 - THE FIVE HARD RULES ===
R1. TRANSPARENT BACKGROUND, true alpha. No white, no cream, no paper
    tone, no colour of any kind behind the subject. Not "white that
    looks like transparent" - actually transparent.
R2. NO HALO. No pale outline, fringe, glow or soft edge of background
    colour clinging to the subject. No stray coloured pixels anywhere.
R3. NOTHING BUT THE SUBJECT. No horizon, no ground, no sky, no water,
    no sun, no moon, no stars, no shadow, no reflection, no frame, no
    border, no signature, no text, no numbers, no watermark.
R4. AT LEAST HALF THE SHEET IS BARE. The empty area is not wasted
    space, it is the picture. If in doubt, paint less.
R5. ONE PASS ONLY. Painted wet, painted fast, and then abandoned. Never
    go back over something that has dried.

=== 3 - WHY YOUR WATERCOLOURS COME OUT LOOKING LIKE PHOTOGRAPHS ===
This is the part that usually fails. A render of a watercolour and a
watercolour differ in four specific, checkable ways. Obey all four.

W1. EDGES, NOT GRADIENTS. Real watercolour dries into FLAT SHAPES with
    a HARD EDGE where the puddle stopped. Smooth continuous shading is
    the single clearest sign of a digital render. Every wash must be
    either flat, or lost into bare paper, and it must have at least one
    hard dried edge. NO airbrushed falloff. NO soft glow. NO blur.
W2. GRANULATION INSTEAD OF DETAIL. The interest comes from the pigment
    separating and settling into the paper's tooth, so no wash is ever
    one even tone. It does NOT come from drawing more things. Detail is
    what makes it look rendered; grain is what makes it look painted.
W3. FEWER STROKES THAN YOU THINK. Each element gets two or three
    touches of the brush and no more. A shape that took twenty strokes
    reads as a render no matter how it is textured. Suggest the mass
    and stop. Where the brush skipped over the tooth, leave the broken
    white speckle inside the stroke - do not fill it in.
W4. NO LIGHTING. There is no sun, no light source, no highlight, no
    cast shadow, no ambient occlusion, no depth of field. Flat, even,
    diffuse light everywhere. Form comes from the value of the wash,
    not from illumination.

Accidents are welcome - backruns that bloomed where a wet stroke met a
drier one, a hard edge where a puddle dried, a run that went too far -
but only as CONSEQUENCES of painting fast. Do not place them
decoratively. A painting that has accidents and a painting that
suffered them do not look alike.

=== 4 - COLOUR ===
GREY AND NOTHING ELSE: a cool neutral grey with a trace of raw umber,
and no other pigment anywhere in the image. This is deliberate and it
matters - the colour of the hour is added afterwards by the shader, so
this painting must carry only VALUE: where the cloud is dense and where
it is barely there. A plate that arrives already pink or golden fights
the palette and looks dirty at three in the afternoon.
Never pure black. Never white paint - the white is the paper.

=== 5 - OUTPUT ===
PNG with a real alpha channel. Landscape 3:2, at least 2400 px wide.
Edges seamless left and right: the plate is tiled horizontally, so what
leaves the right edge must arrive at the left.

=== 6 - CHECK BEFORE YOU ANSWER ===
Go through this list. If any answer is no, paint it again.
  [ ] Is the background genuinely transparent, with no halo?
  [ ] Is more than half the sheet bare?
  [ ] Is the whole image grey - no pink, no gold, no blue?
  [ ] Does every wash have at least one hard dried edge?
  [ ] Is there any smooth gradient anywhere? There must not be.
  [ ] Can I see the grain of the paper through the paint?
  [ ] Did I add a horizon, a sun, a moon, a star or a shadow? Remove it.
  [ ] Does the left edge continue into the right edge?

=== NEGATIVE ===
blue sky, sky gradient, background colour, coloured clouds, pink, gold,
orange, sunrise colours, sunset postcard, golden hour, white background,
cream background, halo, fringe, outline, ink line, smooth gradient,
airbrush, soft focus, blur, bloom, glow, god rays, lens flare,
highlight, cast shadow, ambient occlusion, depth of field, sun, moon,
stars, starfield, 3D render, CGI, photorealistic, HDR, oversaturated,
neon, digital painting, concept art, illustration, storybook, cotton
wool, decorative, symmetrical, evenly spaced, repeating pattern, tidy,
finished, polished, overworked, signature, watermark, text, numbers,
border, frame.
```

- [ ] ### `cielo-dia.png` — El día — un cielo de mediodía bonito es un cielo vacío

```
You are painting ONE plate for a hand-painted watercolour scene. Read
every rule before you start. The rules are not style suggestions: the
plate is composited by a shader and a plate that breaks them is thrown
away.

=== 1 - WHAT TO PAINT ===
SUBJECT >>> SIX OR SEVEN SMALL FAIR-WEATHER CUMULUS, low and far away, sitting in
a narrow band across the LOWER THIRD of the sheet and never rising
above it. Soft rounded tops, flat and slightly darker bases, two or
three brush touches each and no more. They are uneven: different
sizes, irregular spacing, and two of them almost dissolved to nothing.
The entire upper two thirds is bare paper. 82% of the sheet
untouched.

=== 2 - THE FIVE HARD RULES ===
R1. TRANSPARENT BACKGROUND, true alpha. No white, no cream, no paper
    tone, no colour of any kind behind the subject. Not "white that
    looks like transparent" - actually transparent.
R2. NO HALO. No pale outline, fringe, glow or soft edge of background
    colour clinging to the subject. No stray coloured pixels anywhere.
R3. NOTHING BUT THE SUBJECT. No horizon, no ground, no sky, no water,
    no sun, no moon, no stars, no shadow, no reflection, no frame, no
    border, no signature, no text, no numbers, no watermark.
R4. AT LEAST HALF THE SHEET IS BARE. The empty area is not wasted
    space, it is the picture. If in doubt, paint less.
R5. ONE PASS ONLY. Painted wet, painted fast, and then abandoned. Never
    go back over something that has dried.

=== 3 - WHY YOUR WATERCOLOURS COME OUT LOOKING LIKE PHOTOGRAPHS ===
This is the part that usually fails. A render of a watercolour and a
watercolour differ in four specific, checkable ways. Obey all four.

W1. EDGES, NOT GRADIENTS. Real watercolour dries into FLAT SHAPES with
    a HARD EDGE where the puddle stopped. Smooth continuous shading is
    the single clearest sign of a digital render. Every wash must be
    either flat, or lost into bare paper, and it must have at least one
    hard dried edge. NO airbrushed falloff. NO soft glow. NO blur.
W2. GRANULATION INSTEAD OF DETAIL. The interest comes from the pigment
    separating and settling into the paper's tooth, so no wash is ever
    one even tone. It does NOT come from drawing more things. Detail is
    what makes it look rendered; grain is what makes it look painted.
W3. FEWER STROKES THAN YOU THINK. Each element gets two or three
    touches of the brush and no more. A shape that took twenty strokes
    reads as a render no matter how it is textured. Suggest the mass
    and stop. Where the brush skipped over the tooth, leave the broken
    white speckle inside the stroke - do not fill it in.
W4. NO LIGHTING. There is no sun, no light source, no highlight, no
    cast shadow, no ambient occlusion, no depth of field. Flat, even,
    diffuse light everywhere. Form comes from the value of the wash,
    not from illumination.

Accidents are welcome - backruns that bloomed where a wet stroke met a
drier one, a hard edge where a puddle dried, a run that went too far -
but only as CONSEQUENCES of painting fast. Do not place them
decoratively. A painting that has accidents and a painting that
suffered them do not look alike.

=== 4 - COLOUR ===
GREY AND NOTHING ELSE: a cool neutral grey with a trace of raw umber,
and no other pigment anywhere in the image. This is deliberate and it
matters - the colour of the hour is added afterwards by the shader, so
this painting must carry only VALUE: where the cloud is dense and where
it is barely there. A plate that arrives already pink or golden fights
the palette and looks dirty at three in the afternoon.
Never pure black. Never white paint - the white is the paper.

=== 5 - OUTPUT ===
PNG with a real alpha channel. Landscape 3:2, at least 2400 px wide.
Edges seamless left and right: the plate is tiled horizontally, so what
leaves the right edge must arrive at the left.

=== 6 - CHECK BEFORE YOU ANSWER ===
Go through this list. If any answer is no, paint it again.
  [ ] Is the background genuinely transparent, with no halo?
  [ ] Is more than half the sheet bare?
  [ ] Is the whole image grey - no pink, no gold, no blue?
  [ ] Does every wash have at least one hard dried edge?
  [ ] Is there any smooth gradient anywhere? There must not be.
  [ ] Can I see the grain of the paper through the paint?
  [ ] Did I add a horizon, a sun, a moon, a star or a shadow? Remove it.
  [ ] Does the left edge continue into the right edge?

=== NEGATIVE ===
blue sky, sky gradient, background colour, coloured clouds, pink, gold,
orange, sunrise colours, sunset postcard, golden hour, white background,
cream background, halo, fringe, outline, ink line, smooth gradient,
airbrush, soft focus, blur, bloom, glow, god rays, lens flare,
highlight, cast shadow, ambient occlusion, depth of field, sun, moon,
stars, starfield, 3D render, CGI, photorealistic, HDR, oversaturated,
neon, digital painting, concept art, illustration, storybook, cotton
wool, decorative, symmetrical, evenly spaced, repeating pattern, tidy,
finished, polished, overworked, signature, watermark, text, numbers,
border, frame, towering cumulus, thunderhead, storm.
```

- [ ] ### `cielo-ocaso.png` — El ocaso — cielo aborregado, cada nube con su luz

```
You are painting ONE plate for a hand-painted watercolour scene. Read
every rule before you start. The rules are not style suggestions: the
plate is composited by a shader and a plate that breaks them is thrown
away.

=== 1 - WHAT TO PAINT ===
SUBJECT >>> ALTOCUMULUS IN RANKS, a mackerel sky. Many small cloudlets gathered
into two or three loose horizontal shoals across the MIDDLE BAND of
the sheet, getting smaller and closer together toward the bottom, the
way they do when they recede toward the horizon. Each cloudlet is ONE
touch of the brush and nothing more. The shoals clump in places and
thin out to bare paper in others - never evenly spaced, never the same
size. Vary the value from cloudlet to cloudlet: some almost solid,
some barely a stain, because at sunset each one catches the light
separately. This is the busiest of the four skies and still 65% of the
sheet is untouched.

=== 2 - THE FIVE HARD RULES ===
R1. TRANSPARENT BACKGROUND, true alpha. No white, no cream, no paper
    tone, no colour of any kind behind the subject. Not "white that
    looks like transparent" - actually transparent.
R2. NO HALO. No pale outline, fringe, glow or soft edge of background
    colour clinging to the subject. No stray coloured pixels anywhere.
R3. NOTHING BUT THE SUBJECT. No horizon, no ground, no sky, no water,
    no sun, no moon, no stars, no shadow, no reflection, no frame, no
    border, no signature, no text, no numbers, no watermark.
R4. AT LEAST HALF THE SHEET IS BARE. The empty area is not wasted
    space, it is the picture. If in doubt, paint less.
R5. ONE PASS ONLY. Painted wet, painted fast, and then abandoned. Never
    go back over something that has dried.

=== 3 - WHY YOUR WATERCOLOURS COME OUT LOOKING LIKE PHOTOGRAPHS ===
This is the part that usually fails. A render of a watercolour and a
watercolour differ in four specific, checkable ways. Obey all four.

W1. EDGES, NOT GRADIENTS. Real watercolour dries into FLAT SHAPES with
    a HARD EDGE where the puddle stopped. Smooth continuous shading is
    the single clearest sign of a digital render. Every wash must be
    either flat, or lost into bare paper, and it must have at least one
    hard dried edge. NO airbrushed falloff. NO soft glow. NO blur.
W2. GRANULATION INSTEAD OF DETAIL. The interest comes from the pigment
    separating and settling into the paper's tooth, so no wash is ever
    one even tone. It does NOT come from drawing more things. Detail is
    what makes it look rendered; grain is what makes it look painted.
W3. FEWER STROKES THAN YOU THINK. Each element gets two or three
    touches of the brush and no more. A shape that took twenty strokes
    reads as a render no matter how it is textured. Suggest the mass
    and stop. Where the brush skipped over the tooth, leave the broken
    white speckle inside the stroke - do not fill it in.
W4. NO LIGHTING. There is no sun, no light source, no highlight, no
    cast shadow, no ambient occlusion, no depth of field. Flat, even,
    diffuse light everywhere. Form comes from the value of the wash,
    not from illumination.

Accidents are welcome - backruns that bloomed where a wet stroke met a
drier one, a hard edge where a puddle dried, a run that went too far -
but only as CONSEQUENCES of painting fast. Do not place them
decoratively. A painting that has accidents and a painting that
suffered them do not look alike.

=== 4 - COLOUR ===
GREY AND NOTHING ELSE: a cool neutral grey with a trace of raw umber,
and no other pigment anywhere in the image. This is deliberate and it
matters - the colour of the hour is added afterwards by the shader, so
this painting must carry only VALUE: where the cloud is dense and where
it is barely there. A plate that arrives already pink or golden fights
the palette and looks dirty at three in the afternoon.
Never pure black. Never white paint - the white is the paper.

=== 5 - OUTPUT ===
PNG with a real alpha channel. Landscape 3:2, at least 2400 px wide.
Edges seamless left and right: the plate is tiled horizontally, so what
leaves the right edge must arrive at the left.

=== 6 - CHECK BEFORE YOU ANSWER ===
Go through this list. If any answer is no, paint it again.
  [ ] Is the background genuinely transparent, with no halo?
  [ ] Is more than half the sheet bare?
  [ ] Is the whole image grey - no pink, no gold, no blue?
  [ ] Does every wash have at least one hard dried edge?
  [ ] Is there any smooth gradient anywhere? There must not be.
  [ ] Can I see the grain of the paper through the paint?
  [ ] Did I add a horizon, a sun, a moon, a star or a shadow? Remove it.
  [ ] Does the left edge continue into the right edge?

=== NEGATIVE ===
blue sky, sky gradient, background colour, coloured clouds, pink, gold,
orange, sunrise colours, sunset postcard, golden hour, white background,
cream background, halo, fringe, outline, ink line, smooth gradient,
airbrush, soft focus, blur, bloom, glow, god rays, lens flare,
highlight, cast shadow, ambient occlusion, depth of field, sun, moon,
stars, starfield, 3D render, CGI, photorealistic, HDR, oversaturated,
neon, digital painting, concept art, illustration, storybook, cotton
wool, decorative, symmetrical, evenly spaced, repeating pattern, tidy,
finished, polished, overworked, signature, watermark, text, numbers,
border, frame, fish scales, honeycomb, grid, tessellation.
```

- [ ] ### `cielo-noche.png` — La noche — un velo para que la luna tenga dónde apoyarse

```
You are painting ONE plate for a hand-painted watercolour scene. Read
every rule before you start. The rules are not style suggestions: the
plate is composited by a shader and a plate that breaks them is thrown
away.

=== 1 - WHAT TO PAINT ===
SUBJECT >>> ALMOST NOTHING. Two or three enormous, extremely faint veils of high
cloud drifting diagonally across the sheet, so thin they are barely
darker than the paper itself. They have NO hard edges anywhere - this
is the only one of the four skies without a single hard edge, every
edge lost in every direction. If a shape starts to read as a cloud it
is already too strong. 88% of the sheet is bare paper and the painted
12% is the palest wash in the set, painted almost entirely in the
first two steps above bare paper.

=== 2 - THE FIVE HARD RULES ===
R1. TRANSPARENT BACKGROUND, true alpha. No white, no cream, no paper
    tone, no colour of any kind behind the subject. Not "white that
    looks like transparent" - actually transparent.
R2. NO HALO. No pale outline, fringe, glow or soft edge of background
    colour clinging to the subject. No stray coloured pixels anywhere.
R3. NOTHING BUT THE SUBJECT. No horizon, no ground, no sky, no water,
    no sun, no moon, no stars, no shadow, no reflection, no frame, no
    border, no signature, no text, no numbers, no watermark.
R4. AT LEAST HALF THE SHEET IS BARE. The empty area is not wasted
    space, it is the picture. If in doubt, paint less.
R5. ONE PASS ONLY. Painted wet, painted fast, and then abandoned. Never
    go back over something that has dried.

=== 3 - WHY YOUR WATERCOLOURS COME OUT LOOKING LIKE PHOTOGRAPHS ===
This is the part that usually fails. A render of a watercolour and a
watercolour differ in four specific, checkable ways. Obey all four.

W1. EDGES, NOT GRADIENTS. Real watercolour dries into FLAT SHAPES with
    a HARD EDGE where the puddle stopped. Smooth continuous shading is
    the single clearest sign of a digital render. Every wash must be
    either flat, or lost into bare paper, and it must have at least one
    hard dried edge. NO airbrushed falloff. NO soft glow. NO blur.
W2. GRANULATION INSTEAD OF DETAIL. The interest comes from the pigment
    separating and settling into the paper's tooth, so no wash is ever
    one even tone. It does NOT come from drawing more things. Detail is
    what makes it look rendered; grain is what makes it look painted.
W3. FEWER STROKES THAN YOU THINK. Each element gets two or three
    touches of the brush and no more. A shape that took twenty strokes
    reads as a render no matter how it is textured. Suggest the mass
    and stop. Where the brush skipped over the tooth, leave the broken
    white speckle inside the stroke - do not fill it in.
W4. NO LIGHTING. There is no sun, no light source, no highlight, no
    cast shadow, no ambient occlusion, no depth of field. Flat, even,
    diffuse light everywhere. Form comes from the value of the wash,
    not from illumination.

Accidents are welcome - backruns that bloomed where a wet stroke met a
drier one, a hard edge where a puddle dried, a run that went too far -
but only as CONSEQUENCES of painting fast. Do not place them
decoratively. A painting that has accidents and a painting that
suffered them do not look alike.

=== 4 - COLOUR ===
GREY AND NOTHING ELSE: a cool neutral grey with a trace of raw umber,
and no other pigment anywhere in the image. This is deliberate and it
matters - the colour of the hour is added afterwards by the shader, so
this painting must carry only VALUE: where the cloud is dense and where
it is barely there. A plate that arrives already pink or golden fights
the palette and looks dirty at three in the afternoon.
Never pure black. Never white paint - the white is the paper.

=== 5 - OUTPUT ===
PNG with a real alpha channel. Landscape 3:2, at least 2400 px wide.
Edges seamless left and right: the plate is tiled horizontally, so what
leaves the right edge must arrive at the left.

=== 6 - CHECK BEFORE YOU ANSWER ===
Go through this list. If any answer is no, paint it again.
  [ ] Is the background genuinely transparent, with no halo?
  [ ] Is more than half the sheet bare?
  [ ] Is the whole image grey - no pink, no gold, no blue?
  [ ] Does every wash have at least one hard dried edge?
  [ ] Is there any smooth gradient anywhere? There must not be.
  [ ] Can I see the grain of the paper through the paint?
  [ ] Did I add a horizon, a sun, a moon, a star or a shadow? Remove it.
  [ ] Does the left edge continue into the right edge?

=== NEGATIVE ===
blue sky, sky gradient, background colour, coloured clouds, pink, gold,
orange, sunrise colours, sunset postcard, golden hour, white background,
cream background, halo, fringe, outline, ink line, smooth gradient,
airbrush, soft focus, blur, bloom, glow, god rays, lens flare,
highlight, cast shadow, ambient occlusion, depth of field, sun, moon,
stars, starfield, 3D render, CGI, photorealistic, HDR, oversaturated,
neon, digital painting, concept art, illustration, storybook, cotton
wool, decorative, symmetrical, evenly spaced, repeating pattern, tidy,
finished, polished, overworked, signature, watermark, text, numbers,
border, frame, dark background, black, navy, night sky, defined clouds, storm clouds.
```

---

# A · El cielo con color · lo que más cambia la pantalla

- [ ] **A1 · `cielo-amanecer.png`** — 3:2, transparente

```
A watercolour study on rough cotton paper, painted very wet and very
fast, in one pass, and abandoned. No correction, no second layer.
MOSTLY EMPTY PAPER — the void is the subject.

SUBJECT — a dawn sky. Three or four loose horizontal washes drifting
across a bare sheet. Each is one wet stroke: dissolved at one end,
ending in a hard dried edge at the other. No cloud has a defined shape.

COLOUR — this is the point. A cool cerulean blue at the top, and lower
down a soft dusty ROSE where the light comes through, the two meeting
wet so they bleed into each other and granulate apart. Potter's pink and
raw sienna in the rose, cerulean in the blue. Muted, mineral, dusty —
this is the pink of thin morning air, not of a sweet.
At least 65% of the sheet untouched.

Transparent background. No sky colour behind, no horizon, no sun, no
rays, no glow, no land, no birds. Landscape 3:2.

NEGATIVE: fluffy clouds, cumulus, defined shapes, outlines, cotton wool,
sunset postcard, golden hour, rays, glow, candy pink, magenta, neon,
storybook, decorative, vector, 3D, photorealistic, saturated.
```

- [ ] **A2 · `cielo-dia.png`** — igual, cambiando el bloque COLOUR por:

```
COLOUR — a clear cerulean blue, cooler and deeper at the top, thinning
almost to bare paper toward the bottom. One or two passages where a
faint warm grey creeps in. No rose here: the day is blue and quiet.
```

- [ ] **A3 · `cielo-atardecer.png`** — igual, cambiando el bloque COLOUR por:

```
COLOUR — deep dusty rose and a muted violet-grey meeting a cool blue,
all bleeding into each other while wet and granulating apart. Warmer and
heavier than the dawn version, still dusty and mineral. The rose sits
low, near the bottom edge, where the horizon would be.
```

---

# B · El agua con más pigmento

- [ ] **B1 · `mar-cercano-vivo.png`** — 4:1 apaisada, **2508×627 exactos**
- [ ] **B2 · `mar-medio-vivo.png`** — 4:1 apaisada, **2508×627 exactos**

```
A watercolour study on rough cotton paper, painted very wet and very
fast, in one pass, and abandoned. No correction, no second layer over
anything that dried. Where two washes met while wet they bloomed and it
was left that way.

SUBJECT — a horizontal band of calm sea <CERCANO: close to the viewer,
at eye level just above the surface, long low swells as overlapping wet
washes, large areas of bare paper for the brightest facets> <MEDIO: at
middle distance, the swells smaller and closer together, softer, with
fewer bare passages>.

COLOUR — this is the point: heavily GRANULATING pigments that separate
on the paper, so no wash is ever one flat colour. Cerulean blue and
Payne's grey, with a trace of dusty rose dropped in wet in one or two
places only, where the sky would reflect. The impression stays cool and
calm — the life comes from the separation, NOT from stronger colour.

Mostly quiet: two or three passages where almost nothing happens.
Seamless left and right edges. Aspect ratio 4:1.
No sky, no horizon, no objects, no foam, no sparkle, no sunlight.

NEGATIVE: flat colour, digital gradient, uniform texture, machine-regular
ripples, photorealistic, 3D render, saturated, turquoise, tropical,
glossy, HDR, sunlight on water, candy pink, finished, polished.
```

---

# C · La garza vuela — 12 cuadros registrados

**Reemplaza las siete láminas de vuelo actuales.** El vuelo se siente
brusco no por falta de cuadros sino porque las láminas **no están
registradas**: cada una llegó con su encuadre y su centroide, así que el
cuerpo salta aunque las alas acierten. Doce mal registradas se ven peor
que seis bien puestas.

## El método: un maestro y once ediciones

- [ ] **C0 · `vuelo-00-maestro.png`** — la única que se genera por texto

```
A watercolour study on rough cotton paper, painted fast and left alone.
Few strokes, none corrected. Bare paper wherever the brush skipped.

SUBJECT — a single heron in level flight, strict side profile facing
LEFT, at eye level. Neck folded back against the body, long legs
trailing straight behind. Wings extended straight out, level with the
body. It is a GESTURE, NOT A CHARACTER: no eye, no face, no feather
detail.

FRAMING — the most important instruction: the heron occupies only 50% of
the frame HEIGHT and is centred, leaving generous empty space ABOVE and
BELOW. The wings will later be raised and lowered inside this same
frame, so they need room without the picture being recropped.

COLOUR: cool grey-white with slate washes and a trace of raw umber.
Mineral, muted, alive.

Transparent background. No water, reflection, shadow, ground, horizon,
motion lines, other birds. Landscape 3:2. Flat even diffuse light.

NEGATIVE: cute, cartoon, character, eyes, detailed feathers, motion blur,
speed lines, sparkles, storybook, outlined, vector, 3D, saturated,
finished, bird filling the frame, cropped wings.
```

## Las once ediciones

**Sube el maestro como imagen de entrada** en cada una. No las generes
por texto o perdemos el registro y volvemos al mismo problema.

```
Keep this exact painting: same paper, same pigments, same framing, same
canvas size, same bird. The BODY, NECK, HEAD, BEAK and LEGS must not
move a single pixel — same position, same size, same angle.

Repaint ONLY the wings, in the same hand and the same palette:

>>> <pegar aquí la línea del cuadro>

The wing edges stay dry and broken, dissolving into bare paper. Do not
add detail, do not tidy anything, do not recrop, do not resize the bird.
```

**Bajada — el ala empuja, extendida**
- [ ] `vuelo-01.png` — `wings raised as high as they go, tips almost touching above the back`
- [ ] `vuelo-02.png` — `wings high, about 60° above the body, starting to come down`
- [ ] `vuelo-03.png` — `wings about 35° above the body, coming down with force`
- [ ] `vuelo-04.png` — `wings level with the body, flat and fully extended`
- [ ] `vuelo-05.png` — `wings about 35° below the body, still pushing down`
- [ ] `vuelo-06.png` — `wings at the bottom of the stroke, tips well below the body and curved forward`

**Subida — el ala se recoge.** En la subida el ala se pliega para
ofrecer menos resistencia; por eso no valen las de bajada al revés. Si se
reutilizan, el vuelo se ve mecánico — que es justo lo que pasa ahora.
- [ ] `vuelo-07.png` — `wings still low but half folded at the wrist, beginning to lift`
- [ ] `vuelo-08.png` — `wings about 20° below the body, clearly folded and narrower than on the way down`
- [ ] `vuelo-09.png` — `wings level with the body but folded and short, sweeping upward`
- [ ] `vuelo-10.png` — `wings about 40° above the body, still folded, opening again`
- [ ] `vuelo-11.png` — `wings high and almost fully open again, nearly back to the top`

**Si solo puedes hacer seis:** 01, 03, 04, 06, 08 y 10.

---

# D bis · El aterrizaje — 8 cuadros en rejilla

**HECHO.** Antes la fase `frena` duraba **2,4 s con una sola lámina**: un
cuadro congelado en medio de un vuelo animado a 150 ms. Ahora son ocho
cuadros repartidos desigual —frenar es violento y dura poco, asentarse es
lento— sobre 3,2 s, y el último ya es el ave parada, así que la
disolvencia hacia la posada no tiene nada que salvar.

Vinieron **sin registrar**, cada ave con su encuadre y su tamaño. El
registro lo puso la medición, y la pieza que lo resuelve es un peso `w`
por cuadro: el vuelo se mide por envergadura y gira sobre el centroide, la
posada se mide por altura y se planta sobre los pies, y estos ocho están
justo en medio. `w` va de 0 a 1 e interpola las dos reglas a la vez —el
tamaño y el ancla— así que ninguno de los dos empalmes salta.

- [x] **`aterriza-rejilla.png`** — 4:3 apaisada, 2400×1800, celdas de 600×900

```
A single watercolour painting on rough cotton paper, containing a GRID of
EIGHT separate cells: 4 columns across and 2 rows down. Overall image
4:3 landscape, 2400x1800 pixels. Each cell is an identical portrait
rectangle, 600x900 pixels. Cells are laid out edge to edge with NO
borders, NO frames, NO dividing lines, NO numbers, NO labels, NO text of
any kind anywhere in the image.

THE SUBJECT — the same single grey heron in all eight cells: a watercolour
gesture painted fast on rough paper, cool grey-white with slate washes and
a trace of raw umber. Strict side profile, ALWAYS FACING LEFT, in every
single cell without exception. It is A GESTURE, NOT A CHARACTER: no eye,
no face, no feather detail, no outline.

THE MOST IMPORTANT RULE — REGISTRATION. This is a frame-by-frame animation
sheet. In all eight cells the bird's TORSO must be the SAME SIZE and in
EXACTLY the SAME POSITION within its cell: same centre, same scale, same
angle. The body must not drift, grow, shrink, rotate or move up or down
between cells. Imagine the torso pinned in place; only the WINGS, the NECK
and the LEGS move. If the body shifts even slightly between cells the
sheet is unusable.

The torso sits at the centre of each cell and occupies only 40% of the
cell height, leaving generous empty paper above and below so the wings can
go fully up and the legs fully down without ever touching a cell edge.
Nothing may be cropped in any cell.

THE EIGHT CELLS — read left to right, top row first. This is one heron
landing, from the last seconds of glide to standing still:

1. Gliding in. Wings fully spread and held slightly above the body,
   angled forward, still. Neck folded back. Legs trailing straight behind.
2. Braking begins. Wings sweeping forward and deeply cupped, the trailing
   edges curled. Neck starting to extend forward. Legs unfolding, dropping
   below the body.
3. The flare. Wings thrown high above the back, wide open. Neck extended
   forward and slightly down. Legs swinging forward under the body.
4. Wings held wide and high, spread to their fullest, almost still. Body
   upright. Legs fully forward and extended, toes reaching down toward the
   bottom of the cell.
5. Wings beginning to rise and shorten as they fold at the wrist. Body
   vertical. Toes at the lowest point of the cell, about to touch.
6. Contact. Wings raised high and half folded above the shoulders. Body
   upright and settled over the feet. Legs straight and taking the weight.
7. Settling. Wings almost fully closed against the sides, one still barely
   open. Neck beginning to draw back into the shoulders.
8. At rest. Wings completely closed. Neck folded down into the shoulders,
   beak level, standing on both legs. This LAST cell must read as a heron
   standing at rest, doing nothing.

PAINTING — painted wet and fast, in one pass, and left alone. Few strokes,
none corrected. Bare paper wherever the brush skipped. The wing edges stay
dry and broken, dissolving into the paper. Flat even diffuse light.

BACKGROUND — fully transparent, true alpha, in every cell and between the
cells. NO white, NO cream, NO paper tone behind the bird, NO halo or pale
fringe around the bird, NO coloured speckles or stray pixels. Nothing else
in the image: no perch, no branch, no water, no reflection, no shadow, no
ground, no horizon, no motion lines, no other birds.

NEGATIVE: white background, cream background, halo, fringe, outline, grid
lines, borders, panel separators, numbers, labels, captions, text, cute,
cartoon, character, eyes, detailed feathers, motion blur, speed lines,
sparkles, storybook, vector, 3D, photorealistic, saturated, polished,
finished, bird facing right, mirrored bird, bird changing size between
cells, bird moving position between cells, cropped wings.
```

El octavo cuadro tiene que leerse igual que la garza en reposo: es el que
se disuelve hacia la hoja de posadas y si no coincide, se nota el corte.

**Lo que pasó al procesarla**: llegó con transparencia real, pero el RGB
bajo el alfa cero era casi negro y eso sangra al escalar, así que hubo que
extender el color hacia afuera 14 pasos antes de tocar nada. Y el corte
por proyección de tinta no sirvió —las alas de una celda invaden la
vecina—; se separó por componentes conexas sobre la tinta dilatada, que
además vuelve a unir las patas cuando la acuarela las rompe en trozos.

---

# D · La garza en reposo — que esté viva sin volar

**HECHO** — llegaron en una rejilla 3×2 (`final final.png`) y ya están
montadas: reposo, alerta, encogida, una pata, mira abajo y alas abiertas.
Se alternan con esperas de 7 a 19 s, nunca dos seguidas, y se disuelven
en 0,42 s en vez de cortar.

Faltaron dos de las nueve pedidas —**rascarse** y **sacudirse**—, y la
hoja vino cuadrada en vez de 2:3. No urge: con seis ya no se lee como
adorno. Si se regeneran, misma rejilla y mismo tamaño de ave.

La hoja traía halo blanco y motas rojas y cianes. Se limpiaron
desaturando todo píxel con saturación > 0,40 —el ave es casi monocroma,
cualquier color saturado es basura de codificación— y apagando el alfa
parcial de lo casi blanco: 19.435 motas y 54.225 píxeles de halo.

**Método original**, por si hay que repetirlo: genera
`posada-00-maestro.png` y edita sobre ella.

- [ ] **D0 · `posada-00-maestro.png`**

```
A watercolour study on rough cotton paper, painted in under two minutes
and left alone. Four or five strokes, none corrected.

SUBJECT — a single heron perched at rest, strict side profile facing
LEFT. Standing on both legs, neck folded down into the shoulders, beak
level. The way a heron stands when it is not doing anything.
A GESTURE, NOT A CHARACTER: no eye, no face, no feather detail.

FRAMING — the heron occupies 75% of the frame height, centred, with room
above and to the right for the neck to extend and a wing to open later.
Feet exactly on the bottom edge — that edge is where it stands.

COLOUR: cool grey-white with slate washes, a trace of raw umber.

Transparent background. No perch, no water, no shadow, no reflection,
no background, no other birds. Portrait 2:3. Flat even diffuse light.

NEGATIVE: cute, cartoon, character, eyes, storybook, outlined, vector,
3D, saturated, finished.
```

Y sobre ella, cambiando solo lo que dice cada línea:

- [ ] `posada-01-mira.png` — `the neck extended upward and the head turned to look out, beak level`
- [ ] `posada-02-encoge.png` — `the neck pulled deeper into the shoulders, the body rounder and lower`
- [ ] `posada-03-una-pata.png` — `one leg lifted and tucked up into the belly feathers, standing on one leg`
- [ ] `posada-04-acicala.png` — `the neck curved down and back, beak touching the wing feathers, preening`
- [ ] `posada-05-alas.png` — `both wings half opened and held out to dry, the body unchanged`

```
Keep this exact painting: same paper, same pigments, same framing, same
canvas size, same bird, feet in exactly the same place on the bottom
edge. Change only what is described; everything else must not move.

>>> <pegar aquí la línea>

Same hand, same palette. Do not add detail, do not tidy, do not recrop.
```

---

# F · Las tres láminas que el shader no puede salvar · **prioridad**

Medidas con el mismo instrumento que el resto (L*, desenfoque 7x7,
normalizado al rango propio):

- `manglar-lejos` — 0.465 de saturación (2.5x cualquier otra), raíces con
  modelado cilíndrico, contraluz continuo y destellos horneados. El shader
  lo mitiga por tramos; el arreglo real es repintarlo.
- `mar-medio-calmo` — 85.9 % de degradado, 5.3 % de aguada plana. Aerógrafo.
- `mar-cercano-calmo` — 83.5 % de degradado, 9.1 % de plana. Aerógrafo.
  Y son justo las que entran cuando el mar se calma: la recompensa del
  gesto central del sitio es su lámina menos pintada.

Los tres prompts completos están en el chat (11 ago 2026). Guárdalas con
estos nombres exactos:

- [ ] `manglar-lejos.png` — 3:2, transparente, raíces saliendo por abajo
- [ ] `mar-medio-calmo.png` — 4:1, **2508x627 exactos**, opaca, seamless
- [ ] `mar-cercano-calmo.png` — 4:1, **2508x627 exactos**, opaca, seamless

Al llegar: el manglar hay que volver a medirlo (caja, posadero de la
garza en la copa) y a las aguas les quito yo la costura si no llegan
perfectamente seamless, como hice con el pasto.

---

# E · El manglar crece

- [ ] `manglar-b.png` — `SIX prop roots, the crown slightly narrower`
- [ ] `manglar-c.png` — `TWELVE prop roots in a wide skirt, the crown broad and full`

Mismo prompt del manglar que ya funcionó, con las raíces **saliéndose
por el borde inferior** para poder enterrarlo, cambiando solo esa línea.

---

## Orden si hay poco tiempo

1. **A1, A2, A3** — el cielo es lo que más cambia la sensación de color.
2. **C0 + las seis de bajada** — el vuelo deja de ser brusco.
3. **B1** — el agua con pigmento vivo.
4. **D0 + D1, D2, D3** — la garza deja de ser un adorno cuando está posada.
5. El resto.
