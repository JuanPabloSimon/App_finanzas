import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import {
  RecurrencesPanel,
  RECURRENCES_EMPTY_MESSAGE,
} from '../../../src/features/recurrences/RecurrencesPanel.jsx';
import { Recurrence } from '../../../src/domain/models/recurrence.js';

const h = React.createElement;

const RECURRENCES = [
  new Recurrence({
    categoryId: 7,
    categoryName: 'Suscripciones',
    typicalAmountCents: 650000,
    occurrences: 3,
    expenseIds: [1, 2, 3],
  }),
  new Recurrence({
    categoryId: 6,
    categoryName: 'Delivery',
    typicalAmountCents: 1200050,
    occurrences: 4,
    expenseIds: [4, 5, 6, 7],
  }),
];

function render(props) {
  return renderToStaticMarkup(h(RecurrencesPanel, props));
}

describe('H9 panel de recurrencias en la pestaña Alertas', () => {
  it('[H9-R8] muestra categoría, monto típico en pesos, repeticiones y un botón Descartar por recurrencia', () => {
    const html = render({ recurrences: RECURRENCES, viewportWidth: 390 });
    assert.match(html, /data-testid="recurrences-panel"/);
    assert.match(html, /data-testid="recurrences-list"/);
    assert.equal((html.match(/data-testid="recurrence-item"/g) ?? []).length, 2);
    assert.match(html, /data-recurrence-key="7\|650000"/);
    assert.match(html, /data-testid="recurrence-category"[^>]*>Suscripciones</);
    assert.match(html, /data-testid="recurrence-amount"[^>]*>\$ 6\.500</);
    assert.match(html, /data-testid="recurrence-occurrences"[^>]*>3 veces en 60 días</);
    assert.match(html, /data-testid="recurrence-amount"[^>]*>\$ 12\.000,50</);
    assert.match(html, /4 veces en 60 días/);
    assert.equal((html.match(/data-testid="recurrence-dismiss-button"/g) ?? []).length, 2);
    assert.match(html, /<button type="button"[^>]*aria-label="Descartar recurrencia de Suscripciones"[^>]*>Descartar<\/button>/);
    assert.match(html, /Últimos 60 días/);
    assert.doesNotMatch(html, /data-testid="recurrences-empty"/);
  });

  it('[H9-R8] se adapta a mobile en una columna y a desktop en dos columnas con botones de 44 px', () => {
    const mobile = render({ recurrences: RECURRENCES, viewportWidth: 390 });
    assert.match(mobile, /data-testid="recurrences-panel" data-layout="mobile"/);
    assert.match(mobile, /data-testid="recurrences-list" data-columns="1"/);

    const desktop = render({ recurrences: RECURRENCES, viewportWidth: 1280 });
    assert.match(desktop, /data-testid="recurrences-panel" data-layout="desktop"/);
    assert.match(desktop, /data-testid="recurrences-list" data-columns="2"/);

    const mobileStyles = RecurrencesPanel.buildStyles(390);
    assert.equal(mobileStyles.dismissButton.minHeight, 44);
    assert.equal(mobileStyles.dismissButton.width, '100%');
    const desktopStyles = RecurrencesPanel.buildStyles(1280);
    assert.equal(desktopStyles.dismissButton.minHeight, 44);
    assert.equal(desktopStyles.card.maxWidth, 960);
    assert.equal(RecurrencesPanel.buildStyles(800).layoutMode, 'tablet');
  });

  it('[H9-R8] con un error de descarte muestra la alerta y mantiene la lista', () => {
    const html = render({
      recurrences: RECURRENCES,
      errorMessage: 'No se pudo descartar la recurrencia. Probá de nuevo.',
    });
    assert.match(
      html,
      /data-testid="recurrences-error" role="alert"[^>]*>No se pudo descartar la recurrencia\. Probá de nuevo\.</,
    );
    assert.match(html, /data-testid="recurrences-list"/);
  });

  it('[H9-R8] el botón Descartar invoca onDismiss con la recurrencia', () => {
    const received = [];
    const tree = RecurrencesPanel({
      recurrences: RECURRENCES,
      onDismiss: (recurrence) => received.push(recurrence.key),
    });
    const list = React.Children.toArray(tree.props.children).find(
      (child) => child?.props?.['data-testid'] === 'recurrences-list',
    );
    const firstItem = React.Children.toArray(list.props.children)[0];
    const button = React.Children.toArray(firstItem.props.children).find(
      (child) => child?.props?.['data-testid'] === 'recurrence-dismiss-button',
    );
    button.props.onClick();
    assert.deepEqual(received, ['7|650000']);
  });

  it('[H9-R9] sin recurrencias muestra el estado vacío y no renderiza la lista', () => {
    const html = render({ recurrences: [] });
    assert.match(html, /data-testid="recurrences-empty"/);
    assert.equal(html.includes(RECURRENCES_EMPTY_MESSAGE), true);
    assert.equal(
      RECURRENCES_EMPTY_MESSAGE,
      'Todavía no detectamos gastos repetidos en los últimos 60 días.',
    );
    assert.doesNotMatch(html, /data-testid="recurrences-list"/);
  });
});
