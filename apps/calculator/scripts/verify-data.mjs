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
import { APPLIED_KEYS, collectEffects, computeStats } from '../src/utils/engine.js';
import { kiBlastVolley, armorFactor, damageTaken, calcOutgoingCombo } from '../src/utils/calculator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(__dirname, '..');
const ROOT = repoRoot(__dirname);
const DATA = path.join(APP, 'data');
const PUBLIC = path.join(APP, 'public', 'data');
const config = JSON.parse(fs.readFileSync(path.join(DATA, 'config.json'), 'utf8'));
const ref = loadRefdata(ROOT, config.teamsSeason);
// Kept as switches for the checks' wording; the pipeline now always publishes schema 2 for every character.
const strict = true;
const v2 = true;

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
  legacy = toLegacy(data, { roster: data.meta.roster, appliedKeys: APPLIED_KEYS });
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

// Game facts come from the FModel snapshot when it is committed (scripts/lib/gameSource.mjs)
if (fs.existsSync(path.join(DATA, 'snapshots', 'fmodel', 'MANIFEST.json'))) {
  check(!!data.meta?.sources?.fmodel, 'the build reads game facts from the FModel snapshot (meta.sources.fmodel)');
  // published provenance is { source: [fields] }
  const fromGame = chars.filter(c => Object.entries(c.provenance || {}).some(([s, f]) => s.startsWith('game files') && f.includes('shortDashCost'))).length;
  check(fromGame === chars.length, `every character's short-dash cost comes from its own step data in the game files (${fromGame}/${chars.length})`);
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
  // Giants have a four-hit rush, so their fifth hit is 0; every other damage value must be positive
  const nonPositive = [];
  for (const c of legacy.characters) for (const f of ['rush', 'hit2', 'hit3', 'hit4', 'smash', 'throw', 'pursuit', 'kiBlastDmg', 'rush5Hit']) if (typeof c[f] === 'number' && c[f] <= 0) nonPositive.push(`${c.name}.${f} = ${c[f]}`);
  check(!nonPositive.length, 'damage values are positive (Capsule Corp goes negative for very low coefficients)', nonPositive);
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
  const noCost = caps.filter(c => typeof c.cost !== 'number').map(c => c.name);
  check(!noCost.length, 'every capsule has a cost', noCost);
}

// ------------------------------------------------------------------ curated tables
{
  const ids = new Set(ref.characters.map(c => c.id));
  const cur = (f) => readCsv(path.join(DATA, 'curated', f)).rows;
  const problems = [];
  for (const r of cur('aliases.csv')) if (!ids.has(r.id)) problems.push(`aliases.csv: unknown id ${r.id}`);
  for (const r of cur('overrides.csv')) {
    if (!ids.has(r.id.split(':')[0])) problems.push(`overrides.csv: unknown id ${r.id}`);
    if (!r.reason?.trim()) problems.push(`overrides.csv: ${r.id} ${r.field} has no reason`);
  }
  for (const r of cur('sparking.csv')) if (!ids.has(r.id)) problems.push(`sparking.csv: unknown id ${r.id}`);
  for (const r of cur('spread-blasts.csv')) {
    const fired = Number(r.shotsFired), hits = Number(r.commonHits);
    if (!ids.has(r.id)) problems.push(`spread-blasts.csv: unknown id ${r.id}`);
    if (!(Number.isInteger(fired) && Number.isInteger(hits) && hits > 0 && hits <= fired)) problems.push(`spread-blasts.csv: ${r.character} ${r.move}: commonHits must be a whole number from 1 to shotsFired`);
  }
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
  // A correctly spelled masterlist name (a referencedata name, or a prefix of one: the website's
  // rule) must link; that is the calculator's side of the contract. Misspelled names are the
  // yaml's problem: reported, and resolved for the calculator's own team filter by aliases.csv.
  const refNames = ref.characters.map(c => c.name);
  const spelledRight = (n) => refNames.includes(n) || refNames.some(x => x.startsWith(n + ' '));
  const broken = [], typos = [];
  for (const t of ref.season) for (const n of t.masterList) {
    const links = calcNames.has(n.trim()) || getFormChain(n, calcNames, adj).length > 0;
    if (links) continue;
    (spelledRight(n.trim()) ? broken : typos).push(`${t.name}: "${n}"`);
  }
  strictCheck(!broken.length, 'every correctly spelled masterlist entry links into the calculator (website Teams page, run with the shipped formChain.js)', broken);
  if (typos.length) warn(`${typos.length} masterlist entr${typos.length === 1 ? 'y is' : 'ies are'} misspelled in ${ref.seasonFile}, so the website shows them as plain text (the calculator's team filter resolves them through aliases.csv)`, typos);
  const nodes = Object.entries(ref.transformations).filter(([, e]) => e?.name).map(([id, e]) => [id, e.name]);
  const unresolved = nodes.filter(([id, n]) => !calcNames.has(n)).map(([id, n]) => `${id} ${n}`);
  strictCheck(!unresolved.length, `every transformations.json node is a calculator name (${nodes.length - unresolved.length}/${nodes.length})`, unresolved);
}

// ------------------------------------------------------------------ engine known values (schema 2)
if (v2) {
  const byId = new Map(data.characters.map(c => [c.id, c]));
  const cap = (id) => data.capsules.find(c => c.id === id);
  const ref = byId.get(data.meta.referenceAttacker);
  const ctx = { referenceHits: ref?.stats?.hits, damageConstant: data.meta.damageConstant };
  const run = (id, { capsules = [], skills = [], sparking = false } = {}) => {
    const c = byId.get(id);
    return computeStats(c, collectEffects({ character: c, capsules: capsules.map(cap), skills: skills.map(k => data.skills[k]), sparking }), ctx);
  };
  const skillNamed = (charId, name) => Object.values(data.skills).find(x => x.character === charId && x.name === name);
  const expect = [];
  const eq = (label, got, want) => { if (got !== want) expect.push(`${label}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); };
  eq('Goku (Z - Early) first rush hit (DP 4)', byId.get('0000_00')?.stats.hits[0], 390);
  eq('Goku (Z - Mid) first rush hit (DP 5)', byId.get('0000_10')?.stats.hits[0], 410);
  eq('Android 16 first rush hit (1.05 + 0.15)', byId.get('0440_00')?.stats.hits[0], 468);
  const pump = skillNamed('0440_00', 'Pump Up');
  eq('Android 16 Pump Up: rush +15%', pump?.phases?.[0]?.effects.find(e => e.key === 'rushDamage')?.value, 0.15);
  eq('Android 16 Pump Up duration', pump?.duration, 20);
  eq('Android 16 + Rush Attack Boost 3 + Pump Up, first rush hit (additive: 312 x 1.25 x 1.425)', run('0440_00', { capsules: ['00_0_0007'], skills: [pump?.id] }).rush, 556);
  const kaio = skillNamed('0000_43', 'Kaioken');
  eq('SSGSS Goku Kaioken duration', kaio?.duration, 25);
  eq('SSGSS Goku Kaioken super damage', kaio?.phases?.[0]?.effects.find(e => e.key === 'superDamage')?.value, 0.2);
  const unf = skillNamed('0031_02', 'Unforgivable');
  eq('Unforgivable phases', unf?.phases?.map(p => p.duration).join('/'), '15/30');
  eq('Rising Fighting Spirit fills ki', run('0000_00', { capsules: ['00_0_0072'] }).startingKi, byId.get('0000_00')?.stats.maxKi);
  eq('Latent Power Unleashed 2 adds 2 bars (capped at max)', run('0000_00', { capsules: ['00_0_0095'] }).startingKi, Math.min(byId.get('0000_00').stats.startingKi + 2, byId.get('0000_00').stats.maxKi));
  eq('Master Roshi Training +2500 HP', run('0000_00', { capsules: ['00_0_0000'] }).health, byId.get('0000_00').stats.health + 2500);
  eq('Super Warrior applies only while Sparking', run('0000_10', { capsules: ['00_0_0031'] }).rush, 410);
  eq('Super Warrior while Sparking (312 x 1.25 x 1.10)', run('0000_10', { capsules: ['00_0_0031'], sparking: true }).rush, 429);
  const death = (data.blasts['3360_00'] || []).find(b => b.name === 'Death Sphere');
  eq("Chilled's Death Sphere (computed: 12000 x 1.25 x (1.05 + 0.175))", death?.damage, 18375);
  check(!expect.length, 'engine reproduces the known values (rush 390/410/468, additive capsule + skill stacking, Pump Up, Kaioken, Unforgivable, ki capsules, Sparking conditions, Death Sphere)', expect);

  // Measured in game by the league on 2026-10-07 (training, Goku (Z - Early) dummy, defense 1.0).
  // Each one settled a rule: the formula over Capsule Corp's negative values (Mr. Satan), the
  // class-label rescale (Baby Vegeta, Vegeta), additive stacking (Android 16), Capsule Corp's
  // multi-hit first strikes (Kid Buu), a computed ultimate (Death Sphere, checked above) and the
  // game's defense formula over Capsule Corp's (Baby Vegeta taking a 390 hit).
  const named = (n) => data.characters.find(c => c.name === n);
  const game = [];
  const ig = (label, got, want) => { if (got !== want) game.push(`${label}: got ${JSON.stringify(got)}, game ${want}`); };
  ig('Mr. Satan smash', named('Mr. Satan')?.stats.smash, 156);
  ig('Mr. Satan throw', named('Mr. Satan')?.stats.throw, 288);
  ig('Mr. Satan ki blast', named('Mr. Satan')?.stats.kiBlastDamage, 58);
  ig('Baby Vegeta (GT) first rush hit', named('Baby Vegeta (GT)')?.stats.hits[0], 371);
  ig('Vegeta (Z - Early) ki blast', named('Vegeta (Z - Early)')?.stats.kiBlastDamage, 238);
  ig('Android 16 + Rush Attack Boost 3, first rush hit', run('0440_00', { capsules: ['00_0_0007'] }).rush, 498);
  ig('Kid Buu first rush hit', named('Kid Buu')?.stats.hits[0], 564);
  const bv = named('Baby Vegeta (GT)');
  ig('Goku (Z - Early) first rush hit into Baby Vegeta (GT)', Math.round(390 * (bv?.stats.meleeDefense ?? 0)), 410);
  // Second round, same day: blasts and skills
  const blastOf = (n, move) => (data.blasts[named(n)?.id] || []).find(b => b.name === move)?.damage;
  for (const [n, move, want] of [
    ['Chiaotzu', 'Farewell, Mr. Tien', 16250], ['Super Vegeta', 'Spirit Breaking Cannon', 10051],
    ['Janemba', 'Illusion Smash', 18750], ['Gohan (Kid)', 'Wild Rush Blaster', 17250],
    ['Gohan (Teen) Super Saiyan 2', 'Father-Son Kamehameha', 19250], ['Metal Cooler', 'Finger Blitz Barrage', 8300],
    ['Goku (Super) Ultra Instinct -Sign-', 'Flash -Sign-', 11307], ['Gamma 1', 'Gamma Impact', 9632],
  ]) ig(`${n} ${move}`, blastOf(n, move), want);
  const skillOf = (n, skill) => Object.values(data.skills).find(s => s.character === named(n)?.id && s.name === skill)?.damage;
  ig('Goku (Daima) Super Saiyan 4 Saiyan Burst', skillOf('Goku (Daima) Super Saiyan 4', 'Saiyan Burst'), 1313);
  ig('Vegeta (Daima) Super Saiyan 3 Saiyan Burst', skillOf('Vegeta (Daima) Super Saiyan 3', 'Saiyan Burst'), 1266);
  ig('Super Garlic Jr. Sealing Paralyze Beam', skillOf('Super Garlic Jr.', 'Sealing Paralyze Beam'), 594);
  // Spread shots use the league's usual hit count (2026-10-08): one shot x hits
  ig('Krillin Spread Energy Wave (3 of 6 shots x 2257)', blastOf('Krillin', 'Spread Energy Wave'), 6771);
  ig('Fasha Energy Bullet (5 of 10 shots x 1030)', blastOf('Fasha', 'Energy Bullet'), 5150);
  // 2026-10-09: rain-down spreads land about half their shots
  ig('Super Buu Assault Rain (7 of 15 shots x 797)', blastOf('Super Buu', 'Assault Rain'), 5579);
  ig('Anilaza Spread Energy Blast (5 of 10 shots x 813)', blastOf('Anilaza', 'Spread Energy Blast'), 4065);
  // Third round, 2026-10-08: defense, armor, ki and the remaining blasts
  const taken = (hit, s) => Math.ceil(hit * s.meleeDefenseStat * (1 - (s.armor || 0)) - 1e-9);
  ig('Goku (Z - Early) first rush hit into Android 16', taken(390, run('0440_00')), 341);
  ig('... into Android 16 while Sparking (25% armor)', taken(390, run('0440_00', { sparking: true })), 256);
  ig('... into Janemba (10% armor)', taken(390, run('0650_00')), 278);
  ig('... into Janemba while Sparking (armor does not stack: 25%)', taken(390, run('0650_00', { sparking: true })), 232);
  ig('Vegeta (Z - Early) ki blasts from one full bar', Math.floor(1 / named('Vegeta (Z - Early)').stats.kiBlastCost), 8);
  for (const [n, move, want] of [
    ['Goku (Super)', 'Power Pole Dance', 8794], ['Vegeta (Z - Early) Super Saiyan', 'Cosmic Impact', 9001],
    ['Gotenks Super Saiyan 3', 'Charging Ultra Buu Buu Volleyball', 19501], ['Super Zarbon', 'Monster Crush', 15688],
    ['Broly (Z) Super Saiyan', 'Bloody Smash', 9713], ['Cell Jr.', 'Innocence Rush', 7957], ['Baby Vegeta (GT)', 'Finger Blitz Barrage', 6580],
    ['Vegeta (Z - End) Super Saiyan', 'Infinite Blaster', 9000], ['Zarbon', 'Shooting Star Arrow', 5940],
    ['Chilled', 'Death Rain', 11028], ['Champa', "God of Destruction's Menace", 12255], ['Super 17 (GT)', 'Flash Bomber', 7530],
  ]) ig(`${n} ${move}`, blastOf(n, move), want);
  const glorio = (data.blasts[named('Glorio')?.id] || []).find(b => b.name === 'Lightning Cannon');
  if (!glorio?.traits.includes('Unguardable')) game.push('Glorio Lightning Cannon is unguardable (in game 2026-10-08)');
  // Fourth round, 2026-10-09: short-dash scale, Cheelai, blast categories, cinematics and clashes
  ig('Goku (Z - Early) short dashes from one full bar', Math.floor(1 / named('Goku (Z - Early)').stats.shortDashCost), 3);
  ig('Cheelai Energy Shot (one bullet)', blastOf('Cheelai', 'Energy Shot'), 5914);
  const blastRow = (n, move) => (data.blasts[named(n)?.id] || []).find(b => b.name === move);
  const clashOf = (b) => b?.flags.includes('beamClashCapable') ? 'Beam Clash' : b?.flags.includes('dashClashCapable') ? 'Speed Clash' : 'none';
  for (const [n, move, cat, cine, clash] of [
    ['Glorio', 'Lightning Cannon', 'Short-Range Energy Attack', null, null], ['Cell Max', 'Max Bomb', 'Fire', true, null],
    ['Gamma 1', 'Gamma Shift Shot', 'Continuous Fire', true, null], ['Orange Piccolo Giant Form', 'Apocalyptic Burst', 'Rush', true, null],
    ['Piccolo (Super Hero)', 'Light Grenade', 'Fire', false, null], ['Mighty Mask', 'Mighty Rush', null, true, null],
    ['Dr. Wheelo', 'Gigantic Bomber', null, null, 'none'], ['Majin Kuu', 'Majin Corkscrew Attack', null, null, 'Speed Clash'],
    ['Giant Gomah', 'Giga Magic Burst', 'Fire', null, 'Beam Clash'], ['Captain Ginyu', 'Galaxy Dynamite', null, null, 'Beam Clash'],
  ]) {
    const b = blastRow(n, move);
    if (cat) ig(`${n} ${move} category`, b?.category, cat);
    if (cine !== null) ig(`${n} ${move} cinematic`, !!b?.traits.includes('Cinematic'), cine);
    if (clash) ig(`${n} ${move} clash`, clashOf(b), clash);
  }
  // 2026-10-09: each ki blast in a combo deals 5% of the first shot less; hits on armor are not a combo
  ig('Ki blast volley, 5 x 250 with falloff', kiBlastVolley({ kiBlastDmg: 250, kiBlastLimit: 5 }), 1125);
  ig('Ki blast volley, 20 x 250, falloff held at 40% from shot 13 (game curve)', kiBlastVolley({ kiBlastDmg: 250, kiBlastLimit: 20 }), 2975);
  ig('Ki blast volley, 5 x 250 into 25% armor (no falloff)', kiBlastVolley({ kiBlastDmg: 250, kiBlastLimit: 5 }, { opponentStats: { energy: 1, armor: 0.25 } }), 940);
  // 2026-10-10: Goku (Z - Early)'s charged ki blast, standing at three charge levels and moving
  const gokuKb = data.characters.find(c => c.id === '0000_00')?.kiBlasts?.charged;
  ig('Goku charged ki blast standing, no / first / full charge', gokuKb?.standing?.damage?.join(' / '), '938 / 1407 / 1875');
  ig('Goku charged ki blast moving, no charge', gokuKb?.moving?.damage?.[0], 875);
  const cm = (cid) => data.characters.find(c => c.id === cid)?.chargedMelee;
  ig('Goku full charged smash', cm('0000_00')?.smash?.[2], 1400);
  ig('Goku hyper smash', cm('0000_00')?.hyperSmash, 2450);
  ig('Tien Heavy Finish (combo channel)', cm('0070_00')?.heavyFinish?.[0], 743);
  // Pursuits (game files, 2026-10-11): Videl and Mr. Satan have no Vanishing Attack or Lightning Attack, but Dragon Homing
  const pu = (name) => data.characters.find(c => c.name === name)?.moveset?.pursuits;
  ig('Videl pursuits', JSON.stringify([pu('Videl')?.vanishingAttack, pu('Videl')?.lightningAttack, pu('Videl')?.dragonHoming]), JSON.stringify([false, false, { limit: 2 }]));
  ig('Mr. Satan pursuits', JSON.stringify([pu('Mr. Satan')?.vanishingAttack, pu('Mr. Satan')?.lightningAttack, pu('Mr. Satan')?.dragonHoming]), JSON.stringify([false, false, false]));
  ig('Goku (Z - Early) follow-up limit, and in Sparking', JSON.stringify([pu('Goku (Z - Early)')?.limit, pu('Goku (Z - Early)')?.sparkingAdd]), JSON.stringify([2, 2]));
  // Rush Chains (2026-10-11): totals before and after each chain, on a dummy with no capsules or skills
  const rcd = (cid, type) => data.characters.find(c => c.id === cid)?.rushChainDamage?.[type];
  const j = (v) => JSON.stringify(v);
  ig('Tien Ki Blast Cannon, uncharged and full (combo channel)', j([rcd('0070_00', 'Ki Blast Cannon')?.damage?.[0], rcd('0070_00', 'Ki Blast Cannon')?.damage?.[2]]), j([853, 1472]));
  ig('Goku Flying Kicks (no Power in two files: 300)', rcd('0000_00', 'Flying Kicks')?.damage?.[0], 1150);
  ig('Goku Heavy Crush after Heavy Finish', j(rcd('0000_00', 'Heavy Finishes')?.followUps?.['Heavy Crush']?.hits), j([350, 425, 563]));
  ig('Goku Ki Blast Cannon full, then Ki Blast Cannon Attack', j([rcd('0000_00', 'Ki Blast Cannon')?.damage?.[2], ...(rcd('0000_00', 'Ki Blast Cannon')?.followUps?.['Ki Blast Cannon Attack']?.hits || [])]), j([1338, 625, 775, 925]));
  ig('Bardock Rolling Hammer uncharged, then Rolling Hurricane', j([rcd('0310_00', 'Rolling Hammer')?.damage?.[0], ...(rcd('0310_00', 'Rolling Hammer')?.followUps?.['Rolling Hurricane']?.hits || [])]), j([338, 500, 800]));
  ig('Piccolo Rush Ki Waves uncharged and full (5 hits)', j([rcd('0040_00', 'Rush Ki Waves')?.damage?.[0], rcd('0040_00', 'Rush Ki Waves')?.damage?.[2]]), j([625, 1875]));
  ig('Piccolo Energy Storm (its first press, two hits)', rcd('0040_00', 'Rush Ki Waves')?.followUps?.['Energy Storm']?.total, 1226);
  // 2026-10-11, second round
  ig('Bardock Rolling Hammer at each charge (one hit)', j(rcd('0310_00', 'Rolling Hammer')?.damage), j([338, 425, 563]));
  ig('Tien Ki Blast Cannon Smash (after a full charge)', j([rcd('0070_00', 'Ki Blast Cannon')?.followUps?.['Ki Blast Cannon Smash']?.total, rcd('0070_00', 'Ki Blast Cannon')?.followUps?.['Ki Blast Cannon Smash']?.needsFullCharge]), j([880, true]));
  ig('Goku (GT) Heavy Finish, then Delta Heavy Finish', j([rcd('0002_30', 'Heavy Finishes')?.damage?.[0], rcd('0002_30', 'Heavy Finishes')?.damage?.[2], ...(rcd('0002_30', 'Heavy Finishes')?.followUps?.['Delta Heavy Finish']?.hits || [])]), j([709, 1470, 473, 381, 552]));
  const g1 = data.characters.find(c => c.name === 'Gamma 1')?.id;
  ig('Gamma 1 Rolling Hammer, then Rolling Press', j([rcd(g1, 'Rolling Hammer')?.damage?.[0], ...(rcd(g1, 'Rolling Hammer')?.followUps?.['Rolling Press']?.hits || [])]), j([355, 1788, 788]));
  for (const [n, want] of [['Burter', [864, 5]], ['Tapion', [770, 4]], ['Gogeta (Super) Super Saiyan', [2196, 5]]]) {
    const fk = rcd(data.characters.find(c => c.name === n)?.id, 'Flying Kicks');
    ig(`${n} Flying Kicks (total, hits)`, j([fk?.damage?.[0], fk?.hits?.[0]?.length]), j(want));
  }
  ig('Goku Grand Slash uncharged and full, then Tornado Slash', j([rcd('0000_00', 'Grand Slash')?.damage?.[0], rcd('0000_00', 'Grand Slash')?.damage?.[2], ...(rcd('0000_00', 'Grand Slash')?.followUps?.['Tornado Slash']?.hits || [])]), j([625, 1263, 450, 363, 525]));
  // 2026-10-11, third round
  ig('Piccolo Rush Ki Waves at each charge', j(rcd('0040_00', 'Rush Ki Waves')?.damage), j([625, 1625, 1875]));
  ig('Goku Aerial Slash (three kicks, then the finisher)', j(rcd('0000_00', 'Grand Slash')?.followUps?.['Aerial Slash']?.hits), j([1125, 400]));
  ig('Goku Lift Strike at each charge', j(rcd('0000_00', 'Lift Strike')?.damage), j([675, 900, 1338]));
  ig('Piccolo Energy Storm flurry shot (shave damage) and its measurement', j(rcd('0040_00', 'Rush Ki Waves')?.followUps?.['Energy Storm']?.kiBlastFlurry), j({ shots: 9, perShot: 32, measured: { total: 224, shotsLanded: 7 } }));
  {
    // Devilmite Beam: its damage x the opponent's wickedness / 20 (Goku 0: 0 damage; Frieza (Z) 1st Form 16: 28,350)
    const devil = data.characters.find(c => c.name === 'Spike the Devil Man');
    const beam = data.blasts[devil?.id]?.find(b => b.name === 'Devilmite Beam');
    const on = (n) => { const c = data.characters.find(x => x.name === n); const o = run(c.id); return damageTaken(beam.damage * c.wickedness / 20, o.blastDefense); };
    ig('Devilmite Beam is wickedness-scaled', beam?.flags?.includes('wickednessScaled'), true);
    ig('Devilmite Beam on Goku (Z - Early)', on('Goku (Z - Early)'), 0);
    ig('Devilmite Beam on Frieza (Z) 1st Form', on('Frieza (Z) 1st Form'), 28350);
  }
  {
    const tr = (n, mv) => ['homing', 'steering', 'straight'].find(f => data.blasts[data.characters.find(c => c.name === n)?.id]?.find(b => b.name === mv)?.flags?.includes(f));
    ig('rush tracking (league 2026-10-11)', JSON.stringify([tr('Vegeta (Z - Scouter)', 'Final Galick Cannon'), tr('Kefla', 'Gigantic Swing'), tr('Goku (Z - Early)', 'Kaioken Attack'), tr('Piccolo', 'Explosive Breath Cannon')]),
      JSON.stringify(['straight', 'straight', 'homing', 'homing']));
  }
  {
    // Game files (2026-10-11): energy attack speed (top of the projectile's speed curve) and self-damage
    const bl = (n, mv) => data.blasts[data.characters.find(c => c.name === n)?.id]?.find(b => b.name === mv);
    ig('blast speed: Goku Kamehameha, Vegeta (Z - Scouter) Galick Gun, Goku Spirit Bomb',
      JSON.stringify([bl('Goku (Z - Early)', 'Kamehameha')?.projectileSpeed, bl('Vegeta (Z - Scouter)', 'Galick Gun')?.projectileSpeed, bl('Goku (Z - Early)', 'Spirit Bomb')?.projectileSpeed]), JSON.stringify([16000, 31000, 10000]));
    const selfDmgTrait = Object.values(data.blasts).flat().filter(b => b.traits.includes('Self-damage') && !b.selfDamage).map(b => b.name);
    check(!selfDmgTrait.length, 'every Self-damage blast has its self-damage amount from the game files', selfDmgTrait);
    ig('self-damage: Neo Tri-Beam per shot, Final Explosion takes all health', JSON.stringify([bl('Tien', 'Neo Tri-Beam')?.selfDamage?.power, bl('Majin Vegeta', 'Final Explosion')?.selfDamage?.allHealth]), JSON.stringify([2000, true]));
    // Evil Containment Wave's self-damage by the opponent's DP (league 2026-10-11: Mr. Satan DP 1, Goku (Z - Early) DP 4, Goku (Z - End) SS3 DP 7)
    const ecw = bl('Master Roshi', 'Evil Containment Wave')?.selfDamage;
    ig('Evil Containment Wave self-damage against DP 1, 4, 7', JSON.stringify([1, 4, 7].map(d => Math.round(ecw.power * ecw.dpMultiplier[d]))), JSON.stringify([5000, 6500, 9000]));
  }
  ig('Justice Kick steers but is not a crash; Dodoria Head Ram crashes', JSON.stringify([
    data.blasts[data.characters.find(c => c.name === 'Dyspo')?.id]?.find(b => b.name === 'Justice Kick')?.flags?.includes('crash'),
    data.blasts[data.characters.find(c => c.name === 'Dodoria')?.id]?.find(b => b.name === 'Dodoria Head Ram')?.flags?.includes('crash')]), JSON.stringify([false, true]));
  ig('Vegeta (Z - Scouter) Explosive Wave interrupts', data.skills['0020_00:1']?.display?.interrupts, true);
  const stageGaps = Object.values(data.skills).filter(k => k.phases.every(p => p.list != null) && !!k.stages !== k.phases.some(p => p.stage > 1)).map(k => k.id);
  check(!stageGaps.length, "skill stages (same effects in every phase) match the game's buff stages; other phases apply together", stageGaps);
  ig('Goku (GT) Blaster Wave uncharged and full, then Blaster Wave Combo', j([rcd('0002_30', 'Blaster Wave')?.damage?.[0], rcd('0002_30', 'Blaster Wave')?.damage?.[2], ...(rcd('0002_30', 'Blaster Wave')?.followUps?.['Blaster Wave Combo']?.hits || [])]), j([814, 1405, 657, 814]));
  ig('Great Ape Vegeta smash, normal / full', cm('0023_00')?.smash ? `${cm('0023_00').smash[0]} / ${cm('0023_00').smash[2]}` : null, '1722 / 3570');
  ig('Ma Junior Giant Form smash, normal / full', cm('3310_10')?.smash ? `${cm('3310_10').smash[0]} / ${cm('3310_10').smash[2]}` : null, '1688 / 3500');
  ig('Great Ape Vegeta published smash is the game smash', data.characters.find(c => c.id === '0023_00')?.stats.smash, 1722);
  ig('Goku jump ki blast, first shot (default Power 250)', data.characters.find(c => c.id === '0000_00')?.kiBlasts?.jump?.normal?.damage, 313);
  // 2026-10-10: the in-game Rush Chain lists (chain type, then its follow-ups)
  const chainsOf = (cid) => (data.characters.find(c => c.id === cid)?.moveset?.rushChains || [])
    .map(r => [r.type, ...r.followUps].join(': ')).join(' | ');
  for (const [cid, want] of [
    ['0000_00', 'Heavy Finishes: Heavy Crush | Ki Blast Cannon: Ki Blast Cannon Attack | Flying Kicks | Heavy Finishes: Heavy Crush'],
    ['0070_00', 'Ki Blast Cannon: Ki Blast Cannon Smash | Flying Kicks | Heavy Finishes: Heavy Crush | Heavy Finishes: Heavy Crush'],
    [data.characters.find(c => c.name === 'Goku (Mini)')?.id, 'Flying Kicks | Heavy Finishes: Heavy Crush | Heavy Finishes: Heavy Crush | Flying Kicks'],
    [data.characters.find(c => c.name === 'Gamma 1')?.id, 'Flying Kicks | Rolling Hammer: Rolling Hurricane: Rolling Press | Heavy Finishes: Heavy Crush: Delta Heavy Finish | Ki Blast Cannon: Ki Blast Cannon Smash: Ki Blast Cannon Attack'],
    ['0550_00', 'Flying Kicks | Ki Blast Cannon: Ki Blast Cannon Attack | Rush Ki Waves: Energy Storm | Heavy Finishes: Heavy Crush: Delta Heavy Finish'],
    ['0551_00', 'Heavy Finishes: Heavy Crush: Delta Heavy Finish | Rolling Hammer: Rolling Hurricane | Blaster Wave: Blaster Wave Combo | Flying Kicks'],
    ['0552_00', 'Heavy Finishes: Heavy Crush | Rolling Hammer: Rolling Press | Blaster Wave: Blaster Wave Combo | Rush Ki Waves: Energy Storm'],
  ]) ig(`${data.characters.find(c => c.id === cid)?.name} Rush Chains`, chainsOf(cid), want);
  const slashOf = (cid) => data.characters.find(c => c.id === cid)?.moveset?.grandSlash?.followUps?.join(', ');
  ig('Goku Grand Slash follow-ups', slashOf('0000_00'), 'Tornado Slash, Aerial Slash');
  ig('Tien Grand Slash follow-ups (AirRush: no Aerial Slash)', slashOf('0070_00'), 'Tornado Slash');
  for (const n of ['Krillin', 'Goku (Teen)']) ig(`${n} Grand Slash follow-ups (DragonTornado: no Tornado Slash)`, slashOf(data.characters.find(c => c.name === n)?.id), 'Aerial Slash');
  // 2026-10-10: armor. Goku's fully charged ki blast breaks base Janemba's Hyper Armor (1,919) but not his Sparking Armor (1,439)
  const gArmor = data.characters.find(c => c.id === '0000_00')?.armor, jArmor = data.characters.find(c => c.id === '0650_00')?.armor;
  const gFull = gArmor?.breakLevels?.chargedKiBlast?.[2];
  ig('Goku full charged ki blast breaks base Janemba (Hyper Armor)', gFull != null && jArmor?.base && gFull >= jArmor.base.level, true);
  ig('Goku full charged ki blast does not break Sparking Janemba', gFull != null && jArmor?.sparking && gFull < jArmor.sparking.level, true);
  ig('Janemba Sparking Armor damage rate (1,919 to 1,439)', jArmor?.sparking?.damageRate, 0.75);
  const abGaps = data.characters.filter(c => c.armor && c.stats.armorBreak != null && c.armor.hyperArmorBreakHits !== c.stats.armorBreak).map(c => c.name);
  check(!abGaps.length, 'every character\'s armor break (hits to break Hyper Armor) follows from the game\'s armor tables', abGaps);
  // The engine's armor (2026-10-10): Goku's fully charged ki blast (1,875) vs base Janemba 1,919, vs Sparking
  // Janemba 1,439 (Sparking Armor level 4 holds), vs Sparking Bardock 1,875 (level 3: a tie breaks it)
  {
    const g = run('0000_00');
    const full = byId.get('0000_00')?.kiBlasts?.charged?.standing?.damage?.[2];
    const vs = (oppId, sparking) => {
      const o = run(oppId, { sparking });
      return damageTaken(full, o.energy, armorFactor(g.breakLevels?.chargedKiBlast?.[2], o));
    };
    ig('Goku full charged ki blast vs Janemba', vs('0650_00', false), 1919);
    ig('Goku full charged ki blast vs Sparking Janemba', vs('0650_00', true), 1439);
    ig('Goku full charged ki blast vs Sparking Bardock', vs('0310_00', true), 1875);
    // the rush combo: Goku's hits 1-4 don't break Janemba's Sparking Armor, hit 5 does (as the hit count said)
    const combo = calcOutgoingCombo(g, run('0650_00', { sparking: true }));
    ig('Goku rush vs Sparking Janemba: armored hits', combo?.perHit?.map(h => h.armorReduced).join(','), 'true,true,true,true,false');
    // 2026-10-11: in Sparking, the common Sparking buff's +3 break level breaks Sparking Janemba's armor: the fully
    // charged ki blast lands in full (1,919) and so does the first rush hit
    const gs = run('0000_00', { sparking: true }), js = run('0650_00', { sparking: true });
    ig('Sparking Goku full charged ki blast vs Sparking Janemba', damageTaken(full, js.energy, armorFactor(gs.breakLevels?.chargedKiBlast?.[2], js)), 1919);
    ig('Sparking Goku rush hit 1 breaks Sparking Janemba', calcOutgoingCombo(gs, js)?.perHit?.[0]?.armorReduced, false);
  }
  const a16 = run('0440_00');
  ig('Android 16 5-hit damage taken rounds each hit up', a16.melee, a16.referenceHits.reduce((t, h) => t + Math.ceil(h * a16.meleeDefenseStat - 1e-9), 0));
  check(!game.length, 'published values equal the league in-game measurements (2026-10-07 to 09: rush, smash, throw, ki blast, defense, armor, ki cost, short dash, 20+ blasts, skills, spread shots, blast categories, cinematics, clashes, ki volley falloff, charged ki blast, jump ki blast, charged smash, Giant smash, Heavy Finish, Rush Chains and their damage, armor)', game);

  // Ultimates need Sparking Mode: their damage includes the Sparking passive and the toggle leaves them alone
  const ult = [];
  const kidOff = run('0030_00'), kidOn = run('0030_00', { sparking: true });
  if (kidOn.blastFactor.ultimate !== 1) ult.push(`Gohan (Kid) Sparking toggle changes ultimate damage (factor ${kidOn.blastFactor.ultimate})`);
  if (kidOn.rush <= kidOff.rush) ult.push('Gohan (Kid) Sparking toggle no longer raises rush damage');
  if (kidOff.ultimate !== 0.15) ult.push(`Gohan (Kid) ultimate modifier ${kidOff.ultimate}, want 0.15 (0.95 + 0.20 Sparking passive - 1)`);
  check(!ult.length, 'ultimate damage always includes the Sparking passive; the Sparking toggle changes the other channels only', ult);

  // With no effects the engine must leave every published number alone.
  const drift = [];
  for (const c of data.characters) {
    const v = computeStats(c, { applied: [], notes: [], outgoing: [] }, ctx);
    const s = c.stats;
    const pairs = [['rush', s.hits[0]], ['hit5', s.hits[4]], ['smash', s.smash], ['throw', s.throw], ['kiBlastDmg', s.kiBlastDamage], ['meleeDefenseStat', s.meleeDefense], ['energy', s.kiBlastDefense], ['blastDefense', s.blastDefense], ['startingKi', s.startingKi], ['kiRegen', s.kiRegen], ['health', s.health]];
    for (const [k, want] of pairs) if (v[k] !== want) drift.push(`${c.name}.${k}: ${v[k]} vs ${want}`);
  }
  check(!drift.length, `with no effects the engine reproduces every character's published stats (${data.characters.length})`, drift);
}

// ------------------------------------------------------------------ images
{
  const thumbs = new Set(fs.readdirSync(path.join(APP, 'public', 'char_thumbnails')));
  const missing = legacy.characters.filter(c => !legacy.characterImages[c.name] || !thumbs.has(legacy.characterImages[c.name])).map(c => c.name);
  if (missing.length) warn('characters without a face icon (the selector shows their initial)', missing); else ok('every character has a face icon');
}

console.log(failed ? `verify-data: ${failed} FAIL, ${warned} WARN` : `verify-data: all checks passed${warned ? ` (${warned} WARN)` : ''}`);
process.exit(failed ? 1 : 0);
