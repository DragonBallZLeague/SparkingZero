/**
 * Proves that the compact corpus in public/br-aggregates/ produces byte-identical
 * analysis results to the raw BR_Data/ files it was built from.
 *
 * This exists because generate-br-aggregates.js strips fields from every match,
 * the aggregation math it feeds has no test suite, and a silently dropped field
 * would corrupt published league statistics rather than crash. Run it whenever
 * the generator's keep-lists change.
 *
 * Two independent checks, over every match (no sampling):
 *
 *   1. STRUCTURAL - compares raw vs compact on every field any consumer reads,
 *      including equipItem key order, the battleNumCount subset, and the
 *      pre-summed runBlast/attackHit fallbacks.
 *   2. BEHAVIOURAL - runs the real extractStats() from src/utils/statCalculations.js
 *      over both sides with identical lookup maps and deep-compares its full output.
 *      extractStats is the single source of truth every aggregation consumes, so
 *      identical output there means identical character, team and position stats.
 *
 * ESM (.mjs) because it imports the app's own source directly.
 * Usage: node scripts/verify-br-aggregates.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractStats, parseCharacterCSV } from '../src/utils/statCalculations.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const brDataDir = path.resolve(__dirname, '..', 'BR_Data');
const aggregatesDir = path.resolve(__dirname, '..', 'public', 'br-aggregates');
const refDataDir = path.resolve(__dirname, '..', '..', '..', 'referencedata');

// battleNumCount keys read anywhere in src/ (see the field audit). The generator
// keeps battleNumCount whole, so this list is what the check actually asserts on.
const NUM_COUNT_KEYS = [
  'sPMCount', 'uLTCount', 'eXACount', 'sparkingCount', 'chargeCount', 'guardCount',
  'shotEnergyBulletCount', 'zCounter', 'superCounterCount', 'revengeCounter',
  'throwCount', 'lightningAttack', 'vanishingAttack', 'dragonHoming',
  'speedImpactCount', 'speedImpactWinCount',
];

const COUNT_KEYS = [
  'givenDamage', 'takenDamage', 'battleTime', 'killCount',
  'maxComboNum', 'maxComboDamage', 'dragonDashMileage',
];

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
  return JSON.parse(text.replace(/^﻿/, ''));
}

/**
 * Minimal capsule map built straight from capsules.csv. It does not need to match
 * the app's runtime map exactly - both sides of the comparison use THIS map, so
 * any difference in output is attributable to the compaction, which is the thing
 * under test. Using a real map (rather than {}) is what exercises the equipItem
 * path that the generator rewrites.
 */
function buildCapsuleMap() {
  const csv = fs.readFileSync(path.join(refDataDir, 'capsules.csv'), 'utf8');
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(',').map(h => h.trim());
  const idIdx = header.indexOf('ID');
  const nameIdx = header.indexOf('Item Names');
  const typeIdx = header.indexOf('Type');
  const costIdx = header.indexOf('Cost');
  const map = {};
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',');
    const id = (cells[idIdx] || '').trim();
    if (!id) continue;
    map[id] = {
      name: (cells[nameIdx] || '').trim(),
      buildType: (cells[typeIdx] || '').trim(),
      cost: parseFloat(cells[costIdx]) || 0,
    };
  }
  return map;
}

function sumMatching(dict, predicate) {
  let total = 0;
  for (const [key, value] of Object.entries(dict || {})) {
    if (typeof value === 'number' && predicate(key)) total += value;
  }
  return total;
}

function equipKeys(entry) {
  const items = entry?.battlePlayCharacter?.equipItem;
  if (!Array.isArray(items)) return null;
  return items.filter(i => i && i.key).map(i => i.key);
}

const problems = [];
function fail(matchName, slot, detail) {
  if (problems.length < 40) problems.push(`${matchName} [${slot}] ${detail}`);
}

/** Field-level comparison of one character entry (characterRecord or characterIdRecord). */
function checkEntry(matchName, slot, rawEntry, compactEntry) {
  if (!rawEntry || !compactEntry) {
    if (rawEntry !== compactEntry) fail(matchName, slot, 'entry presence differs');
    return;
  }
  const rawPlay = rawEntry.battlePlayCharacter || {};
  const cmpPlay = compactEntry.battlePlayCharacter || {};

  for (const key of ['hPGaugeValue', 'hPGaugeValueMax']) {
    if ((rawPlay[key] ?? null) !== (cmpPlay[key] ?? null)) {
      fail(matchName, slot, `battlePlayCharacter.${key} ${rawPlay[key]} != ${cmpPlay[key]}`);
    }
  }
  for (const key of ['character', 'originalCharacter']) {
    if ((rawPlay[key]?.key ?? null) !== (cmpPlay[key]?.key ?? null)) {
      fail(matchName, slot, `${key}.key ${rawPlay[key]?.key} != ${cmpPlay[key]?.key}`);
    }
  }

  // equipItem order matters: extractStats picks the FIRST matching AI strategy.
  const rawEquip = equipKeys(rawEntry);
  const cmpEquip = equipKeys(compactEntry);
  if (JSON.stringify(rawEquip) !== JSON.stringify(cmpEquip)) {
    fail(matchName, slot, 'equipItem keys differ');
  }

  const rawCount = rawEntry.battleCount || {};
  const cmpCount = compactEntry.battleCount || {};
  for (const key of COUNT_KEYS) {
    if ((rawCount[key] ?? null) !== (cmpCount[key] ?? null)) {
      fail(matchName, slot, `battleCount.${key} ${rawCount[key]} != ${cmpCount[key]}`);
    }
  }
  const rawNum = rawCount.battleNumCount || {};
  const cmpNum = cmpCount.battleNumCount || {};
  for (const key of NUM_COUNT_KEYS) {
    if ((rawNum[key] ?? null) !== (cmpNum[key] ?? null)) {
      fail(matchName, slot, `battleNumCount.${key} ${rawNum[key]} != ${cmpNum[key]}`);
    }
  }

  // The pre-summed fallbacks must reproduce the raw totals exactly.
  const checks = [
    ['SPM1', k => k.includes('SPM1'), rawCount.runBlastCount, cmpCount.runBlastCount],
    ['SPM2', k => k.includes('SPM2') || k.includes('SPM3'), rawCount.runBlastCount, cmpCount.runBlastCount],
    ['EXA1', k => k.includes('EXA1'), rawCount.runBlastCount, cmpCount.runBlastCount],
    ['EXA2', k => k.includes('EXA2'), rawCount.runBlastCount, cmpCount.runBlastCount],
    ['speedImpact', k => k.includes('actSPIMPO') || k.includes('actRI'), rawCount.attackHitCount, cmpCount.attackHitCount],
  ];
  for (const [label, predicate, rawDict, cmpDict] of checks) {
    const a = sumMatching(rawDict, predicate);
    const b = sumMatching(cmpDict, predicate);
    if (a !== b) fail(matchName, slot, `${label} fallback sum ${a} != ${b}`);
  }

  if (JSON.stringify(rawEntry.additionalCounts ?? null) !== JSON.stringify(compactEntry.additionalCounts ?? null)) {
    fail(matchName, slot, 'additionalCounts differ');
  }
  if (JSON.stringify(rawEntry.formChangeHistory ?? null) !== JSON.stringify(compactEntry.formChangeHistory ?? null)) {
    fail(matchName, slot, 'formChangeHistory differ');
  }
}

/** Runs the real extractStats over both sides and deep-compares the whole result. */
function checkExtractStats(matchName, slot, rawEntry, compactEntry, charMap, capsuleMap, aiMap) {
  let a, b;
  try {
    a = extractStats(rawEntry, charMap, capsuleMap, null, aiMap);
    b = extractStats(compactEntry, charMap, capsuleMap, null, aiMap);
  } catch (err) {
    fail(matchName, slot, `extractStats threw: ${err.message}`);
    return;
  }
  const sa = JSON.stringify(a);
  const sb = JSON.stringify(b);
  if (sa !== sb) {
    for (const key of Object.keys(a)) {
      if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) {
        fail(matchName, slot, `extractStats.${key}: ${JSON.stringify(a[key])} != ${JSON.stringify(b[key])}`);
      }
    }
  }
}

function getBattleResult(content) {
  const tbr = content?.TeamBattleResults;
  if (!tbr) return null;
  return tbr.battleResult || tbr.BattleResults || null;
}

function main() {
  if (!fs.existsSync(path.join(aggregatesDir, 'index.json'))) {
    console.error('verify-br-aggregates: no corpus found. Run generate-br-aggregates.js first.');
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(aggregatesDir, 'index.json'), 'utf8'));
  const charMap = parseCharacterCSV(fs.readFileSync(path.join(refDataDir, 'characters.csv'), 'utf8'));
  const capsuleMap = buildCapsuleMap();

  // Treat every distinct equipItem key as an AI strategy so extractStats' lookup
  // resolves to the first equipped item - which makes the comparison sensitive to
  // equipItem ORDER, not just membership.
  const aiMap = {};

  let matchesChecked = 0;
  let entriesChecked = 0;

  for (const shard of manifest.shards) {
    const shardPath = path.join(aggregatesDir, `${shard.slug}.json`);
    const payload = JSON.parse(fs.readFileSync(shardPath, 'utf8'));

    for (const entry of payload.files) {
      const rawPath = path.join(brDataDir, entry.name);
      if (!fs.existsSync(rawPath)) {
        fail(entry.name, '-', 'raw source file missing');
        continue;
      }
      const rawContent = readMatchJson(rawPath);
      const rawResult = getBattleResult(rawContent);
      const cmpResult = getBattleResult(entry.content);
      if (!rawResult || !cmpResult) {
        fail(entry.name, '-', 'battleResult missing on one side');
        continue;
      }

      // Match-level fields the aggregations read directly.
      if (JSON.stringify(rawContent.TeamBattleResults.teams ?? null) !==
          JSON.stringify(entry.content.TeamBattleResults.teams ?? null)) {
        fail(entry.name, '-', 'teams differ');
      }
      if ((rawResult.battleWinLose ?? null) !== (cmpResult.battleWinLose ?? null)) {
        fail(entry.name, '-', 'battleWinLose differs');
      }
      if ((rawResult.originalMap?.key ?? null) !== (cmpResult.originalMap?.key ?? null)) {
        fail(entry.name, '-', 'originalMap.key differs');
      }
      if (JSON.stringify(rawContent.tags ?? null) !== JSON.stringify(entry.tags ?? null)) {
        fail(entry.name, '-', 'tags differ');
      }

      // Slot keys drive position derivation (1P/2P/AlliesTeamMemberN), so the key
      // set must match exactly, in order.
      const rawSlots = Object.keys(rawResult.characterRecord || {});
      const cmpSlots = Object.keys(cmpResult.characterRecord || {});
      if (JSON.stringify(rawSlots) !== JSON.stringify(cmpSlots)) {
        fail(entry.name, '-', `characterRecord slot keys differ (${rawSlots.length} vs ${cmpSlots.length})`);
      }

      for (const slot of rawSlots) {
        const rawEntry = rawResult.characterRecord[slot];
        const cmpEntry = cmpResult.characterRecord?.[slot];
        checkEntry(entry.name, slot, rawEntry, cmpEntry);
        checkExtractStats(entry.name, slot, rawEntry, cmpEntry, charMap, capsuleMap, aiMap);
        entriesChecked++;
      }

      // characterIdRecord powers per-form / fusion splitting.
      const rawIds = Object.keys(rawResult.characterIdRecord || {});
      const cmpIds = Object.keys(cmpResult.characterIdRecord || {});
      if (JSON.stringify(rawIds) !== JSON.stringify(cmpIds)) {
        fail(entry.name, '-', `characterIdRecord keys differ (${rawIds.length} vs ${cmpIds.length})`);
      }
      for (const id of rawIds) {
        const rawEntryId = rawResult.characterIdRecord[id];
        const cmpEntryId = cmpResult.characterIdRecord?.[id];
        checkEntry(entry.name, `idRecord:${id}`, rawEntryId, cmpEntryId);
        checkExtractStats(entry.name, `idRecord:${id}`, rawEntryId, cmpEntryId, charMap, capsuleMap, aiMap);
        entriesChecked++;
      }

      matchesChecked++;
    }
  }

  console.log(`verify-br-aggregates: ${matchesChecked} matches, ${entriesChecked} character entries checked`);
  if (problems.length) {
    console.error(`\nFAILED - ${problems.length} problem(s)${problems.length >= 40 ? ' (first 40)' : ''}:`);
    problems.forEach(p => console.error('  ' + p));
    process.exit(1);
  }
  console.log('PASSED - compact corpus is analytically identical to BR_Data.');
}

main();
