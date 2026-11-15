export class LlmClient {
  /**
   * @param {{ systemPrompt: string, userContent: string, signal: AbortSignal }} _request
   * @returns {Promise<string>} texto crudo devuelto por el modelo
   * @throws {import('../core/errors.js').LlmRequestFailed} red, HTTP no 2xx o cuerpo sin texto
   */
  async complete(_request) {
    void _request;
    throw new Error('Not implemented');
  }
}
