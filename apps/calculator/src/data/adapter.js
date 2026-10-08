/**
 * toLegacy(): turns the calculator's data files (schema 2, see data/README.md)
 * into the shapes the UI components were written against (one flat object per
 * character keyed by display name, blasts keyed by character name, skills as a
 * flat list referenced by skill1Id/skill2Id, and so on).
 *
 * Plain JavaScript with no imports, so the data build (Node), the checks and the
 * app share it.
 *
 * Skills keep their schema-2 id ("<characterId>:<slot>") and their exact effects;
 * `buffPct` is only what the skill tables show: the effect on six headline
 * channels in percent, summed over the skill's phases (the strongest stage for a
 * charge-stage skill). The stat engine (src/utils/engine.js) applies the full
 * effect list, not these columns.
 */

const round = (v, d = 4) => {
  if (v === null || v === undefined || !Number.isFinite(v)) return v ?? null;
  const f = 10 ** d;
  const r = Math.round(v * f) / f;
  return Object.is(r, -0) ? 0 : r;
};

/** Sum a list of [{key, value}] effects into {key: total} (self-targeted effects only). */
function sumEffects(phases) {
  const t = {};
  for (const p of phases || []) for (const e of p.effects || []) {
    if (typeof e.value !== 'number' || e.target === 'opponent') continue;
    t[e.key] = (t[e.key] || 0) + e.value;
  }
  return t;
}

/** The six headline columns the skill tables show, in percent. */
export function buffPct(totals) {
  const pct = (v) => round((v || 0) * 100, 2);
  return {
    melee: pct(totals.rushDamage),
    defense: pct(totals.physicalResist),
    kiBlast: pct(totals.kiBlastDamage),
    kiCharge: pct(totals.kiCharge),
    blast: pct(totals.superDamage),
    ultimate: pct(totals.ultimateDamage),
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
    variant: b.variant || undefined,
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

  // Skills: one entry per character skill, keyed by its schema-2 id.
  const skillList = [];
  const skillIdOf = (sk) => {
    if (!sk) return null;
    const d = sk.display || {};
    // Charge stages (same effects at increasing strength): the strongest stage, not their sum.
    const totals = sumEffects(sk.stages ? sk.phases.slice(-1) : sk.phases);
    const opponentEffects = (sk.phases || []).some(p => (p.effects || []).some(e => e.target === 'opponent'));
    skillList.push({
      id: sk.id,
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
      buffPct: buffPct(totals),
      armor: !!sk.armor,
      cutscene: !!d.cutscene,
      inferred: !!d.inferred,
      phases: (sk.phases || []).length,
      effectCount: (sk.phases || []).reduce((n, p) => n + (p.effects || []).length, 0),
      stages: !!sk.stages,
      opponentEffects,
      affectsOpponent: !!d.affectsOpponent || opponentEffects,
      note: d.note ?? null,
    });
    return sk.id;
  };

  const characters = chars.map(c => {
    const s = c.stats;
    const coef = c.coef;
    const skillOf = (slot) => data.skills[(c.skills || []).find(k => data.skills[k]?.slot === slot)] || null;
    const sk1 = skillOf(1), sk2 = skillOf(2);
    // Every character can Spark: the row toggles Sparking (its passive buffs, Sparking armor, Sparking-only capsule effects).
    const sparkStatBuffs = { ...buffPct(sumEffects([{ effects: c.sparking?.effects || [] }])), armor: !!c.sparking?.armor };
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
      // ultimates need Sparking Mode, so their modifier includes the While Sparking passive
      ultimate: round(coef.ultimate + (c.sparking?.effects || []).reduce((t, e) => t + (e.key === 'ultimateDamage' || e.key === 'allDamage' ? e.value || 0 : 0), 0) - 1),
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
      sparkStatBuffs,
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

  const capsules = data.capsules.map(c => ({ id: c.id, name: c.name, cost: c.cost, description: c.description, effects: c.effects || [], bannedIn: c.bannedIn || [] }));

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
