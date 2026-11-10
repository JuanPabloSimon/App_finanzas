# Tasks — h05_ingreso_mensual

> Pasos discretos en orden. El implementer marca `[x]` al completar cada uno.
> Cada tarea indica los requisitos que cubre.

## Core y Dominio

- [x] T1 — Crear `src/core/theme.js` con la paleta corporativa sobria (azul marino `#0F2942` y marrón oscuro `#4A3525`) y agregar `InvalidInvestment`, `InvalidReminder` e `InvalidCredentials` en `src/core/errors.js`. Cubre: R4, R7, R8.
- [x] T2 — Crear modelos inmutables `MonthlyIncome` (y `calculateCategoryIncomeBreakdown`) en `src/domain/models/monthlyIncome.js`, `Investment` en `src/domain/models/investment.js`, `Reminder` en `src/domain/models/reminder.js`, `UserAccount` en `src/domain/models/userAccount.js` y el contrato `MonthlyIncomeRepository` en `src/domain/repositories/monthlyIncomeRepository.js`. Cubre: R1, R2, R3, R4, R5, R6, R7.
- [x] T3 — Crear `test/domain/models/monthlyIncome.test.js` con pruebas unitarias `[H5-R1]`, `[H5-R2]`, `[H5-R3]`, `[H5-R4]` y `[H5-R5]`. Cubre: R1, R2, R3, R4, R5.

## Persistencia (`expo-sqlite` / SQLite en memoria)

- [x] T4 — Agregar la migración v2 (`user_accounts`, `investments`, `reminders`) en `src/data/db/appDatabase.js` e implementar `SqliteMonthlyIncomeRepository`, `SqliteInvestmentRepository`, `SqliteReminderRepository` y `SqliteUserAccountRepository` en `src/data/repositories/sqliteMonthlyIncomeRepository.js`. Cubre: R1, R4, R5, R6, R7.
- [x] T5 — Crear `test/data/sqliteMonthlyIncomeRepository.test.js` con pruebas de persistencia `[H5-R1]`, `[H5-R4]`, `[H5-R5]`, `[H5-R6]` y `[H5-R7]` sobre SQLite en memoria. Cubre: R1, R4, R5, R6, R7.

## Presentación (Mobile First + Desktop y Paleta Corporativa)

- [x] T6 — Crear `src/features/income/MonthlyOverviewScreen.jsx` e integrar en `src/app/AppShell.jsx`, `src/features/expenses/ExpenseFormScreen.jsx` y `src/features/privacy/PrivacyNoticeScreen.jsx` la paleta corporativa, el inicio de sesión/registro local, el Panel de Resumen General del Mes (Ingresos con % por categoría, Gastos, Inversiones/Plazos Fijos, Recordatorios de vencimientos y Consejos) y la persistencia en navegador (`localStorage`). Cubre: R1, R2, R3, R4, R5, R6, R7, R8.
- [x] T7 — Crear `test/features/income/MonthlyOverviewScreen.test.jsx` con pruebas de componente e interacción `[H5-R1]`, `[H5-R2]`, `[H5-R3]`, `[H5-R4]`, `[H5-R5]`, `[H5-R6]`, `[H5-R7]` y `[H5-R8]`. Cubre: R1, R2, R3, R4, R5, R6, R7, R8.

## Cierre

- [x] T8 — Documentar la trazabilidad en `progress/impl_h05_ingreso_mensual.md`, actualizar `progress/traceability.md` y ejecutar `./init.ps1` en verde.
