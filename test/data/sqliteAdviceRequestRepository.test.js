import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { AppDatabase } from '../../src/data/db/appDatabase.js';
import { SqliteAdviceRequestRepository } from '../../src/data/repositories/sqliteAdviceRequestRepository.js';
import { SqliteExpenseRepository } from '../../src/data/repositories/sqliteExpenseRepository.js';
import { AdviceRequestRepository } from '../../src/domain/repositories/adviceRequestRepository.js';
import { AdviceRequest } from '../../src/domain/models/adviceRequest.js';
import { Expense } from '../../src/domain/models/expense.js';
import { InvalidAdviceRequest } from '../../src/core/errors.js';

function request(yearMonth, source, createdAt = `${yearMonth}-15T10:00:00`) {
  return new AdviceRequest({ yearMonth, source, createdAt });
}

describe('H10 persistencia de consultas al asistente en SQLite', () => {
  let db;
  let repo;

  beforeEach(async () => {
    db = await AppDatabase.openInMemory();
    repo = new SqliteAdviceRequestRepository(db);
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  it('[H10-R22] save de una consulta model inserta una fila con id asignado', async () => {
    assert.equal(repo instanceof AdviceRequestRepository, true);
    const saved = await repo.save(request('2026-11', 'model', '2026-11-15T10:00:00'));
    assert.equal(Number.isInteger(saved.id) && saved.id > 0, true);
    assert.equal(saved instanceof AdviceRequest, true);

    const row = await db.get('SELECT * FROM advice_requests WHERE id = ?', [saved.id]);
    assert.deepEqual(row, {
      id: saved.id,
      year_month: '2026-11',
      source: 'model',
      created_at: '2026-11-15T10:00:00',
    });
  });

  it('[H10-R22] rechaza un source inválido en el modelo, en el conteo y en la tabla (CHECK)', async () => {
    assert.throws(() => request('2026-11', 'otro'), InvalidAdviceRequest);
    await assert.rejects(() => repo.countByYearMonth('2026-11', 'otro'), InvalidAdviceRequest);
    await assert.rejects(
      () => repo.save({ yearMonth: '2026-11', source: 'model' }),
      InvalidAdviceRequest,
    );
    await assert.rejects(
      () =>
        db.run('INSERT INTO advice_requests (year_month, source, created_at) VALUES (?, ?, ?)', [
          '2026-11',
          'otro',
          '2026-11-15T10:00:00',
        ]),
      /CHECK/,
    );
    assert.throws(() => new SqliteAdviceRequestRepository(null));
  });

  it('[H10-R24] countByYearMonth cuenta solo el mes y el source pedidos', async () => {
    await repo.save(request('2026-11', 'model'));
    await repo.save(request('2026-11', 'model'));
    await repo.save(request('2026-11', 'fallback'));
    await repo.save(request('2026-10', 'model'));

    assert.equal(await repo.countByYearMonth('2026-11', 'model'), 2);
    assert.equal(await repo.countByYearMonth('2026-11'), 2);
    assert.equal(await repo.countByYearMonth('2026-11', 'fallback'), 1);
    assert.equal(await repo.countByYearMonth('2026-10', 'model'), 1);
    assert.equal(await repo.countByYearMonth('2026-09', 'model'), 0);
  });

  it('[H10-R25] la migración 4 deja user_version en 4 y actualiza una base en versión 3 sin perder gastos', async () => {
    const version = await db.get('PRAGMA user_version;');
    assert.equal(Number(version.user_version), 4);
    const index = await db.get(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_advice_requests_year_month'",
    );
    assert.notEqual(index, null);

    const expenseRepo = new SqliteExpenseRepository(db);
    const saved = await expenseRepo.save(
      new Expense({
        amountCents: 650000,
        date: '2026-11-05',
        categoryId: 1,
        createdAt: '2026-11-05T10:00:00',
      }),
    );

    await db.exec('DROP TABLE advice_requests;');
    await db.exec('PRAGMA user_version = 3;');
    await db.migrate();

    const migrated = await db.get('PRAGMA user_version;');
    assert.equal(Number(migrated.user_version), 4);
    const table = await db.get(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'advice_requests'",
    );
    assert.notEqual(table, null);
    const kept = await expenseRepo.findById(saved.id);
    assert.equal(kept.amountCents, 650000);
  });

  it('[H10-R25] las filas persisten al crear otro repositorio sobre la misma base', async () => {
    await repo.save(request('2026-11', 'model'));
    await repo.save(request('2026-11', 'model'));

    const nextSession = new SqliteAdviceRequestRepository(db);
    assert.equal(await nextSession.countByYearMonth('2026-11', 'model'), 2);
    const third = await nextSession.save(request('2026-11', 'model'));
    assert.equal(third.id, 3);
  });
});
