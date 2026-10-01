import React from 'react';

/**
 * Determine build composition based on capsule cost distribution
 * Uses new 7-category build type system with cost-based thresholds
 * 
 * @param {Object} capsuleCosts - Cost totals for each build type
 * @returns {Object} Build composition with primary, label, type, and breakdown
 */
/**
 * Generate a YAML string for a character build in the match-builder format
 */
export function generateBuildYaml(characterName, capsules, aiStrategy) {
  const safeScalar = (v) => {
    if (v === null || v === undefined || v === '') return "''";
    const s = String(v);
    // Quote if the value contains YAML-special chars or leading/trailing whitespace
    if (/[:#\[\]{},!|>&*'"%@`?\\]/.test(s) || s !== s.trim()) {
      return `'${s.replace(/'/g, "''")}'`;
    }
    return s;
  };

  const lines = [
    `character: ${safeScalar(characterName)}`,
    `costume: ''`,
    `capsules:`,
  ];
  if (capsules && capsules.length > 0) {
    capsules.forEach(c => {
      const name = typeof c === 'string' ? c : (c.name || '');
      lines.push(`  - ${safeScalar(name)}`);
    });
  } else {
    lines.push(`  []`);
  }
  lines.push(
    `ai: ${safeScalar(aiStrategy || '')}`,
    `transformAi: ''`,
    `sparking: ''`,
  );
  return lines.join('\n');
}

/**
 * Small hook-like helper to handle transient "copied!" feedback
 */
export function useCopyFeedback(ms = 1500) {
  const [copied, setCopied] = React.useState(false);
  const trigger = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), ms);
  };
  return [copied, trigger];
}
