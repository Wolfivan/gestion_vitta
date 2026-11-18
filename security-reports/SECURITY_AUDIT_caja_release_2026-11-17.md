# SECURITY AUDIT - caja de mensajes (release main..desarrollo)

## Resumen
- Alcance: diff `main..desarrollo` de Backend (`c0c89d4`) y App (`ede248f`), features 113, 114, 115 y 122.
- Archivos revisados (Backend): `routes/caja.ts`, `routes/admin-caja.ts`, `controllers/caja-controller.ts`, `services/caja-service.ts`, `services/caja-repository.ts`, `migrations/037_caja_mensajes.sql`, `utils/field-encryption.ts`, `utils/rate-limiter.ts`, `middleware/error-handler.ts`.
- Archivos revisados (App): servicios, utilidades y deep link de la caja; borrado de datos personales al cambiar de cuenta.
- Hallazgos: CRITICAL 0 / HIGH 0 / MEDIUM 0 / LOW 1 / INFO 2

## Hallazgos

### [LOW] Límites anti-abuso solo en memoria
- Archivo: Backend/src/services/caja-service.ts (ipLimiter, cuentaLimiter)
- Descripción: los límites de `POST /caja/escribir/:token` se pierden al reiniciar el proceso y no se comparten entre instancias.
- Impacto: con una sola instancia en Hostinger es aceptable; el tope de 20 pendientes por caja acota el abuso.
- Recomendación: si se escala a varias instancias, mover el límite a la base o a un store compartido.

### [INFO] `req.ip` depende de `trust proxy`
- El límite por IP usa `req.ip`, igual que el canje de bonos. Mismo comportamiento ya aceptado.

### [INFO] La clave `CAJA_ENCRYPTION_KEY` debe existir en producción
- Sin ella los endpoints de la caja responden 500 (fail-closed). Configurarla en el panel de Hostinger antes del deploy (ver `docs/entornos-dev-produccion.md` §4.2).

## Checklist
- [x] Sin secretos (solo claves vacías en `.env*.example`)
- [x] AuthZ correcto: todas las consultas filtran por `id_anonimo` de la sesión; rutas de dueña con `tool.caja`; admin con `adminMiddleware`
- [x] RLS: no aplica (Postgres propio, sin RLS)
- [x] Validación/saneamiento: ids, UUID y token con regex; SQL parametrizado; columnas dinámicas de `updateEjemplo` salen de una lista fija
- [x] Errores seguros / sin PII: los errores no incluyen texto, nombre ni token; el error handler ya no loggea el `detail` de Postgres
- [x] InfoSec: texto y autor cifrados con AES-256-GCM y clave propia; el token de invitación se guarda como SHA-256; la cuenta de quien escribe no se guarda con el mensaje; la App borra la caja local al cambiar de cuenta

## Veredicto
OK (con notas)
