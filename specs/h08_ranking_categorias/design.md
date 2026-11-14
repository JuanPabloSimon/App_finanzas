# Design — h08_ranking_categorias

> Decisiones técnicas para H8 (Ranking de categorías). Apoyado en `docs/architecture.md`,
> `docs/conventions.md` y `docs/data_model.md`. Reutiliza el cálculo por categoría de H6
> (`calculateCategoryIncomeBreakdown`) y respeta la vista sin scroll del Resumen de H13.

## Punto de partida (código existente)

- `src/domain/models/monthlyIncome.js` → `calculateCategoryIncomeBreakdown(expenses,
  categories, monthlyIncome)` ya agrupa los gastos del mes por categoría en centavos
  enteros, descarta montos no positivos, calcula `expensePercentage` (suma exacta `100`) y
  ordena con un comparador **en línea**: monto descendente y, ante empate,
  `localeCompare(..., 'es', { sensitivity: 'base' })`. Ese comparador no define qué pasa
  cuando `localeCompare` devuelve `0` (nombres que solo difieren en acentos, p. ej.
  `'Café'` y `'Cafe'`, que la columna `categories.name ... COLLATE NOCASE` admite como
  distintos): hoy el orden depende del orden de inserción en el `Map`.
- `src/features/income/MonthlyOverviewScreen.jsx` → calcula `categoryBreakdown` en el
  render de la pantalla y en `getState()` del controlador. Lo usa el gráfico compacto del
  Resumen (`CategoryDistributionChart`, `compact: true`) y la lista de absorción de la
  pestaña Ingresos.
- H13 exige que la pestaña Resumen sea exclusivamente informativa y sin scroll vertical
  (`overview-viewport-box`, `overflowY: 'hidden'`). Por eso el ranking **no** se agrega al
  Resumen (R11).

Decisión: el ranking **no recalcula totales**. Se construye a partir del
`categoryBreakdown` de H6 (misma fuente de montos y porcentajes) y el comparador se
extrae a una función de dominio única que usan ambos (R10). Así no se duplica la lógica de
agregación ni de redondeo de porcentajes.

## Archivos

| Capa | Archivo | Cambio |
|---|---|---|
| domain | `src/domain/services/categoryRanking.js` | **Nuevo.** `compareCategoryTotals` y `buildCategoryRanking` (JS puro). Crea la carpeta `src/domain/services/` prevista en `docs/architecture.md`. |
| domain | `src/domain/models/monthlyIncome.js` | **Modificado.** `calculateCategoryIncomeBreakdown` reemplaza su comparador en línea por `compareCategoryTotals` importado del servicio. Sin cambios de contrato. |
| presentation | `src/features/dashboard/CategoryRankingList.jsx` | **Nuevo.** Componente del panel del ranking (Mobile First + Desktop). Ubicado en `features/dashboard/` según `docs/architecture.md` (H6, H7, H8). |
| presentation | `src/features/income/MonthlyOverviewScreen.jsx` | **Modificado.** Calcula `categoryRanking = buildCategoryRanking(categoryBreakdown)` en el render y en `getState()`; renderiza `CategoryRankingList` dentro de `tab-panel-expenses`, **después** de `ExpenseFormScreen`. No toca la rama `activeTab === 'overview'`. |
| test | `test/domain/services/categoryRanking.test.js` | **Nuevo.** Pruebas unitarias `[H8-R1]`..`[H8-R5]`, `[H8-R10]`, `[H8-R13]`. |
| test | `test/features/dashboard/CategoryRankingList.test.jsx` | **Nuevo.** Pruebas de componente `[H8-R6]`, `[H8-R7]`, `[H8-R8]`, `[H8-R12]`. |
| test | `test/features/income/MonthlyOverviewScreen.test.jsx` | **Modificado.** Pruebas de integración `[H8-R6]`, `[H8-R9]`, `[H8-R11]` con base SQLite en memoria. Las pruebas existentes de H6 y H13 deben seguir en verde sin cambios. |

## Firmas nuevas

```javascript
// src/domain/services/categoryRanking.js

/**
 * Comparador único del ranking y del gráfico de H6.
 * 1) amountCents descendente;
 * 2) categoryName ascendente con localeCompare('es', { sensitivity: 'base' });
 * 3) categoryId ascendente si (2) devuelve 0.
 * @param {{ categoryId: number, categoryName: string, amountCents: number }} a
 * @param {{ categoryId: number, categoryName: string, amountCents: number }} b
 * @returns {number}
 */
export function compareCategoryTotals(a, b) {}

/**
 * Construye el ranking del mes a partir del desglose de H6.
 * Filtra entradas con amountCents no entero o <= 0, ordena con compareCategoryTotals
 * (no confía en el orden de entrada) y asigna position 1..n.
 * @param {ReadonlyArray<{ categoryId: number, categoryName: string, amountCents: number,
 *   expensePercentage: number }>} categoryBreakdown
 * @returns {ReadonlyArray<Readonly<{ position: number, categoryId: number,
 *   categoryName: string, amountCents: number, expensePercentage: number }>>}
 *   Arreglo congelado (Object.freeze) de entradas congeladas; [] si no hay gastos.
 */
export function buildCategoryRanking(categoryBreakdown = []) {}
```

```javascript
// src/features/dashboard/CategoryRankingList.jsx
/**
 * @param {{ ranking: ReadonlyArray<CategoryRankingEntry>, viewportWidth?: number }} props
 */
export function CategoryRankingList({ ranking = [], viewportWidth = 390 } = {}) {}
```

`data-testid` del componente:

| Elemento | `data-testid` |
|---|---|
| Sección contenedora (con `data-ranking-layout`) | `category-ranking` |
| Lista ordenada `<ol>` | `category-ranking-list` |
| Fila | `category-ranking-row-<categoryId>` |
| Posición | `category-ranking-position-<categoryId>` |
| Monto | `category-ranking-amount-<categoryId>` |
| Porcentaje | `category-ranking-pct-<categoryId>` |
| Estado vacío | `category-ranking-empty` |

Textos visibles (español rioplatense): título «Ranking de categorías del mes»; posición
como `1°`, `2°`, …; porcentaje con el valor `expensePercentage` y el mismo formato que usa `CategoryDistributionChart` (`${expensePercentage} %`);
estado vacío «Todavía no hay gastos en este mes para armar el ranking.»

## Diseño Mobile First y adaptación Desktop

- Estilos base para móvil; el modo se decide con `getViewportLayout(viewportWidth)` de
  `src/core/responsive.js` (mismo helper que H6 y H13), expuesto en
  `data-ranking-layout` (`mobile` | `tablet` | `desktop`).
- **Mobile (`< 768px`):** tarjeta a ancho completo con la paleta `CORPORATE_THEME`. Cada
  fila es una grilla de tres columnas `32px 1fr auto`: posición, nombre (con el porcentaje
  en una segunda línea más chica) y monto alineado a la derecha. Sin anchos fijos en
  píxeles para el contenedor; nombres largos con `overflowWrap: 'anywhere'`.
- **Tablet/Desktop (`≥ 768px`):** misma tarjeta con `maxWidth` del layout
  (`containerMaxWidth`), filas en grilla de cuatro columnas `48px 1fr auto auto`:
  posición, categoría, porcentaje y monto.
- Cifras con `fontVariantNumeric: CORPORATE_THEME.tabularNums`. El ranking es
  informativo, sin controles interactivos, por lo que no agrega objetivos táctiles.
- Ubicación: dentro de `tab-panel-expenses`, debajo de `ExpenseFormScreen` (formulario y
  listado del mes), para no desplazar el formulario de carga (K1 ≤ 15 s). No se agrega al
  Resumen (R11, H13-R1/R2).

## Datos (SQLite)

- Migración: **ninguna**. El ranking se deriva en memoria de los gastos del período que ya
  carga `reloadMonthData`. `docs/data_model.md` no cambia.

## Errores

- Excepciones reutilizadas: ninguna. Entradas con `amountCents` no entero o `<= 0` se
  filtran (mismo criterio que `calculateCategoryIncomeBreakdown`), no lanzan.
- Excepciones nuevas: ninguna.

## Privacidad

- No toca datos personales nuevos ni la IA. El ranking queda en el navegador; no se envía
  a la API del modelo (H10 define su propio resumen agregado).

## Dependencias

- Ninguna nueva en `package.json`.

## Alternativa descartada

**Alternativa A — mostrar el ranking en el Resumen (debajo del gráfico compacto).** Es el
lugar más visible para K2, pero agrega alto a `overview-viewport-box` y rompe la vista sin
scroll exigida por H13-R1. Se descarta; además el gráfico compacto del Resumen ya presenta
las categorías en el mismo orden (R10).

**Alternativa B — calcular el ranking con una agregación propia (o una consulta SQL
`GROUP BY ... ORDER BY`).** Duplicaría la suma por categoría y el redondeo de porcentajes
de H6, y el `ORDER BY name COLLATE NOCASE` de SQLite no ordena según el locale `es`
(acentos, `ñ`). Se descarta a favor de derivar del `categoryBreakdown` con un comparador
JS único.

**Alternativa C — truncar a las cinco primeras con un botón «Ver todas».** CA1 pide «al
menos las cinco primeras»; listar todas lo cumple sin agregar estado de UI ni un control
extra. Se descarta por simplicidad.

## Riesgos y casos borde

- **Cambio de orden en H6:** el desempate por `categoryId` (R4) puede alterar el orden
  del gráfico solo cuando dos nombres son equivalentes para `localeCompare` con
  `sensitivity: 'base'`. La prueba `[H6-R7]` existente usa nombres distintos y debe seguir
  en verde.
- **Gastos con `categoryName` desnormalizado:** el nombre sale del gasto o del catálogo,
  igual que en H6; el ranking no lo vuelve a resolver.
- **Muchas categorías:** la lista crece en la pestaña Gastos (que sí tiene scroll); no
  afecta al Resumen.
- **Empates múltiples:** tres o más categorías con el mismo monto quedan en orden
  alfabético entre sí y con posiciones consecutivas distintas (R5).
- **0 gastos / 1–4 categorías:** estado vacío sin cálculos (R8) y lista corta sin relleno
  (R7).
- **Entorno de `localeCompare`:** Node (pruebas) y los navegadores modernos incluyen ICU
  completo; las pruebas usan casos con `ñ` y acentos para detectar un entorno sin ICU.
