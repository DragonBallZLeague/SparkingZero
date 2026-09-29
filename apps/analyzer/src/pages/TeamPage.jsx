import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ExternalLink, Loader2, X } from 'lucide-react';
import { APPS } from '@szl/ui';
import TeamLogo from '../components/TeamLogo.jsx';
import ShareButton from '../components/ShareButton.jsx';
import { useQueryUpdate } from '../shell/useQueryUpdate.js';
import { useIsPhone } from '../shell/useMediaQuery.js';
import { PAGE, SearchBox } from '../shell/tableParts.jsx';
import { MedianTrack, RankText } from './character/overview/parts.jsx';
import { rankColor, NEUTRAL } from '../utils/overviewPalette.js';
import { teamByTag, teamName } from '../utils/teams.js';
import { placements } from './characters/characterRows.js';
import {
  teamStatByKey, TEAM_TABS, readTeamTab, readVs, rosterRows, teamLineups, opponentRows, teamMatchList,
  lineupMatchesQuery, matchMatchesQuery,
} from './teams/teamRows.js';
import RosterTable from './team/RosterTable.jsx';
import LineupList from './team/LineupList.jsx';
import TeamOpponents from './team/TeamOpponents.jsx';
import TeamMatches from './team/TeamMatches.jsx';

/** The website's root, from the shared app links. */
const WEBSITE = APPS.find(a => a.key === 'home').href;
const BTN = 'inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-[8px] border border-solid border-gray-700 bg-transparent px-[11px] text-[13px] font-medium text-slate-200 no-underline cursor-pointer hover:border-slate-400/[.35]';
const PANEL = 'rounded-[10px] border border-solid border-gray-700 bg-shell-panel';

/** The headline tiles, in order. Time and tags have no better direction, so no rank. */
const TILES = ['win', 'dmg', 'taken', 'eff', 'dps', 'hp', 'time', 'tags'];

const median = vals => {
  const s = [...vals].sort((a, b) => a - b);
  if (!s.length) return 0;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * One team, behind /teams/<slug> - the detail-page layout: who they are (with
 * "Team info", the website's profile of the team), eight headline figures,
 * then Roster · Lineups · Opponents · Matches (`tab=` in the URL, so "look at
 * their lineups" is a link).
 *
 * The figures are the team's top 5's (pages/teams/teamRows.js), ranked against
 * the other teams in scope. With an opponent picked (`vs=<slug>`, from the
 * Opponents tab or the scope bar's Opponent chip) the whole page is the
 * head-to-head: the figures over those matches only, ranked against the team's
 * other matchups and set beside its overall figure, and every tab cut to them.
 *
 * Laid out like the Meta page rather than the Character page: the header sits
 * on the page and each tab's table is the one panel, so nothing nests.
 *
 * Every figure is over the scope in the bar. `row` is this team's teamRow(),
 * `allRows` every team's (for the ranks), `characters` the scope's raw
 * character rows (for the lineups), `files` the scope's match files and
 * `aggregate` getTeamAggregatedData over them (for the head-to-heads). The
 * roster is the team row's own (or the head-to-head's).
 */
export default function TeamPage({
  team, row, allRows = [], characters = [], files = [], aggregate, reason = 'not-found', label = null,
  scopeLabel = null, idFor, linkFor, teamLinkFor, onOpenMatch, onBack, backLabel = null,
}) {
  const [params] = useSearchParams();
  const update = useQueryUpdate();
  const isPhone = useIsPhone();
  const tab = readTeamTab(params);
  const tag = row ? row.tag : null;

  const oppRows = useMemo(() => (tag && aggregate ? opponentRows(files, tag, aggregate) : []), [files, tag, aggregate]);
  const vs = readVs(params, oppRows.map(r => r.opp));
  const vsRow = vs ? oppRows.find(r => r.opp === vs) : null;
  const roster = useMemo(() => rosterRows((vsRow || row || {}).source), [vsRow, row]);
  const lineups = useMemo(() => (tag ? teamLineups(characters, tag, vs) : []), [characters, tag, vs]);
  const matchList = useMemo(() => (row ? teamMatchList(row.source, vs) : []), [row, vs]);

  // One search for Lineups and Matches; a new search, opponent or tab starts
  // the list over at one page.
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(PAGE);
  const q = query.trim().toLowerCase();
  useEffect(() => { setShown(PAGE); }, [q, vs, tab, tag]);
  const lineupHits = useMemo(() => lineups.filter(l => lineupMatchesQuery(l, q)), [lineups, q]);
  const matchHits = useMemo(() => matchList.filter(m => matchMatchesQuery(m, q)), [matchList, q]);

  if (!row) {
    const back = onBack && <button type="button" onClick={onBack} className={`${BTN} mt-4`}><ArrowLeft className="h-4 w-4" />{backLabel || 'All teams'}</button>;
    if (reason === 'loading') {
      return (
        <div className={`${PANEL} flex items-center gap-3 p-6 text-slate-300`}>
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">Loading match data for {label || 'this team'}…</span>
        </div>
      );
    }
    return (
      <div className={`${PANEL} p-6`}>
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 shrink-0 text-amber-400" />
          <div>
            <h1 className="m-0 text-xl font-bold text-white">
              {reason === 'empty-scope' ? 'No matches in this data scope' : `No matches for ${label || 'this team'}`}
            </h1>
            <p className="mb-0 mt-2 text-sm text-slate-400">
              {reason === 'empty-scope'
                ? 'The filters above match no match files at all. Widen them to bring data back.'
                : <>Either the name in the link is not a team, or it played no matches in {scopeLabel ? <span className="font-semibold">{scopeLabel}</span> : 'this scope'}. Widening the filters may bring it back.</>}
            </p>
            {back}
          </div>
        </div>
      </div>
    );
  }

  const cur = vsRow || row;
  // Against one opponent the figures rank among the team's matchups and sit
  // beside its overall figure; otherwise among the teams, beside the league's.
  const pool = vsRow ? oppRows : allRows;
  const setTab = id => update(p => { if (id === 'roster') p.delete('tab'); else p.set('tab', id); });
  const setVs = opp => update(p => { if (opp) p.set('vs', teamByTag(opp).slug); else p.delete('vs'); });
  const rankOf = (stat, rows, r) => 1 + rows.filter(x => stat.dir * (stat.get(x) - stat.get(r)) > 0).length;
  // A roster row opens the character's page cut to the matches it played for
  // this team, so it opens on the numbers the row shows.
  const rosterLink = name => {
    const to = linkFor(name);
    return to ? `${to}${to.includes('?') ? '&' : '?'}for=${encodeURIComponent(row.slug)}` : null;
  };
  const pill = 'inline-flex items-center gap-1 rounded-full border border-solid border-gray-700 bg-gray-800 px-2 py-0.5 text-xs font-medium text-slate-300 tabular-nums';
  const vsLink = vs && teamLinkFor ? teamLinkFor(vs) : null;
  const VsName = vsLink ? Link : 'span';

  const searchable = tab === 'lineups' || tab === 'matches';
  const search = searchable && (
    <SearchBox value={query} onChange={setQuery} className={isPhone ? 'mb-3 w-full' : 'mb-1.5 w-[260px]'}
      placeholder={tab === 'lineups' ? 'Search matches, teams, characters' : 'Search matches or teams'} />
  );
  const empty = q ? `Nothing matches “${query.trim()}”.` : 'No matches in this scope.';

  return (
    <div className="text-[14px] leading-[1.45] text-slate-100">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3.5">
          <TeamLogo tag={row.tag} size={isPhone ? 48 : 60} rounded={12} />
          <div className="min-w-0">
            <h1 className="m-0 text-2xl font-bold leading-tight text-white sm:text-3xl">{row.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {vs && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-solid border-brand/[.55] bg-brand/[.12] py-0.5 pl-1 pr-1.5 text-xs font-medium text-white">
                  <TeamLogo tag={vs} size={16} rounded={8} />
                  vs <VsName to={vsLink || undefined} className="font-semibold text-white no-underline hover:underline">{teamName(vs)}</VsName>
                  <button type="button" onClick={() => setVs(null)} aria-label="Show every opponent"
                    className="inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-slate-300 hover:text-white">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              <span className={pill}>{cur.wins}–{cur.losses}</span>
              <span className={pill}>{cur.matches} match{cur.matches === 1 ? '' : 'es'}</span>
              <span className={pill}>{cur.chars} character{cur.chars === 1 ? '' : 's'}</span>
              {!vs && allRows.length > 1 && <span className={pill} title="By win %, among the teams in this scope">#{rankOf(teamStatByKey('win'), allRows, row)} of {allRows.length}</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ShareButton darkMode />
          {/* The website's team profile: its description, roster and master list. */}
          {team && team.websiteSlug && (
            <a href={`${WEBSITE}teams?team=${encodeURIComponent(team.websiteSlug)}`} target="_blank" rel="noopener noreferrer" className={BTN}
              title="This team's profile on the league website: description, roster and master list">
              Team info <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {onBack && <button type="button" onClick={onBack} className={BTN}><ArrowLeft className="h-4 w-4" />{backLabel || 'All teams'}</button>}
        </div>
      </div>
      {scopeLabel && (
        <p className="-mt-2 mb-3 text-xs text-slate-500">
          From <span className="font-semibold">{scopeLabel}</span>{vs && <>, against <span className="font-semibold">{teamName(vs)}</span> only</>}
        </p>
      )}

      {/* The headline figures: colour only at the ends of the pool. */}
      <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-solid border-gray-700 bg-slate-400/[.16] sm:grid-cols-4">
        {TILES.map(key => {
          const s = teamStatByKey(key);
          const v = s.get(cur);
          const p = placements(pool, s)(v);
          const color = p === null ? null : rankColor(p * 100, true);
          // A stat with no better direction still shows where the team sits,
          // in neutral grey, with no rank.
          const fill = s.dir ? p : placements(pool, { ...s, dir: 1 })(v);
          return (
            <div key={key} className="min-w-0 bg-shell-panel p-3.5">
              <div className="text-[11px] font-semibold uppercase leading-[1.45] tracking-wider text-slate-400">{s.tile || s.label}</div>
              <div className="mb-2 mt-0.5 flex flex-wrap items-baseline gap-x-2">
                <span className="whitespace-nowrap text-2xl font-extrabold tabular-nums tracking-tight text-white">{s.fmt(v)}</span>
                {s.sub && <span className="whitespace-nowrap text-xs text-slate-400 tabular-nums">{s.sub(cur)}</span>}
              </div>
              <MedianTrack p={(fill ?? 0.5) * 100} color={color || NEUTRAL.dark} fade={!color} dot darkMode />
              <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-xs">
                {s.dir && pool.length > 1 ? <RankText rank={rankOf(s, pool, cur)} pool={pool.length} color={color} darkMode /> : <span />}
                <span className="whitespace-nowrap text-slate-400">
                  {vsRow ? `Overall ${s.fmt(s.get(row))}` : `League ${s.fmt(median(allRows.map(s.get)))}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className={`${isPhone ? 'mb-3' : 'mb-3.5'} flex items-end justify-between gap-3 border-0 border-b border-solid border-gray-700`}>
        <div role="tablist" className="flex gap-[18px]">
          {TEAM_TABS.map(t => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={`cursor-pointer border-0 border-b-2 border-solid bg-transparent px-0 pb-2 pt-1.5 text-[13px] font-semibold leading-[1.45] ${
                tab === t.id ? 'border-brand text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
              {t.label}
            </button>
          ))}
        </div>
        {!isPhone && search}
      </div>
      {isPhone && search}

      {tab === 'roster' && <RosterTable rows={roster} top5={cur.top5} isPhone={isPhone} idFor={idFor} linkFor={rosterLink} />}
      {tab === 'lineups' && (
        <LineupList lineups={lineupHits} shown={shown} onMore={() => setShown(n => n + PAGE)} tag={row.tag} empty={empty}
          isPhone={isPhone} idFor={idFor} onOpenMatch={onOpenMatch} teamLinkFor={teamLinkFor} />
      )}
      {tab === 'opponents' && <TeamOpponents rows={oppRows} vs={vs} onPick={setVs} isPhone={isPhone} />}
      {tab === 'matches' && (
        <TeamMatches matches={matchHits} shown={shown} onMore={() => setShown(n => n + PAGE)} empty={empty}
          isPhone={isPhone} teamLinkFor={teamLinkFor} onOpenMatch={onOpenMatch} />
      )}
    </div>
  );
}
