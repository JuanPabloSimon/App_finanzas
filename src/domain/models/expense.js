import {
  InvalidAmount,
  InvalidExpenseDate,
  InvalidCategory,
} from '../../core/errors.js';
import { isValidIsoDate, isValidIsoDateTime } from '../../core/dates.js';

function normalizeOptionalText(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export class Expense {
  constructor({
    id = null,
    amountCents,
    date,
    categoryId,
    categoryName = null,
    subcategory = null,
    note = null,
    createdAt,
    updatedAt,
  }) {
    if (id !== null && (!Number.isInteger(id) || id <= 0)) {
      throw new InvalidAmount('El id del gasto debe ser nulo o un entero positivo');
    }
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw new InvalidAmount('Ingresá un monto mayor que cero');
    }
    if (!isValidIsoDate(date)) {
      throw new InvalidExpenseDate('Ingresá una fecha válida (AAAA-MM-DD)');
    }
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      throw new InvalidCategory('Seleccioná una categoría válida');
    }
    if (createdAt !== undefined && createdAt !== null && !isValidIsoDateTime(createdAt)) {
      throw new InvalidExpenseDate(
        'La marca created_at debe estar en formato ISO 8601 (YYYY-MM-DDTHH:MM:SS)',
      );
    }
    if (updatedAt !== undefined && updatedAt !== null && !isValidIsoDateTime(updatedAt)) {
      throw new InvalidExpenseDate(
        'La marca updated_at debe estar en formato ISO 8601 (YYYY-MM-DDTHH:MM:SS)',
      );
    }

    this.id = id;
    this.amountCents = amountCents;
    this.date = date;
    this.categoryId = categoryId;
    this.categoryName = normalizeOptionalText(categoryName);
    this.subcategory = normalizeOptionalText(subcategory);
    this.note = normalizeOptionalText(note);
    this.createdAt = createdAt ?? null;
    this.updatedAt = updatedAt ?? this.createdAt;
    Object.freeze(this);
  }

  copyWith(patch = {}) {
    return new Expense({
      id: patch.id !== undefined ? patch.id : this.id,
      amountCents: patch.amountCents !== undefined ? patch.amountCents : this.amountCents,
      date: patch.date !== undefined ? patch.date : this.date,
      categoryId: patch.categoryId !== undefined ? patch.categoryId : this.categoryId,
      categoryName:
        patch.categoryName !== undefined ? patch.categoryName : this.categoryName,
      subcategory:
        patch.subcategory !== undefined ? patch.subcategory : this.subcategory,
      note: patch.note !== undefined ? patch.note : this.note,
      createdAt: patch.createdAt !== undefined ? patch.createdAt : this.createdAt,
      updatedAt: patch.updatedAt !== undefined ? patch.updatedAt : this.updatedAt,
    });
  }

  isEqual(other) {
    if (!(other instanceof Expense)) {
      return false;
    }
    return (
      this.id === other.id &&
      this.amountCents === other.amountCents &&
      this.date === other.date &&
      this.categoryId === other.categoryId &&
      this.categoryName === other.categoryName &&
      this.subcategory === other.subcategory &&
      this.note === other.note &&
      this.createdAt === other.createdAt &&
      this.updatedAt === other.updatedAt
    );
  }
}
