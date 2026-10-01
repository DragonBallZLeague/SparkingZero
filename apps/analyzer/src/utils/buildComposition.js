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
