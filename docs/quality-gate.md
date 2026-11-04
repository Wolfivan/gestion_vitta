# Quality Gate — VittalMind

> Gate objetivo para decidir si una feature puede marcarse `done` (gate rápido)
> y si `desarrollo` puede mergearse a `main` (gate completo). Alineado con
> `CHECKPOINTS.md` y `docs/conventions.md`.
>
> Los criterios de abajo aplican en los dos momentos, pero la verificación
> **completa** (security scan, `security-auditor`, `sonar-verifier`, SonarQube)
> se hace antes de `main`, no por cada feature.

## Bloqueantes (deben pasar)
| Criterio | Estado | Notas |
|---|---|---|
| **Tests verdes** | BLOQUEANTE | `.\init.ps1` / `./init.sh` debe pasar al 100% (incluye tests). |
| **Sin secretos** | BLOQUEANTE | Sin claves/tokens/`.env`/`.p8` commiteados. |
| **AuthZ correcto** | BLOQUEANTE | Rutas protegidas verifican propiedad/permisos. |
| **RLS seguro (si aplica)** | BLOQUEANTE | Si toca migraciones/policies/tablas sensibles, RLS correcto sin `true` injustificado. |
| **Sin vulnerabilidades CRITICAL explotables** | BLOQUEANTE | Revisar deps si hay cambios relevantes. |
| **Privacidad/anonimato** | BLOQUEANTE | No vincular identidad real con datos clínicos. Usar `id_anonimo`. |

## Fuertes (recomendados/bloqueantes según severidad)
| Criterio | Estado | Notas |
|---|---|---|
| **Security Hotspots críticos** | BLOQUEANTE si CRITICAL | `eval`, inyección SQL concatenada, ejecución, subida sin validar. |
| **Validación/saneamiento** | BLOQUEANTE si permite explotación directa | Inputs externos validados. |
| **Errores seguros** | FUERTE | Sin stack traces/PII al cliente. |
| **Tipado/limpieza** | FUERTE | Sin `any` injustificado, imports no usados, `console.log` debug. |
| **Complejidad/mantenibilidad** | AVISO/BLOQUEANTE si extrema | Funciones muy largas/complejas difícilmente testeables. |

## Umbrales automáticos (quality-lite)
Estos umbrales los aplica `scripts/quality-check.ps1` / `.sh` (Docker o local) y
bloquean `init.ps1` / `init.sh`:

| Métrica | Umbral | Bloquea |
|---|---|---|
| `tsc --noEmit` | 0 errores | ✅ |
| ESLint errors | 0 | ✅ |
| ESLint warnings | ≤ 50 | ✅ si se supera |
| `@typescript-eslint/no-explicit-any` | 0 | ✅ |
| `no-console` (`log`/`debug`/`trace`) | 0 | ✅ |
| Complejidad cognitiva (`sonarjs`) | ≤ 25 por función | ✅ |
| Duplicación (`jscpd`, min-tokens 50) | ≤ 5% Backend, ≤ 12% App | ✅ |

## Deuda conocida
- **Duplicación en App (11,1%)**: pantallas de autenticación (`welcome`/`register`),
  formularios de contraseña (`change-password`, `forgot-password`, `edit-profile`)
  y diálogos (`confirm-dialog`, `info-dialog`, `update-modal`). Objetivo: bajar a 5%
  extrayendo layout y componentes compartidos.
- **Complejidad**: el umbral arranca en 25 (no 15) para no bloquear el código actual;
  el objetivo es 15. `flushPendingOps` se refactorizó para bajar de 49.
- **Avisos**: `sonarjs/no-nested-conditional`, `no-duplicate-string`, `pseudo-random`,
  etc. quedan como aviso, no como error.

## Criterios de aprobación
- **APPROVE (PASS)**: Sin bloqueantes. Puede marcarse `done` tras pasar `init`.
- **REJECT (FAIL)**: Existe al menos un bloqueante → **NO marcar `done`**. Corregir y volver a verificar.

## Severidades
- `CRITICAL` → Bloqueante
- `HIGH` → Bloqueante por defecto (empezar con este umbral; revisar falsos positivos)
- `MEDIUM` → Requiere justificación o corrección razonable
- `LOW/INFO` → Aviso

## Verificación

### Antes de marcar una feature `done` (desarrollo, rápido)
1. Ejecutar `.\init.ps1` / `./init.sh` → todo verde (incluye tests y `quality-check`, bloqueante)
2. Completar checkpoints relevantes en `CHECKPOINTS.md`

### Antes de mergear `desarrollo` → `main` (obligatorio)
1. Working tree limpio en `App` y `Backend` (todo commiteado).
2. `.\scripts\quality-release.ps1` / `./scripts/quality-release.sh` **completo** (sin `-SkipSecurity` ni `-SkipLite`) → **PASS**.
3. `security-auditor` y `sonar-verifier` sobre el diff `main..desarrollo`.
4. Corregir los hallazgos en `desarrollo` y repetir hasta PASS.
5. Merge a `main` y push. El hook `githooks/pre-push` rechaza el push si el
   contenido no coincide con el último PASS (`quality-reports/release-pass.json`).

Guía de las herramientas: `docs/quality-tools-docker.md`.
