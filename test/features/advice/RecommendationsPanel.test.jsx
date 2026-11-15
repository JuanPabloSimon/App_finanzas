import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import {
  RecommendationsPanel,
  RECOMMENDATIONS_SOURCE_FALLBACK_TEXT,
  RECOMMENDATIONS_SOURCE_MODEL_TEXT,
  RECOMMENDATIONS_LIMIT_TEXT,
  RECOMMENDATIONS_NO_API_KEY_TEXT,
} from '../../../src/features/advice/RecommendationsPanel.jsx';
import { ADVICE_DISCLAIMER } from '../../../src/assistant/adviceResponse.js';

const h = React.createElement;

const SUGGESTIONS = [
  { titulo: 'Bajá el delivery', detalle: 'Probá cocinar dos veces por semana.', categoria: 'Delivery' },
  { titulo: 'Revisá suscripciones', detalle: 'Cancelá las que no uses.', categoria: 'Suscripciones' },
  { titulo: 'Poné un tope', detalle: 'Definí un monto para Alimentos.', categoria: 'Alimentos' },
];

function render(props) {
  return renderToStaticMarkup(h(RecommendationsPanel, props));
}

function count(html, testId) {
  return (html.match(new RegExp(`data-testid="${testId}"`, 'g')) ?? []).length;
}

describe('H10 panel de recomendaciones en la pestaña Alertas', () => {
  it('[H10-R10] muestra cada sugerencia con título, detalle y categoría, en una columna en mobile y dos en desktop', () => {
    const mobile = render({ status: 'ready', suggestions: SUGGESTIONS, source: 'model', viewportWidth: 390 });
    assert.equal(count(mobile, 'recommendation-item'), 3);
    assert.equal(count(mobile, 'recommendation-title'), 3);
    assert.equal(count(mobile, 'recommendation-detail'), 3);
    assert.equal(count(mobile, 'recommendation-category'), 3);
    assert.match(mobile, /data-testid="recommendation-title"[^>]*>Bajá el delivery</);
    assert.match(mobile, /data-testid="recommendation-detail"[^>]*>Probá cocinar dos veces por semana\.</);
    assert.match(mobile, /data-testid="recommendation-category"[^>]*>Suscripciones</);
    assert.match(mobile, /data-testid="recommendations-panel" data-layout="mobile"/);
    assert.match(mobile, /data-testid="recommendations-list" data-columns="1"/);

    const desktop = render({ status: 'ready', suggestions: SUGGESTIONS, source: 'model', viewportWidth: 1280 });
    assert.match(desktop, /data-testid="recommendations-panel" data-layout="desktop"/);
    assert.match(desktop, /data-testid="recommendations-list" data-columns="2"/);

    assert.equal(RecommendationsPanel.buildStyles(390).requestButton.minHeight, 44);
    assert.equal(RecommendationsPanel.buildStyles(390).requestButton.width, '100%');
    assert.equal(RecommendationsPanel.buildStyles(1280).requestButton.minHeight, 44);
    assert.equal(RecommendationsPanel.buildStyles(1280).card.maxWidth, 960);
  });

  it('[H10-R10] escapa el texto del modelo como texto de React', () => {
    const html = render({
      status: 'ready',
      source: 'model',
      suggestions: [{ titulo: '<b>x</b>', detalle: '<script>alert(1)</script>', categoria: 'General' }],
    });
    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /&lt;script&gt;/);
  });

  it('[H10-R11] muestra la advertencia orientativa literal con sugerencias del modelo y de reserva', () => {
    for (const source of ['model', 'fallback']) {
      const html = render({ status: 'ready', suggestions: SUGGESTIONS.slice(0, 1), source });
      assert.match(html, /data-testid="recommendations-disclaimer"/);
      assert.equal(html.includes(ADVICE_DISCLAIMER), true);
    }
  });

  it('[H10-R19] indica si las sugerencias vienen del asistente o de reglas', () => {
    const fallback = render({ status: 'ready', suggestions: SUGGESTIONS, source: 'fallback', reason: 'timeout' });
    assert.match(fallback, /data-testid="recommendations-source" data-source="fallback"/);
    assert.equal(fallback.includes(RECOMMENDATIONS_SOURCE_FALLBACK_TEXT), true);
    assert.equal(fallback.includes(RECOMMENDATIONS_SOURCE_MODEL_TEXT), false);

    const model = render({ status: 'ready', suggestions: SUGGESTIONS, source: 'model', reason: 'model_ok' });
    assert.match(model, /data-testid="recommendations-source" data-source="model"/);
    assert.equal(model.includes(RECOMMENDATIONS_SOURCE_MODEL_TEXT), true);
    assert.equal(model.includes(RECOMMENDATIONS_SOURCE_FALLBACK_TEXT), false);
  });

  it('[H10-R21] con limit_reached muestra el aviso de límite con role="status" y con otro reason no', () => {
    const limited = render({
      status: 'ready',
      suggestions: SUGGESTIONS,
      source: 'fallback',
      reason: 'limit_reached',
      remainingModelRequests: 0,
    });
    assert.match(limited, /data-testid="recommendations-limit-notice" role="status"/);
    assert.equal(limited.includes(RECOMMENDATIONS_LIMIT_TEXT), true);

    const other = render({ status: 'ready', suggestions: SUGGESTIONS, source: 'fallback', reason: 'timeout' });
    assert.doesNotMatch(other, /recommendations-limit-notice/);

    const noKey = render({ status: 'ready', suggestions: SUGGESTIONS, source: 'fallback', reason: 'no_api_key' });
    assert.match(noKey, /data-testid="recommendations-config-notice"/);
    assert.equal(noKey.includes(RECOMMENDATIONS_NO_API_KEY_TEXT), true);
    assert.doesNotMatch(noKey, /recommendations-limit-notice/);
  });

  it('[H10-R26] muestra cuántas consultas quedan en el mes sobre un total de 4', () => {
    const idle = render({ status: 'idle', remainingModelRequests: 3 });
    assert.match(idle, /data-testid="recommendations-remaining"[^>]*>Te quedan 3 de 4 consultas al asistente este mes</);
    assert.match(idle, /data-testid="recommendations-request-button"/);
    assert.match(idle, /Pedir recomendaciones/);
    assert.doesNotMatch(idle, /recommendations-list/);
    assert.doesNotMatch(idle, /recommendations-disclaimer/);

    const exhausted = render({ status: 'ready', suggestions: SUGGESTIONS, source: 'fallback', remainingModelRequests: 0 });
    assert.match(exhausted, /Te quedan 0 de 4 consultas al asistente este mes/);
  });

  it('[H10-R27] en loading el botón queda deshabilitado con aria-busy y no dispara onRequest', () => {
    const html = render({ status: 'loading', remainingModelRequests: 2 });
    assert.match(html, /<button[^>]*disabled=""[^>]*aria-busy="true"/);
    assert.match(html, /data-testid="recommendations-loading"[^>]*>Consultando al asistente…</);

    let requests = 0;
    const loadingTree = RecommendationsPanel({ status: 'loading', onRequest: () => { requests += 1; } });
    const idleTree = RecommendationsPanel({ status: 'idle', onRequest: () => { requests += 1; } });
    const findButton = (tree) =>
      tree.props.children.find((child) => child?.props?.['data-testid'] === 'recommendations-request-button');
    findButton(loadingTree).props.onClick();
    assert.equal(requests, 0);
    findButton(idleTree).props.onClick();
    assert.equal(requests, 1);
  });
});
