"""Comprueba que no hay comillas invertidas dentro del GLSL de mar.js.

El shader vive en un template literal, asi que UNA SOLA comilla
invertida en un comentario corta el archivo por la mitad y tumba el mar
entero — no la capa que se estuviera tocando: el mar entero, y con el
las garzas, la luz de la hora y el paralaje.

Ha pasado CUATRO veces en este proyecto y siempre por lo mismo: citar el
nombre de una variable en un comentario con el mismo formato de Markdown
que usa el resto del codigo, por costumbre.

Estaba escrito en la bitacora, en mayusculas, y volvio a pasar igual. Lo
que no se comprueba no es una regla: es una intencion.

    python comprobar-glsl.py
"""
import sys
from pathlib import Path

COMILLA = chr(96)

lineas = Path('src/js/mar.js').read_text(encoding='utf-8').splitlines()
dentro, malas = False, []
for n, l in enumerate(lineas, 1):
    if not dentro and ('const FS = ' + COMILLA in l or 'const VS = ' + COMILLA in l):
        dentro = True
        continue
    if dentro and l.rstrip().endswith(COMILLA + ';'):
        dentro = False
        continue
    if dentro and COMILLA in l:
        malas.append((n, l.strip()))

if malas:
    print('COMILLA INVERTIDA DENTRO DEL GLSL — esto corta el archivo:')
    for n, l in malas:
        print('  linea ' + str(n) + ': ' + l[:78])
    sys.exit(1)
print('GLSL limpio: sin comillas invertidas.')
