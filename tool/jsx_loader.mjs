import fs from 'node:fs';
import * as nodeModule from 'node:module';
import { fileURLToPath } from 'node:url';

function loadJsx(url, context, nextLoad) {
  if (url.endsWith('.jsx')) {
    const source = fs.readFileSync(fileURLToPath(url), 'utf8');
    return {
      format: 'module',
      shortCircuit: true,
      source,
    };
  }
  return nextLoad(url, context);
}

export async function load(url, context, nextLoad) {
  return loadJsx(url, context, nextLoad);
}

if (typeof nodeModule.registerHooks === 'function') {
  nodeModule.registerHooks({
    load: loadJsx,
  });
} else if (typeof nodeModule.register === 'function') {
  const inlineLoader = [
    "import fs from 'node:fs';",
    "import { fileURLToPath } from 'node:url';",
    'export async function load(url, context, nextLoad) {',
    "  if (url.endsWith('.jsx')) {",
    '    return {',
    "      format: 'module',",
    '      shortCircuit: true,',
    "      source: fs.readFileSync(fileURLToPath(url), 'utf8'),",
    '    };',
    '  }',
    '  return nextLoad(url, context);',
    '}',
  ].join('\n');
  nodeModule.register(
    `data:text/javascript,${encodeURIComponent(inlineLoader)}`,
    import.meta.url,
  );
}
