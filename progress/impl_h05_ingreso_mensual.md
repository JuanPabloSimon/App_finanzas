# Implementación — h05_ingreso_mensual

- **Feature:** `H5 — h05_ingreso_mensual` (Registrar el ingreso mensual y Panel de Resumen General)
- **Herramienta:** `antigravity`
- **Rol:** `implementer`
- **Estado:** `done`

## Archivos creados y modificados

| Capa | Archivo | Acción |
|---|---|---|
| core | `src/core/theme.js` | Creado (paleta corporativa sobria con Azul Marino `#0F2942` y Marrón Oscuro `#4A3525`) |
| core | `src/core/errors.js` | Modificado (`InvalidInvestment`, `InvalidReminder`, `InvalidCredentials`) |
| domain | `src/domain/models/monthlyIncome.js` | Creado (`MonthlyIncome` y `calculateCategoryIncomeBreakdown`) |
| domain | `src/domain/models/investment.js` | Creado (`Investment` para control de gestión de capital) |
| domain | `src/domain/models/reminder.js` | Creado (`Reminder` para vencimientos y alertas) |
| domain | `src/domain/models/userAccount.js` | Creado (`UserAccount` para cuenta local) |
| domain | `src/domain/repositories/monthlyIncomeRepository.js` | Creado (`MonthlyIncomeRepository`) |
| data | `src/data/db/appDatabase.js` | Modificado (migración v2 con `user_accounts`, `investments`, `reminders`) |
| data | `src/data/repositories/sqliteMonthlyIncomeRepository.js` | Creado (`SqliteMonthlyIncomeRepository`, `SqliteInvestmentRepository`, `SqliteReminderRepository`, `SqliteUserAccountRepository`) |
| presentation | `src/features/income/MonthlyOverviewScreen.jsx` | Creado (Panel de Resumen General del Mes con KPIs de Ingresos, Gastos, Inversiones y Balance, % de cada categoría sobre el ingreso, registro de inversiones/plazos fijos, recordatorios de vencimiento y consejos orientativos) |
| presentation | `src/app/AppShell.jsx`, `src/App.jsx`, `src/features/privacy/PrivacyNoticeScreen.jsx`, `src/features/expenses/ExpenseFormScreen.jsx` | Modificados (Login/Registro local, Cuenta Demo con datos precargados, persistencia en `localStorage` y paleta corporativa) |
| test | `test/domain/models/monthlyIncome.test.js`, `test/data/sqliteMonthlyIncomeRepository.test.js`, `test/features/income/MonthlyOverviewScreen.test.jsx` | Creados (15 pruebas nuevas `[H5-R1]..[H5-R8]`) |
