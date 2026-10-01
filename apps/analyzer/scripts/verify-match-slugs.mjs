/**
 * Guards the match URL scheme (src/utils/matchSlug.js).
 *
 * Match links are addressed by the file's name as a slug
 * (/matches/s0-week-3-match-5), which only works while every match's slug is
 * its own. Nothing else enforces that, so this runs in prebuild, over every
 * match path the app can resolve (public/br-data-tags.json, written earlier in
 * prebuild), and imports the same module the app uses.
 *
 * What a failure means:
 *   - COLLISION: two files share a name (in different folders). One keeps the
 *     slug and the other is only reachable by its path. Rename one file.
 *   - EMPTY: a file name has no letters or digits, so it has no slug.
 *   - ROUND TRIP: path -> URL key -> path stopped being lossless.
 *
 * Usage: node scripts/verify-match-slugs.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildMatchSlugIndex, matchSlug, matchUrlKey, resolveMatchParam } from '../src/utils/matchSlug.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tagsPath = path.resolve(__dirname, '..', 'public', 'br-data-tags.json');

let failures = 0;
const fail = msg => { failures++; console.error('  FAIL ' + msg); };
const ok = msg => console.log('  ok   ' + msg);

const paths = Object.keys(JSON.parse(fs.readFileSync(tagsPath, 'utf8')));
const index = buildMatchSlugIndex(paths);
console.log(`verify-match-slugs: ${paths.length} matches`);

const empty = paths.filter(p => !matchSlug(p));
if (empty.length) fail(`${empty.length} file name(s) with no slug: ${empty.slice(0, 3).join(', ')}`);
else ok('every match has a slug');

if (index.collisions.length) {
  for (const [slug, ps] of index.collisions.slice(0, 5)) fail(`COLLISION "${slug}": ${ps.join(' | ')}`);
} else ok('every slug is unique');

const lost = paths.filter(p => resolveMatchParam(matchUrlKey(p, index), index) !== p);
if (lost.length) fail(`ROUND TRIP broken for ${lost.length}: ${lost.slice(0, 3).join(', ')}`);
else ok('every match resolves from its URL key');

const aliasLost = paths.filter(p => resolveMatchParam(p, index) !== p);
if (aliasLost.length) fail(`the path alias fails for ${aliasLost.length}: ${aliasLost.slice(0, 3).join(', ')}`);
else ok('every match resolves from its path too');

// The examples the docs give.
const sample = 'Seasons/Season 0/S0 Week 3 Match 5.json';
if (matchSlug(sample) !== 's0-week-3-match-5') fail(`${sample} slugs to ${matchSlug(sample)}`);
else ok(`${sample} -> s0-week-3-match-5`);
if (matchSlug('Tests/Master and Student/OS0 M&S Test 1.json') !== 'os0-m-and-s-test-1') fail('& does not read as "and"');
else ok('& reads as "and"');

if (failures) {
  console.error(`\nverify-match-slugs: ${failures} failure(s)`);
  process.exit(1);
}
console.log('verify-match-slugs: PASSED');
