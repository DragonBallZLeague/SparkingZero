import React from 'react';
import {
  tierForScore,
  isProvisionalTier,
  tierMatchCount,
  TIER_LABELS,
  TIER_CUTOFFS,
  TIERS,
  PROVISIONAL_BELOW_MATCHES,
  tierBasisSummary,
} from '../utils/performanceTier.js';

/**
 * A character's performance tier.
 *
 * The tier is ABSOLUTE - derived from the frozen cutoffs in
 * config/performance-bands.json, never from the rows currently on screen. That is
 * the whole point: the previous badge re-ranked whatever was left after filtering,
 * so a character turned green when you hid a tier, without their score changing.
 *
 * Use this for "how good is this character". For "how does this stat compare to
 * the others on screen", PerformanceIndicator's relative comparison is still the
 * right question, and it now measures against a stable reference population.
 */

const TIER_COLORS = {
  Z: {
    dark: 'bg-green-900/40 text-green-300 border-green-500',
    light: 'bg-green-100 text-green-800 border-green-400',
  },
  A: {
    dark: 'bg-blue-900/40 text-blue-300 border-blue-500',
    light: 'bg-blue-100 text-blue-800 border-blue-400',
  },
  B: {
    dark: 'bg-yellow-900/40 text-yellow-300 border-yellow-500',
    light: 'bg-yellow-100 text-yellow-800 border-yellow-400',
  },
  C: {
    dark: 'bg-orange-900/40 text-orange-300 border-orange-500',
    light: 'bg-orange-100 text-orange-800 border-orange-400',
  },
  D: {
    dark: 'bg-red-900/40 text-red-300 border-red-500',
    light: 'bg-red-100 text-red-800 border-red-400',
  },
};

const SIZES = {
  small: 'text-xs px-2 py-0.5 gap-1.5',
  medium: 'text-sm px-2.5 py-1 gap-2',
};

export default function TierBadge({
  score,
  character = null,
  showScore = true,
  size = 'medium',
  darkMode = false,
}) {
  const tier = tierForScore(score);
  const colors = TIER_COLORS[tier] || TIER_COLORS.D;
  const colorClass = darkMode ? colors.dark : colors.light;
  const provisional = character ? isProvisionalTier(character) : false;
  const matches = character ? tierMatchCount(character) : null;

  const cutoff = TIER_CUTOFFS[tier];
  const title = [
    'Tier ' + tier + ' — ' + (TIER_LABELS[tier] || ''),
    cutoff !== undefined ? 'Score ' + cutoff + ' or above.' : 'Below the ' + TIERS[TIERS.length - 2] + ' cutoff.',
    provisional
      ? 'Provisional: only ' + matches + ' match' + (matches === 1 ? '' : 'es') +
        ', under the ' + PROVISIONAL_BELOW_MATCHES + ' needed for a settled tier.'
      : '',
    tierBasisSummary(),
  ].filter(Boolean).join(' ');

  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-full border font-semibold ${colorClass} ${SIZES[size] || SIZES.medium} ${
        provisional ? 'border-dashed opacity-80' : ''
      }`}
    >
      <span className="font-bold tracking-wide">{tier}</span>
      {showScore && Number.isFinite(score) && (
        <span className="font-normal opacity-90">{Math.round(score)}</span>
      )}
      {provisional && (
        <span
          className="font-normal opacity-75"
          aria-label={`Provisional, ${matches} matches`}
        >
          ?
        </span>
      )}
    </span>
  );
}

/**
 * Explains the scale. Without this the tiers are just colours with letters - the
 * previous design named the bands nowhere except the filter, which is why nobody
 * could tell what a colour meant.
 */
export function TierLegend({ darkMode = false, className = '' }) {
  return (
    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} ${className}`}>
      <div className="flex flex-wrap items-center gap-2 mb-1">
        {TIERS.map(tier => {
          const colors = TIER_COLORS[tier] || TIER_COLORS.D;
          const cutoff = TIER_CUTOFFS[tier];
          return (
            <span
              key={tier}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 ${
                darkMode ? colors.dark : colors.light
              }`}
            >
              <span className="font-bold">{tier}</span>
              <span className="font-normal opacity-90">
                {cutoff !== undefined ? `${cutoff}+` : 'rest'}
              </span>
            </span>
          );
        })}
      </div>
      <div>
        {tierBasisSummary()} A dashed badge marks a provisional tier —
        fewer than {PROVISIONAL_BELOW_MATCHES} matches.
      </div>
    </div>
  );
}
