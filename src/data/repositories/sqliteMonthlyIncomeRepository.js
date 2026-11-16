import { MonthlyIncome, IncomeEntry } from '../../domain/models/monthlyIncome.js';
import { Investment } from '../../domain/models/investment.js';
import { Reminder } from '../../domain/models/reminder.js';
import { UserAccount } from '../../domain/models/userAccount.js';
import { MonthlyIncomeRepository } from '../../domain/repositories/monthlyIncomeRepository.js';
import { InvalidCredentials, InvalidAmount } from '../../core/errors.js';
import { formatIsoDateTime, isValidYearMonth, extractYearMonth } from '../../core/dates.js';

export class SqliteMonthlyIncomeRepository extends MonthlyIncomeRepository {
  constructor(db) {
    super();
    if (!db) {
      throw new Error('Se requiere una instancia de AppDatabase');
    }
    this.db = db;
  }

  async syncMonthlyAggregate(yearMonth, updatedAt = formatIsoDateTime(new Date())) {
    const sumRow = await this.db.get(
      `SELECT COALESCE(SUM(amount_cents), 0) AS total
         FROM income_entries
        WHERE substr(date, 1, 7) = ?`,
      [yearMonth],
    );
    const total = Number(sumRow?.total ?? 0);
    if (total > 0) {
      await this.db.run(
        `INSERT INTO monthly_incomes (year_month, amount_cents, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(year_month) DO UPDATE SET
           amount_cents = excluded.amount_cents,
           updated_at = excluded.updated_at`,
        [yearMonth, total, updatedAt],
      );
      return new MonthlyIncome({
        yearMonth,
        amountCents: total,
        updatedAt,
      });
    }
    await this.db.run('DELETE FROM monthly_incomes WHERE year_month = ?', [yearMonth]);
    return null;
  }

  async addEntry(incomeEntry) {
    const record =
      incomeEntry instanceof IncomeEntry ? incomeEntry : new IncomeEntry(incomeEntry);
    const createdAt = record.createdAt ?? formatIsoDateTime(new Date());

    const result = await this.db.run(
      `INSERT INTO income_entries (amount_cents, date, note, created_at)
       VALUES (?, ?, ?, ?)`,
      [record.amountCents, record.date, record.note, createdAt],
    );

    await this.syncMonthlyAggregate(record.yearMonth, createdAt);

    return new IncomeEntry({
      id: result.lastInsertRowid,
      amountCents: record.amountCents,
      date: record.date,
      note: record.note,
      createdAt,
    });
  }

  async findEntriesByYearMonth(yearMonth) {
    if (!isValidYearMonth(yearMonth)) {
      return [];
    }
    const rows = await this.db.all(
      `SELECT id, amount_cents, date, note, created_at
         FROM income_entries
        WHERE substr(date, 1, 7) = ?
        ORDER BY date DESC, id DESC`,
      [yearMonth],
    );
    return rows.map(
      (r) =>
        new IncomeEntry({
          id: Number(r.id),
          amountCents: Number(r.amount_cents),
          date: r.date,
          note: r.note ?? null,
          createdAt: r.created_at,
        }),
    );
  }

  async updateEntry(incomeEntry) {
    const record =
      incomeEntry instanceof IncomeEntry ? incomeEntry : new IncomeEntry(incomeEntry);
    if (!Number.isInteger(record.id) || record.id <= 0) {
      throw new InvalidAmount('Se requiere un id válido para editar el ingreso');
    }
    const existing = await this.db.get(
      'SELECT id, date, created_at FROM income_entries WHERE id = ?',
      [record.id],
    );
    if (!existing) {
      throw new InvalidAmount('El ingreso seleccionado no existe');
    }
    const previousYm = extractYearMonth(existing.date);
    await this.db.run(
      `UPDATE income_entries
          SET amount_cents = ?, date = ?, note = ?
        WHERE id = ?`,
      [record.amountCents, record.date, record.note, record.id],
    );
    const updatedAt = formatIsoDateTime(new Date());
    await this.syncMonthlyAggregate(record.yearMonth, updatedAt);
    if (previousYm !== record.yearMonth) {
      await this.syncMonthlyAggregate(previousYm, updatedAt);
    }
    return new IncomeEntry({
      id: record.id,
      amountCents: record.amountCents,
      date: record.date,
      note: record.note,
      createdAt: existing.created_at,
    });
  }

  async deleteEntryById(id) {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      throw new InvalidAmount('Se requiere un id válido para eliminar el ingreso');
    }
    const existing = await this.db.get(
      'SELECT id, date FROM income_entries WHERE id = ?',
      [numericId],
    );
    if (!existing) {
      throw new InvalidAmount('El ingreso seleccionado no existe');
    }
    await this.db.run('DELETE FROM income_entries WHERE id = ?', [numericId]);
    await this.syncMonthlyAggregate(
      extractYearMonth(existing.date),
      formatIsoDateTime(new Date()),
    );
    return true;
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

  async updateProfile({ id, fullName, username }) {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      throw new InvalidCredentials('No existe una sesión activa para actualizar');
    }
    const draft = new UserAccount({ id: numericId, fullName, username });
    const existing = await this.db.get(
      'SELECT id, created_at FROM user_accounts WHERE id = ?',
      [numericId],
    );
    if (!existing) {
      throw new InvalidCredentials('La cuenta de usuario no existe');
    }
    const conflict = await this.db.get(
      'SELECT id FROM user_accounts WHERE username = ? AND id != ?',
      [draft.username, numericId],
    );
    if (conflict) {
      throw new InvalidCredentials('Ya existe una cuenta con ese usuario');
    }
    await this.db.run(
      'UPDATE user_accounts SET full_name = ?, username = ? WHERE id = ?',
      [draft.fullName, draft.username, numericId],
    );
    return new UserAccount({
      id: numericId,
      fullName: draft.fullName,
      username: draft.username,
      createdAt: existing.created_at,
    });
  }

  async changePassword({ id, currentPassword, newPassword }) {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      throw new InvalidCredentials('No existe una sesión activa para actualizar la clave');
    }
    const cleanCurrent =
      typeof currentPassword === 'string' ? currentPassword.trim() : '';
    const cleanNew = typeof newPassword === 'string' ? newPassword.trim() : '';
    if (!cleanCurrent) {
      throw new InvalidCredentials('Ingresá tu clave actual');
    }
    if (cleanNew.length < 4) {
      throw new InvalidCredentials('La nueva clave debe tener al menos 4 caracteres');
    }
    const row = await this.db.get(
      'SELECT id, password_hash FROM user_accounts WHERE id = ?',
      [numericId],
    );
    if (!row) {
      throw new InvalidCredentials('La cuenta de usuario no existe');
    }
    if (row.password_hash !== `local:${cleanCurrent}`) {
      throw new InvalidCredentials('La clave actual es incorrecta');
    }
    await this.db.run('UPDATE user_accounts SET password_hash = ? WHERE id = ?', [
      `local:${cleanNew}`,
      numericId,
    ]);
    return true;
  }
}
