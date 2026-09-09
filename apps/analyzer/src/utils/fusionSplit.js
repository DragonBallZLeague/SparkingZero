import transformationsData from '../../../../referencedata/transformations.json';

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

// Computes per-character stat deltas for a single match due to fusion splits.
// Returns Map<originalFormId, statDelta> where trigger character gets negative deltas
// (fusion contribution subtracted × 0.5) and partner gets positive deltas (× 0.5).
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

      const fc = {
        damageDone: (totBattle.givenDamage || 0) - (snapBattle.givenDamage || 0),
        damageTaken: (totBattle.takenDamage || 0) - (snapBattle.takenDamage || 0),
        battleTime: parseDur(totBattle.battleTime) - parseDur(snapBattle.battleTime),
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
      deltas.set(originalForm, accumulate(deltas.get(originalForm), -0.5));
      deltas.set(partnerOriginalId, accumulate(deltas.get(partnerOriginalId), 0.5));
      break;
    }
  });
  return deltas;
}
