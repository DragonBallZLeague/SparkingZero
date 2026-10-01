import { multiLabel } from '../../shell/ChipMenu.jsx';
import { aiChips } from './aiChips.jsx';
import { CAPSULE_TYPES, slug } from './capsuleRows.js';

/**
 * The Capsules tab's own chips in the scope bar, after the divider: Capsule
 * type (`ctype`), Cost (`cost`), AI strategy (`ai`, the Builds tab's chip: only matches run
 * with those strategies count) and Character (`char`, shared with the Builds
 * and AI strategies tabs), all multi-select.
 *
 * `filters` is readCapsuleFilters().
 */
export function capsuleChips({ aggregated, filters, update, idFor }) {
  const setList = (key, all = Infinity) => next => update(p => {
    const keep = [...new Set(next)];
    if (keep.length && keep.length < all) p.set(key, keep.join(',')); else p.delete(key);
  });
  const plural = n => `${n.toLocaleString('en-US')} use${n === 1 ? '' : 's'}`;
  const byType = {};
  const byCost = new Map();
  const ais = new Map();
  for (const c of aggregated || []) {
    for (const m of c.matches || []) {
      const ai = m.aiStrategy || 'Default';
      ais.set(slug(ai), { l: ai, n: ((ais.get(slug(ai)) || {}).n || 0) + 1 });
      for (const cap of m.equippedCapsules || []) {
        const t = (cap.capsule && cap.capsule.buildType) || 'Unknown';
        byType[t] = (byType[t] || 0) + 1;
        const cost = String((cap.capsule && cap.capsule.cost) || 0);
        byCost.set(cost, (byCost.get(cost) || new Set()).add(cap.id));
      }
    }
  }
  const types = CAPSULE_TYPES.filter(t => byType[t]);
  const aiOptions = [...ais].map(([v, o]) => ({ v, l: o.l, cnt: `${o.n.toLocaleString('en-US')} match${o.n === 1 ? '' : 'es'}` }))
    .sort((a, b) => a.l.localeCompare(b.l));
  const aiName = v => (aiOptions.find(o => o.v === v) || {}).l || v;
  const typeName = v => CAPSULE_TYPES.find(t => slug(t) === v) || v;
  const costs = [...byCost.keys()].sort((a, b) => a - b);
  const capsules = n => `${n} capsule${n === 1 ? '' : 's'}`;
  const character = aiChips({ aggregated, filters: { chars: filters.chars, types: [] }, update, idFor }).find(c => c.id === 'char');

  return [
    {
      id: 'ctype',
      name: 'Capsule type',
      multi: true,
      selected: filters.types,
      set: filters.types.length > 0,
      label: multiLabel('Capsule type', filters.types, typeName),
      allLabel: 'Any type',
      options: types.map(t => ({ v: slug(t), l: t, cnt: plural(byType[t]) })),
      onChange: setList('ctype', types.length),
    },
    {
      id: 'cost',
      name: 'Cost',
      multi: true,
      selected: filters.costs,
      set: filters.costs.length > 0,
      label: multiLabel('Cost', filters.costs, v => v, vs => `Cost ${[...vs].sort((a, b) => a - b).join(', ')}`),
      allLabel: 'Any cost',
      options: costs.map(c => ({ v: c, l: `${c} cost`, cnt: capsules(byCost.get(c).size) })),
      onChange: setList('cost', costs.length),
    },
    {
      id: 'ai',
      name: 'AI strategy',
      multi: true,
      search: aiOptions.length > 8,
      selected: filters.ais,
      set: filters.ais.length > 0,
      label: multiLabel('AI strategy', filters.ais, aiName),
      allLabel: 'Any AI strategy',
      note: 'Counts only matches run with these strategies.',
      options: aiOptions,
      onChange: setList('ai'),
    },
    { ...character, note: 'Counts only these characters’ matches toward each capsule.' },
  ];
}
