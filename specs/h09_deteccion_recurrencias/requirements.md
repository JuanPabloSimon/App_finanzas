# Requirements — h09_deteccion_recurrencias

> Feature #9 (H9) de `feature_list.json`: detección de gastos recurrentes.
> «Como usuario quiero que la aplicación detecte mis gastos repetidos para notar los que
> pasan inadvertidos.» Prioridad alta, 5 puntos, iteración 3.
>
> Cada requisito está en EARS estricto y es verificable por al menos una prueba con la
> etiqueta `[H9-R<n>]`.

## Definiciones

- **Fecha de referencia:** el día actual (`today()` de la pantalla), en formato
  `YYYY-MM-DD`.
- **Ventana de análisis:** los 60 días corridos que terminan en la fecha de referencia,
  ambos extremos incluidos (desde fecha de referencia − 59 días hasta la fecha de
  referencia).
- **Grupo candidato:** gastos de una misma categoría dentro de la ventana.
- **Monto típico:** mediana de los montos de un conjunto, en centavos enteros. Con una
  cantidad par de montos, es el promedio de los dos centrales redondeado al centavo
  (`Math.round`).
- **Difiere más de un 10 %:** `|monto − montoTípico| × 10 > montoTípico`, calculado con
  enteros en centavos (sin coma flotante).
- **Recurrencia:** conjunto de al menos 3 gastos de la misma categoría dentro de la
  ventana cuyos montos no difieren más de un 10 % del monto típico del conjunto.
- **Clave de recurrencia:** texto `<categoryId>|<typicalAmountCents>` (por ejemplo
  `7|650000`).
- **Recurrencia descartada equivalente:** clave guardada en `dismissed_recurrences` con el
  mismo `categoryId` que la recurrencia detectada y cuyo monto típico guardado no difiere
  más de un 10 % del monto típico detectado (con el monto guardado como base).

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
MIENTRAS exista en `dismissed_recurrences` una recurrencia descartada equivalente a una
recurrencia detectada, el sistema NO DEBE mostrar esa recurrencia detectada al usuario.

## R8
CUANDO existan recurrencias detectadas y no descartadas, el sistema DEBE mostrarlas en la
pestaña «Alertas» (`reminders`) con su categoría, su monto típico en pesos y la cantidad
de veces que se repitió en la ventana.

## R9
CUANDO no existan recurrencias para mostrar, el sistema DEBE presentar en la pestaña
«Alertas» un estado vacío con un mensaje que explique que todavía no se detectaron gastos
repetidos.

## R10
El sistema DEBE ejecutar la detección sin realizar ninguna llamada de red.

## R11
SI un gasto tiene fecha anterior al inicio de la ventana o posterior a la fecha de
referencia ENTONCES el sistema NO DEBE contarlo en ninguna recurrencia.

## Trazabilidad con los criterios de aceptación

| Criterio (feature_list.json) | Cubierto por |
|---|---|
| CA1. Se marca como recurrente un consumo de la misma categoría que se repite al menos tres veces en sesenta días con montos que no difieren más de un 10 %. | R1, R2, R3, R8, R11 |
| CA2. Sobre el conjunto de prueba etiquetado, se detecta al menos el 85 % de las recurrencias conocidas. | R4, R5 |
| CA3. El usuario puede descartar una recurrencia y esta no vuelve a sugerirse. | R6, R7 |
| Objetivo OE4 y métrica K4 de la Etapa 3 (exhaustividad y precisión ≥ 85 %, `docs/kpis.md`) | R4, R5 |
| Regla de arquitectura «solo `src/assistant/` usa la red» (`rules.md` regla 13) | R10 |
| Estado vacío (criterio general de UI) | R9 |

## Fuera de alcance de esta feature

- Enviar las recurrencias al modelo de lenguaje (lo hace H10 con el resumen agregado).
- Detectar recurrencias entre categorías distintas o por texto de la nota.
- Deshacer un descarte o listar las recurrencias descartadas.
- Notificaciones push.
- Mostrar recurrencias en la pestaña «Resumen» (debe seguir sin scroll vertical, H13-CA1).
