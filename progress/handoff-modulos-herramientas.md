# Handoff: módulos y herramientas en base de datos

> Resumen para abrir un chat nuevo. Fecha: 2026-11-05. Léelo junto con `AGENTS.md`,
> `CLAUDE.md`, `feature_list.json` y `progress/current.md`.

## Qué pidió la usuaria (textual en lo esencial)

1. **Pasar los módulos a la base de datos** con relación **muchos a muchos** con las herramientas:
   un módulo tiene una o varias herramientas y una herramienta puede estar en uno o varios módulos.
2. **Pantalla Herramientas** de la app: lista todas las herramientas, **sin** decir a qué módulo pertenecen.
3. **Home** de la app: al tocar un módulo, muestra las herramientas que tiene asociadas.
4. **Gestionar módulos desde un plugin**: el orden de los módulos y su icono se configuran en
   WordPress. Sugerencia de la usuaria: el plugin **VM Accesos**, para no complicarse.
5. **Candados**: la usuaria cree que es mejor **no poner candado a los módulos**, solo a las
   herramientas y al contenido. Está abierta a sugerencias.

### Origen del pedido
En la matriz de Planes (VM Accesos) un plan podía tener `module.parejas` sin el traductor, y lo
que trae Esencial (plan default) se podía desmarcar en otros planes aunque igual se recibe. La
usuaria quería:
- que **marcar un módulo marque sus herramientas**, sin poder desmarcarlas;
- que lo que trae **Esencial** aparezca marcado y fijo en los demás planes.

Antes de este último mensaje se había propuesto: relación en BD (migración 036), el servidor suma
las herramientas del módulo al acceso efectivo y la matriz muestra casillas fijas "por el módulo X"
o "por Esencial". La usuaria aceptó pasar los módulos a la BD, pero **cambió el diseño** con los
puntos 1 a 5 de arriba. **El rediseño no está implementado. Falta plan y aprobación.**

## Cómo está hoy

### App (`App/`)
- Relación fija en código. `src/screens/tools-screen.tsx`:
  - `TOOLS_BY_MODULE`: `parejas` contiene `cnv_translator` y `timeline`; `ansiedad` contiene `gratitude`.
  - También `MODULES_ORDER` y `MODULE_META` (título, subtítulo, breadcrumb).
- `src/constants/access-keys.ts`:
  - `ACCESS_FEATURES`: `module.parejas`, `module.ansiedad`, `tool.cnv_translator`,
    `tool.timeline`, `tool.gratitude`, `tool.psychoeducation`, `content.vip`.
  - `MODULE_FEATURE_BY_ID`: lo usa `home-screen.tsx` para el candado de cada módulo.
- Cada herramienta se bloquea por su propia clave (`isFeatureLocked(tool.featureKey)`).
- El acceso se refresca así:
  - al entrar a una pantalla, si el dato tiene más de 60 s (`ACCESS_STALE_MS`, `useRefreshAccessOnFocus`);
  - al volver a la app;
  - tras un 403 `FEATURE_REQUIRED`.
- `tool.psychoeducation` no pertenece a ningún módulo.

### Backend (`Backend/`)
- Las features viven en `acceso_features` (tipos `contenido`, `modulo`, `herramienta`). La
  relación plan-feature está en `plan_features`.
- El acceso efectivo une las features de los planes vigentes y las del plan default (Esencial).
  Ver `access-service.ts` (`getEffectiveAccess`) y `psychoeducation-gating.ts` (`resolveFeatures`).
- `requireFeature` protege las rutas: el traductor responde 403 sin `tool.cnv_translator`.
- Migraciones: última versionada 034; **035 (`035_plan_copy_esencial.sql`) existe sin commitear**,
  la hizo otra sesión. La próxima libre es **036**.
- Todas las consultas de `access-repository.ts` son literales, sin `${}`, para no generar
  hotspots S2077 en Sonar. **Mantener ese estilo.**

### Plugins
- **VM Accesos** (`plugins/vittalmind-accesos`, 1.3.2 sin commitear) tiene las páginas Usuarios,
  Solicitudes, Códigos, Planes (matriz) y Features.
  - La matriz marca columnas sin guardar con "Guardar *" y conserva las casillas al recargar.
  - El formulario de Features explica cada tipo.
- **Psicoeducación** (1.0.13 sin commitear) tiene un selector de iconos reutilizable:
  `admin/js/icon-picker.js`, para los iconos de categorías.

## Sugerencias para el diseño (para discutir con la usuaria)
1. **Sin candado en módulos.** Es coherente con el servidor: hoy nada del backend se protege con
   `module.*`, solo herramientas y contenido. El módulo funciona como agrupador visual. Dentro del
   módulo, cada herramienta muestra su candado si el plan no la incluye.
2. **Modelo propuesto:**
   - tabla `modulos`: `id`/`slug`, `titulo`, `subtitulo`, `icono`, `orden`, `activo`;
   - tabla `modulo_herramientas`: módulo ↔ `feature_key` de tipo herramienta, con `orden` dentro
     del módulo;
   - la migración siembra lo actual: parejas con el traductor y la línea de tiempo; ansiedad con
     gratitud.
3. **API pública** `GET /modules`, para la app: módulos activos con sus herramientas. La app la
   guarda en caché para usarla sin conexión, igual que el acceso.
4. **Compatibilidad con apps viejas:**
   - Las versiones publicadas usan `module.parejas` y `module.ansiedad` para el candado del Home y
     tienen la lista fija. **No borrar esas features** ni quitarlas de los planes.
   - Una opción: dejarlas marcadas en todos los planes mientras haya apps viejas.
   - La app nueva necesita **build nueva** (EAS) para leer los módulos desde la API.
5. **Matriz de planes:**
   - Si los módulos dejan de dar acceso, sus filas pueden ocultarse o mostrarse como "solo apps
     antiguas".
   - La regla "lo que trae Esencial aparece marcado y fijo en los otros planes" sigue siendo útil
     y es independiente del rediseño.
   - La idea de "marcar módulo = marcar herramientas" puede convertirse en un atajo opcional: un
     botón "marcar las herramientas del módulo X" en la columna del plan.
6. **Plugin:** página nueva "Módulos" en VM Accesos, con nombre, subtítulo, icono, orden, activo
   y herramientas (multiselección de features tipo herramienta). Para el icono, reutilizar el
   picker de psicoeducación (copiarlo con prefijo `VMA`, no compartir el archivo).

## Decisiones abiertas para preguntar
- ¿Confirmar que los módulos no tienen candado?
- Si todas las herramientas de un módulo están bloqueadas, ¿el módulo se ve igual?
- ¿Qué hacer con `module.parejas` y `module.ansiedad` en la matriz y en apps viejas?
- ¿El Home muestra solo módulos activos? ¿El orden y el icono vienen 100% del plugin?
- ¿Mantener "Esencial marcado y fijo en los demás planes" como parte de este trabajo?

## Estado del repo al cerrar este chat
- Rama raíz `development`, Backend y App en `desarrollo`, todas pusheadas hasta:
  - raíz `ce5017a`;
  - Backend `d52a0a6`;
  - App `bae18bd`.
- **Sin commitear (esta sesión):** VM Accesos 1.3.2 y Psicoeducación 1.0.13, con ZIPs.
  - Columna "Cuenta que recibe el plan" en Solicitudes.
  - Matriz con aviso de cambios sin guardar.
  - Ayudas sobre el tipo Contenido.
  - Backend: `cuentaEmail` en las solicitudes del panel (`models/access.ts`,
    `access-repository.ts`, tests).
  - `init.ps1` verde con esos cambios.
  - La usuaria no respondió todavía si hacer commit y push.
- **Sin commitear (otra sesión, features 107 y 108):**
  - App: Perfil, Home, Herramientas, `use-access-refresh.ts`, etc.;
  - Backend: `035_plan_copy_esencial.sql`;
  - `feature_list.json`.
  - Revisar `progress/history.md` antes de mezclar commits.
- **Datos locales de prueba:**
  - `test@vittal.com` tiene `vm-amor-eterno` (`power-ranger` revocado);
  - Ema (`sugrinblandos@gmail.com`) tiene `power-ranger`;
  - la solicitud #9 de test sigue pendiente;
  - la feature `mn-jj` es de tipo módulo y no está en ningún plan.

## Pendientes generales (no de este trabajo)
- Rotar la clave de OpenRouter. Ya no se versiona `Backend/.env.docker`, pero sigue en el
  historial de GitHub.
- Producción:
  - respaldo de Supabase;
  - migraciones 029 a 035 (más la 036 si se hace esto);
  - `TRUST_PROXY_HOPS`;
  - crons de avisos y vencimientos;
  - `INTERNAL_NOTIFICATION_TOKEN`;
  - FCM/APNs;
  - SMTP en WordPress.
- Gate completo `.\scripts\quality-release.ps1` en PASS antes de `main`. Instalar el hook con
  `.\scripts\install-hooks.ps1`.

## Reglas que el chat nuevo debe respetar
- Una feature a la vez. `done` solo con `.\init.ps1` verde. Documentar en `progress/current.md`
  mientras se trabaja.
- **No hacer commit sin que la usuaria lo pida.**
- `Backend/.env` apunta a **Supabase de producción**: nunca correr `npm run migrate` con él. Las
  migraciones se prueban en el Postgres de Docker (`backend-db-1`).
- Credenciales locales de prueba en `docs/entorno-pruebas.md`.
- WordPress local en `http://localhost:8082`.
