/**
 * Filters and sorts the aggregated per-character rows for the leaderboard and
 * the character tables.
 *
 * This was a 695-line useMemo inlined in App.jsx (the last of the four
 * aggregation implementations the redesign set out to consolidate). The body
 * below is copied verbatim from it, so behaviour is unchanged; only the
 * surrounding signature is new. Extracted in Phase 3 because the Character page
 * needs this logic outside the component.
 *
 * The option defaults mirror the initial useState values in App.jsx exactly, so
 * calling this with no options reproduces the app's own default view rather than
 * some other notion of "unfiltered". In particular performanceFilters lists all
 * five levels (the block skips that filter unless between 1 and 4 are selected)
 * and maxMatches is 999, not Infinity.
 */
import { getPerformanceLevel } from '../performanceLevel.js';
import { combatEfficiency } from '../performanceScore.js';

export function filterAggregatedData(aggregatedData, options = {}) {
  const {
    selectedCharacters = [],
    selectedTeams = [],
    selectedAIStrategies = [],
    selectedMaps = [],
    performanceFilters = ['excellent', 'good', 'average', 'below-average', 'poor'],
    minMatches = 1,
    maxMatches = 999,
    sortBy = 'combatScore',
    sortDirection = 'desc',
    activeBuildFilters = {},
    charMap = {},
  } = options;

    if (!Array.isArray(aggregatedData)) return [];
    
    let filtered = aggregatedData.map(char => {
      // Filter matches based on team and AI strategy filters
      let filteredMatches = [...char.matches];
      
      // Apply team filter to matches
      if (selectedTeams.length > 0) {
        filteredMatches = filteredMatches.filter(match => 
          match.team && selectedTeams.includes(match.team)
        );
      }
      
      // Apply AI strategy filter to matches
      if (selectedAIStrategies.length > 0) {
        filteredMatches = filteredMatches.filter(match => 
          match.aiStrategy && selectedAIStrategies.includes(match.aiStrategy)
        );
      }
      
      // Apply map filter to matches
      if (selectedMaps.length > 0) {
        filteredMatches = filteredMatches.filter(match => 
          match.map && selectedMaps.includes(match.map)
        );
      }

      // Snapshot matches after team/AI/map filters but before build filter.
      // Used to compute a stable rank score so build filters don't reorder the list.
      const preBuildMatches = filteredMatches;

      // Apply active build filter
      const activeBuildKey = activeBuildFilters[char.name];
      if (activeBuildKey) {
        filteredMatches = filteredMatches.filter(match => {
          const capsuleKey = (match.equippedCapsules || [])
            .map(c => c.name || c.id || '').sort().join(',');
          return `${capsuleKey}|${match.aiStrategy || 'Default'}` === activeBuildKey;
        });
      }
      
      // If no matches remain after filtering, return null to filter out later
      if (filteredMatches.length === 0) {
        return null;
      }
      
      // Filter to only active matches for stat calculations (matching main aggregation logic)
      const matchCount = filteredMatches.length;
      const activeMatches = filteredMatches.filter(m => m.battleTime && m.battleTime > 0);
      const activeMatchCount = activeMatches.length;
      
      // Recalculate stats based on ACTIVE filtered matches only
      const totalDamage = activeMatches.reduce((sum, m) => sum + m.damageDone, 0);
      const totalTaken = activeMatches.reduce((sum, m) => sum + m.damageTaken, 0);
      const totalHealth = activeMatches.reduce((sum, m) => sum + m.hPGaugeValue, 0);
      const totalBattleTime = activeMatches.reduce((sum, m) => sum + m.battleTime, 0);
      const totalHPGaugeValueMax = activeMatches.reduce((sum, m) => sum + m.hPGaugeValueMax, 0);
      const totalSpecial = filteredMatches.reduce((sum, m) => sum + (m.specialMovesUsed || 0), 0);
      const totalUltimates = filteredMatches.reduce((sum, m) => sum + (m.ultimatesUsed || 0), 0);
      const totalSkills = filteredMatches.reduce((sum, m) => sum + (m.skillsUsed || 0), 0);
      const totalKills = filteredMatches.reduce((sum, m) => sum + (m.kills || 0), 0);
      const totalSparking = filteredMatches.reduce((sum, m) => sum + (m.sparkingCount || 0), 0);
      const totalCharges = filteredMatches.reduce((sum, m) => sum + (m.chargeCount || 0), 0);
      const totalGuards = filteredMatches.reduce((sum, m) => sum + (m.guardCount || 0), 0);
      const totalEnergyBlasts = filteredMatches.reduce((sum, m) => sum + (m.shotEnergyBulletCount || 0), 0);
      const totalZCounters = filteredMatches.reduce((sum, m) => sum + (m.zCounterCount || 0), 0);
      const totalSuperCounters = filteredMatches.reduce((sum, m) => sum + (m.superCounterCount || 0), 0);
      const totalRevengeCounters = filteredMatches.reduce((sum, m) => sum + (m.revengeCounterCount || 0), 0);
      const totalTags = filteredMatches.reduce((sum, m) => sum + (m.tags || 0), 0);
      const totalTransformations = filteredMatches.reduce((sum, m) => sum + (m.formChangeCount || 0), 0);
      const maxComboNumTotal = filteredMatches.reduce((sum, m) => sum + (m.maxComboNum || 0), 0);
      const maxComboDamageTotal = filteredMatches.reduce((sum, m) => sum + (m.maxComboDamage || 0), 0);
      
      // Special Abilities - NEW blast tracking
      const totalS1Blast = filteredMatches.reduce((sum, m) => sum + (m.s1Blast || 0), 0);
      const totalS2Blast = filteredMatches.reduce((sum, m) => sum + (m.s2Blast || 0), 0);
      const totalUltBlast = filteredMatches.reduce((sum, m) => sum + (m.ultBlast || 0), 0);
      const totalS1HitBlast = filteredMatches.reduce((sum, m) => sum + (m.s1HitBlast || 0), 0);
      const totalS2HitBlast = filteredMatches.reduce((sum, m) => sum + (m.s2HitBlast || 0), 0);
      const totalULTHitBlast = filteredMatches.reduce((sum, m) => sum + (m.uLTHitBlast || 0), 0);
      // Track separately for hit rate calculation (only matches with hasAdditionalCounts would have accurate data)
      let totalS1BlastTrackable = 0;
      let totalS2BlastTrackable = 0;
      let totalUltBlastTrackable = 0;
      filteredMatches.forEach(m => {
        // Only count trackable if match has the new format data
        if (m.s1HitRate !== undefined || m.s2HitRate !== undefined || m.ultHitRate !== undefined) {
          totalS1BlastTrackable += (m.s1Blast || 0);
          totalS2BlastTrackable += (m.s2Blast || 0);
          totalUltBlastTrackable += (m.ultBlast || 0);
        }
      });
      
      // Legacy blast tracking
      const totalEXA1 = filteredMatches.reduce((sum, m) => sum + (m.exa1Count || 0), 0);
      const totalEXA2 = filteredMatches.reduce((sum, m) => sum + (m.exa2Count || 0), 0);
      const totalDragonDashMileage = filteredMatches.reduce((sum, m) => sum + (m.dragonDashMileage || 0), 0);
      
      // Combat Performance
      const totalThrows = filteredMatches.reduce((sum, m) => sum + (m.throwCount || 0), 0);
      const totalLightningAttacks = filteredMatches.reduce((sum, m) => sum + (m.lightningAttackCount || 0), 0);
      const totalVanishingAttacks = filteredMatches.reduce((sum, m) => sum + (m.vanishingAttackCount || 0), 0);
      const totalDragonHoming = filteredMatches.reduce((sum, m) => sum + (m.dragonHomingCount || 0), 0);
      const totalSpeedImpacts = filteredMatches.reduce((sum, m) => sum + (m.speedImpactCount || 0), 0);
      const totalSpeedImpactWins = filteredMatches.reduce((sum, m) => sum + (m.speedImpactWins || 0), 0);
      const totalSparkingCombo = filteredMatches.reduce((sum, m) => sum + (m.sparkingComboCount || 0), 0);
  const denom = activeMatchCount > 0 ? activeMatchCount : matchCount;
      
      // Calculate survival count from filtered matches (only count if survived AND participated)
      const survivalCount = filteredMatches.filter(m => m.hPGaugeValue > 0 && m.battleTime > 0).length;
      const survivalRate = Math.round((survivalCount / Math.max(denom, 1)) * 1000) / 10;
      
      // Recalculate teams and AI strategies used from filtered matches
      const teamsUsed = {};
      const aiStrategiesUsed = {};
      const mapsUsed = {};
      
      filteredMatches.forEach(match => {
        if (match.team) {
          teamsUsed[match.team] = (teamsUsed[match.team] || 0) + 1;
        }
        if (match.aiStrategy) {
          aiStrategiesUsed[match.aiStrategy] = (aiStrategiesUsed[match.aiStrategy] || 0) + 1;
        }
        if (match.map) {
          mapsUsed[match.map] = (mapsUsed[match.map] || 0) + 1;
        }
      });
      
      const teamsArray = Object.keys(teamsUsed);
      const aiStrategiesArray = Object.keys(aiStrategiesUsed);
      const mapsArray = Object.keys(mapsUsed);
      
      const primaryTeam = teamsArray.length > 0 
        ? teamsArray.reduce((a, b) => teamsUsed[a] > teamsUsed[b] ? a : b)
        : null;
      
      const primaryAIStrategy = aiStrategiesArray.length > 0
        ? aiStrategiesArray.reduce((a, b) => aiStrategiesUsed[a] > aiStrategiesUsed[b] ? a : b)
        : null;
      
      const primaryMap = mapsArray.length > 0
        ? mapsArray.reduce((a, b) => mapsUsed[a] > mapsUsed[b] ? a : b)
        : null;
      
  // Calculate averages (use denom which prefers active matches if present)
  const avgDamage = Math.round(totalDamage / Math.max(denom, 1));
  const avgTaken = Math.round(totalTaken / Math.max(denom, 1));
  const avgHealth = Math.round(totalHealth / Math.max(denom, 1));
  const avgBattleTime = Math.round((totalBattleTime / Math.max(denom, 1)) * 10) / 10;
  const avgHPGaugeValueMax = Math.round(totalHPGaugeValueMax / Math.max(denom, 1));
  const avgSpecial = Math.round((totalSpecial / Math.max(denom, 1)) * 10) / 10;
  const avgUltimates = Math.round((totalUltimates / Math.max(denom, 1)) * 100) / 100;
  const avgSkills = Math.round((totalSkills / Math.max(denom, 1)) * 10) / 10;
  const avgKills = Math.round((totalKills / Math.max(denom, 1)) * 100) / 100;
  const avgSparking = Math.round((totalSparking / Math.max(denom, 1)) * 100) / 100;
  const avgCharges = Math.round((totalCharges / Math.max(denom, 1)) * 10) / 10;
  const avgGuards = Math.round((totalGuards / Math.max(denom, 1)) * 10) / 10;
  const avgEnergyBlasts = Math.round((totalEnergyBlasts / Math.max(denom, 1)) * 10) / 10;
  const avgZCounters = Math.round((totalZCounters / Math.max(denom, 1)) * 100) / 100;
  const avgSuperCounters = Math.round((totalSuperCounters / Math.max(denom, 1)) * 100) / 100;
  const avgRevengeCounters = Math.round((totalRevengeCounters / Math.max(denom, 1)) * 100) / 100;
  const avgTags = Math.round((totalTags / Math.max(denom, 1)) * 100) / 100;
  const avgTransformations = Math.round((totalTransformations / Math.max(denom, 1)) * 100) / 100;
  const avgMaxCombo = Math.round((maxComboNumTotal / Math.max(denom, 1)) * 10) / 10;
  const avgMaxComboDamage = Math.round(maxComboDamageTotal / Math.max(denom, 1));
  
  // Special Abilities - NEW blast tracking averages
  const avgS1Blast = Math.round((totalS1Blast / Math.max(denom, 1)) * 100) / 100;
  const avgS2Blast = Math.round((totalS2Blast / Math.max(denom, 1)) * 100) / 100;
  const avgUltBlast = Math.round((totalUltBlast / Math.max(denom, 1)) * 100) / 100;
  const avgS1Hit = Math.round((totalS1HitBlast / Math.max(denom, 1)) * 100) / 100;
  const avgS2Hit = Math.round((totalS2HitBlast / Math.max(denom, 1)) * 100) / 100;
  const avgUltHit = Math.round((totalULTHitBlast / Math.max(denom, 1)) * 100) / 100;
  // Hit rates (overall across all filtered matches)
  const s1HitRateOverall = totalS1BlastTrackable > 0 ? Math.round((totalS1HitBlast / totalS1BlastTrackable) * 1000) / 10 : null;
  const s2HitRateOverall = totalS2BlastTrackable > 0 ? Math.round((totalS2HitBlast / totalS2BlastTrackable) * 1000) / 10 : null;
  const ultHitRateOverall = totalUltBlastTrackable > 0 ? Math.round((totalULTHitBlast / totalUltBlastTrackable) * 1000) / 10 : null;
  
  // Special Abilities - Legacy blast tracking (for backwards compatibility)
  const avgSPM1 = avgS1Blast; // Same as avgS1Blast
  const avgSPM2 = avgS2Blast; // Same as avgS2Blast
  const avgEXA1 = Math.round((totalEXA1 / Math.max(denom, 1)) * 100) / 100;
  const avgEXA2 = Math.round((totalEXA2 / Math.max(denom, 1)) * 100) / 100;
  const avgDragonDashMileage = Math.round((totalDragonDashMileage / Math.max(denom, 1)) * 10) / 10;
  
  // Combat Performance averages
  const avgThrows = Math.round((totalThrows / Math.max(denom, 1)) * 100) / 100;
  const avgLightningAttacks = Math.round((totalLightningAttacks / Math.max(denom, 1)) * 100) / 100;
  const avgVanishingAttacks = Math.round((totalVanishingAttacks / Math.max(denom, 1)) * 100) / 100;
  const avgDragonHoming = Math.round((totalDragonHoming / Math.max(denom, 1)) * 100) / 100;
  const avgSpeedImpacts = Math.round((totalSpeedImpacts / Math.max(denom, 1)) * 100) / 100;
  const avgSpeedImpactWins = Math.round((totalSpeedImpactWins / Math.max(denom, 1)) * 100) / 100;
  const avgSparkingCombo = Math.round((totalSparkingCombo / Math.max(denom, 1)) * 10) / 10;
  
  // Calculate win/loss stats
  const totalWins = filteredMatches.filter(m => m.won).length;
  const totalLosses = filteredMatches.filter(m => !m.won).length;
  const winRate = activeMatches.length > 0 
    ? Math.round((activeMatches.filter(m => m.won).length / activeMatches.length) * 1000) / 10 
    : (filteredMatches.length > 0 ? Math.round((totalWins / filteredMatches.length) * 1000) / 10 : 0);
  
  // Calculate speed impact win rate
  const speedImpactWinRate = totalSpeedImpacts > 0 
    ? Math.round((totalSpeedImpactWins / totalSpeedImpacts) * 1000) / 10 
    : 0;
      
      // Calculate DPS and efficiency - use totals for DPS and efficiency
      const dps = totalBattleTime > 0 ? totalDamage / totalBattleTime : 0;
      const efficiency = totalTaken > 0 ? totalDamage / totalTaken : 0;
      const healthRetention = avgHPGaugeValueMax > 0 ? avgHealth / avgHPGaugeValueMax : 0;
      
      // Recalculate combat performance score using consistent formula
      const baseScore = (
        (avgDamage / 100000) * 35 +        // Damage dealt weight: 35%
        (efficiency) * 25 +                 // Damage efficiency weight: 25%
        (dps / 1000) * 25 +                 // Damage per second weight: 25%
        (healthRetention) * 15              // Health retention weight: 15%
      );
      
  // Experience multiplier based on matches played; prefer active matches for weighting
  const experienceMultiplier = Math.min(1.25, 1.0 + ((activeMatchCount > 0 ? activeMatchCount : matchCount) - 1) * (0.25 / 11));
      const combatPerformanceScore = Math.round((baseScore * experienceMultiplier) * 100) / 100;

      // Compute baseRankScore from pre-build-filter matches so team/AI/map filters influence
      // ranking order but a build filter does not shift a character's position in the list.
      let baseRankScore;
      const activeBuildKeyForRank = activeBuildFilters[char.name];
      if (activeBuildKeyForRank && preBuildMatches.length > 0) {
        const pbActive = preBuildMatches.filter(m => m.battleTime && m.battleTime > 0);
        const pbDenom = pbActive.length > 0 ? pbActive.length : preBuildMatches.length;
        const pbDmg   = pbActive.reduce((s, m) => s + m.damageDone, 0);
        const pbTaken = pbActive.reduce((s, m) => s + m.damageTaken, 0);
        const pbHP    = pbActive.reduce((s, m) => s + m.hPGaugeValue, 0);
        const pbHPMax = pbActive.reduce((s, m) => s + m.hPGaugeValueMax, 0);
        const pbTime  = pbActive.reduce((s, m) => s + m.battleTime, 0);
        const pbAvgDmg = Math.round(pbDmg / Math.max(pbDenom, 1));
        const pbAvgHP  = Math.round(pbHP  / Math.max(pbDenom, 1));
        const pbAvgHPMax = Math.round(pbHPMax / Math.max(pbDenom, 1));
        const pbEff  = pbTaken > 0 ? pbDmg / pbTaken : 0;
        const pbDps  = pbTime  > 0 ? pbDmg / pbTime  : 0;
        const pbHRet = pbAvgHPMax > 0 ? pbAvgHP / pbAvgHPMax : 0;
        const pbBase = (pbAvgDmg / 100000) * 35 + pbEff * 25 + (pbDps / 1000) * 25 + pbHRet * 15;
        const pbExp  = Math.min(1.25, 1.0 + ((pbActive.length > 0 ? pbActive.length : preBuildMatches.length) - 1) * (0.25 / 11));
        baseRankScore = Math.round(pbBase * pbExp * 100) / 100;
      } else {
        baseRankScore = combatPerformanceScore;
      }
      
      // Recalculate top 3 most used builds based on FILTERED matches
      const buildGroups = {};
      
      // Group filtered matches by exact capsule loadout + AI strategy so different capsule sets are tracked separately
      filteredMatches.forEach(match => {
        if (match.buildComposition && match.buildComposition.label) {
          const capsuleKey = (match.equippedCapsules || [])
            .map(c => c.name || c.id || '')
            .sort()
            .join(',');
          const buildLabel = `${capsuleKey}|${match.aiStrategy || 'Default'}`;
          
          if (!buildGroups[buildLabel]) {
            buildGroups[buildLabel] = {
              buildComposition: match.buildComposition,
              aiStrategy: match.aiStrategy || null,
              equippedCapsules: match.equippedCapsules || [],
              totalCapsuleCost: match.totalCapsuleCost || 0,
              count: 0,
              activeCount: 0,
              totalDamageDealt: 0,
              totalDamageTaken: 0,
              totalBattleDuration: 0,
              totalHealthRemaining: 0,
              totalHealthMax: 0
            };
          }
          
          buildGroups[buildLabel].count++;
          // Only count as active if battleTime > 0
          if (match.battleTime && match.battleTime > 0) {
            buildGroups[buildLabel].activeCount++;
            buildGroups[buildLabel].totalBattleDuration += match.battleTime;
            // Only accumulate stats for active matches
            buildGroups[buildLabel].totalDamageDealt += match.damageDone || 0;
            buildGroups[buildLabel].totalDamageTaken += match.damageTaken || 0;
            buildGroups[buildLabel].totalHealthRemaining += match.hPGaugeValue || 0;
            buildGroups[buildLabel].totalHealthMax += match.hPGaugeValueMax || 0;
          }
        }
      });
      
      // Calculate performance score for each build and sort
      const sortedBuilds = Object.values(buildGroups)
        .filter(build => build.activeCount > 0) // Only include builds with active matches
        .map(build => {
          // Use activeCount for averages (non-zero battleTime), fallback to count
          const denominator = build.activeCount > 0 ? build.activeCount : build.count;
          // Round averages to match character-level calculation precision
          const avgDamageDealt = Math.round(build.totalDamageDealt / denominator);
          const avgDamageTaken = Math.round(build.totalDamageTaken / denominator);
          const avgBattleDuration = Math.round((build.totalBattleDuration / (build.activeCount > 0 ? build.activeCount : 1)) * 10) / 10;
          const avgHealthRemaining = Math.round(build.totalHealthRemaining / denominator);
          const avgHealthMax = Math.round(build.totalHealthMax / denominator);
          
          // Calculate derived stats (use totals, not rounded averages, for accuracy)
          const damageEfficiency = combatEfficiency(build.totalDamageDealt, build.totalDamageTaken);
          const damagePerSecond = build.totalBattleDuration > 0 
            ? build.totalDamageDealt / build.totalBattleDuration 
            : 0;
          const healthRetention = avgHealthMax > 0 ? avgHealthRemaining / avgHealthMax : 0;
          
          // Calculate base score using same formula as character performance
          const baseScore = (
            (avgDamageDealt / 100000) * 35 +        // Damage dealt weight: 35%
            (damageEfficiency) * 25 +                // Damage efficiency weight: 25%
            (damagePerSecond / 1000) * 25 +          // Damage per second weight: 25%
            (healthRetention) * 15                   // Health retention weight: 15%
          );
          
          // Apply experience multiplier
          const experienceMultiplier = Math.min(1.25, 1.0 + ((build.activeCount > 0 ? build.activeCount : build.count) - 1) * (0.25 / 11));
          const performanceScore = Math.round((baseScore * experienceMultiplier) * 100) / 100;
          
          return {
            ...build,
            avgPerformanceScore: performanceScore
          };
        })
        .sort((a, b) => {
          // Primary sort: by active usage count (descending)
          if (b.activeCount !== a.activeCount) return b.activeCount - a.activeCount;
          // Tie-breaker: by average performance score (descending)
          return b.avgPerformanceScore - a.avgPerformanceScore;
        });
      
      // Pass all builds (no cap) — UI handles selection and display
      const topBuilds = sortedBuilds;
      
      // Recalculate form stats from FILTERED matches
      const formStatsMap = {};
      const allFormsUsedFiltered = new Set();
      
      filteredMatches.forEach(match => {
        // Track all forms from filtered matches
        if (match.formChangeHistory && match.formChangeHistory !== '—') {
          // Extract form IDs from the formatted string if needed
          // The formChangeHistory could be stored as a formatted string
          // We need the actual formId data which is in perFormStats
        }
        
        // Aggregate per-form stats from this match
        if (match.perFormStats && Array.isArray(match.perFormStats)) {
          match.perFormStats.forEach(formStat => {
            const formId = formStat.formId;
            
            // Track this form as used
            allFormsUsedFiltered.add(formId);
            
            if (!formStatsMap[formId]) {
              formStatsMap[formId] = {
                formId: formId,
                formNumber: formStat.formNumber,
                name: formStat.name || charMap[formId] || formId,
                isFirstForm: formStat.isFirstForm,
                isFinalForm: formStat.isFinalForm,
                // Combat stats
                totalDamageDone: 0,
                totalDamageTaken: 0,
                totalBattleTime: 0,
                totalBattleCount: 0,
                // Health
                totalHPRemaining: 0,
                totalHPMax: 0,
                // Special abilities
                totalSpecialMoves: 0,
                totalUltimates: 0,
                totalSkills: 0,
                // Blast tracking
                totalS1Blast: 0,
                totalS2Blast: 0,
                totalUltBlast: 0,
                totalS1HitBlast: 0,
                totalS2HitBlast: 0,
                totalULTHitBlast: 0,
                // Survival & Defense
                totalSparking: 0,
                totalCharges: 0,
                totalGuards: 0,
                totalEnergyBlasts: 0,
                totalZCounters: 0,
                totalSuperCounters: 0,
                totalRevengeCounters: 0,
                // Combat mechanics
                totalMaxComboNum: 0,
                totalMaxComboDamage: 0,
                totalThrows: 0,
                totalLightningAttacks: 0,
                totalVanishingAttacks: 0,
                totalDragonHoming: 0,
                totalSpeedImpacts: 0,
                totalSpeedImpactWins: 0,
                totalSparkingCombo: 0,
                totalDragonDashMileage: 0,
                // Kills
                totalKills: 0,
                matchCount: 0
              };
            }
            
            const formData = formStatsMap[formId];
            
            // Accumulate stats for this form
            formData.totalDamageDone += formStat.damageDone || 0;
            formData.totalDamageTaken += formStat.damageTaken || 0;
            formData.totalBattleTime += formStat.battleTime || 0;
            formData.totalBattleCount += formStat.battleCount || 0;
            formData.totalHPRemaining += formStat.hPGaugeValue || 0;
            formData.totalHPMax += formStat.hPGaugeValueMax || 0;
            formData.totalSpecialMoves += formStat.specialMovesUsed || 0;
            formData.totalUltimates += formStat.ultimatesUsed || 0;
            formData.totalSkills += formStat.skillsUsed || 0;
            formData.totalS1Blast += formStat.s1Blast || 0;
            formData.totalS2Blast += formStat.s2Blast || 0;
            formData.totalUltBlast += formStat.ultBlast || 0;
            formData.totalS1HitBlast += formStat.s1HitBlast || 0;
            formData.totalS2HitBlast += formStat.s2HitBlast || 0;
            formData.totalULTHitBlast += formStat.uLTHitBlast || 0;
            formData.totalSparking += formStat.sparkingCount || 0;
            formData.totalCharges += formStat.chargeCount || 0;
            formData.totalGuards += formStat.guardCount || 0;
            formData.totalEnergyBlasts += formStat.shotEnergyBulletCount || 0;
            formData.totalZCounters += formStat.zCounterCount || 0;
            formData.totalSuperCounters += formStat.superCounterCount || 0;
            formData.totalRevengeCounters += formStat.revengeCounterCount || 0;
            formData.totalMaxComboNum += formStat.maxComboNum || 0;
            formData.totalMaxComboDamage += formStat.maxComboDamage || 0;
            formData.totalThrows += formStat.throwCount || 0;
            formData.totalLightningAttacks += formStat.lightningAttackCount || 0;
            formData.totalVanishingAttacks += formStat.vanishingAttackCount || 0;
            formData.totalDragonHoming += formStat.dragonHomingCount || 0;
            formData.totalSpeedImpacts += formStat.speedImpactCount || 0;
            formData.totalSpeedImpactWins += formStat.speedImpactWins || 0;
            formData.totalSparkingCombo += formStat.sparkingComboCount || 0;
            formData.totalDragonDashMileage += formStat.dragonDashMileage || 0;
            formData.totalKills += formStat.kills || 0;
            formData.matchCount += 1;
          });
        }
      });
      
      // Calculate averages and format form stats array
      const formStatsArray = Object.values(formStatsMap).map(formStat => {
        const matchCount = formStat.matchCount || 1;
        const damagePerSecond = (formStat.totalBattleTime || 0) > 0 
          ? (formStat.totalDamageDone || 0) / formStat.totalBattleTime 
          : 0;
        const damageEfficiency = combatEfficiency(formStat.totalDamageDone || 0, formStat.totalDamageTaken || 0);
        
        return {
          ...formStat,
          // Averages
          avgDamageDone: Math.round((formStat.totalDamageDone || 0) / matchCount),
          avgDamageTaken: Math.round((formStat.totalDamageTaken || 0) / matchCount),
          avgBattleTime: Math.round(((formStat.totalBattleTime || 0) / matchCount) * 10) / 10,
          avgBattleCount: Math.round(((formStat.totalBattleCount || 0) / matchCount) * 10) / 10,
          avgHPRemaining: Math.round((formStat.totalHPRemaining || 0) / matchCount),
          avgHPMax: Math.round((formStat.totalHPMax || 0) / matchCount),
          avgSpecialMoves: Math.round(((formStat.totalSpecialMoves || 0) / matchCount) * 10) / 10,
          avgUltimates: Math.round(((formStat.totalUltimates || 0) / matchCount) * 100) / 100,
          avgSkills: Math.round(((formStat.totalSkills || 0) / matchCount) * 10) / 10,
          avgS1Blast: Math.round(((formStat.totalS1Blast || 0) / matchCount) * 100) / 100,
          avgS2Blast: Math.round(((formStat.totalS2Blast || 0) / matchCount) * 100) / 100,
          avgUltBlast: Math.round(((formStat.totalUltBlast || 0) / matchCount) * 100) / 100,
          avgS1HitBlast: Math.round(((formStat.totalS1HitBlast || 0) / matchCount) * 100) / 100,
          avgS2HitBlast: Math.round(((formStat.totalS2HitBlast || 0) / matchCount) * 100) / 100,
          avgULTHitBlast: Math.round(((formStat.totalULTHitBlast || 0) / matchCount) * 100) / 100,
          avgSparking: Math.round(((formStat.totalSparking || 0) / matchCount) * 100) / 100,
          avgCharges: Math.round(((formStat.totalCharges || 0) / matchCount) * 10) / 10,
          avgGuards: Math.round(((formStat.totalGuards || 0) / matchCount) * 10) / 10,
          avgEnergyBlasts: Math.round(((formStat.totalEnergyBlasts || 0) / matchCount) * 10) / 10,
          avgZCounters: Math.round(((formStat.totalZCounters || 0) / matchCount) * 100) / 100,
          avgSuperCounters: Math.round(((formStat.totalSuperCounters || 0) / matchCount) * 100) / 100,
          avgRevengeCounters: Math.round(((formStat.totalRevengeCounters || 0) / matchCount) * 100) / 100,
          avgMaxComboNum: Math.round(((formStat.totalMaxComboNum || 0) / matchCount) * 10) / 10,
          avgMaxComboDamage: Math.round((formStat.totalMaxComboDamage || 0) / matchCount),
          avgThrows: Math.round(((formStat.totalThrows || 0) / matchCount) * 100) / 100,
          avgLightningAttacks: Math.round(((formStat.totalLightningAttacks || 0) / matchCount) * 100) / 100,
          avgVanishingAttacks: Math.round(((formStat.totalVanishingAttacks || 0) / matchCount) * 100) / 100,
          avgDragonHoming: Math.round(((formStat.totalDragonHoming || 0) / matchCount) * 100) / 100,
          avgSpeedImpacts: Math.round(((formStat.totalSpeedImpacts || 0) / matchCount) * 100) / 100,
          avgSpeedImpactWins: Math.round(((formStat.totalSpeedImpactWins || 0) / matchCount) * 100) / 100,
          avgSparkingCombo: Math.round(((formStat.totalSparkingCombo || 0) / matchCount) * 10) / 10,
          avgDragonDashMileage: Math.round(((formStat.totalDragonDashMileage || 0) / matchCount) * 10) / 10,
          avgKills: Math.round(((formStat.totalKills || 0) / matchCount) * 100) / 100,
          // Calculated stats
          damagePerSecond: Math.round(damagePerSecond * 10) / 10,
          damageEfficiency: Math.round(damageEfficiency * 100) / 100,
          // Hit rates
          s1HitRate: (formStat.totalS1Blast || 0) > 0
            ? Math.round(((formStat.totalS1HitBlast || 0) / formStat.totalS1Blast) * 1000) / 10
            : null,
          s2HitRate: (formStat.totalS2Blast || 0) > 0
            ? Math.round(((formStat.totalS2HitBlast || 0) / formStat.totalS2Blast) * 1000) / 10
            : null,
          ultHitRate: (formStat.totalUltBlast || 0) > 0
            ? Math.round(((formStat.totalULTHitBlast || 0) / formStat.totalUltBlast) * 1000) / 10
            : null,
          speedImpactWinRate: (formStat.totalSpeedImpacts || 0) > 0
            ? Math.round(((formStat.totalSpeedImpactWins || 0) / formStat.totalSpeedImpacts) * 1000) / 10
            : null,
        };
      });
      
      // Generate form history from filtered forms
      const allFormsFiltered = Array.from(allFormsUsedFiltered);
      const formHistory = allFormsFiltered.length > 1 
        ? allFormsFiltered.map(f => charMap[f] || f).join(', ') 
        : '';
      const hasMultipleForms = allFormsFiltered.length > 1;
      
      return {
        ...char,
        matchCount,
        activeMatchCount,
        totalDamage,
        totalTaken,
        totalHealth,
        totalBattleTime,
        totalHPGaugeValueMax,
        totalSpecial,
        totalUltimates,
        totalSkills,
        totalKills,
        totalSparking,
        totalCharges,
        totalGuards,
        totalEnergyBlasts,
        totalZCounters,
        totalSuperCounters,
        totalRevengeCounters,
        totalTransformations,
        totalTags,
        totalS1Blast,
        totalS2Blast,
        totalUltBlast,
        totalS1HitBlast,
        totalS2HitBlast,
        totalULTHitBlast,
        totalS1BlastTrackable,
        totalS2BlastTrackable,
        totalUltBlastTrackable,
        totalEXA1,
        totalEXA2,
        totalDragonDashMileage,
        totalThrows,
        totalLightningAttacks,
        totalVanishingAttacks,
        totalDragonHoming,
        totalSpeedImpacts,
        totalSpeedImpactWins,
        totalSparkingCombo,
        maxComboNumTotal,
        maxComboDamageTotal,
        avgDamage,
        avgTaken,
        avgHealth,
        avgBattleTime,
        avgHPGaugeValueMax,
        avgSpecial,
        avgUltimates,
        avgSkills,
        avgKills,
        avgSparking,
        avgCharges,
        avgGuards,
        avgEnergyBlasts,
        avgZCounters,
        avgSuperCounters,
        avgRevengeCounters,
        avgTransformations,
        avgTags,
        avgMaxCombo,
        avgMaxComboDamage,
        avgS1Blast,
        avgS2Blast,
        avgUltBlast,
        avgS1Hit,
        avgS2Hit,
        avgUltHit,
        s1HitRateOverall,
        s2HitRateOverall,
        ultHitRateOverall,
        avgSPM1,
        avgSPM2,
        avgEXA1,
        avgEXA2,
        avgDragonDashMileage,
        avgThrows,
        avgLightningAttacks,
        avgVanishingAttacks,
        avgDragonHoming,
        avgSpeedImpacts,
        avgSpeedImpactWins,
        avgSparkingCombo,
        dps,
        efficiency,
        survivalRate,
        combatPerformanceScore,
        wins: totalWins,
        losses: totalLosses,
        winRate: winRate,
        speedImpactWinRate: speedImpactWinRate,
        teamsUsed: teamsArray,
        aiStrategiesUsed: aiStrategiesArray,
        mapsUsed: mapsArray,
        primaryTeam,
        primaryAIStrategy,
        primaryMap,
        topBuilds: topBuilds, // Recalculated based on filtered matches
        // Form stats - Recalculated based on filtered matches
        formStatsArray: formStatsArray,
        hasMultipleForms: hasMultipleForms,
        formHistory: formHistory,
        matches: filteredMatches,
        baseRankScore // Unfiltered score used to keep rank order stable across build filters
      };
    }).filter(char => char !== null); // Remove characters with no matching matches
    
    // Apply character filter
    if (selectedCharacters.length > 0) {
      filtered = filtered.filter(char => 
        selectedCharacters.includes(char.name)
      );
    }
    
    // Apply minimum/maximum matches filter (use activeMatchCount when available)
    filtered = filtered.filter(char => {
      const matchesForFilter = (char.activeMatchCount && char.activeMatchCount > 0) ? char.activeMatchCount : char.matchCount;
      return matchesForFilter >= minMatches && matchesForFilter <= maxMatches;
    });
    
    // Apply performance level filter
    if (performanceFilters.length > 0 && performanceFilters.length < 5) {
      const combatScores = filtered.map(c => c.combatPerformanceScore);
      filtered = filtered.filter(char => {
        const level = getPerformanceLevel(char.combatPerformanceScore, combatScores);
        return performanceFilters.includes(level);
      });
    }
    
    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let aVal, bVal;
      switch(sortBy) {
        case 'combatScore':
          aVal = a.baseRankScore ?? a.combatPerformanceScore;
          bVal = b.baseRankScore ?? b.combatPerformanceScore;
          break;
        case 'totalDamage':
          aVal = a.totalDamage;
          bVal = b.totalDamage;
          break;
        case 'avgDamage':
          aVal = a.avgDamage;
          bVal = b.avgDamage;
          break;
        case 'dps':
          aVal = a.totalBattleTime > 0 ? a.totalDamage / a.totalBattleTime : 0;
          bVal = b.totalBattleTime > 0 ? b.totalDamage / b.totalBattleTime : 0;
          break;
        case 'efficiency':
          // Use the pre-calculated efficiency value (total-based)
          aVal = a.totalTaken > 0 ? a.totalDamage / a.totalTaken : 0;
          bVal = b.totalTaken > 0 ? b.totalDamage / b.totalTaken : 0;
          break;
        case 'matches':
          aVal = a.matchCount;
          bVal = b.matchCount;
          break;
        case 'name':
          return sortDirection === 'asc' 
            ? a.name.localeCompare(b.name) 
            : b.name.localeCompare(a.name);
        default:
          aVal = a.combatPerformanceScore;
          bVal = b.combatPerformanceScore;
      }
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    return filtered;
}
