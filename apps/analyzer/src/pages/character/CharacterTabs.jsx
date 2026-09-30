import React, { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IdentityBlock } from './CharacterBlocks.jsx';
import CharacterForms from './CharacterForms.jsx';
import CharacterBuilds from './CharacterBuilds.jsx';
import OverviewTab from './overview/OverviewTab.jsx';
import CharacterUsage from './CharacterUsage.jsx';
import CharacterMatches from './CharacterMatches.jsx';
import FilterStrip from '../../components/FilterStrip.jsx';
import TeamLogo from '../../components/TeamLogo.jsx';
import { BuildPill } from './overview/BuildPicker.jsx';
import { characterBuilds } from './overview/characterBuilds.js';
import { readCharacterCuts, cutCharacter, formSlices, formSlug, reachedForm } from './characterCuts.js';
import Portrait from '../../components/Portrait.jsx';
import { findBuildByCode, buildKeyOf, buildCode } from '../../utils/buildKey.js';
import { POSITION_NAMES } from '../../utils/positions.js';
import { teamBySlug, teamByTag } from '../../utils/teams.js';

const teamByTagSlug = tag => teamByTag(tag).slug;

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
 * CUTS: a build (`?build=<code>`, the Overview's build picker or a Builds tab
 * row), a position (`?pos=`, a Usage position row), a form (`?form=`, a Forms
 * tab form) and a team (`?for=`, a Usage team row or the scope bar's Played
 * for chip) each cut the whole page -
 * identity, Overview, Usage, Forms, Matches - to those matches, recomputed by
 * the leaderboard's own filter (character/characterCuts.js). Clicking the same
 * thing again removes it. Each list keeps all of its own options while cut, as
 * the rest of the cuts leave them: the Builds tab lists every build at the
 * picked position, the position table every position with the picked build.
 * Every cut shows as a strip above the tabs with its own clear - a filtered
 * view must never pass for the whole picture (the league, 2026-09-29). All of
 * it is in the URL, so a shared link opens on the same cut.
 *
 * A FORM is the Match page's rule (the league's choice, 2026-09-30): the
 * Overview shows the form's own figures in each match that reached it, rates
 * against the league and amounts as a share of all its forms. The tabs'
 * tables list those matches whole, so their scores stay whole-match scores,
 * and the header drops Tier and Score: a form is part of a match, and the
 * score's damage and HP would read it as a weak whole one.
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
  { id: 'forms', label: 'Forms', available: c => (c.matches || []).some(m => (m.formChangeCount || 0) > 0) },
  { id: 'matches', label: 'Matches', available: c => (c.matches || []).length > 0 },
];

const uses = n => `${n} match${n === 1 ? '' : 'es'}`;

/** The strips above the tabs: one per cut, each with the way back. */
function CutStrips({ build, pos, posCount, form, formCount, team, teamCount, darkMode, set }) {
  if (!build && !pos && !form && !team) return null;
  return (
    <div className="mt-4 flex flex-col gap-1.5">
      {build && (
        <FilterStrip label="Showing one build" clearLabel="Show all builds" onClear={() => set('build', null)}>
          <BuildPill label={build.label} darkMode={darkMode} />
          <span className="text-slate-400">{build.aiName}</span>
          <span className="tabular-nums text-slate-400">{build.count} use{build.count === 1 ? '' : 's'}</span>
        </FilterStrip>
      )}
      {pos && (
        <FilterStrip label="Showing one position" clearLabel="Show all positions" onClear={() => set('pos', null)}>
          <b className="font-semibold text-white">{POSITION_NAMES[pos]}</b>
          <span className="tabular-nums text-slate-400">{uses(posCount)}</span>
        </FilterStrip>
      )}
      {form && (
        <FilterStrip label="Showing one form" clearLabel="Show all forms" onClear={() => set('form', null)}>
          <span className="inline-flex min-w-0 items-center gap-2">
            <Portrait id={form.id} name={form.name} size={20} rounded={4} />
            <b className="font-semibold text-white">{form.name}</b>
          </span>
          <span className="tabular-nums text-slate-400">reached in {uses(formCount)}</span>
          {form.fusion && <span className="text-slate-400">The whole fusion{form.fusion.partnerName ? `, with ${form.fusion.partnerName}` : ''}</span>}
        </FilterStrip>
      )}
      {team && (
        <FilterStrip label="Playing for" clearLabel="Show all teams" onClear={() => set('for', null)}>
          <span className="inline-flex min-w-0 items-center gap-2">
            <TeamLogo tag={team.tag} size={20} rounded={4} />
            <b className="font-semibold text-white">{team.name}</b>
          </span>
          <span className="tabular-nums text-slate-400">{uses(teamCount)}</span>
        </FilterStrip>
      )}
    </div>
  );
}

export default function CharacterTabs(props) {
  // `character` comes cut to the team already (App applies `for=`, which also
  // decides what the rank counts among); `teamsRow` is the same character over
  // every team, for the Usage tab's team list, or null when no team is picked.
  const { character, teamsRow = null, rank, darkMode, matchLinkFor, performancesLink, charMap, portraitId } = props;
  const [tab, setTab] = useState('overview');
  const [searchParams, setSearchParams] = useSearchParams();
  const cuts = readCharacterCuts(searchParams);
  const team = teamsRow ? teamBySlug(searchParams.get('for'), []) : null;

  // Edits a copy of the current params, so the data-scope filters survive.
  // replace: cutting the page is looking, not navigating - Back leaves the page.
  const setCut = useCallback((key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, String(value));
      else next.delete(key);
      return next;
    }, { replace: true });
  }, [setSearchParams]);
  const toggle = (key, value, current) => setCut(key, String(value) === String(current) ? null : value);

  // A form of this character's, whatever the other cuts leave (so its strip
  // can still be cleared); a slug none of its matches reached is ignored.
  const formMatch = cuts.form ? (character.matches || []).find(m => reachedForm(m, cuts.form)) : null;
  const formCut = formMatch ? cuts.form : null;
  const form = formMatch ? formMatch.forms.find(f => formSlug(f.name) === formCut) : null;

  // Builds: among the picked position's and form's matches (every cut but its own).
  const posRow = useMemo(() => cutCharacter(character, { pos: cuts.pos, form: formCut }, charMap), [character, cuts.pos, formCut, charMap]);
  const builds = useMemo(() => characterBuilds(posRow, charMap), [posRow, charMap]);
  const selected = findBuildByCode(builds, cuts.build, b => b.key);
  // A build of this character's that the position leaves out still shows its
  // strip (so it can be cleared); a code that is none of its builds (another
  // character's) is ignored.
  const buildMatch = !selected && cuts.build
    ? (character.matches || []).find(m => buildCode(buildKeyOf(m)) === cuts.build) : null;
  const build = selected || (buildMatch && {
    label: buildMatch.buildComposition?.label || 'No Build', aiName: buildMatch.aiStrategy || 'Default', count: 0,
  });
  const buildCut = build ? cuts.build : null;

  // What the page shows: every cut. Null when they leave no match.
  const viewRow = useMemo(
    () => (selected ? selected.row : cutCharacter(character, { pos: cuts.pos, build: buildCut, form: formCut }, charMap)),
    [selected, character, cuts.pos, buildCut, formCut, charMap]);
  // The Usage tab's lists: positions under the build and form, teams under
  // all three; the Forms tab's under the position and build.
  const buildRow = useMemo(() => cutCharacter(character, { build: buildCut, form: formCut }, charMap), [character, buildCut, formCut, charMap]);
  const teamBase = useMemo(
    () => cutCharacter(teamsRow || character, { pos: cuts.pos, build: buildCut, form: formCut }, charMap),
    [teamsRow, character, cuts.pos, buildCut, formCut, charMap]);
  const formBase = useMemo(
    () => cutCharacter(character, { pos: cuts.pos, build: buildCut }, charMap),
    [character, cuts.pos, buildCut, charMap]);
  // The Overview's figures under a form: the form's own, match by match.
  const formView = useMemo(
    () => (formCut && viewRow ? formSlices(viewRow.matches, formCut) : null),
    [formCut, viewRow]);

  const count = (row, keep) => (row ? (row.matches || []).filter(keep).length : 0);
  const strips = (
    <CutStrips build={build} darkMode={darkMode} set={setCut}
      pos={cuts.pos} posCount={count(buildRow, m => Number(m.position) === cuts.pos)}
      form={form} formCount={viewRow ? viewRow.matches.length : 0}
      team={team} teamCount={team ? count(teamBase, m => m.team === team.tag) : 0} />
  );

  if (!viewRow) {
    return (
      <div className="rounded-[10px] p-5 sm:p-6 border border-solid mb-6 bg-shell-panel border-gray-700">
        <IdentityBlock {...props} character={character} rank={null} hideFigures />
        {strips}
        <p className="mb-0 mt-4 text-[14px] text-slate-400">No matches with all of these filters. Clear one to see the rest.</p>
      </div>
    );
  }

  const tabs = TABS.filter(t => !t.available || t.available(viewRow, character));
  // A character can lose the tab that is open - a filter change can leave them
  // with no builds - so fall back rather than render an empty panel.
  const active = tabs.some(t => t.id === tab) ? tab : (tabs[0]?.id || 'overview');

  return (
    // bg-shell-panel, as the Characters table: one panel colour site-wide.
    <div className={`rounded-[10px] p-5 sm:p-6 border border-solid mb-6 ${
      darkMode ? 'bg-shell-panel border-gray-700' : 'bg-white border-gray-200'
    }`}>
      {/* The score and tier are the cut's. Its leaderboard rank is not: the
          leaderboard ranks characters, not builds or positions. A team keeps
          it: App ranks among that team's characters. */}
      <IdentityBlock {...props} character={viewRow} rank={buildCut || cuts.pos || formCut ? null : rank} hideScore={!!formCut} />

      {strips}

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
            allRow={posRow || character}
            builds={builds}
            selected={selected}
            onSelectBuild={code => setCut('build', code)}
            darkMode={darkMode}
            formView={formView}
          />
        )}
        {active === 'usage' && (
          <CharacterUsage character={viewRow} positionsRow={buildRow} teamsRow={teamBase} charMap={charMap}
            pos={cuts.pos} onPos={p => toggle('pos', p, cuts.pos)}
            team={team ? team.tag : null} onTeam={tag => toggle('for', teamByTagSlug(tag), team ? team.slug : null)} />
        )}
        {active === 'builds' && (
          <CharacterBuilds character={posRow || character} charMap={charMap} portraitId={portraitId}
            current={buildCut} onToggle={code => toggle('build', code, buildCut)} />
        )}
        {active === 'forms' && (
          <CharacterForms character={formBase || viewRow} selected={formCut} onPick={slug => toggle('form', slug, formCut)} />
        )}
        {active === 'matches' && (
          <CharacterMatches character={viewRow} linkFor={matchLinkFor} performancesLink={performancesLink} />
        )}
      </div>
    </div>
  );
}
