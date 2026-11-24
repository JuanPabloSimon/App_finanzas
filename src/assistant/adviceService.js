import { extractYearMonth, formatIsoDate, formatIsoDateTime } from '../core/dates.js';
import { InvalidLlmResponse, LlmTimeout } from '../core/errors.js';
import { AdviceRequest, DAILY_MODEL_REQUEST_LIMIT } from '../domain/models/adviceRequest.js';
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
 * Orquesta una solicitud de recomendaciones: consentimiento, clave, datos, cupo diario (10/día),
 * timeout con AbortController, validación, registro solo ante respuesta exitosa y respuesta de reserva.
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
    dailyLimit = DAILY_MODEL_REQUEST_LIMIT,
    monthlyLimit,
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
    this.dailyLimit = monthlyLimit !== undefined ? monthlyLimit : dailyLimit;
    this.monthlyLimit = this.dailyLimit;
    this.inFlight = null;
  }

  currentDate() {
    return formatIsoDate(this.today());
  }

  currentYearMonth() {
    return extractYearMonth(this.currentDate());
  }

  async countUsedModelRequests() {
    if (typeof this.adviceRequestRepository.countByDate === 'function') {
      return this.adviceRequestRepository.countByDate(this.currentDate(), 'model');
    }
    return this.adviceRequestRepository.countByYearMonth(this.currentYearMonth(), 'model');
  }

  /** @returns {Promise<number>} max(0, límite − consultas exitosas al modelo del día local) */
  async getRemainingModelRequests() {
    const used = await this.countUsedModelRequests();
    return Math.max(0, this.dailyLimit - used);
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
      used = await this.countUsedModelRequests();
    } catch {
      return this.fallbackResult(summary, ADVICE_REASONS.STORAGE_ERROR);
    }
    if (used >= this.dailyLimit) {
      await this.recordFallback(yearMonth);
      return this.fallbackResult(summary, ADVICE_REASONS.LIMIT_REACHED);
    }

    let rawText;
    try {
      rawText = await this.invokeWithTimeout(summary);
    } catch (error) {
      const reason =
        error === TIMEOUT_SIGNAL || error instanceof LlmTimeout
          ? ADVICE_REASONS.TIMEOUT
          : ADVICE_REASONS.REQUEST_FAILED;
      await this.recordFallback(yearMonth);
      return this.fallbackResult(summary, reason);
    }

    let advice;
    try {
      advice = parseAdviceResponse(rawText, summary);
    } catch (error) {
      if (error instanceof InvalidLlmResponse) {
        await this.recordFallback(yearMonth);
        return this.fallbackResult(summary, ADVICE_REASONS.INVALID_RESPONSE);
      }
      throw error;
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

    return this.buildResult(advice, 'model', ADVICE_REASONS.MODEL_OK);
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
