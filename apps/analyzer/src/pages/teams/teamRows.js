import { teamByTag, teamName } from '../../utils/teams.js';
import { positionSlot } from '../../utils/positions.js';
import { compareMatchTime } from '../../utils/matchOrder.js';

/**
 * The Teams table's and Team page's data. No React, so a verifier can import it.
 *
 * A team's figures are its TOP 5's: the five characters with the best score
 * over the team's matches, the way the league reads a team (it breaks
 * in-season ties on the top 5's average damage). getTeamAggregatedData()
 * picks the five and computes the figures; `top5` names them, so the Roster
 * can mark them. The record, match time and characters used are the whole
 * team's.
 */

const fmtInt = v => Math.round(v || 0).toLocaleString('en-US');
const fmtPct = v => `${Math.round(v || 0)}%`;
export const mmss = s => { const t = Math.round(s || 0); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

/** One team's row, from its getTeamAggregatedData() entry. */
export function teamRow(t) {
  const team = teamByTag(t.teamName);
  const top5 = t.top5CharacterNames || [];
  const avgs = t.characterAverages || {};
  return {
    tag: t.teamName,
    name: team.name,
    slug: team.slug,
    matches: t.matches || 0,
    wins: t.wins || 0,
    losses: t.losses || 0,
    win: t.winRate || 0,
    // The top 5's per-match figures, summed over the five.
    dmg: t.avgDamagePerMatch || 0,
    taken: t.avgDamageTakenPerMatch || 0,
    eff: t.top5Efficiency || 0,
    dps: t.top5DPS || 0,
    hp: t.avgHealthRetention || 0,
    hpLeft: t.top5AvgHPRemaining || 0,   // per character
    tags: top5.reduce((s, n) => s + ((avgs[n] && avgs[n].avgTags) || 0), 0),
    tagsTotal: t.top5TotalTags || 0,
    // The whole team's.
    time: t.top5AvgMatchDuration || 0,
    chars: t.uniqueCharactersUsed || 0,
    top5,
    source: t,
  };
}

export const teamRows = teamAggregated => (teamAggregated || []).filter(t => t.teamName).map(teamRow);

/**
 * The stat columns, in table order. `key` is what the URL's `sort` says, so it
 * is part of shared links. `dir` is which way is better (0: neither - no colour
 * and no rank). `sub` is a tile's second figure.
 * WIN % LEADS here: it is a team measure (the league's rule, "Settled on the
 * demo" in the redesign plan), unlike on character and build views.
 */
export const TEAM_STATS = [
  { key: 'win', label: 'Win %', short: 'Win', get: r => r.win, fmt: fmtPct, dir: 1 },
  { key: 'dmg', label: 'Avg damage', short: 'Dmg', get: r => r.dmg, fmt: fmtInt, dir: 1 },
  { key: 'taken', label: 'Avg taken', short: 'Taken', get: r => r.taken, fmt: fmtInt, dir: -1 },
  { key: 'eff', label: 'Efficiency', short: 'Eff', get: r => r.eff, fmt: v => `${v.toFixed(2)}×`, dir: 1 },
  { key: 'dps', label: 'DPS', short: 'DPS', tile: 'Damage / sec', get: r => r.dps, fmt: fmtInt, dir: 1 },
  { key: 'hp', label: 'HP kept', short: 'HP', get: r => r.hp, fmt: fmtPct, dir: 1, sub: r => `${fmtInt(r.hpLeft)} left` },
  { key: 'time', label: 'Avg time', short: 'Time', tile: 'Avg match time', get: r => r.time, fmt: mmss, dir: 0 },
  { key: 'tags', label: 'Avg tags', short: 'Tags', get: r => r.tags, fmt: v => v.toFixed(1), dir: 0, sub: r => `${r.tagsTotal} total` },
  { key: 'chars', label: 'Characters', short: 'Chars', get: r => r.chars, fmt: v => v, dir: 0 },
];
export const teamStatByKey = key => TEAM_STATS.find(s => s.key === key) || null;

/** sort=<stat key | name>, dir=asc | (desc). Win % high first by default. */
export function readTeamSort(params) {
  const key = params.get('sort');
  const sort = key === 'name' || teamStatByKey(key) ? key : 'win';
  const dir = params.get('dir') === 'asc' ? 'asc' : params.get('dir') === 'desc' ? 'desc' : (sort === 'name' ? 'asc' : 'desc');
  return { sort, dir };
}

/** Ties go to the top 5's average damage: the league's own tie-breaker. */
export function sortTeams(rows, { sort, dir }) {
  const sign = dir === 'asc' ? 1 : -1;
  const stat = teamStatByKey(sort);
  return [...rows].sort((a, b) => {
    if (sort === 'name') return sign * a.name.localeCompare(b.name);
    return sign * (stat.get(a) - stat.get(b)) || b.win - a.win || b.dmg - a.dmg;
  });
}

// ---- the Team page -----------------------------------------------------------

/** The Team page's tabs, in order. `tab=` in the URL; Roster is the default. */
export const TEAM_TABS = [
  { id: 'roster', label: 'Roster' },
  { id: 'lineups', label: 'Lineups' },
  { id: 'opponents', label: 'Opponents' },
  { id: 'matches', label: 'Matches' },
];
export const readTeamTab = params => (TEAM_TABS.some(t => t.id === params.get('tab')) ? params.get('tab') : 'roster');

/** A match file's two team tags. */
export function fileTeams(file) {
  const c = file && file.content;
  const t = c && ((c.TeamBattleResults && c.TeamBattleResults.teams) || c.teams);
  return Array.isArray(t) ? t : [];
}

/**
 * The team against each opponent: its row over only the matches between the
 * two, from the same aggregation as its overall row (`aggregate(files)` is
 * getTeamAggregatedData with the app's maps), so a head-to-head figure means
 * what the overall one does. The team's tests against itself are left out:
 * both lineups are its own, so its figures there say nothing.
 *
 * Each row is a teamRow() plus `opp`, the opponent's tag.
 */
export function opponentRows(files, tag, aggregate) {
  const byOpp = new Map();
  for (const f of files || []) {
    if (!f || f.error) continue;
    const [a, b] = fileTeams(f);
    if (a !== tag && b !== tag) continue;
    const opp = a === tag ? b : a;
    if (!opp || opp === tag) continue;
    if (!byOpp.has(opp)) byOpp.set(opp, []);
    byOpp.get(opp).push(f);
  }
  const rows = [];
  for (const [opp, fs] of byOpp) {
    const t = aggregate(fs).find(x => x.teamName === tag);
    if (t) rows.push({ ...teamRow(t), opp });
  }
  return rows;
}

/** The `vs` param -> an opponent's tag among `tags`, or null (every opponent). */
export function readVs(params, tags) {
  const p = String(params.get('vs') || '').toLowerCase();
  if (!p) return null;
  return (tags || []).find(t => teamByTag(t).slug === p || t.toLowerCase() === p) || null;
}

/**
 * The team's roster: every character it fielded, from the same team entry as
 * the figures (its getTeamAggregatedData() `characterAverages`), so the five
 * with the best scores here are exactly the five the figures use, and their
 * average damage adds up to the team's. For a head-to-head, pass that
 * opponent row's `source`.
 *
 * Each row agrees with the leaderboard cut to this team, fusion partners
 * included: both apply the fusion rule (utils/fusionSplit.js).
 *
 * `positions` counts how often each played Starter / Middle / Anchor.
 */
export function rosterRows(source) {
  return Object.entries((source && source.characterAverages) || {}).map(([name, a]) => {
    const ms = a.rawMatches || [];
    const positions = { 1: 0, 2: 0, 3: 0 };
    for (const m of ms) {
      const slot = positionSlot(m.position);
      if (slot) positions[slot]++;
    }
    return {
      name,
      combatPerformanceScore: a.performanceScore || 0,
      matchCount: a.matchesPlayed || 0,
      activeMatchCount: a.activeMatchesPlayed || 0,
      avgDamage: a.avgDamageDealt || 0,
      efficiency: a.avgDamageEfficiency || 0,
      winRate: ms.length ? (ms.filter(m => m.won).length / ms.length) * 100 : 0,
      positions,
    };
  });
}

/** A match's display name: its file name without folders or extension. */
export const matchName = fileName => String(fileName || '').split('/').pop().replace(/\.json$/i, '');

const bySlot = (a, b) => (a.slot ?? 99) - (b.slot ?? 99) || (a.position ?? 9) - (b.position ?? 9);

/**
 * Each match the team played, newest first (utils/matchOrder.js), with both
 * lineups in order, Starter first: `us` and `them`, the characters' own
 * per-match rows (build, AI, damage). Lined up slot by slot, they show who
 * faced whom. With `vs`, only the matches against that opponent.
 *
 * In a test against itself both lineups are the team's; the file's first side
 * is `us`.
 */
export function teamLineups(characters, tag, vs = null) {
  const byFile = new Map();
  for (const r of characters || []) {
    for (const m of r.matches || []) {
      if (!m.fileName || (m.team !== tag && m.opponentTeam !== tag)) continue;
      // A fusion partner the file left out holds no slot (utils/fusionSplit.js withAbsorbedPartners).
      if (m.unrecorded) continue;
      const mirror = m.team === tag && m.opponentTeam === tag;
      const opp = m.team === tag ? m.opponentTeam : m.team;
      if (vs && opp !== vs) continue;
      const side = mirror ? (m.side === 2 ? 'them' : 'us') : (m.team === tag ? 'us' : 'them');
      if (!byFile.has(m.fileName)) byFile.set(m.fileName, { us: [], them: [], opponent: opp, mirror });
      byFile.get(m.fileName)[side].push({ name: r.name, ...m });
    }
  }
  return [...byFile.keys()].sort((a, b) => compareMatchTime(b, a)).map(fileName => {
    const l = byFile.get(fileName);
    l.us.sort(bySlot);
    l.them.sort(bySlot);
    return { fileName, name: matchName(fileName), opponent: l.opponent, mirror: l.mirror, won: l.us.some(s => s.won), us: l.us, them: l.them };
  }).filter(l => l.us.length);
}

/**
 * The team's matches, newest first, from its getTeamAggregatedData() entry;
 * with `vs`, only those against that opponent. A test against itself is
 * listed once.
 */
export function teamMatchList(source, vs = null) {
  const seen = new Set();
  return (source && source.matchHistory ? source.matchHistory : [])
    .filter(m => (!vs || m.opponent === vs) && !seen.has(m.fileName) && seen.add(m.fileName))
    .sort((a, b) => compareMatchTime(b.fileName, a.fileName));
}

/** A search over lineups: the match, the opponent or any character on either side. */
export function lineupMatchesQuery(l, q) {
  if (!q) return true;
  const hay = [l.name, teamName(l.opponent), ...l.us.map(s => s.name), ...l.them.map(s => s.name)];
  return hay.some(s => String(s || '').toLowerCase().includes(q));
}

/** A search over the match list: the match or the opponent. */
export const matchMatchesQuery = (m, q) => !q || [matchName(m.fileName), teamName(m.opponent)].some(s => s.toLowerCase().includes(q));
