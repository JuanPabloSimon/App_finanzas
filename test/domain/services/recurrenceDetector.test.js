import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  RecurrenceDetector,
  filterDismissedRecurrences,
  RECURRENCE_WINDOW_DAYS,
  RECURRENCE_MIN_OCCURRENCES,
  RECURRENCE_TOLERANCE_PCT,
} from '../../../src/domain/services/recurrenceDetector.js';
import { Recurrence } from '../../../src/domain/models/recurrence.js';
import { InvalidRecurrence } from '../../../src/core/errors.js';

const REFERENCE_DATE = '2026-10-31';
const NAMES = new Map([
  [1, 'Suscripciones'],
  [2, 'Delivery'],
  [3, 'Transporte'],
]);

function exp(id, amountCents, date = '2026-10-10', categoryId = 1) {
  return { id, amountCents, date, categoryId };
}

function detect(expenses, referenceDate = REFERENCE_DATE) {
  return new RecurrenceDetector().detect(expenses, { referenceDate, categoryNames: NAMES });
}

function recurrence(categoryId, typicalAmountCents, occurrences = 3) {
  return new Recurrence({
    categoryId,
    categoryName: NAMES.get(categoryId) ?? null,
    typicalAmountCents,
    occurrences,
    expenseIds: Array.from({ length: occurrences }, (_, idx) => idx + 1),
  });
}

function keys(list) {
  return list.map((r) => r.key);
}

describe('H9 detección de recurrencias', () => {
  it('[H9-R1] usa los parámetros de CA1: 60 días, 3 ocurrencias y 10 %', () => {
    const detector = new RecurrenceDetector();
    assert.equal(RECURRENCE_WINDOW_DAYS, 60);
    assert.equal(RECURRENCE_MIN_OCCURRENCES, 3);
    assert.equal(RECURRENCE_TOLERANCE_PCT, 10);
    assert.equal(detector.windowDays, 60);
    assert.equal(Object.isFrozen(detector), true);
  });

  it('[H9-R1] informa 3 gastos de la misma categoría en el borde exacto de ±10 % de la mediana', () => {
    const result = detect([
      exp(1, 540000, '2026-09-05'),
      exp(2, 600000, '2026-10-05'),
      exp(3, 660000, '2026-10-25'),
    ]);
    assert.equal(result.length, 1);
    assert.equal(Object.isFrozen(result), true);
    assert.equal(result[0].categoryId, 1);
    assert.equal(result[0].categoryName, 'Suscripciones');
    assert.equal(result[0].typicalAmountCents, 600000);
    assert.equal(result[0].occurrences, 3);
    assert.deepEqual([...result[0].expenseIds], [1, 2, 3]);
  });

  it('[H9-R1] con 4 gastos parecidos informa 4 ocurrencias y la mediana par redondeada al centavo', () => {
    const result = detect([
      exp(4, 100001, '2026-09-10', 2),
      exp(1, 100000, '2026-09-20', 2),
      exp(3, 100000, '2026-10-01', 2),
      exp(2, 100002, '2026-10-20', 2),
    ]);
    assert.equal(result.length, 1);
    assert.equal(result[0].occurrences, 4);
    assert.equal(result[0].typicalAmountCents, 100001);
    assert.deepEqual([...result[0].expenseIds], [1, 2, 3, 4]);

    const evenRounding = detect([
      exp(1, 100000, '2026-09-10'),
      exp(2, 100000, '2026-09-20'),
      exp(3, 100001, '2026-10-01'),
      exp(4, 100001, '2026-10-20'),
    ]);
    assert.equal(evenRounding[0].occurrences, 4);
    assert.equal(evenRounding[0].typicalAmountCents, 100001);
    assert.equal(Number.isInteger(evenRounding[0].typicalAmountCents), true);
  });

  it('[H9-R1] ordena las recurrencias por monto típico × ocurrencias de mayor a menor', () => {
    const result = detect([
      exp(1, 200000, '2026-09-10', 3),
      exp(2, 200000, '2026-09-20', 3),
      exp(3, 200000, '2026-10-01', 3),
      exp(4, 1200000, '2026-09-11', 2),
      exp(5, 1200000, '2026-09-21', 2),
      exp(6, 1200000, '2026-10-02', 2),
    ]);
    assert.deepEqual(
      result.map((r) => r.categoryName),
      ['Delivery', 'Transporte'],
    );
  });

  it('[H9-R2] no informa conjuntos de menos de 3 gastos', () => {
    assert.deepEqual([...detect([exp(1, 600000), exp(2, 600000, '2026-10-20')])], []);
    assert.deepEqual(
      [
        ...detect([
          exp(1, 600000, '2026-10-01', 1),
          exp(2, 600000, '2026-10-10', 1),
          exp(3, 600000, '2026-10-20', 2),
        ]),
      ],
      [],
    );
    assert.deepEqual([...detect([])], []);
    assert.equal(Object.isFrozen(detect([])), true);
  });

  it('[H9-R3] excluye de la recurrencia un gasto de la misma categoría a más de 10 % por debajo o por encima', () => {
    const result = detect([
      exp(1, 600000, '2026-09-05'),
      exp(2, 610000, '2026-09-25'),
      exp(3, 590000, '2026-10-15'),
      exp(4, 500000, '2026-10-20'),
      exp(5, 700000, '2026-10-22'),
    ]);
    assert.equal(result.length, 1);
    assert.equal(result[0].occurrences, 3);
    assert.deepEqual([...result[0].expenseIds], [1, 2, 3]);
  });

  it('[H9-R3] un atípico bajo no impide detectar 540000/600000/660000 y todo gasto emitido respeta el 10 %', () => {
    const expenses = [
      exp(1, 450000, '2026-09-04'),
      exp(2, 540000, '2026-09-10'),
      exp(3, 600000, '2026-10-05'),
      exp(4, 660000, '2026-10-25'),
    ];
    const result = detect(expenses);
    assert.equal(result.length, 1);
    assert.equal(result[0].typicalAmountCents, 600000);
    assert.deepEqual([...result[0].expenseIds], [2, 3, 4]);
    const amountById = new Map(expenses.map((e) => [e.id, e.amountCents]));
    for (const id of result[0].expenseIds) {
      const diff = Math.abs(amountById.get(id) - result[0].typicalAmountCents);
      assert.equal(diff * 10 <= result[0].typicalAmountCents, true);
    }
  });

  it('[H9-R11] no cuenta gastos anteriores a la ventana ni posteriores a la fecha de referencia', () => {
    const outside = detect([
      exp(1, 600000, '2026-09-01'),
      exp(2, 600000, '2026-10-01'),
      exp(3, 600000, '2026-10-20'),
      exp(4, 600000, '2026-11-01'),
    ]);
    assert.deepEqual([...outside], []);

    const edges = detect([
      exp(1, 600000, '2026-09-02'),
      exp(2, 600000, '2026-10-01'),
      exp(3, 600000, '2026-10-31'),
    ]);
    assert.equal(edges.length, 1);
    assert.deepEqual([...edges[0].expenseIds], [1, 2, 3]);
  });

  it('[H9-R11] calcula la ventana en días corridos aunque cruce el cambio de año', () => {
    const result = detect(
      [
        exp(1, 300000, '2025-12-03'),
        exp(2, 300000, '2026-01-10'),
        exp(3, 300000, '2026-01-31'),
        exp(4, 300000, '2025-12-02'),
      ],
      '2026-01-31',
    );
    assert.equal(result.length, 1);
    assert.deepEqual([...result[0].expenseIds], [1, 2, 3]);
    assert.throws(
      () => new RecurrenceDetector().detect([], { referenceDate: '31/10/2026' }),
      InvalidRecurrence,
    );
  });

  it('[H9-R7] filterDismissedRecurrences oculta descartadas equivalentes e ignora claves inválidas', () => {
    const detected = [recurrence(1, 650000), recurrence(2, 300000)];
    assert.deepEqual(keys(filterDismissedRecurrences(detected, new Set(['1|650000']))), [
      '2|300000',
    ]);
    assert.deepEqual(
      keys(filterDismissedRecurrences([recurrence(1, 660000)], new Set(['1|650000']))),
      [],
    );
    assert.deepEqual(
      keys(filterDismissedRecurrences([recurrence(1, 715000)], new Set(['1|650000']))),
      [],
    );
    assert.deepEqual(
      keys(filterDismissedRecurrences([recurrence(1, 715001)], new Set(['1|650000']))),
      ['1|715001'],
    );
    assert.deepEqual(
      keys(filterDismissedRecurrences([recurrence(3, 650000)], new Set(['1|650000']))),
      ['3|650000'],
    );
    assert.deepEqual(
      keys(filterDismissedRecurrences(detected, new Set(['', 'a|b', '1|0', '1|10.5']))),
      ['1|650000', '2|300000'],
    );
    assert.equal(Object.isFrozen(filterDismissedRecurrences(detected, new Set())), true);
  });

  it('[H9-R10] el dominio de recurrencias no importa red, React ni SQLite y detecta sin red', () => {
    const forbiddenTokens = [
      'fetch(',
      'XMLHttpRequest',
      'axios',
      "from 'react'",
      'react-dom',
      'node:sqlite',
    ];
    for (const relative of [
      '../../../src/domain/services/recurrenceDetector.js',
      '../../../src/domain/models/recurrence.js',
      '../../../src/domain/repositories/recurrenceRepository.js',
    ]) {
      const source = fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
      for (const token of forbiddenTokens) {
        assert.equal(source.includes(token), false, `${relative} contiene ${token}`);
      }
    }

    const originalFetch = globalThis.fetch;
    globalThis.fetch = () => {
      throw new Error('La detección no debe usar la red');
    };
    try {
      const result = detect([
        exp(1, 600000, '2026-09-05'),
        exp(2, 600000, '2026-10-05'),
        exp(3, 600000, '2026-10-25'),
      ]);
      assert.equal(result.length, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
