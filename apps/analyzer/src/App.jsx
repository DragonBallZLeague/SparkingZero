import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import './App.css';
import TabRow from './shell/TabRow.jsx';
import ScopeBar from './shell/ScopeBar.jsx';
import { multiLabel } from './shell/ChipMenu.jsx';
import { useScope } from './shell/useScope.js';
import { useScopedMatches } from './shell/useScopedMatches.js';
import { SCOPE_KEYS, ALL_MARKER, describeScope } from './shell/scopeModel.js';
import { useQueryUpdate, prettySearch } from './shell/useQueryUpdate.js';
import { useCameFrom } from './shell/useCameFrom.js';
import TeamLogo from './components/TeamLogo.jsx';
import CharactersPage from './pages/CharactersPage.jsx';
import HomePage from './pages/HomePage.jsx';
import { readPositions, positionCounts } from './pages/characters/characterRows.js';
import MetaPage from './pages/MetaPage.jsx';
import TeamsPage from './pages/TeamsPage.jsx';
import TeamPage from './pages/TeamPage.jsx';
import MatchesPage from './pages/MatchesPage.jsx';
import MatchPage from './pages/MatchPage.jsx';
import { matchRows, matchName, readMatchesView } from './pages/matches/matchRows.js';
import { buildMatchSlugIndex, matchUrlKey, resolveMatchParam, matchSlug } from './utils/matchSlug.js';
import { readMatch } from './utils/matchRecord.js';
import { teamRows, readVs } from './pages/teams/teamRows.js';
import { teamByTag, teamBySlug } from './utils/teams.js';
import { leagueBuilds, readMetaTab, readBuildFilters, DEFAULT_FLOOR } from './pages/meta/buildRows.js';
import { buildChips } from './pages/meta/buildChips.jsx';
import DataTable from './components/DataTable.jsx';
import { prepareCharacterAveragesData, prepareMatchDetailsData, getCharacterAveragesTableConfig, getMatchDetailsTableConfig, getMetaTableConfig } from './components/TableConfigs.jsx';
import { exportToExcel } from './utils/excelExport.js';
import { loadCapsuleData } from './utils/capsuleDataProcessor.js';
import { parseCharacterCSV } from './utils/statCalculations.js';
import { getAggregatedCharacterData } from './utils/aggregation/characterAggregation.js';
import { getTeamAggregatedData } from './utils/aggregation/teamAggregation.js';
import { getPositionBasedData } from './utils/aggregation/positionAggregation.js';
import { filterAggregatedData } from './utils/aggregation/filterAggregated.js';
import { TIERS } from './utils/tierScale.js';
import { NavBar } from '@szl/ui';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import CharacterPage from './pages/CharacterPage.jsx';
import { ROUTES, pathForView, viewForPath, isSandboxPath } from './routes.js';
import { POSITION_NAMES } from './utils/positions.js';
import {
  buildCharacterSlugIndex,
  resolveCharacterParam,
  characterUrlKey,
} from './utils/characterSlug.js';
import {
  Target, Shield, Upload, Users, FileText, Database, TrendingUp, Table, ChevronDown, ChevronUp, Download,
} from 'lucide-react';
// Reference data CSVs (raw imports) - now using shared referencedata folder
import charactersCSV from '../../../referencedata/characters.csv?raw';
import capsulesCSV from '../../../referencedata/capsules.csv?raw';
import mapsCSV from '../../../referencedata/maps.csv?raw';
// Utility to extract tags from a match file object (returns null if not present)
function extractTagsFromMatchFile(content) {
  if (!content || typeof content !== 'object') return null;
  // Accept either a top-level 'tags' object or legacy fields
  if (content.tags && typeof content.tags === 'object') {
    return content.tags;
  }
  // Optionally, fallback: try to infer from legacy fields (future-proofing)
  return null;
}

export default function App() {
  const [selectedFilePath, setSelectedFilePath] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  // viewType lives in the URL, not in state.
  //
  // Keeping the setter's name and signature means the ~10 existing
  // setViewType() call sites and the view dropdowns keep working
  // untouched - they now navigate instead of setting state, and the view
  // becomes linkable, refreshable and shareable for free.
  const location = useLocation();
  const navigate = useNavigate();
  const { charParam, teamParam, matchParam: leagueMatchParam, '*': sandboxRest } = useParams();
  const [searchParams] = useSearchParams();
  const viewType = viewForPath(location.pathname);
  // The data source comes from the URL too: the Sandbox (/sandbox/...) runs the
  // same views over uploaded files, everywhere else is the league's corpus.
  // `mode` keeps its old name and values so the views' existing checks work.
  const sandbox = isSandboxPath(location.pathname);
  const mode = sandbox ? 'manual' : 'reference';
  // The query string without the detail pages' own params: the Character page's
  // `build` and `for`, the Team page's `vs`. They belong to one character's or
  // team's page: they must not ride along to the leaderboard, another view or
  // another character. The data-scope params do.
  const scopeSearch = useMemo(() => {
    const params = new URLSearchParams(location.search);
    params.delete('build');
    params.delete('for');
    params.delete('vs');
    return prettySearch(params);
  }, [location.search]);
  // Only the scope params: what the section tabs and character links carry, so
  // a page's own params (view, sort, pos) stay on that page.
  const scopeOnlySearch = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const kept = new URLSearchParams();
    for (const k of [...SCOPE_KEYS, ALL_MARKER]) if (params.has(k)) kept.set(k, params.get(k));
    return prettySearch(kept);
  }, [location.search]);
  const setViewType = useCallback(
    (next) => navigate(pathForView(next, { sandbox }) + (sandbox ? '' : scopeSearch)),
    [navigate, scopeSearch, sandbox]
  );

  // ---- data scope and loading ----------------------------------------------
  // The scope bar's tag filter (in the URL) decides which matches load; the
  // file tree no longer does. See shell/useScope.js and shell/useScopedMatches.js.
  const scopeState = useScope(!sandbox);
  const { matches: scopedMatches, loading: scopedLoading } = useScopedMatches(scopeState.paths, !sandbox);
  const dataLoading = !sandbox && (!scopeState.ready || scopedMatches === null || scopedLoading);
  const [manualFiles, setManualFiles] = useState([]);
  const [expandedPositions, setExpandedPositions] = useState({}); // Expanded state for position accordions in matchups
  const [selectedBuildIndex, setSelectedBuildIndex] = useState({}); // Track selected build index per character
  const [selectedBuildSort, setSelectedBuildSort] = useState({}); // Track sort column+dir per character build table
  const [activeBuildFilters, setActiveBuildFilters] = useState({}); // Track active build filter per character
  const [uploadedFilesCollapsed, setUploadedFilesCollapsed] = useState(false); // Collapsed state for uploaded files list
  const [positionMatchTypeFilters, setPositionMatchTypeFilters] = useState(['2v2', '3v3', '4v4', '5v5']); // Match type filters for position analysis
  const [darkMode, setDarkMode] = useState(true); // Dark mode state - default to true

  // The league views read `fileContent` (an array of {name, content, tags}) and
  // `selectedFilePath`, as they did when the file tree filled them; the scope
  // now does. An opened match (/matches/<slug>) lives in openedMatch instead,
  // so opening one never replaces the scope's data.
  useEffect(() => {
    if (sandbox) return;
    setFileContent(scopedMatches);
    setSelectedFilePath(scopeState.paths);
  }, [sandbox, scopedMatches, scopeState.paths]);

  // Moving into the Sandbox swaps the data source for the uploads, which its
  // views read from manualFiles.
  const wasSandbox = useRef(sandbox);
  useEffect(() => {
    if (wasSandbox.current === sandbox) return;
    wasSandbox.current = sandbox;
    if (sandbox) {
      setFileContent(null);
      setSelectedFilePath(null);
    }
  }, [sandbox]);
  
  // Search and filter state for Aggregated Character Performance
  const [selectedCharacters, setSelectedCharacters] = useState([]);
  // Score window and tier selection. These replaced the five performance-level
  // chips - see filterAggregated.js for why those were unsound. They are
  // independent and combine with AND: tiers are the quick read, the window is
  // the precise one. scoreRange null means no window; selectedTiers holds every
  // tier by default, which the filter treats as no tier filter.
  const [scoreRange, setScoreRange] = useState(null);
  const [selectedTiers, setSelectedTiers] = useState(() => [...TIERS]);
  const [minMatches, setMinMatches] = useState(1);
  const [maxMatches, setMaxMatches] = useState(999);
  const [sortBy, setSortBy] = useState('combatScore');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [selectedAIStrategies, setSelectedAIStrategies] = useState([]);
  const [selectedMaps, setSelectedMaps] = useState([]);

  // Reset selected build tabs to "First" whenever any filter changes so stale indices don't produce blank cards
  useEffect(() => {
    setSelectedBuildIndex({});
    setSelectedBuildSort({});
    setActiveBuildFilters({});
  }, [selectedTeams, selectedAIStrategies, selectedMaps, selectedCharacters, scoreRange, selectedTiers, minMatches, maxMatches, sortBy, sortDirection]);

  const charMap = useMemo(() => parseCharacterCSV(charactersCSV), []);

  // Bidirectional id <-> slug lookup, for the /characters/:charParam deep link.
  const charSlugIndex = useMemo(() => buildCharacterSlugIndex(charactersCSV), []);

  // Character name -> the key its page URL uses (a name slug, or the raw id for
  // a character not yet in characters.csv). The leaderboard links each row to
  // its character page with this.
  const charUrlKeyByName = useMemo(() => {
    const byName = new Map();
    for (const [id, name] of charSlugIndex.idToName) {
      if (!byName.has(name)) byName.set(name, characterUrlKey(id, charSlugIndex));
    }
    return byName;
  }, [charSlugIndex]);

  // CANONICALISE a character deep link: a raw id is accepted forever (old links,
  // and characters that appear in match data before characters.csv gains a row),
  // but if that character has a slug the URL is rewritten to it, so the legible
  // form is what lands in the address bar and in whatever someone copies out of
  // it. replace: true because the id URL should not become a back-button stop.
  //
  // Note what this deliberately does NOT do: narrow selectedCharacters. The route
  // renders a real page now, so the leaderboard filter is left untouched - the
  // rank on the page means "among the characters in this data scope", which a
  // one-character filter would flatten to #1 of 1, and Back should return the
  // visitor to the view they actually had.
  useEffect(() => {
    if (!charParam) return;
    const id = resolveCharacterParam(charParam, charSlugIndex);
    if (!id) return; // unknown character - the page renders a not-found notice
    const canonical = characterUrlKey(id, charSlugIndex);
    if (canonical && canonical !== charParam) {
      navigate(ROUTES.character(canonical) + location.search, { replace: true });
    }
  }, [charParam, charSlugIndex, navigate, location.search]);
  const capsuleInfo = useMemo(() => loadCapsuleData(capsulesCSV), []);
  const capsuleMap = capsuleInfo.capsuleMap;
  
  // Parse maps.csv to create map ID to name lookup
  const mapsMap = useMemo(() => {
    const map = {};
    const lines = mapsCSV.trim().split('\n');
    
    for (let i = 1; i < lines.length; i++) { // Skip header
      const line = lines[i].trim();
      if (!line) continue;
      
      const [mapName, mapId] = line.split(',').map(s => s.trim());
      if (mapId && mapName) {
        map[mapId] = mapName;
      }
    }
    
    return map;
  }, []);
  
  // Convert AI strategies array to map for efficient lookup by ID
  const aiStrategies = useMemo(() => {
    const map = {};
    if (capsuleInfo.aiStrategies && Array.isArray(capsuleInfo.aiStrategies)) {
      capsuleInfo.aiStrategies.forEach(strategy => {
        if (strategy.id) {
          map[strategy.id] = strategy;
        }
      });
    }
    return map;
  }, [capsuleInfo.aiStrategies]);


  // Aggregated data for reference mode (single file only)
  // The Matches page's Performances table is one row per character per match.
  const performancesView = viewType === 'matches' && readMatchesView(searchParams) === 'performances';
  const aggregatedData = useMemo(() => {
    if (mode === 'reference' && (viewType === 'aggregated' || viewType === 'home' || viewType === 'meta' || viewType === 'tables' || (viewType === 'teams' && teamParam) || performancesView) && fileContent) {
      // If fileContent is an array, use as is; if single file, wrap in array
      const filesArr = Array.isArray(fileContent)
        ? fileContent
        : fileContent.error ? [] : [{ name: selectedFilePath ? selectedFilePath.join(' / ') : 'Selected File', content: fileContent }];
      return getAggregatedCharacterData(filesArr, charMap, capsuleMap, aiStrategies, mapsMap);
    } else if (mode === 'manual' && (viewType === 'aggregated' || viewType === 'meta' || viewType === 'tables' || performancesView) && manualFiles.length > 0) {
      return getAggregatedCharacterData(manualFiles, charMap, capsuleMap, aiStrategies, mapsMap);
    }
    return [];
  }, [mode, viewType, teamParam, performancesView, charMap, capsuleMap, aiStrategies, manualFiles, fileContent, selectedFilePath]);

  // Position-based data for advanced analysis (single file only)
  const positionData = useMemo(() => {
    if (mode === 'reference' && (viewType === 'aggregated' || viewType === 'meta' || viewType === 'tables') && fileContent) {
      const filesArr = Array.isArray(fileContent)
        ? fileContent
        : fileContent.error ? [] : [{ name: selectedFilePath ? selectedFilePath.join(' / ') : 'Selected File', content: fileContent }];
      return getPositionBasedData(filesArr, charMap, capsuleMap, positionMatchTypeFilters);
    } else if (mode === 'manual' && (viewType === 'aggregated' || viewType === 'meta' || viewType === 'tables') && manualFiles.length > 0) {
      return getPositionBasedData(manualFiles, charMap, capsuleMap, positionMatchTypeFilters);
    }
    return {};
  }, [mode, viewType, charMap, capsuleMap, manualFiles, fileContent, selectedFilePath, positionMatchTypeFilters]);

  // Team aggregated data for team rankings
  const teamAggregatedData = useMemo(() => {
    if (mode === 'reference' && (viewType === 'aggregated' || viewType === 'meta' || viewType === 'tables' || viewType === 'teams') && fileContent) {
      const filesArr = Array.isArray(fileContent)
        ? fileContent
        : fileContent.error ? [] : [{ name: selectedFilePath ? selectedFilePath.join(' / ') : 'Selected File', content: fileContent }];
      return getTeamAggregatedData(filesArr, charMap, capsuleMap, aiStrategies);
    } else if (mode === 'manual' && (viewType === 'aggregated' || viewType === 'meta' || viewType === 'tables' || viewType === 'teams') && manualFiles.length > 0) {
      return getTeamAggregatedData(manualFiles, charMap, capsuleMap, aiStrategies);
    }
    return [];
  }, [mode, viewType, charMap, capsuleMap, aiStrategies, manualFiles, fileContent, selectedFilePath]);

  // Filtered and sorted aggregated data based on search and filters.
  // The implementation lives in utils/aggregation/filterAggregated.js (extracted
  // in Phase 3); this memo only feeds component state into it. charMap is in the
  // dep array now for honesty - it is memoised with [] so it never actually changes.
  const filteredAggregatedData = useMemo(
    () => filterAggregatedData(aggregatedData, {
      selectedCharacters,
      selectedTeams,
      selectedAIStrategies,
      selectedMaps,
      minScore: scoreRange ? scoreRange[0] : 0,
      maxScore: scoreRange ? scoreRange[1] : null,
      tiers: selectedTiers.length === TIERS.length ? null : selectedTiers,
      minMatches,
      maxMatches,
      sortBy,
      sortDirection,
      activeBuildFilters,
      charMap,
    }),
    [aggregatedData, selectedCharacters, scoreRange, selectedTiers, minMatches, maxMatches,
     sortBy, sortDirection, selectedTeams, selectedAIStrategies, selectedMaps,
     activeBuildFilters, charMap]
  );

  // The population a character's performance level and stat bars are measured
  // against. Deliberately NOT filteredAggregatedData: measuring against the
  // post-filter list made the levels self-referential - deselecting "Excellent"
  // re-ranked whoever was left, so a character could turn green without their
  // score changing at all.
  //
  // The rule: filters that change WHICH MATCHES COUNT (team / AI strategy / map,
  // and the build filters) define the field, because they genuinely change each
  // character's stats. Filters that only change WHAT YOU ARE LOOKING AT
  // (performance level, character selection, the match-count window) must not.
  // Passing all five levels disables the level filter - see filterAggregated.js.
  //
  // Phase 3 replaces this with absolute tier cutoffs, at which point no reference
  // population is needed at all.
  // The Character page's "Played for" (`for=<team slug>`): only the matches the
  // character played for that team. A Team page's roster links set it, so the
  // page opens on the numbers the roster row showed.
  const forTeam = useMemo(
    () => (charParam ? teamBySlug(searchParams.get('for'), []) : null),
    [charParam, searchParams]
  );
  const performanceReference = useMemo(
    () => filterAggregatedData(aggregatedData, {
      selectedTeams: forTeam ? [forTeam.tag] : selectedTeams,
      selectedAIStrategies,
      selectedMaps,
      activeBuildFilters,
      charMap,
    }),
    [aggregatedData, forTeam, selectedTeams, selectedAIStrategies, selectedMaps, activeBuildFilters, charMap]
  );

  // ---- /characters/<name-slug> ---------------------------------------------
  //
  // Ranked against performanceReference, not filteredAggregatedData. That memo
  // above explains why at length; the short version is that it applies the
  // filters which change WHICH MATCHES COUNT and ignores the ones that only
  // change what you are looking at. So '#12 of 107' means the same thing however
  // the visitor has sorted or narrowed the table, and it is already sorted by
  // score descending, which is what a rank should mean here.
  const deepLinkedCharacter = useMemo(() => {
    if (!charParam) return null;
    const id = resolveCharacterParam(charParam, charSlugIndex);
    // A character can reach match data before characters.csv gains a row, in
    // which case there is no name to join on - fall back to the raw URL segment.
    const wanted = (id && charSlugIndex.idToName.get(id)) || charParam;

    // Three ways to have no character, and they must not be confused.
    //
    // "Nothing aggregated yet" is NOT a loading signal - a filter combination
    // that matches no files (S1 + Season is empty today: every S1 file is tagged
    // Test) leaves this empty forever, and treating that as loading spins a
    // spinner that never resolves. Ask the actual loading signals instead: the
    // scope is not final yet, or its matches are still arriving.
    //
    // An empty scope is a dead end, not a missing character - say which,
    // because "no data for Toppo" sends someone looking for the wrong problem.
    if (scopeState.ready && scopeState.paths && scopeState.paths.length === 0) {
      return { label: wanted, character: null, reason: 'empty-scope' };
    }
    if (dataLoading) {
      return { label: wanted, character: null, reason: 'loading' };
    }

    const i = performanceReference.findIndex(c => c.name === wanted);
    if (i === -1) return { label: wanted, character: null, reason: 'not-found' };
    return {
      label: wanted,
      id,
      character: performanceReference[i],
      rank: i + 1,
      totalInScope: performanceReference.length,
    };
  }, [charParam, charSlugIndex, performanceReference, scopeState.ready, scopeState.paths, dataLoading]);

  // What the numbers on that page actually cover. Built from the scope in the
  // query string, so the page's own description of its scope and the link
  // someone pasted cannot disagree - they are the same source.
  const dataScopeLabel = useMemo(() => {
    const scope = describeScope(scopeState.scope);
    const matchCount = Array.isArray(fileContent) ? fileContent.length : null;
    return matchCount ? `${scope} (${matchCount.toLocaleString('en-US')} matches)` : scope;
  }, [scopeState.scope, fileContent]);

  // ---- what the shell and the list pages need --------------------------------
  // Character name -> the id its portrait is filed under.
  const charIdByName = useMemo(() => {
    const byName = new Map();
    for (const [id, name] of charSlugIndex.idToName) if (!byName.has(name)) byName.set(name, id);
    return byName;
  }, [charSlugIndex]);
  const charIdFor = useCallback(name => charIdByName.get(name) || null, [charIdByName]);
  // A character's page, carrying the scope so its numbers match the list's.
  // None in the Sandbox: a character page shows league data, not the uploads.
  const characterLinkFor = useCallback(
    name => (sandbox ? null : ROUTES.character(charUrlKeyByName.get(name) || name) + scopeOnlySearch),
    [charUrlKeyByName, scopeOnlySearch, sandbox]
  );

  // ---- /teams and /teams/<slug> ---------------------------------------------
  // Whole-team rows for the Teams table and the Team page's ranks. A team's link
  // carries only the scope, like a character's; none in the Sandbox.
  const allTeamRows = useMemo(() => teamRows(teamAggregatedData), [teamAggregatedData]);
  const teamLinkFor = useCallback(
    tag => (sandbox || !tag ? null : ROUTES.team(teamByTag(tag).slug) + scopeOnlySearch),
    [scopeOnlySearch, sandbox]
  );
  // The same three ways to have no team as a character page has: still loading,
  // an empty scope, or a name that played no matches in scope.
  const deepLinkedTeam = useMemo(() => {
    if (!teamParam) return {};
    const team = teamBySlug(teamParam, allTeamRows.map(r => r.tag));
    const label = team ? team.name : teamParam;
    if (scopeState.ready && scopeState.paths && scopeState.paths.length === 0) return { team, label, reason: 'empty-scope' };
    if (dataLoading) return { team, label, reason: 'loading' };
    const row = team ? allTeamRows.find(r => r.tag === team.tag) : null;
    return row ? { team, label, row } : { team, label, reason: 'not-found' };
  }, [teamParam, allTeamRows, scopeState.ready, scopeState.paths, dataLoading]);
  // A tag or an old slug in the URL is rewritten to the team's slug (replace:
  // not a Back stop), so what a viewer copies is the legible form.
  useEffect(() => {
    const t = deepLinkedTeam.team;
    if (teamParam && t && t.slug !== teamParam) {
      navigate({ pathname: ROUTES.team(t.slug), search: location.search }, { replace: true });
    }
  }, [teamParam, deepLinkedTeam.team, navigate, location.search]);

  // The Team page's head-to-heads: the same aggregation over the matches
  // between two teams only.
  const aggregateTeams = useCallback(
    fs => getTeamAggregatedData(fs, charMap, capsuleMap, aiStrategies),
    [charMap, capsuleMap, aiStrategies]
  );
  // The opponents it can be cut to (`vs`), for the scope bar's Opponent chip -
  // not itself: a team's tests against itself say nothing about it.
  const teamOpponents = useMemo(() => {
    const r = deepLinkedTeam.row;
    if (!r) return [];
    return Object.entries(r.source.opponentRecords || {})
      .filter(([opp]) => opp && opp !== r.tag)
      .map(([opp, rec]) => ({ tag: opp, wins: rec.wins || 0, losses: rec.losses || 0 }))
      .sort((a, b) => b.wins + b.losses - (a.wins + a.losses) || teamByTag(a.tag).name.localeCompare(teamByTag(b.tag).name));
  }, [deepLinkedTeam.row]);
  const teamVs = teamParam ? readVs(searchParams, teamOpponents.map(o => o.tag)) : null;

  // ---- /matches and /matches/<slug> ------------------------------------------
  // A match is addressed by its file name as a slug (utils/matchSlug.js),
  // resolved against every match path the scope knows, or in the Sandbox
  // against the uploads, so a match link works whatever the scope.
  const matchParam = sandbox
    ? (/^matches\/./.test(sandboxRest || '') ? sandboxRest.slice('matches/'.length) : null)
    : (leagueMatchParam || null);
  const validUploadFiles = useMemo(() => manualFiles.filter(f => !f.error), [manualFiles]);
  const matchSlugIndex = useMemo(() => {
    if (sandbox) return buildMatchSlugIndex(validUploadFiles.map(f => f.name));
    return scopeState.tagsIndex ? buildMatchSlugIndex(Object.keys(scopeState.tagsIndex)) : null;
  }, [sandbox, validUploadFiles, scopeState.tagsIndex]);
  // A match's page, carrying the scope, so Back and the tabs keep it.
  const matchLinkFor = useCallback(path => {
    const key = encodeURIComponent(matchUrlKey(path, matchSlugIndex));
    return sandbox ? `${ROUTES.sandbox}${ROUTES.matches}/${key}` : `${ROUTES.matches}/${key}${scopeOnlySearch}`;
  }, [matchSlugIndex, sandbox, scopeOnlySearch]);

  // The opened match: the full file (the corpus shards are trimmed), fetched
  // once per match, or the upload itself in the Sandbox.
  const [openedMatch, setOpenedMatch] = useState(null);
  useEffect(() => {
    if (!matchParam) { setOpenedMatch(null); return undefined; }
    if (!matchSlugIndex) { setOpenedMatch({ status: 'loading', label: matchParam }); return undefined; }
    const path = resolveMatchParam(matchParam, matchSlugIndex);
    if (!path) { setOpenedMatch({ status: 'missing', label: matchParam }); return undefined; }
    const name = matchName(path);
    if (sandbox) {
      const f = validUploadFiles.find(x => x.name === path);
      setOpenedMatch(f ? { status: 'ready', label: matchParam, path, name, tags: f.tags || {}, content: f.content } : { status: 'missing', label: matchParam });
      return undefined;
    }
    let alive = true;
    setOpenedMatch(prev => (prev && prev.path === path && prev.status === 'ready' ? prev : { status: 'loading', label: matchParam, path, name }));
    fetch(`${import.meta.env.BASE_URL}BR_Data/${path.split('/').map(encodeURIComponent).join('/')}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(content => { if (alive) setOpenedMatch({ status: 'ready', label: matchParam, path, name, tags: scopeState.tagsIndex[path] || {}, content }); })
      .catch(() => { if (alive) setOpenedMatch({ status: 'error', label: matchParam, path, name }); });
    return () => { alive = false; };
  }, [matchParam, matchSlugIndex, sandbox, validUploadFiles, scopeState.tagsIndex]);
  const matchState = useMemo(() => (openedMatch && openedMatch.status === 'ready'
    ? { ...openedMatch, match: readMatch(openedMatch.content, { charMap, capsuleMap, aiStrategies, mapsMap }) }
    : openedMatch), [openedMatch, charMap, capsuleMap, aiStrategies, mapsMap]);
  // A path or an old spelling in the URL becomes the slug (replace: not a Back stop).
  useEffect(() => {
    if (!matchParam || !matchSlugIndex) return;
    const path = resolveMatchParam(matchParam, matchSlugIndex);
    const key = path && matchUrlKey(path, matchSlugIndex);
    if (key && key !== matchParam) {
      navigate({ pathname: `${sandbox ? ROUTES.sandbox : ''}${ROUTES.match(key)}`, search: location.search }, { replace: true });
    }
  }, [matchParam, matchSlugIndex, sandbox, navigate, location.search]);

  // The list: every match in scope (or every upload), newest first.
  const listRows = useMemo(() => {
    if (viewType !== 'matches' || matchParam) return [];
    const files = sandbox ? validUploadFiles : (Array.isArray(fileContent) ? fileContent : []);
    return matchRows(files, { charMap, mapsMap, urlKeyFor: p => matchUrlKey(p, matchSlugIndex) });
  }, [viewType, matchParam, sandbox, validUploadFiles, fileContent, charMap, mapsMap, matchSlugIndex]);

  // ---- back buttons ------------------------------------------------------------
  // A detail page goes back where it was opened from (shell/useCameFrom.js),
  // named: "Budokai", "Meta", "Goku (Super)". Opened from a pasted link, it has
  // nowhere to go back to and offers its list instead.
  const cameFrom = useCameFrom();
  const backLabel = useMemo(() => {
    if (!cameFrom) return null;
    const { pathname } = cameFrom;
    if (isSandboxPath(pathname)) return 'Sandbox';
    const seg = decodeURIComponent(pathname.split('/').filter(Boolean)[1] || '');
    switch (viewForPath(pathname)) {
      case 'teams': return seg ? (teamBySlug(seg, [])?.name || seg) : 'Teams';
      case 'aggregated': return seg ? (charSlugIndex.idToName.get(resolveCharacterParam(seg, charSlugIndex)) || seg) : 'Characters';
      case 'meta': return 'Meta';
      case 'matches': {
        if (!seg) return 'Matches';
        const path = matchSlugIndex && resolveMatchParam(seg, matchSlugIndex);
        return path ? matchName(path) : seg;
      }
      case 'tables': return 'Tables';
      default: return 'Home';
    }
  }, [cameFrom, charSlugIndex, matchSlugIndex]);
  const goBack = useCallback(fallback => (cameFrom ? navigate(-1) : navigate(fallback)), [cameFrom, navigate]);

  // In the Sandbox the scope bar says whose data this is instead of offering a scope.
  const validUploads = manualFiles.filter(f => !f.error).length;
  const uploadsLabel = validUploads
    ? `Your uploaded files (${validUploads}). Not league data, and not saved anywhere.`
    : 'Sandbox: upload battle-result files below to see them in every view.';

  // The page's own chips in the scope bar. Characters has one: Position
  // (`pos` in the URL), multi-select - "Starter, Middle" pools both positions'
  // matches.
  const updateQuery = useQueryUpdate();
  const positionsSelected = readPositions(searchParams);
  const posCounts = useMemo(() => positionCounts(aggregatedData), [aggregatedData]);

  // Meta's Builds tab: every build in scope, computed once for its table and
  // its chips (Uses floor, Character, AI strategy, Capsule). ~240ms over the
  // whole corpus, so only on /meta. The Sandbox's few uploads rarely reuse a
  // build five times, so its floor starts at "any number".
  const metaBuilds = useMemo(
    () => (viewType === 'meta' ? leagueBuilds(aggregatedData, charMap) : []),
    [viewType, aggregatedData, charMap]
  );
  const buildFloor = sandbox ? 1 : DEFAULT_FLOOR;
  const buildLinkFor = useCallback(b => {
    const to = characterLinkFor(b.name);
    return to ? `${to}${to.includes('?') ? '&' : '?'}build=${b.code}` : null;
  }, [characterLinkFor]);
  const metaChipKey = viewType === 'meta' ? searchParams.toString() : '';

  const pageChips = useMemo(() => {
    if (sandbox) return [];
    if (viewType === 'meta') {
      return readMetaTab(searchParams) === 'builds'
        ? buildChips({ builds: metaBuilds, filters: readBuildFilters(searchParams, buildFloor), update: updateQuery, idFor: charIdFor, defaultFloor: buildFloor })
        : [];
    }
    if (viewType === 'teams' && teamParam) {
      if (!teamOpponents.length) return [];
      const vsName = teamVs ? teamByTag(teamVs).name : null;
      return [{
        id: 'vs',
        name: 'Opponent',
        multi: false,
        selected: teamVs ? teamByTag(teamVs).slug : '',
        set: !!teamVs,
        label: vsName ? `vs ${vsName}` : 'Opponent',
        search: teamOpponents.length > 8,
        options: [
          { v: '', l: 'All opponents' },
          ...teamOpponents.map(o => ({
            v: teamByTag(o.tag).slug, l: teamByTag(o.tag).name, cnt: `${o.wins}–${o.losses}`,
            img: <TeamLogo tag={o.tag} size={18} rounded={4} />,
          })),
        ],
        onChange: v => updateQuery(p => { if (v) p.set('vs', v); else p.delete('vs'); }),
      }];
    }
    if (viewType !== 'aggregated') return [];
    if (charParam) {
      const name = deepLinkedCharacter && deepLinkedCharacter.label;
      const raw = name ? aggregatedData.find(c => c.name === name) : null;
      if (!raw) return [];
      const played = new Map();
      for (const m of raw.matches || []) if (m.team) played.set(m.team, (played.get(m.team) || 0) + 1);
      if (!played.size) return [];
      return [{
        id: 'for',
        name: 'Played for',
        multi: false,
        selected: forTeam ? forTeam.slug : '',
        set: !!forTeam,
        label: forTeam ? `Played for ${forTeam.name}` : 'Played for',
        search: played.size > 8,
        options: [
          { v: '', l: 'Any team' },
          ...[...played].sort((a, b) => b[1] - a[1]).map(([tag, n]) => ({
            v: teamByTag(tag).slug, l: teamByTag(tag).name, cnt: `${n} match${n === 1 ? '' : 'es'}`,
            img: <TeamLogo tag={tag} size={18} rounded={4} />,
          })),
        ],
        onChange: v => updateQuery(p => { if (v) p.set('for', v); else p.delete('for'); }),
      }];
    }
    return [{
      id: 'pos',
      name: 'Position',
      multi: true,
      selected: positionsSelected,
      set: positionsSelected.length > 0,
      label: multiLabel('Position', positionsSelected, v => POSITION_NAMES[v]),
      allLabel: 'All positions',
      note: 'Picking several pools those positions’ matches.',
      options: ['1', '2', '3'].map(p => ({ v: p, l: POSITION_NAMES[p], cnt: `${posCounts[p]} chars` })),
      onChange: next => updateQuery(p => {
        const keep = [...new Set(next)].sort();
        if (keep.length && keep.length < 3) p.set('pos', keep.join(',')); else p.delete('pos');
      }),
    }];
    // positionsSelected is re-derived each render; its joined form is its identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sandbox, viewType, charParam, positionsSelected.join(','), posCounts, updateQuery, metaBuilds, metaChipKey, buildFloor, charIdFor,
    teamParam, teamOpponents, teamVs, deepLinkedCharacter, aggregatedData, forTeam]);

  const processFiles = (files) => {
    Promise.all(files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = JSON.parse(e.target.result);
            resolve({ name: file.name, content, tags: extractTagsFromMatchFile(content) });
          } catch (error) {
            resolve({ name: file.name, error: 'Invalid JSON file' });
          }
        };
        reader.readAsText(file);
      });
    })).then(results => {
      setManualFiles(results);
      // One file opens as its match; several stay on the view in hand, whose
      // list or figures now cover them.
      const valid = results.filter(f => !f.error);
      if (valid.length === 1) navigate(`${ROUTES.sandbox}${ROUTES.match(matchSlug(valid[0].name))}`);
    });
  };

  const handleManualFileUpload = (event) => {
    const files = Array.from(event.target.files);
    processFiles(files);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const files = Array.from(event.dataTransfer.files).filter(file => 
      file.name.endsWith('.json')
    );
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  // Opening a match (a Team page's lineups and matches, a character's recent
  // matches, the Performances table) goes to its Match page.
  const handleNavigateToMatch = useCallback(fileName => {
    if (fileName) navigate(matchLinkFor(fileName));
  }, [navigate, matchLinkFor]);

  // The full workbook, from the scope bar's Excel button on any page. The views
  // that aggregate have the rows already; elsewhere (Home, Teams, Matches) they
  // are computed from the same matches on demand.
  const handleExcelExport = async () => {
    try {
      let rows = aggregatedData;
      if (!rows.length) {
        const files = sandbox
          ? manualFiles.filter(f => !f.error)
          : (Array.isArray(fileContent) ? fileContent : []);
        rows = getAggregatedCharacterData(files, charMap, capsuleMap, aiStrategies, mapsMap);
      }
      if (!rows.length) { alert('There is no match data in this scope to export.'); return; }
      const characterData = prepareCharacterAveragesData(rows);
      const matchData = prepareMatchDetailsData(rows);
      
      const result = await exportToExcel(characterData, matchData, {
        filename: `DBSZ_Analysis_${new Date().toISOString().split('T')[0]}.xlsx`,
        includeCharacterAverages: true,
        includeMatchDetails: true,
        includeFormatting: true
      });
      
      if (result.success) {
        console.log('Excel export successful:', result.filename);
      } else {
        console.error('Excel export failed:', result.error);
        alert(`Export failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert(`Export failed: ${error.message}`);
    }
  };

  // Handler for Character Averages export only
  const handleCharacterAveragesExport = async () => {
    try {
      const characterData = prepareCharacterAveragesData(aggregatedData);
      
      const result = await exportToExcel(characterData, [], {
        filename: `Character_Averages_${new Date().toISOString().split('T')[0]}.xlsx`,
        includeCharacterAverages: true,
        includeMatchDetails: false,
        includeFormatting: true
      });
      
      if (result.success) {
        console.log('Character Averages export successful:', result.filename);
      } else {
        console.error('Export failed:', result.error);
        alert(`Export failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert(`Export failed: ${error.message}`);
    }
  };

  // Handler for Match Details export only
  const handleMatchDetailsExport = async () => {
    try {
      const matchData = prepareMatchDetailsData(aggregatedData);
      
      const result = await exportToExcel([], matchData, {
        filename: `Match_Details_${new Date().toISOString().split('T')[0]}.xlsx`,
        includeCharacterAverages: false,
        includeMatchDetails: true,
        includeFormatting: true
      });
      
      if (result.success) {
        console.log('Match Details export successful:', result.filename);
      } else {
        console.error('Export failed:', result.error);
        alert(`Export failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert(`Export failed: ${error.message}`);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode 
        ? 'bg-gray-900' 
        : 'bg-gradient-to-br from-orange-500 via-red-600 to-purple-700'
    }`}>
      <NavBar
        current="analyzer"
        title="Battle Result Analyzer"
      />
      {/* The shell: section tabs, then the one-line scope bar every page shares. */}
      <TabRow active={sandbox ? 'sandbox' : viewType} search={scopeOnlySearch} />
      <ScopeBar
        scope={scopeState}
        pageChips={pageChips}
        matchCount={sandbox ? null : (scopeState.paths ? scopeState.paths.length : null)}
        onExcel={sandbox && !validUploads ? null : handleExcelExport}
        uploads={sandbox ? uploadsLabel : null}
      />
      {/* The page column: the same gutter and max-width as the tab row and scope bar. */}
      <div className="px-4 sm:px-6 pt-3 sm:pt-4 pb-16">
      <div className="max-w-page mx-auto">
        {/* Manual Upload Mode */}
        {mode === 'manual' && (
          <div className={`rounded-[10px] border border-solid p-6 mb-6 ${darkMode ? 'bg-shell-panel border-gray-700' : 'bg-white border-gray-200 shadow-xl'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Upload className={`w-6 h-6 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Upload JSON Battle Result Files</h3>
            </div>
            
            <label 
              className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                darkMode 
                  ? 'border-gray-600 bg-gray-700 hover:bg-gray-600' 
                  : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <Upload className={`w-8 h-8 mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Click to upload JSON files or drag and drop</span>
              <input
                type="file"
                multiple
                accept=".json"
                onChange={handleManualFileUpload}
                className="hidden"
              />
            </label>
            
            {manualFiles.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={() => setUploadedFilesCollapsed(!uploadedFilesCollapsed)}
                  className={`w-full text-sm font-semibold mb-2 flex items-center justify-between gap-2 px-3 py-2 rounded-lg transition-colors ${
                    darkMode 
                      ? 'text-gray-300 bg-gray-700 hover:bg-gray-600' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Uploaded Files ({manualFiles.length})
                  </div>
                  {uploadedFilesCollapsed ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronUp className="w-4 h-4" />
                  )}
                </button>
                
                {!uploadedFilesCollapsed && (
                  <div className="space-y-1 mb-4">
                    {manualFiles.map((file, i) => (
                      <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm ${
                        file.error 
                          ? darkMode 
                            ? 'bg-red-900/30 border border-red-700 text-red-300' 
                            : 'bg-red-50 border border-red-200 text-red-700'
                          : darkMode
                            ? 'bg-green-900/30 border border-green-700 text-green-300'
                            : 'bg-green-50 border border-green-200 text-green-700'
                      }`}>
                        {file.error ? (
                          <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                        ) : (
                          <Target className="w-3.5 h-3.5 flex-shrink-0" />
                        )}
                        <span className="flex-1 truncate">{file.name}</span>
                        {file.error && <span className="text-xs opacity-75">Error: {file.error}</span>}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* View Type Selector for Manual Mode */}
                <div className={`mb-4 p-4 rounded-xl border ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                }`}>
                  <h4 className={`text-sm font-semibold mb-3 ${
                    darkMode ? 'text-white' : 'text-gray-800'
                  }`}>View Type</h4>
                  <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3">
                    <label className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      viewType === 'matches' 
                        ? darkMode
                          ? 'border-blue-400 bg-blue-900/30 text-blue-300'
                          : 'border-blue-500 bg-blue-50 text-blue-700'
                        : darkMode
                          ? 'border-gray-600 bg-gray-800 hover:border-gray-500 text-gray-300'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}>
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        <div>
                          <input 
                            type="radio" 
                            value="matches" 
                            checked={viewType === 'matches'} 
                            onChange={(e) => setViewType(e.target.value)}
                            className="sr-only"
                          />
                          <span className="font-semibold text-sm">Matches</span>
                          <p className="text-xs opacity-75">Each upload</p>
                        </div>
                      </div>
                    </label>
                    <label className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      viewType === 'aggregated' 
                        ? darkMode
                          ? 'border-blue-400 bg-blue-900/30 text-blue-300'
                          : 'border-blue-500 bg-blue-50 text-blue-700'
                        : darkMode
                          ? 'border-gray-600 bg-gray-800 hover:border-gray-500 text-gray-300'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        <div>
                          <input 
                            type="radio" 
                            value="aggregated" 
                            checked={viewType === 'aggregated'} 
                            onChange={(e) => setViewType(e.target.value)}
                            className="sr-only"
                          />
                          <span className="font-semibold text-sm">Aggregated Stats</span>
                          <p className="text-xs opacity-75">Combined data</p>
                        </div>
                      </div>
                    </label>
                    <label className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      viewType === 'teams' 
                        ? darkMode
                          ? 'border-yellow-400 bg-yellow-900/30 text-yellow-300'
                          : 'border-yellow-500 bg-yellow-50 text-yellow-700'
                        : darkMode
                          ? 'border-gray-600 bg-gray-800 hover:border-gray-500 text-gray-300'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}>
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        <div>
                          <input 
                            type="radio" 
                            value="teams" 
                            checked={viewType === 'teams'} 
                            onChange={(e) => setViewType(e.target.value)}
                            className="sr-only"
                          />
                          <span className="font-semibold text-sm">Team Rankings</span>
                          <p className="text-xs opacity-75">Win/Loss records</p>
                        </div>
                      </div>
                    </label>
                    <label className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      viewType === 'tables' 
                        ? darkMode
                          ? 'border-green-400 bg-green-900/30 text-green-300'
                          : 'border-green-500 bg-green-50 text-green-700'
                        : darkMode
                          ? 'border-gray-600 bg-gray-800 hover:border-gray-500 text-gray-300'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}>
                      <div className="flex items-center gap-2">
                        <Table className="w-5 h-5" />
                        <div>
                          <input 
                            type="radio" 
                            value="tables" 
                            checked={viewType === 'tables'} 
                            onChange={(e) => setViewType(e.target.value)}
                            className="sr-only"
                          />
                          <span className="font-semibold text-sm">Data Tables</span>
                          <p className="text-xs opacity-75">Interactive tables</p>
                        </div>
                      </div>
                    </label>
                    <label className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      viewType === 'meta' 
                        ? darkMode
                          ? 'border-purple-400 bg-purple-900/30 text-purple-300'
                          : 'border-purple-500 bg-purple-50 text-purple-700'
                        : darkMode
                          ? 'border-gray-600 bg-gray-800 hover:border-gray-500 text-gray-300'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}>
                      <div className="flex items-center gap-2">
                        <Database className="w-5 h-5" />
                        <div>
                          <input 
                            type="radio" 
                            value="meta" 
                            checked={viewType === 'meta'} 
                            onChange={(e) => setViewType(e.target.value)}
                            className="sr-only"
                          />
                          <span className="font-semibold text-sm">Meta Analysis</span>
                          <p className="text-xs opacity-75">Build trends</p>
                        </div>
                      </div>
                    </label>
                  </div>
                  
                </div>
                
              </div>
            )}
          </div>
        )}

        {/* Character detail page - /characters/<name-slug> */}
        {deepLinkedCharacter && (
          <CharacterPage
            character={deepLinkedCharacter.character}
            missingLabel={deepLinkedCharacter.label}
            reason={deepLinkedCharacter.reason}
            rank={deepLinkedCharacter.rank}
            totalInScope={deepLinkedCharacter.totalInScope}
            scopeLabel={forTeam ? `${dataScopeLabel}, playing for ${forTeam.name}` : dataScopeLabel}
            darkMode={darkMode}
            onBack={() => goBack(ROUTES.characters + scopeSearch)}
            backLabel={backLabel}
            portraitId={deepLinkedCharacter.id || charIdFor(deepLinkedCharacter.label)}
            onOpenMatch={handleNavigateToMatch}
            charMap={charMap}
          />
        )}

        {/* League pages: Home, and Characters (table or tier list). Both replaced
            big card layouts - see pages/HomePage.jsx and pages/CharactersPage.jsx. */}
        {!sandbox && viewType === 'home' && (
          <HomePage aggregated={aggregatedData} charMap={charMap} idFor={charIdFor} linkFor={characterLinkFor}
            search={scopeOnlySearch} loading={dataLoading} />
        )}
        {!deepLinkedCharacter && viewType === 'aggregated' && (!sandbox || manualFiles.some(f => !f.error)) && (
          <CharactersPage aggregated={aggregatedData} charMap={charMap} idFor={charIdFor} linkFor={characterLinkFor}
            loading={dataLoading} />
        )}

        {/* Meta: Builds, AI strategies and Capsules (pages/MetaPage.jsx). */}
        {viewType === 'meta' && (!sandbox || manualFiles.some(f => !f.error)) && (
          <MetaPage builds={metaBuilds} aggregated={aggregatedData} charMap={charMap} idFor={charIdFor}
            buildLinkFor={buildLinkFor} defaultFloor={buildFloor} loading={dataLoading} darkMode={darkMode} />
        )}

        {/* Matches (pages/MatchesPage.jsx) and one match (pages/MatchPage.jsx). */}
        {viewType === 'matches' && !matchParam && (!sandbox || validUploadFiles.length > 0) && (
          <MatchesPage rows={listRows} linkFor={r => matchLinkFor(r.path)} loading={dataLoading}
            performances={(
              <DataTable
                data={prepareMatchDetailsData(aggregatedData)}
                columns={getMatchDetailsTableConfig(darkMode, handleNavigateToMatch).columns}
                title="Performances"
                exportFileName={`performances_${new Date().toISOString().split('T')[0]}`}
                onExport={handleMatchDetailsExport}
                darkMode={darkMode}
              />
            )} />
        )}
        {viewType === 'matches' && matchParam && (
          <MatchPage state={matchState} charMap={charMap} characterLinkFor={characterLinkFor} teamLinkFor={teamLinkFor} shareable={!sandbox}
            onBack={() => goBack(sandbox ? ROUTES.sandbox : ROUTES.matches + scopeOnlySearch)} backLabel={backLabel} />
        )}

        {/* Data Tables View */}
        {((mode === 'reference' && viewType === 'tables') || 
          (mode === 'manual' && viewType === 'tables' && manualFiles.filter(f => !f.error).length > 0)) && (
          <div className="space-y-6">
            {/* Character Statistics Table */}
            {aggregatedData && Object.keys(aggregatedData).length > 0 && (
              <>
                {/* Excel Export Button */}
                <div className={`rounded-[10px] border border-solid p-6 ${darkMode ? 'bg-shell-panel border-gray-700' : 'bg-white border-gray-200 shadow-xl'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Export Data Tables
                      </h3>
                      <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Download all data tables to Excel (.xlsx) with full formatting
                      </p>
                    </div>
                    <button
                      onClick={handleExcelExport}
                      className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl ${
                        darkMode 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                    >
                      <Download size={20} />
                      Export to Excel
                    </button>
                  </div>
                </div>

                {/* Character Averages Table */}
                <div className={`rounded-[10px] border border-solid p-6 ${darkMode ? 'bg-shell-panel border-gray-700' : 'bg-white border-gray-200 shadow-xl'}`}>
                  <div className="mb-4">
                    <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Character Performance Averages
                    </h3>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Aggregated statistics showing overall performance across all matches
                    </p>
                  </div>
                  <DataTable
                    data={prepareCharacterAveragesData(aggregatedData)}
                    columns={getCharacterAveragesTableConfig(darkMode).columns}
                    title="Character Performance Averages"
                    exportFileName={`character_averages_${new Date().toISOString().split('T')[0]}`}
                    onExport={handleCharacterAveragesExport}
                    darkMode={darkMode}
                    selectable={true}
                    onSelectionChange={(selectedRows) => {
                      console.log('Selected characters (averages):', selectedRows);
                    }}
                  />
                </div>

                {/* Match Details Table */}
                <div className={`rounded-[10px] border border-solid p-6 ${darkMode ? 'bg-shell-panel border-gray-700' : 'bg-white border-gray-200 shadow-xl'}`}>
                  <div className="mb-4">
                    <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Individual Match Performance Details
                    </h3>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Per-match statistics for detailed analysis and trend identification
                    </p>
                  </div>
                  <DataTable
                    data={prepareMatchDetailsData(aggregatedData)}
                    columns={getMatchDetailsTableConfig(darkMode, handleNavigateToMatch).columns}
                    title="Individual Match Performance Details"
                    exportFileName={`match_details_${new Date().toISOString().split('T')[0]}`}
                    onExport={handleMatchDetailsExport}
                    darkMode={darkMode}
                    selectable={true}
                    onSelectionChange={(selectedRows) => {
                      console.log('Selected match details:', selectedRows);
                    }}
                  />
                </div>
              </>
            )}

            {/* Position Analysis Table - DISABLED FOR NOW */}
            {/* {positionData && Object.keys(positionData).length > 0 && (
              <div className={`rounded-[10px] border border-solid p-6 ${darkMode ? 'bg-shell-panel border-gray-700' : 'bg-white border-gray-200 shadow-xl'}`}>
                <DataTable
                  data={preparePositionData(positionData)}
                  columns={getPositionTableConfig(darkMode).columns}
                  title="Position-Based Performance Analysis"
                  exportFileName={`position_analysis_${new Date().toISOString().split('T')[0]}`}
                  onExport={(exportData, filename) => {
                    console.log('Position data export requested:', { exportData, filename });
                  }}
                  darkMode={darkMode}
                  selectable={true}
                  onSelectionChange={(selectedRows) => {
                    console.log('Selected position data:', selectedRows);
                  }}
                />
              </div>
            )} */}

            {/* Meta Analysis Table - DISABLED FOR NOW */}
            {/* {aggregatedData && Object.keys(aggregatedData).length > 0 && (
              <div className={`rounded-[10px] border border-solid p-6 ${darkMode ? 'bg-shell-panel border-gray-700' : 'bg-white border-gray-200 shadow-xl'}`}>
                <DataTable
                  data={(() => {
                    // Create meta data from aggregated character data
                    const capsuleUsage = {};
                    Object.values(aggregatedData).forEach(char => {
                      if (char.equippedCapsules) {
                        char.equippedCapsules.forEach(capsule => {
                          if (!capsuleUsage[capsule.id]) {
                            capsuleUsage[capsule.id] = {
                              name: capsule.name,
                              usage: 0,
                              winRate: 0,
                              characterCount: 0,
                              type: capsule.type || 'Capsule'
                            };
                          }
                          capsuleUsage[capsule.id].usage++;
                          capsuleUsage[capsule.id].winRate += char.winRate || 0;
                          capsuleUsage[capsule.id].characterCount++;
                        });
                      }
                    });
                    
                    return Object.values(capsuleUsage)
                      .map(capsule => ({
                        ...capsule,
                        winRate: Math.round(capsule.winRate / capsule.characterCount)
                      }))
                      .sort((a, b) => b.usage - a.usage)
                      .slice(0, 50); // Top 50 capsules
                  })()}
                  columns={getMetaTableConfig(darkMode).columns}
                  title="Capsule Meta Analysis"
                  exportFileName={`meta_analysis_${new Date().toISOString().split('T')[0]}`}
                  onExport={(exportData, filename) => {
                    console.log('Meta data export requested:', { exportData, filename });
                  }}
                  darkMode={darkMode}
                  selectable={true}
                  onSelectionChange={(selectedRows) => {
                    console.log('Selected meta data:', selectedRows);
                  }}
                />
              </div>
            )} */}
          </div>
        )}

        {/* Teams (pages/TeamsPage.jsx) and one team (pages/TeamPage.jsx). */}
        {viewType === 'teams' && !teamParam && (!sandbox || manualFiles.some(f => !f.error)) && (
          <TeamsPage rows={allTeamRows} linkFor={teamLinkFor} loading={dataLoading} />
        )}
        {viewType === 'teams' && teamParam && !sandbox && (
          <TeamPage team={deepLinkedTeam.team} row={deepLinkedTeam.row} reason={deepLinkedTeam.reason} label={deepLinkedTeam.label}
            allRows={allTeamRows} characters={aggregatedData} scopeLabel={dataScopeLabel}
            files={Array.isArray(fileContent) ? fileContent : []} aggregate={aggregateTeams}
            idFor={charIdFor} linkFor={characterLinkFor} teamLinkFor={teamLinkFor}
            onOpenMatch={handleNavigateToMatch} onBack={() => goBack(ROUTES.teams + scopeOnlySearch)} backLabel={backLabel} />
        )}

        {/* Error Display */}
        {fileContent?.error && (
          <div className={`rounded-[10px] border border-solid p-6 ${darkMode ? 'bg-shell-panel border-gray-700' : 'bg-white border-gray-200 shadow-xl'}`}>
            <div className={`flex items-center gap-3 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
              <Shield className="w-8 h-8" />
              <div>
                <h3 className="text-xl font-bold">Error Loading File</h3>
                <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{fileContent.error}</p>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
  // Render Submit Data launcher overlay at the end so it's present across views
  useEffect(() => {
    // no-op, placeholder if we need to coordinate darkMode
  }, [darkMode]);
  return null;
}


