/**
 * Form Stats Calculator Utility
 * 
 * Calculates per-form statistics from characterRecord and characterIdRecord
 * based on transformation tracking data in Dragon Ball Sparking Zero battle results.
 * 
 * Calculation Method:
 * - First Form: Direct values from characterIdRecord[firstTransformKey]
 * - Middle Forms: Subtract previous snapshot from current snapshot
 * - Final Form: Subtract last snapshot from characterRecord
 */

/**
 * Helper function to format character ID for lookup in characterIdRecord
 * Handles both direct keys ("0140_00") and formatted keys ("(Key=\"0140_00\")")
 */
function getCharacterIdRecordKey(characterIdRecord, charId) {
  if (!characterIdRecord || !charId) return null;
  
  // Try direct key first
  if (characterIdRecord[charId]) {
    return charId;
  }
  
  // Try formatted key pattern: (Key="XXXX_XX")
  const formattedKey = `(Key="${charId}")`;
  if (characterIdRecord[formattedKey]) {
    return formattedKey;
  }
  
  return null;
}

/**
 * Helper function to get character snapshot from characterIdRecord
 */
function getSnapshot(characterIdRecord, charId) {
  const key = getCharacterIdRecordKey(characterIdRecord, charId);
  return key ? characterIdRecord[key] : null;
}

/**
 * Subtract stats between two snapshot objects
 * @param {Object} finalSnapshot - The later/final snapshot object (from characterIdRecord or characterRecord)
 * @param {Object} previousSnapshot - The earlier snapshot object (from characterIdRecord)
 * @returns {Object} Calculated difference for all numeric stats
 */
function subtractStats(finalSnapshot, previousSnapshot) {
  if (!finalSnapshot || !previousSnapshot) {
    return finalSnapshot || {};
  }

  const finalBattle = finalSnapshot.battleCount || {};
  const prevBattle = previousSnapshot.battleCount || {};
  const finalNumCount = finalBattle.battleNumCount || {};
  const prevNumCount = prevBattle.battleNumCount || {};
  const finalAdditional = finalSnapshot.additionalCounts || {};
  const prevAdditional = previousSnapshot.additionalCounts || {};
  const finalPlay = finalSnapshot.battlePlayCharacter || {};
  const prevPlay = previousSnapshot.battlePlayCharacter || {};

  return {
    // Core combat stats from battleCount
    damageDone: (finalBattle.givenDamage || 0) - (prevBattle.givenDamage || 0),
    damageTaken: (finalBattle.takenDamage || 0) - (prevBattle.takenDamage || 0),
    battleTime: parseDuration(finalBattle.battleTime) - parseDuration(prevBattle.battleTime),
    
    // Health stats from battlePlayCharacter
    hPGaugeValue: finalPlay.hPGaugeValue || 0, // Current HP is snapshot, not cumulative
    hPGaugeValueMax: finalPlay.hPGaugeValueMax || 0,
    
    // Special abilities from battleNumCount
    specialMovesUsed: ((finalNumCount.sPMCount || 0) - (prevNumCount.sPMCount || 0)),
    ultimatesUsed: ((finalNumCount.uLTCount || 0) - (prevNumCount.uLTCount || 0)),
    skillsUsed: ((finalNumCount.eXACount || 0) - (prevNumCount.eXACount || 0)),
    
    // Blast tracking from additionalCounts
    s1Blast: (finalAdditional.s1Blast || 0) - (prevAdditional.s1Blast || 0),
    s2Blast: (finalAdditional.s2Blast || 0) - (prevAdditional.s2Blast || 0),
    ultBlast: (finalAdditional.ultBlast || 0) - (prevAdditional.ultBlast || 0),
    s1HitBlast: (finalAdditional.s1HitBlast || 0) - (prevAdditional.s1HitBlast || 0),
    s2HitBlast: (finalAdditional.s2HitBlast || 0) - (prevAdditional.s2HitBlast || 0),
    uLTHitBlast: (finalAdditional.uLTHitBlast || 0) - (prevAdditional.uLTHitBlast || 0),
    tags: (finalAdditional.tags || 0) - (prevAdditional.tags || 0),
    
    // Survival & Defense from battleNumCount
    sparkingCount: (finalNumCount.sparkingCount || 0) - (prevNumCount.sparkingCount || 0),
    chargeCount: (finalNumCount.chargeCount || 0) - (prevNumCount.chargeCount || 0),
    guardCount: (finalNumCount.guardCount || 0) - (prevNumCount.guardCount || 0),
    shotEnergyBulletCount: (finalNumCount.shotEnergyBulletCount || 0) - (prevNumCount.shotEnergyBulletCount || 0),
    zCounterCount: (finalNumCount.zCounterCount || 0) - (prevNumCount.zCounterCount || 0),
    superCounterCount: (finalNumCount.superCounterCount || 0) - (prevNumCount.superCounterCount || 0),
    revengeCounterCount: (finalNumCount.revengeCounter || 0) - (prevNumCount.revengeCounter || 0),
    
    // Combat mechanics from battleCount
    maxComboNum: (finalBattle.maxComboNum || 0) - (prevBattle.maxComboNum || 0),
    maxComboDamage: (finalBattle.maxComboDamage || 0) - (prevBattle.maxComboDamage || 0),
    throwCount: (finalNumCount.throwCount || 0) - (prevNumCount.throwCount || 0),
    lightningAttackCount: (finalNumCount.lightningAttackCount || 0) - (prevNumCount.lightningAttackCount || 0),
    vanishingAttackCount: (finalNumCount.vanishingAttackCount || 0) - (prevNumCount.vanishingAttackCount || 0),
    dragonHomingCount: (finalNumCount.dragonHomingCount || 0) - (prevNumCount.dragonHomingCount || 0),
    speedImpactCount: (finalNumCount.speedImpactCount || 0) - (prevNumCount.speedImpactCount || 0),
    speedImpactWins: (finalNumCount.speedImpactWins || 0) - (prevNumCount.speedImpactWins || 0),
    sparkingComboCount: (finalNumCount.sparkingComboCount || 0) - (prevNumCount.sparkingComboCount || 0),
    dragonDashMileage: (finalBattle.dragonDashMileage || 0) - (prevBattle.dragonDashMileage || 0),
    
    // Kills
    kills: (finalBattle.killCount || 0) - (prevBattle.killCount || 0),
  };
}

/**
 * Helper to parse duration string "+00000000.00:01:34.516855700" to seconds
 */
function parseDuration(durationStr) {
  if (!durationStr || typeof durationStr !== 'string') return 0;
  
  // Format: +00000000.HH:MM:SS.nanoseconds
  const match = durationStr.match(/\+\d+\.(\d+):(\d+):(\d+)\./);
  if (!match) return 0;
  
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Calculate per-form statistics from character transformation data
 * @param {Object} characterRecord - Final state from battle result JSON
 * @param {Object} characterIdRecord - Transformation snapshots keyed by character ID
 * @param {Array} formChangeHistory - Ordered list of transformations [{key: "0020_61"}, ...]
 * @param {string} originalCharacterId - The starting character ID
 * @returns {Array} Array of per-form stat objects
 */
export function calculatePerFormStats(characterRecord, characterIdRecord, formChangeHistory, originalCharacterId) {
  if (!characterRecord) {
    return [];
  }

  // If no transformations occurred, return single form with all stats
  if (!formChangeHistory || formChangeHistory.length === 0) {
    return [{
      formNumber: 1,
      formId: originalCharacterId || characterRecord.originalCharacterId,
      isFirstForm: true,
      isFinalForm: true,
      ...characterRecord
    }];
  }

  // Validate characterIdRecord exists
  if (!characterIdRecord || Object.keys(characterIdRecord).length === 0) {
    console.warn('Missing characterIdRecord - cannot calculate per-form stats');
    return [];
  }

  const formsUsed = [];
  
  // Build transformation chain: [originalId, transform1Id, transform2Id, ...]
  const transformChain = [
    originalCharacterId,
    ...formChangeHistory.map(f => f.key)
  ];
  
  // Calculate stats for each form
  for (let i = 0; i < transformChain.length; i++) {
    const currentFormId = transformChain[i];
    const isFirstForm = i === 0;
    const isFinalForm = i === transformChain.length - 1;
    
    let formStats;
    
    if (isFirstForm) {
      // First form: use the snapshot keyed by the originalCharacterId
      // This snapshot was taken just BEFORE the first transformation
      const firstSnapshot = getSnapshot(characterIdRecord, originalCharacterId);
      
      if (!firstSnapshot) {
        console.warn(`Missing snapshot for original form: ${originalCharacterId}`);
        continue;
      }
      
      // Extract stats from first snapshot structure
      const battle = firstSnapshot.battleCount || {};
      const numCount = battle.battleNumCount || {};
      const additional = firstSnapshot.additionalCounts || {};
      const play = firstSnapshot.battlePlayCharacter || {};
      
      formStats = {
        damageDone: battle.givenDamage || 0,
        damageTaken: battle.takenDamage || 0,
        battleTime: parseDuration(battle.battleTime),
        hPGaugeValue: play.hPGaugeValue || 0,
        hPGaugeValueMax: play.hPGaugeValueMax || 0,
        specialMovesUsed: numCount.sPMCount || 0,
        ultimatesUsed: numCount.uLTCount || 0,
        skillsUsed: numCount.eXACount || 0,
        s1Blast: additional.s1Blast || 0,
        s2Blast: additional.s2Blast || 0,
        ultBlast: additional.ultBlast || 0,
        s1HitBlast: additional.s1HitBlast || 0,
        s2HitBlast: additional.s2HitBlast || 0,
        uLTHitBlast: additional.uLTHitBlast || 0,
        tags: additional.tags || 0,
        sparkingCount: numCount.sparkingCount || 0,
        chargeCount: numCount.chargeCount || 0,
        guardCount: numCount.guardCount || 0,
        shotEnergyBulletCount: numCount.shotEnergyBulletCount || 0,
        zCounterCount: numCount.zCounterCount || 0,
        superCounterCount: numCount.superCounterCount || 0,
        revengeCounterCount: numCount.revengeCounter || 0,
        maxComboNum: battle.maxComboNum || 0,
        maxComboDamage: battle.maxComboDamage || 0,
        throwCount: numCount.throwCount || 0,
        lightningAttackCount: numCount.lightningAttackCount || 0,
        vanishingAttackCount: numCount.vanishingAttackCount || 0,
        dragonHomingCount: numCount.dragonHomingCount || 0,
        speedImpactCount: numCount.speedImpactCount || 0,
        speedImpactWins: numCount.speedImpactWins || 0,
        sparkingComboCount: numCount.sparkingComboCount || 0,
        dragonDashMileage: battle.dragonDashMileage || 0,
        kills: battle.killCount || 0,
      };
      
    } else if (isFinalForm) {
      // Final form: subtract previous form's snapshot from characterRecord
      // The previous form ID is transformChain[i-1]
      const previousFormId = transformChain[i - 1];
      const previousSnapshot = getSnapshot(characterIdRecord, previousFormId);
      
      if (!previousSnapshot) {
        console.warn(`Missing snapshot for previous form: ${previousFormId}`);
        continue;
      }
      
      formStats = subtractStats(characterRecord, previousSnapshot);
      
    } else {
      // Middle forms: subtract previous form's snapshot from current form's snapshot
      const previousFormId = transformChain[i - 1];
      const currentSnapshot = getSnapshot(characterIdRecord, currentFormId);
      const previousSnapshot = getSnapshot(characterIdRecord, previousFormId);
      
      if (!currentSnapshot || !previousSnapshot) {
        console.warn(`Missing snapshots for middle form: ${currentFormId} (current) or ${previousFormId} (previous)`);
        continue;
      }
      
      formStats = subtractStats(currentSnapshot, previousSnapshot);
    }
    
    // Add metadata
    formsUsed.push({
      formNumber: i + 1,
      formId: currentFormId,
      isFirstForm,
      isFinalForm,
      ...formStats
    });
  }
  
  return formsUsed;
}

/**
 * Format number with commas
 */
function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return Math.round(num).toLocaleString();
}

/**
 * Format per-form stats for display in UI
 * @param {Array} perFormStats - Raw calculated stats from calculatePerFormStats
 * @param {Object} charMap - Character ID to name mapping
 * @returns {Array} Display-ready form stat objects
 */
export function formatPerFormStatsForDisplay(perFormStats, charMap = {}) {
  if (!perFormStats || perFormStats.length === 0) {
    return [];
  }

  return perFormStats.map(formStat => {
    const characterName = charMap[formStat.formId] || formStat.formId;
    
    // Calculate derived stats
    const damagePerSecond = formStat.battleTime > 0 
      ? (formStat.damageDone || 0) / formStat.battleTime 
      : 0;
    
    const damageEfficiency = (formStat.damageTaken || 0) > 0
      ? (formStat.damageDone || 0) / formStat.damageTaken
      : (formStat.damageDone > 0 ? 999 : 0);
    
    // Calculate blast hit rates
    const s1HitRate = (formStat.s1Blast || 0) > 0
      ? Math.round(((formStat.s1HitBlast || 0) / formStat.s1Blast) * 1000) / 10
      : null;
    
    const s2HitRate = (formStat.s2Blast || 0) > 0
      ? Math.round(((formStat.s2HitBlast || 0) / formStat.s2Blast) * 1000) / 10
      : null;
    
    const ultHitRate = (formStat.ultBlast || 0) > 0
      ? Math.round(((formStat.uLTHitBlast || 0) / formStat.ultBlast) * 1000) / 10
      : null;
    
    const speedImpactWinRate = (formStat.speedImpactCount || 0) > 0
      ? Math.round(((formStat.speedImpactWins || 0) / formStat.speedImpactCount) * 1000) / 10
      : null;
    
    return {
      formNumber: formStat.formNumber,
      formId: formStat.formId,
      characterName,
      isFirstForm: formStat.isFirstForm,
      isFinalForm: formStat.isFinalForm,
      
      // Combat stats (formatted)
      damageDone: formStat.damageDone || 0,
      damageTaken: formStat.damageTaken || 0,
      damagePerSecond,
      damageEfficiency,
      
      // Health & Survival
      hpRemaining: formStat.hPGaugeValue || 0,
      hpMax: formStat.hPGaugeValueMax || 0,
      battleTime: formStat.battleTime || 0,
      battleCount: formStat.battleCount || 0,
      
      // Special abilities
      specialMovesUsed: formStat.specialMovesUsed || 0,
      ultimatesUsed: formStat.ultimatesUsed || 0,
      skillsUsed: formStat.skillsUsed || 0,
      
      // Blast tracking
      s1Blast: formStat.s1Blast || 0,
      s2Blast: formStat.s2Blast || 0,
      ultBlast: formStat.ultBlast || 0,
      s1HitBlast: formStat.s1HitBlast || 0,
      s2HitBlast: formStat.s2HitBlast || 0,
      uLTHitBlast: formStat.uLTHitBlast || 0,
      s1HitRate,
      s2HitRate,
      ultHitRate,
      
      // Survival & Defense
      sparkingCount: formStat.sparkingCount || 0,
      chargeCount: formStat.chargeCount || 0,
      guardCount: formStat.guardCount || 0,
      shotEnergyBulletCount: formStat.shotEnergyBulletCount || 0,
      zCounterCount: formStat.zCounterCount || 0,
      superCounterCount: formStat.superCounterCount || 0,
      revengeCounterCount: formStat.revengeCounterCount || 0,
      
      // Combat mechanics
      maxComboNum: formStat.maxComboNum || 0,
      maxComboDamage: formStat.maxComboDamage || 0,
      throwCount: formStat.throwCount || 0,
      lightningAttackCount: formStat.lightningAttackCount || 0,
      vanishingAttackCount: formStat.vanishingAttackCount || 0,
      dragonHomingCount: formStat.dragonHomingCount || 0,
      speedImpactCount: formStat.speedImpactCount || 0,
      speedImpactWins: formStat.speedImpactWins || 0,
      speedImpactWinRate,
      sparkingComboCount: formStat.sparkingComboCount || 0,
      dragonDashMileage: formStat.dragonDashMileage || 0,
      
      // Kills
      kills: formStat.kills || 0,
    };
  });
}
