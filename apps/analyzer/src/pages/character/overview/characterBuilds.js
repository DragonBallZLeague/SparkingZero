import { filterAggregatedData } from '../../../utils/aggregation/filterAggregated.js';
import { buildKeyOf, buildCode } from '../../../utils/buildKey.js';
import { isProvisionalTier } from '../../../utils/performanceTier.js';

/**
 * One character's builds, most used first, for the Overview's build picker.
 *
 * A build is the leaderboard's definition (exact capsules + AI, utils/buildKey.js),
 * and each build's `row` is the leaderboard's own build filter applied to this
 * character - filterAggregatedData with that key - so a build's score and every
 * figure the Overview computes from its matches are what the leaderboard would
 * show for it. `code` is the short form used in `?build=`.
 */
export function characterBuilds(character, charMap = {}) {
  const groups = new Map();
  for (const m of character?.matches || []) {
    // A fusion partner the file left out has no build to file it under (utils/fusionSplit.js).
    if (m.unrecorded) continue;
    const key = buildKeyOf(m);
    const g = groups.get(key);
    if (g) g.count++;
    else groups.set(key, { key, first: m, count: 1 });
  }
  return [...groups.values()]
    // The key breaks ties so the order - and the "most common build" - is stable.
    .sort((a, b) => b.count - a.count || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .map(({ key, first, count }) => {
      const [row] = filterAggregatedData([character], {
        activeBuildFilters: { [character.name]: key },
        charMap,
      });
      return {
        key,
        code: buildCode(key),
        count,
        label: first.buildComposition?.label || 'No Build',
        cost: first.totalCapsuleCost || 0,
        aiName: first.aiStrategy || 'Default',
        capsules: (first.equippedCapsules || []).map(c => ({
          name: c.name,
          cost: c.capsule?.cost || 0,
          type: String(c.capsule?.buildType || '').toLowerCase(),
        })),
        score: row ? row.combatPerformanceScore : null,
        provisional: row ? isProvisionalTier(row) : true,
        row: row || null,
      };
    });
}
