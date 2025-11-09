/**
 * Capsule Synergy Calculator
 * 
 * Analyzes capsule combinations from match data to detect synergies,
 * calculate performance metrics, and identify effective pairings.
 * 
 * Created: November 5, 2025
 */

import { detectSynergyType } from './capsuleEffectParser.js';

/**
 * Calculate individual capsule performance from match data
 * @param {Array} aggregatedData - Character aggregated data from match files
 * @param {Object} capsuleMap - Map of capsule ID -> capsule data
 * @returns {Object} Capsule performance statistics
 */
export function calculateCapsulePerformance(aggregatedData, capsuleMap) {
  const capsuleStats = {};

  aggregatedData.forEach(character => {
    if (!character.matches || character.matches.length === 0) return;

    character.matches.forEach(match => {
      // Skip matches where character didn't participate (benched/reserve)
      if (!match.battleTime || match.battleTime === 0) return;
      
      if (!match.equippedCapsules || match.equippedCapsules.length === 0) return;

      match.equippedCapsules.forEach(equipped => {
        const capsuleId = equipped.id;
        if (!capsuleId) return;

        if (!capsuleStats[capsuleId]) {
          const capsuleData = capsuleMap[capsuleId] || {};
          capsuleStats[capsuleId] = {
            id: capsuleId,
            name: capsuleData.name || equipped.name || capsuleId,
            cost: capsuleData.cost || 0,
            primaryArchetype: capsuleData.primaryArchetype || 'utility',
            allTags: capsuleData.allTags || [],
            // Performance metrics
            usage: 0,
            totalMatches: 0,
            wins: 0,
            totalDamage: 0,
            totalDamageTaken: 0,
            characters: new Set(),
            teams: new Set(),
            aiStrategies: new Set()
          };
        }

        const stats = capsuleStats[capsuleId];
        stats.usage++;
        stats.totalMatches++;
        
        if (match.won) stats.wins++;
        stats.totalDamage += match.damageDone || 0;
        stats.totalDamageTaken += match.damageTaken || 0;
        
        stats.characters.add(character.name);
        if (match.team) stats.teams.add(match.team);
        if (match.aiStrategy) stats.aiStrategies.add(match.aiStrategy);
      });
    });
  });

  // Calculate performance metrics and composite scores
  const performanceMap = {};
  
  Object.entries(capsuleStats).forEach(([capsuleId, stat]) => {
    const avgDamageDealt = stat.totalMatches > 0 ? stat.totalDamage / stat.totalMatches : 0;
    const avgDamageTaken = stat.totalMatches > 0 ? stat.totalDamageTaken / stat.totalMatches : 0;
    // Use total-based efficiency calculation (aggregate then calculate)
    const damageEfficiency = stat.totalDamageTaken > 0 ? stat.totalDamage / stat.totalDamageTaken : 0;
    const winRate = stat.totalMatches > 0 ? (stat.wins / stat.totalMatches) * 100 : 0;
    
    // Calculate composite score (0-100 scale)
    // Base: 50, Win rate modifier, damage efficiency bonus
    let compositeScore = 50;
    compositeScore += (winRate - 50); // Win rate above/below 50% adds/subtracts
    compositeScore += (damageEfficiency - 1) * 20; // Efficiency above/below 1.0
    compositeScore = Math.max(0, Math.min(100, compositeScore)); // Clamp to 0-100
    
    performanceMap[capsuleId] = {
      id: capsuleId,
      name: stat.name,
      cost: stat.cost,
      primaryArchetype: stat.primaryArchetype,
      allTags: stat.allTags,
      // Appearance stats
      appearances: stat.usage,
      totalMatches: stat.totalMatches,
      // Win stats
      wins: stat.wins,
      winRate,
      // Damage stats
      avgDamageDealt,
      avgDamageTaken,
      damageEfficiency,
      // Composite score
      compositeScore,
      // Usage diversity
      characters: Array.from(stat.characters),
      characterCount: stat.characters.size,
      teams: Array.from(stat.teams),
      teamCount: stat.teams.size,
      aiStrategies: Array.from(stat.aiStrategies),
      aiStrategyCount: stat.aiStrategies.size
    };
  });

  return performanceMap;
}

/**
 * Calculate capsule pair synergies from match data
 * @param {Array} aggregatedData - Character aggregated data from match files
 * @param {Object} capsuleMap - Map of capsule ID -> capsule data
 * @returns {Object} Map of pair synergy statistics (keyed by "id1_id2")
 */
export function calculatePairSynergies(aggregatedData, capsuleMap) {
  const pairStats = {};

  aggregatedData.forEach(character => {
    if (!character.matches || character.matches.length === 0) return;

    character.matches.forEach(match => {
      // Skip matches where character didn't participate (benched/reserve)
      if (!match.battleTime || match.battleTime === 0) return;
      
      if (!match.equippedCapsules || match.equippedCapsules.length < 2) return;

      const capsules = match.equippedCapsules.map(eq => eq.id).filter(Boolean);
      
      // Generate all pairs
      for (let i = 0; i < capsules.length; i++) {
        for (let j = i + 1; j < capsules.length; j++) {
          const id1 = capsules[i];
          const id2 = capsules[j];
          
          // Create consistent pair ID with underscore separator (alphabetically sorted)
          const pairKey = [id1, id2].sort().join('_');

          if (!pairStats[pairKey]) {
            const cap1 = capsuleMap[id1] || {};
            const cap2 = capsuleMap[id2] || {};
            
            pairStats[pairKey] = {
              capsule1Id: id1,
              capsule2Id: id2,
              capsule1Name: cap1.name || id1,
              capsule2Name: cap2.name || id2,
              capsule1Archetype: cap1.archetype || 'Unknown',
              capsule2Archetype: cap2.archetype || 'Unknown',
              combinedCost: (cap1.cost || 0) + (cap2.cost || 0),
              synergyType: detectSynergyType(cap1, cap2),
              appearances: 0,
              wins: 0,
              totalDamage: 0,
              totalDamageTaken: 0,
              characters: new Set()
            };
          }

          const stats = pairStats[pairKey];
          stats.appearances++;
          if (match.won) stats.wins++;
          stats.totalDamage += match.damageDone || 0;
          stats.totalDamageTaken += match.damageTaken || 0;
          stats.characters.add(character.name);
        }
      }
    });
  });

  // Calculate performance metrics and return as map
  const pairMap = {};
  Object.entries(pairStats).forEach(([pairKey, stat]) => {
    const avgDamageDealt = stat.appearances > 0 ? stat.totalDamage / stat.appearances : 0;
    const avgDamageTaken = stat.appearances > 0 ? stat.totalDamageTaken / stat.appearances : 0;
    // Use total-based efficiency calculation (aggregate then calculate)
    const damageEfficiency = stat.totalDamageTaken > 0 ? stat.totalDamage / stat.totalDamageTaken : 0;
    const pairWinRate = stat.appearances > 0 ? (stat.wins / stat.appearances) * 100 : 0;
    
    pairMap[pairKey] = {
      capsule1Id: stat.capsule1Id,
      capsule2Id: stat.capsule2Id,
      capsule1Name: stat.capsule1Name,
      capsule2Name: stat.capsule2Name,
      capsule1Archetype: stat.capsule1Archetype,
      capsule2Archetype: stat.capsule2Archetype,
      combinedCost: stat.combinedCost,
      synergyType: stat.synergyType,
      appearances: stat.appearances,
      wins: stat.wins,
      pairWinRate,
      avgDamageDealt,
      avgDamageTaken,
      damageEfficiency,
      characters: Array.from(stat.characters),
      characterCount: stat.characters.size,
      // Synergy bonus will be calculated by enrichPairSynergies
      synergyBonus: 0
    };
  });

  return pairMap;
}

/**
 * Enrich pair synergies with bonus calculations
 * @param {Object} pairSynergies - Pair synergy map (keyed by "id1_id2")
 * @param {Object} capsulePerformance - Individual capsule performance map (keyed by capsule ID)
 * @returns {Object} Enriched pair synergies map with bonus calculations
 */
export function enrichPairSynergies(pairSynergies, capsulePerformance) {
  const enrichedPairs = {};

  Object.entries(pairSynergies).forEach(([pairKey, pair]) => {
    const cap1Perf = capsulePerformance[pair.capsule1Id];
    const cap2Perf = capsulePerformance[pair.capsule2Id];

    if (!cap1Perf || !cap2Perf) {
      enrichedPairs[pairKey] = { ...pair, synergyBonus: 0 };
      return;
    }

    // Calculate expected performance (average of individual capsule performance)
    const expectedWinRate = (cap1Perf.winRate + cap2Perf.winRate) / 2;
    const expectedDamage = (cap1Perf.avgDamageDealt + cap2Perf.avgDamageDealt) / 2;
    const expectedComposite = (cap1Perf.compositeScore + cap2Perf.compositeScore) / 2;

    // Calculate synergy bonus (actual - expected)
    const winRateBonus = pair.pairWinRate - expectedWinRate;
    const damageBonus = pair.avgDamageDealt - expectedDamage;
    
    // Overall synergy bonus is a weighted combination
    const synergyBonus = (winRateBonus * 0.4) + (damageBonus / 100 * 0.6);

    enrichedPairs[pairKey] = {
      ...pair,
      synergyBonus,
      expectedPerformance: {
        winRate: expectedWinRate,
        damage: expectedDamage,
        composite: expectedComposite
      }
    };
  });

  return enrichedPairs;
}

/**
 * Calculate AI strategy + capsule compatibility
 * @param {Array} aggregatedData - Character aggregated data
 * @param {Object} capsuleMap - Map of capsule ID -> capsule data
 * @returns {Object} AI strategy compatibility data
 */
export function calculateAIStrategyCapsuleCompatibility(aggregatedData, capsuleMap) {
  const strategyStats = {};

  aggregatedData.forEach(character => {
    if (!character.matches || character.matches.length === 0) return;

    character.matches.forEach(match => {
      // Skip matches where character didn't participate (benched/reserve)
      if (!match.battleTime || match.battleTime === 0) return;
      
      if (!match.aiStrategy || !match.equippedCapsules || match.equippedCapsules.length === 0) return;

      const strategy = match.aiStrategy;
      if (!strategyStats[strategy]) {
        strategyStats[strategy] = {
          strategyName: strategy,
          totalMatches: 0,
          wins: 0,
          capsuleUsage: {},
          archetypeUsage: { aggressive: 0, defensive: 0, technical: 0, utility: 0 }
        };
      }

      const stats = strategyStats[strategy];
      stats.totalMatches++;
      if (match.won) stats.wins++;

      match.equippedCapsules.forEach(equipped => {
        const capsuleId = equipped.id;
        if (!capsuleId) return;

        if (!stats.capsuleUsage[capsuleId]) {
          const capsuleData = capsuleMap[capsuleId] || {};
          stats.capsuleUsage[capsuleId] = {
            id: capsuleId,
            name: capsuleData.name || equipped.name || capsuleId,
            usage: 0,
            wins: 0,
            totalMatches: 0,
            totalDamage: 0,
            totalPerformanceScore: 0
          };
        }

        const capStats = stats.capsuleUsage[capsuleId];
        capStats.usage++;
        capStats.totalMatches++;
        if (match.won) capStats.wins++;
        capStats.totalDamage += match.damageDone || 0;
        capStats.totalPerformanceScore += calculateMatchPerformanceScore(match);

        // Track archetype usage
        const capsule = capsuleMap[capsuleId];
        if (capsule && capsule.primaryArchetype) {
          stats.archetypeUsage[capsule.primaryArchetype]++;
        }
      });
    });
  });

  // Process and format results - return map keyed by strategy name
  const compatibilityMap = {};
  
  Object.values(strategyStats).forEach(strategy => {
    // Convert capsuleUsage to a map with calculated metrics
    const capsuleCompatMap = {};
    Object.entries(strategy.capsuleUsage).forEach(([capsuleId, cap]) => {
      const winRate = cap.totalMatches > 0 ? (cap.wins / cap.totalMatches) * 100 : 0;
      const avgDamageDealt = cap.totalMatches > 0 ? Math.round(cap.totalDamage / cap.totalMatches) : 0;
      const avgPerformanceScore = cap.totalMatches > 0 ? Math.round((cap.totalPerformanceScore / cap.totalMatches) * 10) / 10 : 0;
      
      capsuleCompatMap[capsuleId] = {
        id: capsuleId,
        name: cap.name,
        appearances: cap.usage,
        wins: cap.wins,
        totalMatches: cap.totalMatches,
        winRate,
        avgDamageDealt,
        compositeScore: avgPerformanceScore
      };
    });
    
    const dominantArchetype = Object.entries(strategy.archetypeUsage)
      .filter(([arch]) => arch !== 'utility')
      .sort((a, b) => b[1] - a[1])[0];
    
    compatibilityMap[strategy.strategyName] = capsuleCompatMap;
  });
  
  return compatibilityMap;
}

/**
 * Helper function to calculate performance score for a match
 * @param {Object} match - Match data
 * @returns {Number} Performance score
 */
function calculateMatchPerformanceScore(match) {
  const avgDamage = match.damageDone || 0;
  const avgTaken = match.damageTaken || 1;
  const avgBattleTime = match.battleTime || 1;
  const healthRetention = match.hPGaugeValueMax > 0 ? match.hPGaugeValue / match.hPGaugeValueMax : 0;
  
  const damageEfficiency = avgTaken > 0 ? avgDamage / avgTaken : avgDamage / 1000;
  const damagePerSecond = avgBattleTime > 0 ? avgDamage / avgBattleTime : 0;
  
  const baseScore = (
    (avgDamage / 100000) * 35 +
    (damageEfficiency) * 25 +
    (damagePerSecond / 1000) * 25 +
    (healthRetention) * 15
  );
  
  return baseScore;
}

export default {
  calculateCapsulePerformance,
  calculatePairSynergies,
  enrichPairSynergies,
  calculateAIStrategyCapsuleCompatibility
};
