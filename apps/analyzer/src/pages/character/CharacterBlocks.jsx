import React from 'react';
import { ArrowLeft } from 'lucide-react';
import TierPlate from '../../components/TierPlate.jsx';
import Portrait from '../../components/Portrait.jsx';
import HeaderFigure from '../../components/HeaderFigure.jsx';
import { useIsPhone } from '../../shell/useMediaQuery.js';
import ShareButton from '../../components/ShareButton.jsx';
import {
  tierForScore, isProvisionalTier, tierMatchCount, PROVISIONAL_BELOW_MATCHES,
} from '../../utils/performanceTier.js';
import { tierPillColors, tierPillClass } from '../../utils/tierPlateSvg.js';

/**
 * The Character page's header, above its tabs: portrait, name, and Tier,
 * Score, Rank and Matches as label-over-value figures, with Share and the
 * back button.
 *
 * This file held every block of the page's first layout. The tabs' blocks
 * moved onto the one table template (2026-09-29): Usage, Builds, Forms and
 * Matches are CharacterUsage, CharacterBuilds, CharacterForms and
 * CharacterMatches beside it.
 *
 * Everything here is presentational - each number already exists on the
 * aggregated row that characterAggregation.js produced. A wrong figure is an
 * upstream bug, not a bug here.
 */

export const nf = (n, digits = 0) =>
  (n === null || n === undefined || Number.isNaN(n)) ? '—' : Number(n).toLocaleString(undefined, {
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  });

export function IdentityBlock({
  character, rank, totalInScope, scopeLabel, onBack, backLabel = null, portraitId = null, compact = false,
  // No figures: the page's cuts leave no match, so there are none to show.
  hideFigures = false,
  // No Tier or Score: one form picked, whose slice of a match is not scored.
  hideScore = false,
  shareable = true,
}) {
  const isPhone = useIsPhone();
  const matches = character.activeMatchCount || character.matchCount || 0;
  const tier = tierForScore(character.combatPerformanceScore);
  const provisional = isProvisionalTier(character);
  const tierMatches = tierMatchCount(character);

  const score = Math.round(character.combatPerformanceScore);
  const name = (
    <h1 className={`m-0 min-w-0 ${compact ? 'text-xl' : 'text-2xl sm:text-3xl'} font-bold leading-tight break-words text-white`}>
      {character.name}
    </h1>
  );
  // Tier, score, rank and matches as four equal figures, each a small label
  // over its value, as the Overview tiles below have them. The score keeps its
  // tier pill (Z's breathes). Each label is centred over its value (the
  // league, 2026-09-30), so the widest of the two starts flush with the name.
  const figures = (
    <div className={isPhone ? 'mt-3 grid grid-cols-4 gap-2' : 'mt-1.5 flex flex-wrap items-end gap-x-6 gap-y-2'}>
      {!hideScore && (
        <HeaderFigure center label="Tier">
          <TierPlate score={character.combatPerformanceScore} character={character} size="small" />
        </HeaderFigure>
      )}
      {!hideScore && (
        <HeaderFigure center label="Score">
          <span className={`inline-flex h-[26px] items-center rounded-full border border-solid px-2.5 text-base font-bold ${tierPillClass(tier)}`}
            style={tierPillColors(tier)}>
            {score}
          </span>
        </HeaderFigure>
      )}
      {rank != null && (
        <HeaderFigure center label="Rank" title="Position on the leaderboard as currently filtered. Unlike the tier, this moves with the filters.">
          #{rank}
          {totalInScope ? <span className={`ml-1 font-medium text-slate-500 ${isPhone ? 'text-xs' : 'text-sm'}`}>/ {totalInScope}</span> : null}
        </HeaderFigure>
      )}
      <HeaderFigure center label="Matches">{nf(matches)}</HeaderFigure>
    </div>
  );

  return (
    <div>
      <div className={`flex flex-wrap items-start justify-between gap-3 ${compact ? '' : 'mb-2'}`}>
        {/* The portrait leads, as the logo does on a Team page. On a phone the
            name shares its row and the figures run under both, full width. */}
        {isPhone ? (
          <div className="min-w-0 w-full">
            <div className="flex items-center gap-3.5">
              <Portrait id={portraitId} name={character.name} size={56} rounded={12} />
              {name}
            </div>
            {!hideFigures && figures}
          </div>
        ) : (
          <div className="flex items-center gap-4 min-w-0">
            <Portrait id={portraitId} name={character.name} size={compact ? 56 : 80} rounded={12} />
            <div className="min-w-0">{name}{!hideFigures && figures}</div>
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          {shareable && <ShareButton />}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 h-8 px-[11px] rounded-[8px] border border-solid text-[13px] font-medium whitespace-nowrap cursor-pointer bg-transparent border-gray-700 text-slate-200 hover:border-slate-400/[.35]"
            >
              <ArrowLeft className="w-4 h-4" />
              {backLabel || 'All characters'}
            </button>
          )}
        </div>
      </div>

      {provisional && !hideScore && (
        <p className="text-xs mt-1 text-amber-300">
          Provisional tier — {tierMatches} match{tierMatches === 1 ? '' : 'es'} on record, fewer than
          the {PROVISIONAL_BELOW_MATCHES} needed for a settled tier.
        </p>
      )}

      {/* Whoever opened this from a pasted link never chose the filters, and
          would otherwise read these numbers as covering everything. */}
      {scopeLabel && (
        <p className="text-xs mt-2 text-slate-500">
          From <span className="font-semibold">{scopeLabel}</span>
        </p>
      )}
    </div>
  );
}
