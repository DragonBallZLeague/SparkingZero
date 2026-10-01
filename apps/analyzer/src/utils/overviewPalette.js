/**
 * The site's data colours as hex values (charts and rings are SVG and need
 * real colours, not Tailwind classes). Dark is the only theme.
 *
 * - Style colours are the build-type colours (Melee red, Blast orange, Ki Blast
 *   yellow, Defense blue, Skill purple, Ki Efficiency green, Utility grey), in
 *   the Tailwind 400 shade, plus pink for Ultimates. A capsule, a build pill and
 *   a style bar of the same kind therefore always match.
 * - Rank colour appears only at the ends of the league: green for the top fifth of
 *   a pool, red for the bottom fifth, and nothing in between - colour only pops
 *   where a character genuinely stands out. Both read at >= 4.5:1 as text; on the
 *   dark panel a deep crimson falls below that, so it is a true red.
 */

export const STYLE_COLORS = { melee: '#f87171', ki: '#facc15', blast: '#fb923c', ult: '#f472b6', skill: '#c084fc', defense: '#60a5fa' };

/** Capsule build types, keyed like capsule.buildType (lower-cased). */
const CAPSULE_TYPE_COLORS = {
  melee: '#f87171', blast: '#fb923c', 'ki blast': '#facc15', skill: '#c084fc',
  defense: '#60a5fa', 'ki efficiency': '#4ade80', utility: '#9ca3af',
};

/** Neutral: every rank between the top and bottom fifth. */
export const NEUTRAL = '#94a3b8';

/**
 * A Balanced Hybrid build: no type leads, so no type's colour. A light slate,
 * clear of every type's hue and lighter than Utility's grey. It was Skill's
 * purple, which read as a Skill build (the league, 2026-09-30).
 */
export const HYBRID_COLOR = '#cbd5e1';

const RANK_ENDS = { bad: '#ff2b3a', good: '#16e05a' };

/** '#rrggbb' at alpha `a`, as rgba(): a tint of a colour, as the tier list's rows and the Match page's team headers take. */
export const tint = (hex, a) => {
  const n = parseInt(String(hex).replace('#', ''), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};

/** The win and loss colours: the rank ends, as the W and L badges draw them. */
export const RESULT_COLORS = { won: RANK_ENDS.good, lost: RANK_ENDS.bad };

export const styleColor = key => STYLE_COLORS[key] || NEUTRAL;

export const capsuleTypeColor = type => CAPSULE_TYPE_COLORS[String(type || '').toLowerCase()] || NEUTRAL;

/**
 * A build-type label's colour ("Melee/Ki Efficiency", "Blast-Focused"...): its
 * main type's, the one before the slash (buildComposition.js writes
 * primary/secondary). Only that part is matched, or "Defense/Blast" took
 * Blast's orange, Blast being checked first (fixed 2026-09-30).
 */
export function buildTypeColor(label) {
  const l = String(label || '').toLowerCase().split('/')[0];
  const c = CAPSULE_TYPE_COLORS;
  if (l.includes('melee')) return c.melee;
  if (l.includes('ki blast')) return c['ki blast'];
  if (l.includes('blast')) return c.blast;
  if (l.includes('defense')) return c.defense;
  if (l.includes('skill')) return c.skill;
  if (l.includes('ki efficiency')) return c['ki efficiency'];
  if (l.includes('balanced') || l.includes('hybrid')) return HYBRID_COLOR;
  return c.utility;
}

/**
 * The rank colour for a "goodness" percentile (0-100, higher = better or = more):
 * green in the top fifth, red in the bottom fifth, null (neutral) between.
 */
export function rankColor(pct) {
  if (pct === null || pct === undefined) return null;
  if (pct >= 80) return RANK_ENDS.good;
  if (pct < 20) return RANK_ENDS.bad;
  return null;
}

/**
 * The same colour for a thin sample: desaturated and faded, the treatment a
 * provisional tier plate gets, so the direction still shows without claiming
 * full confidence. Null (neutral) stays null.
 */
export function provisionalColor(hex) {
  if (!hex) return null;
  const [r, g, b] = [1, 3, 5].map(o => parseInt(hex.slice(o, o + 2), 16));
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const d = c => Math.round(y + (c - y) * 0.45);
  return `rgba(${d(r)},${d(g)},${d(b)},0.62)`;
}
