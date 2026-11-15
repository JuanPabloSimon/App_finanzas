# Design — h09_deteccion_recurrencias

> Decisiones técnicas para H9. Apoyado en `docs/architecture.md` (D1 persistencia local,
> D3 centavos enteros, D4 reglas determinísticas), `docs/conventions.md`,
> `docs/data_model.md` y en el código vigente tras H13, H7 y H8.

## Archivos

| Capa | Archivo | Cambio |
|---|---|---|
| core | `src/core/errors.js` | Nueva excepción `InvalidRecurrence extends DomainException` (mismo patrón que `InvalidReminder`) |
| domain | `src/domain/models/recurrence.js` | Nuevo modelo inmutable `Recurrence` + `buildRecurrenceKey` y `parseRecurrenceKey` |
| domain | `src/domain/services/recurrenceDetector.js` | Nuevo servicio puro `RecurrenceDetector` + función `filterDismissedRecurrences` |
| domain | `src/domain/repositories/recurrenceRepository.js` | Contrato `RecurrenceRepository` (`dismissedKeys`, `dismiss`) |
| data | `src/data/db/appDatabase.js` | Nueva `MIGRATION_V3_SQL` y bloque `if (currentVersion < 3)` → `PRAGMA user_version = 3` |
| data | `src/data/repositories/sqliteRecurrenceRepository.js` | `SqliteRecurrenceRepository extends RecurrenceRepository` (patrón de `SqliteConsentRepository`) |
| data | `src/data/repositories/localStorageRecurrenceRepository.js` | `LocalStorageRecurrenceRepository extends RecurrenceRepository` para el navegador (recibe el `storage` por constructor) |
| presentation | `src/features/recurrences/recurrencesLoader.js` | `loadVisibleRecurrences(...)`: lee 3 meses de gastos, detecta y filtra descartadas |
| presentation | `src/features/recurrences/RecurrencesPanel.jsx` | Componente presentacional: lista responsiva, estado vacío y botón «Descartar» |
| presentation | `src/features/income/MonthlyOverviewScreen.jsx` | Prop `recurrenceRepository` + `initialRecurrences`; repositorio en memoria de reserva; carga de recurrencias; `RecurrencesPanel` dentro de la pestaña `reminders`; controlador con `recurrences` y `dismissRecurrence` |
| app | `src/app/AppShell.jsx` | Prop y opción de controlador `recurrenceRepository`, reenviada a `MonthlyOverviewScreen` |
| app | `src/App.jsx` | `createBrowserRepositories()` agrega `recurrenceRepo = new LocalStorageRecurrenceRepository(window.localStorage)` y lo pasa a `AppShell` |
| docs | `docs/data_model.md` | Formato de `recurrence_key` (`<categoryId>\|<typicalAmountCents>`); la fila de la migración 3 ya existe |
| test | `test/fixtures/recurrencias_etiquetadas.json` | Conjunto de prueba etiquetado (nuevo directorio `test/fixtures/`) |
| test | `test/domain/models/recurrence.test.js` | Modelo y clave (R6, R7) |
| test | `test/domain/services/recurrenceDetector.test.js` | R1, R2, R3, R7, R10, R11 |
| test | `test/domain/services/recurrenceDetectorMetrics.test.js` | R4, R5 |
| test | `test/data/sqliteRecurrenceRepository.test.js` | R6 (incluye migración v2 → v3) |
| test | `test/data/localStorageRecurrenceRepository.test.js` | R6, R7 (persistencia del navegador con un `storage` falso) |
| test | `test/features/recurrences/recurrencesLoader.test.js` | R7, R8, R11 (con `AppDatabase.openInMemory()`) |
| test | `test/features/recurrences/RecurrencesPanel.test.jsx` | R8, R9 |
| test | `test/features/income/MonthlyOverviewScreen.test.jsx` | Casos nuevos `[H9-R7]`, `[H9-R8]`, `[H9-R9]` agregados al final; los casos existentes de H5/H13/H7/H8 no se modifican |

No se agregan dependencias a `package.json`.

## Firmas nuevas

```javascript
// src/core/errors.js
export class InvalidRecurrence extends DomainException {
  constructor(detail = 'Datos de recurrencia inválidos') {
    super(detail);
  }
}

// src/domain/models/recurrence.js
export function buildRecurrenceKey(categoryId, typicalAmountCents) {
  return `${categoryId}|${typicalAmountCents}`;
}

/** Devuelve { categoryId, typicalAmountCents } o null si la clave no es válida. */
export function parseRecurrenceKey(key) { /* ... */ }

export class Recurrence {
  constructor({ categoryId, categoryName, typicalAmountCents, occurrences, expenseIds }) {
    // Valida: categoryId entero > 0; typicalAmountCents entero > 0;
    // occurrences entero >= 1 e igual a expenseIds.length. Si no, InvalidRecurrence.
    this.categoryId = categoryId;
    this.categoryName = categoryName;
    this.typicalAmountCents = typicalAmountCents;
    this.occurrences = occurrences;
    this.expenseIds = Object.freeze([...expenseIds]);
    Object.freeze(this);
  }

  get key() {
    return buildRecurrenceKey(this.categoryId, this.typicalAmountCents);
  }

  isEqual(other) { /* categoryId, typicalAmountCents, occurrences y expenseIds iguales */ }
}

// src/domain/services/recurrenceDetector.js
export const RECURRENCE_WINDOW_DAYS = 60;
export const RECURRENCE_MIN_OCCURRENCES = 3;
export const RECURRENCE_TOLERANCE_PCT = 10;

export class RecurrenceDetector {
  constructor({
    windowDays = RECURRENCE_WINDOW_DAYS,
    minOccurrences = RECURRENCE_MIN_OCCURRENCES,
    tolerancePct = RECURRENCE_TOLERANCE_PCT,
  } = {}) {
    this.windowDays = windowDays;
    this.minOccurrences = minOccurrences;
    this.tolerancePct = tolerancePct;
    Object.freeze(this);
  }

  /**
   * @param {Array<{id:number, amountCents:number, date:string, categoryId:number, categoryName?:string|null}>} expenses
   * @param {{ referenceDate: string, categoryNames?: Map<number, string> }} options
   * @returns {ReadonlyArray<Recurrence>} congelado
   */
  detect(expenses, { referenceDate, categoryNames = new Map() }) { /* ... */ }
}

/** Quita las recurrencias que tienen una descartada equivalente (R7). */
export function filterDismissedRecurrences(recurrences, dismissedKeys) { /* ... */ }

// src/domain/repositories/recurrenceRepository.js
export class RecurrenceRepository {
  /** @returns {Promise<Set<string>>} */
  async dismissedKeys() { throw new Error('Not implemented'); }
  /** @returns {Promise<void>} idempotente */
  async dismiss(_recurrenceKey) { void _recurrenceKey; throw new Error('Not implemented'); }
}

// src/data/repositories/sqliteRecurrenceRepository.js
export class SqliteRecurrenceRepository extends RecurrenceRepository {
  constructor(db) { /* igual que SqliteConsentRepository: exige AppDatabase */ }
  async dismissedKeys() { /* SELECT recurrence_key FROM dismissed_recurrences */ }
  async dismiss(recurrenceKey, dismissedAt = formatIsoDateTime(new Date())) {
    /* valida con parseRecurrenceKey (InvalidRecurrence si es null);
       INSERT OR IGNORE INTO dismissed_recurrences (recurrence_key, dismissed_at) VALUES (?, ?) */
  }
}

// src/data/repositories/localStorageRecurrenceRepository.js
export const DISMISSED_RECURRENCES_STORAGE_KEY = 'fp_dismissed_recurrences';
export class LocalStorageRecurrenceRepository extends RecurrenceRepository {
  constructor(storage) { /* storage con getItem/setItem (window.localStorage o un falso) */ }
  async dismissedKeys() { /* JSON: [{ recurrenceKey, dismissedAt }]; lectura tolerante a JSON inválido → Set vacío */ }
  async dismiss(recurrenceKey, dismissedAt = formatIsoDateTime(new Date())) { /* sin duplicados */ }
}

// src/features/recurrences/recurrencesLoader.js
export async function loadVisibleRecurrences({
  expenseRepository,     // usa solo findByYearMonth (contrato existente)
  recurrenceRepository,  // dismissedKeys()
  categories = [],       // Category[] para armar categoryNames
  referenceDate,         // 'YYYY-MM-DD'
  detector = new RecurrenceDetector(),
}) { /* -> ReadonlyArray<Recurrence> visibles */ }

// src/features/recurrences/RecurrencesPanel.jsx
export function RecurrencesPanel({ recurrences = [], onDismiss = null, errorMessage = null, viewportWidth = 390 }) {}
RecurrencesPanel.buildStyles = buildRecurrencesPanelStyles; // (viewportWidth) => estilos congelados
export const RECURRENCES_EMPTY_MESSAGE =
  'Todavía no detectamos gastos repetidos en los últimos 60 días.';
```

## Algoritmo de detección (por categoría)

1. Calcular `windowStart = referenceDate − (windowDays − 1)` días (aritmética en UTC sobre
   `YYYY-MM-DD`, función privada del servicio). Descartar gastos con `date < windowStart` o
   `date > referenceDate` (comparación de texto ISO) y gastos con `amountCents` no entero
   o `<= 0` (R11).
2. Agrupar por `categoryId`. Ordenar los gastos de cada categoría por `amountCents`
   ascendente y, ante empate, por `id` ascendente (determinismo).
3. Barrido por la lista ordenada `a[0..n-1]` de cada categoría, con `i = 0`:
   - Buscar el **mayor** `j >= i + minOccurrences − 1` tal que todos los montos de
     `a[i..j]` difieren como máximo un 10 % de la mediana de `a[i..j]` (como la lista está
     ordenada, alcanza con verificar `a[i]` y `a[j]`).
   - Si existe, se emite una `Recurrence` (R1) con `a[i..j]` y se continúa con `i = j + 1`.
   - Si no existe, se continúa con `i = i + 1` (el gasto `a[i]` no forma recurrencia).
   El costo es O(n³) por categoría con n chico (gastos de 60 días); se acepta.
4. Cada conjunto emitido cumple por construcción que ningún gasto difiere más de 10 % del
   monto típico (R3); un gasto atípico queda fuera porque ningún conjunto válido lo
   incluye.
5. La `Recurrence` lleva `typicalAmountCents` = mediana de `a[i..j]`, `occurrences` =
   `j − i + 1` y `expenseIds` ordenados por `id` ascendente. Un conjunto con menos de
   `minOccurrences` gastos nunca se emite (R2).
6. `categoryName`: `categoryNames.get(categoryId)` → si no, `categoryName` del primer gasto
   → si no, `'Categoría <id>'`.
7. El resultado se ordena por `typicalAmountCents × occurrences` descendente; empate por
   `categoryName` (`localeCompare('es', { sensitivity: 'base' })`) y luego
   `typicalAmountCents` ascendente. Se devuelve congelado. Lista vacía → `[]` congelado.

Todo el cálculo es con enteros: no se usa coma flotante para comparar tolerancias.

### Filtro de descartadas (R7)

`filterDismissedRecurrences(recurrences, dismissedKeys)`: una recurrencia se oculta si
existe una clave `k` en `dismissedKeys` con `parseRecurrenceKey(k)` no nulo, el mismo
`categoryId` y `|typicalAmountCents − k.typicalAmountCents| × 10 <= k.typicalAmountCents`.
Las claves inválidas se ignoran. Se compara con tolerancia (y no por igualdad exacta de
clave) porque un gasto nuevo de la misma suscripción mueve la mediana unos centavos y,
con igualdad exacta, la recurrencia descartada «volvería a sugerirse» (CA3).

### Lectura de la ventana sin cambiar contratos

`loadVisibleRecurrences` llama a `expenseRepository.findByYearMonth` para el mes de
`referenceDate` y los dos anteriores (`shiftYearMonth` de `src/core/dates.js`), concatena
y delega en el detector, que filtra la ventana exacta. Tres meses calendario siempre
cubren 60 días corridos (el peor caso, 1 de marzo de año no bisiesto, arranca el 1 de
enero). Luego obtiene `recurrenceRepository.dismissedKeys()` y aplica
`filterDismissedRecurrences`. Es el mismo patrón que `loadPreviousMonthlyTotals` de H7.

## Ubicación en la UI (pestaña «Alertas»)

Desde H13 la navegación son pestañas inferiores en `MonthlyOverviewScreen.jsx`. Las
recurrencias se muestran **solo** en la pestaña `reminders` («Alertas»):

- Dentro de `tab-panel-reminders`, después de la grilla existente (`reminders-section` y
  `monthly-advice-section`), se agrega `h(RecurrencesPanel, { recurrences, onDismiss,
  errorMessage, viewportWidth })`. No se modifica ni se mueve ningún nodo existente.
- La pestaña `overview` («Resumen») no cambia: H13-R1 (sin scroll vertical) se conserva.
- El panel usa siempre la fecha de referencia `today()` (no el mes navegado con
  `periodHeaderNode`); el subtítulo lo aclara: «Últimos 60 días».

### Cambios en `MonthlyOverviewScreen.jsx`

- Nuevas props: `recurrenceRepository = null`, `initialRecurrences = undefined`.
- `createInMemoryRecurrenceRepository()` junto a los demás repositorios en memoria del
  archivo (un `Map` de clave → `dismissedAt`, misma interfaz que `RecurrenceRepository`).
  `const [recRepo] = useState(() => recurrenceRepository ?? createInMemoryRecurrenceRepository())`.
- Estado `recurrences` (inicial `initialRecurrences ?? []`) y `recurrenceError` (`null`).
- Un `useEffect` **propio** (no el existente) que, si `initialRecurrences === undefined`,
  llama a `loadVisibleRecurrences` con `expRepo`, `recRepo`, `categories` y `today()`. Así
  el `useEffect` actual y su condición de salida temprana quedan intactos.
- `reloadPeriod` también recarga recurrencias (un gasto nuevo puede crear una).
- `handleDismissRecurrence(recurrence)`: `await recRepo.dismiss(recurrence.key)` y recarga;
  si falla, `recurrenceError = 'No se pudo descartar la recurrencia. Probá de nuevo.'` y
  la lista no cambia.
- `MonthlyOverviewController`: opción `recurrenceRepository` (con la misma reserva en
  memoria), campo `recurrences = []`, carga en `reloadMonthData` vía
  `loadVisibleRecurrences` con `formatIsoDate(this.today())`, método
  `async dismissRecurrence(recurrenceKey)`, `recurrences` en `getState()` e
  `initialRecurrences` + `recurrenceRepository` en `renderElement()`.

### Cambios en `AppShell.jsx` y `App.jsx`

- `AppShell({ ..., recurrenceRepository = null })` y `AppConsentController` con la misma
  opción; se reenvía a `h(MonthlyOverviewScreen, { ..., recurrenceRepository })`.
- `App.jsx`: `createBrowserRepositories()` devuelve `recurrenceRepo` construido con
  `window.localStorage` (o `null` si no hay `window`, y entonces actúa la reserva en
  memoria de `MonthlyOverviewScreen`). Se pasa como `recurrenceRepository`.

## Diseño Mobile First y adaptación Desktop

`RecurrencesPanel.buildStyles(viewportWidth)` usa `getViewportLayout` de
`src/core/responsive.js` y `CORPORATE_THEME`, igual que `CategoryRankingList`:

- **Mobile (`< 768px`):** tarjeta a ancho completo; elementos apilados en una columna
  (`data-columns="1"`); cada elemento muestra categoría, monto típico
  (`formatCentsToArs`) y «N veces en 60 días»; botón «Descartar» a ancho completo con
  `minHeight: 44`.
- **Tablet y Desktop (`≥ 768px`):** contenedor `maxWidth: layout.containerMaxWidth`
  centrado; grilla de 2 columnas (`data-columns="2"`, `layout.columns`); botón alineado a
  la derecha, también `minHeight: 44`.
- Atributos: `data-testid="recurrences-panel"`, `data-layout` (`mobile|tablet|desktop`),
  `recurrences-list`, `recurrence-item` con `data-recurrence-key`,
  `recurrence-category`, `recurrence-amount`, `recurrence-occurrences`,
  `recurrence-dismiss-button` (con `aria-label="Descartar recurrencia de <categoría>"`),
  `recurrences-empty` y `recurrences-error` (`role="alert"`).
- Accesibilidad: el botón es `<button type="button">`, enfocable por teclado.
- El panel no fija alturas; el contenedor de la pestaña ya deja espacio para la barra
  inferior fija de H13.

## Datos (SQLite)

Migración **versión 3** en `src/data/db/appDatabase.js` (las versiones 1 y 2 no se tocan):

```sql
CREATE TABLE IF NOT EXISTS dismissed_recurrences (
  recurrence_key TEXT PRIMARY KEY,
  dismissed_at TEXT NOT NULL
);
```

Seguida de `PRAGMA user_version = 3;` dentro de `if (currentVersion < 3)`. Una base en
versión 2 se actualiza sin perder datos. `docs/data_model.md` ya lista la tabla y la
migración 3; se completa el formato de `recurrence_key`.

En el navegador, `LocalStorageRecurrenceRepository` guarda bajo la clave
`fp_dismissed_recurrences` un arreglo `[{ recurrenceKey, dismissedAt }]`, con la misma
semántica que la tabla (D1).

## Conjunto de prueba etiquetado (R4, R5)

`test/fixtures/recurrencias_etiquetadas.json` se arma **antes** de implementar el
detector, etiquetando a mano según la definición de CA1. Fecha de referencia
`2026-10-31` (ventana `2026-09-02` a `2026-10-31`). Contenido mínimo:

- **≥ 20 recurrencias reales**: suscripciones, delivery semanal, transporte, café, gimnasio,
  etc.; algunas con variación de hasta 10 % (incluido el borde exacto de 10 %), algunas con
  más de 3 ocurrencias y algunas con un gasto atípico de la misma categoría que no
  pertenece al conjunto (R3).
- **≥ 15 gastos señuelo**: dos repeticiones solamente; tres repeticiones con variaciones
  del 15 % al 30 %; montos similares en categorías distintas; tres repeticiones con una
  fuera de la ventana (R11).
- Los conjuntos `expected` son disjuntos y solo contienen gastos dentro de la ventana.

Formato:

```json
{
  "reference_date": "2026-10-31",
  "categories": {"1": "Suscripciones", "2": "Delivery"},
  "expenses": [{"id": 1, "category_id": 1, "amount_cents": 650000, "date": "2026-09-05"}],
  "expected": [{"category_id": 1, "expense_ids": [1, 7, 15]}]
}
```

**Coincidencia:** una detectada `D` coincide con una esperada `E` si comparten categoría y
`|D ∩ E| × 10 >= 8 × max(|D|, |E|)` (al menos 80 % de solapamiento, simétrico).
Exhaustividad = esperadas con alguna detectada coincidente / esperadas. Precisión =
detectadas con alguna esperada coincidente / detectadas. Ambas `>= 0.85`. La prueba
imprime los valores en el mensaje de la aserción para registrarlos en K4.

## Errores

- Nueva `InvalidRecurrence` (en `src/core/errors.js`) para datos inválidos del modelo y
  claves mal formadas en `dismiss`.
- Una lista vacía de gastos devuelve `[]`.
- Falla al descartar en la UI: mensaje en `recurrences-error`, la recurrencia sigue visible.
- `localStorage` con JSON inválido o sin cuota: se trata como vacío / se ignora la
  escritura (mismo criterio que `readStorage`/`writeStorage` de `App.jsx`).

## Privacidad

- No hay salida de datos (R10). `recurrence.js`, `recurrenceDetector.js` y
  `recurrenceRepository.js` viven en `src/domain/`: no importan `react`, `react-dom`,
  `node:sqlite`, `axios` ni usan `fetch`/`XMLHttpRequest`.
- La clave guardada contiene solo `categoryId` y un monto en centavos: no incluye notas,
  subcategorías, fechas ni identificadores del usuario o del dispositivo.
- Cuando H10 consuma recurrencias, solo usará `categoryName`, `typicalAmountCents` (en
  pesos) y `occurrences` (`docs/llm_assistant.md`); `expenseIds` nunca sale del
  dispositivo.

## Alternativas descartadas

1. **Agrupamiento por k-means sobre los montos.** Exige elegir k, no es determinístico
   entre ejecuciones, es difícil de explicar y de verificar con pruebas exactas, y
   contradice D4. La regla de ventana + tolerancia es explicable («se repitió 3 veces en
   60 días por un monto parecido»).
2. **Agregar `findBetweenDates` al contrato `ExpenseRepository`.** Obligaría a tocar las
   tres implementaciones (SQLite, en memoria de `MonthlyOverviewScreen` y `localStorage`
   de `App.jsx`) y sus pruebas sin necesidad: tres llamadas a `findByYearMonth` cubren la
   ventana.
3. **Pantalla suelta `RecurrencesScreen.jsx`** (borrador original). Desde H13 no hay
   navegación por pantallas sino pestañas inferiores; una sexta pestaña rompería el diseño
   de tarjetas de H13-CA2. Se usa la pestaña «Alertas», que ya agrupa avisos.
4. **Agrupamiento previo «hasta 20 % sobre el primer monto» + mediana** (borrador
   original). Parte conjuntos que cumplen CA1: con típico T, los montos 0,9·T y 1,1·T
   distan 22 % entre sí y quedan en conjuntos distintos (viola R1). El barrido del paso 3
   prueba todos los inicios y valida cada conjunto contra la mediana.
5. **Clave con monto redondeado a $10 e igualdad exacta.** Un gasto nuevo puede cruzar el
   borde de redondeo y la recurrencia descartada reaparece (viola CA3). Se reemplaza por
   clave exacta + comparación con tolerancia de 10 %.

## Riesgos y casos borde

- Gastos el mismo día con el mismo monto (dos cafés): cuentan como ocurrencias distintas.
- Montos muy bajos: la tolerancia del 10 % puede ser menor a $1; se acepta.
- Un descarte oculta también una recurrencia nueva de la misma categoría con monto
  típico dentro del ±10 % del descartado; se acepta como comportamiento esperado de CA3.
- Un aumento de precio > 10 % produce una recurrencia nueva que se vuelve a mostrar; se
  acepta (es información nueva para el usuario).
- Si R4 o R5 no llegan a 0,85, se revisa la implementación del algoritmo (que codifica
  directamente la definición de CA1) y se documenta en
  `progress/impl_h09_deteccion_recurrencias.md`; **no se cambia el conjunto de prueba**
  para hacerlo pasar. Los parámetros de CA1 (3 veces, 60 días, 10 %) no se cambian.
- Las pruebas existentes de `MonthlyOverviewScreen.test.jsx` (H5, H13, H7, H8) y de
  `AppShell` deben seguir pasando sin modificaciones: las props nuevas son opcionales.
