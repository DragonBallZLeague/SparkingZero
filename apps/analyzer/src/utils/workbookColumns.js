/**
 * The workbook's Character Averages and Match Details sheets: their column
 * groups and columns (a header, the group it sits under and an accessor), and
 * the row builders App hands them (`prepare*Data`). utils/excelExport.js reads
 * them. This was components/TableConfigs.jsx, which also drew the Data Tables
 * page; that page went on 2026-09-29, and its render functions with it.
 *
 * Each call returns fresh column objects: the Team Performance Matrix sheet
 * writes its own headers onto them.
 */

import { transformationSummary } from './transformation.js';

// ==============================================================================
// CHARACTER PERFORMANCE AVERAGES
// ==============================================================================
// Purpose: High-level overview of each character's overall performance
// Structure: One row per character with aggregated/averaged statistics
// Total Columns: ~43 columns across 7 category groups
// ==============================================================================

const transformCache = new WeakMap();
/**
 * A row's transformationSummary() (utils/transformation.js), from its own
 * matches, so the Team Performance Matrix's per-team character rows get their
 * team's figures and its team rows (no matches) none. Null without `ctx` =
 * { idFor, lineups }, or for a character that cannot transform or fuse.
 */
function transformOf(row, ctx) {
  if (!ctx || !ctx.idFor || !Array.isArray(row.matches)) return null;
  if (!transformCache.has(row.matches)) {
    const s = transformationSummary(row.matches, { id: ctx.idFor(row.name), lineups: ctx.lineups });
    transformCache.set(row.matches, s.able ? s : null);
  }
  return transformCache.get(row.matches);
}

/**
 * `ctx` = { idFor, lineups } for the Transformations group (the plan's
 * "Transformations" step 4, 2026-10-01): counted by utils/transformation.js's
 * rules, fusions included, Broly's Ring left out. It replaced "Avg
 * Transformations", every form change per match, which counted forms that
 * only move back down and matches with Broly's Ring.
 */
export const characterAveragesColumns = (ctx = null) => ({
  title: 'Character Performance Averages',
  description: 'Aggregated statistics showing overall performance across all matches',
  
  columnGroups: [
    { name: 'Identity & Context', columns: ['name', 'primaryTeam', 'primaryMap', 'primaryPosition', 'matchCount', 'wins', 'losses'] },
    { name: 'Combat Performance', columns: ['avgDamage', 'avgTaken', 'efficiency', 'dps', 'combatScore', 'avgBattleTime', 'totalKills', 'avgKills'] },
    { name: 'Survival & Health', columns: ['avgHPGaugeValueMax', 'avgHealth', 'healthRetention', 'survivalRate', 'avgGuards', 'avgRevengeCounters', 'avgSuperCounters', 'avgZCounters', 'avgTags'] },
    { name: 'Special Abilities', columns: ['avgS1Blast', 'avgS1Hit', 's1HitRate', 'avgS2Blast', 'avgS2Hit', 's2HitRate', 'avgUltBlast', 'avgUltHit', 'ultHitRate', 'avgSkill1', 'avgSkill2', 'avgUltimates', 'avgEnergyBlasts', 'avgCharges', 'avgSparking', 'avgDragonDashMileage'] },
    { name: 'Combat Mechanics', columns: ['avgMaxCombo', 'avgMaxComboDamage', 'avgThrows', 'avgLightningAttacks', 'avgVanishingAttacks', 'avgDragonHoming', 'avgSpeedImpacts', 'speedImpactWinRate', 'avgSparkingCombo'] },
    { name: 'Build & Equipment', columns: ['buildComposition', 'meleeCost', 'blastCost', 'kiBlastCost', 'defenseCost', 'skillCost', 'kiEfficiencyCost', 'utilityCost', 'topCapsules', 'primaryAIStrategy'] },
    { name: 'Transformations', columns: ['transformRate', 'transformed', 'transformMatches', 'fused', 'firstTransformation', 'hasMultipleForms', 'formCount', 'formHistory'] }
  ],
  
  columns: [
    // ========================================================================
    // A. IDENTITY & CONTEXT (3 columns)
    // ========================================================================
    {
      key: 'name',
      header: 'Character Name',
      accessor: (row) => row.name,
      group: 'Identity & Context',
    },
    {
      key: 'primaryTeam',
      header: 'Primary Team',
      accessor: (row) => row.primaryTeam || 'Unknown',
      group: 'Identity & Context',
    },
    {
      key: 'primaryMap',
      header: 'Primary Map',
      accessor: (row) => row.primaryMap || 'Unknown',
      group: 'Identity & Context',
    },
    {
      key: 'primaryPosition',
      header: 'Position',
      accessor: (row) => row.primaryPosition || '—',
      group: 'Identity & Context',
    },
    {
      key: 'matchCount',
      header: 'Matches',
      accessor: (row) => row.matchCount,
      group: 'Identity & Context',
    },
    {
      key: 'wins',
      header: 'Wins',
      accessor: (row) => row.wins,
      group: 'Identity & Context',
    },
    {
      key: 'losses',
      header: 'Losses',
      accessor: (row) => row.losses,
      group: 'Identity & Context',
    },

    // ========================================================================
    // B. COMBAT PERFORMANCE (8 columns)
    // ========================================================================
    {
      key: 'avgDamage',
      header: 'Avg Damage',
      accessor: (row) => row.avgDamage,
      group: 'Combat Performance',
    },
    {
      key: 'avgTaken',
      header: 'Avg Taken',
      accessor: (row) => row.avgTaken,
      group: 'Combat Performance',
    },
    {
      key: 'efficiency',
      header: 'Efficiency',
      accessor: (row) => row.totalTaken > 0 ? row.totalDamage / row.totalTaken : 0,
      group: 'Combat Performance',
    },
    {
      key: 'dps',
      header: 'DPS',
      accessor: (row) => row.avgBattleTime > 0 ? row.avgDamage / row.avgBattleTime : 0,
      group: 'Combat Performance',
    },
    {
      key: 'combatScore',
      header: 'Combat Score',
      accessor: (row) => row.combatPerformanceScore,
      group: 'Combat Performance',
    },
    {
      key: 'avgBattleTime',
      header: 'Avg Time',
      accessor: (row) => row.avgBattleTime,
      group: 'Combat Performance',
    },
    {
      key: 'totalKills',
      header: 'Total KOs',
      accessor: (row) => row.totalKills,
      group: 'Combat Performance',
    },
    {
      key: 'avgKills',
      header: 'Avg KOs',
      accessor: (row) => row.avgKills,
      group: 'Combat Performance',
    },

    // ========================================================================
    // C. SURVIVAL & HEALTH (8 columns)
    // ========================================================================
    {
      key: 'avgHPGaugeValueMax',
      header: 'Max HP',
      accessor: (row) => row.avgHPGaugeValueMax,
      group: 'Survival & Health',
    },
    {
      key: 'avgHealth',
      header: 'Avg HP Left',
      accessor: (row) => row.avgHealth,
      group: 'Survival & Health',
    },
    {
      key: 'healthRetention',
      header: 'HP Retention %',
      accessor: (row) => row.avgHPGaugeValueMax > 0 ? (row.avgHealth / row.avgHPGaugeValueMax) * 100 : 0,
      group: 'Survival & Health',
    },
    {
      key: 'survivalRate',
      header: 'Survival Rate %',
      accessor: (row) => row.survivalRate || 0,
      group: 'Survival & Health',
    },
    {
      key: 'avgGuards',
      header: 'Avg Guards',
      accessor: (row) => row.avgGuards,
      group: 'Survival & Health',
    },
    {
      key: 'avgRevengeCounters',
      header: 'Avg Revenge Counters',
      accessor: (row) => row.avgRevengeCounters,
      group: 'Survival & Health',
    },
    {
      key: 'avgSuperCounters',
      header: 'Avg Super Counters',
      accessor: (row) => row.avgSuperCounters,
      group: 'Survival & Health',
    },
    {
      key: 'avgZCounters',
      header: 'Avg Z-Counters',
      accessor: (row) => row.avgZCounters,
      group: 'Survival & Health',
    },
    {
      key: 'avgTags',
      header: 'Avg Tags',
      accessor: (row) => row.avgTags,
      group: 'Survival & Health',
    },

    // ========================================================================
    // D. SPECIAL ABILITIES (15 columns)
    // ========================================================================
    // Super 1 Blast Tracking (3 columns: Thrown, Hit, Rate)
    {
      key: 'avgS1Blast',
      header: 'S1 Thrown',
      accessor: (row) => row.avgS1Blast,
      group: 'Special Abilities',
    },
    {
      key: 'avgS1Hit',
      header: 'S1 Hit',
      accessor: (row) => row.avgS1Hit,
      group: 'Special Abilities',
    },
    {
      key: 's1HitRate',
      header: 'S1 Hit Rate',
      accessor: (row) => row.s1HitRateOverall,
      group: 'Special Abilities',
    },
    // Super 2 Blast Tracking (3 columns: Thrown, Hit, Rate)
    {
      key: 'avgS2Blast',
      header: 'S2 Thrown',
      accessor: (row) => row.avgS2Blast,
      group: 'Special Abilities',
    },
    {
      key: 'avgS2Hit',
      header: 'S2 Hit',
      accessor: (row) => row.avgS2Hit,
      group: 'Special Abilities',
    },
    {
      key: 's2HitRate',
      header: 'S2 Hit Rate',
      accessor: (row) => row.s2HitRateOverall,
      group: 'Special Abilities',
    },
    // Ultimate Blast Tracking (3 columns: Thrown, Hit, Rate)
    {
      key: 'avgUltBlast',
      header: 'Ult Thrown',
      accessor: (row) => row.avgUltBlast,
      group: 'Special Abilities',
    },
    {
      key: 'avgUltHit',
      header: 'Ult Hit',
      accessor: (row) => row.avgUltHit,
      group: 'Special Abilities',
    },
    {
      key: 'ultHitRate',
      header: 'Ult Hit Rate',
      accessor: (row) => row.ultHitRateOverall,
      group: 'Special Abilities',
    },
    {
      key: 'avgSkill1',
      header: 'Avg Skill 1',
      accessor: (row) => row.avgEXA1,
      group: 'Special Abilities',
    },
    {
      key: 'avgSkill2',
      header: 'Avg Skill 2',
      accessor: (row) => row.avgEXA2,
      group: 'Special Abilities',
    },
    {
      key: 'avgUltimates',
      header: 'Avg Ultimates',
      accessor: (row) => row.avgUltimates,
      group: 'Special Abilities',
    },
    {
      key: 'avgEnergyBlasts',
      header: 'Avg Ki Blasts',
      accessor: (row) => row.avgEnergyBlasts,
      group: 'Special Abilities',
    },
    {
      key: 'avgCharges',
      header: 'Avg Charges',
      accessor: (row) => row.avgCharges,
      group: 'Special Abilities',
    },
    {
      key: 'avgSparking',
      header: 'Avg Sparking',
      accessor: (row) => row.avgSparking,
      group: 'Special Abilities',
    },
    {
      key: 'avgDragonDashMileage',
      header: 'Avg Dragon Dash',
      accessor: (row) => row.avgDragonDashMileage,
      group: 'Special Abilities',
    },

    // ========================================================================
    // E. COMBAT MECHANICS (9 columns)
    // ========================================================================
    {
      key: 'avgMaxCombo',
      header: 'Avg Max Combo',
      accessor: (row) => row.avgMaxCombo,
      group: 'Combat Mechanics',
    },
    {
      key: 'avgMaxComboDamage',
      header: 'Avg Max Combo Dmg',
      accessor: (row) => row.avgMaxComboDamage,
      group: 'Combat Mechanics',
    },
    {
      key: 'avgThrows',
      header: 'Avg Throws',
      accessor: (row) => row.avgThrows,
      group: 'Combat Mechanics',
    },
    {
      key: 'avgLightningAttacks',
      header: 'Avg Lightning',
      accessor: (row) => row.avgLightningAttacks,
      group: 'Combat Mechanics',
    },
    {
      key: 'avgVanishingAttacks',
      header: 'Avg Vanishing',
      accessor: (row) => row.avgVanishingAttacks,
      group: 'Combat Mechanics',
    },
    {
      key: 'avgDragonHoming',
      header: 'Avg Dragon Homing',
      accessor: (row) => row.avgDragonHoming,
      group: 'Combat Mechanics',
    },
    {
      key: 'avgSpeedImpacts',
      header: 'Avg Speed Impacts',
      accessor: (row) => row.avgSpeedImpacts,
      group: 'Combat Mechanics',
    },
    {
      key: 'speedImpactWinRate',
      header: 'Speed Impact Win %',
      accessor: (row) => row.avgSpeedImpacts > 0 ? (row.avgSpeedImpactWins / row.avgSpeedImpacts) * 100 : 0,
      group: 'Combat Mechanics',
    },
    {
      key: 'avgSparkingCombo',
      header: 'Avg Sparking Combo',
      accessor: (row) => row.avgSparkingCombo,
      group: 'Combat Mechanics',
    },

    // ========================================================================
    // F. BUILD & EQUIPMENT (10 columns - 7 build-type costs + composition + top capsules + AI strategy)
    // ========================================================================
    {
      key: 'buildComposition',
      header: 'Build Composition',
      accessor: (row) => row.buildComposition || 'No Build',
      group: 'Build & Equipment',
    },
    {
      key: 'meleeCost',
      header: 'Melee',
      accessor: (row) => row.meleeCost || 0,
      group: 'Build & Equipment',
    },
    {
      key: 'blastCost',
      header: 'Blast',
      accessor: (row) => row.blastCost || 0,
      group: 'Build & Equipment',
    },
    {
      key: 'kiBlastCost',
      header: 'Ki Blast',
      accessor: (row) => row.kiBlastCost || 0,
      group: 'Build & Equipment',
    },
    {
      key: 'defenseCost',
      header: 'Defense',
      accessor: (row) => row.defenseCost || 0,
      group: 'Build & Equipment',
    },
    {
      key: 'skillCost',
      header: 'Skill',
      accessor: (row) => row.skillCost || 0,
      group: 'Build & Equipment',
    },
    {
      key: 'kiEfficiencyCost',
      header: 'Ki Efficiency',
      accessor: (row) => row.kiEfficiencyCost || 0,
      group: 'Build & Equipment',
    },
    {
      key: 'utilityCost',
      header: 'Utility',
      accessor: (row) => row.utilityCost || 0,
      group: 'Build & Equipment',
    },
    {
      key: 'topCapsules',
      header: 'Most Used Capsules',
      accessor: (row) => {
        if (!row.topCapsules || row.topCapsules.length === 0) return '';
        return row.topCapsules
          .slice(0, 3)
          .map(cap => cap.name)
          .join(', ');
      },
      group: 'Build & Equipment',
    },
    {
      key: 'primaryAIStrategy',
      header: 'Primary AI Strategy',
      accessor: (row) => row.primaryAIStrategy || 'Unknown',
      group: 'Build & Equipment',
    },

    // ========================================================================
    // G. TRANSFORMATIONS (8 columns): blank for a character that cannot
    // transform or fuse
    // ========================================================================
    {
      key: 'transformRate',
      header: 'Transform %',
      accessor: (row) => { const t = transformOf(row, ctx); return t && t.rate !== null ? Math.round(t.rate * 100) : null; },
      group: 'Transformations',
    },
    {
      key: 'transformed',
      header: 'Transformed',
      accessor: (row) => { const t = transformOf(row, ctx); return t ? t.transformed : null; },
      group: 'Transformations',
    },
    {
      key: 'transformMatches',
      header: 'Counted Matches',
      accessor: (row) => { const t = transformOf(row, ctx); return t ? t.matches : null; },
      group: 'Transformations',
    },
    {
      key: 'fused',
      header: 'Fused',
      accessor: (row) => { const t = transformOf(row, ctx); return t ? t.fused : null; },
      group: 'Transformations',
    },
    {
      key: 'firstTransformation',
      header: 'First Transformation (s)',
      accessor: (row) => { const t = transformOf(row, ctx); return t && t.seconds !== null ? Math.round(t.seconds) : null; },
      group: 'Transformations',
    },
    {
      key: 'hasMultipleForms',
      header: 'Multiple Forms',
      accessor: (row) => row.hasMultipleForms ? 'Yes' : 'No',
      group: 'Transformations',
    },
    {
      key: 'formCount',
      header: 'Form Count',
      accessor: (row) => row.allFormsUsed?.size || 0,
      group: 'Transformations',
    },
    {
      key: 'formHistory',
      header: 'Form History',
      accessor: (row) => row.formHistory || '',
      group: 'Transformations',
    }
  ]
});

// ==============================================================================
// DATA PREPARATION FUNCTIONS
// ==============================================================================

/**
 * Prepares character averages data for table display
 * Transforms aggregatedData into table-ready format with all required columns
 * @param {Array} aggregatedData - Array of character objects with aggregated stats
 * @returns {Array} Formatted data ready for table rendering
 */
export const prepareCharacterAveragesData = (aggregatedData) => {
  if (!aggregatedData || !Array.isArray(aggregatedData)) return [];
  
  return aggregatedData.map(char => ({
    // Original data
    ...char,
    
    // Ensure all required fields exist with defaults
    name: char.name || 'Unknown',
    primaryTeam: char.primaryTeam || 'Unknown',
    primaryAIStrategy: char.primaryAIStrategy || 'Unknown',
    primaryMap: char.primaryMap || 'Unknown',
    primaryPosition: char.primaryPosition || null,
  matchCount: char.matchCount || 0,
  // Number of matches with non-zero battle time
  activeMatchCount: char.activeMatchCount || 0,
    wins: char.wins || 0,
    losses: char.losses || 0,
    
    // Combat Performance
    avgDamage: Math.round(char.avgDamage || 0),
    avgTaken: Math.round(char.avgTaken || 0),
    combatPerformanceScore: Math.round(char.combatPerformanceScore || 0),
    avgBattleTime: char.avgBattleTime || 0,
    
    // Survival & Health
    avgHPGaugeValueMax: Math.round(char.avgHPGaugeValueMax || 0),
    avgHealth: Math.round(char.avgHealth || 0),
    survivalRate: char.survivalRate || 0,
    avgGuards: char.avgGuards || 0,
    avgRevengeCounters: char.avgRevengeCounters || 0,
    avgSuperCounters: char.avgSuperCounters || 0,
    avgZCounters: char.avgZCounters || 0,
    avgTags: char.avgTags || 0,
    
    // Special Abilities - NEW blast tracking
    avgS1Blast: char.avgS1Blast || 0,
    avgS1Hit: char.avgS1Hit || 0,
    s1HitRateOverall: char.s1HitRateOverall ?? null,
    avgS2Blast: char.avgS2Blast || 0,
    avgS2Hit: char.avgS2Hit || 0,
    s2HitRateOverall: char.s2HitRateOverall ?? null,
    avgUltBlast: char.avgUltBlast || 0,
    avgUltHit: char.avgUltHit || 0,
    ultHitRateOverall: char.ultHitRateOverall ?? null,
    // Legacy fields for backwards compatibility
    avgSPM1: char.avgSPM1 || 0,
    avgSPM2: char.avgSPM2 || 0,
    avgEXA1: char.avgEXA1 || 0,
    avgEXA2: char.avgEXA2 || 0,
    avgUltimates: char.avgUltimates || 0,
    avgEnergyBlasts: char.avgEnergyBlasts || 0,
    avgCharges: char.avgCharges || 0,
    avgSparking: char.avgSparking || 0,
    avgDragonDashMileage: char.avgDragonDashMileage || 0,
    
    // Combat Mechanics
    avgMaxCombo: char.avgMaxCombo || 0,
    avgMaxComboDamage: Math.round(char.avgMaxComboDamage || 0),
    avgThrows: char.avgThrows || 0,
    avgLightningAttacks: char.avgLightningAttacks || 0,
    avgVanishingAttacks: char.avgVanishingAttacks || 0,
    avgDragonHoming: char.avgDragonHoming || 0,
    avgSpeedImpacts: char.avgSpeedImpacts || 0,
    avgSpeedImpactWins: char.avgSpeedImpactWins || 0,
    avgSparkingCombo: char.avgSparkingCombo || 0,
    totalKills: char.totalKills || 0,
    avgKills: char.avgKills || 0,
    
    // Build & Equipment - Extract costs from primaryBuildComposition breakdown
    buildComposition: char.primaryBuildComposition || 'No Build',
    // Get cost breakdown from the most recent match's buildComposition (or calculate average if needed)
    meleeCost: char.avgMeleeCost || 0,
    blastCost: char.avgBlastCost || 0,
    kiBlastCost: char.avgKiBlastCost || 0,
    defenseCost: char.avgDefenseCost || 0,
    skillCost: char.avgSkillCost || 0,
    kiEfficiencyCost: char.avgKiEfficiencyCost || 0,
    utilityCost: char.avgUtilityCost || 0,
    topCapsules: char.topCapsules || [],
    
    // Form Changes
    hasMultipleForms: char.hasMultipleForms || false,
    allFormsUsed: char.allFormsUsed || new Set(),
    formHistory: char.formHistory || '',
    
    // Keep matches for detailed capsule analysis
    matches: char.matches || []
  }));
};

// ==============================================================================
// MATCH DETAILS TABLE CONFIGURATION  
// ==============================================================================
// Purpose: Granular per-match data for deep-dive analysis
// Structure: Multiple rows per character (one row per match)
// Total Columns: ~59 columns across 7 category groups
// Supports up to 7 capsules per match
// ==============================================================================

export const matchDetailsColumns = () => ({
  title: 'Individual Match Performance Details',
  description: 'Per-match statistics for detailed analysis and trend identification',
  
  columnGroups: [
    { name: 'Match Identity', columns: ['name', 'matchNumber', 'team', 'opponentTeam', 'map', 'position', 'matchResult', 'fileName'] },
    { name: 'Combat Performance', columns: ['damageDone', 'damageTaken', 'efficiency', 'dps', 'battleDuration', 'kills'] },
    { name: 'Survival & Health', columns: ['hpRemaining', 'hpMax', 'hpRetention', 'guards', 'revengeCounters', 'superCounters', 'zCounters', 'tags', 'transformations'] },
    { name: 'Special Abilities', columns: ['s1Blast', 's1HitBlast', 's1HitRate', 's2Blast', 's2HitBlast', 's2HitRate', 'ultBlast', 'uLTHitBlast', 'ultHitRate', 'skill1', 'skill2', 'ultimates', 'kiBlasts', 'charges', 'sparkings', 'dragonDashMileage'] },
    { name: 'Combat Mechanics', columns: ['maxComboHits', 'maxComboDamage', 'throws', 'lightningAttacks', 'vanishingAttacks', 'dragonHoming', 'speedImpacts', 'speedImpactWins', 'speedImpactWinRate', 'sparkingComboHits'] },
    { name: 'Build & Equipment', columns: ['buildComposition', 'capsule1', 'capsule2', 'capsule3', 'capsule4', 'capsule5', 'capsule6', 'capsule7', 'meleeCost', 'blastCost', 'kiBlastCost', 'defenseCost', 'skillCost', 'kiEfficiencyCost', 'utilityCost', 'aiStrategy'] },
    { name: 'Form Changes', columns: ['startedAs', 'formsUsed', 'formChangeCount'] }
  ],
  
  columns: [
    // ========================================================================
    // A. MATCH IDENTITY (6 columns)
    // ========================================================================
    {
      key: 'name',
      header: 'Character',
      accessor: (row) => row.name,
      group: 'Match Identity',
    },
    {
      key: 'matchNumber',
      header: 'Match #',
      accessor: (row) => row.matchNumber,
      group: 'Match Identity',
    },
    {
      key: 'team',
      header: 'Team',
      accessor: (row) => row.team || 'Unknown',
      group: 'Match Identity',
    },
    {
      key: 'opponentTeam',
      header: 'Opponent',
      accessor: (row) => row.opponentTeam || 'Unknown',
      group: 'Match Identity',
    },
    {
      key: 'map',
      header: 'Map',
      accessor: (row) => row.map || 'Unknown',
      group: 'Match Identity',
    },
    {
      key: 'position',
      header: 'Position',
      accessor: (row) => row.position,
      group: 'Match Identity',
    },
    {
      key: 'matchResult',
      header: 'Result',
      accessor: (row) => row.matchResult,
      group: 'Match Identity',
    },
    {
      key: 'fileName',
      header: 'Source File',
      accessor: (row) => row.fileName || '',
      group: 'Match Identity',
    },

    // ========================================================================
    // B. COMBAT PERFORMANCE (6 columns)
    // ========================================================================
    {
      key: 'damageDone',
      header: 'Damage Done',
      accessor: (row) => row.damageDone,
      group: 'Combat Performance',
    },
    {
      key: 'damageTaken',
      header: 'Damage Taken',
      accessor: (row) => row.damageTaken,
      group: 'Combat Performance',
    },
    {
      key: 'efficiency',
      header: 'Efficiency',
      accessor: (row) => row.damageTaken > 0 ? row.damageDone / row.damageTaken : 0,
      group: 'Combat Performance',
    },
    {
      key: 'dps',
      header: 'DPS',
      accessor: (row) => row.battleTime > 0 ? row.damageDone / row.battleTime : 0,
      group: 'Combat Performance',
    },
    {
      key: 'battleDuration',
      header: 'Duration',
      accessor: (row) => row.battleTime,
      group: 'Combat Performance',
    },
    {
      key: 'kills',
      header: 'KOs',
      accessor: (row) => row.kills,
      group: 'Combat Performance',
    },

    // ========================================================================
    // C. SURVIVAL & HEALTH (7 columns)
    // ========================================================================
    {
      key: 'hpRemaining',
      header: 'HP Left',
      accessor: (row) => row.hPGaugeValue,
      group: 'Survival & Health',
    },
    {
      key: 'hpMax',
      header: 'Max HP',
      accessor: (row) => row.hPGaugeValueMax,
      group: 'Survival & Health',
    },
    {
      key: 'hpRetention',
      header: 'HP %',
      accessor: (row) => row.hPGaugeValueMax > 0 ? (row.hPGaugeValue / row.hPGaugeValueMax) * 100 : 0,
      group: 'Survival & Health',
    },
    {
      key: 'guards',
      header: 'Guards',
      accessor: (row) => row.guardCount,
      group: 'Survival & Health',
    },
    {
      key: 'revengeCounters',
      header: 'Revenge Counters',
      accessor: (row) => row.revengeCounterCount,
      group: 'Survival & Health',
    },
    {
      key: 'superCounters',
      header: 'Super Counters',
      accessor: (row) => row.superCounterCount,
      group: 'Survival & Health',
    },
    {
      key: 'zCounters',
      header: 'Z-Counters',
      accessor: (row) => row.zCounterCount,
      group: 'Survival & Health',
    },
    {
      key: 'tags',
      header: 'Tags',
      accessor: (row) => row.tags,
      group: 'Survival & Health',
    },
    {
      key: 'transformations',
      header: 'Transformations',
      accessor: (row) => row.formChangeCount,
      group: 'Survival & Health',
    },

    // ========================================================================
    // D. SPECIAL ABILITIES (15 columns)
    // ========================================================================
    // Super 1 Blast Tracking (3 columns: Thrown, Hit, Rate)
    {
      key: 's1Blast',
      header: 'S1 Thrown',
      accessor: (row) => row.s1Blast,
      group: 'Special Abilities',
    },
    {
      key: 's1HitBlast',
      header: 'S1 Hit',
      accessor: (row) => row.s1HitBlast,
      group: 'Special Abilities',
    },
    {
      key: 's1HitRate',
      header: 'S1 Rate',
      accessor: (row) => row.s1HitRate,
      group: 'Special Abilities',
    },
    // Super 2 Blast Tracking (3 columns: Thrown, Hit, Rate)
    {
      key: 's2Blast',
      header: 'S2 Thrown',
      accessor: (row) => row.s2Blast,
      group: 'Special Abilities',
    },
    {
      key: 's2HitBlast',
      header: 'S2 Hit',
      accessor: (row) => row.s2HitBlast,
      group: 'Special Abilities',
    },
    {
      key: 's2HitRate',
      header: 'S2 Rate',
      accessor: (row) => row.s2HitRate,
      group: 'Special Abilities',
    },
    // Ultimate Blast Tracking (3 columns: Thrown, Hit, Rate)
    {
      key: 'ultBlast',
      header: 'Ult Thrown',
      accessor: (row) => row.ultBlast,
      group: 'Special Abilities',
    },
    {
      key: 'uLTHitBlast',
      header: 'Ult Hit',
      accessor: (row) => row.uLTHitBlast,
      group: 'Special Abilities',
    },
    {
      key: 'ultHitRate',
      header: 'Ult Rate',
      accessor: (row) => row.ultHitRate,
      group: 'Special Abilities',
    },
    // Legacy columns kept for backwards compatibility
    {
      key: 'spm1',
      header: 'Super 1 (Legacy)',
      accessor: (row) => row.spm1Count,
      group: 'Special Abilities',
    },
    {
      key: 'spm2',
      header: 'Super 2 (Legacy)',
      accessor: (row) => row.spm2Count,
      group: 'Special Abilities',
    },
    {
      key: 'skill1',
      header: 'Skill 1',
      accessor: (row) => row.exa1Count,
      group: 'Special Abilities',
    },
    {
      key: 'skill2',
      header: 'Skill 2',
      accessor: (row) => row.exa2Count,
      group: 'Special Abilities',
    },
    {
      key: 'ultimates',
      header: 'Ultimates',
      accessor: (row) => row.uLTCount || row.ultCount || 0,
      group: 'Special Abilities',
    },
    {
      key: 'kiBlasts',
      header: 'Ki Blasts',
      accessor: (row) => row.shotEnergyBulletCount,
      group: 'Special Abilities',
    },
    {
      key: 'charges',
      header: 'Charges',
      accessor: (row) => row.chargeCount,
      group: 'Special Abilities',
    },
    {
      key: 'sparkings',
      header: 'Sparkings',
      accessor: (row) => row.sparkingCount,
      group: 'Special Abilities',
    },
    {
      key: 'dragonDashMileage',
      header: 'Dragon Dash',
      accessor: (row) => row.dragonDashMileage,
      group: 'Special Abilities',
    },

    // ========================================================================
    // E. COMBAT MECHANICS (10 columns)
    // ========================================================================
    {
      key: 'maxComboHits',
      header: 'Max Combo',
      accessor: (row) => row.maxComboNum,
      group: 'Combat Mechanics',
    },
    {
      key: 'maxComboDamage',
      header: 'Max Combo Dmg',
      accessor: (row) => row.maxComboDamage,
      group: 'Combat Mechanics',
    },
    {
      key: 'throws',
      header: 'Throws',
      accessor: (row) => row.throwCount,
      group: 'Combat Mechanics',
    },
    {
      key: 'lightningAttacks',
      header: 'Lightning',
      accessor: (row) => row.lightningAttackCount,
      group: 'Combat Mechanics',
    },
    {
      key: 'vanishingAttacks',
      header: 'Vanishing',
      accessor: (row) => row.vanishingAttackCount,
      group: 'Combat Mechanics',
    },
    {
      key: 'dragonHoming',
      header: 'Dragon Homing',
      accessor: (row) => row.dragonHomingCount,
      group: 'Combat Mechanics',
    },
    {
      key: 'speedImpacts',
      header: 'Speed Impacts',
      accessor: (row) => row.speedImpactCount,
      group: 'Combat Mechanics',
    },
    {
      key: 'speedImpactWins',
      header: 'Speed Impact Wins',
      accessor: (row) => row.speedImpactWins,
      group: 'Combat Mechanics',
    },
    {
      key: 'speedImpactWinRate',
      header: 'SI Win %',
      accessor: (row) => row.speedImpactCount > 0 ? (row.speedImpactWins / row.speedImpactCount) * 100 : 0,
      group: 'Combat Mechanics',
    },
    {
      key: 'sparkingComboHits',
      header: 'Sparking Combo',
      accessor: (row) => row.sparkingComboCount,
      group: 'Combat Mechanics',
    },

    // ========================================================================
    // F. BUILD & EQUIPMENT (15 columns - 7 capsules + buildComposition + 7 build-type costs)
    // ========================================================================
    {
      key: 'buildComposition',
      header: 'Build Comp',
      accessor: (row) => row.buildComposition || 'No Build',
      group: 'Build & Equipment',
    },
    // Capsule slots 1-7
    ...[1, 2, 3, 4, 5, 6, 7].map(num => ({
      key: `capsule${num}`,
      header: `Cap ${num}`,
      accessor: (row) => {
        const capsules = row.equippedCapsules || [];
        return capsules[num - 1]?.capsule?.name || capsules[num - 1]?.id || '—';
      },
      group: 'Build & Equipment',
    })),
    {
      key: 'meleeCost',
      header: 'Melee',
      accessor: (row) => row.meleeCost || 0,
      group: 'Build & Equipment',
    },
    {
      key: 'blastCost',
      header: 'Blast',
      accessor: (row) => row.blastCost || 0,
      group: 'Build & Equipment',
    },
    {
      key: 'kiBlastCost',
      header: 'Ki Blast',
      accessor: (row) => row.kiBlastCost || 0,
      group: 'Build & Equipment',
    },
    {
      key: 'defenseCost',
      header: 'Defense',
      accessor: (row) => row.defenseCost || 0,
      group: 'Build & Equipment',
    },
    {
      key: 'skillCost',
      header: 'Skill',
      accessor: (row) => row.skillCost || 0,
      group: 'Build & Equipment',
    },
    {
      key: 'kiEfficiencyCost',
      header: 'Ki Eff',
      accessor: (row) => row.kiEfficiencyCost || 0,
      group: 'Build & Equipment',
    },
    {
      key: 'utilityCost',
      header: 'Utility',
      accessor: (row) => row.utilityCost || 0,
      group: 'Build & Equipment',
    },
    {
      key: 'aiStrategy',
      header: 'AI Strategy',
      accessor: (row) => row.aiStrategy || 'Unknown',
      group: 'Build & Equipment',
    },

    // ========================================================================
    // G. FORM CHANGES (3 columns)
    // ========================================================================
    {
      key: 'formsUsed',
      header: 'Forms Used',
      accessor: (row) => {
        if (!row.formChangeHistory || row.formChangeHistory.length === 0) return '—';
        return row.formChangeHistory;
      },
      group: 'Form Changes',
    },
    {
      key: 'formChangeCount',
      header: 'Form Changes',
      accessor: (row) => row.formChangeCount || 0,
      group: 'Form Changes',
    },
    {
      key: 'startedAs',
      header: 'Started As',
      accessor: (row) => row.name,
      group: 'Form Changes',
    }
  ]
});

// ==============================================================================
// DATA PREPARATION: Match Details
// ==============================================================================

export const prepareMatchDetailsData = (aggregatedData) => {
  if (!aggregatedData || !Array.isArray(aggregatedData)) return [];
  
  // Flatten: Each character's matches become individual rows
  const flattened = [];
  
  aggregatedData.forEach(char => {
    if (!char.matches || !Array.isArray(char.matches)) return;
    
    char.matches.forEach((match, index) => {
      flattened.push({
        // Match Identity
        name: char.name || 'Unknown',
        matchNumber: index + 1,
        position: match.position === 1 ? 'Starter' : match.position === 2 ? 'Middle' : match.position === 3 ? 'Anchor' : '—',
        team: match.team || char.primaryTeam || 'Unknown',
        opponentTeam: match.opponentTeam || 'Unknown',
        map: match.map || 'Unknown',
        matchResult: match.won ? 'Win' : 'Loss',
        fileName: match.fileName || match.source || '',
        
        // Combat Performance
        damageDone: Math.round(match.damageDone || 0),
        damageTaken: Math.round(match.damageTaken || 0),
        battleTime: match.battleTime || 0,
        kills: match.kills || 0,
        
        // Survival & Health
        hPGaugeValue: match.hPGaugeValue || 0,
        hPGaugeValueMax: match.hPGaugeValueMax || 0,
        guardCount: match.guardCount || 0,
        revengeCounterCount: match.revengeCounterCount || 0,
        superCounterCount: match.superCounterCount || 0,
        zCounterCount: match.zCounterCount || 0,
        tags: match.tags || 0,
        
        // Special Abilities - NEW blast tracking
        s1Blast: match.s1Blast || 0,
        s2Blast: match.s2Blast || 0,
        ultBlast: match.ultBlast || 0,
        s1HitBlast: match.s1HitBlast || 0,
        s2HitBlast: match.s2HitBlast || 0,
        uLTHitBlast: match.uLTHitBlast || 0,
        s1HitRate: match.s1HitRate || 0,
        s2HitRate: match.s2HitRate || 0,
        ultHitRate: match.ultHitRate || 0,
        // Legacy fields for backwards compatibility
        spm1Count: match.spm1Count || 0,
        spm2Count: match.spm2Count || 0,
        exa1Count: match.exa1Count || 0,
        exa2Count: match.exa2Count || 0,
        uLTCount: match.ultimatesUsed || match.uLTCount || 0,
        ultCount: match.ultimatesUsed || match.uLTCount || 0,
        shotEnergyBulletCount: match.shotEnergyBulletCount || 0,
        chargeCount: match.chargeCount || 0,
        sparkingCount: match.sparkingCount || 0,
        dragonDashMileage: match.dragonDashMileage || 0,
        
        // Combat Mechanics
        maxComboNum: match.maxComboNum || 0,
        maxComboDamage: match.maxComboDamage || 0,
        throwCount: match.throwCount || 0,
        lightningAttackCount: match.lightningAttackCount || 0,
        vanishingAttackCount: match.vanishingAttackCount || 0,
        dragonHomingCount: match.dragonHomingCount || 0,
        speedImpactCount: match.speedImpactCount || 0,
        speedImpactWins: match.speedImpactWins || 0,
        sparkingComboCount: match.sparkingComboCount || 0,
        
        // Build & Equipment - Extract costs from buildComposition breakdown
        buildComposition: match.buildComposition?.label || 'No Build',
        equippedCapsules: match.equippedCapsules || [],
        // Extract individual build-type costs from buildComposition breakdown
        meleeCost: match.buildComposition?.breakdown?.find(b => b.name === 'Melee')?.cost || 0,
        blastCost: match.buildComposition?.breakdown?.find(b => b.name === 'Blast')?.cost || 0,
        kiBlastCost: match.buildComposition?.breakdown?.find(b => b.name === 'Ki Blast')?.cost || 0,
        defenseCost: match.buildComposition?.breakdown?.find(b => b.name === 'Defense')?.cost || 0,
        skillCost: match.buildComposition?.breakdown?.find(b => b.name === 'Skill')?.cost || 0,
        kiEfficiencyCost: match.buildComposition?.breakdown?.find(b => b.name === 'Ki Efficiency')?.cost || 0,
        utilityCost: match.buildComposition?.breakdown?.find(b => b.name === 'Utility')?.cost || 0,
        aiStrategy: match.aiStrategy || char.primaryAIStrategy || 'Unknown',
        
        // Form Changes
        formChangeHistory: match.formChangeHistory || '—',
        formChangeCount: match.formChangeCount || 0,
      });
    });
  });
  
  return flattened;
};
