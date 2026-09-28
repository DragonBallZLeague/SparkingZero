/**
 * The Character page Overview's numbers: one character's (or one build's)
 * per-match rows in, every figure the tab shows out, placed against the frozen
 * league baseline.
 *
 * Used at runtime by the Overview and at build time by
 * scripts/generate-style-baseline.mjs, which runs this same code over every
 * character in the calibration window. A character's own figures and the league
 * they are ranked against are therefore computed identically - a rank cannot
 * drift because the page and the baseline disagreed about a definition.
 *
 * The approved design (docs/ANALYZER_REDESIGN_PLAN.md, "Overview tab: approved
 * design") is the spec; the demo it was approved on is in
 * design/character-overview/.
 */
import { combatEfficiency } from './performanceScore.js';

const sum = (rows, f) => rows.reduce((s, m) => s + (Number(f(m)) || 0), 0);

/**
 * Per-match rows (aggregated `char.matches`, optionally filtered to one build) ->
 * the Overview figures.
 *
 * - Per-match figures divide by matches the character actually FOUGHT in (battle
 *   time > 0), the same denominator the aggregation uses.
 * - Fighting-style rates are per MINUTE on the field, so an Anchor's long fights
 *   do not make it look like a heavier user than a Starter.
 * - Hit rates only count matches that record blast hits (additionalCounts);
 *   older files do not, and counting them would read as misses.
 */
export function overviewFromMatches(matches) {
  const all = Array.isArray(matches) ? matches : [];
  const fought = all.filter(m => (m.battleTime || 0) > 0);
  const n = all.length;
  const act = fought.length || n || 1;
  const seconds = sum(all, m => m.battleTime);
  const min = seconds / 60;
  const perMin = x => (min > 0 ? x / min : 0);

  const dealt = sum(all, m => m.damageDone);
  const taken = sum(all, m => m.damageTaken);

  // Blast hits: only matches that record them.
  const tracked = all.filter(m => m.s1HitBlast !== undefined || m.s2HitBlast !== undefined || m.uLTHitBlast !== undefined);
  const tAct = tracked.filter(m => (m.battleTime || 0) > 0).length || tracked.length || 1;
  const blast = (hitKey, thrownKey) => (tracked.length
    ? [sum(tracked, m => m[hitKey]) / tAct, sum(tracked, m => m[thrownKey]) / tAct]
    : null);

  const exa1 = sum(all, m => m.exa1Count);
  const exa2 = sum(all, m => m.exa2Count);
  const rush = sum(all, m => m.rushHits);
  const heavy = sum(all, m => m.heavyHits);
  const fired = sum(all, m => m.shotEnergyBulletCount);

  const aiCounts = {};
  for (const m of all) {
    const ai = m.aiStrategy || 'Default';
    aiCounts[ai] = (aiCounts[ai] || 0) + 1;
  }
  const aiSorted = Object.entries(aiCounts).sort((a, b) => b[1] - a[1]);

  return {
    matches: n,
    active: fought.length,
    avgDealt: dealt / act,
    avgTaken: taken / act,
    efficiency: combatEfficiency(dealt, taken),
    dps: seconds > 0 ? dealt / seconds : 0,
    avgTime: seconds / act,
    // Per match: [hit, thrown]; null when no match records blast hits.
    blasts: {
      s1: blast('s1HitBlast', 's1Blast'),
      s2: blast('s2HitBlast', 's2Blast'),
      ult: blast('uLTHitBlast', 'ultBlast'),
    },
    // Total throws behind each hit rate, for the "only N thrown" floor.
    blastTotals: {
      s1: sum(tracked, m => m.s1Blast),
      s2: sum(tracked, m => m.s2Blast),
      ult: sum(tracked, m => m.ultBlast),
    },
    kiFired: fired / act,
    skills: { s1: exa1 / act, s2: exa2 / act },
    rate: {
      melee: perMin(rush + heavy),
      rush: perMin(rush),
      heavy: perMin(heavy),
      ki: perMin(fired),
      blast: perMin(sum(all, m => m.specialMovesUsed)),
      s1: perMin(sum(all, m => m.s1Blast)),
      s2: perMin(sum(all, m => m.s2Blast)),
      ult: perMin(sum(all, m => m.ultimatesUsed)),
      skill: perMin(exa1 + exa2),
      sk1: perMin(exa1),
      sk2: perMin(exa2),
      guard: perMin(sum(all, m => m.guardCount)),
      counter: perMin(sum(all, m => (m.superCounterCount || 0) + (m.zCounterCount || 0) + (m.revengeCounterCount || 0))),
    },
    survival: fought.length ? fought.filter(m => (m.hPGaugeValue || 0) > 0).length / fought.length : 0,
    tagsPerMatch: sum(all, m => m.tags) / act,
    ai: aiSorted.length
      ? {
        name: aiSorted[0][0],
        share: aiSorted[0][1] / n,
        tied: aiSorted.length > 1 && aiSorted[1][1] === aiSorted[0][1],
        strategies: aiSorted.length,
      }
      : null,
  };
}

const hitRate = pair => (pair && pair[1] ? pair[0] / pair[1] : null);

/**
 * Every ranked figure, as a getter over an overviewFromMatches() result. The keys
 * are the baseline's keys. `r_*` are per-minute style rates.
 */
export const OVERVIEW_METRICS = {
  avgDealt: o => o.avgDealt,
  avgTaken: o => o.avgTaken,
  efficiency: o => o.efficiency,
  dps: o => o.dps,
  avgTime: o => o.avgTime,
  s1Rate: o => hitRate(o.blasts.s1),
  s2Rate: o => hitRate(o.blasts.s2),
  ultRate: o => hitRate(o.blasts.ult),
  s1Thrown: o => (o.blasts.s1 ? o.blasts.s1[1] : null),
  s2Thrown: o => (o.blasts.s2 ? o.blasts.s2[1] : null),
  ultThrown: o => (o.blasts.ult ? o.blasts.ult[1] : null),
  kiFired: o => o.kiFired,
  skill1: o => o.skills.s1,
  skill2: o => o.skills.s2,
  survival: o => o.survival,
  tags: o => o.tagsPerMatch,
  ...Object.fromEntries(['melee', 'rush', 'heavy', 'ki', 'blast', 's1', 's2', 'ult', 'skill', 'sk1', 'sk2', 'guard', 'counter']
    .map(k => ['r_' + k, o => o.rate[k]])),
};

/** Figures where less is better, so #1 is the lowest. */
export const LOWER_IS_BETTER = new Set(['avgTaken']);

/**
 * Defensive Fighter: guards first, then counters; time on field and tags loosely;
 * survival barely, since it mostly reflects position and the team winning.
 * Deflections are deliberately absent - many are automatic (dragon dashing, max
 * power) rather than defensive play.
 */
export const DEFENSE_WEIGHTS = { r_guard: 0.40, r_counter: 0.30, avgTime: 0.15, tags: 0.10, survival: 0.05 };

/** The six fighting styles, in display order, with their rate and label. */
export const STYLES = [
  { key: 'melee', name: 'Melee', label: 'Melee Fighter', rate: 'melee' },
  { key: 'ki', name: 'Ki Blasts', label: 'Ki-Blast Spammer', rate: 'ki' },
  { key: 'blast', name: 'Blasts', label: 'Blast User', rate: 'blast' },
  { key: 'ult', name: 'Ultimates', label: 'Ult Spammer', rate: 'ult' },
  { key: 'skill', name: 'Skills', label: 'Skill User', rate: 'skill' },
  { key: 'defense', name: 'Defense', label: 'Defensive Fighter', rate: null },
];

/**
 * Baseline values are stored at 4 decimals; a figure is rounded the same way
 * before it is placed, so a character is never ranked against a rounded copy of
 * itself that sorts a hair below it.
 */
export const round4 = v => (v === null || v === undefined || !Number.isFinite(v) ? null : Math.round(v * 1e4) / 1e4);

/** Mid-rank percentile (ties share the middle), 0-100. */
export function percentileIn(sorted, v) {
  if (v === null || !sorted || !sorted.length) return null;
  let lo = 0, eq = 0;
  for (const x of sorted) { if (x < v) lo++; else if (x === v) eq++; }
  return Math.round(100 * (lo + eq / 2) / sorted.length);
}

/** Leaderboard rank: 1 + how many are strictly better. Ties share a rank. */
export function rankIn(sorted, v, lowerIsBetter = false) {
  if (v === null || !sorted || !sorted.length) return null;
  let better = 0;
  for (const x of sorted) if (lowerIsBetter ? x < v : x > v) better++;
  return better + 1;
}

/** The Defensive Fighter blend of an already-placed figure set. */
export function defenseRaw(pct) {
  return Object.entries(DEFENSE_WEIGHTS).reduce((s, [k, w]) => s + w * (pct[k] ?? 50), 0);
}

/**
 * Places an overviewFromMatches() result against the baseline:
 * { pct, rank, pool } keyed like OVERVIEW_METRICS plus style_<key> for the six
 * styles. pct is 0-100 where higher is more (not better - see LOWER_IS_BETTER);
 * rank is 1-based with #1 best; pool is how many the rank is out of.
 */
export function placeOverview(overview, baseline) {
  const pct = {}, rank = {}, pool = {};
  for (const [k, get] of Object.entries(OVERVIEW_METRICS)) {
    const arr = baseline.metrics[k] || [];
    const v = round4(get(overview));
    pct[k] = percentileIn(arr, v);
    rank[k] = rankIn(arr, v, LOWER_IS_BETTER.has(k));
    pool[k] = arr.length;
  }
  const d = round4(defenseRaw(pct));
  pct.style_defense = percentileIn(baseline.defense, d);
  rank.style_defense = rankIn(baseline.defense, d);
  pool.style_defense = baseline.defense.length;
  for (const s of STYLES) {
    if (!s.rate) continue;
    pct['style_' + s.key] = pct['r_' + s.rate];
    rank['style_' + s.key] = rank['r_' + s.rate];
    pool['style_' + s.key] = pool['r_' + s.rate];
  }
  return { pct, rank, pool };
}

/**
 * The fighting-style label(s): styles at or above the 75th percentile, strongest
 * first. One label, or two when the top two are within 15 points; none means
 * All-Rounder. Returns an array of STYLES entries (empty = All-Rounder).
 */
export function fightingStyles(pct) {
  const strong = STYLES
    .map(s => ({ ...s, p: pct['style_' + s.key] ?? 0 }))
    .filter(s => s.p >= 75)
    .sort((a, b) => b.p - a.p);
  if (!strong.length) return [];
  if (strong.length === 1 || strong[0].p - strong[1].p >= 15) return [strong[0]];
  return [strong[0], strong[1]];
}
