/**
 * Capsule Effect Parser & Archetype Classifier
 * 
 * Parses capsule effects from CSV data to categorize capsules by archetype
 * and detect synergies for build recommendations.
 * 
 * Archetypes:
 * - Aggressive: High damage effects
 * - Defensive: Damage reduction, armor, health, guards, counters, tagging
 * - Technical: Ki management, movement, skills, skill gauge, transformations
 * 
 * Created: November 5, 2025
 */

/**
 * Archetype pattern definitions with regex matchers
 */
const ARCHETYPE_PATTERNS = {
  aggressive: {
    patterns: [
      /increases.*damage/i,
      /increases.*attack/i,
      /blast.*damage/i,
      /ultimate.*damage/i,
      /burst.*damage/i,
      /power(?!.*body)/i,  // "power" but not "power body"
      /combo.*damage/i,
      /smash.*damage/i,
      /rush.*damage/i
    ],
    weight: 0,
    description: "High damage effects"
  },
  defensive: {
    patterns: [
      /reduces.*damage taken/i,
      /armor/i,
      /guard/i,
      /defense/i,
      /health.*recovery/i,
      /HP.*recovery|recovers.*HP/i,
      /maximum health|max.*HP|increases.*health/i,
      /counter/i,
      /switch/i,
      /tag/i,
      /standby/i,
      /damage resistance/i,
      /flinch/i,
      /body/i  // Power Body, Light Body, etc.
    ],
    weight: 0,
    description: "Damage reduction, armor, health, guards, counters, tagging"
  },
  technical: {
    patterns: [
      /ki.*cost/i,
      /ki.*recovery|ki.*gain/i,
      /ki gauge/i,
      /dash/i,
      /movement/i,
      /skill.*gauge|skill count/i,
      /transformation|fusion/i,
      /sparking mode|sparking gauge/i,
      /charging time|charge/i,
      /speed(?!.*impact)/i,  // "speed" but not "speed impact"
      /energy/i
    ],
    weight: 0,
    description: "Ki management, movement, skills, skill gauge, transformations"
  }
};

/**
 * Parse a capsule's effect text and categorize by archetype
 * @param {String} effect - The effect description from CSV
 * @param {String} capsuleName - The capsule name (for logging/debugging)
 * @param {String} capsuleId - The capsule ID
 * @returns {Object} Parsed capsule with archetype information
 */
export function parseCapsuleEffect(effect, capsuleName = '', capsuleId = '') {
  if (!effect || typeof effect !== 'string') {
    return {
      primaryArchetype: 'utility',
      allTags: [],
      archetypeWeight: { aggressive: 0, defensive: 0, technical: 0 },
      effectDescription: effect || '',
      capsuleName,
      capsuleId
    };
  }

  // Reset weights
  const weights = {
    aggressive: 0,
    defensive: 0,
    technical: 0
  };

  // Score each archetype based on pattern matches
  for (const [archetype, config] of Object.entries(ARCHETYPE_PATTERNS)) {
    for (const pattern of config.patterns) {
      if (pattern.test(effect)) {
        weights[archetype]++;
      }
    }
  }

  // Determine primary archetype (highest weight)
  let primaryArchetype = 'utility';
  let maxWeight = 0;
  const allTags = [];

  for (const [archetype, weight] of Object.entries(weights)) {
    if (weight > 0) {
      allTags.push(archetype);
      if (weight > maxWeight) {
        maxWeight = weight;
        primaryArchetype = archetype;
      }
    }
  }

  // Handle ties with priority order: aggressive > defensive > technical
  if (allTags.length > 1) {
    const tiedArchetypes = allTags.filter(arch => weights[arch] === maxWeight);
    if (tiedArchetypes.length > 1) {
      primaryArchetype = determineTieBreakerArchetype(effect, capsuleName, tiedArchetypes);
    }
  }

  return {
    primaryArchetype,
    allTags,
    archetypeWeight: weights,
    effectDescription: effect,
    capsuleName,
    capsuleId
  };
}

/**
 * Tie-breaker logic for capsules that match multiple archetypes equally
 * Priority order: aggressive > defensive > technical
 * @param {String} effect - Effect description
 * @param {String} capsuleName - Capsule name
 * @param {Array} tiedArchetypes - Array of archetypes with equal weight
 * @returns {String} Selected primary archetype
 */
function determineTieBreakerArchetype(effect, capsuleName, tiedArchetypes) {
  const priorityOrder = ['aggressive', 'defensive', 'technical'];
  
  // Special case handling for known multi-category capsules
  const lowerEffect = effect.toLowerCase();
  const lowerName = capsuleName.toLowerCase();
  
  // Counter-related capsules lean defensive
  if (lowerEffect.includes('counter') || lowerName.includes('counter')) {
    if (tiedArchetypes.includes('defensive')) {
      return 'defensive';
    }
  }
  
  // Sparking-related lean technical unless pure damage
  if (lowerEffect.includes('sparking') || lowerName.includes('sparking')) {
    if (tiedArchetypes.includes('technical') && !lowerEffect.match(/increases.*damage.*sparking/i)) {
      return 'technical';
    }
  }
  
  // Tag/switch-related lean defensive
  if (lowerEffect.includes('standby') || lowerEffect.includes('switch') || lowerEffect.includes('tag')) {
    if (tiedArchetypes.includes('defensive')) {
      return 'defensive';
    }
  }
  
  // Default priority order
  for (const archetype of priorityOrder) {
    if (tiedArchetypes.includes(archetype)) {
      return archetype;
    }
  }
  
  return tiedArchetypes[0];
}

/**
 * Parse multiple capsules from capsule data
 * @param {Array} capsules - Array of capsule objects with {id, name, effect, cost}
 * @returns {Array} Array of parsed capsules with archetype info
 */
export function parseCapsuleList(capsules) {
  return capsules.map(capsule => {
    const parsed = parseCapsuleEffect(capsule.effect || '', capsule.name || '', capsule.id || '');
    
    // Capitalize the archetype for display (Aggressive, Defensive, Technical, Utility)
    const capitalizedArchetype = parsed.primaryArchetype
      ? parsed.primaryArchetype.charAt(0).toUpperCase() + parsed.primaryArchetype.slice(1)
      : 'Unknown';
    
    return {
      ...capsule,
      ...parsed,
      archetype: capitalizedArchetype  // Add capitalized archetype field for UI
    };
  });
}

/**
 * Get archetype summary statistics for a list of capsules
 * @param {Array} parsedCapsules - Array of capsules with archetype info
 * @returns {Object} Summary statistics
 */
export function getArchetypeSummary(parsedCapsules) {
  const summary = {
    total: parsedCapsules.length,
    byArchetype: {
      aggressive: 0,
      defensive: 0,
      technical: 0,
      utility: 0
    },
    multiCategory: 0
  };

  parsedCapsules.forEach(capsule => {
    summary.byArchetype[capsule.primaryArchetype]++;
    if (capsule.allTags.length > 1) {
      summary.multiCategory++;
    }
  });

  return summary;
}

/**
 * Filter capsules by archetype
 * @param {Array} parsedCapsules - Array of capsules with archetype info
 * @param {String} archetype - Archetype to filter by
 * @param {Boolean} includeSecondary - Include capsules with archetype as secondary tag
 * @returns {Array} Filtered capsules
 */
export function filterByArchetype(parsedCapsules, archetype, includeSecondary = false) {
  return parsedCapsules.filter(capsule => {
    if (includeSecondary) {
      return capsule.allTags.includes(archetype);
    }
    return capsule.primaryArchetype === archetype;
  });
}

/**
 * Detect synergy type between two capsules based on their archetypes
 * @param {Object} capsule1 - First capsule with archetype info
 * @param {Object} capsule2 - Second capsule with archetype info
 * @returns {String} Synergy type: 'multiplicative', 'complementary', 'anti-synergy', 'neutral'
 */
export function detectSynergyType(capsule1, capsule2) {
  const arch1 = capsule1.primaryArchetype;
  const arch2 = capsule2.primaryArchetype;
  
  // Multiplicative: Same primary archetype (effects stack)
  if (arch1 === arch2 && arch1 !== 'utility') {
    return 'multiplicative';
  }
  
  // Complementary: Different archetypes that work well together
  const complementaryPairs = [
    ['aggressive', 'technical'],  // Damage + Ki management
    ['defensive', 'technical'],   // Survival + Resource management
  ];
  
  const isComplementary = complementaryPairs.some(pair => 
    (pair[0] === arch1 && pair[1] === arch2) || 
    (pair[0] === arch2 && pair[1] === arch1)
  );
  
  if (isComplementary) {
    return 'complementary';
  }
  
  // Anti-synergy: Check for conflicting effects
  const effect1 = capsule1.effectDescription.toLowerCase();
  const effect2 = capsule2.effectDescription.toLowerCase();
  
  // Reduced defense without healing
  const hasDefenseReduction = effect1.includes('reduces') && (effect1.includes('defense') || effect1.includes('armor'));
  const hasNoHealing = !effect2.includes('health') && !effect2.includes('recovery') && !effect2.includes('HP');
  
  if (hasDefenseReduction && hasNoHealing) {
    // Check if capsule2 also reduces defense (double penalty)
    const effect2ReducesDefense = effect2.includes('reduces') && (effect2.includes('defense') || effect2.includes('armor'));
    if (effect2ReducesDefense) {
      return 'anti-synergy';
    }
  }
  
  return 'neutral';
}

/**
 * Calculate build archetype composition
 * @param {Array} capsules - Array of capsules in build (with archetype info)
 * @returns {Object} Build composition analysis
 */
export function analyzeBuildComposition(capsules) {
  const composition = {
    aggressive: 0,
    defensive: 0,
    technical: 0,
    utility: 0
  };
  
  capsules.forEach(capsule => {
    // Support both archetype (capitalized) and primaryArchetype (lowercase) fields
    const archetypeValue = (capsule.archetype || capsule.primaryArchetype || 'utility').toLowerCase();
    if (composition.hasOwnProperty(archetypeValue)) {
      composition[archetypeValue]++;
    }
  });
  
  const total = capsules.length;
  const dominantArchetype = Object.entries(composition)
    .filter(([arch]) => arch !== 'utility')
    .sort((a, b) => b[1] - a[1])[0];
  
  let buildType = 'Balanced';
  let primaryArchetype = dominantArchetype ? dominantArchetype[0].charAt(0).toUpperCase() + dominantArchetype[0].slice(1) : null;
  
  if (dominantArchetype && dominantArchetype[1] >= 5) {
    buildType = `Pure ${primaryArchetype}`;
  } else if (dominantArchetype && dominantArchetype[1] >= 4) {
    const secondaryArchetype = Object.entries(composition)
      .filter(([arch]) => arch !== 'utility' && arch !== dominantArchetype[0])
      .sort((a, b) => b[1] - a[1])[0];
    if (secondaryArchetype && secondaryArchetype[1] > 0) {
      const secondaryName = secondaryArchetype[0].charAt(0).toUpperCase() + secondaryArchetype[0].slice(1);
      buildType = `${primaryArchetype} (${secondaryName} Support)`;
    }
  }
  
  return {
    composition,
    archetypeCounts: {
      Aggressive: composition.aggressive,
      Defensive: composition.defensive,
      Technical: composition.technical,
      Utility: composition.utility
    },
    percentages: {
      aggressive: total > 0 ? Math.round((composition.aggressive / total) * 100) : 0,
      defensive: total > 0 ? Math.round((composition.defensive / total) * 100) : 0,
      technical: total > 0 ? Math.round((composition.technical / total) * 100) : 0,
      utility: total > 0 ? Math.round((composition.utility / total) * 100) : 0
    },
    buildType,
    primaryArchetype,
    dominantArchetype: dominantArchetype ? dominantArchetype[0] : 'none'
  };
}

export default {
  parseCapsuleEffect,
  parseCapsuleList,
  getArchetypeSummary,
  filterByArchetype,
  detectSynergyType,
  analyzeBuildComposition
};
