import { InvalidLlmResponse } from '../core/errors.js';

export const ADVICE_DISCLAIMER =
  'Estas sugerencias son orientativas y se generan automáticamente a partir de tus datos. No constituyen asesoramiento financiero profesional.';
export const ADVICE_MIN_SUGGESTIONS = 1;
export const ADVICE_MAX_SUGGESTIONS = 3;
export const ADVICE_TITLE_MAX = 60;
export const ADVICE_DETAIL_MAX = 280;
export const ADVICE_GENERAL_CATEGORY = 'General';

const MARKDOWN_BLOCK_REGEX = /^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/;

function normalizeCategory(value) {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('es');
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Largo en code points después de quitar los espacios de los extremos. */
export function textLength(text) {
  return Array.from(String(text ?? '').trim()).length;
}

/** Categorías válidas para `categoria`, en minúsculas: las del resumen y «General». */
export function allowedAdviceCategories(summary) {
  const allowed = new Set([normalizeCategory(ADVICE_GENERAL_CATEGORY)]);
  for (const item of summary?.categorias ?? []) {
    allowed.add(normalizeCategory(item?.nombre));
  }
  for (const item of summary?.recurrencias ?? []) {
    allowed.add(normalizeCategory(item?.categoria));
  }
  return allowed;
}

function validateSuggestion(item, allowed) {
  if (!isPlainObject(item)) {
    throw new InvalidLlmResponse('Cada sugerencia debe ser un objeto');
  }
  const { titulo, detalle, categoria } = item;
  if (typeof titulo !== 'string' || typeof detalle !== 'string' || typeof categoria !== 'string') {
    throw new InvalidLlmResponse('Cada sugerencia debe tener titulo, detalle y categoria de texto');
  }
  const titleLength = textLength(titulo);
  if (titleLength < 1 || titleLength > ADVICE_TITLE_MAX) {
    throw new InvalidLlmResponse('El título de la sugerencia no respeta el largo permitido');
  }
  const detailLength = textLength(detalle);
  if (detailLength < 1 || detailLength > ADVICE_DETAIL_MAX) {
    throw new InvalidLlmResponse('El detalle de la sugerencia no respeta el largo permitido');
  }
  if (!allowed.has(normalizeCategory(categoria))) {
    throw new InvalidLlmResponse('La categoría de la sugerencia no está en el resumen');
  }
  return Object.freeze({
    titulo: titulo.trim(),
    detalle: detalle.trim(),
    categoria: categoria.trim(),
  });
}

/**
 * Valida la respuesta completa (R14). Ante cualquier incumplimiento rechaza todo: no recorta,
 * no filtra y no corrige. Ignora las claves extra.
 * @returns {Readonly<{ sugerencias: ReadonlyArray<{titulo: string, detalle: string, categoria: string}> }>}
 * @throws {InvalidLlmResponse}
 */
export function validateAdvice(advice, summary) {
  if (!isPlainObject(advice) || !Array.isArray(advice.sugerencias)) {
    throw new InvalidLlmResponse('La respuesta debe tener un arreglo sugerencias');
  }
  const { sugerencias } = advice;
  if (sugerencias.length < ADVICE_MIN_SUGGESTIONS || sugerencias.length > ADVICE_MAX_SUGGESTIONS) {
    throw new InvalidLlmResponse('La respuesta debe tener entre 1 y 3 sugerencias');
  }
  const allowed = allowedAdviceCategories(summary);
  const validated = sugerencias.map((item) => validateSuggestion(item, allowed));
  return Object.freeze({ sugerencias: Object.freeze(validated) });
}

/**
 * Quita un único bloque ``` o ```json envolvente (R12), interpreta el JSON (R13) y valida (R14).
 * @throws {InvalidLlmResponse}
 */
export function parseAdviceResponse(rawText, summary) {
  if (typeof rawText !== 'string') {
    throw new InvalidLlmResponse('La respuesta del asistente no es texto');
  }
  let content = rawText.trim();
  const block = MARKDOWN_BLOCK_REGEX.exec(content);
  if (block) {
    content = block[1];
  }
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new InvalidLlmResponse('La respuesta del asistente no es JSON');
  }
  if (!isPlainObject(parsed) || !Array.isArray(parsed.sugerencias)) {
    throw new InvalidLlmResponse('La respuesta debe tener un arreglo sugerencias');
  }
  return validateAdvice(parsed, summary);
}
