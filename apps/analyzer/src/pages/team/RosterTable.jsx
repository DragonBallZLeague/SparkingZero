import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Portrait from '../../components/Portrait.jsx';
import TierScorePill from '../../components/TierScorePill.jsx';
import { isProvisionalTier, tierMatchCount, fadesThinSamples } from '../../utils/performanceTier.js';
import { HEAD, SortHead } from '../../shell/tableParts.jsx';
import { NAV_H, SCOPE_H } from '../../shell/ScopeBar.jsx';

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

  const shown = isPhone ? ['score', 'matches', 'eff'].map(col) : COLS;
  const cols = isPhone
    ? '16px minmax(0,1fr) 58px 48px 50px'
    : '22px minmax(200px,1fr) 66px 64px 60px 60px 60px 92px 80px 56px';
  const grid = { display: 'grid', gridTemplateColumns: cols, alignItems: 'center', columnGap: isPhone ? 8 : 12 };
  const num = 'text-right text-[14px] text-slate-100 tabular-nums';

  return (
    <div>
      <div className="rounded-[10px] border border-solid border-gray-700 bg-shell-panel">
        <div className="sticky z-10 min-h-[38px] rounded-t-[10px] border-0 border-b border-solid border-gray-700 bg-shell-panel px-2.5 sm:px-3.5"
          style={{ ...grid, top: NAV_H + SCOPE_H }}>
          <div className={`${HEAD} text-right text-slate-400`} title="Place on the team, by score">#</div>
          <div className={`${HEAD} text-slate-400`}>{rows.length} character{rows.length === 1 ? '' : 's'}</div>
          {shown.map(c => (
            <SortHead key={c.key} label={isPhone && c.short ? c.short : c.label} on={sort.key === c.key} dir={sort.dir} onClick={() => onSort(c.key)} />
          ))}
        </div>
        {sorted.map(r => {
          const prov = fade && isProvisionalTier(r);
          const top = marks && inTop5.has(r.name);
          const to = linkFor(r.name);
          const Row = to ? Link : 'div';
          return (
            <Row key={r.name} to={to || undefined} style={grid}
              className="min-h-[46px] px-2.5 sm:px-3.5 no-underline text-inherit border-0 border-b border-solid border-gray-700/50 last:border-b-0 hover:bg-slate-400/5">
              <div className={`text-right text-xs tabular-nums ${top ? 'font-bold text-orange-400' : 'text-slate-500'}`}
                title={top ? 'In the top 5: the team figures use this character' : undefined}>
                {place.get(r.name)}
              </div>
              <div className="flex min-w-0 items-center gap-2.5">
                <Portrait id={idFor(r.name)} name={r.name} size={34} dim={prov} />
                <span className="font-semibold leading-[1.2] text-slate-50 text-[13px] sm:text-[14px]">{r.name}</span>
              </div>
              <div className="text-right"><TierScorePill score={r.combatPerformanceScore} provisional={prov} /></div>
              <div className={num}>{tierMatchCount(r)}</div>
              {!isPhone && [1, 2, 3].map(p => (
                <div key={p} className={`text-right text-[14px] tabular-nums ${r.positions[p] ? 'text-slate-100' : 'text-slate-600'}`}>
                  {r.positions[p] || '–'}
                </div>
              ))}
              {!isPhone && <div className={num}>{fmtInt(r.avgDamage)}</div>}
              <div className={num}>{(r.efficiency || 0).toFixed(2)}×</div>
              {!isPhone && <div className="text-right text-[14px] text-slate-400 tabular-nums">{Math.round(r.winRate || 0)}%</div>}
            </Row>
          );
        })}
      </div>
      <p className="mb-0 mt-2.5 text-xs text-slate-500">
        {marks
          ? <>In <span className="font-bold text-orange-400">orange</span>: the top 5 by score, whose figures are the team's.</>
          : `The team figures are its top 5 by score: all ${rows.length} here.`}
      </p>
    </div>
  );
}
