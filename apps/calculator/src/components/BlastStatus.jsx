import React from 'react';

/**
 * How a blast's damage is known (blasts.json `damageStatus`):
 *   measured    from apps/calculator/data/curated/blasts.csv; no marker
 *   computed    from game data with a recipe calibrated against the measured moves
 *   unmeasured  no value yet
 */
export function ComputedMark({ blast }) {
  if (blast?.damageStatus !== 'computed') return null;
  return (
    <span
      className="ml-1 text-[10px] px-1 py-px rounded bg-sky-900/60 text-sky-300 align-middle cursor-help"
      title={blast.spread
        ? 'Computed: one shot (game formula) x the number of shots that usually land. Not measured in game yet.'
        : 'Computed from the game data with a formula that reproduces 90%+ of the measured blasts. Not measured in game yet.'}
    >
      calc
    </span>
  );
}

/**
 * Spread-shot blasts (blasts.json `spread`): how many shots land depends on distance, so the
 * damage is one shot x the usual hit count (data/curated/spread-blasts.csv). Base values.
 */
export function SpreadNote({ blast }) {
  const s = blast?.spread;
  if (!s || s.shotsFired <= 1) return null; // a single bullet needs no shot count
  const n = (v) => Number(v).toLocaleString();
  const title = [
    `${s.commonHits} of ${s.shotsFired} shots usually land, ${n(s.perShot)} each.`,
    s.commonHits < s.shotsFired ? `All ${s.shotsFired}: ${n(s.allShots)}.` : null,
    s.centreShot ? `The opening shot rarely hits: ${n(s.centreShot)} when it does.` : null,
  ].filter(Boolean).join(' ');
  return (
    <span className="block text-[10px] text-gray-500 font-normal cursor-help" title={title}>
      {s.commonHits} of {s.shotsFired} shots x {n(s.perShot)}
      {s.commonHits < s.shotsFired ? ` (all ${s.shotsFired}: ${n(s.allShots)})` : ''}
    </span>
  );
}

export function NotMeasured() {
  return (
    <span className="text-xs italic text-gray-500" title="No damage value for this move yet. Measure it in game and add it to curated/blasts.csv.">
      not measured yet
    </span>
  );
}
