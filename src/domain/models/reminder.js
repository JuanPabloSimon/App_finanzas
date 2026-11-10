import { InvalidReminder, InvalidExpenseDate, InvalidAmount } from '../../core/errors.js';
import { isValidIsoDate, isValidIsoDateTime } from '../../core/dates.js';

export class Reminder {
  constructor({
    id = null,
    title,
    dueDate,
    amountCents = null,
    isCompleted = false,
    createdAt = null,
  }) {
    if (id !== null && (!Number.isInteger(id) || id <= 0)) {
      throw new InvalidReminder('El id del recordatorio debe ser nulo o entero positivo');
    }
    const cleanTitle = typeof title === 'string' ? title.trim() : '';
    if (!cleanTitle) {
      throw new InvalidReminder('Ingresá una descripción para el recordatorio');
    }
    if (!isValidIsoDate(dueDate)) {
      throw new InvalidExpenseDate('Ingresá una fecha de vencimiento válida (AAAA-MM-DD)');
    }
    if (amountCents !== null && amountCents !== undefined) {
      if (!Number.isInteger(amountCents) || amountCents <= 0) {
        throw new InvalidAmount('El monto del recordatorio debe ser mayor que cero');
      }
    }
    if (createdAt !== null && createdAt !== undefined && !isValidIsoDateTime(createdAt)) {
      throw new InvalidExpenseDate(
        'La marca created_at debe estar en formato ISO 8601 (YYYY-MM-DDTHH:MM:SS)',
      );
    }

    this.id = id;
    this.title = cleanTitle;
    this.dueDate = dueDate;
    this.amountCents = amountCents ?? null;
    this.isCompleted = Boolean(isCompleted);
    this.createdAt = createdAt ?? null;
    Object.freeze(this);
  }
}
