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
}
