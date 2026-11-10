# Design — h01_registrar_gasto

> Decisiones técnicas para H1 (`h01_registrar_gasto`, orden 2 del flujo SDD). Apoyado en
> `docs/Proyecto_Tec_Laborales_Grupo_3.pdf` (OE1 / K1 ≤ 15 s), `docs/architecture.md`,
> `docs/conventions.md`, `docs/data_model.md` y `rules.md`.
> Se integra sobre la infraestructura base y la migración v1 creadas en H12.

## Archivos

| Capa | Archivo | Cambio |
|---|---|---|
| core | `src/core/errors.js` | Agregar excepciones de dominio `InvalidAmount`, `InvalidExpenseDate` e `InvalidCategory` (heredando de `DomainException`) |
| core | `src/core/dates.js` | Agregar utilidades de fecha `isValidIsoDate(value)`, `formatIsoDate(date)` (`YYYY-MM-DD`) y `extractYearMonth(isoDate)` (`YYYY-MM`) |
| core | `src/core/formatters.js` | Crear conversor y formateador monetario entre pesos e importes enteros en centavos (`parseAmountToCents`, `formatCentsToArs`) |
| domain | `src/domain/models/category.js` | Crear modelo inmutable `Category` (`Object.freeze`, `copyWith`, `isEqual`) |
| domain | `src/domain/models/expense.js` | Crear modelo inmutable `Expense` (`Object.freeze`, `copyWith`, `isEqual`) con validación de `amountCents` entero `> 0`, `date` `YYYY-MM-DD`, `categoryId` entero `> 0` y normalización de `subcategory` / `note` opcionales |
| domain | `src/domain/repositories/categoryRepository.js` | Crear contrato `CategoryRepository` (`findAll`, `findById`) |
| domain | `src/domain/repositories/expenseRepository.js` | Crear contrato `ExpenseRepository` (`save`, `findByYearMonth`) |
| data | `src/data/repositories/sqliteCategoryRepository.js` | Crear `SqliteCategoryRepository` sobre la tabla `categories` de SQLite |
| data | `src/data/repositories/sqliteExpenseRepository.js` | Crear `SqliteExpenseRepository` sobre la tabla `expenses` de SQLite con `JOIN` a `categories` para exponer el nombre de la categoría |
| presentation | `src/features/expenses/ExpenseFormScreen.jsx` | Crear pantalla/vista de registro de gasto y listado del mes actual con enfoque Mobile First (`< 768px`) y adaptación Desktop (`≥ 768px`) |
| presentation | `src/app/AppShell.jsx` | Montar `ExpenseFormScreen` como contenido principal por defecto una vez aceptado el aviso de privacidad (H12) |
| test | `test/domain/models/expense.test.js` | Pruebas unitarias de `Expense`, `Category`, `parseAmountToCents` y validaciones (`[H1-R2]`, `[H1-R4]`, `[H1-R6]`, `[H1-R7]`) |
| test | `test/data/sqliteExpenseRepository.test.js` | Pruebas de persistencia en SQLite en memoria para `SqliteCategoryRepository` y `SqliteExpenseRepository` (`[H1-R1]`, `[H1-R2]`, `[H1-R4]`, `[H1-R6]`, `[H1-R7]`) |
| test | `test/features/expenses/ExpenseFormScreen.test.jsx` | Pruebas de componente e integración de UI para carga de gasto, valores por defecto, errores junto al campo, actualización del listado mensual y diseño Mobile First + Desktop (`[H1-R1]`, `[H1-R2]`, `[H1-R3]`, `[H1-R4]`, `[H1-R5]`, `[H1-R6]`, `[H1-R7]`, `[H1-R8]`) |

## Firmas nuevas

```javascript
// src/core/errors.js
export class InvalidAmount extends DomainException {
  constructor(detail = 'Ingresá un monto mayor que cero') {
    super(detail);
  }
}

export class InvalidExpenseDate extends DomainException {
  constructor(detail = 'Ingresá una fecha válida (AAAA-MM-DD)') {
    super(detail);
  }
}

export class InvalidCategory extends DomainException {
  constructor(detail = 'Seleccioná una categoría válida') {
    super(detail);
  }
}

// src/core/dates.js
export function isValidIsoDate(value) { /* YYYY-MM-DD válido en calendario */ }
export function formatIsoDate(date = new Date()) { /* YYYY-MM-DD */ }
export function extractYearMonth(isoDate) { /* YYYY-MM */ }

// src/core/formatters.js
export function parseAmountToCents(rawInput) {
  // Convierte string o número (ej. "1500", "1500.50", "1500,50") a entero en centavos.
  // Lanza InvalidAmount si está vacío, no es numérico, <= 0 o tiene más de 2 decimales.
}
export function formatCentsToArs(amountCents) {
  // Formatea centavos enteros a moneda legible, ej. "$ 1.500,50" o "$ 1.500"
}

// src/domain/models/category.js
export class Category {
  constructor({ id, name, isPredefined = true, createdAt }) {
    // Valida id entero > 0 y name no vacío
    this.id = id;
    this.name = name.trim();
    this.isPredefined = Boolean(isPredefined);
    this.createdAt = createdAt;
    Object.freeze(this);
  }
  copyWith(patch = {}) { /* ... */ }
  isEqual(other) { /* ... */ }
}

// src/domain/models/expense.js
export class Expense {
  constructor({
    id = null,
    amountCents,
    date,
    categoryId,
    categoryName = null,
    subcategory = null,
    note = null,
    createdAt,
    updatedAt,
  }) {
    // Valida Number.isInteger(amountCents) && amountCents > 0 -> si no, lanza InvalidAmount
    // Valida isValidIsoDate(date) -> si no, lanza InvalidExpenseDate
    // Valida Number.isInteger(categoryId) && categoryId > 0 -> si no, lanza InvalidCategory
    // Normaliza subcategory y note: string vacío o solo espacios -> null
    Object.freeze(this);
  }
  copyWith(patch = {}) { /* ... */ }
  isEqual(other) { /* ... */ }
}

// src/domain/repositories/categoryRepository.js
export class CategoryRepository {
  async findAll() {
    throw new Error('Not implemented');
  }
  async findById(_id) {
    throw new Error('Not implemented');
  }
}

// src/domain/repositories/expenseRepository.js
export class ExpenseRepository {
  async save(_expense) {
    throw new Error('Not implemented');
  }
  async findByYearMonth(_yearMonth) {
    throw new Error('Not implemented');
  }
}

// src/data/repositories/sqliteCategoryRepository.js
export class SqliteCategoryRepository extends CategoryRepository {
  constructor(db) {
    super();
    this.db = db;
  }
  async findAll() { /* SELECT id, name, is_predefined, created_at FROM categories ORDER BY id ASC */ }
  async findById(id) { /* SELECT id, name, is_predefined, created_at FROM categories WHERE id = ? */ }
}

// src/data/repositories/sqliteExpenseRepository.js
export class SqliteExpenseRepository extends ExpenseRepository {
  constructor(db) {
    super();
    this.db = db;
  }
  async save(expense) {
    // Valida instancia de Expense y existencia de category_id; INSERT INTO expenses ...
    // Devuelve nueva instancia de Expense con el id autogenerado y categoryName.
  }
  async findByYearMonth(yearMonth) {
    // SELECT e.*, c.name AS category_name FROM expenses e JOIN categories c ON c.id = e.category_id
    // WHERE substr(e.date, 1, 7) = ? ORDER BY e.date DESC, e.id DESC
  }
}

// src/features/expenses/ExpenseFormScreen.jsx
export function ExpenseFormScreen({
  expenseRepository,
  categoryRepository,
  initialCategories = undefined,
  initialExpenses = undefined,
  today = () => formatIsoDate(new Date()),
  now = () => new Date(),
  viewportWidth = 390,
}) { /* ... */ }
```

## Diseño Mobile First y adaptación Desktop

- **Mobile (`< 768px`):**
  - Disposición en una sola columna vertical (`data-layout="mobile"`, `data-columns="1"`), optimizada para registrar un gasto en menos de 15 segundos (KPI K1) con una sola mano.
  - Campo de **Monto** en primer lugar con tipografía destacada y mensaje de error inline (`data-testid="amount-error"`) inmediatamente debajo del campo cuando el valor es inválido (`CA2`).
  - Selector de **Categoría** (que ordena y muestra primero las categorías frecuentes —según el uso en `expenses` o el orden de uso cotidiano de las predefinidas: Alimentos, Transporte, Servicios, etc.— para cumplir la condición de alcanzabilidad del objetivo SMART **OE1** del informe) y campo de **Fecha** (inicializado en `today()`, `YYYY-MM-DD`), seguidos de los campos opcionales **Subcategoría** y **Nota**.
  - Botón primario «Guardar gasto» de ancho completo (`width: '100%'`) y altura táctil mínima de `48px` (`minHeight: 48`).
  - Debajo del formulario se muestra el listado de gastos del mes (`data-testid="month-expense-list"`).
- **Tablet y Desktop (`≥ 768px`):**
  - Contenedor centrado (`maxWidth: 720px` en tablet, `960px` en desktop) y grilla de 2 columnas (`data-columns="2"`): en la columna izquierda el formulario de carga rápida y en la columna derecha el listado de gastos del mes en curso actualizado en vivo.
  - Navegación por teclado (`tabIndex={0}`, envío con tecla `Enter` en el formulario o botón de confirmación).

## Datos (`expo-sqlite`)

- **Sin nueva migración de esquema:** la migración **versión 1** en `src/data/db/appDatabase.js` ya creó las tablas `categories` (con las 10 categorías predefinidas) y `expenses` (`id`, `amount_cents CHECK (amount_cents > 0)`, `date`, `category_id REFERENCES categories(id) ON DELETE RESTRICT`, `subcategory`, `note`, `created_at`, `updated_at`) junto con los índices `idx_expenses_date` e `idx_expenses_category_date`, cumpliendo `docs/data_model.md`.
- Todos los importes se persisten como enteros en centavos (`amount_cents`) según la regla 12 de `rules.md`.

## Errores

- `InvalidAmount` (hereda de `DomainException`): se lanza cuando el monto está vacío, no es numérico, es `<= 0`, tiene más de dos decimales o cuando `amountCents` en `Expense` no es un entero positivo. La UI captura `InvalidAmount` y muestra el mensaje junto al campo de monto (`data-testid="amount-error"`) sin guardar ni reiniciar los demás campos del formulario.
- `InvalidExpenseDate` (hereda de `DomainException`): se lanza cuando la fecha no respeta el formato `YYYY-MM-DD` o no es una fecha calendario válida (por ejemplo `2026-02-30`).
- `InvalidCategory` (hereda de `DomainException`): se lanza cuando `categoryId` no es un entero positivo o no corresponde a una categoría existente.

## Privacidad

- Todos los datos del gasto (incluyendo `subcategory` y `note`) se almacenan exclusivamente en la base SQLite local del dispositivo (`gastos.db`).
- Ningún módulo de esta feature realiza llamadas de red (regla 13 de `rules.md`).
- El diseño de la tabla `expenses` mantiene separadas las columnas `subcategory` y `note` para que en H10 (`SpendingSummaryBuilder`) puedan excluirse por completo al construir el resumen agregado (regla 15 de `rules.md`).

## Alternativa descartada

**Alternativa A: Guardar el monto como `REAL` / `Number` en coma flotante en pesos (por ejemplo `1500.50`) en lugar de centavos enteros (`150050`).**
Se descarta porque:
1. La aritmética de punto flotante IEEE 754 introduce errores de redondeo acumulados al sumar gastos mensuales (`0.1 + 0.2 !== 0.3`), lo que haría fallar la coincidencia exacta de totales en el listado (H3), el gráfico de categorías (H6) y la exportación CSV (H11).
2. Viola la decisión arquitectónica D3 (`docs/architecture.md`) y la regla dura 12 de `rules.md` (`Number.isInteger(amountCents)`).

## Riesgos y casos borde

- **Separador decimal coma o punto:** en español rioplatense el usuario suele escribir `"1250,50"` o `"1250.50"`. `parseAmountToCents` acepta ambos separadores decimales para un único separador con hasta 2 dígitos decimales, y rechaza cadenas ambiguas o no numéricas.
- **Espacios en blanco en subcategoría y nota:** si el usuario ingresa `"   "` en `subcategory` o `note`, el constructor de `Expense` lo normaliza a `null` para no ensuciar la base con cadenas en blanco.
- **Limpieza tras guardar:** al confirmar un gasto válido, el formulario limpia el monto, la subcategoría y la nota, conserva la fecha actual y la categoría para facilitar cargas consecutivas rápidas, y oculta cualquier mensaje de error previo.
