import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AdviceRequest,
  ADVICE_SOURCES,
  MONTHLY_MODEL_REQUEST_LIMIT,
} from '../../../src/domain/models/adviceRequest.js';
import { AdviceRequestRepository } from '../../../src/domain/repositories/adviceRequestRepository.js';
import { InvalidAdviceRequest } from '../../../src/core/errors.js';

describe('H10 registro de consultas al asistente', () => {
  it('[H10-R22][H10-R23] acepta source model y fallback, es inmutable y el límite mensual es 4', () => {
    assert.deepEqual([...ADVICE_SOURCES], ['model', 'fallback']);
    assert.equal(MONTHLY_MODEL_REQUEST_LIMIT, 4);

    const model = new AdviceRequest({
      yearMonth: '2026-11',
      source: 'model',
      createdAt: '2026-11-15T10:00:00',
    });
    const fallback = new AdviceRequest({
      id: 3,
      yearMonth: '2026-11',
      source: 'fallback',
      createdAt: '2026-11-15T10:00:01',
    });
    assert.equal(model.id, null);
    assert.equal(model.source, 'model');
    assert.equal(fallback.id, 3);
    assert.equal(fallback.source, 'fallback');
    assert.equal(Object.isFrozen(model), true);
    assert.throws(() => {
      model.source = 'fallback';
    }, TypeError);

    const withId = model.copyWith({ id: 7 });
    assert.equal(withId.id, 7);
    assert.equal(withId.isEqual(model.copyWith({ id: 7 })), true);
    assert.equal(withId.isEqual(model), false);
  });

  it('[H10-R22][H10-R23] rechaza un source, un yearMonth o un createdAt inválidos con InvalidAdviceRequest', () => {
    const base = { yearMonth: '2026-11', source: 'model', createdAt: '2026-11-15T10:00:00' };
    assert.throws(() => new AdviceRequest({ ...base, source: 'otro' }), InvalidAdviceRequest);
    assert.throws(() => new AdviceRequest({ ...base, source: undefined }), InvalidAdviceRequest);
    assert.throws(() => new AdviceRequest({ ...base, yearMonth: '2026-13' }), InvalidAdviceRequest);
    assert.throws(() => new AdviceRequest({ ...base, yearMonth: '2026-11-15' }), InvalidAdviceRequest);
    assert.throws(() => new AdviceRequest({ ...base, createdAt: '2026-11-15' }), InvalidAdviceRequest);
    assert.throws(
      () => new AdviceRequest({ ...base, createdAt: '2026-11-15T10:00:00Z' }),
      InvalidAdviceRequest,
    );
    assert.throws(() => new AdviceRequest({ ...base, id: 0 }), InvalidAdviceRequest);
    assert.throws(() => new AdviceRequest({ ...base, id: 1.5 }), InvalidAdviceRequest);
  });

  it('[H10-R22] el contrato AdviceRequestRepository no está implementado', async () => {
    const repo = new AdviceRequestRepository();
    await assert.rejects(() => repo.countByYearMonth('2026-11', 'model'), /Not implemented/);
    await assert.rejects(() => repo.save(null), /Not implemented/);
  });
});
