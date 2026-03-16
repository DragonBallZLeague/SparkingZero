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
    rush_attack_up:              { field: 'rush',          op: 'percent' },
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
    burst_rush_damage_up:        { field: 'rush',          op: 'percent' },
    burst_meteor_damage_up:      { field: 'smash',         op: 'percent' },
    dragon_homing_limit_up:      { field: 'dragonHoming',  op: 'add' },
    vanishing_attack_limit_up:   { field: 'vanishingLimit',op: 'add' },
    rush_ki_blast_count:         { field: 'kiBlastLimit',  op: 'add' },
    super_z_counter_down:        { field: 'sCounter',      op: 'sub_flat' },
    switch_gauge_recovery:       { field: 'switch',        op: 'percent_inv' },
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

      if (!modifiers[mapping.field]) modifiers[mapping.field] = { add: 0, percent: 0, percentInv: 0 };

      if (mapping.op === 'percent') {
        modifiers[mapping.field].percent += effect.value;
      } else if (mapping.op === 'percent_inv') {
        modifiers[mapping.field].percentInv += effect.value;
      } else if (mapping.op === 'add') {
        modifiers[mapping.field].add += effect.value;
      } else if (mapping.op === 'sub') {
        modifiers[mapping.field].add -= effect.value;
      } else if (mapping.op === 'sub_flat') {
        modifiers[mapping.field].add -= effect.value;
      }
    });
  });

  const modified = { ...baseStats };

  // Apply flat + percent to numeric fields
  Object.entries(modifiers).forEach(([field, { add, percent, percentInv }]) => {
    const base = baseStats[field];
    if (typeof base !== 'number') return;
    // percentInv: +50% recovery means the time value goes DOWN by 50%
    const result = (base + add) * (1 + percent / 100) * (1 - (percentInv || 0) / 100);
    // Only round to integer for fields that are naturally integers;
    // preserve decimals for small fractional stats (e.g. attackKiGain = 0.03)
    if (Number.isInteger(base)) {
      modified[field] = Math.round(result);
    } else {
      const decimals = (String(base).split('.')[1] || '').length;
      modified[field] = parseFloat(result.toFixed(Math.max(decimals, 4)));
    }
  });

  return modified;
}

// Skill buff key → affected base stat fields. Each +1 level = +5% to each field.
export const SKILL_BUFF_FIELDS = {
  meleeBuff:      ['smash', 'throw', 'pursuit', 'rush', 'hit2', 'hit3', 'hit4', 'hit5', 'rush5Hit', 'fiveHitAfterArmor'],
  defenseBuff:    ['meleeDefenseStat', 'kiBlastDefenseArmor', 'blastDefense', 'melee'],
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

  if (Object.keys(pctMap).length === 0) return stats;

  const result = { ...stats };
  Object.entries(pctMap).forEach(([field, pct]) => {
    const base = stats[field];
    if (typeof base !== 'number') return;
    // Defense fields are damage multipliers (lower = better defense), so buff inverts
    const defenseFields = ['meleeDefenseStat', 'kiBlastDefenseArmor', 'blastDefense', 'melee'];
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
  return result;
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
  const percentFields = ['meleeDefenseStat', 'kiBlastDefenseArmor', 'blastDefense',
    'energy', 'energyDecimal', 'sparkCharge'];

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

/** Encode build state into URL hash */
export function encodeBuild(characterName, capsuleNames) {
  const data = { c: characterName, p: capsuleNames };
  return btoa(encodeURIComponent(JSON.stringify(data)));
}

/** Decode build state from URL hash */
export function decodeBuild(hash) {
  try {
    const data = JSON.parse(decodeURIComponent(atob(hash)));
    return { characterName: data.c, capsuleNames: data.p };
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
