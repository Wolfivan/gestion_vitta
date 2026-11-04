#!/usr/bin/env bash
# Quality gate "lite" vía Docker (Linux/macOS)
# Ejecuta tsc + ESLint + jscpd dentro del contenedor y escribe el reporte en
# quality-reports/QUALITY_<timestamp>.md
set -u

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

echo "=== QUALITY GATE (DOCKER) ==="

if ! docker info >/dev/null 2>&1; then
  printf "${RED}Docker no disponible. Usa scripts/quality-check.sh (modo local).${NC}\n"
  exit 1
fi

if [ ! -f docker-compose.quality-tools.yml ]; then
  printf "${RED}Falta docker-compose.quality-tools.yml${NC}\n"
  exit 1
fi

mkdir -p quality-reports

printf "${YELLOW}\n[1/2] Construyendo imagen (cacheada tras la primera vez)...${NC}\n"
if ! docker compose -f docker-compose.quality-tools.yml --profile quality build quality-lite; then
  printf "${RED}No se pudo construir la imagen quality-lite${NC}\n"
  exit 1
fi

printf "${YELLOW}\n[2/2] Ejecutando gate...${NC}\n"
docker compose -f docker-compose.quality-tools.yml --profile quality run --rm quality-lite
CODE=$?

echo ""
if [ $CODE -ne 0 ]; then
  printf "${RED}QUALITY GATE: FAIL (ver quality-reports/)${NC}\n"
else
  printf "${GREEN}QUALITY GATE: PASS${NC}\n"
fi
exit $CODE
