import { InvalidAmount, InvalidExpenseDate } from '../../core/errors.js';
import { isValidYearMonth, isValidIsoDateTime } from '../../core/dates.js';
import { CHART_PALETTE } from '../../core/theme.js';

export class MonthlyIncome {
  constructor({ yearMonth, amountCents, updatedAt = null }) {
    if (!isValidYearMonth(yearMonth)) {
      throw new InvalidExpenseDate('Período mensual inválido (AAAA-MM)');
    }
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw new InvalidAmount('Ingresá un ingreso mensual mayor que cero');
    }
    if (updatedAt !== null && updatedAt !== undefined && !isValidIsoDateTime(updatedAt)) {
      throw new InvalidExpenseDate(
        'La marca updated_at debe estar en formato ISO 8601 (YYYY-MM-DDTHH:MM:SS)',
      );
    }

    this.yearMonth = yearMonth;
    this.amountCents = amountCents;
    this.updatedAt = updatedAt ?? null;
    Object.freeze(this);
  }

  copyWith(patch = {}) {
    return new MonthlyIncome({
      yearMonth: patch.yearMonth !== undefined ? patch.yearMonth : this.yearMonth,
      amountCents: patch.amountCents !== undefined ? patch.amountCents : this.amountCents,
      updatedAt: patch.updatedAt !== undefined ? patch.updatedAt : this.updatedAt,
    });
  }

  isEqual(other) {
    if (!(other instanceof MonthlyIncome)) {
      return false;
    }
    return (
      this.yearMonth === other.yearMonth &&
      this.amountCents === other.amountCents &&
      this.updatedAt === other.updatedAt
    );
  }
}

export function calculateCategoryIncomeBreakdown(
  expenses = [],
  categories = [],
  monthlyIncome = null,
) {
  const categoryMap = new Map();
  for (const cat of categories) {
    categoryMap.set(cat.id, cat.name);
  }

  const totalsByCat = new Map();
  let totalExpensesCents = 0;

  for (const exp of expenses) {
    if (!exp || !Number.isInteger(exp.amountCents) || exp.amountCents <= 0) {
      continue;
    }
    totalExpensesCents += exp.amountCents;
    const prev = totalsByCat.get(exp.categoryId) ?? {
      categoryId: exp.categoryId,
      categoryName: exp.categoryName ?? categoryMap.get(exp.categoryId) ?? 'Categoría',
      amountCents: 0,
      expenseCount: 0,
    };
    prev.amountCents += exp.amountCents;
    prev.expenseCount += 1;
    totalsByCat.set(exp.categoryId, prev);
  }

  const incomeCents =
    monthlyIncome &&
    Number.isInteger(monthlyIncome.amountCents) &&
    monthlyIncome.amountCents > 0
      ? monthlyIncome.amountCents
      : null;

  const sortedEntries = [...totalsByCat.values()].sort((a, b) => {
    if (b.amountCents !== a.amountCents) {
      return b.amountCents - a.amountCents;
    }
    return a.categoryName.localeCompare(b.categoryName, 'es', {
      sensitivity: 'base',
    });
  });

  if (sortedEntries.length === 0) {
    return Object.freeze([]);
  }

  const rawExpensePercentages = sortedEntries.map((entry) =>
    totalExpensesCents > 0
      ? Math.round((entry.amountCents * 1000) / totalExpensesCents) / 10
      : 0,
  );

  if (totalExpensesCents > 0 && rawExpensePercentages.length > 0) {
    const sumTenths = rawExpensePercentages.reduce(
      (acc, pct) => acc + Math.round(pct * 10),
      0,
    );
    const diffTenths = 1000 - sumTenths;
    if (diffTenths !== 0) {
      rawExpensePercentages[0] =
        Math.round(rawExpensePercentages[0] * 10 + diffTenths) / 10;
    }
  }

  const items = sortedEntries.map((entry, idx) => {
    const incomePercentage =
      incomeCents !== null
        ? Math.round((entry.amountCents * 1000) / incomeCents) / 10
        : null;
    return Object.freeze({
      categoryId: entry.categoryId,
      categoryName: entry.categoryName,
      amountCents: entry.amountCents,
      expenseCount: entry.expenseCount,
      expensePercentage: rawExpensePercentages[idx],
      incomePercentage,
      colorHex: CHART_PALETTE[idx % CHART_PALETTE.length],
    });
  });

  return Object.freeze(items);
}
