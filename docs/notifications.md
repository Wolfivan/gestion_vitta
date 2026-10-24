# Notificaciones push

> Sistema reutilizable de notificaciones push para VittalMind. Hoy envía el
> recordatorio diario de gratitud; el mismo motor sirve para motivación y avisos.

## Principios

- **Anonimato primero.** Todo se vincula a `id_anonimo`. Los payloads no llevan
  nombre, correo, texto de gratitud ni datos clínicos.
- **Opt-in explícito.** `gratitude_reminder_enabled` nace en `FALSE`. El permiso
  del sistema solo se pide cuando la persona pulsa «Activar notificaciones».
- **Sin insistencia.** Un solo recordatorio al día por persona, ventana de 15
  minutos, horario de silencio y tope diario configurable.
- **Copy revisable sin recompilar.** Las plantillas viven en la base de datos y
  se editan desde la API admin / plugin de WordPress.

## Arquitectura

```
App (Expo)                    Backend (Express)                Expo Push
──────────                    ─────────────────                ─────────
registerDevice ─────────────▶ notification_devices
preferences    ─────────────▶ notification_preferences
                                       │
cron / interval ──▶ POST /internal/notifications/tick
                                       │
                              notification-dispatcher
                                ├─ resolvers (generan jobs)
                                ├─ claimPendingJobs (SKIP LOCKED)
                                ├─ push-client ───────────────▶ /push/send
                                └─ receipts ──────────────────▶ /push/getReceipts
                                       │
                              notification_jobs + deliveries
```

### Tablas (migraciones 024 y 025)

| Tabla | Propósito | Retención |
|---|---|---|
| `notification_devices` | Token Expo, plataforma, zona horaria, estado | Se purga el token inactivo > 180 días |
| `notification_preferences` | Toggles, hora local, horario de silencio | Mientras exista la cuenta |
| `notification_templates` | Copys versionados por clave | Permanente |
| `notification_jobs` | Un job por envío, con `dedupe_key` único | 180 días |
| `notification_deliveries` | Ticket de Expo por dispositivo | En cascada con el job |

Todas las tablas tienen RLS activado. El Backend conecta como `postgres`
(owner + BYPASSRLS); `anon` y `authenticated` de PostgREST quedan denegados,
igual que en las migraciones 022/023.

## API

### App (JWT de usuario)

| Método | Ruta | Cuerpo / respuesta |
|---|---|---|
| `POST` | `/notifications/devices` | `{ deviceId, pushToken, platform, appVersion?, locale?, timezone? }` |
| `DELETE` | `/notifications/devices/:deviceId` | `204` |
| `GET` | `/notifications/preferences` | Preferencias actuales |
| `PUT` | `/notifications/preferences` | Cualquier subconjunto de toggles/horas |

El registro solo devuelve `{ deviceId, platform, pushEnabled, timezone }`; nunca
repite el token.

### Interno (cron)

```
POST /internal/notifications/tick
X-Internal-Token: <INTERNAL_NOTIFICATION_TOKEN>
```

Devuelve contadores (`jobsCreated`, `jobsSent`, `deliveriesSent`, etc.). Si
`INTERNAL_NOTIFICATION_TOKEN` está vacío responde `503
INTERNAL_TRIGGER_DISABLED`. Es idempotente: dos ticks simultáneos no duplican
envíos gracias a `dedupe_key`, `FOR UPDATE SKIP LOCKED` y el flag `isRunning`.

### Admin (JWT + rol admin)

| Método | Ruta |
|---|---|
| `GET` | `/admin/notifications/templates` |
| `PUT` | `/admin/notifications/templates/:key` |

Editar una plantilla incrementa `version`. El plugin de WordPress
(`plugins/vittalmind-notificaciones`) es la interfaz recomendada.

## Reglas del recordatorio de gratitud

Se crea un job solo si se cumplen **todas**:

1. La plantilla `gratitude_daily_reminder` está activa.
2. `enabled = TRUE` y `gratitude_reminder_enabled = TRUE`.
3. Hay un dispositivo con token válido.
4. `current_streak >= 1` (no se insiste a quien aún no tiene hábito).
5. No completó el día en **su** fecha local.
6. La hora local cae dentro de `reminder_time_local` + 15 minutos.
7. No está dentro del horario de silencio.
8. No superó `PUSH_DAILY_CAP` en las últimas 24 h.
9. No existe ya el job `idAnonimo:gratitude_daily_reminder:YYYY-MM-DD`.

## Programación

### Opción A — cron externo (recomendada si hay VPS)

```cron
*/5 * * * * curl -fsS -X POST \
  -H "X-Internal-Token: $INTERNAL_NOTIFICATION_TOKEN" \
  https://app.vittaminds.com/internal/notifications/tick >/dev/null
```

### Opción B — dentro del proceso Node

```
NOTIFICATION_SCHEDULER=interval
NOTIFICATION_TICK_INTERVAL_MS=300000
```

`index.ts` arranca un `setInterval(...).unref()`; no impide apagar el proceso.
Con varias instancias del Backend, usar solo una en modo `interval` o pasar
todas a `endpoint` para evitar ticks redundantes (aunque son seguros).

## Variables de entorno

| Variable | Default | Notas |
|---|---|---|
| `PUSH_ENABLED` | `true` | `false` = kill switch |
| `PUSH_DAILY_CAP` | `3` | Envíos por usuario / 24 h |
| `EXPO_ACCESS_TOKEN` | vacío | Opcional, Enhanced Push Security |
| `INTERNAL_NOTIFICATION_TOKEN` | vacío | Obligatorio para el tick |
| `NOTIFICATION_SCHEDULER` | `endpoint` | `endpoint` \| `interval` |
| `NOTIFICATION_TICK_INTERVAL_MS` | `300000` | Solo en `interval` |

## Preparación nativa (EAS)

Expo Go **no** soporta push desde SDK 53. Para probar en un dispositivo real
hace falta un development build y credenciales FCM V1 / APNs:

1. `eas credentials` → configurar FCM V1 (Android) y APNs (iOS).
2. `eas build --profile development`.
3. Instalar el build y conceder el permiso desde la app.

`app.json` ya declara el plugin `expo-notifications`, el permiso
`POST_NOTIFICATIONS` de Android y el `projectId` de EAS.

## Privacidad

- Nunca se envía el texto de una entrada de gratitud ni el nombre.
- El payload solo contiene `templateKey`, `category`, `deepLink` y `data`
  (pantalla destino).
- Los logs no incluyen tokens push completos ni PII.
- El logout desvincula el dispositivo (best effort) antes de borrar la sesión.
- Los receipts `DeviceNotRegistered` desactivan el token automáticamente.

## Operación y diagnóstico

- **No llega nada:** revisar `PUSH_ENABLED`, que la persona haya activado el
  recordatorio, que tenga racha ≥ 1, la hora/zona horaria y el horario de
  silencio.
- **Todo falla con 503:** falta `INTERNAL_NOTIFICATION_TOKEN`.
- **`DeviceNotRegistered`:** token viejo; se desactiva solo. Al reabrir la app se
  vuelve a registrar.
- **Prueba manual:** `POST /internal/notifications/tick` debe devolver contadores
  y no un error.

## Extensiones previstas

Para añadir un tipo de notificación:

1. Crear un generador en `Backend/src/services/notification-resolvers/` que llame
   a `createJob(idAnonimo, templateKey, category, dedupeKey, scheduledAt)`.
2. Registrarlo en `notification-resolvers/index.ts`.
3. Añadir la plantilla en una migración y su toggle en preferencias si aplica.

El envío, reintentos, receipts, límites y purga ya están resueltos por el motor.
