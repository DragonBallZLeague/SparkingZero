/**
 * Applies Light Body ki blast defense armor buff to the energy stat.
 * This is a special 10% reduction (multiplier -0.10) that acts as a 'ki blast defense armor'.
 * If the character has Draconic Aura (future functionality), this buff should be ignored.
 * @param {object} stats - The stats object to modify.
 * @param {boolean} hasLightBody - True if the character has Light Body.
 * @param {boolean} hasDraconicAura - True if the character has Draconic Aura (future use).
 * @returns {object} - The stats object with the Light Body buff applied if appropriate.
 */
export function applyLightBodyKiBlastArmor(stats, hasLightBody, hasDraconicAura = false) {
  if (!stats || typeof stats.energy !== 'number') return stats;
  if (hasLightBody && !hasDraconicAura) {
    return { ...stats, energy: parseFloat((stats.energy - 0.10).toFixed(4)) };
  }
  return stats;
}
/**
 * Parses capsule effect codes and applies them to a character's stats.
 * Effect key → stat field mapping.
 */

export const CAPSULE_BUDGET = 20;

// Maps effect keys to which stat field they modify and how
// Returns { fieldPath, operation } where operation is 'add' | 'multiply_percent' | 'set'
export function parseEffectKey(key) {
  if (!key) return null;
  const k = key.trim().toLowerCase().replace(/[^a-z0-9_\-]/g, '');

  const map = {
    health_up:                   { field: 'health',        op: 'add' },
    health_down:                 { field: 'health',        op: 'sub' },
    rush_attack_up:              { fields: ['rush', 'hit2', 'hit3', 'hit4', 'hit5', 'rush5Hit', 'fiveHitAfterArmor'], op: 'percent' },
    smash_attack_up:             { field: 'smash',         op: 'percent' },
    rush_chain_up:               { field: 'chain',         op: 'percent' },
    rush_chain_damage:           { field: 'chain',         op: 'percent' },
    rush_ki_blast_up:            { field: 'kiBlast',       op: 'percent' },
    smash_ki_blast_up:           { field: 'kiBlastDmg',    op: 'percent' },
    blast_damage_up:             { field: 'blastDamage',   op: 'percent' }, // displayed label
    blast_combo_up:              { field: 'blastCombo',    op: 'percent' },
    blast_combo_damage_up:       { field: 'blastCombo',    op: 'percent' },
    ultimate_blast_damage_up:    { field: 'ultimate',      op: 'percent' },
    ki_gained_from_attacks:      { field: 'attackKiGain',  op: 'percent' },
    ki_gauge_starts:             { field: 'startingKi',    op: 'add' },
    ki_bar_blasts_up:            { field: 'blastKiCost',   op: 'add' },
    ultimate_blasts_cost_up:     { field: 'ultimateKiCost',op: 'add' },
    throw_damage_up:             { field: 'throw',         op: 'percent' },
    // burst_rush_damage_up and burst_meteor_damage_up intentionally omitted —
    // Burst Rush/Meteor are not displayed stats in the calculator.
    dragon_homing_limit_up:      { field: 'dragonHoming',  op: 'add' },
    vanishing_attack_limit_up:   { field: 'vanishingLimit',op: 'add' },
    rush_ki_blast_count:         { field: 'kiBlastLimit',  op: 'add' },
    super_z_counter_down:        { field: 'sCounter',      op: 'sub_flat' },
    switch_gauge_recovery:       { field: 'switch',        op: 'percent_inv' },
    // Defense reductions (raise multiplier = more damage taken)
    melee_defense_down:          { field: 'meleeDefenseStat', op: 'percent' },
    blast_defense_down:          { field: 'blastDefense',     op: 'percent' },
    // Ki cost reductions
    short_dashes_ki_cost_down:   { field: 'shortDashCost',    op: 'percent_inv' },
    reduce_rush_ki_blasts:       { field: 'kiBlastCost',      op: 'percent_inv' },
    reduces_smash_ki_blasts:     { field: 'kiBlastCost',      op: 'percent_inv' },
    // Ki regen (key name misleading — description says reduces by X%)
    ki_recovery_up:              { field: 'kiRegen',           op: 'percent_inv' },
    // Skill gauge
    skill_gauge_recovery:        { field: 'skillRegen',        op: 'percent' },
    skill_start_count_up:        { field: 'skillStart',        op: 'add' },
    // Sparking duration (base=0, stores fraction; +25 value → +0.25 → shows +25%)
    sparking_down:               { field: 'sparkDuration',     op: 'add_pct' },
    sparking_mode_gauge_down:    { field: 'sparkDuration',     op: 'add_pct' },
    // Ki Blast armor (Light Body: inherent 10% reduction on armored ki blasts)
    // sub_pct previously affected kiBlastDefenseArmor, now deprecated.
  };

  return map[k] || null;
}

/**
 * Given a character's base stats and a list of equipped capsules,
 * compute the modified stats.
 */
export function computeModifiedStats(baseStats, equippedCapsules) {
  if (!baseStats) return null;

  // Start with a copy. We'll track percent-based modifiers separately.
  const modifiers = {};

  equippedCapsules.forEach(capsule => {
    if (!capsule?.effects) return;
    capsule.effects.forEach(effect => {
      if (!effect) return;
      const mapping = parseEffectKey(effect.key);
      if (!mapping || effect.value === null) return;

      const fieldList = mapping.fields ?? [mapping.field];
      fieldList.forEach(field => {
        if (!modifiers[field]) modifiers[field] = { add: 0, percent: 0, percentInv: 0 };

        if (mapping.op === 'percent') {
          modifiers[field].percent += effect.value;
        } else if (mapping.op === 'percent_inv') {
          modifiers[field].percentInv += effect.value;
        } else if (mapping.op === 'add') {
          modifiers[field].add += effect.value;
        } else if (mapping.op === 'sub') {
          modifiers[field].add -= effect.value;
        } else if (mapping.op === 'sub_flat') {
          modifiers[field].add -= effect.value;
        } else if (mapping.op === 'add_pct') {
          modifiers[field].add += effect.value / 100;
        } else if (mapping.op === 'sub_pct') {
          modifiers[field].add -= effect.value / 100;
        }
      });
    });
  });

  const modified = { ...baseStats };

  // Apply flat + percent to numeric fields
  Object.entries(modifiers).forEach(([field, { add, percent, percentInv }]) => {
    let base = baseStats[field];
    // Some fields (e.g. skillRegen) are stored as formatted strings like "3.65 Points/m".
    // Extract the leading number so capsule modifiers can still be applied.
    let suffix = '';
    if (typeof base === 'string') {
      const m = base.match(/^([\d.]+)(.*)$/);
      if (!m) return;
      base = parseFloat(m[1]);
      suffix = m[2];
      if (isNaN(base)) return;
    }
    if (typeof base !== 'number') return;
    // percentInv: +50% recovery means the time value goes DOWN by 50%
    const result = (base + add) * (1 + percent / 100) * (1 - (percentInv || 0) / 100);
    // Only round to integer for fields that are naturally integers AND whose
    // result is also effectively an integer (within float-noise tolerance).
    // Fields like meleeDefenseStat/blastDefense (base=1) or sparkDuration (base=0)
    // store fractional multipliers — rounding them would discard capsule modifiers.
    const isIntegerResult = Number.isInteger(base) && Math.abs(result - Math.round(result)) < 1e-6;
    if (isIntegerResult) {
      modified[field] = suffix ? `${Math.round(result)}${suffix}` : Math.round(result);
    } else {
      const decimals = (String(base).split('.')[1] || '').length;
      const rounded = parseFloat(result.toFixed(Math.max(decimals, 4)));
      modified[field] = suffix ? `${rounded}${suffix}` : rounded;
    }
  });

  return modified;
}

// Skill buff key → affected base stat fields. Each +1 level = +5% to each field.
export const SKILL_BUFF_FIELDS = {
  meleeBuff:      ['smash', 'throw', 'pursuit', 'rush', 'hit2', 'hit3', 'hit4', 'hit5', 'rush5Hit', 'fiveHitAfterArmor'],
  defenseBuff:    ['meleeDefenseStat', 'blastDefense', 'energy', 'melee'],
  kiBlastBuff:    ['kiBlast', 'kiBlastDmg'],
  kiChargingBuff: ['kiCharge'],
  blastBuff:      ['blastDamage', 'blastCombo', 'ultimate'],
  ultimateBuff:   ['ultimate'],
};

/**
 * Apply active skill buffs on top of already-modified stats.
 * Each +1 level = +5% multiplier, -1 = -5%.
 * Defense fields use inverted logic: 1.0 is base; buff increases (improves) means lower multiplier.
 */
export function applySkillBuffs(stats, activeSkills) {
  if (!stats || !activeSkills || activeSkills.length === 0) return stats;

  // Accumulate total percent per field
  const pctMap = {};
  activeSkills.forEach(skill => {
    Object.entries(SKILL_BUFF_FIELDS).forEach(([buffKey, fields]) => {
      const level = skill[buffKey];
      if (!level) return;
      const pct = level * 5; // +1 level = +5%
      fields.forEach(field => {
        pctMap[field] = (pctMap[field] || 0) + pct;
      });
    });
  });

  const result = { ...stats };
  Object.entries(pctMap).forEach(([field, pct]) => {
    const base = stats[field];
    if (typeof base !== 'number') return;
    // Defense fields are damage multipliers (lower = better defense), so buff inverts
    const defenseFields = ['meleeDefenseStat', 'blastDefense', 'energy', 'melee'];
    if (defenseFields.includes(field)) {
      // e.g. base=1.0, +5% defense → multiplier -= 0.05 → 0.95 (takes less damage)
      result[field] = parseFloat((base * (1 - pct / 100)).toFixed(4));
    } else {
      if (Number.isInteger(base)) {
        result[field] = Math.round(base * (1 + pct / 100));
      } else {
        const decimals = (String(base).split('.')[1] || '').length;
        result[field] = parseFloat((base * (1 + pct / 100)).toFixed(Math.max(decimals, 4)));
      }
    }
  });

  // Apply sparking/skill armor buffs to armor stat only
  const hasSparkingArmorBuff = activeSkills.some(skill => skill.armor === true && skill.instantSparking === true);
  const hasSkillArmorBuff = activeSkills.some(skill => skill.armor === true && skill.instantSparking === false);
  let armorBonus = 0;
  if (hasSparkingArmorBuff) armorBonus = 0.25;
  else if (hasSkillArmorBuff) armorBonus = 0.10;
  if (armorBonus > 0 && typeof result.armor === 'number') {
    result.armor = parseFloat((result.armor + armorBonus).toFixed(4));
  }

  return result;
}

// Base Mid Goku's 5-hit rush combo damages (hit 1–5), used for "damage taken" stats (no opponent)
const GOKU_MID_HITS = [410, 410, 410, 567, 788];

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
    : GOKU_MID_HITS;
  let total = 0;
  const hits = opHits.map((hit, i) => {
    const damage = Math.round(hit * def);
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
    : GOKU_MID_HITS;
  let total = 0;
  opHits.forEach((hit, i) => {
    const hitNum = i + 1;
    const isArmored = hitNum < breakOnHit;
    total += hit * def * (isArmored ? (1 - armor) : 1);
  });
  return Math.round(total);
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
    const damage = Math.round(raw * meleeDef * (armorReduced ? (1 - oppArmor) : 1));
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
  return Math.round(value * def);
}

/**
 * Total cost of equipped capsules (null slots are free).
 */
export function totalCapsuleCost(equippedCapsules) {
  return equippedCapsules.reduce((sum, c) => sum + (c?.cost ?? 0), 0);
}

/**
 * Returns a numeric display value for a stat field.
 * Some raw values are 0–1 multipliers, others are raw numbers.
 */
export function formatStat(field, value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;

  // Fields stored as 0-1 multipliers — display as % modifier
  const percentFields = ['meleeDefenseStat', 'blastDefense', 'energy', 'energyDecimal', 'sparkCharge'];

  if (percentFields.includes(field)) {
    const pct = Math.round((value - 1) * 100);
    if (pct === 0) return 'Base';
    return pct > 0 ? `+${pct}%` : `${pct}%`;
  }

  if (field === 'startingKi') {
    return `${value} bars`;
  }

  return typeof value === 'number' ? value.toLocaleString() : String(value);
}


/**
 * Encode build state into URL hash, including opponent and their capsules.
 * @param {string} characterName
 * @param {string[]} capsuleNames
 * @param {string|null} opponentName
 * @param {string[]|null} opponentCapsuleNames
 * @returns {string}
 */
export function encodeBuild(characterName, capsuleNames, opponentName = null, opponentCapsuleNames = null) {
  const data = { c: characterName, p: capsuleNames };
  if (opponentName) data.o = opponentName;
  if (opponentCapsuleNames) data.op = opponentCapsuleNames;
  return btoa(encodeURIComponent(JSON.stringify(data)));
}

/**
 * Decode build state from URL hash, including opponent and their capsules.
 * @param {string} hash
 * @returns {{ characterName: string, capsuleNames: string[], opponentName?: string, opponentCapsuleNames?: string[] } | null}
 */
export function decodeBuild(hash) {
  try {
    const data = JSON.parse(decodeURIComponent(atob(hash)));
    return {
      characterName: data.c,
      capsuleNames: data.p,
      opponentName: data.o,
      opponentCapsuleNames: data.op
    };
  } catch {
    return null;
  }
}

/** Build the URL for a character thumbnail stored in public/char_thumbnails/ */
export function getImageUrl(filename, base = import.meta.env.BASE_URL) {
  if (!filename) return null;
  const b = base.endsWith('/') ? base : base + '/';
  return `${b}char_thumbnails/${filename}`;
}

/** Get class badge CSS class */
export function getClassBadge(cls) {
  if (!cls) return 'badge-normal';
  const key = cls.toLowerCase().replace(/[\s\-]/g, '_');
  return `badge-${key}`;
}
