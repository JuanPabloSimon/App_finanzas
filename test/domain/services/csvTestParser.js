const BOM = '\uFEFF';

export function parseCsv(text) {
  const source = text.startsWith(BOM) ? text.slice(1) : text;
  const records = [];
  let record = [];
  let field = '';
  let inQuotes = false;
  let index = 0;

  while (index < source.length) {
    const char = source[index];
    if (inQuotes) {
      if (char === '"' && source[index + 1] === '"') {
        field += '"';
        index += 2;
        continue;
      }
      if (char === '"') {
        inQuotes = false;
        index += 1;
        continue;
      }
      field += char;
      index += 1;
      continue;
    }
    if (char === '"' && field.length === 0) {
      inQuotes = true;
      index += 1;
      continue;
    }
    if (char === ';') {
      record.push(field);
      field = '';
      index += 1;
      continue;
    }
    if (char === '\r' && source[index + 1] === '\n') {
      record.push(field);
      records.push(record);
      record = [];
      field = '';
      index += 2;
      continue;
    }
    field += char;
    index += 1;
  }

  if (inQuotes) {
    throw new Error('CSV mal formado: comillas sin cerrar');
  }
  if (field.length > 0 || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  const [headers = [], ...rows] = records;
  return { headers, rows };
}

export function parseCsvAmountToCents(text) {
  const match = /^(\d+),(\d{2})$/.exec(text);
  if (!match) {
    throw new Error(`Monto CSV inválido: ${text}`);
  }
  return Number.parseInt(match[1], 10) * 100 + Number.parseInt(match[2], 10);
}
