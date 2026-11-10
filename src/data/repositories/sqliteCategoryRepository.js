import { Category } from '../../domain/models/category.js';
import { CategoryRepository } from '../../domain/repositories/categoryRepository.js';

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
}
