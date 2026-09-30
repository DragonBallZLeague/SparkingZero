import React, { useMemo, useState } from 'react';
import Portrait from '../../components/Portrait.jsx';
import TierScorePill from '../../components/TierScorePill.jsx';
import { isProvisionalTier, tierMatchCount, fadesThinSamples } from '../../utils/performanceTier.js';
import StatTable from '../../shell/StatTable.jsx';

const fmtInt = v => Math.round(v || 0).toLocaleString('en-US');

/**
 * The Team page's Roster: every character the team fielded, with its score
 * over the matches it played for this team, how often it played each position,
 * damage and efficiency. Win % is last and muted: for one character it mostly
 * reflects the team around it, and here the team is the page.
 *
 * The # is the character's place by score on the team. The TOP 5, whose
 * figures are the team's, have theirs in orange - unless the team fielded no
 * more than five, when all of them count and the mark would say nothing.
 *
 * `rows` are rosterRows(); `top5` the team row's names; `linkFor(name)` opens
 * the character's page.
 */
const COLS = [
  { key: 'score', label: 'Score', get: r => r.combatPerformanceScore || 0 },
  { key: 'matches', label: 'Matches', short: 'Games', get: r => tierMatchCount(r) },
  { key: 'p1', label: 'Starter', get: r => r.positions[1] },
  { key: 'p2', label: 'Middle', get: r => r.positions[2] },
  { key: 'p3', label: 'Anchor', get: r => r.positions[3] },
  { key: 'dmg', label: 'Avg damage', get: r => r.avgDamage || 0 },
  { key: 'eff', label: 'Efficiency', short: 'Eff', get: r => r.efficiency || 0 },
  { key: 'win', label: 'Win %', get: r => r.winRate || 0 },
];
const col = key => COLS.find(c => c.key === key);
const byScore = (a, b) => (b.combatPerformanceScore || 0) - (a.combatPerformanceScore || 0);

export default function RosterTable({ rows, top5 = [], isPhone, idFor, linkFor }) {
  const [sort, setSort] = useState({ key: 'score', dir: 'desc' });
  const sorted = useMemo(() => {
    const sign = sort.dir === 'asc' ? 1 : -1;
    const get = col(sort.key).get;
    return [...rows].sort((a, b) => sign * (get(a) - get(b)) || byScore(a, b));
  }, [rows, sort]);
  const place = useMemo(() => new Map([...rows].sort(byScore).map((r, i) => [r.name, i + 1])), [rows]);
  const inTop5 = new Set(top5);
  const marks = inTop5.size > 0 && rows.some(r => !inTop5.has(r.name));
  const fade = fadesThinSamples(rows);
  const onSort = key => setSort(s => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }));

  const num = 'text-right text-[14px] text-slate-100 tabular-nums';
  const figure = {
    score: r => <div className="text-right"><TierScorePill score={r.combatPerformanceScore} provisional={fade && isProvisionalTier(r)} /></div>,
    matches: r => <div className={num}>{tierMatchCount(r)}</div>,
    p1: r => <Slot n={r.positions[1]} />,
    p2: r => <Slot n={r.positions[2]} />,
    p3: r => <Slot n={r.positions[3]} />,
    dmg: r => <div className={num}>{fmtInt(r.avgDamage)}</div>,
    eff: r => <div className={num}>{(r.efficiency || 0).toFixed(2)}×</div>,
    win: r => <div className="text-right text-[14px] text-slate-400 tabular-nums">{Math.round(r.winRate || 0)}%</div>,
  };
  const widths = isPhone
    ? { score: '58px', matches: '48px', eff: '50px' }
    : { score: '66px', matches: '64px', p1: '60px', p2: '60px', p3: '60px', dmg: '92px', eff: '80px', win: '56px' };
  const shown = isPhone ? ['score', 'matches', 'eff'].map(col) : COLS;
  const columns = [
    {
      key: '#', label: '#', title: 'Place on the team, by score', width: isPhone ? '16px' : '22px', sort: false,
      cell: r => {
        const top = marks && inTop5.has(r.name);
        return (
          <div className={`text-right text-xs tabular-nums ${top ? 'font-bold text-orange-400' : 'text-slate-500'}`}
            title={top ? 'In the top 5: the team figures use this character' : undefined}>
            {place.get(r.name)}
          </div>
        );
      },
    },
    {
      key: 'name', label: `${rows.length} character${rows.length === 1 ? '' : 's'}`, align: 'left', sort: false,
      width: isPhone ? 'minmax(0,1fr)' : 'minmax(200px,1fr)',
      cell: r => (
        <div className="flex min-w-0 items-center gap-2.5">
          <Portrait id={idFor(r.name)} name={r.name} size={34} dim={fade && isProvisionalTier(r)} />
          <span className="font-semibold leading-[1.2] text-slate-50 text-[13px] sm:text-[14px]">{r.name}</span>
        </div>
      ),
    },
    // Plain figures, no bars: a roster is read name by name, not ranked.
    ...shown.map(c => ({ key: c.key, label: c.label, short: c.short, width: widths[c.key], sort: true, cell: figure[c.key] })),
  ];

  return (
    <div>
      <StatTable columns={columns} rows={sorted} rowKey={r => r.name} sort={sort.key} dir={sort.dir} onSort={onSort}
        linkFor={r => linkFor(r.name)} isPhone={isPhone} />
      <p className="mb-0 mt-2.5 text-xs text-slate-500">
        {marks
          ? <>In <span className="font-bold text-orange-400">orange</span>: the top 5 by score, whose figures are the team's.</>
          : `The team figures are its top 5 by score: all ${rows.length} here.`}
      </p>
    </div>
  );
}

/** A position's count: muted when it never played there. */
function Slot({ n }) {
  return <div className={`text-right text-[14px] tabular-nums ${n ? 'text-slate-100' : 'text-slate-600'}`}>{n || '–'}</div>;
}
