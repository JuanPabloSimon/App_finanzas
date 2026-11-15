# Tasks — h07_comparacion_mensual

> Pasos discretos en orden. El implementer marca `[x]` al completar cada uno.
> Cada tarea indica los requisitos que cubre.

## Dominio y formato

- [x] T1 — Crear `src/domain/services/monthlyComparison.js` con
  `COMPARISON_WINDOW_MONTHS = 5` y `calculateVariationTenths(currentCents, previousCents)`
  (validación `Number.isSafeInteger` y `>= 0` con `InvalidAmount`; `null` si
  `previousCents === 0`; redondeo de empates lejos del cero con `BigInt`). Sin imports de
  `react`, `react-dom`, `node:sqlite` ni HTTP. Cubre: R5, R6, R15, R16, R17.
- [x] T2 — Agregar `buildMonthlyComparison({ activeYearMonth, currentTotalCents,
  previousMonthlyTotals })` en el mismo archivo según el algoritmo de `design.md`
  (ventana con `shiftYearMonth`, ausentes = `0`, recorte en el mes de inicio de la serie,
  resultado congelado). Cubre: R1, R2, R3, R4, R7, R15, R16.
- [x] T3 — Pruebas en `test/domain/services/monthlyComparison.test.js`
  (`describe('H7 comparación mensual', ...)`):
  - `[H7-R1]` `currentTotalCents` y `activeYearMonth` del resultado son los recibidos (mes
    seleccionado `2026-08` aunque el calendario sea otro).
  - `[H7-R2]` con totales en los 5 meses previos y uno fuera de la ventana (`-6`), devuelve
    exactamente 5 meses del más reciente al más antiguo; entrada desordenada; cruce de año
    (`2026-02` → `2026-01`..`2025-09`).
  - `[H7-R3]` meses intermedios sin gastos aparecen con `totalCents: 0`.
  - `[H7-R4]` si el mes más antiguo con datos es `-3`, los meses `-4` y `-5` no aparecen.
  - `[H7-R5]` tabla de ejemplos de `design.md` (incluye `2001/2000 → 1` y
    `1999/2000 → -1`).
  - `[H7-R6]` `previousCents = 0` → `null`; `buildMonthlyComparison` con mes `-1` en `0`
    y `-2` con datos → `variationTenths: null`; ningún valor del resultado es `NaN` ni
    infinito.
  - `[H7-R7]` sin datos en la ventana → `hasPreviousData: false`, `previousMonths: []`,
    `previousTotalCents: null`, `variationTenths: null`.
  - `[H7-R15]` `calculateVariationTenths` se importa desde el módulo y da el mismo valor
    que `buildMonthlyComparison(...).variationTenths` para los mismos totales.
  - `[H7-R16]` montos `1.5`, `-1`, `'100'`, `NaN` y `2 ** 53` lanzan `InvalidAmount`.
  - `[H7-R17]` el archivo fuente no contiene imports de `react`, `react-dom`,
    `node:sqlite`, `axios` ni llamadas a `fetch(`.
  Cubre: R1, R2, R3, R4, R5, R6, R7, R15, R16, R17.
- [x] T4 — Agregar `formatVariationTenths` en `src/core/formatters.js` (solo aritmética
  entera). Cubre: R9.
- [x] T5 — Pruebas `[H7-R9]` en `test/core/formatters.test.js`: `125 → "+12,5 %"`,
  `-60 → "-6,0 %"`, `0 → "0,0 %"`, `5 → "+0,5 %"`, `-1000 → "-100,0 %"`; no entero lanza
  `InvalidAmount`. Cubre: R9.

## Presentación (Mobile First + Desktop)

- [x] T6 — Crear `src/features/dashboard/monthlyTotalsLoader.js` con
  `loadPreviousMonthlyTotals(expenseRepository, activeYearMonth)` (5 llamadas a
  `findByYearMonth` en paralelo, suma entera por mes). Cubre: R2, R12.
- [x] T7 — Crear `src/features/dashboard/MonthlyComparisonPanel.jsx` con los
  `data-testid`, textos y `data-comparison-layout` de `design.md`; montos con
  `formatCentsToArs`, meses con `formatYearMonthLabel`, variación con
  `formatVariationTenths` y `data-variation-trend`. Cubre: R8, R9, R10, R11, R14.
- [x] T8 — Pruebas en `test/features/dashboard/MonthlyComparisonPanel.test.jsx` con
  `renderToStaticMarkup`:
  - `[H7-R8]` con 3 meses previos se ven el total actual, 3 filas
    `monthly-comparison-row-<yearMonth>` con etiqueta y monto en pesos, y la variación.
  - `[H7-R9]` la variación `125` se muestra como `+12,5 %` con
    `data-variation-trend="up"`; `-60` como `-6,0 %` con `"down"`; `0` como `0,0 %` con
    `"flat"`.
  - `[H7-R10]` con `variationTenths: null` y datos previos aparece
    `monthly-comparison-no-base` con el texto exacto y no aparece
    `monthly-comparison-variation`.
  - `[H7-R11]` con `hasPreviousData: false` aparecen `monthly-comparison-current` y
    `monthly-comparison-empty` con el texto exacto, sin `monthly-comparison-row-`, sin
    `monthly-comparison-variation`, sin `NaN` ni `Infinity`.
  - `[H7-R14]` `viewportWidth` 390 → `"mobile"` (una columna); 800 → `"tablet"` y
    1280 → `"desktop"` (dos columnas); cifras con `tabular-nums`.
  Cubre: R8, R9, R10, R11, R14.
- [x] T9 — En `src/features/income/MonthlyOverviewScreen.jsx`:
  - Controlador: cargar `this.previousMonthlyTotals` con `loadPreviousMonthlyTotals` dentro
    de `reloadMonthData`; exponer `monthlyComparison` en `getState()` con
    `currentTotalCents = totalExpensesCents`.
  - Componente: estado `previousMonthlyTotals` cargado en el mismo `Promise.all` de
    `reloadPeriod` y del `useEffect` de carga; calcular `monthlyComparison` en el render y
    renderizar `MonthlyComparisonPanel` en `tab-panel-expenses` debajo de
    `CategoryRankingList`, sin tocar la rama `overview`.
  Cubre: R1, R8, R12, R13.
- [x] T10 — Pruebas de integración en `test/features/income/MonthlyOverviewScreen.test.jsx`
  con SQLite en memoria y `createController` (`today: () => '2026-11-10'`):
  - `[H7-R1]` tras `goToPreviousMonth` a `2026-10`, `getState().monthlyComparison`
    usa `2026-10` como mes actual y `currentTotalCents === totalExpensesCents`.
  - `[H7-R8]` con gastos en `2026-09`, `2026-10` y `2026-11`, la pestaña `expenses`
    muestra `monthly-comparison` con el total de noviembre, las filas de octubre y
    septiembre y la variación correcta.
  - `[H7-R12]` tras `registerExpense`, `updateExpense` (cambiando el gasto de mes),
    `deleteExpense` y `goToPreviousMonth`, `monthlyComparison` y el HTML reflejan los
    nuevos totales y la nueva variación.
  - `[H7-R13]` en la pestaña `overview` no aparece `monthly-comparison` y sigue
    `overview-viewport-box`.
  Cubre: R1, R8, R12, R13.
- [x] T11 — Verificar que las pruebas existentes `[H3-*]`, `[H5-*]`, `[H6-*]`, `[H8-*]` y
  `[H13-*]` siguen en verde sin modificarlas. Cubre: R13.

## Cierre

- [x] T12 — Documentar la trazabilidad CA ↔ R ↔ prueba en
  `progress/impl_h07_comparacion_mensual.md` y agregar las filas H7 en
  `progress/traceability.md`.
- [x] T13 — Ejecutar `./init.sh` (o `./init.ps1`) y verificar lint, pruebas y
  `node tool/harness_check.mjs` en verde.
