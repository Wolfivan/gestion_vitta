# Release quality gate (Windows PowerShell)
#
# Ejecuta, en este orden:
#   1. quality-lite en Docker (tsc + ESLint + jscpd)    -> debe PASS
#   2. security-scan (gitleaks/osv/semgrep/trivy)       -> debe PASS
#   3. SonarQube en Docker + sonar-scanner por proyecto -> Quality Gate "Sonar way"
#
# Escribe quality-reports/RELEASE_<timestamp>.md y devuelve exit 1 si algo falla.
#
# Si el gate completo pasa (sin -SkipLite ni -SkipSecurity) y App/Backend no
# tienen cambios sin commitear, escribe quality-reports/release-pass.json con el
# tree de HEAD de cada repo. El hook githooks/pre-push lo exige para hacer push
# a main (instalar con .\scripts\install-hooks.ps1).
#
# Uso:
#   .\scripts\quality-release.ps1               # gate completo
#   .\scripts\quality-release.ps1 -SkipSecurity # sin el escaneo de seguridad (mas rapido)
#   .\scripts\quality-release.ps1 -Down         # apaga SonarQube (conserva volumenes)
param(
  [switch]$Down,
  [switch]$SkipLite,
  [switch]$SkipSecurity
)

$ErrorActionPreference = "Continue"

$Compose = "docker-compose.quality-tools.yml"
$ReportsDir = "quality-reports"
$Stamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$ReportPath = Join-Path $ReportsDir "RELEASE_$Stamp.md"
$EnvFile = ".env.sonar"

function Step($message) { Write-Host "`n=== $message ===" -ForegroundColor Cyan }
function Ok($message)   { Write-Host "[OK]    $message" -ForegroundColor Green }
function Warn($message) { Write-Host "[WARN]  $message" -ForegroundColor Yellow }
function Fail($message) { Write-Host "[FAIL]  $message" -ForegroundColor Red }

# SonarQube 9.9 rechaza `Authorization: Bearer <token>` en esta instalacion
# (devuelve valid=false y 401), pero acepta el token como usuario Basic.
# Ver docs/quality-tools-docker.md -> Troubleshooting.
function Get-SonarTokenHeader($sonarToken) {
  $basic = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${sonarToken}:"))
  return @{ Authorization = "Basic $basic" }
}

$Checks = @()
function Add-Check($name, $passed, $detail) {
  $script:Checks += [pscustomobject]@{ Name = $name; Passed = [bool]$passed; Detail = $detail }
  if ($passed) { Ok "$name -> PASS" } else { Fail "$name -> FAIL ($detail)" }
}

function Write-Report($notes) {
  $globalPass = -not ($Checks | Where-Object { -not $_.Passed })
  $verdict = "FAIL"
  if ($globalPass) { $verdict = "PASS" }

  $lines = @()
  $lines += "# RELEASE QUALITY REPORT - $Stamp"
  $lines += ""
  $lines += "## Veredicto: **$verdict**"
  $lines += ""
  $lines += "| Gate | Resultado | Detalle |"
  $lines += "|---|---|---|"
  foreach ($check in $Checks) {
    $result = "FAIL"
    if ($check.Passed) { $result = "PASS" }
    $lines += "| $($check.Name) | $result | $($check.Detail) |"
  }
  $lines += ""
  $lines += "## SonarQube"
  $lines += "- Dashboard: http://localhost:9000"
  $lines += "- Proyectos: vittalmind-backend, vittalmind-app"
  $lines += "- Apagar: .\scripts\quality-release.ps1 -Down (los volumenes se conservan)"
  $lines += ""
  if ($notes) {
    $lines += "## Notas"
    foreach ($note in $notes) { $lines += "- $note" }
    $lines += ""
  }
  $lines += "---"
  $lines += "Generado por scripts/quality-release.ps1."
  Set-Content -LiteralPath $ReportPath -Value ($lines -join "`n") -Encoding UTF8
  Write-Host "`nReporte: $ReportPath" -ForegroundColor Cyan
  return $globalPass
}

# Constancia de PASS para el hook pre-push. Usa el tree (contenido) y no el
# commit, para que sirva tanto con fast-forward como con merge-commit.
function Write-ReleaseStamp {
  if ($SkipLite -or $SkipSecurity) {
    Warn "Gate parcial (-SkipLite/-SkipSecurity): NO se escribe release-pass.json; el push a main seguira bloqueado."
    return
  }
  $trees = @{}
  foreach ($dir in @('Backend', 'App')) {
    $dirty = git -C $dir status --porcelain 2>$null
    if ($dirty) {
      Warn "${dir} tiene cambios sin commitear: NO se escribe release-pass.json. Commitea y vuelve a ejecutar."
      return
    }
    $tree = git -C $dir rev-parse 'HEAD^{tree}' 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $tree) {
      Warn "No se pudo leer HEAD de ${dir}: NO se escribe release-pass.json."
      return
    }
    $trees[$dir.ToLower()] = "$tree".Trim()
  }
  $json = "{`n  `"backend`": `"$($trees['backend'])`",`n  `"app`": `"$($trees['app'])`",`n  `"date`": `"$Stamp`"`n}`n"
  $stampPath = Join-Path (Get-Location).Path (Join-Path $ReportsDir "release-pass.json")
  [System.IO.File]::WriteAllText($stampPath, $json, (New-Object System.Text.UTF8Encoding($false)))
  Ok "Constancia escrita en $ReportsDir/release-pass.json (habilita el push a main de este codigo)"
}

if ($Down) {
  Step "Deteniendo SonarQube"
  docker compose -f $Compose --profile release down
  Ok "Contenedores detenidos (volumenes conservados)"
  exit 0
}

docker info 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Fail "Docker no disponible"
  exit 1
}

New-Item -ItemType Directory -Force -Path $ReportsDir | Out-Null

# ---------------------------------------------------------------------------
# 1. Gate rapido
# ---------------------------------------------------------------------------
if (-not $SkipLite) {
  Step "1/3 Gate rapido (quality-lite)"
  & (Join-Path $PSScriptRoot "quality-check-docker.ps1")
  $liteOk = ($LASTEXITCODE -eq 0)
  Add-Check "quality-lite" $liteOk "tsc + ESLint + jscpd (ver quality-reports/QUALITY_*.md)"
  if (-not $liteOk) {
    $null = Write-Report @("Se aborto antes de SonarQube: quality-lite no pasa.")
    exit 1
  }
}

# ---------------------------------------------------------------------------
# 2. Seguridad
# ---------------------------------------------------------------------------
if (-not $SkipSecurity) {
  Step "2/3 Security scan"
  & (Join-Path $PSScriptRoot "security-scan.ps1")
  $secOk = ($LASTEXITCODE -eq 0)
  Add-Check "security-scan" $secOk "gitleaks + osv-scanner + semgrep + trivy"
  if (-not $secOk) {
    $null = Write-Report @("Se aborto antes de SonarQube: el security scan tiene bloqueantes.")
    exit 1
  }
} else {
  Warn "security-scan omitido (-SkipSecurity)"
  Add-Check "security-scan" $true "omitido por -SkipSecurity"
}

# ---------------------------------------------------------------------------
# 3. SonarQube
# ---------------------------------------------------------------------------
Step "3/3 SonarQube"

Write-Host "Levantando sonar-db + sonarqube (la primera vez descarga ~1-2 GB)..." -ForegroundColor Yellow
docker compose -f $Compose --profile release up -d sonar-db sonarqube
if ($LASTEXITCODE -ne 0) {
  Add-Check "SonarQube" $false "no se pudo levantar el stack"
  $null = Write-Report @("Revisa: docker compose -f $Compose logs sonarqube")
  exit 1
}

$deadline = (Get-Date).AddMinutes(6)
$status = $null
while ((Get-Date) -lt $deadline) {
  try {
    $response = Invoke-RestMethod -Uri "http://localhost:9000/api/system/status" -TimeoutSec 5
    $status = $response.status
    if ($status -eq "UP") { break }
  } catch {
    # SonarQube todavia no escucha en el puerto.
  }
  Write-Host "." -NoNewline
  Start-Sleep -Seconds 5
}
Write-Host ""

if ($status -ne "UP") {
  Add-Check "SonarQube" $false "no llego a UP en 6 minutos"
  $null = Write-Report @("Revisa: docker compose -f $Compose logs sonarqube")
  exit 1
}
Ok "SonarQube UP en http://localhost:9000"

# --- Token: se reutiliza .env.sonar; si no existe o caduco, se genera --------
$token = $null
$adminPassword = $null
if (Test-Path -LiteralPath $EnvFile) {
  foreach ($line in Get-Content -LiteralPath $EnvFile) {
    if ($line -match '^\s*SONAR_TOKEN\s*=\s*(.+)$') { $token = $matches[1].Trim() }
    if ($line -match '^\s*SONAR_ADMIN_PASSWORD\s*=\s*(.+)$') { $adminPassword = $matches[1].Trim() }
  }
}

if ($token) {
  try {
    $validation = Invoke-RestMethod -Uri "http://localhost:9000/api/authentication/validate" -Headers (Get-SonarTokenHeader $token) -TimeoutSec 10
    if (-not $validation.valid) { $token = $null }
  } catch {
    $token = $null
  }
  if (-not $token) { Warn "El token guardado ya no es valido (volumen reiniciado?). Se regenera." }
}

if (-not $token) {
  if (-not $adminPassword) {
    $adminPassword = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 24 | ForEach-Object { [char]$_ })
  }

  $basicDefault = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:admin"))
  try {
    Invoke-RestMethod -Method Post -Uri "http://localhost:9000/api/users/change_password" `
      -Headers @{ Authorization = "Basic $basicDefault" } `
      -Body @{ login = "admin"; previousPassword = "admin"; password = $adminPassword } -TimeoutSec 15 | Out-Null
    Ok "Contrasena por defecto de admin cambiada"
  } catch {
    Warn "No se pudo cambiar la contrasena por defecto (probablemente ya estaba cambiada)"
  }

  $basicAdmin = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin:$adminPassword"))
  try {
    $generated = Invoke-RestMethod -Method Post -Uri "http://localhost:9000/api/user_tokens/generate" `
      -Headers @{ Authorization = "Basic $basicAdmin" } `
      -Body @{ name = "vittalmind-release-$Stamp" } -TimeoutSec 15
    $token = $generated.token
    $envContent = "SONAR_TOKEN=$token`nSONAR_ADMIN_PASSWORD=$adminPassword"
    $envPath = Join-Path (Get-Location).Path $EnvFile
    [System.IO.File]::WriteAllText($envPath, $envContent, (New-Object System.Text.UTF8Encoding($false)))
    Ok "Token generado y guardado en $EnvFile"
  } catch {
    Add-Check "SonarQube token" $false "no se pudo generar automaticamente"
    $null = Write-Report @(
      "Crea el token a mano: entra en http://localhost:9000, inicia sesion como admin,",
      "ve a My Account > Security > Generate Tokens y guarda el valor en .env.sonar como SONAR_TOKEN=...",
      "Despues vuelve a lanzar .\scripts\quality-release.ps1"
    )
    exit 1
  }
}

# --- Escaneo por proyecto ---------------------------------------------------
$projects = @(
  @{ Key = "vittalmind-backend"; Dir = "Backend" },
  @{ Key = "vittalmind-app"; Dir = "App" }
)

# --- Cobertura -----------------------------------------------------------------
# Sonar lee coverage/lcov.info, que solo existe si jest corre con --coverage.
# Las pruebas corren en el host (node_modules de Windows) y el scanner en Docker
# con el repo en /repo, asi que las rutas SF: se dejan relativas al proyecto.
function New-LcovReport($dir) {
  $projectPath = (Resolve-Path $dir).Path
  $lcov = Join-Path $projectPath "coverage\lcov.info"
  if (Test-Path $lcov) { Remove-Item $lcov -Force }
  Push-Location $projectPath
  try {
    $testOutput = & npx jest --coverage --coverageReporters=lcov --passWithNoTests --silent 2>&1
    $testCode = $LASTEXITCODE
  } finally {
    Pop-Location
  }
  $testOutput | Select-Object -Last 6 | ForEach-Object { Write-Host "  $_" }
  if ($testCode -ne 0 -or -not (Test-Path $lcov)) { return $false }
  $prefix = $projectPath.TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar
  $lines = Get-Content -LiteralPath $lcov | ForEach-Object {
    if ($_.StartsWith('SF:')) {
      $file = $_.Substring(3)
      if ($file.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)) { $file = $file.Substring($prefix.Length) }
      'SF:' + ($file -replace '\\', '/')
    } else { $_ }
  }
  [System.IO.File]::WriteAllLines($lcov, [string[]]$lines, (New-Object System.Text.UTF8Encoding($false)))
  return $true
}

foreach ($project in $projects) {
  Step "Cobertura: $($project.Dir)"
  if (New-LcovReport $project.Dir) {
    Ok "coverage/lcov.info generado"
  } else {
    Add-Check "Cobertura $($project.Dir)" $false "jest --coverage fallo o no genero coverage/lcov.info"
  }

  Step "Sonar scan: $($project.Dir)"
  $output = docker compose -f $Compose --profile release run --rm `
    -e "SONAR_TOKEN=$token" `
    sonar-scanner `
    "-Dsonar.projectBaseDir=/repo/$($project.Dir)" `
    "-Dsonar.working.directory=/tmp/scannerwork" 2>&1
  $scanCode = $LASTEXITCODE
  $output | Select-Object -Last 12 | ForEach-Object { Write-Host "  $_" }

  if ($scanCode -ne 0) {
    Add-Check "Sonar $($project.Dir)" $false "sonar-scanner fallo (exit $scanCode)"
    continue
  }

  # El reporte se procesa en segundo plano: hay que esperar al Compute Engine
  # antes de consultar el Quality Gate, o la consulta llega antes del analisis.
  $taskMatch = [regex]::Match($(if ($output) { $output -join "`n" } else { "" }), 'api/ce/task\?id=([A-Za-z0-9_-]+)')
  if ($taskMatch.Success) {
    $taskId = $taskMatch.Groups[1].Value
    $ceDeadline = (Get-Date).AddMinutes(5)
    $ceStatus = $null
    while ((Get-Date) -lt $ceDeadline) {
      try {
        $ceTask = Invoke-RestMethod -Uri "http://localhost:9000/api/ce/task?id=$taskId" `
          -Headers (Get-SonarTokenHeader $token) -TimeoutSec 15
        $ceStatus = $ceTask.task.status
        if ($ceStatus -eq "SUCCESS" -or $ceStatus -eq "FAILED" -or $ceStatus -eq "CANCELED") { break }
      } catch {
        # La tarea puede tardar unos segundos en ser consultable.
      }
      Start-Sleep -Seconds 5
    }
    if ($ceStatus -ne "SUCCESS") {
      Add-Check "Sonar $($project.Dir)" $false "procesamiento del reporte: $ceStatus"
      continue
    }
  }

  try {
    $gate = Invoke-RestMethod -Uri "http://localhost:9000/api/qualitygates/project_status?projectKey=$($project.Key)" `
      -Headers (Get-SonarTokenHeader $token) -TimeoutSec 30
    $gateStatus = $gate.projectStatus.status
    $failedConditions = @($gate.projectStatus.conditions | Where-Object { $_.status -eq "ERROR" })
    $detail = $gateStatus
    if ($failedConditions.Count -gt 0) {
      $detail = ($failedConditions | ForEach-Object { "$($_.metricKey)=$($_.actualValue) (umbral $($_.errorThreshold))" }) -join "; "
    }
    Add-Check "Sonar $($project.Dir)" ($gateStatus -eq "OK") $detail
  } catch {
    Add-Check "Sonar $($project.Dir)" $false "no se pudo consultar el Quality Gate: $($_.Exception.Message)"
  }
}

$globalPass = Write-Report @()
if ($globalPass) {
  Write-ReleaseStamp
  Write-Host "`n=== RELEASE GATE: PASS ===" -ForegroundColor Green
  exit 0
}
Write-Host "`n=== RELEASE GATE: FAIL ===" -ForegroundColor Red
exit 1
