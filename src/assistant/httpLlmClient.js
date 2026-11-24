import { LlmRequestFailed, LlmTimeout } from '../core/errors.js';
import { LlmClient } from './llmClient.js';
import { DEFAULT_LLM_BASE_URL, DEFAULT_LLM_MODEL } from './llmConfig.js';

export const GENERATION_TEMPERATURE = 0.4;
export const GENERATION_MAX_OUTPUT_TOKENS = 1024;

export const FALLBACK_GROQ_MODELS = Object.freeze([
  'llama-3.1-8b-instant',
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'meta-llama/llama-4-maverick-17b-128e-instruct',
  'openai/gpt-oss-20b',
  'openai/gpt-oss-120b',
  'llama3-70b-8192',
  'llama3-8b-8192',
  'gemma2-9b-it',
  'qwen/qwen3-32b',
]);

const NON_CHAT_MODEL_PATTERN = /whisper|tts|playai|guard|safeguard|embed|transcribe/i;

function isAbort(signal, error) {
  return Boolean(signal?.aborted) || error?.name === 'AbortError';
}

function cleanModelOutput(text) {
  if (typeof text !== 'string') {
    return '';
  }
  return text.replace(/^[\s\S]*?<\/think>\s*/i, '').trim();
}

/**
 * Cliente de Groq API (OpenAI-compatible Chat Completions) por REST. Es el único archivo de la
 * app que hace llamadas de red (regla 13). La clave viaja en el encabezado Authorization y nunca en la URL.
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
    return `${this.baseUrl}/chat/completions`;
  }

  buildBody({ systemPrompt, userContent, model = this.model, includeResponseFormat = true }) {
    const body = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: GENERATION_TEMPERATURE,
      max_tokens: GENERATION_MAX_OUTPUT_TOKENS,
    };
    if (includeResponseFormat) {
      body.response_format = { type: 'json_object' };
    }
    return body;
  }

  async discoverAvailableModel(excludedModels, signal) {
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal,
      });
      if (!response || !response.ok) {
        return null;
      }
      const payload = await response.json();
      const models = Array.isArray(payload?.data) ? payload.data : [];
      const activeIds = models
        .filter((item) => item && typeof item.id === 'string' && item.active !== false)
        .map((item) => item.id)
        .filter((id) => !excludedModels.has(id) && !NON_CHAT_MODEL_PATTERN.test(id));

      for (const candidate of FALLBACK_GROQ_MODELS) {
        if (activeIds.includes(candidate)) {
          return candidate;
        }
      }
      return activeIds[0] ?? null;
    } catch {
      return null;
    }
  }

  async sendChatRequest({ systemPrompt, userContent, model, includeResponseFormat = true, signal }) {
    return this.fetchImpl(this.buildUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(
        this.buildBody({ systemPrompt, userContent, model, includeResponseFormat }),
      ),
      signal,
    });
  }

  async complete({ systemPrompt, userContent, signal } = {}) {
    if (signal?.aborted) {
      throw new LlmTimeout();
    }
    let response;
    let activeModel = this.model;
    try {
      response = await this.sendChatRequest({
        systemPrompt,
        userContent,
        model: activeModel,
        includeResponseFormat: true,
        signal,
      });

      if (response && (response.status === 404 || response.status === 400)) {
        const triedModels = new Set([activeModel]);
        const discovered = await this.discoverAvailableModel(triedModels, signal);
        const candidates = [
          ...(discovered ? [discovered] : []),
          ...FALLBACK_GROQ_MODELS.filter((m) => !triedModels.has(m)),
        ];
        for (const fallbackModel of candidates.slice(0, 3)) {
          triedModels.add(fallbackModel);
          activeModel = fallbackModel;
          response = await this.sendChatRequest({
            systemPrompt,
            userContent,
            model: activeModel,
            includeResponseFormat: true,
            signal,
          });
          if (response && response.status === 400) {
            response = await this.sendChatRequest({
              systemPrompt,
              userContent,
              model: activeModel,
              includeResponseFormat: false,
              signal,
            });
          }
          if (!response || (response.status !== 404 && response.status !== 400)) {
            if (response && response.ok) {
              this.model = activeModel;
            }
            break;
          }
        }
      }
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

    const rawText = payload?.choices?.[0]?.message?.content;
    const text = cleanModelOutput(rawText);
    if (typeof text !== 'string' || text.length === 0) {
      throw new LlmRequestFailed('El asistente no devolvió texto');
    }
    return text;
  }
}
