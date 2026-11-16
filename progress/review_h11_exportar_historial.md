# Review — H11 h11_exportar_historial

**Veredicto:** APPROVED

- **Rama:** `feature/h11-exportar-historial` (cambios sin commitear).
- **Fecha:** 2026-11-15.
- **Insumos:** `specs/h11_exportar_historial/` (R1..R28, aprobado por Francisco el 2026-11-15 según
  `progress/current.md`), `progress/impl_h11_exportar_historial.md`, `progress/traceability.md`.
- **`./init.sh` ejecutado por el reviewer:** verde. Arnés `H11: spec completo (28 requisitos)` y
  `todos los requisitos tienen prueba etiquetada`; `eslint sin problemas`; `# tests 278 / pass 278 /
  fail 0`; `Entorno listo`.

## Trazabilidad requisitos ↔ pruebas

- R1: [x] `test/data/sqliteExpenseRepository.test.js:533` (`findAll` SQLite en memoria devuelve 3 meses con categoría/subcategoría/nota); `test/data/localStorageExpenseReader.test.js:69,97`; `test/features/export/exportHistory.test.js:89` (CSV con 2026-09/10/11 con hoy = 2026-11-15); `test/features/income/MonthlyOverviewScreen.test.jsx:1422` (estado del mes muestra 1 gasto, el CSV trae octubre y noviembre).
- R2: [x] `test/domain/services/csvExporter.test.js:38` (línea 1 exacta `Fecha;Monto (ARS);Categoría;Subcategoría;Nota`).
- R3: [x] `csvExporter.test.js:44` (4 `;` y 5 campos por fila; línea literal).
- R4: [x] `csvExporter.test.js:58` (termina en CRLF; sin LF sueltos fuera de comillas; 3 CRLF de registro).
- R5: [x] `csvExporter.test.js:69` (U+FEFF y bytes `EF BB BF` vía `Buffer`); `test/features/export/csvDelivery.test.js:121` (el Blob arranca con BOM).
- R6: [x] `csvExporter.test.js:82` (`2026-03-09;` y rechazo de `09/03/2026` y `2026-02-30`).
- R7: [x] `csvExporter.test.js:89` (`123456→1234,56`, `5→0,05`, `100→1,00`, rechazo de no enteros/no seguros; sin `.`). Implementación `src/domain/services/csvExporter.js:24-29` = fórmula de `design.md:44` (`Math.trunc(cents/100)` + `cents % 100` sobre `Number.isSafeInteger`). Verifiqué además con BigInt los 2 000 000 enteros más altos hasta `MAX_SAFE_INTEGER`: 0 discrepancias.
- R8: [x] `csvExporter.test.js:106`.
- R9: [x] `csvExporter.test.js:112` (`null` y `''` → `;;`).
- R10: [x] `csvExporter.test.js:119` (fecha asc, empate por id, sin mutar la entrada); `localStorageExpenseReader.test.js:83`.
- R11: [x] `csvExporter.test.js:139` (`;`, `"` duplicada, `\n`, `\r\n`).
- R12: [x] `csvExporter.test.js:148` (`= + - @ \t \r`, `'` antes del escape: `"'=a;b"`, fecha y monto sin `'`).
- R13: [x] `csvExporter.test.js:172` y `test/features/export/exportHistory.test.js:108` (CA2: filas parseadas = `SELECT COUNT(*)` de SQLite en memoria con 8 gastos con `;`, `"`, saltos de línea y fórmulas).
- R14: [x] `exportHistory.test.js:108` (suma con `parseCsvAmountToCents` entero = `SELECT SUM(amount_cents)`); `csvExporter.test.js:172,199`.
- R15: [x] `exportHistory.test.js:129` (mensaje con `formatCentsToArs`, singular/plural); `test/features/export/ExportHistoryPanel.test.jsx:48`; `MonthlyOverviewScreen.test.jsx:1443` (render «Se exportaron 2 gastos por un total de $ 7.734,56.»).
- R16: [x] `csvExporter.test.js:210`; `exportHistory.test.js:143` (`gestix_gastos_2026-11-15.csv`).
- R17: [x] `csvDelivery.test.js:95` (Blob `text/csv;charset=utf-8`, `<a>` con `download`, 1 click, `remove`, revocación diferida 10 s).
- R18: [x] `csvDelivery.test.js:127` (`File` con nombre/tipo a `navigator.share`); `ExportHistoryPanel.test.jsx:35`.
- R19: [x] `csvDelivery.test.js:152` (sin `canShare`, `false`, lanza, sin entorno); `ExportHistoryPanel.test.jsx:41`; `MonthlyOverviewScreen.test.jsx:1369` (sin botón con delivery que no comparte).
- R20: [x] `csvDelivery.test.js:178` (`AbortError` → `cancelled`, otros se propagan); `exportHistory.test.js:203` (estado `cancelled`, `message: null`); `ExportHistoryPanel.test.jsx:78` (sin `export-error`).
- R21: [x] `exportHistory.test.js:153` (estado `empty`, `delivery.calls.length === 0`, sin `fileName`); `ExportHistoryPanel.test.jsx:65`. Código: `src/features/export/exportHistory.js:62-64` retorna antes de llamar a la entrega.
- R22: [x] `exportHistory.test.js:165` (fallo de lectura, de descarga y de share → `error` sin lanzar, gastos intactos); `csvDelivery.test.js:211`; `ExportHistoryPanel.test.jsx:78` (`role="alert"`).
- R23: [x] `MonthlyOverviewScreen.test.jsx:1369` (panel dentro de `tab-panel-expenses`, después de `monthly-comparison`). Código: `src/features/income/MonthlyOverviewScreen.jsx:1814`.
- R24: [x] `MonthlyOverviewScreen.test.jsx:1386` (Resumen sin panel ni botón; `app-header` sin `export-`/`Exportar` vía `AppShell`).
- R25: [x] `ExportHistoryPanel.test.jsx:104` (390 px: `width: '100%'`, `minHeight: 44`, columna). Umbral `isMobile = width < 768` en `src/core/responsive.js:11`.
- R26: [x] `ExportHistoryPanel.test.jsx:116` (1280 px: `maxWidth = containerMaxWidth`, `margin: '0 auto'`, botones `auto`).
- R27: [x] `ExportHistoryPanel.test.jsx:25` (literal exacto de la advertencia).
- R28: [x] `csvExporter.test.js:216` (fuente sin `fetch(`/`XMLHttpRequest`/`axios`/React/`node:sqlite`/`Blob`/`document.` y ejecución con `fetch` que lanza); `csvDelivery.test.js:217` (los 3 archivos de `src/features/export/` sin `fetch(`, `XMLHttpRequest`, `axios`, `sendBeacon`, `WebSocket`).

## Tareas

- T1..T21: [x] (`specs/h11_exportar_historial/tasks.md`, ninguna casilla `[ ]`).

## Formato del CSV (verificación pedida)

- [x] BOM UTF-8 `src/domain/services/csvExporter.js:4,99`.
- [x] Separador `;` y CRLF en todas las líneas incluida la última `csvExporter.js:5-6,68-70`.
- [x] Encabezado `csvExporter.js:7-13`; fecha ISO validada `csvExporter.js:88-90`.
- [x] Monto entero `csvExporter.js:18-29`; total acumulado con control de entero seguro `csvExporter.js:91-94`.
- [x] Escape RFC 4180 `csvExporter.js:16,46-52`; prefijo `'` OWASP aplicado solo a campos de texto antes del escape `csvExporter.js:14,38-44,76-78`.
- [x] Orden fecha/id sobre una copia `csvExporter.js:61-66,97`; nombre `gestix_gastos_<fecha>.csv` `csvExporter.js:54-59`.
- [x] Sin fila de totales ni filas vacías (`export([])` = BOM + encabezado + CRLF, `csvExporter.test.js:75-76`).

## Arquitectura, Mobile First + Desktop y privacidad

- [x] `src/domain/services/csvExporter.js` solo importa `src/core/errors.js` y `src/core/dates.js`; `grep` sin `react`, `node:sqlite`, `axios` ni `fetch` en `src/domain/`.
- [x] `findAll()` en el contrato (`src/domain/repositories/expenseRepository.js:12`), en SQLite con `JOIN categories` y `ORDER BY e.date ASC, e.id ASC` (`src/data/repositories/sqliteExpenseRepository.js:107-123`), en el navegador vía `readStoredExpenses` (`src/App.jsx:122-127`, `src/data/repositories/localStorageExpenseReader.js`) y en el repositorio en memoria (`src/features/income/MonthlyOverviewScreen.jsx:108-112`).
- [x] Solo `src/assistant/` hace red: `grep "fetch("` en `src/` fuera de `src/assistant/` sin resultados. Entrega aislada en `src/features/export/csvDelivery.js` con entorno inyectable (`resolveBrowserEnv`), `Blob` + `download` (`:47-63`) y Web Share con `canShare({ files })` (`:32-45`, `:65-79`).
- [x] Dinero en centavos enteros; sin migración (solo lectura), documentado en `docs/data_model.md` (nota de `findAll()`).
- [x] UI Mobile First + Desktop: `ExportHistoryPanel.buildStyles` con `getViewportLayout` (`src/features/export/ExportHistoryPanel.jsx:14-84`), 44 px en todos los anchos.
- [x] Privacidad: no toca la IA; `docs/privacy.md` fila «Pérdida del dispositivo» ampliada; advertencia R27; el nombre del archivo no incluye datos de la persona; D8 en `docs/architecture.md`.
- [x] Sin dependencias nuevas: `git diff --numstat package.json package-lock.json` vacío.

## Regresiones

- [x] `git diff --numstat test/` solo agrega líneas (`sqliteExpenseRepository.test.js` +66/-0, `MonthlyOverviewScreen.test.jsx` +158/-0): ningún caso existente de H1..H10, H12 o H13 fue modificado y los 232 previos siguen en verde dentro de 278/278.
- [x] H13: el panel se renderiza solo en la rama `activeTab === 'expenses'` (`MonthlyOverviewScreen.jsx:1814`); Resumen y header verificados por `[H11-R24]`; `AppShell.jsx` sin cambios.

## Higiene

- [x] Sin `console.log`/`console.debug`, `TODO` ni `FIXME` en los archivos nuevos o modificados (`grep`).
- [x] Sin código comentado; el único comentario (`csvDelivery.js:61`) explica la revocación diferida.
- [x] `.env` ignorado (`.gitignore:18`); sin archivos temporales en `git status`.

## Checkpoints

- C1: [x] archivos base presentes (arnés OK); `./init.sh` código 0.
- C2: [x] una sola feature `in_progress` (H11, `feature_list.json`); `progress/current.md` describe la sesión con herramienta `claude-code` y aprobación de Francisco 2026-11-15.
- C3: [x] dominio puro; red solo en `src/assistant/`; centavos enteros; sin cambio de esquema; Mobile First + Desktop; sin `console.log` ni TODO.
- C4: [x] ESLint limpio; 278 pruebas en verde; persistencia con `AppDatabase.openInMemory()` real (CA2 contra `COUNT`/`SUM`); H11 no usa el modelo y H10 sigue con `FakeLlmClient`.
- C5: [x] sin secretos ni temporales. La entrada de `progress/history.md` y las horas de `progress/horas.csv` corresponden al cierre que hace el leader tras este APPROVED.
- C6: [x] tres archivos del spec; EARS cubre CA1 y CA2; T1..T21 `[x]`; R1..R28 con prueba `[H11-R<n>]`; `progress/traceability.md` actualizado (pasar el estado a `done` al cerrar).
- C7: [x] H11 no envía nada al modelo (R28); las garantías de H10/H12 siguen cubiertas por sus pruebas sin cambios.

## Observaciones (no bloquean)

1. `[H11-R25]`/`[H11-R26]` (`ExportHistoryPanel.test.jsx:104,116`) prueban 390 px y 1280 px, pero no los bordes 767/768 px ni el rango tablet (768–1023). El código es correcto porque usa `layout.isMobile` (`< 768`), pero un caso en 767 y 768 blindaría el umbral exacto de R25/R26.
2. El criterio de orden fecha/id está duplicado en `csvExporter.js:61-66` y `localStorageExpenseReader.js:18-23`. Es aceptable porque cada capa ordena por su cuenta, pero podría compartirse si el criterio cambia.
3. Al cerrar, el leader tiene que actualizar `progress/traceability.md` (estado «En revisión» → `done`), `feature_list.json`, `progress/history.md` y `progress/horas.csv`.

## Cambios requeridos

Ninguno.
