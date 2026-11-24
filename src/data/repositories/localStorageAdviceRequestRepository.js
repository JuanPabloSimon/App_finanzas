import { InvalidAdviceRequest } from '../../core/errors.js';
import { ADVICE_SOURCES, AdviceRequest } from '../../domain/models/adviceRequest.js';
import { AdviceRequestRepository } from '../../domain/repositories/adviceRequestRepository.js';

export const ADVICE_REQUESTS_STORAGE_KEY = 'fp_advice_requests';
export const DAILY_ADVICE_SNAPSHOT_STORAGE_KEY = 'fp_last_daily_advice';

export class LocalStorageAdviceRequestRepository extends AdviceRequestRepository {
  constructor(storage) {
    super();
    if (
      !storage ||
      typeof storage.getItem !== 'function' ||
      typeof storage.setItem !== 'function'
    ) {
      throw new Error('Se requiere un almacenamiento con getItem y setItem');
    }
    this.storage = storage;
  }

  readEntries() {
    try {
      const raw = this.storage.getItem(ADVICE_REQUESTS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter(
        (entry) =>
          entry &&
          typeof entry.yearMonth === 'string' &&
          ADVICE_SOURCES.includes(entry.source),
      );
    } catch {
      return [];
    }
  }

  async countByDate(date, source = 'model') {
    if (!ADVICE_SOURCES.includes(source)) {
      throw new InvalidAdviceRequest('El origen de la consulta debe ser model o fallback');
    }
    return this.readEntries().filter(
      (entry) =>
        typeof entry.createdAt === 'string' &&
        entry.createdAt.slice(0, 10) === date &&
        entry.source === source,
    ).length;
  }

  async countByYearMonth(yearMonth, source = 'model') {
    if (!ADVICE_SOURCES.includes(source)) {
      throw new InvalidAdviceRequest('El origen de la consulta debe ser model o fallback');
    }
    return this.readEntries().filter(
      (entry) => entry.yearMonth === yearMonth && entry.source === source,
    ).length;
  }

  async save(adviceRequest) {
    if (!(adviceRequest instanceof AdviceRequest)) {
      throw new InvalidAdviceRequest('Se esperaba un AdviceRequest');
    }
    const entries = this.readEntries();
    const nextId =
      entries.reduce(
        (max, entry) => (Number.isSafeInteger(entry.id) && entry.id > max ? entry.id : max),
        0,
      ) + 1;
    const saved = adviceRequest.copyWith({ id: nextId });
    entries.push({
      id: saved.id,
      yearMonth: saved.yearMonth,
      source: saved.source,
      createdAt: saved.createdAt,
    });
    // Un error de escritura (cuota) se propaga para que AdviceService no invoque sin registro.
    this.storage.setItem(ADVICE_REQUESTS_STORAGE_KEY, JSON.stringify(entries));
    return saved;
  }

  async saveDailyAdviceSnapshot(snapshot) {
    if (!snapshot || typeof snapshot.date !== 'string') {
      return null;
    }
    const record = {
      date: snapshot.date,
      yearMonth: snapshot.yearMonth ?? snapshot.date.slice(0, 7),
      suggestions: Array.isArray(snapshot.suggestions) ? snapshot.suggestions : [],
      source: snapshot.source ?? 'fallback',
      reason: snapshot.reason ?? null,
    };
    try {
      this.storage.setItem(DAILY_ADVICE_SNAPSHOT_STORAGE_KEY, JSON.stringify(record));
    } catch {
      // Si el almacenamiento está lleno se conserva el estado en memoria.
    }
    return Object.freeze(record);
  }

  async findDailyAdviceSnapshot(date, yearMonth = undefined) {
    try {
      const raw = this.storage.getItem(DAILY_ADVICE_SNAPSHOT_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.date !== date) {
        return null;
      }
      if (yearMonth !== undefined && parsed.yearMonth !== yearMonth) {
        return null;
      }
      return Object.freeze({
        date: parsed.date,
        yearMonth: parsed.yearMonth,
        suggestions: Object.freeze(Array.isArray(parsed.suggestions) ? parsed.suggestions : []),
        source: parsed.source ?? 'fallback',
        reason: parsed.reason ?? null,
      });
    } catch {
      return null;
    }
  }
}
