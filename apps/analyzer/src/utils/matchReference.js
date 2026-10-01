import { combatEfficiency } from './performanceScore.js';

/**
 * The league reference for ONE match's figures, as the Match page places them.
 *
 * The Character page ranks a character's averages against other characters'
 * averages (style-baseline.json `metrics`). One match is far more spread out
 * than an average - a 94k-damage match is ordinary for nobody's average - so a
 * match is placed among single performances instead: every character's every
 * match in the same calibration window (style-baseline.json `perMatch`,
 * written by scripts/generate-style-baseline.mjs with these same getters).
 *
 * It is stored as 21 quantiles per figure (every 5%): enough to place a value
 * and to find the top and bottom fifth, which is all the page colours.
 *
 * No React, so the generator can import it.
 */

/** Each figure, as a getter over one character's stats for one match (extractStats() or a match row). */
export const MATCH_METRICS = {
  damageDone: m => m.damageDone || 0,
  damageTaken: m => m.damageTaken || 0,
  efficiency: m => combatEfficiency(m.damageDone || 0, m.damageTaken || 0),
  dps: m => (m.battleTime > 0 ? (m.damageDone || 0) / m.battleTime : null),
  battleTime: m => m.battleTime || 0,
  kiFired: m => m.shotEnergyBulletCount || 0,
  skill1: m => m.exa1Count || 0,
  skill2: m => m.exa2Count || 0,
};

/** Figures where less is better. */
export const MATCH_LOWER_IS_BETTER = new Set(['damageTaken']);

/** The quantile steps stored: 0%, 5% ... 100%. */
export const QUANTILE_STEPS = 21;

/** A sorted array's 21 quantiles. */
export function quantilesOf(sorted) {
  if (!sorted.length) return [];
  return Array.from({ length: QUANTILE_STEPS }, (_, i) => sorted[Math.round((i / (QUANTILE_STEPS - 1)) * (sorted.length - 1))]);
}

/**
 * Where `v` sits among single performances, 0-100 (higher = more, not better).
 * Interpolated between quantiles; a value tied across several quantiles (most
 * matches use no Skill 2 at all) takes the middle of the tie, as the Character
 * page's ranks do.
 */
export function placeInQuantiles(q, v) {
  if (v === null || v === undefined || !Number.isFinite(v) || !q || !q.length) return null;
  const step = 100 / (q.length - 1);
  if (v < q[0]) return 0;
  if (v > q[q.length - 1]) return 100;
  const first = q.findIndex(x => x >= v);
  if (q[first] === v) {
    let last = first;
    while (last + 1 < q.length && q[last + 1] === v) last++;
    return ((first + last) / 2) * step;
  }
  const lo = first - 1;
  return (lo + (v - q[lo]) / (q[first] - q[lo])) * step;
}

/**
 * One match's figures placed in the reference: { value, pct, good, median }
 * per metric. `good` is `pct` turned so higher is always better (damage taken
 * flips), for the rank colour.
 */
export function placeMatch(stats, perMatch) {
  const out = {};
  const q = (perMatch && perMatch.quantiles) || {};
  for (const [k, get] of Object.entries(MATCH_METRICS)) {
    const value = get(stats);
    const pct = placeInQuantiles(q[k], value);
    out[k] = {
      value,
      pct,
      good: pct === null ? null : MATCH_LOWER_IS_BETTER.has(k) ? 100 - pct : pct,
      median: q[k] && q[k].length ? q[k][(q[k].length - 1) / 2] : null,
      p95: q[k] && q[k].length ? q[k][q[k].length - 2] : null,
    };
  }
  return out;
}
