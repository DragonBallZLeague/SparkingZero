/**
 * Checks the Matches list and the Match page's data on real data:
 * pages/matches/matchRows.js and utils/matchRecord.js.
 *
 * WHY THIS EXISTS
 *
 * The Match page reads a match file on its own (readMatch), apart from the
 * aggregation behind every other page, so the two could quietly disagree: a
 * lineup in the wrong order, the wrong side marked the winner, a fusion split
 * applied differently, a match missing from the list. So each is checked
 * against the character aggregation (what the Character and Team pages show),
 * over the default scope and everything:
 *
 *   1. Every match in scope is listed once, newest first.
 *   2. Each side's lineup is in slot order, and each slot is the character the
 *      aggregation has there, with the same result.
 *   3. Each character's damage, taken and HP on the Match page are the
 *      aggregation's for that match - fusion splits included - and the team
 *      totals add up.
 *   4. Every row's link resolves back to its match (utils/matchSlug.js).
 *   5. The search.
 *   6. The forms breakdown, over the raw files: each form once, in order;
 *      the forms add up to the character's WHOLE figures (a fused form's are
 *      the fusion's whole output, by the league's choice); the per-form
 *      counters read the file's own key names; a form that ended in a
 *      fusion shows no HP (its snapshot holds the fusion's); and the figures
 *      the character detail shows for one form add up to the whole.
 *   7. The per-match league reference the character detail places a match in
 *      (utils/matchReference.js, style-baseline.json `perMatch`).
 *
 * Deliberately NOT in prebuild: it aggregates real corpus shards, like
 * verify-team-page. Run it when you change the match pages or match reading.
 *
 * Usage: npm run verify-match-page
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAggregatedCharacterData } from '../src/utils/aggregation/characterAggregation.js';
import { parseCharacterCSV, calculateMatchPerformanceScore, extractStats } from '../src/utils/statCalculations.js';
import { loadCapsuleData } from '../src/utils/capsuleDataProcessor.js';
import { compareMatchTime } from '../src/utils/matchOrder.js';
import { readMatch, battleDataOf } from '../src/utils/matchRecord.js';
import { buildMatchSlugIndex, matchUrlKey, resolveMatchParam } from '../src/utils/matchSlug.js';
import { matchRows, matchRowMatchesQuery } from '../src/pages/matches/matchRows.js';
import { matchForms, sharedFormSnapshots } from '../src/utils/formBreakdown.js';
import { calculatePerFormStats } from '../src/utils/formStatsCalculator.js';
import { MATCH_METRICS, placeInQuantiles, placeMatch } from '../src/utils/matchReference.js';
import baseline from '../src/config/style-baseline.json' with { type: 'json' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const refData = path.resolve(__dirname, '..', '..', '..', 'referencedata');
const aggDir = path.resolve(__dirname, '..', 'public', 'br-aggregates');

let failures = 0;
function check(label, cond, detail) {
  if (cond) { console.log('  ok   ' + label); return; }
  failures++;
  console.error('  FAIL ' + label + (detail ? '\n         ' + detail : ''));
}
const lines = list => list.slice(0, 3).join('\n         ');

const log = console.log;
console.log = (...a) => { if (!String(a[0]).startsWith('[Fusion')) log(...a); };
const charMap = parseCharacterCSV(fs.readFileSync(path.join(refData, 'characters.csv'), 'utf8'));
const capsuleInfo = loadCapsuleData(fs.readFileSync(path.join(refData, 'capsules.csv'), 'utf8'));
const aiStrategies = {};
for (const s of capsuleInfo.aiStrategies || []) if (s.id) aiStrategies[s.id] = s;
const mapsMap = {};
for (const l of fs.readFileSync(path.join(refData, 'maps.csv'), 'utf8').trim().split(/\r?\n/).slice(1)) {
  const [name, id] = l.split(',').map(s => s.trim());
  if (id && name) mapsMap[id] = name;
}

const index = JSON.parse(fs.readFileSync(path.join(aggDir, 'index.json'), 'utf8'));
const all = [];
for (const sh of index.shards) {
  const shard = JSON.parse(fs.readFileSync(path.join(aggDir, sh.slug + '.json'), 'utf8'));
  for (const f of Object.values(shard.files)) all.push({ name: f.name, content: f.content, tags: f.tags || {} });
}
const slugs = buildMatchSlugIndex(all.map(f => f.name));
const urlKeyFor = p => matchUrlKey(p, slugs);

const seasons = [...new Set(all.filter(f => f.tags.matchType === 'Season').map(f => Number(f.tags.seasonNumber)))];
const latest = String(Math.max(...seasons));
const scopes = [
  [`Season ${latest} season matches (the default)`, all.filter(f => String(f.tags.seasonNumber) === latest && f.tags.matchType === 'Season')],
  ['Everything', all],
];

for (const [label, files] of scopes) {
  const rows = matchRows(files, { charMap, mapsMap, urlKeyFor });
  const characters = getAggregatedCharacterData(files, charMap, capsuleInfo.capsuleMap, aiStrategies, mapsMap);
  const byRow = new Map();
  for (const c of characters) for (const m of c.matches || []) byRow.set(`${m.fileName}|${m.side}|${m.slot}`, { name: c.name, ...m });
  log(`\n[${label}: ${files.length} matches]`);

  // 1. Listed once each, newest first.
  const withBattle = files.filter(f => battleDataOf(f.content));
  const listed = new Set(rows.map(r => r.path));
  check(`every match is listed once (${rows.length})`, rows.length === withBattle.length && listed.size === rows.length,
    `${rows.length} rows, ${listed.size} distinct, ${withBattle.length} matches`);
  const outOfOrder = rows.findIndex((r, i) => i && compareMatchTime(rows[i - 1].path, r.path) < 0);
  check('newest first', outOfOrder === -1, outOfOrder > 0 ? `${rows[outOfOrder - 1].name} before ${rows[outOfOrder].name}` : '');

  // 2 and 3, per match.
  const lineupBad = [], resultBad = [], numbersBad = [], totalsBad = [];
  let compared = 0;
  const byPath = new Map(files.map(f => [f.name, f]));
  for (const r of rows) {
    const m = readMatch(byPath.get(r.path).content, { charMap, capsuleMap: capsuleInfo.capsuleMap, aiStrategies, mapsMap });
    for (const s of m.sides) {
      const slots = s.characters.map(c => c.slot);
      if (!slots.every((v, i) => v === i + 1)) lineupBad.push(`${r.name} side ${s.side}: slots ${slots.join(',')}`);
      for (const c of s.characters) {
        const agg = byRow.get(`${r.path}|${s.side}|${c.slot}`);
        if (!c.name || c.name === '-') continue;
        if (!agg) { lineupBad.push(`${r.name} side ${s.side} slot ${c.slot}: ${c.name} is not in the aggregation`); continue; }
        compared++;
        if (agg.name !== c.name) lineupBad.push(`${r.name} side ${s.side} slot ${c.slot}: ${c.name}, the aggregation says ${agg.name}`);
        if (s.won != null && agg.won !== s.won) resultBad.push(`${r.name} side ${s.side}: ${s.won ? 'won' : 'lost'}, the aggregation says ${agg.won ? 'won' : 'lost'}`);
        const apart = ['damageDone', 'damageTaken', 'hPGaugeValue'].filter(k => Math.abs((agg[k] || 0) - (c.stats[k] || 0)) > 1);
        if (apart.length) numbersBad.push(`${r.name} ${c.name}: ${apart.map(k => `${k} ${Math.round(c.stats[k])} vs ${Math.round(agg[k])}`).join(', ')}`);
        if (Math.abs(c.score - calculateMatchPerformanceScore(c.stats)) > 1e-9) numbersBad.push(`${r.name} ${c.name}: score`);
      }
      const sum = s.characters.reduce((n, c) => n + (c.stats.damageDone || 0), 0);
      if (Math.abs(sum - s.totals.damage) > 1) totalsBad.push(`${r.name} side ${s.side}: ${Math.round(sum)} vs ${Math.round(s.totals.damage)}`);
    }
    // The list's summary and the page agree on who played and who won.
    const listLineups = r.sides.map(s => s.lineup.map(c => c.name).join('|')).join(' / ');
    const pageLineups = m.sides.map(s => s.characters.map(c => c.name).join('|')).join(' / ');
    if (listLineups !== pageLineups || r.winner !== m.winner) lineupBad.push(`${r.name}: the list and the page disagree`);
  }
  check('each lineup is in slot order, with the aggregation\'s character in each slot', !lineupBad.length, lines(lineupBad));
  check('each side\'s result is the aggregation\'s', !resultBad.length, lines(resultBad));
  check(`each character's damage, taken and HP are the aggregation's, fusions included (${compared} characters)`, !numbersBad.length, lines(numbersBad));
  check('each side\'s totals add up', !totalsBad.length, lines(totalsBad));

  // 4. Links.
  const lost = rows.filter(r => resolveMatchParam(r.key, slugs) !== r.path);
  check('every row\'s link resolves back to its match', !lost.length, lines(lost.map(r => r.path)));
}

// 6. Forms (utils/formBreakdown.js over formStatsCalculator.js), from the raw
// files: the compact corpus trims the snapshots per-form figures come from.
log('\n[forms, over the raw match files]');
{
  const brDir = path.resolve(__dirname, '..', 'BR_Data');
  const raw = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else if (p.endsWith('.json')) raw.push(p);
    }
  })(brDir);
  const bad = { sum: [], counters: [], fusionHp: [], order: [], formStats: [] };
  let transformed = 0;
  const incomplete = { missing: 0, shared: 0 };
  const numKeys = { zCounterCount: 'zCounter', lightningAttackCount: 'lightningAttack', vanishingAttackCount: 'vanishingAttack',
    dragonHomingCount: 'dragonHoming', speedImpactWins: 'speedImpactWinCount' };
  for (const file of raw) {
    let content;
    try { content = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, '')); } catch { continue; }
    const bd = battleDataOf(content);
    if (!bd) continue;
    const idr = bd.characterIdRecord || {};
    const shared = sharedFormSnapshots(bd.characterRecord);
    for (const [key, rec] of Object.entries(bd.characterRecord)) {
      if (!Array.isArray(rec.formChangeHistory) || !rec.formChangeHistory.length) continue;
      transformed++;
      const where = `${path.basename(file)} ${key}`;
      const { complete, reason, forms } = matchForms(rec, idr, charMap, { shared: shared.has(key) });
      if (forms.length !== rec.formChangeHistory.length + 1) bad.order.push(`${where}: ${forms.length} forms`);
      if (!complete) { incomplete[reason]++; continue; }
      // Every form's figures add up to the character's WHOLE totals (a form
      // shows what it did; only the character's own totals split a fusion).
      const bc = rec.battleCount || {};
      const sum = k => forms.reduce((n, f) => n + f[k], 0);
      const apart = [['damageDone', bc.givenDamage || 0], ['damageTaken', bc.takenDamage || 0], ['kills', bc.killCount || 0]]
        .filter(([k, whole]) => Math.abs(sum(k) - whole) > 1);
      if (apart.length) bad.sum.push(`${where}: ${apart.map(([k, w]) => `${k} ${sum(k)} vs ${w}`).join(', ')}`);
      // The counters formStatsCalculator used to read under names no file has.
      const orig = rec.battlePlayCharacter && rec.battlePlayCharacter.originalCharacter && rec.battlePlayCharacter.originalCharacter.key;
      const per = calculatePerFormStats(rec, idr, rec.formChangeHistory, orig);
      const num = bc.battleNumCount || {};
      const off = Object.entries(numKeys).filter(([k, fileKey]) => per.reduce((n, f) => n + (f[k] || 0), 0) !== (num[fileKey] || 0));
      if (off.length) bad.counters.push(`${where}: ${off.map(([k]) => k).join(', ')}`);
      // A form that ended in a fusion has no HP of its own to show.
      forms.forEach((f, i) => {
        if (forms[i + 1] && forms[i + 1].fusion && f.hpLeft !== null) bad.fusionHp.push(`${where}: ${f.name} shows ${f.hpLeft}`);
      });
      // What the character detail shows for one form (form.stats): its skills,
      // style hits and dash add up to the whole; its best combo, where known,
      // never beats the match's, and the match's best is some form's.
      const whole = extractStats(rec, charMap);
      const statSum = k => forms.reduce((n, f) => n + (f.stats[k] || 0), 0);
      const statOff = ['exa1Count', 'exa2Count', 'rushHits', 'heavyHits', 'shotEnergyBulletCount', 'guardCount', 'tags']
        .filter(k => Math.abs(statSum(k) - (whole[k] || 0)) > 0)
        .concat(Math.abs(statSum('dragonDashMileage') - whole.dragonDashMileage) > forms.length ? ['dragonDashMileage'] : []);
      const combos = forms.map(f => f.stats.maxComboNum).filter(x => x !== null);
      if (combos.some(x => x > whole.maxComboNum) || !combos.includes(whole.maxComboNum)) statOff.push('maxComboNum');
      if (statOff.length) bad.formStats.push(`${where}: ${statOff.join(', ')}`);
    }
  }
  check(`every transformation lists each form once, in order (${transformed})`, !bad.order.length, lines(bad.order));
  check(`each character's forms add up to its whole damage, taken and KOs (${transformed - incomplete.missing - incomplete.shared}; left out: ${incomplete.missing} with no per-form snapshots, ${incomplete.shared} whose snapshots both sides share)`,
    !bad.sum.length, lines(bad.sum));
  check('per-form Z-counters, lightning, vanishing, dragon homing and speed-impact wins add up to the file\'s', !bad.counters.length, lines(bad.counters));
  check('a form that ended in a fusion shows no HP of its own', !bad.fusionHp.length, lines(bad.fusionHp));
  check("one form's figures (the detail's form filter) add up to the whole, and its best combo is the match's where known",
    !bad.formStats.length, lines(bad.formStats));
}

// 7. The per-match league reference (utils/matchReference.js).
log('\n[per-match reference]');
{
  const q = baseline.perMatch && baseline.perMatch.quantiles;
  check('style-baseline.json has a per-match reference for every figure', q && Object.keys(MATCH_METRICS).every(k => q[k] && q[k].length === 21));
  const sorted = Object.values(q || {}).every(arr => arr.every((v, i) => !i || v >= arr[i - 1]));
  check('its quantiles are in order', sorted);
  const d = q.damageDone;
  check('a value places where its quantile is: the median at 50, the ends at 0 and 100, between is between',
    placeInQuantiles(d, d[10]) === 50 && placeInQuantiles(d, -1) === 0 && placeInQuantiles(d, 1e9) === 100
      && placeInQuantiles(d, (d[15] + d[16]) / 2) > 75 && placeInQuantiles(d, (d[15] + d[16]) / 2) < 80);
  check('a value tied across quantiles takes the middle of the tie (no Skill 2 is not the bottom of the league)',
    placeInQuantiles(q.skill2, 0) > 40);
  const placed = placeMatch({ damageDone: d[20], damageTaken: 0, battleTime: 100 }, baseline.perMatch);
  check('damage taken turns, so taking the least is the best', placed.damageTaken.good === 100 && placed.damageDone.good === 100);
}

// 5. Search.
log('\n[search]');
const row = { name: 'S0 Week 3 Match 5', map: 'Hyperbolic Time Chamber',
  sides: [{ tag: 'Sentai', lineup: [{ name: 'Jeice' }] }, { tag: 'Master and Student', lineup: [{ name: 'Piccolo' }] }] };
check('a search finds the match, either team by either name, a character and the map',
  ['week 3', 'sentai squad', 'master & student', 'jeice', 'piccolo', 'hyperbolic'].every(q => matchRowMatchesQuery(row, q)) && !matchRowMatchesQuery(row, 'goku'));

console.log = log;
if (failures) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log('\nAll Match page checks passed.');
