/**
 * Colours for the Character page Overview, per theme, as hex values (charts and
 * rings are SVG and need real colours, not Tailwind classes).
 *
 * - Style colours are the build-type colours the leaderboard already uses
 *   (buildComposition.js getBuildTypeColor: Melee red, Blast orange, Ki Blast
 *   yellow, Defense blue, Skill purple, Ki Efficiency green, Utility grey), in the
 *   Tailwind 400 shade on dark and 600 on light, plus pink for Ultimates. A capsule,
 *   a build pill and a style bar of the same kind therefore always match.
 * - Rank colour appears only at the ends of the league: green for the top fifth of
 *   a pool, red for the bottom fifth, and nothing in between - colour only pops
 *   where a character genuinely stands out. Both read at >= 4.5:1 as text; on the
 *   dark panel a deep crimson falls below that, so dark mode uses a true red.
 */

export const STYLE_COLORS = {
  dark: { melee: '#f87171', ki: '#facc15', blast: '#fb923c', ult: '#f472b6', skill: '#c084fc', defense: '#60a5fa' },
  light: { melee: '#dc2626', ki: '#ca8a04', blast: '#ea580c', ult: '#db2777', skill: '#9333ea', defense: '#2563eb' },
};

/** Capsule build types, keyed like capsule.buildType (lower-cased). */
const CAPSULE_TYPE_COLORS = {
  dark: {
    melee: '#f87171', blast: '#fb923c', 'ki blast': '#facc15', skill: '#c084fc',
    defense: '#60a5fa', 'ki efficiency': '#4ade80', utility: '#9ca3af',
  },
  light: {
    melee: '#dc2626', blast: '#ea580c', 'ki blast': '#ca8a04', skill: '#9333ea',
    defense: '#2563eb', 'ki efficiency': '#16a34a', utility: '#6b7280',
  },
};

/** Neutral: every rank between the top and bottom fifth. */
export const NEUTRAL = { dark: '#94a3b8', light: '#64748b' };

const RANK_ENDS = { dark: { bad: '#ff2b3a', good: '#16e05a' }, light: { bad: '#c8102e', good: '#047a2e' } };

const theme = darkMode => (darkMode ? 'dark' : 'light');

export const styleColor = (key, darkMode) => STYLE_COLORS[theme(darkMode)][key] || NEUTRAL[theme(darkMode)];

export const capsuleTypeColor = (type, darkMode) =>
  CAPSULE_TYPE_COLORS[theme(darkMode)][String(type || '').toLowerCase()] || NEUTRAL[theme(darkMode)];

/**
 * A build-type label's colour ("Melee/Ki Efficiency", "Blast-Focused"...), with the
 * same precedence as getBuildTypeColor so the pill matches the leaderboard's.
 */
export function buildTypeColor(label, darkMode) {
  const l = String(label || '').toLowerCase();
  const c = CAPSULE_TYPE_COLORS[theme(darkMode)];
  if (l.includes('melee')) return c.melee;
  if (l.includes('ki blast')) return c['ki blast'];
  if (l.includes('blast')) return c.blast;
  if (l.includes('defense')) return c.defense;
  if (l.includes('skill')) return c.skill;
  if (l.includes('ki efficiency')) return c['ki efficiency'];
  if (l.includes('balanced') || l.includes('hybrid')) return c.skill;
  return c.utility;
}

/**
 * The rank colour for a "goodness" percentile (0-100, higher = better or = more):
 * green in the top fifth, red in the bottom fifth, null (neutral) between.
 */
export function rankColor(pct, darkMode) {
  if (pct === null || pct === undefined) return null;
  const ends = RANK_ENDS[theme(darkMode)];
  if (pct >= 80) return ends.good;
  if (pct < 20) return ends.bad;
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
