# Requirements — h15_ingresos_multiples

> Feature #15 (H15) de `feature_list.json`: Registrar múltiples ingresos en cualquier momento y acumular el total mensual.
> «Como usuario quiero cargar múltiples ingresos individuales en cualquier momento del mes indicando monto, fecha y concepto/nota opcional, verlos listados como los gastos, poder editarlos o eliminarlos, y que el ingreso mensual total sea la suma acumulada de todos los ingresos del período.» Prioridad alta, 5 puntos, iteración 3, orden 15.
>
> Cada requisito está en EARS estricto y es verificable por al menos una prueba con la
> etiqueta `[H15-R<n>]`.

## Definiciones

- **Movimiento de ingreso (`IncomeEntry`):** asiento individual e inmutable de ingreso (`id`, `amountCents > 0`, `date` en formato ISO `YYYY-MM-DD`, `yearMonth` derivado `YYYY-MM`, `note` opcional hasta 200 caracteres y `createdAt` ISO 8601) almacenado en la tabla `income_entries`.
- **Total acumulado de ingresos del mes (`totalIncomeCents` / `MonthlyIncome.amountCents`):** suma entera en centavos de todos los `IncomeEntry` cuyo `date` pertenece al período `YYYY-MM` seleccionado.

## R1
CUANDO se construye un movimiento de ingreso (`IncomeEntry`) con un monto entero positivo en centavos (`Number.isInteger(amountCents) && amountCents > 0`), una fecha válida (`YYYY-MM-DD`) y un concepto o nota opcional, el sistema DEBE crear una instancia inmutable (`Object.isFrozen`) con `yearMonth` derivado de los primeros 7 caracteres de `date` y `note` normalizada con `trim()` (o `null` si está vacía).

## R2
SI se intenta crear o actualizar un `IncomeEntry` con un monto no entero, menor o igual a cero, una fecha inválida o una nota de más de 200 caracteres ENTONCES el sistema DEBE rechazar la operación lanzando `InvalidAmount` o `InvalidExpenseDate`.

## R3
CUANDO se inicializa o migra la base de datos SQLite (`AppDatabase.migrate()`), el sistema DEBE ejecutar la migración **v5** creando la tabla `income_entries` (`id`, `amount_cents CHECK (amount_cents > 0)`, `date`, `note`, `created_at`) y su índice `idx_income_entries_date`, dejando `PRAGMA user_version = 5` sin perder datos existentes de versiones previas.

## R4
CUANDO se guardan múltiples movimientos de ingreso (`addEntry`) en un mismo período `YYYY-MM`, el repositorio (`SqliteMonthlyIncomeRepository` y adaptador del navegador) DEBE persistir cada movimiento de forma independiente, devolverlos ordenados por fecha descendente (`date DESC, id DESC`) en `findEntriesByYearMonth(yearMonth)` y reflejar en `findByYearMonth(yearMonth)` la suma acumulada exacta de todos los ingresos de ese mes.

## R5
CUANDO el usuario edita (`updateEntry`) o elimina (`deleteEntryById`) un ingreso individual registrado en el período, el repositorio DEBE actualizar o borrar físicamente el registro en `income_entries` y recalcular la suma mensual acumulada en `monthly_incomes` (o dejarla en `null` si no quedan ingresos en el período).

## R6
CUANDO el usuario abre la pestaña Ingresos (`activeTab === 'income'`), el sistema DEBE presentar el formulario de carga de ingresos (`monthly-income-form`) con campo de monto de alto contraste (`income-amount-input`), campo de fecha propuesto por defecto en el día actual (`income-date-input`) y campo opcional de concepto/nota (`income-note-input`), junto con el listado de ingresos registrados del mes (`income-entries-list`).

## R7
CUANDO el usuario registra dos o más ingresos en el período desde la pestaña Ingresos, el sistema DEBE agregar cada ingreso al listado (`income-entries-list`), limpiar el monto y la nota para permitir nuevas cargas y actualizar de inmediato sin reiniciar la aplicación el total de ingresos del mes (`overview-income-amount`), el balance disponible (`overview-balance-amount`), la barra de asignación de capital, los porcentajes de absorción por categoría y el resumen para recomendaciones.

## R8
CUANDO el usuario edita o elimina un ingreso individual desde el listado de la pestaña Ingresos (`income-entry-edit-<id>`, `income-entry-delete-<id>`), el sistema DEBE actualizar el listado de ingresos y recalcular de inmediato el ingreso mensual acumulado, el balance disponible y los porcentajes de absorción por categoría.

## Trazabilidad con los criterios de aceptación

| Criterio (feature_list.json) | Cubierto por |
|---|---|
| CA1. El usuario puede registrar múltiples ingresos individuales en cualquier fecha del mes (con monto mayor que cero, fecha propuesta por defecto en el día actual y concepto/nota opcional), quedando cada ingreso guardado y listado en la pestaña Ingresos de forma análoga a los gastos. | R1, R2, R3, R4, R6 |
| CA2. El ingreso total del período se calcula automáticamente como la suma acumulada de todos los ingresos registrados en ese mes, actualizando sin reiniciar la aplicación los indicadores del Resumen, el balance disponible, la absorción por categoría y el resumen para recomendaciones. | R4, R7 |
| CA3. El usuario puede eliminar (o editar) un ingreso individual registrado en el mes y el total acumulado de ingresos y los porcentajes de absorción se recalculan de inmediato. | R5, R8 |
