# -*- coding: utf-8 -*-
"""
Hojas de prueba rasterizadas con FreeType desde el .ttf compilado.

La prueba que manda es la tercera: el texto desenfocado. Si con 3 px
de desenfoque la c se vuelve o, la fuente no sirve para este sitio.
"""

import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

AQUI = os.path.dirname(os.path.abspath(__file__))
TINTA = (28, 42, 48)
PAPEL = (243, 245, 244)
GUIA = (196, 112, 63)


def _lienzo(w, h, fondo=PAPEL):
    im = Image.new("RGB", (w, h), fondo)
    return im, ImageDraw.Draw(im)


def rejilla(ttf, salida, texto, px=150, cols=13, fondo=PAPEL, tinta=TINTA):
    f = ImageFont.truetype(ttf, px)
    celda_w, celda_h = int(px * 1.05), int(px * 1.55)
    filas = (len(texto) + cols - 1) // cols
    im, d = _lienzo(cols * celda_w + 40, filas * celda_h + 40, fondo)
    for i, ch in enumerate(texto):
        cx = 20 + (i % cols) * celda_w
        cy = 20 + (i // cols) * celda_h + int(px * 1.05)
        d.line([(cx, cy), (cx + celda_w - 6, cy)], fill=GUIA, width=1)
        d.text((cx + 8, cy), ch, font=f, fill=tinta, anchor="ls")
    im.save(salida)
    return salida


def lineas(ttf, salida, textos, px=96, fondo=PAPEL, tinta=TINTA, blur=0.0,
           ancho=1500):
    f = ImageFont.truetype(ttf, px)
    alto = 40 + len(textos) * int(px * 1.45)
    im, d = _lienzo(ancho, alto, fondo)
    y = 20 + px
    for t in textos:
        d.text((40, y), t, font=f, fill=tinta, anchor="ls")
        y += int(px * 1.45)
    if blur:
        im = im.filter(ImageFilter.GaussianBlur(blur))
    im.save(salida)
    return salida


def escalera(ttf, salida, texto, tams=(18, 22, 28, 36, 48, 64, 88, 120)):
    alto = 40 + sum(int(t * 1.5) for t in tams)
    im, d = _lienzo(1500, alto)
    y = 20
    for t in tams:
        f = ImageFont.truetype(ttf, t)
        y += int(t * 1.15)
        d.text((40, y), f"{t}px  {texto}", font=f, fill=TINTA, anchor="ls")
        y += int(t * 0.35)
    im.save(salida)
    return salida


ABC = ("ABCDEFGHIJKLMNOPQRSTUVWXYZ"
       "abcdefghijklmnopqrstuvwxyz"
       "0123456789"
       ".,:;!?¿¡'\"()[]-–—…·/&@%°*+=«»"
       "áéíóúüñÁÉÍÓÚÜÑ"
       "Γγαλήνη")

FRASES = [
    "Galene",
    "¿Cuándo fue?",
    "hace unas horas · anoche · ayer",
    "No hace falta estar segura.",
    "el sol sale a las 5:47",
    "el manglar tiene 340 raíces",
]

TRAMPAS = [
    "Il1 rn m ce oa sz 0O",
    "sé se · años anos · sí si",
    "ILUSIÓN llamó · niña nina",
]


def todo(ttf):
    salidas = []
    disponibles = _filtrar(ttf, ABC)
    salidas.append(rejilla(ttf, os.path.join(AQUI, "hoja-1-glifos.png"),
                           disponibles))
    salidas.append(lineas(ttf, os.path.join(AQUI, "hoja-2-frases.png"),
                          [_filtrar(ttf, t) for t in FRASES], px=88))
    salidas.append(lineas(ttf, os.path.join(AQUI, "hoja-3-borroso.png"),
                          [_filtrar(ttf, t) for t in FRASES + TRAMPAS],
                          px=72, blur=3.0))
    salidas.append(lineas(ttf, os.path.join(AQUI, "hoja-4-negativo.png"),
                          [_filtrar(ttf, t) for t in FRASES[:4]], px=88,
                          fondo=(14, 26, 32), tinta=(242, 246, 247)))
    salidas.append(escalera(ttf, os.path.join(AQUI, "hoja-5-escalera.png"),
                            _filtrar(ttf, "No hace falta estar segura")))
    for s in salidas:
        print("escrito:", os.path.relpath(s, AQUI))
    return salidas


def _filtrar(ttf, texto):
    """Quita lo que la fuente todavía no tiene, para que la hoja no
    se llene de cajitas y esconda lo que sí hay que mirar."""
    from fontTools.ttLib import TTFont
    tf = TTFont(ttf)
    cm = tf.getBestCmap()
    return "".join(ch for ch in texto if ord(ch) in cm or ch == " ")


if __name__ == "__main__":
    todo(os.path.join(AQUI, "Galene-Regular.ttf"))
