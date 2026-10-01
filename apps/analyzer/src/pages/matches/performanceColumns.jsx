import React from 'react';
import Portrait from '../../components/Portrait.jsx';
import TeamLogo from '../../components/TeamLogo.jsx';
import TierScorePill from '../../components/TierScorePill.jsx';
import { BuildPill } from '../character/overview/BuildPicker.jsx';
import { CostBar } from '../meta/BuildsTable.jsx';
import { ResultBadge } from '../team/LineupList.jsx';
import { capsulesOf } from '../match/CharacterDetail.jsx';
import { RANK_COLUMN } from '../../shell/StatTable.jsx';
import { POSITION_NAMES } from '../../utils/positions.js';
import { teamName } from '../../utils/teams.js';
import { perfStatByKey, statsOfGroup } from './performanceRows.js';

/**
 * The columns of a table of performances (shell/StatTable.jsx), shared by the
 * Performances view of /matches and the Character page's Matches tab.
 *
 * `layout`:
 *   'wide'     #, who, the match (vs the opponent and the map under it), W/L,
 *              the score, then the group's figures
 *   'mid'      who with the match and result folded into its second line,
 *              the score, the group's figures
 *   'compact'  as 'mid', with the two `picked` stats in place of the group
 *
 * "Who" is the character (portrait, name, team and position) or, with
 * `withCharacter` false (one character's own matches), the match itself, with
 * the result, position, opponent (and map, when wide) under it; `multiTeam`
 * adds the team there when the character played for more than one.
 * `count` heads the compact layout's first column.
 */

/** A small W / L, for a row's second line. */
function Res({ won }) {
  return (
    <span className={`inline-flex h-4 w-4 flex-none items-center justify-center rounded-[3px] text-[10px] font-bold leading-none ${
      won ? 'bg-rank-good/15 text-rank-good' : 'bg-rank-bad/15 text-rank-bad'}`}>
      {won ? 'W' : 'L'}
    </span>
  );
}

const sub = 'mt-0.5 flex min-w-0 items-center gap-1.5 text-[12px] leading-[1.3] text-slate-400';
const pos = r => POSITION_NAMES[r.position] || '–';

export function performanceColumns({ layout, group, picked = [], idFor = () => null, count = 0, withCharacter = true, multiTeam = false }) {
  const noun = withCharacter ? 'performance' : 'match';
  const countLabel = `${count.toLocaleString('en-US')} ${noun}${count === 1 ? '' : noun === 'match' ? 'es' : 's'}`;
  const title = r => `${withCharacter ? `${r.name}, ` : ''}${pos(r)} for ${teamName(r.team) || 'no team'} vs ${teamName(r.opponent) || 'no team'}: ${r.match}${r.map ? `, ${r.map}` : ''}`;

  let who;
  if (withCharacter) {
    who = {
      key: 'name', align: 'left', sort: true,
      label: layout === 'compact' ? countLabel : 'Character',
      width: layout === 'wide' ? 'minmax(190px,1.6fr)' : layout === 'mid' ? 'minmax(200px,4fr)' : 'minmax(0,1fr)',
      cell: r => (
        <div className="flex min-w-0 items-center gap-2.5" title={title(r)}>
          <Portrait id={idFor(r.name)} name={r.name} size={34} />
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold leading-[1.2] text-slate-50 sm:text-[14px]">{r.name}</div>
            <div className={sub}>
              {layout === 'wide' ? (
                <>
                  <TeamLogo tag={r.team} size={14} rounded={3} />
                  <span className="truncate">{teamName(r.team) || 'No team'} · {pos(r)}</span>
                </>
              ) : (
                <>
                  <Res won={r.won} />
                  <span className="truncate">{layout === 'mid' ? `${teamName(r.team) || 'No team'} · ` : ''}{r.match}</span>
                </>
              )}
            </div>
          </div>
        </div>
      ),
    };
  } else {
    // One character's matches: the match leads, with the result, position and
    // opponent under it, and its team only when it played for more than one
    // (`multiTeam`); every row would say the same otherwise.
    who = {
      key: 'match', align: 'left', sort: true,
      label: layout === 'compact' ? countLabel : 'Match',
      width: layout === 'wide' ? 'minmax(280px,3fr)' : layout === 'mid' ? 'minmax(200px,4fr)' : 'minmax(0,1fr)',
      cell: r => (
        <div className="min-w-0" title={title(r)}>
          <div className="truncate text-[13px] font-semibold leading-[1.25] text-slate-50">{r.match}</div>
          <div className={sub}>
            <Res won={r.won} />
            <span className="truncate">
              {multiTeam ? `${teamName(r.team) || 'No team'} · ` : ''}{pos(r)} · vs {teamName(r.opponent) || 'no team'}
              {layout === 'wide' && r.map ? ` · ${r.map}` : ''}
            </span>
          </div>
        </div>
      ),
    };
  }

  const match = {
    key: 'match', label: 'Match', align: 'left', sort: true, width: 'minmax(210px,2fr)',
    cell: r => (
      <div className="min-w-0">
        <div className="truncate text-[13px] leading-[1.3] text-slate-100">{r.match}</div>
        <div className={sub}>
          <span className="flex-none">vs</span>
          <TeamLogo tag={r.opponent} size={14} rounded={3} />
          <span className="truncate">{teamName(r.opponent) || 'No team'}{r.map ? ` · ${r.map}` : ''}</span>
        </div>
      </div>
    ),
  };
  const result = {
    key: 'res', label: '', title: 'Result', width: '20px', sort: false,
    cell: r => <div className="flex justify-end"><ResultBadge won={r.won} /></div>,
  };
  const score = {
    key: 'score', label: 'Score', width: layout === 'compact' ? '56px' : '66px', sort: true,
    cell: r => <div className="flex justify-end"><TierScorePill score={r.score} /></div>,
  };
  const statWidth = layout === 'wide' ? 'minmax(64px,1fr)' : 'minmax(56px,1fr)';
  const stat = s => ({ ...s, width: layout === 'compact' ? '58px' : statWidth });

  let figures;
  if (layout === 'compact') figures = picked.map(perfStatByKey).filter(Boolean).map(stat);
  else if (group === 'build') {
    const text = get => r => <div className="truncate text-left text-[13px] text-slate-300" title={get(r) || ''}>{get(r) || '–'}</div>;
    figures = [
      {
        key: 'build', label: 'Build', align: 'left', sort: false, width: 'minmax(140px,1.2fr)',
        cell: r => (
          <div className="flex min-w-0 flex-col gap-1">
            <BuildPill label={r.build} compact className="self-start" />
            <CostBar capsules={capsulesOf(r.m)} className="w-full max-w-[140px]" />
          </div>
        ),
      },
      { key: 'ai', label: 'AI strategy', align: 'left', sort: false, width: 'minmax(100px,1fr)', cell: text(r => r.ai) },
      {
        // The path, with how many transformations it holds (fusions included)
        // in front, sorted by that count (the plan's "Transformations" step 4).
        key: 'forms', label: 'Forms', align: 'left', sort: true, width: 'minmax(140px,1.4fr)', title: perfStatByKey('forms').title,
        cell: r => (r.forms ? (
          <div className="flex min-w-0 items-baseline gap-1.5 text-[13px]" title={`${r.transforms} transformation${r.transforms === 1 ? '' : 's'}: ${r.forms}`}>
            <b className="flex-none font-semibold tabular-nums text-slate-100">{r.transforms}</b>
            <span className="truncate text-slate-300">→ {r.forms}</span>
          </div>
        ) : <div className="text-[13px] text-slate-300">–</div>),
      },
      ...statsOfGroup('build').filter(s => s.key !== 'forms').map(stat),
    ];
  } else figures = statsOfGroup(group).map(stat);

  if (layout === 'wide') return withCharacter ? [RANK_COLUMN, who, match, result, score, ...figures] : [RANK_COLUMN, who, score, ...figures];
  return [who, score, ...figures];
}
