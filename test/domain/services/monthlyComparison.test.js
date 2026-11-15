import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  COMPARISON_WINDOW_MONTHS,
  buildMonthlyComparison,
  calculateVariationTenths,
} from '../../../src/domain/services/monthlyComparison.js';
import { InvalidAmount, InvalidExpenseDate } from '../../../src/core/errors.js';

function monthsOf(comparison) {
  return comparison.previousMonths.map((month) => [month.yearMonth, month.totalCents]);
}

function assertNoNonFiniteValues(comparison) {
  const values = [
    comparison.currentTotalCents,
    comparison.previousTotalCents,
    comparison.variationTenths,
    ...comparison.previousMonths.map((month) => month.totalCents),
  ];
  for (const value of values) {
    if (value !== null) {
      assert.equal(Number.isFinite(value), true);
    }
  }
}

describe('H7 comparación mensual', () => {
  it('[H7-R1] toma como mes actual el mes seleccionado y su total en centavos tal como se recibe', () => {
    const comparison = buildMonthlyComparison({
      activeYearMonth: '2026-08',
      currentTotalCents: 412500,
      previousMonthlyTotals: [{ yearMonth: '2026-07', totalCents: 389000 }],
    });

    assert.equal(comparison.activeYearMonth, '2026-08');
    assert.equal(comparison.currentTotalCents, 412500);
    assert.equal(Number.isInteger(comparison.currentTotalCents), true);
    assert.equal(Object.isFrozen(comparison), true);
    assert.equal(Object.isFrozen(comparison.previousMonths), true);
  });

  it('[H7-R2] incluye como máximo los cinco meses anteriores de la ventana, del más reciente al más antiguo, aun con entrada desordenada y cruce de año', () => {
    assert.equal(COMPARISON_WINDOW_MONTHS, 5);

    const comparison = buildMonthlyComparison({
      activeYearMonth: '2026-02',
      currentTotalCents: 1000,
      previousMonthlyTotals: [
        { yearMonth: '2025-10', totalCents: 400 },
        { yearMonth: '2026-01', totalCents: 100 },
        { yearMonth: '2025-08', totalCents: 9999 },
        { yearMonth: '2025-09', totalCents: 500 },
        { yearMonth: '2026-03', totalCents: 7777 },
        { yearMonth: '2025-12', totalCents: 200 },
        { yearMonth: '2025-11', totalCents: 300 },
      ],
    });

    assert.deepEqual(monthsOf(comparison), [
      ['2026-01', 100],
      ['2025-12', 200],
      ['2025-11', 300],
      ['2025-10', 400],
      ['2025-09', 500],
    ]);
    for (const month of comparison.previousMonths) {
      assert.equal(month.yearMonth < comparison.activeYearMonth, true);
    }
  });

  it('[H7-R3] incluye con total 0 los meses sin gastos ubicados entre el mes actual y el mes de inicio de la serie', () => {
    const comparison = buildMonthlyComparison({
      activeYearMonth: '2026-11',
      currentTotalCents: 5000,
      previousMonthlyTotals: [
        { yearMonth: '2026-10', totalCents: 3000 },
        { yearMonth: '2026-07', totalCents: 2000 },
      ],
    });

    assert.deepEqual(monthsOf(comparison), [
      ['2026-10', 3000],
      ['2026-09', 0],
      ['2026-08', 0],
      ['2026-07', 2000],
    ]);
  });

  it('[H7-R4] no incluye los meses de la ventana más antiguos que el mes de inicio de la serie', () => {
    const comparison = buildMonthlyComparison({
      activeYearMonth: '2026-11',
      currentTotalCents: 5000,
      previousMonthlyTotals: [
        { yearMonth: '2026-10', totalCents: 3000 },
        { yearMonth: '2026-08', totalCents: 1000 },
        { yearMonth: '2026-07', totalCents: 0 },
        { yearMonth: '2026-06', totalCents: 0 },
      ],
    });

    assert.deepEqual(monthsOf(comparison), [
      ['2026-10', 3000],
      ['2026-09', 0],
      ['2026-08', 1000],
    ]);
    assert.equal(comparison.previousMonths.some((m) => m.yearMonth === '2026-07'), false);
    assert.equal(comparison.previousMonths.some((m) => m.yearMonth === '2026-06'), false);
  });

  it('[H7-R5] calcula la variación en décimas de punto con redondeo de empates lejos del cero y aritmética entera', () => {
    const cases = [
      [412500, 389000, 60],
      [2001, 2000, 1],
      [1999, 2000, -1],
      [0, 5000, -1000],
      [15000, 10000, 500],
      [10000, 10000, 0],
      [1, 3, -667],
      [Number.MAX_SAFE_INTEGER, 1, 9007199254740990000],
    ];
    for (const [current, previous, expected] of cases) {
      const result = calculateVariationTenths(current, previous);
      assert.equal(result, expected, `${current} vs ${previous}`);
      assert.equal(Number.isInteger(result), true);
    }

    const comparison = buildMonthlyComparison({
      activeYearMonth: '2026-11',
      currentTotalCents: 412500,
      previousMonthlyTotals: [{ yearMonth: '2026-10', totalCents: 389000 }],
    });
    assert.equal(comparison.previousTotalCents, 389000);
    assert.equal(comparison.variationTenths, 60);
  });

  it('[H7-R6] si el mes anterior tiene total 0 la variación es null, sin NaN ni infinitos', () => {
    assert.equal(calculateVariationTenths(5000, 0), null);
    assert.equal(calculateVariationTenths(0, 0), null);

    const comparison = buildMonthlyComparison({
      activeYearMonth: '2026-11',
      currentTotalCents: 5000,
      previousMonthlyTotals: [
        { yearMonth: '2026-10', totalCents: 0 },
        { yearMonth: '2026-09', totalCents: 4000 },
      ],
    });

    assert.equal(comparison.hasPreviousData, true);
    assert.equal(comparison.previousTotalCents, 0);
    assert.equal(comparison.variationTenths, null);
    assertNoNonFiniteValues(comparison);
  });

  it('[H7-R7] si ningún mes de la ventana tiene gastos informa que no hay datos previos', () => {
    const expectEmpty = (comparison) => {
      assert.equal(comparison.hasPreviousData, false);
      assert.deepEqual(comparison.previousMonths, []);
      assert.equal(comparison.previousTotalCents, null);
      assert.equal(comparison.variationTenths, null);
      assertNoNonFiniteValues(comparison);
    };

    expectEmpty(buildMonthlyComparison({ activeYearMonth: '2026-11', currentTotalCents: 5000 }));
    expectEmpty(
      buildMonthlyComparison({
        activeYearMonth: '2026-11',
        currentTotalCents: 0,
        previousMonthlyTotals: [
          { yearMonth: '2026-10', totalCents: 0 },
          { yearMonth: '2026-05', totalCents: 8000 },
        ],
      }),
    );
  });

  it('[H7-R15] expone calculateVariationTenths y buildMonthlyComparison la usa para la variación', () => {
    assert.equal(typeof calculateVariationTenths, 'function');
    const pairs = [
      [15000, 10000],
      [1, 3],
      [1999, 2000],
      [0, 5000],
    ];
    for (const [current, previous] of pairs) {
      const comparison = buildMonthlyComparison({
        activeYearMonth: '2026-11',
        currentTotalCents: current,
        previousMonthlyTotals: [{ yearMonth: '2026-10', totalCents: previous }],
      });
      assert.equal(comparison.variationTenths, calculateVariationTenths(current, previous));
    }
  });

  it('[H7-R16] lanza InvalidAmount ante totales que no son enteros seguros no negativos', () => {
    const invalidValues = [1.5, -1, '100', NaN, 2 ** 53];
    for (const value of invalidValues) {
      assert.throws(() => calculateVariationTenths(value, 100), InvalidAmount);
      assert.throws(() => calculateVariationTenths(100, value), InvalidAmount);
      assert.throws(
        () => buildMonthlyComparison({ activeYearMonth: '2026-11', currentTotalCents: value }),
        InvalidAmount,
      );
      assert.throws(
        () =>
          buildMonthlyComparison({
            activeYearMonth: '2026-11',
            currentTotalCents: 100,
            previousMonthlyTotals: [{ yearMonth: '2026-10', totalCents: value }],
          }),
        InvalidAmount,
      );
    }
    assert.throws(
      () => buildMonthlyComparison({ activeYearMonth: '2026-13', currentTotalCents: 100 }),
      InvalidExpenseDate,
    );
  });

  it('[H7-R17] el módulo de dominio de la comparación no importa react, react-dom, node:sqlite ni clientes HTTP', async () => {
    const source = await readFile(
      new URL('../../../src/domain/services/monthlyComparison.js', import.meta.url),
      'utf8',
    );

    assert.doesNotMatch(source, /from\s+['"]react['"]/);
    assert.doesNotMatch(source, /from\s+['"]react-dom/);
    assert.doesNotMatch(source, /node:sqlite/);
    assert.doesNotMatch(source, /axios/);
    assert.doesNotMatch(source, /fetch\(/);
  });
});
