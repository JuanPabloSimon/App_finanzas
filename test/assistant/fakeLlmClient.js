import { LlmClient } from '../../src/assistant/llmClient.js';
import { LlmRequestFailed, LlmTimeout } from '../../src/core/errors.js';

/**
 * Cliente falso del modelo de lenguaje para las pruebas (regla 21: sin red).
 * Registra cada invocación en `calls` y permite un `onCall` para inspeccionar el estado
 * en el momento exacto de la invocación.
 */
export class FakeLlmClient extends LlmClient {
  constructor(behavior, { onCall = null } = {}) {
    super();
    this.behavior = behavior;
    this.onCall = onCall;
    this.calls = [];
  }

  static succeeding(text, options) {
    return new FakeLlmClient(async () => text, options);
  }

  static malformed(text = 'no es json', options) {
    return new FakeLlmClient(async () => text, options);
  }

  static failing(error = new LlmRequestFailed(), options) {
    return new FakeLlmClient(async () => {
      throw error;
    }, options);
  }

  static hanging(options) {
    return new FakeLlmClient(
      ({ signal }) =>
        new Promise((_, reject) => {
          if (signal) {
            signal.addEventListener('abort', () => reject(new LlmTimeout()), { once: true });
          }
        }),
      options,
    );
  }

  async complete(request) {
    this.calls.push(request);
    if (typeof this.onCall === 'function') {
      await this.onCall(request);
    }
    return this.behavior(request);
  }
}
