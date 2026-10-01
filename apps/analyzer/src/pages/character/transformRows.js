import { slugifyCharacterName } from '../../utils/characterSlug.js';
import {
  SKILL_GAUGE_CAPSULES, UNKNOWN_AI, matchTransformation, transformationSummary,
} from '../../utils/transformation.js';
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

const median = values => {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

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
 * this character, ON THE SAME AI STRATEGY: per AI, its counted matches with
 * the capsule against its counted matches there without it (MIN_OTHER+ of
 * them), weighted by the matches with it. The AI moves the rate far more than
 * any of these capsules (Evasion +42 points league-wide) and teams pair them
 * with particular AIs, so a plain with / without said mostly which AI ran
 * them: measured 2026-10-01 on the last two seasons, Ultra, the two differed
 * by 21 points on average over 40 character-capsule pairs (Broly (Z) Super
 * Saiyan's Super Transformation +11 plain, +45 on the same AI).
 *
 * Each: { id, uses (counted matches with it), without (counted matches
 * without it), compared (matches with it that have an AI to compare on),
 * with, usual (rates, null when nothing compares), gain (with - usual),
 * seconds: { with, usual } (the first transformation's median time, weighted
 * by matches timed on both sides) or null }.
 */
export function gaugeCapsules(matches, ctx) {
  const counted = [];
  for (const m of matches || []) {
    const t = matchTransformation(m, ctx);
    if (!t.counted) continue;
    counted.push({ ai: m.aiStrategy || UNKNOWN_AI, caps: new Set((m.equippedCapsules || []).map(c => c && c.id)), t });
  }
  const rate = xs => xs.filter(x => x.t.transformed).length / xs.length;
  const time = xs => median(xs.map(x => x.t.seconds).filter(s => s != null));
  const timed = xs => xs.filter(x => x.t.seconds != null).length;

  return SKILL_GAUGE_CAPSULES.map(id => {
    const byAi = new Map();
    let uses = 0;
    for (const x of counted) {
      const on = x.caps.has(id);
      if (on) uses++;
      if (x.ai === UNKNOWN_AI) continue;
      if (!byAi.has(x.ai)) byAi.set(x.ai, { with: [], without: [] });
      byAi.get(x.ai)[on ? 'with' : 'without'].push(x);
    }
    let n = 0, a = 0, b = 0, tn = 0, ta = 0, tb = 0;
    for (const p of byAi.values()) {
      if (!p.with.length || p.without.length < MIN_OTHER) continue;
      n += p.with.length; a += p.with.length * rate(p.with); b += p.with.length * rate(p.without);
      const k = Math.min(timed(p.with), timed(p.without));
      if (k) { tn += k; ta += k * time(p.with); tb += k * time(p.without); }
    }
    return {
      id,
      uses,
      without: counted.length - uses,
      compared: n,
      with: n ? a / n : null,
      usual: n ? b / n : null,
      gain: n ? (a - b) / n : null,
      seconds: tn ? { with: ta / tn, usual: tb / tn } : null,
    };
  });
}
