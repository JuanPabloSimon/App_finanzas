# Implementación — H10 `h10_recomendaciones_ia`

- **Estado:** `done` del implementer (pendiente de `reviewer`; **no** se marcó `done` en `feature_list.json`).
- **Herramienta / rol:** `antigravity` / `implementer`.
- **Rama:** `feature/h10-recomendaciones-ia` (sin commits ni push).
- **Spec:** `specs/h10_recomendaciones_ia/` (R1..R34), aprobado inicialmente por Francisco el 2026-11-15 y actualizado y aprobado por Juan Pablo el 2026-11-23 (migración a Groq API, cupo de 1 consulta diaria exitosa y no descontar intentos si la consulta falla).
- **Tareas:** T1..T38 marcadas `[x]` en `specs/h10_recomendaciones_ia/tasks.md`.

## Tareas

| Tarea | Resultado |
|---|---|
| T1 | `InvalidAdviceRequest`, `InvalidLlmResponse`, `LlmTimeout`, `LlmRequestFailed` en `src/core/errors.js` |
| T2–T3 | `AdviceRequest` (+ `ADVICE_SOURCES`, `DAILY_MODEL_REQUEST_LIMIT = 1`, alias `MONTHLY_MODEL_REQUEST_LIMIT = 1`) y contrato `AdviceRequestRepository` (`countByDate`, `countByYearMonth`, `save`) |
| T4 | `buildSpendingSummary` por lista blanca: top 8 + «Otros» (máx. 9), `variacion_pct` null, 10 recurrencias, `monto_tipico` a $100 |
| T5–T6 | Pruebas de dominio (`adviceRequest.test.js`, `spendingSummaryBuilder.test.js`) |
| T7 | `MIGRATION_V4_SQL` (`advice_requests` con CHECK e índice) + bloque `currentVersion < 4`; v1..v3 intactas |
| T8–T9 | `SqliteAdviceRequestRepository` (`countByDate` con `substr(created_at, 1, 10) = ?` y `countByYearMonth`) y `LocalStorageAdviceRequestRepository` (`fp_advice_requests`, `countByDate`, `countByYearMonth`, error de escritura propagado) |
| T10–T11 | Pruebas de persistencia (SQLite en memoria y `storage` falso sobre `Map`) |
| T12 | `docs/data_model.md`: CHECK, índice, semántica de `source`, `fp_advice_requests` |
| T13–T14 | `llmClient.js`, `llmConfig.js` (`llama-3.3-70b-versatile`, `https://api.groq.com/openai/v1`, `trim`, `''` → `null`), `prompt.js` (`h10-v1`, `RESPONSE_SCHEMA` congelado) |
| T15 | `HttpLlmClient` (Groq REST `/chat/completions`, `Authorization: Bearer`, `fetchImpl` inyectable). Único archivo con red |
| T16–T17 | `adviceResponse.js` (bloque markdown único, *code points*, rechazo total) y `fallbackAdvisor.js` (reglas 1..4) |
| T18 | `AdviceService`: promesa en curso reutilizada; consentimiento → clave → datos → cupo diario (`1/día` con `countByDate`); invocación con `AbortController` + temporizador inyectable + `clearTimer`; validación y registro `model` **solo ante respuesta válida** (si falla, registra `fallback` y no descuenta el intento diario) |
| T19 | `test/assistant/fakeLlmClient.js` (`succeeding`, `malformed`, `failing`, `hanging`, `calls`, `onCall`) |
| T20–T23 | Pruebas de `src/assistant/` (sin red) |
| T24 | `CURRENT_POLICY_VERSION = '2026-11'` y `thirdPartyTransfer` actualizado para Groq (texto literal de `design.md`) |
| T25 | Ajuste de literales de H12 exactamente como indica `design.md` |
| T26 | `[H10-R30]` (consent con mención a Groq) y `[H10-R31]` (bloqueo con solo `2026-10`) |
| T27–T28 | `adviceSummaryLoader.js` y `RecommendationsPanel.jsx` (Mobile First + Desktop, contador diario «Te quedan N de 1 consultas al asistente hoy») |
| T29 | `MonthlyOverviewScreen.jsx`: props nuevas, repositorio en memoria, `AdviceService`, panel después de `RecurrencesPanel` en «Alertas», controlador con `advice`/`requestAdvice()` |
| T30 | `AppShell.jsx` (props/opciones `llmClient`, `adviceRequestRepository`; reenvía `isConsentAccepted: () => hasValidConsent`) y `App.jsx` (`LocalStorageAdviceRequestRepository`, `readLlmConfig(import.meta.env ?? {})`, `HttpLlmClient` solo con clave) |
| T31–T33 | Pruebas del loader, del panel y casos nuevos al final de `MonthlyOverviewScreen.test.jsx` |
| T34 | `docs/llm_assistant.md`, `docs/privacy.md`, `docs/architecture.md` (D7), `docs/tools_setup.md` |
| T35 | `rules.md`, regla 15: «nombres **de personas**» y lista alineada con el contrato |
| T36 | Regresión verificada (ver «Desvíos» por `[H9-R6]`) |
| T37 | Este archivo y `progress/traceability.md` |
| T38 | `./init.sh` en verde |

## Archivos

### Creados

- `src/domain/models/adviceRequest.js`
- `src/domain/repositories/adviceRequestRepository.js`
- `src/domain/services/spendingSummaryBuilder.js`
- `src/data/repositories/sqliteAdviceRequestRepository.js`
- `src/data/repositories/localStorageAdviceRequestRepository.js`
- `src/assistant/llmClient.js`
- `src/assistant/llmConfig.js`
- `src/assistant/prompt.js`
- `src/assistant/httpLlmClient.js`
- `src/assistant/adviceResponse.js`
- `src/assistant/fallbackAdvisor.js`
- `src/assistant/adviceService.js`
- `src/features/advice/adviceSummaryLoader.js`
- `src/features/advice/RecommendationsPanel.jsx`
- `test/assistant/fakeLlmClient.js`
- `test/assistant/httpLlmClient.test.js`
- `test/assistant/adviceResponse.test.js`
- `test/assistant/fallbackAdvisor.test.js`
- `test/assistant/adviceService.test.js`
- `test/domain/models/adviceRequest.test.js`
- `test/domain/services/spendingSummaryBuilder.test.js`
- `test/data/sqliteAdviceRequestRepository.test.js`
- `test/data/localStorageAdviceRequestRepository.test.js`
- `test/features/advice/adviceSummaryLoader.test.js`
- `test/features/advice/RecommendationsPanel.test.jsx`

### Modificados

- `src/core/errors.js` (4 excepciones nuevas, al final)
- `src/data/db/appDatabase.js` (migración v4)
- `src/domain/models/consent.js` (versión `2026-11` y texto de transferencia)
- `src/features/income/MonthlyOverviewScreen.jsx` (solo agregados; `overview`, `monthly-advice-section` y `buildAdviceItems` sin tocar)
- `src/app/AppShell.jsx`, `src/App.jsx` (cableado)
- `test/domain/models/consent.test.js`, `test/data/sqliteConsentRepository.test.js`, `test/features/privacy/PrivacyNoticeScreen.test.jsx` (literales de T25 + casos nuevos)
- `test/features/income/MonthlyOverviewScreen.test.jsx` (solo un `describe` nuevo al final y 3 imports)
- `test/data/sqliteRecurrenceRepository.test.js` (2 aserciones, ver «Desvíos»)
- `docs/data_model.md`, `docs/llm_assistant.md`, `docs/privacy.md`, `docs/architecture.md`, `docs/tools_setup.md`, `rules.md`
- `specs/h10_recomendaciones_ia/tasks.md` (`[x]`), `progress/current.md`, `progress/traceability.md`

Sin dependencias nuevas en `package.json`. No se creó `.env.example` ni se tocó `.env`/`.gitignore`
(lo decide `design.md`, alternativa 7). Ningún archivo contiene una clave real: las pruebas usan
`'test-key'`.

## Trazabilidad R → prueba

| R | Pruebas (`[H10-R<n>]`) |
|---|---|
| R1 | `spendingSummaryBuilder.test.js` «tiene exactamente las claves del contrato…»; `adviceService.test.js` «entrega al LlmClient el resumen…»; `adviceSummaryLoader.test.js` «arma el resumen del período…» |
| R2 | `spendingSummaryBuilder.test.js` «no incluye notas, subcategorías, fechas ni identificadores…» |
| R3 | `httpLlmClient.test.js` «envía un único POST con solo el prompt versionado…», «codifica el modelo configurado…» |
| R4 | `spendingSummaryBuilder.test.js` «expresa los totales en pesos enteros…» |
| R5 | `spendingSummaryBuilder.test.js` (3 casos: más de 8, «Otros» real entre las 8, 8 o menos) |
| R6 | `spendingSummaryBuilder.test.js` (2 casos, incluido «Otros»); `adviceSummaryLoader.test.js` «una categoría nueva…» |
| R7 | `spendingSummaryBuilder.test.js` «incluye como máximo 10 recurrencias… redondea monto_tipico a $100» |
| R8 | `spendingSummaryBuilder.test.js` «con 20 categorías y 20 recurrencias… 6.000 caracteres» |
| R9 | `adviceService.test.js` «construir el servicio y consultar el cupo no invoca…»; `MonthlyOverviewScreen.test.jsx` «abrir la pantalla y la pestaña Alertas no invoca…» |
| R10 | `RecommendationsPanel.test.jsx` (2 casos); `adviceService.test.js` «una respuesta válida…»; `MonthlyOverviewScreen.test.jsx` «al pedir recomendaciones…» |
| R11 | `adviceResponse.test.js` «ADVICE_DISCLAIMER es el texto literal…»; `RecommendationsPanel.test.jsx` «muestra la advertencia orientativa…» |
| R12 | `adviceResponse.test.js` (acepta bloque único / rechaza texto antes o después) |
| R13 | `adviceResponse.test.js` «lanza InvalidLlmResponse…»; `adviceService.test.js` «una respuesta mal formada…» |
| R14 | `adviceResponse.test.js` (5 casos); `adviceService.test.js` «una categoría fuera del resumen…» |
| R15 | `adviceService.test.js` «a los 10.000 ms aborta…», «aunque el cliente ignore la señal…» |
| R16 | `httpLlmClient.test.js` (rechazo, 500, sin `candidates`; abort → `LlmTimeout`); `adviceService.test.js` «request_failed» |
| R17 | `adviceService.test.js` «[H10-R15][H10-R17] a los 10.000 ms aborta la señal…» |
| R18 | `fallbackAdvisor.test.js` (5 casos) |
| R19 | `RecommendationsPanel.test.jsx` «indica si las sugerencias vienen…»; `MonthlyOverviewScreen.test.jsx` «con una respuesta mal formada…» |
| R20 | `adviceService.test.js` «[H10-R20][H10-R21] con 4 consultas model…» |
| R21 | `adviceService.test.js` (mismo caso); `RecommendationsPanel.test.jsx` «con limit_reached…» |
| R22 | `adviceRequest.test.js` (3 casos); `sqliteAdviceRequestRepository.test.js` (2 casos); `adviceService.test.js` «toda invocación registra antes…», «si no se puede registrar…» |
| R23 | `adviceRequest.test.js` (2 casos); `adviceService.test.js` «sin cliente o con el límite alcanzado registra una fila fallback…» |
| R24 | `sqliteAdviceRequestRepository.test.js`; `localStorageAdviceRequestRepository.test.js`; `adviceService.test.js` «el cupo cuenta solo las filas model del mes local…» |
| R25 | `sqliteAdviceRequestRepository.test.js` (migración v3 → v4; persistencia entre instancias); `localStorageAdviceRequestRepository.test.js` (2 casos) |
| R26 | `RecommendationsPanel.test.jsx` «muestra cuántas consultas quedan…»; `MonthlyOverviewScreen.test.jsx` «el contador de consultas se actualiza…» |
| R27 | `adviceService.test.js` «dos solicitudes seguidas comparten la misma promesa…»; `RecommendationsPanel.test.jsx` «en loading el botón queda deshabilitado…» |
| R28 | `httpLlmClient.test.js` «readLlmConfig deja apiKey en null…»; `adviceService.test.js` «sin clave (llmClient null)…» |
| R29 | `adviceService.test.js` «sin consentimiento no invoca…» |
| R30 | `consent.test.js` «la versión vigente es 2026-11…» |
| R31 | `PrivacyNoticeScreen.test.jsx` «con solo el consentimiento 2026-10 no da acceso…» |
| R32 | `adviceService.test.js` «sin categorías ni recurrencias no invoca…» |
| R33 | `MonthlyOverviewScreen.test.jsx` «el panel de recomendaciones va después de recurrencias…» |
| R34 | `spendingSummaryBuilder.test.js` (fuente puro); `adviceResponse.test.js` (fuentes de validación, reserva y servicio); `adviceService.test.js` «un flujo completo con FakeLlmClient no usa fetch» |

## Salida resumida de `./init.sh`

```
[OK]    feature_list.json válido (13 features, 1 en curso)
[OK]    H10: spec completo (34 requisitos)
[OK]    H10: todos los requisitos tienen prueba etiquetada
[OK]    Trazabilidad (K6 parcial): 139 de 139 requisitos con prueba (100 %)
[OK]    Arnés consistente (0 advertencias).
[OK]    eslint sin problemas
# tests 232
# pass 232
# fail 0
[OK]    Todas las pruebas pasan
[OK]    Entorno listo. Podés empezar a trabajar.
```

Antes de H10: 156 pruebas. Se agregaron 76 (todas con etiqueta `[H10-R<n>]`).

## Desvíos respecto del diseño

1. **Prueba `[H9-R6]` en `test/data/sqliteRecurrenceRepository.test.js` (para el reviewer y el
   humano).** Esa prueba fijaba `user_version === 3` como versión final de la base. La migración
   v4 que exige T7/R25 hace imposible que esa aserción siga pasando, y T36 pedía las pruebas de H9
   «sin cambios»: el spec no anticipó el conflicto (sí lo hizo para los literales de H12). Se
   aplicó el ajuste mínimo, con el mismo criterio que el ajuste de H12: las 2 aserciones pasan de
   `assert.equal(Number(...user_version), 3)` a `assert.ok(Number(...user_version) >= 3)`. El
   comportamiento verificado por H9 (la migración 3 crea `dismissed_recurrences` y una base en
   versión 2 se actualiza sin perder gastos) se mantiene; el título del caso no se cambió. Si el
   equipo prefiere otra forma (por ejemplo, exportar la última versión como constante), se ajusta
   en la revisión.
2. **`.env.example`.** La consigna del leader mencionaba un `.env.example` con un placeholder,
   pero `design.md` (alternativa descartada 7) decide **no** crearlo porque el hook
   `protect_secrets.sh` bloquea `*.env.*`. Se siguió el diseño aprobado: las variables quedaron
   documentadas en `docs/tools_setup.md`.
3. **Detalles menores dentro del margen del diseño** (no cambian requisitos):
   - `AdviceService`: si `countByYearMonth` falla, devuelve la reserva con `storage_error` sin
     invocar (no hay garantía de cupo). Si falla el `save` del registro `model`, además de no
     invocar intenta registrar una fila `fallback` (R23); su fallo se ignora.
   - `fallbackAdvisor`: la regla 3 exige `ingreso_mensual > 0` para no dividir por cero (un
     ingreso de menos de 50 centavos redondea a 0 pesos).
   - `MonthlyOverviewScreen`: si `AdviceService` lanzara un error inesperado, el panel pasa a
     `ready` con la reserva (`request_failed`) en vez de quedar en `loading`.
   - `readLlmConfig` devuelve siempre `DEFAULT_LLM_BASE_URL` (el diseño solo define
     `VITE_LLM_API_KEY` y `VITE_LLM_MODEL`; no se inventó una variable para la URL).
   - `FakeLlmClient` acepta un `onCall` opcional para verificar que la fila `model` existe en el
     momento de invocar (T23, `[H10-R22]`).
   - El controlador de `MonthlyOverviewScreen` vuelve `advice` a `idle` (conservando el contador)
     en `goToPreviousMonth`/`goToNextMonth`, igual que el componente.
4. **Verificación manual pendiente (fuera de las pruebas, según `design.md` «Riesgos»):** CORS y
   latencia reales de Gemini desde el navegador con una clave de demo.
