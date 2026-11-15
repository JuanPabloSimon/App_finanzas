# Implementación — H7 `h07_comparacion_mensual`

- **Estado:** implementado, pendiente de revisión (`in_progress`; no se marca `done`).
- **Herramienta / rol:** `claude-code` / `implementer`.
- **Fecha:** 2026-11-14.
- **Rama:** `feature/h07-comparacion-mensual` (sin commits ni push del implementer).
- **Spec:** `specs/h07_comparacion_mensual/` (aprobado por Francisco el 2026-11-14).
- **Tareas:** T1..T13 marcadas `[x]` en `specs/h07_comparacion_mensual/tasks.md`.

## Archivos creados

| Archivo | Contenido |
|---|---|
| `src/domain/services/monthlyComparison.js` | `COMPARISON_WINDOW_MONTHS = 5`, `calculateVariationTenths` (validación `Number.isSafeInteger` y `>= 0` → `InvalidAmount`; `null` si el anterior es `0`; redondeo de empates lejos del cero con `BigInt`) y `buildMonthlyComparison` (ventana `-1..-5` con `shiftYearMonth`, ausentes = `0`, recorte en el mes de inicio de la serie, resultado congelado). JS puro: solo importa `core/dates.js` y `core/errors.js`. |
| `src/features/dashboard/monthlyTotalsLoader.js` | `loadPreviousMonthlyTotals(expenseRepository, activeYearMonth)`: 5 llamadas a `findByYearMonth` en paralelo y suma entera por mes. |
| `src/features/dashboard/MonthlyComparisonPanel.jsx` | Panel `monthly-comparison` Mobile First + Desktop con los `data-testid`, textos y `data-comparison-layout` de `design.md`; `data-variation-trend` (`up`/`down`/`flat`); `MonthlyComparisonPanel.buildStyles(viewportWidth)` (mismo patrón que `CategoryRankingList`). |
| `test/domain/services/monthlyComparison.test.js` | `[H7-R1]`..`[H7-R7]`, `[H7-R15]`..`[H7-R17]`. |
| `test/core/formatters.test.js` | `[H7-R9]` sobre `formatVariationTenths`. |
| `test/features/dashboard/monthlyTotalsLoader.test.js` | `[H7-R2]`, `[H7-R12]` sobre SQLite en memoria (`AppDatabase.openInMemory()`). |
| `test/features/dashboard/MonthlyComparisonPanel.test.jsx` | `[H7-R8]`..`[H7-R11]`, `[H7-R14]` con `renderToStaticMarkup`. |

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/core/formatters.js` | Nueva `formatVariationTenths` (aritmética entera; no entero → `InvalidAmount`). |
| `src/features/income/MonthlyOverviewScreen.jsx` | Controlador: `this.previousMonthlyTotals` cargado con `loadPreviousMonthlyTotals` dentro del `Promise.all` de `reloadMonthData` (cubre `initialize`, cambio de período y alta/edición/baja); `getState()` expone `monthlyComparison` (con `currentTotalCents = totalExpensesCents`) y `previousMonthlyTotals`. Componente: estado `previousMonthlyTotals` cargado en el mismo `Promise.all` de `reloadPeriod` y del `useEffect`; `monthlyComparison` calculado en el render; `MonthlyComparisonPanel` dentro de `tab-panel-expenses`, debajo de `CategoryRankingList`. La rama `overview` no se tocó. Nueva prop `initialPreviousMonthlyTotals` (ver desvíos). |
| `test/features/income/MonthlyOverviewScreen.test.jsx` | Nuevo `describe('H7 comparación mensual integrada en la pestaña Gastos')` con `[H7-R1]`, `[H7-R8]`, `[H7-R12]`, `[H7-R13]` sobre SQLite en memoria. Pruebas H5/H6/H8/H13 existentes sin modificar. |
| `specs/h07_comparacion_mensual/tasks.md` | T1..T13 marcadas `[x]`. |
| `progress/current.md`, `progress/traceability.md` | Plan, bitácora y filas de H7. |

Sin dependencias nuevas (`BigInt` es nativo), sin migraciones, `src/data/` y `docs/data_model.md` sin cambios.

## Trazabilidad R → prueba

| Req | Prueba(s) | Archivo |
|---|---|---|
| R1 | `[H7-R1] toma como mes actual el mes seleccionado...`; `[H7-R1] usa el mes seleccionado como mes actual y su total coincide con el total de gastos del período` | `test/domain/services/monthlyComparison.test.js`, `test/features/income/MonthlyOverviewScreen.test.jsx` |
| R2 | `[H7-R2] incluye como máximo los cinco meses anteriores... cruce de año`; `[H7-R2] devuelve los cinco meses anteriores al mes activo... desde SQLite` | `test/domain/services/monthlyComparison.test.js`, `test/features/dashboard/monthlyTotalsLoader.test.js` |
| R3 | `[H7-R3] incluye con total 0 los meses sin gastos ubicados entre el mes actual y el mes de inicio de la serie` | `test/domain/services/monthlyComparison.test.js` |
| R4 | `[H7-R4] no incluye los meses de la ventana más antiguos que el mes de inicio de la serie` | `test/domain/services/monthlyComparison.test.js` |
| R5 | `[H7-R5] calcula la variación en décimas de punto con redondeo de empates lejos del cero y aritmética entera` (tabla de `design.md` + `MAX_SAFE_INTEGER`) | `test/domain/services/monthlyComparison.test.js` |
| R6 | `[H7-R6] si el mes anterior tiene total 0 la variación es null, sin NaN ni infinitos` | `test/domain/services/monthlyComparison.test.js` |
| R7 | `[H7-R7] si ningún mes de la ventana tiene gastos informa que no hay datos previos` | `test/domain/services/monthlyComparison.test.js` |
| R8 | `[H7-R8] con tres meses previos muestra el total actual, una fila por mes...`; `[H7-R8] en la pestaña Gastos muestra el panel de comparación debajo del ranking...` | `test/features/dashboard/MonthlyComparisonPanel.test.jsx`, `test/features/income/MonthlyOverviewScreen.test.jsx` |
| R9 | `[H7-R9] formatea la variación con signo explícito...`; `[H7-R9] rechaza con InvalidAmount...`; `[H7-R9] muestra la variación con signo... data-variation-trend` | `test/core/formatters.test.js`, `test/features/dashboard/MonthlyComparisonPanel.test.jsx` |
| R10 | `[H7-R10] con datos previos y variación no calculable muestra el aviso exacto en lugar de la variación` | `test/features/dashboard/MonthlyComparisonPanel.test.jsx` |
| R11 | `[H7-R11] sin meses previos con datos muestra el total actual y el estado vacío...` | `test/features/dashboard/MonthlyComparisonPanel.test.jsx` |
| R12 | `[H7-R12] refleja los gastos nuevos o eliminados en una nueva carga`; `[H7-R12] recalcula la comparación al registrar, editar, eliminar gastos y al cambiar de período...` | `test/features/dashboard/monthlyTotalsLoader.test.js`, `test/features/income/MonthlyOverviewScreen.test.jsx` |
| R13 | `[H7-R13] en la pestaña Resumen no renderiza el panel de comparación y conserva la vista sin scroll vertical` | `test/features/income/MonthlyOverviewScreen.test.jsx` |
| R14 | `[H7-R14] aplica Mobile First (< 768px) en una columna y se adapta a tablet y desktop en dos columnas, con cifras tabulares` | `test/features/dashboard/MonthlyComparisonPanel.test.jsx` |
| R15 | `[H7-R15] expone calculateVariationTenths y buildMonthlyComparison la usa para la variación` | `test/domain/services/monthlyComparison.test.js` |
| R16 | `[H7-R16] lanza InvalidAmount ante totales que no son enteros seguros no negativos` | `test/domain/services/monthlyComparison.test.js` |
| R17 | `[H7-R17] el módulo de dominio de la comparación no importa react, react-dom, node:sqlite ni clientes HTTP` | `test/domain/services/monthlyComparison.test.js` |

| Criterio | Requisitos |
|---|---|
| CA1 (total del mes actual y hasta cinco anteriores, con variación) | R1, R2, R3, R4, R5, R6, R8, R9, R10, R12, R13, R14, R15, R16, R17 |
| CA2 (sin meses previos se informa que no hay datos) | R7, R11 |

## Salida resumida de `./init.sh`

```
── 1. Entorno            [OK] Node.js v22.20.0
── 2. Dependencias       [OK] node_modules presente
── 3. Arnés SDD          [OK] H7: spec completo (17 requisitos)
                         [OK] H7: todos los requisitos tienen prueba etiquetada
                         (H1..H6, H8, H12, H13 también en OK)
── 4. ESLint             [OK] eslint sin problemas
── 5. Pruebas            # tests 118 · # pass 118 · # fail 0
── 6. Resumen            [OK] Entorno listo.
```

## Desvíos respecto del diseño

1. **Prop `initialPreviousMonthlyTotals` en `MonthlyOverviewScreen`.** `design.md` describe
   el estado `previousMonthlyTotals` del componente cargado en `reloadPeriod` y en el
   `useEffect`, pero `controller.renderElement()` hidrata el componente con `initial*` y el
   `useEffect` no corre en `renderToStaticMarkup`. Sin una prop inicial, el HTML de las
   pruebas de integración (T10) no podía mostrar los meses previos. Se agregó la prop
   (alimentada desde `getState().previousMonthlyTotals`) y se sumó a la condición que omite
   la carga del `useEffect`, para que un render con `initial*` parcial siga cargando los
   totales desde el repositorio. `AppShell.jsx` no pasa `initial*`, así que en el navegador
   la carga sigue siendo la del `useEffect`. Mismo patrón que `initialExpenses`; sin cambio
   de requisitos.
2. **Prueba adicional del loader.** `tasks.md` no pedía un archivo de prueba para
   `monthlyTotalsLoader.js` (T6). Se agregó `test/features/dashboard/monthlyTotalsLoader.test.js`
   con `[H7-R2]` y `[H7-R12]` sobre SQLite en memoria para cumplir «todo código va con su
   prueba».
3. **`getState()` expone también `previousMonthlyTotals`** (copia) además de
   `monthlyComparison`, para alimentar el desvío 1.

## Notas

- Las filas H8 de `progress/traceability.md` siguen con estado «En revisión» aunque H8
  está `done`; no se tocaron por estar fuera del alcance de esta feature (lo puede corregir
  el leader).
- `src/core/formatters.js` quedó normalizado a CRLF (el archivo original era CRLF).
