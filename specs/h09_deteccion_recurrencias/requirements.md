# Requirements — h09_deteccion_recurrencias

> Feature #9 (H9) de `feature_list.json`: detección de gastos recurrentes.
> «Como usuario quiero que la aplicación detecte mis gastos repetidos para notar los que
> pasan inadvertidos.» Prioridad alta, 5 puntos, iteración 3.
>
> Cada requisito está en EARS estricto y es verificable por al menos una prueba con la
> etiqueta `[H9-R<n>]`. (Borrador de referencia para el arnés SDD; la feature se encuentra
> en `pending` hasta su turno de ejecución).

## Definiciones

- **Ventana de análisis:** los 60 días corridos que terminan en la fecha de referencia
  (por defecto, hoy), ambos extremos incluidos.
- **Grupo candidato:** gastos de una misma categoría dentro de la ventana.
- **Monto típico:** mediana de los montos del grupo, en centavos.
- **Recurrencia:** grupo de gastos cuyos montos están todos dentro de ±10 % del monto típico.

## R1
CUANDO se ejecuta la detección sobre el historial, el sistema DEBE informar como
recurrencia todo conjunto de al menos 3 gastos de la misma categoría, dentro de la ventana
de 60 días, cuyos montos difieran como máximo un 10 % del monto típico del conjunto.

## R2
SI un conjunto de gastos de la misma categoría tiene menos de 3 elementos dentro de la
ventana ENTONCES el sistema NO DEBE informarlo como recurrencia.

## R3
SI el monto de un gasto difiere más de un 10 % del monto típico de un conjunto ENTONCES el
sistema NO DEBE incluir ese gasto en esa recurrencia.

## R4
CUANDO la detección se evalúa sobre el conjunto de prueba
`test/fixtures/recurrencias_etiquetadas.json`, el sistema DEBE alcanzar una exhaustividad
de al menos 0,85 (recurrencias reales detectadas / recurrencias reales).

## R5
CUANDO la detección se evalúa sobre el conjunto de prueba
`test/fixtures/recurrencias_etiquetadas.json`, el sistema DEBE alcanzar una precisión de al
menos 0,85 (recurrencias detectadas correctas / recurrencias detectadas).

## R6
CUANDO el usuario descarta una recurrencia, el sistema DEBE guardar su clave en la tabla
`dismissed_recurrences`.

## R7
MIENTRAS la clave de una recurrencia esté guardada en `dismissed_recurrences`, el sistema
NO DEBE mostrar esa recurrencia al usuario.

## R8
CUANDO existan recurrencias detectadas y no descartadas, el sistema DEBE mostrarlas en la
pantalla de recurrencias con su categoría, su monto típico en pesos y la cantidad de
veces que se repitió en la ventana, adaptando la vista bajo enfoque Mobile First y soporte Desktop.

## R9
CUANDO no existan recurrencias para mostrar, el sistema DEBE presentar un estado vacío con
un mensaje que explique que todavía no se detectaron gastos repetidos.

## R10
El sistema DEBE ejecutar la detección sin realizar ninguna llamada de red.

## Trazabilidad con los criterios de aceptación

| Criterio (feature_list.json) | Cubierto por |
|---|---|
| CA1. Se marca como recurrente un consumo de la misma categoría que se repite al menos tres veces en sesenta días con montos que no difieren más de un 10 %. | R1, R2, R3, R8 |
| CA2. Sobre el conjunto de prueba etiquetado, se detecta al menos el 85 % de las recurrencias conocidas. | R4, R5 |
| CA3. El usuario puede descartar una recurrencia y esta no vuelve a sugerirse. | R6, R7 |
| Objetivo OE4 y métrica K4 de la Etapa 3 (precisión ≥ 85 %) | R5 |
| Regla de arquitectura «solo `src/assistant/` usa la red» | R10 |
| Estado vacío (criterio general de UI) | R9 |

## Fuera de alcance de esta feature

- Enviar las recurrencias al modelo de lenguaje (lo hace H10 con el resumen agregado).
- Detectar recurrencias entre categorías distintas o por texto de la nota.
- Notificaciones push.
