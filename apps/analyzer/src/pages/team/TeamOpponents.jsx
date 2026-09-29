import React, { useMemo, useState } from 'react';
import TeamLogo from '../../components/TeamLogo.jsx';
import { HEAD, SortHead, StatCell } from '../../shell/tableParts.jsx';
import { NAV_H, SCOPE_H } from '../../shell/ScopeBar.jsx';
import { teamName } from '../../utils/teams.js';
import { placements } from '../characters/characterRows.js';
import { teamStatByKey } from '../teams/teamRows.js';

/** The figures each opponent row shows, in order; a phone shows two. */
const STATS = ['win', 'dmg', 'taken', 'eff', 'dps', 'hp', 'time'].map(teamStatByKey);
const PHONE_STATS = ['win', 'eff'].map(teamStatByKey);
const PLAYED = { key: 'played', get: r => r.matches };

/**
 * The Team page's Opponents: one row per team it played, with its figures in
 * those matches only - the same top-5 figures as its overall row, so a row
 * reads against the header's tiles. Colour marks the matchups at the top and
 * bottom fifth of the team's own.
 *
 * A row is a filter: picking it scopes the whole page to that opponent (`vs`
 * in the URL, and the Opponent chip in the scope bar); picking it again clears
 * it. `rows` are opponentRows(); `vs` the picked opponent's tag.
 */
export default function TeamOpponents({ rows, vs, onPick, isPhone }) {
  const [sort, setSort] = useState({ key: 'played', dir: 'desc' });
  const stat = sort.key === 'played' ? PLAYED : teamStatByKey(sort.key);
  const sorted = useMemo(() => {
    const sign = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => sign * (stat.get(a) - stat.get(b)) || b.matches - a.matches || teamName(a.opp).localeCompare(teamName(b.opp)));
  }, [rows, sort, stat]);
  const place = useMemo(() => Object.fromEntries(STATS.map(s => [s.key, placements(rows, s)])), [rows]);
  const max = useMemo(() => Object.fromEntries(STATS.map(s => [s.key, Math.max(0, ...rows.map(s.get))])), [rows]);
  const onSort = key => setSort(s => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }));

  if (!rows.length) {
    return <div className="rounded-[10px] border border-solid border-gray-700 bg-shell-panel p-7 text-center text-slate-400">No opponents in this scope.</div>;
  }

  const stats = isPhone ? PHONE_STATS : STATS;
  const cols = isPhone
    ? 'minmax(0,1fr) 54px 58px'
    : `minmax(200px,1.6fr) 56px 64px repeat(${stats.length}, minmax(64px,1fr))`;
  const grid = { display: 'grid', gridTemplateColumns: cols, alignItems: 'center', columnGap: isPhone ? 8 : 12 };
  const head = (key, label, left = false) => <SortHead label={label} on={sort.key === key} dir={sort.dir} onClick={() => onSort(key)} left={left} />;

  return (
    <div>
      <div className="rounded-[10px] border border-solid border-gray-700 bg-shell-panel">
        <div className="sticky z-10 min-h-[38px] rounded-t-[10px] border-0 border-b border-solid border-gray-700 bg-shell-panel px-2.5 sm:px-3.5"
          style={{ ...grid, top: NAV_H + SCOPE_H }}>
          <div className={`${HEAD} text-slate-400`}>{rows.length} opponent{rows.length === 1 ? '' : 's'}</div>
          {!isPhone && head('played', 'Played')}
          {!isPhone && <div className={`${HEAD} text-right text-slate-400`}>Record</div>}
          {stats.map(s => <React.Fragment key={s.key}>{head(s.key, isPhone ? s.short : s.label)}</React.Fragment>)}
        </div>
        <div className="[&>*:last-child]:border-b-0">
          {sorted.map(r => {
            const on = r.opp === vs;
            return (
              <button key={r.opp} type="button" onClick={() => onPick(on ? null : r.opp)} aria-pressed={on} style={grid}
                title={on ? 'Show every opponent again' : `Show the whole page against ${teamName(r.opp)}`}
                className={`w-full min-h-[46px] cursor-pointer px-2.5 text-left [font:inherit] text-inherit sm:px-3.5 border-0 border-b border-solid border-gray-700/50 ${
                  on ? 'bg-brand/[.08] shadow-[inset_3px_0_0_#f97316]' : 'bg-transparent hover:bg-slate-400/5'}`}>
                <div className="flex min-w-0 items-center gap-2.5">
                  <TeamLogo tag={r.opp} size={30} rounded={6} />
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold leading-[1.2] text-slate-50 sm:text-[14px]">{teamName(r.opp)}</div>
                    {isPhone && <div className="mt-0.5 text-xs text-slate-400 tabular-nums">{r.wins}–{r.losses}</div>}
                  </div>
                </div>
                {!isPhone && <div className="text-right text-[14px] text-slate-100 tabular-nums">{r.matches}</div>}
                {!isPhone && <div className="text-right text-[14px] text-slate-100 tabular-nums">{r.wins}–{r.losses}</div>}
                {stats.map(s => {
                  const v = s.get(r);
                  return <StatCell key={s.key} text={s.fmt(v)} value={v} max={max[s.key]} p={place[s.key](v)} />;
                })}
              </button>
            );
          })}
        </div>
      </div>
      <p className="mb-0 mt-2.5 text-xs text-slate-500">Pick a team to see this whole page against it.</p>
    </div>
  );
}
