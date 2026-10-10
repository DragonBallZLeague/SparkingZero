// /calculator/characters: every character as a row, with column sets for what is being compared.
import React, { useMemo, useState } from 'react';
import { data, baseStats, slugOf, teamsOf, CLASS_LABELS, TEAM_NAMES, blastsOf } from './data.js';
import { STAT, valueOf } from './stats.js';
import { ChipMenu, Seg, Portrait, ClassBadge, usePhone, useMedia } from './ui.jsx';

const blastDmg = (slot) => (c) => blastsOf(c).find(b => b.slot === slot && !b.variant)?.damage ?? null;
const MOVE_COLS = {
  super1: { label: 'Super 1', get: blastDmg('Super 1') },
  super2: { label: 'Super 2', get: blastDmg('Super 2') },
  ultimate: { label: 'Ultimate', get: blastDmg('Ultimate') },
};

export const COLUMN_SETS = [
  ['quick', 'Quick view', ['health', 'rush5Hit', 'smash', 'throw', 'armorBreak', 'melee', 'kiBlastDmg', 'kiBlastLimit', 'ultimate']],
  ['attack', 'Attack', ['rush5Hit', 'rush', 'fiveHitAfterArmor', 'smash', 'throw', 'pursuit', 'kiBlastDmg', 'kiBlastVolley', 'super1', 'super2', 'ultimate']],
  ['defense', 'Toughness', ['health', 'melee', 'meleeArmored', 'meleeDefenseStat', 'blastDefense', 'energy', 'armor', 'switch']],
  ['ki', 'Ki & skills', ['startingKi', 'kiCharge', 'kiRegen', 'kiRegenRange', 'shortDashCost', 'kiBlastCost', 'skillStart', 'skillLimit', 'skillRegen']],
];

const colLabel = (k) => MOVE_COLS[k]?.label || STAT[k].short || STAT[k].label;
const better = (k) => (MOVE_COLS[k] ? 'high' : STAT[k].better);
const parseNum = (v) => (typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : null);

export default function CharactersPage({ query, setQuery, go }) {
  const phone = usePhone();
  const tablet = useMedia('(max-width: 1180px)');
  const set = COLUMN_SETS.find(s => s[0] === (query.cols || 'quick')) || COLUMN_SETS[0];
  const cols = set[2];
  const classes = query.class ? query.class.split('|') : [];
  const teams = query.team ? query.team.split('|') : [];
  const [q, setQ] = useState('');
  const sortKey = query.sort && (cols.includes(query.sort) || query.sort === 'name') ? query.sort : null;
  // first click: best first (largest, or smallest where less is better)
  const defDir = sortKey && sortKey !== 'name' && better(sortKey) === 'low' ? 1 : -1;
  const dir = query.dir === 'asc' ? 1 : query.dir === 'desc' ? -1 : defDir;

  const rows = useMemo(() => data.characters.map((c, i) => {
    const v = baseStats(c.id);
    const vals = {};
    for (const k of cols) vals[k] = MOVE_COLS[k] ? MOVE_COLS[k].get(c) : valueOf(k, v);
    return { c, v, vals, order: i };
  }), [cols]);

  const shown = useMemo(() => {
    let r = rows.filter(({ c }) =>
      (!classes.length || classes.includes(c.class.label)) &&
      (!teams.length || (teamsOf.get(c.id) || []).some(t => teams.includes(t))) &&
      (!q || c.name.toLowerCase().includes(q.toLowerCase())));
    if (sortKey === 'name') r = [...r].sort((a, b) => dir * -a.c.name.localeCompare(b.c.name));
    else if (sortKey) r = [...r].sort((a, b) => {
      const x = parseNum(a.vals[sortKey]), y = parseNum(b.vals[sortKey]);
      if (x == null) return 1; if (y == null) return -1;
      return dir * (x - y) || a.order - b.order;
    });
    return r;
  }, [rows, classes.join(), teams.join(), q, sortKey, dir]);

  // min/max per column for the light rank tint at the ends
  const ends = useMemo(() => {
    const o = {};
    for (const k of cols) {
      const xs = rows.map(r => parseNum(r.vals[k])).filter(x => x != null && x < 999).sort((a, b) => a - b);
      o[k] = xs.length ? [xs[Math.floor(xs.length * 0.1)], xs[Math.floor(xs.length * 0.9)]] : null;
    }
    return o;
  }, [rows]);
  const tint = (k, v) => {
    const x = parseNum(v), e = ends[k];
    if (x == null || !e || e[0] === e[1]) return '';
    const hi = better(k) === 'high';
    if (x >= e[1] && x > e[0]) return hi ? 'good' : 'bad';
    if (x <= e[0] && x < e[1]) return hi ? 'bad' : 'good';
    return '';
  };

  const sortBy = (k) => {
    if (sortKey === k) setQuery({ dir: dir === 1 ? 'desc' : 'asc' });
    else setQuery({ sort: k, dir: null });
  };
  const fmt = (k, v) => (MOVE_COLS[k] ? (v == null ? '—' : Math.round(v).toLocaleString()) : STAT[k].fmt(v));

  const phoneCols = cols.slice(0, 3);
  // tablet: no rank column, a narrower name and numbers, so eleven columns fit 900px
  const gridCols = phone ? `minmax(0,1fr) repeat(${phoneCols.length}, 64px)`
    : tablet ? `minmax(150px, 1.4fr) repeat(${cols.length}, minmax(50px, 1fr))`
      : `40px minmax(220px, 1.6fr) repeat(${cols.length}, minmax(64px, 1fr))`;
  const showRank = !phone && !tablet;

  return (
    <>
      <div className="ctl-row">
        <div className="chips">
          <input className="search" placeholder="Search characters" value={q} onChange={e => setQ(e.target.value)} />
          <ChipMenu label="Class" options={CLASS_LABELS.map(l => [l, l, data.characters.filter(c => c.class.label === l).length])}
            selected={classes} onChange={(v) => setQuery({ class: v.join('|') || null })} />
          <ChipMenu label="Team" search options={TEAM_NAMES.map(t => [t, t])} selected={teams} onChange={(v) => setQuery({ team: v.join('|') || null })} />
        </div>
        <Seg options={COLUMN_SETS.map(([k, l]) => [k, l])} value={set[0]} onChange={(v) => setQuery({ cols: v === 'quick' ? null : v, sort: null, dir: null })} small={phone} />
      </div>
      <div className="bar-row">
        <span className="count"><b>{shown.length}</b> of {data.characters.length} characters · base stats, no capsules</span>
        <span className="legend"><i className="lg good" /> top 10% <i className="lg bad" /> bottom 10% · tap a row for the character</span>
      </div>
      <div className="panel gt" style={{ '--cols': gridCols }}>
        <div className="gh">
          {showRank && <span className="l">#</span>}
          <button className={`l${sortKey === 'name' ? ' sorted' : ''}`} onClick={() => sortBy('name')}>Character</button>
          {(phone ? phoneCols : cols).map(k => (
            <button key={k} className={sortKey === k ? 'sorted' : ''} onClick={() => sortBy(k)}>
              {colLabel(k)}{sortKey === k ? (dir === 1 ? ' ↑' : ' ↓') : ''}
            </button>
          ))}
        </div>
        {shown.map(({ c, vals }, i) => (
          <a key={c.id} className="gr" href={`#/characters/${slugOf.get(c.id)}`} onClick={(e) => { e.preventDefault(); go(`/characters/${slugOf.get(c.id)}`); }}>
            {showRank && <span className="rk l">{i + 1}</span>}
            <span className="who l">
              <Portrait id={c.id} />
              <span className="min0">
                <span className="nm">{c.name}</span>
                <span className="sub"><ClassBadge label={c.class.label} /> <span className="dp">DP {c.dp}</span></span>
              </span>
            </span>
            {(phone ? phoneCols : cols).map(k => <span key={k} className={`num ${tint(k, vals[k])}`}>{fmt(k, vals[k])}</span>)}
          </a>
        ))}
        {!shown.length && <div className="empty">No characters match.</div>}
      </div>
      {phone && <p className="foot">On a phone the table shows the set's first three columns; the column set picks which.</p>}
    </>
  );
}
