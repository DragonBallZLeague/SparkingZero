/**
 * Turns a combat performance score into a Z/A/B/C/D tier.
 *
 * A tier is an ABSOLUTE fact about a score, not a percentile against whatever the
 * viewer happens to be looking at. The cutoffs come from the generated, committed
 * config/performance-bands.json - see scripts/generate-performance-bands.mjs for
 * how the calibration basis is chosen and why.
 *
 * This matters beyond tidiness: tiers appear on shareable character links, so the
 * same score must mean the same tier for the sender and the recipient. The old
 * percentile-against-the-filtered-view behaviour could not promise that - a
 * character changed tier when you toggled a filter, without their score moving.
 *
 * The scale itself lives in tierScale.js, which this module re-exports so callers
 * only need one import.
 */
import bands from '../config/performance-bands.json';
import {
  TIERS,
  TIER_PERCENTILES,
  TIER_LABELS,
  PROVISIONAL_BELOW_MATCHES,
} from './tierScale.js';

export { TIERS, TIER_PERCENTILES, TIER_LABELS, PROVISIONAL_BELOW_MATCHES };

/** The calibration these cutoffs came from, for display in a legend. */
export const TIER_BASIS = bands.basis || {};

/** { Z, A, B, C } score cutoffs. The bottom tier has none. */
export const TIER_CUTOFFS = bands.cutoffs || {};

/**
 * Score -> tier. Returns the bottom tier for anything below the lowest cutoff and
 * for a non-numeric score, so a caller always gets something renderable.
 */
export function tierForScore(score) {
  if (!Number.isFinite(score)) return TIERS[TIERS.length - 1];
  for (const tier of TIERS) {
    const cutoff = TIER_CUTOFFS[tier];
    if (cutoff !== undefined && score >= cutoff) return tier;
  }
  return TIERS[TIERS.length - 1];
}

/**
 * How many matches a character row is judged on. Active matches (non-zero battle
 * time) take precedence over raw match count, matching the rest of the app.
 */
export function tierMatchCount(charOrCount) {
  if (typeof charOrCount === 'number') return charOrCount;
  if (!charOrCount) return 0;
  return charOrCount.activeMatchCount > 0
    ? charOrCount.activeMatchCount
    : (charOrCount.matchCount || 0);
}

/** True when the sample behind a tier is too thin to treat it as settled. */
export function isProvisionalTier(charOrCount) {
  return tierMatchCount(charOrCount) < PROVISIONAL_BELOW_MATCHES;
}

/**
 * Whether a list should fade its thin samples. Fading sets the rows whose tier
 * rests on too few matches apart from the settled ones, so it only means
 * something while the list has settled rows. A narrow filter or a few Sandbox
 * uploads can leave every row under the threshold; fading them all would only
 * wash the list out, so then nothing is faded and the legend says why.
 *
 * `isThin` defaults to the character rule; the Builds table passes its own.
 */
export function fadesThinSamples(rows, isThin = isProvisionalTier) {
  return (rows || []).some(r => !isThin(r));
}

/**
 * One line for a tooltip. Deliberately short: the match and character counts and
 * the difficulty rule are calibration detail that belongs in the committed bands
 * file, not in front of a reader who just wants to know what a tier means.
 */
export function tierBasisSummary() {
  const n = TIER_BASIS.seasonWindow || 2;
  return 'Fixed score tiers, calculated from the last ' + n + ' seasons.';
}
