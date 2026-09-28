// Real data for the Overview demo, over the same basis as the frozen tier cutoffs
// (last 2 seasons, Ultra only).
//
//  - Style/volume numbers come from the app's own extractStats over the raw files,
//    plus the attackHitCount classification agreed with the user.
//  - Performance scores come from the app's OWN aggregation: getAggregatedCharacterData
//    for a character, and filterAggregatedData with a build filter for each build -
//    the exact path the leaderboard's build filter takes - so no score here is a
//    re-derivation.
//  - A build is the leaderboard's definition: exact capsule set + AI strategy.
import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';

// Paths resolve from this file: apps/analyzer/design/character-overview/ -> apps/analyzer.
const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const REF = path.resolve(APP, '..', '..', 'referencedata');
const imp = p => import(pathToFileURL(path.join(APP, p)).href);
const { extractStats, parseCharacterCSV } = await imp('src/utils/statCalculations.js');
const { loadCapsuleData } = await imp('src/utils/capsuleDataProcessor.js');
const { getAggregatedCharacterData } = await imp('src/utils/aggregation/characterAggregation.js');
const { filterAggregatedData } = await imp('src/utils/aggregation/filterAggregated.js');
const { tierForScore, isProvisionalTier, TIERS } = await imp('src/utils/performanceTier.js');
const { tierPlateSvg, tierPillColors, TIER_ART } = await imp('src/utils/tierPlateSvg.js');

const charMap = parseCharacterCSV(fs.readFileSync(path.join(REF, 'characters.csv'), 'utf8'));
const capsuleInfo = loadCapsuleData(fs.readFileSync(path.join(REF, 'capsules.csv'), 'utf8'));
const aiMap = {};
for (const s of capsuleInfo.aiStrategies || []) if (s.id) aiMap[s.id] = s;
const tags = JSON.parse(fs.readFileSync(path.join(APP, 'public/br-data-tags.json'), 'utf8'));
const inBasis = tg => tg && tg.difficulty === 'Ultra' && ['0', '1'].includes(String(tg.seasonNumber));

// ---- action classification (attackHitCount codes) ---------------------------
const code = k => (/Key="act(.*)"/.exec(k) || [])[1] || k;
const CLASSES = [
  ['rush',     /^A?RSH[AB]\d$/],
  ['heavy',    /^(SC[NFP]|A?HF[NFP]|FLKF?|RW[NFP]|RH[NPF][LR]|GS[NFP]|LF[NFP]|MSA[NFP]|BSA|VAS[NF]|VAA[DMLRU]|LTA(C|FT|OT)|DDA[LRDUM][NP]|(A|D|STD)?SM(?!B).*)$/],
  ['super',    /^SPM/],
  ['ultimate', /^ULT/],
  ['skill',    /^EXA/],
  // Ki blasts: RSB = rush ki blasts (the volley), SMB = smash ki blasts (the charged kind,
  // SMBN neutral), with dash / jump / step variants.
  ['kiblast',  /^(D?RSB|JRB|JSB[NFP]?|(D|STD)?SMB[NFP]?)$/],
  ['throw',    /^(TRW|DTW)/],
  ['counter',  /^(ZCB|ZCO|RVC|SZC)/],
  ['impact',   /^(SPF|CRF)/],
  ['reaction', /^BLW/],
  ['movement', /^(DDS|RI.*)$/],
];
const classify = c => (CLASSES.find(([, re]) => re.test(c)) || ['unknown'])[0];

function readJson(f) {
  const b = fs.readFileSync(f);
  const t = b[0] === 0xFF && b[1] === 0xFE ? b.toString('utf16le') : b.toString('utf8');
  return JSON.parse(t.replace(/^\uFEFF/, ''));
}
const aiNameOf = s => typeof s.aiStrategy === 'string' ? s.aiStrategy : (s.aiStrategy?.name || 'Default');
// Same key the leaderboard's build filter uses (BuildTableView / filterAggregated).
const buildKeyOf = s => `${(s.equippedCapsules || []).map(c => c.name || c.id || '').sort().join(',')}|${aiNameOf(s)}`;

const blank = () => ({
  n: 0, active: 0, t: 0, dealt: 0, taken: 0, survived: 0, tags: 0,
  s1: 0, s1h: 0, s2: 0, s2h: 0, ult: 0, ulth: 0, exa1: 0, exa2: 0,
  rush: 0, heavy: 0, kiHit: 0, ki: 0, sup: 0, ultCast: 0, guard: 0, counter: 0, deflect: 0,
  ai: {}, builds: {},
});
function add(a, s, bc, hits) {
  const n = bc.battleNumCount || {};
  a.n++; a.t += s.battleTime; a.dealt += s.damageDone; a.taken += s.damageTaken;
  if (s.battleTime > 0) a.active++;
  if (s.hPGaugeValue > 0 && s.battleTime > 0) a.survived++;
  a.tags += s.tags || 0;
  a.s1 += s.s1Blast || 0; a.s1h += s.s1HitBlast || 0;
  a.s2 += s.s2Blast || 0; a.s2h += s.s2HitBlast || 0;
  a.ult += s.ultBlast || 0; a.ulth += s.uLTHitBlast || 0;
  // Skills come from runBlastCount's EXA1/EXA2, NOT battleNumCount.eXACount: in Season 1
  // files eXACount runs ~12x its Season 0 rate (every other counter stays within
  // 0.7-1.4x) and exceeds what skill stocks allow, while EXA1/EXA2 hold steady.
  a.exa1 += s.exa1Count || 0; a.exa2 += s.exa2Count || 0;
  a.rush += hits.rush; a.heavy += hits.heavy; a.kiHit += hits.kiblast;
  a.ki += n.shotEnergyBulletCount || 0;
  a.sup += n.sPMCount || 0;
  a.ultCast += n.uLTCount || 0;
  a.guard += n.guardCount || 0;
  // Enemy ki blasts this character deflected (verified: never exceeds the opponent's blasts
  // fired in any one-on-one match). A deflected blast that lands is credited as this
  // character's own ki-blast hit, which is why there is no ki-blast hit rate.
  a.deflect += n.reflectEnergyBulletCount || 0;
  a.counter += (n.superCounterCount || 0) + (n.zCounter || 0) + (n.revengeCounter || 0);
  const ai = aiNameOf(s);
  a.ai[ai] = (a.ai[ai] || 0) + 1;
}

const chars = {};
const volume = {};
const unknownCodes = {};
let matches = 0;
for (const [rel, tg] of Object.entries(tags)) {
  if (!inBasis(tg)) continue;
  let j; try { j = readJson(path.join(APP, 'BR_Data', rel)); } catch { continue; }
  const br = j?.TeamBattleResults?.battleResult; if (!br?.characterRecord) continue;
  matches++;
  for (const c of Object.values(br.characterRecord)) {
    const bc = c?.battleCount; if (!bc) continue;
    const s = extractStats(c, charMap, capsuleInfo.capsuleMap, null, aiMap);
    const id = c.battlePlayCharacter?.originalCharacter?.key || c.battlePlayCharacter?.character?.key;
    const hits = { rush: 0, heavy: 0, kiblast: 0 };
    for (const [k, v] of Object.entries(bc.attackHitCount || {})) {
      const cc = code(k), cls = classify(cc);
      volume[cls] = (volume[cls] || 0) + v;
      if (cls === 'unknown') unknownCodes[cc] = (unknownCodes[cc] || 0) + v;
      if (cls in hits) hits[cls] += v;
    }
    const ch = chars[id] ??= { id, name: s.name, ...blank() };
    add(ch, s, bc, hits);
    const key = buildKeyOf(s);
    const b = ch.builds[key] ??= {
      key, label: s.buildComposition?.label || 'No Build', cost: s.totalCapsuleCost, aiName: aiNameOf(s),
      capsules: (s.equippedCapsules || []).map(x => ({ name: x.name, cost: x.capsule.cost || 0, type: (x.capsule.buildType || '').toLowerCase() })),
      ...blank(),
    };
    add(b, s, bc, hits);
  }
}

// Per-match figures are per match the character actually fought in (battle time > 0),
// the same denominator the app's aggregation uses.
function derive(a) {
  const min = a.t / 60, act = a.active || a.n;
  const aiSorted = Object.entries(a.ai).sort((x, y) => y[1] - x[1]);
  const [aiName, aiCount] = aiSorted[0];
  return {
    matches: a.n, active: a.active,
    avgDealt: a.dealt / act, avgTaken: a.taken / act,
    efficiency: a.taken ? Math.min(5, a.dealt / a.taken) : 0, dps: a.t ? a.dealt / a.t : 0, avgTime: a.t / act,
    blasts: { s1: [a.s1h / act, a.s1 / act], s2: [a.s2h / act, a.s2 / act], ult: [a.ulth / act, a.ult / act] },
    blastTotals: { s1: a.s1, s2: a.s2, ult: a.ult },
    kiBlasts: [a.kiHit / act, a.ki / act],
    skills: { s1: a.exa1 / act, s2: a.exa2 / act },
    rate: {
      melee: (a.rush + a.heavy) / min, rush: a.rush / min, heavy: a.heavy / min,
      ki: a.ki / min, blast: a.sup / min, s1: a.s1 / min, s2: a.s2 / min,
      ult: a.ultCast / min, skill: (a.exa1 + a.exa2) / min, sk1: a.exa1 / min, sk2: a.exa2 / min,
      guard: a.guard / min, counter: a.counter / min, deflect: a.deflect / min,
    },
    survival: a.active ? a.survived / a.active : 0,
    tagsPerMatch: a.tags / act,
    ai: { name: aiName, share: aiCount / a.n, tied: aiSorted.length > 1 && aiSorted[1][1] === aiCount, strategies: aiSorted.length },
  };
}

const POOL_MIN = 5;
const pool = Object.values(chars).filter(a => a.n >= POOL_MIN && a.t > 0);
const rows = pool.map(a => ({ id: a.id, name: a.name, ...derive(a), _src: a }));

// ---- the frozen baseline (character rows only) --------------------------------
const metric = {
  avgDealt: r => r.avgDealt, avgTaken: r => r.avgTaken, efficiency: r => r.efficiency, dps: r => r.dps, avgTime: r => r.avgTime,
  s1Rate: r => r.blasts.s1[1] ? r.blasts.s1[0] / r.blasts.s1[1] : null,
  s2Rate: r => r.blasts.s2[1] ? r.blasts.s2[0] / r.blasts.s2[1] : null,
  ultRate: r => r.blasts.ult[1] ? r.blasts.ult[0] / r.blasts.ult[1] : null,
  kiRate: r => r.kiBlasts[1] ? r.kiBlasts[0] / r.kiBlasts[1] : null,
  // Volume per match, for the cards' league comparison.
  s1Thrown: r => r.blasts.s1[1], s2Thrown: r => r.blasts.s2[1], ultThrown: r => r.blasts.ult[1], kiFired: r => r.kiBlasts[1],
  skill1: r => r.skills.s1, skill2: r => r.skills.s2,
  survival: r => r.survival, tags: r => r.tagsPerMatch,
  ...Object.fromEntries(['melee', 'rush', 'heavy', 'ki', 'blast', 's1', 's2', 'ult', 'skill', 'sk1', 'sk2', 'guard', 'counter', 'deflect'].map(k => ['r_' + k, r => r.rate[k]])),
};
const baseline = {};
for (const [k, f] of Object.entries(metric)) baseline[k] = rows.map(f).filter(v => v !== null && Number.isFinite(v)).sort((a, b) => a - b);
const pctile = (arr, v) => {
  if (v === null || v === undefined || !Number.isFinite(v) || !arr.length) return null;
  let lo = 0, eq = 0;
  for (const x of arr) { if (x < v) lo++; else if (x === v) eq++; }
  return Math.round(100 * (lo + eq / 2) / arr.length);
};
// Defensive Fighter: guards first, then counters; time on field and tags loosely;
// survival barely, since it mostly reflects position and the team winning.
const DEF_WEIGHTS = { r_guard: 0.40, r_counter: 0.30, avgTime: 0.15, tags: 0.10, survival: 0.05 };
// Leaderboard-style rank: 1 + how many baseline characters are strictly better. Better
// means more, except damage taken, where less is better. Ties share a rank. A build is
// ranked against the same characters: where it would place among them.
const LOWER_IS_BETTER = new Set(['avgTaken']);
const rankIn = (arr, v, lower = false) => (v === null || v === undefined || !Number.isFinite(v))
  ? null : 1 + arr.filter(x => (lower ? x < v : x > v)).length;
const place = r => {
  r.pct = Object.fromEntries(Object.entries(metric).map(([k, f]) => [k, pctile(baseline[k], f(r))]));
  r.rank = Object.fromEntries(Object.entries(metric).map(([k, f]) => [k, rankIn(baseline[k], f(r), LOWER_IS_BETTER.has(k))]));
  r.defenseRaw = Object.entries(DEF_WEIGHTS).reduce((s, [k, w]) => s + w * (r.pct[k] ?? 50), 0);
};
rows.forEach(place);
const defArr = rows.map(r => r.defenseRaw).sort((a, b) => a - b);
const finish = r => {
  r.pct.style_defense = pctile(defArr, r.defenseRaw);
  r.rank.style_defense = rankIn(defArr, r.defenseRaw);
  for (const k of ['melee', 'ki', 'blast', 'ult', 'skill']) {
    r.pct['style_' + k] = r.pct['r_' + k];
    r.rank['style_' + k] = r.rank['r_' + k];
  }
};
rows.forEach(finish);

// ---- scores, from the app's own aggregation -----------------------------------
const aggDir = path.join(APP, 'public', 'br-aggregates');
const wanted = new Set(Object.entries(tags).filter(([, v]) => inBasis(v)).map(([k]) => k));
const files = [];
for (const f of fs.readdirSync(aggDir)) {
  if (f === 'index.json' || !f.endsWith('.json')) continue;
  const shard = JSON.parse(fs.readFileSync(path.join(aggDir, f), 'utf8'));
  for (const rec of Object.values(shard.files || {})) if (wanted.has(rec.name)) files.push({ name: rec.name, content: rec.content });
}
const appRows = getAggregatedCharacterData(files, charMap, capsuleInfo.capsuleMap, aiMap, {});
const appByName = Object.fromEntries(appRows.map(r => [r.name, r]));
const scoreOf = (row, appRow) => {
  row.score = appRow?.combatPerformanceScore ?? null;
  row.tier = tierForScore(row.score);
  row.provisional = isProvisionalTier(appRow || 0);
};

const pick = ['Dyspo', 'Frieza (Super)', 'Android 13', 'Goku (Z - End) Super Saiyan', 'Super Buu (Gotenks Absorbed)', 'Cooler Final Form', 'Hit', 'Broly (Super) Super Saiyan'];
const leader = k => [...rows].filter(r => r.matches >= 20).sort((x, y) => y.pct[k] - x.pct[k] || y.matches - x.matches)[0];
const extra = [leader('style_defense'), leader('style_ult'), leader('style_skill')].filter(r => !pick.includes(r.name)).map(r => r.name);
const chosen = [...new Set([...pick, ...extra])].map(n => rows.find(r => r.name === n)).filter(Boolean);

const checks = [];
for (const r of chosen) {
  const app = appByName[r.name];
  if (!app) { checks.push(`MISSING app row for ${r.name}`); continue; }
  scoreOf(r, app);
  checks.push(`${r.name.padEnd(30)} dealt ${Math.round(r.avgDealt)} vs app ${app.avgDamage} | eff ${r.efficiency.toFixed(2)} vs ${app.efficiency} | dps ${r.dps.toFixed(1)} vs ${app.dps} | score ${r.score} ${r.tier}${r.provisional ? ' (prov)' : ''}`);
  r.builds = Object.values(r._src.builds).sort((x, y) => y.n - x.n).map(b => {
    const d = { key: b.key, label: b.label, cost: b.cost, aiName: b.aiName, capsules: b.capsules, ...derive(b) };
    place(d); finish(d);
    // The leaderboard's own build filter, applied to the app's own character row.
    const [fr] = filterAggregatedData([app], { activeBuildFilters: { [app.name]: b.key }, charMap });
    scoreOf(d, fr);
    if (!fr || fr.matchCount !== b.n) checks.push(`  BUILD COUNT MISMATCH ${r.name}: mine ${b.n} vs app ${fr?.matchCount} for ${b.key}`);
    return d;
  });
  r.buildCount = r.builds.length;
}
for (const r of rows) delete r._src;

// Tier artwork from the app's own string builder, one per tier x provisional.
const plates = {};
for (const t of TIERS) for (const prov of [false, true]) {
  plates[t + (prov ? 'p' : '')] = tierPlateSvg(t, { size: 'large', provisional: prov, idPrefix: `demo-${t}${prov ? 'p' : ''}` });
}
const pills = Object.fromEntries(TIERS.map(t => [t, tierPillColors(t)]));

const median = k => baseline[k][Math.floor(baseline[k].length / 2)];
const totalHits = Object.values(volume).reduce((a, b) => a + b, 0);
const out = {
  basis: { matches, seasons: ['0', '1'], difficulty: 'Ultra', poolMin: POOL_MIN, characters: rows.length },
  medians: Object.fromEntries(Object.keys(metric).map(k => [k, median(k)])),
  // How many characters each rank is out of (hit rates exclude characters who never threw).
  rankN: { ...Object.fromEntries(Object.keys(metric).map(k => [k, baseline[k].length])), style_defense: defArr.length,
    ...Object.fromEntries(['melee', 'ki', 'blast', 'ult', 'skill'].map(k => ['style_' + k, baseline['r_' + k].length])) },
  // Top of the scale for the skill circles: the league's 95th percentile.
  p95: Object.fromEntries(['skill1', 'skill2', 'kiFired'].map(k => [k, baseline[k][Math.floor(0.95 * (baseline[k].length - 1))]])),
  defWeights: DEF_WEIGHTS,
  // art: the palette the pills derive from, so the page can build a light-mode pill
  // (tierPillColors has no light variant - its light letter colour washes out on white).
  tiers: { plates, pills, art: TIER_ART },
  volume: Object.fromEntries(Object.entries(volume).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, Math.round(1000 * v / totalHits) / 10])),
  characters: chosen,
};
fs.writeFileSync(new URL('./demo-data.json', import.meta.url), JSON.stringify(out));
console.log(checks.join('\n'));
for (const r of chosen) {
  console.log(r.name.padEnd(30), ['melee', 'ki', 'blast', 'ult', 'skill', 'defense'].map(k => k + ':' + r.pct['style_' + k]).join(' '),
    `| ${r.buildCount} builds; scores ${r.builds.slice(0, 4).map(b => `${b.matches}x ${Math.round(b.score)}${b.tier}`).join(', ')}`);
}
console.log('pool', rows.length, 'matches', matches, 'app rows', appRows.length, 'corpus files', files.length, 'bytes', fs.statSync(new URL('./demo-data.json', import.meta.url)).size);
