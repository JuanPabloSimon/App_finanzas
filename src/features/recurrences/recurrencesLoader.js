import { extractYearMonth, shiftYearMonth } from '../../core/dates.js';
import {
  RecurrenceDetector,
  filterDismissedRecurrences,
} from '../../domain/services/recurrenceDetector.js';

const MONTHS_COVERING_WINDOW = 3;

export async function loadVisibleRecurrences({
  expenseRepository,
  recurrenceRepository,
  categories = [],
  referenceDate,
  detector = new RecurrenceDetector(),
}) {
  const referenceYearMonth = extractYearMonth(referenceDate);
  const yearMonths = [];
  for (let offset = 0; offset < MONTHS_COVERING_WINDOW; offset += 1) {
    yearMonths.push(shiftYearMonth(referenceYearMonth, -offset));
  }

  const [expensesByMonth, dismissedKeys] = await Promise.all([
    Promise.all(yearMonths.map((yearMonth) => expenseRepository.findByYearMonth(yearMonth))),
    recurrenceRepository.dismissedKeys(),
  ]);

  const categoryNames = new Map(
    (categories ?? []).map((category) => [category.id, category.name]),
  );
  const detected = detector.detect(expensesByMonth.flat(), { referenceDate, categoryNames });
  return filterDismissedRecurrences(detected, dismissedKeys);
}
