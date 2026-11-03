# Verificación — Cómo demostrar que el trabajo funciona

> Regla de oro: **el agente no dice "funciona", lo demuestra**.

## Nivel 1 — Pruebas unitarias (obligatorio)

Toda clase o función pública de `src/domain/` y `src/assistant/` tiene pruebas que cubren
el camino feliz y al menos un camino de error.

```bash
npm test
```

## Nivel 2 — Persistencia con base SQLite en memoria (obligatorio si toca `src/data/`)

```javascript
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { AppDatabase } from '../../src/data/db/appDatabase.js';
import { SqliteRecurrenceRepository } from '../../src/data/repositories/sqliteRecurrenceRepository.js';

describe('H9 persistencia de recurrencias', () => {
  let db;

  beforeEach(async () => {
    db = await AppDatabase.openInMemory();
  });

  afterEach(async () => {
    await db.close();
  });

  it('[H9-R6] persiste la recurrencia descartada', async () => {
    const repo = new SqliteRecurrenceRepository(db);
    await repo.dismiss('1|6000');
    const keys = await repo.dismissedKeys();
    assert.equal(keys.has('1|6000'), true);
  });
});
```

## Nivel 3 — Pruebas de componentes / pantallas (obligatorio para features de UI)

```javascript
it('[H1-R2] no guarda un monto igual a cero y muestra error', async () => {
  // Renderizado de ExpenseFormScreen y simulación de envío con monto "0"
  // Verifica que se muestra "Ingresá un monto mayor que cero" y que no se invoca al repositorio
});
```

Además, en las pantallas con adaptación Mobile First + Desktop se verifica que el layout
responda adecuadamente a dimensiones móviles (`< 768px`) y de escritorio (`≥ 768px`).

## Nivel 4 — Asistente sin red (obligatorio para H10)

Se inyecta un `FakeLlmClient` con tres modos: respuesta válida, respuesta mal formada y
demora mayor al tiempo límite (10 s). Se verifica también el contenido exacto del resumen
enviado (regla de privacidad 15 de `rules.md`).

## Nivel 5 — Trazabilidad de requisitos (obligatorio para `sdd: true`)

Cada `R<n>` de `specs/<name>/requirements.md` tiene una prueba con la etiqueta
`[H<id>-R<n>]`. Lo verifica `node tool/harness_check.mjs`, que también corre dentro de
`./init.sh` y `./init.ps1`. El implementer deja el mapa en `progress/impl_<name>.md`:

```markdown
## Trazabilidad
| Requisito | Prueba |
|---|---|
| R1 | `[H9-R1] agrupa 3 gastos de la misma categoría en 60 días` |
```

## Nivel 6 — Prueba manual en Mobile y Desktop (recomendado al cerrar una iteración)

Recorrido corto tanto en vista Mobile como en vista Desktop: aceptar aviso → cargar 3
gastos → ver tablero → pedir recomendación → exportar CSV. Anotar resultado en
`progress/current.md`.

## Antipatrones

- ❌ «Agregué la pantalla, debería andar.» → falta prueba ejecutable.
- ❌ Prueba que solo verifica que no se lanza una excepción.
- ❌ Mock trivial de la base de datos que saltea las consultas SQL en lugar de usar SQLite en memoria.
- ❌ Prueba que llama a la API real del modelo.
- ❌ Marcar `done` sin `./init.sh` (o `./init.ps1`) en verde.

## Verificación final antes de cerrar

```bash
./init.sh     # o powershell -ExecutionPolicy Bypass -File ./init.ps1 (debe terminar con [OK] Entorno listo)
```
