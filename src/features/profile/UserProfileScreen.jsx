import React from 'react';
import { getViewportLayout } from '../../core/responsive.js';
import { CORPORATE_THEME } from '../../core/theme.js';

const h = React.createElement;

function buildUserProfileStyles(viewportWidth = 390) {
  const layout = getViewportLayout(viewportWidth);
  return Object.freeze({
    layout,
    screen: Object.freeze({
      width: layout.isDesktop ? layout.desktopContainerWidth : '100%',
      maxWidth: layout.isDesktop ? layout.desktopContainerMaxWidth : layout.containerMaxWidth,
      margin: '0 auto',
      padding: layout.isMobile ? '16px 14px 32px' : '28px 24px 40px',
      boxSizing: 'border-box',
      fontFamily: CORPORATE_THEME.fontSans,
      color: CORPORATE_THEME.textPrimary,
    }),
    topBar: Object.freeze({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: layout.isMobile ? 16 : 24,
      paddingBottom: 14,
      borderBottom: `1px solid ${CORPORATE_THEME.border}`,
    }),
    grid: Object.freeze({
      display: 'grid',
      gridTemplateColumns: layout.isMobile ? '1fr' : 'minmax(0, 1.05fr) minmax(0, 0.95fr)',
      gap: layout.isMobile ? 16 : 24,
      alignItems: 'start',
    }),
    cardNavy: Object.freeze({
      backgroundColor: CORPORATE_THEME.surface,
      border: `1px solid ${CORPORATE_THEME.border}`,
      borderTop: `3px solid ${CORPORATE_THEME.navyPrimary}`,
      borderRadius: 6,
      padding: layout.isMobile ? 16 : 24,
    }),
    cardBrown: Object.freeze({
      backgroundColor: CORPORATE_THEME.surface,
      border: `1px solid ${CORPORATE_THEME.border}`,
      borderTop: `3px solid ${CORPORATE_THEME.brownPrimary}`,
      borderRadius: 6,
      padding: layout.isMobile ? 16 : 24,
    }),
    input: Object.freeze({
      minHeight: 44,
      width: '100%',
      padding: '10px 12px',
      borderRadius: 4,
      border: `1px solid ${CORPORATE_THEME.borderStrong}`,
      boxSizing: 'border-box',
      backgroundColor: '#FFFFFF',
      color: CORPORATE_THEME.textPrimary,
      caretColor: '#0B192C',
      colorScheme: 'light',
      fontSize: 14,
    }),
    primaryButton: Object.freeze({
      minHeight: 46,
      width: layout.isMobile ? '100%' : 'auto',
      padding: '10px 20px',
      borderRadius: 4,
      border: 'none',
      backgroundColor: CORPORATE_THEME.navyPrimary,
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: 600,
      cursor: 'pointer',
    }),
    brownButton: Object.freeze({
      minHeight: 46,
      width: layout.isMobile ? '100%' : 'auto',
      padding: '10px 20px',
      borderRadius: 4,
      border: 'none',
      backgroundColor: CORPORATE_THEME.brownPrimary,
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: 600,
      cursor: 'pointer',
    }),
    secondaryButton: Object.freeze({
      minHeight: 42,
      padding: '8px 16px',
      borderRadius: 4,
      border: `1px solid ${CORPORATE_THEME.borderStrong}`,
      backgroundColor: CORPORATE_THEME.surface,
      color: CORPORATE_THEME.navyPrimary,
      fontSize: 13.5,
      fontWeight: 600,
      cursor: 'pointer',
    }),
  });
}

export function UserProfileScreen({
  currentUser = null,
  consent = null,
  fullNameInput = '',
  usernameInput = '',
  onFullNameChange = () => {},
  onUsernameChange = () => {},
  onSaveProfile = () => {},
  profileError = null,
  profileSuccess = null,
  currentPasswordInput = '',
  newPasswordInput = '',
  onCurrentPasswordChange = () => {},
  onNewPasswordChange = () => {},
  onChangePassword = () => {},
  passwordError = null,
  passwordSuccess = null,
  onClose = () => {},
  onOpenPrivacy = () => {},
  onLogout = () => {},
  viewportWidth = 390,
} = {}) {
  const styles = buildUserProfileStyles(viewportWidth);
  const { layout } = styles;
  const layoutMode = layout.isDesktop
    ? 'desktop'
    : layout.isTablet
      ? 'tablet'
      : 'mobile';

  return h(
    'section',
    {
      'data-testid': 'user-profile-screen',
      'data-layout': layoutMode,
      'aria-label': 'Perfil del titular de la cuenta',
      style: styles.screen,
    },
    h(
      'div',
      { style: styles.topBar },
      h(
        'div',
        null,
        h(
          'h2',
          {
            style: {
              margin: '0 0 4px 0',
              fontSize: layout.isMobile ? 22 : 26,
              fontFamily: CORPORATE_THEME.fontSerif,
              fontWeight: 600,
              color: CORPORATE_THEME.navyPrimary,
            },
          },
          'Perfil del titular de la cuenta',
        ),
        h(
          'span',
          {
            'data-testid': 'logged-user-badge',
            style: {
              fontSize: 13.5,
              fontWeight: 600,
              color: CORPORATE_THEME.textSecondary,
              fontVariantNumeric: CORPORATE_THEME.tabularNums,
            },
          },
          currentUser
            ? `Cuenta activa: ${currentUser.fullName} (@${currentUser.username})`
            : 'Cuenta local en este dispositivo',
        ),
      ),
      h(
        'button',
        {
          type: 'button',
          'data-testid': 'close-profile-page-button',
          style: styles.secondaryButton,
          onClick: onClose,
        },
        'Volver al panel',
      ),
    ),
    h(
      'div',
      { style: styles.grid },
      h(
        'div',
        { style: styles.cardNavy },
        h(
          'h3',
          {
            style: {
              margin: '0 0 6px 0',
              fontSize: 18,
              fontFamily: CORPORATE_THEME.fontSerif,
              fontWeight: 600,
              color: CORPORATE_THEME.navyPrimary,
            },
          },
          'Datos personales de la cuenta local',
        ),
        h(
          'p',
          {
            style: {
              margin: '0 0 16px 0',
              fontSize: 13.5,
              lineHeight: 1.45,
              color: CORPORATE_THEME.textSecondary,
            },
          },
          'Actualizá tu nombre visible y el alias con el que ingresás en este dispositivo.',
        ),
        h(
          'form',
          {
            'data-testid': 'profile-edit-form',
            onSubmit: onSaveProfile,
            noValidate: true,
            style: { display: 'grid', gap: 12 },
          },
          h(
            'div',
            null,
            h(
              'label',
              {
                htmlFor: 'profile-fullname-input',
                style: {
                  display: 'block',
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: CORPORATE_THEME.textSecondary,
                  marginBottom: 4,
                },
              },
              'Nombre completo',
            ),
            h('input', {
              id: 'profile-fullname-input',
              'data-testid': 'profile-fullname-input',
              type: 'text',
              placeholder: 'Nombre completo',
              value: fullNameInput,
              style: styles.input,
              onChange: (e) => onFullNameChange(e?.target?.value ?? ''),
            }),
          ),
          h(
            'div',
            null,
            h(
              'label',
              {
                htmlFor: 'profile-username-input',
                style: {
                  display: 'block',
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: CORPORATE_THEME.textSecondary,
                  marginBottom: 4,
                },
              },
              'Usuario (@alias)',
            ),
            h('input', {
              id: 'profile-username-input',
              'data-testid': 'profile-username-input',
              type: 'text',
              placeholder: 'Usuario (@alias)',
              value: usernameInput,
              style: styles.input,
              onChange: (e) => onUsernameChange(e?.target?.value ?? ''),
            }),
          ),
          profileError
            ? h(
                'p',
                {
                  'data-testid': 'profile-edit-error',
                  role: 'alert',
                  style: {
                    margin: 0,
                    padding: '8px 10px',
                    borderRadius: 4,
                    backgroundColor: CORPORATE_THEME.dangerBg,
                    color: CORPORATE_THEME.danger,
                    fontSize: 13,
                    fontWeight: 600,
                  },
                },
                profileError,
              )
            : null,
          profileSuccess
            ? h(
                'p',
                {
                  'data-testid': 'profile-edit-success',
                  style: {
                    margin: 0,
                    padding: '8px 10px',
                    borderRadius: 4,
                    backgroundColor: CORPORATE_THEME.successBg,
                    color: CORPORATE_THEME.success,
                    fontSize: 13,
                    fontWeight: 600,
                  },
                },
                profileSuccess,
              )
            : null,
          h(
            'div',
            null,
            h(
              'button',
              {
                type: 'submit',
                'data-testid': 'profile-save-button',
                style: styles.primaryButton,
                onClick: onSaveProfile,
              },
              'Guardar cambios de perfil',
            ),
          ),
        ),
        h(
          'div',
          {
            style: {
              marginTop: 20,
              paddingTop: 16,
              borderTop: `1px solid ${CORPORATE_THEME.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
            },
          },
          h(
            'button',
            {
              type: 'button',
              'data-testid': 'open-settings-privacy-button',
              style: styles.secondaryButton,
              onClick: onOpenPrivacy,
            },
            consent
              ? `Privacidad Ley 25.326 (v${consent.policyVersion})`
              : 'Privacidad y datos (Ley 25.326)',
          ),
          h(
            'button',
            {
              type: 'button',
              'data-testid': 'logout-button',
              style: styles.brownButton,
              onClick: onLogout,
            },
            'Cerrar sesión',
          ),
        ),
      ),
      h(
        'div',
        { style: styles.cardBrown },
        h(
          'h3',
          {
            style: {
              margin: '0 0 6px 0',
              fontSize: 18,
              fontFamily: CORPORATE_THEME.fontSerif,
              fontWeight: 600,
              color: CORPORATE_THEME.brownPrimary,
            },
          },
          'Seguridad y cambio de contraseña',
        ),
        h(
          'p',
          {
            style: {
              margin: '0 0 16px 0',
              fontSize: 13.5,
              lineHeight: 1.45,
              color: CORPORATE_THEME.textSecondary,
            },
          },
          'Para actualizar tu clave local ingresá tu contraseña actual y elegí una nueva de al menos 4 caracteres.',
        ),
        h(
          'form',
          {
            'data-testid': 'profile-password-form',
            onSubmit: onChangePassword,
            noValidate: true,
            style: { display: 'grid', gap: 12 },
          },
          h(
            'div',
            null,
            h(
              'label',
              {
                htmlFor: 'profile-current-password-input',
                style: {
                  display: 'block',
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: CORPORATE_THEME.textSecondary,
                  marginBottom: 4,
                },
              },
              'Contraseña actual',
            ),
            h('input', {
              id: 'profile-current-password-input',
              'data-testid': 'profile-current-password-input',
              type: 'password',
              placeholder: 'Ingresá tu clave actual',
              value: currentPasswordInput,
              style: styles.input,
              onChange: (e) => onCurrentPasswordChange(e?.target?.value ?? ''),
            }),
          ),
          h(
            'div',
            null,
            h(
              'label',
              {
                htmlFor: 'profile-new-password-input',
                style: {
                  display: 'block',
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: CORPORATE_THEME.textSecondary,
                  marginBottom: 4,
                },
              },
              'Nueva contraseña (mínimo 4 caracteres)',
            ),
            h('input', {
              id: 'profile-new-password-input',
              'data-testid': 'profile-new-password-input',
              type: 'password',
              placeholder: 'Ingresá la nueva clave',
              value: newPasswordInput,
              style: styles.input,
              onChange: (e) => onNewPasswordChange(e?.target?.value ?? ''),
            }),
          ),
          passwordError
            ? h(
                'p',
                {
                  'data-testid': 'profile-password-error',
                  role: 'alert',
                  style: {
                    margin: 0,
                    padding: '8px 10px',
                    borderRadius: 4,
                    backgroundColor: CORPORATE_THEME.dangerBg,
                    color: CORPORATE_THEME.danger,
                    fontSize: 13,
                    fontWeight: 600,
                  },
                },
                passwordError,
              )
            : null,
          passwordSuccess
            ? h(
                'p',
                {
                  'data-testid': 'profile-password-success',
                  style: {
                    margin: 0,
                    padding: '8px 10px',
                    borderRadius: 4,
                    backgroundColor: CORPORATE_THEME.successBg,
                    color: CORPORATE_THEME.success,
                    fontSize: 13,
                    fontWeight: 600,
                  },
                },
                passwordSuccess,
              )
            : null,
          h(
            'div',
            null,
            h(
              'button',
              {
                type: 'submit',
                'data-testid': 'profile-password-submit-button',
                style: styles.brownButton,
                onClick: onChangePassword,
              },
              'Actualizar contraseña',
            ),
          ),
        ),
      ),
    ),
  );
}

UserProfileScreen.buildStyles = buildUserProfileStyles;
