import { InvalidExpenseDate } from './errors.js';

const ISO_DATE_REGEX = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const YEAR_MONTH_REGEX = /^(\d{4})-(0[1-9]|1[0-2])$/;

const MONTH_NAMES_ES = Object.freeze([
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]);

const ISO_DATE_TIME_REGEX =
  /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;

function pad2(num) {
  return String(num).padStart(2, '0');
}

function isValidCalendarDay(year, month, day) {
  const dateObj = new Date(Date.UTC(year, month - 1, day));
  return (
    dateObj.getUTCFullYear() === year &&
    dateObj.getUTCMonth() === month - 1 &&
    dateObj.getUTCDate() === day
  );
}

export function isValidIsoDate(value) {
  if (typeof value !== 'string') {
    return false;
  }
  const match = ISO_DATE_REGEX.exec(value);
  if (!match) {
    return false;
  }
  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  return isValidCalendarDay(year, month, day);
}

export function formatIsoDate(date = new Date()) {
  if (typeof date === 'string' && isValidIsoDate(date)) {
    return date;
  }
  const instance = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(instance.getTime())) {
    throw new TypeError('Fecha inválida para formatear en ISO 8601 (YYYY-MM-DD)');
  }
  const year = instance.getFullYear();
  const month = pad2(instance.getMonth() + 1);
  const day = pad2(instance.getDate());
  return `${year}-${month}-${day}`;
}

export function extractYearMonth(isoDate) {
  if (typeof isoDate !== 'string' || !isValidIsoDate(isoDate)) {
    throw new TypeError('Fecha inválida para extraer año-mes (YYYY-MM)');
  }
  return isoDate.slice(0, 7);
}

export function isValidYearMonth(value) {
  if (typeof value !== 'string') {
    return false;
  }
  return YEAR_MONTH_REGEX.test(value);
}

export function shiftYearMonth(yearMonth, deltaMonths) {
  if (!isValidYearMonth(yearMonth) || !Number.isInteger(deltaMonths)) {
    throw new InvalidExpenseDate('Período mensual inválido (AAAA-MM)');
  }
  const match = YEAR_MONTH_REGEX.exec(yearMonth);
  const year = Number.parseInt(match[1], 10);
  const monthIndex = Number.parseInt(match[2], 10) - 1;
  const totalMonths = year * 12 + monthIndex + deltaMonths;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12 + 1;
  if (targetYear < 1000 || targetYear > 9999) {
    throw new InvalidExpenseDate('Período mensual fuera de rango (AAAA-MM)');
  }
  return `${String(targetYear).padStart(4, '0')}-${pad2(targetMonth)}`;
}

export function formatYearMonthLabel(yearMonth) {
  if (!isValidYearMonth(yearMonth)) {
    throw new InvalidExpenseDate('Período mensual inválido (AAAA-MM)');
  }
  const match = YEAR_MONTH_REGEX.exec(yearMonth);
  const year = Number.parseInt(match[1], 10);
  const monthIndex = Number.parseInt(match[2], 10) - 1;
  return `${MONTH_NAMES_ES[monthIndex]} ${year} (${yearMonth})`;
}

export function isValidIsoDateTime(value) {
  if (typeof value !== 'string') {
    return false;
  }
  const match = ISO_DATE_TIME_REGEX.exec(value);
  if (!match) {
    return false;
  }
  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  return isValidCalendarDay(year, month, day);
}

export function formatIsoDateTime(date = new Date()) {
  if (typeof date === 'string' && isValidIsoDateTime(date)) {
    return date;
  }
  const instance = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(instance.getTime())) {
    throw new TypeError('Fecha inválida para formatear en ISO 8601');
  }
  const year = instance.getFullYear();
  const month = pad2(instance.getMonth() + 1);
  const day = pad2(instance.getDate());
  const hours = pad2(instance.getHours());
  const minutes = pad2(instance.getMinutes());
  const seconds = pad2(instance.getSeconds());
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}
