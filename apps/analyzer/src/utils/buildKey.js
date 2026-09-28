/**
 * What makes two appearances "the same build": the exact capsule set plus the AI
 * strategy. This is the definition the leaderboard's build table and build filter
 * have always used; it lives here so the table, the filter, the aggregations and
 * the Character page can never disagree about it (it used to be written out by hand
 * in six places).
 */

/** The build key for a capsule list and an AI strategy name. */
export function buildKey(equippedCapsules, aiStrategy) {
  const capsules = (equippedCapsules || []).map(c => c.name || c.id || '').sort().join(',');
  return `${capsules}|${aiStrategy || 'Default'}`;
}

/** The build key of anything carrying `equippedCapsules` and `aiStrategy` (a match row, a build). */
export const buildKeyOf = x => buildKey(x && x.equippedCapsules, x && x.aiStrategy);

/**
 * A short, stable code for a build key, for links (`?build=k3f9a2`). A key is long
 * (every capsule name), and a code only needs to tell one character's builds
 * apart: it is always resolved against that character's own builds, never looked up
 * globally. FNV-1a 32-bit in base 36 - a collision would need two builds of ONE
 * character to hash alike, about 1 in 4 billion per pair.
 */
export function buildCode(key) {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/** The entry in `builds` whose key has this code, or null. */
export function findBuildByCode(builds, code, keyOf = buildKeyOf) {
  if (!code || !Array.isArray(builds)) return null;
  return builds.find(b => buildCode(keyOf(b)) === code) || null;
}
