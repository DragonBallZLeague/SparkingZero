/**
 * AI Strategy Effectiveness Calculator
 * 
 * Analyzes AI strategy performance across all matches, calculating:
 * - Win rates and combat performance
 * - Behavioral patterns (offense, defense, tactics)
 * - Character compatibility and synergies
 * - Build type preferences
 * - Data quality metrics
 */

/**
 * Categorize AI strategy by type
 */
export function categorizeAIStrategy(aiName) {
  if (!aiName || aiName === 'Unknown' || aiName === 'Com' || aiName === 'Player' || aiName === 'Default') {
    return 'Other';
  }
  
  const nameLower = aiName.toLowerCase();
  if (nameLower.includes('attack strategy')) {
    return 'Attack';
  }
  if (nameLower.includes('defense strategy')) {
    return 'Defense';
  }
  if (nameLower.includes('balanced strategy')) {
    return 'Balanced';
  }
  
  return 'Other';
}

/**
 * Calculate data quality metrics
 * Uses statistical coverage model with ~200 possible characters
 */
function calculateDataQuality(totalMatches, uniqueCharacters) {
  const MAX_POSSIBLE_CHARS = 200;
  
  // Statistical Coverage Diversity Score (Option 3)
  // Compares actual coverage to statistically expected coverage
  // Formula: (uniqueChars / maxChars) / sqrt(totalMatches / maxChars)
  const coverageRatio = uniqueCharacters / MAX_POSSIBLE_CHARS;
  const sampleRatio = Math.min(totalMatches / MAX_POSSIBLE_CHARS, 1.0);
  const diversityScore = sampleRatio > 0 
    ? Math.min(1.0, coverageRatio / Math.sqrt(sampleRatio))
    : 0;
  
  // Rigorous confidence calculation based on BOTH sample size AND diversity
  let confidence = 'Low';
  
  // High confidence: Requires BOTH strong sample size AND strong diversity
  // OR exceptional performance (75+ matches AND 40%+ diversity, OR 90%+ diversity regardless)
  if ((totalMatches >= 75 && diversityScore >= 0.40) || 
      (totalMatches >= 50 && diversityScore >= 0.55) ||
      diversityScore >= 0.90) {
    confidence = 'High';
  }
  // Medium confidence: Requires decent performance in both dimensions
  // Not just quantity or quality alone
  else if ((totalMatches >= 30 && diversityScore >= 0.35) || 
           (totalMatches >= 20 && diversityScore >= 0.50)) {
    confidence = 'Medium';
  }
  // Low confidence: Everything else (including high matches with poor diversity,
  // or high diversity with insufficient sample size)
  
  return {
    sampleSize: totalMatches,
    confidence,
    characterDiversity: uniqueCharacters,
    diversityScore: Math.round(diversityScore * 100) / 100
  };
}

/**
 * Calculate normalized scores for behavioral comparison
 * Normalizes raw stats to 0-100 scale based on min/max across all AIs
 */
function calculateNormalizedScores(rawStats, globalStats) {
  const normalize = (value, min, max) => {
    if (max === min) return 50; // If no variation, return middle
    return Math.round(((value - min) / (max - min)) * 100);
  };
  
  return {
    offense: normalize(
      rawStats.avgDamageDealt + (rawStats.avgS2Blast * 1000) + (rawStats.avgUltBlast * 2000),
      globalStats.offenseMin,
      globalStats.offenseMax
    ),
    defense: normalize(
      (rawStats.avgGuards * 100) + (rawStats.avgZCounters * 300) + (rawStats.avgSuperCounters * 200) - (rawStats.avgDamageTakenPerSecond * 50),
      globalStats.defenseMin,
      globalStats.defenseMax
    ),
    aggression: normalize(
      (rawStats.avgDragonDashDistance / 100) + (rawStats.avgThrows * 500) + (rawStats.avgVanishingAttacks * 300),
      globalStats.aggressionMin,
      globalStats.aggressionMax
    ),
    zoning: normalize(
      (rawStats.avgEnergyBlasts * 100) + (rawStats.avgS1Blast * 200),
      globalStats.zoningMin,
      globalStats.zoningMax
    ),
    resourceManagement: normalize(
      (rawStats.avgCharges * 100) + (rawStats.avgSparkingCount * 500),
      globalStats.resourceMin,
      globalStats.resourceMax
    ),
    comboFocus: normalize(
      (rawStats.avgMaxCombo * 100) + (rawStats.avgDamageDealt * 0.01),
      globalStats.comboMin,
      globalStats.comboMax
    )
  };
}

/**
 * Calculate global min/max for normalization
 */
function calculateGlobalStats(aiStrategiesRaw) {
  const values = Object.values(aiStrategiesRaw).filter(ai => ai.totalMatches > 0);
  
  if (values.length === 0) {
    return {
      offenseMin: 0, offenseMax: 100,
      defenseMin: 0, defenseMax: 100,
      aggressionMin: 0, aggressionMax: 100,
      zoningMin: 0, zoningMax: 100,
      resourceMin: 0, resourceMax: 100,
      comboMin: 0, comboMax: 100
    };
  }
  
  const offenseValues = values.map(ai => 
    ai.avgDamageDealt + (ai.avgS2Blast * 1000) + (ai.avgUltBlast * 2000)
  );
  const defenseValues = values.map(ai =>
    (ai.avgGuards * 100) + (ai.avgZCounters * 300) + (ai.avgSuperCounters * 200) - (ai.avgDamageTakenPerSecond * 50)
  );
  const aggressionValues = values.map(ai =>
    (ai.avgDragonDashDistance / 100) + (ai.avgThrows * 500) + (ai.avgVanishingAttacks * 300)
  );
  const zoningValues = values.map(ai =>
    (ai.avgEnergyBlasts * 100) + (ai.avgS1Blast * 200)
  );
  const resourceValues = values.map(ai =>
    (ai.avgCharges * 100) + (ai.avgSparkingCount * 500)
  );
  const comboValues = values.map(ai =>
    (ai.avgMaxCombo * 100) + (ai.avgDamageDealt * 0.01)
  );
  
  return {
    offenseMin: Math.min(...offenseValues),
    offenseMax: Math.max(...offenseValues),
    defenseMin: Math.min(...defenseValues),
    defenseMax: Math.max(...defenseValues),
    aggressionMin: Math.min(...aggressionValues),
    aggressionMax: Math.max(...aggressionValues),
    zoningMin: Math.min(...zoningValues),
    zoningMax: Math.max(...zoningValues),
    resourceMin: Math.min(...resourceValues),
    resourceMax: Math.max(...resourceValues),
    comboMin: Math.min(...comboValues),
    comboMax: Math.max(...comboValues)
  };
}

/**
 * Main function: Calculate AI Strategy metrics from aggregated data
 * 
 * @param {Array} aggregatedData - Array of character aggregated data with matches
 * @returns {Object} AI strategy metrics keyed by AI name
 */
export function calculateAIStrategyMetrics(aggregatedData) {
  if (!aggregatedData || aggregatedData.length === 0) {
    return {};
  }
  
  // Initialize AI strategy tracking
  const aiStrategies = {};
  
  // First pass: Collect all match data per AI strategy
  aggregatedData.forEach(character => {
    if (!character.matches || character.matches.length === 0) return;
    
    character.matches.forEach(match => {
      // Only count active matches (skip forfeits, disconnects, incomplete games)
      if (!match.battleTime || match.battleTime <= 0) return;
      
      const aiName = match.aiStrategy || 'Unknown';
      
      if (!aiStrategies[aiName]) {
        aiStrategies[aiName] = {
          name: aiName,
          type: categorizeAIStrategy(aiName),
          
          // Raw counters
          totalMatches: 0,
          winCount: 0,
          lossCount: 0,
          
          // Accumulation for averages
          totalDamageDealt: 0,
          totalDamageTaken: 0,
          totalBattleTime: 0,
          totalKills: 0,
          totalSurvived: 0,
          totalHealthRemaining: 0,
          totalMaxHealth: 0,
          
          // Offensive metrics
          totalMaxCombo: 0,
          totalMaxComboDamage: 0,
          totalSparkingComboHits: 0,
          totalS1Blast: 0,
          totalS2Blast: 0,
          totalUltBlast: 0,
          totalS1HitBlast: 0,
          totalS2HitBlast: 0,
          totalUltHitBlast: 0,
          totalExa1Count: 0,
          totalExa2Count: 0,
          totalThrows: 0,
          totalVanishingAttacks: 0,
          totalDragonHoming: 0,
          totalLightningAttacks: 0,
          totalSpeedImpacts: 0,
          totalSpeedImpactWins: 0,
          
          // Defensive metrics
          totalGuards: 0,
          totalZCounters: 0,
          totalSuperCounters: 0,
          totalRevengeCounters: 0,
          
          // Tactical metrics
          totalSparkingCount: 0,
          totalDragonDashDistance: 0,
          totalEnergyBlasts: 0,
          totalCharges: 0,
          totalTags: 0,
          
          // Character tracking
          characterUsage: {},
          
          // Build tracking
          buildTypeUsage: {},
          buildTypeActions: {}, // Track actions per build type
          capsuleUsage: {},
          capsuleActions: {}, // Track actions per capsule
          
          // Build costs
          totalMeleeCost: 0,
          totalBlastCost: 0,
          totalKiBlastCost: 0,
          totalDefenseCost: 0,
          totalSkillCost: 0,
          totalKiEfficiencyCost: 0,
          totalUtilityCost: 0
        };
      }
      
      const ai = aiStrategies[aiName];
      ai.totalMatches++;
      
      // Win/Loss tracking
      if (match.won) {
        ai.winCount++;
      } else {
        ai.lossCount++;
      }
      
      // Combat stats
      ai.totalDamageDealt += match.damageDone || 0;
      ai.totalDamageTaken += match.damageTaken || 0;
      ai.totalBattleTime += match.battleTime || 0;
      ai.totalKills += match.kills || 0;
      ai.totalHealthRemaining += match.hPGaugeValue || 0;
      ai.totalMaxHealth += match.hPGaugeValueMax || 0;
      if (match.hPGaugeValue > 0) {
        ai.totalSurvived++;
      }
      
      // Offensive stats
      ai.totalMaxCombo += match.maxComboNum || 0;
      ai.totalMaxComboDamage += match.maxComboDamage || 0;
      ai.totalSparkingComboHits += match.sparkingComboCount || 0;
      ai.totalS1Blast += match.s1Blast || 0;
      ai.totalS2Blast += match.s2Blast || 0;
      ai.totalUltBlast += match.ultBlast || 0;
      ai.totalS1HitBlast += match.s1HitBlast || 0;
      ai.totalS2HitBlast += match.s2HitBlast || 0;
      ai.totalUltHitBlast += match.uLTHitBlast || 0;
      ai.totalExa1Count += match.exa1Count || 0;
      ai.totalExa2Count += match.exa2Count || 0;
      ai.totalThrows += match.throwCount || 0;
      ai.totalVanishingAttacks += match.vanishingAttackCount || 0;
      ai.totalDragonHoming += match.dragonHomingCount || 0;
      ai.totalLightningAttacks += match.lightningAttackCount || 0;
      ai.totalSpeedImpacts += match.speedImpactCount || 0;
      ai.totalSpeedImpactWins += match.speedImpactWins || 0;
      
      // Defensive stats
      ai.totalGuards += match.guardCount || 0;
      ai.totalZCounters += match.zCounterCount || 0;
      ai.totalSuperCounters += match.superCounterCount || 0;
      ai.totalRevengeCounters += match.revengeCounterCount || 0;
      
      // Tactical stats
      ai.totalSparkingCount += match.sparkingCount || 0;
      ai.totalDragonDashDistance += match.dragonDashMileage || 0;
      ai.totalEnergyBlasts += match.shotEnergyBulletCount || 0;
      ai.totalCharges += match.chargeCount || 0;
      ai.totalTags += match.tags || 0;
      
      // Character tracking - accumulate ALL stats per character
      const charName = character.name;
      if (!ai.characterUsage[charName]) {
        ai.characterUsage[charName] = {
          name: charName,
          matches: 0,
          wins: 0,
          losses: 0,
          totalDamage: 0,
          totalDamageTaken: 0,
          totalBattleTime: 0,
          totalKills: 0,
          totalSurvived: 0,
          totalHealthRemaining: 0,
          totalMaxHealth: 0,
          totalMaxCombo: 0,
          totalMaxComboDamage: 0,
          totalSparkingComboHits: 0,
          totalS1Blast: 0,
          totalS2Blast: 0,
          totalUltBlast: 0,
          totalS1HitBlast: 0,
          totalS2HitBlast: 0,
          totalUltHitBlast: 0,
          totalExa1Count: 0,
          totalExa2Count: 0,
          totalThrows: 0,
          totalVanishingAttacks: 0,
          totalDragonHoming: 0,
          totalLightningAttacks: 0,
          totalSpeedImpacts: 0,
          totalSpeedImpactWins: 0,
          totalGuards: 0,
          totalZCounters: 0,
          totalSuperCounters: 0,
          totalRevengeCounters: 0,
          totalSparkingCount: 0,
          totalDragonDashDistance: 0,
          totalEnergyBlasts: 0,
          totalCharges: 0,
          totalTags: 0,
          buildTypeUsage: {},
          buildTypeActions: {}, // Track actions per build type for this character
          capsuleUsage: {}, // Track capsule usage for this character
          capsuleActions: {} // Track actions per capsule for this character
        };
      }
      const charData = ai.characterUsage[charName];
      charData.matches++;
      if (match.won) {
        charData.wins++;
      } else {
        charData.losses++;
      }
      charData.totalDamage += match.damageDone || 0;
      charData.totalDamageTaken += match.damageTaken || 0;
      charData.totalBattleTime += match.battleTime || 0;
      charData.totalKills += match.kills || 0;
      if (match.hPGaugeValue > 0) charData.totalSurvived++;
      charData.totalHealthRemaining += match.hPGaugeValue || 0;
      charData.totalMaxHealth += match.hPGaugeValueMax || 0;
      charData.totalMaxCombo += match.maxComboNum || 0;
      charData.totalMaxComboDamage += match.maxComboDamage || 0;
      charData.totalSparkingComboHits += match.sparkingComboCount || 0;
      charData.totalS1Blast += match.s1Blast || 0;
      charData.totalS2Blast += match.s2Blast || 0;
      charData.totalUltBlast += match.ultBlast || 0;
      charData.totalS1HitBlast += match.s1HitBlast || 0;
      charData.totalS2HitBlast += match.s2HitBlast || 0;
      charData.totalUltHitBlast += match.uLTHitBlast || 0;
      charData.totalExa1Count += match.exa1Count || 0;
      charData.totalExa2Count += match.exa2Count || 0;
      charData.totalThrows += match.throwCount || 0;
      charData.totalVanishingAttacks += match.vanishingAttackCount || 0;
      charData.totalDragonHoming += match.dragonHomingCount || 0;
      charData.totalLightningAttacks += match.lightningAttackCount || 0;
      charData.totalSpeedImpacts += match.speedImpactCount || 0;
      charData.totalSpeedImpactWins += match.speedImpactWins || 0;
      charData.totalGuards += match.guardCount || 0;
      charData.totalZCounters += match.zCounterCount || 0;
      charData.totalSuperCounters += match.superCounterCount || 0;
      charData.totalRevengeCounters += match.revengeCounterCount || 0;
      charData.totalSparkingCount += match.sparkingCount || 0;
      charData.totalDragonDashDistance += match.dragonDashMileage || 0;
      charData.totalEnergyBlasts += match.shotEnergyBulletCount || 0;
      charData.totalCharges += match.chargeCount || 0;
      charData.totalTags += match.tags || 0;
      
      // Track build type for this character
      if (match.buildComposition && match.buildComposition.label) {
        const buildLabel = match.buildComposition.label;
        if (!charData.buildTypeUsage[buildLabel]) {
          charData.buildTypeUsage[buildLabel] = { count: 0, wins: 0 };
        }
        charData.buildTypeUsage[buildLabel].count++;
        if (match.won) charData.buildTypeUsage[buildLabel].wins++;
        
        // Track action frequencies per build type for this character
        if (!charData.buildTypeActions[buildLabel]) {
          charData.buildTypeActions[buildLabel] = {
            count: 0,
            totalEnergyBlasts: 0,
            totalThrows: 0,
            totalVanishingAttacks: 0,
            totalGuards: 0,
            totalZCounters: 0,
            totalSuperCounters: 0,
            totalRevengeCounters: 0,
            totalCharges: 0,
            totalDragonDashDistance: 0,
            totalS1Blast: 0,
            totalS2Blast: 0,
            totalUltBlast: 0,
            totalSparkingCount: 0,
            totalTags: 0,
            totalMaxCombo: 0
          };
        }
        charData.buildTypeActions[buildLabel].count++;
        charData.buildTypeActions[buildLabel].totalEnergyBlasts += match.shotEnergyBulletCount || 0;
        charData.buildTypeActions[buildLabel].totalThrows += match.throwCount || 0;
        charData.buildTypeActions[buildLabel].totalVanishingAttacks += match.vanishingAttackCount || 0;
        charData.buildTypeActions[buildLabel].totalGuards += match.guardCount || 0;
        charData.buildTypeActions[buildLabel].totalZCounters += match.zCounterCount || 0;
        charData.buildTypeActions[buildLabel].totalSuperCounters += match.superCounterCount || 0;
        charData.buildTypeActions[buildLabel].totalRevengeCounters += match.revengeCounterCount || 0;
        charData.buildTypeActions[buildLabel].totalCharges += match.chargeCount || 0;
        charData.buildTypeActions[buildLabel].totalDragonDashDistance += match.dragonDashMileage || 0;
        charData.buildTypeActions[buildLabel].totalS1Blast += match.s1Blast || 0;
        charData.buildTypeActions[buildLabel].totalS2Blast += match.s2Blast || 0;
        charData.buildTypeActions[buildLabel].totalUltBlast += match.ultBlast || 0;
        charData.buildTypeActions[buildLabel].totalSparkingCount += match.sparkingCount || 0;
        charData.buildTypeActions[buildLabel].totalTags += match.tags || 0;
        charData.buildTypeActions[buildLabel].totalMaxCombo += match.maxComboNum || 0;
      }
      
      // Track capsule usage for this character
      if (match.equippedCapsules && Array.isArray(match.equippedCapsules)) {
        match.equippedCapsules.forEach(capsule => {
          if (capsule.id) {
            if (!charData.capsuleUsage[capsule.id]) {
              charData.capsuleUsage[capsule.id] = {
                id: capsule.id,
                name: capsule.name,
                count: 0,
                wins: 0
              };
            }
            charData.capsuleUsage[capsule.id].count++;
            if (match.won) charData.capsuleUsage[capsule.id].wins++;
            
            // Track action frequencies per capsule for this character
            if (!charData.capsuleActions[capsule.id]) {
              charData.capsuleActions[capsule.id] = {
                count: 0,
                totalEnergyBlasts: 0,
                totalThrows: 0,
                totalVanishingAttacks: 0,
                totalGuards: 0,
                totalZCounters: 0,
                totalSuperCounters: 0,
                totalRevengeCounters: 0,
                totalCharges: 0,
                totalDragonDashDistance: 0,
                totalS1Blast: 0,
                totalS2Blast: 0,
                totalUltBlast: 0,
                totalSparkingCount: 0,
                totalTags: 0,
                totalMaxCombo: 0
              };
            }
            charData.capsuleActions[capsule.id].count++;
            charData.capsuleActions[capsule.id].totalEnergyBlasts += match.shotEnergyBulletCount || 0;
            charData.capsuleActions[capsule.id].totalThrows += match.throwCount || 0;
            charData.capsuleActions[capsule.id].totalVanishingAttacks += match.vanishingAttackCount || 0;
            charData.capsuleActions[capsule.id].totalGuards += match.guardCount || 0;
            charData.capsuleActions[capsule.id].totalZCounters += match.zCounterCount || 0;
            charData.capsuleActions[capsule.id].totalSuperCounters += match.superCounterCount || 0;
            charData.capsuleActions[capsule.id].totalRevengeCounters += match.revengeCounterCount || 0;
            charData.capsuleActions[capsule.id].totalCharges += match.chargeCount || 0;
            charData.capsuleActions[capsule.id].totalDragonDashDistance += match.dragonDashMileage || 0;
            charData.capsuleActions[capsule.id].totalS1Blast += match.s1Blast || 0;
            charData.capsuleActions[capsule.id].totalS2Blast += match.s2Blast || 0;
            charData.capsuleActions[capsule.id].totalUltBlast += match.ultBlast || 0;
            charData.capsuleActions[capsule.id].totalSparkingCount += match.sparkingCount || 0;
            charData.capsuleActions[capsule.id].totalTags += match.tags || 0;
            charData.capsuleActions[capsule.id].totalMaxCombo += match.maxComboNum || 0;
          }
        });
      }
      
      // Build type tracking
      if (match.buildComposition && match.buildComposition.label) {
        const buildLabel = match.buildComposition.label;
        if (!ai.buildTypeUsage[buildLabel]) {
          ai.buildTypeUsage[buildLabel] = { count: 0, wins: 0 };
        }
        ai.buildTypeUsage[buildLabel].count++;
        if (match.won) ai.buildTypeUsage[buildLabel].wins++;
        
        // Track action frequencies per build type
        if (!ai.buildTypeActions[buildLabel]) {
          ai.buildTypeActions[buildLabel] = {
            count: 0,
            totalEnergyBlasts: 0,
            totalThrows: 0,
            totalVanishingAttacks: 0,
            totalGuards: 0,
            totalZCounters: 0,
            totalSuperCounters: 0,
            totalRevengeCounters: 0,
            totalCharges: 0,
            totalDragonDashDistance: 0,
            totalS1Blast: 0,
            totalS2Blast: 0,
            totalUltBlast: 0,
            totalSparkingCount: 0,
            totalTags: 0,
            totalMaxCombo: 0
          };
        }
        ai.buildTypeActions[buildLabel].count++;
        ai.buildTypeActions[buildLabel].totalEnergyBlasts += match.shotEnergyBulletCount || 0;
        ai.buildTypeActions[buildLabel].totalThrows += match.throwCount || 0;
        ai.buildTypeActions[buildLabel].totalVanishingAttacks += match.vanishingAttackCount || 0;
        ai.buildTypeActions[buildLabel].totalGuards += match.guardCount || 0;
        ai.buildTypeActions[buildLabel].totalZCounters += match.zCounterCount || 0;
        ai.buildTypeActions[buildLabel].totalSuperCounters += match.superCounterCount || 0;
        ai.buildTypeActions[buildLabel].totalRevengeCounters += match.revengeCounterCount || 0;
        ai.buildTypeActions[buildLabel].totalCharges += match.chargeCount || 0;
        ai.buildTypeActions[buildLabel].totalDragonDashDistance += match.dragonDashMileage || 0;
        ai.buildTypeActions[buildLabel].totalS1Blast += match.s1Blast || 0;
        ai.buildTypeActions[buildLabel].totalS2Blast += match.s2Blast || 0;
        ai.buildTypeActions[buildLabel].totalUltBlast += match.ultBlast || 0;
        ai.buildTypeActions[buildLabel].totalSparkingCount += match.sparkingCount || 0;
        ai.buildTypeActions[buildLabel].totalTags += match.tags || 0;
        ai.buildTypeActions[buildLabel].totalMaxCombo += match.maxComboNum || 0;
      }
      
      // Capsule tracking
      if (match.equippedCapsules && Array.isArray(match.equippedCapsules)) {
        match.equippedCapsules.forEach(capsule => {
          if (capsule.id) {
            if (!ai.capsuleUsage[capsule.id]) {
              ai.capsuleUsage[capsule.id] = {
                id: capsule.id,
                name: capsule.name,
                count: 0,
                wins: 0
              };
            }
            ai.capsuleUsage[capsule.id].count++;
            if (match.won) ai.capsuleUsage[capsule.id].wins++;
            
            // Track action frequencies per capsule
            if (!ai.capsuleActions[capsule.id]) {
              ai.capsuleActions[capsule.id] = {
                count: 0,
                totalEnergyBlasts: 0,
                totalThrows: 0,
                totalVanishingAttacks: 0,
                totalGuards: 0,
                totalZCounters: 0,
                totalSuperCounters: 0,
                totalRevengeCounters: 0,
                totalCharges: 0,
                totalDragonDashDistance: 0,
                totalS1Blast: 0,
                totalS2Blast: 0,
                totalUltBlast: 0,
                totalSparkingCount: 0,
                totalTags: 0,
                totalMaxCombo: 0
              };
            }
            ai.capsuleActions[capsule.id].count++;
            ai.capsuleActions[capsule.id].totalEnergyBlasts += match.shotEnergyBulletCount || 0;
            ai.capsuleActions[capsule.id].totalThrows += match.throwCount || 0;
            ai.capsuleActions[capsule.id].totalVanishingAttacks += match.vanishingAttackCount || 0;
            ai.capsuleActions[capsule.id].totalGuards += match.guardCount || 0;
            ai.capsuleActions[capsule.id].totalZCounters += match.zCounterCount || 0;
            ai.capsuleActions[capsule.id].totalSuperCounters += match.superCounterCount || 0;
            ai.capsuleActions[capsule.id].totalRevengeCounters += match.revengeCounterCount || 0;
            ai.capsuleActions[capsule.id].totalCharges += match.chargeCount || 0;
            ai.capsuleActions[capsule.id].totalDragonDashDistance += match.dragonDashMileage || 0;
            ai.capsuleActions[capsule.id].totalS1Blast += match.s1Blast || 0;
            ai.capsuleActions[capsule.id].totalS2Blast += match.s2Blast || 0;
            ai.capsuleActions[capsule.id].totalUltBlast += match.ultBlast || 0;
            ai.capsuleActions[capsule.id].totalSparkingCount += match.sparkingCount || 0;
            ai.capsuleActions[capsule.id].totalTags += match.tags || 0;
            ai.capsuleActions[capsule.id].totalMaxCombo += match.maxComboNum || 0;
          }
        });
      }
      
      // Build costs (from match-level cost tracking)
      if (match.buildComposition && match.buildComposition.breakdown) {
        match.buildComposition.breakdown.forEach(item => {
          const cost = item.cost || 0;
          switch(item.name) {
            case 'Melee': ai.totalMeleeCost += cost; break;
            case 'Blast': ai.totalBlastCost += cost; break;
            case 'Ki Blast': ai.totalKiBlastCost += cost; break;
            case 'Defense': ai.totalDefenseCost += cost; break;
            case 'Skill': ai.totalSkillCost += cost; break;
            case 'Ki Efficiency': ai.totalKiEfficiencyCost += cost; break;
            case 'Utility': ai.totalUtilityCost += cost; break;
          }
        });
      }
    });
  });
  
  // Second pass: Calculate averages and derived metrics
  const processedAIs = {};
  
  Object.keys(aiStrategies).forEach(aiName => {
    const ai = aiStrategies[aiName];
    const matches = ai.totalMatches;
    
    if (matches === 0) return; // Skip AIs with no matches
    
    // Calculate averages
    const avgDamageDealt = Math.round(ai.totalDamageDealt / matches);
    const avgDamageTaken = Math.round(ai.totalDamageTaken / matches);
    const avgBattleTime = ai.totalBattleTime / matches;
    
    // Calculate derived metrics with fallbacks
    const avgDamageTakenPerSecond = avgBattleTime > 0 ? avgDamageTaken / avgBattleTime : 0;
    const damageEfficiency = avgDamageTaken > 0 ? avgDamageDealt / avgDamageTaken : (avgDamageDealt > 0 ? avgDamageDealt / 1000 : 0);
    const avgDPS = avgBattleTime > 0 ? avgDamageDealt / avgBattleTime : (avgDamageDealt > 0 ? avgDamageDealt / 120 : 0); //  Assume ~2 min battle if no time data
    
    const rawStats = {
      avgDamageDealt,
      avgDamageTaken,
      avgDamageTakenPerSecond,
      avgHealthRemaining: Math.round(ai.totalHealthRemaining / matches),
      avgMaxHealth: Math.round(ai.totalMaxHealth / matches),
      avgMaxCombo: Math.round((ai.totalMaxCombo / matches) * 10) / 10,
      avgMaxComboDamage: Math.round(ai.totalMaxComboDamage / matches),
      avgSparkingComboHits: Math.round((ai.totalSparkingComboHits / matches) * 10) / 10,
      avgS1Blast: Math.round((ai.totalS1Blast / matches) * 10) / 10,
      avgS2Blast: Math.round((ai.totalS2Blast / matches) * 10) / 10,
      avgUltBlast: Math.round((ai.totalUltBlast / matches) * 10) / 10,
      avgS1HitBlast: Math.round((ai.totalS1HitBlast / matches) * 10) / 10,
      avgS2HitBlast: Math.round((ai.totalS2HitBlast / matches) * 10) / 10,
      avgUltHitBlast: Math.round((ai.totalUltHitBlast / matches) * 10) / 10,
      avgS1HitRate: ai.totalS1Blast > 0 ? Math.round((ai.totalS1HitBlast / ai.totalS1Blast) * 100) : 0,
      avgS2HitRate: ai.totalS2Blast > 0 ? Math.round((ai.totalS2HitBlast / ai.totalS2Blast) * 100) : 0,
      avgUltHitRate: ai.totalUltBlast > 0 ? Math.round((ai.totalUltHitBlast / ai.totalUltBlast) * 100) : 0,
      avgExa1Count: Math.round((ai.totalExa1Count / matches) * 10) / 10,
      avgExa2Count: Math.round((ai.totalExa2Count / matches) * 10) / 10,
      avgThrows: Math.round((ai.totalThrows / matches) * 10) / 10,
      avgVanishingAttacks: Math.round((ai.totalVanishingAttacks / matches) * 10) / 10,
      avgDragonHoming: Math.round((ai.totalDragonHoming / matches) * 10) / 10,
      avgLightningAttacks: Math.round((ai.totalLightningAttacks / matches) * 10) / 10,
      avgSpeedImpacts: Math.round((ai.totalSpeedImpacts / matches) * 10) / 10,
      avgSpeedImpactWins: Math.round((ai.totalSpeedImpactWins / matches) * 10) / 10,
      avgGuards: Math.round((ai.totalGuards / matches) * 10) / 10,
      avgZCounters: Math.round((ai.totalZCounters / matches) * 10) / 10,
      avgSuperCounters: Math.round((ai.totalSuperCounters / matches) * 10) / 10,
      avgRevengeCounters: Math.round((ai.totalRevengeCounters / matches) * 10) / 10,
      avgSparkingCount: Math.round((ai.totalSparkingCount / matches) * 10) / 10,
      avgDragonDashDistance: Math.round(ai.totalDragonDashDistance / matches),
      avgEnergyBlasts: Math.round((ai.totalEnergyBlasts / matches) * 10) / 10,
      avgCharges: Math.round((ai.totalCharges / matches) * 10) / 10,
      avgTags: Math.round((ai.totalTags / matches) * 10) / 10
    };
    
    // Calculate win rate
    const winRate = Math.round((ai.winCount / matches) * 1000) / 10;
    
    // Calculate survival rate
    const survivalRate = Math.round((ai.totalSurvived / matches) * 1000) / 10;
    
    // Calculate average kills
    const avgKills = Math.round((ai.totalKills / matches) * 10) / 10;
    
    // Calculate combat performance score (0-100)
    const damageRatio = avgDamageTaken > 0 ? avgDamageDealt / avgDamageTaken : 1;
    const baseScore = (damageRatio * 30) + (winRate * 0.5) + (survivalRate * 0.2);
    const combatPerformanceScore = Math.min(100, Math.round(baseScore * 10) / 10);
    
    // Calculate usage rate (will be filled in third pass)
    const usageRate = 0; // Placeholder
    
    // Process character usage
    const characterList = Object.values(ai.characterUsage).map(char => {
      // Find most used build type for this character
      let mostUsedBuildType = 'N/A';
      if (char.buildTypeUsage && Object.keys(char.buildTypeUsage).length > 0) {
        mostUsedBuildType = Object.entries(char.buildTypeUsage)
          .sort((a, b) => b[1] - a[1])[0][0];
      }
      
      return {
        name: char.name,
        matches: char.matches,
        winRate: char.matches > 0 ? Math.round((char.wins / char.matches) * 1000) / 10 : 0,
        avgDamage: Math.round(char.totalDamage / char.matches),
        performanceDelta: 0, // Will calculate if we have character overall averages
        mostUsedBuildType
      };
    }).sort((a, b) => b.matches - a.matches);
    
    // Process build type distribution with action averages
    const buildTypeDistribution = Object.keys(ai.buildTypeUsage).map(buildType => {
      const buildData = ai.buildTypeUsage[buildType];
      const buildActions = ai.buildTypeActions[buildType];
      const buildCount = buildData.count;
      
      return {
        buildType,
        count: buildCount,
        percentage: Math.round((buildCount / matches) * 1000) / 10,
        winRate: buildCount > 0 
          ? Math.round((buildData.wins / buildCount) * 1000) / 10 
          : 0,
        // Add action averages for this build type
        actionAverages: buildActions ? {
          energyBlasts: Math.round((buildActions.totalEnergyBlasts / buildCount) * 10) / 10,
          throws: Math.round((buildActions.totalThrows / buildCount) * 10) / 10,
          vanishingAttacks: Math.round((buildActions.totalVanishingAttacks / buildCount) * 10) / 10,
          guards: Math.round((buildActions.totalGuards / buildCount) * 10) / 10,
          zCounters: Math.round((buildActions.totalZCounters / buildCount) * 10) / 10,
          superCounters: Math.round((buildActions.totalSuperCounters / buildCount) * 10) / 10,
          revengeCounters: Math.round((buildActions.totalRevengeCounters / buildCount) * 10) / 10,
          charges: Math.round((buildActions.totalCharges / buildCount) * 10) / 10,
          dragonDashDistance: Math.round(buildActions.totalDragonDashDistance / buildCount),
          s1Blast: Math.round((buildActions.totalS1Blast / buildCount) * 10) / 10,
          s2Blast: Math.round((buildActions.totalS2Blast / buildCount) * 10) / 10,
          ultBlast: Math.round((buildActions.totalUltBlast / buildCount) * 10) / 10,
          sparkingCount: Math.round((buildActions.totalSparkingCount / buildCount) * 10) / 10,
          tags: Math.round((buildActions.totalTags / buildCount) * 10) / 10,
          maxCombo: Math.round((buildActions.totalMaxCombo / buildCount) * 10) / 10
        } : null
      };
    }).sort((a, b) => b.count - a.count);
    
    // Process top capsules with action averages
    const topCapsules = Object.values(ai.capsuleUsage)
      .map(cap => {
        const capsuleActions = ai.capsuleActions[cap.id];
        const capsuleCount = cap.count;
        
        return {
          id: cap.id,
          name: cap.name,
          count: capsuleCount,
          winRate: capsuleCount > 0 ? Math.round((cap.wins / capsuleCount) * 1000) / 10 : 0,
          // Add action averages for this capsule
          actionAverages: capsuleActions ? {
            energyBlasts: Math.round((capsuleActions.totalEnergyBlasts / capsuleCount) * 10) / 10,
            throws: Math.round((capsuleActions.totalThrows / capsuleCount) * 10) / 10,
            vanishingAttacks: Math.round((capsuleActions.totalVanishingAttacks / capsuleCount) * 10) / 10,
            guards: Math.round((capsuleActions.totalGuards / capsuleCount) * 10) / 10,
            zCounters: Math.round((capsuleActions.totalZCounters / capsuleCount) * 10) / 10,
            superCounters: Math.round((capsuleActions.totalSuperCounters / capsuleCount) * 10) / 10,
            revengeCounters: Math.round((capsuleActions.totalRevengeCounters / capsuleCount) * 10) / 10,
            charges: Math.round((capsuleActions.totalCharges / capsuleCount) * 10) / 10,
            dragonDashDistance: Math.round(capsuleActions.totalDragonDashDistance / capsuleCount),
            s1Blast: Math.round((capsuleActions.totalS1Blast / capsuleCount) * 10) / 10,
            s2Blast: Math.round((capsuleActions.totalS2Blast / capsuleCount) * 10) / 10,
            ultBlast: Math.round((capsuleActions.totalUltBlast / capsuleCount) * 10) / 10,
            sparkingCount: Math.round((capsuleActions.totalSparkingCount / capsuleCount) * 10) / 10,
            tags: Math.round((capsuleActions.totalTags / capsuleCount) * 10) / 10,
            maxCombo: Math.round((capsuleActions.totalMaxCombo / capsuleCount) * 10) / 10
          } : null
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Calculate average build costs
    const avgBuildCosts = {
      melee: Math.round((ai.totalMeleeCost / matches) * 10) / 10,
      blast: Math.round((ai.totalBlastCost / matches) * 10) / 10,
      kiBlast: Math.round((ai.totalKiBlastCost / matches) * 10) / 10,
      defense: Math.round((ai.totalDefenseCost / matches) * 10) / 10,
      skill: Math.round((ai.totalSkillCost / matches) * 10) / 10,
      kiEfficiency: Math.round((ai.totalKiEfficiencyCost / matches) * 10) / 10,
      utility: Math.round((ai.totalUtilityCost / matches) * 10) / 10
    };
    
    // Calculate data quality
    const uniqueCharacters = Object.keys(ai.characterUsage).length;
    const dataQuality = calculateDataQuality(matches, uniqueCharacters);
    
    processedAIs[aiName] = {
      name: aiName,
      type: ai.type,
      
      // Usage
      totalMatches: matches,
      usageRate, // Will update in third pass
      uniqueCharacters,
      
      // Performance
      winCount: ai.winCount,
      lossCount: ai.lossCount,
      winRate,
      combatPerformanceScore,
      avgSurvivalRate: survivalRate,
      avgKills,
      
      // Raw stats (for detailed view)
      ...rawStats,
      avgBattleTime: Math.round(avgBattleTime * 10) / 10,
      damageEfficiency: Math.round(damageEfficiency * 100) / 100,
      avgDPS: Math.round(avgDPS),
      
      // Will add normalized scores in third pass
      normalizedScores: null,
      
      // Character compatibility
      _rawCharacterData: ai.characterUsage, // Keep raw accumulated data for filtering
      characterUsage: characterList, // Processed array for display
      
      // Build analysis
      buildTypeDistribution,
      topCapsules,
      avgBuildCosts,
      
      // Data quality
      dataQuality
    };
  });
  
  // Third pass: Calculate usage rates and normalized scores
  const totalMatchesAcrossAllAIs = Object.values(processedAIs).reduce((sum, ai) => sum + ai.totalMatches, 0);
  const globalStats = calculateGlobalStats(processedAIs);
  
  Object.keys(processedAIs).forEach(aiName => {
    const ai = processedAIs[aiName];
    
    // Update usage rate
    ai.usageRate = totalMatchesAcrossAllAIs > 0 
      ? Math.round((ai.totalMatches / totalMatchesAcrossAllAIs) * 1000) / 10 
      : 0;
    
    // Calculate normalized scores
    ai.normalizedScores = calculateNormalizedScores(ai, globalStats);
  });
  
  return processedAIs;
}

/**
 * Get top AI strategies by a specific metric
 */
export function getTopAIStrategies(aiMetrics, metric = 'winRate', limit = 5) {
  const strategies = Object.values(aiMetrics);
  
  const sorters = {
    winRate: (a, b) => b.winRate - a.winRate,
    usage: (a, b) => b.totalMatches - a.totalMatches,
    performance: (a, b) => b.combatPerformanceScore - a.combatPerformanceScore,
    offense: (a, b) => b.avgDamageDealt - a.avgDamageDealt,
    defense: (a, b) => a.avgDamageTakenPerSecond - b.avgDamageTakenPerSecond
  };
  
  const sorter = sorters[metric] || sorters.winRate;
  
  return strategies.sort(sorter).slice(0, limit);
}

/**
 * Generate automatic insights from AI metrics
 */
export function generateAIInsights(aiMetrics) {
  const strategies = Object.values(aiMetrics).filter(ai => ai.totalMatches >= 5); // Min 5 matches for insights
  
  if (strategies.length === 0) {
    return [];
  }
  
  const insights = [];
  
  // Highest win rate
  const topWinRate = strategies.reduce((max, ai) => ai.winRate > max.winRate ? ai : max);
  insights.push({
    type: 'success',
    icon: '🏆',
    text: `${topWinRate.name} has the highest win rate at ${topWinRate.winRate}%`
  });
  
  // Most offensive
  const topOffense = strategies.reduce((max, ai) => ai.avgDamageDealt > max.avgDamageDealt ? ai : max);
  insights.push({
    type: 'info',
    icon: '💪',
    text: `${topOffense.name} deals the most damage on average (${topOffense.avgDamageDealt.toLocaleString()})`
  });
  
  // Most defensive
  const topDefense = strategies.reduce((min, ai) => ai.avgDamageTakenPerSecond < min.avgDamageTakenPerSecond ? ai : min);
  insights.push({
    type: 'info',
    icon: '🛡️',
    text: `${topDefense.name} takes the least damage per second (${Math.round(topDefense.avgDamageTakenPerSecond)})`
  });
  
  // Most popular
  const mostUsed = strategies.reduce((max, ai) => ai.totalMatches > max.totalMatches ? ai : max);
  insights.push({
    type: 'info',
    icon: '⭐',
    text: `${mostUsed.name} is the most popular with ${mostUsed.totalMatches} matches (${mostUsed.usageRate}%)`
  });
  
  return insights;
}

/**
 * Extract all unique characters used across all AI strategies
 * @param {Object} aiMetrics - All AI metrics
 * @param {Object} charMap - Character ID to name mapping (not used since characterUsage already has names)
 * @returns {Array} Sorted array of unique character objects with id and name
 */
export function extractUniqueCharacters(aiMetrics, charMap = {}) {
  const characterMap = new Map();
  
  Object.values(aiMetrics).forEach(ai => {
    // characterUsage is an array of character objects with {name, matches, winRate, etc.}
    const charArray = ai.characterUsage || [];
    charArray.forEach(char => {
      const charName = char.name;
      if (charName && !characterMap.has(charName)) {
        characterMap.set(charName, {
          id: charName, // Use name as ID since we already have resolved names
          name: charName
        });
      }
    });
  });
  
  // Sort by character name
  return Array.from(characterMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Calculate a character's baseline metrics across all AI strategies
 * This provides the character's "average behavior" to compare individual AI strategies against
 * @param {Object} aiMetrics - AI strategy metrics (unfiltered)
 * @param {string} characterName - Character name
 * @returns {Object} Character's aggregated baseline metrics
 */
export function calculateCharacterBaseline(aiMetrics, characterName) {
  if (!characterName || !aiMetrics) return null;
  
  const baseline = {
    totalMatches: 0,
    totalWins: 0,
    totalDamage: 0,
    totalDamageTaken: 0,
    totalBattleTime: 0,
    totalHealthRemaining: 0,
    totalMaxHealth: 0,
    totalMaxCombo: 0,
    totalMaxComboDamage: 0,
    totalSparkingComboHits: 0,
    totalS1Blast: 0,
    totalS2Blast: 0,
    totalUltBlast: 0,
    totalS1HitBlast: 0,
    totalS2HitBlast: 0,
    totalUltHitBlast: 0,
    totalExa1Count: 0,
    totalExa2Count: 0,
    totalThrows: 0,
    totalVanishingAttacks: 0,
    totalDragonHoming: 0,
    totalLightningAttacks: 0,
    totalSpeedImpacts: 0,
    totalSpeedImpactWins: 0,
    totalGuards: 0,
    totalZCounters: 0,
    totalSuperCounters: 0,
    totalRevengeCounters: 0,
    totalSparkingCount: 0,
    totalDragonDashDistance: 0,
    totalEnergyBlasts: 0,
    totalCharges: 0,
    totalTags: 0,
    totalSurvived: 0,
    totalKills: 0
  };
  
  // Aggregate data from all AIs that used this character
  Object.values(aiMetrics).forEach(ai => {
    const rawCharData = ai._rawCharacterData?.[characterName];
    if (!rawCharData) return;
    
    baseline.totalMatches += rawCharData.matches || 0;
    baseline.totalWins += rawCharData.wins || 0;
    baseline.totalDamage += rawCharData.totalDamage || 0;
    baseline.totalDamageTaken += rawCharData.totalDamageTaken || 0;
    baseline.totalBattleTime += rawCharData.totalBattleTime || 0;
    baseline.totalHealthRemaining += rawCharData.totalHealthRemaining || 0;
    baseline.totalMaxHealth += rawCharData.totalMaxHealth || 0;
    baseline.totalMaxCombo += rawCharData.totalMaxCombo || 0;
    baseline.totalMaxComboDamage += rawCharData.totalMaxComboDamage || 0;
    baseline.totalSparkingComboHits += rawCharData.totalSparkingComboHits || 0;
    baseline.totalS1Blast += rawCharData.totalS1Blast || 0;
    baseline.totalS2Blast += rawCharData.totalS2Blast || 0;
    baseline.totalUltBlast += rawCharData.totalUltBlast || 0;
    baseline.totalS1HitBlast += rawCharData.totalS1HitBlast || 0;
    baseline.totalS2HitBlast += rawCharData.totalS2HitBlast || 0;
    baseline.totalUltHitBlast += rawCharData.totalUltHitBlast || 0;
    baseline.totalExa1Count += rawCharData.totalExa1Count || 0;
    baseline.totalExa2Count += rawCharData.totalExa2Count || 0;
    baseline.totalThrows += rawCharData.totalThrows || 0;
    baseline.totalVanishingAttacks += rawCharData.totalVanishingAttacks || 0;
    baseline.totalDragonHoming += rawCharData.totalDragonHoming || 0;
    baseline.totalLightningAttacks += rawCharData.totalLightningAttacks || 0;
    baseline.totalSpeedImpacts += rawCharData.totalSpeedImpacts || 0;
    baseline.totalSpeedImpactWins += rawCharData.totalSpeedImpactWins || 0;
    baseline.totalGuards += rawCharData.totalGuards || 0;
    baseline.totalZCounters += rawCharData.totalZCounters || 0;
    baseline.totalSuperCounters += rawCharData.totalSuperCounters || 0;
    baseline.totalRevengeCounters += rawCharData.totalRevengeCounters || 0;
    baseline.totalSparkingCount += rawCharData.totalSparkingCount || 0;
    baseline.totalDragonDashDistance += rawCharData.totalDragonDashDistance || 0;
    baseline.totalEnergyBlasts += rawCharData.totalEnergyBlasts || 0;
    baseline.totalCharges += rawCharData.totalCharges || 0;
    baseline.totalTags += rawCharData.totalTags || 0;
    baseline.totalSurvived += rawCharData.totalSurvived || 0;
    baseline.totalKills += rawCharData.totalKills || 0;
  });
  
  // Calculate averages if we have data
  if (baseline.totalMatches === 0) return null;
  
  const matches = baseline.totalMatches;
  
  return {
    totalMatches: matches,
    avgDamageDealt: Math.round(baseline.totalDamage / matches),
    avgDamageTaken: Math.round(baseline.totalDamageTaken / matches),
    avgBattleTime: baseline.totalBattleTime / matches,
    avgHealthRemaining: Math.round(baseline.totalHealthRemaining / matches),
    avgMaxHealth: Math.round(baseline.totalMaxHealth / matches),
    avgMaxCombo: Math.round((baseline.totalMaxCombo / matches) * 10) / 10,
    avgMaxComboDamage: Math.round(baseline.totalMaxComboDamage / matches),
    avgSparkingComboHits: Math.round((baseline.totalSparkingComboHits / matches) * 10) / 10,
    avgS1Blast: Math.round((baseline.totalS1Blast / matches) * 10) / 10,
    avgS2Blast: Math.round((baseline.totalS2Blast / matches) * 10) / 10,
    avgUltBlast: Math.round((baseline.totalUltBlast / matches) * 10) / 10,
    avgS1HitBlast: Math.round((baseline.totalS1HitBlast / matches) * 10) / 10,
    avgS2HitBlast: Math.round((baseline.totalS2HitBlast / matches) * 10) / 10,
    avgUltHitBlast: Math.round((baseline.totalUltHitBlast / matches) * 10) / 10,
    avgExa1Count: Math.round((baseline.totalExa1Count / matches) * 10) / 10,
    avgExa2Count: Math.round((baseline.totalExa2Count / matches) * 10) / 10,
    avgThrows: Math.round((baseline.totalThrows / matches) * 10) / 10,
    avgVanishingAttacks: Math.round((baseline.totalVanishingAttacks / matches) * 10) / 10,
    avgDragonHoming: Math.round((baseline.totalDragonHoming / matches) * 10) / 10,
    avgLightningAttacks: Math.round((baseline.totalLightningAttacks / matches) * 10) / 10,
    avgSpeedImpacts: Math.round((baseline.totalSpeedImpacts / matches) * 10) / 10,
    avgSpeedImpactWins: Math.round((baseline.totalSpeedImpactWins / matches) * 10) / 10,
    avgGuards: Math.round((baseline.totalGuards / matches) * 10) / 10,
    avgZCounters: Math.round((baseline.totalZCounters / matches) * 10) / 10,
    avgSuperCounters: Math.round((baseline.totalSuperCounters / matches) * 10) / 10,
    avgRevengeCounters: Math.round((baseline.totalRevengeCounters / matches) * 10) / 10,
    avgSparkingCount: Math.round((baseline.totalSparkingCount / matches) * 10) / 10,
    avgDragonDashDistance: Math.round(baseline.totalDragonDashDistance / matches),
    avgEnergyBlasts: Math.round((baseline.totalEnergyBlasts / matches) * 10) / 10,
    avgCharges: Math.round((baseline.totalCharges / matches) * 10) / 10,
    avgTags: Math.round((baseline.totalTags / matches) * 10) / 10,
    avgSurvivalRate: Math.round((baseline.totalSurvived / matches) * 1000) / 10,
    avgKills: Math.round((baseline.totalKills / matches) * 10) / 10,
    avgDPS: (baseline.totalBattleTime > 0) ? Math.round(baseline.totalDamage / baseline.totalBattleTime) : 0,
    avgDamageTakenPerSecond: (baseline.totalBattleTime > 0) ? Math.round(baseline.totalDamageTaken / baseline.totalBattleTime) : 0,
    damageEfficiency: baseline.totalDamageTaken > 0 ? baseline.totalDamage / baseline.totalDamageTaken : 1
  };
}

/**
 * Filter AI metrics to show only data for a specific character
 * Recalculates ALL metrics using only the character-specific accumulated data
 * @param {Object} aiMetrics - AI strategy metrics (processed)
 * @param {string} characterName - Character name to filter by
 * @param {Object} charMap - Character ID to name mapping (not used)
 * @returns {Object} Filtered AI metrics with all values recalculated for the character
 */
export function filterAIMetricsByCharacter(aiMetrics, characterName, charMap = {}) {
  if (!characterName) return aiMetrics;
  
  const filtered = {};
  
  // Calculate character baseline across all AIs (for behavioral insights comparison)
  const characterBaseline = calculateCharacterBaseline(aiMetrics, characterName);
  
  Object.entries(aiMetrics).forEach(([aiName, ai]) => {
    // Get the raw accumulated character data
    const rawCharData = ai._rawCharacterData?.[characterName];
    
    // Only include AI if this character was used with it
    if (!rawCharData) return;
    
    // Recalculate ALL metrics using only this character's data
    const matches = rawCharData.matches;
    const wins = rawCharData.wins;
    const losses = rawCharData.losses || (matches - wins);
    const winRate = matches > 0 ? Math.round((wins / matches) * 1000) / 10 : 0;
    
    // Calculate averages from accumulated character data
    const avgDamageDealt = matches > 0 ? Math.round(rawCharData.totalDamage / matches) : 0;
    const avgDamageTaken = matches > 0 ? Math.round(rawCharData.totalDamageTaken / matches) : 0;
    const avgBattleTime = matches > 0 ? rawCharData.totalBattleTime / matches : 0;
    const avgKills = matches > 0 ? Math.round((rawCharData.totalKills / matches) * 10) / 10 : 0;
    const survivalRate = matches > 0 ? Math.round((rawCharData.totalSurvived / matches) * 1000) / 10 : 0;
    
    // Damage efficiency and DPS
    const damageEfficiency = avgDamageTaken > 0 ? avgDamageDealt / avgDamageTaken : 1;
    const avgDPS = avgBattleTime > 0 ? avgDamageDealt / avgBattleTime : 0;
    
    // Combat performance score (same formula as main calculation)
    const damageRatio = avgDamageTaken > 0 ? avgDamageDealt / avgDamageTaken : 1;
    const baseScore = (damageRatio * 30) + (winRate * 0.5) + (survivalRate * 0.2);
    const combatPerformanceScore = Math.min(100, Math.round(baseScore * 10) / 10);
    
    // Calculate all raw stats from character data
    const rawStats = {
      avgDamageDealt,
      avgDamageTaken,
      avgDamageTakenPerSecond: avgBattleTime > 0 ? Math.round(avgDamageTaken / avgBattleTime) : 0,
      avgHealthRemaining: matches > 0 ? Math.round(rawCharData.totalHealthRemaining / matches) : 0,
      avgMaxHealth: matches > 0 ? Math.round(rawCharData.totalMaxHealth / matches) : 0,
      avgMaxCombo: matches > 0 ? Math.round((rawCharData.totalMaxCombo / matches) * 10) / 10 : 0,
      avgMaxComboDamage: matches > 0 ? Math.round(rawCharData.totalMaxComboDamage / matches) : 0,
      avgSparkingComboHits: matches > 0 ? Math.round((rawCharData.totalSparkingComboHits / matches) * 10) / 10 : 0,
      avgS1Blast: matches > 0 ? Math.round((rawCharData.totalS1Blast / matches) * 10) / 10 : 0,
      avgS2Blast: matches > 0 ? Math.round((rawCharData.totalS2Blast / matches) * 10) / 10 : 0,
      avgUltBlast: matches > 0 ? Math.round((rawCharData.totalUltBlast / matches) * 10) / 10 : 0,
      avgS1HitBlast: matches > 0 ? Math.round((rawCharData.totalS1HitBlast / matches) * 10) / 10 : 0,
      avgS2HitBlast: matches > 0 ? Math.round((rawCharData.totalS2HitBlast / matches) * 10) / 10 : 0,
      avgUltHitBlast: matches > 0 ? Math.round((rawCharData.totalUltHitBlast / matches) * 10) / 10 : 0,
      avgS1HitRate: rawCharData.totalS1Blast > 0 ? Math.round((rawCharData.totalS1HitBlast / rawCharData.totalS1Blast) * 1000) / 10 : 0,
      avgS2HitRate: rawCharData.totalS2Blast > 0 ? Math.round((rawCharData.totalS2HitBlast / rawCharData.totalS2Blast) * 1000) / 10 : 0,
      avgUltHitRate: rawCharData.totalUltBlast > 0 ? Math.round((rawCharData.totalUltHitBlast / rawCharData.totalUltBlast) * 1000) / 10 : 0,
      avgExa1Count: matches > 0 ? Math.round((rawCharData.totalExa1Count / matches) * 10) / 10 : 0,
      avgExa2Count: matches > 0 ? Math.round((rawCharData.totalExa2Count / matches) * 10) / 10 : 0,
      avgThrows: matches > 0 ? Math.round((rawCharData.totalThrows / matches) * 10) / 10 : 0,
      avgVanishingAttacks: matches > 0 ? Math.round((rawCharData.totalVanishingAttacks / matches) * 10) / 10 : 0,
      avgDragonHoming: matches > 0 ? Math.round((rawCharData.totalDragonHoming / matches) * 10) / 10 : 0,
      avgLightningAttacks: matches > 0 ? Math.round((rawCharData.totalLightningAttacks / matches) * 10) / 10 : 0,
      avgSpeedImpacts: matches > 0 ? Math.round((rawCharData.totalSpeedImpacts / matches) * 10) / 10 : 0,
      avgSpeedImpactWins: matches > 0 ? Math.round((rawCharData.totalSpeedImpactWins / matches) * 10) / 10 : 0,
      avgGuards: matches > 0 ? Math.round((rawCharData.totalGuards / matches) * 10) / 10 : 0,
      avgZCounters: matches > 0 ? Math.round((rawCharData.totalZCounters / matches) * 10) / 10 : 0,
      avgSuperCounters: matches > 0 ? Math.round((rawCharData.totalSuperCounters / matches) * 10) / 10 : 0,
      avgRevengeCounters: matches > 0 ? Math.round((rawCharData.totalRevengeCounters / matches) * 10) / 10 : 0,
      avgSparkingCount: matches > 0 ? Math.round((rawCharData.totalSparkingCount / matches) * 10) / 10 : 0,
      avgDragonDashDistance: matches > 0 ? Math.round(rawCharData.totalDragonDashDistance / matches) : 0,
      avgEnergyBlasts: matches > 0 ? Math.round((rawCharData.totalEnergyBlasts / matches) * 10) / 10 : 0,
      avgCharges: matches > 0 ? Math.round((rawCharData.totalCharges / matches) * 10) / 10 : 0,
      avgTags: matches > 0 ? Math.round((rawCharData.totalTags / matches) * 10) / 10 : 0
    };
    
    // Build type distribution for this character with action averages
    const buildTypeDistribution = Object.keys(rawCharData.buildTypeUsage || {}).map(buildType => {
      const buildData = rawCharData.buildTypeUsage[buildType];
      const buildActions = rawCharData.buildTypeActions?.[buildType];
      const buildCount = buildData.count;
      
      return {
        buildType,
        count: buildCount,
        percentage: Math.round((buildCount / matches) * 1000) / 10,
        winRate: buildCount > 0 ? Math.round((buildData.wins / buildCount) * 1000) / 10 : 0,
        // Add action averages for this build type
        actionAverages: buildActions ? {
          energyBlasts: Math.round((buildActions.totalEnergyBlasts / buildCount) * 10) / 10,
          throws: Math.round((buildActions.totalThrows / buildCount) * 10) / 10,
          vanishingAttacks: Math.round((buildActions.totalVanishingAttacks / buildCount) * 10) / 10,
          guards: Math.round((buildActions.totalGuards / buildCount) * 10) / 10,
          zCounters: Math.round((buildActions.totalZCounters / buildCount) * 10) / 10,
          superCounters: Math.round((buildActions.totalSuperCounters / buildCount) * 10) / 10,
          revengeCounters: Math.round((buildActions.totalRevengeCounters / buildCount) * 10) / 10,
          charges: Math.round((buildActions.totalCharges / buildCount) * 10) / 10,
          dragonDashDistance: Math.round(buildActions.totalDragonDashDistance / buildCount),
          s1Blast: Math.round((buildActions.totalS1Blast / buildCount) * 10) / 10,
          s2Blast: Math.round((buildActions.totalS2Blast / buildCount) * 10) / 10,
          ultBlast: Math.round((buildActions.totalUltBlast / buildCount) * 10) / 10,
          sparkingCount: Math.round((buildActions.totalSparkingCount / buildCount) * 10) / 10,
          tags: Math.round((buildActions.totalTags / buildCount) * 10) / 10,
          maxCombo: Math.round((buildActions.totalMaxCombo / buildCount) * 10) / 10
        } : null
      };
    }).sort((a, b) => b.count - a.count);
    
    // Process top capsules for this character with action averages
    const topCapsules = Object.values(rawCharData.capsuleUsage || {})
      .map(cap => {
        const capsuleActions = rawCharData.capsuleActions?.[cap.id];
        const capsuleCount = cap.count;
        
        return {
          id: cap.id,
          name: cap.name,
          count: capsuleCount,
          winRate: capsuleCount > 0 ? Math.round((cap.wins / capsuleCount) * 1000) / 10 : 0,
          // Add action averages for this capsule
          actionAverages: capsuleActions ? {
            energyBlasts: Math.round((capsuleActions.totalEnergyBlasts / capsuleCount) * 10) / 10,
            throws: Math.round((capsuleActions.totalThrows / capsuleCount) * 10) / 10,
            vanishingAttacks: Math.round((capsuleActions.totalVanishingAttacks / capsuleCount) * 10) / 10,
            guards: Math.round((capsuleActions.totalGuards / capsuleCount) * 10) / 10,
            zCounters: Math.round((capsuleActions.totalZCounters / capsuleCount) * 10) / 10,
            superCounters: Math.round((capsuleActions.totalSuperCounters / capsuleCount) * 10) / 10,
            revengeCounters: Math.round((capsuleActions.totalRevengeCounters / capsuleCount) * 10) / 10,
            charges: Math.round((capsuleActions.totalCharges / capsuleCount) * 10) / 10,
            dragonDashDistance: Math.round(capsuleActions.totalDragonDashDistance / capsuleCount),
            s1Blast: Math.round((capsuleActions.totalS1Blast / capsuleCount) * 10) / 10,
            s2Blast: Math.round((capsuleActions.totalS2Blast / capsuleCount) * 10) / 10,
            ultBlast: Math.round((capsuleActions.totalUltBlast / capsuleCount) * 10) / 10,
            sparkingCount: Math.round((capsuleActions.totalSparkingCount / capsuleCount) * 10) / 10,
            tags: Math.round((capsuleActions.totalTags / capsuleCount) * 10) / 10,
            maxCombo: Math.round((capsuleActions.totalMaxCombo / capsuleCount) * 10) / 10
          } : null
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Create character usage array with just this character
    const characterList = [{
      name: characterName,
      matches: matches,
      winRate: winRate,
      avgDamage: avgDamageDealt,
      performanceDelta: 0,
      mostUsedBuildType: buildTypeDistribution.length > 0 ? buildTypeDistribution[0].buildType : 'N/A'
    }];
    
    // Create filtered AI object with recalculated metrics
    filtered[aiName] = {
      ...ai,
      // Override all main metrics with character-specific data
      totalMatches: matches,
      winCount: wins,
      lossCount: losses,
      winRate: winRate,
      combatPerformanceScore: combatPerformanceScore,
      avgSurvivalRate: survivalRate,
      avgKills: avgKills,
      uniqueCharacters: 1, // Only one character when filtered
      
      // Override all raw stats
      ...rawStats,
      avgBattleTime: Math.round(avgBattleTime * 10) / 10,
      damageEfficiency: Math.round(damageEfficiency * 100) / 100,
      avgDPS: Math.round(avgDPS),
      
      // Override character usage to show only this character
      characterUsage: characterList,
      
      // Override build type distribution and capsules with character-specific data
      buildTypeDistribution: buildTypeDistribution,
      topCapsules: topCapsules,
      
      // Flag that this is character-filtered
      _characterFiltered: true,
      _characterName: characterName,
      _characterBaseline: characterBaseline, // Character's baseline across all AIs
      
      // Keep original data for comparison
      _unfilteredTotalMatches: ai.totalMatches,
      _unfilteredWinRate: ai.winRate,
      _unfilteredWinCount: ai.winCount,
      _unfilteredLossCount: ai.lossCount,
      _unfilteredPerformanceScore: ai.combatPerformanceScore
    };
  });
  
  return filtered;
}
