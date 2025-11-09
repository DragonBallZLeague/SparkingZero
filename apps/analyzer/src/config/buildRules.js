/**
 * Build Rules Configuration
 * 
 * Defines the constraints for character builds in DBZL.
 * Update this file when league rules change (typically seasonally).
 * 
 * Last Updated: November 5, 2025
 * Current Season: Season 0
 */

export const BUILD_RULES = {
  version: "1.0",
  lastUpdated: "2025-11-05",
  season: "Season 0",
  
  rules: {
    // Core constraints
    maxCost: 20,           // Maximum total capsule cost
    maxCapsules: 7,        // Maximum number of capsule slots
    
    // Future-proofing (not currently enforced)
    minCost: null,         // Minimum cost requirement (null = no minimum)
    bannedCapsules: [],    // Array of capsule IDs that cannot be used
    requiredCapsules: [],  // Array of capsule IDs that must be included
    slotRestrictions: null // Special slot rules (null = none)
  },
  
  notes: [
    "These rules may change seasonally or for special events",
    "All build recommendations must respect these constraints",
    "Update version number and lastUpdated when modifying rules"
  ]
};

/**
 * Validates a build against current rules
 * @param {Array} capsules - Array of capsule objects with {id, name, cost}
 * @param {Object} rules - Optional custom rules (defaults to BUILD_RULES.rules)
 * @returns {Object} Validation result with validity flags and remaining budget
 */
export function validateBuild(capsules, rules = BUILD_RULES.rules) {
  const totalCost = capsules.reduce((sum, capsule) => sum + (capsule.cost || 0), 0);
  const capsuleCount = capsules.length;
  
  // Check core constraints
  const costValid = totalCost <= rules.maxCost;
  const countValid = capsuleCount <= rules.maxCapsules;
  
  // Check future constraints (if defined)
  const minCostValid = rules.minCost === null || totalCost >= rules.minCost;
  const noBannedCapsules = rules.bannedCapsules.length === 0 || 
    !capsules.some(cap => rules.bannedCapsules.includes(cap.id));
  const hasRequiredCapsules = rules.requiredCapsules.length === 0 ||
    rules.requiredCapsules.every(reqId => capsules.some(cap => cap.id === reqId));
  
  const isValid = costValid && countValid && minCostValid && 
                  noBannedCapsules && hasRequiredCapsules;
  
  return {
    valid: isValid,
    violations: {
      costExceeded: !costValid,
      tooManyCapsules: !countValid,
      belowMinCost: !minCostValid,
      hasBannedCapsules: !noBannedCapsules,
      missingRequiredCapsules: !hasRequiredCapsules
    },
    totalCost,
    capsuleCount,
    remainingCost: rules.maxCost - totalCost,
    remainingSlots: rules.maxCapsules - capsuleCount,
    maxCost: rules.maxCost,
    maxCapsules: rules.maxCapsules
  };
}

/**
 * Get a human-readable summary of build validity
 * @param {Object} validation - Result from validateBuild()
 * @returns {String} Formatted validation message
 */
export function getValidationMessage(validation) {
  if (validation.valid) {
    return `✓ Valid Build (${validation.capsuleCount}/${validation.maxCapsules} slots, ${validation.totalCost}/${validation.maxCost} cost)`;
  }
  
  const errors = [];
  if (validation.violations.costExceeded) {
    errors.push(`Cost exceeds limit (${validation.totalCost}/${validation.maxCost})`);
  }
  if (validation.violations.tooManyCapsules) {
    errors.push(`Too many capsules (${validation.capsuleCount}/${validation.maxCapsules})`);
  }
  if (validation.violations.belowMinCost) {
    errors.push(`Below minimum cost requirement`);
  }
  if (validation.violations.hasBannedCapsules) {
    errors.push(`Contains banned capsules`);
  }
  if (validation.violations.missingRequiredCapsules) {
    errors.push(`Missing required capsules`);
  }
  
  return `✗ Invalid Build: ${errors.join(', ')}`;
}

export default BUILD_RULES;
