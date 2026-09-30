import baseline from '../../config/style-baseline.json';
import { filterAggregatedData } from '../../utils/aggregation/filterAggregated.js';
import { overviewFromMatches, placeOverview, STYLES } from '../../utils/characterOverview.js';
import { slugifyCharacterName } from '../../utils/characterSlug.js';

/**
 * What an AI strategy changes: the same characters with it against their other
 * strategies. No React, so a verifier can import it.
 *
 * A strategy's pooled figures (meta/aiRows.js) mostly say which characters get
 * it - Ultimate Blasts goes on characters with strong ultimates - not what it
 * does to them. So here each character that ran the strategy is compared with
 * itself: its matches on the strategy against its matches on any other, and
 * the characters are combined weighted by how often each ran the strategy.
 * With the Character chip on one character, it is that character's own.
 *
 * STYLES are placed as the Character page Overview places them: each
 * character's style rates (per minute on the field) ranked among the league
 * reference's characters (style-baseline.json, #1 = does it most), once with
 * the strategy and once on its others. A strategy's style shift is how many
 * places it moves its characters on average ("#71 -> #19 of 126", +52).
 * Ranks rather than a ratio: a ratio against a rate near zero ran into the
 * thousands (ultimates +1,328% on a strategy whose characters rarely fire
 * one otherwise), which says nothing a reader can use; places are bounded by
 * the league, and read like every other rank on the site (the league,
 * 2026-09-30).
 *
 * Single ACTIONS have no league reference, so they are compared per match:
 * "0.3 -> 0.9 a match".
 */

const slug = slugifyCharacterName;

/** A character needs this many matches on other strategies to have a usual to compare with. */
export const MIN_OTHER = 3;
/** "Suits best / worst" needs this many matches each way. */
export const SUIT_MIN = 3;
/** An action is listed only when it happens at least this often a match on one side: rare ones swing wildly. */
export const ACTION_FLOOR = 0.5;
/** A style shift this many places or more (of the league's ~126) is named in the headline. */
export const LEAN_PLACES = 15;

const n = v => Number(v) || 0;

/** Single actions, as the Match page names them. */
export const SHIFT_ACTIONS = [
  ['throws', 'Throws', 'throwCount'],
  ['vanish', 'Vanishing attacks', 'vanishingAttackCount'],
  ['homing', 'Dragon homing', 'dragonHomingCount'],
  ['lightning', 'Lightning attacks', 'lightningAttackCount'],
  ['rush', 'Rush hits', 'rushHits'],
  ['heavy', 'Heavy hits', 'heavyHits'],
  ['ki', 'Ki blasts', 'shotEnergyBulletCount'],
  ['s1', 'Super 1', 's1Blast'],
  ['s2', 'Super 2', 's2Blast'],
  ['ult', 'Ultimates', 'ultimatesUsed'],
  ['skill1', 'Skill 1', 'exa1Count'],
  ['skill2', 'Skill 2', 'exa2Count'],
  ['guards', 'Guards', 'guardCount'],
  ['superC', 'Super counters', 'superCounterCount'],
  ['zC', 'Z-counters', 'zCounterCount'],
  ['revC', 'Revenge counters', 'revengeCounterCount'],
  ['sparking', 'Sparking', 'sparkingCount'],
  ['charges', 'Ki charges', 'chargeCount'],
  ['impacts', 'Speed impacts', 'speedImpactCount'],
  ['tags', 'Tags', 'tags'],
].map(([key, label, field]) => ({ key, label, count: m => n(m[field]) }));

/** Per match fought (time on the field); null with none. */
export function perMatch(matches, count) {
  let c = 0, k = 0;
  for (const m of matches) { if (n(m.battleTime) > 0) { c += count(m); k++; } }
  return k ? c / k : null;
}

const fought = ms => ms.some(m => n(m.battleTime) > 0);

/**
 * The six styles' places for `pairs` (strategyPairs' paired): each
 * character's rank with the strategy and on its others, among the league
 * reference, averaged weighted by uses. Characters with no time on the field
 * on either side are left out (no time ranks as never). Each style:
 * { key, name, label, with, usual (mean ranks), gain (usual - with: places
 * climbed, + = does it more), pool }.
 */
export function styleRanks(pairs, ref = baseline) {
  const acc = Object.fromEntries(STYLES.map(s => [s.key, { w: 0, u: 0, n: 0, pool: 0 }]));
  for (const p of pairs) {
    if (!fought(p.with) || !fought(p.without)) continue;
    const pw = placeOverview(overviewFromMatches(p.with), ref);
    const pu = placeOverview(overviewFromMatches(p.without), ref);
    for (const st of STYLES) {
      const rw = pw.rank[`style_${st.key}`], ru = pu.rank[`style_${st.key}`];
      if (rw === null || rw === undefined || ru === null || ru === undefined) continue;
      const a = acc[st.key];
      a.w += p.with.length * rw; a.u += p.with.length * ru; a.n += p.with.length;
      a.pool = pw.pool[`style_${st.key}`];
    }
  }
  return STYLES.map(st => {
    const a = acc[st.key];
    if (!a.n) return { ...st, with: null, usual: null, gain: null, pool: a.pool };
    return { ...st, with: a.w / a.n, usual: a.u / a.n, gain: (a.u - a.w) / a.n, pool: a.pool };
  });
}

/**
 * The characters in `aggregated` (the scope's raw character rows, `f.chars`
 * slugs kept) that ran `strategy`, split into { name, with, without } match
 * lists; `paired` are those with a usual to compare with (MIN_OTHER).
 * "Without" is every other strategy, whatever the Type chip says: a
 * character's usual is all of its other matches.
 */
export function strategyPairs(aggregated, strategy, f = { chars: [] }) {
  const all = [];
  for (const c of aggregated || []) {
    if (f.chars && f.chars.length && !f.chars.includes(slug(c.name))) continue;
    const w = [], o = [];
    for (const m of c.matches || []) ((m.aiStrategy || 'Default') === strategy ? w : o).push(m);
    if (w.length) all.push({ name: c.name, with: w, without: o });
  }
  return { all, paired: all.filter(p => p.without.length >= MIN_OTHER) };
}

/** Weighted (by uses of the strategy) mean of `get` with and without; null when either side has none. */
function weighted(pairs, get) {
  let a = 0, b = 0, w = 0;
  for (const p of pairs) {
    const x = get(p.with), y = get(p.without);
    if (x === null || y === null || !Number.isFinite(x) || !Number.isFinite(y)) continue;
    a += p.with.length * x; b += p.with.length * y; w += p.with.length;
  }
  if (!w) return null;
  return { with: a / w, usual: b / w, shift: b > 0 ? a / b - 1 : null };
}

const scoreOf = (name, matches, charMap) => {
  const row = filterAggregatedData([{ name, matches }], { charMap })[0];
  return row ? row.combatPerformanceScore : null;
};

/**
 * One strategy's shift, for its detail:
 *   total, compared (uses with a usual to compare against), characters (paired)
 *   styles   styleRanks(): each style's mean league rank with it and usual, and the places gained
 *   actions  SHIFT_ACTIONS per match, { with, usual, shift }, either side at least
 *            ACTION_FLOOR, the biggest change (by ratio) first
 *   results  { dmg, taken, eff, score }, each { with, usual, shift } (score's
 *            shift is in points: with - usual)
 *   suits    { best, worst }: characters with SUIT_MIN+ matches each way, by
 *            score with it minus their score without, three each way
 *   builds   build types by share of its uses; capsules the most equipped with it
 * Scores run the leaderboard's filter twice per character, so this is for one
 * strategy at a time (the picked row), not the whole table.
 */
export function aiShift(aggregated, strategy, f = { chars: [] }, charMap = {}) {
  const { all, paired } = strategyPairs(aggregated, strategy, f);
  const total = all.reduce((s, p) => s + p.with.length, 0);
  const compared = paired.reduce((s, p) => s + p.with.length, 0);

  const styles = styleRanks(paired);
  // By ratio, on a log scale so halving counts as much as doubling; the 0.1
  // keeps an action that one side never does from ranking as infinite.
  const change = a => Math.abs(Math.log((a.with + 0.1) / (a.usual + 0.1)));
  const actions = SHIFT_ACTIONS
    .map(a => ({ key: a.key, label: a.label, ...(weighted(paired, ms => perMatch(ms, a.count)) || {}) }))
    .filter(a => a.with !== undefined && Math.max(a.with, a.usual) >= ACTION_FLOOR)
    .sort((a, b) => change(b) - change(a));

  // Results: the Overview's per-match figures, and the leaderboard score.
  const ov = new Map();
  const overview = ms => { if (!ov.has(ms)) ov.set(ms, overviewFromMatches(ms)); return ov.get(ms); };
  const scores = new Map();
  for (const p of paired) scores.set(p.name, { with: scoreOf(p.name, p.with, charMap), without: scoreOf(p.name, p.without, charMap) });
  const score = (() => {
    let a = 0, b = 0, w = 0;
    for (const p of paired) {
      const s = scores.get(p.name);
      if (s.with === null || s.without === null) continue;
      a += p.with.length * s.with; b += p.with.length * s.without; w += p.with.length;
    }
    return w ? { with: a / w, usual: b / w, shift: (a - b) / w } : null;
  })();
  const results = {
    dmg: weighted(paired, ms => overview(ms).avgDealt),
    taken: weighted(paired, ms => overview(ms).avgTaken),
    eff: weighted(paired, ms => overview(ms).efficiency),
    score,
  };

  const deltas = paired
    .filter(p => p.with.length >= SUIT_MIN)
    .map(p => ({ name: p.name, uses: p.with.length, ...scores.get(p.name) }))
    .filter(d => d.with !== null && d.without !== null)
    .map(d => ({ ...d, delta: d.with - d.without }));
  const suits = {
    best: deltas.filter(d => d.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 3),
    worst: deltas.filter(d => d.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 3),
  };

  // What it is run with: every use, compared or not.
  const types = new Map(), caps = new Map();
  for (const p of all) {
    for (const m of p.with) {
      const t = (m.buildComposition && m.buildComposition.label) || 'No Build';
      types.set(t, (types.get(t) || 0) + 1);
      for (const c of m.equippedCapsules || []) {
        const e = caps.get(c.id) || { name: c.name, type: String((c.capsule && c.capsule.buildType) || '').toLowerCase(), n: 0 };
        e.n++;
        caps.set(c.id, e);
      }
    }
  }
  const byShare = (map, key) => [...map].map(([k, v]) => (typeof v === 'number' ? { [key]: k, n: v } : v))
    .sort((a, b) => b.n - a.n || String(a[key] || a.name).localeCompare(String(b[key] || b.name)))
    .map(e => ({ ...e, share: total ? e.n / total : 0 }));

  return {
    total, compared, characters: paired.length,
    styles, actions, results, suits,
    builds: { types: byShare(types, 'label').slice(0, 4), capsules: byShare(caps, 'name').slice(0, 5) },
  };
}

// ---- Data quality ------------------------------------------------------------
// A first cut, from uses and how many characters ran it; the league can tune it.

export const QUALITY = ['Low', 'Medium', 'High'];

/** 'Low' under 30 uses or 5 characters, 'High' from 100 uses and 15 characters, else 'Medium'. */
export function dataQuality(uses, characters) {
  if (uses < 30 || characters < 5) return 'Low';
  if (uses >= 100 && characters >= 15) return 'High';
  return 'Medium';
}
