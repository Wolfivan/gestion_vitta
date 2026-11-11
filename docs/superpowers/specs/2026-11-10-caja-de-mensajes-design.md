# Diseño: Caja de mensajes de ánimo

> Fecha: 2026-11-10. Estado: **pendiente de revisión por la usuaria.**
> Origen: decisiones tomadas en el chat del 2026-11-10.

## 1. Objetivo

Una herramienta nueva, la **Caja de mensajes**. La usuaria guarda mensajes bonitos o de ánimo, escritos
por ella misma o por otras personas. Al tocar la caja se reproduce una animación y aparece uno de esos
mensajes al azar. Ningún mensaje se repite hasta que se hayan mostrado todos los pendientes, o hasta que
haya pasado un tiempo configurable.

### Éxito significa
- La caja se abre sin conexión y siempre muestra un mensaje si existe al menos uno.
- Un mensaje no vuelve a salir hasta que hayan salido todos los demás de la bolsa, ni antes de
  `CAJA_COOLDOWN_DAYS` días, salvo que no quede otro (ver §5.3).
- Otra persona puede escribir un mensaje **en el mismo celular** o **desde su propia app escaneando un
  QR**, sin que ninguna cuenta quede vinculada a otra.
- Nada escrito por otra persona entra a la caja sin que la dueña lo decida.
- Cualquier mensaje se puede borrar en cualquier momento, incluso justo después de salir de la caja.
  También se pueden borrar todos los mensajes de una persona de una vez.
- Los mensajes se ven en otro dispositivo después de iniciar sesión.

## 2. Decisiones tomadas

| # | Decisión |
|---|----------|
| D1 | Hay cuatro orígenes de mensaje: `propio`, `mismo_celular`, `qr` y `ejemplo` (§4). |
| D2 | **Mismo celular:** antes de guardar, la app le pregunta a la dueña: *"¿Quieres leerlo antes de guardarlo o lo guardas como sorpresa?"*. Si elige leerlo, ve el texto y decide si entra o no. Si elige sorpresa, entra a la bolsa sin leerlo. |
| D3 | **QR:** el mensaje llega como `pendiente` y **siempre** se aprueba viendo el texto completo y el nombre. Rechazar lo borra. |
| D4 | Al escribir para otra persona se pide **mensaje + nombre**. El nombre es texto libre y es lo único que identifica al autor. No se guarda la cuenta del autor. |
| D5 | Los **mensajes de ejemplo** los sirve el Backend (contenido dinámico, editable por el psicólogo). Cada uno sale **una sola vez** por usuaria y después desaparece. Solo se usan mientras la usuaria tiene menos de 3 mensajes aceptados (de cualquier origen). |
| D6 | Los días de enfriamiento son la variable de entorno **`CAJA_COOLDOWN_DAYS`** (por defecto `7`). |
| D7 | La caja se puede abrir **sin límite** de veces al día. |
| D8 | **La bolsa vive en el dispositivo** (SQLite). El servidor guarda los mensajes y su `ultimo_mostrado_at` en segundo plano, para respetar el enfriamiento en otro dispositivo. |
| D9 | El texto y el nombre se **cifran solo en la base de datos** (AES-256-GCM a nivel de aplicación). En el dispositivo se guardan en SQLite como el resto de las herramientas. |
| D10 | Se reutiliza `Backend/src/utils/field-encryption.ts`, generalizado para recibir el nombre de la variable de la clave. La caja usa su propia clave, **`CAJA_ENCRYPTION_KEY`**, separada de la del plan de seguridad. |
| D11 | Se reutiliza `RedeemScanner.tsx` (expo-camera) para escanear el QR. |
| D12 | Feature de acceso `tool.caja`, incluida en el plan **Esencial**. La herramienta se asigna a una categoría del Home desde el plugin Psicoeducación (mecanismo de la feature 110). |
| D13 | La animación se prototipa primero en **HTML + SVG + CSS/JS** para verla en el navegador. Cuando se aprueba, se implementa en **TypeScript con `react-native-reanimated` 4 y `react-native-svg`**, igual que `gratitude-flower-animation.tsx`. |
| D14 | Va **después de la feature 112**, como features 113, 114 y 115 (§10). |

## 3. Pantallas y flujos (App)

### 3.1 Mi caja (`caja-screen.tsx`)
- Muestra la caja en el centro. Debajo, el contador "N mensajes en tu caja" y un aviso si hay
  mensajes pendientes por aprobar ("Tienes 2 mensajes esperando").
- Acciones:
  - **Tocar la caja**: animación y tarjeta con el mensaje (§6).
  - **Escribir un mensaje**: abre el formulario con el selector "Lo escribo yo / Lo escribe alguien más".
  - **Invitar a escribirme**: muestra el QR (§3.4).
  - **Mis mensajes**: abre la lista (§3.3).
- Si la caja está vacía y no quedan ejemplos, en vez de abrirse muestra un estado vacío que invita a
  escribir el primer mensaje o a invitar a alguien.
- Incluye el disclaimer legal estándar de la app.

### 3.2 Escribir un mensaje
- **Lo escribo yo:** un campo de texto (1 a 500 caracteres). Se guarda con origen `propio`.
- **Lo escribe alguien más (mismo celular):** aparecen el campo de texto y el campo **"¿Quién lo
  escribe?"** (nombre, de 1 a 40 caracteres). Se le indica a la otra persona que devuelva el celular.
  Al tocar Guardar aparece el diálogo de D2:
  - **"Leerlo primero"**: muestra el texto y el nombre, con los botones *Dejar entrar* y *No guardar*.
  - **"Guardarlo como sorpresa"**: entra sin mostrarse.

### 3.3 Mis mensajes
- Lista de los mensajes aceptados, agrupados por nombre del autor ("Yo", "Ana", ...).
  **No muestra el texto de los mensajes sorpresa que todavía no han salido**: solo dice "Mensaje
  sorpresa de Ana", para no arruinar la sorpresa.
- Cada mensaje se puede borrar, con confirmación.
- Por grupo: **"Borrar todos los mensajes de Ana"**, con confirmación que dice cuántos son. Es para el
  caso en que la relación con esa persona terminó.
- Sección **Pendientes** (mensajes por QR): texto completo y nombre, con *Dejar entrar* y *Rechazar*.

### 3.4 Invitar a escribirme (QR)
- Muestra un QR con la URL `vittalmind://caja/escribir/<token>`. El token es aleatorio (32 bytes,
  base64url) y no contiene ningún dato de la usuaria.
- Botón **"Generar un QR nuevo"**: invalida el anterior. Sirve si el QR se compartió con alguien que
  ya no debería escribir.

### 3.5 Escríbele a alguien más (desde la app de otra persona)
- Botón en la pantalla de la caja y entrada en la pestaña Herramientas. Abre el escáner.
- Al leer un token válido aparecen los campos **mensaje** y **tu nombre**. Al enviar se muestra
  "Tu mensaje le llegará cuando lo acepte".
- Para escribir hay que tener sesión, para poder limitar el abuso, pero tu cuenta no se guarda junto
  al mensaje. **No hace falta tener `tool.caja`**: escribirle a alguien es gratis.
- Esta acción necesita conexión. Sin red se muestra "Necesitas conexión para enviar el mensaje".

### 3.6 Tarjeta del mensaje (después de la animación)
- Muestra el texto y, si no es propio, "— Ana".
- Botones: **Cerrar**, **Abrir otro** y **Borrar este mensaje** (con confirmación). Este último cubre el
  caso de un mensaje que ya no se quiere leer justo cuando sale.

## 4. Orígenes y estados

| Origen | Autor | Estado inicial | Se muestra el texto antes de entrar |
|--------|-------|----------------|-------------------------------------|
| `propio` | La usuaria | `aceptado` | — |
| `mismo_celular` | Nombre libre | `aceptado` | Solo si la dueña elige "Leerlo primero" |
| `qr` | Nombre libre | `pendiente` | Sí, siempre |
| `ejemplo` | "VittalMind" | No se guarda como mensaje (§5.4) | — |

Estados: `pendiente` → `aceptado`, o `pendiente` → borrado (rechazo). Borrar un mensaje es un
**borrado físico** en el servidor y en el dispositivo. No hay papelera, porque el caso de uso
(una ruptura) pide que el mensaje desaparezca de verdad.

Campo `sorpresa` (boolean): es `true` en `mismo_celular` cuando se eligió "Guardarlo como sorpresa".
Pasa a `false` la primera vez que el mensaje sale de la caja. A partir de ahí el texto ya es visible en
"Mis mensajes".

## 5. La bolsa (en el dispositivo)

### 5.1 Estado local
Tabla SQLite `caja_mensajes`: `client_uuid`, `texto`, `autor_nombre`, `origen`, `sorpresa`,
`ultimo_mostrado_at`, `en_bolsa` (boolean), `updated_at`.
Más una clave en caché: `caja_ultimo_mostrado` (el `client_uuid` del último mensaje que salió).

### 5.2 Algoritmo de apertura
1. Candidatos = mensajes aceptados con `en_bolsa = true`.
2. Si no hay candidatos, se **rellena la bolsa**: se marcan `en_bolsa = true` todos los aceptados con
   `ultimo_mostrado_at` nulo o más antiguo que `CAJA_COOLDOWN_DAYS`. Se excluye `caja_ultimo_mostrado`
   si hay otro disponible, para que nunca salga el mismo mensaje dos veces seguidas.
3. Se elige uno al azar entre los candidatos. La función de azar se inyecta para poder probarla.
4. El elegido queda con `en_bolsa = false` y `ultimo_mostrado_at = ahora`, y `sorpresa = false`.
   Se encola la operación `caja.mostrado` en `pending_ops`.

El algoritmo vive en una función pura (`elegirMensaje(estado, ahora, cooldownDias, random)`) que
devuelve el elegido y el estado nuevo. Así se prueba sin SQLite.

### 5.3 Casos borde
- **Todos en enfriamiento y la bolsa vacía:** sale el que tiene el `ultimo_mostrado_at` más antiguo,
  distinto del último si hay más de uno. La caja nunca se abre vacía si hay mensajes.
- **Un solo mensaje:** sale siempre ese. Se acepta la repetición.
- **Mensaje nuevo aceptado:** entra con `en_bolsa = true` en la bolsa actual.
- **Mensaje borrado:** sale de la bolsa al instante.

### 5.4 Mensajes de ejemplo
- Si la usuaria tiene menos de 3 mensajes aceptados, la bolsa incluye los ejemplos que todavía no ha
  visto (`GET /caja/ejemplos`, en caché para usarlos sin conexión).
- Cuando un ejemplo sale, se guarda su id en `caja_ejemplos_vistos` (local y sincronizado) y no vuelve.
- Con 3 o más mensajes aceptados (de cualquier origen) los ejemplos dejan de usarse, aunque queden sin ver.
- En la tarjeta, un ejemplo se firma "— VittalMind". Desde la tarjeta no se puede borrar, porque ya
  desaparece solo.

### 5.5 Sincronización
Usa `pending_ops` y `flushPendingOps`, el mismo patrón que gratitud, con `client_uuid` para la
idempotencia:
- `caja.crear`, `caja.borrar`, `caja.borrar_autor`, `caja.aceptar`, `caja.rechazar`, `caja.mostrado`,
  `caja.ejemplo_visto`.
- Al iniciar sesión en otro dispositivo, `GET /caja/mensajes` llena el SQLite. La bolsa se reconstruye
  con `ultimo_mostrado_at`: entran los que ya cumplieron el enfriamiento.
- Los pendientes por QR se leen con `GET /caja/pendientes` al abrir la pantalla y al volver al primer
  plano (mismo disparador que la feature 108).
- Conflictos: gana el borrado. Si un mensaje se borró en un dispositivo, un `caja.mostrado` posterior
  de otro dispositivo se ignora (responde 404 y la operación se descarta).

## 6. Animación

- **Secuencia propuesta** (en total ~1,6 s; el prototipo decide los tiempos finales):
  1. la caja se balancea dos veces (~400 ms);
  2. la tapa se abre girando hacia atrás (~350 ms);
  3. salen unas partículas suaves (~300 ms);
  4. la tarjeta del mensaje sube desde dentro de la caja y crece hasta el centro (~550 ms).
- Cerrar la tarjeta devuelve la caja a su estado cerrado.
- **Reducir movimiento** (`AccessibilityInfo.isReduceMotionEnabled`): sin balanceo ni partículas. La
  tarjeta aparece con un fundido de 200 ms.
- **Lector de pantalla:** la caja es un botón con la etiqueta "Abrir la caja de mensajes". Al aparecer la
  tarjeta se anuncia el texto y el autor (`announceForAccessibility`).
- Paso previo: un prototipo `docs/prototipos/caja-animacion.html` (HTML, SVG y CSS/JS, sin
  dependencias) que se abre en el navegador. El SVG y las curvas de tiempo que se aprueben se copian a
  `caja-animation.tsx`.
- Colores y tipografía de `App/src/constants` (`COLORS`). Nada de colores sueltos.

## 7. Backend

### 7.1 Modelo de datos (migración `037_caja_mensajes.sql`)
- `caja_mensajes`: `id`, `id_anonimo` (FK), `client_uuid` (único por `id_anonimo`), `texto_cifrado`,
  `autor_nombre_cifrado` (nulo en `propio`), `origen`, `estado` (`pendiente`/`aceptado`), `sorpresa`,
  `ultimo_mostrado_at`, `created_at`, `updated_at`.
  Índice por (`id_anonimo`, `estado`).
- `caja_invitaciones`: `id_anonimo` (PK, una invitación activa por usuaria), `token_hash`
  (SHA-256 del token; el token en claro no se guarda), `created_at`.
- `caja_ejemplos`: `id`, `texto`, `activo`, `orden`. Contenido clínico sin cifrar. Lo edita el psicólogo.
- `caja_ejemplos_vistos`: (`id_anonimo`, `ejemplo_id`) PK.
- Siembra con unos 10 mensajes de ejemplo y el registro de la feature `tool.caja`, incluida en Esencial.
- Borrar una cuenta borra en cascada todo lo anterior.

### 7.2 Endpoints (todos con sesión)

| Método y ruta | Quién | Qué hace |
|---------------|-------|----------|
| `GET /caja/config` | dueña | `{ cooldownDias }` desde `CAJA_COOLDOWN_DAYS` |
| `GET /caja/mensajes` | dueña | Mensajes aceptados, descifrados |
| `POST /caja/mensajes` | dueña | Crea `propio` o `mismo_celular`. Idempotente por `client_uuid` |
| `DELETE /caja/mensajes/:clientUuid` | dueña | Borrado físico |
| `POST /caja/mensajes/borrar-autor` | dueña | `{ autorNombre }`: borra todos los de ese autor. Compara después de descifrar. Devuelve cuántos borró |
| `POST /caja/mensajes/:clientUuid/mostrado` | dueña | Actualiza `ultimo_mostrado_at` y `sorpresa = false` |
| `GET /caja/pendientes` | dueña | Mensajes `qr` pendientes |
| `POST /caja/pendientes/:id/aceptar` | dueña | Pasa a `aceptado` y le asigna `client_uuid` |
| `POST /caja/pendientes/:id/rechazar` | dueña | Borrado físico |
| `POST /caja/invitacion` | dueña | Crea o regenera el token. Devuelve el token en claro **una sola vez** |
| `POST /caja/escribir/:token` | cualquier usuaria con sesión | `{ texto, autorNombre }`. Crea un `qr` pendiente en la caja dueña del token |
| `GET /caja/ejemplos` | dueña | Ejemplos activos no vistos |
| `POST /caja/ejemplos/:id/visto` | dueña | Marca el ejemplo como visto |
| Admin `GET/POST/PUT/DELETE /admin/caja/ejemplos` | administrador | CRUD de ejemplos para el psicólogo |

- Las rutas de la dueña exigen `tool.caja`. `POST /caja/escribir/:token` solo exige sesión.
- Validación: texto de 1 a 500 caracteres y nombre de 1 a 40, con `trim`. Se rechazan textos solo de
  espacios.
- Los errores siguen `AppError` con códigos (`CAJA_TOKEN_INVALIDO`, `CAJA_PENDIENTES_LLENOS`,
  `CAJA_TEXTO_INVALIDO`, ...).

### 7.3 Anti-abuso de la escritura por QR
- Máximo **20 pendientes** por caja. Si se pasa: `429 CAJA_PENDIENTES_LLENOS`, y quien escribe ve
  "Su caja está llena de mensajes por revisar, inténtalo más tarde".
- Límite de frecuencia: **10 mensajes por hora** por `id_anonimo` de quien escribe y **30 por hora por
  IP**. Va en memoria, con el mismo patrón que el canje de códigos (`isLimited` y `countAttempt` en
  `access-code-service.ts`), extraído a una utilidad compartida. Si se reinicia el servidor el contador
  vuelve a cero, y eso se acepta porque el tope de 20 pendientes ya acota el daño. Ese id **no se
  guarda** junto al mensaje.
- Los tokens inválidos también cuentan contra el límite por IP, para que no se puedan adivinar tokens.
- Escribirte a ti misma con tu propio token responde `400`.
- Un token inválido o regenerado responde `404 CAJA_TOKEN_INVALIDO`, sin decir de quién era.

### 7.4 Cifrado
- `field-encryption.ts` gana un parámetro opcional con el nombre de la variable de la clave. Por defecto
  sigue usando `SAFETY_PLAN_ENCRYPTION_KEY`, así que el plan de seguridad no cambia.
- La caja usa `CAJA_ENCRYPTION_KEY` y `CAJA_ENCRYPTION_KEY_PREVIOUS`. Fail-closed: sin clave, los
  endpoints de la caja responden 500 genérico.
- Se añaden `CAJA_ENCRYPTION_KEY` y `CAJA_COOLDOWN_DAYS` a `.env.example` y a la documentación de
  entornos.
- Nunca se loggea el texto ni el nombre, ni en claro ni cifrados.

## 8. Privacidad

- Todo apunta a `id_anonimo`. No existe ninguna relación entre la cuenta de quien escribe y la caja.
- El QR solo lleva un token aleatorio. En la base de datos se guarda su hash.
- El nombre del autor es texto libre que escribe una persona. No se valida contra ninguna cuenta.
- Se actualiza `PRIVACY_POLICY.md` con un párrafo sobre la caja: qué se guarda, que va cifrado y que se
  puede borrar.

## 9. Pruebas

- **Backend** (Jest): migración en `database-migration.test.ts`; repositorio; servicio (estados,
  aprobación, borrado por autor, cifrado y descifrado, límites, token regenerado, auto-escritura);
  rutas con `supertest`, incluido el 403 sin `tool.caja` en las rutas de la dueña.
- **App** (Jest + Testing Library):
  - `elegirMensaje`: sin repetición dentro de la bolsa, relleno respetando el enfriamiento, nunca dos
    seguidos iguales, todos en enfriamiento, un solo mensaje, ejemplos que salen una vez.
  - Servicio: cola de `pending_ops` y reconstrucción desde el servidor.
  - Pantallas: formulario con y sin nombre, diálogo leer o sorpresa, lista sin mostrar sorpresas,
    borrar por autor, pendientes, estado vacío, reducir movimiento.
- `.\init.ps1` en verde para cerrar cada feature.

## 10. División en features (después de la 112)

| id | Nombre | Contenido |
|----|--------|-----------|
| 113 | `caja_backend` | §7 completa, generalizar `field-encryption.ts`, variables de entorno, siembra de ejemplos |
| 114 | `caja_app` | Prototipo HTML aprobado, §3.1 a §3.3 y §3.6, bolsa (§5), animación (§6), sincronización. Requiere build nueva de EAS |
| 115 | `caja_qr` | §3.4 y §3.5, pendientes en la App, deep link `vittalmind://caja/escribir/<token>` |

### Adicionales (se anotan como `pending`, prioridad baja)
- Marcar mensajes como favoritos.
- Historial de los mensajes que ya salieron.
- Compartir un mensaje como imagen.
- Push "Tienes un mensaje nuevo en tu caja" cuando llega un pendiente por QR (sin el texto en la
  notificación).
- Pantalla en el plugin de WordPress para editar los mensajes de ejemplo. Hasta entonces se usan los
  endpoints admin.

## 11. Fuera de alcance
- Vincular cuentas entre usuarias.
- Responder a quien escribió un mensaje.
- Cifrado en el dispositivo.
- Programar mensajes para una fecha.
