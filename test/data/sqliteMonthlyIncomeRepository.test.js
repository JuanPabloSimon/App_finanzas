import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { AppDatabase } from '../../src/data/db/appDatabase.js';
import {
  SqliteMonthlyIncomeRepository,
  SqliteInvestmentRepository,
  SqliteReminderRepository,
  SqliteUserAccountRepository,
} from '../../src/data/repositories/sqliteMonthlyIncomeRepository.js';
import { MonthlyIncome } from '../../src/domain/models/monthlyIncome.js';
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
});
