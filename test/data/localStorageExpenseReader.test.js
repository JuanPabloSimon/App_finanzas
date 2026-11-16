import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  readStoredExpenses,
  EXPENSES_STORAGE_KEY,
} from '../../src/data/repositories/localStorageExpenseReader.js';
import { Expense } from '../../src/domain/models/expense.js';

function createFakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
  };
}

const STORED_EXPENSES = [
  {
    id: 3,
    amountCents: 650000,
    date: '2026-11-05',
    categoryId: 7,
    categoryName: 'Suscripciones',
    subcategory: 'Streaming',
    note: null,
    createdAt: '2026-11-05T10:00:00',
    updatedAt: '2026-11-05T10:00:00',
  },
  {
    id: 2,
    amountCents: 120000,
    date: '2026-09-01',
    categoryId: 1,
    categoryName: 'Alimentos',
    subcategory: null,
    note: 'Super',
    createdAt: '2026-09-01T10:00:00',
    updatedAt: '2026-09-01T10:00:00',
  },
  {
    id: 1,
    amountCents: 5000,
    date: '2026-11-05',
    categoryId: 2,
    categoryName: 'Transporte',
    subcategory: null,
    note: null,
    createdAt: '2026-11-05T09:00:00',
    updatedAt: '2026-11-05T09:00:00',
  },
  {
    id: 4,
    amountCents: 9900,
    date: '2026-10-12',
    categoryId: 5,
    categoryName: 'Ocio',
    subcategory: null,
    note: null,
    createdAt: '2026-10-12T09:00:00',
    updatedAt: '2026-10-12T09:00:00',
  },
];

describe('H11 lectura del historial guardado en el navegador', () => {
  it('[H11-R1] devuelve como Expense todos los gastos guardados en fp_expenses, de cualquier mes', () => {
    assert.equal(EXPENSES_STORAGE_KEY, 'fp_expenses');
    const storage = createFakeStorage({
      fp_expenses: JSON.stringify(STORED_EXPENSES.slice(0, 3)),
    });
    const expenses = readStoredExpenses(storage);
    assert.equal(expenses.length, 3);
    assert.ok(expenses.every((expense) => expense instanceof Expense));
    assert.deepEqual(
      new Set(expenses.map((expense) => expense.date.slice(0, 7))),
      new Set(['2026-09', '2026-11']),
    );
  });

  it('[H11-R10] los devuelve ordenados por fecha ascendente y a igual fecha por id ascendente', () => {
    const storage = createFakeStorage({ fp_expenses: JSON.stringify(STORED_EXPENSES) });
    const expenses = readStoredExpenses(storage);
    assert.deepEqual(
      expenses.map((expense) => [expense.date, expense.id]),
      [
        ['2026-09-01', 2],
        ['2026-10-12', 4],
        ['2026-11-05', 1],
        ['2026-11-05', 3],
      ],
    );
  });

  it('[H11-R1] con la clave ausente, JSON inválido o un valor que no es arreglo devuelve una lista vacía sin lanzar', () => {
    assert.deepEqual(readStoredExpenses(createFakeStorage()), []);
    assert.deepEqual(readStoredExpenses(createFakeStorage({ fp_expenses: '{no json' })), []);
    assert.deepEqual(readStoredExpenses(createFakeStorage({ fp_expenses: '{}' })), []);
    assert.deepEqual(readStoredExpenses(null), []);
  });
});
