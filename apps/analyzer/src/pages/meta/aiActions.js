/**
 * Every single action Meta's AI strategy detail compares, per minute on the
 * field: the All actions box lists them all, Biggest changes the ones that
 * changed most, and the table can add any of them as a column (`act=`, see
 * aiRows.js). No React, so a verifier can import it.
 *
 * PER MINUTE, not per match (the league, 2026-10-01): an AI that loses its
 * fights fast (Barrage: 0% survival, 1:17 on the field) looked per match as if
 * it cut nearly every action, when the character only had less time to act.
 * The Character page's style rates are per minute for the same reason.
 *
 * Grouped as the Match page groups its counts. A blast is its hits over its
 * throws ("0.8/1.2", the league's hit/thrown form), counted only over matches
 * that record hits (older files have throws only, as the Overview counts
 * them); speed impacts are won over fought. The figure an action is sorted,
 * coloured and compared by is the second, the throws or impacts.
 *
 * Left out on purpose: ki blast hits (`kiBlastHits`), which credit a deflected
 * enemy blast that lands as the deflector's own hit (docs/ACTION_CODES.md),
 * and deflecting is mostly automatic, so an AI that dragon dashes more would
 * seem to land more ki blasts; ki blasts are counted as fired only, as the
 * Character page counts them. And `sparkingComboCount`, which is not a count
 * (the main extractor stores the best combo of any match with a sparking in
 * it). The
 * files' own sparking-combo counter, ki blasts reflected, blast and crash
 * clashes and super Z-counters are not carried into the match rows yet: the
 * plan's follow-up (docs/ANALYZER_REDESIGN_PLAN.md, "Handoff").
 */

const n = v => Number(v) || 0;
/** Whether a match records blast hits (the Overview's test). */
const recordsHits = m => m.s1HitBlast !== undefined || m.s2HitBlast !== undefined || m.uLTHitBlast !== undefined;

export const ACTION_GROUPS = ['Attack', 'Blasts and skills', 'Defense', 'Mechanics'];

/**
 * [key, label, short (a table header), group, count field, part field, part word]:
 * a part is the share of the count shown before it, "hits/thrown".
 */
const DEFS = [
  ['rush', 'Rush hits', 'Rush', 'Attack', 'rushHits'],
  ['heavy', 'Heavy hits', 'Heavy', 'Attack', 'heavyHits'],
  ['ki', 'Ki blasts', 'Ki blasts', 'Attack', 'shotEnergyBulletCount'],
  ['throws', 'Throws', 'Throws', 'Attack', 'throwCount'],
  ['vanish', 'Vanishing attacks', 'Vanish', 'Attack', 'vanishingAttackCount'],
  ['homing', 'Dragon homing', 'Homing', 'Attack', 'dragonHomingCount'],
  ['lightning', 'Lightning attacks', 'Lightning', 'Attack', 'lightningAttackCount'],
  ['kos', 'KOs', 'KOs', 'Attack', 'kills'],
  ['s1', 'Super 1', 'Super 1', 'Blasts and skills', 's1Blast', 's1HitBlast', 'hit'],
  ['s2', 'Super 2', 'Super 2', 'Blasts and skills', 's2Blast', 's2HitBlast', 'hit'],
  ['ult', 'Ultimates', 'Ults', 'Blasts and skills', 'ultBlast', 'uLTHitBlast', 'hit'],
  ['skill1', 'Skill 1', 'Skill 1', 'Blasts and skills', 'exa1Count'],
  ['skill2', 'Skill 2', 'Skill 2', 'Blasts and skills', 'exa2Count'],
  ['guards', 'Guards', 'Guards', 'Defense', 'guardCount'],
  ['superC', 'Super counters', 'Super C', 'Defense', 'superCounterCount'],
  ['zC', 'Z-counters', 'Z-C', 'Defense', 'zCounterCount'],
  ['revC', 'Revenge counters', 'Revenge', 'Defense', 'revengeCounterCount'],
  ['tags', 'Tags', 'Tags', 'Defense', 'tags'],
  ['sparking', 'Sparking', 'Sparking', 'Mechanics', 'sparkingCount'],
  ['charges', 'Ki charges', 'Charges', 'Mechanics', 'chargeCount'],
  ['impacts', 'Speed impacts', 'Impacts', 'Mechanics', 'speedImpactCount', 'speedImpactWins', 'won'],
  ['dash', 'Dash distance', 'Dash', 'Mechanics', 'dragonDashMileage'],
];

/**
 * The actions, in the order the box lists them: { key, label, short, group,
 * count(m), part(m) or null, partWord, tracked(m) (which matches count) }.
 */
export const ACTIONS = DEFS.map(([key, label, short, group, field, partField, partWord]) => ({
  key, label, short, group,
  count: m => n(m[field]),
  part: partField ? m => n(m[partField]) : null,
  partWord: partWord || null,
  // Blast hits exist only in files that record them, and a blast's throws are
  // counted over the same matches so the two read as one pair.
  tracked: partWord === 'hit' ? recordsHits : null,
}));
export const actionByKey = key => ACTIONS.find(a => a.key === key) || null;

/**
 * Biggest changes lists an action only when it happens at least this often a
 * minute on one side: rare ones swing wildly. 0.5 a match before it was per
 * minute, at the median 1:48 on the field (measured 2026-10-01).
 */
export const ACTION_FLOOR = 0.25;

/**
 * How much an action changed, up (+) or down, on a log scale so halving
 * counts as much as doubling; the offset (0.1 a match before, 0.05 a minute
 * now) keeps one that a side never does from ranking as infinite. The All
 * actions box sorts its Change column by it, so rare and common actions
 * compare fairly; `actionChange` is its size, Biggest changes' order.
 */
export const actionShift = a => Math.log((a.with + 0.05) / (a.usual + 0.05));
export const actionChange = a => Math.abs(actionShift(a));

/**
 * One side's rates, a minute on the field, for a list of one character's
 * matches: { [key]: { rate, part } }, each null without time on the field
 * (for a blast, without a match that records hits).
 */
export function sideRates(matches) {
  let all = 0, tracked = 0;
  const sums = ACTIONS.map(() => [0, 0]);
  for (const m of matches) {
    const t = n(m.battleTime);
    const hits = recordsHits(m);
    all += t;
    if (hits) tracked += t;
    ACTIONS.forEach((a, i) => {
      if (a.tracked && !hits) return;
      sums[i][0] += a.count(m);
      if (a.part) sums[i][1] += a.part(m);
    });
  }
  const out = {};
  ACTIONS.forEach((a, i) => {
    const min = (a.tracked ? tracked : all) / 60;
    out[a.key] = min > 0 ? { rate: sums[i][0] / min, part: a.part ? sums[i][1] / min : null } : { rate: null, part: null };
  });
  return out;
}

/**
 * Every action's rate a minute for `pairs` (aiShift.js strategyPairs: a
 * character's matches with the strategy and without it), each character's own
 * rates combined weighted by its uses of the strategy, as the detail's other
 * figures are. `compare`: only characters with a rate on both sides count,
 * and `usual` is their rate on other AIs; without it, `usual` is null and
 * every character with a rate on this AI counts (a character too new to
 * compare still has its raw numbers).
 *
 * In ACTIONS order: { key, label, short, group, partWord, with, usual,
 * partWith, partUsual, characters } (null figures when no character counts).
 */
export function actionRates(pairs, { compare = true } = {}) {
  const sides = pairs.map(p => ({ w: p.with.length, on: sideRates(p.with), off: compare ? sideRates(p.without) : null }));
  return ACTIONS.map(a => {
    let w = 0, x = 0, y = 0, px = 0, py = 0, characters = 0;
    for (const s of sides) {
      const on = s.on[a.key], off = s.off ? s.off[a.key] : null;
      if (on.rate === null || (compare && off.rate === null)) continue;
      w += s.w; characters++;
      x += s.w * on.rate;
      if (a.part) px += s.w * on.part;
      if (compare) { y += s.w * off.rate; if (a.part) py += s.w * off.part; }
    }
    const mean = v => (w ? v / w : null);
    return {
      key: a.key, label: a.label, short: a.short, group: a.group, partWord: a.partWord,
      with: mean(x),
      usual: compare ? mean(y) : null,
      partWith: a.part ? mean(px) : null,
      partUsual: a.part && compare ? mean(py) : null,
      characters,
    };
  });
}

/** The ones Biggest changes may list (ACTION_FLOOR on one side), biggest change first. */
export function biggestChanges(rates) {
  return rates
    .filter(a => a.with !== null && a.usual !== null && Math.max(a.with, a.usual) >= ACTION_FLOOR)
    .sort((a, b) => actionChange(b) - actionChange(a));
}

/** A rate a minute: "0.05", "4.1", "13.7", "4,584"; "0" for none. */
export function fmtRate(v) {
  if (v === null || v === undefined) return '–';
  const a = Math.abs(v);
  if (a < 0.005) return '0';
  if (a >= 100) return Math.round(v).toLocaleString('en-US');
  return a < 0.095 ? v.toFixed(2) : v.toFixed(1);
}
/** A signed change a minute, "+0.4" / "−1.2", "0" for none. */
export const fmtRateChange = v => (v === null || v === undefined ? '–'
  : Math.abs(v) < 0.005 ? '0' : `${v > 0 ? '+' : '−'}${fmtRate(Math.abs(v))}`);
/** A rate with its part, "0.8/1.2" for a blast's hits over throws; the rate alone without one. */
export const fmtPair = (rate, part) => (part === null || part === undefined || rate === null ? fmtRate(rate) : `${fmtRate(part)}/${fmtRate(rate)}`);
