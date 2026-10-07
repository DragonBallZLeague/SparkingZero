/**
 * ONE-OFF (P2 of the 2026-10 data rebuild): proves the schema-2 files lose nothing the
 * UI used. Runs src/data/adapter.js toLegacy() over public/data (schema 2) and compares
 * each result with the old-shape file committed at a git revision (default HEAD, the
 * P1 commit), as parsed JSON. Exit 1 on any difference. Deleted in the cleanup phase.
 *
 * Usage: node scripts/oneoff/prove-lossless.mjs [revision]
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { toLegacy } from '../../src/data/adapter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(__dirname, '..', '..');
const rev = process.argv[2] || 'HEAD';
const read = (f) => JSON.parse(fs.readFileSync(path.join(APP, 'public', 'data', f), 'utf8'));
const atRev = (f) => JSON.parse(execFileSync('git', ['show', `${rev}:apps/calculator/public/data/${f}`], { cwd: APP, encoding: 'utf8', maxBuffer: 64 << 20 }));

const meta = read('meta.json');
const capsules = read('capsules.json').filter(c => !c.bannedIn.includes(meta.defaultRuleset));
const data = { characters: read('characters.json'), skills: read('skills.json'), blasts: read('blasts.json'), capsules, teams: read('teams.json'), meta };
const legacy = toLegacy(data, { roster: meta.roster });

const pairs = [['characters', 'characters.json'], ['skills', 'skills.json'], ['blast', 'blast.json'], ['capsules', 'capsules.json'], ['teams', 'teams.json'], ['characterImages', 'characterImages.json']];
let bad = 0;
for (const [k, f] of pairs) {
  const want = JSON.stringify(atRev(f));
  const got = JSON.stringify(legacy[k]);
  if (want === got) console.log(`  ok    ${f}: identical (${got.length} chars)`);
  else {
    bad++;
    let i = 0;
    while (i < want.length && want[i] === got[i]) i++;
    console.log(`  FAIL  ${f}: first difference at ${i}\n          ${rev}: ...${want.slice(Math.max(0, i - 80), i + 80)}\n          now: ...${got.slice(Math.max(0, i - 80), i + 80)}`);
  }
}
console.log(bad ? `prove-lossless: ${bad} file(s) differ from ${rev}` : `prove-lossless: toLegacy(schema 2) reproduces every old-shape file at ${rev}`);
process.exit(bad ? 1 : 0);
