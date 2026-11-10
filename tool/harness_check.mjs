// Verificador del arnés SDD en Node.js (sin dependencias externas).
// Uso: node tool/harness_check.mjs
//
// Comprueba:
//   1. Archivos base del arnés.
//   2. feature_list.json: estados válidos, ids únicos, máximo una feature in_progress.
//   3. Specs presentes para features sdd en spec_ready / in_progress / done.
//   4. Tareas completas en features sdd done.
//   5. Trazabilidad: cada R<n> de una feature done tiene una prueba con [H<id>-R<n>].
//   6. Formato de progress/horas.csv.
// Sale con código 1 si hay algún [FAIL].

import fs from 'node:fs';
import path from 'node:path';

const validStatus = ['pending', 'spec_ready', 'in_progress', 'done', 'blocked'];

const baseFiles = [
  'AGENTS.md',
  'CLAUDE.md',
  'rules.md',
  'CHECKPOINTS.md',
  'feature_list.json',
  'progress/current.md',
  'progress/history.md',
  'progress/horas.csv',
  'docs/architecture.md',
  'docs/conventions.md',
  'docs/specs.md',
  'docs/verification.md',
  'docs/Proyecto_Tec_Laborales_Grupo_3.pdf',
];

const horasHeader = 'fecha,integrante,actividad,feature,herramienta,horas,nota';

let failCount = 0;
let warnCount = 0;

function ok(msg) {
  console.log(`[OK]    ${msg}`);
}

function warn(msg) {
  warnCount++;
  console.log(`[WARN]  ${msg}`);
}

function fail(msg) {
  failCount++;
  console.log(`[FAIL]  ${msg}`);
}

function collectFilesRecursive(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFilesRecursive(fullPath));
    } else if (
      entry.isFile() &&
      (entry.name.endsWith('.js') ||
        entry.name.endsWith('.jsx') ||
        entry.name.endsWith('.mjs'))
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

function readAllTests() {
  const chunks = [];
  for (const dirName of ['test', 'src']) {
    for (const filePath of collectFilesRecursive(dirName)) {
      if (
        dirName === 'test' ||
        filePath.includes('.test.') ||
        filePath.includes('.spec.')
      ) {
        chunks.push(fs.readFileSync(filePath, 'utf8'));
      }
    }
  }
  return chunks.join('\n');
}

function requirementIds(requirementsText) {
  const pattern = /^##\s+R(\d+)\b/gm;
  const ids = [];
  let match;
  while ((match = pattern.exec(requirementsText)) !== null) {
    ids.push(Number.parseInt(match[1], 10));
  }
  return ids;
}

function openTasks(tasksText) {
  const pattern = /^\s*-\s\[ \]/gm;
  const matches = tasksText.match(pattern);
  return matches ? matches.length : 0;
}

console.log('── Archivos base ─────────────────────────────────────');
for (const filePath of baseFiles) {
  if (fs.existsSync(filePath)) {
    ok(`Existe ${filePath}`);
  } else {
    fail(`Falta archivo base: ${filePath}`);
  }
}

console.log('');
console.log('── feature_list.json y specs ─────────────────────────');
if (!fs.existsSync('feature_list.json')) {
  process.exit(1);
}

let features;
try {
  const data = JSON.parse(fs.readFileSync('feature_list.json', 'utf8'));
  features = data.features;
  if (!Array.isArray(features)) {
    throw new Error('El campo "features" no es un arreglo');
  }
} catch (err) {
  fail(`feature_list.json inválido: ${err.message}`);
  process.exit(1);
}

const ids = new Set();
let inProgress = 0;
for (const f of features) {
  const id = f.id;
  const status = f.status;
  if (ids.has(id)) {
    fail(`Id repetido en feature_list.json: ${id}`);
  }
  ids.add(id);
  if (!validStatus.includes(status)) {
    fail(`Estado inválido en la feature ${id}: ${status}`);
  }
  if (status === 'in_progress') {
    inProgress++;
  }
}

if (inProgress > 1) {
  fail(`Hay ${inProgress} features en in_progress (máximo 1)`);
} else {
  ok(`feature_list.json válido (${features.length} features, ${inProgress} en curso)`);
}

const testsText = readAllTests();
let totalReqs = 0;
let coveredReqs = 0;

for (const f of features) {
  const sdd = f.sdd === true;
  const status = f.status;
  const name = f.name;
  const historia = f.historia ?? `H${f.id}`;
  if (!sdd || status === 'pending' || status === 'blocked') {
    continue;
  }

  const dir = `specs/${name}`;
  const reqFile = `${dir}/requirements.md`;
  const designFile = `${dir}/design.md`;
  const tasksFile = `${dir}/tasks.md`;
  const missing = [];
  if (!fs.existsSync(reqFile)) missing.push('requirements.md');
  if (!fs.existsSync(designFile)) missing.push('design.md');
  if (!fs.existsSync(tasksFile)) missing.push('tasks.md');
  if (missing.length > 0) {
    fail(`${historia} (${name}) en ${status} sin ${missing.join(', ')} en ${dir}/`);
    continue;
  }

  const reqs = requirementIds(fs.readFileSync(reqFile, 'utf8'));
  if (reqs.length === 0) {
    fail(`${historia}: ${reqFile} no tiene requisitos "## R<n>"`);
    continue;
  }
  ok(`${historia}: spec completo (${reqs.length} requisitos)`);

  if (status === 'spec_ready') {
    continue;
  }

  const pending = openTasks(fs.readFileSync(tasksFile, 'utf8'));
  if (status === 'done' && pending > 0) {
    fail(`${historia} está done con ${pending} tareas sin marcar en ${tasksFile}`);
  }

  const uncovered = [];
  for (const n of reqs) {
    totalReqs++;
    const tag = `[${historia}-R${n}]`;
    if (testsText.includes(tag)) {
      coveredReqs++;
    } else {
      uncovered.push(`R${n}`);
    }
  }
  if (uncovered.length === 0) {
    ok(`${historia}: todos los requisitos tienen prueba etiquetada`);
  } else if (status === 'done') {
    fail(`${historia} está done y faltan pruebas para ${uncovered.join(', ')}`);
  } else {
    warn(`${historia} en curso: todavía sin prueba para ${uncovered.join(', ')}`);
  }
}

if (totalReqs > 0) {
  const pct = Math.round((coveredReqs * 100) / totalReqs);
  ok(`Trazabilidad (K6 parcial): ${coveredReqs} de ${totalReqs} requisitos con prueba (${pct} %)`);
}

console.log('');
console.log('── Registro de horas ─────────────────────────────────');
if (fs.existsSync('progress/horas.csv')) {
  const lines = fs
    .readFileSync('progress/horas.csv', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (lines.length === 0 || lines[0].trim() !== horasHeader) {
    fail(`progress/horas.csv debe empezar con: ${horasHeader}`);
  } else {
    let bad = 0;
    let total = 0.0;
    for (const line of lines.slice(1)) {
      const cols = line.split(',');
      const val = cols.length >= 6 ? Number.parseFloat(cols[5].trim()) : Number.NaN;
      if (Number.isNaN(val)) {
        bad++;
      } else {
        total += val;
      }
    }
    if (bad > 0) {
      warn(`progress/horas.csv tiene ${bad} filas con formato inválido`);
    }
    ok(`Horas registradas: ${total.toFixed(1)} en ${lines.length - 1} filas`);
  }
}

console.log('');
if (failCount > 0) {
  console.log(`[FAIL]  Arnés con ${failCount} errores y ${warnCount} advertencias.`);
  process.exit(1);
}
console.log(`[OK]    Arnés consistente (${warnCount} advertencias).`);
