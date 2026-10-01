/**
 * Guards the character URL scheme.
 *
 * Character deep links are addressed by name slug (/characters/android-13), not
 * by internal key (/characters/0620_00), because a shared link should be legible
 * to whoever receives it. That only works while slugs stay unique and stable, and
 * nothing else in the build enforces either property — so this does, and it runs
 * in prebuild so a violation fails the build instead of shipping.
 *
 * It imports the same characterSlug.js the app uses, so what is asserted here is
 * what the app resolves.
 *
 * What a failure means:
 *   - COLLISION: two characters slugify identically, so one is unreachable and
 *     they fight over one URL. Disambiguate the names in characters.csv.
 *   - NAMESPACE: a slug became indistinguishable from a raw id, which breaks the
 *     either/or dispatch in resolveCharacterParam().
 *   - ROUND TRIP: id -> slug -> id stopped being lossless.
 *
 * A missing name for a character that appears in match data is only a WARNING:
 * newly released characters legitimately show up in submitted results before
 * characters.csv gains a row, and the raw-id route still resolves them.
 *
 * ESM (.mjs) because it imports the app's own source directly.
 * Usage: node scripts/verify-character-slugs.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  buildCharacterSlugIndex,
  slugifyCharacterName,
  resolveCharacterParam,
  characterUrlKey,
  CHARACTER_ID_PATTERN,
} from '../src/utils/characterSlug.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.resolve(__dirname, '..', '..', '..', 'referencedata', 'characters.csv');
const aggregatesDir = path.resolve(__dirname, '..', 'public', 'br-aggregates');

let failures = 0;
let warnings = 0;
function fail(msg) { failures++; console.error('  FAIL ' + msg); }
function warn(msg) { warnings++; console.warn('  WARN ' + msg); }
function ok(msg) { console.log('  ok   ' + msg); }

const csv = fs.readFileSync(csvPath, 'utf8');
const index = buildCharacterSlugIndex(csv);
const ids = [...index.idToName.keys()];

console.log('characters.csv: ' + ids.length + ' characters');

// --- Source data sanity -----------------------------------------------------
const names = ids.map(id => index.idToName.get(id));
const dupNames = names.filter((n, i) => names.indexOf(n) !== i);
if (dupNames.length) fail('duplicate character NAMES: ' + [...new Set(dupNames)].join(', '));
else ok('all character names are unique');

const badIds = ids.filter(id => !CHARACTER_ID_PATTERN.test(id));
if (badIds.length) {
  fail('ids not matching CHARACTER_ID_PATTERN (the id/slug dispatch relies on this): ' + badIds.join(', '));
} else ok('all ids match CHARACTER_ID_PATTERN');

// --- The collision guard, the reason this script exists ---------------------
if (index.collisions.length) {
  for (const [slug, owners] of index.collisions) {
    fail('COLLISION on "' + slug + '" claimed by ' +
      owners.map(id => index.idToName.get(id) + ' [' + id + ']').join(' and '));
  }
} else ok('all ' + index.idToSlug.size + ' slugs are unique');

const emptySlugs = ids.filter(id => !index.idToSlug.get(id));
if (emptySlugs.length) fail('characters whose name yields an empty slug: ' + emptySlugs.join(', '));
else ok('no empty slugs');

// --- Namespace separation: a slug must never look like an id ----------------
const idLike = ids.filter(id => CHARACTER_ID_PATTERN.test(index.idToSlug.get(id) || ''));
if (idLike.length) fail('NAMESPACE: slug indistinguishable from a raw id: ' + idLike.join(', '));
else ok('no slug can be mistaken for a raw id');

const underscored = ids.filter(id => (index.idToSlug.get(id) || '').includes('_'));
if (underscored.length) fail('NAMESPACE: slug contains an underscore: ' + underscored.join(', '));
else ok('no slug contains an underscore');

// --- Round trip -------------------------------------------------------------
const broken = ids.filter(id => resolveCharacterParam(characterUrlKey(id, index), index) !== id);
if (broken.length) {
  fail('ROUND TRIP id -> slug -> id lost ' + broken.length + ' character(s): ' + broken.slice(0, 5).join(', '));
} else ok('id -> slug -> id round-trips for all ' + ids.length);

const byRawId = ids.filter(id => resolveCharacterParam(id, index) !== id);
if (byRawId.length) fail('raw id no longer resolves for: ' + byRawId.slice(0, 5).join(', '));
else ok('every raw id still resolves (permanent alias for old links)');

const caseBroken = ids.filter(id => {
  const s = index.idToSlug.get(id);
  return s ? resolveCharacterParam(s.toUpperCase(), index) !== id : false;
});
if (caseBroken.length) fail('slug lookup is case-sensitive for: ' + caseBroken.slice(0, 5).join(', '));
else ok('slug lookup is case-insensitive');

// --- Cross-check against the real corpus (advisory) -------------------------
if (fs.existsSync(aggregatesDir)) {
  const seen = new Set();
  let matches = 0;
  const walk = (node) => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node)) {
      if ((key === 'character' || key === 'originalCharacter') && value && typeof value.key === 'string') {
        seen.add(value.key);
      }
      walk(value);
    }
  };
  for (const file of fs.readdirSync(aggregatesDir)) {
    if (file === 'index.json' || !file.endsWith('.json')) continue;
    const shard = JSON.parse(fs.readFileSync(path.join(aggregatesDir, file), 'utf8'));
    for (const record of Object.values(shard.files || {})) { matches++; walk(record.content); }
  }
  console.log('corpus: ' + seen.size + ' distinct characters across ' + matches + ' matches');
  const unnamed = [...seen].filter(id => !index.idToName.has(id)).sort();
  if (unnamed.length) {
    warn('in match data but missing from characters.csv, so they will show a raw key ' +
      'in the UI and are only reachable by id: ' + unnamed.join(', '));
    warn('add these rows to referencedata/characters.csv to give them real URLs');
  } else ok('every character in match data has a name, so all have readable URLs');
} else {
  console.log('  (public/br-aggregates not built yet - skipping corpus cross-check)');
}

console.log();
if (failures) {
  console.error('FAILED - ' + failures + ' check(s). The character URL scheme is broken; see above.');
  process.exit(1);
}
console.log('PASSED - character URL scheme is sound' + (warnings ? ' (' + warnings + ' warning(s))' : '') + '.');
