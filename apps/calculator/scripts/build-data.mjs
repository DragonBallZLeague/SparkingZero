/**
 * Builds the calculator's data files from the committed source snapshots and
 * curated tables. Offline and deterministic: runs before every dev server and
 * build (predev/prebuild), writes a file only when its content changes.
 *
 *   inputs   data/snapshots/charmap/*.csv      raw game data (game facts, raw inputs)
 *            data/snapshots/capsulecorp/stats.csv  Capsule Corp finals
 *            data/curated/*.csv                hand-maintained tables (see data/README.md)
 *            referencedata/ + the website's team yaml
 *   outputs  public/data/*.json                what the app loads
 *            data/REPORT.md                    coverage, disagreements, calibration
 *            data/CHANGES.md                   per character/field previous build -> this build, rewritten
 *                                              only when the published data changes
 *
 * Usage: node scripts/build-data.mjs [--check]
 *   --check  build in memory and exit 1 if any output file is stale (nothing written)
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { readCsv, writeIfChanged, sameText } from './lib/csv.mjs';
import { loadRefdata, normName, repoRoot } from './lib/refdata.mjs';
import { CHANNELS, CLASS_COEFS, CC_CHANNEL_FIELDS, CC_COLUMNS, splitTraits, num, round, finalDamage } from './lib/fields.mjs';
import { moveParts, family, RECIPES, blastCoef, evaluate, calibrate } from './lib/blastRecipes.mjs';
import { table, list, pct, fmt, compactJson } from './lib/report.mjs';
import { APPLIED_KEYS, sparkingUltimateBonus } from '../src/utils/engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(__dirname, '..');
const ROOT = repoRoot(__dirname);
const DATA = path.join(APP, 'data');
const PUBLIC = path.join(APP, 'public', 'data');
const check = process.argv.includes('--check');

const config = JSON.parse(fs.readFileSync(path.join(DATA, 'config.json'), 'utf8'));
const K = config.damageConstant;
const ref = loadRefdata(ROOT, config.teamsSeason);
const snap = (f) => readCsv(path.join(DATA, 'snapshots', f)).rows;
const curated = (f) => {
  const p = path.join(DATA, 'curated', f);
  return fs.existsSync(p) ? readCsv(p).rows : [];
};
const manifest = (s) => JSON.parse(fs.readFileSync(path.join(DATA, 'snapshots', s, 'MANIFEST.json'), 'utf8'));

const report = { warn: [], ccGaps: [], classFixes: [], specials: [], impossible: [], unknownTraits: [], images: [], skills: [], teams: [], overrides: [], inferredSkills: [] };

// ------------------------------------------------------------------ indexes
const refById = new Map(ref.characters.map(c => [c.id, c]));
const refByName = new Map(ref.characters.map(c => [c.name, c]));
const refByNorm = new Map(ref.characters.map(c => [normName(c.name), c]));
const aliases = curated('aliases.csv');
const aliasTo = new Map(aliases.map(a => [a.alias, a.id]));
for (const a of aliases) if (!refById.has(a.id)) throw new Error(`aliases.csv: unknown id ${a.id} for "${a.alias}"`);

/** Name -> id: exact referencedata name, then aliases.csv, then normalised match. */
function resolveName(name) {
  const n = String(name ?? '').trim();
  if (refByName.has(n)) return refByName.get(n).id;
  if (aliasTo.has(n)) return aliasTo.get(n);
  return refByNorm.get(normName(n))?.id ?? null;
}

const raw = snap('charmap/characters.csv');
const rawById = new Map(raw.map(r => [r['Character ID'], r]));
const moveList = snap('charmap/move-list.csv');
const movePower = snap('charmap/move-power.csv');
const skillValues = snap('charmap/skill-values.csv');
const skillSummary = snap('charmap/skills-passives.csv');
// Raw Power of the actions the Characters tab lacks: neutral smash (actSMMN), vanish follow-up (actBSSM)
const combative = new Map();
for (const r of snap('charmap/combative-values.csv')) {
  if (r.Condition !== 'Default') continue;
  const k = `${r['Character ID']}:${r.Action}`;
  if (!combative.has(k)) combative.set(k, num(r.Power));
}
const ccRows = snap('capsulecorp/stats.csv');
const ccById = new Map();
for (const r of ccRows) {
  const id = resolveName(r['Character Name']);
  if (!id) { report.warn.push(`Capsule Corp row "${r['Character Name']}" matches no character (add it to curated/aliases.csv)`); continue; }
  ccById.set(id, r);
}

const classes = new Map(curated('classes.csv').map(r => [r.key, r]));
// Capsule Corp label -> the class key it most often stands for (used to undo label errors)
const ccLabelKey = new Map();
{
  const votes = new Map();
  for (const r of raw) {
    const cc = ccById.get(r['Character ID']);
    if (!cc) continue;
    const k = `${cc['Character Class']}|${r['Class (game key)']}`;
    votes.set(k, (votes.get(k) || 0) + 1);
  }
  const best = new Map();
  for (const [k, n] of votes) {
    const [label, key] = k.split('|');
    if (!best.has(label) || best.get(label)[1] < n) best.set(label, [key, n]);
  }
  for (const [label, [key]] of best) ccLabelKey.set(label, key);
}
const classRowByKey = new Map();
for (const r of raw) if (!classRowByKey.has(r['Class (game key)'])) classRowByKey.set(r['Class (game key)'], r);

const effectsVocab = curated('effects.csv');
const effectByField = new Map(effectsVocab.filter(e => e.field && !e.field.endsWith('*')).map(e => [e.field, e]));
const effectBySummary = new Map(effectsVocab.filter(e => e.summaryColumn).map(e => [e.summaryColumn, e]));
const effectFor = (field) => effectByField.get(field) || (field.startsWith('ParameterChanging.MovesScale.') ? effectsVocab.find(e => e.key === 'moveSpeed') : null);

// ------------------------------------------------------------------ characters
const thumbs = new Set(fs.readdirSync(path.join(APP, 'public', 'char_thumbnails')));

// Sparking armor: the game's abilityFlag_sparkingArmor (Neo Export CharacterData); a curated/sparking.csv row wins
const neoArmor = new Map(snap('neo/character-data.csv').map(r => [r.alNumId, r.abilityFlag_sparkingArmor === 'TRUE']));
const sparkingOverride = new Map(curated('sparking.csv').map(r => [r.id, r.armor === 'TRUE']));
function sparkingArmorOf(id, name) {
  if (sparkingOverride.has(id)) return sparkingOverride.get(id);
  if (neoArmor.has(id)) return neoArmor.get(id);
  report.warn.push(`${name} (${id}) is not in the Neo Export, so its Sparking armor is unknown (shown as none; add a curated/sparking.csv row once known)`);
  return false;
}
const overrides = curated('overrides.csv');

function classAdd(key, channel) {
  return num(classRowByKey.get(key)?.[CHANNELS[channel]]) || 0;
}

const movesById = new Map();
for (const m of moveList) {
  const id = m['Character ID'];
  if (!movesById.has(id)) movesById.set(id, []);
  movesById.get(id).push(m);
}

function similar(a, b) {
  const x = normName(a), y = normName(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.85;
  const d = Array.from({ length: x.length + 1 }, (_, i) => [i, ...Array(y.length).fill(0)]);
  for (let j = 1; j <= y.length; j++) d[0][j] = j;
  for (let i = 1; i <= x.length; i++) for (let j = 1; j <= y.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
  return 1 - d[x.length][y.length] / Math.max(x.length, y.length);
}

// ---- skills (exact phases from the Skill Values tab)
const skillDisplay = new Map(curated('skill-display.csv').map(r => [normName(r.skill), r]));
const svByChar = new Map();
for (const r of skillValues) {
  if (!/^actEXA[12]/.test(r.Action)) continue;
  const id = r['Character ID'];
  if (!svByChar.has(id)) svByChar.set(id, []);
  svByChar.get(id).push(r);
}
const summaryByChar = new Map();
for (const r of skillSummary) {
  const id = r['Character ID'];
  if (!summaryByChar.has(id)) summaryByChar.set(id, []);
  summaryByChar.get(id).push(r);
}
const unknownSkillFields = new Map();
// EffectiveTermType per skill: how the effect expires (the game's own enum; 8/34 are timed, 64 is not)
const expiryRules = { map: new Map(), add(k, v) { if (!this.map.has(k)) this.map.set(k, new Set()); this.map.get(k).add(v); } };

function skillPhases(id, slot) {
  const rows = (svByChar.get(id) || []).filter(r => r.Action.startsWith(`actEXA${slot}`));
  const phases = [];
  let cur = null;
  for (const r of rows) {
    if (r.Field === 'EffectiveTime') { cur = { duration: num(r['Numeric value']) ?? 0, effects: [] }; phases.push(cur); continue; }
    if (r.Field === 'EffectiveTermType') { expiryRules.add(`${id}:${slot}`, num(r['Numeric value'])); continue; }
    const v = num(r['Numeric value']);
    if (v === null) continue;
    if (!cur) { cur = { duration: num(r['Duration (s)']) ?? 0, effects: [] }; phases.push(cur); }
    const eff = effectFor(r.Field);
    if (!eff) {
      if (!/^(EffectiveTermType|NumbEndSecMoreThan|DodgeMoveChangeDistance)$|ReactionParam|SearchParamChanging|LevelSequence/.test(r.Field)) {
        unknownSkillFields.set(r.Field, (unknownSkillFields.get(r.Field) || 0) + 1);
      }
      continue;
    }
    if (eff.key === 'moveSpeed') { if (!cur.effects.some(e => e.key === 'moveSpeed')) cur.effects.push({ key: 'moveSpeed', value: v }); continue; }
    cur.effects.push({ key: eff.key, value: round(v, 6) });
  }
  return phases.filter(p => p.effects.length || p.duration);
}

/** Display traits for a skill with no skill-display.csv row, read off its effects (marked inferred). */
function inferDisplay(phases, damage) {
  const keys = new Set(phases.flatMap(p => p.effects.map(e => e.key)));
  const has = (...k) => k.some(x => keys.has(x));
  const buff = has('rushDamage', 'smashDamage', 'kiBlastDamage', 'superDamage', 'ultimateDamage', 'physicalResist', 'energyResist', 'armorLevel', 'moveSpeed');
  const ki = has('kiRestore', 'kiPerSecond');
  const heal = has('healthRestore', 'healthRestoreFraction');
  const type = heal ? 'Health' : buff && ki ? 'Buff/Ki' : buff ? 'Buff' : ki ? 'Ki' : damage > 0 ? 'Damage' : null;
  return { type, instantSparking: false, instantKi: false, unblockable: false, cutscene: false, activationTime: null, mobilePenalty: null, healthAmount: null, kiAmount: null, inferred: true };
}

// Skill types (curated/skill-display.csv) that act on the opponent: the league's list, 2026-10-07.
// Their effect is damage plus a push, bind, barrier or counter; none of them carries a stat effect.
const OPPONENT_SKILL_TYPES = new Set(['Explosion', 'Barrier', 'Push', 'Bind', 'Counter', 'Blind']);

// Which skill effects act on the opponent (default: the user). id = <characterId>:<slot>;
// phase (1-based) and key narrow a row; blank means every phase / every effect.
const skillTargets = curated('skill-targets.csv');
const effectKeys = new Set(effectsVocab.map(e => e.key));
for (const t of skillTargets) {
  if (!['self', 'opponent'].includes(t.target)) throw new Error(`skill-targets.csv: ${t.id} target "${t.target}" (self or opponent)`);
  if (t.key && !effectKeys.has(t.key)) throw new Error(`skill-targets.csv: ${t.id} unknown effect key "${t.key}"`);
}
function targetOf(key, phaseIndex, effectKey) {
  const row = skillTargets.find(t => t.id === key && (!t.phase || Number(t.phase) === phaseIndex + 1) && (!t.key || t.key === effectKey));
  return row?.target || 'self';
}

const skills = {};
function buildSkills(id, cc) {
  const ids = [];
  const own = (movesById.get(id) || []).filter(m => m.Slot === 'Skill 1' || m.Slot === 'Skill 2');
  const ccSkills = cc ? [[cc['Skill1 Name'], cc['Skill1 Damage']], [cc['Skill2 Name'], cc['Skill2 Damage']]] : [];
  for (const m of own) {
    const slot = m.Slot === 'Skill 1' ? 1 : 2;
    const key = `${id}:${slot}`;
    const phases = skillPhases(id, slot);
    phases.forEach((p, i) => p.effects.forEach(e => { if (targetOf(key, i, e.key) === 'opponent') e.target = 'opponent'; }));
    const summary = (summaryByChar.get(id) || []).find(r => r.Type === m.Slot);
    const duration = phases.length ? Math.max(...phases.map(p => p.duration || 0)) : (num(summary?.['Duration (seconds)']) ?? 0);
    // Capsule Corp skill damage, matched by skill name (its slot order differs from the game's for some characters)
    let damage = 0;
    const ccMatch = ccSkills.map(([n, d]) => ({ n, d, s: similar(n, m.Move) })).sort((a, b) => b.s - a.s)[0];
    if (ccMatch && ccMatch.s >= 0.7) damage = num(ccMatch.d) ?? 0;
    else if (cc) report.skills.push(`${refById.get(id).name}: no Capsule Corp skill matches "${m.Move}" (damage left 0)`);
    const disp = skillDisplay.get(normName(m.Move));
    const display = disp ? {
      type: disp.type || null,
      instantSparking: disp.instantSparking === 'TRUE', instantKi: disp.instantKi === 'TRUE',
      unblockable: disp.unblockable === 'TRUE', cutscene: disp.cutscene === 'TRUE',
      activationTime: num(disp.activationTime), mobilePenalty: num(disp.mobilePenalty),
      healthAmount: disp.healthAmount === '' ? null : (num(disp.healthAmount) ?? disp.healthAmount),
      kiAmount: num(disp.kiAmount),
      ...(disp.note ? { note: disp.note } : {}),
    } : inferDisplay(phases, damage);
    // Skills that act on the opponent do it through their damage and behaviour, not stat effects
    display.affectsOpponent = (display.type || '').split('/').some(t => OPPONENT_SKILL_TYPES.has(t));
    if (!disp) report.inferredSkills.push(`${refById.get(id).name} — ${m.Move}: ${display.type ?? 'no type'}`);
    const armor = phases.some(p => p.effects.some(e => e.key === 'armorLevel' && e.value > 0));
    // Several phases with the same effects are charge stages (one applies), not a sequence.
    const sig = (p) => p.effects.map(e => e.key).sort().join();
    const stages = phases.length > 1 && phases.every(p => p.effects.length && sig(p) === sig(phases[0]));
    const expiry = [...(expiryRules.map.get(key) || [])];
    skills[key] = {
      id: key, character: id, slot, name: m.Move,
      // The Move List leaves the game's default (2) blank
      stockCost: num(m['Skill stock cost']) ?? 2, damage: round(damage, 2), duration,
      phases, stages: stages || undefined, expiryRule: expiry.length ? Math.max(...expiry) : undefined,
      display, armor,
    };
    if (!skills[key].stages) delete skills[key].stages;
    if (skills[key].expiryRule === undefined) delete skills[key].expiryRule;
    ids.push(key);
  }
  return ids;
}

function passives(id) {
  const rows = (summaryByChar.get(id) || []).filter(r => r.Type === 'Passive');
  return rows.map(r => {
    const effects = [];
    for (const [col, eff] of effectBySummary) {
      const v = num(r[col]);
      if (v) effects.push({ key: eff.key, value: round(v, 6) });
    }
    const name = r['Skill / Passive'];
    const hp = name.match(/stored trigger ([\d,]+) HP/);
    return {
      name: name === 'While Sparking' ? 'While Sparking' : name.replace(/: stored trigger .*/, ''),
      condition: name === 'While Sparking' ? 'sparking' : hp ? `health below ${hp[1]} HP` : 'always',
      effects,
    };
  });
}

const characters = [];
for (const rc of ref.characters) {
  const id = rc.id;
  const r = rawById.get(id);
  if (!r) { report.warn.push(`${rc.name} (${id}) is in referencedata but not in the raw game map (skipped)`); continue; }
  const cc = ccById.get(id);
  if (!cc) report.warn.push(`${rc.name}: no Capsule Corp Stats row; finals fall back to formulas or null`);
  const prov = {};
  const key = r['Class (game key)'];
  const cls = classes.get(key);
  if (!cls) throw new Error(`classes.csv has no row for game class key "${key}" (${rc.name})`);
  const dpScale = num(r['DP damage scale']);
  const coef = Object.fromEntries(Object.keys(CHANNELS).map(ch => [ch, round(dpScale + classAdd(key, ch), 6)]));
  const classCoef = Object.fromEntries(Object.entries(CLASS_COEFS).map(([k, col]) => [k, round(num(r[col]) || 0, 6)]));
  const incoming = num(r['Incoming damage factor']) ?? 1;

  // Capsule Corp finals, rescaled where its class label is not the game's class
  const ccv = (f) => (cc ? num(cc[CC_COLUMNS[f]]) : null);
  const finals = {};
  for (const f of Object.values(CC_CHANNEL_FIELDS).flat()) { finals[f] = ccv(f); prov[f] = cc ? 'capsulecorp' : 'missing'; }
  // Raw Power is known for one field of these channels; it shows which coefficient Capsule Corp used.
  const ANCHOR = { rush: ['hit1', 'Rush A first hit: Power'], throw: ['throw', 'Throw: Power'], kiBlast: ['kiBlastDamage', 'Normal Ki: Power'] };
  const ccKey = cc ? ccLabelKey.get(cc['Character Class']) : null;
  if (cc && ccKey && ccKey !== key) {
    const usedLabel = {};
    for (const [ch, [f, col]] of Object.entries(ANCHOR)) {
      const P = num(r[col]);
      if (P == null || finals[f] == null) continue;
      const byLabel = finalDamage(P, dpScale + classAdd(ccKey, ch), K);
      const byGame = finalDamage(P, dpScale + classAdd(key, ch), K);
      usedLabel[ch] = Math.abs(finals[f] - byLabel) <= 1 && Math.abs(finals[f] - byGame) > 1;
    }
    const anyLabel = Object.values(usedLabel).some(Boolean);
    for (const [ch, fields] of Object.entries(CC_CHANNEL_FIELDS)) {
      const ccCoef = dpScale + classAdd(ccKey, ch);
      const gameCoef = dpScale + classAdd(key, ch);
      if (Math.abs(ccCoef - gameCoef) < 1e-6) continue;
      if (!(ch in usedLabel ? usedLabel[ch] : anyLabel)) continue;
      for (const f of fields) {
        if (finals[f] == null || finals[f] === 0) continue;
        const fixed = Math.round(finals[f] * gameCoef / ccCoef * 10) / 10;
        const out = Number.isInteger(finals[f]) ? Math.round(fixed) : fixed;
        report.classFixes.push([rc.name, cc['Character Class'], cls.label, f, finals[f], out, ch in usedLabel ? 'this channel' : 'another channel of this character']);
        finals[f] = out;
        prov[f] = `game class (Capsule Corp used ${cc['Character Class']})`;
      }
    }
  }
  // Formula checks on the moves whose raw Power is known
  const anchors = [
    ['hit1', num(r['Rush A first hit: Power']), coef.rush],
    ['throw', num(r['Throw: Power']), coef.throw],
    ['kiBlastDamage', num(r['Normal Ki: Power']), coef.kiBlast],
    ['smash', combative.get(`${id}:actSMMN`) ?? null, coef.smash],
    ['pursuit', combative.get(`${id}:actBSSM`) ?? null, coef.followUp],
  ];
  // Damage can never be zero or negative: Capsule Corp's own formula goes negative for very low
  // coefficients (Mr. Satan). Such values are replaced by the game formula.
  for (const [f, P, c] of anchors) {
    if (P == null || finals[f] == null || finals[f] > 0) continue;
    const want = finalDamage(P, c, K);
    report.impossible.push([rc.name, f, finals[f], want, P]);
    finals[f] = want;
    prov[f] = 'formula (Capsule Corp value impossible)';
  }
  for (const [f, P, c] of anchors) {
    if (P == null) continue;
    const want = finalDamage(P, c, K);
    if (finals[f] == null) { finals[f] = want; prov[f] = 'formula'; continue; }
    if (Math.abs(finals[f] - want) > 1) report.specials.push([rc.name, f, finals[f], want, prov[f]]);
  }

  // Game-derived stats
  const meleeDefense = round(incoming - classCoef.physicalResist);
  const kiBlastDefense = round(incoming - classCoef.energyResist);
  const blastDefense = round(incoming - classCoef.energyResist - classCoef.blastResist);
  for (const [f, v] of [['meleeDefense', meleeDefense], ['kiBlastDefense', kiBlastDefense], ['blastDefense', blastDefense]]) {
    const c = ccv(f);
    if (c != null && Math.abs(round(c) - v) > 0.0005) report.ccGaps.push([rc.name, f, round(c), v, 'game formula used']);
    prov[f] = 'game';
  }
  const kiBlastCount = num(r['Ki-blast count']);
  const stats = {
    health: num(r.Life),
    switch: ccv('switch'),
    armorBreak: ccv('armorBreak'),
    armor: ccv('armor') ?? 0,
    meleeDefense, kiBlastDefense,
    kiBlastDefenseArmor: kiBlastDefense,
    blastDefense,
    hits: [finals.hit1, finals.hit2, finals.hit3, finals.hit4, finals.hit5],
    rush5Hit: finals.rush5Hit,
    fiveHitAfterArmor: finals.fiveHitAfterArmor,
    smash: finals.smash,
    throw: finals.throw,
    pursuit: finals.pursuit,
    kiBlastDamage: finals.kiBlastDamage,
    kiBlastCost: round((num(r['Normal Ki: Ki cost (raw)']) ?? 0) * (1 + classCoef.kiBlastCost) / 10000),
    kiBlastLimit: kiBlastCount != null && kiBlastCount >= 999 ? null : kiBlastCount,
    startingKi: round((num(r['Starting Ki (raw)']) ?? 0) / 10000),
    maxKi: round((num(r['Maximum Ki (raw)']) ?? 0) / 10000),
    kiCharge: ccv('kiCharge') ?? round((num(r['Ki charge speed (raw)']) ?? 0) * 0.2 * (1 + classCoef.kiCharge)),
    attackKiGain: round(config.attackKiGainBase * (1 + classCoef.attackKiGain)),
    kiRegen: round((num(r['Ki auto-recovery speed (raw)']) ?? 0) * (1 + classCoef.kiRecovery) / 10000),
    kiRegenRange: round((num(r['Ki auto-recovery limit (raw)']) ?? 0) / 10000),
    shortDashCost: ccv('shortDashCost'),
    skillStart: num(r['Starting Skill Count']) ?? 0,
    skillLimit: num(r['Skill stock capacity']),
    skillRegen: ccv('skillRegen'),
    sparkCharge: round(classCoef.sparkingCharge),
    sparkDuration: ccv('sparkDuration') ?? 0,
  };
  Object.assign(prov, { health: 'game', switch: 'capsulecorp', armorBreak: 'capsulecorp', armor: 'capsulecorp', kiBlastCost: 'game formula', kiBlastLimit: 'game', startingKi: 'game', maxKi: 'game', kiCharge: cc ? 'capsulecorp' : 'game formula', attackKiGain: 'game formula', kiRegen: 'game formula', kiRegenRange: 'game', shortDashCost: 'capsulecorp', skillStart: 'game', skillLimit: 'game', skillRegen: 'capsulecorp', sparkCharge: 'game', sparkDuration: 'capsulecorp' });
  // Capsule Corp cross-checks on game-derived stats
  for (const [f, v] of [['startingKi', stats.startingKi], ['kiRegenRange', stats.kiRegenRange], ['skillLimit', stats.skillLimit], ['sparkCharge', stats.sparkCharge], ['kiRegen', stats.kiRegen]]) {
    const c = ccv(f);
    if (c != null && Math.abs(c - v) > 0.0015) report.ccGaps.push([rc.name, f, c, v, f === 'kiRegen' ? 'Capsule Corp omits the class Ki recovery coefficient' : 'game value used']);
  }
  const ccLimit = ccv('kiBlastLimit');
  if (ccLimit != null && ccLimit !== (stats.kiBlastLimit ?? 999)) report.ccGaps.push([rc.name, 'kiBlastLimit', ccLimit, stats.kiBlastLimit ?? 'unlimited', 'game value used']);

  // Traits
  const { tags, unknown } = splitTraits(cc?.Miscellaneous);
  if (unknown.length) report.unknownTraits.push(`${rc.name}: "${cc.Miscellaneous}" (unrecognised: ${unknown.join(' ')})`);

  // Image
  let image = `T_UI_FaceP1_${id}_00.png`;
  if (!thumbs.has(image)) {
    // costume variants are filed under the base id: 0080_01 -> T_UI_FaceP1_0080_00_01.png
    const variant = 'T_UI_FaceP1_' + id.slice(0, 4) + '_00_' + id.slice(5) + '.png';
    image = thumbs.has(variant) ? variant : null;
    if (!image) report.images.push(`${rc.name} (${id})`);
  }

  const pas = passives(id);
  const sparkingPassive = pas.find(p => p.condition === 'sparking');
  const c = {
    id, name: rc.name,
    aliases: aliases.filter(a => a.id === id).map(a => a.alias),
    image,
    class: { key, label: cls.label },
    dp: num(r.DP), dpScale,
    stats, coef, classCoef, incomingDamage: incoming,
    // raw Power behind the first rush hit, the throw and the normal ki blast (the engine's exact formula)
    power: { rush: num(r['Rush A first hit: Power']), throw: num(r['Throw: Power']), kiBlast: num(r['Normal Ki: Power']) },
    skills: buildSkills(id, cc),
    traits: tags,
    sparking: {
      armor: sparkingArmorOf(id, rc.name),
      effects: (sparkingPassive?.effects || []).filter(e => e.key !== 'armorBreakLevel'),
      armorBreakLevel: sparkingPassive?.effects.find(e => e.key === 'armorBreakLevel')?.value ?? null,
    },
    passives: pas.filter(p => p.condition !== 'sparking'),
    provenance: prov,
  };
  characters.push(c);
}

// Overrides (id, dotted field path, value, reason) win over everything. The id is a character
// id, or a skill id <characterId>:<slot> (e.g. a skill's damage that Capsule Corp leaves blank).
for (const o of overrides) {
  const skill = o.id.includes(':') ? skills[o.id] : null;
  const c = characters.find(x => x.id === (skill ? skill.character : o.id));
  if (!c || (o.id.includes(':') && !skill)) throw new Error(`overrides.csv: unknown id ${o.id}`);
  if (!o.reason) throw new Error(`overrides.csv: ${o.id} ${o.field} has no reason`);
  const pathParts = o.field.split('.');
  let obj = skill || c;
  for (const p of pathParts.slice(0, -1)) { if (obj[p] === undefined) throw new Error(`overrides.csv: ${o.id} has no field ${o.field}`); obj = obj[p]; }
  const last = pathParts[pathParts.length - 1];
  if (!(last in obj)) throw new Error(`overrides.csv: ${o.id} has no field ${o.field}`);
  const before = obj[last];
  const v = o.value === '' ? null : (num(o.value) ?? o.value);
  obj[last] = v;
  if (!skill) c.provenance[o.field] = `override: ${o.reason}`;
  report.overrides.push([skill ? `${c.name} — ${skill.name}` : c.name, o.field, fmt(before), fmt(v), o.reason]);
}

// ------------------------------------------------------------------ blasts
const measuredBlasts = new Map();
for (const b of curated('blasts.csv')) measuredBlasts.set(`${b.id}|${b.slot}|${b.variant}|${normName(b.move)}`, b);
const partsByMove = new Map();
for (const r of movePower) {
  if (!['Super 1', 'Super 2', 'Ultimate'].includes(r.Slot)) continue;
  const k = `${r['Character ID']}|${r.Slot}|${r.Variant}|${normName(r.Move)}`;
  if (!partsByMove.has(k)) partsByMove.set(k, []);
  partsByMove.get(k).push(r);
}
const blastMoves = [];
for (const c of characters) {
  const r = rawById.get(c.id);
  for (const m of movesById.get(c.id) || []) {
    if (!['Super 1', 'Super 2', 'Ultimate'].includes(m.Slot)) continue;
    const k = `${c.id}|${m.Slot}|${m.Variant}|${normName(m.Move)}`;
    const parts = moveParts(partsByMove.get(k) || []);
    // An ultimate is only usable in Sparking Mode, so its damage always includes the character's
    // While Sparking passive (Gohan (Kid): 12000 x 1.25 x (0.95 + 0.20) = 17250, measured in game).
    const add = m.Slot === 'Ultimate'
      ? (num(r['Ultimate damage: class add']) || 0) + sparkingUltimateBonus(c)
      : num(r['Super damage: class add']) || 0;
    const cur = measuredBlasts.get(k);
    measuredBlasts.delete(k);
    blastMoves.push({
      character: c, move: m, key: k, parts,
      family: family(m.Slot, parts),
      coef: blastCoef(c.dpScale, add),
      measured: cur && cur.damage !== '' ? Number(cur.damage) : null,
      curated: cur || null,
    });
  }
}
for (const [k, b] of measuredBlasts) report.warn.push(`blasts.csv row matches no move in the raw Move List: ${b.character} ${b.slot} ${b.variant} "${b.move}" (${k})`);
const calibration = calibrate(blastMoves, config.calibration, K);
const blastMismatch = [];
const blasts = {};
for (const bm of blastMoves) {
  const { character: c, move: m, curated: cur } = bm;
  const cal = calibration.get(bm.family);
  const pred = cal ? evaluate(RECIPES[cal.recipe](bm.parts), bm.coef, K) : null;
  let damage = bm.measured, status = 'measured';
  if (damage == null) {
    if (cal?.accepted && pred) { damage = pred.damage; status = 'computed'; }
    else { damage = null; status = 'unmeasured'; }
  } else if (pred && cal?.accepted && Math.abs(pred.damage - damage) > pred.hits) {
    blastMismatch.push([c.name, m.Slot + (m.Variant ? ` ${m.Variant}` : ''), m.Move, damage, pred.damage, cal.recipe]);
  }
  const mult = m.Slot === 'Ultimate' ? 1.3 : 1.2;
  const boosted = cur?.boostedDamage ? Number(cur.boostedDamage) : damage != null ? Math.round(damage * mult) : null;
  (blasts[c.id] ??= []).push({
    slot: m.Slot, variant: m.Variant || '', name: m.Move,
    kiCost: num(m['Ki cost']), triggerKi: cur ? num(cur.triggerKi) : null,
    damage, damageStatus: status, boostedDamage: boosted,
    recipe: status === 'computed' ? cal.recipe : undefined,
    category: cur?.category || null, type: cur?.type || null,
    impactPower: cur ? num(cur.impactPower) : null,
    traits: cur?.traits ? cur.traits.split(';').map(s => s.trim()).filter(Boolean) : [],
    flags: cur?.flags ? cur.flags.split(';').map(s => s.trim()).filter(Boolean) : [],
    lungeSpeed: cur ? num(cur.lungeSpeed) : null,
    moveLimitTime: cur ? num(cur.moveLimitTime) : null,
  });
}
for (const list of Object.values(blasts)) for (const b of list) if (b.recipe === undefined) delete b.recipe;

// ------------------------------------------------------------------ capsules
// Capsule effects: curated/capsule-effects.csv, in the effect vocabulary of curated/effects.csv.
// value: a coefficient for damage/resist/rate keys (0.05 = 5%), HP / bars / counts for flat keys,
// "max" with op "set". condition: blank = always, "sparking" = with the Sparking toggle, any other
// text = shown as a note and not applied.
const capsuleEffects = new Map();
for (const r of curated('capsule-effects.csv')) {
  if (!effectKeys.has(r.key)) throw new Error(`capsule-effects.csv: ${r.id} ${r.name}: unknown effect key "${r.key}"`);
  if (r.op && !['add', 'set'].includes(r.op)) throw new Error(`capsule-effects.csv: ${r.id} op "${r.op}" (add or set)`);
  const value = r.value === '' ? null : r.value === 'max' ? 'max' : num(r.value);
  if (r.value !== '' && value === null) throw new Error(`capsule-effects.csv: ${r.id} value "${r.value}" is not a number`);
  const e = { key: r.key, value };
  if (r.op === 'set') e.op = 'set';
  if (r.condition) e.condition = r.condition;
  if (r.note) e.note = r.note;
  if (!capsuleEffects.has(r.id)) capsuleEffects.set(r.id, []);
  capsuleEffects.get(r.id).push(e);
}
const rulesets = Object.entries(ref.rules.rulesets || {}).map(([name, rs]) => {
  const banned = new Set();
  const groups = [];
  for (const rule of rs.restrictions || []) {
    if (rule.type === 'banned-ids') for (const i of rule.params?.ids || []) banned.add(i);
    if (rule.type === 'max-cost-group-per-character') groups.push({ maxCost: rule.params.maxCost, ids: rule.params.groupIds });
  }
  return { name, totalCost: rs.totalCost, banned: [...banned], groups };
});
const defaultRuleset = rulesets.find(r => r.name === ref.rules.default) || rulesets[0];
const capsules = ref.capsules.map(cap => ({
  id: cap.id, name: cap.name, cost: cap.cost, description: cap.description,
  exclusiveTo: cap.exclusiveTo,
  effects: capsuleEffects.get(cap.id) || [],
  bannedIn: rulesets.filter(rs => rs.banned.includes(cap.id)).map(rs => rs.name),
}));

// ------------------------------------------------------------------ teams
const formsOf = (id) => {
  const out = [id];
  const seen = new Set(out);
  for (let i = 0; i < out.length; i++) {
    for (const next of ref.transformations[out[i]]?.transformsTo || []) {
      if (!seen.has(next) && refById.has(next)) { seen.add(next); out.push(next); }
    }
  }
  return out;
};
const teams = ref.season.map(t => {
  const members = [];
  for (const n of t.masterList) {
    const name = n.trim();
    let id = resolveName(name);
    if (!id) id = ref.characters.find(c => c.name.startsWith(name + ' '))?.id ?? null; // the website's prefix rule
    if (!id) { report.teams.push(`${t.name}: "${n}" matches no character`); continue; }
    for (const f of formsOf(id)) if (!members.includes(f)) members.push(f);
  }
  return { name: t.name, slug: t.slug, members };
});

// ------------------------------------------------------------------ outputs
const charmapManifest = manifest('charmap');
const ccManifest = manifest('capsulecorp');
const neoManifest = manifest('neo');
// Every character built is published (the website links every name in characters.json).
const roster = characters.map(c => c.id);
const pub = new Set(roster);
const v2 = {
  characters: characters.filter(c => pub.has(c.id)),
  skills: Object.fromEntries(Object.entries(skills).filter(([, s]) => pub.has(s.character))),
  blasts: Object.fromEntries(Object.entries(blasts).filter(([id]) => pub.has(id))),
  capsules,
  teams: teams.map(t => ({ ...t, members: t.members.filter(id => pub.has(id)) })),
  meta: {
    schemaVersion: 2,
    sources: { charmap: charmapManifest.version, capsulecorp: ccManifest.version },
    referenceAttacker: config.referenceAttacker,
    damageConstant: K,
    defaultRuleset: defaultRuleset?.name ?? null,
    rulesets,
  },
};
const dataVersion = crypto.createHash('sha256').update(JSON.stringify(v2)).digest('hex').slice(0, 12);
v2.meta.dataVersion = dataVersion;

for (const id of capsuleEffects.keys()) if (!capsules.some(c => c.id === id)) report.warn.push(`capsule-effects.csv: ${id} is not a capsule`);
for (const c of capsules) if (!capsuleEffects.has(c.id)) report.warn.push(`capsule ${c.name} (${c.id}) has no rows in curated/capsule-effects.csv`);

const outputs = new Map();
const json = (v) => compactJson(v);
// provenance published as source -> [fields] (compact; the UI inverts it)
const bySource = (p) => { const o = {}; for (const [f, s] of Object.entries(p)) (o[s] ??= []).push(f); return o; };
outputs.set('characters.json', json(v2.characters.map(c => ({ ...c, provenance: bySource(c.provenance) }))));
outputs.set('skills.json', json(v2.skills));
outputs.set('blasts.json', json(v2.blasts));
outputs.set('capsules.json', json(capsules));
outputs.set('teams.json', json(v2.teams));
outputs.set('meta.json', json(v2.meta));

// ------------------------------------------------------------------ CHANGES.md (previous build -> this build)
function readPublished() {
  const read = (f) => { const p = path.join(PUBLIC, f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; };
  const meta = read('meta.json');
  if (meta?.schemaVersion !== 2) return null;
  return { meta, characters: read('characters.json') || [], skills: read('skills.json') || {}, blasts: read('blasts.json') || {}, capsules: read('capsules.json') || [] };
}
/** Flatten an object into dotted paths (arrays stay whole). */
function flatten(o, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(o || {})) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, p, out);
    else out[p] = v;
  }
  return out;
}
const same = (a, b) => (typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 1e-9 : JSON.stringify(a ?? null) === JSON.stringify(b ?? null));
function changesMd(prev) {
  if (!prev || prev.meta.dataVersion === v2.meta.dataVersion) return null;
  const rows = [];
  const name = (id) => refById.get(id)?.name ?? id;
  const prevChars = new Map(prev.characters.map(c => [c.id, c]));
  const SKIP = new Set(['provenance', 'skills', 'aliases']);
  for (const c of v2.characters) {
    const o = prevChars.get(c.id);
    if (!o) { rows.push([name(c.id), '(character)', 'none', 'added']); continue; }
    const a = flatten(Object.fromEntries(Object.entries(o).filter(([k]) => !SKIP.has(k))));
    const b = flatten(Object.fromEntries(Object.entries(c).filter(([k]) => !SKIP.has(k))));
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (!same(a[k], b[k])) rows.push([c.name, k, fmt(a[k]), fmt(b[k])]);
  }
  for (const id of prevChars.keys()) if (!pub.has(id)) rows.push([name(id), '(character)', 'present', 'removed']);
  for (const [k, sk] of Object.entries(v2.skills)) {
    const o = prev.skills[k];
    const label = `${name(sk.character)} — skill ${sk.slot}`;
    if (!o) { rows.push([label, 'skill', 'none', sk.name]); continue; }
    for (const f of ['name', 'stockCost', 'damage', 'duration', 'phases', 'armor']) if (!same(o[f], sk[f])) rows.push([label, f, fmt(o[f]), fmt(sk[f])]);
  }
  for (const [id, list] of Object.entries(v2.blasts)) {
    const before = prev.blasts[id] || [];
    for (const b of list) {
      const o = before.find(x => x.slot === b.slot && x.variant === b.variant && x.name === b.name);
      const label = `${name(id)} — ${b.slot}${b.variant ? ' ' + b.variant : ''} ${b.name}`;
      if (!o) { rows.push([label, 'blast', 'none', `${fmt(b.damage)} (${b.damageStatus})`]); continue; }
      for (const f of ['damage', 'damageStatus', 'kiCost', 'boostedDamage']) if (!same(o[f], b[f])) rows.push([label, f, fmt(o[f]), fmt(b[f])]);
    }
  }
  const prevCaps = new Map(prev.capsules.map(c => [c.id, c]));
  for (const c of capsules) {
    const o = prevCaps.get(c.id);
    if (!o) { rows.push([c.name, '(capsule)', 'none', 'added']); continue; }
    for (const f of ['name', 'cost', 'effects', 'bannedIn']) if (!same(o[f], c[f])) rows.push([c.name, f, fmt(o[f]), fmt(c[f])]);
  }
  for (const [id, o] of prevCaps) if (!capsules.some(c => c.id === id)) rows.push([o.name, '(capsule)', 'present', 'removed']);
  const fields = new Map();
  for (const r of rows) fields.set(r[1], (fields.get(r[1]) || 0) + 1);
  return [
    '# Calculator data changes',
    '',
    'Generated by `npm run data:build` whenever the published data changes: every character, skill, blast and capsule value that differs from the previous build. (The one-time move from the old hand-edited JSON is recorded in `rebuild-2026-10/`.)',
    '',
    table(['', 'Previous build', 'This build'], [
      ['Data version', prev.meta.dataVersion, v2.meta.dataVersion],
      ['Raw game map', prev.meta.sources?.charmap, v2.meta.sources.charmap],
      ['Capsule Corp', prev.meta.sources?.capsulecorp, v2.meta.sources.capsulecorp],
    ]),
    `## Summary (${rows.length} values)`,
    '',
    table(['Field', 'Changes'], [...fields.entries()].sort((a, b) => b[1] - a[1])),
    '## Every change',
    '',
    table(['Character / item', 'Field', 'Previous', 'Now'], rows),
  ].join('\n');
}

// ------------------------------------------------------------------ REPORT.md
const effectText = (e) => {
  const v = typeof e.value === 'number' ? (['flat', 'level'].includes(effectsVocab.find(x => x.key === e.key)?.kind) || Math.abs(e.value) >= 1 ? `${e.value > 0 ? '+' : ''}${e.value}` : `${e.value > 0 ? '+' : ''}${round(e.value * 100, 2)}%`) : e.value === 'max' ? '= max' : '';
  return `${e.key} ${v}`.trim();
};
function capsuleEffectRows() {
  return capsules.map(c => {
    const applied = [], cond = [], other = [];
    for (const e of c.effects) {
      if (e.key === 'display' || (!APPLIED_KEYS.has(e.key) && e.op !== 'set')) other.push(e.note || effectText(e));
      else if (e.condition) cond.push(`${effectText(e)} (${e.condition})`);
      else applied.push(effectText(e));
    }
    return [`${c.name} (${c.id})`, c.cost ?? '?', applied.join('; '), cond.join('; '), other.join('; ')];
  });
}
function unshownSkillKeys() {
  const by = new Map();
  for (const s of Object.values(skills)) {
    for (const k of new Set(s.phases.flatMap(p => p.effects.map(e => e.key)))) {
      if (APPLIED_KEYS.has(k)) continue;
      if (!by.has(k)) by.set(k, []);
      by.get(k).push(`${refById.get(s.character).name} — ${s.name}`);
    }
  }
  return [...by.entries()].sort((a, b) => b[1].length - a[1].length).map(([k, v]) => [k, `${v.length}: ${v.slice(0, 4).join('; ')}${v.length > 4 ? '; ...' : ''}`]);
}
function groupGaps(rows) {
  const g = new Map();
  for (const [name, f, a, b, note] of rows) {
    const k = `${f}|${note}`;
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(`${name} ${a} -> ${b}`);
  }
  return [...g.entries()].map(([k, v]) => { const [f, note] = k.split('|'); return [f, note, v.length, v.length > 8 ? v.slice(0, 8).join('; ') + '; ...' : v.join('; ')]; });
}
function reportMd() {
  const all = Object.values(blasts).flat();
  const st = (s) => all.filter(b => b.damageStatus === s).length;
  const calRows = [...calibration.entries()].sort((a, b) => b[1].samples - a[1].samples)
    .map(([fam, c]) => [fam, c.recipe, `${c.matched}/${c.samples}`, pct(c.matched, c.samples), c.accepted ? 'yes' : 'no', blastMoves.filter(m => m.family === fam && m.measured == null).length]);
  const uncal = [...new Set(blastMoves.filter(m => m.measured == null && !calibration.has(m.family)).map(m => m.family))];
  const lines = [
    '# Calculator data report',
    '',
    'Generated by `npm run data:build` (scripts/build-data.mjs). Do not edit by hand.',
    '',
    '## Sources',
    '',
    table(['Source', 'Version', 'Role'], [
      ['Raw game map (data/snapshots/charmap)', charmapManifest.version, 'game facts and raw inputs: ids, classes, DP, coefficients, health, ki, moves, skills'],
      ['Capsule Corp Stats (data/snapshots/capsulecorp)', ccManifest.version, 'finals: hits, smash, throw, pursuit, ki blast damage, skill damage, switch, armor break'],
      ['SZ Neo Export CharacterData (data/snapshots/neo)', neoManifest.version ?? 'no version marker', 'Sparking armor flag (abilityFlag_sparkingArmor)'],
      ['data/curated/*.csv', '', 'measured blast damage, skill display traits, Sparking armor overrides, class labels, aliases, overrides'],
      ['referencedata/', '', 'ids, names, order, forms, capsules, rulesets'],
      [ref.seasonFile, config.teamsSeason, 'team pools'],
    ]),
    '## Coverage',
    '',
    table(['', 'Count'], [
      ['Characters built', characters.length],
      ['Capsules', `${capsules.length} from referencedata; ${capsules.filter(c => c.effects.some(e => APPLIED_KEYS.has(e.key) || e.op === 'set')).length} change shown stats, the rest are notes only`],
      ['Blasts measured', st('measured')],
      ['Blasts computed (calibrated recipe)', st('computed')],
      ['Blasts not measured yet', st('unmeasured')],
      ['Skills', Object.keys(skills).length],
      ['Skills with inferred display traits', report.inferredSkills.length],
    ]),
    '## Warnings',
    '',
    list(report.warn),
    '## Blast damage calibration',
    '',
    `Recipes are scored per family on the moves with measured damage (match: within 1 per hit, since the game rounds each hit up). A family's best recipe fills unmeasured moves only at >= ${config.calibration.minMatchRate * 100}% over >= ${config.calibration.minSamples} samples.`,
    '',
    table(['Family', 'Best recipe', 'Matched', 'Rate', 'Fills gaps', 'Unmeasured moves'], calRows),
    `Families with unmeasured moves but no measured samples: ${uncal.length ? uncal.join('; ') : 'none'}.`,
    '',
    `### Measured damage that disagrees with its family's accepted recipe (${blastMismatch.length})`,
    '',
    'Either the measured value is stale or the move is special. Review in game.',
    '',
    table(['Character', 'Slot', 'Move', 'Measured', 'Recipe', 'Recipe used'], blastMismatch),
    `## Capsule Corp class label differs from the game class (${report.classFixes.length} values rescaled)`,
    '',
    "Capsule Corp sometimes computes a channel's damage with its class label's coefficient instead of the game class's. A channel is rescaled (game coefficient / label coefficient) only when its anchor value (first rush hit, throw or ki blast, whose raw Power is known) matches the label's coefficient and not the game's; channels without an anchor follow the character's other channels.",
    '',
    table(['Character', 'Capsule Corp label', 'Game class', 'Field', 'Capsule Corp', 'Used', 'Evidence of the label coefficient'], report.classFixes),
    `## Impossible Capsule Corp values replaced by the formula (${report.impossible.length})`,
    '',
    "Damage cannot be zero or negative. Capsule Corp's sheet goes negative for very low coefficients, so these use ceil(raw Power x 1.25 x coefficient).",
    '',
    table(['Character', 'Field', 'Capsule Corp', 'Used', 'Raw Power'], report.impossible),
    `## Finals that differ from the base formula (${report.specials.length})`,
    '',
    'ceil(raw Power x 1.25 x coefficient) on the first rush hit, throw, ki blast, neutral smash (actSMMN) and vanish follow-up (actBSSM). Kept as published (special moves or data to check).',
    '',
    table(['Character', 'Field', 'Value', 'Formula', 'Source'], report.specials),
    `## Capsule Corp vs game data (${report.ccGaps.length})`,
    '',
    table(['Field', 'Note', 'Characters', 'Examples (Capsule Corp -> used)'], groupGaps(report.ccGaps)),
    `## Overrides applied (${report.overrides.length})`,
    '',
    table(['Character', 'Field', 'Before', 'After', 'Reason'], report.overrides),
    '## Skills',
    '',
    'Turning a skill on applies every one of its effects (all phases at once; the strongest stage of a charge-stage skill) through src/utils/engine.js. The skill tables show six headline channels in percent. Effect keys the shown stats do not depend on (they appear on the skill, not in the numbers):',
    '',
    table(['Effect key', 'Skills'], unshownSkillKeys()),
    `Skill effects that target the opponent (curated/skill-targets.csv): ${skillTargets.length ? skillTargets.length + ' rows' : 'none; every skill stat effect applies to its user (confirmed by the league 2026-10-07: skills that act on the opponent are the Explosion, Barrier, Push, Bind and Counter types, plus Blind, which work through damage and behaviour, not stat effects). Add rows only if a patch adds a stat debuff aimed at the opponent'}. Skills marked "Affects opponent" by type: ${Object.values(skills).filter(s => s.display.affectsOpponent).length}.`,
    '',
    `Skill effect fields not in curated/effects.csv: ${unknownSkillFields.size ? [...unknownSkillFields].map(([f, n]) => `${f} (${n})`).join(', ') : 'none'}.`,
    '',
    list(report.skills),
    `Skills with no row in curated/skill-display.csv (type inferred from their effects; activation time and flags unknown): ${report.inferredSkills.length}`,
    '',
    list(report.inferredSkills, 80),
    '## Capsule effects (curated/capsule-effects.csv)',
    '',
    'What each capsule does in the engine. "Applied" changes the stats; "conditional" needs the stated condition (Sparking-only ones apply with Sparking Mode on); "not modelled" is shown as a note under the capsules.',
    '',
    table(['Capsule', 'Cost', 'Applied', 'Conditional', 'Not modelled'], capsuleEffectRows()),
    '## Teams',
    '',
    list(report.teams),
    '## Images',
    '',
    `Characters with no face icon in public/char_thumbnails: ${report.images.length ? report.images.join(', ') : 'none'}.`,
    '',
    '## Traits',
    '',
    list(report.unknownTraits),
  ];
  return lines.join('\n');
}

// ------------------------------------------------------------------ write / check
// Files this build owns in public/data; any not produced in the current output mode are removed.
const MANAGED = ['characters.json', 'skills.json', 'blasts.json', 'blast.json', 'capsules.json', 'teams.json', 'meta.json', 'characterImages.json', 'aliases.json'];
const obsolete = MANAGED.filter(f => !outputs.has(f) && fs.existsSync(path.join(PUBLIC, f)));
const files = [...[...outputs].map(([f, c]) => [path.join(PUBLIC, f), c]), [path.join(DATA, 'REPORT.md'), reportMd()]];
const changes = changesMd(readPublished());
if (changes) files.push([path.join(DATA, 'CHANGES.md'), changes + '\n']);

if (check) {
  const stale = [...files.filter(([f, c]) => !sameText(f, c)).map(([f]) => path.relative(APP, f)), ...obsolete.map(f => `public/data/${f} (obsolete)`)];
  if (stale.length) { console.error(`build-data --check: stale output, run npm run data:build:\n  ${stale.join('\n  ')}`); process.exit(1); }
  console.log('build-data --check: outputs are up to date.');
} else {
  let n = 0;
  for (const [f, c] of files) if (writeIfChanged(f, c)) { n++; console.log(`  wrote ${path.relative(APP, f)}`); }
  for (const f of obsolete) { fs.unlinkSync(path.join(PUBLIC, f)); n++; console.log(`  removed public/data/${f}`); }
  const all = Object.values(blasts).flat();
  console.log(`build-data: ${characters.length} characters, ${Object.keys(skills).length} skills, ${all.length} blasts (${all.filter(b => b.damageStatus === 'measured').length} measured, ${all.filter(b => b.damageStatus === 'computed').length} computed), ${capsules.length} capsules; data ${dataVersion}; ${n} file(s) changed.`);
}
