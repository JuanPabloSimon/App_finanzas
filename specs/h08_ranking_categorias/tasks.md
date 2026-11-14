# Tasks — h08_ranking_categorias

> Pasos discretos en orden. El implementer marca `[x]` al completar cada uno.
> Cada tarea indica los requisitos que cubre.

## Dominio

- [x] T1 — Crear `src/domain/services/categoryRanking.js` con `compareCategoryTotals`
  (monto descendente, `localeCompare('es', { sensitivity: 'base' })`, `categoryId`
  ascendente) y `buildCategoryRanking` (filtra montos no enteros o `<= 0`, ordena, asigna
  `position` 1..n, congela). Sin imports de `react`, `react-dom`, `node:sqlite` ni HTTP.
  Cubre: R1, R2, R3, R4, R5, R13.
- [x] T2 — En `src/domain/models/monthlyIncome.js`, reemplazar el comparador en línea de
  `calculateCategoryIncomeBreakdown` por `compareCategoryTotals`. Cubre: R10.
- [x] T3 — Pruebas en `test/domain/services/categoryRanking.test.js`
  (`describe('H8 ranking de categorías', ...)`):
  - `[H8-R1]` una entrada por categoría con gasto, montos sumados en centavos, sin
    categorías sin gasto ni montos `<= 0`.
  - `[H8-R2]` orden descendente por monto con entrada desordenada.
  - `[H8-R3]` empate de monto: orden alfabético con `'alimentos'` vs `'Bazar'`
    (mayúsculas), `'Óptica'` vs `'Panadería'` (acento) y `'Nafta'` vs `'Ñoquis'` (`ñ`).
  - `[H8-R4]` empate de monto y nombre equivalente (`'Café'` id 7 vs `'Cafe'` id 3):
    gana `categoryId` menor, independientemente del orden de entrada.
  - `[H8-R5]` posiciones 1..n consecutivas, sin repetir ante empates; `[]` congelado con
    entrada vacía.
  - `[H8-R10]` `calculateCategoryIncomeBreakdown` devuelve las categorías en el mismo
    orden que `buildCategoryRanking` para un caso con empates y nombres equivalentes.
  - `[H8-R13]` el archivo fuente no contiene imports de `react`, `react-dom`,
    `node:sqlite`, `axios` ni llamadas a `fetch(`.
  Cubre: R1, R2, R3, R4, R5, R10, R13.
- [x] T4 — Verificar que `[H6-R7]` y el resto de `test/domain/models/monthlyIncome.test.js`
  siguen en verde sin modificarlos. Cubre: R10.

## Presentación (Mobile First + Desktop)

- [x] T5 — Crear `src/features/dashboard/CategoryRankingList.jsx` con los `data-testid`
  de `design.md`, posición `N°`, nombre, monto con `formatCentsToArs`, porcentaje
  `expensePercentage`, estado vacío y `data-ranking-layout` según
  `getViewportLayout`. Cubre: R6, R7, R8, R12.
- [x] T6 — Pruebas en `test/features/dashboard/CategoryRankingList.test.jsx` con
  `renderToStaticMarkup`:
  - `[H8-R6]` con 6 categorías se renderizan las 6 filas en orden, con posición, nombre,
    monto en pesos y porcentaje.
  - `[H8-R7]` con 3 categorías hay exactamente 3 filas y ninguna posición `4°`.
  - `[H8-R8]` con ranking vacío se muestra `category-ranking-empty` con el texto exacto,
    sin `category-ranking-row-`, `NaN` ni `Infinity`.
  - `[H8-R12]` `viewportWidth` 390 → `data-ranking-layout="mobile"`; 800 → `"tablet"`;
    1280 → `"desktop"`; columnas de grilla según `design.md`.
  Cubre: R6, R7, R8, R12.
- [x] T7 — En `src/features/income/MonthlyOverviewScreen.jsx`, calcular
  `categoryRanking` con `buildCategoryRanking(categoryBreakdown)` en el render y exponerlo
  en `getState()`; renderizar `CategoryRankingList` dentro de `tab-panel-expenses`, debajo
  de `ExpenseFormScreen`, sin tocar la rama `overview`. Cubre: R6, R9, R11.
- [x] T8 — Pruebas de integración en `test/features/income/MonthlyOverviewScreen.test.jsx`
  con base SQLite en memoria y el controlador (`createController`):
  - `[H8-R6]` en la pestaña `expenses` aparece `category-ranking` con las categorías del
    mes en orden.
  - `[H8-R9]` tras `registerExpense`, `updateExpense`, `deleteExpense` y
    `goToPreviousMonth`, `getState().categoryRanking` y el HTML reflejan el nuevo orden y
    montos.
  - `[H8-R11]` en la pestaña `overview` no aparece `category-ranking`.
  Cubre: R6, R9, R11.
- [x] T9 — Verificar que las pruebas existentes `[H6-*]` y `[H13-*]` siguen en verde sin
  modificarlas. Cubre: R10, R11.

## Cierre

- [x] T10 — Documentar la trazabilidad CA ↔ R ↔ prueba en
  `progress/impl_h08_ranking_categorias.md` y actualizar la fila H8 de
  `progress/traceability.md`.
- [x] T11 — Ejecutar `./init.sh` (o `./init.ps1`) y verificar lint, pruebas y
  `node tool/harness_check.mjs` en verde.
