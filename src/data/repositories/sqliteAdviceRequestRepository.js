import { InvalidAdviceRequest } from '../../core/errors.js';
import { ADVICE_SOURCES, AdviceRequest } from '../../domain/models/adviceRequest.js';
import { AdviceRequestRepository } from '../../domain/repositories/adviceRequestRepository.js';

export class SqliteAdviceRequestRepository extends AdviceRequestRepository {
  constructor(db) {
    super();
    if (!db) {
      throw new Error('Se requiere una instancia de AppDatabase');
    }
    this.db = db;
  }

  async countByDate(date, source = 'model') {
    if (!ADVICE_SOURCES.includes(source)) {
      throw new InvalidAdviceRequest('El origen de la consulta debe ser model o fallback');
    }
    const row = await this.db.get(
      'SELECT COUNT(*) AS total FROM advice_requests WHERE substr(created_at, 1, 10) = ? AND source = ?',
      [date, source],
    );
    return Number(row?.total ?? 0);
  }

  async countByYearMonth(yearMonth, source = 'model') {
    if (!ADVICE_SOURCES.includes(source)) {
      throw new InvalidAdviceRequest('El origen de la consulta debe ser model o fallback');
    }
    const row = await this.db.get(
      'SELECT COUNT(*) AS total FROM advice_requests WHERE year_month = ? AND source = ?',
      [yearMonth, source],
    );
    return Number(row?.total ?? 0);
  }

  async save(adviceRequest) {
    if (!(adviceRequest instanceof AdviceRequest)) {
      throw new InvalidAdviceRequest('Se esperaba un AdviceRequest');
    }
    const result = await this.db.run(
      'INSERT INTO advice_requests (year_month, source, created_at) VALUES (?, ?, ?)',
      [adviceRequest.yearMonth, adviceRequest.source, adviceRequest.createdAt],
    );
    return adviceRequest.copyWith({ id: result.lastInsertRowid });
  }

  async saveDailyAdviceSnapshot(snapshot) {
    if (!snapshot || typeof snapshot.date !== 'string') {
      return null;
    }
    const record = Object.freeze({
      date: snapshot.date,
      yearMonth: snapshot.yearMonth ?? snapshot.date.slice(0, 7),
      suggestions: Object.freeze(Array.isArray(snapshot.suggestions) ? [...snapshot.suggestions] : []),
      source: snapshot.source ?? 'fallback',
      reason: snapshot.reason ?? null,
    });
    this.db._lastDailyAdviceSnapshot = record;
    return record;
  }

  async findDailyAdviceSnapshot(date, yearMonth = undefined) {
    const saved = this.db._lastDailyAdviceSnapshot ?? null;
    if (!saved || saved.date !== date) {
      return null;
    }
    if (yearMonth !== undefined && saved.yearMonth !== yearMonth) {
      return null;
    }
    return saved;
  }
}
