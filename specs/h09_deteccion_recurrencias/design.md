# Design — h09_deteccion_recurrencias

> Decisiones técnicas para H9. Apoyado en `docs/architecture.md` (D4: reglas
> determinísticas), `docs/conventions.md` y `docs/data_model.md`.

## Archivos

| Capa | Archivo | Cambio |
|---|---|---|
| domain | `src/domain/models/recurrence.js` | Nuevo modelo inmutable `Recurrence` |
| domain | `src/domain/services/recurrenceDetector.js` | Nuevo servicio puro `RecurrenceDetector` |
| domain | `src/domain/repositories/recurrenceRepository.js` | Contrato para claves descartadas |
| data | `src/data/db/appDatabase.js` | Migración versión 2 (`expo-sqlite`): tabla `dismissed_recurrences` |
| data | `src/data/repositories/sqliteRecurrenceRepository.js` | Implementación SQLite |
| presentation | `src/features/recurrences/RecurrencesScreen.jsx` | Lista responsiva (Mobile First + Desktop), estado vacío y acción «Descartar» |
| test | `test/domain/services/recurrenceDetector.test.js` | R1, R2, R3, R10 |
| test | `test/domain/services/recurrenceDetectorMetrics.test.js` | R4, R5 |
| test | `test/data/sqliteRecurrenceRepository.test.js` | R6 |
| test | `test/features/recurrences/RecurrencesScreen.test.jsx` | R7, R8, R9 |
| test | `test/fixtures/recurrencias_etiquetadas.json` | Conjunto de prueba etiquetado |

## Firmas nuevas

```javascript
export class Recurrence {
  constructor({ categoryId, categoryName, typicalAmountCents, occurrences, expenseIds }) {
    this.categoryId = categoryId;
    this.categoryName = categoryName;
    this.typicalAmountCents = typicalAmountCents;
    this.occurrences = occurrences;
    this.expenseIds = Object.freeze([...expenseIds]);
    Object.freeze(this);
  }

  /** Clave estable para descartar: categoría + monto típico redondeado a $10. */
  get key() {
    return `${this.categoryId}|${Math.round(this.typicalAmountCents / 1000) * 1000}`;
  }
}

export class RecurrenceDetector {
  constructor({ windowDays = 60, minOccurrences = 3, tolerance = 0.10 } = {}) {
    this.windowDays = windowDays;
    this.minOccurrences = minOccurrences;
    this.tolerance = tolerance;
    Object.freeze(this);
  }

  detect(expenses, { referenceDate, categoryNames }) {
    // ...
  }
}

export class RecurrenceRepository {
  async dismissedKeys() {
    throw new Error('Not implemented');
  }
  async dismiss(_key) {
    throw new Error('Not implemented');
  }
}
```

## Diseño Mobile First y adaptación Desktop

- **Mobile (`< 768px`):** Tarjetas apiladas en una sola columna con botón táctil «Descartar» de al menos 44px de alto.
- **Desktop (`≥ 768px`):** Contenedor centrado (`maxWidth: 960`) con grilla de tarjetas en 2 columnas y soporte de foco por teclado.

## Algoritmo (por categoría)

1. Filtrar los gastos con `referenceDate - 59 días <= date <= referenceDate`.
2. Ordenar los montos de la categoría de menor a mayor.
3. Recorrer en orden formando conjuntos: un gasto se suma al conjunto actual si su monto no
   supera en más de 20 % al primer monto del conjunto (cota previa); si lo supera, se cierra
   el conjunto y se abre otro.
4. Para cada conjunto, calcular la mediana y quitar los gastos que difieran más del 10 %
   de ella (R3). Recalcular la mediana una vez sobre los que quedan.
5. Si quedan al menos 3 gastos, se emite una `Recurrence` (R1); si no, se descarta (R2).
6. El resultado se ordena por monto típico × ocurrencias, de mayor a menor.

La pantalla obtiene las claves descartadas del repositorio y filtra antes de mostrar (R7).

## Datos (`expo-sqlite`)

- Migración **versión 2**: `CREATE TABLE dismissed_recurrences (recurrence_key TEXT PRIMARY
  KEY, dismissed_at TEXT NOT NULL)`. Se actualiza `docs/data_model.md`.

## Conjunto de prueba etiquetado (R4, R5)

`test/fixtures/recurrencias_etiquetadas.json`: tres meses de historial sintético con al
menos **20 recurrencias reales** etiquetadas (suscripciones, delivery semanal, transporte,
café) y al menos **15 gastos señuelo** (montos similares en categorías distintas, dos
repeticiones solamente, variaciones del 15 % al 30 %). Formato:

```json
{
  "reference_date": "2026-10-31",
  "categories": {"1": "Suscripciones", "2": "Delivery"},
  "expenses": [{"id": 1, "category_id": 1, "amount_cents": 650000, "date": "2026-09-05"}],
  "expected": [{"category_id": 1, "expense_ids": [1, 7, 15]}]
}
```

Una recurrencia detectada es **correcta** si comparte categoría y al menos el 80 % de sus
`expense_ids` con una esperada.

## Errores

Sin excepciones nuevas. Una lista vacía de gastos devuelve una lista vacía.

## Privacidad

No hay salida de datos (R10). `RecurrenceDetector` vive en `src/domain/` y no usa `fetch` ni módulos de red.

## Alternativa descartada

**Agrupamiento por k-means sobre los montos.** Se descarta porque exige elegir k, no es
determinístico entre ejecuciones, es difícil de explicar al usuario y de verificar con
pruebas exactas, y contradice la decisión D4. La regla de ventana + tolerancia es
explicable («se repitió 3 veces en 60 días por un monto parecido») y sus parámetros se
ajustan sin cambiar el diseño.

## Riesgos y casos borde

- Gastos el mismo día con el mismo monto (dos cafés): cuentan como ocurrencias distintas.
- Montos muy bajos: la tolerancia del 10 % puede ser menor a $1; se acepta.
- Si las métricas R4 o R5 no llegan a 0,85, se ajustan `tolerance` o `minOccurrences` y se
  documenta el cambio en `progress/impl_h09_deteccion_recurrencias.md`; no se cambia el
  conjunto de prueba para hacerlo pasar.
