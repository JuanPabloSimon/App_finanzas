import { formatIsoDate } from '../../core/dates.js';
import { formatCentsToArs } from '../../core/formatters.js';
import {
  CsvExporter,
  buildExportFileName,
} from '../../domain/services/csvExporter.js';

export const EXPORT_EMPTY_MESSAGE = 'Todavía no hay gastos para exportar.';
export const EXPORT_ERROR_MESSAGE = 'No se pudo exportar el historial. Probá de nuevo.';
export const EXPORT_PRIVACY_NOTICE =
  'El archivo incluye tus notas y subcategorías y no está protegido. Guardalo en un lugar seguro.';

export function buildExportSuccessMessage(rowCount, totalCents) {
  const total = formatCentsToArs(totalCents);
  if (rowCount === 1) {
    return `Se exportó 1 gasto por un total de ${total}.`;
  }
  return `Se exportaron ${rowCount} gastos por un total de ${total}.`;
}

function buildExportState({
  status,
  rowCount = 0,
  totalCents = 0,
  fileName = null,
  message = null,
}) {
  return Object.freeze({ status, rowCount, totalCents, fileName, message });
}

export function buildIdleExportState() {
  return buildExportState({ status: 'idle' });
}

export async function loadExpensesForExport({ expenseRepository, categoryRepository }) {
  const [expenses, categories] = await Promise.all([
    expenseRepository.findAll(),
    categoryRepository ? categoryRepository.findAll() : [],
  ]);
  const categoryNames = new Map(
    (categories ?? []).map((category) => [category.id, category.name]),
  );
  return expenses.map((expense) => ({
    id: expense.id,
    date: expense.date,
    amountCents: expense.amountCents,
    categoryName: expense.categoryName ?? categoryNames.get(expense.categoryId) ?? '',
    subcategory: expense.subcategory ?? null,
    note: expense.note ?? null,
  }));
}

export async function exportHistory({
  expenseRepository,
  categoryRepository,
  today,
  delivery,
  mode = 'download',
}) {
  try {
    const rows = await loadExpensesForExport({ expenseRepository, categoryRepository });
    if (rows.length === 0) {
      return buildExportState({ status: 'empty', message: EXPORT_EMPTY_MESSAGE });
    }
    const { content, rowCount, totalCents } = new CsvExporter().export(rows);
    const fileName = buildExportFileName(formatIsoDate(today()));

    if (mode === 'share') {
      const outcome = await delivery.share({ fileName, content });
      if (outcome === 'cancelled') {
        return buildExportState({ status: 'cancelled', rowCount, totalCents, fileName });
      }
    } else {
      await delivery.download({ fileName, content });
    }

    return buildExportState({
      status: 'done',
      rowCount,
      totalCents,
      fileName,
      message: buildExportSuccessMessage(rowCount, totalCents),
    });
  } catch {
    return buildExportState({ status: 'error', message: EXPORT_ERROR_MESSAGE });
  }
}
