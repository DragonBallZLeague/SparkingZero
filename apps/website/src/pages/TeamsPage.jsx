import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Users, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { loadContent } from '../utils/contentLoader';

export default function TeamsPage({ darkMode }) {
  const [data, setData] = useState(null);
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    loadContent('teams.yaml').then(setData);
  }, []);

  // Auto-expand team from URL param
  useEffect(() => {
    const slug = searchParams.get('team');
    if (slug && data?.teams) {
      setExpandedTeam(slug);
    }
  }, [searchParams, data]);

  if (!data) {
    return <div className="flex items-center justify-center py-20 text-lg animate-pulse">Loading teams...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-400" />
          Teams
        </h1>
        <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>
          Click on a team to view their full roster and details.
        </p>
      </div>

      <div className="space-y-3">
        {data.teams.map((team) => {
          const isExpanded = expandedTeam === team.slug;
          return (
            <div
              key={team.slug}
              className={`rounded-xl border overflow-hidden transition-all ${
                darkMode
                  ? 'bg-gray-900 border-gray-800'
                  : 'bg-stone-50 border-stone-200 shadow-sm'
              }`}
            >
              {/* Team Header (clickable) */}
              <button
                onClick={() => setExpandedTeam(isExpanded ? null : team.slug)}
                className={`w-full flex items-center justify-between p-5 text-left transition-colors ${
                  darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-4">
                  {team.icon ? (
                    <img
                      src={team.icon}
                      alt={team.name}
                      className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                      style={{ backgroundColor: team.color }}
                    >
                      {team.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-semibold">{team.name}</h2>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>
                      {team.roster?.length || 0} fighters
                      {team.manager && team.manager !== 'TBD' ? ` · Manager: ${team.manager}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/teams/${team.slug}/schedule`}
                    onClick={(e) => e.stopPropagation()}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                      darkMode
                        ? 'bg-gray-800 text-orange-400 hover:bg-gray-700'
                        : 'bg-stone-100 text-blue-600 hover:bg-stone-200'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" /> Schedule
                  </Link>
                  {isExpanded
                    ? <ChevronUp className="w-5 h-5 text-gray-400" />
                    : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
              </button>

              {/* Expanded roster */}
              {isExpanded && (
                <div className={`border-t px-5 pb-5 ${darkMode ? 'border-gray-800' : 'border-stone-200'}`}>
                  {team.banner && (
                    <div className="mt-4 mb-4 rounded-xl overflow-hidden">
                      <img
                        src={team.banner}
                        alt={`${team.name} banner`}
                        className="w-full h-auto object-cover max-h-48"
                      />
                    </div>
                  )}
                  {team.description && (
                    <p className={`mt-4 mb-4 text-sm ${darkMode ? 'text-gray-300' : 'text-stone-600'}`}>
                      {team.description}
                    </p>
                  )}

                  <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
                    darkMode ? 'text-gray-500' : 'text-stone-400'
                  }`}>
                    Roster
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {(team.roster || []).slice(0, 5).map((char) => (
                      <div
                        key={char}
                        className={`px-3 py-2 rounded-lg text-sm ${
                          darkMode ? 'bg-gray-800/50 text-gray-200' : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {char}
                      </div>
                    ))}
                  </div>

                  {team.master_list?.length > 0 && (
                    <>
                      <h3 className={`text-xs font-semibold uppercase tracking-wider mt-5 mb-3 ${
                        darkMode ? 'text-gray-500' : 'text-stone-400'
                      }`}>
                        Master List
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {team.master_list.map((char) => (
                          <span
                            key={char}
                            className={`px-2 py-1 rounded text-xs ${
                              darkMode ? 'bg-gray-800/50 text-gray-400' : 'bg-stone-100 text-stone-500'
                            }`}
                          >
                            {char}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
