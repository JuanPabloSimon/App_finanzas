import { InvalidAdviceRequest } from '../../core/errors.js';
import { isValidIsoDateTime, isValidYearMonth } from '../../core/dates.js';

export const ADVICE_SOURCES = Object.freeze(['model', 'fallback']);

export const MONTHLY_MODEL_REQUEST_LIMIT = 4;

export class AdviceRequest {
  constructor({ id = null, yearMonth, source, createdAt } = {}) {
    if (id !== null && id !== undefined && (!Number.isSafeInteger(id) || id <= 0)) {
      throw new InvalidAdviceRequest('El id de la consulta debe ser nulo o un entero positivo');
    }
    if (!isValidYearMonth(yearMonth)) {
      throw new InvalidAdviceRequest('El mes de la consulta debe tener formato AAAA-MM');
    }
    if (!ADVICE_SOURCES.includes(source)) {
      throw new InvalidAdviceRequest('El origen de la consulta debe ser model o fallback');
    }
    if (!isValidIsoDateTime(createdAt)) {
      throw new InvalidAdviceRequest(
        'La fecha de la consulta debe tener formato ISO 8601 (YYYY-MM-DDTHH:MM:SS)',
      );
    }

    this.id = id ?? null;
    this.yearMonth = yearMonth;
    this.source = source;
    this.createdAt = createdAt;
    Object.freeze(this);
  }

  copyWith(changes = {}) {
    return new AdviceRequest({
      id: changes.id !== undefined ? changes.id : this.id,
      yearMonth: changes.yearMonth !== undefined ? changes.yearMonth : this.yearMonth,
      source: changes.source !== undefined ? changes.source : this.source,
      createdAt: changes.createdAt !== undefined ? changes.createdAt : this.createdAt,
    });
  }

  isEqual(other) {
    return (
      other instanceof AdviceRequest &&
      this.id === other.id &&
      this.yearMonth === other.yearMonth &&
      this.source === other.source &&
      this.createdAt === other.createdAt
    );
  }
}
