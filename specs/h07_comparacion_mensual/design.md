# Design — h07_comparacion_mensual

> Decisiones técnicas para H7 (Comparación mensual). Apoyado en `docs/architecture.md`,
> `docs/conventions.md` y `docs/data_model.md`. Reutiliza la consulta mensual de H3
> (`findByYearMonth`), el período activo y las pestañas de H13 y la ubicación del panel de
> H8. Respeta la vista sin scroll del Resumen de H13.

## Punto de partida (código existente)

- `ExpenseRepository.findByYearMonth(yearMonth)` (H3) está implementado en las **tres**
  variantes de repositorio de gastos: `SqliteExpenseRepository` (pruebas, `substr(e.date,
  1, 7) = ?`), el repositorio de `localStorage` de `src/App.jsx` (navegador) y el
  repositorio en memoria de `MonthlyOverviewScreen.jsx` (fallback). Es
  el único contrato de consulta por mes disponible en todas.
- `MonthlyOverviewScreen.jsx` mantiene el período activo en dos lugares: el controlador
  (`activeYearMonth`, `reloadMonthData`, `goToPreviousMonth`/`goToNextMonth`,
  `registerExpense`/`updateExpense`/`deleteExpense`, `getState()`) y el componente
  (`useState(activeYearMonth)`, `reloadPeriod`, `handlePrevMonth`/`handleNextMonth`,
  `useEffect` de carga). `activeYearMonth` nunca supera `currentYearMonth`.
- H8 agregó `CategoryRankingList` (`src/features/dashboard/`) al final de
  `tab-panel-expenses`, recalculado con `onExpenseSaved`/`onExpenseDeleted` →
  `reloadPeriod(activeYearMonth)`.
- H13 exige que `overview-viewport-box` no tenga scroll vertical: el panel de H7 **no** va
  en el Resumen (R13).

Decisiones:

1. **Mes actual = mes seleccionado (`activeYearMonth`).** Es coherente con el listado (H3),
   el gráfico (H6) y el ranking (H8), que ya trabajan sobre el período activo; al abrir la
   app coincide con el mes calendario.
2. **Ventana de 5 meses anteriores; los vacíos intermedios cuentan como `0`; los vacíos
   anteriores al primer mes con datos se omiten.** Un mes en `0` entre meses con gasto es
   un dato real («no gasté»); los meses previos a que el usuario empezara a cargar gastos
   no son meses «existentes» para comparar (CA2: «hasta cinco»). Así un usuario nuevo ve
   solo los meses que realmente usó.
3. **Variación en décimas de punto porcentual, entera, con `BigInt`.** Evita flotantes
   acumulados y deja un valor que H10 convierte directo a `variacion_pct` con un decimal.
4. **Sin SQL nuevo ni migración.** Los totales de los 5 meses previos se obtienen con 5
   llamadas a `findByYearMonth` en paralelo (ver alternativa descartada B).

## Archivos

| Capa | Archivo | Cambio |
|---|---|---|
| core | `src/core/formatters.js` | **Modificado.** Agrega `formatVariationTenths(variationTenths)` (formato `"+12,5 %"`). Mismo módulo que `formatCentsToArs`: el formateo vive fuera del dominio. |
| domain | `src/domain/services/monthlyComparison.js` | **Nuevo.** `calculateVariationTenths`, `buildMonthlyComparison` y la constante `COMPARISON_WINDOW_MONTHS = 5` (JS puro). Importa solo `src/core/dates.js` (`shiftYearMonth`, `isValidYearMonth`) y `src/core/errors.js` (`InvalidAmount`, `InvalidExpenseDate`). |
| presentation | `src/features/dashboard/monthlyTotalsLoader.js` | **Nuevo.** `loadPreviousMonthlyTotals(expenseRepository, activeYearMonth)`: llama a `findByYearMonth` para los 5 meses de la ventana en paralelo y suma `amountCents` por mes. Sin lógica de negocio: solo orquesta el contrato del repositorio. |
| presentation | `src/features/dashboard/MonthlyComparisonPanel.jsx` | **Nuevo.** Componente del panel (Mobile First + Desktop). |
| presentation | `src/features/income/MonthlyOverviewScreen.jsx` | **Modificado.** Controlador: `this.previousMonthlyTotals` cargado en `reloadMonthData` (y por lo tanto en `initialize`, cambio de período y alta/edición/baja de gastos); `getState()` expone `monthlyComparison`. Componente: estado `previousMonthlyTotals` cargado en `reloadPeriod` y en el `useEffect` de carga; renderiza `MonthlyComparisonPanel` dentro de `tab-panel-expenses`, **después** de `CategoryRankingList`. No toca la rama `activeTab === 'overview'`. |
| test | `test/domain/services/monthlyComparison.test.js` | **Nuevo.** `[H7-R1]`..`[H7-R7]`, `[H7-R15]`..`[H7-R17]`. |
| test | `test/core/formatters.test.js` | **Nuevo** (no existe aún). `[H7-R9]` sobre `formatVariationTenths`. |
| test | `test/features/dashboard/MonthlyComparisonPanel.test.jsx` | **Nuevo.** `[H7-R8]`..`[H7-R11]`, `[H7-R14]`. |
| test | `test/features/income/MonthlyOverviewScreen.test.jsx` | **Modificado.** Integración `[H7-R1]`, `[H7-R8]`, `[H7-R12]`, `[H7-R13]` con SQLite en memoria. Las pruebas existentes de H5, H6, H8 y H13 siguen en verde sin cambios. |

`src/data/` **no cambia**: ni el contrato `ExpenseRepository` ni sus implementaciones.

## Firmas nuevas

```javascript
// src/domain/services/monthlyComparison.js

export const COMPARISON_WINDOW_MONTHS = 5;

/**
 * Variación porcentual en décimas de punto, entera.
 * round_half_away_from_zero(1000 * (currentCents - previousCents) / previousCents)
 * con BigInt: sea num = 1000n * (cur - prev), den = prev;
 * q = (2n * |num| + den) / (2n * den)   // división entera de BigInt (trunca)
 * resultado = Number(sign(num) * q).
 * @param {number} currentCents  entero seguro >= 0
 * @param {number} previousCents entero seguro >= 0
 * @returns {number|null} entero; null si previousCents === 0
 * @throws {InvalidAmount} si algún argumento no es entero seguro >= 0
 */
export function calculateVariationTenths(currentCents, previousCents) {}

/**
 * @param {{
 *   activeYearMonth: string,                       // 'YYYY-MM' seleccionado
 *   currentTotalCents: number,                     // entero seguro >= 0
 *   previousMonthlyTotals: ReadonlyArray<{ yearMonth: string, totalCents: number }>
 * }} input
 *   previousMonthlyTotals puede venir incompleto o desordenado: los meses de la ventana
 *   ausentes valen 0 y los meses fuera de la ventana se ignoran.
 * @returns {Readonly<{
 *   activeYearMonth: string,
 *   currentTotalCents: number,
 *   previousMonths: ReadonlyArray<Readonly<{ yearMonth: string, totalCents: number }>>,
 *   previousTotalCents: number|null,   // total de shiftYearMonth(activeYearMonth, -1)
 *   variationTenths: number|null,
 *   hasPreviousData: boolean
 * }>} objeto y arreglos congelados (Object.freeze)
 * @throws {InvalidExpenseDate} si activeYearMonth no es 'YYYY-MM' válido
 * @throws {InvalidAmount} si algún total no es entero seguro >= 0
 */
export function buildMonthlyComparison({
  activeYearMonth,
  currentTotalCents,
  previousMonthlyTotals = [],
} = {}) {}
```

Algoritmo de `buildMonthlyComparison`:

1. Valida `activeYearMonth` y los totales (R16).
2. Arma la ventana `[-1, -2, -3, -4, -5]` con `shiftYearMonth` y un `Map` `yearMonth →
   totalCents` (ausentes = `0`).
3. Busca el índice del mes más antiguo con `totalCents > 0`. Si no hay ninguno → R7.
4. `previousMonths` = ventana desde `-1` hasta ese índice (R2, R3, R4).
5. `previousTotalCents` = total de `-1` (puede ser `0`);
   `variationTenths = calculateVariationTenths(currentTotalCents, previousTotalCents)` (R5,
   R6).

Ejemplos de referencia para las pruebas de R5:

| current | previous | variationTenths |
|---|---|---|
| 412500 | 389000 | `60` (6,04 %) |
| 2001 | 2000 | `1` (0,05 % → empate hacia arriba) |
| 1999 | 2000 | `-1` (-0,05 % → empate hacia abajo) |
| 0 | 5000 | `-1000` |
| 15000 | 10000 | `500` |
| 10000 | 10000 | `0` |
| 1 | 3 | `-667` (-66,666… %) |

```javascript
// src/core/formatters.js
/**
 * 125 → "+12,5 %", -60 → "-6,0 %", 0 → "0,0 %", 5 → "+0,5 %".
 * Opera con enteros: parte entera = trunc(|v| / 10), decimal = |v| % 10.
 * @param {number} variationTenths entero
 * @returns {string}
 * @throws {InvalidAmount} si no es entero
 */
export function formatVariationTenths(variationTenths) {}
```

```javascript
// src/features/dashboard/monthlyTotalsLoader.js
/**
 * @param {{ findByYearMonth(ym: string): Promise<Array<{ amountCents: number }>> }} expenseRepository
 * @param {string} activeYearMonth
 * @returns {Promise<Array<{ yearMonth: string, totalCents: number }>>} los 5 meses previos
 */
export async function loadPreviousMonthlyTotals(expenseRepository, activeYearMonth) {}
```

```javascript
// src/features/dashboard/MonthlyComparisonPanel.jsx
/**
 * @param {{ comparison: MonthlyComparison, viewportWidth?: number }} props
 */
export function MonthlyComparisonPanel({ comparison, viewportWidth = 390 } = {}) {}
```

`data-testid` del componente:

| Elemento | `data-testid` |
|---|---|
| Sección contenedora (con `data-comparison-layout`) | `monthly-comparison` |
| Total del mes actual | `monthly-comparison-current` |
| Variación (con `data-variation-trend="up" \| "down" \| "flat"`) | `monthly-comparison-variation` |
| Aviso de variación no calculable (R10) | `monthly-comparison-no-base` |
| Lista de meses anteriores `<ol>` | `monthly-comparison-list` |
| Fila de un mes | `monthly-comparison-row-<yearMonth>` |
| Estado vacío (R11) | `monthly-comparison-empty` |

Textos visibles: título «Comparación con meses anteriores»; rótulo del mes actual con
`formatYearMonthLabel(activeYearMonth)`; rótulo de la variación «Variación respecto del mes
anterior»; R10 «El mes anterior no tiene gastos: no se puede calcular la variación.»; R11
«No hay datos de meses anteriores para comparar.» La tendencia se comunica con el signo del
texto (no solo con color) por accesibilidad.

## Diseño Mobile First y adaptación Desktop

- Estilos base para móvil; el modo se decide con `getViewportLayout(viewportWidth)` de
  `src/core/responsive.js` (igual que H6, H8 y H13) y se expone en
  `data-comparison-layout` (`mobile` | `tablet` | `desktop`).
- **Mobile (`< 768px`):** tarjeta a ancho completo con la paleta `CORPORATE_THEME` y el
  mismo estilo de tarjeta que `CategoryRankingList`. Arriba, bloque del mes actual (rótulo,
  total grande, variación debajo); abajo, la lista de meses anteriores, cada fila en grilla
  `1fr auto` (mes, total alineado a la derecha). Sin anchos fijos en píxeles; rótulos con
  `overflowWrap: 'anywhere'`.
- **Tablet/Desktop (`≥ 768px`):** misma tarjeta con `maxWidth: containerMaxWidth`, cuerpo
  en grilla de dos columnas (`minmax(0, 1fr) minmax(0, 1fr)`): bloque del mes actual a la
  izquierda y lista de meses a la derecha.
- Cifras con `fontVariantNumeric: CORPORATE_THEME.tabularNums`. Panel informativo, sin
  controles interactivos.
- Ubicación: dentro de `tab-panel-expenses`, debajo de `CategoryRankingList` (y por lo
  tanto del formulario), para no desplazar la carga (K1 ≤ 15 s). No se agrega al Resumen
  (R13, H13-R1/R2).

## Datos (SQLite)

- Migración: **ninguna**. `docs/data_model.md` no cambia.
- Lecturas: 1 consulta del mes activo (ya existente) + 5 consultas `findByYearMonth` de los
  meses previos, en paralelo con `Promise.all`, cada vez que se recarga el período. Usa el
  índice `idx_expenses_date` solo parcialmente (el filtro es `substr`), aceptable para el
  volumen de una persona.

## Errores

- Excepciones reutilizadas: `InvalidAmount` (totales no enteros o negativos, R16;
  `formatVariationTenths` con no enteros) e `InvalidExpenseDate` (de `shiftYearMonth` ante
  `activeYearMonth` inválido). Nunca deberían llegar a la UI con datos válidos de los
  repositorios; si llegaran, la pantalla no las captura de forma especial (mismo criterio
  que H6/H8).
- Excepciones nuevas: ninguna.

## Privacidad

- No toca datos personales nuevos ni la IA. Los totales mensuales quedan en el navegador.
- H10 podrá reutilizar `calculateVariationTenths` para `variacion_pct` (dividiendo por
  `10`) dentro de `SpendingSummaryBuilder`, que sigue siendo el único que define qué viaja
  a la API. H7 no envía nada.

## Dependencias

- Ninguna nueva en `package.json`. `BigInt` es nativo de JavaScript (ES2020).

## Alternativa descartada

**Alternativa A — mostrar la comparación en el Resumen.** Es el lugar natural para «mes
actual vs. anterior», pero agrega alto a `overview-viewport-box` y rompe la vista sin
scroll exigida por H13-R1. Se descarta, igual que se hizo con el ranking de H8.

**Alternativa B — nuevo método de repositorio con SQL agregado
(`SELECT substr(date,1,7), SUM(amount_cents) ... GROUP BY 1`).** Sería una sola consulta,
pero obliga a cambiar el contrato `ExpenseRepository` y a implementarlo en tres lugares
(SQLite, `localStorage` de `App.jsx` y el repositorio en memoria de la pantalla), con riesgo de que
las variantes difieran. Cinco llamadas a `findByYearMonth` (H3, ya probado en todas) dan el
mismo resultado sin tocar la capa data. Se descarta por alcance; si el volumen creciera, se
puede agregar después sin cambiar el dominio (que recibe totales, no gastos).

**Alternativa C — variación con `Number` y `Math.round(((cur - prev) / prev) * 1000)`.**
Más corta, pero `Math.round` redondea los empates negativos hacia `+∞` (`-0,5 → 0`) y la
división en coma flotante puede caer a un lado u otro del empate. Se descarta a favor de
`BigInt` con redondeo explícito.

**Alternativa D — mostrar siempre 5 meses anteriores con `0` aunque el usuario no tuviera
gastos.** Un usuario nuevo vería «-100 %» o ceros que no son datos reales, y CA2 nunca se
cumpliría salvo con la ventana entera vacía. Se descarta a favor de recortar la serie en el
primer mes con datos (R4).

## Riesgos y casos borde

- **Mes actual sin gastos y mes anterior con gastos:** `currentTotalCents = 0`, variación
  `-1000` (`"-100,0 %"`).
- **Mes anterior en `0` pero meses más viejos con datos:** se listan los meses (R3) y la
  variación muestra el aviso de R10.
- **Solo el mes `-5` tiene datos:** `previousMonths` tiene 5 filas, las 4 más recientes en
  `0`; variación según R10.
- **Usuario navega a un mes anterior al primer gasto:** sin meses previos con datos → R11.
- **Cambio de año:** `shiftYearMonth` resuelve `2026-02 → 2025-09`; se prueba.
- **Edición que mueve un gasto a otro mes de la ventana:** `reloadMonthData` /
  `reloadPeriod` recargan los 6 meses (R12).
- **Totales muy grandes:** `BigInt` evita pérdida de precisión en `1000 × diff`; el
  resultado vuelve a `Number` (cabe holgado en entero seguro).
- **Variación enorme (p. ej. de `$ 1` a `$ 100.000`):** se muestra tal cual
  (`"+9999900,0 %"`), sin tope; es un valor correcto.
- **Concurrencia en el componente:** `reloadPeriod` y el `useEffect` cargan los totales
  previos junto con los datos del período en el mismo `Promise.all`, para no mostrar una
  comparación de otro mes.
