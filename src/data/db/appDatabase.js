import { formatIsoDateTime } from '../../core/dates.js';

export const PREDEFINED_CATEGORIES = Object.freeze([
  'Alimentos',
  'Transporte',
  'Servicios',
  'Salud',
  'Ocio',
  'Delivery',
  'Suscripciones',
  'Ropa',
  'Educación',
  'Otros',
]);

const MIGRATION_V1_SQL = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    is_predefined INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    date TEXT NOT NULL,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    subcategory TEXT NULL,
    note TEXT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
  CREATE INDEX IF NOT EXISTS idx_expenses_category_date ON expenses(category_id, date);

  CREATE TABLE IF NOT EXISTS monthly_incomes (
    year_month TEXT PRIMARY KEY,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS consents (
    policy_version TEXT PRIMARY KEY,
    accepted_at TEXT NOT NULL
  );
`;

const MIGRATION_V2_SQL = `
  CREATE TABLE IF NOT EXISTS user_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS investments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_name TEXT NOT NULL,
    platform TEXT NOT NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    date TEXT NOT NULL,
    due_date TEXT NULL,
    note TEXT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    due_date TEXT NOT NULL,
    amount_cents INTEGER NULL,
    is_completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
`;

export class AppDatabase {
  constructor(driver) {
    this.driver = driver;
    this.closed = false;
  }

  static async openInMemory() {
    const moduleName = 'node:sqlite';
    const { DatabaseSync } = await import(/* @vite-ignore */ moduleName);
    const rawDb = new DatabaseSync(':memory:');
    const db = new AppDatabase(rawDb);
    await db.migrate();
    return db;
  }

  async migrate() {
    await this.exec('PRAGMA foreign_keys = ON;');
    const versionRow = await this.get('PRAGMA user_version;');
    const currentVersion = versionRow ? Number(versionRow.user_version ?? 0) : 0;

    if (currentVersion < 1) {
      await this.exec(MIGRATION_V1_SQL);
      const nowIso = formatIsoDateTime(new Date());
      for (const name of PREDEFINED_CATEGORIES) {
        await this.run(
          'INSERT OR IGNORE INTO categories (name, is_predefined, created_at) VALUES (?, 1, ?)',
          [name, nowIso],
        );
      }
      await this.exec('PRAGMA user_version = 1;');
    }

    if (currentVersion < 2) {
      await this.exec(MIGRATION_V2_SQL);
      await this.exec('PRAGMA user_version = 2;');
    }
  }

  async exec(sql) {
    this.driver.exec(sql);
  }

  async run(sql, params = []) {
    const stmt = this.driver.prepare(sql);
    const result = stmt.run(...params);
    return {
      changes: Number(result.changes ?? 0),
      lastInsertRowid: Number(result.lastInsertRowid ?? 0),
    };
  }

  async get(sql, params = []) {
    const stmt = this.driver.prepare(sql);
    const row = stmt.get(...params);
    return row ? { ...row } : null;
  }

  async all(sql, params = []) {
    const stmt = this.driver.prepare(sql);
    const rows = stmt.all(...params);
    return rows.map((row) => ({ ...row }));
  }

  async close() {
    if (!this.closed) {
      this.closed = true;
      this.driver.close();
    }
  }
}
