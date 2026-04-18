import React, { useState, useEffect } from 'react';
import { Archive, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { loadContent } from '../utils/contentLoader';

export default function ArchivesPage({ darkMode }) {
  const [data, setData] = useState(null);
  const [expandedIndex, setExpandedIndex] = useState(null);

  useEffect(() => {
    loadContent('archives.yaml').then(setData);
  }, []);

  if (!data) {
    return <div className="flex items-center justify-center py-20 text-lg animate-pulse">Loading archives...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Archive className="w-8 h-8 text-purple-400" />
          Archives
        </h1>
        <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>
          A look back at past eras of Dragon Ball league history.
        </p>
      </div>

      <div className="space-y-4">
        {(data.archives || []).map((era, i) => {
          const isExpanded = expandedIndex === i;
          return (
            <div
              key={i}
              className={`rounded-xl border overflow-hidden ${
                darkMode ? 'bg-gray-900 border-gray-800' : 'bg-stone-50 border-stone-200 shadow-sm'
              }`}
            >
              <button
                onClick={() => setExpandedIndex(isExpanded ? null : i)}
                className={`w-full flex items-center justify-between p-5 text-left transition-colors ${
                  darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-stone-100'
                }`}
              >
                <div>
                  <h2 className="text-lg font-semibold">{era.season}</h2>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>
                    {era.game}
                  </p>
                </div>
                {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>

              {isExpanded && (
                <div className={`px-5 pb-5 border-t ${darkMode ? 'border-gray-800' : 'border-stone-200'}`}>
                  <p className={`mt-4 mb-4 ${darkMode ? 'text-gray-300' : 'text-stone-600'}`}>
                    {era.description}
                  </p>

                  {era.notable_events && (
                    <div className="mb-4">
                      <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${
                        darkMode ? 'text-gray-500' : 'text-stone-400'
                      }`}>Notable Events</h4>
                      <ul className="space-y-1">
                        {era.notable_events.map((ev, j) => (
                          <li key={j} className={`text-sm flex items-start gap-2 ${
                            darkMode ? 'text-gray-300' : 'text-stone-600'
                          }`}>
                            <span className={`mt-1 ${darkMode ? 'text-orange-400' : 'text-blue-500'}`}>•</span>
                            {ev}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {era.seasons && (
                    <div className="mb-4">
                      <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${
                        darkMode ? 'text-gray-500' : 'text-stone-400'
                      }`}>Past Seasons</h4>
                      <div className="flex flex-wrap gap-2">
                        {era.seasons.map((s) => (
                          <a
                            key={s.year}
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                              darkMode
                                ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                                : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                            }`}
                          >
                            {s.year} <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 mt-4">
                    {era.old_site_url && (
                      <a
                        href={era.old_site_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${darkMode ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20' : 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20'}`}
                      >
                        Visit Legacy Site <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    {era.youtube_url && (
                      <a
                        href={era.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                          darkMode
                            ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                            : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                        }`}
                      >
                        YouTube Archive <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Acknowledgements */}
      <div className={`mt-12 rounded-xl border p-6 text-center ${
        darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-stone-100 border-stone-200'
      }`}>
        <h3 className="text-lg font-semibold mb-2">League History</h3>
        <p className={`text-sm max-w-lg mx-auto ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>
          The Dragon Ball Z League was originally founded by <strong>Squee</strong> and
          later continued by <strong>Mal</strong>. The Sparking Zero era represents a
          new chapter built on this incredible legacy.
        </p>
      </div>
    </div>
  );
}
