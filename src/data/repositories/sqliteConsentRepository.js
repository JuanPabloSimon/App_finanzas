import { Consent, CURRENT_POLICY_VERSION } from '../../domain/models/consent.js';
import { ConsentRepository } from '../../domain/repositories/consentRepository.js';

export class SqliteConsentRepository extends ConsentRepository {
  constructor(db) {
    super();
    if (!db) {
      throw new Error('Se requiere una instancia de AppDatabase');
    }
    this.db = db;
  }

  async findByVersion(policyVersion) {
    if (typeof policyVersion !== 'string' || policyVersion.trim().length === 0) {
      return null;
    }
    const row = await this.db.get(
      'SELECT policy_version, accepted_at FROM consents WHERE policy_version = ?',
      [policyVersion.trim()],
    );
    if (!row) {
      return null;
    }
    return new Consent({
      policyVersion: row.policy_version,
      acceptedAt: row.accepted_at,
    });
  }

  async hasAcceptedVersion(policyVersion = CURRENT_POLICY_VERSION) {
    const consent = await this.findByVersion(policyVersion);
    return consent !== null;
  }

  async save(consent) {
    const record = consent instanceof Consent ? consent : new Consent(consent);
    await this.db.run(
      'INSERT OR REPLACE INTO consents (policy_version, accepted_at) VALUES (?, ?)',
      [record.policyVersion, record.acceptedAt],
    );
    return record;
  }
}
