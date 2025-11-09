/**
 * Build Recommendation Engine
 * 
 * Generates optimal capsule build recommendations based on:
 * - Individual capsule performance data
 * - Pair synergy scores
 * - AI strategy compatibility
 * - Archetype composition
 * - League build rules
 * 
 * Created: November 5, 2025
 */

import { BUILD_RULES, validateBuild } from '../config/buildRules.js';
import { analyzeBuildComposition, detectSynergyType } from './capsuleEffectParser.js';

/**
 * Score a complete build based on multiple factors
 * @param {Array} capsules - Array of capsule objects in the build
 * @param {Object} capsulePerformanceMap - Map of capsule ID to performance metrics
 * @param {Object} pairSynergyMap - Map of pair keys to synergy metrics
 * @param {Object} aiStrategyCompatibility - AI strategy compatibility data
 * @param {string|null} targetAIStrategy - Optional AI strategy to optimize for
 * @param {string|null} targetArchetype - Optional archetype to optimize for
 * @returns {Object} Score breakdown and total
 */
export function scoreBuild(
  capsules,
  capsulePerformanceMap = {},
  pairSynergyMap = {},
  aiStrategyCompatibility = {},
  targetAIStrategy = null,
  targetArchetype = null
) {
  const scoreBreakdown = {
    individualPerformance: 0,
    synergyBonus: 0,
    aiStrategyMatch: 0,
    archetypeAlignment: 0,
    costEfficiency: 0,
    totalScore: 0
  };

  if (!capsules || capsules.length === 0) {
    return scoreBreakdown;
  }

  // 1. Individual Performance Score (40% weight)
  let performanceSum = 0;
  let performanceCount = 0;
  capsules.forEach(capsule => {
    const perf = capsulePerformanceMap[capsule.id];
    if (perf && perf.compositeScore !== undefined) {
      performanceSum += perf.compositeScore;
      performanceCount++;
    }
  });
  const avgPerformance = performanceCount > 0 ? performanceSum / performanceCount : 0;
  scoreBreakdown.individualPerformance = avgPerformance * 0.4;

  // 2. Synergy Bonus (30% weight)
  let synergySum = 0;
  let synergyCount = 0;
  for (let i = 0; i < capsules.length; i++) {
    for (let j = i + 1; j < capsules.length; j++) {
      const pairKey = [capsules[i].id, capsules[j].id].sort().join('_');
      const synergy = pairSynergyMap[pairKey];
      if (synergy && synergy.synergyBonus !== undefined) {
        synergySum += synergy.synergyBonus;
        synergyCount++;
      }
    }
  }
  const avgSynergy = synergyCount > 0 ? synergySum / synergyCount : 0;
  scoreBreakdown.synergyBonus = Math.max(0, avgSynergy) * 0.3;

  // 3. AI Strategy Match (15% weight)
  if (targetAIStrategy && aiStrategyCompatibility[targetAIStrategy]) {
    let strategyMatchSum = 0;
    let strategyMatchCount = 0;
    capsules.forEach(capsule => {
      const strategyData = aiStrategyCompatibility[targetAIStrategy][capsule.id];
      if (strategyData && strategyData.compositeScore !== undefined) {
        strategyMatchSum += strategyData.compositeScore;
        strategyMatchCount++;
      }
    });
    const avgStrategyMatch = strategyMatchCount > 0 ? strategyMatchSum / strategyMatchCount : 0;
    scoreBreakdown.aiStrategyMatch = avgStrategyMatch * 0.15;
  }

  // 4. Archetype Alignment (10% weight)
  const composition = analyzeBuildComposition(capsules);
  if (targetArchetype && composition.primaryArchetype) {
    const alignment = composition.primaryArchetype === targetArchetype ? 100 : 0;
    scoreBreakdown.archetypeAlignment = alignment * 0.1;
  } else if (composition.primaryArchetype) {
    // Reward cohesive builds even without target
    const focusScore = composition.archetypeCounts[composition.primaryArchetype] / capsules.length * 100;
    scoreBreakdown.archetypeAlignment = focusScore * 0.1;
  }

  // 5. Cost Efficiency (5% weight)
  const totalCost = capsules.reduce((sum, cap) => sum + (cap.cost || 0), 0);
  const costUtilization = (totalCost / BUILD_RULES.maxCost) * 100;
  scoreBreakdown.costEfficiency = costUtilization * 0.05;

  // Calculate total
  scoreBreakdown.totalScore = 
    scoreBreakdown.individualPerformance +
    scoreBreakdown.synergyBonus +
    scoreBreakdown.aiStrategyMatch +
    scoreBreakdown.archetypeAlignment +
    scoreBreakdown.costEfficiency;

  return scoreBreakdown;
}

/**
 * Generate recommended builds using a greedy algorithm
 * @param {Array} availableCapsules - Pool of capsules to choose from
 * @param {Object} capsulePerformanceMap - Performance data for capsules
 * @param {Object} pairSynergyMap - Synergy data for pairs
 * @param {Object} options - Generation options
 * @returns {Array} Array of recommended builds with scores
 */
export function generateRecommendedBuilds(
  availableCapsules,
  capsulePerformanceMap,
  pairSynergyMap,
  options = {}
) {
  const {
    targetAIStrategy = null,
    targetArchetype = null,
    aiStrategyCompatibility = {},
    maxBuilds = 5,
    minCapsules = 3,
    preferHighSynergy = true
  } = options;

  const builds = [];
  const usedCombinations = new Set();

  // Sort capsules by performance for greedy selection
  const sortedCapsules = [...availableCapsules].sort((a, b) => {
    const perfA = capsulePerformanceMap[a.id]?.compositeScore || 0;
    const perfB = capsulePerformanceMap[b.id]?.compositeScore || 0;
    return perfB - perfA;
  });

  // Generate builds
  let attempts = 0;
  const maxAttempts = maxBuilds * 10; // Prevent infinite loops

  while (builds.length < maxBuilds && attempts < maxAttempts) {
    attempts++;
    
    const build = generateSingleBuild(
      sortedCapsules,
      capsulePerformanceMap,
      pairSynergyMap,
      {
        targetAIStrategy,
        targetArchetype,
        aiStrategyCompatibility,
        minCapsules,
        preferHighSynergy,
        usedCombinations
      }
    );

    if (build) {
      const buildKey = build.capsules.map(c => c.id).sort().join('_');
      if (!usedCombinations.has(buildKey)) {
        usedCombinations.add(buildKey);
        builds.push(build);
      }
    } else {
      break; // No more valid builds can be generated
    }
  }

  // Sort builds by total score
  builds.sort((a, b) => b.scoreBreakdown.totalScore - a.scoreBreakdown.totalScore);

  return builds;
}

/**
 * Generate a single build using greedy algorithm with randomization
 * @param {Array} capsulePool - Available capsules
 * @param {Object} capsulePerformanceMap - Performance data
 * @param {Object} pairSynergyMap - Synergy data
 * @param {Object} options - Build options
 * @returns {Object|null} Build object or null if no valid build
 */
function generateSingleBuild(
  capsulePool,
  capsulePerformanceMap,
  pairSynergyMap,
  options
) {
  const {
    targetAIStrategy,
    targetArchetype,
    aiStrategyCompatibility,
    minCapsules,
    preferHighSynergy,
    usedCombinations
  } = options;

  const build = [];
  let totalCost = 0;
  const remainingPool = [...capsulePool];

  // Shuffle for variety
  for (let i = remainingPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remainingPool[i], remainingPool[j]] = [remainingPool[j], remainingPool[i]];
  }

  // Greedy selection
  while (build.length < BUILD_RULES.maxCapsules && remainingPool.length > 0) {
    let bestCapsule = null;
    let bestScore = -Infinity;

    for (const capsule of remainingPool) {
      // Check if adding this capsule would violate rules
      if (totalCost + capsule.cost > BUILD_RULES.maxCost) {
        continue;
      }

      // Score this capsule addition
      let score = capsulePerformanceMap[capsule.id]?.compositeScore || 0;

      // Bonus for synergy with existing capsules
      if (preferHighSynergy && build.length > 0) {
        let synergyBonus = 0;
        for (const existing of build) {
          const pairKey = [capsule.id, existing.id].sort().join('_');
          const synergy = pairSynergyMap[pairKey];
          if (synergy) {
            synergyBonus += synergy.synergyBonus || 0;
          }
        }
        score += synergyBonus * 0.5;
      }

      // Bonus for AI strategy match
      if (targetAIStrategy && aiStrategyCompatibility[targetAIStrategy]) {
        const strategyData = aiStrategyCompatibility[targetAIStrategy][capsule.id];
        if (strategyData) {
          score += (strategyData.compositeScore || 0) * 0.3;
        }
      }

      // Bonus for archetype match
      if (targetArchetype && capsule.archetype === targetArchetype) {
        score += 10;
      }

      if (score > bestScore) {
        bestScore = score;
        bestCapsule = capsule;
      }
    }

    if (!bestCapsule) {
      break;
    }

    build.push(bestCapsule);
    totalCost += bestCapsule.cost;
    remainingPool.splice(remainingPool.indexOf(bestCapsule), 1);
  }

  // Validate build
  if (build.length < minCapsules) {
    return null;
  }

  const validation = validateBuild(build);
  if (!validation.isValid) {
    return null;
  }

  // Score the build
  const scoreBreakdown = scoreBuild(
    build,
    capsulePerformanceMap,
    pairSynergyMap,
    aiStrategyCompatibility,
    targetAIStrategy,
    targetArchetype
  );

  const composition = analyzeBuildComposition(build);

  return {
    capsules: build,
    totalCost,
    scoreBreakdown,
    composition,
    validation
  };
}

/**
 * Find optimal pairs for a given archetype or strategy
 * @param {Object} pairSynergyMap - Map of pair keys to synergy data
 * @param {Object} capsuleMap - Map of capsule IDs to capsule objects
 * @param {Object} options - Filter options
 * @returns {Array} Top synergy pairs sorted by bonus
 */
export function findOptimalPairs(pairSynergyMap, capsuleMap, options = {}) {
  const {
    targetArchetype = null,
    targetSynergyType = null,
    targetAIStrategy = null,
    minAppearances = 3,
    topN = 20
  } = options;

  const pairs = [];

  for (const [pairKey, synergyData] of Object.entries(pairSynergyMap)) {
    if (synergyData.appearances < minAppearances) {
      continue;
    }

    const [id1, id2] = pairKey.split('_');
    const capsule1 = capsuleMap[id1];
    const capsule2 = capsuleMap[id2];

    if (!capsule1 || !capsule2) {
      continue;
    }

    // Apply filters
    if (targetArchetype) {
      const hasArchetype = 
        capsule1.archetype === targetArchetype || 
        capsule2.archetype === targetArchetype;
      if (!hasArchetype) {
        continue;
      }
    }

    if (targetSynergyType && synergyData.synergyType !== targetSynergyType) {
      continue;
    }

    pairs.push({
      capsule1,
      capsule2,
      synergyData,
      combinedCost: capsule1.cost + capsule2.cost
    });
  }

  // Sort by synergy bonus
  pairs.sort((a, b) => (b.synergyData.synergyBonus || 0) - (a.synergyData.synergyBonus || 0));

  return pairs.slice(0, topN);
}

/**
 * Suggest capsule additions to improve an existing build
 * @param {Array} currentBuild - Current capsules in build
 * @param {Array} availableCapsules - Pool of capsules to add from
 * @param {Object} pairSynergyMap - Synergy data
 * @param {Object} capsulePerformanceMap - Performance data
 * @returns {Array} Suggested capsule additions with impact scores
 */
export function suggestBuildImprovements(
  currentBuild,
  availableCapsules,
  pairSynergyMap,
  capsulePerformanceMap
) {
  const suggestions = [];
  const currentCost = currentBuild.reduce((sum, cap) => sum + cap.cost, 0);
  const currentIds = new Set(currentBuild.map(c => c.id));

  for (const capsule of availableCapsules) {
    // Skip if already in build
    if (currentIds.has(capsule.id)) {
      continue;
    }

    // Skip if would violate cost
    if (currentCost + capsule.cost > BUILD_RULES.maxCost) {
      continue;
    }

    // Skip if would violate capsule limit
    if (currentBuild.length >= BUILD_RULES.maxCapsules) {
      continue;
    }

    // Calculate impact of adding this capsule
    let impactScore = capsulePerformanceMap[capsule.id]?.compositeScore || 0;
    let synergyCount = 0;
    let totalSynergy = 0;

    for (const existing of currentBuild) {
      const pairKey = [capsule.id, existing.id].sort().join('_');
      const synergy = pairSynergyMap[pairKey];
      if (synergy && synergy.synergyBonus !== undefined) {
        totalSynergy += synergy.synergyBonus;
        synergyCount++;
      }
    }

    const avgSynergy = synergyCount > 0 ? totalSynergy / synergyCount : 0;
    impactScore += avgSynergy * 0.5;

    suggestions.push({
      capsule,
      impactScore,
      synergyCount,
      avgSynergyBonus: avgSynergy,
      newTotalCost: currentCost + capsule.cost
    });
  }

  // Sort by impact score
  suggestions.sort((a, b) => b.impactScore - a.impactScore);

  return suggestions;
}
