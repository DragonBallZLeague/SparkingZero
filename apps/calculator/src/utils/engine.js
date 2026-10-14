/**
 * The stat engine: one data-driven path from a character (schema 2) plus active
 * effects (capsules, skills, Sparking, effects the opponent puts on you) to the
 * numbers the panels show.
 *
 * Game rules it follows (apps/calculator/data/README.md):
 *   damage       final = ceil(Power x 1.25 x k), k = DP scale + class add + every
 *                damage effect on that channel (they ADD, they do not multiply).
 *                Where the raw Power of a value is unknown it is implied from the
 *                published final and the base coefficient.
 *   resistance   incoming-damage multiplier = incoming factor x (1 - (class + effects))
 *   rates        stat x (1 + class + effects) / (1 + class)
 *   flat         health, starting ki (bars, clamped to max ki), skill count, ki-blast count
 *   set          e.g. Rising Fighting Spirit: starting ki = max ki
 *   armor        the game's armor system (characters.json armor, scripts/lib/armor.mjs): each attack
 *                has a break level (its label at the attacker's DP), raised by "armor break level"
 *                effects (Draconic Aura +3, Dragon Rush +3 on rush, the Sparking passive); the side's
 *                armor has a level and damage rate; a hit breaks armor when break level >= level.
 *
 * Effects whose condition is not "always" apply only when that condition is on:
 * "sparking" follows the Sparking toggle; anything else (health thresholds, maps,
 * timers) is listed as a note and not applied. Ultimates are the exception to the
 * toggle: they need Sparking Mode, so ultimate damage always includes the
 * character's While Sparking passive and every Sparking-only ultimate effect. Keys of kind "display"/"level" are
 * listed too: the game has them but no shown stat depends on them.
 *
 * The result keeps the field names the panels were written against (rush, hit2..,
 * meleeDefenseStat, energy, kiBlastDmg, ...) so components only render.
 */

import { parseCondition, conditionMet } from './conditions.js';

/**
 * Damage taken from a list of hits: the game rounds each hit up after defense (the same rule as
 * calculator.js damageTaken).
 */
export function hitsTaken(hits, defense) {
  if (!Array.isArray(hits) || typeof defense !== 'number') return null;
  return hits.reduce((t, h) => t + (typeof h === 'number' ? Math.ceil(h * defense - 1e-9) : 0), 0);
}

const F = Math.fround;

export const CHANNEL_OF = {
  rushDamage: 'rush', smashDamage: 'smash', comboDamage: 'combo', throwDamage: 'throw',
  counterDamage: 'counter', followUpDamage: 'followUp', kiBlastDamage: 'kiBlast',
  chargedKiBlastDamage: 'chargedKiBlast', skillDamage: 'skill', superDamage: 'super', ultimateDamage: 'ultimate',
};
const ALL_DAMAGE = ['rush', 'smash', 'combo', 'throw', 'counter', 'followUp', 'kiBlast', 'chargedKiBlast', 'super', 'ultimate'];
const RESIST_OF = { physicalResist: ['physical'], energyResist: ['energy'], blastResist: ['blast'], allResist: ['physical', 'energy'] };
/** rate effect key -> [shown stat, class coefficient key (or null)] */
const RATES = {
  kiCharge: ['kiCharge', 'kiCharge'],
  kiRecovery: ['kiRegen', 'kiRecovery'],
  attackKiGain: ['attackKiGain', 'attackKiGain'],
  kiBlastCost: ['kiBlastCost', 'kiBlastCost'],
  skillRecovery: ['skillRegen', 'skillRecovery'],
  shortDashCost: ['shortDashCost', null],
};
const FLAT = new Set(['health', 'startingKi', 'skillStart', 'kiBlastCount', 'blastKiCost', 'ultimateKiCost']);
/** Pursuit effects (Vanishing Crash / Dragon Crash +5% damage, Vanishing Break / Dragon Break +1 use). */
const PURSUIT = new Set(['vanishingAttackDamage', 'dragonSmashDamage', 'vanishingLimit', 'dragonHomingLimit']);
const HANDLED = new Set([...Object.keys(CHANNEL_OF), 'allDamage', ...Object.keys(RESIST_OF), ...Object.keys(RATES), ...FLAT, ...PURSUIT,
  'switchRecovery', 'sparkingCharge', 'sparkingDrain', 'armorLevel', 'armorBreakLevel']);
/** Effect keys that change a shown stat (everything else is listed as a note). */
export const APPLIED_KEYS = HANDLED;

/** Skill armor (10%, from the old calculator) and Sparking armor (25%, measured 2026-10-08); they replace, not add to, a lower base armor. */
export const SKILL_ARMOR = 0.10;
export const SPARKING_ARMOR = 0.25;

const ULTIMATE_KEYS = new Set(['ultimateDamage', 'allDamage']);

/**
 * The character's While Sparking passive on ultimate damage. Ultimates are only usable in
 * Sparking Mode, so this is part of every published ultimate (measured or computed), and the
 * Sparking toggle does not add it again. Confirmed in game: Gohan (Kid) 17,250, Gohan (Teen) SSJ2 19,250.
 */
export function sparkingUltimateBonus(c) {
  return (c?.sparking?.effects || []).reduce((s, e) => s + (ULTIMATE_KEYS.has(e.key) ? e.value || 0 : 0), 0);
}

const round = (v, d = 4) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 10 ** d) / 10 ** d : v);
const hit = (power, k, K) => Math.ceil(F(F(power * K) * F(k)));
const hitsTotal = (hits, k, K) => hits.reduce((s, [p, n]) => s + hit(p, k, K) * n, 0);

/**
 * Scale a published final from coefficient k0 to k1. Uses the exact game formula with
 * the raw Power when it is known, else with the Power implied by the final (when that
 * reproduces it), else the plain ratio. `power` may be a blast's hits, [[Power, count]]
 * (blasts.json `hits`): each hit is rounded up on its own, as the game does (Energy Blast
 * Barrage with Blast Burst: 10 x 788 = 7,880, measured 2026-10-12, not 7,875).
 */
/**
 * Sparking! Mode's length in seconds: the whole ki gauge (maxKi bars of 10,000) drained at the game's
 * SparkingModeGaugeDecreaseSpeed (2,800 a second for all 241 characters) times (1 + the drain scales: the class's
 * SparkingModeGaugeDecreaseSpeedScale, capsules such as Sparking! Plus -15%). Measured by the league 2026-10-13:
 * Goku (Z - Early) and Goku (Z - Mid) Super Saiyan 17.8s (17.86, timed from the first frame the bar drops), Ultimate
 * Gohan 16.23s (+10% drain), Goku with Sparking! Plus 20.98s (21.01: the scales add, not multiply the time).
 */
export const SPARKING_DRAIN_PER_SEC = 2800;
export function sparkingSeconds(maxKi, drain) {
  const rate = SPARKING_DRAIN_PER_SEC * (1 + drain);
  return rate > 0 ? round((maxKi ?? 5) * 10000 / rate, 2) : null;
}
/**
 * Time to charge from full ki into Sparking! Mode, in seconds: the base time over (1 + the charge-speed scales:
 * the class's SparkingGaugeChargeSpeedScale, capsules). The base (SparkingGaugeChargeSpeed, a default the files
 * omit) was measured by the league on 2026-10-13: Goku (Z - Early) 1.67s; Nappa (+20%) 1.4s, Vegeta (Z - Scouter)
 * (-10%) 1.85s; Yamcha 1.67s, the same as Goku with a faster ki charge (the fighter's ki charge speed doesn't count).
 */
export const SPARKING_CHARGE_BASE_SECONDS = 1.67;
export function sparkingChargeSeconds(charge) {
  return SPARKING_CHARGE_BASE_SECONDS ? round(SPARKING_CHARGE_BASE_SECONDS / (1 + charge), 2) : null;
}

export function scale(final, k0, k1, K, power = null) {
  if (typeof final !== 'number' || !k0) return final;
  if (Math.abs(k1 - k0) < 1e-12) return final;
  if (Array.isArray(power) && power.length) {
    const at0 = hitsTotal(power, k0, K), n = power.reduce((s, [, c]) => s + c, 0);
    if (Math.abs(at0 - final) <= n) return hitsTotal(power, k1, K) + (final - at0);
  } else if (typeof power === 'number' && Math.abs(hit(power, k0, K) - final) <= 1) return hit(power, k1, K);
  // the implied Power: one that gives the final exactly first (Big Bang Crash 7,482 is 5,700, not the nearer 5,701)
  const implied = Math.round(final / (K * k0));
  const exact = [implied, implied - 1, implied + 1].find(p => p > 0 && hit(p, k0, K) === final);
  if (exact) return hit(exact, k1, K);
  if (implied > 0 && Math.abs(hit(implied, k0, K) - final) <= 1) return hit(implied, k1, K);
  return Math.round(final * k1 / k0);
}

/**
 * Gather the effects acting on one side.
 * @param {object} p
 * @param {object} p.character  schema-2 character
 * @param {Array}  p.capsules   equipped capsules (schema 2: effects [{key,value,op,condition,note}])
 * @param {Array}  p.skills     active schema-2 skills
 * @param {boolean} p.sparking
 * @param {Array}  [p.incoming] effects the opponent's skills put on this side
 * @param {object} [p.situation] the conditions controls: { health (HP; none = full), ki, skill, map,
 *                 events } (utils/conditions.js). Without it, conditional effects stay notes and the
 *                 character's passives (low-health power-ups) are left out, as before.
 * @returns {{ applied: Array, notes: Array, outgoing: Array }}
 */
export function collectEffects({ character, capsules = [], skills = [], sparking = false, incoming = [], situation = null }) {
  const applied = [], notes = [], outgoing = [];
  // health conditions read the side's maximum health: its own plus every unconditional health effect
  const sit = situation && {
    ...situation,
    maxHealth: (character?.stats?.health ?? 0) + capsules.reduce((s, c) => s + (c?.effects || [])
      .reduce((t, e) => t + (e.key === 'health' && !e.condition && typeof e.value === 'number' ? e.value : 0), 0), 0),
  };
  const take = (e, source, extra = {}) => {
    const cond = e.condition || 'always';
    // Dragon Rush: armor break level +3 on Rush Attack category actions (the rush hits)
    if (e.key === 'armorBreakLevel' && /rush attack/i.test(cond)) { applied.push({ ...e, ...extra, source, rushOnly: true }); return; }
    const met = cond !== 'always' && cond !== 'sparking' && sit && conditionMet(parseCondition(cond), sit);
    if (cond === 'always' || (cond === 'sparking' && sparking) || met) {
      if (e.key === 'display' || (!HANDLED.has(e.key) && e.op !== 'set')) notes.push({ source, text: e.note || describe(e) });
      else applied.push({ ...e, ...extra, source, ...(met ? { when: cond } : {}) });
    } else if (cond === 'sparking' && ULTIMATE_KEYS.has(e.key)) {
      // Ultimates are always used in Sparking Mode: Sparking-only ultimate damage applies to them anyway
      applied.push({ ...e, ultimateOnly: true, source });
      if (e.key !== 'ultimateDamage') notes.push({ source, text: `${e.note || describe(e)} (while Sparking; applied to ultimates only until Sparking Mode is on)` });
    } else {
      notes.push({ source, text: `${e.note || describe(e)} (${cond === 'sparking' ? 'while Sparking' : cond}; not applied)` });
    }
  };
  for (const c of capsules) if (c) for (const e of c.effects || []) take(e, c.name);
  for (const s of skills) {
    if (!s) continue;
    const phases = s.stages ? (s.phases || []).slice(-1) : (s.phases || []);
    for (const p of phases) for (const e of p.effects || []) {
      if (e.target === 'opponent') outgoing.push({ ...e, source: s.name });
      else take(e, s.name);
    }
    if (s.armor) applied.push({ key: 'armorLevel', value: 1, source: s.name });
  }
  if (sparking && character?.sparking) {
    // passive: its ultimate damage is already in the published ultimates (sparkingUltimateBonus)
    for (const e of character.sparking.effects || []) take(e, 'Sparking', { passive: true });
    if (character.sparking.armor) applied.push({ key: 'sparkingArmor', value: 1, source: 'Sparking' });
    // the common Sparking buff raises the armor break level of every attack
    if (character.sparking.armorBreakLevel) applied.push({ key: 'armorBreakLevel', value: character.sparking.armorBreakLevel, source: 'Sparking' });
  }
  for (const e of incoming) take(e, `${e.source} (opponent)`);
  // the character's own conditional passives (Goku: all damage +10% below 10,000 HP), only with the conditions controls
  if (sit) for (const p of character?.passives || []) for (const e of p.effects || []) take({ ...e, condition: p.condition }, passiveName(p));
  return { applied, notes: dedupeNotes(notes), outgoing, situation: sit };
}

/** A passive's name for breakdowns ("Low health" reads as the power-up it is). */
export function passiveName(p) {
  return p.name === 'Low health' ? `Power-up ${p.condition.replace(/^health /, '')}` : p.name;
}

function dedupeNotes(notes) {
  const seen = new Set();
  return notes.filter(n => { const k = n.source + '|' + n.text; if (seen.has(k)) return false; seen.add(k); return true; });
}

function describe(e) {
  const v = typeof e.value === 'number' ? (Math.abs(e.value) < 1 && e.value !== 0 ? `${e.value > 0 ? '+' : ''}${round(e.value * 100, 2)}%` : `${e.value > 0 ? '+' : ''}${e.value}`) : e.value ?? '';
  return `${e.key} ${v}`.trim();
}

/**
 * Compute the shown stats for one side.
 * @param {object} c          schema-2 character
 * @param {object} effects    from collectEffects
 * @param {object} ctx        { referenceHits: number[5], damageConstant, skillDamage: [skill1, skill2] }
 */
export function computeStats(c, effects, ctx = {}) {
  if (!c) return null;
  const K = ctx.damageConstant ?? 1.25;
  const s = c.stats;
  const add = {};
  const plus = (k, v) => { add[k] = (add[k] || 0) + v; };
  let setMaxKi = false, armorLevel = false, sparkingArmor = false, breakUp = 0, rushBreakUp = 0;
  for (const e of effects.applied) {
    const v = typeof e.value === 'number' ? e.value : 0;
    if (e.op === 'set') { if (e.key === 'startingKi' && e.value === 'max') setMaxKi = true; continue; }
    if (e.ultimateOnly) { plus('dmg.ultimate', v); continue; }
    if (CHANNEL_OF[e.key]) { if (!(e.passive && e.key === 'ultimateDamage')) plus(`dmg.${CHANNEL_OF[e.key]}`, v); }
    else if (e.key === 'allDamage') for (const ch of ALL_DAMAGE) { if (!(e.passive && ch === 'ultimate')) plus(`dmg.${ch}`, v); }
    else if (RESIST_OF[e.key]) for (const r of RESIST_OF[e.key]) plus(`res.${r}`, v);
    else if (e.key === 'armorLevel') armorLevel = armorLevel || v > 0;
    else if (e.key === 'armorBreakLevel') { if (e.rushOnly) rushBreakUp += v; else breakUp += v; }
    else if (e.key === 'sparkingArmor') sparkingArmor = true;
    else plus(e.key, v);
  }
  // The ultimate coefficient always includes the Sparking passive (ultimates need Sparking Mode)
  const k0 = { ...c.coef, ultimate: c.coef.ultimate + sparkingUltimateBonus(c) };
  const k1 = Object.fromEntries(Object.entries(k0).map(([ch, k]) => [ch, k + (add[`dmg.${ch}`] || 0)]));
  const P = c.power || {};

  const hits = [
    scale(s.hits[0], k0.rush, k1.rush, K, P.rush ?? null),
    ...s.hits.slice(1).map(h => scale(h, k0.rush, k1.rush, K)),
  ];
  const sumHits = hits.every(h => typeof h === 'number') ? hits.reduce((a, b) => a + b, 0) : null;
  const rush5Hit = k1.rush === k0.rush ? s.rush5Hit : sumHits ?? scale(s.rush5Hit, k0.rush, k1.rush, K);
  const fiveHitAfterArmor = typeof s.fiveHitAfterArmor === 'number' ? round(s.fiveHitAfterArmor * k1.rush / k0.rush, 1) : s.fiveHitAfterArmor;

  const cls = c.classCoef;
  const resist = (r, base) => base + (add[`res.${r}`] || 0);
  const rPhys = resist('physical', cls.physicalResist);
  const rEnergy = resist('energy', cls.energyResist);
  const rBlast = resist('blast', cls.blastResist);
  // incoming damage factor x (1 - resistance); resistance effects add to the class's
  const meleeDefense = round(c.incomingDamage * (1 - rPhys));
  const kiBlastDefense = round(c.incomingDamage * (1 - rEnergy));
  const blastDefense = round(c.incomingDamage * (1 - rEnergy - rBlast));

  const rate = (key, base) => {
    const [, clsKey] = RATES[key];
    const ck = clsKey ? cls[clsKey] || 0 : 0;
    const extra = add[key] || 0;
    if (typeof base !== 'number' || !extra) return base;
    return round(base * (1 + ck + extra) / (1 + ck));
  };

  const maxKi = s.maxKi ?? 5;
  let startingKi = (s.startingKi ?? 0) + (add.startingKi || 0);
  if (setMaxKi) startingKi = maxKi;
  startingKi = Math.max(0, Math.min(maxKi, round(startingKi)));
  const skillStart = Math.max(0, Math.min(s.skillLimit ?? Infinity, (s.skillStart ?? 0) + (add.skillStart || 0)));
  const kiBlastLimit = s.kiBlastLimit == null ? null : s.kiBlastLimit + (add.kiBlastCount || 0);

  // Armor does not stack: Sparking armor (25%) or skill armor (10%) replaces a lower base armor.
  // Measured in game 2026-10-08: Janemba (10% base) takes 278 from a 390 hit, 232 while Sparking
  // = 25%, not 35%.
  let armor = s.armor ?? 0;
  if (sparkingArmor) armor = Math.max(armor, SPARKING_ARMOR);
  else if (armorLevel) armor = Math.max(armor, SKILL_ARMOR);
  // The armor's level (a hit with a lower break level is reduced by it): Sparking Armor at the level
  // the game gives this character (3, or 4 for hyper-armor holders); Hyper Armor at 2. Skill armor's
  // 10% is Hyper Armor's damage rate, so it is taken at Hyper Armor's level.
  const A = c.armor || {};
  const armorLevelNow = !(armor > 0) ? null
    : sparkingArmor ? (A.sparking?.level ?? 3)
      : (A.base?.level ?? 2);
  // This side's attacks' break levels, with every armor-break-level effect added
  const bl = A.breakLevels;
  const up = (v, extra = 0) => (v == null ? null : v + breakUp + extra);
  const breakLevels = bl ? {
    rush: (bl.rush || []).map(v => up(v, rushBreakUp)),
    smash: (bl.smash || []).map(v => up(v)), perfectSmash: up(bl.perfectSmash), hyperSmash: up(bl.hyperSmash),
    heavyFinish: (bl.heavyFinish || []).map(v => up(v)), throw: up(bl.throw), kiBlast: up(bl.kiBlast),
    chargedKiBlast: bl.chargedKiBlast ? bl.chargedKiBlast.map(v => up(v)) : null,
    chargedKiBlastMoving: bl.chargedKiBlastMoving ? bl.chargedKiBlastMoving.map(v => up(v)) : null,
  } : null;

  const refHits = ctx.referenceHits || null;
  const skillDamage = (d) => (typeof d === 'number' && d ? round(scale(d, k0.skill, k1.skill, K), 2) : d ?? 0);

  // Pursuits, all on the follow-up channel (measured 2026-10-12, Goku (Z - Early) after a 1,400 full smash:
  // Vanishing Attack and Dragon Homing's Dragon Smash 1,250 each, 1,000 Power, as the published Pursuit;
  // Lightning Attack 1,150, two hits of 460 Power). Vanishing Crash and Dragon Crash add to their own move.
  // Uses (the league's test the same day): a pursuit with its own limit in the game files keeps it (Videl's 2
  // Dragon Homings), the others share the general follow-up limit; Vanishing Break and Dragon Break add one use
  // to their pursuit AND to the general limit (Goku with Dragon Break: 2 Vanishing Attacks, then a Dragon
  // Homing); Lightning Attack is only ever used once; a pursuit the character can't do stays 0.
  const pursuitAt = (extra) => scale(s.pursuit, k0.followUp, k1.followUp + extra, K, 1000);
  const ps = c.moveset?.pursuits || {};
  const usesOf = (p, addKey) => (p === false ? 0 : (p?.limit ?? (p ? ps.limit ?? 0 : 0)) + (addKey ? add[addKey] || 0 : 0));
  const pursuitLimit = {
    general: (ps.limit ?? 0) + (ps.limit ? (add.vanishingLimit || 0) + (add.dragonHomingLimit || 0) : 0),
    vanishingAttack: usesOf(ps.vanishingAttack, 'vanishingLimit'),
    dragonHoming: usesOf(ps.dragonHoming, 'dragonHomingLimit'),
    lightningAttack: ps.lightningAttack === false ? 0 : 1,
  };

  return {
    // identity (unchanged by effects)
    id: c.id, name: c.name, class: c.class.label, dp: c.dp,
    // stats, in the old field names the panels read
    health: (s.health ?? 0) + (add.health || 0),
    switch: add.switchRecovery ? round(s.switch / (1 + add.switchRecovery), 2) : s.switch,
    armorBreak: s.armorBreak,
    armor,
    armorLevel: armorLevelNow,
    breakLevels,
    meleeDefenseStat: meleeDefense,
    kiBlastDefenseArmor: kiBlastDefense,
    blastDefense,
    energy: kiBlastDefense,
    energyDecimal: round(1 - kiBlastDefense),
    melee: hitsTaken(refHits, meleeDefense),
    rush: hits[0], hit2: hits[1], hit3: hits[2], hit4: hits[3], hit5: hits[4],
    rush5Hit, fiveHitAfterArmor,
    smash: scale(s.smash, k0.smash, k1.smash, K),
    throw: scale(s.throw, k0.throw, k1.throw, K, P.throw ?? null),
    pursuit: scale(s.pursuit, k0.followUp, k1.followUp, K),
    vanishingAttack: ps.vanishingAttack === false ? null : pursuitAt(add.vanishingAttackDamage || 0),
    dragonSmash: ps.dragonHoming === false ? null : pursuitAt(add.dragonSmashDamage || 0),
    lightningAttack: ps.lightningAttack === false ? null : 2 * Math.ceil(F(F(460 * K) * F(k1.followUp))),
    pursuitLimit,
    kiBlastDmg: scale(s.kiBlastDamage, k0.kiBlast, k1.kiBlast, K, P.kiBlast ?? null),
    misc: round(c.dpScale - 1),
    chain: round(k1.combo - 1), perception: round(k1.counter - 1), sCounter: round(k1.counter - 1),
    super: round(k1.super - 1), ultimate: round(k1.ultimate - 1), kiBlast: round(k1.kiBlast - 1), skillDmg: round(k1.skill - 1),
    shortDashCost: rate('shortDashCost', s.shortDashCost),
    kiBlastCost: rate('kiBlastCost', s.kiBlastCost),
    kiBlastLimit: kiBlastLimit ?? 999,
    startingKi,
    kiCharge: rate('kiCharge', s.kiCharge),
    attackKiGain: rate('attackKiGain', s.attackKiGain),
    kiRegen: rate('kiRecovery', s.kiRegen),
    kiRegenRange: s.kiRegenRange,
    skillStart,
    skillLimit: s.skillLimit,
    skillRegen: s.skillRegen != null ? `${rate('skillRecovery', s.skillRegen)} Points/m` : null,
    sparkCharge: round((cls.sparkingCharge || 0) + (add.sparkingCharge || 0)),
    sparkDuration: round((s.sparkDuration ?? 0) - (add.sparkingDrain || 0)),
    // Sparking! Mode's gauge (2026-10-13). The old panels' sparkDuration above is Capsule Corp's "Spark Duration",
    // which matches the class's PRE-Sparking decay for every class (a partly charged gauge fading when charging
    // stops), not how long Sparking lasts. Rates add like the other rates: (1 + class + capsules).
    sparkDrain: round((cls.sparkingDrain || 0) + (add.sparkingDrain || 0)),
    sparkPreDrain: round((cls.preSparkingDrain || 0) + (add.preSparkingDrain || 0)),
    sparkSeconds: sparkingSeconds(maxKi, (cls.sparkingDrain || 0) + (add.sparkingDrain || 0)),
    sparkChargeSeconds: sparkingChargeSeconds((cls.sparkingCharge || 0) + (add.sparkingCharge || 0)),
    skill1Damage: skillDamage(ctx.skillDamage?.[0]),
    skill2Damage: skillDamage(ctx.skillDamage?.[1]),
    // engine extras
    coefBase: k0,
    coef: k1,
    blastFactor: { super: k1.super / k0.super, ultimate: k1.ultimate / k0.ultimate },
    blastKiCostAdd: (add.blastKiCost || 0) * 10000,
    ultimateKiCostAdd: (add.ultimateKiCost || 0) * 10000,
    referenceHits: refHits,
    damageConstant: K,
    notes: effects.notes,
  };
}

/**
 * A published final on one damage channel under a computed side's effects: the game-file values the
 * engine does not compute itself (charge levels, Rush Chains and follow-ups, jump and dash ki blasts,
 * Hyper Smash) and blasts. `power` when the raw Power is known, or a blast's hits ([[Power, count]]).
 */
export function scaleChannel(view, ch, final, power = null) {
  if (!view?.coef || typeof final !== 'number') return final;
  return scale(final, view.coefBase[ch], view.coef[ch], view.damageConstant ?? 1.25, power);
}

/**
 * A skill's damage for a computed side, or null when it deals none (158 of 482 skills). Measured by the league on
 * 2026-10-13 (data/README.md, seventh round):
 * - Counters (the Evade/Counter type: Wild Sense and its kind) are a smash hit: one Power for all 43 fits every
 *   published value on the smash channel (Goku (Z - Mid) Super Saiyan 1,708 = 1,120 Power x 1.25 x 1.22; Tien
 *   1,400 on his smash 1.0, not his rush 1.1), and they go through melee defense (Sparking! Plus's x1.2: 2,050).
 * - Everything else (explosions, barriers, binds, pushes) is on the skill channel and goes through ki defense
 *   (Vegeta (Z - Scouter)'s Explosive Wave 938, x1.1 = 1,032). Capsule Corp's values come from 937 x the
 *   coefficient, unrounded; the game's is 750 Power rounded up (938), so the Power is recovered and re-hit.
 * Second round, same day: a barrier (Android Barrier), a bind (Paralyze Beam) and a push (Mystic Breath) go through
 * ki defense like the explosion; Gogeta (Super) SSGSS's Stardust Barrier, the files' only front barrier
 * (`display.frontBarrier`), is a close-range swipe through melee defense, and a ki blast or blast hitting it sends
 * back a ki blast of its own (`display.reflectPower`, 1,000 Power, curated) through ki defense. Explosive Wave into
 * Janemba did its full 960: skills break or ignore armor. Defense applies before the rounding (Vegeta (Z - Early)'s
 * 984.375 x 1.1 = 1,082.8 -> 1,083, not 985 x 1.1 -> 1,084): skillTaken.
 * Returns { damage (with the build), base, defense: 'melee' | 'ki', power, k, K, reflect: the same for the
 * reflected shot, or null }.
 */
export function skillHit(skill, view) {
  if (!(skill?.damage > 0) || !view?.coefBase) return null;
  const counter = /Counter/.test(skill.display?.type || '');
  const ch = counter ? 'smash' : 'skill';
  const K = view.damageConstant ?? 1.25;
  const one = (power, c, defense) => ({ damage: hit(power, view.coef[c], K), base: hit(power, view.coefBase[c], K), defense, power, k: view.coef[c], K });
  const power = Math.round(skill.damage / (K * view.coefBase[ch]));
  const main = one(power, ch, counter || skill.display?.frontBarrier ? 'melee' : 'ki');
  const rp = skill.display?.reflectPower;
  return { ...main, reflect: rp ? one(rp, 'skill', 'ki') : null };
}
/** A skillHit (or its reflect) as taken through a defense multiplier, rounded up once at the end. */
export function skillTaken(h, def) {
  return h ? Math.ceil(h.power * h.K * h.k * def - 1e-9) : null;
}

/** Modified damage of one blast row (old shape) for a computed side. */
export function blastDamage(blast, view) {
  if (!blast || blast.baseDamagePatch == null || !view?.blastFactor) return { base: blast?.baseDamagePatch ?? null, boosted: blast?.boostedDamagePatch ?? null };
  const f = blast.slot === 'BlastUltimate' ? view.blastFactor.ultimate : view.blastFactor.super;
  const r = (v) => (v == null ? null : Math.round(v * f));
  return { base: r(blast.baseDamagePatch), boosted: r(blast.boostedDamagePatch) };
}

/**
 * What a capsule does that the stats do not show: effects with a condition other than
 * "always" (Sparking-only ones say so) and effects of kinds no shown stat depends on.
 */
export function capsuleNotes(capsule) {
  const out = [];
  for (const e of capsule?.effects || []) {
    const cond = e.condition || 'always';
    const text = e.note || describe(e);
    if (e.key === 'display' || (!HANDLED.has(e.key) && e.op !== 'set')) out.push(text);
    else if (cond === 'sparking') out.push(`${text} (while Sparking: turn on Sparking Mode to apply)`);
    else if (cond !== 'always') out.push(`${text} (${cond}; not applied)`);
  }
  return out;
}
