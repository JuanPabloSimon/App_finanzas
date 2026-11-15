import { LlmRequestFailed, LlmTimeout } from '../core/errors.js';
import { LlmClient } from './llmClient.js';
import { DEFAULT_LLM_BASE_URL, DEFAULT_LLM_MODEL } from './llmConfig.js';
import { RESPONSE_SCHEMA } from './prompt.js';

export const GENERATION_TEMPERATURE = 0.4;
export const GENERATION_MAX_OUTPUT_TOKENS = 1024;

function isAbort(signal, error) {
  return Boolean(signal?.aborted) || error?.name === 'AbortError';
}

/**
 * Cliente de Google Gemini por REST. Es el único archivo de la app que hace llamadas de red
 * (regla 13). La clave viaja en el encabezado x-goog-api-key y nunca en la URL.
 */
export class HttpLlmClient extends LlmClient {
  constructor({
    apiKey,
    model = DEFAULT_LLM_MODEL,
    baseUrl = DEFAULT_LLM_BASE_URL,
    fetchImpl = (...args) => globalThis.fetch(...args),
  } = {}) {
    super();
    if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      throw new Error('Se requiere una clave de API para el asistente');
    }
    if (typeof fetchImpl !== 'function') {
      throw new Error('Se requiere una función fetch');
    }
    this.apiKey = apiKey.trim();
    this.model = model || DEFAULT_LLM_MODEL;
    this.baseUrl = baseUrl || DEFAULT_LLM_BASE_URL;
    this.fetchImpl = fetchImpl;
  }

  buildUrl() {
    return `${this.baseUrl}/models/${encodeURIComponent(this.model)}:generateContent`;
  }

  buildBody({ systemPrompt, userContent }) {
    return {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userContent }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: GENERATION_TEMPERATURE,
        maxOutputTokens: GENERATION_MAX_OUTPUT_TOKENS,
      },
    };
  }

  async complete({ systemPrompt, userContent, signal } = {}) {
    if (signal?.aborted) {
      throw new LlmTimeout();
    }
    let response;
    try {
      response = await this.fetchImpl(this.buildUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify(this.buildBody({ systemPrompt, userContent })),
        signal,
      });
    } catch (error) {
      if (isAbort(signal, error)) {
        throw new LlmTimeout();
      }
      throw new LlmRequestFailed('No se pudo conectar con el asistente');
    }

    if (!response || !response.ok) {
      throw new LlmRequestFailed(
        `El asistente respondió con un estado HTTP ${response?.status ?? 'desconocido'}`,
      );
    }

    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      if (isAbort(signal, error)) {
        throw new LlmTimeout();
      }
      throw new LlmRequestFailed('El asistente devolvió un cuerpo ilegible');
    }

    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== 'string' || text.trim().length === 0) {
      throw new LlmRequestFailed('El asistente no devolvió texto');
    }
    return text;
  }
}
