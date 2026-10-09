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
const HANDLED = new Set([...Object.keys(CHANNEL_OF), 'allDamage', ...Object.keys(RESIST_OF), ...Object.keys(RATES), ...FLAT,
  'switchRecovery', 'sparkingCharge', 'sparkingDrain', 'armorLevel']);
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

/**
 * Scale a published final from coefficient k0 to k1. Uses the exact game formula with
 * the raw Power when it is known, else with the Power implied by the final (when that
 * reproduces it), else the plain ratio.
 */
function scale(final, k0, k1, K, power = null) {
  if (typeof final !== 'number' || !k0) return final;
  if (Math.abs(k1 - k0) < 1e-12) return final;
  if (power != null && Math.abs(hit(power, k0, K) - final) <= 1) return hit(power, k1, K);
  const implied = Math.round(final / (K * k0));
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
 * @returns {{ applied: Array, notes: Array, outgoing: Array }}
 */
export function collectEffects({ character, capsules = [], skills = [], sparking = false, incoming = [] }) {
  const applied = [], notes = [], outgoing = [];
  const take = (e, source, extra = {}) => {
    const cond = e.condition || 'always';
    if (cond === 'always' || (cond === 'sparking' && sparking)) {
      if (e.key === 'display' || (!HANDLED.has(e.key) && e.op !== 'set')) notes.push({ source, text: e.note || describe(e) });
      else applied.push({ ...e, ...extra, source });
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
  }
  for (const e of incoming) take(e, `${e.source} (opponent)`);
  return { applied, notes: dedupeNotes(notes), outgoing };
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
  let setMaxKi = false, armorLevel = false, sparkingArmor = false;
  for (const e of effects.applied) {
    const v = typeof e.value === 'number' ? e.value : 0;
    if (e.op === 'set') { if (e.key === 'startingKi' && e.value === 'max') setMaxKi = true; continue; }
    if (e.ultimateOnly) { plus('dmg.ultimate', v); continue; }
    if (CHANNEL_OF[e.key]) { if (!(e.passive && e.key === 'ultimateDamage')) plus(`dmg.${CHANNEL_OF[e.key]}`, v); }
    else if (e.key === 'allDamage') for (const ch of ALL_DAMAGE) { if (!(e.passive && ch === 'ultimate')) plus(`dmg.${ch}`, v); }
    else if (RESIST_OF[e.key]) for (const r of RESIST_OF[e.key]) plus(`res.${r}`, v);
    else if (e.key === 'armorLevel') armorLevel = armorLevel || v > 0;
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

  const refHits = ctx.referenceHits || null;
  const refTotal = refHits ? refHits.reduce((a, b) => a + b, 0) : null;
  const skillDamage = (d) => (typeof d === 'number' && d ? round(scale(d, k0.skill, k1.skill, K), 2) : d ?? 0);

  return {
    // identity (unchanged by effects)
    id: c.id, name: c.name, class: c.class.label, dp: c.dp,
    // stats, in the old field names the panels read
    health: (s.health ?? 0) + (add.health || 0),
    switch: add.switchRecovery ? round(s.switch / (1 + add.switchRecovery), 2) : s.switch,
    armorBreak: s.armorBreak,
    armor,
    meleeDefenseStat: meleeDefense,
    kiBlastDefenseArmor: kiBlastDefense,
    blastDefense,
    energy: kiBlastDefense,
    energyDecimal: round(1 - kiBlastDefense),
    melee: refTotal != null ? Math.round(refTotal * meleeDefense) : null,
    rush: hits[0], hit2: hits[1], hit3: hits[2], hit4: hits[3], hit5: hits[4],
    rush5Hit, fiveHitAfterArmor,
    smash: scale(s.smash, k0.smash, k1.smash, K),
    throw: scale(s.throw, k0.throw, k1.throw, K, P.throw ?? null),
    pursuit: scale(s.pursuit, k0.followUp, k1.followUp, K),
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
    skill1Damage: skillDamage(ctx.skillDamage?.[0]),
    skill2Damage: skillDamage(ctx.skillDamage?.[1]),
    // engine extras
    coefBase: k0,
    coef: k1,
    blastFactor: { super: k1.super / k0.super, ultimate: k1.ultimate / k0.ultimate },
    blastKiCostAdd: (add.blastKiCost || 0) * 10000,
    ultimateKiCostAdd: (add.ultimateKiCost || 0) * 10000,
    referenceHits: refHits,
    notes: effects.notes,
  };
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
