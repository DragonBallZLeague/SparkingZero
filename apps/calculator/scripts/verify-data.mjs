/**
 * Checks the calculator's published data (public/data/) and curated tables before
 * every build (prebuild, after build-data). Prints `  ok  ` / `  FAIL ` / `  WARN `
 * lines and exits 1 on any FAIL. Imports the modules that ship (the share-link
 * decoder, the adapter, the website's form-chain walk) so the checks cannot drift
 * from what runs in the browser.
 *
 * Usage: node scripts/verify-data.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readCsv } from './lib/csv.mjs';
import { loadRefdata, repoRoot } from './lib/refdata.mjs';
import { toLegacy } from '../src/data/adapter.js';
import { decodeBuild, encodeBuild, makeResolver } from '../src/utils/shareLink.js';
import { buildTransformAdj, getFormChain } from '../../website/src/utils/formChain.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(__dirname, '..');
const ROOT = repoRoot(__dirname);
const DATA = path.join(APP, 'data');
const PUBLIC = path.join(APP, 'public', 'data');
const config = JSON.parse(fs.readFileSync(path.join(DATA, 'config.json'), 'utf8'));
const ref = loadRefdata(ROOT, config.teamsSeason);
const strict = config.output?.roster === 'all';
const v2 = !!config.output?.v2;

let failed = 0, warned = 0;
const ok = (m) => console.log(`  ok    ${m}`);
const fail = (m, items = []) => { failed++; console.log(`  FAIL  ${m}`); for (const i of items.slice(0, 15)) console.log(`          ${i}`); if (items.length > 15) console.log(`          ... and ${items.length - 15} more`); };
const warn = (m, items = []) => { warned++; console.log(`  WARN  ${m}`); for (const i of items.slice(0, 10)) console.log(`          ${i}`); if (items.length > 10) console.log(`          ... and ${items.length - 10} more`); };
const check = (cond, m, items) => (cond ? ok(m) : fail(m, items));
const strictCheck = (cond, m, items) => (cond ? ok(m) : strict ? fail(m, items) : warn(`${m} (fails once the full roster is published)`, items));
const read = (f) => JSON.parse(fs.readFileSync(path.join(PUBLIC, f), 'utf8'));
const pack = (o) => btoa(encodeURIComponent(JSON.stringify(o)));

console.log(`verify-data (${v2 ? 'schema 2' : 'legacy shapes'}, ${strict ? 'full roster' : 'old roster'})`);

// ------------------------------------------------------------------ load
let data, legacy, aliasMap = {};
if (v2) {
  data = { characters: read('characters.json'), skills: read('skills.json'), blasts: read('blasts.json'), capsules: read('capsules.json'), teams: read('teams.json'), meta: read('meta.json') };
  legacy = toLegacy(data, { roster: data.meta.roster });
  for (const c of data.characters) for (const a of c.aliases || []) aliasMap[a] = c.id;
} else {
  legacy = { characters: read('characters.json'), skills: read('skills.json'), blast: read('blast.json'), capsules: read('capsules.json'), teams: read('teams.json'), characterImages: read('characterImages.json') };
  aliasMap = fs.existsSync(path.join(PUBLIC, 'aliases.json')) ? read('aliases.json') : {};
}
const chars = v2 ? data.characters : legacy.characters;

// ------------------------------------------------------------------ the website's contract
check(Array.isArray(chars) && chars.every(c => c && typeof c.name === 'string' && typeof c.id === 'string'),
  'characters.json is a top-level array of objects with string id and name (the website reads .name)');
{
  const dupId = chars.map(c => c.id).filter((x, i, a) => a.indexOf(x) !== i);
  const dupName = chars.map(c => c.name).filter((x, i, a) => a.indexOf(x) !== i);
  check(!dupId.length && !dupName.length, 'character ids and names are unique', [...dupId, ...dupName]);
  const refById = new Map(ref.characters.map((c, i) => [c.id, { ...c, i }]));
  const wrong = chars.filter(c => refById.get(c.id)?.name !== c.name).map(c => `${c.id}: "${c.name}" (referencedata: "${refById.get(c.id)?.name ?? 'missing'}")`);
  check(!wrong.length, 'every name equals referencedata/characters.csv for its id', wrong);
  const order = chars.map(c => refById.get(c.id)?.i ?? -1);
  check(order.every((v, i) => i === 0 || v > order[i - 1]), 'characters follow referencedata order');
  const missing = ref.characters.filter(c => !chars.some(x => x.id === c.id)).map(c => `${c.id} ${c.name}`);
  strictCheck(!missing.length, `every referencedata character is published (${chars.length}/${ref.characters.length})`, missing);
}

// ------------------------------------------------------------------ share links
{
  const caps = v2 ? data.capsules : legacy.capsules;
  const resolver = makeResolver(chars, caps, aliasMap);
  const NULLS = [null, null, null, null, null, null, null];
  const bad = [];
  for (const c of chars) {
    const d = decodeBuild(pack({ c: c.name, p: NULLS, op: NULLS }), resolver);
    if (d?.character?.id !== c.id) bad.push(`${c.name} -> ${d?.character?.name ?? 'nothing'}`);
  }
  const published = new Set(chars.map(c => c.id));
  for (const [alias, id] of Object.entries(aliasMap)) {
    if (!published.has(id)) continue;
    const d = decodeBuild(pack({ c: alias, p: NULLS }), resolver);
    if (d?.character?.id !== id) bad.push(`alias "${alias}" -> ${d?.character?.name ?? 'nothing'} (want ${id})`);
  }
  check(!bad.length, `website-style links (name payloads) resolve for all ${chars.length} names and their aliases`, bad);
  const capBad = caps.filter(c => decodeBuild(pack({ c: chars[0].name, p: [c.name] }), resolver)?.capsules?.[0]?.name !== c.name).map(c => c.name);
  check(!capBad.length, 'old links resolve every capsule by name', capBad);
  if (v2) {
    const rt = [];
    for (const c of chars) {
      const sample = caps.filter(x => !x.bannedIn?.length).slice(0, 7);
      const h = encodeBuild({ character: c, capsules: sample, opponent: chars[0], opponentCapsules: sample.slice(0, 2) });
      const d = decodeBuild(h, resolver);
      if (d.character?.id !== c.id || d.capsules.map(x => x?.id ?? null).join() !== sample.map(x => x.id).join() || d.opponent?.id !== chars[0].id) rt.push(c.name);
    }
    check(!rt.length, 'v2 links round-trip (character, 7 capsules, opponent)', rt);
  }
  const legacyLink = decodeBuild(pack({ c: 'Gohan (Super Hero) Ultimate Gohan', p: ['Light Body', null], o: 'Goku (DAIMA) Super Saiyan 4' }), resolver);
  check(legacyLink?.character?.id === '3000_02' && legacyLink?.opponent?.id === '3120_04', 'an old link naming "Gohan (Super Hero) Ultimate Gohan" vs "Goku (DAIMA) Super Saiyan 4" restores');
}

// ------------------------------------------------------------------ field types (legacy shapes, what the components read)
{
  const NUMERIC = ['dp', 'switch', 'armorBreak', 'meleeDefenseStat', 'kiBlastDefenseArmor', 'blastDefense', 'health', 'melee', 'energy', 'energyDecimal', 'armor', 'hit2', 'hit3', 'hit4', 'hit5', 'fiveHitAfterArmor', 'rush5Hit', 'misc', 'rush', 'smash', 'throw', 'pursuit', 'chain', 'perception', 'sCounter', 'super', 'ultimate', 'shortDashCost', 'kiBlastDmg', 'kiBlast', 'kiBlastCost', 'kiBlastLimit', 'startingKi', 'kiCharge', 'attackKiGain', 'kiRegen', 'kiRegenRange', 'skillStart', 'skillLimit', 'skillDmg', 'skill1Damage', 'skill2Damage', 'sparkCharge', 'sparkDuration'];
  const bad = [];
  for (const c of legacy.characters) for (const f of NUMERIC) if (c[f] !== null && typeof c[f] !== 'number') bad.push(`${c.name}.${f} = ${JSON.stringify(c[f])}`);
  check(!bad.length, 'numeric character fields hold numbers or null', bad);
  const nulls = [];
  for (const c of legacy.characters) for (const f of ['health', 'dp', 'rush', 'hit2', 'hit3', 'hit4', 'hit5', 'smash', 'throw', 'kiBlastDmg', 'meleeDefenseStat', 'blastDefense', 'energy']) if (c[f] == null) nulls.push(`${c.name}.${f}`);
  check(!nulls.length, 'core combat fields are never null (capsules silently stop applying on null)', nulls);
  const bl = [];
  for (const [n, rows] of Object.entries(legacy.blast)) for (const b of rows) if (b.baseDamagePatch !== null && typeof b.baseDamagePatch !== 'number') bl.push(`${n} ${b.name}`);
  check(!bl.length, 'blast damage is a number or null', bl);
  const knownSlots = new Set(['BlastSkill1', 'BlastSkill2', 'BlastUltimate', 'ReplacementSlot2']);
  const slots = Object.entries(legacy.blast).flatMap(([n, rows]) => rows.filter(b => !knownSlots.has(b.slot)).map(b => `${n}: ${b.slot}`));
  check(!slots.length, 'blast slots are ones the UI knows', slots);
  const noBlasts = legacy.characters.filter(c => (legacy.blast[c.name] || []).length < 3).map(c => c.name);
  check(!noBlasts.length, 'every character has its two supers and ultimate', noBlasts);
}

// ------------------------------------------------------------------ capsules
{
  const caps = v2 ? data.capsules : legacy.capsules;
  const special = v2
    ? [['00_0_0033', 'Light Body'], ['00_0_0032', 'Draconic Aura'], ['00_0_0035', 'Dragon Rush']].filter(([id]) => !caps.some(c => c.id === id))
    : ['Light Body', 'Draconic Aura', 'Dragon Rush'].filter(n => !caps.some(c => c.name === n)).map(n => [n]);
  check(!special.length, 'the specially handled capsules exist (Light Body, Draconic Aura, Dragon Rush)', special.map(s => s.join(' ')));
  const refCaps = new Map(ref.capsules.map(c => [c.name, c]));
  const unknown = caps.filter(c => !refCaps.has(c.name)).map(c => c.name);
  check(!unknown.length, 'every capsule is in referencedata/capsules.csv', unknown);
}

// ------------------------------------------------------------------ curated tables
{
  const ids = new Set(ref.characters.map(c => c.id));
  const cur = (f) => readCsv(path.join(DATA, 'curated', f)).rows;
  const problems = [];
  for (const r of cur('aliases.csv')) if (!ids.has(r.id)) problems.push(`aliases.csv: unknown id ${r.id}`);
  for (const r of cur('overrides.csv')) {
    if (!ids.has(r.id)) problems.push(`overrides.csv: unknown id ${r.id}`);
    if (!r.reason?.trim()) problems.push(`overrides.csv: ${r.id} ${r.field} has no reason`);
  }
  for (const r of cur('sparking.csv')) if (!ids.has(r.id)) problems.push(`sparking.csv: unknown id ${r.id}`);
  for (const r of cur('blasts.csv')) {
    if (!ids.has(r.id)) problems.push(`blasts.csv: unknown id ${r.id}`);
    if (!['Super 1', 'Super 2', 'Ultimate'].includes(r.slot)) problems.push(`blasts.csv: ${r.id} unknown slot "${r.slot}"`);
    if (r.damage !== '' && !Number.isFinite(Number(r.damage))) problems.push(`blasts.csv: ${r.id} ${r.move} damage "${r.damage}" is not a number`);
  }
  const keys = new Set(readCsv(path.join(DATA, 'snapshots', 'charmap', 'characters.csv')).rows.map(r => r['Class (game key)']));
  const classRows = new Set(cur('classes.csv').map(r => r.key));
  for (const k of keys) if (!classRows.has(k)) problems.push(`classes.csv: no row for game class key "${k}"`);
  const effKeys = new Set(cur('effects.csv').map(r => r.key));
  if (fs.existsSync(path.join(DATA, 'curated', 'capsule-effects.csv'))) {
    for (const r of cur('capsule-effects.csv')) {
      if (r.key && !effKeys.has(r.key) && !r.key.startsWith('stat:')) problems.push(`capsule-effects.csv: ${r.id} unknown effect "${r.key}"`);
    }
  }
  if (fs.existsSync(path.join(DATA, 'curated', 'skill-targets.csv'))) {
    for (const r of cur('skill-targets.csv')) {
      if (!ids.has(r.id)) problems.push(`skill-targets.csv: unknown id ${r.id}`);
      if (!['self', 'opponent'].includes(r.target)) problems.push(`skill-targets.csv: ${r.id} target "${r.target}"`);
    }
  }
  check(!problems.length, 'curated tables reference only known ids, slots, class keys and effects; every override has a reason', problems);
}

// ------------------------------------------------------------------ website Teams-page emulation
{
  const calcNames = new Set(chars.map(c => c.name));
  const adj = buildTransformAdj(ref.transformations);
  const dead = [];
  for (const t of ref.season) for (const n of t.masterList) {
    if (!calcNames.has(n) && !getFormChain(n, calcNames, adj).length) dead.push(`${t.name}: "${n}"`);
  }
  if (dead.length) warn(`${dead.length} masterlist entr${dead.length === 1 ? 'y links' : 'ies link'} to nothing on the website's Teams page (typos in ${ref.seasonFile}; the calculator's own team filter resolves them through aliases.csv)`, dead);
  else ok('every masterlist entry links into the calculator');
  const nodes = Object.entries(ref.transformations).filter(([, e]) => e?.name).map(([id, e]) => [id, e.name]);
  const unresolved = nodes.filter(([id, n]) => !calcNames.has(n)).map(([id, n]) => `${id} ${n}`);
  strictCheck(!unresolved.length, `every transformations.json node is a calculator name (${nodes.length - unresolved.length}/${nodes.length})`, unresolved);
}

// ------------------------------------------------------------------ images
{
  const thumbs = new Set(fs.readdirSync(path.join(APP, 'public', 'char_thumbnails')));
  const missing = legacy.characters.filter(c => !legacy.characterImages[c.name] || !thumbs.has(legacy.characterImages[c.name])).map(c => c.name);
  if (missing.length) warn('characters without a face icon (the selector shows their initial)', missing); else ok('every character has a face icon');
}

console.log(failed ? `verify-data: ${failed} FAIL, ${warned} WARN` : `verify-data: all checks passed${warned ? ` (${warned} WARN)` : ''}`);
process.exit(failed ? 1 : 0);
