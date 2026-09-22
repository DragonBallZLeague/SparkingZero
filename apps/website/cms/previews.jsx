// One preview per CMS collection, each rendering the very same component the public
// site renders. Nothing here re-implements a layout: if a page changes, its preview
// changes with it.
import React, { useState, useEffect, useMemo } from 'react';
import yaml from 'js-yaml';

import { SeasonContext } from '../src/contexts/SeasonContext';
import { useLineups } from '../src/hooks/useLineups';
import { useCharacterIndex } from '../src/hooks/useCharacterIndex';
import { makeResolver } from '../src/components/events/entities';

import Navbar from '../src/components/Navbar';
import Footer from '../src/components/Footer';
import HomePage from '../src/pages/HomePage';
import { TeamsView } from '../src/pages/TeamsPage';
import { SeasonView } from '../src/pages/SeasonPage';
import { EventsView } from '../src/pages/EventsPage';
import { EventDetailView } from '../src/pages/EventDetailPage';
import { CommunityView } from '../src/pages/CommunityPage';
import { ArchivesView } from '../src/pages/ArchivesPage';
import { RULE_SECTIONS } from '../src/pages/rules/sections';

import { entryData, entryFileBase, entrySlug, withAssets } from './entry.js';

// ---------------------------------------------------------------------------
// Shared preview chrome
// ---------------------------------------------------------------------------

const THEME_KEY = 'dbszl-cms-preview-dark';

function usePreviewTheme() {
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = window.localStorage.getItem(THEME_KEY);
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_KEY, String(darkMode));
    } catch {
      // private browsing - the toggle still works for this session
    }
  }, [darkMode]);
  return [darkMode, setDarkMode];
}

/** Loads a YAML file from public/content/ - for the sibling files a page needs. */
function useContentYaml(path) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!path) return undefined;
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}content/${path}`)
      .then((r) => (r.ok ? r.text() : null))
      .then((text) => { if (!cancelled) setData(text ? yaml.load(text) : null); })
      .catch(() => { if (!cancelled) setData(null); });
    return () => { cancelled = true; };
  }, [path]);
  return data;
}

/**
 * The bar above every preview: which page is being previewed, a light/dark toggle
 * (the site ships both, so editors should be able to check either), and any
 * per-collection control such as an event picker.
 */
function PreviewShell({ page, darkMode, setDarkMode, controls = null, children }) {
  return (
    <div className={darkMode ? 'bg-gray-950 text-white' : 'bg-stone-200 text-stone-800'}>
      <div className={`sticky top-0 z-50 flex flex-wrap items-center gap-2 px-4 py-2 text-xs border-b ${
        darkMode ? 'bg-gray-900/95 border-gray-800 text-gray-400' : 'bg-white/95 border-stone-300 text-stone-500'
      }`}>
        <span className="font-semibold uppercase tracking-wider">Preview</span>
        <span className="font-mono">{page}</span>
        <div className="ml-auto flex items-center gap-2">
          {controls}
          <button
            type="button"
            onClick={() => setDarkMode((d) => !d)}
            className={`px-2 py-1 rounded border font-medium ${
              darkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-stone-300 hover:bg-stone-100'
            }`}
          >
            {darkMode ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
      </div>
      <div className="min-h-screen">{children}</div>
    </div>
  );
}

function selectClass(darkMode) {
  return `px-2 py-1 rounded border font-medium ${
    darkMode ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-stone-300 text-stone-700'
  }`;
}

function EmptyState({ darkMode, children }) {
  return (
    <div className={`m-6 rounded-xl border border-dashed p-10 text-center text-sm ${
      darkMode ? 'border-gray-700 text-gray-500' : 'border-stone-300 text-stone-400'
    }`}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Site Settings (content/site.yaml) -> nav bar, home page and footer
// ---------------------------------------------------------------------------

function SettingsPreview(props) {
  const [darkMode, setDarkMode] = usePreviewTheme();
  const site = withAssets(entryData(props), props.getAsset);
  // HomePage and Navbar read the site config from context; hand them the version
  // being edited instead of the one fetched from the server.
  const seasonCtx = useMemo(() => ({
    siteData: site,
    selectedSeason: site.current_season_file || 'season-0.yaml',
    setSelectedSeason: () => {},
  }), [site]);

  return (
    <PreviewShell page="/" darkMode={darkMode} setDarkMode={setDarkMode}>
      <SeasonContext.Provider value={seasonCtx}>
        <div className="flex flex-col">
          <Navbar site={site} darkMode={darkMode} setDarkMode={setDarkMode} />
          <HomePage site={site} darkMode={darkMode} />
          <Footer site={site} darkMode={darkMode} />
        </div>
      </SeasonContext.Provider>
    </PreviewShell>
  );
}

// ---------------------------------------------------------------------------
// Team Rosters (content/teams/season-N.yaml)
// ---------------------------------------------------------------------------

function TeamsPreview(props) {
  const [darkMode, setDarkMode] = usePreviewTheme();
  const { calcNames, transformAdj } = useCharacterIndex();
  const raw = withAssets(entryData(props), props.getAsset);
  const data = { ...raw, teams: raw.teams || [] };

  // undefined means "the editor has not picked one yet" - open the first team so a
  // roster edit is visible without a click.
  const [expanded, setExpanded] = useState(undefined);
  const firstSlug = (data.teams[0] && data.teams[0].slug) || null;
  const expandedTeam = expanded === undefined ? firstSlug : expanded;

  if (!data.teams.length) {
    return (
      <PreviewShell page="/teams" darkMode={darkMode} setDarkMode={setDarkMode}>
        <EmptyState darkMode={darkMode}>Add a team to see it here.</EmptyState>
      </PreviewShell>
    );
  }

  const controls = (
    <select
      value={expandedTeam || ''}
      onChange={(e) => setExpanded(e.target.value || null)}
      className={selectClass(darkMode)}
    >
      <option value="">All collapsed</option>
      {data.teams.map((t, i) => (
        <option key={t.slug || i} value={t.slug || ''}>{t.name || `Team ${i + 1}`}</option>
      ))}
    </select>
  );

  return (
    <PreviewShell page="/teams" darkMode={darkMode} setDarkMode={setDarkMode} controls={controls}>
      <TeamsView
        data={data}
        darkMode={darkMode}
        calcNames={calcNames}
        transformAdj={transformAdj}
        expandedTeam={expandedTeam}
        onToggleTeam={(slug) => setExpanded(slug)}
        portalTarget={props.document ? props.document.body : null}
      />
    </PreviewShell>
  );
}

// ---------------------------------------------------------------------------
// Seasons (content/seasons/season-N.yaml)
// ---------------------------------------------------------------------------

function SeasonPreview(props) {
  const [darkMode, setDarkMode] = usePreviewTheme();
  const data = entryData(props);
  // Team colours/icons live in the matching teams file, which is not being edited.
  const teams = useContentYaml(`teams/${entryFileBase(props)}.yaml`);
  const lineups = useLineups();

  const [activeTab, setActiveTab] = useState('standings');
  const [phase, setPhase] = useState(null);
  const [collapsedWeeks, setCollapsedWeeks] = useState({});
  const selectedPhase = phase || data.active_phase || 'main_season';

  return (
    <PreviewShell page="/season" darkMode={darkMode} setDarkMode={setDarkMode}>
      <SeasonView
        data={data}
        teams={teams}
        darkMode={darkMode}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedPhase={selectedPhase}
        onPhaseChange={setPhase}
        collapsedWeeks={collapsedWeeks}
        setCollapsedWeeks={setCollapsedWeeks}
        {...lineups}
      />
    </PreviewShell>
  );
}

// ---------------------------------------------------------------------------
// Events (content/events/season-N.yaml) - the card list plus one event's blocks
// ---------------------------------------------------------------------------

function EventsPreview(props) {
  const [darkMode, setDarkMode] = usePreviewTheme();
  const raw = withAssets(entryData(props), props.getAsset);
  const data = { ...raw, events: raw.events || [] };
  const teams = useContentYaml(`teams/${entryFileBase(props)}.yaml`);
  const lineups = useLineups();

  const [index, setIndex] = useState(0);
  const event = data.events[index] || data.events[0] || null;
  const resolve = useMemo(() => makeResolver(event, teams), [event, teams]);
  const seasonLabel = data.label || entryFileBase(props);

  const controls = data.events.length > 0 && (
    <select value={index} onChange={(e) => setIndex(Number(e.target.value))} className={selectClass(darkMode)}>
      {data.events.map((e, i) => (
        <option key={e.slug || i} value={i}>{e.name || `Event ${i + 1}`}</option>
      ))}
    </select>
  );

  return (
    <PreviewShell page="/events" darkMode={darkMode} setDarkMode={setDarkMode} controls={controls}>
      <EventsView eventsData={data} darkMode={darkMode} seasonLabel={seasonLabel} />
      {event && (
        <>
          <div className={`mx-4 border-t ${darkMode ? 'border-gray-800' : 'border-stone-300'}`} />
          <EventDetailView
            event={event}
            darkMode={darkMode}
            seasonLabel={seasonLabel}
            resolve={resolve}
            lineups={lineups}
          />
        </>
      )}
    </PreviewShell>
  );
}

// ---------------------------------------------------------------------------
// Community, Archives, Rules
// ---------------------------------------------------------------------------

function CommunityPreview(props) {
  const [darkMode, setDarkMode] = usePreviewTheme();
  return (
    <PreviewShell page="/community" darkMode={darkMode} setDarkMode={setDarkMode}>
      <CommunityView data={entryData(props)} darkMode={darkMode} />
    </PreviewShell>
  );
}

function ArchivesPreview(props) {
  const [darkMode, setDarkMode] = usePreviewTheme();
  const [expandedIndex, setExpandedIndex] = useState(0);
  return (
    <PreviewShell page="/archives" darkMode={darkMode} setDarkMode={setDarkMode}>
      <ArchivesView
        data={entryData(props)}
        darkMode={darkMode}
        expandedIndex={expandedIndex}
        onToggle={setExpandedIndex}
      />
    </PreviewShell>
  );
}

function RulesPreview(props) {
  const [darkMode, setDarkMode] = usePreviewTheme();
  // config.yml stores these as a files collection, so the section id comes from the
  // file name (how-to-participate.yaml), with the collection key as a fallback.
  const base = entryFileBase(props);
  const id = RULE_SECTIONS[base] ? base : entrySlug(props).replace(/_/g, '-');
  const section = RULE_SECTIONS[id];

  return (
    <PreviewShell page={`/rules/${id}`} darkMode={darkMode} setDarkMode={setDarkMode}>
      {section ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-bold mb-6">{section.label}</h1>
          <section.View data={entryData(props)} darkMode={darkMode} />
        </div>
      ) : (
        <EmptyState darkMode={darkMode}>
          No rules section is registered for <span className="font-mono">{id}</span>. Add it to
          src/pages/rules/sections.js.
        </EmptyState>
      )}
    </PreviewShell>
  );
}

// Collection name in public/cms/config.yml -> preview component.
export const PREVIEWS = {
  settings: SettingsPreview,
  teams: TeamsPreview,
  seasons: SeasonPreview,
  events: EventsPreview,
  community: CommunityPreview,
  archives: ArchivesPreview,
  rules: RulesPreview,
};
