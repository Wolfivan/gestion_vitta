# Quality check wrapper (Windows PowerShell)
# Static checks aligned with quality-gate

$ErrorActionPreference = "Continue"

Write-Host "=== QUALITY CHECK ===" -ForegroundColor Cyan

$issues = 0

# console.log/debug in App/Backend (non-test)
Write-Host "`n[1] console/debug..." -ForegroundColor Yellow
$logs = Get-ChildItem -Path App,Backend -Recurse -Include *.ts,*.tsx,*.js -File -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch "__tests__|\.test\.|\.spec\." } | Select-String -Pattern "console\.(log|debug|trace)" -ErrorAction SilentlyContinue
if ($logs) { Write-Host "Found console.log/debug in non-test files" -ForegroundColor Yellow; $issues++ }

# any
Write-Host "`n[2] 'any' usage..." -ForegroundColor Yellow
$anys = Get-ChildItem -Path App,Backend -Recurse -Include *.ts,*.tsx -File -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch "__tests__|\.test\.|\.spec\." } | Select-String -Pattern ": any\b|\bas any\b" -ErrorAction SilentlyContinue
if ($anys) { Write-Host "Found 'any' usage (review)" -ForegroundColor Yellow; $issues++ }

# TODO/FIXME
Write-Host "`n[3] TODO/FIXME/XXX..." -ForegroundColor Yellow
$todos = Get-ChildItem -Path App,Backend,plugins -Recurse -Include *.ts,*.tsx,*.js,*.php -File -ErrorAction SilentlyContinue | Select-String -Pattern "TODO|FIXME|XXX" -ErrorAction SilentlyContinue
if ($todos) { Write-Host "Found TODO/FIXME/XXX (review context)" -ForegroundColor Yellow }

# eval/dangerous
Write-Host "`n[4] Dangerous patterns..." -ForegroundColor Yellow
$danger = Get-ChildItem -Path App,Backend -Recurse -Include *.ts,*.tsx,*.js -File -ErrorAction SilentlyContinue | Select-String -Pattern "eval\(|innerHTML|dangerouslySetInnerHTML" -ErrorAction SilentlyContinue
if ($danger) { Write-Host "DANGEROUS: eval/innerHTML/dangerouslySetInnerHTML" -ForegroundColor Red; $issues++ }

Write-Host "`n=== QUALITY CHECK END ===" -ForegroundColor Cyan
if ($issues -gt 0) { Write-Host "ISSUES: $issues (review)" -ForegroundColor Yellow; exit 0 } else { Write-Host "OK" -ForegroundColor Green; exit 0 }
