import React from 'react';
import { formatCentsToArs } from '../../core/formatters.js';
import { getViewportLayout } from '../../core/responsive.js';
import { CORPORATE_THEME } from '../../core/theme.js';

const h = React.createElement;

export const RECURRENCES_EMPTY_MESSAGE =
  'Todavía no detectamos gastos repetidos en los últimos 60 días.';

function resolveLayoutMode(layout) {
  if (layout.isDesktop) return 'desktop';
  if (layout.isTablet) return 'tablet';
  return 'mobile';
}

function buildRecurrencesPanelStyles(viewportWidth = 390) {
  const layout = getViewportLayout(viewportWidth);
  const isMobile = layout.isMobile;

  return Object.freeze({
    layout,
    layoutMode: resolveLayoutMode(layout),
    columns: layout.columns,
    card: Object.freeze({
      boxSizing: 'border-box',
      width: '100%',
      maxWidth: isMobile ? '100%' : layout.containerMaxWidth,
      margin: isMobile ? 0 : '0 auto',
      backgroundColor: CORPORATE_THEME.surface,
      border: `1px solid ${CORPORATE_THEME.border}`,
      borderTop: `2px solid ${CORPORATE_THEME.navyPrimary}`,
      borderRadius: 6,
      padding: isMobile ? 14 : 20,
      fontFamily: CORPORATE_THEME.fontSans,
    }),
    title: Object.freeze({
      margin: 0,
      color: CORPORATE_THEME.navyPrimary,
      fontFamily: CORPORATE_THEME.fontSerif,
      fontSize: isMobile ? 16 : 18,
      fontWeight: 600,
    }),
    subtitle: Object.freeze({
      margin: '4px 0 10px',
      paddingBottom: 8,
      borderBottom: `1px solid ${CORPORATE_THEME.border}`,
      color: CORPORATE_THEME.textMuted,
      fontSize: 13,
    }),
    list: Object.freeze({
      listStyle: 'none',
      margin: 0,
      padding: 0,
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : `repeat(${layout.columns}, minmax(0, 1fr))`,
      gap: isMobile ? 8 : 12,
    }),
    item: Object.freeze({
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      padding: '10px 12px',
      borderRadius: 4,
      backgroundColor: CORPORATE_THEME.surfaceMuted,
      border: `1px solid ${CORPORATE_THEME.border}`,
      borderLeft: `3px solid ${CORPORATE_THEME.brownPrimary}`,
    }),
    category: Object.freeze({
      color: CORPORATE_THEME.textPrimary,
      fontWeight: 600,
      fontSize: isMobile ? 14 : 15,
      overflowWrap: 'anywhere',
    }),
    amount: Object.freeze({
      color: CORPORATE_THEME.navyPrimary,
      fontWeight: 700,
      fontSize: isMobile ? 14 : 15,
      fontVariantNumeric: CORPORATE_THEME.tabularNums,
    }),
    occurrences: Object.freeze({
      color: CORPORATE_THEME.textSecondary,
      fontSize: 12.5,
    }),
    dismissButton: Object.freeze({
      alignSelf: isMobile ? 'stretch' : 'flex-end',
      width: isMobile ? '100%' : 'auto',
      minHeight: 44,
      padding: '0 16px',
      borderRadius: 4,
      border: `1px solid ${CORPORATE_THEME.borderStrong}`,
      backgroundColor: CORPORATE_THEME.surface,
      color: CORPORATE_THEME.brownPrimary,
      fontWeight: 600,
      fontSize: 14,
      cursor: 'pointer',
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
    error: Object.freeze({
      margin: '0 0 10px',
      color: CORPORATE_THEME.danger,
      fontSize: 13,
    }),
  });
}

function renderItem(recurrence, styles, onDismiss) {
  return h(
    'li',
    {
      key: recurrence.key,
      'data-testid': 'recurrence-item',
      'data-recurrence-key': recurrence.key,
      style: styles.item,
    },
    h(
      'strong',
      { 'data-testid': 'recurrence-category', style: styles.category },
      recurrence.categoryName,
    ),
    h(
      'span',
      { 'data-testid': 'recurrence-amount', style: styles.amount },
      formatCentsToArs(recurrence.typicalAmountCents),
    ),
    h(
      'span',
      { 'data-testid': 'recurrence-occurrences', style: styles.occurrences },
      `${recurrence.occurrences} veces en 60 días`,
    ),
    h(
      'button',
      {
        type: 'button',
        'data-testid': 'recurrence-dismiss-button',
        'aria-label': `Descartar recurrencia de ${recurrence.categoryName}`,
        tabIndex: 0,
        style: styles.dismissButton,
        onClick: () => {
          if (typeof onDismiss === 'function') {
            onDismiss(recurrence);
          }
        },
      },
      'Descartar',
    ),
  );
}

export function RecurrencesPanel({
  recurrences = [],
  onDismiss = null,
  errorMessage = null,
  viewportWidth = 390,
} = {}) {
  const styles = buildRecurrencesPanelStyles(viewportWidth);
  const safeRecurrences = Array.isArray(recurrences) ? recurrences : [];

  return h(
    'section',
    {
      'data-testid': 'recurrences-panel',
      'data-layout': styles.layoutMode,
      'aria-label': 'Gastos repetidos',
      style: styles.card,
    },
    h('h3', { style: styles.title }, 'Gastos repetidos'),
    h('p', { style: styles.subtitle }, 'Últimos 60 días'),
    errorMessage
      ? h(
          'p',
          { 'data-testid': 'recurrences-error', role: 'alert', style: styles.error },
          errorMessage,
        )
      : null,
    safeRecurrences.length === 0
      ? h(
          'p',
          { 'data-testid': 'recurrences-empty', style: styles.emptyBox },
          RECURRENCES_EMPTY_MESSAGE,
        )
      : h(
          'ul',
          {
            'data-testid': 'recurrences-list',
            'data-columns': String(styles.columns),
            style: styles.list,
          },
          ...safeRecurrences.map((recurrence) => renderItem(recurrence, styles, onDismiss)),
        ),
  );
}

RecurrencesPanel.buildStyles = buildRecurrencesPanelStyles;
