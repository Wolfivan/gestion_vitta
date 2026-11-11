# Caja de mensajes: plan de implementación

> **Para agentes:** sub-skill obligatoria: `superpowers:subagent-driven-development` (recomendada) o
> `superpowers:executing-plans`. Los pasos usan casillas (`- [ ]`) para el seguimiento.
> **En este repo no se hace commit nunca** (`CLAUDE.md`): donde la skill diría "commit", aquí se
> actualiza `progress/current.md`.

**Objetivo:** una herramienta "Caja de mensajes" que guarda mensajes de ánimo (propios, escritos por
otra persona en el mismo celular, o enviados por QR desde otra app) y muestra uno al azar, sin
repetir, con una animación.

**Arquitectura:**
- El Backend guarda los mensajes cifrados (AES-256-GCM) por `id_anonimo` y recibe los mensajes por QR
  como pendientes de aprobación.
- La App mantiene la bolsa en SQLite, elige el mensaje con una función pura y sincroniza con
  `pending_ops`, el mismo patrón que gratitud.
- La animación se aprueba primero como prototipo HTML y luego se implementa con Reanimated.

**Stack:** Node + Express + PostgreSQL + Jest/supertest (Backend). Expo 58 + React Native 0.88 +
TypeScript + expo-sqlite + `react-native-reanimated` 4.7.1 + `react-native-svg` 15.16 + expo-camera
(App). `qrcode` 1.5.4, que ya está en el Backend.

**Spec:** `docs/superpowers/specs/2026-11-10-caja-de-mensajes-design.md`. Quien ejecute lee la spec y
este plan.

## Restricciones globales

- Features **113** (`caja_backend`), **114** (`caja_app`) y **115** (`caja_qr`), en ese orden, **después
  de la 112**. Una feature a la vez. Cada una se cierra con `.\init.ps1` en verde.
- Feature de acceso: `tool.caja`, en los planes `free` (Esencial) y `vip`.
- Texto: de 1 a **500** caracteres. Nombre del autor: de 1 a **40**. Ambos con `trim` y contados en
  *code points* (`[...s].length`), no en unidades UTF-16.
- `CAJA_COOLDOWN_DAYS`, entero ≥ 0, por defecto **7**.
- `CAJA_ENCRYPTION_KEY` y `CAJA_ENCRYPTION_KEY_PREVIOUS`: 32 bytes (base64 o hex). Fail-closed.
- Anti-abuso del QR: **20** pendientes por caja como máximo, **10/h** por cuenta que escribe y
  **30/h** por IP.
- Ejemplos: se usan mientras haya **menos de 3** mensajes aceptados y cada uno sale **una sola vez**.
  Se firman "— VittalMind".
- Deep link del QR: `vittalmind://caja/escribir/<token>`. Token de 32 bytes aleatorios en base64url;
  en la base de datos solo se guarda su SHA-256.
- Nunca se loggea el texto ni el nombre, ni en claro ni cifrados. La cuenta de quien escribe por QR
  no se guarda junto al mensaje.
- Colores de `COLORS` (`App/src/constants`); el test `palette-guard` lo verifica. Disclaimer legal en
  la pantalla de la caja.
- Copys fijos de la spec: *"¿Quieres leerlo antes de guardarlo o lo guardas como sorpresa?"*, *"Tu
  mensaje le llegará cuando lo acepte"*, *"Su caja está llena de mensajes por revisar, inténtalo más
  tarde"*, *"Necesitas conexión para enviar el mensaje"*.

## Foco de revisión

Fallos que la spec implica y que ningún test de las tareas cubriría por sí solo. Cada uno tiene su
test en la tarea indicada.

1. **Cerrar sesión en un celular compartido.** Hoy `logout` en `use-auth.ts` solo borra la caché del
   plan de seguridad. Si no se hace nada, los mensajes de una usuaria quedarían visibles para la
   siguiente cuenta que entre en ese celular. Hay que vaciar las tablas `caja_*` y las ops `caja` al
   cerrar sesión → Tarea 10.
2. **Crear y borrar sin conexión.** Si se escribe un mensaje offline y se borra antes de sincronizar,
   no debe llegar al servidor ni quedar una op huérfana. Se usa `cancelPendingCreate` → Tarea 10.
3. **Borrar por autor con variantes del nombre.** "Ana", "ana " y "ANA" son la misma persona para la
   usuaria: la comparación se hace con `trim` y sin distinguir mayúsculas (`toLocaleLowerCase('es')`),
   igual en la App y en el Backend → Tareas 5 y 10.
4. **Reloj del teléfono mal puesto.** Un `ultimo_mostrado_at` en el futuro no puede dejar un mensaje
   bloqueado para siempre: se trata como `ahora` → Tarea 9.
5. **Emojis en el límite de longitud.** Un mensaje de 500 emojis es válido; el de 501, no. Se cuenta
   igual en la App y en el Backend → Tareas 5 y 12.

---

# Feature 113: `caja_backend`

## Mapa de archivos (Backend)

| Archivo | Responsabilidad |
|---------|-----------------|
| `src/database/migrations/037_caja_mensajes.sql` | Tablas, RLS, siembra de ejemplos y de `tool.caja` |
| `src/utils/field-encryption.ts` | Gana un parámetro opcional `keyEnv` |
| `src/utils/rate-limiter.ts` (nuevo) | `createRateLimiter({ max, windowMs })` |
| `src/utils/redeem-limiter.ts` | Pasa a usar `createRateLimiter` sin cambiar su API |
| `src/utils/caja-input.ts` (nuevo) | Validación y normalización de texto y nombre |
| `src/models/caja.ts` (nuevo) | Interfaces `ICajaMensaje`, `ICajaPendiente`, `ICajaEjemplo`, `ICajaConfig` |
| `src/services/caja-repository.ts` (nuevo) | SQL; trabaja solo con valores ya cifrados |
| `src/services/caja-service.ts` (nuevo) | Reglas, cifrado, límites e invitación |
| `src/controllers/caja-controller.ts` (nuevo) | HTTP ↔ servicio |
| `src/routes/caja.ts` (nuevo) y `src/routes/admin-caja.ts` (nuevo) | Rutas y swagger |
| `src/constants/access-features.ts` | `TOOL_CAJA: 'tool.caja'` |
| `tests/caja-*.test.ts` | Tests por capa |

### Tarea 1: migración 037

**Archivos:**
- Crear: `Backend/src/database/migrations/037_caja_mensajes.sql`
- Modificar: `Backend/tests/database-migration.test.ts` (nuevo `describe('037_caja_mensajes.sql')`)

**Interfaces producidas:**
- `caja_mensajes`: `id SERIAL PK`, `id_anonimo UUID FK ON DELETE CASCADE`, `client_uuid UUID NOT NULL`,
  `texto_cifrado TEXT NOT NULL`, `autor_nombre_cifrado TEXT NULL`,
  `origen TEXT CHECK IN ('propio','mismo_celular','qr')`,
  `estado TEXT CHECK IN ('pendiente','aceptado')`, `sorpresa BOOLEAN DEFAULT false`,
  `ultimo_mostrado_at TIMESTAMPTZ NULL`, `created_at`, `updated_at`.
  `UNIQUE (id_anonimo, client_uuid)` e índice `(id_anonimo, estado)`.
- `caja_invitaciones`: `id_anonimo UUID PK FK CASCADE`, `token_hash TEXT UNIQUE NOT NULL`, `created_at`.
- `caja_ejemplos`: `id SERIAL PK`, `texto TEXT NOT NULL`, `activo BOOLEAN DEFAULT true`,
  `orden INT DEFAULT 0`, `created_at`, `updated_at`.
- `caja_ejemplos_vistos`: `(id_anonimo, ejemplo_id) PK`, ambas FK con CASCADE.
- `ENABLE ROW LEVEL SECURITY` en las cuatro tablas (patrón de la 032).
- Siembra:
  - `acceso_features ('tool.caja','Caja de mensajes','Mensajes de animo al azar.','herramienta',70)`;
  - `plan_features ('free','tool.caja')` y `('vip','tool.caja')`;
  - 10 ejemplos en `caja_ejemplos`, sembrados solo si la tabla está vacía.

  Todo con `ON CONFLICT DO NOTHING` y `IF NOT EXISTS`, para que sea idempotente.

- [ ] **Paso 1: tests que fallan** en `database-migration.test.ts`:
  - `'crea las cuatro tablas de la caja con FK en cascada a id_anonimo'`: el SQL contiene las cuatro
    sentencias `CREATE TABLE IF NOT EXISTS` y `ON DELETE CASCADE`.
  - `'restringe origen y estado'`: tiene los `CHECK` con los valores exactos de arriba.
  - `'habilita RLS en las tablas de la caja'`.
  - `'siembra tool.caja en free y vip sin duplicar'`: `ON CONFLICT` en los dos `INSERT`.
  - `'siembra los ejemplos solo si la tabla esta vacia'`: contiene `WHERE NOT EXISTS (SELECT 1 FROM caja_ejemplos)`.
- [ ] **Paso 2:** `npx jest tests/database-migration.test.ts` → FAIL (no existe el archivo).
- [ ] **Paso 3:** escribir la migración. Los textos de ejemplo son cálidos y en segunda persona, sin
  afirmaciones clínicas, y van marcados en un comentario como "provisionales, a validar por el
  psicólogo".
- [ ] **Paso 4:** el mismo comando → PASS. Aplicarla **dos veces** en `backend-db-1` sin error y
  comprobar `SELECT count(*) FROM caja_ejemplos` = 10 después de la segunda.
- [ ] **Paso 5:** anotar en `progress/current.md`.

### Tarea 2: cifrado con clave por dominio y limitador genérico

**Archivos:**
- Modificar: `Backend/src/utils/field-encryption.ts`, `Backend/src/utils/redeem-limiter.ts`
- Crear: `Backend/src/utils/rate-limiter.ts`
- Tests: `Backend/tests/field-encryption-key-env.test.ts`, `Backend/tests/rate-limiter.test.ts`

**Interfaces producidas:**
- `encryptField(plain: string, keyEnv?: string): string` y
  `decryptField(stored: string, keyEnv?: string): string`. Si no se pasa, `keyEnv` es
  `'SAFETY_PLAN_ENCRYPTION_KEY'`. La clave anterior es siempre `` `${keyEnv}_PREVIOUS` ``.
- `export const CAJA_KEY_ENV = 'CAJA_ENCRYPTION_KEY'` en `field-encryption.ts`.
- `createRateLimiter({ max: number; windowMs: number; maxKeys?: number })`, que devuelve
  `{ isLimited(key, now?), countAttempt(key, now?), reserveAttempt(key, now?), releaseAttempt(key), reset() }`.
- `redeem-limiter.ts` conserva sus exports actuales, ahora delegando en una instancia con
  `max: REDEEM_MAX_FAILURES` y `windowMs: REDEEM_WINDOW_MS`.

- [ ] **Paso 1: tests que fallan.**
  - `'cifra con CAJA_ENCRYPTION_KEY y no descifra con la clave del plan de seguridad'`: un valor
    cifrado con `CAJA_KEY_ENV` lanza `FIELD_ENCRYPTION_ERROR` al descifrarlo sin `keyEnv`.
  - `'descifra con CAJA_ENCRYPTION_KEY_PREVIOUS tras rotar'`.
  - `'sin CAJA_ENCRYPTION_KEY falla cerrado'`.
  - `'limita al llegar a max dentro de la ventana y libera al salir de ella'`.
  - `'instancias distintas no comparten contadores'`.
- [ ] **Paso 2:** `npx jest tests/field-encryption-key-env.test.ts tests/rate-limiter.test.ts` → FAIL.
- [ ] **Paso 3:** implementar. `redeem-limiter.ts` mueve su lógica a `rate-limiter.ts` sin cambiar el
  comportamiento.
- [ ] **Paso 4:** los dos tests más `safety-plan-encryption.test.ts`, `access-codes.test.ts` y
  `access-code-utils.test.ts` → PASS sin tocarlos.
- [ ] **Paso 5:** añadir `CAJA_ENCRYPTION_KEY=`, `CAJA_ENCRYPTION_KEY_PREVIOUS=` y `CAJA_COOLDOWN_DAYS=7`
  a `Backend/.env.example`, y un párrafo a `docs/entornos-dev-produccion.md` y
  `docs/security-guidelines.md`, como el de `SAFETY_PLAN_ENCRYPTION_KEY`. Anotar el progreso.

### Tarea 3: validación de entrada y modelo

**Archivos:** crear `Backend/src/utils/caja-input.ts` y `Backend/src/models/caja.ts`; test
`Backend/tests/caja-input.test.ts`.

**Interfaces producidas:**
- `normalizeCajaTexto(raw: unknown): string`: `trim`, entre 1 y 500 *code points*; si no, lanza
  `AppError(400,'CAJA_TEXTO_INVALIDO')`.
- `normalizeCajaNombre(raw: unknown): string`: `trim`, entre 1 y 40; si no, lanza
  `AppError(400,'CAJA_NOMBRE_INVALIDO')`.
- `sameAutor(a: string, b: string): boolean`: compara con `trim` y `toLocaleLowerCase('es')`.
- `parseCooldownDays(raw: string | undefined): number`: entero ≥ 0; si es inválido o no está, `7`.
- `models/caja.ts`:
  - `type TCajaOrigen = 'propio'|'mismo_celular'|'qr'`;
  - `ICajaMensaje { clientUuid: string; texto: string; autorNombre: string | null; origen: TCajaOrigen; sorpresa: boolean; ultimoMostradoAt: string | null; createdAt: string }`;
  - `ICajaPendiente { id: number; texto: string; autorNombre: string; createdAt: string }`;
  - `ICajaEjemplo { id: number; texto: string }`;
  - `ICajaConfig { cooldownDias: number }`.

- [ ] **Paso 1: tests que fallan.**
  - `'acepta 500 emojis y rechaza 501'` (Foco 5).
  - `'rechaza texto solo de espacios'`.
  - `'rechaza nombre de 41 caracteres'`.
  - `'sameAutor trata "Ana", " ana " y "ANA" como iguales'` (Foco 3).
  - `'parseCooldownDays: "3"→3, "0"→0, "-1"→7, "x"→7, undefined→7'`.
- [ ] **Paso 2:** `npx jest tests/caja-input.test.ts` → FAIL.
- [ ] **Paso 3:** implementar.
- [ ] **Paso 4:** el mismo comando → PASS. Anotar el progreso.

### Tarea 4: repositorio

**Archivos:** crear `Backend/src/services/caja-repository.ts`; test
`Backend/tests/caja-repository.test.ts`, que mockea `pool` como hace `psychoeducation-repository.test.ts`.

**Interfaces producidas** (las filas tienen las columnas de la Tarea 1 en `snake_case`; todo valor de
texto llega **ya cifrado**):
- `findAceptados(idAnonimo): Promise<CajaRow[]>`
- `insertMensaje(idAnonimo, row: { clientUuid; textoCifrado; autorCifrado: string | null; origen; estado; sorpresa }): Promise<CajaRow>`:
  hace `ON CONFLICT (id_anonimo, client_uuid) DO NOTHING` y devuelve la fila existente.
- `deleteMensaje(idAnonimo, clientUuid): Promise<boolean>`
- `deleteMensajesByIds(idAnonimo, ids: number[]): Promise<number>`
- `markMostrado(idAnonimo, clientUuid, at: Date): Promise<boolean>`: pone `sorpresa = false`, y es
  `false` si no existe.
- `findPendientes(idAnonimo)`, `countPendientes(idAnonimo): Promise<number>`
- `acceptPendiente(idAnonimo, id): Promise<CajaRow | null>`: pasa de `pendiente` a `aceptado` y asigna
  `client_uuid = gen_random_uuid()` si hace falta.
- `deletePendiente(idAnonimo, id): Promise<boolean>`
- `upsertInvitacion(idAnonimo, tokenHash): Promise<void>` y `findOwnerByTokenHash(tokenHash): Promise<string | null>`
- `findEjemplosNoVistos(idAnonimo): Promise<ICajaEjemplo[]>`, `markEjemploVisto(idAnonimo, ejemploId): Promise<void>`
- Admin: `listEjemplos()`, `createEjemplo({texto, activo, orden})`, `updateEjemplo(id, …)`, `deleteEjemplo(id)`.

Todas las consultas de la dueña llevan `WHERE id_anonimo = $1`.

- [ ] **Paso 1: tests que fallan.** Uno por función, verificando el SQL y los parámetros. En especial:
  - `'insertMensaje es idempotente por client_uuid'`;
  - `'acceptPendiente solo toca filas pendientes de esa usuaria'`;
  - `'toda consulta de la duena filtra por id_anonimo'`.
- [ ] **Paso 2:** `npx jest tests/caja-repository.test.ts` → FAIL.
- [ ] **Paso 3:** implementar. Probar a mano el SQL de `acceptPendiente` en Docker con `ROLLBACK`.
- [ ] **Paso 4:** → PASS. Anotar el progreso.

### Tarea 5: servicio de la dueña (mensajes, ejemplos, config)

**Archivos:** crear `Backend/src/services/caja-service.ts`; test `Backend/tests/caja-service.test.ts`,
que mockea el repositorio y fija `CAJA_ENCRYPTION_KEY` en `beforeAll`.

**Interfaces producidas:**
- `getConfig(): ICajaConfig`, que lee `parseCooldownDays(process.env.CAJA_COOLDOWN_DAYS)`.
- `listMensajes(idAnonimo): Promise<ICajaMensaje[]>`, descifrados.
- `createMensaje(idAnonimo, input: { clientUuid: string; texto: unknown; autorNombre?: unknown; origen: 'propio'|'mismo_celular'; sorpresa?: boolean }): Promise<ICajaMensaje>`.
  `mismo_celular` exige `autorNombre`; `propio` lo ignora y fuerza `sorpresa = false`.
- `deleteMensaje(idAnonimo, clientUuid): Promise<void>`: si no existe, lanza `404 CAJA_MENSAJE_NO_ENCONTRADO`.
- `deleteByAutor(idAnonimo, autorNombre: unknown): Promise<{ borrados: number }>`. Descifra los
  aceptados, filtra con `sameAutor` y llama a `deleteMensajesByIds`.
- `markMostrado(idAnonimo, clientUuid): Promise<void>`: si no existe, 404. Así el cliente descarta la
  op, porque gana el borrado (spec §5.5).
- `listEjemplos(idAnonimo)`, `markEjemploVisto(idAnonimo, ejemploId)`.

- [ ] **Paso 1: tests que fallan.**
  - `'guarda texto y nombre cifrados con CAJA_ENCRYPTION_KEY'`: los argumentos de `insertMensaje`
    empiezan por `enc:v1:` y no contienen el texto en claro.
  - `'listMensajes devuelve el texto descifrado'`.
  - `'mismo_celular sin nombre responde 400 CAJA_NOMBRE_INVALIDO'`.
  - `'propio ignora autorNombre y sorpresa'`.
  - `'deleteByAutor borra "Ana", " ana " y "ANA" y devuelve 3'` (Foco 3).
  - `'markMostrado de un mensaje borrado responde 404'`.
  - `'sin CAJA_ENCRYPTION_KEY responde 500 sin filtrar el texto'`: el `message` del error no contiene el texto.
  - `'getConfig usa 7 si CAJA_COOLDOWN_DAYS no esta'`.
- [ ] **Paso 2:** `npx jest tests/caja-service.test.ts` → FAIL.
- [ ] **Paso 3:** implementar con `encryptField(x, CAJA_KEY_ENV)` y `decryptField(x, CAJA_KEY_ENV)`.
- [ ] **Paso 4:** → PASS. Anotar el progreso.

### Tarea 6: servicio de invitación, escritura por QR y pendientes

**Archivos:** modificar `Backend/src/services/caja-service.ts`; test
`Backend/tests/caja-invitacion.test.ts`.

**Interfaces producidas:**
- `createInvitacion(idAnonimo): Promise<{ token: string; url: string; png: string }>`.
  - El token sale de `randomBytes(32).toString('base64url')` y la URL es
    `` `vittalmind://caja/escribir/${token}` ``.
  - `png` es el QR en base64 sin el prefijo `data:`, generado con `qrcode` como en
    `access-code-service.ts`.
  - Se guarda `sha256(token)` en hex. Regenerar reemplaza el hash anterior.
- `escribir(writerId: string, ip: string, token: string, input: { texto: unknown; autorNombre: unknown }): Promise<void>`.
  Pasos, en orden:
  1. límite por IP (`30/h`) y por `writerId` (`10/h`), con dos instancias de `createRateLimiter`; si se pasa, `429 CAJA_RATE_LIMITED`;
  2. busca la dueña por hash; si no existe, cuenta el intento contra la IP y responde `404 CAJA_TOKEN_INVALIDO`;
  3. si `owner === writerId`, `400 CAJA_AUTOESCRITURA`;
  4. si `countPendientes ≥ 20`, `429 CAJA_PENDIENTES_LLENOS`;
  5. inserta `origen 'qr'`, `estado 'pendiente'` y un `client_uuid` nuevo. **`writerId` no se guarda.**
- `listPendientes(idAnonimo): Promise<ICajaPendiente[]>`.
- `acceptPendiente(idAnonimo, id): Promise<ICajaMensaje>` y `rejectPendiente(idAnonimo, id): Promise<void>`.
  Si no existe, `404`.
- `resetCajaLimiters()` para los tests.

- [ ] **Paso 1: tests que fallan.**
  - `'la invitacion guarda solo el hash del token'`.
  - `'regenerar invalida el token anterior'`.
  - `'escribir con token valido crea un pendiente sin guardar la cuenta de quien escribe'`: ningún
    argumento del `insertMensaje` contiene `writerId`.
  - `'token invalido responde 404 y cuenta contra la IP'`.
  - `'escribir en tu propia caja responde 400'`.
  - `'el pendiente 21 responde 429 CAJA_PENDIENTES_LLENOS'`.
  - `'el mensaje 11 en una hora de la misma cuenta responde 429'`.
  - `'aceptar devuelve el mensaje con client_uuid'`.
  - `'rechazar lo borra'`.
- [ ] **Paso 2:** `npx jest tests/caja-invitacion.test.ts` → FAIL.
- [ ] **Paso 3:** implementar.
- [ ] **Paso 4:** → PASS. Anotar el progreso.

### Tarea 7: controlador, rutas, admin y cierre de la 113

**Archivos:**
- Crear: `Backend/src/controllers/caja-controller.ts`, `Backend/src/routes/caja.ts`,
  `Backend/src/routes/admin-caja.ts`
- Modificar: `Backend/src/routes/index.ts`, `Backend/src/app.ts` (montaje), `Backend/src/constants/access-features.ts`,
  `PRIVACY_POLICY.md`
- Test: `Backend/tests/caja.test.ts` (supertest, con `access-mock` como `gratitude.test.ts`)

**Rutas** (todas con `authMiddleware`; las de la dueña además con `requireFeature(ACCESS_FEATURES.TOOL_CAJA)`):
- `GET /caja/config`
- `GET /caja/mensajes`, `POST /caja/mensajes`, `DELETE /caja/mensajes/:clientUuid`
- `POST /caja/mensajes/borrar-autor` (cuerpo `{ autorNombre }`, respuesta `{ borrados }`)
- `POST /caja/mensajes/:clientUuid/mostrado`
- `GET /caja/pendientes`, `POST /caja/pendientes/:id/aceptar`, `POST /caja/pendientes/:id/rechazar`
- `POST /caja/invitacion`
- `GET /caja/ejemplos`, `POST /caja/ejemplos/:id/visto`
- `POST /caja/escribir/:token`: **solo** `authMiddleware`. La IP se toma de `req.ip`, igual que en el canje.
- Admin (`adminMiddleware`): `GET/POST /admin/caja/ejemplos`, `PUT/DELETE /admin/caja/ejemplos/:id`

Cada ruta lleva su bloque swagger, como en `routes/home.ts`.

- [ ] **Paso 1: tests que fallan.**
  - `'GET /caja/mensajes sin tool.caja responde 403 FEATURE_REQUIRED'`.
  - `'POST /caja/escribir/:token funciona sin tool.caja'`.
  - `'POST /caja/mensajes devuelve 201 y el mensaje'`.
  - `'DELETE devuelve 204'`.
  - `'borrar-autor devuelve { borrados }'`.
  - `'admin de ejemplos responde 403 sin rol admin'`.
  - `'sin token de sesion responde 401'`.
- [ ] **Paso 2:** `npx jest tests/caja.test.ts` → FAIL.
- [ ] **Paso 3:** implementar. Añadir `TOOL_CAJA` en `access-features.ts`. Añadir un párrafo sobre la
  caja en `PRIVACY_POLICY.md`: qué se guarda, que va cifrado, que se puede borrar y que la cuenta de
  quien escribe no se guarda.
- [ ] **Paso 4:** `npx jest` completo → PASS.
- [ ] **Paso 5:** smoke en Docker con la API reconstruida:
  - crear un mensaje, listar, borrar por autor;
  - crear la invitación, escribir con una segunda cuenta, aceptar;
  - `SELECT texto_cifrado FROM caja_mensajes` muestra `enc:v1:…`.
- [ ] **Paso 6:** `.\init.ps1` en verde → feature 113 `done`, con el resumen en `progress/history.md`.

---

# Feature 114: `caja_app`

## Mapa de archivos (App)

| Archivo | Responsabilidad |
|---------|-----------------|
| `docs/prototipos/caja-animacion.html` | Prototipo de la animación (HTML, SVG y CSS/JS, sin dependencias) |
| `App/src/utils/caja-bag.ts` | `elegirMensaje`, función pura |
| `App/src/utils/caja-input.ts` | Validación (mismas reglas que el Backend) y `sameAutor` |
| `App/src/services/caja-service.ts` | SQLite, ops, rehidratación desde el servidor, ejemplos y config |
| `App/src/services/db.ts` | Tablas `caja_mensajes` y `caja_ejemplos` |
| `App/src/services/sync-manager.ts` | Entidad `caja` en `ENTITY_FEATURE` y en `pushPendingOp` |
| `App/src/hooks/use-caja.ts` | Estado de la pantalla |
| `App/src/components/caja/caja-animation.tsx` | Animación (Reanimated + SVG) |
| `App/src/components/caja/caja-message-card.tsx` | Tarjeta con Cerrar, Abrir otro y Borrar |
| `App/src/screens/caja-screen.tsx` | Pantalla principal |
| `App/src/screens/caja-write-screen.tsx` | Formulario (yo / alguien más) y diálogo leer o sorpresa |
| `App/src/screens/caja-messages-screen.tsx` | "Mis mensajes", agrupados por autor |
| `App/src/constants/access-keys.ts`, `tool-catalog.ts`, `navigation/app-navigator.tsx` | Registro de la herramienta y de las rutas |

### Tarea 8: prototipo de la animación (puerta de aprobación)

**Archivos:** crear `docs/prototipos/caja-animacion.html`.

- [ ] **Paso 1:** un HTML autocontenido con el SVG de la caja (cuerpo, tapa con su punto de giro y
  lazo), partículas y la tarjeta. Tiene un botón para repetir, un interruptor de "reducir movimiento" y
  sliders de duración por fase. Las fases y tiempos iniciales salen de la spec §6:
  balanceo 400 ms, tapa 350 ms, partículas 300 ms, tarjeta 550 ms. Los colores, copiados de
  `App/src/constants` como variables CSS.
- [ ] **Paso 2:** abrirlo en el navegador y comprobar las dos variantes.
- [ ] **Paso 3:** **parar y pedir la aprobación de la usuaria.** Anotar en `progress/current.md` los
  tiempos y curvas aprobados. Sin esa aprobación no se empieza la Tarea 11.

### Tarea 9: algoritmo de la bolsa

**Archivos:** crear `App/src/utils/caja-bag.ts` y `App/src/utils/caja-input.ts`; tests
`App/__tests__/caja-bag.test.ts` y `App/__tests__/caja-input.test.ts`.

**Interfaces producidas:**
```ts
export interface IBagItem { id: string; enBolsa: boolean; ultimoMostradoAt: number | null; esEjemplo: boolean }
export interface IBagState { items: IBagItem[]; ultimoId: string | null }
export function elegirMensaje(
  state: IBagState, ahora: number, cooldownDias: number, random: () => number,
): { elegido: IBagItem | null; state: IBagState };
```
- `caja-input.ts` exporta `normalizeCajaTexto`, `normalizeCajaNombre` y `sameAutor`, con las mismas
  reglas que la Tarea 3. Aquí devuelven `{ ok: true, value } | { ok: false, error: string }` en vez
  de lanzar.

**Algoritmo** (spec §5.2 y §5.3; es lo único que la firma no determina):
1. Se normaliza: todo `ultimoMostradoAt > ahora` se trata como `ahora` (Foco 4).
2. Candidatos = `items.filter(i => i.enBolsa)`.
3. Si no hay candidatos, se rellena: pasan a `enBolsa = true` los que tienen `ultimoMostradoAt` nulo o
   `≤ ahora − cooldownDias·86 400 000`. Si después de rellenar hay más de un candidato, se excluye
   `ultimoId`.
4. Si sigue sin haber candidatos y hay ítems, el elegido es el de `ultimoMostradoAt` más antiguo,
   distinto de `ultimoId` si hay más de uno (§5.3).
5. Se elige `candidatos[Math.floor(random() * candidatos.length)]`. El elegido queda con
   `enBolsa = false`, `ultimoMostradoAt = ahora` y `ultimoId = elegido.id`.

La función no muta la entrada. Los ids de los ejemplos en la bolsa son `` `ejemplo:${id}` ``, para que
no choquen con los `client_uuid`. Al elegir un mensaje con `sorpresa`, `abrirCaja` (Tarea 10) lo pasa a
`sorpresa = 0` en local.

- [ ] **Paso 1: tests que fallan.**
  - `'con N mensajes salen los N antes de repetir alguno'`: 50 corridas con semillas distintas.
  - `'al rellenar no sale el mismo dos veces seguidas'`.
  - `'respeta el enfriamiento al rellenar'`.
  - `'si todos estan en enfriamiento sale el mas antiguo distinto del ultimo'`.
  - `'un solo mensaje sale siempre'`.
  - `'sin items devuelve null'`.
  - `'un ultimoMostradoAt en el futuro no bloquea el mensaje'` (Foco 4).
  - `'no muta el estado de entrada'`.
  - En `caja-input.test.ts`: `'acepta 500 emojis y rechaza 501'` (Foco 5) y la tabla de `sameAutor`
    (Foco 3).
- [ ] **Paso 2:** `npx jest __tests__/caja-bag.test.ts __tests__/caja-input.test.ts` → FAIL.
- [ ] **Paso 3:** implementar.
- [ ] **Paso 4:** → PASS. Anotar el progreso.

### Tarea 10: servicio local y sincronización

**Archivos:**
- Crear: `App/src/services/caja-service.ts`
- Modificar: `App/src/services/db.ts`, `App/src/services/sync-manager.ts`, `App/src/hooks/use-auth.ts`
  (`logout`), `App/src/constants/access-keys.ts` (`TOOL_CAJA: 'tool.caja'`)
- Tests: `App/__tests__/caja-service.test.ts` y un caso nuevo en `App/__tests__/use-auth-logout.test.tsx`

**Tablas SQLite** (en `nonCacheTables`):
- `caja_mensajes (client_uuid TEXT PK, texto TEXT NOT NULL, autor_nombre TEXT, origen TEXT NOT NULL, sorpresa INTEGER DEFAULT 0, ultimo_mostrado_at INTEGER, en_bolsa INTEGER DEFAULT 1, synced INTEGER DEFAULT 0, created_at INTEGER NOT NULL)`
- `caja_ejemplos (id INTEGER PK, texto TEXT NOT NULL, visto INTEGER DEFAULT 0)`
- `app_config` guarda `caja_ultimo_id`, `caja_cooldown_dias` y `caja_ejemplos_fetched_at`.

**Interfaces producidas:**
- `export const CAJA_ENTITY = 'caja'`
- `listMensajes(): Promise<ICajaLocalMensaje[]>`, con
  `ICajaLocalMensaje = { clientUuid; texto; autorNombre: string | null; origen: 'propio'|'mismo_celular'|'qr'; sorpresa: boolean; ultimoMostradoAt: number | null }`
- `crearMensaje(input: { texto: string; autorNombre?: string; origen: 'propio'|'mismo_celular'; sorpresa: boolean }): Promise<ICajaLocalMensaje>`:
  escribe en local con `en_bolsa = 1` y encola `create`.
- `borrarMensaje(clientUuid): Promise<void>`: si hay un `create` pendiente, `cancelPendingCreate`
  (Foco 2); si no, encola `delete`.
- `borrarPorAutor(autorNombre): Promise<number>`: borra en local con `sameAutor` y encola `delete_autor`.
- `abrirCaja(): Promise<{ mensaje: ICajaLocalMensaje | ICajaEjemploLocal } | null>`: arma el
  `IBagState` (mensajes + ejemplos no vistos si hay menos de 3 aceptados), llama a `elegirMensaje`,
  persiste el nuevo estado y encola `mostrado` o `ejemplo_visto`.
- `aceptarMensajeLocal(m: ICajaMensajeServidor): Promise<void>`: lo usa la Tarea 15.
- `refreshFromServer(): Promise<void>`: carga `GET /caja/mensajes`, `GET /caja/config` y
  `GET /caja/ejemplos`. Conserva las filas con `synced = 0` y reconstruye `en_bolsa` según el
  enfriamiento.
- `clearCajaLocal(): Promise<void>`: borra `caja_mensajes`, `caja_ejemplos`, las claves `caja_*` y
  `DELETE FROM pending_ops WHERE entity = 'caja'`.

**Sincronización** (en `sync-manager.ts`):
- `ENTITY_FEATURE.caja = ACCESS_FEATURES.TOOL_CAJA`.
- En `pushPendingOp`, cuando `entity === CAJA_ENTITY`, se despacha por `tipo`:

  | tipo | Llamada |
  |------|---------|
  | `create` | `POST /caja/mensajes` y marca `synced = 1` |
  | `delete` | `DELETE /caja/mensajes/:uuid` |
  | `delete_autor` | `POST /caja/mensajes/borrar-autor` |
  | `mostrado` | `POST …/mostrado` |
  | `ejemplo_visto` | `POST /caja/ejemplos/:id/visto` |

  Un 404 en `delete` o `mostrado` es un éxito: la op se retira, porque gana el borrado.

- [ ] **Paso 1: tests que fallan.**
  - `'crear y borrar sin conexion no deja ops ni filas'` (Foco 2).
  - `'abrirCaja usa ejemplos solo con menos de 3 aceptados y cada uno una vez'`.
  - `'abrirCaja persiste en_bolsa y encola mostrado'`.
  - `'borrarPorAutor borra las variantes del nombre'` (Foco 3).
  - `'refreshFromServer conserva los no sincronizados'`.
  - `'un 404 en mostrado retira la op'`.
  - `'sin tool.caja las ops quedan en pausa'`, siguiendo `sync-feature-gating.test.ts`.
  - En `use-auth-logout.test.tsx`: `'logout vacia la caja local y sus ops'` (Foco 1).
- [ ] **Paso 2:** `npx jest __tests__/caja-service.test.ts __tests__/use-auth-logout.test.tsx` → FAIL.
- [ ] **Paso 3:** implementar y llamar a `clearCajaLocal()` en `logout`, junto a `clearSafetyPlanCache`
  y con el mismo `.catch`.
- [ ] **Paso 4:** → PASS, y `sync-manager.test.ts` sigue verde. Anotar el progreso.

### Tarea 11: animación en Reanimated

**Archivos:** crear `App/src/components/caja/caja-animation.tsx`; test
`App/__tests__/caja-animation.test.tsx`, siguiendo `gratitude-flower-animation.test.tsx`.

**Interfaces producidas:**
`CajaAnimation: React.FC<{ playing: boolean; reduceMotion: boolean; onRevealed: () => void; size: number }>`.
Con `playing = true` reproduce la secuencia aprobada en la Tarea 8 y llama a `onRevealed` al empezar
la fase de la tarjeta. Con `reduceMotion` llama a `onRevealed` sin la secuencia.

- [ ] **Paso 1: tests que fallan.**
  - `'llama onRevealed al terminar la secuencia'`, con timers falsos y la suma de las duraciones aprobadas.
  - `'con reduceMotion llama onRevealed sin balanceo'`.
  - `'usa solo colores de COLORS'`: lo cubre `palette-guard`.
- [ ] **Paso 2:** `npx jest __tests__/caja-animation.test.tsx` → FAIL.
- [ ] **Paso 3:** pasar el SVG del prototipo a `react-native-svg` y las curvas a `withSequence`,
  `withTiming` y `Easing`. Los tiempos se exportan como `CAJA_TIMINGS`.
- [ ] **Paso 4:** → PASS. Anotar el progreso.

### Tarea 12: pantallas y registro de la herramienta

**Archivos:**
- Crear: `App/src/hooks/use-caja.ts`, `App/src/components/caja/caja-message-card.tsx`,
  `App/src/screens/caja-screen.tsx`, `caja-write-screen.tsx` y `caja-messages-screen.tsx`
- Modificar: `App/src/screens/index.ts`, `App/src/navigation/app-navigator.tsx` (rutas `Caja`,
  `CajaWrite` y `CajaMessages`), `App/src/constants/tool-catalog.ts`
- Tests: `App/__tests__/caja-screen.test.tsx`, `caja-write-screen.test.tsx` y `caja-messages-screen.test.tsx`

**Interfaces producidas:**
- `useCaja()` devuelve `{ mensajes, pendientesCount, loading, abrir(): Promise<...>, borrar(uuid), borrarPorAutor(nombre), refresh() }`.
  `pendientesCount` vale 0 hasta la Tarea 15.
- Entrada en `TOOL_CATALOG`: `id 'caja'`, título `'Caja de mensajes'`, descripción
  `'Guarda mensajes que te animen y abre la caja cuando lo necesites.'`, icono `'🎁'`,
  ruta `'Caja'`, `requiresAuth: true`, `featureKey: ACCESS_FEATURES.TOOL_CAJA`.

**Comportamiento** (spec §3.1 a §3.3 y §3.6):
- **Caja:** muestra el contador y el estado vacío, y el disclaimer.
  - La caja tiene `accessibilityRole="button"` y `accessibilityLabel="Abrir la caja de mensajes"`.
  - Al revelar el mensaje se llama a `AccessibilityInfo.announceForAccessibility` con el texto y el autor.
  - `reduceMotion` se lee de `AccessibilityInfo.isReduceMotionEnabled`.
- **Formulario:** tiene el selector "Lo escribo yo / Lo escribe alguien más". Con "alguien más" aparece
  el campo "¿Quién lo escribe?". Al guardar en `mismo_celular` aparece el diálogo con el copy exacto y
  las opciones "Leerlo primero" y "Guardarlo como sorpresa". "Leerlo primero" muestra una vista previa
  con "Dejar entrar" y "No guardar".
- **Tarjeta:** muestra "— {autor}" si no es propio y "— VittalMind" si es un ejemplo. Botones Cerrar,
  Abrir otro y Borrar este mensaje (este último con confirmación y oculto en los ejemplos).
- **Mis mensajes:**
  - agrupa por autor, normalizado con `sameAutor` y mostrando la primera grafía; los propios van bajo "Yo";
  - un mensaje con `sorpresa` se muestra como "Mensaje sorpresa de {autor}", sin el texto;
  - cada mensaje se borra con confirmación;
  - cada grupo tiene "Borrar todos los mensajes de {autor}", con una confirmación que dice cuántos son.

- [ ] **Paso 1: tests que fallan.**
  - `'caja vacia sin ejemplos muestra el estado vacio'`.
  - `'tocar la caja muestra la tarjeta con el autor'`.
  - `'borrar desde la tarjeta pide confirmacion y lo quita'`.
  - `'alguien mas exige nombre'`.
  - `'sorpresa guarda sin mostrar el texto'`.
  - `'leer primero y No guardar no guarda nada'`.
  - `'Mis mensajes oculta el texto de las sorpresas'`.
  - `'borrar todos los de Ana confirma con el conteo'`.
  - `'el contador de 500/500 acepta emojis'` (Foco 5).
  - `'anuncia el mensaje al lector de pantalla'`.
- [ ] **Paso 2:** `npx jest __tests__/caja-` → FAIL.
- [ ] **Paso 3:** implementar.
- [ ] **Paso 4:** → PASS.
- [ ] **Paso 5:** asignar `tool.caja` a una categoría del Home desde el plugin Psicoeducación en el
  entorno de pruebas, y verificar en Expo que la herramienta aparece con su candado según el plan.
  Anotar en `progress/current.md` que la 114 requiere una build nueva de EAS.
- [ ] **Paso 6:** `.\init.ps1` en verde → feature 114 `done`.

---

# Feature 115: `caja_qr`

### Tarea 13: Invitar a escribirme

**Archivos:**
- Crear: `App/src/screens/caja-invite-screen.tsx`
- Modificar: `App/src/services/caja-service.ts`, `app-navigator.tsx` (ruta `CajaInvite`) y
  `caja-screen.tsx` (botón "Invitar a escribirme")
- Test: `App/__tests__/caja-invite-screen.test.tsx`

**Interfaces producidas:**
- `crearInvitacion(): Promise<{ url: string; png: string }>` llama a `POST /caja/invitacion` y guarda
  `{ url, png }` en `app_config` (`caja_invitacion`), para poder mostrar el QR sin conexión.
- `getInvitacionCache(): Promise<{ url: string; png: string } | null>`.
- `clearCajaLocal` también borra `caja_invitacion`.

**Pantalla:** muestra el QR como `<Image source={{ uri: 'data:image/png;base64,' + png }} />`, sin
añadir una librería de QR a la App. Tiene el botón "Generar un QR nuevo", con la confirmación
"El QR anterior dejará de funcionar".

- [ ] **Paso 1: tests que fallan.**
  - `'muestra el QR en cache sin conexion'`.
  - `'sin cache y sin conexion muestra el aviso de conexion'`.
  - `'regenerar pide confirmacion y reemplaza el QR'`.
- [ ] **Paso 2:** `npx jest __tests__/caja-invite-screen.test.tsx` → FAIL.
- [ ] **Paso 3:** implementar.
- [ ] **Paso 4:** → PASS. Anotar el progreso.

### Tarea 14: Escríbele a alguien más

**Archivos:**
- Crear: `App/src/utils/caja-link.ts`, `App/src/screens/caja-write-other-screen.tsx` y
  `App/src/hooks/use-caja-link.ts`
- Modificar: `App/src/services/caja-service.ts`, `app-navigator.tsx` (ruta
  `CajaWriteOther: { token?: string }`), `navigation/navigation-ref.ts` (`navigateToCajaWriteOther(token)`),
  `tools-screen.tsx` y `caja-screen.tsx` (botón "Escríbele a alguien más"), y el montaje de los hooks de
  enlace (donde se monta `useRedeemLink`)
- Tests: `App/__tests__/caja-link.test.ts` y `App/__tests__/caja-write-other-screen.test.tsx`

**Interfaces producidas:**
- `parseCajaDeepLink(url: string): string | null`: acepta `vittalmind://caja/escribir/<token>` y
  `com.vittalmind.app://caja/escribir/<token>`, con un token base64url de 43 caracteres. Cualquier otra
  cosa devuelve `null`.
- `escribirAOtra(token: string, input: { texto: string; autorNombre: string }): Promise<void>`:
  llama a `POST /caja/escribir/:token`. No pasa por `pending_ops`, porque necesita conexión (spec §3.5).
- `useCajaLink({ isAuthenticated, isGuest, isOnboarding })`: el mismo patrón que `useRedeemLink`.
  Guarda el token pendiente y, cuando hay una cuenta con sesión, navega a `CajaWriteOther`.

**Pantalla:**
- Sin token, abre `RedeemScanner`. Si lo que lee no es un enlace de la caja, muestra "Este QR no es de
  una caja de mensajes".
- Con token, muestra los campos de mensaje y "Tu nombre", con las validaciones de `caja-input.ts`.
- Mensajes según la respuesta:

  | Caso | Mensaje |
  |------|---------|
  | 201 | "Tu mensaje le llegará cuando lo acepte" |
  | 429 `CAJA_PENDIENTES_LLENOS` | "Su caja está llena de mensajes por revisar, inténtalo más tarde" |
  | 404 | "Este QR ya no funciona. Pídele uno nuevo" |
  | sin red | "Necesitas conexión para enviar el mensaje" |

- [ ] **Paso 1: tests que fallan.**
  - Tabla de `parseCajaDeepLink`: válidos, otro host, token corto y el enlace de `canjear` → `null`.
  - `'el escaner rechaza un QR que no es de caja'`.
  - `'enviar muestra la confirmacion'`.
  - `'429 muestra caja llena'`.
  - `'sin red no envia y avisa'`.
  - `'invitado sin cuenta ve el aviso de iniciar sesion'`.
- [ ] **Paso 2:** `npx jest __tests__/caja-link.test.ts __tests__/caja-write-other-screen.test.tsx` → FAIL.
- [ ] **Paso 3:** implementar.
- [ ] **Paso 4:** → PASS. Anotar el progreso.

### Tarea 15: pendientes por aprobar

**Archivos:**
- Modificar: `App/src/services/caja-service.ts`, `App/src/hooks/use-caja.ts`, `caja-screen.tsx`
  (aviso "Tienes N mensajes esperando") y `caja-messages-screen.tsx` (sección Pendientes)
- Test: `App/__tests__/caja-pendientes.test.tsx`

**Interfaces producidas:**
- `listPendientes(): Promise<ICajaPendienteApp[]>` (`GET /caja/pendientes`), con
  `ICajaPendienteApp = { id: number; texto: string; autorNombre: string; createdAt: string }`.
- `aceptarPendiente(id)`: `POST …/aceptar` y luego `aceptarMensajeLocal(respuesta)`, con `en_bolsa = 1`
  y `synced = 1`.
- `rechazarPendiente(id)`: `POST …/rechazar`.
- `useCaja` refresca los pendientes al montarse y al volver al primer plano (`AppState` → `active`), el
  mismo disparador de la feature 108. Sin red mantiene el último conteo y no muestra error.

- [ ] **Paso 1: tests que fallan.**
  - `'muestra el aviso con el numero de pendientes'`.
  - `'Pendientes muestra texto y nombre completos'`.
  - `'Dejar entrar lo agrega a la bolsa'`.
  - `'Rechazar pide confirmacion y lo quita'`.
  - `'al volver al primer plano se recargan los pendientes'`.
  - `'sin red conserva el ultimo conteo'`.
- [ ] **Paso 2:** `npx jest __tests__/caja-pendientes.test.tsx` → FAIL.
- [ ] **Paso 3:** implementar.
- [ ] **Paso 4:** → PASS.
- [ ] **Paso 5:** prueba de punta a punta con dos cuentas contra la API de Docker:
  - A muestra el QR, B lo escanea y escribe;
  - A acepta y el mensaje sale de la caja;
  - A regenera el QR y el QR viejo responde "ya no funciona";
  - A borra todos los mensajes de B.
- [ ] **Paso 6:** `.\init.ps1` en verde → feature 115 `done`, con el resumen en `progress/history.md`.
