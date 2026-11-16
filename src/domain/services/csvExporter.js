import { InvalidAmount, InvalidExpenseDate } from '../../core/errors.js';
import { isValidIsoDate } from '../../core/dates.js';

export const CSV_BOM = '\uFEFF';
export const CSV_SEPARATOR = ';';
export const CSV_LINE_BREAK = '\r\n';
export const CSV_HEADERS = Object.freeze([
  'Fecha',
  'Monto (ARS)',
  'Categoría',
  'Subcategoría',
  'Nota',
]);
export const CSV_FORMULA_PREFIXES = Object.freeze(['=', '+', '-', '@', '\t', '\r']);

const FIELD_NEEDS_QUOTES_REGEX = /[;"\r\n]/;

function assertPositiveSafeCents(amountCents) {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    throw new InvalidAmount('El importe en centavos debe ser un entero positivo');
  }
}

export function formatCentsForCsv(amountCents) {
  assertPositiveSafeCents(amountCents);
  const wholePesos = Math.trunc(amountCents / 100);
  const cents = amountCents % 100;
  return `${wholePesos},${String(cents).padStart(2, '0')}`;
}

function toText(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

export function neutralizeFormula(text) {
  const value = toText(text);
  if (value.length === 0) {
    return '';
  }
  return CSV_FORMULA_PREFIXES.includes(value[0]) ? `'${value}` : value;
}

export function escapeCsvField(value) {
  const text = toText(value);
  if (!FIELD_NEEDS_QUOTES_REGEX.test(text)) {
    return text;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildExportFileName(isoDate) {
  if (!isValidIsoDate(isoDate)) {
    throw new InvalidExpenseDate('La fecha de exportación debe tener formato AAAA-MM-DD');
  }
  return `gestix_gastos_${isoDate}.csv`;
}

function compareRows(a, b) {
  if (a.date !== b.date) {
    return a.date < b.date ? -1 : 1;
  }
  return (a.id ?? 0) - (b.id ?? 0);
}

function buildLine(fields) {
  return `${fields.map(escapeCsvField).join(CSV_SEPARATOR)}${CSV_LINE_BREAK}`;
}

function buildDataLine(row) {
  return buildLine([
    row.date,
    formatCentsForCsv(row.amountCents),
    neutralizeFormula(row.categoryName),
    neutralizeFormula(row.subcategory),
    neutralizeFormula(row.note),
  ]);
}

export class CsvExporter {
  export(rows) {
    const source = Array.isArray(rows) ? rows : [];
    let totalCents = 0;
    for (const row of source) {
      assertPositiveSafeCents(row?.amountCents);
      if (!isValidIsoDate(row?.date)) {
        throw new InvalidExpenseDate('La fecha del gasto debe tener formato AAAA-MM-DD');
      }
      totalCents += row.amountCents;
      if (!Number.isSafeInteger(totalCents)) {
        throw new InvalidAmount('El total exportado supera el máximo representable');
      }
    }

    const sorted = [...source].sort(compareRows);
    const content =
      CSV_BOM + buildLine(CSV_HEADERS) + sorted.map(buildDataLine).join('');

    return Object.freeze({ content, rowCount: sorted.length, totalCents });
  }
}
