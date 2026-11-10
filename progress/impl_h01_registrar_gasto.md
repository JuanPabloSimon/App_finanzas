# Implementación — h01_registrar_gasto

- **Feature:** `H1 — h01_registrar_gasto` (Registrar un gasto)
- **Herramienta:** `antigravity`
- **Rol:** `implementer`
- **Estado:** `done` (listo para revisión por `reviewer`)

## Archivos creados y modificados

| Capa | Archivo | Acción |
|---|---|---|
| core | `src/core/errors.js` | Modificado (`InvalidAmount`, `InvalidExpenseDate`, `InvalidCategory`) |
| core | `src/core/dates.js` | Modificado (`isValidIsoDate`, `formatIsoDate`, `extractYearMonth`) |
| core | `src/core/formatters.js` | Creado (`parseAmountToCents`, `formatCentsToArs`) |
| domain | `src/domain/models/category.js` | Creado (`Category` inmutable con `Object.freeze`, `copyWith`, `isEqual`) |
| domain | `src/domain/models/expense.js` | Creado (`Expense` inmutable con validación de centavos enteros `> 0`, fecha `YYYY-MM-DD`, `categoryId` y normalización de `subcategory` / `note` a `null`) |
| domain | `src/domain/repositories/categoryRepository.js` | Creado (`CategoryRepository`) |
| domain | `src/domain/repositories/expenseRepository.js` | Creado (`ExpenseRepository`) |
| data | `src/data/repositories/sqliteCategoryRepository.js` | Creado (`SqliteCategoryRepository` con ordenamiento por frecuencia de uso en `expenses` y fallback a `id ASC`) |
| data | `src/data/repositories/sqliteExpenseRepository.js` | Creado (`SqliteExpenseRepository` con `save` y `findByYearMonth` con `JOIN` a `categories`) |
| presentation | `src/features/expenses/ExpenseFormScreen.jsx` | Creado (formulario de carga rápida con fecha actual por defecto, categorías frecuentes primero, validación junto al campo de monto, listado del mes actualizado al instante y layout Mobile First + Desktop) |
| presentation | `src/app/AppShell.jsx` | Modificado (monta `ExpenseFormScreen` como vista principal tras aceptar el aviso de privacidad H12) |
| test | `test/domain/models/expense.test.js` | Creado (pruebas unitarias `[H1-R2]`, `[H1-R4]`, `[H1-R6]`, `[H1-R7]`) |
| test | `test/data/sqliteExpenseRepository.test.js` | Creado (pruebas de persistencia SQLite en memoria `[H1-R1]`, `[H1-R2]`, `[H1-R4]`, `[H1-R6]`, `[H1-R7]`) |
| test | `test/features/expenses/ExpenseFormScreen.test.jsx` | Creado (pruebas de UI, validación, listado mensual y responsive `[H1-R1]`, `[H1-R2]`, `[H1-R3]`, `[H1-R4]`, `[H1-R5]`, `[H1-R6]`, `[H1-R7]`, `[H1-R8]`) |

## Trazabilidad (`R<n>` → Prueba)

| Requisito | Etiqueta | Archivo de prueba | Descripción de la prueba |
|---|---|---|---|
| R1 | `[H1-R1]` | `test/data/sqliteExpenseRepository.test.js`, `test/features/expenses/ExpenseFormScreen.test.jsx` | `[H1-R1] devuelve las categorías predefinidas y prioriza primero las categorías más frecuentes según uso` y `[H1-R1] al abrir el formulario propone la fecha del día actual (YYYY-MM-DD), ordena primero las categorías frecuentes y preselecciona una categoría válida` |
| R2 | `[H1-R2]` | `test/domain/models/expense.test.js`, `test/data/sqliteExpenseRepository.test.js`, `test/features/expenses/ExpenseFormScreen.test.jsx` | `[H1-R2] convierte montos válidos en pesos a enteros en centavos...`, `[H1-R2] guarda un gasto válido en la tabla expenses con amount_cents entero > 0...` y `[H1-R2][H1-R3] al confirmar un monto mayor que cero, fecha y categoría guarda el gasto en centavos enteros y actualiza de inmediato el listado del mes...` |
| R3 | `[H1-R3]` | `test/features/expenses/ExpenseFormScreen.test.jsx` | `[H1-R2][H1-R3] al confirmar un monto mayor que cero, fecha y categoría guarda el gasto en centavos enteros y actualiza de inmediato el listado del mes con monto formateado, fecha, categoría y nota` |
| R4 | `[H1-R4]` | `test/domain/models/expense.test.js`, `test/data/sqliteExpenseRepository.test.js`, `test/features/expenses/ExpenseFormScreen.test.jsx` | `[H1-R4] rechaza montos vacíos, no numéricos, cero, negativos o en coma flotante...`, `[H1-R4] no guarda gastos con monto cero, negativo o inválido...` y `[H1-R4][H1-R5] si el monto está vacío, no es numérico, es cero o es negativo no guarda el gasto en SQLite...` |
| R5 | `[H1-R5]` | `test/features/expenses/ExpenseFormScreen.test.jsx` | `[H1-R4][H1-R5] si el monto está vacío, no es numérico, es cero o es negativo no guarda el gasto en SQLite y muestra un mensaje de validación junto al campo de monto` |
| R6 | `[H1-R6]` | `test/domain/models/expense.test.js`, `test/data/sqliteExpenseRepository.test.js`, `test/features/expenses/ExpenseFormScreen.test.jsx` | `[H1-R6] normaliza subcategoría y nota vacías o con solo espacios a null en Expense`, `[H1-R6] persiste null en las columnas subcategory y note cuando se dejan vacías` y `[H1-R6] al confirmar el registro dejando vacíos subcategoría y nota guarda null en ambas columnas` |
| R7 | `[H1-R7]` | `test/domain/models/expense.test.js`, `test/data/sqliteExpenseRepository.test.js`, `test/features/expenses/ExpenseFormScreen.test.jsx` | `[H1-R7] conserva y recorta (trim) los valores de texto en subcategoría y nota...`, `[H1-R7] persiste los textos recortados (trim) de subcategoría y nota en la tabla expenses` y `[H1-R7] al completar subcategoría y nota persiste ambos valores recortados (trim) y los muestra en el listado mensual` |
| R8 | `[H1-R8]` | `test/features/expenses/ExpenseFormScreen.test.jsx` | `[H1-R8] aplica diseño Mobile First (< 768px) en 1 columna con botón táctil >= 48px y se adapta a pantallas Desktop (>= 768px) en grilla de 2 columnas con soporte de teclado` |

## Desvíos respecto del diseño

- Ninguno. Se respetó íntegramente `specs/h01_registrar_gasto/design.md` sin agregar dependencias nuevas a `package.json`.
