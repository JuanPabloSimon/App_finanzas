import React from 'react';
import {
  CURRENT_POLICY_VERSION,
  PRIVACY_NOTICE_CONTENT,
  PRIVACY_NOTICE_SECTIONS,
} from '../../domain/models/consent.js';
import { getViewportLayout } from '../../core/responsive.js';
import { CORPORATE_THEME } from '../../core/theme.js';

const h = React.createElement;

function buildPrivacyNoticeStyles(viewportWidth = 390) {
  const layout = getViewportLayout(viewportWidth);
  const gridColumns = layout.isDesktop ? 3 : layout.isTablet ? 2 : 1;

  return Object.freeze({
    layout,
    gridColumns,
    wrapper: Object.freeze({
      width: '100%',
      minHeight: '100vh',
      boxSizing: 'border-box',
      padding: layout.isMobile ? 16 : 36,
      display: 'flex',
      justifyContent: 'center',
      alignItems: layout.isMobile ? 'stretch' : 'flex-start',
      backgroundColor: CORPORATE_THEME.background,
      color: CORPORATE_THEME.textPrimary,
      fontFamily: CORPORATE_THEME.fontSans,
    }),
    container: Object.freeze({
      width: '100%',
      maxWidth: layout.isMobile ? '100%' : layout.containerMaxWidth,
      margin: '0 auto',
      backgroundColor: CORPORATE_THEME.surface,
      borderRadius: 6,
      padding: layout.isMobile ? 18 : 30,
      border: `1px solid ${CORPORATE_THEME.border}`,
      borderTop: `4px solid ${CORPORATE_THEME.navyPrimary}`,
      boxShadow: '0 10px 28px rgba(11, 25, 44, 0.06)',
      display: 'flex',
      flexDirection: 'column',
      gap: layout.isMobile ? 16 : 24,
    }),
    grid: Object.freeze({
      display: 'grid',
      gridTemplateColumns:
        gridColumns === 1 ? '1fr' : `repeat(${gridColumns}, minmax(0, 1fr))`,
      gap: layout.isMobile ? 12 : 16,
    }),
    card: Object.freeze({
      border: `1px solid ${CORPORATE_THEME.border}`,
      borderTop: `2px solid ${CORPORATE_THEME.brownPrimary}`,
      borderRadius: 4,
      padding: 16,
      backgroundColor: CORPORATE_THEME.surfaceMuted,
      outlineOffset: 2,
    }),
    primaryButton: Object.freeze({
      minHeight: 48,
      width: layout.isMobile ? '100%' : 'auto',
      minWidth: layout.isMobile ? '100%' : 240,
      padding: '12px 24px',
      borderRadius: 4,
      border: 'none',
      backgroundColor: CORPORATE_THEME.navyPrimary,
      color: '#ffffff',
      fontWeight: 600,
      fontSize: 15,
      cursor: 'pointer',
    }),
    secondaryButton: Object.freeze({
      minHeight: 48,
      width: layout.isMobile ? '100%' : 'auto',
      minWidth: layout.isMobile ? '100%' : 180,
      padding: '12px 24px',
      borderRadius: 4,
      border: `1px solid ${CORPORATE_THEME.brownPrimary}`,
      backgroundColor: '#ffffff',
      color: CORPORATE_THEME.brownPrimary,
      fontWeight: 600,
      fontSize: 15,
      cursor: 'pointer',
    }),
  });
}

function handleKeyboardActivation(callback) {
  return (event) => {
    if (!event || typeof callback !== 'function') {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      callback();
    }
  };
}

export function PrivacyNoticeScreen({
  consent = null,
  onAccept,
  onClose,
  readOnly = false,
  viewportWidth = 390,
} = {}) {
  const styles = buildPrivacyNoticeStyles(viewportWidth);
  const { layout, gridColumns } = styles;
  const layoutMode = layout.isDesktop
    ? 'desktop'
    : layout.isTablet
      ? 'tablet'
      : 'mobile';

  const acceptedVersion = consent?.policyVersion ?? CURRENT_POLICY_VERSION;
  const acceptedAt = consent?.acceptedAt ?? null;

  const triggerAccept = () => {
    if (!readOnly && typeof onAccept === 'function') {
      return onAccept();
    }
    return undefined;
  };

  const triggerClose = () => {
    if (readOnly && typeof onClose === 'function') {
      return onClose();
    }
    return undefined;
  };

  return h(
    'main',
    {
      'data-testid': 'privacy-notice-screen',
      'data-layout': layoutMode,
      'data-columns': String(gridColumns),
      'data-readonly': String(Boolean(readOnly)),
      style: styles.wrapper,
    },
    h(
      'section',
      {
        'data-testid': 'privacy-notice-container',
        style: styles.container,
        'aria-labelledby': 'privacy-notice-title',
      },
      h(
        'header',
        { 'data-testid': 'privacy-notice-header' },
        h(
          'span',
          {
            'data-testid': 'privacy-policy-version-badge',
            style: {
              display: 'inline-block',
              padding: '4px 10px',
              borderRadius: 999,
              backgroundColor: '#e0f2fe',
              color: '#0369a1',
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 8,
            },
          },
          `Versión ${acceptedVersion}`,
        ),
        h(
          'h1',
          {
            id: 'privacy-notice-title',
            style: { margin: '4px 0 8px 0', fontSize: layout.isMobile ? 22 : 26 },
          },
          PRIVACY_NOTICE_CONTENT.title,
        ),
        h(
          'p',
          {
            style: { margin: 0, color: '#475569', fontSize: 15 },
          },
          readOnly
            ? 'Consulta del aviso de privacidad y consentimiento registrado en este dispositivo.'
            : 'Antes de utilizar la aplicación, leé y aceptá las condiciones de tratamiento de tus datos financieros.',
        ),
        readOnly && acceptedAt
          ? h(
              'p',
              {
                'data-testid': 'privacy-accepted-status',
                style: {
                  marginTop: 10,
                  marginBottom: 0,
                  padding: '8px 12px',
                  borderRadius: 8,
                  backgroundColor: '#dcfce7',
                  color: '#166534',
                  fontSize: 14,
                  fontWeight: 500,
                },
              },
              `Consentimiento registrado — Versión aceptada: ${acceptedVersion} — Fecha de aceptación: ${acceptedAt}`,
            )
          : null,
      ),
      h(
        'div',
        {
          'data-testid': 'privacy-sections-grid',
          style: styles.grid,
        },
        ...PRIVACY_NOTICE_SECTIONS.map((section) =>
          h(
            'article',
            {
              key: section.id,
              'data-testid': `privacy-section-${section.id}`,
              tabIndex: 0,
              style: styles.card,
            },
            h(
              'h2',
              {
                style: { marginTop: 0, marginBottom: 8, fontSize: 17, color: '#0f172a' },
              },
              section.title,
            ),
            h(
              'p',
              {
                style: { margin: 0, lineHeight: 1.5, color: '#334155', fontSize: 15 },
              },
              section.body,
            ),
          ),
        ),
      ),
      h(
        'footer',
        {
          'data-testid': 'privacy-notice-footer',
          style: {
            display: 'flex',
            justifyContent: layout.isMobile ? 'stretch' : 'flex-end',
            paddingTop: 8,
          },
        },
        readOnly
          ? h(
              'button',
              {
                type: 'button',
                'data-testid': 'privacy-close-button',
                tabIndex: 0,
                style: styles.secondaryButton,
                onClick: triggerClose,
                onKeyDown: handleKeyboardActivation(triggerClose),
              },
              'Volver',
            )
          : h(
              'button',
              {
                type: 'button',
                'data-testid': 'privacy-accept-button',
                tabIndex: 0,
                style: styles.primaryButton,
                onClick: triggerAccept,
                onKeyDown: handleKeyboardActivation(triggerAccept),
              },
              'Aceptar y continuar',
            ),
      ),
    ),
  );
}

PrivacyNoticeScreen.buildStyles = buildPrivacyNoticeStyles;
