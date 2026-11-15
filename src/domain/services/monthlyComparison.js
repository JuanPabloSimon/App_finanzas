import { isValidYearMonth, shiftYearMonth } from '../../core/dates.js';
import { InvalidAmount, InvalidExpenseDate } from '../../core/errors.js';

export const COMPARISON_WINDOW_MONTHS = 5;

function assertNonNegativeSafeInteger(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new InvalidAmount('El total en centavos debe ser un entero no negativo');
  }
}

export function calculateVariationTenths(currentCents, previousCents) {
  assertNonNegativeSafeInteger(currentCents);
  assertNonNegativeSafeInteger(previousCents);
  if (previousCents === 0) {
    return null;
  }

  const numerator = 1000n * (BigInt(currentCents) - BigInt(previousCents));
  const denominator = BigInt(previousCents);
  const absNumerator = numerator < 0n ? -numerator : numerator;
  // Redondeo de empates lejos del cero con división entera de BigInt (que trunca).
  const quotient = (2n * absNumerator + denominator) / (2n * denominator);
  return Number(numerator < 0n ? -quotient : quotient);
}

export function buildMonthlyComparison({
  activeYearMonth,
  currentTotalCents,
  previousMonthlyTotals = [],
} = {}) {
  if (!isValidYearMonth(activeYearMonth)) {
    throw new InvalidExpenseDate('Período mensual inválido (AAAA-MM)');
  }
  assertNonNegativeSafeInteger(currentTotalCents);

  const totalsByYearMonth = new Map();
  for (const entry of previousMonthlyTotals ?? []) {
    assertNonNegativeSafeInteger(entry?.totalCents);
    totalsByYearMonth.set(entry.yearMonth, entry.totalCents);
  }

  const comparisonWindow = [];
  for (let offset = 1; offset <= COMPARISON_WINDOW_MONTHS; offset += 1) {
    const yearMonth = shiftYearMonth(activeYearMonth, -offset);
    comparisonWindow.push({ yearMonth, totalCents: totalsByYearMonth.get(yearMonth) ?? 0 });
  }

  let oldestWithDataIndex = -1;
  comparisonWindow.forEach((month, idx) => {
    if (month.totalCents > 0) {
      oldestWithDataIndex = idx;
    }
  });

  if (oldestWithDataIndex === -1) {
    return Object.freeze({
      activeYearMonth,
      currentTotalCents,
      previousMonths: Object.freeze([]),
      previousTotalCents: null,
      variationTenths: null,
      hasPreviousData: false,
    });
  }

  const previousMonths = Object.freeze(
    comparisonWindow.slice(0, oldestWithDataIndex + 1).map((month) => Object.freeze(month)),
  );
  const previousTotalCents = comparisonWindow[0].totalCents;

  return Object.freeze({
    activeYearMonth,
    currentTotalCents,
    previousMonths,
    previousTotalCents,
    variationTenths: calculateVariationTenths(currentTotalCents, previousTotalCents),
    hasPreviousData: true,
  });
}
