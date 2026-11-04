# Corre los gates de cierre de una feature en Windows con Docker y guarda la salida
# completa en quality-reports/gates_<fecha>/ para que el agente la lea sin que haya
# que copiar y pegar nada. No hace commits ni toca la base de datos.
#
# Uso (desde la raiz del repo):
#   .\scripts\run-gates.ps1            # init (tests + quality-lite) + security scan
#   .\scripts\run-gates.ps1 -Release   # ademas quality-release (SonarQube)

param(
  [switch]$Release
)

$ErrorActionPreference = "Continue"
Set-Location (Split-Path $PSScriptRoot -Parent)

$stamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$outDir = Join-Path "quality-reports" "gates_$stamp"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function Run-Step($name, [scriptblock]$block) {
  $log = Join-Path $outDir "$name.log"
  Write-Host "`n=== $name ===" -ForegroundColor Cyan
  & $block *>&1 | Tee-Object -FilePath $log | Out-Host
  $code = $LASTEXITCODE
  "$name exit=$code" | Add-Content -Path (Join-Path $outDir "summary.txt")
}

docker info *> $null
"docker=$([int]($LASTEXITCODE -eq 0))" | Set-Content -Path (Join-Path $outDir "summary.txt")

# init sin -Full: el security scan va aparte para tener su codigo de salida propio
# (init -Full solo lo marca como aviso) y no correrlo dos veces.
Run-Step "init" { .\init.ps1 }
Run-Step "security-scan" { .\scripts\security-scan.ps1 }

if ($Release) {
  Run-Step "quality-release" { .\scripts\quality-release.ps1 }
}

Write-Host "`nResultados en $outDir (summary.txt y un .log por paso)." -ForegroundColor Green
Get-Content (Join-Path $outDir "summary.txt")
