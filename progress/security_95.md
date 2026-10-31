# SECURITY AUDIT - feature 95 (App: plan de seguridad / kit de autocuidado)

Auditoría estática, solo lectura. Sin secretos ni PII en este informe; no se leyeron `.env*`.

## Resumen
- Archivos revisados: App/src/types/safety-plan.ts, services/safety-plan-cache.ts, services/safety-plan-service.ts, hooks/use-safety-plan.ts, services/sync-manager.ts (rama safety_plan, replacePendingOps, recordFailedOp), api.ts (parseError, tokens, 401), db.ts (app_config/pending_ops), use-auth.ts (logout). Contraste con Backend/src/services/safety-plan-service.ts (mensajes y límites) y controller (idAnonimo desde req.user).
- Hallazgos: CRITICAL 0 / HIGH 0 / MEDIUM 4 / LOW 5 / INFO 3.
- Nota: `git diff` de sync-manager.ts y db.ts aparece como reescritura completa del archivo (cambio de fin de línea, ajeno a la feature); la revisión se hizo sobre el contenido actual.

## Hallazgos

### [MEDIUM] M1. Logout / borrado de cuenta no limpia el plan (datos de salud mental persisten en claro)
- Archivo: App/src/hooks/use-auth.ts:226-229 (logout solo `clearTokens`); App/src/services/safety-plan-service.ts:215 (`clearSafetyPlanCache` existe pero nadie lo invoca).
- Impacto: tras cerrar sesión el plan (signos de alarma, motivos, contactos) queda en `app_config` en SQLite sin cifrar hasta que otra cuenta lo descarte. Dispositivo compartido/robado/backup: lectura de contenido clínico. La app no lo muestra a invitado ni a otra cuenta (ver "Controles correctos"), por lo que es exposición en reposo, no en UI.
- Recomendación: invocar `clearSafetyPlanCache()` en logout, borrado de cuenta y fallo de refresh (401 definitivo en api.ts:190/217) antes de la 96/97. Si se quiere conservar para el mismo usuario, hacerlo solo con opción explícita.
- Verificación: test de logout que compruebe que `safety_plan:v1` y las ops `safety_plan` no existen.

### [MEDIUM] M2. Sobrescritura/pérdida del plan pendiente de una cuenta por escritura de invitado
- Archivo: safety-plan-service.ts:131-141 y 179-199.
- Descripción: con sesión nula, `readOwnRecord` conserva el registro de la cuenta A (no lo borra), pero `saveSafetyPlan` hace `writeSafetyPlanRecord` (clave única) con owner null y `replacePendingOps` borra la op de A. El plan no sincronizado de A se pierde sin aviso. Mismo efecto si `getSessionIdAnonimo()` devuelve null por fallo de decodificación estando autenticado (ver L1): el usuario guarda "como invitado" y, al volver el token válido, la op se descarta (sync-manager.ts:~420 `record.owner !== session` → return y se borra la op).
- Impacto: pérdida de datos críticos de seguridad (disponibilidad/integridad), no fuga.
- Recomendación: no sobrescribir un registro con owner distinto de forma silenciosa (avisar o guardar por owner: clave `safety_plan:v1:<owner|guest>`); distinguir "sin token" de "token ilegible" y en el segundo caso fallar con error genérico en vez de tratar como invitado.

### [MEDIUM] M3. Errores 4xx (p. ej. 400/413/422) reintentan indefinidamente; el plan permanece en la cola
- Archivo: sync-manager.ts:~385-395 (todo error → `recordFailedOp`, `attempts+1`, nunca se descarta), api.ts:150-153.
- Impacto: un payload rechazado por el servidor (límites del backend distintos a los del cliente) se reintenta para siempre con backoff 300 s, bloquea el orden de la cola de otras entidades no, pero deja el plan en `pending` perpetuo y el usuario cree que está respaldado. Además el contenido sensible queda en `pending_ops` indefinidamente.
- Recomendación: `api` debe exponer `status` en el Error; para 4xx distinto de 401/408/429 marcar la op como fallida terminal (sacarla de la cola, `syncState: 'error'`/aviso genérico) y no reintentar. Alinear límites cliente/servidor (backend valida contactos ≤50 y MAX_TEXT_LEN).

### [MEDIUM] M4. Plan de salud mental en SQLite sin cifrar (más `pending_ops.payload` duplicado)
- Archivo: safety-plan-cache.ts:134-140 (JSON completo en `app_config`), sync-manager.ts:addPendingOp (payload completo en `pending_ops`).
- Evaluación: aceptable como base consistente con gratitude/timeline y con sandbox del SO (la decisión está documentada en impl_95.md), pero el plan de seguridad es el dato más sensible de la app (ideación suicida, personas de apoyo con nombre y teléfono) y existe en dos copias en claro.
- Recomendación: cifrar el valor con clave en SecureStore/Keychain (p. ej. AES-GCM, o SQLCipher), o como mínimo guardar solo en `app_config` y que la op `safety_plan` lleve un marcador sin payload (el sync lee el plan del registro, ya validado por owner). Eso elimina la copia duplicada y la superficie 4xx de M3.

### [LOW] L1. JWT solo se decodifica, sin validar firma/exp/formato
- Archivo: safety-plan-cache.ts:98-108.
- Análisis: el `idAnonimo` se usa únicamente como etiqueta local de propiedad; el servidor deriva identidad de su propio JWT verificado (controller usa `req.user.idAnonimo`), por lo que un token manipulado localmente no permite acceder a datos de otra cuenta ni subir a otra (el PUT va con el token real). Riesgo residual: (a) alguien con control del almacenamiento local puede fijar un owner arbitrario y que la app muestre la caché de ese owner (ya tiene acceso a la caché en claro); (b) un token expirado sigue "decodificando" (el 401 lo gestiona api.ts); (c) `atob` sin relleno `=` de base64url puede lanzar en algunos motores y degradar a "invitado" (ver M2); `atob` puede no existir en entornos RN antiguos.
- Recomendación: añadir relleno de padding, validar patrón del id (UUID/longitud) y presencia de `exp` solo informativa; documentar que no es control de seguridad. Preferible que el login guarde `idAnonimo` ya validado por la respuesta del backend junto al token.

### [LOW] L2. TOCTOU entre lectura de sesión y PUT
- Archivo: sync-manager.ts pushSafetyPlanOp (lee sesión y registro, luego `api.put` relee el token en api.ts:165).
- Descripción: si la sesión cambia (logout+login de otra cuenta) en la ventana entre ambas lecturas, el PUT podría ir con el token de la nueva cuenta con el plan de la anterior. Ventana de milisegundos y requiere cambio de cuenta durante un flush; no hay UI que lo permita en ese lapso salvo refresh en curso.
- Recomendación: tras el PUT/antes de él comparar `getSessionIdAnonimo()` con `session` (o pasar el token capturado); y que `markSafetyPlanSynced` ya verifica owner (correcto).

### [LOW] L3. Mensaje del servidor propagado a logs y a `lastFlushError.message`
- Archivo: api.ts:153 + sync-manager.ts recordFailedOp (console.warn con `message`).
- Evaluación: los mensajes del backend de safety-plan son estáticos (no incluyen contenido del plan); sin PII hoy. Riesgo si un cambio futuro interpola valores. `getLastFlushError` hoy solo lo consume use-gratitude (sin UI del plan).
- Recomendación: en logs registrar solo status/código; no mostrar `message` crudo del servidor al usuario en la UI del plan.

### [LOW] L4. Validación del lado cliente incompleta
- Archivo: safety-plan-service.ts:46-104, safety-plan-cache.ts.
- `cleanContacts` hace `contact.nombre.trim()` sin comprobar tipo (TypeError → capturado como error genérico, aceptable). Sin validación de formato de teléfono ni de caracteres de control (no hay riesgo de SQL ni XSS en RN porque no hay HTML/WebView; todo se renderiza como texto). Los `id` de contacto aceptan cualquier cadena ≤50. El tope total de la cola/registro no está acotado (≈ 4×10000 + 100 contactos: ~100 KB, razonable).
- Recomendación: validar `id` con patrón UUID y teléfono con regex permisiva (dígitos, +, espacios, guiones); validar tipos con guardas antes de `trim`.

### [LOW] L5. Comportamiento de privacidad de invitado
- safety-plan-service.ts:124-141: un invitado no ve el plan de una cuenta previa (correcto); pero un registro de invitado (owner null) queda en disco y, si el siguiente usuario es otra persona que inicia sesión, se elimina (correcto, sin subida). Riesgo solo de contenido residual en disco (ver M1).

### [INFO]
- I1. SQL: todas las consultas de la feature están parametrizadas (`?`): safety-plan-cache.ts:112-115, 136-139, 144; service:121; sync-manager `replacePendingOps` y `addPendingOp`. Sin concatenación. `/${op.entity}` en rutas de otras entidades no es de la 95 (entity es constante interna).
- I2. Logs: solo `console.warn('[safety-plan] cache read failed' | 'cache write failed' | 'save failed')` sin datos ni error; `recordFailedOp` no registra payload (comentario actualizado). Sin `console.*` en el hook.
- I3. Anonimato: el plan viaja solo con `idAnonimo` (ISafetyPlan.idAnonimo) y el PUT envía solo los 7 campos del plan (`toSafetyPlanInput`), sin idAnonimo/nombre/correo del usuario en el cuerpo; la identidad la fija el servidor desde el JWT. `ISafetyContact.nombre/telefono` son de terceros definidos por el usuario (contenido del plan), no identidad de la cuenta; mantenerlo así. Cumple la regla del README para la identidad de la cuenta.

## Controles correctos verificados
- Propiedad por dueño: lectura (`readOwnRecord`), escritura (`saveSafetyPlan` con owner = sesión), subida (`pushSafetyPlanOp` descarta si `owner !== session`), `markSafetyPlanSynced` (verifica owner y no pisa cambios más nuevos), fetch que no pisa pendientes.
- Un plan de invitado nunca se sube a una cuenta (se descarta op y registro).
- Mensajes de error al usuario genéricos o de validación sin contenido del plan (`SAFETY_PLAN_SAVE_ERROR`, `SafetyPlanValidationError`; el hook devuelve fallback para cualquier otro error).
- Backend (contraste): identidad desde `req.user.idAnonimo`, nunca del body.

## Checklist
- [x] Sin secretos (no se leyeron .env; ninguno en archivos de la feature)
- [x] AuthZ correcto (cliente: propiedad por owner; servidor: idAnonimo del JWT)
- [x] RLS: no aplica en App (fuera de alcance de esta auditoría)
- [~] Validación/saneamiento (presente; ver L4)
- [x] Errores seguros / sin PII (ver L3)
- [x] InfoSec: anonimato y logs (I2, I3); retención/limpieza pendiente (M1); cifrado en reposo pendiente (M4)

## Veredicto
OK con notas (NEEDS_FIX para M1 y M3 antes de exponer UI en las features 96/97). Sin CRITICAL ni HIGH.
