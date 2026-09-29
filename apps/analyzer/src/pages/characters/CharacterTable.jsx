import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Portrait from '../../components/Portrait.jsx';
import TierPlate from '../../components/TierPlate.jsx';
import TierScorePill from '../../components/TierScorePill.jsx';
import { isProvisionalTier, fadesThinSamples } from '../../utils/performanceTier.js';
import { NAV_H, SCOPE_H } from '../../shell/ScopeBar.jsx';
import { HEAD, SortHead, StatCell } from '../../shell/tableParts.jsx';
import { CHAR_STATS, statByKey, placements } from './characterRows.js';

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
 * A desktop shows every column and the tier plate; a phone shows the score as a
 * tier pill and the two stats in `phoneStats`.
 *
 * `linkFor(name)` returning null (the Sandbox) makes the rows plain.
 */
export default function CharacterTable({ rows, pool, sort, dir, onSort, isPhone, phoneStats, idFor, linkFor }) {
  const stats = isPhone ? phoneStats.map(statByKey).filter(Boolean) : CHAR_STATS;
  const place = useMemo(() => Object.fromEntries(CHAR_STATS.map(s => [s.key, placements(pool, s)])), [pool]);
  const max = useMemo(() => Object.fromEntries(CHAR_STATS.map(s => [s.key, Math.max(0, ...pool.map(s.get))])), [pool]);
  const fade = useMemo(() => fadesThinSamples(pool), [pool]);

  const cols = isPhone
    ? 'minmax(0,1fr) 52px 54px 58px'
    : `28px minmax(230px,2.2fr) 40px 66px repeat(${stats.length}, minmax(64px,1fr))`;
  const grid = { display: 'grid', gridTemplateColumns: cols, alignItems: 'center', columnGap: isPhone ? 8 : 12 };

  const head = (key, label, left = false) => (
    <SortHead label={label} on={sort === key} dir={dir} onClick={() => onSort(key)} left={left} />
  );

  return (
    <div className="rounded-[10px] border border-solid border-gray-700 bg-shell-panel">
      <div className="sticky z-10 rounded-t-[10px] border-0 border-b border-solid border-gray-700 bg-shell-panel px-2.5 sm:px-3.5 min-h-[38px]"
        style={{ ...grid, top: NAV_H + SCOPE_H }}>
        {!isPhone && <div className={`${HEAD} text-right text-slate-400`}>#</div>}
        {head('name', isPhone ? `${rows.length} characters` : 'Character', true)}
        {!isPhone && <div className={`${HEAD} text-right text-slate-400`} title="A faded plate means fewer than 5 matches">Tier</div>}
        {head('score', 'Score')}
        {stats.map(s => <React.Fragment key={s.key}>{head(s.key, isPhone ? s.short : s.label)}</React.Fragment>)}
      </div>
      {rows.map((r, i) => {
        const prov = fade && isProvisionalTier(r);
        const to = linkFor(r.name);
        const Row = to ? Link : 'div';
        return (
          <Row key={r.name} to={to || undefined} style={grid}
            className="min-h-[46px] px-2.5 sm:px-3.5 no-underline text-inherit border-0 border-b border-solid border-gray-700/50 last:border-b-0 hover:bg-slate-400/5">
            {!isPhone && <div className="text-right text-xs text-slate-500 tabular-nums">{i + 1}</div>}
            <div className="flex min-w-0 items-center gap-2.5">
              <Portrait id={idFor(r.name)} name={r.name} size={34} />
              <span className="font-semibold leading-[1.2] text-slate-50 text-[13px] sm:text-[14px]">{r.name}</span>
            </div>
            {!isPhone && <div className="flex justify-end"><TierPlate score={r.combatPerformanceScore} character={r} fade={fade} size="small" /></div>}
            <div className="text-right"><TierScorePill score={r.combatPerformanceScore} provisional={prov} /></div>
            {stats.map(s => {
              const v = s.get(r);
              return <StatCell key={s.key} text={s.fmt(v)} value={v} max={max[s.key]} p={place[s.key](v)} faded={prov} />;
            })}
          </Row>
        );
      })}
    </div>
  );
}
