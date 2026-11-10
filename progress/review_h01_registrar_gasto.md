# Review — H1 h01_registrar_gasto

- **Feature:** `H1 — h01_registrar_gasto` (Registrar un gasto)
- **Reviewer:** `reviewer` (`antigravity`)
- **Fecha:** `2026-11-06`
- **Veredicto:** `APPROVED`

---

## 1. Resumen de verificación

Se auditó de forma independiente la implementación de `H1 — h01_registrar_gasto` contra `specs/h01_registrar_gasto/{requirements,design,tasks}.md`, `progress/impl_h01_registrar_gasto.md`, `rules.md`, `docs/` y `CHECKPOINTS.md`:
- Los 8 requisitos EARS (`R1..R8`), que cubren íntegramente `CA1`, `CA2`, `CA3` y las condiciones del objetivo SMART **OE1** (`K1 ≤ 15 s`), cuentan con pruebas unitarias, de persistencia en SQLite en memoria y de interfaz de usuario que verifican su comportamiento real.
- Las 9 tareas (`T1..T9`) de `specs/h01_registrar_gasto/tasks.md` están completadas y marcadas con `[x]`.
- La ejecución de `powershell -ExecutionPolicy Bypass -File ./init.ps1` finalizó con código de salida `0`: arnés SDD sin advertencias (16/16 requisitos con prueba, 100 % de trazabilidad K6 parcial), `eslint` sin errores ni advertencias y **6 suites / 29 pruebas en verde** (15 pruebas nuevas de `H1` + 14 pruebas de `H12`).

---

## 2. Trazabilidad requisitos ↔ pruebas (`R1`..`R8`)

- **R1:** [x] `test/data/sqliteExpenseRepository.test.js:26` (`[H1-R1] devuelve las categorías predefinidas y prioriza primero las categorías más frecuentes según uso`) y `test/features/expenses/ExpenseFormScreen.test.jsx:30` (`[H1-R1] al abrir el formulario propone la fecha del día actual (YYYY-MM-DD), ordena primero las categorías frecuentes y preselecciona una categoría válida`). Verifican la fecha por defecto en formato ISO `YYYY-MM-DD`, el ordenamiento por frecuencia de uso en `expenses` con desempate por `id ASC` y la preselección automática en el formulario.
- **R2:** [x] `test/domain/models/expense.test.js:23` (`[H1-R2] convierte montos válidos en pesos a enteros en centavos, formatea a moneda ARS y crea instancias inmutables de Expense y Category`), `test/data/sqliteExpenseRepository.test.js:61` (`[H1-R2] guarda un gasto válido en la tabla expenses con amount_cents entero > 0 y marcas ISO 8601 y lo recupera por mes`) y `test/features/expenses/ExpenseFormScreen.test.jsx:61` (`[H1-R2][H1-R3] al confirmar un monto mayor que cero, fecha y categoría guarda el gasto en centavos enteros y actualiza de inmediato el listado del mes con monto formateado, fecha, categoría y nota`). Verifican conversión exacta a centavos enteros (`Number.isInteger(amountCents) && amountCents > 0`), inmutabilidad (`Object.freeze`) e inserción real en la tabla `expenses` con `created_at` y `updated_at` en formato `YYYY-MM-DDTHH:MM:SS`.
- **R3:** [x] `test/features/expenses/ExpenseFormScreen.test.jsx:61` (`[H1-R2][H1-R3] al confirmar un monto mayor que cero, fecha y categoría guarda el gasto en centavos enteros y actualiza de inmediato el listado del mes con monto formateado, fecha, categoría y nota`). Verifica que tras confirmar el registro se actualice de inmediato el listado mensual (`data-testid="month-expense-list"`) mostrando monto formateado (`$ 1.500,50`), fecha (`2026-11-06`), nombre de categoría (`Alimentos`) y nota (`Compra en verdulería`).
- **R4:** [x] `test/domain/models/expense.test.js:84` (`[H1-R4] rechaza montos vacíos, no numéricos, cero, negativos o en coma flotante en parseAmountToCents y Expense lanzando InvalidAmount`), `test/data/sqliteExpenseRepository.test.js:99` (`[H1-R4] no guarda gastos con monto cero, negativo o inválido ni con categoría inexistente`) y `test/features/expenses/ExpenseFormScreen.test.jsx:96` (`[H1-R4][H1-R5] si el monto está vacío, no es numérico, es cero o es negativo no guarda el gasto en SQLite y muestra un mensaje de validación junto al campo de monto`). Verifican que ningún monto inválido (`''`, `'   '`, `'0'`, `'0,00'`, `'-250'`, `'texto'`, `0`, `-100`, decimales float) persista registros en la tabla `expenses`.
- **R5:** [x] `test/features/expenses/ExpenseFormScreen.test.jsx:96` (`[H1-R4][H1-R5] si el monto está vacío, no es numérico, es cero o es negativo no guarda el gasto en SQLite y muestra un mensaje de validación junto al campo de monto`). Verifica el renderizado del mensaje `Ingresá un monto mayor que cero` en `data-testid="amount-error"` (`role="alert"`) junto al campo de monto.
- **R6:** [x] `test/domain/models/expense.test.js:123` (`[H1-R6] normaliza subcategoría y nota vacías o con solo espacios a null en Expense`), `test/data/sqliteExpenseRepository.test.js:136` (`[H1-R6] persiste null en las columnas subcategory y note cuando se dejan vacías`) y `test/features/expenses/ExpenseFormScreen.test.jsx:122` (`[H1-R6] al confirmar el registro dejando vacíos subcategoría y nota guarda null en ambas columnas`). Verifican que valores vacíos o de solo espacios se almacenen como `null` en SQLite y no rendericen etiquetas vacías en la UI.
- **R7:** [x] `test/domain/models/expense.test.js:145` (`[H1-R7] conserva y recorta (trim) los valores de texto en subcategoría y nota cuando se completan`), `test/data/sqliteExpenseRepository.test.js:158` (`[H1-R7] persiste los textos recortados (trim) de subcategoría y nota en la tabla expenses`) y `test/features/expenses/ExpenseFormScreen.test.jsx:143` (`[H1-R7] al completar subcategoría y nota persiste ambos valores recortados (trim) y los muestra en el listado mensual`). Verifican el recorte (`trim`) y la persistencia y visualización de `subcategory` y `note`.
- **R8:** [x] `test/features/expenses/ExpenseFormScreen.test.jsx:167` (`[H1-R8] aplica diseño Mobile First (< 768px) en 1 columna con botón táctil >= 48px y se adapta a pantallas Desktop (>= 768px) en grilla de 2 columnas con soporte de teclado`). Verifica el layout móvil en `390px` (`data-layout="mobile"`, `data-columns="1"`, `minHeight: 48`, `width: '100%'`) y la adaptación Desktop en `1280px` (`data-layout="desktop"`, `data-columns="2"`, `maxWidth: 960`, `tabIndex={0}` y envío con tecla `Enter`).

---

## 3. Tareas (`specs/h01_registrar_gasto/tasks.md`)

- T1: [x] `src/core/errors.js`, `src/core/dates.js`, `src/core/formatters.js`
- T2: [x] `src/domain/models/category.js`, `src/domain/models/expense.js`, `src/domain/repositories/categoryRepository.js`, `src/domain/repositories/expenseRepository.js`
- T3: [x] `test/domain/models/expense.test.js`
- T4: [x] `src/data/repositories/sqliteCategoryRepository.js`, `src/data/repositories/sqliteExpenseRepository.js`
- T5: [x] `test/data/sqliteExpenseRepository.test.js`
- T6: [x] `src/features/expenses/ExpenseFormScreen.jsx`, `src/app/AppShell.jsx`
- T7: [x] `test/features/expenses/ExpenseFormScreen.test.jsx`
- T8: [x] `progress/impl_h01_registrar_gasto.md`, `progress/traceability.md`
- T9: [x] `./init.ps1` ejecutado y en verde

---

## 4. Arquitectura, Mobile First + Desktop y privacidad

- [x] `src/domain/` (`category.js`, `expense.js`, `categoryRepository.js`, `expenseRepository.js`, `consent.js`, `consentRepository.js`) es JavaScript puro: no importa `react`, `react-native`, `expo-sqlite` ni clientes HTTP (`fetch`, `axios`).
- [x] Solo `src/assistant/` está habilitado para llamadas de red (ningún archivo en `src/core/`, `src/domain/`, `src/data/`, `src/features/` ni `src/app/` realiza llamadas de red).
- [x] Todos los importes monetarios se validan y persisten como enteros en centavos (`Number.isInteger(amountCents)` y `amountCents > 0`); el formateo a pesos ocurre únicamente en la UI (`src/core/formatters.js`).
- [x] La persistencia utiliza las tablas `categories` y `expenses` de la migración versión 1 en `src/data/db/appDatabase.js`, alineada con `docs/data_model.md`.
- [x] La interfaz en `src/features/expenses/ExpenseFormScreen.jsx` aplica enfoque **Mobile First** (`< 768px`, 1 columna, controles táctiles `minHeight: 48`) y adaptación responsiva para **Desktop** (`≥ 768px`, grilla de 2 columnas con formulario y listado mensual en paralelo, contenedor centrado y soporte de teclado).
- [x] Sin `console.log()` de depuración, sin código comentado ni `TODO` sin contexto en `src/` o `test/`.

---

## 5. Evaluación de `CHECKPOINTS.md` (C1 a C7)

### C1 — El arnés está completo
- [x] Existen `AGENTS.md`, `CLAUDE.md`, `rules.md`, `feature_list.json`, `progress/current.md`, `progress/history.md`, `progress/horas.csv`.
- [x] Existen `docs/architecture.md`, `docs/conventions.md`, `docs/specs.md`, `docs/verification.md` y `docs/Proyecto_Tec_Laborales_Grupo_3.pdf`.
- [x] `./init.sh` (o `./init.ps1`) termina con código de salida 0.

### C2 — El estado es coherente
- [x] Como mucho una feature en `in_progress` (`H1 — h01_registrar_gasto`).
- [x] Toda feature `done` (`H12 — h12_aviso_privacidad`) tiene pruebas que pasan.
- [x] `progress/current.md` describe la sesión activa.
- [x] Si la feature cambió de herramienta, el cambio está registrado en `progress/current.md` *(se mantuvo en `antigravity`)*.

### C3 — El código respeta la arquitectura y el enfoque Mobile First + Desktop
- [x] `src/domain/` es JavaScript puro: no importa `react`, `react-native`, `expo-sqlite` ni clientes de red (`fetch`, `axios`).
- [x] Solo `src/assistant/` realiza llamadas de red.
- [x] Importes en centavos enteros (`Number.isInteger`); ningún decimal en coma flotante para dinero.
- [x] Cambios de esquema SQLite (`expo-sqlite`) como migraciones versionadas en `src/data/db/` y documentadas en `docs/data_model.md`.
- [x] La UI está construida con enfoque **Mobile First** y contempla adaptación responsiva para **Desktop**.
- [x] Sin `console.log()` de depuración ni TODO sin contexto.

### C4 — La verificación es real
- [x] `npm run lint` (`eslint`) sin errores ni advertencias.
- [x] `npm test` con más de 0 pruebas y todas en verde (6 suites, 29 pruebas en verde).
- [x] Persistencia probada con base SQLite en memoria real (`AppDatabase.openInMemory()`), no con mocks que omitan SQL.
- [x] Cliente del modelo reemplazado por `FakeLlmClient` en las pruebas *(H1 no invoca al asistente de IA ni usa red)*.

### C5 — La sesión se cerró bien
- [x] Sin archivos temporales ni secretos sin ignorar (`.env`, `key.properties`, `*.jks`).
- [x] `progress/history.md` tiene la entrada de la última sesión cerrada (`H12`).
- [x] `progress/horas.csv` tiene las horas registradas y está listo para el cierre de sesión por `leader`.

### C6 — Spec Driven Development
- [x] Toda feature `sdd: true` en `spec_ready`, `in_progress` o `done` (`H1`, `H12`) tiene sus tres archivos (`requirements.md`, `design.md`, `tasks.md`).
- [x] `requirements.md` usa EARS estricto y cubre todos los criterios de aceptación de la feature en `feature_list.json`.
- [x] Toda feature `done` con `sdd: true` (y `H1` lista para pasar a `done`) tiene todas sus tareas en `[x]`.
- [x] Cada `R<n>` tiene al menos una prueba con la etiqueta `[H<id>-R<n>]` (`[H1-R1]`..`[H1-R8]` y `[H12-R1]`..`[H12-R8]`).
- [x] `progress/traceability.md` está actualizado (métrica K6).

### C7 — Privacidad
- [x] El resumen enviado al modelo respeta `docs/llm_assistant.md` y las columnas sensibles (`subcategory`, `note`) están separadas en `expenses` para su exclusión en H10.
- [x] Sin consentimiento aceptado (H12) no se accede a `ExpenseFormScreen` en `AppShell` ni se llama a la API.
- [x] Las recomendaciones muestran la advertencia de carácter orientativo *(declarada y verificada en el aviso de privacidad vigente)*.
