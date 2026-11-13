import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  InvalidAmount,
  InvalidExpenseDate,
  InvalidCategory,
  DuplicateCategory,
  CategoryNotFound,
  PredefinedCategoryDeletionNotAllowed,
  CategoryInUse,
  ExpenseNotFound,
} from '../../../src/core/errors.js';
import {
  isValidIsoDate,
  formatIsoDate,
  extractYearMonth,
  isValidYearMonth,
  shiftYearMonth,
  formatYearMonthLabel,
} from '../../../src/core/dates.js';
import {
  parseAmountToCents,
  formatCentsToArs,
  formatCentsToInput,
} from '../../../src/core/formatters.js';
import { Category } from '../../../src/domain/models/category.js';
import { Expense } from '../../../src/domain/models/expense.js';
import { CategoryRepository } from '../../../src/domain/repositories/categoryRepository.js';
import { ExpenseRepository } from '../../../src/domain/repositories/expenseRepository.js';

describe('H1 modelos de dominio Expense y Category, conversión a centavos y contratos', () => {
  it('[H1-R2] convierte montos válidos en pesos a enteros en centavos, formatea a moneda ARS y crea instancias inmutables de Expense y Category', () => {
    assert.equal(parseAmountToCents('1500'), 150000);
    assert.equal(parseAmountToCents('1500.5'), 150050);
    assert.equal(parseAmountToCents('1500,50'), 150050);
    assert.equal(parseAmountToCents('0,05'), 5);
    assert.equal(parseAmountToCents(250.75), 25075);

    assert.equal(formatCentsToArs(150000), '$ 1.500');
    assert.equal(formatCentsToArs(150050), '$ 1.500,50');
    assert.equal(formatCentsToArs(5), '$ 0,05');

    const formattedDate = formatIsoDate(new Date(2026, 10, 6));
    assert.equal(formattedDate, '2026-11-06');
    assert.equal(isValidIsoDate(formattedDate), true);
    assert.equal(extractYearMonth(formattedDate), '2026-11');

    const category = new Category({
      id: 1,
      name: '  Alimentos  ',
      isPredefined: true,
      createdAt: '2026-11-01T10:00:00',
    });
    assert.equal(category.id, 1);
    assert.equal(category.name, 'Alimentos');
    assert.equal(category.isPredefined, true);
    assert.equal(Object.isFrozen(category), true);
    assert.equal(category.isEqual(category.copyWith({})), true);
    assert.equal(category.isEqual(category.copyWith({ name: 'Transporte' })), false);

    const expense = new Expense({
      id: 10,
      amountCents: 150050,
      date: '2026-11-06',
      categoryId: 1,
      categoryName: 'Alimentos',
      subcategory: 'Verdulería',
      note: 'Compra semanal',
      createdAt: '2026-11-06T12:00:00',
      updatedAt: '2026-11-06T12:00:00',
    });

    assert.equal(expense.id, 10);
    assert.equal(expense.amountCents, 150050);
    assert.equal(Number.isInteger(expense.amountCents), true);
    assert.equal(expense.date, '2026-11-06');
    assert.equal(expense.categoryId, 1);
    assert.equal(expense.categoryName, 'Alimentos');
    assert.equal(expense.subcategory, 'Verdulería');
    assert.equal(expense.note, 'Compra semanal');
    assert.equal(Object.isFrozen(expense), true);

    assert.throws(() => {
      expense.amountCents = 999;
    }, TypeError);

    const updated = expense.copyWith({ amountCents: 200000 });
    assert.equal(updated.amountCents, 200000);
    assert.equal(expense.isEqual(updated), false);
    assert.equal(expense.isEqual(expense.copyWith({})), true);
  });

  it('[H1-R4] rechaza montos vacíos, no numéricos, cero, negativos o en coma flotante en parseAmountToCents y Expense lanzando InvalidAmount', () => {
    for (const invalidInput of ['', '   ', null, undefined, 'abc', '0', '0,00', '-150', -10, 0, '12.345']) {
      assert.throws(() => parseAmountToCents(invalidInput), InvalidAmount);
    }

    for (const invalidCents of [0, -100, 150.5, Number.NaN, '1500', null]) {
      assert.throws(
        () =>
          new Expense({
            amountCents: invalidCents,
            date: '2026-11-06',
            categoryId: 1,
            createdAt: '2026-11-06T12:00:00',
          }),
        InvalidAmount,
      );
    }

    assert.throws(
      () =>
        new Expense({
          amountCents: 1000,
          date: '2026-02-30',
          categoryId: 1,
        }),
      InvalidExpenseDate,
    );

    assert.throws(
      () =>
        new Expense({
          amountCents: 1000,
          date: '2026-11-06',
          categoryId: 0,
        }),
      InvalidCategory,
    );
  });

  it('[H1-R6] normaliza subcategoría y nota vacías o con solo espacios a null en Expense', () => {
    const expenseEmpty = new Expense({
      amountCents: 50000,
      date: '2026-11-06',
      categoryId: 2,
      subcategory: '',
      note: '    ',
      createdAt: '2026-11-06T10:30:00',
    });

    assert.equal(expenseEmpty.subcategory, null);
    assert.equal(expenseEmpty.note, null);

    const expenseDefault = new Expense({
      amountCents: 50000,
      date: '2026-11-06',
      categoryId: 2,
    });
    assert.equal(expenseDefault.subcategory, null);
    assert.equal(expenseDefault.note, null);
  });

  it('[H1-R7] conserva y recorta (trim) los valores de texto en subcategoría y nota cuando se completan', async () => {
    const expenseWithDetails = new Expense({
      amountCents: 85000,
      date: '2026-11-06',
      categoryId: 1,
      subcategory: '  Supermercado  ',
      note: '  Leche y pan  ',
      createdAt: '2026-11-06T11:00:00',
    });

    assert.equal(expenseWithDetails.subcategory, 'Supermercado');
    assert.equal(expenseWithDetails.note, 'Leche y pan');

    const catRepo = new CategoryRepository();
    await assert.rejects(() => catRepo.findAll(), /Not implemented/);
    await assert.rejects(() => catRepo.findById(1), /Not implemented/);

    const expRepo = new ExpenseRepository();
    await assert.rejects(() => expRepo.save(expenseWithDetails), /Not implemented/);
    await assert.rejects(() => expRepo.findByYearMonth('2026-11'), /Not implemented/);
  });

  it('[H2-R2] formatea centavos a cadena editable con formatCentsToInput y conserva createdAt al crear una copia actualizada de Expense', () => {
    assert.equal(formatCentsToInput(150000), '1500');
    assert.equal(formatCentsToInput(150050), '1500,50');
    assert.equal(formatCentsToInput(5), '0,05');

    const original = new Expense({
      id: 7,
      amountCents: 150000,
      date: '2026-11-06',
      categoryId: 1,
      categoryName: 'Alimentos',
      subcategory: 'Almacén',
      note: 'Original',
      createdAt: '2026-11-06T09:00:00',
      updatedAt: '2026-11-06T09:00:00',
    });

    const edited = original.copyWith({
      amountCents: 210075,
      categoryId: 2,
      categoryName: 'Transporte',
      subcategory: 'Subte',
      note: 'Editado',
      updatedAt: '2026-11-10T14:30:00',
    });

    assert.equal(edited.id, 7);
    assert.equal(edited.amountCents, 210075);
    assert.equal(edited.categoryId, 2);
    assert.equal(edited.categoryName, 'Transporte');
    assert.equal(edited.subcategory, 'Subte');
    assert.equal(edited.note, 'Editado');
    assert.equal(edited.createdAt, '2026-11-06T09:00:00');
    assert.equal(edited.updatedAt, '2026-11-10T14:30:00');
    assert.equal(Object.isFrozen(edited), true);
  });

  it('[H2-R4] define la excepción ExpenseNotFound, valida formatCentsToInput ante importes inválidos y expone findById, update y deleteById en ExpenseRepository', async () => {
    const notFound = new ExpenseNotFound(42);
    assert.equal(notFound instanceof Error, true);
    assert.equal(notFound.name, 'ExpenseNotFound');
    assert.equal(notFound.expenseId, 42);
    assert.equal(notFound.message, 'No existe el gasto 42');

    for (const invalidCents of [0, -100, 15.5, null, undefined, '1500']) {
      assert.throws(() => formatCentsToInput(invalidCents), InvalidAmount);
    }

    const expRepo = new ExpenseRepository();
    await assert.rejects(() => expRepo.findById(1), /Not implemented/);
    await assert.rejects(() => expRepo.update({ id: 1 }), /Not implemented/);
    await assert.rejects(() => expRepo.deleteById(1), /Not implemented/);
  });

  it('[H3-R5] calcula correctamente el mes anterior y el mes siguiente en formato YYYY-MM incluyendo el cambio de año y formatea la etiqueta mensual', () => {
    assert.equal(isValidYearMonth('2026-11'), true);
    assert.equal(isValidYearMonth('2026-01'), true);
    assert.equal(shiftYearMonth('2026-11', -1), '2026-10');
    assert.equal(shiftYearMonth('2026-10', 1), '2026-11');
    assert.equal(shiftYearMonth('2026-01', -1), '2025-12');
    assert.equal(shiftYearMonth('2025-12', 1), '2026-01');
    assert.equal(shiftYearMonth('2026-11', 0), '2026-11');
    assert.equal(formatYearMonthLabel('2026-11'), 'Noviembre 2026 (2026-11)');
    assert.equal(formatYearMonthLabel('2025-12'), 'Diciembre 2025 (2025-12)');
  });

  it('[H3-R7] rechaza períodos mensuales inválidos en shiftYearMonth y formatYearMonthLabel lanzando InvalidExpenseDate', () => {
    for (const badPeriod of ['', '2026', '2026-00', '2026-13', '2026-1', '11-2026', null, undefined]) {
      assert.equal(isValidYearMonth(badPeriod), false);
      assert.throws(() => shiftYearMonth(badPeriod, -1), InvalidExpenseDate);
      assert.throws(() => formatYearMonthLabel(badPeriod), InvalidExpenseDate);
    }
    assert.throws(() => shiftYearMonth('2026-11', 1.5), InvalidExpenseDate);
  });

  it('[H4-R1][H4-R3] crea borradores de categorías propias inmutables (id = null, isPredefined = false) recortando espacios y rechaza nombres vacíos o fechas inválidas con InvalidCategory', () => {
    const draft = new Category({
      name: '   Mascotas   ',
      createdAt: '2026-11-11T10:15:00',
    });
    assert.equal(draft.id, null);
    assert.equal(draft.name, 'Mascotas');
    assert.equal(draft.isPredefined, false);
    assert.equal(draft.createdAt, '2026-11-11T10:15:00');
    assert.equal(Object.isFrozen(draft), true);

    const persisted = draft.copyWith({ id: 15 });
    assert.equal(persisted.id, 15);
    assert.equal(persisted.name, 'Mascotas');
    assert.equal(persisted.isPredefined, false);

    for (const badName of ['', '   ', '\t\n', null, undefined, 123]) {
      assert.throws(() => new Category({ name: badName }), InvalidCategory);
    }

    for (const badId of [0, -1, 1.5, '1']) {
      assert.throws(() => new Category({ id: badId, name: 'Mascotas' }), InvalidCategory);
    }

    assert.throws(
      () => new Category({ name: 'Mascotas', createdAt: '2026-11-11' }),
      InvalidCategory,
    );
  });

  it('[H4-R4][H4-R5][H4-R7] define las excepciones DuplicateCategory, CategoryNotFound, PredefinedCategoryDeletionNotAllowed y CategoryInUse y extiende los contratos de CategoryRepository y ExpenseRepository', async () => {
    const duplicate = new DuplicateCategory('Mascotas');
    assert.equal(duplicate.name, 'DuplicateCategory');
    assert.equal(duplicate.categoryName, 'Mascotas');
    assert.match(duplicate.message, /Mascotas/);

    const notFound = new CategoryNotFound(99);
    assert.equal(notFound.name, 'CategoryNotFound');
    assert.equal(notFound.categoryId, 99);
    assert.match(notFound.message, /99/);

    const predefinedError = new PredefinedCategoryDeletionNotAllowed('Alimentos');
    assert.equal(predefinedError.name, 'PredefinedCategoryDeletionNotAllowed');
    assert.match(predefinedError.message, /Alimentos/);

    const inUse = new CategoryInUse(12, 3);
    assert.equal(inUse.name, 'CategoryInUse');
    assert.equal(inUse.categoryId, 12);
    assert.equal(inUse.expenseCount, 3);
    assert.match(inUse.message, /3 gasto\(s\)/);

    const catRepo = new CategoryRepository();
    await assert.rejects(() => catRepo.findByName('Mascotas'), /Not implemented/);
    await assert.rejects(
      () => catRepo.save(new Category({ name: 'Mascotas' })),
      /Not implemented/,
    );
    await assert.rejects(() => catRepo.countExpenses(1), /Not implemented/);
    await assert.rejects(
      () => catRepo.deleteById(11, { reassignToCategoryId: 1 }),
      /Not implemented/,
    );

    const expRepo = new ExpenseRepository();
    await assert.rejects(() => expRepo.countByCategoryId(1), /Not implemented/);
    await assert.rejects(() => expRepo.reassignCategory(11, 1), /Not implemented/);
  });
});
