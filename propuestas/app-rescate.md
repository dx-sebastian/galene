# Propuesta · La app de rescate

La urgencia salió del sitio. Esto es adónde va.

En `src/js/main.js:23` y en la cabecera de `src/pages/index.astro`
quedó anotada la decisión: *«la barra de reflejos —salida rápida y
línea de atención— salió del sitio: la urgencia se traslada a una app
móvil»*. Este documento dice qué es esa app.

> **Estado: propuesta.** No hay código. Nada de lo que sigue está
> construido, y varias cifras de aquí están citadas pero **no medidas
> por este proyecto**. Van marcadas.

**Decisiones ya tomadas** (agosto 2026), y este documento las respeta:

| | |
| --- | --- |
| **Disparador** | Un botón. Manual. Lo pulsa ella. |
| **A quién avisa** | Solo a los contactos que ella eligió, más una pantalla para quien esté al lado. **Sin servidor.** |
| **Qué graba** | Caja negra de sensores. **Ni audio ni imagen.** |
| **Entrega de hoy** | Este documento. |

---

## 1 · La tesis

Pediste una app «con sensores» y elegiste un botón manual. Eso no es
una contradicción: es la forma correcta, y conviene decir por qué en
una frase, porque de ella sale el diseño entero.

> ## Los sensores no deciden. Los sensores recuerdan.

Un sensor que decide tiene que afirmar algo —«esta persona está
drogada»— y ese es exactamente el tipo de afirmación que la **ley 2**
del proyecto prohíbe hacer sin fuente. La fuente no existe: lo mejor
publicado es un laboratorio que clasificó **intoxicación por alcohol**
con ~90 % de acierto usando el acelerómetro del teléfono **atado a la
zona lumbar, muestreando a 100 Hz, con la persona caminando diez pasos
en línea recta** ([JSAD, 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7437548/)).
Nada de eso describe un teléfono en un bolso, ni describe escopolamina,
ni benzodiacepinas. **No hay estudio equivalente para sumisión
química.** Un umbral inventado sobre esa base es la regla 3 rota, y
rota en el peor sitio.

Un sensor que **recuerda** no afirma nada. Registra que a la 1:52 dejó
de caminar y que a la 1:58 iba en un vehículo. Eso es un hecho, y su
valor es enorme, porque:

> **El mecanismo del daño es la amnesia.** La mayoría de las víctimas
> de agresión facilitada por drogas refiere amnesia total o parcial
> ([GBV Learning Network](https://www.gbvlearningnetwork.ca/our-work/briefs/brief-20.html)).
> El teléfono es el único testigo que no olvida.

Y una segunda cifra, que es la que justifica que esto exista:

> **3 de cada 4 víctimas tardan más de 12 horas en buscar ayuda**
> ([ídem](https://www.gbvlearningnetwork.ca/our-work/briefs/brief-20.html)).
> Doce horas contra una ventana de sangre de 6 h y una de PEP de 72 h.

La app no acorta la agresión. **Acorta el silencio, y guarda el
rastro.**

### El hueco que deja el botón, dicho una vez

Un botón no sirve a quien ya está inconsciente. Es verdad y no se
disimula. Lo que hace este diseño con ese hueco:

- **Ensancha la ventana en la que el botón sí sirve** (§3). El cliente
  real del botón no es quien ya se fue: es quien **sospecha** —«esta
  copa sabía raro», «me siento rara y no he bebido tanto»—. Ahí hay
  minutos, y hoy nadie los usa.
- **Cubre el caso de que nunca se pulse** con la caja negra (§7): al
  día siguiente sigue estando la línea de tiempo, que es justo lo que
  la amnesia se llevó.
- **No reinventa el aviso automático**: iOS ya trae *Check In*, que
  avisa a un contacto si no respondes en 15 minutos, y Android trae
  *Emergency SOS*. La app puede **enseñar a encenderlos** en vez de
  competir con ellos ([Apple](https://support.apple.com/guide/personal-safety/safety-check-iphone-ios-16-ips2aad835e1/web) ·
  [Android](https://www.android.com/articles/personal-safety-app/)).

---

## 2 · Los tres momentos

La app no tiene «pantalla principal». Tiene tres momentos, y en cada
uno es una cosa distinta.

### Antes — preparar, una vez, en calma
Elegir contactos. Escribir el mensaje. **Aprender dónde está el botón
con el dedo**, no con los ojos. Cinco minutos, un domingo.

### Durante — el botón
Una sola cosa en pantalla. §3, §4, §5.

### Después — el día siguiente, o el tercero
La caja negra se convierte en el documento que el sitio ya sabe
guardar, y el reloj de las 72 horas dice qué sigue abierto. §8.

Es la misma estructura que el sitio: *qué se puede hacer después, y
hasta cuándo.* La app añade el «durante», que es lo único que a una
página web no le cabe.

---

## 3 · El botón

Aquí está el trabajo de diseño real. Un botón de pánico es fácil de
dibujar y casi siempre está mal puesto: exige desbloquear el teléfono,
encontrar un icono entre cuarenta y acertarle a un objetivo pequeño.
Tres cosas que la motricidad fina no da cuando hacen falta.

### Cuatro caminos al mismo sitio

| Camino | Cómo | Requisito |
| --- | --- | --- |
| **Widget de pantalla de bloqueo** | Un toque largo, sin desbloquear | Android 12+ · iOS 16+ |
| **Botón físico / gesto del sistema** | *Action Button* (iPhone 15+), *Back Tap*, mosaico de Ajustes rápidos | Vía Atajos / Quick Settings Tile |
| **Dentro de la app** | La app abre **en el botón**. Nada más en pantalla | — |
| **Reloj**, si lo hay | Fase 4 | — |

Un aviso honesto: **ninguno de los dos sistemas deja que una app de
terceros se quede con un botón físico**. Los cinco toques al botón de
encendido son de *Emergency SOS* del sistema, y está bien que lo sean.
El camino realista es **integrarse con los mecanismos del sistema**
(Atajos, *Back Tap*, *Action Button*, mosaico, widget), no pelearse con
ellos.

### Las cinco reglas del objetivo

1. **Ocupa la pantalla entera.** No es un botón dentro de una pantalla:
   es la pantalla. Cualquier toque, en cualquier sitio, vale.
2. **Tolera el temblor.** Se activa con un toque **mantenido 800 ms**,
   no con un golpe seco: un toque largo sobrevive a la mano que tiembla
   y no lo dispara un roce en el bolsillo.
3. **Confirma por el tacto y el oído**, no por la vista. Vibración
   creciente y un tono que sube. Se puede pulsar con el teléfono dentro
   del bolso.
4. **No pregunta nada.** Ni «¿estás segura?», ni «elige el tipo de
   emergencia», ni un formulario. La regla 4 del proyecto —no
   revictimizar, no preguntar qué pasó— vale aquí más que en ninguna
   parte.
5. **Es el mismo botón siempre.** Nunca se mueve, nunca cambia de
   color, nunca se rediseña. Lo que se aprende con el dedo se
   desaprende si cambia.

### La cuenta atrás

Diez segundos, visibles, cancelables con un botón igual de grande.
Existe solo por el bolsillo. Pasados los diez segundos **envía y ya no
se detiene sola**.

---

## 4 · Qué se envía, y a quién

A los contactos que ella guardó. Desde su propio aparato, por SMS y por
el canal que ella prefiera. **Sin servidor, sin cuenta, sin nube.**

Un mensaje de alarma lo va a leer alguien recién despertado a las 3 de
la mañana. Tiene que ser legible en cuatro segundos:

```
Ana pulsó el botón de ayuda a las 2:14.

DÓNDE ESTÁ  → maps.google.com/?q=4.6512,-74.0559
              (precisión 12 m, hace 30 s)

CÓMO LLEGÓ  → 23:40  estuvo aquí: maps…/?q=4.6601,-74.0522
              01:52  salió caminando
              01:58  va en un vehículo
              02:11  se detuvo

Batería 22 %.

SI NO CONTESTA: llama al 123 y di dónde está.
No esperes a que "se le pase".
```

**Por qué va el «cómo llegó» y no solo el «dónde está».** Una
coordenada sola no dice nada: no distingue la casa de una amiga de un
sitio donde nunca ha estado. La línea de tiempo es lo que convierte un
punto en un motivo para levantarse de la cama. Eso lo aporta la caja
negra, y es su primera razón de existir.

Después del primero, **un mensaje cada 2 minutos y solo con lo que
cambió**. Sin servidor no hay «seguimiento en vivo»: hay mensajes
repetidos, y hay que llamarlo por su nombre.

### Las líneas institucionales

El 123 aparece en el mensaje **como texto**, para que lo marque quien
lo lee. La app no llama sola: una llamada muda desde un número
desconocido se cuelga.

Y hereda la regla del sitio: **ninguna línea entra en la app hasta que
alguien de este proyecto la haya llamado** y anotado número, horario,
cobertura y qué atiende. Hoy hay dos candidatas y ninguna verificada
por nosotros: el **123** (emergencias) y la **155** (orientación a
mujeres víctimas de violencia basada en género, que según la Policía
Nacional deriva al 123 los casos en curso —
[fuente](https://www.policia.gov.co/sites/default/files/2025-08/linea-155-orientacion-a-personas-victimas-de-violencias-basadas-en-genero.pdf)).

---

## 5 · La pantalla-cartel

Al enviarse la alarma, el teléfono deja de ser un teléfono y **se
convierte en un cartel** para el desconocido que esté al lado. Brillo
al máximo, pantalla que no se apaga.

Es la aplicación más literal de la ley del proyecto: *la imperfección
vive en el mundo, el instrumento es exacto.* Aquí no hay ni una
acuarela. Tipografía plana, alineación exacta, contraste máximo.

```
      ESTA PERSONA PIDIÓ AYUDA

  Puede estar bajo el efecto de una
  sustancia. Puede parecer borracha
  sin estarlo.

  QUÉ HACER
  · Quédate con ella.
  · No dejes que nadie se la lleve.
  · Llama al 123.

  Ya se avisó a sus contactos.
```

**Sin sangre, sin calaveras, sin rojo de alarma parpadeando.** Un
cartel que asusta hace que la gente se aparte, y lo que se necesita es
que alguien se quede.

### La sirena, y una tensión que hay que nombrar

La regla 2 del proyecto prohíbe el sonido inquietante. Una sirena es
sonido inquietante.

La regla protege **a ella** de la interfaz. La sirena no va dirigida a
ella: va dirigida a quien esté a diez metros. Son dos funciones
distintas y por eso pueden convivir, pero solo con dos condiciones:
**se configura antes, en calma, y se puede dejar apagada**; y la
pantalla nunca usa imaginería de miedo, pase lo que pase.

---

## 6 · Cancelar, y el problema de la coacción

- **Dentro de los 10 s:** un botón. Se acabó.
- **Ya enviada:** hace falta un código de 4 dígitos elegido antes.
- **Bajo coacción:** existe un segundo código. Al teclearlo, la
  pantalla dice «alarma cancelada» y **el envío continúa**, con una
  línea añadida a los contactos: *«canceló con el código de coacción»*.
  Lo mismo si se falla el código tres veces.

### El límite, y no tiene solución bonita

**Un código es exactamente lo que una persona afectada no puede
recordar.** El diseño que impide que un agresor apague la alarma es el
mismo que puede dejarla a ella atrapada con una sirena que no sabe
apagar.

La salida es aceptar el intercambio y elegir el lado menos malo:
además del código, hay un **«esto fue una falsa alarma»** que no pide
nada, apaga la sirena y **manda un último mensaje diciendo que se
canceló sin código**. Los contactos ya avisados deciden. Es peor para
la seguridad y mucho mejor para la dignidad, y en este proyecto ese
empate se resuelve siempre igual.

Y una regla que sale de la investigación sobre *stalkerware*: **la app
siempre se puede desinstalar sin código**. Una app de seguridad que no
se deja quitar es una app de control ([Citizen Lab](https://citizenlab.ca/research/the-predator-in-your-pocket-a-multidisciplinary-assessment-of-the-stalkerware-application-industry/)).

---

## 7 · La caja negra

Corre siempre, en silencio, y **nunca dispara nada**.

### Qué señales, y qué cuestan

| Señal | De dónde | Para qué | Coste |
| --- | --- | --- | --- |
| Actividad *(quieta / camina / vehículo)* | Activity Recognition (Android) · `CMMotionActivity` (iOS) | «Iba en un carro» | Casi cero: lo clasifica el coprocesador |
| Pasos y cadencia | Contador hardware · `CMPedometer` | Cuándo dejó de caminar | Casi cero |
| Ubicación gruesa | Cambio significativo de ubicación · geocercas | Dónde estuvo, por tramos | Bajo |
| Ubicación fina (GPS) | **Solo con la alarma activa** | Dónde está ahora | Alto — por eso solo ahí |
| Altitud | Barómetro | Cambió de piso, bajó a un sótano | Casi cero |
| Última interacción | Desbloqueo / pantalla | Cuándo usó el teléfono por última vez | Cero |
| Batería y red | Sistema | «Le quedaba 4 % y se apagó» **es** información | Cero |
| Luz y proximidad | Sensores | En el bolsillo o en la mano | Casi cero |

**Nunca, y no es negociable:** micrófono, cámara, contactos, agenda,
historial de navegación, identificadores de publicidad, red social
alguna.

### Cómo muestrea: por eventos, no por reloj

En reposo **no hay muestreo periódico**. Se escribe una entrada solo
cuando *cambia* algo: transición de actividad, cambio significativo de
ubicación, desbloqueo, cambio de piso. Un día normal son **decenas de
entradas, no millones**.

El sensor de movimiento significativo existe justo para esto y está
pensado para detectar movimiento a muy bajo consumo
([investigación](https://www.researchgate.net/publication/292385487_Exploring_Significant_Motion_Sensor_for_Energy-efficient_Continuous_Motion_and_Location_Sampling_in_Mobile_Sensing_Application)).

| Modo | Qué hace | Presupuesto de batería |
| --- | --- | --- |
| **Reposo** (siempre) | Solo eventos | **< 2 % al día** |
| **Noche marcada** (ella lo enciende al salir; se apaga sola) | Ubicación cada 10 min, actividad continua | **< 8 % en 8 h** |
| **Alarma** | GPS continuo, mensajes cada 2 min | Lo que haga falta, y lo avisa |

> Estos tres presupuestos son **objetivos de diseño, no mediciones**.
> Se miden en aparatos reales o no valen nada — el método está en §10
> de la [guía](../GUIA.md): *el instrumento bueno es aquel cuya lectura
> deja de moverse.*

### Dónde vive, y cuánto

- **Cifrada**, con la llave en el almacén del sistema (Keychain /
  Android Keystore) y atada al desbloqueo. Con el teléfono bloqueado no
  se lee.
- **Excluida de la copia de seguridad** en la nube. Una copia es un
  duplicado que ella no controla.
- **Se borra sola a los 30 días.** No es un descuido de producto: un
  registro permanente de los movimientos de una persona es exactamente
  lo que la regla 9 prohíbe construir, y que esté en su aparato no lo
  arregla — un aparato se presta, se pierde, se roba y se requisa.
  Treinta días cubren la ventana de 96 h con margen de sobra y cubren
  el «me di cuenta una semana después».
- **Un gesto la borra entera.** Sin confirmación en tres pasos.

---

## 8 · El día después

Es donde la app paga lo que cuesta.

Al abrirla después de una noche marcada —o de una alarma, o de nada—
ofrece **una sola cosa**: la línea de tiempo en castellano llano.

```
Anoche

23:40   Llegaste a un sitio y te quedaste 2 h 12 min.
01:52   Empezaste a caminar.
01:58   Ibas en un vehículo.
02:11   Te detuviste aquí.
02:14   Pulsaste el botón.
09:30   Desbloqueaste el teléfono por primera vez desde las 2:11.
```

Esa lista se convierte, con un botón, **en el mismo archivo de texto
que el sitio ya sabe generar** en «guardar lo que recuerdo»
(`src/js/herramientas.js`). Es la costura entre la app y Galene.

Y encaja exactamente con lo que el sitio le pide en `CONSEJOS_SIEMPRE`:

| El sitio le pide | Quién lo puede responder |
| --- | --- |
| «Anota el sitio y la hora, aunque sea aproximada» | **El teléfono** |
| «No borres nada del teléfono» | **El teléfono** |
| «Escribe hoy lo que recuerdes, aunque sean trozos» | Ella |
| «Apunta quién estaba, aunque sea a medias» | **Solo ella** |

El teléfono llena la mitad que la amnesia se llevó y **no puede llenar
la otra**. Decirlo así, en la propia pantalla, es lo que impide que el
documento parezca más completo de lo que es.

Debajo, el **reloj de las 72 horas** —las seis ventanas de
`src/js/reloj.js`, con sus fuentes y su aviso de sin verificar—
calculado desde la hora que la caja negra ya sabe.

---

## 9 · Lo que la app NO hace

Esta lista es tan parte del diseño como las demás.

- **No dice que te drogaron.** No lo sabe y no lo puede saber.
- **No llama a nadie sola.**
- **No manda nada a ningún servidor.** No hay servidor.
- **No graba audio ni imagen.**
- **No cuenta cuánta gente la usa.** Sin analítica, sin telemetría, sin
  contador de instalaciones que podamos mirar. Regla 9.
- **No comparte tu ubicación en vivo con nadie**, ni siquiera con tus
  contactos, salvo cuando tú pulsas.
- **No sustituye al 123 ni a urgencias.**
- **No promete protegerte.** Una app no impide una agresión. Esto se
  dice en la primera pantalla, una vez, sin adornos: la falsa sensación
  de seguridad es el fallo mejor documentado de esta categoría de
  producto ([reseñas de la categoría](https://whatismyipaddress.com/7-apps-that-will-make-you-feel-safer)).

---

## 10 · Que no se convierta en stalkerware

La mayor parte del *software* de vigilancia de pareja **no se
programó para eso**: son apps de doble uso —seguridad infantil,
antirrobo, «cuidar a los tuyos»— reutilizadas para espiar
([Citizen Lab](https://citizenlab.ca/research/the-predator-in-your-pocket-a-multidisciplinary-assessment-of-the-stalkerware-application-industry/) ·
[Chatterjee et al., IEEE S&P 2018](https://nixdell.com/papers/spyware.pdf)).

Una app que sabe dónde estás y avisa a terceros es **candidata
perfecta**. Ocho reglas, y son requisitos, no buenas intenciones:

1. **Nunca se oculta.** Icono siempre visible y notificación permanente
   mientras vigila. No hay modo invisible ni contraseña que la esconda.
2. **Añadir un contacto tarda 12 horas. Quitarlo es inmediato.** Quien
   te quita el teléfono cinco minutos no puede añadirse.
3. **Al añadirse un contacto**, el aparato lo anuncia a pantalla
   completa en el siguiente desbloqueo. Igual que el AirTag que pita.
4. **No hay panel web, ni cuenta, ni configuración remota.** Nada se
   cambia sin tener el aparato desbloqueado en la mano.
5. **Los contactos reciben solo cuando ella pulsa.** No existe «ver
   dónde está» a demanda. Ni una vez.
6. **La caja negra se lee solo en el aparato**, y solo desbloqueado.
7. **Se desinstala sin código**, siempre.
8. **Toda alarma es visible para ella.** Una app que avisa a alguien
   sin que la dueña lo sepa no es una app de seguridad: es un rastreador.

---

## 11 · Por qué esto no puede ser una página web

Vale la pena escribirlo porque es la pregunta obvia y la respuesta es
técnica y cerrada:

| Hace falta | En web |
| --- | --- |
| Correr con la pantalla apagada | **No.** Android exige servicio en primer plano con notificación desde API 26; iOS suspende la app a los segundos |
| Mandar un SMS sin que ella lo confirme | **No.** No existe la API |
| Botón físico o widget de bloqueo | **No** |
| Sensor de actividad de bajo consumo | **No.** Solo `DeviceMotion` en crudo, y iOS Safari exige un gesto para concederlo |
| Almacenamiento cifrado atado al desbloqueo | **No.** IndexedDB se puede desalojar por presión de disco |
| Notificación persistente | **No** |

**Conclusión:** nativo. Kotlin y Swift, o Flutter / React Native con
*plugins* nativos para lo delicado. Una PWA solo puede ser el lector
del día después (§8), y para eso ya está el sitio.

---

## 12 · Fases

**Fase 0 · Verificar.** Antes de una línea de código, lo que el propio
sitio ya se exige: las seis ventanas revisadas por alguien con criterio
clínico, las líneas telefónicas llamadas una por una, revisión por una
organización que atienda violencia sexual, y revisión legal —dato de
salud y de vida sexual es **dato sensible** bajo la Ley 1581 de 2012, y
una caja negra de ubicación lo es aunque nunca salga del aparato.

**Fase 1 · El botón, sin sensores.** Contactos, cuenta atrás, mensaje
con ubicación, pantalla-cartel, cancelación. **Esto ya sirve, y sirve
solo.** Si el proyecto se para aquí, ha valido la pena.

**Fase 2 · La caja negra en reposo.** Actividad, pasos, ubicación
gruesa, batería, desbloqueos. El «cómo llegó» entra en el mensaje.

**Fase 3 · El día después.** La línea de tiempo, la exportación al
formato del sitio, y el reloj de las 72 horas dentro de la app.

**Fase 4 · Lo que quedó fuera.** Noche marcada, reloj de pulsera,
mensajería por satélite, y —si alguna vez se decide— el aviso
automático por silencio, que hoy está descartado a propósito.

---

## 13 · Riesgos, sin maquillar

1. **La falsa sensación de seguridad.** El riesgo mayor, y es del
   propio producto: alguien va a salir más confiada porque tiene la app
   y la app no la va a proteger. Único remedio: decirlo en la primera
   pantalla y no prometer nunca de más.
2. **El teléfono es lo primero que falla.** Se queda sin batería, se
   apaga, se cae, se lo llevan. Toda la app depende de un objeto que en
   esa situación es frágil.
3. **Los contactos no contestan a las 3 de la mañana.** Por eso el
   mensaje trae instrucción explícita y por eso existe la
   pantalla-cartel: el desconocido que está al lado es, muchas veces,
   el único recurso real.
4. **El 123 puede no llegar**, o llegar tarde.
5. **La batería.** Un presupuesto que se incumpla convierte la app en
   la primera que la gente desinstala.
6. **El éxito la vuelve objetivo.** Si esto se usa mucho, alguien va a
   querer sus datos. La defensa no es cifrado: es **no tenerlos**. No
   hay servidor que allanar ni base que pedir por orden judicial.

---

## 14 · Preguntas abiertas

Ninguna bloquea el trabajo, pero todas cambian el resultado:

1. **¿El nombre y el icono son explícitos o discretos?** Hay una
   tensión real: la regla 1 de §10 dice que la app nunca se oculta,
   pero un icono que diga «sumisión química» en la pantalla de inicio
   la delata ante quien le mire el teléfono — que a veces es la persona
   de la que hay que protegerse. *Resolución propuesta: nunca se oculta
   a su dueña; el nombre y el icono pueden ser neutros.*
2. **¿Solo Colombia al principio?** El reloj y los mapas ya lo son.
3. **¿Se distribuye por tienda?** Una tienda registra la instalación en
   una cuenta. Un APK directo, o F-Droid, no.
4. **¿Cuántos contactos, y qué pasa si no hay ninguno?** Propuesta: la
   app funciona igual con cero contactos — la pantalla-cartel sola ya
   tiene valor.
5. **¿Quién responde si alguien pulsa el botón y no viene nadie?**
   Nosotros no. Y eso hay que decirlo dentro de la app.

---

## 15 · Fuentes consultadas

Con la advertencia del proyecto: **tener fuente no es estar
verificado.** Nada de esto lo ha revisado todavía una persona con
criterio clínico ni una organización que atienda violencia sexual.

- [Drug Facilitated Sexual Assault — GBV Learning Network, Western University](https://www.gbvlearningnetwork.ca/our-work/briefs/brief-20.html) — amnesia total o parcial mayoritaria; 3 de cada 4 tardan más de 12 h.
- [Drug-Facilitated Rape: Looking for the Missing Pieces — U.S. Office of Justice Programs](https://www.ojp.gov/pdffiles1/jr000243c.pdf)
- [Sumisión química por «burundanga» o escopolamina — Revista Española de Medicina Legal](https://www.elsevier.es/es-revista-revista-espanola-medicina-legal-285-articulo-sumision-quimica-por-burundanga-o-S0377473222000050) — amnesia anterógrada, inestabilidad de la marcha, ventana en orina de 24–72 h.
- [A Preliminary Study Using Smartphone Accelerometers to Sense Gait Impairments Due to Alcohol Intoxication — JSAD, 2020](https://pmc.ncbi.nlm.nih.gov/articles/PMC7437548/) — el ~90 % de acierto, y sus condiciones de laboratorio.
- [The Predator in Your Pocket — Citizen Lab](https://citizenlab.ca/research/the-predator-in-your-pocket-a-multidisciplinary-assessment-of-the-stalkerware-application-industry/)
- [The Spyware Used in Intimate Partner Violence — Chatterjee et al., IEEE S&P 2018](https://nixdell.com/papers/spyware.pdf)
- [Línea 155 — Policía Nacional de Colombia](https://www.policia.gov.co/sites/default/files/2025-08/linea-155-orientacion-a-personas-victimas-de-violencias-basadas-en-genero.pdf)
- [Safety Check y Check In — Apple](https://support.apple.com/guide/personal-safety/safety-check-iphone-ios-16-ips2aad835e1/web) · [Emergency SOS y Personal Safety — Android](https://www.android.com/articles/personal-safety-app/)
- [Background Execution Limits — Android Developers](https://developer.android.com/about/versions/oreo/background)
- [Exploring Significant Motion Sensor for Energy-efficient Continuous Motion and Location Sampling](https://www.researchgate.net/publication/292385487_Exploring_Significant_Motion_Sensor_for_Energy-efficient_Continuous_Motion_and_Location_Sampling_in_Mobile_Sensing_Application)
