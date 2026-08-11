# -*- coding: utf-8 -*-
"""
GALENE — compilación.

    python construir.py            → .ttf, .woff2 y las hojas de prueba
    python construir.py --rapido   → solo las hojas de prueba

Las hojas se rasterizan con FreeType desde el .ttf ya compilado, no
desde los contornos en memoria: lo que se mira es lo que va a ver
alguien en un teléfono, no una idea de lo que debería verse.
"""

import os
import sys

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.feaLib.builder import addOpenTypeFeaturesFromString

from trazo import UPM, XH, CAP, ASC, DESC
import glifos

AQUI = os.path.dirname(os.path.abspath(__file__))
FAMILIA = "Galene"
ESTILO = "Regular"
PS = "Galene-Regular"
VERSION = "1.000"
MAX_ERR = 0.55          # error de conversión cúbica → cuadrática, en unidades


# ═══════════════════════════════════════════════════════════════════
#  KERNING
#  Poco y a mano. Una fuente de titular se lee en pares, no en
#  párrafos: los diez pares que importan valen más que mil malos.
# ═══════════════════════════════════════════════════════════════════
KERN = """
feature kern {
    pos A V -46; pos A W -42; pos A Y -56; pos A T -50;
    pos V A -46; pos W A -42; pos Y A -56; pos T A -50;
    pos L V -46; pos L Y -56; pos L T -46;
    pos P A -42; pos F A -38; pos T o -46; pos T a -46; pos T e -46;
    pos T u -40; pos T r -34; pos Y o -46; pos Y e -44; pos Y a -44;
    pos V o -30; pos V e -28; pos V a -28; pos W o -26; pos W a -24;
    pos r a -14; pos r c -14; pos r d -14; pos r e -14; pos r o -14;
    pos v period -60; pos y period -60; pos w period -50;
    pos v comma  -60; pos y comma  -60; pos w comma  -50;
    pos r period -46; pos r comma -46;
    pos f quoteright 34;
    pos G a -12; pos O a -10; pos D a -10;
} kern;
"""


def contornos_a_glifo(path, glyphSet):
    tt = TTGlyphPen(glyphSet)
    path.draw(Cu2QuPen(tt, MAX_ERR))
    return tt.glyph()


def construir():
    orden = [".notdef"]
    cmap = {}
    anchos = {}
    dibujos = {}

    for nombre, (fn, uni) in glifos.GLYPHS.items():
        g = fn()
        orden.append(nombre)
        anchos[nombre] = int(round(g.width))
        dibujos[nombre] = g.path()
        if uni is not None:
            cmap[uni] = nombre

    # .notdef — una caja hueca. Si falta un glifo hay que verlo, no
    # que desaparezca en silencio.
    from trazo import rect, diff
    caja = diff(rect(70, 0, 470, CAP), rect(70 + 62, 62, 470 - 62, CAP - 62))
    dibujos[".notdef"] = caja
    anchos[".notdef"] = 540

    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder(orden)
    fb.setupCharacterMap(cmap)

    glyphSet = {}
    glifos_tt = {}
    lsb = {}
    for n in orden:
        gl = contornos_a_glifo(dibujos[n], glyphSet)
        glifos_tt[n] = gl
        # El lsb de hmtx TIENE que coincidir con el xMin del contorno:
        # si no, fontTools desplaza el glifo por la diferencia cada vez
        # que lo redibuja, y la letra sale movida y rota.
        xs = [x for x, _ in gl.coordinates] if gl.numberOfContours else []
        lsb[n] = min(xs) if xs else 0
    fb.setupGlyf(glifos_tt)
    fb.setupHorizontalMetrics({n: (anchos[n], lsb[n]) for n in orden})

    linegap = 0
    fb.setupHorizontalHeader(ascent=ASC + 96, descent=DESC - 60, lineGap=linegap)

    fb.setupNameTable({
        "familyName": FAMILIA,
        "styleName": ESTILO,
        "uniqueFontIdentifier": f"{PS};{VERSION}",
        "fullName": f"{FAMILIA} {ESTILO}",
        "psName": PS,
        "version": f"Version {VERSION}",
        "copyright": "Galene — tipografía original del proyecto Galene.",
        "designer": "Proyecto Galene",
        "description": (
            "Humanista neutra de trazo casi uniforme, aberturas amplias y "
            "cifras de ancho fijo. Dibujada para no notarse: para leerse con "
            "la vista borrosa, en la oscuridad y con las manos temblando."
        ),
        "sampleText": "Galene — no hace falta estar segura",
    })

    fb.setupOS2(
        sTypoAscender=ASC,
        sTypoDescender=DESC,
        sTypoLineGap=linegap,
        usWinAscent=ASC + 96,
        usWinDescent=abs(DESC) + 60,
        sxHeight=XH,
        sCapHeight=CAP,
        usWeightClass=400,
        usWidthClass=5,
        fsType=0,
        achVendID="GLNE",
        fsSelection=0x0040,           # regular
    )
    fb.setupPost(isFixedPitch=0, italicAngle=0.0,
                 underlinePosition=-150, underlineThickness=90)

    fuente = fb.font

    # Las booleanas se resuelven en coma flotante y los contornos se
    # guardan en enteros: al redondear, dos bordes que se tocaban se
    # separan y queda una costura blanca dentro del trazo. Se vuelven
    # a unir ya en enteros, que es donde de verdad viven.
    from fontTools.ttLib.removeOverlaps import removeOverlaps
    removeOverlaps(fuente)

    try:
        addOpenTypeFeaturesFromString(fuente, KERN)
    except Exception as e:                                    # pragma: no cover
        print("  aviso: kerning no compilado —", e)

    ttf = os.path.join(AQUI, f"{PS}.ttf")
    fuente.save(ttf)
    print("escrito:", os.path.relpath(ttf, AQUI), f"({len(orden)} glifos)")

    fuente.flavor = "woff2"
    w2 = os.path.join(AQUI, f"{PS}.woff2")
    fuente.save(w2)
    print("escrito:", os.path.relpath(w2, AQUI),
          f"({os.path.getsize(w2)/1024:.1f} kB)")
    return ttf


if __name__ == "__main__":
    ttf = construir()
    if "--rapido" not in sys.argv:
        import revelar
        revelar.todo(ttf)
