export class AdviceRequestRepository {
  /** @returns {Promise<number>} filas con ese year_month y ese source */
  async countByYearMonth(_yearMonth, _source = 'model') {
    void _yearMonth;
    void _source;
    throw new Error('Not implemented');
  }

  /** @returns {Promise<import('../models/adviceRequest.js').AdviceRequest>} con id asignado */
  async save(_adviceRequest) {
    void _adviceRequest;
    throw new Error('Not implemented');
  }
}
