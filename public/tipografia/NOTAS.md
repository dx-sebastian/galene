# Galene — la tipografía

Un palo seco humanista, un solo peso, 125 glifos. Latín completo para
español (con tildes, ñ, ¿ ¡, « »), cifras de ancho fijo, y el griego
justo para escribir **γαλήνη**.

## La regla que manda

**Que no se note.** Nadie que entre a este sitio debería poder señalar
la letra. Un titular con personalidad —remates que se ensanchan, cortes
con sesgo, terminales con gracia— habría sido más lucido y habría hecho
exactamente lo que el proyecto lleva cinco iteraciones esquivando:
estetizar en vez de equipar. La empatía acá es no actuar. El mundo no
habla; el mundo muestra.

Todo lo que quedó dentro está por una razón que se puede medir, no por
gusto.

## Las decisiones, y por qué

Quien lee esto puede estar con la vista borrosa, con midriasis, en la
oscuridad, llorando, a las cuatro de la mañana, en un teléfono con la
pantalla rota. Ese es el usuario de referencia, no un jurado.

| Decisión | Qué resuelve |
|---|---|
| **Aberturas amplias** en c e a s f r t | Bajo desenfoque, las aberturas estrechas se cierran: `c`→`o`, `e`→`o`, `a`→`o`. Es el error de lectura más caro que puede tener un texto de instrucciones. |
| **Contraste casi nulo** (asta 84, horizontal 74 — apenas la corrección óptica) | El trazo fino es lo primero que desaparece al desenfocar. Sin finos no hay letra rota. |
| **Altura de x muy alta** (520 sobre 1000; 74% de la mayúscula) | Casi todo lo que se lee en un teléfono pasa entre la línea base y la de x. Subirla es subir el tamaño aparente sin subir el tamaño real. |
| **`l` con cola** | `Il1` tienen que ser tres cosas distintas. Con la ele recta, `l` e `I` son el mismo dibujo. |
| **`a` de dos pisos, nunca de uno** | La `a` de un piso colapsa hacia `o` al desenfocar. |
| **Tildes y eñe gruesas y altas** | En español la tilde es información, no adorno: `sé`≠`se`, `años`≠`anos`, `sí`≠`si`, `niña`≠`nina`. Se dibujaron para sobrevivir al desenfoque, no para verse finas. |
| **Cifras de ancho fijo** (552 todas) | Las horas y los contadores del sitio (`5:47`, `340 raíces`) no bailan al actualizarse. |
| **Un solo peso** | No hay negrita que sintetizar. El CSS lleva `font-synthesis: none`: engordar el contorno cierra las aberturas, que es justo lo que no puede pasar. El énfasis se hace con espaciado y jerarquía. |

## La prueba que manda

`hoja-3-borroso.png`: el mismo texto con 3 px de desenfoque gaussiano.
Si ahí `sé` se lee `se`, o `c` se lee `o`, la fuente no sirve para este
sitio por muy bonita que esté en limpio. Hoy pasa.

Las otras hojas: `hoja-1-glifos` (repertorio), `hoja-2-frases` (texto
real del sitio), `hoja-4-negativo` (tinta clara sobre oscura, que es
como se ve el sitio de noche), `hoja-5-escalera` (de 18 a 120 px).

## Cómo se construye

```bash
python construir.py            # .ttf + .woff2 + las cinco hojas
python construir.py --rapido   # solo los archivos de fuente
```

- `trazo.py` — métrica y primitivas (trazos, óvalos, anillos, cortes,
  engrosador de esqueleto).
- `glifos.py` — un glifo por función. Se dibuja como
  `union(sólidos) − union(contras)`.
- `construir.py` — compila a TrueType y WOFF2, con kerning manual de
  los pares que importan.
- `revelar.py` — rasteriza las hojas con FreeType **desde el .ttf ya
  compilado**, no desde los contornos en memoria: lo que se mira es lo
  que va a ver alguien en un teléfono.

Hay una auditoría de un renglón que conviene correr después de tocar
cualquier glifo — busca astillas (contornos diminutos que quedan cuando
dos piezas se tocan en vez de solaparse):

```bash
python -c "import glifos; print([n for n,(f,u) in glifos.GLYPHS.items() if any(abs(c.area)<1800 for c in f().path().contours)])"
```

Debe imprimir `[]`.

### Dos trampas que costaron caro, para no repetirlas

1. **El `lsb` de `hmtx` tiene que coincidir con el `xMin` del contorno.**
   Si no, fontTools desplaza el glifo por la diferencia cada vez que lo
   redibuja (por ejemplo al quitar solapes) y la letra sale movida y
   rota.
2. **Las booleanas de skia respetan el sentido de giro de cada pieza.**
   Un rectángulo dibujado al revés se comporta como agujero y se
   *anula* contra el óvalo con el que se solapa. Por eso `limpia()`
   redondea a entero y vuelve a unir cada pieza consigo misma antes de
   operarla. Y por eso las piezas **se solapan, nunca se tocan**: dos
   bordes exactamente encima no son una unión, son un pellizco.

## Lo que falta

- **Un segundo peso (Medium).** Hoy el énfasis se resuelve con
  espaciado. Los parámetros están centralizados en `trazo.py`
  (`STEM`, `STEMC`, `THIN`, `THINC`), así que es viable.
- **Cursiva.** No hace falta para el texto que hay.
- **Más kerning.** Están los pares obvios; falta pasar texto real.
- **El nombre.** «Galene» está tomado del proyecto; si la fuente sale
  del sitio, conviene verificar que no colisione.
- **Licencia.** Los archivos no declaran una. Si se va a publicar,
  decidir (OFL es lo habitual) antes de subirla.
