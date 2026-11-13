# Implementación — `h04_categorias_propias` (H4)

- **Feature:** `H4 — Crear categorías propias` (`h04_categorias_propias`, orden 7)
- **Herramienta:** `antigravity`
- **Agente:** `implementer`
- **Fecha:** `2026-11-11`

## Archivos modificados

| Capa | Archivo | Cambio |
|---|---|---|
| Core | `src/core/errors.js` | Se agregaron las excepciones de dominio `DuplicateCategory`, `CategoryNotFound`, `PredefinedCategoryDeletionNotAllowed` y `CategoryInUse` heredando de `DomainException`. |
| Dominio | `src/domain/models/category.js` | Se habilitó la creación de borradores de categorías propias con `id = null` e `isPredefined = false` por defecto, manteniendo la validación de nombre no vacío recortado (`trim`) e inmutabilidad (`Object.freeze`). |
| Dominio | `src/domain/repositories/categoryRepository.js` | Se extendió el contrato `CategoryRepository` con `findByName(name)`, `save(category)`, `countExpenses(categoryId)` y `deleteById(id, options)`. |
| Dominio | `src/domain/repositories/expenseRepository.js` | Se extendió el contrato `ExpenseRepository` con `countByCategoryId(categoryId)` y `reassignCategory(fromCategoryId, toCategoryId)`. |
| Datos | `src/data/repositories/sqliteCategoryRepository.js` | Se implementaron `findByName(name)` (`COLLATE NOCASE`), `save(category)` (validando unicidad sin distinguir mayúsculas/minúsculas y lanzando `DuplicateCategory`), `countExpenses(categoryId)` y `deleteById(id, { reassignToCategoryId })` (protegiendo predefinidas con `PredefinedCategoryDeletionNotAllowed`, bloqueando borrado directo con `CategoryInUse` si tiene gastos asociados y reasignando en `expenses` antes de eliminar). |
| Datos | `src/data/repositories/sqliteExpenseRepository.js` | Se implementaron `countByCategoryId(categoryId)` y `reassignCategory(fromCategoryId, toCategoryId)` actualizando `category_id` y `updated_at`. |
| Presentación | `src/features/expenses/ExpenseFormScreen.jsx` | Se incorporó la sección de administración de categorías (`data-testid="category-manager-section"`) y los métodos en `ExpenseFormController` (`setNewCategoryNameInput`, `createCustomCategory`, `requestDeleteCategory`, `setReassignTargetCategoryId`, `cancelDeleteCategory`, `confirmDeleteCategory`), con disponibilidad inmediata en el selector de carga, distinción visual entre predefinidas y propias, flujo de reasignación de gastos y diseño Mobile First + Desktop. |
| Presentación | `src/features/income/MonthlyOverviewScreen.jsx` | Se conectó el callback `onCategoriesChanged` para sincronizar categorías y gastos del tablero cuando se crean o eliminan/reasignan categorías propias. |
| Pruebas | `test/domain/models/expense.test.js` | Se agregaron pruebas unitarias `[H4-R1]`, `[H4-R3]`, `[H4-R4]`, `[H4-R5]` y `[H4-R7]`. |
| Pruebas | `test/data/sqliteExpenseRepository.test.js` | Se agregaron pruebas de persistencia sobre SQLite en memoria `[H4-R1]`, `[H4-R3]`, `[H4-R4]`, `[H4-R5]`, `[H4-R6]` y `[H4-R7]`. |
| Pruebas | `test/features/expenses/ExpenseFormScreen.test.jsx` | Se agregaron pruebas de componente e interacción `[H4-R1]`..`[H4-R8]`. |

## Trazabilidad

| Requisito | Prueba | Archivo |
|---|---|---|
| R1 | `[H4-R1][H4-R3] crea borradores de categorías propias inmutables (id = null, isPredefined = false) recortando espacios y rechaza nombres vacíos o fechas inválidas con InvalidCategory` | `test/domain/models/expense.test.js` |
| R1 | `[H4-R1][H4-R3][H4-R4] crea categorías propias en SQLite con is_predefined = 0 y created_at ISO 8601 y rechaza nombres vacíos o duplicados sin distinguir mayúsculas (COLLATE NOCASE)` | `test/data/sqliteExpenseRepository.test.js` |
| R1, R2 | `[H4-R1][H4-R2] permite crear una categoría propia con nombre válido, la persiste en SQLite y la deja inmediatamente disponible y seleccionada en el formulario de carga de gastos sin reiniciar` | `test/features/expenses/ExpenseFormScreen.test.jsx` |
| R3, R4 | `[H4-R3][H4-R4] rechaza nombres de categoría vacíos o que repitan otra existente sin distinguir mayúsculas (COLLATE NOCASE) mostrando el mensaje de validación sin duplicar en SQLite` | `test/features/expenses/ExpenseFormScreen.test.jsx` |
| R4, R5, R7 | `[H4-R4][H4-R5][H4-R7] define las excepciones DuplicateCategory, CategoryNotFound, PredefinedCategoryDeletionNotAllowed y CategoryInUse y extiende los contratos de CategoryRepository y ExpenseRepository` | `test/domain/models/expense.test.js` |
| R5, R6 | `[H4-R5][H4-R6] impide eliminar categorías predefinidas o inexistentes y permite eliminar una categoría propia que no tiene gastos asociados` | `test/data/sqliteExpenseRepository.test.js` |
| R5, R6 | `[H4-R5][H4-R6] impide eliminar categorías predefinidas (omitiendo el botón de eliminar en la UI y rechazando la acción) y permite eliminar una categoría propia sin gastos asociados quitándola del selector` | `test/features/expenses/ExpenseFormScreen.test.jsx` |
| R7 | `[H4-R7] bloquea la eliminación directa de una categoría propia con gastos asociados lanzando CategoryInUse y la elimina recién tras reasignar sus gastos a otra categoría existente` | `test/data/sqliteExpenseRepository.test.js` |
| R7 | `[H4-R7] al eliminar una categoría propia con gastos asociados exige seleccionar una categoría de destino, reasigna los gastos y recién entonces elimina la categoría propia` | `test/features/expenses/ExpenseFormScreen.test.jsx` |
| R8 | `[H4-R8] presenta la gestión de categorías propias, badges y controles de reasignación con diseño Mobile First (< 768px) y adaptación Desktop (>= 768px)` | `test/features/expenses/ExpenseFormScreen.test.jsx` |

## Salida resumida de `./init.ps1`

```text
[OK]    feature_list.json válido (12 features, 1 en curso)
[OK]    H4: spec completo (8 requisitos)
[OK]    H4: todos los requisitos tienen prueba etiquetada
[OK]    Trazabilidad (K6 parcial): 56 de 56 requisitos con prueba (100 %)
[OK]    Arnés consistente (0 advertencias).
[OK]    eslint sin problemas
ℹ tests 76
ℹ suites 9
ℹ pass 76
ℹ fail 0
[OK]    Todas las pruebas pasan
[OK]    Entorno listo. Podes empezar a trabajar.
```

## Desvíos

- Ninguno respecto al spec aprobado en `specs/h04_categorias_propias/`.
