import { formatCentsToArs } from '../core/formatters.js';
import { ADVICE_GENERAL_CATEGORY } from './adviceResponse.js';

export const FALLBACK_NAME_MAX = 40;

function shortName(name) {
  const chars = Array.from(String(name ?? '').trim());
  if (chars.length <= FALLBACK_NAME_MAX) {
    return chars.join('');
  }
  return `${chars.slice(0, FALLBACK_NAME_MAX - 1).join('')}…`;
}

function formatPercent(value) {
  return String(value).replace('.', ',');
}

function formatPesos(pesos) {
  return formatCentsToArs(pesos * 100);
}

function suggestion(titulo, detalle, categoria) {
  return Object.freeze({ titulo, detalle, categoria });
}

function biggestIncreaseRule(summary) {
  let best = null;
  for (const item of summary?.categorias ?? []) {
    const variation = item?.variacion_pct;
    if (typeof variation === 'number' && variation > 0 && (best === null || variation > best.variacion_pct)) {
      best = item;
    }
  }
  if (best === null) {
    return null;
  }
  return suggestion(
    'Subió el gasto en una categoría',
    `${shortName(best.nombre)} aumentó ${formatPercent(best.variacion_pct)} % respecto del mes anterior (${formatPesos(best.total)} este mes). Revisá si ese aumento fue planificado.`,
    best.nombre,
  );
}

function recurrenceRule(summary) {
  const first = (summary?.recurrencias ?? [])[0];
  if (!first) {
    return null;
  }
  return suggestion(
    'Revisá tus gastos repetidos',
    `Detectamos ${first.veces_en_60_dias} gastos de alrededor de ${formatPesos(first.monto_tipico)} en ${shortName(first.categoria)} en los últimos 60 días. Evaluá si todos siguen siendo necesarios.`,
    first.categoria,
  );
}

function incomeWeightRule(summary) {
  const income = summary?.ingreso_mensual;
  const first = (summary?.categorias ?? [])[0];
  if (typeof income !== 'number' || income <= 0 || !first) {
    return null;
  }
  const percent = Math.round((first.total * 1000) / income) / 10;
  return suggestion(
    'Peso de tu categoría principal',
    `${shortName(first.nombre)} representa el ${formatPercent(percent)} % de tu ingreso mensual registrado. Definí un tope para esa categoría el mes que viene.`,
    first.nombre,
  );
}

/**
 * Respuesta de reserva basada en reglas (R18), sobre el mismo resumen agregado.
 * @returns {Readonly<{ sugerencias: ReadonlyArray<{titulo: string, detalle: string, categoria: string}> }>}
 */
export function buildFallbackAdvice(summary) {
  const sugerencias = [biggestIncreaseRule, recurrenceRule, incomeWeightRule]
    .map((rule) => rule(summary))
    .filter((item) => item !== null);

  if (sugerencias.length === 0) {
    sugerencias.push(
      suggestion(
        'Registrá tus movimientos del mes',
        'Todavía no hay datos suficientes para darte sugerencias. Registrá tus gastos y tu ingreso mensual para recibir recomendaciones.',
        ADVICE_GENERAL_CATEGORY,
      ),
    );
  }
  return Object.freeze({ sugerencias: Object.freeze(sugerencias) });
}
