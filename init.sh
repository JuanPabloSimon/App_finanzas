#!/usr/bin/env bash
# init.sh — Verificación e inicialización del entorno (Node.js / React Native)
#
# Lo ejecuta el agente al COMENZAR una sesión y antes de declarar cualquier
# tarea como terminada. Si falla, la sesión no avanza.
#
# Uso:  ./init.sh            verificación completa (análisis + pruebas)
#       ./init.sh --rapido   sin pruebas (lo usa el hook de cierre de Claude Code)

set -u
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; NC='\033[0m'
ok()   { printf "${GREEN}[OK]${NC}    %s\n" "$1"; }
warn() { printf "${YELLOW}[WARN]${NC}  %s\n" "$1"; }
fail() { printf "${RED}[FAIL]${NC}  %s\n" "$1"; }

RAPIDO=0
[ "${1:-}" = "--rapido" ] && RAPIDO=1
EXIT_CODE=0
cd "$(dirname "$0")" || exit 1

echo "── 1. Entorno (Node.js / React Native) ─────────────────"
if ! command -v node >/dev/null 2>&1; then
  fail "node no está instalado o no está en el PATH"
  exit 1
fi
ok "Node.js $(node --version 2>/dev/null)"
if ! command -v npm >/dev/null 2>&1; then
  fail "npm no está en el PATH"
  exit 1
fi
ok "npm v$(npm --version 2>/dev/null)"

echo ""
echo "── 2. Dependencias ─────────────────────────────────────"
if [ -f package.json ]; then
  if [ -d node_modules ]; then
    ok "node_modules presente"
  elif npm install >/dev/null 2>&1; then
    ok "Dependencias instaladas"
  else
    fail "npm install falló"
    EXIT_CODE=1
  fi
else
  fail "No hay package.json en la raíz del proyecto"
  EXIT_CODE=1
fi

echo ""
echo "── 3. Arnés SDD ────────────────────────────────────────"
if ! node tool/harness_check.mjs; then
  EXIT_CODE=1
fi

if [ -f package.json ]; then

  echo ""
  echo "── 4. Análisis estático (ESLint) ───────────────────────"
  if npm run lint; then
    ok "eslint sin problemas"
  else
    fail "eslint reporta problemas"
    EXIT_CODE=1
  fi

  echo ""
  echo "── 5. Pruebas ──────────────────────────────────────────"
  if [ "$RAPIDO" -eq 1 ]; then
    warn "Modo rápido: se omiten las pruebas"
  elif [ -d test ]; then
    if npm test; then
      ok "Todas las pruebas pasan"
    else
      fail "Hay pruebas rotas"
      EXIT_CODE=1
    fi
  else
    warn "La carpeta test/ no existe todavía (se creará al implementar la primera feature)"
  fi
fi

echo ""
echo "── 6. Resumen ──────────────────────────────────────────"
if [ $EXIT_CODE -eq 0 ]; then
  ok "Entorno listo. Podés empezar a trabajar."
else
  fail "Entorno NO está listo. Resolvé los errores antes de avanzar."
fi
exit $EXIT_CODE
