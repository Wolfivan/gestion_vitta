# Feature 95 (backend) — Cifrado de teléfonos del plan de seguridad

Estado: implementado, sin commit. No se tocó `feature_list.json`, `progress/current.md`, la App ni la feature 98.

## Archivos
- NUEVO `Backend/src/utils/field-encryption.ts`: `encryptField`, `decryptField`, `isEncryptedField`.
- `Backend/src/services/safety-plan-service.ts`: cifra `telefono` de Pasos 3 y 4 justo antes de `upsertSafetyPlan` (tras sanitizar/truncar a 40); `mapRowToSafetyPlan` descifra. Repositorio, controlador, rutas, modelo y migración sin cambios (JSONB admite el string cifrado; el contrato HTTP no cambia).
- `Backend/tests/safety-plan.test.ts`: fija clave de prueba por env; el PUT ahora espera `enc:v1:` en lo persistido.
- NUEVO `Backend/tests/safety-plan-encryption.test.ts` (19 tests).
- Docs: `Backend/.env.example` (variables vacías con comentario), `docs/security-guidelines.md` (subsección en §9 zona datos de salud mental), `docs/entornos-dev-produccion.md` (§4.1). Finales CRLF conservados (`.env.example` 76->85 CR, security 75->84, entornos 225->237; los .ts nuevos/editados en LF como el resto de safety-plan).

## Formato y decisiones
- `enc:v1:<iv>:<tag>:<ciphertext>`, base64url; IV aleatorio 12 B por valor, tag 16 B, AES-256-GCM, solo `crypto` de Node (sin dependencias). `v1` = versión del formato, no de la clave.
- Clave: `SAFETY_PLAN_ENCRYPTION_KEY`, 32 B en base64 o hex de 64 chars; se lee de `process.env` en cada llamada (permite tests y no queda en `config`). Longitud validada.
- Rotación mínima incluida (era sencilla): `SAFETY_PLAN_ENCRYPTION_KEY_PREVIOUS` solo descifra si falla la actual; siempre se cifra con la actual. No hay re-cifrado masivo ni script.
- Solo se cifra `telefono` de contactos de Pasos 3 y 4. No se cifran nombre, textos, ni los números de `paso5DispositivosSanitarios` (líneas públicas 123/106; el teléfono del psicólogo en paso 5 queda en claro: decisión de alcance según el encargo, anotado como deuda). Nombre/textos: no cifrados; el nombre sin teléfono es menos identificable, pero sigue siendo dato sensible (deuda).
- Teléfono vacío: no se cifra ni exige clave. Truncado a 40 antes de cifrar.
- Fail-closed (también en desarrollo): clave ausente/inválida al cifrar -> `AppError` 500 `FIELD_ENCRYPTION_ERROR` "Error interno del servidor", no se llama al repositorio. Dato cifrado ilegible (tag/ciphertext alterado, formato roto, clave equivocada) -> 500 `FIELD_DECRYPTION_ERROR` genérico; nunca se devuelve el ciphertext. Sin logs propios; mensajes sin PII.
- Legado: valores sin prefijo `enc:v1:` se leen tal cual (sin exigir clave) y se cifran en el siguiente PUT. Sin migración masiva (script opcional no creado). Nota: un teléfono que el usuario escribiera literalmente con prefijo `enc:v1:` también se cifra al guardar, por lo que no hay ambigüedad en escrituras nuevas.
- Sin AAD (no se liga el valor al `id_anonimo`/campo): un atacante con acceso a escritura en BD podría intercambiar teléfonos cifrados entre filas. Mejora posible.

## Configuración en el servidor
1. Generar: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
2. Definir `SAFETY_PLAN_ENCRYPTION_KEY` en el panel de Hostinger (producción) y en el `.env` local de cada dev (no se tocaron `.env` reales). Sin ella, guardar contactos con teléfono da 500.
3. Perder la clave = perder los teléfonos guardados; no rotar sin plan.

## Evidencia (ejecutada aquí, Backend con node_modules local)
- `npx tsc --noEmit`: sin salida (0 errores).
- `npx eslint src/utils/field-encryption.ts src/services/safety-plan-service.ts tests/safety-plan-encryption.test.ts`: limpio. En `tests/safety-plan.test.ts` hay 1 error `no-explicit-any` en la línea 221 (`rowWithStringJson as any`), PRE-EXISTENTE, no introducido por este cambio (no se corrigió para no ampliar el alcance).
- `npx jest --silent --no-watchman tests/safety-plan.test.ts tests/safety-plan-encryption.test.ts`: 2 suites passed, 29 tests passed (19 nuevos + 10 existentes), 0 fallos.
- `npx jest ... tests/access.test.ts tests/access-service.test.ts tests/access-repository.test.ts tests/feature-middleware.test.ts`: 4 suites passed, 103 tests passed.
- Cubierto: ida y vuelta, formato/longitudes IV y tag, IV distinto, base64, manipulación de tag/ciphertext/formato, clave equivocada y PREVIOUS, legado, claves inválidas (undefined, vacía, corta, hex inválido, 16 B), PUT cifra lo persistido y responde en claro, mismas claves de respuesta, truncado previo al cifrado, 500 sin guardar, vacío sin clave, GET con manipulado -> 500 sin ciphertext, logs sin teléfono/ciphertext/clave.
- No se ejecutó la suite completa de Backend ni `init`/quality-check.

## Riesgos y deuda
- Rotación de clave: solo descifrado con PREVIOUS; sin re-cifrado masivo.
- SQLite local de la App sin cifrar (deuda M4); el teléfono viaja en claro por HTTPS (contrato).
- Datos legados en claro hasta el siguiente guardado de cada usuario; backups previos de PostgreSQL (y Supabase) pueden conservar teléfonos en claro.
- Teléfono del psicólogo en paso 5, nombres y textos sin cifrar; sin AAD.
- Despliegue: si se despliega sin la clave, los PUT con teléfono fallan con 500 (diseño fail-closed); los GET de datos legados siguen funcionando.
