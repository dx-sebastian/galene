-- ═══════════════════════════════════════════════════════════════════
-- esquema.sql — LO QUE GALENE GUARDA, Y NADA MÁS.
--
-- Regla de esta base: NO HAY UNA SOLA COLUMNA QUE IDENTIFIQUE A NADIE.
-- Ni IP, ni agente de usuario, ni correo, ni cuenta, ni cookie. Lo único
-- que ata dos filas a la misma persona es `sesion`, y `sesion` no es el
-- token de nadie: es sha256(token + secreto). Con la base entera delante
-- no se puede suplantar a quien escribió, ni saber quién fue.
--
-- Un volcado de este fichero sigue siendo un dato delicado —lo que se
-- escribe aquí es lo que se escribe— pero es un dato ANÓNIMO, y esa es
-- la única forma en la que este proyecto se permite tener servidor.
-- ═══════════════════════════════════════════════════════════════════

-- ── LA BANDADA ─────────────────────────────────────────────────────
-- Cada quien deja una garza en el manglar. Diez vivas como mucho; la
-- undécima desaloja a la más antigua, que es la regla que se pidió y
-- además es lo que hace un dormidero: entra una, se va otra.
--
-- La pose, la percha, el tamaño y hacia dónde mira los reparte el
-- SERVIDOR, no el navegador. Si los sorteara cada cliente, dos personas
-- mirando el mismo árbol verían dos árboles distintos, y el argumento
-- del sitio —«esas garzas son de otras que entraron antes»— se cae.
-- `viva = 0` es una garza que ya voló, y la fila se queda un tiempo por
-- una razón concreta: sin ella, quien vuelve después de que la
-- desalojaran dejaría OTRA garza, esa desalojaría a la más antigua, y
-- dos personas con la pestaña abierta se echarían la una a la otra en
-- bucle hasta el fin de los tiempos. La fila muerta es la memoria de
-- «esta sesión ya dejó la suya».
CREATE TABLE IF NOT EXISTS garzas (
  id       TEXT    PRIMARY KEY,
  percha   INTEGER NOT NULL,              -- 0..perchas-1, única entre las vivas
  pose     TEXT    NOT NULL,              -- una de las seis láminas posadas
  mira     INTEGER NOT NULL,              -- -1 | 1 (espejado sobre los pies)
  escala   REAL    NOT NULL,              -- 0.86..1.10, la copa tiene fondo
  pico     TEXT,                          -- '#rrggbb' o NULL = sin pintar
  sesion   TEXT    NOT NULL,              -- hash de quien la dejó
  llegada  INTEGER NOT NULL,              -- epoch ms
  tocada   INTEGER,                       -- epoch ms del último pico
  quien    TEXT,                          -- hash de quien pintó el pico
  viva     INTEGER NOT NULL DEFAULT 1,
  partida  INTEGER                        -- epoch ms en que la desalojaron
);
CREATE INDEX IF NOT EXISTS garzas_vivas ON garzas(viva, llegada);
CREATE UNIQUE INDEX IF NOT EXISTS garzas_sesion ON garzas(sesion);
-- Índice ÚNICO PARCIAL: dos garzas no pueden compartir rama, pero las
-- que ya volaron dejan su rama libre. La base es la que lo garantiza,
-- no una comprobación en código que dos peticiones a la vez se saltan.
CREATE UNIQUE INDEX IF NOT EXISTS garzas_percha ON garzas(percha) WHERE viva = 1;

-- ── EL MAR ─────────────────────────────────────────────────────────
-- Un solo número que importa: `raices`. Sube con los segundos que la
-- gente sostiene la mano sobre el agua y NUNCA baja — «lo que dejas,
-- queda». De ahí sale la calma con la curva del README.
--
-- Se guarda en una tabla de contadores y no en una variable porque el
-- servidor se reinicia y la calma no puede reiniciarse con él: sería
-- exactamente lo contrario de lo que la regla promete.
CREATE TABLE IF NOT EXISTS contadores (
  clave TEXT PRIMARY KEY,
  valor REAL NOT NULL
);

-- Lo que YA se le acreditó a cada sesión, para que el tope de 240 s no
-- se pueda saltar reconectando. Sin esta tabla, cerrar la pestaña y
-- volver regala otros cuatro minutos, y un bucle infla el mar entero.
CREATE TABLE IF NOT EXISTS gestos (
  sesion   TEXT PRIMARY KEY,
  segundos REAL    NOT NULL DEFAULT 0,
  ultima   INTEGER NOT NULL
);

-- ── LA COMUNIDAD ───────────────────────────────────────────────────
-- `estado`:
--   visible  — se lee
--   revision — no se lee (salvo quien lo escribió, que tiene que saber
--              que su mensaje existe y está esperando, no desaparecido)
--   oculto   — moderado
--   borrado  — lo quitó quien lo escribió; el texto se vacía en el acto
--              y la fila se purga a los N días
--
-- `votos` y `respuestas` van desnormalizados porque son la clave de
-- ordenación de la lista y contarlos por hilo en cada página es un
-- recuento por fila. Se actualizan en la misma transacción que los
-- provoca: o suben las dos cosas, o no sube ninguna.
CREATE TABLE IF NOT EXISTS hilos (
  id         TEXT    PRIMARY KEY,
  etiqueta   TEXT    NOT NULL,
  titulo     TEXT    NOT NULL,
  cuerpo     TEXT    NOT NULL,            -- párrafos separados por \n\n
  autora     TEXT    NOT NULL,            -- nombre mostrado; 'Anónima' por defecto
  anonima    INTEGER NOT NULL DEFAULT 1,
  pose       TEXT    NOT NULL,            -- el sello: una de las seis posadas
  mira       INTEGER NOT NULL DEFAULT 1,
  sesion     TEXT    NOT NULL,            -- hash de quien escribe
  borrado    TEXT,                        -- hash de la llave de borrado
  creado     INTEGER NOT NULL,
  ultima     INTEGER NOT NULL,            -- última actividad (para «vivos»)
  votos      INTEGER NOT NULL DEFAULT 0,
  respuestas INTEGER NOT NULL DEFAULT 0,
  reportes   INTEGER NOT NULL DEFAULT 0,
  estado     TEXT    NOT NULL DEFAULT 'visible',
  ejemplo    INTEGER NOT NULL DEFAULT 0   -- 1 = dato sembrado, no de nadie
);
-- Los tres índices son los tres órdenes de la lista, y llevan el `id`
-- al final porque la paginación es por CLAVE, no por OFFSET: el cursor
-- es la última clave vista, y sin desempate estable dos filas empatadas
-- se repiten o se saltan al pasar de página.
CREATE INDEX IF NOT EXISTS hilos_recientes ON hilos(estado, creado DESC, id DESC);
CREATE INDEX IF NOT EXISTS hilos_votados   ON hilos(estado, votos DESC, creado DESC, id DESC);
CREATE INDEX IF NOT EXISTS hilos_solas     ON hilos(estado, respuestas ASC, creado DESC, id DESC);
CREATE INDEX IF NOT EXISTS hilos_etiqueta  ON hilos(etiqueta, estado, creado DESC);
CREATE INDEX IF NOT EXISTS hilos_sesion    ON hilos(sesion);

-- DOS NIVELES Y SE ACABA, como en el sitio: comentario y respuesta. Un
-- tercer nivel en un móvil son cuatro sangrías y una columna de texto
-- de seis palabras. `padre` NULL = comentario de raíz.
CREATE TABLE IF NOT EXISTS comentarios (
  id       TEXT    PRIMARY KEY,
  hilo     TEXT    NOT NULL REFERENCES hilos(id) ON DELETE CASCADE,
  padre    TEXT    REFERENCES comentarios(id) ON DELETE CASCADE,
  texto    TEXT    NOT NULL,
  autora   TEXT    NOT NULL,
  anonima  INTEGER NOT NULL DEFAULT 1,
  pose     TEXT    NOT NULL,
  mira     INTEGER NOT NULL DEFAULT 1,
  sesion   TEXT    NOT NULL,
  borrado  TEXT,
  creado   INTEGER NOT NULL,
  votos    INTEGER NOT NULL DEFAULT 0,
  reportes INTEGER NOT NULL DEFAULT 0,
  estado   TEXT    NOT NULL DEFAULT 'visible',
  ejemplo  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS comentarios_hilo  ON comentarios(hilo, padre, creado ASC, id ASC);
CREATE INDEX IF NOT EXISTS comentarios_padre ON comentarios(padre, creado ASC);
CREATE INDEX IF NOT EXISTS comentarios_sesion ON comentarios(sesion);

-- El voto de Reddit: −1, 0, +1, uno por sesión y objeto. La clave
-- primaria compuesta ES la regla «no se vota dos veces»: no hace falta
-- comprobarla en código, la base no deja.
CREATE TABLE IF NOT EXISTS votos (
  objeto TEXT    NOT NULL,               -- 'hilo' | 'comentario'
  cosa   TEXT    NOT NULL,
  sesion TEXT    NOT NULL,
  dir    INTEGER NOT NULL,               -- -1 | 1  (el 0 borra la fila)
  cuando INTEGER NOT NULL,
  PRIMARY KEY (objeto, cosa, sesion)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS reportes (
  objeto TEXT    NOT NULL,
  cosa   TEXT    NOT NULL,
  sesion TEXT    NOT NULL,
  motivo TEXT    NOT NULL,
  cuando INTEGER NOT NULL,
  PRIMARY KEY (objeto, cosa, sesion)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS reportes_cuando ON reportes(cuando);
