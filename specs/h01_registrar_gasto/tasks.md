# Tasks — h01_registrar_gasto

> Pasos discretos en orden. El implementer marca `[x]` al completar cada uno.
> Cada tarea indica los requisitos que cubre.

## Core y Dominio

- [x] T1 — Extender `src/core/errors.js` con `InvalidAmount`, `InvalidExpenseDate` e `InvalidCategory`; extender `src/core/dates.js` con `isValidIsoDate`, `formatIsoDate` y `extractYearMonth`; y crear `src/core/formatters.js` con `parseAmountToCents` y `formatCentsToArs`. Cubre: R1, R2, R4, R5.
- [x] T2 — Crear los modelos inmutables `Category` en `src/domain/models/category.js` y `Expense` en `src/domain/models/expense.js` (`Object.freeze`, `copyWith`, `isEqual`, validación de centavos enteros `> 0`, fecha `YYYY-MM-DD`, `categoryId` y normalización de `subcategory` y `note` opcionales a `null`), junto con los contratos `CategoryRepository` (`src/domain/repositories/categoryRepository.js`) y `ExpenseRepository` (`src/domain/repositories/expenseRepository.js`). Cubre: R2, R4, R6, R7.
- [x] T3 — Crear pruebas unitarias `[H1-R2]`, `[H1-R4]`, `[H1-R6]` y `[H1-R7]` en `test/domain/models/expense.test.js` verificando `parseAmountToCents`, inmutabilidad de `Expense` y `Category`, rechazo de montos vacíos/cero/negativos/decimales con `InvalidAmount` y normalización de campos opcionales. Cubre: R2, R4, R6, R7.

## Persistencia (`expo-sqlite` / SQLite en memoria)

- [x] T4 — Crear `SqliteCategoryRepository` en `src/data/repositories/sqliteCategoryRepository.js` y `SqliteExpenseRepository` en `src/data/repositories/sqliteExpenseRepository.js` implementando `findAll`, `findById`, `save` y `findByYearMonth` con consultas SQL parametrizadas sobre `categories` y `expenses`. Cubre: R1, R2, R3, R6, R7.
- [x] T5 — Crear pruebas de persistencia `[H1-R1]`, `[H1-R2]`, `[H1-R4]`, `[H1-R6]` y `[H1-R7]` con base SQLite en memoria en `test/data/sqliteExpenseRepository.test.js`. Cubre: R1, R2, R4, R6, R7.

## Presentación (Mobile First + Desktop)

- [x] T6 — Crear `ExpenseFormScreen` en `src/features/expenses/ExpenseFormScreen.jsx` (y su controlador/integración en `src/app/AppShell.jsx`) con fecha actual por defecto, selector de categorías, validación de monto con mensaje junto al campo, campos opcionales de subcategoría y nota, listado del mes actualizado al guardar y layout responsivo Mobile First (`< 768px`) + Desktop (`≥ 768px`). Cubre: R1, R2, R3, R4, R5, R6, R7, R8.
- [x] T7 — Crear pruebas de componente e interacción `[H1-R1]`, `[H1-R2]`, `[H1-R3]`, `[H1-R4]`, `[H1-R5]`, `[H1-R6]`, `[H1-R7]` y `[H1-R8]` en `test/features/expenses/ExpenseFormScreen.test.jsx`. Cubre: R1, R2, R3, R4, R5, R6, R7, R8.

## Cierre

- [x] T8 — Documentar la trazabilidad en `progress/impl_h01_registrar_gasto.md` y actualizar `progress/traceability.md`.
- [x] T9 — Ejecutar `./init.sh` (o `powershell -ExecutionPolicy Bypass -File ./init.ps1`) y verificar que análisis estático, arnés SDD y pruebas están en verde.
