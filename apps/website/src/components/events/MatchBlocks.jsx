import React from 'react';
import { Trophy, Users, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { LineupPanel } from '../LineupPanel';
import { BlockSection, EntityAvatar, WatchLink } from './entities';

// One battle between two named sides. Used directly by `single_match` blocks
// and once per game by `series` blocks.
//   game: { status, winner, score_a?, score_b?, video_url, lineup_file, map?, label? }
export function MatchRow({ label, teamA, teamB, game, matchKey, resolve, lineups, darkMode }) {
  const a = resolve(teamA);
  const b = resolve(teamB);
  const status = game?.status || 'upcoming';
  const isCompleted = status === 'completed';
  const aWon = isCompleted && game.winner && game.winner === teamA;
  const bWon = isCompleted && game.winner && game.winner === teamB;
  const hasScore = game?.score_a != null && game?.score_b != null;
  const { openLineups, lineupCache, lineupLoading, toggleLineup } = lineups;
  const isLineupOpen = !!openLineups[matchKey];
  const hasLineup = !!game?.lineup_file;
  const gradient = aWon
    ? 'rgba(34,197,94,0.45), rgba(34,197,94,0.18) 35%, transparent 50%, rgba(239,68,68,0.18) 65%, rgba(239,68,68,0.45)'
    : 'rgba(239,68,68,0.45), rgba(239,68,68,0.18) 35%, transparent 50%, rgba(34,197,94,0.18) 65%, rgba(34,197,94,0.45)';

  const nameCls = (won) => `text-sm truncate block font-medium ${
    won ? (darkMode ? 'text-green-400' : 'text-green-600') : darkMode ? 'text-gray-200' : 'text-stone-700'
  }`;

  const center = (
    <div className="flex flex-col items-center gap-1 px-2 sm:px-4 flex-shrink-0 min-w-[72px]">
      {isCompleted ? (
        <>
          {hasScore ? (
            <div className="flex items-center gap-1 font-bold text-base">
              <span className={aWon ? (darkMode ? 'text-green-400' : 'text-green-600') : 'text-gray-400'}>{game.score_a}</span>
              <span className={`text-xs ${darkMode ? 'text-gray-700' : 'text-stone-300'}`}>-</span>
              <span className={bWon ? (darkMode ? 'text-green-400' : 'text-green-600') : 'text-gray-400'}>{game.score_b}</span>
            </div>
          ) : (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
            }`}>{game.winner ? 'Final' : 'Result TBD'}</span>
          )}
          <WatchLink href={game.video_url} darkMode={darkMode} />
        </>
      ) : (
        <span className={`text-xs px-2 py-1 rounded-full ${
          status === 'live'
            ? 'bg-red-500/20 text-red-400'
            : darkMode ? 'bg-gray-800 text-gray-400' : 'bg-stone-200 text-stone-500'
        }`}>{status === 'live' ? '● Live' : 'vs'}</span>
      )}
    </div>
  );

  const row = (
    <div className={`p-2 sm:p-3 ${darkMode ? 'bg-gray-900' : 'bg-stone-50'}`}>
      {(label || game?.map) && (
        <div className="flex items-center justify-between gap-2 mb-2 px-1">
          {label && <span className={`text-xs font-semibold ${darkMode ? 'text-orange-400' : 'text-blue-600'}`}>{label}</span>}
          {game?.map && (
            <span className={`text-[11px] flex items-center gap-1 ${darkMode ? 'text-gray-500' : 'text-stone-400'}`}>
              <MapPin className="w-3 h-3" /> {game.map}
            </span>
          )}
        </div>
      )}
      <div className="flex items-center">
        <div className={`flex items-center gap-2 flex-1 min-w-0 ${bWon ? 'opacity-40' : ''}`}>
          <EntityAvatar entity={a} size="sm" />
          <span className={nameCls(aWon)}>{teamA || 'TBD'}</span>
        </div>
        {center}
        <div className={`flex items-center gap-2 flex-1 min-w-0 justify-end text-right ${aWon ? 'opacity-40' : ''}`}>
          <span className={nameCls(bWon)}>{teamB || 'TBD'}</span>
          <EntityAvatar entity={b} size="sm" />
        </div>
      </div>
    </div>
  );

  const buildsBtn = hasLineup && (
    <button
      onClick={() => toggleLineup(matchKey, game.lineup_file)}
      className={`w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium border-t transition-colors ${
        isLineupOpen
          ? darkMode ? 'bg-gray-800 text-blue-400 border-gray-700' : 'bg-blue-50 text-blue-600 border-blue-200'
          : darkMode ? 'bg-gray-900 text-gray-500 border-gray-800 hover:text-white hover:bg-gray-800' : 'bg-stone-50 text-stone-400 border-stone-200 hover:text-stone-700'
      }`}
    >
      <Users className="w-3 h-3" />
      {isLineupOpen ? 'Hide Builds' : 'View Builds'}
      {isLineupOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
    </button>
  );

  const lineup = isLineupOpen && hasLineup && (
    <LineupPanel
      data={lineupCache[game.lineup_file]}
      loading={!!lineupLoading[game.lineup_file]}
      darkMode={darkMode}
      homeTeam={teamA}
      awayTeam={teamB}
      homeBanner={a?.banner || null}
      awayBanner={b?.banner || null}
    />
  );

  const inner = <>{row}{buildsBtn}{lineup}</>;

  return isCompleted && game.winner ? (
    <div className="rounded-xl p-[1px]" style={{ background: `linear-gradient(to right, ${gradient})` }}>
      <div className={`rounded-[11px] overflow-hidden ${darkMode ? 'bg-gray-900' : 'bg-stone-50'}`}>{inner}</div>
    </div>
  ) : (
    <div className={`rounded-xl border overflow-hidden ${darkMode ? 'border-gray-800' : 'border-stone-200'}`}>{inner}</div>
  );
}

export function SingleMatchBlock({ block, blockKey, resolve, lineups, darkMode }) {
  return (
    <BlockSection title={block.title} darkMode={darkMode}>
      <MatchRow
        teamA={block.team_a}
        teamB={block.team_b}
        game={block}
        matchKey={`${blockKey}-m`}
        resolve={resolve}
        lineups={lineups}
        darkMode={darkMode}
      />
    </BlockSection>
  );
}

// Best-of-N. Score is derived from per-game winners; the series winner is
// whoever reaches the majority first (or `block.winner` if set explicitly).
export function SeriesBlock({ block, blockKey, resolve, lineups, darkMode }) {
  const games = block.games || [];
  const teamA = block.team_a;
  const teamB = block.team_b;
  const a = resolve(teamA);
  const b = resolve(teamB);
  const winsA = games.filter((g) => g.winner && g.winner === teamA).length;
  const winsB = games.filter((g) => g.winner && g.winner === teamB).length;
  const bestOf = block.best_of || games.length || 1;
  const needed = Math.ceil(bestOf / 2);
  const seriesWinner = block.winner || (winsA >= needed ? teamA : winsB >= needed ? teamB : null);
  const aWon = seriesWinner === teamA;
  const bWon = seriesWinner === teamB;

  const sideName = (name, won, other) => `text-lg sm:text-xl font-bold truncate ${
    won ? (darkMode ? 'text-green-400' : 'text-green-600') : darkMode ? 'text-white' : 'text-stone-900'
  } ${other ? 'opacity-40' : ''}`;

  return (
    <BlockSection
      title={block.title}
      darkMode={darkMode}
      actions={
        <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>Best of {bestOf}</span>
      }
    >
      {/* Series scoreboard */}
      <div className={`flex items-center gap-3 sm:gap-6 p-4 rounded-xl mb-4 ${darkMode ? 'bg-gray-800/60' : 'bg-stone-100'}`}>
        <div className={`flex-1 flex items-center gap-3 min-w-0 ${bWon ? 'opacity-40' : ''}`}>
          <EntityAvatar entity={a} size="lg" />
          <span className={sideName(teamA, aWon, false)}>{teamA}</span>
        </div>
        <div className="flex flex-col items-center flex-shrink-0">
          <div className="text-3xl font-black flex items-center gap-2 tabular-nums">
            <span className={aWon ? (darkMode ? 'text-green-400' : 'text-green-600') : darkMode ? 'text-gray-200' : 'text-stone-800'}>{winsA}</span>
            <span className={darkMode ? 'text-gray-600' : 'text-stone-300'}>–</span>
            <span className={bWon ? (darkMode ? 'text-green-400' : 'text-green-600') : darkMode ? 'text-gray-200' : 'text-stone-800'}>{winsB}</span>
          </div>
          {seriesWinner && (
            <span className="flex items-center gap-1 text-xs font-semibold text-yellow-400 mt-1">
              <Trophy className="w-3.5 h-3.5" /> {seriesWinner}
            </span>
          )}
        </div>
        <div className={`flex-1 flex items-center gap-3 min-w-0 justify-end text-right ${aWon ? 'opacity-40' : ''}`}>
          <span className={sideName(teamB, bWon, false)}>{teamB}</span>
          <EntityAvatar entity={b} size="lg" />
        </div>
      </div>

      <div className="grid gap-3">
        {games.map((game, gi) => (
          <MatchRow
            key={gi}
            label={game.label || `Game ${gi + 1}`}
            teamA={teamA}
            teamB={teamB}
            game={game}
            matchKey={`${blockKey}-g${gi}`}
            resolve={resolve}
            lineups={lineups}
            darkMode={darkMode}
          />
        ))}
      </div>
    </BlockSection>
  );
}
