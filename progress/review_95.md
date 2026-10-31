# Review — feature 95 (safety_plan_app_foundation)

**Veredicto:** APPROVED (ronda 2). Los 3 cambios requeridos de la ronda 1 quedan resueltos y probados. C1/C4 siguen sin poder marcarse: `init` y `quality-check` completos son del usuario.

## Resumen ronda 1 (historial)
CHANGES_REQUESTED con 3 cambios: (1) despertar perdido en `flushPendingOps` (`markQueueEmpty()` con op nueva entrada durante el PUT), (2) pérdida de edición intercalada en `savePlan`, (3) ventana de carrera en `fetchSafetyPlan` frente a `saveSafetyPlan`. Foco OK en ronda 1: contrato backend (PUT `/safety-plan`, 7 campos camelCase, límites coinciden), dueño idAnonimo (nunca se sube a otra cuenta), logs sin datos, sin regresión gratitude/timeline, CRLF conservado.

## Ronda 2

Verificación ejecutada (solo lectura, en el código real):
- `cd App && npx tsc --noEmit` -> exit 0.
- jest por archivo (`--roots '<rootDir>/src' '<rootDir>/__tests__' --no-watchman`): safety-plan-service 31/31, use-safety-plan 15/15, sync-manager 35/35 (0 fallos).
- Nota de entorno: durante la revisión `App/node_modules` quedó con el binding nativo de Windows (`@unrs/resolver-binding-win32-x64-msvc`, reinstalado desde el host a las 04:06-04:08) y jest no resolvía el preset en el shell Linux. Para poder ejecutar sync-manager se usó `NODE_PATH` apuntando a un binding linux descargado fuera del repo ($HOME/bind); no se tocó el repo ni `node_modules`. No es un defecto del código.
- No se ejecutó `init`, `quality-check` ni la suite completa (pendiente del usuario).

### 1. flushPendingOps / op durante el vuelo — RESUELTO
- `sync-manager.ts:402-413`: tras el bucle, si no hubo fallos y `hasQueuedOps(db)` (`COUNT(*) FROM pending_ops`, líneas 417-426) es > 0, deja `pending`, no llama a `markQueueEmpty()` y se re-invoca `flushPendingOps()` (`syncing` ya está en false, no cae en la rama `busy`).
- Sin bucle infinito: la recursión solo ocurre si el flush no falló, es decir todas las ops leídas se subieron y borraron por `op_id`; lo que queda es estrictamente lo insertado después. Cada vuelta re-comprueba token y conectividad, y un fallo cae en la rama `failed` con backoff. Sin reintento duplicado: la op subida se borró por `op_id` antes de re-consultar; `replacePendingOps` ya había eliminado la antigua. `hasQueuedOps` ante error devuelve false (degrada al comportamiento previo, aceptable).
- Test `sync-manager.test.ts:613-686`: el mock de `api.put` ejecuta `replacePendingOps` (cola en memoria con op_id reales) DURANTE el primer PUT. Comprueba 2 PUT, el segundo con BODY_V2, cola vacía, caché `pending=false` y estado `synced`. Intercala de verdad.
- gratitude/timeline: la rama `failed` y el camino sin ops no cambian; solo se añadió la rama intermedia. Los 26 tests previos siguen en verde.

### 2. use-safety-plan savePlan — RESUELTO
- `use-safety-plan.ts:94-112`: captura `started = planRef.current` antes del `await`; solo limpia `dirtyRef`/`isDirty` si `planRef.current === started`. `edit` siempre crea un objeto nuevo, así que cualquier edición intercalada cambia la referencia. `applySnapshot` respeta `dirtyRef` (solo actualiza `syncState` y no pisa el plan), de modo que se conservan el plan editado, `isDirty=true` y el `syncState` correcto.
- Test `use-safety-plan.test.tsx:267-300`: `saveSafetyPlan` diferido, edición intercalada, y comprueba `plan` editado, `isDirty` y `hasPendingChanges`. Prueba el comportamiento real.

### 3. withSafetyPlanLock — RESUELTO, sin deadlock
- `safety-plan-cache.ts` `withSafetyPlanLock`: cola de promesas (`lockTail.then(fn, fn)`; `lockTail = run.catch(() => undefined)`). Un error de `fn` rechaza solo a su llamador y la cola sigue: se libera siempre (equivale a finally), sin deadlock por excepciones.
- Usos: `fetchSafetyPlan`, `saveSafetyPlan` (lectura previa + `writeSafetyPlanRecord` + `replacePendingOps`) y `markSafetyPlanSynced`. Dentro del cerrojo solo se llama a `readOwnRecord`, `readSafetyPlanRecord`, `writeSafetyPlanRecord`, `deleteSafetyPlanRecord`, `discardPendingOps` y `replacePendingOps`, que no toman el cerrojo ni llaman a `flushPendingOps`. `flushPendingOps` (que llama a `markSafetyPlanSynced`) se invoca siempre FUERA del cerrojo (`saveSafetyPlan` lo llama tras salir; `loadSafetyPlan` lo espera antes de `fetchSafetyPlan`). No hay ciclo de espera. Documentado como no reentrante.
- Tests (`safety-plan-service.test.ts`, "carrera GET contra guardado"): `Promise.all([fetch, save])` con lecturas lentas, y GET que resuelve después del guardado; en ambos sobreviven plan guardado y `pending`.

### 4. getSessionIdAnonimo — RESUELTO
- `decodeBase64Url`: `-`->`+`, `_`->`/`, padding `=` hasta múltiplo de 4, luego `atob`. Id validado con `/^[A-Za-z0-9_-]{1,64}$/`; cualquier fallo (token malformado, JSON inválido, id no string) devuelve null. Tests: payload base64url sin padding con `-` real, e id `<script>` tratado como sin sesión.

### Regresiones nuevas
Ninguna detectada. Observaciones menores no bloqueantes (deuda):
- Si un GET que empezó antes de un guardado resuelve DESPUÉS de que ese guardado ya se sincronizó (`pending=false`), el cerrojo no lo detecta y la respuesta (anterior) podría sobrescribir la caché con el plan antiguo hasta el próximo fetch. Ventana estrecha; mitigable con un contador/`savedAt` capturado antes del GET.
- Los tests del cerrojo mockean `replacePendingOps`; la integración real con la cola está cubierta por el test de sync-manager.
- Deuda ya reconocida en `impl_95.md`: `clearSafetyPlanCache()` sin conectar a logout/borrado (96/97), 4xx permanentes reintentados, caché SQLite sin cifrar, plan de invitado descartado al iniciar sesión, token no decodificable tratado como invitado, confirmar `atob` en Hermes, eslint de tests con `no-require-imports`.

## Criterios de aceptación de la 95
- Tipos, persistencia offline (`app_config`, `safety_plan:v1`), servicio, hook con selector Paso 4 y tests de servicio/hook/sync: [x]
- Carreras de los cambios 1-3 con test propio: [x]

## Checkpoints
- C1: [ ]  <- Razón: `init`/`quality-check` completos no ejecutados (pendiente del usuario).
- C2: [x]  una sola feature `in_progress` (95).
- C3: [x]  arquitectura respetada (types -> cache -> service -> hook; sin dependencias nuevas; sin `console.log` de debug).
- C4: [ ]  <- Razón: tests de la 95 en verde (31/31, 15/15, 35/35) y tsc limpio, pero faltan quality-check, security-auditor y sonar-verifier del usuario.
- C5: [ ]  <- Razón: cierre de sesión (history.md, estado final de la feature) pendiente tras ejecutar init/quality-check.

## Cambios requeridos
Ninguno de código. Antes de cerrar la feature: el usuario debe ejecutar `init` y `quality-check` completos y, si salen verdes, marcar C1/C4/C5.

---

## Revisión final (cifrado backend y cambios del 2026-10-29)

**Veredicto:** APPROVED

Sin bloqueantes. Esto cubre la base de la 95 (App) tras los cambios de la 96 que la tocan y el cifrado de teléfonos en el backend. `.\init.ps1` en Windows sigue siendo el gate de cierre y el quality-check NO se ejecutó aquí (C1/C4/C5 abiertos por eso).

### Verificación ejecutada (real)
- Backend `npx tsc --noEmit`: exit 0. `npx jest --silent --no-watchman tests/safety-plan.test.ts tests/safety-plan-encryption.test.ts`: 2 suites, 29 tests OK (81 s).
- App (copia Linux sincronizada): tsc exit 0; eslint de los archivos del kit 0 errores; jest de safety-plan-service, use-safety-plan y sync-manager en verde (ver review_96.md: 9 suites, 204 tests).
- Pruebas propias del cifrado ($HOME/scratch/enc/probe.ts, mismo código de `field-encryption.ts`, node 22), 37 comprobaciones, todo OK: ida y vuelta (vacío, unicode/emoji, 40 caracteres, `a:b:c`); IV distinto por valor (12 B) y tag de 16 B; manipular iv, tag o ciphertext -> `FIELD_DECRYPTION_ERROR` genérico; tag truncado a 4 B rechazado; segmentos de más o de menos y ciphertext vacío rechazados; clave equivocada rechazada, `..._PREVIOUS` descifra; clave inválida (ausente, vacía, 16, 24 y 64 B, texto de 32 chars, hex de 63, basura) -> `FIELD_ENCRYPTION_ERROR`; hex, base64, base64url y con espacios válidas y equivalentes; interoperable con un AES-256-GCM independiente; el mensaje de error no contiene ciphertext.

### D. Cifrado backend — correcto
- `Backend/src/utils/field-encryption.ts`: `aes-256-gcm`, IV `randomBytes(12)` por valor (l.51), `authTagLength` 16 fijado en cifrador y descifrador (l.52, 63), tag exigido de 16 B (l.80), clave 32 B validada (`parseKey`, l.34-41; hex de 64 o base64). Formato `enc:v1:<iv>:<tag>:<ct>` versionado. Sin dependencias.
- Fail-closed: sin clave válida `encryptField` lanza 500 `FIELD_ENCRYPTION_ERROR` y `saveSafetyPlan` (services/safety-plan-service.ts:190-195) cifra ANTES de `upsertSafetyPlan`, así que nunca se guarda en claro (test: repo no llamado). Teléfono vacío no exige clave.
- Legado en claro: `decryptField` devuelve tal cual lo que no empieza por `enc:v1:` y se cifra en el siguiente PUT. Descifrado fallido: 500 genérico "Error interno del servidor" sin ciphertext; el GET no devuelve nada cifrado.
- Logs: ni `field-encryption.ts` ni el servicio/controlador/repositorio de safety-plan tienen `console.*`; `error-handler.ts:77` hace `console.error('[error]', err)` solo para errores no `AppError`, y los de cifrado son `AppError` (no se loguean). El test de logs cubre flujo OK y de error.
- Contrato HTTP intacto: el controlador (safety-plan-controller.ts) devuelve `mapRowToSafetyPlan(row)` en GET y PUT con las mismas claves; el teléfono viaja en claro por HTTPS y el cifrado es solo en reposo. Test: `Object.keys(res.body)` igual y teléfonos en claro. El único lector de la tabla es `getSafetyPlan`; no hay otra ruta que devuelva la columna sin descifrar.
- Acceso por usuario: `idAnonimo` siempre del JWT (`req.user!.idAnonimo`).

### Riesgos reales (no bloqueantes, en orden de importancia)
1. Despliegue sin clave: todo PUT con algún teléfono responde 500 hasta definir `SAFETY_PLAN_ENCRYPTION_KEY`. Es lo diseñado (fail-closed) y la App no pierde nada (queda `pending` en local y reintenta). Falta un chequeo al arrancar en producción que avise antes del primer PUT; la clave se lee de `process.env` en cada llamada y nada la valida en el arranque. Añadir a la lista de despliegue (docs/entornos-dev-produccion.md §4.1 ya lo menciona).
2. Sin AAD: el ciphertext no está ligado a `id_anonimo`, al paso ni al contacto. Quien pueda escribir en la BD podría mover un teléfono cifrado entre filas o entre Paso 3 y 4 y se descifraría sin error. Mejora barata: `setAAD` con id_anonimo y paso en cifrado y descifrado (requeriría un `v2` o migración).
3. Backups y datos legados: filas anteriores y backups de PostgreSQL/Supabase conservan teléfonos en claro hasta el siguiente guardado de cada usuario; no hay script de re-cifrado masivo. Perder la clave = perder los teléfonos (sin recuperación); la rotación solo permite descifrar con `_PREVIOUS`.
4. Fuera del cifrado: nombres, textos de los 7 pasos y números del Paso 5 (incluido el del psicólogo) siguen en claro en la BD; la caché SQLite de la App sigue sin cifrar (M4). Decisión de alcance documentada.
5. Un valor con otro prefijo (`enc:v2:...`) se devolvería tal cual como si fuera texto: si un día se despliega un `v2` y se hace rollback al `v1`, el servidor viejo mostraría ciphertext. Conviene tratar cualquier `enc:` desconocido como error.
6. Menores: `.env.example` dice "Feature 94" en el comentario (es la 95); `parseKey` acepta base64 laxo (ignora caracteres no válidos si el resultado mide 32 B). `tests/safety-plan.test.ts:221` conserva un `no-explicit-any` preexistente.

### Estado de la 95 en la App tras la 96 (hallazgos de security_95.md)
- M1 (logout no limpia) CERRADO: `use-auth.ts:233` + test de logout. Queda la ventana O2 de review_96.md (GET en vuelo durante logout reescribe el registro con el dueño viejo; `safety-plan-service.ts:156-173`). Recomendado re-leer la sesión dentro del cerrojo.
- M2 (invitado pisa el registro pendiente de una cuenta) PARCIAL: tras logout limpio ya no hay registro ajeno; sigue posible solo si la sesión cae por 401 (`setOnUnauthorized` no limpia) y se entra como invitado.
- M3 (4xx reintentados para siempre) ABIERTO como deuda: p. ej. un 413 por el límite por defecto de `express.json()` (100 kb, `app.ts:29`) con más de ~25.000 caracteres de emoji en los 4 textos. Práctica improbable; con el cifrado nuevo, un 500 por falta de clave también reintenta con backoff (aceptable: el dato está a salvo en local).
- M4 (SQLite sin cifrar) ABIERTO como deuda declarada.
- L1 (padding base64url) CERRADO en la ronda 2.

### Otras comprobaciones
- Regresiones: refactor de `flushPendingOps` equivalente para gratitude/timeline; recursión acotada. Cerrojo, `markSafetyPlanSynced` y guardado durante GET siguen cubiertos (incluidas mutaciones: quitar el chequeo de dueño del push rompe 2 tests).
- Los tests del cifrado (19) y los 10 previos de safety-plan son sensibles: cubren persistido cifrado, respuesta en claro, claves de la respuesta, truncado previo, 500 sin guardar, GET manipulado y logs.

### Checkpoints
- C1: [ ]  <- `init` no ejecutado aquí.
- C2: [x]
- C3: [x]  capas respetadas (util -> servicio; repositorio/controlador/rutas sin cambios).
- C4: [ ]  <- tests y tsc verdes; `quality-check` no ejecutado.
- C5: [ ]  <- cierre de sesión pendiente.

### Cambios requeridos
Ninguno bloqueante. Recomendados: re-leer la sesión dentro del cerrojo en `fetchSafetyPlan` (O2), chequeo de la clave en el arranque de producción, AAD en un `v2`, y tratar `enc:` desconocidos como error.
