# Implementación — H9 `h09_deteccion_recurrencias`

- **Estado:** implementado, pendiente de `reviewer` (no se marcó `done`).
- **Herramienta / rol:** `claude-code` / `implementer`.
- **Rama:** `feature/h09-deteccion-recurrencias` (sin commit ni push).
- **Spec:** `specs/h09_deteccion_recurrencias/` (aprobado por Francisco el 2026-11-15).
- **Fecha:** 2026-11-15.

## Tareas

T1..T24 ejecutadas en orden y marcadas `[x]` en `specs/h09_deteccion_recurrencias/tasks.md`.

| Tarea | Resultado |
|---|---|
| T1 | `test/fixtures/recurrencias_etiquetadas.json`: 106 gastos, 22 recurrencias reales, 31 gastos señuelo o atípicos; referencia `2026-10-31` |
| T2–T5 | `InvalidRecurrence`, modelo `Recurrence` + clave, `RecurrenceDetector` + `filterDismissedRecurrences`, contrato `RecurrenceRepository` |
| T6–T8 | Pruebas de modelo, detector y métricas K4 |
| T9–T14 | Migración v3, `docs/data_model.md`, repositorios SQLite y `localStorage` con pruebas |
| T15–T21 | Loader, `RecurrencesPanel`, integración en la pestaña «Alertas», cableado `AppShell`/`App` y pruebas |
| T22 | Las pruebas existentes (H1–H8, H12, H13) pasan sin modificar ningún caso |
| T23 | Este archivo + `progress/traceability.md` |
| T24 | `./init.sh` en verde |

## Archivos

### Creados
- `src/domain/models/recurrence.js`
- `src/domain/services/recurrenceDetector.js`
- `src/domain/repositories/recurrenceRepository.js`
- `src/data/repositories/sqliteRecurrenceRepository.js`
- `src/data/repositories/localStorageRecurrenceRepository.js`
- `src/features/recurrences/recurrencesLoader.js`
- `src/features/recurrences/RecurrencesPanel.jsx`
- `test/fixtures/recurrencias_etiquetadas.json`
- `test/domain/models/recurrence.test.js`
- `test/domain/services/recurrenceDetector.test.js`
- `test/domain/services/recurrenceDetectorMetrics.test.js`
- `test/data/sqliteRecurrenceRepository.test.js`
- `test/data/localStorageRecurrenceRepository.test.js`
- `test/features/recurrences/recurrencesLoader.test.js`
- `test/features/recurrences/RecurrencesPanel.test.jsx`

### Modificados
- `src/core/errors.js`: `InvalidRecurrence`.
- `src/data/db/appDatabase.js`: `MIGRATION_V3_SQL` + bloque `if (currentVersion < 3)` → `PRAGMA user_version = 3` (v1/v2 intactas).
- `src/features/income/MonthlyOverviewScreen.jsx`: repositorio de recurrencias en memoria de reserva, props `recurrenceRepository`/`initialRecurrences`, `useEffect` propio, recarga en `reloadPeriod`, `handleDismissRecurrence`, `RecurrencesPanel` al final de `tab-panel-reminders`; controlador con `recurrences`, `recurrenceError`, `reloadRecurrences()` y `dismissRecurrence(key)`. La pestaña `overview` no cambió.
- `src/app/AppShell.jsx`: opción/prop `recurrenceRepository` reenviada a `MonthlyOverviewScreen`.
- `src/App.jsx`: `recurrenceRepo = new LocalStorageRecurrenceRepository(window.localStorage)` (o `null` sin `window`).
- `docs/data_model.md`: formato de `recurrence_key` y nota de `fp_dismissed_recurrences`.
- `test/features/income/MonthlyOverviewScreen.test.jsx`: un import y un `describe` nuevo al final (solo agregados, 0 líneas borradas).
- `specs/h09_deteccion_recurrencias/tasks.md`, `progress/current.md`, `progress/traceability.md`.

No se agregaron dependencias a `package.json`.

## Trazabilidad

| Requisito | Pruebas |
|---|---|
| R1 | `[H9-R1] usa los parámetros de CA1…`, `[H9-R1] informa 3 gastos … borde exacto de ±10 %…`, `[H9-R1] con 4 gastos parecidos … mediana par redondeada…`, `[H9-R1] ordena las recurrencias…` (`test/domain/services/recurrenceDetector.test.js`) |
| R2 | `[H9-R2] no informa conjuntos de menos de 3 gastos` (`recurrenceDetector.test.js`) |
| R3 | `[H9-R3] excluye … a más de 10 % por debajo o por encima`, `[H9-R3] un atípico bajo no impide detectar…` (`recurrenceDetector.test.js`) |
| R4 | `[H9-R4][H9-R5] el conjunto etiquetado cumple el contenido mínimo…`, `[H9-R4] alcanza una exhaustividad de al menos 0,85…` (`recurrenceDetectorMetrics.test.js`) |
| R5 | `[H9-R4][H9-R5] el conjunto etiquetado cumple el contenido mínimo…`, `[H9-R5] alcanza una precisión de al menos 0,85…` (`recurrenceDetectorMetrics.test.js`) |
| R6 | `recurrence.test.js` (clave, parseo, validaciones, inmutabilidad); `sqliteRecurrenceRepository.test.js` (fila con `dismissed_at` ISO, idempotencia, clave inválida, migración v2 → v3 conservando gastos); `localStorageRecurrenceRepository.test.js` (escritura sin duplicados, sin cuota) |
| R7 | `[H9-R7] filterDismissedRecurrences oculta descartadas equivalentes…` (`recurrenceDetector.test.js`); `[H9-R7]` persistencia entre sesiones y JSON inválido (`localStorageRecurrenceRepository.test.js`); `[H9-R7] una recurrencia descartada no vuelve a sugerirse aunque un gasto nuevo mueva la mediana…` (`recurrencesLoader.test.js`); `[H9-R7] al descartar guarda la clave…` y `[H9-R7] si falla el descarte muestra el error…` (`MonthlyOverviewScreen.test.jsx`) |
| R8 | `[H9-R8] lee los tres meses…` (`recurrencesLoader.test.js`); cuatro casos `[H9-R8]` en `RecurrencesPanel.test.jsx` (contenido, Mobile/Desktop + 44 px, error, `onDismiss`); `[H9-R8] la pestaña Alertas muestra la recurrencia y la pestaña Resumen no renderiza el panel` (`MonthlyOverviewScreen.test.jsx`) |
| R9 | `[H9-R9] sin recurrencias muestra el estado vacío…` (`RecurrencesPanel.test.jsx`); `[H9-R9] sin gastos la pestaña Alertas muestra el estado vacío…` (`MonthlyOverviewScreen.test.jsx`) |
| R10 | `[H9-R10] el dominio de recurrencias no importa red, React ni SQLite y detecta sin red` (`recurrenceDetector.test.js`) |
| R11 | `[H9-R11] no cuenta gastos anteriores a la ventana ni posteriores…`, `[H9-R11] calcula la ventana en días corridos aunque cruce el cambio de año` (`recurrenceDetector.test.js`); `[H9-R11] no cuenta un gasto de agosto…` (`recurrencesLoader.test.js`) |

## K4 (CA2) sobre `test/fixtures/recurrencias_etiquetadas.json`

| Métrica | Valor | Umbral |
|---|---|---|
| Exhaustividad | **1,00** (22/22 esperadas con detección coincidente) | ≥ 0,85 |
| Precisión | **1,00** (22/22 detectadas correctas) | ≥ 0,85 |

Las 22 detecciones coinciden exactamente (mismos `expenseIds`) con los conjuntos esperados. Esto
es lo esperable: el fixture se etiquetó a mano con la definición de CA1 y el algoritmo la
codifica directamente. El fixture incluye los casos del diseño: borde exacto de ±10 %
(`720000/800000/880000`), recurrencias de 4 a 6 ocurrencias, atípicos de la misma categoría por
encima y por debajo, dos bandas de monto en una misma categoría, señuelos de 2 repeticiones,
de 3 repeticiones con variaciones de 15–30 %, montos iguales en categorías distintas y
repeticiones con una ocurrencia fuera de la ventana (anterior al `2026-09-02` y futura `2026-11-01`).

## Salida de `./init.sh` (resumida)

```
[OK]    Node.js v22.20.0 / npm v10.9.3 / node_modules presente
[OK]    feature_list.json válido (13 features, 1 en curso)
[OK]    H9: spec completo (11 requisitos)
[OK]    H9: todos los requisitos tienen prueba etiquetada
[OK]    eslint sin problemas
# tests 156 / pass 156 / fail 0
[OK]    Todas las pruebas pasan
[OK]    Entorno listo. Podés empezar a trabajar.
```

Antes de H9: 118 pruebas. Se agregaron 38 (todas con etiqueta `[H9-R<n>]`).

## Desvíos y decisiones menores respecto del diseño

1. **`categoryName` en `Recurrence`:** el diseño no fija una validación; el modelo usa
   `'Categoría <id>'` si llega vacío, el mismo texto de reserva del paso 6 del algoritmo.
2. **Fecha de referencia inválida en `detect`:** el diseño no lo cubre; lanza
   `InvalidRecurrence` (la excepción nueva del diseño) en vez de calcular una ventana basura.
3. **Validación de clave en `LocalStorageRecurrenceRepository.dismiss`:** como en el repositorio
   SQLite, una clave mal formada lanza `InvalidRecurrence`, así los dos repositorios se comportan igual.
4. **Controlador:** además de lo listado en el diseño, `getState()` expone `recurrenceError` y
   `renderElement()` pasa `initialRecurrenceError` (prop opcional nueva, default `null`) para
   que el mensaje de error de descarte del diseño («No se pudo descartar la recurrencia. Probá
   de nuevo.») también se vea en el render del controlador. `dismissRecurrence` atrapa la falla
   del repositorio, deja la lista sin cambios y devuelve el estado (misma semántica que
   `handleDismissRecurrence` del componente).
5. **`reloadRecurrences()`:** método auxiliar del controlador que usan `reloadMonthData` y
   `dismissRecurrence`; siempre usa `today()` y no el mes navegado, como pide el diseño.

Nada de esto agrega requisitos ni cambia contratos existentes; las props nuevas son opcionales.

## Privacidad y arquitectura

- `src/domain/` (modelo, servicio y contrato) no importa `react`, `react-dom`, `node:sqlite`,
  `axios` ni usa `fetch`; lo verifica `[H9-R10]`.
- La clave guardada solo contiene `categoryId` y un monto en centavos.
- Importes en centavos enteros; la tolerancia se compara con aritmética entera.
- Sin `console.log`, sin TODOs y sin código comentado en los archivos nuevos.
