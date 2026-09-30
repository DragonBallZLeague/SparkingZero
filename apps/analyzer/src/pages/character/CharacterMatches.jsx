import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Segmented from '../../shell/Segmented.jsx';
import ChipMenu from '../../shell/ChipMenu.jsx';
import StatTable from '../../shell/StatTable.jsx';
import { PAGE } from '../../shell/tableParts.jsx';
import { useIsPhone, useMediaQuery } from '../../shell/useMediaQuery.js';
import { usePickedColumns, pickerChip } from '../../shell/usePickedColumns.js';
import { performanceColumns } from '../matches/performanceColumns.jsx';
import {
  PERF_GROUPS, PERF_STATS, DEFAULT_PHONE_STATS, perfStatByKey, performanceRows, sortPerformances,
} from '../matches/performanceRows.js';

/** The same picks as the Performances view: one choice per viewer. */
const PHONE_COLS_KEY = 'szl.analyzer.performances.phoneCols';
/** Inside the page's padded panel, the full layout needs a wider screen than /matches does. */
const WIDE_QUERY = '(min-width: 1300px)';
const COMPACT_QUERY = '(max-width: 899px)';

/**
 * The Character page's Matches tab: the character's every match in scope, as
 * the Performances view of /matches draws them (matches/performanceColumns.jsx)
 * without the Character column: who it played for, the match, the result, the
 * match's score, then one group of figures at a time. It replaced a plain
 * "recent matches" table of the latest 12.
 *
 * The sort and the column group are this visit's only (the page's tab is not
 * in the URL either). `linkFor(row)` opens the Match page on the character's
 * row; `performancesLink` is the same matches in the Performances view, where
 * the other chips (position, result) and the rest of the scope are.
 *
 * `character` is the row the page shows, so a picked build (`?build=`) cuts
 * the list to that build's matches.
 */
export default function CharacterMatches({ character, linkFor = null, performancesLink = null }) {
  const isPhone = useIsPhone();
  const wide = useMediaQuery(WIDE_QUERY);
  const compact = useMediaQuery(COMPACT_QUERY);
  const layout = wide ? 'wide' : compact ? 'compact' : 'mid';
  const [picked, setPicked] = usePickedColumns(PHONE_COLS_KEY, DEFAULT_PHONE_STATS, perfStatByKey);
  const [pickerOpen, setPickerOpen] = useState(null);
  const [group, setGroupState] = useState('combat');
  const [{ sort, dir }, setSortState] = useState({ sort: 'match', dir: 'desc' });

  const pool = useMemo(() => performanceRows([character]), [character]);
  const rows = useMemo(() => sortPerformances(pool, { sort, dir }), [pool, sort, dir]);
  const [shown, setShown] = useState(PAGE);
  useEffect(() => { setShown(PAGE); }, [pool, sort, dir]);

  const setGroup = g => {
    setGroupState(g);
    const s = perfStatByKey(sort);
    if (s && s.group !== g) setSortState({ sort: 'match', dir: 'desc' });
  };
  const onSort = key => setSortState(cur => {
    const byDefault = key === 'name' ? 'asc' : 'desc';
    return { sort: key, dir: cur.sort === key ? (cur.dir === 'asc' ? 'desc' : 'asc') : byDefault };
  });

  if (!pool.length) return <p className="m-0 text-[14px] text-slate-400">No matches in this scope.</p>;

  const open = performancesLink && (
    <Link to={performancesLink} className="whitespace-nowrap text-[13px] font-semibold text-orange-400 no-underline hover:underline">
      Open in Performances ↗
    </Link>
  );

  return (
    <div>
      {/* The tab's own control row: the column switch (or a phone's two picks), the count and the way out. */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        {compact ? (
          <div className="flex items-center gap-1.5">
            {[0, 1].map(slot => (
              <ChipMenu key={slot} isPhone={isPhone} open={pickerOpen === slot} onOpenChange={o => setPickerOpen(o ? slot : null)}
                chip={pickerChip({ slot, cols: picked, stats: PERF_STATS, onPick: (i, v) => { setPicked(i, v); setPickerOpen(null); } })} />
            ))}
          </div>
        ) : (
          <Segmented label="Columns" value={group} onChange={setGroup}
            options={PERF_GROUPS.map(g => ({ value: g.id, label: g.label }))} />
        )}
        <div className="flex items-center gap-3">
          {!compact && (
            <span className="whitespace-nowrap text-[13px] text-slate-400">
              <b className="font-semibold text-white">{rows.length}</b> match{rows.length === 1 ? '' : 'es'}
            </span>
          )}
          {open}
        </div>
      </div>

      <StatTable columns={performanceColumns({ layout, group, picked, count: rows.length, withCharacter: false, multiTeam: new Set(pool.map(r => r.team)).size > 1 })}
        rows={rows} pool={pool} sort={sort} dir={dir} onSort={onSort} linkFor={linkFor}
        shown={shown} onMore={() => setShown(n => n + PAGE)} isPhone={compact} />
    </div>
  );
}
