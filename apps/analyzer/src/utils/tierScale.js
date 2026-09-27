/**
 * The tier scale itself: names, shape and labels. No imports, deliberately.
 *
 * This is separate from performanceTier.js because the build-time calibrator
 * (scripts/generate-performance-bands.mjs) needs the scale in order to WRITE
 * config/performance-bands.json, while performanceTier.js READS that file. Were
 * they one module, the generator could not run before its own output existed.
 *
 * Z is the top tier, following the Dragon Ball convention rather than the generic
 * S-tier used elsewhere in fighting games.
 */

/** Best to worst. The last entry is the fallback and has no cutoff. */
export const TIERS = ['Z', 'A', 'B', 'C', 'D'];

/**
 * Percentile of the calibration population each cutoff is taken from, giving a
 * 10 / 20 / 30 / 20 / 20 spread. D is whatever falls below C.
 */
export const TIER_PERCENTILES = { Z: 0.90, A: 0.70, B: 0.40, C: 0.20 };

/** Short labels for legends and tooltips. */
export const TIER_LABELS = {
  Z: 'Top tier',
  A: 'Strong',
  B: 'Solid',
  C: 'Below par',
  D: 'Struggling',
};

/**
 * A character needs at least this many matches before their tier is treated as
 * settled. Below it the tier still shows - hiding it would look broken for a
 * newly used character - but it is marked provisional so a reader knows the
 * sample is thin. Chosen from the data: median score stabilises in the 10+ band,
 * while 1-9 matches sit materially lower, so under 5 is noise as often as signal.
 */
export const PROVISIONAL_BELOW_MATCHES = 5;
