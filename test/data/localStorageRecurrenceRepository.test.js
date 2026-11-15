import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  LocalStorageRecurrenceRepository,
  DISMISSED_RECURRENCES_STORAGE_KEY,
} from '../../src/data/repositories/localStorageRecurrenceRepository.js';
import { RecurrenceRepository } from '../../src/domain/repositories/recurrenceRepository.js';
import { InvalidRecurrence } from '../../src/core/errors.js';

function createFakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
  };
}

describe('H9 persistencia de recurrencias descartadas en el navegador', () => {
  it('[H9-R6] dismiss escribe fp_dismissed_recurrences sin duplicar la clave', async () => {
    const storage = createFakeStorage();
    const repo = new LocalStorageRecurrenceRepository(storage);
    assert.equal(repo instanceof RecurrenceRepository, true);
    assert.equal(DISMISSED_RECURRENCES_STORAGE_KEY, 'fp_dismissed_recurrences');

    await repo.dismiss('1|650000', '2026-10-31T10:00:00');
    await repo.dismiss('1|650000', '2026-10-31T11:00:00');

    const stored = JSON.parse(storage.map.get('fp_dismissed_recurrences'));
    assert.deepEqual(stored, [{ recurrenceKey: '1|650000', dismissedAt: '2026-10-31T10:00:00' }]);
    await assert.rejects(() => repo.dismiss('1|10.5'), InvalidRecurrence);
  });

  it('[H9-R7] una instancia nueva sobre el mismo almacenamiento conserva los descartes', async () => {
    const storage = createFakeStorage();
    await new LocalStorageRecurrenceRepository(storage).dismiss('2|300000');

    const nextSession = new LocalStorageRecurrenceRepository(storage);
    const keys = await nextSession.dismissedKeys();
    assert.equal(keys instanceof Set, true);
    assert.deepEqual([...keys], ['2|300000']);
  });

  it('[H9-R7] con JSON inválido devuelve un conjunto vacío sin lanzar', async () => {
    const storage = createFakeStorage({ fp_dismissed_recurrences: '{no es json' });
    const repo = new LocalStorageRecurrenceRepository(storage);
    assert.equal((await repo.dismissedKeys()).size, 0);

    await repo.dismiss('3|120000');
    assert.deepEqual([...(await repo.dismissedKeys())], ['3|120000']);
  });

  it('[H9-R6] sin cuota de almacenamiento ignora la escritura sin lanzar', async () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    const repo = new LocalStorageRecurrenceRepository(storage);
    await repo.dismiss('1|650000');
    assert.equal((await repo.dismissedKeys()).size, 0);
    assert.throws(() => new LocalStorageRecurrenceRepository(null));
  });
});
