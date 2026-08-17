import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, Trophy, ChevronDown, ChevronUp, ExternalLink, Shield, ChevronsUpDown, Users } from 'lucide-react';
import { useSeasonContext } from '../contexts/SeasonContext';
import yaml from 'js-yaml';
import { applyTiebreakers, sortTeamsWithTiebreakers } from '../utils/standings';

const PHASE_LABELS = {
  preseason: 'Pre-Season',
  main_season: 'Main Season',
  playoffs: 'Playoffs',
};

function computeStandingsFromSchedule(schedule) {
  const record = {};
  for (const week of schedule || []) {
    for (const m of week.matches || []) {
      if (m.status !== 'completed' || !m.winner) continue;
      [m.home, m.away].forEach((t) => {
        if (!record[t]) record[t] = { wins: 0, losses: 0 };
        if (m.winner === t) {
          record[t].wins += 1;
        } else {
          record[t].losses += 1;
        }
      });
    }
  }
  return record;
}

function parseCapsule(str) {
  const m = str.match(/^(.+?)\s+\((\d+)\)$/);
  return m ? { name: m[1], cost: m[2] } : { name: str, cost: null };
}

function CharacterCard({ char, darkMode }) {
  const hasTransformAi = char.transformAi && char.transformAi !== '';
  return (
    <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800/80' : 'bg-stone-100'}`}>
      <div className={`font-bold text-sm mb-2 ${darkMode ? 'text-white' : 'text-stone-900'}`}>
        {char.character}
      </div>
      {char.costume && (
        <div className={`text-xs mb-1.5 ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>
          {char.costume}
        </div>
      )}
      <div className="space-y-0.5">
        {(char.capsules || []).map((cap, ci) => {
          const { name, cost } = parseCapsule(cap);
          return (
            <div key={ci} className={`flex justify-between items-center text-xs ${darkMode ? 'text-gray-200' : 'text-stone-700'}`}>
              <span>{name}</span>
              {cost !== null && (
                <span className={`font-bold ml-3 shrink-0 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>{cost}</span>
              )}
            </div>
          );
        })}
      </div>
      <div className={`mt-2 pt-2 border-t ${darkMode ? 'border-gray-700/50' : 'border-stone-200'} flex items-start justify-between gap-2 text-xs`}>
        <span className={`shrink-0 ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>AI Strategy</span>
        <span className={`text-right font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{char.ai}</span>
      </div>
      {hasTransformAi && (
        <div className={`flex items-start justify-between gap-2 text-xs mt-0.5`}>
          <span className={`shrink-0 ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>Transformation AI</span>
          <span className={`text-right ${darkMode ? 'text-purple-400/70' : 'text-purple-500/80'}`}>{char.transformAi}</span>
        </div>
      )}
    </div>
  );
}

function LineupPanel({ data, loading, darkMode, homeTeam, awayTeam, homeBanner, awayBanner }) {
  const [activeTeam, setActiveTeam] = useState(0);
  const [homeBannerRatio, setHomeBannerRatio] = useState(null);
  const [awayBannerRatio, setAwayBannerRatio] = useState(null);
  if (loading) {
    return (
      <div className={`p-6 text-center text-sm animate-pulse ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>
        Loading lineup...
      </div>
    );
  }
  if (!data) return null;
  const team1 = data.team1 || [];
  const team2 = data.team2 || [];
  return (
    <div className="relative">
      {/* Desktop: banner backgrounds behind the full panel, split left/right */}
      <div className="hidden sm:block absolute inset-0 pointer-events-none overflow-hidden">
        {homeBanner && (
          <div
            className="absolute left-0 top-0 w-1/2 h-full overflow-hidden"
            style={{
              containerType: 'size',
              maskImage: 'linear-gradient(to right, transparent 0%, black 10%, transparent 50%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 10%, transparent 50%)',
            }}
          >
            <img
              src={homeBanner}
              alt=""
              aria-hidden="true"
              onLoad={(e) => setHomeBannerRatio(e.currentTarget.naturalHeight / e.currentTarget.naturalWidth)}
              style={{
                position: 'absolute',
                top: '50%',
                left: homeBannerRatio !== null ? `calc(50cqh * ${homeBannerRatio - 1})` : '-9999px',
                width: '100cqh',
                height: 'auto',
                maxWidth: 'none',
                transform: 'translateY(-50%) rotate(-90deg)',
                opacity: 0.75,
                pointerEvents: 'none',
              }}
            />
          </div>
        )}
        {awayBanner && (
          <div
            className="absolute right-0 top-0 w-1/2 h-full overflow-hidden"
            style={{
              containerType: 'size',
              maskImage: 'linear-gradient(to left, transparent 0%, black 10%, transparent 50%)',
              WebkitMaskImage: 'linear-gradient(to left, transparent 0%, black 10%, transparent 50%)',
            }}
          >
            <img
              src={awayBanner}
              alt=""
              aria-hidden="true"
              onLoad={(e) => setAwayBannerRatio(e.currentTarget.naturalHeight / e.currentTarget.naturalWidth)}
              style={{
                position: 'absolute',
                top: '50%',
                right: awayBannerRatio !== null ? `calc(50cqh * ${awayBannerRatio - 1})` : '-9999px',
                width: '100cqh',
                height: 'auto',
                maxWidth: 'none',
                transform: 'translateY(-50%) rotate(90deg)',
                opacity: 0.75,
                pointerEvents: 'none',
              }}
            />
          </div>
        )}
      </div>
      {/* Content */}
      <div className="relative p-3 sm:p-4">
        {/* Mobile: tab switcher */}
        <div className={`flex sm:hidden gap-1 p-1 rounded-xl mb-3 ${darkMode ? 'bg-gray-800/60' : 'bg-stone-200'}`}>
          <button
            onClick={() => setActiveTeam(0)}
            className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors truncate px-2 ${
              activeTeam === 0
                ? darkMode ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'
                : darkMode ? 'text-gray-400 hover:text-white' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            {homeTeam}
          </button>
          <button
            onClick={() => setActiveTeam(1)}
            className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors truncate px-2 ${
              activeTeam === 1
                ? darkMode ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'
                : darkMode ? 'text-gray-400 hover:text-white' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            {awayTeam}
          </button>
        </div>
        {/* Mobile: single active team */}
        <div className="sm:hidden space-y-2">
          {(activeTeam === 0 ? team1 : team2).map((char, i) => (
            <CharacterCard key={i} char={char} darkMode={darkMode} />
          ))}
        </div>
        {/* Desktop: side-by-side */}
        <div className="hidden sm:flex items-start justify-center gap-4">
          <div className="w-full max-w-xs">
            <div className="space-y-2">
              {team1.map((char, i) => (
                <CharacterCard key={i} char={char} darkMode={darkMode} />
              ))}
            </div>
          </div>
          <div className={`flex-shrink-0 self-center text-lg font-bold px-2 ${darkMode ? 'text-gray-600' : 'text-stone-300'}`}>
            Vs
          </div>
          <div className="w-full max-w-xs">
            <div className="space-y-2">
              {team2.map((char, i) => (
                <CharacterCard key={i} char={char} darkMode={darkMode} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Playoff Bracket ──────────────────────────────────────────────────────────

const BRACKET_MATCH_H = 76;
const BRACKET_SLOT_H = 108;
const BRACKET_ROUND_W = 176;
const BRACKET_CONN_W = 36;

function BracketTeamRow({ team, seed, won, lost, score, darkMode, icon, color }) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2 ${
        won ? (darkMode ? 'bg-green-500/10' : 'bg-green-50') : ''
      }`}
      style={{ height: 37 }}
    >
      {seed != null && (
        <span className="text-[10px] w-3.5 flex-shrink-0 font-mono text-gray-500">{seed}</span>
      )}
      {icon ? (
        <img
          src={icon}
          alt={team || ''}
          className="w-5 h-5 rounded flex-shrink-0 object-cover"
          style={{ opacity: lost ? 0.35 : 1 }}
        />
      ) : (
        <div
          className="w-5 h-5 rounded flex-shrink-0"
          style={{ backgroundColor: color || '#6B7280', opacity: lost ? 0.35 : 1 }}
        />
      )}
      <span
        className={`text-xs flex-1 truncate min-w-0 ${lost ? 'opacity-40 ' : ''}${
          won
            ? darkMode ? 'font-semibold text-green-400' : 'font-semibold text-green-600'
            : darkMode ? 'text-gray-200' : 'text-stone-700'
        }`}
      >
        {team || 'TBD'}
      </span>
      {score != null && (
        <span
          className={`text-xs font-bold flex-shrink-0 ${
            won
              ? darkMode ? 'text-green-400' : 'text-green-600'
              : lost
                ? 'opacity-40 text-gray-500'
                : darkMode ? 'text-gray-400' : 'text-stone-500'
          }`}
        >
          {score}
        </span>
      )}
    </div>
  );
}

// Standard recursive tournament seed order (same idea NCAA/single-elim
// brackets use): for a bracket of `size` slots, returns the slots in the
// top-to-bottom order that keeps seed 1 & seed 2 apart until the final.
// seedOrder(2) = [1,2]; seedOrder(4) = [1,4,2,3]; seedOrder(8) = [1,8,4,5,2,7,3,6].
function seedOrder(size) {
  if (size <= 1) return [1];
  const prev = seedOrder(size / 2);
  const out = [];
  prev.forEach((s) => { out.push(s); out.push(size + 1 - s); });
  return out;
}

// Builds each round in DISPLAY order (not raw seed-ascending order) so
// that every connector between rounds is a simple straight or adjacent
// line — no bending across rows. This is the actual bracket-seeding
// layout: read the 8 "post wild-card" slots (4 byes + 4 wild-card games)
// off seedOrder(8) = [1,8,4,5,2,7,3,6]. The bye seeds in that list
// (1,4,2,3) become the Quarterfinal row order; the wild-card hosts
// (8,5,7,6) become the Wild Card row order — and because both come from
// the same list, a Wild Card row always lines up with the Quarterfinal
// row it feeds. Semifinals then simply pair adjacent Quarterfinal rows
// (0&1, 2&3), which — thanks to the reorder — correctly groups seed 1's
// path with seed 4's path, and seed 2's path with seed 3's.
function deriveRounds(rawRounds, seedings) {
  if (!rawRounds?.length || !seedings?.length) return rawRounds || [];
  const n = seedings.length;
  const wcCount = rawRounds[0].matches.length;
  const byeCount = n - wcCount * 2;
  const postWcCount = byeCount + wcCount;

  const order = seedOrder(postWcCount);
  const wcDisplayOrder = order.filter((v) => v > byeCount).map((v) => v - byeCount - 1);
  const qfDisplayOrder = order.filter((v) => v <= byeCount).map((v) => v - 1);

  // --- Wild Card, reordered ---
  const wcMatches = wcDisplayOrder.map((origMi) => {
    const m = rawRounds[0].matches[origMi];
    let team_a = m.team_a || null;
    let team_b = m.team_b || null;
    let seed_a = m.seed_a ?? null;
    let seed_b = m.seed_b ?? null;
    const aIdx = byeCount + origMi;
    const bIdx = n - 1 - origMi;
    if (!team_a) { team_a = seedings[aIdx] ?? null; seed_a = aIdx + 1; }
    if (!team_b) { team_b = seedings[bIdx] ?? null; seed_b = bIdx + 1; }
    return { ...m, team_a, team_b, seed_a, seed_b, sourceA: null, sourceB: null };
  });
  const wcWinners = wcMatches.map((m) => m.winner ?? null);

  // --- Quarterfinals, reordered — each display row now lines up with the
  // Wild Card row directly above it, so sourceB is just that same row. ---
  const qfMatches = qfDisplayOrder.map((origMi, dispRow) => {
    const m = rawRounds[1].matches[origMi];
    let team_a = m.team_a || null;
    let team_b = m.team_b || null;
    let seed_a = m.seed_a ?? origMi + 1;
    let seed_b = m.seed_b ?? null;
    if (!team_a) team_a = seedings[origMi] ?? null;
    const sourceB = dispRow;
    if (!team_b) {
      team_b = wcWinners[sourceB] ?? null;
      if (team_b) seed_b = seedings.indexOf(team_b) + 1 || null;
    }
    return { ...m, team_a, team_b, seed_a, seed_b, sourceA: null, sourceB };
  });
  const qfWinners = qfMatches.map((m) => m.winner ?? null);

  const rounds = [
    { ...rawRounds[0], matches: wcMatches },
    { ...rawRounds[1], matches: qfMatches },
  ];

  // --- Semifinals, Final, and beyond: adjacent rows of the previous
  // (already-reordered) round pair up directly — row 0&1, row 2&3, etc. ---
  let prevWinners = qfWinners;
  for (let ri = 2; ri < rawRounds.length; ri++) {
    const matches = rawRounds[ri].matches.map((m, mi) => {
      let team_a = m.team_a || null;
      let team_b = m.team_b || null;
      let seed_a = m.seed_a ?? null;
      let seed_b = m.seed_b ?? null;
      const sourceA = mi * 2;
      const sourceB = mi * 2 + 1;
      if (!team_a) {
        team_a = prevWinners[sourceA] ?? null;
        if (team_a) seed_a = (seedings.indexOf(team_a) + 1) || null;
      }
      if (!team_b) {
        team_b = prevWinners[sourceB] ?? null;
        if (team_b) seed_b = (seedings.indexOf(team_b) + 1) || null;
      }
      return { ...m, team_a, team_b, seed_a, seed_b, sourceA, sourceB };
    });
    rounds.push({ ...rawRounds[ri], matches });
    prevWinners = matches.map((m) => m.winner ?? null);
  }

  return rounds;
}

function PlayoffMatchDetailPanel({
  roundName, match, matchKey, darkMode,
  getTeamIcon, getTeamColor, getTeamBanner,
  openLineups, lineupCache, lineupLoading, toggleLineup, onClose,
}) {
  if (!match) return null;
  const isCompleted = match.status === 'completed';
  const teamAWon = isCompleted && match.winner === match.team_a;
  const teamBWon = isCompleted && match.winner === match.team_b;
  const isLineupOpen = !!openLineups[matchKey];
  const hasVideo = !!(match.video_url);
  const hasLineup = !!(match.lineup_file);
  const gradientColors = teamAWon
    ? 'rgba(34,197,94,0.45), rgba(34,197,94,0.18) 35%, transparent 50%, rgba(239,68,68,0.18) 65%, rgba(239,68,68,0.45)'
    : 'rgba(239,68,68,0.45), rgba(239,68,68,0.18) 35%, transparent 50%, rgba(34,197,94,0.18) 65%, rgba(34,197,94,0.45)';

  const header = (
    <div className={`flex items-center justify-between px-4 py-2 border-b ${
      darkMode ? 'border-gray-800 bg-gray-900/60' : 'border-stone-200 bg-stone-100'
    }`}>
      <span className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-stone-700'}`}>{roundName}</span>
      <button onClick={onClose} className={`text-xs px-2 py-1 rounded transition-colors ${
        darkMode ? 'text-gray-500 hover:text-white' : 'text-stone-400 hover:text-stone-700'
      }`}>✕</button>
    </div>
  );

  const scoreRow = (
    <div className="p-3 sm:p-4">
      <div className="flex items-center gap-3">
        {/* Team A */}
        <div className={`flex-1 flex items-center gap-2 min-w-0 ${teamBWon ? 'opacity-40' : ''}`}>
          {match.team_a && getTeamIcon(match.team_a) ? (
            <img src={getTeamIcon(match.team_a)} alt={match.team_a}
              className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-lg flex-shrink-0"
              style={{ backgroundColor: match.team_a ? getTeamColor(match.team_a) : '#6B7280' }} />
          )}
          <div className="min-w-0">
            {match.seed_a != null && <div className="text-[10px] text-gray-500 leading-none">#{match.seed_a}</div>}
            <div className={`text-sm font-semibold truncate ${
              teamAWon ? (darkMode ? 'text-green-400' : 'text-green-600') : darkMode ? 'text-gray-200' : 'text-stone-700'
            }`}>{match.team_a || 'TBD'}</div>
          </div>
        </div>
        {/* Score with Watch inline */}
        <div className="flex-shrink-0 text-center min-w-[60px]">
          {isCompleted ? (
            <div className="flex flex-col items-center gap-0.5">
              <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                darkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
              }`}>Final</div>
              <div className="text-xl font-bold flex items-center justify-center gap-1">
                <span className={teamAWon ? (darkMode ? 'text-green-400' : 'text-green-600') : 'text-gray-400'}>{match.score_a}</span>
                <span className={`text-sm ${darkMode ? 'text-gray-700' : 'text-stone-300'}`}>-</span>
                <span className={teamBWon ? (darkMode ? 'text-green-400' : 'text-green-600') : 'text-gray-400'}>{match.score_b}</span>
              </div>
              {hasVideo && (
                <a href={match.video_url} target="_blank" rel="noopener noreferrer"
                  className={`text-xs flex items-center gap-1 mt-0.5 ${darkMode ? 'text-orange-400' : 'text-blue-600'}`}>
                  <ExternalLink className="w-3 h-3" /> Watch
                </a>
              )}
            </div>
          ) : (
            <span className={`text-xs px-2 py-1 rounded-full ${
              match.status === 'live'
                ? 'bg-red-500/20 text-red-400'
                : darkMode ? 'bg-gray-800 text-gray-400' : 'bg-stone-200 text-stone-500'
            }`}>{match.status === 'live' ? '● Live' : 'Upcoming'}</span>
          )}
        </div>
        {/* Team B */}
        <div className={`flex-1 flex items-center gap-2 justify-end text-right min-w-0 ${teamAWon ? 'opacity-40' : ''}`}>
          <div className="min-w-0">
            {match.seed_b != null && <div className="text-[10px] text-gray-500 leading-none">#{match.seed_b}</div>}
            <div className={`text-sm font-semibold truncate ${
              teamBWon ? (darkMode ? 'text-green-400' : 'text-green-600') : darkMode ? 'text-gray-200' : 'text-stone-700'
            }`}>{match.team_b || 'TBD'}</div>
          </div>
          {match.team_b && getTeamIcon(match.team_b) ? (
            <img src={getTeamIcon(match.team_b)} alt={match.team_b}
              className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-lg flex-shrink-0"
              style={{ backgroundColor: match.team_b ? getTeamColor(match.team_b) : '#6B7280' }} />
          )}
        </div>
      </div>
    </div>
  );

  const viewBuildsBtn = hasLineup && (
    <button onClick={() => toggleLineup(matchKey, match.lineup_file)}
      className={`w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium border-t transition-colors ${
        isLineupOpen
          ? darkMode ? 'bg-gray-800 text-blue-400 border-gray-700' : 'bg-blue-50 text-blue-600 border-blue-200'
          : darkMode ? 'bg-gray-900 text-gray-500 border-gray-800 hover:text-white hover:bg-gray-800' : 'bg-stone-50 text-stone-400 border-stone-200 hover:text-stone-700'
      }`}>
      <Users className="w-3 h-3" />
      {isLineupOpen ? 'Hide Builds' : 'View Builds'}
      {isLineupOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
    </button>
  );

  const panelContent = (
    <>
      {header}
      {scoreRow}
      {viewBuildsBtn}
      {isLineupOpen && hasLineup && (
        <LineupPanel
          data={lineupCache[match.lineup_file]}
          loading={!!lineupLoading[match.lineup_file]}
          darkMode={darkMode}
          homeTeam={match.team_a}
          awayTeam={match.team_b}
          homeBanner={match.team_a ? getTeamBanner(match.team_a) : null}
          awayBanner={match.team_b ? getTeamBanner(match.team_b) : null}
        />
      )}
    </>
  );

  return isCompleted ? (
    <div className="mt-4 rounded-xl p-[1px]" style={{ background: `linear-gradient(to right, ${gradientColors})` }}>
      <div className={`rounded-[11px] overflow-hidden ${darkMode ? 'bg-gray-900' : 'bg-stone-50'}`}>
        {panelContent}
      </div>
    </div>
  ) : (
    <div className={`mt-4 rounded-xl border overflow-hidden ${
      darkMode ? 'bg-gray-900 border-gray-800' : 'bg-stone-50 border-stone-200 shadow-sm'
    }`}>
      {panelContent}
    </div>
  );
}

function PlayoffListView({
  rounds, darkMode, getTeamIcon, getTeamColor, getTeamBanner,
  openLineups, lineupCache, lineupLoading, toggleLineup,
}) {
  return (
    <div className="space-y-6">
      {rounds.map((round, ri) => (
        <div key={ri}>
          <h4 className={`text-sm font-bold mb-3 ${
            ri === rounds.length - 1 ? 'text-yellow-400' : darkMode ? 'text-orange-400' : 'text-blue-600'
          }`}>{round.round}</h4>
          <div className="grid gap-3">
            {round.matches.map((match, mi) => {
              const matchKey = `playoff-r${ri}-m${mi}`;
              const isCompleted = match.status === 'completed';
              const teamAWon = isCompleted && match.winner === match.team_a;
              const teamBWon = isCompleted && match.winner === match.team_b;
              const isLineupOpen = !!openLineups[matchKey];
              const hasVideo = isCompleted && !!(match.video_url);
              const hasLineup = !!(match.lineup_file);
              const gradientColors = teamAWon
                ? 'rgba(34,197,94,0.45), rgba(34,197,94,0.18) 35%, transparent 50%, rgba(239,68,68,0.18) 65%, rgba(239,68,68,0.45)'
                : 'rgba(239,68,68,0.45), rgba(239,68,68,0.18) 35%, transparent 50%, rgba(34,197,94,0.18) 65%, rgba(34,197,94,0.45)';

              const innerRow = (
                <div className={`p-2 sm:p-3 flex items-center ${
                  isCompleted
                    ? darkMode ? 'bg-gray-900' : 'bg-stone-50'
                    : `rounded-t-xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-stone-50 border-stone-200 shadow-sm'} ${hasLineup ? '' : 'rounded-b-xl'}`
                }`}>
                  {/* Team A */}
                  <div className={`flex items-center gap-2 flex-1 min-w-0 ${teamBWon ? 'opacity-40' : ''}`}>
                    {match.team_a && getTeamIcon(match.team_a) ? (
                      <img src={getTeamIcon(match.team_a)} alt={match.team_a}
                        className="w-6 h-6 rounded-md object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-6 h-6 rounded-md flex-shrink-0"
                        style={{ backgroundColor: match.team_a ? getTeamColor(match.team_a) : '#6B7280' }} />
                    )}
                    <div className="min-w-0">
                      {match.seed_a != null && <div className="text-[10px] text-gray-500 leading-none">#{match.seed_a}</div>}
                      <span className={`text-sm truncate block font-medium ${
                        teamAWon ? (darkMode ? 'text-green-400' : 'text-green-600') : darkMode ? 'text-gray-200' : 'text-stone-700'
                      }`}>{match.team_a || 'TBD'}</span>
                    </div>
                  </div>
                  {/* Center */}
                  <div className="flex flex-col items-center gap-1 px-2 sm:px-4 flex-shrink-0">
                    {isCompleted ? (
                      <>
                        <div className="flex items-center gap-1 font-bold text-base">
                          <span className={teamAWon ? (darkMode ? 'text-green-400' : 'text-green-600') : 'text-gray-400'}>{match.score_a}</span>
                          <span className={`text-xs ${darkMode ? 'text-gray-700' : 'text-stone-300'}`}>-</span>
                          <span className={teamBWon ? (darkMode ? 'text-green-400' : 'text-green-600') : 'text-gray-400'}>{match.score_b}</span>
                        </div>
                        {hasVideo && (
                          <a href={match.video_url} target="_blank" rel="noopener noreferrer"
                            className={`text-xs flex items-center gap-1 ${darkMode ? 'text-orange-400' : 'text-blue-600'}`}>
                            <ExternalLink className="w-3 h-3" /> Watch
                          </a>
                        )}
                      </>
                    ) : (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        match.status === 'live'
                          ? 'bg-red-500/20 text-red-400'
                          : darkMode ? 'bg-gray-800 text-gray-400' : 'bg-stone-200 text-stone-500'
                      }`}>{match.status === 'live' ? '● Live' : 'vs'}</span>
                    )}
                  </div>
                  {/* Team B */}
                  <div className={`flex items-center gap-2 flex-1 min-w-0 justify-end text-right ${teamAWon ? 'opacity-40' : ''}`}>
                    <div className="min-w-0">
                      {match.seed_b != null && <div className="text-[10px] text-gray-500 leading-none">#{match.seed_b}</div>}
                      <span className={`text-sm truncate block font-medium ${
                        teamBWon ? (darkMode ? 'text-green-400' : 'text-green-600') : darkMode ? 'text-gray-200' : 'text-stone-700'
                      }`}>{match.team_b || 'TBD'}</span>
                    </div>
                    {match.team_b && getTeamIcon(match.team_b) ? (
                      <img src={getTeamIcon(match.team_b)} alt={match.team_b}
                        className="w-6 h-6 rounded-md object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-6 h-6 rounded-md flex-shrink-0"
                        style={{ backgroundColor: match.team_b ? getTeamColor(match.team_b) : '#6B7280' }} />
                    )}
                  </div>
                </div>
              );

              const viewBuildsBtn = hasLineup ? (
                <button
                  onClick={() => toggleLineup(matchKey, match.lineup_file)}
                  className={`w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium border-t transition-colors ${
                    isCompleted
                      ? isLineupOpen
                        ? darkMode ? 'bg-gray-800 text-blue-400 border-gray-700' : 'bg-blue-50 text-blue-600 border-blue-200'
                        : darkMode ? 'bg-gray-900 text-gray-500 border-gray-800 hover:text-white hover:bg-gray-800' : 'bg-stone-50 text-stone-400 border-stone-200 hover:text-stone-700'
                      : isLineupOpen
                        ? darkMode ? 'border-l border-r border-b bg-gray-800 text-blue-400 border-gray-700 rounded-none' : 'border-l border-r border-b bg-blue-50 text-blue-600 border-blue-200 rounded-none'
                        : darkMode ? 'border-l border-r border-b bg-gray-900 text-gray-500 border-gray-800 hover:text-white hover:bg-gray-800 rounded-b-xl' : 'border-l border-r border-b bg-stone-50 text-stone-400 border-stone-200 hover:text-stone-700 rounded-b-xl'
                  }`}
                >
                  <Users className="w-3 h-3" />
                  {isLineupOpen ? 'Hide Builds' : 'View Builds'}
                  {isLineupOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              ) : null;

              const lineupContent = isLineupOpen && hasLineup ? (
                isCompleted ? (
                  <LineupPanel
                    data={lineupCache[match.lineup_file]}
                    loading={!!lineupLoading[match.lineup_file]}
                    darkMode={darkMode}
                    homeTeam={match.team_a}
                    awayTeam={match.team_b}
                    homeBanner={match.team_a ? getTeamBanner(match.team_a) : null}
                    awayBanner={match.team_b ? getTeamBanner(match.team_b) : null}
                  />
                ) : (
                  <div className={`rounded-b-xl overflow-hidden border-l border-r border-b ${
                    darkMode ? 'bg-gray-900 border-gray-800' : 'bg-stone-50 border-stone-200'
                  }`}>
                    <LineupPanel
                      data={lineupCache[match.lineup_file]}
                      loading={!!lineupLoading[match.lineup_file]}
                      darkMode={darkMode}
                      homeTeam={match.team_a}
                      awayTeam={match.team_b}
                      homeBanner={match.team_a ? getTeamBanner(match.team_a) : null}
                      awayBanner={match.team_b ? getTeamBanner(match.team_b) : null}
                    />
                  </div>
                )
              ) : null;

              return isCompleted ? (
                <div key={mi} className="rounded-xl p-[1px]" style={{ background: `linear-gradient(to right, ${gradientColors})` }}>
                  <div className={`rounded-[11px] overflow-hidden ${darkMode ? 'bg-gray-900' : 'bg-stone-50'}`}>
                    {innerRow}
                    {viewBuildsBtn}
                    {lineupContent}
                  </div>
                </div>
              ) : (
                <div key={mi}>
                  {innerRow}
                  {viewBuildsBtn}
                  {lineupContent}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function PlayoffBracket({
  playoffs, seedingsMap, darkMode,
  getTeamIcon, getTeamColor, getTeamBanner,
  openLineups, lineupCache, lineupLoading, toggleLineup,
}) {
  const [selectedKey, setSelectedKey] = useState(null);
  const [view, setView] = useState('bracket');

  const seedings = React.useMemo(() => {
    if (playoffs?.seedings?.length) return playoffs.seedings;
    if (!seedingsMap?.size) return [];
    const arr = new Array(seedingsMap.size);
    seedingsMap.forEach((val, team) => { arr[val.seed - 1] = team; });
    return arr;
  }, [playoffs?.seedings, seedingsMap]);

  const derivedRounds = React.useMemo(
    () => deriveRounds(playoffs?.rounds, seedings),
    [playoffs?.rounds, seedings]
  );

  if (!derivedRounds?.length) {
    return (
      <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-stone-400'}`}>
        Bracket will be displayed once playoffs begin.
      </p>
    );
  }

  const maxMatches = Math.max(...derivedRounds.map((r) => r.matches.length));
  const totalH = maxMatches * BRACKET_SLOT_H;
  const stroke = darkMode ? '#374151' : '#CBD5E1';

  const getMatchCenter = (ri, mi) => {
    const slotH = totalH / derivedRounds[ri].matches.length;
    return (mi + 0.5) * slotH;
  };

  // Draws connectors purely from each match's sourceA/sourceB — the exact
  // same indices deriveRounds used to decide the matchup. This can never
  // drift out of sync with the pairing logic again, unlike the old
  // approach which re-derived row positions from scratch assuming a fixed
  // "groupSize" pattern that didn't hold for the seeded (mirrored) pairs.
  const renderConnector = (ri) => {
    const midX = BRACKET_CONN_W / 2;
    const paths = [];
    derivedRounds[ri + 1].matches.forEach((match, ti) => {
      const ty = getMatchCenter(ri + 1, ti);
      const sources = [match.sourceA, match.sourceB].filter((s) => s !== null && s !== undefined);

      if (sources.length === 1) {
        // One side enters this round directly (e.g. a bye seed) — only the
        // other side has an incoming match, so draw a single bent line.
        const fy = getMatchCenter(ri, sources[0]);
        paths.push(
          <path key={`s${ti}`} d={`M0,${fy}H${midX}V${ty}H${BRACKET_CONN_W}`} stroke={stroke} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        );
      } else if (sources.length === 2) {
        const [s1, s2] = sources;
        const y1 = getMatchCenter(ri, s1);
        const y2 = getMatchCenter(ri, s2);
        const topY = Math.min(y1, y2);
        const botY = Math.max(y1, y2);
        paths.push(
          <path key={`h${ti}a`} d={`M0,${y1}H${midX}`} stroke={stroke} strokeWidth="1.5" fill="none" strokeLinecap="round" />,
          <path key={`h${ti}b`} d={`M0,${y2}H${midX}`} stroke={stroke} strokeWidth="1.5" fill="none" strokeLinecap="round" />,
          <path key={`v${ti}`} d={`M${midX},${topY}V${botY}`} stroke={stroke} strokeWidth="1.5" fill="none" strokeLinecap="round" />,
          <path key={`t${ti}`} d={`M${midX},${ty}H${BRACKET_CONN_W}`} stroke={stroke} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        );
      }
    });
    return <svg key={`conn-${ri}`} width={BRACKET_CONN_W} height={totalH} style={{ flexShrink: 0 }}>{paths}</svg>;
  };

  const champion = derivedRounds[derivedRounds.length - 1]?.matches?.[0]?.winner ?? null;

  const selectedMatchInfo = React.useMemo(() => {
    if (!selectedKey) return null;
    const [ri, mi] = selectedKey.split('-').map(Number);
    const round = derivedRounds[ri];
    if (!round) return null;
    return { roundName: round.round, match: round.matches[mi], matchKey: `playoff-r${ri}-m${mi}` };
  }, [selectedKey, derivedRounds]);

  const sharedProps = { darkMode, getTeamIcon, getTeamColor, getTeamBanner, openLineups, lineupCache, lineupLoading, toggleLineup };

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className={darkMode ? 'text-gray-400' : 'text-stone-500'}>
            Format:{' '}
            <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-stone-700'}`}>{playoffs.format}</span>
          </span>
          <span className={darkMode ? 'text-gray-400' : 'text-stone-500'}>
            Series:{' '}
            <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-stone-700'}`}>Best of 3</span>
          </span>
          {champion && (
            <span className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="font-semibold text-yellow-400">{champion}</span>
            </span>
          )}
        </div>
        {/* Bracket / List toggle */}
        <div className={`flex gap-1 p-1 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-stone-200'}`}>
          {['bracket', 'list'].map((v) => (
            <button key={v}
              onClick={() => { setView(v); if (v === 'list') setSelectedKey(null); }}
              className={`px-3 py-1 text-xs rounded-md font-medium capitalize transition-colors ${
                view === v
                  ? darkMode ? 'bg-gray-700 text-white' : 'bg-white text-stone-800 shadow-sm'
                  : darkMode ? 'text-gray-400 hover:text-white' : 'text-stone-500 hover:text-stone-700'
              }`}
            >{v}</button>
          ))}
        </div>
      </div>

      {view === 'list' ? (
        <PlayoffListView rounds={derivedRounds} {...sharedProps} />
      ) : (
        <>
          <div className="overflow-x-auto pb-2">
            {/* Round label row */}
            <div className="flex mb-2">
              {derivedRounds.map((round, ri) => (
                <React.Fragment key={ri}>
                  <div style={{ width: BRACKET_ROUND_W, flexShrink: 0 }} className="text-center">
                    <span className={`text-xs font-semibold ${
                      ri === derivedRounds.length - 1 ? 'text-yellow-400' : darkMode ? 'text-gray-400' : 'text-stone-500'
                    }`}>{round.round}</span>
                  </div>
                  {ri < derivedRounds.length - 1 && <div style={{ width: BRACKET_CONN_W, flexShrink: 0 }} />}
                </React.Fragment>
              ))}
            </div>
            {/* Bracket body */}
            <div className="flex" style={{ height: totalH }}>
              {derivedRounds.map((round, ri) => {
                const n = round.matches.length;
                const slotH = totalH / n;
                const isFinalRound = ri === derivedRounds.length - 1;
                return (
                  <React.Fragment key={ri}>
                    <div style={{ width: BRACKET_ROUND_W, flexShrink: 0, position: 'relative', height: totalH }}>
                      {round.matches.map((match, mi) => {
                        const key = `${ri}-${mi}`;
                        const isSelected = selectedKey === key;
                        const isCompleted = match?.status === 'completed';
                        const teamAWon = isCompleted && match.winner === match.team_a;
                        const teamBWon = isCompleted && match.winner === match.team_b;
                        const top = mi * slotH + (slotH - BRACKET_MATCH_H) / 2;
                        return (
                          <div key={mi} style={{ position: 'absolute', top, left: 4, right: 4 }}>
                            <div
                              onClick={() => setSelectedKey((prev) => prev === key ? null : key)}
                              className={`relative rounded-lg overflow-hidden border cursor-pointer transition-all ${
                                isSelected
                                  ? darkMode ? 'border-purple-500 bg-gray-800 shadow-lg shadow-purple-500/10' : 'border-purple-400 bg-white shadow-lg'
                                  : isFinalRound
                                    ? darkMode ? 'border-yellow-500/50 bg-gray-800 hover:border-yellow-400/70' : 'border-yellow-500/60 bg-white shadow-md hover:border-yellow-500'
                                    : darkMode ? 'border-gray-700 bg-gray-800 hover:border-gray-600' : 'border-stone-200 bg-white shadow-sm hover:border-stone-300'
                              }`}
                              style={{ height: BRACKET_MATCH_H }}
                            >
                              <BracketTeamRow
                                team={match.team_a} seed={match.seed_a}
                                won={teamAWon} lost={teamBWon}
                                score={isCompleted ? match.score_a : null}
                                darkMode={darkMode}
                                icon={match.team_a ? getTeamIcon(match.team_a) : null}
                                color={match.team_a ? getTeamColor(match.team_a) : '#6B7280'}
                              />
                              <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-stone-200'}`} />
                              <BracketTeamRow
                                team={match.team_b} seed={match.seed_b}
                                won={teamBWon} lost={teamAWon}
                                score={isCompleted ? match.score_b : null}
                                darkMode={darkMode}
                                icon={match.team_b ? getTeamIcon(match.team_b) : null}
                                color={match.team_b ? getTeamColor(match.team_b) : '#6B7280'}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {ri < derivedRounds.length - 1 && renderConnector(ri)}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
          {selectedMatchInfo && (
            <PlayoffMatchDetailPanel
              {...selectedMatchInfo}
              {...sharedProps}
              onClose={() => setSelectedKey(null)}
            />
          )}
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────

export default function SeasonPage({ darkMode }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { siteData, selectedSeason, setSelectedSeason } = useSeasonContext();
  const [data, setData] = useState(null);
  const [teams, setTeams] = useState(null);
  const activeTab = searchParams.get('tab') || 'standings';
  const selectedPhase = searchParams.get('phase') || null;
  const [collapsedWeeks, setCollapsedWeeks] = useState({});
  const [openLineups, setOpenLineups] = useState({});
  const [lineupCache, setLineupCache] = useState({});
  const [lineupLoading, setLineupLoading] = useState({});

  // Load selected season data and matching teams file
  useEffect(() => {
    if (!selectedSeason) return;
    setData(null);
    // Fetch from seasons/ subfolder
    fetch(`${import.meta.env.BASE_URL}content/seasons/${selectedSeason}`)
      .then((r) => r.text())
      .then((text) => {
        const seasonData = yaml.load(text);
        setData(seasonData);
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set('phase', seasonData.active_phase || 'main_season');
          return next;
        }, { replace: true });
      });
    // Load teams for this season
    fetch(`${import.meta.env.BASE_URL}content/teams/${selectedSeason}`)
      .then((r) => r.text())
      .then((text) => setTeams(yaml.load(text)))
      .catch(() => setTeams(null));
  }, [selectedSeason]);

  // Compute standings from main season schedule
  const mainSeasonStandings = useMemo(() => {
    return computeStandingsFromSchedule(data?.schedule);
  }, [data]);

  // Compute standings from pre-season schedule
  const preseasonStandings = useMemo(() => {
    return computeStandingsFromSchedule(data?.preseason_schedule);
  }, [data]);

  // Pick the standings to display based on selected phase
  const displayedStandings = useMemo(() => {
    if (selectedPhase === 'preseason') return preseasonStandings;
    // main_season and playoffs both show main season standings
    return mainSeasonStandings;
  }, [selectedPhase, preseasonStandings, mainSeasonStandings]);

  // Compute overall playoff seeds and clinching status from main season standings
  const playoffSeeds = useMemo(() => {
    if (!data?.kais) return new Map();
    const ms = data.schedule || [];
    const remaining = {};
    for (const week of ms) {
      for (const m of week.matches || []) {
        if (m.status === 'completed') continue;
        [m.home, m.away].forEach((t) => { remaining[t] = (remaining[t] || 0) + 1; });
      }
    }
    const sortByRecord = (teamObjs) => {
      const withRec = teamObjs.map((t) => ({ ...t, ...(mainSeasonStandings[t.team] || { wins: 0, losses: 0 }) }));
      withRec.sort((a, b) => b.wins - a.wins || a.losses - b.losses);
      const out = [];
      let i = 0;
      while (i < withRec.length) {
        let j = i + 1;
        while (j < withRec.length && withRec[j].wins === withRec[i].wins && withRec[j].losses === withRec[i].losses) j++;
        out.push(...applyTiebreakers(withRec.slice(i, j), ms));
        i = j;
      }
      return out;
    };
    const divWinners = [];
    const wildcards = [];
    const clinched = new Set();
    for (const kai of data.kais) {
      const sorted = sortByRecord(kai.teams || []);
      if (!sorted.length) continue;
      const leaderWins = mainSeasonStandings[sorted[0].team]?.wins || 0;
      const leaderRemaining = remaining[sorted[0].team] || 0;
      const hasClinched = sorted.slice(1).every((t) => {
        const tWins = mainSeasonStandings[t.team]?.wins || 0;
        const tRemaining = remaining[t.team] || 0;
        // Still mathematically possible for t to catch/pass the leader.
        if (leaderWins + leaderRemaining < tWins) return false;
        if (leaderWins > tWins + tRemaining) return true;
        // Tied (or leader could still be caught) but both teams are done
        // playing — the tiebreaker that sortByRecord already applied is
        // final, so the leader's spot is locked in.
        if (leaderRemaining === 0 && tRemaining === 0) return true;
        return false;
      });
      if (hasClinched) clinched.add(sorted[0].team);
      divWinners.push(sorted[0]);
      wildcards.push(...sorted.slice(1));
    }
    const seeds = new Map();
    sortByRecord(divWinners).forEach((t, i) => seeds.set(t.team, { seed: i + 1, isDivWinner: true, isClinched: clinched.has(t.team) }));
    sortByRecord(wildcards).forEach((t, i) => seeds.set(t.team, { seed: i + divWinners.length + 1, isDivWinner: false, isClinched: false }));
    return seeds;
  }, [data, mainSeasonStandings]);

  if (!data) {
    return <div className="flex items-center justify-center py-20 text-lg animate-pulse">Loading season...</div>;
  }

  const activePhase = data.active_phase || 'main_season';
  const allSeasons = siteData?.all_seasons || [];

  const sortKaiTeams = (kaiTeams) => {
    const withRecords = [...kaiTeams].map((s) => ({
      ...s,
      ...(displayedStandings[s.team] || { wins: 0, losses: 0 }),
    }));
    withRecords.sort((a, b) => b.wins - a.wins || a.losses - b.losses);
    const result = [];
    let i = 0;
    while (i < withRecords.length) {
      let j = i + 1;
      while (
        j < withRecords.length &&
        withRecords[j].wins === withRecords[i].wins &&
        withRecords[j].losses === withRecords[i].losses
      ) { j++; }
      result.push(...applyTiebreakers(withRecords.slice(i, j), scheduleForPhase));
      i = j;
    }
    return result;
  };

  const getTeamColor = (name) =>
    teams?.teams?.find((t) => t.name === name)?.color || '#6B7280';

  const getTeamIcon = (name) =>
    teams?.teams?.find((t) => t.name === name)?.icon || null;

  const getTeamSlug = (name) =>
    teams?.teams?.find((t) => t.name === name)?.slug || null;

  const getTeamBanner = (name) =>
    teams?.teams?.find((t) => t.name === name)?.banner || null;

  const toggleLineup = async (matchKey, lineupFile) => {
    const isOpening = !openLineups[matchKey];
    setOpenLineups(prev => ({ ...prev, [matchKey]: !prev[matchKey] }));
    if (!isOpening || !lineupFile || lineupCache[lineupFile] || lineupLoading[lineupFile]) return;
    setLineupLoading(prev => ({ ...prev, [lineupFile]: true }));
    try {
      const resp = await fetch(`${import.meta.env.BASE_URL}content/lineups/${lineupFile}`);
      const text = await resp.text();
      setLineupCache(prev => ({ ...prev, [lineupFile]: yaml.load(text) }));
    } catch (e) {
      console.error('Failed to load lineup:', e);
    } finally {
      setLineupLoading(prev => ({ ...prev, [lineupFile]: false }));
    }
  };

  const tabs = [
    { key: 'standings', label: 'Standings', icon: Trophy },
    { key: 'schedule', label: 'Schedule', icon: Calendar },
  ];

  const phases = ['preseason', 'main_season', 'playoffs'];

  // Get the schedule to display based on selected phase
  const scheduleForPhase = selectedPhase === 'preseason'
    ? data.preseason_schedule || []
    : data.schedule || [];

  const standingsLabel = selectedPhase === 'preseason'
    ? 'Pre-Season Standings'
    : 'Main Season Standings';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Calendar className="w-8 h-8 text-green-400" />
              {data.season}
            </h1>
            <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>
              {data.game} · Status: {data.status}
            </p>
          </div>

          {/* Season selector dropdown */}
          {allSeasons.length > 1 && (
            <div className="relative">
              <select
                value={selectedSeason || ''}
                onChange={(e) => setSelectedSeason(e.target.value)}
                className={`appearance-none pl-4 pr-10 py-2 rounded-xl border text-sm font-medium cursor-pointer ${
                  darkMode
                    ? 'bg-gray-900 border-gray-700 text-white'
                    : 'bg-stone-50 border-stone-300 text-stone-800'
                }`}
              >
                {allSeasons.map((s) => (
                  <option key={s.file} value={s.file}>{s.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {/* Tab switcher + Phase selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <div className={`flex gap-1 p-1 rounded-xl w-fit ${darkMode ? 'bg-gray-900' : 'bg-stone-200'}`}>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSearchParams((prev) => { const n = new URLSearchParams(prev); n.set('tab', key); return n; })}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === key
                ? darkMode ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'
                : darkMode
                  ? 'text-gray-400 hover:text-white'
                  : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
        </div>
        <div className={`flex gap-1 p-1 rounded-xl w-fit ${darkMode ? 'bg-gray-900' : 'bg-stone-200'}`}>
          {phases.map((phase) => {
            const isActive = selectedPhase === phase;
            const isCurrent = activePhase === phase;
            return (
              <button
                key={phase}
                onClick={() => setSearchParams((prev) => { const n = new URLSearchParams(prev); n.set('phase', phase); return n; })}
                className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-purple-600 text-white'
                    : darkMode
                      ? 'text-gray-400 hover:text-white'
                      : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {PHASE_LABELS[phase]}
                {isCurrent && (
                  <span className={`w-2 h-2 rounded-full ${
                    isActive ? 'bg-white' : darkMode ? 'bg-purple-400' : 'bg-purple-500'
                  }`} title="Currently active phase" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Standings — grouped by Kai, or bracket when in playoffs phase */}
      {activeTab === 'standings' && (
        <div className="space-y-8">
          <h2 className={`text-xl font-bold ${darkMode ? 'text-gray-200' : 'text-stone-800'}`}>
            {selectedPhase === 'playoffs' ? 'Playoff Bracket' : standingsLabel}
          </h2>
          {selectedPhase === 'playoffs' ? (
            <div className={`rounded-xl border p-4 sm:p-6 ${
              darkMode ? 'bg-gray-900 border-gray-800' : 'bg-stone-50 border-stone-200 shadow-sm'
            }`}>
              <PlayoffBracket
                playoffs={data.playoffs}
                seedingsMap={playoffSeeds}
                darkMode={darkMode}
                getTeamIcon={getTeamIcon}
                getTeamColor={getTeamColor}
                getTeamBanner={getTeamBanner}
                openLineups={openLineups}
                lineupCache={lineupCache}
                lineupLoading={lineupLoading}
                toggleLineup={toggleLineup}
              />
            </div>
          ) : null}
          {selectedPhase !== 'playoffs' && (data.kais || []).map((kai) => {
            const sortedTeams = sortKaiTeams(kai.teams || []);
            return (
              <div key={kai.name}>
                <h3 className={`text-lg font-bold mb-3 ${
                  darkMode ? 'text-orange-400' : 'text-blue-600'
                }`}>{kai.name}</h3>
                <div className={`rounded-xl border overflow-hidden ${
                  darkMode ? 'bg-gray-900 border-gray-800' : 'bg-stone-50 border-stone-200 shadow-sm'
                }`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={`border-b ${darkMode ? 'border-gray-800 bg-gray-900/80' : 'border-stone-200 bg-stone-100'}`}>
                          <th className="text-left py-3 px-4 font-semibold">{selectedPhase === 'preseason' ? '#' : 'Seed'}</th>
                          <th className="text-left py-3 px-4 font-semibold">Team</th>
                          <th className="text-center py-3 px-4 font-semibold">W</th>
                          <th className="text-center py-3 px-4 font-semibold">L</th>
                          <th className="text-center py-3 px-4 font-semibold">Win%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedTeams.map((s, i) => {
                          const played = s.wins + s.losses;
                          const wr = played > 0 ? ((s.wins / played) * 100).toFixed(0) : '—';
                          const slug = getTeamSlug(s.team);
                          const ps = selectedPhase !== 'preseason' ? playoffSeeds.get(s.team) : null;
                          const clinchRow = ps?.isClinched;
                          return (
                            <tr
                              key={s.team}
                              onClick={() => slug && navigate(`/teams/${slug}/schedule?season=${selectedSeason}`)}
                              className={`border-b last:border-0 transition-colors ${
                                slug ? 'cursor-pointer' : ''
                              } ${
                                clinchRow
                                  ? darkMode
                                    ? 'border-yellow-900/40 bg-yellow-500/5 hover:bg-yellow-500/10'
                                    : 'border-yellow-200 bg-yellow-50/60 hover:bg-yellow-50'
                                  : darkMode
                                    ? 'border-gray-800 hover:bg-gray-800/40'
                                    : 'border-stone-200 hover:bg-stone-100'
                              }`}
                            >
                              <td className={`py-3 px-4 font-semibold ${
                                clinchRow ? 'text-yellow-400' : ps ? darkMode ? 'text-gray-300' : 'text-stone-600' : 'text-gray-400'
                              }`}>
                                {ps ? ps.seed : i + 1}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  {getTeamIcon(s.team) ? (
                                    <img
                                      src={getTeamIcon(s.team)}
                                      alt={s.team}
                                      className="w-7 h-7 rounded-md object-cover flex-shrink-0"
                                    />
                                  ) : (
                                    <div
                                      className="w-7 h-7 rounded-md flex-shrink-0"
                                      style={{ backgroundColor: getTeamColor(s.team) }}
                                    />
                                  )}
                                  <span className={`font-medium transition-colors ${darkMode ? 'hover:text-orange-400' : 'hover:text-blue-600'}`}>{s.team}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center font-semibold text-green-400">{s.wins}</td>
                              <td className="py-3 px-4 text-center font-semibold text-red-400">{s.losses}</td>
                              <td className="py-3 px-4 text-center font-semibold">{wr === '—' ? wr : `${wr}%`}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule */}
      {activeTab === 'schedule' && (
        <div className="space-y-8">
          {/* Schedule header */}
          <h2 className={`text-xl font-bold ${darkMode ? 'text-gray-200' : 'text-stone-800'}`}>
            {selectedPhase === 'preseason' ? 'Pre-Season Schedule' : selectedPhase === 'playoffs' ? 'Playoff Bracket' : 'Main Season Schedule'}
          </h2>

          {/* Playoffs phase shows the bracket instead of weekly schedule */}
          {selectedPhase === 'playoffs' ? (
            <div className={`rounded-xl border p-4 sm:p-6 ${
              darkMode ? 'bg-gray-900 border-gray-800' : 'bg-stone-50 border-stone-200 shadow-sm'
            }`}>
              <PlayoffBracket
                playoffs={data.playoffs}
                seedingsMap={playoffSeeds}
                darkMode={darkMode}
                getTeamIcon={getTeamIcon}
                getTeamColor={getTeamColor}
                getTeamBanner={getTeamBanner}
                openLineups={openLineups}
                lineupCache={lineupCache}
                lineupLoading={lineupLoading}
                toggleLineup={toggleLineup}
              />
            </div>
          ) : (
            /* Pre-season or Main season weekly schedule */
            <>
            <div className="flex items-center justify-end mb-2">
              <button
                onClick={() => {
                  const allWeeks = scheduleForPhase.map(w => w.week);
                  const allCollapsed = allWeeks.every(w => collapsedWeeks[`${selectedPhase}-${w}`]);
                  const updated = { ...collapsedWeeks };
                  allWeeks.forEach(w => { updated[`${selectedPhase}-${w}`] = !allCollapsed; });
                  setCollapsedWeeks(updated);
                }}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-200'
                }`}
              >
                <ChevronsUpDown className="w-3.5 h-3.5" />
                {scheduleForPhase.every(w => collapsedWeeks[`${selectedPhase}-${w.week}`]) ? 'Expand All' : 'Collapse All'}
              </button>
            </div>
            {(scheduleForPhase).map((week) => {
              const weekKey = `${selectedPhase}-${week.week}`;
              const isCollapsed = !!collapsedWeeks[weekKey];
              return (
            <div key={week.week}>
              <button
                onClick={() => setCollapsedWeeks(prev => ({ ...prev, [weekKey]: !isCollapsed }))}
                className={`flex items-center gap-2 text-lg font-semibold mb-4 w-full text-left transition-colors ${
                  darkMode ? 'hover:text-orange-400' : 'hover:text-blue-600'
                }`}
              >
                {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                Week {week.week}
                {week.stream_date && (
                  <span className={`text-sm font-normal ml-1 ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>
                    · {week.stream_date}
                  </span>
                )}
              </button>
              {!isCollapsed && <div className="grid gap-3">
                {(week.matches || []).map((m, i) => {
                  const isCompleted = m.status === 'completed';
                  const homeWin = isCompleted && m.winner === m.home;
                  const awayWin = isCompleted && m.winner === m.away;
                  const hasVideo = isCompleted && m.video_url;
                  const hasLineup = !!m.lineup_file;
                  const matchKey = `${weekKey}-${i}`;
                  const isLineupOpen = !!openLineups[matchKey];

                  const hasGradientBorder = isCompleted && m.winner;
                  const gradientColors = homeWin
                    ? 'rgba(34,197,94,0.45), rgba(34,197,94,0.18) 35%, transparent 50%, rgba(239,68,68,0.18) 65%, rgba(239,68,68,0.45)'
                    : 'rgba(239,68,68,0.45), rgba(239,68,68,0.18) 35%, transparent 50%, rgba(34,197,94,0.18) 65%, rgba(34,197,94,0.45)';

                  const innerCard = (
                    <div
                      className={`rounded-t-xl p-2 sm:p-4 flex items-center justify-between transition-colors ${
                        hasVideo ? 'cursor-pointer' : ''
                      } ${
                        hasGradientBorder
                          ? darkMode
                            ? 'bg-gray-900 hover:bg-gray-800/80'
                            : 'bg-stone-50 shadow-sm hover:bg-stone-100'
                          : darkMode
                            ? 'bg-gray-900 border border-gray-800 hover:border-gray-600'
                            : 'bg-stone-50 border border-stone-200 shadow-sm hover:border-stone-400'
                      }`}
                    >
                      {/* Home Team */}
                      <div className={`flex items-center gap-1.5 sm:gap-3 flex-1 min-w-0 ${
                        homeWin ? 'font-bold text-green-400' : awayWin ? 'text-red-400' : ''
                      }`}>
                        {getTeamIcon(m.home) ? (
                          <img
                            src={getTeamIcon(m.home)}
                            alt={m.home}
                            className="w-5 h-5 sm:w-7 sm:h-7 rounded-md object-cover flex-shrink-0"
                          />
                        ) : (
                          <div
                            className="w-5 h-5 sm:w-7 sm:h-7 rounded-md flex-shrink-0"
                            style={{ backgroundColor: getTeamColor(m.home) }}
                          />
                        )}
                        <span className="truncate text-sm sm:text-base">{m.home}</span>
                      </div>

                      {/* Result */}
                      <div className="flex items-center gap-2 px-1.5 sm:px-4 flex-shrink-0">
                        {isCompleted ? (
                          <div className="flex flex-col items-center justify-center gap-1 h-[40px] sm:h-[52px]">
                            <span className={`text-xs sm:text-sm font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full ${
                              darkMode ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/40' : 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                            }`}>
                              Final
                            </span>
                            {m.divisional && (
                              <span className={`text-xs font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full ${
                                darkMode ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-600'
                              }`}>
                                <Shield className="w-3 h-3" /> DIV
                              </span>
                            )}
                            {hasVideo && (
                              <span className={`text-xs flex items-center gap-1 ${darkMode ? 'text-orange-400' : 'text-blue-600'}`}>
                                <ExternalLink className="w-3 h-3" /> Watch
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-1 h-[40px] sm:h-[52px]">
                            <span className={`text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1 rounded-full ${
                              darkMode ? 'bg-gray-800 text-gray-400' : 'bg-stone-200 text-stone-500'
                            }`}>
                              Upcoming
                            </span>
                            {m.divisional && (
                              <span className={`text-xs font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full ${
                                darkMode ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-600'
                              }`}>
                                <Shield className="w-3 h-3" /> DIV
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Away Team */}
                      <div className={`flex items-center gap-1.5 sm:gap-3 flex-1 min-w-0 justify-end text-right ${
                        awayWin ? 'font-bold text-green-400' : homeWin ? 'text-red-400' : ''
                      }`}>
                        <span className="truncate text-sm sm:text-base">{m.away}</span>
                        {getTeamIcon(m.away) ? (
                          <img
                            src={getTeamIcon(m.away)}
                            alt={m.away}
                            className="w-5 h-5 sm:w-7 sm:h-7 rounded-md object-cover flex-shrink-0"
                          />
                        ) : (
                          <div
                            className="w-5 h-5 sm:w-7 sm:h-7 rounded-md flex-shrink-0"
                            style={{ backgroundColor: getTeamColor(m.away) }}
                          />
                        )}
                      </div>
                    </div>
                  );

                  const tabBorder = darkMode
                    ? 'border-l border-r border-b border-gray-800'
                    : 'border-l border-r border-b border-stone-200';

                  const viewBuildsButton = (
                    <button
                      onClick={() => hasLineup && toggleLineup(matchKey, m.lineup_file)}
                      disabled={!hasLineup}
                      className={`w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors border-t ${
                        hasGradientBorder ? 'rounded-none' : isLineupOpen ? 'rounded-none' : 'rounded-b-xl'
                      } ${hasGradientBorder ? '' : tabBorder} ${
                        !hasLineup
                          ? darkMode
                            ? 'bg-gray-900 text-gray-700 cursor-not-allowed border-gray-800'
                            : 'bg-stone-50 text-stone-300 cursor-not-allowed border-stone-200'
                          : isLineupOpen
                            ? darkMode
                              ? 'bg-gray-800 text-blue-400 border-gray-700 hover:bg-gray-700'
                              : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                            : darkMode
                              ? 'bg-gray-900 text-gray-500 border-gray-800 hover:text-gray-200 hover:bg-gray-800'
                              : 'bg-stone-50 text-stone-400 border-stone-200 hover:text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <Users className="w-3 h-3" />
                      <span>{!hasLineup ? 'Builds Unavailable' : isLineupOpen ? 'Hide Builds' : 'View Builds'}</span>
                      {hasLineup && (isLineupOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                    </button>
                  );

                  if (hasGradientBorder) {
                    return (
                      <div key={i}>
                        <div
                          className="rounded-xl p-[1px]"
                          style={{ background: `linear-gradient(to right, ${gradientColors})` }}
                        >
                          <div className={`rounded-[11px] overflow-hidden ${darkMode ? 'bg-gray-900' : 'bg-stone-50 shadow-sm'}`}>
                            {hasVideo ? (
                              <a href={m.video_url} target="_blank" rel="noopener noreferrer">
                                {innerCard}
                              </a>
                            ) : innerCard}
                            {viewBuildsButton}
                            {isLineupOpen && (
                              <LineupPanel
                                data={lineupCache[m.lineup_file]}
                                loading={!!lineupLoading[m.lineup_file]}
                                darkMode={darkMode}
                                homeTeam={m.home}
                                awayTeam={m.away}
                                homeBanner={getTeamBanner(m.home)}
                                awayBanner={getTeamBanner(m.away)}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={i}>
                      {hasVideo ? (
                        <a href={m.video_url} target="_blank" rel="noopener noreferrer">
                          {innerCard}
                        </a>
                      ) : innerCard}
                      {viewBuildsButton}
                      {isLineupOpen && (
                        <div className={`rounded-b-xl overflow-hidden ${
                          darkMode
                            ? 'bg-gray-900 border-l border-r border-b border-gray-800'
                            : 'bg-stone-50 border-l border-r border-b border-stone-200'
                        }`}>
                          <LineupPanel
                            data={lineupCache[m.lineup_file]}
                            loading={!!lineupLoading[m.lineup_file]}
                            darkMode={darkMode}
                            homeTeam={m.home}
                            awayTeam={m.away}
                            homeBanner={getTeamBanner(m.home)}
                            awayBanner={getTeamBanner(m.away)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>}
            </div>
              );
            })}
            </>
          )}
        </div>
      )}
    </div>
  );
}