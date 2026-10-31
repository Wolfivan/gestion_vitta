# Plan — Kit de autocuidado (features 95, 96, 97)

Fecha: 2026-10-28. Estado: PLAN, sin código implementado. Investigación en
`progress/research_95_foundation.md`, `research_96_ui.md`, `research_97_panic.md`.
Orden obligado por dependencias: 95 -> 96 -> 97. Una feature a la vez (AGENTS.md §3).
Flujo por feature: implementer -> reviewer -> security-auditor -> sonar-verifier -> done.

## Decisiones del usuario (2026-10-28)
- B1: empezar por la 95 ya; dejar la 98 intacta; parar antes de la 96 hasta que la 98 esté commiteada o cerrada.
- B2: textos de los pasos en App/src/data/safety-plan-steps.ts (excepción a 3.B documentada), sobrescribible luego desde backend.
- B3: mensaje de WhatsApp = "Tienes cinco minutos para mí" (con tilde).
- B4: invitado usa el kit solo en local; se valida idAnonimo al iniciar sesión para no subir el plan a otra cuenta.

## Bloqueos previos (resueltos arriba)
B1. La feature 98 está `in_progress` y `progress/current.md` dice que la serie 98-105 va antes que 95-97.
    El árbol de trabajo tiene cambios sin commitear de la 98 en profile-screen.tsx, app-navigator.tsx y home-screen.tsx (los toca la 96).
B2. Texto de los 7 pasos: la regla 3.B del README pide contenido clínico dinámico desde backend, pero no existe
    endpoint de copys y el kit debe funcionar offline en una crisis.
B3. Mensaje de WhatsApp: el criterio dice "Tienes cinco minutos para mi" (sin tilde). ¿"mí"?
B4. Invitado (sin sesión): el backend exige auth. ¿Kit solo local o pedir login?

---------------------------------------------------------------------
## Feature 95 — safety_plan_app_foundation
Objetivo: tipos, persistencia local offline-first, servicio y hook `useSafetyPlan`.

Archivos nuevos
- App/src/types/safety-plan.ts (+ export en types/index.ts): ISafetyContact {id?, nombre, telefono},
  ISafetySanitaryDevices, ISafetyPlan, ISafetyPlanInput, TSafetyPlanSyncState, createEmptySafetyPlan().
- App/src/services/safety-plan-service.ts: getCachedSafetyPlan, fetchSafetyPlan, saveSafetyPlan (optimista),
  loadSafetyPlan, clearSafetyPlanCache, getTrustedContacts(plan) (Paso 4, filtra vacíos).
- App/src/hooks/use-safety-plan.ts (+ export en hooks/index.ts): plan, loading, saving, error, isError,
  syncStatus, hasPendingChanges, load, savePlan, updateStep, add/update/removeContact(paso 3|4),
  trustedContacts, hasTrustedContacts.
- App/__tests__/safety-plan-service.test.ts y use-safety-plan.test.tsx.
Archivos a tocar
- App/src/services/sync-manager.ts: rama `safety_plan` en pushPendingOp -> api.put('/safety-plan', plan completo);
  al responder 200 reescribir la caché. (Excede la lista literal del criterio: se documenta en current.md.)
- App/__tests__/sync-manager.test.ts: casos de la rama nueva.

Pasos
1. Tipos espejo del backend (camelCase). Alias semántico para Paso 3, sin cambiar el JSON.
2. Persistencia: SQLite vía getDatabase(); fila única en `app_config` (clave safety_plan:v1, con idAnonimo)
   o tabla nueva `safety_plan_cache`. SecureStore descartado (límite de tamaño). Sin dependencias nuevas.
3. Servicio: lectura de caché instantánea; guardado local primero (synced=0) -> UNA sola op pendiente
   `safety_plan` (coalescer: borrar la previa antes de insertar) -> flushPendingOps. PUT siempre con el plan completo.
   No sobrescribir la caché con un GET si hay cambios pendientes. Validar en cliente los límites del backend
   (textos 10000, listas 50, nombre 150, teléfono 40, Paso 5 = 60) para que el PUT nunca dé 400.
4. Privacidad: guardar idAnonimo con la caché y descartarla si no coincide con la sesión; no loggear plan,
   contactos ni payloads (imitar recordFailedOp).
5. Hook: patrón use-gratitude (caché primero, luego sync si online, recarga al volver online).
6. Tests (react-test-renderer; no hay RNTL ni renderHook): caché vacía/hidratada, online GET y reescritura,
   offline solo caché, guardado offline encola sin llamar a api.put, error de red conserva cambios,
   no pisar cambios pendientes, getTrustedContacts, coalescencia de ops, no se loguea el plan.
Riesgos: last-write-wins sin versión; sync-manager reintenta indefinidamente un 400 (validar en cliente);
logout no limpia SQLite (decidir si se limpia en 95 o queda como deuda para 96/97); SQLite sin cifrar (igual que gratitude/timeline).
Verificación: npm test (App), tsc, eslint, quality-check, init verde.

---------------------------------------------------------------------
## Feature 96 — safety_plan_app_ui   (depende de 95)
Objetivo: SafetyPlanScreen con los 7 pasos, accesible desde Perfil.

Archivos nuevos
- App/src/screens/safety-plan-screen.tsx (solo UI; consume useSafetyPlan, nunca la API).
- App/src/components/safety-contact-list.tsx y safety-plan-step-card.tsx (sin lógica de negocio).
- Validaciones puras (nombre/teléfono obligatorios en Paso 4, formato, límites) + App/src/utils/phone.ts
  (normalización compartida con la 97).
- Textos de los pasos: App/src/data/safety-plan-steps.ts (según B2).
- App/__tests__/safety-plan-screen.test.tsx, validación y opción de Perfil.
Archivos a tocar
- App/src/screens/profile-screen.tsx: opción "🧰 Kit de autocuidado" -> navigate('SafetyPlan').
  Perfil no hace scroll: revisar que no empuje disclaimer y logout fuera de pantalla en móviles pequeños.
- App/src/navigation/app-navigator.tsx: `SafetyPlan: undefined` en RootStackParamList + import + Stack.Screen.

Pasos
1. Esperar a que 95 esté done; fijar el contrato del hook.
2. Ruta y opción de Perfil (copiar el bloque de Notificaciones).
3. Pantalla: un único KeyboardAwareScrollView (keyboardShouldPersistTaps="handled"), pasos en acordeón con
   "Paso n de 7" para baja fricción. Pasos 1, 2, 6, 7 texto multilínea; Pasos 3 y 4 listas con agregar/eliminar
   (ConfirmDialog para eliminar); Paso 5 tres campos cortos (ambulancia, atención suicida, psicólogo).
4. Paso 4: nombre y teléfono obligatorios, validación y normalización (+57 solo en celulares de 10 dígitos que empiezan por 3).
5. Guardado: botón con "Guardando…/Guardado ✓", errorBox genérico (sin datos sensibles), banner de pendiente/offline (modelo gratitude).
6. DisclaimerBanner visible + línea de crisis (106/123). Validar texto con el psicólogo.
7. Tests: render de los 7 pasos, agregar/eliminar contactos, validaciones, disclaimer presente, guard del teclado,
   estados guardando/guardado/error, opción en Perfil (con mocks de useFocusEffect y goBack).
Riesgos: contenido clínico sin fuente en el repo (probable Kit_prevención_suicida.*); palette-guard (solo tokens COLORS);
complejidad sonarjs (dividir en subcomponentes); accesibilidad (labels en inputs y botones).

---------------------------------------------------------------------
## Feature 97 — panic_trusted_contacts   (depende de 95 y 96)
Objetivo: en PanicModal, "Llamar a mi contacto de confianza" con llamada y WhatsApp, offline.

Archivos a tocar
- App/src/components/panic-modal.tsx: reemplazar el botón (l.123-130, hoy abre InfoDialog "Próximamente") por
  "Llamar a mi contacto de confianza". Vista interna alternante (como showCountryPicker), no un Modal anidado.
  Prop opcional trustedContacts?: ISafetyContact[] = [] y, si procede, onOpenProfile.
- Hosts (3): app-navigator.tsx, welcome-screen.tsx, psychoeducation-topic-screen.tsx (pasan contactos desde la caché local).
- App/src/hooks/use-panic.ts: openTrustedCall(contact), openTrustedWhatsApp(contact), sin loggear.
- App/__tests__/panic-modal.test.tsx (props nuevas) y psychoeducation-topic-screen.test.tsx (mock del hook).
Pasos
1. Leer contactos de la caché local (sin red ni await de API).
2. Sin contactos: mensaje cálido guiando a Perfil > Kit de autocuidado (Paso 4), con "Ir a mi Perfil" si el host puede navegar.
3. Con contactos: lista, 2 toques. "Llamar" -> tel:. "Enviar WhatsApp" -> https://wa.me/<num>?text=<encodeURIComponent(mensaje)>
   (sin cambios nativos). Si el teléfono no es normalizable, ocultar WhatsApp y dejar solo Llamar.
4. Fallos de openURL: mensaje no técnico, sin loggear número ni URL.
5. Tests: Linking.openURL con spy; sin contactos; con contactos; tel; wa.me con texto codificado; teléfono inválido;
   fallo de openURL; sin llamadas de red.
Riesgos: los 3 hosts deben tener sesión/caché; en welcome-screen puede no haber sesión; palette-guard; texto exacto del mensaje (B3).

---------------------------------------------------------------------
## Cierre por feature (AGENTS.md §5)
init verde, quality-check PASS, security-auditor y sonar-verifier sin CRITICAL/HIGH, progress/current.md al día
mientras se trabaja, status done solo tras APPROVED del reviewer, resumen a progress/history.md. Sin commits.

## Cambio de diseño del usuario (2026-10-29): LOCAL PRIMERO
- Los datos se guardan en el dispositivo y esa copia manda. Con sesión: se guardan en local y en una cola que sube en segundo plano al servidor.
- Al abrir sesión en otro dispositivo: descarga el kit del servidor y lo guarda en local. Si modifica algo: primero local, luego se actualiza en segundo plano.
- Invitado: aviso ANTES de empezar de que los datos se borrarán al salir o al iniciar sesión (otra cuenta).
- Esto sustituye el bloqueo de edición hasta leer el servidor (B1 de review_96) por: descarga al abrir sesión + local pendiente siempre gana.
