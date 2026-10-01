/**
 * Checks the data contract behind the /characters/<name-slug> page.
 *
 * WHY THIS EXISTS
 *
 * CharacterPage.jsx is purely presentational - it reads about thirty fields off
 * an aggregated character row and renders them. Nothing there can throw if a
 * field goes missing: it renders an em dash, or 'NaN', or quietly omits a whole
 * section. So a rename in characterAggregation.js does not break the build and
 * does not break the page in any way a person would notice. It just publishes a
 * page with holes in it.
 *
 * Two assumptions are checked, both of which are silent when violated:
 *
 *   1. Every `character.<field>` the page reads exists on real aggregated rows.
 *      The field list is SCRAPED FROM THE PAGE SOURCE rather than written out
 *      here, so this cannot drift from what actually ships - the same reason
 *      verify-404.mjs imports the real resolveRedirect instead of restating the
 *      routing table.
 *
 *   2. A slug resolves to a row. The page joins characters.csv to the corpus by
 *      NAME (slug -> id -> name -> row.name). If a row name ever stops matching
 *      a CSV name, every deep link for that character lands on the page's
 *      "no data" notice, which looks exactly like an out-of-scope filter.
 *
 * Deliberately NOT in prebuild: it aggregates real corpus shards, like
 * verify-filters. Run it when you change the page or the aggregation.
 *
 * Usage: npm run verify-character-page
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAggregatedCharacterData } from '../src/utils/aggregation/characterAggregation.js';
import { parseCharacterCSV } from '../src/utils/statCalculations.js';
import { buildCharacterSlugIndex, characterUrlKey, resolveCharacterParam } from '../src/utils/characterSlug.js';
import { tierForScore } from '../src/utils/performanceTier.js';
import { loadCapsuleData } from '../src/utils/capsuleDataProcessor.js';
import { buildKeyOf, buildCode, findBuildByCode } from '../src/utils/buildKey.js';
import { averageForms } from '../src/utils/formBreakdown.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const refData = path.resolve(__dirname, '..', '..', '..', 'referencedata');
const aggDir = path.resolve(__dirname, '..', 'public', 'br-aggregates');
// EVERY file that makes up the page, not just its entry point.
//
// This was a single path until the page was split into blocks and layouts,
// at which point the entry file stopped containing any `character.` reads at
// all and this verifier passed while checking nothing. Globbing the page's
// whole directory is what stops that recurring.
const pageDir = path.resolve(__dirname, '..', 'src', 'pages');
function pageSources(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) pageSources(full, out);
    // [\\/]: on Windows `full` uses backslashes, and a bare [\/] matched only
    // Character*.jsx there, silently skipping everything under character/.
    else if (/^Character.*.jsx?$/.test(entry.name) || (/[\\/]character[\\/]/.test(full) && /\.jsx?$/.test(entry.name))) out.push(full);
  }
  return out;
}

let failures = 0;
function check(label, cond, detail) {
  if (cond) { console.log('  ok   ' + label); return; }
  failures++;
  console.error('  FAIL ' + label + (detail ? '\n         ' + detail : ''));
}

// ---- Build the real input ---------------------------------------------------
const csv = fs.readFileSync(path.join(refData, 'characters.csv'), 'utf8');
const charMap = parseCharacterCSV(csv);
const slugIndex = buildCharacterSlugIndex(csv);

// The SAME lookups App passes, and this matters more than it looks. With an
// empty capsuleMap, topBuilds[].buildComposition comes back as the string
// 'No Build'; with the real one it is an object ({ primary, label, type,
// breakdown }). A verifier that passes {} therefore proves nothing about what
// the page renders in a browser - and rendering that object as a React child
// throws. Same for the maps and AI-strategy lookups.
const capsuleInfo = loadCapsuleData(fs.readFileSync(path.join(refData, 'capsules.csv'), 'utf8'));
const capsuleMap = capsuleInfo.capsuleMap;
const aiStrategies = {};
for (const strat of capsuleInfo.aiStrategies || []) if (strat.id) aiStrategies[strat.id] = strat;
const mapsMap = {};
const mapLines = fs.readFileSync(path.join(refData, 'maps.csv'), 'utf8').trim().split(/\r?\n/).slice(1);
for (const line of mapLines) {
  const [mapName, mapId] = line.trim().split(',').map(v => v.trim());
  if (mapId && mapName) mapsMap[mapId] = mapName;
}

const shardFiles = fs.readdirSync(aggDir).filter(f => f !== 'index.json' && f.endsWith('.json'));
if (!shardFiles.length) {
  console.error('No corpus shards found. Run: npm run build-aggregates');
  process.exit(1);
}

const rows = [];
for (const f of shardFiles) {
  const shard = JSON.parse(fs.readFileSync(path.join(aggDir, f), 'utf8'));
  const files = Object.values(shard.files).map(r => ({ name: r.name, content: r.content }));
  rows.push(...getAggregatedCharacterData(files, charMap, capsuleMap, aiStrategies, mapsMap));
}
console.log(`\n${shardFiles.length} shards -> ${rows.length} aggregated character rows\n`);

// ---- 1. Every field the page reads exists -----------------------------------
//
// Scraped from the source so the list cannot fall behind the page. Optional
// chaining is included on purpose: `character?.matches` still has to resolve.
// The Overview names its rows `viewRow` (the character or one build of it) and
// `allRow` (the whole character); both are aggregated rows, so both count.
const sourceFiles = pageSources(pageDir);
if (!sourceFiles.length) {
  console.error('Found no character page sources under src/pages - the page moved?');
  process.exit(1);
}
console.log('page sources scanned: ' + sourceFiles.map(f => path.basename(f)).join(', '));
const source = sourceFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');
const readFields = [...new Set(
  [...source.matchAll(/\b(?:character|viewRow|allRow)\??\.([A-Za-z_$][\w$]*)/g)].map(m => m[1])
)].sort();

console.log('Fields CharacterPage reads off a character row (' + readFields.length + ', scraped from source):');
// Since the tabs moved onto the table template (2026-09-29) the page reads
// few fields directly: Usage, Builds, Forms and Matches work from the row's
// match rows (through filterAggregatedData, leagueBuilds, averageForms and
// performanceRows, each checked by its own verifier), so 9 is the real count.
check('the scrape found a plausible number of fields',
  readFields.length >= 8,
  'only found ' + readFields.length + ' - if the page moved, this verifier is checking nothing');
const missingEverywhere = [];
for (const field of readFields) {
  // Present on at least one row is the bar, not every row: formHistory only
  // exists for characters that transformed, topCapsules can legitimately be
  // absent. A field on NO row is the real signal - it means a rename.
  const present = rows.some(r => Object.prototype.hasOwnProperty.call(r, field));
  if (!present) missingEverywhere.push(field);
}
check('every field appears on at least one row',
  missingEverywhere.length === 0,
  missingEverywhere.length ? 'absent from all ' + rows.length + ' rows: ' + missingEverywhere.join(', ') : '');

// The headline numbers are the page's whole point; a hole in one of these is not
// a cosmetic gap, so they must be present AND finite on every single row.
const HEADLINE = [
  'combatPerformanceScore', 'winRate', 'wins', 'losses', 'avgDamage', 'avgTaken',
  'efficiency', 'dps', 'survivalRate', 'avgKills', 'matchCount', 'avgBattleTime',
  'hpRetention', 'totalDamage', 'totalTaken', 'totalKills', 'survivalCount',
];
for (const field of HEADLINE) {
  const bad = rows.filter(r => !Number.isFinite(r[field]));
  check('headline stat ' + field + ' is a finite number on every row',
    bad.length === 0,
    bad.length ? bad.length + ' row(s) not finite, e.g. ' + bad[0].name + ' = ' + JSON.stringify(bad[0][field]) : '');
}

// ---- 1b. Fields rendered straight into JSX must be primitives ---------------
//
// React throws on an object as a child, so this class of mistake is a blank
// page rather than a missing stat. The list is short and deliberate: these are
// the fields CharacterPage puts directly into markup as text.
console.log('\nFields rendered as text must not be objects:');
const RENDERED_AS_TEXT = [
  'name', 'primaryTeam', 'primaryPosition', 'primaryAIStrategy', 'primaryMap',
  'formHistory',
];
for (const field of RENDERED_AS_TEXT) {
  const bad = rows.filter(r => r[field] != null && typeof r[field] === 'object');
  check(field + ' is never an object',
    bad.length === 0,
    bad.length ? bad.length + ' row(s), e.g. ' + bad[0].name + ' -> ' + JSON.stringify(bad[0][field]).slice(0, 80) : '');
}

// Same trap one level down, in the builds list.
const BUILD_TEXT = [
  ['aiStrategy', b => b.aiStrategy],
  ['buildComposition.label', b => b.buildComposition?.label],
  ['equippedCapsules[].name', b => (b.equippedCapsules || [])[0]?.name],
];
for (const [label, get] of BUILD_TEXT) {
  const bad = rows.filter(r => (r.topBuilds || []).some(b => {
    const v = get(b);
    return v != null && typeof v === 'object';
  }));
  check('topBuilds ' + label + ' is never an object', bad.length === 0,
    bad.length ? 'e.g. ' + bad[0].name : '');
}

// ---- 2. Nested reads --------------------------------------------------------
console.log('\nNested shapes the page renders:');
const withMatches = rows.filter(r => Array.isArray(r.matches) && r.matches.length);
check('rows carry a matches array', withMatches.length === rows.length,
  withMatches.length + ' of ' + rows.length);

// The recent-matches table and the position split read these per match.
const MATCH_FIELDS = ['position', 'won', 'damageDone', 'damageTaken', 'team', 'opponentTeam', 'fileName'];
for (const field of MATCH_FIELDS) {
  const anyRowMissing = withMatches.find(r =>
    !r.matches.every(m => Object.prototype.hasOwnProperty.call(m, field)));
  check('every match entry has ' + field, !anyRowMissing,
    anyRowMissing ? 'e.g. ' + anyRowMissing.name : '');
}

// A match must say where it was played - the table falls back map -> mapId, so
// at least one of the two has to be there.
const noMap = withMatches.find(r => !r.matches.every(m => m.map != null || m.mapId != null));
check('every match entry has map or mapId', !noMap, noMap ? 'e.g. ' + noMap.name : '');

// Position grouping divides by played count, so an empty position label would
// produce a NaN win rate rather than an error. A fusion partner its file left
// out holds no slot, so it has none (utils/fusionSplit.js withAbsorbedPartners).
const positions = new Set();
withMatches.forEach(r => r.matches.forEach(m => { if (!m.unrecorded) positions.add(m.position); }));
check('match positions are non-empty labels',
  ![...positions].some(p => p === '' || p == null),
  'saw: ' + [...positions].map(p => JSON.stringify(p)).join(', '));

const withBuilds = rows.filter(r => Array.isArray(r.topBuilds) && r.topBuilds.length);
check('some rows carry topBuilds', withBuilds.length > 0, withBuilds.length + ' rows');
for (const field of ['buildComposition', 'aiStrategy', 'count', 'avgPerformanceScore']) {
  const bad = withBuilds.find(r => !r.topBuilds.every(b => Object.prototype.hasOwnProperty.call(b, field)));
  check('every topBuilds entry has ' + field, !bad, bad ? 'e.g. ' + bad.name : '');
}

// The page shows buildComposition.label, so the object has to carry one.
const noLabel = withBuilds.find(r =>
  r.topBuilds.some(b => b.buildComposition && typeof b.buildComposition === 'object' && !b.buildComposition.label));
check('every buildComposition object carries a label', !noLabel,
  noLabel ? 'e.g. ' + noLabel.name : '');

// The page tints a build's score pill with tierForScore, which needs a number.
const badBuildScore = withBuilds.find(r =>
  r.topBuilds.some(b => b.avgPerformanceScore != null && !Number.isFinite(b.avgPerformanceScore)));
check('topBuilds scores are finite when present', !badBuildScore,
  badBuildScore ? 'e.g. ' + badBuildScore.name : '');

// The Forms tab averages each match's forms (averageForms over the match
// rows' `forms`, matchForms() as the Match page reads them).
const withForms = rows.filter(r => (r.matches || []).some(m => (m.formChangeCount || 0) > 0));
let usableAll = 0, transformedAll = 0;
const formBad = [];
for (const r of withForms) {
  const { forms, transformed, usable } = averageForms(r.matches);
  usableAll += usable;
  transformedAll += transformed;
  if (!usable) continue;
  if (forms[0].reached !== usable) formBad.push(`${r.name}: its first form is reached in ${forms[0].reached} of ${usable}`);
  if (forms.some(f => f.reached > usable)) formBad.push(`${r.name}: a form reached more often than it transformed`);
  // The form every match began in is the starting form, not a reached one.
  if (!forms[0].start || forms.filter(f => f.start).length !== 1) formBad.push(`${r.name}: its first form is not its one starting form`);
  for (const f of forms) {
    const sum = r.matches.reduce((n, m) => n + ((m.forms || []).find(x => x.id === f.id)?.damageDone || 0), 0);
    if (Math.abs(f.damageDone * f.reached - sum) > 1) formBad.push(`${r.name} ${f.name}: average damage ${f.damageDone} x ${f.reached} is not ${sum}`);
  }
}
check(`transformed matches carry their forms (${usableAll} of ${transformedAll}; the rest have no per-form figures)`,
  withForms.length > 0 && usableAll > 0 && transformedAll - usableAll <= 25, `${transformedAll - usableAll} left out`);
check('the Forms tab\'s averages: the first form in every match and marked as the start, none reached more often, averages that add back up',
  !formBad.length, formBad.slice(0, 3).join('\n         '));

// ---- 3. A slug actually reaches a row --------------------------------------
console.log('\nThe slug -> name -> row join the deep link depends on:');
const csvNames = new Set(slugIndex.idToName.values());
const unjoinable = [...new Set(rows.map(r => r.name))].filter(n => !csvNames.has(n));
check('every aggregated row name exists in characters.csv',
  unjoinable.length === 0,
  unjoinable.length ? unjoinable.length + ' name(s) with no CSV row: ' + unjoinable.slice(0, 8).join(', ') : '');

// Walk the whole path the app walks: row name -> id -> slug -> back to the row.
const nameToId = new Map();
for (const [id, name] of slugIndex.idToName) if (!nameToId.has(name)) nameToId.set(name, id);

let roundTripped = 0;
const brokenRoundTrip = [];
for (const name of new Set(rows.map(r => r.name))) {
  const id = nameToId.get(name);
  if (!id) continue;
  const slug = characterUrlKey(id, slugIndex);
  const backToId = resolveCharacterParam(slug, slugIndex);
  const backToName = backToId ? slugIndex.idToName.get(backToId) : null;
  if (backToName === name) roundTripped++;
  else brokenRoundTrip.push(`${name} -> ${slug} -> ${backToName}`);
}
check('name -> slug -> name round-trips for every character in the corpus',
  brokenRoundTrip.length === 0,
  brokenRoundTrip.length ? brokenRoundTrip.slice(0, 5).join('; ') : roundTripped + ' characters');

// A raw id must keep working: it is the escape hatch for a character that is in
// match data before characters.csv has a row for it.
const sampleId = [...nameToId.values()][0];
check('a raw id still resolves', resolveCharacterParam(sampleId, slugIndex) === sampleId,
  'id ' + sampleId);

// ---- 4. Every row gets a tier ----------------------------------------------
console.log('\nEvery row the page can render gets a tier:');
const noTier = rows.filter(r => !tierForScore(r.combatPerformanceScore));
check('tierForScore returns a tier for every row', noTier.length === 0,
  noTier.length ? noTier.length + ' row(s), e.g. ' + noTier[0].name + ' score ' + noTier[0].combatPerformanceScore : '');

// ---- 5. A ?build= link resolves to exactly one build ----------------------
// Build codes are short hashes of the build key, resolved against the character's
// own builds. A shared link is only safe if no two builds of ONE character share a
// code, and if a code leads back to the build it was made from.
console.log('\nEvery build a character has gets a unique, round-tripping link code:');
{
  let builds = 0, clashes = [], misses = 0;
  for (const r of rows) {
    const keys = [...new Set((r.matches || []).map(buildKeyOf))];
    builds += keys.length;
    const seen = new Map();
    for (const key of keys) {
      const code = buildCode(key);
      if (seen.has(code)) clashes.push(`${r.name}: ${code}`);
      seen.set(code, key);
      if (findBuildByCode(keys, code, k => k) !== key) misses++;
    }
  }
  check(`${builds} builds across ${rows.length} rows: no two builds of one character share a code`,
    clashes.length === 0, clashes.slice(0, 3).join('; '));
  check('every code resolves back to its own build', misses === 0, misses + ' miss(es)');
}

// ---- 6. The Overview's per-match fields exist -------------------------------
// The Overview computes from matches[], not from the row's totals, so check the
// match-row fields it reads the same way section 1 checks row fields: scraped
// from the source (every `m.<field>` in characterOverview.js), so the list cannot
// drift from what ships. A renamed field would read as 0 - "Never" on the page.
console.log('\nEvery per-match field the Overview reads exists on real match rows:');
{
  const src = fs.readFileSync(path.resolve(__dirname, '..', 'src', 'utils', 'characterOverview.js'), 'utf8');
  const fields = [...new Set([...src.matchAll(/\bm\.(\w+)/g)].map(x => x[1]))].sort();
  const matchRows = rows.flatMap(r => r.matches || []);
  // Blast hits are only recorded by newer files, so "on some rows" is the bar;
  // what must never happen is a field on no row at all, or holding a non-number.
  const missing = fields.filter(f => !matchRows.some(m => m[f] !== undefined));
  const badType = fields.filter(f => f !== 'aiStrategy' && matchRows.some(m => m[f] !== undefined && m[f] !== null && typeof m[f] !== 'number'));
  check(`${fields.length} fields (${fields.join(', ')}) each appear on real match rows`,
    missing.length === 0, 'missing: ' + missing.join(', '));
  check('each holds a number wherever it is present', badType.length === 0, 'non-numeric: ' + badType.join(', '));
}

// ---- 7. The build picker's builds are the leaderboard's -----------------------
// Each build's row is filterAggregatedData with that build's key - the
// leaderboard's own build filter - so its match count must equal the group's, and
// the builds together must cover every match exactly once.
console.log('\nThe build picker lists every build once, with the leaderboard\'s numbers:');
{
  const { characterBuilds } = await import('../src/pages/character/overview/characterBuilds.js');
  const { overviewFromMatches, placeOverview, STYLES } = await import('../src/utils/characterOverview.js');
  const baseline = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'src', 'config', 'style-baseline.json'), 'utf8'));
  let total = 0;
  const countOff = [], coverOff = [], unplaced = [];
  for (const r of rows) {
    const builds = characterBuilds(r, charMap);
    total += builds.length;
    for (const b of builds) if (!b.row || b.row.matchCount !== b.count) countOff.push(`${r.name} ${b.code}: ${b.count} vs ${b.row?.matchCount}`);
    const covered = builds.reduce((s, b) => s + b.count, 0);
    // A fusion partner its file left out has no build to be filed under.
    const withBuild = (r.matches || []).filter(m => !m.unrecorded).length;
    if (covered !== withBuild) coverOff.push(`${r.name}: ${covered} of ${withBuild}`);
    // Every style must place for a character that fought at all, or the radar
    // draws a spoke at nothing.
    const place = placeOverview(overviewFromMatches(r.matches), baseline);
    const gaps = STYLES.filter(s => place.pct['style_' + s.key] === null || place.rank['style_' + s.key] === null);
    if (gaps.length) unplaced.push(`${r.name}: ${gaps.map(s => s.key).join('/')}`);
  }
  check(`${total} builds: each build's filtered row has the build's match count`, countOff.length === 0, countOff.slice(0, 3).join('; '));
  check('the builds of each character cover all of its matches', coverOff.length === 0, coverOff.slice(0, 3).join('; '));
  check('all six fighting styles place for every character', unplaced.length === 0, unplaced.slice(0, 3).join('; '));
}

// The page's cuts (`pos=`, `build=`, and `for=`'s team) go through one helper,
// which must agree with the leaderboard's own build filter and split a
// character's matches exactly across its positions.
console.log('\nThe page cuts (position, build, team) agree with the leaderboard:');
{
  const { characterBuilds } = await import('../src/pages/character/overview/characterBuilds.js');
  const { cutCharacter, readCharacterCuts } = await import('../src/pages/character/characterCuts.js');
  const buildOff = [], posOff = [], bothOff = [];
  for (const r of rows.slice(0, 60)) {
    for (const b of characterBuilds(r, charMap).slice(0, 3)) {
      const c = cutCharacter(r, { build: b.code }, charMap);
      if (!c || c.matchCount !== b.count || Math.abs(c.combatPerformanceScore - b.row.combatPerformanceScore) > 1e-9) buildOff.push(`${r.name} ${b.code}`);
    }
    const byPos = [1, 2, 3].map(p => cutCharacter(r, { pos: p }, charMap));
    const n = byPos.reduce((s, c) => s + (c ? c.matchCount : 0), 0);
    const placed = (r.matches || []).filter(m => [1, 2, 3].includes(Number(m.position))).length;
    if (n !== placed) posOff.push(`${r.name}: ${n} of ${placed}`);
    const tag = (r.matches || [])[0] && r.matches[0].team;
    const pos = (r.matches || [])[0] && Number(r.matches[0].position);
    const both = cutCharacter(r, { pos, team: tag }, charMap);
    const want = (r.matches || []).filter(m => Number(m.position) === pos && m.team === tag).length;
    if (!both || both.matchCount !== want) bothOff.push(r.name);
  }
  check('a build cut is the leaderboard build filter\'s row', buildOff.length === 0, buildOff.slice(0, 3).join('; '));
  check('the position cuts split each character\'s matches exactly', posOff.length === 0, posOff.slice(0, 3).join('; '));
  check('cuts combine (position and team together)', bothOff.length === 0, bothOff.slice(0, 3).join('; '));
  const P = q => readCharacterCuts(new URLSearchParams(q));
  check('pos= reads back 1-3 only', P('pos=2').pos === 2 && P('pos=4').pos === null && P('pos=1,2').pos === null && P('').pos === null);
  check('no cuts gives the row itself', cutCharacter(rows[0], {}, charMap) === rows[0]);

  // A form cut: the matches that reached the form, and formSlices() each as
  // the form alone (the Match page's rule), its amounts a share of all forms.
  const { formSlices, formSlug, reachedForm } = await import('../src/pages/character/characterCuts.js');
  const transformedRows = rows.filter(r => (r.matches || []).some(m => Array.isArray(m.forms) && m.forms.length > 1));
  const reachOff = [], shareOff = [], sliceOff = [], hitOff = [];
  for (const r of transformedRows.slice(0, 40)) {
    const slugs = [...new Set(r.matches.flatMap(m => (m.forms || []).map(f => formSlug(f.name))))];
    for (const slug of slugs) {
      const cut = cutCharacter(r, { form: slug }, charMap);
      const want = r.matches.filter(m => reachedForm(m, slug)).length;
      if (!cut || cut.matchCount !== want) reachOff.push(`${r.name} ${slug}`);
    }
    // One match: its forms' shares add up to the whole.
    const m = r.matches.find(x => Array.isArray(x.forms) && new Set(x.forms.map(f => formSlug(f.name))).size > 1);
    if (m) {
      const own = [...new Set(m.forms.map(f => formSlug(f.name)))];
      const sum = own.reduce((s, slug) => s + (formSlices([m], slug).shares.damageDone || 0), 0);
      const total = m.forms.reduce((s, f) => s + (f.stats.damageDone || 0), 0);
      if (total > 0 && Math.abs(sum - 1) > 1e-9) shareOff.push(`${r.name}: ${sum}`);
      const { slices } = formSlices([m], own[0]);
      const f0 = m.forms.filter(f => formSlug(f.name) === own[0]);
      const dmg = f0.reduce((s, f) => s + (f.stats.damageDone || 0), 0);
      if (slices.length !== 1 || slices[0].damageDone !== dmg || slices[0].team !== m.team || slices[0].position !== m.position || slices[0].name !== m.name) sliceOff.push(r.name);
      if (!m.forms[0].stats.hasAdditionalCounts && slices[0] && slices[0].s1HitBlast !== undefined) hitOff.push(r.name);
    }
  }
  check(`a form cut keeps the matches that reached it (${transformedRows.length} characters change form)`, reachOff.length === 0, reachOff.slice(0, 3).join('; '));
  check('a match\'s forms\' shares add up to the whole', shareOff.length === 0, shareOff.slice(0, 3).join('; '));
  check('a slice is the form\'s own figures in the match\'s place', sliceOff.length === 0, sliceOff.slice(0, 3).join('; '));
  check('a slice from a file without hit counts has no hit rate', hitOff.length === 0, hitOff.slice(0, 3).join('; '));
  check('form= reads back', readCharacterCuts(new URLSearchParams('form=super-saiyan-3')).form === 'super-saiyan-3');
}

console.log();
if (failures) {
  console.error(`FAILED - ${failures} check(s). The character page would render holes.`);
  process.exit(1);
}
console.log('PASSED - every field the character page reads is present and usable.');
