# Diseño: categorías como módulos, con herramientas en base de datos

> Fecha: 2026-11-04. Estado: **pendiente de revisión por la usuaria.**
> Origen: `progress/handoff-modulos-herramientas.md` y las decisiones tomadas en el chat del 2026-11-04.

## 1. Objetivo

Los "módulos" del Home dejan de estar fijos en la app. Pasan a ser las **categorías de
psicoeducación**, que ya existen en la base de datos y se gestionan en WordPress. Una categoría
agrupa contenido de psicoeducación (temas), herramientas o ambos. Una herramienta puede estar en
varias categorías (**muchos a muchos**).

### Éxito significa
- El Home muestra las categorías marcadas con "Mostrar en Home", con el orden, el icono, el título
  y la descripción que se configuran en el plugin Psicoeducación.
- Al tocar una categoría se abre una pantalla con:
  - una tarjeta **"Psicoeducación"**, si la categoría tiene temas, que lleva a los temas de esa
    categoría (`PsychoeducationHome` con su `slug`);
  - las herramientas asignadas a la categoría.
- La pestaña **Herramientas** lista todas las herramientas sin decir a qué categoría pertenecen.
- La pestaña **Biblioteca** funciona igual que hoy, pero solo lista las categorías que tienen temas.
- Asignar o quitar una herramienta de una categoría en WordPress se ve en la app sin publicar una
  build nueva. Sí hace falta una build nueva una sola vez, la que trae este cambio.

## 2. Decisiones tomadas

| # | Decisión |
|---|----------|
| D1 | **Las categorías no tienen candado como módulo.** Siempre se pueden abrir. |
| D2 | El `acceso_feature_key` que ya tiene la categoría (migración 031) **bloquea solo su contenido de psicoeducación**: la tarjeta "Psicoeducación" muestra candado. Las herramientas se bloquean con su propia clave `tool.*`. |
| D3 | `module.parejas` y `module.ansiedad` **se borran**. Solo existen en desarrollo, así que no hay apps publicadas que dependan de ellas. |
| D4 | Las herramientas se asignan desde el **plugin Psicoeducación**, en el formulario de categoría. |
| D5 | La **Biblioteca se queda igual** y solo lista las categorías que tienen al menos un tema. |
| D6 | En el Home aparecen solo las categorías con la casilla **"Mostrar en Home"** (`en_home`). El orden y el icono vienen 100% del plugin. |
| D7 | "Lo que trae Esencial aparece marcado y fijo en los demás planes" es una **feature aparte**, fuera de este diseño. |
| D8 | No se crea una tabla `modulos`: se reutiliza `categorias_psicoeducacion`. |
| D9 | El título, la descripción, el icono y la ruta de cada **herramienta** siguen en la app, porque una herramienta nueva necesita código de pantalla igualmente. La base de datos solo guarda qué `feature_key` va en cada categoría y en qué orden. |

## 3. Modelo de datos (migración `036_categoria_herramientas.sql`)

La migración es idempotente, con el mismo estilo que la 031, para poder aplicarla a mano en el SQL
Editor de Supabase.

```sql
ALTER TABLE categorias_psicoeducacion
  ADD COLUMN IF NOT EXISTS en_home BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS categoria_herramientas (
  categoria_id INT         NOT NULL REFERENCES categorias_psicoeducacion(id) ON DELETE CASCADE,
  feature_key  VARCHAR(80) NOT NULL REFERENCES acceso_features(feature_key)
                           ON UPDATE CASCADE ON DELETE CASCADE,
  orden        INT         NOT NULL DEFAULT 0,
  PRIMARY KEY (categoria_id, feature_key)
);
CREATE INDEX IF NOT EXISTS idx_categoria_herramientas_feature
  ON categoria_herramientas (feature_key);
```

- Que la clave sea de tipo `herramienta` se valida en el servicio, no con un trigger.
- `ON DELETE CASCADE` sobre `feature_key`: si se borra una feature de herramienta, desaparece de
  las categorías.

### Siembra (`ON CONFLICT DO NOTHING` en todos los inserts)
- `relaciones-pareja`:
  - `en_home = true`;
  - herramientas `tool.cnv_translator` (orden 0) y `tool.timeline` (orden 1).
- Categoría nueva `ansiedad`:
  - título "Ansiedad", icono 🧘;
  - descripción tomada del subtítulo actual de la app;
  - `orden` al final;
  - `en_home = true`, sin `acceso_feature_key`, sin temas;
  - herramienta `tool.gratitude` (orden 0).
- Las demás categorías existentes quedan con `en_home = false`. La usuaria decide en el plugin cuáles
  se publican.

### Limpieza
- `DELETE FROM plan_features WHERE feature_key IN ('module.parejas','module.ansiedad');`
- `DELETE FROM acceso_features WHERE feature_key IN ('module.parejas','module.ansiedad');`
- Antes de borrar se verifica que ninguna categoría, tema ni bloque use esas claves como
  `acceso_feature_key`. Si alguna la usa, la migración la pone en `NULL`.
- El tipo `modulo` sigue existiendo en `acceso_features`. Las features de tipo módulo que quedan,
  por ejemplo la de prueba `mn-jj`, no se tocan. Mostrar o quitar ese tipo del formulario de
  Features queda fuera de este diseño.

## 4. Backend

Todas las consultas nuevas son SQL literal sin `${}`, como en `access-repository.ts`, para no
generar hotspots S2077.

### 4.1 Admin (lo usa el plugin)
- `GET /psychoeducation/admin/categories` y `GET /psychoeducation/admin/categories/:slug` agregan
  a cada categoría:
  - `en_home`;
  - `herramientas: string[]`, las claves ordenadas por `orden`.
- `POST /psychoeducation/admin/categories` y `PUT /psychoeducation/admin/categories/:id` aceptan
  dos campos opcionales:
  - `en_home: boolean`;
  - `herramientas: string[]`. Si viene, **reemplaza** la lista completa. El índice del arreglo es
    el `orden`.
- Validación (`AppError` 400 `INVALID_TOOL_FEATURE`): cada clave existe en `acceso_features` con
  `tipo = 'herramienta'` y no hay claves repetidas.
- La escritura de la categoría y la de sus herramientas van en **una sola transacción**: se borran
  las filas de esa categoría y se insertan las nuevas.

### 4.2 Pública (la usa la app)
- **Ruta nueva:** `GET /home/categories`. No se usa `/psychoeducation/...` porque chocaría con
  `/psychoeducation/:slug`.
- **Autenticación:** opcional, igual que `GET /psychoeducation`. Los candados se calculan con
  `resolveFeatures`, que incluye el plan default (Esencial).
- **Respuesta:** las categorías con `en_home = true`, ordenadas por `orden` y después por `id`:

```json
{
  "categorias": [
    {
      "slug": "relaciones-pareja",
      "titulo": "Kit de relaciones de pareja",
      "descripcion": "…",
      "icono": "♥",
      "temasCount": 4,
      "accesoFeatureKey": null,
      "contentLocked": false,
      "herramientas": [
        { "featureKey": "tool.cnv_translator", "locked": true },
        { "featureKey": "tool.timeline", "locked": false }
      ]
    }
  ]
}
```

- `contentLocked` se calcula con el `acceso_feature_key` de la categoría: `NULL` significa libre.
- `temasCount` cuenta los temas de la categoría. Con 0, la app oculta la tarjeta "Psicoeducación".
- Se documenta en `swagger.ts`.

### 4.3 Biblioteca
- `GET /psychoeducation` excluye las categorías sin temas, usando `EXISTS` sobre
  `temas_psicoeducacion`.
- Hay que verificar que el plugin no use esta ruta pública para listar todas las categorías. El
  plugin usa `/psychoeducation/admin/categories`, que no cambia.

### 4.4 Tests
- **Repositorio:** listar categorías del Home, reemplazar herramientas y filtrar la Biblioteca.
- **Servicio:**
  - rechazar claves que no son de tipo herramienta y claves repetidas;
  - calcular `locked` y `contentLocked` con y sin plan;
  - un usuario anónimo recibe solo lo que da Esencial.
- **Rutas:** 200 y forma de la respuesta de `/home/categories`; 400 en el admin con una clave
  inválida; 401 y 403 en el admin sin token o sin rol de administrador.
- **Migración:** aplicarla dos veces seguidas en `backend-db-1` sin error. **Nunca con
  `Backend/.env`, que apunta a producción.**

## 5. Plugin Psicoeducación (1.0.14)

- En el formulario de categoría (`admin/pages/categories.php` y su JS) se agregan:
  - una casilla **"Mostrar en Home"**;
  - **"Herramientas de esta categoría"**: una lista con casillas de las features de tipo
    `herramienta`, que se carga con `GET /admin/access/features`; las marcadas se pueden reordenar
    con subir y bajar;
  - un texto de ayuda: *"La categoría se abre siempre. Las herramientas se bloquean con su propia
    clave. El acceso de la categoría solo bloquea su contenido de psicoeducación."*
- En la tabla de categorías se agregan las columnas **Home** (sí/no) y **Herramientas**, que muestra
  cuántas tiene.
- Una categoría sin temas y sin herramientas se puede guardar, con un aviso: "No se mostrará nada
  al abrirla."
- Se sube la versión en `vittalmind-psicoeducacion.php` y se regenera
  `plugins/vittalmind-psicoeducacion.zip`.

## 6. App

### 6.1 Catálogo de herramientas
- Se crea `src/constants/tool-catalog.ts` con `TOOL_CATALOG: Record<featureKey, ToolDef>`, con
  `title`, `description`, `icon`, `iconBg`, `iconColor`, `route` y `requiresAuth`. Hoy incluye el
  traductor, la línea de tiempo y gratitud.
- Si la API devuelve una clave que no está en el catálogo, se ignora y se registra solo en
  `__DEV__`. Así una app vieja no se rompe cuando se agrega una herramienta nueva.

### 6.2 Datos del Home
- Hook `useHomeCategories`:
  - llama a `GET /home/categories`;
  - guarda la respuesta en caché para usarla sin conexión, con el mismo mecanismo que el acceso;
  - se refresca con las mismas reglas: al entrar a la pantalla si el dato tiene más de 60 s
    (`ACCESS_STALE_MS`), al volver a la app y tras un 403.
- Si no hay red ni caché, el Home muestra un estado vacío: "No pudimos cargar los módulos. Revisa
  tu conexión."
- Los candados `locked` y `contentLocked` se calculan en el servidor, pero la app los recalcula
  con `isFeatureLocked`, que usa el acceso local. Así el Home se actualiza en cuanto cambia el
  plan, sin esperar a refrescar las categorías. Para eso la respuesta debe incluir también el
  `accesoFeatureKey` de la categoría.

### 6.3 Pantallas
- **Home (`home-screen.tsx`):**
  - se quitan `EXPLORE_MODULES` y el candado por módulo;
  - las tarjetas salen de `useHomeCategories`;
  - el subtítulo es "N actividades": las herramientas que la app conoce, más 1 si hay temas.
- **Pantalla nueva `CategoryScreen`** (ruta `Category: { slug }` en el stack raíz):
  - encabezado con el icono, el título y la descripción;
  - tarjeta "Psicoeducación", si `temasCount > 0`:
    - lleva a `PsychoeducationHome` con el `slug`;
    - con `contentLocked` muestra candado y lleva a `AccessRequest`, igual que el contenido
      bloqueado hoy;
  - tarjetas de herramientas en el orden de la API, cada una con candado y la regla de invitado
    (`requiresAuth`) que hoy está en `tools-screen.tsx`.
- **Herramientas (`tools-screen.tsx`):**
  - lista todo `TOOL_CATALOG`, sin encabezados por módulo;
  - se quitan `TOOLS_BY_MODULE`, `MODULES_ORDER`, `MODULE_META` y el parámetro de ruta `module`;
  - se revisa que nadie siga navegando con `Tools: { module }`.
- **`access-keys.ts`:** se quitan `module.parejas`, `module.ansiedad` y `MODULE_FEATURE_BY_ID`.
- **Biblioteca:** sin cambios de código, porque el filtro se hace en el servidor.

### 6.4 Tests de la app
- `useHomeCategories`: datos de la API, respaldo con la caché y estado vacío.
- `CategoryScreen`: con temas o sin ellos, contenido bloqueado, herramienta bloqueada, invitado
  con una herramienta que pide sesión y clave desconocida ignorada.
- Home y Herramientas: se actualizan los snapshots y los tests que usaban las listas fijas.

### 6.5 Publicación
- Hace falta una **build nueva de EAS**. Las apps de producción actuales siguen con su lista fija,
  sin candados, y no usan `module.*`. Por eso borrar esas features no las afecta.

## 7. Fuera de alcance
- Esencial marcado y fijo en la matriz de planes (D7, feature aparte).
- Guardar en la base de datos los textos o los iconos de las herramientas.
- Quitar el tipo `modulo` de `acceso_features` o del formulario de Features.
- Cambios en la matriz de Planes de VM Accesos, más allá de que desaparezcan las filas de
  `module.parejas` y `module.ansiedad` al borrarlas.

## 8. Cómo se divide en features (`feature_list.json`)

Se hace una feature a la vez, en este orden, y cada una cierra con `.\init.ps1` en verde:

1. **Backend:** migración 036, rutas admin y pública, filtro de la Biblioteca, tests y swagger.
2. **Plugin Psicoeducación 1.0.14:** "Mostrar en Home" y las herramientas por categoría, con ZIP.
3. **App:** catálogo, `useHomeCategories`, `CategoryScreen`, Home y Herramientas, tests.
4. **(Aparte)** Esencial marcado y fijo en los demás planes de la matriz.

Las features 107 y 108 de otra sesión siguen sin commitear y tocan Home y Herramientas en la app.
Antes de empezar la feature 3 hay que confirmar que ya se cerraron, para no mezclar cambios.

## 9. Riesgos
- **La migración 035 existe sin commitear:** la 036 debe aplicarse después de ella. En producción
  ya faltan aplicar de la 029 a la 035.
- **Datos de producción:** en Supabase, las categorías existentes quedan con `en_home = false`. Antes
  de publicar la build nueva hay que marcar en el plugin las que deben aparecer. Si no, el Home se
  ve vacío salvo parejas y ansiedad, que la siembra deja visibles.
- **Slug `ansiedad`:** si ya existe una categoría con ese slug en producción, la siembra no la
  duplica (`ON CONFLICT DO NOTHING`), pero sí le asigna gratitud y `en_home = true`. Hay que revisar
  ese caso antes de migrar.
