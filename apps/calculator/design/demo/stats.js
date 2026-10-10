// Every stat the demo shows: label, format, which way is better, how to read it from an engine
// view, and its breakdown (the parts a number is made of, each with its source).
import { CHANNEL_OF } from '../../src/utils/engine.js';
import { kiBlastVolley, calcFiveHitArmorDamage } from '../../src/utils/calculator.js';
import { meta, sourceOf, effectLabel, effectValue, referenceName, referenceHits } from './data.js';

const K = meta.damageConstant;
const n0 = (v) => (typeof v === 'number' ? Math.round(v).toLocaleString() : '—');
const sign = (v, d = 0) => `${v >= 0 ? '+' : '−'}${Math.abs(+v.toFixed(d))}`;
const pct = (v, d = 0) => `${sign(v * 100, d)}%`;

export const FMT = {
  int: n0,
  // a defense multiplier: 0.9 = takes 10% less = "+10%"
  def: (v) => (typeof v !== 'number' ? '—' : Math.abs(1 - v) < 0.0005 ? 'Base' : pct(1 - v, 1).replace('.0%', '%')),
  armor: (v) => (v ? `${Math.round(v * 100)}%` : '—'),
  bars: (v) => (typeof v === 'number' ? `${+v.toFixed(3)}` : '—'),
  barsS: (v) => (typeof v === 'number' ? `${+v.toFixed(3)}/s` : '—'),
  barsHit: (v) => (typeof v === 'number' ? `${+v.toFixed(4)}` : '—'),
  count: (v) => (v >= 999 ? '∞' : typeof v === 'number' ? String(v) : '—'),
  hits: (v) => (typeof v === 'number' ? `${v} hit${v === 1 ? '' : 's'}` : '—'),
  secs: (v) => (typeof v === 'number' ? `${v}s` : '—'),
  plain: (v) => (v == null ? '—' : String(v)),
  pctPlain: (v) => (typeof v === 'number' && v ? pct(v) : '—'),
};

/** Effects acting on a channel ("rush", "smash", ...) in a side's applied list. */
function channelEffects(side, ch) {
  const out = [];
  for (const e of side?.effects?.applied || []) {
    if (typeof e.value !== 'number') continue;
    if (e.ultimateOnly) { if (ch === 'ultimate') out.push(e); continue; }
    if (e.passive && (e.key === 'ultimateDamage' || (e.key === 'allDamage' && ch === 'ultimate'))) continue;
    if (CHANNEL_OF[e.key] === ch || (e.key === 'allDamage' && ch !== 'skill')) out.push(e);
  }
  return out;
}
const effectsOn = (side, keys) => (side?.effects?.applied || []).filter(e => keys.includes(e.key) && typeof e.value === 'number');

/** The coefficient's parts: DP scale + class + each effect. */
function coefRows(c, side, ch, view) {
  const rows = [[`DP ${c.dp} damage scale`, c.dpScale.toFixed(2), 'Game files (DPData)']];
  const cls = +(c.coef[ch] - c.dpScale).toFixed(4);
  if (cls) rows.push([`${c.class.label} class`, sign(cls, 2), 'Game files (class table)']);
  if (ch === 'ultimate') {
    const bonus = +(view.coefBase.ultimate - c.coef.ultimate).toFixed(4);
    if (bonus) rows.push(['While Sparking passive', sign(bonus, 2), 'Ultimates need Sparking Mode']);
  }
  for (const e of channelEffects(side, ch)) rows.push([e.source, sign(e.value, 3), effectLabel(e.key)]);
  return rows;
}

function damageBreakdown(c, side, view, { field, ch, power, label }) {
  const final = view[field];
  const k1 = view.coef[ch];
  const rows = [];
  const P = power ? c.power?.[power] : null;
  if (P != null) {
    rows.push(['Raw power', String(P), 'Game files']);
    rows.push(['Damage constant', `× ${K}`, 'Game formula']);
    rows.push(...coefRows(c, side, ch, view));
    rows.push([label, n0(final), `${P} × ${K} × ${k1.toFixed(3)}, rounded up`, true]);
  } else {
    const base = view.coefBase[ch];
    rows.push(['Published value', n0(sideBase(c, field)), sourceOf(c, provField(field)) || 'Character data']);
    rows.push(...coefRows(c, side, ch, view));
    rows.push([label, n0(final), Math.abs(k1 - base) < 1e-9 ? 'No change in this build' : `Scaled by ${k1.toFixed(3)} / ${base.toFixed(3)}`, true]);
  }
  return rows;
}

// stats field (engine view) -> characters.json stats/provenance field
const PROV = { rush: 'hit1', hit2: 'hit2', hit3: 'hit3', hit4: 'hit4', hit5: 'hit5', kiBlastDmg: 'kiBlastDamage', meleeDefenseStat: 'meleeDefense', energy: 'kiBlastDefense', kiBlastLimit: 'kiBlastLimit' };
const provField = (f) => PROV[f] || f;
const STATS_FIELD = { rush: (s) => s.hits[0], hit2: (s) => s.hits[1], hit3: (s) => s.hits[2], hit4: (s) => s.hits[3], hit5: (s) => s.hits[4], kiBlastDmg: (s) => s.kiBlastDamage };
function sideBase(c, field) {
  const f = STATS_FIELD[field];
  return f ? f(c.stats) : c.stats[field];
}

function defenseBreakdown(c, side, view, { field, resists, label }) {
  const rows = [['Incoming damage factor', String(c.incomingDamage), 'Game files (DamageRate)']];
  for (const r of resists) {
    const v = c.classCoef[`${r}Resist`] || 0;
    if (v) rows.push([`${c.class.label} class: ${r} resistance`, pct(v), 'Game files (class table)']);
  }
  const keys = resists.flatMap(r => [`${r}Resist`]).concat(resists.includes('physical') || resists.includes('energy') ? ['allResist'] : []);
  for (const e of effectsOn(side, keys)) rows.push([e.source, pct(e.value, 1), effectLabel(e.key)]);
  if (field === 'energy' && view.energy !== view.kiBlastDefenseArmor) rows.push(['Light Body', '−10%', 'Ki blasts only (not against Draconic Aura)']);
  rows.push([label, `× ${(+view[field]).toFixed(3)}`, 'Damage taken = hit × this, rounded up', true]);
  return rows;
}

const RATE_CLASS = { kiCharge: 'kiCharge', kiRegen: 'kiRecovery', attackKiGain: 'attackKiGain', kiBlastCost: 'kiBlastCost', shortDashCost: null };
const RATE_EFFECT = { kiCharge: 'kiCharge', kiRegen: 'kiRecovery', attackKiGain: 'attackKiGain', kiBlastCost: 'kiBlastCost', shortDashCost: 'shortDashCost' };
function rateBreakdown(c, side, view, { field, label, fmt }) {
  const rows = [['Base', fmt(c.stats[field]), sourceOf(c, field) || 'Character data']];
  const ck = RATE_CLASS[field] ? c.classCoef[RATE_CLASS[field]] || 0 : 0;
  if (ck) rows.push([`${c.class.label} class`, pct(ck), 'Game files (class table), already in the base']);
  for (const e of effectsOn(side, [RATE_EFFECT[field]])) rows.push([e.source, pct(e.value, 1), effectLabel(e.key)]);
  rows.push([label, fmt(view[field]), ck || effectsOn(side, [RATE_EFFECT[field]]).length ? `Base × (1 + class + effects) / (1 + class)` : 'No change in this build', true]);
  return rows;
}

function flatBreakdown(c, side, view, { field, statField, effectKey, label, fmt }) {
  const rows = [['Base', fmt(c.stats[statField || field]), sourceOf(c, statField || field) || 'Character data']];
  for (const e of effectsOn(side, [effectKey])) rows.push([e.source, effectValue(e), effectLabel(e.key)]);
  for (const e of (side?.effects?.applied || []).filter(e => e.op === 'set' && e.key === effectKey)) rows.push([e.source, effectValue(e), effectLabel(e.key)]);
  rows.push([label, fmt(view[field]), 'Base + effects', true]);
  return rows;
}

function plainBreakdown(c, view, { field, statField, label, fmt, note }) {
  return [[label, fmt(view[field]), sourceOf(c, statField || field) || note || 'Character data', true]];
}

function takenBreakdown(c, view, { armored }) {
  const hits = view.referenceHits || referenceHits || [];
  const def = view.meleeDefenseStat;
  const rows = hits.map((h, i) => {
    const arm = armored && i < 4 && view.armor ? 1 - view.armor : 1;
    const t = Math.ceil(h * def * arm - 1e-9);
    return [`Hit ${i + 1}: ${h}`, n0(t), `× ${def.toFixed(3)}${arm !== 1 ? ` × ${arm} armor` : ''}, rounded up`];
  });
  rows.unshift(['Attacker', referenceName, 'Its 5-hit rush (the league reference)']);
  rows.push([armored ? '5-hit taken (armored)' : '5-hit damage taken', n0(armored ? calcFiveHitArmorDamage(view, 5) : view.melee), armored ? 'Hits 1–4 on armor, hit 5 breaks it' : 'Sum of the five hits', true]);
  return rows;
}

function volleyBreakdown(c, view) {
  let count = view.kiBlastLimit >= 999 ? 20 : view.kiBlastLimit;
  return [
    ['Ki blast damage', n0(view.kiBlastDmg), 'Per shot'],
    ['Shots', view.kiBlastLimit >= 999 ? '20 (unlimited)' : String(count), 'Ki blast count'],
    ['Falloff', '−5% a shot', 'Held at 40% from shot 13 (game curve); none against armor'],
    ['Full volley', n0(kiBlastVolley(view)), 'Sum of the shots', true],
  ];
}

const D = (field, ch, power, label) => ({ fmt: FMT.int, better: 'high', explain: (c, s, v) => damageBreakdown(c, s, v, { field, ch, power, label }) });

/** key -> definition. `get(view)` reads a value, `explain(c, side, view)` gives breakdown rows [part, value, source, total?]. */
export const STAT = {
  health: { label: 'HP', fmt: FMT.int, better: 'high', explain: (c, s, v) => flatBreakdown(c, s, v, { field: 'health', effectKey: 'health', label: 'HP', fmt: FMT.int }) },
  melee: { label: '5-hit damage taken', short: '5-hit taken', fmt: FMT.int, better: 'low', explain: (c, s, v) => takenBreakdown(c, v, { armored: false }) },
  meleeArmored: { label: '5-hit taken, armored', short: 'Taken (armor)', fmt: FMT.int, better: 'low', get: (v) => calcFiveHitArmorDamage(v, 5), explain: (c, s, v) => takenBreakdown(c, v, { armored: true }) },
  meleeDefenseStat: { label: 'Melee defense', short: 'Melee def', fmt: FMT.def, better: 'low', explain: (c, s, v) => defenseBreakdown(c, s, v, { field: 'meleeDefenseStat', resists: ['physical'], label: 'Melee defense' }) },
  blastDefense: { label: 'Blast defense', short: 'Blast def', fmt: FMT.def, better: 'low', explain: (c, s, v) => defenseBreakdown(c, s, v, { field: 'blastDefense', resists: ['energy', 'blast'], label: 'Blast defense' }) },
  energy: { label: 'Ki blast defense', short: 'Ki-blast def', fmt: FMT.def, better: 'low', explain: (c, s, v) => defenseBreakdown(c, s, v, { field: 'energy', resists: ['energy'], label: 'Ki blast defense' }) },
  armor: { label: 'Armor', fmt: FMT.armor, better: 'high', explain: (c, s, v) => [
    ['Base armor', FMT.armor(c.stats.armor), sourceOf(c, 'armor') || 'Character data'],
    ...(c.sparking?.armor ? [['Sparking armor', '25%', 'While Sparking; replaces a lower armor']] : []),
    ...((s?.effects?.applied || []).filter(e => e.key === 'armorLevel').map(e => [e.source, '10%', 'Skill armor; replaces a lower armor'])),
    ['Armor', FMT.armor(v.armor), 'Armor does not stack: the highest applies', true],
  ] },
  switch: { label: 'Switch', fmt: FMT.secs, better: 'low', explain: (c, s, v) => plainBreakdown(c, v, { field: 'switch', label: 'Switch time', fmt: FMT.secs }) },

  rush5Hit: { label: 'Rush 5-hit total', short: 'Rush 5-hit', fmt: FMT.int, better: 'high', explain: (c, s, v) => [
    ...['rush', 'hit2', 'hit3', 'hit4', 'hit5'].map((f, i) => [`Hit ${i + 1}`, n0(v[f]), i === 0 && c.power?.rush ? `${c.power.rush} × ${K} × ${v.coef.rush.toFixed(3)}` : sourceOf(c, `hit${i + 1}`) || '']),
    ['Rush 5-hit total', n0(v.rush5Hit), 'Sum of the five hits', true],
  ] },
  rush: { label: 'Rush hit 1', ...D('rush', 'rush', 'rush', 'Rush hit 1') },
  hit2: { label: 'Rush hit 2', ...D('hit2', 'rush', null, 'Rush hit 2') },
  hit3: { label: 'Rush hit 3', ...D('hit3', 'rush', null, 'Rush hit 3') },
  hit4: { label: 'Rush hit 4', ...D('hit4', 'rush', null, 'Rush hit 4') },
  hit5: { label: 'Rush hit 5', ...D('hit5', 'rush', null, 'Rush hit 5') },
  fiveHitAfterArmor: { label: 'Rush 5-hit into armor', short: 'Into armor', fmt: FMT.int, better: 'high', explain: (c, s, v) => plainBreakdown(c, v, { field: 'fiveHitAfterArmor', label: 'Rush 5-hit into armor', fmt: FMT.int }) },
  smash: { label: 'Smash', ...D('smash', 'smash', null, 'Smash') },
  throw: { label: 'Throw', ...D('throw', 'throw', 'throw', 'Throw') },
  pursuit: { label: 'Pursuit', ...D('pursuit', 'followUp', null, 'Pursuit') },
  armorBreak: { label: 'Armor break', short: 'Armor brk', fmt: FMT.hits, better: 'low', explain: (c, s, v) => plainBreakdown(c, v, { field: 'armorBreak', label: 'Armor break (hit that breaks armor)', fmt: FMT.hits }) },

  kiBlastDmg: { label: 'Ki blast damage', short: 'Ki blast', ...D('kiBlastDmg', 'kiBlast', 'kiBlast', 'Ki blast damage') },
  kiBlastLimit: { label: 'Ki blast count', short: 'Ki blasts', fmt: FMT.count, better: 'high', explain: (c, s, v) => flatBreakdown(c, s, v, { field: 'kiBlastLimit', effectKey: 'kiBlastCount', label: 'Ki blast count', fmt: FMT.count }) },
  kiBlastVolley: { label: 'Ki blast volley', short: 'Volley', fmt: FMT.int, better: 'high', get: (v) => kiBlastVolley(v), explain: (c, s, v) => volleyBreakdown(c, v) },
  kiBlastCost: { label: 'Ki blast cost (bars)', short: 'Ki blast cost', fmt: FMT.bars, better: 'low', explain: (c, s, v) => rateBreakdown(c, s, v, { field: 'kiBlastCost', label: 'Ki blast cost', fmt: FMT.bars }) },

  startingKi: { label: 'Starting ki (bars)', short: 'Start ki', fmt: FMT.plain, better: 'high', explain: (c, s, v) => flatBreakdown(c, s, v, { field: 'startingKi', effectKey: 'startingKi', label: 'Starting ki', fmt: FMT.plain }) },
  kiCharge: { label: 'Ki charge (bars/s)', short: 'Ki charge', fmt: FMT.barsS, better: 'high', explain: (c, s, v) => rateBreakdown(c, s, v, { field: 'kiCharge', label: 'Ki charge', fmt: FMT.barsS }) },
  kiRegen: { label: 'Ki regen (bars/s)', short: 'Ki regen', fmt: FMT.barsS, better: 'high', explain: (c, s, v) => rateBreakdown(c, s, v, { field: 'kiRegen', label: 'Ki regen', fmt: FMT.barsS }) },
  kiRegenRange: { label: 'Ki bars regen', short: 'Regen to', fmt: (v) => (v == null ? '—' : `0–${v}`), better: 'high', explain: (c, s, v) => plainBreakdown(c, v, { field: 'kiRegenRange', label: 'Ki regenerates up to (bars)', fmt: FMT.plain }) },
  attackKiGain: { label: 'Ki from attacks (bars/hit)', short: 'Atk ki', fmt: FMT.barsHit, better: 'high', explain: (c, s, v) => rateBreakdown(c, s, v, { field: 'attackKiGain', label: 'Ki from attacks', fmt: FMT.barsHit }) },
  shortDashCost: { label: 'Short dash (bars)', short: 'Short dash', fmt: FMT.bars, better: 'low', explain: (c, s, v) => rateBreakdown(c, s, v, { field: 'shortDashCost', label: 'Short dash cost', fmt: FMT.bars }) },

  skillStart: { label: 'Skill gauge start', short: 'Skill start', fmt: FMT.plain, better: 'high', explain: (c, s, v) => flatBreakdown(c, s, v, { field: 'skillStart', effectKey: 'skillStart', label: 'Skill points at the start', fmt: FMT.plain }) },
  skillLimit: { label: 'Skill gauge limit', short: 'Skill limit', fmt: FMT.plain, better: 'high', explain: (c, s, v) => plainBreakdown(c, v, { field: 'skillLimit', label: 'Skill points it can hold', fmt: FMT.plain }) },
  skillRegen: { label: 'Skill gauge regen', short: 'Skill regen', fmt: (v) => (v == null ? '—' : String(v).replace(' Points/m', '/min')), better: 'high', explain: (c, s, v) => plainBreakdown(c, v, { field: 'skillRegen', label: 'Skill points per minute', fmt: (x) => String(x ?? '—').replace(' Points/m', '/min') }) },
  sparkDuration: { label: 'Sparking duration', short: 'Spark dur', fmt: FMT.pctPlain, better: 'high', explain: (c, s, v) => plainBreakdown(c, v, { field: 'sparkDuration', label: 'Sparking duration vs normal', fmt: FMT.pctPlain }) },
  sparkCharge: { label: 'Sparking charge', short: 'Spark chg', fmt: FMT.pctPlain, better: 'high', explain: (c, s, v) => plainBreakdown(c, v, { field: 'sparkCharge', label: 'Sparking charge vs normal', fmt: FMT.pctPlain }) },
};

export const valueOf = (key, view) => (view ? (STAT[key].get ? STAT[key].get(view) : view[key]) : null);
export const fmtOf = (key, view) => STAT[key].fmt(valueOf(key, view));

/** The stat sections every full stats table uses, in the order lineup builders read them. */
export const SECTIONS = [
  { title: 'Toughness', keys: ['health', 'melee', 'meleeArmored', 'meleeDefenseStat', 'blastDefense', 'energy', 'armor', 'switch'] },
  { title: 'Melee', keys: ['rush5Hit', 'rush', 'hit2', 'hit3', 'hit4', 'hit5', 'fiveHitAfterArmor', 'smash', 'throw', 'pursuit', 'armorBreak'] },
  { title: 'Ki blasts', keys: ['kiBlastDmg', 'kiBlastLimit', 'kiBlastVolley', 'kiBlastCost'] },
  { title: 'Ki', keys: ['startingKi', 'kiCharge', 'kiRegen', 'kiRegenRange', 'attackKiGain', 'shortDashCost'] },
  { title: 'Skill gauge', keys: ['skillStart', 'skillLimit', 'skillRegen'] },
  { title: 'Sparking', keys: ['sparkCharge', 'sparkDuration'] },
];
