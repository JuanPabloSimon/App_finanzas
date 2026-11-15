# Implementación — H8 `h08_ranking_categorias`

- **Estado:** implementado, pendiente de revisión (`in_progress`; no se marca `done`).
- **Herramienta / rol:** `claude-code` / `implementer`.
- **Fecha:** 2026-11-14.
- **Spec:** `specs/h08_ranking_categorias/` (aprobado por Francisco el 2026-11-14).
- **Tareas:** T1..T11 marcadas `[x]` en `specs/h08_ranking_categorias/tasks.md`.

## Archivos creados

| Archivo | Contenido |
|---|---|
| `src/domain/services/categoryRanking.js` | `compareCategoryTotals` (monto desc → `localeCompare('es', { sensitivity: 'base' })` → `categoryId` asc) y `buildCategoryRanking` (filtra montos no enteros o `<= 0`, ordena, asigna `position` 1..n, congela). JS puro. |
| `src/features/dashboard/CategoryRankingList.jsx` | Panel `category-ranking` Mobile First + Desktop con los `data-testid` de `design.md`, `data-ranking-layout`, estado vacío y `CategoryRankingList.buildStyles(viewportWidth)` (mismo patrón que `CategoryDistributionChart.buildStyles`). |
| `test/domain/services/categoryRanking.test.js` | Pruebas `[H8-R1]`..`[H8-R5]`, `[H8-R10]`, `[H8-R13]`. |
| `test/features/dashboard/CategoryRankingList.test.jsx` | Pruebas `[H8-R6]`, `[H8-R7]`, `[H8-R8]`, `[H8-R12]` con `renderToStaticMarkup`. |

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/domain/models/monthlyIncome.js` | `calculateCategoryIncomeBreakdown` usa `compareCategoryTotals` en lugar del comparador en línea (sin cambio de contrato). |
| `src/features/income/MonthlyOverviewScreen.jsx` | Calcula `categoryRanking = buildCategoryRanking(categoryBreakdown)` en el render y en `getState()`; renderiza `CategoryRankingList` dentro de `tab-panel-expenses`, debajo de `ExpenseFormScreen`. La rama `overview` no se tocó. Pasa `onExpenseDeleted` a `ExpenseFormScreen` (ver desvíos). |
| `src/features/expenses/ExpenseFormScreen.jsx` | Nueva prop opcional `onExpenseDeleted` invocada tras eliminar un gasto con éxito (ver desvíos). |
| `test/features/income/MonthlyOverviewScreen.test.jsx` | Nuevo `describe('H8 ranking de categorías integrado en la pestaña Gastos')` con `[H8-R6]`, `[H8-R9]`, `[H8-R11]` sobre SQLite en memoria. Las pruebas H5/H6/H13 existentes no se modificaron. |
| `specs/h08_ranking_categorias/tasks.md` | T1..T11 marcadas `[x]`. |
| `progress/current.md`, `progress/traceability.md` | Plan, bitácora y filas de H8. |

Sin dependencias nuevas, sin migraciones, `docs/data_model.md` sin cambios.

## Trazabilidad R → prueba

| Req | Prueba(s) | Archivo |
|---|---|---|
| R1 | `[H8-R1] incluye una entrada por categoría con gasto en el mes...` | `test/domain/services/categoryRanking.test.js` |
| R2 | `[H8-R2] ordena de mayor a menor monto aunque la entrada llegue desordenada` | `test/domain/services/categoryRanking.test.js` |
| R3 | `[H8-R3] ante montos iguales ordena alfabéticamente sin distinguir mayúsculas ni acentos y con la ñ después de la n` | `test/domain/services/categoryRanking.test.js` |
| R4 | `[H8-R4] ... desempata por categoryId ascendente sin depender del orden de entrada` | `test/domain/services/categoryRanking.test.js` |
| R5 | `[H8-R5] asigna posiciones consecutivas 1..n ... arreglo congelado vacío` | `test/domain/services/categoryRanking.test.js` |
| R6 | `[H8-R6] con seis categorías muestra todas las filas en orden...`; `[H8-R6] en la pestaña Gastos muestra el panel del ranking debajo del formulario...` | `test/features/dashboard/CategoryRankingList.test.jsx`, `test/features/income/MonthlyOverviewScreen.test.jsx` |
| R7 | `[H8-R7] con tres categorías muestra exactamente tres filas, sin relleno ni posición 4°` | `test/features/dashboard/CategoryRankingList.test.jsx` |
| R8 | `[H8-R8] sin gastos muestra el estado vacío con el texto exacto...` | `test/features/dashboard/CategoryRankingList.test.jsx` |
| R9 | `[H8-R9] recalcula el ranking al registrar, editar y eliminar gastos y al cambiar de período...` | `test/features/income/MonthlyOverviewScreen.test.jsx` |
| R10 | `[H8-R10] el desglose de H6 presenta las categorías en el mismo orden que el ranking...` | `test/domain/services/categoryRanking.test.js` |
| R11 | `[H8-R11] en la pestaña Resumen no renderiza el panel del ranking y conserva la vista sin scroll vertical` | `test/features/income/MonthlyOverviewScreen.test.jsx` |
| R12 | `[H8-R12] aplica Mobile First (< 768px) ... tablet y desktop con grilla de cuatro columnas y cifras tabulares` | `test/features/dashboard/CategoryRankingList.test.jsx` |
| R13 | `[H8-R13] el módulo de dominio del ranking no importa react, react-dom, node:sqlite ni clientes HTTP` | `test/domain/services/categoryRanking.test.js` |

| Criterio | Requisitos |
|---|---|
| CA1 (orden descendente, al menos las cinco primeras) | R1, R2, R5, R6, R7, R8, R9, R11, R12, R13 |
| CA2 (empates en orden alfabético) | R3, R4, R10 |

## Salida resumida de `./init.sh`

```
── 1. Entorno            [OK] Node.js v22.20.0 · npm v10.9.3
── 2. Dependencias       [OK] node_modules presente
── 3. Arnés SDD          [OK] H8: spec completo (13 requisitos)
                         [OK] H8: todos los requisitos tienen prueba etiquetada
                         [OK] Trazabilidad (K6 parcial): 77 de 77 requisitos con prueba (100 %)
                         [OK] Arnés consistente (0 advertencias).
── 4. ESLint             [OK] eslint sin problemas
── 5. Pruebas            # tests 95 · # pass 95 · # fail 0  (antes de H8: 81)
── 6. Resumen            [OK] Entorno listo.
```

Las pruebas `[H6-*]` y `[H13-*]` siguen en verde sin modificaciones (T4, T9).

## Desvíos respecto del diseño

1. **Prop `onExpenseDeleted` en `ExpenseFormScreen.jsx` (archivo no listado en `design.md`).**
   Al revisar el flujo real de la pestaña Gastos, `ExpenseFormScreen` notifica al padre
   tras crear o editar (`onExpenseSaved`) pero **no** tras eliminar un gasto, por lo que el
   ranking renderizado en la misma pestaña quedaba con datos viejos hasta cambiar de mes,
   incumpliendo R9 («... o elimina un gasto ... reflejar ... sin reiniciar la aplicación»)
   en la UI del navegador (la ruta del controlador `deleteExpense` sí recargaba). Se agregó
   una prop opcional `onExpenseDeleted(itemId)` invocada tras el borrado exitoso y
   `MonthlyOverviewScreen` la conecta a `reloadPeriod(activeYearMonth)`, igual que
   `onExpenseSaved`. Es aditivo, no cambia contratos existentes ni requisitos, y no agrega
   estado. Limitación: el arnés de pruebas usa `renderToStaticMarkup` sin DOM, por lo que
   el click de «Eliminar» no se puede simular; R9 queda cubierto por la prueba de
   integración del controlador y este cableado debe verificarse manualmente en
   `npm run dev` (registrar dos gastos, eliminar uno desde la pestaña Gastos y ver que el
   ranking se actualiza). Se deja a criterio del reviewer.
2. **`CategoryRankingList.buildStyles`:** se expone la fábrica de estilos como propiedad
   estática (mismo patrón que `CategoryDistributionChart.buildStyles` y
   `MonthlyOverviewScreen.buildStyles`) para verificar columnas y `tabular-nums` en `[H8-R12]`.
   No altera la firma pública del componente.
3. **Pruebas de componente sin sintaxis JSX:** `tool/jsx_loader.mjs` no transpila JSX, así
   que `CategoryRankingList.test.jsx` usa `React.createElement`, como el resto del repo.
