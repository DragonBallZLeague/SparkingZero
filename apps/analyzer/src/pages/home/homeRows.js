import { sortRows } from '../characters/characterRows.js';
import { STYLE_STATS } from '../characters/styleRows.js';
import { matchRow } from '../matches/matchRows.js';
import { compareMatchTime } from '../../utils/matchOrder.js';
import { isProvisionalTier, PROVISIONAL_BELOW_MATCHES } from '../../utils/performanceTier.js';

/**
 * Home's data: its curated boards, the latest week's results and the newest
 * test and event uploads ("Home dashboard" in the redesign plan). No React,
 * so a verifier can import it.
 */

// ---- the boards ----------------------------------------------------------------

/**
 * The curated boards: named top-5 lists a newcomer reads at a glance. Each is
 * a PRESET OVER THE ONE CHARACTERS TABLE, never a ranking of its own: a view
 * (the Styles view for a fighting style), a sort (none is the score) and
 * perhaps a position. Its link opens the table the same way, where the list
 * goes on, and its five are that table's first five SETTLED characters
 * (boardRows).
 *
 * The league's picks (2026-09-30): the three core fighting styles, by the
 * league's own words for them (a "spammer" throws blasts and ultimates out a
 * lot), then the best character in each position by score.
 */
export const BOARDS = [
  { key: 'brawlers', title: 'Top Brawlers', note: 'Melee: rush and heavy hits', view: 'styles', sort: 'melee' },
  { key: 'spammers', title: 'Top Spammers', note: 'Blasts and ultimates thrown', view: 'styles', sort: 'spam' },
  { key: 'tanks', title: 'Top Tanks', note: 'Defense rating: guards, counters, staying in', view: 'styles', sort: 'defense' },
  { key: 'starters', title: 'Best Starters', note: 'Score as the Starter', pos: '1' },
  { key: 'middles', title: 'Best Middles', note: 'Score in the Middle', pos: '2' },
  { key: 'anchors', title: 'Best Anchors', note: 'Score as the Anchor', pos: '3' },
];
export const BOARD_SIZE = 5;
/** A board's floor: the matches under which the table fades a character. */
export const BOARD_MIN_MATCHES = PROVISIONAL_BELOW_MATCHES;

/** The positions a board's pool is cut to, as `rowsForPositions` takes them. */
export const boardPositions = board => (board.pos ? [board.pos] : []);

/** Whether a board ranks fighting styles (its pool needs `withStyles`). */
export const isStyleBoard = board => board.view === 'styles';

/**
 * A board's five, from its pool: the Characters table's rows for its
 * positions, with their `styles` for a style board, in the table's order.
 *
 * Only characters with BOARD_MIN_MATCHES (5) or more there, the ones the
 * table does not fade (the league's rule, 2026-09-30): a 3-match character
 * does not take a place on a leaderboard. When fewer than five have that many
 * (a narrow scope, a rare position), the best of the rest fill the list after
 * them, faded as the table fades them.
 */
export function boardRows(pool, board) {
  const sorted = sortRows(pool, { sort: board.sort || 'score', dir: 'desc' }, isStyleBoard(board) ? STYLE_STATS : undefined);
  const settled = sorted.filter(r => !isProvisionalTier(r));
  if (settled.length >= BOARD_SIZE) return settled.slice(0, BOARD_SIZE);
  return [...settled, ...sorted.filter(r => isProvisionalTier(r))].slice(0, BOARD_SIZE);
}

/**
 * The Characters table's query string for a board: the scope's own params
 * (`scopeSearch`, "?seasonNumber=0&matchType=Season") plus its view, sort and
 * position, commas kept readable as everywhere else.
 */
export function boardSearch(board, scopeSearch = '') {
  const p = new URLSearchParams(scopeSearch);
  if (board.view) p.set('view', board.view);
  if (board.sort) p.set('sort', board.sort);
  if (board.pos) p.set('pos', board.pos);
  const s = p.toString().replace(/%2C/gi, ',');
  return s ? `?${s}` : '';
}

// ---- the latest week -----------------------------------------------------------

/**
 * A season match's week: its name up to the week number, so "S0 Week 10
 * Match 3" and "S0 Playoffs Quarter-Finals Week 2 Match 2 R1" are "S0 Week 10"
 * and "S0 Playoffs Quarter-Finals Week 2". Null for a name without one.
 */
export function weekOf(name) {
  const m = String(name || '').match(/^(.*?\bWeek \d+)(?!\d)/i);
  return m ? m[1] : null;
}

/** A week for people: "S0 Week 10" is "Season 0 · Week 10", "PS0 Week 2" is "Pre-season 0 · Week 2". */
export function weekLabel(week) {
  const m = String(week || '').match(/^(PS|S)(\d+)\s+(.+)$/i);
  if (!m) return week;
  return `${m[1].toUpperCase() === 'PS' ? 'Pre-season' : 'Season'} ${m[2]} · ${m[3]}`;
}

/**
 * The latest week of season matches among `rows` (the Matches list's rows,
 * newest first): { week, label, rows } with its matches in play order, or null
 * when the scope holds no season match (tests and events have no weeks).
 */
export function latestWeek(rows) {
  const season = (rows || []).filter(r => r.matchType === 'Season' && weekOf(r.name));
  if (!season.length) return null;
  const week = weekOf(season.slice().sort((a, b) => compareMatchTime(b.path, a.path))[0].name);
  return {
    week,
    label: weekLabel(week),
    rows: season.filter(r => weekOf(r.name) === week).sort((a, b) => compareMatchTime(a.path, b.path)),
  };
}

// ---- the newest uploads: tests and events -----------------------------------------

/**
 * Home's "Latest results" switch, in the URL as `latest=tests|events` (the
 * season week is the default): what each shows, and the match type its "All
 * ..." link opens the Matches list on.
 */
export const LATEST = [
  { key: 'season', label: 'Season' },
  { key: 'tests', label: 'Tests', matchType: 'Test', noun: 'tests', sub: 'Newest uploads, every team' },
  { key: 'events', label: 'Events', matchType: 'Event', noun: 'events', sub: 'Newest event matches' },
];
export const readLatest = params => (LATEST.some(l => l.key === params.get('latest')) ? params.get('latest') : 'season');

/** How many uploads show before "Show more". */
export const UPLOADS_SHOWN = 6;

/** A date's day where the viewer is ("2026-09-26"), for grouping. */
function dayKey(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * The Matches list's rows for the newest uploads of one `kind` ('tests' or
 * 'events'), from public/br-recent-uploads.json
 * (scripts/generate-recent-uploads.mjs), each with its `seasonNumber` and
 * `uploaded` (an ISO date, or null when the build had no git history to date
 * them by). Newest day first, and within a day in play order, so an event's
 * matches read Match 1 to 6 and a team's test in its order.
 */
export function recentRows(file, kind) {
  if (!file || !Array.isArray(file[kind])) return [];
  const rows = file[kind]
    .filter(t => t && t.path && t.summary)
    .map(t => ({
      ...matchRow(t.path, t.summary, t.tags),
      seasonNumber: t.tags && t.tags.seasonNumber != null ? String(t.tags.seasonNumber) : null,
      uploaded: file.dated ? t.uploaded || null : null,
    }));
  if (!file.dated) return rows;
  return rows.sort((a, b) => dayKey(b.uploaded).localeCompare(dayKey(a.uploaded)) || compareMatchTime(a.path, b.path));
}

/** An upload's day, for the list's dividers: "Sep 26" (with the year once it is not this one). */
export function uploadDay(iso, now = new Date()) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const opts = { month: 'short', day: 'numeric', ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : null) };
  return d.toLocaleDateString('en-US', opts);
}
