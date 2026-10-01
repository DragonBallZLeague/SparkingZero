/**
 * Human-readable match identity for URLs.
 *
 * A match is a file, `Seasons/Season 0/S0 Week 3 Match 5.json`, and its link
 * is shared in Discord, so the URL carries the file's name as a slug:
 * `/matches/s0-week-3-match-5`. File names already say the season, week and
 * match, or the team and test number, and they are unique across the corpus
 * (scripts/verify-match-slugs.mjs fails the build if two ever collide).
 *
 * The file's path is accepted too, as a permanent alias: a slug is resolved
 * against the list of every match path (br-data-tags.json, which the scope
 * already loads), so the path always works, even for a file whose slug another
 * file has claimed. Do not change matchSlug() without re-running the verifier:
 * changing it rots every link already shared.
 *
 * No React, so the build scripts can import it.
 */

/** A match path or file name -> its slug. `&` reads as "and". */
export function matchSlug(pathOrName) {
  const base = String(pathOrName || '').split(/[\\/]/).pop().replace(/\.json$/i, '');
  return base
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Every match path -> its slug and back. `collisions` lists [slug, paths[]]
 * for any slug two paths share: the first path keeps the slug, the others are
 * reached by their path (matchUrlKey). It is empty for the league's data.
 */
export function buildMatchSlugIndex(paths) {
  const slugToPath = new Map();
  const pathToSlug = new Map();
  const claims = new Map();
  for (const p of paths || []) {
    const slug = matchSlug(p);
    if (!slug) continue;
    if (!claims.has(slug)) claims.set(slug, []);
    claims.get(slug).push(p);
    if (!slugToPath.has(slug)) {
      slugToPath.set(slug, p);
      pathToSlug.set(p, slug);
    }
  }
  const collisions = [...claims].filter(([, ps]) => ps.length > 1);
  return { slugToPath, pathToSlug, collisions, paths: new Set(paths || []) };
}

/** What a match's URL carries: its slug, or its path when the slug is taken. */
export function matchUrlKey(path, index) {
  return (index && index.pathToSlug.get(path)) || path;
}

/** A URL's match param (a slug or a path) -> the match's path, or null. */
export function resolveMatchParam(param, index) {
  if (!param || !index) return null;
  const p = String(param);
  if (index.slugToPath.has(p)) return index.slugToPath.get(p);
  if (index.paths.has(p)) return p;
  const lower = matchSlug(p);
  return index.slugToPath.get(lower) || null;
}
