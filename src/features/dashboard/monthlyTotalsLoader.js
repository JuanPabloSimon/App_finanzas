import { shiftYearMonth } from '../../core/dates.js';
import { COMPARISON_WINDOW_MONTHS } from '../../domain/services/monthlyComparison.js';

export async function loadPreviousMonthlyTotals(expenseRepository, activeYearMonth) {
  const yearMonths = [];
  for (let offset = 1; offset <= COMPARISON_WINDOW_MONTHS; offset += 1) {
    yearMonths.push(shiftYearMonth(activeYearMonth, -offset));
  }

  const expensesByMonth = await Promise.all(
    yearMonths.map((yearMonth) => expenseRepository.findByYearMonth(yearMonth)),
  );

  return yearMonths.map((yearMonth, idx) => ({
    yearMonth,
    totalCents: (expensesByMonth[idx] ?? []).reduce(
      (sum, expense) => sum + expense.amountCents,
      0,
    ),
  }));
}
