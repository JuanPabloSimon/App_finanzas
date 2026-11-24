# Asistente de recomendaciones — Contrato con el modelo de lenguaje

> Aplica a H10 (y a H9 como insumo). Riesgos asociados: R4 (respuestas inconsistentes),
> R5 (precios), R6 (indisponibilidad). Detalle técnico en `specs/h10_recomendaciones_ia/`.

## Proveedor

- **Groq API (OpenAI-compatible Chat Completions) por REST**, con `fetch` nativo y sin SDK (decisión D7 de
  `docs/architecture.md`).
- Modelo configurable con `VITE_LLM_MODEL` (por defecto `llama-3.3-70b-versatile`). La clave va en
  `VITE_LLM_API_KEY` (ver `docs/tools_setup.md`) y viaja en el encabezado `Authorization: Bearer <clave>`,
  nunca en la URL.
- Endpoint: `POST https://api.groq.com/openai/v1/chat/completions`.
  El cuerpo lleva solo `model`, `messages` (`system` con el prompt y `user` con el resumen serializado),
  `response_format: { type: 'json_object' }`, `temperature: 0.4` y `max_tokens: 1024`.
- `src/assistant/httpLlmClient.js` es el **único** archivo con red; `fetch` se inyecta para
  que las pruebas usen una función falsa y `FakeLlmClient`.
- Sin clave configurada no se crea el cliente HTTP: se muestra la respuesta de reserva sin
  consumir cupo.

## Resumen que se envía (único contenido permitido)

```json
{
  "periodo": "2026-10",
  "moneda": "ARS",
  "total_mes": 412500,
  "total_mes_anterior": 389000,
  "ingreso_mensual": 900000,
  "categorias": [
    {"nombre": "Delivery", "total": 98000, "porcentaje": 23.8, "variacion_pct": 12.5},
    {"nombre": "Suscripciones", "total": 41000, "porcentaje": 9.9, "variacion_pct": 0.0}
  ],
  "recurrencias": [
    {"categoria": "Suscripciones", "monto_tipico": 6500, "veces_en_60_dias": 3}
  ]
}
```

- `periodo` es el mes que la pestaña «Alertas» tiene seleccionado.
- Montos en pesos enteros: se convierten desde centavos con redondeo al peso más cercano y
  los medios hacia arriba (`Math.floor((centavos + 50) / 100)`). Sin gastos en el mes
  anterior, `total_mes_anterior` es `0`.
- `ingreso_mensual` es `null` si no hay ingreso registrado para el período.
- `categorias`: solo las que tienen gasto en el período, ordenadas como el ranking de H8.
  Si hay más de 8, quedan las 8 mayores y el resto se agrupa en «Otros», que **no cuenta**
  dentro de las 8 (como máximo 9 elementos). Si una de las 8 ya se llama «Otros», el resto se
  suma a ella. `porcentaje` tiene 1 decimal y suma 100.
- `variacion_pct` es `null` si la categoría (o el grupo «Otros») no tuvo gasto el mes
  anterior; si no, es la variación porcentual con 1 decimal (la misma de H7).
- `recurrencias`: como máximo las 10 primeras recurrencias visibles de H9 (no descartadas),
  en el orden del detector. La ventana de 60 días termina hoy, no en el período navegado.
  `monto_tipico` es la mediana redondeada al múltiplo de $100 más cercano (mínimo $100).
- El resumen se arma por **lista blanca**: nunca copia `id`, `categoryId`, `expenseIds`,
  notas, subcategorías ni fechas.
- Nombres de categorías propias: se envían porque los elige el usuario como rubro; si una
  categoría propia contiene un nombre de persona, el usuario fue advertido en el aviso.
- Tamaño objetivo: menos de 1.500 tokens (Etapa 1), aproximado como un JSON de no más de
  6.000 caracteres en el peor caso (20 categorías y 20 recurrencias con nombres de 40
  caracteres).
- `SpendingSummaryBuilder` es una función pura en `src/domain/services/` y tiene pruebas que
  verifican que el JSON **no contiene** notas, subcategorías ni fechas de gastos individuales.

## Instrucciones al modelo (resumen)

- Rol: asistente de finanzas personales para Argentina; tono claro y respetuoso.
- Tarea: entre 1 y 3 sugerencias concretas para reducir gasto no deseado, basadas solo en
  el resumen.
- Prohibido: recomendar productos financieros, inversiones o créditos; pedir datos
  personales; afirmar certezas.
- Formato de salida obligatorio:

```json
{"sugerencias": [{"titulo": "string ≤ 60", "detalle": "string ≤ 280", "categoria": "string"}]}
```

El texto definitivo de las instrucciones (actividad A8) se guarda en
`src/assistant/prompt.js` como constante versionada.

## Validación y respuesta de reserva

| Situación | Comportamiento |
|---|---|
| Respuesta válida (1 a 3 sugerencias, campos dentro de límite) | Se muestran con la advertencia |
| Respuesta mal formada o fuera de límites | `FallbackAdvisor` |
| Sin respuesta en 10 s o error de red | `FallbackAdvisor` (se aborta la solicitud) |
| Sin consentimiento aceptado | No se llama a la API |
| Sin clave de API configurada | `FallbackAdvisor` y aviso de configuración, sin consumir cupo |
| Período sin gastos ni recurrencias visibles | `FallbackAdvisor`, sin llamar a la API |
| Límite diario alcanzado | `FallbackAdvisor` y aviso del límite |

Reglas de validación (`src/assistant/adviceResponse.js`):
- Se tolera **un único** bloque de código markdown envolvente, con o sin la etiqueta
  `json`, rodeado como mucho por espacios. Otro texto antes o después del JSON no se
  acepta.
- El resultado tiene que ser un objeto con un arreglo `sugerencias` de 1 a 3 elementos.
- `titulo` de 1 a 60 y `detalle` de 1 a 280, contados en *code points* después de
  `trim()` (un emoji cuenta como 1).
- `categoria` tiene que coincidir, sin distinguir mayúsculas ni espacios en los extremos,
  con un `nombre` de `categorias`, con una `categoria` de `recurrencias` o con «General».
- **Rechazo total:** ante cualquier incumplimiento se descarta la respuesta completa (no se
  recorta ni se filtra). Las claves extra se ignoran. El texto se muestra escapado.

`FallbackAdvisor` (`src/assistant/fallbackAdvisor.js`) devuelve el mismo formato
`{ "sugerencias": [...] }`, con 1 a 3 elementos que pasan la misma validación. Aplica, en
orden: 1) la categoría con mayor `variacion_pct` positiva; 2) la primera recurrencia; 3) el
peso de la primera categoría sobre `ingreso_mensual` (si hay ingreso). Si ninguna aplica,
devuelve una sola sugerencia genérica con categoría «General». Los porcentajes llevan coma
decimal, los montos el formato `$ 6.500` y los nombres de más de 40 caracteres se cortan en
el detalle. El panel indica si las sugerencias vienen del asistente o de reglas.

## Límite de consultas y costos

- Plan gratuito: **1 consulta exitosa al modelo por día** (`advice_requests`, `DAILY_MODEL_REQUEST_LIMIT = 1`).
- **Qué consume cupo:** solo la consulta al modelo que devuelve una respuesta válida. La fila `source = 'model'` se registra **después** de validar la respuesta; si la solicitud falla por timeout, error de red/HTTP o formato inválido, se registra `source = 'fallback'` y **no descuenta el intento diario**.
- **Día de la consulta:** la fecha calendario local del navegador (`YYYY-MM-DD`) al pedir las
  recomendaciones (no el período navegado ni UTC).
- **«Por usuario» = por navegador:** el conteo vive en `localStorage` (`fp_advice_requests`)
  y no se comparte entre dispositivos; borrar los datos del sitio lo reinicia (limitación
  aceptada sin backend).
- Las recomendaciones se piden solo con el botón «Pedir recomendaciones» de la pestaña
  «Alertas»; mientras una solicitud está en curso no se inicia otra.
- Costo estimado: USD 0,0005 por consulta (Etapa 1); 1.000 usuarios × 4 consultas ≈ USD 2/mes.
- Ante una suba de tarifas: 1) achicar el resumen, 2) bajar el límite, 3) cambiar de
  proveedor implementando otro `LlmClient`.

## Advertencia obligatoria

> «Estas sugerencias son orientativas y se generan automáticamente a partir de tus datos.
> No constituyen asesoramiento financiero profesional.»
