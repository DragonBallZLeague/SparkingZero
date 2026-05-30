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

      {/* Standings — grouped by Kai */}
      {activeTab === 'standings' && (
        <div className="space-y-8">
          <h2 className={`text-xl font-bold ${darkMode ? 'text-gray-200' : 'text-stone-800'}`}>
            {standingsLabel}
          </h2>
          {(data.kais || []).map((kai) => {
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
                          <th className="text-left py-3 px-4 font-semibold">#</th>
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
                          return (
                            <tr
                              key={s.team}
                              onClick={() => slug && navigate(`/teams/${slug}/schedule?season=${selectedSeason}`)}
                              className={`border-b last:border-0 transition-colors ${
                                slug ? 'cursor-pointer' : ''
                              } ${
                                darkMode
                                  ? 'border-gray-800 hover:bg-gray-800/40'
                                  : 'border-stone-200 hover:bg-stone-100'
                              }`}
                            >
                              <td className="py-3 px-4 font-medium text-gray-400">{i + 1}</td>
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
            {selectedPhase === 'preseason' ? 'Pre-Season Schedule' : 'Main Season Schedule'}
          </h2>

          {/* Playoffs phase shows the bracket instead of weekly schedule */}
          {selectedPhase === 'playoffs' ? (
            data.playoffs ? (
              <div className={`rounded-xl border p-6 ${
                darkMode ? 'bg-gray-900 border-gray-800' : 'bg-stone-50 border-stone-200 shadow-sm'
              }`}>
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  Playoffs — {data.playoffs.format}
                </h3>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>
                  Status: {data.playoffs.status}
                </p>
                {data.playoffs.bracket?.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {data.playoffs.bracket.map((m, i) => (
                      <div key={i} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-stone-100'}`}>
                        <div className="text-xs text-gray-400 mb-1">{m.round} — Match {m.match}</div>
                        <div className="flex items-center justify-between">
                          <span className={m.winner === m.team_a ? 'font-bold text-green-400' : ''}>
                            {m.team_a}
                          </span>
                          <span className="font-bold">{m.score_a} - {m.score_b}</span>
                          <span className={m.winner === m.team_b ? 'font-bold text-green-400' : ''}>
                            {m.team_b}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`mt-2 text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    Bracket will be displayed once playoffs begin.
                  </p>
                )}
              </div>
            ) : (
              <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-stone-500'}`}>
                Playoffs data not available yet.
              </p>
            )
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
