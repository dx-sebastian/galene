# -*- coding: utf-8 -*-
"""
GALENE — sistema de trazo.

Esto no dibuja un alfabeto de autor: dibuja una fuente de letra.
Nadie debería poder señalarla. Todo lo que llamaría la atención
—remates que se ensanchan, cortes con sesgo, terminales con gracia—
está fuera a propósito. Lo que queda son decisiones que solo se
notan cuando faltan: altura de x alta, aberturas amplias, trazo
casi uniforme, y las tildes lo bastante gruesas para sobrevivir.

Todo glifo se construye como:  union(sólidos) − union(contras)
"""

import math
import pathops
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.roundingPen import RoundingPen

# ═══════════════════════════════════════════════════════════════════
#  MÉTRICA
# ═══════════════════════════════════════════════════════════════════
UPM   = 1000
XH    = 520      # altura de x — 74% de la mayúscula
CAP   = 700
ASC   = 740
DESC  = -208
OVER  = 10       # sobrepaso de las redondas

STEM  = 94       # asta vertical, minúscula
STEMC = 100      # asta vertical, mayúscula
THIN  = 83       # trazo horizontal — 0.88 del vertical, solo la
THINC = 88       # corrección óptica. Contraste real: ninguno.

SB    = 62       # margen lateral, rectas minúsculas
SBR   = 44       # margen lateral, redondas minúsculas
SBC   = 74       # margen lateral, rectas mayúsculas
SBCR  = 48       # margen lateral, redondas mayúsculas


# ═══════════════════════════════════════════════════════════════════
#  PRIMITIVAS
# ═══════════════════════════════════════════════════════════════════

def _p():
    p = pathops.Path()
    return p, p.getPen()


def poly(*pts):
    p, pen = _p()
    pen.moveTo(pts[0])
    for q in pts[1:]:
        pen.lineTo(q)
    pen.closePath()
    return p


def rect(x0, y0, x1, y1):
    return poly((x0, y0), (x1, y0), (x1, y1), (x0, y1))


def limpia(p):
    """
    Normaliza un trazo antes de operarlo.

    Las booleanas de skia respetan el sentido de giro de cada contorno.
    Un rectángulo dibujado al revés se comporta como agujero, y al
    unirlo con otra pieza se anula justo donde se cruzan: sale un
    moño blanco en la unión. `simplify` deja cada pieza como una
    región limpia, con el sentido puesto, antes de tocarla.
    """
    crudo, pen = _p()
    # Redondear a entero ANTES de operar: la fuente se guarda en
    # enteros de todas formas, y con los cruces exactos las booleanas
    # dejan de escupir astillas de veinte unidades en cada unión.
    p.draw(RoundingPen(pen))
    # Y unir la pieza consigo misma, que es lo que le pone el sentido
    # canónico. Sin esto, un rectángulo dibujado al revés se comporta
    # como agujero y se ANULA contra el óvalo con el que se solapa:
    # la panza se despega del asta y queda un hueco en la unión.
    out, pen2 = _p()
    pathops.union([crudo], pen2, fix_winding=True)
    return out


def union(*paths):
    ps = []
    for a in paths:
        ps.extend(a) if isinstance(a, (list, tuple)) else ps.append(a)
    out, pen = _p()
    pathops.union([limpia(p) for p in ps], pen)
    return out


def diff(a, *bs):
    out, pen = _p()
    pathops.difference([limpia(a)], [limpia(b) for b in bs], pen)
    return out


def inter(a, b):
    out, pen = _p()
    pathops.intersection([limpia(a)], [limpia(b)], pen)
    return out


def xform(path, matrix):
    out, pen = _p()
    path.draw(TransformPen(pen, matrix))
    return out


def mirror_x(path, axis):
    return xform(path, (-1, 0, 0, 1, 2 * axis, 0))


def mirror_y(path, axis):
    return xform(path, (1, 0, 0, -1, 0, 2 * axis))


def rot180(path, cx, cy):
    return xform(path, (-1, 0, 0, -1, 2 * cx, 2 * cy))


def move(path, dx, dy):
    return xform(path, (1, 0, 0, 1, dx, dy))


# ── trazo recto ───────────────────────────────────────────────────

def stroke(p0, p1, w, ext0=0.0, ext1=0.0):
    """Trazo de grosor constante, cortado en perpendicular."""
    x0, y0 = p0
    x1, y1 = p1
    dx, dy = x1 - x0, y1 - y0
    L = math.hypot(dx, dy)
    ux, uy = dx / L, dy / L
    nx, ny = -uy * w / 2.0, ux * w / 2.0
    ax, ay = x0 - ux * ext0, y0 - uy * ext0
    bx, by = x1 + ux * ext1, y1 + uy * ext1
    return poly((ax + nx, ay + ny), (bx + nx, by + ny),
                (bx - nx, by - ny), (ax - nx, ay - ny))


def bar(x0, x1, cy, h, **kw):
    return stroke((x0, cy), (x1, cy), h, **kw)


# ── curvas ────────────────────────────────────────────────────────

# k = 0.60 en vez del 0.5523 de la elipse: la curva sale algo
# cuadrada. Es lo único que esta letra tiene de propio, y no es un
# gesto — es lo que la hace sentirse asentada en vez de blanda.
def oval(cx, cy, rx, ry, k=0.60):
    p, pen = _p()
    pen.moveTo((cx + rx, cy))
    pen.curveTo((cx + rx, cy + ry * k), (cx + rx * k, cy + ry), (cx, cy + ry))
    pen.curveTo((cx - rx * k, cy + ry), (cx - rx, cy + ry * k), (cx - rx, cy))
    pen.curveTo((cx - rx, cy - ry * k), (cx - rx * k, cy - ry), (cx, cy - ry))
    pen.curveTo((cx + rx * k, cy - ry), (cx + rx, cy - ry * k), (cx + rx, cy))
    pen.closePath()
    return p


def ring(cx, cy, rx, ry, wv, wh, k=0.60, ki=None):
    """Anillo de eje vertical: grueso a los lados, fino arriba y abajo."""
    ki = (k + 0.018) if ki is None else ki
    return diff(oval(cx, cy, rx, ry, k),
                oval(cx, cy, rx - wv, ry - wh, ki))


def wedge(apex, a0, a1, R=2400, steps=12):
    """Sector angular, para restar."""
    pts = [apex]
    for i in range(steps + 1):
        a = math.radians(a0 + (a1 - a0) * i / steps)
        pts.append((apex[0] + math.cos(a) * R, apex[1] + math.sin(a) * R))
    return poly(*pts)


def arco(cx, cy, rx, ry, wv, wh, a0, a1, k=0.60, ki=None, apex=None):
    """Tramo de anillo entre dos ángulos (grados, antihorario)."""
    r = ring(cx, cy, rx, ry, wv, wh, k, ki)
    return diff(r, wedge(apex or (cx, cy), a1, a0 + 360))


def cut(pt, ang_deg, size=2400):
    """Semiplano a restar: se quita lo que queda a la derecha del avance."""
    ang = math.radians(ang_deg)
    dx, dy = math.cos(ang), math.sin(ang)
    px, py = -dy, dx
    x, y = pt
    a = (x - dx * size, y - dy * size)
    b = (x + dx * size, y + dy * size)
    return poly(a, b, (b[0] - px * size, b[1] - py * size),
                (a[0] - px * size, a[1] - py * size))


def punto(cx, cy, r):
    return oval(cx, cy, r, r, 0.60)


def engrosa(nodos, w, cx=None, cy=None):
    """
    Engrosa un esqueleto abierto. Es la salida limpia para la s y la
    S: una cinta continua no se puede armar pegando arcos —siempre
    queda un pellizco en la cintura—, pero sí se puede dibujar como
    línea y darle grosor de una vez.

    `nodos` = [P0, (c1, c2, P1), (c1, c2, P2), ...]
    Si se dan cx, cy, la segunda mitad es la primera girada 180°.
    """
    p, pen = _p()
    P0 = nodos[0]
    segs = list(nodos[1:])
    pen.moveTo(P0)
    for c1, c2, q in segs:
        pen.curveTo(c1, c2, q)
    if cx is not None:
        def R(q):
            return (2 * cx - q[0], 2 * cy - q[1])
        anteriores = [P0] + [q for _, _, q in segs[:-1]]
        for (c1, c2, _), nodo in zip(reversed(segs), reversed(anteriores)):
            pen.curveTo(R(c2), R(c1), R(nodo))
    pen.endPath()
    p.stroke(w, pathops.LineCap.BUTT_CAP, pathops.LineJoin.ROUND_JOIN, 4.0)
    p.convertConicsToQuads(0.05)   # el engrosador deja cónicas
    pathops.simplify(p)
    return p


# ═══════════════════════════════════════════════════════════════════

class G:
    def __init__(self, width):
        self.width = width
        self._solid = []
        self._holes = []

    def add(self, *ps):
        self._solid.extend(ps)
        return self

    def cut(self, *ps):
        self._holes.extend(ps)
        return self

    def path(self):
        if not self._solid:
            out, _ = _p()
            return out
        u = union(*self._solid)
        if self._holes:
            u = diff(u, union(*self._holes))
        out, pen = _p()
        pathops.union([u], pen, clockwise=True)   # sentido TrueType
        # fuera los contornos degenerados que deja el engrosador
        limpio, pen2 = _p()
        for c in out.contours:
            if abs(c.area) >= 1.0:
                c.draw(pen2)
        return limpio
