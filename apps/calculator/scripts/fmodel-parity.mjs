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
import { loadRefdata, repoRoot } from './lib/refdata.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(__dirname, '..', 'data');
const config = JSON.parse(fs.readFileSync(path.join(DATA, 'config.json'), 'utf8'));
const ref = loadRefdata(repoRoot(__dirname), config.teamsSeason);
const fmodel = (f) => readCsv(path.join(DATA, 'snapshots', 'fmodel', f)).rows;
const charmap = (f) => readCsv(path.join(DATA, 'snapshots', 'charmap', f)).rows;
const curated = (f) => readCsv(path.join(DATA, 'curated', f)).rows;

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
  const params = new Map();
  const load = (rows) => { for (const r of rows) params.set(`${r.file}|${r.field}`, r.value); };
  load(fmodel('combative-params.csv')); load(fmodel('bullet-params.csv'));
  // An action is one part ("None") or several ("1/3発目", "2/3発目", …): returns the files in part order.
  const resolver = (defaultsFile, ownFile) => {
    const def = new Map(), own = new Map(), parts = new Map();
    const addPart = (action, part, order) => {
      if (!parts.has(action)) parts.set(action, new Map());
      if (!parts.get(action).has(part)) parts.get(action).set(part, Number(order));
    };
    for (const r of fmodel(defaultsFile)) { def.set(`${r.action}|${r.part}`, r.file); addPart(r.action, r.part, r.order); }
    for (const r of fmodel(ownFile)) { own.set(`${r.id}|${r.action}|${r.part}`, r.file); addPart(r.action, r.part, r.order); }
    return (id, action) => [...(parts.get(action) || new Map())].sort((a, b) => a[1] - b[1]).map(([part]) => part)
      .map(part => (own.has(`${id}|${action}|${part}`) ? own.get(`${id}|${action}|${part}`) : def.get(`${action}|${part}`)) || '')
      .filter(Boolean);
  };
  const attack = resolver('combative-defaults.csv', 'combatives.csv');
  const bullet = resolver('bullet-defaults.csv', 'bullets.csv');
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
