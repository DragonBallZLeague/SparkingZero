/**
 * Combat helpers the panels share (damage taken, outgoing combos, defense, formatting).
 * The stat engine itself is src/utils/engine.js.
 */

/**
 * Damage a hit deals after the target's defense and armor: the game rounds up once, after every
 * multiplier (measured 2026-10-08: 390 x 0.7905 x 0.9 = 277.47 shows as 278). The epsilon keeps
 * float noise such as 7.000000000000001 from rounding up a whole number.
 */
export function damageTaken(value, ...multipliers) {
  if (typeof value !== 'number') return value;
  return Math.ceil(multipliers.reduce((v, m) => v * m, value) - 1e-9);
}

/**
 * Light Body: the holder takes 10% less ki-blast damage (ki-blast defense multiplier - 0.10),
 * unless the attacker has Draconic Aura. See utils/specialCapsules.js.
 */
export function applyLightBodyKiBlastArmor(stats, hasLightBody, hasDraconicAura = false) {
  if (!stats || typeof stats.energy !== 'number') return stats;
  if (hasLightBody && !hasDraconicAura) {
    return { ...stats, energy: parseFloat((stats.energy - 0.10).toFixed(4)) };
  }
  return stats;
}

/**
 * Total damage of a full ki-blast volley (an unlimited count is shown as 20 shots).
 * In a combo each shot deals 5% of the first shot's damage less than the one before, down to 40%
 * from the 13th shot on (the game's ComboRushBulletDamageScalingCurve: 1.0 at shot 1, 0.4 at shot
 * 13, held after). Hits on armor are not a combo in the game, so against armor (or Light Body)
 * every shot deals full damage after defense and armor, unless the attacker has Draconic Aura.
 */
export function kiBlastVolley(stats, { opponentStats = null, opponentHasLightBody = false, attackerHasDraconicAura = false } = {}) {
  const base = stats?.kiBlastDmg ?? 0;
  let count = stats?.kiBlastLimit ?? 0;
  if (count >= 999) count = 20;
  const defense = opponentStats?.energy ?? 1;
  const oppArmor = opponentStats?.armor ?? 0;
  if (!attackerHasDraconicAura && (opponentHasLightBody || oppArmor > 0)) {
    const per = damageTaken(base, defense, oppArmor > 0 ? 1 - oppArmor : 1);
    return per * count;
  }
  const dmg = base * defense;
  let total = 0;
  for (let i = 0; i < count; i++) total += dmg * Math.max(0.4, 1 - i * 0.05);
  return Math.round(total);
}

// With no opponent, damage taken is measured against the reference attacker's 5-hit rush
// (meta.referenceAttacker, Goku (Z - Mid)); the engine puts its hits on every computed side.
const FALLBACK_HITS = [410, 410, 410, 567, 788];
const referenceHits = (stats) => stats?.referenceHits || FALLBACK_HITS;

/**
 * Calculates "5-Hit Damage Taken" for a character.
 * If opponentStats is provided, uses the opponent's hit values; otherwise uses Goku baseline.
 * Returns { total, hits } where hits is an array of { damage, armored } per hit.
 */
export function calcFiveHitDamageTaken(defenderStats, opponentStats = null, breakOnHit = 5) {
  if (!defenderStats) return null;
  const def = typeof defenderStats.meleeDefenseStat === 'number' ? defenderStats.meleeDefenseStat : 1;
  const opHits = opponentStats
    ? [
        typeof opponentStats.rush === 'number' ? opponentStats.rush : 0,
        typeof opponentStats.hit2 === 'number' ? opponentStats.hit2 : 0,
        typeof opponentStats.hit3 === 'number' ? opponentStats.hit3 : 0,
        typeof opponentStats.hit4 === 'number' ? opponentStats.hit4 : 0,
        typeof opponentStats.hit5 === 'number' ? opponentStats.hit5 : 0,
      ]
    : referenceHits(defenderStats);
  let total = 0;
  const hits = opHits.map((hit, i) => {
    const damage = damageTaken(hit, def);
    total += damage;
    return { damage };
  });
  return { total, hits };
}

/**
 * Calculates "5-Hit Damage Taken (w/ Armor)" for a character.
 * Armor applies to hits 1 through (breakOnHit - 1); hit breakOnHit breaks the armor.
 * breakOnHit=2 → only hit 1 is armored; breakOnHit=5 → hits 1-4 armored.
 * If opponentStats is provided, uses the opponent's hit values; otherwise uses Goku baseline.
 */
export function calcFiveHitArmorDamage(stats, breakOnHit = 5, opponentStats = null) {
  if (!stats) return null;
  const def = typeof stats.meleeDefenseStat === 'number' ? stats.meleeDefenseStat : 1;
  const armor = typeof stats.armor === 'number' ? stats.armor : 0;
  const opHits = opponentStats
    ? [
        typeof opponentStats.rush === 'number' ? opponentStats.rush : 0,
        typeof opponentStats.hit2 === 'number' ? opponentStats.hit2 : 0,
        typeof opponentStats.hit3 === 'number' ? opponentStats.hit3 : 0,
        typeof opponentStats.hit4 === 'number' ? opponentStats.hit4 : 0,
        typeof opponentStats.hit5 === 'number' ? opponentStats.hit5 : 0,
      ]
    : referenceHits(stats);
  let total = 0;
  opHits.forEach((hit, i) => {
    const hitNum = i + 1;
    const isArmored = hitNum < breakOnHit;
    total += damageTaken(hit, def, isArmored ? (1 - armor) : 1);
  });
  return total;
}

/**
 * Given your modified stats and the opponent's modified stats, compute outgoing
 * combo hit values after opponent's defenses. Returns per-hit info including
 * whether the hit is reduced by the opponent's armor.
 *
 * opponentStats: the opponent's computed (capsule+skill modified) stats
 * Returns: { rush, hit2, hit3, hit4, hit5, rush5Hit, perHit }
 *   perHit: array of { damage, armorReduced } for hits 1–5
 */
export function calcOutgoingCombo(yourStats, opponentStats) {
  if (!yourStats || !opponentStats) return null;
  const meleeDef = typeof opponentStats.meleeDefenseStat === 'number' ? opponentStats.meleeDefenseStat : 1;
  const oppArmor = typeof opponentStats.armor === 'number' ? opponentStats.armor : 0;
  // armorBreak: how many hits until armor breaks (from YOUR stats hitting the opponent)
  // armorBreak=3 means hits 1 and 2 are armored on the opponent
  const oppArmorBreak = typeof yourStats.armorBreak === 'number' ? yourStats.armorBreak : 999;

  const rawHits = [
    typeof yourStats.rush === 'number' ? yourStats.rush : 0,
    typeof yourStats.hit2 === 'number' ? yourStats.hit2 : 0,
    typeof yourStats.hit3 === 'number' ? yourStats.hit3 : 0,
    typeof yourStats.hit4 === 'number' ? yourStats.hit4 : 0,
    typeof yourStats.hit5 === 'number' ? yourStats.hit5 : 0,
  ];

  const perHit = rawHits.map((raw, i) => {
    const hitNum = i + 1;
    const armorReduced = oppArmor > 0 && hitNum < oppArmorBreak;
    const damage = damageTaken(raw, meleeDef, armorReduced ? (1 - oppArmor) : 1);
    return { damage, armorReduced };
  });

  const rush5Hit = perHit.reduce((s, h) => s + h.damage, 0);
  return {
    rush:     perHit[0].damage,
    hit2:     perHit[1].damage,
    hit3:     perHit[2].damage,
    hit4:     perHit[3].damage,
    hit5:     perHit[4].damage,
    rush5Hit,
    perHit,
  };
}

/**
 * Apply opponent defense to a single outgoing value.
 * defenseField: 'meleeDefenseStat' | 'blastDefense' | 'kiBlastDefenseArmor'
 */
export function applyOpponentDefense(value, opponentStats, defenseField) {
  if (value === null || value === undefined || !opponentStats) return value;
  if (typeof value !== 'number') return value;
  const def = typeof opponentStats[defenseField] === 'number' ? opponentStats[defenseField] : 1;
  return damageTaken(value, def);
}

/** Build the URL for a character thumbnail stored in public/char_thumbnails/ */
export function getImageUrl(filename, base = import.meta.env.BASE_URL) {
  if (!filename) return null;
  const b = base.endsWith('/') ? base : base + '/';
  return `${b}char_thumbnails/${filename}`;
}
