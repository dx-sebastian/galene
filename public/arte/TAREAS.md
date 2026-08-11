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

# D · La garza en reposo — que esté viva sin volar

Pasa la mayor parte del tiempo posada. Ahora solo se balancea, y por eso
se siente un adorno. Con estas cinco tiene vida propia: se alternan
despacio, con pausas largas y nunca dos seguidas.

**Mismo método**: genera `posada-00-maestro.png` y edita sobre ella.

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
