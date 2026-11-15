import { formatIsoDateTime } from '../../core/dates.js';
import { InvalidRecurrence } from '../../core/errors.js';
import { parseRecurrenceKey } from '../../domain/models/recurrence.js';
import { RecurrenceRepository } from '../../domain/repositories/recurrenceRepository.js';

export const DISMISSED_RECURRENCES_STORAGE_KEY = 'fp_dismissed_recurrences';

export class LocalStorageRecurrenceRepository extends RecurrenceRepository {
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
      const raw = this.storage.getItem(DISMISSED_RECURRENCES_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter((entry) => typeof entry?.recurrenceKey === 'string');
    } catch {
      return [];
    }
  }

  async dismissedKeys() {
    return new Set(this.readEntries().map((entry) => entry.recurrenceKey));
  }

  async dismiss(recurrenceKey, dismissedAt = formatIsoDateTime(new Date())) {
    if (parseRecurrenceKey(recurrenceKey) === null) {
      throw new InvalidRecurrence('La clave de la recurrencia no es válida');
    }
    const entries = this.readEntries();
    if (entries.some((entry) => entry.recurrenceKey === recurrenceKey)) {
      return;
    }
    entries.push({ recurrenceKey, dismissedAt: formatIsoDateTime(dismissedAt) });
    try {
      this.storage.setItem(DISMISSED_RECURRENCES_STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // Sin cuota de localStorage (modo privado) se ignora la escritura, igual que App.jsx.
    }
  }
}
