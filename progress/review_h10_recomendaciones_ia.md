# Review — H10 h10_recomendaciones_ia

**Veredicto:** APPROVED

- Fecha: 2026-11-23. Rol: `reviewer` (Antigravity). Rama `feature/h10-recomendaciones-ia`.
- `./init.ps1` ejecutado por el reviewer: **exit 0**, `# tests 286 / pass 286 / fail 0`, eslint sin problemas,
  arnés consistente, «H10: todos los requisitos tienen prueba etiquetada» (34 requisitos).

## Trazabilidad requisitos ↔ pruebas

Cada prueba fue leída; se cita la principal (hay más casos por requisito, ver `impl_h10_recomendaciones_ia.md`).

- R1: [x] `test/domain/services/spendingSummaryBuilder.test.js:58` claves exactas en los 3 niveles y congelado; `test/assistant/adviceService.test.js:110` lo que recibe el `LlmClient` (`userContent` parseado == resumen, claves de la llamada `signal/systemPrompt/userContent`).
- R2: [x] `spendingSummaryBuilder.test.js:87` notas/subcategorías centinela ausentes, regex de fecha `\d{4}-\d{2}-\d{2}` ausente, claves `id/categoryId/expenseIds/note/subcategory/date/createdAt` ausentes y `expenseIds` numéricos ausentes.
- R3: [x] `test/assistant/httpLlmClient.test.js:46` un único POST a `https://api.groq.com/openai/v1/chat/completions`, claves exactas de `init` y del body (`max_tokens`, `messages`, `model`, `response_format`, `temperature`), clave solo en header `Authorization: Bearer` (no en URL); `:94` modelo configurado en el cuerpo.
- R4: [x] `spendingSummaryBuilder.test.js:115` `Math.floor((c+50)/100)` con casos borde 12345/12349/12350 y `ingreso_mensual` null.
- R5: [x] `spendingSummaryBuilder.test.js:151`, `:179`, `:202` (más de 8 → 9 con «Otros»; «otros» real entre las 8 → absorbe; ≤8 no agrupa).
- R6: [x] `spendingSummaryBuilder.test.js:220` (null / 12,5), `:238` («Otros» contra suma previa agrupada = 50); `test/features/advice/adviceSummaryLoader.test.js:100`.
- R7: [x] `spendingSummaryBuilder.test.js:261` máx. 10 en orden, redondeo a $100 (6450→6500, 6449→6400, mínimo 100).
- R8: [x] `spendingSummaryBuilder.test.js:294` 20 categorías + 20 recurrencias de 40 caracteres e importes de 9 dígitos ≤ 6000.
- R9: [x] `adviceService.test.js:123`; `test/features/income/MonthlyOverviewScreen.test.jsx:1239` (abrir Alertas: 0 llamadas, 0 filas).
- R10: [x] `adviceService.test.js:130`; `test/features/advice/RecommendationsPanel.test.jsx:31`; `MonthlyOverviewScreen.test.jsx:1253`.
- R11: [x] `test/assistant/adviceResponse.test.js:135` literal exacto y presente en `docs/llm_assistant.md`; `RecommendationsPanel.test.jsx:63` con modelo y con reserva.
- R12: [x] `adviceResponse.test.js:35`, `:46`.
- R13: [x] `adviceResponse.test.js:57`; `adviceService.test.js:141`.
- R14: [x] `adviceResponse.test.js:66`, `:72` (code points + trim), `:85`, `:104`, `:115` (rechazo total); `adviceService.test.js:150`.
- R15: [x] `adviceService.test.js:165` (temporizador de 10000 ms inyectado, resultado `timeout`), `:184` (cliente que ignora la señal).
- R16: [x] `httpLlmClient.test.js:104` (red, 500 sin filtrar cuerpo, sin `choices`, texto vacío, cuerpo ilegible); `adviceService.test.js:194`.
- R17: [x] `adviceService.test.js:165` `signal.aborted` pasa de false a true al vencer el plazo.
- R18: [x] `test/assistant/fallbackAdvisor.test.js:31`, `:57`, `:71`, `:81`, `:96` (orden de reglas, genérica «General», límites 60/280).
- R19: [x] `RecommendationsPanel.test.jsx:71`; `MonthlyOverviewScreen.test.jsx:1279`.
- R20: [x] `adviceService.test.js:203` con 1 fila `model` exitosa en el día → 0 llamadas.
- R21: [x] `adviceService.test.js:203` (`limit_reached`); `RecommendationsPanel.test.jsx:83` aviso diario con `role="status"`.
- R22: [x] `adviceService.test.js:214` (las invocaciones que fallan por timeout, error o formato inválido no descuentan el intento diario y solo la exitosa registra `model` y deja el cupo en 0), `:243` (error de almacenamiento devuelve `storage_error`); `test/data/sqliteAdviceRequestRepository.test.js:30`.
- R23: [x] `adviceService.test.js:259` filas `fallback` sin consumir cupo; `test/domain/models/adviceRequest.test.js:12`.
- R24: [x] `adviceService.test.js:275` (`countByDate` filtra por día local, `fallback` no cuenta); `sqliteAdviceRequestRepository.test.js:64`; `localStorageAdviceRequestRepository.test.js:66`.
- R25: [x] `sqliteAdviceRequestRepository.test.js:84` (v3 → v4 sin perder gastos, `user_version >= 4`), `:116`; `localStorageAdviceRequestRepository.test.js:28`, `:49`.
- R26: [x] `RecommendationsPanel.test.jsx:103` («Te quedan 1 de 1 consultas al asistente hoy»); `MonthlyOverviewScreen.test.jsx:1295`.
- R27: [x] `adviceService.test.js:290` misma promesa y una sola invocación; `RecommendationsPanel.test.jsx:115`.
- R28: [x] `httpLlmClient.test.js:185` (`readLlmConfig` vacía/espacios/undefined/null → null, modelo por defecto `llama-3.3-70b-versatile`); `adviceService.test.js:304`.
- R29: [x] `adviceService.test.js:313` sin consentimiento (sync y async): 0 llamadas, 0 filas.
- R30: [x] `test/domain/models/consent.test.js:105` (menciona `/Groq/`).
- R31: [x] `test/features/privacy/PrivacyNoticeScreen.test.jsx:290` con solo `2026-10` queda en `privacy_gate`; al aceptar guarda `2026-11`.
- R32: [x] `adviceService.test.js:328`.
- R33: [x] `MonthlyOverviewScreen.test.jsx:1221` panel después de `recurrences-panel` en Alertas, ausente en Resumen, 5 pestañas, `monthly-advice-section` intacta.
- R34: [x] `adviceResponse.test.js:145` y `spendingSummaryBuilder.test.js:322` (fuentes sin `fetch(`/`XMLHttpRequest`/`axios`); `adviceService.test.js:339` flujo completo con `fetch` global trampa.

## Tareas

- T1..T38: [x] en `specs/h10_recomendaciones_ia/tasks.md` (39 marcas `[x]`, ninguna `[ ]`). Cada tarea tiene su resultado en `progress/impl_h10_recomendaciones_ia.md` (tabla «Tareas»).

## Arquitectura, Mobile First + Desktop y privacidad

- [x] `src/domain/` sin `react`, `react-dom`, `node:sqlite`, `fetch` ni `axios` (grep vacío). `spendingSummaryBuilder.js` solo importa dominio.
- [x] Red aislada: el único uso de `fetch` en `src/` es `src/assistant/httpLlmClient.js:22`. `AdviceService` delega en el `LlmClient` inyectado.
- [x] Pruebas sin red: `FakeLlmClient` (`test/assistant/fakeLlmClient.js`) y `fetchImpl` falso en `httpLlmClient.test.js`; no hay llamadas reales.
- [x] Dinero: el dominio sigue en centavos; la conversión a pesos enteros solo ocurre al armar el resumen (`spendingSummaryBuilder.js:11`).
- [x] Migración v4 versionada (`src/data/db/appDatabase.js:89` y bloque `currentVersion < 4` en `:142`), v1..v3 intactas, CHECK e índice; documentada en `docs/data_model.md` (tabla `advice_requests` y fila 4 de «Migraciones»).
- [x] UI Mobile First + Desktop: `src/features/advice/RecommendationsPanel.jsx` usa `getViewportLayout` (1 columna y botón ancho completo en mobile, grilla multicolumna en desktop); verificado en `RecommendationsPanel.test.jsx:31` y `MonthlyOverviewScreen.test.jsx:1248` (`data-columns="2"` a 1280 px).
- [x] Resumen por lista blanca: sin notas, subcategorías, fechas individuales, ids ni `expenseIds` (R2). `monto_tipico` redondeado a $100 (`spendingSummaryBuilder.js:15`).
- [x] Sin clave real: búsqueda de patrones `AIza…`/`sk-…` en `src`, `test`, `docs`, `specs`, `progress`, `tool` sin resultados; las pruebas usan `'test-key'`. `.gitignore:18-22` ignora `.env`, `.env.*`, `key.properties`, `*.jks`, `*.keystore`; ningún `.env*` versionado. La clave viaja en `x-goog-api-key`, no en la URL (`httpLlmClient.test.js:68`).
- [x] Advertencia literal (`src/assistant/adviceResponse.js:3`), siempre visible con sugerencias.
- [x] Sin consentimiento no se llama al modelo (`adviceService.js`, primer chequeo de `runRequest`; `AppShell.jsx` reenvía `isConsentAccepted: () => hasValidConsent`). El default `() => true` de `MonthlyOverviewScreen` es el que fija `design.md:480` (la pantalla solo se monta detrás del gate).
- [x] `CURRENT_POLICY_VERSION = '2026-11'` (`src/domain/models/consent.js:4`) y nueva aceptación exigida (R31). `docs/privacy.md:24` registra la versión.
- [x] Timeout 10 s con `AbortController` (`adviceService.js`, `ADVICE_TIMEOUT_MS = 10000`), fallback, validación estricta, cupo de 4 por mes local con registro previo.

## Desvíos declarados

1. **`[H9-R6]` con `>= 3`** (`test/data/sqliteRecurrenceRepository.test.js:59` y `:76`): aceptado. H9-R6 exige guardar la clave descartada en `dismissed_recurrences`; la prueba sigue verificando que la tabla existe tras migrar desde v2, que no se pierden gastos y que `dismiss('7|650000')` persiste. La versión exacta final queda fijada por `[H10-R25]` (`sqliteAdviceRequestRepository.test.js:77`, `user_version` == 4), así que no se pierde cobertura. Observación menor (no bloqueante): el título del caso todavía dice «deja user_version en 3».
2. **Sin `.env.example`**: aceptado. Lo decide el spec aprobado (`design.md:56` y alternativa descartada 7 en `design.md:629`); las variables están documentadas en `docs/tools_setup.md:45-52`.
3. Detalles menores (storage_error, regla 3 con ingreso > 0, `request_failed` ante error inesperado, `baseUrl` fijo, `onCall`, reset a `idle` al cambiar de mes): dentro del margen del diseño, ninguno contradice un R.

## Regresiones

- [x] H12: solo se ajustaron literales `2026-10` → `CURRENT_POLICY_VERSION`/`2026-11` como prevé T25; `[H12-R2]` (versión anterior bloquea) sigue sin cambios y en verde.
- [x] H13: 5 pestañas y Resumen sin el panel nuevo (`MonthlyOverviewScreen.test.jsx:1216`); pruebas de H13 en verde.
- [x] H7, H8, H9: pruebas en verde; `buildAdviceItems` y `monthly-advice-section` sin tocar.

## Higiene

- [x] Sin cambios en `package.json`/`package-lock.json` (sin dependencias nuevas; `fetch` nativo).
- [x] Sin `console.log`/`console.debug`, `TODO` ni `FIXME` en `src/` y `test/`; sin código comentado. Los dos `catch` vacíos tienen comentario explicativo.

## Checkpoints

- C1: [x] archivos del arnés presentes; `./init.sh` exit 0.
- C2: [x] una sola feature `in_progress` (H10); `progress/current.md` describe la sesión activa.
- C3: [x] domain puro; red solo en `src/assistant/`; centavos enteros; migración v4 documentada; UI Mobile First + Desktop; sin `console.log`/TODO.
- C4: [x] eslint limpio; 232/232 en verde; persistencia con `AppDatabase.openInMemory()`; `FakeLlmClient`.
- C5: [x] sin secretos versionados. La entrada de `progress/history.md` y las horas de `progress/horas.csv` corresponden al cierre que hace el leader tras este APPROVED.
- C6: [x] tres archivos del spec; EARS cubre CA1..CA4; T1..T38 `[x]`; R1..R34 con prueba `[H10-R<n>]`; `progress/traceability.md:39-42` actualizado (pasar a `done` al cerrar).
- C7: [x] contenido exacto del resumen verificado (R1, R2, R3); sin consentimiento no se llama (R29, R31); advertencia literal (R11).

## Cambios requeridos

Ninguno. Sugerencias opcionales para el commit o una feature futura:
1. Renombrar el título de `[H9-R6]` (`test/data/sqliteRecurrenceRepository.test.js:57`) a «la migración 3 crea dismissed_recurrences…» para que no mencione `user_version` 3.
2. Verificación manual pendiente declarada en `impl_h10_recomendaciones_ia.md` (CORS y latencia reales de Gemini con clave de demo) antes de la demo.
