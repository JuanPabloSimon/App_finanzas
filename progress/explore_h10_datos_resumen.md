# Explore H10 — Datos para el resumen agregado y contador mensual

> Investigación previa del 2026-11-15 (subagente `Explore`, solo lectura). El leader lo guardó en disco.

## Reutilizable tal cual

- **Totales por categoría (H5/H6):** `calculateCategoryIncomeBreakdown(expenses, categories, monthlyIncome)` en `src/domain/models/monthlyIncome.js`.
  - Cada ítem trae `{categoryId, categoryName, amountCents, expenseCount, expensePercentage (1 decimal, suma 100), incomePercentage|null, colorHex}`.
  - Ya viene ordenado con `compareCategoryTotals`. Alcanza para `categorias[].total` y `porcentaje`.
- **Ranking (H8):** `buildCategoryRanking(breakdown)` y `compareCategoryTotals` en `src/domain/services/categoryRanking.js`. Sirven para quedarse con el top 8 y agrupar el resto en «Otros».
- **Comparación mensual (H7):**
  - `buildMonthlyComparison({activeYearMonth, currentTotalCents, previousMonthlyTotals})` y `calculateVariationTenths(cur, prev)` en `src/domain/services/monthlyComparison.js`. La variación sale en décimas (`null` si el mes anterior es 0). `COMPARISON_WINDOW_MONTHS = 5`.
  - Loader: `loadPreviousMonthlyTotals(expenseRepository, ym)` en `src/features/dashboard/monthlyTotalsLoader.js` devuelve `[{yearMonth, totalCents}]`. De ahí salen `total_mes` y `total_mes_anterior`.
- **Recurrencias (H9):**
  - `RecurrenceDetector#detect(expenses, {referenceDate, categoryNames})` y `filterDismissedRecurrences` en `src/domain/services/recurrenceDetector.js`. Constantes: `RECURRENCE_WINDOW_DAYS = 60`, `MIN_OCCURRENCES = 3`, `TOLERANCE_PCT = 10`.
  - `loadVisibleRecurrences({expenseRepository, recurrenceRepository, categories, referenceDate})` en `src/features/recurrences/recurrencesLoader.js`.
  - `Recurrence` (`src/domain/models/recurrence.js`) tiene `categoryName`, `typicalAmountCents` y `occurrences`. Se mapea a `recurrencias[]` y hay que **descartar `expenseIds`**.
- **Ingreso mensual (H5):** `MonthlyIncome` y `incomeRepository.findByYearMonth(ym)` dan `ingreso_mensual` (puede ser `null`).
- **Dónde ya está todo calculado:** `src/features/income/MonthlyOverviewScreen.jsx`, en `getState()` (aprox. línea 760) y en la versión con hooks (aprox. línea 1065). Ahí se calculan `categoryBreakdown`, `categoryRanking`, `monthlyComparison`, `recurrences` y `monthlyIncome`.
- **Consejos por reglas:** `buildAdviceItems(...)` (aprox. línea 224 del mismo archivo) es la base natural para `FallbackAdvisor` (`docs/llm_assistant.md`).
- **Consentimiento (H12):**
  - `ConsentRepository` y `CURRENT_POLICY_VERSION = '2026-10'` en `src/domain/models/consent.js`.
  - `PRIVACY_NOTICE_CONTENT.thirdPartyTransfer` ya avisa del envío del resumen agregado.
  - La tabla `consents` está en la migración v1 y en el navegador se guarda en `fp_consents`.
  - No hace falta una tabla nueva, salvo que se quiera un consentimiento específico para la IA.

## Lo que falta

- **Variación por categoría (`variacion_pct`):** no existe. Hay que cargar `findByYearMonth(mesAnterior)`, aplicar el breakdown, cruzar por `categoryId` y calcular con `calculateVariationTenths`.
- **`SpendingSummaryBuilder`:** no existe. Va como función pura en `src/domain/services/`. Tiene que convertir centavos a pesos enteros, limitar a 8 categorías más «Otros» y excluir notas, subcategorías y fechas de gastos.
- **`FallbackAdvisor` y el cliente del modelo (timeout de 10 s):** no existen.
- **Contador mensual:** no hay modelo, repositorio ni tabla.
  - `docs/data_model.md` ya define `advice_requests` (`id` INTEGER PK AI, `year_month` TEXT NOT NULL, `source` TEXT NOT NULL `model|fallback`, `created_at` TEXT NOT NULL). Ahí figura como migración 4 de H10.
  - Límite: 4 consultas al modelo por mes (`docs/llm_assistant.md`, «Límite de consultas y costos»).
  - Falta el contrato `src/domain/repositories/adviceRequestRepository.js`, con `countByYearMonth(ym, source='model')` y `save(...)`.
  - Implementaciones: `src/data/repositories/sqliteAdviceRequestRepository.js` y una de `localStorage` (`fp_advice_requests`), siguiendo el patrón de `LocalStorageRecurrenceRepository`.

## Migración

- `AppDatabase.migrate()` en `src/data/db/appDatabase.js`: `PRAGMA user_version` actual = **3**.
  - v1: categories, expenses, monthly_incomes, consents.
  - v2: user_accounts, investments, reminders.
  - v3: dismissed_recurrences.
- **Próxima versión libre: 4.** Hay que agregar `MIGRATION_V4_SQL` con `advice_requests`, más un índice sobre `year_month` y el bloque `if (currentVersion < 4)`. Coincide con `docs/data_model.md`.

## Cableado

- **Navegador:** `src/App.jsx`, en `createBrowserRepositories()`, crea repos inline sobre `localStorage` (`fp_consents`, `fp_expenses`, `fp_incomes`, `fp_investments`, `fp_reminders`, `fp_accounts`) y `new LocalStorageRecurrenceRepository(window.localStorage)`. Todos se pasan como props a `AppShell`.
- **`src/app/AppShell.jsx`:** el controlador (aprox. líneas 145-170) y el componente (aprox. líneas 412-438) reciben los repos y los reenvían a `MonthlyOverviewScreen` (aprox. líneas 386-393 y 1258-1263).
- **Repo nuevo:** hay que sumar `adviceRequestRepository` en los tres lugares: `App.jsx`, `AppShell` y `MonthlyOverviewScreen`.
- **SQLite en pruebas:** `AppDatabase.openInMemory()` usa `node:sqlite`, migra solo y se usa con los `src/data/repositories/sqlite*Repository.js`. En el navegador no se usa SQLite.
- **Fábricas en memoria:** `MonthlyOverviewScreen` las tiene en `createInMemory*Repository` (líneas 57-222). Hay que agregar una para el contador.
