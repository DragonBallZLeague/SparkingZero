/**
 * Effect conditions, read from their text (curated/capsule-effects.csv `condition`, characters.json
 * passives' `condition`) into a structured form, so the conditions controls (each side's health, ki,
 * skill gauge, map and timed events) can apply them with exact numbers. No imports: the build, the
 * checks and the browser share it.
 *
 * Kinds:
 *   always, sparking        as before (the Sparking toggle)
 *   healthPct  { max }      health at or below max x maximum health (Fury!, Latent Power!, Fighting Spirit)
 *   healthHp   { below }    health below a number of HP (characters' low-health power-ups)
 *   map        { map }      on a map (Power of Namek, Earth, the Universe)
 *   event      { event }    for a while after something happens (a knockout, the first transformation, an emote)
 *   rushOnly                a property of the effect, not a condition (Dragon Rush: rush hits only)
 *   unknown    { text }     never applied; verify-data fails on one
 */

export const MAPS = {
  namek: 'Namek',
  earth: 'Earth',
  top: 'Tournament of Power',
};

export const EVENTS = {
  knockout: 'After a knockout',
  transform: 'After the first transformation',
  emote: 'After an emote',
};

const cache = new Map();

export function parseCondition(text) {
  const t = (text ?? 'always').trim() || 'always';
  if (cache.has(t)) return cache.get(t);
  let out;
  let m;
  if (t === 'always') out = { kind: 'always' };
  else if (t === 'sparking') out = { kind: 'sparking' };
  else if ((m = t.match(/^health at or below (\d+(?:\.\d+)?)%/i))) out = { kind: 'healthPct', max: +m[1] / 100 };
  else if ((m = t.match(/^health below ([\d,]+) HP/i))) out = { kind: 'healthHp', below: +m[1].replace(/,/g, '') };
  else if (/\bNamek map\b/i.test(t)) out = { kind: 'map', map: 'namek' };
  else if (/\bEarth maps?\b/i.test(t)) out = { kind: 'map', map: 'earth' };
  else if (/\bTournament of Power map\b/i.test(t)) out = { kind: 'map', map: 'top' };
  else if (/after eliminating an opponent/i.test(t)) out = { kind: 'event', event: 'knockout' };
  else if (/after the first transformation/i.test(t)) out = { kind: 'event', event: 'transform' };
  else if (/after an emote/i.test(t)) out = { kind: 'event', event: 'emote' };
  else if (/against Rush Attack category actions/i.test(t)) out = { kind: 'rushOnly' };
  else out = { kind: 'unknown', text: t };
  cache.set(t, out);
  return out;
}

/**
 * Is a condition met? `situation` = { health (HP), maxHealth, ki (bars), skill (count), map, events: {knockout, ...} }.
 * Health with no number means full health.
 */
export function conditionMet(cond, situation) {
  if (!situation) return false;
  const max = situation.maxHealth ?? 0;
  const hp = situation.health ?? max;
  switch (cond.kind) {
    case 'healthPct': return max > 0 && hp <= cond.max * max + 1e-9;
    case 'healthHp': return hp < cond.below;
    case 'map': return situation.map === cond.map;
    case 'event': return !!situation.events?.[cond.event];
    default: return false;
  }
}

/** What a condition needs from the controls: 'health', 'map', 'event' or null. */
export function conditionNeeds(cond) {
  if (cond.kind === 'healthPct' || cond.kind === 'healthHp') return 'health';
  if (cond.kind === 'map' || cond.kind === 'event') return cond.kind;
  return null;
}
