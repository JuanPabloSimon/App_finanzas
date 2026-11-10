# Design — h02_editar_eliminar_gasto

> Decisiones técnicas para H2 (`h02_editar_eliminar_gasto`, orden 3 del flujo SDD). Apoyado en
> `docs/Proyecto_Tec_Laborales_Grupo_3.pdf`, `docs/architecture.md`, `docs/conventions.md`,
> `docs/data_model.md` y `rules.md`.
> Extiende los modelos, repositorios y pantalla de gastos creados en H1 (`h01_registrar_gasto`).

## Archivos

| Capa | Archivo | Cambio |
|---|---|---|
| core | `src/core/errors.js` | Agregar excepción de dominio `ExpenseNotFound` (heredando de `DomainException`) |
| core | `src/core/formatters.js` | Agregar helper `formatCentsToInput(amountCents)` para precargar el campo de monto al editar un gasto (ej. `150050` → `'1500,50'`, `150000` → `'1500'`) |
| domain | `src/domain/repositories/expenseRepository.js` | Extender contrato `ExpenseRepository` con `findById(id)`, `update(expense)` y `deleteById(id)` |
| data | `src/data/repositories/sqliteExpenseRepository.js` | Implementar `findById(id)`, `update(expense)` (`UPDATE expenses SET ... WHERE id = ?`) y `deleteById(id)` (`DELETE FROM expenses WHERE id = ?`), lanzando `ExpenseNotFound` cuando el `id` no existe |
| presentation | `src/features/expenses/ExpenseFormScreen.jsx` | Incorporar modo edición en el formulario, acciones «Editar» y «Eliminar» por fila, confirmación explícita («Confirmar eliminación» / «Cancelar») y tarjeta/encabezado con el total del mes en curso (`data-testid="month-total-amount"`) recalculado en vivo |
| test | `test/domain/models/expense.test.js` | Extender pruebas unitarias con `ExpenseNotFound`, `formatCentsToInput` y contratos `findById`/`update`/`deleteById` (`[H2-R2]`, `[H2-R4]`) |
| test | `test/data/sqliteExpenseRepository.test.js` | Agregar pruebas de persistencia en SQLite en memoria para `findById`, `update` y `deleteById`, incluyendo `ExpenseNotFound` (`[H2-R2]`, `[H2-R4]`, `[H2-R7]`) |
| test | `test/features/expenses/ExpenseFormScreen.test.jsx` | Agregar pruebas de componente e interacción para carga en modo edición, guardado de cambios, recálculo de totales, solicitud/cancelación/confirmación de eliminación y diseño Mobile First + Desktop (`[H2-R1]`, `[H2-R2]`, `[H2-R3]`, `[H2-R4]`, `[H2-R5]`, `[H2-R6]`, `[H2-R7]`, `[H2-R8]`) |

## Firmas nuevas y extendidas

```javascript
// src/core/errors.js
export class ExpenseNotFound extends DomainException {
  constructor(id) {
    super(`No existe el gasto ${id}`);
    this.expenseId = id;
  }
}

// src/core/formatters.js
export function formatCentsToInput(amountCents) {
  // Convierte centavos enteros a string editable (ej. 150000 -> "1500", 150050 -> "1500,50")
}

// src/domain/repositories/expenseRepository.js
export class ExpenseRepository {
  async save(_expense) { /* ... */ }
  async findById(_id) {
    void _id;
    throw new Error('Not implemented');
  }
  async findByYearMonth(_yearMonth) { /* ... */ }
  async update(_expense) {
    void _expense;
    throw new Error('Not implemented');
  }
  async deleteById(_id) {
    void _id;
    throw new Error('Not implemented');
  }
}

// src/data/repositories/sqliteExpenseRepository.js
export class SqliteExpenseRepository extends ExpenseRepository {
  async findById(id) {
    // SELECT e.*, c.name AS category_name FROM expenses e JOIN categories c ON c.id = e.category_id WHERE e.id = ?
  }
  async update(expense) {
    // Valida Expense con id entero > 0, existencia del gasto (si no existe -> lanza ExpenseNotFound)
    // y existencia de la categoría (si no existe -> lanza InvalidCategory).
    // UPDATE expenses SET amount_cents = ?, date = ?, category_id = ?, subcategory = ?, note = ?, updated_at = ? WHERE id = ?
    // Conserva created_at original y devuelve la instancia Expense actualizada con categoryName.
  }
  async deleteById(id) {
    // Verifica id entero > 0 y ejecuta DELETE FROM expenses WHERE id = ?
    // Si result.changes === 0 -> lanza ExpenseNotFound(id).
  }
}

// Métodos nuevos en ExpenseFormController (src/features/expenses/ExpenseFormScreen.jsx)
startEditExpense(expenseId)       // Precarga el gasto en el formulario y activa editingExpenseId
cancelEditExpense()              // Sale del modo edición y limpia el formulario
requestDeleteExpense(expenseId)  // Activa confirmingDeleteId para pedir confirmación explícita
cancelDeleteExpense()            // Cancela la confirmación pendiente sin borrar el gasto
confirmDeleteExpense(expenseId)  // Ejecuta deleteById(id), actualiza listado y recalcula total mensual
```

## Diseño Mobile First y adaptación Desktop

- **Mobile (`< 768px`):**
  - En una sola columna (`data-layout="mobile"`, `data-columns="1"`), cada ítem del listado mensual incluye botones táctiles «Editar» (`data-testid="edit-expense-button-<id>"`) y «Eliminar» (`data-testid="delete-expense-button-<id>"`).
  - Al pulsar «Eliminar», se despliega inline en la tarjeta del gasto el bloque de confirmación (`data-testid="delete-confirm-box-<id>"`) con los botones «Confirmar eliminación» (`data-testid="confirm-delete-button-<id>"`) y «Cancelar» (`data-testid="cancel-delete-button-<id>"`), evitando modales flotantes que salgan del área del pulgar en pantallas chicas.
  - En el encabezado del listado mensual se muestra el total acumulado del mes (`data-testid="month-total-amount"`), que se recalcula de inmediato tras cada alta, edición o eliminación.
- **Tablet y Desktop (`≥ 768px`):**
  - En la grilla de 2 columnas (`data-columns="2"`), al pulsar «Editar» en un gasto de la columna derecha (listado y resumen mensual), la columna izquierda (formulario) pasa inmediatamente a modo «Editar gasto» (`data-testid="expense-form-title"`) con botón secundario «Cancelar edición» (`data-testid="cancel-edit-button"`), permitiendo editar y ver el impacto en vivo en la columna derecha sin desplazarse ni cambiar de pantalla.
  - Todos los botones de acción cuentan con `tabIndex={0}` para navegación por teclado.

## Datos (`expo-sqlite`)

- **Sin nueva migración de esquema:** la tabla `expenses` creada en la migración v1 (`src/data/db/appDatabase.js`) ya incluye `id INTEGER PRIMARY KEY AUTOINCREMENT`, `amount_cents`, `date`, `category_id`, `subcategory`, `note`, `created_at` y `updated_at`.
- Las operaciones `UPDATE` y `DELETE` usan consultas SQL parametrizadas con `?`.

## Errores

- `ExpenseNotFound` (nueva en `src/core/errors.js`, documentada en `docs/architecture.md` y `docs/conventions.md`): se lanza cuando `update(expense)` o `deleteById(id)` recibe un `id` que no existe en `expenses`.
- `InvalidAmount`, `InvalidExpenseDate` e `InvalidCategory` (reutilizadas de H1): se lanzan si durante la edición se intenta guardar un monto `<= 0` o inválido, una fecha inválida o una categoría inexistente.

## Privacidad

- Todas las operaciones de edición y borrado ocurren exclusivamente sobre la base SQLite local (`gastos.db`).
- Cuando un gasto se elimina y el usuario lo confirma, el registro se borra físicamente (`DELETE FROM expenses WHERE id = ?`), respetando el control total del usuario sobre sus datos en el dispositivo (Ley 25.326).
- Ningún módulo de esta feature realiza llamadas de red.

## Alternativa descartada

**Alternativa A: Borrado lógico (*soft delete* mediante una columna `deleted_at`) o eliminación inmediata sin confirmación con botón «Deshacer» temporal (*toast*).**
Se descarta porque:
1. Un borrado lógico agregaría una columna no prevista en `docs/data_model.md` (entregable E3) y obligaría a filtrar `WHERE deleted_at IS NULL` en todas las consultas de H3, H6, H7, H8, H9, H10 y H11, además de retener en disco datos que el usuario pidió eliminar.
2. La eliminación inmediata sin confirmación previa contradice explícitamente el criterio de aceptación `CA2` de `feature_list.json` (*«Eliminar un gasto pide confirmación; al confirmar, el gasto desaparece y los totales se recalculan»*).

## Riesgos y casos borde

- **Edición con monto inválido:** si el usuario está editando un gasto válido y borra el monto o escribe `0` o un valor negativo, el formulario muestra `amount-error` y mantiene el registro original sin cambios en SQLite ni en el listado mensual.
- **Eliminación de un gasto que estaba siendo editado:** si el usuario tenía abierto en edición el gasto `X` y decide eliminarlo y confirma, el formulario sale automáticamente del modo edición y vuelve al estado limpio de registro nuevo.
- **Cambio de fecha al editar:** si al editar un gasto se modifica su monto o su categoría dentro del mes, el listado y el total del mes (`monthlyTotalCents`) se actualizan en el acto; si se cambia la fecha a otro mes, el listado del mes visualizado se refresca reflejando su salida de ese mes.
