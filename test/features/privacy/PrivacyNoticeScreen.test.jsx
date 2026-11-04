import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppDatabase } from '../../../src/data/db/appDatabase.js';
import { SqliteConsentRepository } from '../../../src/data/repositories/sqliteConsentRepository.js';
import { Consent, CURRENT_POLICY_VERSION } from '../../../src/domain/models/consent.js';
import { PrivacyNoticeScreen } from '../../../src/features/privacy/PrivacyNoticeScreen.jsx';
import { AppShell } from '../../../src/app/AppShell.jsx';

const h = React.createElement;

function findElementByTestId(node, testId) {
  if (!node || typeof node !== 'object') {
    return null;
  }
  if (node.props && node.props['data-testid'] === testId) {
    return node;
  }
  const children = node.props?.children;
  if (!children) {
    return null;
  }
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    const found = findElementByTestId(child, testId);
    if (found) {
      return found;
    }
  }
  return null;
}

describe('H12 pantalla de aviso de privacidad, bloqueo inicial, ajustes y diseño Mobile First + Desktop', () => {
  let db;
  let repo;

  beforeEach(async () => {
    db = await AppDatabase.openInMemory();
    repo = new SqliteConsentRepository(db);
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  it('[H12-R1][H12-R2] en el primer inicio sin consentimiento vigente muestra el aviso de privacidad y bloquea el acceso a la pantalla principal', async () => {
    const controller = AppShell.createController({
      consentRepository: repo,
      viewportWidth: 390,
    });
    const state = await controller.initialize();

    assert.equal(state.initialized, true);
    assert.equal(state.hasConsent, false);
    assert.equal(state.canAccessMainApp, false);
    assert.equal(state.view, 'privacy_gate');

    const afterAttempt = controller.navigateTo('main');
    assert.equal(afterAttempt.canAccessMainApp, false);
    assert.equal(afterAttempt.view, 'privacy_gate');

    const settingsAttempt = controller.openSettingsPrivacy();
    assert.equal(settingsAttempt.canAccessMainApp, false);
    assert.equal(settingsAttempt.view, 'privacy_gate');

    const html = renderToStaticMarkup(
      controller.renderElement(
        h('div', { 'data-testid': 'protected-dashboard' }, 'Contenido protegido'),
      ),
    );
    assert.match(html, /data-testid="privacy-notice-screen"/);
    assert.match(html, /Aceptar y continuar/);
    assert.doesNotMatch(html, /data-testid="app-main-screen"/);
    assert.doesNotMatch(html, /Contenido protegido/);
  });

  it('[H12-R2] si solo existe consentimiento de una versión anterior del aviso mantiene bloqueado el acceso hasta aceptar la versión vigente', async () => {
    await repo.save(
      new Consent({
        policyVersion: '2025-01',
        acceptedAt: '2025-01-15T12:00:00',
      }),
    );

    const controller = AppShell.createController({
      consentRepository: repo,
      viewportWidth: 390,
    });
    const state = await controller.initialize();

    assert.equal(state.hasConsent, false);
    assert.equal(state.canAccessMainApp, false);
    assert.equal(state.view, 'privacy_gate');

    const html = renderToStaticMarkup(controller.renderElement());
    assert.match(html, /data-testid="privacy-notice-screen"/);
    assert.doesNotMatch(html, /data-testid="app-main-screen"/);
  });

  it('[H12-R3] muestra en el aviso de privacidad la finalidad, el almacenamiento local en SQLite y la transferencia solo de resumen agregado al proveedor del modelo', () => {
    const html = renderToStaticMarkup(
      h(PrivacyNoticeScreen, {
        consent: null,
        readOnly: false,
        viewportWidth: 390,
      }),
    );

    assert.match(html, /Ley 25\.326/);
    assert.match(html, /Finalidad del tratamiento/);
    assert.match(html, /registrar gastos e ingresos/);
    assert.match(html, /recomendaciones orientativas/);
    assert.match(html, /Almacenamiento 100 % local en el dispositivo/);
    assert.match(html, /SQLite local \(gastos\.db\)/);
    assert.match(html, /sin servidores propios/);
    assert.match(html, /Transferencia al proveedor del modelo de lenguaje/);
    assert.match(html, /resumen agregado/);
    assert.match(html, /Nunca se transfieren notas, subcategorías, fechas exactas/);
  });

  it('[H12-R5] al confirmar la aceptación guarda el consentimiento en SQLite y desbloquea de inmediato la pantalla principal sin reiniciar', async () => {
    const fixedDate = new Date(2026, 9, 25, 16, 40, 12);
    const controller = AppShell.createController({
      consentRepository: repo,
      now: () => fixedDate,
      viewportWidth: 390,
    });

    await controller.initialize();
    assert.equal(controller.getState().canAccessMainApp, false);

    const unlockedState = await controller.acceptPrivacyNotice();
    assert.equal(unlockedState.hasConsent, true);
    assert.equal(unlockedState.canAccessMainApp, true);
    assert.equal(unlockedState.view, 'main');
    assert.equal(unlockedState.consent.policyVersion, CURRENT_POLICY_VERSION);
    assert.equal(unlockedState.consent.acceptedAt, '2026-10-25T16:40:12');

    const persisted = await repo.findByVersion(CURRENT_POLICY_VERSION);
    assert.notEqual(persisted, null);
    assert.equal(persisted.acceptedAt, '2026-10-25T16:40:12');

    const html = renderToStaticMarkup(controller.renderElement());
    assert.match(html, /data-testid="app-main-screen"/);
    assert.match(html, /Panel principal desbloqueado/);
    assert.doesNotMatch(html, /Aceptar y continuar/);
  });

  it('[H12-R6] cuando ya existe un consentimiento registrado para la versión vigente inicia directamente en la pantalla principal', async () => {
    await repo.save(
      new Consent({
        policyVersion: CURRENT_POLICY_VERSION,
        acceptedAt: '2026-10-12T08:20:00',
      }),
    );

    const controller = AppShell.createController({
      consentRepository: repo,
      viewportWidth: 390,
    });
    const state = await controller.initialize();

    assert.equal(state.hasConsent, true);
    assert.equal(state.canAccessMainApp, true);
    assert.equal(state.view, 'main');

    const html = renderToStaticMarkup(controller.renderElement());
    assert.match(html, /data-testid="app-main-screen"/);
    assert.doesNotMatch(html, /data-testid="privacy-notice-screen"/);
  });

  it('[H12-R7] al acceder desde ajustes muestra nuevamente el aviso completo junto con la versión aceptada, la fecha registrada y permite volver', async () => {
    await repo.save(
      new Consent({
        policyVersion: CURRENT_POLICY_VERSION,
        acceptedAt: '2026-10-18T19:05:44',
      }),
    );

    const controller = AppShell.createController({
      consentRepository: repo,
      viewportWidth: 390,
    });
    await controller.initialize();

    const settingsState = controller.openSettingsPrivacy();
    assert.equal(settingsState.view, 'settings_privacy');

    const settingsHtml = renderToStaticMarkup(controller.renderElement());
    assert.match(settingsHtml, /data-testid="privacy-notice-screen"/);
    assert.match(settingsHtml, /data-readonly="true"/);
    assert.match(settingsHtml, /Versión aceptada: 2026-10/);
    assert.match(settingsHtml, /Fecha de aceptación: 2026-10-18T19:05:44/);
    assert.match(settingsHtml, /Finalidad del tratamiento/);
    assert.match(settingsHtml, /Almacenamiento 100 % local/);
    assert.match(settingsHtml, /Transferencia al proveedor del modelo de lenguaje/);
    assert.match(settingsHtml, /Volver/);
    assert.doesNotMatch(settingsHtml, /Aceptar y continuar/);

    const backState = controller.closeSettingsPrivacy();
    assert.equal(backState.view, 'main');
    const mainHtml = renderToStaticMarkup(controller.renderElement());
    assert.match(mainHtml, /data-testid="app-main-screen"/);
  });

  it('[H12-R8] aplica diseño Mobile First (< 768px) en una columna con botón táctil >= 48px y se adapta a pantallas Tablet/Desktop (>= 768px) con grilla multicolumna y soporte de teclado', () => {
    let acceptedCount = 0;
    let closedCount = 0;

    const mobileTree = PrivacyNoticeScreen({
      consent: null,
      readOnly: false,
      viewportWidth: 390,
      onAccept: () => {
        acceptedCount += 1;
      },
    });

    assert.equal(mobileTree.props['data-layout'], 'mobile');
    assert.equal(mobileTree.props['data-columns'], '1');
    assert.equal(mobileTree.props.style.padding, 16);

    const mobileAcceptBtn = findElementByTestId(mobileTree, 'privacy-accept-button');
    assert.notEqual(mobileAcceptBtn, null);
    assert.equal(mobileAcceptBtn.props.style.minHeight, 48);
    assert.equal(mobileAcceptBtn.props.style.width, '100%');
    assert.equal(mobileAcceptBtn.props.tabIndex, 0);

    mobileAcceptBtn.props.onClick();
    assert.equal(acceptedCount, 1);

    mobileAcceptBtn.props.onKeyDown({ key: 'Enter', preventDefault() {} });
    assert.equal(acceptedCount, 2);

    const tabletTree = PrivacyNoticeScreen({
      consent: null,
      readOnly: false,
      viewportWidth: 800,
    });
    assert.equal(tabletTree.props['data-layout'], 'tablet');
    assert.equal(tabletTree.props['data-columns'], '2');
    const tabletContainer = findElementByTestId(tabletTree, 'privacy-notice-container');
    assert.equal(tabletContainer.props.style.maxWidth, 720);

    const desktopTree = PrivacyNoticeScreen({
      consent: new Consent({
        policyVersion: CURRENT_POLICY_VERSION,
        acceptedAt: '2026-10-30T11:22:33',
      }),
      readOnly: true,
      viewportWidth: 1280,
      onClose: () => {
        closedCount += 1;
      },
    });
    assert.equal(desktopTree.props['data-layout'], 'desktop');
    assert.equal(desktopTree.props['data-columns'], '3');
    const desktopContainer = findElementByTestId(desktopTree, 'privacy-notice-container');
    assert.equal(desktopContainer.props.style.maxWidth, 960);

    const purposeCard = findElementByTestId(desktopTree, 'privacy-section-purpose');
    assert.equal(purposeCard.props.tabIndex, 0);

    const closeBtn = findElementByTestId(desktopTree, 'privacy-close-button');
    assert.notEqual(closeBtn, null);
    assert.equal(closeBtn.props.style.minHeight, 48);
    closeBtn.props.onKeyDown({ key: ' ', preventDefault() {} });
    assert.equal(closedCount, 1);
  });
});
