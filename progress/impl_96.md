# Implementación feature 96 — safety_plan_app_ui

Estado: implementada, pendiente de reviewer. `feature_list.json` NO se tocó. Sin commit. Los tests (jest) NO se ejecutaron aquí: el `node_modules` de la App es de Windows. Solo se verificó con `tsc` y `eslint`, más una comprobación manual (node 22, strip-types) de los casos de `normalizePhone`/`isValidPhoneFormat`: 0 fallos.

## Archivos (App/)
Nuevos (CRLF, como sus vecinos):
- `src/screens/safety-plan-screen.tsx`: solo UI, consume `useSafetyPlan`. Un único `KeyboardAwareScrollView` (`keyboardShouldPersistTaps="handled"`, `bottomOffset`, padding con `insets`). Acordeón de 7 pasos ("Paso n de 7", Paso 1 abierto), resumen por paso colapsado, tarjeta de crisis (106/123 con `tel:`, tomadas de `emergency-contacts.ts`, sin números nuevos), `DisclaimerBanner` + aviso propio del kit, aviso de sin sesión/offline/pendiente/sincronizando, botón Guardar ("Guardando…" / "Guardado ✓"), errorBox genérico, `ConfirmDialog` para eliminar.
- `src/components/safety-contact-list.tsx` y `src/components/safety-plan-step-card.tsx` (incluye `SafetyPlanTextField`): sin lógica de negocio; accesibilidad (role/label/state) en botones e inputs.
- `src/utils/phone.ts`: `isValidPhoneFormat` (7-15 dígitos, solo `+ ( ) . - espacio`), `normalizePhone` (E.164: respeta `+`/`00`; celular CO de 10 dígitos que empieza por 3 -> +57; `57`+celular -> +57; fijos y otros países sin `+` -> null, no inventa prefijos), `toWhatsAppNumber` (para la 97).
- `src/utils/safety-plan-validation.ts`: validación pura (`validateSafetyPlanForm`, `validateContact`, `isBlankContact`) y `prepareSafetyPlanForSave` (descarta filas vacías, recorta, normaliza teléfonos a +57 cuando procede).
- `src/data/safety-plan-steps.ts`: títulos, guías y placeholders de los 7 pasos + textos generales.
- Tests: `__tests__/phone.test.ts`, `safety-plan-validation.test.ts`, `safety-plan-screen.test.tsx`, `profile-screen-safety-plan.test.tsx`, `use-auth-logout.test.tsx`.
Modificados (ediciones aditivas, CRLF conservado y verificado: mismas líneas con `\r` que total):
- `src/screens/profile-screen.tsx`: opción `🧰 Kit de autocuidado` -> `navigate('SafetyPlan')` (antes de Notificaciones); el contenido superior (avatar..menú) pasó a un `ScrollView` de RN (Perfil no tiene TextInput) para que la 5ª opción no empuje disclaimer ni "Cerrar sesión" (quedan fijos abajo). Eso re-indenta ese bloque 2 espacios (diff mayor que la opción en sí).
- `src/navigation/app-navigator.tsx`: import, `SafetyPlan: undefined`, `<Stack.Screen name="SafetyPlan" .../>`.
- `src/hooks/use-auth.ts`: `logout` llama a `clearSafetyPlanCache().catch(() => undefined)` tras `api.clearTokens()`. No existe flujo de borrado de cuenta en la App (grep), así que solo logout. No se tocó `sync-manager`/`api.ts`.
- `progress/current.md`: sección añadida al final.

## Decisiones
- Paso 3: solo el nombre es obligatorio (teléfono opcional pero con formato válido si se escribe); Paso 4: nombre y teléfono obligatorios. Filas totalmente vacías no son error: se descartan al guardar. Errores solo se muestran tras un intento fallido de guardar; se abre el primer paso con error.
- Al guardar se normaliza el teléfono (p. ej. `300 123 4567` -> `+573001234567`); si no es normalizable (fijo) se guarda como lo escribió el usuario. La 97 debe volver a llamar a `normalizePhone`/`toWhatsAppNumber`.
- Invitado: sin login; si `syncState === 'local-only'` se muestra "se guarda solo en este dispositivo". No se leyó el contexto de auth en la pantalla.
- Fuente clínica: existe `manuales/Kit_prevención_suicida.md` (sección "Plan de seguridad"); de ahí salen los títulos/estructura de los pasos (p. ej. Paso 3 "Actividades con personas", Paso 5 "Dispositivos sanitarios"). El manual no trae textos guía por paso, así que las guías/placeholders son redacción propia (cálida, sin culpa, estilo Stanley-Brown, sin métodos ni medios).
- Excepción a README 3.B (copy en la app) documentada en el encabezado de `safety-plan-steps.ts`; el kit debe funcionar sin red.

## Textos pendientes de validación clínica (psicólogo cofundador)
Todo el contenido de `src/data/safety-plan-steps.ts`:
1. `intro` ("Este es tu espacio. Ve a tu ritmo…").
2. `crisisIntro` ("Si ahora mismo sientes que no puedes más o que estás en peligro, no esperes: llama.") y que las líneas sean 106 y 123.
3. `kitDisclaimer` (el kit no reemplaza atención profesional/línea de crisis) y si `DisclaimerBanner` ("autoayuda y acompañamiento psicoeducativo") es adecuado en esta pantalla.
4. `localOnly` ("Sin sesión… no se sube lo que hiciste aquí") y la decisión de producto de perder el plan de invitado al iniciar sesión.
5. Guías y placeholders de los Pasos 1 a 7 (especialmente Paso 6 "Cómo hacer mi entorno más seguro" y Paso 7 "Mis motivos para vivir"), y el uso de "tú"/"/a" neutro.
6. Etiquetas de Paso 5 (Ambulancia / Atención suicida / Psicólogo) y los ejemplos con 123/106.
7. Mensajes de validación en `safety-plan-validation.ts`.

## Evidencia real (App/)
- `timeout 170 npx tsc --noEmit`: exit 0, sin errores.
- `timeout 170 npx eslint` sobre archivos nuevos y modificados (pantalla, componentes, utils, data, profile-screen, app-navigator, use-auth y los 5 tests): exit 0, 0 errores; 4 avisos, todos preexistentes (use-auth l.55, app-navigator l.205/214, profile-screen l.65); los archivos nuevos no tienen avisos.
- jest: NO ejecutado.

## Comandos de jest para ejecutar en Windows (PowerShell, desde la raíz del repo)
```
cd App
npx jest __tests__/phone.test.ts
npx jest __tests__/safety-plan-validation.test.ts
npx jest __tests__/safety-plan-screen.test.tsx
npx jest __tests__/profile-screen-safety-plan.test.tsx
npx jest __tests__/use-auth-logout.test.tsx
npx jest __tests__/safety-plan-service.test.ts __tests__/use-safety-plan.test.tsx __tests__/sync-manager.test.ts
```
Luego `.\init.ps1` (tests + quality-check). Si `npx jest` se cuelga rastreando node_modules: `npx jest --roots '<rootDir>/src' '<rootDir>/__tests__' --no-watchman <archivo>`.

## Riesgos y deuda
- Tests escritos a ciegas (sin ejecutar): posibles ajustes menores (p. ej. mocks de `expo-apple-authentication`/`expo-constants` en `use-auth-logout`/perfil, `findByType(ScrollView)` en el mock de RN).
- Logout borra la caché del kit: si había cambios sin sincronizar (offline), se pierden. Es la contrapartida de privacidad pedida (M1); valorar avisar al usuario o intentar un flush antes.
- `setOnUnauthorized` (sesión expirada por 401) no limpia la caché; la protección sigue siendo el dueño `idAnonimo` de la 95.
- Perfil: el diff incluye re-indentación por el ScrollView. Conviene revisar visualmente en un móvil pequeño.
- No se probó en dispositivo: teclado, acordeón con teclado abierto, `tel:` y el layout.
- `sonarjs/no-duplicate-string` / complejidad: pantalla de ~545 líneas CRLF (con estilos); lint limpio, pero podría dividirse más.
- Sigue pendiente (95): descarte de 4xx en sync-manager (M3), cifrado SQLite, clave por owner para plan de invitado.
- 97: reutilizar `toWhatsAppNumber`/`normalizePhone`; `getTrustedContacts` solo recorta/filtra.

## Ronda 2 (cambios pedidos por el reviewer, progress/review_96.md)
Los tests siguen SIN ejecutarse aquí (node_modules de Windows). Sin commit; `feature_list.json` intacto; CRLF conservado en los archivos con CRLF (hook de la 95 sigue en LF).

### Cambios
1. B1 (bloqueante), guardado que pisaba el plan del servidor:
   - `use-safety-plan.ts`: expone `lastSyncedAt` (del último snapshot aplicado, incluso con cambios sin guardar). Los tests existentes del hook no cambian; 1 test nuevo.
   - `safety-plan-screen.tsx`: "Guardar" deshabilitado (`disabled` y `accessibilityState.disabled`) si `saving`, `loading`, `!isDirty` o falta lectura del servidor; `handleSave` también lo comprueba. Con sesión (`syncState !== 'local-only'`) y `lastSyncedAt === null` tras montar y cargar: aviso "No pudimos traer tu kit. Reconecta para no perder lo que ya tenías." con botón "Reintentar" (llama a `load`). El invitado (`local-only`) sí guarda en local.
   - Además (decisión mía, cierra el hueco de editar durante la carga: `applySnapshot` descarta el plan del servidor si hay cambios sin guardar): mientras `loading` o falta lectura del servidor los pasos quedan colapsados (no se puede escribir). El botón queda deshabilitado también tras "Guardado ✓" (no hay nada que guardar).
2. Salir con cambios sin guardar: listener `beforeRemove` (cubre "← Volver" y el botón atrás de Android); con `isDirty` frena y muestra `ConfirmDialog` "¿Salir sin guardar?" (Salir sin guardar / Seguir editando). Perfil: el diálogo de "Cerrar sesión" añade "Tu kit tiene cambios sin sincronizar y se borrará de este dispositivo al cerrar sesión." (syncState `pending`) o "Tu kit solo está en este dispositivo y se borrará al cerrar sesión." (`local-only` con contenido), leyendo `getCachedSafetyPlan()` al pulsar; nuevo `hasSafetyPlanContent` (utils/safety-plan-validation.ts). Si la lectura falla, el diálogo sale sin aviso. Cambio aditivo en `profile-screen.tsx` (2 constantes, 1 estado, `handleLogout`, `description`).
3. Tests reforzados: `bottomOffset` definido en el guard de teclado; `use-auth-logout` parte autenticado (`storage.get` devuelve un JWT con `exp` futuro; comprueba true -> false); `phone.ts` acepta `(+57) 300 123 4567` (se canoniza a `+57 …`) y `+` solo es inválido, con tests.
4. Menores: eliminado `contactsHint`; "Eliminar" con `minHeight: 48`; las tarjetas colapsadas ya no muestran texto del usuario (solo "Completado"/"Sin completar", nº de personas, "n de 3 datos").

### Tests nuevos o ajustados
- `safety-plan-screen.test.tsx`: mock de navegación con `addListener`/`dispatch`; default `isDirty: true`, `lastSyncedAt: 1`; el test de "Guardado ✓" ahora parte de `isDirty: true` y el mock pasa a `false` al guardar; bloque "proteccion del plan del servidor" (loading, `!isDirty`, sin lectura del servidor, Reintentar, invitado guarda, sin edición durante la carga); bloque "salir con cambios sin guardar" (frena, Salir continúa con `dispatch`, Seguir editando, sin cambios no frena); resumen sin texto del usuario.
- `profile-screen-safety-plan.test.tsx`: 5 casos del aviso al cerrar sesión (sin aviso, pending, local-only, local vacío, lectura fallida).
- `use-safety-plan.test.tsx`: `lastSyncedAt`. `phone.test.ts`, `use-auth-logout.test.tsx`: ver punto 3.

### Evidencia real (App/)
- `timeout 170 npx tsc --noEmit`: exit 0, sin errores.
- `timeout 170 npx eslint` (pantalla, componentes, utils, data, profile-screen, use-safety-plan.ts y 5 tests): 0 errores en todo lo de la 96 y sin avisos nuevos (queda el aviso preexistente profile-screen l.81 `no-nested-conditional`). `__tests__/use-safety-plan.test.tsx` (de la 95, fuera del gate que solo revisa `src/**`) tiene 3 `no-require-imports` y 1 `no-extra-arguments` ya existentes, no del cambio de esta ronda.
- jest: NO ejecutado.

### Comandos de jest para Windows (PowerShell, desde la raíz del repo)
```
cd App
npx jest __tests__/phone.test.ts
npx jest __tests__/safety-plan-validation.test.ts
npx jest __tests__/safety-plan-screen.test.tsx
npx jest __tests__/profile-screen-safety-plan.test.tsx
npx jest __tests__/use-auth-logout.test.tsx
npx jest __tests__/safety-plan-service.test.ts __tests__/use-safety-plan.test.tsx __tests__/sync-manager.test.ts __tests__/palette-guard.test.ts
cd ..
.\init.ps1
```

### Deuda restante
- Flush previo al logout (`flushPendingOps()` best-effort con timeout antes de `clearTokens()` cuando hay conexión): NO hecho; hoy solo se avisa. Dueño: antes de la 97.
- El logout no entra en `withSafetyPlanLock` (ventana estrecha con un guardado en vuelo).
- Un contacto a medias en el Paso 4 impide guardar todo el kit (criterio del feature; decisión de producto).
- La pantalla llama a `validateSafetyPlanForm`/`prepareSafetyPlanForSave`; podrían envolverse en el hook.
- Contactos sin `id` heredados del servidor: asignar id al cargar (95).
- `profile-screen-safety-plan.test.tsx` mockea un módulo de la 98 (`AccessStatusCard`).
- Tests sin ejecutar; el comportamiento de `beforeRemove`, teclado y `tel:` no se probó en dispositivo.
- Textos clínicos pendientes de validación: se añadieron "¿Salir sin guardar?", el aviso "No pudimos traer tu kit…" y los avisos de cierre de sesión.

## Ronda 3 (local primero)
Sección escrita a posteriori leyendo el código real (el implementer anterior se cortó por desconexión antes de documentarla). Sin commit; `feature_list.json` intacto.

### Qué se hizo (según el código)
- `hooks/use-safety-plan.ts`: el kit se lee primero de la caché local (`getCachedSafetyPlan`) y se marca `hydrated` en cuanto termina esa lectura; `loading` cubre solo la lectura local. La descarga del servidor corre después, en segundo plano, y se expone como `downloadState` (`idle | downloading | failed | done`). Sin conexión: `done` si ya hubo una descarga (`lastSyncedAt !== null`), `failed` si no. Invitado (`syncState === 'local-only'`): `idle`. Nuevo `cloudKitSkipped`: es `true` cuando el usuario ya editó (dirty) antes de que llegara la primera descarga, el servidor devolvió un kit sincronizado con contenido (`hasSafetyPlanContent`) y por eso NO se aplicó (los cambios sin guardar nunca se pisan); se limpia al guardar.
- `services/safety-plan-service.ts`: `pullSafetyPlanOnSessionStart()` (nunca lanza ni bloquea el login; sin sesión o sin red no hace nada; lo local pendiente gana porque `fetchSafetyPlan` no sobrescribe un registro `pending`).
- `hooks/use-auth.ts`: al abrir sesión (`isAuthenticated && isOnline`) llama a `pullSafetyPlanOnSessionStart()` en segundo plano, y reintenta cuando vuelve la conexión; `logout` sigue llamando a `clearSafetyPlanCache()`.
- `screens/safety-plan-screen.tsx`:
  - Aviso al invitado (`guestKit = isGuest || syncState === 'local-only'`): `ConfirmDialog` "Antes de empezar" (texto `SAFETY_PLAN_COPY.localOnly`) con "Entiendo" / "Iniciar sesión"; los pasos quedan bloqueados (colapsados) hasta aceptar.
  - Con sesión y sin primera descarga (`needsDownload = hydrated && !guestKit && lastSyncedAt === null`) ya NO se bloquea la edición (antes sí): se muestra un banner ("Descargando tu kit…" o "Aún no se ha descargado tu kit de la nube. Puedes seguir editando.") y, si el usuario pulsa Guardar en ese estado, un diálogo "Antes de guardar" con "Guardar de todas formas" (destructivo) / "Esperar".
  - Banner `cloudKitSkipped`: avisa de que hay un kit en la cuenta que no se aplicó por tener cambios sin guardar.
  - Reemplaza la protección de la ronda 2 (bloquear edición mientras no hubiera lectura del servidor y botón "Reintentar"): ahora manda lo local, y el riesgo de pisar la nube se maneja con aviso + confirmación.

### Decisiones
- Local primero: el usuario puede escribir de inmediato aunque no haya red ni descarga (el kit debe servir en una crisis).
- Los cambios locales sin guardar nunca se sustituyen por datos del servidor.
- La decisión de pisar o no la nube se deja al usuario con confirmación explícita.

### Caso límite residual (conocido, sin resolver)
Confirmar "Guardar de todas formas" con un kit en la nube aún no descargado REEMPLAZA el kit de la nube con lo local: no hay merge. Lo mismo ocurre si hay `cloudKitSkipped` y el usuario guarda. Hoy solo se avisa; un merge por paso o por contacto queda como mejora de producto.

### Deuda
- Sin merge local/nube (ver arriba).
- Sigue sin hacerse el flush previo al logout (ronda 2) ni el lock de logout.
- El diálogo del invitado se muestra siempre al abrir el kit sin sesión, aunque ya lo haya visto antes.
- Comportamiento de teclado, diálogos y estados offline no probado en dispositivo.

### Textos nuevos pendientes de validación clínica (`data/safety-plan-steps.ts`)
`downloading`, `notDownloaded`, `cloudKitSkipped`, `confirmSaveTitle` ("Antes de guardar"), `confirmSaveText` y la etiqueta "Guardar de todas formas" / "Esperar"; `localOnly` (reescrito: "Estás como invitado…") y las etiquetas "Entiendo" / "Iniciar sesión" del diálogo de invitado.

## Ronda 4 (teléfono con indicativo)
Sin commit; `feature_list.json` y archivos de la 98 intactos. CRLF conservado en los archivos que ya lo usaban (phone.ts, safety-plan-validation.ts, safety-contact-list.tsx y tests CRLF; `safety-plan-service.ts` sigue en LF).

### Cambio pedido
No asumir Colombia (+57). El usuario ingresa el indicativo del país en un recuadro aparte, junto al número.

### Qué se hizo
- Formato canónico sin cambiar el contrato ni el JSONB: `ISafetyContact.telefono` sigue siendo un string `+<indicativo> <número>`; el PRIMER espacio separa indicativo y número (`+57 3001234567`, `+1 2025550123`). Al guardar el número queda solo en dígitos.
- `src/utils/phone.ts` reescrito (se eliminan `normalizePhone` e `isValidPhoneFormat` y toda lógica +57/celular de 10 dígitos): `splitStoredPhone`, `formatStoredPhone(indicativo, numero)` (canónico o null), `validatePhoneParts` (con `PHONE_MESSAGES`), `toWhatsAppNumber(telefono)` (dígitos de indicativo+número, o null si no es canónico válido; lo usará la 97 para wa.me), `formatPhoneForDisplay`, además de `isCanonicalPhone`, `sanitizeIndicativo`, `sanitizeNumero`, `composePhoneDraft` y `PHONE_LIMITS`.
- Reglas: indicativo 1 a 4 dígitos, no empieza por 0; número 4 a 14 dígitos (solo dígitos y `( ) . - espacio`); total de dígitos <= 15; teléfono <= 40 caracteres (`SAFETY_PLAN_LIMITS`). Paso 4: nombre, indicativo y número obligatorios. Paso 3: opcional, pero número sin indicativo o indicativo sin número es error.
- Borradores: mientras se edita, un indicativo sin número se guarda como `+57 ` y un número sin indicativo como `300…` (sin '+'); ambos se vuelven a partir igual. Un `+57` recortado también cuenta como borrador.
- Datos antiguos sin espacio (`+573001234567`, `3001234567`): NO se adivina el indicativo. Al cargar todo va al campo Número (sin '+'), el Indicativo queda vacío y se muestra el aviso "Este número no tiene indicativo de país. Escríbelo en el recuadro «Indicativo» para poder guardarlo."; no se puede guardar el kit hasta completarlo (tras intentar guardar sale el error del campo). Los datos con formato canónico se parten bien.
- `components/safety-contact-list.tsx`: dos recuadros por contacto bajo la etiqueta "Teléfono" / "Teléfono (opcional)": "Indicativo" (prefijo visual '+', solo dígitos, máx. 4, `number-pad`, placeholder "País, ej. 57", sin valor por defecto) y "Número" (`phone-pad`, placeholder "Número"). accessibilityLabel: "Indicativo del país de la persona N de Paso X" y "Número de teléfono de la persona N de Paso X". Errores por campo (`indicativo`, `numero`), mostrados tras un intento de guardar. Colores solo vía COLORS.
- `utils/safety-plan-validation.ts`: `IContactErrors` ahora `{ nombre, indicativo, numero }`; `VALIDATION_MESSAGES` incorpora `PHONE_MESSAGES`; `prepareSafetyPlanForSave` deja el teléfono canónico (si no es canónico lo deja como estaba, pero la validación previa lo impide).
- `services/safety-plan-service.ts` `getTrustedContacts`: ahora solo devuelve contactos del Paso 4 con nombre y teléfono canónico válido (`toWhatsAppNumber !== null`). Los contactos con teléfono antiguo sin indicativo o inválido NO se ofrecen a la 97 (ni WhatsApp ni llamada), pero siguen en el kit. Consecuencia: `hasTrustedContacts` es false para ellos hasta que el usuario complete el indicativo. Documentado en el comentario de la función. La pantalla (`safety-plan-screen.tsx`) no cambió.

### Tests
- `phone.test.ts` reescrito; `safety-plan-validation.test.ts`, `safety-plan-screen.test.tsx` (recuadros aparte, edición de indicativo/número, borrador sin indicativo, datos antiguos con aviso y error, Paso 3 indicativo sin número, formato) y `safety-plan-service.test.ts` (`getTrustedContacts` excluye antiguos/ inválidos) actualizados. `use-safety-plan`, `sync-manager`, `use-auth-logout`, `profile-screen-safety-plan` no necesitaron cambios.

### Evidencia real (copia Linux $HOME/app-lx, sincronizada desde el repo)
- `npx tsc --noEmit`: exit 0, sin errores.
- `npx eslint` sobre phone.ts, safety-plan-validation.ts, safety-contact-list.tsx, safety-plan-service.ts, safety-plan-screen.tsx, phone.test.ts, safety-plan-validation.test.ts, safety-plan-screen.test.tsx: exit 0, 0 errores y 0 avisos. (`__tests__/safety-plan-service.test.ts` sigue con 9 errores de reglas que ya tenía: 7 `no-require-imports`, 1 `super-linear-regex` y 1 `no-extra-arguments`; no son de esta ronda y los tests no están en el gate que solo revisa `src/**`.)
- `npx jest --silent --no-watchman` sobre las 8 suites (phone, safety-plan-validation, use-safety-plan, safety-plan-service, use-auth-logout, profile-screen-safety-plan, safety-plan-screen, sync-manager): Test Suites 8 passed, 8 total; Tests 203 passed, 203 total (antes 186). Con palette-guard.test.ts (1 test) juntas: 9 suites, 204 tests, todos verdes.

### Textos nuevos pendientes de validación clínica (psicólogo cofundador)
1. "Teléfono" / "Teléfono (opcional)" con los recuadros "Indicativo" (placeholder "País, ej. 57") y "Número".
2. Aviso de datos antiguos: "Este número no tiene indicativo de país. Escríbelo en el recuadro «Indicativo» para poder guardarlo."
3. Errores: "Escribe el indicativo del país, por ejemplo 57." / "El indicativo lleva de 1 a 4 números y no empieza por 0." / "Escribe el número de teléfono." / "Revisa el número: usa solo números (de 4 a 14 dígitos)." / "Indicativo y número juntos admiten hasta 15 dígitos."
(Se reemplazan los antiguos "Escribe un teléfono para poder llamarle." y "Revisa el teléfono…", que ya no existen.)

### Deuda y notas
- Para la 97: usar `toWhatsAppNumber(contact.telefono)` (wa.me) y `getTrustedContacts`; para llamadas, `tel:+<indicativo><dígitos>` desde el canónico. Decidir si se ofrece a la persona completar el indicativo desde la pantalla de pánico para los contactos antiguos excluidos.
- Los contactos antiguos no tienen migración automática (decisión: no adivinar); el usuario debe completar el indicativo una vez.
- Con indicativo de 4 dígitos y sin espacio (`+5730`) un dato antiguo muy corto se leería como borrador de indicativo; es un caso residual sin impacto práctico (el número faltante bloquea guardar).
- No probado en dispositivo (teclado numérico, ancho de los recuadros en pantallas pequeñas: columna Indicativo de 120 px).
