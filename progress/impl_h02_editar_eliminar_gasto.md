# Implementación — h02_editar_eliminar_gasto

- **Feature:** `H2 — h02_editar_eliminar_gasto` (Editar o eliminar un gasto)
- **Herramienta:** `antigravity`
- **Rol:** `implementer`
- **Estado:** `done` (listo para revisión por `reviewer`)

## Archivos creados y modificados

| Capa | Archivo | Acción |
|---|---|---|
| core | `src/core/errors.js` | Modificado (agregada excepción `ExpenseNotFound`) |
| core | `src/core/formatters.js` | Modificado (agregada función `formatCentsToInput(amountCents)`) |
| domain | `src/domain/repositories/expenseRepository.js` | Modificado (extendido contrato `ExpenseRepository` con `findById(id)`, `update(expense)` y `deleteById(id)`) |
| data | `src/data/repositories/sqliteExpenseRepository.js` | Modificado (implementados `findById(id)`, `update(expense)` preservando `created_at` y actualizando `updated_at`, y `deleteById(id)` con borrado físico y excepción `ExpenseNotFound`) |
| presentation | `src/features/expenses/ExpenseFormScreen.jsx` | Modificado (modo edición con precarga y cancelación, botones de acción por ítem, bloque de confirmación inline antes de eliminar, y resumen con total mensual `month-total-amount` recalculado en vivo con diseño Mobile First + Desktop) |
| test | `test/domain/models/expense.test.js` | Modificado (pruebas unitarias `[H2-R2]`, `[H2-R4]`) |
| test | `test/data/sqliteExpenseRepository.test.js` | Modificado (pruebas de persistencia en SQLite en memoria `[H2-R2]`, `[H2-R4]`, `[H2-R7]`) |
| test | `test/features/expenses/ExpenseFormScreen.test.jsx` | Modificado (pruebas de componente e interacción `[H2-R1]`, `[H2-R2]`, `[H2-R3]`, `[H2-R4]`, `[H2-R5]`, `[H2-R6]`, `[H2-R7]`, `[H2-R8]`) |

## Trazabilidad (`R<n>` → Prueba)

| Requisito | Etiqueta | Archivo de prueba | Descripción de la prueba |
|---|---|---|---|
| R1 | `[H2-R1]` | `test/features/expenses/ExpenseFormScreen.test.jsx` | `[H2-R1] al seleccionar editar sobre un gasto existente del listado mensual carga sus datos actuales en el formulario y activa el modo edición` |
| R2 | `[H2-R2]` | `test/domain/models/expense.test.js`, `test/data/sqliteExpenseRepository.test.js`, `test/features/expenses/ExpenseFormScreen.test.jsx` | `[H2-R2] formatea centavos a cadena editable con formatCentsToInput y conserva createdAt al crear una copia actualizada de Expense`, `[H2-R2] actualiza un gasto existente en SQLite conservando id y created_at original y actualizando updated_at en formato ISO 8601` y `[H2-R2][H2-R3] al confirmar la edición de un gasto válido actualiza SQLite conservando created_at, refleja los cambios en el listado y recalcula el total del mes sin reiniciar` |
| R3 | `[H2-R3]` | `test/features/expenses/ExpenseFormScreen.test.jsx` | `[H2-R2][H2-R3] al confirmar la edición de un gasto válido actualiza SQLite conservando created_at, refleja los cambios en el listado y recalcula el total del mes sin reiniciar` |
| R4 | `[H2-R4]` | `test/domain/models/expense.test.js`, `test/data/sqliteExpenseRepository.test.js`, `test/features/expenses/ExpenseFormScreen.test.jsx` | `[H2-R4] define la excepción ExpenseNotFound, valida formatCentsToInput ante importes inválidos y expone findById, update y deleteById en ExpenseRepository`, `[H2-R4] no modifica la base de datos y lanza InvalidAmount, InvalidCategory o ExpenseNotFound cuando la actualización o eliminación es inválida` y `[H2-R4] durante la edición rechaza montos vacíos, cero, negativos o no numéricos e identificadores inexistentes sin modificar el registro en SQLite` |
| R5 | `[H2-R5]` | `test/features/expenses/ExpenseFormScreen.test.jsx` | `[H2-R5][H2-R6][H2-R7] solicita confirmación antes de eliminar, conserva el gasto si se cancela y al confirmar lo borra de SQLite y recalcula el total del mes` |
| R6 | `[H2-R6]` | `test/features/expenses/ExpenseFormScreen.test.jsx` | `[H2-R5][H2-R6][H2-R7] solicita confirmación antes de eliminar, conserva el gasto si se cancela y al confirmar lo borra de SQLite y recalcula el total del mes` |
| R7 | `[H2-R7]` | `test/data/sqliteExpenseRepository.test.js`, `test/features/expenses/ExpenseFormScreen.test.jsx` | `[H2-R7] elimina físicamente el gasto de la tabla expenses en SQLite al ejecutar deleteById` y `[H2-R5][H2-R6][H2-R7] solicita confirmación antes de eliminar, conserva el gasto si se cancela y al confirmar lo borra de SQLite y recalcula el total del mes` |
| R8 | `[H2-R8]` | `test/features/expenses/ExpenseFormScreen.test.jsx` | `[H2-R8] presenta los controles de edición, eliminación, confirmación y total mensual con diseño Mobile First (< 768px) y adaptación Desktop (>= 768px)` |

## Desvíos respecto del diseño

- Ninguno. Se respetó íntegramente `specs/h02_editar_eliminar_gasto/design.md` sin agregar dependencias nuevas a `package.json`.
