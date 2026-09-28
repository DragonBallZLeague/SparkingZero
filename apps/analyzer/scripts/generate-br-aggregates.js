/**
 * Builds the compact match corpus the Analyzer loads at runtime.
 *
 * Why this exists (see docs/ANALYZER_REDESIGN_PLAN.md, Phase 1.5): the app used to
 * fetch every file in BR_Data/ individually - ~2,200 requests and ~67 MB on page
 * load. This script emits the same matches with every field no consumer reads
 * stripped out, sharded by folder so a season- or team-scoped view fetches one
 * small file instead of thousands of large ones.
 *
 * The output deliberately preserves the ORIGINAL JSON SHAPE
 * (TeamBattleResults.battleResult.characterRecord / characterIdRecord). That lets
 * src/utils/aggregation/* and statCalculations.js consume a shard with no code
 * changes at all, which matters because that math has no test suite. Shards are
 * verified field-by-field against the raw files by scripts/verify-br-aggregates.mjs.
 *
 * Run order: after generate-br-data-tags.js (see package.json "prebuild").
 */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

// The move-code classifier is an ES module shared with the app (extractStats), so
// both sides classify hits identically. Loaded in main() - see below.
let styleHitsOf = null;

const brDataDir = path.resolve(__dirname, '..', 'BR_Data');
const outDir = path.resolve(__dirname, '..', 'public', 'br-aggregates');

/**
 * Bump when the emitted shape changes so the client can reject a stale corpus.
 * v2: attackHitCount is replaced by pre-summed `styleHits` (rush / heavy / ki-blast
 * hits), and the synthetic speed-impact sum is gone with extractStats' fallback.
 */
const CORPUS_VERSION = 2;

// ---------------------------------------------------------------------------
// Keep-lists. A field is here because some consumer reads it - see the field
// audit in docs/ANALYZER_REDESIGN_PLAN.md. Adding a reader of a NEW raw field
// means adding it here too, or it will silently read undefined from a shard.
// ---------------------------------------------------------------------------

// Read by extractStats() in src/utils/statCalculations.js.
const PLAY_KEYS = [
  'character',
  'originalCharacter',
  'hPGaugeValue',
  'hPGaugeValueMax',
];

// Scalars kept as cheap insurance for the fusion / per-form logic in
// fusionSplit.js and formStatsCalculator.js. A few bytes each.
const PLAY_KEYS_EXTRA = [
  'bFusionPotara',
  'bKnockDown',
  'bRingOut',
];

// Read directly off battleCount. battleNumCount is kept whole (27 small ints).
const COUNT_KEYS = [
  'givenDamage',
  'takenDamage',
  'battleTime',
  'killCount',
  'maxComboNum',
  'maxComboDamage',
  'dragonDashMileage',
];

/**
 * Reads a match file regardless of encoding. Submitted BR_Data files are
 * sometimes UTF-16 LE or carry a UTF-8 BOM; scripts/fix-json-encoding.js
 * normalises them in CI, but this script also runs locally before that has
 * happened, and silently skipping those files would drop real matches (the
 * Season 0 playoffs among them).
 */
function readMatchJson(absPath) {
  const buffer = fs.readFileSync(absPath);
  let text;
  if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
    text = buffer.toString('utf16le');
  } else if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    text = buffer.toString('utf8').slice(1);
  } else {
    text = buffer.toString('utf8');
  }
  return { text, bytes: buffer.length, parsed: JSON.parse(text.replace(/^﻿/, '')) };
}

function sumMatching(dict, predicate) {
  let total = 0;
  for (const [key, value] of Object.entries(dict || {})) {
    if (typeof value === 'number' && predicate(key)) total += value;
  }
  return total;
}

/**
 * runBlastCount and attackHitCount are the single largest thing in a character
 * entry (~560 of ~2,730 bytes), and extractStats only ever reads them summed, so
 * they are pre-summed here:
 *
 * - runBlastCount becomes a synthetic dict whose keys still satisfy extractStats'
 *   includes() checks (SPM1 / SPM2 / EXA1 / EXA2).
 * - attackHitCount (~230 per-move codes) becomes `styleHits`: hits landed by
 *   fighting style, classified by src/utils/actionCodes.js - the same function
 *   extractStats applies to a raw file, so both give an identical result.
 *
 * Omitted when zero, which extractStats reads as zero either way.
 */
function compactBlastCounts(battleCount) {
  const runBlast = battleCount.runBlastCount || {};

  const spm1 = sumMatching(runBlast, k => k.includes('SPM1'));
  const spm2 = sumMatching(runBlast, k => k.includes('SPM2') || k.includes('SPM3'));
  const exa1 = sumMatching(runBlast, k => k.includes('EXA1'));
  const exa2 = sumMatching(runBlast, k => k.includes('EXA2'));
  const hits = styleHitsOf(battleCount.attackHitCount);

  const out = {};
  const synthesizedRunBlast = {};
  if (spm1) synthesizedRunBlast.SPM1 = spm1;
  if (spm2) synthesizedRunBlast.SPM2 = spm2;
  if (exa1) synthesizedRunBlast.EXA1 = exa1;
  if (exa2) synthesizedRunBlast.EXA2 = exa2;
  if (Object.keys(synthesizedRunBlast).length) out.runBlastCount = synthesizedRunBlast;
  if (hits.rush || hits.heavy || hits.kiblast) out.styleHits = hits;
  return out;
}

/**
 * Compacts one character entry. Used for both characterRecord entries and
 * characterIdRecord entries - they share a shape (battlePlayCharacter /
 * battleCount / additionalCounts / formChangeHistory).
 */
function compactCharacterEntry(entry) {
  if (!entry || typeof entry !== 'object') return entry;
  const out = {};

  const play = entry.battlePlayCharacter;
  if (play) {
    const slimPlay = {};
    for (const key of PLAY_KEYS) {
      if (play[key] !== undefined) slimPlay[key] = play[key];
    }
    for (const key of PLAY_KEYS_EXTRA) {
      if (play[key] !== undefined) slimPlay[key] = play[key];
    }
    // equipItem drives both capsule resolution and AI-strategy lookup, but only
    // the `key` of each item is ever read.
    if (Array.isArray(play.equipItem)) {
      slimPlay.equipItem = play.equipItem
        .filter(item => item && item.key)
        .map(item => ({ key: item.key }));
    }
    out.battlePlayCharacter = slimPlay;
  }

  const count = entry.battleCount;
  if (count) {
    const slimCount = {};
    for (const key of COUNT_KEYS) {
      if (count[key] !== undefined) slimCount[key] = count[key];
    }
    if (count.battleNumCount) slimCount.battleNumCount = count.battleNumCount;
    Object.assign(slimCount, compactBlastCounts(count));
    out.battleCount = slimCount;
  }

  if (entry.additionalCounts !== undefined) out.additionalCounts = entry.additionalCounts;
  if (entry.formChangeHistory !== undefined) out.formChangeHistory = entry.formChangeHistory;

  return out;
}

function compactRecordMap(record) {
  if (!record || typeof record !== 'object') return record;
  const out = {};
  for (const [slot, entry] of Object.entries(record)) {
    out[slot] = compactCharacterEntry(entry);
  }
  return out;
}

/** Produces the compacted equivalent of one match file's `content`. */
function compactMatch(content) {
  const tbr = content && content.TeamBattleResults;
  if (!tbr) return null;
  const battleResult = tbr.battleResult || tbr.BattleResults;
  if (!battleResult || !battleResult.characterRecord) return null;

  const slimResult = {
    battleWinLose: battleResult.battleWinLose,
    characterRecord: compactRecordMap(battleResult.characterRecord),
  };
  if (battleResult.characterIdRecord && Object.keys(battleResult.characterIdRecord).length) {
    slimResult.characterIdRecord = compactRecordMap(battleResult.characterIdRecord);
  }
  if (battleResult.originalMap) slimResult.originalMap = battleResult.originalMap;

  return { TeamBattleResults: { teams: tbr.teams, battleResult: slimResult } };
}

// ---------------------------------------------------------------------------
// Sharding: one shard per BR_Data/<Top>/<Sub> folder, which is how users filter
// (a season, an event, or one team's tests). A season-scoped default therefore
// costs a single small fetch.
// ---------------------------------------------------------------------------

function shardSlug(topFolder, subFolder) {
  return (topFolder + '__' + subFolder)
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function naturalCompare(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function collectMatchFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const top of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!top.isDirectory()) continue;
    const topPath = path.join(dir, top.name);
    for (const sub of fs.readdirSync(topPath, { withFileTypes: true })) {
      if (!sub.isDirectory()) continue;
      const subPath = path.join(topPath, sub.name);
      const files = fs.readdirSync(subPath, { withFileTypes: true })
        .filter(f => f.isFile() && f.name.toLowerCase().endsWith('.json'))
        .map(f => f.name)
        .sort(naturalCompare);
      if (files.length) results.push({ topFolder: top.name, subFolder: sub.name, files });
    }
  }
  return results;
}

async function main() {
  // A dynamic import rather than require(): the classifier is an ES module, and
  // import() loads one from CommonJS on every Node version this repo runs.
  ({ styleHits: styleHitsOf } = await import(pathToFileURL(path.join(__dirname, '..', 'src', 'utils', 'actionCodes.js')).href));

  const groups = collectMatchFiles(brDataDir);
  if (!groups.length) {
    console.error('generate-br-aggregates: no match folders found under', brDataDir);
    process.exit(1);
  }

  // Read the old manifest BEFORE the wipe, so the write at the end can tell
  // whether the corpus actually changed (see the end of this function).
  const indexPath = path.join(outDir, 'index.json');
  const previous = fs.existsSync(indexPath)
    ? (() => { try { return JSON.parse(fs.readFileSync(indexPath, 'utf8')); } catch { return null; } })()
    : null;

  // Wiping is deliberate: it clears out shards for folders that have since been
  // renamed or removed, which would otherwise linger and be served forever.
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const manifest = { version: CORPUS_VERSION, generated: new Date().toISOString(), shards: [] };
  let totalMatches = 0;
  let totalSkipped = 0;
  let rawBytes = 0;

  for (const group of groups) {
    const slug = shardSlug(group.topFolder, group.subFolder);
    const entries = [];
    // `seq` orders matches within a shard so trend-over-time views have a stable
    // axis. BR_Data files carry no date, so natural filename order is the axis.
    let seq = 0;

    for (const fileName of group.files) {
      const absPath = path.join(brDataDir, group.topFolder, group.subFolder, fileName);
      let parsed;
      try {
        const read = readMatchJson(absPath);
        rawBytes += read.bytes;
        parsed = read.parsed;
      } catch (err) {
        console.warn('generate-br-aggregates: skipping unreadable ' + fileName + ': ' + err.message);
        totalSkipped++;
        continue;
      }

      const content = compactMatch(parsed);
      if (!content) {
        console.warn('generate-br-aggregates: skipping ' + fileName + ' (no characterRecord)');
        totalSkipped++;
        continue;
      }

      // `name` is the relative path, matching br-data-tags.json keys, the
      // BRDataSelector tree ids, and the match-id scheme in src/routes.js.
      entries.push({
        name: group.topFolder + '/' + group.subFolder + '/' + fileName,
        seq: seq++,
        tags: parsed.tags || null,
        content,
      });
      totalMatches++;
    }

    if (!entries.length) continue;

    const shardFile = path.join(outDir, slug + '.json');
    const payload = {
      version: CORPUS_VERSION,
      shard: slug,
      topFolder: group.topFolder,
      subFolder: group.subFolder,
      files: entries,
    };
    fs.writeFileSync(shardFile, JSON.stringify(payload), 'utf8');

    manifest.shards.push({
      slug,
      topFolder: group.topFolder,
      subFolder: group.subFolder,
      matchCount: entries.length,
      bytes: fs.statSync(shardFile).size,
    });
  }

  manifest.shards.sort((a, b) => naturalCompare(a.slug, b.slug));
  manifest.totalMatches = totalMatches;

  // Carry the old timestamp forward when the corpus has not actually changed.
  //
  // `generated` is a timestamp, so a fresh one on every run left this file dirty
  // in git after every single build even when not one match had changed. That
  // churn is pure noise: it makes `git status` useless for seeing real work and
  // it blocks a checkout for no reason. Nothing downstream reads `generated`, so
  // if the manifest matches in every other respect, reusing the old value makes
  // the output byte-identical and git stays quiet. The file is still always
  // written, because the wipe above deleted it.
  const sameCorpus = previous &&
    JSON.stringify({ ...previous, generated: null }) ===
    JSON.stringify({ ...manifest, generated: null });
  if (sameCorpus) manifest.generated = previous.generated;
  fs.writeFileSync(indexPath, JSON.stringify(manifest, null, 2), 'utf8');

  const outBytes = manifest.shards.reduce((sum, s) => sum + s.bytes, 0);
  const mb = n => (n / 1024 / 1024).toFixed(1);
  console.log('generate-br-aggregates: ' + totalMatches + ' matches across ' + manifest.shards.length + ' shards');
  console.log('  raw ' + mb(rawBytes) + ' MB -> compact ' + mb(outBytes) + ' MB (' +
    (rawBytes / outBytes).toFixed(1) + 'x smaller)');
  if (totalSkipped) console.log('  skipped ' + totalSkipped + ' file(s)');
}

main().catch(err => {
  console.error('generate-br-aggregates: ' + (err && err.stack || err));
  process.exit(1);
});
