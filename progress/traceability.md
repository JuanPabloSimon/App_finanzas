# Matriz de trazabilidad (métrica K6)

> Criterio de aceptación (Etapa 2) → requisito EARS → prueba etiquetada.
> La actualiza el implementer al cerrar cada feature; el reviewer la verifica.
> Cobertura K6 = criterios de historias de prioridad alta con prueba aprobada / total.
> Todas las historias (`H1`..`H12`) tienen `"sdd": true` y se completan mediante el flujo SDD.

| Historia | Criterio | Requisitos | Pruebas | Estado |
|---|---|---|---|---|
| H12 | CA1 | R1, R2, R5, R6 | `[H12-R1]`, `[H12-R2]`, `[H12-R5]`, `[H12-R6]` (`test/features/privacy/PrivacyNoticeScreen.test.jsx`, `test/data/sqliteConsentRepository.test.js`) | Aprobada (`done`) |
| H12 | CA2 | R3, R7, R8 | `[H12-R3]`, `[H12-R7]`, `[H12-R8]` (`test/domain/models/consent.test.js`, `test/features/privacy/PrivacyNoticeScreen.test.jsx`) | Aprobada (`done`) |
| H12 | CA3 | R4, R6, R7 | `[H12-R4]`, `[H12-R6]`, `[H12-R7]` (`test/domain/models/consent.test.js`, `test/data/sqliteConsentRepository.test.js`, `test/features/privacy/PrivacyNoticeScreen.test.jsx`) | Aprobada (`done`) |
| H1 | CA1 | R2, R3, R7, R8 | `[H1-R2]`, `[H1-R3]`, `[H1-R7]`, `[H1-R8]` (`test/domain/models/expense.test.js`, `test/data/sqliteExpenseRepository.test.js`, `test/features/expenses/ExpenseFormScreen.test.jsx`) | Aprobada (`done`) |
| H1 | CA2 | R4, R5 | `[H1-R4]`, `[H1-R5]` (`test/domain/models/expense.test.js`, `test/data/sqliteExpenseRepository.test.js`, `test/features/expenses/ExpenseFormScreen.test.jsx`) | Aprobada (`done`) |
| H1 | CA3 | R1, R6, R7 | `[H1-R1]`, `[H1-R6]`, `[H1-R7]` (`test/domain/models/expense.test.js`, `test/data/sqliteExpenseRepository.test.js`, `test/features/expenses/ExpenseFormScreen.test.jsx`) | Aprobada (`done`) |
| H2 | CA1 | R1, R2, R3, R4, R8 | `[H2-R1]`, `[H2-R2]`, `[H2-R3]`, `[H2-R4]`, `[H2-R8]` (`test/domain/models/expense.test.js`, `test/data/sqliteExpenseRepository.test.js`, `test/features/expenses/ExpenseFormScreen.test.jsx`) | Aprobada (`done`) |
| H2 | CA2 | R4, R5, R6, R7, R8 | `[H2-R4]`, `[H2-R5]`, `[H2-R6]`, `[H2-R7]`, `[H2-R8]` (`test/domain/models/expense.test.js`, `test/data/sqliteExpenseRepository.test.js`, `test/features/expenses/ExpenseFormScreen.test.jsx`) | Aprobada (`done`) |
| H3 | CA1 | R1, R2, R8 | `[H3-R1]`, `[H3-R2]`, `[H3-R8]` (`test/data/sqliteExpenseRepository.test.js`, `test/features/expenses/ExpenseFormScreen.test.jsx`) | Aprobada (`done`) |
| H3 | CA2 | R3, R4, R8 | `[H3-R3]`, `[H3-R4]`, `[H3-R8]` (`test/features/expenses/ExpenseFormScreen.test.jsx`) | Aprobada (`done`) |
| H3 | CA3 | R5, R6, R7, R8 | `[H3-R5]`, `[H3-R6]`, `[H3-R7]`, `[H3-R8]` (`test/domain/models/expense.test.js`, `test/data/sqliteExpenseRepository.test.js`, `test/features/expenses/ExpenseFormScreen.test.jsx`) | Aprobada (`done`) |
| H5 | CA1 | R1, R2, R4, R5, R6, R7, R8 | `[H5-R1]`, `[H5-R2]`, `[H5-R4]`, `[H5-R5]`, `[H5-R6]`, `[H5-R7]`, `[H5-R8]` (`test/domain/models/monthlyIncome.test.js`, `test/data/sqliteMonthlyIncomeRepository.test.js`, `test/features/income/MonthlyOverviewScreen.test.jsx`) | Aprobada (`done`) |
| H5 | CA2 | R3, R8 | `[H5-R3]`, `[H5-R8]` (`test/domain/models/monthlyIncome.test.js`, `test/features/income/MonthlyOverviewScreen.test.jsx`) | Aprobada (`done`) |
| H6 | CA1 | R1, R2, R3, R6, R7, R8 | `[H6-R1]`, `[H6-R2]`, `[H6-R3]`, `[H6-R6]`, `[H6-R7]`, `[H6-R8]` (`test/domain/models/monthlyIncome.test.js`, `test/features/income/MonthlyOverviewScreen.test.jsx`) | Aprobada (`done`) |
| H6 | CA2 | R4, R5, R8 | `[H6-R4]`, `[H6-R5]`, `[H6-R8]` (`test/domain/models/monthlyIncome.test.js`, `test/features/income/MonthlyOverviewScreen.test.jsx`) | Aprobada (`done`) |
| H4 | CA1 | R1, R2, R3, R4, R8 | `[H4-R1]`, `[H4-R2]`, `[H4-R3]`, `[H4-R4]`, `[H4-R8]` (`test/domain/models/expense.test.js`, `test/data/sqliteExpenseRepository.test.js`, `test/features/expenses/ExpenseFormScreen.test.jsx`) | Aprobada (`done`) |
| H4 | CA2 | R5, R6, R7, R8 | `[H4-R5]`, `[H4-R6]`, `[H4-R7]`, `[H4-R8]` (`test/domain/models/expense.test.js`, `test/data/sqliteExpenseRepository.test.js`, `test/features/expenses/ExpenseFormScreen.test.jsx`) | Aprobada (`done`) |
| H13 | CA1 | R1, R2 | `[H13-R1]`, `[H13-R2]` (`test/features/income/MonthlyOverviewScreen.test.jsx`) | En revisión (`in_progress`) |
| H13 | CA2 | R2, R3, R4 | `[H13-R2]`, `[H13-R3]`, `[H13-R4]` (`test/features/income/MonthlyOverviewScreen.test.jsx`) | En revisión (`in_progress`) |
| H13 | CA3 | R5, R6, R7 | `[H13-R5]`, `[H13-R6]`, `[H13-R7]` (`test/features/income/MonthlyOverviewScreen.test.jsx`) | En revisión (`in_progress`) |
| H13 | CA4 | R8 | `[H13-R8]` (`test/features/income/MonthlyOverviewScreen.test.jsx`) | En revisión (`in_progress`) |
| H8 | CA1, CA2 | — | — | Pendiente (`pending`) |
| H7 | CA1, CA2 | — | — | Pendiente (`pending`) |
| H9 | CA1 | R1, R2, R3, R8 | — | Borrador de referencia (`pending`) |
| H9 | CA2 | R4, R5 | — | Borrador de referencia (`pending`) |
| H9 | CA3 | R6, R7 | — | Borrador de referencia (`pending`) |
| H10 | CA1, CA2, CA3, CA4 | — | — | Pendiente (`pending`) |
| H11 | CA1, CA2 | — | — | Pendiente (`pending`) |
