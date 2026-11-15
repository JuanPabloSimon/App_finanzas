import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ADVICE_DISCLAIMER,
  parseAdviceResponse,
  validateAdvice,
  textLength,
  allowedAdviceCategories,
} from '../../src/assistant/adviceResponse.js';
import { InvalidLlmResponse } from '../../src/core/errors.js';

const SUMMARY = Object.freeze({
  periodo: '2026-11',
  moneda: 'ARS',
  total_mes: 98000,
  total_mes_anterior: 80000,
  ingreso_mensual: 500000,
  categorias: [
    { nombre: 'Delivery', total: 50000, porcentaje: 51, variacion_pct: 12.5 },
    { nombre: 'Alimentos', total: 48000, porcentaje: 49, variacion_pct: null },
  ],
  recurrencias: [{ categoria: 'Suscripciones', monto_tipico: 6500, veces_en_60_dias: 3 }],
});

function item(overrides = {}) {
  return { titulo: 'Bajá el delivery', detalle: 'Cociná más en casa.', categoria: 'Delivery', ...overrides };
}

function payload(sugerencias) {
  return JSON.stringify({ sugerencias });
}

describe('H10 validación de la respuesta del modelo', () => {
  it('[H10-R12] acepta el JSON envuelto en un único bloque ```json o ``` rodeado de espacios', () => {
    const json = payload([item()]);
    const withLabel = parseAdviceResponse(`  \n\`\`\`json\n${json}\n\`\`\`  \n`, SUMMARY);
    const withoutLabel = parseAdviceResponse(`\`\`\`\n${json}\n\`\`\``, SUMMARY);
    const plain = parseAdviceResponse(json, SUMMARY);
    for (const result of [withLabel, withoutLabel, plain]) {
      assert.equal(result.sugerencias.length, 1);
      assert.equal(result.sugerencias[0].titulo, 'Bajá el delivery');
    }
  });

  it('[H10-R12] rechaza el JSON con texto antes o después del bloque', () => {
    const json = payload([item()]);
    assert.throws(() => parseAdviceResponse(`Acá van:\n\`\`\`json\n${json}\n\`\`\``, SUMMARY), InvalidLlmResponse);
    assert.throws(() => parseAdviceResponse(`\`\`\`json\n${json}\n\`\`\`\nEspero que sirva`, SUMMARY), InvalidLlmResponse);
    assert.throws(() => parseAdviceResponse(`Respuesta: ${json}`, SUMMARY), InvalidLlmResponse);
    assert.throws(
      () => parseAdviceResponse(`\`\`\`json\n${json}\n\`\`\`\n\`\`\`json\n${json}\n\`\`\``, SUMMARY),
      InvalidLlmResponse,
    );
  });

  it('[H10-R13] lanza InvalidLlmResponse si no es un objeto con un arreglo sugerencias', () => {
    for (const raw of ['hola', '[]', 'null', '{"otra":1}', '{"sugerencias":{}}', '', '42', '"texto"']) {
      assert.throws(() => parseAdviceResponse(raw, SUMMARY), InvalidLlmResponse, raw);
    }
    assert.throws(() => parseAdviceResponse(null, SUMMARY), InvalidLlmResponse);
    assert.throws(() => parseAdviceResponse(undefined, SUMMARY), InvalidLlmResponse);
    assert.throws(() => validateAdvice(null, SUMMARY), InvalidLlmResponse);
  });

  it('[H10-R14] exige entre 1 y 3 sugerencias', () => {
    assert.throws(() => parseAdviceResponse(payload([]), SUMMARY), InvalidLlmResponse);
    assert.throws(() => parseAdviceResponse(payload([item(), item(), item(), item()]), SUMMARY), InvalidLlmResponse);
    assert.equal(parseAdviceResponse(payload([item(), item(), item()]), SUMMARY).sugerencias.length, 3);
  });

  it('[H10-R14] mide titulo y detalle en code points después de trim', () => {
    const title60 = `${'a'.repeat(59)}😀`;
    assert.equal(textLength(title60), 60);
    assert.equal(textLength(`  ${title60}  `), 60);
    assert.equal(parseAdviceResponse(payload([item({ titulo: title60 })]), SUMMARY).sugerencias[0].titulo, title60);
    assert.throws(
      () => parseAdviceResponse(payload([item({ titulo: `${'a'.repeat(60)}😀` })]), SUMMARY),
      InvalidLlmResponse,
    );
    assert.equal(parseAdviceResponse(payload([item({ detalle: 'd'.repeat(280) })]), SUMMARY).sugerencias.length, 1);
    assert.throws(() => parseAdviceResponse(payload([item({ detalle: 'd'.repeat(281) })]), SUMMARY), InvalidLlmResponse);
  });

  it('[H10-R14] rechaza campos vacíos, faltantes o de otro tipo', () => {
    const invalidItems = [
      item({ titulo: '' }),
      item({ titulo: '   ' }),
      item({ detalle: '' }),
      item({ categoria: '' }),
      item({ titulo: 12 }),
      item({ detalle: null }),
      item({ categoria: ['Delivery'] }),
      { titulo: 'Sin detalle', categoria: 'Delivery' },
      'texto suelto',
      null,
      [item()],
    ];
    for (const invalid of invalidItems) {
      assert.throws(() => parseAdviceResponse(payload([invalid]), SUMMARY), InvalidLlmResponse);
    }
  });

  it('[H10-R14] categoria debe existir en el resumen o ser «General», sin distinguir mayúsculas ni espacios', () => {
    assert.throws(() => parseAdviceResponse(payload([item({ categoria: 'Inversiones' })]), SUMMARY), InvalidLlmResponse);
    const general = parseAdviceResponse(payload([item({ categoria: 'general' })]), SUMMARY);
    assert.equal(general.sugerencias[0].categoria, 'general');
    const spaced = parseAdviceResponse(payload([item({ categoria: ' delivery ' })]), SUMMARY);
    assert.equal(spaced.sugerencias[0].categoria, 'delivery');
    const recurrence = parseAdviceResponse(payload([item({ categoria: 'SUSCRIPCIONES' })]), SUMMARY);
    assert.equal(recurrence.sugerencias.length, 1);
    assert.deepEqual([...allowedAdviceCategories(SUMMARY)].sort(), ['alimentos', 'delivery', 'general', 'suscripciones']);
  });

  it('[H10-R14] una sugerencia inválida entre dos válidas rechaza la respuesta entera y las claves extra se ignoran', () => {
    assert.throws(
      () => parseAdviceResponse(payload([item(), item({ categoria: 'Otra cosa' }), item()]), SUMMARY),
      InvalidLlmResponse,
    );
    const result = parseAdviceResponse(
      JSON.stringify({ sugerencias: [item({ extra: 'x', titulo: '  Con espacios  ' })], meta: 1 }),
      SUMMARY,
    );
    assert.deepEqual({ ...result.sugerencias[0] }, {
      titulo: 'Con espacios',
      detalle: 'Cociná más en casa.',
      categoria: 'Delivery',
    });
    assert.deepEqual(Object.keys(result), ['sugerencias']);
    assert.equal(Object.isFrozen(result), true);
    assert.equal(Object.isFrozen(result.sugerencias), true);
    assert.equal(Object.isFrozen(result.sugerencias[0]), true);
  });

  it('[H10-R11] ADVICE_DISCLAIMER es el texto literal del contrato', () => {
    assert.equal(
      ADVICE_DISCLAIMER,
      'Estas sugerencias son orientativas y se generan automáticamente a partir de tus datos. No constituyen asesoramiento financiero profesional.',
    );
    const contract = fs.readFileSync(new URL('../../docs/llm_assistant.md', import.meta.url), 'utf8');
    const normalized = contract.replace(/\r?\n>\s*/g, ' ').replace(/\s+/g, ' ');
    assert.equal(normalized.includes(ADVICE_DISCLAIMER), true);
  });

  it('[H10-R34] la validación, la reserva y el servicio no usan fetch, XMLHttpRequest ni axios', () => {
    for (const file of ['adviceResponse.js', 'fallbackAdvisor.js', 'adviceService.js']) {
      const source = fs.readFileSync(new URL(`../../src/assistant/${file}`, import.meta.url), 'utf8');
      for (const forbidden of ['fetch(', 'XMLHttpRequest', 'axios']) {
        assert.equal(source.includes(forbidden), false, `${file} no debe contener ${forbidden}`);
      }
    }
  });
});
