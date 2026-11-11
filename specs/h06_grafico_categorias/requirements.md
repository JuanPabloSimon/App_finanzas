# Requirements — h06_grafico_categorias

> Feature #6 (H6) de `feature_list.json`: Gráfico de distribución por categoría.
> «Como usuario quiero visualizar un gráfico de distribución de mis gastos por categoría en el mes, con su monto y su porcentaje sobre el total, para comprender rápidamente la composición de mis egresos.» Prioridad alta, 5 puntos, iteración 2, orden 6.
>
> Cada requisito está en EARS estricto y es verificable por al menos una prueba con la
> etiqueta `[H6-R<n>]`.

## Definiciones

- **Total mensual del listado (`totalExpensesCents`):** suma entera en centavos de todos los gastos registrados en el período `yearMonth` (`YYYY-MM`).
- **Distribución por categoría (`CategoryDistribution`):** estructura inmutable de dominio que agrupa los gastos del mes por categoría (`categoryId`, `categoryName`, `amountCents`, `expenseCount`, `expensePercentage`, `incomePercentage`, `colorHex`).
- **Porcentaje sobre el gasto total (`expensePercentage`):** proporción que representa el monto acumulado de una categoría respecto de `totalExpensesCents` (`0..100` con hasta un decimal), cuya suma entre todas las categorías activas del mes es exactamente `100 %`.

## R1
CUANDO existen gastos registrados en el período mensual activo (`YYYY-MM`), el sistema DEBE agruparlos por categoría sumando sus montos en centavos enteros (`amountCents`), de modo que la suma de los montos de todas las categorías del gráfico coincida exactamente con el total mensual del listado (`totalExpensesCents`).

## R2
CUANDO el total de gastos del mes es mayor que cero (`totalExpensesCents > 0`), el sistema DEBE calcular para cada categoría con gastos su porcentaje respecto del total de egresos (`expensePercentage` con un decimal) y compensar cualquier residuo de redondeo para que la suma de porcentajes de todas las categorías sea exactamente `100 %`.

## R3
MIENTRAS el período mensual activo tenga gastos registrados, el tablero DEBE renderizar el gráfico visual de distribución por categoría (anillo proporcional SVG y barra segmentada) junto con el desglose que muestra para cada categoría su nombre, cantidad de gastos, monto formateado en pesos argentinos (`$`) y porcentaje sobre el gasto total del mes (`%`).

## R4
SI el período mensual activo tiene un único gasto o todos sus gastos pertenecen a una sola categoría ENTONCES el gráfico de distribución DEBE representar esa categoría con el `100 %` del total y su monto exacto, renderizando el anillo completo de forma coherente y sin errores geométricos ni divisiones inválidas.

## R5
SI el período mensual activo no tiene gastos registrados (`totalExpensesCents === 0`) ENTONCES el tablero DEBE presentar un estado vacío coherente en la sección del gráfico sin errores numéricos (`NaN` o `Infinity`), informando que aún no hay egresos para graficar y permitiendo ir a la carga de gastos.

## R6
CUANDO el usuario cambia el período mensual (`YYYY-MM`) o registra, edita o elimina un gasto en el mes activo, el gráfico de distribución por categoría DEBE recalcularse y reflejar los nuevos montos y porcentajes de inmediato sin reiniciar la aplicación.

## R7
El sistema DEBE ordenar las categorías del gráfico de mayor a menor monto acumulado en centavos y, ante igualdad de monto, en orden alfabético ascendente por nombre de categoría (`localeCompare('es')`), asignando colores ejecutivos deterministas de la paleta corporativa.

## R8
El componente del gráfico de distribución por categoría DEBE aplicar diseño Mobile First (`< 768px`, disposición apilada vertical con cifras en `tabular-nums` y controles táctiles `≥ 44px`) y adaptarse a pantallas Tablet/Desktop (`≥ 768px`, disposición lado a lado entre gráfico anular SVG y tabla contable de categorías) siguiendo los lineamientos del skill `frontend-design`.

## Trazabilidad con los criterios de aceptación

| Criterio (feature_list.json) | Cubierto por |
|---|---|
| CA1. El gráfico muestra cada categoría del mes con su monto y su porcentaje, y la suma coincide con el total del listado. | R1, R2, R3, R6, R7, R8 |
| CA2. Con uno o ningún gasto, el tablero presenta un estado coherente y sin errores. | R4, R5, R8 |
