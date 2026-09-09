// Central URL scheme for the analyzer app (see docs/ANALYZER_REDESIGN_PLAN.md).
// Phase 1 only wires the router itself; these paths are consumed as real
// <Route> entries once each page is split out of App.jsx in later phases.
export const ROUTES = {
  home: '/',
  characters: '/characters',
  character: (charId) => `/characters/${encodeURIComponent(charId)}`,
  teams: '/teams',
  team: (teamSlug) => `/teams/${encodeURIComponent(teamSlug)}`,
  matches: '/matches',
  match: (matchId) => `/matches/${encodeURIComponent(matchId)}`,
  meta: '/meta',
  sandbox: '/sandbox',
};
