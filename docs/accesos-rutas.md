# Accesos: qué ruta exige qué feature

Feature 99 (`access_server_gating`). El acceso efectivo se calcula en la base en cada
petición (`getEffectiveAccess`), así que aprobar, otorgar o vencer un plan aplica de
inmediato sin volver a emitir el JWT.

## Rutas protegidas por plan

Orden de los guards: `authMiddleware` (401 sin sesión) y luego `requireFeature`
(403 `FEATURE_REQUIRED` si el plan efectivo no incluye la feature).

| Ruta | Feature |
|---|---|
| `POST /tools/cnv-translate` | `tool.cnv_translator` (sin la feature no se llama al proveedor de IA) |
| `GET /gratitude/entries`, `POST /gratitude/entry`, `GET /gratitude/streak` | `tool.gratitude` |
| `POST /timeline`, `GET /timeline`, `PUT /timeline/:id`, `DELETE /timeline/all`, `DELETE /timeline/:id` | `tool.timeline` |

Respuesta sin la feature:

```json
{ "error": { "message": "Tu plan no incluye esta funcion", "code": "FEATURE_REQUIRED" } }
```

Las claves están en `Backend/src/constants/access-features.ts` y deben coincidir con el
seed de `026_create_access_system.sql` y con `App/src/constants/access-keys.ts`.

## Rutas siempre libres (nunca dependen de un plan)

Autenticación y perfil (`/auth/*`), acceso y solicitudes (`/access*`), kit de autocuidado
(`/safety-plan`), directorio de profesionales (`/professionals*`), psicoeducación
(`/psychoeducation*`, que se protege por tema y bloque con `psychoeducation-gating`, no
por ruta), versión (`/app/version`), salud (`/health`), notificaciones, administración e
internas. El botón de pánico y las líneas de ayuda viven en la app y no llaman a rutas con
plan.

`Backend/tests/access-server-gating.test.ts` recorre el router y falla si una ruta
siempre libre usa `requireFeature` o si aparece una ruta protegida que no esté en esta
lista.

## Varios planes por usuario

Feature 100 (`access_multi_plan`, migración 029).

- **`usuario_planes` es un libro de otorgamientos**: cada entrega de un plan (admin,
  solicitud o código) es una fila. El vencimiento no se guarda: se calcula reproduciendo
  en orden las filas no revocadas (`computePlanExpiry` en `Backend/src/utils/plan-expiry.ts`,
  única implementación de la regla).
- **Regla**: una duración arranca en el mayor entre el otorgamiento y el fin anterior; una
  fecha fija toma el mayor entre ella y el vencimiento previo; sin vencimiento gana a
  cualquier fecha. Mismo plan extiende, plan distinto se agrega.
- **Acceso efectivo**: unión de las features de los planes vigentes más el plan default. Una
  feature compartida vale hasta la fecha más lejana (`featureExpira`; `null` = no vence).
- **Consecuencia**: como el default siempre suma, una feature que esté en el plan default
  nunca responde 403 a nadie. Para reservar una herramienta a un plan hay que quitarla del
  default, y eso también se la quita a los invitados.
- **`GET /access`** conserva `plan`, `expiraAt`, `vencido` y `features`, y agrega `planes` y
  `featureExpira`. `plan` es el plan principal: el vigente no default más reciente, o el
  default si no hay ninguno. `usuarios_auth.plan_codigo` y `plan_expira_at` guardan ese mismo
  plan principal para las apps ya instaladas.
- **Administración**: `POST /admin/access/users/:idAnonimo/plans` otorga y
  `DELETE /admin/access/users/:idAnonimo/plans/:planCodigo` revoca (marca `revocado_at`, nunca
  borra). El plan default no se otorga (400 `DEFAULT_PLAN_PROTECTED`). Reemplazan al antiguo
  `PUT /admin/access/users/:idAnonimo/plan`.
- **Job de vencimiento** (`POST /internal/access/expire`): registra una vez cada plan vencido
  en `plan_cambios`, marca `vencimiento_registrado_at` y actualiza el plan principal. El
  acceso no depende del job: se calcula en cada petición.
- **Pendiente para la feature 102**: `grantPlan` solo acepta los orígenes `manual` y
  `solicitud`; la FK de `codigo_id` y el motivo `codigo` de `plan_cambios` llegan con la 032.

## Códigos canjeables

Feature 102 (migración 032). `POST /access/redeem` exige sesión de cuenta. Acepta el código
en minúsculas, con o sin guiones y espacios, y la URL completa del QR.

- **Vigencia del acceso**: gana `fechaFinAcceso`; si no, la duración del código; si no, la del
  plan; si no hay ninguna, no vence. Las fechas son días en hora de Colombia y `validoHasta`
  y `fechaFinAcceso` incluyen todo ese día.
- **Respuestas**: `INVALID_CODE` (no existe o inactivo, mismo mensaje), `CODE_NOT_YET_VALID`,
  `CODE_EXPIRED`, `PLAN_NOT_AVAILABLE`, `CODE_ALREADY_REDEEMED`, `CODE_EXHAUSTED` y
  `REDEEM_RATE_LIMITED`.
- **Limitador**: 10 fallos en 15 minutos por cuenta y por IP. Solo cuenta `INVALID_CODE`. La
  cuenta reserva antes de consultar para frenar ráfagas y persiste en `intentos_canje`; la IP
  suma solo fallos reales, vive en memoria y nunca se guarda. Reservar por IP bloquearía a una
  sala entera canjeando a la vez.
- **`TRUST_PROXY_HOPS`**: número de proxies delante de la API. Si hay proxy y queda en 0, todas
  las personas comparten el límite por IP. **Debe configurarse al desplegar.**
- **Bloqueos**: el canje toma primero el código y luego el usuario. Otra transacción que tome
  ambos, como la revocación (feature 106), debe usar ese orden.
- **Administración** (`/admin/access/codes`): crear, listar, ver, editar límites y vigencia,
  activar o desactivar, eliminar sin canjes y `GET :id/qr`. Código y plan no se editan porque
  el QR ya pudo imprimirse. Solo se expone el conteo `usos`: ninguna ruta dice quién canjeó ni
  cuándo. Desactivar no quita el acceso a quien ya canjeó.
- **Retención**: `POST /internal/access/expire` borra los intentos de más de 24 horas.
- **Tarjeta** (feature 103): no imprime el plan ni la etiqueta, solo "Bono de acceso", para que
  un papel no revele una población.
- **Página `/canjear`** (feature 103): la sirve `vittalmind-accesos` sin tema ni `wp_head()`, con
  CSP y `noindex`. El código va en el fragmento y no llega al servidor; sin scripts de terceros
  tampoco lo puede leer una analítica. Tapa cualquier página de WordPress con esa ruta.

### Canje en la app

Feature 104. Solo las cuentas ven Redimir (Perfil) y "¿Tienes un código?" (solicitud).

- **Nada canjea solo**: un QR o un enlace dejan el código escrito y la persona toca Canjear.
- **Escáner**: acepta la URL exacta del bono, `vittalmind://canjear` o un código directo. Otro QR
  se rechaza y nunca se abre.
- **Enlaces**: `use-redeem-link` solo procesa `vittalmind://canjear`; ignora el resto, como el
  retorno de Google. Sin sesión, el código espera 24 horas en `storage`; con sesión abre la
  pantalla al terminar el aviso y las preguntas de seguridad.
- **`storage`**: en el teléfono usa SecureStore, que solo admite claves con letras, números,
  `.`, `-` y `_`. Una clave con otros caracteres falla y, si hay `try/catch`, sin avisar.
- Para los revisores de tiendas, ver `docs/revision-tiendas.md`.

### Desactivar, revocar y eliminar

Feature 106 (migración 033).

| Acción | Qué hace | Quien ya canjeó |
|---|---|---|
| Desactivar | Impide nuevos canjes; se puede volver a activar | Conserva el acceso |
| Revocar | Quita el acceso que dio el código e inutiliza el código | Lo pierde, salvo por otra vía |
| Eliminar | Borra el registro; solo sin canjes | No aplica |

- `POST /admin/access/codes/:id/revoke` marca los otorgamientos con ese `codigo_id` y recalcula
  con `computePlanExpiry`, en una transacción. Es idempotente y conserva el primer motivo.
  `GET :id/revoke-preview` da solo el total de personas.
- Actúa sobre el código completo, nunca sobre una persona, y no borra datos del usuario.
- Un código revocado no se reactiva (409 `CODE_REVOKED`): se crea uno nuevo.
- **Anonimato**: un otorgamiento de plan oculto que vino de un código sigue enmascarando aunque
  esté revocado. Si no, comparar el panel antes y después de revocar revelaría a toda la
  población. Quitar a mano un plan oculto sí devuelve la identidad.
- `GET /access` trae `accesoCodigoRevocado` durante 30 días si la persona perdió el plan; quien
  lo conserva por otra vía no recibe aviso. La app muestra "Tu acceso por código ya no está
  vigente" hasta que se cierra.

## Avisos de acceso

Feature 105 (migración 034).

- **Push**: solicitud aprobada o rechazada y plan por vencer a 7 días o menos. Respetan
  `enabled` y `access_enabled` (interruptor "Mi acceso y planes"), al crear y al enviar, y el
  horario de silencio. Un push aprobado en silencio espera a que termine.
- **Privacidad**: las plantillas no llevan nombre de plan porque se ven en la pantalla
  bloqueada. Si se editan en el plugin de notificaciones hay que mantenerlo así.
- **Vencimiento**: la clave de duplicado incluye plan y fecha: extender genera un aviso para
  la fecha nueva. Un plan de 7 días o menos no se avisa. Necesita el tick del motor.
- **Fallos**: encolar va después del commit y nunca tumba una aprobación.
- **Correo**: WP-Cron de `vittalmind-accesos` consulta cada hora y envía un solo `wp_mail` con
  el número de solicitudes nuevas y el enlace al panel, sin correo ni mensaje de quien solicita.
  El menú usa el último valor guardado. Si la sesión del backend expira, el panel lo avisa.
- **Producción** necesita: cron del tick y de `/internal/access/expire`,
  `INTERNAL_NOTIFICATION_TOKEN`, credenciales FCM y APNs, SMTP en WordPress y tráfico o un cron
  real, porque WP-Cron solo corre con visitas.

## Candado por categoría de psicoeducación

Feature 101 (migración 031). `categorias_psicoeducacion.acceso_feature_key` admite una
feature de tipo `contenido`; NULL es libre. El contenido queda visible con candado, sin modo
oculto, así que el título y la descripción deben ser neutros.

- `GET /psychoeducation` devuelve `accesoFeatureKey` y no depende de la sesión; la app
  calcula el candado con el acceso del usuario.
- `GET /psychoeducation/:slug` con la categoría bloqueada devuelve título y metadatos,
  `locked: true` y `temas: []`.
- `GET /psychoeducation/:slug/:temaId` con la categoría bloqueada responde 403
  `FEATURE_REQUIRED`, sin título ni bloques.
- Las rutas `/psychoeducation/admin/*` devuelven `accesoFeatureKey` y nunca redactan.
- La app no guarda en caché el detalle de una categoría con feature: esa caché no distingue
  cuentas y filtraría títulos de temas a otra cuenta del mismo dispositivo.

## Identidad oculta

Feature 93 (migración 030, plugin `vittalmind-accesos`). Un plan con `oculta_identidad` es
para poblaciones sensibles. Una regla en la base impide que sea solicitable o default.

- **El enmascarado ocurre en el servidor**: `IAdminUser` y las solicitudes de administración
  devuelven `nombre`, `email`, `emailContacto` y `mensaje` en `null`, con
  `identidadOculta: true`. El plugin solo muestra los 8 primeros caracteres del `id_anonimo`.
- **Cubre planes ya vencidos**: basta un otorgamiento no revocado. Si el vencimiento devolviera
  el nombre, el panel revelaría quién estuvo en la población. Solo revocar el plan lo levanta.
- **La búsqueda por nombre o correo excluye** estas identidades, para que no sirva para
  confirmar a alguien. Se encuentran filtrando por plan.
- **Listados**: `GET /access/plans` no devuelve estos planes y `GET /admin/access/requests`
  omite las solicitudes de ellos. Marcar un plan como oculto cancela sus solicitudes abiertas.
- **Límite**: protege frente al panel, no frente a quien administra la base, porque
  `usuarios_auth` guarda el correo y el `id_anonimo` en la misma fila. `notas_admin` es texto
  libre del administrador y no se enmascara.

## Perder el plan no borra datos

- Ningún endpoint ni job elimina registros por falta de feature: las lecturas y
  escrituras de la herramienta responden 403 y los datos quedan intactos. Al recuperar
  el plan vuelven a verse (test de punta a punta en `access-server-gating.test.ts`).
- En la app, un 403 `FEATURE_REQUIRED` nunca retira operaciones de la cola offline. La
  entidad queda en pausa (sin reintentos) y se reanuda sola cuando el contexto de acceso
  carga un plan que vuelve a incluir la feature, o al cambiar de sesión
  (`sync-manager.ts`, `access-events.ts`).
- La app recarga el acceso del servidor (los candados se actualizan) y muestra un aviso
  con el botón "Ver opciones de plan" hacia la solicitud (`FeatureRequiredNotice`). El
  aviso no se repite antes de 10 minutos.
- Solo se purgan las descargas de psicoeducación al perder features, como ya hacía la 98.
