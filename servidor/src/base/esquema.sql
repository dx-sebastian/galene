-- ═══════════════════════════════════════════════════════════════════
-- esquema.sql — LA BANDADA Y EL MAR. NADA MÁS VIVE AQUÍ.
--
-- El foro —hilos, comentarios, votos, reportes— se mudó a Postgres
-- (Supabase): ver esquema-foro.sql. Este fichero se quedó con lo que
-- sigue siendo local: quién dejó qué garza y cuánta calma acumuló el
-- mar. Es la mitad que no tenía motivo para moverse.
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

-- La comunidad (hilos, comentarios, votos, reportes) vive en
-- esquema-foro.sql, contra Postgres. Ver LEEME.md para el porqué.
