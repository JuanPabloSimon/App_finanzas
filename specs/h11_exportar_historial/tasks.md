# Tasks — h11_exportar_historial

> Pasos discretos en orden. El implementer marca `[x]` al completar cada uno.
> Cada tarea indica los requisitos que cubre. Rama: `feature/h11-exportar-historial`.
> Las pruebas usan `node:test`, `node:assert/strict`, `renderToStaticMarkup` y
> `React.createElement` (sin JSX), como el resto de `test/`.

## Dominio

- [x] T1 — Agregar `findAll()` al contrato `src/domain/repositories/expenseRepository.js`
  (mismo patrón que los demás métodos: `throw new Error('Not implemented')`). Cubre: R1.
- [x] T2 — Crear `src/domain/services/csvExporter.js` con `CSV_BOM`, `CSV_SEPARATOR`,
  `CSV_LINE_BREAK`, `CSV_HEADERS`, `CSV_FORMULA_PREFIXES`, `formatCentsForCsv`,
  `neutralizeFormula`, `escapeCsvField`, `buildExportFileName` y `CsvExporter.export` según
  la tabla «Formato del CSV» de `design.md` (BOM, `;`, CRLF también en la última línea,
  orden fecha/id ascendente sin mutar la entrada, neutralización antes del escape, solo
  aritmética entera, `Object.freeze` del resultado). Reutiliza `InvalidAmount` e
  `InvalidExpenseDate`; sin imports de `react`, `react-dom`, `node:sqlite` ni uso de
  `fetch`, `XMLHttpRequest`, `Blob` o `document`. Cubre: R2..R14, R16, R28.
- [x] T3 — Crear el helper de prueba `test/domain/services/csvTestParser.js` (no termina en
  `.test.js`): `parseCsv(text)` que quita el BOM, separa por `;` y CRLF respetando comillas
  RFC 4180 (comillas duplicadas y saltos de línea dentro de campos) y devuelve
  `{ headers, rows }`; y `parseCsvAmountToCents('1234,56')` → `123456` con enteros. Cubre:
  R13, R14.
- [x] T4 — Pruebas en `test/domain/services/csvExporter.test.js`
  (`describe('H11 exportador CSV', ...)`):
  - `[H11-R2]` la primera línea (sin BOM) es `Fecha;Monto (ARS);Categoría;Subcategoría;Nota`.
  - `[H11-R3]` cada línea de un gasto sin caracteres especiales tiene 5 campos separados por
    `;` (4 punto y coma).
  - `[H11-R4]` todas las líneas terminan en `\r\n`, el contenido termina en `\r\n` y no hay
    `\n` sin `\r` previo fuera de campos entre comillas.
  - `[H11-R5]` `content.charCodeAt(0) === 0xFEFF` y `Buffer.from(content, 'utf8')` empieza
    con `EF BB BF`; `export([])` devuelve BOM + encabezado + CRLF con `rowCount` 0 y
    `totalCents` 0.
  - `[H11-R6]` la fecha `2026-03-09` se escribe `2026-03-09`; una fila con fecha inválida
    lanza `InvalidExpenseDate`.
  - `[H11-R7]` `formatCentsForCsv`: `123456` → `1234,56`, `5` → `0,05`, `10` → `0,10`,
    `100` → `1,00`, `123456789` → `1234567,89`; `10.5`, `0`, `-100` y
    `Number.MAX_SAFE_INTEGER + 1` lanzan `InvalidAmount`; el monto nunca contiene `.`.
  - `[H11-R8]` la columna `Categoría` contiene `categoryName` (`Suscripciones`), no el id.
  - `[H11-R9]` con `subcategory` y `note` en `null` la línea es
    `2026-11-03;1500,00;Alimentos;;`.
  - `[H11-R10]` entrada desordenada (`2026-11-05` id 2, `2026-10-01` id 9, `2026-11-05`
    id 1) sale en orden `2026-10-01`/9, `2026-11-05`/1, `2026-11-05`/2; la entrada no se muta.
  - `[H11-R11]` `escapeCsvField`: `a;b` → `"a;b"`, `dijo "hola"` → `"dijo ""hola"""`,
    `línea1\nlínea2` y `x\r\ny` quedan entre comillas; `simple` queda igual.
  - `[H11-R12]` notas/subcategorías/categorías que empiezan con `=`, `+`, `-`, `@` y `\t`
    salen con `'` adelante (`=SUMA(A1)` → `'=SUMA(A1)`); `=a;b` → `"'=a;b"` (prefijo antes
    del escape); un texto con `=` en el medio no cambia; la fecha y el monto nunca llevan `'`.
  - `[H11-R13]` `[H11-R14]` con 6 gastos (notas con `;`, comillas, saltos de línea `\n` y
    `\r\n`, y una que empieza con `=`), `parseCsv` devuelve 6 filas de 5 campos, `rowCount`
    es 6, y la suma de `parseCsvAmountToCents` de la columna 2 es igual a la suma de
    `amountCents` y a `totalCents`.
  - `[H11-R16]` `buildExportFileName('2026-11-15')` → `gestix_gastos_2026-11-15.csv`;
    `'2026-13-01'` lanza `InvalidExpenseDate`.
  - `[H11-R28]` el archivo fuente de `csvExporter.js` no contiene `fetch(`,
    `XMLHttpRequest`, `axios`, `from 'react'`, `react-dom`, `node:sqlite`, `Blob` ni
    `document.`; y `export` funciona con `globalThis.fetch` reemplazado por una función que
    lanza error (se restaura en `finally`).
  Cubre: R2..R14, R16, R28.

## Persistencia (SQLite y navegador)

- [x] T5 — Agregar `findAll()` a `src/data/repositories/sqliteExpenseRepository.js` con la
  consulta de `design.md` (`JOIN categories`, `ORDER BY e.date ASC, e.id ASC`,
  `mapRowToExpense`). Sin migración. Cubre: R1.
- [x] T6 — Crear `src/data/repositories/localStorageExpenseReader.js` con
  `EXPENSES_STORAGE_KEY` y `readStoredExpenses(storage)` (JSON inválido, clave ausente o no
  arreglo → `[]`; mapea a `Expense`; orden fecha/id ascendente). Cubre: R1, R10.
- [x] T7 — Prueba al final de `test/data/sqliteExpenseRepository.test.js`, en un
  `describe('H11 lectura del historial completo', ...)` nuevo con
  `AppDatabase.openInMemory()` (sin modificar los casos existentes):
  - `[H11-R1]` con gastos en `2026-09`, `2026-10` y `2026-11`, `findAll()` devuelve los 3
    con `categoryName`, `subcategory` y `note`, ordenados por fecha ascendente; con la base
    vacía devuelve `[]`.
  Cubre: R1.
- [x] T8 — Pruebas en `test/data/localStorageExpenseReader.test.js` con un `storage` falso
  (`getItem`/`setItem` sobre un `Map`):
  - `[H11-R1]` con 3 gastos serializados de meses distintos en `fp_expenses` devuelve 3
    instancias de `Expense`.
  - `[H11-R10]` las devuelve por fecha y `id` ascendentes.
  - `[H11-R1]` clave ausente, `'{no json'` y `'{}'` devuelven `[]` sin lanzar.
  Cubre: R1, R10.

## Presentación (pestaña «Gastos», Mobile First + Desktop)

- [x] T9 — Crear `src/features/export/exportHistory.js` con `EXPORT_EMPTY_MESSAGE`,
  `EXPORT_ERROR_MESSAGE`, `EXPORT_PRIVACY_NOTICE`, `buildExportSuccessMessage`,
  `buildIdleExportState`, `loadExpensesForExport` y `exportHistory` (estados `done`,
  `empty`, `cancelled`, `error`; nunca lanza; con 0 gastos no llama a `delivery`). Cubre:
  R1, R13, R14, R15, R16, R20, R21, R22.
- [x] T10 — Crear `src/features/export/csvDelivery.js` con `CSV_MIME_TYPE`,
  `OBJECT_URL_REVOKE_DELAY_MS`, `resolveBrowserEnv` y `createBrowserCsvDelivery(env)`
  (`download` con `Blob` + `<a download>` + `click` + `remove` + revocación diferida;
  `canShare` y `share` con Web Share API; `AbortError` → `'cancelled'`; sin `env` →
  `canShare()` `false` y `download` rechaza). Sin `fetch` ni `XMLHttpRequest`. Cubre: R17,
  R18, R19, R20, R28.
- [x] T11 — Crear `src/features/export/ExportHistoryPanel.jsx` (presentacional,
  `React.createElement`, `ExportHistoryPanel.buildStyles`, `data-testid` y estilos de
  `design.md`: advertencia R27, «Descargar CSV» siempre, «Compartir» solo con
  `canShare`, `export-message` y `export-error` con `role="alert"`). Cubre: R15, R18, R19,
  R21, R22, R25, R26, R27.
- [x] T12 — Modificar `src/features/income/MonthlyOverviewScreen.jsx` según `design.md`:
  `findAll()` en `createInMemoryExpenseRepository`; props `csvDelivery` e
  `initialExportState`; `useState` de `exportState` y de `canShare`; handlers de descarga y
  compartir que llaman a `exportHistory`; `ExportHistoryPanel` al final de
  `tab-panel-expenses` (después de `MonthlyComparisonPanel`); en
  `MonthlyOverviewController`: opción `csvDelivery`, `exportState`, método
  `exportHistory(mode = 'download')`, `exportState` en `getState()` y
  `csvDelivery`/`initialExportState` en `renderElement()`. No tocar las pestañas
  `overview`, `income`, `investments` ni `reminders`. Cubre: R1, R15, R23, R24.
- [x] T13 — Agregar `findAll()` al `expenseRepo` de `createBrowserRepositories()` en
  `src/App.jsx`, delegando en `readStoredExpenses(window.localStorage)` (sin
  `window.localStorage` → `[]`). `src/app/AppShell.jsx` no se modifica. Cubre: R1.
- [x] T14 — Pruebas en `test/features/export/exportHistory.test.js` con
  `AppDatabase.openInMemory()`, `SqliteExpenseRepository`, `SqliteCategoryRepository` y una
  entrega falsa que registra las llamadas (`download`, `share`):
  - `[H11-R1]` con gastos en 3 meses distintos, `exportHistory` entrega un CSV con 3 filas
    de datos aunque `today` sea del último mes.
  - `[H11-R13]` `[H11-R14]` (CA2 extremo a extremo) con 8 gastos guardados en SQLite, que
    incluyen notas con `;`, `"`, saltos de línea y prefijos de fórmula, el CSV entregado se
    parsea con `parseCsv`; la cantidad de filas es igual a
    `SELECT COUNT(*) FROM expenses` y la suma de `parseCsvAmountToCents` es igual a
    `SELECT SUM(amount_cents) FROM expenses`; el estado devuelto tiene los mismos
    `rowCount` y `totalCents`.
  - `[H11-R15]` el estado `done` tiene `message` `Se exportaron 8 gastos por un total de
    $ …` (con `formatCentsToArs`) y con un gasto `Se exportó 1 gasto por un total de …`.
  - `[H11-R16]` con `today: () => '2026-11-15'` la entrega recibe
    `fileName: 'gestix_gastos_2026-11-15.csv'`.
  - `[H11-R21]` sin gastos el estado es `empty` con `EXPORT_EMPTY_MESSAGE` y la entrega
    falsa no registra llamadas.
  - `[H11-R22]` si `findAll` rechaza o `download` lanza, el estado es `error` con
    `EXPORT_ERROR_MESSAGE` y `exportHistory` no lanza; los gastos de la base no cambian.
  - `[H11-R20]` si `share` devuelve `'cancelled'`, el estado es `cancelled` con `message`
    `null`.
  Cubre: R1, R13, R14, R15, R16, R20, R21, R22.
- [x] T15 — Pruebas en `test/features/export/csvDelivery.test.js` con un entorno falso
  (`Blob` y `File` que guardan sus partes y opciones, `URL.createObjectURL`/`revokeObjectURL`
  espiados, `document.createElement('a')` falso con `click` y `remove` espiados,
  `document.body.appendChild`, `setTimeout` que guarda la función y el retardo, y
  `navigator` configurable):
  - `[H11-R17]` `download` crea un `Blob` de tipo `text/csv;charset=utf-8` con el contenido,
    un enlace con `href` del object URL, `download` igual al nombre de archivo, lo agrega,
    hace `click` una vez, lo quita y programa `revokeObjectURL` con
    `OBJECT_URL_REVOKE_DELAY_MS`.
  - `[H11-R5]` la primera parte del `Blob` empieza con `﻿`.
  - `[H11-R18]` con `navigator.canShare` que devuelve `true`, `canShare()` es `true` y
    `share` llama a `navigator.share` con `files` de un `File` llamado como el archivo y
    tipo `text/csv;charset=utf-8`; devuelve `'shared'`.
  - `[H11-R19]` sin `navigator.canShare`, con `canShare` que devuelve `false` o que lanza,
    y con `env` `null`, `canShare()` es `false`.
  - `[H11-R20]` si `navigator.share` rechaza con un error de `name` `AbortError`, `share`
    devuelve `'cancelled'`; con otro error, rechaza.
  - `[H11-R28]` el archivo fuente de `csvDelivery.js` y de `exportHistory.js` no contiene
    `fetch(`, `XMLHttpRequest` ni `axios`.
  Cubre: R5, R17, R18, R19, R20, R28.
- [x] T16 — Pruebas en `test/features/export/ExportHistoryPanel.test.jsx`
  (`renderToStaticMarkup`, como `RecurrencesPanel.test.jsx`):
  - `[H11-R27]` muestra `export-privacy-notice` con `EXPORT_PRIVACY_NOTICE`.
  - `[H11-R18]` con `canShare: true` renderiza `export-share-button` con «Compartir» y
    `export-download-button` con «Descargar CSV».
  - `[H11-R19]` con `canShare: false` no renderiza `export-share-button`.
  - `[H11-R15]` con un estado `done` muestra `export-message` con el mensaje de éxito.
  - `[H11-R21]` con un estado `empty` muestra `export-message` con
    `EXPORT_EMPTY_MESSAGE`.
  - `[H11-R22]` con un estado `error` muestra `export-error` con `role="alert"` y
    `EXPORT_ERROR_MESSAGE`; con un estado `cancelled` no muestra `export-error`.
  - `[H11-R25]` en 390 px `data-layout="mobile"` y `buildStyles(390)` da a los botones
    `width: '100%'` y `minHeight: 44`.
  - `[H11-R26]` en 1280 px `data-layout="desktop"`, `buildStyles(1280)` da a la tarjeta
    `maxWidth` igual a `getViewportLayout(1280).containerMaxWidth`, a los botones
    `width: 'auto'` y al contenedor de botones `flexDirection: 'row'`.
  Cubre: R15, R18, R19, R21, R22, R25, R26, R27.
- [x] T17 — Casos nuevos al final de `test/features/income/MonthlyOverviewScreen.test.jsx`
  en `describe('H11 exportación del historial en la pestaña Gastos', ...)`, usando
  `MonthlyOverviewScreen.createController` con repositorios SQLite en memoria, una entrega
  falsa y `today: () => '2026-11-15'` (sin modificar los casos existentes):
  - `[H11-R23]` con `setActiveTab('expenses')` el HTML contiene `export-history-panel`
    dentro de `tab-panel-expenses` y después de la comparación mensual, y
    `export-download-button`.
  - `[H11-R24]` en la pestaña `overview` el HTML no contiene `export-history-panel` ni
    `export-download-button`; con `AppShell.createController` (consentimiento aceptado y
    cuenta registrada, como `[H13-R5]`) el contenido de `app-header` no contiene
    `export-` ni «Exportar».
  - `[H11-R1]` con gastos en octubre y noviembre y el período activo en noviembre,
    `controller.exportHistory('download')` entrega un CSV con las filas de ambos meses y
    `getState().exportState.status` es `done`; al renderizar la pestaña `expenses` se ve
    `export-message`.
  - `[H11-R15]` el `export-message` renderizado contiene la cantidad y el total en pesos.
  Cubre: R1, R15, R23, R24.

## Documentación

- [x] T18 — `docs/architecture.md`: agregar la decisión **D8** (CSV con BOM UTF-8, `;`,
  CRLF, coma decimal, fecha ISO, neutralización OWASP; entrega con `Blob` + `download` y Web
  Share API opcional en `src/features/export/csvDelivery.js`; alternativa descartada
  `papaparse` y separador `,`). `docs/privacy.md`: ampliar la fila «Pérdida del
  dispositivo» (contenido del CSV, sin red, advertencia del panel). `docs/data_model.md`:
  nota de `findAll()` sin migración. Cubre: R27, R28.

## Cierre

- [x] T19 — Verificar que las pruebas existentes de H1, H5, H7, H8, H9, H10, H12 y H13
  siguen en verde sin cambios.
- [x] T20 — Documentar la trazabilidad R1..R28 → pruebas en
  `progress/impl_h11_exportar_historial.md` y en `progress/traceability.md`.
- [x] T21 — Ejecutar `./init.sh` (o `powershell -ExecutionPolicy Bypass -File ./init.ps1`)
  y verificar que todo está en verde (harness, ESLint y pruebas).
