import { matchSummary } from '../../utils/matchRecord.js';
import { compareMatchTime } from '../../utils/matchOrder.js';
import { teamName } from '../../utils/teams.js';

/**
 * The Matches list's data. No React, so a verifier can import it.
 *
 * One row per match in scope, newest first (utils/matchOrder.js): its name,
 * both teams with each lineup Starter first, who won, the map, the size and
 * the difficulty. `files` are the scope's matches as App loads them
 * ({ name, content, tags }); `urlKeyFor(path)` is what the match's link
 * carries (utils/matchSlug.js).
 */

/** A match's display name: its file name without folders or extension. */
export const matchName = path => String(path || '').split('/').pop().replace(/\.json$/i, '');

export function matchRows(files, { charMap = {}, mapsMap = {}, urlKeyFor = p => p } = {}) {
  const rows = [];
  for (const f of files || []) {
    if (!f || f.error || !f.content) continue;
    const s = matchSummary(f.content, { charMap, mapsMap });
    if (!s) continue;
    const tags = f.tags || {};
    rows.push({
      path: f.name,
      key: urlKeyFor(f.name),
      name: matchName(f.name),
      ...s,
      size: tags.matchSize || `${s.size}v${s.size}`,
      difficulty: tags.difficulty || null,
      matchType: tags.matchType || null,
      seasonPhase: tags.seasonPhase || null,
    });
  }
  return rows.sort((a, b) => compareMatchTime(b.path, a.path));
}

/** The view switch: `view=performances` in the URL; the match list is the default. */
export const readMatchesView = params => (params.get('view') === 'performances' ? 'performances' : 'matches');

/** A search over the list: the match, either team, any character, the map. */
export function matchRowMatchesQuery(row, q) {
  if (!q) return true;
  const hay = [row.name, row.map];
  for (const s of row.sides) {
    hay.push(s.tag, teamName(s.tag));
    for (const c of s.lineup) hay.push(c.name);
  }
  return hay.some(v => String(v || '').toLowerCase().includes(q));
}
