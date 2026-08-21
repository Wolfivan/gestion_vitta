# CHECKPOINTS — Evaluación del estado final

> En sistemas multi-agente no se evalúa el camino, se evalúa el destino.
> Estos son los checkpoints objetivos que un juez (humano o IA) puede usar
> para decidir si el proyecto está sano.

## C1 — El arnés está completo

- [ ] Existen los 4 archivos base: `AGENTS.md`, `init.sh`, `init.ps1`, `feature_list.json`,
      `progress/current.md`.
- [ ] Existen los 3 docs: `docs/architecture.md`, `docs/conventions.md`,
      `docs/verification.md`.
- [ ] `.\init.ps1` (PowerShell) o `./init.sh` (Linux/macOS) termina con exit code 0.

## C2 — El estado es coherente

- [ ] Como mucho una feature en `in_progress` en `feature_list.json`.
- [ ] Toda feature `done` tiene tests asociados que pasan.
- [ ] `progress/current.md` está vacío o describe la sesión activa
      (no contiene basura de sesiones anteriores).

## C3 — El código respeta la arquitectura

- [ ] `App/` y `Backend/` solo contienen los módulos previstos en `docs/architecture.md`.
- [ ] No hay dependencias externas no documentadas en `package.json`.
- [ ] No hay `console.log()` sueltos para debug, ni TODOs sin contexto.

## C4 — La verificación es real

- [ ] Cada módulo en `Backend/src/` tiene su test correspondiente.
- [ ] Cada módulo en `App/` tiene su test correspondiente.
- [ ] Los tests usan datos reales o de prueba, no mocks del filesystem.
- [ ] `npm test` en ambos proyectos muestra > 0 tests y todos verdes.

## C5 — La sesión se cerró bien

- [ ] No hay archivos sin trackear sospechosos (`*.tmp`, `node_modules/`
      fuera del `.gitignore`).
- [ ] `progress/history.md` tiene una entrada por la última sesión.
- [ ] La última feature trabajada está reflejada en su estado correcto.

---

**Cómo usar este archivo:** un agente revisor (`.claude/agents/reviewer.md`)
recorre cada checkbox, marca `[x]` o `[ ]`, y rechaza el cierre de sesión
si quedan boxes vacíos en C1-C5.
