# Explore H10 — Contrato con el modelo y privacidad

> Investigación previa del 2026-11-15 (subagente `Explore`, solo lectura). El leader lo guardó en disco.

## 1. Resumen agregado que puede viajar (`docs/llm_assistant.md:6-31`)

- JSON con `periodo` ("YYYY-MM"), `moneda` ("ARS"), `total_mes`, `total_mes_anterior`, `ingreso_mensual`, `categorias[] {nombre,total,porcentaje,variacion_pct}` y `recurrencias[] {categoria,monto_tipico,veces_en_60_dias}` (:8-23).
- Montos en pesos enteros, convertidos desde centavos (:25).
- `categorias`: como máximo las 8 de mayor gasto; el resto se agrupa en «Otros» (:26).
- Se envían los nombres de las categorías propias (:27-28).
- Tamaño objetivo: menos de 1.500 tokens (:29).
- `SpendingSummaryBuilder` es una función pura en `src/domain/services/`. Sus pruebas verifican que no haya notas, subcategorías ni fechas de gastos individuales (:30-31; `architecture.md:33`, `:8`).
- Regla 15 (`rules.md:42-45`): solo viaja ese resumen.

## 2. Campos prohibidos

- `rules.md:44-45`: notas, subcategorías libres, nombres, fechas exactas de gastos individuales e identificadores del dispositivo o del usuario.
- `docs/privacy.md:23-28` agrega dos:
  - montos individuales identificables (:27);
  - identificadores de la cuenta del SO o de la instalación (:28).
- `architecture.md:88`: no se envía nada fuera del contrato.

## 3. Instrucciones al modelo y formato de respuesta (`docs/llm_assistant.md:33-47`)

- Rol: asistente de finanzas para Argentina, con 1 a 3 sugerencias basadas solo en el resumen.
- Prohibido: recomendar productos financieros, inversiones o créditos, pedir datos personales y afirmar certezas (:38-39).
- Formato de salida: `{"sugerencias":[{"titulo":"string ≤ 60","detalle":"string ≤ 280","categoria":"string"}]}` (:43).
- El prompt va en `src/assistant/prompt.js` como constante versionada (:46-47). Todavía no existe.

## 4. Validación, timeout y reserva (`docs/llm_assistant.md:49-60`; `architecture.md:62-64`)

| Situación | Qué pasa |
|---|---|
| Respuesta válida | Se muestra con la advertencia |
| Respuesta mal formada o fuera de límites | `FallbackAdvisor` |
| Más de **10 s** o error de red | `FallbackAdvisor` (:55) |
| Sin consentimiento | No se llama a la API (:56; regla 16) |
| Límite alcanzado | `FallbackAdvisor` y aviso de límite (:57) |

Reglas de `FallbackAdvisor` (:59-60):
- categoría con mayor variación positiva;
- recurrencias detectadas;
- peso de la categoría principal sobre el ingreso.

## 5. Límite mensual (`docs/llm_assistant.md:62-67`; `docs/data_model.md:59-64`, `:111`)

- **4 consultas al modelo por mes**, guardadas en `advice_requests` (`id`, `year_month`, `source` `model|fallback`, `created_at`), migración v4.
- Costo estimado: USD 0,0005 por consulta.
- Contingencia ante subas: achicar el resumen, después bajar el límite, después cambiar de `LlmClient`.

## 6. Advertencia obligatoria (`docs/llm_assistant.md:71-72`; regla 18; `privacy.md:16`)

«Estas sugerencias son orientativas y se generan automáticamente a partir de tus datos. No constituyen asesoramiento financiero profesional.»

## 7. Proveedor, clave e interfaz

- Clave: `VITE_LLM_API_KEY` en `.env` local ignorado (regla 17; `privacy.md:32-39`). Queda visible en el bundle, así que solo se usa en local o demo, con límite de gasto en el proveedor.
- Regla 13 y `architecture.md:16`: la única salida de red es `src/assistant/`, detrás de `LlmClient`.
- Archivos previstos (`architecture.md:37-42`):
  - `llmClient.js`;
  - `httpLlmClient.js`;
  - `fallbackAdvisor.js`;
  - `prompt.js`;
  - `adviceService.js`, que orquesta consentimiento, límite, timeout y validación.
- Regla 21: las pruebas no usan red y usan `FakeLlmClient`.
- `src/assistant/` no existe y no hay firma definida para `LlmClient` ni para `FakeLlmClient`.

## 8. Contradicciones y huecos para el spec

1. **Proveedor, endpoint y modelo sin definir** (`architecture.md:39` dice «proveedor elegido»). Si hace falta un SDK, aplica la regla 14. Es un **posible bloqueo**: lo decide el humano.
2. **`LlmClient` sin firma.** Falta definir el método, sus parámetros (resumen, prompt, `AbortSignal`) y si devuelve texto crudo o JSON. Falta también el comportamiento configurable de `FakeLlmClient` (éxito, timeout, respuesta mal formada).
3. **Regla 15 contra el contrato.**
   - La regla prohíbe «nombres», pero el contrato envía nombres de categorías.
   - La regla enumera solo totales, variaciones y recurrencias, pero el contrato además manda `ingreso_mensual`, `total_mes` y `periodo`.
   - Hay que aclarar que «nombres» significa nombres de personas.
4. **El aviso de H12 no cubre todo lo que se envía.** `src/domain/models/consent.js:14` no menciona los nombres de categorías ni el ingreso mensual. Un cambio sustancial exige una nueva `policy_version` y volver a pedir aceptación (`privacy.md:20-21`). Hay que decidir si entra en H10.
5. **`monto_tipico` contra `privacy.md:27`.** Una recurrencia podría exponer un monto individual identificable. Hay que justificarlo o redondearlo.
6. **Conteo del límite ambiguo.**
   - ¿Los fallbacks, errores o timeouts consumen cupo?
   - ¿El mes se toma por fecha local o UTC?
   - «Por usuario» sin cuentas significa, en la práctica, por dispositivo o navegador.
7. **Navegador.** `advice_requests` solo está definida en SQLite. Falta una clave de `localStorage` (`data_model.md:55-57`).
8. **Huecos del resumen.**
   - Redondeo de centavos a pesos.
   - `variacion_pct` con mes anterior en 0 o sin datos.
   - Precisión de `porcentaje`.
   - Si «Otros» cuenta dentro de las 8.
   - `ingreso_mensual` null.
   - La ventana de 60 días contra H9.
   - Los 1.500 tokens se aproximan por caracteres.
9. **Validación.**
   - ¿`categoria` tiene que coincidir con el resumen?
   - ¿Se recorta o se rechaza si pasa de 60/280?
   - ¿Se tolera markdown alrededor del JSON?
   - ¿Los límites son en caracteres o en code points?
10. **Formato de la reserva.** No está dicho que `FallbackAdvisor` devuelva `{sugerencias:[...]}` con 1-3 ítems, ni qué hace sin datos del mes.
11. **Sin `VITE_LLM_API_KEY`.** ¿Va a fallback directo? ¿Consume cupo?
12. **Ubicación del timeout.** El `AbortController` va en `src/assistant/`, no en el dominio (`rules.md:23-24`). Hay que dejarlo explícito.
13. **KPI.** Solo K3 (utilidad Likert, manual, `docs/kpis.md:9`) se relaciona con H10. K6 exige pruebas `[H10-Rn]`. No hay métrica de fallback, latencia ni costo.
