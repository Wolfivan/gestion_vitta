# AGENTS.md — Mapa de navegación para agentes de IA

> Este archivo es el **punto de entrada** para cualquier agente que trabaje en este
> repositorio. NO es una biblia de reglas: es un **mapa**. Lee solo lo que
> necesites cuando lo necesites (divulgación progresiva).

---

## 1. Antes de empezar (obligatorio)

1. Ejecuta `.\init.ps1` (PowerShell) o `./init.sh` (Linux/macOS) y verifica que termina sin errores. Si falla, **para** y resuelve el entorno antes de tocar código.
2. Lee `progress/current.md` para entender en qué estado quedó la última sesión.
3. Lee `feature_list.json` y elige **una** tarea con estado `pending`. No
   trabajes en más de una a la vez.

## 2. Mapa del repositorio

| Archivo / carpeta            | Qué contiene                                              | Cuándo leerlo |
|------------------------------|-----------------------------------------------------------|---------------|
| `feature_list.json`          | Lista de tareas con estado (pending / in_progress / done) | Siempre, al empezar |
| `progress/current.md`        | Estado de la sesión actual                                | Siempre, al empezar |
| `progress/history.md`        | Bitácora append-only de sesiones anteriores               | Si necesitas contexto histórico |
| `docs/architecture.md`       | Qué significa "hacer un buen trabajo" en este proyecto    | Antes de implementar |
| `docs/conventions.md`        | Reglas de estilo, nombres, estructura                     | Antes de escribir código |
| `docs/verification.md`       | Cómo verificar que tu trabajo funciona                    | Antes de declarar una tarea como `done` |
| `docs/entorno-pruebas.md`    | Entorno Docker de pruebas (WordPress + plugin), credenciales y procedimiento end-to-end | Para probar contra WordPress antes de producción |
| `docs/entornos-dev-produccion.md` | Qué está y qué NO está separado entre desarrollo y producción, trampas conocidas y procedimiento de release | **Antes de mergear a `main` o desplegar** |
| `CHECKPOINTS.md`             | Criterios objetivos de "estado final correcto"            | Para auto-evaluarte |
| `.claude/agents/`            | Definiciones de subagentes (líder, implementador, revisor) | Si orquestas trabajo |
| `init.ps1` / `init.sh`       | Script de verificación multiplataforma                   | Antes de empezar y antes de cerrar |
| `App/`                       | Frontend Expo (React Native) con TypeScript              | Para implementar UI |
| `Backend/`                   | API Node.js + Express con TypeScript                     | Para implementar backend |
| `tests/`                     | Tests automáticos (Jest)                                  | Para verificar |
| `graphify-out/`              | Grafo del proyecto: `graph.html`, `GRAPH_REPORT.md`, `graph.json`, `VittalMind-callflow.html` | Para consultas `graphify query "<pregunta>"` sin leer archivos |

## 3. Reglas duras (no negociables)

- **Una sola feature a la vez.** No mezcles cambios de varias tareas en la misma sesión.
- **No declares una tarea `done` sin pruebas verdes.** Ejecuta `.\init.ps1` (PowerShell) o `./init.sh` (Linux/macOS) y
  asegúrate de que el bloque de tests pasa al 100%.
- **Documenta lo que haces** en `progress/current.md` mientras trabajas, no al final.
- **Deja el repositorio limpio** antes de cerrar la sesión (ver §5).
- **Si no sabes algo, busca en `docs/`** antes de inventarlo.

## 4. Cómo elegir una tarea

```
1. Abre feature_list.json
2. Filtra por status == "pending"
3. Coge la de menor "id"
4. Cambia su status a "in_progress" y guarda
5. Anota en progress/current.md: feature, hora de inicio, plan breve
```

## 5. Cierre de sesión (lifecycle)

Antes de terminar:

1. Ejecuta `.\init.ps1` (PowerShell) o `./init.sh` (Linux/macOS) — todo verde.
2. Si la tarea está acabada: marca `status: "done"` en `feature_list.json`.
3. Mueve el resumen de `progress/current.md` al final de `progress/history.md`.
4. Vacía `progress/current.md` dejando solo la plantilla.
5. No dejes archivos temporales, ni `print()` de debug, ni TODOs sin contexto.

## 6. Si te bloqueas

- Relee la sección relevante de `docs/`.
- Si la herramienta no hace lo que esperas, **no inventes un workaround**:
  documenta el bloqueo en `progress/current.md` y para la sesión.
