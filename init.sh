#!/usr/bin/env bash
# init.sh — Verificación e inicialización del entorno
#
# Este script lo ejecuta el agente al COMENZAR una sesión y antes de
# declarar cualquier tarea como `done`. Si falla, la sesión no debe avanzar.
#
# Salida esperada: códigos de salida claros y bloques marcados con [OK]/[FAIL].

set -u
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

ok()    { printf "${GREEN}[OK]${NC}    %s\n" "$1"; }
warn()  { printf "${YELLOW}[WARN]${NC}  %s\n" "$1"; }
fail()  { printf "${RED}[FAIL]${NC}  %s\n" "$1"; }

EXIT_CODE=0

echo "── 1. Verificando entorno ─────────────────────────────"

# Node.js disponible
if ! command -v node >/dev/null 2>&1; then
  fail "Node.js no está instalado"
  exit 1
fi
ok "node -> $(node --version)"

# Node >= 18
NODE_VERSION_OK=$(node -e "console.log(process.version.slice(1).split('.')[0] >= 18)")
if [ "$NODE_VERSION_OK" != "true" ]; then
  fail "Se requiere Node.js >= 18"
  exit 1
fi
ok "Versión de Node.js compatible"

# npm disponible
if ! command -v npm >/dev/null 2>&1; then
  fail "npm no está instalado"
  exit 1
fi
ok "npm -> $(npm --version)"

echo ""
echo "── 2. Verificando archivos base del arnés ──────────────"

for f in AGENTS.md feature_list.json progress/current.md docs/architecture.md docs/conventions.md docs/verification.md CHECKPOINTS.md init.ps1; do
  if [ ! -f "$f" ]; then
    fail "Falta archivo base: $f"
    EXIT_CODE=1
  else
    ok "Existe $f"
  fi
done

echo ""
echo "── 3. Validando feature_list.json ──────────────────────"

node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('feature_list.json', 'utf-8'));
const valid = new Set(['pending', 'in_progress', 'done', 'blocked']);
const inProgress = data.features.filter(f => f.status === 'in_progress');
if (inProgress.length > 1) {
  console.log('[FAIL]  Hay ' + inProgress.length + ' features en in_progress (máximo 1)');
  process.exit(1);
}
for (const f of data.features) {
  if (!valid.has(f.status)) {
    console.log('[FAIL]  Estado inválido en feature ' + f.id + ': ' + f.status);
    process.exit(1);
  }
}
console.log('[OK]    feature_list.json válido (' + data.features.length + ' features)');
"
if [ $? -ne 0 ]; then EXIT_CODE=1; fi

echo ""
echo "── 4. Verificando dependencias ─────────────────────────"

for dir in Backend App; do
  if [ -d "$dir" ]; then
    if [ -f "$dir/package.json" ]; then
      ok "$dir/package.json existe"
      if [ -d "$dir/node_modules" ]; then
        ok "$dir/node_modules existe"
      else
        warn "$dir/node_modules no existe — ejecutando npm install..."
        (cd "$dir" && npm install)
        if [ -d "$dir/node_modules" ]; then
          ok "npm install completado en $dir"
        else
          fail "npm install falló en $dir"
          EXIT_CODE=1
        fi
      fi
    else
      warn "$dir/package.json no existe todavía"
    fi
  else
    warn "Carpeta $dir/ no existe todavía"
  fi
done

# Crear .env desde .env.example si no existe
if [ -f "Backend/.env.example" ] && [ ! -f "Backend/.env" ]; then
  cp Backend/.env.example Backend/.env
  warn ".env creado desde .env.example — revisa las credenciales antes de producción"
fi

echo ""
echo "── 5. Ejecutando tests ─────────────────────────────────"

for dir in Backend App; do
  if [ -f "$dir/package.json" ] && [ -d "$dir/node_modules" ]; then
    echo "   → Ejecutando tests en $dir..."
    if (cd "$dir" && npm test 2>&1); then
      ok "Tests en $dir pasan"
    else
      fail "Tests en $dir fallan"
      EXIT_CODE=1
    fi
  fi
done

echo ""
echo "── 6. Resumen ──────────────────────────────────────────"

if [ $EXIT_CODE -eq 0 ]; then
  ok "Entorno listo. Puedes empezar a trabajar."
else
  fail "Entorno NO está listo. Resuelve los errores antes de avanzar."
fi

exit $EXIT_CODE
