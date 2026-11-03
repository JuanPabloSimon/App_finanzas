# init.ps1 - Version para Windows PowerShell de init.sh
# Uso:  powershell -ExecutionPolicy Bypass -File ./init.ps1            verificacion completa
#       powershell -ExecutionPolicy Bypass -File ./init.ps1 -Rapido    sin pruebas

param([switch]$Rapido)

function Ok($m)   { Write-Host "[OK]    $m" -ForegroundColor Green }
function Warn($m) { Write-Host "[WARN]  $m" -ForegroundColor Yellow }
function Fail($m) { Write-Host "[FAIL]  $m" -ForegroundColor Red }

$exitCode = 0
Set-Location $PSScriptRoot

Write-Host "-- 1. Entorno (Node.js / React Native) -----------------"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Fail "node no esta en el PATH"
  exit 1
}
Ok ("Node.js " + (node --version 2>$null))

$npmCmd = if (Get-Command npm.cmd -ErrorAction SilentlyContinue) { "npm.cmd" } else { "npm" }
if (-not (Get-Command $npmCmd -ErrorAction SilentlyContinue)) {
  Fail "npm no esta en el PATH"
  exit 1
}
Ok ("npm v" + (& $npmCmd --version 2>$null))

Write-Host ""
Write-Host "-- 2. Dependencias -------------------------------------"
$hasPackageJson = Test-Path package.json
if ($hasPackageJson) {
  if (Test-Path node_modules) {
    Ok "node_modules presente"
  } else {
    & $npmCmd install | Out-Null
    if ($LASTEXITCODE -eq 0) {
      Ok "Dependencias instaladas"
    } else {
      Fail "npm install fallo"
      $exitCode = 1
    }
  }
} else {
  Fail "No hay package.json en la raiz del proyecto"
  $exitCode = 1
}

Write-Host ""
Write-Host "-- 3. Arnes SDD ----------------------------------------"
node tool/harness_check.mjs
if ($LASTEXITCODE -ne 0) { $exitCode = 1 }

if ($hasPackageJson) {
  Write-Host ""
  Write-Host "-- 4. Analisis estatico (ESLint) -----------------------"
  & $npmCmd run lint
  if ($LASTEXITCODE -eq 0) {
    Ok "eslint sin problemas"
  } else {
    Fail "eslint reporta problemas"
    $exitCode = 1
  }

  Write-Host ""
  Write-Host "-- 5. Pruebas ------------------------------------------"
  if ($Rapido) {
    Warn "Modo rapido: se omiten las pruebas"
  } elseif (Test-Path test) {
    & $npmCmd test
    if ($LASTEXITCODE -eq 0) {
      Ok "Todas las pruebas pasan"
    } else {
      Fail "Hay pruebas rotas"
      $exitCode = 1
    }
  } else {
    Warn "La carpeta test/ no existe todavia (se creara al implementar la primera feature)"
  }
}

Write-Host ""
Write-Host "-- 6. Resumen ------------------------------------------"
if ($exitCode -eq 0) {
  Ok "Entorno listo. Podes empezar a trabajar."
} else {
  Fail "Entorno NO esta listo. Resolve los errores antes de avanzar."
}
exit $exitCode
