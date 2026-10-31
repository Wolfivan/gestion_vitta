# Security Guidelines — VittalMind

> Aplicable a todo el código: `App/` (Expo/React Native/TS), `Backend/` (Node/Express/TS), plugins WP, SQL/migraciones, config.

## 1) Principios
- **Privacidad por diseño**: seguir el patrón de anonimato (ver README). Solo `usuarios_auth` puede relacionar identidad; resto apunta a `id_anonimo`.
- **Menor privilegio**: tokens con claims mínimos, rutas protegidas, RLS restrictivo.
- **Defensa en profundidad**: validación, autorización, saneamiento, errores sin datos sensibles.
- **Seguro por defecto**: read-only en revisiones, no ejecutar PoCs destructivos contra prod.

## 2) Secretos y configuración
- **Nunca commitear**: `.env`, claves, `*.pem`, `*.p8` (ej. `AuthKey_*.p8`), certificados.
- **Usar `.env.example`** con placeholders. Variables reales solo en entorno/secretos.
- **Detección**: bloquear patrones (`AKIA...`, `sk_live...`, `ghp_...`, claves privadas). Usar `gitleaks` si disponible (fallback a grep).
- **Config**: no hardcodear URLs/keys/IDs sensibles. Validar config al arranque.

## 3) Autenticación y Autorización
- **JWT**: firmar con clave fuerte, expiración razonable, distinguir `TokenExpiredError` vs otros. Considerar refresh tokens con rotación/revocación.
- **AuthZ por recurso**: siempre verificar propiedad (`id_anonimo` / dueño). Prohibido confiar solo en IDs de ruta.
- **OAuth/Apple**: validar tokens/JWKS, `iss`/`aud`/`exp`. Almacenar solo `apple_sub`. Nunca loggear tokens.
- **Sesiones**: limpiar tokens en 401/refresh fallido, revocar en logout/cambio de contraseña.
- **Biometría**: opcional/local, nunca como único factor crítico sin fallback controlado.

## 4) Base de datos / Supabase / RLS
- **RLS primero**: todas las tablas con datos sensibles deben tener RLS habilitado. Usar `auth.uid()`/`auth.jwt()` correctamente.
- **Políticas estrictas**: `USING` y `WITH CHECK` acotados al usuario/tenant. Evitar `true` sin justificación.
- **Funciones `security definer`**: revisar con extremo cuidado (bypass RLS). Preferir `security invoker`.
- **Migraciones**: revisar cambios de esquema/policies. Añadir tests si aplica.
- **Consultas**: usar parámetros/ORM, evitar SQL concatenado.

## 5) API (Express)
- **Headers**: considerar `helmet`. CORS restrictivo (orígenes explícitos).
- **Rate limiting**: en auth/reset/cambio de pwd.
- **Validación**: validar body/query/params (zod/joi). Rechazar temprano.
- **Errores**: mensajes genéricos al cliente, detalles solo en logs. Sin stack traces en prod.
- **Uploads**: tipo/tamaño/ubicación, nombres aleatorios, sin ejecución.
- **Logging**: sin PII/tokens/secrets.

## 6) Móvil (Expo/React Native)
- **SecureStore**: para tokens sensibles.
- **Deep links**: validar esquemas/orígenes.
- **WebView**: si se usa, con precaución.
- **Permisos**: mínimos, justificados.
- **Errores**: no mostrar trazas completas.

## 7) WordPress / Plugin
- **Capabilities**: `current_user_can` + nonces (`check_admin_referer`/`wp_verify_nonce`).
- **Sanitización/Escape**: `sanitize_text_field`, `esc_html`, `esc_url`, etc. Nunca `echo` directo de datos no escapados.
- **AJAX/REST**: permisos por endpoint, validar origen.
- **Opciones/DB**: usar APIs WP, prepared statements.

## 8) Dependencias
- **Revisar**: `npm audit`/`osv-scanner`. Bloquear vulnerabilidades **CRITICAL/HIGH** conocidas explotables si aplica.
- **Actualizar con criterio**: cambios mayores con revisión.

## 9) Información sensible (añadido)
- **Clasificación**: datos clínicos/salud mental = altamente sensibles. Tratar con máxima restricción.
- **Minimización**: recolectar solo lo necesario.
- **Anonimización**: mantener separación identidad-clínica. No loggear contenido clínico.
- **Compartición**: nunca compartir datos clínicos fuera de flujos autorizados.
- **Retención**: considerar borrado/anonimización. Al eliminar cuenta, seguir política (ver Apple revocación si aplica).
- **Logs**: filtrar PII. Usar `id_anonimo` para trazas.
- **Errores cliente**: sin filtrar datos sensibles.

### Teléfonos del plan de seguridad (kit de autocuidado, Feature 94)
- Los teléfonos de terceros del Paso 4 se cifran en el backend con AES-256-GCM (`Backend/src/utils/field-encryption.ts`) antes de guardarse en PostgreSQL; formato `enc:v1:<iv>:<tag>:<ciphertext>`. El contrato de la API no cambia (HTTPS, en claro).
- Requiere `SAFETY_PLAN_ENCRYPTION_KEY` (32 bytes, base64 o hex) aprovisionada en el servidor. Generar con `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Nunca en el repo.
- Fail-closed: sin clave válida, el guardado responde 500 genérico y no se persiste nada en claro; un dato que no se puede descifrar devuelve 500 genérico.
- Perder la clave implica perder los teléfonos guardados. No rotarla sin plan (rotación mínima: `SAFETY_PLAN_ENCRYPTION_KEY_PREVIOUS` solo descifra; no hay re-cifrado masivo).
- Valores legados en claro se leen tal cual y se cifran en el siguiente guardado; los backups anteriores pueden contener teléfonos en claro.
- Deuda M4: el SQLite local de la App NO está cifrado (no cubierto por este cambio).
- Nombre y textos de los pasos no se cifran en esta iteración (decisión de alcance: solo el teléfono, identificador directo de terceros).
- Paso 3 (desde la migración 028, 2026-10-30): pasa a texto libre (`paso3_actividades_texto`) y va en claro como los Pasos 1, 2, 6 y 7, aunque la persona escriba teléfonos. La columna JSONB antigua (`paso3_actividades_personas`, con teléfonos cifrados) se lee y se convierte a texto si la nueva está vacía, y se vacía en el siguiente guardado.

## Checklist rápido (para auditoría)
- [ ] Sin secretos en diff
- [ ] AuthZ verificado en rutas nuevas
- [ ] RLS revisado si toca DB/policies
- [ ] Validación/saneamiento presentes
- [ ] Errores seguros
- [ ] Sin logs con PII/secrets
- [ ] Dependencias sin CRITICAL explotable
- [ ] Cumple anonimato si toca datos clínicos
- [ ] Manejo seguro de archivos/uploads si aplica
- [ ] WordPress: nonce+capability si aplica
