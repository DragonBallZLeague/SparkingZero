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
 *   kiPct      { min, below, max }  current ki as a percent of the gauge, as the game's SPPercent conditions
 *                               put it (20% = 1 bar of 5): "ki at or above 60%, below 80%" (Vegeta's Technique,
 *                               Accelerator, Amplified Strike), "ki below 20%", "ki at or below 40%" (Energy Conservation)
 *   time       { every, max }  once per `every` seconds into the battle, up to `max` times:
 *                               "every 30 seconds in battle, up to 3 times" (Power Creep)
 *   rushOnly                a property of the effect, not a condition (Dragon Rush: rush hits only)
 * time stacks: the effect's value is multiplied by conditionStacks().
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

/** The conditions controls' battle-time steps (Power Creep's three stacks), in seconds. */
export const TIME_STEPS = [0, 30, 60, 90];

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
  else if ((m = t.match(/^ki at or above (\d+)%(?:, below (\d+)%)?$/i))) out = { kind: 'kiPct', min: +m[1], ...(m[2] ? { below: +m[2] } : {}) };
  else if ((m = t.match(/^ki below (\d+)%$/i))) out = { kind: 'kiPct', below: +m[1] };
  else if ((m = t.match(/^ki at or below (\d+)%$/i))) out = { kind: 'kiPct', max: +m[1] };
  else if ((m = t.match(/^every (\d+) seconds in battle, up to (\d+) times$/i))) out = { kind: 'time', every: +m[1], max: +m[2] };
  else out = { kind: 'unknown', text: t };
  cache.set(t, out);
  return out;
}

/**
 * Is a condition met? `situation` = { health (HP), maxHealth, ki (bars), maxKi (bars), skill (count), map, events: {knockout, ...}, time (seconds) }.
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
    case 'kiPct': {
      const pct = ((situation.ki ?? 0) / (situation.maxKi || 5)) * 100;
      return (cond.min == null || pct >= cond.min - 1e-9) && (cond.below == null || pct < cond.below - 1e-9) && (cond.max == null || pct <= cond.max + 1e-9);
    }
    case 'time': return conditionStacks(cond, situation) > 0;
    default: return false;
  }
}

/** How many times a met condition applies its effect: per step of battle time (time), else 1. */
export function conditionStacks(cond, situation) {
  if (!situation) return 0;
  if (cond.kind === 'time') return Math.max(0, Math.min(cond.max, Math.floor((situation.time ?? 0) / cond.every)));
  return conditionMet(cond, situation) ? 1 : 0;
}

/** What a condition needs from the controls: 'health', 'ki', 'map', 'event', 'time' or null. */
export function conditionNeeds(cond) {
  if (cond.kind === 'healthPct' || cond.kind === 'healthHp') return 'health';
  if (cond.kind === 'kiPct') return 'ki';
  if (cond.kind === 'map' || cond.kind === 'event' || cond.kind === 'time') return cond.kind;
  return null;
}
