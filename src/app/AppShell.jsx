import React, { useState, useEffect } from 'react';
import { Consent, CURRENT_POLICY_VERSION } from '../domain/models/consent.js';
import { UserAccount } from '../domain/models/userAccount.js';
import { InvalidCredentials } from '../core/errors.js';
import { formatIsoDate, formatIsoDateTime } from '../core/dates.js';
import { getViewportLayout } from '../core/responsive.js';
import { CORPORATE_THEME } from '../core/theme.js';
import { PrivacyNoticeScreen } from '../features/privacy/PrivacyNoticeScreen.jsx';
import { MonthlyOverviewScreen } from '../features/income/MonthlyOverviewScreen.jsx';

const h = React.createElement;

function createBrowserFallbackConsentRepository() {
  const store = new Map();
  return {
    async findByVersion(policyVersion) {
      return store.get(policyVersion) ?? null;
    },
    async hasAcceptedVersion(policyVersion = CURRENT_POLICY_VERSION) {
      return store.has(policyVersion);
    },
    async save(consent) {
      const record = consent instanceof Consent ? consent : new Consent(consent);
      store.set(record.policyVersion, record);
      return record;
    },
  };
}

function createInMemoryUserAccountRepository() {
  const accounts = [];
  let nextId = 1;
  return {
    async register({ fullName, username, password }) {
      const cleanPass = typeof password === 'string' ? password.trim() : '';
      if (cleanPass.length < 4) {
        throw new InvalidCredentials('La clave debe tener al menos 4 caracteres');
      }
      const draft = new UserAccount({ fullName, username });
      if (accounts.some((a) => a.username === draft.username)) {
        throw new InvalidCredentials('Ya existe una cuenta con ese usuario');
      }
      const user = new UserAccount({
        id: nextId++,
        fullName: draft.fullName,
        username: draft.username,
        createdAt: formatIsoDateTime(new Date()),
      });
      accounts.push({ user, password: cleanPass });
      return user;
    },
    async authenticate({ username, password }) {
      const cleanUser =
        typeof username === 'string' ? username.trim().toLowerCase() : '';
      const cleanPass = typeof password === 'string' ? password.trim() : '';
      const found = accounts.find(
        (a) => a.user.username === cleanUser && a.password === cleanPass,
      );
      if (!found) {
        throw new InvalidCredentials('Usuario o clave incorrectos');
      }
      return found.user;
    },
  };
}

class AppConsentController {
  constructor({
    consentRepository,
    userAccountRepository = null,
    expenseRepository = null,
    categoryRepository = null,
    incomeRepository = null,
    investmentRepository = null,
    reminderRepository = null,
    requireAuth = false,
    today = () => formatIsoDate(new Date()),
    now = () => new Date(),
    viewportWidth = 390,
  } = {}) {
    if (!consentRepository) {
      throw new Error('Se requiere consentRepository');
    }
    this.consentRepository = consentRepository;
    this.userAccountRepository =
      userAccountRepository ?? createInMemoryUserAccountRepository();
    this.expenseRepository = expenseRepository;
    this.categoryRepository = categoryRepository;
    this.incomeRepository = incomeRepository;
    this.investmentRepository = investmentRepository;
    this.reminderRepository = reminderRepository;
    this.requireAuth = Boolean(requireAuth);
    this.today = today;
    this.now = now;
    this.viewportWidth = viewportWidth;
    this.consent = null;
    this.currentUser = null;
    this.authError = null;
    this.view = 'privacy_gate';
    this.initialized = false;
  }

  async initialize() {
    const existing = await this.consentRepository.findByVersion(CURRENT_POLICY_VERSION);
    this.consent = existing;
    if (!existing) {
      this.view = 'privacy_gate';
    } else if (this.requireAuth && !this.currentUser) {
      this.view = 'auth';
    } else {
      this.view = 'main';
    }
    this.initialized = true;
    return this.getState();
  }

  hasValidConsent() {
    return (
      this.consent instanceof Consent &&
      this.consent.policyVersion === CURRENT_POLICY_VERSION
    );
  }

  canAccessMainApp() {
    if (!this.hasValidConsent()) {
      return false;
    }
    if (this.requireAuth && !this.currentUser) {
      return false;
    }
    return true;
  }

  async acceptPrivacyNotice() {
    const acceptedAt = formatIsoDateTime(this.now());
    const record = new Consent({
      policyVersion: CURRENT_POLICY_VERSION,
      acceptedAt,
    });
    const saved = await this.consentRepository.save(record);
    this.consent = saved;
    this.view = this.requireAuth && !this.currentUser ? 'auth' : 'main';
    this.initialized = true;
    return this.getState();
  }

  async registerAccount({ fullName, username, password }) {
    this.authError = null;
    try {
      const user = await this.userAccountRepository.register({
        fullName,
        username,
        password,
      });
      this.currentUser = user;
      this.view = 'main';
      return this.getState();
    } catch (err) {
      this.authError = err.message;
      return this.getState();
    }
  }

  async loginAccount({ username, password }) {
    this.authError = null;
    try {
      const user = await this.userAccountRepository.authenticate({
        username,
        password,
      });
      this.currentUser = user;
      this.view = 'main';
      return this.getState();
    } catch (err) {
      this.authError = err.message;
      return this.getState();
    }
  }

  logoutAccount() {
    this.currentUser = null;
    if (this.requireAuth) {
      this.view = 'auth';
    }
    return this.getState();
  }

  openSettingsPrivacy() {
    if (!this.hasValidConsent()) {
      this.view = 'privacy_gate';
      return this.getState();
    }
    this.view = 'settings_privacy';
    return this.getState();
  }

  closeSettingsPrivacy() {
    if (!this.hasValidConsent()) {
      this.view = 'privacy_gate';
      return this.getState();
    }
    this.view = this.requireAuth && !this.currentUser ? 'auth' : 'main';
    return this.getState();
  }

  navigateTo(targetView) {
    if (!this.hasValidConsent()) {
      this.view = 'privacy_gate';
      return this.getState();
    }
    if (targetView === 'settings_privacy' || targetView === 'main') {
      this.view = targetView;
    }
    return this.getState();
  }

  setViewportWidth(width) {
    this.viewportWidth = width;
    return this.getState();
  }

  getState() {
    let resolvedView = 'privacy_gate';
    if (this.hasValidConsent()) {
      if (this.view === 'settings_privacy') {
        resolvedView = 'settings_privacy';
      } else if (this.requireAuth && !this.currentUser) {
        resolvedView = 'auth';
      } else {
        resolvedView = 'main';
      }
    }

    return Object.freeze({
      initialized: this.initialized,
      hasConsent: this.hasValidConsent(),
      canAccessMainApp: this.canAccessMainApp(),
      consent: this.consent,
      currentUser: this.currentUser,
      authError: this.authError,
      view: resolvedView,
      viewportWidth: this.viewportWidth,
    });
  }

  renderElement(children = null) {
    const state = this.getState();
    return h(
      AppShell,
      {
        consentRepository: this.consentRepository,
        userAccountRepository: this.userAccountRepository,
        expenseRepository: this.expenseRepository,
        categoryRepository: this.categoryRepository,
        incomeRepository: this.incomeRepository,
        investmentRepository: this.investmentRepository,
        reminderRepository: this.reminderRepository,
        requireAuth: this.requireAuth,
        initialConsent: state.consent,
        initialUser: state.currentUser,
        initialAuthError: state.authError,
        initialView: state.view,
        viewportWidth: state.viewportWidth,
        today: this.today,
        now: this.now,
      },
      children,
    );
  }
}

export function AppShell({
  consentRepository = null,
  userAccountRepository = null,
  expenseRepository = null,
  categoryRepository = null,
  incomeRepository = null,
  investmentRepository = null,
  reminderRepository = null,
  requireAuth = false,
  initialConsent = undefined,
  initialUser = null,
  initialAuthError = null,
  initialView = 'main',
  onDemoSeed = null,
  viewportWidth = 390,
  today = () => formatIsoDate(new Date()),
  now = () => new Date(),
  children = null,
} = {}) {
  const [repo] = useState(
    () => consentRepository ?? createBrowserFallbackConsentRepository(),
  );
  const [userRepo] = useState(
    () => userAccountRepository ?? createInMemoryUserAccountRepository(),
  );
  const [consent, setConsent] = useState(() => {
    if (
      initialConsent instanceof Consent &&
      initialConsent.policyVersion === CURRENT_POLICY_VERSION
    ) {
      return initialConsent;
    }
    return null;
  });
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [authMode, setAuthMode] = useState('login');
  const [fullNameInput, setFullNameInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(initialAuthError);

  const [loading, setLoading] = useState(initialConsent === undefined);
  const [activeView, setActiveView] = useState(() => {
    const hasValidInitial =
      initialConsent instanceof Consent &&
      initialConsent.policyVersion === CURRENT_POLICY_VERSION;
    if (!hasValidInitial) {
      return 'privacy_gate';
    }
    return initialView === 'settings_privacy' ? 'settings_privacy' : 'main';
  });

  useEffect(() => {
    let active = true;
    if (initialConsent !== undefined) {
      return undefined;
    }
    repo.findByVersion(CURRENT_POLICY_VERSION).then((stored) => {
      if (!active) {
        return;
      }
      setConsent(stored);
      setActiveView(stored ? 'main' : 'privacy_gate');
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [repo, initialConsent]);

  const hasValidConsent =
    consent instanceof Consent && consent.policyVersion === CURRENT_POLICY_VERSION;

  const handleAccept = async () => {
    const record = new Consent({
      policyVersion: CURRENT_POLICY_VERSION,
      acceptedAt: formatIsoDateTime(now()),
    });
    const saved = await repo.save(record);
    setConsent(saved);
    setActiveView('main');
    setLoading(false);
    return saved;
  };

  const handleOpenSettingsPrivacy = () => {
    if (hasValidConsent) {
      setActiveView('settings_privacy');
    }
  };

  const handleCloseSettingsPrivacy = () => {
    if (hasValidConsent) {
      setActiveView('main');
    }
  };

  const handleAuthSubmit = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    setAuthError(null);
    try {
      if (authMode === 'register') {
        const created = await userRepo.register({
          fullName: fullNameInput,
          username: usernameInput,
          password: passwordInput,
        });
        setCurrentUser(created);
      } else {
        const logged = await userRepo.authenticate({
          username: usernameInput,
          password: passwordInput,
        });
        setCurrentUser(logged);
      }
      setPasswordInput('');
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleQuickDemoLogin = async () => {
    setAuthError(null);
    if (typeof onDemoSeed === 'function') {
      const demoUser = await onDemoSeed();
      setCurrentUser(demoUser);
      return;
    }
    const demoUser = new UserAccount({
      id: 1,
      fullName: 'Juan Pablo (Cuenta Demo)',
      username: 'juanpablo',
      createdAt: formatIsoDateTime(now()),
    });
    setCurrentUser(demoUser);
  };

  if (loading && !hasValidConsent) {
    return h(PrivacyNoticeScreen, {
      consent: null,
      onAccept: handleAccept,
      readOnly: false,
      viewportWidth,
    });
  }

  if (!hasValidConsent) {
    return h(PrivacyNoticeScreen, {
      consent: null,
      onAccept: handleAccept,
      readOnly: false,
      viewportWidth,
    });
  }

  if (activeView === 'settings_privacy') {
    return h(PrivacyNoticeScreen, {
      consent,
      onClose: handleCloseSettingsPrivacy,
      readOnly: true,
      viewportWidth,
    });
  }

  const layout = getViewportLayout(viewportWidth);

  if (requireAuth && !currentUser) {
    return h(
      'main',
      {
        'data-testid': 'auth-screen',
        'data-layout': layout.isDesktop
          ? 'desktop'
          : layout.isTablet
            ? 'tablet'
            : 'mobile',
        style: {
          minHeight: '100vh',
          backgroundColor: CORPORATE_THEME.background,
          padding: layout.isMobile ? 16 : 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: CORPORATE_THEME.fontSans,
        },
      },
      h(
        'section',
        {
          style: {
            width: '100%',
            maxWidth: 460,
            backgroundColor: CORPORATE_THEME.surface,
            borderRadius: 6,
            border: `1px solid ${CORPORATE_THEME.border}`,
            borderTop: `4px solid ${CORPORATE_THEME.navyPrimary}`,
            overflow: 'hidden',
            boxShadow: '0 12px 32px rgba(11, 25, 44, 0.08)',
          },
        },
        h(
          'div',
          {
            style: {
              padding: layout.isMobile ? '20px 20px 16px' : '26px 28px 18px',
              backgroundColor: CORPORATE_THEME.navyPrimary,
              color: '#FFFFFF',
              borderBottom: `3px solid ${CORPORATE_THEME.brownPrimary}`,
            },
          },
          h(
            'span',
            {
              style: {
                display: 'inline-block',
                fontSize: 12,
                fontWeight: 500,
                color: '#CBD5E1',
                marginBottom: 6,
              },
            },
            'Bóveda personal en este dispositivo',
          ),
          h(
            'h1',
            {
              style: {
                margin: 0,
                fontSize: layout.isMobile ? 24 : 26,
                fontWeight: 500,
                fontFamily: CORPORATE_THEME.fontSerif,
                color: '#FFFFFF',
                lineHeight: 1.2,
              },
            },
            authMode === 'register'
              ? 'Apertura de cuenta patrimonial'
              : 'Ingreso al estado patrimonial',
          ),
        ),
        h(
          'div',
          {
            style: {
              padding: layout.isMobile ? 20 : 28,
            },
          },
          h(
            'p',
            {
              style: {
                margin: '0 0 18px 0',
                fontSize: 14,
                lineHeight: 1.5,
                color: CORPORATE_THEME.textSecondary,
              },
            },
            'Consultá el balance mensual, el registro de gastos, tu cartera de inversiones y los próximos vencimientos.',
          ),
          h(
            'div',
            {
              style: {
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                padding: 3,
                borderRadius: 6,
                backgroundColor: CORPORATE_THEME.surfaceMuted,
                border: `1px solid ${CORPORATE_THEME.border}`,
                marginBottom: 18,
              },
            },
            h(
              'button',
              {
                type: 'button',
                'data-testid': 'auth-mode-login-button',
                style: {
                  minHeight: 40,
                  borderRadius: 4,
                  border: 'none',
                  backgroundColor:
                    authMode === 'login' ? CORPORATE_THEME.navyPrimary : 'transparent',
                  color:
                    authMode === 'login' ? '#FFFFFF' : CORPORATE_THEME.textSecondary,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                },
                onClick: () => {
                  setAuthMode('login');
                  setAuthError(null);
                },
              },
              'Iniciar sesión',
            ),
            h(
              'button',
              {
                type: 'button',
                'data-testid': 'auth-mode-register-button',
                style: {
                  minHeight: 40,
                  borderRadius: 4,
                  border: 'none',
                  backgroundColor:
                    authMode === 'register'
                      ? CORPORATE_THEME.brownPrimary
                      : 'transparent',
                  color:
                    authMode === 'register' ? '#FFFFFF' : CORPORATE_THEME.textSecondary,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                },
                onClick: () => {
                  setAuthMode('register');
                  setAuthError(null);
                },
              },
              'Crear cuenta',
            ),
          ),
          h(
            'form',
            {
              onSubmit: handleAuthSubmit,
              style: { display: 'grid', gap: 12 },
              noValidate: true,
            },
            authMode === 'register'
              ? h('input', {
                  'data-testid': 'auth-fullname-input',
                  type: 'text',
                  placeholder: 'Nombre completo (ej: Juan Pablo)',
                  value: fullNameInput,
                  style: {
                    minHeight: 44,
                    padding: '10px 12px',
                    borderRadius: 4,
                    border: `1px solid ${CORPORATE_THEME.borderStrong}`,
                    fontSize: 15,
                  },
                  onChange: (e) => setFullNameInput(e?.target?.value ?? ''),
                })
              : null,
            h('input', {
              'data-testid': 'auth-username-input',
              type: 'text',
              placeholder: 'Usuario (ej: juanpablo)',
              value: usernameInput,
              style: {
                minHeight: 44,
                padding: '10px 12px',
                borderRadius: 4,
                border: `1px solid ${CORPORATE_THEME.borderStrong}`,
                fontSize: 15,
              },
              onChange: (e) => setUsernameInput(e?.target?.value ?? ''),
            }),
            h('input', {
              'data-testid': 'auth-password-input',
              type: 'password',
              placeholder: 'Clave local (mínimo 4 caracteres)',
              value: passwordInput,
              style: {
                minHeight: 44,
                padding: '10px 12px',
                borderRadius: 4,
                border: `1px solid ${CORPORATE_THEME.borderStrong}`,
                fontSize: 15,
              },
              onChange: (e) => setPasswordInput(e?.target?.value ?? ''),
            }),
            authError
              ? h(
                  'p',
                  {
                    'data-testid': 'auth-error',
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
                  authError,
                )
              : null,
            h(
              'button',
              {
                type: 'submit',
                'data-testid': 'auth-submit-button',
                style: {
                  minHeight: 48,
                  borderRadius: 4,
                  border: 'none',
                  backgroundColor: CORPORATE_THEME.navyPrimary,
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: 15,
                  cursor: 'pointer',
                  marginTop: 4,
                },
                onClick: handleAuthSubmit,
              },
              authMode === 'register' ? 'Abrir cuenta e ingresar' : 'Ingresar al panel',
            ),
          ),
          h(
            'div',
            {
              style: {
                marginTop: 18,
                paddingTop: 16,
                borderTop: `1px solid ${CORPORATE_THEME.border}`,
              },
            },
            h(
              'button',
              {
                type: 'button',
                'data-testid': 'auth-demo-button',
                style: {
                  width: '100%',
                  minHeight: 46,
                  borderRadius: 4,
                  border: `1px solid ${CORPORATE_THEME.brownPrimary}`,
                  backgroundColor: CORPORATE_THEME.brownSoft,
                  color: CORPORATE_THEME.brownPrimary,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                },
                onClick: handleQuickDemoLogin,
              },
              'Explorar con Cuenta Demo (cartera y gastos de ejemplo)',
            ),
          ),
        ),
      ),
    );
  }

  return h(
    'div',
    {
      'data-testid': 'app-main-screen',
      'data-layout': layout.isDesktop
        ? 'desktop'
        : layout.isTablet
          ? 'tablet'
          : 'mobile',
      style: {
        minHeight: '100vh',
        backgroundColor: CORPORATE_THEME.background,
        color: CORPORATE_THEME.textPrimary,
        padding: layout.isMobile ? 12 : 28,
        maxWidth: layout.containerMaxWidth,
        margin: '0 auto',
        fontFamily: CORPORATE_THEME.fontSans,
      },
    },
    h(
      'header',
      {
        'data-testid': 'app-header',
        style: {
          display: 'flex',
          flexDirection: layout.isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: layout.isMobile ? 'stretch' : 'center',
          gap: 12,
          padding: layout.isMobile ? '14px 16px' : '18px 24px',
          borderRadius: 6,
          backgroundColor: CORPORATE_THEME.navyPrimary,
          color: '#FFFFFF',
          borderBottom: `3px solid ${CORPORATE_THEME.brownPrimary}`,
        },
      },
      h(
        'div',
        null,
        h(
          'h1',
          {
            style: {
              margin: 0,
              fontSize: layout.isMobile ? 21 : 25,
              fontWeight: 500,
              fontFamily: CORPORATE_THEME.fontSerif,
              letterSpacing: '-0.01em',
            },
          },
          'Patrimonio y Gastos Personales',
        ),
        currentUser
          ? h(
              'span',
              {
                'data-testid': 'logged-user-badge',
                style: {
                  display: 'block',
                  fontSize: 13,
                  color: '#CBD5E1',
                  marginTop: 3,
                },
              },
              `Cuenta activa: ${currentUser.fullName} (@${currentUser.username})`,
            )
          : null,
      ),
      h(
        'div',
        { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
        h(
          'button',
          {
            type: 'button',
            'data-testid': 'open-settings-privacy-button',
            style: {
              minHeight: 40,
              padding: '8px 14px',
              borderRadius: 4,
              border: '1px solid rgba(255, 255, 255, 0.28)',
              backgroundColor: CORPORATE_THEME.navySecondary,
              color: '#FFFFFF',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
            },
            onClick: handleOpenSettingsPrivacy,
          },
          'Privacidad y datos',
        ),
        currentUser
          ? h(
              'button',
              {
                type: 'button',
                'data-testid': 'logout-button',
                style: {
                  minHeight: 40,
                  padding: '8px 14px',
                  borderRadius: 4,
                  border: `1px solid ${CORPORATE_THEME.brownAccent}`,
                  backgroundColor: CORPORATE_THEME.brownPrimary,
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                },
                onClick: () => setCurrentUser(null),
              },
              'Cerrar sesión',
            )
          : null,
      ),
    ),
    h(
      'section',
      {
        'data-testid': 'app-main-content',
        style: { paddingTop: 14 },
      },
      children ??
        h(
          React.Fragment,
          null,
          h(
            'p',
            {
              'data-testid': 'app-ready-message',
              style: {
                marginTop: 0,
                marginBottom: 12,
                color: CORPORATE_THEME.textMuted,
                fontSize: 12,
              },
            },
            'Panel principal desbloqueado — Almacenamiento exclusivo en este dispositivo (Ley 25.326).',
          ),
          h(MonthlyOverviewScreen, {
            expenseRepository,
            categoryRepository,
            incomeRepository,
            investmentRepository,
            reminderRepository,
            today,
            now,
            viewportWidth,
          }),
        ),
    ),
  );
}

AppShell.createController = (options) => new AppConsentController(options);
