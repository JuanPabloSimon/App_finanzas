import { isValidIsoDate } from '../../core/dates.js';
import { InvalidRecurrence } from '../../core/errors.js';
import { Recurrence, parseRecurrenceKey } from '../models/recurrence.js';

export const RECURRENCE_WINDOW_DAYS = 60;
export const RECURRENCE_MIN_OCCURRENCES = 3;
export const RECURRENCE_TOLERANCE_PCT = 10;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function shiftIsoDateDays(isoDate, deltaDays) {
  const [year, month, day] = isoDate.split('-').map((part) => Number.parseInt(part, 10));
  const shifted = new Date(Date.UTC(year, month - 1, day) + deltaDays * MS_PER_DAY);
  const yyyy = String(shifted.getUTCFullYear()).padStart(4, '0');
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(shifted.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function medianOfSorted(sortedAmounts, from, to) {
  const count = to - from + 1;
  const middle = from + Math.floor(count / 2);
  if (count % 2 === 1) {
    return sortedAmounts[middle];
  }
  return Math.round((sortedAmounts[middle - 1] + sortedAmounts[middle]) / 2);
}

function isWithinTolerance(amountCents, typicalAmountCents, tolerancePct) {
  return Math.abs(amountCents - typicalAmountCents) * 100 <= typicalAmountCents * tolerancePct;
}

function isEligibleExpense(expense, windowStart, referenceDate) {
  return (
    expense !== null &&
    typeof expense === 'object' &&
    Number.isSafeInteger(expense.amountCents) &&
    expense.amountCents > 0 &&
    Number.isSafeInteger(expense.categoryId) &&
    expense.categoryId > 0 &&
    typeof expense.date === 'string' &&
    expense.date >= windowStart &&
    expense.date <= referenceDate
  );
}

function compareRecurrences(a, b) {
  const scoreA = a.typicalAmountCents * a.occurrences;
  const scoreB = b.typicalAmountCents * b.occurrences;
  if (scoreA !== scoreB) {
    return scoreB - scoreA;
  }
  const byName = a.categoryName.localeCompare(b.categoryName, 'es', { sensitivity: 'base' });
  if (byName !== 0) {
    return byName;
  }
  return a.typicalAmountCents - b.typicalAmountCents;
}

export class RecurrenceDetector {
  constructor({
    windowDays = RECURRENCE_WINDOW_DAYS,
    minOccurrences = RECURRENCE_MIN_OCCURRENCES,
    tolerancePct = RECURRENCE_TOLERANCE_PCT,
  } = {}) {
    this.windowDays = windowDays;
    this.minOccurrences = minOccurrences;
    this.tolerancePct = tolerancePct;
    Object.freeze(this);
  }

  detect(expenses, { referenceDate, categoryNames = new Map() } = {}) {
    if (!isValidIsoDate(referenceDate)) {
      throw new InvalidRecurrence('La fecha de referencia debe estar en formato AAAA-MM-DD');
    }
    const windowStart = shiftIsoDateDays(referenceDate, -(this.windowDays - 1));

    const byCategory = new Map();
    for (const expense of expenses ?? []) {
      if (!isEligibleExpense(expense, windowStart, referenceDate)) {
        continue;
      }
      const list = byCategory.get(expense.categoryId) ?? [];
      list.push(expense);
      byCategory.set(expense.categoryId, list);
    }

    const recurrences = [];
    for (const [categoryId, list] of byCategory) {
      const sorted = [...list].sort((a, b) =>
        a.amountCents !== b.amountCents ? a.amountCents - b.amountCents : (a.id ?? 0) - (b.id ?? 0),
      );
      const amounts = sorted.map((expense) => expense.amountCents);
      const categoryName =
        categoryNames.get(categoryId) ?? sorted[0].categoryName ?? `Categoría ${categoryId}`;

      let i = 0;
      while (i < sorted.length) {
        let end = -1;
        for (let j = sorted.length - 1; j >= i + this.minOccurrences - 1; j -= 1) {
          const typical = medianOfSorted(amounts, i, j);
          if (
            isWithinTolerance(amounts[i], typical, this.tolerancePct) &&
            isWithinTolerance(amounts[j], typical, this.tolerancePct)
          ) {
            end = j;
            break;
          }
        }
        if (end === -1) {
          i += 1;
          continue;
        }
        const members = sorted.slice(i, end + 1);
        recurrences.push(
          new Recurrence({
            categoryId,
            categoryName,
            typicalAmountCents: medianOfSorted(amounts, i, end),
            occurrences: members.length,
            expenseIds: members.map((expense) => expense.id).sort((a, b) => a - b),
          }),
        );
        i = end + 1;
      }
    }

    return Object.freeze(recurrences.sort(compareRecurrences));
  }
}

export function filterDismissedRecurrences(recurrences, dismissedKeys) {
  const parsedKeys = [];
  for (const key of dismissedKeys ?? []) {
    const parsed = parseRecurrenceKey(key);
    if (parsed) {
      parsedKeys.push(parsed);
    }
  }
  return Object.freeze(
    (recurrences ?? []).filter(
      (recurrence) =>
        !parsedKeys.some(
          (dismissed) =>
            dismissed.categoryId === recurrence.categoryId &&
            Math.abs(recurrence.typicalAmountCents - dismissed.typicalAmountCents) * 10 <=
              dismissed.typicalAmountCents,
        ),
    ),
  );
}
