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

- **Agente:** Claude (`leader` → `spec_author` → `implementer` → `reviewer`) con Francisco.
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

- **Agente:** Antigravity (`leader` → `spec_author` → `implementer` → `reviewer`) con Alejo.
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

- **Agente:** Antigravity (`leader` → `spec_author` → `implementer` → `reviewer`) con Alejo.
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

- **Agente:** Antigravity (`leader` → `spec_author` → `implementer` → `reviewer`) con Francisco.
- **Aprobación de spec:** `H6 aprobado por Juan Pablo el 2026-11-10`.
- **Cambios:**
  - Extensión de `calculateCategoryIncomeBreakdown` en `src/domain/models/monthlyIncome.js` con `expenseCount`, `expensePercentage` (con compensación de redondeo para sumar `100 %` exacto), `colorHex` (`CHART_PALETTE`) y desempate alfabético.
  - Nuevo componente `CategoryDistributionChart` (`src/features/income/CategoryDistributionChart.jsx`) con gráfico anular SVG (`category-donut-svg`), barra apilada, detalle por categoría, fila de conciliación (`100 %` = total del listado) y estado vacío con botón de acción directa.
  - Integración en `src/features/income/MonthlyOverviewScreen.jsx` con recálculo inmediato al agregar, editar o eliminar gastos o al cambiar de mes.
  - 5 pruebas nuevas etiquetadas (`[H6-R1]`..`[H6-R8]`) en `test/domain/models/monthlyIncome.test.js` y `test/features/income/MonthlyOverviewScreen.test.jsx` (total: 66 pruebas en 9 suites).
- **Verificación:** `reviewer` emitió `APPROVED` en `progress/review_h06_grafico_categorias.md`; `./init.ps1`, `eslint` y `npm test` (66/66) en verde.
- **Cierre:** `h06_grafico_categorias` marcada `done` en `feature_list.json`. Próxima feature en orden: `H4 — h04_categorias_propias` (`orden: 7`).

## 2026-11-11 — H4 (`h04_categorias_propias`) — Crear categorías propias

- **Agente:** Antigravity (`leader` → `spec_author` → `implementer` → `reviewer`) con Alejo.
- **Aprobación de spec:** `H4 aprobado por Juan Pablo el 2026-11-11`.
- **Cambios:**
  - Especificación SDD completa en `specs/h04_categorias_propias/{requirements,design,tasks}.md` (8 requisitos `R1..R8`, 8 tareas `T1..T8`).
  - Excepciones de dominio `DuplicateCategory`, `CategoryNotFound`, `PredefinedCategoryDeletionNotAllowed` y `CategoryInUse` en `src/core/errors.js`, soporte de borradores inmutables en `Category` (`src/domain/models/category.js`) y extensión de contratos `CategoryRepository` y `ExpenseRepository`.
  - Persistencia SQLite en `src/data/repositories/sqliteCategoryRepository.js` (`findByName`, `save`, `countExpenses`, `deleteById`) y `src/data/repositories/sqliteExpenseRepository.js` (`countByCategoryId`, `reassignCategory`) con unicidad `COLLATE NOCASE`, protección de predefinidas y reasignación de gastos antes del `DELETE`.
  - Sección de gestión de categorías propias en `src/features/expenses/ExpenseFormScreen.jsx` y sincronización con `src/features/income/MonthlyOverviewScreen.jsx`, disponibilidad inmediata en el selector de carga, flujo de reasignación de gastos y diseño Mobile First + Desktop.
  - 10 pruebas nuevas etiquetadas (`[H4-R1]`..`[H4-R8]`) en `test/domain/models/expense.test.js`, `test/data/sqliteExpenseRepository.test.js` y `test/features/expenses/ExpenseFormScreen.test.jsx` (total: 76 pruebas en 9 suites).
- **Verificación:** `reviewer` emitió `APPROVED` en `progress/review_h04_categorias_propias.md`; `./init.ps1`, `eslint` y `npm test` (76/76) en verde.
- **Cierre:** `h04_categorias_propias` marcada `done` en `feature_list.json`. Próxima feature en orden: `H8 — h08_ranking_categorias` (`orden: 8`).

## 2026-11-11 — H13 (`h13_refactor_ux_gestix`) — Refactor UX Ge$tix: dashboard sin scroll, navegación inferior en tarjetas, header limpio con perfil y contraste de monto

- **Agente:** Antigravity (`leader` → `spec_author` → `implementer` → `reviewer`) con Juan Pablo.
- **Aprobación de spec:** `H13 aprobado por Juan Pablo el 2026-11-11`.
- **Cambios:**
  - Especificación SDD completa en `specs/h13_refactor_ux_gestix/{requirements,design,tasks}.md` (8 requisitos `R1..R8`, 7 tareas `T1..T7`).
  - Extensión de `UserAccount.copyWith({ fullName, username })` (`src/domain/models/userAccount.js`) y `SqliteUserAccountRepository.updateProfile` (`src/data/repositories/sqliteMonthlyIncomeRepository.js`).
  - Rediseño del header principal en `src/app/AppShell.jsx`: en modo mobile sin márgenes exteriores (`margin: 0`, `borderRadius: 0`), mostrando únicamente la marca `"Ge$tix"` y el ícono de perfil (`profile-menu-button`) que despliega `profile-menu-popover` con edición de perfil, acceso discreto al aviso de privacidad (`open-settings-privacy-button`) y cierre de sesión (`logout-button`).
  - Refactorización de `src/features/income/MonthlyOverviewScreen.jsx` y `src/features/income/CategoryDistributionChart.jsx` (`compact`): pestaña principal de Resumen exclusivamente informativa y contenida en el viewport sin scroll vertical (`overflowY: 'hidden'`, sin formularios embebidos), separación de cada acción y su listado en 5 pestañas dedicadas (`overview`, `expenses`, `income`, `investments`, `reminders`) y barra inferior fija (`overview-tabs`) con pequeñas tarjetas donde la activa cambia de color y se eleva (`transform: 'translateY(-8px)'`).
  - Alto contraste explícito (`backgroundColor: '#FFFFFF'`, `color: '#0B192C'`, `caretColor: '#0B192C'`, `colorScheme: 'light'`, `border: '2px solid #0F2942'`) en los inputs de monto de `ExpenseFormScreen.jsx` y `MonthlyOverviewScreen.jsx`.
  - 5 pruebas nuevas etiquetadas (`[H13-R1]`..`[H13-R8]`) en `test/features/income/MonthlyOverviewScreen.test.jsx` (total: 81 pruebas en 9 suites).
- **Verificación:** `reviewer` emitió `APPROVED` en `progress/review_h13_refactor_ux_gestix.md`; `./init.ps1`, `eslint` y `npm test` (81/81) en verde.
- **Cierre:** `h13_refactor_ux_gestix` marcada `done` en `feature_list.json`. Próxima feature en orden: `H8 — h08_ranking_categorias` (`orden: 9`).

## 2026-11-11 — H13 (`h13_refactor_ux_gestix`) — Ajustes visuales posteriores al cierre

- **Agente:** Antigravity (`leader` → `implementer` → `reviewer`) con Juan Pablo.
- **Cambios:** `CategoryDistributionChart` se ubica por encima de `capital-allocation-strip` en la pestaña Resumen; se quitó el recorte (`maxHeight` / `overflow: hidden`) de `category-breakdown-list` para que todas las categorías (p. ej. Suscripciones) se vean completas; rediseño del selector de período con flechas embebidas `<` y `>` a cada lado sin texto y mes centrado, título «Gestión de Estado Patrimonial» arriba separado y calibración milimétrica de alturas en el dashboard para garantizar cero scroll vertical en viewport móvil; prueba `[H13-R1][H13-R2]` ampliada para verificar el orden y la ausencia de recorte.
- **Verificación:** ciclo 1 `CHANGES_REQUESTED` (dato de prueba), ciclo 2 `APPROVED` en `progress/review_h13_refactor_ux_gestix.md`. El reviewer se detuvo por cuota agotada después de escribir el veredicto; el leader confirmó `./init.ps1` en verde (81/81 pruebas, 64/64 requisitos).
- **Cierre:** `h13_refactor_ux_gestix` nuevamente en `done`. Próxima feature: `H8 — h08_ranking_categorias` (`orden: 9`).

## 2026-11-14 — Cambio de enfoque a aplicación web (React + Vite)
- **Agente:** Claude Code (leader) a pedido del equipo.
- **Motivo:** el mismo proyecto se desarrolla para dos materias; en esta se trabaja la
  versión **web**. La versión Flutter/Android del documento del proyecto queda para la otra.
- **Cambios:** `AGENTS.md`, `rules.md` (reglas 9, 10 y 17), `README.md`, `CHECKPOINTS.md`,
  `docs/{architecture,conventions,product,data_model,privacy,specs}.md`, `specs/_template/`,
  `specs/h09_deteccion_recurrencias/`, `feature_list.json` (descripción), `package.json`,
  `init.sh`, `init.ps1`, `.claude/agents/*` y `.agents/rules/*`.
  - Stack: React (JavaScript) + Vite, responsivo Mobile First.
  - Persistencia: se documenta lo implementado (SQLite vía `AppDatabase` con `node:sqlite` en pruebas y `localStorage` en el navegador).
  - Clave del modelo: `VITE_LLM_API_KEY` (queda en el bundle; solo uso local/demo).
- **Pendiente:** decidir si la versión web migra de `localStorage` a SQLite en el navegador.

## 2026-11-14 — H8 (`h08_ranking_categorias`) — Ranking de categorías

- **Agente:** Claude Code (`leader` → `spec_author` → `implementer` → `reviewer`) con Francisco.
- **Spec:** `specs/h08_ranking_categorias/` (R1..R13), aprobado por Francisco el 2026-11-14.
- **Cambios:**
  - `src/domain/services/categoryRanking.js` (nuevo, JS puro): `compareCategoryTotals` (monto desc → `localeCompare('es', { sensitivity: 'base' })` → `categoryId` asc) y `buildCategoryRanking`.
  - `src/domain/models/monthlyIncome.js`: `calculateCategoryIncomeBreakdown` reutiliza `compareCategoryTotals` (mismo orden que el gráfico de H6).
  - `src/features/dashboard/CategoryRankingList.jsx` (nuevo): panel Mobile First + Desktop con estado vacío, ubicado en la pestaña Gastos (el Resumen de H13 sigue sin scroll).
  - `MonthlyOverviewScreen.jsx` y `ExpenseFormScreen.jsx` (`onExpenseDeleted`) para recalcular el ranking tras alta, edición, borrado y cambio de mes.
  - Pruebas `[H8-R1]`..`[H8-R13]` en `test/domain/services/`, `test/features/dashboard/` y `test/features/income/`.
- **Verificación:** `reviewer` emitió `APPROVED` en `progress/review_h08_ranking_categorias.md` (primer ciclo); `./init.sh` en verde (95/95 pruebas, 77/77 requisitos con prueba).
- **Cierre:** `h08_ranking_categorias` marcada `done` en `feature_list.json`. Próxima feature: `H7 — h07_comparacion_mensual` (`orden: 10`).

## 2026-11-14 — H7 (`h07_comparacion_mensual`) — Comparación mensual

- **Agente:** Claude Code (`leader` → `spec_author` → `implementer` → `reviewer`) con Francisco.
- **Spec:** `specs/h07_comparacion_mensual/` (R1..R17), aprobado por Francisco el 2026-11-14.
- **Rama:** `feature/h07-comparacion-mensual`, creada desde `feature/h08-ranking-categorias` (H8 aún sin fusionar en `desarrollo`).
- **Cambios:**
  - `src/domain/services/monthlyComparison.js` (nuevo, JS puro): `calculateVariationTenths` (variación entera en décimas de %, `null` si el mes anterior es 0, redondeo con `BigInt`) y `buildMonthlyComparison` (mes seleccionado + hasta 5 meses previos, recortado al primer mes con datos).
  - `src/core/formatters.js`: `formatVariationTenths` (`125 → "+12,5 %"`).
  - `src/features/dashboard/monthlyTotalsLoader.js` y `MonthlyComparisonPanel.jsx` (nuevos): carga de totales por mes con el repositorio existente y panel Mobile First + Desktop en la pestaña Gastos.
  - `MonthlyOverviewScreen.jsx`: recarga de la comparación al cambiar de período y tras alta/edición/baja; el Resumen de H13 sin cambios.
  - Pruebas `[H7-R1]`..`[H7-R17]` (persistencia sobre SQLite en memoria). Sin dependencias nuevas ni migraciones.
- **Verificación:** `reviewer` emitió `APPROVED` en `progress/review_h07_comparacion_mensual.md` (primer ciclo); `./init.sh` en verde (118/118 pruebas, 94/94 requisitos con prueba).
- **Cierre:** `h07_comparacion_mensual` marcada `done` en `feature_list.json`. Próxima feature: `H9 — h09_deteccion_recurrencias` (`orden: 11`).

## 2026-11-14 — Cierre de sesión (Claude Code, Francisco)

- **Agentes:** Claude Code (`leader` → `spec_author` → `implementer` → `reviewer`, un ciclo por feature) con Francisco.
- **Plan:** cerrar `H8 — h08_ranking_categorias` (`orden: 9`) y `H7 — h07_comparacion_mensual` (`orden: 10`) con el flujo SDD completo.
- **Aprobaciones:** `H8 aprobado por Francisco el 2026-11-14`; `H7 aprobado por Francisco el 2026-11-14`.
- **Cambios:**
  - H8: ranking de categorías en la pestaña Gastos (ver entrada H8). Rama `feature/h08-ranking-categorias` (commits `aa2fadc`..`c4c8228`), pusheada; PR pendiente.
  - H7: comparación mensual en la pestaña Gastos (ver entrada H7). Rama `feature/h07-comparacion-mensual` (commits `e8b779d`..`f7b1e61`), creada desde la rama de H8; push pendiente.
  - No existe rama `develop`; la de integración es `desarrollo` (`5a54629`), todavía sin H8 ni H7.
- **Verificación:** `./init.sh` en verde al cierre: 118/118 pruebas, 94/94 requisitos con prueba, ESLint y arnés sin advertencias.
- **Cierre:** H7 y H8 en `done`. Próxima feature: `H9 — h09_deteccion_recurrencias` (`orden: 11`, `pending`). Pendiente del equipo: push de H7, PRs de H8 y H7 hacia `desarrollo` (H8 primero) y decidir si la versión web migra de `localStorage` a SQLite en el navegador.

## 2026-11-15 — H9 h09_deteccion_recurrencias (Claude Code, Francisco)

- **Agentes:** `leader` → `spec_author` (actualización del borrador original) → `implementer` → `reviewer` (un ciclo).
- **Aprobación:** `H9 aprobado por Francisco el 2026-11-15`.
- **Spec:** el borrador inicial se corrigió contra el código actual: migración v3 (`dismissed_recurrences`), `RecurrencesPanel` dentro de la pestaña «Alertas» (`reminders`), descartes con clave `<categoryId>|<typicalAmountCents>` y tolerancia ±10 %, nuevo R11 (exclusión fuera de la ventana de 60 días) y agrupamiento validado contra la mediana. R1..R11.
- **Cambios:** dominio (`recurrence.js`, `recurrenceDetector.js`, contrato `recurrenceRepository.js`), datos (`sqliteRecurrenceRepository.js`, `localStorageRecurrenceRepository.js`, migración v3 en `appDatabase.js`, `docs/data_model.md`), presentación (`src/features/recurrences/`, `MonthlyOverviewScreen.jsx`, cableado en `AppShell.jsx`/`App.jsx`) y conjunto etiquetado `test/fixtures/`.
- **Verificación:** `reviewer` emitió `APPROVED` en `progress/review_h09_deteccion_recurrencias.md`; `./init.sh` en verde (156/156 pruebas). K4: exhaustividad 1,00 y precisión 1,00 (22/22).
- **Cierre:** `h09_deteccion_recurrencias` marcada `done`. Rama `feature/h09-deteccion-recurrencias` sin commitear. Próxima feature: `H10 — h10_recomendaciones_ia` (`orden: 12`).

## 2026-11-15 — H10 h10_recomendaciones_ia (Claude Code, Francisco)

- **Agentes:** `leader` → 3 `Explore` (`progress/explore_h10_*.md`) → `spec_author` → `implementer` → `reviewer` (un ciclo).
- **Decisiones del humano:** proveedor Google Gemini Flash (`gemini-2.5-flash`, configurable con `VITE_LLM_MODEL`) por REST con `fetch` nativo y sin SDK; actualización del aviso de privacidad dentro de H10.
- **Aprobación:** `H10 aprobado por Francisco el 2026-11-15`. Spec con R1..R34 y T1..T38.
- **Cambios:**
  - `src/assistant/` (cliente LLM, prompt, fallback, servicio con timeout de 10 s y validación);
  - `SpendingSummaryBuilder` en el dominio;
  - contador `advice_requests` (migración v4 y `fp_advice_requests` en el navegador; 4 consultas al modelo por mes);
  - panel de recomendaciones en la pestaña Alertas;
  - aviso de privacidad `policy_version` 2026-11 con nueva aceptación;
  - aclaración de la regla 15 en `rules.md` (nombres de personas);
  - actualización de `docs/`.
- **Desvíos aceptados por el reviewer:** `[H9-R6]` pasa a `user_version >= 3`, porque la v4 queda fijada por `[H10-R25]`, y no se crea `.env.example` (lo descarta el design). Pendiente menor: renombrar el título de esa prueba de H9.
- **Verificación:** `reviewer` emitió `APPROVED` en `progress/review_h10_recomendaciones_ia.md`; `./init.sh` en verde (232/232 pruebas).
- **Cierre:** `h10_recomendaciones_ia` marcada `done`. Rama `feature/h10-recomendaciones-ia` sin commitear. Próxima feature: `H11 — h11_exportar_historial` (`orden: 13`).

## 2026-11-15 — H11 h11_exportar_historial (Claude Code, Francisco)

- **Agentes:** `leader` → `spec_author` → `implementer` → `reviewer` (un ciclo).
- **Aprobación:** `H11 aprobado por Francisco el 2026-11-15`. Spec con R1..R28.
- **Cambios:**
  - `CsvExporter` puro en `src/domain/services/csvExporter.js`, en formato es-AR: BOM UTF-8, `;`, CRLF, coma decimal por aritmética entera, escape RFC 4180 y prefijo `'` contra CSV injection.
  - `ExpenseRepository.findAll()` en SQLite y `localStorageExpenseReader` en el navegador.
  - Entrega con `Blob` + `download` y Web Share opcional en `src/features/export/`.
  - `ExportHistoryPanel` al final de la pestaña Gastos.
  - Sin migración ni dependencias nuevas.
- **Verificación:** `reviewer` emitió `APPROVED` en `progress/review_h11_exportar_historial.md`, sin desvíos. `./init.sh` en verde.
- **Cierre:** `h11_exportar_historial` marcada `done`. **Las 13 historias de `feature_list.json` quedaron en `done`.**

## 2026-11-16 — H14 (`h14_refactor_desktop_y_perfil`) — Refactor UX/UI Desktop, paleta vibrante de gráfico y página dedicada de perfil

- **Agente:** Antigravity (`leader` → `spec_author` → `implementer` → `reviewer`) con Juan Pablo.
- **Aprobación de spec:** `H14 aprobado por Juan Pablo el 2026-11-16`.
- **Cambios:**
  - Especificación SDD completa en `specs/h14_refactor_desktop_y_perfil/{requirements,design,tasks}.md` (`R1..R9`, `T1..T8`).
  - Paleta vibrante en `CHART_PALETTE` (`src/core/theme.js`) y ancho de contenedor Desktop al `80 %` (`maxWidth: 1440`) en `src/core/responsive.js`.
  - Método `changePassword({ id, currentPassword, newPassword })` en `SqliteUserAccountRepository` (`src/data/repositories/sqliteMonthlyIncomeRepository.js`), en memoria (`src/app/AppShell.jsx`) y en `localStorage` (`src/App.jsx`).
  - Nueva pantalla dedicada `UserProfileScreen` (`src/features/profile/UserProfileScreen.jsx`) con edición de perfil y cambio de contraseña local.
  - Refactor de `AppShell.jsx`, `CategoryDistributionChart.jsx` y `MonthlyOverviewScreen.jsx`: navbar `app-header` al 100 % del ancho con navegación integrada en Desktop (sin dock fijo inferior), Resumen Desktop en grilla de 2 columnas sin scroll vertical (`desktop-overview-grid` con dona SVG de `212x212` y 3 paneles informativos ejecutivos en `desktop-overview-insights`) y menú de usuario con acceso a la página dedicada de perfil.
  - 5 pruebas nuevas etiquetadas (`[H14-R1]`..`[H14-R9]`) en `test/domain/models/monthlyIncome.test.js`, `test/data/sqliteMonthlyIncomeRepository.test.js` y `test/features/income/MonthlyOverviewScreen.test.jsx` (total: 283 pruebas en 46 suites).
- **Verificación:** `reviewer` emitió `APPROVED` en `progress/review_h14_refactor_desktop_y_perfil.md`; `./init.ps1`, `eslint` y `npm test` (283/283, 176/176 requisitos) en verde.
- **Cierre:** `h14_refactor_desktop_y_perfil` marcada `done` en `feature_list.json`. Próxima feature en orden: `H15 — h15_ingresos_multiples` (`orden: 15`).

## 2026-11-16 — H15 (`h15_ingresos_multiples`) — Registrar múltiples ingresos en cualquier momento y acumular el total mensual

- **Agente:** Antigravity (`leader` → `spec_author` → `implementer` → `reviewer`) con Juan Pablo.
- **Aprobación de spec:** `H15 aprobado por Juan Pablo el 2026-11-16`.
- **Cambios:**
  - Especificación SDD completa en `specs/h15_ingresos_multiples/{requirements,design,tasks}.md` (`R1..R8`, `T1..T5`).
  - Modelo inmutable `IncomeEntry` y `sumIncomeEntries` en `src/domain/models/monthlyIncome.js` y extensión del contrato `MonthlyIncomeRepository` (`src/domain/repositories/monthlyIncomeRepository.js`).
  - Migración SQLite **v5** (`income_entries` + índice `idx_income_entries_date`) en `src/data/db/appDatabase.js`, documentada en `docs/data_model.md`, e implementación de `addEntry`, `findEntriesByYearMonth`, `updateEntry` y `deleteEntryById` en `SqliteMonthlyIncomeRepository` (`src/data/repositories/sqliteMonthlyIncomeRepository.js`) y en `src/App.jsx` (`fp_income_entries` sincronizando `fp_incomes`).
  - Pestaña **Ingresos** en `src/features/income/MonthlyOverviewScreen.jsx` con carga de múltiples ingresos (monto, fecha propuesta hoy y concepto opcional), listado de movimientos del mes (`income-entries-list`) con edición y eliminación (`income-entry-edit-<id>`, `income-entry-delete-<id>`) y recálculo en vivo de todos los indicadores.
  - 3 pruebas nuevas etiquetadas (`[H15-R1]`..`[H15-R8]`) en `test/domain/models/monthlyIncome.test.js`, `test/data/sqliteMonthlyIncomeRepository.test.js` y `test/features/income/MonthlyOverviewScreen.test.jsx` (total: 286 pruebas en 47 suites).
- **Verificación:** `reviewer` emitió `APPROVED` en `progress/review_h15_ingresos_multiples.md`; `./init.ps1`, `eslint` y `npm test` (286/286, 184/184 requisitos) en verde.
- **Cierre:** `h15_ingresos_multiples` marcada `done` en `feature_list.json`. **Las 15 historias de `feature_list.json` quedaron en `done`.**
