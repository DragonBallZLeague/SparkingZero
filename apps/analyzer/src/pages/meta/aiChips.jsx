import React from 'react';
import Portrait from '../../components/Portrait.jsx';
import { multiLabel } from '../../shell/ChipMenu.jsx';
import { AI_TYPES, aiType, slug } from './aiRows.js';

/**
 * The AI strategies tab's own chips in the scope bar, after the divider: Type
 * (the strategy family) and Character (only those characters' matches count
 * toward each strategy), both multi-select. Character is the Builds tab's
 * chip too (`char`), so it carries across the two tabs.
 *
 * `aggregated` is the scope's character rows; `filters` is readAiFilters().
 */
export function aiChips({ aggregated, filters, update, idFor }) {
  const setList = (key, all = Infinity) => next => update(p => {
    const keep = [...new Set(next)];
    if (keep.length && keep.length < all) p.set(key, keep.join(',')); else p.delete(key);
  });
  const plural = n => `${n.toLocaleString('en-US')} match${n === 1 ? '' : 'es'}`;

  const chars = (aggregated || [])
    .map(c => ({ v: slug(c.name), l: c.name, n: (c.matches || []).length }))
    .filter(o => o.n)
    .sort((a, b) => a.l.localeCompare(b.l))
    .map(o => ({ v: o.v, l: o.l, cnt: plural(o.n), img: <Portrait id={idFor(o.l)} name={o.l} size={22} rounded={5} /> }));
  const byType = {};
  for (const c of aggregated || []) for (const m of c.matches || []) {
    const t = aiType(m.aiStrategy || 'Default');
    byType[t] = (byType[t] || 0) + 1;
  }
  const nameOf = v => (chars.find(o => o.v === v) || {}).l || v;

  return [
    {
      id: 'type',
      name: 'Type',
      multi: true,
      selected: filters.types,
      set: filters.types.length > 0,
      label: multiLabel('Type', filters.types, v => v),
      allLabel: 'Any type',
      options: AI_TYPES.filter(t => byType[t]).map(t => ({ v: t, l: t, cnt: plural(byType[t]) })),
      onChange: setList('type', AI_TYPES.filter(t => byType[t]).length),
    },
    {
      id: 'char',
      name: 'Character',
      multi: true,
      search: true,
      selected: filters.chars,
      set: filters.chars.length > 0,
      label: multiLabel('Character', filters.chars, nameOf),
      allLabel: 'Any character',
      note: 'Counts only these characters’ matches toward each strategy.',
      options: chars,
      onChange: setList('char'),
    },
  ];
}
