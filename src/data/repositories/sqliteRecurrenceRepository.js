import { formatIsoDateTime } from '../../core/dates.js';
import { InvalidRecurrence } from '../../core/errors.js';
import { parseRecurrenceKey } from '../../domain/models/recurrence.js';
import { RecurrenceRepository } from '../../domain/repositories/recurrenceRepository.js';

export class SqliteRecurrenceRepository extends RecurrenceRepository {
  constructor(db) {
    super();
    if (!db) {
      throw new Error('Se requiere una instancia de AppDatabase');
    }
    this.db = db;
  }

  async dismissedKeys() {
    const rows = await this.db.all('SELECT recurrence_key FROM dismissed_recurrences');
    return new Set(rows.map((row) => row.recurrence_key));
  }

  async dismiss(recurrenceKey, dismissedAt = formatIsoDateTime(new Date())) {
    if (parseRecurrenceKey(recurrenceKey) === null) {
      throw new InvalidRecurrence('La clave de la recurrencia no es válida');
    }
    await this.db.run(
      'INSERT OR IGNORE INTO dismissed_recurrences (recurrence_key, dismissed_at) VALUES (?, ?)',
      [recurrenceKey, formatIsoDateTime(dismissedAt)],
    );
  }
}
