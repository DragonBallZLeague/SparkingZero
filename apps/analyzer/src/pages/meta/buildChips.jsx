import React from 'react';
import Portrait from '../../components/Portrait.jsx';
import { multiLabel } from '../../shell/ChipMenu.jsx';
import { FLOORS } from './buildRows.js';

/**
 * The Builds tab's own chips in the scope bar, after the divider: the uses
 * floor, then character, AI strategy and capsule.
 *
 * The floor is single-choice and starts set ("Used 5+ times"), so the one rule
 * that hides builds is always on show. The other three are multi-select: OR
 * within character and AI strategy, while a build must contain EVERY capsule
 * picked. Their options are what the floor leaves, so nothing on offer leads
 * to an empty table on its own.
 *
 * `update` edits the query string (useQueryUpdate); `filters` is
 * readBuildFilters(); `defaultFloor` is the floor the URL omits.
 */
export function buildChips({ builds, filters, update, idFor, defaultFloor }) {
  const inFloor = builds.filter(b => b.uses >= filters.floor);
  const setList = key => next => update(p => {
    const keep = [...new Set(next)];
    if (keep.length) p.set(key, keep.join(',')); else p.delete(key);
  });

  const byName = (a, b) => a.l.localeCompare(b.l);
  const unique = (items, key, label) => {
    const seen = new Map();
    for (const it of items) if (!seen.has(it[key])) seen.set(it[key], { v: it[key], l: it[label] });
    return [...seen.values()].sort(byName);
  };
  const chars = unique(inFloor, 'charSlug', 'name')
    .map(o => ({ ...o, img: <Portrait id={idFor(o.l)} name={o.l} size={22} rounded={5} /> }));
  const ais = unique(inFloor, 'aiSlug', 'aiName');
  const caps = unique(inFloor.flatMap(b => b.capsules), 'slug', 'name');
  // A value picked by a shared link may not be on offer any more (a narrower
  // scope); it still needs a readable name on the chip.
  const nameOf = (options, fallbackRows) => v =>
    (options.find(o => o.v === v) || {}).l || (fallbackRows.find(r => r.v === v) || {}).l || v;
  const allCaps = unique(builds.flatMap(b => b.capsules), 'slug', 'name');

  return [
    {
      id: 'uses',
      name: 'Uses',
      multi: false,
      selected: String(filters.floor),
      set: filters.floor > 1,
      label: filters.floor > 1 ? `Used ${filters.floor}+ times` : 'Uses',
      options: FLOORS.map(f => ({
        v: String(f),
        l: f > 1 ? `Used ${f}+ times` : 'Any number of uses',
        cnt: `${builds.filter(b => b.uses >= f).length.toLocaleString('en-US')} builds`,
      })),
      onChange: v => update(p => { if (Number(v) === defaultFloor) p.delete('uses'); else p.set('uses', v); }),
    },
    {
      id: 'char',
      name: 'Character',
      multi: true,
      search: true,
      selected: filters.chars,
      set: filters.chars.length > 0,
      label: multiLabel('Character', filters.chars, nameOf(chars, unique(builds, 'charSlug', 'name'))),
      allLabel: 'Any character',
      options: chars,
      onChange: setList('char'),
    },
    {
      id: 'ai',
      name: 'AI strategy',
      multi: true,
      selected: filters.ais,
      set: filters.ais.length > 0,
      label: multiLabel('AI strategy', filters.ais, nameOf(ais, unique(builds, 'aiSlug', 'aiName'))),
      allLabel: 'Any AI strategy',
      options: ais,
      onChange: setList('ai'),
    },
    {
      id: 'cap',
      name: 'Capsule',
      multi: true,
      search: true,
      selected: filters.caps,
      set: filters.caps.length > 0,
      label: multiLabel('Capsule', filters.caps, null,
        sel => (sel.length === 1 ? `With ${nameOf(caps, allCaps)(sel[0])}` : `With ${sel.length} capsules`)),
      allLabel: 'Any capsules',
      note: 'Shows builds that contain every capsule you pick.',
      options: caps,
      onChange: setList('cap'),
    },
  ];
}
