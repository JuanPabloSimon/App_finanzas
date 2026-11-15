# Requirements — h07_comparacion_mensual

> Feature #7 (H7) de `feature_list.json`: Comparar el mes actual con los anteriores.
> «Como usuario quiero comparar el total gastado en el mes con los meses anteriores para
> saber si estoy gastando más o menos que antes.» Épica Visualización, prioridad media,
> 5 puntos, iteración 2, orden 10.
>
> Cada requisito está en EARS estricto y es verificable por al menos una prueba con la
> etiqueta `[H7-R<n>]`.

## Definiciones

- **Mes actual de la comparación (`activeYearMonth`):** el mes `YYYY-MM` **seleccionado**
  en el selector de período del panel (el mismo período activo que usan H3, H6 y H8), no
  el mes calendario. Al abrir la app coincide con el mes calendario
  (`currentYearMonth`); si el usuario retrocede con `<`, la comparación se arma desde el
  mes seleccionado.
- **Total de un mes (`totalCents`):** suma entera en centavos (`Number.isInteger`) de los
  `amountCents` de todos los gastos cuya fecha cae en ese mes. Un mes sin gastos tiene
  total `0`.
- **Ventana de comparación:** los cinco meses calendario consecutivos inmediatamente
  anteriores al mes actual de la comparación, calculados con `shiftYearMonth(activeYearMonth,
  -1)` hasta `shiftYearMonth(activeYearMonth, -5)`.
- **Mes previo con datos:** mes de la ventana de comparación con al menos un gasto
  (`totalCents > 0`).
- **Mes de inicio de la serie:** el mes previo con datos más antiguo de la ventana.
- **Meses anteriores mostrados (`previousMonths`):** los meses de la ventana desde el mes
  inmediatamente anterior al mes actual hasta el mes de inicio de la serie, ambos
  incluidos.
- **Variación en décimas de punto porcentual (`variationTenths`):** número entero que
  representa la variación porcentual con un decimal; `125` equivale a `+12,5 %` y `-60` a
  `-6,0 %`. Es el valor que H10 convierte a `variacion_pct` (`variationTenths / 10`) del
  resumen agregado de `docs/llm_assistant.md`.
- **Comparación mensual (`MonthlyComparison`):** objeto inmutable
  `{ activeYearMonth, currentTotalCents, previousMonths, previousTotalCents,
  variationTenths, hasPreviousData }`.
- **Panel de comparación (`monthly-comparison`):** sección visual de la pestaña Gastos
  (`tab-panel-expenses`) que muestra la comparación mensual.

## R1
CUANDO se construye la comparación mensual, el sistema DEBE tomar como mes actual el mes
seleccionado en el selector de período (`activeYearMonth`) y asignar a
`currentTotalCents` la suma entera en centavos de sus gastos, igual al
`totalExpensesCents` del mismo período.

## R2
CUANDO se construye la comparación mensual, el sistema DEBE incluir en `previousMonths` solo
meses de la ventana de comparación (como máximo cinco, todos anteriores al mes actual),
ordenados del más reciente al más antiguo, cada uno con su `yearMonth` y su `totalCents`.

## R3
MIENTRAS exista al menos un mes previo con datos, el sistema DEBE incluir en
`previousMonths` con `totalCents` igual a `0` cada mes sin gastos ubicado entre el mes
actual y el mes de inicio de la serie.

## R4
MIENTRAS exista al menos un mes previo con datos, el sistema NO DEBE incluir en
`previousMonths` los meses de la ventana más antiguos que el mes de inicio de la serie.

## R5
CUANDO el total del mes inmediatamente anterior (`previousTotalCents`) es mayor que `0`, el
sistema DEBE calcular `variationTenths` como el entero más cercano a
`1000 × (currentTotalCents − previousTotalCents) / previousTotalCents`, redondeando los
empates de medio punto hacia el lado opuesto al cero (por ejemplo `0,5 → 1` y
`-0,5 → -1`), usando solo aritmética entera (`BigInt`) sin operaciones en coma flotante.

## R6
SI el mes inmediatamente anterior tiene `previousTotalCents` igual a `0` ENTONCES el
sistema DEBE asignar `variationTenths = null`, sin producir `NaN`, `Infinity` ni
`-Infinity`.

## R7
SI ningún mes de la ventana de comparación tiene gastos ENTONCES el sistema DEBE devolver
`hasPreviousData = false`, `previousMonths` vacío, `previousTotalCents = null` y
`variationTenths = null`.

## R8
MIENTRAS la pestaña activa sea Gastos (`activeTab === 'expenses'`) y la comparación tenga
`hasPreviousData = true`, el sistema DEBE mostrar en el panel de comparación el total del
mes actual, una fila por cada mes de `previousMonths` con su etiqueta
(`formatYearMonthLabel`) y su total (`formatCentsToArs`), y la variación respecto del mes
anterior.

## R9
CUANDO el panel de comparación muestra una variación con `variationTenths` entero, el
sistema DEBE formatearla con signo explícito, un decimal con coma y el símbolo `%`
(`125 → "+12,5 %"`, `-60 → "-6,0 %"`, `0 → "0,0 %"`, `5 → "+0,5 %"`).

## R10
SI la comparación tiene `hasPreviousData = true` y `variationTenths = null` ENTONCES el
panel de comparación DEBE mostrar, en lugar de la variación
(`monthly-comparison-variation`), el texto «El mes anterior no tiene gastos: no se puede
calcular la variación.»

## R11
SI la comparación tiene `hasPreviousData = false` ENTONCES el panel de comparación DEBE
mostrar el total del mes actual y el estado vacío (`monthly-comparison-empty`) con el texto
«No hay datos de meses anteriores para comparar.», sin filas de meses anteriores, sin
variación y sin valores `NaN` ni `Infinity`.

## R12
CUANDO el usuario cambia el período activo o registra, edita o elimina un gasto, el sistema
DEBE recalcular la comparación mensual y reflejar los nuevos totales y la nueva variación
sin reiniciar la aplicación.

## R13
MIENTRAS la pestaña activa sea Resumen (`activeTab === 'overview'`), el sistema NO DEBE
renderizar el panel de comparación (`monthly-comparison`), preservando la vista sin scroll
vertical de H13.

## R14
El panel de comparación DEBE aplicar diseño Mobile First en pantallas menores a `768px`
(`data-comparison-layout="mobile"`, bloque del mes actual y lista de meses apilados a ancho
completo) y adaptarse en pantallas de `768px` o más (`data-comparison-layout="tablet"` o
`"desktop"`, bloque del mes actual y lista de meses en dos columnas), con cifras en
`tabular-nums`.

## R15
El sistema DEBE exponer la función pura `calculateVariationTenths(currentCents,
previousCents)` desde `src/domain/services/monthlyComparison.js`, usada por
`buildMonthlyComparison` para calcular `variationTenths` y reutilizable por otras features
(H10) con cualquier par de totales en centavos.

## R16
SI `calculateVariationTenths` o `buildMonthlyComparison` reciben un total que no es un
entero seguro (`Number.isSafeInteger`) mayor o igual a `0` ENTONCES el sistema DEBE lanzar
`InvalidAmount`.

## R17
El módulo de dominio de la comparación (`src/domain/services/monthlyComparison.js`) NO DEBE
importar `react`, `react-dom`, `node:sqlite` ni clientes HTTP (`fetch`, `axios`).

## Trazabilidad con los criterios de aceptación

| Criterio (feature_list.json) | Cubierto por |
|---|---|
| CA1. Se muestran el total del mes actual y el de hasta cinco meses anteriores, con la variación porcentual respecto del mes anterior. | R1, R2, R3, R4, R5, R6, R8, R9, R10, R12, R13, R14, R15, R16, R17 |
| CA2. Si no existen meses previos, se informa que no hay datos para comparar. | R7, R11 |

## Fuera de alcance de esta feature

- Variación por categoría entre meses (la calcula H10 reutilizando
  `calculateVariationTenths`).
- Gráfico de evolución (barras o líneas) de los meses comparados.
- Comparación con meses posteriores al seleccionado o con más de cinco meses anteriores.
- Comparación de ingresos o inversiones entre meses.
- Cambios de esquema SQLite: no hay migración.
- Envío de la comparación al modelo de lenguaje (H10 arma su propio resumen agregado).
