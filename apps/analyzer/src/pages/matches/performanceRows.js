import { calculateMatchPerformanceScore } from '../../utils/statCalculations.js';
import { combatEfficiency } from '../../utils/performanceScore.js';
import { compareMatchTime } from '../../utils/matchOrder.js';
import { slugifyCharacterName } from '../../utils/characterSlug.js';
import { POSITION_NAMES } from '../../utils/positions.js';
import { teamName, teamByTag } from '../../utils/teams.js';
import { matchName } from './matchRows.js';
import { transformCount } from '../../utils/transformation.js';

/**
 * The Performances table's data: one row per character per match in scope
 * (`/matches?view=performances`). No React, so a verifier can import it.
 *
 * The rows come from the character aggregation's match rows, so every figure
 * is the one the Character, Team and Match pages show, fusion split included
 * (utils/fusionSplit.js). The score is the match's own, as the Match page
 * gives it (calculateMatchPerformanceScore).
 */

const fmtInt = v => Math.round(v || 0).toLocaleString('en-US');
const fmtTime = v => { const s = Math.round(v || 0); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const rate = (hit, thrown) => (thrown > 0 ? hit / thrown : null);

/**
 * The column groups, in the order the switch shows them. They follow the
 * Match page's character detail: its headline figures, moves, then its
 * Attack, Defense and Mechanics lists, and the build.
 */
export const PERF_GROUPS = [
  { id: 'combat', label: 'Combat' },
  { id: 'moves', label: 'Moves' },
  { id: 'attack', label: 'Attack' },
  { id: 'defense', label: 'Defense' },
  { id: 'mechanics', label: 'Mechanics' },
  { id: 'build', label: 'Build' },
];

/**
 * A move's column: "hit/thrown", sorted and coloured by its hit rate (ties go
 * to more hits, so 5/5 ranks above 1/1). A match that never threw it has no
 * rate and shows "–"; a file from before hits were recorded shows the throws.
 */
const move = (key, label, short, hitKey, thrownKey) => ({
  key, group: 'moves', label, short, dir: 1,
  get: r => (r.m.hasAdditionalCounts ? rate(r.m[hitKey] || 0, r.m[thrownKey] || 0) : null),
  tie: r => r.m[hitKey] || 0,
  text: r => {
    const thrown = r.m[thrownKey] || 0;
    if (!thrown) return '–';
    return r.m.hasAdditionalCounts ? `${fmtInt(r.m[hitKey])}/${fmtInt(thrown)}` : `${fmtInt(thrown)} thrown`;
  },
});
const count = (key, group, label, short, field, dir = 0) => ({
  key, group, label, short, dir, get: r => r.m[field] || 0, fmt: fmtInt,
});

/**
 * Every stat column. `key` is what the URL's `sort` says, so it is part of
 * shared links and must not be renamed. `dir` is which way is better (1
 * higher, -1 lower, 0 neither: a count that is neither good nor bad in
 * itself, which never takes a rank colour). `get` returning null means the
 * figure does not exist for that match ("–", sorted last).
 */
export const PERF_STATS = [
  { key: 'dmg', group: 'combat', label: 'Damage', short: 'Dmg', dir: 1, get: r => r.m.damageDone || 0, fmt: fmtInt },
  { key: 'taken', group: 'combat', label: 'Taken', short: 'Taken', dir: -1, get: r => r.m.damageTaken || 0, fmt: fmtInt },
  { key: 'eff', group: 'combat', label: 'Efficiency', short: 'Eff', dir: 1, get: r => r.eff, fmt: v => `${v.toFixed(2)}×` },
  { key: 'dps', group: 'combat', label: 'Dmg / sec', short: 'DPS', dir: 1, get: r => r.dps, fmt: fmtInt },
  { key: 'time', group: 'combat', label: 'Time', short: 'Time', dir: 0, get: r => r.m.battleTime || 0, fmt: fmtTime },
  { key: 'hp', group: 'combat', label: 'HP left', short: 'HP', dir: 1, get: r => r.m.hPGaugeValue || 0, fmt: fmtInt },
  count('kos', 'combat', 'KOs', 'KOs', 'kills', 1),

  move('s1', 'Super 1', 'S1', 's1HitBlast', 's1Blast'),
  move('s2', 'Super 2', 'S2', 's2HitBlast', 's2Blast'),
  move('ult', 'Ultimate', 'Ult', 'uLTHitBlast', 'ultBlast'),
  count('skill1', 'moves', 'Skill 1', 'Sk1', 'exa1Count'),
  count('skill2', 'moves', 'Skill 2', 'Sk2', 'exa2Count'),
  count('ki', 'moves', 'Ki blasts', 'Ki', 'shotEnergyBulletCount'),

  count('rush', 'attack', 'Rush hits', 'Rush', 'rushHits', 1),
  count('heavy', 'attack', 'Heavy hits', 'Heavy', 'heavyHits', 1),
  count('throws', 'attack', 'Throws', 'Throws', 'throwCount'),
  { key: 'combo', group: 'attack', label: 'Best combo', short: 'Combo', dir: 1, get: r => r.m.maxComboNum || 0, fmt: v => `${fmtInt(v)} hits` },
  count('comboDmg', 'attack', 'Combo dmg', 'C.dmg', 'maxComboDamage', 1),

  count('guards', 'defense', 'Guards', 'Guard', 'guardCount'),
  count('superC', 'defense', 'Super counters', 'S.ctr', 'superCounterCount', 1),
  count('zC', 'defense', 'Z-counters', 'Z.ctr', 'zCounterCount', 1),
  count('revC', 'defense', 'Revenge counters', 'Rev', 'revengeCounterCount', 1),
  count('tags', 'defense', 'Tags', 'Tags', 'tags'),

  count('homing', 'mechanics', 'Dragon homing', 'Homing', 'dragonHomingCount'),
  count('vanish', 'mechanics', 'Vanishing', 'Vanish', 'vanishingAttackCount'),
  count('lightning', 'mechanics', 'Lightning', 'Light', 'lightningAttackCount'),
  {
    key: 'impact', group: 'mechanics', label: 'Speed impacts', short: 'Impact', dir: 1,
    get: r => r.m.speedImpactWins || 0, tie: r => -(r.m.speedImpactCount || 0),
    text: r => `${fmtInt(r.m.speedImpactWins)}/${fmtInt(r.m.speedImpactCount)}`,
  },
  count('sparking', 'mechanics', 'Sparking', 'Spark', 'sparkingCount'),
  count('charges', 'mechanics', 'Ki charges', 'Charge', 'chargeCount'),
  { key: 'dash', group: 'mechanics', label: 'Dash distance', short: 'Dash', dir: 0, get: r => Math.round(r.m.dragonDashMileage || 0), fmt: fmtInt },

  { key: 'cost', group: 'build', label: 'Cost', short: 'Cost', dir: 0, get: r => r.m.totalCapsuleCost || 0, fmt: fmtInt },
  // How many transformations the match holds (utils/transformation.js
  // transformCount(): its own form changes, a fusion included). The Build
  // group draws it beside the forms path, sorted by it (performanceColumns.jsx);
  // a compact table can pick it as a column of its own.
  {
    key: 'forms', group: 'build', label: 'Transformations', short: 'Trans', dir: 0, get: r => r.transforms, fmt: fmtInt,
    title: 'Transformations it made itself, a fusion included (form changes after a fusion are the fusion\'s)',
  },
];
export const perfStatByKey = key => PERF_STATS.find(s => s.key === key) || null;
export const statsOfGroup = group => PERF_STATS.filter(s => s.group === group);

/** The stats a compact table shows before anyone picks (a phone the first two, a tablet all four). */
export const DEFAULT_PHONE_STATS = ['dmg', 'eff', 'dps', 'hp'];

/**
 * Every performance in scope. `aggregated` is the character aggregation
 * (getAggregatedCharacterData); a row keeps its match row as `m`.
 */
export function performanceRows(aggregated) {
  const rows = [];
  for (const c of aggregated || []) {
    for (const m of c.matches || []) {
      rows.push({
        id: `${m.fileName}|${m.side}|${m.slot}`,
        name: c.name,
        charSlug: slugifyCharacterName(c.name),
        path: m.fileName,
        match: matchName(m.fileName),
        team: m.team || null,
        opponent: m.opponentTeam || null,
        side: m.side,
        slot: m.slot,
        position: Number(m.position) || null,
        won: !!m.won,
        map: m.map || null,
        ai: m.aiStrategy || null,
        build: (m.buildComposition && m.buildComposition.label) || 'No Build',
        forms: m.formChangeCount ? m.formChangeHistory : null,
        transforms: transformCount(m),
        score: calculateMatchPerformanceScore(m),
        eff: combatEfficiency(m.damageDone || 0, m.damageTaken || 0),
        dps: m.battleTime > 0 ? (m.damageDone || 0) / m.battleTime : 0,
        m,
      });
    }
  }
  // A character on both sides of one match (a team's test against itself)
  // needs its side in the Match page link, to open the right row.
  const seen = new Map();
  for (const r of rows) {
    const k = `${r.path}|${r.name}`;
    seen.set(k, (seen.get(k) || 0) + 1);
  }
  for (const r of rows) r.mirrored = seen.get(`${r.path}|${r.name}`) > 1;
  return sortPerformances(rows, { sort: 'match', dir: 'desc' });
}

/** The Match page link's extra params: which character's row to open. */
export const openParams = r => `open=${encodeURIComponent(r.charSlug)}${r.mirrored ? `&side=${r.side}` : ''}`;

// ---- URL params ----------------------------------------------------------------
// view=performances, cols=<group> | (combat), sort=<stat key | score | name | match>,
// dir=asc | desc, and the chips: char=<slug,...>, for=<team slug,...>, pos=1,3, res=won | lost

export const readPerfGroup = params => {
  const g = params.get('cols');
  return PERF_GROUPS.some(x => x.id === g) ? g : 'combat';
};

export function readPerfSort(params) {
  const key = params.get('sort');
  const valid = key === 'name' || key === 'score' || key === 'match' || !!perfStatByKey(key);
  const sort = valid ? key : 'match';
  const byDefault = sort === 'name' ? 'asc' : 'desc';
  const dir = params.get('dir') === 'asc' ? 'asc' : params.get('dir') === 'desc' ? 'desc' : byDefault;
  return { sort, dir };
}

const list = (params, key) => [...new Set((params.get(key) || '').split(',').map(s => s.trim()).filter(Boolean))];

export function readPerfFilters(params) {
  const pos = list(params, 'pos').filter(p => POSITION_NAMES[p]).sort();
  const res = params.get('res');
  return {
    chars: list(params, 'char'),
    teams: list(params, 'for'),
    positions: pos.length === 3 ? [] : pos,
    result: res === 'won' || res === 'lost' ? res : null,
  };
}

/** The chips' filters: OR within a chip, AND between chips. */
export function filterPerformances(rows, f) {
  let out = rows;
  if (f.chars.length) out = out.filter(r => f.chars.includes(r.charSlug));
  if (f.teams.length) out = out.filter(r => r.team && f.teams.includes(teamByTag(r.team).slug));
  if (f.positions.length) out = out.filter(r => f.positions.includes(String(r.position)));
  if (f.result) out = out.filter(r => r.won === (f.result === 'won'));
  return out;
}

/** A search over the rows: the character, its team and the opponent (either name), the match, the map, the build, the AI strategy. */
export function performanceMatchesQuery(r, q) {
  if (!q) return true;
  return [r.name, r.team, teamName(r.team), r.opponent, teamName(r.opponent), r.match, r.map, r.build, r.ai]
    .some(v => String(v || '').toLowerCase().includes(q));
}

/**
 * Sorted by one column; ties, and the default, go newest match first, then
 * side and lineup order, as the Match page lists them. A figure a match does
 * not have (null) sorts last either way.
 */
export function sortPerformances(rows, { sort, dir }) {
  const sign = dir === 'asc' ? 1 : -1;
  // Each match's place in time, worked out once per match rather than per comparison.
  const order = new Map([...new Set(rows.map(r => r.path))].sort(compareMatchTime).map((p, i) => [p, i]));
  const newest = (a, b) => order.get(b.path) - order.get(a.path) || a.side - b.side || a.slot - b.slot;
  if (sort === 'match') return [...rows].sort((a, b) => (dir === 'asc' ? -newest(a, b) : newest(a, b)));
  if (sort === 'name') return [...rows].sort((a, b) => sign * a.name.localeCompare(b.name) || newest(a, b));
  const stat = sort === 'score' ? { get: r => r.score } : perfStatByKey(sort);
  // Each value read once: a sort compares every row many times over.
  const keyed = rows.map(r => ({ r, v: stat.get(r), t: stat.tie ? stat.tie(r) : 0 }));
  keyed.sort((a, b) => {
    if (a.v === null || b.v === null) return (a.v === null) - (b.v === null) || newest(a.r, b.r);
    return sign * (a.v - b.v) || sign * (a.t - b.t) || newest(a.r, b.r);
  });
  return keyed.map(k => k.r);
}
