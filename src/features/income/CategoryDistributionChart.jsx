import React from 'react';
import { formatCentsToArs } from '../../core/formatters.js';
import { getViewportLayout } from '../../core/responsive.js';
import { CORPORATE_THEME } from '../../core/theme.js';

const h = React.createElement;

const DONUT_RADIUS = 64;
const DONUT_CIRCUMFERENCE = Number((2 * Math.PI * DONUT_RADIUS).toFixed(4));

function buildCategoryChartStyles(viewportWidth = 390, compact = false) {
  const layout = getViewportLayout(viewportWidth);

  return Object.freeze({
    layout,
    card: Object.freeze({
      backgroundColor: CORPORATE_THEME.surface,
      border: `1px solid ${CORPORATE_THEME.border}`,
      borderTop: `2px solid ${CORPORATE_THEME.navyPrimary}`,
      borderRadius: 6,
      padding: compact
        ? layout.isMobile
          ? '6px 8px'
          : '8px 12px'
        : layout.isMobile
          ? 16
          : 22,
      fontFamily: CORPORATE_THEME.fontSans,
    }),
    headerRow: Object.freeze({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      flexWrap: 'wrap',
      gap: 4,
      marginBottom: compact ? 3 : 14,
      paddingBottom: compact ? 2 : 10,
      borderBottom: `1px solid ${CORPORATE_THEME.border}`,
    }),
    chartBodyGrid: Object.freeze({
      display: 'grid',
      gridTemplateColumns: compact
        ? layout.isMobile
          ? '1fr'
          : '132px minmax(0, 1fr)'
        : layout.isMobile
          ? '1fr'
          : '188px minmax(0, 1fr)',
      gap: compact ? (layout.isMobile ? 4 : 10) : layout.isMobile ? 16 : 22,
      alignItems: 'center',
    }),
    donutContainer: Object.freeze({
      display: 'flex',
      flexDirection: compact && layout.isMobile ? 'row' : 'column',
      alignItems: 'center',
      justifyContent: compact && layout.isMobile ? 'space-between' : 'center',
      gap: compact && layout.isMobile ? 8 : 0,
      padding: compact ? (layout.isMobile ? '3px 6px' : 4) : 8,
      backgroundColor: CORPORATE_THEME.surfaceMuted,
      border: `1px solid ${CORPORATE_THEME.border}`,
      borderRadius: 6,
    }),
    emptyBox: Object.freeze({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: compact ? 8 : 12,
      padding: compact ? 10 : 16,
      borderRadius: 4,
      backgroundColor: CORPORATE_THEME.surfaceMuted,
      border: `1px dashed ${CORPORATE_THEME.borderStrong}`,
    }),
    emptyCtaButton: Object.freeze({
      minHeight: 48,
      width: layout.isMobile ? '100%' : 'auto',
      padding: '10px 18px',
      borderRadius: 4,
      border: `1px solid ${CORPORATE_THEME.navyPrimary}`,
      backgroundColor: CORPORATE_THEME.navyPrimary,
      color: '#FFFFFF',
      fontWeight: 600,
      fontSize: 14,
      cursor: 'pointer',
    }),
    reconciliationRow: Object.freeze({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 4,
      marginTop: compact ? 3 : 12,
      padding: compact ? '3px 6px' : '10px 12px',
      borderRadius: 4,
      backgroundColor: CORPORATE_THEME.surfaceMuted,
      border: `1px solid ${CORPORATE_THEME.border}`,
      borderLeft: `3px solid ${CORPORATE_THEME.brownPrimary}`,
      fontVariantNumeric: CORPORATE_THEME.tabularNums,
    }),
  });
}

export function CategoryDistributionChart({
  categoryBreakdown = [],
  totalExpensesCents = 0,
  viewportWidth = 390,
  compact = false,
  onNavigateToExpenses = null,
} = {}) {
  const styles = buildCategoryChartStyles(viewportWidth, compact);
  const { layout } = styles;
  const layoutMode = layout.isDesktop
    ? 'desktop'
    : layout.isTablet
      ? 'tablet'
      : 'mobile';

  const sumCategoriesCents = categoryBreakdown.reduce(
    (sum, item) => sum + (item.amountCents ?? 0),
    0,
  );
  const sumPercentages =
    categoryBreakdown.length > 0
      ? Math.round(
          categoryBreakdown.reduce(
            (sum, item) => sum + (item.expensePercentage ?? 0),
            0,
          ) * 10,
        ) / 10
      : 0;

  let cumulativeOffset = 0;
  const donutSegments = categoryBreakdown.map((item) => {
    const shareRatio =
      totalExpensesCents > 0 ? item.amountCents / totalExpensesCents : 0;
    const segmentLength = Number((shareRatio * DONUT_CIRCUMFERENCE).toFixed(4));
    const dashOffset = Number((-cumulativeOffset).toFixed(4));
    cumulativeOffset += segmentLength;
    return {
      ...item,
      segmentLength,
      dashOffset,
    };
  });

  return h(
    'section',
    {
      'data-testid': 'category-income-breakdown',
      'data-chart-layout': layoutMode,
      style: styles.card,
      'aria-label': 'Gráfico de distribución de gastos por categoría',
    },
    h(
      'div',
      { style: styles.headerRow },
      h(
        'h3',
        {
          style: {
            margin: 0,
            color: CORPORATE_THEME.navyPrimary,
            fontSize: compact ? 15 : 18,
            fontFamily: CORPORATE_THEME.fontSerif,
            fontWeight: 600,
          },
        },
        'Gráfico de distribución de gastos por categoría',
      ),
      h(
        'span',
        {
          style: {
            fontSize: 12,
            color: CORPORATE_THEME.textMuted,
            fontVariantNumeric: CORPORATE_THEME.tabularNums,
          },
        },
        categoryBreakdown.length === 0
          ? 'Sin movimientos en el mes'
          : `${categoryBreakdown.length} ${categoryBreakdown.length === 1 ? 'categoría activa' : 'categorías activas'}`,
      ),
    ),
    categoryBreakdown.length === 0 || totalExpensesCents <= 0
      ? h(
          'div',
          {
            'data-testid': 'chart-empty-state',
            style: styles.emptyBox,
          },
          h(
            'p',
            {
              style: {
                margin: 0,
                color: CORPORATE_THEME.textSecondary,
                fontSize: 14,
                lineHeight: 1.45,
              },
            },
            'No hay gastos registrados en este período. Registrá un egreso para visualizar el gráfico de composición por categoría.',
          ),
          typeof onNavigateToExpenses === 'function'
            ? h(
                'button',
                {
                  type: 'button',
                  'data-testid': 'chart-empty-cta-button',
                  tabIndex: 0,
                  style: styles.emptyCtaButton,
                  onClick: onNavigateToExpenses,
                },
                'Ir a registrar gasto',
              )
            : null,
        )
      : h(
          'div',
          {
            'data-testid': 'category-distribution-chart',
          },
          h(
            'div',
            { style: styles.chartBodyGrid },
            h(
              'div',
              { style: styles.donutContainer },
              h(
                'svg',
                {
                  'data-testid': 'category-donut-svg',
                  width: compact ? (layout.isMobile ? 68 : 104) : 168,
                  height: compact ? (layout.isMobile ? 68 : 104) : 168,
                  viewBox: '0 0 168 168',
                  role: 'img',
                  style: { flexShrink: 0 },
                  'aria-label': `Distribución porcentual sobre ${formatCentsToArs(totalExpensesCents)}`,
                },
                h('circle', {
                  cx: 84,
                  cy: 84,
                  r: DONUT_RADIUS,
                  fill: 'none',
                  stroke: CORPORATE_THEME.border,
                  strokeWidth: 20,
                }),
                ...donutSegments.map((seg) =>
                  h('circle', {
                    key: seg.categoryId,
                    'data-testid': `donut-segment-${seg.categoryId}`,
                    'data-percentage': String(seg.expensePercentage),
                    cx: 84,
                    cy: 84,
                    r: DONUT_RADIUS,
                    fill: 'none',
                    stroke: seg.colorHex,
                    strokeWidth: 20,
                    strokeDasharray: `${seg.segmentLength} ${DONUT_CIRCUMFERENCE}`,
                    strokeDashoffset: String(seg.dashOffset),
                    transform: 'rotate(-90 84 84)',
                  }),
                ),
                h(
                  'text',
                  {
                    x: 84,
                    y: 78,
                    textAnchor: 'middle',
                    fill: CORPORATE_THEME.textMuted,
                    fontSize: 10,
                    fontWeight: 600,
                  },
                  'Total gastos',
                ),
                h(
                  'text',
                  {
                    x: 84,
                    y: 97,
                    textAnchor: 'middle',
                    fill: CORPORATE_THEME.navyPrimary,
                    fontSize: 13,
                    fontWeight: 700,
                  },
                  formatCentsToArs(totalExpensesCents),
                ),
              ),
              compact && layout.isMobile
                ? h(
                    'div',
                    {
                      style: {
                        flex: 1,
                        minWidth: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      },
                    },
                    h(
                      'span',
                      {
                        style: {
                          fontSize: 11,
                          fontWeight: 600,
                          color: CORPORATE_THEME.textSecondary,
                        },
                      },
                      'Distribución acumulada del período',
                    ),
                    h(
                      'div',
                      {
                        style: {
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                          fontVariantNumeric: CORPORATE_THEME.tabularNums,
                        },
                      },
                      h(
                        'strong',
                        {
                          style: {
                            fontSize: 14,
                            color: CORPORATE_THEME.navyPrimary,
                          },
                        },
                        formatCentsToArs(sumCategoriesCents),
                      ),
                      h(
                        'span',
                        {
                          style: {
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: CORPORATE_THEME.brownPrimary,
                          },
                        },
                        `${sumPercentages} % conciliado`,
                      ),
                    ),
                  )
                : null,
            ),
            h(
              'div',
              { style: { minWidth: 0 } },
              h(
                'div',
                {
                  'data-testid': 'category-stacked-bar',
                  style: {
                    display: 'flex',
                    height: compact ? 6 : 8,
                    borderRadius: 3,
                    overflow: 'hidden',
                    backgroundColor: CORPORATE_THEME.surfaceMuted,
                    border: `1px solid ${CORPORATE_THEME.border}`,
                    marginBottom: compact ? 6 : 12,
                  },
                },
                ...categoryBreakdown.map((item) =>
                  h('div', {
                    key: item.categoryId,
                    style: {
                      width: `${item.expensePercentage}%`,
                      backgroundColor: item.colorHex,
                    },
                  }),
                ),
              ),
              h(
                'ul',
                {
                  'data-testid': 'category-breakdown-list',
                  style: {
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                  },
                },
                ...categoryBreakdown.map((item) =>
                  h(
                    'li',
                    {
                      key: item.categoryId,
                      'data-testid': `breakdown-category-${item.categoryId}`,
                      style: {
                        padding: compact ? '4px 0' : '10px 0',
                        borderBottom: `1px solid ${CORPORATE_THEME.border}`,
                      },
                    },
                    h(
                      'div',
                      {
                        style: {
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: compact ? 4 : 8,
                          marginBottom: compact ? 3 : 6,
                        },
                      },
                      h(
                        'div',
                        {
                          style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: compact ? 6 : 8,
                          },
                        },
                        h('span', {
                          'data-testid': `category-color-swatch-${item.categoryId}`,
                          style: {
                            display: 'inline-block',
                            width: compact ? 8 : 10,
                            height: compact ? 8 : 10,
                            borderRadius: 2,
                            backgroundColor: item.colorHex,
                            flexShrink: 0,
                          },
                        }),
                        h(
                          'strong',
                          {
                            style: {
                              color: CORPORATE_THEME.textPrimary,
                              fontSize: compact ? 12.5 : 14,
                              fontWeight: 600,
                            },
                          },
                          item.categoryName,
                        ),
                        h(
                          'span',
                          {
                            style: {
                              fontSize: compact ? 11 : 12,
                              color: CORPORATE_THEME.textMuted,
                            },
                          },
                          `(${item.expenseCount ?? 1} ${(item.expenseCount ?? 1) === 1 ? 'gasto' : 'gastos'})`,
                        ),
                      ),
                      h(
                        'div',
                        {
                          style: {
                            display: 'flex',
                            gap: compact ? 5 : 8,
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            fontVariantNumeric: CORPORATE_THEME.tabularNums,
                          },
                        },
                        h(
                          'span',
                          {
                            'data-testid': `category-expense-pct-${item.categoryId}`,
                            style: {
                              padding: compact ? '1px 6px' : '2px 8px',
                              borderRadius: 4,
                              backgroundColor: CORPORATE_THEME.navySoft,
                              border: `1px solid ${CORPORATE_THEME.border}`,
                              color: CORPORATE_THEME.navyPrimary,
                              fontSize: compact ? 11 : 12,
                              fontWeight: 600,
                            },
                          },
                          `${item.expensePercentage} % del total`,
                        ),
                        item.incomePercentage !== null &&
                        item.incomePercentage !== undefined
                          ? h(
                              'span',
                              {
                                'data-testid': `category-income-pct-${item.categoryId}`,
                                style: {
                                  padding: compact ? '1px 6px' : '2px 8px',
                                  borderRadius: 4,
                                  backgroundColor: CORPORATE_THEME.brownSoft,
                                  border: `1px solid ${CORPORATE_THEME.border}`,
                                  color: CORPORATE_THEME.brownPrimary,
                                  fontSize: compact ? 11 : 12,
                                  fontWeight: 600,
                                },
                              },
                              `${item.incomePercentage} % del ingreso`,
                            )
                          : null,
                        h(
                          'strong',
                          {
                            'data-testid': `category-amount-${item.categoryId}`,
                            style: {
                              color: CORPORATE_THEME.navyPrimary,
                              fontSize: compact ? 12.5 : 14,
                            },
                          },
                          formatCentsToArs(item.amountCents),
                        ),
                      ),
                    ),
                    h(
                      'div',
                      {
                        style: {
                          height: compact ? 3 : 5,
                          borderRadius: 2,
                          backgroundColor: CORPORATE_THEME.surfaceMuted,
                          overflow: 'hidden',
                        },
                      },
                      h('div', {
                        style: {
                          width: `${Math.min(100, item.expensePercentage ?? 0)}%`,
                          height: '100%',
                          backgroundColor: item.colorHex,
                        },
                      }),
                    ),
                  ),
                ),
              ),
              h(
                'div',
                {
                  'data-testid': 'chart-reconciliation-row',
                  style: styles.reconciliationRow,
                },
                h(
                  'span',
                  {
                    style: {
                      fontSize: compact ? 11.5 : 12.5,
                      fontWeight: 600,
                      color: CORPORATE_THEME.textSecondary,
                    },
                  },
                  'Total conciliado con el listado del mes',
                ),
                h(
                  'div',
                  { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                  h(
                    'span',
                    {
                      'data-testid': 'chart-total-percentage',
                      style: {
                        fontSize: compact ? 11.5 : 12.5,
                        fontWeight: 700,
                        color: CORPORATE_THEME.brownPrimary,
                      },
                    },
                    `${sumPercentages} %`,
                  ),
                  h(
                    'strong',
                    {
                      'data-testid': 'chart-total-amount',
                      style: {
                        fontSize: compact ? 13 : 14.5,
                        fontWeight: 700,
                        color: CORPORATE_THEME.navyPrimary,
                      },
                    },
                    formatCentsToArs(sumCategoriesCents),
                  ),
                ),
              ),
            ),
          ),
        ),
  );
}

CategoryDistributionChart.buildStyles = buildCategoryChartStyles;
