"""Prepara las siete láminas premium subidas el 20 de agosto de 2026.

Hermano de `arte-preparar.py`, con las decisiones de ESTA hornada:

- Las aguas entran tal cual (el motor las repite ESPEJADAS, así que la
  costura se vuelve simetría y no hace falta tiling), y sus gemelas
  calmas se derivan POR CÓDIGO de la misma hoja —desenfoque horizontal
  largo, contraste recogido, un punto más claras— para que el cross-fade
  del gesto de calmar quede registrado al píxel, que es lo que un par
  generado aparte no puede dar.

- El atlas de nubes viene sobre negro puro: el negro se convierte en
  alfa con la rampa 0–32 de siempre, el RGB se fuerza a luminancia
  neutra (el color lo pone la hora) y los bordes se des-premultiplican
  para que el canto de una nube no arrastre el negro del fondo.

- El reguero nuevo comparte hoja con la espuma: aquí se recorta la
  celda izquierda (el camino). La celda derecha queda en el PNG fuente
  para cuando el motor aprenda a leerla.

- El manglar y las aves entran directos: ya traen alfa de verdad.

Uso:  python3 arte-premium.py
"""
import os
import numpy as np
from PIL import Image, ImageFilter

ARTE = 'public/arte'
JUEGOS = [(ARTE, 2048), (os.path.join(ARTE, '1024'), 1024),
          (os.path.join(ARTE, '768'), 768)]


def guardar(im, nombre, calidad=82):
    for carpeta, ancho in JUEGOS:
        os.makedirs(carpeta, exist_ok=True)
        copia = im
        if im.width > ancho:
            k = ancho / im.width
            copia = im.resize((ancho, round(im.height * k)), Image.LANCZOS)
        copia.save(os.path.join(carpeta, nombre + '.webp'),
                   quality=calidad, method=6)
        print(' ', os.path.join(carpeta, nombre + '.webp'), copia.size)


def calmar(im, fuerza=1.0):
    """La gemela calma, por edición: el viento cae. Aplana las crestas
    con un desenfoque MUY anisótropo (mucho en horizontal, poco en
    vertical: las bandas sobreviven, los picos no), recoge el contraste
    y aclara un pelo — un agua en calma refleja más cielo."""
    a = im.convert('RGB')
    r_h = max(6, int(im.width * 0.011 * fuerza))
    r_v = max(2, int(im.height * 0.006 * fuerza))
    suave = a.filter(ImageFilter.GaussianBlur(0))  # base
    # PIL no tiene gauss anisótropo: se estira, desenfoca y devuelve.
    chico = a.resize((im.width // 4, im.height), Image.LANCZOS)
    chico = chico.filter(ImageFilter.GaussianBlur(r_h / 4))
    suave = chico.resize((im.width, im.height), Image.LANCZOS)
    suave = suave.filter(ImageFilter.GaussianBlur(r_v * 0.5))
    arr = np.asarray(suave).astype(np.float32)
    media = arr.mean()
    arr = (arr - media) * 0.82 + media          # contraste recogido
    arr = np.clip(arr * 1.045 + 4.0, 0, 255)    # un punto más clara
    return Image.fromarray(arr.astype(np.uint8), 'RGB')


def atlas_nubes(im):
    """Negro puro → alfa (rampa 0–32), RGB a luminancia neutra,
    des-premultiplicado en los bordes."""
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    lum = a @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    alfa = np.clip(lum / 32.0, 0.0, 1.0)
    gris = np.where(alfa > 0.02, np.minimum(255.0, lum / np.maximum(alfa, 0.02)), 0.0)
    salida = np.stack([gris, gris, gris, alfa * 255.0], axis=-1)
    return Image.fromarray(salida.astype(np.uint8), 'RGBA')


print('mar lejano (sereno):')
guardar(Image.open('Estudio sereno de agua en acuarela.png').convert('RGB'),
        'mar-lejano-v2')

print('mar medio (superficie) y su calma:')
medio = Image.open('Superficie de agua en acuarela.png').convert('RGB')
guardar(medio, 'mar-medio-v2')
guardar(calmar(medio, 1.0), 'mar-medio-v2-calmo')

print('mar cercano (olas) y su calma:')
cerca = Image.open('Estudio de olas en acuarela.png').convert('RGB')
guardar(cerca, 'mar-cercano-v2')
guardar(calmar(cerca, 1.4), 'mar-cercano-v2-calmo')

print('atlas de nubes v4:')
guardar(atlas_nubes(Image.open('Estudios de nubes en acuarela gris.png')),
        'cielo-atlas-v4', calidad=86)

print('manglar v3:')
guardar(Image.open('Manglar acuarelado con raíces entrelazadas.png')
        .convert('RGBA'), 'manglar-v3', calidad=86)

print('reguero v2 (celda izquierda de la hoja de espuma):')
hoja = Image.open('Reflejos y espuma acuarela en transparencia.png').convert('RGBA')
guardar(hoja.crop((0, 0, 723, hoja.height)), 'reguero-v2', calidad=86)

print('bandada lejana:')
guardar(Image.open('Tres aves en vuelo acuarela.png').convert('RGBA'),
        'garza-bandada', calidad=86)

print('listo.')
