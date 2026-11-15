# Explore H10 — UI de recomendaciones y pruebas

> Investigación previa del 2026-11-15 (subagente `Explore`, solo lectura). El leader lo guardó en disco.

## 1. UI actual

- **Pestañas (H13):** `src/features/income/MonthlyOverviewScreen.jsx:1200-1206`.
  - Son `overview`/Resumen, `expenses`/Gastos, `income`/Ingresos, `investments`/Inversiones y `reminders`/Alertas.
  - Barra inferior de 5 columnas (`repeat(5, ...)`, `:336`); render en `:2363-2387`.
- **Resumen sin scroll:** `overviewViewportBox` con `overflowY: 'hidden'` y `maxHeight: calc(100dvh - 46px - 62px)` (`:288-295`).
  - Lo verifican `[H13-R1][H13-R2]` (`test/features/income/MonthlyOverviewScreen.test.jsx:437-487`) y las repeticiones de H8 (`:858-861`) y H7 (`:1023-1025`).
  - **No se puede agregar nada en Resumen.**
- **Alertas (`reminders`, `:2100-2349`):** primero una grilla con `reminders-section` (`:2112`) y `monthly-advice-section`, «Diagnóstico y notas de gestión» (`:2285-2341`).
  - Esa sección ya muestra `adviceList` (`buildAdviceItems`, `:224-269`): hasta 3 consejos por reglas con un disclaimer `advice-disclaimer` (`:2327-2340`). Es un fallback por reglas de hecho.
  - Abajo está `RecurrencesPanel` (`:2343-2348`).
- **`RecurrencesPanel` (H9):** `src/features/recurrences/RecurrencesPanel.jsx:159-201`.
  - Es presentacional, con props `recurrences`, `onDismiss`, `errorMessage` y `viewportWidth`, más un `buildStyles` estático.
  - `[H9-R8]` exige que aparezca después de `reminders-section` (`test/...MonthlyOverviewScreen.test.jsx:1094-1096`) y que no esté en Resumen (`:1086`).
- **Datos:** el controller ya calcula `categoryBreakdown`, `categoryRanking`, `monthlyComparison`, `recurrences` y `monthlyIncome` (`:759-819`).
- **Inyección de dependencias:** los repos llegan por props a la pantalla (`:850-873`), al controller (`:499-524`) y a `AppShell` (`src/app/AppShell.jsx:411-433`, que los pasa en `:1257-1267`). `llmClient` y `adviceRequestRepository` seguirían la cadena `App.jsx` → `AppShell` → `MonthlyOverviewScreen`.
- **Header/perfil:** `AppShell.jsx:953-997` tiene solo «Ge$tix» y el botón de perfil (`[H13-R5..R7]`). No poner recomendaciones ahí.

## 2. Consentimiento (H12)

- Hay un único `Consent { policyVersion, acceptedAt }` (`src/domain/models/consent.js:4`, `:36-50`), con `CURRENT_POLICY_VERSION = '2026-10'`.
- `thirdPartyTransfer` (`consent.js:13-14`, `:28-32`) ya declara el envío de un resumen agregado. La finalidad menciona las recomendaciones (`:10`).
- **No hay consentimiento granular para la IA.** Sin consentimiento no se renderiza `MonthlyOverviewScreen` (`AppShell.jsx:637-644`), así que la regla 16 se cumple por construcción.
- Para que sea verificable conviene pasar `hasConsent` al servicio y no llamar si es falso.

## 3. Pruebas

- **Runner:** `node:test` con `node:assert/strict` (`package.json:11`). `tool/jsx_loader.mjs` carga los `.jsx` sin transpilar, así que el código usa `React.createElement` (`const h`) y no JSX.
- **Render:** `renderToStaticMarkup` (`react-dom/server`) más regex sobre `data-testid`. Las interacciones se prueban con el controller (`createController`, `initialize()`, `setActiveTab()`, `renderElement()`; `MonthlyOverviewScreen.test.jsx:1052-1096`). No hay testing-library ni jsdom.
- **Fakes:** la persistencia usa `AppDatabase.openInMemory()` con repos Sqlite (regla 22). El fake de storage `createFakeStorage` está en `test/data/localStorageRecurrenceRepository.test.js:10`. **`FakeLlmClient` todavía no existe** (regla 21).
- **Sin red (patrón de H9 R10, `test/domain/services/recurrenceDetector.test.js:217-251`):**
  - lee la fuente con `fs.readFileSync` y verifica que no contenga `fetch(`, `XMLHttpRequest`, `axios`, `react`, `react-dom` ni `node:sqlite`;
  - reemplaza `globalThis.fetch` por una función que lanza y lo restaura en `finally`.
  - H7 y H8 usan `assert.doesNotMatch(source, /fetch\(/)`.
- **`tool/harness_check.mjs`:**
  - cada `## R<n>` necesita la etiqueta `[H10-R<n>]` en `test/` (`:154-213`);
  - con la feature `done`, si falta alguna, falla;
  - con un estado distinto de `pending`, exige el spec completo (`:167-185`);
  - con `done`, exige todas las tareas marcadas.
- **Dependencias:** solo `react` y `react-dom` en runtime (`package.json:15-18`). Un SDK de LLM requiere justificación (regla 14); con `fetch` nativo en `src/assistant/` alcanza.

## 4. `src/assistant/`, `.env.example` y `.gitignore`

- `src/assistant/` no existe.
- `.env.example` no existe. No hay `VITE_LLM_API_KEY` ni `import.meta.env` en `src/`.
- `.gitignore:17-20` ignora `.env` y `.env.*`, lo que **también ignora `.env.example`**. Habría que agregar `!.env.example`.
- `docs/privacy.md:36` menciona el hook `.claude/hooks/protect_secrets.sh`, que podría bloquear la edición.
- `advice_requests` está documentada (`docs/data_model.md:59`, `:111`) pero no implementada.

## 5. Ubicación propuesta del panel

1. **Recomendada:** en Alertas, reemplazando o envolviendo `monthly-advice-section` (`:2285-2341`).
   - Un `RecommendationsPanel` presentacional (`suggestions`, `status`, `isFallback`, `limitReached`, `onRequest`, `viewportWidth`, con `buildStyles`) entra en la segunda columna de la grilla.
   - `buildAdviceItems` pasa a ser el contenido de reserva.
   - No rompe `[H9-R8]` ni H13/H7/H8.
   - Hay que revisar las pruebas que dependan de `monthly-advice-section` o `advice-disclaimer`, y reemplazar el texto del disclaimer por el literal de `docs/llm_assistant.md`.
2. **Alternativa:** una sección propia después de `RecurrencesPanel`. Es la menos invasiva, pero deja dos bloques de sugerencias en la misma pestaña.

**Descartado:**
- Resumen: rompe `[H13-R1/R2]`.
- Una sexta pestaña: rompe `repeat(5)` y `[H13-R3]`.
- Header: rompe `[H13-R5..R7]`.
- Gastos: suma scroll y riesgo sobre H7/H8.
