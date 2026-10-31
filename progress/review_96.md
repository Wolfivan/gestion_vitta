# Review — feature 96 (safety_plan_app_ui) — ronda final

**Veredicto:** APPROVED

Sin bloqueantes. Hay observaciones no bloqueantes (sección "Observaciones") que conviene resolver antes de la 97 o registrar como deuda con dueño. Lo que NO se cierra aquí: `.\init.ps1` en Windows sigue siendo el gate de cierre y `quality-check` NO se ejecutó en esta revisión (C1/C4/C5 abiertos por eso, no por el código).

## Historial de rondas
- Ronda 1: CHANGES_REQUESTED por B1 (Guardar podía pisar el plan del servidor con uno vacío o parcial). Más recomendados: confirmar al salir con cambios, avisar al cerrar sesión, reforzar tests.
- Ronda 2: B1 resuelto con la protección de entonces (bloquear edición hasta leer el servidor). Se añadieron `beforeRemove` y el aviso en el diálogo de Perfil.
- Ronda 3 (decisión del usuario "LOCAL PRIMERO"): se sustituye esa protección. Ahora manda lo local, la descarga va en segundo plano, hay aviso al invitado y confirmación al guardar sin primera descarga. Rondas 2-4 no habían sido revisadas hasta esta.
- Ronda 4: teléfono con indicativo escrito por el usuario, sin +57 supuesto.

## Verificación ejecutada (resultados reales, hoy)
Copia Linux `$HOME/app-lx` sincronizada desde `App/` (src, __tests__, test-utils y config) antes de ejecutar.
- `npx tsc --noEmit` (App): exit 0, sin salida.
- `npx eslint` sobre safety-plan-screen, safety-contact-list, safety-plan-step-card, phone, safety-plan-validation, safety-plan-steps, use-safety-plan, use-auth, safety-plan-service, safety-plan-cache, sync-manager, profile-screen, app-navigator, types/safety-plan: 0 errores, 4 avisos sonarjs preexistentes (use-auth:58, app-navigator:205 y 214, profile-screen:81).
- `npx jest --silent --no-watchman` (2 tandas): safety-plan-screen, use-safety-plan, safety-plan-service, use-auth-logout = 4 suites, 126 tests OK. profile-screen-safety-plan, phone, safety-plan-validation, sync-manager, palette-guard = 5 suites, 78 tests OK. Total 9 suites, 204 tests, 0 fallos (coincide con lo declarado en impl_96).
- Mutaciones sobre la copia (restauradas después; `diff -rq` repo vs copia sin diferencias): (M1) quitar la guarda `dirtyRef` de `applySnapshot` -> 4 tests del hook fallan. (M2) forzar `needsDownload=false` en la pantalla -> 5 tests fallan. (M3) quitar el chequeo `owner !== session` del push en sync-manager -> 2 tests fallan. (M4) quitar `if (parts.legacy) return null` de `toWhatsAppNumber` -> nada falla, pero es un mutante equivalente (con indicativo vacío `formatStoredPhone` ya devuelve null). Los tests detectan las regresiones de lógica que importan.
- Pruebas propias de `phone.ts` ($HOME/scratch/ph/probe.ts, node 22): ~60 casos (ver C). Sin hallazgos de lógica; un detalle de UX (ver O3).
- `git diff --ignore-cr-at-eol` de profile-screen, app-navigator, hooks/index: todo aditivo de la 96; las líneas de la 98 (`AccessStatusCard`, `AccessRequest`, quitar `SPACING` del import) no se tocaron ni se juzgan.
- CRLF: los tracked editados (use-auth, sync-manager, profile-screen, app-navigator, hooks/index, sync-manager.test) están 100% CRLF en el working tree con índice LF (convención del repo, `i/lf w/crlf`). Los archivos nuevos de la 96 de UI/utils son CRLF; los de la 95 (hook, service, cache, types, sus tests) son LF. Cosmético, sin efecto.
- `console.*` en la 96: ninguno. Solo hay 3 `console.warn` fijos en safety-plan-service (l.150, 177, 204) sin datos. Hex/rgba en pantalla y componentes: ninguno. palette-guard verde.

## A. Local primero y cola — OK
- Guardar es local inmediato: `saveSafetyPlan` (safety-plan-service.ts:183-208) escribe el registro (`pending: true`) y reemplaza la op dentro del cerrojo, y el PUT va por `flushPendingOps().catch(...)` sin `await` (l.207). La UI solo espera SQLite local.
- Lo local nunca se sustituye por la descarga: tres capas. (1) `fetchSafetyPlan` (l.155-181) devuelve el registro si `pending`. (2) `applySnapshot` (use-safety-plan.ts:60-67) no toca el plan si `dirtyRef`. (3) `savePlan` (l.130-150) solo limpia `dirty` si `planRef.current === started`. Mutación M1 confirma que el test lo ve.
- `hydrated`, `downloadState` y `cloudKitSkipped` coherentes: `hydrated` tras la lectura local (l.78-83), la descarga corre después; offline -> `done` si hubo descarga previa, `failed` si no; invitado `idle`; `cloudKitSkipped` solo con edición sin guardar + primera descarga con contenido (l.88-99) y se limpia al guardar.
- Descarga de login (`use-auth.ts:255-257` + `pullSafetyPlanOnSessionStart`, service l.227): no bloquea (fire-and-forget, nunca lanza), reintenta al cambiar `isOnline`, el efecto depende solo de `[isAuthenticated, isOnline]` (sin bucle). Posible doble GET (pull + `load` de la pantalla): inofensivo, ambos pasan por el cerrojo y por la guarda de `pending`. `flushPendingOps` recursivo (sync-manager.ts:404) termina: solo repite si el flush no falló y entró una op nueva.
- Fail-closed del backend + cola: sin clave en el servidor el PUT da 500; la op queda en cola y el plan sigue seguro en local (no se pierde nada).

## B. Confirmación al guardar y aviso al invitado — OK
- Aviso al invitado ANTES de empezar: `guestPending = hydrated && guestKit && !guestAccepted` (screen l.240); los pasos quedan colapsados mientras `locked`. "Entiendo" (y cerrar el diálogo) habilita editar y guardar en local (test l.690). Texto `localOnly`: "se borrará al salir o al iniciar sesión" (steps.ts:25-26) cumple la decisión (2).
- "Iniciar sesión" usa `logout()` del contexto (l.468), que limpia tokens y `clearSafetyPlanCache()` (use-auth.ts:233). Borra el kit de invitado de inmediato, sin segunda confirmación: el aviso del propio diálogo lo anuncia, aceptable (ver O6).
- Invitado que inicia sesión por otra vía: `readOwnRecord` descarta el registro de invitado y sus ops al primer acceso con sesión (service l.127-141); nunca se sube a la cuenta. Estaba avisado al empezar.
- Cierre de sesión con cambios pendientes o kit solo-local: aviso en el diálogo de Perfil (profile-screen.tsx:54-64, textos `KIT_PENDING_NOTICE`/`KIT_LOCAL_NOTICE`), cubierto por 5 tests. Mejora pendiente: sin `flushPendingOps` previo al logout (O5).
- Confirmación al guardar sin primera descarga: solo con sesión y `lastSyncedAt === null` (l.243), solo si el formulario es válido (l.282) y nunca para el invitado; "Guardar de todas formas" (destructivo) / "Esperar". No aparece cuando no debe (tests l.608-668; mutación M2 lo detecta).

## C. Teléfono con indicativo — OK
- phone.ts: ningún rastro de +57 supuesto (grep: solo ejemplos en comentarios/placeholder "País, ej. 57").
- Casos límite ejecutados: indicativo 1 y 4 dígitos válidos; 5 dígitos, `0`, `057` y `+57` en el recuadro -> error de formato; número 3 dígitos error, 4 y 14 OK, 15 error; total 15 OK y 16 -> "admiten hasta 15"; letras o `+` interno -> error; `(300) 123-4567` OK y se guarda `+57 3001234567`; espacios solos -> "Escribe el número". Paso 3: vacío OK, solo número -> pide indicativo, solo indicativo -> pide número. Paso 4: ambos obligatorios.
- Borradores: `+57 `, `+57` y `300` se parten de ida y vuelta. Datos antiguos `+573001234567` y `3001234567` -> `legacy: true`, indicativo vacío, todo en Número, aviso y bloqueo de guardado; no se adivina. Residual conocido: `+5730` se lee como indicativo de 4 dígitos sin número (sin impacto: el número faltante bloquea guardar).
- Límites: el canónico ocupa como máximo 1+4+1+14 = 20 caracteres (< 40 del backend); el recuadro Número limita a 34 caracteres. `prepareSafetyPlanForSave` (safety-plan-validation.ts:155) solo descarta filas totalmente vacías, recorta y canoniza; conserva `id` y el resto de pasos. No rompe los límites del backend.
- `toWhatsAppNumber`: `+57 3001234567` -> `573001234567`; `+1 2025550123` -> `12025550123`; `+52 1 55 1234 5678` -> `5215512345678`; null para legado, borradores, vacío, `+0 …`, número corto o de 15 dígitos y espacio no ASCII. `getTrustedContacts` (service l.246) solo ofrece Paso 4 con nombre y canónico válido: correcto para la 97 (los legados quedan fuera hasta que el usuario complete el indicativo).

## D / E. Ver revisión del cifrado en progress/review_95.md (sección final). Regresiones
- sync-manager: refactor de `flushPendingOps` en `pushPendingOp`/`recordFailedOp` equivalente para gratitude/timeline (create/update/delete/delete_all idénticos); 35 tests en verde.
- use-auth: logout sigue limpiando la caché (test con sesión real que pasa de true a false) y no falla si la limpieza rechaza.
- profile-screen / app-navigator aditivos; `ScrollView` solo envuelve avatar-menú (disclaimer y "Cerrar sesión" fuera). El test de perfil mockea `@/components/access/AccessStatusCard` (módulo de la 98): se rompería si la 98 se revierte, anotado.
- Sin PII en logs; mensajes al usuario genéricos.

## F. Calidad de los tests
Los 9 suites son sensibles a la lógica (mutaciones M1-M3 fallan donde deben). El mock de `KeyboardAwareScrollView` sigue siendo el `ScrollView` de RN, pero ya se verifica `bottomOffset` definido. `use-auth-logout` ahora parte autenticado. Huecos: no hay test de "guardar con `cloudKitSkipped` sin confirmar" (O1) ni del GET tardío posterior a un sync (O4).

## Observaciones (no bloqueantes)
- O1 (media). Con `cloudKitSkipped` el guardado NO pide confirmación: `needsDownload` (screen l.243) pasa a false en cuanto `applySnapshot` fija `lastSyncedAt`, aunque el kit de la nube no se haya mostrado ni aplicado. El banner avisa ("Si guardas, lo reemplazarás") pero el reemplazo es silencioso. Además `cloudKitSkipped` depende de `hadDownload` (use-safety-plan.ts:88): si el listener de sync (l.115) o un `load` repetido por cambio de red fija `lastSyncedAt` con edición sin guardar antes, el aviso no sale. Por lectura; no reproducido. Propuesta: pedir la misma confirmación cuando `cloudKitSkipped`, y fijar el flag comparando la nube contra el último plan aplicado, no contra `lastSyncedAt`.
- O2 (media-baja, privacidad; código de la 95). Carrera logout contra GET en vuelo: `fetchSafetyPlan` captura `session` (service l.156), y dentro del cerrojo escribe `owner: session` (l.166-173) aunque entre tanto `logout()` haya borrado tokens y caché. El kit del usuario queda en SQLite tras cerrar sesión (seguirá oculto a invitados y descartado por otras cuentas, pero en disco sin cifrar). Ventana: un GET lento justo al cerrar sesión (p. ej. justo tras el login, cuando corre el pull). Arreglo barato: dentro del cerrojo re-leer `getSessionIdAnonimo()` y no escribir si cambió; y que logout entre en `withSafetyPlanLock`.
- O3 (baja, UX). No se pueden teclear espacios en el recuadro Número: cada pulsación pasa por `composePhoneDraft` y `splitStoredPhone` hace `trim()` (phone.ts:65-68; safety-contact-list.tsx:99 muestra `phone.numero`). Probado: tras escribir `300 ` el valor mostrado vuelve a `300`. Sin pérdida de datos (el canónico guarda solo dígitos), pero molesto para quien agrupa cifras. Los guiones y paréntesis sí se conservan.
- O4 (baja, carryover de la 95). Un GET anterior a un guardado que llega DESPUÉS de que ese guardado ya se sincronizó (`pending=false`) sobrescribe la caché con el plan viejo y, si no hay edición, el hook lo muestra (service l.162-181). Requiere reordenar respuestas de red; mitigable con `savedAt` capturado antes del GET.
- O5 (baja). Sin `flushPendingOps` previo al logout (deuda declarada). El aviso del diálogo de Perfil se calcula de forma asíncrona (profile-screen l.54-64): si el usuario confirma antes de que responda SQLite no ve el aviso.
- O6 (baja). "Iniciar sesión" en el aviso del invitado borra su kit sin segunda confirmación; el diálogo se muestra en cada apertura aunque ya lo haya aceptado. Ya conocido.
- O7 (baja). Contactos sin `id` heredados del servidor (`normalizeContacts` no asigna uno): la fila no se puede editar por `id`. Improbable (la app siempre envía ids).
- Textos nuevos pendientes de validación del psicólogo cofundador: `downloading`, `notDownloaded`, `cloudKitSkipped`, `confirmSave*`, `localOnly`, errores de teléfono y avisos de cierre de sesión (ya listados en impl_96).
- No probado en dispositivo: teclado numérico, ancho de los recuadros (columna Indicativo 120 px), diálogos y `tel:`.

## Checkpoints
- C1: [ ]  <- `.\init.ps1` no ejecutado aquí; sigue siendo el gate de cierre en Windows.
- C2: [x]  una sola feature de trabajo; la 98 queda bloqueada y no se tocó.
- C3: [x]  arquitectura (pantalla -> hook -> servicio), paleta, teclado y sin `console.*`.
- C4: [ ]  <- tests de la 96 y tsc/eslint verdes aquí, pero `quality-check` NO se ejecutó.
- C5: [ ]  <- cierre de sesión pendiente tras `init`.

## Cambios requeridos
Ninguno bloqueante. Recomendados antes de la 97: O1 y O2.

## Para el usuario (Windows, PowerShell, desde la raíz del repo)
```
cd App
npx jest __tests__/phone.test.ts __tests__/safety-plan-validation.test.ts __tests__/safety-plan-screen.test.tsx __tests__/profile-screen-safety-plan.test.tsx __tests__/use-auth-logout.test.tsx __tests__/safety-plan-service.test.ts __tests__/use-safety-plan.test.tsx __tests__/sync-manager.test.ts __tests__/palette-guard.test.ts
cd ..
.\init.ps1
```
