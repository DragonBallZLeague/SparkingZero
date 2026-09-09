// Build-type categorization shared by extractStats and all aggregation utils.
export function getBuildComposition(capsuleCosts) {
  const types = [
    { name: 'Melee', cost: capsuleCosts.melee },
    { name: 'Blast', cost: capsuleCosts.blast },
    { name: 'Ki Blast', cost: capsuleCosts.kiBlast },
    { name: 'Defense', cost: capsuleCosts.defense },
    { name: 'Skill', cost: capsuleCosts.skill },
    { name: 'Ki Efficiency', cost: capsuleCosts.kiEfficiency },
    { name: 'Utility', cost: capsuleCosts.utility }
  ];
  
  const totalCost = types.reduce((sum, t) => sum + t.cost, 0);
  
  if (totalCost === 0) {
    return { 
      primary: 'No Build', 
      label: 'No Build', 
      type: 'none',
      breakdown: types.map(t => ({ ...t, percent: 0 }))
    };
  }
  
  // Sort by cost (highest first)
  types.sort((a, b) => b.cost - a.cost);
  
  const primary = types[0];
  const secondary = types[1];
  
  const primaryPercent = (primary.cost / totalCost) * 100;
  const secondaryPercent = (secondary.cost / totalCost) * 100;
  const percentDiff = primaryPercent - secondaryPercent;
  
  // Add percentages to breakdown
  const breakdown = types.map(t => ({
    ...t,
    percent: (t.cost / totalCost) * 100
  }));
  
  // Pure build: 75%+ in one type (15/20 cost)
  if (primaryPercent >= 75) {
    return { 
      primary: primary.name, 
      label: `Pure ${primary.name}`, 
      type: 'pure',
      breakdown
    };
  }
  
  // Focused build: 45%+ in one type (9/20 cost)
  if (primaryPercent >= 45) {
    return { 
      primary: primary.name, 
      label: `${primary.name}-Focused`, 
      type: 'focused',
      breakdown
    };
  }
  
  // Dual build: Top 2 types close (within 20%) and together ≥65%
  if (percentDiff <= 20 && (primaryPercent + secondaryPercent) >= 65) {
    return { 
      primary: primary.name, 
      secondary: secondary.name,
      label: `${primary.name}/${secondary.name}`, 
      type: 'dual',
      breakdown
    };
  }
  
  // Balanced hybrid: No clear dominance
  return { 
    primary: 'Hybrid', 
    label: 'Balanced Hybrid', 
    type: 'balanced',
    breakdown
  };
}

/**
 * Get color classes for new build type system (exported for use in TableConfigs)
 * Supports all 7 build types plus hybrid combinations
 * @param {Object|string} buildComposition - Build composition object with primary type, or label string
 * @param {boolean} darkMode - Whether dark mode is enabled
 * @returns {string} Tailwind CSS classes for styling
 */
export function getBuildTypeColor(buildComposition, darkMode = false) {
  if (!buildComposition) return darkMode ? 'text-gray-400 bg-gray-700 border-gray-600' : 'text-gray-600 bg-gray-50 border-gray-200';
  
  // Handle both object (with primary property) and string (label) inputs
  let primaryType;
  if (typeof buildComposition === 'string') {
    // Extract primary type from label (e.g., "Pure Melee" -> "melee", "Melee-Focused" -> "melee")
    const label = buildComposition.toLowerCase();
    if (label.includes('melee')) primaryType = 'melee';
    else if (label.includes('ki blast')) primaryType = 'ki blast';
    else if (label.includes('blast')) primaryType = 'blast';
    else if (label.includes('defense')) primaryType = 'defense';
    else if (label.includes('skill')) primaryType = 'skill';
    else if (label.includes('ki efficiency')) primaryType = 'ki efficiency';
    else if (label.includes('utility')) primaryType = 'utility';
    else if (label.includes('balanced') || label.includes('hybrid')) primaryType = 'hybrid';
    else primaryType = 'no build';
  } else {
    primaryType = buildComposition.primary?.toLowerCase();
  }
  
  // Color mapping for 7 build types
  const colorMap = {
    'melee': darkMode ? 'text-red-400 bg-red-900/30 border-red-600' : 'text-red-600 bg-red-50 border-red-200',
    'blast': darkMode ? 'text-orange-400 bg-orange-900/30 border-orange-600' : 'text-orange-600 bg-orange-50 border-orange-200',
    'ki blast': darkMode ? 'text-yellow-400 bg-yellow-900/30 border-yellow-600' : 'text-yellow-600 bg-yellow-50 border-yellow-200',
    'defense': darkMode ? 'text-blue-400 bg-blue-900/30 border-blue-600' : 'text-blue-600 bg-blue-50 border-blue-200',
    'skill': darkMode ? 'text-purple-400 bg-purple-900/30 border-purple-600' : 'text-purple-600 bg-purple-50 border-purple-200',
    'ki efficiency': darkMode ? 'text-green-400 bg-green-900/30 border-green-600' : 'text-green-600 bg-green-50 border-green-200',
    'utility': darkMode ? 'text-gray-400 bg-gray-700 border-gray-600' : 'text-gray-600 bg-gray-50 border-gray-200',
    'hybrid': darkMode ? 'text-purple-400 bg-purple-900/30 border-purple-600' : 'text-purple-600 bg-purple-50 border-purple-200',
    'no build': darkMode ? 'text-gray-400 bg-gray-700 border-gray-600' : 'text-gray-400 bg-gray-100 border-gray-300'
  };
  
  return colorMap[primaryType] || (darkMode ? 'text-gray-400 bg-gray-700 border-gray-600' : 'text-gray-600 bg-gray-50 border-gray-200');
}
