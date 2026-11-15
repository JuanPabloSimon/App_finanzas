import { shiftYearMonth } from '../../core/dates.js';
import { buildSpendingSummary } from '../../domain/services/spendingSummaryBuilder.js';

/**
 * Lee los gastos del período y del mes anterior y el ingreso del período, y delega en
 * buildSpendingSummary. Las recurrencias llegan ya filtradas (visibles de H9).
 */
export async function loadSpendingSummary({
  expenseRepository,
  incomeRepository,
  categories = [],
  yearMonth,
  recurrences = [],
}) {
  const previousYearMonth = shiftYearMonth(yearMonth, -1);
  const [expenses, previousExpenses, monthlyIncome] = await Promise.all([
    expenseRepository.findByYearMonth(yearMonth),
    expenseRepository.findByYearMonth(previousYearMonth),
    incomeRepository.findByYearMonth(yearMonth),
  ]);
  return buildSpendingSummary({
    yearMonth,
    expenses,
    previousExpenses,
    categories,
    monthlyIncome: monthlyIncome ?? null,
    recurrences,
  });
}
