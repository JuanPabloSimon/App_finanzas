# Review — H4 h04_categorias_propias

**Veredicto:** APPROVED

## Trazabilidad requisitos ↔ pruebas
- R1: [x] `test/domain/models/expense.test.js:251` `[H4-R1][H4-R3] crea borradores de categorías propias inmutables (id = null, isPredefined = false) recortando espacios y rechaza nombres vacíos o fechas inválidas con InvalidCategory`
- R1: [x] `test/data/sqliteExpenseRepository.test.js:382` `[H4-R1][H4-R3][H4-R4] crea categorías propias en SQLite con is_predefined = 0 y created_at ISO 8601 y rechaza nombres vacíos o duplicados sin distinguir mayúsculas (COLLATE NOCASE)`
- R1: [x] `test/features/expenses/ExpenseFormScreen.test.jsx:657` `[H4-R1][H4-R2] permite crear una categoría propia con nombre válido, la persiste en SQLite y la deja inmediatamente disponible y seleccionada en el formulario de carga de gastos sin reiniciar`
- R2: [x] `test/features/expenses/ExpenseFormScreen.test.jsx:657` `[H4-R1][H4-R2] permite crear una categoría propia con nombre válido, la persiste en SQLite y la deja inmediatamente disponible y seleccionada en el formulario de carga de gastos sin reiniciar`
- R3: [x] `test/domain/models/expense.test.js:251` `[H4-R1][H4-R3] crea borradores de categorías propias inmutables (id = null, isPredefined = false) recortando espacios y rechaza nombres vacíos o fechas inválidas con InvalidCategory`
- R3: [x] `test/data/sqliteExpenseRepository.test.js:382` `[H4-R1][H4-R3][H4-R4] crea categorías propias en SQLite con is_predefined = 0 y created_at ISO 8601 y rechaza nombres vacíos o duplicados sin distinguir mayúsculas (COLLATE NOCASE)`
- R3: [x] `test/features/expenses/ExpenseFormScreen.test.jsx:701` `[H4-R3][H4-R4] rechaza nombres de categoría vacíos o que repitan otra existente sin distinguir mayúsculas (COLLATE NOCASE) mostrando el mensaje de validación sin duplicar en SQLite`
- R4: [x] `test/domain/models/expense.test.js:281` `[H4-R4][H4-R5][H4-R7] define las excepciones DuplicateCategory, CategoryNotFound, PredefinedCategoryDeletionNotAllowed y CategoryInUse y extiende los contratos de CategoryRepository y ExpenseRepository`
- R4: [x] `test/data/sqliteExpenseRepository.test.js:382` `[H4-R1][H4-R3][H4-R4] crea categorías propias en SQLite con is_predefined = 0 y created_at ISO 8601 y rechaza nombres vacíos o duplicados sin distinguir mayúsculas (COLLATE NOCASE)`
- R4: [x] `test/features/expenses/ExpenseFormScreen.test.jsx:701` `[H4-R3][H4-R4] rechaza nombres de categoría vacíos o que repitan otra existente sin distinguir mayúsculas (COLLATE NOCASE) mostrando el mensaje de validación sin duplicar en SQLite`
- R5: [x] `test/domain/models/expense.test.js:281` `[H4-R4][H4-R5][H4-R7] define las excepciones DuplicateCategory, CategoryNotFound, PredefinedCategoryDeletionNotAllowed y CategoryInUse y extiende los contratos de CategoryRepository y ExpenseRepository`
- R5: [x] `test/data/sqliteExpenseRepository.test.js:424` `[H4-R5][H4-R6] impide eliminar categorías predefinidas o inexistentes y permite eliminar una categoría propia que no tiene gastos asociados`
- R5: [x] `test/features/expenses/ExpenseFormScreen.test.jsx:734` `[H4-R5][H4-R6] impide eliminar categorías predefinidas (omitiendo el botón de eliminar en la UI y rechazando la acción) y permite eliminar una categoría propia sin gastos asociados quitándola del selector`
- R6: [x] `test/data/sqliteExpenseRepository.test.js:424` `[H4-R5][H4-R6] impide eliminar categorías predefinidas o inexistentes y permite eliminar una categoría propia que no tiene gastos asociados`
- R6: [x] `test/features/expenses/ExpenseFormScreen.test.jsx:734` `[H4-R5][H4-R6] impide eliminar categorías predefinidas (omitiendo el botón de eliminar en la UI y rechazando la acción) y permite eliminar una categoría propia sin gastos asociados quitándola del selector`
- R7: [x] `test/domain/models/expense.test.js:281` `[H4-R4][H4-R5][H4-R7] define las excepciones DuplicateCategory, CategoryNotFound, PredefinedCategoryDeletionNotAllowed y CategoryInUse y extiende los contratos de CategoryRepository y ExpenseRepository`
- R7: [x] `test/data/sqliteExpenseRepository.test.js:447` `[H4-R7] bloquea la eliminación directa de una categoría propia con gastos asociados lanzando CategoryInUse y la elimina recién tras reasignar sus gastos a otra categoría existente`
- R7: [x] `test/features/expenses/ExpenseFormScreen.test.jsx:781` `[H4-R7] al eliminar una categoría propia con gastos asociados exige seleccionar una categoría de destino, reasigna los gastos y recién entonces elimina la categoría propia`
- R8: [x] `test/features/expenses/ExpenseFormScreen.test.jsx:844` `[H4-R8] presenta la gestión de categorías propias, badges y controles de reasignación con diseño Mobile First (< 768px) y adaptación Desktop (>= 768px)`

## Tareas
- T1: [x] Excepciones `DuplicateCategory`, `CategoryNotFound`, `PredefinedCategoryDeletionNotAllowed` y `CategoryInUse` en `src/core/errors.js:32-64`, soporte de borradores inmutables en `src/domain/models/category.js:4-50` y extensión de contratos en `src/domain/repositories/categoryRepository.js:11-30` y `src/domain/repositories/expenseRepository.js:27-36`.
- T2: [x] Pruebas unitarias `[H4-R1]`, `[H4-R3]`, `[H4-R4]`, `[H4-R5]` y `[H4-R7]` en `test/domain/models/expense.test.js:251-317`.
- T3: [x] Persistencia SQLite en `src/data/repositories/sqliteCategoryRepository.js:53-155` (`findByName`, `save`, `countExpenses`, `deleteById`) y `src/data/repositories/sqliteExpenseRepository.js:205-251` (`countByCategoryId`, `reassignCategory`) con consultas parametrizadas `?`, unicidad `COLLATE NOCASE`, protección de predefinidas y reasignación de gastos antes del `DELETE`.
- T4: [x] Pruebas de persistencia sobre SQLite en memoria `[H4-R1]`, `[H4-R3]`, `[H4-R4]`, `[H4-R5]`, `[H4-R6]` y `[H4-R7]` en `test/data/sqliteExpenseRepository.test.js:382-513`.
- T5: [x] UI y controlador de gestión de categorías propias en `src/features/expenses/ExpenseFormScreen.jsx:655-779` y `1686-1976`, más sincronización en `src/features/income/MonthlyOverviewScreen.jsx:1328-1338`.
- T6: [x] Pruebas de componente e interacción `[H4-R1]`..`[H4-R8]` en `test/features/expenses/ExpenseFormScreen.test.jsx:657-891`.
- T7: [x] Informe de implementación en `progress/impl_h04_categorias_propias.md` y matriz actualizada en `progress/traceability.md:25-26`.
- T8: [x] `./init.ps1` ejecutado y 100 % en verde (76/76 pruebas en 9 suites, 0 advertencias de ESLint, 56/56 requisitos con prueba etiquetada).

## Arquitectura, Mobile First + Desktop y privacidad
- [x] `src/domain/` (`category.js`, `categoryRepository.js`, `expenseRepository.js`) es JavaScript puro: sin dependencias de `react`, `react-native`, `expo-sqlite` ni clientes HTTP.
- [x] Ninguna llamada de red fuera de `src/assistant/`.
- [x] Importes en centavos enteros (`Number.isInteger(amountCents)`).
- [x] Consultas SQL parametrizadas con `?` en `SqliteCategoryRepository` y `SqliteExpenseRepository`; esquema v1 en `src/data/db/appDatabase.js` y `docs/data_model.md` consistente (`UNIQUE COLLATE NOCASE` y `ON DELETE RESTRICT`).
- [x] UI Mobile First (`< 768px`, una columna, `createCategoryButton.minHeight >= 48`, `deleteActionButton.minHeight >= 44`, `categoryCreateRow.flexDirection = 'column'`) y adaptación responsiva en Desktop (`>= 768px`, `gridColumns = 2`, `categoryCreateRow.flexDirection = 'row'`, navegación por teclado `tabIndex={0}`).
- [x] Sin `console.log()` de depuración, sin código comentado y sin `TODO` sin contexto.

## Checkpoints
- C1 (El arnés está completo): [x] Todos los documentos base existen y `./init.ps1` termina con código 0.
- C2 (El estado es coherente): [x] Una sola feature en `in_progress` (`H4`), `H1`, `H2`, `H3`, `H5`, `H6` y `H12` en `done` con pruebas en verde y `progress/current.md` actualizado.
- C3 (Arquitectura y Mobile First + Desktop): [x] Separación estricta `presentation → domain ← data`, centavos enteros, SQLite local parametrizado y diseño Mobile First + Desktop verificado.
- C4 (La verificación es real): [x] `npm run lint` sin errores ni advertencias, `npm test` con 76 pruebas en verde en 9 suites usando `AppDatabase.openInMemory()`.
- C5 (Cierre limpio): [x] Sin archivos temporales ni secretos expuestos.
- C6 (Spec Driven Development): [x] `requirements.md` (EARS estricto, R1..R8), `design.md` y `tasks.md` (T1..T8 en `[x]`) completos; trazabilidad 56/56 requisitos verificados (100 %).
- C7 (Privacidad): [x] Datos de categorías propias almacenados exclusivamente en SQLite local sin envíos externos (Ley 25.326).

## Cambios requeridos (si aplica)
Ninguno. Implementación aprobada.
