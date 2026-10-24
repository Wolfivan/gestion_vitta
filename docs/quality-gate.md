# Quality Gate — VittalMind

> Gate objetivo para decidir si una feature puede marcarse `done`. Alineado con `CHECKPOINTS.md` y `docs/conventions.md`.

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

## Criterios de aprobación
- **APPROVE (PASS)**: Sin bloqueantes. Puede marcarse `done` tras pasar `init`.
- **REJECT (FAIL)**: Existe al menos un bloqueante → **NO marcar `done`**. Corregir y volver a verificar.

## Severidades
- `CRITICAL` → Bloqueante
- `HIGH` → Bloqueante por defecto (empezar con este umbral; revisar falsos positivos)
- `MEDIUM` → Requiere justificación o corrección razonable
- `LOW/INFO` → Aviso

## Verificación
1. Ejecutar `security-auditor` (análisis estático)
2. Ejecutar `sonar-verifier` (quality gate)
3. Ejecutar `scripts/security-scan` y/o `scripts/quality-check` si existen
4. Ejecutar `.\init.ps1` / `./init.sh` → todo verde
5. Completar checkpoints relevantes en `CHECKPOINTS.md`
