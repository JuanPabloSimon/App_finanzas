import React from 'react';
import { getViewportLayout } from '../../core/responsive.js';
import { CORPORATE_THEME } from '../../core/theme.js';
import { ADVICE_DISCLAIMER } from '../../assistant/adviceResponse.js';

const h = React.createElement;

export const RECOMMENDATIONS_TITLE = 'Recomendaciones del asistente';
export const RECOMMENDATIONS_REQUEST_LABEL = 'Pedir recomendaciones';
export const RECOMMENDATIONS_LOADING_TEXT = 'Consultando al asistente…';
export const RECOMMENDATIONS_IDLE_TEXT =
  'Se envía un resumen agregado de tus gastos, sin notas ni datos personales.';
export const RECOMMENDATIONS_SOURCE_FALLBACK_TEXT =
  'Sugerencias generadas por reglas (respuesta de reserva).';
export const RECOMMENDATIONS_SOURCE_MODEL_TEXT = 'Sugerencias generadas por el asistente.';
export const RECOMMENDATIONS_LIMIT_TEXT =
  'Alcanzaste el límite de 4 consultas al asistente de este mes. Te mostramos sugerencias generadas por reglas.';
export const RECOMMENDATIONS_NO_API_KEY_TEXT =
  'El asistente no está configurado en este entorno. Te mostramos sugerencias generadas por reglas.';

function formatRemainingRequests(remaining, limit) {
  return `Te quedan ${remaining} de ${limit} consultas al asistente este mes`;
}

function resolveLayoutMode(layout) {
  if (layout.isDesktop) return 'desktop';
  if (layout.isTablet) return 'tablet';
  return 'mobile';
}

function buildRecommendationsPanelStyles(viewportWidth = 390) {
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
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }),
    title: Object.freeze({
      margin: 0,
      color: CORPORATE_THEME.navyPrimary,
      fontFamily: CORPORATE_THEME.fontSerif,
      fontSize: isMobile ? 16 : 18,
      fontWeight: 600,
    }),
    remaining: Object.freeze({
      margin: 0,
      paddingBottom: 8,
      borderBottom: `1px solid ${CORPORATE_THEME.border}`,
      color: CORPORATE_THEME.textMuted,
      fontSize: 13,
    }),
    helper: Object.freeze({
      margin: 0,
      color: CORPORATE_THEME.textSecondary,
      fontSize: 13,
      lineHeight: 1.45,
    }),
    requestButton: Object.freeze({
      alignSelf: isMobile ? 'stretch' : 'flex-end',
      width: isMobile ? '100%' : 'auto',
      minHeight: 44,
      padding: '0 18px',
      borderRadius: 4,
      border: `1px solid ${CORPORATE_THEME.navyPrimary}`,
      backgroundColor: CORPORATE_THEME.navyPrimary,
      color: CORPORATE_THEME.surface,
      fontWeight: 600,
      fontSize: 14,
      cursor: 'pointer',
    }),
    notice: Object.freeze({
      margin: 0,
      padding: '10px 12px',
      borderRadius: 4,
      backgroundColor: CORPORATE_THEME.surfaceMuted,
      border: `1px dashed ${CORPORATE_THEME.borderStrong}`,
      color: CORPORATE_THEME.textSecondary,
      fontSize: 13,
      lineHeight: 1.45,
    }),
    source: Object.freeze({
      margin: 0,
      color: CORPORATE_THEME.textSecondary,
      fontSize: 12.5,
      fontWeight: 600,
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
    itemTitle: Object.freeze({
      color: CORPORATE_THEME.textPrimary,
      fontWeight: 600,
      fontSize: isMobile ? 14 : 15,
      overflowWrap: 'anywhere',
    }),
    itemDetail: Object.freeze({
      margin: 0,
      color: CORPORATE_THEME.textSecondary,
      fontSize: 13.5,
      lineHeight: 1.45,
      overflowWrap: 'anywhere',
    }),
    itemCategory: Object.freeze({
      alignSelf: 'flex-start',
      padding: '2px 8px',
      borderRadius: 999,
      border: `1px solid ${CORPORATE_THEME.borderStrong}`,
      color: CORPORATE_THEME.brownPrimary,
      fontSize: 12,
      fontWeight: 600,
    }),
    disclaimer: Object.freeze({
      display: 'block',
      paddingTop: 8,
      borderTop: `1px solid ${CORPORATE_THEME.border}`,
      fontSize: 12,
      color: CORPORATE_THEME.textMuted,
    }),
  });
}

function renderSuggestion(suggestion, index, styles) {
  return h(
    'li',
    { key: `recommendation-${index}`, 'data-testid': 'recommendation-item', style: styles.item },
    h('strong', { 'data-testid': 'recommendation-title', style: styles.itemTitle }, suggestion.titulo),
    h('p', { 'data-testid': 'recommendation-detail', style: styles.itemDetail }, suggestion.detalle),
    h(
      'span',
      { 'data-testid': 'recommendation-category', style: styles.itemCategory },
      suggestion.categoria,
    ),
  );
}

export function RecommendationsPanel({
  status = 'idle',
  suggestions = [],
  source = null,
  reason = null,
  remainingModelRequests = 4,
  monthlyLimit = 4,
  onRequest = null,
  viewportWidth = 390,
} = {}) {
  const styles = buildRecommendationsPanelStyles(viewportWidth);
  const isLoading = status === 'loading';
  const isReady = status === 'ready';
  const safeSuggestions = Array.isArray(suggestions) ? suggestions : [];
  const resolvedSource = source === 'model' ? 'model' : 'fallback';

  return h(
    'section',
    {
      'data-testid': 'recommendations-panel',
      'data-layout': styles.layoutMode,
      'data-status': status,
      'aria-label': RECOMMENDATIONS_TITLE,
      style: styles.card,
    },
    h('h3', { style: styles.title }, RECOMMENDATIONS_TITLE),
    h(
      'p',
      { 'data-testid': 'recommendations-remaining', style: styles.remaining },
      formatRemainingRequests(remainingModelRequests, monthlyLimit),
    ),
    status === 'idle'
      ? h('p', { 'data-testid': 'recommendations-idle', style: styles.helper }, RECOMMENDATIONS_IDLE_TEXT)
      : null,
    h(
      'button',
      {
        type: 'button',
        'data-testid': 'recommendations-request-button',
        disabled: isLoading,
        'aria-busy': isLoading ? 'true' : 'false',
        tabIndex: 0,
        style: styles.requestButton,
        onClick: () => {
          if (!isLoading && typeof onRequest === 'function') {
            onRequest();
          }
        },
      },
      isLoading
        ? h('span', { 'data-testid': 'recommendations-loading' }, RECOMMENDATIONS_LOADING_TEXT)
        : RECOMMENDATIONS_REQUEST_LABEL,
    ),
    isReady && reason === 'limit_reached'
      ? h(
          'p',
          { 'data-testid': 'recommendations-limit-notice', role: 'status', style: styles.notice },
          RECOMMENDATIONS_LIMIT_TEXT,
        )
      : null,
    isReady && reason === 'no_api_key'
      ? h(
          'p',
          { 'data-testid': 'recommendations-config-notice', style: styles.notice },
          RECOMMENDATIONS_NO_API_KEY_TEXT,
        )
      : null,
    isReady
      ? h(
          'p',
          {
            'data-testid': 'recommendations-source',
            'data-source': resolvedSource,
            style: styles.source,
          },
          resolvedSource === 'model'
            ? RECOMMENDATIONS_SOURCE_MODEL_TEXT
            : RECOMMENDATIONS_SOURCE_FALLBACK_TEXT,
        )
      : null,
    isReady
      ? h(
          'ul',
          {
            'data-testid': 'recommendations-list',
            'data-columns': String(styles.columns),
            style: styles.list,
          },
          ...safeSuggestions.map((suggestion, index) => renderSuggestion(suggestion, index, styles)),
        )
      : null,
    isReady
      ? h(
          'small',
          { 'data-testid': 'recommendations-disclaimer', style: styles.disclaimer },
          ADVICE_DISCLAIMER,
        )
      : null,
  );
}

RecommendationsPanel.buildStyles = buildRecommendationsPanelStyles;
