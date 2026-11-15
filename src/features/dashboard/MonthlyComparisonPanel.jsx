import React from 'react';
import { formatYearMonthLabel } from '../../core/dates.js';
import { formatCentsToArs, formatVariationTenths } from '../../core/formatters.js';
import { getViewportLayout } from '../../core/responsive.js';
import { CORPORATE_THEME } from '../../core/theme.js';

const h = React.createElement;

const COMPARISON_TITLE = 'Comparación con meses anteriores';
const VARIATION_LABEL = 'Variación respecto del mes anterior';
const NO_BASE_MESSAGE =
  'El mes anterior no tiene gastos: no se puede calcular la variación.';
const EMPTY_MESSAGE = 'No hay datos de meses anteriores para comparar.';

function resolveLayoutMode(layout) {
  if (layout.isDesktop) return 'desktop';
  if (layout.isTablet) return 'tablet';
  return 'mobile';
}

function resolveTrend(variationTenths) {
  if (variationTenths > 0) return 'up';
  if (variationTenths < 0) return 'down';
  return 'flat';
}

function buildMonthlyComparisonStyles(viewportWidth = 390) {
  const layout = getViewportLayout(viewportWidth);
  const isMobile = layout.isMobile;

  return Object.freeze({
    layout,
    layoutMode: resolveLayoutMode(layout),
    card: Object.freeze({
      boxSizing: 'border-box',
      width: '100%',
      maxWidth: isMobile ? '100%' : layout.containerMaxWidth,
      margin: isMobile ? '12px 0 0' : '16px auto 0',
      backgroundColor: CORPORATE_THEME.surface,
      border: `1px solid ${CORPORATE_THEME.border}`,
      borderTop: `2px solid ${CORPORATE_THEME.navyPrimary}`,
      borderRadius: 6,
      padding: isMobile ? 14 : 20,
      fontFamily: CORPORATE_THEME.fontSans,
    }),
    title: Object.freeze({
      margin: '0 0 10px',
      paddingBottom: 8,
      borderBottom: `1px solid ${CORPORATE_THEME.border}`,
      color: CORPORATE_THEME.navyPrimary,
      fontFamily: CORPORATE_THEME.fontSerif,
      fontSize: isMobile ? 16 : 18,
      fontWeight: 600,
    }),
    body: Object.freeze({
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr)',
      columnGap: isMobile ? 0 : 24,
      rowGap: isMobile ? 12 : 0,
      alignItems: 'start',
    }),
    currentBlock: Object.freeze({
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      minWidth: 0,
    }),
    currentLabel: Object.freeze({
      color: CORPORATE_THEME.textSecondary,
      fontSize: isMobile ? 13 : 14,
      fontWeight: 600,
      overflowWrap: 'anywhere',
    }),
    currentAmount: Object.freeze({
      color: CORPORATE_THEME.navyPrimary,
      fontSize: isMobile ? 22 : 26,
      fontWeight: 700,
      fontVariantNumeric: CORPORATE_THEME.tabularNums,
    }),
    variationLabel: Object.freeze({
      marginTop: 6,
      color: CORPORATE_THEME.textMuted,
      fontSize: 12,
      fontWeight: 600,
    }),
    variation: Object.freeze({
      color: CORPORATE_THEME.brownPrimary,
      fontSize: isMobile ? 16 : 18,
      fontWeight: 700,
      fontVariantNumeric: CORPORATE_THEME.tabularNums,
    }),
    noticeBox: Object.freeze({
      margin: 0,
      padding: 12,
      borderRadius: 4,
      backgroundColor: CORPORATE_THEME.surfaceMuted,
      border: `1px dashed ${CORPORATE_THEME.borderStrong}`,
      color: CORPORATE_THEME.textSecondary,
      fontSize: 14,
      lineHeight: 1.45,
    }),
    list: Object.freeze({
      listStyle: 'none',
      margin: 0,
      padding: 0,
      minWidth: 0,
    }),
    row: Object.freeze({
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      alignItems: 'center',
      columnGap: isMobile ? 8 : 16,
      padding: isMobile ? '8px 0' : '10px 0',
      borderBottom: `1px solid ${CORPORATE_THEME.border}`,
      fontVariantNumeric: CORPORATE_THEME.tabularNums,
    }),
    rowLabel: Object.freeze({
      color: CORPORATE_THEME.textPrimary,
      fontSize: isMobile ? 14 : 15,
      fontWeight: 600,
      overflowWrap: 'anywhere',
      minWidth: 0,
    }),
    rowAmount: Object.freeze({
      color: CORPORATE_THEME.navyPrimary,
      fontSize: isMobile ? 14 : 15,
      fontWeight: 700,
      textAlign: 'right',
      fontVariantNumeric: CORPORATE_THEME.tabularNums,
    }),
  });
}

function renderVariation(comparison, styles) {
  if (!comparison.hasPreviousData) {
    return null;
  }
  if (comparison.variationTenths === null) {
    return h(
      'p',
      { 'data-testid': 'monthly-comparison-no-base', style: styles.noticeBox },
      NO_BASE_MESSAGE,
    );
  }
  return [
    h('span', { key: 'variation-label', style: styles.variationLabel }, VARIATION_LABEL),
    h(
      'strong',
      {
        key: 'variation-value',
        'data-testid': 'monthly-comparison-variation',
        'data-variation-trend': resolveTrend(comparison.variationTenths),
        style: styles.variation,
      },
      formatVariationTenths(comparison.variationTenths),
    ),
  ];
}

function renderPreviousMonths(comparison, styles) {
  if (!comparison.hasPreviousData) {
    return h(
      'p',
      { 'data-testid': 'monthly-comparison-empty', style: styles.noticeBox },
      EMPTY_MESSAGE,
    );
  }
  return h(
    'ol',
    { 'data-testid': 'monthly-comparison-list', style: styles.list },
    ...comparison.previousMonths.map((month) =>
      h(
        'li',
        {
          key: month.yearMonth,
          'data-testid': `monthly-comparison-row-${month.yearMonth}`,
          style: styles.row,
        },
        h('span', { style: styles.rowLabel }, formatYearMonthLabel(month.yearMonth)),
        h('strong', { style: styles.rowAmount }, formatCentsToArs(month.totalCents)),
      ),
    ),
  );
}

export function MonthlyComparisonPanel({ comparison, viewportWidth = 390 } = {}) {
  const styles = buildMonthlyComparisonStyles(viewportWidth);

  return h(
    'section',
    {
      'data-testid': 'monthly-comparison',
      'data-comparison-layout': styles.layoutMode,
      'aria-label': COMPARISON_TITLE,
      style: styles.card,
    },
    h('h3', { style: styles.title }, COMPARISON_TITLE),
    h(
      'div',
      { style: styles.body },
      h(
        'div',
        { style: styles.currentBlock },
        h('span', { style: styles.currentLabel }, formatYearMonthLabel(comparison.activeYearMonth)),
        h(
          'strong',
          { 'data-testid': 'monthly-comparison-current', style: styles.currentAmount },
          formatCentsToArs(comparison.currentTotalCents),
        ),
        renderVariation(comparison, styles),
      ),
      renderPreviousMonths(comparison, styles),
    ),
  );
}

MonthlyComparisonPanel.buildStyles = buildMonthlyComparisonStyles;
