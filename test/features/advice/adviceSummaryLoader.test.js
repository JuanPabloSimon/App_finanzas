import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { AppDatabase } from '../../../src/data/db/appDatabase.js';
import { SqliteCategoryRepository } from '../../../src/data/repositories/sqliteCategoryRepository.js';
import { SqliteExpenseRepository } from '../../../src/data/repositories/sqliteExpenseRepository.js';
import { SqliteMonthlyIncomeRepository } from '../../../src/data/repositories/sqliteMonthlyIncomeRepository.js';
import { Expense } from '../../../src/domain/models/expense.js';
import { MonthlyIncome } from '../../../src/domain/models/monthlyIncome.js';
import { Recurrence } from '../../../src/domain/models/recurrence.js';
import { loadSpendingSummary } from '../../../src/features/advice/adviceSummaryLoader.js';

describe('H10 carga del resumen agregado desde los repositorios', () => {
  let db;
  let categoryRepo;
  let expenseRepo;
  let incomeRepo;
  let categories;
  let idOf;

  beforeEach(async () => {
    db = await AppDatabase.openInMemory();
    categoryRepo = new SqliteCategoryRepository(db);
    expenseRepo = new SqliteExpenseRepository(db);
    incomeRepo = new SqliteMonthlyIncomeRepository(db);
    categories = await categoryRepo.findAll();
    idOf = (name) => categories.find((category) => category.name === name).id;
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  async function saveExpense(amountCents, date, categoryName, extra = {}) {
    return expenseRepo.save(
      new Expense({
        amountCents,
        date,
        categoryId: idOf(categoryName),
        createdAt: `${date}T10:00:00`,
        ...extra,
      }),
    );
  }

  it('[H10-R1] arma el resumen del período con el total del mes anterior y el ingreso del período', async () => {
    await saveExpense(400000, '2026-10-10', 'Delivery');
    await saveExpense(100000, '2026-10-20', 'Alimentos');
    await saveExpense(450000, '2026-11-05', 'Delivery', { note: 'NOTA-SECRETA', subcategory: 'Pizza' });
    await saveExpense(200000, '2026-11-08', 'Alimentos');
    await saveExpense(999900, '2026-12-01', 'Ocio');
    await incomeRepo.save(
      new MonthlyIncome({ yearMonth: '2026-11', amountCents: 50000000, updatedAt: '2026-11-01T09:00:00' }),
    );
    const subscriptionsId = idOf('Suscripciones');
    const recurrences = [
      new Recurrence({
        categoryId: subscriptionsId,
        categoryName: 'Suscripciones',
        typicalAmountCents: 650000,
        occurrences: 3,
        expenseIds: [91, 92, 93],
      }),
    ];

    const summary = await loadSpendingSummary({
      expenseRepository: expenseRepo,
      incomeRepository: incomeRepo,
      categories,
      yearMonth: '2026-11',
      recurrences,
    });

    assert.deepEqual(Object.keys(summary).sort(), [
      'categorias',
      'ingreso_mensual',
      'moneda',
      'periodo',
      'recurrencias',
      'total_mes',
      'total_mes_anterior',
    ]);
    assert.equal(summary.periodo, '2026-11');
    assert.equal(summary.total_mes, 6500);
    assert.equal(summary.total_mes_anterior, 5000);
    assert.equal(summary.ingreso_mensual, 500000);
    assert.deepEqual(
      summary.categorias.map((item) => item.nombre),
      ['Delivery', 'Alimentos'],
    );
    assert.deepEqual({ ...summary.recurrencias[0] }, {
      categoria: 'Suscripciones',
      monto_tipico: 6500,
      veces_en_60_dias: 3,
    });
    assert.equal(JSON.stringify(summary).includes('NOTA-SECRETA'), false);
  });

  it('[H10-R6] una categoría nueva en el período tiene variacion_pct null y la existente compara con el mes anterior', async () => {
    await saveExpense(400000, '2026-10-10', 'Delivery');
    await saveExpense(450000, '2026-11-05', 'Delivery');
    await saveExpense(80000, '2026-11-06', 'Salud');

    const summary = await loadSpendingSummary({
      expenseRepository: expenseRepo,
      incomeRepository: incomeRepo,
      categories,
      yearMonth: '2026-11',
    });

    const byName = new Map(summary.categorias.map((item) => [item.nombre, item]));
    assert.equal(byName.get('Delivery').variacion_pct, 12.5);
    assert.equal(byName.get('Salud').variacion_pct, null);
    assert.equal(summary.ingreso_mensual, null);
    assert.deepEqual([...summary.recurrencias], []);
  });
});
