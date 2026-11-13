# Design — h04_categorias_propias

> Decisiones técnicas para H4 (`h04_categorias_propias`, orden 7 del flujo SDD). Apoyado en
> `docs/Proyecto_Tec_Laborales_Grupo_3.pdf`, `docs/architecture.md`, `docs/conventions.md`,
> `docs/data_model.md` y `rules.md`.
> Extiende los modelos, contratos, repositorios SQLite y pantallas de carga creados en H1, H2, H3, H5 y H6.

## Archivos

| Capa | Archivo | Cambio |
|---|---|---|
| core | `src/core/errors.js` | Agregar excepciones de dominio `DuplicateCategory`, `CategoryNotFound`, `PredefinedCategoryDeletionNotAllowed` y `CategoryInUse` (heredando de `DomainException`) |
| domain | `src/domain/models/category.js` | Permitir `id = null` en instancias borrador aún no persistidas (cuando se construye una categoría propia antes de insertarla en SQLite) y validar `name` recortado no vacío |
| domain | `src/domain/repositories/categoryRepository.js` | Extender contrato `CategoryRepository` con `findByName(name)`, `save(category)`, `countExpenses(categoryId)` y `deleteById(id, options)` |
| domain | `src/domain/repositories/expenseRepository.js` | Extender contrato `ExpenseRepository` con `countByCategoryId(categoryId)` y `reassignCategory(fromCategoryId, toCategoryId)` |
| data | `src/data/repositories/sqliteCategoryRepository.js` | Implementar `findByName(name)` (consulta `COLLATE NOCASE`), `save(category)` (validando unicidad `COLLATE NOCASE` y lanzando `DuplicateCategory`), `countExpenses(categoryId)` y `deleteById(id, { reassignToCategoryId })` (bloqueando predefinidas con `PredefinedCategoryDeletionNotAllowed`, exigiendo reasignación si tiene gastos asociados con `CategoryInUse` y reasignando en `expenses` antes de borrar) |
| data | `src/data/repositories/sqliteExpenseRepository.js` | Implementar `countByCategoryId(categoryId)` y `reassignCategory(fromCategoryId, toCategoryId)` actualizando `category_id` y `updated_at` |
| presentation | `src/features/expenses/ExpenseFormScreen.jsx` | Incorporar el panel/sección de gestión de categorías (`data-testid="category-manager-section"`) junto al formulario de carga de gastos (y métodos en `ExpenseFormController`): alta de categoría propia, listado de categorías con indicador de predefinida/propia y cantidad de gastos, eliminación directa si no tiene gastos y flujo de reasignación (`data-testid="reassign-category-box-<id>"`) cuando posee gastos asociados |
| presentation | `src/features/income/MonthlyOverviewScreen.jsx` | Sincronizar las categorías y gastos del tablero cuando se crean o eliminan/reasignan categorías desde la pestaña de gastos |
| test | `test/domain/models/expense.test.js` | Extender pruebas unitarias de dominio con `[H4-R1]`, `[H4-R3]`, `[H4-R4]`, `[H4-R5]` y `[H4-R7]` para `Category`, nuevas excepciones y contratos de `CategoryRepository` y `ExpenseRepository` |
| test | `test/data/sqliteExpenseRepository.test.js` | Agregar pruebas de persistencia en SQLite en memoria `[H4-R1]`, `[H4-R3]`, `[H4-R4]`, `[H4-R5]`, `[H4-R6]` y `[H4-R7]` verificando unicidad `COLLATE NOCASE`, protección de predefinidas, borrado de categorías propias sin gastos y borrado tras reasignación de gastos |
| test | `test/features/expenses/ExpenseFormScreen.test.jsx` | Agregar pruebas de componente e interacción `[H4-R1]`..`[H4-R8]` verificando alta y disponibilidad inmediata en el selector de carga, rechazo de duplicados sin distinguir mayúsculas, imposibilidad de borrar predefinidas, reasignación de gastos antes de eliminar y diseño Mobile First + Desktop |

## Firmas nuevas y extendidas

```javascript
// src/core/errors.js
export class DuplicateCategory extends DomainException {
  constructor(name) {
    super(`Ya existe una categoría con el nombre "${name}"`);
    this.categoryName = name;
  }
}

export class CategoryNotFound extends DomainException {
  constructor(id) {
    super(`No existe la categoría ${id}`);
    this.categoryId = id;
  }
}

export class PredefinedCategoryDeletionNotAllowed extends DomainException {
  constructor(name = '') {
    super(
      name
        ? `La categoría predefinida "${name}" no se puede eliminar`
        : 'Las categorías predefinidas no se pueden eliminar',
    );
  }
}

export class CategoryInUse extends DomainException {
  constructor(id, expenseCount = 1) {
    super(
      `La categoría tiene ${expenseCount} gasto(s) asociado(s). Reasignalos a otra categoría antes de eliminarla.`,
    );
    this.categoryId = id;
    this.expenseCount = expenseCount;
  }
}

// src/domain/repositories/categoryRepository.js
export class CategoryRepository {
  async findAll() { /* ... */ }
  async findById(_id) { /* ... */ }
  async findByName(_name) {
    void _name;
    throw new Error('Not implemented');
  }
  async save(_category) {
    void _category;
    throw new Error('Not implemented');
  }
  async countExpenses(_categoryId) {
    void _categoryId;
    throw new Error('Not implemented');
  }
  async deleteById(_id, _options = {}) {
    void _id;
    void _options;
    throw new Error('Not implemented');
  }
}

// src/domain/repositories/expenseRepository.js
export class ExpenseRepository {
  // ... save, findById, findByYearMonth, update, deleteById
  async countByCategoryId(_categoryId) {
    void _categoryId;
    throw new Error('Not implemented');
  }
  async reassignCategory(_fromCategoryId, _toCategoryId) {
    void _fromCategoryId;
    void _toCategoryId;
    throw new Error('Not implemented');
  }
}

// Métodos nuevos en ExpenseFormController (src/features/expenses/ExpenseFormScreen.jsx)
setNewCategoryNameInput(value)                          // Actualiza el input de nueva categoría propia
createCustomCategory(nameOverride)                      // Crea categoría propia, refresca selector y la deja disponible (y seleccionada)
requestDeleteCategory(categoryId)                       // Si tiene gastos asociados abre el selector de categoría destino; si tiene 0 gastos pide/ejecuta borrado
setReassignTargetCategoryId(categoryId)                 // Define la categoría destino para reasignar gastos
cancelDeleteCategory()                                  // Cancela el flujo de eliminación/reasignación de categoría
confirmDeleteCategory(categoryId, reassignToCategoryId) // Reasigna gastos (si corresponde), elimina la categoría propia y refresca listado y selector
```

## Diseño Mobile First y adaptación Desktop

- **Mobile (`< 768px`):**
  - Disposición en una sola columna (`data-layout="mobile"`, `data-columns="1"`).
  - La sección de gestión de categorías (`data-testid="category-manager-section"`) presenta un formulario compacto con campo de texto (`data-testid="new-category-name-input"`, `minHeight: 44px`) y botón táctil «Crear categoría» (`data-testid="create-category-button"`, `minHeight: 48px`, ancho `100%`).
  - En el listado de categorías (`data-testid="category-manager-list"`), las categorías predefinidas muestran la etiqueta «Predefinida» (`data-testid="predefined-badge-<id>"`) sin botón de eliminación habilitado, mientras que las categorías propias muestran la etiqueta «Propia» y el botón táctil «Eliminar categoría» (`data-testid="delete-category-button-<id>"`, `minHeight: 44px`).
  - Cuando el usuario pulsa «Eliminar categoría» sobre una categoría propia con gastos asociados, se despliega inline el panel de reasignación (`data-testid="reassign-category-box-<id>"`) con el selector de categoría de destino (`data-testid="reassign-target-select-<id>"`) y los botones «Reasignar y eliminar» (`data-testid="confirm-reassign-delete-button-<id>"`) y «Cancelar» (`data-testid="cancel-delete-category-button-<id>"`).
- **Tablet y Desktop (`≥ 768px`):**
  - En pantallas `≥ 768px` (`data-layout="tablet"` o `data-layout="desktop"`, `data-columns="2"`), el área de trabajo organiza el formulario y la administración de categorías con controles alineados horizontalmente y navegación completa por teclado (`tabIndex={0}`).

## Datos (`expo-sqlite`)

- **Sin nueva migración de esquema:** la migración v1 (`src/data/db/appDatabase.js`) y `docs/data_model.md` ya definen:
  - `categories(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE COLLATE NOCASE, is_predefined INTEGER NOT NULL, created_at TEXT NOT NULL)`
  - `expenses(..., category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT, ...)`
- La restricción `UNIQUE COLLATE NOCASE` en `categories.name` y la clave foránea `ON DELETE RESTRICT` en `expenses.category_id` respaldan a nivel motor SQLite las invariantes del dominio (`R1`, `R4`, `R7`).
- Todas las sentencias SQL utilizan parámetros `?`.

## Errores

- `InvalidCategory` (existente en `src/core/errors.js`): se lanza cuando el nombre de la categoría está vacío o no es texto válido, o cuando la categoría de destino de una reasignación es inválida o coincide con la categoría que se desea eliminar.
- `DuplicateCategory` (nueva en `src/core/errors.js`): se lanza cuando ya existe una categoría cuyo `name` coincide sin distinguir mayúsculas/minúsculas (`COLLATE NOCASE`).
- `CategoryNotFound` (nueva en `src/core/errors.js`): se lanza cuando se intenta eliminar o reasignar desde/hacia un `id` de categoría inexistente.
- `PredefinedCategoryDeletionNotAllowed` (nueva en `src/core/errors.js`): se lanza cuando se intenta eliminar una categoría con `isPredefined === true` (`is_predefined = 1`).
- `CategoryInUse` (nueva en `src/core/errors.js`): se lanza cuando se invoca `deleteById(id)` sobre una categoría propia que tiene gastos asociados sin proporcionar una categoría de destino válida (`reassignToCategoryId`).

## Privacidad

- Las categorías propias se almacenan únicamente en la base de datos SQLite local (`gastos.db`) dentro del dispositivo (Ley 25.326).
- Esta feature no realiza ninguna llamada de red ni envía datos a servicios externos.

## Alternativa descartada

**Alternativa A: Eliminación en cascada (`ON DELETE CASCADE`) o asignación silenciosa automática a «Otros» al borrar una categoría propia con gastos.**
Se descarta porque:
1. `ON DELETE CASCADE` destruiría gastos históricos del usuario al borrar una categoría, violando la integridad contable de los totales mensuales y contradiciendo `docs/data_model.md` (`ON DELETE RESTRICT`).
2. Reasignar silenciosamente sin que el usuario elija y confirme la categoría de destino contradice el criterio de aceptación `CA2` (*«una categoría propia con gastos asociados solo se elimina después de reasignarlos»*).

## Riesgos y casos borde

- **Nombres con espacios al inicio o al final o diferente capitalización:** `'  alimentos '` o `'ALIMENTOS'` se recorta con `.trim()` antes de comparar con `COLLATE NOCASE`, detectando correctamente que repite la predefinida `'Alimentos'` y lanzando `DuplicateCategory`.
- **Intento de reasignar gastos a la misma categoría que se está eliminando:** el repositorio valida `Number(reassignToCategoryId) !== Number(id)` y la existencia de la categoría destino antes de ejecutar el `UPDATE expenses SET category_id = ? WHERE category_id = ?`.
- **Categoría seleccionada actualmente en el formulario de gasto:** si el usuario elimina la categoría propia que estaba seleccionada en el `<select>` de carga de gastos, el formulario selecciona automáticamente la categoría de reasignación (o la primera categoría disponible) para no dejar un `categoryId` huérfano.
