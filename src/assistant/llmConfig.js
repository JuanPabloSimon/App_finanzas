export const DEFAULT_LLM_MODEL = 'llama-3.3-70b-versatile';
export const DEFAULT_LLM_BASE_URL = 'https://api.groq.com/openai/v1';

function cleanText(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function cleanModel(value) {
  const cleaned = cleanText(value);
  if (!cleaned || /^gemini/i.test(cleaned)) {
    return null;
  }
  return cleaned;
}

/**
 * Lee la configuración del asistente desde las variables de entorno de Vite.
 * Sin VITE_LLM_API_KEY (vacía o ausente) no hay asistente y se usa la reserva (R28).
 * Si VITE_LLM_MODEL quedó con un nombre de modelo de Gemini (gemini-*), se usa el modelo
 * por defecto de Groq (DEFAULT_LLM_MODEL).
 * @returns {Readonly<{ apiKey: string|null, model: string, baseUrl: string }>}
 */
export function readLlmConfig(env = {}) {
  const source = env ?? {};
  return Object.freeze({
    apiKey: cleanText(source.VITE_LLM_API_KEY),
    model: cleanModel(source.VITE_LLM_MODEL) ?? DEFAULT_LLM_MODEL,
    baseUrl: DEFAULT_LLM_BASE_URL,
  });
}
