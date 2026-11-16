import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { AppDatabase } from '../../src/data/db/appDatabase.js';
import {
  SqliteMonthlyIncomeRepository,
  SqliteInvestmentRepository,
  SqliteReminderRepository,
  SqliteUserAccountRepository,
} from '../../src/data/repositories/sqliteMonthlyIncomeRepository.js';
import { MonthlyIncome, IncomeEntry } from '../../src/domain/models/monthlyIncome.js';
import { Investment } from '../../src/domain/models/investment.js';
import { Reminder } from '../../src/domain/models/reminder.js';
import {
  InvalidAmount,
  InvalidExpenseDate,
  InvalidCredentials,
} from '../../src/core/errors.js';

describe('H5 persistencia de ingreso mensual, inversiones, recordatorios y cuenta local en SQLite', () => {
  let db;
  let incomeRepo;
  let investmentRepo;
  let reminderRepo;
  let userRepo;

  beforeEach(async () => {
    db = await AppDatabase.openInMemory();
    incomeRepo = new SqliteMonthlyIncomeRepository(db);
    investmentRepo = new SqliteInvestmentRepository(db);
    reminderRepo = new SqliteReminderRepository(db);
    userRepo = new SqliteUserAccountRepository(db);
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  it('[H5-R1] guarda y actualiza el ingreso mensual por período YYYY-MM en la tabla monthly_incomes en centavos enteros', async () => {
    assert.equal(await incomeRepo.findByYearMonth('2026-11'), null);

    const saved = await incomeRepo.save(
      new MonthlyIncome({
        yearMonth: '2026-11',
        amountCents: 120000000,
        updatedAt: '2026-11-01T09:00:00',
      }),
    );

    assert.equal(saved.yearMonth, '2026-11');
    assert.equal(saved.amountCents, 120000000);

    const updated = await incomeRepo.save(
      new MonthlyIncome({
        yearMonth: '2026-11',
        amountCents: 135000000,
        updatedAt: '2026-11-10T12:00:00',
      }),
    );

    assert.equal(updated.amountCents, 135000000);
    const loaded = await incomeRepo.findByYearMonth('2026-11');
    assert.notEqual(loaded, null);
    assert.equal(loaded.amountCents, 135000000);
    assert.equal(loaded.updatedAt, '2026-11-10T12:00:00');
  });

  it('[H5-R4] rechaza ingresos o inversiones con monto cero, negativo o fecha inválida sin modificar SQLite', async () => {
    await assert.rejects(
      () => incomeRepo.save({ yearMonth: '2026-11', amountCents: 0 }),
      InvalidAmount,
    );
    await assert.rejects(
      () => incomeRepo.save({ yearMonth: '2026-99', amountCents: 100000 }),
      InvalidExpenseDate,
    );
    await assert.rejects(
      () =>
        investmentRepo.save({
          assetName: 'Plazo Fijo',
          platform: 'Banco Nación',
          amountCents: -500,
          date: '2026-11-05',
        }),
      InvalidAmount,
    );

    assert.equal(await incomeRepo.findByYearMonth('2026-11'), null);
    assert.equal((await investmentRepo.findByYearMonth('2026-11')).length, 0);
  });

  it('[H5-R5][H5-R6] persiste inversiones (activo, plataforma, monto y vencimiento) y recordatorios en SQLite', async () => {
    const inv = await investmentRepo.save(
      new Investment({
        assetName: 'Plazo Fijo 30 días',
        platform: 'Banco Provincia',
        amountCents: 40000000,
        date: '2026-11-02',
        dueDate: '2026-12-02',
        note: 'TNA 37%',
        createdAt: '2026-11-02T10:00:00',
      }),
    );

    assert.equal(inv.id, 1);
    const novInvestments = await investmentRepo.findByYearMonth('2026-11');
    assert.equal(novInvestments.length, 1);
    assert.equal(novInvestments[0].assetName, 'Plazo Fijo 30 días');
    assert.equal(novInvestments[0].platform, 'Banco Provincia');
    assert.equal(novInvestments[0].dueDate, '2026-12-02');

    const rem = await reminderRepo.save(
      new Reminder({
        title: 'Renovar Plazo Fijo Banco Provincia',
        dueDate: '2026-12-02',
        amountCents: 40000000,
        createdAt: '2026-11-02T10:05:00',
      }),
    );
    assert.equal(rem.id, 1);
    const reminders = await reminderRepo.findAll();
    assert.equal(reminders.length, 1);
    assert.equal(reminders[0].title, 'Renovar Plazo Fijo Banco Provincia');
  });

  it('[H5-R7] registra una cuenta de usuario local en SQLite y autentica credenciales válidas rechazando claves incorrectas', async () => {
    const created = await userRepo.register({
      fullName: 'Juan Pablo',
      username: 'juanpablo',
      password: '1234',
    });

    assert.equal(created.fullName, 'Juan Pablo');
    assert.equal(created.username, 'juanpablo');

    const loggedIn = await userRepo.authenticate({
      username: 'JUANPABLO',
      password: '1234',
    });
    assert.equal(loggedIn.fullName, 'Juan Pablo');

    await assert.rejects(
      () => userRepo.authenticate({ username: 'juanpablo', password: '9999' }),
      InvalidCredentials,
    );
  });

  it('[H14-R8][H14-R9] cambia la contraseña local en SQLite cuando la clave actual es válida y la nueva tiene >= 4 caracteres, rechazando claves inválidas sin modificar user_accounts', async () => {
    const created = await userRepo.register({
      fullName: 'Juan Pablo',
      username: 'juanpablo',
      password: '1234',
    });

    await assert.rejects(
      () =>
        userRepo.changePassword({
          id: created.id,
          currentPassword: 'wrong',
          newPassword: '5678',
        }),
      InvalidCredentials,
    );

    await assert.rejects(
      () =>
        userRepo.changePassword({
          id: created.id,
          currentPassword: '1234',
          newPassword: '12',
        }),
      InvalidCredentials,
    );

    const stillOld = await userRepo.authenticate({
      username: 'juanpablo',
      password: '1234',
    });
    assert.equal(stillOld.id, created.id);

    const changed = await userRepo.changePassword({
      id: created.id,
      currentPassword: '1234',
      newPassword: 'nuevaClave99',
    });
    assert.equal(changed, true);

    await assert.rejects(
      () => userRepo.authenticate({ username: 'juanpablo', password: '1234' }),
      InvalidCredentials,
    );

    const withNew = await userRepo.authenticate({
      username: 'juanpablo',
      password: 'nuevaClave99',
    });
    assert.equal(withNew.username, 'juanpablo');
  });

  it('[H15-R3][H15-R4][H15-R5] ejecuta la migración v5 (income_entries), persiste múltiples ingresos en el mes ordenados por fecha descendente, acumula su suma en findByYearMonth y recalcula al editar o eliminar', async () => {
    const version = await db.get('PRAGMA user_version;');
    assert.equal(Number(version.user_version), 5);
    const idx = await db.get(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_income_entries_date'",
    );
    assert.notEqual(idx, null);

    const e1 = await incomeRepo.addEntry(
      new IncomeEntry({
        amountCents: 100000000,
        date: '2026-11-02',
        note: 'Sueldo',
        createdAt: '2026-11-02T09:00:00',
      }),
    );
    const e2 = await incomeRepo.addEntry(
      new IncomeEntry({
        amountCents: 45000000,
        date: '2026-11-12',
        note: 'Honorarios freelance',
        createdAt: '2026-11-12T14:00:00',
      }),
    );
    await incomeRepo.addEntry(
      new IncomeEntry({
        amountCents: 80000000,
        date: '2026-10-05',
        note: 'Octubre',
        createdAt: '2026-10-05T10:00:00',
      }),
    );

    const novEntries = await incomeRepo.findEntriesByYearMonth('2026-11');
    assert.equal(novEntries.length, 2);
    assert.equal(novEntries[0].id, e2.id);
    assert.equal(novEntries[0].note, 'Honorarios freelance');
    assert.equal(novEntries[1].id, e1.id);

    const novTotal = await incomeRepo.findByYearMonth('2026-11');
    assert.notEqual(novTotal, null);
    assert.equal(novTotal.amountCents, 145000000);

    await incomeRepo.updateEntry(
      e2.copyWith({ amountCents: 60000000, note: 'Honorarios actualizados' }),
    );
    const afterUpdate = await incomeRepo.findByYearMonth('2026-11');
    assert.equal(afterUpdate.amountCents, 160000000);

    await incomeRepo.deleteEntryById(e1.id);
    const afterDeleteOne = await incomeRepo.findByYearMonth('2026-11');
    assert.equal(afterDeleteOne.amountCents, 60000000);

    await incomeRepo.deleteEntryById(e2.id);
    const afterDeleteAll = await incomeRepo.findByYearMonth('2026-11');
    assert.equal(afterDeleteAll, null);
    assert.deepEqual(await incomeRepo.findEntriesByYearMonth('2026-11'), []);
  });
});
