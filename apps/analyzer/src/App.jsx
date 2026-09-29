import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import './App.css';
import { Combobox } from './components/Combobox.jsx';
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
import { teamRows, readVs } from './pages/teams/teamRows.js';
import { teamByTag, teamBySlug } from './utils/teams.js';
import { leagueBuilds, readMetaTab, readBuildFilters, DEFAULT_FLOOR } from './pages/meta/buildRows.js';
import { buildChips } from './pages/meta/buildChips.jsx';
import { formatNumber } from './utils/formatters.js';
import DataTable from './components/DataTable.jsx';
import { prepareCharacterAveragesData, prepareMatchDetailsData, getCharacterAveragesTableConfig, getMatchDetailsTableConfig, getMetaTableConfig } from './components/TableConfigs.jsx';
import { exportToExcel } from './utils/excelExport.js';
import { PerFormStatsDisplay, PerFormStatsDisplayAggregated } from './components/PerFormStatsDisplay.jsx';
import { calculatePerFormStats } from './utils/formStatsCalculator.js';
import transformationsData from '../../../referencedata/transformations.json';
import { loadCapsuleData } from './utils/capsuleDataProcessor.js';
import { loadMatches } from './utils/corpusLoader.js';
import { calculateMatchPerformanceScore, parseCharacterCSV, getTeams, extractStats, parseBattleTime, formatBattleTime } from './utils/statCalculations.js';
import { getBuildComposition, getBuildTypeColor } from './utils/buildComposition.js';
import { getFusionPartnerFamilyForms, computeMatchFusionDeltas, applyFusionSplit } from './utils/fusionSplit.js';
import { getAggregatedCharacterData } from './utils/aggregation/characterAggregation.js';
import { getTeamAggregatedData, getTeamStats, recomputeTeamCharStats } from './utils/aggregation/teamAggregation.js';
import { getPositionBasedData } from './utils/aggregation/positionAggregation.js';
import { filterAggregatedData } from './utils/aggregation/filterAggregated.js';
import { TIERS } from './utils/tierScale.js';
import { NavBar } from '@szl/ui';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import CharacterPage from './pages/CharacterPage.jsx';
import { ROUTES, pathForView, viewForPath, isSandboxPath } from './routes.js';
import { POSITION_NAMES } from './utils/positions.js';
import { buildKeyOf } from './utils/buildKey.js';
import {
  buildCharacterSlugIndex,
  resolveCharacterParam,
  characterUrlKey,
} from './utils/characterSlug.js';
import { 
  Trophy, 
  Swords, 
  Target, 
  Zap, 
  Clock, 
  Heart, 
  Shield, 
  Upload,
  BarChart3,
  Users,
  FileText,
  Database,
  TrendingUp,
  Eye,
  Star,
  Settings,
  Package,
  Table,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Info,
  Search,
  X,
  ArrowUpDown,
  Filter,
  Download,
  Brain,
  Minus,
  Copy,
  Check,
  ArrowUpRight
} from 'lucide-react';
// Reference data CSVs (raw imports) - now using shared referencedata folder
import charactersCSV from '../../../referencedata/characters.csv?raw';
import capsulesCSV from '../../../referencedata/capsules.csv?raw';
import mapsCSV from '../../../referencedata/maps.csv?raw';
// Preload reference JSON files shipped with the analyzer (Vite import.meta.glob)
// Each entry may be a module object; code uses module.default || module
const dataFiles = import.meta.glob('../BR_Data/*.json', { eager: true });
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

/**
 * Natural sort comparator for files and folders
 * Handles numeric parts correctly so "Test 10" comes after "Test 9"
 */
function naturalSort(a, b) {
  const aName = a.name || a;
  const bName = b.name || b;
  
  return aName.localeCompare(bName, undefined, {
    numeric: true,
    sensitivity: 'base'
  });
}


// The presentational components that used to live here are now in
// src/components/stats/ and src/components/build/. They were only ever local
// to this file, which meant any new page had to reinvent them; the Character
// page did exactly that and drifted visually as a result.
import { StatBar, PerformanceIndicator, PerformanceIndicatorLabel, PerformanceScoreBadge, StatGroup, MetricDisplay, BlastMetricDisplay, BattleTimeVariance } from './components/stats/index.js';
import { BuildTableView, BuildDisplay } from './components/build/index.js';

export default function App() {
  const [selectedFilePath, setSelectedFilePath] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [fileTags, setFileTags] = useState(null); // Tags for the currently displayed match file
  // Separate state for the header match-analysis selector so we don't override global fileContent
  const [analysisSelectedFilePath, setAnalysisSelectedFilePath] = useState(null);
  const [analysisFileContent, setAnalysisFileContent] = useState(null);
  // viewType lives in the URL, not in state.
  //
  // Keeping the setter's name and signature means the ~10 existing
  // setViewType('single') call sites and the view dropdowns keep working
  // untouched - they now navigate instead of setting state, and the view
  // becomes linkable, refreshable and shareable for free.
  const location = useLocation();
  const navigate = useNavigate();
  const { charParam, teamParam } = useParams();
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
  const [matchFilterSource, setMatchFilterSource] = useState(null); // fileName when navigated from table
  const [preNavigationFileContent, setPreNavigationFileContent] = useState(null); // saved fileContent array before single-match navigation
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
  // now does. A single opened match lives in analysisFileContent instead, so
  // opening one never replaces the scope's data.
  useEffect(() => {
    if (sandbox) return;
    setFileContent(scopedMatches);
    setSelectedFilePath(scopeState.paths);
  }, [sandbox, scopedMatches, scopeState.paths]);

  // Moving between the league and the Sandbox swaps the data source: clear the
  // opened match, and in the Sandbox show the one uploaded file if there is one.
  const wasSandbox = useRef(sandbox);
  useEffect(() => {
    if (wasSandbox.current === sandbox) return;
    wasSandbox.current = sandbox;
    setAnalysisFileContent(null);
    setAnalysisSelectedFilePath(null);
    setMatchFilterSource(null);
    if (sandbox) {
      const valid = manualFiles.filter(f => !f.error);
      setFileContent(valid.length === 1 ? valid[0].content : null);
      setSelectedFilePath(valid.length === 1 ? [valid[0].name] : null);
    }
  }, [sandbox, manualFiles]);
  
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
  const aggregatedData = useMemo(() => {
    if (mode === 'reference' && (viewType === 'aggregated' || viewType === 'home' || viewType === 'meta' || viewType === 'tables' || (viewType === 'teams' && teamParam)) && fileContent) {
      // If fileContent is an array, use as is; if single file, wrap in array
      const filesArr = Array.isArray(fileContent)
        ? fileContent
        : fileContent.error ? [] : [{ name: selectedFilePath ? selectedFilePath.join(' / ') : 'Selected File', content: fileContent }];
      return getAggregatedCharacterData(filesArr, charMap, capsuleMap, aiStrategies, mapsMap);
    } else if (mode === 'manual' && (viewType === 'aggregated' || viewType === 'meta' || viewType === 'tables') && manualFiles.length > 0) {
      return getAggregatedCharacterData(manualFiles, charMap, capsuleMap, aiStrategies, mapsMap);
    }
    return [];
  }, [mode, viewType, teamParam, charMap, capsuleMap, aiStrategies, manualFiles, fileContent, selectedFilePath]);

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
      case 'single': return 'Matches';
      case 'tables': return 'Tables';
      default: return 'Home';
    }
  }, [cameFrom, charSlugIndex]);
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

  const handleSelect = (fileName) => {
    setSelectedFile(fileName);
    const fullPath = Object.keys(dataFiles).find((p) => p.endsWith(fileName));
    if (fullPath) {
      // Access the default export from Vite's import.meta.glob
      const moduleContent = dataFiles[fullPath];
      const actualContent = moduleContent.default || moduleContent;
      setFileContent(actualContent);
      setFileTags(extractTagsFromMatchFile(actualContent));
    } else {
      setFileContent({ error: 'File not found.' });
      setFileTags(null);
    }
  };



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
      // Automatically select the first valid file if only one file was uploaded
      const validFiles = results.filter(f => !f.error);
      if (validFiles.length === 1) {
        setFileContent(validFiles[0].content);
        setFileTags(validFiles[0].tags ?? null);
        setAnalysisFileContent(validFiles[0].content);
        setAnalysisSelectedFilePath([validFiles[0].name]);
        setSelectedFilePath([validFiles[0].name]);
        setViewType('single');
      } else if (validFiles.length > 1) {
        // For multiple files, keep fileContent as null initially
        // Users can select a view type (aggregated, teams, etc.) or select a specific file
        setFileContent(null);
        setAnalysisFileContent(null);
        setAnalysisSelectedFilePath(null);
        setSelectedFilePath(null);
      } else {
        setFileContent(null);
      }
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

  const handleNavigateToMatch = async (fileName) => {
    if (!fileName) return;
    if (mode === 'manual') {
      const file = manualFiles.find(f => f.name === fileName);
      if (file && !file.error) {
        setFileContent(file.content);
        setSelectedFilePath([file.name]);
        setAnalysisFileContent(file.content);
        setAnalysisSelectedFilePath([file.name]);
        setMatchFilterSource(fileName);
        setViewType('single');
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
      }
      return;
    }
    // Reference mode: fetch the full file (one request, full fidelity). It opens
    // in the match view's own state; the scope's data stays as it is.
    const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '';
    try {
      const res = await fetch(`${base}BR_Data/${fileName}`);
      if (res.ok) {
        const content = await res.json();
        setFileTags(extractTagsFromMatchFile(content));
        setAnalysisFileContent(content);
        setAnalysisSelectedFilePath([fileName]);
        setMatchFilterSource(fileName);
        setViewType('single');
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
      }
    } catch (err) {
      console.error('Failed to navigate to match file:', err);
    }
  };

  const handleManualFileSelect = (fileName) => {
    const file = manualFiles.find(f => f.name === fileName);
    if (file && !file.error) {
      // Set the single file content for single match view
      setFileContent(file.content);
      // keep global selected path in sync for compatibility
      setSelectedFilePath([file.name]);
      // Also set analysis-specific state so the header/search-driven analysis area shows this file
      setAnalysisFileContent(file.content);
      setAnalysisSelectedFilePath([file.name]);
      // Automatically switch to single view when manually selecting a file
      setViewType('single');
    }
  };

  // Handler used by the Match Analysis header combobox to switch which file is being shown
  const handleHeaderFileSelect = (fileName) => {
    if (!fileName) return;
    // Manual mode: pick from uploaded files
    if (mode === 'manual') {
      const file = manualFiles.find(f => f.name === fileName);
      if (file && !file.error) {
        // Only apply to the analysis area
        setAnalysisFileContent(file.content);
        setAnalysisSelectedFilePath([file.name]);
      }
      return;
    }

    // Reference mode: fileContent may be an array of {name, content}
    if (Array.isArray(fileContent)) {
      const f = fileContent.find(x => x.name === fileName);
      if (f) {
        // In reference mode other parts of the app expect a plain file content for single view
        // Only apply to the analysis area
        setAnalysisFileContent(f.content || f);
        setAnalysisSelectedFilePath([f.name]);
      }
    }
  };

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

  // Helper function to recursively search for BattleResults, TeamBattleResults, or battleWinLose in nested JSON
  const findBattleData = (obj, maxDepth = 5, currentDepth = 0) => {
    if (!obj || typeof obj !== 'object' || currentDepth >= maxDepth) {
      return null;
    }

    // Check if current object has TeamBattleResults (current BR_Data format)
    if (obj.TeamBattleResults && typeof obj.TeamBattleResults === 'object') {
      const teamBattleResults = obj.TeamBattleResults;
      if (teamBattleResults.battleResult) {
        return teamBattleResults.battleResult;
      }
      if (teamBattleResults.BattleResults) {
        return teamBattleResults.BattleResults;
      }
      // Check if data is directly in TeamBattleResults
      if (teamBattleResults.battleWinLose && teamBattleResults.characterRecord) {
        return teamBattleResults;
      }
    }

    // Check if current object has BattleResults
    if (obj.BattleResults && typeof obj.BattleResults === 'object') {
      return obj.BattleResults;
    }

    // Check if current object directly has battleWinLose (legacy format)
    if (obj.battleWinLose && obj.characterRecord) {
      return obj;
    }

    // Recursively search in nested objects
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && typeof obj[key] === 'object' && obj[key] !== null) {
        const result = findBattleData(obj[key], maxDepth, currentDepth + 1);
        if (result) {
          return result;
        }
      }
    }

    return null;
  };

  // Find correct root for battleWinLose and characterRecord
  let battleWinLose, characterRecord;
  // analysisContent is the file used for the Match Analysis header selector; fall back to global fileContent
  const analysisContent = analysisFileContent || fileContent;
  const analysisSelectedPath = analysisSelectedFilePath || selectedFilePath;

  // Also need characterIdRecord for per-form stats
  let characterIdRecord = null;

  if (analysisContent && typeof analysisContent === 'object') {
    // Handle TeamBattleResults format (current BR_Data structure)
    if (analysisContent.TeamBattleResults && typeof analysisContent.TeamBattleResults === 'object') {
      const teamBattleResults = analysisContent.TeamBattleResults;
      // Check for both battleResult (lowercase) and BattleResults (capital)
      if (teamBattleResults.battleResult) {
        battleWinLose = teamBattleResults.battleResult.battleWinLose;
        characterRecord = teamBattleResults.battleResult.characterRecord;
        characterIdRecord = teamBattleResults.battleResult.characterIdRecord;
      } else if (teamBattleResults.BattleResults) {
        battleWinLose = teamBattleResults.BattleResults.battleWinLose;
        characterRecord = teamBattleResults.BattleResults.characterRecord;
        characterIdRecord = teamBattleResults.BattleResults.characterIdRecord;
      } else if (teamBattleResults.battleWinLose && teamBattleResults.characterRecord) {
        // Direct properties in TeamBattleResults (new wrapper format)
        battleWinLose = teamBattleResults.battleWinLose;
        characterRecord = teamBattleResults.characterRecord;
        characterIdRecord = teamBattleResults.characterIdRecord;
      }
    }
    // Handle new format with teams array at the top
    else if (analysisContent.teams && Array.isArray(analysisContent.teams) && analysisContent.teams.length > 0) {
      const firstTeam = analysisContent.teams[0];
      if (firstTeam.BattleResults) {
        battleWinLose = firstTeam.BattleResults.battleWinLose;
        characterRecord = firstTeam.BattleResults.characterRecord;
        characterIdRecord = firstTeam.BattleResults.characterIdRecord;
      } else if (firstTeam.battleWinLose) {
        battleWinLose = firstTeam.battleWinLose;
        characterRecord = firstTeam.characterRecord;
        characterIdRecord = firstTeam.characterIdRecord;
      }
    } 
    // Handle standard format with BattleResults at root
    else if (analysisContent.BattleResults) {
      battleWinLose = analysisContent.BattleResults.battleWinLose;
      characterRecord = analysisContent.BattleResults.characterRecord;
      characterIdRecord = analysisContent.BattleResults.characterIdRecord;
    } 
    // Handle legacy format with direct properties
    else if (analysisContent.battleWinLose && analysisContent.characterRecord) {
      battleWinLose = analysisContent.battleWinLose;
      characterRecord = analysisContent.characterRecord;
      characterIdRecord = analysisContent.characterIdRecord;
    }
    // Fallback: recursively search for BattleResults in nested structure
    else {
      const battleData = findBattleData(analysisContent);
      if (battleData) {
        battleWinLose = battleData.battleWinLose;
        characterRecord = battleData.characterRecord;
      }
    }
  }

  // Extract team names from teams array (multiple format support)
  let p1TeamName = "Team 1";
  let p2TeamName = "Team 2";
  if (analysisContent && typeof analysisContent === 'object') {
    let teamsArray = null;
    
    // Check for TeamBattleResults format first
    if (analysisContent.TeamBattleResults && Array.isArray(analysisContent.TeamBattleResults.teams)) {
      teamsArray = analysisContent.TeamBattleResults.teams;
    }
    // Check for direct teams array
    else if (Array.isArray(analysisContent.teams)) {
      teamsArray = analysisContent.teams;
    }
    // Check for nested teams in BattleResults
    else if (analysisContent.BattleResults && Array.isArray(analysisContent.BattleResults.teams)) {
      teamsArray = analysisContent.BattleResults.teams;
    }
    
    if (teamsArray && teamsArray.length >= 2) {
      // Handle both string and object formats
      const team1 = teamsArray[0];
      const team2 = teamsArray[1];
      
      // If team1 is a string, use it directly; if it's an object, look for a teamName property
      if (typeof team1 === 'string') {
        p1TeamName = team1 || "Team 1";
      } else if (team1 && typeof team1 === 'object' && team1.teamName) {
        p1TeamName = team1.teamName || "Team 1";
      }
      
      // Same for team2
      if (typeof team2 === 'string') {
        p2TeamName = team2 || "Team 2";
      } else if (team2 && typeof team2 === 'object' && team2.teamName) {
        p2TeamName = team2.teamName || "Team 2";
      }
    } else if (teamsArray && teamsArray.length === 1) {
      const team1 = teamsArray[0];
      
      // If team1 is a string, use it directly; if it's an object, look for a teamName property
      if (typeof team1 === 'string') {
        p1TeamName = team1 || "Team 1";
      } else if (team1 && typeof team1 === 'object' && team1.teamName) {
        p1TeamName = team1.teamName || "Team 1";
      }
    }
  }

  // Extract teams for single file view
  let p1Team = [], p2Team = [];
  if (characterRecord) {
    const teams = getTeams(characterRecord);
    p1Team = teams.p1;
    p2Team = teams.p2;
  }

  const p1Summary = getTeamStats(p1Team, charMap, capsuleMap);
  const p2Summary = getTeamStats(p2Team, charMap, capsuleMap);

  // Fusion split for Match Analysis view: compute per-character stat deltas
  const fusionDeltas = computeMatchFusionDeltas(characterRecord, characterIdRecord);
  const applyFusionDelta = (stats, char) => applyFusionSplit(stats, char, fusionDeltas);

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
                      viewType === 'single' 
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
                            value="single" 
                            checked={viewType === 'single'} 
                            onChange={(e) => setViewType(e.target.value)}
                            className="sr-only"
                          />
                          <span className="font-semibold text-sm">Single Match</span>
                          <p className="text-xs opacity-75">Detailed view</p>
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
                  
                  {/* Helpful hint for single file uploads */}
                  {manualFiles.filter(f => !f.error).length === 1 && viewType !== 'single' && (
                    <div className={`mt-3 p-3 rounded-lg border flex items-start gap-2 ${
                      darkMode 
                        ? 'bg-blue-900/20 border-blue-700 text-blue-300' 
                        : 'bg-blue-50 border-blue-200 text-blue-700'
                    }`}>
                      <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <p className="text-xs">
                        <strong>Tip:</strong> Upload multiple files for richer insights and better trend analysis!
                      </p>
                    </div>
                  )}
                  
                  {/* Helpful hint for multiple file uploads in single view mode */}
                  {manualFiles.filter(f => !f.error).length > 1 && viewType === 'single' && (
                    <div className={`mt-3 p-3 rounded-lg border flex items-start gap-2 ${
                      darkMode 
                        ? 'bg-yellow-900/20 border-yellow-700 text-yellow-300' 
                        : 'bg-yellow-50 border-yellow-200 text-yellow-700'
                    }`}>
                      <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <p className="text-xs">
                        <strong>Note:</strong> {manualFiles.filter(f => !f.error).length} files uploaded. Select a specific file below to view single match details, or switch to Aggregated Stats/Team Rankings to analyze all files together.
                      </p>
                    </div>
                  )}
                </div>
                
                {/* File Selection Dropdown for Single View */}
                {viewType === 'single' && manualFiles.filter(f => !f.error).length > 1 && (
                  <div className={`mt-4 p-4 rounded-xl border ${
                    darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <label className={`block text-sm font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Select a match to analyze:
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {manualFiles.filter(f => !f.error).sort(naturalSort).map((file) => (
                        <button
                          key={file.name}
                          onClick={() => handleManualFileSelect(file.name)}
                          className={`p-3 rounded-lg border-2 text-left transition-all ${
                            analysisSelectedFilePath && analysisSelectedFilePath[0] === file.name
                              ? darkMode
                                ? 'border-blue-500 bg-blue-900/30 text-blue-300'
                                : 'border-blue-500 bg-blue-50 text-blue-700'
                              : darkMode
                                ? 'border-gray-600 bg-gray-800 hover:border-gray-500 text-gray-300'
                                : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            <span className="text-sm font-medium truncate">{file.name.replace(/\.json$/i, '')}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {viewType === 'single' && manualFiles.length === 1 && !manualFiles[0].error ? (
                  <button 
                    onClick={() => handleManualFileSelect(manualFiles[0].name)}
                    className="w-full bg-orange-600 text-white py-3 px-6 rounded-lg hover:bg-orange-700 transition-colors font-semibold flex items-center justify-center gap-2"
                  >
                    <Eye className="w-5 h-5" />
                    Analyze {manualFiles[0].name}
                  </button>
                ) : null}
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

        {/* Single File Analysis Results */}
        {((mode === 'reference' && (analysisSelectedFilePath || selectedFilePath) && viewType === 'single') || 
          (mode === 'manual' && viewType === 'single' && (analysisFileContent || fileContent))) && (
          <div className={`rounded-[10px] border border-solid p-6 ${darkMode ? 'bg-shell-panel border-gray-700' : 'bg-white border-gray-200 shadow-xl'}`}>
            {/* Match filter banner — shown when navigated from Data Tables */}
            {matchFilterSource && (
              <div className={`flex items-center justify-between gap-3 mb-4 px-4 py-3 rounded-xl border ${
                darkMode
                  ? 'bg-blue-900/30 border-blue-600 text-blue-200'
                  : 'bg-blue-50 border-blue-300 text-blue-800'
              }`}>
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 shrink-0" />
                  <span className="text-sm font-medium shrink-0">Viewing match:</span>
                  <span className={`text-sm font-mono truncate ${
                    darkMode ? 'text-blue-300' : 'text-blue-700'
                  }`}>{getFileNameFromPath(matchFilterSource)}</span>
                </div>
                <button
                  onClick={() => {
                    setMatchFilterSource(null);
                    setViewType('tables');
                    if (preNavigationFileContent !== null) {
                      setFileContent(preNavigationFileContent);
                      setPreNavigationFileContent(null);
                    }
                  }}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    darkMode
                      ? 'bg-blue-800 hover:bg-blue-700 text-blue-200 border border-blue-600'
                      : 'bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-300'
                  }`}
                  title="Return to Data Tables"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  Back to Tables
                </button>
              </div>
            )}
            <div className="mb-2">  
              <div className={`flex items-center text-sm font-medium mb-2 gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                <Search className="w-4 h-4" /> Match Selection
              </div>
              <Combobox
                valueId={analysisSelectedFilePath?.[0] || ''}
                items={mode === 'manual' 
                  ? manualFiles.filter(f => !f.error).map(f => ({ id: f.name, name: f.name })).sort(naturalSort)
                  : Array.isArray(fileContent) 
                    ? fileContent.filter(fc => fc.name).map(fc => ({ id: fc.name, name: fc.name })).sort(naturalSort)
                    : []
                }
                placeholder="Search match to analyze..."
                onSelect={(id, name) => handleHeaderFileSelect(id)}
                getName={(item) => getFileNameFromPath(item.name)}
                darkMode={darkMode}
                focusColor="blue"
                showTooltip={false}
              />
            </div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FileText className={`w-8 h-8 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <div>
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Match Analysis</h2>
                  <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Detailed breakdown of this battle</p>
                </div>
              </div>
            </div>
            {/* Match Tag Badges */}
            {analysisContent && analysisContent.tags && (() => {
              const t = analysisContent.tags;
              const tagDefs = [
                { key: 'seasonNumber', label: t.seasonNumber != null ? `S${t.seasonNumber}` : null, color: darkMode ? 'bg-violet-900/40 text-violet-300 border-violet-600' : 'bg-violet-100 text-violet-700 border-violet-300' },
                { key: 'seasonPhase',  label: t.seasonPhase,  color: darkMode ? 'bg-indigo-900/40 text-indigo-300 border-indigo-600' : 'bg-indigo-100 text-indigo-700 border-indigo-300' },
                // Team tag is an array — render one badge per team
                ...(Array.isArray(t.team) ? t.team : (t.team ? [t.team] : [])).map(name => (
                  { key: `team-${name}`, label: name, color: darkMode ? 'bg-blue-900/40 text-blue-300 border-blue-600' : 'bg-blue-100 text-blue-700 border-blue-300' }
                )),
                { key: 'matchType', label: t.matchType, color: darkMode ? 'bg-orange-900/40 text-orange-300 border-orange-600' : 'bg-orange-100 text-orange-700 border-orange-300' },
                { key: 'difficulty',label: t.difficulty,color: darkMode ? 'bg-red-900/40 text-red-300 border-red-600'         : 'bg-red-100 text-red-700 border-red-300' },
                { key: 'matchSize', label: t.matchSize, color: darkMode ? 'bg-green-900/40 text-green-300 border-green-600'   : 'bg-green-100 text-green-700 border-green-300' },
              ].filter(d => d.label);
              if (tagDefs.length === 0) return null;
              return (
                <div className="flex flex-wrap gap-2 mb-5">
                  {tagDefs.map(d => (
                    <span key={d.key} className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${d.color}`}>
                      {d.label}
                    </span>
                  ))}
                </div>
              );
            })()}
            
            {/* Match Outcome Summary */}

            {battleWinLose && (
              <div className={`mb-6 p-4 rounded-xl border text-center ${
                battleWinLose === 'Win'
                  ? (darkMode 
                      ? 'bg-green-900/20 border-green-600 text-green-400' 
                      : 'bg-green-50 border-green-200 text-green-800')
                  : (darkMode 
                      ? 'bg-red-900/20 border-red-600 text-red-400' 
                      : 'bg-red-50 border-red-200 text-red-800')
              }`}>
                <div className="flex items-center justify-center gap-3">
                  <div>
                    <div className="text-lg font-bold">
                      {battleWinLose === 'Win' ? `${p1TeamName} Victory!` : `${p2TeamName} Victory!`}
                    </div>
                    <div className="text-sm opacity-80">
                      {battleWinLose === 'Win' 
                        ? `${p1TeamName} emerged victorious in this battle` 
                        : `${p2TeamName} emerged victorious in this battle`}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* P1 Team */}
              <div className={`rounded-xl p-6 border ${
                darkMode 
                  ? battleWinLose === 'Win' 
                    ? 'border-green-600 bg-green-900/10' 
                    : 'border-red-600 bg-red-900/10'
                  : battleWinLose === 'Win'
                    ? 'border-green-300 bg-green-50'
                    : 'border-red-300 bg-red-50'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Users className={`w-6 h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{p1TeamName}</h3>
                    {battleWinLose && (
                      <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                        battleWinLose === 'Win' 
                          ? (darkMode ? 'bg-green-900/50 text-green-400 border border-green-600' : 'bg-green-100 text-green-800 border border-green-200')
                          : (darkMode ? 'bg-red-900/50 text-red-400 border border-red-600' : 'bg-red-100 text-red-800 border border-red-200')
                      }`}>
                        {battleWinLose === 'Win' ? 'VICTORY' : 'DEFEAT'}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                  <StatBar 
                    value={p1Summary.totalDamage} 
                    maxValue={Math.max(p1Summary.totalDamage, p2Summary.totalDamage)} 
                    type="damage" 
                    label="Total Damage"
                    icon={Target}
                    darkMode={darkMode}
                  />
                  <StatBar 
                    value={(p1Summary.totalHealth / p1Summary.totalHPGaugeValueMax) * 100} 
                    maxValue={100} 
                    displayValue={p1Summary.totalHealth}
                    type="health" 
                    label="HP Remaining"
                    icon={Heart}
                    darkMode={darkMode}
                  />
                  <StatBar 
                    value={p1Summary.totalUltimates} 
                    maxValue={Math.max(p1Summary.totalUltimates, p2Summary.totalUltimates)} 
                    type="ultimate" 
                    label="Ultimates Used"
                    icon={Zap}
                    darkMode={darkMode}
                  />
                </div>

                <h4 className={`font-bold mb-3 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  <Swords className="w-5 h-5" />
                  Characters
                </h4>
                <div className="space-y-3">
                  {(() => {
                    // Collect all character performance scores from both teams for relative scoring
                    return p1Team.map((char, i) => {
                      const stats = applyFusionDelta(extractStats(char, charMap, capsuleMap, i + 1, aiStrategies), char);
                      const performanceScore = calculateMatchPerformanceScore(stats);
                      const efficiency = stats.damageTaken > 0 ? (stats.damageDone / stats.damageTaken).toFixed(2) : '∞';
                      const dps = stats.battleTime > 0 ? Math.round(stats.damageDone / stats.battleTime) : 0;
                      const play = char.battlePlayCharacter || {};
                      
                      return (
                        <div key={i} className={`rounded-lg p-4 border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                          {/* Header: Name with KOs, Performance Score */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h5 className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-gray-800'}`}>{stats.name}</h5>
                              <div className="flex items-center gap-2 mt-1">
                                <Trophy className={`w-4 h-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />
                                <span className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{stats.kills} KOs</span>
                              </div>
                            </div>
                            <PerformanceScoreBadge score={performanceScore} label="Score" size="small" darkMode={darkMode} />
                          </div>
                          
                          {/* Combat Performance Section */}
                        <StatGroup title="Combat Performance" icon={Target} darkMode={darkMode} iconColor="red">
                          <div className="flex items-center justify-between gap-4">
                            <div className="text-center">
                              <div className={`font-bold text-lg ${darkMode ? 'text-red-400' : 'text-red-600'}`}>{formatNumber(stats.damageDone)}</div>
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Damage Done</div>
                            </div>
                            <div className="text-center">
                              <div className={`font-bold text-lg ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{formatNumber(stats.damageTaken)}</div>
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Damage Taken</div>
                            </div>
                            <div className="text-center">
                              <div className={`font-bold text-lg ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>{efficiency}×</div>
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Efficiency</div>
                            </div>
                            <div className="text-center">
                              <div className={`font-bold text-lg ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>{formatNumber(dps)}</div>
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>DPS</div>
                            </div>
                            <div className="text-center">
                              <div className={`font-bold text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{formatBattleTime(stats.battleTime)}</div>
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Battle Time</div>
                            </div>
                          </div>
                        </StatGroup>
                        
                        {/* Survival & Health Section */}
                        <StatGroup title="Survival & Health" icon={Heart} darkMode={darkMode} iconColor="green" collapsible={true} defaultCollapsed={false}>
                          <div className="mb-2">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>HP Remaining</span>
                              <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                {formatNumber(stats.hPGaugeValue)} / {formatNumber(stats.hPGaugeValueMax)} ({Math.round((stats.hPGaugeValue / stats.hPGaugeValueMax) * 100)}%)
                              </span>
                            </div>
                            <div className={`w-full rounded-full h-2 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                              <div 
                                className="h-2 rounded-full bg-green-500"
                                style={{ width: `${(stats.hPGaugeValue / stats.hPGaugeValueMax) * 100}%` }}
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <MetricDisplay label="Guards" value={stats.guardCount} icon={Shield} color="green" darkMode={darkMode} size="small" />
                            {stats.zCounterCount > 0 && (
                              <MetricDisplay label="Z-Counters" value={stats.zCounterCount} color="blue" darkMode={darkMode} size="small" />
                            )}
                            {stats.superCounterCount > 0 && (
                              <MetricDisplay label="Super Counters" value={stats.superCounterCount} color="purple" darkMode={darkMode} size="small" />
                            )}
                            {stats.revengeCounterCount > 0 && (
                              <MetricDisplay label="Revenge Counters" value={stats.revengeCounterCount} color="orange" darkMode={darkMode} size="small" />
                            )}
                            {stats.tags > 0 && (
                              <MetricDisplay label="Tags" value={stats.tags} color="teal" darkMode={darkMode} size="small" />
                            )}
                            {stats.formChangeCount > 0 && (
                              <MetricDisplay label="Transformations" value={stats.formChangeCount} color="violet" darkMode={darkMode} size="small" />
                            )}
                          </div>
                        </StatGroup>
                        
                        {/* Special Abilities Section */}
                        <StatGroup title="Special Abilities" icon={Zap} darkMode={darkMode} iconColor="yellow" collapsible={true} defaultCollapsed={false}>
                          {stats.hasAdditionalCounts ? (
                            // New format - show hit/thrown/rate for all blast types
                            <div className="space-y-3">
                              <BlastMetricDisplay 
                                label="Super 1 Blast" 
                                thrown={stats.s1Blast || 0}
                                hit={stats.s1HitBlast || 0}
                                hitRate={stats.s1HitRate ?? null}
                                color="yellow"
                                darkMode={darkMode}
                                size="small"
                                legacyMode={false}
                              />
                              
                              <BlastMetricDisplay 
                                label="Super 2 Blast" 
                                thrown={stats.s2Blast || 0}
                                hit={stats.s2HitBlast || 0}
                                hitRate={stats.s2HitRate ?? null}
                                color="yellow"
                                darkMode={darkMode}
                                size="small"
                                legacyMode={false}
                              />
                              
                              <BlastMetricDisplay 
                                label="Ultimate Blast" 
                                thrown={stats.ultBlast || 0}
                                hit={stats.uLTHitBlast || 0}
                                hitRate={stats.ultHitRate ?? null}
                                color="cyan"
                                darkMode={darkMode}
                                size="small"
                                legacyMode={false}
                              />
                              
                              {/* Other Abilities (always shown) */}
                              <div className={`grid grid-cols-2 gap-2 pt-3 ${
                                darkMode ? 'border-t border-gray-600' : 'border-t border-gray-300'
                              }`}>
                                <MetricDisplay label="Skill 1" value={stats.exa1Count} color="purple" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Skill 2" value={stats.exa2Count} color="purple" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Ki Charges" value={stats.chargeCount} color="blue" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Ki Blasts" value={stats.shotEnergyBulletCount} color="blue" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Sparking Mode" value={stats.sparkingCount} color="yellow" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Dragon Dash Mileage" value={stats.dragonDashMileage} color="gray" darkMode={darkMode} size="small" />
                              </div>
                            </div>
                          ) : (
                            // Old format - show only thrown count for blast types
                            <div className="space-y-3">
                              <BlastMetricDisplay 
                                label="Super 1 Blast" 
                                thrown={stats.spm1Count || 0}
                                color="yellow"
                                darkMode={darkMode}
                                size="small"
                                legacyMode={true}
                              />
                              
                              <BlastMetricDisplay 
                                label="Super 2 Blast" 
                                thrown={stats.spm2Count || 0}
                                color="yellow"
                                darkMode={darkMode}
                                size="small"
                                legacyMode={true}
                              />
                              
                              <BlastMetricDisplay 
                                label="Ultimate Blast" 
                                thrown={stats.ultimatesUsed || 0}
                                color="cyan"
                                darkMode={darkMode}
                                size="small"
                                legacyMode={true}
                              />
                              
                              {/* Other Abilities (always shown) */}
                              <div className={`grid grid-cols-2 gap-2 pt-3 ${
                                darkMode ? 'border-t border-gray-600' : 'border-t border-gray-300'
                              }`}>
                                <MetricDisplay label="Skill 1" value={stats.exa1Count} color="purple" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Skill 2" value={stats.exa2Count} color="purple" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Ki Charges" value={stats.chargeCount} color="blue" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Ki Blasts" value={stats.shotEnergyBulletCount} color="blue" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Sparking Mode" value={stats.sparkingCount} color="yellow" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Dragon Dash Mileage" value={stats.dragonDashMileage} color="gray" darkMode={darkMode} size="small" />
                              </div>
                            </div>
                          )}
                        </StatGroup>

                        {/* Combat Mechanics Section (Collapsible) */}
                        <StatGroup title="Combat Mechanics" icon={Swords} darkMode={darkMode} collapsible={true} defaultCollapsed={true}>
                          <div className="space-y-1">
                            <MetricDisplay label="Max Combo" value={stats.maxComboNum} color="purple" darkMode={darkMode} size="small" />
                            <MetricDisplay label="Max Combo Damage" value={formatNumber(stats.maxComboDamage)} color="red" darkMode={darkMode} size="small" />
                            <MetricDisplay label="Throws" value={stats.throwCount} color="gray" darkMode={darkMode} size="small" />
                            <MetricDisplay label="Lightning Attacks" value={stats.lightningAttackCount} color="yellow" darkMode={darkMode} size="small" />
                            <MetricDisplay label="Vanishing Attacks" value={stats.vanishingAttackCount} color="blue" darkMode={darkMode} size="small" />
                            <MetricDisplay label="Dragon Homing" value={stats.dragonHomingCount} color="purple" darkMode={darkMode} size="small" />
                            {stats.speedImpactCount > 0 && (
                              <>
                                <MetricDisplay label="Speed Impacts" value={stats.speedImpactCount} color="red" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Speed Impact Wins" value={stats.speedImpactWins} color="green" darkMode={darkMode} size="small" />
                              </>
                            )}
                          </div>
                        </StatGroup>
                        
                        {/* Build Section (Collapsible) */}
                        <StatGroup title="Build" icon={Star} darkMode={darkMode} collapsible={true} defaultCollapsed={true}>
                          <BuildDisplay stats={stats} showDetailed={true} darkMode={darkMode} />
                        </StatGroup>
                        
                        {/* Forms Used Display - Expandable Per-Form Stats */}
                        <PerFormStatsDisplay
                          characterRecord={char}
                          characterIdRecord={characterIdRecord}
                          formChangeHistory={char.formChangeHistory}
                          formChangeHistoryText={stats.formChangeHistory}
                          originalCharacterId={play.originalCharacter?.key}
                          charMap={charMap}
                          darkMode={darkMode}
                        />
                      </div>
                    );
                  });
                })()}
                </div>
              </div>

              {/* P2 Team */}
              <div className={`rounded-xl p-6 border ${
                darkMode 
                  ? battleWinLose === 'Lose' 
                    ? 'border-green-600 bg-green-900/10' 
                    : 'border-red-600 bg-red-900/10'
                  : battleWinLose === 'Lose'
                    ? 'border-green-300 bg-green-50'
                    : 'border-red-300 bg-red-50'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Users className={`w-6 h-6 ${darkMode ? 'text-red-400' : 'text-red-600'}`} />
                    <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{p2TeamName}</h3>
                    {battleWinLose && (
                      <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                        battleWinLose === 'Lose' 
                          ? (darkMode ? 'bg-green-900/50 text-green-400 border border-green-600' : 'bg-green-100 text-green-800 border border-green-200')
                          : (darkMode ? 'bg-red-900/50 text-red-400 border border-red-600' : 'bg-red-100 text-red-800 border border-red-200')
                      }`}>
                        {battleWinLose === 'Lose' ? 'VICTORY' : 'DEFEAT'}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                  <StatBar 
                    value={p2Summary.totalDamage} 
                    maxValue={Math.max(p1Summary.totalDamage, p2Summary.totalDamage)} 
                    type="damage" 
                    label="Total Damage"
                    icon={Target}
                    darkMode={darkMode}
                  />
                  <StatBar 
                    value={(p2Summary.totalHealth / p2Summary.totalHPGaugeValueMax) * 100} 
                    maxValue={100} 
                    displayValue={p2Summary.totalHealth}
                    type="health" 
                    label="HP Remaining"
                    icon={Heart}
                    darkMode={darkMode}
                  />
                  <StatBar 
                    value={p2Summary.totalUltimates} 
                    maxValue={Math.max(p1Summary.totalUltimates, p2Summary.totalUltimates)} 
                    type="ultimate" 
                    label="Ultimates Used"
                    icon={Zap}
                    darkMode={darkMode}
                  />
                </div>

                <h4 className={`font-bold mb-3 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  <Swords className="w-5 h-5" />
                  Characters
                </h4>
                <div className="space-y-3">
                  {(() => {
                    // Collect all character performance scores from both teams for relative scoring
                    return p2Team.map((char, i) => {
                      const stats = applyFusionDelta(extractStats(char, charMap, capsuleMap, i + 1, aiStrategies), char);
                      const performanceScore = calculateMatchPerformanceScore(stats);
                      const efficiency = stats.damageTaken > 0 ? (stats.damageDone / stats.damageTaken).toFixed(2) : '∞';
                      const dps = stats.battleTime > 0 ? Math.round(stats.damageDone / stats.battleTime) : 0;
                      const play = char.battlePlayCharacter || {};
                      
                      return (
                        <div key={i} className={`rounded-lg p-4 border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}>
                          {/* Header: Name with KOs, Performance Score */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h5 className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-gray-800'}`}>{stats.name}</h5>
                              <div className="flex items-center gap-2 mt-1">
                                <Trophy className={`w-4 h-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />
                                <span className={`text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{stats.kills} KOs</span>
                              </div>
                            </div>
                            <PerformanceScoreBadge score={performanceScore} label="Score" size="small" darkMode={darkMode} />
                          </div>
                          
                          {/* Combat Performance Section */}
                        <StatGroup title="Combat Performance" icon={Target} darkMode={darkMode} iconColor="red">
                          <div className="flex items-center justify-between gap-4">
                            <div className="text-center">
                              <div className={`font-bold text-lg ${darkMode ? 'text-red-400' : 'text-red-600'}`}>{formatNumber(stats.damageDone)}</div>
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Damage Done</div>
                            </div>
                            <div className="text-center">
                              <div className={`font-bold text-lg ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{formatNumber(stats.damageTaken)}</div>
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Damage Taken</div>
                            </div>
                            <div className="text-center">
                              <div className={`font-bold text-lg ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>{efficiency}×</div>
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Efficiency</div>
                            </div>
                            <div className="text-center">
                              <div className={`font-bold text-lg ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>{formatNumber(dps)}</div>
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>DPS</div>
                            </div>
                            <div className="text-center">
                              <div className={`font-bold text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{formatBattleTime(stats.battleTime)}</div>
                              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Battle Time</div>
                            </div>
                          </div>
                        </StatGroup>
                        
                        {/* Survival & Health Section */}
                        <StatGroup title="Survival & Health" icon={Heart} darkMode={darkMode} iconColor="green" collapsible={true} defaultCollapsed={false}>
                          <div className="mb-2">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>HP Remaining</span>
                              <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                {formatNumber(stats.hPGaugeValue)} / {formatNumber(stats.hPGaugeValueMax)} ({Math.round((stats.hPGaugeValue / stats.hPGaugeValueMax) * 100)}%)
                              </span>
                            </div>
                            <div className={`w-full rounded-full h-2 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                              <div 
                                className="h-2 rounded-full bg-green-500"
                                style={{ width: `${(stats.hPGaugeValue / stats.hPGaugeValueMax) * 100}%` }}
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <MetricDisplay label="Guards" value={stats.guardCount} icon={Shield} color="green" darkMode={darkMode} size="small" />
                            {stats.zCounterCount > 0 && (
                              <MetricDisplay label="Z-Counters" value={stats.zCounterCount} color="blue" darkMode={darkMode} size="small" />
                            )}
                            {stats.superCounterCount > 0 && (
                              <MetricDisplay label="Super Counters" value={stats.superCounterCount} color="purple" darkMode={darkMode} size="small" />
                            )}
                            {stats.revengeCounterCount > 0 && (
                              <MetricDisplay label="Revenge Counters" value={stats.revengeCounterCount} color="orange" darkMode={darkMode} size="small" />
                            )}
                            {stats.tags > 0 && (
                              <MetricDisplay label="Tags" value={stats.tags} color="teal" darkMode={darkMode} size="small" />
                            )}
                            {stats.formChangeCount > 0 && (
                              <MetricDisplay label="Transformations" value={stats.formChangeCount} color="violet" darkMode={darkMode} size="small" />
                            )}
                          </div>
                        </StatGroup>
                        
                        {/* Special Abilities Section */}
                        <StatGroup title="Special Abilities" icon={Zap} darkMode={darkMode} iconColor="yellow" collapsible={true} defaultCollapsed={false}>
                          {stats.hasAdditionalCounts ? (
                            // New format - show hit/thrown/rate for all blast types
                            <div className="space-y-3">
                              <BlastMetricDisplay 
                                label="Super 1 Blast" 
                                thrown={stats.s1Blast || 0}
                                hit={stats.s1HitBlast || 0}
                                hitRate={stats.s1HitRate ?? null}
                                color="yellow"
                                darkMode={darkMode}
                                size="small"
                                legacyMode={false}
                              />
                              
                              <BlastMetricDisplay 
                                label="Super 2 Blast" 
                                thrown={stats.s2Blast || 0}
                                hit={stats.s2HitBlast || 0}
                                hitRate={stats.s2HitRate ?? null}
                                color="yellow"
                                darkMode={darkMode}
                                size="small"
                                legacyMode={false}
                              />
                              
                              <BlastMetricDisplay 
                                label="Ultimate Blast" 
                                thrown={stats.ultBlast || 0}
                                hit={stats.uLTHitBlast || 0}
                                hitRate={stats.ultHitRate ?? null}
                                color="cyan"
                                darkMode={darkMode}
                                size="small"
                                legacyMode={false}
                              />
                              
                              {/* Other Abilities (always shown) */}
                              <div className={`grid grid-cols-2 gap-2 pt-3 ${
                                darkMode ? 'border-t border-gray-600' : 'border-t border-gray-300'
                              }`}>
                                <MetricDisplay label="Skill 1" value={stats.exa1Count} color="purple" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Skill 2" value={stats.exa2Count} color="purple" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Ki Charges" value={stats.chargeCount} color="blue" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Ki Blasts" value={stats.shotEnergyBulletCount} color="blue" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Sparking Mode" value={stats.sparkingCount} color="yellow" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Dragon Dash Mileage" value={stats.dragonDashMileage} color="gray" darkMode={darkMode} size="small" />
                              </div>
                            </div>
                          ) : (
                            // Old format - show only thrown count for blast types
                            <div className="space-y-3">
                              <BlastMetricDisplay 
                                label="Super 1 Blast" 
                                thrown={stats.spm1Count || 0}
                                color="yellow"
                                darkMode={darkMode}
                                size="small"
                                legacyMode={true}
                              />
                              
                              <BlastMetricDisplay 
                                label="Super 2 Blast" 
                                thrown={stats.spm2Count || 0}
                                color="yellow"
                                darkMode={darkMode}
                                size="small"
                                legacyMode={true}
                              />
                              
                              <BlastMetricDisplay 
                                label="Ultimate Blast" 
                                thrown={stats.ultimatesUsed || 0}
                                color="cyan"
                                darkMode={darkMode}
                                size="small"
                                legacyMode={true}
                              />
                              
                              {/* Other Abilities (always shown) */}
                              <div className={`grid grid-cols-2 gap-2 pt-3 ${
                                darkMode ? 'border-t border-gray-600' : 'border-t border-gray-300'
                              }`}>
                                <MetricDisplay label="Skill 1" value={stats.exa1Count} color="purple" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Skill 2" value={stats.exa2Count} color="purple" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Ki Charges" value={stats.chargeCount} color="blue" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Ki Blasts" value={stats.shotEnergyBulletCount} color="blue" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Sparking Mode" value={stats.sparkingCount} color="yellow" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Dragon Dash Mileage" value={stats.dragonDashMileage} color="gray" darkMode={darkMode} size="small" />
                              </div>
                            </div>
                          )}
                        </StatGroup>

                        {/* Combat Mechanics Section (Collapsible) */}
                        <StatGroup title="Combat Mechanics" icon={Swords} darkMode={darkMode} collapsible={true} defaultCollapsed={true}>
                          <div className="space-y-1">
                            <MetricDisplay label="Max Combo" value={stats.maxComboNum} color="purple" darkMode={darkMode} size="small" />
                            <MetricDisplay label="Max Combo Damage" value={formatNumber(stats.maxComboDamage)} color="red" darkMode={darkMode} size="small" />
                            <MetricDisplay label="Throws" value={stats.throwCount} color="gray" darkMode={darkMode} size="small" />
                            <MetricDisplay label="Lightning Attacks" value={stats.lightningAttackCount} color="yellow" darkMode={darkMode} size="small" />
                            <MetricDisplay label="Vanishing Attacks" value={stats.vanishingAttackCount} color="blue" darkMode={darkMode} size="small" />
                            <MetricDisplay label="Dragon Homing" value={stats.dragonHomingCount} color="purple" darkMode={darkMode} size="small" />
                            {stats.speedImpactCount > 0 && (
                              <>
                                <MetricDisplay label="Speed Impacts" value={stats.speedImpactCount} color="red" darkMode={darkMode} size="small" />
                                <MetricDisplay label="Speed Impact Wins" value={stats.speedImpactWins} color="green" darkMode={darkMode} size="small" />
                              </>
                            )}
                          </div>
                        </StatGroup>
                        
                        {/* Build Section (Collapsible) */}
                        <StatGroup title="Build" icon={Star} darkMode={darkMode} collapsible={true} defaultCollapsed={true}>
                          <BuildDisplay stats={stats} showDetailed={true} darkMode={darkMode} />
                        </StatGroup>
                        
                        {/* Forms Used Display - Expandable Per-Form Stats */}
                        <PerFormStatsDisplay
                          characterRecord={char}
                          characterIdRecord={characterIdRecord}
                          formChangeHistory={char.formChangeHistory}
                          formChangeHistoryText={stats.formChangeHistory}
                          originalCharacterId={play.originalCharacter?.key}
                          charMap={charMap}
                          darkMode={darkMode}
                        />
                      </div>
                    );
                  });
                })()}
                </div>
              </div>
            </div>
          </div>
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


// Extract filename (without path or .json extension) from a given path or name
function getFileNameFromPath(pathOrName) {
  if (!pathOrName) return '';
  // If it's a full path, split by both / and \\ for windows paths
  const parts = pathOrName.split(/\\|\//g);
  const last = parts[parts.length - 1] || pathOrName;
  return last.replace(/\.json$/i, '');
}
