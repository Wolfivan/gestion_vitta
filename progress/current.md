# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a history.md.
> Mientras trabajas, **manténlo actualizado en tiempo real**, no al final.

## Estado
- **Tarea**: feature 109 (`category_tools_backend`), primera de la serie 109 a 112: categorías como módulos con herramientas.
- **Inicio**: 2026-11-04.
- **Estado**: in_progress.
- **Plan breve**: `docs/superpowers/plans/2026-11-04-categorias-herramientas.md`, Feature A (Tareas 1 a 4). Spec en `docs/superpowers/specs/2026-11-04-categorias-herramientas-design.md`. Ejecución nativa, sin commits.

## Feature 122 `caja_badge_pendientes` — done (2026-11-17)
- Se registra como 122 porque otra sesion tiene la 121 en su worktree.
- Plan: (1) quitar la tarjeta "Escríbele a alguien más" de Herramientas y `openWriteOther`; (2) store compartido de pendientes (`caja-pendientes-store`) que alimenta `useCaja`, el badge de la tarjeta de la Caja, el icono de Herramientas y "Mis mensajes".
- Hecho (App):
  - Quitada la tarjeta suelta de `tools-screen.tsx` y `openWriteOther` de `use-open-tool.ts` (ambos vuelven a quedar como en HEAD). Escribir a otro sigue desde el botón de la Caja y el deep link.
  - `src/services/caja-pendientes-store.ts`: store en memoria de los pendientes. Solo consulta si está habilitado; ante cualquier error conserva lo último; un número de petición evita que una respuesta vieja pise otra o que llegue después de un reinicio.
  - `src/hooks/use-caja-pendientes.ts`: `useCajaPendientes` (lectura con `useSyncExternalStore`), `useToolBadgeCount` y `useCajaPendientesSync`. Este último se monta en `App.tsx` (`AppContent`); habilita el store solo con cuenta, sin invitado y con `tool.caja`. Consulta al arrancar y en AppState `active`; con logout, invitado o sin la feature vuelve a 0.
  - `useCaja` ya no guarda su propia lista ni escucha AppState: lee el store y lo refresca al montar, al enfocar y después de aceptar o rechazar.
  - `src/components/count-badge.tsx`: badge redondo (`COLORS.accent` con texto `COLORS.surface`, tope "9+", etiqueta "N mensajes esperando").
  - El badge aparece en `ToolCard` (prop `badgeCount`, solo en la Caja, en Herramientas y en la categoría), en el icono de Herramientas (`TabIcon`, que pasó a `src/navigation/tab-icon.tsx`) y en "Mis mensajes" de `caja-screen.tsx`.
  - Tests: nuevo `__tests__/caja-badge.test.tsx` con 21 tests. `caja-pendientes.test.tsx` ahora habilita el store y monta el sync para los tests de AppState, y suma 2 tests del badge de Mis mensajes. Jest: 811 en verde.
- `init.ps1` en verde: tests de Backend y App pasan, quality gate en PASS (App: tsc 0, eslint 0 errores, duplicación 8.80 %). Sin commit.
- Pendiente manual: verlo en el dispositivo con una cuenta que tenga pendientes por QR.

## Bug: "No se pudo generar el QR" en desarrollo (2026-11-17)
- Causa raíz: el contenedor `backend-api-1` se había construido el 4 de noviembre, antes de la 113, así que respondía 404 en `/caja/*`. La App muestra cualquier error que no sea de red como "No se pudo generar el QR".
- Arreglo del entorno (sin cambios de código de la caja):
  - Se recreó `Backend/.env.docker` (ignorado por git) con las variables del contenedor más una `CAJA_ENCRYPTION_KEY` solo para local y `CAJA_COOLDOWN_DAYS=7`.
  - Se reconstruyó solo el servicio `api`.
- Segundo problema: el `Dockerfile` estaba con CRLF en el disco y el entrypoint fallaba ("no such file or directory"). Se convirtió a LF (en git ya estaba con LF, así que no hay diff) y se agregó `Backend/.gitattributes` (`Dockerfile` y `*.sh` con `eol=lf`).
- Se agregaron las variables `CAJA_*` a `Backend/.env.docker.example`.
- Smoke: `POST /caja/invitacion` autenticado devuelve 201 con url y png. La migración 037 corrió al arrancar sin efecto, porque ya estaba aplicada.
- Nota: el smoke generó una invitación para el último usuario de la base local. Si era tu cuenta, ese QR ya existe y la App lo pedirá con "Mostrar mi QR".

## Feature 115 `caja_qr` — done (2026-11-17)
- Rulings:
  - R6: textos para `CAJA_RATE_LIMITED` y `CAJA_AUTOESCRITURA`.
  - R7: "Escríbele a alguien más" no lleva el candado de plan.
- Tareas:
  - Tarea 13 (Invitar a escribirme): pantalla del QR con caché.
  - Tarea 14 (Escríbele a alguien más): escáner, deep link y envío. Se corrigió que el enlace inicial se releyera en cada cambio de sesión.
  - Tarea 15 (pendientes): aviso, sección Pendientes y recarga al volver a la App.
- Revisión final "con correcciones", aplicadas en una sola ola de 9 y re-revisión limpia:
  - sin caché, el QR ya no se regenera solo: aparece "Mostrar mi QR" con advertencia;
  - un enlace nuevo con la pantalla de escribir al frente cambia de destinatario;
  - texto del permiso de cámara en `app.json` y texto de cámara bloqueada;
  - un 404 al aceptar recupera el mensaje del servidor;
  - botón "Escanear otro QR";
  - "Verá tu nombre";
  - el aviso de pendientes se puede tocar;
  - texto de rechazo;
  - un test reforzado.
- `init.ps1` en verde: App con 788 tests, quality gate en PASS y Docker activo (duplicación en App: 9.03 %).
- Pendiente con la usuaria:
  - Prueba de punta a punta con dos cuentas y dos teléfonos (plan, Tarea 15, paso 5), con build nueva de EAS porque cambió `app.json`.
  - Prueba de humo en Docker del Backend.
  - Asignar `tool.caja` a una categoría del Home.
- Fuera de alcance, propuesto aparte:
  - ~~`useRedeemLink` relee `getInitialURL` en cada cambio de sesión~~: era un falso positivo. Se verificó el 2026-11-17: el efecto ya tiene `[]` como dependencias.
  - `api.ts` reintenta los POST no idempotentes tras un timeout.
  - "Rechazar todos los de una persona" en pendientes, sin decidir.

## Feature 114 `caja_app` — done (2026-11-17)
- Ajustes pedidos por la usuaria antes de cerrarla:
  - El recuadro de la animación se amplió hacia arriba (viewBox `0 -80 240 320`), porque la tapa abierta se cortaba.
  - "Lo escribe alguien más" ya no pregunta leer o sorpresa: se guarda directo como sorpresa y solo muestra "Mensaje de {nombre} guardado". Se actualizaron D2 y §3.2 de la spec.
  - La revisión los aprobó.
- `init.ps1` en verde, con quality gate en PASS y Docker activo. Marcada done a pedido de la usuaria. La prueba en dispositivo sigue recomendada.

### Historial de la 114
- La usuaria aprobó la animación tal como está en el prototipo: `CAJA_TIMINGS = { wobble: 400, lid: 350, particles: 300, card: 550 }`. Las curvas están en el ledger.
- La App pasó de `main` a `desarrollo` (los dos apuntaban al mismo commit y el árbol estaba limpio).
- Rulings del pre-flight:
  - R4: un 404 de `DELETE` o de `/mostrado` cuenta como éxito en la sincronización (gana el borrado).
  - R5: `access-keys.test.ts` y `FREE_FEATURES` suman `tool.caja` y la migración 037.
- Tarea 9 completa, con la revisión aprobada:
  - `caja-bag.ts` (`elegirMensaje`, función pura) y `caja-input.ts` en la App.
  - Tests: 652/652.
- Tarea 10 completa, con la revisión aprobada tras 2 rondas:
  - `caja-service.ts` y `caja-sync.ts` (sin ciclo de imports con sync-manager), tablas SQLite y entidad `caja` en la cola.
  - Limpieza en `personal-data.ts`; `TOOL_CAJA` en la App.
  - `api.ts`: una respuesta 204 se devuelve como `undefined`.
  - Correcciones de la revisión: un borrado mientras sube el create ya no resucita el mensaje (si el DELETE falla, queda en la cola); `refreshFromServer` conserva el estado local de la bolsa.
  - Tests: 678/678. El implementador original se trabó dos veces y la corrección la hizo otro subagente.
- Tarea 11 completa, con la revisión aprobada tras 1 ronda:
  - `caja-animation.tsx` con los tiempos, curvas, geometría y pivotes del prototipo.
  - Corrección: `onRevealed` se dispara una sola vez por apertura, y la limpieza cancela las animaciones.
  - Tests: 685/685.
  - Pendiente: verlo en un dispositivo (el giro de la tapa en react-native-svg no tiene precedente en el repo).
- Tarea 12 completa, con la revisión aprobada:
  - `useCaja`, la tarjeta y las pantallas Caja, CajaWrite y CajaMessages; entrada en el catálogo y rutas.
  - La caja se bloquea mientras se abre, así que un doble toque saca un solo mensaje.
  - Las sorpresas nunca muestran su texto antes de salir.
  - Tests: 704/704.
- Revisión final de toda la 114: "con correcciones". Se aplicó una sola ronda de 8 correcciones y la re-revisión salió limpia (8 de 8):
  - el texto de la sorpresa queda cubierto al devolver el celular;
  - la tarjeta es una capa superpuesta con scrim, sube y crece como en el prototipo;
  - la pantalla se recarga al volver;
  - un ejemplo borrado (400/404) cuenta como éxito;
  - "Abrir otro" usa `playId`;
  - un contador de mutaciones frena las carreras con `refreshFromServer`;
  - ya no puede haber dos grupos "Yo";
  - los borrados fallidos muestran un aviso.
- Cierre:
  - El primer `init.ps1` falló por la complejidad cognitiva de `refreshFromServer` (35, el máximo es 25). Se dividió en 6 helpers y la revisión confirmó que el comportamiento es idéntico.
  - El segundo `init.ps1`: exit 0, tests de Backend y App en verde (App 722) y quality gate en PASS **en modo local**. Docker no respondía, así que la duplicación no se midió.
- **La 114 sigue in_progress** hasta la prueba en dispositivo (plan, Tarea 12, paso 5). Hay que mirar:
  - el giro de la tapa en react-native-svg y la tarjeta superpuesta;
  - que el scrim deja tocar los botones de debajo;
  - el cierre brusco de "Abrir otro" y de Borrar;
  - que "Volver" desde el estado cubierto descarta sin confirmar.
- Además hay que asignar `tool.caja` a una categoría del Home en el plugin Psicoeducación. La 114 requiere una build nueva de EAS.

## Feature 113 `caja_backend` — done (2026-11-12)
- Ruling: se empieza antes que la 111 y la 112 porque la usuaria lo pidió explícitamente. Costo si está mal: reordenar.
- Ejecución con subagentes. Ledger en `.superpowers/sdd/2026-11-10-caja-de-mensajes/progress.md`. Sin commits: cada tarea se revisa como diff entre árboles de git.
- Arranque: `init.ps1` en verde, con exit 0 y el quality gate en PASS. Aviso: el hook pre-push no está instalado en Backend ni en App.
- Tarea 1: `037_caja_mensajes.sql` y 5 tests en `database-migration.test.ts`, de rojo a verde. Suite completa 691/691. Aplicada dos veces en `backend-db-1`: 10 ejemplos y `tool.caja` en free y vip. Revisión aprobada. Ruling: se mantiene `DEFAULT 'aceptado'` en `estado`, porque el servicio siempre pasa el estado explícito; la Tarea 6 lo cubre con un test. Costo si está mal: un pendiente por QR entraría aceptado.
- Tarea 2 completa, con la revisión aprobada:
  - `field-encryption.ts` acepta `keyEnv` (por defecto la clave del plan de seguridad) y exporta `CAJA_KEY_ENV`.
  - Nuevo `rate-limiter.ts` con `createRateLimiter`; `redeem-limiter.ts` delega en él sin cambiar su API.
  - `.env.example` y la documentación de seguridad y de entornos están actualizados.
  - Tests: 698/698, `tsc` limpio.
- Tarea 3 completa, con la revisión aprobada:
  - `caja-input.ts` con `normalizeCajaTexto`, `normalizeCajaNombre`, `sameAutor` y `parseCooldownDays`. Los textos se cuentan en code points.
  - `models/caja.ts` con los tipos de la caja.
  - Tests: 705/705.
- Tarea 4 completa, con la revisión aprobada:
  - `caja-repository.ts` con 19 tests; todo el SQL va parametrizado y filtra por `id_anonimo`.
  - `acceptPendiente` se probó en Docker con ROLLBACK.
  - Tests: 724/724.
  - Ruling: `markMostrado` solo aplica a mensajes aceptados; se corrige dentro de la Tarea 5.
- Tarea 5 completa, con la revisión aprobada:
  - `caja-service.ts` cubre config, listar, crear (cifrado), borrar, borrar por autor, marcar mostrado y ejemplos.
  - `markMostrado` en el repositorio ahora filtra los mensajes aceptados.
  - Tests: 740/740.
- Tarea 6 completa, con la revisión aprobada tras una ronda de corrección:
  - Invitación: el token es aleatorio y solo se guarda su SHA-256. El PNG del QR se genera como en los códigos de canje.
  - Escritura por QR: crea mensajes pendientes sin guardar la cuenta de quien escribe.
  - La revisión encontró que una ráfaga concurrente saltaba los límites. Se corrigió reservando el cupo antes de consultar la base, con un test de 15 envíos simultáneos que deja pasar 10.
  - Tests: 757/757.
  - Quedan 4 detalles menores para la revisión final.
- Tarea 7 completa, con la revisión aprobada:
  - Controlador, rutas `/caja/*` con swagger, admin `/admin/caja/ejemplos`, `TOOL_CAJA`, mock de acceso (R3) y sección 1.6 de `PRIVACY_POLICY.md`.
  - Tests: 770/770, `tsc` limpio.
  - Ruling: la prueba de humo en Docker queda pendiente para la usuaria. Falta `Backend/.env.docker`, y reconstruir la API habría significado copiar secretos reales. Costo: el cifrado no está verificado de punta a punta en la base real.
- Revisión final de toda la 113: "con correcciones". Se aplicó una sola ronda de 6 correcciones y la re-revisión salió limpia:
  - un id mal formado en la ruta respondía 500; ahora responde 404;
  - el test fija la IP real;
  - la documentación swagger de los ejemplos;
  - los errores de Postgres se loggean sin `detail`;
  - el QR se genera antes de invalidar la invitación anterior;
  - la política de privacidad menciona la IP.
- Cierre: `init.ps1` exit 0, quality gate en PASS, Backend 774 tests. **Feature 113 → done (2026-11-12).**
- Pendiente para la usuaria: la prueba de humo en Docker (falta `Backend/.env.docker`) y aprobar el prototipo de la animación.
- Siguiente: la 114 (`caja_app`). La Tarea 11 espera la aprobación de la animación. Hay que sumar `tool.caja` a `SEEDED_KEYS` en `App/__tests__/access-keys.test.ts` y hacer que lea la migración 037. El ledger SDD sigue en `.superpowers/sdd/2026-11-10-caja-de-mensajes/`.
- Prototipo de la animación listo en `docs/prototipos/caja-animacion.html`, pendiente de aprobación por la usuaria (bloquea solo la Tarea 11).
- Ramas: se borraron `claude/vigorous-mestorf-e9497a` (raíz) y `release/kit-notificaciones` local (App y Backend), que estaban integradas. Con el visto bueno de la usuaria también se borraron `upgrade/expo-sdk-57` (último commit `2b0c948`, recuperable desde el reflog) y `origin/release/kit-notificaciones` en App y Backend. En los tres repos quedan solo `development`/`desarrollo` y `main`.

## Diseño en curso: Caja de mensajes (2026-11-10)
- Spec: `docs/superpowers/specs/2026-11-10-caja-de-mensajes-design.md` (aprobada).
- Plan: `docs/superpowers/plans/2026-11-10-caja-de-mensajes.md`, con 15 tareas en tres features, aprobado.
- Método de ejecución elegido por la usuaria (2026-11-12): **subagentes** (`superpowers:subagent-driven-development`), con implementador y revisor por tarea y una revisión de toda la rama al final. Empieza cuando la 111 y la 112 estén `done`.
- `feature_list.json`: 113 a 115 (`caja_backend`, `caja_app`, `caja_qr`) y los adicionales 116 a 120, todos `pending`. Se implementan después de la 112.
- Corrección (2026-11-12): la limpieza de datos locales al cerrar sesión ya existe. El commit `54c142f` de App agregó `personal-data.ts` (`clearPersonalLocalData` y `ensurePersonalDataOwner`). El plan de la caja se ajustó para extender esas funciones (Tarea 10).

## Registro de la serie 109 a 112
- Arranque: `init.ps1` con tests de Backend y App en verde (el quality gate de Docker siguió en segundo plano).
- Ruling: se trabaja la 109 aunque la 43 y la 65 siguen `pending` con id menor. Fue un pedido explícito de la usuaria. Costo si está mal: reordenar.
- Tarea 1 completa:
  - `036_categoria_herramientas.sql` y sus tests en `database-migration.test.ts`, de rojo a verde (47/47).
  - Aplicada dos veces en `backend-db-1` sin error.
  - Datos: relaciones-pareja con el traductor (0) y la línea de tiempo (1); ansiedad (orden 4) con gratitud; 0 features `module.*`.
  - Se aplicó a mano: `schema_migrations` no la registra, y el próximo `migrate` la vuelve a correr sin efecto.
- Tarea 2 completa:
  - Repositorio: `findHomeCategories`, `findToolKeysByCategoryIds`, `replaceCategoryTools(id, keys, client?)`, `en_home` en create y update, y el tipo `Queryable`.
  - Tests de rojo a verde (26/26), `tsc` limpio; SQL de `unnest ... WITH ORDINALITY` probado en Docker con ROLLBACK.
  - Ruling: `createCategory` y `updateCategory` reciben `db: Queryable = pool` al final, para compartir la transacción con el reemplazo de herramientas. Costo si está mal: firmas algo más largas.
- Tarea 3 completa:
  - El servicio valida las herramientas (`INVALID_TOOL_FEATURE`: inexistente, de otro tipo o repetida) y escribe la categoría y sus herramientas en una sola transacción (`inTransaction`).
  - Las lecturas admin devuelven `enHome` y `herramientas`; el controlador pasa `enHome` y `herramientas`.
  - Tests: 13 nuevos en `psychoeducation.test.ts` (68/68 entre los dos archivos).
  - Ruling: no se agregó el test de 403 sin rol de administrador en este archivo, porque ahí `adminMiddleware` está mockeado y ya lo cubren los tests del middleware. Costo si está mal: un test faltante.
  - Ruling: el espía de `pool.connect` se limita a los describe que escriben categorías, porque `pg` usa `connect` dentro de `pool.query` y un espía global colgaba los tests de temas. Costo si está mal: ninguno en producción.
- Tarea 4 completa:
  - Ruta `GET /home/categories` (`routes/home.ts`, con swagger), `getHomeCategories` en el servicio y en el controlador, y la interfaz `IHomeCategory` en el modelo.
  - Tests `home-categories.test.ts` de rojo a verde (8/8).
  - Smoke con la API de Docker reconstruida (`.env.docker`, base local):
    - el Home devuelve relaciones-pareja (2 temas, traductor y línea de tiempo con candado para un anónimo) y ansiedad (0 temas, gratitud libre);
    - `/psychoeducation` (la Biblioteca) no lista ansiedad.
- Cierre de la 109:
  - El primer `init.ps1` falló en `psychoeducation-gating.test.ts` (3 tests), por el automock sin `findToolKeysByCategoryIds` y sin una conexión falsa para la transacción.
  - Arreglado en el setup del test: la conexión falsa solo responde a `connect()` sin callback; con callback pasa al original, que es como lo llama `pool.query`.
  - Backend completo: 639/639. `init.ps1` en verde, quality gate incluido. **Feature 109 `done`.**
- Feature 110 (plugin Psicoeducación 1.0.14), `in_progress`:
  - `admin.js`: `VMP.loadToolFeatures`.
  - `categories.php`: casilla "Mostrar en Home", lista de herramientas con la ayuda y el aviso de la spec, columnas Home y Herramientas, colspan 11. El texto de Acceso ahora dice que bloquea la psicoeducación de la categoría.
  - `categories.js`: estado `selectedTools` ordenado, ↑↓, aviso si no hay temas ni herramientas, y envía `enHome` y `herramientas`.
  - CSS `.vmp-tool-list` y `.vmp-tool-row`; versión 1.0.14 en el encabezado y en `VMP_VERSION`.
  - Ruling: el plugin no tiene tests de JS; se verifica a mano en WordPress local, como dice el plan. Costo si está mal: regresiones del panel sin red automática.
  - Verificación manual en `localhost:8082` (con la sesión del panel `test@vittal.com`):
    - la tabla muestra Home y Herramientas;
    - relaciones-pareja carga marcadas el traductor y la línea de tiempo, en ese orden;
    - ↓ y guardar deja timeline 0 y traductor 1 en la base;
    - en ansiedad, desmarcar todo muestra "No se mostrará nada al abrirla." y al guardar quedan 0 filas;
    - un PUT con `content.vip` devuelve el error de herramientas inválidas.
    - Estado inicial restaurado (traductor 0, línea de tiempo 1; gratitud en ansiedad).
  - ZIP regenerado con .NET ZipFile y rutas con `/`: 15 archivos, los mismos que el ZIP anterior.
  - Observación para la usuaria: la feature `tool.psychoeducation` (tipo herramienta) aparece en la lista. La app no la tiene en el catálogo, así que asignarla no muestra nada.
  - `init.ps1` en verde, quality gate incluido. **Feature 110 `done`.**
- Feature 111 (App), en espera: el plan pide confirmar antes de empezar, porque las features 107 y 108 están `done` pero sin commitear y tocan Home, Herramientas y `use-access-refresh.ts`.

## 2026-11-06: avisos del kit y de profesionales, y plan de release
- Pedido de la usuaria, fuera de `feature_list.json`.
- Kit: aviso "El contenido de este kit es responsabilidad de quien lo llena. Te recomendamos
  completarlo con un profesional de la salud mental." debajo de la intro
  (`SAFETY_PLAN_COPY.responsibilityNotice`, `safety-plan-screen.tsx`).
- Agenda tu cita (lista de profesionales del Home): aviso de que los números son para un proceso
  terapéutico, no para crisis ni riesgo suicida, y que para eso están los números del Botón de Pánico.
- Tests: uno nuevo en `safety-plan-screen.test.tsx` y `professionals-screen.test.tsx` (nuevo); de rojo
  a verde, `tsc` limpio.
- Plan de release selectivo a `main` (kit y notificaciones, sin accesos):
  `docs/superpowers/plans/2026-11-06-release-kit-notificaciones-main.md`.
- La usuaria eligió el release selectivo. Tareas 1 y 2 del plan hechas en worktrees
  (`..\VittalMind-release\{Backend,App}`, rama `release/kit-notificaciones`), con
  `cherry-pick --no-commit`. Sin commits. Backend 271/271 y App 444/444, `tsc` y lint sin errores.
  Detalle en §0 del plan.
- Ruling: los worktrees están fuera del repo para no tocar los cambios sin commitear de
  `desarrollo`. Costo si está mal: borrarlos con `git worktree remove`.
- 2026-11-07:
  - App de release en Expo SDK 58 (sin `expo-camera`) y versión 0.4.0: `tsc`, lint, 444/444 y
    `expo-doctor` en verde.
  - Claves en `docs/secretos/produccion.local.md`; `docs/secretos/` ignorado en `.gitignore` y en
    `.gitleaks.toml`.
  - Guía `docs/credenciales-push.md`.
  - Ruling: se generaron también claves de desarrollo distintas; el aviso de no cambiar la del
    `.env` local si ya tiene kits está en el archivo. Costo si está mal: ninguno, son opcionales.
- 2026-11-07 (2):
  - La usuaria trajo `google-services.json` (proyecto 220224673708, paquete `com.vittalmind.app`) y
    subió la clave FCM V1 a expo.dev.
  - El archivo queda ignorado en los `.gitignore` de las dos copias de la App.
  - `app.config.js` (release) declara `googleServicesFile` desde `GOOGLE_SERVICES_JSON` o el
    archivo local. `expo config` resuelve bien en los dos casos y `expo-doctor` pasa 20/20.
  - Falta crear la variable en EAS, que hoy no tiene ninguna en production.
- 2026-11-07 (3), a pedido de la usuaria (commit y push autorizados):
  - Backend `desarrollo`: `c566a39` (035 Esencial y cuenta del solicitante), `81a79f9` (feature 109).
  - App `desarrollo`: `e97a7ab` (avisos), `7f9ca10` (google-services fuera de git), `6f5a835` (107 y 108).
  - Raíz `development`: `d916107` (docs/secretos), `b042d66` (plugins), `5ab4244` (docs).
  - Push de las tres ramas.
  - EAS: variable secreta de archivo `GOOGLE_SERVICES_JSON` en production.
  - Ramas de release commiteadas y subidas: Backend `d85db96`, App `7ee8e60`
    (`eas.json` production con `environment: production`). Los worktrees se borraron y las copias
    `App/` y `Backend/` quedaron en `release/kit-notificaciones` para el gate.
  - Guía de iOS completada en `docs/credenciales-push.md`. La llave de `DataConf/` es de la API de
    App Store Connect y no sirve para APNs.
- 2026-11-07 (4):
  - Primer gate bloqueado por gitleaks (google-services.json local y claves de prueba) y por `uuid`
    10.0.0 (HIGH). Corregido: raíz `.gitleaks.toml`; Backend `aea0ceb` (claves de prueba con
    `gitleaks:allow`) y `69e3c68` (uuid 11.1.1, sin `@types/uuid`).
  - Segundo gate en curso: quality-lite PASS, gitleaks limpio, OSV sin HIGH.
  - `.env` de producción en `docs/secretos/.env.production` (ignorado). Falta la clave nueva de
    OpenRouter.
  - `main` de App y Backend avanzado en local por fast-forward a la release (mismo árbol), **sin
    push**: el push espera el PASS del gate.
  - `desarrollo` del Backend sigue con `uuid` 10.0.0; se corrige al traer `main`.
- 2026-11-07 (5), pedido antes de compilar:
  - App `main` `a102682`: el kit es la primera opción de Cuenta.
  - La tarjeta de crisis del kit cambia los números fijos 106 y 123 por un botón que abre el mismo
    `PanicModal` que el Botón de Pánico (`usePanic`, país detectado o elegido).
  - Los ejemplos del Paso 5 ya no usan números de Colombia.
  - Tests de rojo a verde; 444/444, `tsc` y lint sin errores.
  - Gate relanzado sobre `main` (tercera corrida); push de `main` pendiente del PASS.
  - Hay que llevar `a102682` a `desarrollo` cuando se traiga `main`.
- 2026-11-07 (6), tercer gate:
  - quality-lite PASS, security PASS, Sonar App PASS.
  - **Sonar Backend FAIL**: cobertura del código nuevo 68,4 % con umbral de 80 %. En `desarrollo`
    el código de accesos, muy testeado, compensaba.
  - Backend `main` `5aca4fe`: 41 tests nuevos (repositorio de notificaciones, repositorio del kit,
    cliente push, middleware interno, logger, generadores y controlador del tick). 312/312, y la
    cobertura de líneas de los archivos del release queda en alrededor del 93 %.
  - Cuarta corrida del gate: **todo PASS** (quality-lite, security, Sonar Backend y Sonar App).
    No se escribió `release-pass.json` porque `app.json` tenía el `versionCode` 14 de la build de
    EAS sin commitear; se commiteó después en App `main`.
  - Push de `main`, autorizado por la usuaria: Backend `7456cd6..5aca4fe`, App `a91d041..01b9f88`.
  - 2026-11-08: `main` traído a `desarrollo` y subido (Backend `152d17a`, App `e62beeb`).
    - Conflictos por cherry-picks: se conservó `desarrollo` y se reaplicó lo nuevo de `main`.
    - Backend: uuid 11, tests adaptados a avisos de acceso y vencimientos, y
      `database-migration.test` normaliza CRLF. 680/680.
    - App: crisis por país, `app.config.js`, `eas.json`, 0.4.0 y `versionCode` 14. Se quitó un kit
      duplicado en Perfil, porque `desarrollo` ya lo tenía primero. 594/594.
    - `init.ps1` en verde.
  - Play rechazó la prueba (versionCode 14) por "Ubicación aproximada" no declarada en Seguridad
    de los datos. Se recomendó declararla (sin build nueva); `ACCESS_FINE_LOCATION` no se usa y
    puede quitarse en la próxima build.

## 2026-11-10: correcciones pedidas antes de la 111 y la 112
- Orden acordado: texto del bono, planes que no se ven en Perfil, feature 111, feature 112.
- Texto del bono, fuera de `feature_list.json`:
  - La app redime en la pestaña **Perfil**, pero la tarjeta (`admin/js/codes.js`) y `/canjear`
    (`public/canjear.php`) decían "Entra a Cuenta y toca Redimir.". Ahora dicen "Entra a Perfil y
    toca Redimir.".
  - VM Accesos pasa a 1.3.3 (encabezado y `VMA_VERSION`); ZIP regenerado con .NET ZipFile, con los
    mismos 20 archivos que el anterior.
  - Verificado en `localhost:8082`: `/canjear` muestra el texto nuevo y la tarjeta del código
    `super-garu` también, con `codes.js?ver=1.3.3`.
  - `init.ps1` en verde, quality gate PASS.
- Planes que no se ven en Perfil de la app:
  - Reproducción: un segundo plan (`vm-amor-eterno`, manual) para `test@vittal.com` en Docker.
    `GET /access` devolvía bien los dos planes y `AccessStatusCard` los listaba.
  - Causa: el aviso legal y "Cerrar sesión" estaban fijos fuera del `ScrollView`. Con el aviso de
    vencimiento y la tarjeta de planes, en un teléfono (360x740) el área con scroll quedaba tan
    baja que el segundo plan salía cortado y, sin barra de scroll, no parecía haber más.
  - Arreglo (`profile-screen.tsx`): el aviso legal y "Cerrar sesión" pasan al final del
    `ScrollView`, con `flexGrow: 1` para que sigan abajo cuando el contenido es corto.
  - Ruling: se revierte la decisión de la sesión del kit ("menú dentro de ScrollView para no
    empujar disclaimer/logout"), tomada antes de la tarjeta de planes. Su test se cambió por el
    contrario. Costo si está mal: "Cerrar sesión" exige desplazarse en pantallas chicas.
  - Verificado con Expo web a 360x740: se ven los dos planes, Redimir, el menú, el aviso y
    "Cerrar sesión". Se borró el plan de prueba (id 93) de la base local.
  - Test de rojo a verde (9/9), `tsc` limpio, `init.ps1` en verde con quality gate PASS.
  - Falta probarlo en un teléfono real (build de desarrollo).
- Feature 111 (`category_tools_app`), `in_progress` desde el 2026-11-10. La 107 y la 108 ya están
  commiteadas (`6f5a835`), que era la condición del plan.
  - Tarea 6 completa: `constants/tool-catalog.ts` (`TOOL_CATALOG`, `getKnownTools`), `types/home.ts`,
    `services/home-service.ts`, la tabla de caché `home_categories` y `hooks/use-home-categories.ts`.
    `home-categories.test.tsx` de rojo a verde (6/6).
  - Ruling: el hook usa su propia constante de un minuto (`HOME_CATEGORIES_MAX_AGE_MS`) en lugar de
    importar `ACCESS_STALE_MS` del contexto, para no cargar el contexto de acceso en el servicio.
    Costo si está mal: dos constantes que hay que mantener iguales.
  - Tarea 7 completa:
    - `screens/category-screen.tsx` (ruta `Category: { slug }`): tarjeta Psicoeducación si hay temas
      (candado con `accesoFeatureKey`) y las herramientas de la categoría, con candados de
      `isFeatureLocked` y no de los `locked` de la respuesta. Sin categoría: "No encontramos esta
      categoría." y botón Volver.
    - Home: categorías de la API en su orden, subtítulo "N actividades" (herramientas conocidas + 1
      si hay temas), sin candado de módulo y con "No pudimos cargar los módulos. Revisa tu conexión.".
    - Herramientas: todo `TOOL_CATALOG`, sin módulos ni `route.params.module`; `Tools: undefined` y
      sin el `tabPress` que limpiaba el parámetro.
    - Componente `components/tool-card.tsx` y hook `hooks/use-open-tool.ts`, compartidos por
      Herramientas y Categoría.
    - Fuera `module.*` y `MODULE_FEATURE_BY_ID`. `access-keys.test` compara el seed 026 menos lo que
      borra la 036; `FREE_FEATURES` y los tests de contexto, tema y accesos ajustados.
    - Tests: `category-screen.test.tsx` (11), `home-screen-categories.test.tsx` (8) y uno nuevo en
      `access-ui.test.tsx`. App 616/616, `tsc` limpio.
  - Ruling: el invitado que toca una herramienta con `requiresAuth` ve el aviso de iniciar sesión
    antes que el candado (punto 5 del plan). Antes, en Herramientas, una herramienta bloqueada lo
    mandaba a Solicitar acceso. Costo si está mal: el invitado no llega a la solicitud desde ahí.
  - Verificación con Expo web contra el backend de Docker (360x740):
    - el Home muestra el kit de pareja (3 actividades) y Ansiedad (1);
    - pareja abre Psicoeducación (2 temas, navega a `PsychoeducationHome`), el Traductor y la Línea
      del Tiempo; Ansiedad, solo Gratitud; "← Volver" regresa al Home;
    - Herramientas lista las tres sin encabezados;
    - con el plan Power Ranger revocado a mano: candado en el Traductor y la Línea del Tiempo, y el
      toque lleva a Solicitar acceso. Plan restaurado.
    - En web, `expo-sqlite` no responde y la caché se queda esperando; a la Biblioteca le pasa
      igual desde antes. Para mirar las pantallas se saltó la caché solo en web con un cambio
      temporal, que se quitó. La caché sin conexión queda cubierta por los tests.
  - `init.ps1` en verde, quality gate PASS. **Feature 111 `done`.**
  - Para publicar: build nueva de EAS, y en Supabase aplicar la 036 y marcar `en_home` en las
    categorías del Home (spec, sección 9). Falta probarla en un teléfono.
- Feature 112 (`plans_matrix_default_locked`), 2026-11-10:
  - `admin/js/plans.js`: en la matriz, las features guardadas del plan default salen marcadas,
    deshabilitadas y con fondo gris en las columnas de los demás planes, con el título "Incluida en
    Esencial, el plan de todas las personas". La columna del default sigue editable.
  - Guardar una columna no envía las casillas fijas tal como se ven: conserva lo que ese plan ya
    tenía guardado de esas features (ni las agrega ni las quita). `applySelections` salta las
    casillas fijas para no desmarcarlas al recargar.
  - Texto de ayuda de la matriz (`pages/plans.php`) y estilo `.vma-cell-inherited` en `admin.css`.
  - Sin cambios en el backend: `/access` ya suma las features del default a todas las cuentas.
  - Ruling: las casillas fijas usan lo guardado del default, no sus casillas sin guardar. Costo si
    está mal: hasta guardar Esencial, el resto de columnas no refleja su cambio (lo dice la ayuda).
  - VM Accesos 1.3.4; ZIP regenerado, 20 archivos.
  - Verificado en `localhost:8082`:
    - 18 casillas fijas (psicoeducación y gratitud en los 9 planes no default), `plans.js?ver=1.3.4`;
    - guardar Power Ranger sin cambios no le agrega las features de Esencial;
    - en VIP, que las tenía guardadas, quitar Línea del Tiempo y guardar solo quita esa. Restaurada.
  - `init.ps1` en verde, quality gate PASS. **Feature 112 `done`.**
- 2026-11-10, pedido de la usuaria (fuera de `feature_list.json`): datos de la línea del tiempo y
  del círculo de gratitud al cerrar sesión. Es el hallazgo anotado arriba, en "Diseño en curso".
  - Problema: `logout` solo borraba el kit. Las filas de `timeline_events` y `gratitude_entries`, la
    racha y sus ops en `pending_ops` quedaban en el teléfono. La siguiente cuenta las veía y, peor,
    su cola las subía a esa cuenta.
  - `services/personal-data.ts`:
    - `clearPersonalLocalData()` borra las filas, las ops `timeline` y `gratitude`, la racha y el dueño;
    - `ensurePersonalDataOwner()` guarda el `idAnonimo` dueño en `app_config` y borra los datos si son
      de otra cuenta (la sesión venció y entró otra persona sin cerrar sesión); sin dueño guardado
      (datos de una versión anterior) los adopta;
    - `hasPendingPersonalOps()`.
  - `use-auth.ts`: `logout` borra estos datos después de `syncBeforeLogout`, y con sesión se llama a
    `ensurePersonalDataOwner`. `flushPendingOps` también lo llama antes de leer la cola.
  - Perfil: al cerrar sesión, si quedan cambios sin subir, se avisa que sin conexión se perderán. Se
    junta con el aviso del kit.
  - Tests: `personal-data.test.ts` (8), 3 en `use-auth-logout`, 1 en `sync-manager` y 3 en Perfil, de
    rojo a verde. Se simula `personal-data` en los tests de sincronización. App 631/631, `tsc` limpio.
  - Ruling: los datos sin dueño guardado se asignan a la sesión actual, para no perder los cambios
    pendientes de quien actualiza la app. Costo si está mal: si al actualizar ya había datos de otra
    cuenta, se quedan una vez más.
  - Ruling: el progreso de lectura y los favoritos de psicoeducación no se borran (son del
    dispositivo y no se suben). Costo si está mal: la siguiente cuenta ve qué temas se leyeron.
  - `init.ps1` en verde, quality gate PASS. Falta probarlo en un teléfono.
- 2026-11-10, reporte de la usuaria: con las cuentas de Idel Labs y `test@vittal.com` vio la misma
  línea del tiempo.
  - La base local de Docker no tiene ninguna cuenta de Idel Labs, así que la prueba fue contra otro
    backend (producción, build 0.4.0 de `main`). Esa build no tiene el borrado al cerrar sesión, que
    está sin commitear en `desarrollo`: lo que vio es el error ya corregido.
  - El backend filtra todas las consultas de `timeline_events` por `id_anonimo`; además
    `client_uuid` es único, así que una op heredada que se suba a otra cuenta falla en el INSERT y
    no copia el evento. Lo visto eran filas locales del teléfono.
  - No se consultó la base de producción. Se intentó un conteo de solo lectura, a pedido de la
    usuaria, y no conectó (el host directo de Supabase no resuelve desde aquí); la usuaria aclaró
    que probó contra Docker.
  - Docker tiene solo dos cuentas: `test@vittal.com` (7 eventos en el servidor) y `sug***@gmail.com`
    (1). Ninguna tiene "idel" en el correo ni en el nombre. Cada una tiene sus propios eventos.
  - Causa probable: si la cuenta anterior cerró sesión con la versión vieja, sus filas quedaron sin
    dueño y `ensurePersonalDataOwner` se las asignaba a la cuenta siguiente.
  - Arreglo: sin dueño guardado se borran las filas ya subidas (`synced = 1`) de la línea del tiempo
    y la gratitud, porque el servidor las vuelve a enviar; solo se conservan las no subidas. Test
    de rojo a verde (`personal-data.test.ts`, 8/8).
  - Segunda cuenta local `test2@vittal.com` (plan `vip` manual), documentada en
    `docs/entorno-pruebas.md`.
- Botón "← Volver" en la línea del tiempo (`timeline-screen.tsx`), con el mismo estilo que el
  Círculo de Gratitud. `timeline-screen.test.tsx` (nuevo) de rojo a verde. `init.ps1` en verde.
- 2026-11-11, commits y gate para el paso a `main` (pedido de la usuaria):
  - App `desarrollo`: `ce8d0d6` (scroll de Perfil), `c98e135` (111), `54c142f` (borrado de datos al
    cerrar sesión), `ca3d609` (Volver en la línea del tiempo).
  - Raíz `development`: `7f3ca7a` (VM Accesos 1.3.4), `1dec879` (docs).
  - Primer `quality-release`: Sonar Backend FAIL por 3 hotspots S2077 en los UPDATE dinámicos de
    `psychoeducation-repository.ts` (no inyectables: claves fijas de los controladores). Reescritos
    como SQL literal con `$2::jsonb ? 'campo'`; tests de rojo a verde, SQL probado en Docker con
    ROLLBACK. Backend `43b4b17`, 684/684.
  - Segundo `quality-release`: **PASS** (quality-lite, security, Sonar Backend y Sonar App).
    `release-pass.json` coincide con los árboles de App (`ca3d609`) y Backend (`43b4b17`), y `main`
    es ancestro de `desarrollo` en los dos (fast-forward).
  - Sin push ni merge: espera la decisión de la usuaria.
  - El paso a `main` trae todo el sistema de accesos y las migraciones 026 y 029 a 036. Antes de
    desplegar: respaldo de Supabase, borrar `dist/` en Hostinger, plugins VM Accesos 1.3.4 y
    Psicoeducación 1.0.14, marcar `en_home` y build nueva de EAS.
- Ruling: el refactor de `processJob` (dispatcher) no viaja porque estaba mezclado con los avisos de
  acceso. Costo si está mal: un aviso de complejidad en Sonar sobre ese archivo.

## Qué se ha hecho
- 2026-11-03: commits de la serie a petición del usuario (sin push).
  - Backend `desarrollo`: `0306234` chore(quality), `dbcee60` feat(access).
  - App `desarrollo`: `9fc9665` chore(quality), `bac6fab` feat(access).
  - Raíz `development`: `c2fc3ba` chore(quality), `c94ff5b` feat(plugins), `b7ec6ca` docs(access).
- 2026-11-03: `quality-release` completo. Resultado:
  - quality-lite PASS (Backend 19 avisos, dup 2,05%; App 20 avisos, dup 9,38%).
  - Semgrep 0 hallazgos. Trivy: dependencias limpias; 2 Dockerfiles como root corregidos con `USER node` (Backend `370a0df`, raíz `b47969e`), API local verificada.
  - Gitleaks: falso positivo `PENDING_KEY` marcado (App `bae18bd`). **Bloqueante real**: `Backend/.env.docker` versionado con una clave real de OpenRouter desde `778b384` (ya en GitHub).
  - Sonar App PASS. Sonar Backend FAIL solo por 24 hotspots sin revisar (23 S2077 en `access-repository.ts`, todos con constantes y `$n`; 1 S5122 CORS abierto con Bearer). Revisados como seguros, falta marcarlos en el panel (el usuario).

- 2026-11-04: a petición del usuario, limpieza de Sonar en Backend sin marcar hotspots a mano:
  - `access-repository.ts`: todas las consultas son literales completos. UPDATE parcial de planes y
    features con un JSON de cambios (`$2::jsonb ? 'campo'`); listados de usuarios y solicitudes con
    filtros opcionales (`$n IS NULL OR ...`) y página + total en una sola consulta (CTE + LATERAL).
    `insertGrant` recibe un objeto (`IGrantWrite`) en lugar de 8 parámetros.
  - Complejidad: `processJob` (dispatcher), `getTopicContent`, `createEntry` (gratitud) y
    `updatePreferences` divididos en funciones pequeñas. Aserciones innecesarias e import duplicado fuera.
  - Verificado: tsc, 602 tests, ESLint sin avisos nuevos; smoke contra Postgres local (24 checks de
    accesos, 6 llamadas de temas con y sin sesión).
  - El hotspot de CORS (`app.ts`) queda para marcarlo como seguro: la API usa Bearer, sin cookies.

## Pendiente
- Rotar la clave de OpenRouter y sacar el valor de `Backend/.env.docker` (decisión del usuario).
- Marcar los hotspots del Backend en Sonar y relanzar `quality-release` completo para obtener `release-pass.json`.
- `security-auditor` sobre la serie.
- Producción de avisos: cron del tick y de `/internal/access/expire`, `INTERNAL_NOTIFICATION_TOKEN`, FCM y APNs, SMTP en WordPress.
- Respaldo de Supabase y migraciones 029 a 034.
- Build con EAS y prueba en teléfono: cámara, permisos, enlace desde `/canjear`, diálogo de invitado, `FeatureRequiredNotice`, cola offline con 403, varios planes en Perfil, aviso de vencimiento, solicitud desde la app, Biblioteca con candado, categoría bloqueada, acceso sin conexión, purga al abrir, aviso de código revocado, push de acceso e interruptor de avisos.
- Alinear versiones de parche de Expo antes del build.
- Confirmar si producción corre detrás de un proxy y fijar `TRUST_PROXY_HOPS`.
- Confirmar que `www.vittaminds.com` es el WordPress del plugin y configurar los enlaces de tiendas, antes de imprimir bonos.
- Revisión de fase de la 99: si `DELETE /timeline*` queda libre al perder el plan; textos del aviso.
- Probar la impresión real de la tarjeta.

---

## Sesión anterior sin cerrar (gate de calidad en Docker)

## Estado
- **Tarea**: gate de calidad en Docker (harness), a petición del usuario. No es una feature de `feature_list.json`.
- **Inicio**: 2026-10-28
- **Estado**: implementado y verificado en local; pendiente de validación de SonarQube por el usuario.

## Qué se ha hecho

### Fase 0 — Base del lint (estaba roto)
- `Backend/eslint.config.mjs` y `App/eslint.config.mjs` (ESLint 9 flat config + typescript-eslint + sonarjs).
- devDeps añadidas en ambos repos (`typescript-eslint@8.72.1`, `eslint-plugin-sonarjs@4.2.2`).
- Limpieza de la deuda que bloqueaba el gate: 14 `any`, imports/variables sin usar, `catch (err)` muertos, regex con backtracking (ReDoS) en `access-input.ts` y `profile-service.ts`, `expiresIn as any` en `jwt.ts`.
- Refactor de `flushPendingOps` en `App/src/services/sync-manager.ts` (complejidad 49 -> extraídos `pushPendingOp` y `recordFailedOp`).
- Bug preexistente corregido: `Backend/src/routes/index.ts` exportaba `safetyPlanRouter` dos veces (rompía `tsc`).

### Fase 1 — quality-lite en Docker
- `scripts/quality/Dockerfile`, `scripts/quality/run-quality.mjs`, `docker-compose.quality-tools.yml` (perfil `quality`).
- `scripts/quality-check-docker.ps1` / `.sh` y `scripts/quality-check.ps1` / `.sh` (autodetección Docker -> local).
- Reportes en `quality-reports/QUALITY_<timestamp>.md` y `.json` (gitignored).
- `init.ps1` / `init.sh`: el quality check ahora es **bloqueante**.

### Fase 2 — SonarQube para release
- Perfil `release` en el compose: `sonarqube:lts-community` + `postgres:16-alpine` + `sonar-scanner-cli`.
- `Backend/sonar-project.properties`, `App/sonar-project.properties` (deben commitearse en cada repo).
- `scripts/quality-release.ps1` / `.sh`: quality-lite -> security scan -> Sonar -> Quality Gate -> `quality-reports/RELEASE_<timestamp>.md`.
- Token en `.env.sonar` (gitignored, con `.env.sonar.example`).

### Fase 3 — Documentación
- `docs/quality-tools-docker.md` (nuevo).
- Actualizados: `docs/quality-gate.md`, `docs/verification.md`, `docs/entornos-dev-produccion.md` (paso 4 del release), `AGENTS.md`, `CHECKPOINTS.md` (C4), `.agents/agents/sonar-verifier.md` y `.claude/agents/sonar-verifier.md`.

## Evidencia
- `Backend`: `tsc --noEmit` 0 errores, ESLint 0 errores / 16 avisos, duplicación 1,97%, 359 tests OK.
- `App`: `tsc --noEmit` 0 errores, ESLint 0 errores / 20 avisos, duplicación 11,13%, 217 tests OK.
- `scripts/quality-check-docker.ps1` -> **PASS** (reporte generado en `quality-reports/`).

## Pendiente
1. Validar `.\scripts\quality-release.ps1` con SonarQube (lo lanza el usuario; el arranque es lento).
2. Ejecutar `.\init.ps1` completo tras el pull de imágenes de seguridad.
3. Commitear por separado en los 3 repos: raíz (harness), `Backend/` (eslint config, sonar properties, fixes) y `App/` (eslint config, sonar properties, fixes).
4. Mover este resumen a `progress/history.md` al cerrar.
