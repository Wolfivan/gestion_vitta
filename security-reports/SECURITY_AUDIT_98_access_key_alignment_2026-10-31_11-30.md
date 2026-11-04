# SECURITY AUDIT - 98 access_key_alignment

## Resumen
- Archivos revisados: Backend `src/routes/access.ts`, `src/controllers/access-controller.ts`, `src/services/access-service.ts` (`getDefaultAccess`), `src/services/access-repository.ts` (`findDefaultPlan`, `PLAN_COLUMNS`); App `src/constants/access-keys.ts`, `src/context/access-context.tsx`, `src/services/access-service.ts`, `src/services/access-storage.ts`, `src/components/access/*`, `src/screens/access-request-screen.tsx`, tests nuevos.
- Escaneo automatico: gitleaks 8.28.0 con `.gitleaks.toml` (1 hallazgo, ajeno a la 98); semgrep con reglas JS/TS/PHP, severidad ERROR (0 tras marcar 2 falsos positivos).
- Hallazgos de la 98: CRITICAL 0 / HIGH 0 / MEDIUM 0 / LOW 2 / INFO 2. Fuera de alcance: 1 HIGH preexistente.

## Hallazgos

### [HIGH, preexistente, fuera de la 98] Clave real de OpenRouter versionada
- Archivo: `Backend/.env.docker:23` (versionado y publicado en `origin/main` y `origin/desarrollo`).
- Impacto: quien tenga acceso al repositorio puede usar la clave y consumir cupo.
- Recomendacion: revocar la clave en OpenRouter, vaciar el valor en el archivo versionado y cargarla desde un archivo local ignorado. Bloquea el gate de release (`main`), no el `done` de la 98.

### [LOW] `GET /access/default` publico sin limitador
- Archivo: `Backend/src/routes/access.ts:12`.
- Descripcion: endpoint sin auth y sin rate limit. Devuelve solo catalogo (codigo, nombre, descripcion, CTA, beneficios, features del plan default); sin datos de cuentas.
- Recomendacion: aplicar el limitador general cuando se agregue `express-rate-limit` (feature 102).

### [LOW] Reportes de ESLint sueltos con rutas locales
- Archivos: `App/eslint-report.json`, `Backend/eslint-report.json` (sin versionar).
- Descripcion: incluyen rutas absolutas de Windows con el nombre del usuario del equipo.
- Accion tomada: agregados a `.gitignore` de App y Backend para que no se commiteen.

### [INFO] Sin datos de acceso no se pintan candados
- `isFeatureLocked` devuelve libre si `access` es null. Correcto: la autorizacion real esta en el servidor (psicoeducacion ya filtra; las rutas de herramientas se protegen en la 99).

### [INFO] Cerrar sesion purga descargas si la cuenta tenia mas features que el plan default
- Al pasar de cuenta a invitado `hasLostFeatures` es true. Comportamiento conservador, coherente con privacidad.

## Checklist
- [x] Sin secretos introducidos por la 98
- [x] AuthZ correcto (`/access` sigue con `authMiddleware`; `/access/default` no expone cuentas)
- [x] RLS: sin cambios de esquema
- [x] Validacion/saneamiento: sin entradas nuevas
- [x] Errores seguros / sin PII (`ACCESS_NOT_CONFIGURED` sin detalle interno)
- [x] WP: sin cambios en la 98
- [x] InfoSec: cache del invitado separada de la de cuenta

## Veredicto
OK (con notas). El HIGH de `.env.docker` es previo a la 98 y queda pendiente para antes de `main`.
