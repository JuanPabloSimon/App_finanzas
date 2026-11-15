import { extractYearMonth, formatIsoDate, formatIsoDateTime } from '../core/dates.js';
import { InvalidLlmResponse, LlmTimeout } from '../core/errors.js';
import { AdviceRequest, MONTHLY_MODEL_REQUEST_LIMIT } from '../domain/models/adviceRequest.js';
import { parseAdviceResponse } from './adviceResponse.js';
import { buildFallbackAdvice } from './fallbackAdvisor.js';
import { SYSTEM_PROMPT } from './prompt.js';

export const ADVICE_TIMEOUT_MS = 10000;

export const ADVICE_REASONS = Object.freeze({
  MODEL_OK: 'model_ok',
  TIMEOUT: 'timeout',
  INVALID_RESPONSE: 'invalid_response',
  REQUEST_FAILED: 'request_failed',
  LIMIT_REACHED: 'limit_reached',
  NO_API_KEY: 'no_api_key',
  NO_CONSENT: 'no_consent',
  NO_DATA: 'no_data',
  STORAGE_ERROR: 'storage_error',
});

const TIMEOUT_SIGNAL = Symbol('advice-timeout');

function hasNoData(summary) {
  return (
    (summary?.categorias ?? []).length === 0 && (summary?.recurrencias ?? []).length === 0
  );
}

/**
 * Orquesta una solicitud de recomendaciones: consentimiento, clave, datos, cupo mensual,
 * registro previo, timeout con AbortController, validación y respuesta de reserva.
 * No hace llamadas de red por sí mismo: delega en el LlmClient inyectado.
 */
export class AdviceService {
  constructor({
    llmClient = null,
    adviceRequestRepository,
    isConsentAccepted = () => false,
    today = () => formatIsoDate(new Date()),
    now = () => new Date(),
    timeoutMs = ADVICE_TIMEOUT_MS,
    setTimer = (fn, ms) => setTimeout(fn, ms),
    clearTimer = (id) => clearTimeout(id),
    monthlyLimit = MONTHLY_MODEL_REQUEST_LIMIT,
  } = {}) {
    if (!adviceRequestRepository) {
      throw new Error('Se requiere adviceRequestRepository');
    }
    this.llmClient = llmClient;
    this.adviceRequestRepository = adviceRequestRepository;
    this.isConsentAccepted = isConsentAccepted;
    this.today = today;
    this.now = now;
    this.timeoutMs = timeoutMs;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.monthlyLimit = monthlyLimit;
    this.inFlight = null;
  }

  currentYearMonth() {
    return extractYearMonth(formatIsoDate(this.today()));
  }

  /** @returns {Promise<number>} max(0, límite − consultas al modelo del mes local) */
  async getRemainingModelRequests() {
    const used = await this.adviceRequestRepository.countByYearMonth(
      this.currentYearMonth(),
      'model',
    );
    return Math.max(0, this.monthlyLimit - used);
  }

  /**
   * @returns {Promise<Readonly<{ suggestions, source: 'model'|'fallback', reason, remainingModelRequests }>>}
   */
  requestAdvice(summary) {
    if (this.inFlight) {
      return this.inFlight;
    }
    const pending = this.runRequest(summary).finally(() => {
      if (this.inFlight === pending) {
        this.inFlight = null;
      }
    });
    this.inFlight = pending;
    return pending;
  }

  async runRequest(summary) {
    const yearMonth = this.currentYearMonth();

    if (!(await this.isConsentAccepted())) {
      return this.fallbackResult(summary, ADVICE_REASONS.NO_CONSENT);
    }
    if (this.llmClient === null || this.llmClient === undefined) {
      await this.recordFallback(yearMonth);
      return this.fallbackResult(summary, ADVICE_REASONS.NO_API_KEY);
    }
    if (hasNoData(summary)) {
      await this.recordFallback(yearMonth);
      return this.fallbackResult(summary, ADVICE_REASONS.NO_DATA);
    }

    let used;
    try {
      used = await this.adviceRequestRepository.countByYearMonth(yearMonth, 'model');
    } catch {
      return this.fallbackResult(summary, ADVICE_REASONS.STORAGE_ERROR);
    }
    if (used >= this.monthlyLimit) {
      await this.recordFallback(yearMonth);
      return this.fallbackResult(summary, ADVICE_REASONS.LIMIT_REACHED);
    }

    try {
      await this.adviceRequestRepository.save(
        new AdviceRequest({
          yearMonth,
          source: 'model',
          createdAt: formatIsoDateTime(this.now()),
        }),
      );
    } catch {
      await this.recordFallback(yearMonth);
      return this.fallbackResult(summary, ADVICE_REASONS.STORAGE_ERROR);
    }

    let rawText;
    try {
      rawText = await this.invokeWithTimeout(summary);
    } catch (error) {
      const reason =
        error === TIMEOUT_SIGNAL || error instanceof LlmTimeout
          ? ADVICE_REASONS.TIMEOUT
          : ADVICE_REASONS.REQUEST_FAILED;
      return this.fallbackResult(summary, reason);
    }

    try {
      const advice = parseAdviceResponse(rawText, summary);
      return this.buildResult(advice, 'model', ADVICE_REASONS.MODEL_OK);
    } catch (error) {
      if (error instanceof InvalidLlmResponse) {
        return this.fallbackResult(summary, ADVICE_REASONS.INVALID_RESPONSE);
      }
      throw error;
    }
  }

  invokeWithTimeout(summary) {
    const controller = new AbortController();
    let timerId = null;
    const timeout = new Promise((_, reject) => {
      timerId = this.setTimer(() => {
        controller.abort();
        reject(TIMEOUT_SIGNAL);
      }, this.timeoutMs);
    });
    const completion = Promise.resolve().then(() =>
      this.llmClient.complete({
        systemPrompt: SYSTEM_PROMPT,
        userContent: JSON.stringify(summary),
        signal: controller.signal,
      }),
    );
    // La rama perdedora de la carrera puede rechazar después: se marca como manejada.
    completion.catch(() => {});
    timeout.catch(() => {});
    return Promise.race([completion, timeout]).finally(() => {
      this.clearTimer(timerId);
    });
  }

  async recordFallback(yearMonth) {
    try {
      await this.adviceRequestRepository.save(
        new AdviceRequest({
          yearMonth,
          source: 'fallback',
          createdAt: formatIsoDateTime(this.now()),
        }),
      );
    } catch {
      // Un registro de reserva que no se guarda no cambia el cupo; la reserva se muestra igual.
    }
  }

  async fallbackResult(summary, reason) {
    return this.buildResult(buildFallbackAdvice(summary), 'fallback', reason);
  }

  async buildResult(advice, source, reason) {
    let remainingModelRequests;
    try {
      remainingModelRequests = await this.getRemainingModelRequests();
    } catch {
      remainingModelRequests = 0;
    }
    return Object.freeze({
      suggestions: advice.sugerencias,
      source,
      reason,
      remainingModelRequests,
    });
  }
}
