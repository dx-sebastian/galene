-- ═══════════════════════════════════════════════════════════════════
-- esquema-foro.sql — LA COMUNIDAD, HABLADA DIRECTO DESDE EL NAVEGADOR.
--
-- No hay servidor propio delante de esto: el navegador llama a Supabase
-- con la llave pública (anon key), y lo que decide qué puede hacer cada
-- quien vive AQUÍ — Row Level Security, triggers y una función RPC —
-- no en un `if` de JavaScript en algún backend. Es la elección que se
-- hizo el 17 ago 2026: menos servidor que operar, a cambio de escribir
-- las reglas como base de datos en vez de como código de Node.
--
-- Sigue siendo cierto lo de siempre: NO HAY UNA SOLA COLUMNA QUE
-- IDENTIFIQUE A NADIE. `sesion` ya no es un hash calculado con un
-- secreto de servidor — es `auth.uid()` de Supabase Auth Anónima: cada
-- pestaña entra sola, sin correo ni contraseña, y recibe un UUID que
-- Supabase emite y recuerda. Sigue sin haber cuentas ni contraseñas;
-- lo que cambia es QUIÉN emite el identificador opaco.
--
-- ── LO QUE ESTO NO PUEDE HACER IGUAL QUE ANTES, DICHO CLARO ─────────
-- El límite de envíos por SESIÓN sigue aquí (tabla `limites`, más abajo
-- — mismos números que tenía `nucleo/limites.js`). El límite por HUELLA
-- DE IP NO tiene equivalente: Postgres, detrás de PostgREST, no ve la
-- IP de quien llama. Sin servidor propio, pedir una sesión nueva vuelve
-- a ser gratis. Para un foro de este tamaño el riesgo real es spam
-- ocasional, no un ataque dirigido; si eso cambia, la IP es la primera
-- pieza que hay que recuperar, y solo se puede metiendo un servidor
-- (aunque sea una función) delante otra vez.
--
-- ── MODERACIÓN, POR AHORA ────────────────────────────────────────────
-- Sin panel propio: se modera desde el Table Editor de Supabase,
-- entrando con la cuenta del proyecto (esa conexión corre como dueño de
-- la tabla y no pasa por RLS). Filtra por `estado` y edítalo a mano.
-- Si esto crece y hace falta que alguien module SIN acceso al panel de
-- Supabase, entonces sí hace falta una tabla de moderadores y su propio
-- login — no está aquí porque no hace falta todavía.
-- ═══════════════════════════════════════════════════════════════════

-- ── LAS TABLAS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hilos (
  id         TEXT    PRIMARY KEY,
  etiqueta   TEXT    NOT NULL CHECK (etiqueta IN ('acompanar','ruta','despues','cuidados','preguntas')),
  -- `estado = 'borrado' OR …`: borrar vacía titulo/cuerpo en el acto
  -- (más abajo, `borrar_propio`/`borrar_con_llave`), y una fila vacía
  -- no puede seguir cumpliendo un mínimo de longitud pensado para
  -- contenido de verdad. Cazado publicando y borrando un hilo de
  -- prueba: el borrado tronaba contra su propio CHECK.
  titulo     TEXT    NOT NULL CHECK (estado = 'borrado' OR char_length(titulo) BETWEEN 8 AND 140),
  cuerpo     TEXT    NOT NULL CHECK (estado = 'borrado' OR char_length(cuerpo) BETWEEN 1 AND 4000),
  autora     TEXT    NOT NULL CHECK (char_length(autora) <= 24),
  anonima    INTEGER NOT NULL DEFAULT 1,
  pose       TEXT    NOT NULL DEFAULT 'reposo',   -- lo fija el trigger, no quien llama
  mira       INTEGER NOT NULL DEFAULT 1,
  sesion     UUID    NOT NULL DEFAULT auth.uid(),
  borrado    TEXT,                                -- SHA-256 de la llave, calculado en el navegador
  creado     BIGINT  NOT NULL DEFAULT (extract(epoch FROM clock_timestamp()) * 1000)::bigint,
  ultima     BIGINT  NOT NULL DEFAULT (extract(epoch FROM clock_timestamp()) * 1000)::bigint,
  votos      INTEGER NOT NULL DEFAULT 0,
  respuestas INTEGER NOT NULL DEFAULT 0,
  reportes   INTEGER NOT NULL DEFAULT 0,
  estado     TEXT    NOT NULL DEFAULT 'visible' CHECK (estado IN ('visible','revision','oculto','borrado')),
  ejemplo    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS hilos_recientes ON hilos(estado, creado DESC, id DESC);
CREATE INDEX IF NOT EXISTS hilos_votados   ON hilos(estado, votos DESC, creado DESC, id DESC);
CREATE INDEX IF NOT EXISTS hilos_solas     ON hilos(estado, respuestas ASC, creado DESC, id DESC);
CREATE INDEX IF NOT EXISTS hilos_etiqueta  ON hilos(etiqueta, estado, creado DESC);
CREATE INDEX IF NOT EXISTS hilos_sesion    ON hilos(sesion);

CREATE TABLE IF NOT EXISTS comentarios (
  id       TEXT    PRIMARY KEY,
  hilo     TEXT    NOT NULL REFERENCES hilos(id) ON DELETE CASCADE,
  padre    TEXT    REFERENCES comentarios(id) ON DELETE CASCADE,
  texto    TEXT    NOT NULL CHECK (estado = 'borrado' OR char_length(texto) BETWEEN 1 AND 2000),
  autora   TEXT    NOT NULL CHECK (char_length(autora) <= 24),
  anonima  INTEGER NOT NULL DEFAULT 1,
  pose     TEXT    NOT NULL DEFAULT 'reposo',
  mira     INTEGER NOT NULL DEFAULT 1,
  sesion   UUID    NOT NULL DEFAULT auth.uid(),
  borrado  TEXT,
  creado   BIGINT  NOT NULL DEFAULT (extract(epoch FROM clock_timestamp()) * 1000)::bigint,
  votos    INTEGER NOT NULL DEFAULT 0,
  reportes INTEGER NOT NULL DEFAULT 0,
  estado   TEXT    NOT NULL DEFAULT 'visible' CHECK (estado IN ('visible','revision','oculto','borrado')),
  ejemplo  INTEGER NOT NULL DEFAULT 0,
  -- La insignia «abrió el hilo». Se calcula UNA VEZ, al insertar (ver
  -- antes_de_comentario), no en cada lectura: comparar `sesion` con la
  -- del hilo en el momento de leer exigiría que quien pregunta pudiera
  -- LEER `sesion` —aunque solo fuera para compararla—, y ese permiso de
  -- columna es exactamente lo que el resto de este fichero evita. Ya
  -- convertida en 0/1, es un dato tan seguro como `votos`.
  es_autora INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS comentarios_hilo   ON comentarios(hilo, padre, creado ASC, id ASC);
CREATE INDEX IF NOT EXISTS comentarios_padre  ON comentarios(padre, creado ASC);
CREATE INDEX IF NOT EXISTS comentarios_sesion ON comentarios(sesion);

CREATE TABLE IF NOT EXISTS votos (
  objeto TEXT    NOT NULL CHECK (objeto IN ('hilo','comentario')),
  cosa   TEXT    NOT NULL,
  sesion UUID    NOT NULL DEFAULT auth.uid(),
  dir    INTEGER NOT NULL CHECK (dir IN (-1, 1)),   -- el 0 no se guarda: se borra la fila
  cuando BIGINT  NOT NULL DEFAULT (extract(epoch FROM clock_timestamp()) * 1000)::bigint,
  PRIMARY KEY (objeto, cosa, sesion)
);

CREATE TABLE IF NOT EXISTS reportes (
  objeto TEXT    NOT NULL CHECK (objeto IN ('hilo','comentario')),
  cosa   TEXT    NOT NULL,
  sesion UUID    NOT NULL DEFAULT auth.uid(),
  motivo TEXT    NOT NULL CHECK (char_length(motivo) <= 200),
  cuando BIGINT  NOT NULL DEFAULT (extract(epoch FROM clock_timestamp()) * 1000)::bigint,
  PRIMARY KEY (objeto, cosa, sesion)
);
CREATE INDEX IF NOT EXISTS reportes_cuando ON reportes(cuando);

-- Cubos de fichas, iguales a los de `nucleo/limites.js`, pero solo en
-- la dimensión de sesión (ver la nota de arriba sobre la IP). Vive en
-- una tabla y no en memoria como el original porque aquí no hay un
-- proceso que la mantenga viva entre peticiones — cada llamada es una
-- conexión nueva de PostgREST.
CREATE TABLE IF NOT EXISTS limites (
  tipo   TEXT NOT NULL,
  sesion UUID NOT NULL,
  fichas REAL NOT NULL,
  ultimo BIGINT NOT NULL,
  PRIMARY KEY (tipo, sesion)
);

-- ── FUNCIONES AUXILIARES ──────────────────────────────────────────

-- El sello (garza + espejado) de una sesión. Determinista: la misma
-- sesión saca siempre la misma garza, igual que `identidad.js`, para
-- que un hilo no parezca escrito por doce desconocidas. Ya no lleva un
-- secreto de servidor mezclado en el hash —`sesion` es un UUID que
-- emitió Supabase, no algo que quien llama pueda elegir, así que ya es
-- impredecible de por sí.
CREATE OR REPLACE FUNCTION sello_de(p_sesion UUID)
RETURNS TABLE(pose TEXT, mira INTEGER)
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  poses TEXT[] := ARRAY['reposo','alerta','encogida','una-pata','mira-abajo','alas'];
  h BIGINT;
BEGIN
  -- `hashtext` es nativo de Postgres (lo usan los índices hash) — nada
  -- de reinventar un hash a mano ni depender de un cast del que no haya
  -- certeza. Pasa por bigint antes del `abs()` porque negar el entero
  -- mínimo de 32 bits desborda; en bigint no hay ese borde.
  h := abs(hashtext(p_sesion::text || 'sello')::bigint);
  RETURN QUERY SELECT poses[(h % 6) + 1], (CASE WHEN (h >> 8) & 1 = 1 THEN 1 ELSE -1 END);
END;
$$;

-- Cubo de fichas con relleno continuo, la misma aritmética que
-- `gastar()` en `nucleo/limites.js`. `FOR UPDATE` evita que dos
-- peticiones a la vez lean el mismo saldo y las dos crean que les
-- alcanza.
-- SECURITY DEFINER porque toca `limites`, y `limites` no le concede
-- nada a `anon`/`authenticated` a propósito (más abajo, sección de
-- permisos): si cualquiera pudiera leer o escribir su propio cubo
-- directo por la API, podría rellenárselo antes de publicar y el
-- límite dejaría de limitar nada.
CREATE OR REPLACE FUNCTION permitir_ficha(p_tipo TEXT, p_sesion UUID, p_capacidad REAL, p_recarga REAL, p_cuantas REAL DEFAULT 1)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fila limites%ROWTYPE;
  ahora BIGINT := (extract(epoch FROM clock_timestamp()) * 1000)::bigint;
  fichas REAL;
BEGIN
  SELECT * INTO fila FROM limites WHERE tipo = p_tipo AND sesion = p_sesion FOR UPDATE;
  fichas := CASE WHEN fila IS NULL THEN p_capacidad
                 ELSE LEAST(p_capacidad, fila.fichas + ((ahora - fila.ultimo) / 1000.0) * p_recarga) END;

  IF fichas < p_cuantas THEN
    INSERT INTO limites(tipo, sesion, fichas, ultimo) VALUES (p_tipo, p_sesion, fichas, ahora)
      ON CONFLICT (tipo, sesion) DO UPDATE SET fichas = EXCLUDED.fichas, ultimo = EXCLUDED.ultimo;
    RETURN FALSE;
  END IF;

  INSERT INTO limites(tipo, sesion, fichas, ultimo) VALUES (p_tipo, p_sesion, fichas - p_cuantas, ahora)
    ON CONFLICT (tipo, sesion) DO UPDATE SET fichas = EXCLUDED.fichas, ultimo = EXCLUDED.ultimo;
  RETURN TRUE;
END;
$$;

-- Reemplaza a `contenido_señales()` (quitada el 17 ago 2026, a
-- propósito: sin cola de revisión, no hay dónde mandar un hilo dudoso a
-- esperar). Esto no intenta cazar plazos médicos inventados ni
-- teléfonos de memoria —esa protección se fue con la cola—, solo
-- palabras soeces, y de forma explícita: RECHAZA en el momento, no
-- esconde en silencio.
--
-- La lista sale de @coffeeandfun/google-profanity-words (MIT, npm),
-- pero NO es esa lista tal cual: es traducción automática del inglés y
-- venía llena de falsos positivos —«mando», «buscar», «japón»,
-- «menaje», «pozo», «fieltro», «coquetear», «gordo», «tonto» aparecían
-- como groserías por alguna jerga mal traducida—. Se cazó leyendo la
-- lista entera antes de usarla, no probándola. Lo de aquí es un
-- subconjunto curado a mano —palabras inequívocas, nada ambiguo— más
-- un puñado propio de Colombia («gonorrea», «malparido») que esa lista,
-- hecha para EE. UU., ni tenía.
--
-- Coincide por PALABRA COMPLETA (`\y…\y`), nunca por fragmento: sin
-- eso, «pendejo» también encendería «apéndejo» si existiera, y ese tipo
-- de error es exactamente el que ya costó una ronda esta noche.
CREATE OR REPLACE FUNCTION contiene_groserias(txt TEXT)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE
AS $$
  SELECT txt ~* ('\y(' || array_to_string(ARRAY[
    'puta','putas','puto','putos',
    'gilipollas',
    'pendejo','pendejos','pendeja','pendejas',
    'cabron','cabrón','cabrones',
    'maricon','maricón','marica','maricas',
    'joder','jodido','jodida',
    'mierda',
    'coño',
    'polla','pollas','verga',
    'follar','follador',
    'hijueputa','hdp',
    'malparido','malparida',
    'gonorrea',
    'chingada','culiao'
  ], '|') || ')\y');
$$;

-- ── TRIGGERS: LO QUE PASA ANTES DE GUARDAR ────────────────────────
-- Los cuatro triggers `antes_de_*` son SECURITY DEFINER por la misma
-- razón que `permitir_ficha`, a la que llaman: `anon`/`authenticated`
-- no tienen permiso directo sobre `limites`, así que la función que los
-- dispara necesita correr con más privilegio que quien la disparó.
CREATE OR REPLACE FUNCTION antes_de_hilo() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s RECORD;
BEGIN
  IF NOT permitir_ficha('hilo', NEW.sesion, 2, 1.0/90) THEN
    RAISE EXCEPTION 'Vas demasiado rápido. Espera un poco antes de publicar otro hilo.';
  END IF;

  IF contiene_groserias(NEW.titulo || E'\n' || NEW.cuerpo) THEN
    RAISE EXCEPTION 'Ese lenguaje no se puede publicar aquí.';
  END IF;

  SELECT * INTO s FROM sello_de(NEW.sesion);
  NEW.pose := s.pose;
  NEW.mira := s.mira;
  NEW.estado := 'visible';
  RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER hilos_antes_insertar BEFORE INSERT ON hilos
  FOR EACH ROW EXECUTE FUNCTION antes_de_hilo();

CREATE OR REPLACE FUNCTION antes_de_comentario() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s RECORD; padre_del_padre TEXT; hilo_estado TEXT; hilo_sesion UUID;
BEGIN
  SELECT estado, sesion INTO hilo_estado, hilo_sesion FROM hilos WHERE id = NEW.hilo;
  IF hilo_estado IS NULL OR hilo_estado IN ('borrado', 'oculto') THEN
    RAISE EXCEPTION 'Ese hilo ya no está.';
  END IF;
  -- `es_autora` es INTEGER, no BOOLEAN (igual que `anonima`/`ejemplo`
  -- en el resto del esquema) — Postgres no convierte un booleano a
  -- entero solo al asignar; sin el cast explícito, manda el texto
  -- 't'/'f' y el INSERT truena con «invalid input syntax for
  -- integer». Se cazó publicando un comentario de prueba de verdad.
  NEW.es_autora := (NEW.sesion = hilo_sesion)::int;

  IF NOT permitir_ficha('comentario', NEW.sesion, 4, 1.0/20) THEN
    RAISE EXCEPTION 'Vas demasiado rápido. Espera un poco antes de comentar de nuevo.';
  END IF;

  IF contiene_groserias(NEW.texto) THEN
    RAISE EXCEPTION 'Ese lenguaje no se puede publicar aquí.';
  END IF;

  -- DOS NIVELES Y SE ACABA: responder a una respuesta cuelga del mismo
  -- padre. Se aplica aquí, no solo en el cliente, para que sea cierto
  -- pase lo que pase por la red.
  IF NEW.padre IS NOT NULL THEN
    SELECT padre INTO padre_del_padre FROM comentarios WHERE id = NEW.padre;
    IF padre_del_padre IS NOT NULL THEN NEW.padre := padre_del_padre; END IF;
  END IF;

  SELECT * INTO s FROM sello_de(NEW.sesion);
  NEW.pose := s.pose;
  NEW.mira := s.mira;
  NEW.estado := 'visible';
  RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER comentarios_antes_insertar BEFORE INSERT ON comentarios
  FOR EACH ROW EXECUTE FUNCTION antes_de_comentario();

CREATE OR REPLACE FUNCTION antes_de_voto() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT permitir_ficha('voto', NEW.sesion, 12, 0.5) THEN
    RAISE EXCEPTION 'Vas demasiado rápido con los votos.';
  END IF;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER votos_antes BEFORE INSERT OR UPDATE ON votos
  FOR EACH ROW EXECUTE FUNCTION antes_de_voto();

CREATE OR REPLACE FUNCTION antes_de_reporte() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT permitir_ficha('reporte', NEW.sesion, 4, 1.0/60) THEN
    RAISE EXCEPTION 'Vas demasiado rápido reportando.';
  END IF;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER reportes_antes BEFORE INSERT ON reportes
  FOR EACH ROW EXECUTE FUNCTION antes_de_reporte();

-- ── TRIGGERS: LO QUE PASA DESPUÉS DE GUARDAR ──────────────────────
-- `votos`/`respuestas` siguen desnormalizados en hilos/comentarios —es
-- la clave de ordenación de la lista— y antes los mantenía la
-- transacción de `dominio/foro.js`. Sin ese código, lo mantiene el
-- trigger: no hay forma de que suba una cosa y no la otra.
--
-- Los tres triggers de aquí abajo son SECURITY DEFINER por un motivo
-- distinto al de arriba: votar en un hilo ajeno, o que reporten algo
-- tuyo, actualiza una fila que NO es de quien disparó el trigger, y las
-- políticas RLS de `hilos`/`comentarios` solo dejan tocar la fila
-- propia. La cuenta que suben es aritmética fija calculada aquí dentro,
-- no un valor que decida quien llama, así que saltarse RLS para
-- escribir justo esa cuenta es seguro.
CREATE OR REPLACE FUNCTION ajustar_votos() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE delta INTEGER; tabla TEXT; cosa TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN delta := NEW.dir; tabla := NEW.objeto; cosa := NEW.cosa;
  ELSIF TG_OP = 'UPDATE' THEN delta := NEW.dir - OLD.dir; tabla := NEW.objeto; cosa := NEW.cosa;
  ELSE delta := -OLD.dir; tabla := OLD.objeto; cosa := OLD.cosa;
  END IF;

  IF delta <> 0 THEN
    IF tabla = 'hilo' THEN UPDATE hilos SET votos = votos + delta WHERE id = cosa;
    ELSE UPDATE comentarios SET votos = votos + delta WHERE id = cosa;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;
CREATE OR REPLACE TRIGGER votos_ajustar AFTER INSERT OR UPDATE OR DELETE ON votos
  FOR EACH ROW EXECUTE FUNCTION ajustar_votos();

CREATE OR REPLACE FUNCTION ajustar_respuestas() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.estado = 'visible' THEN
      UPDATE hilos SET respuestas = respuestas + 1, ultima = NEW.creado WHERE id = NEW.hilo;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.estado IS DISTINCT FROM NEW.estado THEN
    IF OLD.estado = 'visible' AND NEW.estado <> 'visible' THEN
      UPDATE hilos SET respuestas = GREATEST(0, respuestas - 1) WHERE id = NEW.hilo;
    ELSIF OLD.estado <> 'visible' AND NEW.estado = 'visible' THEN
      UPDATE hilos SET respuestas = respuestas + 1 WHERE id = NEW.hilo;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;
CREATE OR REPLACE TRIGGER comentarios_ajustar_respuestas AFTER INSERT OR UPDATE ON comentarios
  FOR EACH ROW EXECUTE FUNCTION ajustar_respuestas();

-- Al llegar al umbral se ESCONDE, no se borra —lo deshace la
-- moderación de un vistazo en el Table Editor—, igual que en el diseño
-- original.
CREATE OR REPLACE FUNCTION despues_de_reporte() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cuantos INTEGER; estado_actual TEXT; hilo_de TEXT;
BEGIN
  IF NEW.objeto = 'hilo' THEN
    UPDATE hilos SET reportes = reportes + 1 WHERE id = NEW.cosa RETURNING reportes, estado INTO cuantos, estado_actual;
  ELSE
    UPDATE comentarios SET reportes = reportes + 1 WHERE id = NEW.cosa RETURNING reportes, estado, hilo INTO cuantos, estado_actual, hilo_de;
  END IF;

  IF cuantos >= 3 AND estado_actual = 'visible' THEN
    IF NEW.objeto = 'hilo' THEN
      UPDATE hilos SET estado = 'revision' WHERE id = NEW.cosa;
    ELSE
      UPDATE comentarios SET estado = 'revision' WHERE id = NEW.cosa;
      UPDATE hilos SET respuestas = GREATEST(0, respuestas - 1) WHERE id = hilo_de;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;
CREATE OR REPLACE TRIGGER reportes_despues AFTER INSERT ON reportes
  FOR EACH ROW EXECUTE FUNCTION despues_de_reporte();

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────
ALTER TABLE hilos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE votos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE reportes   ENABLE ROW LEVEL SECURITY;

-- Ver: lo visible, más lo propio que espera revisión —quien lo escribió
-- tiene que saber que existe y está en camino, no que desapareció.
DROP POLICY IF EXISTS hilos_leer ON hilos;
CREATE POLICY hilos_leer ON hilos FOR SELECT
  USING (estado = 'visible' OR (estado = 'revision' AND sesion = auth.uid()));

DROP POLICY IF EXISTS hilos_escribir ON hilos;
CREATE POLICY hilos_escribir ON hilos FOR INSERT
  WITH CHECK (sesion = auth.uid());

-- Borrar lo propio NO es una política de UPDATE — ver «BORRAR LO
-- PROPIO» más abajo, es una función. Se probó como política (USING +
-- WITH CHECK comparando `sesion = auth.uid()`) y falló siempre con
-- «new row violates row-level security policy», incluso mandando
-- exactamente la fila que el CHECK pedía. La explicación que más
-- encaja con lo observado: un USING de UPDATE LEE la columna
-- existente para decidir si la fila es tuya, y eso —a diferencia de un
-- INSERT, donde `sesion` es un valor que TÚ mandas, no uno que se lee—
-- sí exige permiso de SELECT sobre esa columna. Y `sesion` no lo tiene
-- a propósito (ver la nota grande más arriba, antes de las vistas).
-- No hay UPDATE policy en esta tabla: el cliente no tiene permiso de
-- UPDATE en absoluto (ver GRANTs), y borrar pasa por una función
-- SECURITY DEFINER que lee `sesion` con sus propios permisos.

DROP POLICY IF EXISTS comentarios_leer ON comentarios;
CREATE POLICY comentarios_leer ON comentarios FOR SELECT
  USING (estado = 'visible' OR (estado = 'revision' AND sesion = auth.uid()));

DROP POLICY IF EXISTS comentarios_escribir ON comentarios;
CREATE POLICY comentarios_escribir ON comentarios FOR INSERT
  WITH CHECK (sesion = auth.uid());

-- Votos: cada quien lee y escribe SOLO su propia fila. Nadie necesita
-- leer el voto de otra persona — el contador ya es público en
-- hilos.votos/comentarios.votos.
DROP POLICY IF EXISTS votos_leer ON votos;
CREATE POLICY votos_leer ON votos FOR SELECT USING (sesion = auth.uid());
DROP POLICY IF EXISTS votos_escribir ON votos;
CREATE POLICY votos_escribir ON votos FOR INSERT WITH CHECK (sesion = auth.uid());
DROP POLICY IF EXISTS votos_actualizar ON votos;
CREATE POLICY votos_actualizar ON votos FOR UPDATE USING (sesion = auth.uid()) WITH CHECK (sesion = auth.uid());
DROP POLICY IF EXISTS votos_borrar ON votos;
CREATE POLICY votos_borrar ON votos FOR DELETE USING (sesion = auth.uid());

-- Reportes: se escriben y no se leen desde el cliente — ni el motivo ni
-- quién reportó son de nadie más que de quien mira el Table Editor.
DROP POLICY IF EXISTS reportes_escribir ON reportes;
CREATE POLICY reportes_escribir ON reportes FOR INSERT WITH CHECK (sesion = auth.uid());

-- ── LO QUE SE LEE: VISTAS, NO LAS TABLAS DIRECTO ──────────────────
-- RLS decide QUÉ FILAS se ven; no decide qué COLUMNAS. Si el cliente
-- leyera `hilos`/`comentarios` directo con SELECT *, vería la columna
-- `sesion` de CUALQUIERA cuyo hilo sea visible — un UUID que no
-- identifica por sí solo, pero que sí permite cruzar qué mensajes son
-- de la misma persona aunque uno vaya firmado y el otro «Anónima». Eso
-- es exactamente lo que el servidor viejo evitaba: `dominio/foro.js`
-- calculaba `esMia` puertas adentro y solo mandaba el booleano, nunca
-- el hash. Aquí no hay puertas adentro — así que estas vistas NUNCA
-- seleccionan `sesion` ni `borrado`, y `esMia`/`esAutora` se resuelven
-- SIN leer esa columna en absoluto: `esMia` la calcula el navegador
-- (guarda los ids que ha creado en `sessionStorage` — muere con la
-- pestaña, igual que el resto de la identidad efímera) y `esAutora`
-- quedó precalculada en `comentarios.es_autora` por el trigger.
--
-- (Una versión anterior de este fichero SÍ comparaba `sesion =
-- auth.uid()` aquí dentro. No funcionaba: con `security_invoker`,
-- Postgres exige que quien pregunta tenga permiso de LEER cada columna
-- que la vista toca, aunque el resultado sea un booleano y no la
-- columna en sí — «úsala para comparar» y «léela» no son permisos
-- distintos. Conceder ese permiso habría abierto justo el hueco que
-- esto evita: `GET /rest/v1/hilos?select=sesion` habría funcionado
-- para cualquiera.)
--
-- `security_invoker = true` sigue haciendo falta para que la vista
-- respete el RLS de quien pregunta y no el de quien la creó.
CREATE OR REPLACE VIEW hilos_publico WITH (security_invoker = true) AS
SELECT id, etiqueta, titulo, cuerpo, autora, anonima, pose, mira,
       creado, ultima, votos, respuestas, reportes, estado, ejemplo
FROM hilos;

CREATE OR REPLACE VIEW comentarios_publico WITH (security_invoker = true) AS
SELECT id, hilo, padre, texto, autora, anonima, pose, mira, es_autora,
       creado, votos, reportes, estado, ejemplo
FROM comentarios;

-- ── PERMISOS EXPLÍCITOS ───────────────────────────────────────────
-- Si al crear el proyecto se dejó activado «Automatically expose new
-- tables», Supabase ya habría concedido SELECT sobre `hilos`/
-- `comentarios` en crudo, columna `sesion` incluida — exactamente lo
-- que esta sección evita. Por eso el aviso al crear el proyecto: sin
-- ese permiso de fábrica, lo único que expone al cliente lo que se
-- concede aquí.
--
-- El GRANT de columna en la TABLA de base hace falta incluso para leer
-- por la VISTA: con `security_invoker`, Postgres comprueba el permiso
-- contra la tabla que la vista consulta por debajo, no solo contra la
-- vista. Por eso la lista de columnas de aquí y la de las vistas de
-- arriba tienen que coincidir — ninguna incluye `sesion` ni `borrado`.
GRANT SELECT (id, etiqueta, titulo, cuerpo, autora, anonima, pose, mira,
              creado, ultima, votos, respuestas, reportes, estado, ejemplo)
  ON hilos TO anon, authenticated;
GRANT SELECT (id, hilo, padre, texto, autora, anonima, pose, mira, es_autora,
              creado, votos, reportes, estado, ejemplo)
  ON comentarios TO anon, authenticated;
-- Sin UPDATE aquí a propósito: borrar lo propio pasa por
-- `borrar_propio()`, más abajo — ver la nota junto a las políticas de
-- `hilos`. `votos` sí concede UPDATE de tabla porque ahí `sesion` SÍ
-- tiene SELECT concedido (la fila es siempre la propia, nada que
-- ocultar), así que su política de UPDATE no tropieza con lo mismo.
GRANT INSERT ON hilos, comentarios TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON votos TO anon, authenticated;
GRANT INSERT ON reportes TO anon, authenticated;

-- `limites` NO recibe ningún GRANT, y sigue sin política propia: RLS
-- activado y cero políticas es una tabla cerrada del todo por la API,
-- incluso para su propio dueño de fila. Solo la tocan las funciones
-- SECURITY DEFINER de arriba. Si algún día queda expuesta sin querer
-- (por ejemplo, alguien concede permisos a mano más adelante), esto es
-- lo primero que romper: un cliente que pueda leer o rellenar su propio
-- cubo directamente deja de tener límite.
ALTER TABLE limites ENABLE ROW LEVEL SECURITY;

-- ── BORRAR LO PROPIO ──────────────────────────────────────────────
-- Por qué es una función y no una política de UPDATE: ver la nota
-- larga junto a las políticas de `hilos`. En corto — comprobar
-- `sesion = auth.uid()` en un UPDATE LEE la columna existente, y eso
-- exige permiso de SELECT que `sesion` no tiene a propósito. Aquí
-- dentro no hace falta ese permiso: SECURITY DEFINER da acceso
-- completo a la tabla, y la comprobación de identidad la hace el
-- código, no una política.
CREATE OR REPLACE FUNCTION borrar_propio(p_objeto TEXT, p_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_sesion UUID; v_estado TEXT; v_hilo TEXT;
BEGIN
  IF p_objeto NOT IN ('hilo', 'comentario') THEN RETURN FALSE; END IF;

  IF p_objeto = 'hilo' THEN
    SELECT sesion, estado INTO v_sesion, v_estado FROM hilos WHERE id = p_id;
  ELSE
    SELECT sesion, estado, hilo INTO v_sesion, v_estado, v_hilo FROM comentarios WHERE id = p_id;
  END IF;

  IF NOT FOUND OR v_estado = 'borrado' THEN RETURN FALSE; END IF;
  IF v_sesion IS DISTINCT FROM auth.uid() THEN RETURN FALSE; END IF;

  IF p_objeto = 'hilo' THEN
    UPDATE hilos SET estado = 'borrado', titulo = '', cuerpo = '', autora = 'Anónima', borrado = NULL WHERE id = p_id;
  ELSE
    UPDATE comentarios SET estado = 'borrado', texto = '', autora = 'Anónima', borrado = NULL WHERE id = p_id;
    IF v_estado = 'visible' THEN
      UPDATE hilos SET respuestas = GREATEST(0, respuestas - 1) WHERE id = v_hilo;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$;
GRANT EXECUTE ON FUNCTION borrar_propio(TEXT, TEXT) TO anon, authenticated;

-- ── BORRAR CON LLAVE ──────────────────────────────────────────────
-- Quien borra con la llave de recuperación casi nunca es la misma
-- sesión que escribió —esa es la idea: poder deshacer lo dicho a las
-- cuatro de la mañana aunque la pestaña ya se cerró—, así que las
-- políticas de arriba (que exigen `sesion = auth.uid()`) no alcanzan.
-- SECURITY DEFINER hace que esta función corra con los permisos de
-- quien la creó, no de quien la llama, así que puede saltarse esa
-- regla — pero SOLO para este caso exacto, con la llave ya comprobada
-- dentro. `p_hash` es el SHA-256 de la llave, calculado en el
-- navegador: aquí nunca se ve la llave en texto plano, igual que antes
-- no se veía en el servidor.
CREATE OR REPLACE FUNCTION borrar_con_llave(p_objeto TEXT, p_id TEXT, p_hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_borrado TEXT; v_estado TEXT; v_hilo TEXT;
BEGIN
  IF p_objeto NOT IN ('hilo', 'comentario') THEN RETURN FALSE; END IF;

  IF p_objeto = 'hilo' THEN
    SELECT borrado, estado INTO v_borrado, v_estado FROM hilos WHERE id = p_id;
  ELSE
    SELECT borrado, estado, hilo INTO v_borrado, v_estado, v_hilo FROM comentarios WHERE id = p_id;
  END IF;

  IF NOT FOUND OR v_estado = 'borrado' THEN RETURN FALSE; END IF;
  IF v_borrado IS NULL OR v_borrado <> p_hash THEN RETURN FALSE; END IF;

  IF p_objeto = 'hilo' THEN
    UPDATE hilos SET estado = 'borrado', titulo = '', cuerpo = '', autora = 'Anónima', borrado = NULL WHERE id = p_id;
  ELSE
    UPDATE comentarios SET estado = 'borrado', texto = '', autora = 'Anónima', borrado = NULL WHERE id = p_id;
    IF v_estado = 'visible' THEN
      UPDATE hilos SET respuestas = GREATEST(0, respuestas - 1) WHERE id = v_hilo;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$;
GRANT EXECUTE ON FUNCTION borrar_con_llave(TEXT, TEXT, TEXT) TO anon, authenticated;
