import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import Portrait from '../../components/Portrait.jsx';
import TeamLogo from '../../components/TeamLogo.jsx';
import TierScorePill from '../../components/TierScorePill.jsx';
import CharacterDetail, { capsulesOf } from './CharacterDetail.jsx';
import { BuildPill } from '../character/overview/BuildPicker.jsx';
import { CostBar } from '../meta/BuildsTable.jsx';
import { ResultBadge } from '../team/LineupList.jsx';
import { HEAD } from '../../shell/tableParts.jsx';
import { POSITION_NAMES } from '../../utils/positions.js';
import { tint, RESULT_COLORS } from '../../utils/overviewPalette.js';
import { teamName } from '../../utils/teams.js';

const fmtInt = v => Math.round(v || 0).toLocaleString('en-US');
const pctOf = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

/**
 * One team's side of a match: a header with its result and totals, then its
 * characters in lineup order (Starter first). A row shows position, character,
 * build, damage dealt and taken, HP left and the score for the match; tapping
 * it opens the rest of that character's numbers under it (CharacterDetail).
 *
 * The header is tinted in its result's colour, green for the winner and red
 * for the loser, as the tier list tints each tier's row.
 *
 * `side` is one of readMatch()'s sides; `opened` are the keys of characters
 * whose rows start open (the Match page's `?open=`), marked for its scroll.
 */
export default function MatchTeamTable({ side, isPhone, characterLinkFor, teamLinkFor, characterIdRecord, charMap, opened = [] }) {
  const [open, setOpen] = useState(() => new Set(opened));
  const toggle = key => setOpen(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const t = side.totals;
  const teamTo = side.tag && teamLinkFor ? teamLinkFor(side.tag) : null;
  const TeamName = teamTo ? Link : 'span';
  const cols = isPhone
    ? 'grid grid-cols-[minmax(0,1fr)_50px_38px_50px_12px] items-center gap-1.5'
    : 'grid grid-cols-[64px_minmax(0,1.4fr)_minmax(0,1fr)_84px_84px_84px_64px_16px] items-center gap-3';
  const total = (label, value) => (
    <span className="flex flex-col items-end gap-0.5">
      <span className="text-[10px] font-semibold uppercase leading-none tracking-wider text-slate-500">{label}</span>
      <span className="text-[14px] font-semibold leading-5 tabular-nums text-slate-100">{value}</span>
    </span>
  );

  const result = side.won == null ? null : RESULT_COLORS[side.won ? 'won' : 'lost'];
  return (
    <section className="rounded-[10px] border border-solid border-gray-700 bg-shell-panel">
      <header style={result ? { background: tint(result, 0.1), borderBottomColor: tint(result, 0.35) } : undefined}
        className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-t-[9px] border-0 border-b border-solid border-gray-700 ${isPhone ? 'px-3 py-2.5' : 'px-3.5 py-3'}`}>
        <div className="flex min-w-0 items-center gap-2.5">
          {side.won != null && <ResultBadge won={side.won} />}
          <TeamLogo tag={side.tag} size={isPhone ? 24 : 28} rounded={6} />
          {side.tag
            ? <TeamName to={teamTo || undefined} className="min-w-0 truncate text-[16px] font-bold text-white no-underline hover:underline">{teamName(side.tag)}</TeamName>
            : <span className="text-[15px] text-slate-400">No team name</span>}
        </div>
        <div className="flex items-center gap-5">
          {total('Damage', fmtInt(t.damage))}
          {total('Taken', fmtInt(t.taken))}
          {total('HP kept', `${pctOf(t.hp, t.hpMax)}%`)}
          {!isPhone && total('KOs', fmtInt(t.kills))}
        </div>
      </header>

      <div className={`${cols} border-0 border-b border-solid border-gray-700/60 px-3.5 py-2 text-slate-400`}>
        {!isPhone && <span className={HEAD}>Position</span>}
        <span className={HEAD}>Character</span>
        {!isPhone && <span className={HEAD}>Build</span>}
        <span className={`${HEAD} text-right`}>{isPhone ? 'Dmg' : 'Damage'}</span>
        {!isPhone && <span className={`${HEAD} text-right`}>Taken</span>}
        <span className={`${HEAD} text-right`}>{isPhone ? 'HP' : 'HP left'}</span>
        <span className={`${HEAD} text-right`}>Score</span>
        <span />
      </div>

      <div className="[&>*:last-child]:border-b-0">
        {side.characters.map(c => {
          const s = c.stats;
          const isOpen = open.has(c.key);
          const to = characterLinkFor ? characterLinkFor(c.name) : null;
          const Name = to ? Link : 'span';
          const build = s.buildComposition && s.buildComposition.label ? s.buildComposition.label : 'No Build';
          const pos = POSITION_NAMES[c.position];
          return (
            <div key={c.key} data-opened={opened.includes(c.key) ? '' : undefined} className="border-0 border-b border-solid border-gray-700/50">
              <div role="button" tabIndex={0} aria-expanded={isOpen}
                onClick={() => toggle(c.key)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(c.key); } }}
                className={`${cols} cursor-pointer px-3.5 py-2 ${isOpen ? 'bg-slate-400/[.06]' : 'hover:bg-slate-400/[.05]'} ${c.played ? '' : 'opacity-60'}`}>
                {!isPhone && <span className="text-[13px] text-slate-400">{pos}</span>}
                <span className="flex min-w-0 items-center gap-2.5">
                  <Portrait id={c.id} name={c.name} size={isPhone ? 32 : 34} />
                  <span className="min-w-0">
                    <Name to={to || undefined} onClick={e => e.stopPropagation()}
                      className={`block text-[13.5px] font-semibold leading-[1.3] text-slate-100 no-underline hover:underline ${isPhone ? 'line-clamp-2' : 'truncate'}`}>{c.name}</Name>
                    <span className="block truncate text-[11px] leading-[1.4] text-slate-400">
                      {isPhone ? pos : (c.played ? `${fmtInt(s.kills)} KO${s.kills === 1 ? '' : 's'}` : 'Did not fight')}
                    </span>
                  </span>
                </span>
                {!isPhone && (
                  <span className="flex min-w-0 flex-col gap-1">
                    <BuildPill label={build} darkMode compact className="self-start" />
                    <CostBar capsules={capsulesOf(s)} className="w-full max-w-[160px]" />
                  </span>
                )}
                <span className="text-right text-[14px] tabular-nums text-slate-100">{isPhone ? fmtK(s.damageDone) : fmtInt(s.damageDone)}</span>
                {!isPhone && <span className="text-right text-[14px] tabular-nums text-slate-300">{fmtInt(s.damageTaken)}</span>}
                <span className="flex flex-col items-end">
                  <span className="text-[14px] tabular-nums text-slate-100">{isPhone ? `${pctOf(s.hPGaugeValue, s.hPGaugeValueMax)}%` : fmtInt(s.hPGaugeValue)}</span>
                  {!isPhone && <span className="text-[11px] tabular-nums text-slate-400">{pctOf(s.hPGaugeValue, s.hPGaugeValueMax)}%</span>}
                </span>
                <span className="flex justify-end"><TierScorePill score={c.score} /></span>
                <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
              {isOpen && (
                <CharacterDetail c={c} isPhone={isPhone} build={build} characterIdRecord={characterIdRecord} charMap={charMap} />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

const fmtK = v => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v || 0)));
