# Tasks — h02_editar_eliminar_gasto

> Pasos discretos en orden. El implementer marca `[x]` al completar cada uno.
> Cada tarea indica los requisitos que cubre.

## Core y Dominio

- [x] T1 — Agregar la excepción `ExpenseNotFound` en `src/core/errors.js`, agregar `formatCentsToInput` en `src/core/formatters.js` y extender el contrato `ExpenseRepository` en `src/domain/repositories/expenseRepository.js` con los métodos `findById(id)`, `update(expense)` y `deleteById(id)`. Cubre: R1, R2, R4, R7.
- [x] T2 — Extender `test/domain/models/expense.test.js` con pruebas unitarias `[H2-R2]` y `[H2-R4]` para `ExpenseNotFound`, `formatCentsToInput` y los nuevos métodos del contrato `ExpenseRepository`. Cubre: R2, R4.

## Persistencia (`expo-sqlite` / SQLite en memoria)

- [x] T3 — Implementar `findById(id)`, `update(expense)` y `deleteById(id)` en `src/data/repositories/sqliteExpenseRepository.js` con consultas SQL parametrizadas, preservación de `created_at`, actualización de `updated_at` y lanzamiento de `ExpenseNotFound` cuando el registro no existe. Cubre: R2, R4, R6, R7.
- [x] T4 — Extender `test/data/sqliteExpenseRepository.test.js` con pruebas de persistencia `[H2-R2]`, `[H2-R4]` y `[H2-R7]` sobre SQLite en memoria verificando actualización, preservación ante errores, borrado real y `ExpenseNotFound`. Cubre: R2, R4, R7.

## Presentación (Mobile First + Desktop)

- [x] T5 — Actualizar `src/features/expenses/ExpenseFormScreen.jsx` (y su controlador `ExpenseFormController`) incorporando modo edición (`startEditExpense`, `cancelEditExpense`), acciones de editar y eliminar por gasto, confirmación explícita antes de eliminar (`requestDeleteExpense`, `cancelDeleteExpense`, `confirmDeleteExpense`), visualización y recálculo inmediato del total mensual (`monthlyTotalCents` / `data-testid="month-total-amount"`) y adaptación Mobile First + Desktop. Cubre: R1, R2, R3, R4, R5, R6, R7, R8.
- [x] T6 — Extender `test/features/expenses/ExpenseFormScreen.test.jsx` con pruebas de componente e interacción `[H2-R1]`, `[H2-R2]`, `[H2-R3]`, `[H2-R4]`, `[H2-R5]`, `[H2-R6]`, `[H2-R7]` y `[H2-R8]`. Cubre: R1, R2, R3, R4, R5, R6, R7, R8.

## Cierre

- [x] T7 — Documentar la trazabilidad en `progress/impl_h02_editar_eliminar_gasto.md` y actualizar `progress/traceability.md`.
- [x] T8 — Ejecutar `./init.sh` (o `powershell -ExecutionPolicy Bypass -File ./init.ps1`) y verificar que análisis estático, arnés SDD y pruebas están en verde.
