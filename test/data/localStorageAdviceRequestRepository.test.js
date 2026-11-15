import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  LocalStorageAdviceRequestRepository,
  ADVICE_REQUESTS_STORAGE_KEY,
} from '../../src/data/repositories/localStorageAdviceRequestRepository.js';
import { AdviceRequestRepository } from '../../src/domain/repositories/adviceRequestRepository.js';
import { AdviceRequest } from '../../src/domain/models/adviceRequest.js';

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

function request(yearMonth, source, createdAt = `${yearMonth}-15T10:00:00`) {
  return new AdviceRequest({ yearMonth, source, createdAt });
}

describe('H10 persistencia de consultas al asistente en el navegador', () => {
  it('[H10-R25] save escribe fp_advice_requests y una instancia nueva sobre el mismo storage cuenta las filas', async () => {
    const storage = createFakeStorage();
    const repo = new LocalStorageAdviceRequestRepository(storage);
    assert.equal(repo instanceof AdviceRequestRepository, true);
    assert.equal(ADVICE_REQUESTS_STORAGE_KEY, 'fp_advice_requests');

    const first = await repo.save(request('2026-11', 'model', '2026-11-15T10:00:00'));
    const second = await repo.save(request('2026-11', 'model', '2026-11-15T10:05:00'));
    assert.equal(first.id, 1);
    assert.equal(second.id, 2);

    const stored = JSON.parse(storage.map.get('fp_advice_requests'));
    assert.deepEqual(stored, [
      { id: 1, yearMonth: '2026-11', source: 'model', createdAt: '2026-11-15T10:00:00' },
      { id: 2, yearMonth: '2026-11', source: 'model', createdAt: '2026-11-15T10:05:00' },
    ]);

    const nextSession = new LocalStorageAdviceRequestRepository(storage);
    assert.equal(await nextSession.countByYearMonth('2026-11', 'model'), 2);
  });

  it('[H10-R25] con JSON inválido cuenta 0 sin lanzar y un error de escritura se propaga', async () => {
    const storage = createFakeStorage({ fp_advice_requests: '{no es json' });
    const repo = new LocalStorageAdviceRequestRepository(storage);
    assert.equal(await repo.countByYearMonth('2026-11', 'model'), 0);
    const saved = await repo.save(request('2026-11', 'model'));
    assert.equal(saved.id, 1);

    const failing = new LocalStorageAdviceRequestRepository({
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    });
    await assert.rejects(() => failing.save(request('2026-11', 'model')), /QuotaExceededError/);
    assert.throws(() => new LocalStorageAdviceRequestRepository(null));
  });

  it('[H10-R24] el conteo separa el mes y el source', async () => {
    const storage = createFakeStorage();
    const repo = new LocalStorageAdviceRequestRepository(storage);
    await repo.save(request('2026-11', 'model'));
    await repo.save(request('2026-11', 'fallback'));
    await repo.save(request('2026-11', 'fallback'));
    await repo.save(request('2026-10', 'model'));

    assert.equal(await repo.countByYearMonth('2026-11', 'model'), 1);
    assert.equal(await repo.countByYearMonth('2026-11', 'fallback'), 2);
    assert.equal(await repo.countByYearMonth('2026-10', 'model'), 1);
    assert.equal(await repo.countByYearMonth('2026-12', 'model'), 0);
  });
});
