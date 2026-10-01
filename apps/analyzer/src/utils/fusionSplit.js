import transformationsData from '../../../../referencedata/transformations.json';
import { skillSlotUses, styleHits } from './actionCodes.js';

/**
 * THE FUSION RULE, for every per-character figure in the analyzer: when a
 * character fuses with a teammate (Goku Black -> Fused Zamasu with Zamasu),
 * everything it does from the fusion on is split half and half between it and
 * that partner. characterAggregation.js applies it inline (its totals and match
 * rows); every other aggregation - the team figures, positions, the match
 * viewer, the workbook's team matrix - calls computeMatchFusionDeltas() once
 * per match and applyFusionSplit() to each character's extractStats().
 *
 * A split stays on its side of the match: the same character can be on both
 * teams (both field Goku (Super); a team's test against itself), so deltas are
 * keyed by side and character.
 *
 * Every one of them reads the match's characterRecord through
 * withAbsorbedPartners() first: a file can leave the absorbed partner out, and
 * the partner still takes its half.
 */

/** 1 for the first team's record keys, 2 for the second's, 0 otherwise. */
export function sideOfRecordKey(key) {
  const k = String(key || '');
  if (k.includes('AlliesTeamMember') || k.includes('１Ｐ')) return 1;
  if (k.includes('EnemyTeamMember') || k.includes('２Ｐ')) return 2;
  return 0;
}
const deltaKey = (side, originalFormId) => `${side}:${originalFormId}`;

// Returns all character form IDs connected to startId via the transformsTo graph.
// fusionOf pairs are (index 0, index 1), (index 2, index 3). The canonical partner is
// at initiatorIdx ^ 1. This BFS finds all forms of that partner character so we can
// match any form they happen to be in on the team.
export function getFusionPartnerFamilyForms(startId, data) {
  const visited = new Set();
  const queue = [startId];
  while (queue.length > 0) {
    const id = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    const entry = data[id];
    if (entry?.transformsTo) {
      for (const nextId of entry.transformsTo) {
        if (!visited.has(nextId)) queue.push(nextId);
      }
    }
  }
  return visited;
}

/**
 * A record withAbsorbedPartners() adds is keyed by its side and no lineup slot
 * ("AlliesTeamMember_Absorbed_0810_00"): every side check finds it, and every
 * slot count must skip it (isAbsorbedKey), or the last real member stops being
 * the Anchor.
 */
const ABSORBED_TAG = '_Absorbed_';
export const isAbsorbedKey = key => String(key || '').includes(ABSORBED_TAG);

/**
 * The match's characterRecord, with a record for every fusion partner the file
 * leaves out, so THE FUSION RULE can give it its half.
 *
 * The AI always fuses with a partner still on the bench, so the partner never
 * fights as itself. The game writes it a record two times in three: no battle
 * time, nothing done, knocked out, `bFusionPotara: true` (the 20 records with
 * that flag are exactly the absorbed partners). The other times it writes none
 * (12 of the 32 fusions in the corpus, 2026-09-30, 11 of them Goku Black ->
 * Fused Zamasu), and the split used to be skipped there: the initiator kept the
 * fusion's whole output and the partner had no appearance.
 *
 * The added record is the one the game writes, with what the file cannot say
 * left out: no capsules and no AI (`unrecorded: true`; the Builds tables skip
 * it), no lineup slot (ABSORBED_TAG), and half of the fusion's HP left, as the
 * game records it for most surviving fusions. The partner is the fusion's
 * listed form (fusionOf), the form it would be fielded in. Returns
 * `characterRecord` itself when nothing is missing.
 */
export function withAbsorbedPartners(characterRecord) {
  if (!characterRecord || typeof characterRecord !== 'object') return characterRecord;
  const added = {};
  const onSide = side => new Set(Object.entries({ ...characterRecord, ...added })
    .filter(([k]) => sideOfRecordKey(k) === side)
    .map(([, c]) => c?.battlePlayCharacter?.originalCharacter?.key)
    .filter(Boolean));

  for (const [key, char] of Object.entries(characterRecord)) {
    const side = sideOfRecordKey(key);
    const original = char?.battlePlayCharacter?.originalCharacter?.key;
    if (!side || !original || !Array.isArray(char.formChangeHistory) || !char.formChangeHistory.length) continue;
    const chain = [original, ...char.formChangeHistory.map(f => f.key)];
    for (let i = 1; i < chain.length; i++) {
      const parts = transformationsData[chain[i]]?.fusionOf;
      const at = parts ? parts.indexOf(chain[i - 1]) : -1;
      if (at === -1) continue;
      const partner = parts[at ^ 1];
      const family = getFusionPartnerFamilyForms(partner, transformationsData);
      const team = onSide(side);
      if (partner && ![...family].some(id => team.has(id))) {
        const play = char.battlePlayCharacter || {};
        added[`(Key="${side === 1 ? 'Allies' : 'Enemy'}TeamMember${ABSORBED_TAG}${partner}")`] = {
          unrecorded: true,
          battlePlayCharacter: {
            character: { key: partner },
            originalCharacter: { key: partner },
            hPGaugeValue: (play.hPGaugeValue || 0) / 2,
            hPGaugeValueMax: play.hPGaugeValueMax || 0,
            bFusionPotara: true,
            bKnockDown: true,
            bRingOut: false,
            equipItem: [],
          },
          battleCount: {
            givenDamage: 0, takenDamage: 0, battleTime: '+00000000.00:00:00.000000000',
            killCount: 0, maxComboNum: 0, maxComboDamage: 0, dragonDashMileage: 0, battleNumCount: {},
          },
          ...(char.additionalCounts !== undefined ? {
            additionalCounts: { s1Blast: 0, s2Blast: 0, ultBlast: 0, s1HitBlast: 0, s2HitBlast: 0, uLTHitBlast: 0, tags: 0 },
          } : {}),
          formChangeHistory: [],
        };
      }
      break; // only the first fusion in the chain is the character's
    }
  }
  return Object.keys(added).length ? { ...characterRecord, ...added } : characterRecord;
}

// Computes per-character stat deltas for a single match due to fusion splits.
// Returns Map<"side:originalFormId", statDelta> where trigger character gets negative deltas
// (fusion contribution subtracted × 0.5) and partner gets positive deltas (× 0.5).
// Read it through applyFusionSplit().
export function computeMatchFusionDeltas(characterRecord, characterIdRecord) {
  const deltas = new Map();
  if (!characterRecord || !characterIdRecord) return deltas;

  const parseDur = str => {
    if (!str) return 0;
    const m = str.match(/\+\d+\.(\d+):(\d+):(\d+)\./);
    return m ? parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]) : 0;
  };

  // Phase 1: Build per-team sets of originalFormIds
  const allyOriginalIds = new Set();
  const enemyOriginalIds = new Set();
  Object.keys(characterRecord).forEach(k => {
    const c = characterRecord[k];
    const origId = c.battlePlayCharacter?.originalCharacter?.key;
    if (!origId) return;
    if (k.includes('AlliesTeamMember') || k.includes('１Ｐ')) allyOriginalIds.add(origId);
    else if (k.includes('EnemyTeamMember') || k.includes('２Ｐ')) enemyOriginalIds.add(origId);
  });

  // Phase 2: Detect fusions via full transformation chain and compute contribution
  Object.keys(characterRecord).forEach(key => {
    const char = characterRecord[key];
    const originalForm = char.battlePlayCharacter?.originalCharacter?.key;
    if (!originalForm || !Array.isArray(char.formChangeHistory) || char.formChangeHistory.length === 0) return;
    const isTeam1 = key.includes('AlliesTeamMember') || key.includes('１Ｐ');
    const isTeam2 = key.includes('EnemyTeamMember') || key.includes('２Ｐ');
    if (!isTeam1 && !isTeam2) return;
    const sameTeamSet = isTeam1 ? allyOriginalIds : enemyOriginalIds;
    const side = isTeam1 ? 1 : 2;

    const formChain = [originalForm, ...char.formChangeHistory.map(f => f.key)];
    for (let i = 1; i < formChain.length; i++) {
      const fusionFormId = formChain[i];
      const fusionOfList = transformationsData[fusionFormId]?.fusionOf;
      if (!fusionOfList) continue;
      const precedingForm = formChain[i - 1];
      const initiatorIdx = fusionOfList.indexOf(precedingForm);
      if (initiatorIdx === -1) continue;

      // Pairs are (index 0,1), (index 2,3) — canonical partner is at initiatorIdx ^ 1.
      // BFS the transformsTo graph from that canonical partner to find all forms of that
      // character so we can match whichever form they happen to be in on the team.
      const canonicalPartnerId = fusionOfList[initiatorIdx ^ 1];
      const partnerFamilyForms = getFusionPartnerFamilyForms(canonicalPartnerId, transformationsData);
      const partnerOriginalId = [...partnerFamilyForms].find(id => sameTeamSet.has(id));
      if (!partnerOriginalId) break;

      const snapKey = characterIdRecord[precedingForm] ? precedingForm : `(Key="${precedingForm}")`;
      const preSnap = characterIdRecord[snapKey] || null;
      if (!preSnap) break;

      const totBattle = char.battleCount || {};
      const snapBattle = preSnap.battleCount || {};
      const totNum = totBattle.battleNumCount || {};
      const snapNum = snapBattle.battleNumCount || {};
      const totAdd = char.additionalCounts || {};
      const snapAdd = preSnap.additionalCounts || {};
      const totSkills = skillSlotUses(totBattle.runBlastCount);
      const snapSkills = skillSlotUses(snapBattle.runBlastCount);
      const totHits = totBattle.styleHits || styleHits(totBattle.attackHitCount);
      const snapHits = snapBattle.styleHits || styleHits(snapBattle.attackHitCount);

      // The same contribution characterAggregation.js computes inline.
      const fc = {
        damageDone: (totBattle.givenDamage || 0) - (snapBattle.givenDamage || 0),
        damageTaken: (totBattle.takenDamage || 0) - (snapBattle.takenDamage || 0),
        battleTime: parseDur(totBattle.battleTime) - parseDur(snapBattle.battleTime),
        kills: (totBattle.killCount || 0) - (snapBattle.killCount || 0),
        specialMovesUsed: (totNum.sPMCount || 0) - (snapNum.sPMCount || 0),
        ultimatesUsed: (totNum.uLTCount || 0) - (snapNum.uLTCount || 0),
        // Skill 1 + Skill 2 from runBlastCount, never eXACount (docs/ACTION_CODES.md).
        skillsUsed: (totSkills.exa1 + totSkills.exa2) - (snapSkills.exa1 + snapSkills.exa2),
        exa1Count: totSkills.exa1 - snapSkills.exa1,
        exa2Count: totSkills.exa2 - snapSkills.exa2,
        rushHits: totHits.rush - snapHits.rush,
        heavyHits: totHits.heavy - snapHits.heavy,
        kiBlastHits: totHits.kiblast - snapHits.kiblast,
        sparkingCount: (totNum.sparkingCount || 0) - (snapNum.sparkingCount || 0),
        chargeCount: (totNum.chargeCount || 0) - (snapNum.chargeCount || 0),
        guardCount: (totNum.guardCount || 0) - (snapNum.guardCount || 0),
        shotEnergyBulletCount: (totNum.shotEnergyBulletCount || 0) - (snapNum.shotEnergyBulletCount || 0),
        zCounterCount: (totNum.zCounter || 0) - (snapNum.zCounter || 0),
        superCounterCount: (totNum.superCounterCount || 0) - (snapNum.superCounterCount || 0),
        revengeCounterCount: (totNum.revengeCounter || 0) - (snapNum.revengeCounter || 0),
        s1Blast: (totAdd.s1Blast || 0) - (snapAdd.s1Blast || 0),
        s2Blast: (totAdd.s2Blast || 0) - (snapAdd.s2Blast || 0),
        ultBlast: (totAdd.ultBlast || 0) - (snapAdd.ultBlast || 0),
        s1HitBlast: (totAdd.s1HitBlast || 0) - (snapAdd.s1HitBlast || 0),
        s2HitBlast: (totAdd.s2HitBlast || 0) - (snapAdd.s2HitBlast || 0),
        uLTHitBlast: (totAdd.uLTHitBlast || 0) - (snapAdd.uLTHitBlast || 0),
        tags: (totAdd.tags || 0) - (snapAdd.tags || 0),
        dragonDashMileage: (totBattle.dragonDashMileage || 0) - (snapBattle.dragonDashMileage || 0),
        throwCount: (totNum.throwCount || 0) - (snapNum.throwCount || 0),
        lightningAttackCount: (totNum.lightningAttack || 0) - (snapNum.lightningAttack || 0),
        vanishingAttackCount: (totNum.vanishingAttack || 0) - (snapNum.vanishingAttack || 0),
        dragonHomingCount: (totNum.dragonHoming || 0) - (snapNum.dragonHoming || 0),
        speedImpactCount: (totNum.speedImpactCount || 0) - (snapNum.speedImpactCount || 0),
        speedImpactWins: (totNum.speedImpactWinCount || 0) - (snapNum.speedImpactWinCount || 0),
        sparkingComboCount: (totNum.sparkingComboCount || 0) - (snapNum.sparkingComboCount || 0),
      };

      // Accumulate scaled contribution: trigger loses half, partner gains half
      const accumulate = (existing, mult) => {
        const result = {};
        for (const k of Object.keys(fc)) {
          result[k] = (existing ? (existing[k] || 0) : 0) + fc[k] * mult;
        }
        return result;
      };
      const triggerKey = deltaKey(side, originalForm);
      const partnerKey = deltaKey(side, partnerOriginalId);
      deltas.set(triggerKey, accumulate(deltas.get(triggerKey), -0.5));
      deltas.set(partnerKey, accumulate(deltas.get(partnerKey), 0.5));
      break;
    }
  });
  return deltas;
}

/**
 * One character's extractStats() with its share of any fusion in the match.
 * `char` is its characterRecord entry and `recordKey` its key there (getTeams()
 * puts it on `_key`); `deltas` is computeMatchFusionDeltas() for the match.
 * Unchanged when the character took no part in a fusion. A hit count the file
 * does not track (null) stays null, so hit rates still skip it.
 */
export function applyFusionSplit(stats, char, deltas, recordKey = char && char._key) {
  const original = char && char.battlePlayCharacter && char.battlePlayCharacter.originalCharacter
    ? char.battlePlayCharacter.originalCharacter.key : null;
  const delta = original && deltas ? deltas.get(deltaKey(sideOfRecordKey(recordKey), original)) : null;
  if (!delta) return stats;
  const out = { ...stats, hasFusionStats: true };
  for (const [k, d] of Object.entries(delta)) {
    if (out[k] == null && !d) continue;
    out[k] = Math.max(0, (out[k] || 0) + d);
  }
  // The legacy names for the two supers' throws.
  if ('spm1Count' in out) out.spm1Count = out.s1Blast;
  if ('spm2Count' in out) out.spm2Count = out.s2Blast;
  return out;
}
