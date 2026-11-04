#!/usr/bin/env bash
# Quality gate wrapper (Linux/macOS)
# Prefiere Docker (reproducible y con duplicación); si no está disponible,
# ejecuta tsc + ESLint en local. Devuelve exit 1 si se supera un umbral.
set -u

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

MAX_WARNINGS=50

echo "=== QUALITY CHECK ==="

if command -v docker >/dev/null 2>&1 && [ -f docker-compose.quality-tools.yml ]; then
  if docker info >/dev/null 2>&1; then
    "$(dirname "$0")/quality-check-docker.sh"
    exit $?
  fi
  printf "${YELLOW}Docker instalado pero no responde -> modo local${NC}\n"
fi

ISSUES=0

for PROJECT in Backend App; do
  echo ""
  printf "${YELLOW}[%s]${NC}\n" "$PROJECT"

  if [ ! -d "$PROJECT/node_modules" ]; then
    printf "${RED}  sin node_modules: ejecuta npm install en %s${NC}\n" "$PROJECT"
    ISSUES=$((ISSUES + 1))
    continue
  fi

  if [ "$PROJECT" = "App" ]; then
    PATTERNS=("src/**/*.ts" "src/**/*.tsx")
  else
    PATTERNS=("src/**/*.ts")
  fi

  REPORT="/tmp/vittalmind-eslint-$PROJECT.json"
  ( cd "$PROJECT" && npx tsc --noEmit --incremental false -p tsconfig.json >/dev/null 2>&1 )
  TSC_CODE=$?
  ( cd "$PROJECT" && npx eslint "${PATTERNS[@]}" -f json -o "$REPORT" >/dev/null 2>&1 )

  if [ ! -f "$REPORT" ]; then
    printf "${RED}  ESLint no generó reporte (revisa la config)${NC}\n"
    ISSUES=$((ISSUES + 1))
    continue
  fi

  STATS=$(node -e "
    const r = require('$REPORT');
    const e = r.reduce((a, f) => a + f.errorCount, 0);
    const w = r.reduce((a, f) => a + f.warningCount, 0);
    const any = r.flatMap(f => f.messages).filter(m => m.ruleId === '@typescript-eslint/no-explicit-any').length;
    const con = r.flatMap(f => f.messages).filter(m => m.ruleId === 'no-console').length;
    console.log(e + ' ' + w + ' ' + any + ' ' + con);
  ")
  read -r ERRORS WARNINGS ANY CONSOLE <<< "$STATS"

  if [ "$TSC_CODE" -ne 0 ]; then
    printf "${RED}  tsc: errores de tipos${NC}\n"
    ISSUES=$((ISSUES + 1))
  else
    printf "${GREEN}  tsc: 0 errores${NC}\n"
  fi

  if [ "$ERRORS" -gt 0 ] || [ "$WARNINGS" -gt "$MAX_WARNINGS" ]; then
    printf "${RED}  ESLint: %s errores, %s avisos, any=%s, console=%s${NC}\n" "$ERRORS" "$WARNINGS" "$ANY" "$CONSOLE"
    ISSUES=$((ISSUES + 1))
  else
    printf "${GREEN}  ESLint: 0 errores, %s avisos, any=%s, console=%s${NC}\n" "$WARNINGS" "$ANY" "$CONSOLE"
  fi

  printf "  duplicación: no medida (requiere Docker)\n"
done

echo ""
if [ "$ISSUES" -gt 0 ]; then
  printf "${RED}QUALITY GATE: FAIL${NC}\n"
  exit 1
fi
printf "${GREEN}QUALITY GATE: PASS${NC}\n"
exit 0
