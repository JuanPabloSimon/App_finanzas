# Implementación — H15 (`h15_ingresos_multiples`)

- **Feature:** `H15 — h15_ingresos_multiples` (`orden: 15`)
- **Agente:** `implementer` (`antigravity`)
- **Fecha:** `2026-11-16`

## Tareas completadas (`T1..T5`)

1. **T1 (`src/domain/models/monthlyIncome.js`, `src/domain/repositories/monthlyIncomeRepository.js`):**
   - Modelo inmutable `IncomeEntry` (`id`, `amountCents > 0`, `date` `YYYY-MM-DD`, `yearMonth` derivado, `note` opcional hasta 200 caracteres y `createdAt`) y función pura `sumIncomeEntries(entries, yearMonth)`.
   - Contrato `MonthlyIncomeRepository` extendido con `addEntry`, `findEntriesByYearMonth`, `updateEntry` y `deleteEntryById`.
2. **T2 (`src/data/db/appDatabase.js`, `src/data/repositories/sqliteMonthlyIncomeRepository.js`, `src/App.jsx`, `docs/data_model.md`):**
   - Migración SQLite **v5** (`MIGRATION_V5_SQL`: tabla `income_entries` + índice `idx_income_entries_date`, `PRAGMA user_version = 5`).
   - Implementados `addEntry`, `findEntriesByYearMonth`, `updateEntry` y `deleteEntryById` sincronizando la suma acumulada del mes en `monthly_incomes` (y en `fp_income_entries` / `fp_incomes` en el navegador).
3. **T3 (`src/features/income/MonthlyOverviewScreen.jsx`):**
   - Pestaña **Ingresos** con campos `income-amount-input`, `income-date-input` (por defecto hoy) e `income-note-input`, listado `income-entries-list` ordenado por fecha descendente, acciones de edición (`income-entry-edit-<id>`) y eliminación (`income-entry-delete-<id>`) y recálculo en vivo de todos los indicadores.
4. **T4–T5 (`test/`, `progress/traceability.md`):**
   - Pruebas `[H15-R1]`..`[H15-R8]` en verde y ajuste justificado de `user_version >= 4` en `[H10-R25]`.
