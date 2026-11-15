# Review — H7 h07_comparacion_mensual

**Veredicto:** APPROVED

- **Revisor:** `reviewer` (Claude Code), 2026-11-14.
- **Rama:** `feature/h07-comparacion-mensual` (cambios sin commitear en el working tree).
- **Spec:** `specs/h07_comparacion_mensual/` (aprobado por Francisco el 2026-11-14, registrado en `progress/current.md:23`).

## Trazabilidad requisitos ↔ pruebas

- R1: [x] `test/domain/services/monthlyComparison.test.js` `[H7-R1] toma como mes actual el mes seleccionado...` (usa `2026-08`, verifica `activeYearMonth`, `currentTotalCents` entero y resultado congelado) + `test/features/income/MonthlyOverviewScreen.test.jsx` `[H7-R1] usa el mes seleccionado...` (tras `goToPreviousMonth` a `2026-10`: `currentTotalCents === totalExpensesCents === 250000`, variación `-375`).
- R2: [x] `monthlyComparison.test.js` `[H7-R2]` (entrada desordenada, mes `-6` = `2025-08` y mes posterior `2026-03` excluidos, cruce de año `2026-02 → 2026-01..2025-09`, orden descendente) + `test/features/dashboard/monthlyTotalsLoader.test.js` `[H7-R2]` (SQLite en memoria, suma entera por mes, `2025-08` y `2026-02` excluidos).
- R3: [x] `monthlyComparison.test.js` `[H7-R3]` (`2026-09` y `2026-08` con `0` entre `2026-10` y `2026-07`).
- R4: [x] `monthlyComparison.test.js` `[H7-R4]` (inicio de serie en `-3`; `2026-07` y `2026-06` ausentes aunque vengan en la entrada con `0`).
- R5: [x] `monthlyComparison.test.js` `[H7-R5]` (tabla con `2001/2000 → 1`, `1999/2000 → -1`, `1/3 → -667`, `0/5000 → -1000`, `MAX_SAFE_INTEGER`; implementación en `src/domain/services/monthlyComparison.js:19-24` con `BigInt` y redondeo `(2|n| + d) / 2d`, sin coma flotante).
- R6: [x] `monthlyComparison.test.js` `[H7-R6]` (`calculateVariationTenths(5000, 0)` y `(0, 0)` → `null`; mes `-1` en `0` con `-2` con datos → `variationTenths: null`, `assertNoNonFiniteValues`).
- R7: [x] `monthlyComparison.test.js` `[H7-R7]` (sin entrada y con dato solo fuera de la ventana `2026-05` → `hasPreviousData:false`, `[]`, `null`, `null`).
- R8: [x] `test/features/dashboard/MonthlyComparisonPanel.test.jsx` `[H7-R8]` (total actual, 3 filas con etiqueta `formatYearMonthLabel` y monto `formatCentsToArs`, variación `+6,0 %`) + `MonthlyOverviewScreen.test.jsx` `[H7-R8]` (pestaña `expenses`, panel debajo de `category-ranking`).
- R9: [x] `test/core/formatters.test.js` `[H7-R9]` x2 (`125`, `-60`, `0`, `5`, `-5`, `-1000`; no enteros → `InvalidAmount`) + `MonthlyComparisonPanel.test.jsx` `[H7-R9]` (`data-variation-trend` `up`/`down`/`flat`).
- R10: [x] `MonthlyComparisonPanel.test.jsx` `[H7-R10]` (texto exacto en `monthly-comparison-no-base`, sin `monthly-comparison-variation`, fila `2026-10` en `$ 0`).
- R11: [x] `MonthlyComparisonPanel.test.jsx` `[H7-R11]` (total actual, `monthly-comparison-empty` con texto exacto, sin filas, sin lista, sin variación, sin `NaN`/`Infinity`).
- R12: [x] `MonthlyOverviewScreen.test.jsx` `[H7-R12]` (registro → `+50,0 %`; edición moviendo el gasto a octubre → `-100,0 %`; baja → octubre `$ 1.000`; `goToPreviousMonth` → estado vacío; todo verificado en estado y HTML) + `monthlyTotalsLoader.test.js` `[H7-R12]`. En el componente del navegador, `onExpenseSaved`/`onExpenseDeleted` y la navegación de período llaman `reloadPeriod`, que ahora carga `loadPreviousMonthlyTotals` (`MonthlyOverviewScreen.jsx:1006`, `:1014`, `:1468-1469`).
- R13: [x] `MonthlyOverviewScreen.test.jsx` `[H7-R13]` (pestaña `overview`: aparece `overview-viewport-box`, no aparece `monthly-comparison`, `overflowY: 'hidden'`). El panel solo se agrega en la rama `expenses` (`MonthlyOverviewScreen.jsx:1476-1479`).
- R14: [x] `MonthlyComparisonPanel.test.jsx` `[H7-R14]` (390 → `mobile` / `1fr`; 800 → `tablet` y 1280 → `desktop` en dos columnas; `tabular-nums` en monto actual, filas y variación; `maxWidth` 100 % / 720 / 960).
- R15: [x] `monthlyComparison.test.js` `[H7-R15]` (importa `calculateVariationTenths` y compara con `buildMonthlyComparison(...).variationTenths` en 4 pares).
- R16: [x] `monthlyComparison.test.js` `[H7-R16]` (`1.5`, `-1`, `'100'`, `NaN`, `2 ** 53` en ambos argumentos de `calculateVariationTenths`, en `currentTotalCents` y en `previousMonthlyTotals[].totalCents`).
- R17: [x] `monthlyComparison.test.js` `[H7-R17]` (lee el fuente y descarta `react`, `react-dom`, `node:sqlite`, `axios`, `fetch(`). El módulo solo importa `core/dates.js` y `core/errors.js`.

`progress/traceability.md`: [x] filas H7 CA1 (R1..R6, R8..R10, R12..R17) y CA2 (R7, R11) agregadas con archivos de prueba. `tool/harness_check.mjs`: «H7: todos los requisitos tienen prueba etiquetada», 94/94 requisitos con prueba.

## Tareas

- T1..T13: [x] todas marcadas en `specs/h07_comparacion_mensual/tasks.md`.
- Desvíos documentados en `progress/impl_h07_comparacion_mensual.md` (prop `initialPreviousMonthlyTotals`, prueba extra del loader, `previousMonthlyTotals` en `getState()`): justificados, no cambian requisitos ni alcance.

## Arquitectura, Mobile First + Desktop y privacidad

- [x] `src/domain/services/monthlyComparison.js` es JS puro (sin `react`, `react-dom`, `node:sqlite`, `fetch`, `axios`).
- [x] Sin red fuera de `src/assistant/` (grep de `fetch(`/`axios` en `src/` sin coincidencias fuera de esa carpeta).
- [x] Centavos enteros: validación `Number.isSafeInteger` y `>= 0` en dominio; loader suma `amountCents` enteros; `formatVariationTenths` (`src/core/formatters.js:72-87`) usa aritmética entera. Variación sin `NaN`/`Infinity`: `null` cuando el mes anterior es `0`.
- [x] Sin dependencias nuevas (`package.json`/`package-lock.json` sin cambios; `BigInt` nativo).
- [x] Sin migraciones: `src/data/` y `docs/data_model.md` sin cambios (el spec declara que no hay cambio de esquema).
- [x] UI Mobile First (`< 768px` una columna, ancho completo) y responsiva en tablet/desktop (dos columnas, `maxWidth` del contenedor).
- [x] Privacidad: H7 no envía nada al modelo (fuera de alcance, lo hace H10); no aplica prueba de resumen.
- [x] Sin `console.log`, TODO ni FIXME en los archivos nuevos o modificados.
- [x] Persistencia probada con `AppDatabase.openInMemory()` (`monthlyTotalsLoader.test.js`, `MonthlyOverviewScreen.test.jsx`).

## Regresiones H6, H8, H13

- [x] El diff de `test/features/income/MonthlyOverviewScreen.test.jsx` solo agrega el `describe` de H7 al final; pruebas `[H5-*]`, `[H6-*]`, `[H8-*]`, `[H13-*]` sin modificar y en verde.
- [x] La rama `overview` no se tocó; el Resumen sigue sin scroll (`overview-viewport-box`, `overflowY: 'hidden'`, verificado también en `[H7-R13]`).

## Checkpoints

- C1: [x] archivos del arnés presentes; `./init.sh` código de salida 0 (ESLint OK, 118/118 pruebas, arnés 0 advertencias).
- C2: [x] una sola feature `in_progress` (H7); `progress/current.md` describe la sesión activa con la aprobación del spec.
- C3: [x] arquitectura, centavos, sin migraciones, Mobile First + Desktop, sin `console.log`/TODO.
- C4: [x] lint sin problemas; 118 pruebas en verde; SQLite en memoria; no hay cliente LLM involucrado.
- C5: [x] sin temporales ni secretos en el diff. Entrada de `history.md` y horas: corresponden al cierre de sesión del leader.
- C6: [x] tres archivos de spec; EARS cubre CA1 y CA2; tareas en `[x]`; cada R con `[H7-R<n>]`; trazabilidad actualizada.
- C7: [x] no aplica a H7 (no toca la IA); las pruebas existentes de privacidad siguen en verde.

## Observaciones no bloqueantes

1. `progress/traceability.md`: las filas H8 siguen como «En revisión (`in_progress`)» aunque H8 está `done`; corregir al cerrar H7 (tarea del leader).
2. Al pasar H7 a `done`, actualizar el estado de sus filas en `progress/traceability.md`.
