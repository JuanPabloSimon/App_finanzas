# Design — h03_listado_mensual

> Decisiones técnicas para H3 (`h03_listado_mensual`, orden 4 del flujo SDD). Apoyado en
> `docs/Proyecto_Tec_Laborales_Grupo_3.pdf`, `docs/architecture.md`, `docs/conventions.md`,
> `docs/data_model.md` y `rules.md`.
> Extiende las utilidades de fechas y la pantalla de gastos desarrolladas en H1 y H2.

## Archivos

| Capa | Archivo | Cambio |
|---|---|---|
| core | `src/core/dates.js` | Agregar helpers puros `isValidYearMonth(yearMonth)`, `shiftYearMonth(yearMonth, deltaMonths)` y `formatYearMonthLabel(yearMonth)` validando formato `YYYY-MM` y lanzando `InvalidExpenseDate` ante entradas inválidas |
| presentation | `src/features/expenses/ExpenseFormScreen.jsx` | Incorporar barra de navegación mensual (`goToPreviousMonth`, `goToNextMonth`, `goToYearMonth`) con etiqueta legible del período (`data-testid="active-month-label"`), restricción de no avanzar más allá del mes actual (`canGoNextMonth`), y estado vacío enriquecido con botón de acción directa a la carga (`focusNewExpenseFromEmptyState` / `data-testid="empty-state-cta-button"`) |
| test | `test/domain/models/expense.test.js` | Extender pruebas unitarias con `isValidYearMonth`, `shiftYearMonth` (incluyendo cruce de año `2026-01` ↔ `2025-12`) y `formatYearMonthLabel` (`[H3-R5]`, `[H3-R7]`) |
| test | `test/data/sqliteExpenseRepository.test.js` | Agregar prueba de persistencia en SQLite en memoria verificando ordenamiento descendente por fecha (`date DESC, id DESC`) y filtrado estricto entre mes actual y meses anteriores (`[H3-R1]`, `[H3-R5]`) |
| test | `test/features/expenses/ExpenseFormScreen.test.jsx` | Agregar pruebas de componente e interacción para listado ordenado con monto/categoría/nota, total del mes (`$ 0` en vacío), estado vacío con CTA directo a la carga, navegación al mes anterior y regreso al mes siguiente, y diseño Mobile First + Desktop (`[H3-R1]`, `[H3-R2]`, `[H3-R3]`, `[H3-R4]`, `[H3-R5]`, `[H3-R6]`, `[H3-R8]`) |

## Firmas nuevas y extendidas

```javascript
// src/core/dates.js
export function isValidYearMonth(value) {
  // Verifica formato YYYY-MM con mes 01..12
}

export function shiftYearMonth(yearMonth, deltaMonths) {
  // Desplaza yearMonth en deltaMonths (ej. shiftYearMonth('2026-01', -1) -> '2025-12').
  // Si yearMonth no es válido o deltaMonths no es entero -> lanza InvalidExpenseDate.
}

export function formatYearMonthLabel(yearMonth) {
  // Devuelve etiqueta legible en español, ej. '2026-11' -> 'Noviembre 2026 (2026-11)'
}

// Métodos nuevos en ExpenseFormController (src/features/expenses/ExpenseFormScreen.jsx)
async goToPreviousMonth()             // Retrocede activeYearMonth en 1 mes y recarga expenses desde SQLite
async goToNextMonth()                 // Avanza activeYearMonth en 1 mes (hasta currentYearMonth) y recarga expenses
async goToYearMonth(targetYearMonth)  // Cambia al período indicado y recarga expenses
activateEmptyStateCta()               // Sale de modo edición, ajusta fecha al mes activo y activa focusRequestedOnAmount
```

## Diseño Mobile First y adaptación Desktop

- **Mobile (`< 768px`):**
  - El encabezado del listado mensual incorpora una barra de navegación compacta (`data-testid="month-navigation-bar"`) con botones táctiles (`minHeight: 44`) «← Mes anterior» (`data-testid="prev-month-button"`) y «Mes siguiente →» (`data-testid="next-month-button"`, deshabilitado cuando `activeYearMonth === currentYearMonth`).
  - Cuando no existen gastos en el mes seleccionado, el bloque de estado vacío (`data-testid="empty-month-expenses"`) muestra el mensaje explicativo y el botón táctil de ancho completo «Registrar gasto en este mes» (`data-testid="empty-state-cta-button"`), que prepara el formulario para cargar inmediatamente en ese período.
- **Tablet y Desktop (`≥ 768px`):**
  - En la disposición de 2 columnas (`data-columns="2"`), el usuario puede recorrer meses anteriores en la columna derecha mientras el formulario permanece visible en la columna izquierda; todos los botones de navegación y el CTA del estado vacío incluyen `tabIndex={0}` para navegación por teclado.

## Datos (`expo-sqlite`)

- **Sin migración adicional:** reutiliza la consulta `findByYearMonth(yearMonth)` de `SqliteExpenseRepository` con `WHERE substr(e.date, 1, 7) = ? ORDER BY e.date DESC, e.id DESC`, apoyada en el índice `idx_expenses_date` definido en la migración v1 (`src/data/db/appDatabase.js`).

## Errores

- `InvalidExpenseDate` (de `src/core/errors.js`): lanzada por `shiftYearMonth` y `formatYearMonthLabel` cuando el parámetro `yearMonth` no respeta el patrón `YYYY-MM` con mes entre `01` y `12`.

## Privacidad

- Toda la consulta histórica por mes se resuelve localmente sobre SQLite en el dispositivo (`gastos.db`), sin tráfico de red.

## Alternativa descartada

**Alternativa A: Cargar todos los gastos históricos en memoria al iniciar y filtrar por mes en el cliente React.**
Se descarta porque a medida que crezca el historial anual de gastos del usuario degradaría el tiempo de arranque y el consumo de memoria en dispositivos móviles de gama media/baja, mientras que la consulta SQLite filtrada por `substr(e.date, 1, 7) = ?` aprovecha la base local y mantiene un costo constante por mes.

## Riesgos y casos borde

- **Cambio de año al navegar hacia atrás:** navegar al mes anterior desde enero (`2026-01`) debe pasar correctamente a diciembre del año previo (`2025-12`).
- **Alta o acceso directo desde un mes anterior vacío:** si el usuario navega a un mes anterior sin gastos (por ejemplo `2026-10`) y pulsa el acceso directo a la carga (`empty-state-cta-button`), la fecha propuesta en el formulario se ajusta al mes visualizado (`2026-10-01`) para que el gasto cargado impacte en el mes que estaba consultando.
