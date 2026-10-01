/**
 * Guards the move-code classifier (src/utils/actionCodes.js) against drifting from
 * what docs/ACTION_CODES.md records.
 *
 * WHY THIS EXISTS
 *
 * The classification was worked out code by code with the league, and several
 * lines are easy to break without noticing. SMB* (smash ki blasts) share a prefix
 * with SM* (smash attacks) and were once swept into melee. RI* looks like an
 * impact code but is a movement step-in. A regex edit that quietly moves a family
 * changes every character's fighting-style profile, and nothing else would fail.
 *
 * Two checks:
 *   1. SPOT CHECKS - one representative per documented family, including the
 *      boundary cases above. Pure, instant.
 *   2. COVERAGE (only with --coverage) - classifies every hit in BR_Data and fails
 *      if the unidentified share grows past a threshold, which would mean new
 *      codes have appeared in the data. Reads every match, so it is not in prebuild.
 *
 * Usage: npm run verify-action-codes [-- --coverage]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { actionCode, classifyAction } from '../src/utils/actionCodes.js';

const EXPECT = {
  rush: ['RSHA1', 'RSHA5', 'RSHB1', 'RSHB5', 'ARSHA1', 'ARSHB3'],
  heavy: ['SCN', 'SCF', 'HFN', 'AHFN', 'FLK', 'FLKF', 'RWN', 'RHNL', 'RHPR', 'GSN', 'LFN', 'MSAN', 'BSA',
    'VASN', 'VASF', 'VAAD', 'LTAC', 'LTAOT', 'DDALN', 'SMMN', 'SMUF', 'SMLJ', 'DSMM', 'DSMD', 'ASMDF'],
  kiblast: ['RSB', 'DRSB', 'JRB', 'JSBN', 'SMBN', 'DSMBN', 'STDSMBN'],
  super: ['SPM1SI', 'SPM2HD1P', 'SPM2_SBM'],
  ultimate: ['ULTHI', 'ULTSI'],
  skill: ['EXA1', 'EXA2'],
  throw: ['TRW', 'TRWFT', 'TRW1P', 'DTW1P'],
  counter: ['ZCBGD', 'ZCBAL', 'ZCOL', 'RVCA', 'RVCSU', 'SZCCS'],
  impact: ['SPF1W', 'CRFVEA'],
  reaction: ['BLWF', 'BLWB'],
  movement: ['DDS', 'RIAD', 'RIAF', 'RI1'],
};

let failures = 0;
console.log('Spot checks against docs/ACTION_CODES.md:');
for (const [cls, codes] of Object.entries(EXPECT)) {
  const wrong = codes.filter(c => classifyAction(c) !== cls).map(c => `${c}->${classifyAction(c)}`);
  if (wrong.length) { failures++; console.error(`  FAIL ${cls.padEnd(9)} ${wrong.join(', ')}`); }
  else console.log(`  ok   ${cls.padEnd(9)} ${codes.length} codes`);
}
if (actionCode('(Key="actSMBN")') !== 'SMBN') { failures++; console.error('  FAIL actionCode() does not unwrap (Key="act...")'); }
else console.log('  ok   actionCode() unwraps (Key="act...")');

if (process.argv.includes('--coverage')) {
  // Unidentified codes were under 1% of hits when the classification was agreed.
  const MAX_UNKNOWN_SHARE = 0.02;
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'BR_Data');
  const walk = (d, out = []) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f, out); else if (e.name.endsWith('.json')) out.push(f);
    }
    return out;
  };
  let total = 0, unknown = 0;
  const unknownCodes = {};
  for (const f of walk(root)) {
    let j;
    try {
      const b = fs.readFileSync(f);
      const t = b[0] === 0xFF && b[1] === 0xFE ? b.toString('utf16le') : b.toString('utf8');
      j = JSON.parse(t.replace(/^﻿/, ''));
    } catch { continue; }
    for (const c of Object.values(j?.TeamBattleResults?.battleResult?.characterRecord || {})) {
      for (const [k, v] of Object.entries(c?.battleCount?.attackHitCount || {})) {
        if (typeof v !== 'number') continue;
        total += v;
        const code = actionCode(k);
        if (classifyAction(code) === 'unknown') { unknown += v; unknownCodes[code] = (unknownCodes[code] || 0) + v; }
      }
    }
  }
  const share = total ? unknown / total : 0;
  const top = Object.entries(unknownCodes).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([c, n]) => `${c}=${n}`).join(' ');
  if (share > MAX_UNKNOWN_SHARE) {
    failures++;
    console.error(`\n  FAIL ${(share * 100).toFixed(2)}% of ${total} hits are unidentified (limit ${MAX_UNKNOWN_SHARE * 100}%). Top: ${top}`);
  } else {
    console.log(`\n  ok   ${(share * 100).toFixed(2)}% of ${total} hits unidentified (limit ${MAX_UNKNOWN_SHARE * 100}%). Top: ${top}`);
  }
}

console.log();
if (failures) {
  console.error(`FAILED - ${failures} check(s). Update docs/ACTION_CODES.md and actionCodes.js together.`);
  process.exit(1);
}
console.log('PASSED - the move-code classifier matches docs/ACTION_CODES.md.');
