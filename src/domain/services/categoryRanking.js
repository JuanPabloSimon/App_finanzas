export function compareCategoryTotals(a, b) {
  if (b.amountCents !== a.amountCents) {
    return b.amountCents - a.amountCents;
  }
  const byName = String(a.categoryName ?? '').localeCompare(
    String(b.categoryName ?? ''),
    'es',
    { sensitivity: 'base' },
  );
  if (byName !== 0) {
    return byName;
  }
  return a.categoryId - b.categoryId;
}

export function buildCategoryRanking(categoryBreakdown = []) {
  const validEntries = (categoryBreakdown ?? []).filter(
    (entry) =>
      entry && Number.isInteger(entry.amountCents) && entry.amountCents > 0,
  );

  const ranking = [...validEntries]
    .sort(compareCategoryTotals)
    .map((entry, idx) =>
      Object.freeze({
        position: idx + 1,
        categoryId: entry.categoryId,
        categoryName: entry.categoryName,
        amountCents: entry.amountCents,
        expensePercentage: entry.expensePercentage,
      }),
    );

  return Object.freeze(ranking);
}
