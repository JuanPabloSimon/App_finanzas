# Review — H2 h02_editar_eliminar_gasto

- **Feature:** `H2 — h02_editar_eliminar_gasto` (Editar o eliminar un gasto)
- **Reviewer:** `reviewer` (`antigravity`)
- **Fecha:** `2026-11-10`
- **Veredicto:** `APPROVED`

---

## 1. Resumen de verificación

Se auditó la implementación de `H2 — h02_editar_eliminar_gasto` contra `specs/h02_editar_eliminar_gasto/{requirements,design,tasks}.md`, `progress/impl_h02_editar_eliminar_gasto.md`, `rules.md`, `docs/` y `CHECKPOINTS.md`:
- Los 8 requisitos EARS (`R1..R8`), que cubren íntegramente `CA1` y `CA2` de `feature_list.json` y las reglas de arquitectura (`ExpenseNotFound`, importes en centavos enteros, Mobile First + Desktop), cuentan con pruebas unitarias, de persistencia en SQLite en memoria y de interfaz de usuario que verifican su comportamiento real.
- Las 8 tareas (`T1..T8`) de `specs/h02_editar_eliminar_gasto/tasks.md` están completadas y marcadas con `[x]`.
- La ejecución de `powershell -ExecutionPolicy Bypass -File ./init.ps1` finalizó con código de salida `0`: arnés SDD sin advertencias (24/24 requisitos con prueba, 100 % de trazabilidad K6 parcial), `eslint` sin errores ni advertencias y **6 suites / 39 pruebas en verde** (10 pruebas nuevas de `H2` + 15 de `H1` + 14 de `H12`).

---

## 2. Trazabilidad requisitos ↔ pruebas (`R1`..`R8`)

- **R1:** [x] `test/features/expenses/ExpenseFormScreen.test.jsx:214` (`[H2-R1] al seleccionar editar sobre un gasto existente del listado mensual carga sus datos actuales en el formulario y activa el modo edición`). Verifica que al pulsar editar sobre un gasto existente se precarguen monto formateado (`1850,50`), fecha (`2026-11-04`), categoría (`2`), subcategoría (`Subte`) y nota (`Carga semanal`), mostrando título `Editar gasto`, botón `Guardar cambios` y botón `Cancelar edición`.
- **R2:** [x] `test/domain/models/expense.test.js:169` (`[H2-R2] formatea centavos a cadena editable con formatCentsToInput y conserva createdAt al crear una copia actualizada de Expense`), `test/data/sqliteExpenseRepository.test.js:184` (`[H2-R2] actualiza un gasto existente en SQLite conservando id y created_at original y actualizando updated_at en formato ISO 8601`) y `test/features/expenses/ExpenseFormScreen.test.jsx:259` (`[H2-R2][H2-R3] al confirmar la edición de un gasto válido actualiza SQLite conservando created_at, refleja los cambios en el listado y recalcula el total del mes sin reiniciar`). Verifican la actualización real mediante `UPDATE expenses SET ... WHERE id = ?` preservando `id` y `created_at` y actualizando `updated_at` en formato `YYYY-MM-DDTHH:MM:SS`.
- **R3:** [x] `test/features/expenses/ExpenseFormScreen.test.jsx:259` (`[H2-R2][H2-R3] al confirmar la edición de un gasto válido actualiza SQLite conservando created_at, refleja los cambios en el listado y recalcula el total del mes sin reiniciar`). Verifica que los cambios se reflejen de inmediato en el listado mensual y que el total del mes (`data-testid="month-total-amount"`) pase de `$ 3.000` (`300000` centavos) a `$ 3.750,25` (`375025` centavos) sin reiniciar la aplicación.
- **R4:** [x] `test/domain/models/expense.test.js:206` (`[H2-R4] define la excepción ExpenseNotFound, valida formatCentsToInput ante importes inválidos y expone findById, update y deleteById en ExpenseRepository`), `test/data/sqliteExpenseRepository.test.js:233` (`[H2-R4] no modifica la base de datos y lanza InvalidAmount, InvalidCategory o ExpenseNotFound cuando la actualización o eliminación es inválida`) y `test/features/expenses/ExpenseFormScreen.test.jsx:323` (`[H2-R4] durante la edición rechaza montos vacíos, cero, negativos o no numéricos e identificadores inexistentes sin modificar el registro en SQLite`). Verifican que ningún intento inválido modifique el registro en SQLite y que se informen `InvalidAmount` o `ExpenseNotFound`.
- **R5:** [x] `test/features/expenses/ExpenseFormScreen.test.jsx:363` (`[H2-R5][H2-R6][H2-R7] solicita confirmación antes de eliminar, conserva el gasto si se cancela y al confirmar lo borra de SQLite y recalcula el total del mes`). Verifica que al solicitar la eliminación se despliegue el bloque de confirmación explícita (`delete-confirm-box-<id>`) con `confirm-delete-button-<id>` y `cancel-delete-button-<id>` sin borrar aún el registro en SQLite.
- **R6:** [x] `test/features/expenses/ExpenseFormScreen.test.jsx:363` (`[H2-R5][H2-R6][H2-R7] solicita confirmación antes de eliminar, conserva el gasto si se cancela y al confirmar lo borra de SQLite y recalcula el total del mes`). Verifica que al cancelar la confirmación el gasto permanezca intacto en SQLite, en el listado mensual y en el total del mes (`230000` centavos).
- **R7:** [x] `test/data/sqliteExpenseRepository.test.js:298` (`[H2-R7] elimina físicamente el gasto de la tabla expenses en SQLite al ejecutar deleteById`) y `test/features/expenses/ExpenseFormScreen.test.jsx:363` (`[H2-R5][H2-R6][H2-R7] solicita confirmación antes de eliminar, conserva el gasto si se cancela y al confirmar lo borra de SQLite y recalcula el total del mes`). Verifican el borrado físico (`DELETE FROM expenses WHERE id = ?`), la desaparición inmediata del ítem en la UI y el recálculo del total mensual (`$ 800`).
- **R8:** [x] `test/features/expenses/ExpenseFormScreen.test.jsx:428` (`[H2-R8] presenta los controles de edición, eliminación, confirmación y total mensual con diseño Mobile First (< 768px) y adaptación Desktop (>= 768px)`). Verifica el layout móvil en `390px` (`data-layout="mobile"`, `data-columns="1"`, botones de acción `minHeight >= 44`, caja de confirmación en columna) y la adaptación Desktop en `1280px` (`data-layout="desktop"`, `data-columns="2"`, edición en paralelo con el listado y `tabIndex={0}`).

---

## 3. Tareas (`specs/h02_editar_eliminar_gasto/tasks.md`)

- T1: [x] `src/core/errors.js`, `src/core/formatters.js`, `src/domain/repositories/expenseRepository.js`
- T2: [x] `test/domain/models/expense.test.js`
- T3: [x] `src/data/repositories/sqliteExpenseRepository.js`
- T4: [x] `test/data/sqliteExpenseRepository.test.js`
- T5: [x] `src/features/expenses/ExpenseFormScreen.jsx`
- T6: [x] `test/features/expenses/ExpenseFormScreen.test.jsx`
- T7: [x] `progress/impl_h02_editar_eliminar_gasto.md`, `progress/traceability.md`
- T8: [x] `./init.ps1` ejecutado y en verde

---

## 4. Arquitectura, Mobile First + Desktop y privacidad

- [x] `src/domain/` (`category.js`, `expense.js`, `categoryRepository.js`, `expenseRepository.js`, `consent.js`, `consentRepository.js`) es JavaScript puro: no importa `react`, `react-native`, `expo-sqlite` ni clientes HTTP (`fetch`, `axios`).
- [x] Solo `src/assistant/` está habilitado para llamadas de red.
- [x] Todos los importes monetarios y el total mensual (`monthlyTotalCents`) se calculan y persisten como enteros en centavos (`Number.isInteger`).
- [x] Las operaciones `UPDATE` y `DELETE` sobre `expenses` usan consultas SQL parametrizadas con `?` sobre el esquema v1 de `src/data/db/appDatabase.js`.
- [x] La interfaz en `src/features/expenses/ExpenseFormScreen.jsx` respeta el enfoque **Mobile First** (`< 768px`) y se adapta de forma responsiva a **Desktop** (`≥ 768px`).
- [x] Sin `console.log()` de depuración, sin código comentado ni `TODO` sin contexto.

---

## 5. Evaluación de `CHECKPOINTS.md` (C1 a C7)

- **C1 — El arnés está completo:** [x] Todos los documentos base existen e `./init.ps1` termina con código `0`.
- **C2 — El estado es coherente:** [x] Una sola feature en curso (`H2`), features `done` (`H12`, `H1`) con pruebas en verde y `progress/current.md` actualizado.
- **C3 — El código respeta la arquitectura y el enfoque Mobile First + Desktop:** [x] Dominio puro, importes en centavos enteros, sin nuevas dependencias en `package.json`.
- **C4 — La verificación es real:** [x] `eslint` limpio y 39/39 pruebas pasando sobre SQLite en memoria real (`AppDatabase.openInMemory()`).
- **C5 — La sesión se cerró bien:** [x] Sin archivos temporales ni secretos expuestos.
- **C6 — Spec Driven Development:** [x] Spec completo (`requirements.md`, `design.md`, `tasks.md`), tareas en `[x]`, etiquetas `[H2-R1]..[H2-R8]` verificadas por `tool/harness_check.mjs` y `progress/traceability.md` al día.
- **C7 — Privacidad:** [x] Borrado físico real en SQLite local al confirmar eliminación y guardia de consentimiento (H12) activa en `AppShell`.
