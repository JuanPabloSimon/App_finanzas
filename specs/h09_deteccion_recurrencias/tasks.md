# Tasks — h09_deteccion_recurrencias

> Pasos discretos en orden. El implementer marca `[x]` al completar cada uno.
> Cada tarea indica los requisitos que cubre. Rama: `feature/h09-deteccion-recurrencias`.

## Conjunto etiquetado (primero, antes del detector)

- [x] T1 — Crear `test/fixtures/recurrencias_etiquetadas.json` con el formato y el
  contenido mínimo de `design.md` (≥ 20 recurrencias reales, ≥ 15 señuelos, `expected`
  disjuntos y dentro de la ventana, `reference_date` `2026-10-31`). Importes en centavos
  enteros. Cubre: R4, R5.

## Dominio

- [x] T2 — Agregar `InvalidRecurrence` a `src/core/errors.js` (patrón de
  `InvalidReminder`). Cubre: R6.
- [x] T3 — Crear `src/domain/models/recurrence.js` con `buildRecurrenceKey`,
  `parseRecurrenceKey` y la clase `Recurrence` (validaciones, `Object.freeze`, `key`,
  `isEqual`). Cubre: R6, R7.
- [x] T4 — Crear `src/domain/services/recurrenceDetector.js` con las constantes,
  `RecurrenceDetector.detect` según el algoritmo de `design.md` (ventana, barrido sobre
  montos ordenados validando contra la mediana, orden) y `filterDismissedRecurrences`. Solo aritmética entera; sin
  imports de `react`, `react-dom`, `node:sqlite`, `axios` ni uso de `fetch`. Cubre: R1, R2,
  R3, R7, R10, R11.
- [x] T5 — Crear el contrato `src/domain/repositories/recurrenceRepository.js`
  (`dismissedKeys`, `dismiss`; patrón de `consentRepository.js`). Cubre: R6, R7.
- [x] T6 — Pruebas en `test/domain/models/recurrence.test.js`
  (`describe('H9 modelo de recurrencia', ...)`):
  - `[H9-R6]` `key` es `<categoryId>|<typicalAmountCents>`; `parseRecurrenceKey` devuelve
    `null` para `''`, `'a|b'`, `'1|0'`, `'1|10.5'`; el modelo rechaza montos no enteros y
    `occurrences` distinto de `expenseIds.length` con `InvalidRecurrence`; es inmutable.
  Cubre: R6.
- [x] T7 — Pruebas en `test/domain/services/recurrenceDetector.test.js`
  (`describe('H9 detección de recurrencias', ...)`):
  - `[H9-R1]` 3 gastos de la misma categoría con montos `540000`, `600000`, `660000`
    (borde exacto de ±10 % respecto de la mediana `600000`) → una recurrencia con
    `occurrences` 3 y `typicalAmountCents` 600000; 4 gastos parecidos → `occurrences` 4 y
    mediana par redondeada al centavo; dos categorías con recurrencia → ordenadas por
    `typicalAmountCents × occurrences` descendente.
  - `[H9-R2]` 2 gastos parecidos → `[]`; 3 gastos parecidos repartidos en dos categorías
    → `[]`.
  - `[H9-R3]` 3 gastos parecidos + uno de la misma categoría a más de 10 % (por debajo y
    por encima) → la recurrencia no incluye su `id` y conserva las 3 ocurrencias; un
    atípico bajo (`450000`) no impide detectar `540000`/`600000`/`660000`; todo
    `expenseId` emitido cumple `|monto − típico| × 10 <= típico`.
  - `[H9-R11]` con `referenceDate` `2026-10-31`: un gasto del `2026-09-01` (día 61) y uno
    del `2026-11-01` (futuro) no cuentan; los del `2026-09-02` y `2026-10-31` sí.
  - `[H9-R7]` `filterDismissedRecurrences` oculta la recurrencia con clave idéntica, la
    oculta si el típico se movió dentro de ±10 % del descartado, la muestra si es de otra
    categoría o si se movió más de 10 %, e ignora claves inválidas.
  - `[H9-R10]` el archivo fuente de `recurrenceDetector.js` y de `recurrence.js` no contiene
    `fetch(`, `XMLHttpRequest`, `axios`, `from 'react'`, `react-dom` ni `node:sqlite`; y
    `detect` funciona con `globalThis.fetch` reemplazado por una función que lanza error
    (se restaura en `finally`).
  Cubre: R1, R2, R3, R7, R10, R11.
- [x] T8 — Pruebas `[H9-R4]` y `[H9-R5]` en
  `test/domain/services/recurrenceDetectorMetrics.test.js`: leer el fixture con
  `fs.readFileSync` + `JSON.parse`, mapear a objetos `{ id, amountCents, date, categoryId }`,
  ejecutar `detect` y calcular exhaustividad y precisión con el criterio de coincidencia de
  `design.md`; aserción `>= 0.85` con los valores en el mensaje. Cubre: R4, R5.

## Persistencia (SQLite y navegador)

- [x] T9 — En `src/data/db/appDatabase.js`, agregar `MIGRATION_V3_SQL`
  (`dismissed_recurrences`) y el bloque `if (currentVersion < 3)` con
  `PRAGMA user_version = 3;`. No modificar `MIGRATION_V1_SQL` ni `MIGRATION_V2_SQL`.
  Cubre: R6.
- [x] T10 — Actualizar `docs/data_model.md`: en `dismissed_recurrences`, formato de
  `recurrence_key` `<categoryId>|<typicalAmountCents>` y nota de `localStorage`
  (`fp_dismissed_recurrences`). Cubre: R6.
- [x] T11 — Crear `src/data/repositories/sqliteRecurrenceRepository.js`
  (`SqliteRecurrenceRepository extends RecurrenceRepository`, `INSERT OR IGNORE`,
  `dismissedKeys` devuelve `Set`). Cubre: R6, R7.
- [x] T12 — Crear `src/data/repositories/localStorageRecurrenceRepository.js`
  (`LocalStorageRecurrenceRepository`, clave `fp_dismissed_recurrences`, `storage`
  inyectado, sin duplicados, tolerante a JSON inválido). Cubre: R6, R7.
- [x] T13 — Pruebas en `test/data/sqliteRecurrenceRepository.test.js` con
  `AppDatabase.openInMemory()`:
  - `[H9-R6]` `dismiss('1|650000')` guarda una fila en `dismissed_recurrences` (verificado
    con `db.get`) con `dismissed_at` ISO 8601; `dismissedKeys()` la contiene; doble
    `dismiss` no duplica ni falla; clave inválida → `InvalidRecurrence`.
  - `[H9-R6]` migración: `PRAGMA user_version` es 3; una base llevada a versión 2
    (`DROP TABLE dismissed_recurrences` + `PRAGMA user_version = 2`) con un gasto guardado
    vuelve a 3 con `migrate()`, recrea la tabla y conserva el gasto.
  Cubre: R6.
- [x] T14 — Pruebas en `test/data/localStorageRecurrenceRepository.test.js` con un
  `storage` falso (objeto con `getItem`/`setItem` sobre un `Map`):
  - `[H9-R6]` `dismiss` escribe `fp_dismissed_recurrences` y no duplica.
  - `[H9-R7]` una instancia nueva sobre el mismo `storage` devuelve la clave (persiste
    entre sesiones); JSON inválido → `Set` vacío sin lanzar.
  Cubre: R6, R7.

## Presentación (pestaña «Alertas», Mobile First + Desktop)

- [x] T15 — Crear `src/features/recurrences/recurrencesLoader.js` con
  `loadVisibleRecurrences` (tres `findByYearMonth` vía `shiftYearMonth`, detector,
  `dismissedKeys`, `filterDismissedRecurrences`). Cubre: R7, R8, R11.
- [x] T16 — Crear `src/features/recurrences/RecurrencesPanel.jsx` (presentacional,
  `React.createElement`, `RecurrencesPanel.buildStyles`, `RECURRENCES_EMPTY_MESSAGE`,
  `data-testid` y estilos responsivos de `design.md`, botón `minHeight: 44`). Cubre: R8, R9.
- [x] T17 — Modificar `src/features/income/MonthlyOverviewScreen.jsx` según `design.md`:
  props `recurrenceRepository` e `initialRecurrences`, `createInMemoryRecurrenceRepository`,
  `useEffect` propio de carga, recarga en `reloadPeriod`, `handleDismissRecurrence` con
  manejo de error, `RecurrencesPanel` al final de `tab-panel-reminders`, y en
  `MonthlyOverviewController`: opción `recurrenceRepository`, `recurrences` en
  `reloadMonthData`/`getState`, `dismissRecurrence(recurrenceKey)` y
  `initialRecurrences`/`recurrenceRepository` en `renderElement`. No tocar la pestaña
  `overview`. Cubre: R6, R7, R8, R9.
- [x] T18 — Modificar `src/app/AppShell.jsx` (prop y opción de controlador
  `recurrenceRepository`, reenviada a `MonthlyOverviewScreen`) y `src/App.jsx`
  (`recurrenceRepo` con `LocalStorageRecurrenceRepository(window.localStorage)` en
  `createBrowserRepositories` y pasado a `AppShell`). Cubre: R6, R7.
- [x] T19 — Pruebas en `test/features/recurrences/recurrencesLoader.test.js` con
  `AppDatabase.openInMemory()`, `SqliteExpenseRepository`, `SqliteCategoryRepository` y
  `SqliteRecurrenceRepository`:
  - `[H9-R8]` con 3 gastos de «Suscripciones» en septiembre y octubre de 2026 y
    `referenceDate` `2026-10-31`, devuelve la recurrencia con `categoryName`
    «Suscripciones» (lee los tres meses).
  - `[H9-R11]` un gasto de agosto que completaría la tercera ocurrencia no se cuenta.
  - `[H9-R7]` tras `dismiss(recurrence.key)` y un cuarto gasto que mueve la mediana dentro
    del 10 %, la recurrencia ya no se devuelve.
  Cubre: R7, R8, R11.
- [x] T20 — Pruebas en `test/features/recurrences/RecurrencesPanel.test.jsx`
  (`renderToStaticMarkup`, como `CategoryRankingList.test.jsx`):
  - `[H9-R8]` con dos recurrencias muestra categoría, monto con `formatCentsToArs`
    (`$ 6.500`), «3 veces en 60 días» y un botón «Descartar» por elemento; en 390 px
    `data-layout="mobile"` y `data-columns="1"`, en 1280 px `data-layout="desktop"` y
    `data-columns="2"`; `buildStyles(390)` da `minHeight: 44` al botón; con
    `errorMessage` muestra `recurrences-error` y mantiene la lista.
  - `[H9-R9]` con `[]` muestra `recurrences-empty` con `RECURRENCES_EMPTY_MESSAGE` y no
    renderiza `recurrences-list`.
  Cubre: R8, R9.
- [x] T21 — Casos nuevos al final de `test/features/income/MonthlyOverviewScreen.test.jsx`
  usando `MonthlyOverviewScreen.createController` con repositorios en memoria y
  `today: () => '2026-10-31'` (sin modificar los casos existentes):
  - `[H9-R8]` con 3 gastos recurrentes, la pestaña `reminders` renderiza
    `recurrences-panel` con el elemento, y la pestaña `overview` no contiene
    `recurrences-panel` (H13 intacto).
  - `[H9-R7]` `controller.dismissRecurrence(key)` guarda la clave en el repositorio
    inyectado y, tras recargar, `getState().recurrences` queda vacío y la pestaña
    `reminders` no muestra el elemento.
  - `[H9-R9]` sin gastos, la pestaña `reminders` muestra `recurrences-empty`.
  Cubre: R7, R8, R9.

## Cierre

- [x] T22 — Verificar que las pruebas existentes de H5, H7, H8, H12 y H13 siguen en verde
  sin cambios.
- [x] T23 — Documentar la trazabilidad R1..R11 → pruebas en
  `progress/impl_h09_deteccion_recurrencias.md` y en `progress/traceability.md`, con los
  valores obtenidos de exhaustividad y precisión (K4).
- [x] T24 — Ejecutar `./init.sh` (o `powershell -ExecutionPolicy Bypass -File ./init.ps1`)
  y verificar que todo está en verde (harness, ESLint y pruebas).
