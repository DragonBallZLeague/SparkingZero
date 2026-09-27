/**
 * Shared pieces of the combat performance score.
 *
 * The score formula is currently duplicated across roughly ten sites in
 * characterAggregation, teamAggregation, positionAggregation, filterAggregated
 * and statCalculations. Consolidating it is Phase 3+ work; this module exists so
 * that at least the part that was actually broken has one definition.
 *
 * THE DAMAGE-EFFICIENCY TERM
 *
 * Efficiency is damage dealt divided by damage taken, and it carries 25% of the
 * score weight un-normalised. Because it is a ratio it is unbounded, and the
 * codebase had three different answers for "what if nothing was taken?":
 *
 *   - return the raw damage dealt  (characterAggregation, positionAggregation,
 *     teamAggregation's per-match path, and the build paths) - a five-figure
 *     number substituted for a single-digit ratio, mixing units entirely
 *   - return a 999 sentinel        (the per-form and team paths)
 *   - return avgDamage / 1000      (statCalculations)
 *
 * All three inflate the score wildly: a character who happened to take no damage
 * in a small selection could score in the hundreds of thousands, swamping every
 * real entry. That only surfaces on narrow selections - across any realistic slice
 * of the corpus no character has totalTaken === 0 - but it made the score
 * unbounded in principle and unusable as a basis for absolute tier cutoffs.
 *
 * Measured on S0 in-season data (105 matches, 62 characters): real efficiency
 * ratios run 0.26 to 1.73, median 1.00, p99 1.60. Caps of 3x, 5x and 10x each
 * produced zero rank changes and identical scores. The cap is therefore a guard
 * rail against degenerate selections, not a rebalancing - it should never bind on
 * real data, and if it starts binding regularly that is a signal worth looking at.
 */

/**
 * Upper bound on the damage-efficiency ratio, roughly 3x the highest value ever
 * observed in league play. Also the value used when no damage was taken, so that
 * branch returns a ratio rather than a damage total.
 */
export const EFFICIENCY_CAP = 5;

/**
 * damage dealt / damage taken, clamped to EFFICIENCY_CAP, with the no-damage-taken
 * case returning the cap. Non-finite or negative inputs yield 0 so a bad row
 * cannot produce NaN halfway through a score.
 */
export function combatEfficiency(damageDealt, damageTaken) {
  const dealt = Number.isFinite(damageDealt) ? damageDealt : 0;
  const taken = Number.isFinite(damageTaken) ? damageTaken : 0;
  if (dealt <= 0) return 0;
  if (taken <= 0) return EFFICIENCY_CAP;
  return Math.min(EFFICIENCY_CAP, dealt / taken);
}
