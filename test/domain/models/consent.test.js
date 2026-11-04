import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Consent,
  CURRENT_POLICY_VERSION,
  PRIVACY_NOTICE_CONTENT,
  PRIVACY_NOTICE_SECTIONS,
} from '../../../src/domain/models/consent.js';
import { ConsentRepository } from '../../../src/domain/repositories/consentRepository.js';
import { InvalidConsent } from '../../../src/core/errors.js';
import { formatIsoDateTime, isValidIsoDateTime } from '../../../src/core/dates.js';

describe('H12 modelo de dominio Consent y contenido del aviso de privacidad', () => {
  it('[H12-R3] PRIVACY_NOTICE_CONTENT incluye finalidad, almacenamiento local en SQLite y condiciones de transferencia del resumen agregado al proveedor del modelo', () => {
    assert.equal(PRIVACY_NOTICE_CONTENT.version, CURRENT_POLICY_VERSION);
    assert.equal(Object.isFrozen(PRIVACY_NOTICE_CONTENT), true);
    assert.equal(Object.isFrozen(PRIVACY_NOTICE_SECTIONS), true);
    assert.equal(PRIVACY_NOTICE_SECTIONS.length, 3);

    assert.match(PRIVACY_NOTICE_CONTENT.purpose, /finalidad/i);
    assert.match(PRIVACY_NOTICE_CONTENT.purpose, /registrar gastos/i);
    assert.match(PRIVACY_NOTICE_CONTENT.purpose, /orientativas/i);

    assert.match(PRIVACY_NOTICE_CONTENT.localStorage, /SQLite/i);
    assert.match(PRIVACY_NOTICE_CONTENT.localStorage, /dispositivo/i);
    assert.match(PRIVACY_NOTICE_CONTENT.localStorage, /sin servidores propios/i);

    assert.match(PRIVACY_NOTICE_CONTENT.thirdPartyTransfer, /resumen agregado/i);
    assert.match(PRIVACY_NOTICE_CONTENT.thirdPartyTransfer, /notas/i);
    assert.match(PRIVACY_NOTICE_CONTENT.thirdPartyTransfer, /subcategorías/i);
    assert.match(PRIVACY_NOTICE_CONTENT.thirdPartyTransfer, /identificadores/i);
  });

  it('[H12-R4] crea una instancia inmutable de Consent con versión y fecha ISO 8601 válida y soporta copyWith e isEqual', () => {
    const formatted = formatIsoDateTime(new Date(2026, 9, 15, 14, 30, 5));
    assert.equal(formatted, '2026-10-15T14:30:05');
    assert.equal(isValidIsoDateTime(formatted), true);

    const consent = new Consent({
      policyVersion: CURRENT_POLICY_VERSION,
      acceptedAt: formatted,
    });

    assert.equal(consent.policyVersion, '2026-10');
    assert.equal(consent.acceptedAt, '2026-10-15T14:30:05');
    assert.equal(Object.isFrozen(consent), true);

    assert.throws(() => {
      consent.policyVersion = '2026-11';
    }, TypeError);

    const copy = consent.copyWith({ acceptedAt: '2026-10-16T09:00:00' });
    assert.equal(copy.policyVersion, '2026-10');
    assert.equal(copy.acceptedAt, '2026-10-16T09:00:00');
    assert.equal(consent.isEqual(copy), false);
    assert.equal(
      consent.isEqual(
        new Consent({
          policyVersion: '2026-10',
          acceptedAt: '2026-10-15T14:30:05',
        }),
      ),
      true,
    );
  });

  it('[H12-R4] rechaza versiones vacías o fechas que no cumplen ISO 8601 sin zona (YYYY-MM-DDTHH:MM:SS) lanzando InvalidConsent', () => {
    assert.throws(
      () => new Consent({ policyVersion: '', acceptedAt: '2026-10-15T14:30:05' }),
      InvalidConsent,
    );
    assert.throws(
      () => new Consent({ policyVersion: '   ', acceptedAt: '2026-10-15T14:30:05' }),
      InvalidConsent,
    );
    assert.throws(
      () => new Consent({ policyVersion: '2026-10', acceptedAt: '2026-10-15' }),
      InvalidConsent,
    );
    assert.throws(
      () => new Consent({ policyVersion: '2026-10', acceptedAt: '2026-02-30T10:00:00' }),
      InvalidConsent,
    );
    assert.throws(
      () => new Consent({ policyVersion: '2026-10', acceptedAt: '2026-10-15T14:30:05Z' }),
      InvalidConsent,
    );
  });

  it('[H12-R4] ConsentRepository define el contrato base requerido por el dominio', async () => {
    const repo = new ConsentRepository();
    await assert.rejects(() => repo.findByVersion('2026-10'), /Not implemented/);
    await assert.rejects(() => repo.hasAcceptedVersion(), /Not implemented/);
    await assert.rejects(
      () =>
        repo.save(
          new Consent({ policyVersion: '2026-10', acceptedAt: '2026-10-15T14:30:05' }),
        ),
      /Not implemented/,
    );
  });
});
