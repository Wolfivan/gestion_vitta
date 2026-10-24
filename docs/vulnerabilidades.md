


## FASE 0 ejecutada (read-only) Ã¢â‚¬â€ 2025-10-07

### 1) Lockfiles detectados
- Backend/package-lock.json (npm)
- App/package-lock.json (npm, Expo)
- package-lock.json (npm, raÃƒÂ­z)

### 2) package.json relevantes
- **Backend:** express@^4.21.2, glob@^10.4.5, minimatch@^9.0.5, js-yaml@^4.1.0
- **App:** Expo/React Native (sin paquetes objetivo directos)
- **RaÃƒÂ­z:** tooling workspace

### 3) Versiones + rutas transitivas (Backend)
| Paquete | Ruta transitiva | VersiÃƒÂ³n actual | Estado |
|---|---|---|---|
| proxy-addr | express@4.21.2 Ã¢â€ â€™ proxy-addr | 2.0.7 | AFECTADO (CVE-2026-90711). requiere >= 2.0.8 |
| brace-expansion | glob@10.4.5 Ã¢â€ â€™ minimatch@9.0.5 Ã¢â€ â€™ brace-expansion | 2.0.1 | AFECTADO (CVE-2026-102278/102276). requiere >= 5.0.10 |
| js-yaml | directa | 4.1.0 | AFECTADO (CVE-2026-84375). Revisar parche |
| minimatch | glob@10.4.5 Ã¢â€ â€™ minimatch | 9.0.5 | Usa brace-expansion@2.0.1 |
| glob | directa | 10.4.5 | Usa minimatch@9.0.5 |
| express | directa | 4.21.2 | Trae proxy-addr@2.0.7 |
| path-to-regexp | express@4.21.2 Ã¢â€ â€™ path-to-regexp | 0.1.12 | Revisar en npm audit |
| fast-uri | no presente (Backend) | Ã¢â‚¬â€ | CVE-2026-84292 no aplica Backend |
| undici | no presente (Backend) | Ã¢â‚¬â€ | No aplica Backend |

Confirmado con 
pm ls en Backend: fast-uri/undici ausentes.

### 4) auditorÃ­a (Backend)

pm audit --json ejecutado en Backend/. Coincidencias: proxy-addr@2.0.7, brace-expansion@2.0.1, js-yaml@4.1.0. path-to-regexp@0.1.12 requiere revisiÃƒÂ³n. Pendiente ejecutar 
pm audit --json en App/ (read-only) para descartar fast-uri/undici.

### 5) Usos directos
Sin importaciones directas de race-expansion, ast-uri o js-yaml en cÃ³digo (*.ts/*.js/*.mjs/*.cjs). BÃƒÂºsqueda por load/merges de js-yaml sin resultados.

### 6) Recomendaciones para FASE 2
    - [x] Estrategia A aplicada: overrides "proxy-addr": "^2.0.8" en Backend/package.json. Resuelto proxy-addr@2.0.8.
    - [x] Estrategia A aplicada: overrides "proxy-addr": "^2.0.8" en Backend/package.json. Resuelto proxy-addr@2.0.8.
- **js-yaml**: evaluar upgrade a versiÃƒÂ³n parcheada estable (directa).
    - [x] Estrategia A aplicada: overrides "proxy-addr": "^2.0.8" en Backend/package.json. Resuelto proxy-addr@2.0.8.

## Plan de remediaciÃƒÂ³nn

### Objetivo
Remediar las vulnerabilidades crÃƒÂ­ticas primero, luego las altas, verificando cada paso. Seguir AGENTS.md: una sola feature a la vez, documentar en progress/current.md, ejecutar init.ps1/init.sh tras cambios relevantes y solo marcar done cuando todo estÃƒÂ© verde.

### FASE 0: Inventario de dependencias (read-only)
- [ ] Buscar lockfiles: package-lock.json, pnpm-lock.yaml, yarn.lock en Backend/, App/ y raÃƒÂ­z.
- [ ] Identificar versiones exactas: proxy-addr, race-expansion, ast-uri, js-yaml, minimatch, glob, express, path-to-regexp, undici.
- [ ] Ejecutar 
npm audit --json en Backend/ (y App/ si aplica). Capturar ÃƒÂ¡rbol transitivo.
- [ ] Generar tabla: paquete | ruta transitiva | versiÃƒÂ³n actual | versiÃƒÂ³n parcheada requerida | acciÃƒÂ³n (upgrade/override).
- [ ] Buscar usos directos: grep -r "brace-expansion\|fast-uri\|js-yaml" en el cÃ³digo.

**Criterio de salida:** tabla completa registrada en progress/current.md.

### FASE 1: CrÃƒÂ­ticas (PRIORITARIO)

#### 1a) RLS en public.schema_migrations (Supabase)
- [ ] Verificar estado:
  `sql
  SELECT relname, rrelrowsecurity 
  FROM pg_class 
  WHERE relname='schema_migrations' AND relnamespace='public'::regnamespace;
  `
- [ ] Habilitar RLS:
  `sql
  ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;
  `
- [ ] Crear polÃ­tica restrictiva (mÃƒÂ­nima): permitir solo service_role (lectura/escritura). Denegar non y uthenticated.
- [ ] auditorÃ­a global RLS: listar todas las tablas en public con 
relrowsecurity=false. Documentar hallazgos en progress/current.md.
- [ ] Validar: intento de acceso con non key debe ser rechazado vÃƒÂ­a PostgREST.

**Nota:** Cambios en base de datos. Ejecutar con extremo cuidado. No romper el pipeline de migraciones.

#### 1b) CVE-2026-90711 Ã¢â‚¬â€ proxy-addr + trust proxy (Backend)
- [ ] Localizar configuraciÃƒÂ³n: grep -r "trust proxy" Backend/src
- [ ] Identificar forma utilizada: boolean | string | IP | subred | funciÃƒÂ³n.
    - [x] Estrategia A aplicada: overrides "proxy-addr": "^2.0.8" en Backend/package.json. Resuelto proxy-addr@2.0.8.
- [ ] Corregir NotaciÃ³n IPv6-mapeado:
  - Correcto: 10.0.0.0/8 (IPv4 plano) o ::ffff:10.0.0.0/104 (prefijo completo).
  - Evitar: ::ffff:10.0.0.0/8 (prefijo corto).
- [ ] Verificar comportamiento en 
req.ip/req.ips con cabecera X-Forwarded-For tras el cambio.

**Archivos candidatos:** Backend/src/app.ts, Backend/src/server.ts.

### FASE 2: Altas (dependencias)
- [ ] **brace-expansion** (CVE-2026-102278 / CVE-2026-102276): actualizar minimatch/glob para obtener race-expansion >= 5.0.10. Verificar con 
pm ls brace-expansion. Eliminar usos directos si existen.
- [ ] **fast-uri** (CVE-2026-84292): actualizar a 4.1.4/3.1.7/2.4.6 segÃƒÂºn versiÃƒÂ³n usada. Revisar construcciÃƒÂ³n de URIs con puerto proveniente de entrada no validada.
- [ ] **js-yaml** (CVE-2026-84375): si se usa load() con YAML11_SCHEMA + merges, actualizar a versiÃƒÂ³n con conteo correcto de maxTotalMergeKeys. Buscar imports con grep -r "js-yaml".

### FASE 3: Hardening y verificaciÃ³n
- [ ] **HTTP**: revisar helmet, CORS (origin restrictivo), rate limiting (express-rate-limit/
ate-limiter-flexible), validaciÃƒÂ³n de entrada.
- [ ] **Auth**: proteger rutas sensibles, asegurar cookies/JWT, verificar que SUPABASE_SERVICE_ROLE_KEY nunca se exponga al cliente.
- [ ] **App (Expo)**: migrar tokens a SecureStore (no AsyncStorage).
- [ ] **TypeScript**: tsc --noEmit sin errores.
- [ ] **Tests**: suite completa verde.
- [ ] **auditorÃ­a final**: 
npm audit --omit=dev (y completo). Documentar remanentes aceptados con justificaciÃƒÂ³n.
- [ ] **verificaciÃ³n global**: ejecutar init.ps1/init.sh. Todo debe estar verde.

### Criterios de cierre
1. Todas las crÃƒÂ­ticas resueltas y verificadas.
2. Altas resueltas o mitigadas con override + justificaciÃƒÂ³n documentada.
3. init.ps1/init.sh pasa al 100%.
4. Cambios DB documentados (SQL + validaciÃƒÂ³n).
5. progress/current.md actualizado, movido a progress/history.md, feature_list.json marcado done.



## FASE 1 ejecutada (rama development) - 2025-10-08

### 1a) RLS en public.schema_migrations (Supabase)
- [x] SQL de verificaciÃ³n/auditorÃ­a definidos (lectura).
- [x] PolÃ­tica mÃ­nima diseÃ±ada (solo service_role).
- [x] Plan de validaciÃ³n PostgREST definido.
- [ ] **Pendiente:** ejecutar SQL en Supabase (verificar estado, habilitar RLS + polÃ­tica, auditorÃ­a global). Requiere acceso BD.

### 1b) CVE-2026-90711 (proxy-addr + trust proxy)
- [x] trust proxy: NO existe en Backend/src (app.ts/index.ts). Latente si se habilita con notaciÃ³n incorrecta.
    - [x] Estrategia A aplicada: overrides "proxy-addr": "^2.0.8" en Backend/package.json. Resuelto proxy-addr@2.0.8.
- [x] NotaciÃ³n IPv6-mapeado documentada (prevenciÃ³n).
- [x] TypeScript OK (Backend/App). App tests 190/190 OK.
- [ ] VerificaciÃ³n: req.ip/req.ips pendiente (no aplica cambios cÃ³digo).
- [ ] AuditorÃ­a App pendiente (fast-uri/undici).

### VerificaciÃ³n
- Backend/App tsc --noEmit: sin errores.
- App tests: 17 suites / 190/190 passing.
- Cambios: solo deps (overrides). Sin cambios de cÃ³digo.

**Estado:** FASE 1 **parcialmente completada** (1b crÃ­tico mitigado; 1a pendiente por acceso a Supabase).

## FASE 2 en ejecución (rama development) - 2026-10-08

Alcance acordado con el usuario: FASE 2 documentada (brace-expansion, fast-uri, js-yaml) en Backend y App + crítico `shell-quote` de App. El resto (jest 30, nodemon/chokidar, braces, qs/body-parser/uuid) queda para FASE 3.

### Inventario real (diffiere del FASE 0: las dependencias cambiaron)

| Paquete | Backend | App | Ruta transitiva | Parche requerido |
|---|---|---|---|---|
| brace-expansion | 1.1.15 (raíz) + 5.0.7 (nodemon, swagger-jsdoc) | 1.1.15 + 5.0.7 + 5.0.9 (@expo/fingerprint) | minimatch@3 / minimatch@10 / glob | >=1.1.21 (1.x), >=5.0.12 (5.x) |
| fast-uri | 3.1.3 (**prod**: swagger-jsdoc→swagger-parser→ajv) | ausente | ajv | >=3.1.8 |
| js-yaml | 4.3.0 (prod) + 3.15.0 (istanbul/jest) | 4.3.0 + 3.15.0 | eslint / swagger-parser / babel-plugin-istanbul | >=4.3.2, >=3.15.2 |
| shell-quote | n/a | 1.9.0 (**crítico**, metro/expo) | dev tooling Expo | >=1.11.0 |
| proxy-addr | 2.0.8 ✓ (FASE 1) | n/a | express | ya resuelto |

Auditoría línea base: Backend 42 (35 high, 0 critical), App 72 (1 critical = shell-quote).

### Paso 0 — Línea base (ejecutado 2026-10-08)
- [x] `init.ps1` inicial: **FAIL** en tests de Backend. Causa raíz: `Backend/package.json` tenía **UTF-8 con BOM** (reescrito por una sesión anterior con PowerShell). `jest-resolve` (`readPackageCached`) recibe el BOM en `JSON.parse` → error aparente "Preset ts-jest not found".
- [x] BOM eliminado de `Backend/package.json` (solo los 3 bytes EF BB BF; contenido intacto).
- [x] Base verde: Backend 14 suites / **183 tests** ✓, App ✓, `init.ps1` al **100%** ✓.
- [x] Feature 78 `vulnerabilities_phase2_deps` marcada `in_progress` en feature_list.json; plan en `progress/current.md`.

### Paso 1 — Backend: npm update dentro de rango (ejecutado 2026-10-08)
- [x] `npm update brace-expansion js-yaml fast-uri minimatch glob` en `Backend/`.
- [x] Resultado (todo dentro de las ranges parentales, sin overrides necesarios):

| Paquete | Antes | Después |
|---|---|---|
| brace-expansion (1.x, minimatch@3) | 1.1.15 | **1.1.21** ✓ |
| brace-expansion (5.x, nodemon/swagger) | 5.0.7 | **5.0.12** ✓ |
| fast-uri (ajv, prod) | 3.1.3 | **3.1.8** ✓ |
| js-yaml (4.x, eslint/swagger, prod) | 4.3.0 | **4.3.2** ✓ |
| js-yaml (3.x, istanbul/jest) | 3.15.0 | **3.15.2** ✓ |

- [x] `npm audit`: brace-expansion, fast-uri y proxy-addr → **OK**. js-yaml quedaba marcado *moderate* solo por su cadena anidada `argparse@1.0.10 → sprintf-js@1.0.3` (GHSA-hp3w-g68c-fv3c: **sin versión parcheada publicada**, sprintf-js latest = 1.1.3 = vulnerable).

### Paso 2 — Backend: override para cerrar js-yaml@3 (ejecutado 2026-10-08)
- [x] `@istanbuljs/load-nyc-config` solo usa `require('js-yaml').load()` (compatible con js-yaml 4) → se aplicó **override global** `"js-yaml": "^4.3.2"` en `Backend/package.json` (junto al `"proxy-addr": "^2.0.8"` existente). La variante de override anidado scoped no la re-resolvía npm 11.12.1; la global sí.
- [x] Resultado: js-yaml 3.x, argparse 1.x y sprintf-js **eliminados** del árbol; `npm ls` limpio.
- [x] Audit Backend: 42 → **37** (35→32 high, 10→5 moderate, 0 critical). Objetivos FASE 2 en Backend: **brace-expansion OK, fast-uri OK, js-yaml OK, proxy-addr OK**.
- [ ] Remanentes FASE 3 (fuera de alcance): cadena jest 29→30 (32 high mayoritarios), nodemon/chokidar/braces, browserslist, body-parser/qs/express (moderate), uuid, baseline-browser-mapping.

### Paso 3 — App: updates + override js-yaml + shell-quote crítico (ejecutado 2026-10-08)
- [x] `npm update brace-expansion js-yaml shell-quote argparse sprintf-js minimatch glob` en `App/` (brace-expansion requirió una segunda pasada suelta para subir de 1.1.15 → 1.1.21).
- [x] **shell-quote (crítico GHSA-pqg4-j6r4-53mv): 1.9.0 → 1.12.0** ✓ (fix >=1.11.0, resuelto dentro de rango vía react-devtools-core).
- [x] brace-expansion: 1.1.15→**1.1.21**, 5.0.7/5.0.9→**5.0.12** ✓. js-yaml 4.x → **4.3.2** ✓.
- [x] Igual que Backend, quedaba `js-yaml@3.15.2` (istanbul) → override global `"js-yaml": "^4.3.2"` añadido a `App/package.json` (sección `overrides` nueva).
- [x] **Auditoría FASE 1 cerrada:** `npm ls fast-uri undici` en App → vacío (ausentes).
- [x] Audit App: 72 → **67** (critical 1→0, high 56→54, moderate 15→13). Objetivos: brace-expansion OK, js-yaml OK, shell-quote OK, fast-uri/undici OK.

### Paso 4 — Verificación (ejecutado 2026-10-08)
- [x] `tsc --noEmit`: Backend y App sin errores.
- [x] Tests: Backend **14 suites / 183 tests** ✓, App **17 suites / 190 tests** ✓ (aviso de worker sin salida = preexistente).
- [x] Smoke swagger: `swagger-jsdoc` genera el spec (28 paths) y `SwaggerParser.validate` lo valida OK → **ajv + fast-uri@3.1.8 + js-yaml@4.3.2 funcionan en runtime**.
- [x] `init.ps1` al **100%** (69 features).
- [x] Script temporal de smoke eliminado.

### FASE 2 — Estado final
| Paquete | Backend | App | Método |
|---|---|---|---|
| brace-expansion | 1.1.21 / 5.0.12 ✓ | 1.1.21 / 5.0.12 ✓ | npm update |
| fast-uri | 3.1.8 ✓ | ausente ✓ | npm update |
| js-yaml | 4.3.2 (4.x y 3.x unificados) ✓ | 4.3.2 ✓ | npm update + override |
| shell-quote (crítico) | n/a | 1.12.0 ✓ | npm update |
| proxy-addr (FASE 1) | 2.0.8 ✓ | n/a | override (FASE 1) |

Auditorías: Backend 42 → **37** (0 critical), App 72 → **67** (0 critical). Pendientes FASE 3: cadena jest 29→30 (upgrade mayor), nodemon/chokidar/braces, browserslist, body-parser/qs/express (moderate), uuid, baseline-browser-mapping, remanentes Expo/metro/@xmldom, y `npm audit --omit=dev` final. Nota: grep de usos directos de brace-expansion/js-yaml/fast-uri → ninguno (solo transitivos).

## FASE 1a ejecutada — RLS en Supabase (2026-10-24)

La auditoría global en el SQL Editor de Supabase confirmó que **no era solo `schema_migrations`**: las 12 tablas de `public` tenían RLS deshabilitado.

| Tabla | Sensibilidad |
|---|---|
| `usuarios_auth` | email + nombre real + `id_anonimo` (identidad) |
| `refresh_tokens` | hashes de refresh tokens |
| `preguntas_seguridad` | hashes de respuestas de seguridad |
| `timeline_events`, `gratitude_entries`, `gratitude_streaks`, `usuario_progreso_psicoeducacion` | datos clínicos/emocionales |
| `categorias_psicoeducacion`, `temas_psicoeducacion`, `contenidos_bloques`, `profesionales` | contenido |
| `schema_migrations` | nombres de migraciones |

Con la *anon key* (pública por diseño) y los grants por defecto de Supabase, cualquiera podía leer todo vía PostgREST. Es el hallazgo que sí afectaba al usuario final.

### Cambios aplicados

- **SQL ejecutado manualmente en Supabase** (rol `postgres`) el 2026-10-24: `ENABLE ROW LEVEL SECURITY` en las 12 tablas + `REVOKE ALL` a `anon`/`authenticated` (tablas, secuencias y funciones) + `ALTER DEFAULT PRIVILEGES ... REVOKE` para futuras tablas.
- **Versionado como migraciones** (idempotentes, se re-ejecutan sin efecto en el deploy):
  - `022_enable_rls_public_tables.sql`
  - `023_fix_function_search_path.sql` (`ALTER FUNCTION public.update_updated_at_column() SET search_path = ''`)
- **Por qué no rompe el Backend:** conecta directamente a `db.<ref>.supabase.co:5432` como `postgres`, que es owner de todas las tablas y tiene `BYPASSRLS`. `service_role` también tiene `BYPASSRLS`. Sin políticas, `anon`/`authenticated` quedan denegados por defecto. La App no usa PostgREST.

### Verificación pendiente (post-deploy, desde el dashboard)

```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' ORDER BY 1;
-- esperado: rowsecurity = true en las 12

SELECT grantee, table_name, privilege_type FROM information_schema.role_table_grants
 WHERE grantee IN ('anon','authenticated') AND table_schema='public';
-- esperado: 0 filas
```

Smoke del Backend tras el deploy: `GET /health`, login, `GET /gratitude/streak`, `GET /timeline`, `GET /psychoeducation`.

## FASE 3 parcial — dependencias de producción y lockfile (2026-10-24)

| Paquete | Antes | Después | Método |
|---|---|---|---|
| express | 4.22.2 | **4.22.3** ✓ | `npm audit fix` |
| qs | 6.15.3 | **6.16.1** ✓ | `npm audit fix` |
| body-parser | 1.20.5 | **1.20.9** ✓ | `npm audit fix` |
| uuid | 10.0.0 | 10.0.0 (aceptado) | CVE v3/v5/v6 con buffer; el Backend solo usa `v4()` en `user-repository.ts` |

- `npm audit --omit=dev` en Backend: **4 → 1** (solo uuid, justificado).
- `Backend/package.json`: se restauró el formato original desde HEAD (una sesión anterior lo había reescrito con PowerShell, con indentación distinta y `description` en mojibake); el diff contra HEAD son **solo los overrides** `proxy-addr@^2.0.8` y `js-yaml@^4.3.2`.
- App: `overrides.js-yaml@^4.3.2` y el `package-lock.json` de FASE 2 quedan commiteados.

Pendiente de FASE 3 (fuera de esta tanda): cadena jest 29→30, nodemon/chokidar/braces, browserslist, Expo/metro/@xmldom, hardening HTTP/auth y `npm audit` completo.



