import React from 'react';
import { tierForScore, TIER_LABELS } from '../utils/performanceTier.js';
import { tierPillColors, tierPillClass } from '../utils/tierPlateSvg.js';

/**
 * A score as a tier-coloured pill, to one decimal: how every table shows a
 * score (settled on the shell demo, 2026-09-28). A Z pill breathes
 * (tierPillClass). A thin sample - fewer than 5 matches - keeps its colour,
 * faded, the same treatment as a provisional tier plate.
 */
export default function TierScorePill({ score, provisional = false, className = '' }) {
  if (!Number.isFinite(score)) return <span className="text-slate-500">–</span>;
  const tier = tierForScore(score);
  return (
    <span
      title={`Tier ${tier}: ${TIER_LABELS[tier] || ''}${provisional ? ' (fewer than 5 matches)' : ''}`}
      className={`inline-flex h-[22px] items-center rounded-full border border-solid px-2 text-xs font-bold tabular-nums ${tierPillClass(tier)} ${className}`}
      style={{ ...tierPillColors(tier), ...(provisional ? { filter: 'saturate(.45)', opacity: 0.62 } : null) }}
    >
      {score.toFixed(1)}
    </span>
  );
}
