# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **manténlo actualizado en tiempo real**, no al final.

<!-- Estado de la sesión activa -->

## Sesión 2026-10-24 — Feature 86: release de psicoeducación

### Objetivo
Publicar en `main` el arreglo del panel de WordPress y de la TABLA_COMPARATIVA,
sin arrastrar el trabajo de notificaciones (features 80-85).

### Trabajo realizado
- Backend: commit `f7d252a` en `desarrollo` (lecturas admin sin HAVING, rutas
  `GET /psychoeducation/admin/*`, validación de categoría por id y mapeo de
  errores Postgres 23505/22001/23503). Cherry-pick a `main` (`7456cd6`).
- Raíz: commit `01eb826` con el plugin v1.0.8 (header `Version` igualado a
  `VMP_VERSION`), cherry-pick a `main` (`1aee456`). El ZIP regenerado se
  commiteó aparte (`3a2879d` en `main`, `c6d6351` en `development`) porque el
  `git add` por directorio no lo había indexado.
- `App/` no se tocó: sus cambios de notificaciones siguen en `desarrollo`.

### Verificación
- Backend `tsc --noEmit` y `npm run build` limpios.
- `main` (sin notificaciones): 15 suites / 201 tests OK.
- `desarrollo` (con notificaciones): 19 suites / 237 tests OK.
- API E2E contra Docker: categoría vacía visible, tema creado con 201,
  TABLA_COMPARATIVA guardada con una clave por columna, slug duplicado 409,
  valor de 60 caracteres 400.
- WordPress Docker: el panel muestra las categorías, incluida una creada sin
  contenido (confirmado por el usuario).
- Comprobación estática manual de los archivos tocados: sin `console.log`,
  `eval` ni sumideros nuevos (los `innerHTML` son lecturas del template,
  preexistentes). `scripts/quality-check.ps1` no termina porque recorre
  `node_modules`; problema preexistente del script.

### Pendiente operativo
- Hostinger: pull de `main`, borrar `dist/`, reiniciar. Sin dependencias nuevas
  y sin migraciones en este release.
- WordPress producción: subir `vittalmind-psicoeducacion.zip` (1.0.8).
- Revisar y re-editar los bloques TABLA_COMPARATIVA antiguos (formato
  clave/valor); query de detección en `docs/entorno-dev-produccion.md` o en el
  resumen de la sesión.
- `docs/vulneravilidades.md` quedó sin commitear, fuera de este release.
