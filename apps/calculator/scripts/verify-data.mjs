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
  check(!game.length, 'published values equal the league in-game measurements (2026-10-07 to 09: rush, smash, throw, ki blast, defense, armor, ki cost, short dash, 20+ blasts, skills, spread shots, blast categories, cinematics, clashes)', game);

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
