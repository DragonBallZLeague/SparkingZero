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
import { ROUTES, VIEW_ROUTES, REDIRECTS, pathForView, viewForPath, isSandboxPath } from '../src/routes.js';

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
check('/tables is no view (the page was removed)', VIEW_ROUTES.some(r => r.path === '/tables'), false);
check('/tables redirects to the Characters table', (REDIRECTS.find(r => r.from === ROUTES.tables) || {}).to, ROUTES.characters);
check('meta', viewForPath('/meta'), 'meta');
check('root is Home', viewForPath('/'), 'home');
check('matches (the list)', viewForPath('/matches'), 'matches');
check('match slug deep link', viewForPath('/matches/s0-week-3-match-5'), 'matches');
check('match path deep link (the alias)', viewForPath('/matches/' + encodeURIComponent('Seasons/Season 0/x.json')), 'matches');

console.log('\nA prefix must not be mistaken for the section:');
// '/charactersomething' starts with '/characters' as a STRING but is not inside
// that section; only an exact match or a '/' boundary counts.
check('near-miss path', viewForPath('/charactersomething'), 'home');
check('near-miss with segment', viewForPath('/teamsy/x'), 'home');

console.log('\nUnknown and malformed input falls back rather than throwing:');
check('unknown path', viewForPath('/nope'), 'home');
check('empty string', viewForPath(''), 'home');
check('no leading slash', viewForPath('meta'), 'meta');
check('non-string', viewForPath(null), 'home');
check('undefined', viewForPath(undefined), 'home');
check('unknown view falls back to home', pathForView('__nope__'), ROUTES.home);

console.log('\nThe Sandbox runs the same views under /sandbox:');
check('sandbox landing is the Matches list', viewForPath('/sandbox'), 'matches');
check('sandbox match', viewForPath('/sandbox/matches/os0-budokai-test-1'), 'matches');
check('sandbox characters', viewForPath('/sandbox/characters'), 'aggregated');
check('sandbox teams, trailing slash', viewForPath('/sandbox/teams/'), 'teams');
check('sandbox unknown falls back to its landing', viewForPath('/sandbox/nope'), 'matches');
check('is a sandbox path', isSandboxPath('/sandbox/meta'), true);
check('a prefix is not the sandbox', isSandboxPath('/sandboxes'), false);
check('a league path is not the sandbox', isSandboxPath('/characters'), false);
for (const { view } of VIEW_ROUTES) {
  if (view === 'home') continue; // the Sandbox has no Home
  const p = pathForView(view, { sandbox: true });
  check('sandbox ' + view + ' -> ' + p + ' -> ' + viewForPath(p), viewForPath(p), view);
}

console.log('\nBuilders produce clean, single-segment URLs:');
check('character', ROUTES.character('android-13'), '/characters/android-13');
check('character with an id', ROUTES.character('0620_00'), '/characters/0620_00');
check('team slug', ROUTES.team('master-and-student'), '/teams/master-and-student');
check('match slug', ROUTES.match('s0-week-3-match-5'), '/matches/s0-week-3-match-5');
// The path alias has spaces and slashes, so it MUST encode to a single segment
// or the router would read it as nested routes.
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
