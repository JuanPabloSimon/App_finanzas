# Tasks — h06_grafico_categorias

> Tareas en orden de ejecución para implementar `H6 — h06_grafico_categorias`.
> Cada tarea referencia los requisitos `R1..R8` de `requirements.md`.

- [x] **T1 (R1, R2, R4, R7):** Extender `calculateCategoryIncomeBreakdown` en `src/domain/models/monthlyIncome.js` (y exportar `CHART_PALETTE` en `src/core/theme.js`) para incluir `expenseCount`, `expensePercentage` (con ajuste de residuo para sumar exactamente `100 %`), `colorHex` y desempate alfabético cuando dos categorías tienen igual monto.
- [x] **T2 (R3, R4, R5, R8):** Crear el componente `CategoryDistributionChart` en `src/features/income/CategoryDistributionChart.jsx` con gráfico anular SVG, centro contable con total del mes, fila de conciliación (`100 %` = total del listado), estado coherente para 1 solo gasto (`100 %`) y estado vacío sin gastos con acceso directo a la carga.
- [x] **T3 (R3, R6, R8):** Integrar `CategoryDistributionChart` en `src/features/income/MonthlyOverviewScreen.jsx` garantizando la recarga inmediata al cambiar de mes o al registrar/editar/eliminar gastos, y el diseño responsivo Mobile First (`< 768px`) y Desktop (`>= 768px`).
- [x] **T4 (R1, R2, R4, R5, R7):** Agregar pruebas unitarias de dominio en `test/domain/models/monthlyIncome.test.js` con etiquetas `[H6-R1]`, `[H6-R2]`, `[H6-R4]`, `[H6-R5]` y `[H6-R7]`.
- [x] **T5 (R1..R8):** Agregar pruebas de componente e integración en `test/features/income/MonthlyOverviewScreen.test.jsx` con etiquetas `[H6-R1]` a `[H6-R8]`.
- [x] **T6 (R1..R8):** Actualizar `progress/traceability.md`, ejecutar `./init.ps1` y verificar que el linter, las pruebas y la matriz de trazabilidad pasen al 100 %.
