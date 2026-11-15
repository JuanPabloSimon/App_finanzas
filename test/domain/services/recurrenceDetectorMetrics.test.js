import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { RecurrenceDetector } from '../../../src/domain/services/recurrenceDetector.js';

const fixture = JSON.parse(
  fs.readFileSync(
    new URL('../../fixtures/recurrencias_etiquetadas.json', import.meta.url),
    'utf8',
  ),
);

function matches(detected, expected) {
  if (detected.categoryId !== expected.category_id) {
    return false;
  }
  const expectedIds = new Set(expected.expense_ids);
  const overlap = detected.expenseIds.filter((id) => expectedIds.has(id)).length;
  return overlap * 10 >= 8 * Math.max(detected.expenseIds.length, expected.expense_ids.length);
}

function evaluate() {
  const expenses = fixture.expenses.map((e) => ({
    id: e.id,
    amountCents: e.amount_cents,
    date: e.date,
    categoryId: e.category_id,
  }));
  const categoryNames = new Map(
    Object.entries(fixture.categories).map(([id, name]) => [Number(id), name]),
  );
  const detected = new RecurrenceDetector().detect(expenses, {
    referenceDate: fixture.reference_date,
    categoryNames,
  });
  const recalled = fixture.expected.filter((e) => detected.some((d) => matches(d, e))).length;
  const correct = detected.filter((d) => fixture.expected.some((e) => matches(d, e))).length;
  return {
    recall: recalled / fixture.expected.length,
    precision: detected.length === 0 ? 0 : correct / detected.length,
    detected: detected.length,
    expected: fixture.expected.length,
  };
}

describe('H9 métricas de detección sobre el conjunto etiquetado (K4)', () => {
  it('[H9-R4][H9-R5] el conjunto etiquetado cumple el contenido mínimo del diseño', () => {
    assert.equal(fixture.reference_date, '2026-10-31');
    assert.equal(fixture.expected.length >= 20, true);
    const expectedIds = fixture.expected.flatMap((e) => e.expense_ids);
    assert.equal(new Set(expectedIds).size, expectedIds.length, 'expected debe ser disjunto');
    assert.equal(fixture.expenses.length - expectedIds.length >= 15, true);
    const byId = new Map(fixture.expenses.map((e) => [e.id, e]));
    for (const id of expectedIds) {
      const expense = byId.get(id);
      assert.equal(Number.isInteger(expense.amount_cents), true);
      assert.equal(expense.date >= '2026-09-02' && expense.date <= '2026-10-31', true);
    }
  });

  it('[H9-R4] alcanza una exhaustividad de al menos 0,85 sobre el conjunto etiquetado', () => {
    const { recall, detected, expected } = evaluate();
    assert.equal(
      recall >= 0.85,
      true,
      `exhaustividad=${recall.toFixed(4)} (detectadas=${detected}, esperadas=${expected})`,
    );
  });

  it('[H9-R5] alcanza una precisión de al menos 0,85 sobre el conjunto etiquetado', () => {
    const { precision, detected, expected } = evaluate();
    assert.equal(
      precision >= 0.85,
      true,
      `precisión=${precision.toFixed(4)} (detectadas=${detected}, esperadas=${expected})`,
    );
  });
});
