# Sesión actual

> Se vacía al cerrar cada sesión y su resumen pasa a `history.md`.
> Mientras trabajás, **mantenelo actualizado en tiempo real**, no al final.

- **Feature en curso:** `H10 — h10_recomendaciones_ia` (`orden: 12`, `done`)
- **Herramienta:** `claude-code`
- **Rol / agente:** `leader` → `implementer` (`claude-code`) para H10
- **Integrante responsable:** Francisco
- **Inicio:** `2026-11-15`

## Aprobaciones de spec

- `H9 aprobado por Francisco el 2026-11-15` (`done`)
- `H10 aprobado por Francisco el 2026-11-15` (`done`)

## Plan

- Implementer (`claude-code`, rol `implementer`) ejecutando `specs/h10_recomendaciones_ia/tasks.md`:
  T1–T6 dominio (errores, `AdviceRequest`, contrato, `buildSpendingSummary` y pruebas) · T7–T12 migración v4,
  repositorios SQLite/localStorage, pruebas y `docs/data_model.md` · T13–T23 `src/assistant/` (`LlmClient`,
  config, prompt, `HttpLlmClient`, validación, reserva, `AdviceService`, `FakeLlmClient` y pruebas) ·
  T24–T26 aviso `2026-11` y ajuste de pruebas de H12 · T27–T33 loader, `RecommendationsPanel`, pestaña
  «Alertas», `AppShell`/`App` y pruebas · T34–T35 docs y regla 15 · T36–T38 regresión, trazabilidad e `./init.sh`.

## Bitácora

- `2026-11-15`: `desarrollo` sincronizado con `origin` (H7 y H8 en `done`). `./init.sh` en verde (118/118). Seleccionada `H9`; su spec existía como borrador de referencia desactualizado (migración v2 ya usada, UI fuera de la pestaña Alertas). Lanzando `spec_author` para actualizarlo.
- `2026-11-15` (`spec_author`): spec de H9 actualizado y en `spec_ready`. Cambios sobre el borrador: migración **v3** (`MIGRATION_V3_SQL`, v1/v2 intactas); UI como `RecurrencesPanel` dentro de la pestaña «Alertas» (`reminders`) de `MonthlyOverviewScreen` (Resumen sin cambios, H13 intacto) en lugar de `RecurrencesScreen`; R7 ahora compara descartes con tolerancia ±10 % y clave exacta `<categoryId>|<typicalAmountCents>` (el redondeo a $10 hacía reaparecer descartadas, CA3); R8/R9 ubicados en Alertas; nuevo R11 (exclusión fuera de ventana); algoritmo de agrupamiento 20 % reemplazado por barrido validado contra la mediana (el anterior partía conjuntos válidos de ±10 %, R1); lectura de la ventana con 3 `findByYearMonth` (sin cambiar `ExpenseRepository`); `InvalidRecurrence`, `LocalStorageRecurrenceRepository` para el navegador, cableado en `AppShell.jsx`/`App.jsx` y pruebas mapeadas a la estructura real de `test/`. Se quitó la nota de borrador.
- `2026-11-15`: Spec de `H9` aprobado por Francisco. Estado cambiado a `in_progress`. Lanzando `implementer`.
- `2026-11-15` (`implementer`): T1–T8 listas. Fixture etiquetado (106 gastos, 22 recurrencias, 31 señuelos/atípicos); `InvalidRecurrence`, `Recurrence`, `RecurrenceDetector`, `filterDismissedRecurrences`, contrato `RecurrenceRepository`; 19 pruebas de dominio en verde; K4 exhaustividad 1,00 y precisión 1,00.
- `2026-11-15` (`implementer`): T9–T14 listas. Migración v3 (`dismissed_recurrences`), formato de clave en `docs/data_model.md`, `SqliteRecurrenceRepository` y `LocalStorageRecurrenceRepository` con 7 pruebas; `npm test` 144/144.
- `2026-11-15` (`implementer`): T15–T24 listas. `recurrencesLoader`, `RecurrencesPanel` (Mobile First + Desktop), panel al final de la pestaña «Alertas», controlador con `recurrences`/`dismissRecurrence`, cableado `AppShell`/`App` con `LocalStorageRecurrenceRepository`. Casos existentes sin modificar. `./init.sh` en verde (156/156, ESLint limpio, harness H9 OK). Reporte en `progress/impl_h09_deteccion_recurrencias.md`, trazabilidad actualizada. Pendiente: `reviewer` (no se marcó `done`).
- `2026-11-15`: `implementer` completó T1..T24 (`progress/impl_h09_deteccion_recurrencias.md`). `reviewer` emitió `APPROVED` en `progress/review_h09_deteccion_recurrencias.md` (156/156 pruebas, K4 exhaustividad 1,00 y precisión 1,00). `H9` cerrada en `done`.
- `2026-11-15`: H9 fusionada en `desarrollo` (PR #10). `./init.sh` en verde (156/156). Seleccionada `H10 — h10_recomendaciones_ia` (`orden: 12`), rama `feature/h10-recomendaciones-ia`. Compleja (IA + privacidad): lanzando 3 `Explore` y luego `spec_author`.
- `2026-11-15`: Investigación de H10 en `progress/explore_h10_{contrato_llm,datos_resumen,ui_pruebas}.md`. Decisiones de Francisco: proveedor **Google Gemini (Flash)** con `fetch` nativo y sin SDK; la actualización del aviso de privacidad (nueva `policy_version`, que agregue el ingreso mensual y los nombres de categorías) entra en H10. Lanzando `spec_author`.
- `2026-11-15` (`spec_author`): spec de `H10` en `spec_ready` (`specs/h10_recomendaciones_ia/`, R1..R34; harness OK). Decisiones: Gemini Flash por REST (`gemini-2.5-flash` configurable con `VITE_LLM_MODEL`, clave en encabezado `x-goog-api-key`, `fetch` inyectable, sin SDK); consume cupo toda invocación al modelo, registrada antes de invocar (4 por mes local y por navegador, `fp_advice_requests`, migración v4 con CHECK e índice); «Otros» fuera de las 8 (máximo 9); pesos con redondeo de medios hacia arriba; `variacion_pct` null sin mes anterior; `monto_tipico` redondeado a $100 y como máximo 10 recurrencias; validación con rechazo total (tolera un solo bloque markdown, largos en *code points*, `categoria` del resumen o «General»); reserva con el mismo formato de 1 a 3 sugerencias; sin clave, reserva sin consumir cupo; panel en «Alertas» después de recurrencias, a pedido con botón; aviso `2026-11` con ingreso y nombres de categorías, y ajuste justificado de 3 literales de pruebas de H12; sin `.env.example` (lo bloquea el hook `protect_secrets.sh`; las variables se documentan en `docs/tools_setup.md`); T35 aclara la regla 15 en `rules.md` («nombres de personas») si se aprueba el spec.
- `2026-11-15`: Spec de `H10` aprobado por Francisco. Estado cambiado a `in_progress`. Lanzando `implementer`.
- `2026-11-15` (`implementer`): T1–T6 listas. Errores `InvalidAdviceRequest`/`InvalidLlmResponse`/`LlmTimeout`/`LlmRequestFailed`, modelo `AdviceRequest`, contrato `AdviceRequestRepository` y `buildSpendingSummary` (lista blanca, top 8 + «Otros», `variacion_pct` null, 10 recurrencias a $100). 14 pruebas nuevas; `npm test` 170/170.
- `2026-11-15` (`implementer`): T7–T12 listas. Migración v4 (`advice_requests` con CHECK e índice), `SqliteAdviceRequestRepository`, `LocalStorageAdviceRequestRepository` (`fp_advice_requests`), 8 pruebas y `docs/data_model.md`. Desvío: la prueba `[H9-R6]` fijaba `user_version === 3`; con la v4 obligatoria se ajustaron sus 2 aserciones a `>= 3` (ver `progress/impl_h10_recomendaciones_ia.md`). `npm test` 178/178.
- `2026-11-15` (`implementer`): T13–T23 listas. `src/assistant/`: `LlmClient`, `readLlmConfig`, `prompt.js` (`h10-v1`), `HttpLlmClient` (Gemini REST, `x-goog-api-key`, `fetchImpl` inyectable; único archivo con red), `adviceResponse.js`, `fallbackAdvisor.js`, `AdviceService` (consentimiento → clave → datos → cupo → registro → timeout 10 s con `AbortController`). `FakeLlmClient` en `test/assistant/`. 38 pruebas nuevas sin red; `npm test` 216/216, ESLint limpio.
- `2026-11-15` (`implementer`): T24–T26 listas. `CURRENT_POLICY_VERSION = 2026-11` y nuevo texto de `thirdPartyTransfer` (Gemini, ingreso mensual, nombres de categorías). Ajustados solo los literales de versión vigente indicados en `design.md` (`consent.test.js`, `sqliteConsentRepository.test.js:34`, `PrivacyNoticeScreen.test.jsx:195`). Pruebas `[H10-R30]` y `[H10-R31]`.
- `2026-11-15` (`implementer`): T27–T33 listas. `loadSpendingSummary`, `RecommendationsPanel` (Mobile First + Desktop, botón de 44 px, estados idle/loading/ready, avisos de límite y configuración), panel al final de la pestaña «Alertas» (después de `RecurrencesPanel`), controlador con `advice`/`requestAdvice()`, `AppShell`/`App` con `LocalStorageAdviceRequestRepository` y `HttpLlmClient` solo con clave. Casos existentes de H5/H7/H8/H9/H13 sin cambios. `npm test` 232/232, ESLint limpio.
- `2026-11-15` (`implementer`): T34–T38 listas. Docs (`llm_assistant`, `privacy`, `architecture` D7, `tools_setup`) y regla 15 de `rules.md`. Regresión: H5/H7/H8/H13 sin cambios; H12 solo literales de T25; H9 con el ajuste documentado de `user_version`. `./init.sh` en verde (232/232, ESLint limpio, harness 139/139). Reporte en `progress/impl_h10_recomendaciones_ia.md`, trazabilidad actualizada. Pendiente: `reviewer` (no se marcó `done`).
- `2026-11-15`: `implementer` completó T1..T38 (`progress/impl_h10_recomendaciones_ia.md`, 232/232). `reviewer` emitió `APPROVED` en `progress/review_h10_recomendaciones_ia.md` y aceptó los desvíos (`[H9-R6]` con `>= 3`, sin `.env.example`). `H10` cerrada en `done`.

## Próximo paso

- Commits de H10 y PR de `feature/h10-recomendaciones-ia` hacia **desarrollo**.
- Validación del equipo del cambio en la regla 15 de `rules.md`.
- Siguiente feature: `H11 — h11_exportar_historial` (`orden: 13`).
