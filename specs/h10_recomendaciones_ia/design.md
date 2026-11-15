# Design — h10_recomendaciones_ia

> Decisiones técnicas para H10. Se apoya en:
> - `docs/architecture.md`: D1 local, D2 proveedor aislado, D3 centavos;
> - `docs/llm_assistant.md` (contrato), `docs/privacy.md` y `docs/data_model.md`;
> - el código vigente tras H9 y las investigaciones `progress/explore_h10_*.md`.
>
> Proveedor y alcance del aviso: decisiones de Francisco del 2026-11-15.

## Archivos

| Capa | Archivo | Cambio |
|---|---|---|
| core | `src/core/errors.js` | Nuevas `InvalidAdviceRequest`, `InvalidLlmResponse`, `LlmTimeout`, `LlmRequestFailed` (extienden `DomainException`) |
| domain | `src/domain/models/adviceRequest.js` | Modelo inmutable `AdviceRequest` + `ADVICE_SOURCES`, `MONTHLY_MODEL_REQUEST_LIMIT = 4` |
| domain | `src/domain/repositories/adviceRequestRepository.js` | Contrato `AdviceRequestRepository` (`countByYearMonth`, `save`) |
| domain | `src/domain/services/spendingSummaryBuilder.js` | `buildSpendingSummary(...)`, función pura + constantes del resumen |
| domain | `src/domain/models/consent.js` | `CURRENT_POLICY_VERSION = '2026-11'` y nuevo texto de `thirdPartyTransfer` (R30) |
| data | `src/data/db/appDatabase.js` | `MIGRATION_V4_SQL` + bloque `if (currentVersion < 4)` → `PRAGMA user_version = 4` |
| data | `src/data/repositories/sqliteAdviceRequestRepository.js` | `SqliteAdviceRequestRepository` |
| data | `src/data/repositories/localStorageAdviceRequestRepository.js` | `LocalStorageAdviceRequestRepository` (clave `fp_advice_requests`) |
| assistant | `src/assistant/llmClient.js` | Contrato `LlmClient` |
| assistant | `src/assistant/llmConfig.js` | `readLlmConfig(env)`: clave, modelo y URL base desde `import.meta.env` |
| assistant | `src/assistant/httpLlmClient.js` | `HttpLlmClient extends LlmClient` (Gemini REST, `fetch` inyectable). **Único** archivo con red |
| assistant | `src/assistant/prompt.js` | `PROMPT_VERSION`, `SYSTEM_PROMPT`, `RESPONSE_SCHEMA` |
| assistant | `src/assistant/adviceResponse.js` | `parseAdviceResponse(rawText, summary)`, `validateAdvice(advice, summary)`, `ADVICE_DISCLAIMER`, límites |
| assistant | `src/assistant/fallbackAdvisor.js` | `buildFallbackAdvice(summary)` |
| assistant | `src/assistant/adviceService.js` | `AdviceService`: consentimiento, clave, datos, cupo, registro, timeout, validación y reserva |
| presentation | `src/features/advice/adviceSummaryLoader.js` | `loadSpendingSummary(...)`: lee el mes, el mes anterior y el ingreso, y delega en el builder |
| presentation | `src/features/advice/RecommendationsPanel.jsx` | Componente presentacional Mobile First + Desktop |
| presentation | `src/features/income/MonthlyOverviewScreen.jsx` | Props `llmClient`, `adviceRequestRepository`, `isConsentAccepted`, `initialAdvice`; repositorio en memoria de reserva; panel al final de `tab-panel-reminders`; controlador con `advice` y `requestAdvice()` |
| app | `src/app/AppShell.jsx` | Props y opciones `llmClient` y `adviceRequestRepository`; reenvía las dos e `isConsentAccepted` a `MonthlyOverviewScreen` |
| app | `src/App.jsx` | `createBrowserRepositories()` agrega `adviceRequestRepo` y `llmClient` (o `null` sin clave) |
| docs | `docs/data_model.md` | `advice_requests`: CHECK, índice, semántica de `source` y `fp_advice_requests` |
| docs | `docs/llm_assistant.md` | Proveedor, reglas del resumen, validación, cupo y formato de la reserva (lo resuelto acá) |
| docs | `docs/privacy.md` | Versión `2026-11`, «nombres» = personas, `monto_tipico` redondeado |
| docs | `docs/architecture.md` | Nueva decisión D7 (Gemini vía REST) y `httpLlmClient.js` con el proveedor elegido |
| docs | `docs/tools_setup.md` | Variables `VITE_LLM_API_KEY` y `VITE_LLM_MODEL` para `.env` local |
| docs | `rules.md` | Regla 15: «nombres **de personas**» y lista completa del contrato (aprobación humana del spec) |
| test | `test/assistant/fakeLlmClient.js` | `FakeLlmClient` (no es archivo `*.test.js`) |
| test | `test/domain/models/adviceRequest.test.js` | R22, R23 |
| test | `test/domain/services/spendingSummaryBuilder.test.js` | R1, R2, R4, R5, R6, R7, R8, R34 |
| test | `test/data/sqliteAdviceRequestRepository.test.js` | R22, R24, R25 (incluye la migración v3 → v4) |
| test | `test/data/localStorageAdviceRequestRepository.test.js` | R24, R25 |
| test | `test/assistant/httpLlmClient.test.js` | R3, R16, R28 |
| test | `test/assistant/adviceResponse.test.js` | R12, R13, R14, R34 |
| test | `test/assistant/fallbackAdvisor.test.js` | R18, R34 |
| test | `test/assistant/adviceService.test.js` | R1, R9, R13, R15, R16, R17, R20, R21, R22, R23, R24, R27, R28, R29, R32, R34 |
| test | `test/features/advice/adviceSummaryLoader.test.js` | R1, R6 (con `AppDatabase.openInMemory()`) |
| test | `test/features/advice/RecommendationsPanel.test.jsx` | R10, R11, R19, R21, R26 |
| test | `test/features/income/MonthlyOverviewScreen.test.jsx` | Casos nuevos `[H10-R9]`, `[H10-R10]`, `[H10-R19]`, `[H10-R33]` al final |
| test | `test/domain/models/consent.test.js`, `test/data/sqliteConsentRepository.test.js`, `test/features/privacy/PrivacyNoticeScreen.test.jsx` | Ajuste de los literales `'2026-10'` y casos nuevos `[H10-R30]` y `[H10-R31]` (ver «Ajuste de pruebas de H12») |

**No se agregan dependencias** a `package.json`: `fetch` nativo del navegador.

**No se crea `.env.example`.** El hook `.claude/hooks/protect_secrets.sh` bloquea la
edición de `*.env.*`, y `.gitignore` ignora `.env.*`. Las variables se documentan en
`docs/tools_setup.md` y `.gitignore` no cambia.

## Firmas nuevas

```javascript
// src/core/errors.js
export class InvalidAdviceRequest extends DomainException { /* 'Registro de consulta al asistente inválido' */ }
export class InvalidLlmResponse extends DomainException { /* 'La respuesta del asistente no respeta el formato' */ }
export class LlmTimeout extends DomainException { /* 'El asistente no respondió a tiempo' */ }
export class LlmRequestFailed extends DomainException { /* 'No se pudo consultar al asistente' */ }

// src/domain/models/adviceRequest.js
export const ADVICE_SOURCES = Object.freeze(['model', 'fallback']);
export const MONTHLY_MODEL_REQUEST_LIMIT = 4;
export class AdviceRequest {
  constructor({ id = null, yearMonth, source, createdAt }) {
    // id: null o entero > 0; yearMonth: isValidYearMonth; source ∈ ADVICE_SOURCES;
    // createdAt: isValidIsoDateTime. Si no, InvalidAdviceRequest. Object.freeze(this).
  }
  copyWith(changes) {}
  isEqual(other) {}
}

// src/domain/repositories/adviceRequestRepository.js
export class AdviceRequestRepository {
  /** @returns {Promise<number>} filas con ese year_month y ese source */
  async countByYearMonth(_yearMonth, _source = 'model') { throw new Error('Not implemented'); }
  /** @returns {Promise<AdviceRequest>} con id asignado */
  async save(_adviceRequest) { throw new Error('Not implemented'); }
}

// src/domain/services/spendingSummaryBuilder.js (puro: sin react, node:sqlite ni fetch)
export const SUMMARY_CURRENCY = 'ARS';
export const SUMMARY_MAX_CATEGORIES = 8;
export const SUMMARY_OTHERS_NAME = 'Otros';
export const SUMMARY_MAX_RECURRENCES = 10;
export const TYPICAL_AMOUNT_ROUNDING_PESOS = 100;
export const SUMMARY_MAX_CHARS = 6000;
export function centsToRoundedPesos(cents) {}          // Math.floor((cents + 50) / 100)
export function roundTypicalAmountPesos(cents) {}      // múltiplo de 100 más cercano, mínimo 100
/**
 * @param {{ yearMonth: string, expenses: Expense[], previousExpenses: Expense[],
 *           categories: Category[], monthlyIncome: MonthlyIncome|null,
 *           recurrences: ReadonlyArray<Recurrence> }} input
 * @returns {Readonly<SpendingSummary>} objeto congelado (arreglos y elementos incluidos)
 */
export function buildSpendingSummary(input) {}

// src/assistant/llmClient.js
export class LlmClient {
  /**
   * @param {{ systemPrompt: string, userContent: string, signal: AbortSignal }} request
   * @returns {Promise<string>} texto crudo devuelto por el modelo
   * @throws {LlmRequestFailed} red, HTTP no 2xx o cuerpo sin texto
   */
  async complete(_request) { throw new Error('Not implemented'); }
}

// src/assistant/llmConfig.js
export const DEFAULT_LLM_MODEL = 'gemini-2.5-flash';
export const DEFAULT_LLM_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
/** @returns {Readonly<{ apiKey: string|null, model: string, baseUrl: string }>} */
export function readLlmConfig(env = {}) {}  // VITE_LLM_API_KEY (trim, '' → null), VITE_LLM_MODEL

// src/assistant/httpLlmClient.js
export class HttpLlmClient extends LlmClient {
  constructor({ apiKey, model = DEFAULT_LLM_MODEL, baseUrl = DEFAULT_LLM_BASE_URL,
                fetchImpl = (...args) => globalThis.fetch(...args) }) {}
  async complete({ systemPrompt, userContent, signal }) {}
}

// src/assistant/prompt.js
export const PROMPT_VERSION = 'h10-v1';
export const SYSTEM_PROMPT = `...`;     // texto en «Instrucciones al modelo»
export const RESPONSE_SCHEMA = Object.freeze({ /* ver «Proveedor» */ });

// src/assistant/adviceResponse.js
export const ADVICE_DISCLAIMER =
  'Estas sugerencias son orientativas y se generan automáticamente a partir de tus datos. No constituyen asesoramiento financiero profesional.';
export const ADVICE_MIN_SUGGESTIONS = 1;
export const ADVICE_MAX_SUGGESTIONS = 3;
export const ADVICE_TITLE_MAX = 60;
export const ADVICE_DETAIL_MAX = 280;
export const ADVICE_GENERAL_CATEGORY = 'General';
export function textLength(text) {}                       // Array.from(text.trim()).length
export function allowedAdviceCategories(summary) {}       // Set en minúsculas (es)
/** @returns {Readonly<{ sugerencias: ReadonlyArray<{titulo, detalle, categoria}> }>} @throws InvalidLlmResponse */
export function validateAdvice(advice, summary) {}
/** Quita un único bloque ```/```json envolvente (R12), JSON.parse y validateAdvice. @throws InvalidLlmResponse */
export function parseAdviceResponse(rawText, summary) {}

// src/assistant/fallbackAdvisor.js
/** @returns {Readonly<{ sugerencias: [...] }>} 1..3 elementos que pasan validateAdvice */
export function buildFallbackAdvice(summary) {}

// src/assistant/adviceService.js
export const ADVICE_TIMEOUT_MS = 10000;
export const ADVICE_REASONS = Object.freeze({
  MODEL_OK: 'model_ok', TIMEOUT: 'timeout', INVALID_RESPONSE: 'invalid_response',
  REQUEST_FAILED: 'request_failed', LIMIT_REACHED: 'limit_reached', NO_API_KEY: 'no_api_key',
  NO_CONSENT: 'no_consent', NO_DATA: 'no_data', STORAGE_ERROR: 'storage_error',
});
export class AdviceService {
  constructor({
    llmClient = null,                 // null = sin clave (R28)
    adviceRequestRepository,          // AdviceRequestRepository
    isConsentAccepted = () => false,  // () => boolean | Promise<boolean>
    today = () => formatIsoDate(new Date()),  // 'YYYY-MM-DD' local
    now = () => new Date(),
    timeoutMs = ADVICE_TIMEOUT_MS,
    setTimer = (fn, ms) => setTimeout(fn, ms),
    clearTimer = (id) => clearTimeout(id),
    monthlyLimit = MONTHLY_MODEL_REQUEST_LIMIT,
  }) {}
  /** @returns {Promise<number>} max(0, limit − count(mes de la consulta, 'model')) */
  async getRemainingModelRequests() {}
  /**
   * @param {Readonly<SpendingSummary>} summary
   * @returns {Promise<Readonly<{ suggestions, source: 'model'|'fallback', reason, remainingModelRequests }>>}
   */
  async requestAdvice(summary) {}
}

// src/features/advice/adviceSummaryLoader.js
export async function loadSpendingSummary({
  expenseRepository, incomeRepository, categories = [], yearMonth, recurrences = [],
}) {}  // findByYearMonth(yearMonth), findByYearMonth(shiftYearMonth(yearMonth, -1)), findByYearMonth del ingreso

// src/features/advice/RecommendationsPanel.jsx
export const RECOMMENDATIONS_SOURCE_FALLBACK_TEXT = 'Sugerencias generadas por reglas (respuesta de reserva).';
export const RECOMMENDATIONS_SOURCE_MODEL_TEXT = 'Sugerencias generadas por el asistente.';
export const RECOMMENDATIONS_LIMIT_TEXT =
  'Alcanzaste el límite de 4 consultas al asistente de este mes. Te mostramos sugerencias generadas por reglas.';
export const RECOMMENDATIONS_NO_API_KEY_TEXT =
  'El asistente no está configurado en este entorno. Te mostramos sugerencias generadas por reglas.';
export function RecommendationsPanel({
  status = 'idle',            // 'idle' | 'loading' | 'ready'
  suggestions = [], source = null, reason = null,
  remainingModelRequests = 4, monthlyLimit = 4,
  onRequest = null, viewportWidth = 390,
}) {}
RecommendationsPanel.buildStyles = buildRecommendationsPanelStyles;
```

```javascript
// test/assistant/fakeLlmClient.js
export class FakeLlmClient extends LlmClient {
  static succeeding(text) {}            // resuelve con text
  static malformed(text = 'no es json') {}
  static failing(error = new LlmRequestFailed()) {}
  static hanging() {}                    // no resuelve; rechaza con LlmTimeout solo si signal aborta
  calls = [];                            // [{ systemPrompt, userContent, signal }]
}
```

## Resumen agregado (`buildSpendingSummary`)

1. `breakdown = calculateCategoryIncomeBreakdown(expenses, categories, null)`.
   `previous = calculateCategoryIncomeBreakdown(previousExpenses, categories, null)`.
   Solo entran categorías con gasto mayor a 0 en el período. Una categoría con gasto solo
   en el mes anterior no aparece.
2. **Top 8 + «Otros» (R5).**
   - Si `breakdown.length <= 8`, todos los elementos van tal cual. Una categoría real
     llamada «Otros» queda como una más.
   - Si hay más de 8, los 8 primeros quedan individuales y el resto se agrupa.
     - Si alguno de los 8 se llama «Otros» (`toLocaleLowerCase('es')`), el resto se suma a
       ese elemento.
     - Si no, se agrega un noveno elemento «Otros».
   - El grupo «Otros» suma `amountCents`. Su porcentaje es la suma en décimas de los
     `expensePercentage` agrupados, así que el total sigue en 100. El conjunto de
     `categoryId` agrupados se usa para la variación.
   - **«Otros» no cuenta dentro de las 8.** `categorias` tiene como máximo 9 elementos.
3. `porcentaje`: `expensePercentage` del breakdown, con 1 decimal (H6). `total`:
   `centsToRoundedPesos(amountCents)`. El redondeo es por elemento, así que la suma de
   `total` puede diferir de `total_mes` en unos pocos pesos. Se acepta.
4. **`variacion_pct` (R6):**
   - `prevCents` es la suma de `previous` para el `categoryId` del elemento, o para el
     conjunto agrupado en «Otros».
   - Si `prevCents === 0`, el valor es `null`.
   - Si no, es `calculateVariationTenths(actualCents, prevCents) / 10`, con 1 decimal (H7).
5. `total_mes` y `total_mes_anterior`: suma en centavos de `expenses` y de
   `previousExpenses`, en pesos enteros. Sin gastos en el mes anterior, el valor es `0`.
6. `ingreso_mensual`: `centsToRoundedPesos(monthlyIncome.amountCents)` o `null` si no hay
   ingreso registrado.
7. **`recurrencias` (R7):**
   - Se toman las primeras 10 de `recurrences`. Son las visibles, ya filtradas por
     `filterDismissedRecurrences` y ordenadas por H9.
   - Cada una se mapea a `{ categoria: categoryName, monto_tipico:
     roundTypicalAmountPesos(typicalAmountCents), veces_en_60_dias: occurrences }`.
   - **Nunca** se copian `categoryId`, `expenseIds` ni `key`.
   - La ventana de 60 días es la de H9: termina en `today()`. No depende del período
     navegado.
8. El objeto se arma **por lista blanca** (literales con las claves del contrato), no
   copiando objetos del dominio. Así no hay forma de que se filtren `note`, `subcategory`,
   `date`, `id`, `createdAt` ni `expenseIds` (R1, R2).
9. Todo se congela. `SUMMARY_MAX_CHARS` queda como constante probada por R8. No se trunca
   en tiempo de ejecución: los topes de 9 categorías y 10 recurrencias ya acotan el tamaño.

`roundTypicalAmountPesos(cents)`:
`pesos = centsToRoundedPesos(cents)` → `Math.max(100, Math.floor((pesos + 50) / 100) * 100)`.
Ejemplos: 650000 centavos ($6.500) → 6500; 645000 ($6.450) → 6500; 4000 ($40) → 100.

## Proveedor: Google Gemini (Flash) por REST

Configuración (`llmConfig.js`), sin valores secretos en el código:

| Variable | Uso | Valor por defecto |
|---|---|---|
| `VITE_LLM_API_KEY` | Clave de Google AI Studio. Vacía o ausente = sin asistente (R28) | ninguna |
| `VITE_LLM_MODEL` | Nombre del modelo | `gemini-2.5-flash` (`DEFAULT_LLM_MODEL`) |

- **Endpoint:** `POST ${baseUrl}/models/${model}:generateContent`, con `baseUrl` =
  `https://generativelanguage.googleapis.com/v1beta` (`DEFAULT_LLM_BASE_URL`).
  - El nombre del modelo se codifica con `encodeURIComponent`.
- **Encabezados:** solo `Content-Type: application/json` y `x-goog-api-key: <clave>`.
  - La clave va en el encabezado y **no** en la URL, para que no quede en historiales ni
    registros.
  - No se envían encabezados con datos del usuario. El navegador agrega por su cuenta
    `User-Agent` y `Origin`, que la app no controla y que no se pueden quitar desde `fetch`.
- **Cuerpo (R3).** Tiene exactamente estas tres claves de primer nivel:
  ```json
  {
    "systemInstruction": { "parts": [{ "text": "<SYSTEM_PROMPT>" }] },
    "contents": [{ "role": "user", "parts": [{ "text": "<JSON.stringify(summary)>" }] }],
    "generationConfig": {
      "responseMimeType": "application/json",
      "responseSchema": "<RESPONSE_SCHEMA>",
      "temperature": 0.4,
      "maxOutputTokens": 1024
    }
  }
  ```
  - `RESPONSE_SCHEMA` pide JSON estructurado (la API lo permite):
    `{ type: 'OBJECT', properties: { sugerencias: { type: 'ARRAY', minItems: 1, maxItems: 3,
    items: { type: 'OBJECT', properties: { titulo: {type:'STRING'}, detalle:
    {type:'STRING'}, categoria: {type:'STRING'} }, required: ['titulo','detalle','categoria'] } } },
    required: ['sugerencias'] }`.
  - Aun así, la respuesta **siempre** pasa por `parseAdviceResponse`: el esquema del
    proveedor no se toma como garantía.
- **Respuesta.** Se lee `candidates[0].content.parts[0].text`.
  - Si `fetch` rechaza (red) → `LlmRequestFailed`.
  - Si `!response.ok` → `LlmRequestFailed`, con el estado HTTP en el mensaje y sin el
    cuerpo.
  - Si no hay texto → `LlmRequestFailed` (R16).
  - Si `signal` aborta → se propaga como `LlmTimeout`.
- `fetchImpl` se inyecta. Por defecto es `(...args) => globalThis.fetch(...args)`, con
  *arrow* para evitar el «Illegal invocation» del navegador. Las pruebas pasan una función
  falsa que captura `url` e `init` y nunca sale a la red.

## Instrucciones al modelo (`prompt.js`, `PROMPT_VERSION = 'h10-v1'`)

`SYSTEM_PROMPT` (texto en español rioplatense) establece:
- **Rol:** asistente de finanzas personales para Argentina, con tono claro y respetuoso.
- **Tarea:** entre 1 y 3 sugerencias concretas para reducir gasto no deseado, basadas
  **solo** en el resumen JSON que recibe.
- **Interpretación del resumen:**
  - los montos están en pesos argentinos enteros;
  - `variacion_pct: null` significa que no hay datos del mes anterior;
  - `ingreso_mensual: null` significa que no hay ingreso registrado;
  - `monto_tipico` está redondeado a $100.
- **Prohibiciones:** recomendar productos financieros, inversiones o créditos; pedir datos
  personales; afirmar certezas.
- **Formato:** responder solo con
  `{"sugerencias":[{"titulo","detalle","categoria"}]}`, con `titulo` de hasta 60
  caracteres y `detalle` de hasta 280. `categoria` tiene que ser exactamente un `nombre` de
  `categorias`, una `categoria` de `recurrencias` o «General». Sin texto fuera del JSON.

## Validación de la respuesta (`parseAdviceResponse`)

1. Si `rawText` no es `string`, se rechaza.
2. Se hace `trim()`. Si el texto completo coincide con
   `^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$` (un único bloque envolvente), se usa el
   contenido (R12). Otro texto antes o después del JSON no se tolera.
3. Se aplica `JSON.parse`. Si falla, o si el resultado no es un objeto (o es `null` o un
   arreglo), o si `sugerencias` no es un arreglo, se lanza `InvalidLlmResponse` (R13).
4. `validateAdvice` (R14) verifica:
   - que haya entre 1 y 3 elementos;
   - que cada uno sea un objeto con `titulo`, `detalle` y `categoria` de tipo `string`;
   - que `textLength(titulo)` esté en 1..60 y `textLength(detalle)` en 1..280;
   - que `categoria.trim().toLocaleLowerCase('es')` esté en `allowedAdviceCategories(summary)`.

   Ante **cualquier** incumplimiento, rechaza toda la respuesta: no recorta, no filtra
   elementos y no corrige mayúsculas. Ignora las claves extra (no se muestran). Devuelve
   copias congeladas con los textos ya pasados por `trim()`.
5. Los textos se muestran como texto de React (escapado). Nunca se usa
   `dangerouslySetInnerHTML`.

## Respuesta de reserva (`buildFallbackAdvice`)

Es una función pura sobre el **mismo resumen** (no usa repositorios). Su salida tiene el
formato `{ sugerencias: [...] }`, con 1 a 3 elementos que pasan `validateAdvice(..., summary)`.
Reglas en orden (R18):

1. **Mayor variación positiva.** Es la primera categoría con el máximo `variacion_pct > 0`
   (los `null` se ignoran).
   - `titulo`: «Subió el gasto en una categoría».
   - `detalle`: «<nombre> aumentó <v> % respecto del mes anterior (<$ total> este mes).
     Revisá si ese aumento fue planificado.».
   - `categoria`: el `nombre`.
2. **Recurrencias.** Si `recurrencias` no está vacío, se usa la primera.
   - `titulo`: «Revisá tus gastos repetidos».
   - `detalle`: «Detectamos <veces> gastos de alrededor de <$ monto_tipico> en <categoria>
     en los últimos 60 días. Evaluá si todos siguen siendo necesarios.».
   - `categoria`: la de la recurrencia.
3. **Peso sobre el ingreso.** Si `ingreso_mensual` no es `null` y hay categorías, se usa
   `categorias[0]` con `p = Math.round(total × 1000 / ingreso_mensual) / 10`.
   - `titulo`: «Peso de tu categoría principal».
   - `detalle`: «<nombre> representa el <p> % de tu ingreso mensual registrado. Definí un
     tope para esa categoría el mes que viene.».
   - `categoria`: el `nombre`.
4. **Sin reglas aplicables.** Si no aplicó ninguna, se usa una sola sugerencia:
   - `titulo`: «Registrá tus movimientos del mes».
   - `detalle`: «Todavía no hay datos suficientes para darte sugerencias. Registrá tus
     gastos y tu ingreso mensual para recibir recomendaciones.».
   - `categoria`: «General».

Formato de los valores:
- Los porcentajes llevan coma decimal (`12,5`).
- Los montos usan `formatCentsToArs(pesos × 100)`, por ejemplo `$ 98.000`.
- En `detalle`, los nombres de más de 40 *code points* se cortan a 39 y se agrega «…», para
  respetar los 280. `categoria` lleva siempre el nombre completo.

No se reutiliza `buildAdviceItems` de `MonthlyOverviewScreen` (ver alternativas).

## Orquestación (`AdviceService.requestAdvice(summary)`)

`yearMonth = extractYearMonth(today())` es el mes local de la consulta (R24). Pasos:

0. Si hay una solicitud en curso, devuelve **la misma promesa** (R27).
1. Sin consentimiento (`await isConsentAccepted()` falso) → reserva, `reason: no_consent`.
   No registra nada ni invoca al cliente (R29).
2. `llmClient === null` → reserva, `no_api_key`. Registra `fallback` (R28, R23).
3. `categorias` y `recurrencias` vacíos → reserva, `no_data`. Registra `fallback` (R32,
   R23).
4. `countByYearMonth(yearMonth, 'model') >= monthlyLimit` → reserva, `limit_reached`.
   Registra `fallback` (R20, R21, R23).
5. `save(new AdviceRequest({ yearMonth, source: 'model', createdAt:
   formatIsoDateTime(now()) }))` **antes** de invocar (R22).
   - Si `save` lanza → reserva, `storage_error`, sin invocar.
   - Sin registro no hay garantía de cupo.
6. Se crea un `AbortController` y se arma una carrera entre
   `llmClient.complete({ systemPrompt: SYSTEM_PROMPT, userContent: JSON.stringify(summary), signal })`
   y un temporizador `setTimer(..., timeoutMs)`.
   - Si el temporizador vence, se hace `controller.abort()` (R17) y se devuelve reserva con
     `timeout` (R15), aunque el cliente ignore la señal.
   - Al terminar, siempre se ejecuta `clearTimer`.
7. Si el cliente rechaza → reserva, `request_failed` (R16).
8. `parseAdviceResponse(text, summary)`. Si es válida → `source: 'model'`, `model_ok`
   (R10). Si lanza `InvalidLlmResponse` → reserva, `invalid_response` (R13, R14).
9. `remainingModelRequests` se recalcula al final.

Los registros `fallback` que fallen al guardarse se ignoran: no cambian el cupo y la
reserva igual se muestra. El `AbortController` y el temporizador viven en
`src/assistant/`, **no** en el dominio (hueco 12).

## Decisiones sobre los huecos de `explore_h10_contrato_llm.md` §8

| # | Hueco | Decisión |
|---|---|---|
| 1 | Proveedor | Gemini Flash por REST, configurable (`VITE_LLM_MODEL`); sin SDK |
| 2 | Firma de `LlmClient` y fake | `complete({systemPrompt, userContent, signal}) → Promise<string>`. `FakeLlmClient` con modos de éxito, respuesta mal formada, error y espera indefinida |
| 3 | Regla 15 y «nombres» | «Nombres» = nombres de personas (cuenta local). Las categorías viajan. Se actualiza `rules.md` con el contrato completo (`periodo`, `total_mes`, `ingreso_mensual`) |
| 4 | Aviso de H12 | Versión `2026-11`, con texto nuevo y nueva aceptación (R30, R31) |
| 5 | `monto_tipico` frente a `privacy.md:27` | Es una mediana de al menos 3 gastos, sin fecha, nota ni id, así que no es «un gasto concreto». Además se redondea a $100 (R7). Se documenta en `privacy.md` |
| 6 | Qué consume cupo, mes y «por usuario» | Consume solo la invocación al cliente, registrada antes de invocar y aunque falle (R22). Mes local de `today()` (R24). «Por usuario» = por navegador |
| 7 | `advice_requests` en el navegador | `fp_advice_requests`: `[{ id, yearMonth, source, createdAt }]` |
| 8 | Huecos del resumen | Redondeo a pesos con medios hacia arriba (R4). `variacion_pct` null sin mes anterior (R6). `porcentaje` con 1 decimal (H6). «Otros» fuera de las 8, máximo 9 (R5). `ingreso_mensual` null. Ventana de H9. 6.000 caracteres (R8) |
| 9 | Validación | Rechazo total, sin recorte (R14). Tolera un único bloque markdown (R12). Largos en *code points*. `categoria` tiene que existir en el resumen o ser «General» |
| 10 | Formato de la reserva | El mismo `{sugerencias}` con 1 a 3 elementos válidos. Sin datos, una genérica (R18) |
| 11 | Sin clave | Reserva directa, sin cliente HTTP, registra `fallback` y no consume cupo (R28) |
| 12 | Timeout | En `AdviceService` (`src/assistant/`), con temporizador inyectable |
| 13 | KPI | Sin métricas nuevas. K3 es manual y K6 se cubre con las etiquetas `[H10-Rn]` |

## Diseño Mobile First y adaptación Desktop

`RecommendationsPanel` es presentacional. `buildStyles(viewportWidth)` usa
`getViewportLayout` y `CORPORATE_THEME`, como `RecurrencesPanel`.

- **Mobile (`< 768px`):**
  - Tarjeta a ancho completo, con título «Recomendaciones del asistente».
  - Contador «Te quedan N de 4 consultas al asistente este mes» (`recommendations-remaining`).
  - Botón «Pedir recomendaciones» (`recommendations-request-button`) a ancho completo, con
    `minHeight: 44`.
  - Lista de una columna (`data-columns="1"`). Cada elemento muestra título, detalle y una
    etiqueta con la categoría.
- **Tablet y Desktop (`≥ 768px`):**
  - Contenedor con `maxWidth: layout.containerMaxWidth`, centrado.
  - Lista en 2 columnas (`data-columns="2"`).
  - Botón alineado a la derecha, de ancho automático y también con `minHeight: 44`.
- **Estados:**
  - `idle`: contador, botón y una línea explicativa: «Se envía un resumen agregado de tus
    gastos, sin notas ni datos personales.».
  - `loading`: botón deshabilitado (`disabled`, `aria-busy="true"`) con el texto
    «Consultando al asistente…» (`recommendations-loading`).
  - `ready`:
    - lista (`recommendations-list`, `recommendation-item`, `recommendation-title`,
      `recommendation-detail`, `recommendation-category`);
    - origen (`recommendations-source` con `data-source="model|fallback"` y el texto
      `RECOMMENDATIONS_SOURCE_*`, R19);
    - advertencia (`recommendations-disclaimer` con `ADVICE_DISCLAIMER`, R11);
    - el botón vuelve a habilitarse.
  - Con `reason === 'limit_reached'` se agrega `recommendations-limit-notice`
    (`role="status"`, `RECOMMENDATIONS_LIMIT_TEXT`, R21). Con `no_api_key` se agrega
    `recommendations-config-notice` con `RECOMMENDATIONS_NO_API_KEY_TEXT`.
- Atributos raíz: `data-testid="recommendations-panel"` y `data-layout`
  (`mobile|tablet|desktop`).
- El botón es `<button type="button">` y se puede enfocar con el teclado. No se fijan
  alturas: la barra inferior fija de H13 ya tiene su espacio.

### Ubicación (pestaña «Alertas», R33)

Dentro de `tab-panel-reminders`, **después** de `h(RecurrencesPanel, ...)`, se agrega
`h(RecommendationsPanel, {...})`.
- No se mueve ni se modifica ningún nodo existente: `reminders-section`,
  `monthly-advice-section` y su `advice-disclaimer` siguen igual, y `[H9-R8]` se mantiene.
- «Resumen» no cambia (H13-R1/R2) y la barra sigue con 5 pestañas.

### Cambios en `MonthlyOverviewScreen.jsx`

- **Props nuevas:**
  - `llmClient = null`;
  - `adviceRequestRepository = null`;
  - `isConsentAccepted = () => true` (la pantalla solo se monta con consentimiento; AppShell
    pasa el valor real);
  - `initialAdvice = undefined`.
- **Reserva en memoria:** `createInMemoryAdviceRequestRepository()`, un arreglo con la
  misma interfaz.
  - `useState(() => new AdviceService({ llmClient, adviceRequestRepository: repo,
    isConsentAccepted, today, now }))`.
- **Estado:** `advice = initialAdvice ?? { status: 'idle', suggestions: [], source: null,
  reason: null, remainingModelRequests: 4 }`.
  - Un `useEffect` propio carga `getRemainingModelRequests()` al montar.
  - Al cambiar el período navegado, `advice` vuelve a `idle` y conserva el contador.
- **`handleRequestAdvice`:**
  - si `status === 'loading'`, no hace nada;
  - si no, pasa a `loading`, ejecuta `loadSpendingSummary({ expRepo, incRepo, categories,
    yearMonth, recurrences })` y `adviceService.requestAdvice(summary)`, y pasa a `ready`
    con el resultado;
  - si falla la carga del resumen, pasa a `ready` con `buildFallbackAdvice` sobre un
    resumen vacío y `reason: 'no_data'`, sin invocar al cliente.
- **`MonthlyOverviewController`:**
  - opciones `llmClient`, `adviceRequestRepository` e `isConsentAccepted`, con la misma
    reserva en memoria;
  - campo `advice`;
  - `async requestAdvice()`;
  - `advice` en `getState()`;
  - `initialAdvice`, `llmClient`, `adviceRequestRepository` e `isConsentAccepted` en
    `renderElement()`;
  - `reloadMonthData` carga `remainingModelRequests`.

### Cambios en `AppShell.jsx` y `App.jsx`

- `AppShell({ ..., llmClient = null, adviceRequestRepository = null })` y
  `AppConsentController` con las mismas opciones. Se reenvían a `MonthlyOverviewScreen`
  junto con `isConsentAccepted`:
  - `() => this.hasValidConsent()` en el controlador;
  - `() => hasValidConsent` en el componente.
- `App.jsx` → `createBrowserRepositories()`:
  - `adviceRequestRepo = new LocalStorageAdviceRequestRepository(window.localStorage)`, o
    `null` sin `window`;
  - `const config = readLlmConfig(import.meta.env ?? {})`;
  - `llmClient = config.apiKey ? new HttpLlmClient(config) : null`.

## Datos (SQLite)

Migración **versión 4** en `src/data/db/appDatabase.js` (v1 a v3 no se tocan):

```sql
CREATE TABLE IF NOT EXISTS advice_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year_month TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('model', 'fallback')),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_advice_requests_year_month ON advice_requests (year_month);
```

Se ejecuta dentro de `if (currentVersion < 4)`, seguido de `PRAGMA user_version = 4;`. Una
base en versión 3 se actualiza sin perder datos.

**Semántica de `source`:**
- `model`: se invocó al proveedor y consume cupo, con cualquier resultado.
- `fallback`: se resolvió por reglas sin invocar.

`created_at` usa ISO 8601 local (`YYYY-MM-DDTHH:MM:SS`). Ninguna columna guarda el
resumen, la respuesta ni identificadores.

**Navegador:** `LocalStorageAdviceRequestRepository` usa la clave `fp_advice_requests`, con
un arreglo JSON `[{ id, yearMonth, source, createdAt }]` e `id = max(id) + 1`.
- Un JSON inválido se lee como vacío.
- Un error de escritura (cuota) se propaga desde `save`, para que `AdviceService` no
  invoque sin registro (paso 5).

## Ajuste de pruebas de H12 (justificado)

El cambio de `CURRENT_POLICY_VERSION` a `'2026-11'` es la decisión del humano. El
comportamiento de H12 no cambia: solo dejan de valer los literales que fijaban la versión
vigente.
- `test/domain/models/consent.test.js` (`[H12-R4]`): reemplazar los `'2026-10'` que
  representan la versión vigente (`assert.equal(consent.policyVersion, …)`,
  `copy.policyVersion` y el `Consent` del `isEqual` esperado `true`) por
  `CURRENT_POLICY_VERSION`. Los usos de `'2026-10'` como dato arbitrario de validación
  pueden quedar.
- `test/data/sqliteConsentRepository.test.js:34`: `'2026-10'` → `CURRENT_POLICY_VERSION`.
- `test/features/privacy/PrivacyNoticeScreen.test.jsx:195`:
  `/Versión aceptada: 2026-10/` → `/Versión aceptada: 2026-11/`.
- Las aserciones de H12-R3 sobre el texto («resumen agregado», «notas», «subcategorías»,
  «identificadores») siguen valiendo con el texto nuevo.

**Texto nuevo de `thirdPartyTransfer` (R30):**

> «Transferencia al proveedor del modelo de lenguaje (Google, modelo Gemini): solo cuando
> tocás «Pedir recomendaciones» se envía un resumen agregado del mes con el período, el
> total del mes y del mes anterior, tu ingreso mensual registrado, los nombres de tus
> categorías (incluidas las propias) con sus totales, porcentajes y variaciones
> porcentuales, y las recurrencias detectadas con su monto típico redondeado. Nunca se
> transfieren notas, subcategorías, fechas exactas de gastos individuales, tu nombre o
> usuario de la cuenta local ni identificadores personales o del dispositivo.»

## Errores

- **Nuevas:** `InvalidAdviceRequest` (modelo y repositorios), `InvalidLlmResponse`
  (validación), `LlmTimeout` (abort) y `LlmRequestFailed` (red, HTTP, cuerpo).
- La UI **nunca** muestra el mensaje técnico de estas excepciones. `AdviceService` las
  convierte en `reason` y el panel muestra la reserva con su texto de origen.
- `LocalStorage*` con JSON inválido → vacío (mismo criterio que H9).

## Privacidad

- **Solo viaja el resumen por lista blanca (R1, R2) y el prompt (R3).** Las pruebas
  verifican que el JSON no contenga:
  - las notas ni las subcategorías de los gastos de prueba;
  - fechas con formato `\d{4}-\d{2}-\d{2}`;
  - claves `id`, `categoryId`, `expenseIds`, `note`, `subcategory` ni `date`.
- **Identificadores.** El builder no recibe la cuenta local (`full_name`, `username`), ni el
  consentimiento ni ningún identificador. La solicitud HTTP no agrega encabezados propios
  salvo la clave.
- **Montos.** `monto_tipico` es una mediana redondeada a $100 y sin fecha (hueco 5). Los
  totales son agregados mensuales.
- **Consentimiento.** Sin consentimiento vigente no se invoca (R29). El aviso nuevo exige
  una nueva aceptación (R31) porque agrega el ingreso mensual y los nombres de categorías
  (`privacy.md`: un cambio sustancial implica una nueva versión).
- **Clave.** `VITE_LLM_API_KEY` en `.env` local ignorado. Queda en el bundle, así que solo
  se usa en local o demo con límite de gasto en Google AI Studio (regla 17). El código y
  las pruebas no contienen claves: las pruebas usan `'test-key'`.
- **Transferencia internacional.** Los servidores de Google están fuera de Argentina. El
  aviso nombra al proveedor. Para una versión publicada, el equipo tiene que revisar el
  art. 12 de la Ley 25.326 (ver riesgos).

## Alternativas descartadas

1. **SDK oficial `@google/genai` (regla 14).** Agrega una dependencia de runtime y más peso
   al bundle para una sola llamada REST. Además ata el contrato `LlmClient` a tipos del
   proveedor. `fetch` nativo alcanza y se puede probar inyectando `fetchImpl`.
2. **Otro proveedor (OpenAI, Anthropic) o un intermediario propio.** Lo descartó el humano
   (Gemini Flash). El intermediario queda para el mediano plazo por alcance (sin backend,
   regla 10). Cambiar de proveedor sigue siendo posible implementando otro `LlmClient`
   (D2).
3. **Contar solo las respuestas exitosas del modelo.** Un proveedor caído, o una respuesta
   que siempre sale mal formada, permitiría reintentos ilimitados con costo real (el
   proveedor cobra los tokens igual). Se cuenta cada invocación, registrada antes.
4. **Recortar sugerencias largas o descartar solo las inválidas.** Mostraría texto
   truncado o mezclaría contenido válido con una respuesta que no respetó el contrato, que
   es un indicio de alucinación (riesgo R4). La tabla de `llm_assistant.md` manda la
   respuesta mal formada a `FallbackAdvisor`.
5. **Usar `buildAdviceItems` como reserva o reemplazar «Diagnóstico y notas de gestión».**
   `buildAdviceItems` usa inversiones y recordatorios, devuelve cadenas sueltas y no
   implementa las reglas de `llm_assistant.md`. Reemplazar la sección rompería pruebas
   existentes (`monthly-advice-section`, `MonthlyOverviewScreen.test.jsx:190` y `:560`).
6. **Consultar automáticamente al abrir «Alertas».** Gastaría el cupo de 4 en cuatro visitas
   a la pestaña. Se consulta solo con el botón (R9).
7. **`.env.example` versionado.** Choca con el hook `protect_secrets.sh` y requiere una
   excepción en `.gitignore`. La documentación en `docs/tools_setup.md` cumple el mismo fin
   sin tocar archivos protegidos.

## Riesgos y casos borde

- **Clave expuesta en el bundle (R5 de costos).** Se mitiga con la cuota del proveedor y el
  uso solo local o demo. El cupo de 4 es local y se puede evitar borrando los datos del
  sitio: es una limitación aceptada («por navegador»).
- **Nombre del modelo retirado por Google.** El proveedor responde 404 → `request_failed` →
  reserva. Se corrige con `VITE_LLM_MODEL`, sin tocar código.
- **Latencia.** Gemini Flash puede «pensar» antes de responder y acercarse a los 10 s. En
  ese caso se aplica la reserva y la consulta consume cupo. Si pasa seguido, se evalúa
  reducir `maxOutputTokens` o configurar el razonamiento en una iteración posterior.
- **CORS.** Se asume que la API de Gemini acepta llamadas desde el navegador con
  `x-goog-api-key`. Si no, toda consulta cae en la reserva. Se verifica a mano en la demo,
  no en las pruebas.
- **Cambio de período.** El resumen usa el mes navegado y las recurrencias usan los últimos
  60 días hasta hoy. En meses pasados conviven los dos marcos; se acepta y el prompt aclara
  `veces_en_60_dias`.
- **Una categoría con nombre de persona** creada por el usuario viaja. El aviso lo advierte
  («Evitá incluir nombres de personas…»).
- **Doble clic.** El botón se deshabilita en `loading` y el servicio devuelve la promesa en
  curso (R27).
- **Fin de mes.** Una consulta a las 23:59:59 del día 30 cuenta en ese mes. La siguiente,
  ya en el mes nuevo, cuenta en el nuevo (mes local).
- **Ley 25.326, art. 12 (transferencia internacional).** Queda fuera del alcance del
  prototipo y se registra para la entrega final.
- **Compatibilidad.** Las pruebas existentes de H5, H7, H8, H9 y H13 deben seguir pasando
  sin cambios: las props nuevas son opcionales y, sin `llmClient`, el panel funciona con la
  reserva. Las de H12 solo se ajustan como se indica arriba.
