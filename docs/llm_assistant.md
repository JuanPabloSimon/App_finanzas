# Asistente de recomendaciones — Contrato con el modelo de lenguaje

> Aplica a H10 (y a H9 como insumo). Riesgos asociados: R4 (respuestas inconsistentes),
> R5 (precios), R6 (indisponibilidad).

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

- Montos en pesos enteros (se convierten desde centavos al armar el resumen).
- `categorias` limitado a las 8 de mayor gasto; el resto se agrupa en «Otros».
- Nombres de categorías propias: se envían porque los elige el usuario como rubro; si una
  categoría propia contiene un nombre de persona, el usuario fue advertido en el aviso.
- Tamaño objetivo: menos de 1.500 tokens (Etapa 1).
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
| Sin respuesta en 10 s o error de red | `FallbackAdvisor` |
| Sin consentimiento aceptado | No se llama a la API |
| Límite mensual alcanzado | `FallbackAdvisor` y aviso del límite |

`FallbackAdvisor` genera sugerencias por reglas: categoría con mayor variación positiva,
recurrencias detectadas y peso de la categoría principal sobre el ingreso.

## Límite de consultas y costos

- Plan gratuito: **4 consultas al modelo por mes** (`advice_requests`).
- Costo estimado: USD 0,0005 por consulta (Etapa 1); 1.000 usuarios × 4 consultas ≈ USD 2/mes.
- Ante una suba de tarifas: 1) achicar el resumen, 2) bajar el límite, 3) cambiar de
  proveedor implementando otro `LlmClient`.

## Advertencia obligatoria

> «Estas sugerencias son orientativas y se generan automáticamente a partir de tus datos.
> No constituyen asesoramiento financiero profesional.»
