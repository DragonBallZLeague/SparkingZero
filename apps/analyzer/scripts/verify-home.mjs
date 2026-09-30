/**
 * Checks Home's data (src/pages/home/homeRows.js) on the real corpus:
 *   - each curated board is a preset over the Characters table: its link's
 *     query, read the way the Characters page reads it (view, sort, position),
 *     opens that table with the board's five first among its characters with
 *     5+ matches (the thinner ones only fill a list too short without them),
 *     and it keeps the scope
 *   - Spam is volume: 10 blasts and no ultimate out-spam 5 blasts and 2
 *   - no board sorts by win % (a team measure, never a character's headline)
 *   - a style's league rank agrees with the table's order (the Styles view)
 *   - a match's week is read from its name, and the latest week is the newest
 *     season week in scope, with all of its matches and nothing newer left out
 *   - the newest-uploads file (generate-recent-uploads.mjs) is dated, and
 *     each list, as Home orders it, newest day first and in play order within
 *     a day, every entry a real test or event
 *
 * Deliberately NOT in prebuild: it aggregates real corpus shards, like
 * verify-meta-builds. Run: npm run verify-home (after the aggregates exist).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAggregatedCharacterData } from '../src/utils/aggregation/characterAggregation.js';
import { parseCharacterCSV } from '../src/utils/statCalculations.js';
import { loadCapsuleData } from '../src/utils/capsuleDataProcessor.js';
import { isProvisionalTier } from '../src/utils/performanceTier.js';
import {
  rowsForPositions, sortRows, readSort, readPositions, readView, statByKey, CHAR_STATS,
} from '../src/pages/characters/characterRows.js';
import { STYLE_STATS, styleByKey, withStyles } from '../src/pages/characters/styleRows.js';
import { matchRows } from '../src/pages/matches/matchRows.js';
import { compareMatchTime } from '../src/utils/matchOrder.js';
import {
  BOARDS, BOARD_SIZE, boardPositions, boardRows, boardSearch, isStyleBoard, weekOf, weekLabel, latestWeek,
  LATEST, recentRows,
} from '../src/pages/home/homeRows.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const refData = path.resolve(__dirname, '..', '..', '..', 'referencedata');
const aggDir = path.resolve(__dirname, '..', 'public', 'br-aggregates');

let failures = 0;
function check(label, cond, detail) {
  if (cond) { console.log('  ok   ' + label); return; }
  failures++;
  console.error('  FAIL ' + label + (detail ? '\n         ' + detail : ''));
}

// ---- pure checks ---------------------------------------------------------------
console.log('\n[names and links]');
const weeks = [
  ['S0 Week 1 Match 1.json', 'S0 Week 1'],
  ['S0 Week 10 Match 3.json', 'S0 Week 10'],
  ['S0 Playoffs Quarter-Finals Week 2 Match 2 R1.json', 'S0 Playoffs Quarter-Finals Week 2'],
  ['PS0 Week 3 Match 6', 'PS0 Week 3'],
  ['OS0 Budokai 4v4 Test 12', null],
];
for (const [name, want] of weeks) check(`the week of "${name}" is ${want === null ? 'none' : `"${want}"`}`, weekOf(name) === want, `got ${weekOf(name)}`);
check('a week reads as "Season 0 · Week 10"', weekLabel('S0 Week 10') === 'Season 0 · Week 10', weekLabel('S0 Week 10'));
check('...and a pre-season one as "Pre-season 0 · Week 2"', weekLabel('PS0 Week 2') === 'Pre-season 0 · Week 2', weekLabel('PS0 Week 2'));

check('there are six boards, with distinct keys', BOARDS.length === 6 && new Set(BOARDS.map(b => b.key)).size === 6);
// What the Characters page makes of a query: its view's columns and sort.
const tableFor = q => {
  const view = readView(q);
  const stats = view === 'styles' ? STYLE_STATS : CHAR_STATS;
  return { view, stats, ...readSort(q, stats) };
};
check('every board sorts by a column of its view, or the score',
  BOARDS.every(b => !b.sort || (isStyleBoard(b) ? styleByKey(b.sort) : statByKey(b.sort))));
check('no board sorts by win %, a team measure', BOARDS.every(b => b.sort !== 'win'));
check('the top three are the core fighting styles, the rest the positions by score',
  BOARDS.slice(0, 3).every(isStyleBoard) && BOARDS.slice(3).map(b => b.pos).join(',') === '1,2,3' && BOARDS.slice(3).every(b => !b.sort));
const scope = '?seasonNumber=0&matchType=Season,Test';
for (const b of BOARDS) {
  const q = new URLSearchParams(boardSearch(b, scope));
  const t = tableFor(q);
  const want = b.sort || 'score';
  const ok = t.view === (b.view || 'table') && t.sort === want && t.dir === 'desc'
    && readPositions(q).join(',') === boardPositions(b).join(',')
    && q.get('seasonNumber') === '0' && q.get('matchType') === 'Season,Test';
  check(`"${b.title}" links to the ${t.view} view sorted by ${want}${b.pos ? `, position ${b.pos}` : ''}, in scope`, ok, boardSearch(b, scope));
}
check('board links keep commas readable', boardSearch(BOARDS[0], scope).includes('matchType=Season,Test'), boardSearch(BOARDS[0], scope));

// The league's Spammer rule (2026-09-30): volume decides, so 10 blasts and no
// ultimate beat 5 blasts and 2 ultimates, each in a five-minute match (inside
// the league's range, so the ranks can differ).
const minute = (blasts, ults) => ({ name: `${blasts}+${ults}`, matches: [{ battleTime: 300, specialMovesUsed: blasts, ultimatesUsed: ults }] });
const [few, many] = withStyles([minute(5, 2), minute(10, 0)]).map(r => r.styles.spam);
check('Spam: 10 blasts and no ultimate out-spam 5 blasts and 2 ultimates',
  many.raw > few.raw && many.rank < few.rank, `10+0: ${many.raw}/min #${many.rank}; 5+2: ${few.raw}/min #${few.rank}`);

// ---- the real corpus -----------------------------------------------------------
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
const seasons = all.filter(f => f.tags.matchType === 'Season').map(f => Number(f.tags.seasonNumber));
const latestSeason = String(Math.max(...seasons));
const scopes = [
  [`Season ${latestSeason} season matches (the default)`, all.filter(f => String(f.tags.seasonNumber) === latestSeason && f.tags.matchType === 'Season')],
  ['Everything', all],
  ['Tests only', all.filter(f => f.tags.matchType === 'Test')],
];

for (const [label, files] of scopes) {
  console.log(`\n[${label}: ${files.length} matches]`);
  const aggregated = getAggregatedCharacterData(files, charMap, capsuleInfo.capsuleMap, aiStrategies, {});

  // The boards: what the Characters page shows for each board's link.
  const styled = withStyles(rowsForPositions(aggregated, [], charMap));
  for (const b of BOARDS) {
    const q = new URLSearchParams(boardSearch(b));
    const t = tableFor(q);
    const cut = rowsForPositions(aggregated, readPositions(q), charMap);
    const table = sortRows(t.view === 'styles' ? withStyles(cut) : cut, t, t.stats);
    const own = rowsForPositions(aggregated, boardPositions(b), charMap);
    const five = boardRows(isStyleBoard(b) ? withStyles(own) : own, b);
    // The table's order, characters with 5+ matches first, the rest after.
    const settled = table.filter(r => !isProvisionalTier(r));
    const want = [...settled, ...table.filter(r => isProvisionalTier(r))].slice(0, BOARD_SIZE);
    const thinShown = five.filter(r => isProvisionalTier(r)).length;
    check(`"${b.title}": its ${five.length} are the linked table's first with 5+ matches` +
      (thinShown ? ` (and ${thinShown} under 5, as only ${settled.length} have 5+)` : ''),
      five.length === Math.min(BOARD_SIZE, table.length) && five.every((r, i) => r.name === want[i].name)
        && (thinShown === 0 || settled.length < BOARD_SIZE),
      `board ${five.map(r => r.name).join(', ')} | want ${want.map(r => r.name).join(', ')}`);
  }

  // The Styles view: sorted by a style, the league ranks never go backwards.
  for (const s of STYLE_STATS) {
    const sorted = sortRows(styled, { sort: s.key, dir: 'desc' }, STYLE_STATS).map(r => r.styles[s.key]);
    const used = sorted.filter(f => !f.never);
    const inOrder = used.every((f, i) => i === 0 || f.rank >= used[i - 1].rank);
    const neverLast = sorted.findIndex(f => f.never) === -1 || sorted.slice(sorted.findIndex(f => f.never)).every(f => f.never);
    check(`sorted by ${s.label}, league ranks only go down the table, "Never" last`, inOrder && neverLast,
      used.slice(0, 8).map(f => f.rank).join(', '));
  }

  // The latest week.
  const rows = matchRows(files, { charMap });
  const latest = latestWeek(rows);
  const seasonRows = rows.filter(r => r.matchType === 'Season' && weekOf(r.name));
  if (!seasonRows.length) {
    check('no season match in scope, so no latest week', latest === null);
    continue;
  }
  check('there is a latest week', !!latest);
  if (!latest) continue;
  console.log(`         ${latest.label}: ${latest.rows.map(r => r.name).join(', ')}`);
  check('its matches all share its week', latest.rows.every(r => weekOf(r.name) === latest.week));
  check('it has every season match of that week',
    latest.rows.length === seasonRows.filter(r => weekOf(r.name) === latest.week).length);
  const last = latest.rows[latest.rows.length - 1];
  check('no season match in scope is newer than the week',
    seasonRows.every(r => weekOf(r.name) === latest.week || compareMatchTime(r.path, last.path) < 0));
  check('its matches are in play order',
    latest.rows.every((r, i) => i === 0 || compareMatchTime(latest.rows[i - 1].path, r.path) <= 0));
}

// ---- the newest uploads -----------------------------------------------------------
const recentFile = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'public', 'br-recent-uploads.json'), 'utf8'));
const tags = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'public', 'br-data-tags.json'), 'utf8'));
const day = iso => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
for (const kind of LATEST.filter(l => l.matchType)) {
  console.log(`\n[the newest ${kind.noun}: public/br-recent-uploads.json]`);
  const recent = recentRows(recentFile, kind.key);
  const all = Object.keys(tags).filter(p => tags[p] && tags[p].matchType === kind.matchType);
  check(`it holds ${kind.noun}`, recent.length === Math.min(30, all.length), `${recent.length} of ${all.length}`);
  check(`each is ${kind.matchType === 'Event' ? 'an' : 'a'} ${kind.matchType.toLowerCase()} in the tags index`, recent.every(r => tags[r.path] && tags[r.path].matchType === kind.matchType),
    recent.filter(r => !(tags[r.path] && tags[r.path].matchType === kind.matchType)).map(r => r.path).slice(0, 3).join(', '));
  check('each has two sides, as a Matches list row', recent.every(r => Array.isArray(r.sides) && r.sides.length === 2));
  check('they are dated (this checkout has its git history)', recentFile.dated === true && recent.every(r => r.uploaded));
  check('newest day first', recent.every((r, i) => i === 0 || day(r.uploaded) <= day(recent[i - 1].uploaded)));
  check('in play order within a day',
    recent.every((r, i) => i === 0 || day(r.uploaded) !== day(recent[i - 1].uploaded) || compareMatchTime(recent[i - 1].path, r.path) <= 0));
  console.log(`         first: ${recent.slice(0, 3).map(r => `${r.name} (${r.uploaded})`).join('; ')}`);
}

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll Home checks passed.');
process.exit(failures ? 1 : 0);
