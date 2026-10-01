import React, { useId } from 'react';
import {
  tierForScore,
  isProvisionalTier,
  tierMatchCount,
  TIER_LABELS,
  PROVISIONAL_BELOW_MATCHES,
  tierBasisSummary,
} from '../utils/performanceTier.js';
import { tierPlateSvg, PLATE_SIZES, TIER_ART } from '../utils/tierPlateSvg.js';

/**
 * A character's performance tier, drawn as the Dragon Ball rank plate.
 *
 * The artwork lives in utils/tierPlateSvg.js as an SVG string so the throwaway
 * comparison page can render the same thing this does - see that file for the
 * design notes, including why the letter is stroked with paint-order rather than
 * CSS -webkit-text-stroke.
 *
 * The tier is ABSOLUTE, from the frozen cutoffs in config/performance-bands.json,
 * never from the rows currently on screen. Do not add a "compare against these
 * characters" prop; that was the bug this whole thing replaced.
 */
export default function TierPlate({
  score,
  tier: tierProp = null,
  character = null,
  size = 'medium',
  deselected = false,
  showTooltip = true,
  // false when the list around it has no settled rows (fadesThinSamples):
  // the plate is then drawn in full, and only its tooltip mentions the sample.
  fade = true,
  className = '',
}) {
  // SVG gradient ids are document-global, so each instance needs its own.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const tier = tierProp || tierForScore(score);
  const provisional = character ? isProvisionalTier(character) : false;
  const matches = character ? tierMatchCount(character) : null;

  const title = showTooltip
    ? [
        `Tier ${tier} — ${TIER_LABELS[tier] || ''}`,
        tierBasisSummary(),
        provisional
          ? `Provisional: ${matches} match${matches === 1 ? '' : 'es'}, fewer than the ${PROVISIONAL_BELOW_MATCHES} needed for a settled tier.`
          : '',
      ].filter(Boolean).join(' ')
    : undefined;

  const markup = tierPlateSvg(tier, { size, provisional: provisional && fade, deselected, idPrefix: uid });

  return (
    <span
      className={`inline-flex items-center shrink-0 ${className}`}
      title={title}
      // Static, self-generated markup: the tier comes from a fixed five-item
      // list and no caller-supplied string reaches the SVG.
      dangerouslySetInnerHTML={{
        __html: markup + `<span class="sr-only">Tier ${tier}${provisional ? ', provisional' : ''}</span>`,
      }}
    />
  );
}

export { PLATE_SIZES, TIER_ART };
