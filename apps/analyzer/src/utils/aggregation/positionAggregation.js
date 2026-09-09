import { extractStats } from '../statCalculations.js';

export function getPositionBasedData(files, charMap, capsuleMap = {}, positionMatchTypeFilters = ['2v2', '3v3', '4v4', '5v5']) {
  const positionStats = {
    1: { totalMatches: 0, uniqueMatches: new Set(), characters: {} }, // Position 1 (Lead)
    2: { totalMatches: 0, uniqueMatches: new Set(), characters: {} }, // Position 2 (Middle)
    3: { totalMatches: 0, uniqueMatches: new Set(), characters: {} }  // Position 3 (Anchor)
  };
  
  // Helper function to process a characterRecord
  function processCharacterRecord(characterRecord, fileIndex = 0, recordIndex = 0) {
    if (!characterRecord) return;
    
    // Create a unique match ID based on file and record indices
    const matchId = `${fileIndex}-${recordIndex}`;
    
    // Process each team separately to determine team size
    const alliesKeys = Object.keys(characterRecord).filter(k => k.includes('AlliesTeamMember'));
    const enemyKeys = Object.keys(characterRecord).filter(k => k.includes('EnemyTeamMember'));
    const allies1PKey = Object.keys(characterRecord).find(k => k.includes('１Ｐ'));
    const enemy2PKey = Object.keys(characterRecord).find(k => k.includes('２Ｐ'));
    
    // True team size = lead (1P) + AlliesTeamMember slots
    const alliesTeamSize = alliesKeys.length + (allies1PKey ? 1 : 0);
    const matchType = `${alliesTeamSize}v${alliesTeamSize}`;
    if (!positionMatchTypeFilters.includes(matchType)) {
      return; // Skip this match if it doesn't match the selected filters
    }
    
    // Helper to accumulate stats into a position
    function accumulateCharStats(char, position) {
      const stats = extractStats(char, charMap, capsuleMap, position);
      if (!stats.name || stats.name === '-') return;
      
      const characterName = stats.name;
      positionStats[position].totalMatches++;
      positionStats[position].uniqueMatches.add(matchId);
      
      if (!positionStats[position].characters[characterName]) {
        positionStats[position].characters[characterName] = {
          name: characterName,
          matchCount: 0,
          activeMatchCount: 0,
          survivalCount: 0,
          totalDamage: 0,
          totalTaken: 0,
          totalHealth: 0,
          totalHPGaugeValueMax: 0,
          totalBattleTime: 0,
          totalSpecialMoves: 0,
          totalUltimates: 0,
          totalSkills: 0,
          totalSparking: 0,
          totalCharges: 0,
          totalGuards: 0,
          totalEnergyBlasts: 0,
          totalComboNum: 0,
          totalComboDamage: 0
        };
      }
      
      const charData = positionStats[position].characters[characterName];
      charData.matchCount++;
      if (stats.battleTime && stats.battleTime > 0) {
        charData.activeMatchCount += 1;
        charData.totalBattleTime += stats.battleTime;
      }
      if (stats.hPGaugeValue > 0) charData.survivalCount++;
      charData.totalDamage += stats.damageDone;
      charData.totalTaken += stats.damageTaken;
      charData.totalHealth += stats.hPGaugeValue;
      charData.totalHPGaugeValueMax += stats.hPGaugeValueMax;
      charData.totalSpecialMoves += stats.specialMovesUsed;
      charData.totalUltimates += stats.ultimatesUsed;
      charData.totalSkills += stats.skillsUsed;
      charData.totalSparking += stats.sparkingCount;
      charData.totalCharges += stats.chargeCount;
      charData.totalGuards += stats.guardCount;
      charData.totalEnergyBlasts += stats.shotEnergyBulletCount;
      charData.totalComboNum += stats.maxComboNum;
      charData.totalComboDamage += stats.maxComboDamage;
    }
    
    // Process allies lead (1P key) as Position 1 (Lead)
    if (allies1PKey && characterRecord[allies1PKey]) {
      accumulateCharStats(characterRecord[allies1PKey], 1);
    }
    
    // Process allies team members: last AlliesTeamMember = Anchor (3), rest = Middle (2)
    alliesKeys.forEach(key => {
      const char = characterRecord[key];
      if (!char) return;
      const slotMatch = key.match(/Member(\d+)/);
      const slotNumber = slotMatch ? parseInt(slotMatch[1]) : null;
      if (!slotNumber) return;
      
      // Last AlliesTeamMember slot is the Anchor; all others are Middle
      const position = slotNumber === alliesKeys.length ? 3 : 2;
      accumulateCharStats(char, position);
    });
    
    // Process enemy lead (2P key) as Position 1 (Lead)
    if (enemy2PKey && characterRecord[enemy2PKey]) {
      accumulateCharStats(characterRecord[enemy2PKey], 1);
    }
    
    // Process enemy team members: last EnemyTeamMember = Anchor (3), rest = Middle (2)
    enemyKeys.forEach(key => {
      const char = characterRecord[key];
      if (!char) return;
      const slotMatch = key.match(/Member(\d+)/);
      const slotNumber = slotMatch ? parseInt(slotMatch[1]) : null;
      if (!slotNumber) return;
      
      const position = slotNumber === enemyKeys.length ? 3 : 2;
      accumulateCharStats(char, position);
    });
  }
  
  files.forEach((file, fileIndex) => {
    if (file.error) return;
    
    const fileContent = file.content;
    let characterRecord;
    let recordIndex = 0;
    
    // Handle TeamBattleResults format (current BR_Data structure)
    if (fileContent.TeamBattleResults) {
      // Check for battleResult (lowercase r)
      if (fileContent.TeamBattleResults.battleResult) {
        characterRecord = fileContent.TeamBattleResults.battleResult.characterRecord;
      }
      // Check for BattleResults (capital R) - Cinema files format
      else if (fileContent.TeamBattleResults.BattleResults) {
        characterRecord = fileContent.TeamBattleResults.BattleResults.characterRecord;
      }
      // Check if data is directly in TeamBattleResults (new wrapper format)
      else if (fileContent.TeamBattleResults.characterRecord) {
        characterRecord = fileContent.TeamBattleResults.characterRecord;
      }
    }
    // Handle new format with teams array at the top
    else if (fileContent.teams && Array.isArray(fileContent.teams)) {
      // Process all teams in the array
      fileContent.teams.forEach((team, teamIndex) => {
        let teamCharRecord;
        
        if (team.BattleResults) {
          teamCharRecord = team.BattleResults.characterRecord;
        } else if (team.characterRecord) {
          teamCharRecord = team.characterRecord;
        }
        
        if (teamCharRecord) {
          processCharacterRecord(teamCharRecord, fileIndex, teamIndex);
        }
      });
      return; // Already processed all teams
    }
    // Handle standard format with BattleResults at root
    else if (fileContent.BattleResults) {
      characterRecord = fileContent.BattleResults.characterRecord;
    } 
    // Handle legacy format with direct properties
    else {
      characterRecord = fileContent.characterRecord;
    }
    
    processCharacterRecord(characterRecord, fileIndex, recordIndex);
  });
  
  // Calculate averages and format data
  Object.keys(positionStats).forEach(position => {
    const posData = positionStats[position];
    
    // Convert uniqueMatches Set to count and clean up
    posData.uniqueMatchCount = posData.uniqueMatches.size;
    delete posData.uniqueMatches; // Clean up Set object
    
    posData.sortedCharacters = Object.values(posData.characters)
      .filter(char => {
        // Only include characters that actually participated in battles
        // Filter out characters with 0 battle time and 0 active matches
        return (char.activeMatchCount && char.activeMatchCount > 0) || char.totalBattleTime > 0;
      })
      .map(char => {
        // Use activeMatchCount if available (exclude zero battleTime matches), fallback to matchCount
        const denom = (char.activeMatchCount && char.activeMatchCount > 0) ? char.activeMatchCount : char.matchCount || 1;
        
        // Calculate averages
        const avgDamage = char.totalDamage / denom;
        const avgTaken = char.totalTaken / denom;
        const avgHealth = char.totalHealth / denom;
        const avgBattleTime = char.totalBattleTime / denom;
        const avgDPS = char.totalBattleTime > 0 ? char.totalDamage / char.totalBattleTime : 0;
        const damageEfficiency = char.totalTaken > 0 ? (char.totalDamage / char.totalTaken) : char.totalDamage;
        const avgHPGaugeValueMax = char.totalHPGaugeValueMax / denom;
        
        // Calculate performance score
        const healthRetention = avgHPGaugeValueMax > 0 ? avgHealth / avgHPGaugeValueMax : 0;
        const baseScore = (
          (avgDamage / 100000) * 35 +
          (damageEfficiency) * 25 +
          (avgDPS / 1000) * 25 +
          (healthRetention) * 15
        );
        const experienceMatches = char.activeMatchCount || char.matchCount || 1;
        const experienceMultiplier = Math.min(1.25, 1.0 + (experienceMatches - 1) * (0.25 / 11));
        const combatPerformanceScore = Math.round(baseScore * experienceMultiplier * 100) / 100;
        
        // Calculate survival rate (percentage of matches survived)
        const survivalRate = char.matchCount > 0 ? (char.survivalCount / char.matchCount) : 0;
        
        return ({
          ...char,
          avgDamage,
          avgTaken,
          avgHealth,
          avgBattleTime,
          avgDPS,
          avgSpecialMoves: char.totalSpecialMoves / denom,
          avgUltimates: char.totalUltimates / denom,
          avgSkills: char.totalSkills / denom,
          avgSparking: char.totalSparking / denom,
          avgCharges: char.totalCharges / denom,
          avgGuards: char.totalGuards / denom,
          avgEnergyBlasts: char.totalEnergyBlasts / denom,
          avgComboNum: char.totalComboNum / denom,
          avgComboDamage: char.totalComboDamage / denom,
          damageEfficiency,
          healthRetention,
          survivalRate,
          combatPerformanceScore
        });
      })
      .sort((a, b) => b.combatPerformanceScore - a.combatPerformanceScore);
  });
  
  return positionStats;
}

// Helper functions for position analysis
export function calculatePositionAverage(posData, metric) {
  if (!posData.sortedCharacters || posData.sortedCharacters.length === 0) return 0;
  const sum = posData.sortedCharacters.reduce((acc, char) => acc + (char[metric] || 0), 0);
  return sum / posData.sortedCharacters.length;
}

export function calculatePositionSurvivalRate(posData) {
  if (!posData.sortedCharacters || posData.sortedCharacters.length === 0) return 0;
  // Sum up actual survival counts across all characters
  const totalSurvivals = posData.sortedCharacters.reduce((acc, char) => 
    acc + (char.survivalCount || 0), 0);
  // Sum up total match counts
  const totalMatches = posData.sortedCharacters.reduce((acc, char) => 
    acc + char.matchCount, 0);
  return totalMatches > 0 ? Math.round((totalSurvivals / totalMatches) * 100) : 0;
}

export function getPositionInsight(posData, positionName) {
  if (!posData || !posData.sortedCharacters || posData.sortedCharacters.length === 0) {
    return 'No data available';
  }
  
  const avgDamage = calculatePositionAverage(posData, 'avgDamage');
  const avgEfficiency = calculatePositionAverage(posData, 'damageEfficiency');
  const survivalRate = calculatePositionSurvivalRate(posData);
  
  const insights = [];
  
  if (avgDamage > 120000) {
    insights.push('high damage output');
  } else if (avgDamage < 80000) {
    insights.push('lower damage output');
  } else {
    insights.push('moderate damage output');
  }
  
  if (avgEfficiency > 1.5) {
    insights.push('efficient trading');
  } else if (avgEfficiency < 1.0) {
    insights.push('taking more damage than dealing');
  }
  
  if (survivalRate > 60) {
    insights.push('good survivability');
  } else if (survivalRate < 40) {
    insights.push('low survival rate');
  }
  
  return insights.join(', ') || 'balanced performance';
}
