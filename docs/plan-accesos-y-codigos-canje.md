# Plan: tipos de usuario/planes, cambio de plan y códigos canjeables (QR)

> Documento de planificación. Fecha: 2026-10-28 (v2: incorpora las decisiones del 28-oct, ver §6). Base: lectura de README, AGENTS,
> `feature_list.json` (features 87-93) y del código real de Backend, App y plugins.
> No se modificó código ni `feature_list.json`. Las decisiones tomadas y las que
> siguen abiertas están en la sección 6.

---

## Decisiones del 2026-10-30 (v3, prevalecen sobre lo anterior)

1. **Solo las cuentas canjean.** El invitado no ve la opcion de canjear (ni en Perfil ni en AccessRequest) y `POST /access/redeem` rechaza sin sesion. Motivo: un codigo de pago no debe perderse al reinstalar. Si un invitado abre un enlace de canje, la app guarda el codigo, le pide iniciar sesion o crear cuenta y lo deja listo al volver. Esto reemplaza la idea anterior de canje anonimo; el anonimato de las poblaciones sensibles se mantiene en el panel (solo totales, sin lista, nombres, correos ni fechas por persona).
2. **El QR es el bono.** Contiene `https://www.vittaminds.com/canjear#codigo=CODIGO`. Con la camara del celular abre la pagina (tutorial, codigo con boton Copiar, Abrir en la app y tiendas); dentro de la pantalla de canje de la app, el mismo QR otorga el plan tras una confirmacion de un toque. Enlaces universales y recuperacion del codigo tras instalar quedan para una version posterior.
3. **Boton Redimir en Cuenta (Perfil)** lleva a la pantalla de canje. El PDF, la imagen y la pagina traen un tutorial de tres pasos: abre la app e inicia sesion, entra a Cuenta y toca Redimir, escribe el codigo o escanea el QR.
4. **Perder un plan no borra datos.** Solo se pierde el acceso a la herramienta; si el plan vuelve, los datos siguen. Se purgan unicamente las descargas de contenido. Un 403 FEATURE_REQUIRED nunca retira operaciones de la cola offline. Panico, lineas de ayuda y kit de autocuidado nunca dependen de un plan.
5. **Otorgamientos como libro** (`usuario_planes`, migracion 029): cada admin, solicitud o codigo es un registro; el vencimiento por plan se calcula reproduciendo los no revocados. Reglas: mismo plan se suma al vencimiento actual, plan distinto se agrega, cada funcion vale hasta la fecha mas lejana, sin vencimiento gana a cualquier fecha.
6. **Feature 106 `access_code_revoke`** (migracion 033): *desactivar* impide nuevos canjes, *revocar* quita el acceso que dio el codigo sin tocar datos ni otras vias de acceso, *eliminar* borra el registro y solo se permite sin canjes. Actua sobre el codigo, no sobre personas.
7. **Se mantiene simple:** un codigo compartido por PDF (sin lotes de un solo uso), limite de 10 intentos fallidos en 15 minutos por cuenta e IP, vigencias en hora de Colombia, aviso de vencimiento dentro de la app a 7 dias y el dia que vence (el push y el correo son de la 105), plan con identidad oculta fuera de listados publicos y con nombre neutro.
8. **Orden:** 98, 99, 100, 93, 101, 102, 103, 104, 106, 105. Migraciones: 029 (multi-plan), 030 (identidad oculta, feature 93), 031 (categorias, feature 101), 032 (codigos), 033 (revocacion). La 028 es del kit de autocuidado.

## Mejoras futuras registradas (feature 103)

- Enlaces universales (App Links y Universal Links) para que el QR abra la app directamente.
- Recuperar el código tras instalar la app desde la tienda.

## 1. Objetivo

1. **Planes N** (no solo free/vip): cada plan con sus herramientas, módulos y
   opciones de psicoeducación (temas y categorías), incluidos planes exclusivos para
   una población concreta.
2. **Cambio de plan** por dos vías: solicitud desde la app (ya existe) y **canje de
   código** (nuevo).
3. **Códigos configurables** (estilo cupón de WooCommerce): vigencia, cupo total de
   usuarios, canjes por usuario, plan y duración del acceso que otorgan.
4. **Canje en la app** escribiendo el código o escaneando un **QR**; el plugin genera
   el código y una imagen QR / tarjeta imprimible.

---

## 2. Auditoría: qué hay y qué falta (features 87-93)

### 2.1 Hecho y verificado leyendo el código

| Pieza | Evidencia |
|---|---|
| Esquema de accesos (planes, features, matriz, solicitudes, auditoría, RLS) | `026_create_access_system.sql` |
| Plan efectivo calculado desde la DB en cada request (no viaja en el JWT) | `access-service.ts → getEffectiveAccess` |
| Vencimiento perezoso + job diario idempotente | `getEffectiveAccess`, `expirePlans`, `POST /internal/access/expire` |
| API de la app: `GET /access`, `GET /access/plans`, `POST /access/requests` (3/día, idempotente, índice único parcial) | `routes/access.ts`, `access-service.ts` |
| API admin completa: usuarios, planes, features, matriz, solicitudes (aprobación atómica con `FOR UPDATE`) | `routes/admin-access.ts`, `access-repository.ts` |
| Gating de psicoeducación (tema bloqueado y bloque con `cuerpoJson` redactado en el servidor) | `psychoeducation-gating.ts` |
| App: tipos, servicio con caché SQLite 5 min, provider, refresco en foreground, purga de descargas | `App/src/context/access-context.tsx`, `services/access-*` |
| App: pantalla de solicitud, tarjeta de estado, `AccessGate`, candados en módulos/herramientas | `access-request-screen.tsx`, `components/access/*` |
| Plugin psicoeducación: selector de feature en tema y bloque (92) | `plugins/vittalmind-psicoeducacion` |

**El botón "solicitar cambio de plan" ya existe** (pantalla `AccessRequest`).

### 2.2 Fallas encontradas (arreglar ANTES de construir encima)

| # | Hallazgo | Impacto |
|---|---|---|
| F1 | **Las claves de feature de la app no coinciden con las de la DB.** App: `cnv_translate`, `timeline`, `gratitude` (tools-screen.tsx), `psicoeducacion_pareja`, `ansiedad` (home-screen.tsx). DB: `tool.cnv_translator`, `tool.timeline`, `tool.gratitude`, `module.parejas`, `module.ansiedad`. `hasFeatureLocally` hace `includes` exacto. | Con el backend real, un usuario **free vería módulos y herramientas con candado**. Verificar en Docker con un usuario free; no vi ningún mapeo intermedio. |
| F2 | **Invitados (sin sesión) = `access` null = todo bloqueado.** El backend ya trata al invitado como plan default en psicoeducación, pero la app no. | Un invitado vería candados donde antes entraba a explorar. |
| F3 | **`requireFeature()` existe y no se usa en ninguna ruta.** `/tools/cnv-translate` (llama a OpenAI), `/gratitude/*`, `/timeline*` solo se bloquean en la UI. | Un plan que *no* incluya una herramienta sigue pudiendo llamar la API, y el traductor **gasta cupo de OpenAI**. Imprescindible antes de planes por población. |
| F4 | **Las categorías no se pueden restringir** (decisión del 92: "las categorías no tienen selector"). Cada tema/bloque admite **una** feature. | Para "temas y categorías exclusivos de una población" no alcanza: faltaría ocultar categorías y que no se vea que existe contenido de otra población. |
| F5 | **La purga de descargas se dispara con *cualquier* cambio de features** (`!arraysEqual`), también cuando el usuario **gana** acceso. | Al canjear un código el usuario perdería sus descargas offline. |
| F6 | **El feature 91 lista tests de perfil, solicitud, gates y render bloqueado, pero `App/__tests__` solo tiene `access-service` y `access-storage`.** | La UI de accesos no tiene pruebas; F1 no se detectó por eso. |
| F7 | Nadie se entera de una solicitud: 93 dice "sin envío automático de correos" y el plugin aún no existe. El usuario tampoco recibe aviso al aprobarse ni antes de vencer. | Solicitudes olvidadas; pérdida de acceso sorpresa. |
| F8 | `plan_cambios.motivo` tiene `CHECK (... 'manual','solicitud','vencimiento','registro')`. | Los canjes necesitan ampliar el CHECK (migración). |
| F9 | Desactivar un plan no lo quita a quien ya lo tiene (`findPlanByCodigo` no filtra `activo`). | Hay que definir si es intencional (ver P6). |
| F10 | Menores: `VMP_VERSION` 1.0.9 vs cabecera del plugin 1.0.8 y ZIP más viejo que el PHP; el 94 cita `026_create_safety_plan.sql` pero la migración real es `027`. | Higiene de release. |

### 2.3 Falta (no existe)

- **Feature 93**: no hay carpeta del plugin de usuarios/solicitudes/planes (sigue `pending`).
- **Todo lo de códigos**: tablas, endpoints, plugin, pantalla en la app, QR, deep link.
- **Cámara en la app**: no hay `expo-camera` ni permiso de cámara en `app.json`.
- Generación de QR/PDF (no hay librería en Backend ni en plugins).
- Rate limiting: no hay `express-rate-limit`; crítico para un endpoint de canje.
- Rutas/endpoints de visibilidad de categorías por plan (F4).

---

## 3. Diseño propuesto

### 3.1 Tipos de usuario = planes (sin cambiar el modelo)

El modelo de 026 ya sirve: un plan es un **conjunto de features**; las features son
de tipo `contenido`, `modulo` o `herramienta`. Un plan "población X" es:
`planes` + filas en `plan_features` + una feature `content.poblacion_x` asignada a los
temas/bloques exclusivos. Se crea desde el plugin (93) sin tocar código.

Dos extensiones necesarias para cumplir el requisito:

1. **Categorías por plan** (F4): columna `acceso_feature_key` en `categorias_psicoeducacion`. **Decisión: el contenido restringido queda visible pero no accesible** (candado), igual que hoy en temas y bloques; no se agrega modo "oculto". Consecuencia: los títulos/descripciones de contenido para una población deben ser **neutros**.
2. **Server-side gating de herramientas** (F3): `requireFeature('tool.*')` en las rutas.

### 3.1.1 Varios planes por usuario (decisión P2)

Hoy `usuarios_auth.plan_codigo` admite **un** plan. Se pasa a un modelo de planes
acumulables:

- Tabla `usuario_planes`: `id_anonimo`, `plan_codigo`, `expira_at` (NULL = sin
  vencimiento), `origen` (`manual` | `solicitud` | `codigo` | `registro`), `codigo_id`
  nullable, `otorgado_at`. `UNIQUE (id_anonimo, plan_codigo)`.
- El plan **default (free) siempre aplica** como base; el resto suma.
- **Features efectivas = unión** de los planes vigentes.
- Reglas al otorgar un plan (por código, solicitud o admin):
  - **Mismo plan** → se **extiende** desde el mayor entre hoy y su vencimiento actual.
  - **Plan distinto** → se **agrega** (no reemplaza).
  - **Features compartidas** → rigen con la vigencia del plan **más reciente**
    (ver pregunta Q1 sobre el caso en que el más reciente vence antes).
- Migración con backfill: cada usuario con plan no default pasa a `usuario_planes`.
  `usuarios_auth.plan_codigo/plan_expira_at` se mantienen un tiempo como "plan principal"
  (el más reciente) para no romper la app instalada.
- `GET /access` conserva `plan`, `expiraAt`, `features` (compatibilidad con versiones
  viejas de la app) y añade `planes: [{codigo, nombre, expiraAt}]` y `featureExpira`.
- `plan_cambios` sigue como auditoría (añadir `plan_codigo` afectado y motivo `codigo`).
- El job de vencimiento borra/archiva filas vencidas de `usuario_planes` en lugar de
  "devolver al default".
- Impacto: reescritura de `getEffectiveAccess`, `setUserPlan`, `approveRequest`,
  `expirePlans`, `listUsers` y de los tests de 88; ajuste del plugin 93 (asignar/quitar
  planes por usuario, no "cambiar el plan").

### 3.1.2 Poblaciones sensibles y anonimato (decisión P5)

El canje por código existe para que una persona de una población sensible obtenga su
plan **sin identificarse ante el administrador**. Se implementa así:

- Los planes de población son **no solicitables** (`es_solicitable = false`): no hay
  correo de contacto ni mensaje asociado.
- Flag `planes.oculta_identidad`. Mientras un usuario tenga un plan con ese flag, el
  panel (listados de usuarios, detalle, exportes) **enmascara nombre y correo** y muestra
  solo un identificador corto del `id_anonimo`.
- `canjes_codigo` guarda solo `id_anonimo`; el panel de códigos muestra **únicamente
  conteos**, nunca quién canjeó.
- Nombres de plan, de código y de etiqueta **neutros** (no describir la condición).
- **Límite honesto**: `usuarios_auth` guarda el correo y el `id_anonimo` en la misma fila,
  así que quien tenga acceso directo a la base de datos podría cruzarlos. Este diseño
  protege frente al panel y a quien administre contenido, no frente a quien administre
  la base. Separar físicamente la identidad sería un cambio de arquitectura aparte.

### 3.2 Códigos canjeables

**Tabla `codigos_acceso`** (migración `032_create_access_codes.sql`, idempotente como 026):

| Campo | Para qué |
|---|---|
| `codigo` UNIQUE, normalizado en mayúsculas | lo que escribe/escanea el usuario |
| `etiqueta`, `notas` | uso interno ("Taller 22 nov", "Piloto colegio X") |
| `plan_codigo` FK | plan que otorga |
| `duracion_dias` NULL | duración del **acceso** otorgado (NULL = usa la del plan; ver `sinVencimiento`) |
| `valido_desde`, `valido_hasta` | vigencia **del código** (distinta de la del acceso) |
| `max_usos` NULL | cupo total de usuarios (NULL = ilimitado) |
| `max_usos_por_usuario` DEFAULT 1 | cuántas veces puede canjearlo cada usuario |
| `usos` | contador (se incrementa dentro de la transacción) |
| `fecha_fin_acceso` NULL | alternativa a `duracion_dias`: el acceso termina en una **fecha fija** para todos (se soportan ambas; si hay las dos, gana la fecha fija) |
| `activo`, `created_by`, timestamps | desactivar sin borrar |

**Tabla `canjes_codigo`**: `codigo_id`, `id_anonimo`, `plan_anterior`, `plan_nuevo`,
`expira_at`, `created_at`. Solo `id_anonimo` (respeta el patrón de anonimato).
**Tabla `intentos_canje`**: `id_anonimo`, `ok`, `created_at` (limitador por cuenta).
Se amplía el CHECK de `plan_cambios.motivo` con `'codigo'` y se agrega `codigo_id` nullable.
RLS habilitado en las tres tablas nuevas (criterio de 022/024/026).

**Formato del código**: `VM-XXXX-XXXX`, alfabeto sin caracteres ambiguos (sin 0/O/1/I/L),
generado con `crypto.randomInt` (~40 bits). Se permite un código personalizado
("BIENVENIDA2026") con advertencia de baja entropía. Normalización al canjear: mayúsculas,
quitar espacios y guiones, aceptar el texto completo de un QR (`vittalmind://canjear?codigo=…`).

**Canje `POST /access/redeem {codigo}`** (auth obligatoria, una sola transacción):

1. Limitador: máx. 5 intentos fallidos / 15 min por cuenta (+ tope por IP en memoria).
2. `SELECT ... FOR UPDATE` del usuario y del código.
3. Validar: existe y `activo`; `valido_desde ≤ ahora ≤ valido_hasta`; `usos < max_usos`;
   canjes previos del usuario `< max_usos_por_usuario`; plan destino activo.
4. Calcular vencimiento (duración en días **o** fecha fija) y aplicar las reglas de §3.1.1:
   mismo plan extiende, plan distinto se agrega.
5. Insertar/actualizar `usuario_planes`, `INSERT canjes_codigo`, `usos = usos + 1`, `INSERT plan_cambios`.
6. Responder el acceso efectivo nuevo (la app lo muestra sin otra llamada).

Mensajes diferenciados solo donde ayudan al usuario: *inválido*, *venció*, *cupo agotado*,
*ya lo canjeaste*. Los fallos de existencia/inactivo comparten mensaje.

**Admin** (`/admin/access/codes`): crear, listar con filtros, editar límites/vigencia,
desactivar, ver conteo de canjes (por defecto **solo conteos**, sin lista de personas),
`GET /admin/access/codes/:id/qr` (PNG en base64). Opcional: **lote** de N códigos de un
solo uso para repartir uno por persona.

### 3.3 QR / PDF

- El **Backend** genera el QR (`qrcode`, MIT) y lo devuelve en base64 en el JSON; así el
  plugin PHP no necesita librerías y funciona con el proxy `admin-ajax` actual.
- Contenido del QR: `https://www.vittaminds.com/canjear#codigo=VM-XXXX-XXXX` (decisión P7).
  El código va en el *fragmento* (`#`) para que no quede en los logs del servidor web.
  La página `/canjear` (en el WordPress de vittaminds.com) muestra el código, un botón
  **Abrir en la app** (`vittalmind://canjear?codigo=…`, esquema ya presente en `app.json`)
  y los enlaces a las tiendas. El escáner de la app acepta la URL completa, el deep link
  o el código "pelado". No se necesitan *universal links* en esta etapa.
- El plugin muestra una **tarjeta imprimible** (código + QR + vigencia + instrucciones) y
  botones *Descargar PNG* e *Imprimir / guardar como PDF* (CSS de impresión). Un PDF real
  generado en servidor (`pdfkit`) queda como mejora opcional.

### 3.4 App

- `RedeemCodeScreen`: campo de texto (siempre disponible) + botón **Escanear QR**
  (`expo-camera`, `CameraView` con `barcodeScannerSettings: { barcodeTypes: ['qr'] }`).
- Entradas: Perfil y la pantalla `AccessRequest` ("¿Tienes un código?").
- Deep link `vittalmind://canjear?codigo=…` (lo abre el botón de la página `/canjear`): si no hay sesión, se guarda el código
  pendiente, se pide login/registro y se canjea al volver.
- Tras canjear: `refresh(force)`, pantalla de éxito con plan y fecha de vencimiento.
- Corregir F5 (no purgar al **ganar** acceso).
- Requiere **nuevo build nativo** (permiso de cámara + `expo-camera`); no entra por OTA.
  Subir `versionCode`/`buildNumber`; añadir `NSCameraUsageDescription` y permiso `CAMERA`.

---

## 4. Plan por fases (una feature a la vez, como exige AGENTS.md)

Los ids nuevos arrancan en **98** (el 96 es el último). Orden de ejecución propuesto:

| Fase | Feature | Contenido | Depende de |
|---|---|---|---|
| 0 | **98 `access_key_alignment`** | Unificar claves app↔DB (constante compartida), invitado = plan default (`GET /access/default` público), no purgar al ganar acceso (F1, F2, F5) y las pruebas de UI que faltan (F6). Smoke test en Docker con usuario free e invitado. | — |
| 1 | **99 `access_server_gating`** | `requireFeature` en `/tools/cnv-translate`, `/gratitude/*`, `/timeline*`; app y `sync-manager` tratan `403 FEATURE_REQUIRED` sin reintentar en bucle ni perder datos locales (F3). | 98 |
| 2 | **100 `access_multi_plan`** | `usuario_planes`, backfill, unión de features, reglas de extensión y de vigencia compartida (§3.1.1), `GET /access` retrocompatible con `planes`, ajuste de la app (perfil muestra varios planes), tests de 88 migrados. | 99 |
| 3 | **93 `wp_access_admin_plugin`** (existente, **actualizar criterios**) | Plugin de usuarios, solicitudes, planes y matriz sobre el modelo multi-plan (agregar/quitar plan por usuario), enmascarado de identidad (§3.1.2), planes de población. | 100 |
| 4 | **101 `access_category_lock`** | Acceso por categoría visible con candado y selector en el plugin de psicoeducación (F4). | 93 |
| 5 | **102 `access_codes_backend`** | Migración 032 (códigos, canjes, intentos, `plan_cambios`), `POST /access/redeem`, endpoints admin, QR base64, limitador (F8). Test de concurrencia (dos canjes simultáneos con `max_usos=1`). | 100 |
| 6 | **103 `access_codes_plugin`** | Página "Códigos": crear/editar/desactivar, tarjeta imprimible con QR, conteo de canjes, versión del plugin + ZIP. Página `/canjear` en vittaminds.com. | 93, 102 |
| 7 | **104 `access_codes_app`** | Pantalla de canje, escáner QR, deep link, código pendiente tras login, build nativo (`expo-camera`, permisos, `versionCode`). | 102 |
| 8 | **105 `access_notifications`** (al final, por decisión) | Correo al admin por solicitud nueva (`wp_mail` con la cuenta de correo de Hostinger, requiere SMTP configurado), push al usuario al aprobarse y 7 días antes de vencer. | 93 |

Nota de proceso: AGENTS.md manda tomar el `pending` de menor id y hoy están pendientes
93, 95 y 96. **Decisión: 98 y 99 (y el resto de este plan) van antes de 95/96.** Hay que
reflejarlo en `feature_list.json` (nuevas entradas 98-105, y actualizar 93) y en
`progress/current.md` al arrancar. El feature 93 queda bloqueado hasta que exista 100.

**Criterio de "hecho" por feature** (sin cambios respecto al harness): `init` verde,
`quality-check` PASS, `security-auditor` y `sonar-verifier` sin bloqueantes, y
`quality-release` antes de `main`.

### Despliegue (orden seguro)

1. **Backend** (migraciones 029 a 032 aditivas, no rompe a la app actual) → 2. **Plugin** (nueva
   versión + ZIP) → 3. **App** (build nativo y revisión de tiendas).
2. **Aviso crítico**: `Backend/.env` apunta a la base de **producción** (docs/entornos-dev-produccion.md §3.2).
   Probar las migraciones 029 a 032 contra Postgres local/Docker; no correr `npm run migrate`
   con el `.env` actual hasta tener una base de desarrollo.
3. Pendientes operativos heredados: cron real del tick/expiración, `INTERNAL_NOTIFICATION_TOKEN`
   y `JWT_SECRET` en Hostinger (el default inseguro sigue en `config.ts`).

---

## 5. Riesgos operativos que pueden afectar al cliente final

| Riesgo | Mitigación |
|---|---|
| Free ve todo bloqueado (F1) | Fase 0 + pruebas de UI + smoke test |
| Cuota de OpenAI consumida por quien no tiene el plan (F3) | Fase 1 |
| Canje doble por concurrencia (cupo superado) | `FOR UPDATE` + test de concurrencia |
| Fuerza bruta de códigos | Alfabeto/longitud, limitador por cuenta e IP, bloqueo temporal |
| Código impreso que se difunde fuera del grupo | `max_usos`, `valido_hasta`, desactivación inmediata, lotes de un solo uso |
| Canje de un plan que comparte features con otro y **recorta** la vigencia | Regla de §3.1.1 + pregunta Q1; mostrar en la app el vencimiento resultante antes de confirmar |
| Pérdida de acceso sin aviso al vencer + purga de descargas | Fase 7; texto claro en la app |
| Cola offline (timeline/gratitud) rechazada con 403 tras perder el plan | Fase 1: no reintentar y conservar el dato local |
| QR escaneado sin la app instalada o con cámara nativa | Página `/canjear` en vittaminds.com con botón a la app y tiendas; el código impreso al lado del QR |
| Pertenencia a una población = dato sensible (plan "víctimas de X") + email visible en el panel | Nombres neutros de plan/código, conteos sin identidades, ver P5 |
| Hora del vencimiento del código (UTC vs Bogotá) | Guardar `TIMESTAMPTZ`, mostrar y capturar en `America/Bogota`, vence a las 23:59 |
| Rechazo en tiendas por permiso de cámara | Texto de uso claro; el escáner es opcional (siempre hay entrada manual) |

---

## 6. Decisiones (28-oct-2026) y pregunta abierta

| # | Decisión |
|---|---|
| P1 | Mismo plan → se extiende. Plan distinto → se **agrega**. Features compartidas → vigencia del plan más reciente. |
| P2 | **Una persona puede tener más de un plan** (modelo `usuario_planes`, §3.1.1). |
| P3 | Contenido restringido **visible pero no accesible** (candado); sin modo oculto. Títulos neutros. |
| P4 | Si se desactiva un código o un plan, quienes ya lo tienen **lo conservan** hasta su vencimiento. |
| P5 | El canje por código es la vía anónima para poblaciones sensibles: planes no solicitables, identidad enmascarada en el panel, solo conteos (§3.1.2). |
| P6 | El código soporta **duración en días y fecha fija**. |
| P7 | El QR apunta a `https://www.vittaminds.com/canjear#codigo=…`, que deriva a la app/tiendas. |
| P8 | Correo al admin y avisos al usuario: **al final** (feature 105). |
| P9 | 98 y 99 **antes** de 95/96. |
| P10 | Sin lotes de un solo uso por ahora (el esquema no lo impide a futuro). |

**Q1 (resuelta, 28-oct).** Features compartidas entre planes: se conserva siempre la fecha más lejana; recibir o canjear un plan nunca quita acceso que ya se tenía.

**Nota de numeración.** El id 97 ya estaba ocupado por `panic_trusted_contacts` (contactos de confianza en el modal de pánico), por eso esta serie usa los ids 98-105. El 93 queda `blocked` hasta terminar el 100 (multi-plan).
