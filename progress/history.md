# Bitácora histórica (append-only)

> Cada vez que se cierra una sesión, su resumen se agrega acá.
> No se editan entradas anteriores.

---

## 2026-10-24 — Iteración 1 (previa al arnés)
- **Agente:** equipo, sin arnés SDD.
- **Cambios:** entorno Flutter, base SQLite, registro de gastos, listado mensual, ingreso
  mensual y aviso de privacidad (H1, H2, H3, H5, H12).
- **Verificación:** hito «primer incremento funcional» cumplido el 24/10/2026.
- **Cierre:** historias marcadas `done` con `sdd: false` (legacy).

## 2026-10-28 — Adopción del arnés SDD
- **Agente:** humano (equipo) con asistencia de IA.
- **Cambios:** `AGENTS.md`, `CLAUDE.md`, `rules.md`, `feature_list.json`, `docs/`,
  `.claude/`, `.agents/`, `.antigravity/`, `tool/harness_check.dart`, `init.sh`, `init.ps1`.
- **Spec de ejemplo:** `specs/h09_deteccion_recurrencias/` en `spec_ready`.
- **Pendiente:** calibrar estados de la iteración 2 y aprobar el spec de H9.

## 2026-11-02 — Alineación tecnológica a React Native (Mobile + Desktop, Mobile First) y reinicio SDD
- **Agente:** Antigravity con equipo humano.
- **Cambios:**
  - Actualización integral de `AGENTS.md`, `rules.md`, `CLAUDE.md`, `CHECKPOINTS.md`, `docs/*`, `.agents/*`, `.antigravity/*`, `.claude/*` y `specs/*` al stack **React Native (JavaScript)** con **Expo** (Mobile + React Native Web / Electron / Tauri para Desktop) y **React Native CLI** (`react-native-windows` / `react-native-macos`), diseño **Mobile First** y persistencia local con **`expo-sqlite`**.
  - Migración del verificador del arnés a Node.js (`tool/harness_check.mjs`) y actualización de `init.sh` e `init.ps1`.
  - Actualización de `feature_list.json`: todas las historias `H1`..`H12` pasan a `"status": "pending"` y `"sdd": true` con orden secuencial `1..12`.
- **Verificación:** `node tool/harness_check.mjs` y `./init.ps1` en verde.
- **Pendiente:** iniciar el flujo SDD con `/siguiente-feature` (comenzando por `H12 — h12_aviso_privacidad`, `orden: 1`).

## 2026-11-03 — H12 (`h12_aviso_privacidad`) completada bajo SDD
- **Agente:** Antigravity (`leader` → `spec_author` → `implementer` → `reviewer`) con Juan Pablo.
- **Aprobación de spec:** `H12 aprobado por Juan Pablo el 2026-11-03`.
- **Cambios:**
  - Especificación SDD completa en `specs/h12_aviso_privacidad/{requirements,design,tasks}.md` (8 requisitos `R1..R8`, 11 tareas `T1..T11`).
  - Infraestructura base (`src/core/{errors,dates,responsive}.js`), modelo de dominio inmutable `Consent` y contrato `ConsentRepository` (`src/domain/`).
  - Base SQLite local con migración v1 (`src/data/db/appDatabase.js`, `src/data/repositories/sqliteConsentRepository.js`).
  - Pantalla Mobile First + Desktop `PrivacyNoticeScreen` (`src/features/privacy/PrivacyNoticeScreen.jsx`) y guardia de acceso `AppShell` (`src/app/AppShell.jsx`, `src/App.jsx`).
  - Suite de 14 pruebas etiquetadas (`[H12-R1]`..`[H12-R8]`) en `test/domain/models/consent.test.js`, `test/data/sqliteConsentRepository.test.js` y `test/features/privacy/PrivacyNoticeScreen.test.jsx` + loader ESM nativo `tool/jsx_loader.mjs`.
- **Verificación:** `reviewer` emitió `APPROVED` en `progress/review_h12_aviso_privacidad.md`; `./init.ps1`, `eslint` y `npm test` (14/14) en verde.
- **Cierre:** `h12_aviso_privacidad` marcada `done` en `feature_list.json`. Próxima feature en orden: `H1 — h01_registrar_gasto` (`orden: 2`).


## 2026-11-06 — H1 (`h01_registrar_gasto`) completada bajo SDD
- **Agente:** Antigravity (`leader` → `spec_author` → `implementer` → `reviewer`) con Juan Pablo.
- **Aprobación de spec:** `H1 aprobado por Juan Pablo el 2026-11-06`.
- **Cambios:**
  - Especificación SDD completa en `specs/h01_registrar_gasto/{requirements,design,tasks}.md` (8 requisitos `R1..R8`, 9 tareas `T1..T9`), alineada con el objetivo SMART **OE1** (`K1 ≤ 15 s` con fecha del día por defecto y categorías frecuentes primero).
  - Utilidades y excepciones en `src/core/{errors,dates,formatters}.js` (`InvalidAmount`, `InvalidExpenseDate`, `InvalidCategory`, `isValidIsoDate`, `formatIsoDate`, `extractYearMonth`, `parseAmountToCents`, `formatCentsToArs`).
  - Modelos de dominio inmutables `Category` y `Expense` (`src/domain/models/`) y contratos `CategoryRepository` y `ExpenseRepository` (`src/domain/repositories/`).
  - Repositorios SQLite `SqliteCategoryRepository` y `SqliteExpenseRepository` (`src/data/repositories/`).
  - Pantalla Mobile First + Desktop `ExpenseFormScreen` (`src/features/expenses/ExpenseFormScreen.jsx`) integrada en `AppShell` (`src/app/AppShell.jsx`).
  - 15 pruebas nuevas etiquetadas (`[H1-R1]`..`[H1-R8]`) en `test/domain/models/expense.test.js`, `test/data/sqliteExpenseRepository.test.js` y `test/features/expenses/ExpenseFormScreen.test.jsx`.
- **Verificación:** `reviewer` emitió `APPROVED` en `progress/review_h01_registrar_gasto.md`; `./init.ps1`, `eslint` y `npm test` (29/29 pruebas en 6 suites) en verde.
- **Cierre:** `h01_registrar_gasto` marcada `done` en `feature_list.json`. Próxima feature en orden: `H2 — h02_editar_eliminar_gasto` (`orden: 3`).


## 2026-11-10 — H2 (`h02_editar_eliminar_gasto`) completada bajo SDD
- **Agente:** Antigravity (`leader` → `spec_author` → `implementer` → `reviewer`) con Juan Pablo.
- **Aprobación de spec:** `H2 aprobado por Juan Pablo el 2026-11-10`.
- **Cambios:**
  - Especificación SDD completa en `specs/h02_editar_eliminar_gasto/{requirements,design,tasks}.md` (8 requisitos `R1..R8`, 8 tareas `T1..T8`).
  - Excepción `ExpenseNotFound` en `src/core/errors.js`, helper `formatCentsToInput` en `src/core/formatters.js` y extensión del contrato `ExpenseRepository` con `findById`, `update` y `deleteById` (`src/domain/repositories/expenseRepository.js`).
  - Implementación SQL parametrizada de `findById`, `update` (preservando `created_at` y actualizando `updated_at`) y `deleteById` (borrado físico) en `src/data/repositories/sqliteExpenseRepository.js`.
  - Extensión de `ExpenseFormScreen` y `ExpenseFormController` (`src/features/expenses/ExpenseFormScreen.jsx`) con modo edición, cancelación de edición, confirmación explícita inline antes de eliminar y resumen con recálculo en vivo del total mensual (`month-total-amount`).
  - 10 pruebas nuevas etiquetadas (`[H2-R1]`..`[H2-R8]`) en `test/domain/models/expense.test.js`, `test/data/sqliteExpenseRepository.test.js` y `test/features/expenses/ExpenseFormScreen.test.jsx`.
- **Verificación:** `reviewer` emitió `APPROVED` en `progress/review_h02_editar_eliminar_gasto.md`; `./init.ps1`, `eslint` y `npm test` (39/39 pruebas en 6 suites) en verde.
- **Cierre:** `h02_editar_eliminar_gasto` marcada `done` en `feature_list.json`. Próxima feature en orden: `H3 — h03_listado_mensual` (`orden: 4`).
