/**
 * AI Strategy Behavioral Insights Generator
 * 
 * Generates intelligent insights about AI behavior patterns, effectiveness,
 * and optimal configurations through statistical analysis.
 * 
 * Supports character-filtered data for future filtering capabilities.
 */

/**
 * PRIMARY PLAYSTYLE ARCHETYPES
 * 
 * Main fighting styles that define the core approach to combat.
 * Each AI will have one primary archetype.
 */
export const PRIMARY_ARCHETYPES = {
  'Melee Fighter': {
    description: 'Relies on close-range melee combat with minimal blast usage',
    thresholds: {
      // Low blast indicators
      s1Blast: { max: 40 },
      s2Blast: { max: 40 },
      ultBlast: { max: 40 },
      // High melee indicators
      throws: { min: 55, ideal: 75 },
      vanishingAttacks: { min: 55, ideal: 75 },
      dragonHoming: { min: 50, ideal: 70 },
      lightningAttacks: { min: 50, ideal: 70 }
    },
    icon: 'Swords',
    color: 'red'
  },
  'Blast Spammer': {
    description: 'Heavy user of Super 1 and Super 2 blast attacks',
    thresholds: {
      // High blast indicators (combined S1 + S2 must be high)
      combinedBlasts: { min: 60, ideal: 80 },
      // Supporting indicators
      charges: { min: 55 },
      ultBlast: { min: 45 }
    },
    icon: 'Flame',
    color: 'orange'
  },
  'Ultimate Specialist': {
    description: 'Focuses primarily on landing ultimate attacks',
    thresholds: {
      ultBlast: { min: 70, ideal: 90 },
      sparkingCount: { min: 60, ideal: 80 }
    },
    icon: 'Star',
    color: 'yellow'
  },
  'Defensive Fighter': {
    description: 'Defensive-focused fighter utilizing counters and guards',
    thresholds: {
      guards: { min: 60, ideal: 80 },
      zCounters: { min: 55, ideal: 75 },
      superCounters: { min: 55, ideal: 75 },
      revengeCounters: { min: 50, ideal: 70 }
    },
    icon: 'Shield',
    color: 'blue'
  }
};

/**
 * SUB-TYPE ARCHETYPES
 * 
 * Secondary fighting styles that complement primary archetypes.
 * An AI can have multiple sub-types alongside their primary archetype.
 */
export const SUBTYPE_ARCHETYPES = {
  'Skill User': {
    description: 'Makes heavy use of special skills and abilities',
    thresholds: {
      combinedSkills: { min: 60, ideal: 85 }
    },
    emoji: '🎯',
    matchLogic: 'combined' // Combined Exa1 + Exa2
  },
  'Rushdown Fighter': {
    description: 'Aggressively pursues opponents with follow-up attacks',
    thresholds: {
      vanishingAttacks: { min: 65, ideal: 85 },
      dragonHoming: { min: 60, ideal: 80 },
      lightningAttacks: { min: 60, ideal: 80 },
      dragonDash: { min: 60, ideal: 80 } // Supporting indicator
    },
    emoji: '🏃',
    matchLogic: 'rushdown' // Need 2 core indicators (lower thresholds if Dragon Dash present)
  },
  'Grappler': {
    description: 'Specializes in throw techniques and grappling',
    thresholds: {
      throws: { min: 65, ideal: 85 }
    },
    emoji: '🤼',
    matchLogic: 'standard'
  },
  'Sparking User': {
    description: 'Frequently activates Sparking Mode',
    thresholds: {
      sparkingCount: { min: 70, ideal: 90 }
    },
    emoji: '✨',
    matchLogic: 'standard'
  },
  'Combo Fighter': {
    description: 'Specializes in extended combos and high damage strings',
    thresholds: {
      maxCombo: { min: 70, ideal: 90 },
      maxComboDamage: { min: 65, ideal: 85 },
      sparkingCombo: { min: 60, ideal: 80 } // Supporting indicator
    },
    emoji: '🥊',
    matchLogic: 'combo' // Need 1+ core indicators (maxCombo OR maxComboDamage)
  },
  'Ki-Blast Spammer': {
    description: 'Uses energy blasts extensively for zoning',
    thresholds: {
      energyBlasts: { min: 75, ideal: 90 }
    },
    emoji: '💫',
    matchLogic: 'standard'
  }
};

/**
 * Statistical Helper Functions
 */

/**
 * Calculate percentile rank of a value in a dataset
 */
export function calculatePercentile(value, allValues) {
  if (!allValues || allValues.length === 0) return 50;
  
  const sorted = [...allValues].sort((a, b) => a - b);
  const belowCount = sorted.filter(v => v < value).length;
  const equalCount = sorted.filter(v => v === value).length;
  
  // Use midpoint of equal values for percentile
  return Math.round(((belowCount + equalCount / 2) / sorted.length) * 100);
}

/**
 * Calculate mean of an array
 */
export function calculateMean(values) {
  if (!values || values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate standard deviation
 */
export function calculateStdDev(values) {
  if (!values || values.length === 0) return 0;
  
  const mean = calculateMean(values);
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = calculateMean(squaredDiffs);
  
  return Math.sqrt(variance);
}

/**
 * Calculate z-score (standard deviations from mean)
 */
export function calculateZScore(value, mean, stdDev) {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/**
 * Normalize value to 0-100 scale based on min/max
 */
export function normalizeToScale(value, min, max) {
  if (max === min) return 50;
  if (value <= min) return 0;
  if (value >= max) return 100;
  return Math.round(((value - min) / (max - min)) * 100);
}

/**
 * Get comparison label for percentile
 */
export function getPercentileLabel(percentile) {
  if (percentile >= 90) return 'Elite';
  if (percentile >= 75) return 'Strong';
  if (percentile >= 60) return 'Above Average';
  if (percentile >= 40) return 'Average';
  if (percentile >= 25) return 'Below Average';
  return 'Weak';
}

/**
 * Get comparison text for percentile
 */
export function getPercentileComparison(percentile, baseLabel = 'vs average') {
  if (percentile >= 85) return `Much higher than average`;
  if (percentile >= 65) return `Above average`;
  if (percentile >= 35) return `Average`;
  if (percentile >= 15) return `Below average`;
  return `Much lower than average`;
}

/**
 * Calculate normalized scores for an AI across all metrics
 * Returns scores on 0-100 scale for each behavioral category
 */
export function calculateNormalizedScores(aiMetrics, allAIMetrics, characterBaseline = null) {
  // If character baseline is provided, use it for comparison
  // Otherwise, compare against all other AIs
  if (characterBaseline) {
    console.log('[NormalizedScores] Using character baseline for comparison');
    // Compare this AI's character performance against the character's overall average
    // This shows how THIS AI affects THIS character's behavior compared to their average
    return {
      // Core combat metrics
      damageDealt: normalizeToScale(aiMetrics.avgDamageDealt || 0, 0, characterBaseline.avgDamageDealt * 2),
      dps: normalizeToScale(aiMetrics.avgDPS || 0, 0, characterBaseline.avgDPS * 2),
      damageTakenPerSec: normalizeToScale(aiMetrics.avgDamageTakenPerSecond || 0, 0, characterBaseline.avgDamageTakenPerSecond * 2),
      damageEfficiency: normalizeToScale(aiMetrics.damageEfficiency || 0, 0, characterBaseline.damageEfficiency * 2),
      survivalRate: normalizeToScale(aiMetrics.avgSurvivalRate || 0, 0, 100),
      
      // Offensive actions
      throws: normalizeToScale(aiMetrics.avgThrows || 0, 0, characterBaseline.avgThrows * 2),
      vanishingAttacks: normalizeToScale(aiMetrics.avgVanishingAttacks || 0, 0, characterBaseline.avgVanishingAttacks * 2),
      dragonDash: normalizeToScale(aiMetrics.avgDragonDashDistance || 0, 0, characterBaseline.avgDragonDashDistance * 2),
      dragonHoming: normalizeToScale(aiMetrics.avgDragonHoming || 0, 0, characterBaseline.avgDragonHoming * 2),
      lightningAttacks: normalizeToScale(aiMetrics.avgLightningAttacks || 0, 0, characterBaseline.avgLightningAttacks * 2),
      energyBlasts: normalizeToScale(aiMetrics.avgEnergyBlasts || 0, 0, characterBaseline.avgEnergyBlasts * 2),
      s1Blast: normalizeToScale(aiMetrics.avgS1Blast || 0, 0, characterBaseline.avgS1Blast * 2),
      s2Blast: normalizeToScale(aiMetrics.avgS2Blast || 0, 0, characterBaseline.avgS2Blast * 2),
      ultBlast: normalizeToScale(aiMetrics.avgUltBlast || 0, 0, characterBaseline.avgUltBlast * 2),
      ultHitRate: normalizeToScale(aiMetrics.avgUltHitRate || 0, 0, 100),
      
      // Defensive actions
      guards: normalizeToScale(aiMetrics.avgGuards || 0, 0, characterBaseline.avgGuards * 2),
      zCounters: normalizeToScale(aiMetrics.avgZCounters || 0, 0, characterBaseline.avgZCounters * 2),
      superCounters: normalizeToScale(aiMetrics.avgSuperCounters || 0, 0, characterBaseline.avgSuperCounters * 2),
      revengeCounters: normalizeToScale(aiMetrics.avgRevengeCounters || 0, 0, characterBaseline.avgRevengeCounters * 2),
      
      // Combo metrics
      maxCombo: normalizeToScale(aiMetrics.avgMaxCombo || 0, 0, characterBaseline.avgMaxCombo * 2),
      maxComboDamage: normalizeToScale(aiMetrics.avgMaxComboDamage || 0, 0, characterBaseline.avgMaxComboDamage * 2),
      sparkingCombo: normalizeToScale(aiMetrics.avgSparkingComboHits || 0, 0, characterBaseline.avgSparkingComboHits * 2),
      
      // Resource management
      charges: normalizeToScale(aiMetrics.avgCharges || 0, 0, characterBaseline.avgCharges * 2),
      sparkingCount: normalizeToScale(aiMetrics.avgSparkingCount || 0, 0, characterBaseline.avgSparkingCount * 2),
      
      // Skills
      exa1Count: normalizeToScale(aiMetrics.avgExa1Count || 0, 0, characterBaseline.avgExa1Count * 2),
      exa2Count: normalizeToScale(aiMetrics.avgExa2Count || 0, 0, characterBaseline.avgExa2Count * 2)
    };
  }
  
  // Default: compare against all other AIs
  const allAIs = Object.values(allAIMetrics).filter(ai => ai.totalMatches >= 5);
  
  if (allAIs.length === 0) {
    return null;
  }
  
  // Helper to get min/max for a metric
  const getMinMax = (metricFn) => {
    const values = allAIs.map(metricFn);
    return {
      min: Math.min(...values),
      max: Math.max(...values)
    };
  };
  
  // Calculate normalized scores for different categories
  const damageDealtRange = getMinMax(ai => ai.avgDamageDealt || 0);
  const dpsRange = getMinMax(ai => ai.avgDPS || 0);
  const damageTakenRange = getMinMax(ai => ai.avgDamageTakenPerSecond || 0);
  const efficiencyRange = getMinMax(ai => ai.damageEfficiency || 0);
  const survivalRange = getMinMax(ai => ai.avgSurvivalRate || 0);
  
  const throwsRange = getMinMax(ai => ai.avgThrows || 0);
  const vanishingRange = getMinMax(ai => ai.avgVanishingAttacks || 0);
  const dragonDashRange = getMinMax(ai => ai.avgDragonDashDistance || 0);
  const dragonHomingRange = getMinMax(ai => ai.avgDragonHoming || 0);
  const lightningAttacksRange = getMinMax(ai => ai.avgLightningAttacks || 0);
  const energyBlastsRange = getMinMax(ai => ai.avgEnergyBlasts || 0);
  const s1BlastRange = getMinMax(ai => ai.avgS1Blast || 0);
  const s2BlastRange = getMinMax(ai => ai.avgS2Blast || 0);
  const ultBlastRange = getMinMax(ai => ai.avgUltBlast || 0);
  const ultHitRateRange = getMinMax(ai => ai.avgUltHitRate || 0);
  
  const guardsRange = getMinMax(ai => ai.avgGuards || 0);
  const zCountersRange = getMinMax(ai => ai.avgZCounters || 0);
  const superCountersRange = getMinMax(ai => ai.avgSuperCounters || 0);
  const revengeCountersRange = getMinMax(ai => ai.avgRevengeCounters || 0);
  
  const maxComboRange = getMinMax(ai => ai.avgMaxCombo || 0);
  const maxComboDamageRange = getMinMax(ai => ai.avgMaxComboDamage || 0);
  const sparkingComboRange = getMinMax(ai => ai.avgSparkingComboHits || 0);
  
  const chargesRange = getMinMax(ai => ai.avgCharges || 0);
  const sparkingCountRange = getMinMax(ai => ai.avgSparkingCount || 0);
  
  const exa1CountRange = getMinMax(ai => ai.avgExa1Count || 0);
  const exa2CountRange = getMinMax(ai => ai.avgExa2Count || 0);
  
  return {
    // Core combat metrics
    damageDealt: normalizeToScale(aiMetrics.avgDamageDealt || 0, damageDealtRange.min, damageDealtRange.max),
    dps: normalizeToScale(aiMetrics.avgDPS || 0, dpsRange.min, dpsRange.max),
    damageTakenPerSec: normalizeToScale(aiMetrics.avgDamageTakenPerSecond || 0, damageTakenRange.min, damageTakenRange.max),
    damageEfficiency: normalizeToScale(aiMetrics.damageEfficiency || 0, efficiencyRange.min, efficiencyRange.max),
    survivalRate: normalizeToScale(aiMetrics.avgSurvivalRate || 0, survivalRange.min, survivalRange.max),
    
    // Offensive actions
    throws: normalizeToScale(aiMetrics.avgThrows || 0, throwsRange.min, throwsRange.max),
    vanishingAttacks: normalizeToScale(aiMetrics.avgVanishingAttacks || 0, vanishingRange.min, vanishingRange.max),
    dragonDash: normalizeToScale(aiMetrics.avgDragonDashDistance || 0, dragonDashRange.min, dragonDashRange.max),
    dragonHoming: normalizeToScale(aiMetrics.avgDragonHoming || 0, dragonHomingRange.min, dragonHomingRange.max),
    lightningAttacks: normalizeToScale(aiMetrics.avgLightningAttacks || 0, lightningAttacksRange.min, lightningAttacksRange.max),
    energyBlasts: normalizeToScale(aiMetrics.avgEnergyBlasts || 0, energyBlastsRange.min, energyBlastsRange.max),
    s1Blast: normalizeToScale(aiMetrics.avgS1Blast || 0, s1BlastRange.min, s1BlastRange.max),
    s2Blast: normalizeToScale(aiMetrics.avgS2Blast || 0, s2BlastRange.min, s2BlastRange.max),
    ultBlast: normalizeToScale(aiMetrics.avgUltBlast || 0, ultBlastRange.min, ultBlastRange.max),
    ultHitRate: normalizeToScale(aiMetrics.avgUltHitRate || 0, ultHitRateRange.min, ultHitRateRange.max),
    
    // Defensive actions
    guards: normalizeToScale(aiMetrics.avgGuards || 0, guardsRange.min, guardsRange.max),
    zCounters: normalizeToScale(aiMetrics.avgZCounters || 0, zCountersRange.min, zCountersRange.max),
    superCounters: normalizeToScale(aiMetrics.avgSuperCounters || 0, superCountersRange.min, superCountersRange.max),
    revengeCounters: normalizeToScale(aiMetrics.avgRevengeCounters || 0, revengeCountersRange.min, revengeCountersRange.max),
    
    // Combo metrics
    maxCombo: normalizeToScale(aiMetrics.avgMaxCombo || 0, maxComboRange.min, maxComboRange.max),
    maxComboDamage: normalizeToScale(aiMetrics.avgMaxComboDamage || 0, maxComboDamageRange.min, maxComboDamageRange.max),
    sparkingCombo: normalizeToScale(aiMetrics.avgSparkingComboHits || 0, sparkingComboRange.min, sparkingComboRange.max),
    
    // Resource management
    charges: normalizeToScale(aiMetrics.avgCharges || 0, chargesRange.min, chargesRange.max),
    sparkingCount: normalizeToScale(aiMetrics.avgSparkingCount || 0, sparkingCountRange.min, sparkingCountRange.max),
    
    // Skills
    exa1Count: normalizeToScale(aiMetrics.avgExa1Count || 0, exa1CountRange.min, exa1CountRange.max),
    exa2Count: normalizeToScale(aiMetrics.avgExa2Count || 0, exa2CountRange.min, exa2CountRange.max)
  };
}

/**
 * Detect playstyle archetype for an AI
 * Returns primary archetype, sub-types, and match scores
 */
export function detectPlaystyleArchetype(normalizedScores) {
  if (!normalizedScores) return null;
  
  // Detect primary archetype
  const primaryMatches = detectPrimaryArchetype(normalizedScores);
  
  // Detect sub-types
  const subTypeMatches = detectSubTypes(normalizedScores);
  
  return {
    primary: primaryMatches.primary,
    secondary: primaryMatches.secondary,
    subTypes: subTypeMatches
  };
}

/**
 * Detect primary archetype
 */
function detectPrimaryArchetype(normalizedScores) {
  const archetypeMatches = [];
  
  // Check each primary archetype
  for (const [archetypeName, archetype] of Object.entries(PRIMARY_ARCHETYPES)) {
    let matchScore = 0;
    let criteriaCount = 0;
    
    // Special handling for archetypes with multiple optional indicators
    if (archetypeName === 'Melee Fighter') {
      // Must have low blast usage (all 3 conditions)
      const lowBlastCriteria = ['s1Blast', 's2Blast', 'ultBlast'];
      let lowBlastMet = 0;
      lowBlastCriteria.forEach(metric => {
        const score = normalizedScores[metric];
        if (score !== undefined && score <= 40) {
          lowBlastMet++;
          matchScore += 100;
        }
        criteriaCount++;
      });
      
      // High melee indicators (any is good, more is better)
      const meleeCriteria = ['throws', 'vanishingAttacks', 'dragonHoming', 'lightningAttacks'];
      meleeCriteria.forEach(metric => {
        const score = normalizedScores[metric];
        const threshold = archetype.thresholds[metric];
        if (score !== undefined && threshold) {
          criteriaCount++;
          if (score >= (threshold.min || 0)) {
            matchScore += 100;
            if (threshold.ideal && score >= threshold.ideal) {
              matchScore += 20;
            }
          } else {
            const proximity = score / (threshold.min || 1);
            matchScore += proximity * 50;
          }
        }
      });
    } else if (archetypeName === 'Blast Spammer') {
      // Need high combined S1 + S2 blasts
      const s1Score = normalizedScores.s1Blast || 0;
      const s2Score = normalizedScores.s2Blast || 0;
      const combinedScore = (s1Score + s2Score) / 2; // Average to keep on 0-100 scale
      
      const threshold = archetype.thresholds.combinedBlasts;
      criteriaCount++;
      
      if (combinedScore >= threshold.min) {
        matchScore += 150; // Strong indicator
        if (threshold.ideal && combinedScore >= threshold.ideal) {
          matchScore += 20;
        }
      } else {
        const proximity = combinedScore / threshold.min;
        matchScore += proximity * 75;
      }
      
      // Supporting indicators
      ['charges', 'ultBlast'].forEach(metric => {
        const score = normalizedScores[metric];
        const supportThreshold = archetype.thresholds[metric];
        if (score !== undefined && supportThreshold && score >= (supportThreshold.min || 0)) {
          matchScore += 50; // Lower weight for supporting criteria
          criteriaCount++;
        }
      });
      
      criteriaCount = Math.max(criteriaCount, 1); // Avoid division by zero
    } else {
      // Standard threshold checking for other archetypes
      for (const [metric, threshold] of Object.entries(archetype.thresholds)) {
        const score = normalizedScores[metric];
        if (score === undefined) continue;
        
        criteriaCount++;
        
        // Check if score meets threshold requirements
        if (threshold.min !== undefined && threshold.max !== undefined) {
          // Range check
          if (score >= threshold.min && score <= threshold.max) {
            matchScore += 100;
          }
        } else if (threshold.min !== undefined) {
          // Minimum check
          if (score >= threshold.min) {
            matchScore += 100;
            // Bonus for exceeding ideal
            if (threshold.ideal && score >= threshold.ideal) {
              matchScore += 20;
            }
          } else {
            // Partial credit for getting close
            const proximity = score / threshold.min;
            matchScore += proximity * 50;
          }
        } else if (threshold.max !== undefined) {
          // Maximum check (lower is better)
          if (score <= threshold.max) {
            matchScore += 100;
          } else {
            // Partial credit
            const proximity = threshold.max / score;
            matchScore += proximity * 50;
          }
        }
      }
    }
    
    if (criteriaCount > 0) {
      const avgMatchScore = matchScore / criteriaCount;
      archetypeMatches.push({
        archetype: archetypeName,
        score: avgMatchScore,
        description: archetype.description,
        icon: archetype.icon,
        color: archetype.color
      });
    }
  }
  
  // Sort by match score
  archetypeMatches.sort((a, b) => b.score - a.score);
  
  // Return primary (and secondary if close)
  const result = {
    primary: archetypeMatches[0],
    secondary: null
  };
  
  // Include secondary if it's reasonably close (within 15 points)
  if (archetypeMatches.length > 1 && archetypeMatches[1].score >= 60 && 
      (archetypeMatches[0].score - archetypeMatches[1].score) <= 15) {
    result.secondary = archetypeMatches[1];
  }
  
  return result;
}

/**
 * Detect sub-type archetypes
 * Returns array of matching sub-types
 */
function detectSubTypes(normalizedScores) {
  const subTypeMatches = [];
  
  for (const [subTypeName, subType] of Object.entries(SUBTYPE_ARCHETYPES)) {
    let matchScore = 0;
    let criteriaCount = 0;
    let highCriteriaCount = 0;
    
    const matchLogic = subType.matchLogic || 'standard';
    
    if (matchLogic === 'combined') {
      // For "combined" logic (like Skill User), use sum of metrics
      if (subTypeName === 'Skill User') {
        const exa1Score = normalizedScores.exa1Count || 0;
        const exa2Score = normalizedScores.exa2Count || 0;
        const combinedScore = (exa1Score + exa2Score) / 2; // Average to keep on 0-100 scale
        
        const threshold = subType.thresholds.combinedSkills;
        criteriaCount++;
        
        if (combinedScore >= threshold.min) {
          matchScore += 150;
          if (threshold.ideal && combinedScore >= threshold.ideal) {
            matchScore += 20;
          }
        } else {
          const proximity = combinedScore / threshold.min;
          matchScore += proximity * 75;
        }
      }
    } else if (matchLogic === 'rushdown') {
      // For Rushdown Fighter: need 2 core indicators, Dragon Dash is supporting
      const vanishingScore = normalizedScores.vanishingAttacks || 0;
      const homingScore = normalizedScores.dragonHoming || 0;
      const lightningScore = normalizedScores.lightningAttacks || 0;
      const dragonDashScore = normalizedScores.dragonDash || 0;
      
      const dragonDashThreshold = subType.thresholds.dragonDash;
      const hasDragonDash = dragonDashScore >= (dragonDashThreshold.min || 0);
      
      // Lower thresholds slightly if Dragon Dash is present
      const adjustedThreshold = hasDragonDash ? 0.9 : 1.0;
      
      const coreMetrics = [
        { name: 'vanishingAttacks', score: vanishingScore },
        { name: 'dragonHoming', score: homingScore },
        { name: 'lightningAttacks', score: lightningScore }
      ];
      
      coreMetrics.forEach(metric => {
        const threshold = subType.thresholds[metric.name];
        if (metric.score !== undefined && threshold) {
          criteriaCount++;
          const effectiveMin = (threshold.min || 0) * adjustedThreshold;
          
          if (metric.score >= effectiveMin) {
            highCriteriaCount++;
            matchScore += 100;
            if (threshold.ideal && metric.score >= threshold.ideal) {
              matchScore += 20;
            }
          } else {
            const proximity = metric.score / effectiveMin;
            matchScore += proximity * 30;
          }
        }
      });
      
      // Add Dragon Dash as supporting indicator
      if (hasDragonDash) {
        matchScore += 40; // Bonus for having supporting indicator
      }
      
      // Require at least 2 core indicators high
      if (highCriteriaCount < 2) {
        matchScore *= 0.5; // Heavily penalize if less than 2 are high
      }
    } else if (matchLogic === 'combo') {
      // For Combo Fighter: need 1+ core indicators (maxCombo OR maxComboDamage)
      const maxComboScore = normalizedScores.maxCombo || 0;
      const maxComboDamageScore = normalizedScores.maxComboDamage || 0;
      const sparkingComboScore = normalizedScores.sparkingCombo || 0;
      
      // Check core indicators
      let hasCoreIndicator = false;
      
      ['maxCombo', 'maxComboDamage'].forEach(metric => {
        const score = metric === 'maxCombo' ? maxComboScore : maxComboDamageScore;
        const threshold = subType.thresholds[metric];
        
        if (score !== undefined && threshold) {
          criteriaCount++;
          
          if (score >= threshold.min) {
            hasCoreIndicator = true;
            highCriteriaCount++;
            matchScore += 100;
            if (threshold.ideal && score >= threshold.ideal) {
              matchScore += 20;
            }
          } else {
            const proximity = score / threshold.min;
            matchScore += proximity * 50;
          }
        }
      });
      
      // Add supporting indicator (Sparking Combo)
      const sparkingThreshold = subType.thresholds.sparkingCombo;
      if (sparkingComboScore >= (sparkingThreshold.min || 0)) {
        matchScore += 40; // Bonus for supporting indicator
      }
      
      // Require at least 1 core indicator
      if (!hasCoreIndicator) {
        matchScore *= 0.5; // Penalize if no core indicators
      }
    } else if (matchLogic === 'multiple') {
      // For "multiple" logic, need at least 2 high indicators
      for (const [metric, threshold] of Object.entries(subType.thresholds)) {
        const score = normalizedScores[metric];
        if (score === undefined) continue;
        
        criteriaCount++;
        
        if (threshold.min !== undefined && score >= threshold.min) {
          highCriteriaCount++;
          matchScore += 100;
          if (threshold.ideal && score >= threshold.ideal) {
            matchScore += 20;
          }
        } else if (threshold.min !== undefined) {
          const proximity = score / threshold.min;
          matchScore += proximity * 30; // Lower partial credit for sub-types
        }
      }
      
      // Require at least 2 criteria to be high for multiple logic
      if (highCriteriaCount < 2) {
        matchScore *= 0.5; // Heavily penalize if less than 2 are high
      }
    } else {
      // Standard threshold checking
      for (const [metric, threshold] of Object.entries(subType.thresholds)) {
        const score = normalizedScores[metric];
        if (score === undefined) continue;
        
        criteriaCount++;
        
        if (threshold.min !== undefined) {
          if (score >= threshold.min) {
            matchScore += 100;
            if (threshold.ideal && score >= threshold.ideal) {
              matchScore += 20;
            }
          } else {
            const proximity = score / threshold.min;
            matchScore += proximity * 50;
          }
        }
      }
    }
    
    if (criteriaCount > 0) {
      const avgMatchScore = matchScore / criteriaCount;
      
      // Only include sub-type if it has a strong match (60+)
      if (avgMatchScore >= 60) {
        subTypeMatches.push({
          archetype: subTypeName,
          score: avgMatchScore,
          description: subType.description,
          icon: subType.icon,
          color: subType.color
        });
      }
    }
  }
  
  // Sort by match score and return top matches
  subTypeMatches.sort((a, b) => b.score - a.score);
  
  return subTypeMatches;
}

/**
 * Generate action frequency insights
 * Compares how often this AI performs actions vs others
 */
export function generateActionFrequencyInsights(aiMetrics, allAIMetrics, characterBaseline = null, characterFiltered = false) {
  const insights = [];
  
  console.log('[ActionFrequency] Character filtered:', characterFiltered);
  console.log('[ActionFrequency] Character baseline:', characterBaseline);
  
  // When character-filtered, compare against character baseline instead of other AIs
  const useCharacterBaseline = characterFiltered && characterBaseline;
  
  if (!useCharacterBaseline) {
    // Original logic: compare against other AIs
    const allAIs = Object.values(allAIMetrics).filter(ai => ai.totalMatches >= 5);
    
    if (allAIs.length < 2) {
      console.log('[ActionFrequency] Not enough AIs for comparison (need 2+, have ' + allAIs.length + ')');
      return insights;
    }
  
    // Define actions to analyze
    const actions = [
      { key: 'avgThrows', label: 'Throws', emoji: '🤜' },
      { key: 'avgVanishingAttacks', label: 'Vanishing Attacks', emoji: '💨' },
      { key: 'avgDragonHoming', label: 'Dragon Homing', emoji: '🐉' },
      { key: 'avgLightningAttacks', label: 'Lightning Attacks', emoji: '⚡' },
      { key: 'avgEnergyBlasts', label: 'Energy Blasts', emoji: '💫' },
      { key: 'avgS1Blast', label: 'Super 1 Blasts', emoji: '🔵' },
      { key: 'avgS2Blast', label: 'Super 2 Blasts', emoji: '🔷' },
      { key: 'avgUltBlast', label: 'Ultimate Blasts', emoji: '💥' },
      { key: 'avgExa1Count', label: 'Skill 1 Uses', emoji: '🎯' },
      { key: 'avgExa2Count', label: 'Skill 2 Uses', emoji: '🎯' },
      { key: 'avgGuards', label: 'Guards', emoji: '🛡️' },
      { key: 'avgZCounters', label: 'Z-Counters', emoji: '↩️' },
      { key: 'avgSuperCounters', label: 'Super Counters', emoji: '🔄' },
      { key: 'avgRevengeCounters', label: 'Revenge Counters', emoji: '💢' },
      { key: 'avgSparkingCount', label: 'Sparking Activations', emoji: '✨' },
      { key: 'avgCharges', label: 'Ki Charges', emoji: '⚡' }
    ];
    
    // Calculate all action insights with their notability scores
    const allInsights = [];
    
    for (const action of actions) {
      const value = aiMetrics[action.key] || 0;
      const allValues = allAIs.map(ai => ai[action.key] || 0);
      const mean = calculateMean(allValues);
      const percentile = calculatePercentile(value, allValues);
      
      const diff = mean > 0 ? ((value - mean) / mean * 100) : 0;
      const diffText = diff >= 0 ? `+${Math.round(diff)}%` : `${Math.round(diff)}%`;
      
      // Calculate notability score (distance from 50th percentile)
      const notabilityScore = Math.abs(percentile - 50);
      
      allInsights.push({
        action: action.label,
        emoji: action.emoji,
        value: value.toFixed(1),
        percentile,
        label: getPercentileLabel(percentile),
        comparison: getPercentileComparison(percentile),
        diff: diffText,
        isSignature: percentile >= 85,
        isRare: percentile <= 15,
        notabilityScore
      });
    }
    
    // Sort by notability score (most extreme percentiles first)
    allInsights.sort((a, b) => b.notabilityScore - a.notabilityScore);
    
    // Get truly notable actions (signature or rare)
    const notableActions = allInsights.filter(insight => insight.isSignature || insight.isRare);
    
    // If more than 6 notable actions, return all of them
    if (notableActions.length > 6) {
      console.log('[ActionFrequency] Returning ' + notableActions.length + ' notable actions');
      return notableActions;
    }
    
    // Otherwise, return top 6 most extreme (to ensure we always show 6)
    console.log('[ActionFrequency] Returning top 6 actions');
    return allInsights.slice(0, 6);
  }
  
  // Character-filtered mode: compare AI's character performance vs character's baseline
  console.log('[ActionFrequency] Using character baseline comparison');
  
  const actions = [
    { key: 'avgThrows', label: 'Throws', emoji: '🤜' },
    { key: 'avgVanishingAttacks', label: 'Vanishing Attacks', emoji: '💨' },
    { key: 'avgDragonHoming', label: 'Dragon Homing', emoji: '🐉' },
    { key: 'avgLightningAttacks', label: 'Lightning Attacks', emoji: '⚡' },
    { key: 'avgEnergyBlasts', label: 'Energy Blasts', emoji: '💫' },
    { key: 'avgS1Blast', label: 'Super 1 Blasts', emoji: '🔵' },
    { key: 'avgS2Blast', label: 'Super 2 Blasts', emoji: '🔷' },
    { key: 'avgUltBlast', label: 'Ultimate Blasts', emoji: '💥' },
    { key: 'avgExa1Count', label: 'Skill 1 Uses', emoji: '🎯' },
    { key: 'avgExa2Count', label: 'Skill 2 Uses', emoji: '🎯' },
    { key: 'avgGuards', label: 'Guards', emoji: '🛡️' },
    { key: 'avgZCounters', label: 'Z-Counters', emoji: '↩️' },
    { key: 'avgSuperCounters', label: 'Super Counters', emoji: '🔄' },
    { key: 'avgRevengeCounters', label: 'Revenge Counters', emoji: '💢' },
    { key: 'avgSparkingCount', label: 'Sparking Activations', emoji: '✨' },
    { key: 'avgCharges', label: 'Ki Charges', emoji: '⚡' }
  ];
  
  const allInsights = [];
  
  for (const action of actions) {
    const aiValue = aiMetrics[action.key] || 0;
    const baselineValue = characterBaseline[action.key] || 0;
    
    // Skip if both values are 0
    if (aiValue === 0 && baselineValue === 0) continue;
    
    // Calculate difference from baseline
    const diff = baselineValue > 0 ? ((aiValue - baselineValue) / baselineValue * 100) : 0;
    const diffText = diff >= 0 ? `+${Math.round(diff)}%` : `${Math.round(diff)}%`;
    
    // Convert to percentile-like score (0-100 scale)
    // If AI value is higher than baseline, score > 50
    // If AI value is lower than baseline, score < 50
    let percentile = 50;
    if (baselineValue > 0) {
      const ratio = aiValue / baselineValue;
      // Map ratio to percentile: 0.5x = 25%, 1.0x = 50%, 1.5x = 75%, 2.0x = 90%, etc.
      if (ratio <= 1.0) {
        percentile = ratio * 50; // 0-50 range
      } else {
        // Above baseline: map 1.0-2.0 to 50-90, 2.0+ to 90-100
        percentile = Math.min(100, 50 + (ratio - 1.0) * 40);
      }
    }
    
    // Calculate notability score (distance from baseline)
    const notabilityScore = Math.abs(diff);
    
    allInsights.push({
      action: action.label,
      emoji: action.emoji,
      value: aiValue.toFixed(1),
      percentile: Math.round(percentile),
      label: getPercentileLabel(percentile),
      comparison: getPercentileComparison(percentile),
      diff: diffText,
      isSignature: Math.abs(diff) >= 30 && diff > 0, // 30%+ above baseline
      isRare: Math.abs(diff) >= 30 && diff < 0, // 30%+ below baseline
      notabilityScore
    });
  }
  
  // Sort by notability score (biggest differences from baseline)
  allInsights.sort((a, b) => b.notabilityScore - a.notabilityScore);
  
  // Get truly notable actions (30%+ difference)
  const notableActions = allInsights.filter(insight => insight.notabilityScore >= 30);
  
  if (notableActions.length > 6) {
    console.log('[ActionFrequency] Returning ' + notableActions.length + ' notable character-filtered actions');
    return notableActions;
  }
  
  // Otherwise, return top 8 most different (show more for character comparison)
  console.log('[ActionFrequency] Returning top 8 character-filtered actions');
  return allInsights.slice(0, 8);
}

/**
 * Generate combat effectiveness insights
 */
export function generateCombatEffectivenessInsights(aiMetrics, allAIMetrics) {
  const allAIs = Object.values(allAIMetrics).filter(ai => ai.totalMatches >= 5);
  
  if (allAIs.length < 2) return null;
  
  // Calculate percentiles for key metrics
  const winRatePercentile = calculatePercentile(
    aiMetrics.winRate,
    allAIs.map(ai => ai.winRate)
  );
  
  const performancePercentile = calculatePercentile(
    aiMetrics.combatPerformanceScore,
    allAIs.map(ai => ai.combatPerformanceScore)
  );
  
  const efficiencyPercentile = calculatePercentile(
    aiMetrics.damageEfficiency || 0,
    allAIs.map(ai => ai.damageEfficiency || 0)
  );
  
  const survivalPercentile = calculatePercentile(
    aiMetrics.avgSurvivalRate,
    allAIs.map(ai => ai.avgSurvivalRate)
  );
  
  const damagePercentile = calculatePercentile(
    aiMetrics.avgDamageDealt,
    allAIs.map(ai => ai.avgDamageDealt)
  );
  
  const dpsPercentile = calculatePercentile(
    aiMetrics.avgDPS || 0,
    allAIs.map(ai => ai.avgDPS || 0)
  );
  
  return {
    winRate: {
      value: aiMetrics.winRate,
      percentile: winRatePercentile,
      label: getPercentileLabel(winRatePercentile)
    },
    performance: {
      value: aiMetrics.combatPerformanceScore,
      percentile: performancePercentile,
      label: getPercentileLabel(performancePercentile)
    },
    efficiency: {
      value: aiMetrics.damageEfficiency || 0,
      percentile: efficiencyPercentile,
      label: getPercentileLabel(efficiencyPercentile)
    },
    survival: {
      value: aiMetrics.avgSurvivalRate,
      percentile: survivalPercentile,
      label: getPercentileLabel(survivalPercentile)
    },
    damage: {
      value: aiMetrics.avgDamageDealt,
      percentile: damagePercentile,
      label: getPercentileLabel(damagePercentile)
    },
    dps: {
      value: aiMetrics.avgDPS || 0,
      percentile: dpsPercentile,
      label: getPercentileLabel(dpsPercentile)
    }
  };
}

/**
 * Generate build effectiveness insights
 */
/**
 * Generate build behavioral impact insights
 * Analyzes action frequency patterns correlated with build types
 */
export function generateBuildBehavioralImpact(aiMetrics, characterBaseline, characterFiltered = false) {
  const insights = {
    impacts: [],
    mostDistinct: null
  };
  
  const builds = aiMetrics.buildTypeDistribution || [];
  
  console.log('[BuildBehavioral] Full aiMetrics object:', aiMetrics);
  console.log('[BuildBehavioral] Initial builds:', builds);
  console.log('[BuildBehavioral] Character filtered:', characterFiltered);
  console.log('[BuildBehavioral] Character baseline:', characterBaseline);
  
  // Adjust threshold based on whether data is character-filtered
  // Character-filtered data has much smaller sample sizes, so use lower threshold
  const minBuildCount = characterFiltered ? 1 : 3;
  console.log('[BuildBehavioral] Using minimum build count threshold:', minBuildCount);
  
  // Filter builds with sufficient data and action averages
  const significantBuilds = builds.filter(b => b.count >= minBuildCount && b.actionAverages);
  
  console.log('[BuildBehavioral] Significant builds (count >= ' + minBuildCount + ', with actionAverages):', significantBuilds);
  
  if (significantBuilds.length === 0) {
    console.log('[BuildBehavioral] No significant builds, returning null');
    return null;
  }
  
  // Determine baseline for comparison
  // If character baseline is provided (character filtering), use it
  // Otherwise use AI's overall action averages
  const useCharacterBaseline = characterFiltered && characterBaseline;
  const aiOverallActions = useCharacterBaseline ? {
    energyBlasts: characterBaseline.avgEnergyBlasts || 0,
    s1Blast: characterBaseline.avgS1Blast || 0,
    s2Blast: characterBaseline.avgS2Blast || 0,
    ultBlast: characterBaseline.avgUltBlast || 0,
    throws: characterBaseline.avgThrows || 0,
    vanishingAttacks: characterBaseline.avgVanishingAttacks || 0,
    dragonDash: characterBaseline.avgDragonDashDistance || 0,
    guards: characterBaseline.avgGuards || 0,
    zCounters: characterBaseline.avgZCounters || 0,
    superCounters: characterBaseline.avgSuperCounters || 0,
    charges: characterBaseline.avgCharges || 0,
    sparkingCount: characterBaseline.avgSparkingCount || 0,
    tags: characterBaseline.avgTags || 0,
    maxCombo: characterBaseline.avgMaxCombo || 0
  } : {
    energyBlasts: aiMetrics.avgEnergyBlasts || 0,
    s1Blast: aiMetrics.avgS1Blast || 0,
    s2Blast: aiMetrics.avgS2Blast || 0,
    ultBlast: aiMetrics.avgUltBlast || 0,
    throws: aiMetrics.avgThrows || 0,
    vanishingAttacks: aiMetrics.avgVanishingAttacks || 0,
    dragonDash: aiMetrics.avgDragonDashDistance || 0,
    guards: aiMetrics.avgGuards || 0,
    zCounters: aiMetrics.avgZCounters || 0,
    superCounters: aiMetrics.avgSuperCounters || 0,
    charges: aiMetrics.avgCharges || 0,
    sparkingCount: aiMetrics.avgSparkingCount || 0,
    tags: aiMetrics.avgTags || 0,
    maxCombo: aiMetrics.avgMaxCombo || 0
  };
  
  console.log('[BuildBehavioral] Baseline actions (using ' + (useCharacterBaseline ? 'character baseline' : 'AI overall') + '):', aiOverallActions);
  
  // Analyze each build type by comparing to AI's own overall averages
  significantBuilds.forEach(build => {
    const frequencies = [];
    const buildActions = build.actionAverages;
    
    console.log(`[BuildBehavioral] Processing build: ${build.buildType}, count: ${build.count}`);
    console.log(`[BuildBehavioral] Build action averages:`, buildActions);
    
    // Compare build-specific actions to AI's overall averages
    const comparisons = [
      { action: 'Energy Blasts', buildValue: buildActions.energyBlasts, overallValue: aiOverallActions.energyBlasts },
      { action: 'S1 Blasts', buildValue: buildActions.s1Blast, overallValue: aiOverallActions.s1Blast },
      { action: 'S2 Blasts', buildValue: buildActions.s2Blast, overallValue: aiOverallActions.s2Blast },
      { action: 'Ult Blasts', buildValue: buildActions.ultBlast, overallValue: aiOverallActions.ultBlast },
      { action: 'Throws', buildValue: buildActions.throws, overallValue: aiOverallActions.throws },
      { action: 'Vanishing Attacks', buildValue: buildActions.vanishingAttacks, overallValue: aiOverallActions.vanishingAttacks },
      { action: 'Guards', buildValue: buildActions.guards, overallValue: aiOverallActions.guards },
      { action: 'Z-Counters', buildValue: buildActions.zCounters, overallValue: aiOverallActions.zCounters },
      { action: 'Super Counters', buildValue: buildActions.superCounters, overallValue: aiOverallActions.superCounters },
      { action: 'Charges', buildValue: buildActions.charges, overallValue: aiOverallActions.charges },
      { action: 'Sparking', buildValue: buildActions.sparkingCount, overallValue: aiOverallActions.sparkingCount },
      { action: 'Tags', buildValue: buildActions.tags, overallValue: aiOverallActions.tags },
      { action: 'Max Combo', buildValue: buildActions.maxCombo, overallValue: aiOverallActions.maxCombo }
    ];
    
    console.log(`[BuildBehavioral] Checking ${comparisons.length} actions for ${build.buildType}`);
    
    // Find notable differences (comparing build vs overall)
    comparisons.forEach(comp => {
      if (comp.overallValue > 0 && comp.buildValue > 0) {
        const percentDiff = ((comp.buildValue - comp.overallValue) / comp.overallValue) * 100;
        console.log(`[BuildBehavioral] ${comp.action}: buildValue=${comp.buildValue.toFixed(2)}, overallValue=${comp.overallValue.toFixed(2)}, diff=${percentDiff.toFixed(1)}%`);
        if (Math.abs(percentDiff) >= 10) { // 10% difference threshold
          frequencies.push({
            action: comp.action,
            value: comp.buildValue,
            avg: comp.overallValue,
            percentDiff: percentDiff.toFixed(1),
            direction: percentDiff > 0 ? 'above' : 'below'
          });
        }
      }
    });
    
    console.log(`[BuildBehavioral] Found ${frequencies.length} notable differences for ${build.buildType}`);
    
    // Sort: prioritize increases (above) over decreases, then by magnitude
    frequencies.sort((a, b) => {
      // If one is above and other is below, prioritize above
      if (a.direction === 'above' && b.direction === 'below') return -1;
      if (a.direction === 'below' && b.direction === 'above') return 1;
      // If same direction, sort by magnitude
      return Math.abs(parseFloat(b.percentDiff)) - Math.abs(parseFloat(a.percentDiff));
    });
    
    console.log(`[BuildBehavioral] Total frequencies for ${build.buildType}: ${frequencies.length}`);
    
    if (frequencies.length > 0) {
      console.log(`[BuildBehavioral] Adding ${build.buildType} to impacts`);
      insights.impacts.push({
        buildType: build.buildType,
        count: build.count,
        percentage: build.percentage,
        winRate: build.winRate,
        frequencies: frequencies.slice(0, 5) // Top 5 most notable (prioritizing increases)
      });
    } else {
      console.log(`[BuildBehavioral] Skipping ${build.buildType} - no notable differences found`);
    }
  });
  
  // Sort by usage frequency (most common builds first)
  insights.impacts.sort((a, b) => b.count - a.count);
  
  if (insights.impacts.length > 0) {
    insights.mostDistinct = insights.impacts[0];
    // Limit to top 6 for display
    insights.impacts = insights.impacts.slice(0, 6);
  }
  
  console.log('[BuildBehavioral] Final insights:', JSON.stringify(insights, null, 2));
  
  return insights;
}

/**
 * Generate capsule behavioral impact insights
 * Analyzes action frequency patterns correlated with capsule usage
 */
export function generateCapsuleBehavioralImpact(aiMetrics, characterBaseline, characterFiltered = false) {
  const insights = {
    impacts: [],
    mostImpactful: null
  };
  
  const capsules = aiMetrics.topCapsules || [];
  
  console.log('[CapsuleBehavioral] Initial capsules:', capsules);
  console.log('[CapsuleBehavioral] Character filtered:', characterFiltered);
  console.log('[CapsuleBehavioral] Character baseline:', characterBaseline);
  
  if (capsules.length === 0) {
    console.log('[CapsuleBehavioral] No capsules, returning null');
    return null;
  }
  
  // Adjust threshold based on whether data is character-filtered
  // Character-filtered data has much smaller sample sizes, so use lower threshold
  const minCapsuleCount = characterFiltered ? 1 : 2;
  console.log('[CapsuleBehavioral] Using minimum capsule count threshold:', minCapsuleCount);
  
  // Filter capsules with sufficient data and actionAverages
  const significantCapsules = capsules.filter(c => c.count >= minCapsuleCount && c.actionAverages);
  
  console.log('[CapsuleBehavioral] Significant capsules (count >= ' + minCapsuleCount + ', with actionAverages):', significantCapsules);
  
  if (significantCapsules.length === 0) {
    console.log('[CapsuleBehavioral] No significant capsules, returning null');
    return null;
  }
  
  // Determine baseline for comparison
  // If character baseline is provided (character filtering), use it
  // Otherwise use AI's overall action averages
  const useCharacterBaseline = characterFiltered && characterBaseline;
  const aiOverallActions = useCharacterBaseline ? {
    energyBlasts: characterBaseline.avgEnergyBlasts || 0,
    s1Blast: characterBaseline.avgS1Blast || 0,
    s2Blast: characterBaseline.avgS2Blast || 0,
    ultBlast: characterBaseline.avgUltBlast || 0,
    throws: characterBaseline.avgThrows || 0,
    vanishingAttacks: characterBaseline.avgVanishingAttacks || 0,
    dragonDash: characterBaseline.avgDragonDashDistance || 0,
    guards: characterBaseline.avgGuards || 0,
    zCounters: characterBaseline.avgZCounters || 0,
    superCounters: characterBaseline.avgSuperCounters || 0,
    charges: characterBaseline.avgCharges || 0,
    sparkingCount: characterBaseline.avgSparkingCount || 0,
    tags: characterBaseline.avgTags || 0,
    maxCombo: characterBaseline.avgMaxCombo || 0
  } : {
    energyBlasts: aiMetrics.avgEnergyBlasts || 0,
    s1Blast: aiMetrics.avgS1Blast || 0,
    s2Blast: aiMetrics.avgS2Blast || 0,
    ultBlast: aiMetrics.avgUltBlast || 0,
    throws: aiMetrics.avgThrows || 0,
    vanishingAttacks: aiMetrics.avgVanishingAttacks || 0,
    dragonDash: aiMetrics.avgDragonDashDistance || 0,
    guards: aiMetrics.avgGuards || 0,
    zCounters: aiMetrics.avgZCounters || 0,
    superCounters: aiMetrics.avgSuperCounters || 0,
    charges: aiMetrics.avgCharges || 0,
    sparkingCount: aiMetrics.avgSparkingCount || 0,
    tags: aiMetrics.avgTags || 0,
    maxCombo: aiMetrics.avgMaxCombo || 0
  };
  
  console.log('[CapsuleBehavioral] Baseline actions (using ' + (useCharacterBaseline ? 'character baseline' : 'AI overall') + '):', aiOverallActions);
  
  // Analyze each capsule by comparing to AI's own overall averages
  significantCapsules.forEach(capsule => {
    const frequencies = [];
    const capsuleActions = capsule.actionAverages;
    
    console.log(`[CapsuleBehavioral] Processing capsule: ${capsule.name}`);
    console.log(`[CapsuleBehavioral] Capsule action averages:`, capsuleActions);
    
    // Compare capsule-specific actions to AI's overall averages
    const comparisons = [
      { action: 'Energy Blasts', capsuleValue: capsuleActions.energyBlasts, overallValue: aiOverallActions.energyBlasts },
      { action: 'S1 Blasts', capsuleValue: capsuleActions.s1Blast, overallValue: aiOverallActions.s1Blast },
      { action: 'S2 Blasts', capsuleValue: capsuleActions.s2Blast, overallValue: aiOverallActions.s2Blast },
      { action: 'Ultimate Blasts', capsuleValue: capsuleActions.ultBlast, overallValue: aiOverallActions.ultBlast },
      { action: 'Throws', capsuleValue: capsuleActions.throws, overallValue: aiOverallActions.throws },
      { action: 'Vanishing Attacks', capsuleValue: capsuleActions.vanishingAttacks, overallValue: aiOverallActions.vanishingAttacks },
      { action: 'Guards', capsuleValue: capsuleActions.guards, overallValue: aiOverallActions.guards },
      { action: 'Z-Counters', capsuleValue: capsuleActions.zCounters, overallValue: aiOverallActions.zCounters },
      { action: 'Super Counters', capsuleValue: capsuleActions.superCounters, overallValue: aiOverallActions.superCounters },
      { action: 'Charges', capsuleValue: capsuleActions.charges, overallValue: aiOverallActions.charges },
      { action: 'Sparking', capsuleValue: capsuleActions.sparkingCount, overallValue: aiOverallActions.sparkingCount },
      { action: 'Tags', capsuleValue: capsuleActions.tags, overallValue: aiOverallActions.tags },
      { action: 'Max Combo', capsuleValue: capsuleActions.maxCombo, overallValue: aiOverallActions.maxCombo }
    ];
    
    console.log(`[CapsuleBehavioral] Checking ${comparisons.length} actions for ${capsule.name}`);
    
    // Find notable differences (comparing capsule vs overall)
    comparisons.forEach(comp => {
      if (comp.overallValue > 0 && comp.capsuleValue > 0) {
        const percentDiff = ((comp.capsuleValue - comp.overallValue) / comp.overallValue) * 100;
        console.log(`[CapsuleBehavioral] ${comp.action}: capsuleValue=${comp.capsuleValue.toFixed(2)}, overallValue=${comp.overallValue.toFixed(2)}, diff=${percentDiff.toFixed(1)}%`);
        if (Math.abs(percentDiff) >= 10) { // 10% difference threshold
          frequencies.push({
            action: comp.action,
            value: comp.capsuleValue,
            avg: comp.overallValue,
            percentDiff: percentDiff.toFixed(1),
            direction: percentDiff > 0 ? 'above' : 'below'
          });
        }
      }
    });
    
    console.log(`[CapsuleBehavioral] Found ${frequencies.length} notable differences for ${capsule.name}`);
    
    // Sort: prioritize increases (above) over decreases, then by magnitude
    frequencies.sort((a, b) => {
      if (a.direction === 'above' && b.direction === 'below') return -1;
      if (a.direction === 'below' && b.direction === 'above') return 1;
      return Math.abs(parseFloat(b.percentDiff)) - Math.abs(parseFloat(a.percentDiff));
    });
    
    if (frequencies.length > 0) {
      insights.impacts.push({
        name: capsule.name,
        count: capsule.count,
        winRate: capsule.winRate,
        frequencies: frequencies.slice(0, 5) // Top 5 most notable (prioritizing increases)
      });
    } else {
      console.log(`[CapsuleBehavioral] Skipping ${capsule.name} - no notable differences found`);
    }
  });
  
  // Sort by usage frequency and take top 5
  insights.impacts.sort((a, b) => b.count - a.count);
  insights.impacts = insights.impacts.slice(0, 5);
  
  // Filter out duplicate patterns (capsules that appear together in all matches)
  // If all capsules have identical frequencies, keep only the first one
  if (insights.impacts.length > 1) {
    const uniquePatterns = [];
    const seenPatterns = new Set();
    
    insights.impacts.forEach(impact => {
      // Create a signature of the frequency pattern
      const signature = impact.frequencies
        .map(f => `${f.action}:${f.percentDiff}`)
        .sort()
        .join('|');
      
      if (!seenPatterns.has(signature)) {
        seenPatterns.add(signature);
        uniquePatterns.push(impact);
      }
    });
    
    console.log('[CapsuleBehavioral] Filtered ' + (insights.impacts.length - uniquePatterns.length) + ' duplicate patterns');
    insights.impacts = uniquePatterns;
  }
  
  if (insights.impacts.length > 0) {
    insights.mostImpactful = insights.impacts[0];
  } else {
    console.log('[CapsuleBehavioral] No unique capsule patterns found (all capsules appear together)');
    return null;
  }
  
  console.log('[CapsuleBehavioral] Final insights:', JSON.stringify(insights, null, 2));
  
  return insights;
}

/**
 * Generate key behavioral insights (natural language)
 */
export function generateKeyBehavioralInsights(aiMetrics, allAIMetrics, archetypeInfo, effectivenessAnalysis) {
  const insights = [];
  

  // Performance insight
  if (effectivenessAnalysis) {
    const { performance, winRate, efficiency, survival } = effectivenessAnalysis;
    
    if (performance.percentile >= 75 && winRate.percentile >= 65) {
      insights.push({
        type: 'success',
        emoji: '🏆',
        text: `Elite Performer - Ranks in top ${100 - performance.percentile}% for combat performance with ${winRate.value.toFixed(1)}% win rate`
      });
    } else if (winRate.percentile >= 60 && efficiency.percentile >= 70) {
      insights.push({
        type: 'success',
        emoji: '⚡',
        text: `Highly Efficient Fighter - Converts opportunities into wins with ${efficiency.value.toFixed(2)}x damage efficiency`
      });
    } else if (performance.percentile <= 35 && winRate.percentile <= 40) {
      insights.push({
        type: 'warning',
        emoji: '⚠️',
        text: `Below Average Performance - Struggles compared to other AI strategies (${winRate.value.toFixed(1)}% win rate)`
      });
    }
    
    // Risk/reward insight
    if (effectivenessAnalysis.damage.percentile >= 75 && survival.percentile <= 40) {
      insights.push({
        type: 'info',
        emoji: '💥',
        text: `Risk Taker - Strong damage output but lower survival rate (${survival.value.toFixed(1)}%)`
      });
    } else if (survival.percentile >= 75 && effectivenessAnalysis.damage.percentile <= 40) {
      insights.push({
        type: 'info',
        emoji: '🛡️',
        text: `Survivalist - Excellent survival (${survival.value.toFixed(1)}%) but conservative damage output`
      });
    }
    
    // Battle speed insight
    if (aiMetrics.avgBattleTime) {
      const allAIs = Object.values(allAIMetrics).filter(ai => ai.totalMatches >= 5);
      const avgBattleTime = calculateMean(allAIs.map(ai => ai.avgBattleTime || 120));
      const timeDiff = ((aiMetrics.avgBattleTime - avgBattleTime) / avgBattleTime) * 100;
      
      if (timeDiff < -15) {
        insights.push({
          type: 'info',
          emoji: '⚡',
          text: `Fast Finisher - Wins matches ${Math.abs(Math.round(timeDiff))}% faster than average`
        });
      } else if (timeDiff > 20) {
        insights.push({
          type: 'info',
          emoji: '🐌',
          text: `Methodical Fighter - Takes ${Math.round(timeDiff)}% longer than average to finish matches`
        });
      }
    }
  }
  
  // Fallback: Add primary archetype description without the archetype name if no other insights
  if (insights.length === 0 && archetypeInfo && archetypeInfo.primary) {
    insights.push({
      type: 'info',
      emoji: archetypeInfo.primary.emoji,
      text: archetypeInfo.primary.description
    });
  }
  
  return insights.slice(0, 4); // Maximum 4 key insights
}

/**
 * MAIN FUNCTION: Generate all behavioral insights for an AI
 * 
 * @param {Object} aiMetrics - Metrics for the AI being analyzed
 * @param {Object} allAIMetrics - Metrics for all AIs (for comparison)
 * @returns {Object} Complete insights package
 */
export function generateBehavioralInsights(aiMetrics, allAIMetrics, characterFiltered = false) {
  if (!aiMetrics || !allAIMetrics) return null;
  
  // When character-filtered, use character baseline for comparison
  const baselineForComparison = aiMetrics._characterBaseline || null;
  const useCharacterBaseline = characterFiltered && baselineForComparison;
  
  console.log('[BehavioralInsights] Character filtered:', characterFiltered);
  console.log('[BehavioralInsights] Using character baseline:', useCharacterBaseline);
  console.log('[BehavioralInsights] Character baseline data:', baselineForComparison);
  
  // Calculate normalized scores (use character baseline if available)
  const normalizedScores = calculateNormalizedScores(aiMetrics, allAIMetrics, baselineForComparison);
  
  // Detect playstyle archetype
  const archetypeInfo = detectPlaystyleArchetype(normalizedScores);
  
  // Generate effectiveness analysis
  const effectivenessAnalysis = generateCombatEffectivenessInsights(aiMetrics, allAIMetrics);
  
  // Generate action frequency insights (pass character baseline for character-filtered data)
  const actionFrequency = generateActionFrequencyInsights(aiMetrics, allAIMetrics, baselineForComparison, characterFiltered);
  
  // Generate build behavioral impact insights (with character baseline)
  const buildBehavioralImpact = generateBuildBehavioralImpact(aiMetrics, baselineForComparison, characterFiltered);
  
  // Generate capsule behavioral impact insights (with character baseline)
  const capsuleBehavioralImpact = generateCapsuleBehavioralImpact(aiMetrics, baselineForComparison, characterFiltered);
  
  // Generate key behavioral insights
  const keyInsights = generateKeyBehavioralInsights(
    aiMetrics,
    allAIMetrics,
    archetypeInfo,
    effectivenessAnalysis
  );
  
  return {
    normalizedScores,
    archetype: archetypeInfo,
    effectiveness: effectivenessAnalysis,
    actionFrequency,
    buildBehavioralImpact,
    capsuleBehavioralImpact,
    keyInsights,
    dataQuality: aiMetrics.dataQuality
  };
}
