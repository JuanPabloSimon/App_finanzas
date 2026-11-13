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
    async updateProfile({ id, fullName, username }) {
      const numericId = Number(id);
      const draft = new UserAccount({ id: numericId || 1, fullName, username });
      if (
        accounts.some(
          (a) => a.user.username === draft.username && a.user.id !== numericId,
        )
      ) {
        throw new InvalidCredentials('Ya existe una cuenta con ese usuario');
      }
      const found = accounts.find((a) => a.user.id === numericId);
      if (found) {
        found.user = found.user.copyWith({
          fullName: draft.fullName,
          username: draft.username,
        });
        return found.user;
      }
      return draft;
    },
  };
}

function buildAppShellStyles(viewportWidth = 390) {
  const layout = getViewportLayout(viewportWidth);
  return Object.freeze({
    layout,
    mainScreen: Object.freeze({
      minHeight: '100dvh',
      backgroundColor: CORPORATE_THEME.background,
      color: CORPORATE_THEME.textPrimary,
      padding: layout.isMobile ? 0 : '0 24px 24px',
      maxWidth: layout.isMobile ? '100%' : layout.containerMaxWidth,
      margin: layout.isMobile ? 0 : '0 auto',
      borderRadius: 0,
      boxSizing: 'border-box',
      fontFamily: CORPORATE_THEME.fontSans,
    }),
    header: Object.freeze({
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      width: '100%',
      boxSizing: 'border-box',
      margin: 0,
      padding: layout.isMobile ? '7px 14px' : '12px 24px',
      borderRadius: layout.isMobile ? 0 : '0 0 8px 8px',
      backgroundColor: CORPORATE_THEME.navyPrimary,
      color: '#FFFFFF',
      borderBottom: `3px solid ${CORPORATE_THEME.brownPrimary}`,
    }),
    brandTitle: Object.freeze({
      margin: 0,
      fontSize: layout.isMobile ? 21 : 25,
      fontWeight: 600,
      fontFamily: CORPORATE_THEME.fontSerif,
      letterSpacing: '-0.01em',
      color: '#FFFFFF',
    }),
    profileButton: Object.freeze({
      minWidth: 44,
      minHeight: 44,
      width: 44,
      height: 44,
      padding: 0,
      borderRadius: '9999px',
      border: '1px solid rgba(255, 255, 255, 0.35)',
      backgroundColor: CORPORATE_THEME.navySecondary,
      color: '#FFFFFF',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
    }),
  });
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
    this.isProfileMenuOpen = false;
    this.profileError = null;
    this.profileSuccess = null;
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

  openProfileMenu() {
    this.isProfileMenuOpen = true;
    this.profileError = null;
    return this.getState();
  }

  closeProfileMenu() {
    this.isProfileMenuOpen = false;
    this.profileError = null;
    return this.getState();
  }

  toggleProfileMenu() {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
    this.profileError = null;
    return this.getState();
  }

  async updateProfile({ fullName, username }) {
    this.profileError = null;
    this.profileSuccess = null;
    try {
      if (
        this.currentUser &&
        this.currentUser.id &&
        typeof this.userAccountRepository.updateProfile === 'function'
      ) {
        const updated = await this.userAccountRepository.updateProfile({
          id: this.currentUser.id,
          fullName,
          username,
        });
        this.currentUser = updated;
      } else {
        this.currentUser = new UserAccount({
          id: this.currentUser?.id ?? 1,
          fullName,
          username,
          createdAt: this.currentUser?.createdAt ?? formatIsoDateTime(this.now()),
        });
      }
      this.profileSuccess = 'Perfil actualizado correctamente.';
      return this.getState();
    } catch (err) {
      this.profileError = err.message;
      return this.getState();
    }
  }

  logoutAccount() {
    this.currentUser = null;
    this.isProfileMenuOpen = false;
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
    this.isProfileMenuOpen = false;
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
      isProfileMenuOpen: this.isProfileMenuOpen,
      profileError: this.profileError,
      profileSuccess: this.profileSuccess,
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
        initialProfileMenuOpen: state.isProfileMenuOpen,
        initialProfileError: state.profileError,
        initialProfileSuccess: state.profileSuccess,
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
  initialProfileMenuOpen = false,
  initialProfileError = null,
  initialProfileSuccess = null,
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

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(
    Boolean(initialProfileMenuOpen),
  );
  const [profileFullNameInput, setProfileFullNameInput] = useState(
    initialUser?.fullName ?? '',
  );
  const [profileUsernameInput, setProfileUsernameInput] = useState(
    initialUser?.username ?? '',
  );
  const [profileError, setProfileError] = useState(initialProfileError);
  const [profileSuccess, setProfileSuccess] = useState(initialProfileSuccess);

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
      setIsProfileMenuOpen(false);
      setActiveView('settings_privacy');
    }
  };

  const handleCloseSettingsPrivacy = () => {
    if (hasValidConsent) {
      setActiveView('main');
    }
  };

  const handleToggleProfileMenu = () => {
    setIsProfileMenuOpen((prev) => {
      const next = !prev;
      if (next && currentUser) {
        setProfileFullNameInput(currentUser.fullName ?? '');
        setProfileUsernameInput(currentUser.username ?? '');
      }
      return next;
    });
    setProfileError(null);
    setProfileSuccess(null);
  };

  const handleProfileSave = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    setProfileError(null);
    setProfileSuccess(null);
    try {
      let updatedUser;
      if (
        currentUser &&
        currentUser.id &&
        typeof userRepo.updateProfile === 'function'
      ) {
        updatedUser = await userRepo.updateProfile({
          id: currentUser.id,
          fullName: profileFullNameInput,
          username: profileUsernameInput,
        });
      } else {
        updatedUser = new UserAccount({
          id: currentUser?.id ?? 1,
          fullName: profileFullNameInput,
          username: profileUsernameInput,
          createdAt: currentUser?.createdAt ?? formatIsoDateTime(now()),
        });
      }
      setCurrentUser(updatedUser);
      setProfileFullNameInput(updatedUser.fullName);
      setProfileUsernameInput(updatedUser.username);
      setProfileSuccess('Perfil actualizado correctamente.');
    } catch (err) {
      setProfileError(err.message);
    }
  };

  const handleLogout = () => {
    setIsProfileMenuOpen(false);
    setCurrentUser(null);
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
        setProfileFullNameInput(created.fullName);
        setProfileUsernameInput(created.username);
      } else {
        const logged = await userRepo.authenticate({
          username: usernameInput,
          password: passwordInput,
        });
        setCurrentUser(logged);
        setProfileFullNameInput(logged.fullName);
        setProfileUsernameInput(logged.username);
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
      setProfileFullNameInput(demoUser?.fullName ?? '');
      setProfileUsernameInput(demoUser?.username ?? '');
      return;
    }
    const demoUser = new UserAccount({
      id: 1,
      fullName: 'Juan Pablo (Cuenta Demo)',
      username: 'juanpablo',
      createdAt: formatIsoDateTime(now()),
    });
    setCurrentUser(demoUser);
    setProfileFullNameInput(demoUser.fullName);
    setProfileUsernameInput(demoUser.username);
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

  const shellStyles = buildAppShellStyles(viewportWidth);

  return h(
    'div',
    {
      'data-testid': 'app-main-screen',
      'data-layout': layout.isDesktop
        ? 'desktop'
        : layout.isTablet
          ? 'tablet'
          : 'mobile',
      style: shellStyles.mainScreen,
    },
    h(
      'header',
      {
        'data-testid': 'app-header',
        style: shellStyles.header,
      },
      h(
        'h1',
        {
          'data-testid': 'app-brand-title',
          style: shellStyles.brandTitle,
        },
        'Ge$tix',
      ),
      h(
        'button',
        {
          type: 'button',
          'data-testid': 'profile-menu-button',
          'aria-expanded': isProfileMenuOpen,
          'aria-label': currentUser
            ? `Perfil — Cuenta activa: ${currentUser.fullName} (@${currentUser.username})`
            : 'Menú de perfil',
          style: shellStyles.profileButton,
          onClick: handleToggleProfileMenu,
        },
        h(
          'svg',
          {
            'data-testid': 'profile-menu-icon',
            width: 20,
            height: 20,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: '#FFFFFF',
            strokeWidth: 2,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            'aria-hidden': 'true',
          },
          h('circle', { cx: 12, cy: 8, r: 4 }),
          h('path', { d: 'M4 20c0-4 3.6-7 8-7s8 3 8 7' }),
        ),
      ),
    ),
    isProfileMenuOpen
      ? h(
          'div',
          {
            'data-testid': 'profile-menu-popover',
            role: 'dialog',
            'aria-label': 'Menú de perfil y cuenta',
            style: {
              backgroundColor: CORPORATE_THEME.surface,
              borderBottom: `2px solid ${CORPORATE_THEME.brownPrimary}`,
              borderLeft: layout.isMobile
                ? 'none'
                : `1px solid ${CORPORATE_THEME.border}`,
              borderRight: layout.isMobile
                ? 'none'
                : `1px solid ${CORPORATE_THEME.border}`,
              padding: layout.isMobile ? '14px 16px' : '16px 24px',
              boxShadow: '0 10px 24px rgba(11, 25, 44, 0.12)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            },
          },
          h(
            'div',
            {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
                paddingBottom: 8,
                borderBottom: `1px solid ${CORPORATE_THEME.border}`,
              },
            },
            h(
              'span',
              {
                'data-testid': 'logged-user-badge',
                style: {
                  fontSize: 13,
                  fontWeight: 600,
                  color: CORPORATE_THEME.navyPrimary,
                },
              },
              currentUser
                ? `Cuenta activa: ${currentUser.fullName} (@${currentUser.username})`
                : 'Cuenta local en este dispositivo',
            ),
            h(
              'button',
              {
                type: 'button',
                'data-testid': 'profile-menu-close-button',
                style: {
                  minHeight: 32,
                  padding: '4px 10px',
                  borderRadius: 4,
                  border: `1px solid ${CORPORATE_THEME.border}`,
                  backgroundColor: CORPORATE_THEME.surfaceMuted,
                  color: CORPORATE_THEME.textSecondary,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                },
                onClick: () => setIsProfileMenuOpen(false),
              },
              'Cerrar panel',
            ),
          ),
          h(
            'form',
            {
              'data-testid': 'profile-edit-form',
              onSubmit: handleProfileSave,
              noValidate: true,
              style: {
                display: 'grid',
                gridTemplateColumns: layout.isMobile
                  ? '1fr'
                  : '1fr 1fr auto',
                gap: 8,
                alignItems: 'center',
              },
            },
            h('input', {
              'data-testid': 'profile-fullname-input',
              type: 'text',
              placeholder: 'Nombre completo',
              value: profileFullNameInput,
              style: {
                minHeight: 40,
                padding: '7px 10px',
                borderRadius: 4,
                border: `1px solid ${CORPORATE_THEME.borderStrong}`,
                backgroundColor: '#FFFFFF',
                color: CORPORATE_THEME.textPrimary,
                fontSize: 13,
              },
              onChange: (e) => setProfileFullNameInput(e?.target?.value ?? ''),
            }),
            h('input', {
              'data-testid': 'profile-username-input',
              type: 'text',
              placeholder: 'Usuario (@alias)',
              value: profileUsernameInput,
              style: {
                minHeight: 40,
                padding: '7px 10px',
                borderRadius: 4,
                border: `1px solid ${CORPORATE_THEME.borderStrong}`,
                backgroundColor: '#FFFFFF',
                color: CORPORATE_THEME.textPrimary,
                fontSize: 13,
              },
              onChange: (e) => setProfileUsernameInput(e?.target?.value ?? ''),
            }),
            h(
              'button',
              {
                type: 'submit',
                'data-testid': 'profile-save-button',
                style: {
                  minHeight: 40,
                  padding: '8px 14px',
                  borderRadius: 4,
                  border: 'none',
                  backgroundColor: CORPORATE_THEME.navyPrimary,
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                },
                onClick: handleProfileSave,
              },
              'Guardar perfil',
            ),
          ),
          profileError
            ? h(
                'p',
                {
                  'data-testid': 'profile-edit-error',
                  role: 'alert',
                  style: {
                    margin: 0,
                    padding: '6px 10px',
                    borderRadius: 4,
                    backgroundColor: CORPORATE_THEME.dangerBg,
                    color: CORPORATE_THEME.danger,
                    fontSize: 12,
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
                    padding: '6px 10px',
                    borderRadius: 4,
                    backgroundColor: CORPORATE_THEME.successBg,
                    color: CORPORATE_THEME.success,
                    fontSize: 12,
                    fontWeight: 600,
                  },
                },
                profileSuccess,
              )
            : null,
          h(
            'div',
            {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
                paddingTop: 8,
                borderTop: `1px solid ${CORPORATE_THEME.border}`,
              },
            },
            h(
              'button',
              {
                type: 'button',
                'data-testid': 'open-settings-privacy-button',
                style: {
                  minHeight: 36,
                  padding: '6px 10px',
                  borderRadius: 4,
                  border: `1px solid ${CORPORATE_THEME.border}`,
                  backgroundColor: 'transparent',
                  color: CORPORATE_THEME.textSecondary,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 500,
                },
                onClick: handleOpenSettingsPrivacy,
              },
              'Privacidad y datos (Ley 25.326)',
            ),
            h(
              'button',
              {
                type: 'button',
                'data-testid': 'logout-button',
                style: {
                  minHeight: 36,
                  padding: '6px 14px',
                  borderRadius: 4,
                  border: `1px solid ${CORPORATE_THEME.brownAccent}`,
                  backgroundColor: CORPORATE_THEME.brownPrimary,
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                },
                onClick: handleLogout,
              },
              'Cerrar sesión',
            ),
          ),
        )
      : null,
    h(
      'section',
      {
        'data-testid': 'app-main-content',
        style: { paddingTop: 0 },
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
                position: 'absolute',
                width: 1,
                height: 1,
                padding: 0,
                margin: -1,
                overflow: 'hidden',
                clip: 'rect(0, 0, 0, 0)',
                whiteSpace: 'nowrap',
                border: 0,
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
AppShell.buildStyles = buildAppShellStyles;
