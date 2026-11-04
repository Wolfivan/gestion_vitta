# Quality gate "lite" via Docker (Windows PowerShell)
# Ejecuta tsc + ESLint + jscpd dentro del contenedor y escribe el reporte en
# quality-reports/QUALITY_<timestamp>.md
$ErrorActionPreference = "Continue"

Write-Host "=== QUALITY GATE (DOCKER) ===" -ForegroundColor Cyan

docker info 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Docker no disponible. Usa scripts/quality-check.ps1 (modo local)." -ForegroundColor Red
  exit 1
}

if (-not (Test-Path -LiteralPath "docker-compose.quality-tools.yml")) {
  Write-Host "Falta docker-compose.quality-tools.yml" -ForegroundColor Red
  exit 1
}

New-Item -ItemType Directory -Force -Path "quality-reports" | Out-Null

Write-Host "`n[1/2] Construyendo imagen (cacheada tras la primera vez)..." -ForegroundColor Yellow
docker compose -f docker-compose.quality-tools.yml --profile quality build quality-lite
if ($LASTEXITCODE -ne 0) {
  Write-Host "No se pudo construir la imagen quality-lite" -ForegroundColor Red
  exit 1
}

Write-Host "`n[2/2] Ejecutando gate..." -ForegroundColor Yellow
docker compose -f docker-compose.quality-tools.yml --profile quality run --rm quality-lite
$code = $LASTEXITCODE

Write-Host "`n=== QUALITY GATE (DOCKER) END ===" -ForegroundColor Cyan
if ($code -ne 0) {
  Write-Host "QUALITY GATE: FAIL (ver quality-reports/)" -ForegroundColor Red
} else {
  Write-Host "QUALITY GATE: PASS" -ForegroundColor Green
}
exit $code
