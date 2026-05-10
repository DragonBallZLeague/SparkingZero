import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Users, Calendar, Trophy, ChevronRight, ExternalLink, Eye, Star } from 'lucide-react';
import { loadContent } from '../utils/contentLoader';
import yaml from 'js-yaml';

export default function HomePage({ site, darkMode }) {
  const [teams, setTeams] = useState(null);
  const [season, setSeason] = useState(null);
  const [howTo, setHowTo] = useState(null);
  const [howToTab, setHowToTab] = useState('watch');

  useEffect(() => {
    loadContent('teams.yaml').then(setTeams);
    loadContent('rules/how-to-participate.yaml').then(setHowTo);
    // Load current season from seasons/ folder
    loadContent('site.yaml').then((siteData) => {
      const file = siteData.current_season_file || 'season-1.yaml';
      fetch(`${import.meta.env.BASE_URL}content/seasons/${file}`)
        .then((r) => r.text())
        .then((text) => setSeason(yaml.load(text)));
    });
  }, []);

  const topTeams = (() => {
    if (!season?.kais) return [];
    // Compute standings from the active phase's schedule
    const activePhase = season.active_phase || 'main_season';
    const schedule = activePhase === 'preseason'
      ? season.preseason_schedule
      : season.schedule;
    const record = {};
    for (const week of schedule || []) {
      for (const m of week.matches || []) {
        if (m.status !== 'completed' || !m.winner) continue;
        [m.home, m.away].forEach((t) => {
          if (!record[t]) record[t] = { wins: 0, losses: 0 };
          if (m.winner === t) record[t].wins += 1;
          else record[t].losses += 1;
        });
      }
    }
    // Get all teams from kais and apply computed records
    const allTeams = season.kais.flatMap((k) => (k.teams || []).map((t) => ({
      team: t.team,
      wins: record[t.team]?.wins || 0,
      losses: record[t.team]?.losses || 0,
    })));
    const sorted = allTeams.sort((a, b) => b.wins - a.wins || a.losses - b.losses);
    // Assign dense ranks (ties get same rank)
    let rank = 1;
    const ranked = sorted.map((t, i) => {
      if (i > 0) {
        const prev = sorted[i - 1];
        if (t.wins !== prev.wins || t.losses !== prev.losses) rank = i + 1;
      }
      return { ...t, rank };
    });
    // Take top 4 entries, but keep ties at the cutoff
    const cutoffRank = ranked[3]?.rank ?? 4;
    return ranked.filter((t) => t.rank <= cutoffRank).slice(0, 4);
  })();

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${darkMode ? 'from-orange-600/20 via-transparent to-red-600/10' : 'from-blue-600/20 via-transparent to-blue-500/10'}`} />
        <div className={`absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${darkMode ? 'from-orange-500/10' : 'from-blue-500/10'} via-transparent to-transparent`} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="text-center">
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border ${darkMode ? 'bg-orange-500/10 border-orange-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
              <Zap className={`w-4 h-4 ${darkMode ? 'text-orange-400' : 'text-blue-600'}`} />
              <span className={`text-sm font-medium ${darkMode ? 'text-orange-400' : 'text-blue-600'}`}>
                {site?.current_season} — {site?.current_season_status}
              </span>
            </div>

            <div className="flex justify-center">
              <img
                src={`${import.meta.env.BASE_URL}images/league-logo.png`}
                alt="Dragon Ball Sparking Zero League"
                className="w-full max-w-2xl sm:max-w-5xl drop-shadow-2xl"
                draggable={false}
              />
            </div>

            <p className={`text-lg sm:text-xl max-w-2xl mx-auto mb-8 ${
              darkMode ? 'text-gray-300' : 'text-stone-600'
            }`}>
              {site?.description}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={site?.links?.discord}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold transition-colors ${darkMode ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                Join the League
                <ExternalLink className="w-4 h-4" />
              </a>
              <a
                href={site?.links?.youtube}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-colors border ${
                  darkMode
                    ? 'border-gray-700 hover:bg-gray-800 text-gray-200'
                    : 'border-stone-300 hover:bg-stone-100 text-stone-700'
                }`}
              >
                Watch Matches
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* How to Participate */}
      {howTo && (
        <section className={`py-16 ${darkMode ? 'bg-gray-900/40' : 'bg-stone-200/50'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-center mb-8">How to Participate</h2>

            {/* Tab toggle — centered */}
            <div className="flex justify-center mb-8">
              <div className={`inline-flex rounded-xl p-1 border ${
                darkMode ? 'bg-gray-900 border-gray-800' : 'bg-stone-100 border-stone-200'
              }`}>
                <button
                  onClick={() => setHowToTab('watch')}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    howToTab === 'watch'
                      ? darkMode ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'
                      : darkMode ? 'text-gray-400 hover:text-white' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  Just Watching
                </button>
                <button
                  onClick={() => setHowToTab('play')}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    howToTab === 'play'
                      ? darkMode ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'
                      : darkMode ? 'text-gray-400 hover:text-white' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <Star className="w-4 h-4" />
                  Getting Involved
                </button>
              </div>
            </div>

            {/* Steps — 3-col for watch (3 steps), 2-col for play (4 steps) */}
            {(() => {
              const steps = howToTab === 'watch' ? howTo.viewer_steps : howTo.participant_steps;
              const cols = steps?.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
              return (
                <div className={`grid ${cols} gap-4`}>
                  {steps?.map((step, i) => (
                    <div
                      key={i}
                      className={`rounded-xl p-5 border ${
                        darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-stone-200 shadow-sm'
                      }`}
                    >
                      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold mb-3 ${
                        darkMode ? 'bg-orange-500/15 text-orange-400' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {i + 1}
                      </div>
                      <h3 className="font-semibold mb-1.5">{step.title}</h3>
                      <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>
                        {step.description}
                      </p>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div className="text-center mt-8">
              <Link
                to="/rules/how-to-participate"
                className={`inline-flex items-center gap-2 text-sm font-medium ${
                  darkMode ? 'text-orange-400 hover:text-orange-300' : 'text-blue-600 hover:text-blue-500'
                }`}
              >
                Full Rules & Information <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Current Standings Preview */}
      {topTeams.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-400" />
              Top Teams
            </h2>
            <Link
              to="/season"
              className={`text-sm inline-flex items-center gap-1 ${darkMode ? 'text-orange-400 hover:text-orange-300' : 'text-blue-600 hover:text-blue-500'}`}
            >
              Full Standings <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {topTeams.map((s) => {
              const teamData = teams?.teams?.find((t) => t.name === s.team);
              const color = teamData?.color || '#F97316';
              const slug = teamData?.slug;
              return (
                <Link
                  key={s.team}
                  to={slug ? `/teams/${slug}/schedule` : '/season'}
                  className={`block rounded-xl p-5 border transition-transform hover:scale-[1.02] ${
                    darkMode
                      ? 'bg-gray-900 border-gray-800'
                      : 'bg-stone-50 border-stone-200 shadow-sm'
                  }`}
                  style={{
                    boxShadow: `0 0 18px 2px ${color}33`,
                    borderColor: `${color}55`,
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className="text-3xl font-black w-8 text-center flex-shrink-0 leading-none"
                      style={{
                        background: `linear-gradient(135deg, #FFD700, #FFA500, #FF6B00)`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        filter: 'drop-shadow(0 0 3px rgba(255,180,0,0.35))',
                      }}
                    >
                      {s.rank}
                    </span>
                    {teamData?.icon ? (
                      <img
                        src={teamData.icon}
                        alt={s.team}
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-lg flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                    )}
                    <div>
                      <div className="font-semibold">{s.team}</div>
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>
                        {s.wins}W - {s.losses}L
                      </div>
                    </div>
                  </div>
                  {/* Win rate bar */}
                  <div className={`h-2 rounded-full overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-stone-200'}`}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(s.wins / Math.max(s.wins + s.losses, 1)) * 100}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Teams Grid */}
      {teams?.teams && (
        <section className={`py-16 ${darkMode ? 'bg-gray-900/30' : 'bg-stone-200/40'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-400" />
                Current Teams
              </h2>
              <Link
                to="/teams"
                className={`text-sm inline-flex items-center gap-1 ${darkMode ? 'text-orange-400 hover:text-orange-300' : 'text-blue-600 hover:text-blue-500'}`}
              >
                View All Teams <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {teams.teams.map((team) => (
                <Link
                  key={team.slug}
                  to={`/teams?team=${team.slug}`}
                  className={`group rounded-xl p-4 border transition-all hover:scale-[1.02] ${
                    darkMode
                      ? 'bg-gray-900 border-gray-800 hover:border-gray-600'
                      : 'bg-stone-50 border-stone-200 hover:border-stone-400 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {team.icon ? (
                      <img
                        src={team.icon}
                        alt={team.name}
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-lg flex-shrink-0"
                        style={{ backgroundColor: team.color }}
                      />
                    )}
                    <span className={`font-medium text-sm transition-colors truncate ${darkMode ? 'group-hover:text-orange-400' : 'group-hover:text-blue-600'}`}>
                      {team.name}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-center mb-10">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: Users,
              title: 'Pick Your Team',
              desc: 'Supporters choose their favorite theme and customize their characters with capsules and AI strategies to win.',
            },
            {
              icon: Zap,
              title: 'COM vs COM Battles',
              desc: 'The AI controls both fighters. Strategy comes from builds, capsule choices, and team composition — not player skill.',
            },
            {
              icon: Trophy,
              title: 'Compete for the Championship',
              desc: 'Teams battle through a regular season and playoffs, culminating in the Tenkaichi Bowl championship.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className={`rounded-xl p-6 border text-center ${
                darkMode ? 'bg-gray-900 border-gray-800' : 'bg-stone-50 border-stone-200 shadow-sm'
              }`}
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 ${darkMode ? 'bg-orange-500/10' : 'bg-blue-500/10'}`}>
                <item.icon className={`w-6 h-6 ${darkMode ? 'text-orange-400' : 'text-blue-600'}`} />
              </div>
              <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
