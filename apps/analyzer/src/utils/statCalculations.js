import { getBuildComposition } from './buildComposition.js';

// Single source of truth for per-character match stat extraction — used by every
// aggregation util (character/team/position) plus the single-match view.
export function calculateMatchPerformanceScore(stats) {
  const avgDamage = stats.damageDone || 0;
  const avgTaken = stats.damageTaken || 1; // Avoid division by zero
  const avgBattleTime = stats.battleTime || 1; // Avoid division by zero
  const healthRetention = stats.hPGaugeValueMax > 0 ? stats.hPGaugeValue / stats.hPGaugeValueMax : 0;
  
  const damageEfficiency = avgTaken > 0 ? avgDamage / avgTaken : avgDamage / 1000;
  const damagePerSecond = avgBattleTime > 0 ? avgDamage / avgBattleTime : 0;
  
  // Base performance score (normalized metrics) - matches aggregated calculation
  const baseScore = (
    (avgDamage / 100000) * 35 +        // Damage dealt weight: 35%
    (damageEfficiency) * 25 +          // Damage efficiency weight: 25%
    (damagePerSecond / 1000) * 25 +    // Damage per second weight: 25%
    (healthRetention) * 15             // Health retention weight: 15%
  );
  
  // No experience multiplier for single match (that's for aggregated only)
  return baseScore; // Returns score in 0-300+ range naturally
}

export function parseCharacterCSV(csv) {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const map = {};
  for (let i = 1; i < lines.length; i++) {
    const [name, id] = lines[i].split(',');
    if (id) map[id.trim()] = name.trim();
  }
  return map;
}

export function getTeams(characterRecord) {
  const p1Keys = Object.keys(characterRecord).filter(k => k.includes('１Ｐ') || k.includes('AlliesTeamMember'));
  const p2Keys = Object.keys(characterRecord).filter(k => k.includes('２Ｐ') || k.includes('EnemyTeamMember'));
  return {
    p1: p1Keys.map(k => ({ ...characterRecord[k], _key: k })),
    p2: p2Keys.map(k => ({ ...characterRecord[k], _key: k }))
  };
}

export function extractStats(char, charMap, capsuleMap = {}, position = null, aiStrategiesMap = {}) {
  const play = char.battlePlayCharacter || {};
  const count = char.battleCount || {};
  const numCount = count.battleNumCount || {};
  const runBlastCount = count.runBlastCount || {};
  const attackHitCount = count.attackHitCount || {};
  const originalForm = char.battlePlayCharacter?.originalCharacter?.key;
  const currentForm = play.character?.key;
  const charId = originalForm || currentForm || '';
  const name = charMap[charId] || charId || '-';
  
  // Form change history - only show if character actually changed forms
  let formNames = '';
  if (Array.isArray(char.formChangeHistory) && char.formChangeHistory.length > 0) {
    const forms = [originalForm, ...char.formChangeHistory.map(f => f.key)].filter(Boolean);
    formNames = forms.map(f => charMap[f] || f).join(', ');
  }
  
  // Equipment analysis - filter to ONLY capsules (00_0_XXXX pattern)
  const equipItems = play.equipItem || [];
  const equippedCapsules = equipItems
    .map(item => item.key)
    .filter(key => key && key.startsWith('00_0_')) // Only include actual capsules
    .filter(key => capsuleMap[key]) // Only include capsules in our reference data
    .map(key => ({
      id: key,
      name: capsuleMap[key].name,
      capsule: capsuleMap[key]
    }));
  
  const totalCapsuleCost = equippedCapsules.reduce((sum, item) => sum + (item.capsule.cost || 0), 0);
  
  // Extract AI strategy from equipped items
  let aiStrategy = null;
  for (const item of equipItems) {
    const strategy = aiStrategiesMap[item.key];
    if (strategy) {
      aiStrategy = strategy.name;
      break; // Found the AI strategy, stop looking
    }
  }
  // If no AI strategy found, use "Default"
  if (!aiStrategy) {
    aiStrategy = 'Default';
  }
  
  // Categorize capsules by build type using metadata
  const capsuleTypes = {
    melee: 0,
    blast: 0,
    kiBlast: 0,
    defense: 0,
    skill: 0,
    kiEfficiency: 0,
    utility: 0
  };

  const capsuleCosts = {
    melee: 0,
    blast: 0,
    kiBlast: 0,
    defense: 0,
    skill: 0,
    kiEfficiency: 0,
    utility: 0
  };

  equippedCapsules.forEach(item => {
    const buildType = item.capsule.buildType?.toLowerCase() || 'unknown';
    const cost = item.capsule.cost || 0;
    
    switch (buildType) {
      case 'melee':
        capsuleTypes.melee++;
        capsuleCosts.melee += cost;
        break;
      case 'blast':
        capsuleTypes.blast++;
        capsuleCosts.blast += cost;
        break;
      case 'ki blast':  // Normalized format (spaces, not hyphens)
        capsuleTypes.kiBlast++;
        capsuleCosts.kiBlast += cost;
        break;
      case 'defense':
        capsuleTypes.defense++;
        capsuleCosts.defense += cost;
        break;
      case 'skill':
        capsuleTypes.skill++;
        capsuleCosts.skill += cost;
        break;
      case 'ki efficiency':  // Normalized format (spaces, not hyphens)
        capsuleTypes.kiEfficiency++;
        capsuleCosts.kiEfficiency += cost;
        break;
      case 'utility':
        capsuleTypes.utility++;
        capsuleCosts.utility += cost;
        break;
    }
  });
  
  // Parse blast counts for detailed super blast tracking
  let spm1Count = 0;
  let spm2Count = 0;
  let exa1Count = 0;
  let exa2Count = 0;
  
  Object.entries(runBlastCount).forEach(([key, value]) => {
    if (key.includes('SPM1')) spm1Count += value;
    else if (key.includes('SPM2') || key.includes('SPM3')) spm2Count += value;
    else if (key.includes('EXA1')) exa1Count += value;
    else if (key.includes('EXA2')) exa2Count += value;
  });
  
  // New blast tracking system - parse additionalCounts if available
  const additionalCounts = char.additionalCounts || {};
  const hasAdditionalCounts = char.additionalCounts !== undefined;
  
  // New blast tracking (preferred method with fallback to old method)
  const s1Blast = additionalCounts.s1Blast ?? spm1Count;
  const s2Blast = additionalCounts.s2Blast ?? spm2Count;
  const ultBlast = additionalCounts.ultBlast ?? (numCount.uLTCount || 0);
  // Hit blast values should remain undefined for legacy data (no fallback to 0)
  const s1HitBlast = additionalCounts.s1HitBlast;
  const s2HitBlast = additionalCounts.s2HitBlast;
  const uLTHitBlast = additionalCounts.uLTHitBlast;
  const tags = additionalCounts.tags ?? 0;
  
  // Calculate hit rates (percentage) - null if no blasts thrown
  const s1HitRate = s1Blast > 0 ? (s1HitBlast / s1Blast) * 100 : null;
  const s2HitRate = s2Blast > 0 ? (s2HitBlast / s2Blast) * 100 : null;
  const ultHitRate = ultBlast > 0 ? (uLTHitBlast / ultBlast) * 100 : null;
  
  // Parse attack hit counts for combat performance metrics
  let speedImpactCount = 0;
  let speedImpactWins = 0;
  
  Object.entries(attackHitCount).forEach(([key, value]) => {
    // Speed Impact triggers - these indicate speed impact usage
    if (key.includes('actSPIMPO') || key.includes('actRI')) {
      speedImpactCount += value;
    }
  });
  
  // Speed impact wins are tracked in battleNumCount.speedImpactWinCount
  
  return {
    name,
    damageDone: count.givenDamage || 0,
    damageTaken: count.takenDamage || 0,
    battleTime: parseBattleTime(count.battleTime) || 0,
    hPGaugeValue: play.hPGaugeValue || 0,
    hPGaugeValueMax: play.hPGaugeValueMax || 40000,
    specialMovesUsed: numCount.sPMCount || 0,
    ultimatesUsed: numCount.uLTCount || 0,
    skillsUsed: numCount.eXACount || 0,
    kills: count.killCount || 0,
    formChangeHistory: formNames,
    // Survival & Health metrics
    sparkingCount: numCount.sparkingCount || 0,
    chargeCount: numCount.chargeCount || 0,
    guardCount: numCount.guardCount || 0,
    shotEnergyBulletCount: numCount.shotEnergyBulletCount || 0,
    zCounterCount: numCount.zCounter || 0,
    superCounterCount: numCount.superCounterCount || 0,
    revengeCounterCount: numCount.revengeCounter || 0,
    tags, // New: Character swap tracking
    formChangeCount: Array.isArray(char.formChangeHistory) ? char.formChangeHistory.length : 0, // Number of transformations
    // Special Abilities - detailed blast tracking (NEW SYSTEM)
    hasAdditionalCounts, // Flag to determine if new format with additionalCounts
    s1Blast,        // Super 1 thrown
    s2Blast,        // Super 2 thrown
    ultBlast,       // Ultimate thrown
    s1HitBlast,     // Super 1 hit
    s2HitBlast,     // Super 2 hit
    uLTHitBlast,    // Ultimate hit
    s1HitRate,      // Super 1 hit rate %
    s2HitRate,      // Super 2 hit rate %
    ultHitRate,     // Ultimate hit rate %
    // Legacy blast tracking (kept for backwards compatibility)
    spm1Count: s1Blast,
    spm2Count: s2Blast,
    exa1Count,
    exa2Count,
    dragonDashMileage: parseFloat((count.dragonDashMileage || 0).toFixed(0)),
    // Combat Performance metrics
    maxComboNum: count.maxComboNum || 0,
    maxComboDamage: count.maxComboDamage || 0,
    throwCount: numCount.throwCount || 0,
    lightningAttackCount: numCount.lightningAttack || 0,
    vanishingAttackCount: numCount.vanishingAttack || 0,
    dragonHomingCount: numCount.dragonHoming || 0,
    speedImpactCount: numCount.speedImpactCount || speedImpactCount,
    speedImpactWins: numCount.speedImpactWinCount || 0,
    sparkingComboCount: numCount.sparkingCount > 0 ? count.maxComboNum || 0 : 0,
    // Position tracking
    position: position,
    // Equipment data
    equippedCapsules,
    totalCapsuleCost,
    capsuleTypes,
    capsuleCosts,
    buildComposition: getBuildComposition(capsuleCosts), // New 7-category system
    aiStrategy
  };
}

// Parses battle time format "+00000000.00:02:54.470000000" to seconds
export function parseBattleTime(timeString) {
  if (!timeString || typeof timeString !== 'string') return 0;
  
  // Format: "+00000000.00:02:54.470000000"
  // Extract the time part after the first colon
  const timeMatch = timeString.match(/(\d{2}):(\d{2}):(\d{2})\.(\d+)/);
  if (!timeMatch) return 0;
  
  const hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  const seconds = parseInt(timeMatch[3], 10);
  const milliseconds = parseInt(timeMatch[4].substring(0, 3), 10); // Take first 3 digits for milliseconds
  
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

// Formats seconds back to readable time
export function formatBattleTime(seconds) {
  if (!seconds || seconds === 0) return '0:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
