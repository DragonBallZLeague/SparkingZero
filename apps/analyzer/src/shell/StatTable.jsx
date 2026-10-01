import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { NAV_H, SCOPE_H } from './ScopeBar.jsx';
import { HEAD, SortHead, StatCell, ShowMore } from './tableParts.jsx';
import { placements } from '../pages/characters/characterRows.js';

/**
 * THE list table: the one look every table in the analyzer takes, so a new
 * table is a list of columns rather than another hand-made grid. Every stat
 * table is built on it (since 2026-09-30 the Characters, Teams, Team page
 * Roster and Opponents and the Builds tables too, which drew it by hand and
 * were its model).
 *
 * What it draws, as "Visual direction" settled: one panel, a sticky header
 * under the scope bar, 46px rows split by hairlines, right-aligned figures,
 * sortable headers (orange while sorted, with the arrow), and a row that opens
 * something. A stat cell is the number, white, over a thin bar for its size
 * in the column, green for the top fifth of `pool` and red for the bottom
 * fifth, grey between. Long lists show `shown` rows and a "Show more" foot.
 *
 * `columns`, left to right:
 *   key            the sort key (what the URL's `sort` says) and React key
 *   label, short   the header, and a phone's shorter one
 *   width          its grid track ('64px', 'minmax(64px,1fr)')
 *   align          'right' (default) or 'left'
 *   sort           whether its header sorts (default: stat columns do)
 *   title          the header's tooltip
 *   A stat column gives `get(row)` (a number, or null for "does not have it",
 *   shown "–") with `fmt(value)` or `text(row)`, and `dir`: 1 when higher is
 *   better, -1 lower, 0 neither (no colour). `diverge: true` draws a signed
 *   figure's bar either way from a centre line (Meta's style shifts);
 *   `tint` gives a `dir: 0` column's bars a colour of its own (Meta
 *   Capsules' build types). `thin(row)` marks one cell's figure as resting
 *   on too little data of its own (faded, its number dimmed; Meta's
 *   Transform column), and `cellTitle(row)` is a cell's tooltip.
 *   Any other column gives `cell(row, index)`.
 *
 * `rows` are already filtered and sorted; `pool` is what the bars and colours
 * measure against (by default the rows; pass the unsearched list so a search
 * does not recolour the table). A row opens `linkFor(row)` when that gives a
 * path, else calls `onPick(row)` when given; `faded(row)` is a thin sample's
 * look, and `rowTitle(row)` a row's tooltip.
 *
 * For a table with a detail (Meta's layout A: the detail beside the table on a
 * wide screen, under its row when narrower), `selected` is the picked row's
 * key, drawn as the Builds table draws it, and `expanded` a row's key whose
 * `renderExpanded(row)` shows under it, on the darker `.surface-inset`.
 */
export default function StatTable({
  columns, rows, pool = rows, rowKey = r => r.id, sort = null, dir = 'desc', onSort = null,
  linkFor = null, onPick = null, faded = null, rowTitle = null, shown = Infinity, onMore = null,
  selected = null, expanded = null, renderExpanded = null,
  isPhone = false, empty = 'Nothing matches.', className = '',
}) {
  const stats = columns.filter(c => c.get);
  const statKey = stats.map(c => c.key).join(',');
  const place = useMemo(() => Object.fromEntries(stats.map(c => [c.key, placements(pool, c)])),
    // statKey is the stat columns' identity; the column objects are rebuilt each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pool, statKey]);
  const max = useMemo(() => Object.fromEntries(stats.map(c => {
    let m = 0;
    for (const r of pool) { const v = c.diverge ? Math.abs(c.get(r) || 0) : c.get(r); if (v > m) m = v; }
    return [c.key, m];
  })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [pool, statKey]);

  const grid = {
    display: 'grid',
    gridTemplateColumns: columns.map(c => c.width).join(' '),
    alignItems: 'center',
    columnGap: isPhone ? 8 : 12,
  };
  const list = rows.slice(0, shown);
  const pad = 'px-2.5 sm:px-3.5';

  const header = c => {
    const label = isPhone && c.short ? c.short : c.label;
    const left = c.align === 'left';
    const sortable = onSort && (c.sort !== undefined ? c.sort : !!c.get);
    if (sortable) return <SortHead key={c.key} label={label} on={sort === c.key} dir={dir} onClick={() => onSort(c.key)} left={left} title={c.title} />;
    return <div key={c.key} title={c.title} className={`${HEAD} text-slate-400 ${left ? '' : 'text-right'}`}>{label}</div>;
  };

  const cellOf = (c, r, i) => {
    if (!c.get) return <React.Fragment key={c.key}>{c.cell(r, i)}</React.Fragment>;
    const v = c.get(r);
    const text = c.text ? c.text(r) : v === null || v === undefined ? '–' : c.fmt(v);
    return <StatCell key={c.key} text={text} value={v || 0} max={max[c.key]} p={v === null || v === undefined ? null : place[c.key](v)}
      faded={!!(faded && faded(r))} diverge={!!c.diverge} tint={c.tint || null}
      thin={!!(c.thin && v !== null && v !== undefined && c.thin(r))} title={c.cellTitle ? c.cellTitle(r) : undefined} />;
  };

  return (
    <div className={`min-w-0 rounded-[10px] border border-solid border-gray-700 bg-shell-panel ${className}`}>
      <div className={`sticky z-10 min-h-[38px] rounded-t-[10px] border-0 border-b border-solid border-gray-700 bg-shell-panel ${pad}`}
        style={{ ...grid, top: NAV_H + SCOPE_H }}>
        {columns.map(header)}
      </div>

      {/* The last row loses its rule: the panel's edge, or "Show more", takes its place. */}
      <div className="[&>*:last-child]:border-b-0">
        {list.map((r, i) => {
          const key = rowKey(r);
          const to = linkFor ? linkFor(r) : null;
          const on = selected !== null && selected === key;
          const open = expanded !== null && expanded === key && renderExpanded;
          const rowClass = `min-h-[46px] ${pad} no-underline text-inherit border-0 border-b border-solid border-gray-700/50 ${
            on ? 'bg-brand/[.12] shadow-[inset_2px_0_0_#f97316]' : 'hover:bg-slate-400/5'}`;
          const cells = columns.map(c => cellOf(c, r, i));
          const title = rowTitle ? rowTitle(r) : undefined;
          let row;
          if (to) row = <Link to={to} title={title} style={grid} className={rowClass}>{cells}</Link>;
          else if (onPick) {
            row = (
              <div role="button" tabIndex={0} title={title} style={grid} className={`${rowClass} cursor-pointer`}
                aria-pressed={selected !== null ? on : undefined} aria-expanded={renderExpanded ? !!open : undefined}
                onClick={() => onPick(r)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(r); } }}>
                {cells}
              </div>
            );
          } else row = <div title={title} style={grid} className={rowClass}>{cells}</div>;
          if (!open) return <React.Fragment key={key}>{row}</React.Fragment>;
          return (
            <React.Fragment key={key}>
              {row}
              <div className={`surface-inset border-0 border-b border-solid border-gray-700/50 last:rounded-b-[10px] ${isPhone ? 'px-2.5 pb-3 pt-2.5' : 'px-3.5 pb-3.5 pt-3'}`}>
                {renderExpanded(r)}
              </div>
            </React.Fragment>
          );
        })}
        {!list.length && <div className="p-7 text-center text-slate-400">{empty}</div>}
      </div>

      {onMore && <ShowMore left={rows.length - list.length} onClick={onMore} />}
    </div>
  );
}

/** The "#" column: the row's place in the current sort. */
export const RANK_COLUMN = {
  key: '#', label: '#', width: '28px', sort: false,
  cell: (r, i) => <div className="text-right text-xs text-slate-500 tabular-nums">{i + 1}</div>,
};
