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
import {
  aiStrategyRows, aiType, readAiFilters, readAiSort, sortAiRows, slug as aiSlug, aiStatByKey, AI_STYLE_STATS, TRANSFORM_STAT,
  readAiActions, withActionRates, actionColumn, MAX_ACTION_COLUMNS,
} from '../src/pages/meta/aiRows.js';
import { overviewFromMatches, placeOverview } from '../src/utils/characterOverview.js';
import {
  aiShift, strategyPairs, dataQuality, MIN_OTHER, SUIT_MIN,
} from '../src/pages/meta/aiShift.js';
import {
  ACTIONS, ACTION_GROUPS, ACTION_FLOOR, actionChange, actionRates, biggestChanges, fmtRate, fmtRateChange, fmtPair,
} from '../src/pages/meta/aiActions.js';
import {
  capsuleRows, capsuleChange, capsuleTransform, capsuleMatchesQuery, readCapsuleFilters, capsuleStatByKey, familyOf,
  BUILD_TYPES, FIT_STATS, PAIR_MIN, PAIR_SHARE,
} from '../src/pages/meta/capsuleRows.js';
import baseline from '../src/config/style-baseline.json' with { type: 'json' };
import {
  lineupIndex, transformationSummary, matchTransformation, canTransformOrFuse, UNKNOWN_AI, SKILL_GAUGE_CAPSULES, BROLYS_RING,
} from '../src/utils/transformation.js';
import { aiStrategySheet } from '../src/utils/workbookSheets.js';

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
// App's charIdFor: a character's id from its name.
const idByName = new Map(Object.entries(charMap).map(([id, name]) => [name, id]));
const idFor = name => idByName.get(name) || null;
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

  // 1. Uses add up: every match of every character is in exactly one build,
  // bar a fusion partner its file left out, which has no build (utils/fusionSplit.js).
  const matches = rows.reduce((n, r) => n + (r.matches || []).filter(m => !m.unrecorded).length, 0);
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

// ---- The AI strategies tab (pages/meta/aiRows.js) ------------------------------
for (const [label, { rows }] of [['default', def], ['everything', everything]]) {
  log(`\n[AI strategies, ${label}]`);
  const none = { chars: [], types: [] };
  const ais = aiStrategyRows(rows, none, charMap);
  // A file that lost its AI ("Default", UNKNOWN_AI) is no strategy's.
  const matches = rows.reduce((n, r) => n + (r.matches || []).filter(m => (m.aiStrategy || UNKNOWN_AI) !== UNKNOWN_AI).length, 0);
  check(`every match with a known AI counts toward exactly one strategy (${ais.length} strategies), and "Default" has no row`,
    ais.reduce((n, a) => n + a.matches.length, 0) === matches && !ais.some(a => a.name === UNKNOWN_AI));

  // The Transform column (aiShift.js transformShift): the same characters'
  // transform rate on this AI against their other AIs.
  const ctx = { idFor, lineups: lineupIndex(rows, idFor) };
  const t1 = Date.now();
  const aisT = aiStrategyRows(rows, none, charMap, ctx);
  log(`  with transformations: ${Date.now() - t1}ms; most raised: ${aisT.filter(a => a.transform && a.transform.gain !== null)
    .sort((a, b) => b.transform.gain - a.transform.gain).slice(0, 3).map(a => `${a.name} ${Math.round(a.transform.gain * 100)}`).join(', ')}`);
  check('each Transform cell is its row\'s change in points, this AI minus other AIs', aisT.every(a => {
    const t = a.transform;
    if (!t || t.gain === null) return TRANSFORM_STAT.get(a) === null;
    return Math.abs(TRANSFORM_STAT.get(a) - t.gain * 100) < 1e-9 && Math.abs(t.gain - (t.with - t.usual)) < 1e-9
      && t.with >= 0 && t.with <= 1 && t.usual >= 0 && t.usual <= 1;
  }));
  const leadT = aisT[0];
  if (leadT.transform) {
    // Counted again by hand: characters that can transform, MIN_OTHER+ counted matches on other AIs.
    let compared = 0;
    for (const p of strategyPairs(rows, leadT.name).paired) {
      const id = idFor(p.name);
      const on = transformationSummary(p.with, { id, lineups: ctx.lineups });
      const off = transformationSummary(p.without, { id, lineups: ctx.lineups });
      if (on.able && on.matches && off.matches >= MIN_OTHER) compared += on.matches;
    }
    check(`it compares the counted matches of the characters that transform (${leadT.name}: ${compared})`, leadT.transform.compared === compared);
    const able = leadT.transform.byCharacter.slice().sort((a, b) => b.on.matches - a.on.matches)[0];
    if (able) {
      const [mine] = aiStrategyRows(rows, { chars: [aiSlug(able.name)], types: [] }, charMap, ctx).filter(a => a.name === leadT.name);
      const own = transformationSummary(rows.find(r => r.name === able.name).matches.filter(m => m.aiStrategy === leadT.name), { id: idFor(able.name), lineups: ctx.lineups });
      check(`with one character picked it is that character's own rate (${able.name}: ${own.transformed} of ${own.matches})`,
        mine && mine.transform && Math.abs(mine.transform.with - own.rate) < 1e-9 && mine.transform.characters === 1);
    }
  }
  const cannot = rows.find(r => r.matches.length >= 5 && !transformationSummary(r.matches, { id: idFor(r.name), lineups: ctx.lineups }).able);
  if (cannot) {
    check(`a character that cannot transform has no Transform figure (${cannot.name}), so the column goes`,
      aiStrategyRows(rows, { chars: [aiSlug(cannot.name)], types: [] }, charMap, ctx).every(a => a.transform === null));
  }
  const byT = sortAiRows(aisT, { sort: 'transform', dir: 'desc' }, aiStatByKey).map(a => TRANSFORM_STAT.get(a));
  check('sorting by Transform puts the biggest change first and strategies without one last',
    byT.every((v, i) => i === 0 || v === null || (byT[i - 1] !== null && byT[i - 1] >= v)));
  // The pooled figures are the leaderboard's, recomputed here from the matches.
  const off = ais.filter(a => {
    const fought = a.matches.filter(m => (m.battleTime || 0) > 0);
    const want = fought.reduce((n, m) => n + (m.damageDone || 0), 0) / Math.max(1, fought.length);
    return Math.abs(want - a.avgDamage) > 1 || !Number.isFinite(a.combatPerformanceScore);
  });
  check('each strategy\'s average damage is its matches\' (those fought), and it has a score', !off.length,
    off.slice(0, 3).map(a => a.name).join(', '));
  check('each strategy\'s characters add up to its matches',
    ais.every(a => a.byCharacter.reduce((n, c) => n + c.uses, 0) === a.matches.length && a.byCharacter.length === a.characters));
  const top = rows.slice().sort((a, b) => b.matches.length - a.matches.length)[0];
  const byChar = aiStrategyRows(rows, { chars: [aiSlug(top.name)], types: [] }, charMap);
  check('Character counts only that character\'s matches',
    byChar.reduce((n, a) => n + a.matches.length, 0) === top.matches.length && byChar.every(a => a.byCharacter.every(c => c.name === top.name)));
  const def2 = aiStrategyRows(rows, { chars: [], types: ['Defense'] }, charMap);
  check('Type keeps that family only', def2.length > 0 && def2.every(a => a.type === 'Defense' && aiType(a.name) === 'Defense'));
  // The detail's shift (pages/meta/aiShift.js): the same characters with the
  // strategy against their other strategies.
  const lead = ais[0];
  const t0 = Date.now();
  const sh = aiShift(rows, lead.name, { chars: [] }, charMap);
  log(`  aiShift(${lead.name}) took ${Date.now() - t0}ms over ${sh.characters} characters`);
  check('the shift covers every use, and compares the ones the table says', sh.total === lead.matches.length && sh.compared === lead.comparable,
    `${sh.total}/${lead.matches.length}, ${sh.compared}/${lead.comparable}`);
  const { paired } = strategyPairs(rows, lead.name);
  check('its characters are weighted by their uses (the weights add up)', paired.reduce((n, p) => n + p.with.length, 0) === sh.compared
    && paired.every(p => p.without.length >= MIN_OTHER));
  check('every strategy\'s comparable count is at most its uses', ais.every(a => a.comparable <= a.matches.length));
  check('the shift has the Overview\'s six styles, as league ranks within the pool',
    sh.styles.length === 6 && sh.styles.every(st => st.gain === null
      || (st.with >= 1 && st.with <= st.pool && st.usual >= 1 && st.usual <= st.pool && Math.abs(st.gain - (st.usual - st.with)) < 1e-9)));
  // Single actions a minute on the field (pages/meta/aiActions.js): All
  // actions lists every one, Biggest changes the top of them by size of change.
  check('All actions lists every action, in its groups\' order',
    sh.actions.map(a => a.key).join() === ACTIONS.map(a => a.key).join()
    && ACTIONS.every((a, i) => ACTION_GROUPS.includes(a.group) && (i === 0 || ACTION_GROUPS.indexOf(ACTIONS[i - 1].group) <= ACTION_GROUPS.indexOf(a.group))));
  // Ki blast hits credit deflected enemy blasts as the deflector's own
  // (docs/ACTION_CODES.md), so no action may count them.
  check('no action counts ki blast hits', ACTIONS.every(a => a.count({ kiBlastHits: 5 }) === 0 && (!a.part || a.part({ kiBlastHits: 5 }) === 0)));
  check('Biggest changes clear the floor on one side, biggest change first, out of All actions',
    sh.biggest.length > 0 && sh.biggest.every(a => Math.max(a.with, a.usual) >= ACTION_FLOOR && sh.actions.includes(a))
    && sh.biggest.every((a, i) => i === 0 || actionChange(sh.biggest[i - 1]) >= actionChange(a))
    && sh.biggest.length === biggestChanges(sh.actions).length);
  // Many characters: each one's own rate a minute, weighted by its uses.
  const minutes = ms => ms.reduce((t, m) => t + (m.battleTime || 0), 0) / 60;
  const rateOf = (ms, f) => { const t = minutes(ms); return t > 0 ? ms.reduce((c, m) => c + (m[f] || 0), 0) / t : null; };
  {
    let w = 0, x = 0, y = 0;
    for (const p of paired) {
      const a = rateOf(p.with, 'guardCount'), b = rateOf(p.without, 'guardCount');
      if (a === null || b === null) continue;
      w += p.with.length; x += p.with.length * a; y += p.with.length * b;
    }
    const g = sh.actions.find(a => a.key === 'guards');
    check(`its characters' rates are combined weighted by uses (guards ${fmtRate(g.usual)} → ${fmtRate(g.with)} a minute)`,
      Math.abs(g.with - x / w) < 1e-9 && Math.abs(g.usual - y / w) < 1e-9);
  }
  check('the table\'s style columns are the rows\' style shifts', ais.every(a => AI_STYLE_STATS.every(c => {
    const st = a.styles.find(x => `style_${x.key}` === c.key);
    return c.get(a) === (st.gain === null ? null : st.gain);
  })) && ais.find(a => a.name === lead.name).styles.every((st, i) => st.gain === sh.styles[i].gain));
  const byBlast = sortAiRows(ais, { sort: 'style_blast', dir: 'desc' }, aiStatByKey);
  const blastVals = byBlast.map(a => aiStatByKey('style_blast').get(a));
  check('sorting by a style puts the biggest shift first and strategies without one last',
    blastVals.every((v, i) => i === 0 || v === null || (blastVals[i - 1] !== null && blastVals[i - 1] >= v)));
  check('suits best gain score and suits worst lose it, with enough matches each way',
    sh.suits.best.every(d => d.delta > 0 && d.uses >= SUIT_MIN) && sh.suits.worst.every(d => d.delta < 0 && d.uses >= SUIT_MIN)
    && sh.suits.best.every((d, i) => i === 0 || sh.suits.best[i - 1].delta >= d.delta));
  // With the Character chip on one character, the shift is that character's own.
  const one = paired.slice().sort((a, b) => b.with.length - a.with.length)[0];
  if (one) {
    const mine = aiShift(rows, lead.name, { chars: [aiSlug(one.name)] }, charMap);
    const rank = ms => placeOverview(overviewFromMatches(ms), baseline).rank.style_melee;
    const direct = rank(one.without) - rank(one.with);
    const got = mine.styles.find(x => x.key === 'melee').gain;
    check(`one character's shift is its own league places (${one.name}, melee)`, Math.abs(got - direct) < 1e-9, `${got} vs ${direct}`);
    check('one character compares all its uses', mine.compared === one.with.length && mine.characters === 1);

    // Its actions a minute are its own counts over its own time on the field;
    // a blast's hits and throws only over the matches that record hits.
    const v = mine.actions.find(a => a.key === 'vanish');
    check(`one character's actions a minute are its own (${one.name}, vanishing attacks ${fmtRate(v.usual)} → ${fmtRate(v.with)})`,
      Math.abs(v.with - rateOf(one.with, 'vanishingAttackCount')) < 1e-9 && Math.abs(v.usual - rateOf(one.without, 'vanishingAttackCount')) < 1e-9);
    const hitsOn = one.with.filter(m => m.s1HitBlast !== undefined);
    const s1 = mine.actions.find(a => a.key === 's1');
    check(`a blast is hits over throws, both over the matches that record hits (Super 1 ${fmtPair(s1.with, s1.partWith)})`,
      Math.abs(s1.with - rateOf(hitsOn, 's1Blast')) < 1e-9 && Math.abs(s1.partWith - rateOf(hitsOn, 's1HitBlast')) < 1e-9);

    // The table's action columns (aiRows.js actionColumn): with one character
    // picked its rate on this AI, else the change against other AIs; both the
    // detail's own figures.
    const onlyIt = { chars: [aiSlug(one.name)], types: [] };
    const t1 = Date.now();
    const rated1 = withActionRates(aiStrategyRows(rows, onlyIt, charMap), rows, onlyIt);
    const itsRow = rated1.find(a => a.name === lead.name);
    const col1 = actionColumn('vanish', true);
    check('with one character picked, an action column is its rate a minute on each AI',
      Math.abs(col1.get(itsRow) - v.with) < 1e-9 && col1.key === 'a_vanish' && !col1.diverge);
    const colS1 = actionColumn('s1', true);
    check('a blast\'s column reads hits/thrown, sorted by throws', colS1.text(itsRow) === fmtPair(s1.with, s1.partWith) && Math.abs(colS1.get(itsRow) - s1.with) < 1e-9);
    const byVanish = sortAiRows(rated1, { sort: 'a_vanish', dir: 'desc' }, k => (k === 'a_vanish' ? col1 : null)).map(col1.get);
    check(`sorting by an action column puts the AI that does it most first (${rated1.length} strategies, ${Date.now() - t1}ms)`,
      byVanish.every((x, i) => i === 0 || x === null || (byVanish[i - 1] !== null && byVanish[i - 1] >= x)));
  }
  const t2 = Date.now();
  const rated = withActionRates(ais, rows, { chars: [] });
  log(`  withActionRates over ${ais.length} strategies took ${Date.now() - t2}ms`);
  const colAll = actionColumn('guards', false);
  const g = sh.actions.find(a => a.key === 'guards');
  check('over many characters, an action column is the detail\'s change a minute against other AIs',
    Math.abs(colAll.get(rated.find(a => a.name === lead.name)) - (g.with - g.usual)) < 1e-9 && colAll.diverge && colAll.fmt === fmtRateChange);
  // Too new to compare: this AI's figures alone, every character that ran it counted.
  // (A character with no time on the field on it, a fusion partner absorbed
  // from the bench, has no rate to count.)
  const ran = strategyPairs(rows, lead.name).all;
  const alone = actionRates(ran, { compare: false });
  check('with nothing to compare, the figures are this AI\'s alone, over every character with time on the field on it',
    alone.every(a => a.usual === null && a.partUsual === null)
    && alone.find(a => a.key === 'guards').characters === ran.filter(p => minutes(p.with) > 0).length);
  check('the URL\'s action columns: known keys only, at most ' + MAX_ACTION_COLUMNS,
    readAiActions(new URLSearchParams('act=sparking,ult,nope')).join() === 'sparking,ult'
    && readAiActions(new URLSearchParams(`act=${ACTIONS.map(a => a.key).join(',')}`)).length === MAX_ACTION_COLUMNS
    && readAiActions(new URLSearchParams('')).length === 0);
  check('rates read as the league reads counts: "0.05", "4.1", "4,584", "0"; changes signed',
    fmtRate(0.05) === '0.05' && fmtRate(4.13) === '4.1' && fmtRate(4584.4) === '4,584' && fmtRate(0) === '0' && fmtRate(0.001) === '0'
    && fmtRateChange(0.42) === '+0.4' && fmtRateChange(-1.2) === '−1.2' && fmtPair(1.17, 0.82) === '0.8/1.2');
  const shares = sh.builds.types.reduce((n, x) => n + x.share, 0);
  check('build types are shares of its uses', shares > 0 && shares <= 1 + 1e-9);
  check('data quality: Low / Medium / High at the set bounds',
    dataQuality(29, 20) === 'Low' && dataQuality(200, 4) === 'Low' && dataQuality(30, 5) === 'Medium'
    && dataQuality(99, 20) === 'Medium' && dataQuality(100, 15) === 'High' && ais.every(a => a.quality === dataQuality(a.matches.length, a.characters)));
  log(`  quality: ${['Low', 'Medium', 'High'].map(q => `${q} ${ais.filter(a => a.quality === q).length}`).join(', ')}`);
}
// ---- The Capsules tab (pages/meta/capsuleRows.js) ------------------------------
for (const [label, { rows }] of [['default', def], ['everything', everything]]) {
  log(`\n[Capsules, ${label}]`);
  const caps = capsuleRows(rows, { chars: [], types: [], ais: [] }, charMap);
  const equipped = rows.reduce((n, r) => n + (r.matches || []).reduce((k, m) => k + (m.equippedCapsules || []).length, 0), 0);
  check(`every equipped capsule counts once, toward its own row (${caps.length} capsules)`,
    caps.reduce((n, c) => n + c.matches.length, 0) === equipped);
  const off = caps.filter(c => {
    const fought = c.matches.filter(m => (m.battleTime || 0) > 0);
    const want = fought.reduce((n, m) => n + (m.damageDone || 0), 0) / Math.max(1, fought.length);
    return fought.length && (Math.abs(want - c.avgDamage) > 1 || !Number.isFinite(c.combatPerformanceScore));
  });
  check('each capsule\'s average damage is its matches\' (those fought), and it has a score', !off.length, off.slice(0, 3).map(c => c.name).join(', '));
  check('a capsule is never paired with itself, nor more often than it was used',
    caps.every(c => c.pairs.every(p => p.name !== c.name && p.n <= c.matches.length)));
  const defense = capsuleRows(rows, { chars: [], types: ['defense'], ais: [] }, charMap);
  check('Capsule type keeps that type only', defense.length > 0 && defense.every(c => c.type === 'Defense'));
  const top = caps[0];
  const topAi = rows.flatMap(r => r.matches).find(m => (m.equippedCapsules || []).some(x => x.name === top.name)).aiStrategy;
  const byAi = capsuleRows(rows, { chars: [], types: [], ais: [aiSlug(topAi)] }, charMap);
  check('AI strategy counts only matches run with it', byAi.every(c => c.matches.every(m => m.aiStrategy === topAi)));
  const cheap = capsuleRows(rows, { chars: [], types: [], ais: [], costs: ['1', '2'] }, charMap);
  check('Cost keeps those costs only', cheap.length > 0 && cheap.every(c => c.cost === 1 || c.cost === 2)
    && cheap.length === caps.filter(c => c.cost === 1 || c.cost === 2).length);
  const found = caps.find(c => c.effect);
  check('the search finds a capsule by its name and its effect',
    !!found && capsuleMatchesQuery(found, found.name.toLowerCase()) && capsuleMatchesQuery(found, found.effect.slice(0, 12).toLowerCase()));

  // Fit: the share of each build type's builds that run it, counted directly.
  const allBuilds = rows.flatMap(r => (r.matches || []).filter(m => (m.equippedCapsules || []).length));
  const typeOfBuild = m => (m.buildComposition && m.buildComposition.primary) || 'No Build';
  const has = (m, id) => (m.equippedCapsules || []).some(x => x.id === id);
  const fitOff = [];
  for (const c of caps.slice(0, 12)) {
    for (const t of BUILD_TYPES) {
      const of = allBuilds.filter(m => typeOfBuild(m) === t);
      const n = of.filter(m => has(m, c.capsuleId)).length;
      const want = of.length ? n / of.length : null;
      const got = c.fit[t] ? c.fit[t].share : null;
      if (want === null ? got !== null : Math.abs(got - want) > 1e-9) fitOff.push(`${c.name} ${t}`);
    }
  }
  check('a build type column is the share of that type\'s builds that run it', !fitOff.length, fitOff.slice(0, 3).join(', '));
  const defenseFit = defense.find(c => c.name === (caps.find(x => x.type === 'Defense') || {}).name);
  const plainFit = caps.find(c => defenseFit && c.name === defenseFit.name);
  check('the capsule type and cost chips pick rows, not the builds shares are of',
    !!defenseFit && BUILD_TYPES.every(t => (defenseFit.fit[t] || {}).of === (plainFit.fit[t] || {}).of));
  const aiTop = byAi.find(c => c.name === top.name);
  const aiBuilds = allBuilds.filter(m => m.aiStrategy === topAi);
  check('with an AI strategy picked, the shares are of that AI\'s builds',
    !!aiTop && BUILD_TYPES.every(t => !aiTop.fit[t] || aiTop.fit[t].of === aiBuilds.filter(m => typeOfBuild(m) === t).length));

  // AI strategies and lineup position: shares of its uses, against all builds.
  check('its AI strategies add up to its uses',
    caps.every(c => c.ais.reduce((n, a) => n + a.n, 0) === c.matches.length));
  const usualBarrage = top.ais[0].usual;
  check('an AI\'s usual share is its share of every build',
    Math.abs(usualBarrage - allBuilds.filter(m => (m.aiStrategy || 'Default') === top.ais[0].name).length / allBuilds.length) < 1e-9);
  const sum = xs => xs.reduce((n, x) => n + x, 0);
  check('its lineup positions and the usual ones each add up to 100%',
    caps.filter(c => c.positions.some(p => p.n)).every(c => Math.abs(sum(c.positions.map(p => p.share)) - 1) < 1e-9
      && Math.abs(sum(c.positions.map(p => p.usual)) - 1) < 1e-9));
  const savior = caps.find(c => c.name === 'Savior');
  if (savior && savior.matches.length >= 30) {
    log(`  Savior by position: ${savior.positions.map(p => `${p.pos}: ${Math.round(p.share * 100)}%`).join(', ')}`);
    check('Savior (it fires on the first switch-in) is almost never on a Starter', savior.positions[0].share < 0.05);
  }

  // Goes with: lift is together × builds / (its uses × theirs); floors hold.
  const usesOf = new Map(caps.map(c => [c.capsuleId, c.matches.length]));
  const liftOff = caps.slice(0, 12).flatMap(c => c.pairs.slice(0, 5)
    .filter(p => Math.abs(p.lift - (p.n * allBuilds.length) / (c.matches.length * usesOf.get(p.id))) > 1e-9));
  check('a pair\'s lift is how many times as often as chance', !liftOff.length);
  check('a pair\'s usual share is its share of all builds, and lift is share over usual',
    caps.slice(0, 12).every(c => c.pairs.slice(0, 5).every(p => Math.abs(p.usual - usesOf.get(p.id) / allBuilds.length) < 1e-9
      && Math.abs(p.lift - p.share / p.usual) < 1e-9)));
  check('Goes with keeps pairs past its floors, by lift',
    caps.every(c => c.goesWith.every((p, i) => p.n >= PAIR_MIN && p.share >= PAIR_SHARE && (i === 0 || c.goesWith[i - 1].lift >= p.lift))));

  // Tiers: a family's tiers in order, sharing its name.
  const tiered = caps.find(c => c.tiers);
  check('a capsule family lists its tiers in order, itself included', !!tiered
    && tiered.tiers.some(t => t.capsuleId === tiered.capsuleId)
    && tiered.tiers.every((t, i) => familyOf(t.name).base === familyOf(tiered.name).base && (i === 0 || tiered.tiers[i - 1].tier < t.tier)));
  if (tiered) log(`  tiers, e.g. ${tiered.tiers.map(t => `${t.name} (${t.cost} cost, ${t.uses})`).join(' / ')}`);

  // What it changes: same character, same build type, builds without it.
  const cmp = caps.find(c => c.comparable >= 30) || caps[0];
  const ch = capsuleChange(rows, cmp.capsuleId, { chars: [], ais: [] });
  check('the row\'s comparable uses are what capsuleChange compares', ch.compared === cmp.comparable, `${ch.compared} vs ${cmp.comparable}`);
  // One character, done by hand.
  const heavy = rows.find(r => {
    const bs = (r.matches || []).filter(m => (m.equippedCapsules || []).length);
    return bs.some(m => has(m, cmp.capsuleId)) && bs.filter(m => !has(m, cmp.capsuleId)).length >= MIN_OTHER;
  });
  if (heavy) {
    const one = capsuleChange(rows, cmp.capsuleId, { chars: [aiSlug(heavy.name)], ais: [] });
    const bs = heavy.matches.filter(m => (m.equippedCapsules || []).length);
    let a = 0, b = 0, w = 0;
    for (const t of new Set(bs.map(typeOfBuild))) {
      const wi = bs.filter(m => typeOfBuild(m) === t && has(m, cmp.capsuleId));
      const wo = bs.filter(m => typeOfBuild(m) === t && !has(m, cmp.capsuleId));
      if (!wi.length || wo.length < MIN_OTHER) continue;
      a += wi.length * overviewFromMatches(wi).avgDealt; b += wi.length * overviewFromMatches(wo).avgDealt; w += wi.length;
    }
    check(`one character's change is its own builds with it against the same type without (${heavy.name}, ${cmp.name})`,
      w ? !!one.dmg && Math.abs(one.dmg.with - a / w) < 1e-6 && Math.abs(one.dmg.usual - b / w) < 1e-6 : one.compared === 0);
  }
  log(`  ${cmp.name}: ${ch.compared} of ${cmp.matches.length} compared (${ch.quality}), damage ${ch.dmg ? `${Math.round(ch.dmg.shift * 100)}%` : '–'}`);
  log(`  quality: ${['Low', 'Medium', 'High'].map(q => `${q} ${caps.filter(c => c.quality === q).length}`).join(', ')}`);
}
// ---- Transformations: the Capsules detail's box, the AI Strategies sheet ------
{
  const { rows } = everything;
  log('\n[Transformations: Capsules detail, AI Strategies sheet]');
  const ctx = { idFor, lineups: lineupIndex(rows, idFor) };
  const none = { chars: [], ais: [] };
  const other = capsuleRows(rows, { chars: [], types: [], ais: [] }, charMap)
    .find(c => !SKILL_GAUGE_CAPSULES.includes(c.capsuleId) && c.capsuleId !== BROLYS_RING);
  check('only the skill gauge capsules and Broly\'s Ring have a Transformations box, and only with the lineups',
    capsuleTransform(rows, other.capsuleId, none, ctx) === null
    && SKILL_GAUGE_CAPSULES.every(id => capsuleTransform(rows, id, none, ctx).kind === 'gauge')
    && capsuleTransform(rows, BROLYS_RING, none, ctx).kind === 'ring' && capsuleTransform(rows, SKILL_GAUGE_CAPSULES[0], none, null) === null);

  // Super Transformation, counted by hand: the same character on the same AI,
  // its counted matches with it against those without (MIN_OTHER+).
  const ST = SKILL_GAUGE_CAPSULES[0];
  const st = capsuleTransform(rows, ST, none, ctx);
  const groups = new Map();
  for (const r of rows) {
    for (const m of r.matches) {
      const ai = m.aiStrategy || UNKNOWN_AI;
      if (!(m.equippedCapsules || []).length || ai === UNKNOWN_AI) continue;
      const t = matchTransformation(m, { id: idFor(r.name), lineups: ctx.lineups });
      if (!t.counted) continue;
      const k = `${r.name}|${ai}`;
      if (!groups.has(k)) groups.set(k, { w: [], o: [] });
      groups.get(k)[m.equippedCapsules.some(c => c.id === ST) ? 'w' : 'o'].push(t);
    }
  }
  const rateOf = ts => ts.filter(t => t.transformed).length / ts.length;
  let n = 0, a = 0, b = 0;
  const chars = new Set();
  for (const [k, g] of groups) {
    if (!g.w.length || g.o.length < MIN_OTHER) continue;
    n += g.w.length; a += g.w.length * rateOf(g.w); b += g.w.length * rateOf(g.o);
    chars.add(k.slice(0, k.lastIndexOf('|')));
  }
  check(`Super Transformation is the same character on the same AI with it against without (${n} matches over ${chars.size} characters, ${Math.round((b / n) * 100)}% -> ${Math.round((a / n) * 100)}%, ${st.quality})`,
    n > 0 && st.compared === n && st.characters === chars.size && Math.abs(st.with - a / n) < 1e-9 && Math.abs(st.usual - b / n) < 1e-9
    && st.quality === dataQuality(n, chars.size));
  const ringBy = rows.reduce((k, r) => k + r.matches.filter(m => (m.equippedCapsules || []).some(c => c.id === BROLYS_RING)
    && m.battleTime > 0 && !m.absorbed && canTransformOrFuse(idFor(r.name))).length, 0);
  const ring = capsuleTransform(rows, BROLYS_RING, none, ctx);
  check(`Broly's Ring counts the fought matches of characters that can transform (${ringBy}, most by ${ring.byCharacter[0] ? ring.byCharacter[0].name : '-'})`,
    ringBy > 0 && ring.matches === ringBy && ring.byCharacter.reduce((k, c) => k + c.uses, 0) === ringBy);
  const topAi = [...groups.keys()].map(k => k.slice(k.lastIndexOf('|') + 1))[0];
  const narrowed = capsuleTransform(rows, ST, { chars: [], ais: [aiSlug(topAi)] }, ctx);
  check('an AI strategy chip narrows it to that AI\'s matches', narrowed.compared <= st.compared
    && narrowed.groups.every(g => g.endsWith(`|${topAi}`)));

  // The workbook's AI Strategies sheet: the page's Transform comparison.
  const sheet = aiStrategySheet(rows, charMap, ctx);
  const plain = aiStrategySheet(rows, charMap);
  const gainCol = sheet.columns.find(c => c.header === 'Transform +/- (pts)');
  check('the AI Strategies sheet carries the Transform comparison (blank without the lineups), and no Default row',
    !!gainCol && !plain.columns.some(c => c.header.startsWith('Transform')) && sheet.rows.every(r => r.name !== UNKNOWN_AI)
    && sheet.rows.some(r => gainCol.get(r) !== null)
    && sheet.rows.every(r => gainCol.get(r) === (r.transform && r.transform.gain !== null ? Math.round(r.transform.gain * 100) : null)));
}
{
  const P = s => new URLSearchParams(s);
  const cf = readCapsuleFilters(P('ctype=defense,nope&ai=attack-strategy-barrage&char=jiren&cost=3,x,1'));
  check('Capsules params read back, unknown types and costs dropped', cf.types.join() === 'defense' && cf.ais.join() === 'attack-strategy-barrage' && cf.chars.join() === 'jiren' && cf.costs.join() === '3,1');
  const f = readAiFilters(P('type=Attack,Nope&char=goku,goku'));
  check('AI params read back, unknown types dropped', f.types.join() === 'Attack' && f.chars.join() === 'goku');
  check('every type picked is no filter', !readAiFilters(P('type=Attack,Defense,Balanced,Other')).types.length);
  check('the AI sort defaults to uses and ignores a Builds-only key', readAiSort(P('sort=uses')).sort === 'matches');
  check('the AI tab sorts by a style column, and not by a column it no longer has',
    readAiSort(P('sort=style_ult'), aiStatByKey).sort === 'style_ult' && readAiSort(P('sort=dmg'), aiStatByKey).sort === 'matches');
  const capSort = q => readAiSort(P(q), capsuleStatByKey, { score: false }).sort;
  check('the Capsules tab sorts by a build type, and not by the score it dropped',
    capSort('sort=fit_blast') === 'fit_blast' && capSort('sort=score') === 'matches' && capSort('sort=dmg') === 'matches');
  const caps = capsuleRows(def.rows, { chars: [], types: [], ais: [] }, charMap);
  const byBlast = sortAiRows(caps, { sort: 'fit_blast', dir: 'desc' }, capsuleStatByKey);
  const blast = FIT_STATS.find(s => s.key === 'fit_blast');
  check('sorting by a build type orders by that share',
    byBlast.every((r, i) => i === 0 || blast.get(byBlast[i - 1]) >= blast.get(r)));
}

console.log = log;
if (failures) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log('\nAll Meta Builds, AI strategies and Capsules checks passed.');
