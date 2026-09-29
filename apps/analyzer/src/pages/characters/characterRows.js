import { filterAggregatedData } from '../../utils/aggregation/filterAggregated.js';
import { tierMatchCount, isProvisionalTier, fadesThinSamples } from '../../utils/performanceTier.js';
import { POSITION_NAMES } from '../../utils/positions.js';

/**
 * The Characters page's data: its columns, its URL params, and the rows for a
 * choice of positions. No React, so a verifier can import it.
 */

const fmtInt = v => Math.round(v || 0).toLocaleString('en-US');
const fmtPct = v => `${Math.round(v || 0)}%`;
const fmtTime = v => { const s = Math.round(v || 0); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

/**
 * The stat columns, in table order. `key` is what the URL's `sort` says, so it
 * is part of every shared link and must not be renamed. `dir` is which way is
 * better (1 higher, -1 lower, 0 neither: raw counts and time, which never take
 * a rank colour).
 *
 * WIN % IS LAST ON PURPOSE, and never a default phone column. One character's
 * win % mostly reflects the team around it, so it says little about the
 * character; the league wants it last for characters and builds, and leading
 * only on team views ("Settled on the demo" in the redesign plan).
 */
export const CHAR_STATS = [
  { key: 'matches', label: 'Matches', short: 'Games', get: r => tierMatchCount(r), fmt: v => v, dir: 0 },
  { key: 'dmg', label: 'Avg damage', short: 'Dmg', get: r => r.avgDamage || 0, fmt: fmtInt, dir: 1 },
  { key: 'dps', label: 'Dmg / sec', short: 'DPS', get: r => r.dps || 0, fmt: fmtInt, dir: 1 },
  { key: 'eff', label: 'Efficiency', short: 'Eff', get: r => r.efficiency || 0, fmt: v => `${v.toFixed(2)}×`, dir: 1 },
  { key: 'surv', label: 'Survival', short: 'Surv', get: r => r.survivalRate || 0, fmt: fmtPct, dir: 1 },
  { key: 'taken', label: 'Avg taken', short: 'Taken', get: r => r.avgTaken || 0, fmt: fmtInt, dir: -1 },
  { key: 'time', label: 'Battle time', short: 'Time', get: r => r.avgBattleTime || 0, fmt: fmtTime, dir: 0 },
  { key: 'win', label: 'Win %', short: 'Win', get: r => r.winRate || 0, fmt: fmtPct, dir: 1 },
];
export const statByKey = key => CHAR_STATS.find(s => s.key === key) || null;

/** The two stats a phone shows before anyone picks: never win %. */
export const DEFAULT_PHONE_STATS = ['dmg', 'eff'];

// ---- URL params ----------------------------------------------------------------
// view=tiers | (table), sort=<stat key | score | name>, dir=asc | (desc), pos=1,3

export const readView = params => (params.get('view') === 'tiers' ? 'tiers' : 'table');
export function readSort(params) {
  const key = params.get('sort');
  const valid = key === 'name' || key === 'score' || !!statByKey(key);
  const sort = valid ? key : 'score';
  const dir = params.get('dir') === 'asc' ? 'asc' : params.get('dir') === 'desc' ? 'desc' : (sort === 'name' ? 'asc' : 'desc');
  return { sort, dir };
}
export function readPositions(params) {
  const raw = (params.get('pos') || '').split(',').map(s => s.trim()).filter(s => POSITION_NAMES[s]);
  const set = [...new Set(raw)].sort();
  return set.length === 3 ? [] : set; // all three = no filter
}

/**
 * The rows for a set of positions ([] = all). Each character's matches are cut
 * to those positions and the leaderboard's own filter recomputes every stat and
 * score from what is left, so "Starter, Middle" pools exactly those matches.
 * Returned sorted by score, highest first.
 */
export function rowsForPositions(aggregated, positions, charMap) {
  if (!Array.isArray(aggregated) || !aggregated.length) return [];
  if (!positions.length) return filterAggregatedData(aggregated, { charMap });
  const want = new Set(positions.map(Number));
  const cut = aggregated
    .map(r => ({ ...r, matches: (r.matches || []).filter(m => want.has(Number(m.position))) }))
    .filter(r => r.matches.length);
  return filterAggregatedData(cut, { charMap });
}

/**
 * The legend line under a list of character rows. When every row is a thin
 * sample nothing is faded (fadesThinSamples), and the line says so instead.
 */
export function fadeLegend(rows) {
  if (rows.length && !fadesThinSamples(rows)) return 'Every character here has fewer than 5 matches, so none is faded.';
  const thin = rows.filter(isProvisionalTier).length;
  return `Faded = fewer than 5 matches${thin ? ` (${thin} here)` : ''}.`;
}

/** How many characters played each position at least once, for the chip's counts. */
export function positionCounts(aggregated) {
  const counts = { 1: 0, 2: 0, 3: 0 };
  for (const r of aggregated || []) {
    const seen = new Set((r.matches || []).map(m => Number(m.position)));
    for (const p of [1, 2, 3]) if (seen.has(p)) counts[p]++;
  }
  return counts;
}

export function sortRows(rows, { sort, dir }) {
  const sign = dir === 'asc' ? 1 : -1;
  const stat = statByKey(sort);
  const val = sort === 'score' ? r => r.combatPerformanceScore || 0 : stat ? stat.get : null;
  return [...rows].sort((a, b) => {
    if (sort === 'name') return sign * a.name.localeCompare(b.name);
    return sign * (val(a) - val(b)) || (b.combatPerformanceScore || 0) - (a.combatPerformanceScore || 0);
  });
}

/**
 * Where each value sits in its column, as the share of the pool it beats
 * (0..1) in the column's "better" direction. Ranks are coloured only at the
 * ends - the top and bottom fifth - so a pool under 5 gets no colour.
 */
export function placements(rows, stat) {
  if (!stat.dir || rows.length < 5) return () => null;
  const vals = rows.map(stat.get).sort((a, b) => a - b);
  const n = vals.length;
  return v => {
    let lo = 0; while (lo < n && vals[lo] < v) lo++;
    let hi = lo; while (hi < n && vals[hi] === v) hi++;
    const p = (lo + hi - 1) / 2 / (n - 1);
    return stat.dir > 0 ? p : 1 - p;
  };
}
