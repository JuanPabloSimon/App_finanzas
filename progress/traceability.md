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
| H3 | CA1, CA2, CA3 | — | — | Pendiente (`pending`) |
| H5 | CA1, CA2 | — | — | Pendiente (`pending`) |
| H6 | CA1, CA2 | — | — | Pendiente (`pending`) |
| H4 | CA1, CA2 | — | — | Pendiente (`pending`) |
| H8 | CA1, CA2 | — | — | Pendiente (`pending`) |
| H7 | CA1, CA2 | — | — | Pendiente (`pending`) |
| H9 | CA1 | R1, R2, R3, R8 | — | Borrador de referencia (`pending`) |
| H9 | CA2 | R4, R5 | — | Borrador de referencia (`pending`) |
| H9 | CA3 | R6, R7 | — | Borrador de referencia (`pending`) |
| H10 | CA1, CA2, CA3, CA4 | — | — | Pendiente (`pending`) |
| H11 | CA1, CA2 | — | — | Pendiente (`pending`) |
