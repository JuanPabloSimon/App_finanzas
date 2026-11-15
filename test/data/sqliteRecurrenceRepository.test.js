import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { AppDatabase } from '../../src/data/db/appDatabase.js';
import { SqliteRecurrenceRepository } from '../../src/data/repositories/sqliteRecurrenceRepository.js';
import { SqliteExpenseRepository } from '../../src/data/repositories/sqliteExpenseRepository.js';
import { RecurrenceRepository } from '../../src/domain/repositories/recurrenceRepository.js';
import { Expense } from '../../src/domain/models/expense.js';
import { InvalidRecurrence } from '../../src/core/errors.js';
import { isValidIsoDateTime } from '../../src/core/dates.js';

describe('H9 persistencia de recurrencias descartadas en SQLite', () => {
  let db;
  let repo;

  beforeEach(async () => {
    db = await AppDatabase.openInMemory();
    repo = new SqliteRecurrenceRepository(db);
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  it('[H9-R6] guarda la clave descartada en dismissed_recurrences con fecha ISO 8601', async () => {
    assert.equal(repo instanceof RecurrenceRepository, true);
    await repo.dismiss('1|650000');

    const row = await db.get(
      'SELECT recurrence_key, dismissed_at FROM dismissed_recurrences WHERE recurrence_key = ?',
      ['1|650000'],
    );
    assert.notEqual(row, null);
    assert.equal(row.recurrence_key, '1|650000');
    assert.equal(isValidIsoDateTime(row.dismissed_at), true);

    const keys = await repo.dismissedKeys();
    assert.equal(keys instanceof Set, true);
    assert.equal(keys.has('1|650000'), true);
  });

  it('[H9-R6] el doble descarte no duplica ni falla y una clave inválida lanza InvalidRecurrence', async () => {
    await repo.dismiss('1|650000', '2026-10-31T10:00:00');
    await repo.dismiss('1|650000', '2026-10-31T11:00:00');
    const count = await db.get('SELECT COUNT(*) AS total FROM dismissed_recurrences');
    assert.equal(Number(count.total), 1);
    const row = await db.get('SELECT dismissed_at FROM dismissed_recurrences');
    assert.equal(row.dismissed_at, '2026-10-31T10:00:00');

    for (const invalid of ['', 'a|b', '1|0', '1|10.5', null]) {
      await assert.rejects(() => repo.dismiss(invalid), InvalidRecurrence);
    }
    assert.throws(() => new SqliteRecurrenceRepository(null));
  });

  it('[H9-R6] la migración 3 deja user_version en 3 y actualiza una base en versión 2 sin perder gastos', async () => {
    const version = await db.get('PRAGMA user_version;');
    assert.ok(Number(version.user_version) >= 3);

    const expenseRepo = new SqliteExpenseRepository(db);
    const saved = await expenseRepo.save(
      new Expense({
        amountCents: 650000,
        date: '2026-10-05',
        categoryId: 7,
        createdAt: '2026-10-05T10:00:00',
      }),
    );

    await db.exec('DROP TABLE dismissed_recurrences;');
    await db.exec('PRAGMA user_version = 2;');
    await db.migrate();

    const migrated = await db.get('PRAGMA user_version;');
    assert.ok(Number(migrated.user_version) >= 3);
    const table = await db.get(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'dismissed_recurrences'",
    );
    assert.notEqual(table, null);
    const kept = await expenseRepo.findById(saved.id);
    assert.equal(kept.amountCents, 650000);

    await repo.dismiss('7|650000');
    assert.equal((await repo.dismissedKeys()).has('7|650000'), true);
  });
});
