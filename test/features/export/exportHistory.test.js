import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { AppDatabase } from '../../../src/data/db/appDatabase.js';
import { SqliteCategoryRepository } from '../../../src/data/repositories/sqliteCategoryRepository.js';
import { SqliteExpenseRepository } from '../../../src/data/repositories/sqliteExpenseRepository.js';
import { Expense } from '../../../src/domain/models/expense.js';
import { formatCentsToArs } from '../../../src/core/formatters.js';
import {
  exportHistory,
  loadExpensesForExport,
  buildIdleExportState,
  EXPORT_EMPTY_MESSAGE,
  EXPORT_ERROR_MESSAGE,
} from '../../../src/features/export/exportHistory.js';
import { parseCsv, parseCsvAmountToCents } from '../../domain/services/csvTestParser.js';

function createFakeDelivery({ downloadError = null, shareOutcome = 'shared' } = {}) {
  const calls = [];
  return {
    calls,
    canShare: () => true,
    async download(payload) {
      calls.push({ method: 'download', ...payload });
      if (downloadError) {
        throw downloadError;
      }
    },
    async share(payload) {
      calls.push({ method: 'share', ...payload });
      return shareOutcome;
    },
  };
}

describe('H11 orquestación de la exportación del historial', () => {
  let db;
  let categoryRepo;
  let expenseRepo;
  let categoryIds;

  beforeEach(async () => {
    db = await AppDatabase.openInMemory();
    categoryRepo = new SqliteCategoryRepository(db);
    expenseRepo = new SqliteExpenseRepository(db);
    const categories = await categoryRepo.findAll();
    categoryIds = Object.fromEntries(categories.map((c) => [c.name, c.id]));
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  async function saveExpense({ amountCents, date, category = 'Alimentos', subcategory = null, note = null }) {
    return expenseRepo.save(
      new Expense({
        amountCents,
        date,
        categoryId: categoryIds[category],
        subcategory,
        note,
        createdAt: `${date}T10:00:00`,
      }),
    );
  }

  async function saveEightExpenses() {
    await saveExpense({ amountCents: 123456, date: '2026-09-03', note: 'Compra; con punto y coma' });
    await saveExpense({ amountCents: 5, date: '2026-09-15', category: 'Ocio', note: 'dijo "hola"' });
    await saveExpense({ amountCents: 650000, date: '2026-10-05', category: 'Suscripciones', subcategory: 'Streaming' });
    await saveExpense({ amountCents: 99, date: '2026-10-05', note: 'línea1\nlínea2' });
    await saveExpense({ amountCents: 1000000, date: '2026-10-20', category: 'Transporte', note: '=SUMA(A1:A9)' });
    await saveExpense({ amountCents: 4321, date: '2026-11-01', subcategory: '+Extra', note: 'x\r\ny' });
    await saveExpense({ amountCents: 250000, date: '2026-11-10', category: 'Salud', note: '-20 % de descuento' });
    await saveExpense({ amountCents: 777, date: '2026-11-14', subcategory: '@kiosco' });
  }

  function runExport(delivery, overrides = {}) {
    return exportHistory({
      expenseRepository: expenseRepo,
      categoryRepository: categoryRepo,
      today: () => '2026-11-15',
      delivery,
      ...overrides,
    });
  }

  it('[H11-R1] entrega un CSV con los gastos de todos los meses aunque hoy sea del último mes', async () => {
    await saveExpense({ amountCents: 100000, date: '2026-09-10' });
    await saveExpense({ amountCents: 200000, date: '2026-10-10', category: 'Ocio' });
    await saveExpense({ amountCents: 300000, date: '2026-11-10', category: 'Salud' });
    const delivery = createFakeDelivery();

    const state = await runExport(delivery);

    assert.equal(state.status, 'done');
    assert.equal(delivery.calls.length, 1);
    assert.equal(delivery.calls[0].method, 'download');
    const parsed = parseCsv(delivery.calls[0].content);
    assert.equal(parsed.rows.length, 3);
    assert.deepEqual(
      parsed.rows.map((fields) => fields[0].slice(0, 7)),
      ['2026-09', '2026-10', '2026-11'],
    );
  });

  it('[H11-R13][H11-R14] la cantidad de filas y la suma del CSV coinciden con COUNT y SUM de SQLite (CA2)', async () => {
    await saveEightExpenses();
    const delivery = createFakeDelivery();

    const state = await runExport(delivery);

    const { count } = await db.get('SELECT COUNT(*) AS count FROM expenses');
    const { total } = await db.get('SELECT SUM(amount_cents) AS total FROM expenses');
    const parsed = parseCsv(delivery.calls[0].content);
    const parsedTotal = parsed.rows.reduce(
      (sum, fields) => sum + parseCsvAmountToCents(fields[1]),
      0,
    );

    assert.equal(parsed.rows.length, Number(count));
    assert.equal(parsedTotal, Number(total));
    assert.ok(parsed.rows.every((fields) => fields.length === 5));
    assert.equal(state.rowCount, Number(count));
    assert.equal(state.totalCents, Number(total));
  });

  it('[H11-R15] el estado done informa la cantidad y el total formateado con formatCentsToArs', async () => {
    await saveEightExpenses();
    const many = await runExport(createFakeDelivery());
    assert.equal(
      many.message,
      `Se exportaron 8 gastos por un total de ${formatCentsToArs(many.totalCents)}.`,
    );

    await db.run('DELETE FROM expenses');
    await saveExpense({ amountCents: 650000, date: '2026-11-05' });
    const single = await runExport(createFakeDelivery());
    assert.equal(single.message, 'Se exportó 1 gasto por un total de $ 6.500.');
  });

  it('[H11-R16] la entrega recibe el nombre gestix_gastos_<fecha de exportación>.csv', async () => {
    await saveExpense({ amountCents: 100000, date: '2026-11-01' });
    const delivery = createFakeDelivery();

    const state = await runExport(delivery);

    assert.equal(delivery.calls[0].fileName, 'gestix_gastos_2026-11-15.csv');
    assert.equal(state.fileName, 'gestix_gastos_2026-11-15.csv');
  });

  it('[H11-R21] sin gastos devuelve el estado empty con su mensaje y no entrega ningún archivo', async () => {
    const delivery = createFakeDelivery();

    const state = await runExport(delivery);

    assert.equal(state.status, 'empty');
    assert.equal(state.message, EXPORT_EMPTY_MESSAGE);
    assert.equal(state.rowCount, 0);
    assert.equal(state.fileName, null);
    assert.equal(delivery.calls.length, 0);
  });

  it('[H11-R22] si falla la lectura o la entrega devuelve el estado error sin lanzar y sin cambiar los gastos', async () => {
    await saveEightExpenses();
    const before = await expenseRepo.findAll();

    const failingRepo = {
      async findAll() {
        throw new Error('base no disponible');
      },
    };
    const readFailure = await exportHistory({
      expenseRepository: failingRepo,
      categoryRepository: categoryRepo,
      today: () => '2026-11-15',
      delivery: createFakeDelivery(),
    });
    assert.equal(readFailure.status, 'error');
    assert.equal(readFailure.message, EXPORT_ERROR_MESSAGE);

    const deliveryFailure = await runExport(
      createFakeDelivery({ downloadError: new Error('Blob no disponible') }),
    );
    assert.equal(deliveryFailure.status, 'error');
    assert.equal(deliveryFailure.message, EXPORT_ERROR_MESSAGE);

    const shareFailure = await runExport(
      {
        async share() {
          throw new Error('NotAllowedError');
        },
      },
      { mode: 'share' },
    );
    assert.equal(shareFailure.status, 'error');

    const after = await expenseRepo.findAll();
    assert.deepEqual(after, before);
  });

  it('[H11-R20] si el usuario cancela la hoja de compartir el estado es cancelled sin mensaje', async () => {
    await saveExpense({ amountCents: 100000, date: '2026-11-01' });
    const delivery = createFakeDelivery({ shareOutcome: 'cancelled' });

    const state = await runExport(delivery, { mode: 'share' });

    assert.equal(state.status, 'cancelled');
    assert.equal(state.message, null);
    assert.equal(delivery.calls[0].method, 'share');

    const shared = await runExport(createFakeDelivery(), { mode: 'share' });
    assert.equal(shared.status, 'done');
  });

  it('[H11-R1] resuelve el nombre de la categoría por id cuando el gasto no lo trae y deja vacío si no existe', async () => {
    const expenseRepository = {
      async findAll() {
        return [
          new Expense({ id: 1, amountCents: 100, date: '2026-11-01', categoryId: 1 }),
          new Expense({ id: 2, amountCents: 200, date: '2026-11-02', categoryId: 999 }),
        ];
      },
    };
    const rows = await loadExpensesForExport({ expenseRepository, categoryRepository: categoryRepo });
    const expectedName = (await categoryRepo.findById(1)).name;
    assert.equal(rows[0].categoryName, expectedName);
    assert.equal(rows[1].categoryName, '');
    assert.deepEqual(buildIdleExportState(), {
      status: 'idle',
      rowCount: 0,
      totalCents: 0,
      fileName: null,
      message: null,
    });
  });
});
