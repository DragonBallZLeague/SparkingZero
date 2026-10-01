// Central URL scheme for the analyzer app (see docs/ANALYZER_REDESIGN_PLAN.md).
//
// Path builders and the view mapping live here so there is one definition of the
// URL scheme. Deliberately dependency-free - no router, no data lookups - so it
// is safe to import from anywhere, including build scripts.
//
// Turning a character id into the slug these URLs want is utils/characterSlug.js'
// job (characterUrlKey / resolveCharacterParam).

export const ROUTES = {
  home: '/',
  characters: '/characters',

  // Takes the URL KEY, not a raw id: the name slug ('android-13'), which
  // characterUrlKey(id, index) produces. Deep links are shared in Discord, so the
  // URL has to be legible to whoever receives it — '0620_00' means nothing, and
  // it is Android 13. A raw id is still accepted when resolving (see
  // resolveCharacterParam), so old links and characters not yet in
  // characters.csv keep working.
  character: (charUrlKey) => `/characters/${encodeURIComponent(charUrlKey)}`,

  teams: '/teams',
  team: (teamSlug) => `/teams/${encodeURIComponent(teamSlug)}`,
  matches: '/matches',
  // Takes the URL KEY: the match file's name as a slug ('s0-week-3-match-5'),
  // which matchUrlKey(path, index) in utils/matchSlug.js produces. The file's
  // path is still accepted when resolving.
  match: (matchKey) => `/matches/${encodeURIComponent(matchKey)}`,
  // No page any more: it redirects (REDIRECTS below).
  tables: '/tables',
  meta: '/meta',
  sandbox: '/sandbox',
};

/**
 * Which route shows which of App's views.
 *
 * App still renders most views itself, switching on `viewType`; this table is
 * what makes that switch addressable, so a view can be linked to, refreshed and
 * shared instead of living only in component state. When the views become real
 * pages, the mapping is what they replace.
 *
 * Since the shell rebuild (2026-09-28) Home is its own view. /matches is the
 * Matches list and /matches/<slug> one match (2026-09-29); they replaced the
 * single-match viewer, which used to BE the home page.
 *
 * Order matters: viewForPath takes the FIRST prefix match, so more specific
 * paths must come before less specific ones. '/' matches everything, so it is
 * last and acts as the fallback.
 */
export const VIEW_ROUTES = [
  { view: 'aggregated', path: ROUTES.characters },
  { view: 'teams', path: ROUTES.teams },
  { view: 'matches', path: ROUTES.matches },
  { view: 'meta', path: ROUTES.meta },
  { view: 'home', path: ROUTES.home },
];

/**
 * Old paths that now land somewhere else, keeping the query string (the
 * scope). The Data Tables page was removed on 2026-09-29: its two tables are
 * the Characters table and the Performances view, and the scope bar's workbook
 * holds everything it had (with its Position, AI Strategies and Capsules
 * sheets). Links to it land on the Characters table.
 */
export const REDIRECTS = [
  { from: ROUTES.tables, to: ROUTES.characters },
];

const cleanPath = pathname => ('/' + pathname.replace(/^\/+|\/+$/g, '')).toLowerCase();

/**
 * Whether a pathname is inside the Sandbox. The Sandbox runs the same views over
 * uploaded files, under its own prefix (/sandbox, /sandbox/characters, ...), so
 * App derives the data source - league corpus or uploads - from the URL too.
 */
export function isSandboxPath(pathname) {
  if (typeof pathname !== 'string') return false;
  const clean = cleanPath(pathname);
  return clean === ROUTES.sandbox || clean.startsWith(ROUTES.sandbox + '/');
}

/**
 * The canonical path for one of App's view types. In the Sandbox the same view
 * sits under /sandbox; the Sandbox's own landing is the Matches list, of the
 * uploads.
 */
export function pathForView(view, { sandbox = false } = {}) {
  const entry = VIEW_ROUTES.find(r => r.view === view);
  const path = entry ? entry.path : ROUTES.home;
  if (!sandbox) return path;
  return path === ROUTES.home || view === 'matches' ? ROUTES.sandbox : ROUTES.sandbox + path;
}

/**
 * Pathname -> view type. Accepts a pathname with or without the app's basename
 * already stripped, and tolerates a trailing slash.
 *
 * Unknown paths fall back to the home view rather than throwing, so a stale or
 * mistyped link still renders something. Inside the Sandbox the fallback is its
 * landing view, 'matches'.
 */
export function viewForPath(pathname) {
  if (typeof pathname !== 'string') return 'home';
  let clean = cleanPath(pathname);
  const sandbox = isSandboxPath(clean);
  if (sandbox) clean = cleanPath(clean.slice(ROUTES.sandbox.length));
  for (const { view, path } of VIEW_ROUTES) {
    if (path === ROUTES.home) continue; // the fallback, handled below
    if (clean === path || clean.startsWith(path + '/')) return view;
  }
  return sandbox ? 'matches' : 'home';
}
