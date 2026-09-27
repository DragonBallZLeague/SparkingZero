/**
 * Checks the URL scheme in src/routes.js.
 *
 * routes.js went from dead code to load-bearing: main.jsx builds its <Route>
 * entries from it, and App derives which view to render from the pathname
 * through viewForPath(). A mistake here does not crash - it quietly shows the
 * wrong view, or makes a shared link land somewhere unexpected, which is exactly
 * the class of bug nobody notices until someone pastes a link in Discord.
 *
 * Cheap enough (no data, no I/O) to run in prebuild.
 *
 * Usage: node scripts/verify-routes.mjs
 */
import { ROUTES, VIEW_ROUTES, pathForView, viewForPath } from '../src/routes.js';

let failures = 0;
function check(label, actual, expected) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log((ok ? '  ok   ' : '  FAIL ') + label +
    (ok ? '' : `\n         expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`));
}

console.log('Every view round-trips through its path:');
for (const { view } of VIEW_ROUTES) {
  check(view + ' -> ' + pathForView(view) + ' -> ' + viewForPath(pathForView(view)),
    viewForPath(pathForView(view)), view);
}

console.log('\nView paths are distinct (two views cannot share a URL):');
const paths = VIEW_ROUTES.map(r => r.path);
check('all ' + paths.length + ' paths unique', new Set(paths).size, paths.length);
const views = VIEW_ROUTES.map(r => r.view);
check('all ' + views.length + ' views unique', new Set(views).size, views.length);

console.log('\nCharacter deep links resolve to the character view:');
check('slug deep link', viewForPath('/characters/android-13'), 'aggregated');
check('raw id deep link', viewForPath('/characters/0620_00'), 'aggregated');
check('bare characters path', viewForPath('/characters'), 'aggregated');
check('trailing slash', viewForPath('/characters/'), 'aggregated');
check('mixed case', viewForPath('/Characters/Android-13'), 'aggregated');

console.log('\nOther sections:');
check('teams', viewForPath('/teams'), 'teams');
check('team deep link', viewForPath('/teams/sentai'), 'teams');
check('tables', viewForPath('/tables'), 'tables');
check('meta', viewForPath('/meta'), 'meta');
check('root', viewForPath('/'), 'single');

console.log('\nA prefix must not be mistaken for the section:');
// '/charactersomething' starts with '/characters' as a STRING but is not inside
// that section; only an exact match or a '/' boundary counts.
check('near-miss path', viewForPath('/charactersomething'), 'single');
check('near-miss with segment', viewForPath('/teamsy/x'), 'single');

console.log('\nUnknown and malformed input falls back rather than throwing:');
check('unknown path', viewForPath('/nope'), 'single');
check('empty string', viewForPath(''), 'single');
check('no leading slash', viewForPath('meta'), 'meta');
check('non-string', viewForPath(null), 'single');
check('undefined', viewForPath(undefined), 'single');
check('unknown view falls back to home', pathForView('__nope__'), ROUTES.home);

console.log('\nBuilders produce clean, single-segment URLs:');
check('character', ROUTES.character('android-13'), '/characters/android-13');
check('character with an id', ROUTES.character('0620_00'), '/characters/0620_00');
check('team slug', ROUTES.team('master-and-student'), '/teams/master-and-student');
// A match id is a relative file path with spaces and slashes, so it MUST encode
// to a single segment or the router would read it as nested routes.
const matchPath = ROUTES.match('Seasons/Season 0/S0 Week 1 Match 1.json');
check('match id encodes to one segment', matchPath.split('/').length, 3);
check('match id has no raw spaces', matchPath.includes(' '), false);
check('match id round-trips',
  decodeURIComponent(matchPath.replace('/matches/', '')),
  'Seasons/Season 0/S0 Week 1 Match 1.json');

console.log();
if (failures) {
  console.error(`FAILED - ${failures} check(s). The URL scheme is broken.`);
  process.exit(1);
}
console.log('PASSED - URL scheme maps every route to the right view.');
