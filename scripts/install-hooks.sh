#!/usr/bin/env bash
# Instala el hook pre-push (githooks/pre-push) en App/ y Backend/.
# Bloquea el push a main si el código no pasó scripts/quality-release.sh.
# Uso: ./scripts/install-hooks.sh   (desde la raíz del repo)
set -u
chmod +x githooks/pre-push 2>/dev/null
for dir in Backend App; do
  if [ ! -e "$dir/.git" ]; then
    printf "[WARN]  %s no es un repo git (omitido)\n" "$dir"
    continue
  fi
  if git -C "$dir" config core.hooksPath ../githooks; then
    printf "[OK]    Hook pre-push instalado en %s (core.hooksPath=../githooks)\n" "$dir"
  else
    printf "[FAIL]  No se pudo configurar core.hooksPath en %s\n" "$dir"
  fi
done
