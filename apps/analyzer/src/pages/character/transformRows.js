import { slugifyCharacterName } from '../../utils/characterSlug.js';
import {
  SKILL_GAUGE_CAPSULES, UNKNOWN_AI, heldComparison, matchTransformation, transformationSummary,
} from '../../utils/transformation.js';
import { buildCode, buildKeyOf } from '../../utils/buildKey.js';
import { MIN_OTHER } from '../meta/aiShift.js';

/**
 * The Character page's Transformations tab, its figures (the tab is
 * CharacterTransformations.jsx). No React, so a verifier can import it. Every
 * count follows utils/transformation.js: counted matches, fusions included,
 * Broly's Ring left out.
 */

/** A figure over fewer counted matches than this is faded (a row) or left uncoloured (a capsule). */
export const THIN = 5;

/** Seconds as m:ss, the first transformation's time ("0:54"). */
export const clock = s => { const t = Math.round(s); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };


/**
 * The "By AI strategy" table: a row per AI strategy the character ran with
 * counted matches on, each transformationSummary()'s figures plus
 *   { id (the strategy's slug, Meta's `open=`), name, uses (every match on it) }
 * Most counted matches first. "Default" (UNKNOWN_AI) has no row: `unknown` is
 * how many counted matches it holds, which the header counts.
 */
export function transformByAI(matches, ctx) {
  const by = new Map();
  const lost = [];
  for (const m of matches || []) {
    const ai = m.aiStrategy || UNKNOWN_AI;
    if (ai === UNKNOWN_AI) { lost.push(m); continue; }
    if (!by.has(ai)) by.set(ai, []);
    by.get(ai).push(m);
  }
  const rows = [];
  for (const [name, ms] of by) {
    const s = transformationSummary(ms, ctx);
    if (!s.matches) continue;
    rows.push({ ...s, id: slugifyCharacterName(name), name, uses: ms.length });
  }
  rows.sort((a, b) => b.matches - a.matches || a.name.localeCompare(b.name));
  return { rows, unknown: transformationSummary(lost, ctx).matches };
}

/**
 * The skill gauge capsules (SKILL_GAUGE_CAPSULES), each with and without for
 * this character, ON THE SAME AI STRATEGY (utils/transformation.js
 * heldComparison(), grouped by AI; MIN_OTHER+ matches without it there). The
 * AI moves the rate far more than any of these capsules (Evasion +42 points
 * league-wide) and teams pair them with particular AIs, so a plain with /
 * without said mostly which AI ran them: measured 2026-10-01 on the last two
 * seasons, Ultra, the two differed by 21 points on average over 40
 * character-capsule pairs (Broly (Z) Super Saiyan's Super Transformation +11
 * plain, +45 on the same AI). "Default" matches are on neither side.
 *
 * Each: heldComparison()'s { compared, with, usual, gain, seconds } plus
 * { id, uses (counted matches with it), without (counted matches without it) }.
 */
export function gaugeCapsules(matches, ctx) {
  const counted = [];
  for (const m of matches || []) {
    const t = matchTransformation(m, ctx);
    if (!t.counted) continue;
    counted.push({ ai: m.aiStrategy || UNKNOWN_AI, caps: new Set((m.equippedCapsules || []).map(c => c && c.id)), t });
  }
  return SKILL_GAUGE_CAPSULES.map(id => {
    const uses = counted.filter(x => x.caps.has(id)).length;
    const held = heldComparison(
      counted.filter(x => x.ai !== UNKNOWN_AI).map(x => ({ group: x.ai, on: x.caps.has(id), t: x.t })), MIN_OTHER);
    return { ...held, id, uses, without: counted.length - uses };
  });
}

/**
 * The Builds tab's Transform % column: each build's transformationSummary(),
 * by its code (utils/buildKey.js, the `?build=` code), over the same matches
 * characterBuilds() files under it.
 */
export function transformByBuild(matches, ctx) {
  const groups = new Map();
  for (const m of matches || []) {
    if (m.unrecorded) continue;
    const code = buildCode(buildKeyOf(m));
    if (!groups.has(code)) groups.set(code, []);
    groups.get(code).push(m);
  }
  return new Map([...groups].map(([code, ms]) => [code, transformationSummary(ms, ctx)]));
}
