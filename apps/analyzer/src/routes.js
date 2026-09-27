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
  match: (matchId) => `/matches/${encodeURIComponent(matchId)}`,
  tables: '/tables',
  meta: '/meta',
  sandbox: '/sandbox',
};

/**
 * Which route shows which of App's views.
 *
 * App still renders every view itself, switching on `viewType`; this table is
 * what makes that switch addressable, so a view can be linked to, refreshed and
 * shared instead of living only in component state. When the views become real
 * pages, the mapping is what they replace.
 *
 * Order matters: viewForPath takes the FIRST prefix match, so more specific
 * paths must come before less specific ones. '/' matches everything, so it is
 * last and acts as the fallback.
 */
export const VIEW_ROUTES = [
  { view: 'aggregated', path: ROUTES.characters },
  { view: 'teams', path: ROUTES.teams },
  { view: 'tables', path: ROUTES.tables },
  { view: 'meta', path: ROUTES.meta },
  { view: 'single', path: ROUTES.home },
];

/** The canonical path for one of App's view types. */
export function pathForView(view) {
  const entry = VIEW_ROUTES.find(r => r.view === view);
  return entry ? entry.path : ROUTES.home;
}

/**
 * Pathname -> view type. Accepts a pathname with or without the app's basename
 * already stripped, and tolerates a trailing slash.
 *
 * Unknown paths fall back to the home view rather than throwing, so a stale or
 * mistyped link still renders something.
 */
export function viewForPath(pathname) {
  if (typeof pathname !== 'string') return 'single';
  const clean = ('/' + pathname.replace(/^\/+|\/+$/g, '')).toLowerCase();
  for (const { view, path } of VIEW_ROUTES) {
    if (path === ROUTES.home) continue; // the fallback, handled below
    if (clean === path || clean.startsWith(path + '/')) return view;
  }
  return 'single';
}
