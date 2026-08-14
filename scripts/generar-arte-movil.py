"""Genera las láminas WebP que usa el hero en pantallas móviles.

Los originales de 1024 px son la fuente de verdad y nunca se sobrescriben.
El lienzo móvil se pinta por debajo de 700 px físicos internos, de modo que
768 px conserva margen para el reescalado sin enviar detalle invisible.
"""

from pathlib import Path
from shutil import copyfile

from PIL import Image


RAIZ = Path(__file__).resolve().parents[1]
ORIGEN = RAIZ / "public" / "arte" / "1024"
DESTINO = RAIZ / "public" / "arte" / "768"

TEXTURAS = [
    "mar-lejano.webp", "mar-medio.webp", "mar-cercano.webp",
    "manglar-v2.webp", "estrellas.webp", "mar-medio-calmo.webp",
    "mar-cercano-calmo.webp", "manglar-cerca.webp", "corales.webp",
    "luces.webp", "astro.webp", "reguero.webp", "papel.webp",
    "grafito.webp", "cielo-atlas-v3.webp",
]
AVES = [f"aves/ave{n:02}.webp" for n in (1, 2, 3, 4, 5, 6, 7, 8, 9, 11)]
ATERRIZA = [f"aterriza/a{n:02}.webp" for n in range(1, 9)]
POSADA = [
    f"posada/{nombre}.webp"
    for nombre in ("reposo", "alerta", "encogida", "una-pata", "mira-abajo", "alas")
]


def generar(relativa: str, limite: int) -> tuple[int, int]:
    entrada = ORIGEN / relativa
    salida = DESTINO / relativa
    salida.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(entrada) as imagen:
        imagen.thumbnail((limite, limite), Image.Resampling.LANCZOS)
        temporal = salida.with_suffix(".tmp.webp")
        imagen.save(temporal, "WEBP", quality=90, method=6, exact=True)

    # Algunas láminas ya están óptimamente comprimidas. En esos casos se
    # conserva el original: misma calidad y menos bytes que recomprimirlo.
    if temporal.stat().st_size >= entrada.stat().st_size:
        temporal.unlink()
        copyfile(entrada, salida)
    else:
        temporal.replace(salida)
    return entrada.stat().st_size, salida.stat().st_size


def main() -> None:
    antes = despues = 0
    for relativa in TEXTURAS:
        a, d = generar(relativa, 768)
        antes += a
        despues += d
    for relativa in AVES + ATERRIZA + POSADA:
        a, d = generar(relativa, 480)
        antes += a
        despues += d
    ahorro = (1 - despues / antes) * 100
    print(f"[arte móvil] {antes / 1024:.1f} KB -> {despues / 1024:.1f} KB ({ahorro:.1f}% menos)")


if __name__ == "__main__":
    main()
