# Review — H8 h08_ranking_categorias

**Veredicto:** APPROVED

- **Revisor:** `reviewer` (claude-code), 2026-11-14.
- **Spec:** `specs/h08_ranking_categorias/` (aprobado por Francisco el 2026-11-14, registrado en `progress/current.md`).
- **Reporte del implementer:** `progress/impl_h08_ranking_categorias.md`.

## Trazabilidad requisitos ↔ pruebas

- R1: [x] `test/domain/services/categoryRanking.test.js:19` `[H8-R1]` — arma el desglose real con `calculateCategoryIncomeBreakdown` (1050 + 2575 = 3625 para Alimentos), excluye la categoría 3 (montos 0 y -500) y la 4 (sin gasto); además filtra `0`, `-10` y `10.5` directo en `buildCategoryRanking` y verifica `Number.isInteger`.
- R2: [x] `test/domain/services/categoryRanking.test.js:63` `[H8-R2]` — entrada desordenada da `[5000, 3000, 1001, 1000]`, más signo del comparador en ambos sentidos.
- R3: [x] `test/domain/services/categoryRanking.test.js:79` `[H8-R3]` — mayúsculas (`'alimentos'` antes de `'Bazar'`), acento (`'Óptica'` antes de `'Panadería'`) y `ñ` (`'Nafta'`, `'Ñoquis'`, `'Ocio'`) con monto empatado.
- R4: [x] `test/domain/services/categoryRanking.test.js:109` `[H8-R4]` — `'Café'` id 7 contra `'Cafe'` id 3 en los dos órdenes de entrada; siempre `[3, 7]`.
- R5: [x] `test/domain/services/categoryRanking.test.js:128` `[H8-R5]` — triple empate da posiciones 1..4 sin repetir; arreglo y entradas congelados; `[]` congelado, también con el parámetro por defecto.
- R6: [x] `test/features/dashboard/CategoryRankingList.test.jsx:29` `[H8-R6]` (seis filas en orden, posición, nombre, `$ 40.000` / `$ 5.000,50`, `40 %`) y `test/features/income/MonthlyOverviewScreen.test.jsx` `[H8-R6]` (integración con SQLite en memoria: pestaña `expenses`, seis categorías, gasto de octubre excluido, ranking debajo de `expense-form`).
- R7: [x] `test/features/dashboard/CategoryRankingList.test.jsx:49` `[H8-R7]` — exactamente 3 `<li>` y ninguna posición `4°`.
- R8: [x] `test/features/dashboard/CategoryRankingList.test.jsx:64` `[H8-R8]` — texto exacto de `category-ranking-empty`, sin filas, sin `<ol>`, sin `NaN` ni `Infinity`.
- R9: [x] `test/features/income/MonthlyOverviewScreen.test.jsx` `[H8-R9]` — `registerExpense`, `updateExpense`, `deleteExpense` y `goToPreviousMonth` sobre SQLite en memoria; verifica `getState().categoryRanking` y el HTML renderizado tras cada paso (inversión de orden 2,1 → 1,2; monto `$ 5.000`; borrado; mes vacío).
- R10: [x] `test/domain/services/categoryRanking.test.js:155` `[H8-R10]` — `calculateCategoryIncomeBreakdown` y `buildCategoryRanking` coinciden en orden (`[6, 5, 4, 3, 7]`) con empates y nombres equivalentes, y en porcentajes. `src/domain/models/monthlyIncome.js` usa `compareCategoryTotals` (diff: se reemplazó el comparador en línea).
- R11: [x] `test/features/income/MonthlyOverviewScreen.test.jsx` `[H8-R11]` — en `overview` hay `overview-viewport-box` y gráfico, no hay `category-ranking`, y `overviewViewportBox.overflowY === 'hidden'`.
- R12: [x] `test/features/dashboard/CategoryRankingList.test.jsx:80` `[H8-R12]` — 390 → `mobile` con `32px 1fr auto` y el porcentaje dentro de la columna del nombre; 800 → `tablet` y 1280 → `desktop` con `48px 1fr auto auto` y el porcentaje como columna propia antes del monto; `tabular-nums`, `overflowWrap: 'anywhere'`, `maxWidth` 100 % / 720 / 960.
- R13: [x] `test/domain/services/categoryRanking.test.js:191` `[H8-R13]` — lee el fuente y descarta `react`, `react-dom`, `node:sqlite`, `axios` y `fetch(`. El archivo (`src/domain/services/categoryRanking.js`) no tiene ningún import.

`progress/traceability.md`: [x] las filas de H8 (CA1 → R1, R2, R5–R9, R11–R13; CA2 → R3, R4, R10) reemplazan la fila "Pendiente" y coinciden con `requirements.md`.

## Tareas

- T1: [x] · T2: [x] · T3: [x] · T4: [x] (`test/domain/models/monthlyIncome.test.js` sin cambios en `git diff`, todo en verde) · T5: [x] · T6: [x] · T7: [x] · T8: [x] · T9: [x] (en el diff de `test/features/income/MonthlyOverviewScreen.test.jsx` solo hay líneas agregadas; las pruebas H5/H6/H13 pasan) · T10: [x] · T11: [x]

## Arquitectura, Mobile First + Desktop y privacidad

- [x] `src/domain/services/categoryRanking.js` es JS puro, sin imports. `monthlyIncome.js` solo suma un import del mismo dominio.
- [x] Sin red fuera de `src/assistant/`: `grep "fetch(|axios"` en `src/` fuera de `assistant` no encuentra nada.
- [x] Dinero en centavos enteros: `buildCategoryRanking` filtra con `Number.isInteger(entry.amountCents) && entry.amountCents > 0` (línea 19). El formato a pesos solo se aplica en la presentación (`formatCentsToArs`).
- [x] Sin migraciones ni cambios de esquema; `docs/data_model.md` sigue igual, como pide `design.md`.
- [x] Sin dependencias nuevas: `package.json` no cambió.
- [x] UI Mobile First con adaptación a Desktop: `CategoryRankingList.jsx` arma los estilos base para móvil y usa `getViewportLayout` para tablet y desktop (`data-ranking-layout`, grilla de 3 o 4 columnas, `containerMaxWidth`).
- [x] Sin regresión en el Resumen de H13: el ranking solo se renderiza en la rama `tab-panel-expenses` (`MonthlyOverviewScreen.jsx:1443`), la rama `overview` no se tocó y `[H8-R11]` y `[H13-*]` están en verde.
- [x] Sin regresión en H6: el único cambio de comportamiento es el desempate por `categoryId` cuando los nombres son equivalentes, lo pide R4/R10. `[H6-*]` en verde.
- [x] Privacidad: la feature no toca la IA ni datos personales nuevos; el ranking no sale del navegador.
- [x] Convenciones: identificadores en inglés y textos en español; no hay `console.log`, TODO, FIXME ni código comentado en los archivos nuevos o modificados.

### Observaciones (no bloquean)

1. **Desvío documentado:** se agregó la prop `onExpenseDeleted` en `src/features/expenses/ExpenseFormScreen.jsx` (líneas 1082 y 1282-1284), que no figura en `design.md`. El cambio es aditivo y opcional, y hace falta para cumplir R9 cuando se elimina un gasto desde la UI real. Sin DOM en el arnés, la prueba no cubre el click «Eliminar» → `onExpenseDeleted` → `reloadPeriod`, y R9 se verifica por la ruta del controlador. Conviene que un integrante lo pruebe a mano en `npm run dev`: registrar dos gastos, eliminar uno en Gastos y ver que el ranking se actualiza.
2. `CategoryRankingList.buildStyles` se expone como propiedad estática, igual que en `CategoryDistributionChart` y `MonthlyOverviewScreen`. Es coherente con el repo.

## Verificación

`./init.sh` sale con código **0**: arnés consistente (77 de 77 requisitos con prueba, 0 advertencias), `eslint` sin problemas, **95 de 95 pruebas** pasan (0 `not ok`).

## Checkpoints

- C1: [x] Están todos los archivos del arnés; `./init.sh` sale con 0.
- C2: [x] Una sola feature `in_progress` (H8); `current.md` describe la sesión activa y la herramienta `claude-code`, sin cambio de herramienta. Las features `done` pasan sus pruebas.
- C3: [x] Dominio puro, red solo en `assistant`, centavos enteros, sin cambios de esquema, Mobile First + Desktop, sin `console.log` ni TODO.
- C4: [x] Lint limpio; 95 pruebas en verde; la integración usa `AppDatabase.openInMemory()` real; no hay llamadas al modelo en esta feature.
- C5: [x] Sin temporales ni secretos en el diff; `history.md` y `horas.csv` existen y tienen registros (13.5 h). Al marcar `done`, el leader tiene que sumar la entrada de esta sesión.
- C6: [x] Spec completo, en EARS y cubriendo CA1/CA2; T1..T11 en `[x]`; R1..R13 con su etiqueta; `traceability.md` al día.
- C7: [x] No aplica a H8 (no toca la IA); los controles de consentimiento de H12 siguen en verde.

## Cambios requeridos

Ninguno.
