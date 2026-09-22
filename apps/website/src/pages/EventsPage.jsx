import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ChevronDown, ChevronRight, CalendarDays } from 'lucide-react';
import { useSeasonEvents } from '../hooks/useSeasonEvents';
import { StatusBadge, TimingBadge } from '../components/events/entities';

const BLOCK_KIND_LABELS = {
  single_match: 'Single Match',
  series: 'Best-of Series',
  bracket: 'Tournament',
  gauntlet: 'Gauntlet',
};

function competitionKinds(event) {
  const kinds = new Set();
  for (const b of event.blocks || []) {
    if (BLOCK_KIND_LABELS[b.type]) kinds.add(BLOCK_KIND_LABELS[b.type]);
  }
  return [...kinds];
}

/**
 * Presentational Events index: the season's events as cards.
 *
 * Pure props in, markup out - no fetching, routing or context - so the site
 * (container below) and the CMS preview pane (`cms/previews.jsx`) render the
 * exact same component instead of two copies that drift apart.
 */
export function EventsView({
  eventsData,
  darkMode = true,
  seasonLabel = '',
  allSeasons = [],
  selectedSeason = null,
  onSeasonChange = () => {},
}) {
  if (!eventsData) {
    return <div className="flex items-center justify-center py-20 text-lg animate-pulse">Loading events...</div>;
  }

  const events = eventsData.events || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-purple-400" />
            Events
          </h1>
          <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>
            {seasonLabel} · All-Star battles, off-season tournaments, and special challenges outside the regular schedule.
          </p>
        </div>
        {allSeasons.length > 1 && (
          <div className="relative">
            <select
              value={selectedSeason || ''}
              onChange={(e) => onSeasonChange(e.target.value)}
              className={`appearance-none pl-3 pr-8 py-2 rounded-lg border text-sm font-medium cursor-pointer ${
                darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-stone-100 border-stone-300 text-stone-800'
              }`}
            >
              {allSeasons.map((s) => (
                <option key={s.file} value={s.file}>{s.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        )}
      </div>

      {events.length === 0 ? (
        <div className={`rounded-xl border p-10 text-center ${
          darkMode ? 'bg-gray-900 border-gray-800 text-gray-400' : 'bg-stone-50 border-stone-200 text-stone-500'
        }`}>
          No events have been recorded for {seasonLabel} yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {events.map((event) => {
            const kinds = competitionKinds(event);
            return (
              <Link
                key={event.slug}
                to={`/events/${event.slug}`}
                className={`group rounded-xl border overflow-hidden transition-all flex flex-col ${
                  darkMode
                    ? 'bg-gray-900 border-gray-800 hover:border-purple-500/60'
                    : 'bg-stone-50 border-stone-200 shadow-sm hover:border-purple-400 hover:shadow-md'
                }`}
              >
                {event.banner && (
                  <img src={event.banner} alt="" className="w-full h-32 object-cover" />
                )}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <TimingBadge timing={event.timing} darkMode={darkMode} />
                    <StatusBadge status={event.status} darkMode={darkMode} />
                    {event.date && (
                      <span className={`ml-auto text-xs flex items-center gap-1 ${darkMode ? 'text-gray-500' : 'text-stone-400'}`}>
                        <CalendarDays className="w-3.5 h-3.5" /> {event.date}
                      </span>
                    )}
                  </div>
                  <h2 className={`text-xl font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-stone-900'}`}>
                    {event.name}
                    <ChevronRight className={`w-5 h-5 transition-transform group-hover:translate-x-0.5 ${darkMode ? 'text-gray-600' : 'text-stone-400'}`} />
                  </h2>
                  {event.tagline && (
                    <p className={`mt-1 text-sm flex-1 ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>{event.tagline}</p>
                  )}
                  {(kinds.length > 0 || event.participants?.length > 0) && (
                    <div className={`mt-4 pt-3 border-t flex flex-wrap gap-x-4 gap-y-1 text-xs ${
                      darkMode ? 'border-gray-800 text-gray-500' : 'border-stone-200 text-stone-400'
                    }`}>
                      {kinds.map((k) => <span key={k}>{k}</span>)}
                      {event.participants?.length > 0 && <span>{event.participants.length} participants</span>}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function EventsPage({ darkMode }) {
  const { eventsData, allSeasons, seasonLabel, selectedSeason, setSelectedSeason } = useSeasonEvents();

  return (
    <EventsView
      eventsData={eventsData}
      darkMode={darkMode}
      seasonLabel={seasonLabel}
      allSeasons={allSeasons}
      selectedSeason={selectedSeason}
      onSeasonChange={setSelectedSeason}
    />
  );
}
