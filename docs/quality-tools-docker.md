# Quality tools en Docker

Dos gates, dos momentos:

| Gate | Cuándo | Qué mide | Comando |
|---|---|---|---|
| **quality-lite** | Antes de marcar una feature como `done` (lo ejecuta `init`) | Tipos (`tsc`), lint (ESLint + sonarjs), `any`, `console`, duplicación (`jscpd`) | `.\scripts\quality-check.ps1` |
| **release** | Antes de mergear a `main` / desplegar (**obligatorio**, lo exige el hook `pre-push`) | Todo lo anterior + security scan + Quality Gate de SonarQube | `.\scripts\quality-release.ps1` |

En desarrollo `init` **no** ejecuta el security scan; para forzarlo: `.\init.ps1 -Full` / `./init.sh --full`.

## Prerrequisitos
- Docker Desktop / Docker Engine corriendo.
- `npm install` ejecutado en `Backend/` y `App/` (el contenedor reutiliza sus `node_modules`).
- ~2–4 GB de RAM libres para SonarQube.

## Archivos
- `docker-compose.quality-tools.yml` — perfiles `quality` y `release`.
- `scripts/quality/Dockerfile` — imagen `vittalmind/quality-lite:1` (Node 20 + jscpd).
- `scripts/quality/run-quality.mjs` — ejecuta y agrega los resultados.
- `scripts/quality-check.ps1` / `.sh` — wrapper con autodetección (Docker → local).
- `scripts/quality-check-docker.ps1` / `.sh` — fuerza Docker.
- `scripts/quality-release.ps1` / `.sh` — gate de release con SonarQube.
- `Backend/sonar-project.properties`, `App/sonar-project.properties` — configuración de Sonar por repo.

## Uso rápido

### Gate rápido (segundos)
```powershell
.\scripts\quality-check.ps1
```
Reporte: `quality-reports/QUALITY_<timestamp>.md` y `.json`.

### Gate de release (2–4 min la primera vez)
```powershell
.\scripts\quality-release.ps1
```
Hace, en orden: quality-lite → security scan → levanta SonarQube → escanea `Backend` y `App` → consulta el Quality Gate.

Antes de cada escaneo corre `npx jest --coverage --coverageReporters=lcov` en el host para generar `coverage/lcov.info` (ignorado por git) y deja las rutas `SF:` relativas al proyecto, porque el scanner corre en Docker con el repo en `/repo` y no resuelve rutas de Windows. Sin ese archivo Sonar reporta `new_coverage=0.0` y el Quality Gate falla.
Reporte: `quality-reports/RELEASE_<timestamp>.md`.

Opciones útiles:
```powershell
.\scripts\quality-release.ps1 -SkipSecurity   # sin gitleaks/osv/semgrep/trivy
.\scripts\quality-release.ps1 -SkipLite       # solo Sonar (no recomendado)
.\scripts\quality-release.ps1 -Down           # apaga SonarQube, conserva volúmenes
```

Dashboard: <http://localhost:9000> (usuario `admin`; la contraseña se guarda en `.env.sonar`).

## Bloqueo de `main` (hook pre-push)

Instalación (una vez por clon):
```powershell
.\scripts\install-hooks.ps1     # o ./scripts/install-hooks.sh
```
Configura `core.hooksPath=../githooks` en `App/` y `Backend/`. `init` avisa si falta.

Funcionamiento:
1. `quality-release` completo en PASS, con `App` y `Backend` sin cambios sin
   commitear, escribe `quality-reports/release-pass.json` con el *tree* de
   `HEAD` de cada repo.
2. Con `-SkipSecurity`, `-SkipLite` o cambios sin commitear **no** se escribe:
   sirve para iterar, pero no habilita el push.
3. Al hacer push a `main`, `githooks/pre-push` compara el tree del commit con
   el registrado. Si no coincide, rechaza el push.

Se compara el *tree* (contenido) y no el commit, así vale tanto con
fast-forward (`App`) como con merge-commit (`Backend`) siempre que el contenido
sea el mismo. Si `main` tenía commits que `desarrollo` no, el contenido cambia:
vuelve a ejecutar el gate sobre `main` antes del push.

Flujo:
```powershell
# en desarrollo (App y Backend), todo commiteado
.\scripts\quality-release.ps1        # corregir hallazgos y repetir hasta PASS
git -C Backend checkout main; git -C Backend merge desarrollo; git -C Backend push
git -C App checkout main;     git -C App merge desarrollo;     git -C App push
```

Limitación: el hook es local y se puede saltar con `git push --no-verify`. Para
que sea obligatorio para cualquiera hace falta CI + protección de rama en GitHub.

## Qué hace exactamente cada herramienta

| Herramienta | Alcance | Salida |
|---|---|---|
| `tsc --noEmit` | `Backend/src`, `App/src` | errores de tipos |
| ESLint (`typescript-eslint` + `sonarjs`) | mismo alcance | errores/avisos, `any`, `console` |
| `jscpd` | `src` de cada proyecto | % de duplicación |
| SonarQube | `sonar.sources` de cada properties | Quality Gate "Sonar way", hotspots, deuda |

## Umbrales
Ver `docs/quality-gate.md`. Resumen: 0 errores de tipos, 0 errores de lint,
≤ 50 avisos, `any`/`console.log` a 0, duplicación ≤ 5% en Backend y ≤ 12% en App
(deuda conocida de UI; objetivo 5%).

## Seguridad
- El repo se monta en **solo lectura** (`:ro`); el único volumen escribible es `quality-reports/`.
- SonarQube escanea en `/tmp/scannerwork`, nunca dentro del repo.
- `SONAR_TOKEN` vive en `.env.sonar`, que está en `.gitignore`.
- No se envía código a servicios externos: todo corre en local.

## Troubleshooting
- **`docker info` falla**: abre Docker Desktop y espera a que arranque.
- **`No existe node_modules/.bin/tsc`**: ejecuta `npm install` en `Backend/` y/o `App/`.
- **SonarQube tarda**: la primera vez descarga la imagen y arranca Elasticsearch (~1–2 min). El script espera hasta 6 minutos.
- **Token inválido tras `down -v`**: borra `.env.sonar` y vuelve a lanzar; se regenera solo.
- **`401` / `{"valid":false}` en la API con un token recién generado**: esta
  instalación de SonarQube 9.9 rechaza `Authorization: Bearer <token>`. Los
  scripts envían el token como usuario Basic (`-u "$TOKEN:"`), que sí funciona.
  Si escribes tus propias llamadas a la API, usa Basic, no Bearer.
- **`no se pudo consultar el Quality Gate`**: el reporte aún se está procesando.
  Los scripts esperan a la tarea del Compute Engine (`/api/ce/task`) hasta 5
  minutos antes de consultar el gate.
- **`vm.max_map_count` en Linux**: `sudo sysctl -w vm.max_map_count=262144` (requisito de Elasticsearch).
- **Windows + WSL2 lento**: el bind mount de `node_modules` es el principal coste; el gate completo tarda ~1–2 min. Si molesta, ejecuta `scripts/quality-check.ps1` en modo local (sin Docker) para iterar.

## Notas de repos
`App/` y `Backend/` son repos independientes (la raíz los ignora). Por eso
`sonar-project.properties` y `eslint.config.mjs` viven dentro de cada repo y
deben commitearse allí, no en la raíz.
