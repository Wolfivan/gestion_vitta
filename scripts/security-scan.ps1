# Security scan wrapper (Windows PowerShell)
# Usa herramientas locales si existen, sino Docker, sino fallback a grep estático

$ErrorActionPreference = "Continue"

$hasGitleaks = Get-Command gitleaks -ErrorAction SilentlyContinue
$hasOsv = Get-Command osv-scanner -ErrorAction SilentlyContinue
$hasSemgrep = Get-Command semgrep -ErrorAction SilentlyContinue
$hasDocker = Get-Command docker -ErrorAction SilentlyContinue

Write-Host "=== SECURITY SCAN ===" -ForegroundColor Cyan
Write-Host "gitleaks: $(if($hasGitleaks){'YES'}else{'NO'})"
Write-Host "osv-scanner: $(if($hasOsv){'YES'}else{'NO'})"
Write-Host "semgrep: $(if($hasSemgrep){'YES'}else{'NO'})"
Write-Host "docker: $(if($hasDocker){'YES'}else{'NO'})"

$blockers = 0
$useDocker = $false

if (-not $hasGitleaks -or -not $hasSemgrep) {
  if ($hasDocker -and (Test-Path -LiteralPath "docker-compose.security-tools.yml")) {
    Write-Host "Faltan herramientas locales -> usando Docker" -ForegroundColor Cyan
    $useDocker = $true
  }
}

if ($useDocker -and -not $hasGitleaks) {
  Write-Host "`n[1] Gitleaks (Docker)..." -ForegroundColor Yellow
  docker compose -f docker-compose.security-tools.yml run --rm gitleaks 2>&1 | Out-Host
  if ($LASTEXITCODE -ne 0) { $blockers++ }
} elseif ($hasGitleaks) {
  Write-Host "`n[1] Gitleaks..." -ForegroundColor Yellow
  gitleaks detect --no-git --redact --exit-code 1 2>&1 | Out-Host
  if ($LASTEXITCODE -ne 0) { $blockers++ }
} else {
  Write-Host "`n[1] Gitleaks not found - fallback grep for secrets..." -ForegroundColor Yellow
  $patterns = @("AKIA[0-9A-Z]{16}","sk_live_","sk_test_","ghp_","xox[baprs]-","BEGIN RSA PRIVATE KEY","BEGIN EC PRIVATE KEY","BEGIN OPENSSH PRIVATE KEY","AuthKey_.*\.p8")
  foreach ($p in $patterns) {
    $m = Get-ChildItem -Path . -Recurse -Include *.ts,*.js,*.json,*.php,*.env*,*.p8,*.pem -File -ErrorAction SilentlyContinue | Select-String -Pattern $p -ErrorAction SilentlyContinue
    if ($m) { Write-Host "POSSIBLE SECRET: $p" -ForegroundColor Red; $blockers++ }
  }
}

if ($useDocker -and -not $hasOsv) {
  Write-Host "`n[2] OSV-Scanner (Docker)..." -ForegroundColor Yellow
  docker compose -f docker-compose.security-tools.yml run --rm osv-scanner 2>&1 | Out-Host
  if ($LASTEXITCODE -ne 0) { $blockers++ }
} elseif ($hasOsv) {
  Write-Host "`n[2] OSV-Scanner..." -ForegroundColor Yellow
  osv-scanner --recursive . 2>&1 | Out-Host
} else {
  Write-Host "`n[2] OSV-Scanner not found - consider npm audit in App/Backend if needed" -ForegroundColor Yellow
}

if ($useDocker -and -not $hasSemgrep) {
  Write-Host "`n[3] Semgrep (Docker)..." -ForegroundColor Yellow
  docker compose -f docker-compose.security-tools.yml run --rm semgrep 2>&1 | Out-Host
  if ($LASTEXITCODE -ne 0) { $blockers++ }
} elseif ($hasSemgrep) {
  Write-Host "`n[3] Semgrep (quick)..." -ForegroundColor Yellow
  semgrep --config auto --error 2>&1 | Out-Host
  if ($LASTEXITCODE -ne 0) { $blockers++ }
} else {
  Write-Host "`n[3] Semgrep not found - fallback grep for dangerous patterns..." -ForegroundColor Yellow
  $danger = @("eval\(","innerHTML","dangerouslySetInnerHTML","child_process","exec\(","spawn\(")
  foreach ($p in $danger) {
    $m = Get-ChildItem -Path App,Backend,plugins -Recurse -Include *.ts,*.tsx,*.js,*.jsx,*.php -File -ErrorAction SilentlyContinue | Select-String -Pattern $p -ErrorAction SilentlyContinue
    if ($m) { Write-Host "DANGEROUS PATTERN: $p" -ForegroundColor Red; $blockers++ }
  }
}

if ($useDocker -and $hasDocker -and (Test-Path -LiteralPath "docker-compose.security-tools.yml")) {
  Write-Host "`n[4] Trivy FS (Docker)..." -ForegroundColor Yellow
  docker compose -f docker-compose.security-tools.yml run --rm trivy 2>&1 | Out-Host
  if ($LASTEXITCODE -ne 0) { $blockers++ }
}

Write-Host "`n=== SECURITY SCAN END ===" -ForegroundColor Cyan
if ($blockers -gt 0) { Write-Host "BLOCKERS: $blockers" -ForegroundColor Red; exit 1 } else { Write-Host "OK" -ForegroundColor Green; exit 0 }
