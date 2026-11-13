# Tasks — h04_categorias_propias

> Pasos discretos en orden. El implementer marca `[x]` al completar cada uno.
> Cada tarea indica los requisitos que cubre.

## Core y Dominio

- [x] T1 — Agregar las excepciones `DuplicateCategory`, `CategoryNotFound`, `PredefinedCategoryDeletionNotAllowed` y `CategoryInUse` en `src/core/errors.js`, actualizar `Category` en `src/domain/models/category.js` para admitir borradores de categorías propias (`id = null` antes de persistir, `isPredefined = false`) y extender `CategoryRepository` (`src/domain/repositories/categoryRepository.js`) y `ExpenseRepository` (`src/domain/repositories/expenseRepository.js`) con `findByName`, `save`, `countExpenses`, `deleteById`, `countByCategoryId` y `reassignCategory`. Cubre: R1, R3, R4, R5, R6, R7.
- [x] T2 — Extender `test/domain/models/expense.test.js` con pruebas unitarias `[H4-R1]`, `[H4-R3]`, `[H4-R4]`, `[H4-R5]` y `[H4-R7]` para `Category`, las nuevas excepciones de dominio y los métodos extendidos de `CategoryRepository` y `ExpenseRepository`. Cubre: R1, R3, R4, R5, R7.

## Persistencia (`expo-sqlite` / SQLite en memoria)

- [x] T3 — Implementar `findByName(name)`, `save(category)`, `countExpenses(categoryId)` y `deleteById(id, { reassignToCategoryId })` en `src/data/repositories/sqliteCategoryRepository.js` y `countByCategoryId(categoryId)` y `reassignCategory(fromCategoryId, toCategoryId)` en `src/data/repositories/sqliteExpenseRepository.js`. Cubre: R1, R3, R4, R5, R6, R7.
- [x] T4 — Extender `test/data/sqliteExpenseRepository.test.js` con pruebas de persistencia `[H4-R1]`, `[H4-R3]`, `[H4-R4]`, `[H4-R5]`, `[H4-R6]` y `[H4-R7]` sobre SQLite en memoria verificando alta de categoría propia, rechazo de nombres vacíos o duplicados sin distinguir mayúsculas (`COLLATE NOCASE`), bloqueo de eliminación de categorías predefinidas, borrado de categorías propias sin gastos y borrado tras reasignar sus gastos asociados. Cubre: R1, R3, R4, R5, R6, R7.

## Presentación (Mobile First + Desktop)

- [x] T5 — Actualizar `src/features/expenses/ExpenseFormScreen.jsx` (y `ExpenseFormController`, junto con la sincronización en `src/features/income/MonthlyOverviewScreen.jsx`) incorporando la sección de gestión de categorías propias (`createCustomCategory`, `requestDeleteCategory`, `setReassignTargetCategoryId`, `cancelDeleteCategory`, `confirmDeleteCategory`), disponibilidad inmediata de la nueva categoría en el selector de carga, protección visual de predefinidas, flujo de reasignación de gastos antes de eliminar y diseño responsivo Mobile First + Desktop. Cubre: R1, R2, R3, R4, R5, R6, R7, R8.
- [x] T6 — Extender `test/features/expenses/ExpenseFormScreen.test.jsx` con pruebas de componente e interacción `[H4-R1]`, `[H4-R2]`, `[H4-R3]`, `[H4-R4]`, `[H4-R5]`, `[H4-R6]`, `[H4-R7]` y `[H4-R8]`. Cubre: R1, R2, R3, R4, R5, R6, R7, R8.

## Cierre

- [x] T7 — Documentar la trazabilidad en `progress/impl_h04_categorias_propias.md` y actualizar `progress/traceability.md`.
- [x] T8 — Ejecutar `./init.sh` (o `powershell -ExecutionPolicy Bypass -File ./init.ps1`) y verificar que análisis estático, arnés SDD y pruebas están en verde.
