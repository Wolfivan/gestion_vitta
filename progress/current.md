# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a history.md.
> Mientras trabajas, **manténlo actualizado en tiempo real**, no al final.

## Estado
- **Tarea**: feature 109 (`category_tools_backend`), primera de la serie 109 a 112: categorías como módulos con herramientas.
- **Inicio**: 2026-11-04.
- **Estado**: in_progress.
- **Plan breve**: `docs/superpowers/plans/2026-11-04-categorias-herramientas.md`, Feature A (Tareas 1 a 4). Spec en `docs/superpowers/specs/2026-11-04-categorias-herramientas-design.md`. Ejecución nativa, sin commits.

## Registro de la serie 109 a 112
- Arranque: `init.ps1` con tests de Backend y App en verde (el quality gate de Docker siguió en segundo plano).
- Ruling: se trabaja la 109 aunque la 43 y la 65 siguen `pending` con id menor. Fue un pedido explícito de la usuaria. Costo si está mal: reordenar.
- Tarea 1 completa:
  - `036_categoria_herramientas.sql` y sus tests en `database-migration.test.ts`, de rojo a verde (47/47).
  - Aplicada dos veces en `backend-db-1` sin error.
  - Datos: relaciones-pareja con el traductor (0) y la línea de tiempo (1); ansiedad (orden 4) con gratitud; 0 features `module.*`.
  - Se aplicó a mano: `schema_migrations` no la registra, y el próximo `migrate` la vuelve a correr sin efecto.
- Tarea 2 completa:
  - Repositorio: `findHomeCategories`, `findToolKeysByCategoryIds`, `replaceCategoryTools(id, keys, client?)`, `en_home` en create y update, y el tipo `Queryable`.
  - Tests de rojo a verde (26/26), `tsc` limpio; SQL de `unnest ... WITH ORDINALITY` probado en Docker con ROLLBACK.
  - Ruling: `createCategory` y `updateCategory` reciben `db: Queryable = pool` al final, para compartir la transacción con el reemplazo de herramientas. Costo si está mal: firmas algo más largas.
- Tarea 3 completa:
  - El servicio valida las herramientas (`INVALID_TOOL_FEATURE`: inexistente, de otro tipo o repetida) y escribe la categoría y sus herramientas en una sola transacción (`inTransaction`).
  - Las lecturas admin devuelven `enHome` y `herramientas`; el controlador pasa `enHome` y `herramientas`.
  - Tests: 13 nuevos en `psychoeducation.test.ts` (68/68 entre los dos archivos).
  - Ruling: no se agregó el test de 403 sin rol de administrador en este archivo, porque ahí `adminMiddleware` está mockeado y ya lo cubren los tests del middleware. Costo si está mal: un test faltante.
  - Ruling: el espía de `pool.connect` se limita a los describe que escriben categorías, porque `pg` usa `connect` dentro de `pool.query` y un espía global colgaba los tests de temas. Costo si está mal: ninguno en producción.
- Tarea 4 completa:
  - Ruta `GET /home/categories` (`routes/home.ts`, con swagger), `getHomeCategories` en el servicio y en el controlador, y la interfaz `IHomeCategory` en el modelo.
  - Tests `home-categories.test.ts` de rojo a verde (8/8).
  - Smoke con la API de Docker reconstruida (`.env.docker`, base local):
    - el Home devuelve relaciones-pareja (2 temas, traductor y línea de tiempo con candado para un anónimo) y ansiedad (0 temas, gratitud libre);
    - `/psychoeducation` (la Biblioteca) no lista ansiedad.
- Cierre de la 109:
  - El primer `init.ps1` falló en `psychoeducation-gating.test.ts` (3 tests), por el automock sin `findToolKeysByCategoryIds` y sin una conexión falsa para la transacción.
  - Arreglado en el setup del test: la conexión falsa solo responde a `connect()` sin callback; con callback pasa al original, que es como lo llama `pool.query`.
  - Backend completo: 639/639. `init.ps1` en verde, quality gate incluido. **Feature 109 `done`.**
- Feature 110 (plugin Psicoeducación 1.0.14), `in_progress`:
  - `admin.js`: `VMP.loadToolFeatures`.
  - `categories.php`: casilla "Mostrar en Home", lista de herramientas con la ayuda y el aviso de la spec, columnas Home y Herramientas, colspan 11. El texto de Acceso ahora dice que bloquea la psicoeducación de la categoría.
  - `categories.js`: estado `selectedTools` ordenado, ↑↓, aviso si no hay temas ni herramientas, y envía `enHome` y `herramientas`.
  - CSS `.vmp-tool-list` y `.vmp-tool-row`; versión 1.0.14 en el encabezado y en `VMP_VERSION`.
  - Ruling: el plugin no tiene tests de JS; se verifica a mano en WordPress local, como dice el plan. Costo si está mal: regresiones del panel sin red automática.
  - Verificación manual en `localhost:8082` (con la sesión del panel `test@vittal.com`):
    - la tabla muestra Home y Herramientas;
    - relaciones-pareja carga marcadas el traductor y la línea de tiempo, en ese orden;
    - ↓ y guardar deja timeline 0 y traductor 1 en la base;
    - en ansiedad, desmarcar todo muestra "No se mostrará nada al abrirla." y al guardar quedan 0 filas;
    - un PUT con `content.vip` devuelve el error de herramientas inválidas.
    - Estado inicial restaurado (traductor 0, línea de tiempo 1; gratitud en ansiedad).
  - ZIP regenerado con .NET ZipFile y rutas con `/`: 15 archivos, los mismos que el ZIP anterior.
  - Observación para la usuaria: la feature `tool.psychoeducation` (tipo herramienta) aparece en la lista. La app no la tiene en el catálogo, así que asignarla no muestra nada.
  - `init.ps1` en verde, quality gate incluido. **Feature 110 `done`.**
- Feature 111 (App), en espera: el plan pide confirmar antes de empezar, porque las features 107 y 108 están `done` pero sin commitear y tocan Home, Herramientas y `use-access-refresh.ts`.

## 2026-11-06: avisos del kit y de profesionales, y plan de release
- Pedido de la usuaria, fuera de `feature_list.json`.
- Kit: aviso "El contenido de este kit es responsabilidad de quien lo llena. Te recomendamos
  completarlo con un profesional de la salud mental." debajo de la intro
  (`SAFETY_PLAN_COPY.responsibilityNotice`, `safety-plan-screen.tsx`).
- Agenda tu cita (lista de profesionales del Home): aviso de que los números son para un proceso
  terapéutico, no para crisis ni riesgo suicida, y que para eso están los números del Botón de Pánico.
- Tests: uno nuevo en `safety-plan-screen.test.tsx` y `professionals-screen.test.tsx` (nuevo); de rojo
  a verde, `tsc` limpio.
- Plan de release selectivo a `main` (kit y notificaciones, sin accesos):
  `docs/superpowers/plans/2026-11-06-release-kit-notificaciones-main.md`.
- La usuaria eligió el release selectivo. Tareas 1 y 2 del plan hechas en worktrees
  (`..\VittalMind-release\{Backend,App}`, rama `release/kit-notificaciones`), con
  `cherry-pick --no-commit`. Sin commits. Backend 271/271 y App 444/444, `tsc` y lint sin errores.
  Detalle en §0 del plan.
- Ruling: los worktrees están fuera del repo para no tocar los cambios sin commitear de
  `desarrollo`. Costo si está mal: borrarlos con `git worktree remove`.
- 2026-11-07:
  - App de release en Expo SDK 58 (sin `expo-camera`) y versión 0.4.0: `tsc`, lint, 444/444 y
    `expo-doctor` en verde.
  - Claves en `docs/secretos/produccion.local.md`; `docs/secretos/` ignorado en `.gitignore` y en
    `.gitleaks.toml`.
  - Guía `docs/credenciales-push.md`.
  - Ruling: se generaron también claves de desarrollo distintas; el aviso de no cambiar la del
    `.env` local si ya tiene kits está en el archivo. Costo si está mal: ninguno, son opcionales.
- 2026-11-07 (2):
  - La usuaria trajo `google-services.json` (proyecto 220224673708, paquete `com.vittalmind.app`) y
    subió la clave FCM V1 a expo.dev.
  - El archivo queda ignorado en los `.gitignore` de las dos copias de la App.
  - `app.config.js` (release) declara `googleServicesFile` desde `GOOGLE_SERVICES_JSON` o el
    archivo local. `expo config` resuelve bien en los dos casos y `expo-doctor` pasa 20/20.
  - Falta crear la variable en EAS, que hoy no tiene ninguna en production.
- Ruling: el refactor de `processJob` (dispatcher) no viaja porque estaba mezclado con los avisos de
  acceso. Costo si está mal: un aviso de complejidad en Sonar sobre ese archivo.

## Qué se ha hecho
- 2026-11-03: commits de la serie a petición del usuario (sin push).
  - Backend `desarrollo`: `0306234` chore(quality), `dbcee60` feat(access).
  - App `desarrollo`: `9fc9665` chore(quality), `bac6fab` feat(access).
  - Raíz `development`: `c2fc3ba` chore(quality), `c94ff5b` feat(plugins), `b7ec6ca` docs(access).
- 2026-11-03: `quality-release` completo. Resultado:
  - quality-lite PASS (Backend 19 avisos, dup 2,05%; App 20 avisos, dup 9,38%).
  - Semgrep 0 hallazgos. Trivy: dependencias limpias; 2 Dockerfiles como root corregidos con `USER node` (Backend `370a0df`, raíz `b47969e`), API local verificada.
  - Gitleaks: falso positivo `PENDING_KEY` marcado (App `bae18bd`). **Bloqueante real**: `Backend/.env.docker` versionado con una clave real de OpenRouter desde `778b384` (ya en GitHub).
  - Sonar App PASS. Sonar Backend FAIL solo por 24 hotspots sin revisar (23 S2077 en `access-repository.ts`, todos con constantes y `$n`; 1 S5122 CORS abierto con Bearer). Revisados como seguros, falta marcarlos en el panel (el usuario).

- 2026-11-04: a petición del usuario, limpieza de Sonar en Backend sin marcar hotspots a mano:
  - `access-repository.ts`: todas las consultas son literales completos. UPDATE parcial de planes y
    features con un JSON de cambios (`$2::jsonb ? 'campo'`); listados de usuarios y solicitudes con
    filtros opcionales (`$n IS NULL OR ...`) y página + total en una sola consulta (CTE + LATERAL).
    `insertGrant` recibe un objeto (`IGrantWrite`) en lugar de 8 parámetros.
  - Complejidad: `processJob` (dispatcher), `getTopicContent`, `createEntry` (gratitud) y
    `updatePreferences` divididos en funciones pequeñas. Aserciones innecesarias e import duplicado fuera.
  - Verificado: tsc, 602 tests, ESLint sin avisos nuevos; smoke contra Postgres local (24 checks de
    accesos, 6 llamadas de temas con y sin sesión).
  - El hotspot de CORS (`app.ts`) queda para marcarlo como seguro: la API usa Bearer, sin cookies.

## Pendiente
- Rotar la clave de OpenRouter y sacar el valor de `Backend/.env.docker` (decisión del usuario).
- Marcar los hotspots del Backend en Sonar y relanzar `quality-release` completo para obtener `release-pass.json`.
- `security-auditor` sobre la serie.
- Producción de avisos: cron del tick y de `/internal/access/expire`, `INTERNAL_NOTIFICATION_TOKEN`, FCM y APNs, SMTP en WordPress.
- Respaldo de Supabase y migraciones 029 a 034.
- Build con EAS y prueba en teléfono: cámara, permisos, enlace desde `/canjear`, diálogo de invitado, `FeatureRequiredNotice`, cola offline con 403, varios planes en Perfil, aviso de vencimiento, solicitud desde la app, Biblioteca con candado, categoría bloqueada, acceso sin conexión, purga al abrir, aviso de código revocado, push de acceso e interruptor de avisos.
- Alinear versiones de parche de Expo antes del build.
- Confirmar si producción corre detrás de un proxy y fijar `TRUST_PROXY_HOPS`.
- Confirmar que `www.vittaminds.com` es el WordPress del plugin y configurar los enlaces de tiendas, antes de imprimir bonos.
- Revisión de fase de la 99: si `DELETE /timeline*` queda libre al perder el plan; textos del aviso.
- Probar la impresión real de la tarjeta.

---

## Sesión anterior sin cerrar (gate de calidad en Docker)

## Estado
- **Tarea**: gate de calidad en Docker (harness), a petición del usuario. No es una feature de `feature_list.json`.
- **Inicio**: 2026-10-28
- **Estado**: implementado y verificado en local; pendiente de validación de SonarQube por el usuario.

## Qué se ha hecho

### Fase 0 — Base del lint (estaba roto)
- `Backend/eslint.config.mjs` y `App/eslint.config.mjs` (ESLint 9 flat config + typescript-eslint + sonarjs).
- devDeps añadidas en ambos repos (`typescript-eslint@8.72.1`, `eslint-plugin-sonarjs@4.2.2`).
- Limpieza de la deuda que bloqueaba el gate: 14 `any`, imports/variables sin usar, `catch (err)` muertos, regex con backtracking (ReDoS) en `access-input.ts` y `profile-service.ts`, `expiresIn as any` en `jwt.ts`.
- Refactor de `flushPendingOps` en `App/src/services/sync-manager.ts` (complejidad 49 -> extraídos `pushPendingOp` y `recordFailedOp`).
- Bug preexistente corregido: `Backend/src/routes/index.ts` exportaba `safetyPlanRouter` dos veces (rompía `tsc`).

### Fase 1 — quality-lite en Docker
- `scripts/quality/Dockerfile`, `scripts/quality/run-quality.mjs`, `docker-compose.quality-tools.yml` (perfil `quality`).
- `scripts/quality-check-docker.ps1` / `.sh` y `scripts/quality-check.ps1` / `.sh` (autodetección Docker -> local).
- Reportes en `quality-reports/QUALITY_<timestamp>.md` y `.json` (gitignored).
- `init.ps1` / `init.sh`: el quality check ahora es **bloqueante**.

### Fase 2 — SonarQube para release
- Perfil `release` en el compose: `sonarqube:lts-community` + `postgres:16-alpine` + `sonar-scanner-cli`.
- `Backend/sonar-project.properties`, `App/sonar-project.properties` (deben commitearse en cada repo).
- `scripts/quality-release.ps1` / `.sh`: quality-lite -> security scan -> Sonar -> Quality Gate -> `quality-reports/RELEASE_<timestamp>.md`.
- Token en `.env.sonar` (gitignored, con `.env.sonar.example`).

### Fase 3 — Documentación
- `docs/quality-tools-docker.md` (nuevo).
- Actualizados: `docs/quality-gate.md`, `docs/verification.md`, `docs/entornos-dev-produccion.md` (paso 4 del release), `AGENTS.md`, `CHECKPOINTS.md` (C4), `.agents/agents/sonar-verifier.md` y `.claude/agents/sonar-verifier.md`.

## Evidencia
- `Backend`: `tsc --noEmit` 0 errores, ESLint 0 errores / 16 avisos, duplicación 1,97%, 359 tests OK.
- `App`: `tsc --noEmit` 0 errores, ESLint 0 errores / 20 avisos, duplicación 11,13%, 217 tests OK.
- `scripts/quality-check-docker.ps1` -> **PASS** (reporte generado en `quality-reports/`).

## Pendiente
1. Validar `.\scripts\quality-release.ps1` con SonarQube (lo lanza el usuario; el arranque es lento).
2. Ejecutar `.\init.ps1` completo tras el pull de imágenes de seguridad.
3. Commitear por separado en los 3 repos: raíz (harness), `Backend/` (eslint config, sonar properties, fixes) y `App/` (eslint config, sonar properties, fixes).
4. Mover este resumen a `progress/history.md` al cerrar.
