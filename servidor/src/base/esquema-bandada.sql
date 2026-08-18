-- ═══════════════════════════════════════════════════════════════════
-- esquema-bandada.sql — LA BANDADA Y EL MAR, EN SUPABASE.
--
-- Hermano de esquema-foro.sql, mismo motivo: menos servidor que operar.
-- Reemplaza a `servidor/src/base/esquema.sql` + `dominio/garzas.js` +
-- `dominio/mar.js`, que hasta ahora corrían contra SQLite local dentro
-- de `servidor/`.
--
-- ── LA LECCIÓN DE ESTA NOCHE, APLICADA DESDE EL PRINCIPIO ──────────
-- En esquema-foro.sql, «borrar lo propio» se escribió primero como
-- política RLS y falló tres veces antes de entender por qué: un
-- UPDATE con USING/WITH CHECK que compara `sesion` necesita permiso de
-- LECTURA sobre esa columna, y `sesion` no lo tiene a propósito. Aquí
-- no se repite el experimento: NINGUNA tabla concede INSERT ni UPDATE
-- directo a `anon`/`authenticated`. Todo lo que cambia una fila —la
-- propia o la de otra persona (desalojar la garza más antigua, pintar
-- el pico ajeno, sumar a la calma de todos)— pasa por una función
-- SECURITY DEFINER. Es más código de entrada, y es el que no hay que
-- reescribir a medianoche cuando algo falla en producción.
--
-- ── LO QUE SE PIERDE, DICHO CLARO ─────────────────────────────────
-- `config.js`, en el servidor viejo, dejaba ajustar la sintonía del
-- gesto (radio, ganancia, τ…) por variable de entorno, SIN volver a
-- desplegar — su propio comentario decía por qué: «lo que se ajusta a
-- ojo hay que poder ajustarlo sin volver a desplegar». Aquí esos
-- números quedan escritos en SQL: cambiarlos es una migración, no una
-- variable de entorno. Para un ajuste que todavía dice de sí mismo
-- «NO ESTÁN MEDIDOS», es una pérdida real, no cosmética.
--
-- El límite por IP tampoco tiene equivalente aquí, por la misma razón
-- que en el foro: sin servidor propio, Postgres no ve la IP de quien
-- llama.
-- ═══════════════════════════════════════════════════════════════════

-- ── LAS TABLAS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS garzas (
  id       TEXT    PRIMARY KEY,
  percha   INTEGER NOT NULL,
  pose     TEXT    NOT NULL CHECK (pose IN ('reposo','alerta','encogida','una-pata','mira-abajo','alas')),
  mira     INTEGER NOT NULL CHECK (mira IN (-1, 1)),
  escala   REAL    NOT NULL,
  pico     TEXT    CHECK (pico IS NULL OR pico ~ '^#[0-9a-f]{6}$'),
  sesion   UUID    NOT NULL DEFAULT auth.uid(),
  llegada  BIGINT  NOT NULL DEFAULT (extract(epoch FROM clock_timestamp()) * 1000)::bigint,
  tocada   BIGINT,
  quien    UUID,                          -- nunca sale al público, ver la vista
  viva     INTEGER NOT NULL DEFAULT 1,
  partida  BIGINT
);
CREATE INDEX IF NOT EXISTS garzas_vivas ON garzas(viva, llegada);
-- Única de por vida, no solo entre las vivas: una sesión que ya dejó
-- su garza y la vio volar no puede dejar otra. Sin esto, dos pestañas
-- de la misma persona se desalojarían la una a la otra sin parar.
CREATE UNIQUE INDEX IF NOT EXISTS garzas_sesion ON garzas(sesion);
CREATE UNIQUE INDEX IF NOT EXISTS garzas_percha ON garzas(percha) WHERE viva = 1;

-- Un solo número que importa de verdad: `raices`. NUNCA se expone
-- crudo (regla 9: el sitio no cuenta) — ni tabla, ni columna, ni vista
-- lo concede a nadie. Solo `calma_actual()` lo lee, y solo devuelve el
-- número YA CONVERTIDO a calma (0.35..0.85 aprox.), que no dice cuánta
-- gente ha pasado por aquí.
CREATE TABLE IF NOT EXISTS contadores (
  clave TEXT PRIMARY KEY,
  valor REAL NOT NULL
);
INSERT INTO contadores(clave, valor) VALUES ('raices', 0) ON CONFLICT (clave) DO NOTHING;

-- Lo ya acreditado a cada sesión, para que el tope de 240 s no se
-- pueda saltar reconectando. Tan sensible como `limites` del foro —
-- mismo tratamiento: sin GRANT, sin política, cerrada del todo.
CREATE TABLE IF NOT EXISTS gestos (
  sesion   UUID   PRIMARY KEY,
  segundos REAL   NOT NULL DEFAULT 0,
  ultima   BIGINT NOT NULL
);

-- ── FUNCIONES AUXILIARES ──────────────────────────────────────────

-- Puerto de `azarDe()` en identidad.js: un número 0..1 estable a
-- partir de una cadena y una ronda. Con `hashtext` nativo, como
-- `sello_de` en esquema-foro.sql — mismo truco, mismo motivo (nada que
-- no sea de fábrica en Postgres).
CREATE OR REPLACE FUNCTION azar_de(cadena TEXT, ronda INT DEFAULT 0)
RETURNS REAL
LANGUAGE sql IMMUTABLE
AS $$
  SELECT abs(hashtext(cadena || '·' || ronda::text))::real / 2147483647.0;
$$;

-- Puerto de `poseDe()` en garzas.js: sorteo PONDERADO con los pesos
-- del dormidero de verdad (muchas ahuecadas y a la pata coja, casi
-- ninguna con las alas abiertas). Los pesos son los mismos que
-- `pesosPose` en config.js — si un día cambian ahí, cambian aquí.
CREATE OR REPLACE FUNCTION pose_de(semilla TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  poses TEXT[] := ARRAY['reposo','alerta','encogida','una-pata','mira-abajo','alas'];
  pesos REAL[] := ARRAY[3, 1, 4, 4, 1, 0.4];
  total REAL := 13.4;
  r REAL := azar_de(semilla, 7) * total;
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    r := r - pesos[i];
    IF r <= 0 THEN RETURN poses[i]; END IF;
  END LOOP;
  RETURN poses[1];
END;
$$;

-- ── DEJAR LA GARZA ─────────────────────────────────────────────────
-- SECURITY DEFINER porque desalojar a la más antigua es escribir en
-- la fila de OTRA sesión — ninguna política RLS «propia» alcanza ahí,
-- y no hace falta que alcance: la lógica de quién puede desalojar a
-- quién es del dominio, no de una tabla.
CREATE OR REPLACE FUNCTION dejar_garza()
RETURNS TABLE(id TEXT, percha INTEGER, pose TEXT, mira INTEGER, escala REAL,
              pico TEXT, llegada BIGINT, tocada BIGINT, nueva BOOLEAN, se_fue BOOLEAN, desalojada TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sesion UUID := auth.uid();
  previa garzas%ROWTYPE;
  antigua garzas%ROWTYPE;
  v_desalojada TEXT := NULL;
  v_percha INTEGER;
  v_id TEXT;
  intentos INT := 0;
BEGIN
  IF NOT permitir_ficha('garza', v_sesion, 4, 1.0/300) THEN
    RAISE EXCEPTION 'Vas demasiado rápido.';
  END IF;

  SELECT * INTO previa FROM garzas WHERE sesion = v_sesion;
  IF FOUND THEN
    IF previa.viva = 0 THEN
      RETURN QUERY SELECT previa.id, previa.percha, previa.pose, previa.mira, previa.escala,
        previa.pico, previa.llegada, previa.tocada, false, true, NULL::TEXT;
      RETURN;
    END IF;
    RETURN QUERY SELECT previa.id, previa.percha, previa.pose, previa.mira, previa.escala,
      previa.pico, previa.llegada, previa.tocada, false, false, NULL::TEXT;
    RETURN;
  END IF;

  -- ¿Sobra sitio? `<=` y no `<`: la que vamos a meter cuenta.
  --
  -- OJO: `RETURNS TABLE(id, percha, pose, mira, escala, pico, llegada,
  -- tocada, …)` declara una variable plpgsql POR CADA nombre de esa
  -- lista — y son casi los mismos nombres que las columnas reales de
  -- `garzas`. A partir de aquí, cualquier `percha`/`id`/`llegada`/…
  -- sin calificar es ambiguo para Postgres, y lo dice con un error
  -- distinto según en cuál tropiece primero. Cazado en vivo, con
  -- `percha` — se revisaron los otros dos que compartían el mismo
  -- riesgo antes de que tronaran por separado.
  -- OCHO, Y NO DIEZ. El diez venía del servidor SQLite viejo, que
  -- repartía perchas de una lista suya. Las perchas de verdad son las
  -- de `PERCHAS` en `js/main.js`: OCHO columnas de la copa, medidas
  -- sobre la lámina por solidez, pendiente y separación. Una fila con
  -- percha 8, 9 o 10 no tiene dónde posarse — el cliente la descarta,
  -- y quien la dejó no ve su propia garza. Los dos números tienen que
  -- ser el mismo, y el que manda es el de la pintura.
  IF (SELECT count(*) FROM garzas WHERE viva = 1) >= 8 THEN
    SELECT * INTO antigua FROM garzas WHERE viva = 1 ORDER BY garzas.llegada ASC, garzas.id ASC LIMIT 1;
    IF FOUND THEN
      UPDATE garzas SET viva = 0, partida = (extract(epoch FROM clock_timestamp()) * 1000)::bigint
        WHERE garzas.id = antigua.id;
      v_desalojada := antigua.id;
      PERFORM realtime.send(jsonb_build_object('id', v_desalojada), 'garza-vuela', 'manglar', true);
    END IF;
  END IF;

  -- `gen_random_uuid()` es nativa de Postgres (desde la 13, sin
  -- extensión) — a diferencia de `gen_random_bytes()`, que es de
  -- pgcrypto y no está activada. Cazado en vivo: la función se creaba
  -- sin problema pero tronaba al primer uso real.
  v_id := gen_random_uuid()::text;

  -- Rama libre al azar entre las libres, con un reintento por si dos
  -- peticiones a la vez eligen la misma — el índice único parcial lo
  -- impide; aquí solo se reintenta una vez, igual que hacía garzas.js.
  LOOP
    intentos := intentos + 1;
    SELECT p INTO v_percha FROM generate_series(0, 7) AS p   -- ver la nota de las ocho, arriba
      WHERE p NOT IN (SELECT garzas.percha FROM garzas WHERE viva = 1)
      ORDER BY random() LIMIT 1;
    IF v_percha IS NULL THEN
      RAISE EXCEPTION 'El manglar está lleno ahora mismo. Vuelve en un momento.';
    END IF;

    BEGIN
      INSERT INTO garzas(id, percha, pose, mira, escala, sesion)
      VALUES (v_id, v_percha, pose_de(v_id),
              (CASE WHEN azar_de(v_id, 2) < 0.45 THEN -1 ELSE 1 END),
              0.86 + azar_de(v_id, 3) * (1.10 - 0.86),
              v_sesion);
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF intentos >= 2 THEN RAISE; END IF;
    END;
  END LOOP;

  PERFORM realtime.send(
    (SELECT jsonb_build_object('id', g.id, 'percha', g.percha, 'pose', g.pose, 'mira', g.mira,
                                'escala', g.escala, 'llegada', g.llegada)
     FROM garzas g WHERE g.id = v_id),
    'garza-llega', 'manglar', true);

  RETURN QUERY SELECT g.id, g.percha, g.pose, g.mira, g.escala, g.pico, g.llegada, g.tocada,
    true, false, v_desalojada FROM garzas g WHERE g.id = v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION dejar_garza() TO anon, authenticated;

-- ── PINTAR EL PICO ─────────────────────────────────────────────────
-- `picoAjeno = true` de fábrica, igual que `GALENE_PICO_AJENO=1` en el
-- servidor viejo: la bandada es de todos. Ya no es una variable de
-- entorno — ver la nota grande de arriba sobre lo que se pierde.
CREATE OR REPLACE FUNCTION pintar_pico(p_id TEXT, p_color TEXT)
RETURNS TABLE(id TEXT, pico TEXT, tocada BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sesion UUID := auth.uid();
  v_pico_ajeno BOOLEAN := true;
  g garzas%ROWTYPE;
  v_ahora BIGINT := (extract(epoch FROM clock_timestamp()) * 1000)::bigint;
BEGIN
  IF p_color !~ '^#[0-9a-f]{6}$' THEN RAISE EXCEPTION 'El color va como «#rrggbb».'; END IF;
  IF NOT permitir_ficha('pico', v_sesion, 10, 1.0/3) THEN
    RAISE EXCEPTION 'Vas demasiado rápido.';
  END IF;

  SELECT * INTO g FROM garzas WHERE garzas.id = p_id;
  IF NOT FOUND OR g.viva = 0 THEN RAISE EXCEPTION 'Esa garza ya no está en el árbol.'; END IF;
  IF NOT v_pico_ajeno AND g.sesion <> v_sesion THEN
    RAISE EXCEPTION 'Solo puedes pintarle el pico a la tuya.';
  END IF;

  UPDATE garzas SET pico = p_color, tocada = v_ahora, quien = v_sesion WHERE garzas.id = p_id;
  PERFORM realtime.send(jsonb_build_object('id', p_id, 'pico', p_color), 'pico', 'manglar', true);
  RETURN QUERY SELECT p_id, p_color, v_ahora;
END;
$$;
GRANT EXECUTE ON FUNCTION pintar_pico(TEXT, TEXT) TO anon, authenticated;

-- ── EL GESTO SOBRE EL MAR ──────────────────────────────────────────
-- Acredita segundos sostenidos, con el mismo tope de 240 s por sesión
-- que `config.mar.topeSesion`. SECURITY DEFINER porque toca
-- `contadores`, la fila global que nadie tiene permiso de tocar
-- directo — igual que `limites` en el foro.
CREATE OR REPLACE FUNCTION acreditar_gesto(p_segundos REAL)
RETURNS TABLE(acreditados REAL, restante REAL, calma REAL)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sesion UUID := auth.uid();
  v_tope CONSTANT REAL := 240;
  v_ganancia CONSTANT REAL := 1.5;
  v_ahora BIGINT := (extract(epoch FROM clock_timestamp()) * 1000)::bigint;
  v_seg REAL := LEAST(GREATEST(p_segundos, 0), 30);   -- techo por llamada, igual que la ruta vieja
  v_previo REAL;
  v_entran REAL;
BEGIN
  IF v_seg <= 0 THEN RETURN QUERY SELECT 0::real, 0::real, calma_actual(); RETURN; END IF;

  SELECT segundos INTO v_previo FROM gestos WHERE sesion = v_sesion FOR UPDATE;
  v_previo := COALESCE(v_previo, 0);
  v_entran := LEAST(v_seg, GREATEST(0, v_tope - v_previo));

  IF v_entran > 0 THEN
    INSERT INTO gestos(sesion, segundos, ultima) VALUES (v_sesion, v_previo + v_entran, v_ahora)
      ON CONFLICT (sesion) DO UPDATE SET segundos = EXCLUDED.segundos, ultima = EXCLUDED.ultima;
    UPDATE contadores SET valor = valor + v_entran * v_ganancia WHERE clave = 'raices';
  END IF;

  RETURN QUERY SELECT v_entran, GREATEST(0, v_tope - v_previo - v_entran), calma_actual();
END;
$$;
GRANT EXECUTE ON FUNCTION acreditar_gesto(REAL) TO anon, authenticated;

-- ── LA CALMA, SIN LAS RAÍCES ───────────────────────────────────────
-- calma = base + rango · min(1 − e^(−n/τ), techo). Los cuatro números
-- son los valores por defecto de `config.js` (GALENE_TAU_RAICES=500,
-- GALENE_TECHO_RAICES=0.55) — fijos aquí, no ajustables sin migración.
CREATE OR REPLACE FUNCTION calma_actual()
RETURNS REAL
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (0.35 + 0.50 * LEAST(1 - exp(-valor / 500.0), 0.55))::real
  FROM contadores WHERE clave = 'raices';
$$;
GRANT EXECUTE ON FUNCTION calma_actual() TO anon, authenticated;

-- ── LO QUE SE LEE ──────────────────────────────────────────────────
CREATE OR REPLACE VIEW garzas_publico WITH (security_invoker = true) AS
SELECT id, percha, pose, mira, escala, pico, llegada, tocada
FROM garzas;

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────
ALTER TABLE garzas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE contadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE gestos     ENABLE ROW LEVEL SECURITY;

-- Único acceso directo: LEER las garzas vivas, para la vista de
-- arriba. Nada de INSERT/UPDATE aquí — eso son las dos funciones.
DROP POLICY IF EXISTS garzas_leer ON garzas;
CREATE POLICY garzas_leer ON garzas FOR SELECT USING (viva = 1);

-- `contadores` y `gestos` no reciben ninguna política: RLS activado y
-- cero políticas es una tabla cerrada del todo, incluso para su propio
-- dueño de fila. Solo las funciones SECURITY DEFINER las tocan.

-- `security_invoker = true` comprueba el permiso contra la TABLA que
-- la vista consulta por debajo, no solo contra la vista — la misma
-- lección de esquema-foro.sql, que aquí se me olvidó aplicar hasta que
-- tronó en vivo. Sin `sesion` ni `quien`: son las dos columnas que
-- permitirían cruzar identidades entre garzas, igual que `sesion` en
-- el foro.
GRANT SELECT (id, percha, pose, mira, escala, pico, llegada, tocada) ON garzas TO anon, authenticated;
GRANT SELECT ON garzas_publico TO anon, authenticated;
-- Sin GRANT alguno sobre `garzas`, `contadores` ni `gestos`: todo pasa
-- por `dejar_garza()`, `pintar_pico()`, `acreditar_gesto()` y
-- `calma_actual()`.

-- ── TIEMPO REAL: garza-llega, garza-vuela, pico ───────────────────
-- `dejar_garza()`/`pintar_pico()` avisan con `realtime.send(…, true)`
-- —canal PRIVADO— en vez de Postgres Changes: Supabase misma lo
-- recomienda para esto (con Postgres Changes, un cambio con 100
-- personas escuchando son 100 comprobaciones de permiso, una por
-- persona; con Broadcast desde una función que ya sabe que el dato es
-- seguro, ninguna). El canal se llama 'manglar', un solo canal para
-- los tres avisos.
--
-- Los TOQUES —hasta 15 veces por segundo, nunca guardados— no pasan
-- por aquí: van por Broadcast directo entre navegadores, sin tocar la
-- base para nada, que es exactamente como ya eran antes.
--
-- La calma NO se empuja: cambia despacio (se acumula durante segundos
-- de mucha gente), así que el cliente la pide con `calma_actual()`
-- cada pocos segundos en vez de escucharla en vivo. Menos tráfico para
-- algo que no hace falta ver al milisegundo.
--
-- Canal PRIVADO (el `true` al final de cada `realtime.send`) porque
-- todo el mundo aquí YA está autenticado —Auth Anónima, no cuentas—,
-- así que no hay motivo para dejarlo abierto a quien no ha entrado ni
-- una vez. Esta política es lo que lo permite:
DROP POLICY IF EXISTS bandada_recibir ON realtime.messages;
CREATE POLICY bandada_recibir ON realtime.messages FOR SELECT TO authenticated USING (true);
