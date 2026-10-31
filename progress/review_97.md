# Review — feature 97 (+ Paso 3 como texto + ronda 95/96)
**Veredicto:** APPROVED

Fecha: 2026-10-30. Revisor: agente `reviewer` (solo lectura; mutaciones solo en las copias Linux `$HOME/app-lx` y `$HOME/be-lx`, restauradas).

Ningún defecto bloqueante. Los criterios de la 97 se cumplen (botón renombrado, vista interna con la lista, `tel:` y `https://wa.me/<dígitos>?text=Tienes%20cinco%20minutos%20para%20m%C3%AD`, mensaje que lleva a Perfil › Kit, lectura solo de la copia local, tests de los dos estados y de la apertura de enlaces). El Paso 3 como texto conserva los datos antiguos (lista JSONB con teléfonos cifrados, caché local antigua, ops en cola con lista). La ronda 95/96 (M3, O1, O2, O5) está implementada y cubierta por tests sensibles. Quedan observaciones, dos de ellas a resolver antes del despliegue o del cierre (N1 y N2).

## Evidencia ejecutada
- Gate del usuario: `.\init.ps1` 2026-10-30 14:28 VERDE (tests Backend y App PASS; quality-lite PASS: Backend 0 err/16 avisos, dup 1,93 %; App 0 err/19 avisos, dup 9,69 %). Lo tomo como evidencia de C1/C4.
- App (`$HOME/app-lx`, sincronizada con `tools/sync.sh`): jest completo **33 suites / 495 tests PASS**; `tsc --noEmit` **0 errores**; ESLint sobre los archivos del alcance: **0 errores**, 3 avisos ya existentes (`use-auth.ts:59`, `profile-screen.tsx:82`, `api.ts:203`).
- Backend (`$HOME/be-lx`, sincronizado con tar): jest **26 suites / 386 tests PASS**; `tsc --noEmit` **0 errores**; ESLint de src del alcance limpio; 1 error `no-explicit-any` en `tests/safety-plan.test.ts:221` (test, ya conocido, fuera del lint del gate).
- Mutaciones (cada una restaurada):
  | Mutación | Resultado |
  |---|---|
  | Mensaje WhatsApp sin tilde (`para mi`) | 1 test falla ✔ |
  | `loadTrustedContacts` usa `fetchSafetyPlan` (red) en lugar de la caché | 2 fallan ✔ |
  | `normalizeActivities` cambia el separador `—` | 1 falla ✔ |
  | `PERMANENT_HTTP_STATUS` solo con 404 | 3 fallan ✔ |
  | Quitar el re-chequeo de sesión en `fetchSafetyPlan` (O2) | 2 fallan ✔ |
  | Quitar `hasPendingOpsFor` en `requeueOrphanPendingPlan` | 2 fallan ✔ |
  | `applySnapshot` sin comparar contra `baseRef` (O1) | 2 fallan ✔ |
  | Pantalla sin motivo `cloud` en la confirmación (O1) | 2 fallan ✔ |
  | Panic modal no vuelve a las líneas al reabrir | 1 falla ✔ |
  | Backend: PUT no convierte la lista antigua del Paso 3 | 1 falla ✔ |
  | Backend: lectura ignora la lista legado si no hay texto | 3 fallan ✔ |
  | Backend: el UPSERT no vacía `paso3_actividades_personas` | **sobrevive** (repositorio mockeado; ver N5) |
  | `toWhatsAppNumber` sin `if (parts.legacy)` | sobrevive: mutante equivalente (un legado nunca pasa `formatStoredPhone`) |

## Checkpoints
- C1:
  - [x] Existen `AGENTS.md`, `init.sh`, `init.ps1`, `feature_list.json`, `progress/current.md`.
  - [x] Existen `docs/architecture.md`, `docs/conventions.md`, `docs/verification.md`.
  - [x] Existe `docs/entorno-pruebas.md` (no puedo verificar las credenciales de los contenedores desde aquí).
  - [x] Existe `plugins/wp-test/docker-compose.yml`.
  - [x] `.\init.ps1` exit 0 (gate del usuario de 2026-10-30 14:28).
- C2:
  - [x] Solo una feature `in_progress` (97); 98 `blocked`.
  - [x] Las features `done` del área (94, 95, 96) tienen tests que pasan.
  - [ ] `progress/current.md` arrastra secciones de sesiones anteriores sin cerrar (feature 98, gate de calidad en Docker). No lo introduce esta revisión, pero hay que limpiarlo al cerrar.
- C3:
  - [x] Módulos nuevos en las capas previstas (`hooks/use-trusted-contacts.ts`, `utils/trusted-contact-links.ts`, servicio y migración). El copy offline está en `data/safety-plan-steps.ts`, que es la excepción ya documentada (README §3.B); `TRUSTED_CONTACTS_COPY` cae bajo la misma justificación (modal de crisis sin red).
  - [x] Sin dependencias nuevas por esta feature (`Linking` es de RN; `wa.me` no necesita módulo nativo). `package.json` de App/Backend tiene cambios ajenos (serie 98 / gate).
  - [x] Sin `console.log` ni TODOs en el alcance. Los `console.warn` no llevan PII, teléfonos, URLs ni contenido del kit.
- C4:
  - [x] Módulos nuevos con test (`trusted-contacts.test.tsx`, `panic-modal.test.tsx`, tests del kit en Backend y App).
  - [x] Tests con datos de prueba; sin mocks del filesystem.
  - [x] `npm test` > 0 tests y todos verdes en ambos proyectos.
  - [ ] Security-auditor / sonar-verifier / `quality-release` pre-main: no ejecutados (aplican antes de `main`, no al `done`).
  - [x] `quality-check` en PASS (dentro de `init`).
  - [ ] Hook `pre-push` sin instalar en App y Backend (aviso del propio `init`).
  - [x] Anonimato: el modal solo lee contactos de la cuenta en sesión (o del invitado). Nunca los de otra cuenta (test). No se registran números ni URLs (test). Excepción: ver N2 (doc de seguridad desactualizado).
- C5:
  - [x] Sin archivos temporales sospechosos en el alcance.
  - [ ] `progress/history.md` aún sin la entrada de esta sesión (se hace al cerrar).
  - [x] La 97 figura `in_progress`, que es su estado correcto mientras queda la prueba en dispositivo real y la validación clínica.

## Cambios requeridos (bloqueantes, si aplica)
Ninguno.

## Observaciones no bloqueantes
- **N1 (media, despliegue / pérdida de datos por versiones mezcladas).** El API ahora devuelve `paso3ActividadesPersonas` como `string`. Una build de la app anterior a este cambio normaliza el string a `[]` (su `normalizeContacts`). Si esa persona guarda, envía `[]` y el backend lo convierte en `''`: se borra su texto del Paso 3. Hay que desplegar App y Backend juntos (migración 028 → backend → actualizar las apps de prueba), o no guardar desde builds antiguas. Hay que añadirlo a la nota de despliegue de `progress/current.md`. También queda pendiente el posible choque de numeración 028 con la serie 98-105.
- **N2 (media, documentación de seguridad).** `docs/security-guidelines.md:66` sigue diciendo que se cifran los teléfonos "de los Pasos 3 y 4". Tras la 028, el Paso 3 es texto libre en claro y puede contener teléfonos de terceros, aceptado por el usuario. La columna JSONB legado mantiene teléfonos cifrados hasta el siguiente guardado. Hay que actualizar esa sección antes de cerrar la 97.
- **N3 (media-baja, O5 incompleto).** `syncBeforeLogout` (`App/src/services/safety-plan-service.ts:274-284`) no espera a un flush que ya está en curso: `flushPendingOps` vuelve de inmediato si `syncing` (`App/src/services/sync-manager.ts:340-347`). Ejemplo: guardar el kit (lanza el flush), ir a Perfil y cerrar sesión mientras el PUT vuela o mientras otras ops van delante en la cola. El cierre borra tokens y caché (`use-auth.ts:234-237`), el resto de la cola falla sin sesión y `clearSafetyPlanCache` borra la op del kit. Propuesta: exponer una promesa del flush en curso (o un `waitForIdle`) y hacer `race` con ella.
- **N4 (baja, privacidad UI).** `useTrustedContacts` (`App/src/hooks/use-trusted-contacts.ts:15-31`) conserva el último estado al cerrar el modal. Si el host sigue montado tras un logout, al reabrir como invitado se ven un instante los contactos de la cuenta anterior, hasta que termina la lectura local. Propuesta: `setState(EMPTY)` cuando `active` pasa a false.
- **N5 (baja, test).** Ningún test comprueba que el UPSERT vacíe `paso3_actividades_personas` (`Backend/src/services/safety-plan-repository.ts:33,40,45`): el repositorio está mockeado y la mutación sobrevive. Propuesta: un test que verifique el SQL o los `values` enviados a `pool.query`.
- **N6 (baja).** Una op en cola con el Paso 3 en forma de lista (app previa) sube bien: el backend la convierte. Pero `applySynced` (`App/src/services/safety-plan-cache.ts:201`) compara la lista contra el texto ya normalizado de la caché, no marca `synced` y el kit queda "pendiente" hasta la siguiente apertura, cuando `requeueOrphanPendingPlan` lo resuelve. No se pierden datos. Propuesta: normalizar `pushed` con `normalizeActivities` antes de `sameInput`, y un test de "op con lista en cola".
- **N7 (baja, copy).** El aviso `incomplete` dice "no tienen el indicativo del país", pero también cuenta teléfonos canónicos inválidos (`summarizeTrustedContacts`, `safety-plan-service.ts:304-310`). Los contactos con teléfono válido y sin nombre se excluyen sin aviso. El criterio dice "Enviar WhatsApp" y el botón dice "WhatsApp" (`panic-modal.tsx:89`); el usuario aprobó los textos, así que solo se anota.
- **N8 (decisión del usuario, se registra).** Los 4xx permanentes aplican a todas las entidades. Un 404 por una ruta o un proxy mal desplegados retira de la cola ops de gratitud o línea de tiempo: el dato se queda en el dispositivo pero no vuelve a encolarse, porque solo el kit tiene re-encolado. Conviene revisarlo cuando se retome.
- **N9 (preexistente, fuera de alcance).** El logout solo borra las ops del kit. Las ops de gratitud o línea de tiempo de la cuenta A que sigan en cola tras `syncBeforeLogout` se subirían con la sesión de la siguiente cuenta. Conviene evaluarlo en una feature aparte.
- Pendientes ya declarados para cerrar la 97: prueba en dispositivo real (Android/iOS, con y sin WhatsApp instalado), validación clínica de `TRUSTED_CONTACTS_COPY`, `confirmReplaceCloudText` y "Cerrando sesión…", y la limpieza de `progress/current.md` y `history.md`.
