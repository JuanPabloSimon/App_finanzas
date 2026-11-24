import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { AdviceService, ADVICE_TIMEOUT_MS, ADVICE_REASONS } from '../../src/assistant/adviceService.js';
import { SYSTEM_PROMPT } from '../../src/assistant/prompt.js';
import { buildFallbackAdvice } from '../../src/assistant/fallbackAdvisor.js';
import { AppDatabase } from '../../src/data/db/appDatabase.js';
import { SqliteAdviceRequestRepository } from '../../src/data/repositories/sqliteAdviceRequestRepository.js';
import { AdviceRequest } from '../../src/domain/models/adviceRequest.js';
import { LlmRequestFailed } from '../../src/core/errors.js';
import { FakeLlmClient } from './fakeLlmClient.js';

const CONTRACT_KEYS = [
  'categorias',
  'ingreso_mensual',
  'moneda',
  'periodo',
  'recurrencias',
  'total_mes',
  'total_mes_anterior',
];

const SUMMARY = Object.freeze({
  periodo: '2026-11',
  moneda: 'ARS',
  total_mes: 148000,
  total_mes_anterior: 120000,
  ingreso_mensual: 500000,
  categorias: Object.freeze([
    Object.freeze({ nombre: 'Alimentos', total: 98000, porcentaje: 66.2, variacion_pct: 5 }),
    Object.freeze({ nombre: 'Delivery', total: 50000, porcentaje: 33.8, variacion_pct: 12.5 }),
  ]),
  recurrencias: Object.freeze([
    Object.freeze({ categoria: 'Suscripciones', monto_tipico: 6500, veces_en_60_dias: 3 }),
  ]),
});

const EMPTY_SUMMARY = Object.freeze({
  ...SUMMARY,
  total_mes: 0,
  categorias: Object.freeze([]),
  recurrencias: Object.freeze([]),
});

const VALID_RESPONSE = JSON.stringify({
  sugerencias: [
    { titulo: 'Bajá el delivery', detalle: 'Probá cocinar dos veces por semana.', categoria: 'Delivery' },
    { titulo: 'Revisá suscripciones', detalle: 'Cancelá las que no uses.', categoria: 'Suscripciones' },
  ],
});

function createTimer() {
  const timer = { scheduled: [], cleared: [] };
  timer.setTimer = (fn, ms) => {
    timer.scheduled.push({ fn, ms });
    return timer.scheduled.length;
  };
  timer.clearTimer = (id) => {
    timer.cleared.push(id);
  };
  return timer;
}

async function waitFor(condition, attempts = 100) {
  for (let i = 0; i < attempts; i += 1) {
    if (condition()) {
      return;
    }
    await new Promise((resolve) => setImmediate(resolve));
  }
  throw new Error('La condición no se cumplió a tiempo');
}

describe('H10 orquestación de recomendaciones (AdviceService)', () => {
  let db;
  let repo;
  let timer;

  function createService(overrides = {}) {
    return new AdviceService({
      adviceRequestRepository: repo,
      isConsentAccepted: () => true,
      today: () => '2026-11-15',
      now: () => new Date(2026, 10, 15, 10, 0, 0),
      setTimer: timer.setTimer,
      clearTimer: timer.clearTimer,
      ...overrides,
    });
  }

  async function seed(date, source, count) {
    const yearMonth = date.slice(0, 7);
    const fullDate = date.length === 10 ? date : `${yearMonth}-15`;
    for (let i = 0; i < count; i += 1) {
      await repo.save(new AdviceRequest({ yearMonth, source, createdAt: `${fullDate}T09:00:00` }));
    }
  }

  beforeEach(async () => {
    db = await AppDatabase.openInMemory();
    repo = new SqliteAdviceRequestRepository(db);
    timer = createTimer();
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  it('[H10-R1] entrega al LlmClient el resumen con exactamente las claves del contrato y el prompt versionado', async () => {
    const fake = FakeLlmClient.succeeding(VALID_RESPONSE);
    const service = createService({ llmClient: fake });
    await service.requestAdvice(SUMMARY);

    assert.equal(fake.calls.length, 1);
    const sent = JSON.parse(fake.calls[0].userContent);
    assert.deepEqual(Object.keys(sent).sort(), CONTRACT_KEYS);
    assert.deepEqual(sent, JSON.parse(JSON.stringify(SUMMARY)));
    assert.equal(fake.calls[0].systemPrompt, SYSTEM_PROMPT);
    assert.deepEqual(Object.keys(fake.calls[0]).sort(), ['signal', 'systemPrompt', 'userContent']);
  });

  it('[H10-R9] construir el servicio y consultar el cupo no invoca al cliente', async () => {
    const fake = FakeLlmClient.succeeding(VALID_RESPONSE);
    const service = createService({ llmClient: fake });
    assert.equal(await service.getRemainingModelRequests(), 10);
    assert.equal(fake.calls.length, 0);
  });

  it('[H10-R10] una respuesta válida devuelve las sugerencias del modelo y descuenta un intento diario', async () => {
    const service = createService({ llmClient: FakeLlmClient.succeeding(VALID_RESPONSE) });
    const result = await service.requestAdvice(SUMMARY);
    assert.equal(result.source, 'model');
    assert.equal(result.reason, ADVICE_REASONS.MODEL_OK);
    assert.equal(result.suggestions.length, 2);
    assert.equal(result.suggestions[0].titulo, 'Bajá el delivery');
    assert.equal(result.remainingModelRequests, 9);
    assert.equal(timer.cleared.length, 1);
  });

  it('[H10-R13] una respuesta mal formada devuelve la reserva con invalid_response sin descontar intentos', async () => {
    const service = createService({ llmClient: FakeLlmClient.malformed() });
    const result = await service.requestAdvice(SUMMARY);
    assert.equal(result.source, 'fallback');
    assert.equal(result.reason, ADVICE_REASONS.INVALID_RESPONSE);
    assert.deepEqual(result.suggestions, buildFallbackAdvice(SUMMARY).sugerencias);
    assert.equal(result.remainingModelRequests, 10);
  });

  it('[H10-R14] una respuesta con una categoría fuera del resumen devuelve la reserva completa sin descontar cupo', async () => {
    const invalid = JSON.stringify({
      sugerencias: [
        { titulo: 'Ok', detalle: 'Ok', categoria: 'Delivery' },
        { titulo: 'Mal', detalle: 'Categoría inventada', categoria: 'Criptomonedas' },
      ],
    });
    const service = createService({ llmClient: FakeLlmClient.succeeding(invalid) });
    const result = await service.requestAdvice(SUMMARY);
    assert.equal(result.source, 'fallback');
    assert.equal(result.reason, ADVICE_REASONS.INVALID_RESPONSE);
    assert.equal(result.suggestions.length, 3);
    assert.equal(result.remainingModelRequests, 10);
  });

  it('[H10-R15][H10-R17] a los 10.000 ms aborta la señal y devuelve la reserva con timeout sin descontar cupo', async () => {
    const fake = FakeLlmClient.hanging();
    const service = createService({ llmClient: fake });
    assert.equal(ADVICE_TIMEOUT_MS, 10000);

    const pending = service.requestAdvice(SUMMARY);
    await waitFor(() => timer.scheduled.length === 1 && fake.calls.length === 1);
    assert.equal(timer.scheduled[0].ms, 10000);
    assert.equal(fake.calls[0].signal.aborted, false);

    timer.scheduled[0].fn();
    const result = await pending;
    assert.equal(result.source, 'fallback');
    assert.equal(result.reason, ADVICE_REASONS.TIMEOUT);
    assert.equal(result.remainingModelRequests, 10);
    assert.equal(fake.calls[0].signal.aborted, true);
    assert.equal(timer.cleared.length, 1);
  });

  it('[H10-R15] devuelve la reserva aunque el cliente ignore la señal de aborto', async () => {
    const ignoring = new FakeLlmClient(() => new Promise(() => {}));
    const service = createService({ llmClient: ignoring });
    const pending = service.requestAdvice(SUMMARY);
    await waitFor(() => timer.scheduled.length === 1);
    timer.scheduled[0].fn();
    const result = await pending;
    assert.equal(result.reason, ADVICE_REASONS.TIMEOUT);
  });

  it('[H10-R16] si el cliente rechaza devuelve la reserva con request_failed sin descontar cupo', async () => {
    const service = createService({ llmClient: FakeLlmClient.failing(new LlmRequestFailed('HTTP 503')) });
    const result = await service.requestAdvice(SUMMARY);
    assert.equal(result.source, 'fallback');
    assert.equal(result.reason, ADVICE_REASONS.REQUEST_FAILED);
    assert.equal(result.suggestions.length >= 1, true);
    assert.equal(result.remainingModelRequests, 10);
  });

  it('[H10-R20][H10-R21] con 10 consultas model exitosas en el día no invoca y devuelve limit_reached', async () => {
    await seed('2026-11-15', 'model', 10);
    const fake = FakeLlmClient.succeeding(VALID_RESPONSE);
    const service = createService({ llmClient: fake });
    const result = await service.requestAdvice(SUMMARY);
    assert.equal(fake.calls.length, 0);
    assert.equal(result.source, 'fallback');
    assert.equal(result.reason, ADVICE_REASONS.LIMIT_REACHED);
    assert.equal(result.remainingModelRequests, 0);
  });

  it('[H10-R22] las invocaciones que fallan no descuentan intentos y solo la exitosa descuenta 1 de las 10', async () => {
    const hanging = FakeLlmClient.hanging();
    const timeoutService = createService({ llmClient: hanging });
    const timersBefore = timer.scheduled.length;
    const pending = timeoutService.requestAdvice(SUMMARY);
    await waitFor(() => timer.scheduled.length === timersBefore + 1 && hanging.calls.length === 1);
    timer.scheduled[timersBefore].fn();
    assert.equal((await pending).remainingModelRequests, 10);

    const failed = await createService({ llmClient: FakeLlmClient.failing() }).requestAdvice(SUMMARY);
    assert.equal(failed.remainingModelRequests, 10);

    const malformed = await createService({ llmClient: FakeLlmClient.malformed() }).requestAdvice(SUMMARY);
    assert.equal(malformed.remainingModelRequests, 10);
    assert.equal(await repo.countByDate('2026-11-15', 'model'), 0);

    const success = FakeLlmClient.succeeding(VALID_RESPONSE);
    const okResult = await createService({ llmClient: success }).requestAdvice(SUMMARY);
    assert.equal(okResult.source, 'model');
    assert.equal(okResult.remainingModelRequests, 9);
    assert.equal(await repo.countByDate('2026-11-15', 'model'), 1);
  });

  it('[H10-R22] si no se puede guardar la consulta exitosa devuelve storage_error', async () => {
    const fake = FakeLlmClient.succeeding(VALID_RESPONSE);
    const failingRepo = {
      countByDate: async () => 0,
      countByYearMonth: async () => 0,
      save: async () => {
        throw new Error('QuotaExceededError');
      },
    };
    const service = createService({ llmClient: fake, adviceRequestRepository: failingRepo });
    const result = await service.requestAdvice(SUMMARY);
    assert.equal(fake.calls.length, 1);
    assert.equal(result.source, 'fallback');
    assert.equal(result.reason, ADVICE_REASONS.STORAGE_ERROR);
  });

  it('[H10-R23] sin cliente, con el límite alcanzado o ante fallo del modelo registra una fila fallback que no cambia el cupo', async () => {
    const noClient = await createService({ llmClient: null }).requestAdvice(SUMMARY);
    assert.equal(noClient.remainingModelRequests, 10);
    assert.equal(await repo.countByDate('2026-11-15', 'fallback'), 1);

    const failed = await createService({ llmClient: FakeLlmClient.failing() }).requestAdvice(SUMMARY);
    assert.equal(failed.remainingModelRequests, 10);
    assert.equal(await repo.countByDate('2026-11-15', 'fallback'), 2);

    await seed('2026-11-15', 'model', 10);
    const limited = await createService({ llmClient: FakeLlmClient.succeeding(VALID_RESPONSE) }).requestAdvice(SUMMARY);
    assert.equal(limited.remainingModelRequests, 0);
    assert.equal(await repo.countByDate('2026-11-15', 'fallback'), 3);
    assert.equal(await repo.countByDate('2026-11-15', 'model'), 10);
  });

  it('[H10-R24] el cupo cuenta solo las filas model del día local de la consulta', async () => {
    await seed('2026-11-14', 'model', 10);
    await seed('2026-11-15', 'fallback', 4);

    const day15 = FakeLlmClient.succeeding(VALID_RESPONSE);
    const result15 = await createService({ llmClient: day15, today: () => '2026-11-15' }).requestAdvice(SUMMARY);
    assert.equal(day15.calls.length, 1);
    assert.equal(result15.source, 'model');

    const day14 = FakeLlmClient.succeeding(VALID_RESPONSE);
    const result14 = await createService({ llmClient: day14, today: () => '2026-11-14' }).requestAdvice(SUMMARY);
    assert.equal(day14.calls.length, 0);
    assert.equal(result14.reason, ADVICE_REASONS.LIMIT_REACHED);
  });

  it('[H10-R27] dos solicitudes seguidas comparten la misma promesa y una sola invocación', async () => {
    const fake = FakeLlmClient.succeeding(VALID_RESPONSE);
    const service = createService({ llmClient: fake });
    const first = service.requestAdvice(SUMMARY);
    const second = service.requestAdvice(SUMMARY);
    assert.equal(first, second);
    await first;
    assert.equal(fake.calls.length, 1);
    assert.equal(await repo.countByDate('2026-11-15', 'model'), 1);

    await service.requestAdvice(SUMMARY);
    assert.equal(fake.calls.length, 2);
  });

  it('[H10-R28] sin clave (llmClient null) devuelve la reserva con no_api_key sin consumir cupo', async () => {
    const service = createService({ llmClient: null });
    const result = await service.requestAdvice(SUMMARY);
    assert.equal(result.source, 'fallback');
    assert.equal(result.reason, ADVICE_REASONS.NO_API_KEY);
    assert.equal(result.remainingModelRequests, 10);
    assert.equal(await repo.countByDate('2026-11-15', 'model'), 0);
  });

  it('[H10-R29] sin consentimiento no invoca al cliente ni registra filas', async () => {
    const fake = FakeLlmClient.succeeding(VALID_RESPONSE);
    const service = createService({ llmClient: fake, isConsentAccepted: () => false });
    const result = await service.requestAdvice(SUMMARY);
    assert.equal(fake.calls.length, 0);
    assert.equal(result.reason, ADVICE_REASONS.NO_CONSENT);
    assert.equal(result.source, 'fallback');
    const rows = await db.get('SELECT COUNT(*) AS total FROM advice_requests');
    assert.equal(Number(rows.total), 0);

    const asyncDenied = createService({ llmClient: fake, isConsentAccepted: async () => false });
    assert.equal((await asyncDenied.requestAdvice(SUMMARY)).reason, ADVICE_REASONS.NO_CONSENT);
    assert.equal(fake.calls.length, 0);
  });

  it('[H10-R32] sin categorías ni recurrencias no invoca y devuelve no_data', async () => {
    const fake = FakeLlmClient.succeeding(VALID_RESPONSE);
    const service = createService({ llmClient: fake });
    const result = await service.requestAdvice(EMPTY_SUMMARY);
    assert.equal(fake.calls.length, 0);
    assert.equal(result.reason, ADVICE_REASONS.NO_DATA);
    assert.equal(result.suggestions.length, 1);
    assert.equal(result.suggestions[0].categoria, 'General');
    assert.equal(result.remainingModelRequests, 10);
  });

  it('[H10-R34] un flujo completo con FakeLlmClient no usa fetch', async () => {
    const originalFetch = globalThis.fetch;
    let fetchUsed = false;
    globalThis.fetch = () => {
      fetchUsed = true;
      throw new Error('No se permite red en las pruebas');
    };
    try {
      const service = createService({ llmClient: FakeLlmClient.succeeding(VALID_RESPONSE) });
      const result = await service.requestAdvice(SUMMARY);
      assert.equal(result.source, 'model');
      assert.equal(fetchUsed, false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
