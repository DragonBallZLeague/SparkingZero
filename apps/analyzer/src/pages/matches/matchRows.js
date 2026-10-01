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
    if (s) rows.push(matchRow(f.name, s, f.tags, urlKeyFor));
  }
  return rows.sort((a, b) => compareMatchTime(b.path, a.path));
}

/**
 * One row from a match's matchSummary() and tags. Home's newest uploads
 * (public/br-recent-uploads.json) ship summaries made at build time,
 * so its rows come through here too.
 */
export function matchRow(path, summary, tags = {}, urlKeyFor = p => p) {
  const t = tags || {};
  return {
    path,
    key: urlKeyFor(path),
    name: matchName(path),
    ...summary,
    size: t.matchSize || `${summary.size}v${summary.size}`,
    difficulty: t.difficulty || null,
    matchType: t.matchType || null,
    seasonPhase: t.seasonPhase || null,
  };
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
