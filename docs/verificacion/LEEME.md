# La revisión que levanta el freno

Este directorio está vacío a propósito. Lo que falta aquí es lo único
que separa a Galene de ser un sitio encontrable.

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

## Qué hay que dejar aquí

Un documento —firmado, o un correo con nombre, cargo y registro
profesional— que enumere **qué revisó y con qué fecha**. No vale «me
dijeron que estaba bien»: el día que alguien pregunte de dónde sale un
plazo, la respuesta tiene que ser un nombre.

A quién pedírselo: el Instituto Nacional de Medicina Legal y Ciencias
Forenses, una facultad de medicina, o la secretaría de salud de la
ciudad.

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
