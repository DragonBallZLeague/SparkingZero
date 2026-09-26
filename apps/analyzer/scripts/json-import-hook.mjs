/**
 * Lets Node import the analyzer's source modules directly.
 *
 * App source does `import transformationsData from '.../transformations.json'`,
 * which Vite resolves but plain Node rejects without an `with { type: 'json' }`
 * attribute. Rather than add bundler-specific syntax to shipping code just to make
 * it testable, this hook teaches Node to load .json the way Vite does.
 *
 * Used by the verifier scripts that import real aggregation modules:
 *   node --import ./scripts/json-import-hook.mjs scripts/verify-filter-aggregated.mjs
 */
import { registerHooks } from 'module';
import fs from 'fs';
import { fileURLToPath } from 'url';

registerHooks({
  load(url, context, nextLoad) {
    if (url.startsWith('file:') && url.endsWith('.json')) {
      return {
        format: 'module',
        shortCircuit: true,
        source: 'export default ' + fs.readFileSync(fileURLToPath(url), 'utf8') + ';',
      };
    }
    return nextLoad(url, context);
  },
});
