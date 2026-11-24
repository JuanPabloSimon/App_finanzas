export class AdviceRequestRepository {
  /** @returns {Promise<number>} filas con esa fecha local YYYY-MM-DD y ese source */
  async countByDate(_date, _source = 'model') {
    void _date;
    void _source;
    throw new Error('Not implemented');
  }

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

  /** @returns {Promise<object|null>} guarda el último resultado de consejos solicitado en el día */
  async saveDailyAdviceSnapshot(_snapshot) {
    void _snapshot;
    return null;
  }

  /** @returns {Promise<object|null>} recupera el último consejo solicitado en la fecha local */
  async findDailyAdviceSnapshot(_date, _yearMonth = undefined) {
    void _date;
    void _yearMonth;
    return null;
  }
}
