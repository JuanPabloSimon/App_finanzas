# Requirements — h05_ingreso_mensual

> Feature #5 (H5) de `feature_list.json`: Registrar el ingreso mensual y Panel de Resumen General del Mes.
> «Como usuario quiero registrar mi ingreso mensual y visualizar en un panel general el resumen de mi capital (ingresos, gastos con porcentaje sobre el ingreso, registro de inversiones, recordatorios de vencimientos y consejos) tras ingresar con mi cuenta local.» Prioridad media, 2 puntos, iteración 1, orden 5.
>
> Cada requisito está en EARS estricto y es verificable por al menos una prueba con la
> etiqueta `[H5-R<n>]`.

## Definiciones

- **Ingreso mensual (`MonthlyIncome`):** importe entero positivo en centavos (`amountCents > 0`) asociado a un período `yearMonth` (`YYYY-MM`) almacenado en la tabla `monthly_incomes`.
- **Porcentaje sobre el ingreso (`incomePercentage`):** proporción calculada como `Math.round((categoryAmountCents * 1000) / incomeAmountCents) / 10` (con un decimal) para cada categoría con gastos en el mes cuando existe un ingreso registrado.
- **Registro de inversión (`Investment`):** asiento informativo para control de gestión del capital invertido (activo como Plazo Fijo/FCI/CEDEAR/Bono, plataforma/entidad, monto en centavos `> 0`, fecha de alta `YYYY-MM-DD` y fecha de vencimiento opcional `dueDate`).
- **Recordatorio (`Reminder`):** evento financiero o alerta de vencimiento (manual o derivada del vencimiento de una inversión registrada como un Plazo Fijo) con título y fecha `YYYY-MM-DD`.
- **Cuenta local (`UserAccount`):** perfil local del usuario en el dispositivo (`fullName`, `username`, `passwordHash`) que habilita el acceso al Panel de Resumen General.

## R1
CUANDO el usuario ingresa un monto mayor que cero como ingreso para un período mensual válido (`YYYY-MM`) y confirma, el sistema DEBE guardar o actualizar el registro en la tabla `monthly_incomes` de SQLite en centavos enteros (`Number.isInteger(amountCents) && amountCents > 0`) con su marca `updated_at` en formato ISO 8601.

## R2
CUANDO existe un ingreso mensual registrado para el período visualizado, el tablero de resumen general DEBE mostrar el ingreso del mes, el balance disponible (`ingreso - gastos - inversiones`) y el porcentaje que cada categoría de gasto representa sobre ese ingreso mensual.

## R3
SI no existe un ingreso mensual cargado para el período visualizado ENTONCES el tablero de resumen general DEBE funcionar normalmente mostrando los gastos, inversiones, recordatorios y consejos del mes y omitiendo los porcentajes sobre el ingreso sin producir errores.

## R4
SI el usuario intenta guardar un ingreso mensual o una inversión con un monto vacío, no numérico, igual a cero o negativo, o con un período/fecha inválido ENTONCES el sistema NO DEBE modificar la base de datos y DEBE informar el error (`InvalidAmount` o `InvalidExpenseDate`).

## R5
CUANDO el usuario registra una inversión de control de gestión indicando activo (ej. Plazo Fijo, FCI, CEDEAR), plataforma/entidad, monto mayor que cero, fecha y fecha de vencimiento opcional, el sistema DEBE persistirla en la tabla `investments` de SQLite y reflejarla en el capital invertido del mes.

## R6
CUANDO existen inversiones con fecha de vencimiento (como un Plazo Fijo) o recordatorios manuales cargados, el Panel de Resumen General DEBE presentar los recordatorios de vencimiento junto con consejos orientativos de gestión del mes.

## R7
CUANDO la aplicación requiere sesión de usuario local, el sistema DEBE permitir registrar una cuenta local o iniciar sesión validando las credenciales contra la tabla `user_accounts` antes de mostrar el Panel de Resumen General del titular.

## R8
El sistema DEBE aplicar la paleta de colores sobria/corporativa (azul marino `#0F2942` y marrón oscuro `#4A3525`) y diseño Mobile First (`< 768px`, navegación compacta en 1 columna) con adaptación responsiva para pantallas Desktop (`≥ 768px`, grilla ejecutiva multicolumna).

## Trazabilidad con los criterios de aceptación

| Criterio (feature_list.json) | Cubierto por |
|---|---|
| CA1. El usuario registra un ingreso por mes y el tablero muestra el porcentaje que cada categoría representa sobre ese ingreso. | R1, R2, R4, R8 |
| CA2. Sin ingreso cargado, el tablero funciona normalmente y omite los porcentajes sobre el ingreso. | R3, R8 |
| Alineación de producto solicitada por el usuario (cuenta local, resumen general del mes con ingresos, gastos, inversiones/plazos fijos, recordatorios, consejos y paleta corporativa azul marino / marrón oscuro) | R5, R6, R7, R8 |
