import { InvalidAmount } from './errors.js';

const AMOUNT_INPUT_REGEX = /^(\d+)(?:[.,](\d{1,2}))?$/;

export function parseAmountToCents(rawInput) {
  if (rawInput === null || rawInput === undefined) {
    throw new InvalidAmount();
  }

  let normalized;
  if (typeof rawInput === 'number') {
    if (!Number.isFinite(rawInput) || rawInput <= 0) {
      throw new InvalidAmount();
    }
    normalized = String(rawInput);
  } else if (typeof rawInput === 'string') {
    normalized = rawInput.trim();
  } else {
    throw new InvalidAmount();
  }

  if (normalized.length === 0) {
    throw new InvalidAmount();
  }

  const match = AMOUNT_INPUT_REGEX.exec(normalized);
  if (!match) {
    throw new InvalidAmount();
  }

  const wholePesos = Number.parseInt(match[1], 10);
  const decimalStr = (match[2] ?? '').padEnd(2, '0');
  const centDigits = Number.parseInt(decimalStr, 10);
  const totalCents = wholePesos * 100 + centDigits;

  if (!Number.isSafeInteger(totalCents) || totalCents <= 0) {
    throw new InvalidAmount();
  }

  return totalCents;
}

export function formatCentsToArs(amountCents) {
  if (!Number.isInteger(amountCents) || amountCents < 0) {
    throw new InvalidAmount('El importe en centavos debe ser un entero no negativo');
  }

  const wholePesos = Math.trunc(amountCents / 100);
  const cents = amountCents % 100;
  const formattedWhole = String(wholePesos).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  if (cents === 0) {
    return `$ ${formattedWhole}`;
  }
  return `$ ${formattedWhole},${String(cents).padStart(2, '0')}`;
}

export function formatCentsToInput(amountCents) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new InvalidAmount('El importe en centavos debe ser un entero positivo');
  }

  const wholePesos = Math.trunc(amountCents / 100);
  const cents = amountCents % 100;

  if (cents === 0) {
    return String(wholePesos);
  }
  return `${wholePesos},${String(cents).padStart(2, '0')}`;
}
