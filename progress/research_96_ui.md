# Investigación feature 96 (safety_plan_app_ui) — solo lectura

Fecha: 2026-10-28. Rutas relativas a la raíz del repo (`VittalMind/`). Frontend en `App/`, alias `@/` = `App/src/` (`App/tsconfig.json`; en Jest lo resuelve `babel-preset-expo`, no hay `moduleNameMapper`).

Estado previo: el feature 98 está `in_progress` y la decisión del usuario (2026-10-28, `progress/current.md`) es que la serie 98-105 va antes que 95/96/97. El 96 depende del 95 (`useSafetyPlan`, `App/src/types/safety-plan.ts`), que sigue `pending`. Hoy no existe nada de safety plan en `App/src/`.

---

## 1. ProfileScreen

Archivo: `App/src/screens/profile-screen.tsx` (221 líneas). Exporta `ProfileScreen: React.FC` (sin props). Nombres de archivo en kebab-case, componente en PascalCase.

- Imports (l.1-14): `useNavigation`, `useFocusEffect`, `NativeStackNavigationProp`, `COLORS, SPACING, FONT` de `@/constants`, `RootStackParamList` de `@/navigation/app-navigator`.
- Tipado de navegación (l.16): `type NavigationProp = NativeStackNavigationProp<RootStackParamList>;` y `useNavigation<NavigationProp>()` (l.20). Es el patrón de todas las pantallas.
- El menú NO es una lista de datos ni un componente: son `<Text>` con `onPress` dentro de `<View style={styles.menuSection}>` (l.74-104). Cada opción es `<Text style={styles.menuItem} onPress={() => navigation.navigate('X')}>EMOJI Texto</Text>`. Opciones actuales y orden:
  1. `✏️ Editar mis datos` -> `EditProfile` (l.75-80)
  2. `🔑 Cambiar contraseña` -> `ChangePassword` (solo si `!isGoogle`, l.82-89)
  3. `🔐 Configurar preguntas de seguridad` -> `SecurityQuestions` (l.91-96)
  4. `🔔 Notificaciones` -> `NotificationSettings` (l.98-103)
  Para añadir "Kit de autocuidado" basta copiar el bloque de l.98-103 con `navigation.navigate('SafetyPlan')` y un emoji (p. ej. `🧰`). Orden sugerido: antes o después de Notificaciones; el kit es contenido crítico, mejor visible arriba.
- Estilos: `StyleSheet.create` al final (l.147-221). `menuItem`: `FONT.labelMd`, `COLORS.primary`, centrado, `borderWidth: 1`, `borderColor: COLORS.surfaceVariant`, `borderRadius: 12`, `paddingVertical: SPACING.md`, `marginBottom: SPACING.sm + 2`. Contenedor `flex:1`, `alignItems:'center'`, `paddingTop: insets.top + SPACING.lg + 16` inline (l.53).
- Alto de contenido: la pantalla NO es scrollable (`View` simple, `logoutSection` con `marginTop:'auto'`). Añadir una 5ª opción hace crecer el menú; en pantallas pequeñas puede empujar el disclaimer y "Cerrar sesión" fuera de vista. Riesgo menor a revisar (ver §7).
- Ya tiene su disclaimer inline (l.106-111): "Esta aplicación es una herramienta de apoyo emocional. No reemplaza la terapia ni el diagnóstico profesional." con `styles.disclaimerText` (`FONT.labelSm`, `COLORS.outline`).
- Otros: `useFocusEffect` + `authService.getMe()` (l.26-44), `AccessStatusCard` (l.72), `ConfirmDialog` para logout (l.119-142).
- No hay test de ProfileScreen en `App/__tests__/`. Ojo: `useFocusEffect` NO está en el mock global de `@react-navigation/native` (`App/jest.setup.ts`, ver §5), así que un test que renderice ProfileScreen debe sobrescribir el mock.

## 2. Navegación

Archivo: `App/src/navigation/app-navigator.tsx` (268 líneas); `App/src/navigation/index.ts` solo reexporta `AppNavigator`; `App/src/navigation/navigation-ref.ts` define `navigationRef` y helpers.

- `RootStackParamList` (l.43-61), exportado, tipos `undefined` salvo `HomeTabs`, `PsychoeducationHome {slug}`, `PsychoeducationTopic {...}`:
  `Welcome, Disclaimer, ForgotPassword, SecurityQuestions, SecurityQuestionsSetup, EditProfile, ChangePassword, HomeTabs, AcertiveTranslate, PsychoeducationHome, PsychoeducationTopic, OfflineDownloads, Timeline, Professionals, GratitudeCircle, NotificationSettings, AccessRequest`.
- `HomeTabParamList` (l.36-41): `Home, Tools, Biblioteca, Profile`. Perfil es un tab (`Tab.Screen name="Profile" component={ProfileScreen}`, l.123-127, label "Perfil").
- Convención de nombres de ruta: PascalCase, sin sufijo `Screen`, igual al nombre del componente sin "Screen" (`GratitudeCircleScreen` -> `GratitudeCircle`, `NotificationSettingsScreen` -> `NotificationSettings`). Para el 96: ruta `SafetyPlan: undefined;`, componente `SafetyPlanScreen`, archivo `App/src/screens/safety-plan-screen.tsx`.
- Registro: el stack autenticado (l.218-234) lista `<Stack.Screen name="X" component={XScreen} />`; `headerShown:false` global (l.180-184), `animation:'fade'`. Hay que añadir el import (l.7-25 son imports de pantallas) y `<Stack.Screen name="SafetyPlan" component={SafetyPlanScreen} />` junto a `NotificationSettings`/`EditProfile`. Las pantallas de perfil están en el bloque autenticado (no en el de invitado/login).
- Invitado: `isGuest` entra al mismo bloque final (l.186 `!isAuthenticated && !isGuest` -> login; si no, bloque principal). Es decir el invitado ve Perfil y podría abrir SafetyPlan; el backend `/safety-plan` exige `authMiddleware`. Decisión abierta: ¿el invitado puede usar el kit solo en local (feature 95 es offline-first) o se le pide login? Mirar `LoginPromptModal` (`App/src/components/login-prompt-modal.tsx`).
- Export opcional: `App/src/screens/index.ts` está incompleto (no exporta Notification/Gratitude/etc.); el navigator importa por ruta directa `@/screens/xxx`. No es obligatorio añadirlo ahí.
- Tipado de props de pantalla: ninguna pantalla recibe `route`/`navigation` como props; todas usan hooks (`useNavigation<NativeStackNavigationProp<RootStackParamList>>()`). Las que reciben props desde el navigator (Welcome, Disclaimer, SecurityQuestions mode setup) lo hacen vía render-prop. SafetyPlanScreen no necesita params.
- Deep link/notificaciones: `navigation-ref.ts` `navigateToNotificationTarget` solo conoce `GratitudeCircle|Home|Biblioteca` (tipo `TNotificationTarget` en `App/src/services/notification-service.ts:199`). El feature 97 (PanicModal) usará `navigationRef.navigate('SafetyPlan')` para "guiar al usuario a configurarlo en su Perfil"; tener la ruta tipada ayuda.

## 3. Pantallas de referencia (formularios / listas editables)

No existe pantalla "diario" activa: `journal-screen.tsx` y `exercises-screen.tsx` son stubs de 28 líneas. Referencias reales:

### 3.1 `App/src/screens/change-password-screen.tsx` (349 l.) — formulario con scroll, la que cita `docs/conventions.md`
- Estructura: `View.flex` > círculos decorativos de fondo (`bgCircles`) + `headerRow` absoluto con "← Volver" (`TouchableOpacity`, `navigation.goBack()`, l.79-83) + `KeyboardAwareScrollView` (l.85-179) con `contentContainerStyle` y `keyboardShouldPersistTaps="handled"`. `paddingTop: SPACING.xl*2 + insets.top` inline.
- Campos: `View.fieldGroup` > `Text.label` (`FONT.labelMd`, `COLORS.textSecondary`) > `View.inputWrapper`/`TextInput.input` (alto 52, `COLORS.surfaceContainerLowest`, borde `COLORS.surfaceVariant`, radio 12, `placeholderTextColor={COLORS.placeholder}`).
- Error de formulario: `View.errorBox` (`COLORS.errorContainer`, radio 12) + `Text.errorText` (`COLORS.error`); error por campo: `Text.matchError` (`FONT.labelSm`, `COLORS.error`).
- Botón primario: `TouchableOpacity.button` 56 de alto, radio 28, `COLORS.primary`, sombra iOS/elevation Android, `buttonDisabled {opacity:.4}`, texto "Guardando..." mientras `isSaving`.
- Feedback de éxito: `InfoDialog` (`App/src/components/info-dialog.tsx`, Modal animado; props `visible, title, description, emoji, buttonLabel, onClose`) y luego `goBack()` (l.181-188).
- `canSave` derivado de estado (l.47-51).

### 3.2 `App/src/screens/edit-profile-screen.tsx` (306 l.) — mismo patrón; carga inicial con `isLoading` ("Cargando tus datos..."), guarda con `navigation.goBack()` sin diálogo (l.57-71), `editable={false}`+`styles.inputDisabled` para campo bloqueado, `keyboardType`, `autoCapitalize="none"`.

### 3.3 `App/src/screens/gratitude-circle-screen.tsx` (443 l.) — lista editable + hook offline-first
- Usa `useGratitude()` (hook de estado + sync). `KeyboardAwareScrollView` con `bottomOffset={SPACING.lg * 3}` y `keyboardShouldPersistTaps="handled"` (l.104-110); `paddingTop: insets.top` en el contenedor; header "← Volver" dentro del scroll.
- Input multilínea `maxLength={280}` + botón "Agregar (n/N)"; lista de tarjetas (`entryCard`) con `map` y `key` estable (`clientUuid ?? ...`, l.213-217).
- Banners de estado: `OfflineBanner` (`App/src/components/offline-banner.tsx`), `syncBanner` con "Sincronizando…" / pendientes y `queueDetail` (l.121-145). Es el mejor modelo de feedback offline/pendiente para el guardado del kit.
- Paleta: tarjetas con `COLORS.surface`, texto `COLORS.text`/`textSecondary`.

### 3.4 `App/src/screens/acertive-translate-screen.tsx` (566 l.) — caso sin scroll: `KeyboardAvoidingView` **de `react-native-keyboard-controller`** (import l.13, uso l.210-279).

### 3.5 `App/src/screens/notification-settings-screen.tsx` (407 l.) — ojo: usa `ScrollView` de `react-native` pero sin `TextInput`, por lo que no incumple la regla. Muestra el patrón de chips (`ChipGroup`, l.30-65) con `accessibilityRole="button"` + `accessibilityState={{selected, disabled}}`, `isSaving` con indicador (l.209), `ActivityIndicator` en carga, `SwitchRow`.

### Componentes reutilizables existentes (`App/src/components/`)
- `Button` (`button.tsx`): variantes `primary|danger|secondary`, `title,onPress,disabled`. Ninguna pantalla de formulario lo usa; todas definen su botón con `TouchableOpacity` local (estilo 56 de alto/radio 28). Al ser `secondary` fondo `COLORS.surface` con texto `COLORS.text` poco contraste visual; no cubre estado "guardando".
- `ConfirmDialog` (confirmación con acciones `variant: 'destructive'|'secondary'`, usado en ProfileScreen para logout) -> útil para "¿Eliminar contacto?".
- `InfoDialog` (éxito/aviso con un botón).
- `OfflineBanner`, `SwitchRow`, `FeaturedCard`, `ModuleCard`, `ProfessionalCard`, `TimelineCard`, `AddMilestoneModal` (modal de formulario con `Keyboard` listeners manuales -> NO usar de modelo por el tema de teclado).
- NO existen: componente `TextField`/`Input`, `Card`, `ScreenHeader`/`BackHeader`, `Toast`. El "← Volver" se repite en cada pantalla. `Alert.alert` solo aparece una vez (`offline-downloads-screen.tsx:56`). No hay toasts. El feedback visual es: texto del botón ("Guardando..."), `errorBox`, banners y `InfoDialog`.
- Para cumplir "feedback visual" del 96 sin dependencias nuevas: botón con estado `Guardando...`/`Guardado ✓`, `errorBox` en caso de fallo y/o `InfoDialog`; una confirmación inline (texto `COLORS.success`/`successSoft`) es lo más ligero.
- Si se crean componentes nuevos para la lista de contactos, la arquitectura (`docs/architecture.md`) pide `components/` sin lógica de negocio, archivos kebab-case (p. ej. `App/src/components/safety-contact-list.tsx`) y se pueden exportar en `components/index.ts` (no todos están allí).

### Tema
- `App/src/constants/index.ts`: `COLORS` (l.38-105), `SPACING` (l.122-133: `xs4 sm8 md16 lg24 xl32 stackSm8 stackMd24 stackLg48 gutter16 containerPadding20`), `FONT` (l.135-187: `headlineXl, headlineXlMobile, headlineLg, headlineMd, bodyLg, bodyMd, labelMd, labelLg, labelSm`).
- Tokens útiles: `background #fbf9f8`, `surface #fff`, `surfaceContainerLow`, `primary #2d6182`, `primaryContainer`, `secondary #4a654f` (verde), `secondaryContainer`, `accent #e94560`, `error/errorContainer`, `warning #ff9800`, `success`, `successSoft`, `outline`, `placeholder`, `primarySoft`, `secondarySoft`.
- `App/__tests__/palette-guard.test.ts` falla si aparece hex/rgba literal no declarado en cualquier `.ts/.tsx` de `App/src` (excepto `constants/index.ts`). Si se necesita un color nuevo, se añade a `COLORS`.
- Emojis: se usan como iconos en toda la app (no hay librería de iconos; `react-native-svg` para íconos puntuales).

### Accesibilidad hoy
Muy poca: `accessibilityLabel/Role/State` solo en `switch-row.tsx`, `notification-settings-screen.tsx`, `content-block-video.tsx`, `acertive-translate-screen.tsx`, `psychoeducation-home-screen.tsx`. Las pantallas de formulario NO etiquetan TextInput ni botones. Para el 96 conviene añadir `accessibilityLabel` en inputs/botones de eliminar contacto y `accessibilityRole="button"`; no hay guard que lo exija, pero es pantalla crítica de crisis.

### Teclado (regla dura, `docs/conventions.md` sección "Teclado")
- Formulario con scroll => `KeyboardAwareScrollView` de `react-native-keyboard-controller` con `keyboardShouldPersistTaps="handled"` y `bottomOffset` (si hay botones junto a inputs). Prohibidos `ScrollView` y `KeyboardAvoidingView` de `react-native` con `TextInput`.
- `KeyboardProvider` ya está en `App.tsx`; mock de Jest en `App/jest.setup.ts` (`react-native-keyboard-controller/jest`).
- Cada pantalla con formulario lleva un test guard del `KeyboardAwareScrollView` (modelo: `App/__tests__/gratitude-circle-screen.test.tsx`, bloque `describe('teclado')`, últimas ~15 líneas).
- Para la lista dinámica de contactos (varios TextInput que aparecen/desaparecen) un solo `KeyboardAwareScrollView` con todo el formulario es lo coherente. Los 7 pasos como acordeón/paso a paso con un único scroll.

## 4. Disclaimer legal (README regla C)

- README `README.md` sección 3.C (l.42-43): "Toda pantalla crítica o flujo de registro debe incluir de manera clara un aviso legal ... bajo ninguna circunstancia reemplaza un diagnóstico, terapia o tratamiento clínico formal".
- Componente reutilizable: `App/src/components/disclaimer-banner.tsx` -> `DisclaimerBanner` (sin props). Texto: "Esta aplicación es una herramienta tecnológica de soporte, autoayuda y acompañamiento psicoeducativo. Bajo ninguna circunstancia reemplaza o sustituye la consulta médica, el diagnóstico clínico, la psicoterapia o los tratamientos profesionales formales." Estilo: tarjeta `COLORS.surface`, radio 12, `borderLeftWidth 4` `COLORS.warning`, texto `textSecondary` 12px. Exportado en `components/index.ts`.
- Usos del componente: `App/src/screens/welcome-screen.tsx:414` y `App/src/screens/register-screen.tsx:224` (flujo de registro). Hay además `DisclaimerScreen` (`screens/disclaimer-screen.tsx`, aceptación obligatoria tras login, `requiresDisclaimer` en el navigator).
- Variantes inline (texto hardcodeado, sin el componente): `profile-screen.tsx:106-111`, `acertive-translate-screen.tsx:274-276` ("Vitta Mind AI puede cometer errores..."), `panic-modal.tsx:160-165` (aviso de emergencia: "Si es una emergencia que pone en riesgo tu vida, llama inmediatamente a la línea de emergencia de tu país").
- Recomendación para SafetyPlanScreen: montar `<DisclaimerBanner />` visible (arriba o al pie del formulario, no oculto) y añadir una línea específica de crisis (línea 106/123 Colombia ya existe en `App/src/data/emergency-contacts.ts`, CO: 106 salud mental, 123 emergencias, 192, 155). Cuidado: el texto del banner dice "autoayuda y acompañamiento psicoeducativo"; el kit es una herramienta de seguridad clínica, el redactor clínico debería validar si ese texto basta o si el kit necesita su propio aviso ("el kit no reemplaza atención profesional ni una línea de crisis"). Esto es pregunta abierta al psicólogo cofundador.
- No hay test que obligue la presencia del disclaimer en pantallas; el 96 debería añadir uno (`findAllByType(DisclaimerBanner).length === 1`).

## 5. Cómo se testean pantallas hoy

- Jest 29 + `jest-expo` (`App/package.json` clave `jest`, preset `jest-expo`, `setupFiles: ./jest.setup.ts`, `transformIgnorePatterns` ampliado). Comando: `cd App && npm test`.
- **`@testing-library/react-native` NO está instalado** (`App/node_modules/@testing-library` no existe; `package.json` solo tiene `react-test-renderer ^19.2.3`). `docs/conventions.md` dice "Jest + React Native Testing Library", pero la realidad del repo es `react-test-renderer` directo. Instalar RNTL sería una dependencia nueva => `docs/architecture.md` principio 5 ("se discute (blocked)"). Recomendación: seguir con `react-test-renderer`.
- Tests de pantallas existentes en `App/__tests__/`: `gratitude-circle-screen.test.tsx`, `notification-settings-screen.test.tsx`, `psychoeducation-topic-screen.test.tsx`, `App.test.tsx`; de componentes: `panic-modal`, `panic-button`, `update-modal`, `pillar-badge`, `content-block-*`, `gratitude-circle`, etc. Nombre `*.test.tsx`, descriptivos en español.
- Mocks globales (`App/jest.setup.ts`): safe-area (`react-native-safe-area-context/jest/mock`), `react-native-keyboard-controller/jest`, `expo-secure-store`, `@/services/storage`, svg (como strings), reanimated, async-storage, notifications, sqlite, netinfo, location, y navegación:
  - `@react-navigation/native` global: solo `NavigationContainer`, `useNavigation: () => ({ navigate: jest.fn() })` (SIN `goBack`) y `createNavigationContainerRef`. No hay `useFocusEffect`, `useRoute` ni `useNavigationState`.
  - Por eso `notification-settings-screen.test.tsx` redefine `jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }) }))` en el propio test.
- Patrón de ejemplo (`App/__tests__/gratitude-circle-screen.test.tsx`):
  ```
  jest.mock('../src/hooks', () => ({ useGratitude: jest.fn() }));
  const mockUseGratitude = useGratitude as jest.Mock;
  function render(overrides = {}) {
    mockUseGratitude.mockReturnValue(baseState(overrides));
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<GratitudeCircleScreen />); });
    return tree!;
  }
  // helpers: count(tree, Type) -> findAllByType(...).length ; texts(tree) -> concatena children de todos los <Text>
  expect(count(tree, KeyboardAwareScrollView)).toBe(1);
  expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
  ```
  Interacción: `tree.root.findByType(TextInput).props.onChangeText('x')` dentro de `act`, y `findAllByType(TouchableOpacity)[i].props.onPress()`.
- Para el 96: mockear `useSafetyPlan` (`jest.mock('../src/hooks/use-safety-plan', ...)` o `'../src/hooks'` según dónde lo exporte el 95), mockear `useNavigation` con `goBack`, y probar: render de los 7 pasos, listas de contactos de Pasos 3 y 4 (añadir/eliminar), validaciones (teléfono, nombre), `DisclaimerBanner` presente, `KeyboardAwareScrollView` + `keyboardShouldPersistTaps`, estado guardando/guardado/error. Y un test de ProfileScreen para la nueva opción (necesita mock con `useFocusEffect`, `authService`, `AccessStatusCard`/`useAccess`).
- Los tests de validación mejor sobre funciones puras (p. ej. `App/src/utils/` o junto al hook, ver §7) además de render.
- Backend: `Backend/tests/safety-plan.test.ts` existe (Supertest) y cubre el 94.

## 6. Los 7 pasos clínicos según el backend (fuente de verdad)

Migración real: **`Backend/src/database/migrations/027_create_safety_plan.sql`** (el feature 94 dice `026_...`; `026` ya es `026_create_access_system.sql`; está anotado como F10 en `docs/plan-accesos-y-codigos-canje.md:55`). Referencia clínica en el comentario SQL: "Stanley & Brown".

Modelo: `Backend/src/models/safety-plan.ts`. Endpoints (`Backend/src/routes/safety-plan.ts`, todos `authMiddleware`): `GET /safety-plan` (plan o estructura vacía), `PUT /safety-plan` (upsert), `DELETE /safety-plan` (204). Servicio: `Backend/src/services/safety-plan-service.ts`. El JSON viaja en camelCase.

| Paso | Columna SQL | Campo JSON (`ISafetyPlan`) | Tipo | Saneamiento backend |
|---|---|---|---|---|
| 1 Signos de alarma | `paso1_signos_alarma` TEXT | `paso1SignosAlarma` | `string` | trim, máx 10000 car., error `TEXT_LIMIT_EXCEEDED` |
| 2 Estrategias de afrontamiento | `paso2_estrategias_afrontamiento` TEXT | `paso2EstrategiasAfrontamiento` | `string` | ídem |
| 3 Actividades y personas (distracción) | `paso3_actividades_personas` JSONB `[]` | `paso3ActividadesPersonas` | `ISafetyContact[]` `{id?, nombre, telefono}` | máx 50 ítems; nombre trim 150; telefono trim 40; id trim 50 |
| 4 Contactos de apoyo | `paso4_contactos_apoyo` JSONB `[]` | `paso4ContactosApoyo` | `ISafetyContact[]` | ídem Paso 3 |
| 5 Dispositivos sanitarios | `paso5_dispositivos_sanitarios` JSONB `{}` | `paso5DispositivosSanitarios` | `{ambulancia?, atencionSuicida?, psicologo?}` strings | cada uno trim, máx 60 |
| 6 Entorno seguro | `paso6_entorno_seguro` TEXT | `paso6EntornoSeguro` | `string` | trim, máx 10000 |
| 7 Motivos para vivir | `paso7_motivos_vivir` TEXT | `paso7MotivosVivir` | `string` | trim, máx 10000 |

Más: `id`, `idAnonimo` (el cliente NO lo envía; viene del JWT), `createdAt`, `updatedAt`. `ISafetyPlanInput` = los 7 campos opcionales (el PUT reemplaza todo: campos omitidos pasan a `''`/`[]`/`{}`, no hay patch parcial -> la UI/servicio debe enviar siempre el plan completo).

Puntos finos que afectan a la UI:
- El backend **no valida formato de teléfono ni exige que nombre/teléfono no estén vacíos**; solo recorta. Las validaciones "de verdad" (nombre y teléfono obligatorios en el Paso 4, formato de teléfono, longitudes 150/40/60/10000, máx 50 contactos) deben estar en la app y alinearse con esos límites para que el PUT nunca devuelva 400. Ojo: `sanitizeStr` del Paso 5 corta a 60 caracteres (los campos son pequeños: números/nombres de servicio, no texto libre).
- **Paso 3** en el backend es lista de `{nombre, telefono}`, igual que el 4 ("actividades personas", en la terminología Stanley-Brown: personas y lugares sociales que distraen). El feature 96 lo pide como "lista de contactos". Dudas: ¿el teléfono es opcional en el Paso 3 (una "actividad" o lugar no tiene teléfono)? El backend lo permite vacío. Definir con el psicólogo si Paso 3 mezcla personas y actividades (el campo `nombre` serviría para ambas).
- **Paso 4**: único paso que alimenta al feature 97 (PanicModal: llamar `tel:` y WhatsApp `wa.me`). Para WhatsApp hace falta teléfono en formato internacional o normalizable: conviene normalizar/validar en la UI (Colombia: celular 10 dígitos que empieza por 3, + prefijo +57; p. ej. el `3007548933` de `emergency-contacts.ts`). Decisión abierta: ¿se guarda con prefijo país? Nada lo impone en backend.
- El `id` del contacto lo puede generar el cliente: `App/src/services/uuid.ts` (`generateUUID`) ya existe; usarlo como `key` estable de las listas y para la sincronización del 95.
- Orden de pasos Stanley-Brown estándar: (1) signos de alarma, (2) estrategias internas, (3) personas/lugares para distraerse, (4) personas a quienes pedir ayuda, (5) profesionales/agencias, (6) hacer el entorno seguro, + (7) motivos para vivir. Coincide con el backend.
- Textos existentes en el repo para los pasos: **no hay ninguno** en `App/src/` ni en la BD (grep de "paso/plan de seguridad/autocuidado/kit" solo devuelve `content-block-exercise` y no relacionado). `docs/acta-entrega-inicial-inventario.md:152` menciona un entregable externo `Kit_prevención_suicida.pdf/.md` ("Guía de intervención y acompañamiento en momentos de crisis"): es la fuente probable del contenido clínico, pero no está en el repo (revisar dónde está antes de redactar copys). Placeholders de Paso 5 sugeridos por el modelo: ambulancia, línea de atención suicida, psicólogo (en Colombia: 123 y 106, ya en `emergency-contacts.ts`).

### Regla 3.B (contenido dinámico) y mecanismo de copys

- README 3.B (l.38-40) y `docs/architecture.md` principio 3 y "Qué NO hacer": "Los contenidos clínicos (cuestionarios, artículos, sugerencias, copys) se sirven desde el backend como JSON estructurado. El frontend renderiza de manera agnóstica." y "No hardcodear contenido clínico en el frontend". `constants/` = "Constantes de UI (colores, strings). NO datos de negocio".
- Mecanismo existente: **solo psicoeducación**. `GET /psychoeducation`, `/psychoeducation/:slug`, `/psychoeducation/:slug/:temaId` (`Backend/src/routes/psychoeducation.ts`), con bloques tipados (`App/src/types/psychoeducation.ts`: `TEXTO`, `TABLA_COMPARATIVA`, `CUESTIONARIO`, `EJERCICIO_DIDACTICO`, `FORMULARIO`, `FORMULARIO_PAREJA`, `VIDEO_YOUTUBE`) y endpoints admin (`/psychoeducation/admin/...`, `adminMiddleware`) que usa el plugin WordPress. La app los consume con cache (`App/src/services/cache.ts` `getOrFetch`, offline en SQLite para descargas).
- **No existe** un endpoint genérico de "copys de la app" ni de textos de formulario (grep `copy|copys|contenido` en Backend solo toca psicoeducación, accesos y notificaciones). Tampoco hay `kit/safety-plan` content. Los textos de UI de las pantallas actuales (títulos, labels, placeholders, disclaimers) están hardcodeados en JSX.
- Consecuencia: los textos clínicos de los 7 pasos (título, pregunta guía, ejemplos/placeholder, ayudas "¿Qué es esto?") **deberían** servirse desde backend según 3.B, pero (a) no hay mecanismo y (b) el kit debe funcionar 100% offline en una crisis (feature 97). Opciones:
  1. Hardcodear en un módulo `App/src/data/safety-plan-steps.ts` (como `emergency-contacts.ts`, que ya es dato hardcodeado con comentario de que se amplía añadiendo entradas) y documentar la excepción en `progress/current.md`/decisión; rápido pero incumple la letra de 3.B.
  2. Crear (fuera del alcance del 96) endpoint `GET /safety-plan/content` (o categoría de psicoeducación con slug `kit-autocuidado`) + cache local con fallback embebido: cumple 3.B y offline, pero requiere backend nuevo + admin en WordPress; es otro feature.
  3. Híbrido: estructura y claves de campo (`paso1SignosAlarma`...) en código (son el esquema, no contenido) + textos con fallback embebido y sobrescritura desde backend más adelante.
  Es una decisión del usuario/psicólogo; recomendado: opción 3 (o 1 con excepción explícita), porque el contenido de intervención clínica sensible no debería cambiar sin revisión y debe estar disponible sin red.
- Los datos del usuario (lo que escribe) sí van al backend/SQLite vía feature 95; lo que es "contenido clínico" son las guías por paso.

## 7. Reglas relevantes de docs, riesgos y dudas abiertas

### Reglas (resumen aplicable)
- `AGENTS.md` / `CLAUDE.md`: una feature a la vez, elegir la `pending` de menor id. **Ojo**: la menor `pending` es la 95 (la 96 depende de ella); el usuario ya reordenó (serie 98-105 primero). No marcar `done` sin `.\init.ps1` verde (incluye quality-check bloqueante, gate de seguridad); no hacer commit; documentar en `progress/current.md` en vivo.
- `docs/conventions.md`: TS strict, Prettier (100 cols, comillas simples, trailing comma all), imports en orden externos -> `@/` -> relativos; archivos App kebab-case; componentes PascalCase; hooks `useX`; interfaces `IPascal`; tipos `TPascal`; constantes `UPPER_SNAKE`; sin comentarios salvo "por qué"; frontend: hooks atrapan errores y exponen `error`+`isError`; nunca stack traces al usuario; **colores solo vía tokens `COLORS`** (palette-guard); **teclado** (sección arriba) y **safe area** (elementos flotantes con `insets`, `bottom: OFFSET + insets.bottom`; `bottomOffset` del scroll; tab bar usa `72 + insets.bottom` — ver "Safe area" y `panic-button.tsx`). Nota: el `PanicButton` flotante vive en `HomeTabs`; SafetyPlan es pantalla del stack raíz (fuera de HomeTabs), por lo que el botón de pánico no se superpone ahí.
- `docs/architecture.md`: capas `screens` (solo layout/UI) -> `hooks` -> `services` -> API. **No llamar a la API desde un screen**; la pantalla consume solo `useSafetyPlan`. `components/` sin lógica de negocio. Sin dependencias nuevas sin discutir. Privacidad: solo `id_anonimo`; nombre/teléfono de contactos de confianza son datos de terceros dentro del plan (aceptable en JSONB del plan, pero tratarlos como sensibles).
- `docs/security-guidelines.md` §9: datos de salud mental = altamente sensibles; sin PII en logs/errores; mensajes genéricos al cliente. Aplicar: no hacer `console.log` del plan, no mostrar errores crudos del backend (usar mensaje genérico), no incluir contenido del plan en analytics/notificaciones.
- `docs/verification.md`: tests unitarios obligatorios (camino feliz + al menos un error); `cd App && npm test`; tsc limpio, lint sin errores (gate `scripts/quality-check`).
- Notificaciones: `TNotificationTarget` no requiere cambios.

### Riesgos / dudas abiertas
1. **Dependencia dura del 95**: `useSafetyPlan` y `App/src/types/safety-plan.ts` no existen. El 96 solo se puede implementar si el 95 está hecho o si se acuerda un contrato de hook provisional. Conviene fijar la firma esperada (plan, `isLoading`, `isSaving`, `error`, `savePlan(plan)`/`updateStep`, `trustedContacts` (Paso 4), estado de sincronización) antes de empezar. Hoy el 95 sigue `pending` y la serie 98-105 va primero.
2. **Contenido clínico hardcodeado vs 3.B**: no hay endpoint de copys (ver §6). Requiere decisión explícita (opción 1/2/3). También validar con el psicólogo cofundador los textos, y el lenguaje delicado (motivos para vivir, medios letales / entorno seguro) y que no haya mensajes culpabilizantes.
3. **Textos sin fuente en el repo**: falta el contenido de guía por paso; probable origen `Kit_prevención_suicida.*` (acta de entrega). Sin eso hay que redactarlos y que alguien clínico los apruebe.
4. **Disclaimer**: ¿basta `DisclaimerBanner` o se necesita aviso específico del kit y enlace a línea 106/123 en la pantalla? Pregunta para el psicólogo.
5. **Testing library**: `docs/conventions.md` menciona React Native Testing Library pero no está instalada; usar `react-test-renderer` como el resto de tests, o discutir la nueva dependencia (architecture principio 5).
6. **Mock global de navegación incompleto** (`useNavigation` sin `goBack`; sin `useFocusEffect`): cada test debe redefinir `@react-navigation/native`. Probar ProfileScreen requiere además mockear `authService.getMe`, `useAuthContext`, `AccessStatusCard`.
7. **Menú de Perfil sin scroll**: la 5ª opción puede desplazar disclaimer y logout fuera de pantalla en dispositivos pequeños; verificar y, si hace falta, envolver en `KeyboardAwareScrollView`/`ScrollView` (sin TextInput en Perfil, vale `ScrollView` de RN) o compactar.
8. **Invitado**: puede llegar a Perfil; el backend exige auth. Definir comportamiento (solo local o `LoginPromptModal`). También interacción con gating de accesos (`App/src/constants/access-keys.ts` + migración 026): el kit de autocuidado en crisis NO debería quedar bloqueado por plan; si hace falta, el seed no tiene feature `tool.safety_plan` y la serie 98 acaba de alinear esas claves. Confirmar que no se gatea.
9. **Validación de teléfono**: sin regla en backend; definir formato (Colombia, +57, solo dígitos, longitudes) para que el 97 pueda construir `tel:` y `wa.me` sin sorpresas. Límites a respetar: nombre 150, teléfono 40, Paso 5 campos 60, textos 10000, máx 50 contactos por lista.
10. **PUT reemplaza todo el plan** (sin patch): evitar pisar con vacíos si la carga inicial falla; guardar solo tras cargar correctamente (o desde cache local). Importante para offline-first del 95.
11. **Discrepancia de numeración**: el 94 dice migración 026, real 027 (ya anotado F10; no afecta a la UI).
12. **UX de baja fricción** (criterio del 96): 7 pasos largos en una sola pantalla pueden ser abrumadores; opciones: acordeón con progreso "Paso n de 7" y guardado explícito + autoguardado de borrador; mantener un único `KeyboardAwareScrollView`. Evitar el `AddMilestoneModal`-style de modales con manejo manual de teclado.
13. **Accesibilidad**: etiquetar inputs y botones eliminar/agregar; contrastes con tokens `COLORS` (usar `text`/`textSecondary` sobre `surface`).
14. **Guard del teclado**: el test del 96 debe incluir `KeyboardAwareScrollView` + `keyboardShouldPersistTaps='handled'` (regla conventions).
15. **Quality gate**: ESLint sonarjs (complejidad) puede marcar un componente de 7 pasos muy grande; dividir en subcomponentes (`SafetyPlanStepCard`, `SafetyContactList`) y funciones de validación puras.

### Archivos probables a crear/tocar en el 96 (sugerencia)
- Nuevo: `App/src/screens/safety-plan-screen.tsx`; `App/src/components/safety-contact-list.tsx` (y quizá `safety-plan-step-card.tsx`); validaciones puras (p. ej. `App/src/services/safety-plan-validation.ts` o dentro del hook del 95); `App/__tests__/safety-plan-screen.test.tsx` (+ test de validaciones y de opción en Perfil).
- Tocar: `App/src/screens/profile-screen.tsx` (opción), `App/src/navigation/app-navigator.tsx` (import, `SafetyPlan: undefined`, `Stack.Screen`), opcionalmente `App/src/screens/index.ts` y `components/index.ts`, y el `progress/current.md` / `feature_list.json` según el protocolo.
