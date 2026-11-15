export const DEFAULT_LLM_MODEL = 'gemini-2.5-flash';
export const DEFAULT_LLM_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

function cleanText(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Lee la configuración del asistente desde las variables de entorno de Vite.
 * Sin VITE_LLM_API_KEY (vacía o ausente) no hay asistente y se usa la reserva (R28).
 * @returns {Readonly<{ apiKey: string|null, model: string, baseUrl: string }>}
 */
export function readLlmConfig(env = {}) {
  const source = env ?? {};
  return Object.freeze({
    apiKey: cleanText(source.VITE_LLM_API_KEY),
    model: cleanText(source.VITE_LLM_MODEL) ?? DEFAULT_LLM_MODEL,
    baseUrl: DEFAULT_LLM_BASE_URL,
  });
}
