import React from 'react';
import Portrait from '../../components/Portrait.jsx';
import TeamLogo from '../../components/TeamLogo.jsx';
import { multiLabel } from '../../shell/ChipMenu.jsx';
import { POSITION_NAMES } from '../../utils/positions.js';
import { teamByTag } from '../../utils/teams.js';

/**
 * The Performances view's own chips in the scope bar, after the divider:
 * Character, Played for, Position and Result. The first three are
 * multi-select (OR within a chip, AND between chips, as every chip); Result
 * is one choice. Their counts are over every performance in scope.
 *
 * "Played for" is the team the character was on, where the scope's Team chip
 * picks matches (both sides of them).
 *
 * `rows` are performanceRows(); `filters` is readPerfFilters(); `update`
 * edits the query string (useQueryUpdate).
 */
export function performanceChips({ rows, filters, update, idFor }) {
  const setList = (key, keepAll = Infinity) => next => update(p => {
    const keep = [...new Set(next)].sort();
    if (keep.length && keep.length < keepAll) p.set(key, keep.join(',')); else p.delete(key);
  });
  const tally = (key, label, extra = () => ({})) => {
    const seen = new Map();
    for (const r of rows) {
      const k = key(r);
      if (k === null) continue;
      const e = seen.get(k) || { v: k, l: label(r), n: 0, ...extra(r) };
      e.n++;
      seen.set(k, e);
    }
    return [...seen.values()];
  };
  const plural = n => `${n.toLocaleString('en-US')} match${n === 1 ? '' : 'es'}`;

  const chars = tally(r => r.charSlug, r => r.name).sort((a, b) => a.l.localeCompare(b.l))
    .map(o => ({ v: o.v, l: o.l, cnt: plural(o.n), img: <Portrait id={idFor(o.l)} name={o.l} size={22} rounded={5} /> }));
  const teams = tally(r => (r.team ? teamByTag(r.team).slug : null), r => teamByTag(r.team).name, r => ({ tag: r.team }))
    .sort((a, b) => a.l.localeCompare(b.l))
    .map(o => ({ v: o.v, l: o.l, cnt: plural(o.n), img: <TeamLogo tag={o.tag} size={18} rounded={4} /> }));
  const positions = tally(r => (r.position ? String(r.position) : null), r => POSITION_NAMES[r.position]);
  const byPos = Object.fromEntries(positions.map(o => [o.v, o.n]));
  const wins = rows.filter(r => r.won).length;
  // A value picked by a shared link may not be in this scope; it still needs a name.
  const nameOf = options => v => (options.find(o => o.v === v) || {}).l || v;

  return [
    {
      id: 'char',
      name: 'Character',
      multi: true,
      search: true,
      selected: filters.chars,
      set: filters.chars.length > 0,
      label: multiLabel('Character', filters.chars, nameOf(chars)),
      allLabel: 'Any character',
      options: chars,
      onChange: setList('char'),
    },
    {
      id: 'for',
      name: 'Played for',
      multi: true,
      search: teams.length > 8,
      selected: filters.teams,
      set: filters.teams.length > 0,
      label: multiLabel('Played for', filters.teams, nameOf(teams), sel => (sel.length === 1 ? `Played for ${nameOf(teams)(sel[0])}` : `Played for ${sel.length} teams`)),
      allLabel: 'Any team',
      options: teams,
      onChange: setList('for'),
    },
    {
      id: 'pos',
      name: 'Position',
      multi: true,
      selected: filters.positions,
      set: filters.positions.length > 0,
      label: multiLabel('Position', filters.positions, v => POSITION_NAMES[v]),
      allLabel: 'All positions',
      options: ['1', '2', '3'].map(p => ({ v: p, l: POSITION_NAMES[p], cnt: plural(byPos[p] || 0) })),
      onChange: setList('pos', 3),
    },
    {
      id: 'res',
      name: 'Result',
      multi: false,
      selected: filters.result || '',
      set: !!filters.result,
      label: filters.result === 'won' ? 'Wins' : filters.result === 'lost' ? 'Losses' : 'Result',
      options: [
        { v: '', l: 'Any result' },
        { v: 'won', l: 'Wins', cnt: plural(wins) },
        { v: 'lost', l: 'Losses', cnt: plural(rows.length - wins) },
      ],
      onChange: v => update(p => { if (v) p.set('res', v); else p.delete('res'); }),
    },
  ];
}
