# Tasks — h03_listado_mensual

> Pasos discretos en orden. El implementer marca `[x]` al completar cada uno.
> Cada tarea indica los requisitos que cubre.

## Core y Dominio

- [ ] T1 — Agregar `isValidYearMonth(value)`, `shiftYearMonth(yearMonth, deltaMonths)` y `formatYearMonthLabel(yearMonth)` en `src/core/dates.js`, lanzando `InvalidExpenseDate` ante períodos inválidos. Cubre: R5, R6, R7.
- [ ] T2 — Extender `test/domain/models/expense.test.js` con pruebas unitarias `[H3-R5]` y `[H3-R7]` para cálculo de mes anterior/siguiente (incluyendo cambio de año) y validación de formato `YYYY-MM`. Cubre: R5, R7.

## Persistencia (`expo-sqlite` / SQLite en memoria)

- [ ] T3 — Extender `test/data/sqliteExpenseRepository.test.js` con pruebas de persistencia `[H3-R1]` y `[H3-R5]` verificando el ordenamiento por fecha descendente (`date DESC, id DESC`) y el aislamiento de gastos al consultar el mes actual y el mes anterior. Cubre: R1, R2, R5.

## Presentación (Mobile First + Desktop)

- [ ] T4 — Actualizar `src/features/expenses/ExpenseFormScreen.jsx` (y `ExpenseFormController`) incorporando navegación entre meses (`goToPreviousMonth`, `goToNextMonth`, `goToYearMonth`, límite en el mes actual), visualización de total `$ 0` en meses sin gastos, y estado vacío con botón de acceso directo a la carga (`activateEmptyStateCta` / `data-testid="empty-state-cta-button"`). Cubre: R1, R2, R3, R4, R5, R6, R8.
- [ ] T5 — Extender `test/features/expenses/ExpenseFormScreen.test.jsx` con pruebas de componente e interacción `[H3-R1]`, `[H3-R2]`, `[H3-R3]`, `[H3-R4]`, `[H3-R5]`, `[H3-R6]` y `[H3-R8]`. Cubre: R1, R2, R3, R4, R5, R6, R8.

## Cierre

- [ ] T6 — Documentar la trazabilidad en `progress/impl_h03_listado_mensual.md` y actualizar `progress/traceability.md`.
- [ ] T7 — Ejecutar `./init.sh` (o `powershell -ExecutionPolicy Bypass -File ./init.ps1`) y verificar que análisis estático, arnés SDD y pruebas están en verde.
