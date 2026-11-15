# Review — H9 h09_deteccion_recurrencias

**Veredicto:** APPROVED

- **Rama:** `feature/h09-deteccion-recurrencias` (cambios sin commitear + archivos nuevos).
- **Fecha:** 2026-11-15. **Rol:** reviewer (claude-code).
- **`./init.sh`:** exit 0. Harness: `H9: spec completo (11 requisitos)` y `H9: todos los requisitos tienen prueba etiquetada`; ESLint sin problemas; `# tests 156 / pass 156 / fail 0`.

## Trazabilidad requisitos ↔ pruebas

- R1: [x] `test/domain/services/recurrenceDetector.test.js` `[H9-R1] informa 3 gastos ... borde exacto de ±10 %` (540000/600000/660000 → típico 600000, 3 ocurrencias, ids [1,2,3]); `[H9-R1] con 4 gastos parecidos ...` (mediana par redondeada, entera); `[H9-R1] ordena ...` (score típico × ocurrencias); `[H9-R1] usa los parámetros de CA1` (60/3/10).
- R2: [x] `recurrenceDetector.test.js` `[H9-R2] no informa conjuntos de menos de 3 gastos` (2 gastos → `[]`; 3 repartidos en 2 categorías → `[]`; lista vacía congelada).
- R3: [x] `recurrenceDetector.test.js` `[H9-R3] excluye ... por debajo o por encima` (500000 y 700000 quedan fuera, ids [1,2,3]) y `[H9-R3] un atípico bajo no impide detectar ...` (450000 excluido; verifica `|monto − típico| × 10 <= típico` para cada id emitido).
- R4: [x] `test/domain/services/recurrenceDetectorMetrics.test.js` `[H9-R4] alcanza una exhaustividad de al menos 0,85` con el criterio de coincidencia ≥ 80 % del `design.md`. Valor obtenido 1,00 (22/22).
- R5: [x] `recurrenceDetectorMetrics.test.js` `[H9-R5] alcanza una precisión de al menos 0,85`. Valor 1,00 (22/22). Además `[H9-R4][H9-R5] el conjunto etiquetado cumple el contenido mínimo` (≥ 20 esperadas, disjuntas, dentro de la ventana, centavos enteros, ≥ 15 no esperados).
- R6: [x] `test/data/sqliteRecurrenceRepository.test.js` `[H9-R6] guarda la clave descartada en dismissed_recurrences con fecha ISO 8601` (verifica la fila con `db.get` sobre `AppDatabase.openInMemory()`), idempotencia y `InvalidRecurrence`, y migración v2 → v3 conservando gastos; `test/data/localStorageRecurrenceRepository.test.js` `[H9-R6] dismiss escribe fp_dismissed_recurrences sin duplicar`; `test/domain/models/recurrence.test.js` (formato de clave, parseo, validaciones, inmutabilidad).
- R7: [x] `recurrenceDetector.test.js` `[H9-R7] filterDismissedRecurrences ...` (clave idéntica, borde exacto 715000 oculto vs 715001 visible, otra categoría visible, claves inválidas ignoradas); `test/features/recurrences/recurrencesLoader.test.js` `[H9-R7] ... aunque un gasto nuevo mueva la mediana dentro del 10 %` (SQLite en memoria, CA3 de punta a punta); `test/features/income/MonthlyOverviewScreen.test.jsx` `[H9-R7] al descartar guarda la clave ...` y `[H9-R7] si falla el descarte ...`; `localStorageRecurrenceRepository.test.js` persistencia entre instancias.
- R8: [x] `test/features/recurrences/RecurrencesPanel.test.jsx` (categoría, `$ 6.500`, `$ 12.000,50`, «3 veces en 60 días», botón por ítem, `onDismiss`); `MonthlyOverviewScreen.test.jsx` `[H9-R8] la pestaña Alertas muestra la recurrencia y la pestaña Resumen no renderiza el panel`; `recurrencesLoader.test.js` `[H9-R8]` (nombre de categoría desde SQLite).
- R9: [x] `RecurrencesPanel.test.jsx` `[H9-R9] sin recurrencias muestra el estado vacío` (mensaje exacto, sin `recurrences-list`); `MonthlyOverviewScreen.test.jsx` `[H9-R9] sin gastos la pestaña Alertas muestra el estado vacío`.
- R10: [x] `recurrenceDetector.test.js` `[H9-R10]`: inspección de fuente de los 3 archivos de dominio (sin `fetch(`, `XMLHttpRequest`, `axios`, `react`, `react-dom`, `node:sqlite`) y ejecución con `globalThis.fetch` saboteado y restaurado en `finally`.
- R11: [x] `recurrenceDetector.test.js` `[H9-R11]` (09-01 y 11-01 excluidos; 09-02 y 10-31 incluidos; ventana que cruza el cambio de año); `recurrencesLoader.test.js` `[H9-R11] no cuenta un gasto de agosto`.

## Tareas

- T1..T24: [x] todas marcadas en `specs/h09_deteccion_recurrencias/tasks.md` y verificadas contra el código:
  - T1: fixture con 106 gastos, 22 esperadas; validé por script independiente que las 22 cumplen CA1 (misma categoría, ≥ 3, ±10 % de la mediana, dentro de `2026-09-02..2026-10-31`), 0 importes no enteros y 4 gastos fuera de ventana como señuelos R11.
  - T9: `src/data/db/appDatabase.js:82-87` `MIGRATION_V3_SQL` y `:126-129` bloque `if (currentVersion < 3)`; v1/v2 sin cambios en el diff.
  - T10: `docs/data_model.md:49-57` formato de `recurrence_key` y `fp_dismissed_recurrences`.
  - T17: `src/features/income/MonthlyOverviewScreen.jsx:2343-2348` `RecurrencesPanel` al final de `tab-panel-reminders`; la pestaña `overview` no se modificó.
  - T18: `src/app/AppShell.jsx` (opción/prop reenviada) y `src/App.jsx:344-347` (`LocalStorageRecurrenceRepository(window.localStorage)`).
  - T21/T22: `test/features/income/MonthlyOverviewScreen.test.jsx` solo agrega un import y un `describe` al final (0 líneas borradas); casos de H5/H7/H8/H13 en verde.

## Arquitectura, Mobile First + Desktop y privacidad

- [x] `src/domain/` (`models/recurrence.js`, `services/recurrenceDetector.js`, `repositories/recurrenceRepository.js`) es JS puro: solo importa `src/core/`. `grep` de `fetch(|axios|XMLHttpRequest` en `src/` fuera de `src/assistant/`: sin resultados.
- [x] Centavos enteros: `isEligibleExpense` exige `Number.isSafeInteger(amountCents)`; tolerancia con aritmética entera (`recurrenceDetector.js` `isWithinTolerance` y filtro `× 10 <=`); mediana par con `Math.round`; `Recurrence` rechaza montos no enteros.
- [x] Migración versionada v3 en `src/data/db/` y documentada en `docs/data_model.md`.
- [x] Persistencia probada con `AppDatabase.openInMemory()` (SQL real), no mocks.
- [x] UI Mobile First + Desktop: `RecurrencesPanel.buildStyles` usa `getViewportLayout`; 1 columna y botón 100 % en 390 px, 2 columnas y `maxWidth` 960 en 1280 px, `minHeight: 44` en ambos; probado en `RecurrencesPanel.test.jsx`.
- [x] H13 intacto: el panel no aparece en `overview` (prueba `[H9-R8]` de `MonthlyOverviewScreen.test.jsx`), y la prueba existente `overviewViewportBox.overflowY === 'hidden'` sigue en verde.
- [x] Privacidad: la feature no toca la IA ni la red; la clave persistida solo contiene `categoryId|typicalAmountCents` (sin notas, fechas ni identificadores). Sin dependencias nuevas en `package.json`.
- [x] Convenciones: identificadores en inglés, textos de UI en español; sin `console.log`, TODO/FIXME ni código comentado (el único comentario, `localStorageRecurrenceRepository.js` en el `catch` de `setItem`, es explicativo).

## Checkpoints

- C1: [x] archivos del arnés presentes; `./init.sh` exit 0.
- C2: [x] una sola feature `in_progress` (H9); `progress/current.md` describe la sesión, herramienta `claude-code`, aprobación del spec por Francisco el 2026-11-15.
- C3: [x] dominio puro, red solo en `src/assistant/`, centavos enteros, migración v3 documentada, UI Mobile First + Desktop, sin `console.log`/TODO.
- C4: [x] ESLint limpio; 156/156 pruebas; SQLite en memoria real; sin uso del cliente LLM en H9 (no aplica `FakeLlmClient`).
- C5: [x] sin archivos temporales ni secretos en el diff. La entrada en `progress/history.md` y las horas en `progress/horas.csv` corresponden al cierre de sesión del leader.
- C6: [x] los tres archivos del spec existen; EARS cubre CA1..CA3; tareas en `[x]`; R1..R11 con etiqueta; `progress/traceability.md:35-38` actualizado con K4.
- C7: [x] no aplica a H9 (sin envío al modelo); no se alteró nada de consentimiento ni advertencia orientativa.

## Observaciones no bloqueantes

1. `test/features/recurrences/recurrencesLoader.test.js` `[H9-R8] lee los tres meses ...` solo usa gastos de septiembre y octubre; no ejercita el tercer mes (`referenceDate − 2 meses`). La ventana exacta está cubierta por `[H9-R11]` del detector y el loader pide tres meses (`recurrencesLoader.js` `MONTHS_COVERING_WINDOW = 3`), así que no compromete R8; podría reforzarse con una fecha de referencia a principio de mes (p. ej. `2026-10-05` con un gasto de agosto dentro de la ventana).
2. `MonthlyOverviewScreen.jsx:981` el `useEffect` de recurrencias depende de `categories`, por lo que recalcula al llegar las categorías tras el montaje (una carga extra, inocua).
3. Los desvíos menores documentados en `progress/impl_h09_deteccion_recurrencias.md` (nombre de reserva, `InvalidRecurrence` con fecha inválida, validación en el repositorio `localStorage`, `recurrenceError`/`initialRecurrenceError` en el controlador) no agregan requisitos ni rompen contratos: las props nuevas son opcionales.

## Cambios requeridos

Ninguno.
