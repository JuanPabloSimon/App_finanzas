import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { AppDatabase, PREDEFINED_CATEGORIES } from '../../src/data/db/appDatabase.js';
import { SqliteConsentRepository } from '../../src/data/repositories/sqliteConsentRepository.js';
import { Consent, CURRENT_POLICY_VERSION } from '../../src/domain/models/consent.js';
import { InvalidConsent } from '../../src/core/errors.js';

describe('H12 persistencia de consentimiento en SQLite (SqliteConsentRepository)', () => {
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

  it('[H12-R4] guarda la versión del aviso y la fecha de aceptación en formato ISO 8601 en la tabla consents y permite recuperarla', async () => {
    const consent = new Consent({
      policyVersion: CURRENT_POLICY_VERSION,
      acceptedAt: '2026-10-20T18:15:30',
    });

    const saved = await repo.save(consent);
    assert.equal(saved.isEqual(consent), true);

    const found = await repo.findByVersion(CURRENT_POLICY_VERSION);
    assert.notEqual(found, null);
    assert.equal(found.policyVersion, '2026-10');
    assert.equal(found.acceptedAt, '2026-10-20T18:15:30');
    assert.equal(found.isEqual(consent), true);
  });

  it('[H12-R4] es idempotente ante doble guardado de la misma versión y rechaza datos inválidos', async () => {
    const first = new Consent({
      policyVersion: CURRENT_POLICY_VERSION,
      acceptedAt: '2026-10-20T18:15:00',
    });
    const second = new Consent({
      policyVersion: CURRENT_POLICY_VERSION,
      acceptedAt: '2026-10-20T18:15:05',
    });

    await repo.save(first);
    await repo.save(second);

    const rows = await db.all('SELECT policy_version, accepted_at FROM consents');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].policy_version, CURRENT_POLICY_VERSION);
    assert.equal(rows[0].accepted_at, '2026-10-20T18:15:05');

    await assert.rejects(
      () => repo.save({ policyVersion: '', acceptedAt: 'invalid' }),
      InvalidConsent,
    );
  });

  it('[H12-R6] informa si la versión vigente fue aceptada y distingue versiones anteriores de la versión vigente', async () => {
    assert.equal(await repo.hasAcceptedVersion(CURRENT_POLICY_VERSION), false);
    assert.equal(await repo.findByVersion(CURRENT_POLICY_VERSION), null);

    await repo.save(
      new Consent({
        policyVersion: '2025-01',
        acceptedAt: '2025-01-10T10:00:00',
      }),
    );

    assert.equal(await repo.hasAcceptedVersion('2025-01'), true);
    assert.equal(await repo.hasAcceptedVersion(CURRENT_POLICY_VERSION), false);

    await repo.save(
      new Consent({
        policyVersion: CURRENT_POLICY_VERSION,
        acceptedAt: '2026-10-21T09:45:12',
      }),
    );

    assert.equal(await repo.hasAcceptedVersion(CURRENT_POLICY_VERSION), true);
    assert.equal(await repo.hasAcceptedVersion(), true);

    const categories = await db.all('SELECT name, is_predefined FROM categories ORDER BY id');
    assert.equal(categories.length, PREDEFINED_CATEGORIES.length);
  });
});
