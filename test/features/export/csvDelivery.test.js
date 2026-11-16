import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  createBrowserCsvDelivery,
  CSV_MIME_TYPE,
  OBJECT_URL_REVOKE_DELAY_MS,
} from '../../../src/features/export/csvDelivery.js';
import { CsvExporter } from '../../../src/domain/services/csvExporter.js';

function createFakeEnv({ navigator = null } = {}) {
  const log = {
    blobs: [],
    files: [],
    anchors: [],
    appended: [],
    created: [],
    revoked: [],
    timers: [],
  };

  class FakeBlob {
    constructor(parts, options) {
      this.parts = parts;
      this.options = options;
      log.blobs.push(this);
    }
  }

  class FakeFile {
    constructor(parts, name, options) {
      this.parts = parts;
      this.name = name;
      this.type = options?.type;
      log.files.push(this);
    }
  }

  const env = {
    Blob: FakeBlob,
    File: FakeFile,
    URL: {
      createObjectURL(blob) {
        log.created.push(blob);
        return 'blob:fake/1';
      },
      revokeObjectURL(url) {
        log.revoked.push(url);
      },
    },
    document: {
      createElement(tag) {
        const anchor = {
          tag,
          style: {},
          clicks: 0,
          removed: false,
          click() {
            this.clicks += 1;
          },
          remove() {
            this.removed = true;
          },
        };
        log.anchors.push(anchor);
        return anchor;
      },
      body: {
        appendChild(node) {
          log.appended.push(node);
        },
      },
    },
    navigator,
    setTimeout(fn, delay) {
      log.timers.push({ fn, delay });
    },
  };
  return { env, log };
}

const CONTENT = new CsvExporter().export([
  {
    id: 1,
    date: '2026-11-03',
    amountCents: 150000,
    categoryName: 'Alimentos',
    subcategory: null,
    note: null,
  },
]).content;
const FILE_NAME = 'gestix_gastos_2026-11-15.csv';

describe('H11 entrega del CSV en el navegador', () => {
  it('[H11-R17] download crea un Blob text/csv, un enlace con download, hace click una vez, lo quita y revoca la URL diferida', async () => {
    const { env, log } = createFakeEnv();
    const delivery = createBrowserCsvDelivery(env);

    await delivery.download({ fileName: FILE_NAME, content: CONTENT });

    assert.equal(log.blobs.length, 1);
    assert.equal(log.blobs[0].options.type, CSV_MIME_TYPE);
    assert.equal(CSV_MIME_TYPE, 'text/csv;charset=utf-8');
    assert.deepEqual(log.blobs[0].parts, [CONTENT]);
    assert.equal(log.created[0], log.blobs[0]);
    assert.equal(log.anchors.length, 1);
    const [anchor] = log.anchors;
    assert.equal(anchor.tag, 'a');
    assert.equal(anchor.href, 'blob:fake/1');
    assert.equal(anchor.download, FILE_NAME);
    assert.equal(log.appended[0], anchor);
    assert.equal(anchor.clicks, 1);
    assert.equal(anchor.removed, true);
    assert.deepEqual(log.revoked, []);
    assert.equal(log.timers.length, 1);
    assert.equal(log.timers[0].delay, OBJECT_URL_REVOKE_DELAY_MS);
    log.timers[0].fn();
    assert.deepEqual(log.revoked, ['blob:fake/1']);
  });

  it('[H11-R5] la primera parte del Blob empieza con la marca BOM', async () => {
    const { env, log } = createFakeEnv();
    await createBrowserCsvDelivery(env).download({ fileName: FILE_NAME, content: CONTENT });
    assert.equal(log.blobs[0].parts[0].charCodeAt(0), 0xfeff);
  });

  it('[H11-R18] con canShare true comparte un File con el nombre y tipo del CSV y devuelve shared', async () => {
    const shared = [];
    const { env, log } = createFakeEnv({
      navigator: {
        canShare: ({ files }) => files.length === 1 && files[0].type === CSV_MIME_TYPE,
        async share(data) {
          shared.push(data);
        },
      },
    });
    const delivery = createBrowserCsvDelivery(env);

    assert.equal(delivery.canShare(), true);
    const outcome = await delivery.share({ fileName: FILE_NAME, content: CONTENT });

    assert.equal(outcome, 'shared');
    assert.equal(shared.length, 1);
    assert.equal(shared[0].files.length, 1);
    const [file] = shared[0].files;
    assert.equal(file.name, FILE_NAME);
    assert.equal(file.type, CSV_MIME_TYPE);
    assert.deepEqual(file.parts, [CONTENT]);
    assert.equal(log.blobs.length, 0);
  });

  it('[H11-R19] canShare es false sin navigator.canShare, si devuelve false, si lanza o sin entorno de navegador', () => {
    assert.equal(createBrowserCsvDelivery(createFakeEnv().env).canShare(), false);
    assert.equal(
      createBrowserCsvDelivery(createFakeEnv({ navigator: {} }).env).canShare(),
      false,
    );
    assert.equal(
      createBrowserCsvDelivery(createFakeEnv({ navigator: { canShare: () => false } }).env).canShare(),
      false,
    );
    assert.equal(
      createBrowserCsvDelivery(
        createFakeEnv({
          navigator: {
            canShare: () => {
              throw new Error('no soportado');
            },
          },
        }).env,
      ).canShare(),
      false,
    );
    const withoutEnv = createBrowserCsvDelivery(null);
    assert.equal(withoutEnv.canShare(), false);
  });

  it('[H11-R20] share devuelve cancelled ante AbortError y propaga otros errores', async () => {
    const abortError = new Error('El usuario canceló');
    abortError.name = 'AbortError';
    const cancelled = createBrowserCsvDelivery(
      createFakeEnv({
        navigator: {
          canShare: () => true,
          share: async () => {
            throw abortError;
          },
        },
      }).env,
    );
    assert.equal(await cancelled.share({ fileName: FILE_NAME, content: CONTENT }), 'cancelled');

    const failing = createBrowserCsvDelivery(
      createFakeEnv({
        navigator: {
          canShare: () => true,
          share: async () => {
            const error = new Error('denegado');
            error.name = 'NotAllowedError';
            throw error;
          },
        },
      }).env,
    );
    await assert.rejects(
      () => failing.share({ fileName: FILE_NAME, content: CONTENT }),
      { name: 'NotAllowedError' },
    );
  });

  it('[H11-R22] sin entorno de navegador download rechaza', async () => {
    await assert.rejects(() =>
      createBrowserCsvDelivery(null).download({ fileName: FILE_NAME, content: CONTENT }),
    );
  });

  it('[H11-R28] la entrega y la orquestación no usan red', () => {
    for (const file of ['csvDelivery.js', 'exportHistory.js', 'ExportHistoryPanel.jsx']) {
      const source = fs.readFileSync(
        new URL(`../../../src/features/export/${file}`, import.meta.url),
        'utf8',
      );
      for (const forbidden of ['fetch(', 'XMLHttpRequest', 'axios', 'sendBeacon', 'WebSocket']) {
        assert.equal(source.includes(forbidden), false, `${file} no debe contener ${forbidden}`);
      }
    }
  });
});
