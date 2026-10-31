# Investigación feature 95 — safety_plan_app_foundation (solo lectura)

Fecha: 2026-10-28. Rutas relativas a la raíz del repo; "L" = línea aproximada del archivo.

## 0. Contexto y orden de trabajo
- `feature_list.json`: 94 `done`, 95 `pending`, 96 (UI Perfil) y 97 (modal pánico con contactos de confianza, "100% offline con la caché local del kit") `pending` y dependen de 95.
- `progress/current.md`: la serie 98-105 (accesos) va ANTES que 95/96/97; la 98 está `in_progress`. CLAUDE.md exige elegir la `pending` de menor id, así que hay que confirmar con el usuario si 95 se puede arrancar antes (conflicto de prioridad).
- Discrepancia de nombre: el criterio del 94 cita `026_create_safety_plan.sql`; el archivo real es `Backend/src/database/migrations/027_create_safety_plan.sql` (ya anotado como F10 en `docs/plan-accesos-y-codigos-canje.md` L55).

## 1. Contrato real del backend /safety-plan
Archivos: `Backend/src/routes/safety-plan.ts`, `controllers/safety-plan-controller.ts`, `services/safety-plan-service.ts`, `services/safety-plan-repository.ts`, `models/safety-plan.ts`, `database/migrations/027_create_safety_plan.sql`. Montado en `Backend/src/app.ts` L109 (`app.use(safetyPlanRouter)`, sin prefijo adicional).

Rutas (`routes/safety-plan.ts` L7-9, todas con `authMiddleware`):
- `GET /safety-plan` -> 200 `ISafetyPlan` (plan guardado o plan base vacío).
- `PUT /safety-plan` (body `ISafetyPlanInput`) -> 200 `ISafetyPlan` (el plan ya guardado, con `id`, `createdAt`, `updatedAt`).
- `DELETE /safety-plan` -> 204 sin cuerpo (existe aunque la feature 94 no lo pedía). OJO: `api.delete` de la App hace `response.json()` (api.ts `request`, última línea) y fallaría con 204 sin cuerpo; si se quiere usar hay que tratarlo.

Controlador (`safety-plan-controller.ts` L5-21): toma `req.user!.idAnonimo` del JWT y delega; nunca lee id del body/URL (cumple "AuthZ por recurso").

Forma de respuesta `ISafetyPlan` (`models/safety-plan.ts` L13-25), JSON en camelCase:
```
{ id?: number, idAnonimo: string,
  paso1SignosAlarma: string,
  paso2EstrategiasAfrontamiento: string,
  paso3ActividadesPersonas: ISafetyContact[],   // {id?: string, nombre: string, telefono: string}
  paso4ContactosApoyo: ISafetyContact[],
  paso5DispositivosSanitarios: { ambulancia?: string, atencionSuicida?: string, psicologo?: string },
  paso6EntornoSeguro: string,
  paso7MotivosVivir: string,
  createdAt?: string, updatedAt?: string }
```
- Plan base (no hay fila): `getEmptySafetyPlan` (service L47-57) devuelve los 7 pasos vacíos + `idAnonimo`, SIN `id`/`createdAt`/`updatedAt`. Es decir, la App no puede distinguir "plan vacío del servidor" de "plan guardado vacío" salvo por la ausencia de `updatedAt`.
- Mapeo fila->plan: `mapRowToSafetyPlan` (service L22-45) con `parseJsonField` tolerante a string/objeto.

Request PUT `ISafetyPlanInput` (todos los campos opcionales, models L27-35). Validación/sanitización en `saveSafetyPlan` (service L131-175):
- Textos (pasos 1, 2, 6, 7): `undefined/null` -> `''`; no-string -> 400 `INVALID_TEXT_FIELD`; > 10000 caracteres (`MAX_TEXT_LEN`) -> 400 `TEXT_LIMIT_EXCEEDED`; se hace `trim()`. (El límite se RECHAZA, no se trunca.)
- Listas de contactos (pasos 3 y 4, `sanitizeContactList` L60-98): `undefined/null` -> `[]`; no-array -> 400 `INVALID_CONTACT_LIST`; > 50 elementos -> 400 `CONTACT_LIST_LIMIT_EXCEEDED`; elemento no-objeto -> 400 `INVALID_CONTACT_ITEM`. Cada contacto: `nombre` trim + truncado silencioso a 150, `telefono` trim + truncado a 40, `id` opcional trim + truncado a 50. No se valida formato de teléfono ni que nombre/telefono no estén vacíos (un contacto `{nombre:'', telefono:''}` se persiste).
- Paso 5 (`sanitizeSanitaryDevices` L100-121): `undefined/null` -> `{}`; array u otro tipo -> 400 `INVALID_SANITARY_DEVICES`; solo se conservan `ambulancia`, `atencionSuicida`, `psicologo` (strings trim y truncados a 60; otras claves se descartan).
- Semántica PUT = REEMPLAZO TOTAL del documento: lo que no se envía se guarda como `''`/`[]`/`{}` (repository `upsertSafetyPlan` L14-54: `ON CONFLICT (id_anonimo) DO UPDATE` de los 7 campos + `updated_at = NOW()`). Un PUT parcial borra los demás pasos. La App debe enviar siempre el plan completo.
- No hay control de concurrencia (ni `If-Unmodified-Since` ni versión): last-write-wins. El servidor siempre pone `updated_at = NOW()` (el cliente no puede fijarlo).
- Formato de error (error-handler): `{ error: { message, code? } }` con `AppError(message, status, code)`; `api.ts parseError` (L150-157) solo extrae `message`, por lo que el `code` no llega al hook sin cambiar `api.ts`.
- 401 por `authMiddleware`; la ruta NO está protegida por feature de acceso (el gating por feature es la 99, pendiente).

Migración `027_create_safety_plan.sql` (L6-23): tabla `safety_plans` con `id SERIAL PK`, `id_anonimo UUID NOT NULL UNIQUE REFERENCES usuarios_auth(id_anonimo) ON DELETE CASCADE`, `paso1_signos_alarma`/`paso2_...`/`paso6_...`/`paso7_...` TEXT NOT NULL DEFAULT '', `paso3_actividades_personas`/`paso4_contactos_apoyo` JSONB DEFAULT '[]', `paso5_dispositivos_sanitarios` JSONB DEFAULT '{}', `created_at`/`updated_at` timestamptz; índice por `id_anonimo`; `ENABLE ROW LEVEL SECURITY` + `REVOKE ALL ... FROM anon, authenticated`.

Observación para tipos de la App: `paso3ActividadesPersonas` reutiliza `ISafetyContact` (nombre/telefono) aunque el paso 3 clínico (Stanley-Brown) son "personas y lugares que distraen"; en la App conviene un alias semántico (p. ej. `ISafetyPerson = ISafetyContact`) pero SIN cambiar la forma del JSON.

## 2. Persistencia offline actual en la App
Dependencias ya en `App/package.json`: `expo-sqlite ~57.0.2`, `expo-secure-store ~57.0.3`, `@react-native-async-storage/async-storage 2.2.0`, `@react-native-community/netinfo 12.0.1`. NO hay que añadir ninguna (regla 5 de architecture.md). Dev: `jest ^29.7`, `jest-expo ~57.0.5`, `react-test-renderer ^19.2.3`; NO está `@testing-library/react-native` (ver sección 4).

Mecanismos existentes:
1. SQLite singleton `App/src/services/db.ts`: `getDatabase()` (L8-20) abre `vittalmind.db` y crea el esquema en `initSchema` (L97-147). Tablas: `psychoeducation_*`, `professionals` (caché `id TEXT, data, fetched_at`), `timeline_events` y `gratitude_entries` (`client_uuid`, `data` JSON, `synced`, ...), `pending_ops` (cola) y `app_config` (key/value, API `db.get/set/remove` L161-183). Para añadir tabla: nueva sentencia en `nonCacheTables` (L115-138) con `CREATE TABLE IF NOT EXISTS` (o `CACHE_TABLES` L47-66, pero ahí se hace DROP si el esquema no es `id TEXT PK`).
2. Caché genérica `App/src/services/cache.ts`: `getFromCache/saveToCache/getOrFetch` (TTL 5 min por defecto, offline -> devuelve caché vencida, usa `checkConnectivity`). Tablas dinámicas por nombre, sin escritura optimista ni cola.
3. SecureStore: `App/src/services/storage.ts` (wrapper `storage.get/set/remove`; SecureStore en nativo, `localStorage` en web) usado para JWT (`vittalmind_jwt`, `vittalmind_refresh`, api.ts L4-5) y caché de acceso `access-storage.ts` (claves `@vittalmind/access:v1`, TTL 5 min). Limitación conocida de SecureStore: valores grandes (~2 KB en iOS históricamente); un plan con hasta 100 contactos y 4x10000 chars puede excederlo, así que NO es adecuado para el plan completo.
4. AsyncStorage: está instalado y mockeado en `jest.setup.ts`, pero `grep` no muestra uso en `src/` para datos (architecture.md L86 lo prohíbe para el JWT).
5. Cola offline `App/src/services/sync-manager.ts`: `addPendingOp(entity, tipo, payload)` (L169-190) inserta en `pending_ops` y arma reintentos con backoff 5s/15s/60s/300s; `flushPendingOps()` (L297-391) procesa por `created_at` y `pushPendingOp` (L395-439) despacha POR ENTIDAD con ramas fijas: `gratitude`, `timeline` o genérico `POST /${entity}`; `update` hace `PUT /${entity}/${payload.id}`; `delete` -> `DELETE /${entity}/${id}`; `delete_all` -> `/${entity}/all`. Estado público: `addSyncListener`, `getSyncStatus` (`synced|syncing|pending`), `getPendingOpsCount/Breakdown`, `getLastFlushError`, `getLastQueueNotice`. `recordFailedOp` (L441-466) loguea sin payload ("contiene dato de salud mental") — patrón a imitar.
   - Hallazgo clave: `pushPendingOp` NO sirve tal cual para un singleton: un `update` generaría `PUT /safety_plan/undefined`. Hay que añadir una rama explícita `if (op.entity === 'safety_plan')` -> `api.put('/safety-plan', payload)` y, al volver 200, reescribir la caché local con la respuesta del servidor (patrón de `upsertServerGratitudeEntry` L485-501). Es un cambio en `sync-manager.ts` (hoy fuera del alcance literal de los criterios; documentarlo en `progress/current.md`) y requiere ampliar `__tests__/sync-manager.test.ts`.
   - Como el PUT es reemplazo total y último-gana, la cola debe COALESCER: una sola op pendiente `safety_plan`/`update`; si el usuario edita varias veces offline, reemplazar el payload de la op existente (hay `replaceCreatePayload` para `create` L241-268, pero no para `update`; habría que crear un helper análogo o borrar `DELETE FROM pending_ops WHERE entity='safety_plan'` antes de insertar, como hace `deleteAllEvents` en timeline-service L116-117).

Patrón recomendado a reutilizar: SQLite (`getDatabase`) + `pending_ops`, siguiendo gratitude/timeline. Opciones de almacenamiento del plan:
   - (A, recomendada) Nueva tabla `safety_plan_cache (id TEXT PRIMARY KEY, data TEXT NOT NULL, synced INTEGER DEFAULT 1, updated_at INTEGER NOT NULL)` con una sola fila (`id='current'`), o reutilizar `app_config` (`db.get/set`, patrón de `gratitude_streak`) para evitar tocar el esquema. `app_config` es lo más barato y ya está probado; un flag `synced` se puede derivar de `pending_ops`.
   - (B) SecureStore: descartada por tamaño. Dato altamente sensible (security-guidelines §9) en SQLite sin cifrar: igual que gratitude/timeline hoy; anotar como riesgo.

## 3. Patrones de servicios y hooks existentes
Ejemplos elegidos:
- Offline-first con cola: `App/src/services/gratitude-service.ts` + `App/src/hooks/use-gratitude.ts` (el más parecido: escritura local inmediata + `addPendingOp` + `void flushPendingOps()`).
- Caché con TTL y fallback: `App/src/services/access-service.ts` + `access-storage.ts` + `hooks/use-access.ts` (re-exporta de `context/access-context.tsx`).
(Alternativa: `timeline-service.ts` + `use-timeline.ts`, mismo patrón que gratitude.)

gratitude-service (resumen): funciones sueltas exportadas (no objeto `xService`); `getCachedEntries` lee SQLite y devuelve `[]` en error con `console.warn('[gratitude] ...')`; `syncEntriesWithServer` hace `api.get`, reemplaza filas `synced=1` y conserva las no sincronizadas; `createEntry` (L133-153 aprox.): guarda `saveEntryToDb(local, 0)` -> `addPendingOp('gratitude','create',{client_uuid,...})` -> `void flushPendingOps()` -> devuelve la entrada local (optimista). `fetchStreak` cachea en `app_config`; `getCachedStreak` valida forma y cae a `defaultStreakInfo()`.

use-gratitude: estados `entries, streak, loading, error (string|null)`, `syncStatus` (vía `addSyncListener`), `pendingCount`. `load()` primero muestra caché, luego si `isOnline` hace `flushPendingOps()` -> sync servidor -> relee caché; fallos de red se tragan y se queda con la caché. `useEffect` recarga al volver `isOnline` y al llegar `syncStatus==='synced'` (con guard de 1 s). Errores: `setError(err instanceof Error ? err.message : '<texto en español>')`. Exporta métodos con `useCallback`. Los hooks se exportan desde `App/src/hooks/index.ts` (L1-7); `services/index.ts` solo exporta api/auth/notification-service.

Auth/token: los servicios NO manejan el token; todo pasa por `App/src/services/api.ts`: `api.get/put/post/delete` (L250-255) añaden `Authorization: Bearer <jwt>` desde `storage` (`getToken`, L4), reintentan 1 vez ante error de red (`fetchWithRetry`), con timeout `API_TIMEOUT=15000` (`constants/index.ts` L13), y ante 401 hacen refresh con cola (`attemptRefresh`) o `clearTokens()`+`onUnauthorized()`. Errores de red se mapean a `NetworkError` con `NETWORK_ERROR_MESSAGE` (en español); `isNetworkError(error)` está exportado — útil para decidir "encolar vs. fallar". `getToken()` exportado: `access-service.getAccess` lo usa para devolver `null` y limpiar caché si no hay sesión (invitado).

Tipos: `App/src/types/index.ts` re-exporta `./access` y define `TUserSession {idAnonimo,jwt}`; convención `I` para interfaces, `T` para tipos (conventions.md L14-27). Para el nuevo archivo `App/src/types/safety-plan.ts` hay que añadir `export * from './safety-plan';` en `types/index.ts`.

Logout/cuenta: `hooks/use-auth.ts` `logout` (≈L228) solo hace `api.clearTokens()` y estados; NO borra SQLite ni cachés de dominio (solo `access-purge.ts` borra caché de acceso y descargas de psicoeducación). Ver riesgos.

Invitado: `useAuth.isGuest`; sin token `flushPendingOps` deja las ops en cola con aviso `no-session` (sync-manager L309-317) y "sube al iniciar sesión".

## 4. Configuración de tests de la App
- Jest en `App/package.json` ("jest": preset `jest-expo`, `setupFiles: ./jest.setup.ts`, `transformIgnorePatterns` ampliado). Script `npm test` = `jest --passWithNoTests`. Alias `@/` -> `src/` (tsconfig `paths`; en tests también se ve `../src/...`).
- Tests en `App/__tests__/*.test.ts(x)` (21 archivos). Servicios: `access-service.test.ts`, `access-storage.test.ts`, `notification-service.test.ts`, `sync-manager.test.ts`, `api-network.test.ts`.
- Mocks globales en `App/jest.setup.ts`: `expo-secure-store`; `@/services/storage` (get->null, set/remove); `@react-native-async-storage/async-storage` (setItem/getItem/removeItem/clear/getAllKeys); `@react-native-community/netinfo` (`addEventListener`, `fetch` -> `{isConnected:true,isInternetReachable:true,type:'wifi'}`); `expo-sqlite` (`openDatabaseAsync` -> `{execAsync,getFirstAsync,getAllAsync,runAsync,closeAsync}`; NO define `deleteDatabaseAsync`); reanimated, svg, keyboard-controller, notifications, location, navigation.
- Patrón de test de servicio (a copiar): `access-service.test.ts` L1-40 y `sync-manager.test.ts` L1-60: `jest.mock('../src/services/api', () => ({ api: {get,put,...}, getToken }))`, `jest.mock('../src/services/db', () => ({ getDatabase: jest.fn() }))` devolviendo un objeto `{runAsync,getAllAsync,getFirstAsync}` en memoria, `jest.mock('../src/hooks/use-connectivity', () => ({ checkConnectivity: jest.fn() }))` para simular offline/online, `jest.useFakeTimers()` para el planificador, `jest.clearAllMocks()` en `beforeEach`. `sync-manager.test.ts` también captura `setOnSessionChange` y `AppState.addEventListener`.
- Tests de hook: NO existe ningún test de hook con `renderHook`. `@testing-library/react-native` NO está en `package.json` (aunque conventions.md L79 lo menciona). Los tests de pantallas usan `react-test-renderer` (`renderer.create` + `act`) y MOCKEAN el hook (`jest.mock('../src/hooks', ...)`, `mockUseGratitude.mockReturnValue(...)` en `gratitude-circle-screen.test.tsx` L11-67). Para testear `useSafetyPlan` sin dependencias nuevas: componente arnés mínimo con `react-test-renderer` + `act` (guardando el valor del hook en una variable) y mockear `@/services/safety-plan-service`, `@/services/sync-manager` y `@/hooks/use-connectivity`. Si se prefiere `renderHook` de RNTL, es dependencia nueva -> pedir aprobación (architecture.md regla 5 / "blocked").
- Verificación: `./init.sh` / `.\init.ps1` (ejecuta lint/tsc/tests; ver `docs/verification.md`, `docs/quality-gate.md`). ESLint con `sonarjs` (`App/eslint.config.mjs`): cuidar complejidad cognitiva y duplicación. `palette-guard.test.ts` solo afecta a UI (no a esta feature).

## 5. Reglas relevantes de docs/
architecture.md:
- L8-20 capas App: `types/` interfaces compartidas, `services/` solo consumo de API/persistencia y "nunca JSX", `hooks/` conecta UI con servicios; flujo Screen -> Hook -> Service -> API (L33-38). Las pantallas no llaman a la API directamente (L81).
- L44-52 Privacidad/anonimato: solo `id_anonimo` viaja en JWT y tablas clínicas; ningún endpoint operacional expone email/nombre. El plan se identifica por el JWT; la App NUNCA debe enviar ni guardar email/nombre real junto al plan. `idAnonimo` ya vuelve en la respuesta (se puede conservar en el tipo, pero no usarlo como clave de URL).
- L40-42 Nada hardcodeado de contenido clínico: los textos de los 7 pasos (títulos/ayudas) son de la feature 96; en 95 solo estructuras de datos y valores vacíos, sin copy clínico.
- L54-55 Sin dependencias nuevas. L85-86: no `console.log` para debug (el repo usa `console.warn('[modulo] ...')` en servicios) y JWT solo en SecureStore.
security-guidelines.md:
- §9 (L147-154): datos de salud mental = altamente sensibles; minimización; "No loggear contenido clínico"; logs solo con `id_anonimo`; errores al cliente sin datos sensibles. En la App: no loguear el plan, los contactos ni teléfonos (ni payloads de `pending_ops`), solo entity/tipo/opId/mensaje, como `recordFailedOp`.
- §3 L110 AuthZ por recurso; §3 L112 limpiar tokens en 401/logout (extensión lógica: limpiar el plan local en logout/cambio de cuenta); §6 L131 SecureStore para tokens; §6 L135 no mostrar trazas completas.
- §9 L152 Retención: al borrar cuenta aplicar política (el backend borra por `ON DELETE CASCADE`; la App debe borrar la caché local).
conventions.md:
- Archivos kebab-case (`safety-plan-service.ts`, `use-safety-plan.ts`, `safety-plan.ts`); interfaces `I...`, tipos `T...`; hooks `useX`; constantes UPPER_SNAKE; comillas simples, Prettier 100 cols, trailing comma all; imports externos -> `@/` -> relativos; sin comentarios salvo "por qué" no obvio; tests `*.test.ts` en `__tests__/`, `describe`/`it` descriptivos, `beforeEach` para limpiar; "no usar mocks de módulos externos salvo estrictamente necesario" (en la práctica el repo mockea api/db). Frontend: hooks atrapan errores y exponen `error` (la convención pide también `isError`; use-gratitude solo expone `error`, así que exponer ambos es lo más seguro).
- Mensajes de UI/errores en español.

## 6. Diseño propuesto (resumen para quien implemente)
- `App/src/types/safety-plan.ts`: `ISafetyContact {id?, nombre, telefono}`, `ISafetySanitaryDevices`, `ISafetyPlan` (campos como el backend), `ISafetyPlanInput`, `TSafetyPlanStep = 1..7`, `TSafetyPlanSyncState = 'synced'|'pending'|'local-only'`, `ISafetyPlanSnapshot {plan, syncState, lastSyncedAt}`; helper `createEmptySafetyPlan()`.
- Servicio `App/src/services/safety-plan-service.ts` (funciones sueltas, patrón gratitude): `getCachedSafetyPlan()` (lectura instantánea de SQLite), `fetchSafetyPlan()` (GET + reescribir caché solo si no hay op pendiente), `saveSafetyPlan(input)` (escribe caché local con `synced=0` -> reemplaza op pendiente `safety_plan`/`update` -> `void flushPendingOps()` -> devuelve plan local), `loadSafetyPlan()` (caché primero; si online `flushPendingOps` + fetch; fallback a caché), `clearSafetyPlanCache()`, `getTrustedContacts(plan)` (contactos válidos del Paso 4: nombre y teléfono no vacíos; para el modal de la 97 normalizar teléfono a dígitos/`+`).
- Sync: nueva rama `safety_plan` en `sync-manager.pushPendingOp` -> `api.put('/safety-plan', payload)` + actualizar caché con la respuesta.
- Hook `App/src/hooks/use-safety-plan.ts`: `{ plan, loading, saving, error, isError, syncStatus, hasPendingChanges, load, savePlan, updateStep/updateField, add/update/removeContact(paso 3|4), trustedContacts, hasTrustedContacts }`, usando `useConnectivity` + `addSyncListener`; exportarlo en `hooks/index.ts`.
- Tests: `__tests__/safety-plan-service.test.ts` (caché vacía/hidratada, online -> GET y reescritura, offline -> solo caché, guardado optimista offline encola y NO llama a `api.put`, online encola y hace flush, error de red conserva cambios locales, no se sobrescribe un plan con cambios pendientes, `getTrustedContacts` filtra vacíos, no se loguea el plan), `__tests__/use-safety-plan.test.tsx` (carga inicial desde caché, error, update optimista, selector de contactos, recarga al volver online), y ampliar `__tests__/sync-manager.test.ts` con la rama `safety_plan`.

## 7. Riesgos y dudas abiertas
1. Prioridad/orden: `current.md` pone 98-105 antes que 95; confirmar con el usuario antes de pasar 95 a `in_progress` (regla de CLAUDE.md: menor id `pending`, pero hay decisión explícita del usuario del 2026-10-28).
2. Cambiar `sync-manager.ts` es necesario (rama `safety_plan`) y excede la lista literal de archivos del criterio; riesgo de regresión en gratitude/timeline (cubrir con su test existente). Alternativa descartada: encolar como `entity: 'safety-plan'` con `tipo: 'update'` sin id no funciona con el código actual.
3. PUT de reemplazo total + last-write-wins sin versión: dos dispositivos pueden pisarse; un reintento viejo puede sobrescribir cambios más nuevos del servidor. Mitigar: coalescer a una sola op con el plan completo más reciente, y al hacer GET no sobrescribir la caché si hay cambios pendientes. Definir política de conflicto (¿mostrar aviso?) — duda de producto.
4. Fuga entre cuentas en el mismo dispositivo: `logout` no limpia SQLite, y la caché del plan no está ligada a `idAnonimo`. Riesgo de privacidad (datos altamente sensibles). Propuesta: guardar `idAnonimo` junto a la caché y descartarla si no coincide con el de la sesión (la respuesta del backend trae `idAnonimo`), y/o llamar `clearSafetyPlanCache()` + `DELETE FROM pending_ops WHERE entity='safety_plan'` en logout. Pero para el modal de pánico (97) el plan debe seguir disponible offline mientras haya sesión; decidir si el logout lo borra (recomendado sí). Tocar `use-auth.ts`/`access-purge.ts` sería alcance adicional; si no, documentarlo como deuda para 96/97.
5. Invitado (sin token): no hay `GET/PUT` posible. Decidir si el invitado puede tener plan solo local (el panic modal de la 97 podría querer contactos de confianza también para invitados). Con el diseño de cola, las ops quedan `no-session` y suben al iniciar sesión, lo que podría subir el plan de un invitado a otra cuenta que inicie sesión después en el mismo dispositivo. Duda abierta.
6. Cifrado en reposo: SQLite sin cifrar (igual que gratitude/timeline) y plan con teléfonos y texto clínico; SecureStore no admite el tamaño. Aceptar y dejar documentado, o cifrar el JSON con clave en SecureStore (dependencia criptográfica nueva -> bloqueado por regla 5). Recomendación: aceptar como hoy y registrar riesgo.
7. Validación cliente vs. servidor: el servidor rechaza (400) textos > 10000 y listas > 50, y trunca silenciosamente nombre 150/teléfono 40/dispositivos 60/id 50. Si un 400 llega a una op encolada, `flushPendingOps` la reintentaría indefinidamente (la cola no distingue errores permanentes 4xx de transitorios). Necesario: validar en cliente con los mismos límites antes de guardar y, idealmente, descartar ops con 400 (cambio en sync-manager) o al menos no bloquear otras ops.
8. `api.delete`/204 sin cuerpo: `request()` hace `response.json()` y fallaría; solo relevante si se implementa borrado del plan (no pedido en 95).
9. `api.parseError` descarta `error.code` del backend; si el hook quiere mensajes por código (`TEXT_LIMIT_EXCEEDED`), requiere ampliar `api.ts` (fuera de alcance; usar `message`).
10. Tests de hook: sin RNTL ni precedente de `renderHook`; se propone arnés con `react-test-renderer`. Confirmar que sirve o aprobar `@testing-library/react-native`.
11. Dato "id" de contactos: el backend acepta `id` opcional (string <= 50); la App debe generar uno (`generateUUID` en `services/uuid.ts`) para listas editables y que no se pierda en el round-trip.
12. Gating por feature de acceso (feature 99 pendiente): el endpoint hoy no está restringido por plan; la 95 no debe depender de `useAccess`. Revisar cuando se cierre la serie 98-105 si el kit tiene clave de feature (grep: no existe referencia a `safety`/`autocuidado` en `App/src` ni en el plan de accesos).
13. Migración: el criterio del 94 dice 026, la real es 027 (documental).
