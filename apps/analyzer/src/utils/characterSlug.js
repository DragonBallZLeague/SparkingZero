/**
 * Human-readable character identity for URLs.
 *
 * Deep links are meant to be pasted into Discord, and a raw key tells a reader
 * nothing: `0620_00` is Android 13. So the canonical URL carries the character's
 * name as a slug (`/characters/android-13`) while the CSV id stays the internal
 * primary key.
 *
 * Raw ids are still accepted as a permanent alias, for two reasons:
 *   1. Old links keep working if a name is ever edited.
 *   2. A newly released character can appear in submitted match data BEFORE
 *      referencedata/characters.csv gains a row for it. With no name there is no
 *      slug, and a slug-only route would make that character unreachable exactly
 *      when interest in it peaks. The id route always resolves.
 *
 * The two namespaces cannot collide: every id matches CHARACTER_ID_PATTERN, and
 * no character name contains an underscore, so slugs never do either. That makes
 * the dispatch in resolveCharacterParam() unambiguous rather than heuristic.
 *
 * Slug uniqueness across all 241 characters is verified at build time by
 * scripts/verify-character-slugs.mjs, which fails the build on a collision. Do
 * not change slugify() without re-running it: changing the algorithm silently
 * rots every link already shared.
 */

/** Every id in characters.csv is exactly four digits, underscore, two digits. */
export const CHARACTER_ID_PATTERN = /^\d{4}_\d{2}$/;

/**
 * Name -> URL slug. Strips diacritics (`Rosé` -> `rose`) so links survive being
 * retyped, lowercases, and collapses every other run of non-alphanumerics to a
 * single hyphen. Parentheses and the ` - ` separators in names like
 * "Goku (Z - Mid) Super Saiyan" collapse away: `goku-z-mid-super-saiyan`.
 */
export function slugifyCharacterName(name) {
  if (typeof name !== 'string') return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Parses characters.csv into bidirectional lookups.
 *
 * Splits on the LAST comma, not the first: no name contains a comma today, but
 * one added later would otherwise silently truncate the name and corrupt its
 * slug. (statCalculations.js:parseCharacterCSV still uses split(',') — it only
 * needs the id, so it is unaffected.)
 *
 * Returns { idToName, idToSlug, slugToId, collisions }. `collisions` is a list
 * of [slug, ids[]] for any slug claimed by more than one character; it is always
 * empty for current data and exists so the build can assert that.
 */
export function buildCharacterSlugIndex(csvText) {
  const idToName = new Map();
  const idToSlug = new Map();
  const slugToId = new Map();
  const slugOwners = new Map();

  const text = typeof csvText === 'string' ? csvText.replace(/^\uFEFF/, '') : '';
  const lines = text.split(/\r?\n/);

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const comma = line.lastIndexOf(',');
    if (comma === -1) continue;
    const name = line.slice(0, comma).trim();
    const id = line.slice(comma + 1).trim();
    if (!id || !name) continue;

    idToName.set(id, name);
    const slug = slugifyCharacterName(name);
    if (!slug) continue;
    idToSlug.set(id, slug);
    if (!slugToId.has(slug)) slugToId.set(slug, id);
    if (!slugOwners.has(slug)) slugOwners.set(slug, []);
    slugOwners.get(slug).push(id);
  }

  const collisions = [...slugOwners.entries()].filter(([, ids]) => ids.length > 1);
  return { idToName, idToSlug, slugToId, collisions };
}

/**
 * URL parameter -> character id, or null if it resolves to nothing known.
 *
 * Accepts the canonical slug, a raw id, and a slug in any casing. Callers should
 * treat null as "unknown character" rather than falling back to a guess.
 */
export function resolveCharacterParam(param, index) {
  if (typeof param !== 'string' || !param) return null;
  const raw = param.trim();
  if (!raw) return null;

  // Raw id: authoritative, and works even for a character with no CSV row yet.
  if (CHARACTER_ID_PATTERN.test(raw)) return raw;

  if (!index || !index.slugToId) return null;
  const slug = slugifyCharacterName(raw);
  return index.slugToId.get(slug) || null;
}

/**
 * Character id -> the slug to put in a URL, falling back to the id itself when
 * the character has no CSV row yet, so the page stays linkable regardless.
 */
export function characterUrlKey(id, index) {
  if (typeof id !== 'string' || !id) return '';
  const slug = index && index.idToSlug ? index.idToSlug.get(id) : null;
  return slug || id;
}
