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
      title="Computed from the game data with a formula that reproduces 90%+ of the measured blasts. Not measured in game yet."
    >
      calc
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
