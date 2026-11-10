import {
  InvalidAmount,
  InvalidExpenseDate,
  InvalidInvestment,
} from '../../core/errors.js';
import { isValidIsoDate, isValidIsoDateTime } from '../../core/dates.js';

function normalizeOptionalText(value) {
  if (value === null || value === undefined || typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export class Investment {
  constructor({
    id = null,
    assetName,
    platform,
    amountCents,
    date,
    dueDate = null,
    note = null,
    createdAt = null,
  }) {
    if (id !== null && (!Number.isInteger(id) || id <= 0)) {
      throw new InvalidInvestment('El id de la inversión debe ser nulo o un entero positivo');
    }
    const cleanAsset = normalizeOptionalText(assetName);
    if (!cleanAsset) {
      throw new InvalidInvestment('Indicá el activo de la inversión (ej. Plazo Fijo, FCI, CEDEAR)');
    }
    const cleanPlatform = normalizeOptionalText(platform);
    if (!cleanPlatform) {
      throw new InvalidInvestment('Indicá la plataforma o entidad donde registraste la inversión');
    }
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw new InvalidAmount('Ingresá un monto de inversión mayor que cero');
    }
    if (!isValidIsoDate(date)) {
      throw new InvalidExpenseDate('Ingresá una fecha de alta válida (AAAA-MM-DD)');
    }
    const cleanDueDate = normalizeOptionalText(dueDate);
    if (cleanDueDate !== null && !isValidIsoDate(cleanDueDate)) {
      throw new InvalidExpenseDate('Ingresá una fecha de vencimiento válida (AAAA-MM-DD)');
    }
    if (createdAt !== null && createdAt !== undefined && !isValidIsoDateTime(createdAt)) {
      throw new InvalidExpenseDate(
        'La marca created_at debe estar en formato ISO 8601 (YYYY-MM-DDTHH:MM:SS)',
      );
    }

    this.id = id;
    this.assetName = cleanAsset;
    this.platform = cleanPlatform;
    this.amountCents = amountCents;
    this.date = date;
    this.dueDate = cleanDueDate;
    this.note = normalizeOptionalText(note);
    this.createdAt = createdAt ?? null;
    Object.freeze(this);
  }
}
