# Implementación — h03_listado_mensual

- **Feature:** `H3 — h03_listado_mensual` (Listado de gastos del mes)
- **Herramienta:** `antigravity`
- **Rol:** `implementer`
- **Estado:** `done` (listo para revisión por `reviewer`)

## Archivos creados y modificados

| Capa | Archivo | Acción |
|---|---|---|
| core | `src/core/dates.js` | Modificado (agregados `isValidYearMonth`, `shiftYearMonth` y `formatYearMonthLabel` con validación `InvalidExpenseDate`) |
| presentation | `src/features/expenses/ExpenseFormScreen.jsx` | Modificado (barra de navegación mensual `prev-month-button` / `next-month-button` / `active-month-label`, métodos `goToPreviousMonth`, `goToNextMonth`, `goToYearMonth` con tope en el mes actual, total `$ 0` en vacío y estado vacío con botón de acción directa `empty-state-cta-button` / `activateEmptyStateCta`) |
| test | `test/domain/models/expense.test.js` | Modificado (pruebas unitarias `[H3-R5]`, `[H3-R7]`) |
| test | `test/data/sqliteExpenseRepository.test.js` | Modificado (pruebas de persistencia `[H3-R1]`, `[H3-R5]`) |
| test | `test/features/expenses/ExpenseFormScreen.test.jsx` | Modificado (pruebas de componente e interacción `[H3-R1]`, `[H3-R2]`, `[H3-R3]`, `[H3-R4]`, `[H3-R5]`, `[H3-R6]`, `[H3-R8]`) |

## Trazabilidad (`R<n>` → Prueba)

| Requisito | Etiqueta | Archivo de prueba | Descripción de la prueba |
|---|---|---|---|
| R1 | `[H3-R1]` | `test/data/sqliteExpenseRepository.test.js`, `test/features/expenses/ExpenseFormScreen.test.jsx` | `[H3-R1][H3-R5] devuelve los gastos del período ordenados por fecha descendente (y id descendente) y aísla los registros al consultar el mes anterior` y `[H3-R1][H3-R2][H3-R3] muestra por defecto el listado del mes en curso ordenado por fecha descendente con monto, categoría, nota y el total acumulado del mes` |
| R2 | `[H3-R2]` | `test/features/expenses/ExpenseFormScreen.test.jsx` | `[H3-R1][H3-R2][H3-R3] muestra por defecto el listado del mes en curso ordenado por fecha descendente con monto, categoría, nota y el total acumulado del mes` |
| R3 | `[H3-R3]` | `test/features/expenses/ExpenseFormScreen.test.jsx` | `[H3-R1][H3-R2][H3-R3] muestra por defecto el listado del mes en curso ordenado por fecha descendente...` y `[H3-R3][H3-R4] cuando no hay gastos en el mes muestra total $ 0 y presenta el estado vacío con acceso directo a la carga` |
| R4 | `[H3-R4]` | `test/features/expenses/ExpenseFormScreen.test.jsx` | `[H3-R3][H3-R4] cuando no hay gastos en el mes muestra total $ 0 y presenta el estado vacío con acceso directo a la carga` |
| R5 | `[H3-R5]` | `test/domain/models/expense.test.js`, `test/data/sqliteExpenseRepository.test.js`, `test/features/expenses/ExpenseFormScreen.test.jsx` | `[H3-R5] calcula correctamente el mes anterior y el mes siguiente en formato YYYY-MM incluyendo el cambio de año...`, `[H3-R1][H3-R5] devuelve los gastos del período ordenados por fecha descendente...` y `[H3-R5][H3-R6] permite navegar al mes anterior y volver al mes siguiente recargando los gastos y el total de cada período sin avanzar más allá del mes actual` |
| R6 | `[H3-R6]` | `test/features/expenses/ExpenseFormScreen.test.jsx` | `[H3-R5][H3-R6] permite navegar al mes anterior y volver al mes siguiente recargando los gastos y el total de cada período sin avanzar más allá del mes actual` |
| R7 | `[H3-R7]` | `test/domain/models/expense.test.js` | `[H3-R7] rechaza períodos mensuales inválidos en shiftYearMonth y formatYearMonthLabel lanzando InvalidExpenseDate` |
| R8 | `[H3-R8]` | `test/features/expenses/ExpenseFormScreen.test.jsx` | `[H3-R8] presenta la barra de navegación mensual y el estado vacío con CTA aplicando diseño Mobile First (< 768px) y adaptación Desktop (>= 768px)` |

## Desvíos respecto del diseño

- Ninguno. Se respetó íntegramente `specs/h03_listado_mensual/design.md` sin agregar dependencias nuevas a `package.json`.
