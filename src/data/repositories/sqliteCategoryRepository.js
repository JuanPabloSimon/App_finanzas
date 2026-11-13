import { Category } from '../../domain/models/category.js';
import { CategoryRepository } from '../../domain/repositories/categoryRepository.js';
import {
  InvalidCategory,
  DuplicateCategory,
  CategoryNotFound,
  PredefinedCategoryDeletionNotAllowed,
  CategoryInUse,
} from '../../core/errors.js';
import { formatIsoDateTime } from '../../core/dates.js';

function mapRowToCategory(row) {
  return new Category({
    id: Number(row.id),
    name: row.name,
    isPredefined: Boolean(row.is_predefined),
    createdAt: row.created_at,
  });
}

export class SqliteCategoryRepository extends CategoryRepository {
  constructor(db) {
    super();
    if (!db) {
      throw new Error('Se requiere una instancia de AppDatabase');
    }
    this.db = db;
  }

  async findAll() {
    const rows = await this.db.all(
      `SELECT c.id, c.name, c.is_predefined, c.created_at,
              COUNT(e.id) AS usage_count
         FROM categories c
         LEFT JOIN expenses e ON e.category_id = c.id
        GROUP BY c.id
        ORDER BY usage_count DESC, c.id ASC`,
    );
    return rows.map(mapRowToCategory);
  }

  async findById(id) {
    if (!Number.isInteger(id) || id <= 0) {
      return null;
    }
    const row = await this.db.get(
      'SELECT id, name, is_predefined, created_at FROM categories WHERE id = ?',
      [id],
    );
    return row ? mapRowToCategory(row) : null;
  }

  async findByName(name) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return null;
    }
    const row = await this.db.get(
      'SELECT id, name, is_predefined, created_at FROM categories WHERE name = ? COLLATE NOCASE',
      [name.trim()],
    );
    return row ? mapRowToCategory(row) : null;
  }

  async save(category) {
    const draft =
      category instanceof Category
        ? category
        : new Category({
            id: category?.id ?? null,
            name: typeof category === 'string' ? category : category?.name,
            isPredefined: Boolean(category?.isPredefined),
            createdAt: category?.createdAt,
          });

    const existing = await this.findByName(draft.name);
    if (existing) {
      throw new DuplicateCategory(draft.name);
    }

    const createdAt = draft.createdAt ?? formatIsoDateTime(new Date());
    const isPredefinedInt = draft.isPredefined ? 1 : 0;

    const result = await this.db.run(
      'INSERT INTO categories (name, is_predefined, created_at) VALUES (?, ?, ?)',
      [draft.name, isPredefinedInt, createdAt],
    );

    return new Category({
      id: Number(result.lastInsertRowid),
      name: draft.name,
      isPredefined: draft.isPredefined,
      createdAt,
    });
  }

  async countExpenses(categoryId) {
    const numericId = Number(categoryId);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return 0;
    }
    const row = await this.db.get(
      'SELECT COUNT(*) AS count FROM expenses WHERE category_id = ?',
      [numericId],
    );
    return Number(row?.count ?? 0);
  }

  async deleteById(id, options = {}) {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      throw new CategoryNotFound(id);
    }

    const target = await this.findById(numericId);
    if (!target) {
      throw new CategoryNotFound(numericId);
    }

    if (target.isPredefined) {
      throw new PredefinedCategoryDeletionNotAllowed(target.name);
    }

    const expenseCount = await this.countExpenses(numericId);
    if (expenseCount > 0) {
      const reassignToCategoryId = options?.reassignToCategoryId;
      if (reassignToCategoryId === undefined || reassignToCategoryId === null) {
        throw new CategoryInUse(numericId, expenseCount);
      }

      const targetReassignId = Number(reassignToCategoryId);
      if (
        !Number.isInteger(targetReassignId) ||
        targetReassignId <= 0 ||
        targetReassignId === numericId
      ) {
        throw new InvalidCategory(
          'Seleccioná una categoría de destino válida y distinta a la que vas a eliminar',
        );
      }

      const destination = await this.findById(targetReassignId);
      if (!destination) {
        throw new CategoryNotFound(targetReassignId);
      }

      const updatedAt = formatIsoDateTime(new Date());
      await this.db.run(
        'UPDATE expenses SET category_id = ?, updated_at = ? WHERE category_id = ?',
        [targetReassignId, updatedAt, numericId],
      );
    }

    await this.db.run('DELETE FROM categories WHERE id = ?', [numericId]);
    return true;
  }
}
