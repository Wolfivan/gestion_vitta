# Investigación feature 97 (panic_trusted_contacts)

Solo lectura; no se modificó código. Rutas relativas a la raíz del repo. Fecha: 2026-10-28.

## 0. Estado de dependencias (feature_list.json)
- 94 `safety_plan_backend`: done. Ojo: la migración real es `Backend/src/database/migrations/027_create_safety_plan.sql` (el acceptance dice 026).
- 95 `safety_plan_app_foundation`: **pending** (hook `useSafetyPlan`, servicio, tipos `App/src/types/safety-plan.ts`, caché local). No existen en `App/src/hooks`, `App/src/services` ni `App/src/types`.
- 96 `safety_plan_app_ui`: pending (pantalla del kit y Paso 4 en Perfil).
- 97 (feature_list.json ~l.1592-1599) depende de 95 y 96. Sin ellas no hay contactos reales que mostrar.

## 1. PanicModal
- Archivo: `App/src/components/panic-modal.tsx` (379 líneas). Componente `PanicModal: React.FC<Props>` (l.58).
- Props (l.15-22): `visible: boolean`, `countryData: CountryContacts | null`, `countryList: {countryCode,countryName,flag}[]`, `onClose`, `onDial(contact: EmergencyContact)`, `onChangeCountry(code)`. No recibe contactos de confianza.
- Estructura: `<Modal transparent animationType="fade">` (l.78) con overlay inferior (bottom sheet, `maxHeight 85%`). Contenido: botón cerrar (l.86), título "¿Necesitas ayuda ahora?" (l.90), subtítulo, selector de país, `ScrollView` de `ContactRow` (l.24-56, líneas de emergencia), botón secundario (l.123-130), disclaimer (l.160). Alterna con vista selector de país (`showCountryPicker`, l.67).
- Botón actual (l.123-130): `TouchableOpacity styles.secondaryButton` con texto "Contactar psicólogo de guardia" (l.128). Su `onPress` solo hace `setSoonVisible(true)` (l.125), que abre `InfoDialog` "Próximamente" (l.170-176, `App/src/components/info-dialog.tsx`, props `visible,title,description,emoji,buttonLabel,onClose`). No llama a ningún servicio: es un placeholder.
- Estilos (StyleSheet al final, l.181+): tokens `COLORS`, `SPACING`, `FONT` de `@/constants` (regla: sin colores hardcodeados; lo vigila `App/__tests__/palette-guard.test.ts`, feature 63). `secondaryButton` l.320-329 (h48, borde primary, pill); `contactRow` l.253; `brandWhatsApp` existe en COLORS (usado l.307).
- Se usa en 3 sitios (grep), todos con las mismas 6 props:
  - `App/src/navigation/app-navigator.tsx` l.27 import, l.131-143 (botón global; estado `panicVisible`, `panicCountry` l.82, carga en l.91-92 con `panic.ensureCountry()`/`getCountryData`; `onDial={(c)=>panic.openContact(c)}` l.136).
  - `App/src/screens/psychoeducation-topic-screen.tsx` l.22, l.102-110 (fragmento `panicUI`; `handlePanicDial` l.83).
  - `App/src/screens/welcome-screen.tsx` l.23, l.423-431 (`handlePanicOpen` l.161, `handlePanicDial` l.165).
- Apertura: `PanicButton` (`onPress={() => setPanicVisible(true)}`) en cada host; el modal es controlado por `visible`.
- Hook `App/src/hooks/use-panic.ts` (94 líneas): `openDial(phone)` -> `Linking.openURL('tel:'+phone).catch(()=>{})` (l.62-66); `openContact(contact)`: whatsapp -> `https://wa.me/${waPhone || phone solo dígitos}` (l.69-74), chat -> `sms:` con fallback a tel (l.76-80), resto -> `openDial`. Errores silenciados. Importa `Linking` de `react-native`.
- Apariciones del texto "psicólogo de guardia" / "guardia":
  - `App/src/components/panic-modal.tsx:128` (única en código).
  - `feature_list.json:193` ("Botón secundario para contactar psicólogos de guardia", feature antigua ya done) y l.1592-1594 (feature 97).
  - Sin coincidencias en `Backend/`, `docs/`, ni en tests. No hay contenido dinámico con ese texto. Los tests actuales no verifican el texto del botón, así que reemplazarlo no rompe nada.
- Reutilizable: `InfoDialog` (también usado en feature "PanicModal usa InfoDialog en vez de Alert.alert", feature_list.json l.385).

## 2. Linking / tel: / WhatsApp / config nativa
- `App/src/hooks/use-panic.ts:3,63,71,77`: `Linking` de react-native con `tel:`, `https://wa.me/<digitos>`, `sms:`.
- `App/src/screens/professionals-screen.tsx:2,34-41`: `https://wa.me/<digitos>?text=<encodeURIComponent(mensaje)>` y `mailto:`; sin `.catch`.
- `App/src/hooks/use-app-update.ts:4,56`: `import * as Linking from 'expo-linking'` -> `Linking.openURL(url)`.
- `App/src/services/notification-service.ts:1,181`: `Linking.openSettings()`.
- `docs/diseno-y-arquitectura-vittalmind.md:542`: diagrama menciona `Linking.openURL tel:xxx`.
- `expo-linking ~57.0.9` está en `App/package.json` l.29, `react-native 0.86.3`, `expo ^57`.
- `App/app.json`: scheme `["vittalmind","com.vittalmind.app"]`; `ios.infoPlist` solo tiene `NSLocationWhenInUseUsageDescription`, `ITSAppUsesNonExemptEncryption`, `CFBundleURLTypes` (Google). Android `permissions` solo ubicación/notificaciones. **No hay** `LSApplicationQueriesSchemes` ni bloque `queries`. No existe `app.config.*`.
- Qué añadir:
  - **Recomendado (mínimo cambio nativo): usar `https://wa.me/<num>?text=...`**. No requiere `canOpenURL` ni declarar esquemas: iOS lo abre como universal link y Android lo resuelve por intent-filter de WhatsApp; si no hay WhatsApp abre el navegador (wa.me muestra aviso). Esto es lo que ya hace la app (use-panic l.71).
  - Si se quisiera `whatsapp://send?phone=&text=` y/o `Linking.canOpenURL`: iOS `ios.infoPlist.LSApplicationQueriesSchemes: ["whatsapp"]` (sin esto `canOpenURL('whatsapp://')` devuelve false en iOS) y Android 11+ (API 30) `<queries><package android:name="com.whatsapp"/><package android:name="com.whatsapp.w4b"/><intent><action android:name="android.intent.action.VIEW"/><data android:scheme="whatsapp"/></intent></queries>` (vía config plugin o `expo-build-properties`; `app.json` no soporta `queries` directo en Expo sin plugin). Cualquier cambio de app.json/plist exige nuevo build nativo (EAS), no OTA.
  - `tel:` no necesita declaración para `openURL`; `canOpenURL('tel:')` en iOS sí depende de que el dispositivo tenga telefonía (iPad/simulador falla). Recomendado: no usar `canOpenURL` previo; hacer `openURL(...).catch(fallback)`.
  - Estrategia de fallback sugerida: intentar `https://wa.me/...`; si falla, mostrar mensaje no técnico ("No pudimos abrir WhatsApp. Puedes llamar a ... directamente").

## 3. Tests existentes
- `App/__tests__/panic-modal.test.tsx` (70 líneas): `react-test-renderer` + `act`; 3 tests (render visible, render no visible, muestra título y "Colombia" con `findAllByProps({children})`). Props: `EMERGENCY_CONTACTS.CO`, `countryList` derivado, callbacks vacíos. **Hay que añadir props nuevas** (opcionales o actualizar los 3 tests).
- Otros tests de componentes/pantallas con modales: `panic-button.test.tsx`, `update-modal.test.tsx`, `psychoeducation-topic-screen.test.tsx` (mockea `../src/hooks/use-panic` entero, l.17-28, con `openContact: jest.fn()`, etc.; si el modal pasa a usar un hook nuevo como `useSafetyPlan` este test, y `welcome`/`navigator` si hay tests, deben mockearlo), `notification-settings-screen.test.tsx`, `gratitude-circle-screen.test.tsx`.
- **Linking no se mockea en ningún test actual** (grep de `Linking|openURL` en `App/__tests__` sin resultados). `App/jest.setup.ts` (preset `jest-expo`) mockea safe-area, keyboard-controller, secure-store, storage, async-storage, expo-location, netinfo, sqlite, notifications, react-navigation, etc., pero no Linking ni expo-linking.
- Cómo mockear: `jest.spyOn(Linking, 'openURL').mockResolvedValue(true)` con `import { Linking } from 'react-native'` (use-panic y professionals usan ese import); si se usa `expo-linking`, `jest.mock('expo-linking', () => ({ openURL: jest.fn().mockResolvedValue(true) }))`. Mantener un único import (react-native) para que el spy funcione.
- Para pulsar: `root.findByProps({ children: 'Llamar a mi contacto de confianza' })` + `props.onPress()` dentro de `act`. Ojo con `Modal` anidado: el diálogo de contactos puede ser un segundo `Modal` o una vista dentro del mismo (ver riesgos).
- Convención de tests de datos: backend con nombres de contacto de ejemplo en `Backend/tests/safety-plan.test.ts` (l.53-102): `+573001234567`, `3001112233`.

## 4. Modelo del contacto (Paso 4) en el backend
- `Backend/src/models/safety-plan.ts` l.1-5: `ISafetyContact { id?: string; nombre: string; telefono: string }`. `ISafetyPlan.paso4ContactosApoyo: ISafetyContact[]` (l.19); fila `paso4_contactos_apoyo` JSONB NOT NULL DEFAULT `[]` (migración 027, l.12).
- Sanitización: `Backend/src/services/safety-plan-service.ts` `sanitizeContactList` (l.60-98): máx. 50 contactos; `nombre.trim().slice(0,150)`, `telefono.trim().slice(0,40)`, `id.trim().slice(0,50)`. **No hay validación de formato del teléfono ni de obligatoriedad** (puede llegar `telefono: ''`; revisar l.79-98 si descarta vacíos). No normaliza prefijos.
- Formatos reales en tests: `+573001234567` (con +57) y `3001112233` (celular colombiano de 10 dígitos). El usuario puede escribir espacios, guiones o paréntesis (hasta 40 chars).
- Propuesta de normalización (en la app, función pura testeable, p. ej. `App/src/utils/phone.ts`, no existe carpeta utils verificada):
  1. `digits = telefono.replace(/\D/g,'')`; conservar si había `+`/`00` inicial.
  2. Para `tel:`: usar `+57...`/dígitos tal cual; mantener `+` si lo trae (`tel:+573001234567` válido).
  3. Para wa.me (solo dígitos, sin `+`, con código de país): si empieza con `00`, quitar `00`; si empieza con `57` y tiene 12 dígitos -> ok; si tiene 10 dígitos y empieza con `3` (celular CO) -> anteponer `57`; si no encaja (fijo de 7-10 dígitos, otro país, longitud rara) -> **no inventar prefijo**: ocultar o deshabilitar "Enviar WhatsApp" y dejar solo "Llamar". Usar país por defecto CO (DEFAULT_COUNTRY en `App/src/data/emergency-contacts.ts`; el usuario puede haber cambiado el país en `vittalmind_country`, pero para contactos personales lo más seguro es respetar `+` explícito y asumir 57 solo para 10 dígitos que empiecen en 3).
  4. Mensaje: `encodeURIComponent('Tienes cinco minutos para mi')` (el acceptance lo escribe sin tilde; "para mí" lleva tilde en español correcto: **dudar y confirmar con Katherine/producto**; si se corrige, `encodeURIComponent` maneja la tilde).
- Tener en cuenta que `ISafetyContact` aparece también en Paso 3 (`paso3ActividadesPersonas`); el selector del hook debe leer solo `paso4ContactosApoyo`.
- Sin ID obligatorio: usar `id ?? `${index}-${nombre}`` como key (no el teléfono, para no exponerlo en keys/logs).

## 5. Seguridad, privacidad y UX
Según `docs/security-guidelines.md`:
- l.37 "Logging: sin PII/tokens/secrets"; l.62 "Logs: filtrar PII; usar id_anonimo"; l.57-60 datos de salud mental altamente sensibles, "nunca compartir datos clínicos fuera de flujos autorizados"; l.71 checklist "Sin logs con PII/secrets"; l.63 errores al cliente sin datos sensibles.
- Aplicación: no `console.log` de teléfonos/nombres ni en errores de `openURL` (los `.catch` actuales de use-panic están vacíos: mantener ese estilo, sin imprimir el error ni el URL); no enviar los contactos a ningún servicio de terceros ni analítica; la única salida es el intent al sistema (marcador/WhatsApp) iniciado por el usuario. No incluir nombre del usuario ni contenido clínico en el texto de WhatsApp (solo "Tienes cinco minutos para mi"). No enviar nada automático.
- Offline: leer de la caché local del kit (feature 95: SQLite/almacenamiento local). El modal NO debe depender de red ni `await` de API; cargar al abrir desde caché (síncrono si es posible). Si el hook aún está cargando, mostrar los contactos tan pronto estén (no bloquear). Considerar que `tel:` funciona sin datos; wa.me requiere datos/WiFi: avisar solo si falla.
- Datos sensibles en caché: confirmar con la feature 95 si va en SQLite plano o en SecureStore (guidelines l.40 usa SecureStore para tokens). Los teléfonos de contactos son PII; al cerrar sesión/logout la caché debería purgarse (hay `App/src/services/access-purge.ts` como precedente).
- UX en crisis: pocos toques (botón -> lista -> Llamar, 2 toques); botones grandes (>=48 px, igual que `secondaryButton`), texto empático, p. ej. título "Tus personas de confianza", subtítulo "No estás solo/a. Elige a quién quieres escribirle o llamarle."; sin jerga ni errores técnicos; accesibilidad (`accessibilityRole="button"`, `accessibilityLabel="Llamar a {nombre}"`); no pedir confirmación adicional antes de abrir el marcador (el SO ya lo hace); mantener visibles las líneas de emergencia (el disclaimer l.160-165 sigue siendo prioritario). Sin contactos: texto cálido tipo "Aún no has agregado personas de confianza. Puedes hacerlo en Perfil > Kit de autocuidado (Paso 4) para tenerlas a un toque cuando las necesites." con botón "Ir a mi Perfil" (si el host puede navegar) y "Entendido".
- Etiquetas pedidas: botón principal "Llamar a mi contacto de confianza"; acciones "Llamar" y "Enviar WhatsApp".

## 6. Riesgos y dudas abiertas
1. **Dependencia dura de 95 y 96**: no existe `useSafetyPlan` ni UI del Paso 4. Según CLAUDE.md se trabaja la feature `pending` de menor id (95 antes que 97). Definir interfaz esperada: `useSafetyPlan().trustedContacts: ISafetyContact[]` (+ `loading`) para poder mockearla en tests de 97.
2. **Dónde obtener los contactos**: `PanicModal` está montado en 3 hosts (navigator, welcome-screen, psychoeducation-topic-screen). Opciones: (a) que `PanicModal` use `useSafetyPlan` internamente (menos cambios en hosts, pero obliga a mockear el hook en `psychoeducation-topic-screen.test.tsx` y tests de modal); (b) prop nueva `trustedContacts` + `onOpenProfile` pasada desde los 3 hosts (más testeable, más cambios). Recomendación: prop opcional `trustedContacts?: ISafetyContact[]` con valor por defecto `[]`, cargada por el hook en cada host, o hook interno con fallback seguro si falla.
3. **Navegación al Perfil**: `welcome-screen` es pre-login/Home? Verificar que el usuario esté autenticado en cada host; en `welcome-screen` (posible estado sin sesión) el kit puede no existir. Mensaje "Perfil" debe tener sentido en esos hosts; el navegador global vive dentro de tabs (`Profile` tab existe, app-navigator ~l.121-126) pero en `psychoeducation-topic-screen` el botón navega fuera de HomeTabs (comentario l.95-100). Definir si el CTA navega o es solo texto.
4. **Modal anidado**: `PanicModal` ya es un `Modal`; abrir otro `Modal` encima funciona en RN pero en iOS puede fallar si se abre mientras se cierra el primero. Más seguro: vista interna alternante (como `showCountryPicker`) o reutilizar patrón de `InfoDialog` sin cerrar el modal padre. Resetear estado en `useEffect([visible])` (l.70-74).
5. **Teléfono sin validación**: backend acepta cualquier string/vacío. Normalización en cliente y ocultar "Enviar WhatsApp" si no es válido. Validar en feature 96 (formulario) y quizá endurecer backend (regex permisiva, descartar contactos sin teléfono) - fuera de alcance de 97.
6. **Números extranjeros**: asumir +57 solo en 10 dígitos que empiezan por 3; el resto sin prefijo no se envía a WhatsApp.
7. **Cambios nativos**: si se opta por `whatsapp://`/`canOpenURL`, hace falta `LSApplicationQueriesSchemes` y `queries` (rebuild EAS). Con wa.me no.
8. **Texto del mensaje**: "Tienes cinco minutos para mi" sin tilde en el acceptance; confirmar si se corrige a "mí".
9. **Palette guard**: los estilos nuevos deben usar solo tokens de `@/constants` (palette-guard.test.ts falla con colores hardcodeados).
10. **Tests**: añadir Linking spy; cubrir (a) sin contactos -> mensaje y guía a Perfil; (b) con contactos -> lista, "Llamar" abre `tel:`, "Enviar WhatsApp" abre `https://wa.me/57300...?text=Tienes%20cinco%20minutos%20para%20mi`; (c) teléfono inválido sin WhatsApp; (d) fallo de `openURL` no rompe ni loggea; (e) modo offline = hook mockeado con datos de caché y `fetch` no invocado. Actualizar los mocks de `use-panic`/hooks en psychoeducation test si cambia la firma.
11. `init.ps1` debe quedar verde (CLAUDE.md); no hacer commit; documentar en `progress/current.md`.
12. Posible desfase: `docs/vulneravilidades.md` y `docs/vulnerabilidades.md` (dos archivos); no relevantes para 97 salvo revisar si mencionan el kit de autocuidado.
