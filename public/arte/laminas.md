# Galene — las láminas

Principio de toda la producción de arte:

> **No se simula agua. Se deforma una acuarela de agua.**

Nano Banana Pro pinta las láminas. WebGL las compone, las desplaza con
un mapa de flujo, las gradúa por la hora real y les multiplica el papel
encima. Así la pintura se conserva —los *dabs*, los bordes, la reserva
del blanco— y aun así se mueve y responde a `calma`.

## Reparto de herramientas

| Herramienta | Sí | No |
|---|---|---|
| **Nano Banana Pro** | Todas las láminas de este documento. Acá se define el estilo. | Nada que tenga que reaccionar. |
| **VEO 3.1** | El video de prensa y el *submission film* de Awwwards. Referencia de movimiento de las garzas para luego animar por poses. | **El hero.** Un video no reacciona a `calma` ni a la hora, y dos capas de 1080p se midieron en 151–212 ms/cuadro. Además VEO no sabe escribir: pedirle que *evite* texto produce glifos falsos. Todo el texto va en el DOM. |
| **Fable 5 / GPT 5.6** | Variantes de copy, segunda opinión sobre el shader. | Decidir arte. |

---

## La ley madre

> **No queremos una ilustración en acuarela. Queremos una obra digital
> que se comporta como acuarela.**

La acuarela no es infantil por naturaleza: se vuelve infantil cuando la
dirección de arte la empuja a ilustración de cuento. Las cinco reglas que
lo impiden, y que gobiernan **todos** los prompts de este documento:

1. **Nada de *watercolor cute*.** Ni aves redonditas con ojos, ni flores
   decorativas, ni nubes bonitas, ni ramas ornamentales, ni estética de
   papelería. Las aves son **gestos de pincel, no personajes**.
2. **Editorial, no ilustrativa.** Manchas grandes, pigmento irregular,
   bordes húmedos, zonas sin pintar, papel visible, detalles incompletos.
   Menos *dibujo coloreado*, más *pintura que respira*.
3. **Saturación mínima.** Pigmento mineral, no caja de colores. Azul
   grisáceo, piedra cálida, luz pálida. Nada de verdes, rosas y amarillos.
4. **La animación conserva la física del medio.** Nada de partículas
   brillantes ni efectos mágicos: el pigmento se extiende, se diluye, se
   suaviza. Una pincelada húmeda calmando a otra pincelada.
5. **La interfaz es radicalmente adulta.** Tipografía editorial fuerte,
   mucho espacio, navegación precisa, microinteracciones impecables. Nada
   de manuscrita, botones redondos ni ornamentos.

El contraste que buscamos: **arte orgánico + interfaz extremadamente
precisa.** La acuarela representa el mundo; la interfaz representa
claridad. Es la misma regla que ya teníamos —la imperfección vive en el
mundo, el instrumento es exacto— dicha desde el lado del arte.

Y el objetivo formal para Galene: papel de algodón visible · el mar
construido con 3–5 lavados grandes · horizonte casi desaparecido · aves
de 2–4 pinceladas · arquitectura sugerida, no delineada · la luz como
papel sin pintar · muy pocos colores · nada completamente terminado ·
movimientos lentos de pigmento · mucho vacío.

**El riesgo real no es la acuarela: es terminar haciendo una postal
bonita del Mediterráneo.** Lo que lo impide es que el mundo tenga una
ley: **cuando las aves aparecen, el mar cambia.** Eso convierte una
acuarela bonita en una identidad.

---

## La ley del arte

> **No buscamos imperfección. Buscamos evidencia de proceso.**

Pedir "que se vea imperfecto" devuelve un filtro de suciedad. Lo que no
se puede falsificar es el **rastro de cómo se hizo**: el grafito que la
aguada no tapó, el lavado que se pasó del dibujo, la prueba de color en
el margen. Una imagen generada *esconde* su proceso — es su naturaleza.
Un cuadro que enseña el suyo no se confunde con una.

Ese es el eje de toda la dirección de arte, y es lo que hace que esto sea
**propio** y no "una web bonita con acuarela".

### El límite, y no se cruza

**La imperfección vive en el mundo. El instrumento es exacto.**

Grafito, bordes desiguales, charcos y salpicaduras pertenecen al plano 0
—el mar—. El reloj, el teléfono, el botón de salir, las rutas: tipografía
plana, alineación exacta, cero temblor. Un botón de ayuda dibujado a mano
tembloroso lee como poco serio, y a las 4 a.m. eso es abandono.

### Imperfecciones prohibidas

Ninguna que pueda leerse como daño o como la escena:

- **Nada de cercos de vaso.** Una mancha circular de taza sobre el papel
  es, literalmente, la marca de un vaso. Es la imperfección más "encantadora"
  que se le ocurre a cualquiera y en este sitio es una catástrofe.
- **Nada de papel roto, quemado, arrugado con violencia ni manchado**
  como si se hubiera derramado algo encima.
- **Nada de goteos verticales oscuros.** Leen como algo cayendo.
- Ondulación del papel sí; destrucción del papel no.

---

## Contrato de estilo — pegar al inicio de CADA prompt

```
A flatbed scan of an original watercolour study on rough cold-press 300gsm
paper. Traditional media only, hand-painted, loose and slightly unfinished.

THE HAND MUST BE VISIBLE — evidence of process, not decoration:
· GRAPHITE UNDERDRAWING still showing: light pencil construction lines
  that the wash did not cover, left unerased. In one or two places the
  wash overshoots the pencil line; in another it stops short of it.
· A POOLED BEAD of darker pigment along one edge, where the board was
  tilted and the wash ran and dried.
· BACKRUNS: two or three cauliflower-edged blooms where a wet wash flooded
  a damp one. Accidents the painter chose to keep.
· A LIFTED PASSAGE: one pale ghost where pigment was blotted out with
  tissue and not repainted.
· A FEW FLICKED DROPLETS that landed where they were not wanted.
· GRANULATION: cerulean blue, Payne's grey and raw umber settling visibly
  into the valleys of the paper grain.
· DRY BRUSH: passages where the brush skipped and left bare tooth.
· Every pooled mark is DARKER AT ITS RIM than at its centre.
· The paper is faintly cockled from the water.

Reserved whites: every highlight is UNPAINTED PAPER, never white paint.

PALETTE: desaturated, near-monochrome. Muted slate-cyan and cool grey.
Colour is an event, not decoration.

LIGHT: flat, even, diffuse overcast. No sun, no moon, no visible light
source, no cast shadows, no directional highlights, no glow, no vignette.
(The hour and the light source are added in engine; baked light fights it.)

VIEW: straight on, at eye level just above the water.

NO: text, letters, signature, watermark, frame, people, boats, buildings,
islands, land, cup rings, stains, tears, vertical drips, dark spatter.
```

**Por qué funciona:** cada viñeta nombra un *accidente físico con nombre
propio*, no un adjetivo. "Imperfecto" no significa nada para el modelo;
"backrun", "lifted passage" y "graphite underdrawing" sí.

**Por qué la luz plana:** el motor pone el sol o la luna con posición,
elevación e intensidad reales, y gradúa la lámina hacia las cuatro horas
ancla. Si la lámina trae un sol pintado, hay dos soles a las 3 a.m.

**Pintar a los valores de las 09:00** (el ancla de luminancia media):
cielo `#BFD4DC` → `#DCE7E8`, agua `#4E8A94`, altas `#7FB4B8`,
bruma `#CDDCDE`. Desde ahí el motor llega a cualquier hora.

---

## Las láminas

Todas en **PNG**. Las que van sobre el agua, con **transparencia** y
**recortadas a ras de la línea de agua**, con el punto de anclaje
documentado (el código ancla por la base).

| # | Nombre | Tamaño | Alfa | Tileable en X | Reemplaza en |
|---|---|---|---|---|---|
| 01 | `cielo-lavado` | 2048×1024 | sí | **sí** | `mar.js` ← LÁMINA 01 |
| 02 | `nubes` | 2048×768 | sí | **sí** | `mar.js` ← LÁMINA 02 |
| 03 | `mar-lejano` | 2048×256 | no | **sí** | `mar.js` ← LÁMINA 03 |
| 04 | `mar-medio` | 2048×512 | no | **sí** | `mar.js` ← LÁMINA 04 |
| 05 | `mar-cercano` | 2048×768 | no | **sí** | `mar.js` ← LÁMINA 05 |
| 06 | `manglar-arco` ×3 | 1024×1024 | sí | no | `mar.js` ← LÁMINA 06 |
| 07 | `papel` | 1024×1024 | no (gris) | **sí y en Y** | `mar.js` ← LÁMINA 07 |
| 08 | `garza-<pose>` ×7 | 512×768 | sí | no | `main.js` · `SILUETA` |
| 09 | `propagulo` ×4 | 256×256 | sí | no | fase de participación |
| 10 | `franja-herramientas` | 2400×400 | no | no | `estilos.css` `.herramientas` |
| 11 | `grafito` | 2048×1152 | sí | no | capa nueva, fija al plano del cuadro |
| 12 | `cinta` | 2048×1152 | sí | no | capa nueva, fija a la pantalla |

Además, por cada banda de agua hace falta su par calmo —
`mar-cercano-calmo`, `mar-medio-calmo` — registrado con el original
(**generar en modo edición sobre la lámina existente**, nunca por texto
aparte, o la mezcla se ve como una disolvencia). `calma` los cruza.

**Tiling:** Nano Banana no garantiza costuras perfectas. Mitigación ya
prevista: las bandas de agua se muestrean con **repetición espejada**,
así que una costura visible se vuelve simetría en vez de corte. Aun así,
pedir bordes izquierdo y derecho compatibles.

---

### 03 · 04 · 05 — las bandas de mar

Son tres profundidades del mismo mar. La diferencia es la **escala de la
onda**, no el color: lejos onda pequeña y apretada, cerca onda grande y
abierta. Es lo que produce el paralaje.

**03 · mar-lejano**
```
[CONTRATO DE ESTILO]

A narrow horizontal band of calm open sea seen from very far away,
compressed by perspective. The wave texture is extremely fine and dense —
hundreds of tiny horizontal ticks of slightly darker pigment, closer
together toward the top edge of the band. Colour washes toward pale haze
at the top edge (aerial perspective) and toward muted slate-cyan at the
bottom. No individual wave is readable. No foam. No horizon line in the
image — the band is water only.
Seamless left and right edges. Aspect ratio 8:1.
```

**04 · mar-medio**
```
[CONTRATO DE ESTILO]

A horizontal band of calm open sea at middle distance. Long low swells,
soft and wide, painted as overlapping horizontal washes with darker
drying rims where each swell ends. Wave scale roughly four times larger
than a far-distance band. A few reserved-white slivers of unpainted paper
where the swell catches light. Muted slate-cyan, desaturated.
Seamless left and right edges. Aspect ratio 4:1.
```

**05 · mar-cercano**
```
[CONTRATO DE ESTILO]

A horizontal band of calm sea very close to the viewer, at eye level just
above the surface. Large open low swells, generous wet-in-wet blooms, with
strong dark drying rims. Individual dabs are clearly readable. Areas of
unpainted paper for the brightest facets. Darker and slightly deeper in
value than a mid-distance band. Muted slate-cyan.
Seamless left and right edges. Aspect ratio 8:3.
```

---

### 06 — el arco del manglar

La silueta que dice *manglar* y nada más. **No es una rama y no es un
árbol.** Es la **raíz zancuda del mangle rojo**: arcos que salen del
tronco por encima del agua y se clavan en ella.

Discreto: **no protagoniza.** Y sin nido — nido significa huevos, y
huevos a dos clics de anticoncepción de emergencia es una colisión que
no se puede explicar.

```
[CONTRATO DE ESTILO]

The prop roots of a single red mangrove, painted alone against nothing.
Two or three slender arching roots rise out of the water, curve over, and
plunge back into the water — the characteristic stilt-root arch. Bare
wood, dark warm sepia and cool grey-brown, thin and wiry, not massive.
A short stub of trunk and a very few small dark leaves at the top; the
foliage is minimal and must not read as a tree crown.

Cropped exactly at the waterline: nothing below it. No island, no soil,
no bank, no rocks, no other plants, no birds, no nest, no eggs.
Transparent background. The whole cluster occupies about 60% of the
frame width, centred, with clear space around it.
```

Generar **3 variantes** (`manglar-arco-a/b/c`) con radios y cantidad de
arcos distintos: el manglar crece a saltos, un arco nuevo cada N
propágulos arraigados.

El **reflejo no se pinta.** Lo genera el motor volteando esta misma
lámina y rompiéndola por tajos: a `calma` baja el reflejo está partido,
a `calma` alta el arco y su reflejo casi cierran un anillo, nunca del
todo. Ahí vive el argumento de Muñoz, y es una línea de shader.

---

### 08 — las garzas

Ave calmada, no picoteadora. **Sin clavados**: un picotazo que sale con
un pez es depredación, y no hay violencia en cuadro.

Reglas que no se negocian, porque la garza ocupa el lugar de las personas
y cada estado que tenga es una afirmación sobre ellas:

- **Nunca en apuros.** Ni ala caída, ni mojada luchando, ni pichón.
- **Nunca una sola en cuadro** (eso lo garantiza el código: mínimo alto).
- **El sitio nunca afirma quiénes son.**

Siete poses, cada una su archivo, todas de **perfil**, mirando a la
izquierda (el motor las voltea):

`quieta` · `una-pata` · `acicalandose` · `alas-secandose` ·
`llegando` (alas abiertas frenando) · `despegando` · `dormida`
(cabeza metida entre las plumas)

```
[CONTRATO DE ESTILO]

A single heron in strict side profile, facing left, painted alone.
Pose: <POSE>.
Long neck, long dagger beak, long thin legs. Cool grey-white plumage with
soft slate washes; the body is a few confident wet washes, not feather
detail. Legs and beak as thin dark dry-brush strokes.

Standing in extremely shallow water: the legs are cropped exactly at the
waterline, nothing below it. No reflection, no water, no background,
no other birds, no fish, no nest.
Transparent background. The bird occupies about 70% of the frame height,
its feet on the bottom edge of the canvas (that edge is the anchor).
```

Anclaje: **el borde inferior de la lámina = la línea de agua.** El
código ya planta por la base; si el recorte cambia, las garzas flotan.

---

### 07 — el papel

```
[CONTRATO DE ESTILO — omitir la línea de paleta]

A flat scan of blank rough cold-press watercolour paper. Nothing painted
on it. Even, neutral, greyscale. Visible tooth and fibre. No stains, no
marks, no edges, no deckle, no shadows, no vignette.
Seamless and tileable on all four sides.
```

Va **fijo a la pantalla**, no al paralaje. Si el grano se moviera con el
mundo sería textura de un objeto; quieto, es la superficie del cuadro. Es
lo que hace que lea *pintado* y no *fotografiado*.

---

### 10 — la franja de herramientas

El link que la gente comparte es la herramienta, no el home: la mayoría
de las primeras visitas caen en una página **sin nada animado**. Esta
franja mantiene la marca ahí con cero JS.

```
[CONTRATO DE ESTILO]

A wide, shallow horizontal band of calm sea, very quiet, fading to the
palest possible wash at the bottom edge so it can dissolve into a white
page. Almost nothing happening: two or three long soft swells. No horizon,
no sky, no objects. Aspect ratio 6:1.
```

---

### 11 — el grafito

**Es la lámina más importante del proyecto y no existe en ninguna otra
web.** Es el dibujo previo a lápiz: lo que el pintor trazó antes de mojar
el papel.

```
[CONTRATO DE ESTILO — omitir la línea de paleta y la de accidentes]

A flatbed scan of bare rough watercolour paper with only a GRAPHITE
UNDERDRAWING on it. No paint at all, no colour, no wash.

Light 2B pencil construction lines for a seascape that was never painted:
a single long horizon line drawn slightly unevenly and not quite level;
two or three loose contour lines for the arching prop roots of a mangrove;
a few short ticks marking where swells would go; one line drawn twice
because the first attempt was wrong, and not erased.

Faint eraser smudges. One small pencil note and two tiny colour-test
swatches in the margin, as a painter leaves when testing a mix.

The lines are light, broken and hesitant in places, confident in others.
Transparent background: only the graphite, no paper, no white.
```

**Cómo se usa, y acá está lo que nadie más puede hacer:** el grafito va
en su propia capa, **fija al plano del cuadro**, mientras las capas de
agua se desplazan por debajo y por encima. El resultado es que **la
pintura se corre de su propio dibujo y vuelve.** Ninguna fotografía y
ningún video generado puede producir eso: es la firma de que esto está
pintado *y* programado. Cuesta un `sampler2D` más y cero rendimiento.

### 12 — la cinta

El margen de cinta de enmascarar con que se fija el papel a la mesa.

```
[CONTRATO DE ESTILO — omitir paleta, accidentes y luz]

A flatbed scan of four strips of beige masking tape forming a rectangular
border, as used to fix a sheet of watercolour paper to a drawing board.
The strips are slightly crooked, do not meet perfectly at the corners, and
one corner has lifted a little. Small nicks and fibres along the edges.
Faint pencil marks on the tape. Nothing inside the rectangle: transparent.
```

Va **fija a la pantalla**, nunca se anima, nunca participa de ninguna
transición. Convierte el sitio en *una lámina clavada a una mesa* — y de
paso resuelve el riesgo de "app de meditación": un estudio pegado con
cinta es un objeto de taller, no de spa.

---

## Cómo se cambia una lámina por su procedural

En `js/mar.js`, cada capa procedural está marcada con `← LÁMINA NN`.
El reemplazo es, por capa:

1. Cargar la textura y pasarla como `sampler2D`.
2. Sustituir la llamada a `lavado(...)` de esa capa por
   `texture(u_lamina, uvDesplazado)`.
3. **No tocar el desplazamiento.** El `duv` que ya está calculado es lo
   que hace que la pintura se mueva: la lámina se muestrea desplazada,
   no se deforma la geometría.
4. **No tocar el papel.** Va siempre al final y en espacio de pantalla.

El orden de composición y las bandas de profundidad ya están medidos
para recibirlas: el `prof` de cada franja, la perspectiva aérea y el
anclaje por la base no cambian.

---

## Lo que la sonda de píxeles ya cazó, y que las láminas deben respetar

Estas tres las midió `?dev=1&hora=…` sobre los píxeles pintados. Si una
lámina las rompe, se cae la lámina, no la ley:

1. **El agua siempre más oscura que la bruma del cielo.** Con la bruma
   pareja a los dos lados, el salto del horizonte caía a 0.0024 (umbral
   ~0.023) y **la línea del horizonte desaparecía**. El agua lejana se
   lava hacia la bruma, pero por debajo de ella.
2. **Nada de motas claras en el cielo.** La reserva del blanco vive
   **solo en el agua**: una mota de luminancia 0.96 detrás del lockup
   tumbaba el peor contraste a 3.13:1. El cielo es la banda de texto.
3. **El crepúsculo necesita el degradado comprimido.** En el peor
   instante (18:06) ninguna tinta llega sola a 4.5:1. Se resuelve
   comprimiendo el cielo hacia su medio + un lavado detrás del texto.
   Medido después: 5.24:1.

---

## Pendientes de arte

- [ ] **Tipografía.** Sin definir; hoy usa la del sistema. Necesita una
      elección deliberada. Es lo único del hero que todavía se ve
      genérico, y es lo primero que mira un jurado.
- [ ] Las 10 láminas.
- [ ] Propágulos: definir las 4 formas y el rango de color que puede
      elegir la gente (acotado, o el mar se vuelve confeti).
