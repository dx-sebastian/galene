# Galene

Sitio colombiano sobre **sumisión química**: qué se puede hacer después, y
hasta cuándo.

> ## ⚠ Esto es un borrador. No lo compartas todavía.
>
> Las ventanas de tiempo médicas y las líneas de atención **no están
> verificadas contra fuente primaria**. Hasta que lo estén, el sitio lleva
> `noindex` y un aviso visible, para que nadie que lo necesite de verdad
> se encuentre con un dato equivocado en el peor momento.
>
> Ver [Antes de publicar](#antes-de-publicar).

---

## Qué es

Una experiencia en acuarela que además es un conjunto de herramientas
prácticas. Las dos cosas a la vez, y esa tensión es el proyecto.

**Galene** (γαλήνη) es el mar en calma, y una Nereida — de las que aparecen
en la tormenta para que los barcos pasen.

## La ley del arte

> No queremos una ilustración en acuarela. Queremos una obra digital que
> se comporta como acuarela.

Y su corolario de ingeniería:

> **La imperfección vive en el mundo. El instrumento es exacto.**

El mar puede tener grafito sin borrar, charcos y bordes desiguales. El
reloj, el teléfono y el botón de salir van con tipografía plana y
alineación exacta.

## Cómo funciona el mar

No se simula agua: **se deforma una acuarela de agua**. Nueve láminas
pintadas se muestrean desplazadas por un mapa de flujo, se remapean en
duotono contra la paleta de la hora local de quien entra, y se les
multiplica encima un escaneo real de papel de algodón fijo a la pantalla.

- `js/mar.js` — el shader: cielo, agua en tres bandas, manglar, grafito, papel
- `js/hora.js` — un modelo de luz continuo, cuatro horas ancla
- `js/main.js` — orquestación, física del ave, calibración del lavado
- `js/reloj.js` — las ventanas de las 72 horas
- `js/herramientas.js` — el desvío de emergencia
- `arte/laminas.md` — la dirección de arte y los prompts
- `pruebas/lamina.html` — medidor de láminas

## Privacidad

Hay dos piezas con servidor, y las dos guardan lo mínimo que hace falta
para que funcionen — nunca quién eres.

- **La bandada del manglar y la calma del mar** (`servidor/`, propio,
  opcional): un proceso de Node con SQLite al lado. Sin cuentas, sin
  cookies, sin IP guardada — un token que vive en la pestaña y se va al
  cerrarla es lo único que ata dos visitas a la misma persona. Ver
  `servidor/LEEME.md`.
- **El foro** (`Comunidad`): vive en Postgres gestionado por Supabase,
  en su capa gratuita — el único servicio de terceros del proyecto, y
  una decisión consciente, no un descuido. Sin cuentas ni correo
  tampoco ahí (Auth Anónima da un identificador opaco), sin guardar
  quién escribió qué más allá de ese identificador, con llave de
  borrado que solo su dueño puede usar. El razonamiento completo está
  en `servidor/src/base/esquema-foro.sql`.

Ninguna de las dos cosas hace falta para usar la ayuda: sin
`servidor/` corriendo y sin Supabase configurado, el hero sigue en
pie, el reloj, el mapa y «guardar lo que recuerdo» funcionan igual —
son enhancements, no la base del sitio.

- La ubicación se pide solo al pulsar «que alguien venga por mí», se usa
  para armar un mensaje y se descarta. No se envía a ningún sitio.
- Lo que se escribe en «guardar lo que recuerdo» se queda en el
  dispositivo: se descarga como archivo o se comparte con quien la usuaria
  elija.
- Información sobre salud o vida sexual es dato sensible. Fuera del foro,
  este proyecto no la almacena, y esa decisión sigue siendo deliberada.

## Reglas que no se negocian

1. No re-escenificar el hecho. Ni la copa, ni el bar, ni la gota cayendo.
2. No terror. Ni glitch, ni caos visual, ni sonido inquietante.
3. No fabricar personas, ni testimonios, ni cifras sin fuente.
4. No revictimizar. No se pregunta qué pasó.
5. **La ayuda está a cero clics.** El teléfono y el botón de salir existen
   desde el primer milisegundo, en HTML, sin depender de JavaScript.
6. Salida rápida real, con `location.replace` para no dejar rastro.
7. `prefers-reduced-motion` **apaga**. No reduce.
8. Nadie es castigado por su contexto. A las 4 a.m. el mundo no está más
   vacío que a las 3 p.m.
9. El sitio nunca cuenta víctimas.

## Cómo se prueba

Verificación por píxeles, no por opinión:

```bash
python -m http.server 5177
```

- `?dev=1&hora=4.2` — fuerza la hora para medir cualquier luz
- `pruebas/lamina.html?src=../arte/mar-cercano.png` — mide una lámina

Leyes medidas que el motor mantiene: el agua siempre más oscura que la
bruma del cielo (si empatan, el horizonte desaparece), texto siempre sobre
el cielo con 4.5:1 en el peor píxel a cualquier hora, y cero bandas planas.

## Antes de publicar

- [ ] Verificar cada ventana de tiempo contra el protocolo vigente del
      Ministerio de Salud. Anotar fuente y fecha en `js/reloj.js`.
- [ ] Verificar cada línea telefónica llamando: número, horario, cobertura
      y qué atiende realmente.
- [ ] Sustituir el amanecer fijo (5:54) por cálculo real por latitud.
- [ ] Cero organizaciones nombradas como aliadas sin acuerdo por escrito.
- [ ] Revisión por una organización que atienda violencia sexual.
- [ ] Quitar `noindex` y el aviso de borrador — **solo cuando todo lo
      anterior esté hecho**.
