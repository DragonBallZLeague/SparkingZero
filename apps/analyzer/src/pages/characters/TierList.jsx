import React from 'react';
import { Link } from 'react-router-dom';
import Portrait from '../../components/Portrait.jsx';
import TierPlate from '../../components/TierPlate.jsx';
import { TIERS, TIER_LABELS } from '../../utils/tierScale.js';
import { tierForScore, isProvisionalTier, fadesThinSamples } from '../../utils/performanceTier.js';
import { tierPillColors } from '../../utils/tierPlateSvg.js';
import { tint } from '../../utils/overviewPalette.js';

/**
 * The tier list ("Visual direction", decision 9): a row per tier, Z to C, each
 * holding the portraits of the characters in it, best score first. It computes
 * nothing new - it groups the leaderboard's absolute tiers under the same
 * scope. It is the Characters page's second view and leads Home.
 *
 * Each row is tinted in its tier's colour (13% behind the plate, 5% behind the
 * portraits). The colour is the tier pill's ring, not the plate: Z and B share
 * a blue plate, and Z is told apart by its crimson.
 */
export default function TierList({ rows, isPhone, idFor, linkFor }) {
  const sorted = [...rows].sort((a, b) => (b.combatPerformanceScore || 0) - (a.combatPerformanceScore || 0));
  const fade = fadesThinSamples(rows);
  return (
    <div className="overflow-hidden rounded-[10px] border border-solid border-gray-700 bg-shell-panel">
      {TIERS.map(t => {
        const inTier = sorted.filter(r => tierForScore(r.combatPerformanceScore) === t);
        const ring = tierPillColors(t, true).borderColor;
        return (
          <div key={t} className={`border-0 border-b border-solid border-gray-700/50 last:border-b-0 ${isPhone ? '' : 'grid grid-cols-[128px_1fr]'}`}
            style={{ background: tint(ring, 0.05) }}>
            <div className={isPhone
              ? 'flex items-center gap-2 px-3 py-2'
              : 'flex flex-col items-center justify-center gap-1 border-0 border-r border-solid border-gray-700/50 px-2 py-3.5'}
              style={{ background: tint(ring, 0.13) }}>
              <TierPlate tier={t} size={isPhone ? 'small' : 'large'} showTooltip={false} />
              <span className="text-xs leading-[17px] font-semibold text-slate-300">{TIER_LABELS[t]}</span>
              <span className="text-[11px] leading-4 tabular-nums text-slate-500">{inTier.length}</span>
            </div>
            <div className={`flex flex-wrap content-start ${isPhone ? 'gap-0.5 px-1 pb-2.5 pt-1.5' : 'gap-1 p-2.5'}`}>
              {inTier.map(r => {
                const thin = isProvisionalTier(r);
                const prov = fade && thin;
                const to = linkFor(r.name);
                const Tile = to ? Link : 'div';
                return (
                  <Tile key={r.name} to={to || undefined}
                    title={`${r.name}: score ${(r.combatPerformanceScore || 0).toFixed(1)}${thin ? ', fewer than 5 matches' : ''}`}
                    className={`flex flex-col items-center gap-1 rounded-[8px] px-0.5 py-[5px] no-underline hover:bg-slate-400/[.08] ${isPhone ? 'w-[calc((100%-8px)/5)]' : 'w-[78px]'}`}>
                    <Portrait id={idFor(r.name)} name={r.name} size={isPhone ? 50 : 54} rounded={isPhone ? 9 : 10} dim={prov} />
                    <span className={`line-clamp-2 text-center leading-[1.2] ${isPhone ? 'text-[10.5px]' : 'text-[11px]'} ${prov ? 'text-slate-500' : 'text-slate-300'}`}>
                      {r.name}
                    </span>
                  </Tile>
                );
              })}
              {!inTier.length && <span className="p-2 text-xs text-slate-500">None</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
