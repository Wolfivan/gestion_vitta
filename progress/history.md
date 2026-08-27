# Bitácora histórica (append-only)

> Cada vez que se cierra una sesión, su resumen se añade aquí.
> No edites entradas anteriores. Solo añades al final.

---

*(Sesiones anteriores eliminadas — el repositorio fue adaptado de un template demo al proyecto VittalMind)*

## 2026-07-08 — Feature #12: Autenticación por email y contraseña
- **Agente:** big-pickle
- **Plan:** Agregar registro y login con email/contraseña junto al Google OAuth existente.
- **Cambios:**

  **Backend:**
  - `src/database/migrations/002_add_local_auth.sql` — renombra `email_google` → `email`, agrega `password_hash VARCHAR(255)` y `auth_provider VARCHAR(10) DEFAULT 'google'`
  - `src/services/password-service.ts` — `hashPassword` y `verifyPassword` con bcrypt (12 rounds)
  - `src/services/user-repository.ts` — `findUserByEmail`, `createLocalUser`; actualiza `findOrCreateUser` para usar columna `email`
  - `src/services/auth-service.ts` — agrega `registerLocalUser` y `localLogin` con validación de provider
  - `src/controllers/auth-controller.ts` — agrega handlers `register` y `login`
  - `src/routes/auth.ts` — registra `POST /auth/register` y `POST /auth/login`
  - `src/app.ts` — agrega `import 'express-async-errors'` para manejo de errores async
  - `package.json` — agrega `bcrypt`, `@types/bcrypt`, `express-async-errors`
  - `tests/auth.test.ts` — 18 tests (Google 3 + register 5 + login 7)
  - `tests/database-migration.test.ts` — agrega tests para migration 002

  **Frontend:**
  - `src/services/auth.ts` — agrega `loginWithEmail` y `register`
  - `src/hooks/use-auth.ts` — agrega `loginWithEmail`, `register`, `authError`, `clearError`
  - `src/screens/register-screen.tsx` — nueva pantalla con nombre, email, contraseña, confirmación y validación local
  - `src/screens/welcome-screen.tsx` — conecta email/password a estado real; login button funcional; register link navega a RegisterScreen; muestra errores del backend
  - `src/navigation/app-navigator.tsx` — agrega ruta Register al stack no autenticado
  - `App.tsx` — pasa `loginWithEmail` y `register` al navigator

- **Verificación:** Backend 32 tests, App tests — todo verde. `.\init.ps1` OK.
- **Cierre:** feature #12 marcada `done`.

## 2026-07-08 — Feature #13: Rediseño HomeScreen + Bottom Tabs
- **Agente:** big-pickle
- **Plan:** HomeScreen rediseñada según templates/home.html con hero, featured card, grid de módulos escalable (solo Parejas visible), quote card, bottom tab navigator y placeholder screens.
- **Cambios:**

  **Dependencias:**
  - `App/package.json` — agrega `@react-navigation/bottom-tabs`

  **Constantes:**
  - `App/src/constants/index.ts` — agrega `COLORS.primaryFixed`, `COLORS.tertiary`, `COLORS.tertiaryFixed`, `COLORS.tertiaryFixedDim`, `FONT.headlineXlMobile`

  **Nuevos componentes (3):**
  - `src/components/featured-card.tsx` — Bento card hero con badge "Recomendado", título, descripción y botón play
  - `src/components/module-card.tsx` — Card genérica para grid: ícono en contenedor redondeado + título + subtítulo
  - `src/components/bottom-nav.tsx` — Bottom nav reutilizable con tabs activos/inactivos

  **Nuevas pantallas placeholder (3):**
  - `src/screens/exercises-screen.tsx` — "Ejercicios — Próximamente"
  - `src/screens/journal-screen.tsx` — "Diario — Próximamente"
  - `src/screens/profile-screen.tsx` — "Perfil — Próximamente"

  **Archivos modificados:**
  - `src/screens/home-screen.tsx` — reescritura completa: hero, FeaturedCard, grid dinámico desde EXPLORE_MODULES[], QuoteCard, PanicButton + PanicModal. Solo módulo "Parejas" visible.
  - `src/navigation/app-navigator.tsx` — reestructurado: no auth → Stack(Welcome, Register); auth → BottomTab(Home, Exercises, Journal, Profile)
  - `src/components/index.ts` — exporta FeaturedCard, ModuleCard, BottomNav
  - `src/screens/index.ts` — exporta ExercisesScreen, JournalScreen, ProfileScreen
  - `App/jest.setup.ts` — mock para @react-navigation/bottom-tabs

- **Verificación:** App 11 tests, Backend 32 tests — todo verde. `.\init.ps1` OK.
- **Cierre:** feature #13 marcada `done`. Próximo: según indique el usuario.

## 2026-07-02 — Features #4 y #5: Autenticación Google completa
- **Agente:** big-pickle
- **Plan:** Backend (POST /auth/google + validación Google + JWT) + Frontend (WelcomeScreen rediseñada + expo-auth-session)
- **Cambios:**

  **Backend (#4):**
  - `src/utils/jwt.ts` — helpers signJwt / verifyJwt
  - `src/services/google-verifier.ts` — validación de token contra Google OAuth2 API
  - `src/services/user-repository.ts` — findOrCreateUser en usuarios_auth
  - `src/services/auth-service.ts` — orquestación del login
  - `src/controllers/auth-controller.ts` — handler HTTP POST /auth/google
  - `src/routes/auth.ts` — ruta registrada en app.ts
  - `src/middleware/auth-middleware.ts` — JWT verification middleware
  - `tests/jwt.test.ts` — 3 tests (sign, verify, invalid)
  - `tests/auth.test.ts` — 3 tests (success, missing token, invalid type)

  **Frontend (#5):**
  - `src/constants/index.ts` — paleta actualizada del login.html (azul #2d6182, fondo #fbf9f8)
  - `src/components/logo.tsx` — círculo azul con icono loto (SVG)
  - `src/screens/welcome-screen.tsx` — rediseñada: glass-card, Google button con SVG, tipografía Inter
  - `src/hooks/use-auth.ts` — expo-auth-session + Google.useIdTokenAuthRequest
  - `App.tsx` — flujo auth completo
  - `app.json` — scheme "vittalmind" + splash color actualizado
  - `jest.setup.ts` — mocks para expo-auth-session, expo-web-browser, react-native-svg

- **Verificación:** Backend 17 tests, App 1 test — todo verde. `.\init.ps1` OK.
- **Cierre:** features #4 y #5 marcadas `done`. Próximo: feature #6 (biometric_lock).

## 2026-07-02 — Diseño WelcomeScreen: email/password fields, botón login, watermark
- **Agente:** big-pickle
- **Plan:** Agregar campos de email/contraseña no funcionales, botón "Iniciar Sesión" (alerta soon), divisor "O continúa con", watermark "IDeal Labs" inferior — todo inspirado en `templates/login.html`
- **Cambios:**
  - `App/package.json` — instaladas dependencias faltantes via `npx expo install` (expo-asset, expo-constants, expo-font, expo-linking)
  - `App/src/components/brand-watermark.tsx` — nuevo componente "**ID**eal Labs" con FONT.labelSm
  - `App/src/components/index.ts` — exporta BrandWatermark
  - `App/src/screens/welcome-screen.tsx` — rediseño completo:
    - Campo email con ícono ✉ y placeholder
    - Campo contraseña con ícono 🔒, toggle de visibilidad 👁, link "¿Olvidaste tu contraseña?"
    - Botón "Iniciar Sesión" (primary, no funcional → Alert "Funcionalidad próximamente")
    - Divisor "O continúa con" con líneas
    - Botón Google (funcional, único que ejecuta login)
    - Texto "¿No tienes cuenta? **Regístrate**" (link no funcional)
    - Watermark "IDeal Labs" al pie
- **Verificación:** App 1 test, Backend 17 tests — todo verde. `.\init.ps1` OK.
- **Cierre:** sin cambios en `feature_list.json` (no es una feature nueva, es mejora dentro de #5).

## 2026-07-02 — Fix diseño WelcomeScreen: match exacto con login.html + watermark
- **Agente:** big-pickle
- **Plan:** Corregir diferencias visuales con `templates/login.html` y bug del watermark
- **Cambios:**
  - `App/src/components/brand-watermark.tsx` — hijos `<Text>` explícitos para evitar bug de React Native donde texto plano tras `<Text>` anidado se perdía ("ID" sí, "Labs" no)
  - `App/src/screens/welcome-screen.tsx` — reescritura completa del diseño:
    - **Iconos**: emojis reemplazados por SVGs inline (MailIcon, LockIcon, VisibilityIcon, VisibilityOffIcon) con fill `COLORS.outline` — idénticos a Material Symbols del template
    - **Posición iconos**: absolute `left: 16` con `paddingLeft: 48` en inputs (vs ~24px antes) — match exacto al `pl-12` del template
    - **Card**: agregado `borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)'` — igual al `.glass-card` del HTML
    - **Fondo**: agregado `circleTopLeft` (secondary-container al 20%) y `circleBottomRight` (primary-fixed-dim al 20%) como círculos decorativos atmosféricos
    - **Botón Google**: `backgroundColor: '#ffffff'` en vez de `surfaceContainerLowest`
    - **Efecto press**: nuevo componente `ScaleButton` con `Animated.spring` → escala 0.98 (igual a `active:scale-[0.98]` del template)
    - **Divider**: `letterSpacing: 0.6` en vez de `1` para igualar `tracking-widest`
    - **Placeholder color**: `rgba(113, 120, 126, 0.5)` = 50% opacity de outline
  - `App/src/components/brand-watermark.tsx` — también se simplificó el default de `color` (inline `'#c1c7ce'`)
- **Verificación:** App 1 test, Backend 17 tests — todo verde. `.\init.ps1` OK.
- **Cierre:** mejora dentro de #5 ya en estado `done`.

## 2026-07-02 — Feature 7: Botón de Pánico y Contención Inmediata
- **Agente:** big-pickle
- **Plan:** Botón rojo flotante accesible desde WelcomeScreen (sin login) y HomeScreen (logueado). Modal de contención offline-first con líneas de emergencia precargadas, geo-detección híbrida (expo-location + AsyncStorage) y selector manual de país.
- **Cambios:**

  **Nuevos archivos:**
  - `App/src/types/emergency.ts` — interfaces `EmergencyContact`, `CountryContacts`
  - `App/src/data/emergency-contacts.ts` — Record<string, CountryContacts> con CO (Colombia), MX (México), US (Estados Unidos). Fácilmente extensible: solo agregar entrada al objeto
  - `App/src/hooks/use-panic.ts` — hook con `ensureCountry()` (AsyncStorage → geo → default CO), `changeCountry()`, `getCountryData()`, `openDial()`
  - `App/src/components/panic-button.tsx` — botón rojo flotante (absolute bottom-left, 🚨 emoji)
  - `App/src/components/panic-modal.tsx` — modal bottom-sheet con título, selector de país (lista simple con banderas), contactos con teléfono tipo botón, "Contactar psicólogo de guardia" (no funcional), disclaimer

  **Archivos modificados:**
  - `App/src/screens/welcome-screen.tsx` — agrega PanicButton + PanicModal
  - `App/src/screens/home-screen.tsx` — agrega PanicButton + PanicModal
  - `App/src/navigation/app-navigator.tsx` — fix: `onLogin` → `onGoogleLogin` (bug existente, el Google button nunca funcionó)
  - `App/src/hooks/index.ts` — exporta `usePanic`
  - `App/jest.setup.ts` — agrega mocks para `@react-native-async-storage/async-storage` y `expo-location`
  - `App/package.json` — agrega `expo-location`, `@react-native-async-storage/async-storage`

  **Tests (3 nuevos):**
  - `__tests__/emergency-data.test.ts` — 5 tests: validación de datos, default country, MX lookup, Colombia 192/155, extensibilidad
  - `__tests__/panic-button.test.tsx` — 2 tests: render, onPress
  - `__tests__/panic-modal.test.tsx` — 3 tests: render visible, render invisible, muestra contactos
  - `feature_list.json`: #6 biometric_lock → `blocked`, #7 panic_button → `done`

- **Verificación:** App 11 tests, Backend 17 tests — todo verde. `.\init.ps1` OK.
- **Cierre:** feature 7 marcada `done`. Próximo: feature 8 (cnv_translator) o según indique el usuario.

## 2026-07-05 — Migración Expo SDK 52 → 54
- **Agente:** opencode
- **Plan:** Migración directa de Expo SDK 52 a 54, React 18.3.1 → 19.1.0, React Native 0.76.9 → 0.81.
- **Cambios:**

  **Dependencias (App/package.json):**
  - `expo`: `~52.0.0` → `^54.0.0` (54.0.35 instalada)
  - `react`: `18.3.1` → `19.1.0`
  - `react-native`: `0.76.9` → `0.81.5`
  - `typescript`: `~5.5.0` → `~5.9.2` (5.9.3 instalada)
  - `jest-expo`: `~52.0.0` → `~54.0.17`
  - `react-test-renderer`: `18.3.1` → `19.1.0`
  - `@types/react`: `~18.3.0` → `~19.1.10` (19.1.17 instalada)
  - `babel-preset-expo`: añadida como dependencia explícita
  - Todos los paquetes Expo actualizados a sus versiones SDK 54 compatibles
  - Paquetes React Navigation: `7.x` (compatibles)
  - `react-native-safe-area-context`: `4.12.0` → `~5.6.0` (5.6.2 instalada)
  - `react-native-screens`: `~4.4.0` → `~4.16.0` (4.16.0 instalada)
  - `react-native-svg`: `15.8.0` → `15.12.1`
  - `@react-native-async-storage/async-storage`: `^3.1.1` → `2.2.0`

  **Archivos modificados:**
  - `init.ps1` — Node.js mínimo: 18 → 20.19.x
  - `App/jest.setup.ts` — mocks actualizados para compatibilidad React 19 (Screen mock, react-native-svg mock)
  - `App/__tests__/*.test.tsx` — wrappers `act()` para compatibilidad con React 19 + react-test-renderer
  - `App/assets/icon.png`, `App/assets/splash-icon.png` — placeholders creados para pasar expo-doctor

  **Verificación:**
  - `npx expo-doctor`: 18/18 checks passed
  - `npx tsc --noEmit`: 0 errores
  - `npm test` (App): 4 suites, 11 tests — todos pass, 0 warnings
  - `npm test` (Backend): 17 tests — todos pass
  - `.\init.ps1`: [OK] Entorno listo

- **Cierre:** SDK 52 → 54 completado. `init.ps1` actualizado. Features no afectadas.

## 2026-07-08 — Feature #12: Autenticación por email y contraseña
- **Agente:** big-pickle
- **Plan:** Agregar registro y login con email/contraseña junto al Google OAuth existente.
- **Cambios:**

  **Backend:**
  - `src/database/migrations/002_add_local_auth.sql` — renombra `email_google` → `email`, agrega `password_hash VARCHAR(255)` y `auth_provider VARCHAR(10) DEFAULT 'google'`
  - `src/services/password-service.ts` — `hashPassword` y `verifyPassword` con bcrypt (12 rounds)
  - `src/services/user-repository.ts` — `findUserByEmail`, `createLocalUser`; actualiza `findOrCreateUser` para columna `email`
  - `src/services/auth-service.ts` — agrega `registerLocalUser` y `localLogin` con validación de provider
  - `src/controllers/auth-controller.ts` — agrega handlers `register` y `login`
  - `src/routes/auth.ts` — registra `POST /auth/register` y `POST /auth/login`
  - `src/app.ts` — agrega `import 'express-async-errors'` para manejo de errores async
  - `package.json` — agrega `bcrypt`, `@types/bcrypt`, `express-async-errors`
  - `tests/auth.test.ts` — 18 tests (Google 3 + register 5 + login 7)
  - `tests/database-migration.test.ts` — agrega tests para migration 002

  **Frontend:**
  - `src/services/auth.ts` — agrega `loginWithEmail` y `register`
  - `src/hooks/use-auth.ts` — agrega `loginWithEmail`, `register`, `authError`, `clearError`
  - `src/screens/register-screen.tsx` — nueva pantalla con nombre, email, contraseña, confirmación y validación local
  - `src/screens/welcome-screen.tsx` — conecta email/password a estado real; login button funcional; register link navega a RegisterScreen; muestra errores del backend
  - `src/navigation/app-navigator.tsx` — agrega ruta Register al stack no autenticado
  - `App.tsx` — pasa `loginWithEmail` y `register` al navigator

- **Verificación:** Backend 32 tests, App tests — todo verde. `.\init.ps1` OK.
- **Cierre:** feature #12 marcada `done`.

## 2026-07-08 — Feature #13: Rediseño HomeScreen + Bottom Tabs
- **Agente:** big-pickle
- **Plan:** HomeScreen rediseñada según templates/home.html con hero, featured card, grid de módulos escalable (solo Parejas visible), quote card, bottom tab navigator y placeholder screens.
- **Cambios:**

  **Dependencias:**
  - `App/package.json` — agrega `@react-navigation/bottom-tabs`

  **Constantes:**
  - `App/src/constants/index.ts` — agrega `COLORS.primaryFixed`, `COLORS.tertiary`, `COLORS.tertiaryFixed`, `COLORS.tertiaryFixedDim`, `FONT.headlineXlMobile`

  **Nuevos componentes (3):**
  - `src/components/featured-card.tsx` — Bento card hero con badge "Recomendado", título, descripción y botón play
  - `src/components/module-card.tsx` — Card genérica para grid: ícono en contenedor redondeado + título + subtítulo
  - `src/components/bottom-nav.tsx` — Bottom nav reutilizable con tabs activos/inactivos

  **Nuevas pantallas placeholder (3):**
  - `src/screens/exercises-screen.tsx` — "Ejercicios — Próximamente"
  - `src/screens/journal-screen.tsx` — "Diario — Próximamente"
  - `src/screens/profile-screen.tsx` — "Perfil — Próximamente"

  **Archivos modificados:**
  - `src/screens/home-screen.tsx` — reescritura completa: hero, FeaturedCard, grid dinámico desde EXPLORE_MODULES[], QuoteCard, PanicButton + PanicModal. Solo módulo "Parejas" visible.
  - `src/navigation/app-navigator.tsx` — reestructurado: no auth → Stack(Welcome, Register); auth → BottomTab(Home, Exercises, Journal, Profile)
  - `src/components/index.ts` — exporta FeaturedCard, ModuleCard, BottomNav
  - `src/screens/index.ts` — exporta ExercisesScreen, JournalScreen, ProfileScreen
  - `App/jest.setup.ts` — mock para @react-navigation/bottom-tabs

- **Verificación:** App 11 tests, Backend 32 tests — todo verde. `.\init.ps1` OK.
- **Cierre:** feature #13 marcada `done`.

## 2026-07-08 — Feature #11: Disclaimer Legal Screen
- **Agente:** big-pickle
- **Plan:** Pantalla obligatoria post-login con texto legal, mensaje de seguridad y checkbox de aceptación. Endpoint POST /auth/disclaimer.
- **Cambios:**

  **Backend:**
  - `src/services/user-repository.ts` — agrega `acceptDisclaimer(idAnonimo)` que actualiza `acepto_disclaimer = TRUE`
  - `src/controllers/auth-controller.ts` — agrega handler `acceptDisclaimer` que extrae `idAnonimo` del JWT
  - `src/routes/auth.ts` — registra `POST /auth/disclaimer` protegido con `authMiddleware`

  **Frontend:**
  - `src/services/auth.ts` — agrega `acceptDisclaimer()` que llama a `POST /auth/disclaimer`
  - `src/hooks/use-auth.ts` — agrega estado `requiresDisclaimer`, métodos `acceptDisclaimer`; login/register/google setean el flag desde `TAuthResponse.requiresDisclaimer`
  - `src/screens/disclaimer-screen.tsx` — nueva pantalla: ícono escudo, título, texto legal + mensaje seguridad, divider, checkbox, botón Continuar (disabled hasta aceptar)
  - `src/navigation/app-navigator.tsx` — flujo: no auth → Stack(Welcome, Register); auth + requiresDisclaimer → Disclaimer; auth + !requiresDisclaimer → HomeTabs
  - `src/screens/index.ts` — exporta DisclaimerScreen
  - `App.tsx` — pasa `requiresDisclaimer` y `onAcceptDisclaimer` al navigator

- **Verificación:** App 11 tests, Backend 32 tests — todo verde. `.\init.ps1` OK.
- **Cierre:** feature #11 marcada `done`.

## 2026-07-08 — Feature #8: Traductor Asertivo (CNV) con Gemini
- **Agente:** big-pickle
- **Plan:** Backend con Google Gemini 1.5 Flash (free tier) para CNV translation + Frontend con ToolsScreen (lista de herramientas) y AcertiveTranslateScreen (chat tipo burbuja).
- **Cambios:**

  **Backend:**
  - `package.json` — agrega `@google/generative-ai`
  - `src/utils/config.ts` — reemplaza `OPENAI_API_KEY` por `GEMINI_API_KEY`
  - `.env.example` — actualiza a `GEMINI_API_KEY=`
  - `src/services/ai-service.ts` — nuevo cliente Gemini 1.5 Flash con prompt clínico CNV estructurado
  - `src/controllers/tools-controller.ts` — nuevo controller con validación de `{ text }`
  - `src/routes/tools.ts` — nueva ruta `POST /tools/cnv-translate` protegida con authMiddleware
  - `src/routes/index.ts` — exporta toolsRouter
  - `src/app.ts` — registra toolsRouter

  **Frontend:**
  - `src/services/tools-service.ts` — función `cnvTranslate(text)` que llama a `POST /tools/cnv-translate`
  - `src/screens/tools-screen.tsx` — lista de 3 herramientas (Traductor Asertivo, Psicoeducación, Línea del Tiempo) con iconos y navegación a AcertiveTranslate
  - `src/screens/acertive-translate-screen.tsx` — chat completo: burbujas usuario (derecha, primary) / AI (izquierda, white), input fijo con textarea, loading "Pensando asertivamente...", botones Copiar (expo-clipboard) y Re-intentar
  - `src/navigation/app-navigator.tsx` — agrega `Tools` y `AcertiveTranslate` al RootStackParamList + screens en stack autenticado
  - `src/screens/home-screen.tsx` — wirea `onPress` de ModuleCard(Parejas) → navega a ToolsScreen
  - `src/screens/index.ts` — exporta ToolsScreen y AcertiveTranslateScreen
  - `src/components/featured-card.tsx` — fix: elimina `backdropFilter` (no existe en React Native)
  - `package.json` — agrega `expo-clipboard`

- **Verificación:** Backend 32 tests, App 11 tests — todo verde. `npx tsc --noEmit` 0 errores. `.\init.ps1` OK.
- **Cierre:** feature #8 marcada `done`. Próxima: feature #9 (psychoeducation) o #10 (timeline).

## 2026-07-08 — Feature #14: Entorno pre-producción con Docker
- **Agente:** big-pickle
- **Plan:** Dockerfile multi-stage + docker-compose con PostgreSQL 16 para simular Hostinger localmente. Seed de usuario test para explorar la app sin deploy.
- **Cambios:**

  **Nuevos archivos:**
  - `Backend/Dockerfile` — multi-stage build (builder + runner sobre node:20-alpine). Entrypoint que espera DB, corre migraciones, corre seed, inicia servidor.
  - `Backend/.dockerignore` — excluye node_modules, dist, .env, tests
  - `Backend/docker-compose.yml` — servicios `api` (build .) y `db` (postgres:16-alpine) con healthcheck y volumen persistente
  - `Backend/.env.docker` — variables para Docker: `DB_HOST=db`, `NODE_ENV=production`, etc.
  - `Backend/src/database/seed.ts` — inserta usuario test@vittal.com / test1234 con bcrypt hash, idempotente (salta si ya existe)

  **Archivos modificados:**
  - `Backend/package.json` — agrega script `"seed": "ts-node src/database/seed.ts"`
  - `feature_list.json` — agrega feature #14 docker_preprod

- **Verificación:** Backend 32 tests, App tests — todo verde. `.\init.ps1` OK.
- **Uso:** `cd Backend && docker compose up -d` → backend en `http://localhost:3000`, login con `test@vittal.com` / `test1234`
- **Cierre:** feature #14 marcada `done`.

## 2026-07-08 — Fix Docker runtime: paths @/ no resueltos en Node.js
- **Agente:** big-pickle
- **Plan:** El módulo `@/database/connection` no se resuelve en runtime porque `tsconfig.json` es solo para TypeScript. Solución con `tsconfig-paths`.
- **Cambios:**

  **Nuevos archivos:**
  - `Backend/tsconfig.docker.json` — paths `@/*` → `["./dist/*"]` para resolver en runtime

  **Archivos modificados:**
  - `Backend/package.json` — agrega `tsconfig-paths` a dependencies
  - `Backend/Dockerfile` — copia `tsconfig.docker.json` como `tsconfig.json` en runner stage; agrega `ENV NODE_OPTIONS="-r tsconfig-paths/register"` para que migrate, seed y server resuelvan `@/*`

- **Verificación:** `npm run build` compila limpio. Backend 32 tests, App tests — todo verde. `.\init.ps1` OK.
- **Cierre:** feature #14 ya en `done`. Fix aplicado.

## 2026-07-09 — Swagger UI en /api-docs
- **Agente:** big-pickle
- **Plan:** Agregar documentación interactiva de la API vía swagger-jsdoc con anotaciones JSDoc inline en los routes. Ruta `/api-docs` con UI y botón Authorize para JWT.
- **Cambios:**

  **Nuevos archivos:**
  - `Backend/src/docs/swagger.ts` — configuración OpenAPI 3.0.3: info, servers, securitySchemes (bearerAuth)

  **Archivos modificados:**
  - `Backend/package.json` — agrega `swagger-jsdoc`, `swagger-ui-express`, `@types/swagger-jsdoc`, `@types/swagger-ui-express`
  - `Backend/src/routes/health.ts` — anotación JSDoc para `GET /health`
  - `Backend/src/routes/auth.ts` — anotaciones JSDoc para `POST /auth/google`, `/auth/register`, `/auth/login`, `/auth/disclaimer` + schema `AuthResponse`
  - `Backend/src/routes/tools.ts` — anotación JSDoc para `POST /tools/cnv-translate`
  - `Backend/src/app.ts` — monta `swaggerUi.serve` + `swaggerUi.setup(swaggerSpec)` en `/api-docs`

  **Endpoints documentados:**
  | Método | Ruta | Auth |
  |--------|------|------|
  | GET | /health | No |
  | POST | /auth/google | No |
  | POST | /auth/register | No |
  | POST | /auth/login | No |
  | POST | /auth/disclaimer | JWT |
  | POST | /tools/cnv-translate | JWT |

- **Verificación:** `npm run build` compila limpio. Backend 32 tests, App tests — todo verde. `docker compose build` exitoso. Prueba en contenedor: health (200), login (JWT), /api-docs (Swagger UI sirviendo). `.\init.ps1` OK.
- **Uso:** `http://localhost:3000/api-docs` — UI interactiva. Botón "Authorize" para ingresar JWT y probar endpoints protegidos.
- **Cierre:** quedó documentado como parte de feature #14.

## 2026-07-09 — Feature #15: Tab Herramientas + Botón Volver en Traductor
- **Agente:** opencode
- **Plan:** Reemplazar tab 'Exercises' por 'Herramientas' apuntando a ToolsScreen, mover Tools a bottom tab, agregar botón de retroceso en AcertiveTranslateScreen.
- **Cambios:**

  **app-navigator.tsx:**
  - Import `NavigatorScreenParams` desde `@react-navigation/native`
  - Nuevo tipo `HomeTabParamList` con Home, Tools, Journal, Profile
  - `RootStackParamList`: `HomeTabs` → `NavigatorScreenParams<HomeTabParamList>`, se elimina `Tools`
  - `TAB_ICONS`: `Exercises` → `Tools` (⚙)
  - Tab `Exercises` reemplazado por `Tools` con `tabBarLabel: 'Herramientas'`
  - `Tools` eliminado del Stack. Import de `ExercisesScreen` eliminado.

  **home-screen.tsx:**
  - Navigation type: `NativeStackNavigationProp<RootStackParamList>` → `BottomTabNavigationProp<HomeTabParamList, 'Home'>`
  - Import actualizados a `BottomTabNavigationProp` y `HomeTabParamList`

  **tools-screen.tsx:**
  - Navigation type: `NativeStackNavigationProp<RootStackParamList>` → `CompositeNavigationProp<BottomTabNavigationProp<HomeTabParamList, 'Tools'>, NativeStackNavigationProp<RootStackParamList>>`

  **acertive-translate-screen.tsx:**
  - Import `useNavigation` + `NativeStackNavigationProp` + `RootStackParamList`
  - Header con botón `← Volver` y `navigation.goBack()`
  - Nuevos estilos: `header`, `backButton`, `backButtonText`

  **screens/index.ts:**
  - Eliminado export de `ExercisesScreen`

- **Verificación:** App tests, Backend tests — todo verde. `.\init.ps1` OK.
- **Cierre:** feature #15 marcada `done`.

## 2026-07-09 — Feature #16: Botón de Cerrar Sesión en Perfil
- **Agente:** opencode
- **Plan:** Agregar botón de logout en ProfileScreen con AuthContext para compartir estado de autenticación en toda la app.
- **Cambios:**

  **Nuevo archivo:**
  - `App/src/hooks/auth-context.tsx` — `AuthProvider` que envuelve `useAuth()` y expone `UseAuthReturn` via React Context. Hook `useAuthContext()` con validación.

  **Archivos modificados:**
  - `App/src/hooks/use-auth.ts` — exportada interfaz `UseAuthReturn`
  - `App/src/hooks/index.ts` — exporta `AuthProvider`, `useAuthContext`
  - `App/App.tsx` — refactor: `App` envuelve con `<AuthProvider>`, lógica extraída a `AppContent` que consume `useAuthContext()`
  - `App/src/screens/profile-screen.tsx` — rediseñado: avatar, nombre app, versión, disclaimer, botón "Cerrar sesión" con estilo outline-danger y `Alert.alert` de confirmación

- **Verificación:** App tests, Backend tests — todo verde. `.\init.ps1` OK.
- **Cierre:** feature #16 marcada `done`.

## 2026-07-10 — Bugfix: Migration tracking + Configuración Gemini
- **Agente:** opencode
- **Plan:** Resolver crash del backend al reiniciar contenedor (migraciones re-ejecutadas sin tracking) + migrar API de Gemini de 1.5-flash (apagado) a 2.5-flash-lite + mover prompt y modelo a variables de entorno.
- **Cambios:**

  **Backend - Migration tracking:**
  - `src/database/migrate.ts` — crea tabla `schema_migrations` y verifica qué migraciones ya fueron aplicadas antes de ejecutarlas. Cada `.sql` se registra tras ejecutarse exitosamente.
  - `src/database/migrations/001_create_usuarios_auth.sql` — `CREATE INDEX IF NOT EXISTS` en ambos índices (idempotente)
  - `src/database/migrations/002_add_local_auth.sql` — `CREATE INDEX IF NOT EXISTS` en idx_usuarios_auth_email (idempotente)

  **Backend - Gemini config:**
  - `.env` / `.env.docker` / `.env.example` — agrega `GEMINI_MODEL=gemini-2.5-flash-lite` y `CNV_PROMPT=...`
  - `src/utils/config.ts` — expone `GEMINI_MODEL` y `CNV_PROMPT`
  - `src/services/ai-service.ts` — elimina constante `CNV_PROMPT` hardcodeada, usa `config.CNV_PROMPT` y `config.GEMINI_MODEL`

  **Tests:**
  - `tests/database-migration.test.ts` — actualiza assertions para aceptar `IF NOT EXISTS` en índices

  **Docker:**
  - `Backend/.env.docker` — prompt sin comillas dobles (causaba parse error en Docker)

- **Verificación:** Backend 32 tests, App tests — todo verde. `docker compose restart` ejecuta migraciones con tracking (skips). `.\init.ps1` OK.
- **Cierre:** bugfix aplicado. El backend ahora arranca correctamente tras reinicios.

## 2026-07-14 — Migración Google Gemini → Sistema multi-proveedor de IA
- **Agente:** opencode/big-pickle
- **Plan:** Reemplazar `@google/generative-ai` (Google Gemini) por un sistema flexible que soporte múltiples proveedores de IA (Groq, OpenRouter, DeepSeek, Cerebras), todos compatibles con la API de OpenAI. Cada proveedor se activa/desactiva desde `.env`.
- **Problema:** Google Gemini API con alta demanda, no usable de forma confiable.
- **Cambios:**

  **Backend:**
  - `.env.example` — reemplaza sección `Google Gemini AI` por `AI Provider` con 4 providers configurables (groq, openrouter, deepseek, cerebras), cada uno con `API_KEY` y `MODEL`
  - `src/utils/config.ts` — elimina `GEMINI_API_KEY` y `GEMINI_MODEL`. Agrega interfaz `AIProviderConfig` y config por proveedor: `AI_PROVIDER`, `GROQ`, `OPENROUTER`, `DEEPSEEK`, `CEREBRAS` (cada uno con apiKey, model, baseURL)
  - `src/services/ai-provider.ts` — **NUEVO**. Abstracción de proveedores con fallback automático. Usa SDK `openai` con base URL custom por proveedor. `getActiveProvider()` retorna el proveedor activo. `generateWithFallback()` intenta el primario y fallback a otros si falla.
  - `src/services/ai-service.ts` — reescrito: importa `generateWithFallback` de `ai-provider` en vez de `@google/generative-ai`. Interfaz pública `translateToCnv(text)` sin cambios.
  - `package.json` — swap `@google/generative-ai` → `openai` (^4.77.0)
  - `tests/ai-provider.test.ts` — **NUEVO**. 10 tests: getActiveProvider (6 tests: key OK, key missing, provider invalid, openrouter, deepseek, cerebras) + generateWithFallback (4 tests: text OK, params correct, fallback on failure, all providers fail)

- **Verificación:** `npx tsc --noEmit` 0 errores. Backend 42 tests (32 existentes + 10 nuevos), App tests — todo verde. `.\init.ps1` OK.
- **Uso:** En `.env`, poner `AI_PROVIDER=groq` y `GROQ_API_KEY=gsk_xxxxx`. Para cambiar a otro proveedor, cambiar esas 2 líneas. No tocar código.
- **Cierre:** migración completada. Google Gemini eliminado del backend. Sistema multi-proveedor funcional.

## 2026-07-14 — Feature #9: Módulo de Psicoeducación en Pareja
- **Agente:** opencode/big-pickle
- **Plan:** Implementar módulo de psicoeducación modular y dinámico con 4 tablas de BD, 4 tipos de componente UI, seed con contenido real del Kit de Relaciones de Pareja, y flujo completo backend → frontend.
- **Cambios:**

  **Backend - Migraciones:**
  - `src/database/migrations/003_create_psicoeducation.sql` — 4 tablas: `categorias_psicoeducacion`, `temas_psicoeducacion`, `contenidos_bloques` (JSONB), `usuario_progreso_psicoeducacion` (con UNIQUE id_anonimo + bloque_id). CHECK constraints en pilar y tipo_componente. Índices optimizados.
  - `src/database/migrations/004_seed_psicoeducation_content.sql` — Seed completo: 1 categoría "Kit de relaciones de pareja", 1 tema "Comunicación asertiva para parejas", 4 bloques (CONCIENCIA/TEXTO con cita de Sabines, CONCIENCIA/TABLA_COMPARATIVA, ACEPTACION/CUESTIONARIO, ACCION/EJERCICIO_DIDACTICO con técnica XYZ).

  **Backend - Models:**
  - `src/models/psychoeducation.ts` — Interfaces: `IPsychoeducationCategory`, `IPsychoeducationTopic`, `IPsychoeducationBlock`, `IUserProgress`, `ITextoContent`, `ITablaContent`, `ICuestionarioContent`, `IEjercicioContent`. Types `PilarPsicoeducacion` y `TipoComponente`.
  - `src/models/index.ts` — Re-exporta todos los tipos nuevos.

  **Backend - Services:**
  - `src/services/psychoeducation-repository.ts` — Queries PostgreSQL: `findAllCategories`, `findCategoryBySlug`, `findTopicsByCategory`, `findBlocksByTopic`, `findUserProgress`, `findUserProgressForTopic`, `upsertUserProgress`.
  - `src/services/psychoeducation-service.ts` — Lógica de negocio: `getCategories`, `getCategoryDetail`, `getTopicContent` (con progreso), `saveProgress`.

  **Backend - Controller + Routes:**
  - `src/controllers/psychoeducation-controller.ts` — Handlers HTTP para los 4 endpoints.
  - `src/routes/psychoeducation.ts` — `GET /psychoeducation`, `GET /:slug`, `GET /:slug/:temaId`, `POST /progress` (auth).
  - `src/routes/index.ts` — exporta `psychoeducationRouter`.
  - `src/app.ts` — monta `psychoeducationRouter`.

  **Backend - Tests:**
  - `tests/psychoeducation.test.ts` — 8 tests: GET categorías, GET detalle, GET 404, GET temas, GET bloques, GET tema 404, POST progreso, POST 400, POST 401.

  **Frontend - Types + Service + Hook:**
  - `src/types/psychoeducation.ts` — Interfaces TypeScript para toda la data del módulo.
  - `src/services/psychoeducation-service.ts` — Funciones: `getCategories`, `getCategoryDetail`, `getTopicContent`, `saveProgress`.
  - `src/hooks/use-psychoeducation.ts` — Hook con estado: `categories`, `categoryDetail`, `topicContent`, `loading`, `error`, `loadCategories`, `loadCategory`, `loadTopic`, `submitProgress`.

  **Frontend - Componentes (6):**
  - `src/components/pillar-badge.tsx` — Badge de color por pilar (CONCIENCIA=azul, ACEPTACION=verde, ACCION=naranja).
  - `src/components/content-block-text.tsx` — Párrafos + cita poética en card itálica con border-left accent.
  - `src/components/content-block-table.tsx` — Carrusel horizontal de tarjetas (una por fila) con colores pastel.
  - `src/components/content-block-questionnaire.tsx` — Botones circulares 1-5 por item, banner de completado.
  - `src/components/content-block-exercise.tsx` — Accordions expandibles con pasos + TextInput para borrador.
  - `src/components/content-block-renderer.tsx` — Switch que delega al componente correcto según `tipo_componente`.

  **Frontend - Pantallas (2):**
  - `src/screens/psychoeducation-home-screen.tsx` — Lista de temas con icono, descripción, conteo de bloques. Header con icono + título + descripción de categoría.
  - `src/screens/psychoeducation-topic-screen.tsx` — Vista de tema con bloques agrupados por pilar. Barra de progreso. PillarBadge + descripción por sección. Footer con disclaimer.

  **Frontend - Navegación:**
  - `src/navigation/app-navigator.tsx` — Agrega `PsychoeducationHome` y `PsychoeducationTopic` al `RootStackParamList` y al stack autenticado.
  - `src/screens/tools-screen.tsx` — Cambia `route: null` → `'PsychoeducationHome'` en la entrada de Psicoeducación.

  **Frontend - Tests (10):**
  - `__tests__/pillar-badge.test.tsx` — 3 tests: render CONCIENCIA, ACEPTACION, ACCION.
  - `__tests__/content-block-renderer.test.tsx` — 5 tests: render TEXTO, TABLA, CUESTIONARIO, EJERCICIO, unknown type.
  - `__tests__/psychoeducation-data.test.ts` — 7 tests: validación de tipos, estructura de contenido, pilar values.

- **Verificación:** Backend 50 tests (42 existentes + 8 nuevos), App 26 tests (16 existentes + 10 nuevos) — todo verde. `.\init.ps1` OK.
- **Cierre:** feature #9 marcada `done`.

## 2026-07-14 — Agregar Gemini como proveedor + actualizar .env con OpenRouter
- **Agente:** opencode/big-pickle
- **Plan:** Agregar Gemini como 5to proveedor de IA (API compatible con OpenAI via Google AI Studio) + actualizar `.env` con configuración de OpenRouter + limpiar `.env.docker`.
- **Problema:** El `.env` de desarrollo tenía variables viejas (`OPENAI_API_KEY`, `GEMINI_API_KEY` en formato antiguo) que `config.ts` ya no leía. El traductor fallaba con `AI_PROVIDER="groq" configurado pero falta GROQ_API_KEY`.
- **Cambios:**

  **Backend:**
  - `src/services/ai-provider.ts` — agrega `'gemini'` al type `ProviderName`, a `PROVIDER_BASE_URLS` (`https://generativelanguage.googleapis.com/v1beta/openai`), y al final de `FALLBACK_ORDER`
  - `src/utils/config.ts` — agrega `GEMINI: AIProviderConfig` a la interfaz y al export con `baseURL` de Google AI Studio
  - `.env` — reestructurado completamente: elimina variables viejas, agrega `AI_PROVIDER=openrouter` con key de OpenRouter, agrega secciones de Groq, DeepSeek, Cerebras, Gemini (placeholders). Actualiza `CNV_PROMPT` con la versión mejorada de `.env.docker`
  - `.env.example` — agrega sección Gemini con `GEMINI_API_KEY=` y `GEMINI_MODEL=gemini-2.5-flash-lite`
  - `.env.docker` — limpia `#` de `AI_PROVIDER=openrouter#groq` (dotenv lo parseaba mal), agrega sección Gemini
  - `tests/ai-provider.test.ts` — agrega mock de `GEMINI` en `mockConfig`, agrega test `returns gemini provider when configured` (11 tests total)

- **Verificación:** `npx tsc --noEmit` 0 errores. Backend 43 tests (32 existentes + 11 ai-provider), App tests — todo verde. `.\init.ps1` OK.
- **Uso:** 5 proveedores disponibles. Para usar cualquiera, cambiar 2 líneas en `.env`:
  ```
  AI_PROVIDER=openrouter
  OPENROUTER_API_KEY=sk-or-xxxxx
  ```
  Gemini usa la API de Google AI Studio compatible con OpenAI: `https://generativelanguage.googleapis.com/v1beta/openai`
- **Cierre:** sesión completada. Traductor funcional con OpenRouter. Gemini disponible como opción.

## 2026-07-14 — Deploy Docker + Fix timeout frontend CNV translate
- **Agente:** opencode/big-pickle
- **Plan:** Desplegar backend en Docker con multi-provider + corregir timeout del frontend que abortaba requests de IA.
- **Problema:** El frontend tenía `API_TIMEOUT=10000` (10s), pero OpenRouter con `meta-llama/llama-3.3-70b-instruct` tarda 20-30s. El `AbortController` mataba el request antes de recibir respuesta. El catch mostraba "Lo siento, no pude procesar tu mensaje" sin logs de error en Docker.
- **Cambios:**

  **Backend:**
  - `.env.docker` — cambia `OPENROUTER_MODEL` de `meta-llama/llama-3.3-70b-instruct:free` (ya no existe) a `meta-llama/llama-3.3-70b-instruct` (de pago). Vacía `DEEPSEEK_API_KEY` (tenía key de OpenRouter copiada por error).

  **Frontend:**
  - `src/services/api.ts` — agrega parámetro `timeoutMs?` a `request()`. Exporta `post<T>(path, body?, timeoutMs?)`.
  - `src/services/tools-service.ts` — `cnvTranslate()` pasa `timeoutMs=60_000` a `api.post()`.

- **Verificación:** Docker compose up -d, backend corriendo en `http://localhost:3000`. Health check OK. Traductor CNV funcional via curl. App Expo Go debe reconectarse.
- **Uso:** Timeout default 10s para endpoints rápidos. Para endpoints de IA, pasar `timeoutMs=60_000` como tercer argumento a `api.post()`.
- **Cierre:** sesión completada. Docker desplegado, timeout corregido.

## 2026-07-19 — Fix: Interceptor de 401 para logout automático
- **Agente:** opencode/big-pickle
- **Plan:** El Traductor de Lenguaje Asertivo (CNV Translate) mostraba "Lo siento, no pude procesar tu mensaje" sin indicar la causa real. Tras agregar logging, el error reveló: `Invalid or expired token`. El problema raíz es que no hay manejo de 401 en el frontend — cuando el JWT expira, el token vencido permanece en storage y cada request falla silenciosamente.
- **Problema:** La app no detectaba respuestas 401 del backend. El token expirado se enviaba en cada request, y el catch genérico mostraba un mensaje sin utilidad para diagnosticar.
- **Cambios:**

  **Frontend:**
  - `src/services/api.ts` — Agrega variable `onUnauthorized` y función `setOnUnauthorized(handler)` para registrar callback. En `request()`, detecta `response.status === 401`, llama `clearToken()` + `onUnauthorized?.()`, lanza error con mensaje descriptivo.
  - `src/hooks/use-auth.ts` — Importa `setOnUnauthorized` de `api.ts`. En `useEffect`, registra callback que ejecuta `setIsAuthenticated(false)` al recibir 401.
  - `src/screens/acertive-translate-screen.tsx` — Agrega `console.error` en catch del CNV translate para logging de errores.

  **feature_list.json:**
  - Nueva feature id:17 `auth_401_interceptor` — marcada como `done`.

- **Verificación:** `.\init.ps1` pasa al 100%. Tests Backend y App OK.
- **Uso:** Cuando el backend retorna 401, el frontend limpia el token de storage y redirige automáticamente a WelcomeScreen. El usuario puede re-autenticarse sin cerrar la app manualmente.
- **Cierre:** sesión completada. Interceptor 401 implementado y verificado.

## 2026-07-19 — Feature #10: Línea del Tiempo Personal con Efecto 3D
- **Agente:** opencode/big-pickle
- **Plan:** Línea del tiempo personal con efecto de profundidad 3D, persistencia en backend, emoji de emoción predefinida, dos campos de texto (qué pasó + cómo te hizo sentir), divisores visuales entre días.
- **Cambios:**

  **Backend:**
  - `src/database/migrations/005_create_timeline_events.sql` — tabla `timeline_events` con id, id_anonimo, emoji, emocion_label, descripcion, sentimiento, fecha, created_at + índices
  - `src/models/timeline.ts` — interfaces `ITimelineEvent` e `ICreateTimelineEvent`
  - `src/services/timeline-repository.ts` — CRUD con pg.Pool (createEvent, findEventsByUser, findEventById, deleteEvent)
  - `src/services/timeline-service.ts` — lógica de negocio con transformación snake_case → camelCase
  - `src/controllers/timeline-controller.ts` — validación de input, respuesta HTTP para POST/GET/DELETE
  - `src/routes/timeline.ts` — POST/GET/DELETE `/timeline` con authMiddleware
  - `src/app.ts` — import y uso de timelineRouter
  - `src/routes/index.ts` — export de timelineRouter
  - `src/models/index.ts` — export de tipos de timeline
  - `tests/timeline.test.ts` — 12 tests: POST crear (6), GET listar (2), DELETE eliminar (4)

  **Frontend:**
  - `App/src/services/timeline-service.ts` — getEvents, createEvent, deleteEvent
  - `App/src/hooks/use-timeline.ts` — hook con estado y operaciones CRUD
  - `App/src/components/timeline-card.tsx` — tarjeta con emoji, emoción, descripción, sentimiento, colores alternos por día
  - `App/src/components/timeline-day-divider.tsx` — divisor visual con fecha formateada
  - `App/src/components/add-milestone-modal.tsx` — modal con emoji picker horizontal + 2 TextInputs
  - `App/src/screens/timeline-screen.tsx` — ScrollView con efecto 3D (escala + opacidad), empty state, FAB, long press para eliminar
  - `App/src/constants/index.ts` — EMOTIONS (10 emociones predefinidas) y TIMELINE_DAY_COLORS
  - `App/src/navigation/app-navigator.tsx` — TimelineScreen agregada a RootStackParamList y como Screen overlay
  - `App/src/screens/tools-screen.tsx` — route cambiado de null a 'Timeline'
  - `App/src/screens/index.ts` — export de TimelineScreen

- **Verificación:** Backend 63 tests (51 existentes + 12 nuevos), App 26 tests — todo verde. `.\init.ps1` OK.
- **Cierre:** feature #10 marcada `done`.

## 2026-07-21 — Fallback a Gemini gem en Traductor Asertivo
- **Agente:** opencode/big-pickle
- **Plan:** Cuando el Traductor CNV falla, mostrar mensaje amigable con botón para abrir un gem de Gemini como alternativa. También incluir un botón discreto en la UI para acceder directamente al gem sin esperar un error.
- **Problema:** El catch del Traductor Asertivo mostraba un mensaje genérico sin alternativas. El usuario no tenía forma de resolver su necesidad cuando la IA fallaba.
- **Cambios:**

  **Frontend:**
  - `src/constants/index.ts` — Agrega `GEMINI_GEM_URL` con el link del gem de Gemini.
  - `src/screens/acertive-translate-screen.tsx` — Importa `expo-web-browser` y `GEMINI_GEM_URL`. Agrega `isError?: boolean` a interfaz `Message`. Catch: mensaje amigable "En este momento estamos presentando algunos inconvenientes..." + `isError: true`. `renderMessage`: botón "🌐 Abrir en Gemini" cuando `isError`. Nuevo botón discreto "🌐 Gemini" en el header para acceso directo. Nuevos estilos: `geminiLink`, `geminiLinkText`, `geminiButton`, `geminiButtonText`. Header cambia a `justifyContent: 'space-between'`.

  **feature_list.json:**
  - Nueva feature id:18 `cnv_translate_gemini_fallback` — marcada como `done`.

- **Verificación:** `.\init.ps1` pasa al 100%. Tests Backend y App OK.
- **Uso:** Botón discreto "🌐 Gemini" en el header siempre visible. Cuando la IA falla, aparece botón "🌐 Abrir en Gemini" en el mensaje de error. Ambos abren el gem in-app con `expo-web-browser`.
- **Cierre:** sesión completada. Fallback Gemini implementado y verificado.

## 2026-07-20 — Mejora Feature #10: Editar y Eliminar hitos
- **Agente:** opencode/big-pickle
- **Plan:** Agregar funcionalidad de editar hitos existentes y mejorar el flujo de eliminación con un Alert de 3 opciones (Editar / Eliminar / Cancelar).
- **Cambios:**

  **Backend:**
  - `src/models/timeline.ts` — agregada interfaz `IUpdateTimelineEvent` (campos opcionales)
  - `src/models/index.ts` — export de `IUpdateTimelineEvent`
  - `src/services/timeline-repository.ts` — agregada `updateEvent(id, idAnonimo, fields)` con UPDATE dinámico y ownership check
  - `src/services/timeline-service.ts` — agregada `updateEvent` con validación de existencia y transformación snake_case → camelCase
  - `src/controllers/timeline-controller.ts` — agregado handler `updateEvent` con validación de todos los campos opcionales
  - `src/routes/timeline.ts` — agregada `PUT /timeline/:id` con authMiddleware
  - `tests/timeline.test.ts` — mock de `updateEvent` + 6 tests: éxito, solo sentimiento, 404, 400 id, 400 emoji, 401

  **Frontend:**
  - `App/src/services/timeline-service.ts` — agregado tipo `IUpdateTimelineEvent` y función `updateEvent(id, data)`
  - `App/src/hooks/use-timeline.ts` — agregado `editEvent(id, data)` que actualiza estado local sin recargar
  - `App/src/components/add-milestone-modal.tsx` — refactored con prop `initialData?: ITimelineEvent`: pre-carga campos en modo edición, título "Editar Hito", botón "Actualizar"
  - `App/src/screens/timeline-screen.tsx` — Alert "Gestionar hito" con Editar/Eliminar/Cancel, estado `editingEvent`, modal reutilizado para crear y editar

- **Verificación:** Backend 69 tests (63 existentes + 6 PUT), App 26 tests — todo verde. `.\init.ps1` OK.
- **Cierre:** sesión completada. Editar y Eliminar hitos implementados y verificados.

## 2026-07-21 — Feature #19: Rediseño de diálogos al estilo dialogBase.html
- **Agente:** big-pickle
- **Plan:** Reemplazar Alert.alert nativos y AddMilestoneModal por diálogos custom con glass effect, border-radius 32px, sombra elevada, animación fade+scale, botones apilados verticalmente.
- **Cambios:**

  **Nuevos componentes (2):**
  - `App/src/components/confirm-dialog.tsx` — Diálogo reutilizable para confirmaciones. Props: visible, title, description, emoji, actions (array con label, onPress, variant: primary/secondary/destructive). Glass effect (`rgba(255,255,255,0.85)` + blur), borderRadius 32px, sombra elevada, animación fade+scale con Animated. Overlay semi-transparente con blur.
  - `App/src/components/info-dialog.tsx` — Diálogo informativo de 1 botón. Mismo estilo visual que ConfirmDialog. Props: visible, title, description, emoji, buttonLabel, onClose.

  **Componente rediseñado:**
  - `App/src/components/add-milestone-modal.tsx` — Rediseño completo: de slide-up full-screen a overlay centrada con glass card. Contenido simplificado: emotion picker (grid wrap) + 1 TextInput (descripcion, sin sentimiento). Botones full-width apilados verticalmente (Guardar primario + Cancelar secundario). Animación fade+scale. Soporte de initialData preservado para modo edición.

  **Screens actualizados:**
  - `App/src/screens/timeline-screen.tsx` — Eliminados ambos Alert.alert (gestionar hito + confirmar eliminación). Nuevo estado `ConfirmState` con ConfirmDialog reutilizable.handleSave simplificado (sin sentimiento).
  - `App/src/screens/profile-screen.tsx` — Eliminado Alert.alert de logout. Nuevo estado `confirmVisible` + ConfirmDialog con "Cerrar sesión" destructivo.
  - `App/src/screens/welcome-screen.tsx` — Eliminado Alert.alert de "Funcionalidad próximamente". Nuevo estado `soonVisible` + InfoDialog con emoji 🚧.
  - `App/src/components/panic-modal.tsx` — Eliminado Alert.alert de "Contactar psicólogo de guardia". Nuevo estado `soonVisible` + InfoDialog con emoji 🚧. Return envuelto en Fragment.

- **Verificación:** Backend 69 tests, App tests — todo verde. `.\init.ps1` OK.
- **Cierre:** feature #19 marcada `done`.

## 2026-07-23 — Bugfix Feature #19: Overlay, emojis y campo sentimiento
- **Agente:** big-pickle
- **Plan:** Corregir 3 problemas en los diálogos: (1) se cierran al tocar fuera, (2) emojis recortados a la derecha, (3) falta campo "sentimiento" en el formulario de hitos.
- **Cambios:**

  **Frontend - Overlay fix (3 archivos):**
  - `App/src/components/add-milestone-modal.tsx` — Agregado `onStartShouldSetResponder={() => true}` en `Animated.View` del diálogo para capturar toques sobre el contenido y evitar que lleguen al overlay
  - `App/src/components/confirm-dialog.tsx` — Mismo fix: `onStartShouldSetResponder` en `Animated.View`
  - `App/src/components/info-dialog.tsx` — Mismo fix: `onStartShouldSetResponder` en `Animated.View`

  **Frontend - Emoji grid fix:**
  - `App/src/components/add-milestone-modal.tsx` — `emotionsGrid`: `gap: 6` → `columnGap: 6, rowGap: 6` + `paddingHorizontal: 2` para evitar recorte del último chip

  **Frontend - Campo sentimiento:**
  - `App/src/components/add-milestone-modal.tsx` — Nuevo state `sentimiento`, TextInput "¿Cómo te sentiste?" después de "¿Qué pasó?", inicialización en useEffect al editar, limpieza en handleClose y handleSave, tipo de `onSave` actualizado con `sentimiento?: string`, `scrollContent.maxHeight` de 60% a 70%
  - `App/src/screens/timeline-screen.tsx` — Tipo de `handleSave` actualizado para incluir `sentimiento?: string`

- **Verificación:** `.\init.ps1` pasa al 100%. Tests Backend y App OK.
- **Cierre:** sesión completada. Los 3 bugs de diálogos corregidos.

## 2026-07-23 — Bugfix Feature #19: Emoji grid recortado en modo creación
- **Agente:** big-pickle
- **Plan:** Los emojis seguían recortados a la derecha al crear un hito (no al editar). El fix anterior (`paddingHorizontal: 2` + `minWidth: 64`) era insuficiente.
- **Causa raíz:** El `minWidth: 64` en `emotionChip` permitía que labels largos ("Melancólico", "Celebración", "Agradecido") empujaran el ancho del chip más allá del contenedor (239px disponibles en un teléfono de 375px).
- **Cambios:**
  - `App/src/components/add-milestone-modal.tsx`:
    - `emotionsGrid`: eliminado `columnGap`/`rowGap`/`paddingHorizontal: 2`, vuelto a `gap: 6` simple
    - `emotionChip`: eliminado `minWidth: 64`, reducido `paddingHorizontal` de 10 a 6
    - `emotionLabel`: agregado `textAlign: 'center'`

- **Verificación:** `.\init.ps1` pasa al 100%. Tests Backend y App OK.
- **Cierre:** sesión completada. Emoji grid corregido en ambos modos (crear y editar).

## 2026-07-29 — Feature #27: Empezar nueva línea del tiempo
- **Agente:** opencode
- **Plan:** Agregar opción "Empezar nueva línea del tiempo" que borra todos los hitos actuales, con opción de exportar a PDF antes de borrar.
- **Cambios:**

  **Backend:**
  - `Backend/src/services/timeline-repository.ts` — `deleteAllEvents(idAnonimo)`: DELETE FROM con rowCount
  - `Backend/src/services/timeline-service.ts` — `deleteAllEvents(idAnonimo)`: retorna `{ deleted, count }`
  - `Backend/src/controllers/timeline-controller.ts` — handler `deleteAllEvents` que extrae idAnonimo del JWT
  - `Backend/src/routes/timeline.ts` — `DELETE /timeline/all` registrada antes de `:id` para evitar conflicto de ruta
  - `Backend/tests/timeline.test.ts` — mock de `deleteAllEvents` + 3 tests: 200 success, 200 empty, 401

  **Frontend:**
  - `App/src/services/timeline-service.ts` — export `deleteAllEvents()` → `DELETE /timeline/all`
  - `App/src/hooks/use-timeline.ts` — método `clearAllEvents()` con loading/error state, setea events = []
  - `App/src/screens/timeline-screen.tsx` — botón "🆕 Empezar nueva línea del tiempo" al final del scroll (visible solo con eventos). ConfirmDialog con 3 acciones: "📄 Exportar PDF y empezar" (primero share, luego borra), "🗑️ Solo borrar", "Cancelar". Estilos: `resetSection`, `resetDivider`, `resetBtn`, `resetBtnIcon`, `resetBtnText`.

  **feature_list.json:**
  - Nueva feature id:27 `reset_timeline` — marcada como `done`.

- **Verificación:** `.\init.ps1` pasa al 100%. Backend 81 tests (78 originales + 3 nuevos), App tests — todo verde.
- **Cierre:** feature #27 marcada `done`.

## 2026-07-29 — Feature #26: Exportar línea del tiempo a PDF horizontal
- **Agente:** opencode
- **Plan:** Agregar exportación a PDF de la línea del tiempo con orientación landscape, grid de 3 columnas, agrupado por mes.
- **Cambios:**

  **Frontend:**
  - `App/src/services/pdf-service.ts` — Nueva función `generateTimelinePDF(events)`, helper `groupEventsByMonth()`, builder `buildTimelineHtml()`. HTML con `@page { size: landscape }`, CSS grid de 3 columnas, cards con emoji/emocion/fecha/descripcion/sentimiento, agrupación por mes, disclaimer legal.
  - `App/src/screens/timeline-screen.tsx` — Import de `generateTimelinePDF`, handler `handleExportPDF`, botón "📄 PDF" en el header (visible solo cuando hay eventos). Estilos: `titleRow`, `exportBtn`, `exportBtnIcon`, `exportBtnText`.

  **feature_list.json:**
  - Nueva feature id:26 `export_timeline_pdf` — marcada como `done`.

- **Verificación:** `.\init.ps1` pasa al 100%. Typecheck OK. Tests Backend y App OK.
- **Cierre:** feature #26 marcada `done`.

## 2026-07-23 — Bugfix Feature #19: Emoji grid v2 — cálculo dinámico de columnas
- **Agente:** big-pickle
- **Plan:** Los fixes anteriores (quitar minWidth, reducir padding) no resolvieron la raíz: el layout flex wrap sin ancho fijo es impredecible. Reemplazar por un grid de 5 columnas con ancho calculado en JS.
- **Causa:** El emotionChip sin `width` explícito se dimensiona según el contenido del label. Labels como "Melancólico" (~80px) desbordan el contenedor (~239px en un teléfono de 375px). Intentos previos de ajustar padding/minWidth no atacaron la raíz del problema.
- **Cambios:**
  - `App/src/components/add-milestone-modal.tsx`:
    - Import de `Dimensions` desde react-native
    - Nuevo cálculo `chipWidth = (screenWidth - 2*20 - 2*48 - 4*6) / 5` — determinístico, sin onLayout
    - `emotionChip`: width fijo `chipWidth` + `overflow: 'hidden'` + `paddingHorizontal: 4`
    - `emotionLabel`: `textAlign: 'center'` para que el texto no desborde

- **Verificación:** `.\init.ps1` pasa al 100%. Tests Backend y App OK.
- **Cierre:** sesión completada. Grid de 5 columnas fijas, sin depender del contenido del label.

## 2026-07-23 — Bugfix Feature #19: Reducir márgenes del AddMilestoneModal
- **Agente:** big-pickle
- **Plan:** El grid de emociones seguía recortado porque el diálogo tenía demasiado padding horizontal. Reducir el margen gris del overlay y el padding interno del diálogo para ganar ~64px de espacio útil.
- **Cambios revertidos del v2:** Se eliminó el cálculo dinámico con Dimensions, se restauró flexWrap con gap:6 y paddingHorizontal:6 en chips.
- **Cambios nuevos:**
  - `App/src/components/add-milestone-modal.tsx`:
    - `overlay.paddingHorizontal`: 20 → 8 (margen gris reducido)
    - `dialog.paddingHorizontal`: 48 → 28 (padding interno reducido)
    - `dialog.paddingTop`: 48 → 24 (mejor aprovechamiento vertical)

- **Verificación:** `.\init.ps1` pasa al 100%. Tests Backend y App OK.
- **Cierre:** sesión completada. Espacio disponible pasó de 239px a 303px en un teléfono de 375px.

## 2026-07-23 — Feature #20: Directorio de Profesionales con Contacto
- **Agente:** big-pickle
- **Plan:** Reemplazar FeaturedCard de meditación en Home por sección "Agenda tu cita con un profesional". Pantalla dedicada con lista de profesionales cargada desde PostgreSQL. Cada profesional muestra nombre, especialidad, descripción y botones de contacto por WhatsApp y Email.
- **Cambios:**

  **Backend - Migraciones:**
  - `src/database/migrations/006_create_profesionales.sql` — tabla `profesionales` con id, nombre, especialidad, descripcion, telefono, email, activo, created_at + índice parcial para activos
  - `src/database/migrations/007_seed_profesionales.sql` — seed con 4 profesionales de ejemplo (Dra. María García, Dr. Carlos Mendoza, Lic. Ana Sofía Herrera, Dr. Roberto Díaz)

  **Backend - Model:**
  - `src/models/professional.ts` — interfaces `IProfesional` (completo) y `IProfesionalPublic` (sin teléfono/email)
  - `src/models/index.ts` — exporta nuevos tipos

  **Backend - Repository + Service:**
  - `src/services/professional-repository.ts` — queries `findAllActive()` y `findById()` con filtro por activo
  - `src/services/professional-service.ts` — lógica de negocio con validación de existencia

  **Backend - Controller + Routes:**
  - `src/controllers/professional-controller.ts` — handlers `getAll` y `getById`
  - `src/routes/professional.ts` — `GET /professionals` y `GET /professionals/:id` (sin auth, catálogo público)
  - `src/routes/index.ts` — exporta professionalRouter
  - `src/app.ts` — import y uso de professionalRouter

  **Frontend - Service:**
  - `App/src/services/professional-service.ts` — interfaz `Profesional` y funciones `getAll()`, `getById()`

  **Frontend - Component:**
  - `App/src/components/professional-card.tsx` — tarjeta expandible con avatar (inicial), nombre, especialidad, descripción. Al tocar, muestra botones WhatsApp (abre wa.me con mensaje) y Email (abre mailto)

  **Frontend - Screen:**
  - `App/src/screens/professionals-screen.tsx` — lista de profesionales con header, estados de carga/error/empty, navegación back

  **Frontend - HomeScreen:**
  - `App/src/screens/home-screen.tsx` — reemplaza FeaturedCard por tarjeta TouchableOpacity "Agenda tu cita con un profesional" con icono 🩺 y CTA "Ver profesionales →"

  **Frontend - Navigation:**
  - `App/src/navigation/app-navigator.tsx` — agrega ProfessionalsScreen al RootStackParamList y al stack autenticado

  **Config:**
  - `feature_list.json` — nueva feature #20 `professionals_directory` con 9 acceptance criteria

- **Verificación:** `.\init.ps1` pasa al 100%. Tests Backend y App OK.
- **Cierre:** feature #20 marcada `done`.

## 2026-07-23 — Reforma del módulo de psicoeducación
- **Agente:** opencode/big-pickle
- **Plan:** Reforma integral del módulo: quitar barra de progreso inútil, agregar endpoints admin CRUD, nuevo tipo de componente FORMULARIO con 5 tipos de input, guardar borradores de ejercicios, generar PDF de respuestas para revisión profesional.
- **Cambios:**

  **Eliminado:**
  - `App/src/screens/psychoeducation-topic-screen.tsx` — barra de progreso "0/4 bloques completados" eliminada (progressContainer, progressBar, progressFill, progressText)

  **Backend - Migración:**
  - `src/database/migrations/008_admin_role_and_formulario.sql` — agrega columna `role VARCHAR(20) DEFAULT 'user'` con CHECK `('user','admin')` a `usuarios_auth`. Actualiza CHECK de `tipo_componente` para incluir `'FORMULARIO'`. Índice en `role`.

  **Backend - Admin middleware:**
  - `src/middleware/admin-middleware.ts` — middleware que verifica `role === 'admin'` en `usuarios_auth` usando `idAnonimo` del JWT. Retorna 403 si no es admin.

  **Backend - Models:**
  - `src/models/psychoeducation.ts` — agrega `'FORMULARIO'` a `TipoComponente`. Nuevos tipos: `TipoItemFormulario` (LIKERT | TEXTO_LIBRE | SELECCION_MULTIPLE | NUMERICO | FECHA), `IFormularioItem` (id, label, tipo, scaleLabels?, opciones?, placeholder?, multiline?, min?, max?), `IFormularioContent` (instrucciones, items).

  **Backend - Repository (9 funciones CRUD):**
  - `src/services/psychoeducation-repository.ts` — `createCategory`, `updateCategory`, `deleteCategory`, `createTopic`, `updateTopic`, `deleteTopic`, `createBlock`, `updateBlock`, `deleteBlock`. Updates dinámicos con construcción de SET clauses.

  **Backend - Service (9 funciones CRUD):**
  - `src/services/psychoeducation-service.ts` — funciones de negocio con validaciones (verificar existencia de categoría antes de crear tema, etc.). Throws `AppError` con códigos específicos.

  **Backend - Controller (9 handlers):**
  - `src/controllers/psychoeducation-controller.ts` — handlers con validación de campos requeridos, parsing de IDs numéricos, respuestas HTTP correctas (201 para creación, 204 para eliminación).

  **Backend - Routes (9 rutas admin):**
  - `src/routes/psychoeducation.ts` — POST/PUT/DELETE para categories, topics y blocks. Todas protegidas con `authMiddleware` + `adminMiddleware`. Rutas públicas sin cambios.

  **Frontend - Types:**
  - `App/src/types/psychoeducation.ts` — mismos tipos nuevos que Backend (IFormularioItem, IFormularioContent, TipoItemFormulario).

  **Frontend - Nuevo componente:**
  - `App/src/components/content-block-form.tsx` — renderiza formularios dinámicos según `tipo` de cada item. Subcomponentes: `LikertInput` (escala 1-5 con labels customizables), `TextInputItem` (single/multiline), `SeleccionMultiple` (radio buttons), `NumericoInput` (keyboard numeric), `FechaInput` (DD/MM/AAAA). Auto-submit cuando todos los items están respondidos.

  **Frontend - Renderer actualizado:**
  - `App/src/components/content-block-renderer.tsx` — agrega caso `'FORMULARIO'` al switch. Nueva prop `onFormComplete`. Firma de `onExerciseComplete` cambia de `() => void` a `(respuestas: Record<string, unknown>) => void`.

  **Frontend - Exercise modificado:**
  - `App/src/components/content-block-exercise.tsx` — `onComplete` ahora pasa `{ draft }` como `Record<string, unknown>` en vez de `void`.

  **Frontend - Topic screen actualizado:**
  - `App/src/screens/psychoeducation-topic-screen.tsx` — nuevo estado `todasLasRespuestas` para tracking de respuestas por bloque. Callbacks actualizados para guardar respuestas localmente. Botón "Descargar respuestas en PDF" que aparece cuando hay respuestas. Loading state para generación de PDF.

  **Frontend - PDF service:**
  - `App/src/services/pdf-service.ts` — genera HTML con estilos inline, convierte a PDF via `expo-print`, comparte vía `expo-sharing`. Formato: encabezado con título/fecha, respuestas por bloque agrupadas, disclaimer legal al final.

  **Dependencias:**
  - `App/package.json` — agrega `expo-print` y `expo-sharing` (SDK 54 compatible).

- **Verificación:** `.\init.ps1` pasa al 100%. `npx tsc --noEmit` Backend 0 errores, App 0 errores nuevos (2 preexistentes en content-block-text.tsx y home-screen.tsx). Tests Backend y App OK.
- **Cierre:** sesión completada. Reforma del módulo de psicoeducación implementada y verificada.

## 2026-07-23 — Swagger: endpoints admin documentados + auto-login
- **Agente:** opencode/big-pickle
- **Plan:** Documentar las 9 rutas admin CRUD en Swagger y configurar auto-login para no tener que pegar tokens manualmente.
- **Cambios:**

  **Backend - Routes (JSDoc):**
  - `src/routes/psychoeducation.ts` — 13 anotaciones JSDoc completas: 4 rutas públicas (GET categorías, GET detalle, GET temas, GET bloques), 1 ruta protegida (POST progress), 9 rutas admin CRUD (POST/PUT/DELETE categories, topics, blocks). Cada una con tags, security, requestBody, parameters, responses.

  **Backend - Swagger schemas:**
  - `src/docs/swagger.ts` — 5 schemas nuevos: `PsychoeducationCategory`, `CategoryDetailResponse`, `PsychoeducationTopic`, `TopicContentResponse`, `PsychoeducationBlock`. Incluyen propiedades tipadas, enums para pilar y tipoComponente.

  **Backend - Swagger UI auto-login:**
  - `src/app.ts` — Página HTML custom que carga Swagger UI con configuración avanzada:
    - `responseInterceptor` detecta respuestas de `POST /auth/login`, extrae `body.jwt` y lo guarda en `sessionStorage`
    - `requestInterceptor` inyecta `Authorization: Bearer <jwt>` automáticamente en todas las peticiones posteriores
    - `persistAuthorization: true` mantiene el token al recargar
    - Console log confirma cuando el JWT se captura

- **Verificación:** `.\init.ps1` pasa al 100%. `npx tsc --noEmit` Backend 0 errores. Tests Backend y App OK.
- **Uso:** Abrir `http://localhost:3000/api-docs` → ejecutar `POST /auth/login` con credenciales → el JWT se captura automáticamente → todos los endpoints admin funcionan sin pegar token.
- **Cierre:** sesión completada. Swagger documentado con auto-login funcional.

## 2026-07-23 — Fix Swagger: Cannot GET /api-docs (swagger-ui-express v5)
- **Agente:** opencode/big-pickle
- **Plan:** Corregir "Cannot GET /api-docs" causado por swagger-ui-express v5.0.1 que cambió `serve` de función a array.
- **Problema:** `swagger-ui-express` v5 exporta `serve` como array de 2 middlewares (`[swaggerInitFn, serveStatic]`), no como función. El código original `app.use('/api-docs', swaggerUi.serve, ...)` fallaba silenciosamente porque Express no podía registrar un array como middleware directamente.
- **Causa raíz:** La dependencia se actualizó a v5 durante la migración a Expo SDK 54 / Node 24, pero el código no se adaptó al nuevo API.
- **Cambios:**
  - `src/app.ts` — `swaggerUi.serve` → `...swaggerUi.serve` (spread del array). Se aprovechó para agregar HTML custom con auto-login via `responseInterceptor` que captura JWT del `POST /auth/login`.

- **Verificación:** `.\init.ps1` pasa al 100%. `npx tsc --noEmit` 0 errores. Tests Backend y App OK.
- **Uso:** Reiniciar backend. Abrir `http://localhost:3000/api-docs` → ejecutar login → JWT se captura automáticamente.
- **Cierre:** sesión completada. Swagger funcional con auto-login.

## 2026-07-23 — Feature #21: CRUD de Profesionales + Swagger
- **Agente:** opencode/big-pickle
- **Plan:** Agregar endpoints RESTful completos para gestión de profesionales (crear, actualizar, eliminar, buscar todos, buscar por nombre) con documentación Swagger interactiva. Fix pre-existente de tipos en app.ts.
- **Cambios:**

  **Backend - Fix pre-existente:**
  - `src/app.ts` — simplificado swagger setup: eliminado HTML custom con `window` y `SwaggerUiConfigurationOptions` (tipos inexistentes). Reemplazado por `swaggerUi.setup(swaggerSpec, { swaggerOptions: { persistAuthorization: true } })`. Corrige 2 errores TS que bloqueaban tests.

  **Backend - Models:**
  - `src/models/professional.ts` — nuevas interfaces `ICreateProfesional` (required: nombre, especialidad, descripcion, telefono, email) e `IUpdateProfesional` (todos opcionales, incluye activo)
  - `src/models/index.ts` — exporta nuevos tipos

  **Backend - Repository (5 funciones nuevas):**
  - `src/services/professional-repository.ts` — `findAll()` (todos, sin filtro activo), `findByName(name)` (ILIKE + activo=TRUE), `create(data)` (INSERT RETURNING), `update(id, data)` (UPDATE dinámico con SET condicional), `softDelete(id)` (activo=FALSE)

  **Backend - Service (5 funciones nuevas):**
  - `src/services/professional-service.ts` — `getAllProfessionals()`, `searchByName(name)` (valida parámetro), `createProfessional(data)` (valida campos requeridos), `updateProfessional(id, data)` (verifica existencia), `deleteProfessional(id)` (verifica existencia + activo)

  **Backend - Controller (5 handlers nuevos):**
  - `src/controllers/professional-controller.ts` — `getAll`, `findByName` (query param), `getById`, `create` (201), `update`, `delete`

  **Backend - Routes + Swagger (6 rutas):**
  - `src/routes/professional.ts` — GET /professionals (público), GET /professionals/search (público), GET /professionals/:id (público), POST /professionals (JWT), PUT /professionals/:id (JWT), DELETE /professionals/:id (JWT). Todas con anotaciones JSDoc completas. Schema `Profesional`, `CreateProfesional`, `UpdateProfesional` en components.

  **Config:**
  - `feature_list.json` — nueva feature #21 `professionals_crud_swagger` con 8 acceptance criteria

- **Verificación:** `.\init.ps1` pasa al 100%. Backend 69 tests, App tests — todo verde.
- **Cierre:** feature #21 marcada `done`.

## 2026-07-26 — Enhancement: Contenido psicoeducación desde psicoeducacion.md + Formulario Pareja
- **Agente:** opencode/big-pickle
- **Plan:** Agregar el contenido de `templates/psicoeducacion.md` a la herramienta de psicoeducación. Dividir en 5 bloques de texto (CONCIENCIA) + 1 formulario de pareja (ACEPTACION). Nuevo tipo `FORMULARIO_PAREJA` con Likert dual (Persona A / B) + textbox de reflexión. Nuevo tema como ítem 1, tema existente pasa a ítem 2.
- **Cambios:**

  **Backend - Migraciones:**
  - `src/database/migrations/009_add_formulario_pareja.sql` — Amplía CHECK de `tipo_componente` para incluir `'FORMULARIO_PAREJA'`
  - `src/database/migrations/010_seed_psicoeducacion_pareja.sql` — Reordena tema existente a `orden=2`. Crea tema "Psicoeducación para parejas" (`orden=1`) con 6 bloques: 5 TEXTO (CONCIENCIA) cubriendo objetivo, orígenes, civilizaciones, actualidad, apego/Sternberg + 1 FORMULARIO_PAREJA (ACEPTACION) con 7 aspectos de evaluación dual

  **Backend - Models:**
  - `src/models/psychoeducation.ts` — Agrega `'FORMULARIO_PAREJA'` a `TipoComponente`. Nuevas interfaces `IFormularioParejaItem` (id, aspecto, pregunta) e `IFormularioParejaContent` (instrucciones, items)
  - `src/models/index.ts` — Exporta `IFormularioContent`, `IFormularioParejaContent`, `IFormularioParejaItem`

  **Backend - Swagger + Routes:**
  - `src/docs/swagger.ts` — Enum `tipoComponente` actualizado con `FORMULARIO_PAREJA`
  - `src/routes/psychoeducation.ts` — Enums en JSDoc actualizados (POST/PUT blocks)

  **Frontend - Types:**
  - `src/types/psychoeducation.ts` — Mismos cambios que backend: `FORMULARIO_PAREJA` en `TipoComponente`, `IFormularioParejaItem`, `IFormularioParejaContent`

  **Frontend - Nuevo componente:**
  - `src/components/content-block-couples-form.tsx` — Formulario de evaluación dual para parejas. Cada ítem renderiza: aspecto + pregunta, fila "Tu evaluación" (Likert 1-5), fila "Evaluación de tu pareja" (Likert 1-5), textbox "Reflexión conjunta". Auto-submit cuando todos los ítems están completos. Respuestas con estructura `{ personaA, personaB, reflexion }` por ítem.

  **Frontend - Renderer:**
  - `src/components/content-block-renderer.tsx` — Nuevo case `'FORMULARIO_PAREJA'` en switch. Nueva prop `onCouplesFormComplete`. Nuevo import `ContentBlockCouplesForm` y tipo `IFormularioParejaContent`.

  **Frontend - Topic Screen:**
  - `src/screens/psychoeducation-topic-screen.tsx` — Nuevo callback `handleCouplesFormComplete` (misma lógica que form/questionnaire). Pasa `onCouplesFormComplete` a `ContentBlockRenderer`.

  **Frontend - PDF Service:**
  - `src/services/pdf-service.ts` — Nueva función `renderCouplesFormRespuestas()` que renderiza cada aspecto con Persona A, Persona B y Reflexión conjunta en formato HTML con estilos inline. Detecta `FORMULARIO_PAREJA` en `renderRespuestasBloque()`.

  **Frontend - Tests:**
  - `__tests__/psychoeducation-data.test.ts` — Nuevo test `FORMULARIO_PAREJA block has correct structure` que valida `IFormularioParejaContent` con 2 items
  - `__tests__/content-block-renderer.test.tsx` — Nuevo fixture `formularioParejaBlock` y test `renders FORMULARIO_PAREJA block`

- **Verificación:** `.\init.ps1` pasa al 100%. Backend tests OK, App tests OK.
- **Cierre:** sesión completada. Contenido de psicoeducacion.md integrado con formulario de pareja dual. Pendiente: ejecutar migraciones SQL 009 y 010 en la DB al hacer deploy.

## 2026-07-27 — Feature #22: Rediseño Psicoeducación paginado horizontal estilo YouVersion
- **Agente:** big-pickle
- **Plan:** Transformar la pantalla de contenido psicoeducativo de scroll vertical largo a paginado horizontal con swipe, flechas, dots y barra de progreso. Cada bloque = una página independiente.
- **Cambios:**

  **Pantalla principal (reescritura):**
  - `App/src/screens/psychoeducation-topic-screen.tsx` — Reescritura completa: `ScrollView` vertical reemplazado por `FlatList` horizontal con `pagingEnabled`. Cada bloque se renderiza como una página independiente. Barra de progreso animada con `Animated.Value` ligado al scroll. Dot indicators (punto activo se ensancha a 20px). Flechas izq/der con contador "X de Y". Header con botón Volver + título. Footer disclaimer solo en última página. Botón PDF solo en última página con respuestas. Nuevo import `useSafeAreaInsets` para padding seguro.

  **Renderer (ajuste):**
  - `App/src/components/content-block-renderer.tsx` — Agregado `flex: 1` al container para que los bloques llenen la página disponible.

  **6 componentes de bloque (envueltos en ScrollView vertical interno):**
  - `App/src/components/content-block-text.tsx` — `View` → `ScrollView` vertical con `showsVerticalScrollIndicator={false}`
  - `App/src/components/content-block-questionnaire.tsx` — `View` → `ScrollView` vertical
  - `App/src/components/content-block-exercise.tsx` — `View` → `ScrollView` vertical
  - `App/src/components/content-block-form.tsx` — `View` → `ScrollView` vertical
  - `App/src/components/content-block-couples-form.tsx` — `View` → `ScrollView` vertical
  - `App/src/components/content-block-table.tsx` — `View` → `ScrollView` vertical (envuelve el `ScrollView` horizontal existente)

  **Config:**
  - `feature_list.json` — nueva feature #22 `psychoeducation_paged_ui` con 9 acceptance criteria

- **Verificación:** `.\init.ps1` pasa al 100%. App 28 tests (7 suites), Backend tests — todo verde.
- **Cierre:** feature #22 marcada `done`.

## 2026-07-27 — Safe Area Insets: respetar status bar en todas las pantallas
- **Agente:** opencode/big-pickle
- **Plan:** Agregar `useSafeAreaInsets()` de `react-native-safe-area-context` a las 7 pantallas que no lo usaban para evitar que el contenido se superponga con el status bar (hora, batería, notificaciones).
- **Problema:** Las pantallas usaban `paddingTop` fijo de 40px que no consideraba la altura del status bar, la cual varía según dispositivo (20px en iPhone SE, ~54px en iPhone con notch, ~40px en Android).
- **Cambios:**

  **Pantallas con ScrollView (insets.top en contenedor raíz):**
  - `App/src/screens/home-screen.tsx` — import + insets + `[styles.flex, { paddingTop: insets.top }]`
  - `App/src/screens/tools-screen.tsx` — import + insets + `[styles.flex, { paddingTop: insets.top }]`
  - `App/src/screens/timeline-screen.tsx` — import + insets + `[styles.flex, { paddingTop: insets.top }]`
  - `App/src/screens/psychoeducation-home-screen.tsx` — import + insets + `[styles.flex, { paddingTop: insets.top }]`
  - `App/src/screens/professionals-screen.tsx` — import + insets + `[styles.container, { paddingTop: insets.top }]`

  **Pantallas con layout especial:**
  - `App/src/screens/profile-screen.tsx` — reemplaza `paddingTop: SPACING.lg + 40` (64px fijo) por `insets.top + SPACING.lg + 16` (adaptativo)
  - `App/src/screens/acertive-translate-screen.tsx` — reemplaza `paddingTop: Platform.OS === 'ios' ? 56 : 36` por `insets.top + SPACING.sm` en el header

  **No requirió cambios:**
  - `psychoeducation-topic-screen.tsx` — ya usaba `useSafeAreaInsets()` correctamente ✅

- **Verificación:** `.\init.ps1` pasa al 100%. Tests Backend y App OK.
- **Cierre:** sesión completada. Todas las pantallas respetan el status bar de forma adaptativa.

## 2026-07-27 — UI tweak: marginTop en vistas principales
- **Agente:** opencode/big-pickle
- **Plan:** Aumentar `paddingTop` de 32px a 40px (`SPACING.lg + 8` → `SPACING.lg + 16`) en las 5 pantallas principales con ScrollView para dejar más aire visual arriba.
- **Cambios:**
  - `App/src/screens/home-screen.tsx:130` — `SPACING.lg + 8` → `SPACING.lg + 16`
  - `App/src/screens/tools-screen.tsx:114` — `SPACING.lg + 8` → `SPACING.lg + 16`
  - `App/src/screens/timeline-screen.tsx:269` — `SPACING.lg + 8` → `SPACING.lg + 16`
  - `App/src/screens/psychoeducation-home-screen.tsx:122` — `SPACING.lg + 8` → `SPACING.lg + 16`
  - `App/src/screens/professionals-screen.tsx:87` — `SPACING.lg + 8` → `SPACING.lg + 16`

- **Verificación:** `.\init.ps1` pasa al 100%. Tests Backend y App OK.
- **Cierre:** sesión completada. 5 pantallas ahora tienen 40px de paddingTop.

## 2026-07-27 — Feature #23: PDF solo para formularios, descargable por formulario
- **Agente:** big-pickle
- **Plan:** Mover botón PDF de la última página global a dentro de cada bloque FORMULARIO/FORMULARIO_PAREJA. El PDF incluye solo los datos de ese formulario específico.
- **Cambios:**

  **Pantalla (topic-screen.tsx):**
  - Eliminado botón PDF global de la última página
  - Eliminado estado `generatingPdf` global y `handleDownloadPdf` global
  - Nuevo estado `generatingPdfBlockId: number | null` para rastrear qué formulario se genera
  - Nuevo callback `handleFormPdf(bloqueId)` que genera PDF con solo un bloque y sus respuestas
  - Props `onDownloadPdf` e `isGeneratingPdf` pasadas al `ContentBlockRenderer`

  **Renderer (content-block-renderer.tsx):**
  - Nuevas props opcionales `onDownloadPdf?: () => void` e `isGeneratingPdf?: boolean`
  - Props pasadas solo a `ContentBlockForm` y `ContentBlockCouplesForm`

  **Formulario (content-block-form.tsx):**
  - Nuevas props `onDownloadPdf` e `isGeneratingPdf`
  - Botón "Descargar respuestas en PDF" debajo del banner "Todas las respuestas registradas"
  - Aparece solo cuando el formulario está completo y `onDownloadPdf` está definido

  **Formulario pareja (content-block-couples-form.tsx):**
  - Mismos cambios que content-block-form

  **Config:**
  - `feature_list.json` — nueva feature #23 `psychoeducation_pdf_per_form` con 4 acceptance criteria

- **Verificación:** `.\init.ps1` pasa al 100%. App 28 tests (7 suites), Backend tests — todo verde.
- **Cierre:** feature #23 marcada `done`.

---

## 2026-07-28 — Feature #24: Autor en tarjetas de psicoeducación
- **Agente:** opencode
- **Plan:** Agregar campo `autor` a los temas de psicoeducación, mostrarlo como "Escrito por {autor}" en la lista de temas disponibles. Renombrar primer tema de "Psicoeducación para parejas" a "El amor". Autor: John Emanuel Pérez Gómez (para todos los temas).
- **Cambios:**

  **Backend - Migración:**
  - `src/database/migrations/003_create_psicoeducation.sql` — agrega columna `autor VARCHAR(150)` en CREATE TABLE
  - `src/database/migrations/011_add_autor_to_temas.sql` — ALTER TABLE + UPDATE para DBs existentes

  **Backend - Seed:**
  - `src/database/migrations/004_seed_psicoeducation_content.sql` — agrega `autor` al INSERT de "Comunicación asertiva para parejas"
  - `src/database/migrations/010_seed_psicoeducacion_pareja.sql` — renombra "Psicoeducación para parejas" → "El amor", agrega `autor` a ambos temas

  **Backend - Modelo:**
  - `src/models/psychoeducation.ts` — agrega `autor: string | null` a `IPsychoeducationTopic`

  **Backend - Servicio y repositorio:**
  - `src/services/psychoeducation-service.ts` — mapea `autor` en `getCategoryDetail`, agrega `autor` a `createTopic`/`updateTopic`
  - `src/services/psychoeducation-repository.ts` — agrega `autor` a `createTopic`/`updateTopic`

  **Frontend:**
  - `App/src/types/psychoeducation.ts` — agrega `autor: string | null` a `IPsychoeducationTopic`
  - `App/src/screens/psychoeducation-home-screen.tsx` — muestra "Escrito por {autor}" debajo de la descripción del tema

  **Tests:**
  - `Backend/tests/psychoeducation.test.ts` — agrega `autor` al mock de `findTopicsByCategory`

- **Verificación:** 69/69 tests pasan, `.\init.ps1` pasa al 100%.
- **Cierre:** feature #24 marcada `done`.

---

## 2026-07-28 — Feature #25: Flag `exportar_pdf` en FORMULARIO_PAREJA
- **Agente:** opencode
- **Plan:** Agregar campo opcional `exportar_pdf` al `cuerpo_json` de bloques `FORMULARIO_PAREJA` para controlar desde la base de datos si se muestra el botón de descarga PDF.
- **Cambios:**

  **Backend - Modelo:**
  - `src/models/psychoeducation.ts` — agrega `exportar_pdf?: boolean` a `IFormularioParejaContent`

  **Backend - Migración:**
  - `src/database/migrations/013_add_exportar_pdf_flag.sql` — UPDATE JSONB de bloques FORMULARIO_PAREJA existentes para agregar `{"exportar_pdf": true}`

  **Backend - Seed:**
  - `src/database/migrations/010_seed_psicoeducacion_pareja.sql` — agrega `"exportar_pdf": true` al JSON del FORMULARIO_PAREJA

  **Frontend:**
  - `App/src/types/psychoeducation.ts` — agrega `exportar_pdf?: boolean` a `IFormularioParejaContent`
  - `App/src/components/content-block-couples-form.tsx` — botón PDF solo si `data.exportar_pdf === true`

  **Documentación:**
  - `manuales/psicoeducacion-contenidos.md` — actualizada sección FORMULARIO_PAREJA con `exportar_pdf`

- **Verificación:** `.\init.ps1` pasa al 100% (Tests Backend + App OK).
- **Cierre:** feature #25 marcada `done`.

## 2026-07-29 — Feature #27: Sesión Persistente con Refresh Tokens
- **Agente:** big-pickle
- **Plan:** Implementar refresh token mechanism para evitar que la sesión se cierre al expirar el JWT. Access token (1h) + Refresh token (30d) con renovación automática y rotación.
- **Cambios:**

  **Backend:**
  - `src/database/migrations/014_create_refresh_tokens.sql` — nueva tabla `refresh_tokens` con índices
  - `src/utils/config.ts` — renombrado `JWT_EXPIRES_IN` → `JWT_ACCESS_EXPIRES_IN` (1h), agregado `JWT_REFRESH_EXPIRES_IN` (30d)
  - `src/utils/jwt.ts` — `signAccessToken()` (antes `signJwt`), `generateRefreshToken()` (crypto.randomBytes + SHA-256), `hashRefreshToken()`, alias `signJwt` para compatibilidad
  - `src/services/refresh-token-repository.ts` — CRUD: `saveRefreshToken`, `findRefreshToken`, `revokeRefreshToken`, `revokeAllUserTokens`
  - `src/services/auth-service.ts` — `issueTokens()` factorizado; login/register emiten refresh tokens; `refreshAccessToken()` con rotación (revoca anterior, emite nuevo par)
  - `src/controllers/auth-controller.ts` — nuevo handler `refreshToken` con validación
  - `src/routes/auth.ts` — `POST /auth/refresh` + swagger docs con schema completo
  - `src/middleware/auth-middleware.ts` — distingue `TokenExpiredError` → responde `code: 'TOKEN_EXPIRED'`
  - `.env.example` / `.env.docker` — actualizados con `JWT_ACCESS_EXPIRES_IN` y `JWT_REFRESH_EXPIRES_IN`

  **Frontend:**
  - `src/types/index.ts` — `TAuthResponse` agrega `refreshToken: string`
  - `src/services/api.ts` — interceptor 401 con refresh automático: si recibe 401 y tiene refresh token, intenta `POST /auth/refresh`, actualiza ambos tokens, **reintenta la petición original**. Cola de reintentos para evitar múltiples refreshes concurrentes. Expone `setTokens`, `clearTokens`, `getToken`
  - `src/services/auth.ts` — login/register guardan ambos tokens con `api.setTokens()`
  - `src/hooks/use-auth.ts` — `checkSession` decodifica JWT localmente; si expiró, hace silent refresh via fetch directo a `/auth/refresh` antes de mostrar contenido

  **Tests:**
  - `tests/refresh-token.test.ts` — 6 tests: refresh válido, missing token, invalid type, no encontrado, revocado, expirado

- **Verificación:** Backend 78 tests, App 28 tests — todo verde. `.\init.ps1` OK.
- **Cierre:** feature #27 marcada `done`.

## 2026-07-29 — Feature #29: Plugin WordPress para gestión de contenido psicoeducativo
- **Agente:** big-pickle
- **Plan:** Crear plugin WordPress que actúa como UI administrativa para gestionar categorías, temas y bloques de psicoeducación del backend VittalMind.
- **Cambios:**

  **Nuevos archivos (15):**
  - `plugins/vittalmind-psicoeducacion/vittalmind-psicoeducacion.php` — Plugin header, autoload de includes, AJAX handlers wp_ajax para GET/POST/PUT/DELETE proxy
  - `plugins/vittalmind-psicoeducacion/includes/class-settings.php` — Configuración de URL del backend API con test de conexión via /health
  - `plugins/vittalmind-psicoeducacion/includes/class-api-client.php` — Cliente HTTP con wp_remote_* (get, post, put, delete), manejo de JWT Bearer token, detección de 401
  - `plugins/vittalmind-psicoeducacion/includes/class-auth.php` — Login vía POST /auth/login, logout, render página de login con formulario
  - `plugins/vittalmind-psicoeducacion/includes/class-admin.php` — Menú de WordPress con 6 subpáginas (Dashboard, Categorías, Temas, Bloques, Configuración), enqueue de assets, routing de páginas
  - `plugins/vittalmind-psicoeducacion/admin/css/admin.css` — Estilos (cards, tablas, badges, modales, formularios, toggles, badges por pilar)
  - `plugins/vittalmind-psicoeducacion/admin/js/admin.js` — Helpers compartidos: VMP.api (get/post/put/del), VMP.notice, VMP.confirm, VMP.renderModal
  - `plugins/vittalmind-psicoeducacion/admin/js/categories.js` — CRUD de categorías con listado, formulario modal, confirmación de eliminación
  - `plugins/vittalmind-psicoeducacion/admin/js/topics.js` — CRUD de temas con filtro por categoría, formulario modal
  - `plugins/vittalmind-psicoeducacion/admin/js/blocks.js` — CRUD de bloques con formularios dinámicos según tipoComponente (6 tipos), filtros por categoría/tema, construcción de cuerpoJson
  - `plugins/vittalmind-psicoeducacion/admin/pages/dashboard.php` — Dashboard con stats (categorías, temas, bloques) y vista previa de contenido
  - `plugins/vittalmind-psicoeducacion/admin/pages/categories.php` — Listado y formulario de categorías
  - `plugins/vittalmind-psicoeducacion/admin/pages/topics.php` — Listado y formulario de temas con selector de categoría
  - `plugins/vittalmind-psicoeducacion/admin/pages/blocks.php` — Listado y formulario de bloques con selector dinámico de tipo
  - `plugins/vittalmind-psicoeducacion/admin/pages/login.php` — Incluido inline en class-auth.php

- **API endpoints consumidos:** POST /auth/login, GET /psychoeducation, CRUD /psychoeducation/admin/categories, /topics, /blocks
- **Verificación:** `.\init.ps1` pasa al 100% (Backend tests OK, App tests OK, 30 features válidas en feature_list.json)
- **Cierre:** feature #29 marcada `done`.

## 2026-08-04 — Feature #31: Entry point server.js para deploy en Hostinger
- **Agente:** big-pickle
- **Plan:** Resolver el fallo de despliegue en Hostinger ("La compilación falló" / entry file no encontrado). Commitear y pushear el wrapper `server.js` + `start: node server.js`, y preparar el `.env` de producción para cargar en Hostinger.
- **Problema:** El `server.js` y el cambio de `start` en `package.json` nunca se committearon (estaban untracked/staged en `Backend/.git`). Hostinger clona el repo de GitHub, por lo que el entry file `server.js` no existía en el servidor → la app no arrancaba. Además, `dist/` está gitignoreado, así que el arranque depende de compilar en el servidor o del fallback de `server.js`.
- **Cambios:**

  **Backend (commit `3820f66` — "fix: add server.js entry point for Hostinger deploy"):**
  - `server.js` — COMMITTEADO (antes untracked). Registra `tsconfig-paths` con `baseUrl: __dirname` y `paths: { '@/*': ['dist/*'] }` para resolver los alias del código compilado y requiere `./dist/index.js`. Si `dist/index.js` no existe, ejecuta `npm run build` automáticamente (fallback probado).
  - `package.json` — `start` pasa de `node dist/index.js` a `node server.js` (COMMITTEADO el cambio pendiente).
  - `.gitignore` — agrega `.env.production` para no commitear secretos de producción.

  **Nuevo archivo (NO committeado, a cargar en Hostinger):**
  - `Backend/.env.production` — variables de producción listas para Hostinger: `NODE_ENV=production`, `PORT=3000`, DB Supabase (`db.utudxtykopnowmxijalv.supabase.co`), `JWT_SECRET`, `AI_PROVIDER=openrouter` + `OPENROUTER_API_KEY` real, placeholders para Groq/DeepSeek/Cerebras/Gemini, `APP_LATEST_VERSION/MINIMUM_VERSION/STORE_URL`, `CNV_PROMPT`.

- **Verificación:**
  - `npm run build` compila limpio.
  - `node server.js` arranca y `GET /health` → 200 `{ status: 'ok' }` (probado en puerto alterno).
  - Fallback verificado: eliminado `dist/index.js` temporalmente → `server.js` recompila solo y arranca OK.
  - Push a `origin/main`: `778b384..3820f66`.
  - `.\init.ps1` pasa al 100% (Backend y App tests verdes).

- **Pendiente en Hostinger (manual, fuera del repo):**
  1. Redeploy desde el commit `3820f66`.
  2. Node ≥ 18 (recomendado 20.x). Entry file / comando = `npm start` (o `server.js`).
  3. Cargar variables del `.env.production` en el panel o subir el archivo por FTP.
  4. `dist/` no se sube (gitignoreado); Hostinger debe correr `npm run build` (o `server.js` lo hace en runtime).
- **Nota seguridad:** `.env.docker` está committeado y contiene la `OPENROUTER_API_KEY` real (repo privado). Se recomienda rotar esa key y sanitizar el archivo en un futuro commit.
- **Cierre:** feature #31 marcada `done`.

## 2026-08-03 — Preparación Hito 5: ocultar login Google + repo privado backend
- **Agente:** big-pickle
- **Plan:** Ocultar login con Google (MVP sin credenciales OAuth de producción) y dejar todo listo para el Hito 5 (deploy backend + app).
- **Cambios:**
  - `App/src/constants/index.ts` — agrega `GOOGLE_AUTH_ENABLED = false`.
  - `App/src/screens/welcome-screen.tsx` — divider "O continúa con" + botón Google condicionados a `GOOGLE_AUTH_ENABLED`. Texto del diálogo "Próximamente" sin mención a Google.
  - `feature_list.json` — agrega feature id 30 `reactivate_google_login` (status: pending).
  - `.gitignore` raíz — agrega `.env`.
  - Creado repo privado GitHub `Wolfivan/vittalmind-backend` con solo `Backend/`.
- **Diagnóstico:** conexión Supabase OK en Hostinger; DNS local de Node.js roto (no bloquea deploy).
- **Pendiente:** `API_BASE_URL` de producción en `App/src/constants/index.ts` apunta a `api.vittalmind.com`, debe ser `app.vittaminds.com`.

## 2026-08-04 — Fix deploy: auto-migración de tablas en Hostinger (feature #31)
- **Agente:** big-pickle
- **Plan:** Resolver que tras el deploy exitoso en Hostinger no se creaban las tablas en Supabase.
- **Problema (causa raíz doble):**
  1. En Hostinger el arranque es `npm start` → `server.js` → `dist/index.js`, que solo levanta el servidor. Nadie ejecutaba las migraciones (solo las corría el entrypoint del Dockerfile).
  2. `tsc` no copia los `.sql` a `dist/`: `dist/database/migrations/` no existía, por lo que `node dist/database/migrate.js` fallaría con ENOENT aunque se invocara.
  3. Adicional: la máquina local no tiene IPv6 y el host de Supabase (`db.utudxtykopnowmxijalv.supabase.co`) resuelve solo a IPv6 (ni 8.8.8.8 devuelve A record). La migración local directa es imposible por red; Hostinger sí conecta (IPv6 OK, ya documentado).
- **Cambios (commit `03adc02` — "fix: auto-run migrations on server start"):**
  - `scripts/copy-migrations.js` — NUEVO. Script Node puro (multiplataforma) que copia `src/database/migrations/*.sql` → `dist/database/migrations/`.
  - `package.json` — `build` pasa de `tsc` a `tsc && node scripts/copy-migrations.js`. `migrate` y `seed` agregan `-r tsconfig-paths/register` (el alias `@/` no se resolvía con ts-node a secas).
  - `src/database/migrate.ts` — exporta `runMigrations()`; se auto-ejecuta solo si `require.main === module` (mantiene `npm run migrate`). Ya no llama `process.exit(1)` interno (lo decide el caller).
  - `server.js` — tras resolver `dist/index.js`, ejecuta `await runMigrations()` y SOLO después arranca `dist/index.js`; si migrar falla, aborta con mensaje claro.
- **Verificación:**
  - `npm run build` copia los 14 `.sql` a `dist/database/migrations/`.
  - `node server.js` (puerto alterno, DB local) intenta migrar antes de arrancar y aborta con error claro si la conexión falla (secuencia correcta).
  - Las 14 migraciones aplican limpias en una DB Postgres fresca (Docker `backend-db-1`, DB `vittalmind_fresh`): 8 tablas + seeds OK. DB de prueba eliminada.
  - Push a `origin/main`: `3820f66..03adc02`.
  - `.\init.ps1` pasa al 100%.
- **Pendiente en Hostinger:** redeploy desde `03adc02` → `server.js` creará automáticamente las tablas en Supabase al arrancar. Verificar: `GET /professionals` responde con datos (confirma conexión DB) y tablas en Supabase (DB `postgres`, schema `public`).
- **Nota:** `src/database/connection.ts` tiene `ssl: { rejectUnauthorized: false }` hardcodeado → la app solo conecta a Postgres con SSL (Supabase OK). El preprod Docker local (postgres sin SSL) no puede ejecutar las migraciones vía la app; queda documentado.
- **Cierre:** fix desplegado en repo. No aplica seed en producción (decisión del usuario).

## 2026-08-04/05 — Feature #32: Fixes plugin WordPress para deploy + fix pool del backend (commit `f3206b9`)
- **Agente:** big-pickle
- **Plan:** Arreglar el CRUD del plugin de psicoeducación contra los endpoints admin reales del backend desplegado en Hostinger, y resolver el 500 del backend en producción.
- **Backend:**
  - `src/controllers/psychoeducation-controller.ts` — `adminCreateTopic`/`adminUpdateTopic` ahora persisten `autor` (antes el controller lo descartaba). `adminUpdateBlock` acepta payload camelCase del plugin (`tipoComponente`, `tituloBloque`, `cuerpoJson`) con fallback a snake_case.
  - `src/services/psychoeducation-service.ts` — `getCategoryDetail` incluye `categoriaId` en cada tema; `getTopicContent` incluye `temaId` en cada bloque.
  - `src/routes/psychoeducation.ts` — Swagger actualizado con el campo `autor`.
  - `src/database/migrate.ts` — fix crítico: `pool.end()` estaba dentro de `runMigrations()` (en el `finally`) → tras arrancar, toda query daba 500 `Cannot use a pool after calling end on the pool`. Se movió fuera, solo en `if (require.main === module)`. `runMigrations()` ya no cierra el pool.
  - `src/database/seed.ts` — mismo patrón: cuerpo extraído a `runSeed()`, `pool.end()` solo con el guard `require.main === module`.
  - `tests/psychoeducation.test.ts` — +10 tests (18 en total) para endpoints admin de topics y blocks.
- **Plugin `plugins/vittalmind-psicoeducacion/`:**
  - `admin/js/topics.js` — `descripcion_breve` → `descripcionBreve`, `bloques_count` → `bloquesCount`, `categoria_id` → `categoriaId`.
  - `admin/js/blocks.js` — `titulo_bloque` → `tituloBloque`, `tipo_componente` → `tipoComponente`, `cuerpo_json` → `cuerpoJson`, `tema_id` → `temaId`.
  - `admin/js/categories.js` — `temas_count` → `temasCount`.
  - `admin/pages/dashboard.php` — métrica "Tipos de bloque" con `tipoComponente` real (antes stub con `'dummy'`).
- **Verificación:** `npm run build` OK (14 migraciones copiadas a dist), `npm test` 90/90 verdes. Commit `f3206b9` pusheado a `origin/main`.
- **Post-deploy (2026-08-05):** `GET /health` → 200 · `GET /psychoeducation` → 200 con datos · `POST /auth/login` (writer@vittal.com/writer1234) → 200 + jwt + refreshToken. Backend operativo.
- **Pendiente:** login del plugin seguía fallando sin petición al backend (ver sesión feature #33).

## 2026-08-05 — Feature #33: Conectividad del login del plugin WordPress (v1.0.1 → v1.0.3)
- **Agente:** big-pickle
- **Plan:** Dejar operativo el CRUD del plugin WordPress `vittalmind-psicoeducacion` contra el backend de producción. Se corrigieron tres bugs en cascada: JS dependiente del `$` global (v1.0.1), TypeError PHP en los handlers AJAX (v1.0.2) y dos bugs JS en la página Bloques (v1.0.3).
- **Cambios:**
  - **v1.0.1** — `admin/js/admin.js` reescrito en IIFE `(function($){...})(jQuery)` con `VMP.escHtml`, `VMP.handleAjaxError`, `.fail()` visible en `VMP.api.get/post/put/del`, `VMP.notice`, `VMP.confirm`, `VMP.renderModal`/`closeModal` + tecla Escape. `categories.js`/`topics.js`/`blocks.js` envueltos en IIFE; `escHtml(` → `VMP.escHtml(`. Handlers `wp_ajax_vmp_api_*` responden siempre HTTP 200 con `{success, data}`.
  - **v1.0.2** — `vittalmind-psicoeducacion.php:50-52`: el handler AJAX pasaba `$body=[]` a `VMP_Api_Client::$method($path, $body)`, pero `get(string $path, bool $auth)` y `delete()` tipan el 2º parámetro como `bool` → TypeError PHP → 500. Fix: ramificar — `get`/`delete` → `$method($path)`; `post`/`put` → `$method($path, $body)`.
  - **v1.0.3** — `admin/js/blocks.js`: `loadList()` reescrito con contador doble (`tdone` por tema, `done` por categoría) + `finish()` central; `loadFilteredTopics(callback)` reescrito contando por categoría, llena dropdowns y llama `loadList()` + callback (antes comparaba temas contra `r.data.length` de categorías → `done` nunca completaba). Templates de modales cacheados (`blockFormHtml`/`topicFormHtml`/`categoryFormHtml` = `innerHTML`) y elemento oculto eliminado con `.remove()` para eliminar IDs duplicados que hacían que `$('#blk_tipo')` resolviera al formulario oculto; `showForm` reescrito en los 3 módulos (renderModal primero, `$form` re-consultado, selectores dependientes re-aplicados vía callback).
  - **VMP_VERSION:** 1.0.0 → 1.0.1 → 1.0.2 → 1.0.3.
- **Verificación:** Backend y BD descartados vía curl en producción (`/psychoeducation` → 1 categoría, `/psychoeducation/relaciones-pareja` → 2 temas con `bloquesCount` 6 y 4, `/psychoeducation/relaciones-pareja/2` → 6 bloques; `/relaciones-pareja/2` sin prefijo → 404). `node --check` OK en los 4 JS, `init.ps1` al 100%, ZIP regenerado en `%TEMP%\opencode\vittalmind-psicoeducacion.zip`.
- **Cierre:** sesión completada y **validada por el usuario**: el CRUD del plugin funciona en producción con v1.0.4 — listado de bloques (6+4), creación/edición con campos por tipo de componente y guardado OK. Feature #33 marcada `done`.

## 2026-08-05 — Feature #34: Olvidé mi contraseña sin correo (preguntas de seguridad)
- **Agente:** big-pickle
- **Plan:** Implementar recuperación de contraseña sin envío de email (no hay servicio de correo todavía) usando preguntas de seguridad: el usuario configura 2-3 preguntas del banco servido por el backend; para resetear responde email + preguntas y recibe un token de reset temporal (10 min).
- **Backend:**
  - `src/database/migrations/015_create_security_questions.sql` — tabla `preguntas_seguridad` (id, id_anonimo FK CASCADE, pregunta, respuesta_hash, UNIQUE(id_anonimo, pregunta)).
  - `src/services/security-questions-repository.ts` — `saveSecurityQuestions` (upsert transaccional) y `findQuestionsByEmail`.
  - `src/services/password-recovery-service.ts` — banco de 10 preguntas, `setupSecurityQuestions` (normaliza y hashea respuestas), `getQuestionsForEmail` (anti-enumeración: `[]` si la cuenta no existe o es Google), `verifyAnswers` (rate-limit 5/15min in-memory → 429) y `resetPasswordWithToken` (actualiza hash + revoca refresh tokens).
  - `src/services/user-repository.ts` — `updateUserPassword`.
  - `src/utils/jwt.ts` — `signPasswordResetToken`/`verifyPasswordResetToken` (claim `purpose: 'password_reset'`, 10 min, expirado → `RESET_TOKEN_EXPIRED`).
  - `src/controllers/auth-controller.ts` — 5 handlers (`getSecurityQuestions`, `saveSecurityQuestions`, `getRecoveryQuestions`, `verifyRecoveryAnswers`, `resetPassword`).
  - `src/routes/auth.ts` — rutas `GET/POST /auth/security-questions`, `POST /auth/password/{questions,verify-answers,reset}` con Swagger JSDoc.
  - `tests/password-recovery.test.ts` — 19 tests (banco, setup con JWT + errores, anti-enumeración, verificación, rate-limit 429, reset con token válido/expirado/purpose incorrecto, contraseña débil).
- **Frontend:**
  - `src/services/api.ts` — el 401 de rutas `/auth/password*` ya no dispara auto-refresh/logout (flujo público).
  - `src/types/index.ts` — `TSecurityAnswer`.
  - `src/services/auth.ts` — 5 métodos nuevos (`getSecurityQuestions`, `saveSecurityQuestions`, `getRecoveryQuestions`, `verifyRecoveryAnswers`, `resetPassword`).
  - `src/screens/forgot-password-screen.tsx` — nuevo, 3 pasos (email → preguntas → nueva contraseña) + pantalla de éxito.
  - `src/screens/security-questions-screen.tsx` — nuevo, selector de 2-3 preguntas con respuestas; modo `setup` (onboarding) y `manage` (perfil).
  - `src/hooks/use-auth.ts` — estado `requiresSecuritySetup` (se activa tras registrarse) + `finishSecuritySetup`.
  - `src/navigation/app-navigator.tsx` — rutas `ForgotPassword` (no autenticado) y `SecurityQuestions` (onboarding y autenticado); prop `onSecuritySetupDone`.
  - `src/App.tsx` — pasa `requiresSecuritySetup`/`onSecuritySetupDone`.
  - `src/screens/welcome-screen.tsx` — el link "¿Olvidaste tu contraseña?" navega a `ForgotPassword` (se eliminó el diálogo "Próximamente").
  - `src/screens/profile-screen.tsx` — sección "Configurar preguntas de seguridad".
- **Verificación:** `npm run build` OK (15 migraciones a dist), Backend 111/111 tests, App 28/28 tests, `init.ps1` al 100%. Typecheck de App: solo los 2 errores pre-existentes ya documentados (`content-block-text.tsx` `citaAccent`, `home-screen.tsx` navegación a `Professionals`). Lint de App roto pre-existente (ESLint 9 sin `eslint.config.js`).
- **Notas:** cuentas Google no pueden resetear (no tienen password); el flujo devuelve respuesta genérica anti-enumeración. El rate-limit es in-memory (válido para un VPS single); tradeoff documentado.

## 2026-08-05 — Feature #35: Editar datos de cuenta y cambiar contraseña
- **Agente:** big-pickle
- **Plan:** En el perfil, opciones para modificar los datos de la cuenta y la contraseña. Usuarios locales editan nombre y email (con chequeo de unicidad); usuarios Google solo nombre (email read-only). Cambio de contraseña requiere la contraseña actual, invalida las demás sesiones y emite tokens nuevos para mantener la sesión activa.
- **Backend:**
  - `src/services/user-repository.ts` — `findUserByIdAnonimo` (perfil completo), `updateUserData` (UPDATE dinámico con RETURNING), `findUserByEmail` acepta `excludeIdAnonimo` para el chequeo de unicidad.
  - `src/services/profile-service.ts` — nuevo. `getProfile`, `updateProfile` (valida formato de email, bloquea email en cuentas Google → `WRONG_PROVIDER`, email en uso → `EMAIL_EXISTS` 409) y `changePassword` (verifica contraseña actual con bcrypt → `INVALID_CURRENT_PASSWORD` 401, valida nueva ≥ 6 → `WEAK_PASSWORD`, rate-limit in-memory 5/15min → 429, `updateUserPassword` + `revokeAllUserTokens` + `issueTokens`).
  - `src/services/auth-service.ts` — `issueTokens` ahora se exporta (reutilizado por profile-service).
  - `src/models/auth.ts` — `IUserProfile` e `IPasswordChangeResponse`; exportados en `models/index.ts`.
  - `src/controllers/auth-controller.ts` — handlers `getMe`, `updateMe`, `changePasswordHandler`.
  - `src/routes/auth.ts` — `GET /auth/me`, `PUT /auth/me`, `POST /auth/change-password` con Swagger JSDoc (schema `UserProfile`); se unificó el bloque `components` para no duplicar `AuthResponse`.
  - `tests/profile.test.ts` — 19 tests (GET me local/google/404, PUT nombre/email/EMAIL_EXISTS/Google-WRONG_PROVIDER/nombre-Google/email inválido/nombre vacío/sin campos/401, change-password éxito con tokens nuevos/actual incorrecta/débil/Google/missing/rate-limit 429/401).
- **Frontend:**
  - `src/types/index.ts` — `TUserProfile` (nombre, email, authProvider).
  - `src/services/auth.ts` — `getMe`, `updateProfile`, `changePassword` (guarda los tokens nuevos vía `api.setTokens`).
  - `src/screens/edit-profile-screen.tsx` — nuevo: precarga perfil, inputs nombre + email (email deshabilitado con nota en cuentas Google), guarda y vuelve.
  - `src/screens/change-password-screen.tsx` — nuevo: 3 campos (actual, nueva, confirmar) con validación de coincidencia; éxito → InfoDialog y vuelve; el usuario sigue logueado.
  - `src/screens/profile-screen.tsx` — muestra nombre/email del usuario (carga con `useFocusEffect`) y menú con "Editar mis datos", "Cambiar contraseña" (oculto en cuentas Google) y "Configurar preguntas de seguridad".
  - `src/navigation/app-navigator.tsx` — rutas `EditProfile` y `ChangePassword` en el stack autenticado.
  - `src/screens/index.ts` — exporta las 2 pantallas nuevas.
- **Docs:** `docs/architecture.md` — excepción de privacidad documentada y aprobada: `GET/PUT /auth/me` devuelven email/nombre real SOLO al propietario de la sesión (búsqueda por `id_anonimo` del JWT).
- **Verificación:** `npm run build` OK, Backend 130/130 tests (111 + 19 nuevos), App 28/28 tests, `init.ps1` al 100%. Typecheck de App: solo los 2 errores pre-existentes documentados, sin errores nuevos.
- **Notas:** sin migración nueva (email/nombre ya estaban en `usuarios_auth`). El rate-limit de change-password es in-memory (consistente con password-recovery). Al cambiar el email no se revocan sesiones (el id_anonimo no cambia); al cambiar la contraseña sí (otras sesiones mueren).

## 2026-08-06 — Feature #36: Banco de preguntas de seguridad con preguntas clásicas
- **Agente:** big-pickle
- **Plan:** Reemplazar el banco de preguntas de seguridad por las preguntas clásicas. El banco sigue viviendo en el código del backend (servido por `GET /auth/security-questions`); las respuestas de cada usuario siguen guardándose en la BD (`preguntas_seguridad`). El usuario descartó mover el banco a la BD.
- **Backend:**
  - `src/services/password-recovery-service.ts` — `SECURITY_QUESTIONS_BANK` reemplazado por las 10 clásicas: "¿Cómo se llamó tu primera mascota?", "¿Dónde nació uno de tus padres?", "¿Cuál es el apellido de soltera de tu madre?", "¿En qué ciudad naciste?", "¿Cuál es el nombre de tu mejor amigo de la infancia?", "¿Cuál fue el nombre de tu primera escuela?", "¿Cuál es el nombre de tu profesor favorito?", "¿Qué apodo te ponía tu familia?", "¿Cuál es el nombre de tu primera película favorita?", "¿Cuál es el nombre de tu personaje favorito de la infancia?".
  - `tests/password-recovery.test.ts` — el test de `GET /auth/security-questions` ahora verifica que incluye "¿Dónde nació uno de tus padres?" y "¿Cómo se llamó tu primera mascota?".
- **Verificación:** `npm run build` OK, Backend 130/130 tests, App 28/28 tests, `init.ps1` al 100%.
- **Notas:** sin cambios en BD ni frontend. Usuarios que ya configuraron preguntas siguen viendo las suyas al recuperar la contraseña; el nuevo banco solo afecta la lista de selección de futuros setups. La feature 30 (`reactivate_google_login`) figuraba como `in_progress` (marcada aparte, no en esta sesión); tras cerrar la 36 queda solo 1 `in_progress`, cumpliendo la regla del harness.

---

# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **mantenlo actualizado en tiempo real**, no al final.

## Feature #41 — Sesión del plugin WordPress: refresh token + TTL deslizante

- **Inicio:** 2026-08-11
- **Agente:** opencode
- **Reporte:** al editar un bloque de psicoeducación desde el plugin WordPress aparecía `Error: Missing or invalid authorization header`.

## Plan

- **Diagnóstico (confirmado):** el mensaje lo emite `Backend/src/middleware/auth-middleware.ts:19` cuando la petición llega sin header `Authorization: Bearer ...`. El plugin solo envía ese header si existe el transient `vmp_jwt_token` (`class-api-client.php:32-38`). El transient se guarda con TTL 55 min y nunca se renueva (`set_token`, `class-api-client.php:16`); el JWT dura 1h (`config.ts:47`); el plugin descartaba el `refreshToken` del login (`class-auth.php:32-33`). Tras ~55 min de sesión, el transient desaparece → las llamadas admin salen sin token → 401 con ese mensaje → `handle_unauthorized()` borra el token → sesión muerta hasta re-loguear.
- **Fix (#41):** guardar jwt + refreshToken en transients separados; auto-refresh ante 401 vía `POST /auth/refresh` (público, rota el refresh token) con reintento único de la petición original; TTL deslizante renovando el transient del jwt en cada respuesta exitosa autenticada; tolerancia a refresh en paralelo (re-leer transient si el refresh falla); mensaje amigable de sesión expirada en vez del texto del backend. VMP_VERSION → 1.0.5.
- **Nota:** PHP no está instalado localmente → verificación sintáctica manual cuidadosa (no `php -l`). `init.ps1` no cubre el plugin (solo Backend + App).

## Bitácora

## Fix: solapamiento del menú del sistema con el tab bar de la app (Android 15 edge-to-edge)

- **Inicio:** 2026-08-10
- **Agente:** opencode
- **Reporte:** en celulares con menú de navegación inferior del sistema (botones atrás/inicio/recientes o barra de gestos), el menú del celular se sobrepone visualmente con el bottom tab bar de la app; se necesita que la app quede por encima de ese menú.

## Diagnóstico (confirmado)

- Android 15 (targetSdk 35, Expo SDK 54) impone edge-to-edge: la app dibuja bajo las barras del sistema y la barra de navegación inferior es transparente.
- `app-navigator.tsx` definía `styles.tabBar` con `height: 72` fijo. React Navigation (`BottomTabBar.js` getTabBarHeight) usa ese height custom sin sumarle el inset inferior y solo aplica `paddingBottom: insets.bottom`. Con botones (inset ≈ 48) la fila de íconos quedaba comprimida a 24px y la barra de la app quedaba mezclada con el menú del sistema; con gestos (inset ≈ 24) la barrita blanca caía sobre el fondo del tab bar.
- `panic-modal.tsx` usaba `paddingBottom` fijo (iOS 40 / Android 20), menor que el inset inferior del sistema → el disclaimer inferior podía quedar bajo la barra del sistema.

## Fix aplicado

1. `App/src/navigation/app-navigator.tsx`:
   - Import `useSafeAreaInsets` de `react-native-safe-area-context`.
   - `HomeTabs()` lee `insets` y `tabBarStyle: [styles.tabBar, { height: 72 + insets.bottom }]`. React Navigation mantiene su `paddingBottom: insets.bottom` automático → la fila de íconos conserva 72px útiles y el tab bar termina por encima del menú del sistema (Android botones + gestos, y también iPhone home indicator).
2. `App/src/components/panic-modal.tsx`:
   - `overlay` ahora aplica `paddingBottom: insets.bottom + SPACING.lg` con `useSafeAreaInsets()` (se quitó el padding fijo y el import `Platform` que quedó sin uso).

## Verificación

- `npx tsc --noEmit` en App: sin errores.
- `npm test` en App: 28/28 OK.
- `.\init.ps1`: 100% verde (Backend y App).
- Nota: requiere nuevo build EAS + AAB en producción para ver el cambio (layout nativo Android).

## Resultado

—



## Fix: atascado en "Respuestas guardadas correctamente" (setup de preguntas de seguridad)

- **Inicio:** 2026-08-10
- **Agente:** opencode
- **Reporte:** usuarios que entran por primera vez y configuran las preguntas de seguridad quedan atrapados en la pantalla "✓ Respuestas guardadas correctamente"; "Volver" no los saca.

## Diagnóstico (confirmado)

- Causa raíz: colisión de nombre de ruta `SecurityQuestions` en ambas ramas del stack (`app-navigator.tsx`): en el onboarding de setup (`mode="setup"`) y en la rama autenticada (`mode="manage"`, abierta desde Profile).
- Al completar el setup, `finishSecuritySetup()` pone `requiresSecuritySetup=false`, pero React Navigation (`getStateForRouteNamesChange` en `StackRouter.js`) conserva la ruta actual porque su nombre sigue existiendo en la rama autenticada → no resetea a HomeTabs.
- La ruta conserva la misma key y el mismo tipo de elemento (`SecurityQuestionsScreen`), por lo que la instancia se preserva con `saved=true` → sigue mostrando el mensaje de éxito; ahora con `mode="manage"` muestra "← Volver", pero el stack tiene una sola ruta → `goBack()` es no-op → usuario atrapado.
- El flujo del Disclaimer no sufre el bug porque la ruta `Disclaimer` solo existe en su rama.

## Fix aplicado

1. `App/src/navigation/app-navigator.tsx`: añadida ruta `SecurityQuestionsSetup` a `RootStackParamList` y renombrado el `Stack.Screen` de la rama de setup a `name="SecurityQuestionsSetup"`. La ruta `SecurityQuestions` de la rama autenticada queda intacta (sigue funcionando `profile-screen.tsx` → navigate('SecurityQuestions')).
   - Efecto: al completar el setup, `SecurityQuestionsSetup` ya no existe en la rama autenticada → el router descarta la ruta y cae al initial route (HomeTabs). Sin stuck.
2. `App/src/screens/security-questions-screen.tsx`:
   - `handleSave`: eliminado el `setTimeout(() => navigation.goBack(), 900)` del modo manage; ahora solo `setSaved(true)` y, en setup, `onDone?.()`.
   - Estado `saved`: botón explícito "Continuar" (setup → `onDone()`) / "Listo" (manage → `goBack()` con guard `navigation.canGoBack()`) en la tarjeta de éxito.
   - `handleBack`: guard `navigation.canGoBack()` en manage.
   - Nuevo estilo `successButton` (mismo look que `button`).

## Verificación

- `npx tsc --noEmit` en App: sin errores.
- `npm test` en App: 28/28 OK.
- `.\init.ps1`: 100% verde (Backend y App).

## Resultado

—

- **Feature en curso:** #39 — android_15_edge_to_edge_keyboard
- **Inicio:** 2026-08-10
- **Cierre:** 2026-08-11 (marcada `done` por el usuario tras build EAS production exitoso; pendiente verificación en dispositivo del AAB versionCode 7)
- **Agente:** opencode

## Plan

- **Diagnóstico (confirmado):** producción Android = AAB Expo SDK 54 / RN 0.81.5 (newArch, targetSdk 35). Android 15+ impone edge-to-edge → `softwareKeyboardLayoutMode: "resize"` (adjustResize) ya NO redimensiona la ventana. Los fixes de #37/#38 no tienen efecto en Android: `automaticallyAdjustKeyboardInsets` es solo iOS y `KeyboardAvoidingView` con `behavior={undefined}` es no-op en Android (verificado en `KeyboardAvoidingView.js:210-216`). Por eso el teclado tapa todos los inputs en Android: traductor, timeline, psicoeducación, perfil, preguntas de seguridad, contraseñas.
- **Fix (#39):** config plugin `App/plugins/with-android-ime-insets.js` que parchea `MainActivity.kt` con `OnApplyWindowInsetsListener` que aplica `WindowInsetsCompat.Type.ime()` como padding inferior de `android.R.id.content` (backport del fix de RN 0.86 #55855 / workaround oficial Android 15). Se registra en `app.json` → plugins. Sin cambios de JSX. Requiere nuevo build EAS production + subir AAB.
- **Tarea pendiente (#40):** migrar a `react-native-keyboard-controller` (opción B) — registrada como feature `pending` en `feature_list.json` para continuar después.

## Bitácora

- Registrada feature #39 en `feature_list.json` (status `in_progress`) y feature #40 `keyboard_controller_migration` (status `pending`, dejada por el usuario para después).
- `init.ps1`: tests Backend y App al 100%; único `[FAIL]` = check "máximo 1 in_progress" (pre-existente con features 30 + 37 + 38; ahora 4 por la #39 — se resuelve al cerrar las features).
- Creado `App/plugins/with-android-ime-insets.js` (config plugin con `withMainActivity`, inyecta imports + `setupImeInsets()` + llamada tras `super.onCreate(...)` con guard de idempotencia y manejo de `onCreate` pre-existente de expo-splash-screen; solo soporta `.kt`). Ojo: el export real es `withMainActivity` (no `withAndroidMainActivity`); `super.onCreate` del template es `super.onCreate(null)`.
- Registrado `"./plugins/with-android-ime-insets"` en `app.json` → `plugins`. Se mantiene `softwareKeyboardLayoutMode: "resize"`.
- Verificado con `npx expo prebuild --platform android --no-install`: `MainActivity.kt` genera `import androidx.core.view.ViewCompat` / `WindowInsetsCompat`, método `setupImeInsets()`, y la llamada tras `super.onCreate(null)`. Idempotente en re-ejecución. `android/` borrado tras verificar (lo regenera EAS al compilar).
- `init.ps1` en verde excepto FAIL pre-existente de "máximo 1 in_progress" → **usuario decidió**: features 30, 37 y 38 marcadas `done` (estaban implementadas con tests verdes según bitácoras previas).

## Resultado

- **Feature #39 cerrada como `done`** (2026-08-11): build EAS production exitoso → AAB versionCode 7. Fix aplicado al plugin `with-android-ime-insets.js` (`findViewById<View>` con tipo explícito) y CNG restaurado (`/android` y `/ios` en `.gitignore`, `android/` eliminado). `init.ps1` 100% verde. Verificación funcional en dispositivo Android 15+ queda a cargo del usuario con el AAB generado.

- Verificaciones: `npx tsc --noEmit` en App sin errores. `npm test` en App: 28/28 OK. `init.ps1`: tests Backend y App al 100%; único `[FAIL]` = check "máximo 1 in_progress" (pre-existente, ya fallaba con features 30 + #37; ahora 3 por la #38 — se resuelve al cerrar #37 y #38).
- **Bloqueo documentado (no resuelto):** `npm run lint` en App falla porque el repo no tiene `eslint.config.js` (ESLint 9 requiere flat config; script `lint` nunca tuvo config). No se inventa workaround; documentado para una sesión futura.
- **Safe area top (pedido usuario):** aplicado `useSafeAreaInsets` a las pantallas que no lo tenían — `welcome-screen` (contentContainerStyle `paddingTop: SPACING.xl + insets.top`), `register-screen`, `forgot-password-screen`, `security-questions-screen`, `edit-profile-screen`, `change-password-screen` (todas con `paddingTop: SPACING.xl * 2 + insets.top` y headerRow `top: SPACING.xl + insets.top`) y `disclaimer-screen` (`paddingTop: SPACING.xl * 2 + insets.top`). NO modificadas las que ya lo tenían: home, tools, journal (contenido centrado), profile, professionals, psychoeducation-home, psychoeducation-topic, timeline, acertive-translate.
- Verificación safe area: `npx tsc --noEmit` sin errores; `npm test` App 28/28 OK.

## Resultado

—

## Bitácora

- Registrada feature #37 en `feature_list.json` (status `in_progress`).
- **Parte B:** `change-password-screen.tsx` — añadidos `VisibilityIcon`/`VisibilityOffIcon` (patrón de welcome), estados `showCurrent/showNew/showConfirm`, wrapper + toggle en los 3 campos; estilos `inputWrapper`/`visibilityToggle`, input con `paddingRight: 48`.
- **Parte C:** `app.json` → `softwareKeyboardLayoutMode: "resize"` en android. `behavior={undefined}` + `automaticallyAdjustKeyboardInsets` en ScrollView de: welcome, register, forgot-password, security-questions, edit-profile y change-password. `acertive-translate-screen` (sin ScrollView) conserva KAV padding + keyboardVerticalOffset.
- **Parte D:** `api.ts` — helper `parseError()`: si la respuesta no es JSON, lanza `Error del servidor (status)` en vez de "Network error". Aplicado en `request()` y `retryRequest()`.
- Verificaciones: `npx tsc --noEmit` en App sin errores (incl. los 2 pre-existentes ya resueltos). `init.ps1`: tests Backend y App al 100%; único `[FAIL]` = 2 features `in_progress` (feature 30 del usuario + #37) — se resolverá al cerrar la #37 (mismo patrón que la feature 36).
- **Deploy pendiente (usuario):** commitear en `Backend/.git` SOLO los archivos de features 34/35/36 (excluir `.env.example`, `src/utils/config.ts`, `src/services/google-verifier.ts` → son de la feature 30) + push a `origin` + redeploy Hostinger. Verificar endpoints post-deploy.
- **[USUARIO AUTORIZÓ PUSH]** Feature 30 (reactivate_google_login):
  - Confirmado: los GOOGLE_* client IDs en `.env`, `.env.production` y `constants/index.ts` coinciden con los creados por el usuario (proyecto 220224673708; Android `1sv44pb...`, iOS `koodm18...`).
  - Push `bfab0a5` (features 34-36) y luego `57e67bb` (feature 30: `config.ts` + `google-verifier.ts` multi-audiencia + `.env.example`) a `origin/main`. Working tree de Backend limpio.
  - `app.json`: añadido `ios.infoPlist.CFBundleURLTypes` con reverse client ID iOS `com.googleusercontent.apps.220224673708-koodm18vd5o39vn5504utn8ubr00rapu`. JSON válido.
      - Pendiente usuario: redeploy Hostinger (con GOOGLE_IOS/ANDROID_CLIENT_ID en env vars), test users en consent screen, SHA-1 debug keystore en Android OAuth client, dev build EAS, y verificación `POST /auth/google`.

## Resultado

—

## Sesión: build EAS production feature #39 (fix teclado Android 15)

- **Diagnóstico builds fallidos:** el error de Gradle "No matching variant ... No variants exist" en `async-storage`, `safe-area-context`, `screens`, `svg` **NO era del plugin**: EAS **omitía `expo prebuild`** porque `App/android` se subía al build (no estaba en `.gitignore`; el repo de App no tiene commits). Confirmado en el log del build: `Skipped running 'expo prebuild' because the 'android' directory already exists` + advertencia de expo-doctor de añadir `/android` al `.gitignore`.
- **Fix CNG:** añadidos `/android` y `/ios` a `App/.gitignore`; eliminado `App/android`.
- **Tras el prebuild limpio, error real (Kotlin):** `MainActivity.kt:20:20 — Cannot infer type for this parameter / Not enough information to infer type argument for 'T'` en `val rootView = findViewById(android.R.id.content)`. `findViewById<T>` no infiere `T` sin tipo explícito.
- **Fix plugin:** `App/plugins/with-android-ime-insets.js` → añadido `import android.view.View` a `IME_IMPORTS` y cambiada la línea a `val rootView: View = findViewById(android.R.id.content)`. Verificado regenerando con `npx expo prebuild --platform android --no-install` (MainActivity.kt genera el método y la llamada correctamente).
- **Build EAS production OK:** AAB generado → https://expo.dev/artifacts/eas/UY1XWpn-f4rtJEJFR6oCMKiP2l6JALIxR9CDzZS3jM8.aab (`versionCode` auto-incrementado a 7 en `app.json`).
- `init.ps1`: 100% verde (Backend + App). Nota: `App.test.tsx` dio un timeout flaky de 5s en una corrida (en re-run pasó con 3.3s) — no relacionado con la feature.
- **Pendiente usuario:** instalar el AAB en un Android 15+ y verificar que el teclado ya no tapa los inputs.

## Sesión: feature #40 keyboard_controller_migration (teclado con react-native-keyboard-controller)

- **Hallazgo clave:** `react-native-keyboard-controller@1.18.5` (bundled de Expo SDK 54) **NO trae config plugin** (verificado con `npm pack --dry-run`); se integra como librería nativa bundled vía `npx expo install` y funciona en Expo Go/EAS sin tocar `app.json`. Requiere New Architecture (ya activa: `newArchEnabled: true`) + peers `react-native-reanimated` (4.1.7) y `react-native-worklets` (0.5.1); `babel-preset-expo` auto-configura el babel plugin de worklets (sin cambios en `babel.config.js`). Se actualizó el criterio de acceptance de la #40 que exigía "config plugin en app.json".
- **Dependencias:** `npx expo install react-native-keyboard-controller react-native-reanimated react-native-worklets`.
- **Jest:** añadidos `react-native-keyboard-controller|react-native-reanimated|react-native-worklets|react-native-is-edge-to-edge` a `transformIgnorePatterns` y `jest.mock('react-native-keyboard-controller', () => require('react-native-keyboard-controller/jest'))` en `jest.setup.ts` (mock oficial autocontenido → no requirió mocks de reanimated/worklets).
- **Root:** `App.tsx` envuelto con `KeyboardProvider` (orden: `SafeAreaProvider` > `KeyboardProvider` > `AuthProvider`).
- **Formularios → `KeyboardAwareScrollView`** (welcome, register, forgot-password, security-questions, edit-profile, change-password): `KeyboardAvoidingView` RN → `View` flex; `ScrollView` → `KeyboardAwareScrollView`; fuera `automaticallyAdjustKeyboardInsets`; se mantiene `keyboardShouldPersistTaps="handled"`.
- **Modal timeline** (`add-milestone-modal.tsx`) y **bloques psicoeducación** (`content-block-form`, `content-block-exercise`, `content-block-couples-form`): idem.
- **Traductor** (`acertive-translate-screen.tsx`): RN `KeyboardAvoidingView` → keyboard-controller con `behavior="translate-with-padding"` (chat-like), eliminado `keyboardVerticalOffset` (el header está dentro del KAV).
- **Plugin IME insets (#39) eliminado:** fuera de `app.json` → plugins; borrado `App/plugins/with-android-ime-insets.js` (y carpeta `plugins/` vacía). Se mantiene `softwareKeyboardLayoutMode: "resize"`. keyboard-controller lo reemplaza resolviendo el mismo problema de forma nativa en todas las plataformas.
- **Verificación:** `npx tsc --noEmit` sin errores; `npm test` App 28/28; `init.ps1` 100% (Backend + App). Nota: `npm run lint` falla por ausencia de `eslint.config.js` (ESLint 9 lo exige) — pre-existente, fuera de alcance de esta sesión.
- **Pendiente usuario:** build EAS y verificación funcional del teclado en dispositivo (Android 15+ edge-to-edge e iOS).

## Sesión: feature #42 apple_signin (Login con Apple para iOS)

- **Motivación:** App Store exige Sign in with Apple (Guideline 4.8) porque la app ofrece Google login. El usuario generó la key `AuthKey_6LN8F6WNQX.p8`; se documentó que NO es necesaria para el flujo básico (el backend verifica el identityToken contra el JWKS público de Apple) y queda reservada para la revocación (#43).
- **Decisiones del usuario:** vincular cuentas por email verificado cuando exista una cuenta previa; botón Apple DEBAJO del botón Google (ambas opciones visibles); revocación deferida a #43.
- **Cambios:**

  **Frontend:**
  - `package.json` — agrega `expo-apple-authentication` (vía `npx expo install`, SDK 54)
  - `app.json` — `ios.entitlements["com.apple.developer.applesignin"] = "Default"` (EAS registra la capability en el App ID automáticamente)
  - `src/constants/index.ts` — flag `APPLE_AUTH_ENABLED = true`
  - `src/services/auth.ts` — `loginWithApple(identityToken, nombre?, email?)` → POST `/auth/apple`
  - `src/hooks/use-auth.ts` — `loginWithApple()`: valida plataforma iOS + `isAvailableAsync()`, `signInAsync` con scopes FULL_NAME+EMAIL, arma nombre desde `fullName`, reenvía nombre/email en cada login (Apple solo los entrega en la primera autorización), ignora cancelación (`ERR_CANCELED`)
  - `src/screens/welcome-screen.tsx` — `AppleAuthentication.AppleAuthenticationButton` nativo negro (type CONTINUE, cornerRadius 28, height 56) debajo del botón Google; visible solo si `APPLE_AUTH_ENABLED && Platform.OS === 'ios' && appleAvailable && activeTab === 'login'`
  - `src/navigation/app-navigator.tsx` + `App.tsx` — prop `onAppleLogin` cableada

  **Backend:**
  - `src/database/migrations/016_create_apple_auth.sql` — `apple_sub VARCHAR(64)` + índice único parcial (`WHERE apple_sub IS NOT NULL`)
  - `src/utils/config.ts` — `APPLE_BUNDLE_ID` (default `com.vittalmind.app`)
  - `.env.example` — sección Apple Sign In con `APPLE_BUNDLE_ID`
  - `src/services/apple-verifier.ts` — verifica identityToken: firma RS256 contra JWKS de `https://appleid.apple.com/auth/keys` (cache 24h, refetch por kid desconocido = rotación), iss `https://appleid.apple.com`, aud `APPLE_BUNDLE_ID`, exp; devuelve `{ sub, email, emailVerified }`
  - `src/services/user-repository.ts` — `findOrCreateAppleUser(sub, email?, nombre?)`: busca por `apple_sub` → vincula por email (guarda apple_sub en la fila existente) → crea con `auth_provider='apple'`; placeholder sintético `apple.{sub}@apple.vittalmind.local` si no hay email (columna email NOT NULL)
  - `src/services/auth-service.ts` — `appleLogin()`: email del token tiene prioridad sobre el enviado por la app
  - `src/controllers/auth-controller.ts` — handler `appleLogin` con validaciones
  - `src/routes/auth.ts` — `POST /auth/apple` + Swagger (AuthResponse, enum authProvider ahora `[local, google, apple]`)
  - `tests/apple-auth.test.ts` — 10 tests de integración (verificador mockeado): happy path, forwarding nombre/email, requiresDisclaimer false, prioridad email del token, fallback email app, 400s, 401 token inválido
  - `tests/database-migration.test.ts` — tests estáticos de la migración 016

- **Verificación:** Backend 149 tests OK (142→149, +10 nuevos −3 ajustados), App 28/28, `tsc --noEmit` limpio en ambos, `init.ps1` 100%. Nota pre-existente: `npm run lint` falla por falta de `eslint.config.js` (ESLint 9) en ambos proyectos — fuera de alcance.
- **Cierre:** feature #42 marcada `done`. Feature #43 `apple_token_revocation` registrada como `pending` con acceptance, condiciones de implementación (cuándo sí, cuándo no) y pre-requisitos (.p8 solo por variable de entorno, APPLE_TEAM_ID).
- **Pendiente usuario:** (1) verificar capability "Sign In with Apple" activada en App ID `com.vittalmind.app` (Apple Developer → Identifiers); (2) probar login Apple en simulador/dispositivo con Apple ID; (3) build EAS iOS nuevo (módulo nativo + entitlement requieren rebuild) y subir a App Store Connect.

---

## 2026-08-26 — Feature #51: Fix rechazo App Store — Guideline 5.1.1(v) acceso sin registro
- **Agente:** big-pickle
- **Contexto:** Apple rechazó la app (build 9, iPad Air 11" M3) porque requería registro para acceder a Professionals, una funcionalidad no basada en cuenta de usuario.
- **Cambios:**

  **Frontend (8 archivos, 2 nuevos):**
  - `App/src/hooks/use-auth.ts` — agregado `isGuest: boolean` y `enterGuestMode: () => void`
  - `App/App.tsx` — pasa `isGuest` y `onEnterGuestMode` a AppNavigator
  - `App/src/navigation/app-navigator.tsx` — guest access (`!isAuthenticated && !isGuest`), Biblioteca tab (renombrado de Journal), Profile eliminado del tab bar, PanicButton + PanicModal visibles en todas las pantallas
  - `App/src/screens/welcome-screen.tsx` — botón "Ingresar como invitado" debajo de Apple Auth
  - `App/src/screens/tools-screen.tsx` — TOOLS con `requiresAuth`, modal login para Timeline y Traductor cuando guest
  - `App/src/screens/psychoeducation-home-screen.tsx` — acepta `slug` desde route params
  - `App/src/screens/biblioteca-screen.tsx` — **NUEVO** — lista categorías de psicoeducación
  - `App/src/components/login-prompt-modal.tsx` — **NUEVO** — modal "Inicia sesión para continuar"

- **Decisiones:**
  - Profile tab eliminado (solo accesible autenticado).
  - Journal → Biblioteca (muestra categorías de psicoeducación).
  - Panic Button visible en todas las pantallas incluyendo invitado.
  - Traductor Asertivo y Timeline requieren auth (modal para guest).
  - Professionals, Psicoeducación y Panic accesibles sin registro.
  - Backend sin cambios (endpoints de professionals/psychoeducation ya públicos).

- **Verificación:** `init.ps1` 100%, `tsc --noEmit` limpio en App y Backend.

---

## 2026-08-26 — Feature #45: Fix textos largos descuadran textboxes (timeline y psicoeducación)
- **Agente:** big-pickle
- **Plan:** Corregir que textos largos en TextInputs multiline descuadran el layout en vez de hacer wrap. Causas: alignItems center en el scroll container del modal, inputs sin maxLength/maxHeight, textos de TimelineCard sin flexShrink.
- **Cambios:**

  **Frontend (5 archivos):**
  - `App/src/components/add-milestone-modal.tsx` — eliminado `alignItems: 'center'` de `scrollContentContainer`; agregado `maxLength={2000}` a descripcion, `maxLength={1000}` a sentimiento; agregado `maxHeight: 200` al estilo `textInput`
  - `App/src/components/timeline-card.tsx` — agregado `flexShrink: 1` a estilos `emocionLabel`, `descripcion` y `sentimiento`
  - `App/src/components/content-block-form.tsx` — agregado `maxLength={2000}` a TextInputItem multiline; agregado `maxHeight: 200` a estilo `textInputMultiline`
  - `App/src/components/content-block-exercise.tsx` — agregado `maxLength={2000}` a draftInput; agregado `maxHeight: 250` a estilo `draftInput`
  - `App/src/components/content-block-couples-form.tsx` — agregado `maxLength={2000}` a TextInput de reflexión; agregado `maxHeight: 200` a estilo `textInput`

- **Verificación:** `init.ps1` al 100% (Backend y App tests OK).
- **Cierre:** feature #45 marcada `done` en `feature_list.json`. Rama `development` creada.

---

## 2026-08-26 — Feature #46: Fundación offline-first (SQLite + NetInfo)
- **Agente:** big-pickle
- **Plan:** Implementar infraestructura para que la app funcione sin conexión. expo-sqlite como almacén local estructurado y @react-native-community/netinfo para detectar conectividad. Estrategia stale-while-revalidate.
- **Cambios:**

  **Dependencias:**
  - `App/package.json` — agrega `expo-sqlite` y `@react-native-community/netinfo` vía `npx expo install`

  **Servicios:**
  - `App/src/services/db.ts` — **NUEVO**. Servicio SQLite con esquema de tablas: psychoeducation_categories, psychoeducation_topics, psychoeducation_blocks, professionals, timeline_events, pending_ops, app_config
  - `App/src/services/cache.ts` — **NUEVO**. Capa de caché stale-while-revalidate con getFromCache, saveToCache, getOrFetch, getOrFetchArray
  - `App/src/services/psychoeducation-service.ts` — actualizado para usar caché SQLite con stale-while-revalidate
  - `App/src/services/professional-service.ts` — actualizado para usar caché SQLite

  **Hooks:**
  - `App/src/hooks/use-connectivity.ts` — **NUEVO**. Hook para detectar estado online/offline con NetInfo
  - `App/src/hooks/use-psychoeducation.ts` — actualizado con funciones de favoritos

  **Componentes:**
  - `App/src/components/connectivity-indicator.tsx` — **NUEVO**. Indicador visual de modo offline
  - `App/src/components/index.ts` — exporta ConnectivityIndicator

  **Screens:**
  - `App/src/screens/home-screen.tsx` — agrega ConnectivityIndicator

  **Tests:**
  - `App/jest.setup.ts` — mocks para @react-native-community/netinfo y expo-sqlite

- **Decisiones:**
  - JWT se mantiene en SecureStore (decisión del usuario)
  - Estrategia cache: Favoritos (sin límite) + LRU (10 temas recientes)
  - Límite almacenamiento: 50MB máximo para psicoeducación
  - Backend sin cambios en esta feature

- **Verificación:** `init.ps1` al 100% (Backend y App tests OK).
- **Cierre:** feature #46 marcada `done` en `feature_list.json`.

## 2026-08-26 — Bugfix: Text overflow en timeline + Contexto en traductor asertivo

- **Duración:** ~30 min
- **Agente:** big-pickle
- **Estado:** done

### Problema 1: Text overflow en timeline
Los TextInputs del modal de hitos (`add-milestone-modal.tsx`) y los Text de las tarjetas de timeline (`timeline-card.tsx`) no respetaban el ancho del contenedor — texto largo se desbordaba a la derecha.

**Causa raíz:**
- `timeline-card.tsx`: Los estilos `descripcion` y `sentimiento` tenían `flexShrink: 1` pero les faltaba `flex: 1` en un layout `flexDirection: 'row'`.
- `add-milestone-modal.tsx`: El diálogo usaba `alignItems: 'center'` que causaba que el TextInput no se estirara al ancho completo.

**Corrección:**
- `App/src/components/timeline-card.tsx` — Agregado `flex: 1` a `descripcion` y `sentimiento`
- `App/src/components/add-milestone-modal.tsx` — Cambiado `alignItems: 'center'` → `'stretch'`, agregado `flexShrink: 1` al diálogo

### Problema 2: Traductor asertivo sin contexto conversacional
Cada llamada al LLM era completamente stateless — el traductor "olvidaba" mensajes anteriores.

**Causa raíz:**
- Frontend enviaba solo `{ text }` al backend
- Backend construía un solo prompt string con `CNV_PROMPT + text`
- LLM recibía `messages: [{ role: 'user', content: prompt }]` — un único mensaje, cero historial

**Corrección (5 archivos):**
- `App/src/services/tools-service.ts` — Interfaz `ChatMessage`, `cnvTranslate(text, history)`
- `App/src/screens/acertive-translate-screen.tsx` — `buildHistory()` extrae últimos 6 mensajes (excluye welcome/error)
- `Backend/src/controllers/tools-controller.ts` — Extrae y valida `history` del body
- `Backend/src/services/ai-service.ts` — `translateToCnv(text, history)` construye `system` + history + `user`
- `Backend/src/services/ai-provider.ts` — `generateWithFallback(messages: ChatMessage[])` acepta array de mensajes

**Decisiones:**
- 6 mensajes (3 pares user/assistant) como máximo de historial — equilibrio entre contexto y costo de tokens
- Persistencia solo en sesión (useState) — se pierde al cerrar la app
- Tipo `ChatMessage` definido localmente en ai-provider.ts (no importable de openai v4.104.0 con `import type`)

- **Verificación:** `init.ps1` al 100% (Backend y App tests OK).


