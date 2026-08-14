"""Parte la rejilla 2x2 de las resonancias y recorta cada lamina.

La entrada es una sola imagen con cuatro dibujos y un canal blanco en
cruz. La salida son cuatro WebP con alfa, del mismo tamano y con el mismo
aire alrededor, listos para sustituir a los SVG de Resonancias.astro.

TRES COSAS SE MIDEN, NO SE SUPONEN:

1 · DONDE ESTA EL CANAL. No se parte por la mitad: se busca la franja
    blanca del centro. Medido en la rejilla del 13 ago 2026: el canal es
    blanco (254,254,254), mide 14 px y deja paneles de 620x620 exactos.
    Partir por la mitad habria metido 7 px de blanco en cada panel, y
    sobre el papel del sitio eso es un filo claro alrededor del dibujo.

2 · LOS UMBRALES DEL RECORTE. El fondo es una REGION CONECTADA QUE TOCA
    EL BORDE, asi que se resuelve con relleno desde el borde y nunca con
    clave de luminancia — la clave le abre agujeros a lo que es claro
    pero esta encerrado, que aqui son los lavados palidos.

    Y los umbrales salen de la propia lamina: el crema tiene un ruido
    maximo de 2 niveles y el lavado verde mas palido esta a 14 del crema.
    Con los umbrales del recortador de aves (16/74) ese lavado entra
    dentro del margen de fondo y el relleno se come el circulo entero.
    Por eso aqui son 4 y 11: el ruido del papel se va, el lavado se queda.

3 · EL ENCUADRE COMUN. Cada dibujo trae su propio margen del generador
    (uno ocupa 463x417 y otro 419x461). Puestos tal cual en una rejilla,
    cada uno pesa distinto. Se recorta cada uno a su tinta y se vuelve a
    montar en el MISMO lienzo, escalado para caber en la misma caja. El
    hueco de abajo no es un descuido: es donde aterriza el figcaption,
    que sube -1.25rem sobre la imagen.

    python arte-resonancias.py <rejilla.png> [destino]
"""
import sys, os, statistics as st
from collections import deque
from PIL import Image

# Umbrales medidos sobre esta rejilla (ver cabecera).
DURO = 4      # por debajo de esto es papel seguro -> alfa 0
SUAVE = 11    # por encima de esto es dibujo seguro -> alfa intacto

# El filo del panel, contra el canal blanco, no es crema: es una rampa de
# unos pocos pixeles hacia el blanco. A 11 de umbral eso NO es fondo, asi
# que el relleno no podia entrar y cada lamina salia con un marco opaco de
# un pixel — que el recuadro delataba en el acto: la tinta medida ocupaba
# el alto ENTERO del panel (620) en vez de sus 417 reales.
#
# Se arregla por los dos lados: se tira el filo, y el fondo deja de ser un
# solo color para ser DOS, crema y blanco. Ningun trazo de estas cuatro
# laminas es mas claro que el papel, asi que tomar tambien el blanco por
# fondo no puede comerse nada; y lo que si es casi blanco —la panza de la
# paloma— esta encerrado por su propio contorno, y el relleno, que solo
# avanza por lo conectado, no llega ahi.
GUARDA = 3
BLANCO = (254, 254, 254)

# El lienzo comun y la caja donde vive el dibujo dentro de el.
LIENZO = (600, 620)
CAJA = (42, 30, 516, 470)     # x, y, ancho, alto disponibles para la tinta

NOMBRES = ['libertad', 'vacio', 'noche', 'cuerpo']


def mediana_marco(im):
    """El color del papel: mediana del marco exterior."""
    w, h = im.size
    p = im.load()
    m = []
    for x in range(0, w, 2):
        m.append(p[x, 0]); m.append(p[x, h - 1])
    for y in range(0, h, 2):
        m.append(p[0, y]); m.append(p[w - 1, y])
    return tuple(int(st.median([c[i] for c in m])) for i in range(3))


def buscar_canal(im):
    """Encuentra la franja blanca central en x y en y.

    Devuelve (x0, x1, y0, y1) con los limites del canal. Se busca la
    banda contigua de filas/columnas mas claras que el papel alrededor
    del centro; si no aparece, se avisa en vez de partir a ciegas.
    """
    w, h = im.size
    p = im.load()
    papel = mediana_marco(im)

    def es_canal_col(x):
        # Una columna del canal es MAS CLARA que el papel en casi todo su alto.
        claros = sum(1 for y in range(0, h, 4)
                     if p[x, y][0] > papel[0] + 2 and p[x, y][2] > papel[2] + 6)
        return claros > (h // 4) * 0.9

    def es_canal_fil(y):
        claros = sum(1 for x in range(0, w, 4)
                     if p[x, y][0] > papel[0] + 2 and p[x, y][2] > papel[2] + 6)
        return claros > (w // 4) * 0.9

    def banda(prueba, n):
        centro = n // 2
        if not prueba(centro):
            # el centro exacto puede caer en el filo: se busca a los lados
            for d in range(1, 30):
                if prueba(centro - d): centro -= d; break
                if prueba(centro + d): centro += d; break
            else:
                return None
        a = b = centro
        while a > 0 and prueba(a - 1): a -= 1
        while b < n - 1 and prueba(b + 1): b += 1
        return a, b

    cx = banda(es_canal_col, w)
    cy = banda(es_canal_fil, h)
    return cx, cy, papel


def recortar_fondo(panel):
    """Alfa desde el borde. Devuelve (imagen RGBA, % transparente, papel)."""
    im = panel.convert('RGBA')
    w, h = im.size
    px = im.load()
    papel = mediana_marco(panel.convert('RGB'))

    def dist(c):
        a = max(abs(c[0] - papel[0]), abs(c[1] - papel[1]), abs(c[2] - papel[2]))
        b = max(abs(c[0] - BLANCO[0]), abs(c[1] - BLANCO[1]), abs(c[2] - BLANCO[2]))
        return min(a, b)

    visto = bytearray(w * h)
    cola = deque()

    def sembrar(x, y):
        i = y * w + x
        if not visto[i] and dist(px[x, y]) < SUAVE:
            visto[i] = 1
            cola.append((x, y))

    for x in range(w):
        sembrar(x, 0); sembrar(x, h - 1)
    for y in range(h):
        sembrar(0, y); sembrar(w - 1, y)

    while cola:
        x, y = cola.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not visto[ny * w + nx]:
                if dist(px[nx, ny]) < SUAVE:
                    visto[ny * w + nx] = 1
                    cola.append((nx, ny))

    fuera = 0
    for y in range(h):
        fila = y * w
        for x in range(w):
            if not visto[fila + x]:
                continue
            r, g, b, a = px[x, y]
            d = dist((r, g, b))
            # Rampa suave entre DURO y SUAVE: un recorte duro en una
            # acuarela se nota mas que el fondo que se queria quitar.
            na = 0 if d <= DURO else int(255 * min(1.0, (d - DURO) / (SUAVE - DURO)))
            if na < a:
                px[x, y] = (r, g, b, na)
                if na == 0:
                    fuera += 1
    return im, 100 * fuera / (w * h), papel


def montar(lamina):
    """Recorta a la tinta y la vuelve a montar en el lienzo comun."""
    caja = lamina.getbbox()               # bbox del alfa
    tinta = lamina.crop(caja)
    tw, th = tinta.size
    cx, cy, cw, ch = CAJA
    escala = min(cw / tw, ch / th)
    nw, nh = max(1, round(tw * escala)), max(1, round(th * escala))
    tinta = tinta.resize((nw, nh), Image.LANCZOS)

    lienzo = Image.new('RGBA', LIENZO, (0, 0, 0, 0))
    lienzo.alpha_composite(tinta, (cx + (cw - nw) // 2, cy + (ch - nh) // 2))
    return lienzo, caja, escala, (nw, nh)


def main():
    entrada = sys.argv[1] if len(sys.argv) > 1 else None
    destino = sys.argv[2] if len(sys.argv) > 2 else 'public/arte/resonancias'
    if not entrada:
        print(__doc__)
        sys.exit(1)
    os.makedirs(destino, exist_ok=True)

    rejilla = Image.open(entrada).convert('RGB')
    W, H = rejilla.size
    cx, cy, papel = buscar_canal(rejilla)
    if not cx or not cy:
        print('No se encontro el canal blanco. Revisa la rejilla a mano.')
        sys.exit(2)

    print(f'rejilla {W}x{H}  papel rgb{papel}')
    print(f'canal vertical  x[{cx[0]},{cx[1]}]  ({cx[1]-cx[0]+1} px)')
    print(f'canal horizontal y[{cy[0]},{cy[1]}]  ({cy[1]-cy[0]+1} px)\n')

    g = GUARDA
    paneles = [
        (g, g, cx[0] - g, cy[0] - g),
        (cx[1] + 1 + g, g, W - g, cy[0] - g),
        (g, cy[1] + 1 + g, cx[0] - g, H - g),
        (cx[1] + 1 + g, cy[1] + 1 + g, W - g, H - g),
    ]

    for nombre, rect in zip(NOMBRES, paneles):
        panel = rejilla.crop(rect)
        cortada, pct, pap = recortar_fondo(panel)
        lienzo, caja, escala, tam = montar(cortada)
        ruta = os.path.join(destino, nombre + '.webp')
        lienzo.save(ruta, 'WEBP', quality=90, method=6)
        kb = os.path.getsize(ruta) / 1024
        print(f'{nombre:9} panel {panel.size[0]}x{panel.size[1]} rgb{pap}  '
              f'transparente {pct:.1f}%')
        print(f'{"":9} tinta {caja[2]-caja[0]}x{caja[3]-caja[1]} '
              f'-> x{escala:.3f} -> {tam[0]}x{tam[1]} en {LIENZO[0]}x{LIENZO[1]}  '
              f'{kb:.1f} KB')


if __name__ == '__main__':
    main()
