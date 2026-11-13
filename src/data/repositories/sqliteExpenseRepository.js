import { Expense } from '../../domain/models/expense.js';
import { ExpenseRepository } from '../../domain/repositories/expenseRepository.js';
import {
  InvalidCategory,
  CategoryNotFound,
  ExpenseNotFound,
} from '../../core/errors.js';
import { formatIsoDateTime } from '../../core/dates.js';

function mapRowToExpense(row) {
  return new Expense({
    id: Number(row.id),
    amountCents: Number(row.amount_cents),
    date: row.date,
    categoryId: Number(row.category_id),
    categoryName: row.category_name ?? null,
    subcategory: row.subcategory ?? null,
    note: row.note ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export class SqliteExpenseRepository extends ExpenseRepository {
  constructor(db) {
    super();
    if (!db) {
      throw new Error('Se requiere una instancia de AppDatabase');
    }
    this.db = db;
  }

  async save(expense) {
    const record = expense instanceof Expense ? expense : new Expense(expense);

    const categoryRow = await this.db.get(
      'SELECT id, name FROM categories WHERE id = ?',
      [record.categoryId],
    );
    if (!categoryRow) {
      throw new InvalidCategory('Seleccioná una categoría válida');
    }

    const nowIso = formatIsoDateTime(new Date());
    const createdAt = record.createdAt ?? nowIso;
    const updatedAt = record.updatedAt ?? createdAt;

    const result = await this.db.run(
      `INSERT INTO expenses (
         amount_cents,
         date,
         category_id,
         subcategory,
         note,
         created_at,
         updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        record.amountCents,
        record.date,
        record.categoryId,
        record.subcategory,
        record.note,
        createdAt,
        updatedAt,
      ],
    );

    return new Expense({
      id: result.lastInsertRowid,
      amountCents: record.amountCents,
      date: record.date,
      categoryId: record.categoryId,
      categoryName: categoryRow.name,
      subcategory: record.subcategory,
      note: record.note,
      createdAt,
      updatedAt,
    });
  }

  async findById(id) {
    if (!Number.isInteger(id) || id <= 0) {
      return null;
    }
    const row = await this.db.get(
      `SELECT e.id,
              e.amount_cents,
              e.date,
              e.category_id,
              c.name AS category_name,
              e.subcategory,
              e.note,
              e.created_at,
              e.updated_at
         FROM expenses e
         JOIN categories c ON c.id = e.category_id
        WHERE e.id = ?`,
      [id],
    );
    if (!row) {
      return null;
    }
    return mapRowToExpense(row);
  }

  async findByYearMonth(yearMonth) {
    if (typeof yearMonth !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)) {
      return [];
    }
    const rows = await this.db.all(
      `SELECT e.id,
              e.amount_cents,
              e.date,
              e.category_id,
              c.name AS category_name,
              e.subcategory,
              e.note,
              e.created_at,
              e.updated_at
         FROM expenses e
         JOIN categories c ON c.id = e.category_id
        WHERE substr(e.date, 1, 7) = ?
        ORDER BY e.date DESC, e.id DESC`,
      [yearMonth],
    );
    return rows.map(mapRowToExpense);
  }

  async update(expense) {
    if (!expense || !Number.isInteger(expense.id) || expense.id <= 0) {
      throw new ExpenseNotFound(expense?.id ?? null);
    }

    const record = expense instanceof Expense ? expense : new Expense(expense);

    const existingRow = await this.db.get(
      'SELECT id, created_at, updated_at FROM expenses WHERE id = ?',
      [record.id],
    );
    if (!existingRow) {
      throw new ExpenseNotFound(record.id);
    }

    const categoryRow = await this.db.get(
      'SELECT id, name FROM categories WHERE id = ?',
      [record.categoryId],
    );
    if (!categoryRow) {
      throw new InvalidCategory('Seleccioná una categoría válida');
    }

    const nowIso = formatIsoDateTime(new Date());
    const createdAt = existingRow.created_at;
    const updatedAt =
      record.updatedAt && record.updatedAt !== existingRow.updated_at
        ? record.updatedAt
        : nowIso;

    await this.db.run(
      `UPDATE expenses
          SET amount_cents = ?,
              date = ?,
              category_id = ?,
              subcategory = ?,
              note = ?,
              updated_at = ?
        WHERE id = ?`,
      [
        record.amountCents,
        record.date,
        record.categoryId,
        record.subcategory,
        record.note,
        updatedAt,
        record.id,
      ],
    );

    return new Expense({
      id: record.id,
      amountCents: record.amountCents,
      date: record.date,
      categoryId: record.categoryId,
      categoryName: categoryRow.name,
      subcategory: record.subcategory,
      note: record.note,
      createdAt,
      updatedAt,
    });
  }

  async deleteById(id) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new ExpenseNotFound(id);
    }

    const result = await this.db.run('DELETE FROM expenses WHERE id = ?', [id]);
    if (!result || result.changes === 0) {
      throw new ExpenseNotFound(id);
    }
    return true;
  }

  async countByCategoryId(categoryId) {
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

  async reassignCategory(fromCategoryId, toCategoryId) {
    const fromId = Number(fromCategoryId);
    const toId = Number(toCategoryId);
    if (!Number.isInteger(fromId) || fromId <= 0) {
      throw new CategoryNotFound(fromCategoryId);
    }
    if (!Number.isInteger(toId) || toId <= 0 || toId === fromId) {
      throw new InvalidCategory(
        'Seleccioná una categoría de destino válida y distinta',
      );
    }

    const fromRow = await this.db.get(
      'SELECT id FROM categories WHERE id = ?',
      [fromId],
    );
    if (!fromRow) {
      throw new CategoryNotFound(fromId);
    }

    const toRow = await this.db.get(
      'SELECT id FROM categories WHERE id = ?',
      [toId],
    );
    if (!toRow) {
      throw new CategoryNotFound(toId);
    }

    const nowIso = formatIsoDateTime(new Date());
    const result = await this.db.run(
      'UPDATE expenses SET category_id = ?, updated_at = ? WHERE category_id = ?',
      [toId, nowIso, fromId],
    );
    return Number(result?.changes ?? 0);
  }
}
