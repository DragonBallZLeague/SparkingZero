/**
 * Builds dist/404.html, the SPA fallback GitHub Pages serves for any path that
 * is not a real file.
 *
 * Why this replaced a plain `cp dist/index.html dist/404.html`:
 *
 * That copy made the fallback the WEBSITE's bundle. GitHub Pages serves the
 * site-root 404.html for every unmatched path, including ones under a sub-app,
 * so a link to /SparkingZero/analyzer/characters/0620_00 loaded the website,
 * whose router (basename "/SparkingZero") has no such route, and rendered an
 * empty page. Every analyzer deep link and every share snippet would break the
 * moment someone pasted one into Discord.
 *
 * This script keeps the website's markup - so website deep links such as
 * /SparkingZero/teams/x/schedule keep working exactly as before, with no extra
 * redirect - and injects a small dispatcher into <head> that runs before the
 * website bundle. Paths belonging to a sub-app are stashed and redirected into
 * that sub-app; everything else falls through untouched.
 *
 * The sub-app then restores the original URL before its router mounts. See
 * packages/ui/src/deepLink.js.
 *
 * resolveRedirect() below is the single source of truth for the decision: it is
 * stringified into the page AND imported by scripts/verify-404.mjs, so the
 * tested function and the shipped function cannot drift apart.
 */
const fs = require('fs');
const path = require('path');

const BASE = '/SparkingZero/';

/**
 * Sub-apps that own a path segment under BASE. Every one of these must be
 * redirected into its own index.html rather than falling through to the
 * website, whose router cannot match them.
 *
 * Of these, only the ones with client-side routes need to restore the path
 * afterwards (analyzer, admin). The rest have no routes, so landing on their
 * root is the correct outcome.
 */
const APPS = ['analyzer', 'matchbuilder', 'calculator', 'admin', 'submit'];

const STORAGE_KEY = 'szl:deep-link';

/**
 * Decides where an unmatched path should be sent.
 *
 * Runs in the browser (stringified) and in Node (tests) - keep it dependency
 * free, ES5, and pure.
 *
 * @returns {string|null} the sub-app root to redirect to, or null to let the
 *   website SPA handle the path as it does today.
 */
function resolveRedirect(pathname, base, apps) {
  if (typeof pathname !== 'string' || pathname.indexOf(base) !== 0) return null;

  var rest = pathname.slice(base.length);
  if (!rest) return null;

  var segment = rest.split('/')[0];
  if (apps.indexOf(segment) === -1) return null;

  // A missing build asset should surface as a 404, not bounce the visitor to an
  // app root that will not show what they asked for.
  if (pathname.indexOf('/assets/') !== -1) return null;

  var appRoot = base + segment + '/';

  // Already at the app root means its index.html genuinely is missing;
  // redirecting again would loop.
  if (pathname === appRoot || pathname === base + segment) return null;

  return appRoot;
}

function buildDispatcherScript() {
  // The wrapper is deliberately tiny: all the logic lives in resolveRedirect so
  // the tests cover what actually ships.
  return [
    '<script>',
    '(function () {',
    '  var resolveRedirect = ' + resolveRedirect.toString() + ';',
    '  try {',
    '    var target = resolveRedirect(location.pathname, ' + JSON.stringify(BASE) + ', ' + JSON.stringify(APPS) + ');',
    '    if (!target) return;',
    '    try {',
    '      sessionStorage.setItem(' + JSON.stringify(STORAGE_KEY) + ', location.pathname + location.search + location.hash);',
    '    } catch (e) {',
    '      // Private mode or blocked storage: still redirect, just land on the',
    '      // app root instead of the exact deep link.',
    '    }',
    '    location.replace(target);',
    '  } catch (e) {',
    '    // Never let the dispatcher break the fallback page.',
    '  }',
    '})();',
    '</script>',
  ].join('\n');
}

function main() {
  const distDir = path.resolve(__dirname, '..', 'dist');
  const source = path.join(distDir, 'index.html');
  const output = path.join(distDir, '404.html');

  if (!fs.existsSync(source)) {
    console.error('build-404: ' + source + ' not found. Build the website first.');
    process.exit(1);
  }

  const html = fs.readFileSync(source, 'utf8');
  const script = buildDispatcherScript();

  // Inject immediately after <head> so it runs before the website's own bundle.
  const headMatch = html.match(/<head[^>]*>/i);
  if (!headMatch) {
    console.error('build-404: no <head> found in ' + source + '; cannot inject the dispatcher.');
    process.exit(1);
  }
  const at = headMatch.index + headMatch[0].length;
  const out = html.slice(0, at) + '\n' + script + html.slice(at);

  fs.writeFileSync(output, out, 'utf8');
  console.log('build-404: wrote ' + output + ' (dispatcher for: ' + APPS.join(', ') + ')');
}

module.exports = { resolveRedirect, buildDispatcherScript, BASE, APPS, STORAGE_KEY };

if (require.main === module) main();
