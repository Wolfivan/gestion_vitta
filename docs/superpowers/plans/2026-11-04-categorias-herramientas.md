# Categorías con herramientas: plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: usa superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** que los módulos del Home sean las categorías de psicoeducación, con una relación muchos a muchos con las herramientas, gestionadas desde el plugin Psicoeducación.

**Arquitectura:**
- La migración 036 agrega `en_home` y la tabla `categoria_herramientas`.
- El backend expone la asignación en las rutas admin y suma la ruta pública `GET /home/categories`.
- El plugin edita la asignación.
- La app arma el Home y la pantalla de categoría con esa API y un catálogo local de herramientas.

**Stack:** PostgreSQL, Express con TypeScript, Jest y supertest (Backend); WordPress con jQuery (plugin); Expo y React Native con Jest y Testing Library (App).

**Spec:** `docs/superpowers/specs/2026-11-04-categorias-herramientas-design.md`

## Restricciones globales

- **Una feature a la vez.** Cada parte (Backend, plugin, App) es su propia entrada en `feature_list.json` y se cierra con `.\init.ps1` en verde antes de empezar la siguiente.
- **No se hace commit.** Donde la plantilla dice "Commit", aquí se actualiza `progress/current.md`. Commitear lo decide la usuaria.
- **Las migraciones se prueban solo en el Postgres de Docker (`backend-db-1`).** Nunca se corre `npm run migrate` con `Backend/.env`, que apunta a producción.
- **Las consultas nuevas son SQL literal, sin `${}`.** Evita los hotspots S2077 de Sonar.
- **Claves que se borran:** `module.parejas` y `module.ansiedad`.
- **Claves de herramienta:** `tool.cnv_translator`, `tool.timeline` y `tool.gratitude`.
- **Código de error:** una clave que no es de tipo herramienta, o una clave repetida, responde 400 con `INVALID_TOOL_FEATURE`.
- **Ruta pública:** `GET /home/categories`, que devuelve `{ categorias: [...] }`.
- **Textos fijos de la spec:**
  - ayuda del plugin: "La categoría se abre siempre. Las herramientas se bloquean con su propia clave. El acceso de la categoría solo bloquea su contenido de psicoeducación.";
  - aviso del plugin: "No se mostrará nada al abrirla.";
  - estado vacío de la app: "No pudimos cargar los módulos. Revisa tu conexión."
- **Versiones del plugin:** Psicoeducación pasa a 1.0.14, en el encabezado `Version` y en `VMP_VERSION`, y se regenera el ZIP.
- **Ya está hecho:** la Biblioteca ya excluye las categorías sin temas visibles (`findAllCategories` tiene `HAVING COUNT(b.id) > 0`). La Tarea 2 solo agrega un test de regresión para que `ansiedad` no aparezca.

## Puntos a revisar

1. **Herramienta asignada a una categoría pero sin entrada en `TOOL_CATALOG`:** la app la ignora y no se rompe. Test en la Tarea 6.
2. **El plan cambia mientras el Home está abierto:** los candados se recalculan con `isFeatureLocked` sobre el acceso local, no con el `locked` que guardó la caché. Test en la Tarea 7.
3. **Se guarda una categoría con `herramientas: []`:** se borran todas sus asignaciones. Si no se envía `herramientas`, no se tocan. Test en la Tarea 3.
4. **Se aplica la migración dos veces:** la segunda vez no hay error ni duplicados, y `ansiedad` sigue teniendo una sola fila. Verificación en la Tarea 1.
5. **Invitado toca una herramienta con `requiresAuth`:** se le pide iniciar sesión, igual que hoy en `tools-screen.tsx`, y no se le manda a Solicitar acceso. Test en la Tarea 7.

---

## Feature A: Backend

Se registra en `feature_list.json` con la siguiente id libre (109), en estado `in_progress` al empezar.

### Tarea 1: Migración 036

**Archivos:**
- Crear: `Backend/src/database/migrations/036_categoria_herramientas.sql`
- Modificar: `Backend/src/models/psychoeducation.ts`. Agregar `en_home: boolean` a `IPsychoeducationCategory`.

**Interfaces:**
- **Produce:**
  - la columna `categorias_psicoeducacion.en_home`;
  - la tabla `categoria_herramientas(categoria_id, feature_key, orden)`, con los SQL exactos de la sección 3 de la spec.

- [ ] **Paso 1: escribir la migración.** Copiar de la spec el DDL, la siembra y la limpieza. Orden interno:
  1. DDL;
  2. `INSERT` de la categoría `ansiedad`, con `ON CONFLICT (slug) DO NOTHING`, `orden = COALESCE(MAX(orden), 0) + 1` y la descripción del `MODULE_META.ansiedad.subtitle` actual;
  3. `UPDATE ... SET en_home = true WHERE slug IN ('relaciones-pareja','ansiedad')`;
  4. `INSERT ... SELECT` de las herramientas por slug, con `ON CONFLICT DO NOTHING`;
  5. `UPDATE` que pone en `NULL` todo `acceso_feature_key` que apunte a `module.*`, en categorías, temas y bloques;
  6. `DELETE` en `plan_features` y después en `acceso_features`.

  Los inserts de herramientas filtran con `WHERE EXISTS (SELECT 1 FROM acceso_features WHERE feature_key = ...)`. Así una base sin esas features no falla.
- [ ] **Paso 2: aplicarla en Docker.**
  Comando: `Get-Content Backend/src/database/migrations/036_categoria_herramientas.sql | docker exec -i backend-db-1 psql -U postgres -d vittalmind -v ON_ERROR_STOP=1`
  Resultado esperado: termina sin `ERROR`.
- [ ] **Paso 3: aplicarla otra vez**, con el mismo comando. Resultado esperado: sin `ERROR`.
- [ ] **Paso 4: verificar los datos.**
  Comando: `docker exec backend-db-1 psql -U postgres -d vittalmind -c "select c.slug, c.en_home, ch.feature_key, ch.orden from categorias_psicoeducacion c left join categoria_herramientas ch on ch.categoria_id=c.id order by c.orden, ch.orden"`
  Resultado esperado:
  - `relaciones-pareja` con `tool.cnv_translator` (0) y `tool.timeline` (1);
  - una sola fila `ansiedad` con `tool.gratitude` (0);
  - `select count(*) from acceso_features where feature_key like 'module.%'` devuelve 0.
- [ ] **Paso 5: correr el test de migraciones.** `cd Backend; npx jest tests/database-migration.test.ts`. Si el test lista los archivos esperados, agregar `036_categoria_herramientas.sql`.
- [ ] **Paso 6:** anotar en `progress/current.md` que la 036 está aplicada en Docker.

### Tarea 2: Repositorio

**Archivos:**
- Modificar: `Backend/src/services/psychoeducation-repository.ts`
- Test: `Backend/tests/psychoeducation-repository.test.ts`, que mockea solo `pool`.

**Interfaces:**
- **Produce:**
  - `findToolKeysByCategoryIds(ids: number[]): Promise<Array<{ categoria_id: number; feature_key: string; orden: number }>>`, que devuelve las filas ordenadas por `categoria_id, orden`;
  - `replaceCategoryTools(categoriaId: number, featureKeys: string[], client?: PoolClient): Promise<void>`, que corre `DELETE ... WHERE categoria_id = $1` y un `INSERT ... SELECT unnest($2::text[]) WITH ORDINALITY` (`orden = ordinality - 1`). El `INSERT` se omite si la lista está vacía.
    - Con `client`, usa esa conexión y no abre transacción, porque la abre quien la llama (Tarea 3).
    - Sin `client`, abre su propia transacción con `pool.connect()` (`BEGIN`/`COMMIT`). Si algo falla hace `ROLLBACK`, libera la conexión y re-lanza el error;
  - `createCategory(..., enHome = false, client?: PoolClient)` y `updateCategory(id, data, client?: PoolClient)`: si reciben `client`, lo usan en lugar de `pool`;
  - `findHomeCategories(): Promise<IPsychoeducationCategoryWithCount[]>`, que trae `WHERE c.en_home = true`, `ORDER BY c.orden, c.id`, con el mismo `temas_count` que `findAllCategories` pero **sin** `HAVING`, porque `ansiedad` no tiene temas;
  - `createCategory` y `updateCategory` aceptan y devuelven `en_home`;
  - `IPsychoeducationCategory` (Tarea 1) ya incluye `en_home`.

- [ ] **Paso 1: tests que fallan.**
  - `findHomeCategories filtra por en_home y no exige temas`: el SQL contiene `WHERE c.en_home = true` y `ORDER BY c.orden, c.id`, y no contiene `HAVING`.
  - `replaceCategoryTools borra y reinserta en una transaccion`: con un `client` mockeado (`pool.connect`), las llamadas son, en orden, `BEGIN`, `DELETE`, `INSERT`, `COMMIT`. Los parámetros del `INSERT` son `[5, ['tool.timeline','tool.gratitude']]`.
  - `replaceCategoryTools con lista vacia solo borra`: `BEGIN`, `DELETE`, `COMMIT`, sin `INSERT`.
  - `replaceCategoryTools hace ROLLBACK si falla el INSERT`: el `INSERT` rechaza, se espera `ROLLBACK`, `client.release()` y que la promesa rechace.
  - `findAllCategories sigue excluyendo categorias sin temas`: el SQL contiene `HAVING COUNT(b.id) > 0`. Es el test de regresión de la Biblioteca.
- [ ] **Paso 2:** `cd Backend; npx jest tests/psychoeducation-repository.test.ts`. Resultado esperado: FALLA porque las funciones no existen.
- [ ] **Paso 3: implementar las funciones** con las firmas de arriba, en SQL literal.
- [ ] **Paso 4:** el mismo comando. Resultado esperado: PASA.
- [ ] **Paso 5:** actualizar `progress/current.md`.

### Tarea 3: Servicio y rutas admin

**Archivos:**
- Modificar: `Backend/src/services/psychoeducation-service.ts`, `Backend/src/controllers/psychoeducation-controller.ts`
- Test: `Backend/tests/psychoeducation.test.ts`, que mockea el repositorio entero, y `Backend/tests/access-server-gating.test.ts` si ahí viven los tests admin de categorías.

**Interfaces:**
- **Consume (Tarea 2):** `findToolKeysByCategoryIds`, `replaceCategoryTools`, y `en_home` en `createCategory` y `updateCategory`.
- **Produce:**
  - `getAdminCategories()` y `getAdminCategoryDetail(slug)` agregan `enHome: boolean` y `herramientas: string[]` a cada categoría;
  - `createCategory(data & { enHome?: boolean; herramientas?: string[] })` y `updateCategory(id, data & { enHome?: boolean; herramientas?: string[] })`;
  - `assertToolFeatures(keys: string[] | undefined): Promise<void>`, privada, que valida con `accessRepository.findFeatureByKey`;
  - el controlador lee `enHome` y `herramientas` de `req.body` en `adminCreateCategory` y `adminUpdateCategory`.

- [ ] **Paso 1: tests que fallan** (supertest, con token de admin igual que los tests admin actuales).
  - `PUT /psychoeducation/admin/categories/1 con herramientas validas las reemplaza`: el body es `{ herramientas: ['tool.timeline'] }`, responde 200 y se llama a `replaceCategoryTools(1, ['tool.timeline'])`.
  - `PUT con herramientas: [] borra todas`: se llama a `replaceCategoryTools(1, [])`.
  - `PUT sin herramientas no toca la asignacion`: no se llama a `replaceCategoryTools`.
  - `PUT con una feature de contenido responde 400 INVALID_TOOL_FEATURE`: `findFeatureByKey` devuelve `{ tipo: 'contenido' }`.
  - `PUT con una clave repetida responde 400 INVALID_TOOL_FEATURE`.
  - `PUT con enHome true lo guarda`: `updateCategory` recibe `en_home: true`.
  - `POST crea la categoria y asigna herramientas`: responde 201, y `replaceCategoryTools` recibe el `id` que devolvió `createCategory`.
  - `GET /psychoeducation/admin/categories incluye enHome y herramientas`: con `findToolKeysByCategoryIds` mockeado, la categoría 1 trae `herramientas: ['tool.cnv_translator','tool.timeline']` en ese orden.
  - `PUT sin token responde 401` y `PUT con token no admin responde 403`.
- [ ] **Paso 2:** `cd Backend; npx jest tests/psychoeducation.test.ts`. Resultado esperado: FALLA.
- [ ] **Paso 3: implementar.**
  - En `updateCategory`, si solo vienen `herramientas` o `enHome`, el repositorio no debe devolver `null` por "no hay campos": se verifica que exista con `findCategoryById` y responde 404 si no existe.
  - La escritura de la categoría y la de sus herramientas van en una sola transacción, como pide la spec 4.1. El servicio abre la transacción con `pool.connect()`, como `access-repository.ts:355`, y pasa el mismo `client` a `createCategory` o `updateCategory` y a `replaceCategoryTools`.
  - Test adicional: `PUT hace ROLLBACK si falla el reemplazo de herramientas`. `replaceCategoryTools` rechaza, la respuesta es 500 y el `client` mockeado recibe `ROLLBACK`.
- [ ] **Paso 4:** el mismo comando. Resultado esperado: PASA.
- [ ] **Paso 5:** actualizar `progress/current.md`.

### Tarea 4: Ruta pública `GET /home/categories`

**Archivos:**
- Crear: `Backend/src/routes/home.ts`, que exporta `homeRouter`.
- Modificar:
  - `Backend/src/app.ts`: `app.use(homeRouter)` junto a `psychoeducationRouter`;
  - `Backend/src/services/psychoeducation-service.ts`: `getHomeCategories(idAnonimo?: string)`;
  - `Backend/src/controllers/psychoeducation-controller.ts`: `getHomeCategories`, que usa `resolveCallerIdAnonimo`;
  - `Backend/src/docs/swagger.ts`.
- Test: `Backend/tests/home-categories.test.ts`

**Interfaces:**
- **Consume:** `findHomeCategories` y `findToolKeysByCategoryIds` (Tarea 2), `resolveFeatures` y `canAccess` (gating).
- **Produce:** la respuesta exacta del ejemplo JSON de la spec 4.2:

```ts
interface IHomeCategory {
  slug: string; titulo: string; descripcion: string | null; icono: string | null;
  temasCount: number; accesoFeatureKey: string | null; contentLocked: boolean;
  herramientas: Array<{ featureKey: string; locked: boolean }>;
}
// GET /home/categories -> { categorias: IHomeCategory[] }
```

Las interfaces van en `Backend/src/models/psychoeducation.ts`.

- [ ] **Paso 1: tests que fallan** (se mockean el repositorio y `resolveFeatures`).
  - `anonimo recibe solo lo que da Esencial`: `resolveFeatures` devuelve `{'tool.timeline'}`. El traductor sale `locked: true`, la línea de tiempo `locked: false` y una categoría con `acceso_feature_key: 'content.vip'` sale `contentLocked: true`.
  - `con token se resuelve el acceso del usuario`: se llama a `resolveFeatures` con el `idAnonimo` del JWT.
  - `categoria sin feature tiene contentLocked false y accesoFeatureKey null`.
  - `respeta el orden de herramientas y categorias del repositorio`.
  - `categoria sin herramientas devuelve herramientas: []`.
  - `responde { categorias: [] } si no hay categorias en home`.
- [ ] **Paso 2:** `cd Backend; npx jest tests/home-categories.test.ts`. Resultado esperado: FALLA (404).
- [ ] **Paso 3: implementar** `getHomeCategories`, el controlador, la ruta y el swagger. Se hacen dos consultas: categorías, y herramientas con `ANY($1)` de los ids. Se agrupan en memoria.
- [ ] **Paso 4:** el mismo comando. Resultado esperado: PASA.
- [ ] **Paso 5: cierre de la Feature A.**
  - Correr `.\init.ps1` desde la raíz. Resultado esperado: todo en verde.
  - Marcar la feature 109 como `done` y documentar en `progress/current.md`.

---

## Feature B: plugin Psicoeducación 1.0.14

Se registra como feature 110.

### Tarea 5: herramientas y "Mostrar en Home" en el formulario de categoría

**Archivos:**
- Modificar:
  - `plugins/vittalmind-psicoeducacion/admin/pages/categories.php`: casilla `name="enHome"`, contenedor `#vmp-category-tools` y el texto de ayuda exacto;
  - `plugins/vittalmind-psicoeducacion/admin/js/categories.js`: cargar, renderizar, ordenar y enviar los datos;
  - `plugins/vittalmind-psicoeducacion/admin/js/admin.js`: agregar `VMP.loadToolFeatures(callback)`;
  - `plugins/vittalmind-psicoeducacion/vittalmind-psicoeducacion.php`: versión 1.0.14 en el encabezado y en `VMP_VERSION`;
  - `plugins/vittalmind-psicoeducacion.zip`: regenerarlo.

**Interfaces:**
- **Consume (Feature A):** `GET /psychoeducation/admin/categories[/:slug]` con `enHome` y `herramientas`. `POST` y `PUT` aceptan `enHome` y `herramientas` (orden = índice).
- **Produce:** `VMP.loadToolFeatures(callback(list: Array<{featureKey, nombre}>))`. Usa el mismo `GET /admin/access/features` que `loadContentFeatures`, filtrado por `tipo === 'herramienta'`.

- [ ] **Paso 1: `VMP.loadToolFeatures`** en `admin.js`, con el mismo patrón que `loadContentFeatures` pero sin cruzar planes. Las inactivas se marcan " (inactiva)".
- [ ] **Paso 2: formulario.**
  - Lista de casillas, una por herramienta. Las marcadas muestran botones ↑ y ↓ y se renderizan primero, en el orden guardado.
  - Al editar, se marcan las de `cat.herramientas`.
  - `saveCategory` envía `enHome: $form.find('[name="enHome"]').is(':checked')` y `herramientas`, que son las claves marcadas en el orden visible.
- [ ] **Paso 3: aviso.** Si la categoría tiene `temasCount === 0` y ninguna herramienta marcada, se muestra "No se mostrará nada al abrirla." y se deja guardar igual.
- [ ] **Paso 4: tabla.** Columnas "Home" (Sí/No) y "Herramientas" (`c.herramientas.length`).
- [ ] **Paso 5: subir la versión y regenerar el ZIP** con el mismo método que se usó para 1.0.13 (ver `progress/history.md`).
- [ ] **Paso 6: verificación manual** en `http://localhost:8082`, con las credenciales de `docs/entorno-pruebas.md`:
  - editar `relaciones-pareja`: se ven marcadas el traductor y la línea de tiempo, en ese orden;
  - bajar el traductor, guardar y recargar: el orden se mantiene;
  - desmarcar todo y guardar: `select count(*) from categoria_herramientas where categoria_id = <id>` devuelve 0;
  - volver a dejar el estado inicial.
- [ ] **Paso 7: cierre.** `.\init.ps1` en verde, feature 110 `done` y `progress/current.md`.

---

## Feature C: App

Se registra como feature 111. **Antes de empezar:** confirmar con la usuaria que las features 107 y 108 ya están cerradas y commiteadas, porque tocan los mismos archivos.

### Tarea 6: catálogo y datos del Home

**Archivos:**
- Crear:
  - `App/src/constants/tool-catalog.ts`: `TOOL_CATALOG` y `getKnownTools(keys)`;
  - `App/src/types/home.ts`: `IHomeCategory`, igual que en el backend;
  - `App/src/services/home-service.ts`: `getHomeCategories()`;
  - `App/src/hooks/use-home-categories.ts`.
- Modificar:
  - `App/src/services/db.ts`: tabla de caché `home_categories`, con el mismo esquema que `psychoeducation_categories` en `db.ts:50`;
  - `App/src/hooks/index.ts`: exportar el hook nuevo.
- Test: `App/__tests__/home-categories.test.tsx`

**Interfaces:**
- **Produce:**
  - `type ToolDef`, que se mueve de `tools-screen.tsx`. Mismos campos: `id`, `title`, `description`, `icon`, `iconBg`, `iconColor`, `route`, `requiresAuth`, `featureKey`.
  - `TOOL_CATALOG: Record<string, ToolDef>`, con clave `featureKey`. Los datos se copian de `TOOLS_BY_MODULE` en `tools-screen.tsx`.
  - `getKnownTools(keys: string[]): ToolDef[]`: conserva el orden y descarta las claves desconocidas, con `console.warn` solo si `__DEV__`.
  - `getHomeCategories(): Promise<CacheResult<IHomeCategory[]>>`: usa `getOrFetch('home_categories', 'all', () => api.get('/home/categories').then(r => r.categorias), { maxAge: ACCESS_STALE_MS })`.
  - `useHomeCategories(): { categories: IHomeCategory[]; loading: boolean; error: boolean; refresh: () => Promise<void> }`. Carga al montar, refresca con `useFocusEffect` si los datos tienen más de `ACCESS_STALE_MS` al volver la app a primer plano (con el mismo `AppState` que usa `access-context.tsx`) y tras un 403 `FEATURE_REQUIRED` (con la suscripción de `services/access-events.ts`).

- [ ] **Paso 1: tests que fallan.**
  - `getKnownTools conserva el orden y descarta claves desconocidas`: `getKnownTools(['tool.timeline','tool.xyz','tool.cnv_translator'])` devuelve los ids `['timeline','cnv_translator']`.
  - `useHomeCategories devuelve las categorias de la API`.
  - `useHomeCategories usa la cache sin conexion`: `getOrFetch` devuelve `fromCache: true` y el hook expone los datos con `error: false`.
  - `useHomeCategories sin red ni cache expone error true y lista vacia`.
- [ ] **Paso 2:** `cd App; npx jest __tests__/home-categories.test.tsx`. Resultado esperado: FALLA.
- [ ] **Paso 3:** implementar con las firmas de arriba.
- [ ] **Paso 4:** el mismo comando. Resultado esperado: PASA.
- [ ] **Paso 5:** actualizar `progress/current.md`.

### Tarea 7: pantallas Home, Categoría y Herramientas

**Archivos:**
- Crear: `App/src/screens/category-screen.tsx`, que exporta `CategoryScreen`.
- Modificar:
  - `App/src/navigation/app-navigator.tsx`: registrar `Category: { slug: string }` en `RootStackParamList`; cambiar `Tools: { module?: string } | undefined` por `Tools: undefined`;
  - `App/src/screens/home-screen.tsx`: quitar `EXPLORE_MODULES` y el candado de módulo; usar `useHomeCategories`, el estado vacío y navegar a `Category`;
  - `App/src/screens/tools-screen.tsx`: listar `Object.values(TOOL_CATALOG)` sin encabezados por módulo; quitar `TOOLS_BY_MODULE`, `MODULES_ORDER`, `MODULE_META` y el uso de `route.params.module`;
  - `App/src/constants/access-keys.ts`: quitar `module.parejas`, `module.ansiedad` y `MODULE_FEATURE_BY_ID`;
  - `App/__tests__/access-keys.test.ts` y los tests de Home y Herramientas que usaban las listas fijas.
- Test: `App/__tests__/category-screen.test.tsx`, `App/__tests__/home-screen-categories.test.tsx`

**Interfaces:**
- **Consume:** `useHomeCategories` y `getKnownTools` (Tarea 6), `useAccess().isFeatureLocked`, `useLockedPress()`, y la navegación `PsychoeducationHome: { slug }` y `AccessRequest`.
- **Produce:** `CategoryScreen`. Lee la categoría por `slug` de `useHomeCategories().categories`. Si no la encuentra, muestra un estado vacío y un botón para volver.

**Regla de candados (punto 2 de "Puntos a revisar"):** en la app, una herramienta está bloqueada si `isFeatureLocked(featureKey)` y el contenido si `accesoFeatureKey && isFeatureLocked(accesoFeatureKey)`. La app **no** usa los campos `locked` ni `contentLocked` de la respuesta.

- [ ] **Paso 1: tests que fallan.**
  - **CategoryScreen:**
    - `muestra la tarjeta Psicoeducacion solo si temasCount > 0`;
    - `tocar Psicoeducacion navega a PsychoeducationHome con el slug`;
    - `contenido bloqueado muestra candado y pasa por useLockedPress con accesoFeatureKey`;
    - `herramienta bloqueada muestra candado`;
    - `invitado que toca una herramienta con requiresAuth ve el aviso de iniciar sesion y no va a AccessRequest`;
    - `una clave que no esta en el catalogo no se renderiza`;
    - `el candado cambia al cambiar el acceso sin refrescar las categorias`: se rerenderiza con otro `isFeatureLocked` y los datos de `useHomeCategories` iguales.
  - **Home:**
    - `muestra las categorias en el orden de la API con su icono`;
    - `subtitulo cuenta herramientas conocidas mas 1 si hay temas`: con 2 herramientas y temas muestra "3 actividades"; con 1 herramienta y sin temas, "1 actividad";
    - `sin datos muestra "No pudimos cargar los módulos. Revisa tu conexión."`;
    - `tocar una categoria navega a Category con su slug`.
  - **Herramientas:** `lista todas las herramientas del catalogo sin encabezados de modulo`.
  - **access-keys:** se quitan las aserciones sobre `module.*`.
- [ ] **Paso 2:** `cd App; npx jest __tests__/category-screen.test.tsx __tests__/home-screen-categories.test.tsx`. Resultado esperado: FALLA.
- [ ] **Paso 3: implementar.**
  - En `CategoryScreen` se reutilizan los estilos de tarjeta de `tools-screen.tsx`. Si se copian más de unas pocas líneas, se mueven a un componente `ToolCard` en `App/src/components/`, que usan las dos pantallas.
  - Verificar que no quede nadie navegando con `Tools` y parámetros: `rg "navigate\('Tools'," App/src` no debe mostrar llamadas con un objeto.
- [ ] **Paso 4:** `cd App; npm test`. Resultado esperado: todo PASA. `npx tsc --noEmit` sin errores.
- [ ] **Paso 5: verificación en la app** contra el backend de Docker:
  - el Home muestra Parejas y Ansiedad;
  - Parejas abre con la tarjeta Psicoeducación y dos herramientas;
  - Ansiedad abre sin Psicoeducación y con gratitud;
  - con `test@vittal.com`, los candados coinciden con su plan.
- [ ] **Paso 6: cierre de la Feature C.** `.\init.ps1` en verde, feature 111 `done`, `progress/current.md`. Anotar que hace falta una build de EAS y que en Supabase hay que marcar `en_home` antes de publicar (spec, sección 9).

---

## Feature D (aparte)

"Esencial marcado y fijo en los demás planes" se registra en `feature_list.json` como `pending` (112), con un enlace a la spec, sección 2, D7. No es parte de este plan.
