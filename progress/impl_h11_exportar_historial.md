# Implementación — H11 `h11_exportar_historial`

- **Estado:** implementado, pendiente de `reviewer` (no se marcó `done`).
- **Herramienta / rol:** `claude-code` / `implementer`.
- **Rama:** `feature/h11-exportar-historial` (sin commit ni push).
- **Spec:** `specs/h11_exportar_historial/` (aprobado por Francisco el 2026-11-15).
- **Fecha:** 2026-11-15.

## Tareas

T1..T21 ejecutadas en orden y marcadas `[x]` en `specs/h11_exportar_historial/tasks.md`.

| Tarea | Resultado |
|---|---|
| T1 | `findAll()` en el contrato `ExpenseRepository` (`throw new Error('Not implemented')`) |
| T2 | `CsvExporter` puro: `CSV_BOM`, `CSV_SEPARATOR`, `CSV_LINE_BREAK`, `CSV_HEADERS`, `CSV_FORMULA_PREFIXES`, `formatCentsForCsv`, `neutralizeFormula`, `escapeCsvField`, `buildExportFileName`; valida montos enteros seguros y fechas ISO, ordena una copia por fecha/id, resultado congelado |
| T3 | Helper `test/domain/services/csvTestParser.js` (`parseCsv` RFC 4180 con `;`, BOM y CRLF; `parseCsvAmountToCents` con enteros) |
| T4 | 15 pruebas del exportador (`[H11-R2]`..`[H11-R16]`, `[H11-R28]`) |
| T5 | `SqliteExpenseRepository.findAll()` con `JOIN categories` y `ORDER BY e.date ASC, e.id ASC`; sin migración |
| T6 | `readStoredExpenses(storage)` y `EXPENSES_STORAGE_KEY` en `localStorageExpenseReader.js` |
| T7–T8 | 1 caso nuevo en `sqliteExpenseRepository.test.js` (nuevo `describe`) y 3 pruebas del lector de `localStorage` |
| T9 | `exportHistory.js`: mensajes, `buildExportSuccessMessage`, `buildIdleExportState`, `loadExpensesForExport`, `exportHistory` (estados `done`, `empty`, `cancelled`, `error`; nunca lanza; sin gastos no llama a la entrega) |
| T10 | `csvDelivery.js`: `resolveBrowserEnv`, `createBrowserCsvDelivery` (`Blob` + `<a download>` + `click` + `remove` + revocación diferida 10 s; `canShare`/`share` con Web Share API; `AbortError` → `'cancelled'`) |
| T11 | `ExportHistoryPanel.jsx` presentacional con `buildStyles` Mobile First + Desktop |
| T12 | `MonthlyOverviewScreen.jsx`: `findAll()` en el repositorio en memoria; props `csvDelivery`/`initialExportState`; estados `exportState` y `canShare` (calculado una vez); panel al final de `tab-panel-expenses`; controlador con `csvDelivery`, `exportState`, `exportHistory(mode)` y `exportState` en `getState()` |
| T13 | `App.jsx`: `expenseRepo.findAll()` delega en `readStoredExpenses(window.localStorage)`; `AppShell.jsx` sin cambios |
| T14–T17 | Pruebas de orquestación (SQLite en memoria), entrega (entorno de navegador falso), panel y pantalla |
| T18 | `docs/architecture.md` (D8), `docs/privacy.md` (fila «Pérdida del dispositivo») y `docs/data_model.md` (nota de `findAll()`) |
| T19 | Pruebas existentes de H1..H10, H12 y H13 en verde sin modificar ningún caso (el diff de `test/` solo agrega líneas) |
| T20 | Este archivo + `progress/traceability.md` |
| T21 | `./init.sh` en verde |

## Archivos

### Creados
- `src/domain/services/csvExporter.js`
- `src/data/repositories/localStorageExpenseReader.js`
- `src/features/export/exportHistory.js`
- `src/features/export/csvDelivery.js`
- `src/features/export/ExportHistoryPanel.jsx`
- `test/domain/services/csvTestParser.js` (helper, no es `*.test.js`)
- `test/domain/services/csvExporter.test.js`
- `test/data/localStorageExpenseReader.test.js`
- `test/features/export/exportHistory.test.js`
- `test/features/export/csvDelivery.test.js`
- `test/features/export/ExportHistoryPanel.test.jsx`

### Modificados
- `src/domain/repositories/expenseRepository.js` (método `findAll()` del contrato)
- `src/data/repositories/sqliteExpenseRepository.js` (método `findAll()`)
- `src/features/income/MonthlyOverviewScreen.jsx` (panel en la pestaña «Gastos» y controlador)
- `src/App.jsx` (`expenseRepo.findAll()`)
- `test/data/sqliteExpenseRepository.test.js` (nuevo `describe('H11 lectura del historial completo')` al final)
- `test/features/income/MonthlyOverviewScreen.test.jsx` (nuevo `describe('H11 exportación del historial en la pestaña Gastos')` al final)
- `docs/architecture.md`, `docs/privacy.md`, `docs/data_model.md`
- `specs/h11_exportar_historial/tasks.md` (tareas `[x]`), `progress/current.md`, `progress/traceability.md`

Sin cambios en `package.json` (sin dependencias nuevas) ni en el esquema SQLite (sin migración).

## Trazabilidad R → prueba

| Requisito | Prueba |
|---|---|
| R1 | `[H11-R1] findAll devuelve los gastos de todos los meses con categoría, subcategoría y nota, por fecha ascendente` (`test/data/sqliteExpenseRepository.test.js`); `[H11-R1] devuelve como Expense todos los gastos guardados en fp_expenses, de cualquier mes` y `[H11-R1] con la clave ausente, JSON inválido o un valor que no es arreglo…` (`test/data/localStorageExpenseReader.test.js`); `[H11-R1] entrega un CSV con los gastos de todos los meses aunque hoy sea del último mes` y `[H11-R1] resuelve el nombre de la categoría por id…` (`test/features/export/exportHistory.test.js`); `[H11-R1] exporta los gastos de octubre y noviembre aunque el período activo sea noviembre` (`test/features/income/MonthlyOverviewScreen.test.jsx`) |
| R2 | `[H11-R2] la primera línea es el encabezado Fecha;Monto (ARS);Categoría;Subcategoría;Nota` (`csvExporter.test.js`) |
| R3 | `[H11-R3] cada fila de un gasto sin caracteres especiales tiene 5 campos separados por punto y coma` (`csvExporter.test.js`) |
| R4 | `[H11-R4] todas las líneas terminan en CRLF, incluida la última, sin LF sueltos fuera de comillas` (`csvExporter.test.js`) |
| R5 | `[H11-R5] el contenido empieza con la marca BOM UTF-8 y export([]) devuelve BOM + encabezado + CRLF` (`csvExporter.test.js`); `[H11-R5] la primera parte del Blob empieza con la marca BOM` (`csvDelivery.test.js`) |
| R6 | `[H11-R6] escribe la fecha en formato AAAA-MM-DD y rechaza una fila con fecha inválida` (`csvExporter.test.js`) |
| R7 | `[H11-R7] formatea los centavos con coma decimal, dos decimales y aritmética entera` (`csvExporter.test.js`) |
| R8 | `[H11-R8] la columna Categoría contiene el nombre de la categoría y no su id` (`csvExporter.test.js`) |
| R9 | `[H11-R9] deja vacíos los campos de subcategoría y nota cuando no tienen valor` (`csvExporter.test.js`) |
| R10 | `[H11-R10] ordena por fecha ascendente y a igual fecha por id ascendente sin mutar la entrada` (`csvExporter.test.js`); `[H11-R10] los devuelve ordenados por fecha ascendente y a igual fecha por id ascendente` (`localStorageExpenseReader.test.js`) |
| R11 | `[H11-R11] encierra entre comillas los campos con punto y coma, comillas o saltos de línea y duplica las comillas` (`csvExporter.test.js`) |
| R12 | `[H11-R12] antepone un apóstrofo a los campos de texto que empiezan con un carácter de fórmula, antes del escape` (`csvExporter.test.js`) |
| R13 | `[H11-R13][H11-R14] con notas especiales produce una fila por gasto…` (`csvExporter.test.js`); `[H11-R13][H11-R14] la cantidad de filas y la suma del CSV coinciden con COUNT y SUM de SQLite (CA2)` (`exportHistory.test.js`) |
| R14 | Las dos anteriores y `[H11-R14] rechaza un total que supera el entero seguro` (`csvExporter.test.js`) |
| R15 | `[H11-R15] el estado done informa la cantidad y el total formateado con formatCentsToArs` (`exportHistory.test.js`); `[H11-R15] con una exportación completa muestra la cantidad y el total en el mensaje` (`ExportHistoryPanel.test.jsx`); `[H11-R15] el mensaje renderizado muestra la cantidad de gastos y el total en pesos` (`MonthlyOverviewScreen.test.jsx`) |
| R16 | `[H11-R16] nombra el archivo gestix_gastos_<AAAA-MM-DD>.csv y rechaza fechas inválidas` (`csvExporter.test.js`); `[H11-R16] la entrega recibe el nombre gestix_gastos_<fecha de exportación>.csv` (`exportHistory.test.js`) |
| R17 | `[H11-R17] download crea un Blob text/csv, un enlace con download, hace click una vez, lo quita y revoca la URL diferida` (`csvDelivery.test.js`) |
| R18 | `[H11-R18] con canShare true comparte un File con el nombre y tipo del CSV y devuelve shared` (`csvDelivery.test.js`); `[H11-R18] con canShare muestra los botones Descargar CSV y Compartir` (`ExportHistoryPanel.test.jsx`) |
| R19 | `[H11-R19] canShare es false sin navigator.canShare, si devuelve false, si lanza o sin entorno de navegador` (`csvDelivery.test.js`); `[H11-R19] sin canShare no muestra el botón Compartir` (`ExportHistoryPanel.test.jsx`) |
| R20 | `[H11-R20] share devuelve cancelled ante AbortError y propaga otros errores` (`csvDelivery.test.js`); `[H11-R20] si el usuario cancela la hoja de compartir el estado es cancelled sin mensaje` (`exportHistory.test.js`) |
| R21 | `[H11-R21] sin gastos devuelve el estado empty con su mensaje y no entrega ningún archivo` (`exportHistory.test.js`); `[H11-R21] sin gastos muestra el mensaje de que todavía no hay gastos para exportar` (`ExportHistoryPanel.test.jsx`) |
| R22 | `[H11-R22] si falla la lectura o la entrega devuelve el estado error sin lanzar y sin cambiar los gastos` (`exportHistory.test.js`); `[H11-R22] sin entorno de navegador download rechaza` (`csvDelivery.test.js`); `[H11-R22] ante un error muestra el mensaje como alerta y al cancelar no muestra error` (`ExportHistoryPanel.test.jsx`) |
| R23 | `[H11-R23] en la pestaña Gastos muestra el panel de exportación al final, después de la comparación mensual` (`MonthlyOverviewScreen.test.jsx`) |
| R24 | `[H11-R24] la pestaña Resumen y el header no muestran el panel ni los botones de exportación` (`MonthlyOverviewScreen.test.jsx`) |
| R25 | `[H11-R25] en mobile los botones ocupan el ancho completo con alto mínimo de 44 px` (`ExportHistoryPanel.test.jsx`) |
| R26 | `[H11-R26] en desktop limita el ancho a containerMaxWidth y muestra los botones en fila con ancho automático` (`ExportHistoryPanel.test.jsx`) |
| R27 | `[H11-R27] muestra la advertencia de que el archivo incluye notas y no está protegido` (`ExportHistoryPanel.test.jsx`) |
| R28 | `[H11-R28] el exportador es JavaScript puro y funciona sin red` (`csvExporter.test.js`); `[H11-R28] la entrega y la orquestación no usan red` (`csvDelivery.test.js`) |

## Salida resumida de `./init.sh`

```
── 3. Arnés SDD ──
[OK]    H11: spec completo (28 requisitos)
[OK]    H11: todos los requisitos tienen prueba etiquetada
[OK]    Trazabilidad (K6 parcial): 167 de 167 requisitos con prueba (100 %)
[OK]    Arnés consistente (0 advertencias).
── 4. Análisis estático (ESLint) ──
[OK]    eslint sin problemas
── 5. Pruebas ──
# tests 278
# pass 278
# fail 0
[OK]    Todas las pruebas pasan
── 6. Resumen ──
[OK]    Entorno listo. Podés empezar a trabajar.
```

Antes de H11: 232 pruebas. H11 agrega 46 (15 exportador, 1 SQLite, 3 lector `localStorage`,
8 orquestación, 7 entrega, 8 panel, 4 pantalla).

## Desvíos respecto del diseño

No hay desvíos de requisitos ni de decisiones de diseño. Detalles de implementación menores,
dentro del margen de `design.md`:

- `ExportHistoryPanel` agrega `role="status"` al `export-message` (accesibilidad; el
  `export-error` mantiene `role="alert"` como pide el diseño) y un contenedor de botones con
  `data-testid="export-actions"`.
- `readStoredExpenses(null)` devuelve `[]` en lugar de lanzar (mismo criterio que clave
  ausente); `App.jsx` igualmente verifica `window.localStorage` antes de llamarla.
- `resolveBrowserEnv()` devuelve `null` si falta `Blob`, `URL.createObjectURL` o
  `document.createElement` (en Node, sin `document`, la entrega queda inactiva y la descarga
  rechaza, que `exportHistory` transforma en estado `error`, R22).
- Pruebas adicionales a las enumeradas en `tasks.md`: `[H11-R14]` total fuera de entero
  seguro, `[H11-R22]` descarga sin entorno de navegador y `[H11-R1]` resolución del nombre de
  categoría por id.
