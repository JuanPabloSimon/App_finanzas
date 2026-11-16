# Design — h11_exportar_historial

> Decisiones técnicas para H11. Apoyado en `docs/architecture.md` (principio 8: la
> exportación CSV es un servicio de dominio sin E/S; D1 persistencia local; D3 centavos
> enteros), `docs/conventions.md`, `docs/privacy.md` (exportación a pedido como resguardo
> ante la pérdida del dispositivo) y en el código vigente tras H13, H9 y H10.

## Archivos

| Capa | Archivo | Cambio |
|---|---|---|
| domain | `src/domain/repositories/expenseRepository.js` | Nuevo método de contrato `findAll()` |
| domain | `src/domain/services/csvExporter.js` | Nuevo servicio puro `CsvExporter` + constantes y funciones de formato (`formatCentsForCsv`, `neutralizeFormula`, `escapeCsvField`, `buildExportFileName`) |
| data | `src/data/repositories/sqliteExpenseRepository.js` | Nuevo método `findAll()` (misma proyección con `JOIN categories` que `findByYearMonth`, `ORDER BY e.date ASC, e.id ASC`) |
| data | `src/data/repositories/localStorageExpenseReader.js` | Nueva función `readStoredExpenses(storage)` que lee `fp_expenses` del `storage` inyectado |
| presentation | `src/features/export/exportHistory.js` | `loadExpensesForExport(...)`, `exportHistory(...)`, `buildIdleExportState()` y textos del panel |
| presentation | `src/features/export/csvDelivery.js` | `createBrowserCsvDelivery(env)`: descarga con `Blob` + enlace `download` y Web Share API opcional. Único archivo de H11 que toca APIs del navegador |
| presentation | `src/features/export/ExportHistoryPanel.jsx` | Componente presentacional: advertencia, botones «Descargar CSV» y «Compartir», mensajes |
| presentation | `src/features/income/MonthlyOverviewScreen.jsx` | `findAll()` en `createInMemoryExpenseRepository`; prop `csvDelivery` e `initialExportState`; estado `exportState`; `ExportHistoryPanel` al final de `tab-panel-expenses`; controlador con opción `csvDelivery`, `exportHistory(mode)` y `exportState` en `getState()` |
| app | `src/App.jsx` | `expenseRepo.findAll()` en `createBrowserRepositories()` delegando en `readStoredExpenses(window.localStorage)` |
| docs | `docs/architecture.md` | Decisión **D8** (formato CSV es-AR y entrega en el navegador) |
| docs | `docs/privacy.md` | Fila «Pérdida del dispositivo»: contenido del CSV, sin red, advertencia del panel |
| docs | `docs/data_model.md` | Nota: sin migración; `findAll()` lee `expenses` completa y, en el navegador, `fp_expenses` |
| test | `test/domain/services/csvTestParser.js` | Helper de prueba (no es `*.test.js`): parser RFC 4180 con `;`, BOM y CRLF, y `parseCsvAmountToCents` |
| test | `test/domain/services/csvExporter.test.js` | R2..R14, R16, R28 |
| test | `test/data/sqliteExpenseRepository.test.js` | Caso nuevo `[H11-R1]` al final (nuevo `describe`); los casos existentes no se modifican |
| test | `test/data/localStorageExpenseReader.test.js` | R1, R10 (con `storage` falso) |
| test | `test/features/export/exportHistory.test.js` | R1, R13, R14, R15, R16, R21, R22 (SQLite en memoria + entrega falsa) |
| test | `test/features/export/csvDelivery.test.js` | R5, R17, R18, R19, R20, R28 (entorno de navegador falso) |
| test | `test/features/export/ExportHistoryPanel.test.jsx` | R15, R18, R19, R21, R22, R25, R26, R27 |
| test | `test/features/income/MonthlyOverviewScreen.test.jsx` | Casos nuevos `[H11-R1]`, `[H11-R23]`, `[H11-R24]` en un `describe('H11 ...')` al final; los casos existentes no se modifican |

No se agregan dependencias a `package.json`. No hay migración de esquema.

## Formato del CSV (decisiones verificables)

| Aspecto | Decisión | Motivo |
|---|---|---|
| Codificación | UTF-8 con BOM (`﻿` como primer carácter del texto) | Sin BOM, Excel en Windows abre el CSV como ANSI y rompe `Categoría`, `Educación`, `ñ` |
| Separador | `;` | En es-AR la coma es el separador decimal; Excel y LibreOffice configurados en es-AR usan `;` como separador de listas y parten la fila en columnas al abrir el archivo con doble clic |
| Fin de línea | CRLF (`\r\n`) en todas las líneas, incluida la última | RFC 4180 |
| Encabezado | `Fecha;Monto (ARS);Categoría;Subcategoría;Nota` | Columnas pedidas por CA1; la moneda queda explícita sin símbolo en las celdas |
| Fecha | `YYYY-MM-DD` (tal como se guarda) | Excel, LibreOffice y Google Sheets la reconocen como fecha sin depender de la configuración regional; `DD/MM/AAAA` se invierte en planillas configuradas en inglés |
| Monto | Pesos con coma decimal, siempre dos decimales, sin separador de miles ni símbolo: `Math.trunc(cents / 100)` + `,` + `String(cents % 100).padStart(2, '0')` | Con configuración es-AR la planilla lo interpreta como número y `SUMA()` coincide con la app (CA2). Sin coma flotante: la división entera y el resto operan sobre `Number.isSafeInteger` |
| Categoría | Nombre de la categoría (no el id) | Legible en la planilla |
| Subcategoría y nota vacías | Campo vacío (`2026-11-03;1500,00;Alimentos;;`) | Sin textos de relleno que la planilla confunda con datos |
| Orden | Fecha ascendente; a igual fecha, `id` ascendente | Historial cronológico, estable entre exportaciones |
| Escape RFC 4180 | Campo con `;`, `"`, `\r` o `\n` → entre comillas dobles y cada `"` interna duplicada | Notas con saltos de línea o punto y coma no generan registros ni columnas extra (CA2) |
| *CSV injection* | Campo de texto que empieza con `=`, `+`, `-`, `@`, `\t` o `\r` → se antepone `'`; luego se aplica el escape | Recomendación OWASP. `Fecha` y `Monto` no se neutralizan: los genera la app y nunca empiezan con esos caracteres (los montos son > 0) |
| Fila de totales | No existe | Una fila extra rompería «la cantidad de registros coincide» (CA2) |
| Nombre del archivo | `gestix_gastos_<YYYY-MM-DD>.csv` con la fecha de exportación | Sin `$` (inválido o problemático en algunos sistemas de archivos) y sin nombre ni usuario de la persona (privacidad) |
| Sin gastos | No se genera ni entrega archivo; el panel muestra «Todavía no hay gastos para exportar.» | Un archivo con solo el encabezado no resguarda nada y confunde. `CsvExporter.export([])` sigue siendo una función total (devuelve BOM + encabezado, `rowCount` 0) para que el dominio no tenga casos especiales |

Ejemplo (las comillas y el apóstrofo son parte del contenido):

```
﻿Fecha;Monto (ARS);Categoría;Subcategoría;Nota\r\n
2026-10-05;6500,00;Suscripciones;Streaming;\r\n
2026-11-03;1234,56;Alimentos;;"Compra; con ""oferta""\r\nen dos líneas"\r\n
2026-11-03;0,05;Ocio;;'=SUMA(A1:A9)\r\n
```

## Firmas nuevas

```javascript
// src/domain/repositories/expenseRepository.js (método nuevo del contrato)
/** @returns {Promise<Expense[]>} todos los gastos, fecha ASC e id ASC */
async findAll() { throw new Error('Not implemented'); }

// src/domain/services/csvExporter.js — JavaScript puro, sin imports de react, react-dom,
// node:sqlite ni uso de fetch/XMLHttpRequest/Blob/document.
export const CSV_BOM = '﻿';
export const CSV_SEPARATOR = ';';
export const CSV_LINE_BREAK = '\r\n';
export const CSV_HEADERS = Object.freeze([
  'Fecha', 'Monto (ARS)', 'Categoría', 'Subcategoría', 'Nota',
]);
export const CSV_FORMULA_PREFIXES = Object.freeze(['=', '+', '-', '@', '\t', '\r']);

/** 123456 → '1234,56'. Lanza InvalidAmount si no es entero seguro > 0. */
export function formatCentsForCsv(amountCents) { /* ... */ }

/** Antepone "'" si el texto empieza con un carácter de CSV_FORMULA_PREFIXES. null/'' → ''. */
export function neutralizeFormula(text) { /* ... */ }

/** Comillas RFC 4180 si contiene ; " \r o \n; duplica comillas internas. */
export function escapeCsvField(value) { /* ... */ }

/** '2026-11-15' → 'gestix_gastos_2026-11-15.csv'. Lanza InvalidExpenseDate si no es ISO. */
export function buildExportFileName(isoDate) { /* ... */ }

export class CsvExporter {
  /**
   * @param {Array<{ id:number, date:string, amountCents:number, categoryName:string|null,
   *                 subcategory:string|null, note:string|null }>} rows
   * @returns {Readonly<{ content: string, rowCount: number, totalCents: number }>}
   * No muta `rows`. Valida cada fila: amountCents entero seguro > 0 (InvalidAmount) y
   * fecha ISO válida (InvalidExpenseDate). totalCents es entero seguro (si no, InvalidAmount).
   */
  export(rows) { /* ... */ }
}

// src/data/repositories/localStorageExpenseReader.js
export const EXPENSES_STORAGE_KEY = 'fp_expenses';
/**
 * Lee el arreglo JSON de `storage.getItem('fp_expenses')` y devuelve Expense[] ordenados
 * por fecha ASC e id ASC. Clave ausente, JSON inválido o valor que no es arreglo → [].
 * Un elemento que no cumple el modelo Expense propaga la excepción del dominio.
 */
export function readStoredExpenses(storage) { /* ... */ }

// src/features/export/exportHistory.js
export const EXPORT_EMPTY_MESSAGE = 'Todavía no hay gastos para exportar.';
export const EXPORT_ERROR_MESSAGE = 'No se pudo exportar el historial. Probá de nuevo.';
export const EXPORT_PRIVACY_NOTICE =
  'El archivo incluye tus notas y subcategorías y no está protegido. Guardalo en un lugar seguro.';

/** 1 → 'Se exportó 1 gasto por un total de $ 6.500.'; n → 'Se exportaron n gastos por un total de $ X.' */
export function buildExportSuccessMessage(rowCount, totalCents) { /* ... */ }

/** @returns {Readonly<{ status:'idle', rowCount:0, totalCents:0, fileName:null, message:null }>} */
export function buildIdleExportState() { /* ... */ }

/**
 * expenseRepository.findAll() + categoryRepository.findAll(); categoryName del gasto o, si
 * es null, el nombre de la categoría por id; si tampoco existe, ''.
 */
export async function loadExpensesForExport({ expenseRepository, categoryRepository }) { /* ... */ }

/**
 * Orquesta: loadExpensesForExport → si 0 gastos, estado 'empty' sin llamar a delivery →
 * CsvExporter.export → buildExportFileName(today()) → delivery.download(...) o
 * delivery.share(...) según mode.
 * @param {{ expenseRepository, categoryRepository, today: () => string|Date,
 *           delivery: CsvDelivery, mode?: 'download'|'share' }} options
 * @returns {Promise<Readonly<ExportState>>} nunca lanza:
 *   'done'      → { rowCount, totalCents, fileName, message: buildExportSuccessMessage(...) }
 *   'empty'     → { rowCount: 0, totalCents: 0, fileName: null, message: EXPORT_EMPTY_MESSAGE }
 *   'cancelled' → share devolvió 'cancelled'; message: null (sin error, R20)
 *   'error'     → cualquier excepción; message: EXPORT_ERROR_MESSAGE
 */
export async function exportHistory(options) { /* ... */ }

// src/features/export/csvDelivery.js
export const CSV_MIME_TYPE = 'text/csv;charset=utf-8';
export const OBJECT_URL_REVOKE_DELAY_MS = 10000;

/**
 * @typedef {{ Blob, File, URL, document, navigator, setTimeout }} BrowserEnv
 * resolveBrowserEnv() toma esas referencias de globalThis; fuera del navegador devuelve null.
 */
export function resolveBrowserEnv() { /* ... */ }

/**
 * @returns {Readonly<{
 *   canShare(): boolean,                                   // false si env es null o no hay File/canShare
 *   download({ fileName, content }): Promise<void>,        // Blob + <a download> + click + remove; revoke diferido
 *   share({ fileName, content }): Promise<'shared'|'cancelled'>, // AbortError → 'cancelled'; otro error se propaga
 * }>}
 */
export function createBrowserCsvDelivery(env = resolveBrowserEnv()) { /* ... */ }

// src/features/export/ExportHistoryPanel.jsx
export function ExportHistoryPanel({
  exportState = buildIdleExportState(),
  canShare = false,
  onDownload = () => {},
  onShare = () => {},
  viewportWidth = 390,
}) { /* ... */ }
ExportHistoryPanel.buildStyles = buildExportHistoryPanelStyles; // (viewportWidth) => estilos congelados

// src/features/income/MonthlyOverviewScreen.jsx (controlador)
// new MonthlyOverviewController({ ..., csvDelivery = null })
//   this.csvDelivery = csvDelivery ?? createBrowserCsvDelivery();
//   this.exportState = buildIdleExportState();
// async exportHistory(mode = 'download') → actualiza this.exportState con exportHistory(...)
//   y devuelve getState(); getState() incluye exportState; renderElement() pasa
//   csvDelivery e initialExportState.
```

### Mecanismo de descarga (`download`)

1. `const blob = new env.Blob([content], { type: CSV_MIME_TYPE })` (el `content` ya trae el
   BOM; el `Blob` lo codifica en UTF-8 como `EF BB BF`).
2. `const url = env.URL.createObjectURL(blob)`.
3. `const anchor = env.document.createElement('a')`; `anchor.href = url`;
   `anchor.download = fileName`; `anchor.rel = 'noopener'`; `anchor.style.display = 'none'`.
4. `env.document.body.appendChild(anchor)`; `anchor.click()`; `anchor.remove()`.
5. `env.setTimeout(() => env.URL.revokeObjectURL(url), OBJECT_URL_REVOKE_DELAY_MS)`: revocar
   en el mismo tick cancela la descarga en algunos navegadores (Firefox, Safari).

Sin `env` (pruebas sin navegador o SSR), `download` rechaza con `Error` y `exportHistory`
lo transforma en estado `'error'` (R22).

### Compartir (`share`, opcional)

- `canShare()` construye `new env.File([content-de-prueba], 'gestix.csv', { type: CSV_MIME_TYPE })`
  y devuelve `typeof env.navigator?.canShare === 'function' && env.navigator.canShare({ files: [file] })`.
  Cualquier excepción → `false`.
- `share()` crea el `File` con el CSV real y llama `env.navigator.share({ files: [file],
  title: fileName })`. `AbortError` (el usuario cerró la hoja) → `'cancelled'`.
- `MonthlyOverviewScreen` calcula `canShare` una vez al montar
  (`useState(() => delivery.canShare())`) y lo pasa como prop al panel; en
  Android Chrome y Safari iOS aparece «Compartir»; en la mayoría de los navegadores de
  escritorio no aparece y solo queda «Descargar CSV».

## Ubicación del control (H13 intacto)

**Elegida: pestaña «Gastos» (`expenses`), al final de `tab-panel-expenses`**, después de
`MonthlyComparisonPanel`.

- Resumen sigue siendo solo informativo y sin scroll (H13-R1/R2): no se agrega nada.
- Se mantienen las 5 pestañas (H13-R3/R4): no se agrega una sexta.
- El header sigue con solo «Ge$tix» y el ícono de perfil (H13-R5): no se agrega nada.
- La pestaña Gastos ya admite scroll vertical y agrupa lo relativo a gastos (formulario,
  listado, ranking, comparación); exportar el historial de gastos es una acción sobre ese
  mismo listado, así que es donde el usuario la busca.
- `MonthlyOverviewScreen` ya tiene `expenseRepository`, `categoryRepository` y `today`: no
  hay que reenviar nada nuevo desde `AppShell`, que no se modifica.

**Descartada: menú de perfil (`profile-menu-popover`).** Aunque «resguardo» se asocia con
privacidad, el popover está cerrado por defecto (poca visibilidad para una acción de valor
de la historia), ya contiene un formulario de edición que en mobile ocupa casi toda la
altura, y obligaría a reenviar repositorios y estado de exportación desde
`MonthlyOverviewScreen` hacia `AppShell` (o duplicarlos), sumando acoplamiento y riesgo de
romper las pruebas `[H13-R5]`..`[H13-R7]`.

## Diseño Mobile First y adaptación Desktop

`ExportHistoryPanel.buildStyles(viewportWidth)` con `getViewportLayout`, mismo patrón y
paleta que `RecurrencesPanel` (tarjeta `surface`, borde superior `navyPrimary`).

- **Mobile (`< 768px`):** tarjeta a ancho completo (`maxWidth: '100%'`, `margin: 0`),
  título «Exportar historial», advertencia (R27) en texto secundario 13 px, botones apilados
  en columna con `width: '100%'` y `minHeight: 44` (objetivo táctil); «Descargar CSV» con
  fondo `navyPrimary` y texto blanco; «Compartir» (si aplica) con borde `borderStrong`.
  Mensajes debajo de los botones: `export-message` (éxito o vacío, color `textSecondary`) y
  `export-error` (color `danger`, `role="alert"`).
- **Desktop (`≥ 768px`):** `maxWidth: layout.containerMaxWidth` y `margin: '0 auto'`;
  botones en fila (`flexDirection: 'row'`) con `width: 'auto'`, `minHeight: 44` y foco
  visible por teclado (son `<button type="button">` nativos).
- Atributos para pruebas: `data-testid="export-history-panel"` con `data-layout`
  (`mobile` | `tablet` | `desktop`), `export-privacy-notice`, `export-download-button`,
  `export-share-button`, `export-message`, `export-error`.

## Lectura de todos los gastos (`findAll`)

- **Contrato:** `ExpenseRepository.findAll()` devuelve todos los gastos con `categoryName`,
  ordenados por `date ASC, id ASC`. Se agrega al contrato porque `findByYearMonth` obligaría
  a conocer el rango de meses con datos.
- **SQLite:** `SELECT e.id, e.amount_cents, e.date, e.category_id, c.name AS category_name,
  e.subcategory, e.note, e.created_at, e.updated_at FROM expenses e JOIN categories c ON
  c.id = e.category_id ORDER BY e.date ASC, e.id ASC`, mapeado con `mapRowToExpense`.
  Usa el índice `idx_expenses_date`.
- **Navegador:** `readStoredExpenses(window.localStorage)` en `src/data/repositories/`,
  invocada desde `expenseRepo.findAll()` de `App.jsx` (si no hay `window.localStorage`,
  devuelve `[]`). Se extrae como función con `storage` inyectado para poder probarla con un
  `storage` falso, igual que `LocalStorageRecurrenceRepository`; el resto del repositorio
  inline de `App.jsx` no se refactoriza.
- **Memoria:** `createInMemoryExpenseRepository` de `MonthlyOverviewScreen.jsx` agrega
  `findAll()` con copia ordenada.
- `exportHistory` vuelve a ordenar dentro de `CsvExporter` (R10), así que el orden no
  depende de cada implementación.

## Datos (SQLite)

- Migración: **ninguna**. `findAll()` es solo lectura sobre `expenses` y `categories`.
- `docs/data_model.md` agrega una nota en `expenses` sobre la exportación (sin cambio de
  esquema ni de `user_version`).

## Errores

- Excepciones reutilizadas: `InvalidAmount` (monto no entero, ≤ 0 o total no seguro en
  `CsvExporter`/`formatCentsForCsv`), `InvalidExpenseDate` (fecha de fila o de exportación
  inválida).
- Excepciones nuevas: ninguna.
- `exportHistory` captura cualquier excepción (dominio, repositorio, `Blob`, `share`
  distinto de `AbortError`) y devuelve el estado `'error'` con `EXPORT_ERROR_MESSAGE`; nunca
  muestra stack traces. La exportación es solo lectura: un error no modifica gastos.

## Privacidad

- El CSV contiene datos personales completos (montos, fechas exactas, notas y
  subcategorías). Se genera **solo a pedido** del usuario y se entrega al propio
  dispositivo (descarga) o al destino que el usuario elige en la hoja del sistema
  (compartir). Es el resguardo previsto en `docs/privacy.md` para la pérdida del dispositivo.
- Ninguna parte de H11 usa red ni pasa por `src/assistant/` (R28). El CSV no se envía al
  modelo de lenguaje ni se guarda en `localStorage`.
- El nombre del archivo no incluye nombre ni usuario de la cuenta local.
- El panel advierte que el archivo contiene notas y no está protegido (R27). El aviso de
  privacidad de H12 no cambia: la exportación no es una transferencia a terceros, así que no
  se incrementa `policy_version`.

## Alternativa descartada

**Alternativa A — dependencia `papaparse` (o similar) para generar el CSV.** Se descarta:
el formato necesario (separador fijo, escape RFC 4180, neutralización de fórmulas, BOM) son
unas pocas decenas de líneas puras y probables; una dependencia de runtime agrega peso al
bundle y una frontera más sin beneficio (regla 14).

**Alternativa B — separador `,` con montos con punto decimal (`1234.56`).** Se descarta:
en planillas configuradas en es-AR la coma es separador decimal, el archivo se abre en una
sola columna y `1234.56` se interpreta como texto o como 123.456, lo que rompe el total de
CA2.

**Alternativa C — leer el historial con `findByYearMonth` mes a mes.** Se descarta: hay que
adivinar el rango de meses con datos (o recorrer desde una fecha arbitraria) y hace N
consultas en lugar de una.

**Alternativa D — botón en el menú de perfil.** Descartada en «Ubicación del control».

## Riesgos y casos borde

- **Apóstrofo visible:** una nota que empieza con `-` (por ejemplo `-20 % de descuento`) se
  ve como `'-20 % de descuento` en la planilla. Es el costo aceptado de la mitigación OWASP.
- **Planilla en otra configuración regional (en-US):** el `;` y la coma decimal no se
  interpretan solos; el usuario debe elegir `;` y coma decimal en el asistente de
  importación. Se documenta en D8; el público objetivo usa es-AR.
- **Google Sheets** al importar con detección automática reconoce `;`; el BOM no aparece
  como carácter.
- **Historial grande:** el CSV se arma en memoria como un único `string`; con miles de
  gastos son pocos cientos de KB, aceptable para el uso individual.
- **Montos enormes:** `formatCentsForCsv` y el total validan `Number.isSafeInteger`.
- **`categoryName` ausente:** en el navegador los gastos guardan `categoryName`; si falta,
  se resuelve por `categoryId`; si la categoría no existe, campo vacío (no se pierde la fila
  y el conteo de CA2 se mantiene).
- **Safari iOS** puede abrir el CSV en una pestaña en lugar de descargarlo; por eso se
  ofrece «Compartir» cuando la Web Share API admite archivos.
- **Doble toque:** dos toques seguidos generan dos descargas idénticas; no hay escritura,
  así que no hay inconsistencia.
- **Regresión H13:** el panel solo se agrega en `tab-panel-expenses`; las pruebas
  `[H13-R1]`..`[H13-R5]` y las de H7/H8 en la pestaña Gastos deben seguir sin cambios.
