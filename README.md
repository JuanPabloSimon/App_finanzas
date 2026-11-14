# Gestor de Gastos Personales — Grupo 3 (ITU 2026)

Aplicación web desarrollada en **React (JavaScript) + Vite**, como **aplicación web responsiva** con enfoque **Mobile First** (navegador móvil y de escritorio), con persistencia local: SQLite (`AppDatabase`, `node:sqlite` en las pruebas) y, en el navegador, `localStorage`.

Permite registrar gastos cotidianos, visualizar su distribución por categoría, detectar gastos recurrentes mediante reglas determinísticas y recibir recomendaciones orientativas de un modelo de lenguaje externo cuidando la privacidad (Ley 25.326).

## Desarrollo guiado por especificaciones (SDD)

Este repositorio utiliza un arnés **Spec Driven Development (SDD)** compatible con **Antigravity** y **Claude Code**:

1. **Mapa de entrada:** [`AGENTS.md`](./AGENTS.md)
2. **Reglas duras:** [`rules.md`](./rules.md)
3. **Historias y estados:** [`feature_list.json`](./feature_list.json)
4. **Documento de Proyecto (Etapas 1, 2 y 3):** [`docs/Proyecto_Tec_Laborales_Grupo_3.pdf`](./docs/Proyecto_Tec_Laborales_Grupo_3.pdf) y resumen operativo en [`docs/product.md`](./docs/product.md)
5. **Verificación del entorno y arnés:**
   - Linux / macOS / Git Bash: `./init.sh`
   - Windows PowerShell: `powershell -ExecutionPolicy Bypass -File ./init.ps1`
