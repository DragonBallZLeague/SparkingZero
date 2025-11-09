/**
 * Capsule Data Processor
 * 
 * Loads capsule data from CSV and enriches it with metadata from capsuleMetadata.json.
 * Provides build type classification and effect tags for meta analysis.
 * 
 * Created: November 5, 2025
 * Updated: November 6, 2025 - Switched to metadata-based build types
 */

import capsuleMetadata from '../config/capsuleMetadata.json';

/**
 * Parse CSV text into structured data
 * @param {String} csvText - Raw CSV text
 * @returns {Array} Array of capsule objects
 */
export function parseCapsulesCSV(csvText) {
  if (!csvText || typeof csvText !== 'string') {
    console.error('Invalid CSV text provided');
    return [];
  }

  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    console.error('CSV has insufficient data');
    return [];
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const capsules = [];

  // Expected headers: Item Names, ID, Type, Exclusive To, Cost, Effect
  const nameIdx = headers.findIndex(h => h.toLowerCase().includes('name'));
  const idIdx = headers.findIndex(h => h.toLowerCase() === 'id');
  const typeIdx = headers.findIndex(h => h.toLowerCase() === 'type');
  const exclusiveIdx = headers.findIndex(h => h.toLowerCase().includes('exclusive'));
  const costIdx = headers.findIndex(h => h.toLowerCase() === 'cost');
  const effectIdx = headers.findIndex(h => h.toLowerCase() === 'effect');

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Handle quoted fields with commas (like effect descriptions)
    const values = parseCSVLine(line);

    const type = values[typeIdx]?.trim() || '';
    
    // Only process actual capsules (not costumes, BGM, or AI strategies)
    if (type !== 'Capsule') {
      continue;
    }

    const id = values[idIdx]?.trim() || '';
    const name = values[nameIdx]?.trim() || '';
    const exclusiveTo = values[exclusiveIdx]?.trim() || '';
    const cost = parseInt(values[costIdx]) || 0;
    const effect = values[effectIdx]?.trim() || '';

    if (id && name) {
      capsules.push({
        id,
        name,
        type,
        exclusiveTo,
        cost,
        effect
      });
    }
  }

  return capsules;
}

/**
 * Parse a CSV line handling quoted fields with commas
 * @param {String} line - CSV line
 * @returns {Array} Array of field values
 */
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current); // Add last value
  return values;
}

/**
 * Normalize build type from metadata format to display format
 * Converts "ki-blast" -> "Ki Blast", "ki-efficiency" -> "Ki Efficiency"
 * @param {String} buildType - Build type from metadata (hyphenated, lowercase)
 * @returns {String} Normalized build type (capitalized, spaces)
 */
function normalizeBuildType(buildType) {
  if (!buildType) return 'Unknown';
  
  // Convert hyphens to spaces and capitalize each word
  return buildType
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Process capsules with metadata enrichment (build types, effect tags)
 * @param {Array} capsules - Raw capsule data from CSV
 * @returns {Array} Enriched capsules with metadata
 */
export function processCapsules(capsules) {
  return capsules.map(capsule => {
    const metadata = capsuleMetadata.capsules[capsule.id];
    
    if (metadata) {
      const normalizedBuildType = normalizeBuildType(metadata.buildType);
      return {
        ...capsule,
        effect: metadata.effect || capsule.effect, // Use metadata effect (has full multi-line text)
        buildType: normalizedBuildType,  // Normalized: "Ki Blast", "Ki Efficiency"
        effectTags: metadata.effectTags,
        trackedActions: metadata.trackedActions,
        // Keep archetype for backward compatibility during transition
        archetype: normalizedBuildType
      };
    }
    
    return {
      ...capsule,
      buildType: 'Unknown',
      effectTags: [],
      trackedActions: [],
      archetype: 'Unknown'
    };
  });
}

/**
 * Create a map of capsules by ID for quick lookups
 * @param {Array} capsules - Processed capsules
 * @returns {Object} Map of capsule ID -> capsule data
 */
export function createCapsuleMap(capsules) {
  const map = {};
  capsules.forEach(capsule => {
    if (capsule.id) {
      map[capsule.id] = capsule;
    }
  });
  return map;
}

/**
 * Get capsules filtered by type (for reference data separation)
 * @param {String} csvText - Raw CSV text
 * @returns {Object} Separated data by type
 */
export function parseAllItemTypes(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return { capsules: [], aiStrategies: [], costumes: [], bgm: [] };

  const headers = lines[0].split(',').map(h => h.trim());
  const result = {
    capsules: [],
    aiStrategies: [],
    costumes: [],
    bgm: []
  };

  const nameIdx = headers.findIndex(h => h.toLowerCase().includes('name'));
  const idIdx = headers.findIndex(h => h.toLowerCase() === 'id');
  const typeIdx = headers.findIndex(h => h.toLowerCase() === 'type');
  const exclusiveIdx = headers.findIndex(h => h.toLowerCase().includes('exclusive'));
  const costIdx = headers.findIndex(h => h.toLowerCase() === 'cost');
  const effectIdx = headers.findIndex(h => h.toLowerCase() === 'effect');

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = parseCSVLine(line);
    const type = values[typeIdx]?.trim() || '';
    const id = values[idIdx]?.trim() || '';
    const name = values[nameIdx]?.trim() || '';

    if (!id || !name) continue;

    const item = {
      id,
      name,
      type,
      exclusiveTo: values[exclusiveIdx]?.trim() || '',
      cost: parseInt(values[costIdx]) || 0,
      effect: values[effectIdx]?.trim() || ''
    };

    switch (type) {
      case 'Capsule':
        result.capsules.push(item);
        break;
      case 'AI':
        result.aiStrategies.push(item);
        break;
      case 'Costume':
        result.costumes.push(item);
        break;
      case 'Sparking BGM':
        result.bgm.push(item);
        break;
    }
  }

  return result;
}

/**
 * Load and process capsules from CSV text
 * Main entry point for getting enriched capsule data
 * @param {String} csvText - Raw CSV text
 * @returns {Object} Processed data with capsules, map, and metadata
 */
export function loadCapsuleData(csvText) {
  const allItems = parseAllItemTypes(csvText);
  const processedCapsules = processCapsules(allItems.capsules);
  const capsuleMap = createCapsuleMap(processedCapsules);

  // Get build type counts from metadata
  const buildTypeCounts = {};
  capsuleMetadata.buildTypes.forEach(type => {
    buildTypeCounts[type] = processedCapsules.filter(c => c.buildType === type).length;
  });
  buildTypeCounts.Unknown = processedCapsules.filter(c => c.buildType === 'Unknown').length;

  return {
    capsules: processedCapsules,
    capsuleMap,
    aiStrategies: allItems.aiStrategies,
    metadata: {
      totalCapsules: processedCapsules.length,
      totalAIStrategies: allItems.aiStrategies.length,
      buildTypeCounts,
      // Keep archetypeCounts for backward compatibility
      archetypeCounts: buildTypeCounts
    }
  };
}

export default {
  parseCapsulesCSV,
  processCapsules,
  createCapsuleMap,
  parseAllItemTypes,
  loadCapsuleData
};
