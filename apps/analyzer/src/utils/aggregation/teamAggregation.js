import { getTeams, extractStats } from '../statCalculations.js';
import { calculatePerFormStats } from '../formStatsCalculator.js';

// Recompute team character averages from a filtered subset of raw match data.
// Used by the build filter feature in the teams view to re-scope stats without full re-aggregation
export function recomputeTeamCharStats(rawMatches, originalStats) {
  const activeMatches = rawMatches.filter(m => m.battleDuration && m.battleDuration > 0);
  const matchesToAggregate = activeMatches.length > 0 ? activeMatches : rawMatches;
  const matchCount = rawMatches.length;
  const activeMatchCount = matchesToAggregate.length;
  const denom = Math.max(activeMatchCount, 1);

  const totalDamageDealt = matchesToAggregate.reduce((s, m) => s + (m.damageDealt || 0), 0);
  const totalDamageTaken = matchesToAggregate.reduce((s, m) => s + (m.damageTaken || 0), 0);
  const totalBattleDuration = matchesToAggregate.reduce((s, m) => s + (m.battleDuration || 0), 0);
  const totalHealthRemaining = matchesToAggregate.reduce((s, m) => s + (m.healthRemaining || 0), 0);
  const totalHealthMax = matchesToAggregate.reduce((s, m) => s + (m.healthMax || 0), 0);

  const avgDamageDealt = Math.round(totalDamageDealt / denom);
  const avgDamageTaken = Math.round(totalDamageTaken / denom);
  const avgBattleDuration = totalBattleDuration / denom;
  const avgHealthRemaining = totalHealthRemaining / denom;
  const avgHealthMax = totalHealthMax / denom;

  const damageEfficiency = totalDamageTaken > 0
    ? Math.round((totalDamageDealt / totalDamageTaken) * 100) / 100
    : (totalDamageDealt > 0 ? 999 : 0);
  const damagePerSecond = totalBattleDuration > 0
    ? Math.round((totalDamageDealt / totalBattleDuration) * 100) / 100 : 0;
  const healthRetention = avgHealthMax > 0 ? avgHealthRemaining / avgHealthMax : 0;

  const baseScore = ((avgDamageDealt / 100000) * 35) + (damageEfficiency * 25) + ((damagePerSecond / 1000) * 25) + (healthRetention * 15);
  const experienceMultiplier = Math.min(1.25, 1.0 + (activeMatchCount - 1) * (0.25 / 11));
  const performanceScore = Math.round((baseScore * experienceMultiplier) * 100) / 100;

  const totalSpecialMoves = rawMatches.reduce((s, m) => s + (m.specialMovesUsed || 0), 0);
  const totalUltimates = rawMatches.reduce((s, m) => s + (m.ultimatesUsed || 0), 0);
  const totalSPM1 = rawMatches.reduce((s, m) => s + (m.spm1Count || 0), 0);
  const totalSPM2 = rawMatches.reduce((s, m) => s + (m.spm2Count || 0), 0);
  const totalEXA1 = rawMatches.reduce((s, m) => s + (m.exa1Count || 0), 0);
  const totalEXA2 = rawMatches.reduce((s, m) => s + (m.exa2Count || 0), 0);
  const totalS1Blast = rawMatches.reduce((s, m) => s + (m.s1Blast || m.spm1Count || 0), 0);
  const totalS2Blast = rawMatches.reduce((s, m) => s + (m.s2Blast || m.spm2Count || 0), 0);
  const totalUltBlast = rawMatches.reduce((s, m) => s + (m.ultBlast || 0), 0);
  const totalS1HitBlast = rawMatches.reduce((s, m) => s + (m.s1HitBlast || 0), 0);
  const totalS2HitBlast = rawMatches.reduce((s, m) => s + (m.s2HitBlast || 0), 0);
  const totalULTHitBlast = rawMatches.reduce((s, m) => s + (m.uLTHitBlast || 0), 0);
  const totalS1BlastTrackable = rawMatches.reduce((s, m) => s + ((m.s1HitBlast !== undefined && m.s1HitBlast !== null) ? (m.s1Blast || 0) : 0), 0);
  const totalS2BlastTrackable = rawMatches.reduce((s, m) => s + ((m.s2HitBlast !== undefined && m.s2HitBlast !== null) ? (m.s2Blast || 0) : 0), 0);
  const totalUltBlastTrackable = rawMatches.reduce((s, m) => s + ((m.uLTHitBlast !== undefined && m.uLTHitBlast !== null) ? (m.ultBlast || 0) : 0), 0);
  const totalTags = rawMatches.reduce((s, m) => s + (m.tags || 0), 0);
  const totalTransformations = rawMatches.reduce((s, m) => s + (m.formChangeCount || 0), 0);
  const totalSparking = rawMatches.reduce((s, m) => s + (m.sparkingCount || 0), 0);
  const totalCharges = rawMatches.reduce((s, m) => s + (m.chargeCount || 0), 0);
  const totalGuards = rawMatches.reduce((s, m) => s + (m.guardCount || 0), 0);
  const totalEnergyBlasts = rawMatches.reduce((s, m) => s + (m.shotEnergyBulletCount || 0), 0);
  const totalZCounters = rawMatches.reduce((s, m) => s + (m.zCounterCount || 0), 0);
  const totalSuperCounters = rawMatches.reduce((s, m) => s + (m.superCounterCount || 0), 0);
  const totalRevengeCounters = rawMatches.reduce((s, m) => s + (m.revengeCounterCount || 0), 0);
  const totalMaxComboNum = rawMatches.reduce((s, m) => s + (m.maxComboNum || 0), 0);
  const totalMaxComboDamage = rawMatches.reduce((s, m) => s + (m.maxComboDamage || 0), 0);
  const totalThrows = rawMatches.reduce((s, m) => s + (m.throwCount || 0), 0);
  const totalDragonHoming = rawMatches.reduce((s, m) => s + (m.dragonHomingCount || 0), 0);
  const totalSpeedImpacts = rawMatches.reduce((s, m) => s + (m.speedImpactCount || 0), 0);
  const totalSpeedImpactWins = rawMatches.reduce((s, m) => s + (m.speedImpactWins || 0), 0);
  const totalSparkingCombo = rawMatches.reduce((s, m) => s + (m.sparkingComboCount || 0), 0);
  const totalDragonDashMileage = rawMatches.reduce((s, m) => s + (m.dragonDashMileage || 0), 0);
  const totalKills = rawMatches.reduce((s, m) => s + (m.kills || 0), 0);
  const speedImpactWinRate = totalSpeedImpacts > 0
    ? Math.round((totalSpeedImpactWins / totalSpeedImpacts) * 1000) / 10 : 0;

  return {
    ...originalStats,
    avgDamageDealt,
    avgDamageTaken,
    avgDamageEfficiency: damageEfficiency,
    avgDamagePerSecond: damagePerSecond,
    avgHealthRetention: healthRetention,
    avgHealthMax: Math.round(avgHealthMax),
    avgHealthRemaining: Math.round(avgHealthRemaining),
    avgBattleDuration: Math.round(avgBattleDuration),
    performanceScore,
    matchesPlayed: matchCount,
    activeMatchesPlayed: activeMatchCount,
    avgSpecialMoves: Math.round((totalSpecialMoves / denom) * 10) / 10,
    avgUltimates: Math.round((totalUltimates / denom) * 100) / 100,
    avgSPM1: Math.round((totalSPM1 / denom) * 100) / 100,
    avgSPM2: Math.round((totalSPM2 / denom) * 100) / 100,
    avgEXA1: Math.round((totalEXA1 / denom) * 100) / 100,
    avgEXA2: Math.round((totalEXA2 / denom) * 100) / 100,
    avgS1Blast: Math.round((totalS1Blast / denom) * 100) / 100,
    avgS2Blast: Math.round((totalS2Blast / denom) * 100) / 100,
    avgUltBlast: Math.round((totalUltBlast / denom) * 100) / 100,
    avgS1Hit: Math.round((totalS1HitBlast / denom) * 100) / 100,
    avgS2Hit: Math.round((totalS2HitBlast / denom) * 100) / 100,
    avgUltHit: Math.round((totalULTHitBlast / denom) * 100) / 100,
    s1HitRateOverall: totalS1BlastTrackable > 0 ? Math.round((totalS1HitBlast / totalS1BlastTrackable) * 1000) / 10 : null,
    s2HitRateOverall: totalS2BlastTrackable > 0 ? Math.round((totalS2HitBlast / totalS2BlastTrackable) * 1000) / 10 : null,
    ultHitRateOverall: totalUltBlastTrackable > 0 ? Math.round((totalULTHitBlast / totalUltBlastTrackable) * 1000) / 10 : null,
    avgTags: Math.round((totalTags / denom) * 100) / 100,
    totalTags,
    avgTransformations: Math.round((totalTransformations / denom) * 100) / 100,
    avgSparking: Math.round((totalSparking / denom) * 100) / 100,
    avgCharges: Math.round((totalCharges / denom) * 10) / 10,
    avgGuards: Math.round((totalGuards / denom) * 10) / 10,
    avgEnergyBlasts: Math.round((totalEnergyBlasts / denom) * 10) / 10,
    avgZCounters: Math.round((totalZCounters / denom) * 100) / 100,
    avgSuperCounters: Math.round((totalSuperCounters / denom) * 100) / 100,
    avgRevengeCounters: Math.round((totalRevengeCounters / denom) * 100) / 100,
    avgMaxComboNum: Math.round((totalMaxComboNum / denom) * 10) / 10,
    avgMaxComboDamage: Math.round(totalMaxComboDamage / denom),
    avgThrows: Math.round((totalThrows / denom) * 100) / 100,
    avgDragonHoming: Math.round((totalDragonHoming / denom) * 100) / 100,
    avgSpeedImpacts: Math.round((totalSpeedImpacts / denom) * 100) / 100,
    speedImpactWinRate,
    avgSparkingCombo: Math.round((totalSparkingCombo / denom) * 10) / 10,
    avgDragonDashMileage: Math.round((totalDragonDashMileage / denom) * 10) / 10,
    avgKills: Math.round((totalKills / denom) * 100) / 100,
    // Keep topBuilds from the original so the full builds table is unchanged
    topBuilds: originalStats.topBuilds,
    rawMatches: originalStats.rawMatches,
  };
}

export function getTeamAggregatedData(files, charMap, capsuleMap = {}, aiStrategiesMap = {}) {
  const teamStats = {};
  
  files.forEach((file, index) => {
    if (file.error) return;
    
    let teams, battleWinLose, characterRecord, characterIdRecord = null;
    
    // Handle TeamBattleResults format (current BR_Data structure)
    if (file.content.TeamBattleResults) {
      teams = file.content.TeamBattleResults.teams;
      // Check for battleResult (lowercase r)
      if (file.content.TeamBattleResults.battleResult) {
        battleWinLose = file.content.TeamBattleResults.battleResult.battleWinLose;
        characterRecord = file.content.TeamBattleResults.battleResult.characterRecord;
        characterIdRecord = file.content.TeamBattleResults.battleResult.characterIdRecord;
      }
      // Check for BattleResults (capital R) - Cinema files format
      else if (file.content.TeamBattleResults.BattleResults) {
        battleWinLose = file.content.TeamBattleResults.BattleResults.battleWinLose;
        characterRecord = file.content.TeamBattleResults.BattleResults.characterRecord;
        characterIdRecord = file.content.TeamBattleResults.BattleResults.characterIdRecord;
      }
      // Check if data is directly in TeamBattleResults (new wrapper format)
      else if (file.content.TeamBattleResults.battleWinLose && file.content.TeamBattleResults.characterRecord) {
        battleWinLose = file.content.TeamBattleResults.battleWinLose;
        characterRecord = file.content.TeamBattleResults.characterRecord;
        characterIdRecord = file.content.TeamBattleResults.characterIdRecord;
      }
    }
    // Handle other formats
    else if (file.content.teams && Array.isArray(file.content.teams)) {
      teams = file.content.teams;
      if (file.content.teams[0]?.BattleResults) {
        battleWinLose = file.content.teams[0].BattleResults.battleWinLose;
        characterRecord = file.content.teams[0].BattleResults.characterRecord;
        characterIdRecord = file.content.teams[0].BattleResults.characterIdRecord;
      }
    }
    else if (file.content.BattleResults) {
      battleWinLose = file.content.BattleResults.battleWinLose;
      characterRecord = file.content.BattleResults.characterRecord;
      characterIdRecord = file.content.BattleResults.characterIdRecord;
      // Try to extract team names from file name or default
      teams = ["Team 1", "Team 2"];
    }
    
    if (!teams || !Array.isArray(teams) || teams.length < 1 || !battleWinLose || !characterRecord) {
      return;
    }
    
    const team1Name = teams[0];
    const team2Name = teams[1];
    
    // Check if team names are valid (not empty, null, undefined, or just whitespace)
    const isTeam1Valid = team1Name && typeof team1Name === 'string' && team1Name.trim() !== '';
    const isTeam2Valid = team2Name && typeof team2Name === 'string' && team2Name.trim() !== '';
    
    // Skip entirely if both teams are invalid
    if (!isTeam1Valid && !isTeam2Valid) {
      return;
    }
    
    // Determine which teams to process (only valid ones)
    const teamsToProcess = [];
    if (isTeam1Valid) teamsToProcess.push({ name: team1Name, isTeam1: true });
    if (isTeam2Valid) teamsToProcess.push({ name: team2Name, isTeam1: false });
    
    // Initialize team stats if they don't exist
    teamsToProcess.forEach(({ name: teamName }) => {
      if (!teamStats[teamName]) {
        teamStats[teamName] = {
          teamName,
          matches: 0,
          activeMatches: 0, // Track matches with battleDuration > 0
          wins: 0,
          losses: 0,
          winRate: 0,
          totalDamageDealt: 0,
          totalDamageTaken: 0,
          totalHealthRemaining: 0,
          totalHealthMax: 0,
          totalMatchDuration: 0, // Track total battle time across all matches
          avgDamagePerMatch: 0,
          avgDamageTakenPerMatch: 0,
          avgHealthRetention: 0,
          charactersUsed: new Set(),
          characterUsageCount: {},
          characterDetails: {},  // Store individual character match data
          characterAverages: {}, // Store calculated averages per character
          buildCompositions: {}, // New 7-category system - dynamic tracking
          matchHistory: [],
          opponentRecords: {}
        };
      }
    });
    
    // Process match result from team1's perspective
    const team1Won = battleWinLose === 'Win';
    const team2Won = battleWinLose === 'Lose';
    
    // Update win/loss records only for valid teams
    if (isTeam1Valid) {
      teamStats[team1Name].matches++;
      if (team1Won) teamStats[team1Name].wins++;
      else if (team2Won) teamStats[team1Name].losses++;
    }
    
    if (isTeam2Valid) {
      teamStats[team2Name].matches++;
      if (team2Won) teamStats[team2Name].wins++;
      else if (team1Won) teamStats[team2Name].losses++;
    }
    
    // Initialize opponent records only if both teams are valid
    if (isTeam1Valid && isTeam2Valid) {
      if (!teamStats[team1Name].opponentRecords[team2Name]) {
        teamStats[team1Name].opponentRecords[team2Name] = { wins: 0, losses: 0, characterMatchups: {} };
      }
      if (!teamStats[team2Name].opponentRecords[team1Name]) {
        teamStats[team2Name].opponentRecords[team1Name] = { wins: 0, losses: 0, characterMatchups: {} };
      }
      
      // Update head-to-head records
      if (team1Won) {
        teamStats[team1Name].opponentRecords[team2Name].wins++;
        teamStats[team2Name].opponentRecords[team1Name].losses++;
      } else if (team2Won) {
        teamStats[team1Name].opponentRecords[team2Name].losses++;
        teamStats[team2Name].opponentRecords[team1Name].wins++;
      }
    }
    
    // Process character data for both teams
    const teams_data = getTeams(characterRecord);
    const p1TeamStats = getTeamStats(teams_data.p1, charMap, capsuleMap);
    const p2TeamStats = getTeamStats(teams_data.p2, charMap, capsuleMap);
    
    // Check if this is an active match (has battle duration > 0)
    const isActiveMatch = p1TeamStats.totalBattleTime > 0 || p2TeamStats.totalBattleTime > 0;
    
    // Increment active match count for valid teams
    if (isActiveMatch) {
      if (isTeam1Valid) teamStats[team1Name].activeMatches++;
      if (isTeam2Valid) teamStats[team2Name].activeMatches++;
    }
    
    // Aggregate team 1 stats only if valid AND active match
    if (isTeam1Valid && isActiveMatch) {
      teamStats[team1Name].totalDamageDealt += p1TeamStats.totalDamage;
      teamStats[team1Name].totalDamageTaken += p1TeamStats.totalTaken;
      teamStats[team1Name].totalHealthRemaining += p1TeamStats.totalHealth;
      teamStats[team1Name].totalHealthMax += p1TeamStats.totalHPGaugeValueMax;
      teamStats[team1Name].totalMatchDuration += p1TeamStats.totalBattleTime;
    }
    
    // Aggregate team 2 stats only if valid AND active match
    if (isTeam2Valid && isActiveMatch) {
      teamStats[team2Name].totalDamageDealt += p2TeamStats.totalDamage;
      teamStats[team2Name].totalDamageTaken += p2TeamStats.totalTaken;
      teamStats[team2Name].totalHealthRemaining += p2TeamStats.totalHealth;
      teamStats[team2Name].totalHealthMax += p2TeamStats.totalHPGaugeValueMax;
      teamStats[team2Name].totalMatchDuration += p2TeamStats.totalBattleTime;
    }
    
    // Track character usage for team 1 only if valid
    if (isTeam1Valid) {
      teams_data.p1.forEach(char => {
      const stats = extractStats(char, charMap, capsuleMap, null, aiStrategiesMap);
      if (stats.name && stats.name !== '-') {
        teamStats[team1Name].charactersUsed.add(stats.name);
        teamStats[team1Name].characterUsageCount[stats.name] = 
          (teamStats[team1Name].characterUsageCount[stats.name] || 0) + 1;
        
        // Initialize character details array if needed
        if (!teamStats[team1Name].characterDetails[stats.name]) {
          teamStats[team1Name].characterDetails[stats.name] = [];
        }
        
        // Extract original character ID for form tracking
        const originalForm = char.battlePlayCharacter?.originalCharacter?.key || char.originalCharacter?.key;
        
        // Derive position from the character's key in the record
        const p1SlotKeys = teams_data.p1.filter(c => c._key.includes('AlliesTeamMember')).length;
        const charKey1 = char._key || '';
        let charPosition1 = null;
        if (charKey1.includes('\uff11\uff30')) {
          charPosition1 = 1;
        } else {
          const slotMatch1 = charKey1.match(/Member(\d+)/);
          if (slotMatch1) {
            const slotNum1 = parseInt(slotMatch1[1]);
            charPosition1 = slotNum1 === p1SlotKeys ? 3 : 2;
          }
        }

        // Store individual character match data with all detailed stats
        teamStats[team1Name].characterDetails[stats.name].push({
          damageDealt: stats.damageDone || 0,
          damageTaken: stats.damageTaken || 0,
          healthRemaining: stats.hPGaugeValue || 0,
          healthMax: stats.hPGaugeValueMax || 0,
          battleDuration: stats.battleTime || 0,
          position: charPosition1,
          // Build and AI Strategy
          buildComposition: stats.buildComposition,
          aiStrategy: stats.aiStrategy,
          equippedCapsules: stats.equippedCapsules || [],
          totalCapsuleCost: stats.totalCapsuleCost || 0,
          // Special Abilities
          specialMovesUsed: stats.specialMovesUsed || 0,
          ultimatesUsed: stats.ultimatesUsed || 0,
          skillsUsed: stats.skillsUsed || 0,
          // NEW blast tracking
          s1Blast: stats.s1Blast || 0,
          s2Blast: stats.s2Blast || 0,
          ultBlast: stats.ultBlast || 0,
          s1HitBlast: stats.s1HitBlast,
          s2HitBlast: stats.s2HitBlast,
          uLTHitBlast: stats.uLTHitBlast,
          s1HitRate: stats.s1HitRate,
          s2HitRate: stats.s2HitRate,
          ultHitRate: stats.ultHitRate,
          // Legacy blast tracking (for backwards compatibility)
          spm1Count: stats.s1Blast || 0,
          spm2Count: stats.s2Blast || 0,
          exa1Count: stats.exa1Count || 0,
          exa2Count: stats.exa2Count || 0,
          // Survival & Health
          sparkingCount: stats.sparkingCount || 0,
          chargeCount: stats.chargeCount || 0,
          guardCount: stats.guardCount || 0,
          shotEnergyBulletCount: stats.shotEnergyBulletCount || 0,
          zCounterCount: stats.zCounterCount || 0,
          superCounterCount: stats.superCounterCount || 0,
          revengeCounterCount: stats.revengeCounterCount || 0,
          tags: stats.tags || 0,
          formChangeCount: stats.formChangeCount || 0,
          // Combat Performance
          maxComboNum: stats.maxComboNum || 0,
          maxComboDamage: stats.maxComboDamage || 0,
          throwCount: stats.throwCount || 0,
          lightningAttackCount: stats.lightningAttackCount || 0,
          vanishingAttackCount: stats.vanishingAttackCount || 0,
          dragonHomingCount: stats.dragonHomingCount || 0,
          speedImpactCount: stats.speedImpactCount || 0,
          speedImpactWins: stats.speedImpactWins || 0,
          sparkingComboCount: stats.sparkingComboCount || 0,
          dragonDashMileage: stats.dragonDashMileage || 0,
          kills: stats.kills || 0,
          fileName: file.name,
          // Per-form stats tracking
          formChangeHistory: char.formChangeHistory || [],
          originalCharacterId: originalForm,
          characterIdRecord: characterIdRecord,
          rawCharacterData: char // Store raw data for per-form calculation
        });
        
        // Track build compositions (new 7-category system)
        if (stats.buildComposition && stats.buildComposition.label) {
          const compositionLabel = stats.buildComposition.label;
          if (!teamStats[team1Name].buildCompositions[compositionLabel]) {
            teamStats[team1Name].buildCompositions[compositionLabel] = 0;
          }
          teamStats[team1Name].buildCompositions[compositionLabel]++;;
        }
      }
    });
    }
    
    // Track character usage for team 2 only if valid
    if (isTeam2Valid) {
      teams_data.p2.forEach(char => {
      const stats = extractStats(char, charMap, capsuleMap, null, aiStrategiesMap);
      if (stats.name && stats.name !== '-') {
        teamStats[team2Name].charactersUsed.add(stats.name);
        teamStats[team2Name].characterUsageCount[stats.name] = 
          (teamStats[team2Name].characterUsageCount[stats.name] || 0) + 1;
        
        // Initialize character details array if needed
        if (!teamStats[team2Name].characterDetails[stats.name]) {
          teamStats[team2Name].characterDetails[stats.name] = [];
        }
        
        // Extract original character ID for form tracking
        const originalForm = char.battlePlayCharacter?.originalCharacter?.key || char.originalCharacter?.key;
        
        // Derive position from the character's key in the record
        const p2SlotKeys = teams_data.p2.filter(c => c._key.includes('EnemyTeamMember')).length;
        const charKey2 = char._key || '';
        let charPosition2 = null;
        if (charKey2.includes('\uff12\uff30')) {
          charPosition2 = 1;
        } else {
          const slotMatch2 = charKey2.match(/Member(\d+)/);
          if (slotMatch2) {
            const slotNum2 = parseInt(slotMatch2[1]);
            charPosition2 = slotNum2 === p2SlotKeys ? 3 : 2;
          }
        }

        // Store individual character match data with all detailed stats
        teamStats[team2Name].characterDetails[stats.name].push({
          damageDealt: stats.damageDone || 0,
          damageTaken: stats.damageTaken || 0,
          healthRemaining: stats.hPGaugeValue || 0,
          healthMax: stats.hPGaugeValueMax || 0,
          battleDuration: stats.battleTime || 0,
          position: charPosition2,
          // Build and AI Strategy
          buildComposition: stats.buildComposition,
          aiStrategy: stats.aiStrategy,
          equippedCapsules: stats.equippedCapsules || [],
          totalCapsuleCost: stats.totalCapsuleCost || 0,
          // Special Abilities
          specialMovesUsed: stats.specialMovesUsed || 0,
          ultimatesUsed: stats.ultimatesUsed || 0,
          skillsUsed: stats.skillsUsed || 0,
          // NEW blast tracking
          s1Blast: stats.s1Blast || 0,
          s2Blast: stats.s2Blast || 0,
          ultBlast: stats.ultBlast || 0,
          s1HitBlast: stats.s1HitBlast,
          s2HitBlast: stats.s2HitBlast,
          uLTHitBlast: stats.uLTHitBlast,
          s1HitRate: stats.s1HitRate,
          s2HitRate: stats.s2HitRate,
          ultHitRate: stats.ultHitRate,
          // Legacy blast tracking (for backwards compatibility)
          spm1Count: stats.s1Blast || 0,
          spm2Count: stats.s2Blast || 0,
          exa1Count: stats.exa1Count || 0,
          exa2Count: stats.exa2Count || 0,
          // Survival & Health
          sparkingCount: stats.sparkingCount || 0,
          chargeCount: stats.chargeCount || 0,
          guardCount: stats.guardCount || 0,
          shotEnergyBulletCount: stats.shotEnergyBulletCount || 0,
          zCounterCount: stats.zCounterCount || 0,
          superCounterCount: stats.superCounterCount || 0,
          revengeCounterCount: stats.revengeCounterCount || 0,
          tags: stats.tags || 0,
          formChangeCount: stats.formChangeCount || 0,
          // Combat Performance
          maxComboNum: stats.maxComboNum || 0,
          maxComboDamage: stats.maxComboDamage || 0,
          throwCount: stats.throwCount || 0,
          lightningAttackCount: stats.lightningAttackCount || 0,
          vanishingAttackCount: stats.vanishingAttackCount || 0,
          dragonHomingCount: stats.dragonHomingCount || 0,
          speedImpactCount: stats.speedImpactCount || 0,
          speedImpactWins: stats.speedImpactWins || 0,
          sparkingComboCount: stats.sparkingComboCount || 0,
          dragonDashMileage: stats.dragonDashMileage || 0,
          kills: stats.kills || 0,
          fileName: file.name,
          // Per-form stats tracking
          formChangeHistory: char.formChangeHistory || [],
          originalCharacterId: originalForm,
          characterIdRecord: characterIdRecord,
          rawCharacterData: char // Store raw data for per-form calculation
        });
        
        // Track build compositions (new 7-category system)
        if (stats.buildComposition && stats.buildComposition.label) {
          const compositionLabel = stats.buildComposition.label;
          if (!teamStats[team2Name].buildCompositions[compositionLabel]) {
            teamStats[team2Name].buildCompositions[compositionLabel] = 0;
          }
          teamStats[team2Name].buildCompositions[compositionLabel]++;;
        }
      }
    });
    }
    
    // Track position-based character matchups (only if both teams are valid)
    if (isTeam1Valid && isTeam2Valid) {
      teams_data.p1.forEach((p1Char, index) => {
        const p2Char = teams_data.p2[index];
        if (!p2Char) return; // No opposing character at this position
        
        const p1Stats = extractStats(p1Char, charMap, capsuleMap, null, aiStrategiesMap);
        const p2Stats = extractStats(p2Char, charMap, capsuleMap, null, aiStrategiesMap);
        
        if (p1Stats.name && p1Stats.name !== '-' && p2Stats.name && p2Stats.name !== '-') {
          const position = index + 1; // 1-indexed position
          
          // Track for team1 vs team2
          const matchupKey = `${p1Stats.name}_vs_${p2Stats.name}`;
          if (!teamStats[team1Name].opponentRecords[team2Name].characterMatchups[matchupKey]) {
            teamStats[team1Name].opponentRecords[team2Name].characterMatchups[matchupKey] = {
              characterName: p1Stats.name,
              opponentName: p2Stats.name,
              position: position,
              matches: [],
              buildUsage: {},
              buildCompositionData: {} // Store full build composition data
            };
          }
          
          // Calculate performance score for this match
          const damageEfficiency = (p1Stats.damageTaken || 1) > 0 ? p1Stats.damageDone / p1Stats.damageTaken : p1Stats.damageDone;
          const dps = (p1Stats.battleTime || 1) > 0 ? p1Stats.damageDone / p1Stats.battleTime : 0;
          const healthRetention = (p1Stats.hPGaugeValueMax || 1) > 0 ? p1Stats.hPGaugeValue / p1Stats.hPGaugeValueMax : 0;
          const baseScore = (
            (p1Stats.damageDone / 100000) * 35 +
            (damageEfficiency) * 25 +
            (dps / 1000) * 25 +
            (healthRetention) * 15
          );
          
          teamStats[team1Name].opponentRecords[team2Name].characterMatchups[matchupKey].matches.push({
            damageDealt: p1Stats.damageDone || 0,
            damageTaken: p1Stats.damageTaken || 0,
            battleTime: p1Stats.battleTime || 0,
            healthRemaining: p1Stats.hPGaugeValue || 0,
            healthMax: p1Stats.hPGaugeValueMax || 0,
            performanceScore: baseScore
          });
          
          // Track build usage for this matchup
          if (p1Stats.buildComposition && p1Stats.buildComposition.label) {
            const buildKey = `${p1Stats.buildComposition.label}|${p1Stats.aiStrategy || 'Default'}`;
            teamStats[team1Name].opponentRecords[team2Name].characterMatchups[matchupKey].buildUsage[buildKey] = 
              (teamStats[team1Name].opponentRecords[team2Name].characterMatchups[matchupKey].buildUsage[buildKey] || 0) + 1;
            // Store the full build composition data
            if (!teamStats[team1Name].opponentRecords[team2Name].characterMatchups[matchupKey].buildCompositionData[buildKey]) {
              teamStats[team1Name].opponentRecords[team2Name].characterMatchups[matchupKey].buildCompositionData[buildKey] = {
                buildComposition: p1Stats.buildComposition,
                aiStrategy: p1Stats.aiStrategy || 'Default',
                equippedCapsules: p1Stats.equippedCapsules || [],
                totalCapsuleCost: p1Stats.totalCapsuleCost || 0
              };
            }
          }
          
          // Track for team2 vs team1 (reverse matchup)
          const reverseMatchupKey = `${p2Stats.name}_vs_${p1Stats.name}`;
          if (!teamStats[team2Name].opponentRecords[team1Name].characterMatchups[reverseMatchupKey]) {
            teamStats[team2Name].opponentRecords[team1Name].characterMatchups[reverseMatchupKey] = {
              characterName: p2Stats.name,
              opponentName: p1Stats.name,
              position: position,
              matches: [],
              buildUsage: {},
              buildCompositionData: {} // Store full build composition data
            };
          }
          
          const p2DamageEfficiency = (p2Stats.damageTaken || 1) > 0 ? p2Stats.damageDone / p2Stats.damageTaken : p2Stats.damageDone;
          const p2Dps = (p2Stats.battleTime || 1) > 0 ? p2Stats.damageDone / p2Stats.battleTime : 0;
          const p2HealthRetention = (p2Stats.hPGaugeValueMax || 1) > 0 ? p2Stats.hPGaugeValue / p2Stats.hPGaugeValueMax : 0;
          const p2BaseScore = (
            (p2Stats.damageDone / 100000) * 35 +
            (p2DamageEfficiency) * 25 +
            (p2Dps / 1000) * 25 +
            (p2HealthRetention) * 15
          );
          
          teamStats[team2Name].opponentRecords[team1Name].characterMatchups[reverseMatchupKey].matches.push({
            damageDealt: p2Stats.damageDone || 0,
            damageTaken: p2Stats.damageTaken || 0,
            battleTime: p2Stats.battleTime || 0,
            healthRemaining: p2Stats.hPGaugeValue || 0,
            healthMax: p2Stats.hPGaugeValueMax || 0,
            performanceScore: p2BaseScore
          });
          
          if (p2Stats.buildComposition && p2Stats.buildComposition.label) {
            const p2BuildKey = `${p2Stats.buildComposition.label}|${p2Stats.aiStrategy || 'Default'}`;
            teamStats[team2Name].opponentRecords[team1Name].characterMatchups[reverseMatchupKey].buildUsage[p2BuildKey] = 
              (teamStats[team2Name].opponentRecords[team1Name].characterMatchups[reverseMatchupKey].buildUsage[p2BuildKey] || 0) + 1;
            // Store the full build composition data
            if (!teamStats[team2Name].opponentRecords[team1Name].characterMatchups[reverseMatchupKey].buildCompositionData[p2BuildKey]) {
              teamStats[team2Name].opponentRecords[team1Name].characterMatchups[reverseMatchupKey].buildCompositionData[p2BuildKey] = {
                buildComposition: p2Stats.buildComposition,
                aiStrategy: p2Stats.aiStrategy || 'Default',
                equippedCapsules: p2Stats.equippedCapsules || [],
                totalCapsuleCost: p2Stats.totalCapsuleCost || 0
              };
            }
          }
        }
      });
    }
    
    // Add match history only for valid teams
    if (isTeam1Valid) {
      teamStats[team1Name].matchHistory.push({
        opponent: isTeam2Valid ? team2Name : 'Unknown',
        result: team1Won ? 'Win' : 'Loss',
        damageDealt: p1TeamStats.totalDamage,
        damageTaken: p1TeamStats.totalTaken,
        healthRemaining: p1TeamStats.totalHealth,
        healthMax: p1TeamStats.totalHPGaugeValueMax,
        battleDuration: p1TeamStats.totalBattleTime,
        fileName: file.name
      });
    }
    
    if (isTeam2Valid) {
      teamStats[team2Name].matchHistory.push({
        opponent: isTeam1Valid ? team1Name : 'Unknown',
        result: team2Won ? 'Win' : 'Loss',
        damageDealt: p2TeamStats.totalDamage,
        damageTaken: p2TeamStats.totalTaken,
        healthRemaining: p2TeamStats.totalHealth,
        healthMax: p2TeamStats.totalHPGaugeValueMax,
        battleDuration: p2TeamStats.totalBattleTime,
        fileName: file.name
      });
    }
  });
  
  // Calculate final statistics and format data
  return Object.values(teamStats).map(team => {
    team.winRate = team.matches > 0 ? Math.round((team.wins / team.matches) * 100 * 10) / 10 : 0;
    
    // Convert character usage set to array and sort by usage frequency
    team.favoriteCharacters = Object.entries(team.characterUsageCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, usage: count }));
    
    // Calculate per-character averages
    Object.entries(team.characterDetails).forEach(([charName, matches]) => {
      if (matches.length > 0) {
        // Filter for active matches first (same approach as build calculation)
        const activeMatches = matches.filter(m => m.battleDuration && m.battleDuration > 0);
        const matchesToAggregate = activeMatches.length > 0 ? activeMatches : matches;
        
        const totalDamageDealt = matchesToAggregate.reduce((sum, match) => sum + (match.damageDealt || 0), 0);
        const totalDamageTaken = matchesToAggregate.reduce((sum, match) => sum + (match.damageTaken || 0), 0);
        const totalBattleDuration = matchesToAggregate.reduce((sum, match) => sum + (match.battleDuration || 0), 0);
        const totalHealthRemaining = matchesToAggregate.reduce((sum, match) => sum + (match.healthRemaining || 0), 0);
        const totalHealthMax = matchesToAggregate.reduce((sum, match) => sum + (match.healthMax || 0), 0);
        
        // Special Abilities totals
        const totalSpecialMoves = matches.reduce((sum, match) => sum + (match.specialMovesUsed || 0), 0);
        const totalUltimates = matches.reduce((sum, match) => sum + (match.ultimatesUsed || 0), 0);
        const totalSkills = matches.reduce((sum, match) => sum + (match.skillsUsed || 0), 0);
        const totalSPM1 = matches.reduce((sum, match) => sum + (match.spm1Count || 0), 0);
        const totalSPM2 = matches.reduce((sum, match) => sum + (match.spm2Count || 0), 0);
        const totalEXA1 = matches.reduce((sum, match) => sum + (match.exa1Count || 0), 0);
        const totalEXA2 = matches.reduce((sum, match) => sum + (match.exa2Count || 0), 0);
        
        // New blast tracking totals
        const totalS1Blast = matches.reduce((sum, match) => sum + (match.s1Blast || match.spm1Count || 0), 0);
        const totalS2Blast = matches.reduce((sum, match) => sum + (match.s2Blast || match.spm2Count || 0), 0);
        const totalUltBlast = matches.reduce((sum, match) => sum + (match.ultBlast || 0), 0);
        const totalS1HitBlast = matches.reduce((sum, match) => sum + (match.s1HitBlast || 0), 0);
        const totalS2HitBlast = matches.reduce((sum, match) => sum + (match.s2HitBlast || 0), 0);
        const totalULTHitBlast = matches.reduce((sum, match) => sum + (match.uLTHitBlast || 0), 0);
        const totalTags = matches.reduce((sum, match) => sum + (match.tags || 0), 0);
        const totalTransformations = matches.reduce((sum, match) => sum + (match.formChangeCount || 0), 0);
        
        // Track separately for hit rate calculation (only from matches with additionalCounts data)
        // Check each blast type individually - a match is trackable for a blast type only if that specific blast type has hit data
        const totalS1BlastTrackable = matches.reduce((sum, match) => {
          // Check if THIS blast type has hit data in this match
          const hasS1HitData = (match.s1HitBlast !== undefined && match.s1HitBlast !== null);
          return sum + (hasS1HitData ? (match.s1Blast || 0) : 0);
        }, 0);
        const totalS2BlastTrackable = matches.reduce((sum, match) => {
          // Check if THIS blast type has hit data in this match
          const hasS2HitData = (match.s2HitBlast !== undefined && match.s2HitBlast !== null);
          return sum + (hasS2HitData ? (match.s2Blast || 0) : 0);
        }, 0);
        const totalUltBlastTrackable = matches.reduce((sum, match) => {
          // Check if THIS blast type has hit data in this match
          const hasUltHitData = (match.uLTHitBlast !== undefined && match.uLTHitBlast !== null);
          return sum + (hasUltHitData ? (match.ultBlast || 0) : 0);
        }, 0);
        
        // Survival & Health totals
        const totalSparking = matches.reduce((sum, match) => sum + (match.sparkingCount || 0), 0);
        const totalCharges = matches.reduce((sum, match) => sum + (match.chargeCount || 0), 0);
        const totalGuards = matches.reduce((sum, match) => sum + (match.guardCount || 0), 0);
        const totalEnergyBlasts = matches.reduce((sum, match) => sum + (match.shotEnergyBulletCount || 0), 0);
        const totalZCounters = matches.reduce((sum, match) => sum + (match.zCounterCount || 0), 0);
        const totalSuperCounters = matches.reduce((sum, match) => sum + (match.superCounterCount || 0), 0);
        const totalRevengeCounters = matches.reduce((sum, match) => sum + (match.revengeCounterCount || 0), 0);
        
        // Combat Performance totals
        const totalMaxComboNum = matches.reduce((sum, match) => sum + (match.maxComboNum || 0), 0);
        const totalMaxComboDamage = matches.reduce((sum, match) => sum + (match.maxComboDamage || 0), 0);
        const totalThrows = matches.reduce((sum, match) => sum + (match.throwCount || 0), 0);
        const totalLightningAttacks = matches.reduce((sum, match) => sum + (match.lightningAttackCount || 0), 0);
        const totalVanishingAttacks = matches.reduce((sum, match) => sum + (match.vanishingAttackCount || 0), 0);
        const totalDragonHoming = matches.reduce((sum, match) => sum + (match.dragonHomingCount || 0), 0);
        const totalSpeedImpacts = matches.reduce((sum, match) => sum + (match.speedImpactCount || 0), 0);
        const totalSpeedImpactWins = matches.reduce((sum, match) => sum + (match.speedImpactWins || 0), 0);
        const totalSparkingCombo = matches.reduce((sum, match) => sum + (match.sparkingComboCount || 0), 0);
        const totalDragonDashMileage = matches.reduce((sum, match) => sum + (match.dragonDashMileage || 0), 0);
        const totalKills = matches.reduce((sum, match) => sum + (match.kills || 0), 0);
        
        const matchCount = matches.length;
        const activeMatchCount = matchesToAggregate.length;
        const denom = activeMatchCount;
        
        const avgDamageDealt = Math.round(totalDamageDealt / Math.max(denom, 1));
        const avgDamageTaken = Math.round(totalDamageTaken / Math.max(denom, 1));
        const avgBattleDuration = totalBattleDuration / Math.max(denom, 1);
        const avgHealthRemaining = totalHealthRemaining / Math.max(denom, 1);
        const avgHealthMax = totalHealthMax / Math.max(denom, 1);
        
        const damageEfficiency = totalDamageTaken > 0 ? 
          Math.round((totalDamageDealt / totalDamageTaken) * 100) / 100 : 
          (totalDamageDealt > 0 ? 999 : 0);
        const damagePerSecond = totalBattleDuration > 0 ? 
          Math.round((totalDamageDealt / totalBattleDuration) * 100) / 100 : 0;
        const healthRetention = avgHealthMax > 0 ? avgHealthRemaining / avgHealthMax : 0;
        
        // Calculate performance score using same formula as character aggregation
        const baseScore = (
          (avgDamageDealt / 100000) * 35 +        // Damage dealt weight: 35%
          (damageEfficiency) * 25 +                // Damage efficiency weight: 25%
          (damagePerSecond / 1000) * 25 +          // Damage per second weight: 25%
          (healthRetention) * 15                   // Health retention weight: 15%
        );
        
        // Experience multiplier based on matches played (use active match count)
        const experienceMultiplier = Math.min(1.25, 1.0 + (activeMatchCount - 1) * (0.25 / 11));
        const performanceScore = Math.round((baseScore * experienceMultiplier) * 100) / 100;
        
        // Calculate speed impact win rate
        const speedImpactWinRate = totalSpeedImpacts > 0 
          ? Math.round((totalSpeedImpactWins / totalSpeedImpacts) * 1000) / 10 
          : 0;
        
        team.characterAverages[charName] = {
          avgDamageDealt,
          avgDamageTaken,
          avgDamageEfficiency: damageEfficiency,
          avgDamagePerSecond: damagePerSecond,
          avgHealthRetention: healthRetention,
          avgHealthMax: Math.round(avgHealthMax),
          avgHealthRemaining: Math.round(avgHealthRemaining),
          avgBattleDuration: Math.round(avgBattleDuration),
          performanceScore,
          matchesPlayed: matchCount,
          activeMatchesPlayed: activeMatchCount,
          usageRate: Math.round((activeMatchCount / team.activeMatches) * 100 * 10) / 10,
          // Special Abilities averages
          avgSpecialMoves: Math.round((totalSpecialMoves / denom) * 10) / 10,
          avgUltimates: Math.round((totalUltimates / denom) * 100) / 100,
          avgSkills: Math.round((totalSkills / denom) * 10) / 10,
          avgSPM1: Math.round((totalSPM1 / denom) * 100) / 100,
          avgSPM2: Math.round((totalSPM2 / denom) * 100) / 100,
          avgEXA1: Math.round((totalEXA1 / denom) * 100) / 100,
          avgEXA2: Math.round((totalEXA2 / denom) * 100) / 100,
          // New blast tracking averages
          avgS1Blast: Math.round((totalS1Blast / denom) * 100) / 100,
          avgS2Blast: Math.round((totalS2Blast / denom) * 100) / 100,
          avgUltBlast: Math.round((totalUltBlast / denom) * 100) / 100,
          avgS1Hit: Math.round((totalS1HitBlast / denom) * 100) / 100,
          avgS2Hit: Math.round((totalS2HitBlast / denom) * 100) / 100,
          avgUltHit: Math.round((totalULTHitBlast / denom) * 100) / 100,
          s1HitRateOverall: totalS1BlastTrackable > 0 ? Math.round((totalS1HitBlast / totalS1BlastTrackable) * 1000) / 10 : null,
          s2HitRateOverall: totalS2BlastTrackable > 0 ? Math.round((totalS2HitBlast / totalS2BlastTrackable) * 1000) / 10 : null,
          ultHitRateOverall: totalUltBlastTrackable > 0 ? Math.round((totalULTHitBlast / totalUltBlastTrackable) * 1000) / 10 : null,
          
          avgTags: Math.round((totalTags / denom) * 100) / 100,
          totalTags: totalTags,
          avgTransformations: Math.round((totalTransformations / denom) * 100) / 100,
          
          // Survival & Health averages
          avgSparking: Math.round((totalSparking / denom) * 100) / 100,
          avgCharges: Math.round((totalCharges / denom) * 10) / 10,
          avgGuards: Math.round((totalGuards / denom) * 10) / 10,
          avgEnergyBlasts: Math.round((totalEnergyBlasts / denom) * 10) / 10,
          avgZCounters: Math.round((totalZCounters / denom) * 100) / 100,
          avgSuperCounters: Math.round((totalSuperCounters / denom) * 100) / 100,
          avgRevengeCounters: Math.round((totalRevengeCounters / denom) * 100) / 100,
          // Combat Performance averages
          avgMaxComboNum: Math.round((totalMaxComboNum / denom) * 10) / 10,
          avgMaxComboDamage: Math.round(totalMaxComboDamage / denom),
          avgThrows: Math.round((totalThrows / denom) * 100) / 100,
          avgLightningAttacks: Math.round((totalLightningAttacks / denom) * 100) / 100,
          avgVanishingAttacks: Math.round((totalVanishingAttacks / denom) * 100) / 100,
          avgDragonHoming: Math.round((totalDragonHoming / denom) * 100) / 100,
          avgSpeedImpacts: Math.round((totalSpeedImpacts / denom) * 100) / 100,
          avgSpeedImpactWins: Math.round((totalSpeedImpactWins / denom) * 100) / 100,
          speedImpactWinRate: speedImpactWinRate,
          avgSparkingCombo: Math.round((totalSparkingCombo / denom) * 10) / 10,
          avgDragonDashMileage: Math.round((totalDragonDashMileage / denom) * 10) / 10,
          avgKills: Math.round((totalKills / denom) * 100) / 100,
          // Raw match data for build filter recomputation
          rawMatches: matches,
          // Most common position
          primaryPosition: (() => {
            const pc = { 1: 0, 2: 0, 3: 0 };
            matches.forEach(m => { if (m.position) pc[m.position] = (pc[m.position] || 0) + 1; });
            const total = pc[1] + pc[2] + pc[3];
            if (total === 0) return null;
            const best = [1, 2, 3].reduce((a, b) => pc[b] > pc[a] ? b : a, 1);
            return best === 1 ? 'Starter' : best === 2 ? 'Middle' : 'Anchor';
          })()
        };
        
        // Track build usage for this character
        // Key by exact capsule loadout + AI strategy so different capsule sets are tracked separately
        const buildUsageMap = {};
        matches.forEach(match => {
          if (match.buildComposition && match.buildComposition.label) {
            const capsuleKey = (match.equippedCapsules || [])
              .map(c => c.name || c.id || '')
              .sort()
              .join(',');
            const buildKey = `${capsuleKey}|${match.aiStrategy || 'Default'}`;
            if (!buildUsageMap[buildKey]) {
              buildUsageMap[buildKey] = {
                buildLabel: match.buildComposition.label,
                buildComposition: match.buildComposition,
                aiStrategy: match.aiStrategy,
                equippedCapsules: match.equippedCapsules || [],
                totalCapsuleCost: match.totalCapsuleCost || 0,
                count: 0,
                activeCount: 0, // Track active matches (with battleDuration > 0)
                // Aggregate stats (same approach as character)
                totalDamageDealt: 0,
                totalDamageTaken: 0,
                totalBattleDuration: 0,
                totalHealthRemaining: 0,
                totalHealthMax: 0
              };
            }
            buildUsageMap[buildKey].count++;
            // Only aggregate stats from active matches (same as character)
            if (match.battleDuration && match.battleDuration > 0) {
              buildUsageMap[buildKey].activeCount++;
              buildUsageMap[buildKey].totalDamageDealt += match.damageDealt || 0;
              buildUsageMap[buildKey].totalDamageTaken += match.damageTaken || 0;
              buildUsageMap[buildKey].totalBattleDuration += match.battleDuration || 0;
              buildUsageMap[buildKey].totalHealthRemaining += match.healthRemaining || 0;
              buildUsageMap[buildKey].totalHealthMax += match.healthMax || 0;
            }
          }
        });
        
        // Sort builds by usage first, then by average performance score for tie-breaking
        const sortedBuilds = Object.values(buildUsageMap)
          .filter(build => build.activeCount > 0) // Only include builds with active matches
          .map(build => {
            // Calculate metrics from aggregated totals (same as character calculation)
            const denom = build.activeCount;
            const avgDamageDealt = Math.round(build.totalDamageDealt / Math.max(denom, 1));
            const avgDamageTaken = Math.round(build.totalDamageTaken / Math.max(denom, 1));
            const avgBattleDuration = build.totalBattleDuration / Math.max(denom, 1);
            const avgHealthRemaining = build.totalHealthRemaining / Math.max(denom, 1);
            const avgHealthMax = build.totalHealthMax / Math.max(denom, 1);
            
            const damageEfficiency = build.totalDamageTaken > 0 ? 
              Math.round((build.totalDamageDealt / build.totalDamageTaken) * 100) / 100 : 
              (build.totalDamageDealt > 0 ? 999 : 0);
            const damagePerSecond = build.totalBattleDuration > 0 ? 
              Math.round((build.totalDamageDealt / build.totalBattleDuration) * 100) / 100 : 0;
            const healthRetention = avgHealthMax > 0 ? avgHealthRemaining / avgHealthMax : 0;
            
            // Calculate base score using same formula as character
            const baseScore = (
              (avgDamageDealt / 100000) * 35 +        // Damage dealt weight: 35%
              (damageEfficiency) * 25 +                // Damage efficiency weight: 25%
              (damagePerSecond / 1000) * 25 +          // Damage per second weight: 25%
              (healthRetention) * 15                   // Health retention weight: 15%
            );
            
            // Apply experience multiplier consistent with character performance score
            // Use activeCount for experience, same as character (prefer active matches)
            const experienceMultiplier = Math.min(1.25, 1.0 + ((build.activeCount > 0 ? build.activeCount : build.count) - 1) * (0.25 / 11));
            const performanceScore = Math.round((baseScore * experienceMultiplier) * 100) / 100;
            
            return {
              ...build,
              avgPerformanceScore: performanceScore
            };
          })
          .sort((a, b) => {
            // Primary sort: by active usage count (descending)
            if (b.activeCount !== a.activeCount) return b.activeCount - a.activeCount;
            // Tie-breaker: by average performance score (descending)
            return b.avgPerformanceScore - a.avgPerformanceScore;
          });
        
        // Pass all builds (no cap) — UI handles selection and display
        team.characterAverages[charName].topBuilds = sortedBuilds;
        
        // Aggregate per-form stats for characters with transformations
        const formStatsMap = {};
        matches.forEach(match => {
          // Check if this character has form changes AND characterIdRecord data
          const hasFormChanges = Array.isArray(match.formChangeHistory) && match.formChangeHistory.length > 0;
          const hasCharacterIdRecord = match.characterIdRecord && typeof match.characterIdRecord === 'object';
          
          if (hasFormChanges && hasCharacterIdRecord) {
            const perFormStats = calculatePerFormStats(
              match.rawCharacterData,
              match.characterIdRecord,
              match.formChangeHistory,
              match.originalCharacterId
            );

            
            perFormStats.forEach(formStat => {
              const formId = formStat.formId;
              if (!formStatsMap[formId]) {
                formStatsMap[formId] = {
                  formId: formId,
                  formNumber: formStat.formNumber,
                  isFirstForm: formStat.isFirstForm,
                  isFinalForm: formStat.isFinalForm,
                  totalDamageDone: 0,
                  totalDamageTaken: 0,
                  totalBattleTime: 0,
                  totalBattleCount: 0,
                  totalHPRemaining: 0,
                  totalHPMax: 0,
                  totalSpecialMoves: 0,
                  totalUltimates: 0,
                  totalS1Blast: 0,
                  totalS2Blast: 0,
                  totalUltBlast: 0,
                  totalS1HitBlast: 0,
                  totalS2HitBlast: 0,
                  totalULTHitBlast: 0,
                  totalKills: 0,
                  matches: 0
                };
              }
              
              formStatsMap[formId].totalDamageDone += formStat.damageDone || 0;
              formStatsMap[formId].totalDamageTaken += formStat.damageTaken || 0;
              formStatsMap[formId].totalBattleTime += formStat.battleTime || 0;
              formStatsMap[formId].totalHPRemaining += formStat.hpRemaining || 0;
              formStatsMap[formId].totalHPMax += (formStat.hpRemaining || 0);
              formStatsMap[formId].totalSpecialMoves += formStat.specialMovesUsed || 0;
              formStatsMap[formId].totalUltimates += formStat.ultimatesUsed || 0;
              formStatsMap[formId].totalS1Blast += formStat.s1Blast || 0;
              formStatsMap[formId].totalS2Blast += formStat.s2Blast || 0;
              formStatsMap[formId].totalUltBlast += formStat.ultBlast || 0;
              formStatsMap[formId].totalS1HitBlast += (formStat.s1HitBlast || 0);
              formStatsMap[formId].totalS2HitBlast += (formStat.s2HitBlast || 0);
              formStatsMap[formId].totalULTHitBlast += (formStat.uLTHitBlast || 0);
              formStatsMap[formId].totalKills += formStat.kills || 0;
              formStatsMap[formId].matches += 1;
            });
          }
        });
        
        // Calculate averages for each form
        const aggregatedFormStats = Object.values(formStatsMap).map(formData => {
          const matchCount = formData.matches;
          const avgDamageDone = matchCount > 0 ? formData.totalDamageDone / matchCount : 0;
          const avgDamageTaken = matchCount > 0 ? formData.totalDamageTaken / matchCount : 0;
          const avgBattleTime = matchCount > 0 ? formData.totalBattleTime / matchCount : 0;
          
          // Calculate derived stats using total-based calculations
          const damageEfficiency = formData.totalDamageTaken > 0 ? formData.totalDamageDone / formData.totalDamageTaken : 0;
          const damagePerSecond = formData.totalBattleTime > 0 ? formData.totalDamageDone / formData.totalBattleTime : 0;
          
          return {
            formId: formData.formId,
            formNumber: formData.formNumber,
            characterName: charMap[formData.formId] || formData.formId,
            isFirstForm: formData.isFirstForm,
            isFinalForm: formData.isFinalForm,
            avgDamageDone: avgDamageDone,
            avgDamageTaken: avgDamageTaken,
            avgBattleTime: avgBattleTime,
            avgHPRemaining: matchCount > 0 ? formData.totalHPRemaining / matchCount : 0,
            avgSpecialMoves: matchCount > 0 ? formData.totalSpecialMoves / matchCount : 0,
            avgUltimates: matchCount > 0 ? formData.totalUltimates / matchCount : 0,
            avgS1Blast: matchCount > 0 ? formData.totalS1Blast / matchCount : 0,
            avgS2Blast: matchCount > 0 ? formData.totalS2Blast / matchCount : 0,
            avgUltBlast: matchCount > 0 ? formData.totalUltBlast / matchCount : 0,
            avgS1HitBlast: matchCount > 0 ? formData.totalS1HitBlast / matchCount : 0,
            avgS2HitBlast: matchCount > 0 ? formData.totalS2HitBlast / matchCount : 0,
            avgULTHitBlast: matchCount > 0 ? formData.totalULTHitBlast / matchCount : 0,
            avgKills: matchCount > 0 ? formData.totalKills / matchCount : 0,
            damageEfficiency: damageEfficiency,
            damagePerSecond: damagePerSecond,
            matchCount: matchCount
          };
        }).sort((a, b) => a.formNumber - b.formNumber);
        
        // Add form stats to character averages
        if (aggregatedFormStats.length > 0) {
          team.characterAverages[charName].formStats = aggregatedFormStats;
          
          // Build form change history text
          const formNames = aggregatedFormStats.map(f => f.characterName);
          team.characterAverages[charName].formChangeHistoryText = formNames.join(' → ');
          
          // Store raw form change history for component
          team.characterAverages[charName].formChangeHistory = matches[0]?.formChangeHistory || [];
        }
      }
    });
    
    // Get top 5 characters by performance score for team-level stats (matching Team Performance Matrix logic)
    const top5Characters = Object.entries(team.characterAverages)
      .sort((a, b) => (b[1].performanceScore || 0) - (a[1].performanceScore || 0))
      .slice(0, 5)
      .map(([name, stats]) => ({ name, ...stats }));
    
    // Calculate team-level stats based on top 5 characters
    const top5TotalDamage = top5Characters.reduce((sum, char) => sum + char.avgDamageDealt, 0);
    const top5TotalTaken = top5Characters.reduce((sum, char) => sum + char.avgDamageTaken, 0);
    const top5TotalMaxHP = top5Characters.reduce((sum, char) => sum + char.avgHealthMax, 0);
    const top5TotalHPLeft = top5Characters.reduce((sum, char) => sum + char.avgHealthRemaining, 0);
    const top5TotalBattleTime = top5Characters.reduce((sum, char) => sum + (char.avgBattleDuration || 0), 0);
    const top5TotalTags = top5Characters.reduce((sum, char) => sum + (char.totalTags || 0), 0);
    
    // Team-level calculated stats from top 5
    team.avgDamagePerMatch = Math.round(top5TotalDamage);
    team.avgDamageTakenPerMatch = Math.round(top5TotalTaken);
    team.avgHealthRetention = top5TotalMaxHP > 0 ? 
      Math.round((top5TotalHPLeft / top5TotalMaxHP) * 1000) / 10 : 0;
    team.top5Efficiency = top5TotalTaken > 0 ? 
      Math.round((top5TotalDamage / top5TotalTaken) * 100) / 100 : 0;
    team.top5DPS = top5TotalBattleTime > 0 ?
      Math.round((top5TotalDamage / top5TotalBattleTime) * 10) / 10 : 0;
    // Calculate average TOTAL match duration (total battle time of all characters per match)
    team.top5AvgMatchDuration = team.matches > 0 ?
      Math.round(team.totalMatchDuration / team.matches) : 0;
    team.top5AvgHPRemaining = top5Characters.length > 0 ?
      Math.round(top5TotalHPLeft / top5Characters.length) : 0;
    team.top5AvgTags = top5Characters.length > 0 ?
      Math.round((top5TotalTags / top5Characters.length) * 10) / 10 : 0;
    team.top5TotalTags = top5TotalTags;
    
    // Store top 5 character names for UI highlighting
    team.top5CharacterNames = top5Characters.map(c => c.name);
    
    // Convert set to count for UI display
    team.uniqueCharactersUsed = team.charactersUsed.size;
    team.charactersUsed = Array.from(team.charactersUsed);
    
    return team;
  }).sort((a, b) => {
    // Primary sort: Win rate (descending)
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    // Secondary sort: Total matches (descending, more experienced teams ranked higher)
    if (b.matches !== a.matches) return b.matches - a.matches;
    // Tertiary sort: Damage efficiency (descending)
    const aEfficiency = a.totalDamageTaken > 0 ? a.totalDamageDealt / a.totalDamageTaken : a.totalDamageDealt;
    const bEfficiency = b.totalDamageTaken > 0 ? b.totalDamageDealt / b.totalDamageTaken : b.totalDamageDealt;
    return bEfficiency - aEfficiency;
  });
}

export function getTeamStats(teamRecords, charMap, capsuleMap = {}, aiStrategiesMap = {}) {
  let totalDamage = 0, totalTaken = 0, totalHealth = 0, totalHPGaugeValueMax = 0, totalSpecial = 0, totalUltimates = 0, totalSkills = 0, totalBattleTime = 0;
  teamRecords.forEach(char => {
    const stats = extractStats(char, charMap, capsuleMap, null, aiStrategiesMap); // No position for team aggregation
    totalDamage += stats.damageDone;
    totalTaken += stats.damageTaken;
    totalHealth += stats.hPGaugeValue;
    totalHPGaugeValueMax += stats.hPGaugeValueMax;
    totalSpecial += stats.specialMovesUsed;
    totalUltimates += stats.ultimatesUsed;
    totalSkills += stats.skillsUsed;
    totalBattleTime += stats.battleTime || 0;
  });
  return { totalDamage, totalTaken, totalHealth, totalHPGaugeValueMax, totalSpecial, totalUltimates, totalSkills, totalBattleTime };
}
