# Requirements — h01_registrar_gasto

> Feature #1 (H1) de `feature_list.json`: Registrar un gasto.
> «Como usuario quiero registrar un gasto con su monto, fecha, categoría y detalles opcionales para llevar el control cotidiano de mis egresos.» Prioridad alta, 5 puntos, iteración 1, orden 2.
>
> Cada requisito está en EARS estricto y es verificable por al menos una prueba con la
> etiqueta `[H1-R<n>]`.

## Definiciones

- **Monto en centavos (`amountCents`):** número entero positivo (`Number.isInteger(amountCents)` y `amountCents > 0`) equivalente al importe en pesos multiplicado por 100.
- **Fecha del gasto (`date`):** cadena en formato ISO 8601 sin zona (`YYYY-MM-DD`) correspondiente a una fecha calendario válida.
- **Mes en curso (`yearMonth`):** prefijo `YYYY-MM` de la fecha de referencia o del gasto.
- **Categoría válida (`categoryId`):** identificador entero positivo de una categoría registrada en la tabla `categories` (incluyendo las 10 categorías predefinidas iniciales).
- **Campos opcionales (`subcategory`, `note`):** textos descriptivos que se normalizan a `null` cuando se dejan vacíos o contienen únicamente espacios en blanco.

## R1
CUANDO el formulario de registro de gasto se abre, el sistema DEBE proponer por defecto la fecha del día actual en formato `YYYY-MM-DD`, mostrar primero las categorías frecuentes y preseleccionar una categoría válida de la tabla `categories` para optimizar el tiempo de carga (OE1 / K1 ≤ 15 s).

## R2
CUANDO el usuario completa un monto mayor que cero, una fecha válida en formato `YYYY-MM-DD` y una categoría válida y confirma el registro, el sistema DEBE guardar el gasto en la tabla `expenses` con el importe expresado como entero en centavos (`amount_cents > 0`) y las marcas temporales `created_at` y `updated_at` en formato ISO 8601 (`YYYY-MM-DDTHH:MM:SS`).

## R3
CUANDO un gasto se guarda con éxito, el sistema DEBE actualizar de inmediato el listado de gastos del mes correspondiente mostrando el nuevo gasto con su monto formateado en pesos, su fecha, el nombre de su categoría y su nota si la tuviera.

## R4
SI el monto ingresado está vacío, no es numérico, es igual a cero o es negativo ENTONCES el sistema NO DEBE guardar el gasto en la base de datos.

## R5
SI el monto ingresado está vacío, no es numérico, es igual a cero o es negativo ENTONCES el sistema DEBE mostrar un mensaje de validación junto al campo de monto indicando que el monto debe ser mayor que cero.

## R6
CUANDO el usuario confirma el registro dejando vacíos los campos de subcategoría o de nota, el sistema DEBE guardar el gasto almacenando `null` en las columnas `subcategory` y `note` respectivamente.

## R7
CUANDO el usuario completa valores de texto en los campos de subcategoría o de nota y confirma un gasto válido, el sistema DEBE persistir dichos valores recortados (`trim`) junto con el gasto en la tabla `expenses`.

## R8
El sistema DEBE presentar el formulario de carga de gasto y el listado del mes con una disposición Mobile First (`< 768px`) pensada para carga rápida con una mano y una adaptación responsiva para pantallas Desktop (`≥ 768px`) en grilla de dos columnas con soporte de teclado.

## Trazabilidad con los criterios de aceptación

| Criterio (feature_list.json) | Cubierto por |
|---|---|
| CA1. Cuando el usuario completa un monto mayor que cero, una fecha y una categoría y confirma, el gasto queda guardado y aparece en el listado del mes. | R2, R3, R7, R8 |
| CA2. Si el monto está vacío, es cero o es negativo, la aplicación no guarda el gasto y muestra un mensaje junto al campo. | R4, R5 |
| CA3. La fecha se propone por defecto en el día actual y la subcategoría y la nota son opcionales. | R1, R6, R7 |
| Reglas de arquitectura, diseño y objetivo SMART OE1 (`docs/Proyecto_Tec_Laborales_Grupo_3.pdf`, importes en centavos enteros, Mobile First + Desktop, K1 tiempo medio de carga ≤ 15 s con fecha del día y categorías frecuentes primero) | R1, R2, R8 |

## Fuera de alcance de esta feature

- Edición y eliminación de un gasto existente (corresponde a `H2 — h02_editar_eliminar_gasto`).
- Navegación histórica entre meses anteriores y cálculo del total mensual consolidado con estado vacío dedicado (corresponde a `H3 — h03_listado_mensual`).
- Creación o baja de categorías personalizadas por el usuario (corresponde a `H4 — h04_categorias_propias`).
