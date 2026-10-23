/**
 * Checks the calculator's published data (public/data/) and curated tables before
 * every build (prebuild, after build-data). Prints `  ok  ` / `  FAIL ` / `  WARN `
 * lines and exits 1 on any FAIL. Imports the modules that ship (the share-link
 * decoder, the address codec, the engine, the website's form-chain walk) so the checks cannot drift
 * from what runs in the browser.
 *
 * Usage: node scripts/verify-data.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readCsv } from './lib/csv.mjs';
import yaml from 'js-yaml';
import { loadRefdata, normName, repoRoot } from './lib/refdata.mjs';
import { LEAGUE_BUILDS_SHOWN } from './lib/lineups.mjs';
import { decodeBuild, encodeBuild, makeResolver } from '../src/utils/shareLink.js';
import { linkIndex, readLink, writeLink } from '../src/links.js';
import { applyOrder } from './lib/order.mjs';
import { buildTransformAdj, getFormChain, calculatorSlug } from '../../website/src/utils/formChain.js';
import { collectEffects, computeStats, scaleChannel, skillHit, skillTaken } from '../src/utils/engine.js';
import { parseCondition } from '../src/utils/conditions.js';
import { kiBlastVolley, armorFactor, damageTaken, calcOutgoingCombo } from '../src/utils/calculator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(__dirname, '..');
const ROOT = repoRoot(__dirname);
const DATA = path.join(APP, 'data');
const PUBLIC = path.join(APP, 'public', 'data');
const config = JSON.parse(fs.readFileSync(path.join(DATA, 'config.json'), 'utf8'));
const ref = loadRefdata(ROOT, config.teamsSeason);

let failed = 0, warned = 0;
const ok = (m) => console.log(`  ok    ${m}`);
const fail = (m, items = []) => { failed++; console.log(`  FAIL  ${m}`); for (const i of items.slice(0, 15)) console.log(`          ${i}`); if (items.length > 15) console.log(`          ... and ${items.length - 15} more`); };
const warn = (m, items = []) => { warned++; console.log(`  WARN  ${m}`); for (const i of items.slice(0, 10)) console.log(`          ${i}`); if (items.length > 10) console.log(`          ... and ${items.length - 10} more`); };
const check = (cond, m, items) => (cond ? ok(m) : fail(m, items));
const read = (f) => JSON.parse(fs.readFileSync(path.join(PUBLIC, f), 'utf8'));
const pack = (o) => btoa(encodeURIComponent(JSON.stringify(o)));

console.log('verify-data (schema 2, full roster)');

// ------------------------------------------------------------------ load
const data = { characters: read('characters.json'), skills: read('skills.json'), blasts: read('blasts.json'), capsules: read('capsules.json'), teams: read('teams.json'), meta: read('meta.json') };
const aliasMap = {};
for (const c of data.characters) for (const a of c.aliases || []) aliasMap[a] = c.id;
const chars = data.characters;

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
  // referencedata's order with the league's moves (curated/character-order.csv)
  const moves = readCsv(path.join(DATA, 'curated', 'character-order.csv')).rows;
  const want = applyOrder(ref.characters.filter(c => chars.some(x => x.id === c.id)), moves);
  check(!want.problems.length && want.list.map(c => c.id).join() === chars.map(c => c.id).join(),
    `characters follow referencedata order with the league's ${moves.length} moves (curated/character-order.csv)`, want.problems);
  const missing = ref.characters.filter(c => !chars.some(x => x.id === c.id)).map(c => `${c.id} ${c.name}`);
  check(!missing.length, `every referencedata character is published (${chars.length}/${ref.characters.length})`, missing);
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
  const caps = data.capsules;
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
  {
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

// ------------------------------------------------------------------ addresses (src/links.js: /calculator/<fighter>/vs/<opponent>?caps=...)
{
  // slugs are the link names: unique, never empty, never mistakable for an id or for the path's "vs"
  const slugIssues = (list, what) => {
    const seen = new Map(), out = [];
    for (const x of list) {
      if (!x.slug) out.push(`${x.name}: no slug`);
      else if (/_/.test(x.slug) || x.slug === 'vs') out.push(`${x.name}: "${x.slug}" can be read as an id or the path's vs`);
      else if (seen.has(x.slug)) out.push(`"${x.slug}": ${seen.get(x.slug)} and ${x.name}`);
      seen.set(x.slug, x.name);
    }
    check(!out.length, `every ${what} has its own link name (${list.length} slugs, unique, none like an id)`, out);
  };
  slugIssues(chars, 'character');
  const webSlug = chars.filter(c => calculatorSlug(c.name) !== c.slug).map(c => `${c.name}: ${calculatorSlug(c.name)} vs ${c.slug}`);
  check(!webSlug.length, 'the website Teams page links each name to its fighter\'s page (formChain.js calculatorSlug gives every published slug)', webSlug);
  slugIssues(data.capsules, 'capsule');
  const ix = linkIndex({ characters: chars, capsules: data.capsules, skillsById: data.skills, rulesets: data.meta.rulesets, defaultRuleset: data.meta.defaultRuleset });
  const caps = data.capsules.filter(c => !c.bannedIn?.length).slice(0, 7).map(c => c.id);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const bad = [];
  for (const c of chars) {
    const skills = {}, stage = {};
    for (const k of c.skills || []) { const s = data.skills[k]; if (s) { skills[s.slot] = true; if (s.phases?.length > 1) stage[s.slot] = 2; } }
    const A = { id: c.id, caps, skills, stage, sparking: true, sit: { hp: 0.4, ki: 3, skill: 2, map: 'namek', events: { knockout: true } } };
    const B = { id: chars[0].id, caps: caps.slice(0, 2), skills: {}, stage: {}, sparking: false, sit: null };
    const st = { view: 'versus', A, B, rs: data.meta.rulesets.at(-1).name, d: 'full', vl: 'match' };
    const link = writeLink(st, ix);
    const [path, search = ''] = link.split('?');
    const back = readLink(path, search, ix);
    if (!same(back, st)) bad.push(`${c.name}: ${link}`);
    const byId = readLink(c.id, '', ix);
    if (byId.A?.id !== c.id || byId.view !== 'fighter') bad.push(`${c.name}: the id ${c.id} doesn't open it`);
  }
  check(!bad.length, `addresses round-trip for all ${chars.length} fighters (both sides, 7 capsules, skills and stages, Sparking, conditions, ruleset, Full, Matchup) and each id opens its fighter`, bad);
  check(writeLink({ view: 'versus', A: { id: '0000_00', caps: ['00_0_0005', '00_0_0026'], skills: {}, stage: {}, sparking: true, sit: null }, B: { id: '0650_00', caps: [], skills: {}, stage: {}, sparking: false, sit: null }, rs: data.meta.defaultRuleset, d: 'quick', vl: 'side' }, ix)
    === 'goku-z-early/vs/janemba?caps=rush-attack-boost-1,blast-burst&sparking', 'a link reads as names: goku-z-early/vs/janemba?caps=rush-attack-boost-1,blast-burst&sparking');
}

// ------------------------------------------------------------------ field types (characters.json stats, blasts.json)
{
  const STATS = ['health', 'switch', 'armorBreak', 'armor', 'meleeDefense', 'kiBlastDefense', 'kiBlastDefenseArmor', 'blastDefense', 'rush5Hit', 'fiveHitAfterArmor', 'smash', 'throw', 'pursuit', 'kiBlastDamage', 'kiBlastCost', 'kiBlastLimit', 'startingKi', 'maxKi', 'kiCharge', 'attackKiGain', 'kiRegen', 'kiRegenRange', 'shortDashCost', 'skillStart', 'skillLimit', 'skillRegen', 'sparkCharge', 'sparkDuration'];
  const bad = [];
  for (const c of chars) {
    if (typeof c.dp !== 'number') bad.push(`${c.name}.dp = ${JSON.stringify(c.dp)}`);
    for (const f of STATS) if (c.stats?.[f] !== null && typeof c.stats?.[f] !== 'number') bad.push(`${c.name}.stats.${f} = ${JSON.stringify(c.stats?.[f])}`);
    if (!Array.isArray(c.stats?.hits) || c.stats.hits.length !== 5 || c.stats.hits.some(h => typeof h !== 'number')) bad.push(`${c.name}.stats.hits = ${JSON.stringify(c.stats?.hits)}`);
  }
  check(!bad.length, 'stats hold numbers or null, and every character has five rush hits', bad);
  const nulls = [];
  for (const c of chars) for (const f of ['health', 'smash', 'throw', 'kiBlastDamage', 'meleeDefense', 'blastDefense', 'kiBlastDefense']) if (c.stats?.[f] == null) nulls.push(`${c.name}.stats.${f}`);
  check(!nulls.length, 'core combat stats are never null (capsules silently stop applying on null)', nulls);
  // Giants have a four-hit rush, so their fifth hit is 0; every other damage value must be positive
  const nonPositive = [];
  for (const c of chars) {
    const s = c.stats || {};
    for (const [f, v] of [['hit1', s.hits?.[0]], ['hit2', s.hits?.[1]], ['hit3', s.hits?.[2]], ['hit4', s.hits?.[3]], ['smash', s.smash], ['throw', s.throw], ['pursuit', s.pursuit], ['kiBlastDamage', s.kiBlastDamage], ['rush5Hit', s.rush5Hit]]) {
      if (typeof v === 'number' && v <= 0) nonPositive.push(`${c.name}.${f} = ${v}`);
    }
  }
  check(!nonPositive.length, 'damage values are positive (Capsule Corp goes negative for very low coefficients)', nonPositive);
  const bl = [];
  for (const [id, rows] of Object.entries(data.blasts)) for (const b of rows) if (b.damage !== null && typeof b.damage !== 'number') bl.push(`${id} ${b.name}`);
  check(!bl.length, 'blast damage is a number or null', bl);
  const knownSlots = new Set(['Super 1', 'Super 2', 'Ultimate']);
  const slots = Object.entries(data.blasts).flatMap(([id, rows]) => rows.filter(b => !knownSlots.has(b.slot)).map(b => `${id}: ${b.slot}`));
  check(!slots.length, 'blast slots are ones the app knows (Super 1, Super 2, Ultimate)', slots);
  const noBlasts = chars.filter(c => !['Super 1', 'Super 2', 'Ultimate'].every(s => (data.blasts[c.id] || []).some(b => b.slot === s))).map(c => c.name);
  check(!noBlasts.length, 'every character has its two supers and ultimate', noBlasts);
}

// ------------------------------------------------------------------ capsules
{
  const caps = data.capsules;
  const special = [['00_0_0033', 'Light Body'], ['00_0_0032', 'Draconic Aura'], ['00_0_0035', 'Dragon Rush']].filter(([id]) => !caps.some(c => c.id === id));
  check(!special.length, 'the specially handled capsules exist (Light Body, Draconic Aura, Dragon Rush)', special.map(s => s.join(' ')));
  const refCaps = new Map(ref.capsules.map(c => [c.name, c]));
  const unknown = caps.filter(c => !refCaps.has(c.name)).map(c => c.name);
  check(!unknown.length, 'every capsule is in referencedata/capsules.csv', unknown);
  const noCost = caps.filter(c => typeof c.cost !== 'number').map(c => c.name);
  check(!noCost.length, 'every capsule has a cost', noCost);
  {
    // one list of build types for every app (referencedata/capsule-types.json, which the Analyzer reads too)
    const TYPES = ['Melee', 'Blast', 'Ki Blast', 'Defense', 'Skill', 'Ki Efficiency', 'Utility'];
    const untyped = caps.filter(c => !TYPES.includes(c.type)).map(c => `${c.name} (${c.type})`);
    check(!untyped.length, 'every capsule has a build type from referencedata/capsule-types.json', untyped);
  }
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
  check(!broken.length, 'every correctly spelled masterlist entry links into the calculator (website Teams page, run with the shipped formChain.js)', broken);
  if (typos.length) warn(`${typos.length} masterlist entr${typos.length === 1 ? 'y is' : 'ies are'} misspelled in ${ref.seasonFile}, so the website shows them as plain text (the calculator's team filter resolves them through aliases.csv)`, typos);
  const nodes = Object.entries(ref.transformations).filter(([, e]) => e?.name).map(([id, e]) => [id, e.name]);
  const unresolved = nodes.filter(([id, n]) => !calcNames.has(n)).map(([id, n]) => `${id} ${n}`);
  check(!unresolved.length, `every transformations.json node is a calculator name (${nodes.length - unresolved.length}/${nodes.length})`, unresolved);
}

// ------------------------------------------------------------------ engine known values (schema 2)
{
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
  // Fifth round, 2026-10-12: blasts with Blast Burst (+5%, added to the DP scale), each hit rounded up on its own
  // (Energy Blast Barrage: 10 x ceil(600 x 1.25 x 1.05) = 7,880, not 7,500 x 1.05 = 7,875)
  for (const [n, move, want] of [
    ['Goku (Z - Early)', 'Kaioken Attack', 8794], ['Goku (Z - Mid)', 'x20 Kaioken Kamehameha', 7840], ['Goku (Z - Mid)', 'Kaioken Rush', 9213],
    ['Gohan (Teen)', 'Energy Blast Barrage', 7880], ['Cell 2nd Form', 'Big Bang Crash', 7838],
    // re-read the same day: one bullet + 4 beam ticks of 1,140, 5 x 1,497; Drain Life Cell is its own 2,730 + 3,970
    ['Goku (Z - Early)', 'Kamehameha', 7485], ['Gohan (Teen)', 'Super Masenko', 7485], ['Cell 2nd Form', 'Drain Life Cell', 9213],
  ]) {
    const b = (data.blasts[named(n)?.id] || []).find(x => x.name === move);
    ig(`${n} ${move} with Blast Burst`, b && scaleChannel(run(named(n).id, { capsules: ['00_0_0026'] }), 'super', b.damage, b.hits), want);
  }
  // Sixth round, same day: pursuits on Goku (Z - Early), each read as the combo total after a 1,400 full smash
  // (Vanishing Attack and Dragon Homing +1,250, Lightning Attack +1,150 = 2 x 575), and the uses: Vanishing Break
  // and Dragon Break add one to their pursuit and one to the total; Lightning Attack is used once at most
  const gk = run('0000_00'), gkVb = run('0000_00', { capsules: ['00_0_0136'] }), gkDb = run('0000_00', { capsules: ['00_0_0134'] });
  ig('Goku (Z - Early) Vanishing Attack', gk.vanishingAttack, 1250);
  ig('Goku (Z - Early) Dragon Homing (Dragon Smash)', gk.dragonSmash, 1250);
  ig('Goku (Z - Early) Lightning Attack', gk.lightningAttack, 1150);
  ig('Goku (Z - Early) uses: follow-ups / Vanishing / Dragon Homing / Lightning', JSON.stringify(gk.pursuitLimit), JSON.stringify({ general: 2, vanishingAttack: 2, dragonHoming: 2, lightningAttack: 1 }));
  ig('... with Vanishing Break', JSON.stringify(gkVb.pursuitLimit), JSON.stringify({ general: 3, vanishingAttack: 3, dragonHoming: 2, lightningAttack: 1 }));
  ig('... with Dragon Break', JSON.stringify(gkDb.pursuitLimit), JSON.stringify({ general: 3, vanishingAttack: 2, dragonHoming: 3, lightningAttack: 1 }));
  // both together (2026-10-13): 4 in total, 2 Vanishing Attacks then 2 Dragon Homings worked
  const gkBoth = run('0000_00', { capsules: ['00_0_0136', '00_0_0134'] });
  ig('... with both', JSON.stringify(gkBoth.pursuitLimit), JSON.stringify({ general: 4, vanishingAttack: 3, dragonHoming: 3, lightningAttack: 1 }));
  // Seventh round, 2026-10-13: skill damage and Sparking! Mode. The dummy, Goku (Z - Early), wore Sparking! Plus
  // (melee defense x1.2, ki x1.1) to tell the defenses apart.
  const sk = (id, name) => Object.values(data.skills).find(s => s.character === id && s.name === name);
  const plus = run('0000_00', { capsules: ['00_0_0132'] });
  // [who, skill, alone, into Sparking! Plus, which defense]; a second round the same day added the barrier, bind,
  // push, Gogeta's front barrier (and its reflected ki blast) and armor
  const skHit = (n, skill) => { const c = named(n); return skillHit(sk(c?.id, skill), run(c?.id)); };
  const defOf = (h) => (h.defense === 'melee' ? plus.meleeDefenseStat : plus.kiBlastDefenseArmor);
  for (const [n, skill, alone, intoPlus] of [
    ['Vegeta (Z - Scouter)', 'Explosive Wave', 938, 1032], ['Vegeta (Z - Early)', 'Explosive Wave', 985, 1083],
    ['Goku (Z - Mid) Super Saiyan', 'Wild Sense', 1708, 2050], ['Android 18', 'Android Barrier', 985, 1083],
    ['Majin Buu (Evil)', 'Paralyze Beam', 688, 757], ['Majin Buu (Evil)', 'Mystic Breath', 1032, 1135],
    ['Gogeta (Super) Super Saiyan God Super Saiyan', 'Stardust Barrier', 1313, 1575],
  ]) {
    const h = skHit(n, skill);
    ig(`${n} ${skill}`, h?.damage, alone);
    ig(`... into Sparking! Plus`, h && skillTaken(h, defOf(h)), intoPlus);
  }
  const reflect = skHit('Gogeta (Super) Super Saiyan God Super Saiyan', 'Stardust Barrier')?.reflect;
  ig("Gogeta's Stardust Barrier, the reflected ki blast", reflect?.damage, 1750);
  ig('... into Sparking! Plus (ki defense)', reflect && skillTaken(reflect, plus.kiBlastDefenseArmor), 1925);
  ig('Vegeta (Z - Scouter) Explosive Wave into Janemba (armor broken or ignored)', skillTaken(skHit('Vegeta (Z - Scouter)', 'Explosive Wave'), run(named('Janemba').id).kiBlastDefenseArmor), 960);
  // timed from video: duration from the first frame the bar drops (about 0.05s late), charge from 5 full bars
  const near = (label, got, want, tol) => { if (!(Math.abs(got - want) <= tol)) game.push(`${label}: got ${got}, game ${want}`); };
  near('Goku (Z - Early) Sparking duration', gk.sparkSeconds, 17.8, 0.1);
  near('Goku (Z - Mid) Super Saiyan Sparking duration', run('0000_11').sparkSeconds, 17.8, 0.1);
  near('Ultimate Gohan Sparking duration (+10% drain)', run(named('Ultimate Gohan').id).sparkSeconds, 16.23, 0.05);
  near('Goku (Z - Early) with Sparking! Plus, duration', plus.sparkSeconds, 20.98, 0.05);
  near('Goku (Z - Early) charge into Sparking', gk.sparkChargeSeconds, 1.67, 0.02);
  near('Nappa charge (+20%)', run(named('Nappa').id).sparkChargeSeconds, 1.4, 0.02);
  near('Vegeta (Z - Scouter) charge (-10%)', run('0020_00').sparkChargeSeconds, 1.85, 0.02);
  near('Yamcha charge (faster ki charge, same time)', run(named('Yamcha').id).sparkChargeSeconds, 1.67, 0.02);
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
    ['Chi-Chi', 'Help Me, Goku!', 'Rush', true, 'Speed Clash'], // 2026-10-17
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
    // the Command list's Special line: each curated/move-special.csv row's move carries its wording, and no other move has one
    const rows = readCsv(path.join(DATA, 'curated', 'move-special.csv')).rows;
    const want = new Set(rows.map(r => `${r.id} ${r.move}: ${r.special}`));
    const got = Object.entries(data.blasts).flatMap(([id, bs]) => bs.filter(b => b.special).map(b => `${id} ${b.name}: ${b.special}`));
    const off = [...[...want].filter(x => !got.includes(x)).map(x => `missing: ${x}`), ...got.filter(x => !want.has(x)).map(x => `not in move-special.csv: ${x}`)];
    check(!off.length, `every move-special.csv row's move carries its Special line, and no other move has one (${rows.length})`, off);
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
  // 2026-10-11: moveset.counter is the attack after a successful Perception; the league landed one with each
  for (const [n, want] of [['Goku (Z - Early)', 'Standard'], ['Goku (Z - Mid)', 'Heavy Finishes'], ['Gohan (Teen)', 'Flying Kicks'],
    ['Goku (Z - Mid) Super Saiyan', 'Ki Blast Cannon'], ['Cell 2nd Form', 'Blaster Wave'], ['Janemba', null]]) {
    ig(`${n} Perception counter`, data.characters.find(c => c.name === n)?.moveset?.counter ?? null, want);
  }
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
  check(!game.length, 'published values equal the league in-game measurements (2026-10-07 to 13: rush, smash, throw, ki blast, defense, armor, ki cost, short dash, 20+ blasts, skills, spread shots, blast categories, cinematics, clashes, ki volley falloff, charged ki blast, jump ki blast, charged smash, Giant smash, Heavy Finish, Rush Chains and their damage, armor, pursuits, skill damage and its defense, Sparking charge and duration)', game);

  // Ultimates need Sparking Mode: their damage includes the Sparking passive and the toggle leaves them alone
  const ult = [];
  const kidOff = run('0030_00'), kidOn = run('0030_00', { sparking: true });
  if (kidOn.blastFactor.ultimate !== 1) ult.push(`Gohan (Kid) Sparking toggle changes ultimate damage (factor ${kidOn.blastFactor.ultimate})`);
  if (kidOn.rush <= kidOff.rush) ult.push('Gohan (Kid) Sparking toggle no longer raises rush damage');
  if (kidOff.ultimate !== 0.15) ult.push(`Gohan (Kid) ultimate modifier ${kidOff.ultimate}, want 0.15 (0.95 + 0.20 Sparking passive - 1)`);
  check(!ult.length, 'ultimate damage always includes the Sparking passive; the Sparking toggle changes the other channels only', ult);

  // Conditions controls: every condition text reads as a known condition, and the engine applies
  // health steps and low-health power-ups only when a situation meets them (src/utils/conditions.js)
  const condTexts = new Set();
  for (const c of data.capsules) for (const e of c.effects || []) if (e.condition) condTexts.add(e.condition);
  for (const c of data.characters) for (const p of c.passives || []) condTexts.add(p.condition);
  const unread = [...condTexts].filter(t => parseCondition(t).kind === 'unknown');
  const cond = [];
  const sitRun = (id, capIds, situation) => {
    const c = byId.get(id);
    return computeStats(c, collectEffects({ character: c, capsules: capIds.map(cap), situation }), ctx);
  };
  const capNamed = (n) => data.capsules.find(c => c.name === n)?.id;
  const fury = capNamed('Fury!'), latent = capNamed('Latent Power!');
  const add = (v, ch) => +(v.coef[ch] - v.coefBase[ch]).toFixed(4);
  const pic = byId.get('0040_00');
  if (add(sitRun('0040_00', [fury], null), 'super') !== 0) cond.push('Fury! applies with no situation');
  if (add(sitRun('0040_00', [fury], { health: pic.stats.health * 0.76 }), 'super') !== 0) cond.push('Fury! applies above 75% health');
  if (add(sitRun('0040_00', [fury], { health: pic.stats.health * 0.75 }), 'super') !== 0.05) cond.push('Fury! at 75% health is not +5%');
  if (add(sitRun('0040_00', [fury], { health: pic.stats.health * 0.25 }), 'super') !== 0.15) cond.push('Fury! at 25% health is not +15% (5% per step)');
  const lp = sitRun('0040_00', [latent], { health: pic.stats.health * 0.25 });
  if (lp.meleeDefenseStat !== +(pic.incomingDamage * (1 - pic.classCoef.physicalResist - 0.15)).toFixed(4)) cond.push(`Latent Power! at 25% health: melee defense ${lp.meleeDefenseStat}, want 15% less taken`);
  if (sitRun('0000_00', [], { health: 8000 }).rush !== 429) cond.push('Goku (Z - Early) below 10,000 HP: first rush hit is not 429 (312 x 1.25 x 1.10)');
  if (sitRun('0000_00', [], { health: 10000 }).rush !== 390) cond.push('Goku (Z - Early) at 10,000 HP gets the power-up (it is below 10,000 only)');
  if (sitRun('0000_00', [], null).rush !== 390) cond.push('Goku (Z - Early) gets the power-up with no situation');
  check(!unread.length && !cond.length, `every effect condition reads as a known condition (${condTexts.size}), and health steps and low-health power-ups apply only when the conditions meet them`, [...unread.map(t => `unknown condition: ${t}`), ...cond]);

  // League capsules (2026-10-23): ki bands, stacks per ki bar and per 30 seconds of battle, and the stats they added
  {
  const lc = [];
  const gk = byId.get('0000_00');
  const at = (o) => ({ health: gk.stats.health, ki: 0, skill: 0, map: null, events: {}, time: 0, ...o });
  const vt = capNamed("Vegeta's Technique"), creep = capNamed('Power Creep'), amp = capNamed('Amplified Strike'), econ = capNamed('Energy Conservation'), accel = capNamed('Accelerator');
  // the mod's bands are percents of the 5-bar gauge (snapshots/dbzl-mod): 80%+ is 4 and 5 bars, 60-80% is 3, ...
  for (const [ki, dmg, costRate] of [[5, 0.3, 1.5], [4, 0.3, 1.5], [3, 0.2, 1.25], [2, 0.1, 1], [1, 0, 0.75], [0, -0.1, 0.5]]) {
    const v = sitRun('0000_00', [vt], at({ ki })), base = sitRun('0000_00', [], at({ ki }));
    if (add(v, 'kiBlast') !== dmg || add(v, 'chargedKiBlast') !== dmg) lc.push(`Vegeta's Technique at ${ki} bars: ki blast damage ${add(v, 'kiBlast')} / charged ${add(v, 'chargedKiBlast')}, want ${dmg}`);
    if (Math.abs(v.kiBlastCost / base.kiBlastCost - costRate) > 0.01) lc.push(`Vegeta's Technique at ${ki} bars: ki blast cost x${(v.kiBlastCost / base.kiBlastCost).toFixed(3)}, want x${costRate}`);
    const speed = ki >= 4 ? 1.3 : ki === 3 ? 1.2 : ki === 2 ? 1.1 : ki === 1 ? 1 : 0.9;
    if (v.kiBlastSpeed !== speed) lc.push(`Vegeta's Technique at ${ki} bars: ki blast speed x${v.kiBlastSpeed}, want x${speed}`);
  }
  for (const [time, want] of [[0, 0], [30, 0.05], [60, 0.1], [90, 0.15], [120, 0.15]]) {
    const v = sitRun('0000_00', [creep], at({ time }));
    // Blast damage scaling does not reach ultimates (BlastUltimateDamageScale is their own field; Gohan (Kid)'s
    // ultimate, measured 2026-10-07, takes his passive's 0.2 once although it sets both fields)
    for (const ch of ['rush', 'smash', 'combo', 'throw', 'counter', 'followUp', 'super']) if (add(v, ch) !== want) lc.push(`Power Creep at ${time}s: ${ch} ${add(v, ch)}, want ${want}`);
    if (add(v, 'kiBlast') !== 0 || add(v, 'ultimate') !== 0) lc.push(`Power Creep at ${time}s changes ki blasts or ultimates`);
    // the general melee modifier reaches the Burst attacks (1,000 and 360 Power)
    if (v.burstMelee !== Math.ceil(1000 * 1.25 * (1 + want) - 1e-9) || v.burstRush !== Math.ceil(360 * 1.25 * (1 + want) - 1e-9)) lc.push(`Power Creep at ${time}s: Burst attacks ${v.burstMelee} / ${v.burstRush}`);
  }
  const rush1 = (ki, caps) => sitRun('0000_00', caps, at({ ki })).breakLevels.rush[0];
  for (const [ki, up] of [[1, 0], [2, 1], [3, 2], [4, 3], [5, 3]]) if (rush1(ki, [amp]) - rush1(ki, []) !== up) lc.push(`Amplified Strike at ${ki} bars: armor break +${rush1(ki, [amp]) - rush1(ki, [])}, want +${up}`);
  const ec2 = sitRun('0000_00', [econ], at({ ki: 2 })), ec3 = sitRun('0000_00', [econ], at({ ki: 3 })), plain = sitRun('0000_00', [], at({ ki: 3 }));
  if (ec2.kiBlastDmg !== 0 || ec2.kiBlastCost !== 0) lc.push(`Energy Conservation at 2 bars: ki blast ${ec2.kiBlastDmg} damage, ${ec2.kiBlastCost} cost, want 0 and 0`);
  if (ec3.kiBlastDmg !== plain.kiBlastDmg || ec3.kiBlastCost !== plain.kiBlastCost) lc.push('Energy Conservation changes ki blasts at 3 bars');
  for (const [ki, want] of [[0, 0.5], [1, 1], [2, 1.5], [3, 2], [4, 2.5], [5, 2.5]]) if (sitRun('0000_00', [accel], at({ ki })).moveSpeed !== want) lc.push(`Accelerator at ${ki} bars: movement x${sitRun('0000_00', [accel], at({ ki })).moveSpeed}, want x${want}`);
  // Heavy Sparking! in Sparking: drain +100% and Ultimate Body (armor levels +3); Goku has no armor of his own, Super Vegeta has Sparking Armor at 3
  const sparkRun = (id, caps) => { const c = byId.get(id); return computeStats(c, collectEffects({ character: c, capsules: caps.map(cap), sparking: true }), ctx); };
  const hs = capNamed('Heavy Sparking!');
  const gkS = sparkRun('0000_00', []), gkH = sparkRun('0000_00', [hs]), svS = sparkRun('0021_20', []), svH = sparkRun('0021_20', [hs]);
  if (Math.abs(gkH.sparkDrain - gkS.sparkDrain - 1) > 1e-9) lc.push(`Heavy Sparking!: Sparking drain ${gkS.sparkDrain} -> ${gkH.sparkDrain}, want +1`);
  if (gkH.armor !== 0.1 || gkH.armorLevel !== 3) lc.push(`Heavy Sparking! on Goku (no armor): armor ${gkH.armor} at level ${gkH.armorLevel}, want 0.1 at 3`);
  if (svH.armor !== svS.armor || svH.armorLevel !== svS.armorLevel + 3) lc.push(`Heavy Sparking! on Super Vegeta: armor ${svH.armor} at level ${svH.armorLevel}, want ${svS.armor} at ${svS.armorLevel + 3}`);
  if (sitRun('0000_00', [hs], null).armor !== sitRun('0000_00', [], null).armor) lc.push('Heavy Sparking! changes armor outside Sparking');
  const none = sitRun('0000_00', [], null);
  const one = (n) => sitRun('0000_00', [capNamed(n)], null);
  if (one('Skillful').skillLimit !== none.skillLimit + 2) lc.push(`Skillful: max Skill Count ${one('Skillful').skillLimit}, want ${none.skillLimit + 2}`);
  if (one('Tag Happy').switch !== 0) lc.push(`Tag Happy: switch cooldown ${one('Tag Happy').switch}, want 0`);
  if (!one('Push Your Limits').noSelfDamage || none.noSelfDamage) lc.push('Push Your Limits does not switch self-damage off (or it is off without the capsule)');
  if (one('Push Your Limits').ultimateKiCostAdd !== one('Ultimate Burst').ultimateKiCostAdd || !one('Push Your Limits').ultimateKiCostAdd) lc.push("Push Your Limits' ultimate cost is not Ultimate Burst's +1 bar");
  const bl = sitRun('0000_00', [capNamed('Bloodlust')], at({ events: { knockout: true } }));
  for (const [ch, want] of [['rush', 0.15], ['kiBlast', 0.15], ['chargedKiBlast', 0.15], ['super', 0.15], ['ultimate', 0]]) if (add(bl, ch) !== want) lc.push(`Bloodlust after a knockout: ${ch} ${add(bl, ch)}, want ${want}`);
  if (one('Halo: Corrupted').blastKiCostMult !== 0.5) lc.push(`Halo: Corrupted: Blast cost x${one('Halo: Corrupted').blastKiCostMult}, want x0.5`);
  check(!lc.length, "league capsules apply as the mod's files have them: Vegeta's Technique's, Accelerator's and Amplified Strike's ki bands, Energy Conservation at 2 bars or less, Power Creep's three 30-second stacks on every melee channel, Heavy Sparking!'s drain and Ultimate Body, Skillful, Tag Happy, Push Your Limits, Halo: Corrupted", lc);
  }

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

// ------------------------------------------------------------------ league builds (website lineups)
// The opponent's build presets, read from the lineups the website's season and event pages link. The
// league adds lineups through the CMS all season, so nothing here names a count or a build: the published
// figures are recounted straight from the lineup files, and they must match whatever the content holds.
{
  const content = path.join(ROOT, 'apps', 'website', 'public', 'content');
  // every lineup_file / lineup_file_week<n> the season and event pages name (an empty one is a match not played yet)
  const linked = new Set();
  const walk = (node) => {
    if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) {
      if (/^lineup_file/.test(k)) { if (typeof v === 'string' && v.trim()) linked.add(v.trim()); }
      else walk(v);
    }
  };
  for (const dir of ['seasons', 'events']) for (const f of fs.readdirSync(path.join(content, dir)).filter(f => /\.ya?ml$/.test(f))) {
    walk(yaml.load(fs.readFileSync(path.join(content, dir, f), 'utf8')));
  }
  const files = [...linked].filter(f => fs.existsSync(path.join(content, 'lineups', f)));
  // name -> id as build-data resolves it: the name, an alias, then the normalised name
  const byNorm = new Map(chars.map(c => [normName(c.name), c.id]));
  const idOf = (n) => chars.find(c => c.name === n)?.id ?? aliasMap[n] ?? byNorm.get(normName(n)) ?? null;
  const capByName = new Map(data.capsules.map(c => [c.name, c.id]));
  const recount = new Map(); // id -> { lineups, builds: Map(sorted capsule ids -> uses) }
  for (const f of files) {
    const doc = yaml.load(fs.readFileSync(path.join(content, 'lineups', f), 'utf8')) || {};
    for (const m of [...(doc.members || []), ...(doc.members ? [] : [...(doc.team1 || []), ...(doc.team2 || [])])]) {
      const id = idOf(String(m.character ?? '').trim());
      const caps = (m.capsules || []).map(c => capByName.get(String(c).replace(/\s*\(\d+\)\s*$/, '').trim())).filter(Boolean);
      if (!id || !caps.length) continue;
      const r = recount.get(id) || { lineups: 0, builds: new Map() };
      r.lineups++;
      const key = [...caps].sort().join('|');
      r.builds.set(key, (r.builds.get(key) || 0) + 1);
      recount.set(id, r);
    }
  }
  const off = [];
  for (const c of chars) {
    const lb = c.leagueBuilds, r = recount.get(c.id);
    if (!lb && !r) continue;
    if (!lb || !r) { off.push(`${c.name}: published ${lb ? `${lb.lineups} lineups` : 'none'}, recount ${r ? `${r.lineups} lineups` : 'none'}`); continue; }
    if (lb.lineups !== r.lineups || lb.builds !== r.builds.size) off.push(`${c.name}: published ${lb.lineups} lineups, ${lb.builds} builds; recount ${r.lineups}, ${r.builds.size}`);
    for (const b of lb.top) {
      const uses = r.builds.get([...b.capsules].sort().join('|'));
      if (uses !== b.uses) off.push(`${c.name}: a top build used ${b.uses} times, recount ${uses ?? 'not found'}`);
    }
  }
  check(!off.length, `league builds match a recount of the ${files.length} linked lineups (lineups, builds and each top build's uses, for ${recount.size} characters)`, off);
  const lb = chars.filter(c => c.leagueBuilds);
  const capIds = new Set(data.capsules.map(c => c.id));
  check(lb.every(c => c.leagueBuilds.top.length <= LEAGUE_BUILDS_SHOWN && c.leagueBuilds.top.every(b => b.capsules.every(id => capIds.has(id)))),
    `league builds: at most ${LEAGUE_BUILDS_SHOWN} per character, every capsule known`);
  check(lb.every(c => c.leagueBuilds.top.every((b, i, a) => !i || a[i - 1].season >= b.season)), 'league builds: newest season first');
}

// ------------------------------------------------------------------ images
{
  const thumbs = new Set(fs.readdirSync(path.join(APP, 'public', 'char_thumbnails')));
  const missing = chars.filter(c => !c.image || !thumbs.has(c.image)).map(c => c.name);
  if (missing.length) warn('characters without a face icon (the selector shows their initial)', missing); else ok('every character has a face icon');
}

console.log(failed ? `verify-data: ${failed} FAIL, ${warned} WARN` : `verify-data: all checks passed${warned ? ` (${warned} WARN)` : ''}`);
process.exit(failed ? 1 : 0);
