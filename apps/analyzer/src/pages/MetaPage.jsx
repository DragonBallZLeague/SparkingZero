import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Segmented from '../shell/Segmented.jsx';
import { useQueryUpdate } from '../shell/useQueryUpdate.js';
import { useIsPhone, useMediaQuery } from '../shell/useMediaQuery.js';
import { PAGE } from '../shell/tableParts.jsx';
import AIStrategyAnalysis from '../components/ai-strategy/AIStrategyAnalysis.jsx';
import CapsuleSynergyAnalysis from '../components/CapsuleSynergyAnalysis.jsx';
import BuildsTable from './meta/BuildsTable.jsx';
import { META_TABS, readMetaTab, readBuildFilters, filterBuilds } from './meta/buildRows.js';

/** Where the capsule list moves from under a row to a side panel. */
const WIDE_QUERY = '(min-width: 1180px)';

/**
 * /meta: three tabs - Builds, AI strategies, Capsules ("Page-by-page review" in
 * the redesign plan).
 *
 * Builds is the league-wide build table, the most direct answer to "what should
 * I submit?". Its state is in the query string, so any view of it is a link:
 * `tab`, the chips' `uses` / `char` / `ai` / `cap` (App puts those in the scope
 * bar, see meta/buildChips.jsx), `group=best`, `sort` and `dir`. How many rows
 * are shown and which one is open are this visit's only.
 *
 * AI strategies and Capsules are the analyses the old Meta page stacked in two
 * collapsible boxes, each now behind its own tab. They are not rebuilt yet.
 *
 * `builds` is leagueBuilds() over the scope (App computes it once, since the
 * chips need it too). `buildLinkFor(build)` opens that build on its character's
 * page, or is null in the Sandbox.
 */
export default function MetaPage({
  builds, aggregated, charMap, idFor, buildLinkFor, defaultFloor, loading, darkMode = true,
}) {
  const [params] = useSearchParams();
  const update = useQueryUpdate();
  const isPhone = useIsPhone();
  const isWide = useMediaQuery(WIDE_QUERY);

  const tab = readMetaTab(params);
  const filters = readBuildFilters(params, defaultFloor);
  const filterKey = JSON.stringify(filters);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => filterBuilds(builds, filters), [builds, filterKey]);

  // A new filter, sort or grouping starts the list over, with nothing open.
  const [shown, setShown] = useState(PAGE);
  const [selected, setSelected] = useState(null);
  const [expanded, setExpanded] = useState(null);
  useEffect(() => { setShown(PAGE); setSelected(null); setExpanded(null); }, [filterKey, builds]);

  const setTab = id => update(p => { if (id === 'builds') p.delete('tab'); else p.set('tab', id); });
  const setGroup = g => update(p => { if (g === 'best') p.set('group', 'best'); else p.delete('group'); });
  const onSort = key => update(p => {
    const nextDir = filters.sort === key && filters.dir === 'desc' ? 'asc' : 'desc';
    if (key === 'score' && nextDir === 'desc') { p.delete('sort'); p.delete('dir'); return; }
    p.set('sort', key);
    if (nextDir === 'desc') p.delete('dir'); else p.set('dir', nextDir);
  });
  const onPick = useCallback(id => {
    if (isWide) setSelected(id);
    else setExpanded(cur => (cur === id ? null : id));
  }, [isWide]);

  const tabs = (
    <div role="tablist" className="flex gap-[18px]">
      {META_TABS.map(t => (
        <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
          className={`cursor-pointer border-0 border-b-2 border-solid bg-transparent px-0 pb-2 pt-1.5 text-[13px] leading-[1.45] font-semibold ${
            tab === t.id ? 'border-brand text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
          {t.label}
        </button>
      ))}
    </div>
  );
  const count = (
    <span className="text-[13px] text-slate-400">
      <b className="font-semibold text-white">{rows.length}</b> {filters.group === 'best'
        ? `character${rows.length === 1 ? '' : 's'}, best build each`
        : `build${rows.length === 1 ? '' : 's'}`}
    </span>
  );
  const group = (
    <Segmented label="Group" value={filters.group} onChange={setGroup}
      options={[{ value: 'best', label: 'Best per character' }, { value: 'all', label: 'All builds' }]} />
  );

  // A desktop puts the tabs, count and switch on one row; a phone stacks them.
  const head = (
    <>
      <div className="mb-3.5 flex items-center justify-between gap-3 border-0 border-b border-solid border-gray-700">
        {tabs}
        {tab === 'builds' && !isPhone && <div className="flex items-center gap-3.5 pb-1.5">{count}{group}</div>}
      </div>
      {tab === 'builds' && isPhone && <div className="mb-3 flex flex-wrap items-center justify-between gap-3">{count}{group}</div>}
    </>
  );

  const panel = 'rounded-[10px] border border-solid border-gray-700 bg-shell-panel';
  if (!aggregated || !aggregated.length) {
    return (
      <div className="text-[14px] leading-[1.45] text-slate-100">
        {head}
        <div className={`${panel} px-6 py-8 text-center text-slate-400`}>
          {loading ? 'Loading match data…' : 'No matches in this scope. Widen the filters above.'}
        </div>
      </div>
    );
  }

  // The demo's body type (14px, 1.45 line height), which the Builds table's
  // text inherits. Only here: the older AI strategy and Capsules analyses set
  // their own.
  return (
    <div>
      <div className="text-[14px] leading-[1.45] text-slate-100">
      {head}
      {tab === 'builds' && (
        <BuildsTable rows={rows} shown={shown} onMore={() => setShown(n => n + PAGE)}
          sort={filters.sort} dir={filters.dir} onSort={onSort}
          isPhone={isPhone} isWide={isWide} selected={selected} expanded={expanded} onPick={onPick}
          idFor={idFor} buildLinkFor={buildLinkFor} highlight={filters.caps} />
      )}
      </div>
      {tab === 'ai' && (
        <div className={`${panel} p-4 sm:p-6`}>
          <AIStrategyAnalysis aggregatedData={aggregated} charMap={charMap} darkMode={darkMode} />
        </div>
      )}
      {tab === 'capsules' && (
        <div className={`${panel} p-4 sm:p-6`}>
          <CapsuleSynergyAnalysis aggregatedData={aggregated} darkMode={darkMode} />
        </div>
      )}
    </div>
  );
}
