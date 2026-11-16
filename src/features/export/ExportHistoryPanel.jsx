import React from 'react';
import { getViewportLayout } from '../../core/responsive.js';
import { CORPORATE_THEME } from '../../core/theme.js';
import { EXPORT_PRIVACY_NOTICE, buildIdleExportState } from './exportHistory.js';

const h = React.createElement;

function resolveLayoutMode(layout) {
  if (layout.isDesktop) return 'desktop';
  if (layout.isTablet) return 'tablet';
  return 'mobile';
}

function buildExportHistoryPanelStyles(viewportWidth = 390) {
  const layout = getViewportLayout(viewportWidth);
  const isMobile = layout.isMobile;
  const baseButton = {
    boxSizing: 'border-box',
    width: isMobile ? '100%' : 'auto',
    minHeight: 44,
    padding: '0 18px',
    borderRadius: 4,
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
  };

  return Object.freeze({
    layout,
    layoutMode: resolveLayoutMode(layout),
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
    notice: Object.freeze({
      margin: '6px 0 12px',
      color: CORPORATE_THEME.textSecondary,
      fontSize: 13,
      lineHeight: 1.45,
    }),
    actions: Object.freeze({
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? 8 : 12,
    }),
    downloadButton: Object.freeze({
      ...baseButton,
      border: `1px solid ${CORPORATE_THEME.navyPrimary}`,
      backgroundColor: CORPORATE_THEME.navyPrimary,
      color: '#FFFFFF',
    }),
    shareButton: Object.freeze({
      ...baseButton,
      border: `1px solid ${CORPORATE_THEME.borderStrong}`,
      backgroundColor: CORPORATE_THEME.surface,
      color: CORPORATE_THEME.navyPrimary,
    }),
    message: Object.freeze({
      margin: '10px 0 0',
      color: CORPORATE_THEME.textSecondary,
      fontSize: 13,
    }),
    error: Object.freeze({
      margin: '10px 0 0',
      color: CORPORATE_THEME.danger,
      fontSize: 13,
    }),
  });
}

function renderFeedback(exportState, styles) {
  if (!exportState?.message) {
    return null;
  }
  if (exportState.status === 'error') {
    return h(
      'p',
      { 'data-testid': 'export-error', role: 'alert', style: styles.error },
      exportState.message,
    );
  }
  return h(
    'p',
    { 'data-testid': 'export-message', role: 'status', style: styles.message },
    exportState.message,
  );
}

export function ExportHistoryPanel({
  exportState = buildIdleExportState(),
  canShare = false,
  onDownload = () => {},
  onShare = () => {},
  viewportWidth = 390,
} = {}) {
  const styles = buildExportHistoryPanelStyles(viewportWidth);

  return h(
    'section',
    {
      'data-testid': 'export-history-panel',
      'data-layout': styles.layoutMode,
      'aria-label': 'Exportar historial',
      style: styles.card,
    },
    h('h3', { style: styles.title }, 'Exportar historial'),
    h(
      'p',
      { 'data-testid': 'export-privacy-notice', style: styles.notice },
      EXPORT_PRIVACY_NOTICE,
    ),
    h(
      'div',
      { 'data-testid': 'export-actions', style: styles.actions },
      h(
        'button',
        {
          type: 'button',
          'data-testid': 'export-download-button',
          style: styles.downloadButton,
          onClick: () => onDownload(),
        },
        'Descargar CSV',
      ),
      canShare
        ? h(
            'button',
            {
              type: 'button',
              'data-testid': 'export-share-button',
              style: styles.shareButton,
              onClick: () => onShare(),
            },
            'Compartir',
          )
        : null,
    ),
    renderFeedback(exportState, styles),
  );
}

ExportHistoryPanel.buildStyles = buildExportHistoryPanelStyles;
