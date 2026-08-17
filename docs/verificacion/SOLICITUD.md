# La carta

Esto es para copiar y enviar. Va escrito para que **la respuesta cueste
una hora**, no una tarde: quien la recibe no tiene que entrar al sitio,
ni entender qué es, ni auditar nada. Tiene que leer una lista de treinta
y siete afirmaciones con la cita delante y marcar una casilla en cada
una. Veintitrés de las treinta y siete son las tarjetas del panel, que
se revisan por encima; las catorce primeras son las que cargan el peso.

Adjuntar siempre **`DOSSIER.md`** —o su versión en PDF—, que es la lista.
Se genera con `npm run dossier` y lleva una huella; si el sitio cambia,
la huella cambia.

## A quién

Por orden de a quién le corresponde más:

1. **Instituto Nacional de Medicina Legal y Ciencias Forenses** — es la
   entidad que publica el reglamento del que salen la mitad de las
   afirmaciones. Punto de contacto: la oficina de atención al ciudadano
   o la dirección regional de la ciudad.
2. **Una facultad de medicina** — el departamento de medicina legal o de
   salud pública. Suele ser la vía más rápida: hay docentes que hacen
   exactamente esta revisión y a quienes les interesa que exista.
3. **La secretaría distrital o municipal de salud** — la subdirección de
   salud pública o el programa de violencias.

No hace falta que respondan las tres. Con una firma que enumere qué
revisó y con qué fecha, basta.

## El asunto

> Solicitud de revisión técnica de contenidos clínicos — sitio de
> información sobre sumisión química (sin publicar)

## El cuerpo

---

Buenos días.

Escribo por **Galene**, un sitio de información y orientación sobre
sumisión química hecho en Colombia. Está terminado y **no está
publicado**: hoy lleva `noindex` en todas sus páginas y su `robots.txt`
prohíbe el paso, de modo que no aparece en ningún buscador. Esa decisión
es deliberada y es la razón de este correo.

El sitio explica los plazos de las primeras 72 horas —el examen
médico-legal, la profilaxis del VIH, la muestra toxicológica, la
anticoncepción de emergencia—, qué conviene hacer y no hacer en las
primeras horas, y a qué líneas acudir. Cada número se contrastó contra
el *Protocolo de Atención en salud para Víctimas de Violencia Sexual*
del Ministerio de Salud y contra el *Reglamento Técnico para el Abordaje
Forense Integral de la Víctima en la Investigación del Delito Sexual*
del Instituto Nacional de Medicina Legal.

Contrastar no es verificar. Falta que alguien con criterio clínico o
forense confirme que **esos documentos siguen vigentes** y que **la
lectura es la correcta**. Hasta que eso ocurra, el sitio no se publica:
alguien que llega a las cuatro de la mañana buscando qué hacer merece
que lo que lea lo haya leído antes alguien que sabe.

**Lo que pido es acotado.** Adjunto un documento con las 37 afirmaciones
que el sitio publica. Cada una lleva la frase exacta tal como se lee en
pantalla, el documento del que sale y la cita literal, y debajo una
casilla: correcto / incorrecto / con matices, con espacio para la
corrección. No hace falta entrar al sitio ni revisar nada más.

Lo que necesitaría de vuelta es un documento o un correo con su nombre,
cargo, registro profesional y la fecha, indicando qué revisó y las
correcciones si las hay. Ese documento se guarda con el proyecto y es lo
único que falta para que el sitio pueda publicarse.

Hay una duda concreta que agradecería especialmente: el protocolo de
salud que usamos es la actualización que deroga la Resolución 459 de
2012, y no hemos logrado confirmar bajo qué número quedó publicada.

Quedo atento a cualquier corrección, incluida la de que algo de esto no
deba decirse como lo estamos diciendo.

Gracias por el tiempo.

[nombre]
[contacto]

---

## Cuando llegue la respuesta

1. Guardar el documento firmado **en este mismo directorio**, con la
   fecha en el nombre.
2. Aplicar las correcciones donde viven los datos —`src/js/reloj.js`,
   `src/datos/expertos.js`, `src/componentes/Ayuda.astro`— y **no en el
   dossier**, que se regenera solo.
3. Volver a generar el dossier (`npm run dossier`) y comprobar que la
   huella nueva es la que quedó firmada. Si se aplicaron correcciones,
   la huella cambia: hay que anotar cuál se firmó y cuál hay ahora, o
   pedir el visto bueno sobre el texto corregido.
4. Poner `VERIFICADO = true` en `src/datos/sitio.js`.
5. `npm run interruptor` y `npm test`.
6. Desplegar, enviar el sitemap y comprobar a los siete días.

## Si la respuesta es que no

También sirve. Un «esto no lo puedo firmar» de una entidad es
información: dice por dónde va el riesgo. Lo que no vale es publicar
sin nada y esperar que nadie pregunte de dónde sale un plazo.
