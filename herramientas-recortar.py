"""Recorta el fondo de las láminas del ave.

El fondo —blanco en unas, papel crema en otras— es siempre una REGIÓN
CONECTADA QUE TOCA LOS BORDES. Por eso se resuelve con relleno desde el
borde y no con una clave de luminancia: la clave le haría agujeros a la
panza clara del ave, que es igual de clara pero está encerrada.

Y el borde se calcula por distancia de color, no por umbral duro, para
que las plumas disueltas en el papel conserven su alfa parcial. Un
recorte duro en una acuarela se nota más que el fondo.
"""
import sys, glob, os
from collections import deque
from PIL import Image

DURO = 16     # por debajo de esto es fondo seguro
SUAVE = 74    # por encima de esto es sujeto seguro


def recortar(ruta, destino):
    im = Image.open(ruta).convert('RGBA')
    w, h = im.size
    px = im.load()

    # Color de fondo: mediana del marco exterior
    marco = []
    for x in range(0, w, 4):
        marco.append(px[x, 0][:3]); marco.append(px[x, h - 1][:3])
    for y in range(0, h, 4):
        marco.append(px[0, y][:3]); marco.append(px[w - 1, y][:3])
    fondo = tuple(sorted(c[i] for c in marco)[len(marco) // 2] for i in range(3))

    def dist(c):
        return max(abs(c[0] - fondo[0]), abs(c[1] - fondo[1]), abs(c[2] - fondo[2]))

    visto = bytearray(w * h)
    cola = deque()
    for x in range(w):
        for y in (0, h - 1):
            if not visto[y * w + x] and dist(px[x, y]) < SUAVE:
                visto[y * w + x] = 1; cola.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if not visto[y * w + x] and dist(px[x, y]) < SUAVE:
                visto[y * w + x] = 1; cola.append((x, y))

    while cola:
        x, y = cola.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not visto[ny * w + nx]:
                if dist(px[nx, ny]) < SUAVE:
                    visto[ny * w + nx] = 1
                    cola.append((nx, ny))

    borrados = 0
    for y in range(h):
        fila = y * w
        for x in range(w):
            if not visto[fila + x]:
                continue
            r, g, b, a = px[x, y]
            d = dist((r, g, b))
            if d <= DURO:
                na = 0
            else:
                na = int(255 * min(1.0, (d - DURO) / (SUAVE - DURO)))
            if na < a:
                px[x, y] = (r, g, b, na)
                if na == 0:
                    borrados += 1

    im.save(destino)
    return 100 * borrados / (w * h), fondo


if __name__ == '__main__':
    entrada, salida = sys.argv[1], sys.argv[2]
    os.makedirs(salida, exist_ok=True)
    for f in sorted(glob.glob(os.path.join(entrada, 'ave*.png'))):
        n = os.path.basename(f)
        if 'maestra' in n:
            continue
        pct, fondo = recortar(f, os.path.join(salida, n))
        print(f'{n:12} fondo rgb{fondo}  transparente {pct:.1f}%')
