import { CURRENT_POLICY_VERSION } from '../models/consent.js';

export class ConsentRepository {
  async findByVersion(_policyVersion) {
    void _policyVersion;
    throw new Error('Not implemented');
  }

  async hasAcceptedVersion(_policyVersion = CURRENT_POLICY_VERSION) {
    void _policyVersion;
    throw new Error('Not implemented');
  }

  async save(_consent) {
    void _consent;
    throw new Error('Not implemented');
  }
}
