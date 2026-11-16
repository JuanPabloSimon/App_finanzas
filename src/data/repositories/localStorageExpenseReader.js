import { Expense } from '../../domain/models/expense.js';

export const EXPENSES_STORAGE_KEY = 'fp_expenses';

function readRawExpenses(storage) {
  try {
    const raw = storage?.getItem(EXPENSES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function readStoredExpenses(storage) {
  return readRawExpenses(storage)
    .map((item) => new Expense(item))
    .sort((a, b) => {
      if (a.date !== b.date) {
        return a.date < b.date ? -1 : 1;
      }
      return (a.id ?? 0) - (b.id ?? 0);
    });
}
