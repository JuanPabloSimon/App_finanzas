import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildSpendingSummary,
  centsToRoundedPesos,
  roundTypicalAmountPesos,
  SUMMARY_MAX_CHARS,
  SUMMARY_OTHERS_NAME,
} from '../../../src/domain/services/spendingSummaryBuilder.js';
import { Expense } from '../../../src/domain/models/expense.js';
import { Category } from '../../../src/domain/models/category.js';
import { MonthlyIncome } from '../../../src/domain/models/monthlyIncome.js';
import { Recurrence } from '../../../src/domain/models/recurrence.js';

const TOP_LEVEL_KEYS = [
  'categorias',
  'ingreso_mensual',
  'moneda',
  'periodo',
  'recurrencias',
  'total_mes',
  'total_mes_anterior',
];
const CATEGORY_KEYS = ['nombre', 'porcentaje', 'total', 'variacion_pct'];
const RECURRENCE_KEYS = ['categoria', 'monto_tipico', 'veces_en_60_dias'];

let nextExpenseId = 1;

function expense({ amountCents, categoryId, date = '2026-11-05', note = null, subcategory = null }) {
  const id = nextExpenseId;
  nextExpenseId += 1;
  return new Expense({
    id,
    amountCents,
    date,
    categoryId,
    note,
    subcategory,
    createdAt: `${date}T10:00:00`,
  });
}

function category(id, name) {
  return new Category({ id, name, isPredefined: false, createdAt: '2026-10-01T00:00:00' });
}

function recurrence({ categoryId = 1, categoryName = 'Delivery', typicalAmountCents, occurrences = 3 }) {
  const expenseIds = Array.from({ length: occurrences }, (_, idx) => 1000 + categoryId * 10 + idx);
  return new Recurrence({ categoryId, categoryName, typicalAmountCents, occurrences, expenseIds });
}

function buildCategories(count, nameFor = (idx) => `Categoría ${idx}`) {
  return Array.from({ length: count }, (_, idx) => category(idx + 1, nameFor(idx + 1)));
}

describe('H10 resumen agregado', () => {
  it('[H10-R1] tiene exactamente las claves del contrato en todos los niveles y está congelado', () => {
    const categories = buildCategories(2);
    const summary = buildSpendingSummary({
      yearMonth: '2026-11',
      expenses: [expense({ amountCents: 100000, categoryId: 1 }), expense({ amountCents: 50000, categoryId: 2 })],
      previousExpenses: [expense({ amountCents: 80000, categoryId: 1, date: '2026-10-05' })],
      categories,
      monthlyIncome: new MonthlyIncome({ yearMonth: '2026-11', amountCents: 9800000 }),
      recurrences: [recurrence({ typicalAmountCents: 650000 })],
    });

    assert.deepEqual(Object.keys(summary).sort(), TOP_LEVEL_KEYS);
    assert.equal(summary.periodo, '2026-11');
    assert.equal(summary.moneda, 'ARS');
    assert.equal(summary.categorias.length, 2);
    for (const item of summary.categorias) {
      assert.deepEqual(Object.keys(item).sort(), CATEGORY_KEYS);
      assert.equal(Object.isFrozen(item), true);
    }
    assert.equal(summary.recurrencias.length, 1);
    for (const item of summary.recurrencias) {
      assert.deepEqual(Object.keys(item).sort(), RECURRENCE_KEYS);
      assert.equal(Object.isFrozen(item), true);
    }
    assert.equal(Object.isFrozen(summary), true);
    assert.equal(Object.isFrozen(summary.categorias), true);
    assert.equal(Object.isFrozen(summary.recurrencias), true);
  });

  it('[H10-R2] no incluye notas, subcategorías, fechas ni identificadores de gastos o categorías', () => {
    const categories = buildCategories(2);
    const summary = buildSpendingSummary({
      yearMonth: '2026-11',
      expenses: [
        expense({ amountCents: 120000, categoryId: 1, note: 'NOTA-SECRETA', subcategory: 'SUB-SECRETA' }),
        expense({ amountCents: 30000, categoryId: 2, date: '2026-11-20', note: 'NOTA-SECRETA' }),
      ],
      previousExpenses: [
        expense({ amountCents: 90000, categoryId: 1, date: '2026-10-11', subcategory: 'SUB-SECRETA' }),
      ],
      categories,
      monthlyIncome: null,
      recurrences: [recurrence({ categoryId: 2, categoryName: 'Categoría 2', typicalAmountCents: 30000 })],
    });
    const serialized = JSON.stringify(summary);

    assert.equal(serialized.includes('NOTA-SECRETA'), false);
    assert.equal(serialized.includes('SUB-SECRETA'), false);
    assert.doesNotMatch(serialized, /\d{4}-\d{2}-\d{2}/);
    for (const key of ['id', 'categoryId', 'expenseIds', 'note', 'subcategory', 'date', 'key', 'createdAt']) {
      assert.equal(serialized.includes(`"${key}"`), false, `no debe contener la clave ${key}`);
    }
    for (const expenseId of [1020, 1021, 1022]) {
      assert.equal(serialized.includes(String(expenseId)), false);
    }
  });

  it('[H10-R4] expresa los totales en pesos enteros con los medios hacia arriba', () => {
    assert.equal(centsToRoundedPesos(12345), 123);
    assert.equal(centsToRoundedPesos(12350), 124);
    assert.equal(centsToRoundedPesos(12349), 123);
    assert.equal(centsToRoundedPesos(0), 0);

    const categories = buildCategories(1);
    const withIncome = buildSpendingSummary({
      yearMonth: '2026-11',
      expenses: [expense({ amountCents: 12350, categoryId: 1 })],
      previousExpenses: [],
      categories,
      monthlyIncome: new MonthlyIncome({ yearMonth: '2026-11', amountCents: 9800050 }),
      recurrences: [],
    });
    assert.equal(withIncome.total_mes, 124);
    assert.equal(withIncome.categorias[0].total, 124);
    assert.equal(withIncome.ingreso_mensual, 98001);
    assert.equal(withIncome.total_mes_anterior, 0);
    for (const value of [withIncome.total_mes, withIncome.total_mes_anterior, withIncome.ingreso_mensual]) {
      assert.equal(Number.isInteger(value), true);
    }

    const withoutIncome = buildSpendingSummary({
      yearMonth: '2026-11',
      expenses: [expense({ amountCents: 12345, categoryId: 1 })],
      previousExpenses: [expense({ amountCents: 12349, categoryId: 1, date: '2026-10-02' })],
      categories,
      monthlyIncome: null,
      recurrences: [],
    });
    assert.equal(withoutIncome.ingreso_mensual, null);
    assert.equal(withoutIncome.total_mes, 123);
    assert.equal(withoutIncome.total_mes_anterior, 123);
  });

  it('[H10-R5] con más de 8 categorías deja las 8 mayores y agrupa el resto en «Otros»', () => {
    const categories = buildCategories(10);
    const expenses = categories.map((cat) =>
      expense({ amountCents: (11 - cat.id) * 100000, categoryId: cat.id }),
    );
    const summary = buildSpendingSummary({
      yearMonth: '2026-11',
      expenses,
      previousExpenses: [],
      categories,
      monthlyIncome: null,
      recurrences: [],
    });

    assert.equal(summary.categorias.length, 9);
    assert.deepEqual(
      summary.categorias.slice(0, 8).map((item) => item.nombre),
      categories.slice(0, 8).map((cat) => cat.name),
    );
    const others = summary.categorias[8];
    assert.equal(others.nombre, SUMMARY_OTHERS_NAME);
    assert.equal(others.total, 2000 + 1000);
    const names = summary.categorias.map((item) => item.nombre);
    assert.equal(new Set(names).size, names.length);
    const sumTenths = summary.categorias.reduce((acc, item) => acc + Math.round(item.porcentaje * 10), 0);
    assert.equal(sumTenths, 1000);
  });

  it('[H10-R5] si «Otros» real está entre las 8 mayores, el resto se suma a esa categoría', () => {
    const categories = buildCategories(10, (id) => (id === 3 ? 'otros' : `Categoría ${id}`));
    const expenses = categories.map((cat) =>
      expense({ amountCents: (11 - cat.id) * 100000, categoryId: cat.id }),
    );
    const summary = buildSpendingSummary({
      yearMonth: '2026-11',
      expenses,
      previousExpenses: [],
      categories,
      monthlyIncome: null,
      recurrences: [],
    });

    assert.equal(summary.categorias.length, 8);
    const others = summary.categorias.find((item) => item.nombre.toLowerCase() === 'otros');
    assert.equal(others.total, 8000 + 2000 + 1000);
    const names = summary.categorias.map((item) => item.nombre.toLowerCase());
    assert.equal(new Set(names).size, names.length);
    const sumTenths = summary.categorias.reduce((acc, item) => acc + Math.round(item.porcentaje * 10), 0);
    assert.equal(sumTenths, 1000);
  });

  it('[H10-R5] con 8 o menos categorías no agrupa, aunque una se llame «Otros»', () => {
    const categories = buildCategories(8, (id) => (id === 8 ? 'Otros' : `Categoría ${id}`));
    const expenses = categories.map((cat) => expense({ amountCents: cat.id * 10000, categoryId: cat.id }));
    const summary = buildSpendingSummary({
      yearMonth: '2026-11',
      expenses,
      previousExpenses: [],
      categories,
      monthlyIncome: null,
      recurrences: [],
    });
    assert.equal(summary.categorias.length, 8);
    assert.equal(summary.categorias[0].nombre, 'Otros');
    assert.equal(summary.categorias[0].total, 800);
    const sumTenths = summary.categorias.reduce((acc, item) => acc + Math.round(item.porcentaje * 10), 0);
    assert.equal(sumTenths, 1000);
  });

  it('[H10-R6] variacion_pct es null sin gasto previo y usa calculateVariationTenths / 10 con gasto previo', () => {
    const categories = buildCategories(2);
    const summary = buildSpendingSummary({
      yearMonth: '2026-11',
      expenses: [
        expense({ amountCents: 450000, categoryId: 1 }),
        expense({ amountCents: 100000, categoryId: 2 }),
      ],
      previousExpenses: [expense({ amountCents: 400000, categoryId: 1, date: '2026-10-10' })],
      categories,
      monthlyIncome: null,
      recurrences: [],
    });
    const byName = new Map(summary.categorias.map((item) => [item.nombre, item]));
    assert.equal(byName.get('Categoría 1').variacion_pct, 12.5);
    assert.equal(byName.get('Categoría 2').variacion_pct, null);
  });

  it('[H10-R6] «Otros» compara contra la suma previa de sus categorías agrupadas', () => {
    const categories = buildCategories(10);
    const expenses = categories.map((cat) =>
      expense({ amountCents: (11 - cat.id) * 100000, categoryId: cat.id }),
    );
    const previousExpenses = [
      expense({ amountCents: 100000, categoryId: 9, date: '2026-10-03' }),
      expense({ amountCents: 100000, categoryId: 10, date: '2026-10-03' }),
    ];
    const summary = buildSpendingSummary({
      yearMonth: '2026-11',
      expenses,
      previousExpenses,
      categories,
      monthlyIncome: null,
      recurrences: [],
    });
    const others = summary.categorias[8];
    assert.equal(others.nombre, 'Otros');
    assert.equal(others.variacion_pct, 50);
    assert.equal(summary.categorias[0].variacion_pct, null);
  });

  it('[H10-R7] incluye como máximo 10 recurrencias en el orden recibido y redondea monto_tipico a $100', () => {
    assert.equal(roundTypicalAmountPesos(650000), 6500);
    assert.equal(roundTypicalAmountPesos(645000), 6500);
    assert.equal(roundTypicalAmountPesos(644900), 6400);
    assert.equal(roundTypicalAmountPesos(4000), 100);

    const recurrences = Array.from({ length: 15 }, (_, idx) =>
      recurrence({
        categoryId: idx + 1,
        categoryName: `Rec ${idx + 1}`,
        typicalAmountCents: idx === 0 ? 645000 : idx === 1 ? 4000 : (idx + 1) * 100000,
        occurrences: 3 + (idx % 2),
      }),
    );
    const summary = buildSpendingSummary({
      yearMonth: '2026-11',
      expenses: [],
      previousExpenses: [],
      categories: [],
      monthlyIncome: null,
      recurrences,
    });
    assert.equal(summary.recurrencias.length, 10);
    assert.deepEqual(
      summary.recurrencias.map((item) => item.categoria),
      recurrences.slice(0, 10).map((item) => item.categoryName),
    );
    assert.equal(summary.recurrencias[0].monto_tipico, 6500);
    assert.equal(summary.recurrencias[1].monto_tipico, 100);
    assert.equal(summary.recurrencias[0].veces_en_60_dias, 3);
    assert.equal(summary.recurrencias[1].veces_en_60_dias, 4);
  });

  it('[H10-R8] con 20 categorías y 20 recurrencias de nombres largos no supera los 6.000 caracteres', () => {
    const longName = (idx) => `Categoría de prueba larga número ${String(idx).padStart(5, '0')}xx`.slice(0, 40).padEnd(40, 'x');
    const categories = buildCategories(20, longName);
    assert.equal(categories[0].name.length, 40);
    const expenses = categories.map((cat) =>
      expense({ amountCents: (900000000 + cat.id * 1111111) * 100, categoryId: cat.id }),
    );
    const previousExpenses = categories.map((cat) =>
      expense({ amountCents: (100000000 + cat.id * 777777) * 100, categoryId: cat.id, date: '2026-10-01' }),
    );
    const recurrences = categories.map((cat) =>
      recurrence({ categoryId: cat.id, categoryName: cat.name, typicalAmountCents: (900000000 + cat.id) * 100, occurrences: 12 }),
    );
    const summary = buildSpendingSummary({
      yearMonth: '2026-11',
      expenses,
      previousExpenses,
      categories,
      monthlyIncome: new MonthlyIncome({ yearMonth: '2026-11', amountCents: 999999999 * 100 }),
      recurrences,
    });
    const serialized = JSON.stringify(summary);
    assert.equal(SUMMARY_MAX_CHARS, 6000);
    assert.ok(serialized.length <= SUMMARY_MAX_CHARS, `largo ${serialized.length}`);
    assert.equal(summary.categorias.length, 9);
    assert.equal(summary.recurrencias.length, 10);
  });

  it('[H10-R34] el fuente del builder no usa red, React ni node:sqlite', () => {
    const source = fs.readFileSync(
      new URL('../../../src/domain/services/spendingSummaryBuilder.js', import.meta.url),
      'utf8',
    );
    for (const forbidden of ['fetch(', 'XMLHttpRequest', 'axios', "from 'react'", 'react-dom', 'node:sqlite']) {
      assert.equal(source.includes(forbidden), false, `no debe contener ${forbidden}`);
    }
  });
});
