/**
 * Capsule Metadata Generator
 * 
 * Generates initial capsuleMetadata.json from capsules.csv using automated classification.
 * Output requires human review before use in production.
 * 
 * Usage: node scripts/generateCapsuleMetadata.js
 * 
 * Created: November 6, 2025
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Build type classification patterns (order matters - check specific before general)
const BUILD_TYPE_PATTERNS = {
  'ki-blast': {
    keywords: ['ki blast', 'energy bullet', 'smash ki blast', 'rush ki blast'],
    exclusiveKeywords: ['ki blast'], // Must have this to be ki-blast
    weight: 0
  },
  blast: {
    keywords: ['blast damage', 'ultimate blast', 'burst', /\bblast\b/i], // \b for word boundary
    excludeIf: ['ki blast'], // Don't classify as blast if "ki blast" is present
    weight: 0
  },
  melee: {
    keywords: ['rush attack', 'smash attack', 'combo', 'melee', 'vanishing', 'throw', 'dragon assault', 'vanishing assault', 'rush chain', 'burst rush', 'burst meteor'],
    weight: 0
  },
  defense: {
    keywords: ['defense', 'armor', 'guard', 'health', 'HP', 'damage resistance', 'recovery', 'dodge', 'evade', 'flinch', 'body'],
    weight: 0
  },
  skill: {
    keywords: ['skill', 'transformation', 'fusion', 'sparking mode', 'sparking gauge', 'super z-counter'],
    weight: 0
  },
  'ki-efficiency': {
    keywords: ['ki cost', 'ki recovery', 'ki gain', 'ki gauge', 'energy saver', 'dash', 'ki gained'],
    weight: 0
  },
  utility: {
    keywords: [], // fallback category
    weight: 0
  }
};

// Effect tags mapping
const EFFECT_TAG_PATTERNS = {
  // Melee subcategories
  'rush-damage': /rush attack.*damage/i,
  'smash-damage': /smash attack.*damage/i,
  'combo-damage': /combo.*damage|chain.*damage/i,
  'melee-charge': /(charging time|charge).*smash attack|rush chain/i,
  'armor-break': /armor break|beats.*body/i,
  'vanishing': /vanishing/i,
  'throw': /throw/i,
  
  // Blast subcategories
  'blast-damage': /blast damage|blast combo damage/i,
  'ultimate-damage': /ultimate blast damage/i,
  'blast-cost': /ki cost.*blast/i,
  
  // Ki Blast subcategories
  'ki-blast-damage': /ki blast.*damage/i,
  'ki-blast-cost': /ki cost.*ki blast/i,
  'ki-blast-charge': /charging time.*ki blast/i,
  'energy-bullet': /energy bullet/i,
  
  // Defense subcategories
  'damage-reduction': /reduces.*damage taken|damage resistance/i,
  'armor': /armor|flinch/i,
  'health-boost': /maximum health|max.*HP|increases.*health/i,
  'health-regen': /HP recovery|recovers.*HP|regenerates.*HP/i,
  'guard': /guard/i,
  'counter': /counter/i,
  'standby-recovery': /standby/i,
  'dodge': /dodge/i,
  'auto-dodge': /automatically dodge/i,
  
  // Skill subcategories
  'skill-gauge': /skill count|skill gauge/i,
  'transformation': /transformation|fusion/i,
  'sparking-gauge': /sparking.*gauge|sparking mode/i,
  'sparking-damage': /damage.*sparking mode/i,
  
  // Ki Efficiency subcategories
  'ki-cost-reduction': /reduces ki cost/i,
  'ki-generation': /ki gain|increases ki/i,
  'ki-starting': /ki gauge starts/i,
  'ki-regen': /recovers.*ki/i,
  'dash': /dash/i,
  
  // Cross-category
  'movement-speed': /movement/i,
  'switch-gauge': /switch gauge/i,
  'conditional': /at \d+% HP|per DP/i,
  'environmental': /namek|earth|universe|water/i,
  'special-mechanic': /unique|special/i
};

// Tracked actions mapping
const ACTION_MAPPINGS = {
  vanishing: ['vanishingAttackCount', 'actVASN'],
  counter: ['revengeCounter', 'superCounterCount'],
  blast: ['useBlastGroupCount', 's2Blast', 'ultBlast', 'blastHitDemoInfo'],
  'ki-blast': ['shotEnergyBulletCount', 'reflectEnergyBulletCount'],
  guard: ['guardCount'],
  sparking: ['sparkingCount', 'sPMCount'],
  transformation: ['formChangeHistory'],
  dash: ['dragonDashMileage'],
  'rush-attack': ['actRSHA1', 'actRSHA2'],
  'smash-attack': ['actSMUN', 'actSMLN', 'actSMMN']
};

/**
 * Parse entire CSV handling multi-line quoted fields
 */
function parseCSV(csvContent) {
  const rows = [];
  const lines = csvContent.split('\n');
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  let lineIdx = 0;

  while (lineIdx < lines.length) {
    const line = lines[lineIdx];
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    
    // If we're still in quotes, this field continues on next line
    if (inQuotes) {
      currentField += '\n'; // Preserve line break in field
      lineIdx++;
      continue;
    }
    
    // End of row
    currentRow.push(currentField.trim());
    rows.push(currentRow);
    currentRow = [];
    currentField = '';
    lineIdx++;
  }
  
  return rows;
}

/**
 * Classify capsule build type based on effect text
 */
function classifyBuildType(effect, capsuleName) {
  if (!effect) return 'utility';
  
  const lowerEffect = effect.toLowerCase();
  const lowerName = capsuleName.toLowerCase();
  const combinedText = `${lowerEffect} ${lowerName}`;
  
  // Check ki-blast first (most specific)
  if (combinedText.includes('ki blast')) {
    return 'ki-blast';
  }
  
  const weights = {
    melee: 0,
    blast: 0,
    'ki-blast': 0,
    defense: 0,
    skill: 0,
    'ki-efficiency': 0,
    utility: 0
  };

  // Score each build type
  for (const [buildType, config] of Object.entries(BUILD_TYPE_PATTERNS)) {
    // Check exclusions first
    if (config.excludeIf) {
      let shouldExclude = false;
      for (const excludeKeyword of config.excludeIf) {
        if (combinedText.includes(excludeKeyword.toLowerCase())) {
          shouldExclude = true;
          break;
        }
      }
      if (shouldExclude) continue;
    }
    
    // Check exclusive keywords (must have at least one)
    if (config.exclusiveKeywords) {
      let hasExclusive = false;
      for (const keyword of config.exclusiveKeywords) {
        if (combinedText.includes(keyword.toLowerCase())) {
          hasExclusive = true;
          break;
        }
      }
      if (!hasExclusive) continue;
    }
    
    // Score based on keywords
    for (const keyword of config.keywords) {
      if (keyword instanceof RegExp) {
        if (keyword.test(lowerEffect) || keyword.test(lowerName)) {
          weights[buildType]++;
        }
      } else {
        if (combinedText.includes(keyword.toLowerCase())) {
          weights[buildType]++;
        }
      }
    }
  }

  // Find highest weight
  let maxWeight = 0;
  let primaryType = 'utility';
  
  for (const [buildType, weight] of Object.entries(weights)) {
    if (weight > maxWeight) {
      maxWeight = weight;
      primaryType = buildType;
    }
  }

  return primaryType;
}

/**
 * Extract effect tags from effect text
 */
function extractEffectTags(effect) {
  if (!effect) return [];
  
  const tags = [];
  
  for (const [tag, pattern] of Object.entries(EFFECT_TAG_PATTERNS)) {
    if (pattern.test(effect)) {
      tags.push(tag);
    }
  }
  
  return tags;
}

/**
 * Determine tracked actions for capsule
 */
function determineTrackedActions(effectTags, buildType) {
  const actions = [];
  
  // Add actions based on effect tags
  for (const tag of effectTags) {
    if (ACTION_MAPPINGS[tag]) {
      actions.push(...ACTION_MAPPINGS[tag]);
    }
  }
  
  // Add actions based on build type
  if (buildType === 'blast' && !actions.length) {
    actions.push(...(ACTION_MAPPINGS.blast || []));
  } else if (buildType === 'ki-blast' && !actions.length) {
    actions.push(...(ACTION_MAPPINGS['ki-blast'] || []));
  }
  
  // Remove duplicates
  return [...new Set(actions)];
}

/**
 * Main generation function
 */
function generateCapsuleMetadata() {
  console.log('🚀 Generating capsule metadata...\n');
  
  // Read capsules.csv
  const csvPath = path.join(__dirname, '..', 'referencedata', 'capsules.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  // Parse CSV handling multi-line fields
  const rows = parseCSV(csvContent);
  
  if (rows.length < 2) {
    console.error('❌ CSV file is empty or invalid');
    return;
  }

  const headers = rows[0].map(h => h.trim());
  const nameIdx = headers.findIndex(h => h.toLowerCase().includes('name'));
  const idIdx = headers.findIndex(h => h.toLowerCase() === 'id');
  const typeIdx = headers.findIndex(h => h.toLowerCase() === 'type');
  const exclusiveIdx = headers.findIndex(h => h.toLowerCase().includes('exclusive'));
  const costIdx = headers.findIndex(h => h.toLowerCase() === 'cost');
  const effectIdx = headers.findIndex(h => h.toLowerCase() === 'effect');

  const metadata = {
    version: '1.0.0',
    lastUpdated: new Date().toISOString().split('T')[0],
    lastReviewedBy: 'automated-initial',
    buildTypes: ['melee', 'blast', 'ki-blast', 'defense', 'skill', 'ki-efficiency', 'utility'],
    capsules: {}
  };

  let capsuleCount = 0;
  const stats = {
    melee: 0,
    blast: 0,
    'ki-blast': 0,
    defense: 0,
    skill: 0,
    'ki-efficiency': 0,
    utility: 0
  };

  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    if (!values || values.length === 0) continue;

    const type = values[typeIdx] || '';
    
    // Only process capsules, not AI strategies, costumes, etc.
    if (type !== 'Capsule') continue;

    const id = values[idIdx] || '';
    const name = values[nameIdx] || '';
    const cost = parseInt(values[costIdx]) || 0;
    const effect = values[effectIdx] || '';
    const exclusiveTo = values[exclusiveIdx] || '';

    if (!id || !name) continue;

    // Classify build type
    const buildType = classifyBuildType(effect, name);
    stats[buildType]++;

    // Extract effect tags
    const effectTags = extractEffectTags(effect);

    // Determine tracked actions
    const trackedActions = determineTrackedActions(effectTags, buildType);

    metadata.capsules[id] = {
      id,
      name,
      cost,
      effect,
      exclusiveTo,
      buildType,
      effectTags,
      trackedActions,
      notes: ''
    };

    capsuleCount++;
  }

  // Write metadata file
  const outputPath = path.join(__dirname, '..', 'src', 'config', 'capsuleMetadata.json');
  const outputDir = path.dirname(outputPath);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2), 'utf-8');

  console.log('✅ Capsule metadata generated successfully!\n');
  console.log(`📊 Statistics:`);
  console.log(`   Total capsules: ${capsuleCount}`);
  console.log(`   Melee Build: ${stats.melee}`);
  console.log(`   Blast Build: ${stats.blast}`);
  console.log(`   Ki Blast Build: ${stats['ki-blast']}`);
  console.log(`   Defense Build: ${stats.defense}`);
  console.log(`   Skill Build: ${stats.skill}`);
  console.log(`   Ki Efficiency Build: ${stats['ki-efficiency']}`);
  console.log(`   Utility: ${stats.utility}`);
  console.log(`\n📄 Output: ${outputPath}`);
  console.log('\n⚠️  IMPORTANT: This is automated classification.');
  console.log('   Please review and correct classifications before use!');
}

// Run generator
generateCapsuleMetadata();
