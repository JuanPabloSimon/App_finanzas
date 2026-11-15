import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { AppDatabase } from '../../../src/data/db/appDatabase.js';
import { SqliteCategoryRepository } from '../../../src/data/repositories/sqliteCategoryRepository.js';
import { SqliteExpenseRepository } from '../../../src/data/repositories/sqliteExpenseRepository.js';
import { SqliteRecurrenceRepository } from '../../../src/data/repositories/sqliteRecurrenceRepository.js';
import { Expense } from '../../../src/domain/models/expense.js';
import { loadVisibleRecurrences } from '../../../src/features/recurrences/recurrencesLoader.js';

describe('H9 carga de recurrencias visibles', () => {
  let db;
  let categoryRepo;
  let expenseRepo;
  let recurrenceRepo;
  let subscriptionsId;

  beforeEach(async () => {
    db = await AppDatabase.openInMemory();
    categoryRepo = new SqliteCategoryRepository(db);
    expenseRepo = new SqliteExpenseRepository(db);
    recurrenceRepo = new SqliteRecurrenceRepository(db);
    const categories = await categoryRepo.findAll();
    subscriptionsId = categories.find((c) => c.name === 'Suscripciones').id;
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  async function saveExpense(amountCents, date, categoryId = subscriptionsId) {
    return expenseRepo.save(
      new Expense({ amountCents, date, categoryId, createdAt: `${date}T10:00:00` }),
    );
  }

  async function load(referenceDate = '2026-10-31') {
    return loadVisibleRecurrences({
      expenseRepository: expenseRepo,
      recurrenceRepository: recurrenceRepo,
      categories: await categoryRepo.findAll(),
      referenceDate,
    });
  }

  it('[H9-R8] lee los tres meses que cubren la ventana y devuelve la recurrencia con el nombre de su categoría', async () => {
    await saveExpense(650000, '2026-09-05');
    await saveExpense(650000, '2026-10-05');
    await saveExpense(660000, '2026-10-28');

    const visible = await load();
    assert.equal(visible.length, 1);
    assert.equal(visible[0].categoryName, 'Suscripciones');
    assert.equal(visible[0].typicalAmountCents, 650000);
    assert.equal(visible[0].occurrences, 3);
  });

  it('[H9-R11] no cuenta un gasto de agosto que completaría la tercera ocurrencia', async () => {
    await saveExpense(650000, '2026-08-30');
    await saveExpense(650000, '2026-09-30');
    await saveExpense(650000, '2026-10-30');

    assert.deepEqual([...(await load())], []);
  });

  it('[H9-R7] una recurrencia descartada no vuelve a sugerirse aunque un gasto nuevo mueva la mediana dentro del 10 %', async () => {
    await saveExpense(650000, '2026-09-05');
    await saveExpense(650000, '2026-10-05');
    await saveExpense(700000, '2026-10-20');

    const [detected] = await load();
    assert.equal(detected.key, `${subscriptionsId}|650000`);
    await recurrenceRepo.dismiss(detected.key);
    assert.deepEqual([...(await load())], []);

    await saveExpense(700000, '2026-10-29');
    assert.deepEqual([...(await load())], []);
  });
});
