// The demo's data and engine glue: the published data run through the calculator's own engine
// (src/utils/engine.js, calculator.js, conditions.js), the way App.jsx runs it, plus what the new
// views need on top: game-file values scaled by the build, breakdowns, roster ranges, move details.
import characters from '../../public/data/characters.json';
import skillsById from '../../public/data/skills.json';
import blastsById from '../../public/data/blasts.json';
import capsules from '../../public/data/capsules.json';
import teams from '../../public/data/teams.json';
import meta from '../../public/data/meta.json';
import artSizes from '../../public/char_art/sizes.json';
import { collectEffects, computeStats, scaleChannel, APPLIED_KEYS } from '../../src/utils/engine.js';
import { applyLightBodyKiBlastArmor, kiBlastVolley, calcOutgoingCombo, damageTaken, armorFactor, calcFiveHitDamageTaken } from '../../src/utils/calculator.js';
import { LIGHT_BODY, DRACONIC_AURA } from '../../src/utils/specialCapsules.js';
import { parseCondition, conditionNeeds } from '../../src/utils/conditions.js';

export { characters, capsules, teams, meta };
export const byId = new Map(characters.map(c => [c.id, c]));
export const capsuleById = new Map(capsules.map(c => [c.id, c]));
const ref = byId.get(meta.referenceAttacker);
const CTX = { referenceHits: ref?.stats?.hits, damageConstant: meta.damageConstant };

/* ------------------------------------------------------------------ assets */
export const artUrl = (id) => `../../public/char_art/${id}.webp`;
export const faceUrl = (c) => `../../public/char_thumbnails/${c.image}`;
export const isGiant = (c) => c?.class?.key === 'giant';
/** The figure's height on its game card, times 1.3 for Giants (the cards shrink them; approved on Janemba). */
export const figHeight = (c) => Math.round((artSizes[c.id] || 1700) * (isGiant(c) ? 1.3 : 1));

/* ------------------------------------------------------------------ names */
const FORM_WORDS = /\s(Super Saiyan|Ultra Instinct|Full Power|Giant Form|Final Form|1st Form|2nd Form|3rd Form|4th Form|Perfect Form|Golden|Kaioken|God of Destruction|Berserk|Max Power|Fusion|Rosé)\b/;
/**
 * A name split where it may wrap: before the parenthesis ("Vegeta" / "(Z - Scouter)"); with a long form
 * after the parenthesis, or no parenthesis, before the form name ("Gotenks" / "Super Saiyan 3").
 */
export function nameParts(name) {
  const p = name.indexOf(' (');
  if (p > 0) {
    const close = name.indexOf(')', p);
    const after = name.slice(close + 1).trim();
    if (after.length > 4) return [name.slice(0, close + 1), after];
    return [name.slice(0, p), name.slice(p + 1)];
  }
  const m = name.match(FORM_WORDS);
  if (m && m.index > 0) return [name.slice(0, m.index), name.slice(m.index + 1)];
  return [name];
}

/* ------------------------------------------------------------------ classes */
const CLASS_COLOURS = {
  Normal: '#2563eb', 'Super Saiyan': '#eab308', 'Ki-Blast': '#8b5cf6', Power: '#dc2626', Speed: '#06b6d4',
  Almighty: '#f97316', Rival: '#16a34a', Fusion: '#d946ef', Giant: '#92562a', 'Skill-User': '#94a3b8', God: '#f8fafc',
  Villain: ['#111827', '#b91c1c'], Secret: ['#f9a8d4', '#f8fafc'], 'Legendary Super Saiyan': ['#a3e635', '#eab308'],
  'Infinite Ki Android': '#64748b', 'Ki Drain Android': '#0f766e',
};
const SUB_COLOURS = { Vegeta: '#7dd3fc', 'Mr. Satan': '#f59e0b', Yajirobe: '#84cc16' };
/** A class label's colours: [main, second]. Sub-types ("Ki-Blast (Vegeta)") tint their name strip with a second colour. */
export function classColours(label) {
  const m = label.match(/^(.*?) \((.*)\)$/);
  const base = m ? m[1] : label;
  const sub = m ? m[2] : null;
  const main = CLASS_COLOURS[base] ?? '#64748b';
  if (Array.isArray(main)) return main;
  if (!sub) return [main, main];
  return [main, SUB_COLOURS[sub] ?? CLASS_COLOURS[sub] ?? main];
}
/** The filter list, in the concept's order, with the sub-types folded into their class. */
export const CLASS_FILTERS = ['Normal', 'Super Saiyan', 'Ki-Blast', 'Power', 'Speed', 'Almighty', 'Rival', 'Fusion', 'Giant', 'Skill-User', 'God', 'Villain', 'Secret', 'Legendary Super Saiyan', 'Infinite Ki Android', 'Ki Drain Android'];
export const classFilterOf = (c) => c.class.label.replace(/ \(.*\)$/, '');
const LIGHT = new Set(['#f8fafc', '#eab308', '#a3e635', '#f9a8d4', '#06b6d4', '#facc15']);
export const chipText = (colour) => (LIGHT.has(colour) ? '#0a0d20' : '#fff');

/* ------------------------------------------------------------------ capsule types (referencedata/capsule-types.json) */
export const CAPSULE_TYPES = [
  { type: 'Melee', k: 'k-mel' }, { type: 'Blast', k: 'k-bla' }, { type: 'Ki Blast', k: 'k-kib' },
  { type: 'Defense', k: 'k-tou' }, { type: 'Ki Efficiency', k: 'k-ki' }, { type: 'Skill', k: 'k-skl' }, { type: 'Utility', k: 'k-mov' },
];
export const typeClass = (t) => CAPSULE_TYPES.find(x => x.type === t)?.k ?? 'k-mov';

/* ------------------------------------------------------------------ teams */
export const teamsOf = new Map();
for (const t of teams) for (const id of t.members) {
  if (!teamsOf.has(id)) teamsOf.set(id, []);
  teamsOf.get(id).push(t.name);
}

/* ------------------------------------------------------------------ skills and blasts */
export const skillOf = (c, slot) => skillsById[(c.skills || []).find(k => skillsById[k]?.slot === slot)] || null;
export const blastsOf = (c) => blastsById[c.id] || [];
/** Skills with an effect the engine applies can be switched on (evasions and one-off heals can't). */
export const toggleable = (s) => !!s && (s.armor || (s.phases || []).some(p => (p.effects || []).some(e => APPLIED_KEYS.has(e.key))));

/* ------------------------------------------------------------------ a side: character + build + conditions */
/**
 * A side's spec: { id, caps: [capsule id x up to 7], skills: { 1: bool, 2: bool }, stage: { 1: n, 2: n },
 * sparking: bool, sit: { hp (fraction of max, 1 = full), ki (bars), skill (count), map, events } | null }.
 */
export function emptySpec(id) {
  return { id, caps: [], skills: {}, stage: {}, sparking: false, sit: null };
}

function activeSkills(c, spec) {
  const out = [];
  for (const slot of [1, 2]) {
    const s = skillOf(c, slot);
    if (!s || !spec.skills?.[slot] || !toggleable(s)) continue;
    // a skill with stages applies the chosen stage (the engine takes the last phase of a staged skill)
    if (s.stages && spec.stage?.[slot]) out.push({ ...s, phases: s.phases.slice(0, spec.stage[slot]) });
    else out.push(s);
  }
  return out;
}

/** The situation the engine reads, from a spec's conditions (health as HP of this build's maximum). */
function situationOf(c, caps, spec) {
  if (!spec.sit) return null;
  const max = (c.stats.health ?? 0) + caps.reduce((s, x) => s + (x.effects || []).reduce((t, e) => t + (e.key === 'health' && !e.condition ? e.value : 0), 0), 0);
  return { health: Math.round((spec.sit.hp ?? 1) * max), ki: spec.sit.ki, skill: spec.sit.skill, map: spec.sit.map ?? null, events: spec.sit.events ?? {} };
}

/**
 * Evaluate one side: its effects and stats. `incoming` = the other side's opponent-targeted skill
 * effects (Vs opponent only). `keep` filters the applied effects by source (breakdowns).
 */
export function evaluate(spec, { incoming = [], otherCaps = [], keep = null } = {}) {
  const c = byId.get(spec.id);
  if (!c) return null;
  const caps = (spec.caps || []).map(id => capsuleById.get(id)).filter(Boolean);
  const skills = activeSkills(c, spec);
  const effects = collectEffects({ character: c, capsules: caps, skills, sparking: !!spec.sparking, incoming, situation: situationOf(c, caps, spec) });
  return viewOf({ c, spec, caps, skills, effects, otherCaps }, keep);
}

const LIGHT_BODY_NAME = capsuleById.get(LIGHT_BODY)?.name;
/**
 * A side's stats from its effects, keeping only the applied effects `filter` allows (null: all). Light Body
 * has no effect rows (its ki-blast defense is special-cased), so it is asked for as { source: 'Light Body' }.
 */
export function viewOf(side, filter = null) {
  const applied = filter ? side.effects.applied.filter(filter) : side.effects.applied;
  const view = computeStats(side.c, { ...side.effects, applied }, CTX);
  const lightBody = side.caps.some(x => x.id === LIGHT_BODY) && (!filter || filter({ source: LIGHT_BODY_NAME }));
  const aura = (side.otherCaps || []).some(x => x?.id === DRACONIC_AURA);
  const stats = applyLightBodyKiBlastArmor(view, lightBody, aura);
  return { ...side, applied: side.effects.applied, view: stats };
}

/** Both sides of a matchup; in Vs opponent each side's opponent-targeted skill effects reach the other. */
export function evaluatePair(a, b, { exchange = false } = {}) {
  const A0 = evaluate(a), B0 = b ? evaluate(b) : null;
  if (!B0) return { A: A0, B: null };
  if (!exchange) return { A: A0, B: B0 };
  const A = evaluate(a, { incoming: B0.effects.outgoing, otherCaps: B0.caps });
  const B = evaluate(b, { incoming: A0.effects.outgoing, otherCaps: A0.caps });
  return { A, B };
}

/* ------------------------------------------------------------------ breakdowns */
/**
 * The parts a value is made of: the base (no build, no conditions), then each source that changes it
 * (a capsule, a skill, Sparking, a condition), in order, with what it adds, then the value with the
 * build. Each part is the difference its source makes on top of the ones before, so they add up.
 * `fn(sides)` reads the value from { A, B } sides (each with its `view`); sources come from both sides.
 */
export function breakdown(pair, fn) {
  const sides = [['A', pair.A], ['B', pair.B]].filter(([, s]) => s);
  const sources = [];
  const add = (k, name, effects) => {
    const id = `${k}|${name}`;
    if (!sources.some(x => x.id === id)) sources.push({ id, side: k, name, effects });
  };
  for (const [k, s] of sides) {
    for (const e of s.applied) add(k, e.source, s.applied.filter(x => x.source === e.source));
    if (s.caps.some(x => x.id === LIGHT_BODY)) add(k, LIGHT_BODY_NAME, []);
  }
  const run = (allowed, extra = null) => {
    const views = {};
    for (const [k, s] of sides) views[k] = viewOf(s, e => e === extra || allowed.has(`${k}|${e.source}`));
    return fn(views);
  };
  const on = new Set();
  const base = run(on);
  const rows = [];
  let prev = base;
  for (const src of sources) {
    const before = new Set(on);
    on.add(src.id);
    const v = run(on);
    if (typeof v === 'number' && typeof prev === 'number' && Math.abs(v - prev) > 1e-9) {
      // which of the source's effects matter for this value (they label the row)
      const matters = src.effects.filter(e => Math.abs(run(before, e) - prev) > 1e-9);
      rows.push({ name: src.name, side: src.side, delta: v - prev, effects: matters });
    }
    prev = v;
  }
  return { base, rows, final: prev };
}

/* ------------------------------------------------------------------ roster ranges */
const BASE = new Map(characters.map(c => [c.id, evaluate(emptySpec(c.id)).view]));
export const baseView = (id) => BASE.get(id);
const pct = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))]; };
const RANGES = {};
function range(key, get) {
  if (!RANGES[key]) {
    const vals = characters.map(c => get(BASE.get(c.id), c)).filter(v => typeof v === 'number' && Number.isFinite(v));
    RANGES[key] = { lo: pct(vals, 0.05), hi: pct(vals, 0.95), min: Math.min(...vals), max: Math.max(...vals) };
  }
  return RANGES[key];
}
/** Where a value sits in the roster's range (5th to 95th percentile), 0..1; flipped when less is better. */
export function rosterPos(key, get, value, lessIsBetter = false) {
  const r = range(key, get);
  if (typeof value !== 'number' || r.hi === r.lo) return null;
  const p = Math.max(0, Math.min(1, (value - r.lo) / (r.hi - r.lo)));
  return lessIsBetter ? 1 - p : p;
}
/** Chevrons lit (of 10) for a rate, from the roster's slowest to its fastest. */
export function chevrons(key, get, value) {
  const r = range(key, get);
  if (typeof value !== 'number' || r.max === r.min) return 5;
  return Math.max(1, Math.min(10, Math.round(1 + 9 * (value - r.min) / (r.max - r.min))));
}

/* ------------------------------------------------------------------ the numbers the views show */
export const skillRate = (v) => (typeof v.skillRegen === 'string' ? parseFloat(v.skillRegen) : v.skillRegen);
export const fiveHitTaken = (v) => v.melee;
export const fiveHitTakenArmored = (v) => {
  const def = v.meleeDefenseStat ?? 1, armor = v.armor ?? 0, hits = v.referenceHits || [];
  const breakOn = v.armorBreak ?? 5;
  return hits.reduce((s, h, i) => s + damageTaken(h, def, armor > 0 && i + 1 < breakOn ? 1 - armor : 1), 0);
};
export const volley = (v, opp = null) => kiBlastVolley(v, opp ? { opponentStats: opp } : {});
export const ch = scaleChannel;

/** The values of the charge levels and other game-file moves, scaled by the side's build. */
export function gameMoves(side) {
  const { c, view: v } = side;
  const sc = (chn, x) => (typeof x === 'number' ? scaleChannel(v, chn, x) : x);
  const kb = c.kiBlasts || {};
  const chargedStand = kb.charged?.standing, chargedMove = kb.charged?.moving;
  const cm = c.chargedMelee || {};
  return {
    smash: (cm.smash || [v.smash]).map(x => sc('smash', x)),
    hyperSmash: sc('smash', cm.hyperSmash),
    heavyFinish: (cm.heavyFinish || []).map(x => sc('combo', x)),
    charged: chargedStand && { damage: chargedStand.damage.map(x => sc('chargedKiBlast', x)), shots: chargedStand.shots, cost: chargedStand.cost, tags: chargedStand.tags, limit: kb.charged.limit },
    chargedMoving: chargedMove && { damage: chargedMove.damage.map(x => sc('chargedKiBlast', x)), shots: chargedMove.shots, cost: chargedMove.cost },
    jump: kb.jump?.normal && { damage: sc('kiBlast', kb.jump.normal.damage), count: kb.jump.normal.count, cost: kb.jump.normal.cost, tags: kb.jump.normal.tags },
    jumpCharged: kb.jump?.charged && { damage: kb.jump.charged.damage.map(x => sc('chargedKiBlast', x)), shots: kb.jump.charged.shots, cost: kb.jump.charged.cost },
    dash: kb.dash?.normal && { damage: sc('kiBlast', kb.dash.normal.damage), count: kb.dash.normal.count, cost: kb.dash.normal.cost },
    dashCharged: kb.dash?.charged && { damage: kb.dash.charged.damage.map(x => sc('chargedKiBlast', x)), shots: kb.dash.charged.shots, cost: kb.dash.charged.cost },
    kiBlastTags: kb.normal?.tags || [],
  };
}

/** A Rush Chain type's damage at each charge level and its follow-ups' totals, scaled by the build (combo channel). */
export function chainDamage(side, type) {
  const d = side.c.rushChainDamage?.[type];
  if (!d) return null;
  const sc = (x) => scaleChannel(side.view, 'combo', x);
  const fus = Object.entries(d.followUps || {}).map(([name, f]) => ({
    name, hits: f.hits.map(sc), total: f.hits.map(sc).reduce((s, x) => s + x, 0), needsFullCharge: !!f.needsFullCharge, flurry: f.kiBlastFlurry || null,
  }));
  return { damage: d.damage.map(sc), chargeable: d.chargeable !== false, hits: d.hits, followUps: fus };
}

/** Rush Chains 1-4 with the chain each leads to, and the moveset's other entries. */
export function moveset(side) {
  const m = side.c.moveset || {};
  const chains = (m.rushChains || []).map((r, i) => ({ n: i + 1, type: r.type, followUps: r.followUps || [], dmg: r.type ? chainDamage(side, r.type) : null }));
  const grand = side.c.rushChainDamage?.['Grand Slash'] ? { ...chainDamage(side, 'Grand Slash'), allowed: m.grandSlash?.followUps || [] } : null;
  const lift = side.c.rushChainDamage?.['Lift Strike'] ? chainDamage(side, 'Lift Strike') : null;
  return { chains, grand, lift, stepIn: m.stepInChain, rushIn: m.rushInAttack, counter: m.counter, pursuits: m.pursuits || {}, unavailable: m.unavailable || [], abilities: m.abilities || [] };
}
export const perceptionName = (x) => (x == null ? 'None' : x === 'Standard' ? 'Standard strike' : x);

/** Every chain type the character has, once, with the Rush Chains that lead to it. */
export function chainTypes(side) {
  const ms = moveset(side);
  const types = [];
  for (const ch of ms.chains) {
    if (!ch.type) continue;
    const t = types.find(x => x.type === ch.type);
    if (t) t.slots.push(ch.n); else types.push({ type: ch.type, slots: [ch.n], dmg: ch.dmg, followUps: ch.followUps });
  }
  return { types, ms };
}

/* ------------------------------------------------------------------ armor */
export const ARMOR_ROWS = [
  ['Rush hit 1', (b) => b.rush?.[0]], ['Rush hit 2', (b) => b.rush?.[1]], ['Rush hit 3', (b) => b.rush?.[2]], ['Rush hit 4', (b) => b.rush?.[3]],
  ['Smash Lv.1', (b) => b.smash?.[0]], ['Ki blast', (b) => b.kiBlast], ['Charged ki blast', (b) => b.chargedKiBlast?.[2]],
];
/** Does an attack break Hyper Armor (2), Sparking Armor (3), Hyper in Sparking (4)? From the engine's break levels. */
export function armorBreaks(view, sparkingUp = 0) {
  const b = view.breakLevels;
  if (!b) return null;
  return ARMOR_ROWS.map(([label, get]) => {
    const lv = get(b);
    const at = (lv ?? -99) + sparkingUp;
    return { label, hyper: at >= 2, sparking: at >= 3, hyperSparking: at >= 4 };
  });
}

/* ------------------------------------------------------------------ effects in words */
const DAMAGE_KEYS = ['rushDamage', 'smashDamage', 'comboDamage', 'throwDamage', 'counterDamage', 'followUpDamage', 'kiBlastDamage', 'chargedKiBlastDamage', 'superDamage', 'ultimateDamage'];
const GROUPS = [
  { label: 'All damage', short: 'All damage', keys: DAMAGE_KEYS, sub: 'Melee, ki blasts, blasts and ultimates' },
  { label: 'Melee damage', short: 'Melee', keys: ['rushDamage', 'smashDamage', 'comboDamage', 'throwDamage', 'counterDamage', 'followUpDamage'], sub: 'Rush, smash, Rush Chains, throw, counter, follow-ups' },
  { label: 'Ki blast damage', short: 'Ki blasts', keys: ['kiBlastDamage', 'chargedKiBlastDamage'], sub: 'Normal and charged' },
  { label: 'Blast damage', short: 'Blasts', keys: ['superDamage', 'ultimateDamage'], sub: 'Blasts and ultimates' },
  { label: 'Defense', short: 'Defense', keys: ['physicalResist', 'energyResist', 'blastResist', 'guardResist'], sub: 'Melee, ki blasts, blasts and guarded hits' },
  { label: 'Defense', short: 'Defense', keys: ['physicalResist', 'energyResist', 'guardResist'], sub: 'Melee, ki blasts and guarded hits' },
  { label: 'Defense', short: 'Defense', keys: ['allResist'], sub: 'Every attack' },
  { label: 'Smash and Rush Chains', short: 'Smash and Rush Chains', keys: ['smashDamage', 'comboDamage'], sub: null },
  { label: 'Blast damage', short: 'Blasts', keys: ['superDamage', 'ultimateDamage', 'blastComboDamage'], sub: 'Blasts and ultimates' },
];
const SHORT = {
  rushDamage: ['Rush damage', 'Rush'], smashDamage: ['Smash damage', 'Smash'], comboDamage: ['Rush Chain damage', 'Rush Chains'],
  throwDamage: ['Throw damage', 'Throw'], counterDamage: ['Counter damage', 'Counter'], followUpDamage: ['Follow-up damage', 'Follow-ups'],
  kiBlastDamage: ['Ki blast damage', 'Ki blasts'], chargedKiBlastDamage: ['Charged ki blast damage', 'Charged ki blasts'],
  superDamage: ['Blast damage', 'Blasts'], ultimateDamage: ['Ultimate damage', 'Ultimates'], skillDamage: ['Skill damage', 'Skill damage'],
  allDamage: ['All damage', 'All damage'], physicalResist: ['Melee defense', 'Melee defense'], energyResist: ['Ki-blast defense', 'Ki-blast defense'],
  blastResist: ['Blast defense', 'Blast defense'], guardResist: ['Guarded-hit defense', 'Guard'], allResist: ['Defense', 'Defense'],
  health: ['Max health', 'HP'], startingKi: ['Starting ki', 'Starting ki'], skillStart: ['Starting skill gauge', 'Skill start'],
  kiBlastCount: ['Ki blast limit', 'Ki blast limit'], kiCharge: ['Ki charge', 'Ki charge'], kiRecovery: ['Ki regen', 'Ki regen'],
  attackKiGain: ['Ki from hits', 'Ki from hits'], kiBlastCost: ['Ki blast cost', 'Ki blast cost'], skillRecovery: ['Skill gauge gain', 'Skill gain'],
  shortDashCost: ['Short dash cost', 'Short dash cost'], switchRecovery: ['Switch recovery', 'Switch'], sparkingCharge: ['Sparking charge', 'Sparking charge'],
  sparkingDrain: ['Sparking drain', 'Sparking drain'], preSparkingDrain: ['Pre-Sparking drain', 'Pre-Sparking drain'], armorLevel: ['Armor', 'Armor'],
  armorBreakLevel: ['Armor break level', 'Armor break'], blastKiCost: ['Blast cost', 'Blast cost'], ultimateKiCost: ['Ultimate cost', 'Ultimate cost'],
  kiRestore: ['Ki restored', 'Ki'], kiPerSecond: ['Ki per second', 'Ki per sec'], healthRestore: ['Health restored', 'Health'],
  healthRestoreFraction: ['Health restored', 'Health'], meleeCharge: ['Melee charge time', 'Melee charge'], kiShotCharge: ['Ki blast charge time', 'Charge time'],
  comboScaling: ['Combo scaling', 'Combo scaling'], blastComboDamage: ['Blast combo damage', 'Blast combos'],
  vanishingAttackDamage: ['Vanishing Attack damage', 'Vanishing Attack'], dragonSmashDamage: ['Dragon Smash damage', 'Dragon Smash'],
  vanishingLimit: ['Vanishing Attack uses', 'Vanishing uses'], dragonHomingLimit: ['Dragon Homing uses', 'Dragon Homing uses'],
};
const PCT_KINDS = new Set(['vanishingAttackDamage', 'dragonSmashDamage', 'rushDamage', 'smashDamage', 'comboDamage', 'throwDamage', 'counterDamage', 'followUpDamage', 'kiBlastDamage', 'chargedKiBlastDamage', 'superDamage', 'ultimateDamage', 'skillDamage', 'allDamage', 'physicalResist', 'energyResist', 'blastResist', 'guardResist', 'allResist', 'kiCharge', 'kiRecovery', 'attackKiGain', 'kiBlastCost', 'skillRecovery', 'shortDashCost', 'switchRecovery', 'sparkingCharge', 'sparkingDrain', 'preSparkingDrain', 'meleeCharge', 'kiShotCharge', 'comboScaling', 'blastComboDamage', 'moveSpeed']);
const signed = (n, d = 1) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(+n.toFixed(d)).toLocaleString('en-US')}`;
export function effectValueText(e) {
  if (e.op === 'set') return e.value === 'max' ? 'full' : `set to ${e.value}`;
  const v = e.value;
  if (typeof v !== 'number') return '';
  if (e.key === 'healthRestoreFraction') return `${v}%`;
  if (e.key === 'blastKiCost' || e.key === 'ultimateKiCost' || e.key === 'startingKi') return `${signed(v)} bar${Math.abs(v) === 1 ? '' : 's'}`;
  if (e.key === 'armorLevel') return 'Yes';
  if (PCT_KINDS.has(e.key)) return `${signed(v * 100, 1)}%`;
  return signed(v, 3);
}
/** Effects of one source added up per key (a capsule's health steps: Fury! +5% three times reads +15%). */
export function sumByKey(effects) {
  const out = new Map();
  for (const e of effects) {
    if (typeof e.value !== 'number' || e.op === 'set') { out.set(Symbol(), e); continue; }
    const k = e.key + (e.target || '');
    out.set(k, out.has(k) ? { ...out.get(k), value: +(out.get(k).value + e.value).toFixed(6) } : { ...e });
  }
  return [...out.values()];
}
/** Group a list of effects into tiles: { label, short, sub, value, neg, keys }. */
export function effectTiles(effects, { summed = false } = {}) {
  const list = (summed ? sumByKey(effects) : effects).filter(e => typeof e.value === 'number' || e.op === 'set');
  const used = new Set();
  const out = [];
  for (const g of GROUPS) {
    const hit = g.keys.map(k => list.find(e => e.key === k && !used.has(e)));
    if (hit.some(x => !x)) continue;
    if (!hit.every(e => e.value === hit[0].value)) continue;
    hit.forEach(e => used.add(e));
    out.push({ label: g.label, short: g.short, sub: g.sub, value: effectValueText(hit[0]), neg: hit[0].value < 0, keys: g.keys });
  }
  const all = out.some(t => t.label === 'All damage');
  for (const e of list) {
    if (used.has(e) || !SHORT[e.key]) continue;
    if (all && (e.key === 'skillDamage' || e.key === 'interruptDamage')) continue;
    out.push({ label: SHORT[e.key][0], short: SHORT[e.key][1], sub: null, value: effectValueText(e), neg: typeof e.value === 'number' && e.value < 0 && !/Cost|cost|Drain|Charge$/.test(e.key), keys: [e.key] });
  }
  return out;
}
/** One short line for a capsule's effects ("Rush +2.5%"); conditions say when. */
export function capsuleSummary(cap) {
  const always = (cap.effects || []).filter(e => !e.condition && e.key !== 'display');
  const parts = effectTiles(always).map(t => `${t.short} ${t.value}`);
  const conds = (cap.effects || []).filter(e => e.condition && e.key !== 'display');
  if (conds.length) {
    const first = conds[0];
    const tiles = effectTiles([first]);
    const c = parseCondition(first.condition);
    const when = c.kind === 'sparking' ? 'in Sparking!' : c.kind === 'healthPct' ? `at ${Math.round(c.max * 100)}% health and below` : first.condition;
    if (tiles[0]) parts.push(`${tiles[0].short} ${tiles[0].value} ${when}`);
  }
  for (const e of cap.effects || []) if (e.key === 'display' && e.note) parts.push(e.note);
  if (!parts.length && cap.description) parts.push(cap.description.replace(/\.$/, ''));
  return parts.join(', ');
}
/** What a side's equipped capsules need from the conditions controls. */
export function conditionNeedsOf(side) {
  const needs = { health: [], map: [], event: [] };
  for (const cap of side.caps) for (const e of cap.effects || []) {
    if (!e.condition) continue;
    const c = parseCondition(e.condition);
    const n = conditionNeeds(c);
    if (n && !needs[n].some(x => x.name === cap.name && x.cond.kind === c.kind && x.cond.max === c.max && x.cond.map === c.map && x.cond.event === c.event)) needs[n].push({ name: cap.name, cond: c });
  }
  for (const p of side.c.passives || []) {
    const c = parseCondition(p.condition);
    if (conditionNeeds(c) === 'health') needs.health.push({ name: 'Power-up', cond: c, passive: true });
  }
  return needs;
}

/* ------------------------------------------------------------------ moves */
export const SLOT_LABEL = { 'Super 1': 'B1', 'Super 2': 'B2', Ultimate: 'ULT' };
export function blastType(b) {
  if (b.flags?.includes('crash')) return 'Crash';
  if (b.type === 'Throw') return 'Grab';
  return b.category;
}
export const isRushLike = (b) => b.category === 'Rush' || b.type === 'Throw';
export function blastTiles(b) {
  const t = [];
  const clash = b.flags?.includes('beamClashCapable') ? 'Beam clash' : b.flags?.includes('dashClashCapable') ? 'Speed clash' : null;
  if (clash) t.push(['Clash', clash, clash.replace(' clash', '')]);
  if (b.impactPower != null) t.push(['Impact power', b.impactPower, b.impactPower, 'Impact']);
  if (b.projectileSpeed != null) t.push(['Speed', b.projectileSpeed.toLocaleString('en-US')]);
  if (isRushLike(b)) {
    const tr = b.flags?.includes('homing') ? 'Homing' : b.flags?.includes('steering') ? 'Steering' : b.flags?.includes('straight') ? 'Straight' : null;
    if (tr) t.push(['Tracking', tr]);
    if (b.lungeSpeed != null) t.push(['Lunge speed', b.lungeSpeed.toLocaleString('en-US'), null, 'Lunge']);
  }
  if (b.moveLimitTime != null) t.push(['Time limit', `${b.moveLimitTime}s`]);
  return t.map(([label, value, short, shortLabel]) => ({ label, value: String(value), short: String(short ?? value), shortLabel: shortLabel ?? label }));
}
export function blastTags(b) {
  const t = [];
  const bars = (x) => +(x / 10000).toFixed(2);
  if (b.triggerKi != null && b.kiCost != null && b.triggerKi !== b.kiCost && b.slot !== 'Ultimate') t.push(['Initial cost', `${bars(b.triggerKi)} bars`]);
  if (b.flags?.includes('lockOnNeeded')) t.push(['Lock-on required']);
  if (b.flags?.includes('noStepBack')) t.push(['No Step Back']);
  if (b.flags?.includes('unblockable') || b.traits?.includes('Unguardable')) t.push(['Unguardable']);
  if (b.traits?.includes('Cinematic')) t.push(['Cinematic']);
  if (b.traits?.includes('Chargeable')) t.push(['Chargeable']);
  if (b.flags?.includes('audienceFlees')) t.push(['Audience flees']);
  if (b.flags?.includes('destroyMap')) t.push(['Destroys map']);
  if (b.flags?.includes('targetGiant')) t.push(['Targets giants']);
  return t;
}
export const kiBars = (b) => (b.kiCost != null ? +(b.kiCost / 10000).toFixed(2) : null);
/** A blast's damage with the build (base and Boosted scale on the super or ultimate channel). */
export function blastDamage(side, b) {
  const chn = b.slot === 'Ultimate' ? 'ultimate' : 'super';
  return { damage: scaleChannel(side.view, chn, b.damage, b.hits), boosted: scaleChannel(side.view, chn, b.boostedDamage), base: b.damage, boostedBase: b.boostedDamage, chn };
}
export function selfDamageText(b, oppDp = null) {
  const s = b.selfDamage;
  if (!s) return null;
  if (s.allHealth || s.power >= 999999) return { amount: 'All health', note: 'Leaves you at 0 HP; self-damage can\'t knock you out' };
  if (s.dpMultiplier) {
    if (oppDp != null) return { amount: `${Math.round(s.power * s.dpMultiplier[oppDp]).toLocaleString('en-US')} HP`, note: `Against DP ${oppDp}` };
    const lo = Math.round(s.power * Math.min(...s.dpMultiplier.slice(1))), hi = Math.round(s.power * Math.max(...s.dpMultiplier));
    return { amount: `${lo.toLocaleString('en-US')} to ${hi.toLocaleString('en-US')} HP`, note: 'By the opponent\'s DP' };
  }
  return { amount: `${s.power.toLocaleString('en-US')} HP`, note: b.special?.includes('repeatedly') ? 'Per use' : null };
}

export const SKILL_TYPE = (s) => (s.display?.type || 'Skill').split('/')[0];
export function skillTiles(s) {
  const t = [];
  const at = s.display?.activationTime;
  t.push(['Activation', at ? `${at}s` : 'Instant']);
  t.push(['Targets', s.display?.affectsOpponent ? 'Opponent' : 'Self']);
  if (s.armor) t.push(['Armor', 'Hyper Armor']);
  return t.map(([label, value]) => ({ label, value }));
}
export function skillTags(s) {
  const t = [];
  if (s.display?.unblockable) t.push(['Unguardable']);
  if (s.display?.cutscene) t.push(['Cutscene']);
  if (s.display?.interrupts) t.push(['Interrupts']);
  return t;
}
/**
 * A skill's effect tiles, phase by phase (a phase that lasts a different time shows its own time), with
 * Instant ki and Instant Sparking as effects. For a staged skill, the chosen stage only.
 */
export function skillEffectTiles(s, stage = null) {
  const out = [];
  if (s.display?.instantKi) out.push({ label: 'Instant ki', short: 'Instant ki', value: s.display.kiAmount != null ? `${s.display.kiAmount} bars` : 'Yes', kind: 'kiv' });
  if (s.display?.instantSparking) out.push({ label: 'Instant Sparking', short: 'Instant Sparking', value: 'Yes', kind: 'spk' });
  const phases = s.stages ? [s.phases[(stage || s.phases.length) - 1]] : s.phases || [];
  for (const p of phases) {
    const tiles = effectTiles(p.effects || []);
    const time = !s.stages && p.duration && s.duration && p.duration !== s.duration ? `${p.duration}s` : null;
    for (const t of tiles) out.push({ ...t, time, kind: t.neg ? 'neg' : null });
  }
  return out;
}

/* ------------------------------------------------------------------ similar fighters */
const CORE = [
  ['HP', (v) => v.health, 'int'], ['Rush 5-hit', (v) => v.rush5Hit, 'int'], ['Smash', (v) => v.smash, 'int'], ['Throw', (v) => v.throw, 'int'],
  ['Ki blast', (v) => v.kiBlastDmg, 'int'], ['Melee defense', (v) => v.meleeDefenseStat, 'def'], ['Ki charge', (v) => v.kiCharge, 'rate'],
  ['Skill gauge limit', (v) => v.skillLimit, 'int'], ['Armor break', (v) => v.armorBreak, 'hits'],
];
/** Fighters whose core stats are closest: same DP first (what differs), then the nearest at other DPs. */
export function similarFighters(id, n = 5, m = 3) {
  const me = BASE.get(id), c = byId.get(id);
  const diffs = (o) => CORE.filter(([, get]) => get(o) !== get(me)).map(([label, get, kind]) => ({ label, value: get(o), kind }));
  const dist = (o) => CORE.reduce((s, [, get]) => { const a = get(me), b = get(o); return s + (a === b ? 0 : Math.abs(a - b) / (Math.abs(a) + Math.abs(b) || 1)); }, 0);
  const others = characters.filter(o => o.id !== id).map(o => ({ c: o, v: BASE.get(o.id) }));
  const same = others.filter(o => o.c.dp === c.dp).map(o => ({ ...o, d: dist(o.v), diffs: diffs(o.v) })).sort((a, b) => a.d - b.d).slice(0, n);
  const other = others.filter(o => o.c.dp !== c.dp).map(o => ({ ...o, d: dist(o.v), diffs: diffs(o.v) })).sort((a, b) => a.d - b.d).slice(0, m);
  return { same, other };
}

/* ------------------------------------------------------------------ rules */
export const rulesetOf = (name) => meta.rulesets.find(r => r.name === name) || meta.rulesets.find(r => r.name === meta.defaultRuleset);
export function buildCheck(capIds, ruleset) {
  const caps = capIds.map(id => capsuleById.get(id)).filter(Boolean);
  const cost = caps.reduce((s, x) => s + (x.cost || 0), 0);
  const banned = new Set(ruleset.banned);
  const groups = (ruleset.groups || []).map(g => {
    const ids = new Set(g.ids);
    return { ...g, cost: caps.filter(x => ids.has(x.id)).reduce((s, x) => s + x.cost, 0) };
  });
  const problems = [];
  if (cost > ruleset.totalCost) problems.push(`Over the budget: ${cost} of ${ruleset.totalCost} points`);
  for (const g of groups) if (g.cost > g.maxCost) problems.push(`Attack boosts over the cap: ${g.cost} of ${g.maxCost} points`);
  for (const x of caps) if (banned.has(x.id)) problems.push(`${x.name} is banned in ${ruleset.name}`);
  const seen = new Set();
  for (const x of caps) { if (seen.has(x.id)) problems.push(`${x.name} is equipped twice`); seen.add(x.id); }
  return { caps, cost, groups, problems };
}
export const inAttackGroup = (ruleset, id) => (ruleset.groups || []).some(g => g.ids.includes(id));

/* ------------------------------------------------------------------ exchange (Vs opponent) */
/** What A's attacks deal to B after B's defenses and armor. */
export function exchange(A, B) {
  const a = A.view, b = B.view;
  const combo = calcOutgoingCombo(a, b);
  const gm = gameMoves(A);
  const blastDef = b.blastDefense ?? 1, kiDef = b.energy ?? 1, melDef = b.meleeDefenseStat ?? 1;
  const af = (lv) => armorFactor(lv, b);
  const bl = a.breakLevels || {};
  const one = (x, def, lv) => (typeof x === 'number' ? damageTaken(x, def, af(lv)) : null);
  const blasts = blastsOf(A.c).map(bb => {
    const d = blastDamage(A, bb);
    let dmg = d.damage;
    if (bb.flags?.includes('wickednessScaled')) dmg = Math.round(dmg * (B.c.wickedness ?? 0) / 20);
    if (bb.selfDamage?.dpMultiplier) dmg = Math.round(dmg * bb.selfDamage.dpMultiplier[B.c.dp]);
    return { b: bb, deal: typeof dmg === 'number' ? damageTaken(dmg, blastDef) : null };
  });
  return {
    combo,
    smash: gm.smash.map((x, i) => ({ v: one(x, melDef, bl.smash?.[i]), held: af(bl.smash?.[i]) < 1 })),
    heavyFinish: gm.heavyFinish.map((x, i) => ({ v: one(x, melDef, bl.heavyFinish?.[i]), held: af(bl.heavyFinish?.[i]) < 1 })),
    throw: { v: one(a.throw, melDef, bl.throw), held: af(bl.throw) < 1 },
    kiBlast: { v: one(a.kiBlastDmg, kiDef, bl.kiBlast), held: af(bl.kiBlast) < 1 },
    volley: volley(a, b),
    charged: gm.charged ? gm.charged.damage.map((x, i) => ({ v: one(x, kiDef, bl.chargedKiBlast?.[i]), held: af(bl.chargedKiBlast?.[i]) < 1, shots: gm.charged.shots })) : [],
    hyperSmash: { v: one(gm.hyperSmash, melDef, bl.hyperSmash), held: af(bl.hyperSmash) < 1 },
    pursuit: typeof a.pursuit === 'number' ? damageTaken(a.pursuit, melDef) : null,
    vanishingAttack: typeof a.vanishingAttack === 'number' ? damageTaken(a.vanishingAttack, melDef) : null,
    dragonSmash: typeof a.dragonSmash === 'number' ? damageTaken(a.dragonSmash, melDef) : null,
    lightningAttack: typeof a.lightningAttack === 'number' ? damageTaken(a.lightningAttack, melDef) : null,
    jump: gm.jump ? one(gm.jump.damage, kiDef, bl.kiBlast) : null,
    dash: gm.dash ? one(gm.dash.damage, kiDef, bl.kiBlast) : null,
    // Rush Chains and their follow-ups after B's melee defense (their break levels are not in the data, so no armor)
    chain: (x) => (typeof x === 'number' ? damageTaken(x, melDef) : null),
    blasts,
  };
}
export const fiveHitAgainst = (A, B) => calcFiveHitDamageTaken(B.view, A.view)?.total;
