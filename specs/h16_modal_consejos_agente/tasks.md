# Tasks — h16_modal_consejos_agente

> Pasos discretos en orden para implementar `H16 — h16_modal_consejos_agente`.
> El implementer marca `[x]` al completar cada uno. Cada tarea indica los requisitos que cubre.

## Dominio y Persistencia del Snapshot Diario

- [x] T1 — Extender `AdviceRequestRepository` (`src/domain/repositories/adviceRequestRepository.js`), `LocalStorageAdviceRequestRepository` (`src/data/repositories/localStorageAdviceRequestRepository.js`) y `SqliteAdviceRequestRepository` (`src/data/repositories/sqliteAdviceRequestRepository.js`) con `saveDailyAdviceSnapshot` y `findDailyAdviceSnapshot(date, yearMonth)`. Cubre: R4, R5, R6.

## Presentación — Botón y Modal «Consejos Agente» en Resumen

- [x] T2 — Ajustar la altura compacta mobile en `src/features/income/CategoryDistributionChart.jsx` (`card.height: 330`, `breakdownList.maxHeight: 190`) para alojar el botón inferior en `Resumen` conservando el contenedor de categorías amplio y el dashboard sin scroll vertical. Cubre: R1, R7.
- [x] T3 — Actualizar `src/features/income/MonthlyOverviewScreen.jsx` (y `MonthlyOverviewController`) para: (a) quitar `RecommendationsPanel` de la pestaña `Alertas`, (b) renderizar debajo de todo en `Resumen` el botón «Consejos Agente» (`open-agent-advice-modal-button`), (c) abrir y cerrar el modal `agent-advice-modal` (`openAdviceModal`, `closeAdviceModal`, `close-agent-advice-modal-button`), y (d) guardar y restaurar automáticamente los últimos consejos solicitados en el día (`today()`). Cubre: R1, R2, R3, R4, R5, R6, R7.

## Pruebas y Verificación

- [x] T4 — Actualizar las pruebas de integración de recomendaciones en `test/features/income/MonthlyOverviewScreen.test.jsx` y agregar las pruebas etiquetadas `[H16-R1]`..`[H16-R7]`. Cubre: R1..R7.
- [x] T5 — Actualizar `progress/traceability.md`, `progress/current.md`, `progress/impl_h16_modal_consejos_agente.md` y `progress/review_h16_modal_consejos_agente.md`, verificando `powershell -ExecutionPolicy Bypass -File ./init.ps1` en verde. Cubre: R1..R7.
