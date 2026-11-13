import { InvalidCategory } from '../../core/errors.js';
import { isValidIsoDateTime } from '../../core/dates.js';

export class Category {
  constructor({ id = null, name, isPredefined = false, createdAt } = {}) {
    if (id !== null && id !== undefined && (!Number.isInteger(id) || id <= 0)) {
      throw new InvalidCategory('El id de la categoría debe ser un entero positivo');
    }
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new InvalidCategory('El nombre de la categoría no puede estar vacío');
    }
    if (
      createdAt !== undefined &&
      createdAt !== null &&
      !isValidIsoDateTime(createdAt)
    ) {
      throw new InvalidCategory(
        'La fecha de creación de la categoría debe estar en formato ISO 8601 (YYYY-MM-DDTHH:MM:SS)',
      );
    }

    this.id = id ?? null;
    this.name = name.trim();
    this.isPredefined = Boolean(isPredefined);
    this.createdAt = createdAt ?? null;
    Object.freeze(this);
  }

  copyWith(patch = {}) {
    return new Category({
      id: patch.id !== undefined ? patch.id : this.id,
      name: patch.name !== undefined ? patch.name : this.name,
      isPredefined:
        patch.isPredefined !== undefined ? patch.isPredefined : this.isPredefined,
      createdAt: patch.createdAt !== undefined ? patch.createdAt : this.createdAt,
    });
  }

  isEqual(other) {
    if (!(other instanceof Category)) {
      return false;
    }
    return (
      this.id === other.id &&
      this.name === other.name &&
      this.isPredefined === other.isPredefined &&
      this.createdAt === other.createdAt
    );
  }
}
