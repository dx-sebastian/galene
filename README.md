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

**No hay servidor.** Ni analítica, ni cookies, ni base de datos.

- La ubicación se pide solo al pulsar «que alguien venga por mí», se usa
  para armar un mensaje y se descarta. No se envía a ningún sitio.
- Lo que se escribe en «guardar lo que recuerdo» se queda en el
  dispositivo: se descarga como archivo o se comparte con quien la usuaria
  elija.
- Información sobre salud o vida sexual es dato sensible. Este proyecto
  no la almacena, y esa decisión es deliberada.

### Hasta dónde llega «los demás»

El foro y las garzas de presencia parecen necesitar un servidor y no lo
tienen. Lo que hay es `BroadcastChannel`: **las otras pestañas de este
mismo navegador**, en el mismo aparato, sin red por medio.

- Un hilo escrito en la comunidad aparece en la otra ventana de Galene
  que tengas abierta. Se guarda en `sessionStorage`, o sea que **muere al
  cerrar la pestaña**, y hay un botón para tirarlo antes.
- Cada otra pestaña abierta pone **una garza** en el manglar del fondo, y
  su mano en el agua abre un anillo en tu mar y ayuda a calmarlo.
- Nunca se inventa a nadie. Si estás sola, no hay ninguna garza de más y
  el aviso de manos no dice nada — la regla 3 no se cumple escondiendo
  que son pocas, se cumple no fabricando ninguna.

Esto **no** es «cuánta gente ha pasado por Galene». Para eso hace falta
contar visitas a un sitio sobre sumisión química, que es exactamente el
registro que la regla 9 prohíbe construir. La costura por donde entraría
un relevo que no guarde nada está en `fuente()`, en `js/presencia.js`:
todo lo demás ya funciona con lo que le llegue.

Lo que **sí** se personaliza —el color del pico de tu garza, o una de
diez frases— vive en `sessionStorage` y se va al cerrar. Nunca es texto
libre: por el canal viaja un índice, no una palabra (ver
`datos/garza.js`).

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

### De extremo a extremo

```bash
npm run test:e2e
```

Playwright, **contra el sitio compilado** —`npm run build` y un servidor
de ficheros de veinte líneas (`pruebas/servidor.mjs`), que es como sirve
GitHub Pages—, no contra el servidor de desarrollo. Un fallo que solo
aparece al compilar es el que nadie descubre hasta que está publicado.

Dos suites:

- `pruebas/e2e/foro.spec.js` — publicar, validar, contestar, votar,
  ordenar, filtrar, borrar lo propio, y que lo escrito sobreviva a una
  recarga pero no a otra pestaña.
- `pruebas/e2e/garzas.spec.js` — el panel opt-in, el pico teñido, el
  globo al pasar el ratón, la garza que aparece cuando se abre otra
  pestaña y desaparece al cerrarla, y el gesto de calma con una mano y
  con dos.

Dos asideros hacen falta para esto y viajan al sitio publicado a
propósito: `window.__hero.estado()`, `window.__garzas`, `window.__foro`
y `window.__presencia`. Son de LECTURA de cosas que ya están en pantalla
—cuánta calma tiene el agua, qué garzas hay posadas— y no permiten hacer
nada que no se pueda hacer con el dedo. El asidero pesado de auditoría
(`window.__mar`, que vuelve a dibujar y lee el búfer) sigue siendo solo
de desarrollo.

`?presencia=off` apaga la presencia, y `?auditar-mar=1` fuerza el shader
completo donde el WebGL es por software.

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
