import React from 'react';
import { Link } from 'react-router-dom';
import Portrait from '../../components/Portrait.jsx';
import TeamLogo from '../../components/TeamLogo.jsx';
import { HEAD, ShowMore } from '../../shell/tableParts.jsx';
import { useMediaQuery } from '../../shell/useMediaQuery.js';
import { ResultBadge } from '../team/LineupList.jsx';
import { teamName } from '../../utils/teams.js';

// A side's line: result badge, logo, team name, then the lineup strip.
const BADGE = 20, LOGO = 18, GAP = 8, FACE = 26, FACE_GAP = 4;
const stripWidth = n => n * FACE + (n - 1) * FACE_GAP;

/** Below this the size, difficulty and map move under the match's name. */
const NARROW_QUERY = '(max-width: 1023px)';

/**
 * The Matches list: one row per match, which opens its Match page. Each side
 * gets a line of its own, headed by its result and its team, with its lineup
 * Starter first, so who beat whom reads at a glance. A wide screen adds the
 * size, difficulty and map as columns; a narrower one puts them under the
 * match's name, and a phone on the name's line.
 *
 * The Teams column is exactly as wide as its widest line: the lineup strip
 * cannot shrink, so a column that did would push it over the next one.
 *
 * `rows` are matchRows(), already searched; the first `shown` are drawn.
 */
export default function MatchList({ rows, shown, onMore, isPhone, linkFor, empty }) {
  const narrow = useMediaQuery(NARROW_QUERY);
  if (!rows.length) {
    return <div className="rounded-[10px] border border-solid border-gray-700 bg-shell-panel p-7 text-center text-slate-400">{empty}</div>;
  }
  const list = rows.slice(0, shown);
  const nameW = narrow ? 132 : 160;
  const most = Math.max(1, ...list.map(r => Math.max(...r.sides.map(s => s.lineup.length))));
  const teamsW = BADGE + LOGO + nameW + stripWidth(most) + 3 * GAP;
  const cols = 'grid items-center gap-4';
  const template = {
    gridTemplateColumns: narrow ? `minmax(0,1fr) ${teamsW}px` : `minmax(150px,230px) ${teamsW}px 52px 80px minmax(0,1fr)`,
  };
  return (
    <div className="rounded-[10px] border border-solid border-gray-700 bg-shell-panel">
      {!isPhone && (
        <div className={`${cols} border-0 border-b border-solid border-gray-700 px-3.5 py-2.5 text-slate-400`} style={template}>
          <span className={HEAD}>Match</span>
          <span className={HEAD}>Teams</span>
          {!narrow && <span className={HEAD}>Size</span>}
          {!narrow && <span className={HEAD}>Difficulty</span>}
          {!narrow && <span className={HEAD}>Map</span>}
        </div>
      )}
      <div className="[&>*:last-child]:border-b-0">
        {list.map(r => {
          const n = Math.max(...r.sides.map(s => s.lineup.length));
          return (
          <Link key={r.path} to={linkFor(r)} style={isPhone ? undefined : template}
            className={`block border-0 border-b border-solid border-gray-700/50 text-inherit no-underline hover:bg-slate-400/[.05] ${
              isPhone ? 'px-3 py-2.5' : `${cols} px-3.5 py-2.5`}`}>
            {isPhone ? (
              <>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-[13px] font-semibold text-slate-100">{r.name}</span>
                  <span className="flex flex-none gap-2 text-[11px] text-slate-500">
                    <span>{r.size}</span>
                    {r.difficulty && <span>{r.difficulty}</span>}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {r.sides.map(s => <SideLine key={s.side} s={s} n={n} isPhone />)}
                </div>
              </>
            ) : narrow ? (
              <>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="line-clamp-2 text-[13px] font-semibold leading-[1.35] text-slate-100">{r.name}</span>
                  <span className="flex min-w-0 gap-2.5 text-[12px] text-slate-400">
                    <span className="flex-none tabular-nums">{r.size}</span>
                    {r.difficulty && <span className="flex-none">{r.difficulty}</span>}
                    {r.map && <span className="truncate" title={r.map}>{r.map}</span>}
                  </span>
                </span>
                <div className="flex min-w-0 flex-col gap-1">
                  {r.sides.map(s => <SideLine key={s.side} s={s} n={n} nameW={nameW} />)}
                </div>
              </>
            ) : (
              <>
                <span className="line-clamp-2 text-[13px] font-semibold leading-[1.35] text-slate-100">{r.name}</span>
                <div className="flex min-w-0 flex-col gap-1">
                  {r.sides.map(s => <SideLine key={s.side} s={s} n={n} nameW={nameW} />)}
                </div>
                <span className="text-[13px] tabular-nums text-slate-300">{r.size}</span>
                <span className="text-[13px] text-slate-300">{r.difficulty || '—'}</span>
                <span className="truncate text-[13px] text-slate-300" title={r.map || ''}>{r.map || '—'}</span>
              </>
            )}
          </Link>
          );
        })}
      </div>
      <ShowMore left={rows.length - list.length} onClick={onMore} />
    </div>
  );
}

/**
 * One side of a match: its result, its team, then its lineup, Starter first,
 * in a strip `n` slots wide, so the two sides line up slot by slot even when
 * one fielded fewer.
 */
function SideLine({ s, n, isPhone = false, nameW = 160 }) {
  const size = isPhone ? 24 : FACE;
  const gap = isPhone ? 2 : FACE_GAP;
  return (
    <div className="flex min-w-0 items-center gap-2">
      {s.won == null ? <span className="h-5 w-5 flex-none" /> : <ResultBadge won={s.won} />}
      <TeamLogo tag={s.tag} size={LOGO} rounded={4} />
      <span style={isPhone ? undefined : { width: nameW }} className={`min-w-0 truncate text-[13px] ${isPhone ? 'flex-1' : 'flex-none'} ${
        !s.tag ? 'text-slate-500' : s.won === false ? 'text-slate-400' : 'font-semibold text-slate-100'}`}>
        {s.tag ? teamName(s.tag) : 'No team name'}
      </span>
      <span className="flex flex-none" style={{ gap, width: n * size + (n - 1) * gap }}>
        {s.lineup.map((c, i) => (
          <span key={`${c.id}-${i}`} title={c.name}>
            <Portrait id={c.id} name={c.name} size={size} rounded={5} />
          </span>
        ))}
      </span>
    </div>
  );
}
