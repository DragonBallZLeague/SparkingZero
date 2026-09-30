import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import ShareButton from '../components/ShareButton.jsx';
import TeamLogo from '../components/TeamLogo.jsx';
import HeaderFigure from '../components/HeaderFigure.jsx';
import { useIsPhone } from '../shell/useMediaQuery.js';
import { ResultBadge } from './team/LineupList.jsx';
import MatchTeamTable from './match/MatchTeamTable.jsx';
import { teamName } from '../utils/teams.js';

const BTN = 'inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-[8px] border border-solid border-gray-700 bg-transparent px-[11px] text-[13px] font-medium text-slate-200 no-underline cursor-pointer hover:border-slate-400/[.35]';
const PANEL = 'rounded-[10px] border border-solid border-gray-700 bg-shell-panel';
const TYPE = { Season: 'Season match', Test: 'Test', Event: 'Event' };

/**
 * /matches/<slug>: one match. It replaced the single-match viewer's four
 * levels of nested cards.
 *
 * The header gives the match, both teams with the result, and its season,
 * phase, type, size, map and difficulty as label-over-value figures, as the
 * Character page header has them. Then a table per team in lineup order
 * (match/MatchTeamTable.jsx), whose rows open the rest of each character's
 * numbers.
 *
 * `state` is App's: { status: 'loading' | 'ready' | 'missing' | 'error',
 * label, name, tags, match (utils/matchRecord.js readMatch()) }. In the
 * Sandbox there is no Share (`shareable`): uploads are not stored anywhere.
 */
export default function MatchPage({ state, onBack, backLabel = null, characterLinkFor, teamLinkFor, charMap, shareable = true }) {
  const isPhone = useIsPhone();
  const back = onBack && (
    <button type="button" onClick={onBack} className={BTN}><ArrowLeft className="h-4 w-4" />{backLabel || 'All matches'}</button>
  );

  if (!state || state.status === 'loading') {
    return (
      <div className={`${PANEL} flex items-center gap-3 p-6 text-slate-300`}>
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm font-medium">Loading {state && state.name ? state.name : 'the match'}…</span>
      </div>
    );
  }
  if (state.status !== 'ready' || !state.match) {
    return (
      <div className={`${PANEL} p-6`}>
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 shrink-0 text-amber-400" />
          <div>
            <h1 className="m-0 text-xl font-bold text-white">
              {state.status === 'error' ? `Could not load ${state.name || 'this match'}` : 'No such match'}
            </h1>
            <p className="mb-4 mt-2 text-sm text-slate-400">
              {state.status === 'error'
                ? 'The match file did not load. Try again in a moment.'
                : <>Nothing is filed under <span className="font-semibold">{state.label}</span>. The link may be mistyped.</>}
            </p>
            {back}
          </div>
        </div>
      </div>
    );
  }

  const { match, tags = {} } = state;
  const figures = [
    tags.seasonNumber != null && ['Season', tags.seasonNumber],
    tags.seasonPhase && ['Phase', tags.seasonPhase],
    tags.matchType && ['Type', TYPE[tags.matchType] || tags.matchType],
    ['Size', tags.matchSize || `${match.size}v${match.size}`],
    match.map && ['Map', match.map],
    tags.difficulty && ['Difficulty', tags.difficulty],
  ].filter(Boolean);

  return (
    <div className="text-[14px] leading-[1.45] text-slate-100">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="m-0 text-2xl font-bold leading-tight text-white sm:text-3xl">{state.name}</h1>
          {/* Both teams and the result, side 1 first. */}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
            {match.sides.map((s, i) => (
              <React.Fragment key={s.side}>
                {i === 1 && <span className="text-[13px] text-slate-500">vs</span>}
                <TeamLine side={s} teamLinkFor={teamLinkFor} />
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {shareable && <ShareButton darkMode />}
          {back}
        </div>
      </div>

      <div className={`mb-5 ${isPhone ? 'grid grid-cols-3 gap-x-3 gap-y-3' : 'flex flex-wrap gap-x-8 gap-y-3'}`}>
        {figures.map(([label, value]) => (
          <div key={label} className={`min-w-0 ${isPhone && label === 'Map' ? 'col-span-2' : ''}`}>
            <HeaderFigure label={label}>
              <span className={`truncate ${isPhone ? 'text-[15px]' : 'text-base'}`}>{value}</span>
            </HeaderFigure>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {match.sides.map(s => (
          <MatchTeamTable key={s.side} side={s} isPhone={isPhone} characterLinkFor={characterLinkFor}
            teamLinkFor={teamLinkFor} characterIdRecord={match.characterIdRecord} charMap={charMap} />
        ))}
      </div>
    </div>
  );
}

/** One team in the header's result line: its result, logo and name. */
function TeamLine({ side, teamLinkFor }) {
  const to = side.tag && teamLinkFor ? teamLinkFor(side.tag) : null;
  const Name = to ? Link : 'span';
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      {side.won != null && <ResultBadge won={side.won} />}
      <TeamLogo tag={side.tag} size={24} rounded={5} />
      {side.tag
        ? <Name to={to || undefined} className={`truncate text-[15px] font-semibold no-underline hover:underline ${side.won === false ? 'text-slate-300' : 'text-white'}`}>{teamName(side.tag)}</Name>
        : <span className="text-[15px] text-slate-400">No team name</span>}
    </span>
  );
}
