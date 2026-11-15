import { calculateCategoryIncomeBreakdown } from '../models/monthlyIncome.js';
import { calculateVariationTenths } from './monthlyComparison.js';

export const SUMMARY_CURRENCY = 'ARS';
export const SUMMARY_MAX_CATEGORIES = 8;
export const SUMMARY_OTHERS_NAME = 'Otros';
export const SUMMARY_MAX_RECURRENCES = 10;
export const TYPICAL_AMOUNT_ROUNDING_PESOS = 100;
export const SUMMARY_MAX_CHARS = 6000;

export function centsToRoundedPesos(cents) {
  return Math.floor((cents + 50) / 100);
}

export function roundTypicalAmountPesos(cents) {
  const pesos = centsToRoundedPesos(cents);
  const half = TYPICAL_AMOUNT_ROUNDING_PESOS / 2;
  return Math.max(
    TYPICAL_AMOUNT_ROUNDING_PESOS,
    Math.floor((pesos + half) / TYPICAL_AMOUNT_ROUNDING_PESOS) * TYPICAL_AMOUNT_ROUNDING_PESOS,
  );
}

function sumValidCents(expenses) {
  let total = 0;
  for (const expense of expenses ?? []) {
    if (expense && Number.isInteger(expense.amountCents) && expense.amountCents > 0) {
      total += expense.amountCents;
    }
  }
  return total;
}

function isOthersName(name) {
  return (
    String(name ?? '').toLocaleLowerCase('es') ===
    SUMMARY_OTHERS_NAME.toLocaleLowerCase('es')
  );
}

function toTenths(percentage) {
  return Math.round(Number(percentage ?? 0) * 10);
}

function buildCategoryGroups(breakdown) {
  const toGroup = (entry) => ({
    name: entry.categoryName,
    amountCents: entry.amountCents,
    percentageTenths: toTenths(entry.expensePercentage),
    categoryIds: new Set([entry.categoryId]),
  });

  if (breakdown.length <= SUMMARY_MAX_CATEGORIES) {
    return breakdown.map(toGroup);
  }

  const groups = breakdown.slice(0, SUMMARY_MAX_CATEGORIES).map(toGroup);
  const rest = breakdown.slice(SUMMARY_MAX_CATEGORIES);
  let othersGroup = groups.find((group) => isOthersName(group.name));
  if (!othersGroup) {
    othersGroup = {
      name: SUMMARY_OTHERS_NAME,
      amountCents: 0,
      percentageTenths: 0,
      categoryIds: new Set(),
    };
    groups.push(othersGroup);
  }
  for (const entry of rest) {
    othersGroup.amountCents += entry.amountCents;
    othersGroup.percentageTenths += toTenths(entry.expensePercentage);
    othersGroup.categoryIds.add(entry.categoryId);
  }
  return groups;
}

function buildPreviousTotals(previousBreakdown) {
  const totals = new Map();
  for (const entry of previousBreakdown) {
    totals.set(entry.categoryId, entry.amountCents);
  }
  return totals;
}

/**
 * Arma el resumen agregado del contrato de docs/llm_assistant.md por lista blanca.
 * @param {{ yearMonth: string, expenses: Expense[], previousExpenses: Expense[],
 *           categories: Category[], monthlyIncome: MonthlyIncome|null,
 *           recurrences: ReadonlyArray<Recurrence> }} input
 * @returns {Readonly<object>} objeto congelado (arreglos y elementos incluidos)
 */
export function buildSpendingSummary({
  yearMonth,
  expenses = [],
  previousExpenses = [],
  categories = [],
  monthlyIncome = null,
  recurrences = [],
} = {}) {
  const breakdown = calculateCategoryIncomeBreakdown(expenses ?? [], categories ?? [], null);
  const previousBreakdown = calculateCategoryIncomeBreakdown(
    previousExpenses ?? [],
    categories ?? [],
    null,
  );
  const previousTotals = buildPreviousTotals(previousBreakdown);

  const categorias = buildCategoryGroups(breakdown).map((group) => {
    let previousCents = 0;
    for (const categoryId of group.categoryIds) {
      previousCents += previousTotals.get(categoryId) ?? 0;
    }
    const variationTenths =
      previousCents === 0 ? null : calculateVariationTenths(group.amountCents, previousCents);
    return Object.freeze({
      nombre: group.name,
      total: centsToRoundedPesos(group.amountCents),
      porcentaje: group.percentageTenths / 10,
      variacion_pct: variationTenths === null ? null : variationTenths / 10,
    });
  });

  const recurrencias = (recurrences ?? []).slice(0, SUMMARY_MAX_RECURRENCES).map((recurrence) =>
    Object.freeze({
      categoria: recurrence.categoryName,
      monto_tipico: roundTypicalAmountPesos(recurrence.typicalAmountCents),
      veces_en_60_dias: recurrence.occurrences,
    }),
  );

  const incomeCents =
    monthlyIncome && Number.isInteger(monthlyIncome.amountCents) && monthlyIncome.amountCents > 0
      ? monthlyIncome.amountCents
      : null;

  return Object.freeze({
    periodo: yearMonth,
    moneda: SUMMARY_CURRENCY,
    total_mes: centsToRoundedPesos(sumValidCents(expenses)),
    total_mes_anterior: centsToRoundedPesos(sumValidCents(previousExpenses)),
    ingreso_mensual: incomeCents === null ? null : centsToRoundedPesos(incomeCents),
    categorias: Object.freeze(categorias),
    recurrencias: Object.freeze(recurrencias),
  });
}
