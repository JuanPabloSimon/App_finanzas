import { MonthlyIncome } from '../../domain/models/monthlyIncome.js';
import { Investment } from '../../domain/models/investment.js';
import { Reminder } from '../../domain/models/reminder.js';
import { UserAccount } from '../../domain/models/userAccount.js';
import { MonthlyIncomeRepository } from '../../domain/repositories/monthlyIncomeRepository.js';
import { InvalidCredentials } from '../../core/errors.js';
import { formatIsoDateTime, isValidYearMonth } from '../../core/dates.js';

export class SqliteMonthlyIncomeRepository extends MonthlyIncomeRepository {
  constructor(db) {
    super();
    if (!db) {
      throw new Error('Se requiere una instancia de AppDatabase');
    }
    this.db = db;
  }

  async save(monthlyIncome) {
    const record =
      monthlyIncome instanceof MonthlyIncome
        ? monthlyIncome
        : new MonthlyIncome(monthlyIncome);

    const updatedAt = record.updatedAt ?? formatIsoDateTime(new Date());

    await this.db.run(
      `INSERT INTO monthly_incomes (year_month, amount_cents, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(year_month) DO UPDATE SET
         amount_cents = excluded.amount_cents,
         updated_at = excluded.updated_at`,
      [record.yearMonth, record.amountCents, updatedAt],
    );

    return new MonthlyIncome({
      yearMonth: record.yearMonth,
      amountCents: record.amountCents,
      updatedAt,
    });
  }

  async findByYearMonth(yearMonth) {
    if (!isValidYearMonth(yearMonth)) {
      return null;
    }
    const row = await this.db.get(
      'SELECT year_month, amount_cents, updated_at FROM monthly_incomes WHERE year_month = ?',
      [yearMonth],
    );
    if (!row) {
      return null;
    }
    return new MonthlyIncome({
      yearMonth: row.year_month,
      amountCents: Number(row.amount_cents),
      updatedAt: row.updated_at,
    });
  }
}

export class SqliteInvestmentRepository {
  constructor(db) {
    if (!db) {
      throw new Error('Se requiere una instancia de AppDatabase');
    }
    this.db = db;
  }

  async save(investment) {
    const record =
      investment instanceof Investment ? investment : new Investment(investment);
    const createdAt = record.createdAt ?? formatIsoDateTime(new Date());

    const result = await this.db.run(
      `INSERT INTO investments (
         asset_name,
         platform,
         amount_cents,
         date,
         due_date,
         note,
         created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        record.assetName,
        record.platform,
        record.amountCents,
        record.date,
        record.dueDate,
        record.note,
        createdAt,
      ],
    );

    return new Investment({
      id: result.lastInsertRowid,
      assetName: record.assetName,
      platform: record.platform,
      amountCents: record.amountCents,
      date: record.date,
      dueDate: record.dueDate,
      note: record.note,
      createdAt,
    });
  }

  async findByYearMonth(yearMonth) {
    if (!isValidYearMonth(yearMonth)) {
      return [];
    }
    const rows = await this.db.all(
      `SELECT id, asset_name, platform, amount_cents, date, due_date, note, created_at
         FROM investments
        WHERE substr(date, 1, 7) = ?
        ORDER BY date DESC, id DESC`,
      [yearMonth],
    );
    return rows.map(
      (r) =>
        new Investment({
          id: Number(r.id),
          assetName: r.asset_name,
          platform: r.platform,
          amountCents: Number(r.amount_cents),
          date: r.date,
          dueDate: r.due_date ?? null,
          note: r.note ?? null,
          createdAt: r.created_at,
        }),
    );
  }

  async deleteById(id) {
    await this.db.run('DELETE FROM investments WHERE id = ?', [id]);
    return true;
  }
}

export class SqliteReminderRepository {
  constructor(db) {
    if (!db) {
      throw new Error('Se requiere una instancia de AppDatabase');
    }
    this.db = db;
  }

  async save(reminder) {
    const record = reminder instanceof Reminder ? reminder : new Reminder(reminder);
    const createdAt = record.createdAt ?? formatIsoDateTime(new Date());

    const result = await this.db.run(
      `INSERT INTO reminders (title, due_date, amount_cents, is_completed, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        record.title,
        record.dueDate,
        record.amountCents,
        record.isCompleted ? 1 : 0,
        createdAt,
      ],
    );

    return new Reminder({
      id: result.lastInsertRowid,
      title: record.title,
      dueDate: record.dueDate,
      amountCents: record.amountCents,
      isCompleted: record.isCompleted,
      createdAt,
    });
  }

  async findAll() {
    const rows = await this.db.all(
      `SELECT id, title, due_date, amount_cents, is_completed, created_at
         FROM reminders
        ORDER BY due_date ASC, id ASC`,
    );
    return rows.map(
      (r) =>
        new Reminder({
          id: Number(r.id),
          title: r.title,
          dueDate: r.due_date,
          amountCents: r.amount_cents !== null ? Number(r.amount_cents) : null,
          isCompleted: Number(r.is_completed) === 1,
          createdAt: r.created_at,
        }),
    );
  }
}

export class SqliteUserAccountRepository {
  constructor(db) {
    if (!db) {
      throw new Error('Se requiere una instancia de AppDatabase');
    }
    this.db = db;
  }

  async register({ fullName, username, password }) {
    const cleanPassword = typeof password === 'string' ? password.trim() : '';
    if (cleanPassword.length < 4) {
      throw new InvalidCredentials('La clave debe tener al menos 4 caracteres');
    }
    const draft = new UserAccount({ fullName, username });
    const existing = await this.db.get(
      'SELECT id FROM user_accounts WHERE username = ?',
      [draft.username],
    );
    if (existing) {
      throw new InvalidCredentials('Ya existe una cuenta con ese usuario');
    }
    const createdAt = formatIsoDateTime(new Date());
    const passwordHash = `local:${cleanPassword}`;

    const result = await this.db.run(
      `INSERT INTO user_accounts (full_name, username, password_hash, created_at)
       VALUES (?, ?, ?, ?)`,
      [draft.fullName, draft.username, passwordHash, createdAt],
    );

    return new UserAccount({
      id: result.lastInsertRowid,
      fullName: draft.fullName,
      username: draft.username,
      createdAt,
    });
  }

  async authenticate({ username, password }) {
    const cleanUser = typeof username === 'string' ? username.trim().toLowerCase() : '';
    const cleanPassword = typeof password === 'string' ? password.trim() : '';
    if (!cleanUser || !cleanPassword) {
      throw new InvalidCredentials('Ingresá usuario y clave');
    }
    const row = await this.db.get(
      'SELECT id, full_name, username, password_hash, created_at FROM user_accounts WHERE username = ?',
      [cleanUser],
    );
    if (!row || row.password_hash !== `local:${cleanPassword}`) {
      throw new InvalidCredentials('Usuario o clave incorrectos');
    }
    return new UserAccount({
      id: Number(row.id),
      fullName: row.full_name,
      username: row.username,
      createdAt: row.created_at,
    });
  }
}
