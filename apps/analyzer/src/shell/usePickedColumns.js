import { useCallback, useState } from 'react';

/**
 * The columns a compact table shows when it is too wide for all of them,
 * picked from chips in the page's control row: a phone the first two, a
 * tablet the first four (PICKED_COLUMNS in useMediaQuery.js), from one list,
 * so a pick made on either carries to the other. A per-viewer convenience, so
 * browser storage, under `storageKey`.
 *
 * `defaults` is the whole list (four keys). `valid(key)` says whether a saved
 * key is still a column; anything else (a renamed column, blocked or garbled
 * storage) falls back to `defaults`. A shorter save (a phone's two, from
 * before tablets had four) is filled from `defaults`. Picking a key another
 * slot holds swaps the two, so no column shows twice.
 * Returns [keys, set(slot, key)].
 */
export function usePickedColumns(storageKey, defaults, valid) {
  const [cols, setCols] = useState(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) || 'null');
      if (Array.isArray(saved) && saved.length && saved.every(valid) && new Set(saved).size === saved.length) {
        return [...saved, ...defaults.filter(k => !saved.includes(k))].slice(0, defaults.length);
      }
    } catch { /* storage blocked or garbled: fall back */ }
    return defaults;
  });
  const set = useCallback((slot, key) => {
    setCols(prev => {
      const next = [...prev];
      const held = next.indexOf(key);
      if (held >= 0) next[held] = next[slot];
      next[slot] = key;
      try { window.localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* not kept */ }
      return next;
    });
  }, [storageKey]);
  return [cols, set];
}

/**
 * The scope-bar-style chip for one picked column (shell/ChipMenu.jsx):
 * `stats` are the table's stat columns ({ key, label, short }); a column the
 * other `shown` slots already show is offered but disabled (one kept out of
 * sight, a tablet's third or fourth on a phone, swaps in).
 */
export function pickerChip({ slot, cols, stats, onPick, shown = 2 }) {
  const byKey = key => stats.find(s => s.key === key) || null;
  return {
    id: `col${slot}`,
    name: 'Column',
    label: (byKey(cols[slot]) || { short: '?' }).short,
    set: false,
    multi: false,
    selected: cols[slot],
    options: stats.map(s => ({ v: s.key, l: s.label, dis: cols.slice(0, shown).some((k, i) => i !== slot && k === s.key) })),
    onChange: v => onPick(slot, v),
  };
}
