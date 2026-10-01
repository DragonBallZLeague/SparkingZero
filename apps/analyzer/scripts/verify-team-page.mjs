/**
 * Checks the Teams table's and Team page's data (src/pages/teams/teamRows.js)
 * on real data.
 *
 * WHY THIS EXISTS
 *
 * The Team page joins two aggregations - getTeamAggregatedData() for the
 * team's figures and head-to-heads, the character rows for its roster and
 * lineups - and every join fails silently: an orange "top 5" mark on the wrong
 * five, a head-to-head that drops matches, a mirror test whose two lineups
 * merge into one ten-man side. So each is checked against the real corpus:
 *
 *   1. The top 5 the figures use are the roster's five best scores, and their
 *      damage adds up to the team's figure (the league's tie-breaker). And
 *      each roster row agrees with the leaderboard cut to that team - what the
 *      row's link opens. Every match row carries what THE FUSION RULE
 *      (utils/fusionSplit.js) gives it, on its own side, which a made-up
 *      test against itself checks, since the corpus has no such fusion.
 *   2. The head-to-heads cover every match against a named opponent, and each
 *      agrees with the team's record against it.
 *   3. Every lineup has one Starter per side, slots in order, and there is
 *      one lineup per match.
 *   4. A `vs` cut keeps only that opponent's matches, everywhere, and its
 *      roster's appearances are its lineups' characters.
 *   5. The URL's `vs` and the searches.
 *
 * Deliberately NOT in prebuild: it aggregates real corpus shards, like
 * verify-meta-builds. Run it when you change the Team page or team data.
 *
 * Usage: npm run verify-team-page
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAggregatedCharacterData } from '../src/utils/aggregation/characterAggregation.js';
import { getTeamAggregatedData } from '../src/utils/aggregation/teamAggregation.js';
import { parseCharacterCSV, getTeams, extractStats } from '../src/utils/statCalculations.js';
import { loadCapsuleData } from '../src/utils/capsuleDataProcessor.js';
import { filterAggregatedData } from '../src/utils/aggregation/filterAggregated.js';
import { computeMatchFusionDeltas, applyFusionSplit, withAbsorbedPartners, isAbsorbedKey } from '../src/utils/fusionSplit.js';
import { isFusionStep } from '../src/utils/transformation.js';
import {
  teamRows, sortTeams, opponentRows, readVs, rosterRows, teamLineups, teamMatchList, fileTeams,
  lineupMatchesQuery, matchMatchesQuery,
} from '../src/pages/teams/teamRows.js';

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
const aggregate = fs => getTeamAggregatedData(fs, charMap, capsuleInfo.capsuleMap, aiStrategies);

const index = JSON.parse(fs.readFileSync(path.join(aggDir, 'index.json'), 'utf8'));
const all = [];
for (const sh of index.shards) {
  const shard = JSON.parse(fs.readFileSync(path.join(aggDir, sh.slug + '.json'), 'utf8'));
  for (const f of Object.values(shard.files)) all.push({ name: f.name, content: f.content, tags: f.tags || {} });
}

/**
 * THE FUSION RULE lands on the right rows: each character's match row (the
 * leaderboard's, from characterAggregation.js, which applies the rule inline)
 * carries the damage that the shared rule gives it (applyFusionSplit, which
 * the team figures, positions and the match viewer use), on its own side.
 */
function fusionRows(characters, files) {
  const rowDmg = new Map();
  for (const c of characters) for (const m of c.matches || []) rowDmg.set(`${m.fileName}|${m.side}|${m.slot}`, m.damageDone || 0);
  // A partner the file left out (withAbsorbedPartners) holds no slot.
  const slotOf = k => (k.includes('１Ｐ') || k.includes('２Ｐ') ? 1 : isAbsorbedKey(k) ? null : Number((k.match(/Member(\d+)/) || [])[1]) + 1);
  const bad = [];
  let fused = 0, fusions = 0, split = 0;
  for (const f of files) {
    const tbr = f.content.TeamBattleResults;
    const br = tbr && (tbr.battleResult || tbr.BattleResults || tbr);
    if (!br || !br.characterRecord) continue;
    // Every fusion the file records, whether or not it kept the partner's record.
    for (const c of Object.values(br.characterRecord)) {
      const chain = [c.battlePlayCharacter?.originalCharacter?.key, ...(c.formChangeHistory || []).map(x => x.key)];
      if (chain.some((id, i) => i > 0 && isFusionStep(chain[i - 1], id))) fusions++;
    }
    const record = withAbsorbedPartners(br.characterRecord);
    const deltas = computeMatchFusionDeltas(record, br.characterIdRecord);
    split += deltas.size / 2;
    const t = getTeams(record);
    [t.p1, t.p2].forEach((chars, i) => {
      for (const ch of chars) {
        const st = extractStats(ch, charMap, capsuleInfo.capsuleMap);
        if (!st.name || st.name === '-') continue;
        const want = applyFusionSplit(st, ch, deltas);
        if (want.hasFusionStats) fused++;
        const got = rowDmg.get(`${f.name}|${i + 1}|${slotOf(ch._key)}`);
        if (got == null || Math.abs(got - want.damageDone) > 1) bad.push(`${f.name} side ${i + 1} ${st.name}: row ${got == null ? 'missing' : Math.round(got)}, rule ${Math.round(want.damageDone)}`);
      }
    });
  }
  return { bad, fused, fusions, split };
}

const seasons = [...new Set(all.filter(f => f.tags.matchType === 'Season').map(f => Number(f.tags.seasonNumber)))];
const latest = String(Math.max(...seasons));
const scopes = [
  [`Season ${latest} season matches (the default)`, all.filter(f => String(f.tags.seasonNumber) === latest && f.tags.matchType === 'Season')],
  ['Everything', all],
];

for (const [label, files] of scopes) {
  const characters = getAggregatedCharacterData(files, charMap, capsuleInfo.capsuleMap, aiStrategies, {});
  const rows = teamRows(aggregate(files));
  log(`\n[${label}: ${files.length} matches, ${rows.length} teams]`);

  // 1. The top 5.
  const top5Bad = [], dmgBad = [], apart = [];
  let compared = 0;
  for (const r of rows) {
    const roster = rosterRows(r.source).sort((a, b) => b.combatPerformanceScore - a.combatPerformanceScore);
    const best = roster.slice(0, 5).map(x => x.name).sort().join('|');
    if (best !== [...r.top5].sort().join('|')) top5Bad.push(`${r.name}: figures use ${r.top5.join(', ')}; roster's best are ${best}`);
    const sum = r.top5.reduce((s, n) => s + (roster.find(x => x.name === n)?.avgDamage || 0), 0);
    if (Math.abs(sum - r.dmg) > 5) dmgBad.push(`${r.name}: ${Math.round(sum)} vs ${r.dmg}`);
    // What a roster row's link opens: the leaderboard, cut to this team.
    const board = filterAggregatedData(characters, { selectedTeams: [r.tag], charMap });
    for (const x of roster) {
      const b = board.find(y => y.name === x.name);
      compared++;
      if (!b || b.matchCount !== x.matchCount || Math.abs(b.avgDamage - x.avgDamage) > 1) {
        apart.push(`${r.name} / ${x.name}: team ${x.matchCount} matches, ${Math.round(x.avgDamage)}; leaderboard ${b ? `${b.matchCount}, ${Math.round(b.avgDamage)}` : 'none'}`);
      }
    }
  }
  check('the top 5 the figures use are the roster\'s five best scores', !top5Bad.length, top5Bad.slice(0, 3).join('\n         '));
  check('the top 5\'s average damage adds up to the team\'s', !dmgBad.length, dmgBad.slice(0, 3).join('\n         '));
  check(`every roster row's matches and damage match the leaderboard's for that team (${compared} rows)`, !apart.length,
    apart.slice(0, 4).join('\n         '));

  const sorted = sortTeams([...rows, { ...rows[0], tag: 'tie', name: 'tie', dmg: rows[0].dmg + 1 }], { sort: 'win', dir: 'desc' });
  check('a win % tie goes to the higher average damage', sorted.findIndex(r => r.tag === 'tie') < sorted.findIndex(r => r.tag === rows[0].tag));

  const split = fusionRows(characters, files);
  check(`every match row's damage is what the fusion rule gives it (${split.fused} fusion shares)`, !split.bad.length, split.bad.slice(0, 3).join('\n         '));
  // A file can leave the absorbed partner out (12 of 32 fusions); the split used
  // to be skipped there, the initiator keeping the whole fusion.
  check(`every fusion is split, its partner recorded or not (${split.split} of ${split.fusions})`, split.split === split.fusions && split.fused === 2 * split.fusions);

  // 2-4, per team.
  const h2hBad = [], lineupBad = [], vsBad = [];
  for (const r of rows) {
    const tag = r.tag;
    const mine = files.filter(f => fileTeams(f).includes(tag));
    const named = mine.filter(f => { const [a, b] = fileTeams(f); return a && b && a !== b; });
    const opps = opponentRows(files, tag, aggregate);
    const covered = opps.reduce((n, o) => n + o.matches, 0);
    if (covered !== named.length) h2hBad.push(`${r.name}: head-to-heads cover ${covered} of ${named.length} matches against named opponents`);
    for (const o of opps) {
      const rec = r.source.opponentRecords[o.opp] || {};
      if (o.wins !== (rec.wins || 0) || o.losses !== (rec.losses || 0)) h2hBad.push(`${r.name} vs ${o.name}: ${o.wins}-${o.losses}, record says ${rec.wins}-${rec.losses}`);
    }

    const lineups = teamLineups(characters, tag);
    const list = teamMatchList(r.source);
    if (lineups.length !== list.length) lineupBad.push(`${r.name}: ${lineups.length} lineups for ${list.length} matches`);
    for (const l of lineups) {
      for (const [side, slots] of [['us', l.us], ['them', l.them]]) {
        const s = slots.map(x => x.slot);
        const inOrder = s.every((v, i) => v === i + 1);
        if (!inOrder) lineupBad.push(`${r.name} ${l.name} (${side}): slots ${s.join(',')}`);
      }
    }

    // 4. One opponent: the busiest, if any.
    const o = [...opps].sort((a, b) => b.matches - a.matches)[0];
    if (!o) continue;
    const cutLineups = teamLineups(characters, tag, o.opp);
    const appearances = rosterRows(o.source).reduce((n, c) => n + c.matchCount, 0);
    // A fusion partner its file left out is in the roster but holds no lineup slot.
    const cutFiles = new Set(cutLineups.map(l => l.fileName));
    const unslotted = characters.reduce((n, c) => n + (c.matches || []).filter(m => m.unrecorded && cutFiles.has(m.fileName)
      && m.team === tag && (m.opponentTeam !== tag || m.side !== 2)).length, 0);
    const fielded = cutLineups.reduce((n, l) => n + l.us.length, 0) + unslotted;
    if (appearances !== fielded) vsBad.push(`${r.name} vs ${o.name}: the roster has ${appearances} appearances, the lineups ${fielded}`);
    if (cutLineups.length !== o.matches || !cutLineups.every(l => l.opponent === o.opp)) vsBad.push(`${r.name} vs ${o.name}: ${cutLineups.length} lineups for ${o.matches} matches`);
    const cutList = teamMatchList(r.source, o.opp);
    if (cutList.length !== o.matches) vsBad.push(`${r.name} vs ${o.name}: ${cutList.length} listed for ${o.matches} matches`);
  }
  check('the head-to-heads cover every match against a named opponent, and match its record', !h2hBad.length, h2hBad.slice(0, 3).join('\n         '));
  check('one lineup per match, each side with one Starter and its slots in order', !lineupBad.length, lineupBad.slice(0, 3).join('\n         '));
  check('an opponent cut keeps only that opponent\'s matches, and its roster is its lineups\' characters', !vsBad.length, vsBad.slice(0, 3).join('\n         '));
}

// ---- A fusion in a test against itself ---------------------------------------
// The corpus has no match where a fusing character is also on the other side,
// so one is made: a real fusion match whose second side is a copy of the first
// that never fuses. Its split must stay on the first side's rows.
log('\n[a fusion in a test against itself]');
const fusionFile = all.find(f => {
  const tbr = f.content.TeamBattleResults;
  const br = tbr && tbr.battleResult;
  return br && br.characterRecord && computeMatchFusionDeltas(br.characterRecord, br.characterIdRecord).size;
});
const br0 = fusionFile.content.TeamBattleResults.battleResult;
const mirrored = {};
for (const [k, c] of Object.entries(br0.characterRecord)) {
  if (k.includes('EnemyTeamMember') || k.includes('２Ｐ')) continue;
  mirrored[k] = c;
  mirrored[k.replace('AlliesTeamMember', 'EnemyTeamMember').replace('１Ｐ', '２Ｐ')] = { ...c, formChangeHistory: [] };
}
const tag0 = fusionFile.content.TeamBattleResults.teams[0];
const mirrorFile = {
  name: 'Tests/verify-team-page mirror fusion.json',
  content: { TeamBattleResults: { teams: [tag0, tag0], battleResult: { ...br0, characterRecord: mirrored } } },
  tags: {},
};
const mirrorSplit = fusionRows(getAggregatedCharacterData([mirrorFile], charMap, capsuleInfo.capsuleMap, aiStrategies, {}), [mirrorFile]);
check(`${fusionFile.name.split('/').pop()}, mirrored: the split stays on the side that fused (${mirrorSplit.fused} shares)`,
  mirrorSplit.fused === computeMatchFusionDeltas(br0.characterRecord, br0.characterIdRecord).size && !mirrorSplit.bad.length, mirrorSplit.bad.slice(0, 3).join('\n         '));

// ---- URL and search -----------------------------------------------------------
log('\n[url and search]');
const P = s => new URLSearchParams(s);
check('vs=<slug> reads back to the tag', readVs(P('vs=master-and-student'), ['Sentai', 'Master and Student']) === 'Master and Student');
check('vs=<tag> is accepted too', readVs(P('vs=Sentai'), ['Sentai']) === 'Sentai');
check('a vs the team never played is ignored', readVs(P('vs=demons'), ['Sentai']) === null && readVs(P(''), ['Sentai']) === null);
const l = { name: 'S0 Week 3 Match 5', opponent: 'Sentai', us: [{ name: 'Piccolo' }], them: [{ name: 'Tien' }] };
check('a lineup search finds the match, the opponent\'s name and either side\'s characters',
  ['week 3', 'sentai squad', 'piccolo', 'tien'].every(q => lineupMatchesQuery(l, q)) && !lineupMatchesQuery(l, 'goku'));
check('a match search finds the match and the opponent\'s name',
  matchMatchesQuery({ fileName: 'Seasons/S0 Week 3 Match 5.json', opponent: 'Sentai' }, 'squad') && !matchMatchesQuery({ fileName: 'x.json', opponent: 'Sentai' }, 'week'));

console.log = log;
if (failures) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log('\nAll Team page checks passed.');
