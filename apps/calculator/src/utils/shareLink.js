/**
 * Share links: the build is stored in the URL hash as base64(encodeURIComponent(JSON)).
 *
 *   v2 (written by this app):  { v: 2, c: characterId, p: [capsuleId|null x7], o?: opponentId, op?: [capsuleId|null x7] }
 *   v1 (old links, and the links the website's Teams page builds):
 *                              { c: characterName, p: [capsuleName|null x7], o?: opponentName, op?: [...] }
 *
 * Decoding never throws. Names resolve exact -> alias (data/curated/aliases.csv, old
 * calculator names and website spellings) -> normalised (case, spaces and punctuation
 * ignored). Anything that still does not resolve becomes an empty slot and a notice.
 */

const SLOTS = 7;

export function normName(s) {
  return String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function pack(data) {
  return btoa(encodeURIComponent(JSON.stringify(data)));
}

function unpack(hash) {
  try {
    return JSON.parse(decodeURIComponent(atob(hash)));
  } catch {
    return null;
  }
}

const slots = (list, key) => {
  const out = (list || []).slice(0, SLOTS).map(c => (c ? c[key] ?? null : null));
  while (out.length < SLOTS) out.push(null);
  return out;
};

/** v2 link payload for the current build. */
export function encodeBuild({ character, capsules, opponent = null, opponentCapsules = null }) {
  const data = { v: 2, c: character.id, p: slots(capsules, 'id') };
  if (opponent) data.o = opponent.id;
  if (opponentCapsules && opponentCapsules.some(Boolean)) data.op = slots(opponentCapsules, 'id');
  return pack(data);
}

/**
 * Build a resolver over the loaded data.
 * @param {Array<{id:string,name:string,aliases?:string[]}>} characters
 * @param {Array<{id?:string,name:string}>} capsules
 * @param {Record<string,string>} [aliases]  extra alias -> character id
 */
export function makeResolver(characters, capsules, aliases = {}) {
  const charById = new Map(characters.map(c => [c.id, c]));
  const charByName = new Map(characters.map(c => [c.name, c]));
  const charByNorm = new Map(characters.map(c => [normName(c.name), c]));
  const aliasMap = new Map(Object.entries(aliases));
  for (const c of characters) for (const a of c.aliases || []) aliasMap.set(a, c.id);
  const capById = new Map(capsules.filter(c => c.id).map(c => [c.id, c]));
  const capByName = new Map(capsules.map(c => [c.name, c]));
  const capByNorm = new Map(capsules.map(c => [normName(c.name), c]));

  return {
    character(ref) {
      if (ref == null || ref === '') return null;
      const s = String(ref).trim();
      return charById.get(s) || charByName.get(s) || charById.get(aliasMap.get(s)) || charByNorm.get(normName(s)) || null;
    },
    capsule(ref) {
      if (ref == null || ref === '') return null;
      const s = String(ref).trim();
      return capById.get(s) || capByName.get(s) || capByNorm.get(normName(s)) || null;
    },
  };
}

/**
 * Decode a hash (without the leading '#').
 * @returns {null | { character, capsules, opponent, opponentCapsules, notices: string[] }}
 */
export function decodeBuild(hash, resolver) {
  const data = unpack(hash);
  if (!data || typeof data !== 'object') return null;
  const notices = [];
  const char = (ref, role) => {
    if (ref == null || ref === '') return null;
    const c = resolver.character(ref);
    if (!c) notices.push(`${role} "${ref}" is not in the current data`);
    return c;
  };
  const caps = (list, role) => {
    if (!Array.isArray(list)) return null;
    const out = list.slice(0, SLOTS).map(ref => {
      if (ref == null || ref === '') return null;
      const c = resolver.capsule(ref);
      if (!c) notices.push(`${role} capsule "${ref}" is not in the current data`);
      return c;
    });
    while (out.length < SLOTS) out.push(null);
    return out;
  };
  return {
    version: data.v === 2 ? 2 : 1,
    character: char(data.c, 'Character'),
    capsules: caps(data.p, 'Character'),
    opponent: char(data.o, 'Opponent'),
    opponentCapsules: caps(data.op, 'Opponent'),
    notices,
  };
}
