# Implementación feature 95 — safety_plan_app_foundation

Estado: implementada, pendiente de reviewer. `feature_list.json`: id 95 en `in_progress` (NO `done`: el gate `init` completo lo ejecuta el usuario con `.\init.ps1`). Sin commit.

## Archivos
Creados (App/):
- `src/types/safety-plan.ts`: `ISafetyContact`, `ISafetyPerson` (alias Paso 3), `ISafetySanitaryDevices`, `ISafetyPlan`, `ISafetyPlanInput`, `TSafetyPlanSyncState`, `ISafetyPlanSnapshot`, `SAFETY_PLAN_LIMITS`, `createEmptySafetyPlan()`. Sin copy clínico.
- `src/services/safety-plan-cache.ts` (extra al plan): registro único en `app_config` (clave `safety_plan:v1`) con `{owner idAnonimo|null, plan, pending, syncedAt}`, normalización defensiva, lectura del idAnonimo de la sesión desde el JWT y `markSafetyPlanSynced`. Existe para que servicio y sync-manager lo compartan sin import circular.
- `src/services/safety-plan-service.ts`: `getCachedSafetyPlan`, `fetchSafetyPlan`, `saveSafetyPlan`, `loadSafetyPlan(online)`, `clearSafetyPlanCache`, `getTrustedContacts`, `validateSafetyPlanInput`, `SafetyPlanValidationError`.
- `src/hooks/use-safety-plan.ts`: `plan, loading, saving, error, isError, syncStatus, syncState, hasPendingChanges, isDirty, load, savePlan, updateStep, updateSanitaryDevices, addContact/updateContact/removeContact (paso 3|4), trustedContacts, hasTrustedContacts`.
- Tests: `__tests__/safety-plan-service.test.ts` (27), `__tests__/use-safety-plan.test.tsx` (14).
Modificados:
- `src/types/index.ts` (export), `src/hooks/index.ts` (export `useSafetyPlan`).
- `src/services/sync-manager.ts`: rama `safety_plan` en `pushPendingOp` (PUT `/safety-plan` con el plan completo y reescritura de caché) y `replacePendingOps` (coalescer). Fuera de la lista literal del criterio; documentado en current.md.
- `__tests__/sync-manager.test.ts`: describe nuevo con 8 casos de la rama `safety_plan`.
- `feature_list.json`: solo `status` de la 95 -> `in_progress`. Nota: el archivo ya venía reformateado (escapes `'`, sangría) por otra sesión antes de empezar, así que `git diff --stat` es enorme y ajeno a este cambio; el JSON valida con `json.load`.
- `progress/current.md`: sección añadida al final. `.gitignore`/feature 98 sin tocar.

## Decisiones
- Almacenamiento: SQLite `app_config` (sin esquema nuevo, sin dependencias). SecureStore descartado por tamaño.
- PUT siempre con el plan completo (7 campos); una sola op `safety_plan`/`update` (DELETE previo + INSERT).
- Límites validados en cliente (texto 10000, listas 50, nombre 150, teléfono 40, Paso 5 = 60, id 50): se rechaza con `SafetyPlanValidationError` (mensaje en español, sin contenido del plan). Los contactos reciben `id` (UUID) si no lo tienen.
- GET no pisa la caché si hay cambios pendientes (se relee la caché tras la respuesta). Tras un PUT correcto, si el usuario guardó algo más nuevo mientras volaba, esa versión se conserva como pendiente.
- Dueño de la caché: `owner` = idAnonimo de la sesión (null = invitado). Con sesión, un registro de invitado o de otra cuenta se descarta junto con sus ops. El sync-manager además descarta (sin PUT) la op si `owner !== sesión`. Un plan de invitado nunca se sube a ninguna cuenta (test en service y en sync-manager). Consecuencia asumida: al iniciar sesión se pierde el plan hecho como invitado.
- Invitado: guarda solo en local (`syncState: 'local-only'`); las ops quedan en cola sin sesión (`no-session`) y se descartan al entrar a una cuenta.
- Un invitado no ve el plan de una cuenta que cerró sesión (no se borra, por si esa persona vuelve).
- Errores al usuario genéricos en español; logs solo `[safety-plan] cache read/write/save failed` sin datos; `recordFailedOp` sigue sin loggear payload (comentario actualizado).
- `clearSafetyPlanCache()` exportado; `use-auth.ts`/logout NO tocados.

## Evidencia (App/, resultados reales)
- `timeout 170 npx tsc --noEmit`: 0 errores (exit 0).
- jest `safety-plan-service.test.ts`: 27/27 pass. `use-safety-plan.test.tsx`: 14/14 pass. `sync-manager.test.ts`: 34/34 pass (26 previos + 8 nuevos). Ningún otro test importa gratitude/timeline contra sync-manager real.
- eslint (src nuevos y modificados: types/safety-plan.ts, safety-plan-cache.ts, safety-plan-service.ts, sync-manager.ts, use-safety-plan.ts, hooks/index.ts): 0 errores, 0 avisos.
- eslint sobre los tests (fuera del gate, que solo revisa `src/**`): `no-require-imports` en mis tests y en los previos de sync-manager, mismo patrón que `sync-manager.test.ts`/`access-service.test.ts`.
- No se ejecutaron suite completa, `quality-check` ni `init` (límite del entorno).
- Truco de entorno: `npx jest` sin más se cuelga >170 s rastreando `node_modules` (43k archivos) en el montaje; funciona con `npx jest --roots '<rootDir>/src' '<rootDir>/__tests__' --no-watchman <archivo>` (~60-90 s).

## Riesgos y deuda
- Logout no limpia la caché del plan (`use-auth.ts` fuera de alcance): la protección actual es el dueño idAnonimo; para 96/97 conviene llamar `clearSafetyPlanCache()` al cerrar sesión/borrar cuenta.
- SQLite sin cifrar (igual que gratitude/timeline); plan con datos altamente sensibles.
- Last-write-wins sin versión en el servidor. Un 400 inesperado de una op encolada se reintentaría indefinidamente (mitigado por la validación en cliente; falta descartar 4xx en sync-manager).
- `api.parseError` descarta `code` del backend; `DELETE /safety-plan` (204) no es usable con `api.delete`.
- Normalización de teléfono (+57) queda para la 96/97; `getTrustedContacts` solo recorta y filtra vacíos.
- Los tests del hook usan un arnés con react-test-renderer (sin RNTL).
- Perder el plan de invitado al iniciar sesión es una decisión de privacidad; podría revisarse con producto.

## Ronda 2 (cambios pedidos por el reviewer)

Cambios
1. `sync-manager.ts` `flushPendingOps`: si el flush termina sin fallos pero `COUNT(*) FROM pending_ops` > 0 (entró una op durante el vuelo), ya no llama a `markQueueEmpty()`: deja el estado en `pending` y vuelve a procesar la cola. Helper `hasQueuedOps`. Test nuevo en `sync-manager.test.ts` ("op nueva durante el vuelo del flush"): el mock de `api.put` llama a `replacePendingOps` DURANTE el primer PUT (cola en memoria con op_id reales); se verifica 2 PUT, el segundo con el plan nuevo, cola vacía, caché `pending=false` y estado `synced`.
2. `use-safety-plan.ts` `savePlan`: se captura la referencia del plan antes del `await`; solo se limpia `dirty` si no cambió. Si hubo edición intercalada se conserva el plan editado, `isDirty` y solo se actualiza `syncState`. Test con `saveSafetyPlan` diferido y edición intercalada.
3. Carrera GET/guardado: `withSafetyPlanLock` (cerrojo de módulo en `safety-plan-cache.ts`, no reentrante) envuelve la sección leer-decidir-escribir de `fetchSafetyPlan`, `saveSafetyPlan` (lectura previa + escritura + `replacePendingOps`) y `markSafetyPlanSynced`. Tests: `Promise.all([fetch, save])` con lecturas lentas y GET que resuelve después del guardado; en ambos el plan guardado y `pending` sobreviven.
4. `getSessionIdAnonimo`: normaliza base64url (`-`/`_`) y añade padding `=` antes de `atob`; valida el id con `/^[A-Za-z0-9_-]{1,64}$/` (si no, se trata como sin sesión). Tests: JWT con payload base64url sin padding e id con forma no razonable.

Evidencia (App/, real)
- `npx tsc --noEmit`: exit 0, sin errores.
- eslint (safety-plan-cache.ts, safety-plan-service.ts, sync-manager.ts, use-safety-plan.ts): exit 0, 0 errores y 0 avisos.
- jest (con `--roots '<rootDir>/src' '<rootDir>/__tests__' --no-watchman`, por separado): safety-plan-service 31/31, use-safety-plan 15/15, sync-manager 35/35.
- No se ejecutó la suite completa, quality-check ni init.

Deuda restante (fuera de alcance de esta ronda)
- Conectar `clearSafetyPlanCache()` al logout/borrado de cuenta (`use-auth.ts`) en 96/97.
- Descartar 4xx permanentes en la cola / `api.ts` (un 400 inesperado se reintenta indefinidamente).
- Cifrado en reposo de la caché SQLite.
- Clave por owner para el plan de invitado (hoy se descarta al iniciar sesión).
- Token presente pero no decodificable: la caché lo trata como invitado y `pushSafetyPlanOp` reintenta con 'Sesión no válida'.
- Confirmar `atob` en dispositivo (Hermes); ahora con padding explícito.
- ESLint de tests con `no-require-imports` (patrón preexistente, fuera del gate).
