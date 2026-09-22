import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, CalendarDays, Sparkles } from 'lucide-react';
import { useSeasonEvents } from '../hooks/useSeasonEvents';
import { useLineups, EMPTY_LINEUPS } from '../hooks/useLineups';
import { makeResolver, StatusBadge, TimingBadge } from '../components/events/entities';
import { MarkdownBlock, ParticipantsBlock, BracketBlock } from '../components/events/InfoBlocks';
import { SingleMatchBlock, SeriesBlock } from '../components/events/MatchBlocks';
import { GauntletBlock } from '../components/events/GauntletBlock';

// type → renderer. Adding a new kind of event content = add a component here
// and a matching `types` entry in public/cms/config.yml.
const BLOCK_RENDERERS = {
  markdown: MarkdownBlock,
  participants: ParticipantsBlock,
  single_match: SingleMatchBlock,
  series: SeriesBlock,
  bracket: BracketBlock,
  gauntlet: GauntletBlock,
};

/**
 * Presentational event page: one event's header plus its ordered `blocks`.
 *
 * Pure props in, markup out - no fetching, routing or context - so the site
 * (container below) and the CMS preview pane (`cms/previews.jsx`) render the
 * exact same blocks instead of two copies that drift apart. `toolbar` is the
 * back-link / season-picker row, which the CMS preview leaves out.
 */
export function EventDetailView({
  event,
  darkMode = true,
  seasonLabel = '',
  resolve,
  lineups = EMPTY_LINEUPS,
  toolbar = null,
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {toolbar && <div className="mb-6 flex items-center justify-between gap-4">{toolbar}</div>}

      {/* Event header */}
      <div className={`rounded-2xl border overflow-hidden mb-8 ${
        darkMode ? 'bg-gray-900 border-gray-800' : 'bg-stone-50 border-stone-200 shadow-sm'
      }`}>
        {event.banner && <img src={event.banner} alt="" className="w-full max-h-64 object-cover" />}
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
              {seasonLabel}
            </span>
            <TimingBadge timing={event.timing} darkMode={darkMode} />
            <StatusBadge status={event.status} darkMode={darkMode} />
            {event.date && (
              <span className={`ml-auto text-xs flex items-center gap-1 ${darkMode ? 'text-gray-500' : 'text-stone-400'}`}>
                <CalendarDays className="w-3.5 h-3.5" /> {event.date}
              </span>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-purple-400 flex-shrink-0" />
            {event.name}
          </h1>
          {event.tagline && (
            <p className={`mt-2 text-lg ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>{event.tagline}</p>
          )}
        </div>
      </div>

      {/* Blocks */}
      <div className="space-y-6">
        {(event.blocks || []).map((block, i) => {
          const Renderer = BLOCK_RENDERERS[block.type];
          if (!Renderer) {
            return (
              <div key={i} className={`rounded-xl border border-dashed p-4 text-sm ${
                darkMode ? 'border-gray-700 text-gray-500' : 'border-stone-300 text-stone-400'
              }`}>
                Unknown block type <span className="font-mono">{block.type}</span>.
              </div>
            );
          }
          return (
            <Renderer
              key={i}
              block={block}
              blockKey={`${event.slug}-b${i}`}
              event={event}
              resolve={resolve}
              lineups={lineups}
              darkMode={darkMode}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function EventDetailPage({ darkMode }) {
  const { slug } = useParams();
  const { eventsData, teamsData, allSeasons, seasonLabel, selectedSeason, setSelectedSeason } = useSeasonEvents();
  const lineups = useLineups();

  const event = eventsData?.events?.find((e) => e.slug === slug) || null;
  const resolve = useMemo(() => makeResolver(event, teamsData), [event, teamsData]);

  if (!eventsData) {
    return <div className="flex items-center justify-center py-20 text-lg animate-pulse">Loading event...</div>;
  }

  const seasonSelect = allSeasons.length > 1 && (
    <div className="relative">
      <select
        value={selectedSeason || ''}
        onChange={(e) => setSelectedSeason(e.target.value)}
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
  );

  const backLink = (
    <Link to="/events" className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${
      darkMode ? 'text-gray-400 hover:text-white' : 'text-stone-500 hover:text-stone-800'
    }`}>
      <ArrowLeft className="w-4 h-4" /> All Events
    </Link>
  );

  if (!event) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6 flex items-center justify-between gap-4">{backLink}{seasonSelect}</div>
        <div className={`rounded-xl border p-10 text-center ${
          darkMode ? 'bg-gray-900 border-gray-800 text-gray-400' : 'bg-stone-50 border-stone-200 text-stone-500'
        }`}>
          No event called <span className="font-mono">{slug}</span> was held in {seasonLabel}.
          {allSeasons.length > 1 && ' Try another season above.'}
        </div>
      </div>
    );
  }

  return (
    <EventDetailView
      event={event}
      darkMode={darkMode}
      seasonLabel={seasonLabel}
      resolve={resolve}
      lineups={lineups}
      toolbar={<>{backLink}{seasonSelect}</>}
    />
  );
}
