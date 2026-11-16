# Requirements — h11_exportar_historial

> Feature #11 (H11) de `feature_list.json`: exportar el historial.
> «Como usuario quiero exportar mi historial de gastos a un archivo para resguardarlo o
> analizarlo en una planilla.» Épica Resguardo, prioridad media, 3 puntos, iteración 3.
>
> Cada requisito está en EARS estricto y es verificable por al menos una prueba con la
> etiqueta `[H11-R<n>]`.

## Definiciones

- **Gastos guardados:** todos los gastos persistidos en el repositorio de gastos, de
  cualquier mes, obtenidos con `ExpenseRepository.findAll()` (SQLite en las pruebas,
  `localStorage` clave `fp_expenses` en el navegador). No se filtran por el período activo
  de la pantalla.
- **CSV exportado:** texto generado por `CsvExporter` (`src/domain/services/csvExporter.js`)
  con el formato de esta especificación, compatible con planillas configuradas en es-AR
  (Excel, LibreOffice Calc, Google Sheets).
- **Fila de datos:** registro del CSV posterior al encabezado, delimitado según RFC 4180
  (un salto de línea dentro de un campo entre comillas no inicia un registro nuevo).
- **Campo de texto:** las columnas `Categoría`, `Subcategoría` y `Nota`.
- **Carácter de fórmula:** `=`, `+`, `-`, `@`, tabulación (U+0009) o retorno de carro
  (U+000D) como primer carácter de un campo de texto (OWASP, *CSV injection*).
- **Fecha de exportación:** fecha local del día (`today()` de la pantalla), `YYYY-MM-DD`.
- **Panel de exportación:** componente `ExportHistoryPanel` (`data-testid="export-history-panel"`).

## R1
CUANDO el usuario solicita exportar el historial y existen gastos guardados, el sistema
DEBE generar un CSV con exactamente una fila de datos por cada gasto guardado, incluidos
los gastos de meses distintos del período activo.

## R2
El sistema DEBE escribir como primera línea del CSV el encabezado
`Fecha;Monto (ARS);Categoría;Subcategoría;Nota`, con las columnas en ese orden.

## R3
El sistema DEBE separar los campos de cada línea del CSV con punto y coma (`;`).

## R4
El sistema DEBE terminar cada línea del CSV, incluida la última, con la secuencia CRLF
(`\r\n`).

## R5
El sistema DEBE comenzar el contenido del CSV con la marca de orden de bytes UTF-8
(U+FEFF, bytes `EF BB BF` al codificarse).

## R6
El sistema DEBE escribir en la columna `Fecha` la fecha del gasto en formato `YYYY-MM-DD`.

## R7
El sistema DEBE escribir en la columna `Monto (ARS)` el importe en pesos con coma decimal,
exactamente dos decimales y sin separador de miles, calculado a partir de `amountCents`
solo con aritmética entera (por ejemplo `123456` → `1234,56`, `5` → `0,05`,
`100` → `1,00`).

## R8
El sistema DEBE escribir en la columna `Categoría` el nombre de la categoría del gasto.

## R9
SI la subcategoría o la nota de un gasto está vacía ENTONCES el sistema DEBE dejar vacío
el campo correspondiente de esa fila.

## R10
El sistema DEBE ordenar las filas de datos por fecha ascendente y, a igual fecha, por `id`
ascendente.

## R11
SI un campo contiene `;`, comillas dobles (`"`), retorno de carro o salto de línea
ENTONCES el sistema DEBE encerrarlo entre comillas dobles y duplicar cada comilla doble
interna (RFC 4180).

## R12
SI un campo de texto comienza con un carácter de fórmula ENTONCES el sistema DEBE anteponer
un apóstrofo (`'`) al valor antes de aplicar el escape de R11.

## R13
CUANDO se genera el CSV, el sistema DEBE producir una cantidad de filas de datos igual a la
cantidad de gastos guardados, sin filas de totales ni filas vacías.

## R14
CUANDO se genera el CSV, el sistema DEBE producir montos cuya suma, convertida a centavos
con aritmética entera, sea igual a la suma de `amountCents` de los gastos guardados.

## R15
CUANDO una exportación se completa, el sistema DEBE mostrar en el panel de exportación la
cantidad de gastos exportados y su total en pesos formateado con `formatCentsToArs`.

## R16
CUANDO el usuario solicita exportar el historial, el sistema DEBE nombrar el archivo
`gestix_gastos_<YYYY-MM-DD>.csv` con la fecha de exportación.

## R17
CUANDO el usuario activa el botón «Descargar CSV» y existen gastos guardados, el sistema
DEBE entregar el CSV al navegador como descarga mediante un `Blob` de tipo
`text/csv;charset=utf-8` y un enlace con el atributo `download`.

## R18
DONDE el navegador admite compartir archivos con la Web Share API
(`navigator.canShare({ files })` devuelve `true`), el sistema DEBE mostrar un botón
«Compartir» que entregue el CSV como archivo a `navigator.share`.

## R19
SI el navegador no admite compartir archivos con la Web Share API ENTONCES el sistema NO
DEBE mostrar el botón «Compartir».

## R20
SI el usuario cancela la hoja de compartir (`navigator.share` rechaza con `AbortError`)
ENTONCES el sistema NO DEBE mostrar un mensaje de error.

## R21
SI el usuario solicita exportar y no existen gastos guardados ENTONCES el sistema DEBE
mostrar el mensaje «Todavía no hay gastos para exportar.» sin entregar ningún archivo.

## R22
SI falla la lectura de los gastos, la generación del CSV o su entrega al navegador
ENTONCES el sistema DEBE mostrar el mensaje «No se pudo exportar el historial. Probá de
nuevo.».

## R23
MIENTRAS la pestaña activa sea «Gastos» (`expenses`), el sistema DEBE mostrar el panel de
exportación al final de esa pestaña.

## R24
El sistema NO DEBE mostrar el panel ni los botones de exportación en la pestaña «Resumen»
(`overview`) ni en el header (`app-header`).

## R25
MIENTRAS el ancho de la ventana sea menor a 768 px, el sistema DEBE mostrar los botones del
panel de exportación con ancho completo y un alto mínimo de 44 px.

## R26
MIENTRAS el ancho de la ventana sea de al menos 768 px, el sistema DEBE limitar el ancho del
panel de exportación a `containerMaxWidth` y mostrar sus botones con ancho automático.

## R27
El sistema DEBE mostrar en el panel de exportación la advertencia «El archivo incluye tus
notas y subcategorías y no está protegido. Guardalo en un lugar seguro.».

## R28
El sistema DEBE generar y entregar el CSV sin realizar ninguna llamada de red.

## Trazabilidad con los criterios de aceptación

| Criterio (feature_list.json) | Cubierto por |
|---|---|
| CA1. Se genera un archivo CSV con todos los gastos (fecha, monto, categoría, subcategoría y nota) que puede guardarse o compartirse. | R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12, R16, R17, R18, R19, R20, R21, R22, R23 |
| CA2. Al abrir el archivo en una planilla de cálculo, la cantidad de registros y el total coinciden con los de la aplicación. | R3, R5, R7, R11, R13, R14, R15 |
| Regla 13 de `rules.md` (solo `src/assistant/` usa la red) | R28 |
| `docs/privacy.md` (pérdida del dispositivo: exportación a pedido como resguardo; Ley 25.326) | R17, R27 |
| H13-CA1/CA3 (Resumen sin scroll y header solo con título y perfil) | R24 |
| Diseño Mobile First + Desktop (regla 9 de `rules.md`) | R25, R26 |

## Fuera de alcance de esta feature

- Importar un CSV (restaurar el historial) o sincronizarlo con la nube.
- Exportar ingresos, inversiones, recordatorios, recurrencias o consultas al asistente.
- Exportar solo un mes o un rango de fechas (se exporta siempre el historial completo).
- Otros formatos (XLSX, PDF, JSON) y cifrado o contraseña del archivo.
- Una fila de totales dentro del archivo (rompería el conteo de registros de CA2).
- Exportación automática o programada.
