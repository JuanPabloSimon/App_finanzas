import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { ExportHistoryPanel } from '../../../src/features/export/ExportHistoryPanel.jsx';
import {
  EXPORT_EMPTY_MESSAGE,
  EXPORT_ERROR_MESSAGE,
  EXPORT_PRIVACY_NOTICE,
  buildExportSuccessMessage,
} from '../../../src/features/export/exportHistory.js';
import { getViewportLayout } from '../../../src/core/responsive.js';

const h = React.createElement;

function render(props) {
  return renderToStaticMarkup(h(ExportHistoryPanel, props));
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

describe('H11 panel de exportación del historial', () => {
  it('[H11-R27] muestra la advertencia de que el archivo incluye notas y no está protegido', () => {
    const html = render({});
    assert.equal(
      EXPORT_PRIVACY_NOTICE,
      'El archivo incluye tus notas y subcategorías y no está protegido. Guardalo en un lugar seguro.',
    );
    assert.match(html, /data-testid="export-privacy-notice"/);
    assert.ok(html.includes(EXPORT_PRIVACY_NOTICE));
  });

  it('[H11-R18] con canShare muestra los botones Descargar CSV y Compartir', () => {
    const html = render({ canShare: true });
    assert.match(html, /data-testid="export-download-button"[^>]*>Descargar CSV</);
    assert.match(html, /data-testid="export-share-button"[^>]*>Compartir</);
  });

  it('[H11-R19] sin canShare no muestra el botón Compartir', () => {
    const html = render({ canShare: false });
    assert.match(html, /data-testid="export-download-button"/);
    assert.doesNotMatch(html, /data-testid="export-share-button"/);
    assert.doesNotMatch(html, />Compartir</);
  });

  it('[H11-R15] con una exportación completa muestra la cantidad y el total en el mensaje', () => {
    const message = buildExportSuccessMessage(3, 1234556);
    assert.equal(message, 'Se exportaron 3 gastos por un total de $ 12.345,56.');
    const html = render({
      exportState: {
        status: 'done',
        rowCount: 3,
        totalCents: 1234556,
        fileName: 'gestix_gastos_2026-11-15.csv',
        message,
      },
    });
    assert.match(html, /data-testid="export-message"/);
    assert.ok(html.includes(message));
    assert.doesNotMatch(html, /data-testid="export-error"/);
  });

  it('[H11-R21] sin gastos muestra el mensaje de que todavía no hay gastos para exportar', () => {
    const html = render({
      exportState: {
        status: 'empty',
        rowCount: 0,
        totalCents: 0,
        fileName: null,
        message: EXPORT_EMPTY_MESSAGE,
      },
    });
    assert.match(html, /data-testid="export-message"[^>]*>Todavía no hay gastos para exportar\.</);
  });

  it('[H11-R22] ante un error muestra el mensaje como alerta y al cancelar no muestra error', () => {
    const html = render({
      exportState: {
        status: 'error',
        rowCount: 0,
        totalCents: 0,
        fileName: null,
        message: EXPORT_ERROR_MESSAGE,
      },
    });
    assert.match(html, /data-testid="export-error"[^>]*role="alert"/);
    assert.ok(html.includes(escapeHtml(EXPORT_ERROR_MESSAGE)));

    const cancelledHtml = render({
      exportState: {
        status: 'cancelled',
        rowCount: 1,
        totalCents: 100,
        fileName: 'gestix_gastos_2026-11-15.csv',
        message: null,
      },
    });
    assert.doesNotMatch(cancelledHtml, /data-testid="export-error"/);
    assert.doesNotMatch(cancelledHtml, /data-testid="export-message"/);
  });

  it('[H11-R25] en mobile los botones ocupan el ancho completo con alto mínimo de 44 px', () => {
    const html = render({ canShare: true, viewportWidth: 390 });
    assert.match(html, /data-testid="export-history-panel"[^>]*data-layout="mobile"/);
    const styles = ExportHistoryPanel.buildStyles(390);
    for (const button of [styles.downloadButton, styles.shareButton]) {
      assert.equal(button.width, '100%');
      assert.equal(button.minHeight, 44);
    }
    assert.equal(styles.actions.flexDirection, 'column');
    assert.equal(styles.card.maxWidth, '100%');
  });

  it('[H11-R26] en desktop limita el ancho a containerMaxWidth y muestra los botones en fila con ancho automático', () => {
    const html = render({ canShare: true, viewportWidth: 1280 });
    assert.match(html, /data-testid="export-history-panel"[^>]*data-layout="desktop"/);
    const styles = ExportHistoryPanel.buildStyles(1280);
    assert.equal(styles.card.maxWidth, getViewportLayout(1280).containerMaxWidth);
    assert.equal(styles.card.margin, '0 auto');
    assert.equal(styles.actions.flexDirection, 'row');
    for (const button of [styles.downloadButton, styles.shareButton]) {
      assert.equal(button.width, 'auto');
      assert.equal(button.minHeight, 44);
    }
  });
});
