import transformationsData from '../../../../../referencedata/transformations.json';
import { extractStats } from '../statCalculations.js';
import { getFusionPartnerFamilyForms } from '../fusionSplit.js';
import { calculatePerFormStats } from '../formStatsCalculator.js';

export function getAggregatedCharacterData(files, charMap, capsuleMap = {}, aiStrategiesMap = {}, mapsMap = {}) {
  const characterStats = {};
  
  // Helper function to process a characterRecord (extracted to avoid duplication)
  function processCharacterRecord(characterRecord, characterIdRecord, teams = null, fileName = '', battleWinLose = null, mapId = null) {
    // Pre-compute slot counts to determine Anchor position
    const alliesSlotKeys = Object.keys(characterRecord).filter(k => k.includes('AlliesTeamMember'));
    const enemySlotKeys = Object.keys(characterRecord).filter(k => k.includes('EnemyTeamMember'));
    const totalAlliesSlots = alliesSlotKeys.length;
    const totalEnemySlots = enemySlotKeys.length;

    function getPositionFromKey(k) {
      if (k.includes('１Ｐ')) return 1; // Starter
      if (k.includes('２Ｐ')) return 1; // Starter (enemy)
      if (k.includes('AlliesTeamMember') || k.includes('EnemyTeamMember')) {
        const slotMatch = k.match(/Member(\d+)/);
        const slotNumber = slotMatch ? parseInt(slotMatch[1]) : null;
        if (slotNumber) {
          const totalSlots = k.includes('AlliesTeamMember') ? totalAlliesSlots : totalEnemySlots;
          return slotNumber === totalSlots ? 3 : 2; // Last = Anchor, others = Middle
        }
      }
      return null;
    }

    // Fusion split helpers — apply a fractional fusion contribution to charData aggregates
    function applyFusionToCharData(charData, fc, mult, includeTrackable) {
      charData.totalDamage += (fc.damageDone || 0) * mult;
      charData.totalTaken += (fc.damageTaken || 0) * mult;
      charData.totalBattleTime += (fc.battleTime || 0) * mult;
      charData.totalKills += (fc.kills || 0) * mult;
      charData.totalSpecial += (fc.specialMovesUsed || 0) * mult;
      charData.totalUltimates += (fc.ultimatesUsed || 0) * mult;
      charData.totalSkills += (fc.skillsUsed || 0) * mult;
      charData.totalSparking += (fc.sparkingCount || 0) * mult;
      charData.totalCharges += (fc.chargeCount || 0) * mult;
      charData.totalGuards += (fc.guardCount || 0) * mult;
      charData.totalEnergyBlasts += (fc.shotEnergyBulletCount || 0) * mult;
      charData.totalZCounters += (fc.zCounterCount || 0) * mult;
      charData.totalSuperCounters += (fc.superCounterCount || 0) * mult;
      charData.totalRevengeCounters += (fc.revengeCounterCount || 0) * mult;
      charData.totalTags += (fc.tags || 0) * mult;
      charData.totalS1Blast += (fc.s1Blast || 0) * mult;
      charData.totalS2Blast += (fc.s2Blast || 0) * mult;
      charData.totalUltBlast += (fc.ultBlast || 0) * mult;
      charData.totalS1HitBlast += (fc.s1HitBlast || 0) * mult;
      charData.totalS2HitBlast += (fc.s2HitBlast || 0) * mult;
      charData.totalULTHitBlast += (fc.uLTHitBlast || 0) * mult;
      charData.totalSPM1 += (fc.s1Blast || 0) * mult;
      charData.totalSPM2 += (fc.s2Blast || 0) * mult;
      charData.totalDragonDashMileage += (fc.dragonDashMileage || 0) * mult;
      charData.totalThrows += (fc.throwCount || 0) * mult;
      charData.totalLightningAttacks += (fc.lightningAttackCount || 0) * mult;
      charData.totalVanishingAttacks += (fc.vanishingAttackCount || 0) * mult;
      charData.totalDragonHoming += (fc.dragonHomingCount || 0) * mult;
      charData.totalSpeedImpacts += (fc.speedImpactCount || 0) * mult;
      charData.totalSpeedImpactWins += (fc.speedImpactWins || 0) * mult;
      charData.totalSparkingCombo += (fc.sparkingComboCount || 0) * mult;
      if (includeTrackable) {
        charData.totalS1BlastTrackable += (fc.s1Blast || 0) * mult;
        charData.totalS2BlastTrackable += (fc.s2Blast || 0) * mult;
        charData.totalUltBlastTrackable += (fc.ultBlast || 0) * mult;
      }
    }

    // Fusion split helpers — apply a fractional fusion contribution to a single match entry
    function applyFusionToMatchEntry(matchEntry, fc, mult) {
      matchEntry.damageDone = (matchEntry.damageDone || 0) + (fc.damageDone || 0) * mult;
      matchEntry.damageTaken = (matchEntry.damageTaken || 0) + (fc.damageTaken || 0) * mult;
      matchEntry.battleTime = (matchEntry.battleTime || 0) + (fc.battleTime || 0) * mult;
      matchEntry.kills = (matchEntry.kills || 0) + (fc.kills || 0) * mult;
      matchEntry.specialMovesUsed = (matchEntry.specialMovesUsed || 0) + (fc.specialMovesUsed || 0) * mult;
      matchEntry.ultimatesUsed = (matchEntry.ultimatesUsed || 0) + (fc.ultimatesUsed || 0) * mult;
      matchEntry.skillsUsed = (matchEntry.skillsUsed || 0) + (fc.skillsUsed || 0) * mult;
      matchEntry.sparkingCount = (matchEntry.sparkingCount || 0) + (fc.sparkingCount || 0) * mult;
      matchEntry.chargeCount = (matchEntry.chargeCount || 0) + (fc.chargeCount || 0) * mult;
      matchEntry.guardCount = (matchEntry.guardCount || 0) + (fc.guardCount || 0) * mult;
      matchEntry.shotEnergyBulletCount = (matchEntry.shotEnergyBulletCount || 0) + (fc.shotEnergyBulletCount || 0) * mult;
      matchEntry.zCounterCount = (matchEntry.zCounterCount || 0) + (fc.zCounterCount || 0) * mult;
      matchEntry.superCounterCount = (matchEntry.superCounterCount || 0) + (fc.superCounterCount || 0) * mult;
      matchEntry.revengeCounterCount = (matchEntry.revengeCounterCount || 0) + (fc.revengeCounterCount || 0) * mult;
      matchEntry.tags = (matchEntry.tags || 0) + (fc.tags || 0) * mult;
      matchEntry.s1Blast = (matchEntry.s1Blast || 0) + (fc.s1Blast || 0) * mult;
      matchEntry.s2Blast = (matchEntry.s2Blast || 0) + (fc.s2Blast || 0) * mult;
      matchEntry.ultBlast = (matchEntry.ultBlast || 0) + (fc.ultBlast || 0) * mult;
      matchEntry.s1HitBlast = (matchEntry.s1HitBlast || 0) + (fc.s1HitBlast || 0) * mult;
      matchEntry.s2HitBlast = (matchEntry.s2HitBlast || 0) + (fc.s2HitBlast || 0) * mult;
      matchEntry.uLTHitBlast = (matchEntry.uLTHitBlast || 0) + (fc.uLTHitBlast || 0) * mult;
      matchEntry.spm1Count = (matchEntry.spm1Count || 0) + (fc.s1Blast || 0) * mult;
      matchEntry.spm2Count = (matchEntry.spm2Count || 0) + (fc.s2Blast || 0) * mult;
      matchEntry.dragonDashMileage = (matchEntry.dragonDashMileage || 0) + (fc.dragonDashMileage || 0) * mult;
      matchEntry.throwCount = (matchEntry.throwCount || 0) + (fc.throwCount || 0) * mult;
      matchEntry.lightningAttackCount = (matchEntry.lightningAttackCount || 0) + (fc.lightningAttackCount || 0) * mult;
      matchEntry.vanishingAttackCount = (matchEntry.vanishingAttackCount || 0) + (fc.vanishingAttackCount || 0) * mult;
      matchEntry.dragonHomingCount = (matchEntry.dragonHomingCount || 0) + (fc.dragonHomingCount || 0) * mult;
      matchEntry.speedImpactCount = (matchEntry.speedImpactCount || 0) + (fc.speedImpactCount || 0) * mult;
      matchEntry.speedImpactWins = (matchEntry.speedImpactWins || 0) + (fc.speedImpactWins || 0) * mult;
      matchEntry.sparkingComboCount = (matchEntry.sparkingComboCount || 0) + (fc.sparkingComboCount || 0) * mult;
    }

    // Phase 1: Build per-team maps of originalCharId → aggregationKey for fusion partner lookup
    const allyOriginalIds = new Map();
    const enemyOriginalIds = new Map();
    Object.keys(characterRecord).forEach(k => {
      const c = characterRecord[k];
      const origId = c.battlePlayCharacter?.originalCharacter?.key;
      if (!origId) return;
      const aggKey = charMap[origId] || origId;
      if (k.includes('AlliesTeamMember') || k.includes('１Ｐ')) {
        allyOriginalIds.set(origId, aggKey);
      } else if (k.includes('EnemyTeamMember') || k.includes('２Ｐ')) {
        enemyOriginalIds.set(origId, aggKey);
      }
    });

    // Fusion adjustments collected during main loop and applied in Phase 3
    const pendingFusionAdjustments = [];

    Object.keys(characterRecord).forEach(key => {
      const char = characterRecord[key];
      const stats = extractStats(char, charMap, capsuleMap, null); // No position for aggregated data
      const charPosition = getPositionFromKey(key);
      if (!stats.name || stats.name === '-') return;
      
      // Determine team association
      let teamName = null;
      let opponentTeam = null;
      let isTeam1 = false;
      if (teams && Array.isArray(teams) && teams.length >= 2) {
        if (key.includes('AlliesTeamMember') || key.includes('１Ｐ')) {
          teamName = teams[0];
          opponentTeam = teams[1];
          isTeam1 = true;
        } else if (key.includes('EnemyTeamMember') || key.includes('２Ｐ')) {
          teamName = teams[1];
          opponentTeam = teams[0];
          isTeam1 = false;
        }
      }
      
      // Extract AI strategy from equipped items (look for AI type capsules)
      let aiStrategy = null;
      const equipItems = char.battlePlayCharacter?.equipItem || [];
      for (const item of equipItems) {
        const strategy = aiStrategiesMap[item.key];
        if (strategy) {
          aiStrategy = strategy.name;
          break; // Found the AI strategy, stop looking
        }
      }
      // If no AI strategy found, use "Default"
      if (!aiStrategy) {
        aiStrategy = 'Default';
      }
      // If no AI strategy found, use "Default"
      if (!aiStrategy) {
        aiStrategy = 'Default';
      }
      
      // Use original form name as the key for aggregation
      const originalForm = char.battlePlayCharacter?.originalCharacter?.key;
      const aggregationKey = originalForm ? (charMap[originalForm] || originalForm) : stats.name;
      
      if (!characterStats[aggregationKey]) {
        characterStats[aggregationKey] = {
          name: aggregationKey,
          totalDamage: 0,
          totalTaken: 0,
          totalHealth: 0,
          totalBattleTime: 0,
          totalHPGaugeValueMax: 0,
          totalSpecial: 0,
          totalUltimates: 0,
          totalSkills: 0,
          totalKills: 0,
          // Survival & Health metrics
          survivalCount: 0,
          totalSparking: 0,
          totalCharges: 0,
          totalGuards: 0,
          totalEnergyBlasts: 0,
          totalZCounters: 0,
          totalSuperCounters: 0,
          totalRevengeCounters: 0,
          totalTags: 0, // New: Character swaps
          totalTransformations: 0, // New: Character transformations
          // Special Abilities - NEW blast tracking system
          totalS1Blast: 0,
          totalS2Blast: 0,
          totalUltBlast: 0,
          totalS1HitBlast: 0,
          totalS2HitBlast: 0,
          totalULTHitBlast: 0,
          // Trackable blasts (only from matches with additionalCounts)
          totalS1BlastTrackable: 0,
          totalS2BlastTrackable: 0,
          totalUltBlastTrackable: 0,
          // Special Abilities - Legacy blast tracking (kept for backwards compatibility)
          totalSPM1: 0,
          totalSPM2: 0,
          totalEXA1: 0,
          totalEXA2: 0,
          totalDragonDashMileage: 0,
          // Combat Performance metrics
          maxComboNumTotal: 0,
          maxComboDamageTotal: 0,
          totalThrows: 0,
          totalLightningAttacks: 0,
          totalVanishingAttacks: 0,
          totalDragonHoming: 0,
          totalSpeedImpacts: 0,
          totalSpeedImpactWins: 0,
          totalSparkingCombo: 0,
          matchCount: 0,
          // activeMatchCount excludes matches with zero battleTime
          activeMatchCount: 0,
          // Build & Equipment tracking
          totalCapsuleCost: 0,
          // Track build-type costs for averaging
          totalMeleeCost: 0,
          totalBlastCost: 0,
          totalKiBlastCost: 0,
          totalDefenseCost: 0,
          totalSkillCost: 0,
          totalKiEfficiencyCost: 0,
          totalUtilityCost: 0,
          buildCompositions: {}, // Track build compositions with counts (new 7-category system)
          capsuleUsage: {}, // Track individual capsules used
          allFormsUsed: new Set(), // Track all forms used across matches
          formStats: {}, // Track per-form aggregated stats
          matches: [], // Track individual match data for meta analysis
          teamsUsed: {}, // Track which teams this character played on with counts
          aiStrategiesUsed: {}, // Track AI strategies used with counts
          mapsUsed: {}, // Track which maps this character fought on with counts
          hasFusionStats: false, // Set true if this character has received or contributed fusion stats
          fusionFormsInvolved: new Set() // Fusion form IDs this character was part of
        };
      }
      
      const charData = characterStats[aggregationKey];
      
      // Track team and AI strategy with frequency
      if (teamName) {
        charData.teamsUsed[teamName] = (charData.teamsUsed[teamName] || 0) + 1;
      }
      if (aiStrategy) {
        charData.aiStrategiesUsed[aiStrategy] = (charData.aiStrategiesUsed[aiStrategy] || 0) + 1;
      }
      // Track which maps this character fought on
      if (mapId) {
        const mapName = mapsMap[mapId] || mapId; // Use friendly name or fall back to ID
        charData.mapsUsed[mapName] = (charData.mapsUsed[mapName] || 0) + 1;
      }
      
      charData.matchCount += 1;
      
      // Only accumulate stats for active matches (battleTime > 0)
      if (stats.battleTime && stats.battleTime > 0) {
        charData.activeMatchCount += 1;
        charData.totalDamage += stats.damageDone;
        charData.totalTaken += stats.damageTaken;
        charData.totalHealth += stats.hPGaugeValue;
        charData.totalBattleTime += stats.battleTime;
        charData.totalHPGaugeValueMax += stats.hPGaugeValueMax;
      }
      
      charData.totalSpecial += stats.specialMovesUsed;
      charData.totalUltimates += stats.ultimatesUsed;
      charData.totalSkills += stats.skillsUsed;
      charData.totalKills += stats.kills;
      // Survival & Health metrics
      // Only count as survived if character had health AND actually participated (battleTime > 0)
      if (stats.hPGaugeValue > 0 && stats.battleTime > 0) {
        charData.survivalCount += 1;
      }
      charData.totalSparking += stats.sparkingCount;
      charData.totalCharges += stats.chargeCount;
      charData.totalGuards += stats.guardCount;
      charData.totalEnergyBlasts += stats.shotEnergyBulletCount;
      charData.totalZCounters += stats.zCounterCount;
      charData.totalSuperCounters += stats.superCounterCount;
      charData.totalRevengeCounters += stats.revengeCounterCount;
      charData.totalTags += stats.tags;
      charData.totalTransformations += stats.formChangeCount || 0;
      // Special Abilities - NEW blast tracking system
      charData.totalS1Blast += stats.s1Blast;
      charData.totalS2Blast += stats.s2Blast;
      charData.totalUltBlast += stats.ultBlast;
      charData.totalS1HitBlast += stats.s1HitBlast;
      charData.totalS2HitBlast += stats.s2HitBlast;
      charData.totalULTHitBlast += stats.uLTHitBlast;
      // Track separately for hit rate calculation (only from new format matches)
      if (stats.hasAdditionalCounts) {
        charData.totalS1BlastTrackable += stats.s1Blast;
        charData.totalS2BlastTrackable += stats.s2Blast;
        charData.totalUltBlastTrackable += stats.ultBlast;
      }
      
      // Special Abilities - Legacy blast tracking (also updated to new values)
      charData.totalSPM1 += stats.s1Blast;
      charData.totalSPM2 += stats.s2Blast;
      charData.totalEXA1 += stats.exa1Count;
      charData.totalEXA2 += stats.exa2Count;
      charData.totalDragonDashMileage += stats.dragonDashMileage;
      // Combat Performance metrics
      charData.maxComboNumTotal += stats.maxComboNum;
      charData.maxComboDamageTotal += stats.maxComboDamage;
      charData.totalThrows += stats.throwCount;
      charData.totalLightningAttacks += stats.lightningAttackCount;
      charData.totalVanishingAttacks += stats.vanishingAttackCount;
      charData.totalDragonHoming += stats.dragonHomingCount;
      charData.totalSpeedImpacts += stats.speedImpactCount;
      charData.totalSpeedImpactWins += stats.speedImpactWins;
      charData.totalSparkingCombo += stats.sparkingComboCount;
      
      // Build & Equipment tracking
      charData.totalCapsuleCost += stats.totalCapsuleCost || 0;
      
      // Track build composition usage (new 7-category system)
      if (stats.buildComposition && stats.buildComposition.label) {
        const label = stats.buildComposition.label;
        charData.buildCompositions[label] = (charData.buildCompositions[label] || 0) + 1;
      }
      
      // Accumulate build-type costs from breakdown
      if (stats.buildComposition && stats.buildComposition.breakdown) {
        stats.buildComposition.breakdown.forEach(item => {
          switch(item.name) {
            case 'Melee': charData.totalMeleeCost += item.cost || 0; break;
            case 'Blast': charData.totalBlastCost += item.cost || 0; break;
            case 'Ki Blast': charData.totalKiBlastCost += item.cost || 0; break;
            case 'Defense': charData.totalDefenseCost += item.cost || 0; break;
            case 'Skill': charData.totalSkillCost += item.cost || 0; break;
            case 'Ki Efficiency': charData.totalKiEfficiencyCost += item.cost || 0; break;
            case 'Utility': charData.totalUtilityCost += item.cost || 0; break;
          }
        });
      }
      
      // Track individual capsules used
      if (stats.equippedCapsules && Array.isArray(stats.equippedCapsules)) {
        stats.equippedCapsules.forEach(capsule => {
          if (capsule.id) {
            if (!charData.capsuleUsage[capsule.id]) {
              charData.capsuleUsage[capsule.id] = {
                id: capsule.id,
                name: capsule.name,
                count: 0
              };
            }
            charData.capsuleUsage[capsule.id].count += 1;
          }
        });
      }
      
      // Extract form change history
      let formChangeHistory = '—';
      let formChangeCount = 0;
      if (Array.isArray(char.formChangeHistory) && char.formChangeHistory.length > 0) {
        formChangeHistory = char.formChangeHistory.map(form => charMap[form.key] || form.key).join(' → ');
        formChangeCount = char.formChangeHistory.length; // Count number of transformations
      }
      
      // Determine win/loss status based on TEAM victory, not character survival
      // battleWinLose is from team 1's perspective: 'Win' means team 1 won, 'Lose' means team 2 won
      let won = false;
      if (battleWinLose) {
        if (isTeam1) {
          // Team 1 character: won if battleWinLose === 'Win'
          won = battleWinLose === 'Win';
        } else {
          // Team 2 character: won if battleWinLose === 'Lose' (team 1 lost)
          won = battleWinLose === 'Lose';
        }
      } else {
        // Fallback to character survival if battleWinLose not available
        won = stats.hPGaugeValue > 0;
      }
      
      // Calculate per-form stats for this match if transformations occurred
      let perFormStatsForMatch = null;
      if (characterIdRecord && char.formChangeHistory && char.formChangeHistory.length > 0) {
        perFormStatsForMatch = calculatePerFormStats(
          char,
          characterIdRecord,
          char.formChangeHistory,
          originalForm
        );
      }

      // Phase 2: Detect fusions by walking the full transformation chain
      // Handles three cases:
      //   Case 1: OriginalForm → FusionForm (e.g. GBR → Fused Zamasu)
      //   Case 2: OriginalForm → FusionForm → PostFusionForm (e.g. GBR → Fused Zamasu → Half-Corrupted)
      //   Case 3: OriginalForm → PreFusionTransform → FusionForm (e.g. Goku Black → GBR → Fused Zamasu)
      if (originalForm && characterIdRecord && Array.isArray(char.formChangeHistory) && char.formChangeHistory.length > 0) {
        const sameTeamMap = isTeam1 ? allyOriginalIds : enemyOriginalIds;

        // Build the full form chain: [originalForm, ...formChangeHistory]
        const formChain = [originalForm, ...char.formChangeHistory.map(f => f.key)];

        for (let i = 1; i < formChain.length; i++) {
          const fusionFormId = formChain[i];
          const fusionOfList = transformationsData[fusionFormId]?.fusionOf;

          // Only a form that IS a fusion and whose preceding form is one of the fusion components
          if (!fusionOfList) continue;
          const precedingForm = formChain[i - 1];
          const initiatorIdx = fusionOfList.indexOf(precedingForm);
          if (initiatorIdx === -1) continue;

          // Pairs are (index 0,1), (index 2,3) — canonical partner is at initiatorIdx ^ 1.
          // BFS the transformsTo graph from that canonical partner to find all forms of that
          // character so we can match whichever form they happen to be in on the team.
          const canonicalPartnerId = fusionOfList[initiatorIdx ^ 1];
          const partnerFamilyForms = getFusionPartnerFamilyForms(canonicalPartnerId, transformationsData);
          const partnerOriginalId = [...partnerFamilyForms].find(id => sameTeamMap.has(id));
          if (!partnerOriginalId) break;

          // Pre-fusion snapshot is keyed by the form immediately before the fusion (precedingForm)
          const snapKey = characterIdRecord[precedingForm]
            ? precedingForm
            : `(Key="${precedingForm}")`;
          const preSnap = characterIdRecord[snapKey] || null;

          if (!preSnap) { console.warn('[Fusion] No pre-fusion snapshot for', precedingForm, 'in match', fileName); break; }

          // Fusion contribution = all stats accumulated FROM the moment of fusion onwards
          // = total cumulative stats − pre-fusion snapshot stats
          const totBattle = char.battleCount || {};
          const snapBattle = preSnap.battleCount || {};
          const totNum = totBattle.battleNumCount || {};
          const snapNum = snapBattle.battleNumCount || {};
          const totAdd = char.additionalCounts || {};
          const snapAdd = preSnap.additionalCounts || {};
          const parseDurLocal = str => {
            if (!str) return 0;
            const m = str.match(/\+\d+\.(\d+):(\d+):(\d+)\./);
            return m ? parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]) : 0;
          };

          const fusionContribution = {
            damageDone: (totBattle.givenDamage || 0) - (snapBattle.givenDamage || 0),
            damageTaken: (totBattle.takenDamage || 0) - (snapBattle.takenDamage || 0),
            battleTime: parseDurLocal(totBattle.battleTime) - parseDurLocal(snapBattle.battleTime),
            kills: (totBattle.killCount || 0) - (snapBattle.killCount || 0),
            specialMovesUsed: (totNum.sPMCount || 0) - (snapNum.sPMCount || 0),
            ultimatesUsed: (totNum.uLTCount || 0) - (snapNum.uLTCount || 0),
            skillsUsed: (totNum.eXACount || 0) - (snapNum.eXACount || 0),
            sparkingCount: (totNum.sparkingCount || 0) - (snapNum.sparkingCount || 0),
            chargeCount: (totNum.chargeCount || 0) - (snapNum.chargeCount || 0),
            guardCount: (totNum.guardCount || 0) - (snapNum.guardCount || 0),
            shotEnergyBulletCount: (totNum.shotEnergyBulletCount || 0) - (snapNum.shotEnergyBulletCount || 0),
            zCounterCount: (totNum.zCounter || 0) - (snapNum.zCounter || 0),
            superCounterCount: (totNum.superCounterCount || 0) - (snapNum.superCounterCount || 0),
            revengeCounterCount: (totNum.revengeCounter || 0) - (snapNum.revengeCounter || 0),
            tags: (totAdd.tags || 0) - (snapAdd.tags || 0),
            s1Blast: (totAdd.s1Blast || 0) - (snapAdd.s1Blast || 0),
            s2Blast: (totAdd.s2Blast || 0) - (snapAdd.s2Blast || 0),
            ultBlast: (totAdd.ultBlast || 0) - (snapAdd.ultBlast || 0),
            s1HitBlast: (totAdd.s1HitBlast || 0) - (snapAdd.s1HitBlast || 0),
            s2HitBlast: (totAdd.s2HitBlast || 0) - (snapAdd.s2HitBlast || 0),
            uLTHitBlast: (totAdd.uLTHitBlast || 0) - (snapAdd.uLTHitBlast || 0),
            dragonDashMileage: (totBattle.dragonDashMileage || 0) - (snapBattle.dragonDashMileage || 0),
            throwCount: (totNum.throwCount || 0) - (snapNum.throwCount || 0),
            lightningAttackCount: (totNum.lightningAttack || 0) - (snapNum.lightningAttack || 0),
            vanishingAttackCount: (totNum.vanishingAttack || 0) - (snapNum.vanishingAttack || 0),
            dragonHomingCount: (totNum.dragonHoming || 0) - (snapNum.dragonHoming || 0),
            speedImpactCount: (totNum.speedImpactCount || 0) - (snapNum.speedImpactCount || 0),
            speedImpactWins: (totNum.speedImpactWinCount || 0) - (snapNum.speedImpactWinCount || 0),
            sparkingComboCount: (totNum.sparkingComboCount || 0) - (snapNum.sparkingComboCount || 0),
          };

          console.log('[Fusion detected]', aggregationKey, '→', fusionFormId, '| partner:', sameTeamMap.get(partnerOriginalId), '| dmg contribution:', fusionContribution.damageDone);

          pendingFusionAdjustments.push({
            triggerAggKey: aggregationKey,
            partnerAggKey: sameTeamMap.get(partnerOriginalId),
            fusionFormId,
            fusionContribution,
            hasAdditionalCounts: char.additionalCounts !== undefined,
          });
          break; // Only the first fusion in the chain matters
        }
      }

      // Add individual match data for meta analysis
      charData.matches.push({
        damageDone: stats.damageDone,
        damageTaken: stats.damageTaken,
        battleTime: stats.battleTime,
        hPGaugeValue: stats.hPGaugeValue,
        hPGaugeValueMax: stats.hPGaugeValueMax,
        buildArchetype: stats.buildArchetype, // Legacy
        buildComposition: stats.buildComposition, // New 7-category system
        totalCapsuleCost: stats.totalCapsuleCost,
        capsuleTypes: stats.capsuleTypes,
        equippedCapsules: stats.equippedCapsules,
        team: teamName,
        opponentTeam: opponentTeam,
        aiStrategy: aiStrategy,
        map: mapId ? (mapsMap[mapId] || mapId) : null, // Map friendly name
        mapId: mapId, // Store raw map ID for reference
        kills: stats.kills,
        specialMovesUsed: stats.specialMovesUsed,
        ultimatesUsed: stats.ultimatesUsed,
        skillsUsed: stats.skillsUsed,
        sparkingCount: stats.sparkingCount,
        chargeCount: stats.chargeCount,
        guardCount: stats.guardCount,
        shotEnergyBulletCount: stats.shotEnergyBulletCount,
        zCounterCount: stats.zCounterCount,
        superCounterCount: stats.superCounterCount,
        revengeCounterCount: stats.revengeCounterCount,
        tags: stats.tags,
        // NEW blast tracking
        s1Blast: stats.s1Blast,
        s2Blast: stats.s2Blast,
        ultBlast: stats.ultBlast,
        s1HitBlast: stats.s1HitBlast,
        s2HitBlast: stats.s2HitBlast,
        uLTHitBlast: stats.uLTHitBlast,
        s1HitRate: stats.s1HitRate,
        s2HitRate: stats.s2HitRate,
        ultHitRate: stats.ultHitRate,
        // Legacy blast tracking (for backwards compatibility)
        spm1Count: stats.s1Blast,
        spm2Count: stats.s2Blast,
        exa1Count: stats.exa1Count,
        exa2Count: stats.exa2Count,
        dragonDashMileage: stats.dragonDashMileage,
        maxComboNum: stats.maxComboNum,
        maxComboDamage: stats.maxComboDamage,
        throwCount: stats.throwCount,
        lightningAttackCount: stats.lightningAttackCount,
        vanishingAttackCount: stats.vanishingAttackCount,
        dragonHomingCount: stats.dragonHomingCount,
        speedImpactCount: stats.speedImpactCount,
        speedImpactWins: stats.speedImpactWins,
        sparkingComboCount: stats.sparkingComboCount,
        formChangeHistory: formChangeHistory,
        formChangeCount: formChangeCount,
        perFormStats: perFormStatsForMatch, // Store per-form stats with each match
        position: charPosition,
        won: won,
        fileName: fileName
      });
      
      // Track all forms used
      if (originalForm) {
        charData.allFormsUsed.add(originalForm);
      }
      if (Array.isArray(char.formChangeHistory) && char.formChangeHistory.length > 0) {
        char.formChangeHistory.forEach(form => {
          charData.allFormsUsed.add(form.key);
        });
      }
      
      // Aggregate per-form stats from stored per-match form data
      if (perFormStatsForMatch && Array.isArray(perFormStatsForMatch)) {
        // Aggregate each form's stats
        perFormStatsForMatch.forEach(formStat => {
          const formId = formStat.formId;
          const formName = charMap[formId] || formId;
          
          if (!charData.formStats[formId]) {
            charData.formStats[formId] = {
              formId: formId,
              formNumber: formStat.formNumber,
              name: formName,
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
          
          const formData = charData.formStats[formId];
          
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

    // Phase 3: Apply fusion stat splits — reduce trigger char by half, credit half to partner
    for (const adj of pendingFusionAdjustments) {
      const { triggerAggKey, partnerAggKey, fusionFormId, fusionContribution: fc, hasAdditionalCounts } = adj;
      const half = 0.5;

      const triggerData = characterStats[triggerAggKey];
      if (triggerData) {
        applyFusionToCharData(triggerData, fc, -half, hasAdditionalCounts);
        const tm = triggerData.matches[triggerData.matches.length - 1];
        if (tm) applyFusionToMatchEntry(tm, fc, -half);
        triggerData.hasFusionStats = true;
        triggerData.fusionFormsInvolved.add(fusionFormId);
      }

      const partnerData = characterStats[partnerAggKey];
      if (partnerData) {
        const partnerLastMatch = partnerData.matches[partnerData.matches.length - 1];
        const partnerWasInactive = !partnerLastMatch || (partnerLastMatch.battleTime || 0) === 0;
        applyFusionToCharData(partnerData, fc, half, hasAdditionalCounts);
        if ((fc.battleTime || 0) > 0 && partnerWasInactive) {
          partnerData.activeMatchCount += 1;
        }
        if (partnerLastMatch) applyFusionToMatchEntry(partnerLastMatch, fc, half);
        partnerData.allFormsUsed.add(fusionFormId);
        partnerData.hasFusionStats = true;
        partnerData.fusionFormsInvolved.add(fusionFormId);
      }
    }
  }

  files.forEach(file => {
    if (file.error) return;
    
    const fileName = file.name || file.fileName || '';
    let characterRecord, characterIdRecord, teams, battleWinLose, mapId;
    
    // Handle TeamBattleResults format (current BR_Data structure)
    if (file.content.TeamBattleResults) {
      teams = file.content.TeamBattleResults.teams;
      // Check for battleResult (lowercase r)
      if (file.content.TeamBattleResults.battleResult) {
        characterRecord = file.content.TeamBattleResults.battleResult.characterRecord;
        characterIdRecord = file.content.TeamBattleResults.battleResult.characterIdRecord;
        battleWinLose = file.content.TeamBattleResults.battleResult.battleWinLose;
        mapId = file.content.TeamBattleResults.battleResult.originalMap?.key;
      }
      // Check for BattleResults (capital R) - Cinema files format
      else if (file.content.TeamBattleResults.BattleResults) {
        characterRecord = file.content.TeamBattleResults.BattleResults.characterRecord;
        characterIdRecord = file.content.TeamBattleResults.BattleResults.characterIdRecord;
        battleWinLose = file.content.TeamBattleResults.BattleResults.battleWinLose;
        mapId = file.content.TeamBattleResults.BattleResults.originalMap?.key;
      }
      // Check if data is directly in TeamBattleResults (new wrapper format)
      else if (file.content.TeamBattleResults.characterRecord) {
        characterRecord = file.content.TeamBattleResults.characterRecord;
        characterIdRecord = file.content.TeamBattleResults.characterIdRecord;
        battleWinLose = file.content.TeamBattleResults.battleWinLose;
        mapId = file.content.TeamBattleResults.originalMap?.key;
      }
    }
    // Handle new format with teams array at the top
    else if (file.content.teams && Array.isArray(file.content.teams)) {
      // Process all teams in the array
      file.content.teams.forEach(team => {
        let teamCharRecord, teamCharIdRecord;
        
        if (team.BattleResults) {
          teamCharRecord = team.BattleResults.characterRecord;
          teamCharIdRecord = team.BattleResults.characterIdRecord;
        } else if (team.characterRecord) {
          teamCharRecord = team.characterRecord;
          teamCharIdRecord = team.characterIdRecord;
        }
        
        if (teamCharRecord) {
          // Extract battleWinLose for team format
          let teamBattleWinLose;
          let teamMapId;
          if (team.BattleResults) {
            teamBattleWinLose = team.BattleResults.battleWinLose;
            teamMapId = team.BattleResults.originalMap?.key;
          }
          processCharacterRecord(teamCharRecord, teamCharIdRecord, file.content.teams, fileName, teamBattleWinLose, teamMapId);
        }
      });
      return; // Already processed all teams
    }
    // Handle standard format with BattleResults at root
    else if (file.content.BattleResults) {
      characterRecord = file.content.BattleResults.characterRecord;
      characterIdRecord = file.content.BattleResults.characterIdRecord;
      battleWinLose = file.content.BattleResults.battleWinLose;
      mapId = file.content.BattleResults.originalMap?.key;
      teams = file.content.teams;
    } 
    // Handle legacy format with direct properties
    else {
      characterRecord = file.content.characterRecord;
      characterIdRecord = file.content.characterIdRecord;
      battleWinLose = file.content.battleWinLose;
      mapId = file.content.originalMap?.key;
      teams = file.content.teams;
    }
    
    if (!characterRecord) return;
    
    processCharacterRecord(characterRecord, characterIdRecord, teams, fileName, battleWinLose, mapId);
  });
  
  // Calculate averages and format form history
  return Object.values(characterStats).map(char => {
    const allForms = Array.from(char.allFormsUsed);
    const formHistory = allForms.length > 1 ? 
      allForms.map(f => charMap[f] || f).join(', ') : '';
    
    // Convert objects to arrays and find most common team and AI strategy
    const teamsArray = Object.keys(char.teamsUsed);
    const aiStrategiesArray = Object.keys(char.aiStrategiesUsed);
    const mapsArray = Object.keys(char.mapsUsed);
    
    // Find most commonly used team (highest count)
    const primaryTeam = teamsArray.length > 0 
      ? teamsArray.reduce((a, b) => char.teamsUsed[a] > char.teamsUsed[b] ? a : b)
      : null;
    
    // Find most commonly used AI strategy (highest count)
    const primaryAIStrategy = aiStrategiesArray.length > 0
      ? aiStrategiesArray.reduce((a, b) => char.aiStrategiesUsed[a] > char.aiStrategiesUsed[b] ? a : b)
      : null;
    
    // Find most commonly used map (highest count)
    const primaryMap = mapsArray.length > 0
      ? mapsArray.reduce((a, b) => char.mapsUsed[a] > char.mapsUsed[b] ? a : b)
      : null;
    
    // Find most common position (1=Starter, 2=Middle, 3=Anchor)
    const positionCounts = { 1: 0, 2: 0, 3: 0 };
    char.matches.forEach(m => { if (m.position) positionCounts[m.position] = (positionCounts[m.position] || 0) + 1; });
    const primaryPositionNum = [1, 2, 3].reduce((best, p) => positionCounts[p] > positionCounts[best] ? p : best, 1);
    const primaryPosition = positionCounts[1] === 0 && positionCounts[2] === 0 && positionCounts[3] === 0
      ? null
      : primaryPositionNum === 1 ? 'Starter' : primaryPositionNum === 2 ? 'Middle' : 'Anchor';
    
    // Calculate averages for per-form stats
    const formStatsArray = Object.values(char.formStats).map(formStat => {
      const matchCount = formStat.matchCount || 1;
      const damagePerSecond = (formStat.totalBattleTime || 0) > 0 
        ? (formStat.totalDamageDone || 0) / formStat.totalBattleTime 
        : 0;
      const damageEfficiency = (formStat.totalDamageTaken || 0) > 0
        ? (formStat.totalDamageDone || 0) / formStat.totalDamageTaken
        : ((formStat.totalDamageDone || 0) > 0 ? 999 : 0);
      
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
        // Derived stats
        damagePerSecond,
        damageEfficiency,
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
    
    return {
      ...char,
      formHistory,
      formStatsArray,
      hasMultipleForms: allForms.length > 1,
      hasFusionStats: char.hasFusionStats || false,
      fusionFormsInvolved: Array.from(char.fusionFormsInvolved || []),
      teamsUsed: teamsArray,
      aiStrategiesUsed: aiStrategiesArray,
      mapsUsed: mapsArray,
      primaryTeam,
      primaryAIStrategy,
      primaryMap,
      primaryPosition,
      // Use activeMatchCount (non-zero battleTime) for all averages when available
      _activeMatches: char.activeMatchCount || 0,
      avgDamage: Math.round(char.totalDamage / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)),
      avgTaken: Math.round(char.totalTaken / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)),
      avgHealth: Math.round(char.totalHealth / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)),
      avgBattleTime: Math.round((char.totalBattleTime / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
      avgHPGaugeValueMax: Math.round(char.totalHPGaugeValueMax / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)),
  avgSpecial: Math.round((char.totalSpecial / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
      avgSkills: Math.round((char.totalSkills / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
      avgKills: Math.round((char.totalKills / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 100) / 100,
      // Survival & Health averages
      survivalRate: Math.round((char.survivalCount / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 1000) / 10, // % of matches survived
      avgSparking: Math.round((char.totalSparking / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 100) / 100,
      avgCharges: Math.round((char.totalCharges / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
      avgGuards: Math.round((char.totalGuards / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
      avgEnergyBlasts: Math.round((char.totalEnergyBlasts / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
      avgZCounters: Math.round((char.totalZCounters / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 100) / 100,
      avgSuperCounters: Math.round((char.totalSuperCounters / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 100) / 100,
      avgRevengeCounters: Math.round((char.totalRevengeCounters / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 100) / 100,
      avgTags: Math.round((char.totalTags / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 100) / 100,
      avgTransformations: Math.round((char.totalTransformations / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 100) / 100,
      // Special Abilities - NEW blast tracking averages
      avgS1Blast: Math.round((char.totalS1Blast / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 100) / 100,
      avgS2Blast: Math.round((char.totalS2Blast / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 100) / 100,
      avgUltBlast: Math.round((char.totalUltBlast / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 100) / 100,
      avgS1Hit: Math.round((char.totalS1HitBlast / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 100) / 100,
      avgS2Hit: Math.round((char.totalS2HitBlast / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 100) / 100,
      avgUltHit: Math.round((char.totalULTHitBlast / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 100) / 100,
      // Hit rates (overall across all matches) - calculated from trackable throws only, null if no trackable data
      s1HitRateOverall: char.totalS1BlastTrackable > 0 ? Math.round((char.totalS1HitBlast / char.totalS1BlastTrackable) * 1000) / 10 : null,
      s2HitRateOverall: char.totalS2BlastTrackable > 0 ? Math.round((char.totalS2HitBlast / char.totalS2BlastTrackable) * 1000) / 10 : null,
      ultHitRateOverall: char.totalUltBlastTrackable > 0 ? Math.round((char.totalULTHitBlast / char.totalUltBlastTrackable) * 1000) / 10 : null,
      
      
      // Special Abilities - Legacy blast tracking (kept for backwards compatibility, now using new values)
    avgSPM1: Math.round((char.totalS1Blast / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 100) / 100,
  avgSPM2: Math.round((char.totalS2Blast / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 100) / 100,
  avgEXA1: Math.round((char.totalEXA1 / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 100) / 100,
  avgEXA2: Math.round((char.totalEXA2 / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 100) / 100,
  avgUltimates: Math.round((char.totalUltimates / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 100) / 100,
  avgDragonDashMileage: Math.round((char.totalDragonDashMileage / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
  avgMaxComboDamage: Math.round(char.maxComboDamageTotal / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)),
  avgThrows: Math.round((char.totalThrows / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 100) / 100,
  avgLightningAttacks: Math.round((char.totalLightningAttacks / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 100) / 100,
  avgVanishingAttacks: Math.round((char.totalVanishingAttacks / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 100) / 100,
  avgDragonHoming: Math.round((char.totalDragonHoming / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 100) / 100,
  avgSpeedImpacts: Math.round((char.totalSpeedImpacts / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 100) / 100,
  avgSpeedImpactWins: Math.round((char.totalSpeedImpactWins / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 100) / 100,
  avgSparkingCombo: Math.round((char.totalSparkingCombo / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
  // Build & Equipment averages
  avgCapsuleCost: Math.round(char.totalCapsuleCost / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)),
  // Build-type cost averages (new 7-category system)
  avgMeleeCost: Math.round((char.totalMeleeCost / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
  avgBlastCost: Math.round((char.totalBlastCost / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
  avgKiBlastCost: Math.round((char.totalKiBlastCost / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
  avgDefenseCost: Math.round((char.totalDefenseCost / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
  avgSkillCost: Math.round((char.totalSkillCost / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
  avgKiEfficiencyCost: Math.round((char.totalKiEfficiencyCost / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
  avgUtilityCost: Math.round((char.totalUtilityCost / (char.activeMatchCount > 0 ? char.activeMatchCount : char.matchCount)) * 10) / 10,
      // Most used build composition (new 7-category system)
      primaryBuildComposition: Object.keys(char.buildCompositions).length > 0
        ? Object.keys(char.buildCompositions).reduce((a, b) => 
            char.buildCompositions[a] > char.buildCompositions[b] ? a : b)
        : 'No Build',
      // Most used capsules (top 7)
      topCapsules: Object.values(char.capsuleUsage)
        .sort((a, b) => b.count - a.count)
        .slice(0, 7)
        .map(c => ({ id: c.id, name: c.name, usage: c.count }))
    };
  }).map(char => {
    // Calculate top 3 most used builds (similar to Team Rankings implementation)
    const buildGroups = {};
    
    // Group matches by exact capsule loadout + AI strategy so different capsule sets are tracked separately
    char.matches.forEach(match => {
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
        const damageEfficiency = build.totalDamageTaken > 0 
          ? build.totalDamageDealt / build.totalDamageTaken 
          : build.totalDamageDealt;
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
    
    // Calculate combat performance score
    const avgDamage = char.avgDamage;
    const avgTaken = char.avgTaken;
    const avgBattleTime = char.avgBattleTime;
    // Use total-based efficiency calculation (aggregate then calculate)
    const damageEfficiency = char.totalTaken > 0 ? char.totalDamage / char.totalTaken : char.totalDamage;
    // Use total-based DPS calculation (total damage / total time) - same as build calculation
    const damagePerSecond = char.totalBattleTime > 0 ? char.totalDamage / char.totalBattleTime : 0;
    const healthRetention = char.avgHPGaugeValueMax > 0 ? char.avgHealth / char.avgHPGaugeValueMax : 0;
    
    // Base performance score (normalized metrics)
    const baseScore = (
      (avgDamage / 100000) * 35 +        // Damage dealt weight: 35%
      (damageEfficiency) * 25 +          // Damage efficiency weight: 25%
      (damagePerSecond / 1000) * 25 +    // Damage per second weight: 25%
      (healthRetention) * 15             // Health retention weight: 15%
    );
    
    // Experience multiplier based on matches played (1.0 to 1.25x, maxed at 12 matches)
    // Characters with more matches get slightly higher weight
  // Use active matches (non-zero battleTime) for experience weighting when available
  const experienceMatches = (char.activeMatchCount && char.activeMatchCount > 0) ? char.activeMatchCount : char.matchCount;
  const experienceMultiplier = Math.min(1.25, 1.0 + (experienceMatches - 1) * (0.25 / 11));
    
    // Final combat performance score
    const combatPerformanceScore = baseScore * experienceMultiplier;
    
    // Calculate win rate from matches array
  // For win rate, prefer counting only active matches (non-zero battleTime)
  const totalMatches = char.matches ? char.matches.length : char.matchCount;
  const activeMatches = char.matches ? char.matches.filter(m => m.battleTime && m.battleTime > 0) : [];
  const winsActive = activeMatches.length > 0 ? activeMatches.filter(m => m.won).length : (char.matches ? char.matches.filter(m => m.won).length : 0);
  const winRate = activeMatches.length > 0 ? Math.round((winsActive / activeMatches.length) * 1000) / 10 : (totalMatches > 0 ? Math.round(((char.matches ? char.matches.filter(m => m.won).length : 0) / totalMatches) * 1000) / 10 : 0);
    
    // Calculate wins and losses
    const totalWins = char.matches ? char.matches.filter(m => m.won).length : 0;
    const totalLosses = char.matches ? char.matches.filter(m => !m.won).length : 0;
    
    // Calculate speed impact win rate (wins / impacts * 100)
    const speedImpactWinRate = char.totalSpeedImpacts > 0 
      ? Math.round((char.totalSpeedImpactWins / char.totalSpeedImpacts) * 1000) / 10 
      : 0;
    
    return {
      ...char,
      dps: Math.round(damagePerSecond * 10) / 10, // Add DPS field
      efficiency: Math.round(damageEfficiency * 100) / 100, // Add efficiency field
      hpRetention: Math.round(healthRetention * 1000) / 10, // Add HP retention % field
      combatPerformanceScore: Math.round(combatPerformanceScore * 100) / 100,
      winRate: winRate, // Add win rate % field
      wins: totalWins, // Add total wins
      losses: totalLosses, // Add total losses
      speedImpactWinRate: speedImpactWinRate, // Add speed impact win rate % field
      topBuilds: topBuilds // Add top 3 most used builds
    };
  }).sort((a, b) => {
    // Primary sort: Combat performance score (descending)
    if (Math.abs(b.combatPerformanceScore - a.combatPerformanceScore) > 0.1) {
      return b.combatPerformanceScore - a.combatPerformanceScore;
    }
    // Secondary sort: Average damage (descending) for very close scores
    if (Math.abs(b.avgDamage - a.avgDamage) > 1000) {
      return b.avgDamage - a.avgDamage;
    }
    // Tertiary sort: Match count (descending) for nearly identical performance
    return b.matchCount - a.matchCount;
  });
}
