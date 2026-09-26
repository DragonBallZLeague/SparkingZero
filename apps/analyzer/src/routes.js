// Central URL scheme for the analyzer app (see docs/ANALYZER_REDESIGN_PLAN.md).
// Phase 1 only wires the router itself; these paths are consumed as real
// <Route> entries once each page is split out of App.jsx in later phases.
//
// Path builders only — no data lookups, so this module stays dependency-free and
// safe to import anywhere. Turning a character id into the slug these URLs want
// is utils/characterSlug.js' job (characterUrlKey / resolveCharacterParam).
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
  meta: '/meta',
  sandbox: '/sandbox',
};
