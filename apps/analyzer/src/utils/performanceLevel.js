/**
 * Percentile-based performance banding, shared by the character tables, the
 * aggregated views and the leaderboard filter.
 *
 * Moved verbatim out of App.jsx in Phase 3 so utils/aggregation/filterAggregated.js
 * can use it without importing from a React component.
 *
 * Returns exactly one of: "excellent", "good", "average", "below-average",
 * "poor". Those strings are a contract - the badge switches and style maps in
 * App.jsx and the leaderboard performance filter all key off them, so renaming one
 * means updating every consumer. The filter UI used to store the fourth level as
 * "below", which matched nothing and silently dropped every below-average
 * character whenever any level was deselected; fixed 2026-09-26.
 */
/**
 * The five level names, best to worst. Exported so callers cannot drift from
 * what getPerformanceLevel() returns - they did once, and below-average
 * characters silently vanished from the table for it.
 */
export const PERFORMANCE_LEVELS = ['excellent', 'good', 'average', 'below-average', 'poor'];

export function getPerformanceLevel(value, allValues = []) {
  // Fallback simple thresholds when no distribution is provided
  if (!Array.isArray(allValues) || allValues.length === 0) {
    if (value >= 90) return 'excellent';
    if (value >= 75) return 'good';
    if (value >= 50) return 'average';
    if (value >= 25) return 'below-average';
    return 'poor';
  }

  // Create a sorted copy and compute percentile (higher is better)
  const sorted = [...allValues].slice().sort((a, b) => a - b);
  // If allValues are identical, avoid divide by zero and return average
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  if (max === min) return 'average';

  // Compute fraction of values less-or-equal to current value.
  // Higher fraction => better performance.
  const lessOrEqualCount = sorted.filter(v => v <= value).length;
  const frac = lessOrEqualCount / sorted.length;

  // percentile ranges: top 10% -> excellent, 70-90% -> good, 40-70% -> average,
  // 20-40% -> below-average, <20% -> poor
  if (frac >= 0.9) return 'excellent';
  if (frac >= 0.7) return 'good';
  if (frac >= 0.4) return 'average';
  if (frac >= 0.2) return 'below-average';
  return 'poor';
}
