# Plan: llevar a `main` el kit de autocuidado y las notificaciones (sin accesos)

> Fecha: 2026-11-06. Estado: **aprobado (release selectivo). Tareas 1 y 2 hechas sin commitear.**

## 0. Avance (2026-11-06)

- Decisión de la usuaria: solo kit y avisos; accesos se queda en `desarrollo`.
- `f7d252a` ya está en `main` del Backend como `7456cd6`: no hace falta decidir.
- Worktrees en `C:\Users\Ivan Villegas\Documents\GitHub\VittalMind-release\{Backend,App}`, rama
  `release/kit-notificaciones` desde `main`. Todo se aplicó con `cherry-pick --no-commit`: los
  cambios están en el índice, **sin commits**. `desarrollo` no se tocó.
- **Backend** (51 archivos): `a35631f`, `e037541`, `370a0df`, `d52a0a6`, `0306234`; de `a2fa702`
  solo gratitud, controlador de notificaciones y recuperación de contraseña (el dispatcher y
  psicoeducación quedan sin ese refactor porque estaba mezclado con accesos). Correcciones de lint de
  `auth-service`, `gratitude-service`, `profile-service` y `jwt` traídas de `desarrollo`;
  `prefer-const` a mano en `psychoeducation-service`. devDeps `eslint-plugin-sonarjs` y
  `typescript-eslint` (sin `qrcode`). Resultado: `npm run build` OK, `tsc` limpio, ESLint de `src`
  0 errores y 12 avisos, **271/271 tests**.
- **App** (61 archivos): `c880221`, `298018a`, `9fc9665` y los avisos de hoy. Lint de 8 archivos
  traído de `desarrollo` y 4 a mano (`app-navigator`, `professionals-screen`,
  `psychoeducation-home-screen`, `welcome-screen`). Resultado: `tsc` limpio, ESLint 0 errores y 18
  avisos, **444/444 tests**.
- **Hallazgo:** el salto a Expo SDK 58 de `desarrollo` vino dentro del commit de accesos (`bac6fab`).
  La rama de release sigue en **SDK 57**, como `main`, que es con lo que se hicieron el kit y las
  notificaciones. La build de EAS de este release sale con SDK 57.
- Pendiente de las tareas 1 y 2: la duplicación del gate, que se mide en la tarea 4.

### 2026-11-07
- La usuaria pidió subir `main` a **SDK 58** y la App a **0.4.0**.
  - `package.json` y el lockfile vienen de `desarrollo`, **sin `expo-camera`** (es del QR de canje).
  - `npx expo install --fix` alineó las versiones de parche; `expo-doctor` pasa 20/20.
  - Arreglo de tipos de SDK 58 en `psychoeducation-topic-screen.tsx` (`ListViewToken`), sin la parte
    de accesos.
  - `app.json`: versión 0.4.0, iOS `buildNumber` 14 y Android `versionCode` 13, sin permisos de cámara.
  - Resultado: `tsc` limpio, ESLint 0 errores, 444/444 tests; `npm audit --omit=dev` con 5 moderadas,
    igual que `desarrollo`.
- Claves generadas en `docs/secretos/produccion.local.md`. La carpeta está en `.gitignore` y
  excluida de gitleaks.
- Guía de credenciales push: `docs/credenciales-push.md`. Falta FCM (no hay `google-services.json`)
  y APNs. Las dos requieren las cuentas de la usuaria.
> Referencias: `docs/entornos-dev-produccion.md` §5 (procedimiento de release),
> `docs/quality-tools-docker.md` (gate), `AGENTS.md` §3 (gate completo antes de `main`).

## 1. Qué se sube y qué no

| Sube a `main` | Se queda en `desarrollo` |
|---|---|
| Notificaciones push reutilizables y recordatorio de gratitud | Sistema de accesos: planes, features, candados, gating de psicoeducación |
| Kit de autocuidado (7 pasos, cifrado de teléfonos, offline primero) | Códigos de canje, revocación, avisos de acceso (`access-expiry-resolver`) |
| Contactos de confianza en el modal de pánico | Categorías como módulos (109 a 112) |
| Advertencia de responsabilidad del kit y nota de la lista de profesionales (2026-11-06) | Plugins de WordPress (VM Accesos, Psicoeducación) |
| ESLint, sonarjs y Sonar (los pide el gate de release) | |

## 2. Hallazgos que definen la estrategia

`desarrollo` mezcla las tres cosas en el tiempo. No se puede mergear la rama entera sin llevar accesos.

**Backend** (`main` = `7456cd6`, `main..desarrollo` = 12 commits):

| Commit | Contenido | ¿Sube? |
|---|---|---|
| `a35631f` | notificaciones (migraciones 024 y 025) | Sí, se aplica sin conflictos |
| `f7d252a` | arreglo de psicoeducación (lecturas admin, errores de Postgres) | **Decidir** (no es kit ni notificaciones, pero es un arreglo suelto) |
| `308354f` | merge de `main` en `desarrollo` | No aplica |
| `c49e5bf`, `7a1b897`, `c63f607` | accesos (026) | No |
| `e037541` | kit (027 y 028, `field-encryption`) | Sí. Solo choca en `app.ts`, `models/index.ts` y `routes/index.ts` (líneas de accesos) |
| `0306234` | ESLint y Sonar | Sí, pero toca archivos de accesos: hay que adaptarlo |
| `dbcee60` | accesos (029 a 034), incluye `access-expiry-resolver` en notificaciones | No |
| `370a0df` | Dockerfile con usuario `node` | Sí |
| `a2fa702` | consultas sin interpolar y refactor de `processJob` del dispatcher | Solo la parte de notificaciones |
| `d52a0a6` | `.env.docker` fuera de git | Sí |

- Las rutas del kit (`/safety-plan`) solo usan `authMiddleware`: no dependen de `requireFeature`.
- `migrate.ts` registra por nombre de archivo, no por número. En producción corren 024, 025, 027 y 028
  ahora, y 026 más adelante con accesos; el hueco no rompe nada porque 026 no depende de 027 ni 028.
  **Comprobar** en la tarea 3 que 026 y 029+ no asumen que 027 ya existía en un orden distinto.

**App** (`main` = `a91d041`, versión 0.3.1; `desarrollo` en 0.3.2, `main..desarrollo` = 7 commits):

| Commit | Contenido | ¿Sube? |
|---|---|---|
| `c880221` | ajustes y registro de notificaciones push (`expo-notifications`, `app.json`) | Sí |
| `30fcada`, `b686794` | base de accesos | No |
| `298018a` | kit y contactos de confianza en el modal de pánico | Sí. No usa nada de accesos; solo choca en `App.tsx`, `hooks/index.ts` y `types/index.ts` |
| `9fc9665` | ESLint y Sonar | Sí, adaptado |
| `bac6fab` | accesos (también toca `sync-manager`, `notification-service` y la pantalla de ajustes) | No |
| `bae18bd` | falso positivo de gitleaks en la clave de canje | No (la clave es de accesos) |

- Sin commitear en `App/`: features 107 y 108 (accesos) y los dos avisos de hoy. Los avisos se
  separan en su propio commit, que también sube.

## 3. Estrategia propuesta

Rama `release/kit-notificaciones` **desde `main`** en Backend y App, con cherry-pick de los commits
marcados "Sí" (y adaptación de los que tocan accesos). Gate completo sobre esa rama, merge a `main`
y después `main` de vuelta a `desarrollo`.

- **Por qué no mergear `desarrollo` entero:** subiría accesos sin la revisión de fase pendiente
  (la 99, textos de avisos) ni la configuración de producción (cron de vencimientos, SMTP).
- **Costo:** cherry-picks con conflictos chicos en los archivos de registro (`app.ts`,
  `routes/index.ts`, `models/index.ts`, `App.tsx`) y el commit de calidad hay que rehacerlo sin los
  archivos de accesos. Al volver `main` a `desarrollo` puede haber conflictos triviales en esos
  mismos archivos.
- **Alternativa** si se prefiere simplicidad: subir todo `desarrollo` (accesos incluido). Más fácil
  de mergear, pero exige cerrar antes todos los pendientes de producción de accesos.

## 4. Tareas

Las tareas que incluyen commits, push o despliegue las autoriza la usuaria una por una
(`CLAUDE.md`: no se commitea sin pedido).

### Tarea 0. Bloqueantes previos (usuaria)
1. Rotar la clave de OpenRouter filtrada en `Backend/.env.docker` (está en el historial de GitHub
   desde `778b384`). Sin esto, gitleaks bloquea el gate.
2. Confirmar si `f7d252a` (arreglo de psicoeducación) entra en este release.
3. Commitear lo que está sin commitear en `desarrollo`, separado por tema (accesos 107 y 108,
   plugins 1.3.2 y 1.0.14, y los avisos del kit y de profesionales en un commit propio).

### Tarea 1. Rama de release del Backend
1. `git switch -c release/kit-notificaciones main`.
2. Cherry-pick `a35631f`, `e037541`, `370a0df`, `d52a0a6`; resolver los registros quitando las
   líneas de accesos.
3. Rehacer la parte de `0306234` y `a2fa702` que toca archivos que existen en esta rama
   (configuración de ESLint, `sonar-project.properties`, dispatcher, `jwt.ts`, etc.).
4. Quitar de `notification-resolvers/index.ts` y de los templates cualquier referencia a avisos de
   acceso.
5. `npm run build`, `npm test`. Revisar que los tests de notificaciones y kit no importan módulos de
   accesos.

### Tarea 2. Rama de release de la App
1. `git switch -c release/kit-notificaciones main`.
2. Cherry-pick `c880221`, `298018a` y el commit de los avisos; resolver `App.tsx` sin
   `AccessProvider`.
3. Rehacer `9fc9665` sin archivos de accesos.
4. Revisar `profile-screen.tsx`: en `main` no debe quedar la tarjeta de plan ni el canje.
5. Subir versión a 0.3.2 (o la que se decida) en `app.json` y `package.json`.
6. `npx tsc --noEmit`, `npm test`.

### Tarea 3. Base de datos de producción (usuaria, con apoyo)
1. Respaldo de Supabase.
2. Revisar 024, 025, 027 y 028 contra el esquema de producción.
3. Aplicar con el `.env.production` y **nunca** con el `.env` local (ver
   `entornos-dev-produccion.md` §3.2).

### Tarea 4. Gate completo
1. `.\scripts\quality-release.ps1` sin `-Skip*`, sobre las ramas de release (working tree limpio).
2. `security-auditor` y `sonar-verifier` sobre `main..release/kit-notificaciones` en los dos repos.
3. Corregir en la rama de release hasta PASS; queda `quality-reports/release-pass.json`.

### Tarea 5. Configuración de producción (usuaria)
- Hostinger: `SAFETY_PLAN_ENCRYPTION_KEY` (distinta a la de desarrollo y guardada en el gestor de
  secretos), `INTERNAL_NOTIFICATION_TOKEN`, variables de push de `.env.example`.
- Cron del tick de notificaciones contra el endpoint interno.
- Credenciales de FCM (Android) y APNs (iOS) en EAS.

### Tarea 6. Merge y despliegue (orden: Backend → Hostinger → App → EAS → tiendas)
1. Merge de `release/kit-notificaciones` en `main` del Backend, push (pasa el hook `pre-push`).
2. Desplegar en Hostinger y verificar: `GET /safety-plan` con sesión, `PUT` con teléfono cifrado,
   registro de token push, envío de prueba del recordatorio de gratitud.
3. Merge en `main` de la App, build de EAS (la App necesita build nueva por `expo-notifications`).
4. Prueba en teléfono: permisos de avisos, recordatorio, kit sin conexión y sincronización, contactos
   de confianza en el modal de pánico, avisos nuevos del kit y de profesionales.
5. `main` de vuelta a `desarrollo` en los dos repos.

### Tarea 7. Cierre
- Raíz: actualizar `progress/history.md` y `docs/entornos-dev-produccion.md` (variables nuevas).

## 5. Decisiones abiertas
1. ¿Release selectivo (este plan) o todo `desarrollo` con accesos?
2. ¿Entra `f7d252a` (arreglo de psicoeducación)?
3. Versión de la App para este release.
4. ¿Quién rota la clave de OpenRouter y cuándo?
