/**
 * Checks the Meta page's Builds table (src/pages/meta/buildRows.js) on real data.
 *
 * WHY THIS EXISTS
 *
 * The table's filters fail silently. A capsule filter that matches ANY picked
 * capsule instead of EVERY one, a floor that lets thin builds through, or a
 * "best per character" that keeps the wrong build all still render a tidy
 * table - just a wrong one - and the table is the league's answer to "what
 * should I submit?". So each rule is checked against the real corpus:
 *
 *   1. Every match is counted in exactly one build (uses add up).
 *   2. The floor, character, AI strategy and capsule filters, including the
 *      capsule rule: a build must contain EVERY capsule picked.
 *   3. "Best per character" keeps one build per character, its top scorer.
 *   4. Sorting, and the URL params' defaults and fallbacks.
 *   5. The readable URL values (slugs) never map two names to one slug.
 *
 * Deliberately NOT in prebuild: it aggregates real corpus shards, like
 * verify-character-page. Run it when you change the Builds table or builds.
 *
 * Usage: npm run verify-meta-builds
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAggregatedCharacterData } from '../src/utils/aggregation/characterAggregation.js';
import { parseCharacterCSV } from '../src/utils/statCalculations.js';
import { loadCapsuleData } from '../src/utils/capsuleDataProcessor.js';
import {
  leagueBuilds, readBuildFilters, filterBuilds, capsuleBreakdown, FLOORS, DEFAULT_FLOOR,
} from '../src/pages/meta/buildRows.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const refData = path.resolve(__dirname, '..', '..', '..', 'referencedata');
const aggDir = path.resolve(__dirname, '..', 'public', 'br-aggregates');

let failures = 0;
function check(label, cond, detail) {
  if (cond) { console.log('  ok   ' + label); return; }
  failures++;
  console.error('  FAIL ' + label + (detail ? '\n         ' + detail : ''));
}

// ---- The real input, with the lookups App passes ------------------------------
const log = console.log;
console.log = (...a) => { if (!String(a[0]).startsWith('[Fusion')) log(...a); };
const charMap = parseCharacterCSV(fs.readFileSync(path.join(refData, 'characters.csv'), 'utf8'));
const capsuleInfo = loadCapsuleData(fs.readFileSync(path.join(refData, 'capsules.csv'), 'utf8'));
const aiStrategies = {};
for (const s of capsuleInfo.aiStrategies || []) if (s.id) aiStrategies[s.id] = s;

const index = JSON.parse(fs.readFileSync(path.join(aggDir, 'index.json'), 'utf8'));
const all = [];
for (const sh of index.shards) {
  const shard = JSON.parse(fs.readFileSync(path.join(aggDir, sh.slug + '.json'), 'utf8'));
  for (const f of Object.values(shard.files)) all.push({ name: f.name, content: f.content, tags: f.tags || {} });
}

function scope(label, files) {
  const rows = getAggregatedCharacterData(files, charMap, capsuleInfo.capsuleMap, aiStrategies, {});
  const builds = leagueBuilds(rows, charMap);
  log(`\n${label}: ${files.length} matches, ${rows.length} characters, ${builds.length} builds`);
  log('  per floor: ' + FLOORS.map(f => `${f}+ ${builds.filter(b => b.uses >= f).length}`).join(', '));
  return { rows, builds };
}

// The default scope (newest season's league matches), and everything.
const seasons = [...new Set(all.filter(f => f.tags.matchType === 'Season').map(f => Number(f.tags.seasonNumber)))];
const latest = String(Math.max(...seasons));
const def = scope(`Season ${latest} season matches (the default)`, all.filter(f => String(f.tags.seasonNumber) === latest && f.tags.matchType === 'Season'));
const everything = scope('Everything', all);

for (const [label, { rows, builds }] of [['default', def], ['everything', everything]]) {
  log(`\n[${label}]`);

  // 1. Uses add up: every match of every character is in exactly one build.
  const matches = rows.reduce((n, r) => n + (r.matches || []).length, 0);
  const uses = builds.reduce((n, b) => n + b.uses, 0);
  check('every match is counted in exactly one build', matches === uses, `${matches} matches, ${uses} uses`);
  // A score, yes. Not necessarily a settled one: "provisional" counts the
  // matches the character actually fought in that form (activeMatchCount), the
  // tier plates' rule, so a transforming character can be fielded 5 times with
  // a build and still be faded.
  const scored = builds.filter(b => b.uses >= DEFAULT_FLOOR);
  check(`every build used ${DEFAULT_FLOOR}+ times has a score`,
    scored.every(b => Number.isFinite(b.score)),
    scored.filter(b => !Number.isFinite(b.score)).slice(0, 3).map(b => `${b.name} ${b.code}`).join(', '));

  // 2. Filters.
  const base = { floor: 1, chars: [], ais: [], caps: [], group: 'all', sort: 'score', dir: 'desc' };
  let last = Infinity;
  let monotonic = true;
  for (const f of FLOORS) {
    const n = filterBuilds(builds, { ...base, floor: f });
    if (n.length > last || n.some(b => b.uses < f)) monotonic = false;
    last = n.length;
  }
  check('the floor keeps only builds used that often, fewer as it rises', monotonic);

  const sample = builds.filter(b => b.uses >= 2 && b.capsules.length >= 2).sort((a, b) => b.uses - a.uses)[0];
  check('there is a build to test the filters with', !!sample);
  if (sample) {
    const byChar = filterBuilds(builds, { ...base, chars: [sample.charSlug] });
    check('the character filter keeps that character only, all its builds',
      byChar.length > 0 && byChar.every(b => b.charSlug === sample.charSlug)
        && byChar.length === builds.filter(b => b.name === sample.name).length);
    const byAi = filterBuilds(builds, { ...base, ais: [sample.aiSlug] });
    check('the AI strategy filter keeps that strategy only', byAi.length > 0 && byAi.every(b => b.aiSlug === sample.aiSlug));

    const [c1, c2] = sample.capsules;
    const both = filterBuilds(builds, { ...base, caps: [c1.slug, c2.slug] });
    const either = builds.filter(b => b.capsules.some(c => c.slug === c1.slug || c.slug === c2.slug));
    check('the capsule filter needs EVERY capsule picked',
      both.every(b => b.capsules.some(c => c.slug === c1.slug) && b.capsules.some(c => c.slug === c2.slug)));
    check('...and still finds the build they came from', both.some(b => b.id === sample.id));
    check('...so it is narrower than matching either one', both.length <= either.length);
    const other = builds.find(b => b.name !== sample.name);
    const orChars = filterBuilds(builds, { ...base, chars: [sample.charSlug, other.charSlug] });
    check('two characters picked is either one (OR within the chip)',
      orChars.length === builds.filter(b => b.charSlug === sample.charSlug || b.charSlug === other.charSlug).length);
  }

  // 3. Best per character.
  const floored = filterBuilds(builds, { ...base, floor: DEFAULT_FLOOR });
  const best = filterBuilds(builds, { ...base, floor: DEFAULT_FLOOR, group: 'best' });
  const names = new Set(floored.map(b => b.name));
  check('"Best per character" has one row per character', best.length === names.size && new Set(best.map(b => b.name)).size === best.length);
  check('...and it is that character\'s top score',
    best.every(b => floored.filter(x => x.name === b.name).every(x => (x.score ?? -1) <= (b.score ?? -1))));

  // 4. Sorting.
  const sortedOk = (list, key, sign) => list.every((b, i) => i === 0 || sign * ((b[key] ?? -1) - (list[i - 1][key] ?? -1)) >= 0);
  check('sorted by score, highest first, by default', sortedOk(filterBuilds(builds, base), 'score', -1));
  check('any column sorts either way',
    ['uses', 'dmg', 'eff', 'win'].every(k => sortedOk(filterBuilds(builds, { ...base, sort: k, dir: 'asc' }), k, 1)
      && sortedOk(filterBuilds(builds, { ...base, sort: k }), k, -1)));

  // 5. Slugs name one thing each.
  const clash = (list, slugOf, nameOf) => {
    const seen = new Map();
    for (const x of list) {
      const s = slugOf(x), n = nameOf(x);
      if (seen.has(s) && seen.get(s) !== n) return `${s}: ${seen.get(s)} / ${n}`;
      seen.set(s, n);
    }
    return null;
  };
  const clashes = [
    clash(builds, b => b.charSlug, b => b.name),
    clash(builds, b => b.aiSlug, b => b.aiName),
    clash(builds.flatMap(b => b.capsules), c => c.slug, c => c.name),
  ].filter(Boolean);
  check('no two names share a URL slug', !clashes.length, clashes.join('; '));

  const withCaps = builds.find(b => b.capsules.length);
  if (withCaps) {
    const { caps, order, cost } = capsuleBreakdown(withCaps.capsules);
    check('the capsule list is grouped by type in cost-share order',
      caps.every((c, i) => i === 0 || order.indexOf(c.type) >= order.indexOf(caps[i - 1].type))
        && cost === withCaps.capsules.reduce((n, c) => n + c.cost, 0));
  }
}

// ---- URL params -------------------------------------------------------------
log('\n[url]');
const P = s => new URLSearchParams(s);
const d = readBuildFilters(P(''));
check('defaults: floor 5, score high first, all builds, no filters',
  d.floor === 5 && d.sort === 'score' && d.dir === 'desc' && d.group === 'all' && !d.chars.length && !d.ais.length && !d.caps.length);
check('the Sandbox default floor is honoured', readBuildFilters(P(''), 1).floor === 1);
const r = readBuildFilters(P('uses=3&char=goku,vegeta,goku&ai=barrage&cap=savior,fury&group=best&sort=eff&dir=asc'));
check('params read back', r.floor === 3 && r.chars.join() === 'goku,vegeta' && r.ais.join() === 'barrage'
  && r.caps.join() === 'savior,fury' && r.group === 'best' && r.sort === 'eff' && r.dir === 'asc');
const bad = readBuildFilters(P('uses=4&sort=name&group=x&dir=up'));
check('unknown values fall back to the defaults', bad.floor === 5 && bad.sort === 'score' && bad.group === 'all' && bad.dir === 'desc');

console.log = log;
if (failures) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log('\nAll Meta Builds checks passed.');
