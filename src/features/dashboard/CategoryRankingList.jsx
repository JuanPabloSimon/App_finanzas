import React from 'react';
import { formatCentsToArs } from '../../core/formatters.js';
import { getViewportLayout } from '../../core/responsive.js';
import { CORPORATE_THEME } from '../../core/theme.js';

const h = React.createElement;

const CATEGORY_RANKING_EMPTY_MESSAGE =
  'Todavía no hay gastos en este mes para armar el ranking.';

function resolveLayoutMode(layout) {
  if (layout.isDesktop) return 'desktop';
  if (layout.isTablet) return 'tablet';
  return 'mobile';
}

function buildCategoryRankingStyles(viewportWidth = 390) {
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
    list: Object.freeze({
      listStyle: 'none',
      margin: 0,
      padding: 0,
    }),
    row: Object.freeze({
      display: 'grid',
      gridTemplateColumns: isMobile ? '32px 1fr auto' : '48px 1fr auto auto',
      alignItems: 'center',
      columnGap: isMobile ? 8 : 16,
      padding: isMobile ? '8px 0' : '10px 0',
      borderBottom: `1px solid ${CORPORATE_THEME.border}`,
      fontVariantNumeric: CORPORATE_THEME.tabularNums,
    }),
    position: Object.freeze({
      color: CORPORATE_THEME.brownPrimary,
      fontWeight: 700,
      fontSize: isMobile ? 14 : 15,
      fontVariantNumeric: CORPORATE_THEME.tabularNums,
    }),
    nameCell: Object.freeze({
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      gap: 2,
    }),
    name: Object.freeze({
      color: CORPORATE_THEME.textPrimary,
      fontWeight: 600,
      fontSize: isMobile ? 14 : 15,
      overflowWrap: 'anywhere',
    }),
    percentage: Object.freeze({
      color: CORPORATE_THEME.textMuted,
      fontSize: isMobile ? 12 : 13,
      fontWeight: 600,
      fontVariantNumeric: CORPORATE_THEME.tabularNums,
      textAlign: isMobile ? 'left' : 'right',
    }),
    amount: Object.freeze({
      color: CORPORATE_THEME.navyPrimary,
      fontWeight: 700,
      fontSize: isMobile ? 14 : 15,
      textAlign: 'right',
      fontVariantNumeric: CORPORATE_THEME.tabularNums,
    }),
    emptyBox: Object.freeze({
      margin: 0,
      padding: 14,
      borderRadius: 4,
      backgroundColor: CORPORATE_THEME.surfaceMuted,
      border: `1px dashed ${CORPORATE_THEME.borderStrong}`,
      color: CORPORATE_THEME.textSecondary,
      fontSize: 14,
      lineHeight: 1.45,
    }),
  });
}

function renderRow(item, styles) {
  const isMobile = styles.layout.isMobile;
  const percentageNode = h(
    'span',
    {
      'data-testid': `category-ranking-pct-${item.categoryId}`,
      style: styles.percentage,
    },
    `${item.expensePercentage} %`,
  );

  return h(
    'li',
    {
      key: item.categoryId,
      'data-testid': `category-ranking-row-${item.categoryId}`,
      style: styles.row,
    },
    h(
      'span',
      {
        'data-testid': `category-ranking-position-${item.categoryId}`,
        style: styles.position,
      },
      `${item.position}°`,
    ),
    isMobile
      ? h(
          'div',
          { style: styles.nameCell },
          h('strong', { style: styles.name }, item.categoryName),
          percentageNode,
        )
      : h('strong', { style: styles.name }, item.categoryName),
    isMobile ? null : percentageNode,
    h(
      'strong',
      {
        'data-testid': `category-ranking-amount-${item.categoryId}`,
        style: styles.amount,
      },
      formatCentsToArs(item.amountCents),
    ),
  );
}

export function CategoryRankingList({ ranking = [], viewportWidth = 390 } = {}) {
  const styles = buildCategoryRankingStyles(viewportWidth);
  const safeRanking = Array.isArray(ranking) ? ranking : [];

  return h(
    'section',
    {
      'data-testid': 'category-ranking',
      'data-ranking-layout': styles.layoutMode,
      'aria-label': 'Ranking de categorías del mes',
      style: styles.card,
    },
    h('h3', { style: styles.title }, 'Ranking de categorías del mes'),
    safeRanking.length === 0
      ? h(
          'p',
          { 'data-testid': 'category-ranking-empty', style: styles.emptyBox },
          CATEGORY_RANKING_EMPTY_MESSAGE,
        )
      : h(
          'ol',
          { 'data-testid': 'category-ranking-list', style: styles.list },
          ...safeRanking.map((item) => renderRow(item, styles)),
        ),
  );
}

CategoryRankingList.buildStyles = buildCategoryRankingStyles;
