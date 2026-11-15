import { InvalidRecurrence } from '../../core/errors.js';

const RECURRENCE_KEY_REGEX = /^([1-9]\d*)\|([1-9]\d*)$/;

export function buildRecurrenceKey(categoryId, typicalAmountCents) {
  return `${categoryId}|${typicalAmountCents}`;
}

export function parseRecurrenceKey(key) {
  if (typeof key !== 'string') {
    return null;
  }
  const match = RECURRENCE_KEY_REGEX.exec(key);
  if (!match) {
    return null;
  }
  const categoryId = Number(match[1]);
  const typicalAmountCents = Number(match[2]);
  if (!Number.isSafeInteger(categoryId) || !Number.isSafeInteger(typicalAmountCents)) {
    return null;
  }
  return Object.freeze({ categoryId, typicalAmountCents });
}

function isPositiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

export class Recurrence {
  constructor({ categoryId, categoryName, typicalAmountCents, occurrences, expenseIds }) {
    if (!isPositiveInteger(categoryId)) {
      throw new InvalidRecurrence('La categoría de la recurrencia debe ser un entero positivo');
    }
    if (!isPositiveInteger(typicalAmountCents)) {
      throw new InvalidRecurrence(
        'El monto típico de la recurrencia debe ser un entero positivo en centavos',
      );
    }
    if (!Array.isArray(expenseIds)) {
      throw new InvalidRecurrence('La recurrencia debe listar los gastos que la componen');
    }
    if (!isPositiveInteger(occurrences) || occurrences !== expenseIds.length) {
      throw new InvalidRecurrence(
        'La cantidad de repeticiones debe coincidir con los gastos de la recurrencia',
      );
    }
    const cleanName = typeof categoryName === 'string' ? categoryName.trim() : '';

    this.categoryId = categoryId;
    this.categoryName = cleanName || `Categoría ${categoryId}`;
    this.typicalAmountCents = typicalAmountCents;
    this.occurrences = occurrences;
    this.expenseIds = Object.freeze([...expenseIds]);
    Object.freeze(this);
  }

  get key() {
    return buildRecurrenceKey(this.categoryId, this.typicalAmountCents);
  }

  isEqual(other) {
    if (!(other instanceof Recurrence)) {
      return false;
    }
    return (
      this.categoryId === other.categoryId &&
      this.typicalAmountCents === other.typicalAmountCents &&
      this.occurrences === other.occurrences &&
      this.expenseIds.length === other.expenseIds.length &&
      this.expenseIds.every((id, idx) => id === other.expenseIds[idx])
    );
  }
}
