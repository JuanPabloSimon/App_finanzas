import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MonthlyComparisonPanel } from '../../../src/features/dashboard/MonthlyComparisonPanel.jsx';
import { buildMonthlyComparison } from '../../../src/domain/services/monthlyComparison.js';
import { CORPORATE_THEME } from '../../../src/core/theme.js';

function renderPanel(props) {
  return renderToStaticMarkup(React.createElement(MonthlyComparisonPanel, props));
}

function rowOrder(html) {
  return [...html.matchAll(/data-testid="monthly-comparison-row-(\d{4}-\d{2})"/g)].map(
    (match) => match[1],
  );
}

function comparisonWith(currentTotalCents, previousTotalCents) {
  return buildMonthlyComparison({
    activeYearMonth: '2026-11',
    currentTotalCents,
    previousMonthlyTotals: [{ yearMonth: '2026-10', totalCents: previousTotalCents }],
  });
}

const THREE_MONTHS = buildMonthlyComparison({
  activeYearMonth: '2026-11',
  currentTotalCents: 412500,
  previousMonthlyTotals: [
    { yearMonth: '2026-10', totalCents: 389000 },
    { yearMonth: '2026-09', totalCents: 150050 },
    { yearMonth: '2026-08', totalCents: 200000 },
  ],
});

describe('H7 panel de comparación mensual (Mobile First + Desktop)', () => {
  it('[H7-R8] con tres meses previos muestra el total actual, una fila por mes con etiqueta y monto en pesos, y la variación', () => {
    const html = renderPanel({ comparison: THREE_MONTHS, viewportWidth: 390 });

    assert.match(html, /data-testid="monthly-comparison"/);
    assert.match(html, /Comparación con meses anteriores/);
    assert.match(html, /Noviembre 2026 \(2026-11\)/);
    assert.match(html, /data-testid="monthly-comparison-current"[^>]*>\$ 4\.125</);
    assert.deepEqual(rowOrder(html), ['2026-10', '2026-09', '2026-08']);
    assert.match(
      html,
      /data-testid="monthly-comparison-row-2026-10"[^>]*><span[^>]*>Octubre 2026 \(2026-10\)<\/span><strong[^>]*>\$ 3\.890</,
    );
    assert.match(
      html,
      /data-testid="monthly-comparison-row-2026-09"[^>]*><span[^>]*>Septiembre 2026 \(2026-09\)<\/span><strong[^>]*>\$ 1\.500,50</,
    );
    assert.match(html, /Variación respecto del mes anterior/);
    assert.match(html, /data-testid="monthly-comparison-variation"[^>]*>\+6,0 %</);
    assert.doesNotMatch(html, /data-testid="monthly-comparison-empty"/);
  });

  it('[H7-R9] muestra la variación con signo, un decimal con coma, % y la tendencia en data-variation-trend', () => {
    assert.match(
      renderPanel({ comparison: comparisonWith(11250, 10000) }),
      /data-testid="monthly-comparison-variation" data-variation-trend="up"[^>]*>\+12,5 %</,
    );
    assert.match(
      renderPanel({ comparison: comparisonWith(9400, 10000) }),
      /data-testid="monthly-comparison-variation" data-variation-trend="down"[^>]*>-6,0 %</,
    );
    assert.match(
      renderPanel({ comparison: comparisonWith(10000, 10000) }),
      /data-testid="monthly-comparison-variation" data-variation-trend="flat"[^>]*>0,0 %</,
    );
  });

  it('[H7-R10] con datos previos y variación no calculable muestra el aviso exacto en lugar de la variación', () => {
    const comparison = buildMonthlyComparison({
      activeYearMonth: '2026-11',
      currentTotalCents: 5000,
      previousMonthlyTotals: [{ yearMonth: '2026-09', totalCents: 4000 }],
    });
    const html = renderPanel({ comparison });

    assert.match(
      html,
      /data-testid="monthly-comparison-no-base"[^>]*>El mes anterior no tiene gastos: no se puede calcular la variación\.</,
    );
    assert.doesNotMatch(html, /data-testid="monthly-comparison-variation"/);
    assert.deepEqual(rowOrder(html), ['2026-10', '2026-09']);
    assert.match(html, /data-testid="monthly-comparison-row-2026-10"[^>]*><span[^>]*>[^<]*<\/span><strong[^>]*>\$ 0</);
  });

  it('[H7-R11] sin meses previos con datos muestra el total actual y el estado vacío, sin filas, sin variación ni NaN o Infinity', () => {
    const comparison = buildMonthlyComparison({
      activeYearMonth: '2026-11',
      currentTotalCents: 250000,
    });
    const html = renderPanel({ comparison });

    assert.match(html, /data-testid="monthly-comparison-current"[^>]*>\$ 2\.500</);
    assert.match(
      html,
      /data-testid="monthly-comparison-empty"[^>]*>No hay datos de meses anteriores para comparar\.</,
    );
    assert.doesNotMatch(html, /monthly-comparison-row-/);
    assert.doesNotMatch(html, /data-testid="monthly-comparison-list"/);
    assert.doesNotMatch(html, /data-testid="monthly-comparison-variation"/);
    assert.doesNotMatch(html, /data-testid="monthly-comparison-no-base"/);
    assert.doesNotMatch(html, /NaN/);
    assert.doesNotMatch(html, /Infinity/);
  });

  it('[H7-R14] aplica Mobile First (< 768px) en una columna y se adapta a tablet y desktop en dos columnas, con cifras tabulares', () => {
    const mobileHtml = renderPanel({ comparison: THREE_MONTHS, viewportWidth: 390 });
    assert.match(mobileHtml, /data-comparison-layout="mobile"/);
    assert.match(mobileHtml, /grid-template-columns:1fr[;"]/);

    const tabletHtml = renderPanel({ comparison: THREE_MONTHS, viewportWidth: 800 });
    assert.match(tabletHtml, /data-comparison-layout="tablet"/);
    assert.match(tabletHtml, /grid-template-columns:minmax\(0, 1fr\) minmax\(0, 1fr\)/);

    const desktopHtml = renderPanel({ comparison: THREE_MONTHS, viewportWidth: 1280 });
    assert.match(desktopHtml, /data-comparison-layout="desktop"/);
    assert.match(desktopHtml, /grid-template-columns:minmax\(0, 1fr\) minmax\(0, 1fr\)/);

    const mobileStyles = MonthlyComparisonPanel.buildStyles(390);
    assert.equal(mobileStyles.body.gridTemplateColumns, '1fr');
    assert.equal(mobileStyles.card.maxWidth, '100%');
    assert.equal(mobileStyles.row.gridTemplateColumns, '1fr auto');
    assert.equal(mobileStyles.rowLabel.overflowWrap, 'anywhere');
    assert.equal(mobileStyles.currentAmount.fontVariantNumeric, CORPORATE_THEME.tabularNums);
    assert.equal(mobileStyles.rowAmount.fontVariantNumeric, 'tabular-nums');
    assert.equal(mobileStyles.variation.fontVariantNumeric, 'tabular-nums');

    assert.equal(MonthlyComparisonPanel.buildStyles(800).card.maxWidth, 720);
    assert.equal(MonthlyComparisonPanel.buildStyles(1280).card.maxWidth, 960);
  });
});
