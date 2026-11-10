# Requirements — h02_editar_eliminar_gasto

> Feature #2 (H2) de `feature_list.json`: Editar o eliminar un gasto.
> «Como usuario quiero editar o eliminar un gasto registrado para corregir errores de carga sin perder la consistencia de mis totales.» Prioridad alta, 2 puntos, iteración 1, orden 3.
>
> Cada requisito está en EARS estricto y es verificable por al menos una prueba con la
> etiqueta `[H2-R<n>]`.

## Definiciones

- **Gasto existente (`id`):** registro previamente almacenado en la tabla `expenses` con un identificador entero positivo (`Number.isInteger(id)` y `id > 0`).
- **Total mensual (`monthlyTotalCents`):** suma entera en centavos de `amount_cents` de todos los gastos pertenecientes al mes visualizado (`YYYY-MM`).
- **Confirmación de eliminación:** paso explícito en la interfaz (diálogo o estado de confirmación inline con opciones «Confirmar eliminación» y «Cancelar») previo al borrado físico en SQLite.

## R1
CUANDO el usuario selecciona la acción de editar sobre un gasto existente del listado mensual, el sistema DEBE cargar en el formulario los datos actuales de ese gasto (monto en pesos, fecha `YYYY-MM-DD`, categoría, subcategoría y nota) indicando que se encuentra en modo edición.

## R2
CUANDO el usuario confirma la edición de un gasto existente con un monto mayor que cero, una fecha válida en formato `YYYY-MM-DD` y una categoría válida, el sistema DEBE actualizar el registro correspondiente en la tabla `expenses` de SQLite conservando su `id` y su `created_at` original y actualizando `updated_at` en formato ISO 8601 (`YYYY-MM-DDTHH:MM:SS`).

## R3
CUANDO un gasto editado se guarda con éxito, el sistema DEBE reflejar de inmediato los cambios en el listado mensual y recalcular el total del mes en pantalla sin reiniciar la aplicación.

## R4
SI durante la edición de un gasto el usuario ingresa un monto vacío, no numérico, igual a cero o negativo, o se intenta actualizar o eliminar un identificador de gasto inexistente ENTONCES el sistema NO DEBE modificar el registro en la base de datos y DEBE informar el error (`InvalidAmount` o `ExpenseNotFound`).

## R5
CUANDO el usuario selecciona la acción de eliminar sobre un gasto del listado mensual, el sistema DEBE solicitar una confirmación explícita antes de borrar el registro de la base de datos.

## R6
SI el usuario cancela la confirmación de eliminación de un gasto ENTONCES el sistema DEBE conservar el gasto intacto en la tabla `expenses`, en el listado mensual y en el total del mes.

## R7
CUANDO el usuario confirma la eliminación del gasto, el sistema DEBE borrar el registro de la tabla `expenses` en SQLite, quitarlo de inmediato del listado mensual y recalcular el total del mes sin reiniciar la aplicación.

## R8
El sistema DEBE presentar los controles de edición, eliminación y confirmación y el resumen del total mensual con diseño Mobile First (`< 768px`, botones de acción táctiles accesibles) y adaptación responsiva para pantallas Desktop (`≥ 768px`, disposición en dos columnas con soporte de teclado).

## Trazabilidad con los criterios de aceptación

| Criterio (feature_list.json) | Cubierto por |
|---|---|
| CA1. Al editar un gasto, los cambios se reflejan en el listado y en el tablero sin reiniciar la aplicación. | R1, R2, R3, R4, R8 |
| CA2. Eliminar un gasto pide confirmación; al confirmar, el gasto desaparece y los totales se recalculan. | R4, R5, R6, R7, R8 |
| Reglas de arquitectura y diseño (`docs/architecture.md`, `docs/conventions.md`, `rules.md`: excepción `ExpenseNotFound`, importes en centavos enteros, Mobile First + Desktop) | R2, R4, R7, R8 |

## Fuera de alcance de esta feature

- Navegación histórica entre meses anteriores y estado vacío con acción dedicada de `H3` (corresponde a `H3 — h03_listado_mensual`, aunque el total del mes en curso ya se expone y recalcula aquí para satisfacer `CA1` y `CA2`).
- Gráfico de torta/barras de distribución por categoría y tarjetas comparativas del tablero completo (corresponden a `H6`, `H7` y `H8`).
