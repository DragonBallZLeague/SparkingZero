/**
 * toLegacy(): turns the calculator's data files (schema 2, see data/README.md)
 * into the shapes the UI components were written against (one flat object per
 * character keyed by display name, blasts keyed by character name, skills as a
 * flat list referenced by skill1Id/skill2Id, and so on).
 *
 * Plain JavaScript with no imports, so the data build (Node) and the app share
 * it: the build uses it to prove the conversion is lossless, the app calls it
 * once after loading.
 *
 * The level columns of a skill (meleeBuff, defenseBuff, ...) are an interim
 * projection of the game's exact coefficients onto the old "1 level = 5%" model:
 * level = coefficient / 0.05, summed over the skill's phases.
 */

const round = (v, d = 4) => {
  if (v === null || v === undefined || !Number.isFinite(v)) return v ?? null;
  const f = 10 ** d;
  const r = Math.round(v * f) / f;
  return Object.is(r, -0) ? 0 : r;
};

const LEVEL = 0.05;

/** Sum a list of [{key, value}] effects into {key: total}. */
function sumEffects(phases) {
  const t = {};
  for (const p of phases || []) for (const e of p.effects || []) {
    if (typeof e.value !== 'number') continue;
    t[e.key] = (t[e.key] || 0) + e.value;
  }
  return t;
}

/** The old six level columns, projected from exact coefficients. */
export function projectLevels(totals) {
  const lv = (v) => round((v || 0) / LEVEL, 2);
  return {
    meleeBuff: lv(totals.rushDamage),
    defenseBuff: lv(totals.physicalResist),
    kiBlastBuff: lv(totals.kiBlastDamage),
    kiChargingBuff: lv(totals.kiCharge),
    blastBuff: lv(totals.superDamage),
    ultimateBuff: lv((totals.ultimateDamage || 0) - (totals.superDamage || 0)),
  };
}

const LEGACY_SLOT = (b) => {
  if (b.slot === 'Super 1') return 'BlastSkill1';
  if (b.slot === 'Super 2') return b.variant ? 'ReplacementSlot2' : 'BlastSkill2';
  return 'BlastUltimate';
};

function legacyBlast(b) {
  const out = {
    slot: LEGACY_SLOT(b),
    name: b.name,
    category: b.category ?? null,
    type: b.type ?? null,
    baseDamage: b.damage,
    baseDamagePatch: b.damage,
    boostedDamage: b.boostedDamage,
    boostedDamagePatch: b.boostedDamage,
    impactPower: b.impactPower ?? null,
    traits: b.traits || [],
    maxExpendEnergy: b.kiCost ?? null,
    triggerExpendEnergy: b.triggerKi ?? null,
  };
  if (b.damageStatus) out.damageStatus = b.damageStatus;
  const flags = new Set(b.flags || []);
  if (flags.has('beamClashCapable')) out.beamClashCapable = true;
  if (b.lungeSpeed != null) out.lungeSpeed = b.lungeSpeed;
  if (b.moveLimitTime != null) out.moveLimitTime = b.moveLimitTime;
  for (const f of ['targetGiant', 'lockOnNeeded', 'dashClashCapable', 'unblockable', 'audienceFlees', 'destroyMap']) if (flags.has(f)) out[f] = true;
  return out;
}

/**
 * @param {object} data  { characters, skills, blasts, capsules, teams, meta } as published in public/data
 * @param {object} [opts]
 * @param {string[]} [opts.roster]  character ids to include (default: all)
 * @param {boolean} [opts.ultimateVariants]  include alternative ultimates (ULT2/ULT3) as extra rows
 */
export function toLegacy(data, opts = {}) {
  const roster = opts.roster ? new Set(opts.roster) : null;
  const chars = data.characters.filter(c => !roster || roster.has(c.id));
  const refAttacker = data.characters.find(c => c.id === data.meta?.referenceAttacker);
  const ref5 = refAttacker?.stats?.rush5Hit ?? null;

  // Skills: one entry per distinct (content) skill, numbered in first-use order.
  const skillList = [];
  const skillKey = new Map();
  const skillIdOf = (sk) => {
    if (!sk) return null;
    const d = sk.display || {};
    // Charge stages (same effects at increasing strength): the strongest stage, not their sum.
    const totals = sumEffects(sk.stages ? sk.phases.slice(-1) : sk.phases);
    const entry = {
      name: sk.name,
      type: d.type ?? null,
      instantSparking: !!d.instantSparking,
      instantKi: !!d.instantKi,
      unblockable: !!d.unblockable,
      activationTime: d.activationTime ?? null,
      duration: sk.duration ?? 0,
      mobilePenalty: d.mobilePenalty ?? null,
      healthAmount: d.healthAmount ?? null,
      kiAmount: d.kiAmount ?? null,
      baseDamage: sk.damage ?? 0,
      cost: sk.stockCost ?? null,
      ...projectLevels(totals),
      armor: !!sk.armor,
      cutscene: !!d.cutscene,
    };
    const k = JSON.stringify(entry);
    if (!skillKey.has(k)) {
      const id = skillList.length + 1;
      skillList.push({ id, ...entry });
      skillKey.set(k, id);
    }
    return skillKey.get(k);
  };

  const characters = chars.map(c => {
    const s = c.stats;
    const coef = c.coef;
    const skillOf = (slot) => data.skills[(c.skills || []).find(k => data.skills[k]?.slot === slot)] || null;
    const sk1 = skillOf(1), sk2 = skillOf(2);
    const sparkTotals = sumEffects([{ effects: c.sparking?.effects || [] }]);
    const sparkLevels = Object.fromEntries(Object.entries(projectLevels(sparkTotals)).filter(([, v]) => v));
    if (c.sparking?.armor) sparkLevels.armor = true;
    return {
      name: c.name,
      class: c.class.label,
      dp: c.dp,
      switch: s.switch,
      armorBreak: s.armorBreak,
      meleeDefenseStat: s.meleeDefense,
      kiBlastDefenseArmor: s.kiBlastDefenseArmor,
      blastDefense: s.blastDefense,
      health: s.health,
      melee: ref5 != null && s.meleeDefense != null ? Math.round(ref5 * s.meleeDefense) : null,
      energy: s.kiBlastDefense,
      energyDecimal: s.kiBlastDefense != null ? round(1 - s.kiBlastDefense) : null,
      armor: s.armor ?? 0,
      hit2: s.hits[1], hit3: s.hits[2], hit4: s.hits[3], hit5: s.hits[4],
      fiveHitAfterArmor: s.fiveHitAfterArmor,
      rush5Hit: s.rush5Hit,
      misc: round(c.dpScale - 1),
      rush: s.hits[0],
      smash: s.smash,
      throw: s.throw,
      pursuit: s.pursuit,
      chain: round(coef.combo - 1),
      perception: round(coef.counter - 1),
      sCounter: round(coef.counter - 1),
      super: round(coef.super - 1),
      ultimate: round(coef.ultimate - 1),
      shortDashCost: s.shortDashCost,
      kiBlastDmg: s.kiBlastDamage,
      kiBlast: round(coef.kiBlast - 1),
      kiBlastCost: s.kiBlastCost,
      kiBlastLimit: s.kiBlastLimit ?? 999,
      startingKi: s.startingKi,
      kiCharge: s.kiCharge,
      attackKiGain: s.attackKiGain,
      kiRegen: s.kiRegen,
      kiRegenRange: s.kiRegenRange,
      skillStart: s.skillStart,
      skillLimit: s.skillLimit,
      skillRegen: s.skillRegen != null ? `${s.skillRegen} Points/m` : null,
      skillDmg: round(coef.skill - 1),
      skill1Name: sk1?.name ?? null,
      skill1Damage: sk1?.damage ?? 0,
      skill2Name: sk2?.name ?? null,
      skill2Damage: sk2?.damage ?? 0,
      sparkCharge: s.sparkCharge,
      sparkDuration: s.sparkDuration,
      sparkStatBuffs: Object.keys(sparkLevels).length ? sparkLevels : null,
      miscellaneous: c.traits?.length ? c.traits.join(', ') : null,
      id: c.id,
      skill1Id: skillIdOf(sk1),
      skill2Id: skillIdOf(sk2),
    };
  });

  const blast = {};
  for (const c of chars) {
    const rows = (data.blasts[c.id] || []).filter(b => b.slot !== 'Ultimate' || !b.variant || opts.ultimateVariants);
    if (rows.length) blast[c.name] = rows.map(legacyBlast);
  }

  const capsules = data.capsules.map(c => ({ name: c.name, cost: c.cost, description: c.description, effects: c.effects || [] }));

  const names = new Map(chars.map(c => [c.id, c.name]));
  const teams = { teamNames: [], teams: {} };
  for (const t of data.teams) {
    const members = t.members.filter(id => names.has(id)).map(id => names.get(id));
    if (!members.length) continue;
    teams.teamNames.push(t.name);
    teams.teams[t.name] = members;
  }
  teams.teamNames.push('Free Agents');
  teams.teams['Free Agents'] = chars.map(c => c.name);

  const characterImages = {};
  for (const c of chars) if (c.image) characterImages[c.name] = c.image;

  return { characters, skills: skillList, blast, capsules, teams, characterImages };
}
