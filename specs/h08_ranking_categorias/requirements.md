# Requirements — h08_ranking_categorias

> Feature #8 (H8) de `feature_list.json`: Ranking de categorías.
> «Como usuario quiero ver mis categorías de gasto del mes ordenadas de mayor a menor monto
> para identificar rápidamente en qué se va la mayor parte de mi dinero.» Épica
> Visualización, prioridad media, 2 puntos, iteración 2, orden 9.
>
> Cada requisito está en EARS estricto y es verificable por al menos una prueba con la
> etiqueta `[H8-R<n>]`.

## Definiciones

- **Período activo:** el mes `YYYY-MM` seleccionado en el selector de período del panel
  (`activeYearMonth`).
- **Categoría con gasto en el mes:** categoría que tiene al menos un gasto registrado en el
  período activo con `amountCents` entero mayor que cero.
- **Monto de la categoría (`amountCents`):** suma entera en centavos de los gastos de esa
  categoría en el período activo (el mismo valor que calcula
  `calculateCategoryIncomeBreakdown` de H6).
- **Comparador del ranking (`compareCategoryTotals`):** función pura de dominio que ordena
  dos entradas `{ categoryId, categoryName, amountCents }` según R2, R3 y R4.
- **Comparación alfabética:** `a.categoryName.localeCompare(b.categoryName, 'es',
  { sensitivity: 'base' })`. No distingue mayúsculas de minúsculas ni letras con y sin
  acento (`'café'` equivale a `'Cafe'`), y ordena la `ñ` después de la `n` según el locale
  `es`.
- **Ranking de categorías (`CategoryRankingEntry`):** objeto inmutable
  `{ position, categoryId, categoryName, amountCents, expensePercentage }`, donde
  `expensePercentage` es el porcentaje sobre el total del mes ya calculado por H6 (un
  decimal; la suma de todas las entradas es exactamente `100`).
- **Panel del ranking (`category-ranking`):** sección visual de la pestaña Gastos
  (`tab-panel-expenses`) que muestra el ranking del período activo.

## R1
CUANDO se construye el ranking del período activo, el sistema DEBE incluir exactamente una
entrada por cada categoría con gasto en el mes, con `amountCents` igual a la suma entera en
centavos de sus gastos, y excluir toda categoría sin gastos en ese período.

## R2
El sistema DEBE ordenar las entradas del ranking de mayor a menor `amountCents`.

## R3
CUANDO dos o más categorías del ranking tienen el mismo `amountCents`, el sistema DEBE
ordenarlas alfabéticamente en forma ascendente por `categoryName` usando
`localeCompare` con locale `'es'` y `{ sensitivity: 'base' }` (sin distinguir mayúsculas
ni acentos).

## R4
SI dos categorías del ranking tienen el mismo `amountCents` y su comparación alfabética
devuelve `0` (por ejemplo `'Café'` y `'Cafe'`) ENTONCES el sistema DEBE ordenarlas por
`categoryId` ascendente.

## R5
CUANDO se construye el ranking, el sistema DEBE asignar a cada entrada una posición
(`position`) entera consecutiva desde `1` hasta la cantidad de entradas, siguiendo el
orden de R2, R3 y R4, sin posiciones compartidas ante empates de monto.

## R6
MIENTRAS la pestaña activa sea Gastos (`activeTab === 'expenses'`) y el período activo
tenga al menos un gasto, el sistema DEBE mostrar en el panel del ranking todas las
entradas del ranking, sin truncar, cada una con su posición, nombre de categoría, monto
formateado en pesos (`formatCentsToArs`) y porcentaje sobre el total del mes.

## R7
SI el período activo tiene entre 1 y 4 categorías con gasto ENTONCES el panel del ranking
DEBE mostrar únicamente esas categorías, sin filas vacías, de relleno ni posiciones sin
categoría.

## R8
SI el período activo no tiene gastos ENTONCES el panel del ranking DEBE mostrar el estado
vacío (`category-ranking-empty`) con el texto «Todavía no hay gastos en este mes para armar
el ranking.» sin filas de ranking ni valores `NaN` o `Infinity`.

## R9
CUANDO el usuario cambia el período activo o registra, edita o elimina un gasto del período
activo, el sistema DEBE recalcular el ranking y reflejar el nuevo orden y los nuevos montos
sin reiniciar la aplicación.

## R10
CUANDO el gráfico de distribución por categoría de H6 (`calculateCategoryIncomeBreakdown`)
ordena sus categorías, el sistema DEBE usar el mismo comparador del ranking
(`compareCategoryTotals`), de modo que ambos presenten las categorías en el mismo orden
para el mismo período.

## R11
MIENTRAS la pestaña activa sea Resumen (`activeTab === 'overview'`), el sistema NO DEBE
renderizar el panel del ranking (`category-ranking`), preservando la vista sin scroll
vertical de H13.

## R12
El panel del ranking DEBE aplicar diseño Mobile First en pantallas menores a `768px`
(`data-ranking-layout="mobile"`, filas apiladas a ancho completo con el porcentaje debajo
del nombre) y adaptarse en pantallas de `768px` o más (`data-ranking-layout="tablet"` o
`"desktop"`, filas en grilla de cuatro columnas: posición, categoría, porcentaje y monto),
con cifras en `tabular-nums`.

## R13
El módulo de dominio del ranking (`src/domain/services/categoryRanking.js`) NO DEBE
importar `react`, `react-dom`, `node:sqlite` ni clientes HTTP (`fetch`, `axios`).

## Trazabilidad con los criterios de aceptación

| Criterio (feature_list.json) | Cubierto por |
|---|---|
| CA1. Las categorías del mes se listan ordenadas de mayor a menor monto, con al menos las cinco primeras. | R1, R2, R5, R6, R7, R8, R9, R11, R12, R13 |
| CA2. Ante montos iguales, el orden es alfabético. | R3, R4, R10 |

## Fuera de alcance de esta feature

- Comparación con el mes anterior o evolución mensual (H7).
- Ranking por subcategoría, por nota o por rango de fechas distinto del mes.
- Interacción sobre las filas del ranking (filtrar el listado al tocar una categoría).
- Cambios de esquema SQLite o persistencia del ranking: se calcula en memoria.
- Envío del ranking al modelo de lenguaje (H10).
