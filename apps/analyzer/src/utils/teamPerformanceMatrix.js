/**
 * Team Performance Matrix Generator
 * 
 * Creates a hierarchical pivot table showing team aggregates with characters grouped beneath.
 * All stats from Character Averages are included with proper totals/averages at team level.
 */

/**
 * Process character data into team-grouped structure
 * IMPORTANT: Characters are filtered to only include matches played ON that specific team
 * @param {Array} characterData - Aggregated character performance data
 * @returns {Array} Team groups with aggregated stats and character details
 */
export function processTeamGroups(characterData) {
  // Group characters by team, filtering matches to only those for that specific team
  const teamMap = new Map();
  
  characterData.forEach(character => {
    // Get all teams this character played on
    if (character.matches && Array.isArray(character.matches)) {
      const teamMatches = new Map(); // teamName -> array of matches
      
      character.matches.forEach(match => {
        const teamName = match.team || 'No Team';
        if (!teamMatches.has(teamName)) {
          teamMatches.set(teamName, []);
        }
        teamMatches.get(teamName).push(match);
      });
      
      // Create a separate character entry for each team they played on
      teamMatches.forEach((matches, teamName) => {
        if (!teamMap.has(teamName)) {
          teamMap.set(teamName, {
            teamName,
            characters: []
          });
        }
        
        // Recalculate ALL character stats based ONLY on matches for this team
        const teamSpecificCharacter = recalculateCharacterStatsForTeam(character, matches, teamName);
        teamMap.get(teamName).characters.push(teamSpecificCharacter);
      });
    }
  });
  
  // Convert to array (sorting will happen after aggregates are calculated)
  const teams = Array.from(teamMap.values());
  
  // Calculate team-level aggregates for each team
  teams.forEach(team => {
    calculateTeamAggregates(team);
  });
  
  // Sort teams by win rate (descending), then by matches (descending) as tiebreaker
  teams.sort((a, b) => {
    const aWinRate = a.aggregates?.winRate || 0;
    const bWinRate = b.aggregates?.winRate || 0;
    
    // Primary sort: Win rate (descending)
    if (bWinRate !== aWinRate) {
      return bWinRate - aWinRate;
    }
    
    // Secondary sort: Total matches (descending, more experienced teams ranked higher)
    const aMatches = a.aggregates?.matchCount || 0;
    const bMatches = b.aggregates?.matchCount || 0;
    return bMatches - aMatches;
  });
  
  return teams;
}

/**
 * Recalculate character stats based only on matches for a specific team
 * Matches the logic from getTeamAggregatedData in App.jsx
 */
function recalculateCharacterStatsForTeam(character, teamMatches, teamName) {
  const matchCount = teamMatches.length;
  const activeMatchCount = teamMatches.filter(m => m.battleDuration && m.battleDuration > 0).length;
  
  // Aggregate stats from team-specific matches only
  const totalDamage = teamMatches.reduce((sum, m) => sum + (m.damageDone || 0), 0);
  const totalTaken = teamMatches.reduce((sum, m) => sum + (m.damageTaken || 0), 0);
  const totalHealth = teamMatches.reduce((sum, m) => sum + (m.hPGaugeValue || 0), 0);
  const totalBattleTime = teamMatches.reduce((sum, m) => sum + (m.battleTime || 0), 0);
  const totalHPGaugeValueMax = teamMatches.reduce((sum, m) => sum + (m.hPGaugeValueMax || 0), 0);
  const totalSPM1 = teamMatches.reduce((sum, m) => sum + (m.spm1Count || 0), 0);
  const totalSPM2 = teamMatches.reduce((sum, m) => sum + (m.spm2Count || 0), 0);
  const totalEXA1 = teamMatches.reduce((sum, m) => sum + (m.exa1Count || 0), 0);
  const totalEXA2 = teamMatches.reduce((sum, m) => sum + (m.exa2Count || 0), 0);
  const totalUltimates = teamMatches.reduce((sum, m) => sum + (m.ultimatesUsed || 0), 0);
  const totalEnergyBlasts = teamMatches.reduce((sum, m) => sum + (m.shotEnergyBulletCount || 0), 0);
  const totalCharges = teamMatches.reduce((sum, m) => sum + (m.chargeCount || 0), 0);
  const totalSparking = teamMatches.reduce((sum, m) => sum + (m.sparkingCount || 0), 0);
  const totalGuards = teamMatches.reduce((sum, m) => sum + (m.guardCount || 0), 0);
  const totalRevengeCounters = teamMatches.reduce((sum, m) => sum + (m.revengeCounterCount || 0), 0);
  const totalSuperCounters = teamMatches.reduce((sum, m) => sum + (m.superCounterCount || 0), 0);
  const totalZCounters = teamMatches.reduce((sum, m) => sum + (m.zCounterCount || 0), 0);
  const totalThrows = teamMatches.reduce((sum, m) => sum + (m.throwCount || 0), 0);
  const totalLightningAttacks = teamMatches.reduce((sum, m) => sum + (m.lightningAttackCount || 0), 0);
  const totalVanishingAttacks = teamMatches.reduce((sum, m) => sum + (m.vanishingAttackCount || 0), 0);
  const totalDragonHoming = teamMatches.reduce((sum, m) => sum + (m.dragonHomingCount || 0), 0);
  const totalSpeedImpacts = teamMatches.reduce((sum, m) => sum + (m.speedImpactCount || 0), 0);
  const totalSpeedImpactWins = teamMatches.reduce((sum, m) => sum + (m.speedImpactWins || 0), 0);
  const totalDragonDashMileage = teamMatches.reduce((sum, m) => sum + (m.dragonDashMileage || 0), 0);
  const totalMaxCombo = teamMatches.reduce((sum, m) => sum + (m.maxComboNum || 0), 0);
  const totalMaxComboDamage = teamMatches.reduce((sum, m) => sum + (m.maxComboDamage || 0), 0);
  const totalKills = teamMatches.reduce((sum, m) => sum + (m.kills || 0), 0);
  const totalDamageCaps = teamMatches.reduce((sum, m) => sum + (m.capsuleTypes?.damage || 0), 0);
  const totalDefensiveCaps = teamMatches.reduce((sum, m) => sum + (m.capsuleTypes?.defensive || 0), 0);
  const totalUtilityCaps = teamMatches.reduce((sum, m) => sum + (m.capsuleTypes?.utility || 0), 0);
  
  const wins = teamMatches.filter(m => m.won).length;
  const losses = matchCount - wins;
  
  // Calculate averages
  const denom = activeMatchCount > 0 ? activeMatchCount : matchCount;
  const avgDamage = Math.round(totalDamage / Math.max(denom, 1));
  const avgTaken = Math.round(totalTaken / Math.max(denom, 1));
  const avgHealth = Math.round(totalHealth / Math.max(denom, 1));
  const avgBattleTime = Math.round((totalBattleTime / Math.max(denom, 1)) * 10) / 10;
  const avgHPGaugeValueMax = Math.round(totalHPGaugeValueMax / Math.max(denom, 1));
  const avgSPM1 = Math.round((totalSPM1 / Math.max(denom, 1)) * 10) / 10;
  const avgSPM2 = Math.round((totalSPM2 / Math.max(denom, 1)) * 10) / 10;
  const avgEXA1 = Math.round((totalEXA1 / Math.max(denom, 1)) * 10) / 10;
  const avgEXA2 = Math.round((totalEXA2 / Math.max(denom, 1)) * 10) / 10;
  const avgUltimates = Math.round((totalUltimates / Math.max(denom, 1)) * 10) / 10;
  const avgEnergyBlasts = Math.round((totalEnergyBlasts / Math.max(denom, 1)) * 10) / 10;
  const avgCharges = Math.round((totalCharges / Math.max(denom, 1)) * 10) / 10;
  const avgSparking = Math.round((totalSparking / Math.max(denom, 1)) * 10) / 10;
  const avgGuards = Math.round((totalGuards / Math.max(denom, 1)) * 10) / 10;
  const avgRevengeCounters = Math.round((totalRevengeCounters / Math.max(denom, 1)) * 10) / 10;
  const avgSuperCounters = Math.round((totalSuperCounters / Math.max(denom, 1)) * 10) / 10;
  const avgZCounters = Math.round((totalZCounters / Math.max(denom, 1)) * 10) / 10;
  const avgThrows = Math.round((totalThrows / Math.max(denom, 1)) * 10) / 10;
  const avgLightningAttacks = Math.round((totalLightningAttacks / Math.max(denom, 1)) * 10) / 10;
  const avgVanishingAttacks = Math.round((totalVanishingAttacks / Math.max(denom, 1)) * 10) / 10;
  const avgDragonHoming = Math.round((totalDragonHoming / Math.max(denom, 1)) * 10) / 10;
  const avgSpeedImpacts = Math.round((totalSpeedImpacts / Math.max(denom, 1)) * 10) / 10;
  const avgSpeedImpactWins = Math.round((totalSpeedImpactWins / Math.max(denom, 1)) * 10) / 10;
  const avgDragonDashMileage = Math.round((totalDragonDashMileage / Math.max(denom, 1)) * 10) / 10;
  const avgMaxCombo = Math.round((totalMaxCombo / Math.max(denom, 1)) * 10) / 10;
  const avgMaxComboDamage = Math.round(totalMaxComboDamage / Math.max(denom, 1));
  const avgKills = Math.round((totalKills / Math.max(denom, 1)) * 10) / 10;
  const avgDamageCaps = Math.round((totalDamageCaps / Math.max(denom, 1)) * 10) / 10;
  const avgDefensiveCaps = Math.round((totalDefensiveCaps / Math.max(denom, 1)) * 10) / 10;
  const avgUtilityCaps = Math.round((totalUtilityCaps / Math.max(denom, 1)) * 10) / 10;
  
  // Calculate derived stats - use total-based efficiency (aggregate then calculate)
  const dps = Math.round((avgDamage / Math.max(avgBattleTime, 0.1)) * 10) / 10;
  const efficiency = totalTaken > 0 ? Math.round((totalDamage / totalTaken) * 100) / 100 : 0;
  const healthRetention = avgHPGaugeValueMax > 0 ? (avgHealth / avgHPGaugeValueMax) * 100 : 0;
  const winRate = matchCount > 0 ? (wins / matchCount) * 100 : 0;
  const speedImpactWinRate = totalSpeedImpacts > 0 ? Math.round((totalSpeedImpactWins / totalSpeedImpacts) * 1000) / 10 : 0;
  
  // Calculate combat performance score (same formula as App.jsx)
  const baseScore = (
    (avgDamage / 100000) * 35 +
    (efficiency) * 25 +
    (dps / 1000) * 25 +
    (healthRetention / 100) * 15
  );
  const experienceMultiplier = Math.min(1.25, 1.0 + ((activeMatchCount > 0 ? activeMatchCount : matchCount) - 1) * (0.25 / 11));
  const combatPerformanceScore = baseScore * experienceMultiplier;
  
  // Return character with recalculated stats for this team only
  return {
    ...character,
    primaryTeam: teamName,
    matchCount,
    activeMatchCount,
    wins,
    losses,
    matches: teamMatches,
    avgDamage,
    avgTaken,
    avgHealth,
    avgBattleTime,
    avgHPGaugeValueMax,
    avgSPM1,
    avgSPM2,
    avgEXA1,
    avgEXA2,
    avgUltimates,
    avgEnergyBlasts,
    avgCharges,
    avgSparking,
    avgGuards,
    avgRevengeCounters,
    avgSuperCounters,
    avgZCounters,
    avgThrows,
    avgLightningAttacks,
    avgVanishingAttacks,
    avgDragonHoming,
    avgSpeedImpacts,
    avgSpeedImpactWins,
    avgDragonDashMileage,
    avgMaxCombo,
    avgMaxComboDamage,
    avgKills,
    avgDamageCaps,
    avgDefensiveCaps,
    avgUtilityCaps,
    totalKills,
    dps,
    efficiency,
    healthRetention,
    winRate,
    speedImpactWinRate,
    combatPerformanceScore
  };
}

/**
 * Calculate aggregate statistics at the team level
 * Uses top 5 characters (by combat score) for most stats
 * Matches the logic from getTeamAggregatedData in App.jsx
 * @param {Object} team - Team object with characters array
 */
function calculateTeamAggregates(team) {
  const characters = team.characters;
  
  if (characters.length === 0) return;
  
  // Sort characters by combat performance score (descending) and get top 5
  const top5Characters = [...characters]
    .sort((a, b) => (b.combatPerformanceScore || 0) - (a.combatPerformanceScore || 0))
    .slice(0, 5);
  
  // Calculate team wins, losses, and match count based on unique matches
  // Use fileName as unique match identifier (one file = one team match)
  const uniqueMatches = new Map();
  characters.forEach(char => {
    if (char.matches && Array.isArray(char.matches)) {
      char.matches.forEach(match => {
        if (match.fileName && match.team === team.teamName) {
          // Use fileName as unique match identifier
          if (!uniqueMatches.has(match.fileName)) {
            uniqueMatches.set(match.fileName, match.won);
          }
        }
      });
    }
  });
  
  const totalUniqueMatches = uniqueMatches.size;
  const teamWins = Array.from(uniqueMatches.values()).filter(won => won).length;
  const teamLosses = totalUniqueMatches - teamWins;
  const winRate = totalUniqueMatches > 0 ? (teamWins / totalUniqueMatches) * 100 : 0;
  
  // Calculate top 5 HP totals first (needed for HP retention)
  const top5TotalMaxHP = sumTop5(top5Characters, 'avgHPGaugeValueMax');
  const top5TotalHPLeft = sumTop5(top5Characters, 'avgHealth');
  
  // Calculate HP Retention % for team: (HP Left / Max HP) * 100
  const hpRetention = top5TotalMaxHP > 0 ? Math.round((top5TotalHPLeft / top5TotalMaxHP) * 1000) / 10 : 0;
  
  // Initialize aggregates
  team.aggregates = {
    matchCount: totalUniqueMatches, // Use unique match count (one file = one match)
    wins: teamWins,                  // Add wins column
    losses: teamLosses,              // Add losses column
    winRate: Math.round(winRate * 10) / 10, // Win rate as percentage with 1 decimal
    
    // Combat Performance - TOP 5 TOTALS (not averages)
    top5TotalDamage: sumTop5(top5Characters, 'avgDamage'),
    top5TotalTaken: sumTop5(top5Characters, 'avgTaken'),
    top5Efficiency: 0, // Calculated after damage totals
    top5TotalDPS: weightedAverageTop5(top5Characters, 'dps', 'matchCount'),
    top5TotalCombatScore: sum(top5Characters, 'combatPerformanceScore'),
    avgBattleTime: weightedAverageTop5(top5Characters, 'avgBattleTime', 'matchCount'),
    totalKills: sum(characters, 'totalKills'),
    avgKills: weightedAverageTop5(top5Characters, 'avgKills', 'matchCount'),
    
    // Survival & Health - TOP 5 TOTALS
    top5TotalMaxHP: top5TotalMaxHP,
    top5TotalHPLeft: top5TotalHPLeft,
    hpRetention: hpRetention,
    survivalRate: '-', // Survival rate is not relevant for teams
    top5TotalGuards: sumTop5(top5Characters, 'avgGuards'),
    top5TotalRevengeCounters: sumTop5(top5Characters, 'avgRevengeCounters'),
    top5TotalSuperCounters: sumTop5(top5Characters, 'avgSuperCounters'),
    top5TotalZCounters: sumTop5(top5Characters, 'avgZCounters'),
    top5TotalTags: sumTop5(top5Characters, 'avgTags'),
    
    // Special Abilities - TOP 5 TOTALS
    // NEW blast tracking
    top5TotalS1Blast: sumTop5(top5Characters, 'avgS1Blast'),
    top5TotalS1Hit: sumTop5(top5Characters, 'avgS1Hit'),
    top5S1HitRate: weightedAverageTop5(top5Characters, 's1HitRateOverall', 'matchCount'),
    top5TotalS2Blast: sumTop5(top5Characters, 'avgS2Blast'),
    top5TotalS2Hit: sumTop5(top5Characters, 'avgS2Hit'),
    top5S2HitRate: weightedAverageTop5(top5Characters, 's2HitRateOverall', 'matchCount'),
    top5TotalUltBlast: sumTop5(top5Characters, 'avgUltBlast'),
    top5TotalUltHit: sumTop5(top5Characters, 'avgUltHit'),
    top5UltHitRate: weightedAverageTop5(top5Characters, 'ultHitRateOverall', 'matchCount'),
    // Legacy
    top5TotalSuper1: sumTop5(top5Characters, 'avgSPM1'),
    top5TotalSuper2: sumTop5(top5Characters, 'avgSPM2'),
    top5TotalSkill1: sumTop5(top5Characters, 'avgEXA1'),
    top5TotalSkill2: sumTop5(top5Characters, 'avgEXA2'),
    top5TotalUltimates: sumTop5(top5Characters, 'avgUltimates'),
    top5TotalKiBlasts: sumTop5(top5Characters, 'avgEnergyBlasts'),
    top5TotalCharges: sumTop5(top5Characters, 'avgCharges'),
    top5TotalSparkings: sumTop5(top5Characters, 'avgSparking'),
    top5TotalDragonDashMileage: sumTop5(top5Characters, 'avgDragonDashMileage'),
    
    // Combat Mechanics - TOP 5 AVERAGES
    avgMaxCombo: weightedAverageTop5(top5Characters, 'avgMaxCombo', 'matchCount'),
    avgMaxComboDamage: weightedAverageTop5(top5Characters, 'avgMaxComboDamage', 'matchCount'),
    top5TotalThrows: sumTop5(top5Characters, 'avgThrows'),
    top5TotalLightning: sumTop5(top5Characters, 'avgLightningAttacks'),
    top5TotalVanishing: sumTop5(top5Characters, 'avgVanishingAttacks'),
    top5TotalDragonHoming: sumTop5(top5Characters, 'avgDragonHoming'),
    top5TotalSpeedImpacts: sumTop5(top5Characters, 'avgSpeedImpacts'),
    speedImpactWinRate: weightedAverageTop5(top5Characters, 'speedImpactWinRate', 'matchCount'),
    avgSparkingCombo: weightedAverageTop5(top5Characters, 'avgSparkingCombo', 'matchCount'),
    
    // Build & Equipment - TOP 5 TOTALS and most common from top 5
    buildArchetype: getMostCommon(top5Characters, 'buildArchetype'),
    top5TotalDamageCapsules: sumTop5(top5Characters, 'avgDamageCaps'),
    top5TotalDefenseCapsules: sumTop5(top5Characters, 'avgDefensiveCaps'),
    top5TotalUtilityCapsules: sumTop5(top5Characters, 'avgUtilityCaps'),
    topCapsules: combineMostCommon(top5Characters, 'topCapsules'),
    
    // Form Changes - aggregate values from top 5
    hasMultipleForms: top5Characters.some(c => c.hasMultipleForms === 'Yes') ? 'Yes' : 'No',
    formHistory: combineFormHistory(top5Characters)
  };
  
  // Calculate efficiency from top 5 damage totals
  if (team.aggregates.top5TotalTaken > 0) {
    team.aggregates.top5Efficiency = team.aggregates.top5TotalDamage / team.aggregates.top5TotalTaken;
  }
}

/**
 * Calculate weighted average (weight by match count)
 */
function weightedAverage(characters, field, weightField) {
  let totalWeight = 0;
  let weightedSum = 0;
  
  characters.forEach(char => {
    const value = char[field];
    // Prefer activeMatchCount when available, then provided weightField, then matchCount
    const weight = (char.activeMatchCount && char.activeMatchCount > 0) ? char.activeMatchCount : (char[weightField] || char.matchCount || 0);
    
    if (typeof value === 'number' && !isNaN(value) && weight > 0) {
      weightedSum += value * weight;
      totalWeight += weight;
    }
  });
  
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Calculate weighted average for top 5 characters only
 */
function weightedAverageTop5(top5Characters, field, weightField) {
  let totalWeight = 0;
  let weightedSum = 0;
  
  top5Characters.forEach(char => {
    const value = char[field];
    // Prefer activeMatchCount when available, then provided weightField, then matchCount
    const weight = (char.activeMatchCount && char.activeMatchCount > 0) ? char.activeMatchCount : (char[weightField] || char.matchCount || 0);
    
    if (typeof value === 'number' && !isNaN(value) && weight > 0) {
      weightedSum += value * weight;
      totalWeight += weight;
    }
  });
  
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Calculate sum of top 5 characters' stats (weighted by match count for averages)
 * For per-match averages, multiply by match count to get totals
 */
function sumTop5(top5Characters, field) {
  // Sum just the averages for the top 5
  let total = 0;
  top5Characters.forEach(char => {
    const value = char[field];
    if (typeof value === 'number' && !isNaN(value)) {
      total += value;
    }
  });
  return Math.round(total * 10) / 10;
}

/**
 * Calculate sum of a field across characters
 */
function sum(characters, field) {
  return characters.reduce((total, char) => {
    const value = char[field];
    return total + (typeof value === 'number' ? value : 0);
  }, 0);
}

/**
 * Get most common value for a field
 */
function getMostCommon(characters, field) {
  const counts = new Map();
  let maxCount = 0;
  let mostCommon = '';
  
  characters.forEach(char => {
    const value = char[field];
    if (value) {
      const count = (counts.get(value) || 0) + 1;
      counts.set(value, count);
      
      if (count > maxCount) {
        maxCount = count;
        mostCommon = value;
      }
    }
  });
  
  return mostCommon || 'Mixed';
}

/**
 * Combine most common capsules across characters
 */
function combineMostCommon(characters, field) {
  const capsuleMap = new Map();
  
  characters.forEach(char => {
    const capsules = char[field];
    if (typeof capsules === 'string') {
      capsules.split(',').forEach(capsule => {
        const trimmed = capsule.trim();
        if (trimmed) {
          capsuleMap.set(trimmed, (capsuleMap.get(trimmed) || 0) + 1);
        }
      });
    }
  });
  
  // Get top 3 most common
  const sorted = Array.from(capsuleMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([capsule]) => capsule);
  
  return sorted.join(', ');
}

/**
 * Combine form history from all characters
 */
function combineFormHistory(characters) {
  const forms = new Set();
  
  characters.forEach(char => {
    if (char.formHistory) {
      char.formHistory.split(',').forEach(form => {
        const trimmed = form.trim();
        if (trimmed) {
          forms.add(trimmed);
        }
      });
    }
  });
  
  return Array.from(forms).join(', ');
}
