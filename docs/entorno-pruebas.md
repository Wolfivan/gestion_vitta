# Entorno de pruebas local — WordPress + Docker

> Cómo levantar y usar el entorno donde se prueba el plugin de psicoeducación
> contra un WordPress real, antes de tocar producción.

> [!CAUTION]
> **Todas las credenciales de este documento son de desarrollo local.** Viven en
> contenedores Docker desechables de esta máquina. No son válidas en
> producción, no se deben reutilizar en ningún otro entorno, y no sirven como
> credenciales de ejemplo en documentación pública.
>
> Una excepción a la regla de "nada de secretos en el repo": la contraseña del
> admin de pruebas del Backend (`test@vittal.com` / `test1234`) ya está en
> claro en `Backend/src/database/seed.ts`, commiteada. No introduce una clase de
> riesgo nueva.

## Topología

```
                    ┌──────────────────────────┐
                    │  App (Expo / React Native)│
                    └────────────┬─────────────┘
                                 │ http://localhost:3000
                                 │ (desde el emulador)
                                 ▼
   red: backend_default   ┌──────────────────────┐   ┌──────────────────┐
   ┌──────────────────────┤  backend-api-1        │──▶│ backend-db-1    │
   │                      │  Express  (API)      │   │ Postgres 16     │
   │  ┌───────────────────┴──────────┐           │   │ volumen:        │
   │  │ alias de red: "api"          │           │   │ backend_pgdata  │
   │  └──────────────────────────────┘           │   └──────────────────┘
   │                                             │
   │   ┌─────────────────────────────────────┐   │
   └──▶│  wp-test-wordpress-1                │◀──┘
       │  WordPress 6 · php8.2-apache        │
       │  http://localhost:8082               │
       │  bind mount del plugin desde el repo │
       └──────────────┬──────────────────────┘
                      │ red: wp-test_default
                      ▼
       ┌──────────────────────────────────────┐
       │  wp-test-wpmysql-1                   │
       │  MySQL 8.0  (solo interno, sin      │
       │  puerto publicado)                   │
       │  volumen: wp-test_wp-dbdata          │
       └──────────────────────────────────────┘
```

El punto no obvio de este diagrama: **el plugin no habla con `localhost`**.
Guarda `http://api:3000` en la tabla `wp_options` (`vmp_api_url`), que es un
hostname interno de Docker. Solo resuelve porque el contenedor de WordPress está
enlazado a la red externa `backend_default`, donde el proyecto Backend publica el
alias `api`.

## Arranque

El **Backend va primero**: su compose crea la red `backend_default`, y el de
WordPress la declara `external: true`. Si se levanta al revés, Compose falla con
`network backend_default declared as external, but could not be found`.

```bash
# 1. Backend (Postgres + API)
cd Backend
docker compose up -d

# 2. WordPress (MySQL + WordPress)
cd plugins/wp-test
docker compose up -d
```

Parar:

```bash
docker compose down            # conserva los volúmenes
docker compose down -v         # BORRA los datos: usar solo para empezar de cero
```

Comprobar que todo responde:

```bash
# API viva
docker exec wp-test-wordpress-1 curl -s -w " [%{http_code}]\n" http://api:3000/health

# Panel de WordPress
start http://localhost:8082/wp-admin
```

## Credenciales

### WordPress (panel `http://localhost:8082/wp-admin`)

| Campo | Valor |
|---|---|
| Usuario | `vmpadmin` |
| Contraseña | `vmp-admin-2026` |
| Email | `admin@vittal.local` |
| URL del sitio | `http://localhost:8082` |

### MySQL del WordPress (contenedor `wpmysql`)

| Campo | Valor |
|---|---|
| Base de datos | `wordpress` |
| Usuario | `wordpress` |
| Contraseña | `wordpress` |
| Root | `root` / `rootpass` |
| Host | `wpmysql:3306` (no publicado en el host) |

```bash
docker compose exec wpmysql mysql -uwordpress -pwordpress wordpress
```

### Postgres del Backend (contenedor `db`)

| Campo | Valor |
|---|---|
| Base de datos | `vittalmind` |
| Usuario | `postgres` |
| Contraseña | `postgres` |
| Puerto en el host | `5432` |

### Admin del Backend — para el login del plugin

El plugin **no** autentica contra usuarios de WordPress: hace
`POST /auth/login` contra la API y guarda el JWT (ver
`plugins/vittalmind-psicoeducacion/includes/class-auth.php`). Necesita un
usuario con `role = 'admin'` en la tabla `usuarios_auth`.

| Campo | Valor |
|---|---|
| Email | `test@vittal.com` |
| Contraseña | `test1234` |
| Rol | `admin` |

Lo crea `Backend/src/database/seed.ts`. Se escribe a mano en la primera
instalación del WordPress, en el login que muestra el propio plugin. El plugin
guarda además un `transient_vmp_refresh_token` en `wp_options`; no es un
secreto que deba documentarse, pero conviene saber que está ahí.

## Inventario

| Contenedor | Imagen | Puertos | Volumen | Redes |
|---|---|---|---|---|
| `wp-test-wordpress-1` | `wordpress:php8.2-apache` | `8082:80` | bind del plugin + volumen anónimo en `/var/www/html` | `wp-test_default`, `backend_default` |
| `wp-test-wpmysql-1` | `mysql:8.0` | ninguno | `wp-test_wp-dbdata` | `wp-test_default` |
| `backend-api-1` | `backend-api` | `3000:3000` | ninguno | `backend_default` |
| `backend-db-1` | `postgres:16-alpine` | `5432:5432` | `backend_pgdata` | `backend_default` |

## El plugin se monta en bind, no se copia

El compose monta `plugins/vittalmind-psicoeducacion/` del repo directamente en
`wp-content/plugins/`. No hay copia dentro del contenedor. Dos consecuencias:

- **Editar el repo cambia el WordPress en vivo.** No hay que reinstalar ni
  reconstruir nada.
- **Hay que subir `VMP_VERSION` en cada cambio de JS o CSS.** El navegador
  cachea los assets del panel; sin subir la versión sigue sirviendo la versión
  anterior y parece que el cambio "no funciona". Es el motivo por el que la
  feature #66 tocó `vittalmind-psicoeducacion.php` y no solo `blocks.js`.

Por lo mismo, **`plugins/vittalmind-psicoeducacion.zip` no afecta a este
entorno**: el contenedor usa la carpeta, no el zip. El zip solo importa al
distribuir, y es un artefacto generado que hay que regenerar antes de publicar.

## Migraciones

> [!WARNING]
> **Cuidado con qué `.env` se está ejecutando.** `Backend/.env` apunta a
> **Supabase producción**
> (`db.utudxtykopnowmxijalv.supabase.co`, base `postgres`). `Backend/.env.docker`
> es el del Postgres local (`DB_HOST=db`). Ambos están en `.gitignore`.

El migrador lee `src/database/migrations/`, ordena los nombres y aplica lo que
falta contra la base a la que apunte el `.env` activo. Para el entorno local hay
que apuntar a `.env.docker`, es decir, ejecutarlo **dentro del contenedor**, donde
`db` resuelve:

```bash
docker exec backend-api-1 node dist/database/migrate.js
```

Comprobar qué se ha aplicado:

```bash
docker exec backend-db-1 psql -U postgres -d vittalmind \
  -c "SELECT filename FROM schema_migrations ORDER BY filename DESC LIMIT 5;"
```

> [!IMPORTANT]
> La imagen `backend-api` **hornea** las migraciones en el build y no tiene bind
> mount, así que su contenido solo cambia al reconstruir:
>
> ```bash
> cd Backend && docker compose build api && docker compose up -d api
> ```
>
> Si no reconstruyes, el migrador dentro del contenedor no ve las migraciones
> nuevas aunque estén en tu disco.

Y recuerda que el `CHECK` de `tipo_componente` en Postgres es la **única** puerta
que valida el tipo de bloque en tiempo de ejecución: el backend no lo valida. Si
creas un bloque de un tipo sin migrar, el `INSERT` falla con violación de
constraint y el panel muestra un error 500 sin más explicación.

### Nombres reales (verificados contra la base)

Para diagnosticar este tipo de fallo:

| Qué | Nombre real |
|---|---|
| Tabla de bloques | `contenidos_bloques` |
| Constraint del tipo | `contenidos_bloques_tipo_componente_check` |
| Tabla de temas | `temas_psicoeducacion` |
| Tabla de categorías | `categorias_psicoeducacion` |
| Migraciones aplicadas | tabla `schema_migrations`, columna `filename` (no hay `version`) |

El error del panel llega al log del Backend, no al de PHP, y trae la fila que no
entró:

```bash
docker logs backend-api-1 --since 24h 2>&1 | Select-String "tipo_componente_check"
```

Comprobar de un vistazo qué tipos admite el `CHECK` en este momento:

```bash
docker exec backend-db-1 psql -U postgres -d vittalmind -c \
  "SELECT pg_get_constraintdef(oid) FROM pg_constraint
   WHERE conname = 'contenidos_bloques_tipo_componente_check';"
```

Y qué temas se quedan **sin bloques**, que son los que la app esconde y que antes
reventaban la pantalla:

```bash
docker exec backend-db-1 psql -U postgres -d vittalmind -c \
  "SELECT t.id, t.titulo, COUNT(b.id) AS bloques
   FROM temas_psicoeducacion t
   LEFT JOIN contenidos_bloques b ON b.tema_id = t.id
   GROUP BY t.id, t.titulo HAVING COUNT(b.id) = 0;"
```

> [!WARNING]
> Un tema se crea **antes** que sus bloques. Si el `INSERT` del bloque falla, el
> tema queda creado y vacío, y el plugin lo reporta como error sin llegar a
> mencionarlo. Por eso la regla de la feature #70: un tema sin bloques no se
> muestra.

## Procedimiento end-to-end

Para probar un bloque de psicoeducación de punta a punta:

1. **Levantar** Backend y WordPress (ver [Arranque](#arranque)).
2. **Verificar la API** desde dentro del contenedor de WordPress. Si no devuelve
   200, el panel no va a poder guardar nada.
3. **Migrar** la base local (ver [Migraciones](#migraciones)) si el cambio
   requiere un `CHECK` nuevo.
4. **Entrar** en `http://localhost:8082/wp-admin` con `vmpadmin`.
5. **Activar** el plugin *VittalMind Psicoeducación* si no lo está.
6. En su página de ajustes, **comprobar la URL de la API**. Todas las llamadas
   pasan por `admin-ajax.php` y de ahí a PHP, que a su vez usa
   `wp_remote_request` **desde dentro del contenedor** (ver
   `includes/class-api-client.php:121-132`). El navegador nunca habla con la API
   directamente. Por tanto la URL tiene que ser alcanzable *desde el
   contenedor*: `http://api:3000` funciona y `http://localhost:3000` no, porque
   ahí solo está el propio WordPress. Con la URL mal puesta el síntoma es un
   error de conexión con `status: 0`, no un 401.
7. **Iniciar sesión** en el panel del plugin con `test@vittal.com`.
8. **Crear el contenido** en Categorías / Temas / Bloques.
9. **Verificar en la App**: `npx expo start`, entrar en Biblioteca → categoría →
   tema, y comprobar que el bloque se pinta y responde.

Para el contenido de psicoeducación en sí (tipos de bloque disponibles, formato
del `cuerpo_json`, qué URLs se aceptan), ver `manuales/psicoeducacion-contenidos.md`.

## Problemas conocidos

Recopilados al revisar el entorno el 2026-09-26. Ninguno bloquea el trabajo.

- ~~**Las migraciones del entorno local llegan solo hasta `018`.**~~ **Resuelto
  el 2026-09-26** con la feature #70: `019`, `020` y `021` aplicadas reconstruyendo
  la imagen. El `CHECK` de `tipo_componente` ya admite los 7 tipos y la base local
  ya puede guardar un bloque de video. Para volver a comprobarlo:

  ```bash
  docker exec backend-db-1 psql -U postgres -d vittalmind -c \
    "SELECT filename, applied_at FROM schema_migrations ORDER BY id DESC LIMIT 3;"
  ```

  Recordar que la migración se aplicó **dentro del contenedor**, nunca desde el
  host: el entrypoint de `backend-api` corre el migrador al arrancar, así que un
  `docker compose up -d api` tras reconstruir ya basta.
- **`019` y `020` son de la feature de gratitud (#67).** Ambas son
  `CREATE TABLE IF NOT EXISTS` sobre `gratitude_entries` y `gratitude_streaks`, no
  tocan psicoeducación y son idempotentes, así que aplicarlas es seguro. Entraron
  como efecto colateral de traer la `021`, que era el objetivo.
- **El tema "El amor" está duplicado** en `temas_psicoeducacion` (id 2 y 3, misma
  categoría, mismo `orden`). Es consecuencia de los seeds no idempotentes: `010`
  insertó el tema y `012` lo renombró desde `"Psicoeducación para parejas"`, y
  acabó aplicado dos veces. El id 3 se quedó **sin bloques**, y desde la feature
  #70 la app **lo esconde** (un tema sin bloques no se muestra), así que el
  usuario ya no lo ve dos veces. La fila sigue en la base, pendiente de decidir si
  se limpia. Los seeds en sí siguen sin ser idempotentes, que es la causa real.
- **El core de WordPress está en un volumen anónimo** (`a480d4f3…`), no con
  nombre. Si se recrea el contenedor hay que reinstalar WordPress. El
  instalador reaplica las credenciales del compose, así que el acceso al panel no
  se pierde, pero sí cualquier ajuste hecho a mano.
- **Contenedores muertos que no son de este proyecto**: `openproject`
  (`Exited 255`, 2 meses) y `pg-ssl-test` (`Exited`, 7 semanas). Se pueden
  borrar con `docker rm` para limpiar ruido.
- **El contenedor de WordPress no tiene `healthcheck`**, solo MySQL. `compose ps`
  no refleja si el panel está respondiendo; hay que comprobarlo con `curl`.
- **La red `backend_default` es un acoplamiento invisible.** Si alguien levanta
  solo el compose de WordPress, todo parece ir bien (el panel carga, las
  categorías se listan) pero **no se puede crear ni editar nada**, porque todas
  las rutas de escritura pasan por la API y fallan al no resolver `api`.
