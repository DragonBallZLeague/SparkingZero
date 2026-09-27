import React, { useState } from 'react';
import {
  IdentityBlock, HeadlineBlock, UsageBlock, PositionBlock, FormsBlock, BuildsBlock, MatchesBlock,
  useCharacterView,
} from './CharacterBlocks.jsx';

/**
 * The character page's arrangement: identity and headline numbers always
 * visible, everything else behind tabs.
 *
 * Chosen over a dense single column and a sticky-rail variant, which were built
 * alongside it and compared with real data. Tabs won on navigation - finding a
 * specific thing is a click rather than a scroll - and on extensibility: a new
 * kind of analysis becomes a new tab, instead of another band competing for
 * space on an already long page. That second point is the reason to keep the
 * tab list below as a plain registry.
 *
 * ONE KNOWN COST: a shared link always lands on Overview. These URLs get pasted
 * into Discord at a specific thing, so "look at this character's builds" is not
 * currently linkable. Putting the active tab in the query string would fix it
 * and is the obvious next step if that starts to matter.
 */

/**
 * The tabs, in order. `available` keeps a tab out of the list when a character
 * has nothing to show under it, rather than presenting an empty panel - not
 * every character transforms.
 *
 * To add a tab: add a row here and a case in the panel switch below. Nothing
 * else needs to change.
 */
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'builds', label: 'Builds', available: c => (c.topBuilds || []).length > 0 },
  { id: 'forms', label: 'Forms', available: c => c.hasMultipleForms && (c.formStatsArray || []).length > 0 },
  { id: 'matches', label: 'Matches', available: c => (c.matches || []).length > 0 },
];

export default function CharacterTabs(props) {
  const { character, darkMode, onOpenMatch } = props;
  const { byPosition, recentMatches } = useCharacterView(character);
  const [tab, setTab] = useState('overview');

  const tabs = TABS.filter(t => !t.available || t.available(character));
  // A character can lose the tab that is open - a filter change can leave them
  // with no builds - so fall back rather than render an empty panel.
  const active = tabs.some(t => t.id === tab) ? tab : (tabs[0]?.id || 'overview');

  return (
    <div className={`rounded-2xl p-5 sm:p-6 border border-solid mb-6 ${
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <IdentityBlock {...props} />

      <div className={`h-px my-5 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
      <HeadlineBlock character={character} darkMode={darkMode} columns={8} />

      <div
        role="tablist"
        className={`flex gap-1 mt-5 mb-4 overflow-x-auto border-b border-solid ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}
      >
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active === t.id}
            onClick={() => setTab(t.id)}
            // bg-transparent and border-0 are explicit: Tailwind preflight is
            // off here, so a bare <button> keeps the UA's default grey fill.
            className={`px-3 py-2 text-sm font-semibold whitespace-nowrap bg-transparent border-0 border-b-2 border-solid cursor-pointer transition-colors ${
              active === t.id
                ? (darkMode ? 'border-orange-500 text-white' : 'border-orange-500 text-gray-900')
                : (darkMode
                    ? 'border-transparent text-gray-400 hover:text-gray-200'
                    : 'border-transparent text-gray-500 hover:text-gray-800')
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {active === 'overview' && (
          <div className="space-y-5">
            <UsageBlock character={character} darkMode={darkMode} />
            <PositionBlock byPosition={byPosition} darkMode={darkMode} />
          </div>
        )}
        {active === 'builds' && <BuildsBlock character={character} darkMode={darkMode} limit={6} />}
        {active === 'forms' && <FormsBlock character={character} darkMode={darkMode} />}
        {active === 'matches' && (
          <MatchesBlock
            character={character}
            recentMatches={recentMatches}
            darkMode={darkMode}
            onOpenMatch={onOpenMatch}
          />
        )}
      </div>
    </div>
  );
}
