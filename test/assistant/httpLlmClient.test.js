import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HttpLlmClient } from '../../src/assistant/httpLlmClient.js';
import { LlmClient } from '../../src/assistant/llmClient.js';
import {
  readLlmConfig,
  DEFAULT_LLM_MODEL,
  DEFAULT_LLM_BASE_URL,
} from '../../src/assistant/llmConfig.js';
import { SYSTEM_PROMPT, PROMPT_VERSION } from '../../src/assistant/prompt.js';
import { LlmRequestFailed, LlmTimeout } from '../../src/core/errors.js';

const SUMMARY = Object.freeze({
  periodo: '2026-11',
  moneda: 'ARS',
  total_mes: 1500,
  total_mes_anterior: 0,
  ingreso_mensual: null,
  categorias: [{ nombre: 'Delivery', total: 1500, porcentaje: 100, variacion_pct: null }],
  recurrencias: [],
});

function jsonResponse(payload, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    async json() {
      return payload;
    },
  };
}

function createFakeFetch(responder) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return responder(url, init);
  };
  return { calls, fetchImpl };
}

function groqPayload(text) {
  return { choices: [{ message: { content: text } }] };
}

describe('H10 cliente HTTP de Groq', () => {
  it('[H10-R3] envía un único POST con solo el prompt versionado, el resumen y la configuración de generación', async () => {
    const { calls, fetchImpl } = createFakeFetch(() =>
      jsonResponse(groqPayload('{"sugerencias":[]}')),
    );
    const client = new HttpLlmClient({ apiKey: 'test-key', fetchImpl });
    assert.equal(client instanceof LlmClient, true);
    const controller = new AbortController();

    const text = await client.complete({
      systemPrompt: SYSTEM_PROMPT,
      userContent: JSON.stringify(SUMMARY),
      signal: controller.signal,
    });

    assert.equal(text, '{"sugerencias":[]}');
    assert.equal(calls.length, 1);
    const [{ url, init }] = calls;
    assert.equal(
      url,
      'https://api.groq.com/openai/v1/chat/completions',
    );
    assert.equal(url.includes('test-key'), false);
    assert.equal(init.method, 'POST');
    assert.equal(init.signal, controller.signal);
    assert.deepEqual(Object.keys(init).sort(), ['body', 'headers', 'method', 'signal']);
    assert.deepEqual(init.headers, {
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-key',
    });

    const body = JSON.parse(init.body);
    assert.deepEqual(Object.keys(body).sort(), [
      'max_tokens',
      'messages',
      'model',
      'response_format',
      'temperature',
    ]);
    assert.equal(body.model, 'llama-3.3-70b-versatile');
    assert.equal(body.messages.length, 2);
    assert.deepEqual(body.messages[0], { role: 'system', content: SYSTEM_PROMPT });
    assert.deepEqual(body.messages[1], { role: 'user', content: JSON.stringify(SUMMARY) });
    assert.deepEqual(body.response_format, { type: 'json_object' });
    assert.equal(body.temperature, 0.4);
    assert.equal(body.max_tokens, 1024);
    assert.equal(PROMPT_VERSION, 'h10-v1');
  });

  it('[H10-R3] incluye el modelo configurado en el cuerpo y exige una clave', async () => {
    const { calls, fetchImpl } = createFakeFetch(() => jsonResponse(groqPayload('ok')));
    const client = new HttpLlmClient({ apiKey: 'test-key', model: 'llama-3.1-8b-instant', fetchImpl });
    await client.complete({ systemPrompt: 'x', userContent: '{}', signal: new AbortController().signal });
    assert.equal(calls[0].url, `${DEFAULT_LLM_BASE_URL}/chat/completions`);
    assert.equal(JSON.parse(calls[0].init.body).model, 'llama-3.1-8b-instant');
    assert.throws(() => new HttpLlmClient({ apiKey: '', fetchImpl }));
    assert.throws(() => new HttpLlmClient({ apiKey: null, fetchImpl }));
  });

  it('[H10-R3] si el modelo por defecto devuelve 404 consulta /models y reintenta con un modelo activo de la cuenta', async () => {
    const { calls, fetchImpl } = createFakeFetch((url) => {
      if (url.endsWith('/models')) {
        return jsonResponse({
          data: [
            { id: 'whisper-large-v3', active: true },
            { id: 'openai/gpt-oss-20b', active: true },
          ],
        });
      }
      if (calls.filter((c) => c.url.endsWith('/chat/completions')).length === 1) {
        return jsonResponse({ error: { code: 'model_not_found' } }, { ok: false, status: 404 });
      }
      return jsonResponse(groqPayload('<think>razonamiento</think>\n{"sugerencias":[]}'));
    });

    const client = new HttpLlmClient({ apiKey: 'test-key', fetchImpl });
    const text = await client.complete({
      systemPrompt: SYSTEM_PROMPT,
      userContent: JSON.stringify(SUMMARY),
      signal: new AbortController().signal,
    });

    assert.equal(text, '{"sugerencias":[]}');
    assert.equal(client.model, 'openai/gpt-oss-20b');
    assert.equal(calls.length, 3);
    assert.equal(calls[1].url, `${DEFAULT_LLM_BASE_URL}/models`);
    assert.equal(JSON.parse(calls[2].init.body).model, 'openai/gpt-oss-20b');
  });

  it('[H10-R16] un fetch que rechaza, una respuesta 500 o un cuerpo sin choices lanzan LlmRequestFailed', async () => {
    const request = { systemPrompt: SYSTEM_PROMPT, userContent: '{}', signal: new AbortController().signal };

    const network = new HttpLlmClient({
      apiKey: 'test-key',
      fetchImpl: async () => {
        throw new TypeError('Failed to fetch');
      },
    });
    await assert.rejects(() => network.complete(request), LlmRequestFailed);

    const serverError = new HttpLlmClient({
      apiKey: 'test-key',
      fetchImpl: async () => jsonResponse({ error: 'boom' }, { ok: false, status: 500 }),
    });
    await assert.rejects(() => serverError.complete(request), (error) => {
      assert.equal(error instanceof LlmRequestFailed, true);
      assert.match(error.message, /500/);
      assert.equal(error.message.includes('boom'), false);
      return true;
    });

    const noChoices = new HttpLlmClient({
      apiKey: 'test-key',
      fetchImpl: async () => jsonResponse({ id: 'chatcmpl-123' }),
    });
    await assert.rejects(() => noChoices.complete(request), LlmRequestFailed);

    const emptyText = new HttpLlmClient({
      apiKey: 'test-key',
      fetchImpl: async () => jsonResponse(groqPayload('   ')),
    });
    await assert.rejects(() => emptyText.complete(request), LlmRequestFailed);

    const unreadable = new HttpLlmClient({
      apiKey: 'test-key',
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        async json() {
          throw new SyntaxError('Unexpected token');
        },
      }),
    });
    await assert.rejects(() => unreadable.complete(request), LlmRequestFailed);
  });

  it('[H10-R16] un signal abortado se propaga como LlmTimeout', async () => {
    const controller = new AbortController();
    const client = new HttpLlmClient({
      apiKey: 'test-key',
      fetchImpl: (_url, init) =>
        new Promise((_, reject) => {
          init.signal.addEventListener('abort', () => {
            const abortError = new Error('The operation was aborted');
            abortError.name = 'AbortError';
            reject(abortError);
          });
        }),
    });
    const pending = client.complete({ systemPrompt: 'x', userContent: '{}', signal: controller.signal });
    controller.abort();
    await assert.rejects(() => pending, LlmTimeout);

    const alreadyAborted = new AbortController();
    alreadyAborted.abort();
    let fetchCalled = false;
    const lazy = new HttpLlmClient({
      apiKey: 'test-key',
      fetchImpl: async () => {
        fetchCalled = true;
        return jsonResponse(groqPayload('ok'));
      },
    });
    await assert.rejects(
      () => lazy.complete({ systemPrompt: 'x', userContent: '{}', signal: alreadyAborted.signal }),
      LlmTimeout,
    );
    assert.equal(fetchCalled, false);
  });

  it('[H10-R28] readLlmConfig deja apiKey en null sin clave y VITE_LLM_MODEL reemplaza el modelo', () => {
    assert.deepEqual({ ...readLlmConfig({}) }, {
      apiKey: null,
      model: DEFAULT_LLM_MODEL,
      baseUrl: DEFAULT_LLM_BASE_URL,
    });
    assert.equal(readLlmConfig({ VITE_LLM_API_KEY: '  ' }).apiKey, null);
    assert.equal(readLlmConfig(undefined).apiKey, null);
    assert.equal(readLlmConfig(null).apiKey, null);
    assert.equal(readLlmConfig({ VITE_LLM_API_KEY: ' test-key ' }).apiKey, 'test-key');
    assert.equal(readLlmConfig({ VITE_LLM_MODEL: 'llama-3.1-8b-instant' }).model, 'llama-3.1-8b-instant');
    assert.equal(readLlmConfig({ VITE_LLM_MODEL: 'gemini-2.5-flash' }).model, DEFAULT_LLM_MODEL);
    assert.equal(readLlmConfig({ VITE_LLM_MODEL: '   ' }).model, DEFAULT_LLM_MODEL);
    assert.equal(DEFAULT_LLM_MODEL, 'llama-3.3-70b-versatile');
    assert.equal(Object.isFrozen(readLlmConfig({})), true);
  });
});
