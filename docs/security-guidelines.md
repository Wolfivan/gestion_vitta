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
