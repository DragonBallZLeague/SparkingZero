import React, { useCallback } from 'react';

/**
 * A two-thumb range slider with matching number inputs.
 *
 * Built because the existing filters only ever offered a floor: the score filter
 * was min-only, and the Matches Played row has a slider bound to min with max as
 * a bare number box, so you cannot actually isolate a band. This gives both ends
 * on the track.
 *
 * There is no native dual-thumb input, so this overlays two range inputs on one
 * track. The pointer-events dance is the crux: the inputs are transparent and
 * stacked, so without it the upper one would swallow every click and the lower
 * thumb would be unreachable. Each input ignores pointer events except on its own
 * thumb, and the z-order flips when the thumbs meet so the one you are reaching
 * for is always on top.
 */
export default function RangeSlider({
  min = 0,
  max = 100,
  step = 1,
  value = [0, 100],
  onChange,
  darkMode = false,
  label = '',
  ariaLabelMin = 'Minimum',
  ariaLabelMax = 'Maximum',
}) {
  const [lo, hi] = value;
  const span = max - min || 1;
  const loPct = Math.min(100, Math.max(0, ((lo - min) / span) * 100));
  const hiPct = Math.min(100, Math.max(0, ((hi - min) / span) * 100));

  const setLo = useCallback(v => {
    const next = Math.min(Number(v), hi);
    onChange?.([Math.max(min, next), hi]);
  }, [hi, min, onChange]);

  const setHi = useCallback(v => {
    const next = Math.max(Number(v), lo);
    onChange?.([lo, Math.min(max, next)]);
  }, [lo, max, onChange]);

  // When both thumbs sit at the top the lower one must win, or it can never be
  // dragged back down.
  const loOnTop = loPct > 90;

  const numberCls = `w-20 px-2 py-1 rounded border text-sm ${
    darkMode ? 'bg-gray-800 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-800'
  }`;
  const labelCls = `text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <label className={labelCls} htmlFor={`${label}-min`}>Min:</label>
        <input
          id={`${label}-min`}
          type="number"
          className={numberCls}
          min={min}
          max={hi}
          step={step}
          value={lo}
          onChange={e => setLo(e.target.value === '' ? min : e.target.value)}
          aria-label={ariaLabelMin}
        />
      </div>

      <div className="relative flex-1 h-6 flex items-center min-w-[120px]">
        {/* track */}
        <div className={`absolute inset-x-0 h-1.5 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-300'}`} />
        {/* selected span */}
        <div
          className="absolute h-1.5 rounded-full bg-orange-500"
          style={{ left: `${loPct}%`, width: `${Math.max(0, hiPct - loPct)}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={lo}
          onChange={e => setLo(e.target.value)}
          aria-label={ariaLabelMin}
          className="szl-range absolute inset-x-0 w-full"
          style={{ zIndex: loOnTop ? 4 : 3 }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={hi}
          onChange={e => setHi(e.target.value)}
          aria-label={ariaLabelMax}
          className="szl-range absolute inset-x-0 w-full"
          style={{ zIndex: loOnTop ? 3 : 4 }}
        />
      </div>

      <div className="flex items-center gap-2">
        <label className={labelCls} htmlFor={`${label}-max`}>Max:</label>
        <input
          id={`${label}-max`}
          type="number"
          className={numberCls}
          min={lo}
          max={max}
          step={step}
          value={hi}
          onChange={e => setHi(e.target.value === '' ? max : e.target.value)}
          aria-label={ariaLabelMax}
        />
      </div>

    </div>
  );
}
