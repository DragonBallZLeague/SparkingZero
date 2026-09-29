import React, { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, X } from 'lucide-react';
import {
  IdentityBlock, UsageBlock, PositionBlock, FormsBlock, BuildsBlock, MatchesBlock,
  useCharacterView,
} from './CharacterBlocks.jsx';
import OverviewTab from './overview/OverviewTab.jsx';
import { BuildPill } from './overview/BuildPicker.jsx';
import { characterBuilds } from './overview/characterBuilds.js';
import { findBuildByCode } from '../../utils/buildKey.js';

/**
 * The character page's arrangement: identity always visible, everything else
 * behind tabs.
 *
 * Chosen over a dense single column and a sticky-rail variant, which were built
 * alongside it and compared with real data. Tabs won on navigation - finding a
 * specific thing is a click rather than a scroll - and on extensibility: a new
 * kind of analysis becomes a new tab, instead of another band competing for
 * space on an already long page. That second point is the reason to keep the
 * tab list below as a plain registry.
 *
 * ONE BUILD AT A TIME: the Overview's build picker writes `?build=<code>`, and the
 * whole page - identity, Overview, Usage, Forms, Matches - then shows that build
 * alone (its row from the leaderboard's own build filter). Only the Builds tab
 * keeps every build, since it is the list of them. The code is read back from the
 * URL, so a shared link opens on the same build, and the strip above the tabs
 * says so - a filtered view must never pass for the whole picture.
 *
 * ONE KNOWN COST: a shared link always lands on Overview. These URLs get pasted
 * into Discord at a specific thing, so "look at this character's matches" is not
 * currently linkable. Putting the active tab in the query string would fix it
 * and is the obvious next step if that starts to matter.
 */

/**
 * The tabs, in order. `available` keeps a tab out of the list when a character
 * has nothing to show under it, rather than presenting an empty panel - not
 * every character transforms. It is asked of the row being shown.
 *
 * To add a tab: add a row here and a case in the panel switch below. Nothing
 * else needs to change.
 */
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'usage', label: 'Usage' },
  { id: 'builds', label: 'Builds', available: (c, all) => (all.topBuilds || []).length > 0 },
  { id: 'forms', label: 'Forms', available: c => c.hasMultipleForms && (c.formStatsArray || []).length > 0 },
  { id: 'matches', label: 'Matches', available: c => (c.matches || []).length > 0 },
];

/** "Showing one build", with the way back to all of them. */
function BuildStrip({ build, darkMode, onClear }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 mt-4 px-3 py-2 rounded-[8px] border border-solid text-sm ${
      darkMode ? 'bg-brand/[.12] border-brand/[.55] text-slate-200' : 'bg-orange-50 border-orange-200 text-gray-800'
    }`}>
      <Filter className={`w-4 h-4 shrink-0 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
      <span className="font-semibold">Showing one build</span>
      <BuildPill label={build.label} darkMode={darkMode} />
      <span className={darkMode ? 'text-slate-400' : 'text-gray-500'}>{build.aiName}</span>
      <span className={`tabular-nums ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
        {build.count} use{build.count === 1 ? '' : 's'}
      </span>
      <button
        type="button"
        onClick={onClear}
        className={`ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-transparent border-0 cursor-pointer ${
          darkMode ? 'text-orange-300 hover:bg-orange-500/20' : 'text-orange-700 hover:bg-orange-100'
        }`}
      >
        <X className="w-3.5 h-3.5" />
        Show all builds
      </button>
    </div>
  );
}

export default function CharacterTabs(props) {
  const { character, rank, darkMode, onOpenMatch, charMap } = props;
  const [tab, setTab] = useState('overview');
  const [searchParams, setSearchParams] = useSearchParams();

  const builds = useMemo(() => characterBuilds(character, charMap), [character, charMap]);
  // An unknown code (another character's, or a build filtered out of scope) is
  // simply ignored: the page shows every build rather than nothing.
  const selected = findBuildByCode(builds, searchParams.get('build'), b => b.key);
  const viewRow = selected && selected.row ? selected.row : character;

  const { byPosition, recentMatches } = useCharacterView(viewRow);

  // Edits a copy of the current params, so the data-scope filters survive.
  // replace: switching builds is looking, not navigating - Back leaves the page.
  const selectBuild = useCallback(code => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (code) next.set('build', code);
      else next.delete('build');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const tabs = TABS.filter(t => !t.available || t.available(viewRow, character));
  // A character can lose the tab that is open - a filter change can leave them
  // with no builds - so fall back rather than render an empty panel.
  const active = tabs.some(t => t.id === tab) ? tab : (tabs[0]?.id || 'overview');

  return (
    // bg-shell-panel, as the Characters table: one panel colour site-wide.
    <div className={`rounded-[10px] p-5 sm:p-6 border border-solid mb-6 ${
      darkMode ? 'bg-shell-panel border-gray-700' : 'bg-white border-gray-200'
    }`}>
      {/* The score and tier are the build's when one is selected. Its leaderboard
          rank is not: the leaderboard ranks characters, not builds. */}
      <IdentityBlock {...props} character={viewRow} rank={selected ? null : rank} />

      {selected && <BuildStrip build={selected} darkMode={darkMode} onClear={() => selectBuild(null)} />}

      <div
        role="tablist"
        className={`flex gap-1 mt-5 mb-5 overflow-x-auto border-0 border-b border-solid ${
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
                    ? 'border-transparent text-slate-400 hover:text-slate-200'
                    : 'border-transparent text-gray-500 hover:text-gray-800')
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {active === 'overview' && (
          <OverviewTab
            viewRow={viewRow}
            allRow={character}
            builds={builds}
            selected={selected}
            onSelectBuild={selectBuild}
            darkMode={darkMode}
          />
        )}
        {active === 'usage' && (
          <div className="space-y-5">
            <UsageBlock character={viewRow} darkMode={darkMode} />
            <PositionBlock byPosition={byPosition} darkMode={darkMode} />
          </div>
        )}
        {active === 'builds' && <BuildsBlock character={character} darkMode={darkMode} limit={6} />}
        {active === 'forms' && <FormsBlock character={viewRow} darkMode={darkMode} />}
        {active === 'matches' && (
          <MatchesBlock
            character={viewRow}
            recentMatches={recentMatches}
            darkMode={darkMode}
            onOpenMatch={onOpenMatch}
          />
        )}
      </div>
    </div>
  );
}
