/**
 * Checks the site-root 404 dispatcher.
 *
 * It imports resolveRedirect() from scripts/build-404.js - the very function
 * that gets stringified into dist/404.html - so the behaviour asserted here is
 * the behaviour that ships. It also builds the dispatcher markup and sanity
 * checks it, and, when dist/404.html exists, confirms the built page really
 * carries the script and still contains the website's own markup.
 *
 * Usage: node scripts/verify-404.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { resolveRedirect, buildDispatcherScript, BASE, APPS } = require('./build-404.js');

let failures = 0;
function check(label, actual, expected) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log((ok ? '  ok   ' : '  FAIL ') + label +
    (ok ? '' : `\n         expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`));
}

const r = p => resolveRedirect(p, BASE, APPS);

console.log('Sub-app deep links must bounce into their own app:');
check('analyzer character deep link',
  r('/SparkingZero/analyzer/characters/0620_00'), '/SparkingZero/analyzer/');
check('analyzer match deep link (encoded path with .json)',
  r('/SparkingZero/analyzer/matches/Seasons%2FSeason%200%2FS0%20Week%201%20Match%201.json'),
  '/SparkingZero/analyzer/');
check('analyzer nested route',
  r('/SparkingZero/analyzer/teams/sentai'), '/SparkingZero/analyzer/');
check('admin route',
  r('/SparkingZero/admin/submissions'), '/SparkingZero/admin/');
check('calculator route',
  r('/SparkingZero/calculator/anything'), '/SparkingZero/calculator/');

console.log('\nWebsite paths must fall through so the website SPA handles them as today:');
check('website team schedule', r('/SparkingZero/teams/sentai/schedule'), null);
check('website rules section', r('/SparkingZero/rules/scoring'), null);
check('website root', r('/SparkingZero/'), null);
check('site root, no trailing slash', r('/SparkingZero'), null);

console.log('\nMust not redirect (would loop or hide a real 404):');
check('already at analyzer root', r('/SparkingZero/analyzer/'), null);
check('analyzer root without slash', r('/SparkingZero/analyzer'), null);
check('missing build asset', r('/SparkingZero/analyzer/assets/index-abc123.js'), null);
check('missing website asset', r('/SparkingZero/assets/main-abc.css'), null);
check('path outside the base', r('/somewhere/else'), null);
check('empty path', r(''), null);
check('non-string input', r(null), null);

console.log('\nAn app-name prefix must not be mistaken for the app:');
check('website page starting with an app name',
  r('/SparkingZero/analyzer-guide/intro'), null);

console.log('\nDispatcher markup:');
const script = buildDispatcherScript();
check('is a script tag', script.startsWith('<script>') && script.trim().endsWith('</script>'), true);
check('embeds resolveRedirect', script.includes('function resolveRedirect'), true);
check('embeds the base path', script.includes(JSON.stringify(BASE)), true);
check('redirects via location.replace', script.includes('location.replace'), true);
check('guards sessionStorage', script.includes('try {') && script.includes('catch'), true);

const built = path.resolve(__dirname, '..', 'dist', '404.html');
if (fs.existsSync(built)) {
  console.log('\nBuilt dist/404.html:');
  const html = fs.readFileSync(built, 'utf8');
  check('contains the dispatcher', html.includes('resolveRedirect'), true);
  check('dispatcher precedes the app bundle',
    html.indexOf('resolveRedirect') < html.indexOf('<script type="module"'), true);
  check('still contains the website root element', html.includes('id="root"'), true);
} else {
  console.log('\n(dist/404.html not built yet - skipping built-page checks)');
}

console.log();
if (failures) {
  console.error(`FAILED - ${failures} check(s)`);
  process.exit(1);
}
console.log('PASSED - 404 dispatcher routes every case correctly.');
