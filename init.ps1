# init.ps1 - Verificacion e inicializacion del entorno (PowerShell)

$EXIT_CODE = 0

function ok   { Write-Host "[OK]    $($args[0])" -ForegroundColor Green }
function warn { Write-Host "[WARN]  $($args[0])" -ForegroundColor Yellow }
function fail { Write-Host "[FAIL]  $($args[0])" -ForegroundColor Red }

Write-Host "-- 1. Verificando entorno ----------------------------------------"

$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
  fail "Node.js no esta instalado"
  exit 1
}
ok "node -> $nodeVersion"

$majorVersion = [int]($nodeVersion -replace '[^\d]', '').Substring(0, 2)
if ($majorVersion -lt 20) {
  fail "Se requiere Node.js >= 20.19.x"
  exit 1
}
ok "Version de Node.js compatible"

$npmVersion = npm --version 2>$null
if (-not $npmVersion) {
  fail "npm no esta instalado"
  exit 1
}
ok "npm -> $npmVersion"

Write-Host "`n-- 2. Verificando archivos base del arnes ------------------------"

$baseFiles = @(
  'AGENTS.md', 'feature_list.json', 'progress/current.md',
  'docs/architecture.md', 'docs/conventions.md', 'docs/verification.md',
  'CHECKPOINTS.md', 'init.ps1'
)

foreach ($f in $baseFiles) {
  if (Test-Path -LiteralPath $f) {
    ok "Existe $f"
  } else {
    fail "Falta archivo base: $f"
    $EXIT_CODE = 1
  }
}

Write-Host "`n-- 3. Validando feature_list.json --------------------------------"

try {
  $json = Get-Content 'feature_list.json' -Raw -Encoding UTF8
  $data = $json | ConvertFrom-Json
  $valid = @('pending', 'in_progress', 'done', 'blocked')
  $inProgress = $data.features | Where-Object { $_.status -eq 'in_progress' }
  $count = $data.features.Count

  if ($inProgress.Count -gt 1) {
    fail "Hay $($inProgress.Count) features en in_progress (maximo 1)"
    $EXIT_CODE = 1
  }

  $allValid = $true
  foreach ($f in $data.features) {
    if ($f.status -notin $valid) {
      fail "Estado invalido en feature $($f.id): $($f.status)"
      $allValid = $false
      $EXIT_CODE = 1
    }
  }

  if ($allValid) {
    ok "feature_list.json valido ($count features)"
  }
} catch {
  fail "feature_list.json invalido: $_"
  $EXIT_CODE = 1
}

Write-Host "`n-- 4. Verificando dependencias ------------------------------------"

foreach ($dir in @('Backend', 'App')) {
  if (Test-Path -LiteralPath $dir) {
    $pkg = Join-Path $dir 'package.json'
    $nm = Join-Path $dir 'node_modules'
    if (Test-Path -LiteralPath $pkg) {
      ok "$pkg existe"
      if (Test-Path -LiteralPath $nm) {
        ok "$nm existe"
      } else {
        warn "$nm no existe - ejecutando npm install..."
        Push-Location -LiteralPath $dir
        npm install 2>&1 | Out-Null
        Pop-Location
        if (Test-Path -LiteralPath $nm) {
          ok "npm install completado en $dir"
        } else {
          fail "npm install fallo en $dir"
          $EXIT_CODE = 1
        }
      }
    } else {
      warn "$pkg no existe"
    }
  } else {
    warn "Carpeta $dir no existe"
  }
}

# Crear .env desde .env.example si no existe
$envExample = Join-Path 'Backend' '.env.example'
$envFile = Join-Path 'Backend' '.env'
if ((Test-Path -LiteralPath $envExample) -and -not (Test-Path -LiteralPath $envFile)) {
  Copy-Item -LiteralPath $envExample -Destination $envFile
  warn ".env creado desde .env.example - revisa las credenciales antes de produccion"
}

Write-Host "`n-- 5. Ejecutando tests -------------------------------------------"

foreach ($dir in @('Backend', 'App')) {
  $pkg = Join-Path $dir 'package.json'
  $nm = Join-Path $dir 'node_modules'
  if ((Test-Path -LiteralPath $pkg) -and (Test-Path -LiteralPath $nm)) {
    Write-Host "   -> Ejecutando tests en $dir..."
    Push-Location -LiteralPath $dir
    $result = npm test 2>&1
    $code = $LASTEXITCODE
    Pop-Location

    if ($code -eq 0) {
      ok "Tests en $dir pasan"
    } else {
      Write-Host $result
      fail "Tests en $dir fallan"
      $EXIT_CODE = 1
    }
  }
}

Write-Host "`n-- 6. Resumen ----------------------------------------------------"

if ($EXIT_CODE -eq 0) {
  ok "Entorno listo. Puedes empezar a trabajar."
} else {
  fail "Entorno NO esta listo. Resuelve los errores antes de avanzar."
}

exit $EXIT_CODE
