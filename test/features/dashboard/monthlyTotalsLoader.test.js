import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { AppDatabase } from '../../../src/data/db/appDatabase.js';
import { SqliteExpenseRepository } from '../../../src/data/repositories/sqliteExpenseRepository.js';
import { Expense } from '../../../src/domain/models/expense.js';
import { loadPreviousMonthlyTotals } from '../../../src/features/dashboard/monthlyTotalsLoader.js';

describe('H7 carga de totales de los meses anteriores', () => {
  let db;
  let expenseRepo;

  beforeEach(async () => {
    db = await AppDatabase.openInMemory();
    expenseRepo = new SqliteExpenseRepository(db);
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  async function saveExpense(amountCents, date) {
    await expenseRepo.save(
      new Expense({ amountCents, date, categoryId: 1, createdAt: `${date}T10:00:00` }),
    );
  }

  it('[H7-R2] devuelve los cinco meses anteriores al mes activo, del más reciente al más antiguo, con la suma entera de sus gastos desde SQLite', async () => {
    await saveExpense(100050, '2026-01-10');
    await saveExpense(20000, '2026-01-25');
    await saveExpense(30000, '2025-11-03');
    await saveExpense(50000, '2025-09-30');
    await saveExpense(70000, '2025-08-15');
    await saveExpense(90000, '2026-02-01');

    const totals = await loadPreviousMonthlyTotals(expenseRepo, '2026-02');

    assert.deepEqual(totals, [
      { yearMonth: '2026-01', totalCents: 120050 },
      { yearMonth: '2025-12', totalCents: 0 },
      { yearMonth: '2025-11', totalCents: 30000 },
      { yearMonth: '2025-10', totalCents: 0 },
      { yearMonth: '2025-09', totalCents: 50000 },
    ]);
    for (const month of totals) {
      assert.equal(Number.isInteger(month.totalCents), true);
    }
  });

  it('[H7-R12] refleja los gastos nuevos o eliminados en una nueva carga', async () => {
    await saveExpense(40000, '2026-10-05');
    const before = await loadPreviousMonthlyTotals(expenseRepo, '2026-11');
    assert.equal(before[0].totalCents, 40000);

    const saved = await expenseRepo.save(
      new Expense({ amountCents: 10000, date: '2026-10-06', categoryId: 2, createdAt: '2026-10-06T10:00:00' }),
    );
    const afterSave = await loadPreviousMonthlyTotals(expenseRepo, '2026-11');
    assert.equal(afterSave[0].totalCents, 50000);

    await expenseRepo.deleteById(saved.id);
    const afterDelete = await loadPreviousMonthlyTotals(expenseRepo, '2026-11');
    assert.equal(afterDelete[0].totalCents, 40000);
  });
});
