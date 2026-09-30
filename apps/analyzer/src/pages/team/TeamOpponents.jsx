import React, { useMemo, useState } from 'react';
import TeamLogo from '../../components/TeamLogo.jsx';
import StatTable from '../../shell/StatTable.jsx';
import { teamName } from '../../utils/teams.js';
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
  const onSort = key => setSort(s => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }));

  if (!rows.length) {
    return <div className="rounded-[10px] border border-solid border-gray-700 bg-shell-panel p-7 text-center text-slate-400">No opponents in this scope.</div>;
  }

  const stats = isPhone ? PHONE_STATS : STATS;
  const num = 'text-right text-[14px] text-slate-100 tabular-nums';
  const columns = [
    {
      key: 'opp', label: `${rows.length} opponent${rows.length === 1 ? '' : 's'}`, align: 'left', sort: false,
      width: isPhone ? 'minmax(0,1fr)' : 'minmax(200px,1.6fr)',
      cell: r => (
        <div className="flex min-w-0 items-center gap-2.5">
          <TeamLogo tag={r.opp} size={30} rounded={6} />
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold leading-[1.2] text-slate-50 sm:text-[14px]">{teamName(r.opp)}</div>
            {isPhone && <div className="mt-0.5 text-xs text-slate-400 tabular-nums">{r.wins}–{r.losses}</div>}
          </div>
        </div>
      ),
    },
    ...(isPhone ? [] : [
      { key: 'played', label: 'Played', width: '56px', sort: true, cell: r => <div className={num}>{r.matches}</div> },
      { key: 'record', label: 'Record', width: '64px', sort: false, cell: r => <div className={num}>{r.wins}–{r.losses}</div> },
    ]),
    ...stats.map((s, i) => ({ ...s, width: isPhone ? ['54px', '58px'][i] || '58px' : 'minmax(64px,1fr)' })),
  ];

  return (
    <div>
      <StatTable columns={columns} rows={sorted} pool={rows} rowKey={r => r.opp} sort={sort.key} dir={sort.dir} onSort={onSort}
        onPick={r => onPick(r.opp === vs ? null : r.opp)} selected={vs || null} isPhone={isPhone}
        rowTitle={r => (r.opp === vs ? 'Show every opponent again' : `Show the whole page against ${teamName(r.opp)}`)} />
      <p className="mb-0 mt-2.5 text-xs text-slate-500">Pick a team to see this whole page against it.</p>
    </div>
  );
}
