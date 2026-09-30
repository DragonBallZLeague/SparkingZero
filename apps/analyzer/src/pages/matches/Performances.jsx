import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Segmented from '../../shell/Segmented.jsx';
import ChipMenu from '../../shell/ChipMenu.jsx';
import StatTable from '../../shell/StatTable.jsx';
import { PAGE, SearchBox } from '../../shell/tableParts.jsx';
import { useQueryUpdate } from '../../shell/useQueryUpdate.js';
import { useIsPhone, useMediaQuery } from '../../shell/useMediaQuery.js';
import { usePickedColumns, pickerChip } from '../../shell/usePickedColumns.js';
import { performanceColumns } from './performanceColumns.jsx';
import {
  PERF_GROUPS, PERF_STATS, DEFAULT_PHONE_STATS, perfStatByKey,
  readPerfGroup, readPerfSort, readPerfFilters, filterPerformances, performanceMatchesQuery, sortPerformances,
} from './performanceRows.js';

const PHONE_COLS_KEY = 'szl.analyzer.performances.phoneCols';
/** Where the table has room for the whole column group and a Match column of its own. */
const WIDE_QUERY = '(min-width: 1180px)';
/** Below this, two picked columns, as a phone has. */
const COMPACT_QUERY = '(max-width: 899px)';

/**
 * The Performances view of /matches (`view=performances`): one row per
 * character per match in scope, for power users. It replaced the old
 * 60-column DataTable with its own search, column filters, settings gear and
 * export, and takes the analyzer's one table look instead (shell/StatTable.jsx):
 *
 *   - Filters are the scope bar's: its scope, then this view's own chips
 *     (Character, Played for, Position, Result; performanceChips.jsx).
 *   - The control row holds the search and a Columns switch between groups
 *     of figures, the Match page detail's: Combat, Moves, Attack, Defense,
 *     Mechanics and Build, so the table stays one screen wide. Below 900px
 *     the switch gives way to two picked columns, as the Characters table
 *     has on a phone.
 *   - Everything but the search and how many rows are shown is in the URL.
 *   - A row opens the Match page with that character's row open.
 *
 * Colours compare each figure with the other performances the chips leave
 * (not the search, which only finds rows), so filtering to one character
 * shows its best and worst matches.
 *
 * `rows` are performanceRows() over the scope; `linkFor(row)` is its Match
 * page link; `viewSwitch` is the page's Matches | Performances switch.
 */
export default function Performances({ rows: all, linkFor, idFor, loading, viewSwitch }) {
  const [params] = useSearchParams();
  const update = useQueryUpdate();
  const isPhone = useIsPhone();
  const wide = useMediaQuery(WIDE_QUERY);
  const compact = useMediaQuery(COMPACT_QUERY);
  const [picked, setPicked] = usePickedColumns(PHONE_COLS_KEY, DEFAULT_PHONE_STATS, perfStatByKey);
  const [pickerOpen, setPickerOpen] = useState(null);

  const group = readPerfGroup(params);
  const { sort, dir } = readPerfSort(params);
  const filters = readPerfFilters(params);
  const filterKey = JSON.stringify(filters);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pool = useMemo(() => filterPerformances(all, filters), [all, filterKey]);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const hits = useMemo(() => (q ? pool.filter(r => performanceMatchesQuery(r, q)) : pool), [pool, q]);
  const rows = useMemo(() => sortPerformances(hits, { sort, dir }), [hits, sort, dir]);
  const [shown, setShown] = useState(PAGE);
  useEffect(() => { setShown(PAGE); }, [filterKey, q, sort, dir, all]);

  const setGroup = g => update(p => {
    if (g === 'combat') p.delete('cols'); else p.set('cols', g);
    // A sort on a column the new group does not show goes back to the default.
    const s = perfStatByKey(sort);
    if (s && s.group !== g) { p.delete('sort'); p.delete('dir'); }
  });
  const onSort = key => update(p => {
    const byDefault = key === 'name' ? 'asc' : 'desc';
    const next = sort === key ? (dir === 'asc' ? 'desc' : 'asc') : byDefault;
    if (key === 'match' && next === 'desc') { p.delete('sort'); p.delete('dir'); return; }
    p.set('sort', key);
    if (next === byDefault) p.delete('dir'); else p.set('dir', next);
  });

  if (!all.length) {
    return (
      <div>
        <div className="mb-3">{viewSwitch}</div>
        <div className="rounded-[10px] border border-solid border-gray-700 bg-shell-panel px-6 py-8 text-center text-slate-400">
          {loading ? 'Loading match data…' : 'No matches in this scope. Widen the filters above.'}
        </div>
      </div>
    );
  }

  const layout = wide ? 'wide' : compact ? 'compact' : 'mid';
  const count = (
    <span className="whitespace-nowrap text-[13px] text-slate-400">
      <b className="font-semibold text-white">{rows.length.toLocaleString('en-US')}</b> performance{rows.length === 1 ? '' : 's'}
    </span>
  );
  const search = (
    <SearchBox value={query} onChange={setQuery} placeholder="Search characters, teams, matches, maps"
      className={compact ? 'w-full' : 'w-[300px]'} />
  );

  return (
    <div>
      {/* The page's own control row: the view and column switches, the count and the search. */}
      {compact ? (
        <>
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-3">
            {viewSwitch}
            <div className="flex items-center gap-1.5">
              {[0, 1].map(slot => (
                <ChipMenu key={slot} isPhone={isPhone} open={pickerOpen === slot} onOpenChange={o => setPickerOpen(o ? slot : null)}
                  chip={pickerChip({ slot, cols: picked, stats: PERF_STATS, onPick: (i, v) => { setPicked(i, v); setPickerOpen(null); } })} />
              ))}
            </div>
          </div>
          <div className="mb-3">{search}</div>
        </>
      ) : (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {viewSwitch}
            <Segmented label="Columns" value={group} onChange={setGroup}
              options={PERF_GROUPS.map(g => ({ value: g.id, label: g.label }))} />
          </div>
          <div className="flex items-center gap-3">{count}{search}</div>
        </div>
      )}

      <StatTable columns={performanceColumns({ layout, group, picked, idFor, count: rows.length })}
        rows={rows} pool={pool} sort={sort} dir={dir} onSort={onSort} linkFor={linkFor}
        shown={shown} onMore={() => setShown(n => n + PAGE)} isPhone={compact}
        empty={q ? `No performance in this scope matches “${query.trim()}”.` : 'No performance matches these filters.'} />
    </div>
  );
}
