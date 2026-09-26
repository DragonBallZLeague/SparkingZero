/**
 * Exercises utils/aggregation/filterAggregated.js against the real match corpus.
 *
 * This function is 695 lines that sat inlined in App.jsx with no coverage of any
 * kind, and the Phase 3 Character page depends on it. The body was extracted
 * verbatim, so this is not checking the extraction - it is the first actual test
 * of the filtering and sorting behaviour, and a guard for whoever refactors it
 * next.
 *
 * Deliberately NOT in prebuild: it loads and aggregates a real shard, which is
 * slower than the other verifiers, and the logic only changes when someone edits
 * it on purpose. Run it then.
 *
 * Usage: node scripts/verify-filter-aggregated.mjs  (or npm run verify-filters)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { filterAggregatedData } from '../src/utils/aggregation/filterAggregated.js';
import { getAggregatedCharacterData } from '../src/utils/aggregation/characterAggregation.js';
import { getPerformanceLevel } from '../src/utils/performanceLevel.js';
import { parseCharacterCSV } from '../src/utils/statCalculations.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const refData = path.resolve(__dirname, '..', '..', '..', 'referencedata');
const aggregatesDir = path.resolve(__dirname, '..', 'public', 'br-aggregates');

let failures = 0;
function check(label, cond, detail) {
  if (cond) { console.log('  ok   ' + label); return; }
  failures++;
  console.error('  FAIL ' + label + (detail ? '\n         ' + detail : ''));
}

// ---- Build real aggregated input -------------------------------------------
const charMap = parseCharacterCSV(fs.readFileSync(path.join(refData, 'characters.csv'), 'utf8'));

// Largest shard gives the widest spread of characters, teams and match counts.
const shardFiles = fs.readdirSync(aggregatesDir).filter(f => f !== 'index.json' && f.endsWith('.json'));
if (!shardFiles.length) {
  console.error('No corpus shards found. Run: npm run build-aggregates');
  process.exit(1);
}
const biggest = shardFiles
  .map(f => ({ f, size: fs.statSync(path.join(aggregatesDir, f)).size }))
  .sort((a, b) => b.size - a.size)[0].f;

const shard = JSON.parse(fs.readFileSync(path.join(aggregatesDir, biggest), 'utf8'));
const files = Object.values(shard.files).map(r => ({ name: r.name, content: r.content }));
console.log('shard ' + biggest + ': ' + files.length + ' matches');

const aggregated = getAggregatedCharacterData(files, charMap, {}, {}, {});
console.log('aggregated rows: ' + aggregated.length + '\n');
if (!aggregated.length) { console.error('aggregation produced nothing; cannot verify'); process.exit(1); }

// ---- Defaults ---------------------------------------------------------------
console.log('Defaults reproduce the app\'s own default view:');
const base = filterAggregatedData(aggregated);
check('returns rows', base.length > 0, 'got ' + base.length);
check('drops nothing but the minMatches=1 floor',
  base.length === aggregated.filter(c => {
    const m = (c.activeMatchCount && c.activeMatchCount > 0) ? c.activeMatchCount : c.matchCount;
    return m >= 1 && m <= 999;
  }).length,
  'filtered ' + base.length + ' of ' + aggregated.length);
check('sorted by combat score descending by default',
  base.every((c, i) => i === 0 ||
    (base[i - 1].baseRankScore ?? base[i - 1].combatPerformanceScore) >=
    (c.baseRankScore ?? c.combatPerformanceScore)));

// ---- Input must not be mutated ---------------------------------------------
console.log('\nPurity (the Character page will call this repeatedly):');
const snapshot = JSON.stringify(aggregated);
filterAggregatedData(aggregated, { sortBy: 'name', sortDirection: 'asc' });
filterAggregatedData(aggregated, { minMatches: 5 });
check('does not mutate the input array or its rows', JSON.stringify(aggregated) === snapshot);
check('returns a different array instance', filterAggregatedData(aggregated) !== aggregated);

// ---- Sorting ----------------------------------------------------------------
console.log('\nSorting:');
const nameAsc = filterAggregatedData(aggregated, { sortBy: 'name', sortDirection: 'asc' });
const nameDesc = filterAggregatedData(aggregated, { sortBy: 'name', sortDirection: 'desc' });
check('sortBy=name asc is alphabetical',
  nameAsc.every((c, i) => i === 0 || nameAsc[i - 1].name.localeCompare(c.name) <= 0));
check('sortDirection reverses the order',
  nameAsc.length === nameDesc.length &&
  nameAsc[0].name === nameDesc[nameDesc.length - 1].name);
check('sorting never changes the row count', nameAsc.length === base.length);

for (const [key, get] of [
  ['matches', c => c.matchCount],
  ['totalDamage', c => c.totalDamage],
  ['avgDamage', c => c.avgDamage],
  ['dps', c => (c.totalBattleTime > 0 ? c.totalDamage / c.totalBattleTime : 0)],
  ['efficiency', c => (c.totalTaken > 0 ? c.totalDamage / c.totalTaken : 0)],
  ['combatScore', c => (c.baseRankScore ?? c.combatPerformanceScore)],
]) {
  const desc = filterAggregatedData(aggregated, { sortBy: key, sortDirection: 'desc' });
  const asc = filterAggregatedData(aggregated, { sortBy: key, sortDirection: 'asc' });
  check('sortBy=' + key + ' desc is ordered',
    desc.every((c, i) => i === 0 || get(desc[i - 1]) >= get(c)));
  check('sortBy=' + key + ' asc is ordered',
    asc.every((c, i) => i === 0 || get(asc[i - 1]) <= get(c)));
  check('sortBy=' + key + ' keeps the row count', desc.length === base.length && asc.length === base.length);
}

// ---- Match-count window -----------------------------------------------------
console.log('\nminMatches / maxMatches window:');
const counts = aggregated.map(c => (c.activeMatchCount && c.activeMatchCount > 0) ? c.activeMatchCount : c.matchCount);
const maxCount = Math.max(...counts);
const narrow = filterAggregatedData(aggregated, { minMatches: 2 });
check('minMatches=2 excludes single-match characters',
  narrow.every(c => ((c.activeMatchCount && c.activeMatchCount > 0) ? c.activeMatchCount : c.matchCount) >= 2));
check('minMatches=2 is a subset of the default view', narrow.length <= base.length);
check('minMatches above the maximum yields nothing',
  filterAggregatedData(aggregated, { minMatches: maxCount + 1 }).length === 0);
check('maxMatches=1 keeps only single-match characters',
  filterAggregatedData(aggregated, { maxMatches: 1 })
    .every(c => ((c.activeMatchCount && c.activeMatchCount > 0) ? c.activeMatchCount : c.matchCount) === 1));

// ---- Character selection ----------------------------------------------------
console.log('\nselectedCharacters:');
const someNames = base.slice(0, 3).map(c => c.name);
const picked = filterAggregatedData(aggregated, { selectedCharacters: someNames });
check('narrows to exactly the named characters',
  picked.length === someNames.length && picked.every(c => someNames.includes(c.name)),
  'asked for ' + someNames.length + ', got ' + picked.length);
check('an unknown name yields nothing',
  filterAggregatedData(aggregated, { selectedCharacters: ['__no_such_character__'] }).length === 0);
check('empty selection means no character filter',
  filterAggregatedData(aggregated, { selectedCharacters: [] }).length === base.length);

// ---- Performance filter, including the known mismatch -----------------------
console.log('\nperformanceFilters:');
check('all five levels selected skips the filter entirely',
  filterAggregatedData(aggregated, { performanceFilters: ['excellent', 'good', 'average', 'below', 'poor'] }).length === base.length);
const onlyExcellent = filterAggregatedData(aggregated, { performanceFilters: ['excellent'] });
check('a single level is a strict subset', onlyExcellent.length < base.length,
  'excellent=' + onlyExcellent.length + ' vs base=' + base.length);
// The five level strings are a contract between getPerformanceLevel and the
// filter UI. They disagreed on the fourth one until 2026-09-26 ('below' vs
// 'below-average'), which silently dropped every below-average character.
// The partition check below is what catches that class of bug: if any level
// string does not match, its rows belong to no single-level selection and the
// union comes up short.
const LEVELS = ['excellent', 'good', 'average', 'below-average', 'poor'];
const scores = base.map(c => c.combatPerformanceScore);
const levelsSeen = new Set(base.map(c => getPerformanceLevel(c.combatPerformanceScore, scores)));
check('getPerformanceLevel only ever emits the five contract levels',
  [...levelsSeen].every(l => LEVELS.includes(l)),
  'unexpected level(s): ' + [...levelsSeen].filter(l => !LEVELS.includes(l)).join(', '));

const union = new Set();
for (const level of LEVELS) {
  const rows = filterAggregatedData(aggregated, { performanceFilters: [level] });
  rows.forEach(r => union.add(r.name));
  // A level present in the data must be selectable on its own.
  if (levelsSeen.has(level)) {
    check('filtering by "' + level + '" returns its rows', rows.length > 0,
      level + ' is present in the data but selecting it returned nothing - the ' +
      'filter value and getPerformanceLevel disagree on this level');
    check('every row returned for "' + level + '" really is that level',
      rows.every(r => getPerformanceLevel(r.combatPerformanceScore, scores) === level));
  }
}
check('the five levels partition the whole default view (no row is unreachable)',
  union.size === base.length,
  union.size + ' of ' + base.length + ' rows reachable by single-level selection');

// Regression guard: the old wrong value must not quietly work again.
check('the retired value "below" matches nothing',
  filterAggregatedData(aggregated, { performanceFilters: ['below'] }).length === 0);

// ---- Robustness -------------------------------------------------------------
console.log('\nRobustness:');
check('non-array input returns []', filterAggregatedData(null).length === 0);
check('undefined input returns []', filterAggregatedData(undefined).length === 0);
check('empty array returns []', filterAggregatedData([]).length === 0);
check('unknown sortBy falls back to combat score',
  filterAggregatedData(aggregated, { sortBy: '__nope__' }).length === base.length);

console.log();
if (failures) {
  console.error('FAILED - ' + failures + ' check(s).');
  process.exit(1);
}
console.log('PASSED - filterAggregatedData behaves correctly over ' + files.length + ' real matches.');
