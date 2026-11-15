import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  compareCategoryTotals,
  buildCategoryRanking,
} from '../../../src/domain/services/categoryRanking.js';
import { calculateCategoryIncomeBreakdown } from '../../../src/domain/models/monthlyIncome.js';

function entry(categoryId, categoryName, amountCents, expensePercentage = 0) {
  return { categoryId, categoryName, amountCents, expensePercentage };
}

function expense(categoryId, amountCents, categoryName = undefined) {
  return { categoryId, amountCents, categoryName };
}

describe('H8 ranking de categorías', () => {
  it('[H8-R1] incluye una entrada por categoría con gasto en el mes, con montos sumados en centavos enteros y sin categorías sin gasto ni montos no positivos', () => {
    const categories = [
      { id: 1, name: 'Alimentos' },
      { id: 2, name: 'Transporte' },
      { id: 3, name: 'Servicios' },
      { id: 4, name: 'Salud' },
    ];
    const breakdown = calculateCategoryIncomeBreakdown(
      [
        expense(1, 1050),
        expense(1, 2575),
        expense(2, 999),
        expense(3, 0),
        expense(3, -500),
      ],
      categories,
      null,
    );

    const ranking = buildCategoryRanking(breakdown);

    assert.equal(ranking.length, 2);
    assert.deepEqual(
      ranking.map((item) => [item.categoryId, item.categoryName, item.amountCents]),
      [
        [1, 'Alimentos', 3625],
        [2, 'Transporte', 999],
      ],
    );
    assert.equal(ranking.every((item) => Number.isInteger(item.amountCents)), true);
    assert.equal(ranking.some((item) => item.categoryId === 3 || item.categoryId === 4), false);

    const filtered = buildCategoryRanking([
      entry(1, 'Alimentos', 500, 100),
      entry(2, 'Transporte', 0, 0),
      entry(3, 'Servicios', -10, 0),
      entry(4, 'Salud', 10.5, 0),
    ]);
    assert.deepEqual(
      filtered.map((item) => item.categoryId),
      [1],
    );
  });

  it('[H8-R2] ordena de mayor a menor monto aunque la entrada llegue desordenada', () => {
    const ranking = buildCategoryRanking([
      entry(1, 'Alimentos', 1000, 10),
      entry(2, 'Transporte', 5000, 50),
      entry(3, 'Servicios', 3000, 30),
      entry(4, 'Salud', 1001, 10),
    ]);

    assert.deepEqual(
      ranking.map((item) => item.amountCents),
      [5000, 3000, 1001, 1000],
    );
    assert.equal(compareCategoryTotals(entry(1, 'A', 100), entry(2, 'B', 200)) > 0, true);
    assert.equal(compareCategoryTotals(entry(1, 'A', 200), entry(2, 'B', 100)) < 0, true);
  });

  it('[H8-R3] ante montos iguales ordena alfabéticamente sin distinguir mayúsculas ni acentos y con la ñ después de la n', () => {
    const byCase = buildCategoryRanking([
      entry(2, 'Bazar', 1000, 50),
      entry(1, 'alimentos', 1000, 50),
    ]);
    assert.deepEqual(
      byCase.map((item) => item.categoryName),
      ['alimentos', 'Bazar'],
    );

    const byAccent = buildCategoryRanking([
      entry(5, 'Panadería', 2000, 50),
      entry(6, 'Óptica', 2000, 50),
    ]);
    assert.deepEqual(
      byAccent.map((item) => item.categoryName),
      ['Óptica', 'Panadería'],
    );

    const byEnie = buildCategoryRanking([
      entry(8, 'Ñoquis', 3000, 50),
      entry(9, 'Nafta', 3000, 50),
      entry(10, 'Ocio', 3000, 0),
    ]);
    assert.deepEqual(
      byEnie.map((item) => item.categoryName),
      ['Nafta', 'Ñoquis', 'Ocio'],
    );
  });

  it('[H8-R4] ante montos iguales y nombres equivalentes para el locale es desempata por categoryId ascendente sin depender del orden de entrada', () => {
    const cafeAccent = entry(7, 'Café', 1500, 50);
    const cafePlain = entry(3, 'Cafe', 1500, 50);

    const ranking1 = buildCategoryRanking([cafeAccent, cafePlain]);
    const ranking2 = buildCategoryRanking([cafePlain, cafeAccent]);

    assert.deepEqual(
      ranking1.map((item) => item.categoryId),
      [3, 7],
    );
    assert.deepEqual(
      ranking2.map((item) => item.categoryId),
      [3, 7],
    );
    assert.equal(compareCategoryTotals(cafePlain, cafeAccent) < 0, true);
    assert.equal(compareCategoryTotals(cafeAccent, cafePlain) > 0, true);
  });

  it('[H8-R5] asigna posiciones consecutivas 1..n sin repetirlas ante empates y devuelve un arreglo congelado vacío sin gastos', () => {
    const ranking = buildCategoryRanking([
      entry(1, 'Ocio', 1000, 20),
      entry(2, 'Alimentos', 2000, 40),
      entry(3, 'Delivery', 1000, 20),
      entry(4, 'Ropa', 1000, 20),
    ]);

    assert.deepEqual(
      ranking.map((item) => [item.position, item.categoryName]),
      [
        [1, 'Alimentos'],
        [2, 'Delivery'],
        [3, 'Ocio'],
        [4, 'Ropa'],
      ],
    );
    assert.equal(Object.isFrozen(ranking), true);
    assert.equal(ranking.every((item) => Object.isFrozen(item)), true);
    assert.equal(ranking[0].expensePercentage, 40);

    const empty = buildCategoryRanking([]);
    assert.deepEqual(empty, []);
    assert.equal(Object.isFrozen(empty), true);
    assert.deepEqual(buildCategoryRanking(), []);
  });

  it('[H8-R10] el desglose de H6 presenta las categorías en el mismo orden que el ranking, incluso con empates y nombres equivalentes', () => {
    const categories = [
      { id: 7, name: 'Café' },
      { id: 3, name: 'Cafe' },
      { id: 4, name: 'Bazar' },
      { id: 5, name: 'alimentos' },
      { id: 6, name: 'Transporte' },
    ];
    const breakdown = calculateCategoryIncomeBreakdown(
      [
        expense(7, 1500),
        expense(4, 1500),
        expense(3, 1500),
        expense(6, 9000),
        expense(5, 1500),
      ],
      categories,
      null,
    );

    const ranking = buildCategoryRanking(breakdown);

    assert.deepEqual(
      breakdown.map((item) => item.categoryId),
      ranking.map((item) => item.categoryId),
    );
    assert.deepEqual(
      breakdown.map((item) => item.categoryId),
      [6, 5, 4, 3, 7],
    );
    assert.deepEqual(
      ranking.map((item) => item.expensePercentage),
      breakdown.map((item) => item.expensePercentage),
    );
  });

  it('[H8-R13] el módulo de dominio del ranking no importa react, react-dom, node:sqlite ni clientes HTTP', async () => {
    const source = await readFile(
      new URL('../../../src/domain/services/categoryRanking.js', import.meta.url),
      'utf8',
    );

    assert.doesNotMatch(source, /from\s+['"]react['"]/);
    assert.doesNotMatch(source, /from\s+['"]react-dom/);
    assert.doesNotMatch(source, /node:sqlite/);
    assert.doesNotMatch(source, /axios/);
    assert.doesNotMatch(source, /fetch\(/);
  });
});
