import React from 'react';
import { Users, ChevronDown, ChevronUp } from 'lucide-react';
import MarkdownContent from '../../pages/rules/MarkdownContent';
import { CharacterCard } from '../LineupPanel';
import { PlayoffBracket } from '../PlayoffBracket';
import { BlockSection, EntityAvatar, lookupsFromResolver } from './entities';

export function MarkdownBlock({ block, darkMode }) {
  return (
    <BlockSection title={block.title} darkMode={darkMode}>
      <MarkdownContent content={block.content} darkMode={darkMode} />
    </BlockSection>
  );
}

// Renders the event's `participants` (optionally filtered by `block.show`).
// A participant with `lineup_file` gets a "View Build" toggle that shows the
// `team1` side of that lineup file — the convention for a boss/squad's own build.
function ParticipantCard({ participant, cardKey, resolve, lineups, darkMode }) {
  const entity = resolve(participant.name);
  const members = participant.members || [];
  const { openLineups, lineupCache, lineupLoading, toggleLineup } = lineups;
  const isOpen = !!openLineups[cardKey];
  const build = lineupCache[participant.lineup_file]?.team1 || [];

  return (
    <div className={`rounded-xl border overflow-hidden ${darkMode ? 'bg-gray-800/40 border-gray-800' : 'bg-white border-stone-200'}`}>
      <div className="flex items-start gap-3 p-4">
        <EntityAvatar entity={entity} size="lg" />
        <div className="min-w-0 flex-1">
          <div className={`font-semibold ${darkMode ? 'text-white' : 'text-stone-900'}`}>{participant.name}</div>
          {participant.description && (
            <p className={`text-sm mt-0.5 ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>{participant.description}</p>
          )}
        </div>
      </div>

      {members.length > 0 && (
        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {members.map((m, i) => {
            const team = m.team ? resolve(m.team) : null;
            return (
              <div key={i} className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-sm ${
                darkMode ? 'bg-gray-800/70 text-gray-200' : 'bg-stone-100 text-stone-700'
              }`}>
                <span className="truncate">{m.character}</span>
                {team && (
                  <span className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide flex-shrink-0 ${
                    darkMode ? 'text-gray-500' : 'text-stone-400'
                  }`}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: team.color }} />
                    {m.team}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {participant.lineup_file && (
        <>
          <button
            onClick={() => toggleLineup(cardKey, participant.lineup_file)}
            className={`w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium border-t transition-colors ${
              isOpen
                ? darkMode ? 'bg-gray-800 text-blue-400 border-gray-700' : 'bg-blue-50 text-blue-600 border-blue-200'
                : darkMode ? 'text-gray-500 border-gray-800 hover:text-white hover:bg-gray-800' : 'text-stone-400 border-stone-200 hover:text-stone-700'
            }`}
          >
            <Users className="w-3 h-3" />
            {isOpen ? 'Hide Build' : 'View Build'}
            {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {isOpen && (
            <div className="p-3">
              {lineupLoading[participant.lineup_file] ? (
                <div className={`text-center text-sm animate-pulse py-4 ${darkMode ? 'text-gray-400' : 'text-stone-500'}`}>Loading build...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {build.map((char, i) => <CharacterCard key={i} char={char} darkMode={darkMode} />)}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function ParticipantsBlock({ block, blockKey, event, resolve, lineups, darkMode }) {
  const all = event.participants || [];
  const shown = block.show?.length ? all.filter((p) => block.show.includes(p.name)) : all;
  if (!shown.length) return null;
  return (
    <BlockSection title={block.title} darkMode={darkMode}>
      <div className={`grid gap-3 ${shown.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
        {shown.map((p, i) => (
          <ParticipantCard key={p.name} participant={p} cardKey={`${blockKey}-p${i}`} resolve={resolve} lineups={lineups} darkMode={darkMode} />
        ))}
      </div>
    </BlockSection>
  );
}

// Thin adapter: a bracket block is shaped exactly like the season `playoffs`
// object, so PlayoffBracket renders it unchanged.
export function BracketBlock({ block, resolve, lineups, darkMode }) {
  const playoffs = {
    format: block.format,
    seedings: block.seedings || [],
    rounds: block.rounds || [],
    third_place_match: block.third_place_match,
  };
  return (
    <BlockSection title={block.title} darkMode={darkMode}>
      <PlayoffBracket
        playoffs={playoffs}
        seedingsMap={null}
        darkMode={darkMode}
        {...lookupsFromResolver(resolve)}
        {...lineups}
        seriesLabel={block.series_label || null}
        emptyMessage="Bracket will be displayed once the event begins."
      />
    </BlockSection>
  );
}
