import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { APPS } from '@szl/ui';
import TeamLogo from '../components/TeamLogo.jsx';
import { useQueryUpdate } from '../shell/useQueryUpdate.js';
import { useIsPhone } from '../shell/useMediaQuery.js';
import { NAV_H, SCOPE_H } from '../shell/ScopeBar.jsx';
import { HEAD, SortHead, StatCell } from '../shell/tableParts.jsx';
import { placements } from './characters/characterRows.js';
import { TEAM_STATS, teamStatByKey, readTeamSort, sortTeams } from './teams/teamRows.js';

/** The two stats a phone shows beside the team. */
const PHONE_STATS = ['win', 'eff'];

/**
 * /teams: one row per team in the scope - logo, name, record, then win %,
 * damage dealt and taken, efficiency, DPS, HP kept, match time, tags and
 * characters used ("Page-by-page review" in the redesign plan). It replaced the
 * expanding team cards. The figures are each team's top 5's, as the league
 * reads them (pages/teams/teamRows.js).
 *
 * The same table as Characters: white numbers over a thin bar that turns
 * green or red only for the top or bottom fifth, a sticky header, and the sort
 * in the URL (`sort`, `dir`). Win % leads and is the default sort, since it
 * is a team measure. A row opens the Team page, through `linkFor(tag)` (null in
 * the Sandbox, where rows are plain).
 */
export default function TeamsPage({ rows: allRows, linkFor, loading }) {
  const [params] = useSearchParams();
  const update = useQueryUpdate();
  const isPhone = useIsPhone();
  const { sort, dir } = readTeamSort(params);
  const rows = useMemo(() => sortTeams(allRows, { sort, dir }), [allRows, sort, dir]);
  const place = useMemo(() => Object.fromEntries(TEAM_STATS.map(s => [s.key, placements(allRows, s)])), [allRows]);
  const max = useMemo(() => Object.fromEntries(TEAM_STATS.map(s => [s.key, Math.max(0, ...allRows.map(s.get))])), [allRows]);

  const onSort = key => update(p => {
    const defaultDir = key === 'name' ? 'asc' : 'desc';
    const nextDir = sort === key ? (dir === 'asc' ? 'desc' : 'asc') : defaultDir;
    if (key === 'win' && nextDir === 'desc') { p.delete('sort'); p.delete('dir'); return; }
    p.set('sort', key);
    if (nextDir === defaultDir) p.delete('dir'); else p.set('dir', nextDir);
  });

  if (!allRows.length) {
    return (
      <div className="rounded-[10px] border border-solid border-gray-700 bg-shell-panel px-6 py-8 text-center text-slate-400">
        {loading ? 'Loading match data…' : 'No teams in this scope. Widen the filters above.'}
      </div>
    );
  }

  const stats = isPhone ? PHONE_STATS.map(teamStatByKey) : TEAM_STATS;
  const cols = isPhone
    ? 'minmax(0,1fr) 54px 58px'
    : `28px minmax(220px,2fr) 64px repeat(${stats.length}, minmax(64px,1fr))`;
  const grid = { display: 'grid', gridTemplateColumns: cols, alignItems: 'center', columnGap: isPhone ? 8 : 12 };
  const head = (key, label, left = false) => <SortHead label={label} on={sort === key} dir={dir} onClick={() => onSort(key)} left={left} />;

  return (
    <div>
      <div className="rounded-[10px] border border-solid border-gray-700 bg-shell-panel">
        <div className="sticky z-10 min-h-[38px] rounded-t-[10px] border-0 border-b border-solid border-gray-700 bg-shell-panel px-2.5 sm:px-3.5"
          style={{ ...grid, top: NAV_H + SCOPE_H }}>
          {!isPhone && <div className={`${HEAD} text-right text-slate-400`}>#</div>}
          {/* The header carries the count: the page has no control row to hold it. */}
          {head('name', `${rows.length} team${rows.length === 1 ? '' : 's'}`, true)}
          {!isPhone && <div className={`${HEAD} text-right text-slate-400`}>Record</div>}
          {stats.map(s => <React.Fragment key={s.key}>{head(s.key, isPhone ? s.short : s.label)}</React.Fragment>)}
        </div>
        {rows.map((r, i) => {
          const to = linkFor(r.tag);
          const Row = to ? Link : 'div';
          return (
            <Row key={r.tag} to={to || undefined} style={grid}
              className="min-h-[46px] px-2.5 sm:px-3.5 no-underline text-inherit border-0 border-b border-solid border-gray-700/50 last:border-b-0 hover:bg-slate-400/5">
              {!isPhone && <div className="text-right text-xs text-slate-500 tabular-nums">{i + 1}</div>}
              <div className="flex min-w-0 items-center gap-2.5">
                <TeamLogo tag={r.tag} size={34} />
                <div className="min-w-0">
                  <div className="font-semibold leading-[1.2] text-slate-50 text-[13px] sm:text-[14px]">{r.name}</div>
                  {isPhone && <div className="mt-0.5 text-xs text-slate-400 tabular-nums">{r.wins}–{r.losses}</div>}
                </div>
              </div>
              {!isPhone && <div className="text-right text-[14px] text-slate-100 tabular-nums">{r.wins}–{r.losses}</div>}
              {stats.map(s => {
                const v = s.get(r);
                return <StatCell key={s.key} text={s.fmt(v)} value={v} max={max[s.key]} p={place[s.key](v)} />;
              })}
            </Row>
          );
        })}
      </div>
      {/* Standings stay the website's (the redesign plan): linked, not duplicated. */}
      <p className="mt-2.5 mb-0 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>Each team's figures are its top 5 characters' by score, per match.</span>
        <a href={`${APPS.find(a => a.key === 'home').href}season`} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-orange-400 no-underline hover:underline">
          League standings <ExternalLink className="h-3 w-3" />
        </a>
      </p>
    </div>
  );
}
