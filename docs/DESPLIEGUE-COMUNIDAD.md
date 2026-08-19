# Encender la comunidad

Todo el código del foro y de la bandada ya está en `main`. Lo que falta
no es código: son **dos variables y un archivo de SQL**, y solo las
puedes poner tú, porque son de tu proyecto de Supabase.

Mientras no estén, el sitio se publica igual y `/comunidad` dice «no se
pudo llegar a la comunidad ahora mismo». Eso es un estado declarado y
medido (`pruebas/e2e/foro.spec.js`), no una página rota: el hero, el
reloj, el mapa, «guardar lo que recuerdo» y el manglar con sus garzas
siguen funcionando igual.

> **Nota sobre Vercel.** Este sitio **no** se despliega en Vercel. Es
> estático y sale por **GitHub Pages**, desde
> `.github/workflows/pages.yml`, cada vez que algo entra en `main`. No
> hace falta contratar nada ni mover el dominio: lo único que cambia es
> de dónde saca el build las dos variables.

---

## 1 · Las dos llaves

En [supabase.com](https://supabase.com) → tu proyecto → **Project
Settings → API**:

| Qué copiar | A dónde va |
|---|---|
| **Project URL** | `PUBLIC_SUPABASE_URL` |
| La llave marcada **`anon` `public`** | `PUBLIC_SUPABASE_ANON_KEY` |

**Nunca la `service_role`.** Esa se salta todas las políticas de fila y
no tiene nada que hacer en un navegador.

La `anon` **sí** es pública, y eso no es un descuido: viaja dentro del
paquete que descarga cualquiera que entre. Lo que decide qué se puede
hacer con ella no es su secreto, es RLS — ver
`servidor/src/base/esquema-foro.sql`.

### En tu máquina

```bash
cp .env.example .env
# y pega las dos dentro
```

### En lo publicado

GitHub → el repositorio → **Settings → Secrets and variables →
Actions** → pestaña **Variables** → **New repository variable**, dos
veces, con esos dos nombres exactos.

> ### ⚠ La trampa, vista en vivo
>
> En esa misma página hay un botón **«Manage environment secrets»**. Si
> se entra por ahí, GitHub pide primero un **nombre de entorno** — y es
> muy fácil escribir ahí el nombre de la variable. Las dos quedan
> guardadas como secretos de un entorno llamado `PUBLIC_SUPABASE_URL`,
> que ningún trabajo declara, así que **no las ve nadie**.
>
> Y no canta a la vista: en la lista aparecen con su nombre correcto.
> Lo que hay que mirar es la columna **Environment**. Si tiene algo
> escrito, están en el sitio equivocado.
>
> Cómo distinguirlo de un vistazo: lo que sirve sale bajo el epígrafe
> **Repository variables** (o **Repository secrets**), sin columna de
> entorno. Si abajo pone «This repository has no secrets», no hay nada
> puesto donde el build pueda leerlo.
>
> El paso «Ver si las llaves de Supabase llegaron al build» del flujo lo
> dice en cada despliegue, con la lista de nombres que sí ve.

El flujo las lee de `vars` y, si no están ahí, de `secrets`; funciona
de las dos maneras. Como la `anon` es pública por diseño, **Variables**
es su sitio: en `Secrets` GitHub la enmascara en los registros y hace
más difícil ver qué pasó cuando algo falla.

⚠ **Astro las inserta AL COMPILAR**, no las lee en el navegador. O sea:
después de ponerlas hay que **volver a construir**. Un push a `main`
vale; si no hay nada que empujar, Actions → «Publicar en GitHub Pages»
→ **Run workflow**.

---

## 2 · El SQL

En Supabase → **SQL Editor**, pegar y ejecutar los dos archivos, en
este orden:

1. `servidor/src/base/esquema-foro.sql`
2. `servidor/src/base/esquema-bandada.sql`

Los dos son idempotentes (`CREATE TABLE IF NOT EXISTS`, `CREATE OR
REPLACE FUNCTION`), así que se pueden volver a pasar sin romper nada.

> ### ⚠ Si ya los habías corrido antes del 18 ago 2026
>
> **Hay que volver a pasar `esquema-bandada.sql`.** Comprobado contra
> tu base el 18 ago 2026 con `npm run base`: le faltan dos cosas.
>
> 1. **Las perchas.** `dejar_garza()` reparte del 0 al 10 y el manglar
>    tiene **ocho** ramas medidas sobre la lámina. Una garza en la 8, 9
>    o 10 no se pinta, y quien la dejó no se ve a sí misma — tres de
>    cada diez visitantes.
> 2. **Nadie se va nunca.** No existe `volar_garza()`, así que lo único
>    que saca una garza del árbol es el desalojo de la más antigua: el
>    manglar enseña las últimas diez sesiones que hubo, no quién está.
>    Once sesiones seguidas dejaron once garzas y ninguna se fue sola.
>    Eso es fabricar personas, que es la regla 3.
>
> Después de pasarlo, `npm run base` tiene que salir todo verde.

## 3 · Auth anónima

Supabase → **Authentication → Sign In / Providers → Anonymous Sign-Ins
→ Enable**.

Sin esto, `signInAnonymously()` falla y no arranca ni el foro ni la
bandada. Es lo que da un identificador opaco sin pedir correo ni
contraseña — no hay cuentas en este sitio y no va a haberlas.

---

## 4 · Comprobar que quedó

```bash
npm run build && npm test          # la batería entera contra dist/
```

Con las variables puestas, el grupo «el foro contra la base» de
`foro.spec.js` **deja de saltarse** y escribe de verdad. Ojo con eso:
apunta a la base que tengas configurada. Si es la de producción, va a
crear hilos de prueba ahí.

Y después de desplegar, contra lo que de verdad le llega a la gente:

```bash
npm run test:prod
```

---

## Lo que sigue sin estar, y no depende de esto

- `VERIFICADO` en `src/datos/sitio.js` sigue en `false`, y tiene que
  seguir hasta que la revisión clínica firmada esté guardada en
  `docs/verificacion/`. Ver `docs/verificacion/SOLICITUD.md`.
- El enlace de denuncia ya está comprobado y corregido. La RAÍZ del
  dominio (`adenunciar.policia.gov.co/`) devuelve **500** con una
  pantalla de error de ASP.NET; la entrada que funciona es
  `adenunciar.policia.gov.co/Adenunciar/`, que redirige al login del
  portal y responde 200. Lo vio el dueño desde Colombia y se midió
  ruta por ruta después.

  Conviene volver a medirlo de vez en cuando: es el sitio de una
  entidad pública y ya se ha mudado una vez. Debajo del enlace queda
  el 122 de la Fiscalía, que es un teléfono y no se cae con una
  mudanza de servidor.
