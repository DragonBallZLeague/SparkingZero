// Real data for the shell demo (tab row, scope bar, Characters table, tier list,
// Meta Builds table). See README.md.
//
// Every number comes from the app's own code, so it matches what the analyzer
// would show for the same scope:
//  - getAggregatedCharacterData + filterAggregatedData for character rows
//    (the leaderboard's path), re-run over each position's matches for the
//    position picker
//  - characterBuilds() for builds (the Character page's path: exact capsules
//    + AI strategy, scored through the leaderboard's own build filter)
//  - tierForScore / isProvisionalTier / tierPlateSvg for tiers and plates
import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(HERE, '..', '..');
const REF = path.resolve(APP, '..', '..', 'referencedata');
const imp = p => import(pathToFileURL(path.join(APP, p)).href);

const { getAggregatedCharacterData } = await imp('src/utils/aggregation/characterAggregation.js');
const { filterAggregatedData } = await imp('src/utils/aggregation/filterAggregated.js');
const { parseCharacterCSV } = await imp('src/utils/statCalculations.js');
const { loadCapsuleData } = await imp('src/utils/capsuleDataProcessor.js');
const { tierForScore, isProvisionalTier, tierMatchCount, TIERS, TIER_LABELS } = await imp('src/utils/performanceTier.js');
const { tierPlateSvg, tierPillColors } = await imp('src/utils/tierPlateSvg.js');
const { buildCharacterSlugIndex } = await imp('src/utils/characterSlug.js');
const { characterBuilds } = await imp('src/pages/character/overview/characterBuilds.js');

// The aggregation logs every fusion split; the demo does not need them.
const log = console.log;
console.log = (...a) => { if (!String(a[0]).startsWith('[Fusion')) log(...a); };

const csv = fs.readFileSync(path.join(REF, 'characters.csv'), 'utf8');
const charMap = parseCharacterCSV(csv);
const slugIndex = buildCharacterSlugIndex(csv);
const nameToId = {};
for (const [id, name] of slugIndex.idToName) if (!(name in nameToId)) nameToId[name] = id;
const capsuleInfo = loadCapsuleData(fs.readFileSync(path.join(REF, 'capsules.csv'), 'utf8'));
const aiMap = {};
for (const s of capsuleInfo.aiStrategies || []) if (s.id) aiMap[s.id] = s;

// ---- the corpus, with its tags ------------------------------------------------
const aggDir = path.join(APP, 'public', 'br-aggregates');
const index = JSON.parse(fs.readFileSync(path.join(aggDir, 'index.json'), 'utf8'));
const all = [];
for (const sh of index.shards) {
  const shard = JSON.parse(fs.readFileSync(path.join(aggDir, sh.slug + '.json'), 'utf8'));
  for (const f of Object.values(shard.files)) all.push({ name: f.name, content: f.content, tags: f.tags || {} });
}

// The Season and Match type chips are multi-select, so every combination of
// values is precomputed. Each is a real tag filter over the corpus, like
// TagFilterSelector's: OR within a chip, AND between chips. A key lists the
// chosen values joined by '+', or 'all' when every value (or none) is chosen.
const SEASON_VALUES = ['0', '1'];
const TYPE_VALUES = ['Season', 'Test', 'Event'];
const POSITIONS = [1, 2, 3];
const subsets = arr => {
  const out = [];
  for (let m = 1; m < 1 << arr.length; m++) out.push(arr.filter((_, i) => m & (1 << i)));
  return out;
};
const keyOf = (sub, full) => (sub.length === full.length ? 'all' : sub.join('+'));

// ---- shared dictionaries ------------------------------------------------------
const chars = [];            // { id, name, slug }
const charIdx = new Map();
function charRef(name) {
  if (charIdx.has(name)) return charIdx.get(name);
  const id = nameToId[name] || null;
  const i = chars.length;
  chars.push({ id, name, slug: id ? slugIndex.idToSlug.get(id) : name });
  charIdx.set(name, i);
  return i;
}
const caps = [];             // { n: name, c: cost, t: type }
const capIdx = new Map();
function capRef(c) {
  const k = c.name + '|' + c.cost + '|' + c.type;
  if (!capIdx.has(k)) { capIdx.set(k, caps.length); caps.push({ n: c.name, c: c.cost, t: c.type }); }
  return capIdx.get(k);
}
const ais = [];
const aiIdx = new Map();
function aiRef(n) {
  if (!aiIdx.has(n)) { aiIdx.set(n, ais.length); ais.push(n); }
  return aiIdx.get(n);
}

const r1 = x => Math.round(x * 10) / 10;
const r2 = x => Math.round(x * 100) / 100;

function charRow(r) {
  const score = r.combatPerformanceScore;
  return {
    c: charRef(r.name),
    n: tierMatchCount(r),
    s: r1(score),
    t: tierForScore(score),
    p: isProvisionalTier(r) ? 1 : 0,
    w: r1(r.winRate || 0),
    dmg: Math.round(r.avgDamage || 0),
    tk: Math.round(r.avgTaken || 0),
    dps: Math.round(r.dps || 0),
    eff: r2(r.efficiency || 0),
    sv: r1(r.survivalRate || 0),
    bt: Math.round(r.avgBattleTime || 0),
    k: r1(r.avgKills || 0),
    hp: r1(r.hpRetention || 0),
    team: r.primaryTeam || '',
  };
}

const scopes = [];
// Combinations that select the same matches (Season 1 has only tests, so
// "Season 1, Tests + Events" is "Season 1, Tests") share one computed scope.
const aliases = {};
const bySignature = new Map();
for (const seasonSub of subsets(SEASON_VALUES)) {
  for (const typeSub of subsets(TYPE_VALUES)) {
    const id = `${keyOf(seasonSub, SEASON_VALUES)}-${keyOf(typeSub, TYPE_VALUES)}`;
    const files = all.filter(f => seasonSub.includes(String(f.tags.seasonNumber)) && typeSub.includes(f.tags.matchType));
    if (!files.length) continue;
    const signature = files.length + ':' + files.map(f => f.name).join('|');
    if (bySignature.has(signature)) { aliases[id] = bySignature.get(signature); continue; }
    bySignature.set(signature, id);
    const t0 = Date.now();
    const rows = getAggregatedCharacterData(files, charMap, capsuleInfo.capsuleMap, aiMap, {});

    // Every combination of positions, re-running the leaderboard filter over
    // just those positions' matches.
    const byPos = { all: filterAggregatedData(rows).map(charRow) };
    for (const posSub of subsets(POSITIONS)) {
      if (posSub.length === POSITIONS.length) continue;
      const posRows = rows
        .map(r => ({ ...r, matches: (r.matches || []).filter(m => posSub.includes(m.position)) }))
        .filter(r => r.matches.length);
      byPos[posSub.join('+')] = filterAggregatedData(posRows).map(charRow);
    }

    const builds = [];
    for (const r of rows) {
      for (const b of characterBuilds(r, charMap)) {
        builds.push({
          c: charRef(r.name),
          u: b.count,
          code: b.code,
          s: b.score == null ? null : r1(b.score),
          t: b.score == null ? 'C' : tierForScore(b.score),
          p: b.provisional ? 1 : 0,
          w: r1(b.row?.winRate || 0),
          dmg: Math.round(b.row?.avgDamage || 0),
          eff: r2(b.row?.efficiency || 0),
          l: b.label,
          k: b.cost,
          a: aiRef(b.aiName),
          x: b.capsules.map(capRef),
        });
      }
    }

    const teams = new Set();
    for (const f of files) for (const t of [].concat(f.tags.team || [])) teams.add(t);
    scopes.push({
      id,
      matches: files.length,
      teams: [...teams].sort(),
      chars: byPos,
      builds,
    });
    log(`${id}: ${files.length} matches, ${byPos.all.length} characters, ${builds.length} builds (${Date.now() - t0} ms)`);
  }
}

// Tier plates, one SVG per tier / size / provisional. The id prefix is the key,
// so reusing a string reuses identical gradient definitions.
const plates = {};
for (const tier of TIERS) {
  for (const size of ['small', 'medium', 'large']) {
    for (const provisional of [false, true]) {
      const key = `${tier}-${size}-${provisional ? 'p' : 'f'}`;
      plates[key] = tierPlateSvg(tier, { size, provisional, idPrefix: 'd' + key.replace(/[^a-z0-9]/gi, '') });
    }
  }
}
const pills = Object.fromEntries(TIERS.map(t => [t, tierPillColors(t, true)]));

const out = {
  generated: new Date().toISOString(),
  defaultScope: '0-Season',
  aliases,
  tiers: TIERS,
  tierLabels: TIER_LABELS,
  plates,
  pills,
  chars,
  caps,
  ais,
  scopes,
};
fs.writeFileSync(path.join(HERE, 'demo-data.json'), JSON.stringify(out));
log(`wrote demo-data.json (${Math.round(fs.statSync(path.join(HERE, 'demo-data.json')).size / 1024)} KB), ${chars.length} characters`);
