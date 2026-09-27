// Shared stat primitives, lifted out of App.jsx so every page draws a stat
// the same way. Before this they were local to App.jsx and unreachable, so a
// new page had no choice but to reinvent them - which is exactly how the
// first Character page ended up visually inconsistent with the leaderboard.
export { StatBar } from './StatBar.jsx';
export { PerformanceIndicator, PerformanceIndicatorLabel } from './PerformanceIndicator.jsx';
export { PerformanceScoreBadge } from './PerformanceScoreBadge.jsx';
export { StatGroup } from './StatGroup.jsx';
export { MetricDisplay, BlastMetricDisplay } from './MetricDisplay.jsx';
export { BattleTimeVariance } from './BattleTimeVariance.jsx';
