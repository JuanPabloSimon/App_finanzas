import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CategoryRankingList } from '../../../src/features/dashboard/CategoryRankingList.jsx';
import { buildCategoryRanking } from '../../../src/domain/services/categoryRanking.js';
import { CORPORATE_THEME } from '../../../src/core/theme.js';

function renderRanking(props) {
  return renderToStaticMarkup(React.createElement(CategoryRankingList, props));
}

function rowOrder(html) {
  return [...html.matchAll(/data-testid="category-ranking-row-(\d+)"/g)].map((match) =>
    Number(match[1]),
  );
}

const SIX_CATEGORIES = buildCategoryRanking([
  { categoryId: 1, categoryName: 'Alimentos', amountCents: 4000000, expensePercentage: 40 },
  { categoryId: 2, categoryName: 'Transporte', amountCents: 2000000, expensePercentage: 20 },
  { categoryId: 3, categoryName: 'Servicios', amountCents: 1500000, expensePercentage: 15 },
  { categoryId: 4, categoryName: 'Salud', amountCents: 1000000, expensePercentage: 10 },
  { categoryId: 5, categoryName: 'Ocio', amountCents: 1000000, expensePercentage: 10 },
  { categoryId: 6, categoryName: 'Delivery', amountCents: 500050, expensePercentage: 5 },
]);

describe('H8 panel del ranking de categorías (Mobile First + Desktop)', () => {
  it('[H8-R6] con seis categorías muestra todas las filas en orden, sin truncar, con posición, nombre, monto en pesos y porcentaje', () => {
    const html = renderRanking({ ranking: SIX_CATEGORIES, viewportWidth: 390 });

    assert.match(html, /data-testid="category-ranking"/);
    assert.match(html, /Ranking de categorías del mes/);
    assert.match(html, /<ol[^>]*data-testid="category-ranking-list"/);
    assert.deepEqual(rowOrder(html), [1, 2, 3, 5, 4, 6]);

    assert.match(html, /data-testid="category-ranking-position-1"[^>]*>1°</);
    assert.match(html, /data-testid="category-ranking-position-6"[^>]*>6°</);
    assert.match(html, /data-testid="category-ranking-amount-1"[^>]*>\$ 40\.000</);
    assert.match(html, /data-testid="category-ranking-amount-6"[^>]*>\$ 5\.000,50</);
    assert.match(html, /data-testid="category-ranking-pct-1"[^>]*>40 %</);
    assert.match(html, /data-testid="category-ranking-pct-6"[^>]*>5 %</);
    for (const name of ['Alimentos', 'Transporte', 'Servicios', 'Ocio', 'Salud', 'Delivery']) {
      assert.match(html, new RegExp(`>${name}<`));
    }
    assert.doesNotMatch(html, /data-testid="category-ranking-empty"/);
  });

  it('[H8-R7] con tres categorías muestra exactamente tres filas, sin relleno ni posición 4°', () => {
    const ranking = buildCategoryRanking([
      { categoryId: 1, categoryName: 'Alimentos', amountCents: 3000, expensePercentage: 50 },
      { categoryId: 2, categoryName: 'Transporte', amountCents: 2000, expensePercentage: 33.3 },
      { categoryId: 3, categoryName: 'Servicios', amountCents: 1000, expensePercentage: 16.7 },
    ]);

    const html = renderRanking({ ranking, viewportWidth: 390 });

    assert.equal(rowOrder(html).length, 3);
    assert.equal((html.match(/<li/g) ?? []).length, 3);
    assert.match(html, />3°</);
    assert.doesNotMatch(html, />4°</);
  });

  it('[H8-R8] sin gastos muestra el estado vacío con el texto exacto, sin filas ni valores NaN o Infinity', () => {
    const html = renderRanking({ ranking: buildCategoryRanking([]), viewportWidth: 390 });

    assert.match(
      html,
      /data-testid="category-ranking-empty"[^>]*>Todavía no hay gastos en este mes para armar el ranking\.</,
    );
    assert.doesNotMatch(html, /category-ranking-row-/);
    assert.doesNotMatch(html, /data-testid="category-ranking-list"/);
    assert.doesNotMatch(html, /NaN/);
    assert.doesNotMatch(html, /Infinity/);

    const defaultHtml = renderRanking({});
    assert.match(defaultHtml, /data-testid="category-ranking-empty"/);
  });

  it('[H8-R12] aplica Mobile First (< 768px) con el porcentaje debajo del nombre y se adapta a tablet y desktop con grilla de cuatro columnas y cifras tabulares', () => {
    const mobileHtml = renderRanking({ ranking: SIX_CATEGORIES, viewportWidth: 390 });
    assert.match(mobileHtml, /data-ranking-layout="mobile"/);
    assert.match(mobileHtml, /grid-template-columns:32px 1fr auto[;"]/);
    assert.match(
      mobileHtml,
      /<div[^>]*flex-direction:column[^>]*><strong[^>]*>Alimentos<\/strong><span data-testid="category-ranking-pct-1"/,
    );

    const tabletHtml = renderRanking({ ranking: SIX_CATEGORIES, viewportWidth: 800 });
    assert.match(tabletHtml, /data-ranking-layout="tablet"/);
    assert.match(tabletHtml, /grid-template-columns:48px 1fr auto auto/);

    const desktopHtml = renderRanking({ ranking: SIX_CATEGORIES, viewportWidth: 1280 });
    assert.match(desktopHtml, /data-ranking-layout="desktop"/);
    assert.match(desktopHtml, /grid-template-columns:48px 1fr auto auto/);
    assert.match(
      desktopHtml,
      /<strong[^>]*>Alimentos<\/strong><span data-testid="category-ranking-pct-1"[^>]*>40 %<\/span><strong data-testid="category-ranking-amount-1"/,
    );

    const mobileStyles = CategoryRankingList.buildStyles(390);
    assert.equal(mobileStyles.row.gridTemplateColumns, '32px 1fr auto');
    assert.equal(mobileStyles.card.maxWidth, '100%');
    assert.equal(mobileStyles.row.fontVariantNumeric, CORPORATE_THEME.tabularNums);
    assert.equal(mobileStyles.amount.fontVariantNumeric, 'tabular-nums');
    assert.equal(mobileStyles.name.overflowWrap, 'anywhere');

    const desktopStyles = CategoryRankingList.buildStyles(1280);
    assert.equal(desktopStyles.row.gridTemplateColumns, '48px 1fr auto auto');
    assert.equal(desktopStyles.card.maxWidth, 960);
    assert.equal(CategoryRankingList.buildStyles(800).card.maxWidth, 720);
  });
});
