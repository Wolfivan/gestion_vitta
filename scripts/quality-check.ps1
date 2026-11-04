# Quality gate wrapper (Windows PowerShell)
# Prefiere Docker (reproducible y con duplicacion); si no esta disponible,
# ejecuta tsc + ESLint en local. Devuelve exit 1 si se supera un umbral.
$ErrorActionPreference = "Continue"

Write-Host "=== QUALITY CHECK ===" -ForegroundColor Cyan

$hasDocker = Get-Command docker -ErrorAction SilentlyContinue
if ($hasDocker -and (Test-Path -LiteralPath "docker-compose.quality-tools.yml")) {
  docker info 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) {
    & "$PSScriptRoot\quality-check-docker.ps1"
    exit $LASTEXITCODE
  }
  Write-Host "Docker instalado pero no responde -> modo local" -ForegroundColor Yellow
}

$MAX_WARNINGS = 50
$issues = 0
$projects = @(
  @{ Name = 'Backend'; Dir = 'Backend'; Patterns = @('src/**/*.ts') },
  @{ Name = 'App'; Dir = 'App'; Patterns = @('src/**/*.ts', 'src/**/*.tsx') }
)

foreach ($p in $projects) {
  $dir = $p.Dir
  Write-Host "`n[$($p.Name)]" -ForegroundColor Yellow

  if (-not (Test-Path -LiteralPath (Join-Path $dir 'node_modules'))) {
    Write-Host "  sin node_modules: ejecuta npm install en $dir" -ForegroundColor Red
    $issues++
    continue
  }

  $report = Join-Path $env:TEMP "vittalmind-eslint-$($p.Name).json"
  Push-Location -LiteralPath $dir
  & npx tsc --noEmit --incremental false -p tsconfig.json 2>&1 | Out-Null
  $tscCode = $LASTEXITCODE
  & npx eslint $p.Patterns -f json -o $report 2>&1 | Out-Null
  Pop-Location

  if (-not (Test-Path -LiteralPath $report)) {
    Write-Host "  ESLint no genero reporte (revisa la config)" -ForegroundColor Red
    $issues++
    continue
  }

  $data = Get-Content -LiteralPath $report -Raw | ConvertFrom-Json
  $errors = [int](($data | Measure-Object -Property errorCount -Sum).Sum)
  $warnings = [int](($data | Measure-Object -Property warningCount -Sum).Sum)
  $anyCount = 0
  $consoleCount = 0
  foreach ($file in $data) {
    foreach ($m in $file.messages) {
      if ($m.ruleId -eq '@typescript-eslint/no-explicit-any') { $anyCount++ }
      if ($m.ruleId -eq 'no-console') { $consoleCount++ }
    }
  }

  if ($tscCode -ne 0) {
    Write-Host "  tsc: errores de tipos" -ForegroundColor Red
    $issues++
  } else {
    Write-Host "  tsc: 0 errores" -ForegroundColor Green
  }

  if ($errors -gt 0) {
    Write-Host "  ESLint: $errors errores, $warnings avisos, any=$anyCount, console=$consoleCount" -ForegroundColor Red
    $issues++
  } elseif ($warnings -gt $MAX_WARNINGS) {
    Write-Host "  ESLint: 0 errores pero $warnings avisos (> $MAX_WARNINGS)" -ForegroundColor Red
    $issues++
  } else {
    Write-Host "  ESLint: 0 errores, $warnings avisos, any=$anyCount, console=$consoleCount" -ForegroundColor Green
  }

  Write-Host "  duplicacion: no medida (requiere Docker)" -ForegroundColor DarkGray
}

Write-Host "`n=== QUALITY CHECK END ===" -ForegroundColor Cyan
if ($issues -gt 0) {
  Write-Host "QUALITY GATE: FAIL" -ForegroundColor Red
  exit 1
}
Write-Host "QUALITY GATE: PASS" -ForegroundColor Green
exit 0
