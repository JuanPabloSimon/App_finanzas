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


## 2026-11-10 — H3 (`h03_listado_mensual`) completada bajo SDD
- **Agente:** Antigravity (`leader` → `spec_author` → `implementer` → `reviewer`) con Juan Pablo.
- **Aprobación de spec:** `H3 aprobado por Juan Pablo el 2026-11-10`.
- **Cambios:**
  - Especificación SDD completa en `specs/h03_listado_mensual/{requirements,design,tasks}.md` (8 requisitos `R1..R8`, 7 tareas `T1..T7`).
  - Utilidades de calendario `isValidYearMonth`, `shiftYearMonth` y `formatYearMonthLabel` en `src/core/dates.js`.
  - Barra de navegación mensual (`prev-month-button`, `active-month-label`, `next-month-button` con tope en el mes actual) y estado vacío con acceso directo a la carga (`empty-state-cta-button` / `activateEmptyStateCta`) en `src/features/expenses/ExpenseFormScreen.jsx`.
  - 7 pruebas nuevas etiquetadas (`[H3-R1]`..`[H3-R8]`) en `test/domain/models/expense.test.js`, `test/data/sqliteExpenseRepository.test.js` y `test/features/expenses/ExpenseFormScreen.test.jsx`.
- **Verificación:** `reviewer` emitió `APPROVED` en `progress/review_h03_listado_mensual.md`; `./init.ps1`, `eslint` y `npm test` (46/46 pruebas en 6 suites) en verde.
- **Cierre:** `h03_listado_mensual` marcada `done` en `feature_list.json`. Próxima feature en orden: `H5 — h05_ingreso_mensual` (`orden: 5`).


## 2026-11-10 — H5 (`h05_ingreso_mensual`) + Panel de Resumen General, Cuenta Local, Registro de Inversiones, Recordatorios y Paleta Corporativa
- **Agente:** Antigravity (`leader` → `spec_author` → `implementer` → `reviewer`) con Juan Pablo.
- **Aprobación de spec:** `H5 aprobado por Juan Pablo el 2026-11-10`.
- **Cambios:**
  - Tema corporativo sobrio (`src/core/theme.js`, Azul Marino `#0F2942` y Marrón Oscuro `#4A3525`).
  - Modelos inmutables `MonthlyIncome`, `Investment`, `Reminder` y `UserAccount`, migración SQLite v2 y repositorios SQLite en `src/data/repositories/sqliteMonthlyIncomeRepository.js`.
  - Pantalla `MonthlyOverviewScreen` (`src/features/income/MonthlyOverviewScreen.jsx`) con KPIs del mes (Ingresos, Gastos, Inversiones, Balance disponible), distribución por categoría con porcentaje sobre el ingreso (`CA1`/`CA2`), registro de inversiones para control de capital (Plazo Fijo, FCI, CEDEAR), recordatorios de vencimiento y consejos orientativos.
  - Integración de Login/Registro de cuenta local y botón de Cuenta Demo con datos precargados + persistencia en `localStorage` en `src/app/AppShell.jsx` y `src/App.jsx`.
  - Configuración del skill `frontend-design` en `.agents/skills/frontend-design/SKILL.md` (y `.antigravity/skills/SKILL.md`) y aplicación de estética de Estado Patrimonial (tipografía editorial `Newsreader` + `Plus Jakarta Sans`, `tabular-nums`, plancha contable unificada y barras de asignación de capital).
  - 15 pruebas nuevas etiquetadas (`[H5-R1]`..`[H5-R8]`) en 3 suites nuevas (total: 61 pruebas en 9 suites).
- **Verificación:** `reviewer` emitió `APPROVED` en `progress/review_h05_ingreso_mensual.md`; `./init.ps1`, `eslint` y `npm test` (61/61) en verde.
- **Cierre:** `h05_ingreso_mensual` marcada `done` en `feature_list.json`. Próxima feature en orden: `H6 — h06_grafico_categorias` (`orden: 6`).


## 2026-11-10 — H6 (`h06_grafico_categorias`) — Gráfico de distribución por categoría
- **Agente:** Antigravity (`leader` → `spec_author` → `implementer` → `reviewer`) con Juan Pablo.
- **Aprobación de spec:** `H6 aprobado por Juan Pablo el 2026-11-10`.
- **Cambios:**
  - Extensión de `calculateCategoryIncomeBreakdown` en `src/domain/models/monthlyIncome.js` con `expenseCount`, `expensePercentage` (con compensación de redondeo para sumar `100 %` exacto), `colorHex` (`CHART_PALETTE`) y desempate alfabético.
  - Nuevo componente `CategoryDistributionChart` (`src/features/income/CategoryDistributionChart.jsx`) con gráfico anular SVG (`category-donut-svg`), barra apilada, detalle por categoría, fila de conciliación (`100 %` = total del listado) y estado vacío con botón de acción directa.
  - Integración en `src/features/income/MonthlyOverviewScreen.jsx` con recálculo inmediato al agregar, editar o eliminar gastos o al cambiar de mes.
  - 5 pruebas nuevas etiquetadas (`[H6-R1]`..`[H6-R8]`) en `test/domain/models/monthlyIncome.test.js` y `test/features/income/MonthlyOverviewScreen.test.jsx` (total: 66 pruebas en 9 suites).
- **Verificación:** `reviewer` emitió `APPROVED` en `progress/review_h06_grafico_categorias.md`; `./init.ps1`, `eslint` y `npm test` (66/66) en verde.
- **Cierre:** `h06_grafico_categorias` marcada `done` en `feature_list.json`. Próxima feature en orden: `H4 — h04_categorias_propias` (`orden: 7`).
