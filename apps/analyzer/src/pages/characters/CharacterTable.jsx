import React, { useMemo } from 'react';
import Portrait from '../../components/Portrait.jsx';
import TierPlate from '../../components/TierPlate.jsx';
import TierScorePill from '../../components/TierScorePill.jsx';
import { isProvisionalTier, fadesThinSamples } from '../../utils/performanceTier.js';
import StatTable from '../../shell/StatTable.jsx';
import { pickedWidth } from '../../shell/useMediaQuery.js';
import { CHAR_STATS, statByKey } from './characterRows.js';
import { STYLE_STATS } from './styleRows.js';
import StyleValue from './StyleValue.jsx';

/** The Styles view's columns: each style's figure over a bar for its place in this list (its league rank in the tooltip). */
const STYLE_COLUMNS = STYLE_STATS.map(s => ({ ...s, text: r => <StyleValue f={r.styles && r.styles[s.key]} stat={s} /> }));
const styleColumnByKey = key => STYLE_COLUMNS.find(s => s.key === key) || null;

/**
 * The character leaderboard as one table ("Visual direction", decision 4): a
 * row per character, right-aligned figures, a sticky header, and a click that
 * opens the character's page. It replaced 62 cards of five tiles each.
 *
 * Numbers are white. Each stat cell has a thin bar for its size in the column;
 * the bar turns green for the top fifth of the pool and red for the bottom
 * fifth, and stays grey between, so colour only marks what stands out. A thin
 * sample (under 5 matches) keeps its colours, faded.
 *
 * A desktop (`size` 'full') shows every column and the tier plate; a phone or
 * a tablet shows the score as a tier pill and the stats in `phoneStats` (two
 * on a phone, four on a tablet: shell/useMediaQuery.js useTableSize).
 *
 * `styles` draws the Styles view instead: the same rows (with their `styles`,
 * characters/styleRows.js) and each fighting style's figure for columns.
 *
 * `linkFor(name)` returning null makes the rows plain (nothing does today: in the Sandbox a row opens the Sandbox's own character page).
 *
 * Drawn by the one table template (shell/StatTable.jsx), whose look it was
 * the model for.
 */
export default function CharacterTable({
  rows, pool, sort, dir, onSort, size = 'full', phoneStats, idFor, linkFor, styles = false,
  // A searched table keeps each character's place in the whole sorted list.
  rankOf = null, empty = 'No characters.',
}) {
  const isPhone = size !== 'full'; // the phone layout, on a tablet too
  const [all, byKey] = styles ? [STYLE_COLUMNS, styleColumnByKey] : [CHAR_STATS, statByKey];
  const stats = isPhone ? phoneStats.map(byKey).filter(Boolean) : all;
  const fade = useMemo(() => fadesThinSamples(pool), [pool]);
  const prov = r => fade && isProvisionalTier(r);

  const columns = [
    ...(isPhone ? [] : [{
      key: '#', label: '#', width: '28px', sort: false,
      cell: (r, i) => <div className="text-right text-xs text-slate-500 tabular-nums">{rankOf ? rankOf(r) : i + 1}</div>,
    }]),
    {
      // A phone's header carries the count, in place of the control row's.
      key: 'name', label: 'Character', short: `${rows.length} characters`, align: 'left', sort: true,
      width: isPhone ? 'minmax(0,1fr)' : 'minmax(230px,2.2fr)',
      cell: r => (
        <div className="flex min-w-0 items-center gap-2.5">
          <Portrait id={idFor(r.name)} name={r.name} size={34} />
          <span className="font-semibold leading-[1.2] text-slate-50 text-[13px] sm:text-[14px]">{r.name}</span>
        </div>
      ),
    },
    ...(isPhone ? [] : [{
      key: 'tier', label: 'Tier', width: '40px', sort: false, title: 'A faded plate means fewer than 5 matches',
      cell: r => <div className="flex justify-end"><TierPlate score={r.combatPerformanceScore} character={r} fade={fade} size="small" /></div>,
    }]),
    {
      key: 'score', label: 'Score', width: isPhone ? '52px' : '66px', sort: true,
      cell: r => <div className="text-right"><TierScorePill score={r.combatPerformanceScore} provisional={prov(r)} /></div>,
    },
    ...stats.map((s, i) => ({ ...s, width: isPhone ? pickedWidth(size, i) : 'minmax(64px,1fr)' })),
  ];

  return (
    <StatTable columns={columns} rows={rows} pool={pool} rowKey={r => r.name} sort={sort} dir={dir} onSort={onSort}
      linkFor={r => linkFor(r.name)} faded={prov} isPhone={isPhone} empty={empty} />
  );
}
