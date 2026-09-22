import React, { useState } from 'react';
import { Trophy, Medal, ChevronDown, ChevronUp, Users } from 'lucide-react';
import {
  LineupPanel, LineupWeekSwitcher, PlayoffVideoLinks,
  getLineupWeekFiles, getVideoWeekUrls,
} from './LineupPanel';

// Single-elimination bracket renderer. Originally written for the season
// playoffs; the Events page reuses it for tournament-style event blocks,
// which is why `playoffs` is just "anything shaped like the playoffs YAML"
// ({ format, seedings, rounds[].matches[], third_place_match? }).

// ─── Playoff Bracket ──────────────────────────────────────────────────────────

const BRACKET_MATCH_H = 76;
const BRACKET_SLOT_H = 108;
const BRACKET_ROUND_W = 220;
const BRACKET_CONN_W = 36;

export function BracketTeamRow({ team, seed, won, lost, score, darkMode, icon, color }) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2 ${
        won ? (darkMode ? 'bg-green-500/10' : 'bg-green-50') : ''
      }`}
      style={{ height: 37 }}
    >
      {seed != null && (
        <span className="text-[12px] w-3.5 flex-shrink-0 font-mono text-gray-500">{seed}</span>
      )}
      {icon ? (
        <img
          src={icon}
          alt={team || ''}
          className="w-6 h-6 rounded flex-shrink-0 object-cover"
          style={{ opacity: lost ? 0.35 : 1 }}
        />
      ) : (
        <div
          className="w-5 h-5 rounded flex-shrink-0"
          style={{ backgroundColor: color || '#6B7280', opacity: lost ? 0.35 : 1 }}
        />
      )}
      <span
        className={`text-sm flex-1 truncate min-w-0 ${lost ? 'opacity-40 ' : ''}${
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
export function seedOrder(size) {
  if (size <= 1) return [1];
  const prev = seedOrder(size / 2);
  const out = [];
  prev.forEach((s) => { out.push(s); out.push(size + 1 - s); });
  return out;
}

// Builds each round's connector-source indices in DISPLAY order (not raw
// seed-ascending order) so that every connector between rounds is a simple
// straight or adjacent line — no bending across rows. This is the actual
// bracket-seeding layout: read the 8 "post wild-card" slots (4 byes + 4
// wild-card games) off seedOrder(8) = [1,8,4,5,2,7,3,6]. The bye seeds in
// that list (1,4,2,3) become the Quarterfinal row order; the wild-card
// hosts (8,5,7,6) become the Wild Card row order — and because both come
// from the same list, a Wild Card row always lines up with the
// Quarterfinal row it feeds. Semifinals then simply pair adjacent
// Quarterfinal rows (0&1, 2&3), which — thanks to the reorder — correctly
// groups seed 1's path with seed 4's path, and seed 2's path with seed 3's.
//
// Wild Card and Quarterfinal matches are entered in the CMS in this same
// top-to-bottom display order (matches[0] is the first match shown in that
// round), so `matches[dispRow]` IS the match for a given display row —
// no separate raw-order lookup needed. We still need to know which seeds
// meet at each display slot (that pairing is fixed by seedOrder()), so
// that part of the math stays; it's just applied by display row now.
// Fallback for brackets with no seedings list (event tournaments where every
// first-round matchup is written out explicitly as team_a/team_b). Round N+1
// rows are fed by adjacent rows of round N when it has half as many matches,
// or by the same row (bye pattern) when it has the same count; winners are
// advanced into empty slots so later rounds fill in as results are entered.
function deriveUnseededRounds(rawRounds) {
  const rounds = [{ ...rawRounds[0], matches: rawRounds[0].matches.map((m) => ({
    ...m, team_a: m.team_a || null, team_b: m.team_b || null,
    seed_a: m.seed_a ?? null, seed_b: m.seed_b ?? null, sourceA: null, sourceB: null,
  })) }];
  let prev = rounds[0].matches;
  for (let ri = 1; ri < rawRounds.length; ri++) {
    const prevWinners = prev.map((m) => m.winner ?? null);
    const halves = rawRounds[ri].matches.length * 2 === prev.length;
    const same = rawRounds[ri].matches.length === prev.length;
    const matches = rawRounds[ri].matches.map((m, mi) => {
      let sourceA = null, sourceB = null;
      if (halves) { sourceA = mi * 2; sourceB = mi * 2 + 1; }
      else if (same) { sourceB = mi; }
      let team_a = m.team_a || (sourceA !== null ? prevWinners[sourceA] : null) || null;
      let team_b = m.team_b || (sourceB !== null ? prevWinners[sourceB] : null) || null;
      return { ...m, team_a, team_b, seed_a: m.seed_a ?? null, seed_b: m.seed_b ?? null, sourceA, sourceB };
    });
    rounds.push({ ...rawRounds[ri], matches });
    prev = matches;
  }
  return rounds;
}

export function deriveRounds(rawRounds, seedings) {
  if (!rawRounds?.length) return [];
  if (!seedings?.length) return deriveUnseededRounds(rawRounds);
  const n = seedings.length;
  const wcCount = rawRounds[0].matches.length;
  const byeCount = n - wcCount * 2;
  const postWcCount = byeCount + wcCount;

  const order = seedOrder(postWcCount);
  const seedSlotForWcDisp = order.filter((v) => v > byeCount).map((v) => v - byeCount - 1);
  const seedSlotForQfDisp = order.filter((v) => v <= byeCount).map((v) => v - 1);

  // --- Wild Card, read in display order ---
  const wcMatches = seedSlotForWcDisp.map((seedSlot, dispRow) => {
    const m = rawRounds[0].matches[dispRow];
    let team_a = m.team_a || null;
    let team_b = m.team_b || null;
    let seed_a = m.seed_a ?? null;
    let seed_b = m.seed_b ?? null;
    const aIdx = byeCount + seedSlot;
    const bIdx = n - 1 - seedSlot;
    if (!team_a) { team_a = seedings[aIdx] ?? null; seed_a = aIdx + 1; }
    if (!team_b) { team_b = seedings[bIdx] ?? null; seed_b = bIdx + 1; }
    return { ...m, team_a, team_b, seed_a, seed_b, sourceA: null, sourceB: null };
  });
  const wcWinners = wcMatches.map((m) => m.winner ?? null);

  // --- Quarterfinals, read in display order — each display row lines up
  // with the Wild Card row directly above it, so sourceB is that same row. ---
  const qfMatches = seedSlotForQfDisp.map((seedSlot, dispRow) => {
    const m = rawRounds[1].matches[dispRow];
    let team_a = m.team_a || null;
    let team_b = m.team_b || null;
    let seed_a = m.seed_a ?? seedSlot + 1;
    let seed_b = m.seed_b ?? null;
    if (!team_a) team_a = seedings[seedSlot] ?? null;
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

export function PlayoffMatchDetailPanel({
  roundName, match, matchKey, darkMode,
  getTeamIcon, getTeamColor, getTeamBanner,
  openLineups, lineupCache, lineupLoading, toggleLineup,
  lineupWeek, selectLineupWeek, onClose,
}) {
  if (!match) return null;
  const isCompleted = match.status === 'completed';
  const teamAWon = isCompleted && match.winner === match.team_a;
  const teamBWon = isCompleted && match.winner === match.team_b;
  const isLineupOpen = !!openLineups[matchKey];
  const { week1: videoWeek1, week2: videoWeek2, hasVideo } = getVideoWeekUrls(match);
  const hasScore = match.score_a != null && match.score_b != null;
  const { week1: week1File, week2: week2File, hasLineup, hasBothWeeks } = getLineupWeekFiles(match);
  const activeWeek = lineupWeek[matchKey] || (week1File ? 1 : 2);
  const activeLineupFile = activeWeek === 2 ? week2File : week1File;
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
                <div className="mt-0.5">
                  <PlayoffVideoLinks week1={videoWeek1} week2={videoWeek2} darkMode={darkMode} />
                </div>
              )}
            </div>
          ) : hasScore ? (
            <div className="flex flex-col items-center gap-0.5">
              <span className={`text-xs px-2 py-1 rounded-full ${
                match.status === 'live'
                  ? 'bg-red-500/20 text-red-400'
                  : darkMode ? 'bg-gray-800 text-gray-400' : 'bg-stone-200 text-stone-500'
              }`}>{match.status === 'live' ? '● Live' : 'Upcoming'}</span>
              <div className="text-xl font-bold flex items-center justify-center gap-1">
                <span className="text-gray-400">{match.score_a}</span>
                <span className={`text-sm ${darkMode ? 'text-gray-700' : 'text-stone-300'}`}>-</span>
                <span className="text-gray-400">{match.score_b}</span>
              </div>
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
    <button onClick={() => toggleLineup(matchKey, activeLineupFile)}
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
      {isLineupOpen && hasLineup && hasBothWeeks && (
        <LineupWeekSwitcher
          activeWeek={activeWeek}
          darkMode={darkMode}
          onSelectWeek={(wk) => selectLineupWeek(matchKey, wk, wk === 2 ? week2File : week1File)}
        />
      )}
      {isLineupOpen && hasLineup && (
        <LineupPanel
          data={lineupCache[activeLineupFile]}
          loading={!!lineupLoading[activeLineupFile]}
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

export function PlayoffListView({
  rounds, darkMode, getTeamIcon, getTeamColor, getTeamBanner,
  openLineups, lineupCache, lineupLoading, toggleLineup,
  lineupWeek, selectLineupWeek,
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
              const { week1: videoWeek1, week2: videoWeek2, hasVideo: hasVideoUrl } = getVideoWeekUrls(match);
              const hasVideo = isCompleted && hasVideoUrl;
              const hasScore = match.score_a != null && match.score_b != null;
              const { week1: week1File, week2: week2File, hasLineup, hasBothWeeks } = getLineupWeekFiles(match);
              const activeWeek = lineupWeek[matchKey] || (week1File ? 1 : 2);
              const activeLineupFile = activeWeek === 2 ? week2File : week1File;
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
                          <PlayoffVideoLinks week1={videoWeek1} week2={videoWeek2} darkMode={darkMode} />
                        )}
                      </>
                    ) : hasScore ? (
                      <>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          match.status === 'live'
                            ? 'bg-red-500/20 text-red-400'
                            : darkMode ? 'bg-gray-800 text-gray-400' : 'bg-stone-200 text-stone-500'
                        }`}>{match.status === 'live' ? '● Live' : 'Upcoming'}</span>
                        <div className="flex items-center gap-1 font-bold text-base">
                          <span className="text-gray-400">{match.score_a}</span>
                          <span className={`text-xs ${darkMode ? 'text-gray-700' : 'text-stone-300'}`}>-</span>
                          <span className="text-gray-400">{match.score_b}</span>
                        </div>
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
                  onClick={() => toggleLineup(matchKey, activeLineupFile)}
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

              const weekSwitcher = isLineupOpen && hasLineup && hasBothWeeks && (
                <LineupWeekSwitcher
                  activeWeek={activeWeek}
                  darkMode={darkMode}
                  onSelectWeek={(wk) => selectLineupWeek(matchKey, wk, wk === 2 ? week2File : week1File)}
                />
              );

              const lineupPanel = (
                <LineupPanel
                  data={lineupCache[activeLineupFile]}
                  loading={!!lineupLoading[activeLineupFile]}
                  darkMode={darkMode}
                  homeTeam={match.team_a}
                  awayTeam={match.team_b}
                  homeBanner={match.team_a ? getTeamBanner(match.team_a) : null}
                  awayBanner={match.team_b ? getTeamBanner(match.team_b) : null}
                />
              );

              const lineupContent = isLineupOpen && hasLineup ? (
                isCompleted ? (
                  <>{weekSwitcher}{lineupPanel}</>
                ) : (
                  <div className={`rounded-b-xl overflow-hidden border-l border-r border-b ${
                    darkMode ? 'bg-gray-900 border-gray-800' : 'bg-stone-50 border-stone-200'
                  }`}>
                    {weekSwitcher}
                    {lineupPanel}
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

export function PlayoffBracket({
  playoffs, seedingsMap, darkMode,
  getTeamIcon, getTeamColor, getTeamBanner,
  openLineups, lineupCache, lineupLoading, toggleLineup,
  lineupWeek, selectLineupWeek,
  seriesLabel = 'Best of 3',
  emptyMessage = 'Bracket will be displayed once playoffs begin.',
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
        {emptyMessage}
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

  // The 3rd Place Match runs alongside the Tenkaichi Bowl between the two
  // Semifinal losers. It isn't part of the winners bracket tree — deriveRounds
  // only tracks winners advancing forward — so its teams are always derived
  // here from the Semifinal round (the round immediately before the final);
  // unlike every other round, team_a/team_b aren't editable data (there's
  // nothing to hand-set — the pairing is fully determined by who loses the
  // Semifinals). `matches` is a list — like every other round — even though
  // there's only ever one entry, for the same repeatable-list CMS editing UI.
  const rawThirdPlace = playoffs?.third_place_match?.matches?.[0] ?? null;
  const semifinalLosers = (derivedRounds[derivedRounds.length - 2]?.matches ?? []).map((m) =>
    m.winner ? (m.winner === m.team_a ? m.team_b : m.team_a) : null
  );
  const tpTeamA = semifinalLosers[0] ?? null;
  const tpTeamB = semifinalLosers[1] ?? null;
  const thirdPlaceMatch = rawThirdPlace
    ? {
        ...rawThirdPlace,
        team_a: tpTeamA,
        team_b: tpTeamB,
        seed_a: tpTeamA ? (seedings.indexOf(tpTeamA) + 1 || null) : null,
        seed_b: tpTeamB ? (seedings.indexOf(tpTeamB) + 1 || null) : null,
      }
    : null;
  const tpCompleted = thirdPlaceMatch?.status === 'completed';
  const tpAWon = tpCompleted && thirdPlaceMatch.winner === thirdPlaceMatch.team_a;
  const tpBWon = tpCompleted && thirdPlaceMatch.winner === thirdPlaceMatch.team_b;
  // Bottom-most slot of the full-height grid — the same row the Wild Card
  // and Quarterfinal columns' last match sits in — so the card hangs level
  // with them instead of trailing far below the (usually much shorter) final.
  const tpCardTop = (maxMatches - 1) * BRACKET_SLOT_H + (BRACKET_SLOT_H - BRACKET_MATCH_H) / 2;

  // Inserted right before the final round so it reads "3rd Place Match" then
  // "Tenkaichi Bowl" in list view, same order the matches are actually played in.
  const listRounds = thirdPlaceMatch
    ? [...derivedRounds.slice(0, -1), { round: '3rd Place Match', matches: [thirdPlaceMatch] }, derivedRounds[derivedRounds.length - 1]]
    : derivedRounds;

  const selectedMatchInfo = React.useMemo(() => {
    if (!selectedKey) return null;
    if (selectedKey === '3p') {
      return thirdPlaceMatch
        ? { roundName: '3rd Place Match', match: thirdPlaceMatch, matchKey: 'playoff-3p' }
        : null;
    }
    const [ri, mi] = selectedKey.split('-').map(Number);
    const round = derivedRounds[ri];
    if (!round) return null;
    return { roundName: round.round, match: round.matches[mi], matchKey: `playoff-r${ri}-m${mi}` };
  }, [selectedKey, derivedRounds, thirdPlaceMatch]);

  const sharedProps = {
    darkMode, getTeamIcon, getTeamColor, getTeamBanner,
    openLineups, lineupCache, lineupLoading, toggleLineup,
    lineupWeek, selectLineupWeek,
  };

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className={darkMode ? 'text-gray-400' : 'text-stone-500'}>
            Format:{' '}
            <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-stone-700'}`}>{playoffs.format}</span>
          </span>
          {seriesLabel && (
            <span className={darkMode ? 'text-gray-400' : 'text-stone-500'}>
              Series:{' '}
              <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-stone-700'}`}>{seriesLabel}</span>
            </span>
          )}
          {champion && (
            <span className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="font-semibold text-yellow-400">{champion}</span>
            </span>
          )}
          {tpCompleted && thirdPlaceMatch.winner && (
            <span className="flex items-center gap-1.5">
              <Medal className="w-4 h-4 text-orange-400" />
              <span className="font-semibold text-orange-400">{thirdPlaceMatch.winner}</span>
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
        <PlayoffListView rounds={listRounds} {...sharedProps} />
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
                                score={match.score_a != null ? match.score_a : null}
                                darkMode={darkMode}
                                icon={match.team_a ? getTeamIcon(match.team_a) : null}
                                color={match.team_a ? getTeamColor(match.team_a) : '#6B7280'}
                              />
                              <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-stone-200'}`} />
                              <BracketTeamRow
                                team={match.team_b} seed={match.seed_b}
                                won={teamBWon} lost={teamAWon}
                                score={match.score_b != null ? match.score_b : null}
                                darkMode={darkMode}
                                icon={match.team_b ? getTeamIcon(match.team_b) : null}
                                color={match.team_b ? getTeamColor(match.team_b) : '#6B7280'}
                              />
                            </div>
                          </div>
                        );
                      })}
                      {isFinalRound && thirdPlaceMatch && (
                        <div style={{ position: 'absolute', top: tpCardTop - 40, left: 4, right: 4 }} className="text-center">
                          <span className={`text-xs font-semibold ${darkMode ? 'text-amber-600/80' : 'text-amber-700'}`}>3rd Place Match</span>
                        </div>
                      )}
                      {isFinalRound && thirdPlaceMatch && (
                        <div style={{ position: 'absolute', top: tpCardTop, left: 4, right: 4 }}>
                          <div
                            onClick={() => setSelectedKey((prev) => prev === '3p' ? null : '3p')}
                            className={`relative rounded-lg overflow-hidden border cursor-pointer transition-all ${
                              selectedKey === '3p'
                                ? darkMode ? 'border-purple-500 bg-gray-800 shadow-lg shadow-purple-500/10' : 'border-purple-400 bg-white shadow-lg'
                                : darkMode ? 'border-gray-700 bg-gray-800 hover:border-gray-600' : 'border-stone-200 bg-white shadow-sm hover:border-stone-300'
                            }`}
                            style={{ height: BRACKET_MATCH_H }}
                          >
                            <BracketTeamRow
                              team={thirdPlaceMatch.team_a} seed={thirdPlaceMatch.seed_a}
                              won={tpAWon} lost={tpBWon}
                              score={thirdPlaceMatch.score_a != null ? thirdPlaceMatch.score_a : null}
                              darkMode={darkMode}
                              icon={thirdPlaceMatch.team_a ? getTeamIcon(thirdPlaceMatch.team_a) : null}
                              color={thirdPlaceMatch.team_a ? getTeamColor(thirdPlaceMatch.team_a) : '#6B7280'}
                            />
                            <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-stone-200'}`} />
                            <BracketTeamRow
                              team={thirdPlaceMatch.team_b} seed={thirdPlaceMatch.seed_b}
                              won={tpBWon} lost={tpAWon}
                              score={thirdPlaceMatch.score_b != null ? thirdPlaceMatch.score_b : null}
                              darkMode={darkMode}
                              icon={thirdPlaceMatch.team_b ? getTeamIcon(thirdPlaceMatch.team_b) : null}
                              color={thirdPlaceMatch.team_b ? getTeamColor(thirdPlaceMatch.team_b) : '#6B7280'}
                            />
                          </div>
                        </div>
                      )}
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
