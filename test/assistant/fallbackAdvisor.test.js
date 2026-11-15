import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildFallbackAdvice } from '../../src/assistant/fallbackAdvisor.js';
import { validateAdvice, textLength, ADVICE_DETAIL_MAX } from '../../src/assistant/adviceResponse.js';

function summary(overrides = {}) {
  return {
    periodo: '2026-11',
    moneda: 'ARS',
    total_mes: 148000,
    total_mes_anterior: 120000,
    ingreso_mensual: 500000,
    categorias: [
      { nombre: 'Alimentos', total: 98000, porcentaje: 66.2, variacion_pct: 5 },
      { nombre: 'Delivery', total: 50000, porcentaje: 33.8, variacion_pct: 12.5 },
    ],
    recurrencias: [{ categoria: 'Suscripciones', monto_tipico: 6500, veces_en_60_dias: 3 }],
    ...overrides,
  };
}

function assertValid(result, input) {
  const validated = validateAdvice(result, input);
  assert.equal(validated.sugerencias.length, result.sugerencias.length);
  for (const item of result.sugerencias) {
    assert.ok(textLength(item.detalle) <= ADVICE_DETAIL_MAX);
  }
}

describe('H10 respuesta de reserva basada en reglas', () => {
  it('[H10-R18] con variación positiva, recurrencia e ingreso produce 3 sugerencias en el orden de las reglas', () => {
    const input = summary();
    const result = buildFallbackAdvice(input);
    assert.equal(result.sugerencias.length, 3);
    assert.deepEqual({ ...result.sugerencias[0] }, {
      titulo: 'Subió el gasto en una categoría',
      detalle:
        'Delivery aumentó 12,5 % respecto del mes anterior ($ 50.000 este mes). Revisá si ese aumento fue planificado.',
      categoria: 'Delivery',
    });
    assert.deepEqual({ ...result.sugerencias[1] }, {
      titulo: 'Revisá tus gastos repetidos',
      detalle:
        'Detectamos 3 gastos de alrededor de $ 6.500 en Suscripciones en los últimos 60 días. Evaluá si todos siguen siendo necesarios.',
      categoria: 'Suscripciones',
    });
    assert.deepEqual({ ...result.sugerencias[2] }, {
      titulo: 'Peso de tu categoría principal',
      detalle:
        'Alimentos representa el 19,6 % de tu ingreso mensual registrado. Definí un tope para esa categoría el mes que viene.',
      categoria: 'Alimentos',
    });
    assert.equal(Object.isFrozen(result), true);
    assertValid(result, input);
  });

  it('[H10-R18] sin variacion_pct positiva empieza por la recurrencia', () => {
    const input = summary({
      categorias: [
        { nombre: 'Alimentos', total: 98000, porcentaje: 66.2, variacion_pct: null },
        { nombre: 'Delivery', total: 50000, porcentaje: 33.8, variacion_pct: -10 },
      ],
    });
    const result = buildFallbackAdvice(input);
    assert.equal(result.sugerencias.length, 2);
    assert.equal(result.sugerencias[0].titulo, 'Revisá tus gastos repetidos');
    assert.equal(result.sugerencias[1].titulo, 'Peso de tu categoría principal');
    assertValid(result, input);
  });

  it('[H10-R18] con ingreso_mensual null no aplica la regla 3', () => {
    const input = summary({ ingreso_mensual: null });
    const result = buildFallbackAdvice(input);
    assert.deepEqual(
      result.sugerencias.map((item) => item.titulo),
      ['Subió el gasto en una categoría', 'Revisá tus gastos repetidos'],
    );
    assertValid(result, input);
  });

  it('[H10-R18] con un resumen vacío produce una sola sugerencia «General»', () => {
    const input = summary({
      total_mes: 0,
      total_mes_anterior: 0,
      ingreso_mensual: null,
      categorias: [],
      recurrencias: [],
    });
    const result = buildFallbackAdvice(input);
    assert.equal(result.sugerencias.length, 1);
    assert.equal(result.sugerencias[0].categoria, 'General');
    assert.equal(result.sugerencias[0].titulo, 'Registrá tus movimientos del mes');
    assertValid(result, input);
  });

  it('[H10-R18] un nombre de 80 caracteres se corta en el detalle y respeta los 280', () => {
    const longName = 'N'.repeat(80);
    const input = summary({
      categorias: [{ nombre: longName, total: 999999999, porcentaje: 100, variacion_pct: 999.9 }],
      recurrencias: [{ categoria: longName, monto_tipico: 999999900, veces_en_60_dias: 12 }],
      ingreso_mensual: 1,
    });
    const result = buildFallbackAdvice(input);
    assert.equal(result.sugerencias.length, 3);
    for (const item of result.sugerencias) {
      assert.equal(item.categoria, longName);
      assert.equal(item.detalle.includes(`${'N'.repeat(39)}…`), true);
      assert.equal(item.detalle.includes('N'.repeat(40)), false);
    }
    assertValid(result, input);
  });
});
