// The demo's data: the published files, run through the app's own adapter and engine.
import characters from '../../public/data/characters.json';
import skills from '../../public/data/skills.json';
import blasts from '../../public/data/blasts.json';
import capsules from '../../public/data/capsules.json';
import teams from '../../public/data/teams.json';
import meta from '../../public/data/meta.json';
import effectsCsv from '../../data/curated/effects.csv';
import { toLegacy } from '../../src/data/adapter.js';
import { collectEffects, computeStats, APPLIED_KEYS, sparkingUltimateBonus } from '../../src/utils/engine.js';
import { applyLightBodyKiBlastArmor } from '../../src/utils/calculator.js';
import { LIGHT_BODY, DRACONIC_AURA, hasCapsule } from '../../src/utils/specialCapsules.js';
import { slugifyCharacterName } from '../../../analyzer/src/utils/characterSlug.js';

export const data = { characters, skills, blasts, capsules, teams, meta };
export { meta };
export const legacy = toLegacy(data, { appliedKeys: APPLIED_KEYS, ultimateVariants: true });

export const byId = new Map(characters.map(c => [c.id, c]));
export const legacyById = new Map(legacy.characters.map(c => [c.id, c]));
export const slugOf = new Map(characters.map(c => [c.id, slugifyCharacterName(c.name)]));
export const idOfSlug = new Map(characters.map(c => [slugifyCharacterName(c.name), c.id]));
export const capsuleById = new Map(capsules.map(c => [c.id, c]));
export const referenceHits = byId.get(meta.referenceAttacker)?.stats?.hits || null;
export const referenceName = byId.get(meta.referenceAttacker)?.name || 'the reference attacker';

/** Teams each character is on (website master lists). */
export const teamsOf = new Map();
for (const t of teams) for (const id of t.members) {
  if (!teamsOf.has(id)) teamsOf.set(id, []);
  teamsOf.get(id).push(t.name);
}

/** Effect vocabulary: key -> { label, kind }. */
export const EFFECT = {};
for (const line of effectsCsv.split(/\r?\n/).slice(1)) {
  if (!line.trim()) continue;
  const [key, label, kind] = line.split(',');
  EFFECT[key] = { label, kind };
}

export const effectLabel = (key) => EFFECT[key]?.label || key;

/** The engine words a note "<key> <value>" when the effect has no note; give it the vocabulary's label. */
export const noteText = (t) => t.replace(/^([a-z][A-Za-z]+)(?= )/, (k) => EFFECT[k]?.label || k);

/** "+20%", "+2,500", "x 1" ... for an effect value. */
export function effectValue(e) {
  if (e.op === 'set') return e.value === 'max' ? 'set to max' : `set to ${e.value}`;
  const v = e.value;
  if (e.key === 'useCount') return String(v);
  if (typeof v !== 'number') return String(v ?? '');
  const kind = EFFECT[e.key]?.kind;
  if (kind === 'flat' || kind === 'level' || Math.abs(v) >= 1) {
    const n = Math.abs(v) >= 1000 ? v.toLocaleString() : String(+v.toFixed(3));
    return v > 0 ? `+${n}` : n;
  }
  const pct = +(v * 100).toFixed(2);
  return `${pct > 0 ? '+' : ''}${pct}%`;
}

/**
 * Effects as [label, value, effect] pairs, a run of the same bonus on every damage channel merged
 * into one "All damage" pair (the game files list them channel by channel).
 */
export function mergedEffects(effects) {
  if (!effects?.length) return [];
  const DMG = ['rushDamage', 'smashDamage', 'comboDamage', 'throwDamage', 'counterDamage', 'followUpDamage', 'interruptDamage', 'kiBlastDamage', 'chargedKiBlastDamage', 'skillDamage', 'superDamage', 'ultimateDamage'];
  const dmg = effects.filter(e => DMG.includes(e.key) && !e.condition && e.target !== 'opponent');
  const sameAll = dmg.length >= 10 && dmg.every(e => e.value === dmg[0].value);
  const out = [];
  if (sameAll) out.push(['All damage', effectValue(dmg[0]), dmg[0]]);
  for (const e of sameAll ? effects.filter(x => !dmg.includes(x)) : effects) {
    out.push([`${effectLabel(e.key)}${e.target === 'opponent' ? ' (opponent)' : ''}`, effectValue(e), e]);
  }
  return out;
}

/** A short line for a list of effects. */
export function effectsLine(effects) {
  return mergedEffects(effects).map(([l, v]) => `${l} ${v}`).join(' · ');
}

/** Where a character value came from, in words (characters.json provenance). */
const SOURCE_WORDS = [
  [/^capsulecorp$/, 'Capsule Corp sheet'],
  [/^game$/, 'Game files'],
  [/^game files \(steps (.+)\)$/, 'Game files (step data $1)'],
  [/^game formula$/, 'Game formula'],
  [/^game class \(Capsule Corp used (.+)\)$/, 'Rescaled to the game class (Capsule Corp used $1)'],
  [/^formula \(Capsule Corp value impossible\)$/, 'Game formula (Capsule Corp value was impossible)'],
];
export function sourceOf(c, field) {
  const hits = Object.entries(c.provenance || {}).filter(([, f]) => f.includes(field)).map(([s]) => s);
  if (!hits.length) return null;
  return hits.map(s => {
    for (const [re, w] of SOURCE_WORDS) if (re.test(s)) return s.replace(re, w);
    return s;
  }).join('; then ');
}

/** The engine for one side, as App.jsx runs it (sideEffects + sideStats). */
export function sideEffects(id, capsuleIds = [], skillSlots = [], sparking = false, incoming = []) {
  const c = byId.get(id);
  if (!c) return null;
  const caps = capsuleIds.map(x => capsuleById.get(x)).filter(Boolean);
  const sk = skillSlots.map(n => skills[(c.skills || []).find(k => skills[k]?.slot === n)]).filter(Boolean);
  return { c, caps, sk, sparking, effects: collectEffects({ character: c, capsules: caps, skills: sk, sparking, incoming }) };
}

export function sideStats(side, otherCapsuleIds = []) {
  if (!side) return null;
  const lc = legacyById.get(side.c.id);
  const view = computeStats(side.c, side.effects, {
    referenceHits, damageConstant: meta.damageConstant, skillDamage: [lc.skill1Damage, lc.skill2Damage],
  });
  const other = otherCapsuleIds.map(x => capsuleById.get(x));
  return applyLightBodyKiBlastArmor({ ...lc, ...view }, hasCapsule(side.caps, LIGHT_BODY), hasCapsule(other, DRACONIC_AURA));
}

/** Base stats (no build) for a character, through the engine so every page reads the same shape. */
const baseCache = new Map();
export function baseStats(id) {
  if (!baseCache.has(id)) baseCache.set(id, sideStats(sideEffects(id)));
  return baseCache.get(id);
}

export function skillOf(c, slot) {
  return skills[(c.skills || []).find(k => skills[k]?.slot === slot)] || null;
}

export function blastsOf(c) {
  return blasts[c.id] || [];
}

export const ultimateWithSparking = (c, b) => (b.slot === 'Ultimate' ? sparkingUltimateBonus(c) : 0);

export const CLASS_LABELS = [...new Set(characters.map(c => c.class.label))].sort();
export const TEAM_NAMES = teams.map(t => t.name);
