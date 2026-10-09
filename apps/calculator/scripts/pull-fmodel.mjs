/**
 * Snapshots the game data the calculator needs from an FModel JSON export into
 * committed CSVs under data/snapshots/fmodel/. Offline; run it by hand after
 * re-exporting the game files (a patch or a DLC), then review the diff.
 *
 * The export itself (~140,000 files) stays on the exporting machine. Starting from
 * each referencedata character's CharacterData file, the pull follows the asset links
 * (stats, steps, combo attacks, ki blasts, blasts, skills, buffs) and writes long
 * tables (one row per value) so a new or removed game field is a row change, not a
 * shifted column. Assets many characters share (common attack and buff parameters)
 * are written once, in the *-params tables; each character lists only its links.
 *
 * Unreal leaves out fields that equal the class default, so a missing row means
 * "default", not "no value". MANIFEST.json lists every field each table holds; the
 * pull FAILS, writing nothing, when a field the previous manifest listed is gone
 * (the build may read it). Review it, then rerun with --accept-layout.
 *
 * Tables
 *   characters.csv         id, names, class key, DP and the files a character uses
 *   character-values.csv   id, asset, field, value: Numeric (HP, ki, counts), Steps (dash costs),
 *                          dash assets' ki costs, ability and action flags
 *   moves.csv              id, slot, key, file, English name: supers, skills, ultimates
 *   move-values.csv        file, field, value: ki cost, blast impact, guard flags
 *   combatives.csv         id, action, part, file: attack parameters that differ from the common one
 *   combative-params.csv   file, field, value: Power, ki gain, Shave and the rest, common and own
 *   bullets.csv / bullet-params.csv   the same for ki blasts and blast bullets
 *   buffs.csv              id, action, list, phase, file: skill, Sparking and low-HP buffs
 *   buff-params.csv        file, field, value: ParameterChanging (non-zero), duration
 *   capsules.csv           capsule id, English name and description, type, category
 *   capsule-effects.csv    capsule id, effect, field, value (non-zero changes, true conditions)
 *   tables.csv             table, key, field, value: classes, DP, the common battle constants
 *   curves.csv             curve, time, value: damage scaling curves
 *
 * Usage: node scripts/pull-fmodel.mjs <export folder> [--accept-layout]
 *        (the folder holding Content/, e.g. FModel/Output/Exports/SparkingZERO)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openExport, leaves, refName, text, englishStrings } from './lib/fmodel.mjs';
import { toCsv, writeIfChanged } from './lib/csv.mjs';
import { loadRefdata, repoRoot } from './lib/refdata.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(__dirname, '..', 'data');
const OUT = path.join(DATA, 'snapshots', 'fmodel');
const config = JSON.parse(fs.readFileSync(path.join(DATA, 'config.json'), 'utf8'));

const args = process.argv.slice(2);
const root = args.find(a => !a.startsWith('--')) || process.env.FMODEL_EXPORT;
const acceptLayout = args.includes('--accept-layout');
if (!root) { console.error('pull-fmodel: pass the FModel export folder (or set FMODEL_EXPORT)'); process.exit(1); }

const fm = openExport(path.resolve(root));
const en = englishStrings(fm.content);
const ref = loadRefdata(repoRoot(__dirname), config.teamsSeason);
const MDA = 'SS/MasterDataAsset';
const problems = [];

// Cosmetic subtrees: models, animation, camera, sound, effects, UI, story text.
const COSMETIC = /^(Costumes|AnimationBlueprint|EffectColorDataTypeMap|SoundDataAsset|UIAssets|SubInstances|NameInfo|FateData|.*FateDataMap|SeriesTitle.*|Species|CharacterAttributeTagData|SamePersons|Group|Gender|VoiceTexts|LevelSequenceArray|.*LevelSequence|.*Visual.*|Effect|.*Effect(Data|Asset)?|BlastOperationData|OperationData|BlastTaketurn|WarpRequestInfo.*|CharacterHitReaction|Camera.*|Facial|EyeInformationData|CharacterMLS|BattleAssets|SourceString|BulletActorBP|Trail.*|ActionComment|CharacterComment|Comment)$/;

const isZero = (v) => v === 0 || v === false || v === 'None' || v === '' || v === null;

// Attack, bullet and move parameters: numbers and flags, plus the text keys that select game
// behaviour (armor-break level, categories, types). Hit reactions, movement and hit-stop keys
// are animation tuning, and the hit direction is cosmetic.
const GAMEPLAY_TEXT = /(ArmorBreakLevel|Category|Type|Slot|Group)(\.Key)?$/;
const PARAM_OPTS = {
  skip: new RegExp(`${COSMETIC.source}|^(AttackDiretion|AttackDirection)$`),
  drop: (p, v) => typeof v === 'string' && !GAMEPLAY_TEXT.test(p),
};

/**
 * Fold link rows: per action and part, the file most characters use becomes the default
 * (written once) when at least half the roster uses it; a character keeps a row only where it
 * differs or adds a sub-parameter file. `order` is the part's position in the game file.
 */
function foldLinks(rows, characters) {
  const count = new Map(), order = new Map();
  for (const r of rows) {
    const k = `${r.action}\u0000${r.part}`;
    if (!order.has(k)) order.set(k, r.order);
    const m = count.get(k) || new Map();
    m.set(r.file, (m.get(r.file) || 0) + 1);
    count.set(k, m);
  }
  const defaults = [];
  const usual = new Map();
  for (const [k, m] of count) {
    const [file, users] = [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    if (users * 2 < characters) continue;
    usual.set(k, file);
    const [action, part] = k.split('\u0000');
    defaults.push({ action, part, order: order.get(k), file, characters: users });
  }
  defaults.sort((a, b) => a.action.localeCompare(b.action) || a.order - b.order);
  const own = rows.filter(r => r.subFile || usual.get(`${r.action}\u0000${r.part}`) !== r.file);
  return { defaults, own };
}

// ---- tables and curves (Blueprints) --------------------------------------------------
const tableRows = [];
function tableFrom(file, tableName, recordsOf) {
  const a = fm.load(`SS/Blueprints/${file}`);
  if (!a) { problems.push(`missing SS/Blueprints/${file}.json`); return; }
  for (const [key, obj] of recordsOf(a.props)) {
    for (const [field, value] of leaves(obj, { skip: /^(Name|.*Curve)$/ })) tableRows.push({ table: tableName, key, field, value: text(value) });
  }
}
const records = (p) => (p.Records || []).map(r => [r.Key, r.Value]);
tableFrom('CharacterTypeData', 'class', records);
tableFrom('DPData', 'dp', records);
tableFrom('CharacterData', 'battle', p => [['CommonParameter', p.CommonParameter || {}]]);
tableFrom('ArmorData', 'armor', records);
tableFrom('ArmorBreakLevelData', 'armorBreak', records);

const curveRows = [];
for (const f of fm.list('SS/Blueprints', /Curve.*\.json$/)) {
  const a = fm.load(f);
  for (const k of a?.props?.FloatCurve?.Keys || []) curveRows.push({ curve: a.name, time: text(k.Time), value: text(k.Value) });
}
if (!curveRows.some(r => r.curve === 'ComboRushBulletDamageScalingCurve')) problems.push('Blueprints: ComboRushBulletDamageScalingCurve not exported as JSON');

// ---- characters -------------------------------------------------------------------
const charRows = [], valueRows = [], moveRows = [], combativeRows = [], bulletRows = [], buffRows = [];
const moveValues = new Map(), combativeParams = new Map(), bulletParams = new Map(), buffParams = new Map();

function paramsOnce(store, asset, opts) {
  if (!asset || store.has(asset.name)) return;
  store.set(asset.name, leaves(asset.props, opts).map(([field, value]) => ({ file: asset.name, field, value: text(value) })));
}

const DASH_ASSETS = ['DragonDashData', 'ZBurstDashData', 'RevengeDashData', 'DashUpDownData', 'DragonHomingData'];
const COST = /(Sp|Energy)(Cost|Expend)|Expend(Sp|Energy)|SpCost|Cost$/;

for (const { id, name } of ref.characters) {
  const ch = fm.load(`${MDA}/CharacterData/CharacterData_${id}`);
  if (!ch) { problems.push(`${name} (${id}): no CharacterData_${id}.json`); continue; }
  const rec = ch.props.CharacterDataAssetRecord || {};
  const A = rec.CommonAssets || {};
  const story = rec.StorySettingParameter || {};
  const files = {
    numeric: refName(A.NumericData), steps: refName(A.StepsData), combatives: refName(A.CombativesData),
    bullets: refName(A.BulletSettingData), buffs: refName(A.BuffData), sparkingBuff: refName(rec.SparkingBuff),
  };
  charRows.push({ id, name, gameName: en.get(`ST_CHR_NAME_FULL_${id}`) ?? '', classKey: story.CharacterType?.Key ?? '', dp: story.DestroyedPower ?? '', ...files });
  const value = (asset, field, v) => valueRows.push({ id, asset, field, value: text(v) });

  if (story.DestroyedPower !== undefined) value('Character', 'DestroyedPower', story.DestroyedPower);
  for (const k of ['AbilityFlag', 'ActionFlag']) for (const [f, v] of leaves(rec[k] || {}, { prefix: k })) value('Character', f, v);
  if (rec.ChaseChangeBlastSlot) value('Character', 'ChaseChangeBlastSlot', rec.ChaseChangeBlastSlot);
  (rec.HPTriggerBuff || []).forEach((h, i) => {
    value('Character', `HPTriggerBuff[${i}].TriggerHP`, h.TriggerHP ?? '');
    buffRows.push({ id, action: `HPTrigger@${h.TriggerHP}`, list: 0, phase: 0, file: refName(h.Buff) });
    paramsOnce(buffParams, fm.load(h.Buff), { skip: COSMETIC, drop: (p, v) => isZero(v) });
  });

  const numeric = fm.load(A.NumericData);
  if (!numeric) problems.push(`${name} (${id}): numeric file ${files.numeric || '(none)'} missing`);
  else for (const [f, v] of leaves(numeric.props)) value('Numeric', f, v);

  const steps = fm.load(A.StepsData);
  if (!steps) problems.push(`${name} (${id}): steps file ${files.steps || '(none)'} missing`);
  else for (const [f, v] of leaves(steps.props, { skip: /Curve$/ })) if (/ShortDash/.test(f) || COST.test(f)) value('Steps', f, v);
  for (const k of DASH_ASSETS) {
    const a = fm.load(A[k]);
    if (a) for (const [f, v] of leaves(a.props, { skip: /Curve$/ })) if (COST.test(f)) value(k.replace(/Data$/, ''), f, v);
  }

  // Moves: the five slots, then any additional blasts (second ultimates and the like).
  const slots = [['BlastSkill1', A.BlastSkill1Data], ['BlastSkill2', A.BlastSkill2Data], ['BlastForte1', A.BlastForte1Data],
    ['BlastForte2', A.BlastForte2Data], ['BlastUltimate', A.BlastUltimateData]];
  for (const extra of A.AdditionalBlastData || []) {
    const v = extra.Value || {};
    const slot = String(v.Slot || '').replace(/^.*::/, '');
    slots.push([`${slot}:${extra.Key?.Key ?? ''}`, v.UltimateData || v.SkillData || v.ForteData]);
  }
  for (const [slot, r] of slots) {
    const a = fm.load(r);
    if (!a) { if (r) problems.push(`${name} (${id}): ${slot} file ${refName(r)} missing`); continue; }
    const nameKey = leaves(a.props).find(([f]) => /(BlastSkillName|BlastForteName|BlastUltimateName)$/.test(f))?.[1] ?? '';
    const [base, key = ''] = slot.split(':');
    moveRows.push({ id, slot: base, key, file: a.name, nameKey, name: en.get(nameKey) ?? '' });
    if (!moveValues.has(a.name)) moveValues.set(a.name, leaves(a.props, PARAM_OPTS).map(([field, v]) => ({ file: a.name, field, value: text(v) })));
  }

  // Attacks and bullets: every action's parameter file (and a sub-parameter file that holds more
  // than the hit direction). Rows equal to the usual file for that action are folded below.
  const linkTable = (assetRef, partsKey, rows, store) => {
    const a = fm.load(assetRef);
    if (!a) return;
    for (const r of a.props.RecordsByDataList || []) {
      const action = r.Key?.Key ?? '';
      (r.Value?.[partsKey] || []).forEach((part, order) => {
        const p = part.Value?.Parameter;
        const file = refName(p);
        if (!file) return;
        paramsOnce(store, fm.load(p), PARAM_OPTS);
        const sub = part.Value?.SubParameter ? fm.load(part.Value.SubParameter) : null;
        const subFields = sub ? leaves(sub.props, PARAM_OPTS) : [];
        if (subFields.length) paramsOnce(store, sub, PARAM_OPTS);
        rows.push({ id, action, part: part.Key?.Key ?? '', order, file, subFile: subFields.length ? sub.name : '' });
      });
    }
  };
  linkTable(A.CombativesData, 'AdditionalCombatives', combativeRows, combativeParams);
  linkTable(A.BulletSettingData, 'AdditionalBullets', bulletRows, bulletParams);

  // Buffs: skill buffs by action, then the Sparking buff.
  const buffs = fm.load(A.BuffData);
  for (const r of buffs?.props?.PtrRecordsByDataList || []) {
    (r.Value?.BuffList || []).forEach((b, li) => (b.PhaseBuffList || []).forEach((ph, pi) => {
      if (!ph) return;
      buffRows.push({ id, action: r.Key?.Key ?? '', list: li, phase: pi, file: refName(ph) });
      paramsOnce(buffParams, fm.load(ph), { skip: COSMETIC, drop: (p, v) => isZero(v) });
    }));
  }
  if (rec.SparkingBuff) {
    buffRows.push({ id, action: 'Sparking', list: 0, phase: 0, file: files.sparkingBuff });
    paramsOnce(buffParams, fm.load(rec.SparkingBuff), { skip: COSMETIC, drop: (p, v) => isZero(v) });
  }
}

// ---- capsules ---------------------------------------------------------------------
const capsuleRows = [], capsuleEffectRows = [];
for (const f of fm.list(`${MDA}/CharacterItem`, /^ItemData_00_0_\d{4}\.json$/)) {
  const a = fm.load(f);
  const id = a.name.replace(/^ItemData_/, '');
  const p = a.props;
  const effects = (p.EffectAssets || []).map(r => fm.load(r)).filter(Boolean);
  const descKey = effects[0]?.props?.InfoText?.Key ?? '';
  capsuleRows.push({ id, name: en.get(p.Name?.Key) ?? '', description: en.get(descKey) ?? '', type: String(p.Type || '').replace(/^.*::/, ''),
    category: String(p.Category || '').replace(/^.*::/, ''), effectFiles: effects.map(e => e.name).join(' ') });
  effects.forEach((e, ei) => {
    for (const [field, v] of leaves(e.props, { skip: /^(InfoText|ThisItemConditions)$/, drop: (pth, val) => isZero(val) || /\.Curve$/.test(pth) })) {
      capsuleEffectRows.push({ id, effect: ei, file: e.name, field, value: text(v) });
    }
  });
}

// ---- write ------------------------------------------------------------------------
const flat = (m) => [...m.values()].flat();
const combatives = foldLinks(combativeRows, charRows.length), bullets = foldLinks(bulletRows, charRows.length);
// A character without an action the default lists would otherwise look like it has it.
const missingLinks = (rows, defaults) => {
  const has = new Set(rows.map(r => `${r.id}\u0000${r.action}\u0000${r.part}`));
  const out = [];
  for (const { id } of charRows) for (const d of defaults) {
    if (!has.has(`${id}\u0000${d.action}\u0000${d.part}`)) out.push({ id, action: d.action, part: d.part, order: d.order, file: '', subFile: '' });
  }
  return out;
};
const combativeOwn = [...combatives.own, ...missingLinks(combativeRows, combatives.defaults)].sort(byIdAction);
const bulletOwn = [...bullets.own, ...missingLinks(bulletRows, bullets.defaults)].sort(byIdAction);
function byIdAction(a, b) { return a.id.localeCompare(b.id) || a.action.localeCompare(b.action) || a.order - b.order; }
const TABLES = {
  'characters.csv': [['id', 'name', 'gameName', 'classKey', 'dp', 'numeric', 'steps', 'combatives', 'bullets', 'buffs', 'sparkingBuff'], charRows],
  'character-values.csv': [['id', 'asset', 'field', 'value'], valueRows],
  'moves.csv': [['id', 'slot', 'key', 'file', 'nameKey', 'name'], moveRows],
  'move-values.csv': [['file', 'field', 'value'], flat(moveValues)],
  'combative-defaults.csv': [['action', 'part', 'order', 'file', 'characters'], combatives.defaults],
  'combatives.csv': [['id', 'action', 'part', 'order', 'file', 'subFile'], combativeOwn],
  'combative-params.csv': [['file', 'field', 'value'], flat(combativeParams).sort((a, b) => a.file.localeCompare(b.file))],
  'bullet-defaults.csv': [['action', 'part', 'order', 'file', 'characters'], bullets.defaults],
  'bullets.csv': [['id', 'action', 'part', 'order', 'file', 'subFile'], bulletOwn],
  'bullet-params.csv': [['file', 'field', 'value'], flat(bulletParams).sort((a, b) => a.file.localeCompare(b.file))],
  'buffs.csv': [['id', 'action', 'list', 'phase', 'file'], buffRows],
  'buff-params.csv': [['file', 'field', 'value'], flat(buffParams).sort((a, b) => a.file.localeCompare(b.file))],
  'capsules.csv': [['id', 'name', 'description', 'type', 'category', 'effectFiles'], capsuleRows],
  'capsule-effects.csv': [['id', 'effect', 'file', 'field', 'value'], capsuleEffectRows],
  'tables.csv': [['table', 'key', 'field', 'value'], tableRows],
  'curves.csv': [['curve', 'time', 'value'], curveRows],
};

// The field names each table holds, with array indexes folded ([0] -> []), for the layout guard.
const fieldSet = (rows, col = 'field') => [...new Set(rows.map(r => String(r[col]).replace(/\[\d+\]/g, '[]')))].sort();
const manifest = {
  source: 'FModel JSON export of the game files (Content/SS and Content/Localization)',
  characters: charRows.length,
  tables: Object.fromEntries(Object.entries(TABLES).map(([f, [header, rows]]) => [f, { rows: rows.length, columns: header }])),
  fields: Object.fromEntries(Object.entries(TABLES).filter(([, [h]]) => h.includes('field')).map(([f, [, rows]]) => [f, fieldSet(rows)])),
};

const manifestFile = path.join(OUT, 'MANIFEST.json');
const previous = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : null;
if (previous && !acceptLayout) {
  for (const [f, before] of Object.entries(previous.fields || {})) {
    const now = new Set(manifest.fields[f] || []);
    const gone = before.filter(x => !now.has(x));
    if (gone.length) problems.push(`${f}: ${gone.length} field(s) no longer exported: ${gone.slice(0, 12).join(', ')}${gone.length > 12 ? ', …' : ''}\n    Check the build does not read them, then rerun with --accept-layout.`);
  }
}

if (problems.length) {
  console.error(`pull-fmodel: nothing written, ${problems.length} problem(s):`);
  for (const p of problems.slice(0, 60)) console.error('  ' + p);
  process.exit(1);
}
let changed = 0;
for (const [file, [header, rows]] of Object.entries(TABLES)) {
  const did = writeIfChanged(path.join(OUT, file), toCsv(header, rows));
  if (did) changed++;
  console.log(`  ${did ? 'updated  ' : 'unchanged'} fmodel/${file} (${rows.length} rows)`);
}
if (writeIfChanged(manifestFile, JSON.stringify(manifest, null, 2) + '\n')) changed++;
console.log(`pull-fmodel: ${charRows.length} characters, ${capsuleRows.length} capsules, ${fm.stats().loaded} assets read, ${changed} file(s) changed.`);
