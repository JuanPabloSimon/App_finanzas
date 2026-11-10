# Requirements — h03_listado_mensual

> Feature #3 (H3) de `feature_list.json`: Listado de gastos del mes.
> «Como usuario quiero consultar el listado de gastos del mes con su total acumulado y poder navegar a meses anteriores para revisar mi historial.» Prioridad alta, 3 puntos, iteración 1, orden 4.
>
> Cada requisito está en EARS estricto y es verificable por al menos una prueba con la
> etiqueta `[H3-R<n>]`.

## Definiciones

- **Mes visualizado (`activeYearMonth`):** período en formato `YYYY-MM` cuyo listado y total se presentan en pantalla. Al iniciar, se posiciona por defecto en el mes actual según la fecha del sistema (`today()`).
- **Mes anterior / mes siguiente:** cálculo calendario exacto sobre `YYYY-MM` (por ejemplo, el mes anterior a `2026-01` es `2025-12` y el siguiente a `2025-12` es `2026-01`).
- **Estado vacío con acceso directo a la carga:** bloque informativo que se presenta cuando el mes visualizado no registra gastos (`expenses.length === 0`), incluyendo un botón de acción directa (`data-testid="empty-state-Register-cta"` / «Registrar primer gasto del mes») que prepara el formulario en modo de alta para ese mes.

## R1
CUANDO se abre la pantalla de gastos, el sistema DEBE posicionar el listado mensual por defecto en el mes en curso (`YYYY-MM`) y mostrar los gastos de ese período ordenados por fecha descendente (`date DESC`, y ante igual fecha por `id DESC`).

## R2
CUANDO el listado mensual contiene gastos en el período seleccionado, el sistema DEBE mostrar para cada gasto su fecha (`YYYY-MM-DD`), categoría (y subcategoría si existe), nota (si existe) y monto formateado en pesos argentinos (`$ X.XXX,XX` a partir de `amount_cents`).

## R3
El sistema DEBE calcular y mostrar en el encabezado del listado el total acumulado del mes seleccionado (`monthlyTotalCents`, suma entera en centavos de los gastos de ese mes formateada en ARS); SI el mes no tiene gastos registrados, el total mostrado DEBE ser `$ 0`.

## R4
SI el mes seleccionado no registra gastos (`expenses.length === 0`) ENTONCES el sistema DEBE presentar un estado vacío explícito con un botón de acceso directo a la carga («Registrar gasto en este mes») que posicione el formulario en modo creación con una fecha válida de ese mes y el foco listo para cargar.

## R5
CUANDO el usuario acciona el control de navegación «Mes anterior», el sistema DEBE cambiar el período activo al mes calendario inmediatamente anterior (`YYYY-MM`), incluyendo el cambio de año de enero (`YYYY-01`) a diciembre (`(YYYY-1)-12`), y recargar desde SQLite los gastos y el total correspondientes a ese mes.

## R6
CUANDO el usuario se encuentra visualizando un mes anterior y acciona el control «Mes siguiente» (o «Volver al mes actual»), el sistema DEBE avanzar al mes calendario siguiente y recargar el listado y el total de ese período sin permitir avanzar más allá del mes actual en curso.

## R7
SI se solicita calcular el mes anterior o siguiente sobre un valor que no cumple el formato `YYYY-MM` válido ENTONCES la función de calendario DEBE lanzar una excepción de dominio `InvalidExpenseDate`.

## R8
El sistema DEBE presentar el selector de período mensual, el listado ordenado, el total del mes y el estado vacío con acceso directo a la carga aplicando diseño Mobile First (`< 768px`, controles táctiles de al menos `44px` de alto) y adaptación responsiva para pantallas Desktop (`≥ 768px`, grilla de dos columnas con soporte de teclado).

## Trazabilidad con los criterios de aceptación

| Criterio (feature_list.json) | Cubierto por |
|---|---|
| CA1. El listado muestra los gastos del mes en curso ordenados por fecha descendente, con monto, categoría y nota. | R1, R2, R8 |
| CA2. Se muestra el total del mes; si no hay gastos, se presenta un estado vacío con acceso directo a la carga. | R3, R4, R8 |
| CA3. El usuario puede navegar al mes anterior. | R5, R6, R7, R8 |

## Fuera de alcance de esta feature

- Creación y eliminación de categorías personalizadas (corresponde a `H4 — h04_categorias_propias`).
- Registro de ingreso mensual y cálculo de porcentaje sobre el ingreso (corresponde a `H5 — h05_ingreso_mensual`).
- Gráfico de distribución y comparación de hasta 5 meses anteriores en el tablero (corresponden a `H6` y `H7`).
