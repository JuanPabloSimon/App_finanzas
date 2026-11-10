import React, { useState, useEffect } from 'react';
import { Consent, CURRENT_POLICY_VERSION } from '../domain/models/consent.js';
import { formatIsoDate, formatIsoDateTime } from '../core/dates.js';
import { getViewportLayout } from '../core/responsive.js';
import { PrivacyNoticeScreen } from '../features/privacy/PrivacyNoticeScreen.jsx';
import { ExpenseFormScreen } from '../features/expenses/ExpenseFormScreen.jsx';

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

class AppConsentController {
  constructor({
    consentRepository,
    expenseRepository = null,
    categoryRepository = null,
    today = () => formatIsoDate(new Date()),
    now = () => new Date(),
    viewportWidth = 390,
  } = {}) {
    if (!consentRepository) {
      throw new Error('Se requiere consentRepository');
    }
    this.consentRepository = consentRepository;
    this.expenseRepository = expenseRepository;
    this.categoryRepository = categoryRepository;
    this.today = today;
    this.now = now;
    this.viewportWidth = viewportWidth;
    this.consent = null;
    this.view = 'privacy_gate';
    this.initialized = false;
  }

  async initialize() {
    const existing = await this.consentRepository.findByVersion(CURRENT_POLICY_VERSION);
    this.consent = existing;
    this.view = existing ? 'main' : 'privacy_gate';
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
    return this.hasValidConsent();
  }

  async acceptPrivacyNotice() {
    const acceptedAt = formatIsoDateTime(this.now());
    const record = new Consent({
      policyVersion: CURRENT_POLICY_VERSION,
      acceptedAt,
    });
    const saved = await this.consentRepository.save(record);
    this.consent = saved;
    this.view = 'main';
    this.initialized = true;
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
    this.view = 'main';
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
    return Object.freeze({
      initialized: this.initialized,
      hasConsent: this.hasValidConsent(),
      canAccessMainApp: this.canAccessMainApp(),
      consent: this.consent,
      view: this.hasValidConsent() ? this.view : 'privacy_gate',
      viewportWidth: this.viewportWidth,
    });
  }

  renderElement(children = null) {
    const state = this.getState();
    return h(
      AppShell,
      {
        consentRepository: this.consentRepository,
        expenseRepository: this.expenseRepository,
        categoryRepository: this.categoryRepository,
        initialConsent: state.consent,
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
  expenseRepository = null,
  categoryRepository = null,
  initialConsent = undefined,
  initialView = 'main',
  viewportWidth = 390,
  today = () => formatIsoDate(new Date()),
  now = () => new Date(),
  children = null,
} = {}) {
  const [repo] = useState(
    () => consentRepository ?? createBrowserFallbackConsentRepository(),
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
        padding: layout.isMobile ? 16 : 32,
        maxWidth: layout.containerMaxWidth,
        margin: '0 auto',
        fontFamily: 'system-ui, sans-serif',
      },
    },
    h(
      'header',
      {
        'data-testid': 'app-header',
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          paddingBottom: 16,
          borderBottom: '1px solid #e2e8f0',
        },
      },
      h(
        'h1',
        { style: { margin: 0, fontSize: layout.isMobile ? 20 : 24 } },
        'Gestor de Gastos Personales',
      ),
      h(
        'button',
        {
          type: 'button',
          'data-testid': 'open-settings-privacy-button',
          style: {
            minHeight: 48,
            padding: '10px 16px',
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            backgroundColor: '#ffffff',
            cursor: 'pointer',
            fontWeight: 600,
          },
          onClick: handleOpenSettingsPrivacy,
        },
        'Ajustes: Aviso de privacidad',
      ),
    ),
    h(
      'section',
      {
        'data-testid': 'app-main-content',
        style: { paddingTop: 24 },
      },
      children ??
        h(
          React.Fragment,
          null,
          h(
            'p',
            {
              'data-testid': 'app-ready-message',
              style: { marginTop: 0, marginBottom: 16, color: '#475569', fontSize: 14 },
            },
            'Panel principal desbloqueado. Tus datos se almacenan localmente en este dispositivo.',
          ),
          h(ExpenseFormScreen, {
            expenseRepository,
            categoryRepository,
            today,
            now,
            viewportWidth,
          }),
        ),
    ),
  );
}

AppShell.createController = (options) => new AppConsentController(options);
