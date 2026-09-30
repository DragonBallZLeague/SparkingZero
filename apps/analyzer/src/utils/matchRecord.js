import { getTeams, extractStats, calculateMatchPerformanceScore } from './statCalculations.js';
import { computeMatchFusionDeltas, applyFusionSplit } from './fusionSplit.js';
import { sharedFormSnapshots } from './formBreakdown.js';

/**
 * One match file, read once for every view that shows a match: the Matches
 * list (matchSummary, cheap: who played, who won, where) and the Match page
 * (readMatch: every character's numbers, with the fusion rule applied).
 *
 * Match files come in a few shapes (the current TeamBattleResults wrapper, a
 * top-level teams array, older BattleResults roots); battleDataOf() finds the
 * battle data in any of them, as the old single-match viewer did.
 *
 * Side 1 is the file's first team (its "Allies" and １Ｐ keys) and battleWinLose
 * is side 1's result: "Win" means side 1 won.
 *
 * No React, so a verifier can import it.
 */

const pick = o => (o && o.characterRecord ? {
  battleWinLose: o.battleWinLose || null,
  characterRecord: o.characterRecord,
  characterIdRecord: o.characterIdRecord || null,
  mapId: (o.originalMap && o.originalMap.key) || null,
} : null);

/** A match file's battle data: { battleWinLose, characterRecord, characterIdRecord, mapId }, or null. */
export function battleDataOf(content) {
  if (!content || typeof content !== 'object') return null;
  const tbr = content.TeamBattleResults;
  if (tbr && typeof tbr === 'object') return pick(tbr.battleResult) || pick(tbr.BattleResults) || pick(tbr);
  if (Array.isArray(content.teams) && content.teams.length) {
    const t = content.teams[0];
    return pick(t && t.BattleResults) || pick(t);
  }
  return pick(content.BattleResults) || pick(content) || search(content, 0);
}

// The last resort for an unfamiliar shape: the first nested object that holds
// a characterRecord.
function search(o, depth) {
  if (!o || typeof o !== 'object' || depth > 5) return null;
  for (const v of Object.values(o)) {
    const found = pick(v) || search(v, depth + 1);
    if (found) return found;
  }
  return null;
}

/** A match file's two team tags, [first, second]; either may be null. */
export function teamsOf(content) {
  const c = content || {};
  const list = (c.TeamBattleResults && c.TeamBattleResults.teams) || c.teams || (c.BattleResults && c.BattleResults.teams);
  if (!Array.isArray(list)) return [null, null];
  const tag = t => (typeof t === 'string' ? t : t && t.teamName) || null;
  return [tag(list[0]), tag(list[1])];
}

/** The lineup slot a record key holds: 1 for the Starter, then each member in turn. */
export function slotOfKey(key) {
  const k = String(key || '');
  if (k.includes('１Ｐ') || k.includes('２Ｐ')) return 1;
  const m = k.match(/Member(\d+)/);
  return m ? Number(m[1]) + 1 : 99;
}

/** Starter (1), Middle (2) or Anchor (3), for a slot in a lineup of `size`. */
export const positionOfSlot = (slot, size) => (slot === 1 ? 1 : slot === size ? 3 : 2);

const winnerOf = battleWinLose => (battleWinLose === 'Win' ? 1 : battleWinLose === 'Lose' ? 2 : null);
const idOf = rec => {
  const play = (rec && rec.battlePlayCharacter) || {};
  return (play.originalCharacter && play.originalCharacter.key) || (play.character && play.character.key) || null;
};

/**
 * What the Matches list needs, without computing anyone's stats:
 * { teams, winner (1 | 2 | null), mapId, map, size, sides: [{ side, tag, won,
 * lineup: [{ id, name, slot }] }] }, or null when the file holds no battle.
 */
export function matchSummary(content, { charMap = {}, mapsMap = {} } = {}) {
  const bd = battleDataOf(content);
  if (!bd) return null;
  const teams = teamsOf(content);
  const winner = winnerOf(bd.battleWinLose);
  const { p1, p2 } = getTeams(bd.characterRecord);
  const sides = [p1, p2].map((recs, i) => ({
    side: i + 1,
    tag: teams[i],
    won: winner ? winner === i + 1 : null,
    lineup: recs.map(r => {
      const id = idOf(r);
      return { id, name: charMap[id] || id || '?', slot: slotOfKey(r._key) };
    }).sort((a, b) => a.slot - b.slot),
  }));
  return {
    teams,
    winner,
    mapId: bd.mapId,
    map: (bd.mapId && mapsMap[bd.mapId]) || null,
    size: Math.max(sides[0].lineup.length, sides[1].lineup.length),
    sides,
  };
}

/**
 * Everything the Match page shows: matchSummary() plus, for each side, every
 * character's extractStats() with its share of any fusion (THE FUSION RULE,
 * utils/fusionSplit.js), its score for the match (the same formula as a
 * character's overall score, at one match), and team totals. Characters are in
 * lineup order, each with `slot` and `position` (1 Starter, 2 Middle, 3 Anchor).
 */
export function readMatch(content, { charMap = {}, capsuleMap = {}, aiStrategies = {}, mapsMap = {} } = {}) {
  const summary = matchSummary(content, { charMap, mapsMap });
  if (!summary) return null;
  const bd = battleDataOf(content);
  const deltas = computeMatchFusionDeltas(bd.characterRecord, bd.characterIdRecord);
  const shared = sharedFormSnapshots(bd.characterRecord);
  const { p1, p2 } = getTeams(bd.characterRecord);
  const sides = [p1, p2].map((recs, i) => {
    const size = recs.length;
    const characters = recs.map(rec => {
      const slot = slotOfKey(rec._key);
      const position = positionOfSlot(slot, size);
      const stats = applyFusionSplit(extractStats(rec, charMap, capsuleMap, position, aiStrategies), rec, deltas);
      return {
        key: rec._key,
        slot,
        position,
        id: idOf(rec),
        name: stats.name,
        stats,
        score: calculateMatchPerformanceScore(stats),
        played: (stats.battleTime || 0) > 0,
        record: rec,
        // Its per-form snapshots are another fighter's too (utils/formBreakdown.js).
        formSnapshotShared: shared.has(rec._key),
      };
    }).sort((a, b) => a.slot - b.slot);
    const sum = k => characters.reduce((s, c) => s + (c.stats[k] || 0), 0);
    return {
      ...summary.sides[i],
      characters,
      totals: {
        damage: sum('damageDone'),
        taken: sum('damageTaken'),
        hp: sum('hPGaugeValue'),
        hpMax: sum('hPGaugeValueMax'),
        kills: sum('kills'),
        time: sum('battleTime'),
      },
    };
  });
  return { ...summary, sides, characterIdRecord: bd.characterIdRecord };
}
