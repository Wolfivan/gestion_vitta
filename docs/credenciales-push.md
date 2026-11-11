# Credenciales push (Android e iOS)

> Fecha: 2026-11-07. Release `release/kit-notificaciones` (App 0.4.0, Expo SDK 58).
> Los valores secretos (claves, tokens) van en `docs/secretos/produccion.local.md`, que no se versiona.

## Cómo viaja un push en VittalMind

```
Backend (push-client.ts) ──► servicio push de Expo (exp.host) ──► FCM (Android) / APNs (iOS) ──► teléfono
```

El Backend **no** habla directo con Google ni con Apple: le manda el aviso a Expo, y Expo usa las
credenciales nativas que tú subes a **EAS**. Por eso:

- En **Hostinger** solo van `PUSH_ENABLED`, `PUSH_DAILY_CAP`, `INTERNAL_NOTIFICATION_TOKEN` y,
  opcionalmente, `EXPO_ACCESS_TOKEN`.
- En **EAS** van la clave de cuenta de servicio de FCM V1 (Android) y la clave APNs (iOS).

Estado al 2026-11-07:
- La sesión de EAS está iniciada (`ivan_villegas_1`) y el proyecto es `1deed65c-490b-40a0-a789-6b788547a511`.
- **Android:** `google-services.json` está en `App/`, con el proyecto `220224673708` y el paquete
  `com.vittalmind.app`, ignorado por git. La usuaria subió la clave FCM V1 a expo.dev.
  `app.config.js` declara `googleServicesFile`.
  La variable de archivo secreta `GOOGLE_SERVICES_JSON` ya está en EAS (production).
- **iOS:** falta la clave APNs.

## Android: FCM V1

1. Entra a <https://console.firebase.google.com> con la cuenta dueña del proyecto de Google Cloud
   `220224673708`, el mismo de Google Sign-In. Usa **Agregar proyecto** y elige ese proyecto existente,
   para no crear uno nuevo.
2. En el proyecto, **Agregar app → Android**, con el paquete `com.vittalmind.app`. Descarga
   `google-services.json`.
3. Ponlo en `App/google-services.json`. Antes de la build hay que decidir cómo llega a EAS (ver
   "Pendiente en el código" abajo).
4. Firebase → ⚙️ **Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada**.
   Se descarga un JSON. **Es un secreto:** guárdalo en tu gestor de contraseñas y nunca en un repo.
5. Súbelo a EAS. Puedes hacerlo de dos formas:
   - en <https://expo.dev> → proyecto vittalmind → **Credentials → Android → com.vittalmind.app →
     FCM V1 service account key → Add**;
   - o por terminal, desde `App/`, con `eas credentials -p android`: perfil `production`, luego
     *Google Service Account → Manage your Google Service Account Key for Push Notifications (FCM V1)
     → Upload*.
6. Borra el JSON de la cuenta de servicio de tu carpeta de descargas.

## iOS: APNs

Necesita la membresía de Apple Developer, que ya existe (`ascAppId` 6798471228).

> `DataConf/AuthKey_V485A9QT8C.p8` es la llave de la **API de App Store Connect**. Sirve para que
> `eas-build-ios.ps1` compile y suba la app, pero **no envía push**. APNs necesita una llave aparte,
> y la API de App Store Connect no puede crearla: hace falta tu Apple ID o el portal web.

Lo que ya está listo en el código:
- el plugin `expo-notifications` agrega el entitlement `aps-environment` en la build;
- el perfil `production` de `eas.json` usa el entorno production de EAS;
- iOS `buildNumber` 14.

**Ruta A, por la web (sin terminal):**
1. <https://developer.apple.com/account/resources/authkeys/list> → **+**.
2. Nombre `VittalMind APNs`, marca **Apple Push Notifications service (APNs)**, entorno
   **Sandbox & Production**, y **Continue → Register**.
3. **Download**. El `.p8` se descarga **una sola vez**: guárdalo en `DataConf/`, que está ignorado,
   y en tu gestor de contraseñas. Anota el **Key ID** y tu **Team ID** (arriba a la derecha en el
   portal).
4. expo.dev → proyecto vittalmind → **Credentials → iOS → com.vittalmind.app → Push Key → Add**:
   sube el `.p8` con su Key ID y Team ID.

**Ruta B, por terminal:**
1. Desde `App/` (en la rama `release/kit-notificaciones` o en `main` después del merge):
   `npx eas-cli credentials -p ios`, perfil `production`.
2. *Push Notifications: Manage your Apple Push Notifications Key → Set up a new key*.
3. Inicia sesión con tu Apple ID cuando lo pida. EAS crea la llave en Apple y la guarda.

**Después, con cualquiera de las dos rutas:**
- Corre `.\eas-build-ios.ps1` desde `App/` en `main`. Si EAS pregunta si regenera el
  provisioning profile para agregar Push Notifications, responde **sí**: el perfil actual no tiene
  esa capacidad.
- En expo.dev → Credentials → iOS revisa que aparezcan **Push Key** y **Provisioning Profile**
  con fecha nueva.

## `EXPO_ACCESS_TOKEN` (opcional)

Solo hace falta si activas **Enhanced Security for Push Notifications** en expo.dev (proyecto →
Settings). Con eso, Expo rechaza pushes sin token, aunque alguien tenga un token de dispositivo.
Si lo activas:

1. expo.dev → **Account settings → Access tokens → Create**, de tipo robot si está disponible.
2. Pon el valor en `EXPO_ACCESS_TOKEN` del panel de Hostinger y en `docs/secretos/produccion.local.md`.

Recomendado, pero no bloquea el release.

## Por qué Claude no lo hizo

Los pasos exigen iniciar sesión en Firebase y en Apple con tus cuentas y descargar claves privadas.
Esas acciones quedan del lado de la usuaria. Las claves que no dependen de cuentas externas sí
quedaron generadas: `SAFETY_PLAN_ENCRYPTION_KEY` e `INTERNAL_NOTIFICATION_TOKEN`, en
`docs/secretos/produccion.local.md`.

## `google-services.json` en el código (hecho con la opción A)

`app.json` todavía no declara `android.googleServicesFile`. Sin esa línea, la build de Android no
incluye FCM y los push no llegan a Android.

`google-services.json` trae una API key de Firebase. No es un secreto de servidor, pero gitleaks la
detecta. EAS sube el proyecto respetando `.gitignore`. Hay dos opciones:

- **A (elegida):** dejarlo fuera de git y subirlo como variable de archivo de EAS
  (`eas env:create --name GOOGLE_SERVICES_JSON --type file --visibility secret --environment production`).
  Además, pasar `app.json` a `app.config.js` para leer
  `googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json'`.
- **B:** commitearlo en `App/` con una excepción de gitleaks para ese archivo, como recomienda Expo.

## Verificación después de la build

1. Instala la build, inicia sesión y acepta los avisos en Ajustes → Notificaciones.
2. Confirma que el dispositivo quedó registrado en la tabla de dispositivos de notificaciones de
   producción.
3. Dispara el tick a mano con el `curl` de `docs/secretos/produccion.local.md`, o espera el
   recordatorio de gratitud.
4. Si no llega: <https://expo.dev/notifications> (herramienta de prueba de Expo) con el token del
   dispositivo, y revisa los recibos (`getReceipts`) en el log del Backend.
