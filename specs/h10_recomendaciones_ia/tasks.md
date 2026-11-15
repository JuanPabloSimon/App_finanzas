# Tasks — h10_recomendaciones_ia

> Pasos discretos y en orden. El implementer marca `[x]` al completar cada uno. Cada tarea
> indica qué requisitos cubre.
>
> - Rama: `feature/h10-recomendaciones-ia`.
> - Ninguna prueba usa red: se usan `FakeLlmClient` y un `fetchImpl` falso.
> - La persistencia se prueba con `AppDatabase.openInMemory()` o con un `storage` falso.

## Dominio

- [x] T1 — Agregar `InvalidAdviceRequest`, `InvalidLlmResponse`, `LlmTimeout` y
  `LlmRequestFailed` a `src/core/errors.js`, con el patrón de `InvalidRecurrence`.
  Cubre: R13, R15, R16, R22.
- [x] T2 — Crear `src/domain/models/adviceRequest.js` con `ADVICE_SOURCES`,
  `MONTHLY_MODEL_REQUEST_LIMIT = 4` y la clase `AdviceRequest`. Incluye validaciones,
  `Object.freeze`, `copyWith` e `isEqual`. Cubre: R20, R22, R23.
- [x] T3 — Crear el contrato `src/domain/repositories/adviceRequestRepository.js`
  (`countByYearMonth`, `save`), con el patrón de `recurrenceRepository.js`. Cubre: R22,
  R24.
- [x] T4 — Crear `src/domain/services/spendingSummaryBuilder.js` con las constantes,
  `centsToRoundedPesos`, `roundTypicalAmountPesos` y `buildSpendingSummary`, siguiendo el
  algoritmo de `design.md`.
  - El resumen se arma por lista blanca, con top 8 + «Otros», `variacion_pct` null y 10
    recurrencias como máximo.
  - Sin imports de `react`, `react-dom` ni `node:sqlite`, y sin `fetch`, `XMLHttpRequest`
    ni `axios`.

  Cubre: R1, R2, R4, R5, R6, R7, R8, R34.
- [x] T5 — Pruebas en `test/domain/models/adviceRequest.test.js`
  (`describe('H10 registro de consultas al asistente', ...)`):
  - `[H10-R22][H10-R23]` acepta `source` `model` y `fallback`; rechaza otro `source`, un
    `yearMonth` inválido y un `createdAt` no ISO con `InvalidAdviceRequest`; es inmutable;
    `MONTHLY_MODEL_REQUEST_LIMIT === 4`.

  Cubre: R22, R23.
- [x] T6 — Pruebas en `test/domain/services/spendingSummaryBuilder.test.js`
  (`describe('H10 resumen agregado', ...)`):
  - `[H10-R1]`: las claves de primer nivel, de cada `categorias[i]` y de cada
    `recurrencias[i]` son exactamente las del contrato (`Object.keys` ordenadas). El
    resultado está congelado.
  - `[H10-R2]`:
    - con gastos que tienen `note` «NOTA-SECRETA» y `subcategory` «SUB-SECRETA», el
      `JSON.stringify` del resumen no contiene esas marcas, ninguna fecha
      `/\d{4}-\d{2}-\d{2}/` ni las claves `id`, `categoryId`, `expenseIds`, `note`,
      `subcategory` o `date`;
    - una recurrencia con `expenseIds` no los filtra.
  - `[H10-R4]`:
    - 12345 centavos → 123;
    - 12350 → 124;
    - 12349 → 123;
    - `ingreso_mensual` en pesos o `null` sin ingreso;
    - `total_mes_anterior` es 0 sin gastos previos.
  - `[H10-R5]`:
    - con 10 categorías → 9 elementos: las 8 mayores y «Otros» con la suma de las 2
      restantes;
    - si «Otros» real está entre las 8 → 8 elementos y el resto se suma a ella;
    - con 8 o menos → sin agrupar;
    - los nombres no se repiten y `porcentaje` suma 100,0.
  - `[H10-R6]`:
    - una categoría sin gasto el mes anterior → `variacion_pct: null`;
    - con 400000 → 450000 → `12.5`;
    - «Otros» compara contra la suma previa de sus categorías agrupadas.
  - `[H10-R7]`:
    - 15 recurrencias → 10, en el orden recibido;
    - `monto_tipico` 645000 centavos → 6500;
    - 4000 centavos → 100.
  - `[H10-R8]`: 20 categorías y 20 recurrencias con nombres de 40 caracteres e importes de
    9 dígitos → `JSON.stringify(summary).length <= SUMMARY_MAX_CHARS` (6000).
  - `[H10-R34]`: el fuente de `spendingSummaryBuilder.js` no contiene `fetch(`,
    `XMLHttpRequest`, `axios`, `from 'react'`, `react-dom` ni `node:sqlite`.

  Cubre: R1, R2, R4, R5, R6, R7, R8, R34.

## Persistencia (SQLite y navegador)

- [x] T7 — En `src/data/db/appDatabase.js`, agregar `MIGRATION_V4_SQL` (`advice_requests`
  con CHECK de `source` e índice `idx_advice_requests_year_month`) y el bloque
  `if (currentVersion < 4)` con `PRAGMA user_version = 4;`. No modificar v1, v2 ni v3.
  Cubre: R22, R25.
- [x] T8 — Crear `src/data/repositories/sqliteAdviceRequestRepository.js`
  (`SqliteAdviceRequestRepository extends AdviceRequestRepository`, con el patrón de
  `SqliteRecurrenceRepository`; `countByYearMonth` con `SELECT COUNT(*) ... WHERE
  year_month = ? AND source = ?`). Cubre: R22, R24, R25.
- [x] T9 — Crear `src/data/repositories/localStorageAdviceRequestRepository.js`
  (`ADVICE_REQUESTS_STORAGE_KEY = 'fp_advice_requests'`, `storage` inyectado,
  `id = max + 1`, JSON inválido → vacío, error de escritura propagado). Cubre: R24, R25.
- [x] T10 — Pruebas en `test/data/sqliteAdviceRequestRepository.test.js`:
  - `[H10-R22]`: `save` de un `model` inserta una fila (verificada con `db.get`) con `id`
    asignado; un `source` inválido es rechazado.
  - `[H10-R24]`: con 2 `model` y 1 `fallback` en `2026-11` y 1 `model` en `2026-10`,
    `countByYearMonth('2026-11', 'model')` da 2.
  - `[H10-R25]`:
    - `PRAGMA user_version` es 4;
    - una base llevada a la versión 3 (`DROP TABLE advice_requests` + `PRAGMA user_version
      = 3`) con un gasto guardado vuelve a 4 con `migrate()`, recrea la tabla y conserva el
      gasto;
    - las filas persisten al crear otro repositorio sobre la misma base.

  Cubre: R22, R24, R25.
- [x] T11 — Pruebas en `test/data/localStorageAdviceRequestRepository.test.js`, con un
  `storage` falso sobre un `Map`:
  - `[H10-R25]`: `save` escribe `fp_advice_requests` y una instancia nueva sobre el mismo
    `storage` cuenta las filas; con JSON inválido cuenta 0 sin lanzar.
  - `[H10-R24]`: el conteo separa mes y `source`.

  Cubre: R24, R25.
- [x] T12 — Actualizar `docs/data_model.md`, sección `advice_requests`: CHECK, índice,
  semántica de `source` (`model` = invocación que consume cupo, `fallback` = reglas sin
  invocar) y la nota `fp_advice_requests`. La fila de la migración 4 ya existe.
  Cubre: R22, R25.

## Asistente (`src/assistant/`)

- [x] T13 — Crear `src/assistant/llmClient.js` (contrato `LlmClient.complete`) y
  `src/assistant/llmConfig.js` (`DEFAULT_LLM_MODEL = 'gemini-2.5-flash'`,
  `DEFAULT_LLM_BASE_URL`, `readLlmConfig(env)` con `trim` y `''` → `null`). Cubre: R3,
  R28.
- [x] T14 — Crear `src/assistant/prompt.js` (`PROMPT_VERSION = 'h10-v1'`, `SYSTEM_PROMPT`
  con rol, tarea, interpretación de `null` y redondeo, prohibiciones y formato con límites
  y categorías permitidas; `RESPONSE_SCHEMA` congelado). Cubre: R3, R14.
- [x] T15 — Crear `src/assistant/httpLlmClient.js`:
  - `HttpLlmClient extends LlmClient`;
  - `POST ${baseUrl}/models/${encodeURIComponent(model)}:generateContent`;
  - encabezados `Content-Type` y `x-goog-api-key` (la clave no va en la URL);
  - cuerpo con `systemInstruction`, `contents` y `generationConfig` (`responseMimeType:
    'application/json'` y `responseSchema`);
  - lectura de `candidates[0].content.parts[0].text`;
  - `LlmRequestFailed` ante red, HTTP no 2xx o cuerpo sin texto, y `LlmTimeout` si
    `signal` aborta;
  - `fetchImpl` inyectable.

  Es el **único** archivo con red. Cubre: R3, R16, R34.
- [x] T16 — Crear `src/assistant/adviceResponse.js`:
  - `ADVICE_DISCLAIMER` literal de `docs/llm_assistant.md`;
  - constantes de límites;
  - `textLength`, `allowedAdviceCategories`, `validateAdvice` y `parseAdviceResponse`,
    según `design.md`: un único bloque markdown envolvente, rechazo total, *code points* y
    `categoria` del resumen o «General».

  Cubre: R11, R12, R13, R14.
- [x] T17 — Crear `src/assistant/fallbackAdvisor.js` (`buildFallbackAdvice(summary)` con
  las reglas 1 a 4 y los textos de `design.md`, coma decimal, `formatCentsToArs` y nombres
  cortados a 40 en `detalle`). Cubre: R18.
- [x] T18 — Crear `src/assistant/adviceService.js`:
  - `ADVICE_TIMEOUT_MS = 10000`, `ADVICE_REASONS` y la clase `AdviceService`, con los
    pasos 0 a 9 de `design.md`;
  - promesa en curso reutilizada;
  - consentimiento, sin clave, sin datos y cupo, en ese orden;
  - registro `model` antes de invocar;
  - `AbortController` con temporizador inyectable y `clearTimer`;
  - `getRemainingModelRequests`.

  Cubre: R9, R13, R14, R15, R16, R17, R20, R21, R22, R23, R24, R27, R28, R29, R32.
- [x] T19 — Crear `test/assistant/fakeLlmClient.js` (`FakeLlmClient extends LlmClient`, con
  `succeeding`, `malformed`, `failing` y `hanging`, y `calls` registradas). No lleva el
  sufijo `.test.js`. Cubre: R15, R16, R13.
- [x] T20 — Pruebas en `test/assistant/httpLlmClient.test.js`, con un `fetchImpl` falso
  que captura `url` e `init`:
  - `[H10-R3]`:
    - un único `POST` a `.../v1beta/models/gemini-2.5-flash:generateContent`;
    - la URL no contiene la clave;
    - encabezados exactamente `Content-Type` y `x-goog-api-key: test-key`;
    - el cuerpo tiene exactamente `systemInstruction`, `contents` y `generationConfig`;
    - `contents[0].parts[0].text === JSON.stringify(summary)`;
    - `systemInstruction.parts[0].text === SYSTEM_PROMPT`;
    - `responseMimeType === 'application/json'`;
    - devuelve el texto de `candidates[0].content.parts[0].text`.
  - `[H10-R16]`: un `fetch` que rechaza, una respuesta 500 y un cuerpo sin `candidates`
    lanzan `LlmRequestFailed`; un `signal` abortado → `LlmTimeout`.
  - `[H10-R28]`: `readLlmConfig({})` y `readLlmConfig({ VITE_LLM_API_KEY: '  ' })` dan
    `apiKey: null`; `VITE_LLM_MODEL` reemplaza el modelo por defecto.

  Cubre: R3, R16, R28.
- [x] T21 — Pruebas en `test/assistant/adviceResponse.test.js`:
  - `[H10-R12]`: el JSON válido envuelto en ` ```json\n…\n``` ` o en ` ```\n…\n``` ` se
    acepta; el JSON con texto antes o después del bloque se rechaza.
  - `[H10-R13]`: `'hola'`, `'[]'`, `'null'`, `'{"otra":1}'` y `'{"sugerencias":{}}'` lanzan
    `InvalidLlmResponse`.
  - `[H10-R14]`:
    - 0 y 4 sugerencias se rechazan;
    - un `titulo` de 61 *code points* se rechaza y uno de 60 se acepta (incluye un emoji
      contado como 1);
    - un `detalle` de 281 se rechaza;
    - campos vacíos o de otro tipo se rechazan;
    - una `categoria` inexistente se rechaza; «general» y « delivery » se aceptan;
    - una respuesta con una sugerencia inválida entre dos válidas se rechaza entera;
    - las claves extra se ignoran.
  - `[H10-R11]`: `ADVICE_DISCLAIMER` es el texto literal del contrato.
  - `[H10-R34]`: los fuentes de `adviceResponse.js`, `fallbackAdvisor.js` y
    `adviceService.js` no contienen `fetch(`, `XMLHttpRequest` ni `axios`.

  Cubre: R11, R12, R13, R14, R34.
- [x] T22 — Pruebas en `test/assistant/fallbackAdvisor.test.js`:
  - `[H10-R18]`:
    - con variación positiva, recurrencia e ingreso → 3 sugerencias en el orden de las
      reglas, con los textos esperados (`12,5 %`, `$ 6.500`);
    - sin `variacion_pct` positiva → empieza por la recurrencia;
    - con `ingreso_mensual: null` → sin la regla 3;
    - con un resumen vacío → 1 sugerencia «General»;
    - un nombre de 80 caracteres respeta los 280;
    - toda salida pasa `validateAdvice(salida, summary)`.

  Cubre: R18.
- [x] T23 — Pruebas en `test/assistant/adviceService.test.js`, con `FakeLlmClient`, un
  repositorio SQLite en memoria (`SqliteAdviceRequestRepository`),
  `today: () => '2026-11-15'` y un `setTimer` falso que captura `ms` y la función:
  - `[H10-R1]`: `JSON.parse(fake.calls[0].userContent)` tiene exactamente las claves del
    contrato y es igual al resumen recibido.
  - `[H10-R9]`: construir el servicio y llamar a `getRemainingModelRequests()` no invoca al
    cliente (`calls.length === 0`).
  - `[H10-R13]`: `FakeLlmClient.malformed()` → `source: 'fallback'`, `reason:
    'invalid_response'`, con sugerencias de reserva.
  - `[H10-R15][H10-R17]`:
    - con `FakeLlmClient.hanging()`, el temporizador se programa con `ms === 10000`;
    - al dispararlo, el resultado es `fallback` / `timeout`;
    - `fake.calls[0].signal.aborted === true`.
  - `[H10-R16]`: `FakeLlmClient.failing()` → `fallback` / `request_failed`.
  - `[H10-R20][H10-R21]`: con 4 filas `model` en `2026-11` → no invoca; `reason:
    'limit_reached'`; `remainingModelRequests: 0`.
  - `[H10-R22]`:
    - una consulta exitosa deja 1 fila `model` en `2026-11`;
    - una con timeout, otra con error y otra mal formada también suman, y la cuarta deja
      `remaining` en 0;
    - la fila existe al momento de invocar (el fake cuenta las filas dentro de
      `complete`);
    - si `save` lanza, no invoca.
  - `[H10-R23]`: con `llmClient: null` o al alcanzar el límite se registra una fila
    `fallback` y `remaining` no cambia.
  - `[H10-R24]`: con 4 filas `model` en `2026-10` y `today` `2026-11-01` → invoca; con
    `today` `2026-10-31` → no invoca.
  - `[H10-R27]`: dos `requestAdvice` seguidos sin esperar → una sola invocación y la misma
    promesa.
  - `[H10-R28]`: con `llmClient: null` → `fallback` / `no_api_key`, sin consumir cupo.
  - `[H10-R29]`: con `isConsentAccepted: () => false` → no invoca, `no_consent`, sin
    filas.
  - `[H10-R32]`: con un resumen sin categorías ni recurrencias → no invoca, `no_data`.
  - `[H10-R34]`: con `globalThis.fetch` reemplazado por una función que lanza (restaurada
    en `finally`), un flujo completo con `FakeLlmClient` termina sin usarlo.

  Cubre: R1, R9, R13, R15, R16, R17, R20, R21, R22, R23, R24, R27, R28, R29, R32, R34.

## Aviso de privacidad (actualización de H12)

- [x] T24 — En `src/domain/models/consent.js`, poner `CURRENT_POLICY_VERSION = '2026-11'`
  y reemplazar `thirdPartyTransfer` por el texto de `design.md`. Cubre: R30, R31.
- [x] T25 — Ajustar los literales de la versión vigente en
  `test/domain/models/consent.test.js`, `test/data/sqliteConsentRepository.test.js:34` y
  `test/features/privacy/PrivacyNoticeScreen.test.jsx:195`, como indica la sección
  «Ajuste de pruebas de H12» de `design.md`. Sin cambiar el comportamiento verificado.
  Cubre: R31.
- [x] T26 — Pruebas nuevas:
  - En `test/domain/models/consent.test.js`, `[H10-R30]`: `CURRENT_POLICY_VERSION ===
    '2026-11'`, y `thirdPartyTransfer` menciona `/ingreso mensual/i`, `/nombres de tus
    categorías/i`, `/resumen agregado/i` y `/Gemini/`.
  - En `test/features/privacy/PrivacyNoticeScreen.test.jsx`, `[H10-R31]`: con solo un
    consentimiento `2026-10` guardado, `AppShell.createController(...).initialize()` deja
    `view: 'privacy_gate'` y `canAccessMainApp: false`; tras `acceptPrivacyNotice()` se
    guarda `2026-11`.

  Cubre: R30, R31.

## Presentación (pestaña «Alertas», Mobile First + Desktop)

- [x] T27 — Crear `src/features/advice/adviceSummaryLoader.js` (`loadSpendingSummary`:
  `findByYearMonth` del período y del mes anterior con `shiftYearMonth`, ingreso del
  período y `buildSpendingSummary`). Cubre: R1, R6.
- [x] T28 — Crear `src/features/advice/RecommendationsPanel.jsx`:
  - componente presentacional con `React.createElement` y `buildStyles`;
  - constantes de textos y estados `idle`, `loading` y `ready`;
  - avisos de límite y de configuración;
  - `data-testid` y estilos responsivos de `design.md`, con el botón en `minHeight: 44`.

  Cubre: R10, R11, R19, R21, R26.
- [x] T29 — Modificar `src/features/income/MonthlyOverviewScreen.jsx` según `design.md`:
  - props `llmClient`, `adviceRequestRepository`, `isConsentAccepted` e `initialAdvice`;
  - `createInMemoryAdviceRequestRepository`;
  - `AdviceService` en `useState`, carga de `remainingModelRequests` y reinicio a `idle`
    al cambiar de período;
  - `handleRequestAdvice` con la guarda de `loading`;
  - `RecommendationsPanel` **después** de `RecurrencesPanel` en `tab-panel-reminders`;
  - en el controlador: opciones, `advice`, `requestAdvice()`, `getState()` y
    `renderElement()`.

  No tocar `overview`, `monthly-advice-section` ni `buildAdviceItems`. Cubre: R9, R10,
  R19, R26, R27, R33.
- [x] T30 — Modificar `src/app/AppShell.jsx` (props y opciones `llmClient` y
  `adviceRequestRepository`, reenviadas con `isConsentAccepted`) y `src/App.jsx`
  (`LocalStorageAdviceRequestRepository(window.localStorage)`, `readLlmConfig(import.meta.env
  ?? {})` y `HttpLlmClient` solo con clave, si no `null`). Cubre: R25, R28, R29.
- [x] T31 — Pruebas en `test/features/advice/adviceSummaryLoader.test.js`, con
  `AppDatabase.openInMemory()`, `SqliteExpenseRepository`, `SqliteCategoryRepository` y
  `SqliteMonthlyIncomeRepository`:
  - `[H10-R1]`: con gastos de octubre y noviembre de 2026 e ingreso de noviembre, el
    resumen de `2026-11` tiene `periodo: '2026-11'`, `total_mes_anterior` de octubre e
    `ingreso_mensual`.
  - `[H10-R6]`: una categoría nueva en noviembre tiene `variacion_pct: null`.

  Cubre: R1, R6.
- [x] T32 — Pruebas en `test/features/advice/RecommendationsPanel.test.jsx`
  (`renderToStaticMarkup`):
  - `[H10-R10]`: con 3 sugerencias renderiza 3 `recommendation-item` con título, detalle y
    categoría. En 390 px → `data-layout="mobile"` y `data-columns="1"`; en 1280 px →
    `desktop` y `2`. `buildStyles(390)` da `minHeight: 44` al botón.
  - `[H10-R11]`: con `source` `model` y con `fallback` se muestra `recommendations-disclaimer`
    con `ADVICE_DISCLAIMER`.
  - `[H10-R19]`: `fallback` → `data-source="fallback"` con
    `RECOMMENDATIONS_SOURCE_FALLBACK_TEXT`; `model` → el texto de modelo.
  - `[H10-R21]`: `reason: 'limit_reached'` → `recommendations-limit-notice` con
    `role="status"`; otro `reason` no lo muestra.
  - `[H10-R26]`: `remainingModelRequests: 3` → «Te quedan 3 de 4 consultas al asistente
    este mes».
  - `loading` → botón con `disabled` y `aria-busy="true"`.

  Cubre: R10, R11, R19, R21, R26.
- [x] T33 — Casos nuevos al final de `test/features/income/MonthlyOverviewScreen.test.jsx`,
  con `MonthlyOverviewScreen.createController`, repositorios en memoria,
  `today: () => '2026-11-15'` y `FakeLlmClient`. Sin modificar los casos existentes:
  - `[H10-R33]`: la pestaña `reminders` renderiza `recommendations-panel` después de
    `recurrences-panel` (índices en el HTML); `overview` no contiene
    `recommendations-panel`; siguen existiendo 5 `tab-*`.
  - `[H10-R9]`: `initialize()` y `setActiveTab('reminders')` no invocan al fake.
  - `[H10-R10]`: con gastos y `FakeLlmClient.succeeding(<JSON con 2 sugerencias>)`,
    `requestAdvice()` deja `getState().advice` en `ready` / `model`, y la pestaña muestra 2
    `recommendation-item` y el disclaimer.
  - `[H10-R19]`: con `FakeLlmClient.malformed()`, la pestaña muestra
    `data-source="fallback"`.

  Cubre: R9, R10, R19, R33.

## Documentación

- [x] T34 — Actualizar `docs/llm_assistant.md` con lo resuelto en este spec:
  - proveedor y modelo configurables;
  - reglas del resumen («Otros» fuera de las 8, redondeo, `null`, 10 recurrencias,
    `monto_tipico` a $100);
  - validación (rechazo total, bloque markdown, *code points*, `categoria`);
  - qué consume cupo y el mes local;
  - formato de la reserva.

  Actualizar también `docs/privacy.md` (versión `2026-11`, «nombres» = personas,
  `monto_tipico` redondeado), `docs/architecture.md` (D7: Gemini por REST, `fetch`
  inyectable; alternativa SDK descartada) y `docs/tools_setup.md` (`VITE_LLM_API_KEY` y
  `VITE_LLM_MODEL` en `.env` local, cuota en Google AI Studio). Cubre: R3, R7, R14, R22.
- [x] T35 — En `rules.md`, regla 15: aclarar «nombres **de personas**» y alinear la lista
  con el contrato (período, totales, ingreso mensual, nombres de categorías, variaciones y
  recurrencias). Esta tarea queda autorizada por la aprobación humana de este spec. Cubre:
  R1, R30.

## Cierre

- [x] T36 — Verificar que las pruebas existentes de H5, H7, H8, H9 y H13 siguen en verde
  sin cambios, y que las de H12 solo tienen los ajustes de T25.
- [x] T37 — Documentar la trazabilidad R1..R34 → pruebas en
  `progress/impl_h10_recomendaciones_ia.md` y en `progress/traceability.md`.
- [x] T38 — Ejecutar `./init.sh` (o `powershell -ExecutionPolicy Bypass -File ./init.ps1`)
  y verificar que todo está en verde (harness, ESLint y pruebas).
