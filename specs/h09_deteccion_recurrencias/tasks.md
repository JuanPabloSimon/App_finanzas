# Tasks — h09_deteccion_recurrencias

> Pasos discretos en orden. El implementer marca `[x]` al completar cada uno.
> Cada tarea indica los requisitos que cubre.

## Dominio

- [ ] T1 — Crear `Recurrence` en `src/domain/models/recurrence.js` con inmutabilidad (`Object.freeze`), `isEqual` y `key`. Cubre: R6, R7.
- [ ] T2 — Crear `RecurrenceDetector` en `src/domain/services/recurrenceDetector.js`
  según el algoritmo de `design.md`. Cubre: R1, R2, R3, R10.
- [ ] T3 — Pruebas `[H9-R1]`, `[H9-R2]`, `[H9-R3]` y `[H9-R10]` en
  `test/domain/services/recurrenceDetector.test.js` (R10: verificar que el archivo no
  importa ni invoca clientes HTTP). Cubre: R1, R2, R3, R10.

## Conjunto etiquetado y métricas

- [ ] T4 — Crear `test/fixtures/recurrencias_etiquetadas.json` con ≥ 20 recurrencias
  reales y ≥ 15 señuelos. Cubre: R4, R5.
- [ ] T5 — Pruebas `[H9-R4]` y `[H9-R5]` en
  `test/domain/services/recurrenceDetectorMetrics.test.js` que calculen exhaustividad y
  precisión. Cubre: R4, R5.

## Persistencia (`expo-sqlite`)

- [ ] T6 — Migración versión 2 en `src/data/db/appDatabase.js` y actualización de
  `docs/data_model.md`. Cubre: R6.
- [ ] T7 — `RecurrenceRepository` (contrato) y `SqliteRecurrenceRepository`. Cubre: R6, R7.
- [ ] T8 — Prueba `[H9-R6]` con base SQLite en memoria en `test/data/sqliteRecurrenceRepository.test.js`. Cubre: R6.

## Presentación (Mobile First + Desktop)

- [ ] T9 — `RecurrencesScreen.jsx` con lista responsiva (categoría, monto típico en pesos, ocurrencias),
  estado vacío y acción «Descartar». Cubre: R7, R8, R9.
- [ ] T10 — Pruebas de componente `[H9-R7]`, `[H9-R8]` y `[H9-R9]` en `test/features/recurrences/RecurrencesScreen.test.jsx`. Cubre: R7, R8, R9.

## Cierre

- [ ] T11 — Documentar la trazabilidad en `progress/impl_h09_deteccion_recurrencias.md`
  y en `progress/traceability.md`, con los valores de exhaustividad y precisión (K4).
- [ ] T12 — Ejecutar `./init.sh` (o `./init.ps1`) y verificar que todo está en verde.
