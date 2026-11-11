# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a history.md.
> Mientras trabajas, **manténlo actualizado en tiempo real**, no al final.

## Estado
- **Tarea**: feature 109 (`category_tools_backend`), primera de la serie 109 a 112: categorías como módulos con herramientas.
- **Inicio**: 2026-11-04.
- **Estado**: in_progress.
- **Plan breve**: `docs/superpowers/plans/2026-11-04-categorias-herramientas.md`, Feature A (Tareas 1 a 4). Spec en `docs/superpowers/specs/2026-11-04-categorias-herramientas-design.md`. Ejecución nativa, sin commits.

## Diseño en curso: Caja de mensajes (2026-11-10)
- Spec: `docs/superpowers/specs/2026-11-10-caja-de-mensajes-design.md` (aprobada).
- Plan: `docs/superpowers/plans/2026-11-10-caja-de-mensajes.md`, con 15 tareas en tres features, pendiente de revisión por la usuaria.
- `feature_list.json`: 113 a 115 (`caja_backend`, `caja_app`, `caja_qr`) y los adicionales 116 a 120, todos `pending`. Se implementan después de la 112.
- Hallazgo: `logout` (`use-auth.ts`) solo limpia el plan de seguridad. Los datos locales de gratitud y de la línea del tiempo quedan en el celular para la siguiente cuenta. El plan lo resuelve para la caja (Tarea 10); para el resto queda fuera de alcance.

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
