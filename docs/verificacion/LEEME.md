# La revisión que levanta el freno

Aquí falta una firma, y es lo único que separa a Galene de ser un sitio
encontrable.

Este archivo dice **por qué**. Los otros dos dicen **qué** y **cómo**:

| archivo | qué es |
| --- | --- |
| **`DOSSIER.md`** | La lista exacta de lo que hay que firmar: 37 afirmaciones, cada una con la frase que se publica, el documento del que sale y la cita literal. **No se edita a mano** — lo escribe `npm run dossier` a partir del código. |
| **`SOLICITUD.md`** | La carta, para copiar y enviar, y a quién. |

## Qué falta

Que un profesional de salud o de medicina forense **en Colombia** lea y
firme cuatro cosas:

1. **Los plazos del reloj de 72 horas** — el examen médico-legal, la
   profilaxis del VIH, la muestra toxicológica, la anticoncepción de
   emergencia. Son los números que alguien va a usar para decidir a qué
   hora sale de su casa.
2. **Las rutas de atención** — qué pasa al llegar a una urgencia, qué se
   puede pedir, qué no es obligatorio.
3. **Las líneas** — 155, 123 y SALVIA: que sigan activas, qué atienden
   de verdad y en qué horario.
4. **Las tarjetas del panel de expertos** — que cada síntesis diga lo
   que dice el trabajo que cita.

Enumeradas una por una, con su cita, están en `DOSSIER.md`. Esa lista es
el encargo: cuatro viñetas no las firma nadie, treinta y siete casillas
con la cita delante se responden en una hora.

## Qué hay que dejar aquí

Un documento —firmado, o un correo con nombre, cargo y registro
profesional— que enumere **qué revisó y con qué fecha**. No vale «me
dijeron que estaba bien»: el día que alguien pregunte de dónde sale un
plazo, la respuesta tiene que ser un nombre.

Y que anote **la huella** que lleva el dossier en su encabezado. Es un
resumen de las 37 afirmaciones: si mañana alguien corrige una hora en
`src/js/reloj.js`, la huella cambia y se sabe que la firma cubre otra
versión. Sin ella, una firma de hace un año parece cubrir un texto que
ya no existe. `npm run dossier -- --comprobar` vigila justo eso, y corre
dentro de la batería de pruebas.

A quién pedírselo: el Instituto Nacional de Medicina Legal y Ciencias
Forenses, una facultad de medicina, o la secretaría de salud de la
ciudad. La carta y el orden en que conviene tocar cada puerta están en
`SOLICITUD.md`.

## Y entonces qué

Con el documento aquí dentro:

```
src/datos/sitio.js →  export const VERIFICADO = true;
npm run interruptor            # las dos versiones, comprobadas
npm test                       # la batería entera
```

Eso quita el `noindex` de las cinco páginas, abre el `robots.txt` y
anuncia el `sitemap.xml`. **No hay nada más que hacer**: los títulos,
las descripciones, las direcciones canónicas, las imágenes para
compartir y el glosario en datos estructurados ya están escritos y
esperando. Se hicieron antes a propósito, para que levantar el freno
fuera una palabra y no una tarde.

Después: enviar el sitemap y comprobar a los siete días que la portada
aparece.

## Por qué el freno está puesto

Porque alguien llega a este sitio a las cuatro de la mañana buscando qué
hacer, y merece que lo que lea lo haya leído antes alguien que sabe. Un
sitio sobre plazos clínicos que aparece en un buscador con datos sin
confirmar hace daño más rápido de lo que ayuda.

No es una tarea pendiente de mantenimiento. Es la razón.
