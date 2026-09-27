import React, { useState } from 'react';
import {
  IdentityBlock, HeadlineBlock, UsageBlock, PositionBlock, FormsBlock, BuildsBlock, MatchesBlock,
  Section, useCharacterView,
} from './CharacterBlocks.jsx';

/**
 * Three candidate arrangements of the same character-page content.
 *
 * TEMPORARY: these exist so the layouts can be compared side by side with real
 * data (?layout=dense|rail|tabs) before one is chosen. Two of the three get
 * deleted once that decision is made. The CONTENT blocks they arrange are not
 * temporary - those stay whichever layout wins, which is the whole reason the
 * comparison is built out of shipped components rather than a mockup.
 */

export const LAYOUTS = [
  { id: 'dense', label: 'Dense', blurb: 'One column, minimal chrome' },
  { id: 'rail', label: 'Rail', blurb: 'Sticky summary + scrolling detail' },
  { id: 'tabs', label: 'Tabs', blurb: 'Header + tabbed sections' },
];

export const DEFAULT_LAYOUT = 'dense';

/** The outer surface. One container for the page, not one per section. */
function Shell({ darkMode, children, className = '' }) {
  return (
    <div className={`rounded-2xl p-5 sm:p-6 border border-solid mb-6 ${
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    } ${className}`}>
      {children}
    </div>
  );
}

function Rule({ darkMode }) {
  return <div className={`h-px my-5 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />;
}

// ---- A. Dense ---------------------------------------------------------------
//
// One column, one container. Sections separated by a heading and a rule rather
// than by nested bordered cards, and the headline numbers are a strip of
// label/value pairs rather than eight boxes. Highest density of the three, and
// closest in feel to the leaderboard's tables.
function DenseLayout(props) {
  const { character, darkMode, onOpenMatch } = props;
  const { byPosition, recentMatches } = useCharacterView(character);

  return (
    <Shell darkMode={darkMode}>
      <IdentityBlock {...props} />
      <Rule darkMode={darkMode} />
      <HeadlineBlock character={character} darkMode={darkMode} columns={8} />
      <Rule darkMode={darkMode} />
      <div className="space-y-5">
        <UsageBlock character={character} darkMode={darkMode} />
        <PositionBlock byPosition={byPosition} darkMode={darkMode} />
        <BuildsBlock character={character} darkMode={darkMode} />
        <FormsBlock character={character} darkMode={darkMode} />
        <MatchesBlock
          character={character}
          recentMatches={recentMatches}
          darkMode={darkMode}
          onOpenMatch={onOpenMatch}
        />
      </div>
    </Shell>
  );
}

// ---- B. Rail ----------------------------------------------------------------
//
// Identity and the headline numbers pin to the left on wide screens while the
// detail scrolls beside them, so the key facts stay on screen while reading
// builds or matches. Collapses to one column below lg, which is why the sticky
// behaviour needs the breakpoint guard.
function RailLayout(props) {
  const { character, darkMode, onOpenMatch } = props;
  const { byPosition, recentMatches } = useCharacterView(character);

  return (
    <Shell darkMode={darkMode}>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] gap-6">
        <div className="lg:sticky lg:top-4 lg:self-start">
          <IdentityBlock {...props} compact />
          <div className={`h-px my-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
          <HeadlineBlock character={character} darkMode={darkMode} columns={2} />
        </div>

        <div className={`space-y-5 lg:border-l lg:border-solid lg:pl-6 ${
          darkMode ? 'lg:border-gray-700' : 'lg:border-gray-200'
        }`}>
          <UsageBlock character={character} darkMode={darkMode} columns={2} />
          <PositionBlock byPosition={byPosition} darkMode={darkMode} />
          <BuildsBlock character={character} darkMode={darkMode} />
          <FormsBlock character={character} darkMode={darkMode} />
          <MatchesBlock
            character={character}
            recentMatches={recentMatches}
            darkMode={darkMode}
            onOpenMatch={onOpenMatch}
          />
        </div>
      </div>
    </Shell>
  );
}

// ---- C. Tabs ----------------------------------------------------------------
//
// Identity and headline numbers always visible; everything else behind tabs.
// Shortest first view of the three. The cost is that detail needs a click and a
// shared link always lands on Overview - worth weighing given these URLs are
// meant to be pasted at a specific thing.
function TabsLayout(props) {
  const { character, darkMode, onOpenMatch } = props;
  const { byPosition, recentMatches } = useCharacterView(character);
  const [tab, setTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'builds', label: 'Builds' },
    ...(character.hasMultipleForms && (character.formStatsArray || []).length
      ? [{ id: 'forms', label: 'Forms' }] : []),
    { id: 'matches', label: 'Matches' },
  ];

  return (
    <Shell darkMode={darkMode}>
      <IdentityBlock {...props} />
      <Rule darkMode={darkMode} />
      <HeadlineBlock character={character} darkMode={darkMode} columns={8} />

      <div className={`flex gap-1 mt-5 mb-4 border-b border-solid ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm font-semibold bg-transparent border-0 border-b-2 border-solid cursor-pointer transition-colors ${
              tab === t.id
                ? (darkMode ? 'border-orange-500 text-white' : 'border-orange-500 text-gray-900')
                : (darkMode ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-800')
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-5">
          <UsageBlock character={character} darkMode={darkMode} />
          <PositionBlock byPosition={byPosition} darkMode={darkMode} />
        </div>
      )}
      {tab === 'builds' && <BuildsBlock character={character} darkMode={darkMode} limit={6} />}
      {tab === 'forms' && <FormsBlock character={character} darkMode={darkMode} />}
      {tab === 'matches' && (
        <MatchesBlock
          character={character}
          recentMatches={recentMatches}
          darkMode={darkMode}
          onOpenMatch={onOpenMatch}
        />
      )}
    </Shell>
  );
}

const IMPLEMENTATIONS = { dense: DenseLayout, rail: RailLayout, tabs: TabsLayout };

export function CharacterLayout({ layout = DEFAULT_LAYOUT, ...props }) {
  const Impl = IMPLEMENTATIONS[layout] || IMPLEMENTATIONS[DEFAULT_LAYOUT];
  return <Impl {...props} />;
}

/**
 * The comparison switcher. Shown only while ?layout= is being used to decide,
 * and removed along with the losing layouts.
 */
export function LayoutSwitcher({ layout, onChange, darkMode }) {
  return (
    <div className={`rounded-xl px-4 py-3 mb-4 border border-solid flex flex-wrap items-center gap-3 ${
      darkMode ? 'bg-gray-900/60 border-gray-700' : 'bg-amber-50 border-amber-200'
    }`}>
      <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>
        Layout preview
      </span>
      <div className="flex gap-1">
        {LAYOUTS.map(l => (
          <button
            key={l.id}
            type="button"
            onClick={() => onChange(l.id)}
            title={l.blurb}
            className={`px-3 py-1 rounded-lg text-sm font-semibold border border-solid cursor-pointer transition-colors ${
              layout === l.id
                ? 'bg-orange-500 border-orange-400 text-white'
                : (darkMode
                    ? 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50')
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        {LAYOUTS.find(l => l.id === layout)?.blurb} — same content in all three, only the arrangement differs.
      </span>
    </div>
  );
}
