/**
 * Compares the FModel snapshot (data/snapshots/fmodel/, from pull-fmodel.mjs) with the
 * sources the build reads today: the character map snapshot, the league's curated tables
 * and referencedata. Writes data/FMODEL-PARITY.md and prints one line per check.
 *
 * It answers one question before the build switches sources: where FModel and the
 * current data agree, FModel can become the primary source; every disagreement is
 * listed so it can be explained (a default Unreal omits, a patch, or an error) first.
 * Field names and defaults come from data/fmodel-fields.csv, the start of the FModel
 * field map. Offline and read-only apart from the report.
 *
 * Usage: node scripts/fmodel-parity.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readCsv, writeIfChanged } from './lib/csv.mjs';
import { loadRefdata, repoRoot, normName } from './lib/refdata.mjs';
import { loadFmodel } from './lib/fmodelData.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(__dirname, '..', 'data');
const config = JSON.parse(fs.readFileSync(path.join(DATA, 'config.json'), 'utf8'));
const ref = loadRefdata(repoRoot(__dirname), config.teamsSeason);
const fmodel = (f) => readCsv(path.join(DATA, 'snapshots', 'fmodel', f)).rows;
const charmap = (f) => readCsv(path.join(DATA, 'snapshots', 'charmap', f)).rows;
const curated = (f) => readCsv(path.join(DATA, 'curated', f)).rows;
const fm = loadFmodel(DATA);

const same = (a, b) => {
  if (a === b) return true;
  const x = Number(a), y = Number(b);
  return a !== '' && b !== '' && Number.isFinite(x) && Number.isFinite(y) && Math.abs(x - y) <= 1e-6 * Math.max(1, Math.abs(y));
};

const chars = fmodel('characters.csv');
const nameOf = new Map(ref.characters.map(c => [c.id, c.name]));
const values = new Map();
for (const r of fmodel('character-values.csv')) values.set(`${r.id}|${r.asset}|${r.field}`, r.value);
const cm = new Map(charmap('characters.csv').map(r => [r['Character ID'], r]));

const checks = [];
function check(title, compared, diffs, note = '') { checks.push({ title, compared, diffs, note }); }

// 1. Identity: class key and DP
{
  const d = [];
  let n = 0;
  for (const c of chars) {
    const m = cm.get(c.id);
    if (!m) { d.push(`${c.name} (${c.id}): not in the character map`); continue; }
    n++;
    if (c.classKey !== m['Class (game key)']) d.push(`${c.name}: class ${c.classKey} vs map ${m['Class (game key)']}`);
  }
  check('Class key', n, d);
}

// 2. Character fields from the field map, with Unreal's omitted defaults
const fieldMap = readCsv(path.join(DATA, 'fmodel-fields.csv')).rows;
const learned = [];
for (const f of fieldMap) {
  if (!f.charmap) continue;
  const d = [];
  const absent = new Map();
  let n = 0;
  for (const c of chars) {
    const m = cm.get(c.id);
    if (!m) continue;
    const raw = values.get(`${c.id}|${f.asset}|${f.path}`);
    const want = m[f.charmap] ?? '';
    if (raw === undefined && f.default === '') { absent.set(want, (absent.get(want) || 0) + 1); continue; }
    n++;
    const got = raw ?? f.default;
    if (!same(got, want)) d.push(`${c.name}: ${got}${raw === undefined ? ' (default)' : ''} vs map ${want === '' ? '(blank)' : want}`);
  }
  if (absent.size) {
    const vals = [...absent];
    if (vals.length === 1) learned.push(`${f.field} (${f.path}): ${vals[0][1]} characters have no value; the map has ${vals[0][0] === '' ? 'blank' : vals[0][0]} for all of them, so that is the default`);
    else d.push(`no value for ${[...absent.values()].reduce((a, b) => a + b, 0)} characters, and the map has several values for them: ${vals.map(([v, k]) => `${v === '' ? 'blank' : v} x${k}`).join(', ')}`);
  }
  check(`${f.charmap} = ${f.asset}.${f.path}`, n, d);
}

// 3. Class values and DP scale from the game tables
{
  const t = new Map();
  for (const r of fmodel('tables.csv')) t.set(`${r.table}|${r.key}|${r.field}`, r.value);
  const COLS = {
    'Rush Attack damage': 'RushDamageScale', 'Smash Attack damage': 'SmashDamageScale', 'Combo attack damage': 'ComboAttackDamageScale',
    'Throw damage': 'ThrowDamageScale', 'Counter damage': 'ParryDamageScale', 'Follow-up attack damage': 'PursuitDamageScale',
    'Normal Ki-blast damage': 'RushBulletDamageScale', 'Charged Ki-blast damage': 'SmashBulletDamageScale', 'Skill attack damage': 'BlastForteDamageScale',
    'Super damage': 'BlastDamageScale', 'Ultimate damage': 'BlastUltimateDamageScale', 'Physical resistance': 'CombativesDamageResist',
    'Energy resistance': 'EnergyDamageResist', 'Separate Blast resistance': 'BlastDamageResist', 'Melee charge': 'CombativesChargeScale',
    'Ki-shot charge': 'BulletChargeScale', 'Ki recovery': 'SPAutoRecoveryScale', 'Ki charge': 'SPChargeSpeedScale',
    'Sparking charge': 'SparkingGaugeChargeSpeedScale', 'Pre-Sparking drain': 'PreSparkingGaugeDecreaseSpeedScale',
    'Sparking drain': 'SparkingModeGaugeDecreaseSpeedScale', 'Ki gained from attacks': 'AttackEnergyGainScale',
    'Skill-stock recovery speed': 'BlastRecoverSpeedScale', 'Ki-blast energy cost': 'BulletExpendEnergyScale',
  };
  const classOf = new Map(chars.map(c => [c.id, c.classKey]));
  const d = []; let n = 0;
  for (const m of charmap('class-modifiers.csv')) {
    const key = classOf.get(m['Character ID']);
    for (const [col, f] of Object.entries(COLS)) {
      n++;
      const got = t.get(`class|${key}|${f}`) ?? '0';
      if (!same(got, m[col] || '0')) d.push(`${m.Character} (${key}) ${col}: ${got} vs map ${m[col]}`);
    }
  }
  check('Class values (24 per character) = tables.csv class', n, d);
  const dd = []; let dn = 0;
  for (const c of chars) {
    const m = cm.get(c.id); if (!m) continue;
    dn++;
    const dp = values.get(`${c.id}|Character|DestroyedPower`) ?? '5';
    const got = t.get(`dp|${dp}|DamageScale`);
    if (!same(got ?? '', m['DP damage scale'])) dd.push(`${c.name}: DP ${dp} scale ${got} vs map ${m['DP damage scale']}`);
  }
  check('DP damage scale = tables.csv dp', dn, dd);
}

// 4. Attack and ki-blast power: each character's file for an action, then its Power
{
  const params = { get: (k) => { const i = k.lastIndexOf('|'); return fm.param(k.slice(0, i), k.slice(i + 1)); } };
  const attack = fm.attackFiles, bullet = fm.bulletFiles;
  const pairs = [
    ['Rush A first hit: Power', attack, 'actRSHA1', 'Power'], ['Throw: Power', attack, 'actTRW1P', 'Power'],
    ['Normal Ki: Power', bullet, 'actRSB', 'Power'], ['Normal Ki: Ki cost (raw)', bullet, 'actRSB', 'ExpendEnergy'],
    ['Charged Ki: Power', bullet, 'actSMBN', 'Power'], ['Charged Ki: Ki cost (raw)', bullet, 'actSMBN', 'ExpendEnergy'],
  ];
  for (const [col, resolve, action, field] of pairs) {
    const d = []; let n = 0;
    for (const c of chars) {
      const m = cm.get(c.id); if (!m) continue;
      const files = resolve(c.id, action);
      // The map lists every part's value ("700 | 2000"), except a rush's first hit, which is the
      // first part. Its part order is not always the game's (Dr. Gero's throw), so parts compare as a set.
      const all = files.map(f => params.get(`${f}|${field}`) ?? '');
      const got = col.startsWith('Rush') ? (all[0] ?? '') : all.join(' | ');
      const sorted = (s) => String(s).split(' | ').sort().join(' | ');
      n++;
      if (!same(got, m[col]) && sorted(got) !== sorted(m[col])) d.push(`${c.name}: ${got === '' ? '(none)' : got} from ${files.join(', ') || 'no file'} vs map ${m[col] === '' ? '(blank)' : m[col]}`);
    }
    check(`${col} = ${action} ${field}`, n, d);
  }
  const d = []; let n = 0;
  for (const r of charmap('combative-values.csv')) {
    const files = attack(r['Character ID'], r.Action);
    const got = files.map(f => params.get(`${f}|Power`) ?? '').join(' | ');
    n++;
    if (!same(got, r.Power)) d.push(`${r.Character} ${r.Action}: ${got || '(none)'} from ${files.join(', ') || 'no file'} vs map ${r.Power}`);
  }
  check('Smash and follow-up Power (combative-values.csv)', n, d);
}

// 5. Moves: names and ki costs by slot
{
  const SLOT = { BlastSkill1: 'Super 1', BlastSkill2: 'Super 2', BlastForte1: 'Skill 1', BlastForte2: 'Skill 2', BlastUltimate: 'Ultimate' };
  const mv = new Map();
  for (const r of fmodel('move-values.csv')) mv.set(`${r.file}|${r.field}`, r.value);
  const list = charmap('move-list.csv');
  const byKey = new Map();
  for (const r of list) {
    const k = `${r['Character ID']}|${r.Slot}`;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(r);
  }
  const dn = [], dc = []; let n = 0, nc = 0;
  for (const m of fmodel('moves.csv')) {
    const rows = byKey.get(`${m.id}|${SLOT[m.slot]}`) || [];
    const match = rows.find(r => r.Move === m.name) || null;
    n++;
    if (!match) { dn.push(`${nameOf.get(m.id)} ${SLOT[m.slot]}${m.key ? ` (${m.key})` : ''}: game "${m.name}" vs map ${rows.map(r => `"${r.Move}"`).join(', ') || '(none)'}`); continue; }
    const cost = mv.get(`${m.file}|ExpendEnergy`);
    if (match['Ki cost'] !== '' || cost !== undefined) {
      nc++;
      if (!same(cost ?? '', match['Ki cost'])) dc.push(`${nameOf.get(m.id)} ${m.name}: ${cost ?? '(none)'} vs map ${match['Ki cost'] || '(blank)'}`);
    }
  }
  check('Move names by slot (moves.csv vs move-list.csv)', n, dn);
  check('Move ki cost = ExpendEnergy', nc, dc);
}

// 6. Short dash: the game's per-dash cost vs the league's datamined value (x2)
{
  const raw = new Map(curated('short-dash-cost.csv').map(r => [r.id, r.shortDashKiCost]));
  const shared = new Map(curated('short-dash-shared.csv').map(r => [r.id, r.sameAs]));
  const d = []; let n = 0;
  for (const c of chars) {
    const league = raw.get(shared.get(c.id) || c.id);
    const game = values.get(`${c.id}|Steps|StepShortDash.SpCost`);
    if (league === undefined) continue;
    n++;
    if (!same(game ?? '', String(Number(league) * 2))) d.push(`${c.name}: ${game} (steps ${c.steps}) vs league ${league} x 2`);
  }
  check('Short-dash ki cost = Steps StepShortDash.SpCost (league value x 2)', n, d,
    'Each character\'s Steps file is the one its CharacterData points to, so the 7 characters that share step data are read through that link.');
}

// 7. Capsule names
{
  const game = new Map(fmodel('capsules.csv').map(r => [r.id, r]));
  const d = []; let n = 0;
  for (const c of ref.capsules) {
    if (!/^00_0_/.test(c.id)) continue;
    const g = game.get(c.id);
    n++;
    if (!g) d.push(`${c.name} (${c.id}): not in the game export`);
    else if (g.name !== c.name) d.push(`${c.id}: game "${g.name}" vs referencedata "${c.name}"`);
  }
  const extra = [...game.keys()].filter(id => !ref.capsules.some(c => c.id === id));
  check('Capsule names (referencedata game capsules)', n, d, `The game export has ${extra.length} more capsule ids than referencedata: ${extra.slice(0, 12).join(', ')}${extra.length > 12 ? ', …' : ''}.`);
}

// 8. Blast parts: every Move Power row names the game file it read (Record key). Is that file one
// of the character's files for the action, and do its values agree?
{
  const COLS = { Power: 'Power', BeamPower: 'BeamPower', Shave: 'Shave', BeamShave: 'BeamShave', FireLimit: 'FireLimit',
    'Collision revivals': 'CollisionRevibeNum', 'Revival interval (s)': 'CollisionRevibeSpan', FireNum: 'FireNum', 'Ki cost (raw)': 'ExpendEnergy' };
  const dl = [], dv = []; let nl = 0, nv = 0;
  const absent = new Map();
  for (const r of charmap('move-power.csv')) {
    const file = r['Record key'];
    if (!file) continue;
    const id = r['Character ID'];
    const files = [...fm.attackFiles(id, r.Action), ...fm.bulletFiles(id, r.Action)];
    nl++;
    if (!files.includes(file)) dl.push(`${r.Character} ${r.Move} ${r.Action}: map reads ${file}, the game links ${files.join(', ') || 'nothing'}`);
    if (!fm.paramsOf(file).length) continue;
    for (const [col, field] of Object.entries(COLS)) {
      const want = r[col];
      if (want === '') continue;
      const got = fm.param(file, field);
      if (got === undefined) { const k = `${field}=${want}`; absent.set(k, (absent.get(k) || 0) + 1); continue; }
      nv++;
      if (!same(got, want)) dv.push(`${r.Character} ${r.Move} ${file} ${col}: ${got} vs map ${want}`);
    }
  }
  const byField = new Map();
  for (const [k, n] of absent) { const [f, v] = k.split('='); if (!byField.has(f)) byField.set(f, []); byField.get(f).push(`${v} x${n}`); }
  check('Blast parts: the file each Move Power row reads is linked to that action', nl, dl);
  check('Blast parts: Power, BeamPower, Shave, FireLimit, revivals, FireNum, ki cost', nv, dv,
    `Values the export leaves out (Unreal defaults), with the map's value: ${[...byField].map(([f, v]) => `${f} ${v.join(', ')}`).join('; ')}.`);
}

// 9. Skill buffs: every non-zero value the map lists for a skill action, against the game's buff files
{
  const d = []; let n = 0;
  const bySkill = new Map();
  for (const r of charmap('skill-values.csv')) {
    if (!/^actEXA/.test(r.Action) || !/^(ParameterChanging|ResourceChanging)\.|^EffectiveTime$/.test(r.Field)) continue;
    const v = r['Numeric value'];
    if (v === '' || Number(v) === 0) continue;
    const k = `${r['Character ID']}|${r.Action}`;
    if (!bySkill.has(k)) bySkill.set(k, []);
    bySkill.get(k).push(`${r.Field}=${Number(v)}`);
  }
  for (const [k, want] of bySkill) {
    const [id, action] = k.split('|');
    const got = fm.buffsOf(id).filter(b => b.action === action)
      .flatMap(b => fm.paramsOf(b.file).filter(p => /^(ParameterChanging|ResourceChanging)\.|^EffectiveTime$/.test(p.field) && Number(p.value) !== 0 && !Number.isNaN(Number(p.value))))
      .map(p => `${p.field}=${Number(p.value)}`);
    n++;
    const a = [...want].sort().join(' '), b = [...got].sort().join(' ');
    if (a !== b) {
      const miss = want.filter(x => !got.includes(x)), extra = got.filter(x => !want.includes(x));
      d.push(`${nameOf.get(id)} ${action}:${miss.length ? ` map only ${miss.join(', ')}` : ''}${extra.length ? ` game only ${extra.join(', ')}` : ''}`);
    }
  }
  check('Skill buffs (skill-values.csv) = buff files linked to the skill action', n, d);
}

// 10. Passives: While Sparking and the low-health trigger, against the Sparking and HP-trigger buffs
{
  const vocab = curated('effects.csv').filter(e => e.summaryColumn && e.field);
  const d = []; let n = 0;
  for (const r of charmap('skills-passives.csv')) {
    if (r.Type !== 'Passive') continue;
    const id = r['Character ID'];
    const name = r['Skill / Passive'];
    const hp = name.match(/stored trigger ([\d,]+) HP/);
    const action = name === 'While Sparking' ? 'Sparking' : hp ? `HPTrigger@${hp[1].replace(/,/g, '')}` : null;
    if (!action) continue;
    const files = fm.buffsOf(id).filter(b => b.action === action).map(b => b.file);
    for (const e of vocab) {
      const want = r[e.summaryColumn] || '';
      const vals = files.map(f => fm.param(f, e.field)).filter(v => v !== undefined);
      const got = vals.length ? String(vals.reduce((s, v) => s + Number(v), 0)) : '';
      if (want === '' && got === '') continue;
      n++;
      if (!same(got || '0', want || '0')) d.push(`${nameOf.get(id)} ${name} ${e.summaryColumn}: ${got || '(none)'} from ${files.join(', ') || 'no buff'} vs map ${want || '(blank)'}`);
    }
  }
  check('Passives (While Sparking, low health) = Sparking and HP-trigger buffs', n, d);
}

// 11. Capsule effects: the league's effect rows against the game's effect files
{
  // Effect key -> [game field, scale]: the vocabulary's fields, plus flat and level keys whose game
  // fields the vocabulary does not list. allDamage / allResist stand for several fields at once.
  const FIELDS = new Map(curated('effects.csv').filter(e => e.field && !e.field.endsWith('*')).map(e => [e.key, [[e.field, 1]]]));
  for (const [k, f, s] of [['health', 'ParameterChanging.AddLife', 1], ['blastKiCost', 'ParameterChanging.BlastExpendSpAdd', 10000],
    ['ultimateKiCost', 'ParameterChanging.UltimateBlastExpendSpAdd', 10000], ['combativesArmorLevel', 'ParameterChanging.CombativesArmorLevelUp', 1],
    ['bulletArmorLevel', 'ParameterChanging.BulletArmorLevelUp', 1], ['blastComboDamage', 'ParameterChanging.BlastComboDamageScale', 1],
    ['startingKi', 'ParameterChanging.AddInitialSP', 10000]]) FIELDS.set(k, [[f, s]]);
  // Fields a matched key also accounts for in the same effect (the battle-start refill of a starting-ki capsule)
  const ALSO = { startingKi: /^ResourceChanging\.HealSP$/, allDamage: /DamageScale$/ };
  FIELDS.get('armorBreakLevel').push(['ParameterChanging.ActionCategoryArmorBreakLevelUp[0].Value', 1]);
  FIELDS.set('allDamage', [['ParameterChanging.RushDamageScale', 1], ['ParameterChanging.BlastDamageScale', 1], ['ParameterChanging.BlastUltimateDamageScale', 1]]);
  FIELDS.set('allResist', [['ParameterChanging.CombativesDamageResist', 1], ['ParameterChanging.EnergyDamageResist', 1]]);
  const known = new Set([...FIELDS.values()].flat().map(([f]) => f));

  // The game's effects per capsule: Effects[k] of each effect asset, its conditions and its values
  // (a timed buff's values come from its buff file).
  function gameEffects(id) {
    const out = new Map();
    for (const g of fm.capsuleEffectsOf(id)) {
      const m = g.field.match(/^Effects\[(\d+)\]\.(.*)$/);
      if (!m) continue;
      const k = `${g.effect}:${m[1]}`;
      if (!out.has(k)) out.set(k, { cond: [], values: new Map() });
      const e = out.get(k);
      if (m[2].startsWith('Conditions[')) { if (g.value === 'true' && /\.b\w+$/.test(m[2])) e.cond.push(m[2].replace(/^Conditions\[\d+\]\./, '')); }
      else if (m[2] === 'Buff') for (const p of fm.paramsOf(g.value)) e.values.set(p.field, p.value);
      else e.values.set(m[2], g.value);
    }
    return [...out.values()];
  }
  const rows = curated('capsule-effects.csv');
  const d = []; let n = 0;
  for (const id of new Set(rows.map(r => r.id))) {
    if (!fm.capsules.has(id)) continue;
    const effects = gameEffects(id);
    const used = new Set();
    for (const r of rows.filter(x => x.id === id)) {
      const fields = FIELDS.get(r.key);
      if (!fields) continue;
      n++;
      const want = Number(r.value);
      // "set starting ki to max" (Rising Fighting Spirit) is the game's ResourceChanging.MaxSP flag
      const hit = r.value === 'max' ? effects.find(e => e.values.get('ResourceChanging.MaxSP') === 'true') : effects.find(e => fields.some(([f, s]) => e.values.has(f) && same(String(Number(e.values.get(f)) / s), String(want)))
        && (r.condition === 'sparking') === e.cond.includes('bSparking'));
      if (!hit) {
        const seen = effects.flatMap(e => fields.filter(([f]) => e.values.has(f)).map(([f, s]) => `${Number(e.values.get(f)) / s}${e.cond.length ? ` (${e.cond.join(', ')})` : ''}`));
        d.push(`${r.name} (${id}) ${r.key} ${r.value}${r.condition ? ` [${r.condition}]` : ''}: game ${seen.join('; ') || 'has no such effect'}`);
      } else {
        for (const [f] of fields) used.add(`${effects.indexOf(hit)}|${f}`);
        if (ALSO[r.key]) for (const f of hit.values.keys()) if (ALSO[r.key].test(f)) used.add(`${effects.indexOf(hit)}|${f}`);
      }
    }
    // A capsule the league models as a note (a "display" row) covers the game values it describes.
    const shownAsNote = rows.some(x => x.id === id && x.key === 'display');
    effects.forEach((e, i) => {
      for (const [f, v] of e.values) {
        if (!known.has(f) || used.has(`${i}|${f}`) || shownAsNote) continue;
        if (rows.some(x => x.id === id && FIELDS.get(x.key)?.some(([ff]) => ff === f))) continue;
        d.push(`${rows.find(x => x.id === id).name} (${id}): game ${f.replace('ParameterChanging.', '')} = ${v}${e.cond.length ? ` (${e.cond.join(', ')})` : ''}, no curated row`);
      }
    });
  }
  check('Capsule effects (curated/capsule-effects.csv) = the game\'s effect files', n, d,
    'Compared effect by effect, with the Sparking condition. Health, map, emote and timer conditions are text in the curated table and are only checked for being present.');
}

// ---- report -------------------------------------------------------------------------
const lines = [
  '# FModel parity',
  '',
  'Generated by `scripts/fmodel-parity.mjs`: the FModel snapshot (`snapshots/fmodel/`) against the character map, the league\'s curated tables and referencedata. A check passes when every value agrees; a missing FModel field takes the default in `fmodel-fields.csv`.',
  '',
  '| Check | Compared | Different |',
  '| --- | ---: | ---: |',
  ...checks.map(c => `| ${c.title} | ${c.compared} | ${c.diffs.length} |`),
  '',
];
if (learned.length) lines.push('## Defaults the export leaves out', '', ...learned.map(l => `- ${l}`), '');
for (const c of checks.filter(c => c.diffs.length || c.note)) {
  lines.push(`## ${c.title}`, '');
  if (c.note) lines.push(c.note, '');
  if (c.diffs.length) lines.push(...c.diffs.slice(0, 40).map(x => `- ${x}`), ...(c.diffs.length > 40 ? [`- … and ${c.diffs.length - 40} more`] : []), '');
}
writeIfChanged(path.join(DATA, 'FMODEL-PARITY.md'), lines.join('\n'));
for (const c of checks) console.log(`${c.diffs.length ? '  DIFF ' : '  same '} ${c.title}: ${c.compared} compared, ${c.diffs.length} different`);
if (learned.length) console.log(`  ${learned.length} default(s) learned from the map (see FMODEL-PARITY.md)`);
