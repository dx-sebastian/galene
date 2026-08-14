"""Prepara las láminas de la sesión del 12 de agosto para el motor.

Hermano de `herramientas-recortar.py`, que hace lo mismo para las hojas
del ave. Aquí el recorte no es siempre el mismo, porque el ALFA NO
SIGNIFICA LO MISMO en todas las láminas:

- En el pasto y en el árbol, el alfa es COBERTURA DE PIGMENTO: cuánta
  pintura hay en ese píxel. El papel —incluido el que asoma dentro de un
  trazo de pincel seco— tiene que quedar transparente, porque debajo ya
  hay papel de verdad y es el que tiene que verse. Se resuelve con clave
  de color contra el papel.

- En la luna es al revés y es lo que hace que la lámina funcione: el
  alfa es LUZ. El shader no pinta la lámina, pinta `u_reguero` —el color
  claro de la hora— con el peso que dice el alfa. Así que lo que tiene
  que llevar alfa es el DISCO, que es papel sin tocar, y la aguada de
  alrededor tiene que ir a cero. Una clave de color pura no vale: el
  papel del disco y el papel de fuera del cuadro son el mismo color.
  Por eso hay que combinar las dos cosas — relleno desde el borde para
  saber qué papel está FUERA, y clave de claridad para el que está
  dentro.

Uso:  python arte-preparar.py
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

DESCARGAS = os.path.expanduser('~/Downloads')
ARTE = 'public/arte'


def cargar(nombre):
    return Image.open(os.path.join(DESCARGAS, nombre)).convert('RGBA')


def color_papel(a):
    """El color del papel.

    NO se saca del marco exterior, y ese fue el primer error: estas
    hojas vienen recortadas con transparencia alrededor, así que el
    marco no tiene papel — tiene nada. Al no encontrar nada opaco en el
    borde, la primera versión cayó a la mediana de TODA la hoja, que en
    la lámina del árbol incluye el árbol: le salió un papel gris de
    rgb(224,224,224) y con ese umbral no borró nada.

    Se saca de LO CLARO Y OPACO: el papel es siempre la mayoría de la
    hoja y siempre lo más claro que hay en ella —en acuarela no existe
    pintura más clara que el papel—, así que la mediana del tercio más
    luminoso lo encuentra sin depender de dónde esté."""
    plano = a.reshape(-1, 4)
    opacos = plano[plano[:, 3] > 200][:, :3]
    if len(opacos) < 50:
        opacos = plano[:, :3]
    lum = opacos.mean(axis=1)
    corte = np.percentile(lum, 67)
    return np.median(opacos[lum >= corte], axis=0)


def distancia(a, papel):
    """Distancia de color al papel, por canal y quedándonos con la mayor.
    Igual que herramientas-recortar.py: un pigmento pálido se separa del
    papel por un canal aunque los otros dos empaten."""
    return np.max(np.abs(a[..., :3].astype(np.float32) - papel), axis=-1)


def clave_pigmento(im, duro=14, suave=64):
    """Alfa = cuánta pintura hay. Con rampa entre los dos umbrales para
    que un borde disuelto conserve su alfa parcial: un recorte duro en
    una acuarela se nota más que el fondo que quita."""
    a = np.asarray(im).astype(np.float32)
    papel = color_papel(a)
    d = distancia(a, papel)
    alfa = np.clip((d - duro) / (suave - duro), 0, 1)
    alfa = np.minimum(alfa, a[..., 3] / 255.0)     # respeta lo ya transparente
    salida = a.copy()
    salida[..., 3] = alfa * 255
    return Image.fromarray(salida.astype(np.uint8), 'RGBA'), papel


def fuera_por_relleno(a, papel, suave=20):
    """Qué papel está FUERA del motivo: la región conectada de papel que
    toca el borde. Lo de dentro —el disco de la luna— queda a salvo
    aunque sea del mismo color, que es justo la razón de hacerlo así y
    no con un umbral.

    EL UMBRAL VA MUY CORTO, 20 y no 64, y es lo que decide si esto
    funciona. Con 64 una aguada pálida —un azul grisáceo a 39 de
    distancia del papel— contaba como papel, así que el relleno la
    atravesaba por su parte más diluida, entraba en el disco de la luna
    y lo borraba entero: el motivo dejaba de tener luna y se quedaba
    solo con el sol. La barrera tiene que ser el primer rastro de
    pigmento, no el pigmento denso."""
    esPapel = (distancia(a, papel) < suave) | (a[..., 3] < 128)
    etiquetas, n = ndimage.label(esPapel)
    if n == 0:
        return np.zeros(esPapel.shape, bool)
    del_borde = set(etiquetas[0].tolist()) | set(etiquetas[-1].tolist()) \
              | set(etiquetas[:, 0].tolist()) | set(etiquetas[:, -1].tolist())
    del_borde.discard(0)
    return np.isin(etiquetas, list(del_borde))


def guardar(im, nombre, ancho_max=2048):
    """Escribe la lámina en `arte/` y su gemela en `arte/1024/`, que es
    el juego que se bajan los teléfonos: la mitad de bytes y la cuarta
    parte de memoria de textura."""
    w, h = im.size
    esc = min(1.0, ancho_max / max(w, h))
    grande = im.resize((round(w * esc), round(h * esc)), Image.LANCZOS) if esc < 1 else im
    grande.save(os.path.join(ARTE, nombre), 'WEBP', quality=92, method=6)
    g = grande.size
    chica = grande.resize((max(1, g[0] // 2), max(1, g[1] // 2)), Image.LANCZOS)
    chica.save(os.path.join(ARTE, '1024', nombre), 'WEBP', quality=90, method=6)
    a = np.asarray(grande)[..., 3] / 255.0
    print(f'  {nombre:22s} {grande.size[0]}x{grande.size[1]}  '
          f'alfa media {a.mean():.3f}  opaco {(a > 0.9).mean() * 100:.1f}%  '
          f'vacio {(a < 0.02).mean() * 100:.1f}%')


def medir_discos(alfa):
    """Los dos discos de la luna TIENEN que medir lo mismo y estar
    centrados en su celda: el motor elige celda según la hora, así que
    cualquier diferencia se vería como un salto de tamaño al amanecer.
    Esto lo comprueba en vez de suponerlo."""
    h, w = alfa.shape
    out = []
    for i in (0, 1):
        celda = alfa[:, i * w // 2:(i + 1) * w // 2]
        ys, xs = np.nonzero(celda > 0.75)
        if len(xs) == 0:
            out.append(None); continue
        cx, cy = xs.mean(), ys.mean()
        r = np.sqrt(len(xs) / np.pi)
        ch, cw = celda.shape
        out.append({'cx': cx / cw, 'cy': cy / ch, 'r': r / cw})
    return out


# ═══════════════════════════════════════════════════════════════════
print('L1 · luna.png — el alfa es LUZ, no recorte')
im = cargar('Gemini_Generated_Image_ti5e2cti5e2cti5e.png')
a0 = np.asarray(im).astype(np.float32)
_ys0, _xs0 = np.nonzero(np.asarray(im)[..., 3] > 128)
a = a0[_ys0.min():_ys0.max() + 1, _xs0.min():_xs0.max() + 1].copy()
papel = color_papel(a)

# ── EL DISCO ES PAPEL ENCERRADO ────────────────────────────────────
# Dos intentos anteriores fallaron y los dos por lo mismo: preguntaban
# «¿este píxel es claro?», y el papel del disco y el papel del margen
# son EL MISMO COLOR. Rellenar desde el borde tampoco valió, porque la
# hoja trae su propio canto pintado y el relleno se quedaba fuera: el
# 97 % del papel interior seguía opaco y la luna salía como un cuadrado
# luminoso con el disco tramado dentro.
#
# La pregunta correcta no es de color, es de TOPOLOGÍA. Un disco
# reservado es, por definición, papel COMPLETAMENTE RODEADO de
# pigmento; el papel del margen no lo está. Así que se marca dónde hay
# pintura, se rellenan los huecos de esa máscara —lo que tapa
# exactamente los agujeros cerrados— y la diferencia entre lo relleno y
# lo pintado ES el disco. Sin umbrales de claridad y sin depender de
# dónde empiece la hoja.
pigmento = distancia(a, papel) > 15
pigmento = ndimage.binary_closing(pigmento, np.ones((5, 5)))
encerrado = ndimage.binary_fill_holes(pigmento) & ~pigmento
# UNO POR CELDA, y ni uno más. La aguada deja motas de papel encerradas
# por todas partes —seis pasaban el filtro de tamaño— y cada una habría
# pintado una luz suelta en el cielo. Pero de esto se sabe algo que
# ningún umbral sabe: en cada mitad de la hoja hay EXACTAMENTE un astro.
# Así que se parte por la mitad y en cada mitad se conserva el hueco
# mayor. El resto es aguada, y la aguada no es luz.
etq, n = ndimage.label(encerrado)
mitad = encerrado.shape[1] // 2
elegidos = []
for celda in (slice(0, mitad), slice(mitad, encerrado.shape[1])):
    ids, cuenta = np.unique(etq[:, celda][encerrado[:, celda]], return_counts=True)
    if len(ids):
        elegidos.append(int(ids[np.argmax(cuenta)]))
encerrado = np.isin(etq, elegidos)
print(f'  huecos hallados: {n}  ·  conservados: {len(elegidos)}'
      f'  ·  {encerrado.mean() * 100:.1f}% del cuadro')
alfa = ndimage.gaussian_filter(encerrado.astype(np.float32), sigma=2.2)
alfa = np.clip((alfa - 0.30) / 0.45, 0, 1)
# SE RECORTA A LA HOJA ANTES DE RELLENAR. La hoja viene con un margen
# transparente y con su propio canto pintado, y ese canto es una barrera:
# el relleno arrancaba en el margen, chocaba con el borde de la hoja y no
# entraba nunca — marcaba un 2.5 % del cuadro y dejaba TODO el papel
# interior opaco. El resultado era un cuadrado luminoso con un disco
# moteado dentro, que es peor que la lámina que venía a sustituir.
print(f'  papel rgb{tuple(int(v) for v in papel)}')
sal = a.copy(); sal[..., 3] = alfa * 255
antes = medir_discos(alfa)
for i, d in enumerate(antes):
    print(f'  {"luna" if i == 0 else "sol "} medido: centro ({d["cx"]:.3f}, {d["cy"]:.3f})'
          f'  radio {d["r"]:.3f}')

# ── SE IGUALAN LOS DOS DISCOS ──────────────────────────────────────
# El pintor no puede clavar dos círculos idénticos a mano, y no tiene
# por qué: salieron con un 7 % de diferencia de radio y descentrados uno
# respecto del otro. Pero el motor conmuta de celda con un corte DURO
# —floor(esSol + 0.5)— así que esa diferencia se vería como un salto de
# tamaño del astro a media mañana. Cada celda se reencuadra para que su
# disco quede en el centro y con el radio medio de los dos. Se mueve el
# encuadre, no se retoca la pintura.
objetivo = sum(d['r'] for d in antes) / len(antes)
img = Image.fromarray(sal.astype(np.uint8), 'RGBA')
W, H = img.size
celdas = []
for i, d in enumerate(antes):
    celda = img.crop((i * W // 2, 0, (i + 1) * W // 2, H))
    cw, ch = celda.size
    k = d['r'] / objetivo               # >1 = el disco es grande, hay que alejarse
    # Afín inversa: destino -> origen. PIL toma (a,b,c,d,e,f).
    c = d['cx'] * cw - 0.5 * cw * k
    f = d['cy'] * ch - 0.5 * ch * k
    celdas.append(celda.transform((cw, ch), Image.AFFINE, (k, 0, c, 0, k, f),
                                  resample=Image.BICUBIC))
igual = Image.new('RGBA', (W, H), (0, 0, 0, 0))
for i, c in enumerate(celdas):
    igual.paste(c, (i * W // 2, 0))
for i, d in enumerate(medir_discos(np.asarray(igual)[..., 3] / 255.0)):
    print(f'  {"luna" if i == 0 else "sol "} igualado: centro ({d["cx"]:.3f}, {d["cy"]:.3f})'
          f'  radio {d["r"]:.3f}')
guardar(igual, 'astro.webp')

# ═══════════════════════════════════════════════════════════════════
print('L2 · estrellas.png — opaca, y se refleja al repetir')
im = cargar('Gemini_Generated_Image_m4cv5jm4cv5jm4cv.png')
a = np.asarray(im)
# Se recorta al interior sólido: el canto izquierdo viene deshilachado y
# con transparencia, y al repetir la lámina ese jirón se vería.
op = a[..., 3] > 235
ys, xs = np.nonzero(op)
x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
rec = a[y0:y1 + 1, x0:x1 + 1].copy()
rec[..., 3] = 255
print(f'  recortada a {rec.shape[1]}x{rec.shape[0]} (de {a.shape[1]}x{a.shape[0]})')
guardar(Image.fromarray(rec, 'RGBA'), 'estrellas.webp')

# ═══════════════════════════════════════════════════════════════════
print('L3 · arbol-seccion2.png — el papel de dentro también se va')
im = cargar('Gemini_Generated_Image_4mbp9m4mbp9m4mbp.png')
rec, papel = clave_pigmento(im, duro=10, suave=52)
a = np.asarray(rec)
ys, xs = np.nonzero(a[..., 3] > 20)
m = 8
rec = Image.fromarray(a[max(0, ys.min() - m):ys.max() + m,
                        max(0, xs.min() - m):xs.max() + m], 'RGBA')
print(f'  papel rgb{tuple(int(v) for v in papel)}  recortada a {rec.size[0]}x{rec.size[1]}')
guardar(rec, 'arbol-tinta.webp', ancho_max=1024)

# ═══════════════════════════════════════════════════════════════════
print('L5 · pasto-matas.png — reemplaza a corales.webp')
im = cargar('Gemini_Generated_Image_pp4zqopp4zqopp4z.png')
# Umbral bajo: la línea de arena es un ocre pálido y con la clave dura
# se perdía entera, y es lo que ancla las matas al fondo.
rec, papel = clave_pigmento(im, duro=8, suave=46)
print(f'  papel rgb{tuple(int(v) for v in papel)}')
guardar(rec, 'corales.webp')

print('\nHecho.')
