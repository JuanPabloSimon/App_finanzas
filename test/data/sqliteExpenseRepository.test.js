import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { AppDatabase, PREDEFINED_CATEGORIES } from '../../src/data/db/appDatabase.js';
import { SqliteCategoryRepository } from '../../src/data/repositories/sqliteCategoryRepository.js';
import { SqliteExpenseRepository } from '../../src/data/repositories/sqliteExpenseRepository.js';
import { Expense } from '../../src/domain/models/expense.js';
import {
  InvalidAmount,
  InvalidCategory,
  ExpenseNotFound,
} from '../../src/core/errors.js';

describe('H1 persistencia de gastos y categorías en SQLite (SqliteCategoryRepository y SqliteExpenseRepository)', () => {
  let db;
  let categoryRepo;
  let expenseRepo;

  beforeEach(async () => {
    db = await AppDatabase.openInMemory();
    categoryRepo = new SqliteCategoryRepository(db);
    expenseRepo = new SqliteExpenseRepository(db);
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  it('[H1-R1] devuelve las categorías predefinidas y prioriza primero las categorías más frecuentes según uso', async () => {
    const initialCategories = await categoryRepo.findAll();
    assert.equal(initialCategories.length, PREDEFINED_CATEGORIES.length);
    assert.equal(initialCategories[0].name, 'Alimentos');
    assert.equal(initialCategories[1].name, 'Transporte');

    const saludCategory = initialCategories.find((cat) => cat.name === 'Salud');
    assert.notEqual(saludCategory, undefined);

    await expenseRepo.save(
      new Expense({
        amountCents: 120000,
        date: '2026-11-01',
        categoryId: saludCategory.id,
        createdAt: '2026-11-01T10:00:00',
      }),
    );
    await expenseRepo.save(
      new Expense({
        amountCents: 90000,
        date: '2026-11-02',
        categoryId: saludCategory.id,
        createdAt: '2026-11-02T10:00:00',
      }),
    );

    const reorderedCategories = await categoryRepo.findAll();
    assert.equal(reorderedCategories[0].name, 'Salud');

    const byId = await categoryRepo.findById(saludCategory.id);
    assert.notEqual(byId, null);
    assert.equal(byId.name, 'Salud');
    assert.equal(await categoryRepo.findById(9999), null);
  });

  it('[H1-R2] guarda un gasto válido en la tabla expenses con amount_cents entero > 0 y marcas ISO 8601 y lo recupera por mes', async () => {
    const saved = await expenseRepo.save(
      new Expense({
        amountCents: 245050,
        date: '2026-11-06',
        categoryId: 1,
        subcategory: 'Almacén',
        note: 'Compras del día',
        createdAt: '2026-11-06T14:20:30',
        updatedAt: '2026-11-06T14:20:30',
      }),
    );

    assert.equal(saved.id, 1);
    assert.equal(saved.amountCents, 245050);
    assert.equal(saved.date, '2026-11-06');
    assert.equal(saved.categoryId, 1);
    assert.equal(saved.categoryName, 'Alimentos');
    assert.equal(saved.subcategory, 'Almacén');
    assert.equal(saved.note, 'Compras del día');
    assert.equal(saved.createdAt, '2026-11-06T14:20:30');
    assert.equal(saved.updatedAt, '2026-11-06T14:20:30');

    const rawRow = await db.get('SELECT * FROM expenses WHERE id = ?', [saved.id]);
    assert.equal(rawRow.amount_cents, 245050);
    assert.equal(rawRow.date, '2026-11-06');
    assert.equal(rawRow.category_id, 1);
    assert.equal(rawRow.created_at, '2026-11-06T14:20:30');
    assert.equal(rawRow.updated_at, '2026-11-06T14:20:30');

    const novExpenses = await expenseRepo.findByYearMonth('2026-11');
    assert.equal(novExpenses.length, 1);
    assert.equal(novExpenses[0].isEqual(saved), true);

    const octExpenses = await expenseRepo.findByYearMonth('2026-10');
    assert.equal(octExpenses.length, 0);
  });

  it('[H1-R4] no guarda gastos con monto cero, negativo o inválido ni con categoría inexistente', async () => {
    await assert.rejects(
      () =>
        expenseRepo.save({
          amountCents: 0,
          date: '2026-11-06',
          categoryId: 1,
        }),
      InvalidAmount,
    );

    await assert.rejects(
      () =>
        expenseRepo.save({
          amountCents: -5000,
          date: '2026-11-06',
          categoryId: 1,
        }),
      InvalidAmount,
    );

    await assert.rejects(
      () =>
        expenseRepo.save(
          new Expense({
            amountCents: 10000,
            date: '2026-11-06',
            categoryId: 999,
          }),
        ),
      InvalidCategory,
    );

    const rows = await db.all('SELECT * FROM expenses');
    assert.equal(rows.length, 0);
  });

  it('[H1-R6] persiste null en las columnas subcategory y note cuando se dejan vacías', async () => {
    const saved = await expenseRepo.save(
      new Expense({
        amountCents: 75000,
        date: '2026-11-05',
        categoryId: 2,
        subcategory: '   ',
        note: '',
        createdAt: '2026-11-05T09:15:00',
      }),
    );

    assert.equal(saved.subcategory, null);
    assert.equal(saved.note, null);

    const rawRow = await db.get('SELECT subcategory, note FROM expenses WHERE id = ?', [
      saved.id,
    ]);
    assert.equal(rawRow.subcategory, null);
    assert.equal(rawRow.note, null);
  });

  it('[H1-R7] persiste los textos recortados (trim) de subcategoría y nota en la tabla expenses', async () => {
    const saved = await expenseRepo.save(
      new Expense({
        amountCents: 180000,
        date: '2026-11-06',
        categoryId: 3,
        subcategory: '  Electricidad ',
        note: '  Factura mensual Edesur ',
        createdAt: '2026-11-06T18:00:00',
      }),
    );

    assert.equal(saved.subcategory, 'Electricidad');
    assert.equal(saved.note, 'Factura mensual Edesur');

    const list = await expenseRepo.findByYearMonth('2026-11');
    assert.equal(list.length, 1);
    assert.equal(list[0].subcategory, 'Electricidad');
    assert.equal(list[0].note, 'Factura mensual Edesur');
    assert.equal(list[0].categoryName, 'Servicios');
  });

  it('[H2-R2] actualiza un gasto existente en SQLite conservando id y created_at original y actualizando updated_at en formato ISO 8601', async () => {
    const original = await expenseRepo.save(
      new Expense({
        amountCents: 150000,
        date: '2026-11-04',
        categoryId: 1,
        subcategory: 'Panadería',
        note: 'Facturas',
        createdAt: '2026-11-04T08:30:00',
        updatedAt: '2026-11-04T08:30:00',
      }),
    );

    const foundBefore = await expenseRepo.findById(original.id);
    assert.notEqual(foundBefore, null);
    assert.equal(foundBefore.isEqual(original), true);
    assert.equal(await expenseRepo.findById(999), null);

    const updated = await expenseRepo.update(
      original.copyWith({
        amountCents: 195050,
        date: '2026-11-05',
        categoryId: 2,
        subcategory: '  Colectivo ',
        note: '  Viaje ida y vuelta ',
        updatedAt: '2026-11-06T19:45:10',
      }),
    );

    assert.equal(updated.id, original.id);
    assert.equal(updated.amountCents, 195050);
    assert.equal(updated.date, '2026-11-05');
    assert.equal(updated.categoryId, 2);
    assert.equal(updated.categoryName, 'Transporte');
    assert.equal(updated.subcategory, 'Colectivo');
    assert.equal(updated.note, 'Viaje ida y vuelta');
    assert.equal(updated.createdAt, '2026-11-04T08:30:00');
    assert.equal(updated.updatedAt, '2026-11-06T19:45:10');

    const rawRow = await db.get('SELECT * FROM expenses WHERE id = ?', [original.id]);
    assert.equal(rawRow.amount_cents, 195050);
    assert.equal(rawRow.date, '2026-11-05');
    assert.equal(rawRow.category_id, 2);
    assert.equal(rawRow.subcategory, 'Colectivo');
    assert.equal(rawRow.note, 'Viaje ida y vuelta');
    assert.equal(rawRow.created_at, '2026-11-04T08:30:00');
    assert.equal(rawRow.updated_at, '2026-11-06T19:45:10');
  });

  it('[H2-R4] no modifica la base de datos y lanza InvalidAmount, InvalidCategory o ExpenseNotFound cuando la actualización o eliminación es inválida', async () => {
    const saved = await expenseRepo.save(
      new Expense({
        amountCents: 120000,
        date: '2026-11-06',
        categoryId: 1,
        note: 'Gasto intacto',
        createdAt: '2026-11-06T10:00:00',
        updatedAt: '2026-11-06T10:00:00',
      }),
    );

    await assert.rejects(
      () =>
        expenseRepo.update({
          id: saved.id,
          amountCents: 0,
          date: '2026-11-06',
          categoryId: 1,
        }),
      InvalidAmount,
    );

    await assert.rejects(
      () =>
        expenseRepo.update({
          id: saved.id,
          amountCents: -5000,
          date: '2026-11-06',
          categoryId: 1,
        }),
      InvalidAmount,
    );

    await assert.rejects(
      () =>
        expenseRepo.update(
          saved.copyWith({
            categoryId: 9999,
          }),
        ),
      InvalidCategory,
    );

    await assert.rejects(
      () =>
        expenseRepo.update(
          new Expense({
            id: 999,
            amountCents: 50000,
            date: '2026-11-06',
            categoryId: 1,
          }),
        ),
      ExpenseNotFound,
    );

    await assert.rejects(() => expenseRepo.deleteById(999), ExpenseNotFound);
    await assert.rejects(() => expenseRepo.deleteById(0), ExpenseNotFound);

    const persisted = await expenseRepo.findById(saved.id);
    assert.equal(persisted.amountCents, 120000);
    assert.equal(persisted.note, 'Gasto intacto');
  });

  it('[H2-R7] elimina físicamente el gasto de la tabla expenses en SQLite al ejecutar deleteById', async () => {
    const first = await expenseRepo.save(
      new Expense({
        amountCents: 100000,
        date: '2026-11-05',
        categoryId: 1,
        createdAt: '2026-11-05T10:00:00',
      }),
    );
    const second = await expenseRepo.save(
      new Expense({
        amountCents: 250000,
        date: '2026-11-06',
        categoryId: 2,
        createdAt: '2026-11-06T11:00:00',
      }),
    );

    const deleted = await expenseRepo.deleteById(first.id);
    assert.equal(deleted, true);
    assert.equal(await expenseRepo.findById(first.id), null);

    const remaining = await expenseRepo.findByYearMonth('2026-11');
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].id, second.id);
    assert.equal(remaining[0].amountCents, 250000);
  });

  it('[H3-R1][H3-R5] devuelve los gastos del período ordenados por fecha descendente (y id descendente) y aísla los registros al consultar el mes anterior', async () => {
    await expenseRepo.save(
      new Expense({
        amountCents: 95000,
        date: '2026-10-25',
        categoryId: 1,
        note: 'Gasto de octubre',
        createdAt: '2026-10-25T10:00:00',
      }),
    );
    const novDay2 = await expenseRepo.save(
      new Expense({
        amountCents: 110000,
        date: '2026-11-02',
        categoryId: 1,
        note: 'Día 2',
        createdAt: '2026-11-02T09:00:00',
      }),
    );
    const novDay6First = await expenseRepo.save(
      new Expense({
        amountCents: 130000,
        date: '2026-11-06',
        categoryId: 2,
        note: 'Día 6 mañana',
        createdAt: '2026-11-06T09:00:00',
      }),
    );
    const novDay6Second = await expenseRepo.save(
      new Expense({
        amountCents: 170000,
        date: '2026-11-06',
        categoryId: 3,
        note: 'Día 6 tarde',
        createdAt: '2026-11-06T18:00:00',
      }),
    );

    const novList = await expenseRepo.findByYearMonth('2026-11');
    assert.equal(novList.length, 3);
    assert.deepEqual(
      novList.map((e) => e.id),
      [novDay6Second.id, novDay6First.id, novDay2.id],
    );

    const octList = await expenseRepo.findByYearMonth('2026-10');
    assert.equal(octList.length, 1);
    assert.equal(octList[0].note, 'Gasto de octubre');
    assert.equal(octList[0].amountCents, 95000);
  });
});
