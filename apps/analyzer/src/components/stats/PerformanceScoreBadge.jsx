import React from 'react';
import { Star } from 'lucide-react';
import { tierForScore } from '../../utils/performanceTier.js';
import { tierPillColors, tierPillClass } from '../../utils/tierPlateSvg.js';

/**
 * The "Score: 105" pill. One implementation, used everywhere a score appears.
 *
 * The colour is ABSOLUTE - it comes from the score's tier, via the same palette
 * that draws the tier plate (tierPillColors), so a pill and a plate for the same
 * score can never disagree.
 *
 * It used to be RELATIVE: callers passed `allScores` and the colour came from
 * getPerformanceLevel, ranking this score against whatever else happened to be
 * on screen. That is the bug the tier system replaced. It meant the same
 * character scoring the same 64 was green in one panel and orange in another,
 * purely because of who they were listed beside - and a pill in a two-character
 * match was being graded against one opponent.
 *
 * **Do not reintroduce an `allScores` prop.** For "how does this stat compare to
 * what is on screen", PerformanceIndicator is the right component and its
 * relative comparison is still correct; a score pill is not that.
 */
export function PerformanceScoreBadge({ score, label = 'Score', size = 'medium', darkMode = false }) {
  const value = Number.isFinite(score) ? score : 0;
  const tier = tierForScore(value);

  const sizeClasses = {
    'extra-small': 'text-xs px-1.5 py-0.5',
    small: 'text-sm px-2 py-0',
    medium: 'text-base px-3 py-1.5',
    large: 'text-lg px-4 py-2',
  };

  const iconSize = size === 'extra-small' || size === 'small'
    ? 'w-3 h-3'
    : size === 'medium' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div
      // border-solid is explicit because Tailwind preflight is off in this app,
      // so a bare `border` utility draws nothing.
      className={`inline-flex items-center gap-1 rounded-lg border border-solid font-bold whitespace-nowrap ${sizeClasses[size] || sizeClasses.medium} ${tierPillClass(tier)}`}
      style={tierPillColors(tier, darkMode)}
      title={`Tier ${tier}`}
    >
      <Star className={iconSize} />
      <span>{label}: {Math.round(value)}</span>
    </div>
  );
}
