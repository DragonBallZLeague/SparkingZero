import React, { useEffect, useState } from 'react';
import TierScorePill from '../../components/TierScorePill.jsx';
import ChipMenu from '../../shell/ChipMenu.jsx';
import StatTable from '../../shell/StatTable.jsx';
import { PAGE } from '../../shell/tableParts.jsx';
import { NAV_H, SCOPE_H } from '../../shell/ScopeBar.jsx';
import { useIsPhone, useMediaQuery } from '../../shell/useMediaQuery.js';
import { usePickedColumns, pickerChip } from '../../shell/usePickedColumns.js';
import { isProvisionalTier, fadesThinSamples } from '../../utils/performanceTier.js';
import { CHAR_STATS, DEFAULT_PHONE_STATS, statByKey } from '../characters/characterRows.js';

/** The same picks as the Characters table: its columns, one choice per viewer. */
const PHONE_COLS_KEY = 'szl.analyzer.characters.phoneCols';
const COMPACT_QUERY = '(max-width: 899px)';
/** Room for all eight columns and the detail beside them; narrower, a row opens its detail under it. */
const WIDE_QUERY = '(min-width: 1400px)';

/**
 * A Meta tab whose rows pool matches across characters: a row per AI
 * strategy, or per capsule, each the leaderboard's own figures over the
 * matches pooled (filterAggregatedData), so the tab reads with the Characters
 * table's columns (CHAR_STATS, "Matches" as "Uses", win % last) and a tier
 * pill for the score. On the one table template (shell/StatTable.jsx), with
 * layout A's detail: beside the table from 1400px up (the first row until one
 * is picked), under the picked row when narrower. 25 rows, then "Show more".
 *
 *   rows        sorted; each has `id` and filterAggregatedData's fields
 *   nameLabel   the first column's header ('AI strategy')
 *   noun        plural, for a phone's header count ('strategies')
 *   nameCell    (row, compact) => the first column
 *   title       (row) => the detail's heading, beside the table
 *   detail      (row) => the detail's body
 *   controls    the control row's left side (a search), or null
 *   resetKey    changes when the filters do, clearing the picked row
 *   afterName   extra columns after the name, from 900px up (AI strategies' Data)
 *   fadeRow     (row) => true for a row to fade besides a thin sample's, or null
 *   stats       the stat columns (default the Characters table's, CHAR_STATS),
 *   phone       with { key, defaults, byKey } for a phone's two picked ones
 *   below       the detail always opens under its row, full width (AI
 *               strategies: its detail is too wide for a side panel)
 *   score       whether the Score column shows (Capsules has none: a
 *               capsule's pooled score is mostly its builds')
 */
export default function PooledTab({
  rows, sort, dir, onSort, nameLabel, noun, nameCell, title, detail, controls = null, resetKey = '', empty, footnote = null,
  afterName = [], fadeRow = null,
  stats: allStats = CHAR_STATS,
  phone = { key: PHONE_COLS_KEY, defaults: DEFAULT_PHONE_STATS, byKey: statByKey },
  below = false,
  score = true,
}) {
  const isPhone = useIsPhone();
  const compact = useMediaQuery(COMPACT_QUERY);
  const isWide = useMediaQuery(WIDE_QUERY) && !below;
  const [picked, setPicked] = usePickedColumns(phone.key, phone.defaults, phone.byKey);
  const [pickerOpen, setPickerOpen] = useState(null);
  const [selected, setSelected] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [shown, setShown] = useState(PAGE);
  useEffect(() => { setSelected(null); setExpanded(null); setShown(PAGE); }, [resetKey]);
  const onPick = r => (isWide ? setSelected(r.id) : setExpanded(cur => (cur === r.id ? null : r.id)));

  const fade = fadesThinSamples(rows);
  const stats = compact ? picked.map(phone.byKey).filter(Boolean) : allStats;
  const uses = s => (s.key === 'matches' ? { label: 'Uses', short: 'Uses' } : null);
  const columns = [
    {
      key: 'name', align: 'left', sort: true,
      label: compact ? `${rows.length} ${noun}` : nameLabel,
      width: compact ? 'minmax(0,1fr)' : 'minmax(180px,2fr)',
      cell: r => nameCell(r, compact),
    },
    ...(compact ? [] : afterName),
    ...(score ? [{
      key: 'score', label: 'Score', width: compact ? '56px' : '66px', sort: true,
      cell: r => <div className="flex justify-end"><TierScorePill score={r.combatPerformanceScore} provisional={fade && isProvisionalTier(r)} /></div>,
    }] : []),
    ...stats.map(s => ({ ...s, ...uses(s), width: compact ? '58px' : 'minmax(56px,1fr)' })),
  ];
  const sel = isWide ? (rows.find(r => r.id === selected) || rows[0] || null) : null;

  const table = (
    <StatTable columns={columns} rows={rows} sort={sort} dir={dir} onSort={onSort} onPick={onPick}
      faded={fade || fadeRow ? r => (fade && isProvisionalTier(r)) || !!(fadeRow && fadeRow(r)) : null} isPhone={compact} empty={empty} shown={shown} onMore={() => setShown(n => n + PAGE)}
      selected={sel ? sel.id : null} expanded={isWide ? null : expanded}
      renderExpanded={r => (below ? detail(r) : <div className="max-w-[520px]">{detail(r)}</div>)} />
  );

  return (
    <div>
      {(controls || compact) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className={compact ? 'w-full' : ''}>{controls}</div>
          {compact && (
            <div className="ml-auto flex gap-1.5">
              {[0, 1].map(slot => (
                <ChipMenu key={slot} isPhone={isPhone} open={pickerOpen === slot} onOpenChange={o => setPickerOpen(o ? slot : null)}
                  chip={pickerChip({ slot, cols: picked, stats: allStats, onPick: (i, v) => { setPicked(i, v); setPickerOpen(null); } })} />
              ))}
            </div>
          )}
        </div>
      )}
      {isWide && sel ? (
        <div className="grid grid-cols-[minmax(0,1fr)_330px] items-start gap-4">
          {table}
          {/* Its own scroll once the detail outgrows the screen: a sticky panel taller than the viewport hides its end. */}
          <div className="sticky self-start overflow-y-auto rounded-[10px] border border-solid border-gray-700 bg-shell-panel p-4"
            style={{ top: NAV_H + SCOPE_H + 16, maxHeight: `calc(100vh - ${NAV_H + SCOPE_H + 32}px)` }}>
            <div className="mb-3">{title(sel)}</div>
            {detail(sel)}
          </div>
        </div>
      ) : table}
      {footnote && <p className="mb-0 mt-2.5 text-xs text-slate-500">{footnote}</p>}
    </div>
  );
}

/** A detail's four headline figures. */
export function DetailFigures({ figures }) {
  return (
    <div className="mb-3 grid grid-cols-4 gap-2 border-0 border-b border-solid border-gray-700/50 pb-3">
      {figures.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-0.5">
          <span className="text-[11px] leading-[1.45] uppercase tracking-[.04em] text-slate-400">{label}</span>
          <b className="text-[15px] tabular-nums text-slate-100">{value}</b>
        </div>
      ))}
    </div>
  );
}

export const KICKER = 'text-[11px] font-semibold uppercase leading-4 tracking-[.05em] text-slate-400';
