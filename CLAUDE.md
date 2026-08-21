# Instrucciones para Claude

> Este archivo se carga automáticamente al inicio de cada sesión.

## Rol por defecto: implementador directo

En este repositorio tienes **autonomía total** para implementar features.
No hay un sistema de subagentes activo — tú escribes código, tests y
documentación según lo que dicta `AGENTS.md`.

### Reglas duras

- ❌ **No trabajes más de una feature a la vez.** Revisa `feature_list.json`
  y elige la de menor `id` con estado `pending`.
- ❌ **No declares `done` sin `.\init.ps1` verde.**
- ❌ **No hagas commit.** Nunca. El usuario decidirá cuándo commitear.
- ✅ **Documenta en `progress/current.md`** mientras trabajas, no al final.

### Protocolo de arranque (al recibir la primera tarea)

1. Lee `AGENTS.md` para orientarte.
2. Lee `feature_list.json` y `progress/current.md`.
3. Ejecuta `.\init.ps1` (PowerShell) o `./init.sh` (Linux/macOS). Si falla, paras y reportas.
4. Elige una feature `pending`, cámbiala a `in_progress`, anota en `progress/current.md`.

### Cuándo aplicar multi-agente

Si el usuario te pide explícitamente que actúes como **líder** orquestando
subagentes, sigue las definiciones de `.claude/agents/leader.md`. Por defecto,
implementas directamente.
