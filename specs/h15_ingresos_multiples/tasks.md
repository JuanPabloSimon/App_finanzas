# Tasks — h15_ingresos_multiples

> Pasos discretos en orden para implementar `H15 — h15_ingresos_multiples`.
> El implementer marca `[x]` al completar cada uno. Cada tarea indica los requisitos que cubre.

## Dominio y Persistencia

- [x] T1 — Agregar el modelo inmutable `IncomeEntry` y `sumIncomeEntries` en `src/domain/models/monthlyIncome.js` y extender el contrato `MonthlyIncomeRepository` en `src/domain/repositories/monthlyIncomeRepository.js` con `addEntry`, `findEntriesByYearMonth`, `updateEntry` y `deleteEntryById`. Cubre: R1, R2.
- [x] T2 — Agregar `MIGRATION_V5_SQL` (`income_entries` + índice `idx_income_entries_date`, `PRAGMA user_version = 5`) en `src/data/db/appDatabase.js`, documentarla en `docs/data_model.md` e implementar `addEntry`, `findEntriesByYearMonth`, `updateEntry` y `deleteEntryById` en `SqliteMonthlyIncomeRepository` (`src/data/repositories/sqliteMonthlyIncomeRepository.js`) y en `src/App.jsx`. Cubre: R3, R4, R5.

## Presentación — Pestaña Ingresos con Múltiples Movimientos

- [x] T3 — Actualizar `src/features/income/MonthlyOverviewScreen.jsx` (y `MonthlyOverviewController`) para: (a) incorporar en `monthly-income-form` el campo de fecha (`income-date-input` propuesto en `today()`) y el campo opcional de concepto/nota (`income-note-input`), (b) acumular cada nuevo ingreso mediante `addEntry` y mostrar el listado del período (`income-entries-list`) ordenado por fecha descendente, y (c) permitir editar (`income-entry-edit-<id>`) y eliminar (`income-entry-delete-<id>`) ingresos individuales recalculando en vivo el total mensual, el balance disponible y la absorción por categoría. Cubre: R6, R7, R8.

## Pruebas y Verificación

- [x] T4 — Agregar las pruebas etiquetadas `[H15-R1]`..`[H15-R8]` en `test/domain/models/monthlyIncome.test.js`, `test/data/sqliteMonthlyIncomeRepository.test.js` y `test/features/income/MonthlyOverviewScreen.test.jsx`, y ajustar `user_version >= 4` en `[H10-R25]` (`test/data/sqliteAdviceRequestRepository.test.js`). Cubre: R1..R8.
- [x] T5 — Actualizar `progress/traceability.md`, redactar `progress/impl_h15_ingresos_multiples.md` y verificar `powershell -ExecutionPolicy Bypass -File ./init.ps1` en verde. Cubre: R1..R8.
