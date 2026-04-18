import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Calendar, Trophy, Home, Plane, Shield, ExternalLink, ChevronLeft, ChevronDown } from 'lucide-react';
import { loadContent } from '../utils/contentLoader';
import yaml from 'js-yaml';

export default function TeamSchedulePage({ darkMode }) {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [teamsData, setTeamsData] = useState(null);
  const [seasonData, setSeasonData] = useState(null);
  const [siteData, setSiteData] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(null);

  useEffect(() => {
    loadContent('site.yaml').then((site) => {
      setSiteData(site);
      setSelectedSeason(site.current_season_file || 'season-1.yaml');
    });
    loadContent('teams.yaml').then(setTeamsData);
  }, []);

  useEffect(() => {
    if (!selectedSeason) return;
    fetch(`${import.meta.env.BASE_URL}content/seasons/${selectedSeason}`)
      .then((r) => r.text())
      .then((text) => setSeasonData(yaml.load(text)));
  }, [selectedSeason]);

  const team = useMemo(
    () => teamsData?.teams?.find((t) => t.slug === slug),
    [teamsData, slug]
  );

  // Find which Kai this team belongs to
  const teamKai = useMemo(() => {
    if (!seasonData || !team) return null;
    return (seasonData.kais || []).find((k) =>
      k.teams?.some((t) => t.team === team.name)
    );
  }, [seasonData, team]);

  // Build this team's match list across all weeks
  const teamMatches = useMemo(() => {
    if (!seasonData || !team) return [];
    const result = [];
    for (const week of seasonData.schedule || []) {
      for (const match of week.matches || []) {
        const isHome = match.home === team.name;
        const isAway = match.away === team.name;
        if (!isHome && !isAway) continue;
        const opponent = isHome ? match.away : match.home;
        let result_label = null;
        if (match.status === 'completed' && match.winner) {
          const w = match.winner.toLowerCase();
          if (w === 'draw' || w === 'tie') {
            result_label = 'T';
          } else {
            result_label = match.winner === team.name ? 'W' : 'L';
          }
        } else if (match.status === 'live') {
          result_label = 'LIVE';
        }
        result.push({
          week: week.week,
          isHome,
          opponent,
          status: match.status,
          divisional: !!match.divisional,
          result: result_label,
          winner: match.winner || null,
          video_url: match.video_url || '',
        });
      }
    }
    return result;
  }, [seasonData, team]);

  // Aggregate stats
  const stats = useMemo(() => {
    const completed = teamMatches.filter((m) => m.status === 'completed');
    const wins = completed.filter((m) => m.result === 'W').length;
    const losses = completed.filter((m) => m.result === 'L').length;
    const homeMatches = teamMatches.filter((m) => m.isHome);
    const awayMatches = teamMatches.filter((m) => !m.isHome);
    const homeWins = homeMatches.filter((m) => m.result === 'W').length;
    const awayWins = awayMatches.filter((m) => m.result === 'W').length;
    const divMatches = completed.filter((m) => m.divisional);
    const divWins = divMatches.filter((m) => m.result === 'W').length;
    const divLosses = divMatches.filter((m) => m.result === 'L').length;
    const ties = completed.filter((m) => m.result === 'T').length;
    return { wins, losses, ties, homeWins, homeLosses: homeMatches.filter(m => m.result === 'L').length,
      homeGames: homeMatches.length, awayWins, awayLosses: awayMatches.filter(m => m.result === 'L').length,
      awayGames: awayMatches.length, divWins, divLosses, divGames: divMatches.length,
      totalGames: teamMatches.length, played: completed.length };
  }, [teamMatches]);

  const upcoming = teamMatches.filter((m) => m.status === 'upcoming');
  const completed = teamMatches.filter((m) => m.status === 'completed');

  if (!teamsData || !seasonData || !siteData) {
    return <div className="flex items-center justify-center py-20 text-lg animate-pulse">Loading…</div>;
  }

  if (!team) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-xl mb-4">Team not found.</p>
        <Link to="/teams" className={darkMode ? 'text-orange-400 hover:underline' : 'text-blue-600 hover:underline'}>← Back to Teams</Link>
      </div>
    );
  }

  const allSeasons = siteData?.all_seasons || [];
  const winPct = stats.wins + stats.losses > 0
    ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100)
    : null;

  const resultColor = (r) => {
    if (r === 'W') return 'text-green-400 font-bold';
    if (r === 'L') return 'text-red-400 font-bold';
    if (r === 'T') return 'text-yellow-400 font-bold';
    if (r === 'LIVE') return 'text-yellow-400 font-bold animate-pulse';
    return darkMode ? 'text-gray-400' : 'text-stone-500';
  };

  const bg = darkMode ? 'bg-gray-950 text-white' : 'bg-stone-100 text-stone-800';
  const card = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-stone-50 border-stone-200 shadow-sm';
  const muted = darkMode ? 'text-gray-400' : 'text-stone-500';
  const rowHover = darkMode ? 'hover:bg-gray-800/40 border-gray-800' : 'hover:bg-stone-100 border-stone-200';

  return (
    <div className={`${bg} min-h-screen`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Back nav */}
        <button
          onClick={() => navigate('/teams')}
          className={`flex items-center gap-1.5 text-sm mb-6 ${muted} ${darkMode ? 'hover:text-orange-400' : 'hover:text-blue-600'} transition-colors`}
        >
          <ChevronLeft className="w-4 h-4" /> All Teams
        </button>

        {/* Team header */}
        <div className={`rounded-2xl border p-6 mb-6 ${card}`}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {team.icon ? (
              <img src={team.icon} alt={team.name} className="w-20 h-20 rounded-2xl object-cover flex-shrink-0" />
            ) : (
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-bold text-3xl flex-shrink-0"
                style={{ backgroundColor: team.color }}
              >
                {team.name.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold">{team.name}</h1>
                  <p className={`text-sm mt-0.5 ${muted}`}>
                    {teamKai ? `${teamKai.name} · ` : ''}{seasonData.season}
                    {team.manager && team.manager !== 'TBD' ? ` · Manager: ${team.manager}` : ''}
                  </p>
                </div>
                {/* Season selector */}
                {allSeasons.length > 1 && (
                  <div className="relative">
                    <select
                      value={selectedSeason || ''}
                      onChange={(e) => setSelectedSeason(e.target.value)}
                      className={`appearance-none pl-3 pr-8 py-1.5 rounded-lg border text-xs font-medium cursor-pointer ${
                        darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-stone-100 border-stone-300 text-stone-800'
                      }`}
                    >
                      {allSeasons.map((s) => (
                        <option key={s.file} value={s.file}>{s.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                )}
              </div>
              {team.description && <p className={`text-sm mt-2 ${muted}`}>{team.description}</p>}
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Overall', value: stats.played > 0 ? `${stats.wins}–${stats.losses}${stats.ties ? `–${stats.ties}` : ''}` : '—', sub: winPct !== null ? `${winPct}% win rate` : '' },
            { label: 'Home', value: stats.homeGames > 0 ? `${stats.homeWins}–${stats.homeLosses}` : '—', sub: `${stats.homeGames} home games`, icon: Home },
            { label: 'Away', value: stats.awayGames > 0 ? `${stats.awayWins}–${stats.awayLosses}` : '—', sub: `${stats.awayGames} away games`, icon: Plane },
            { label: 'Divisional', value: stats.divGames > 0 ? `${stats.divWins}–${stats.divLosses}` : '—', sub: `${stats.divGames} div. matches`, icon: Shield },
          ].map(({ label, value, sub, icon: Icon }) => (
            <div key={label} className={`rounded-xl border p-4 ${card}`}>
              <div className={`text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1.5 ${muted}`}>
                {Icon && <Icon className="w-3.5 h-3.5" />}{label}
              </div>
              <div className="text-2xl font-bold">{value}</div>
              {sub && <div className={`text-xs mt-0.5 ${muted}`}>{sub}</div>}
            </div>
          ))}
        </div>

        {/* Schedule table */}
        <div className={`rounded-2xl border overflow-hidden ${card}`}>
          <div className={`px-5 py-4 border-b flex items-center gap-2 ${darkMode ? 'border-gray-800' : 'border-stone-200'}`}>
            <Calendar className={`w-4 h-4 ${darkMode ? 'text-orange-400' : 'text-blue-500'}`} />
            <h2 className="font-semibold">Full Schedule</h2>
            <span className={`ml-auto text-xs ${muted}`}>{teamMatches.length} matches · {stats.played} played · {upcoming.length} remaining</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b text-xs font-semibold uppercase tracking-wider ${darkMode ? 'border-gray-800 bg-gray-900/60 text-gray-400' : 'border-stone-200 bg-stone-100 text-stone-500'}`}>
                  <th className="py-3 px-4 text-left">Wk</th>
                  <th className="py-3 px-4 text-left">Opponent</th>
                  <th className="py-3 px-4 text-center">H/A</th>
                  <th className="py-3 px-4 text-center">Div</th>
                  <th className="py-3 px-4 text-center">Result</th>
                  <th className="py-3 px-4 text-center">VOD</th>
                </tr>
              </thead>
              <tbody>
                {teamMatches.map((m, i) => (
                  <tr
                    key={i}
                    className={`border-b last:border-0 transition-colors ${rowHover}`}
                  >
                    <td className={`py-3 px-4 font-medium tabular-nums ${muted}`}>{m.week}</td>
                    <td className="py-3 px-4 font-medium">{m.opponent}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        m.isHome
                          ? darkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'
                          : darkMode ? 'bg-gray-800 text-gray-400' : 'bg-stone-200 text-stone-500'
                      }`}>
                        {m.isHome ? <><Home className="w-3 h-3" /> H</> : <><Plane className="w-3 h-3" /> A</>}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {m.divisional && (
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          darkMode ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-600'
                        }`}>
                          <Shield className="w-3 h-3" /> DIV
                        </span>
                      )}
                    </td>
                    <td className={`py-3 px-4 text-center ${resultColor(m.result)}`}>
                      {m.result ?? <span className={`text-xs ${muted}`}>—</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {m.video_url ? (
                        <a
                          href={m.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1 text-xs ${darkMode ? 'text-orange-400 hover:text-orange-300' : 'text-blue-600 hover:text-blue-500'}`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Watch
                        </a>
                      ) : (
                        <span className={`text-xs ${muted}`}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upcoming matches highlight */}
        {upcoming.length > 0 && (
          <div className={`rounded-2xl border p-5 mt-6 ${card}`}>
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-green-400" /> Upcoming Matches
            </h2>
            <div className="space-y-2">
              {upcoming.map((m, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between rounded-lg px-4 py-3 text-sm ${
                    darkMode ? 'bg-gray-800/60' : 'bg-stone-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold tabular-nums ${muted}`}>Wk {m.week}</span>
                    <span className="font-medium">vs {m.opponent}</span>
                    {m.divisional && (
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                        darkMode ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-600'
                      }`}>DIV</span>
                    )}
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    m.isHome
                      ? darkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'
                      : darkMode ? 'bg-gray-700 text-gray-400' : 'bg-stone-200 text-stone-500'
                  }`}>
                    {m.isHome ? 'Home' : 'Away'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
