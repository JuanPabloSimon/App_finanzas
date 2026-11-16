import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  CsvExporter,
  CSV_HEADERS,
  formatCentsForCsv,
  neutralizeFormula,
  escapeCsvField,
  buildExportFileName,
} from '../../../src/domain/services/csvExporter.js';
import { InvalidAmount, InvalidExpenseDate } from '../../../src/core/errors.js';
import { parseCsv, parseCsvAmountToCents } from './csvTestParser.js';

const HEADER_LINE = 'Fecha;Monto (ARS);Categoría;Subcategoría;Nota';

function row(overrides = {}) {
  return {
    id: 1,
    date: '2026-11-03',
    amountCents: 150000,
    categoryName: 'Alimentos',
    subcategory: null,
    note: null,
    ...overrides,
  };
}

function exportRows(rows) {
  return new CsvExporter().export(rows);
}

function linesWithoutBom(content) {
  return content.slice(1).split('\r\n');
}

describe('H11 exportador CSV', () => {
  it('[H11-R2] la primera línea es el encabezado Fecha;Monto (ARS);Categoría;Subcategoría;Nota', () => {
    const { content } = exportRows([row()]);
    assert.equal(linesWithoutBom(content)[0], HEADER_LINE);
    assert.deepEqual([...CSV_HEADERS], HEADER_LINE.split(';'));
  });

  it('[H11-R3] cada fila de un gasto sin caracteres especiales tiene 5 campos separados por punto y coma', () => {
    const { content } = exportRows([
      row({ id: 1, subcategory: 'Super', note: 'Compra semanal' }),
      row({ id: 2, date: '2026-11-04', categoryName: 'Transporte' }),
    ]);
    const dataLines = linesWithoutBom(content).slice(1, -1);
    assert.equal(dataLines.length, 2);
    for (const line of dataLines) {
      assert.equal((line.match(/;/g) ?? []).length, 4);
      assert.equal(line.split(';').length, 5);
    }
    assert.equal(dataLines[0], '2026-11-03;1500,00;Alimentos;Super;Compra semanal');
  });

  it('[H11-R4] todas las líneas terminan en CRLF, incluida la última, sin LF sueltos fuera de comillas', () => {
    const { content } = exportRows([
      row({ id: 1 }),
      row({ id: 2, note: 'línea1\nlínea2' }),
    ]);
    assert.ok(content.endsWith('\r\n'));
    const outsideQuotes = content.replace(/"(?:[^"]|"")*"/g, '');
    assert.equal(/(^|[^\r])\n/.test(outsideQuotes), false);
    assert.equal((outsideQuotes.match(/\r\n/g) ?? []).length, 3);
  });

  it('[H11-R5] el contenido empieza con la marca BOM UTF-8 y export([]) devuelve BOM + encabezado + CRLF', () => {
    const { content } = exportRows([row()]);
    assert.equal(content.charCodeAt(0), 0xfeff);
    const bytes = Buffer.from(content, 'utf8');
    assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf]);

    const empty = exportRows([]);
    assert.equal(empty.content, `\uFEFF${HEADER_LINE}\r\n`);
    assert.equal(empty.rowCount, 0);
    assert.equal(empty.totalCents, 0);
    assert.ok(Object.isFrozen(empty));
  });

  it('[H11-R6] escribe la fecha en formato AAAA-MM-DD y rechaza una fila con fecha inválida', () => {
    const { content } = exportRows([row({ date: '2026-03-09' })]);
    assert.ok(linesWithoutBom(content)[1].startsWith('2026-03-09;'));
    assert.throws(() => exportRows([row({ date: '09/03/2026' })]), InvalidExpenseDate);
    assert.throws(() => exportRows([row({ date: '2026-02-30' })]), InvalidExpenseDate);
  });

  it('[H11-R7] formatea los centavos con coma decimal, dos decimales y aritmética entera', () => {
    assert.equal(formatCentsForCsv(123456), '1234,56');
    assert.equal(formatCentsForCsv(5), '0,05');
    assert.equal(formatCentsForCsv(10), '0,10');
    assert.equal(formatCentsForCsv(100), '1,00');
    assert.equal(formatCentsForCsv(123456789), '1234567,89');
    for (const invalid of [10.5, 0, -100, Number.MAX_SAFE_INTEGER + 1, '100', null]) {
      assert.throws(() => formatCentsForCsv(invalid), InvalidAmount);
    }
    const { content } = exportRows([row({ amountCents: 123456 }), row({ id: 2, amountCents: 5 })]);
    const amounts = parseCsv(content).rows.map((fields) => fields[1]);
    assert.deepEqual(amounts, ['1234,56', '0,05']);
    for (const amount of amounts) {
      assert.equal(amount.includes('.'), false);
    }
  });

  it('[H11-R8] la columna Categoría contiene el nombre de la categoría y no su id', () => {
    const { content } = exportRows([row({ categoryName: 'Suscripciones' })]);
    const [fields] = parseCsv(content).rows;
    assert.equal(fields[2], 'Suscripciones');
  });

  it('[H11-R9] deja vacíos los campos de subcategoría y nota cuando no tienen valor', () => {
    const { content } = exportRows([row({ subcategory: null, note: null })]);
    assert.equal(linesWithoutBom(content)[1], '2026-11-03;1500,00;Alimentos;;');
    const withEmptyStrings = exportRows([row({ subcategory: '', note: '' })]);
    assert.equal(linesWithoutBom(withEmptyStrings.content)[1], '2026-11-03;1500,00;Alimentos;;');
  });

  it('[H11-R10] ordena por fecha ascendente y a igual fecha por id ascendente sin mutar la entrada', () => {
    const input = [
      row({ id: 2, date: '2026-11-05', note: 'b' }),
      row({ id: 9, date: '2026-10-01', note: 'c' }),
      row({ id: 1, date: '2026-11-05', note: 'a' }),
    ];
    const snapshot = input.map((item) => ({ ...item }));
    const { content } = exportRows(input);
    const rows = parseCsv(content).rows;
    assert.deepEqual(
      rows.map((fields) => [fields[0], fields[4]]),
      [
        ['2026-10-01', 'c'],
        ['2026-11-05', 'a'],
        ['2026-11-05', 'b'],
      ],
    );
    assert.deepEqual(input, snapshot);
  });

  it('[H11-R11] encierra entre comillas los campos con punto y coma, comillas o saltos de línea y duplica las comillas', () => {
    assert.equal(escapeCsvField('a;b'), '"a;b"');
    assert.equal(escapeCsvField('dijo "hola"'), '"dijo ""hola"""');
    assert.equal(escapeCsvField('línea1\nlínea2'), '"línea1\nlínea2"');
    assert.equal(escapeCsvField('x\r\ny'), '"x\r\ny"');
    assert.equal(escapeCsvField('simple'), 'simple');
    assert.equal(escapeCsvField(null), '');
  });

  it('[H11-R12] antepone un apóstrofo a los campos de texto que empiezan con un carácter de fórmula, antes del escape', () => {
    assert.equal(neutralizeFormula('=SUMA(A1)'), "'=SUMA(A1)");
    assert.equal(neutralizeFormula('+54 11'), "'+54 11");
    assert.equal(neutralizeFormula('-20 % de descuento'), "'-20 % de descuento");
    assert.equal(neutralizeFormula('@usuario'), "'@usuario");
    assert.equal(neutralizeFormula('\tcon tab'), "'\tcon tab");
    assert.equal(neutralizeFormula('\rcon cr'), "'\rcon cr");
    assert.equal(neutralizeFormula('a=b'), 'a=b');
    assert.equal(neutralizeFormula(null), '');
    assert.equal(neutralizeFormula(''), '');

    const { content } = exportRows([
      row({ id: 1, categoryName: '@Ocio', subcategory: '+Extra', note: '=a;b' }),
      row({ id: 2, note: 'total = 3' }),
    ]);
    const lines = linesWithoutBom(content);
    assert.equal(lines[1], `2026-11-03;1500,00;'@Ocio;'+Extra;"'=a;b"`);
    assert.equal(lines[2], '2026-11-03;1500,00;Alimentos;;total = 3');
    for (const fields of parseCsv(content).rows) {
      assert.equal(fields[0].startsWith("'"), false);
      assert.equal(fields[1].startsWith("'"), false);
    }
  });

  it('[H11-R13][H11-R14] con notas especiales produce una fila por gasto y la suma de montos coincide con los centavos', () => {
    const input = [
      row({ id: 1, amountCents: 123456, note: 'Compra; con punto y coma' }),
      row({ id: 2, amountCents: 5, note: 'dijo "hola"' }),
      row({ id: 3, amountCents: 650000, note: 'línea1\nlínea2' }),
      row({ id: 4, amountCents: 99, note: 'x\r\ny' }),
      row({ id: 5, amountCents: 1000000, note: '=SUMA(A1:A9)' }),
      row({ id: 6, amountCents: 4321, subcategory: 'Super', note: null }),
    ];
    const result = exportRows(input);
    const parsed = parseCsv(result.content);
    assert.equal(parsed.rows.length, 6);
    assert.equal(result.rowCount, 6);
    for (const fields of parsed.rows) {
      assert.equal(fields.length, 5);
    }
    const expectedTotal = input.reduce((sum, item) => sum + item.amountCents, 0);
    const parsedTotal = parsed.rows.reduce(
      (sum, fields) => sum + parseCsvAmountToCents(fields[1]),
      0,
    );
    assert.equal(parsedTotal, expectedTotal);
    assert.equal(result.totalCents, expectedTotal);
    assert.equal(parsed.rows[2][4], 'línea1\nlínea2');
    assert.equal(parsed.rows[4][4], "'=SUMA(A1:A9)");
  });

  it('[H11-R14] rechaza un total que supera el entero seguro', () => {
    assert.throws(
      () =>
        exportRows([
          row({ id: 1, amountCents: Number.MAX_SAFE_INTEGER }),
          row({ id: 2, amountCents: 100 }),
        ]),
      InvalidAmount,
    );
  });

  it('[H11-R16] nombra el archivo gestix_gastos_<AAAA-MM-DD>.csv y rechaza fechas inválidas', () => {
    assert.equal(buildExportFileName('2026-11-15'), 'gestix_gastos_2026-11-15.csv');
    assert.throws(() => buildExportFileName('2026-13-01'), InvalidExpenseDate);
    assert.throws(() => buildExportFileName(null), InvalidExpenseDate);
  });

  it('[H11-R28] el exportador es JavaScript puro y funciona sin red', () => {
    const source = fs.readFileSync(
      new URL('../../../src/domain/services/csvExporter.js', import.meta.url),
      'utf8',
    );
    for (const forbidden of [
      'fetch(',
      'XMLHttpRequest',
      'axios',
      "from 'react'",
      'react-dom',
      'node:sqlite',
      'Blob',
      'document.',
    ]) {
      assert.equal(source.includes(forbidden), false, `no debe contener ${forbidden}`);
    }

    const originalFetch = globalThis.fetch;
    globalThis.fetch = () => {
      throw new Error('Llamada de red no permitida');
    };
    try {
      const result = exportRows([row()]);
      assert.equal(result.rowCount, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
