# -*- coding: utf-8 -*-
"""
GALENE — los glifos.

Reglas del dibujo. Ninguna es estilística; todas están para que la
lea alguien con la vista borrosa, en la oscuridad, llorando, a las
cuatro de la mañana, en un teléfono con la pantalla rota:

  1. Aberturas amplias. La c no se puede volver o, la e no se puede
     volver o, la a no se puede volver o.
  2. Trazo casi uniforme. Nada de finos: bajo desenfoque el trazo
     fino desaparece y la letra se rompe.
  3. Il1 tienen que ser tres cosas distintas. La ele lleva cola.
  4. Tildes y eñes gruesas. "sé" no puede leerse "se"; "años" no
     puede leerse "anos". En español la tilde es información.
  5. Cifras de ancho fijo: las horas y los contadores no bailan.
  6. Y nada más. Si algo se nota, sobra.
"""

from trazo import *   # noqa: F401,F403
from trazo import _p
import math

GLYPHS = {}


def glyph(name, uni=None):
    def deco(fn):
        GLYPHS[name] = (fn, uni)
        return fn
    return deco


def trim(p, y0=None, y1=None, x0=None, x1=None):
    """Recorta un trazo largo contra las líneas de referencia."""
    if y0 is not None:
        p = diff(p, rect(-600, y0 - 900, 2000, y0))
    if y1 is not None:
        p = diff(p, rect(-600, y1, 2000, y1 + 900))
    if x0 is not None:
        p = diff(p, rect(x0 - 900, -900, x0, 1400))
    if x1 is not None:
        p = diff(p, rect(x1, -900, x1 + 900, 1400))
    return p


# ═══════════════════════════════════════════════════════════════════
#  MINÚSCULAS
# ═══════════════════════════════════════════════════════════════════

def _hombro(sxl, sxr, rxl, rxr, ytop, deep=-140, yout=None, yin=None):
    """
    El hombro de n m h (y, girada, de u).

    Perfil exterior y contra son dos cuartos de elipse, no curvas a
    ojo: el arco tiene que ser el mismo en las cinco letras o el
    renglón se ve tembloroso. Devuelve (sólido, contra).
    """
    K = 0.60
    yout = ytop * 0.612 if yout is None else yout    # dónde toca el asta derecha
    yin = ytop * 0.578 if yin is None else yin
    ycont = ytop - THIN                              # techo de la contra

    solido, pen = _p()
    pen.moveTo((sxl, deep))
    pen.lineTo((sxl, ytop))
    pen.curveTo((sxl + (rxr - sxl) * K, ytop),
                (rxr, yout + (ytop - yout) * K),
                (rxr, yout))
    pen.lineTo((rxr, deep))
    pen.closePath()

    contra, pen = _p()
    pen.moveTo((sxr, deep))
    pen.lineTo((sxr, ycont))
    pen.curveTo((sxr + (rxl - sxr) * K, ycont),
                (rxl, yin + (ycont - yin) * K),
                (rxl, yin))
    pen.lineTo((rxl, deep))
    pen.closePath()
    return solido, contra


@glyph("n", 0x006E)
def g_n():
    W = 508
    sxl, sxr, rxr, rxl = SB, SB + STEM, W - SB, W - SB - STEM
    g = G(W)
    g.add(stroke((sxl + STEM / 2, 0), (sxl + STEM / 2, XH), STEM))
    g.add(stroke((rxl + STEM / 2, 0), (rxl + STEM / 2, 300), STEM))
    s, c = _hombro(sxl, sxr, rxl, rxr, XH)
    g.add(s)
    g.cut(c)
    return g


@glyph("m", 0x006D)
def g_m():
    W = 786
    paso = (W - 2 * SB - STEM) / 2.0
    x1 = SB
    x2 = SB + paso
    x3 = SB + 2 * paso
    g = G(W)
    for x in (x1, x2, x3):
        g.add(stroke((x + STEM / 2, 0), (x + STEM / 2, 300), STEM))
    g.add(stroke((x1 + STEM / 2, 0), (x1 + STEM / 2, XH), STEM))
    for xa, xb in ((x1, x2), (x2, x3)):
        s, c = _hombro(xa, xa + STEM, xb, xb + STEM, XH)
        g.add(s)
        g.cut(c)
    return g


@glyph("h", 0x0068)
def g_h():
    W = 508
    sxl, sxr, rxr, rxl = SB, SB + STEM, W - SB, W - SB - STEM
    g = G(W)
    g.add(stroke((sxl + STEM / 2, 0), (sxl + STEM / 2, ASC), STEM))
    g.add(stroke((rxl + STEM / 2, 0), (rxl + STEM / 2, 300), STEM))
    s, c = _hombro(sxl, sxr, rxl, rxr, XH)
    g.add(s)
    g.cut(c)
    return g


@glyph("u", 0x0075)
def g_u():
    # La u es la n girada media vuelta. Literalmente.
    base = g_n()
    g = G(base.width)
    g.add(rot180(base.path(), base.width / 2.0, XH / 2.0))
    return g


@glyph("o", 0x006F)
def g_o():
    W = 530
    g = G(W)
    cx = W / 2.0
    g.add(ring(cx, XH / 2.0, cx - SBR, XH / 2.0 + OVER, STEM, THIN))
    return g


@glyph("c", 0x0063)
def g_c():
    W = 486
    g = G(W)
    cy, cx = XH / 2.0, W / 2.0 + 4
    rx, ry = cx - SBR, XH / 2.0 + OVER
    g.add(ring(cx, cy, rx, ry, STEM, THIN))
    g.cut(wedge((cx + rx * 0.06, cy - 6), -50, 44))
    return g


@glyph("e", 0x0065)
def g_e():
    W = 506
    g = G(W)
    cy, cx = XH / 2.0, W / 2.0 + 2
    rx, ry = cx - SBR, XH / 2.0 + OVER
    ybar = 290
    g.add(ring(cx, cy, rx, ry, STEM, THIN))
    g.add(inter(bar(cx - rx - 30, cx + rx + 30, ybar, THIN),
                oval(cx, cy, rx, ry)))
    g.cut(wedge((cx + rx * 0.04, ybar - THIN / 2.0 - 4), -56, 4))
    return g


@glyph("a", 0x0061)
def g_a():
    W = 512
    g = G(W)
    xr = W - SB
    g.add(stroke((xr - STEM / 2, 0), (xr - STEM / 2, 402), STEM))
    xd = xr - 12                       # el anillo muere DENTRO del asta
    cxa, rxa = (SBR + xd) / 2.0, (xd - SBR) / 2.0
    g.add(ring(cxa, 154, rxa, 164, STEM, THIN))
    g.add(diff(ring(cxa, XH - 150, rxa, 160, STEM, THIN),
               cut((cxa - 26, XH - 196), 13)))
    return g


def _ese(W, alto, w, sb):
    """
    s y S: una sola cinta. Se dibuja el eje y se engrosa de una vez;
    la mitad de abajo es la de arriba girada 180°, así que la letra
    sale simétrica por construcción y sin costura en la cintura.
    Pegando arcos siempre quedaba un pellizco ahí.
    """
    h = w / 2.0
    L, R = sb + h, W - sb - h
    cx, cy = W / 2.0, alto / 2.0
    arriba = alto + OVER - h
    y0 = alto * 0.77                      # altura del terminal
    d = R - L
    nodos = [
        (R - d * 0.05, y0),
        ((R, y0 + (arriba - y0) * 0.62), (R - d * 0.19, arriba), (cx, arriba)),
        ((cx - d * 0.29, arriba), (L, y0 + (arriba - y0) * 0.58), (L, y0 - 2)),
        ((L, y0 - (y0 - cy) * 0.43), (cx - d * 0.28, cy + (y0 - cy) * 0.27),
         (cx, cy)),
    ]
    return engrosa(nodos, w, cx, cy)



@glyph("s", 0x0073)
def g_s():
    W = 460
    g = G(W)
    g.add(_ese(W, XH, STEM * 0.97, SBR))
    return g


@glyph("i", 0x0069)
def g_i():
    W = 238
    g = G(W)
    g.add(stroke((W / 2.0, 0), (W / 2.0, XH), STEM))
    g.add(punto(W / 2.0, XH + 96, 50))
    return g


def _cola(cx, y, r, ry, izquierda=False):
    """El gancho de l, j, t, J: un cuarto de anillo."""
    if izquierda:
        return arco(cx - r, y, r, ry, THIN, STEM, 270, 360)
    return arco(cx + r, y, r, ry, THIN, STEM, 180, 270)


@glyph("l", 0x006C)
def g_l():
    # Recta. Una cola en la ele se lee como defecto; la I es la que
    # se diferencia, con remates, que es la solución de siempre.
    W = 256
    g = G(W)
    g.add(stroke((W / 2.0, 0), (W / 2.0, ASC), STEM))
    return g


@glyph("j", 0x006A)
def g_j():
    W = 282
    g = G(W)
    cx = W - SB - STEM / 2.0
    r, ry = 156, 140
    g.add(stroke((cx, -104), (cx, XH), STEM))
    g.add(arco(cx - r, -104, r, ry, STEM, THIN, 270, 360))
    g.add(punto(cx, XH + 96, 50))
    return g


def panza(xstem_r, xright, cy, ry, w=STEM, wh=THIN, holgura=9,
          plano=None):
    """
    Panza pegada a un asta vertical (b d p q g B D P R).

    Dos cuidados, y los dos son por lo mismo: dos bordes que se tocan
    en un solo punto no son una unión, son un pellizco — al redondear
    a entero se abren y queda una costura blanca dentro del trazo.

      · el óvalo se recorta 24 unidades DENTRO del asta, así que se
        solapan de verdad en vez de rozarse en el punto de tangencia;
      · la contra se recorta con holgura contra el borde del asta.

    `plano` (alto de la parte recta) endereza el lado izquierdo: es lo
    que separa una D de una b.
    """
    xl = xstem_r - w
    rx = (xright - xl) / 2.0
    cx = xl + rx
    dentro = rect(xl + 24, -900, 2400, 1400)

    fuera = inter(oval(cx, cy, rx, ry), dentro)
    contra = inter(oval(cx, cy, rx - w, ry - wh, 0.593),
                   rect(xstem_r + holgura, -900, 2400, 1400))
    if plano:
        fuera = union(fuera, rect(xl + 10, cy - plano, cx, cy + plano))
        contra = union(contra, rect(xstem_r + holgura, cy - plano + wh,
                                    cx, cy + plano - wh))
    return diff(fuera, contra)


@glyph("b", 0x0062)
def g_b():
    W = 522
    g = G(W)
    g.add(stroke((SB + STEM / 2, 0), (SB + STEM / 2, ASC), STEM))
    g.add(panza(SB + STEM, W - SBR, XH / 2.0, XH / 2.0 + OVER))
    return g


@glyph("d", 0x0064)
def g_d():
    return _espejo(g_b())


@glyph("p", 0x0070)
def g_p():
    W = 522
    g = G(W)
    g.add(stroke((SB + STEM / 2, DESC), (SB + STEM / 2, XH), STEM))
    g.add(panza(SB + STEM, W - SBR, XH / 2.0, XH / 2.0 + OVER))
    return g


@glyph("q", 0x0071)
def g_q():
    return _espejo(g_p())


def _espejo(g):
    nuevo = G(g.width)
    nuevo.add(mirror_x(g.path(), g.width / 2.0))
    return nuevo


@glyph("g", 0x0067)
def g_g():
    W = 522
    g = G(W)
    g.add(mirror_x(panza(SB + STEM, W - SBR, XH / 2.0, XH / 2.0 + OVER),
                   W / 2.0))
    xs = W - SB - STEM / 2.0
    g.add(stroke((xs, -96), (xs, XH), STEM))
    g.add(arco(xs - 130, -96, 130, 112, THIN, STEM, 196, 360))
    return g


@glyph("f", 0x0066)
def g_f():
    W = 380
    g = G(W)
    cx = SB + STEM / 2.0 + 28
    r, ry = 152, 138
    g.add(stroke((cx, 0), (cx, ASC - ry), STEM))
    g.add(arco(cx + r, ASC - ry, r, ry, STEM, THIN, 90, 180))
    g.add(bar(22, W - 26, XH - THIN / 2.0, THIN))
    return g


@glyph("t", 0x0074)
def g_t():
    W = 372
    g = G(W)
    cx = SB + STEM / 2.0 + 40
    r, ry = 142, 130
    g.add(stroke((cx, ry), (cx, ASC - 86), STEM))
    g.add(arco(cx + r, ry, r, ry, STEM, THIN, 180, 270))
    g.add(bar(24, W - 40, XH - THIN / 2.0, THIN))
    return g


@glyph("k", 0x006B)
def g_k():
    W = 490
    g = G(W)
    cx = SB + STEM / 2.0
    g.add(stroke((cx, 0), (cx, ASC), STEM))
    nudo = (cx + STEM * 0.34, 250)
    g.add(stroke((W - SB + 8, XH), nudo, STEM * 0.92, ext1=52))
    g.add(stroke(nudo, (W - SB + 20, 0), STEM * 0.98, ext0=52))
    return g


@glyph("r", 0x0072)
def g_r():
    # El brazo es el mismo arco de la n, cortado. Así la r no inventa
    # una curva propia y el renglón no se tambalea.
    W = 404
    sxl, sxr, rxr = SB, SB + STEM, W - SB
    rxl = rxr - STEM
    g = G(W)
    g.add(stroke((sxl + STEM / 2, 0), (sxl + STEM / 2, XH), STEM))
    solido, contra = _hombro(sxl, sxr, rxl, rxr, XH, yout=XH * 0.60)
    g.add(trim(solido, y0=XH * 0.585))
    g.cut(contra)
    return g


def _uve(W, xl, xr, ytop, ybot, w, ext=90):
    cx = (xl + xr) / 2.0
    a = stroke((xl, ytop + ext), (cx, ybot - ext * 0.2), w)
    b = stroke((xr, ytop + ext), (cx, ybot - ext * 0.2), w)
    return trim(union(a, b), y0=ybot, y1=ytop)


@glyph("v", 0x0076)
def g_v():
    W = 466
    g = G(W)
    g.add(_uve(W, SB - 12, W - SB + 12, XH, 0, STEM * 0.94))
    return g


@glyph("w", 0x0077)
def g_w():
    W = 700
    g = G(W)
    m = W / 2.0
    g.add(_uve(W, SB - 14, m + 22, XH, 0, STEM * 0.90))
    g.add(_uve(W, m - 22, W - SB + 14, XH, 0, STEM * 0.90))
    return g


@glyph("x", 0x0078)
def g_x():
    W = 466
    g = G(W)
    a = stroke((SB - 14, XH), (W - SB + 14, 0), STEM * 0.94, ext0=60, ext1=60)
    b = stroke((W - SB + 14, XH), (SB - 14, 0), STEM * 0.94, ext0=60, ext1=60)
    g.add(trim(union(a, b), y0=0, y1=XH))
    return g


@glyph("y", 0x0079)
def g_y():
    W = 466
    g = G(W)
    cx = W / 2.0
    a = stroke((SB - 12, XH + 80), (cx + 8, 40), STEM * 0.94)
    b = stroke((W - SB + 12, XH + 80), (SB + 4, DESC - 60), STEM * 0.94)
    g.add(trim(union(a, b), y0=DESC, y1=XH))
    return g


@glyph("z", 0x007A)
def g_z():
    W = 444
    g = G(W)
    g.add(trim(union(bar(SB - 4, W - SB + 4, XH - THIN / 2.0, THIN),
                     bar(SB - 4, W - SB + 4, THIN / 2.0, THIN),
                     stroke((W - SB - 6, XH - 20), (SB + 6, 20), STEM * 0.92,
                            ext0=90, ext1=90)), y0=0, y1=XH))
    return g


# ═══════════════════════════════════════════════════════════════════
#  MAYÚSCULAS
# ═══════════════════════════════════════════════════════════════════

@glyph("A", 0x0041)
def g_A():
    W = 684
    g = G(W)
    cx = W / 2.0
    cuerpo = union(stroke((cx, CAP + 90), (SBC - 40, -90), STEMC * 0.96),
                   stroke((cx, CAP + 90), (W - SBC + 40, -90), STEMC * 1.02))
    cuerpo = trim(cuerpo, y0=0, y1=CAP)
    trav = inter(bar(-200, W + 200, 194, THINC * 0.96),
                 poly((cx, CAP + 100), (W + 300, -300), (-300, -300)))
    g.add(cuerpo, trav)
    return g


@glyph("B", 0x0042)
def g_B():
    W = 624
    g = G(W)
    xl = SBC + 16                     # el anillo nace DENTRO del asta
    g.add(stroke((SBC + STEMC / 2, 0), (SBC + STEMC / 2, CAP), STEMC))
    for cy, ry, der in ((CAP - 184, 194, W - SBCR - 46),
                        (186, 196, W - SBCR)):
        rx = (der - xl) / 2.0
        g.add(ring(xl + rx, cy, rx, ry, STEMC, THINC))
    g.add(bar(SBC + 20, W - SBCR - 150, CAP / 2.0 - 2, THINC))
    return g


@glyph("C", 0x0043)
def g_C():
    W = 668
    g = G(W)
    cy, cx = CAP / 2.0, W / 2.0 + 4
    rx, ry = cx - SBCR, CAP / 2.0 + OVER
    g.add(ring(cx, cy, rx, ry, STEMC, THINC))
    g.cut(wedge((cx + rx * 0.06, cy - 8), -48, 44))
    return g


@glyph("D", 0x0044)
def g_D():
    W = 682
    g = G(W)
    g.add(stroke((SBC + STEMC / 2, 0), (SBC + STEMC / 2, CAP), STEMC))
    g.add(panza(SBC + STEMC, W - SBCR, CAP / 2.0, CAP / 2.0 + OVER,
                STEMC, THINC, plano=CAP / 2.0))
    return g


@glyph("E", 0x0045)
def g_E():
    W = 586
    g = G(W)
    xs = SBC
    g.add(stroke((xs + STEMC / 2, 0), (xs + STEMC / 2, CAP), STEMC))
    g.add(bar(xs, W - SBC + 8, CAP - THINC / 2.0, THINC))
    g.add(bar(xs, W - SBC - 26, CAP * 0.505, THINC * 0.96))
    g.add(bar(xs, W - SBC + 8, THINC / 2.0, THINC))
    return g


@glyph("F", 0x0046)
def g_F():
    W = 560
    g = G(W)
    xs = SBC
    g.add(stroke((xs + STEMC / 2, 0), (xs + STEMC / 2, CAP), STEMC))
    g.add(bar(xs, W - SBC + 10, CAP - THINC / 2.0, THINC))
    g.add(bar(xs, W - SBC - 20, CAP * 0.505, THINC * 0.96))
    return g


@glyph("G", 0x0047)
def g_G():
    W = 694
    g = G(W)
    cy, cx = CAP / 2.0, W / 2.0 + 2
    rx, ry = cx - SBCR, CAP / 2.0 + OVER
    # el corte es solo del anillo: si fuera del glifo entero se comería
    # la barra y el brazo, y la G se leería C
    g.add(diff(ring(cx, cy, rx, ry, STEMC, THINC),
               wedge((cx + rx * 0.12, cy + 6), -34, 26)))
    ybar = CAP * 0.415
    g.add(stroke((cx + rx - STEMC / 2, cy + 56), (cx + rx - STEMC / 2, ybar),
                 STEMC))
    g.add(bar(cx + rx * 0.30, cx + rx, ybar, THINC))
    return g


@glyph("H", 0x0048)
def g_H():
    W = 692
    g = G(W)
    g.add(stroke((SBC + STEMC / 2, 0), (SBC + STEMC / 2, CAP), STEMC))
    g.add(stroke((W - SBC - STEMC / 2, 0), (W - SBC - STEMC / 2, CAP), STEMC))
    g.add(bar(SBC, W - SBC, CAP * 0.505, THINC))
    return g


@glyph("I", 0x0049)
def g_I():
    # Con remates: es lo único que la separa de la ele y del uno.
    W = 300
    g = G(W)
    cx = W / 2.0
    g.add(stroke((cx, 0), (cx, CAP), STEMC))
    g.add(bar(64, W - 64, THINC / 2.0, THINC * 0.94))
    g.add(bar(64, W - 64, CAP - THINC / 2.0, THINC * 0.94))
    return g


@glyph("J", 0x004A)
def g_J():
    W = 496
    g = G(W)
    cx = W - SBC - STEMC / 2.0
    r, ry = 178, 166
    g.add(stroke((cx, ry), (cx, CAP), STEMC))
    g.add(arco(cx - r, ry, r, ry, STEMC, THINC, 190, 360))
    return g


@glyph("K", 0x004B)
def g_K():
    W = 648
    g = G(W)
    cx = SBC + STEMC / 2.0
    g.add(stroke((cx, 0), (cx, CAP), STEMC))
    nudo = (cx + STEMC * 0.34, 320)
    g.add(stroke((W - SBC + 12, CAP), nudo, STEMC * 0.94, ext1=60))
    g.add(stroke(nudo, (W - SBC + 24, 0), STEMC, ext0=60))
    return g


@glyph("L", 0x004C)
def g_L():
    W = 552
    g = G(W)
    g.add(stroke((SBC + STEMC / 2, 0), (SBC + STEMC / 2, CAP), STEMC))
    g.add(bar(SBC, W - SBC + 10, THINC / 2.0, THINC))
    return g


@glyph("M", 0x004D)
def g_M():
    W = 852
    g = G(W)
    xl, xr = SBC, W - SBC
    g.add(stroke((xl + STEMC / 2, 0), (xl + STEMC / 2, CAP), STEMC))
    g.add(stroke((xr - STEMC / 2, 0), (xr - STEMC / 2, CAP), STEMC))
    v = union(stroke((xl + STEMC / 2, CAP + 40), (W / 2.0, 30), STEMC * 0.92),
              stroke((xr - STEMC / 2, CAP + 40), (W / 2.0, 30), STEMC * 0.92))
    g.add(trim(v, y0=0, y1=CAP))
    return g


@glyph("N", 0x004E)
def g_N():
    W = 706
    g = G(W)
    xl, xr = SBC, W - SBC
    g.add(stroke((xl + STEMC / 2, 0), (xl + STEMC / 2, CAP), STEMC))
    g.add(stroke((xr - STEMC / 2, 0), (xr - STEMC / 2, CAP), STEMC))
    g.add(trim(stroke((xl + STEMC / 2, CAP + 40), (xr - STEMC / 2, -40),
                      STEMC * 0.94), y0=0, y1=CAP))
    return g


@glyph("O", 0x004F)
def g_O():
    W = 726
    g = G(W)
    cx = W / 2.0
    g.add(ring(cx, CAP / 2.0, cx - SBCR, CAP / 2.0 + OVER, STEMC, THINC))
    return g


@glyph("P", 0x0050)
def g_P():
    W = 604
    g = G(W)
    g.add(stroke((SBC + STEMC / 2, 0), (SBC + STEMC / 2, CAP), STEMC))
    g.add(trim(panza(SBC + STEMC, W - SBCR, CAP - 192, 192 + OVER,
                     STEMC, THINC, plano=192), y0=CAP - 192 - 8))
    return g


@glyph("Q", 0x0051)
def g_Q():
    W = 726
    g = G(W)
    cx = W / 2.0
    g.add(ring(cx, CAP / 2.0, cx - SBCR, CAP / 2.0 + OVER, STEMC, THINC))
    g.add(trim(stroke((cx + 74, 176), (cx + 242, -74), STEMC * 0.92),
               y0=-74))
    return g


@glyph("R", 0x0052)
def g_R():
    W = 636
    g = G(W)
    xs = SBC + STEMC
    yh = CAP - 182 * 2 + 6            # bajo la panza
    g.add(stroke((SBC + STEMC / 2, 0), (SBC + STEMC / 2, CAP), STEMC))
    g.add(trim(panza(xs, W - SBCR - 58, CAP - 182, 182 + OVER, STEMC, THINC,
                     plano=182), y0=yh))
    g.add(trim(stroke((xs + 30, yh + 90), (W - SBC + 34, -70), STEMC * 0.94),
               y0=0, y1=yh + 8))
    return g


@glyph("S", 0x0053)
def g_S():
    W = 602
    g = G(W)
    g.add(_ese(W, CAP, STEMC * 0.97, SBCR))
    return g


@glyph("T", 0x0054)
def g_T():
    W = 610
    g = G(W)
    g.add(bar(SBC - 32, W - SBC + 32, CAP - THINC / 2.0, THINC))
    g.add(stroke((W / 2.0, 0), (W / 2.0, CAP), STEMC))
    return g


@glyph("U", 0x0055)
def g_U():
    W = 690
    g = G(W)
    xl, xr = SBC, W - SBC
    rx = (xr - xl) / 2.0
    ry = 190
    g.add(stroke((xl + STEMC / 2, ry), (xl + STEMC / 2, CAP), STEMC))
    g.add(stroke((xr - STEMC / 2, ry), (xr - STEMC / 2, CAP), STEMC))
    g.add(arco(xl + rx, ry, rx, ry + OVER, STEMC, THINC, 180, 360))
    return g


@glyph("V", 0x0056)
def g_V():
    W = 670
    g = G(W)
    g.add(_uve(W, SBC - 30, W - SBC + 30, CAP, 0, STEMC * 0.94, ext=120))
    return g


@glyph("W", 0x0057)
def g_W():
    W = 952
    g = G(W)
    m = W / 2.0
    g.add(_uve(W, SBC - 34, m + 30, CAP, 0, STEMC * 0.88, ext=120))
    g.add(_uve(W, m - 30, W - SBC + 34, CAP, 0, STEMC * 0.88, ext=120))
    return g


@glyph("X", 0x0058)
def g_X():
    W = 648
    g = G(W)
    a = stroke((SBC - 26, CAP), (W - SBC + 26, 0), STEMC * 0.94, ext0=80, ext1=80)
    b = stroke((W - SBC + 26, CAP), (SBC - 26, 0), STEMC * 0.94, ext0=80, ext1=80)
    g.add(trim(union(a, b), y0=0, y1=CAP))
    return g


@glyph("Y", 0x0059)
def g_Y():
    W = 624
    g = G(W)
    cx = W / 2.0
    v = union(stroke((SBC - 28, CAP + 80), (cx, 300), STEMC * 0.94),
              stroke((W - SBC + 28, CAP + 80), (cx, 300), STEMC * 0.94))
    g.add(trim(v, y0=300, y1=CAP))
    g.add(stroke((cx, 0), (cx, 340), STEMC))
    return g


@glyph("Z", 0x005A)
def g_Z():
    W = 590
    g = G(W)
    g.add(trim(union(bar(SBC - 14, W - SBC + 14, CAP - THINC / 2.0, THINC),
                     bar(SBC - 14, W - SBC + 14, THINC / 2.0, THINC),
                     stroke((W - SBC + 4, CAP - 30), (SBC - 4, 30),
                            STEMC * 0.92, ext0=120, ext1=120)),
               y0=0, y1=CAP))
    return g


# ═══════════════════════════════════════════════════════════════════
#  CIFRAS — ancho fijo. Las horas y los contadores no bailan.
# ═══════════════════════════════════════════════════════════════════
CIF = 552


@glyph("zero", 0x0030)
def g_0():
    g = G(CIF)
    cx = CIF / 2.0
    g.add(ring(cx, CAP / 2.0, cx - 84, CAP / 2.0 + OVER, STEMC, THINC))
    return g


@glyph("one", 0x0031)
def g_1():
    g = G(CIF)
    cx = CIF / 2.0 + 14
    g.add(stroke((cx, 0), (cx, CAP), STEMC))
    g.add(stroke((cx + STEMC / 2, CAP - 8), (cx - 150, CAP - 130), THINC * 0.98))
    return g


@glyph("two", 0x0032)
def g_2():
    g = G(CIF)
    cx = CIF / 2.0
    rx, ry = cx - 84, 172
    cy = CAP - ry
    g.add(arco(cx, cy, rx, ry + OVER, STEMC, THINC, -44, 200))
    g.add(trim(union(stroke((cx + rx * 0.74, cy - ry * 0.62),
                            (cx - rx + 30, THINC * 0.6),
                            STEMC * 0.94, ext0=54, ext1=40),
                     bar(cx - rx, cx + rx + 14, THINC / 2.0, THINC)), y0=0))
    return g


@glyph("three", 0x0033)
def g_3():
    g = G(CIF)
    cx = CIF / 2.0 - 4
    rx = cx - 86
    g.add(arco(cx, CAP - 186, rx, 186 + OVER, STEMC, THINC, -76, 194))
    g.add(arco(cx, 190, rx + 10, 190 + OVER, STEMC, THINC, 166, 76 + 360))
    return g


@glyph("four", 0x0034)
def g_4():
    g = G(CIF)
    cx = CIF / 2.0 + 52
    ybar = 172
    g.add(stroke((cx, 0), (cx, CAP), STEMC * 0.98))
    g.add(trim(union(stroke((cx + 4, CAP + 20), (66, ybar - 30), THINC * 1.04),
                     bar(58, CIF - 58, ybar, THINC)),
               y0=ybar - THINC / 2.0, y1=CAP))
    return g


@glyph("five", 0x0035)
def g_5():
    g = G(CIF)
    cx = CIF / 2.0
    rx, xi = cx - 84, 90
    g.add(bar(xi, CIF - 88, CAP - THINC / 2.0, THINC))
    g.add(stroke((xi + STEMC / 2, 352), (xi + STEMC / 2, CAP), STEMC))
    g.add(arco(cx, 190, rx, 190 + OVER, STEMC, THINC, 186, 96 + 360))
    g.add(bar(xi, cx - 30, 372, THINC))
    return g


@glyph("six", 0x0036)
def g_6():
    g = G(CIF)
    cx = CIF / 2.0
    rx = cx - 84
    g.add(ring(cx, 192, rx, 192 + OVER, STEMC, THINC))
    g.add(trim(arco(cx + 30, CAP - 262, rx + 30, 262 + OVER, STEMC, THINC,
                    100, 188), y0=140))
    return g


@glyph("seven", 0x0037)
def g_7():
    g = G(CIF)
    g.add(bar(74, CIF - 70, CAP - THINC / 2.0, THINC))
    g.add(trim(stroke((CIF - 96, CAP - 20), (168, -40), STEMC * 0.94, ext0=80),
               y0=0, y1=CAP - THINC))
    return g


@glyph("eight", 0x0038)
def g_8():
    g = G(CIF)
    cx = CIF / 2.0
    g.add(ring(cx, CAP - 176, cx - 100, 176 + OVER, STEMC * 0.96, THINC))
    g.add(ring(cx, 186, cx - 84, 186 + OVER, STEMC, THINC))
    return g


@glyph("nine", 0x0039)
def g_9():
    base = g_6()
    g = G(CIF)
    g.add(rot180(base.path(), CIF / 2.0, CAP / 2.0))
    return g


# ═══════════════════════════════════════════════════════════════════
#  PUNTUACIÓN
# ═══════════════════════════════════════════════════════════════════
RP = 54          # radio del punto


@glyph("period", 0x002E)
def g_period():
    g = G(266)
    g.add(punto(133, RP, RP))
    return g


def _coma(cx, cy):
    p, pen = _p()
    pen.moveTo((cx - RP, cy))
    pen.curveTo((cx - RP, cy + RP * 1.35), (cx + RP, cy + RP * 1.35),
                (cx + RP, cy))
    pen.curveTo((cx + RP, cy - RP * 0.55), (cx + RP * 0.5, cy - RP * 1.5),
                (cx - RP * 0.25, cy - RP * 2.1))
    pen.curveTo((cx - RP * 0.6, cy - RP * 1.9), (cx - RP, cy - RP * 0.9),
                (cx - RP, cy))
    pen.closePath()
    return p


@glyph("comma", 0x002C)
def g_comma():
    g = G(266)
    g.add(_coma(133, RP))
    return g


@glyph("colon", 0x003A)
def g_colon():
    g = G(266)
    g.add(punto(133, RP, RP), punto(133, XH - RP, RP))
    return g


@glyph("semicolon", 0x003B)
def g_semicolon():
    g = G(266)
    g.add(_coma(133, RP), punto(133, XH - RP, RP))
    return g


@glyph("exclam", 0x0021)
def g_exclam():
    g = G(272)
    cx = 136
    g.add(punto(cx, RP, RP))
    p, pen = _p()
    pen.moveTo((cx - STEMC * 0.56, CAP))
    pen.lineTo((cx + STEMC * 0.56, CAP))
    pen.lineTo((cx + STEMC * 0.30, 152))
    pen.lineTo((cx - STEMC * 0.30, 152))
    pen.closePath()
    g.add(p)
    return g


@glyph("exclamdown", 0x00A1)
def g_exclamdown():
    base = g_exclam()
    g = G(base.width)
    g.add(rot180(base.path(), base.width / 2.0, (CAP - 190) / 2.0))
    return g


def _interrogante(W):
    g = G(W)
    cx = W / 2.0 - 22
    r = 148
    cy = CAP - r - 18
    g.add(punto(cx, RP, RP))
    g.add(arco(cx, cy, r, r + OVER, STEMC, THINC, -44, 206))
    g.add(stroke((cx + r * 0.46, cy - r * 0.40), (cx, 212), STEMC * 0.96,
                 ext0=64))
    return g


@glyph("question", 0x003F)
def g_question():
    return _interrogante(432)


@glyph("questiondown", 0x00BF)
def g_questiondown():
    base = _interrogante(432)
    g = G(432)
    g.add(rot180(base.path(), 216, (CAP - 190) / 2.0))
    return g


@glyph("hyphen", 0x002D)
def g_hyphen():
    g = G(320)
    g.add(bar(56, 264, XH * 0.50, THIN))
    return g


@glyph("endash", 0x2013)
def g_endash():
    g = G(500)
    g.add(bar(40, 460, XH * 0.50, THIN))
    return g


@glyph("emdash", 0x2014)
def g_emdash():
    g = G(1000)
    g.add(bar(0, 1000, XH * 0.50, THIN))
    return g


@glyph("periodcentered", 0x00B7)
def g_periodcentered():
    g = G(266)
    g.add(punto(133, XH * 0.46, RP))
    return g


@glyph("bullet", 0x2022)
def g_bullet():
    g = G(360)
    g.add(punto(180, XH * 0.48, 86))
    return g


@glyph("ellipsis", 0x2026)
def g_ellipsis():
    g = G(798)
    for i in range(3):
        g.add(punto(133 + i * 266, RP, RP))
    return g


@glyph("slash", 0x002F)
def g_slash():
    g = G(430)
    g.add(trim(stroke((40, -80), (390, ASC + 20), THINC * 0.92), y0=-100,
               y1=ASC))
    return g


def _parentesis(W, ancho=1.0):
    g = G(W)
    cx = W - 30
    ry = (ASC + 130) / 2.0
    cy = ry - 130
    g.add(arco(cx, cy, 250 * ancho, ry, THINC * 0.92, THINC * 0.92, 120, 240))
    return g


@glyph("parenleft", 0x0028)
def g_parenleft():
    return _parentesis(300)


@glyph("parenright", 0x0029)
def g_parenright():
    base = _parentesis(300)
    g = G(300)
    g.add(mirror_x(base.path(), 150))
    return g


@glyph("bracketleft", 0x005B)
def g_bracketleft():
    g = G(300)
    y0, y1 = -130, ASC
    g.add(stroke((70 + THINC * 0.46, y0), (70 + THINC * 0.46, y1), THINC * 0.92))
    g.add(bar(70, 250, y0 + THINC * 0.46, THINC * 0.92))
    g.add(bar(70, 250, y1 - THINC * 0.46, THINC * 0.92))
    return g


@glyph("bracketright", 0x005D)
def g_bracketright():
    base = g_bracketleft()
    g = G(300)
    g.add(mirror_x(base.path(), 150))
    return g


def _comilla(cx, arriba=True):
    cy = CAP - 60
    if arriba:
        return _coma(cx, cy)
    return mirror_y(mirror_x(_coma(cx, cy), cx), cy)


@glyph("quoteright", 0x2019)
def g_quoteright():
    g = G(230)
    g.add(_comilla(115, False))
    return g


@glyph("quoteleft", 0x2018)
def g_quoteleft():
    g = G(230)
    g.add(_comilla(115, True))
    return g


@glyph("quotedblright", 0x201D)
def g_quotedblright():
    g = G(400)
    g.add(_comilla(118, False), _comilla(282, False))
    return g


@glyph("quotedblleft", 0x201C)
def g_quotedblleft():
    g = G(400)
    g.add(_comilla(118, True), _comilla(282, True))
    return g


@glyph("quotesingle", 0x0027)
def g_quotesingle():
    g = G(200)
    g.add(stroke((100, CAP - 210), (100, CAP), THINC * 0.86))
    return g


@glyph("quotedbl", 0x0022)
def g_quotedbl():
    g = G(340)
    g.add(stroke((108, CAP - 210), (108, CAP), THINC * 0.86))
    g.add(stroke((232, CAP - 210), (232, CAP), THINC * 0.86))
    return g


def _guillemot(W, izquierda=True):
    g = G(W)
    y = XH * 0.48
    h = 118
    w = THINC * 0.80
    for i, dx in enumerate((0, 132)):
        x0 = 62 + dx
        a = stroke((x0 + 100, y + h), (x0, y), w, ext1=w * 0.5)
        b = stroke((x0, y), (x0 + 100, y - h), w, ext0=w * 0.5)
        p = union(a, b)
        g.add(p if izquierda else mirror_x(p, W / 2.0))
    return g


@glyph("guillemotleft", 0x00AB)
def g_guillemotleft():
    return _guillemot(360, True)


@glyph("guillemotright", 0x00BB)
def g_guillemotright():
    return _guillemot(360, False)


@glyph("ampersand", 0x0026)
def g_ampersand():
    W = 690
    g = G(W)
    # bucle de arriba, abierto abajo a la derecha
    g.add(arco(258, CAP - 146, 138, 146 + OVER, STEMC * 0.92, THINC,
               -30, 250))
    # bucle de abajo, abierto arriba a la derecha
    g.add(arco(250, 178, 178, 178 + OVER, STEMC, THINC, 46, 336))
    # el trazo que los cruza y sale
    g.add(trim(stroke((178, 322), (W - 132, 6), STEMC * 0.90, ext0=40),
               y0=0))
    g.add(trim(stroke((W - 252, 214), (W - 46, 22), STEMC * 0.90, ext1=20),
               y0=0))
    return g


@glyph("at", 0x0040)
def g_at():
    W = 900
    g = G(W)
    cx, cy = W / 2.0, CAP * 0.46
    w = THINC * 0.78
    g.add(arco(cx, cy, cx - 62, CAP * 0.54, w, w, -64, 258))
    g.add(ring(cx - 26, cy - 10, 148, 152, w, w))
    g.add(stroke((cx + 122 - 26, cy + 142), (cx + 122 - 26, cy - 150), w))
    return g


@glyph("percent", 0x0025)
def g_percent():
    W = 820
    g = G(W)
    r = 118
    g.add(ring(200, CAP - r - 10, r, r, THINC * 0.90, THINC * 0.90))
    g.add(ring(W - 200, r + 10, r, r, THINC * 0.90, THINC * 0.90))
    g.add(trim(stroke((W - 100, CAP + 30), (100, -30), THINC * 0.86),
               y0=0, y1=CAP))
    return g


@glyph("plus", 0x002B)
def g_plus():
    W = 600
    g = G(W)
    cy = CAP * 0.44
    g.add(bar(80, W - 80, cy, THINC * 0.92))
    g.add(stroke((W / 2.0, cy - 180), (W / 2.0, cy + 180), THINC * 0.92))
    return g


@glyph("equal", 0x003D)
def g_equal():
    W = 600
    g = G(W)
    cy = CAP * 0.44
    g.add(bar(80, W - 80, cy + 82, THINC * 0.92))
    g.add(bar(80, W - 80, cy - 82, THINC * 0.92))
    return g


@glyph("asterisk", 0x002A)
def g_asterisk():
    W = 420
    g = G(W)
    cx, cy, r = W / 2.0, CAP - 150, 130
    import math as _m
    for i in range(5):
        a = _m.radians(90 + i * 72)
        g.add(stroke((cx, cy), (cx + _m.cos(a) * r, cy + _m.sin(a) * r),
                     THINC * 0.74))
    return g


@glyph("degree", 0x00B0)
def g_degree():
    g = G(340)
    g.add(ring(170, CAP - 118, 100, 100, THINC * 0.86, THINC * 0.86))
    return g


@glyph("numbersign", 0x0023)
def g_numbersign():
    W = 640
    g = G(W)
    for dx in (-70, 70):
        g.add(trim(stroke((W / 2.0 + dx + 40, -40), (W / 2.0 + dx - 40, CAP + 40),
                          THINC * 0.80), y0=0, y1=CAP))
    for dy in (-96, 96):
        g.add(bar(46, W - 46, CAP * 0.48 + dy, THINC * 0.80))
    return g


@glyph("space", 0x0020)
def g_space():
    return G(250)


@glyph("nbspace", 0x00A0)
def g_nbspace():
    return G(250)


# ═══════════════════════════════════════════════════════════════════
#  TILDES Y COMPUESTOS
#  Gruesas a propósito. En español la tilde no es un adorno: es la
#  diferencia entre "sé" y "se", entre "años" y "anos".
# ═══════════════════════════════════════════════════════════════════

def _acute(cx, cy):
    return stroke((cx - 52, cy), (cx + 62, cy + 128), THIN * 1.10)


def _dieresis(cx, cy):
    return union(punto(cx - 78, cy + 58, 50), punto(cx + 78, cy + 58, 50))


def _tilde(cx, cy):
    w = THIN * 1.06
    a = 118.0
    p, pen = _p()
    pen.moveTo((cx - a, cy + 6))
    pen.curveTo((cx - a * 0.72, cy + 92), (cx - a * 0.16, cy + 92),
                (cx + a * 0.10, cy + 46))
    pen.curveTo((cx + a * 0.34, cy + 8), (cx + a * 0.72, cy + 4),
                (cx + a, cy + 52))
    pen.lineTo((cx + a, cy + 52 - w))
    pen.curveTo((cx + a * 0.74, cy + 4 - w * 1.5), (cx + a * 0.30, cy + 8 - w),
                (cx + a * 0.06, cy + 46 - w))
    pen.curveTo((cx - a * 0.18, cy + 92 - w), (cx - a * 0.70, cy + 92 - w),
                (cx - a, cy + 6 - w))
    pen.closePath()
    return p


ALTO_MIN = XH + 66       # dónde arranca la tilde sobre minúscula
ALTO_MAY = CAP + 46      # ... y sobre mayúscula


def _compuesto(base_fn, acento_fn, alto, dx=0.0):
    b = base_fn()
    g = G(b.width)
    g.add(b.path())
    g.add(acento_fn(b.width / 2.0 + dx, alto))
    return g


for _n, _u, _b, _a, _alt, _dx in [
    ("aacute", 0x00E1, "a", "acute", ALTO_MIN, 0),
    ("eacute", 0x00E9, "e", "acute", ALTO_MIN, 0),
    ("iacute", 0x00ED, "dotlessi", "acute", ALTO_MIN, 0),
    ("oacute", 0x00F3, "o", "acute", ALTO_MIN, 0),
    ("uacute", 0x00FA, "u", "acute", ALTO_MIN, 0),
    ("udieresis", 0x00FC, "u", "dieresis", ALTO_MIN, 0),
    ("ntilde", 0x00F1, "n", "tilde", ALTO_MIN, 0),
    ("Aacute", 0x00C1, "A", "acute", ALTO_MAY, 0),
    ("Eacute", 0x00C9, "E", "acute", ALTO_MAY, -30),
    ("Iacute", 0x00CD, "I", "acute", ALTO_MAY, 0),
    ("Oacute", 0x00D3, "O", "acute", ALTO_MAY, 0),
    ("Uacute", 0x00DA, "U", "acute", ALTO_MAY, 0),
    ("Udieresis", 0x00DC, "U", "dieresis", ALTO_MAY, 0),
    ("Ntilde", 0x00D1, "N", "tilde", ALTO_MAY, 0),
]:
    def _mk(_b=_b, _a=_a, _alt=_alt, _dx=_dx):
        def fn():
            base = GLYPHS[_b][0] if _b in GLYPHS else _sin_punto
            ac = {"acute": _acute, "dieresis": _dieresis, "tilde": _tilde}[_a]
            return _compuesto(base, ac, _alt, _dx)
        return fn
    GLYPHS[_n] = (_mk(), _u)


def _sin_punto():
    W = 238
    g = G(W)
    g.add(stroke((W / 2.0, 0), (W / 2.0, XH), STEM))
    return g


GLYPHS["dotlessi"] = (_sin_punto, 0x0131)
GLYPHS["acute"] = (lambda: _solo(_acute, 300, ALTO_MIN), 0x00B4)
GLYPHS["dieresis"] = (lambda: _solo(_dieresis, 300, ALTO_MIN), 0x00A8)
GLYPHS["tilde"] = (lambda: _solo(_tilde, 340, ALTO_MIN), 0x02DC)


def _solo(fn, W, alto):
    g = G(W)
    g.add(fn(W / 2.0, alto))
    return g


# ═══════════════════════════════════════════════════════════════════
#  GRIEGO — lo justo para escribir γαλήνη, que es de dónde viene
#  el nombre: la quietud del mar.
# ═══════════════════════════════════════════════════════════════════

@glyph("Gamma", 0x0393)
def g_Gamma():
    W = 552
    g = G(W)
    g.add(stroke((SBC + STEMC / 2, 0), (SBC + STEMC / 2, CAP), STEMC))
    g.add(bar(SBC, W - SBC + 10, CAP - THINC / 2.0, THINC))
    return g


@glyph("alpha", 0x03B1)
def g_alpha():
    W = 530
    g = G(W)
    xr = W - SB
    cx, rx = (SBR + xr) / 2.0, (xr - SBR) / 2.0
    g.add(diff(ring(cx, XH / 2.0, rx, XH / 2.0 + OVER, STEM, THIN),
               wedge((cx + rx * 0.20, XH / 2.0), -2, 68)))
    g.add(stroke((xr - STEM / 2, 0), (xr - STEM / 2, 400), STEM))
    return g


@glyph("gamma", 0x03B3)
def g_gamma():
    W = 470
    g = G(W)
    a = stroke((SB - 10, XH), (W / 2.0 + 14, 60), STEM * 0.94)
    b = stroke((W - SB + 12, XH), (SB + 26, DESC - 40), STEM * 0.94)
    g.add(trim(union(a, b), y0=DESC, y1=XH))
    return g


@glyph("lambda", 0x03BB)
def g_lambda():
    W = 520
    g = G(W)
    cx = W / 2.0 + 24
    a = stroke((cx, ASC + 40), (SB - 18, -60), STEM * 0.94)
    b = stroke((cx - 34, ASC - 66), (W - SB + 18, -60), STEM * 0.94)
    g.add(trim(union(a, b), y0=0, y1=ASC))
    return g


@glyph("nu", 0x03BD)
def g_nu():
    W = 452
    g = G(W)
    g.add(_uve(W, SB - 10, W - SB + 10, XH, 0, STEM * 0.94))
    return g


@glyph("eta", 0x03B7)
def g_eta():
    W = 508
    sxl, sxr, rxr, rxl = SB, SB + STEM, W - SB, W - SB - STEM
    g = G(W)
    g.add(stroke((sxl + STEM / 2, 0), (sxl + STEM / 2, XH), STEM))
    g.add(stroke((rxl + STEM / 2, DESC), (rxl + STEM / 2, 300), STEM))
    s, c = _hombro(sxl, sxr, rxl, rxr, XH)
    g.add(s)
    g.cut(c)
    return g


@glyph("etatonos", 0x03AE)
def g_etatonos():
    return _compuesto(g_eta, _acute, ALTO_MIN, -60)
