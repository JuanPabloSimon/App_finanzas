export const CSV_MIME_TYPE = 'text/csv;charset=utf-8';
export const OBJECT_URL_REVOKE_DELAY_MS = 10000;

const SHARE_PROBE_FILE_NAME = 'gestix.csv';

export function resolveBrowserEnv() {
  const scope = globalThis;
  if (
    typeof scope.Blob !== 'function' ||
    !scope.URL ||
    typeof scope.URL.createObjectURL !== 'function' ||
    !scope.document ||
    typeof scope.document.createElement !== 'function'
  ) {
    return null;
  }
  return Object.freeze({
    Blob: scope.Blob,
    File: typeof scope.File === 'function' ? scope.File : null,
    URL: scope.URL,
    document: scope.document,
    navigator: scope.navigator ?? null,
    setTimeout: scope.setTimeout.bind(scope),
  });
}

function isAbortError(error) {
  return error?.name === 'AbortError';
}

export function createBrowserCsvDelivery(env = resolveBrowserEnv()) {
  function canShare() {
    if (!env || typeof env.File !== 'function') {
      return false;
    }
    try {
      const probe = new env.File([''], SHARE_PROBE_FILE_NAME, { type: CSV_MIME_TYPE });
      return (
        typeof env.navigator?.canShare === 'function' &&
        env.navigator.canShare({ files: [probe] }) === true
      );
    } catch {
      return false;
    }
  }

  async function download({ fileName, content }) {
    if (!env) {
      throw new Error('La descarga solo está disponible en el navegador');
    }
    const blob = new env.Blob([content], { type: CSV_MIME_TYPE });
    const url = env.URL.createObjectURL(blob);
    const anchor = env.document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    env.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    // Revocar en el mismo tick cancela la descarga en Firefox y Safari.
    env.setTimeout(() => env.URL.revokeObjectURL(url), OBJECT_URL_REVOKE_DELAY_MS);
  }

  async function share({ fileName, content }) {
    if (!env || typeof env.File !== 'function' || typeof env.navigator?.share !== 'function') {
      throw new Error('Compartir archivos no está disponible en este navegador');
    }
    const file = new env.File([content], fileName, { type: CSV_MIME_TYPE });
    try {
      await env.navigator.share({ files: [file], title: fileName });
      return 'shared';
    } catch (error) {
      if (isAbortError(error)) {
        return 'cancelled';
      }
      throw error;
    }
  }

  return Object.freeze({ canShare, download, share });
}
