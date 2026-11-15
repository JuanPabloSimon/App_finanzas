import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatVariationTenths } from '../../src/core/formatters.js';
import { InvalidAmount } from '../../src/core/errors.js';

describe('H7 formato de la variación mensual', () => {
  it('[H7-R9] formatea la variación con signo explícito, un decimal con coma y el símbolo %', () => {
    assert.equal(formatVariationTenths(125), '+12,5 %');
    assert.equal(formatVariationTenths(-60), '-6,0 %');
    assert.equal(formatVariationTenths(0), '0,0 %');
    assert.equal(formatVariationTenths(5), '+0,5 %');
    assert.equal(formatVariationTenths(-5), '-0,5 %');
    assert.equal(formatVariationTenths(-1000), '-100,0 %');
    assert.equal(formatVariationTenths(99999000), '+9999900,0 %');
  });

  it('[H7-R9] rechaza con InvalidAmount una variación que no es entera', () => {
    for (const value of [12.5, NaN, Infinity, '125', null, undefined]) {
      assert.throws(() => formatVariationTenths(value), InvalidAmount);
    }
  });
});
