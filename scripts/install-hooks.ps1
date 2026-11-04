# Instala el hook pre-push (githooks/pre-push) en App/ y Backend/.
# Bloquea el push a main si el codigo no paso scripts/quality-release.ps1.
# Uso: .\scripts\install-hooks.ps1   (desde la raiz del repo)
$ErrorActionPreference = "Continue"

foreach ($dir in @('Backend', 'App')) {
  if (-not (Test-Path -LiteralPath (Join-Path $dir '.git'))) {
    Write-Host "[WARN]  $dir no es un repo git (omitido)" -ForegroundColor Yellow
    continue
  }
  git -C $dir config core.hooksPath ../githooks
  if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK]    Hook pre-push instalado en $dir (core.hooksPath=../githooks)" -ForegroundColor Green
  } else {
    Write-Host "[FAIL]  No se pudo configurar core.hooksPath en $dir" -ForegroundColor Red
  }
}
