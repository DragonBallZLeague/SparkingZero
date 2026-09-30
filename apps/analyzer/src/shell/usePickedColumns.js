import { useCallback, useState } from 'react';

/**
 * The columns a phone (or a narrow screen) shows when a table is too wide for
 * all of them: two stat keys, picked from chips in the page's control row.
 * A per-viewer convenience, so browser storage, under `storageKey`.
 *
 * `valid(key)` says whether a saved key is still a column; anything else (a
 * renamed column, blocked or garbled storage) falls back to `defaults`.
 * Returns [keys, set(slot, key)].
 */
export function usePickedColumns(storageKey, defaults, valid) {
  const [cols, setCols] = useState(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) || 'null');
      if (Array.isArray(saved) && saved.length === defaults.length && saved.every(valid) && new Set(saved).size === saved.length) return saved;
    } catch { /* storage blocked or garbled: fall back */ }
    return defaults;
  });
  const set = useCallback((slot, key) => {
    setCols(prev => {
      const next = [...prev];
      next[slot] = key;
      try { window.localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* not kept */ }
      return next;
    });
  }, [storageKey]);
  return [cols, set];
}

/**
 * The scope-bar-style chip for one picked column (shell/ChipMenu.jsx):
 * `stats` are the table's stat columns ({ key, label, short }); the other
 * slot's column is offered but disabled.
 */
export function pickerChip({ slot, cols, stats, onPick }) {
  const byKey = key => stats.find(s => s.key === key) || null;
  return {
    id: `col${slot}`,
    name: 'Column',
    label: (byKey(cols[slot]) || { short: '?' }).short,
    set: false,
    multi: false,
    selected: cols[slot],
    options: stats.map(s => ({ v: s.key, l: s.label, dis: cols[1 - slot] === s.key })),
    onChange: v => onPick(slot, v),
  };
}
