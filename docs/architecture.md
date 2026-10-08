# Arquitectura — Qué significa "hacer un buen trabajo"

> Este documento define el estándar de calidad. Los agentes revisores
> evalúan código contra este archivo. Si no está aquí, no es un requisito.

## Principios

1. **Capas claras y separación de responsabilidades.** El proyecto tiene dos
   aplicaciones independientes, cada una con sus propias capas:

   **Frontend (App/):**
   ```
   screens/     → Vistas (pantallas). Solo layout y componentes de UI.
   components/  → Componentes reutilizables. Sin lógica de negocio.
   hooks/       → Lógica reutilizable con estado. Conecta UI con servicios.
   services/    → Consumo de API. Solo fetch/axios, nunca JSX.
   navigation/  → Configuración de rutas (React Navigation).
   types/       → Interfaces TypeScript compartidas.
   constants/   → Constantes de UI (colores, strings). NO datos de negocio.
   ```

   **Backend (Backend/):**
   ```
   routes/      → Definición de rutas (express.Router). Solo mapeo URL → controller.
   controllers/ → Orquestación: validación de input, llamada a services, respuesta HTTP.
   services/    → Lógica de negocio pura. Sin conocimiento de HTTP.
   middleware/  → Interceptores (auth JWT, error handler, rate limiting).
   models/      → Tipos e interfaces del dominio.
   database/    → Migraciones, seeders, conexión PostgreSQL.
   utils/       → Helpers (generación UUID, manejo de errores, crypto).
   ```

2. **Flujo de datos unidireccional:**
   ```
   Usuario → Screen → Hook → Service → API (HTTP)
                                            ↓
   Usuario ← Screen ← Hook ← Service ← Controller → Service → DB
   ```

3. **Nada hardcodeado.** Los contenidos clínicos (cuestionarios, artículos,
   sugerencias, copys) se sirven desde el backend como JSON estructurado.
   El frontend renderiza de manera agnóstica.

4. **Privacidad estricta (Patrón de Anonimato).** Ningún endpoint operacional
   expone email, nombre real o id_usuario. Solo viaja `id_anonimo` (UUIDv4)
   en el JWT y en todas las tablas de datos clínicos.

   **Excepción documentada (feature 35):** los endpoints `GET/PUT /auth/me`
   devuelven el email y nombre real del usuario. Es una excepción deliberada
   porque el usuario necesita ver y editar los datos de su propia cuenta.
   Solo aplica al propietario autenticado: el servidor busca por `id_anonimo`
   del JWT y no permite acceder a datos de terceros.

5. **Sin dependencias innecesarias.** Cada librería externa debe justificarse.
   Si una feature requiere una dependencia no prevista, se discute (blocked).

6. **Paleta de colores única (design tokens).** Toda la interfaz gráfica debe
   usar obligatoriamente la paleta definida en `App/src/constants/index.ts`
   (`COLORS` + `PALETTE_TRIADAS`). Los colores **jamás** se escriben
   hardcodeados en el código como hex/rgba literales: siempre se referencian
   los tokens (`COLORS.primary`, `COLORS.scrim`, etc.). Cambiar o limitar los
   colores de la app se hace exclusivamente desde ese archivo; un test de
   guard (`App/__tests__/palette-guard.test.ts`) falla si aparece un color no
   declarado en la paleta.

## Flujo de autenticación

```
[Expo] Google OAuth → token_id
       ↓
[Backend] POST /auth/google → valida token → crea usuario → genera JWT (id_anonimo)
       ↓
[Expo] Almacena JWT en SecureStore → adjunta en headers Authorization: Bearer <jwt>
       ↓
[Backend] Auth middleware decodifica JWT → extrae id_anonimo → lo inyecta en req
```

## Qué NO hacer

- No mezclar lógica de negocio en los controllers.
- No llamar a la API directamente desde un screen. Usar services layer.
- No hardcodear contenido clínico en el frontend.
- No exponer datos personales (email, nombre) en respuestas operacionales.
  Única excepción: `GET/PUT /auth/me` (solo el propietario de la sesión).
- No usar `console.log` para debug. Usar logger estructurado (pino/winston).
- No almacenar el JWT en AsyncStorage (usar SecureStore o expo-secure-store).
- No hardcodear colores en la UI (hex/rgba literales). Siempre usar los tokens de `App/src/constants/index.ts` (`COLORS`).
- No dejar que el teclado tape un textbox: todo `TextInput` va dentro de un
  `KeyboardAwareScrollView` / `KeyboardAvoidingView` de
  `react-native-keyboard-controller`, nunca en un `ScrollView` de `react-native`.
  Regla completa en `docs/conventions.md` (sección "Teclado").
