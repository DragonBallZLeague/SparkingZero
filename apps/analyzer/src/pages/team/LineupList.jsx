import React from 'react';
import { Link } from 'react-router-dom';
import Portrait from '../../components/Portrait.jsx';
import TeamLogo from '../../components/TeamLogo.jsx';
import { BuildPill } from '../character/overview/BuildPicker.jsx';
import { CostBar } from '../meta/BuildsTable.jsx';
import { ShowMore } from '../../shell/tableParts.jsx';
import { teamName } from '../../utils/teams.js';
import { POSITION_NAMES, positionSlot } from '../../utils/positions.js';
import { tint, RESULT_COLORS } from '../../utils/overviewPalette.js';

const fmtInt = v => Math.round(v || 0).toLocaleString('en-US');
const fmtK = v => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v || 0)));

/** W / L, in the rank colours. */
export function ResultBadge({ won }) {
  return (
    <span className={`inline-flex h-5 w-5 flex-none items-center justify-center rounded text-[11px] font-bold ${
      won ? 'bg-rank-good/15 text-rank-good' : 'bg-rank-bad/15 text-rank-bad'}`}>
      {won ? 'W' : 'L'}
    </span>
  );
}

/**
 * The Team page's Lineups: each match the team played, newest first, with its
 * lineup and the opponent's under it, both Starter first, so each column is
 * one slot's matchup. A desktop shows each character's build-type pill and
 * damage dealt; a phone, five across, shows the capsule cost bar.
 *
 * Each side is its own band, headed by its team's logo and name (a label
 * column on a desktop, a line above on a phone). The team's own band is
 * tinted green or red by its result (the league, 2026-09-30), as the Match
 * page tints a team's header, and the opponent's is left plain, so the two
 * lineups never read as one team of six and the team's own reads first.
 *
 * `lineups` are teamLineups(), already searched; the first `shown` are drawn,
 * and "Show more" adds the next page. A match opens in the match viewer via
 * onOpenMatch; the opponent opens its Team page via teamLinkFor.
 */
export default function LineupList({ lineups, shown, onMore, tag, isPhone, idFor, onOpenMatch, teamLinkFor, empty }) {
  if (!lineups.length) {
    return <div className="rounded-[10px] border border-solid border-gray-700 bg-shell-panel p-7 text-center text-slate-400">{empty}</div>;
  }
  const list = lineups.slice(0, shown);
  return (
    <div className="rounded-[10px] border border-solid border-gray-700 bg-shell-panel">
      <div className="[&>*:last-child]:border-b-0">
        {list.map(l => {
          const n = Math.max(l.us.length, l.them.length, 5);
          const to = teamLinkFor && l.opponent ? teamLinkFor(l.opponent) : null;
          const name = onOpenMatch
            ? <button type="button" onClick={() => onOpenMatch(l.fileName)}
                className={`min-w-0 cursor-pointer border-0 bg-transparent p-0 text-left text-xs leading-[1.45] text-slate-400 hover:text-orange-400 hover:underline ${isPhone ? 'truncate' : 'line-clamp-2'}`}>{l.name}</button>
            : <span className={`min-w-0 text-xs leading-[1.45] text-slate-400 ${isPhone ? 'truncate' : 'line-clamp-2'}`}>{l.name}</span>;
          return (
            <div key={l.fileName}
              className={`border-0 border-b border-solid border-gray-700/50 ${isPhone ? 'px-2 py-2.5' : 'grid grid-cols-[150px_1fr] items-center gap-3 px-3.5 py-3'}`}>
              <div className={`flex min-w-0 gap-2 ${isPhone ? 'mb-1.5 items-center px-0.5' : 'items-start'}`}><ResultBadge won={l.won} />{name}</div>
              <div className="flex flex-col gap-1">
                <Side tag={tag} slots={l.us} n={n} isPhone={isPhone} idFor={idFor} result={RESULT_COLORS[l.won ? 'won' : 'lost']} />
                <Side tag={l.opponent} to={to} slots={l.them} n={n} isPhone={isPhone} idFor={idFor} opponent />
              </div>
            </div>
          );
        })}
      </div>
      <ShowMore left={lineups.length - list.length} onClick={onMore} />
    </div>
  );
}

/**
 * One side's lineup, Starter first, in a band headed by its team. The page's
 * own team's band is tinted in its result's colour (`result`), so the eye
 * lands on it first and reads the result without the badge.
 */
function Side({ tag, to = null, slots, n, isPhone, idFor, opponent = false, result = null }) {
  const Name = to ? Link : 'span';
  const label = (
    <div className="flex min-w-0 items-center gap-2">
      <TeamLogo tag={tag} size={isPhone ? 16 : 22} rounded={4} />
      {tag
        ? <Name to={to || undefined} title={teamName(tag)}
            className={`min-w-0 font-semibold no-underline ${isPhone ? 'truncate text-[11px]' : 'line-clamp-2 text-[12.5px] leading-[1.25]'} ${
              opponent ? 'text-slate-300 hover:underline' : 'text-slate-100'}`}>{teamName(tag)}</Name>
        : <span className={`text-slate-500 ${isPhone ? 'text-[11px]' : 'text-xs'}`}>No team name</span>}
    </div>
  );
  const band = 'rounded-[8px] border border-solid border-transparent';
  const bandStyle = result ? { background: tint(result, 0.09), borderColor: tint(result, 0.28) } : undefined;
  const cells = slots.map((s, i) => <Slot key={`${s.name}-${i}`} s={s} tag={tag} isPhone={isPhone} idFor={idFor} opponent={opponent} />);
  if (isPhone) {
    return (
      <div className={`px-1.5 py-1.5 ${band}`} style={bandStyle}>
        <div className="mb-1.5">{label}</div>
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${n}, minmax(0,1fr))` }}>{cells}</div>
      </div>
    );
  }
  return (
    <div className={`grid items-center gap-3 px-2 py-1.5 ${band}`} style={{ gridTemplateColumns: `128px repeat(${n}, minmax(0,1fr))`, ...bandStyle }}>
      <div className="flex self-stretch items-center border-0 border-r border-solid border-gray-700 pr-2.5"
        style={{ borderColor: result ? tint(result, 0.28) : undefined }}>{label}</div>
      {cells}
    </div>
  );
}

/** One character in a lineup. */
function Slot({ s, tag, isPhone, idFor, opponent }) {
  const pos = POSITION_NAMES[positionSlot(s.position)] || 'Position ?';
  const label = s.buildComposition?.label || 'No Build';
  const title = [
    `${teamName(tag) ? `${teamName(tag)}, ` : ''}${pos}: ${s.name}`,
    `${label}, ${s.aiStrategy || 'Default'}`,
    `${fmtInt(s.damageDone)} damage dealt, ${fmtInt(s.damageTaken)} taken`,
  ].join('\n');
  return (
    <div title={title} className={`flex min-w-0 ${isPhone ? 'flex-col items-center gap-1 text-center' : 'items-center gap-2'}`}>
      <Portrait id={idFor(s.name)} name={s.name} size={isPhone ? 36 : 32} />
      <div className={`min-w-0 ${isPhone ? 'w-full' : ''}`}>
        <div className={`leading-[1.2] ${opponent ? 'text-slate-300' : 'text-slate-100'} ${
          isPhone ? 'line-clamp-2 text-[10.5px]' : 'truncate text-[12.5px] font-semibold'}`}>{s.name}</div>
        {isPhone
          ? <CostBar capsules={(s.equippedCapsules || []).map(c => ({ name: c.name, cost: c.capsule?.cost || 0, type: String(c.capsule?.buildType || '').toLowerCase() }))} className="mt-1 w-full" />
          : (
            <div className="mt-1 flex min-w-0 items-center gap-1.5">
              <BuildPill label={label} darkMode compact />
              <span className="text-[11px] leading-[1.45] text-slate-400 tabular-nums">{fmtK(s.damageDone)}</span>
            </div>
          )}
      </div>
    </div>
  );
}
