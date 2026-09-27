/**
 * The tier scale itself: names, shape and labels. No imports, deliberately.
 *
 * This is separate from performanceTier.js because the build-time calibrator
 * (scripts/generate-performance-bands.mjs) needs the scale in order to WRITE
 * config/performance-bands.json, while performanceTier.js READS that file. Were
 * they one module, the generator could not run before its own output existed.
 *
 * Z is the top tier, ahead of S - the Dragon Ball convention, rather than the generic
 * S-at-the-top used elsewhere in fighting games.
 */

/** Best to worst. The last entry is the fallback and has no cutoff. */
export const TIERS = ['Z', 'S', 'A', 'B', 'C'];

/**
 * Percentile of the calibration population each cutoff is taken from, giving a
 * 10 / 20 / 30 / 20 / 20 spread. C is whatever falls below B.
 */
export const TIER_PERCENTILES = { Z: 0.90, S: 0.70, A: 0.40, B: 0.20 };

/** Short labels for legends and tooltips. */
export const TIER_LABELS = {
  Z: 'Top tier',
  S: 'Excellent',
  A: 'Strong',
  B: 'Solid',
  C: 'Developing',
};

/**
 * A character needs at least this many matches before their tier is treated as
 * settled. Below it the tier still shows - hiding it would look broken for a
 * newly used character - but it is marked provisional so a reader knows the
 * sample is thin. Chosen from the data: median score stabilises in the 10+ band,
 * while 1-9 matches sit materially lower, so under 5 is noise as often as signal.
 */
export const PROVISIONAL_BELOW_MATCHES = 5;
