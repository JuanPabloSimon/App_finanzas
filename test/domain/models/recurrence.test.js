import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Recurrence,
  buildRecurrenceKey,
  parseRecurrenceKey,
} from '../../../src/domain/models/recurrence.js';
import { InvalidRecurrence } from '../../../src/core/errors.js';

function buildRecurrence(patch = {}) {
  return new Recurrence({
    categoryId: 7,
    categoryName: 'Suscripciones',
    typicalAmountCents: 650000,
    occurrences: 3,
    expenseIds: [1, 4, 9],
    ...patch,
  });
}

describe('H9 modelo de recurrencia', () => {
  it('[H9-R6] la clave de la recurrencia es <categoryId>|<typicalAmountCents>', () => {
    const recurrence = buildRecurrence();
    assert.equal(recurrence.key, '7|650000');
    assert.equal(buildRecurrenceKey(7, 650000), '7|650000');
    assert.deepEqual(
      { ...parseRecurrenceKey('7|650000') },
      { categoryId: 7, typicalAmountCents: 650000 },
    );
  });

  it('[H9-R6] parseRecurrenceKey devuelve null para claves mal formadas', () => {
    for (const invalid of ['', 'a|b', '1|0', '1|10.5', '0|100', '1|', '|100', '1|100|2', null, 42]) {
      assert.equal(parseRecurrenceKey(invalid), null, `clave ${String(invalid)}`);
    }
  });

  it('[H9-R6] rechaza montos no enteros, categorías inválidas y repeticiones que no coinciden con los gastos', () => {
    assert.throws(() => buildRecurrence({ typicalAmountCents: 6500.5 }), InvalidRecurrence);
    assert.throws(() => buildRecurrence({ typicalAmountCents: 0 }), InvalidRecurrence);
    assert.throws(() => buildRecurrence({ categoryId: 0 }), InvalidRecurrence);
    assert.throws(() => buildRecurrence({ occurrences: 4 }), InvalidRecurrence);
    assert.throws(() => buildRecurrence({ expenseIds: 'x' }), InvalidRecurrence);
  });

  it('[H9-R6] es inmutable y compara por contenido', () => {
    const recurrence = buildRecurrence();
    assert.equal(Object.isFrozen(recurrence), true);
    assert.equal(Object.isFrozen(recurrence.expenseIds), true);
    assert.throws(() => {
      recurrence.typicalAmountCents = 1;
    }, TypeError);
    assert.equal(recurrence.isEqual(buildRecurrence()), true);
    assert.equal(recurrence.isEqual(buildRecurrence({ expenseIds: [1, 4, 10] })), false);
    assert.equal(recurrence.isEqual({ ...recurrence }), false);
  });

  it('[H9-R6] sin nombre de categoría usa «Categoría <id>»', () => {
    assert.equal(buildRecurrence({ categoryName: '  ' }).categoryName, 'Categoría 7');
  });
});
