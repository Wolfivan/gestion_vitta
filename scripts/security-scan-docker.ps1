# Security scan wrapper via Docker
$ErrorActionPreference = "Continue"

Write-Host "=== SECURITY SCAN (DOCKER) ===" -ForegroundColor Cyan

docker info | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Docker no disponible. Usa fallback local o instala Docker." -ForegroundColor Red
  exit 1
}

$blockers = 0

Write-Host "`n[1] Gitleaks..." -ForegroundColor Yellow
docker compose -f docker-compose.security-tools.yml run --rm gitleaks 2>&1 | Tee-Object -Variable out1
if ($LASTEXITCODE -ne 0) { $blockers++ }

Write-Host "`n[2] OSV-Scanner..." -ForegroundColor Yellow
docker compose -f docker-compose.security-tools.yml run --rm osv-scanner 2>&1 | Tee-Object -Variable out2
if ($LASTEXITCODE -ne 0) { $blockers++ }

Write-Host "`n[3] Semgrep..." -ForegroundColor Yellow
docker compose -f docker-compose.security-tools.yml run --rm semgrep 2>&1 | Tee-Object -Variable out3
if ($LASTEXITCODE -ne 0) { $blockers++ }

Write-Host "`n[4] Trivy FS..." -ForegroundColor Yellow
docker compose -f docker-compose.security-tools.yml run --rm trivy 2>&1 | Tee-Object -Variable out4
if ($LASTEXITCODE -ne 0) { $blockers++ }

Write-Host "`n=== SECURITY SCAN (DOCKER) END ===" -ForegroundColor Cyan
if ($blockers -gt 0) { Write-Host "BLOCKERS: $blockers" -ForegroundColor Red; exit 1 } else { Write-Host "OK" -ForegroundColor Green; exit 0 }
