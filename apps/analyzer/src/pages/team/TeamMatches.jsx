import React from 'react';
import { Link } from 'react-router-dom';
import TeamLogo from '../../components/TeamLogo.jsx';
import { HEAD, ShowMore } from '../../shell/tableParts.jsx';
import { teamName } from '../../utils/teams.js';
import { matchName, mmss } from '../teams/teamRows.js';
import { ResultBadge } from './LineupList.jsx';

const fmtInt = v => Math.round(v || 0).toLocaleString('en-US');

/**
 * The Team page's Matches: the team's matches, newest first, with its damage
 * dealt and taken, HP kept and the match time. A row opens the match in the
 * match viewer; the opponent opens its Team page (`teamLinkFor(tag)`, null in
 * the Sandbox).
 *
 * `matches` are teamMatchList(), already searched; the first `shown` are
 * drawn, and "Show more" adds the next page. Each match's figures are the
 * whole lineup's.
 */
export default function TeamMatches({ matches, shown, onMore, isPhone, teamLinkFor, onOpenMatch, empty }) {
  if (!matches.length) {
    return <div className="rounded-[10px] border border-solid border-gray-700 bg-shell-panel p-7 text-center text-slate-400">{empty}</div>;
  }
  const list = matches.slice(0, shown);
  const cols = isPhone ? '20px minmax(0,1fr) 64px' : '20px minmax(0,1.4fr) minmax(0,1fr) 84px 84px 64px 56px';
  const grid = { display: 'grid', gridTemplateColumns: cols, alignItems: 'center', columnGap: isPhone ? 8 : 12 };
  const num = 'text-right text-[14px] text-slate-100 tabular-nums';
  const row = 'min-h-[42px] px-2.5 sm:px-3.5 border-0 border-b border-solid border-gray-700/50';

  return (
    <div className="rounded-[10px] border border-solid border-gray-700 bg-shell-panel">
      <div className={`min-h-[34px] px-2.5 sm:px-3.5 border-0 border-b border-solid border-gray-700 ${HEAD} text-slate-400`} style={grid}>
        <div />
        <div>Match</div>
        {isPhone ? <div className="text-right">Dealt</div> : (
          <><div>Opponent</div><div className="text-right">Dealt</div><div className="text-right">Taken</div><div className="text-right">HP kept</div><div className="text-right">Time</div></>
        )}
      </div>
      <div className="[&>*:last-child]:border-b-0">
        {list.map(m => {
          const open = onOpenMatch && m.fileName ? () => onOpenMatch(m.fileName) : null;
          const to = teamLinkFor ? teamLinkFor(m.opponent) : null;
          const opp = teamName(m.opponent) || 'No team name';
          return (
            <div key={m.fileName} className={`${row} ${open ? 'hover:bg-slate-400/5' : ''}`} style={grid}>
              <ResultBadge won={m.result === 'Win'} />
              <div className="min-w-0">
                {open
                  ? <button type="button" onClick={open} title="Open this match"
                      className="block max-w-full cursor-pointer truncate border-0 bg-transparent p-0 text-left text-[13px] leading-[1.45] text-slate-100 hover:text-orange-400 hover:underline">{matchName(m.fileName)}</button>
                  : <div className="truncate text-[13px] text-slate-100">{matchName(m.fileName)}</div>}
                {isPhone && <div className="truncate text-xs text-slate-400">vs {opp}</div>}
              </div>
              {isPhone ? <div className={num}>{fmtInt(m.damageDealt)}</div> : (
                <>
                  <div className="flex min-w-0 items-center gap-2">
                    <TeamLogo tag={m.opponent} size={20} rounded={4} />
                    {to
                      ? <Link to={to} className="truncate text-[13px] text-slate-300 no-underline hover:underline">{opp}</Link>
                      : <span className={`truncate text-[13px] ${m.opponent ? 'text-slate-300' : 'text-slate-500'}`}>{opp}</span>}
                  </div>
                  <div className={num}>{fmtInt(m.damageDealt)}</div>
                  <div className={num}>{fmtInt(m.damageTaken)}</div>
                  <div className={num}>{m.healthMax ? Math.round((m.healthRemaining / m.healthMax) * 100) : 0}%</div>
                  <div className={num}>{mmss(m.battleDuration)}</div>
                </>
              )}
            </div>
          );
        })}
      </div>
      <ShowMore left={matches.length - list.length} onClick={onMore} />
    </div>
  );
}
